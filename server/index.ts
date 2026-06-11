import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from './db.js';
import { sendPasswordResetEmail, sendWelcomeEmail } from './mailer.js';
import { seedCourses, seedLeads, seedPosts } from './seed-data.js';
import {
  serializeCourse,
  serializeBanner,
  serializeBlogPost,
  serializeEbook,
  serializeEvent,
  serializeLead,
  mapDatabaseModality,
  mapModalityToDatabase,
  mapCourseKindToDatabase,
  normalizeCourseTypeToDatabase,
  mapDatabaseLeadStatus,
  mapLeadStatusToDatabase,
  sanitizeHtml
} from '../shared/serializers.js';
import { ModalityType, CourseKindType, LeadStatusType } from '../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.set('trust proxy', 1);
const port = Number(process.env.PORT ?? 4000);
const jwtSecret = process.env.JWT_SECRET ?? 'dev-only-change-me';
const MAUTIC_BASE_URL = 'https://mautic.isentidos.com.br';
const uploadDir = path.resolve(process.cwd(), 'public', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => {
      const safeName = file.originalname
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9.-]/g, '-')
        .toLowerCase();
      cb(null, `${Date.now()}-${safeName}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL?.split(',') ?? true }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(uploadDir));
app.use(
  '/api',
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

const leadSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(8),
  courseSlug: z.string().optional(),
  preferredFormat: z.enum(['presencial', 'online_ao_vivo']).optional(),
  source: z.string().default('site'),
  referralCode: z.string().optional(),
  notes: z.string().optional(),
  consentLgpd: z.boolean(),
});

function isPublicCourseVisible(course: any): boolean {
  const title = String(course?.title || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const type = normalizeCourseTypeToDatabase(course?.type, mapDatabaseModality(course?.modality));
  const looksLikeAdvancedAcademic = title.includes('mestrado') || title.includes('doutorado');
  if (!looksLikeAdvancedAcademic) return true;
  return type === 'mestrado_ead' || type === 'doutorado_ead';
}

const ebookLeadSchema = z.object({
  ebookId: z.string().optional(),
  ebookTitle: z.string().min(2),
  mauticFormId: z.number().int().nullable().optional(),
  name: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(8),
  consentLgpd: z.boolean().default(true),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const courseSchema = z.object({
  title: z.string().default('Curso sem titulo'),
  slug: z.string().optional(),
  description: z.string().default(''),
  kind: z.enum(['Curso Livre', 'Pós-graduação', 'Mestrado EAD', 'Doutorado EAD']).optional(),
  type: z.enum([
    'livre',
    'pos_presencial',
    'pos_online',
    'mestrado_ead',
    'doutorado_ead',
    'curso_livre',
    'Curso Livre',
    'free_course',
    'FREE_COURSE',
    'pos',
    'pos-graduacao',
    'Pós-graduação',
    'postgraduate',
    'POSTGRADUATE',
    'MASTER_EAD',
    'DOCTORATE_EAD',
  ]).optional(),
  modality: z.enum(['presencial', 'online_ao_vivo', 'ead', 'internacional', 'PRESENTIAL', 'ONLINE', 'HYBRID']).default('presencial'),
  workload: z.string().default(''),
  price: z.number().min(0).default(0),
  maxInstallments: z.number().int().min(1).max(36).default(1),
  enrollmentFee: z.number().min(0).optional(),
  installmentValue: z.number().min(0).optional(),
  area: z.string().default(''),
  partnerInstitution: z.string().optional(),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  videoUrl: z.string().optional(),
  about: z.string().optional(),
  syllabus: z.string().optional().nullable(),
  benefits: z.any().optional(),
  modules: z.any().optional(),
  teachers: z.any().optional(),
  testimonials: z.any().optional(),
  leadConnectorFormId: z.string().optional().nullable(),
  coverImageUrl: z.string().optional().nullable(),
});

const bannerSchema = z.object({
  title: z.string().min(3),
  subtitle: z.string().min(5),
  ctaLabel: z.string().min(2).default('Saiba mais'),
  ctaUrl: z.string().min(1).default('#cursos'),
  imageUrl: z.string().optional(),
  position: z.string().default('home_hero'),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

const blogPostSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3),
  excerpt: z.string().min(5),
  content: z.string().min(10),
  category: z.string().min(2),
  tags: z.array(z.string()).default([]),
  coverImageUrl: z.string().optional(),
  isPublished: z.boolean().default(false),
});

const ebookSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  category: z.string().default('Livro Digital'),
  coverUrl: z.string().nullable().optional().transform(v => v ?? ''),
  fileUrl: z.string().nullable().optional().transform(v => v ?? ''),
  mauticFormId: z.number().int().nullable().optional(),
  pages: z.string().nullable().optional().transform(v => v ?? ''),
  year: z.string().nullable().optional().transform(v => v ?? ''),
  position: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

const eventSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3),
  description: z.string().min(5),
  modality: z.enum(['presencial', 'online_ao_vivo', 'ead', 'internacional', 'PRESENTIAL', 'ONLINE', 'HYBRID']),
  startsAt: z.string().optional(),
  price: z.number().min(0).default(0),
  coverUrl: z.string().nullable().optional().transform(v => v ?? ''),
  link: z.string().nullable().optional().transform(v => v ?? ''),
  isActive: z.boolean().default(true),
});

const systemSettingSchema = z.object({
  domain: z.string().min(3),
  whatsapp: z.string().min(8),
  apiGeminiKey: z.string().nullable().optional().transform(v => v ?? ''),
  apiOpenAIKey: z.string().nullable().optional().transform(v => v ?? ''),
  apiOpenRouterKey: z.string().nullable().optional().transform(v => v ?? ''),
  apiGroqKey: z.string().nullable().optional().transform(v => v ?? ''),
  activeAiProvider: z.enum(['local', 'gemini', 'openai', 'openrouter', 'groq']).default('local'),
  metaPixelId: z.string().nullable().optional().transform(v => v ?? ''),
  googleAnalyticsId: z.string().nullable().optional().transform(v => v ?? ''),
  googleTagManagerId: z.string().nullable().optional().transform(v => v ?? ''),
  googleAdsId: z.string().nullable().optional().transform(v => v ?? ''),
  customScripts: z.string().nullable().optional().transform(v => v ?? ''),
  siteName: z.string().min(2),
  instagram: z.string().nullable().optional().transform(v => v ?? ''),
  facebook: z.string().nullable().optional().transform(v => v ?? ''),
  linkedin: z.string().nullable().optional().transform(v => v ?? ''),
  youtube: z.string().nullable().optional().transform(v => v ?? ''),
  twitter: z.string().nullable().optional().transform(v => v ?? ''),
  smtpHost: z.string().nullable().optional().transform(v => v ?? ''),
  smtpPort: z.string().nullable().optional().transform(v => v ?? ''),
  smtpUser: z.string().nullable().optional().transform(v => v ?? ''),
  smtpPass: z.string().nullable().optional().transform(v => v ?? ''),
  smtpFromEmail: z.string().nullable().optional().transform(v => v ?? ''),
  outboundWebhookUrl: z.string().nullable().optional().transform(v => v ?? ''),
});

const menuItemSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  position: z.number().int().default(0),
  isButton: z.boolean().default(false),
  isActive: z.boolean().default(true),
  parentId: z.string().nullable().optional(),
});


function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ error: 'Token não informado.' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    (req as any).user = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: 'Token inválido.' });
  }
}

function adminOnlyMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
  return next();
}

function logAction(userId: string | undefined, entity: string, action: string, entityId: string | undefined, status: 'SUCCESS' | 'ERROR', extra?: any) {
  const timestamp = new Date().toISOString();
  let safeExtra = undefined;
  if (extra) {
    const cleanExtra = { ...extra };
    const sensitiveKeys = ['password', 'passwordHash', 'token', 'jwt', 'cpf', 'phone', 'email', 'name'];
    for (const key of sensitiveKeys) {
      if (key in cleanExtra) {
        if (key === 'cpf' && typeof cleanExtra[key] === 'string') {
          const cpf = cleanExtra[key];
          cleanExtra[key] = cpf.length >= 11 ? `${cpf.slice(0, 3)}.***.***-${cpf.slice(-2)}` : '***';
        } else if (key === 'email' && typeof cleanExtra[key] === 'string') {
          const email = cleanExtra[key];
          const parts = email.split('@');
          cleanExtra[key] = parts.length === 2 ? `${parts[0].slice(0, 2)}***@${parts[1]}` : '***';
        } else {
          cleanExtra[key] = '***';
        }
      }
    }
    safeExtra = cleanExtra;
  }
  console.log(JSON.stringify({
    timestamp,
    userId: userId || 'anonymous',
    entity,
    action,
    entityId: entityId || 'N/A',
    status,
    details: safeExtra
  }));
}

async function withDatabase<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.warn('[database:fallback]', error instanceof Error ? error.message : error);
    return fallback;
  }
}

function rewriteMauticUrls(value: string) {
  return value
    .replace(/https?:\/\/mautic\.isentidos\.net\.br/gi, MAUTIC_BASE_URL)
    .replace(/http:\/\/mautic\.isentidos\.com\.br/gi, MAUTIC_BASE_URL)
    .replace(/(^|[^:])\/\/mautic\.isentidos\.com\.br/gi, `$1${MAUTIC_BASE_URL}`);
}

function extractJsStringValue(source: string, marker: string) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return '';
  const firstQuote = source.indexOf('"', markerIndex + marker.length);
  if (firstQuote < 0) return '';

  let escaped = false;
  for (let index = firstQuote + 1; index < source.length; index += 1) {
    const char = source[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      return JSON.parse(source.slice(firstQuote, index + 1));
    }
  }

  return '';
}

function getMauticFormMeta(html: string) {
  const formName = html.match(/name="mauticform\[formName\]"[^>]*value="([^"]+)"/i)?.[1]
    || html.match(/data-mautic-form="([^"]+)"/i)?.[1]
    || '';
  const fields = [...html.matchAll(/name="mauticform\[([^\]]+)\]"/gi)]
    .map((match) => match[1])
    .filter((field) => !['formId', 'return', 'formName', 'submit'].includes(field));

  return { formName, fields };
}

async function fetchMauticForm(formId: number | string) {
  const formUrl = `${MAUTIC_BASE_URL}/form/generate.js?id=${encodeURIComponent(String(formId))}`;
  console.log('[mautic:form] fetch:start', { formId, url: formUrl });
  const response = await fetch(formUrl, { headers: { Accept: 'application/javascript,text/javascript,*/*' } });
  const script = await response.text();
  if (!response.ok) {
    throw new Error(`Mautic form fetch failed with status ${response.status}`);
  }

  const rawHtml = extractJsStringValue(script, 'var html');
  if (!rawHtml) {
    throw new Error('Mautic form HTML not found in generated script');
  }

  const html = rewriteMauticUrls(rawHtml);
  const meta = getMauticFormMeta(html);
  console.log('[mautic:form] fetch:done', {
    formId,
    formName: meta.formName,
    fields: meta.fields,
    htmlLength: html.length,
  });

  return {
    html,
    formName: meta.formName,
    fields: meta.fields,
    sdkUrl: `${MAUTIC_BASE_URL}/media/js/mautic-form.js`,
  };
}

async function submitEbookLeadToMautic(data: z.infer<typeof ebookLeadSchema>) {
  if (!data.mauticFormId) {
    return { attempted: false, ok: false, reason: 'missing_form_id' };
  }

  let formMeta: Awaited<ReturnType<typeof fetchMauticForm>> | null = null;
  try {
    formMeta = await fetchMauticForm(data.mauticFormId);
  } catch (error) {
    console.warn('[ebook:mautic] form-meta:error', {
      formId: data.mauticFormId,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  const submitUrl = `${MAUTIC_BASE_URL}/form/submit?formId=${data.mauticFormId}`;
  const payload = new URLSearchParams();
  const candidates = {
    nome: data.name,
    name: data.name,
    firstname: data.name,
    email: data.email,
    telefone: data.phone,
    phone: data.phone,
    whatsapp: data.phone,
    ebook: data.ebookTitle,
    source: 'ebook_download',
    tags: `ebook,${data.ebookTitle}`,
  };

  const knownFields = new Set(formMeta?.fields ?? []);
  const fieldsToSend = knownFields.size
    ? Object.entries(candidates).filter(([key]) => knownFields.has(key))
    : Object.entries(candidates);

  fieldsToSend.forEach(([key, value]) => payload.append(`mauticform[${key}]`, value));
  payload.append('mauticform[formId]', String(data.mauticFormId));
  payload.append('mauticform[return]', '');
  payload.append('mauticform[formName]', formMeta?.formName || `form${data.mauticFormId}`);
  payload.append('mauticform[submit]', '1');

  console.log('[ebook:mautic] submit:start', {
    url: submitUrl,
    formId: data.mauticFormId,
    ebookTitle: data.ebookTitle,
    formName: formMeta?.formName,
    fields: fieldsToSend.map(([key]) => key),
  });

  try {
    const response = await fetch(submitUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json,text/html,*/*',
        'Origin': 'https://isentidos.com.br',
        'Referer': 'https://isentidos.com.br/ebooks',
      },
      body: payload,
      redirect: 'manual',
    });

    console.log('[ebook:mautic] submit:done', {
      formId: data.mauticFormId,
      status: response.status,
      redirected: response.redirected,
      location: response.headers.get('location'),
    });

    return {
      attempted: true,
      ok: response.ok || response.status === 302 || response.status === 303,
      status: response.status,
    };
  } catch (error) {
    console.error('[ebook:mautic] submit:error', {
      formId: data.mauticFormId,
      message: error instanceof Error ? error.message : String(error),
    });
    return {
      attempted: true,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function getSystemSettings() {
  return await withDatabase(async () => {
    let settings = await prisma.systemSetting.findUnique({ where: { id: 'default' } });
    if (!settings) {
      settings = await prisma.systemSetting.create({
        data: {
          id: 'default',
          domain: 'isentidos.com.br',
          whatsapp: '(99) 3199-93940',
          siteName: 'Instituto Sentidos',
          activeAiProvider: 'local'
        }
      });
    }
    return settings;
  }, {
    id: 'default',
    domain: 'isentidos.com.br',
    whatsapp: '(99) 3199-93940',
    apiGeminiKey: '',
    apiOpenAIKey: '',
    apiOpenRouterKey: '',
    apiGroqKey: '',
    activeAiProvider: 'local',
    metaPixelId: '',
    googleAnalyticsId: '',
    googleTagManagerId: '',
    googleAdsId: '',
    customScripts: '',
    siteName: 'Instituto Sentidos',
    instagram: '',
    facebook: '',
    linkedin: '',
    youtube: '',
    twitter: '',
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    smtpFromEmail: '',
    outboundWebhookUrl: '',
    updatedAt: new Date()
  });
}

async function sendToCrmWebhook(event: string, data: any) {
  try {
    const settings = await getSystemSettings();
    if (!settings.outboundWebhookUrl) return;

    let payload: any = {
      event,
      timestamp: new Date().toISOString(),
      data
    };

    // Flatten core contact fields to root level for simpler GHL/LeadConnector mapping
    if (event === 'lead_created') {
      payload.name = data.name || '';
      payload.email = data.email || '';
      payload.phone = data.phone || '';
      payload.referralCode = data.referralCode || '';
      payload.source = data.source || 'site';
      payload.notes = data.notes || '';
    } else if (event === 'referral_code_created') {
      const student = data.student || {};
      payload.name = student.name || '';
      payload.email = student.email || '';
      payload.phone = student.phone || '';
      payload.cpf = student.cpf || '';
      payload.code = data.code || '';
    }

    console.log(`[Webhook CRM] Enviando payload para ${settings.outboundWebhookUrl}:`, JSON.stringify(payload, null, 2));

    const res = await fetch(settings.outboundWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
      console.error(`[Webhook CRM] Falha ao enviar ${event}: Status ${res.status}`);
    } else {
      console.log(`[Webhook CRM] ${event} enviado com sucesso.`);
    }
  } catch (err) {
    console.error(`[Webhook CRM] Erro na requisição do webhook:`, err);
  }
}

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const settings = await getSystemSettings();
  const provider = settings.activeAiProvider;

  if (provider === 'gemini') {
    const apiKey = settings.apiGeminiKey || process.env.GEMINI_API_KEY;
    if (apiKey) {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${systemPrompt}\n\nTema/InstruÃ§Ã£o: ${userPrompt}`
      });
      if (response.text) return response.text;
    }
  } else if (provider === 'openai') {
    const apiKey = settings.apiOpenAIKey || process.env.OPENAI_API_KEY;
    if (apiKey) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7
        })
      });
      if (res.ok) {
        const json = await res.json() as any;
        return json.choices?.[0]?.message?.content || '';
      } else {
        console.error('OpenAI Error:', await res.text());
      }
    }
  } else if (provider === 'openrouter') {
    const apiKey = settings.apiOpenRouterKey || process.env.OPENROUTER_API_KEY;
    if (apiKey) {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://isentidos.com.br',
          'X-Title': 'Instituto Sentidos'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7
        })
      });
      if (res.ok) {
        const json = await res.json() as any;
        return json.choices?.[0]?.message?.content || '';
      } else {
        console.error('OpenRouter Error:', await res.text());
      }
    }
  } else if (provider === 'groq') {
    const apiKey = settings.apiGroqKey || process.env.GROQ_API_KEY;
    if (apiKey) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7
        })
      });
      if (res.ok) {
        const json = await res.json() as any;
        return json.choices?.[0]?.message?.content || '';
      } else {
        console.error('Groq Error:', await res.text());
      }
    }
  }

  throw new Error('No active AI provider configured or API Key is missing.');
}


