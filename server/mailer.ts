import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { prisma } from './db.js';
dotenv.config();

export async function getSmtpConfig() {
  let settings;
  try {
    settings = await prisma.systemSetting.findUnique({ where: { id: 'default' } });
  } catch (error) {
    console.error('Erro ao buscar SystemSetting para SMTP:', error);
  }

  return {
    host: settings?.smtpHost || process.env.SMTP_HOST || 'smtp.zeptomail.com',
    port: parseInt(settings?.smtpPort || process.env.SMTP_PORT || '587', 10),
    user: settings?.smtpUser || process.env.SMTP_USER || 'emailapikey',
    pass: settings?.smtpPass || process.env.SMTP_PASS || '',
    fromEmail: settings?.smtpFromEmail || process.env.SMTP_FROM_EMAIL || 'no-reply@isentidos.com.br',
  };
}

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const config = await getSmtpConfig();

  if (!config.pass) {
    console.warn('⚠️ Senha SMTP não configurada. E-mail não enviado:', subject);
    return false;
  }
  
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"Instituto Sentidos" <${config.fromEmail}>`,
      to,
      subject,
      html,
    });
    console.log('E-mail enviado:', info.messageId);
    return true;
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, resetToken: string, domain: string) {
  const resetLink = `https://${domain}/admin/reset-password?token=${resetToken}`;
  const html = `
    <h2>Recuperação de Senha - Painel Administrativo</h2>
    <p>Você solicitou a recuperação da sua senha. Clique no link abaixo para criar uma nova senha:</p>
    <a href="${resetLink}" style="padding: 10px 15px; background: #f26522; color: #fff; text-decoration: none; border-radius: 5px;">Criar Nova Senha</a>
    <p>Se você não solicitou isso, pode ignorar este e-mail.</p>
  `;
  return sendEmail({ to: email, subject: 'Recuperação de Senha', html });
}

export async function sendWelcomeEmail(email: string, name: string) {
  const html = `
    <h2>Olá, ${name}!</h2>
    <p>Recebemos o seu contato com o Instituto Sentidos.</p>
    <p>Nossa equipe entrará em contato com você em breve para fornecer mais informações.</p>
    <p>Agradecemos seu interesse em nossos cursos!</p>
  `;
  return sendEmail({ to: email, subject: 'Confirmação de Cadastro - Instituto Sentidos', html });
}

