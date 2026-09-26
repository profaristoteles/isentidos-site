import { prisma } from './db.js';
import {
  sendAdminNotificationEmail,
  sendStudentEventConfirmationEmail,
  sendStudentReservationConfirmationEmail,
  AdminNotificationDetail,
} from './mailer.js';

export function normalizeWhatsappNumber(phoneNumber: string): string {
  let cleanNumber = String(phoneNumber || '').replace(/\D/g, '');
  if (cleanNumber.length >= 10 && !cleanNumber.startsWith('55')) {
    cleanNumber = '55' + cleanNumber;
  }
  return cleanNumber;
}

export function sanitizeEvolutionBaseUrl(raw: string): string {
  let url = String(raw || '').trim();
  if (!url) return '';
  url = url.replace(/\/+$/, '');
  url = url.replace(/\/message\/sendText(\/.*)?$/i, '');
  url = url.replace(/\/manager\/?$/i, '');
  return url.replace(/\/+$/, '');
}

export interface EvolutionConfig {
  apiUrl: string;
  apiKey: string;
  instance: string;
}

export async function getEvolutionConfig(): Promise<EvolutionConfig | null> {
  let settings: any = null;
  try {
    settings = await prisma.systemSetting.findUnique({ where: { id: 'default' } });
  } catch (error) {
    console.error('Erro ao buscar SystemSetting para Evolution:', error);
  }

  const apiUrl = sanitizeEvolutionBaseUrl(
    settings?.evolutionApiUrl || process.env.EVOLUTION_API_URL || process.env.WHATSAPP_API_URL || ''
  );
  const apiKey = settings?.evolutionApiKey || process.env.EVOLUTION_API_KEY || process.env.WHATSAPP_API_TOKEN || '';
  const instance = settings?.evolutionInstance || process.env.EVOLUTION_INSTANCE || '';

  if (!apiUrl || !apiKey || !instance) return null;
  return { apiUrl, apiKey, instance };
}

export interface EvolutionSendResult {
  success: boolean;
  status?: number;
  error?: string;
  details?: any;
}

export async function sendEvolutionWhatsApp(phoneNumber: string, message: string): Promise<EvolutionSendResult> {
  const config = await getEvolutionConfig();
  if (!config) {
    console.log('[Evolution API] Configuração incompleta (URL, Instância ou API Key ausente). Ignorando envio.');
    return {
      success: false,
      error: 'Configuração da Evolution API incompleta. Preencha a URL, a Instância e a API Key nas configurações.',
    };
  }

  const cleanNumber = normalizeWhatsappNumber(phoneNumber);
  if (!cleanNumber) {
    return { success: false, error: 'Número de telefone inválido ou não informado.' };
  }

  const url = `${config.apiUrl}/message/sendText/${encodeURIComponent(config.instance)}`;

  try {
    console.log(`[Evolution API] Enviando mensagem de WhatsApp para ${cleanNumber}...`);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.apiKey,
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        number: cleanNumber,
        text: message,
      }),
    });

    const rawBody = await res.text();
    let parsedBody: any = null;
    try {
      parsedBody = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      /* não é JSON */
    }

    if (res.ok) {
      console.log(`[Evolution API] Mensagem enviada com sucesso para ${cleanNumber}!`);
      return { success: true, status: res.status, details: parsedBody };
    }

    const apiMessage = parsedBody?.message ?? parsedBody?.error ?? parsedBody?.response?.message ?? rawBody;
    const apiMessageText = Array.isArray(apiMessage) ? apiMessage.join(', ') : String(apiMessage || 'Erro desconhecido retornado pela Evolution API.');

    let friendlyError: string;
    if (res.status === 401 || res.status === 403) {
      friendlyError = `Erro (${res.status}): Chave de API inválida ou sem permissão para a instância "${config.instance}".`;
    } else if (res.status === 404) {
      friendlyError = `Erro (404): Instância "${config.instance}" não encontrada.`;
    } else if (res.status === 400) {
      friendlyError = `Erro (400): Requisição inválida. ${apiMessageText}`;
    } else {
      friendlyError = `Erro (${res.status}): ${apiMessageText}`;
    }

    console.error(`[Evolution API] Erro ao enviar mensagem (${res.status}):`, rawBody);
    return { success: false, status: res.status, error: friendlyError, details: parsedBody || rawBody };
  } catch (err: any) {
    console.error('[Evolution API] Erro na requisição WhatsApp:', err.message);
    const isSsl = /certificate|SSL|self.signed/i.test(err.message || '');
    const error = isSsl
      ? `Falha de conexão SSL com a Evolution API. (${err.message})`
      : `Falha de conexão com a Evolution API. (${err.message})`;
    return { success: false, error, details: err.message };
  }
}