// Course serializer imported from shared/serializers.ts
app.get('/sitemap.xml', async (_req, res) => {
  const baseUrl = 'https://isentidos.com.br';

  const courses = await withDatabase(
    async () => {
      return await prisma.course.findMany({
        where: { isActive: true },
        select: { slug: true, title: true, type: true, modality: true }
      });
    },
    []
  );

  const posts = await withDatabase(
    async () => {
      return await prisma.blogPost.findMany({
        where: { isPublished: true },
        select: { slug: true }
      });
    },
    []
  );

  const staticUrls = [
    { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${baseUrl}/cursos`, priority: '0.9', changefreq: 'weekly' },
    { loc: `${baseUrl}/ebooks`, priority: '0.8', changefreq: 'weekly' },
    { loc: `${baseUrl}/eventos`, priority: '0.8', changefreq: 'weekly' },
    { loc: `${baseUrl}/blog`, priority: '0.8', changefreq: 'weekly' },
    { loc: `${baseUrl}/politica-de-privacidade`, priority: '0.3', changefreq: 'monthly' },
    { loc: `${baseUrl}/termos-de-uso`, priority: '0.3', changefreq: 'monthly' },
    { loc: `${baseUrl}/indique-e-ganhe`, priority: '0.7', changefreq: 'monthly' }
  ];

  const courseUrls = courses.filter(isPublicCourseVisible).map(c => ({
    loc: `${baseUrl}/cursos/${c.slug}`,
    priority: '0.8',
    changefreq: 'weekly'
  }));

  const postUrls = posts.map(p => ({
    loc: `${baseUrl}/blog/${p.slug}`,
    priority: '0.7',
    changefreq: 'weekly'
  }));

  const allUrls = [...staticUrls, ...courseUrls, ...postUrls];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  for (const url of allUrls) {
    xml += '  <url>\n';
    xml += `    <loc>${url.loc}</loc>\n`;
    xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
    xml += `    <priority>${url.priority}</priority>\n`;
    xml += '  </url>\n';
  }
  
  xml += '</urlset>';

  res.header('Content-Type', 'application/xml');
  res.status(200).send(xml);
});

app.get('/api/health', (_req, res) => {

  res.json({
    ok: true,
    service: 'instituto-sentidos-api',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/courses', async (_req, res) => {
  const courses = await withDatabase(
    async () => {
      const rows = await prisma.course.findMany({
        where: { isActive: true },
        orderBy: [{ isFeatured: 'desc' }, { title: 'asc' }],
      });
      return rows.filter(isPublicCourseVisible).map(serializeCourse);
    },
    [],
  );

  res.json({ data: courses });
});

app.get('/api/courses/:slug', async (req, res) => {
  const course = await withDatabase(
    () => prisma.course.findUnique({
      where: { slug: req.params.slug, isActive: true },
      include: {
        referralTiers: true,
      }
    }),
    null
  );

  if (!course || !isPublicCourseVisible(course)) {
    return res.status(404).json({ error: 'Curso nÃ£o encontrado.' });
  }

  res.json({ data: serializeCourse(course) });
});

app.get('/api/blog-posts', async (req, res) => {
  const { category, search } = req.query;

  const posts = await withDatabase(async () => {
    return prisma.blogPost.findMany({
      where: {
        isPublished: true,
        ...(category ? { category: String(category) } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: String(search), mode: 'insensitive' } },
                { excerpt: { contains: String(search), mode: 'insensitive' } },
                { content: { contains: String(search), mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { publishedAt: 'desc' },
    });
  }, seedPosts as any);

  res.json({ data: posts });
});

app.get('/api/blog-posts/:slug', async (req, res) => {
  const post = await withDatabase(
    () => prisma.blogPost.findUnique({
      where: { slug: req.params.slug, isPublished: true },
    }),
    (seedPosts as any).find((p: any) => p.slug === req.params.slug) ?? null
  );

  if (!post) {
    return res.status(404).json({ error: 'Artigo nÃ£o encontrado.' });
  }

  res.json({ data: post });
});

app.get('/api/site-content', async (_req, res) => {
  const data = await withDatabase<unknown>(
    async () => {
      const [banners, courses, posts, ebooks, events, menuItems] = await Promise.all([
        prisma.banner.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
        prisma.course.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } }),
        prisma.blogPost.findMany({ where: { isPublished: true }, orderBy: { publishedAt: 'desc' }, take: 4 }),
        prisma.ebook.findMany({ where: { isActive: true }, take: 3 }),
        prisma.event.findMany({ where: { isActive: true }, orderBy: { startsAt: 'asc' }, take: 4 }),
        prisma.menuItem.findMany({ where: { isActive: true }, orderBy: { position: 'asc' } }),
      ]);

      const rawSettings = await getSystemSettings();
      const settings = {
        domain: rawSettings.domain,
        whatsapp: rawSettings.whatsapp,
        siteName: rawSettings.siteName,
        metaPixelId: rawSettings.metaPixelId,
        googleAnalyticsId: rawSettings.googleAnalyticsId,
        googleTagManagerId: rawSettings.googleTagManagerId,
        googleAdsId: rawSettings.googleAdsId,
        customScripts: rawSettings.customScripts,
        instagram: rawSettings.instagram,
        facebook: rawSettings.facebook,
        linkedin: rawSettings.linkedin,
        youtube: rawSettings.youtube,
        twitter: rawSettings.twitter,
      };

      return {
        banners: banners.map(serializeBanner),
        courses: courses.filter(isPublicCourseVisible).map(serializeCourse),
        posts: posts.map(serializeBlogPost),
        ebooks: ebooks.map(serializeEbook),
        events: events.map(serializeEvent),
        settings,
        menuItems,
      };
    },
    {
      banners: [],
      courses: [],
      posts: seedPosts,
      ebooks: [],
      events: [],
      settings: {
        domain: 'isentidos.com.br',
        whatsapp: '(99) 3199-93940',
        siteName: 'Instituto Sentidos',
        metaPixelId: '',
        googleAnalyticsId: '',
        googleTagManagerId: '',
        googleAdsId: '',
        customScripts: '',
      },
      menuItems: [],
    },
  );

  res.json({ data });
});

app.post('/api/leads', async (req, res) => {
  const parsed = leadSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: 'Dados invÃ¡lidos.', details: parsed.error.flatten() });
  }

  const lead = await withDatabase<unknown>(
    async () => prisma.$transaction(async (tx) => {
      const course = parsed.data.courseSlug
        ? await tx.course.findUnique({ where: { slug: parsed.data.courseSlug } })
        : null;

      const lead = await tx.lead.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone,
          courseId: course?.id,
          preferredFormat: parsed.data.preferredFormat,
          source: parsed.data.source,
          referralCode: parsed.data.referralCode,
          notes: parsed.data.notes,
          consentLgpd: parsed.data.consentLgpd,
        },
      });

      if (parsed.data.referralCode) {
        const refCode = await tx.referralCode.findUnique({ where: { code: parsed.data.referralCode } });
        if (refCode) {
          await tx.referral.create({
            data: {
              referralCodeId: refCode.id,
              leadId: lead.id,
              status: 'pending',
              discountApplied: 0,
            },
          });
        }
      }

      return lead;
    }),
    {
      id: `local-${Date.now()}`,
      ...parsed.data,
      status: 'novo',
      createdAt: new Date(),
    },
  );

  // Send welcome email using ZeptoMail
  if (lead && (lead as any).email && (lead as any).name) {
    sendWelcomeEmail((lead as any).email, (lead as any).name).catch(console.error);
  }

  if (lead) {
    sendToCrmWebhook('lead_created', lead);
  }

  res.status(201).json({ data: lead });
});

app.post('/api/ebook-leads', async (req, res) => {
  const parsed = ebookLeadSchema.safeParse(req.body);

  if (!parsed.success) {
    console.warn('[ebook:lead] invalid', parsed.error.flatten());
    return res.status(400).json({ error: 'Dados inválidos.', details: parsed.error.flatten() });
  }

  console.log('[ebook:lead] submit:start', {
    ebookId: parsed.data.ebookId,
    ebookTitle: parsed.data.ebookTitle,
    formId: parsed.data.mauticFormId,
  });

  const result = await withDatabase(
    async () => {
      const ebook = parsed.data.ebookId
        ? await prisma.ebook.findUnique({ where: { id: parsed.data.ebookId } })
        : null;
      const lead = await prisma.lead.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone,
          source: 'ebook_download',
          notes: `E-book: ${parsed.data.ebookTitle}`,
          consentLgpd: parsed.data.consentLgpd,
        },
      });
      return { lead, ebook };
    },
    {
      lead: {
        id: `ebook-local-${Date.now()}`,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        createdAt: new Date(),
        courseId: null,
        status: 'novo' as const,
        referralCode: null,
        preferredFormat: null,
        source: 'ebook_download',
        notes: `E-book: ${parsed.data.ebookTitle}`,
        consentLgpd: parsed.data.consentLgpd,
      },
      ebook: null,
    },
  );

  const mautic = await submitEbookLeadToMautic(parsed.data);
  console.log('[ebook:lead] submit:done', {
    leadId: (result.lead as any).id,
    ebookId: parsed.data.ebookId,
    mautic,
  });

  res.status(201).json({
    data: {
      leadId: (result.lead as any).id,
      mautic,
      fileUrl: result.ebook?.fileUrl ?? '',
    },
  });
});

app.post('/api/admin/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: 'Login inválido.' });
  }

  const admin = await withDatabase(
    async () => prisma.user.findUnique({ where: { email: parsed.data.email } }),
    null,
  );

  if (admin && admin.role === 'student') {
    return res.status(403).json({ error: 'Acesso negado para este perfil.' });
  }

  const devPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
  const passwordMatches = admin?.passwordHash
    ? await bcrypt.compare(parsed.data.password, admin.passwordHash)
    : parsed.data.email === (process.env.ADMIN_EMAIL ?? 'admin@isentidos.com.br') &&
      parsed.data.password === devPassword;

  if (!passwordMatches) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  }

  const userRole = admin?.role ?? 'admin';

  const token = jwt.sign(
    {
      sub: admin?.id ?? 'dev-admin',
      email: parsed.data.email,
      role: userRole,
    },
    jwtSecret,
    { expiresIn: '8h' },
  );

  res.json({
    token,
    user: {
      name: admin?.name ?? 'Administrador',
      email: parsed.data.email,
      role: userRole,
    },
  });
});

app.post('/api/admin/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'E-mail inválido.' });
  }

  const admin = await prisma.user.findUnique({ where: { email } });
  if (!admin) {
    return res.json({ message: 'Se o e-mail existir, um link de recuperação foi enviado.' });
  }

  const resetToken = jwt.sign({ sub: admin.id, intent: 'reset_password' }, jwtSecret, { expiresIn: '1h' });
  const settings = await getSystemSettings();
  
  await sendPasswordResetEmail(admin.email, resetToken, settings.domain || req.get('host') || 'isentidos.com.br');

  res.json({ message: 'Se o e-mail existir, um link de recuperação foi enviado.' });
});

app.post('/api/admin/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Token inválido ou senha muito curta (mínimo 6 caracteres).' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    if (decoded.intent !== 'reset_password') {
      return res.status(400).json({ error: 'Token inválido para esta operação.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: decoded.sub },
      data: { passwordHash }
    });

    res.json({ message: 'Senha redefinida com sucesso. Faça login com a nova senha.' });
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
});

app.get('/api/admin/dashboard', authMiddleware, async (_req, res) => {
  const dashboard = await withDatabase<unknown>(
    async () => {
      const [leadsTotal, coursesTotal, referralsConverted, enrollmentsTotal, latestLeads] =
        await Promise.all([
          prisma.lead.count(),
          prisma.course.count(),
          prisma.referral.count({ where: { status: 'converted' } }),
          prisma.enrollment.count(),
          prisma.lead.findMany({
            orderBy: { createdAt: 'desc' },
            take: 8,
            include: { course: true },
          }),
        ]);

      return {
        stats: {
          leadsTotal,
          coursesTotal,
          referralsConverted,
          enrollmentsTotal,
          estimatedRevenue: enrollmentsTotal * 1800,
        },
        latestLeads,
      };
    },
    {
      stats: {
        leadsTotal: seedLeads.length,
        coursesTotal: seedCourses.length,
        referralsConverted: 1,
        enrollmentsTotal: 3,
        estimatedRevenue: 5400,
      },
      latestLeads: seedLeads,
    },
  );

  res.json({ data: dashboard });
});

function slugifyCourse(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function prepareCourseData(data: any) {
  const modalityEnum = mapDatabaseModality(data.modality);
  const dbType = data.type !== undefined || data.kind !== undefined
    ? normalizeCourseTypeToDatabase(data.type ?? data.kind, modalityEnum)
    : undefined;
  const modalityDb = mapModalityToDatabase(modalityEnum, dbType || data.kind);

  const result: any = {};
  if (data.title !== undefined) result.title = data.title;
  if (data.slug !== undefined) result.slug = data.slug;
  if (data.description !== undefined) result.description = data.description;
  if (dbType !== undefined) result.type = dbType;
  if (modalityDb !== undefined) result.modality = modalityDb;
  if (data.workload !== undefined) result.workload = data.workload;
  if (data.price !== undefined) result.price = data.price;
  if (data.maxInstallments !== undefined) result.maxInstallments = data.maxInstallments;
  if (data.enrollmentFee !== undefined) result.enrollmentFee = data.enrollmentFee;
  if (data.installmentValue !== undefined) result.installmentValue = data.installmentValue;
  if (data.area !== undefined) result.area = data.area;
  if (data.partnerInstitution !== undefined) result.partnerInstitution = data.partnerInstitution;
  if (data.isFeatured !== undefined) result.isFeatured = data.isFeatured;
  if (data.isActive !== undefined) result.isActive = data.isActive;
  if (data.videoUrl !== undefined) result.videoUrl = data.videoUrl;
  if (data.about !== undefined) result.about = sanitizeHtml(data.about);
  if (data.syllabus !== undefined) result.syllabus = sanitizeHtml(data.syllabus);
  if (data.benefits !== undefined) result.benefits = data.benefits;
  if (data.modules !== undefined) result.modules = data.modules;
  if (data.teachers !== undefined) result.teachers = data.teachers;
  if (data.testimonials !== undefined) result.testimonials = data.testimonials;
  if (data.leadConnectorFormId !== undefined) result.leadConnectorFormId = data.leadConnectorFormId;
  if (data.coverImageUrl !== undefined) result.coverImageUrl = data.coverImageUrl;

  return result;
}

app.post('/api/admin/courses', authMiddleware, async (req, res) => {
  const parsed = courseSchema.safeParse(req.body);

  if (!parsed.success) {
    logAction((req as any).user?.sub, 'Course', 'CREATE_FAILED', undefined, 'ERROR', { details: parsed.error.flatten() });
    return res.status(400).json({ error: 'Curso inválido.', details: parsed.error.flatten() });
  }

  try {
    const normalizedData = {
      ...parsed.data,
      title: parsed.data.title.trim() || 'Curso sem titulo',
      slug: slugifyCourse(parsed.data.slug || parsed.data.title) || `curso-rascunho-${Date.now()}`,
      type: parsed.data.type || mapCourseKindToDatabase((parsed.data.kind as CourseKindType | undefined) || CourseKindType.POS, mapDatabaseModality(parsed.data.modality)),
    };
    const courseData = prepareCourseData(normalizedData);

    const course = await prisma.course.upsert({
      where: { slug: normalizedData.slug },
      update: courseData,
      create: courseData,
    });

    logAction((req as any).user?.sub, 'Course', 'UPSERT', course.id, 'SUCCESS', { slug: course.slug });
    res.status(201).json({ data: serializeCourse(course) });
  } catch (err: any) {
    logAction((req as any).user?.sub, 'Course', 'UPSERT_FAILED', undefined, 'ERROR', { error: err.message });
    res.status(500).json({ error: 'Erro ao salvar curso.' });
  }
});

app.post('/api/admin/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Arquivo nÃ£o enviado.' });
  }

  res.status(201).json({
    data: {
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`,
    },
  });
});