export async function sendTestEmail(email: string) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
        <h2 style="color: #ffffff; margin: 0; font-size: 20px;">Instituto Sentidos</h2>
        <p style="color: #f26522; margin: 4px 0 0 0; font-weight: bold; font-size: 13px;">TESTE DE CONFIGURAÇÃO SMTP</p>
      </div>
      <p style="color: #334155; font-size: 15px; line-height: 1.6;">Suas configurações de e-mail SMTP foram testadas com sucesso!</p>
      <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; font-size: 13px; color: #334155; margin: 16px 0; border-left: 4px solid #f26522;">
        <strong>Destinatário:</strong> ${email}<br/>
        <strong>Status:</strong> Conexão estabelecida e e-mail entregue com sucesso.<br/>
        <strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}
      </div>
      <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">Este é um e-mail automático enviado pelo Painel Administrativo do Instituto Sentidos.</p>
    </div>
  `;
  return sendEmail({ to: email, subject: '🧪 Teste de Disparo SMTP — Instituto Sentidos', html });
}

export interface AdminNotificationDetail {
  label: string;
  value: string;
  isLink?: boolean;
  linkHref?: string;
}

export async function sendAdminNotificationEmail({
  to,
  badge = 'Novo Registro',
  title,
  details,
  rawNotes,
  dashboardUrl = 'https://isentidos.com.br/admin'
}: {
  to: string | string[];
  badge?: string;
  title: string;
  details: AdminNotificationDetail[];
  rawNotes?: string;
  dashboardUrl?: string;
}) {
  const recipients = Array.isArray(to) ? to.filter(Boolean).join(', ') : to;
  if (!recipients) return false;

  const rowsHtml = details
    .map(
      (d) => `
      <tr>
        <td style="padding: 10px 14px; font-size: 13px; font-weight: 600; color: #64748b; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; width: 35%;">${d.label}</td>
        <td style="padding: 10px 14px; font-size: 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
          ${d.isLink && d.linkHref ? `<a href="${d.linkHref}" style="color: #f26522; font-weight: 600; text-decoration: none;">${d.value}</a>` : d.value}
        </td>
      </tr>
    `
    )
    .join('');

  const notesHtml = rawNotes
    ? `
    <div style="margin-top: 20px; padding: 14px 16px; background-color: #fff7ed; border-radius: 8px; border: 1px solid #fed7aa;">
      <strong style="color: #9a3412; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Observações / Mensagem:</strong>
      <p style="margin: 8px 0 0 0; color: #431407; font-size: 13px; line-height: 1.5; white-space: pre-wrap;">${rawNotes}</p>
    </div>
  `
    : '';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <!-- Header -->
      <div style="background-color: #0f172a; padding: 24px; text-align: center; border-bottom: 3px solid #f26522;">
        <span style="display: inline-block; background-color: #f26522; color: #ffffff; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; border-radius: 20px; margin-bottom: 10px;">${badge}</span>
        <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; line-height: 1.3;">${title}</h1>
        <p style="color: #94a3b8; font-size: 12px; margin: 6px 0 0 0;">Instituto Sentidos — Notificação Administrativa</p>
      </div>

      <!-- Body Content -->
      <div style="padding: 24px;">
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        ${notesHtml}

        <div style="margin-top: 24px; text-align: center;">
          <a href="${dashboardUrl}" style="display: inline-block; padding: 12px 24px; background-color: #f26522; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; border-radius: 8px; box-shadow: 0 2px 4px rgba(242, 101, 34, 0.25);">Acessar Painel de Controle</a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
          Você está recebendo este alerta porque está cadastrado como administrador no site do Instituto Sentidos.<br/>
          Data: ${new Date().toLocaleString('pt-BR')}
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: recipients,
    subject: `🔔 [${badge}] ${title}`,
    html
  });
}

export async function sendStudentEventConfirmationEmail({
  to,
  name,
  eventTitle,
  modality,
  startsAt,
  link
}: {
  to: string;
  name: string;
  eventTitle: string;
  modality?: string;
  startsAt?: string;
  link?: string;
}) {
  const formattedDate = startsAt ? new Date(startsAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'A confirmar';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #0f172a; padding: 24px; text-align: center; border-bottom: 3px solid #f26522;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Instituto Sentidos</h1>
        <p style="color: #f26522; font-weight: bold; margin: 6px 0 0 0; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px;">Inscrição Confirmada</p>
      </div>
      <div style="padding: 24px; color: #334155; line-height: 1.6;">
        <h2 style="color: #0f172a; margin-top: 0; font-size: 18px;">Olá, ${name}! 🎉</h2>
        <p>Recebemos com sucesso a sua inscrição no evento:</p>
        <div style="background-color: #f8fafc; border-left: 4px solid #f26522; padding: 16px; border-radius: 6px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0; color: #0f172a; font-size: 16px;">${eventTitle}</h3>
          <p style="margin: 4px 0; font-size: 13px; color: #475569;"><strong>Modalidade:</strong> ${modality || 'Presencial / Online'}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #475569;"><strong>Data / Horário:</strong> ${formattedDate}</p>
        </div>
        ${link ? `<p>Para acessar mais detalhes ou a sala do evento, use o link abaixo:</p><div style="text-align: center; margin: 20px 0;"><a href="${link}" style="display: inline-block; background-color: #f26522; color: #ffffff; font-weight: bold; padding: 12px 20px; border-radius: 8px; text-decoration: none;">Acessar Evento</a></div>` : ''}
        <p>Nossa equipe entrará em contato pelo seu WhatsApp com lembretes e informações de acesso.</p>
        <p style="margin-bottom: 0;">Se tiver dúvidas, fale conosco pelo WhatsApp: <strong>(99) 3199-93940</strong>.</p>
      </div>
      <div style="background-color: #f8fafc; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        Instituto Sentidos — Capacitação e Pós-Graduação com Excelência
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Confirmação de Inscrição: ${eventTitle} — Instituto Sentidos`,
    html
  });
}

export async function sendStudentReservationConfirmationEmail({
  to,
  name,
  courseTitle,
  position,
  referralCode
}: {
  to: string;
  name: string;
  courseTitle: string;
  position: number;
  referralCode?: string;
}) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #0f172a; padding: 24px; text-align: center; border-bottom: 3px solid #f26522;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Instituto Sentidos</h1>
        <p style="color: #f26522; font-weight: bold; margin: 6px 0 0 0; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px;">Reserva de Vaga Confirmada</p>
      </div>
      <div style="padding: 24px; color: #334155; line-height: 1.6;">
        <h2 style="color: #0f172a; margin-top: 0; font-size: 18px;">Parabéns, ${name}! 🎓</h2>
        <p>Sua vaga na turma foi reservada com sucesso. Você é o <strong>aluno #${position}</strong>!</p>
        <div style="background-color: #f8fafc; border-left: 4px solid #f26522; padding: 16px; border-radius: 6px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0; color: #0f172a; font-size: 16px;">${courseTitle}</h3>
          <p style="margin: 4px 0; font-size: 13px; color: #475569;"><strong>Posição:</strong> #${position}</p>
          ${referralCode ? `<p style="margin: 4px 0; font-size: 13px; color: #475569;"><strong>Seu Cupom de Indicação:</strong> <span style="color: #f26522; font-weight: bold;">${referralCode}</span></p>` : ''}
        </div>
        ${referralCode ? `<p>Compartilhe seu código com amigos para liberar descontos progressivos na sua mensalidade!</p>` : ''}
        <p>Avisaremos você pelo WhatsApp assim que a turma atingir o quórum de início.</p>
      </div>
      <div style="background-color: #f8fafc; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        Instituto Sentidos — Todos os direitos reservados.
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Vaga Reservada (#${position}): ${courseTitle} — Instituto Sentidos`,
    html
  });
}