export interface AdminNotificationContacts {
  whatsapp: string;
  emails: string[];
  siteName: string;
  domain: string;
  notifyOnEvent: boolean;
  notifyOnReservation: boolean;
  notifyOnLead: boolean;
}

export async function getAdminNotificationContacts(): Promise<AdminNotificationContacts> {
  let settings: any = null;
  try {
    settings = await prisma.systemSetting.findUnique({ where: { id: 'default' } });
  } catch (err) {
    console.error('Erro ao buscar SystemSetting para contatos do admin:', err);
  }

  // WhatsApp cadastrado no admin (usa notificationWhatsapp se configurado, ou o whatsapp de contato institucional)
  const rawWhatsapp = settings?.notificationWhatsapp?.trim() || settings?.whatsapp?.trim() || '';
  const adminWhatsapp = normalizeWhatsappNumber(rawWhatsapp);

  // E-mails do Admin
  const emailSet = new Set<string>();

  // 1. E-mail explícito de notificação configurado no admin
  if (settings?.notificationEmail?.trim()) {
    settings.notificationEmail
      .split(/[,;]+/)
      .map((e: string) => e.trim().toLowerCase())
      .filter((e: string) => e.includes('@'))
      .forEach((e: string) => emailSet.add(e));
  }

  // 2. Usuários com cargo 'admin' cadastrados no banco
  try {
    const adminUsers = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { email: true },
    });
    adminUsers.forEach((u) => {
      if (u.email && u.email.includes('@')) {
        emailSet.add(u.email.trim().toLowerCase());
      }
    });
  } catch (err) {
    console.error('Erro ao buscar usuários admin:', err);
  }

  // 3. Fallback para ADMIN_EMAIL do .env
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_EMAIL.includes('@')) {
    emailSet.add(process.env.ADMIN_EMAIL.trim().toLowerCase());
  }

  // 4. Fallback para smtpFromEmail
  if (emailSet.size === 0 && settings?.smtpFromEmail && settings.smtpFromEmail.includes('@')) {
    emailSet.add(settings.smtpFromEmail.trim().toLowerCase());
  }

  return {
    whatsapp: adminWhatsapp,
    emails: Array.from(emailSet),
    siteName: settings?.siteName || 'Instituto Sentidos',
    domain: settings?.domain || 'isentidos.com.br',
    notifyOnEvent: settings?.notifyAdminOnEvent ?? true,
    notifyOnReservation: settings?.notifyAdminOnReservation ?? true,
    notifyOnLead: settings?.notifyAdminOnLead ?? true,
  };
}