app.post('/api/admin/banners', authMiddleware, async (req, res) => {
  const parsed = bannerSchema.safeParse(req.body);

  if (!parsed.success) {
    logAction((req as any).user?.sub, 'Banner', 'CREATE_FAILED', undefined, 'ERROR', { details: parsed.error.flatten() });
    return res.status(400).json({ error: 'Banner inválido.', details: parsed.error.flatten() });
  }

  try {
    const data = {
      ...parsed.data,
      subtitle: sanitizeHtml(parsed.data.subtitle),
    };

    const banner = await prisma.banner.create({ data });
    logAction((req as any).user?.sub, 'Banner', 'CREATE', banner.id, 'SUCCESS', { title: banner.title });
    res.status(201).json({ data: serializeBanner(banner) });
  } catch (err: any) {
    logAction((req as any).user?.sub, 'Banner', 'CREATE_FAILED', undefined, 'ERROR', { error: err.message });
    res.status(500).json({ error: 'Erro ao criar banner.' });
  }
});

app.post('/api/admin/blog-posts', authMiddleware, async (req, res) => {
  const parsed = blogPostSchema.safeParse(req.body);

  if (!parsed.success) {
    logAction((req as any).user?.sub, 'BlogPost', 'CREATE_FAILED', undefined, 'ERROR', { details: parsed.error.flatten() });
    return res.status(400).json({ error: 'Post inválido.', details: parsed.error.flatten() });
  }

  try {
    const dbData = {
      ...parsed.data,
      content: sanitizeHtml(parsed.data.content),
      publishedAt: parsed.data.isPublished ? new Date() : null,
    };

    const post = await prisma.blogPost.upsert({
      where: { slug: parsed.data.slug },
      update: dbData,
      create: dbData,
    });

    logAction((req as any).user?.sub, 'BlogPost', 'UPSERT', post.id, 'SUCCESS', { slug: post.slug });
    res.status(201).json({ data: serializeBlogPost(post) });
  } catch (err: any) {
    logAction((req as any).user?.sub, 'BlogPost', 'UPSERT_FAILED', undefined, 'ERROR', { error: err.message });
    res.status(500).json({ error: 'Erro ao salvar artigo.' });
  }
});

