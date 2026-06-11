import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// ZeptoMail SMTP Configuration
// Provide these in your .env file
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.zeptomail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || 'emailapikey';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'no-reply@isentidos.com.br';

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!SMTP_PASS) {
    console.warn('⚠️ SMTP_PASS não configurado. E-mail não enviado:', subject);
    return false;
  }
  
  try {
    const info = await transporter.sendMail({
      from: `"Instituto Sentidos" <${FROM_EMAIL}>`,
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