async function dispatchAdminAlerts({
  badge,
  title,
  whatsappMessage,
  details,
  rawNotes,
  category = 'lead',
}: {
  badge: string;
  title: string;
  whatsappMessage: string;
  details: AdminNotificationDetail[];
  rawNotes?: string;
  category?: 'event' | 'reservation' | 'lead';
}) {
  const contacts = await getAdminNotificationContacts();

  // Verifica se a categoria está habilitada
  if (category === 'event' && !contacts.notifyOnEvent) {
    console.log('[Notification] Notificação de evento desabilitada nas configurações.');
    return;
  }
  if (category === 'reservation' && !contacts.notifyOnReservation) {
    console.log('[Notification] Notificação de reserva desabilitada nas configurações.');
    return;
  }
  if (category === 'lead' && !contacts.notifyOnLead) {
    console.log('[Notification] Notificação de lead desabilitada nas configurações.');
    return;
  }

  // 1. Disparo de WhatsApp para o Admin
  if (contacts.whatsapp) {
    console.log(`[Notification] Enviando alerta WhatsApp para o admin (${contacts.whatsapp})...`);
    sendEvolutionWhatsApp(contacts.whatsapp, whatsappMessage)
      .then(async (res) => {
        try {
          await prisma.whatsappMessageLog.create({
            data: {
              sendType: 'admin_notification',
              recipientType: 'admin',
              recipientName: 'Administrador Instituto Sentidos',
              phone: contacts.whatsapp,
              message: whatsappMessage,
              status: res.success ? 'sent' : 'failed',
              errorMessage: res.error || null,
              sentBy: 'system',
            },
          });
        } catch (logErr) {
          console.warn('[Notification] Falha ao registrar log de WhatsApp admin:', logErr);
        }
      })
      .catch((err) => console.error('[Notification] Erro no envio de WhatsApp para admin:', err));
  } else {
    console.warn('[Notification] Nenhum WhatsApp de admin configurado para receber alertas.');
  }

  // 2. Disparo de E-mail para os administradores
  if (contacts.emails.length > 0) {
    console.log(`[Notification] Enviando alerta por e-mail para administradores: ${contacts.emails.join(', ')}...`);
    sendAdminNotificationEmail({
      to: contacts.emails,
      badge,
      title,
      details,
      rawNotes,
      dashboardUrl: `https://${contacts.domain}/admin`,
    }).catch((err) => console.error('[Notification] Erro ao enviar e-mail para administradores:', err));
  } else {
    console.warn('[Notification] Nenhum e-mail de admin encontrado para receber alertas.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Disparos Especializados
// ─────────────────────────────────────────────────────────────────────────────

export interface EventRegistrationData {
  eventTitle: string;
  eventId?: string;
  name: string;
  email: string;
  phone: string;
  modality?: string;
  startsAt?: string | null;
  link?: string | null;
  notes?: string;
}

export async function notifyOnEventRegistration(data: EventRegistrationData) {
  const nowStr = new Date().toLocaleString('pt-BR');
  const cleanPhone = normalizeWhatsappNumber(data.phone);

  const whatsappMessage = [
    `🔔 *NOVA INSCRIÇÃO EM EVENTO!*`,
    ``,
    `📅 *Evento:* ${data.eventTitle}`,
    `👤 *Participante:* ${data.name}`,
    `📱 *WhatsApp:* ${data.phone}`,
    `📧 *E-mail:* ${data.email}`,
    data.modality ? `📍 *Modalidade:* ${data.modality}` : null,
    `⏰ *Recebido em:* ${nowStr}`,
    data.notes ? `📝 *Observação:* ${data.notes}` : null,
    ``,
    `👉 *Acesse o painel:* https://isentidos.com.br/admin`,
  ]
    .filter(Boolean)
    .join('\n');

  const details: AdminNotificationDetail[] = [
    { label: 'Evento', value: data.eventTitle },
    { label: 'Participante', value: data.name },
    {
      label: 'WhatsApp',
      value: data.phone,
      isLink: true,
      linkHref: cleanPhone ? `https://wa.me/${cleanPhone}` : undefined,
    },
    {
      label: 'E-mail',
      value: data.email,
      isLink: true,
      linkHref: `mailto:${data.email}`,
    },
    { label: 'Modalidade', value: data.modality || 'Presencial / Online' },
    { label: 'Data do Registro', value: nowStr },
  ];

  // Notifica o Admin
  await dispatchAdminAlerts({
    badge: 'Inscrição em Evento',
    title: `Nova Inscrição: ${data.eventTitle}`,
    whatsappMessage,
    details,
    rawNotes: data.notes,
    category: 'event',
  });

  // Confirmação para o Estudante por E-mail
  if (data.email) {
    sendStudentEventConfirmationEmail({
      to: data.email,
      name: data.name,
      eventTitle: data.eventTitle,
      modality: data.modality,
      startsAt: data.startsAt || undefined,
      link: data.link || undefined,
    }).catch(console.error);
  }

  // Confirmação para o Estudante por WhatsApp (se Evolution API estiver configurada)
  if (data.phone) {
    const studentWaMsg = [
      `Olá, *${data.name}*! 🎉`,
      ``,
      `Confirmamos o recebimento da sua inscrição no evento:`,
      `📌 *${data.eventTitle}*`,
      data.modality ? `📍 *Modalidade:* ${data.modality}` : null,
      data.link ? `🔗 *Acesso/Link:* ${data.link}` : null,
      ``,
      `Nossa equipe entrará em contato com você para os detalhes de acesso e orientações.`,
      `Agradecemos a sua participação! 🚀`,
      ``,
      `_Instituto Sentidos_`,
    ]
      .filter(Boolean)
      .join('\n');

    sendEvolutionWhatsApp(data.phone, studentWaMsg)
      .then(async (res) => {
        try {
          await prisma.whatsappMessageLog.create({
            data: {
              sendType: 'event_confirmation',
              recipientType: 'student',
              recipientName: data.name,
              phone: data.phone,
              message: studentWaMsg,
              status: res.success ? 'sent' : 'failed',
              errorMessage: res.error || null,
              sentBy: 'system',
            },
          });
        } catch {
          /* ignore log err */
        }
      })
      .catch(console.error);
  }
}

export interface TurmaReservationData {
  courseTitle: string;
  courseSlug: string;
  name: string;
  email: string;
  phone: string;
  position: number;
  referralCode?: string;
  referredBy?: string;
  notes?: string;
}

export async function notifyOnTurmaReservation(data: TurmaReservationData) {
  const nowStr = new Date().toLocaleString('pt-BR');
  const cleanPhone = normalizeWhatsappNumber(data.phone);

  const whatsappMessage = [
    `🎉 *NOVA RESERVA DE VAGA EM TURMA!*`,
    ``,
    `📚 *Turma:* ${data.courseTitle}`,
    `👤 *Aluno:* ${data.name}`,
    `📱 *WhatsApp:* ${data.phone}`,
    `📧 *E-mail:* ${data.email}`,
    `🔢 *Posição na Turma:* #${data.position}`,
    data.referralCode ? `🎟️ *Cupom Gerado:* ${data.referralCode}` : null,
    data.referredBy ? `🤝 *Indicado por:* ${data.referredBy}` : null,
    `⏰ *Data/Hora:* ${nowStr}`,
    data.notes ? `📝 *Observação:* ${data.notes}` : null,
    ``,
    `👉 *Acesse o painel:* https://isentidos.com.br/admin`,
  ]
    .filter(Boolean)
    .join('\n');

  const details: AdminNotificationDetail[] = [
    { label: 'Turma / Curso', value: data.courseTitle },
    { label: 'Aluno', value: data.name },
    {
      label: 'WhatsApp',
      value: data.phone,
      isLink: true,
      linkHref: cleanPhone ? `https://wa.me/${cleanPhone}` : undefined,
    },
    {
      label: 'E-mail',
      value: data.email,
      isLink: true,
      linkHref: `mailto:${data.email}`,
    },
    { label: 'Posição na Fila', value: `#${data.position}` },
  ];

  if (data.referralCode) {
    details.push({ label: 'Código de Indicação', value: data.referralCode });
  }
  if (data.referredBy) {
    details.push({ label: 'Indicado por', value: data.referredBy });
  }
  details.push({ label: 'Data do Registro', value: nowStr });

  // Notifica Admin
  await dispatchAdminAlerts({
    badge: 'Reserva de Vaga',
    title: `Nova Reserva (#${data.position}): ${data.courseTitle}`,
    whatsappMessage,
    details,
    rawNotes: data.notes,
    category: 'reservation',
  });

  // Confirmação para o Estudante por E-mail
  if (data.email) {
    sendStudentReservationConfirmationEmail({
      to: data.email,
      name: data.name,
      courseTitle: data.courseTitle,
      position: data.position,
      referralCode: data.referralCode,
    }).catch(console.error);
  }

  // Confirmação para o Estudante por WhatsApp
  if (data.phone) {
    const studentWaMsg = [
      `Olá, *${data.name}*! 🎓`,
      ``,
      `Sua vaga na turma de *${data.courseTitle}* foi reservada com sucesso!`,
      `🎉 Você é o aluno *#${data.position}* da turma.`,
      data.referralCode ? `🎟️ Seu cupom de indicação: *${data.referralCode}* (indique amigos e ganhe descontos nas mensalidades)` : null,
      ``,
      `Avisaremos você por aqui assim que a turma atingir o número mínimo de alunos para início.`,
      ``,
      `_Instituto Sentidos_`,
    ]
      .filter(Boolean)
      .join('\n');

    sendEvolutionWhatsApp(data.phone, studentWaMsg)
      .then(async (res) => {
        try {
          await prisma.whatsappMessageLog.create({
            data: {
              sendType: 'turma_reservation_confirmation',
              recipientType: 'student',
              recipientName: data.name,
              phone: data.phone,
              message: studentWaMsg,
              status: res.success ? 'sent' : 'failed',
              errorMessage: res.error || null,
              sentBy: 'system',
            },
          });
        } catch {
          /* ignore log err */
        }
      })
      .catch(console.error);
  }
}

export interface LeadNotificationData {
  leadId?: string;
  name: string;
  email: string;
  phone: string;
  courseTitle?: string;
  source?: string;
  preferredFormat?: string;
  notes?: string;
  referralCode?: string;
  isUpdated?: boolean;
}

export async function notifyOnLeadSubmission(data: LeadNotificationData) {
  const nowStr = new Date().toLocaleString('pt-BR');
  const cleanPhone = normalizeWhatsappNumber(data.phone);

  let badge = 'Novo Lead';
  let originLabel = 'Site / Formulário Geral';

  if (data.source === 'pos_graduacao_form') {
    badge = 'Pré-matrícula Pós';
    originLabel = 'Formulário de Pós-Graduação';
  } else if (data.source === 'eja_orientacao_form') {
    badge = 'Interesse Supletivo EJA';
    originLabel = 'Formulário EJA';
  } else if (data.source === 'indicacao') {
    badge = 'Lead por Indicação';
    originLabel = `Página de Indicação (${data.referralCode || 'Cupom'})`;
  } else if (data.source === 'whatsapp_interest_form') {
    badge = 'Interesse Direto';
    originLabel = 'Formulário de Redirecionamento WhatsApp';
  } else if (data.source === 'landing_page') {
    badge = 'Landing Page';
    originLabel = 'Página do Curso';
  }

  const subjectTitle = data.isUpdated
    ? `Atualização de Cadastro: ${data.name}`
    : `Novo Contato/Interesse: ${data.name}`;

  const whatsappMessage = [
    `✨ *${badge.toUpperCase()} — INSTITUTO SENTIDOS*`,
    ``,
    `👤 *Nome:* ${data.name}`,
    `📱 *WhatsApp:* ${data.phone}`,
    `📧 *E-mail:* ${data.email}`,
    data.courseTitle ? `📚 *Interesse:* ${data.courseTitle}` : null,
    data.preferredFormat ? `📍 *Modalidade:* ${data.preferredFormat}` : null,
    `🏷️ *Origem:* ${originLabel}`,
    `⏰ *Data/Hora:* ${nowStr}`,
    data.notes ? `📝 *Detalhes:* \n${data.notes}` : null,
    ``,
    `👉 *Acesse o painel:* https://isentidos.com.br/admin`,
  ]
    .filter(Boolean)
    .join('\n');

  const details: AdminNotificationDetail[] = [
    { label: 'Nome', value: data.name },
    {
      label: 'WhatsApp',
      value: data.phone,
      isLink: true,
      linkHref: cleanPhone ? `https://wa.me/${cleanPhone}` : undefined,
    },
    {
      label: 'E-mail',
      value: data.email,
      isLink: true,
      linkHref: `mailto:${data.email}`,
    },
  ];

  if (data.courseTitle) {
    details.push({ label: 'Curso / Interesse', value: data.courseTitle });
  }
  if (data.preferredFormat) {
    details.push({ label: 'Modalidade', value: data.preferredFormat });
  }
  details.push({ label: 'Origem', value: originLabel });
  details.push({ label: 'Data', value: nowStr });

  await dispatchAdminAlerts({
    badge,
    title: subjectTitle,
    whatsappMessage,
    details,
    rawNotes: data.notes,
    category: data.source?.includes('pos') || data.source?.includes('turma') ? 'reservation' : 'lead',
  });
}

export interface EbookNotificationData {
  ebookTitle: string;
  name: string;
  email: string;
  phone: string;
}

export async function notifyOnEbookLead(data: EbookNotificationData) {
  const nowStr = new Date().toLocaleString('pt-BR');
  const cleanPhone = normalizeWhatsappNumber(data.phone);

  const whatsappMessage = [
    `📖 *NOVO DOWNLOAD DE E-BOOK!*`,
    ``,
    `📘 *Material:* ${data.ebookTitle}`,
    `👤 *Leitor:* ${data.name}`,
    `📱 *WhatsApp:* ${data.phone}`,
    `📧 *E-mail:* ${data.email}`,
    `⏰ *Data/Hora:* ${nowStr}`,
    ``,
    `👉 *Acesse o painel:* https://isentidos.com.br/admin`,
  ].join('\n');

  const details: AdminNotificationDetail[] = [
    { label: 'E-book Baixado', value: data.ebookTitle },
    { label: 'Nome', value: data.name },
    {
      label: 'WhatsApp',
      value: data.phone,
      isLink: true,
      linkHref: cleanPhone ? `https://wa.me/${cleanPhone}` : undefined,
    },
    {
      label: 'E-mail',
      value: data.email,
      isLink: true,
      linkHref: `mailto:${data.email}`,
    },
    { label: 'Data', value: nowStr },
  ];

  await dispatchAdminAlerts({
    badge: 'Download E-book',
    title: `Novo Leitor de E-book: ${data.name}`,
    whatsappMessage,
    details,
    category: 'lead',
  });
}

export interface ReferralRegNotificationData {
  name: string;
  email: string;
  phone: string;
  code: string;
  pixKey?: string;
  pixKeyType?: string;
}

export async function notifyOnReferralRegistration(data: ReferralRegNotificationData) {
  const nowStr = new Date().toLocaleString('pt-BR');
  const cleanPhone = normalizeWhatsappNumber(data.phone);

  const whatsappMessage = [
    `🤝 *NOVO MEMBRO NO PROGRAMA DE INDICAÇÃO!*`,
    ``,
    `👤 *Aluno:* ${data.name}`,
    `📱 *WhatsApp:* ${data.phone}`,
    `📧 *E-mail:* ${data.email}`,
    `🎟️ *Código Gerado:* ${data.code}`,
    data.pixKey ? `🔑 *Chave PIX:* ${data.pixKey} (${data.pixKeyType || 'CPF'})` : null,
    `⏰ *Data/Hora:* ${nowStr}`,
    ``,
    `👉 *Acesse o painel:* https://isentidos.com.br/admin`,
  ]
    .filter(Boolean)
    .join('\n');

  const details: AdminNotificationDetail[] = [
    { label: 'Aluno Indicador', value: data.name },
    {
      label: 'WhatsApp',
      value: data.phone,
      isLink: true,
      linkHref: cleanPhone ? `https://wa.me/${cleanPhone}` : undefined,
    },
    {
      label: 'E-mail',
      value: data.email,
      isLink: true,
      linkHref: `mailto:${data.email}`,
    },
    { label: 'Código de Indicação', value: data.code },
  ];

  if (data.pixKey) {
    details.push({ label: 'Chave PIX', value: `${data.pixKey} (${data.pixKeyType || 'CPF'})` });
  }
  details.push({ label: 'Data', value: nowStr });

  await dispatchAdminAlerts({
    badge: 'Programa de Indicação',
    title: `Novo Aluno Indicador: ${data.name} (${data.code})`,
    whatsappMessage,
    details,
    category: 'lead',
  });
}

export async function sendAdminTestAlert() {
  const contacts = await getAdminNotificationContacts();
  const nowStr = new Date().toLocaleString('pt-BR');

  const testMessage = [
    `🧪 *TESTE DE NOTIFICAÇÃO ADMINISTRATIVA*`,
    ``,
    `Esta é uma mensagem de teste enviada a partir do Painel Administrativo do *${contacts.siteName}*.`,
    ``,
    `✅ Se você está lendo isso, o canal de notificações via WhatsApp está funcionando com sucesso!`,
    `⏰ *Horário:* ${nowStr}`,
    `🌐 *Domínio:* ${contacts.domain}`,
  ].join('\n');

  const details: AdminNotificationDetail[] = [
    { label: 'Status do Teste', value: 'Sucesso' },
    { label: 'WhatsApp Destino', value: contacts.whatsapp || 'Não configurado' },
    { label: 'E-mails Destino', value: contacts.emails.join(', ') || 'Nenhum' },
    { label: 'Data/Hora', value: nowStr },
  ];

  let waResult: EvolutionSendResult = { success: false, error: 'WhatsApp não configurado' };
  if (contacts.whatsapp) {
    waResult = await sendEvolutionWhatsApp(contacts.whatsapp, testMessage);
    try {
      await prisma.whatsappMessageLog.create({
        data: {
          sendType: 'admin_test',
          recipientType: 'admin',
          recipientName: 'Administrador (Teste)',
          phone: contacts.whatsapp,
          message: testMessage,
          status: waResult.success ? 'sent' : 'failed',
          errorMessage: waResult.error || null,
          sentBy: 'admin',
        },
      });
    } catch {
      /* ignore */
    }
  }

  let emailSuccess = false;
  if (contacts.emails.length > 0) {
    emailSuccess = await sendAdminNotificationEmail({
      to: contacts.emails,
      badge: 'Teste Administrativo',
      title: '🧪 Teste de Notificações Multicanal (E-mail + WhatsApp)',
      details,
      rawNotes: 'Disparo de teste realizado com sucesso no Painel Administrativo.',
      dashboardUrl: `https://${contacts.domain}/admin`,
    });
  }

  return {
    whatsapp: {
      target: contacts.whatsapp,
      success: waResult.success,
      error: waResult.error,
    },
    email: {
      targets: contacts.emails,
      success: emailSuccess,
    },
  };
}