// â”€â”€ AI generation endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.post('/api/admin/blog-posts/generate-content', authMiddleware, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt Ã© obrigatÃ³rio.' });
  }

  try {
    let content = '';
    let title = '';
    let excerpt = '';
    let category = 'EducaÃ§Ã£o';
    let tags: string[] = [];

    const normalizedPrompt = prompt.toLowerCase();

    // Call dynamic AI provider
    try {
      const systemPrompt = `Escreva um artigo de blog educacional completo e altamente profissional com base no tema fornecido.
      O artigo deve ser estruturado em HTML de alta fidelidade (use apenas as tags: <h2>, <p>, <ul>, <li>, <strong>, <em>, sem as tags <html>, <head> ou <body>).
      Retorne o resultado estritamente em formato JSON com as seguintes chaves (nÃ£o adicione formataÃ§Ã£o de bloco de cÃ³digo do markdown como \`\`\`json):
      {
        "title": "Um tÃ­tulo atraente e profissional para o post",
        "excerpt": "Um resumo curto (2 a 3 frases) do artigo para ser exibido no card do site",
        "category": "Uma categoria apropriada (ex: InclusÃ£o, Autismo, Libras, Carreira, PrÃ¡ticas)",
        "tags": ["lista", "de", "palavras-chave", "seo", "relacionadas"],
        "content": "ConteÃºdo HTML completo do artigo formatado com <h2>, <p>, <ul>, <li>"
      }`;

      const aiResponse = await callAI(systemPrompt, prompt);
      if (aiResponse) {
        const cleanedText = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedAi = JSON.parse(cleanedText);
        title = parsedAi.title || title;
        excerpt = parsedAi.excerpt || excerpt;
        category = parsedAi.category || category;
        tags = parsedAi.tags || tags;
        content = parsedAi.content || content;
      }
    } catch (geminiError) {
      console.error('Error with AI provider generateContent, falling back to smart mockup:', geminiError);
    }

    // Smart Local Mockup Fallback if dynamic AI isn't configured or fails
    if (!content) {
      if (normalizedPrompt.includes('concurso') || normalizedPrompt.includes('professor') || normalizedPrompt.includes('estudo')) {
        title = 'Guia de Estudos para Concurso PÃºblico de Professor';
        excerpt = 'Descubra as melhores estratÃ©gias e temas indispensÃ¡veis para acelerar sua aprovaÃ§Ã£o em concursos da Ã¡rea da educaÃ§Ã£o.';
        category = 'Carreira';
        tags = ['concursos', 'professores', 'planejamento', 'estudos', 'ldb'];
        content = `
          <h2>IntroduÃ§Ã£o Ã  PreparaÃ§Ã£o de Alta Performance</h2>
          <p>Preparar-se para um concurso pÃºblico de professor exige muito mais do que apenas ler editais. Ã‰ necessÃ¡rio possuir um <strong>mÃ©todo de estudo estruturado</strong> que priorize as matÃ©rias de maior peso e com maior Ã­ndice de recorrÃªncia nas provas brasileiras.</p>
          
          <h2>Temas Recorrentes que VocÃª Precisa Dominar</h2>
          <p>Existem alguns pilares da educaÃ§Ã£o que sÃ£o cobrados em praticamente 100% dos concursos pÃºblicos para magistÃ©rio:</p>
          <ul>
            <li><strong>LDB (Lei de Diretrizes e Bases da EducaÃ§Ã£o Nacional):</strong> Foco especial no artigo 4Âº (deveres do Estado), artigo 24 (regras comuns do ensino fundamental/mÃ©dio) e artigo 58 a 60 (educaÃ§Ã£o especial).</li>
            <li><strong>Estatuto da CrianÃ§a e do Adolescente (ECA):</strong> Principalmente no que tange ao direito Ã  educaÃ§Ã£o e Ã  proteÃ§Ã£o contra a negligÃªncia.</li>
            <li><strong>Teorias da Aprendizagem:</strong> Conhecer profundamente as visÃµes de Piaget, Vygotsky e Wallon, comparando suas abordagens construtivistas e sociointeracionistas.</li>
          </ul>

          <h2>Como Organizar seu Cronograma Semanal</h2>
          <p>Recomendamos a divisÃ£o de seus estudos pelo mÃ©todo de <em>ciclos de disciplinas</em>. Em vez de estudar apenas uma matÃ©ria o dia todo, alterne a cada 1 hora e meia entre legislaÃ§Ã£o educacional, conhecimentos pedagÃ³gicos e portuguÃªs instrumental. A resoluÃ§Ã£o de questÃµes de bancas anteriores nos Ãºltimos 30 minutos de cada bloco fixa o aprendizado de forma definitiva.</p>
        `;
      } else if (normalizedPrompt.includes('inclusao') || normalizedPrompt.includes('escola') || normalizedPrompt.includes('pratica')) {
        title = 'EducaÃ§Ã£o Especial Inclusiva na PrÃ¡tica Escolar';
        excerpt = 'Aprenda estratÃ©gias pedagÃ³gicas prÃ¡ticas e eficientes para acolher e desenvolver alunos com necessidades educacionais especiais em salas regulares.';
        category = 'InclusÃ£o';
        tags = ['inclusÃ£o', 'sala de aula', 'pedagogia', 'atendimento especializado', 'ensino regular'];
        content = `
          <h2>A Realidade da Sala de Aula Inclusiva</h2>
          <p>A verdadeira <strong>educaÃ§Ã£o inclusiva</strong> nÃ£o se limita a conceder acesso fÃ­sico Ã s dependÃªncias escolares. Ela exige uma reestruturaÃ§Ã£o profunda do planejamento pedagÃ³gico que compreenda a diversidade humana como um elemento enriquecedor, e nÃ£o como um obstÃ¡culo.</p>

          <h2>AplicaÃ§Ãµes PrÃ¡ticas para o Professor Regente</h2>
          <p>Para criar um ambiente verdadeiramente acolhedor e estimulante, o professor pode implementar aÃ§Ãµes simples no dia a dia:</p>
          <ul>
            <li><strong>Desenho Universal para a Aprendizagem (DUA):</strong> Apresentar a matÃ©ria em formatos diversificados (Ã¡udios, imagens, maquetes fÃ­sicas) para que todos os canais sensoriais dos alunos sejam contemplados.</li>
            <li><strong>Trabalho Colaborativo:</strong> Fortalecer o vÃ­nculo e a troca entre o professor regente da sala regular e o profissional do AEE (Atendimento Educacional Especializado).</li>
            <li><strong>FlexibilizaÃ§Ã£o Curricular:</strong> Adaptar o ritmo e a forma das avaliaÃ§Ãµes pedagÃ³gicas sem rebaixar as expectativas de desenvolvimento do estudante.</li>
          </ul>

          <h2>A ImportÃ¢ncia de uma Parceria Forte com as FamÃ­lias</h2>
          <p>O desenvolvimento de um aluno com necessidades especÃ­ficas progride de forma exponencial quando hÃ¡ um alinhamento constante de expectativas entre a equipe escolar e os pais. ReuniÃµes de acompanhamento mais frequentes e acolhedoras constroem essa ponte de confianÃ§a necessÃ¡ria.</p>
        `;
      } else if (normalizedPrompt.includes('autismo') || normalizedPrompt.includes('aba') || normalizedPrompt.includes('autista')) {
        title = 'IntervenÃ§Ã£o ABA no Autismo: PrÃ¡ticas para Educadores';
        excerpt = 'Saiba como aplicar princÃ­pios da AnÃ¡lise do Comportamento Aplicada (ABA) para manejar comportamentos desafiadores e potencializar a aprendizagem escolar.';
        category = 'Autismo';
        tags = ['autismo', 'aba', 'comportamento', 'aprendizagem', 'intervenÃ§Ã£o'];
        content = `
          <h2>Compreendendo a AnÃ¡lise do Comportamento Aplicada (ABA)</h2>
          <p>A ciÃªncia da <strong>AnÃ¡lise do Comportamento Aplicada</strong> (conhecida internacionalmente pela sigla ABA) Ã© a abordagem com maior base de evidÃªncias cientÃ­ficas para o ensino de novas habilidades e reduÃ§Ã£o de comportamentos desafiadores em pessoas com Transtorno do Espectro Autista (TEA).</p>

          <h2>TÃ©cnicas Simples de ABA AplicÃ¡veis na Escola</h2>
          <p>Professores e auxiliares de vida escolar podem utilizar conceitos bÃ¡sicos da ABA no cotidiano para estruturar melhor a rotina:</p>
          <ul>
            <li><strong>ReforÃ§o Positivo:</strong> Parabenizar ou premiar imediatamente o comportamento adequado do aluno (ex: esperar a vez de falar), fortalecendo a chance de o comportamento se repetir.</li>
            <li><strong>Dicas e Suportes Visuais:</strong> Utilizar rotinas desenhadas em cartazes ou pÃ­lulas visuais no quadro para diminuir a ansiedade da transiÃ§Ã£o entre atividades escolares.</li>
            <li><strong>Ensino por Tentativas Discretas (DTT):</strong> Quebrar instruÃ§Ãµes complexas em passos mÃ­nimos e fÃ¡ceis de assimilar, comemorando cada pequena vitÃ³ria no trajeto acadÃªmico.</li>
          </ul>

          <h2>Evitando a Sobrecarga Sensorial</h2>
          <p>Muitas crises comportamentais ocorrem por hipersensibilidade a estÃ­mulos do ambiente escolar. Reduzir ruÃ­dos excessivos, oferecer cantinhos de descompressÃ£o silenciosos e usar luzes mais suaves sÃ£o adaptaÃ§Ãµes simples que promovem o bem-estar e o foco do aluno autista.</p>
        `;
      } else {
        // General Educational Theme
        title = 'Novas TendÃªncias PedagÃ³gicas na EducaÃ§Ã£o ContemporÃ¢nea';
        excerpt = 'Investigue as metodologias de ensino inovadoras que estÃ£o transformando salas de aula e preparando os alunos para as demandas do sÃ©culo XXI.';
        category = 'PrÃ¡ticas';
        tags = ['inovaÃ§Ã£o', 'ensino', 'metodologias ativas', 'tecnologia', 'escola'];
        content = `
          <h2>A TransformaÃ§Ã£o no Papel do Educador</h2>
          <p>No cenÃ¡rio educacional contemporÃ¢neo, o professor deixa de ser o Ãºnico detentor da informaÃ§Ã£o para atuar como um <strong>mediador do conhecimento</strong>. Essa mudanÃ§a empodera o estudante, colocando-o no centro da sua prÃ³pria jornada cognitiva.</p>

          <h2>Metodologias Ativas de Maior Destaque</h2>
          <p>As escolas que apresentam os melhores resultados de engajamento tÃªm adotado abordagens dinÃ¢micas no currÃ­culo:</p>
          <ul>
            <li><strong>Sala de Aula Invertida (Flipped Classroom):</strong> O aluno estuda a base conceitual em casa por vÃ­deos ou leituras e utiliza o tempo em sala de aula para debates e resoluÃ§Ã£o de problemas prÃ¡ticos.</li>
            <li><strong>Aprendizagem Baseada em Projetos (ABP):</strong> Grupos de estudantes investigam problemas complexos do mundo real e propÃµem soluÃ§Ãµes prÃ¡ticas ao final do bimestre.</li>
            <li><strong>Ensino HÃ­brido (Blended Learning):</strong> Combinar o melhor do ensino presencial com atividades personalizadas e trilhas de aprendizagem no formato digital.</li>
          </ul>

          <h2>Os BenefÃ­cios a Longo Prazo para a FormaÃ§Ã£o CidadÃ£</h2>
          <p>Metodologias que priorizam a colaboraÃ§Ã£o e a resoluÃ§Ã£o de problemas reais preparam os alunos nÃ£o apenas para provas formais, mas desenvolvem inteligÃªncia socioemocional, resiliÃªncia e pensamento crÃ­tico para enfrentar desafios profissionais futuros.</p>
        `;
      }
    }

    res.json({
      data: {
        title,
        excerpt,
        category,
        tags,
        content
      }
    });
  } catch (error) {
    console.error('Error generating blog content:', error);
    res.status(500).json({ error: 'Erro ao gerar conteÃºdo.' });
  }
});

