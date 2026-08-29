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
    <div style="font-family: sans-serif; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #0f172a; margin-top: 0;">🧪 Teste de Disparo SMTP — Instituto Sentidos</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.5;">Suas configurações de e-mail SMTP foram testadas com sucesso!</p>
      <div style="background-color: #f8fafc; padding: 12px 16px; border-radius: 8px; font-size: 13px; color: #334155; margin: 16px 0;">
        <strong>Destinatário:</strong> ${email}<br/>
        <strong>Status:</strong> Conexão estabelecida e e-mail entregue com sucesso.
      </div>
      <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">Este é um e-mail automático enviado pelo Painel Administrativo do Instituto Sentidos.</p>
    </div>
  `;
  return sendEmail({ to: email, subject: '🧪 Teste de Disparo SMTP — Instituto Sentidos', html });
}
