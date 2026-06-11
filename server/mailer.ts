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