app.post('/api/admin/blog-posts/generate-cover', authMiddleware, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt Ã© obrigatÃ³rio.' });
  }

  try {
    // Generate cover using Pollinations AI (100% key-free and highly functional!)
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=576&nologo=true`;
    
    // Download the image locally to keep in the /uploads folder
    const imgResponse = await fetch(url);
    if (!imgResponse.ok) {
      // Fallback: return direct pollinations URL if download fails
      return res.json({ data: { url } });
    }

    const arrayBuffer = await imgResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = `ai-cover-${Date.now()}-${Math.floor(Math.random() * 1000)}.png`;
    const filePath = path.join(uploadDir, filename);
    
    fs.writeFileSync(filePath, buffer);
    const localUrl = `/uploads/${filename}`;

    res.json({ data: { url: localUrl } });
  } catch (error) {
    console.error('Error generating cover image:', error);
    // Return a beautiful unsplash fallback to ensure interface robustness
    const fallbackUrl = `https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1024&q=80`;
    res.json({ data: { url: fallbackUrl } });
  }
});

app.post('/api/admin/blog-posts/generate-alt', authMiddleware, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt Ã© obrigatÃ³rio.' });
  }

  try {
    let altText = `IlustraÃ§Ã£o conceitual e profissional representando ${prompt}, com foco educativo em ambiente de aprendizado inclusivo.`;
    
    // Call dynamic AI provider
    try {
      const systemPrompt = `Escreva um texto alternativo (alt text) descritivo e altamente otimizado para SEO de no mÃ¡ximo 120 caracteres para uma imagem de capa de blog baseada no tema fornecido.
      Retorne apenas o texto curto sem aspas.`;
      
      const aiResponse = await callAI(systemPrompt, prompt);
      if (aiResponse) {
        altText = aiResponse.trim().replace(/^"|"$/g, '');
      }
    } catch (geminiError) {
      console.error('Error generating Alt Text with dynamic AI, using fallback:', geminiError);
    }

    res.json({ data: { altText } });
  } catch (error) {
    console.error('Error generating image alt text:', error);
    res.status(500).json({ error: 'Erro ao gerar texto alternativo.' });
  }
});

app.get('/api/ebooks', async (_req, res) => {
  const ebooks = await withDatabase(
    async () => (await prisma.ebook.findMany({
      where: { isActive: true },
      orderBy: { position: 'asc' },
    })).map(serializeEbook),
    []
  );
  res.json({ data: ebooks });
});

app.get('/api/mautic/forms/:id', async (req, res) => {
  try {
    const form = await fetchMauticForm(req.params.id);
    res.json({ data: form });
  } catch (error) {
    console.error('[mautic:form] fetch:error', {
      formId: req.params.id,
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(502).json({ error: 'Não foi possível carregar o formulário do Mautic.' });
  }
});

app.get('/api/events', async (_req, res) => {
  const events = await withDatabase(
    async () => (await prisma.event.findMany({
      where: { isActive: true },
      orderBy: { startsAt: 'asc' },
    })).map(serializeEvent),
    []
  );
  res.json({ data: events });
});

app.post('/api/admin/ebooks', authMiddleware, async (req, res) => {
  const parsed = ebookSchema.safeParse(req.body);
  if (!parsed.success) {
    logAction((req as any).user?.sub, 'Ebook', 'CREATE_FAILED', undefined, 'ERROR', { details: parsed.error.flatten() });
    return res.status(400).json({ error: 'E-book inválido.', details: parsed.error.flatten() });
  }
  try {
    const ebook = await prisma.ebook.create({ data: parsed.data });
    logAction((req as any).user?.sub, 'Ebook', 'CREATE', ebook.id, 'SUCCESS', { title: ebook.title });
    res.status(201).json({ data: serializeEbook(ebook) });
  } catch (err: any) {
    logAction((req as any).user?.sub, 'Ebook', 'CREATE_FAILED', undefined, 'ERROR', { error: err.message });
    res.status(500).json({ error: 'Erro ao criar e-book.' });
  }
});

function parseLocalDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0);
    return isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

app.post('/api/admin/events', authMiddleware, async (req, res) => {
  const parsed = eventSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: 'Evento inválido.', details: parsed.error.flatten() });
  }

  const modalityEnum = mapDatabaseModality(parsed.data.modality);
  const modalityDb = mapModalityToDatabase(modalityEnum) as any;

  const event = await prisma.event.upsert({
    where: { slug: parsed.data.slug },
    update: {
      ...parsed.data,
      modality: modalityDb,
      startsAt: parseLocalDate(parsed.data.startsAt),
    },
    create: {
      ...parsed.data,
      modality: modalityDb,
      startsAt: parseLocalDate(parsed.data.startsAt),
    },
  });

  res.status(201).json({ data: serializeEvent(event) });
});

// â”€â”€ Admin list endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

app.get('/api/admin/banners', authMiddleware, async (_req, res) => {
  const banners = await withDatabase(async () => (await prisma.banner.findMany({ orderBy: { sortOrder: 'asc' } })).map(serializeBanner), []);
  res.json({ data: banners });
});

app.get('/api/admin/courses', authMiddleware, async (_req, res) => {
  const courses = await withDatabase(
    async () => (await prisma.course.findMany({ orderBy: { title: 'asc' } })).map(serializeCourse),
    [],
  );
  res.json({ data: courses });
});

app.get('/api/admin/blog-posts', authMiddleware, async (_req, res) => {
  const posts = await withDatabase(async () => (await prisma.blogPost.findMany({ orderBy: { publishedAt: 'desc' } })).map(serializeBlogPost), []);
  res.json({ data: posts });
});

app.get('/api/admin/ebooks', authMiddleware, async (_req, res) => {
  const ebooks = await withDatabase(
    async () => (await prisma.ebook.findMany({ orderBy: { position: 'asc' } })).map(serializeEbook),
    []
  );
  res.json({ data: ebooks });
});

app.get('/api/admin/events', authMiddleware, async (_req, res) => {
  const events = await withDatabase(async () => (await prisma.event.findMany({ orderBy: { startsAt: 'asc' } })).map(serializeEvent), []);
  res.json({ data: events });
});

app.get('/api/admin/leads', authMiddleware, async (_req, res) => {
  const leads = await withDatabase(
    async () => (await prisma.lead.findMany({ orderBy: { createdAt: 'desc' }, include: { course: true } })).map(serializeLead),
    (seedLeads as any).map(serializeLead)
  );
  res.json({ data: leads });
});

// â”€â”€ Admin update / delete â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


app.delete('/api/admin/leads/:id', authMiddleware, async (req, res) => {
  try {
    const { count } = await prisma.lead.deleteMany({ where: { id: req.params.id } });
    if (count === 0) {
      logAction((req as any).user?.sub, 'Lead', 'DELETE_NOT_FOUND', req.params.id, 'ERROR');
      return res.status(404).json({ error: 'Lead não encontrado ou já excluído.' });
    }
    logAction((req as any).user?.sub, 'Lead', 'DELETE', req.params.id, 'SUCCESS');
    res.json({ ok: true });
  } catch (error: any) {
    logAction((req as any).user?.sub, 'Lead', 'DELETE_FAILED', req.params.id, 'ERROR', { error: error.message });
    console.error('Erro ao excluir lead:', error);
    res.status(500).json({ error: 'Erro ao processar exclusão.' });
  }
});

app.put('/api/admin/banners/:id', authMiddleware, async (req, res) => {
  const parsed = bannerSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    logAction((req as any).user?.sub, 'Banner', 'UPDATE_FAILED', req.params.id, 'ERROR', { details: parsed.error.flatten() });
    return res.status(400).json({ error: 'Dados inválidos.' });
  }
  try {
    const data = {
      ...parsed.data,
      subtitle: parsed.data.subtitle ? sanitizeHtml(parsed.data.subtitle) : undefined,
    };
    const banner = await prisma.banner.update({ where: { id: req.params.id }, data });
    logAction((req as any).user?.sub, 'Banner', 'UPDATE', banner.id, 'SUCCESS', { title: banner.title });
    res.json({ data: serializeBanner(banner) });
  } catch (err: any) {
    logAction((req as any).user?.sub, 'Banner', 'UPDATE_FAILED', req.params.id, 'ERROR', { error: err.message });
    res.status(404).json({ error: 'Banner não encontrado.' });
  }
});

app.delete('/api/admin/banners/:id', authMiddleware, async (req, res) => {
  try {
    const { count } = await prisma.banner.deleteMany({ where: { id: req.params.id } });
    if (count === 0) {
      logAction((req as any).user?.sub, 'Banner', 'DELETE_NOT_FOUND', req.params.id, 'ERROR');
      return res.status(404).json({ error: 'Banner não encontrado ou já excluído.' });
    }
    logAction((req as any).user?.sub, 'Banner', 'DELETE', req.params.id, 'SUCCESS');
    res.json({ ok: true });
  } catch (error: any) {
    logAction((req as any).user?.sub, 'Banner', 'DELETE_FAILED', req.params.id, 'ERROR', { error: error.message });
    console.error('Erro ao excluir banner:', error);
    res.status(500).json({ error: 'Erro ao processar exclusão.' });
  }
});

app.put('/api/admin/courses/:id', authMiddleware, async (req, res) => {
  const parsed = courseSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    logAction((req as any).user?.sub, 'Course', 'UPDATE_FAILED', req.params.id, 'ERROR', { details: parsed.error.flatten() });
    return res.status(400).json({ error: 'Dados inválidos.' });
  }
  try {
    const courseData = prepareCourseData(parsed.data);
    console.log('[course:update] payload', {
      courseId: req.params.id,
      receivedType: req.body?.type,
      receivedKind: req.body?.kind,
      prismaDataType: courseData.type,
    });
    if ((req.body?.type !== undefined || req.body?.kind !== undefined) && courseData.type === undefined) {
      return res.status(400).json({ error: 'Tipo de curso não foi reconhecido.' });
    }
    const course = await prisma.course.update({ where: { id: req.params.id }, data: courseData });
    const updatedCourse = await prisma.course.findUnique({ where: { id: course.id } });
    const serializedCourse = serializeCourse(updatedCourse ?? course);
    console.log('[course:update] saved', {
      courseId: course.id,
      savedType: (updatedCourse ?? course).type,
      responseKind: serializedCourse.kind,
    });
    logAction((req as any).user?.sub, 'Course', 'UPDATE', course.id, 'SUCCESS', { slug: course.slug, type: (updatedCourse ?? course).type });
    res.json({ data: serializedCourse });
  } catch (err: any) {
    logAction((req as any).user?.sub, 'Course', 'UPDATE_FAILED', req.params.id, 'ERROR', { error: err.message });
    res.status(404).json({ error: 'Curso não encontrado.' });
  }
});

app.delete('/api/admin/courses/:id', authMiddleware, async (req, res) => {
  try {
    const { count } = await prisma.course.deleteMany({ where: { id: req.params.id } });
    if (count === 0) {
      logAction((req as any).user?.sub, 'Course', 'DELETE_NOT_FOUND', req.params.id, 'ERROR');
      return res.status(404).json({ error: 'Curso não encontrado ou já excluído.' });
    }
    logAction((req as any).user?.sub, 'Course', 'DELETE', req.params.id, 'SUCCESS');
    res.json({ ok: true });
  } catch (error: any) {
    logAction((req as any).user?.sub, 'Course', 'DELETE_FAILED', req.params.id, 'ERROR', { error: error.message });
    console.error('Erro ao excluir curso:', error);
    res.status(500).json({ error: 'Erro ao processar exclusão.' });
  }
});

app.put('/api/admin/blog-posts/:id', authMiddleware, async (req, res) => {
  const parsed = blogPostSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    logAction((req as any).user?.sub, 'BlogPost', 'UPDATE_FAILED', req.params.id, 'ERROR', { details: parsed.error.flatten() });
    return res.status(400).json({ error: 'Dados inválidos.' });
  }
  try {
    const dbData = {
      ...parsed.data,
      content: parsed.data.content ? sanitizeHtml(parsed.data.content) : undefined,
      publishedAt: parsed.data.isPublished ? new Date() : null,
    };
    const post = await prisma.blogPost.update({
      where: { id: req.params.id },
      data: dbData,
    });
    logAction((req as any).user?.sub, 'BlogPost', 'UPDATE', post.id, 'SUCCESS', { slug: post.slug });
    res.json({ data: serializeBlogPost(post) });
  } catch (err: any) {
    logAction((req as any).user?.sub, 'BlogPost', 'UPDATE_FAILED', req.params.id, 'ERROR', { error: err.message });
    res.status(404).json({ error: 'Post não encontrado.' });
  }
});

app.delete('/api/admin/blog-posts/:id', authMiddleware, async (req, res) => {
  try {
    const { count } = await prisma.blogPost.deleteMany({ where: { id: req.params.id } });
    if (count === 0) {
      logAction((req as any).user?.sub, 'BlogPost', 'DELETE_NOT_FOUND', req.params.id, 'ERROR');
      return res.status(404).json({ error: 'Post não encontrado ou já excluído.' });
    }
    logAction((req as any).user?.sub, 'BlogPost', 'DELETE', req.params.id, 'SUCCESS');
    res.json({ ok: true });
  } catch (error: any) {
    logAction((req as any).user?.sub, 'BlogPost', 'DELETE_FAILED', req.params.id, 'ERROR', { error: error.message });
    console.error('Erro ao excluir post:', error);
    res.status(500).json({ error: 'Erro ao processar exclusão.' });
  }
});

app.put('/api/admin/ebooks/:id', authMiddleware, async (req, res) => {
  const parsed = ebookSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    logAction((req as any).user?.sub, 'Ebook', 'UPDATE_FAILED', req.params.id, 'ERROR', { details: parsed.error.flatten() });
    return res.status(400).json({ error: 'Dados inválidos.', details: parsed.error.flatten() });
  }
  try {
    const ebook = await prisma.ebook.update({ where: { id: req.params.id }, data: parsed.data });
    logAction((req as any).user?.sub, 'Ebook', 'UPDATE', ebook.id, 'SUCCESS', { title: ebook.title });
    res.json({ data: serializeEbook(ebook) });
  } catch (err: any) {
    logAction((req as any).user?.sub, 'Ebook', 'UPDATE_FAILED', req.params.id, 'ERROR', { error: err.message });
    res.status(404).json({ error: 'E-book não encontrado.' });
  }
});

app.delete('/api/admin/ebooks/:id', authMiddleware, async (req, res) => {
  try {
    const { count } = await prisma.ebook.deleteMany({ where: { id: req.params.id } });
    if (count === 0) {
      logAction((req as any).user?.sub, 'Ebook', 'DELETE_NOT_FOUND', req.params.id, 'ERROR');
      return res.status(404).json({ error: 'E-book não encontrado ou já excluído.' });
    }
    logAction((req as any).user?.sub, 'Ebook', 'DELETE', req.params.id, 'SUCCESS');
    res.json({ ok: true });
  } catch (error: any) {
    logAction((req as any).user?.sub, 'Ebook', 'DELETE_FAILED', req.params.id, 'ERROR', { error: error.message });
    console.error('Erro ao excluir e-book:', error);
    res.status(500).json({ error: 'Erro ao processar exclusão.' });
  }
});

app.put('/api/admin/events/:id', authMiddleware, async (req, res) => {
  const parsed = eventSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    logAction((req as any).user?.sub, 'Event', 'UPDATE_FAILED', req.params.id, 'ERROR', { details: parsed.error.flatten() });
    return res.status(400).json({ error: 'Dados inválidos.' });
  }
  try {
    const updateData: any = { ...parsed.data };
    if (parsed.data.modality !== undefined) {
      updateData.modality = mapModalityToDatabase(mapDatabaseModality(parsed.data.modality));
    }
    if (parsed.data.startsAt !== undefined) {
      updateData.startsAt = parseLocalDate(parsed.data.startsAt);
    }
    const ev = await prisma.event.update({
      where: { id: req.params.id },
      data: updateData,
    });
    logAction((req as any).user?.sub, 'Event', 'UPDATE', ev.id, 'SUCCESS', { slug: ev.slug });
    res.json({ data: serializeEvent(ev) });
  } catch (err: any) {
    logAction((req as any).user?.sub, 'Event', 'UPDATE_FAILED', req.params.id, 'ERROR', { error: err.message });
    res.status(404).json({ error: 'Evento não encontrado.' });
  }
});

app.delete('/api/admin/events/:id', authMiddleware, async (req, res) => {
  try {
    const { count } = await prisma.event.deleteMany({ where: { id: req.params.id } });
    if (count === 0) {
      logAction((req as any).user?.sub, 'Event', 'DELETE_NOT_FOUND', req.params.id, 'ERROR');
      return res.status(404).json({ error: 'Evento não encontrado ou já excluído.' });
    }
    logAction((req as any).user?.sub, 'Event', 'DELETE', req.params.id, 'SUCCESS');
    res.json({ ok: true });
  } catch (error: any) {
    logAction((req as any).user?.sub, 'Event', 'DELETE_FAILED', req.params.id, 'ERROR', { error: error.message });
    console.error('Erro ao excluir evento:', error);
    res.status(500).json({ error: 'Erro ao processar exclusão.' });
  }
});

app.put('/api/admin/leads/:id', authMiddleware, async (req, res) => {
  const schema = z.object({ status: z.enum(['novo', 'em_atendimento', 'matriculado', 'perdido']), notes: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    logAction((req as any).user?.sub, 'Lead', 'UPDATE_FAILED', req.params.id, 'ERROR', { details: parsed.error.flatten() });
    return res.status(400).json({ error: 'Dados inválidos.' });
  }
  try {
    const lead = await prisma.lead.update({ where: { id: req.params.id }, data: parsed.data });
    logAction((req as any).user?.sub, 'Lead', 'UPDATE', lead.id, 'SUCCESS', { status: lead.status });
    res.json({ data: serializeLead(lead) });
  } catch (err: any) {
    logAction((req as any).user?.sub, 'Lead', 'UPDATE_FAILED', req.params.id, 'ERROR', { error: err.message });
    res.status(404).json({ error: 'Lead não encontrado.' });
  }
});

// â”€â”€ Referral system â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

app.get('/api/referral/:code', async (req, res) => {
  const refCode = await withDatabase(
    () => prisma.referralCode.findUnique({
      where: { code: req.params.code },
      include: { student: { select: { name: true } } },
    }),
    null,
  );
  if (!refCode || !refCode.isActive) return res.status(404).json({ error: 'CÃ³digo de indicaÃ§Ã£o invÃ¡lido.' });
  if (refCode.expiresAt && refCode.expiresAt < new Date()) return res.status(410).json({ error: 'CÃ³digo expirado.' });
  res.json({ data: { code: refCode.code, studentName: (refCode as any).student?.name ?? 'um aluno' } });
});

// Self-service student registration for referral program
app.post('/api/referrals/register', async (req, res) => {
  const schema = z.object({
    name: z.string().min(3),
    email: z.string().email(),
    phone: z.string().min(8),
    cpf: z.string().optional(),
    consentLgpd: z.boolean(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados invÃ¡lidos.', details: parsed.error.flatten() });

  const result = await withDatabase(async () => {
    let student = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!student) {
      student = await prisma.user.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone || null,
          cpf: parsed.data.cpf || null,
          role: 'student',
        },
      });
    }

    let referralCode = await prisma.referralCode.findFirst({
      where: { studentId: student.id, isActive: true },
    });

    if (!referralCode) {
      const code = generateReferralCode();
      referralCode = await prisma.referralCode.create({
        data: { studentId: student.id, code },
      });
    }

    return referralCode;
  }, null);

  if (!result) return res.status(503).json({ error: 'Falha ao registrar.' });
  
  sendToCrmWebhook('referral_code_created', { 
    ...result, 
    student: { name: parsed.data.name, email: parsed.data.email, phone: parsed.data.phone } 
  });
  
  res.status(201).json({ data: result });
});

app.post('/api/referrals/me', async (req, res) => {
  const schema = z.object({
    code: z.string().optional(),
    email: z.string().email().optional(),
  }).refine(data => data.code || data.email, {
    message: "Ã‰ necessÃ¡rio informar o cÃ³digo ou e-mail.",
    path: ["code"]
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'CÃ³digo ou e-mail invÃ¡lido.' });

  const result = await withDatabase(async () => {
    let refCode = null;
    if (parsed.data.code) {
      refCode = await prisma.referralCode.findUnique({
        where: { code: parsed.data.code.trim().toUpperCase() },
        include: {
          student: { select: { name: true, email: true } },
          referrals: {
            include: { lead: { select: { name: true, status: true, courseId: true } } },
            orderBy: { createdAt: 'desc' }
          }
        }
      });
    } else if (parsed.data.email) {
      const student = await prisma.user.findUnique({
        where: { email: parsed.data.email.trim().toLowerCase() }
      });
      if (student) {
        refCode = await prisma.referralCode.findFirst({
          where: { studentId: student.id, isActive: true },
          include: {
            student: { select: { name: true, email: true } },
            referrals: {
              include: { lead: { select: { name: true, status: true, courseId: true } } },
              orderBy: { createdAt: 'desc' }
            }
          }
        });
      }
    }

    if (!refCode) return null;

    return {
      code: refCode.code,
      studentName: refCode.student?.name,
      referrals: refCode.referrals.map((r: any) => ({
        id: r.id,
        leadName: r.lead?.name || 'IndicaÃ§Ã£o AnÃ´nima',
        status: r.status,
        discountApplied: Number(r.discountApplied),
        createdAt: r.createdAt,
      })),
    };
  }, null);

  if (!result) return res.status(404).json({ error: 'Indicador nÃ£o encontrado ou sem cÃ³digo ativo.' });
  res.json({ data: result });
});

// LeadConnector Webhook for zero-cost referral syncing
app.post('/api/webhooks/leadconnector', async (req, res) => {
  console.log('[Webhook:LeadConnector] Payload recebido:', req.body);
  
  const name = req.body.name || req.body.first_name || req.body.fullName || `${req.body.firstName || ''} ${req.body.lastName || ''}`.trim() || 'Lead CRM';
  const email = req.body.email;
  const phone = req.body.phone || '';
  const referralCodeStr = req.body.referral_code || req.body.referralCode || req.body.ref || (req.body.customFields ? req.body.customFields.referral_code || req.body.customFields.referralCode : undefined);
  const courseSlug = req.body.course_slug || req.body.courseSlug;
  const eventType = req.body.type || req.body.event || req.body.status || 'created';

  if (!email) {
    return res.status(400).json({ error: 'O campo "email" Ã© obrigatÃ³rio no webhook.' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check if the event is a conversion/matriculado
      if (eventType === 'converted' || eventType === 'matriculado' || (eventType === 'opportunity_status_changed' && req.body.opportunityStatus === 'won')) {
        const existingReferrals = await tx.referral.findMany({
          where: {
            lead: { email: email.trim().toLowerCase() },
            status: 'pending'
          }
        });

        if (existingReferrals.length > 0) {
          const updated = await Promise.all(
            existingReferrals.map(r => 
              tx.referral.update({
                where: { id: r.id },
                data: { status: 'converted', convertedAt: new Date() }
              })
            )
          );
          return { message: 'Referral(s) atualizado(s) para convertido.', updatedCount: updated.length };
        }
        return { message: 'Nenhuma indicaÃ§Ã£o pendente encontrada para este e-mail.' };
      }

      // 2. Check if a referralCode is present (to create a pending referral)
      if (referralCodeStr) {
        const refCode = await tx.referralCode.findUnique({
          where: { code: referralCodeStr.trim().toUpperCase() }
        });

        if (refCode) {
          let course = null;
          if (courseSlug) {
            course = await tx.course.findUnique({ where: { slug: courseSlug } });
          }

          let lead = await tx.lead.findFirst({
            where: { email: email.trim().toLowerCase() }
          });

          if (!lead) {
            lead = await tx.lead.create({
              data: {
                name,
                email: email.trim().toLowerCase(),
                phone,
                courseId: course?.id,
                referralCode: refCode.code,
                source: 'leadconnector_webhook',
                status: 'novo'
              }
            });
          }

          const existingReferral = await tx.referral.findFirst({
            where: {
              referralCodeId: refCode.id,
              leadId: lead.id
            }
          });

          if (!existingReferral) {
            await tx.referral.create({
              data: {
                referralCodeId: refCode.id,
                leadId: lead.id,
                status: 'pending',
                discountApplied: 0
              }
            });
            return { message: 'IndicaÃ§Ã£o criada com sucesso (pendente).', leadId: lead.id };
          }
          return { message: 'IndicaÃ§Ã£o jÃ¡ existia para este lead e cÃ³digo.' };
        }
        return { message: 'CÃ³digo de indicaÃ§Ã£o fornecido nÃ£o Ã© vÃ¡lido.' };
      }

      return { message: 'Webhook recebido, mas nenhuma aÃ§Ã£o realizada (sem cÃ³digo de indicaÃ§Ã£o ou status de conversÃ£o).' };
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[Webhook:LeadConnector] Erro ao processar:', error);
    res.status(500).json({ error: 'Erro interno ao processar o webhook.' });
  }
});

app.get('/api/admin/referral-settings', authMiddleware, async (_req, res) => {
  const settings = await withDatabase(() => prisma.referralSettings.findFirst(), {
    id: 'local', isActive: true, discountType: 'percent', discountValue: 10,
    maxDiscountPercent: 50, isCumulative: true, autoApprove: false,
    eligibleCourseTypes: ['pos_presencial', 'pos_online'], linkExpiryDays: null, updatedAt: new Date(),
  } as any);
  res.json({ data: settings });

// -----------------------------------------------------------------------------
// -- Admin Users CRUD (Admins only) -------------------------------------------
// -----------------------------------------------------------------------------

app.get('/api/admin/users', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  const users = await withDatabase(async () => {
    return prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cpf: true,
        role: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });
  }, []);
  res.json({ data: users });
});

app.post('/api/admin/users', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  const { name, email, phone, cpf, role, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
  }
  const emailExists = await prisma.user.findUnique({ where: { email } });
  if (emailExists) {
    return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
  }
  if (cpf) {
    const cpfExists = await prisma.user.findUnique({ where: { cpf } });
    if (cpfExists) {
      return res.status(400).json({ error: 'Este CPF já está cadastrado.' });
    }
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await withDatabase(async () => {
    return prisma.user.create({
      data: {
        name,
        email,
        phone,
        cpf: cpf || null,
        role: role || 'editor',
        passwordHash,
      }
    });
  }, null);
  if (!user) return res.status(503).json({ error: 'Erro ao criar usuário.' });
  res.status(201).json({ data: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.put('/api/admin/users/:id', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  const { name, email, phone, cpf, role, password } = req.body;
  const userId = req.params.id;

  const existingUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!existingUser) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  if (email && email !== existingUser.email) {
    const emailExists = await prisma.user.findUnique({ where: { email } });
    if (emailExists) {
      return res.status(400).json({ error: 'Este e-mail já está em uso.' });
    }
  }

  const updateData: any = {
    name,
    email,
    phone,
    cpf: cpf || null,
    role,
  };

  if (password) {
    updateData.passwordHash = await bcrypt.hash(password, 10);
  }

  const user = await withDatabase(async () => {
    return prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }, null);

  if (!user) return res.status(503).json({ error: 'Erro ao atualizar usuário.' });
  res.json({ data: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.delete('/api/admin/users/:id', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  const userId = req.params.id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }
  await withDatabase(async () => {
    return prisma.user.delete({ where: { id: userId } });
  }, null);
  res.json({ message: 'Usuário excluído com sucesso.' });
});
});

const referralSettingsSchema = z.object({
  isActive: z.boolean().optional(),
  discountType: z.enum(['percent', 'fixed']).optional(),
  discountValue: z.number().min(0).optional(),
  maxDiscountPercent: z.number().min(0).max(100).optional(),
  isCumulative: z.boolean().optional(),
  autoApprove: z.boolean().optional(),
  eligibleCourseTypes: z.array(z.string()).optional(),
  linkExpiryDays: z.number().int().positive().nullable().optional(),
});

app.put('/api/admin/referral-settings', authMiddleware, async (req, res) => {
  const parsed = referralSettingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados invÃ¡lidos.' });
  const settings = await withDatabase(async () => {
    const existing = await prisma.referralSettings.findFirst();
    if (existing) return prisma.referralSettings.update({ where: { id: existing.id }, data: parsed.data });
    return prisma.referralSettings.create({
      data: { eligibleCourseTypes: ['pos_presencial', 'pos_online'], ...parsed.data },
    });
  }, null);
  res.json({ data: settings });
});

app.get('/api/admin/referrals', authMiddleware, async (_req, res) => {
  const referrals = await withDatabase(
    () => prisma.referral.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        referralCode: { include: { student: { select: { name: true, email: true } } } },
        lead: { select: { name: true, email: true, phone: true } },
      },
    }),
    [],
  );
  res.json({ data: referrals });
});

app.put('/api/admin/referrals/:id/approve', authMiddleware, async (req, res) => {
  const result = await withDatabase(async () => {
    const referral = await prisma.referral.findUnique({ where: { id: req.params.id } });
    if (!referral) return null;

    // Apenas marca como convertido e aplica algum desconto padrÃ£o (se configurado de forma fixa, ou por tier)
    // Para simplificar, o sistema de turmas calcula dinamicamente baseado no total,
    // mas guardamos o registro da conversÃ£o.
    return prisma.referral.update({
      where: { id: req.params.id },
      data: { status: 'converted', convertedAt: new Date() },
    });
  }, null);

  if (!result) return res.status(404).json({ error: 'IndicaÃ§Ã£o nÃ£o encontrada.' });
  res.json({ data: result });
});

app.get('/api/admin/referral-codes', authMiddleware, async (_req, res) => {
  const codes = await withDatabase(
    () => prisma.referralCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: { student: { select: { name: true, email: true } }, referrals: { select: { status: true } } },
    }),
    [],
  );
  res.json({ data: codes });
});

app.post('/api/admin/referral-codes', authMiddleware, async (req, res) => {
  const schema = z.object({
    studentName: z.string().min(2),
    studentEmail: z.string().email(),
    linkExpiryDays: z.number().int().positive().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados invÃ¡lidos.', details: parsed.error.flatten() });

  const result = await withDatabase(async () => {
    let student = await prisma.user.findUnique({ where: { email: parsed.data.studentEmail } });
    if (!student) {
      student = await prisma.user.create({ data: { name: parsed.data.studentName, email: parsed.data.studentEmail, role: 'student' } });
    }
    const code = generateReferralCode();
    const expiresAt = parsed.data.linkExpiryDays
      ? new Date(Date.now() + parsed.data.linkExpiryDays * 86_400_000)
      : null;
    return prisma.referralCode.create({
      data: { studentId: student.id, code, expiresAt },
      include: { student: { select: { name: true, email: true } } },
    });
  }, null);

  if (!result) return res.status(503).json({ error: 'Banco de dados indisponível.' });
  
  sendToCrmWebhook('referral_code_created', {
    ...result,
    studentName: result.student.name,
    studentEmail: result.student.email
  });
  
  res.status(201).json({ data: result });
});

app.delete('/api/admin/referral-codes/:id', authMiddleware, async (req, res) => {
  try {
    await prisma.referralCode.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ ok: true });
  } catch { res.status(404).json({ error: 'CÃ³digo nÃ£o encontrado.' }); }
});

// â”€â”€ Turma (group formation) public routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DEFAULT_TIERS = [
  { minReferrals: 1, discountPercent: 10 },
  { minReferrals: 3, discountPercent: 25 },
  { minReferrals: 5, discountPercent: 50 },
  { minReferrals: 10, discountPercent: 100 },
];

app.get('/api/turma/:slug', async (req, res) => {
  const data = await withDatabase(async () => {
    const course = await prisma.course.findUnique({
      where: { slug: req.params.slug },
      include: { referralTiers: { orderBy: { minReferrals: 'asc' } } },
    });
    if (!course || !course.isActive) return null;

    const enrollmentCount = await prisma.lead.count({
      where: { courseId: course.id, source: 'turma_indicacao' },
    });

    return {
      course: { ...serializeCourse(course), minStudents: (course as any).minStudents ?? 15 },
      enrollmentCount,
      tiers: (course as any).referralTiers?.length ? (course as any).referralTiers : DEFAULT_TIERS,
    };
  }, null);

  if (!data) return res.status(404).json({ error: 'Turma nÃ£o encontrada.' });
  res.json({ data });
});

app.post('/api/turma/:slug/registro', async (req, res) => {
  const schema = z.object({
    name: z.string().min(3),
    email: z.string().email(),
    phone: z.string().min(8),
    referralCode: z.string().optional(),
    consentLgpd: z.boolean(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.', details: parsed.error.flatten() });

  let createdLead: any = null;
  let createdRefCode: any = null;

  const result = await withDatabase(async () => {
    const course = await prisma.course.findUnique({ where: { slug: req.params.slug } });
    if (!course) throw new Error('Curso não encontrado');

    const lead = await prisma.lead.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        courseId: course.id,
        source: 'turma_indicacao',
        referralCode: parsed.data.referralCode,
        consentLgpd: parsed.data.consentLgpd,
        notes: `PrÃ©-inscriÃ§Ã£o via pÃ¡gina de turma. ${parsed.data.referralCode ? `Indicado por: ${parsed.data.referralCode}` : 'Acesso direto'}`,
      },
    });
    createdLead = lead;

    if (parsed.data.referralCode) {
      const refCode = await prisma.referralCode.findUnique({ where: { code: parsed.data.referralCode } });
      if (refCode) {
        await prisma.referral.create({
          data: { referralCodeId: refCode.id, leadId: lead.id, status: 'pending', discountApplied: 0 },
        });
      }
    }

    let user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) {
      user = await prisma.user.create({
        data: { name: parsed.data.name, email: parsed.data.email, phone: parsed.data.phone, role: 'student' },
      });
    }

    const code = generateReferralCode();
    const refCodeObj = await prisma.referralCode.create({
      data: { studentId: user.id, code },
      include: { student: { select: { name: true, email: true, phone: true } } },
    });
    createdRefCode = refCodeObj;

    const enrollmentCount = await prisma.lead.count({
      where: { courseId: course.id, source: 'turma_indicacao' },
    });

    const myReferralCount = await prisma.referral.count({
      where: { referralCode: { code }, status: { not: 'expired' } },
    });

    return { code, enrollmentCount, myReferralCount, position: enrollmentCount };
  }, {
    code: generateReferralCode(),
    enrollmentCount: 1,
    myReferralCount: 0,
    position: 1,
  });

  if (createdLead) {
    sendToCrmWebhook('lead_created', createdLead);
  }
  if (createdRefCode) {
    sendToCrmWebhook('referral_code_created', createdRefCode);
  }

  res.status(201).json({ data: result });
});

// referral count for a code (public â€” for success screen updates)
app.get('/api/turma/:slug/minhas-indicacoes/:code', async (req, res) => {
  const count = await withDatabase(
    async () => prisma.referral.count({
      where: { referralCode: { code: req.params.code }, status: { not: 'expired' } },
    }),
    0,
  );
  res.json({ data: { count } });
});

// â”€â”€ Turma admin routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

app.get('/api/admin/turmas', authMiddleware, async (_req, res) => {
  const turmas = await withDatabase(async () => {
    const courses = await prisma.course.findMany({
      where: { isActive: true, type: { in: ['livre', 'pos_presencial', 'pos_online'] } },
      include: { referralTiers: { orderBy: { minReferrals: 'asc' } } },
      orderBy: { title: 'asc' },
    });

    const counts = await Promise.all(
      courses.map((c) => prisma.lead.count({ where: { courseId: c.id, source: 'turma_indicacao' } })),
    );

    return courses.map((c, i) => ({
      ...serializeCourse(c),
      minStudents: (c as any).minStudents ?? 15,
      enrollmentCount: counts[i],
      tiers: (c as any).referralTiers?.length ? (c as any).referralTiers : DEFAULT_TIERS,
    }));
  }, []);

  res.json({ data: turmas });
});

app.put('/api/admin/turmas/:id', authMiddleware, async (req, res) => {
  const schema = z.object({
    minStudents: z.number().int().min(2).max(200).optional(),
    tiers: z.array(z.object({ minReferrals: z.number().int().min(1), discountPercent: z.number().int().min(1).max(100) })).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados invÃ¡lidos.' });

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const course = await tx.course.update({
        where: { id: req.params.id },
        data: parsed.data.minStudents != null ? { minStudents: parsed.data.minStudents } as any : {},
      });

      if (parsed.data.tiers) {
        await (tx as any).courseReferralTier.deleteMany({ where: { courseId: req.params.id } });
        await (tx as any).courseReferralTier.createMany({
          data: parsed.data.tiers.map((t) => ({ ...t, courseId: req.params.id })),
        });
      }

      return course;
    });
    res.json({ data: serializeCourse(updated) });
  } catch { res.status(404).json({ error: 'Turma nÃ£o encontrada.' }); }
});

// â”€â”€ Admin Settings endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

app.get('/api/admin/settings', authMiddleware, async (_req, res) => {
  const settings = await getSystemSettings();
  res.json({ data: settings });
});

app.put('/api/admin/settings', authMiddleware, async (req, res) => {
  const parsed = systemSettingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Dados invÃ¡lidos.', details: parsed.error.flatten() });
  }
  const settings = await withDatabase(async () => {
    return prisma.systemSetting.update({
      where: { id: 'default' },
      data: parsed.data
    });
  }, null);
  if (!settings) return res.status(503).json({ error: 'Banco de dados indisponÃ­vel.' });
  res.json({ data: settings });
});

// â”€â”€ Admin Menu Items endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

app.get('/api/admin/menu', authMiddleware, async (_req, res) => {
  const menus = await withDatabase(async () => {
    return prisma.menuItem.findMany({ orderBy: { position: 'asc' } });
  }, []);
  res.json({ data: menus });
});

app.post('/api/admin/menu', authMiddleware, async (req, res) => {
  const parsed = menuItemSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Menu invÃ¡lido.', details: parsed.error.flatten() });
  }
  const menu = await withDatabase(async () => {
    return prisma.menuItem.create({ data: parsed.data });
  }, null);
  if (!menu) return res.status(503).json({ error: 'Falha ao salvar menu.' });
  res.status(201).json({ data: menu });
});

app.put('/api/admin/menu/:id', authMiddleware, async (req, res) => {
  const parsed = menuItemSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Dados invÃ¡lidos.', details: parsed.error.flatten() });
  }
  try {
    const menu = await prisma.menuItem.update({
      where: { id: req.params.id },
      data: parsed.data
    });
    res.json({ data: menu });
  } catch {
    res.status(404).json({ error: 'Menu nÃ£o encontrado.' });
  }
});

app.delete('/api/admin/menu/:id', authMiddleware, async (req, res) => {
  try {
    const { count } = await prisma.menuItem.deleteMany({ where: { id: req.params.id } });
    if (count === 0) return res.status(404).json({ error: 'Menu não encontrado ou já excluído.' });
    res.json({ ok: true });
  } catch (error) {
    console.error('Erro ao excluir menu:', error);
    res.status(500).json({ error: 'Erro ao processar exclusão.' });
  }
});

app.post('/api/admin/menu/reorder', authMiddleware, async (req, res) => {
  const schema = z.object({
    items: z.array(z.object({ id: z.string(), position: z.number().int() }))
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados invÃ¡lidos.' });

  const success = await withDatabase(async () => {
    await prisma.$transaction(
      parsed.data.items.map((item) =>
        prisma.menuItem.update({
          where: { id: item.id },
          data: { position: item.position }
        })
      )
    );
    return true;
  }, false);

  if (!success) return res.status(503).json({ error: 'Falha ao reordenar.' });
  res.json({ ok: true });
});


const clientDist = path.resolve(process.cwd(), 'dist');
app.use(express.static(clientDist, {
  setHeaders: (res, filePath) => {
    if (filePath.includes('/assets/') || filePath.includes('\\assets\\')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
  }
}));
app.get('*', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  const indexPath = path.join(clientDist, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return res.status(404).send('Frontend build not found. Please build the frontend first.');
  }

  try {
    let html = fs.readFileSync(indexPath, 'utf8');

    // Default metadata
    let domain = 'isentidos.com.br';
    let siteName = 'Instituto Sentidos';
    try {
      const settings = await getSystemSettings();
      if (settings && !('error' in settings)) {
        domain = (settings as any).domain || domain;
        siteName = (settings as any).siteName || siteName;
      }
    } catch (e) {
      console.error('Error fetching system settings for meta tags:', e);
    }

    let baseUrl = domain;
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }

    let title = `${siteName} - Pós-Graduações e Cursos Livres`;
    let description = `${siteName} - Especialização, pós-graduação e cursos livres em Caxias, MA. Venha se especializar conosco e impulsione sua carreira!`;
    let imageUrl = `${baseUrl}/logo-isentidos-laranja.png`;
    const url = `${baseUrl}${req.originalUrl}`;

    const reqPath = req.path;

    if (reqPath.startsWith('/indique-e-ganhe')) {
      title = `Programa Indique e Ganhe - ${siteName}`;
      description = `Indique amigos para estudar no ${siteName} e ganhe descontos progressivos em suas mensalidades!`;
    } else if (reqPath.startsWith('/indicacao/')) {
      const code = reqPath.split('/')[2] ?? '';
      let studentName = 'Um aluno';
      if (code) {
        try {
          const refCode = await prisma.referralCode.findUnique({
            where: { code },
            include: { student: { select: { name: true } } },
          });
          if (refCode?.student?.name) {
            studentName = refCode.student.name;
          }
        } catch (e) {
          console.error('Error fetching referral student name for meta tags:', e);
        }
      }
      title = `Você recebeu uma indicação de ${studentName}!`;
      description = `Faça sua matrícula no ${siteName} utilizando a indicação de ${studentName} e ganhe benefícios especiais.`;
    } else if (reqPath === '/cursos') {
      title = `Cursos e Especializações - ${siteName}`;
      description = 'Confira nosso catálogo de pós-graduações, MBA, cursos de extensão e programas stricto sensu.';
    } else if (reqPath.startsWith('/cursos/')) {
      const slug = reqPath.split('/')[2] ?? '';
      if (slug) {
        try {
          const course = await prisma.course.findUnique({ where: { slug } });
          if (course) {
            title = `${course.title} - ${siteName}`;
            description = course.description || description;
            if (course.coverImageUrl) {
              imageUrl = course.coverImageUrl.startsWith('http') 
                ? course.coverImageUrl 
                : `${baseUrl}${course.coverImageUrl}`;
            }
          }
        } catch (e) {
          console.error('Error fetching course for meta tags:', e);
        }
      }
    } else if (reqPath === '/ebooks') {
      title = `Materiais e E-books Gratuitos - ${siteName}`;
      description = 'Baixe nossos livros digitais e guias exclusivos sobre inclusão, autismo, educação especial e desenvolvimento humano.';
    } else if (reqPath === '/eventos') {
      title = `Eventos e Encontros - ${siteName}`;
      description = 'Acompanhe nosso calendário de imersões, aulas abertas e eventos presenciais e online.';
    } else if (reqPath === '/blog') {
      title = `Blog - ${siteName}`;
      description = 'Conteúdos, artigos e notícias atualizadas sobre educação inclusiva, análise do comportamento (ABA) e pedagogia.';
    } else if (reqPath.startsWith('/blog/')) {
      const slug = reqPath.split('/')[2] ?? '';
      if (slug) {
        try {
          const post = await prisma.blogPost.findUnique({ where: { slug } });
          if (post) {
            title = `${post.title} - Blog ${siteName}`;
            description = post.excerpt || description;
            if (post.coverImageUrl) {
              imageUrl = post.coverImageUrl.startsWith('http') 
                ? post.coverImageUrl 
                : `${baseUrl}${post.coverImageUrl}`;
            }
          }
        } catch (e) {
          console.error('Error fetching blog post for meta tags:', e);
        }
      }
    } else if (reqPath.startsWith('/turma/')) {
      const slug = reqPath.split('/')[2] ?? '';
      if (slug) {
        try {
          const course = await prisma.course.findUnique({ where: { slug } });
          if (course) {
            title = `Formação de Turma: ${course.title} - ${siteName}`;
            description = `Ajude a fechar a turma do curso ${course.title} indicando amigos. Quanto mais indicados, maior o desconto de todos!`;
            if (course.coverImageUrl) {
              imageUrl = course.coverImageUrl.startsWith('http') 
                ? course.coverImageUrl 
                : `${baseUrl}${course.coverImageUrl}`;
            }
          }
        } catch (e) {
          console.error('Error fetching course for turma meta tags:', e);
        }
      }
    }

    // 1. Replace or insert Title
    if (html.includes('<title>')) {
      html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
    } else {
      html = html.replace('<head>', `<head><title>${title}</title>`);
    }

    // 2. Replace or insert Description
    if (html.includes('name="description"')) {
      html = html.replace(/<meta name="description" content=".*?"\s*\/?>/, `<meta name="description" content="${description}" />`);
    } else {
      html = html.replace('<head>', `<head><meta name="description" content="${description}" />`);
    }

    // 3. Inject Open Graph and Twitter Card tags
    const ogTags = `
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${url}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${imageUrl}" />

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:url" content="${url}" />
  <meta property="twitter:title" content="${title}" />
  <meta property="twitter:description" content="${description}" />
  <meta property="twitter:image" content="${imageUrl}" />
`;

    html = html.replace('</head>', `${ogTags}\n</head>`);

    res.send(html);
  } catch (error) {
    console.error('Error serving index.html with custom metadata:', error);
    res.sendFile(indexPath);
  }
});

app.listen(port, () => {
  console.log(`Instituto Sentidos API rodando na porta ${port}`);
});
