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
import { seedCourses, seedLeads, seedPosts } from './seed-data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT ?? 4000);
const jwtSecret = process.env.JWT_SECRET ?? 'dev-only-change-me';
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

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const courseSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3),
  description: z.string().min(10),
  type: z.enum([
    'livre',
    'pos_presencial',
    'pos_online',
    'mestrado_ead',
    'doutorado_ead',
    'evento_presencial',
    'evento_online',
    'preparatorio',
    'internacional',
  ]),
  modality: z.enum(['presencial', 'online_ao_vivo', 'ead', 'internacional']),
  workload: z.string().min(2),
  price: z.number().min(0),
  maxInstallments: z.number().int().min(1).max(36),
  enrollmentFee: z.number().min(0).optional(),
  installmentValue: z.number().min(0).optional(),
  area: z.string().min(2),
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
  leadConnectorFormId: z.string().optional(),
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
  modality: z.enum(['presencial', 'online_ao_vivo', 'ead', 'internacional']),
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

async function withDatabase<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.warn('[database:fallback]', error instanceof Error ? error.message : error);
    return fallback;
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
    updatedAt: new Date()
  });
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


function serializeCourse(course: any) {
  return {
    ...course,
    price: Number(course.price),
    enrollmentFee: Number(course.enrollmentFee || 0),
    installmentValue: Number(course.installmentValue || 0),
  };
}
app.get('/sitemap.xml', async (_req, res) => {
  const baseUrl = 'https://isentidos.com.br';

  const courses = await withDatabase(
    async () => {
      return await prisma.course.findMany({
        where: { isActive: true },
        select: { slug: true }
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

  const courseUrls = courses.map(c => ({
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
      return rows.map(serializeCourse);
    },
    seedCourses,
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

  if (!course) {
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
        banners,
        courses: courses.map(serializeCourse),
        posts,
        ebooks,
        events: events.map((event) => ({ ...event, price: Number(event.price) })),
        settings,
        menuItems,
      };
    },
    {
      banners: [],
      courses: seedCourses,
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

  res.status(201).json({ data: lead });
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

app.post('/api/admin/courses', authMiddleware, async (req, res) => {
  const parsed = courseSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: 'Curso invÃ¡lido.', details: parsed.error.flatten() });
  }

  const course = await prisma.course.upsert({
    where: { slug: parsed.data.slug },
    update: parsed.data,
    create: parsed.data,
  });

  res.status(201).json({ data: serializeCourse(course) });
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
    return res.status(400).json({ error: 'Banner invÃ¡lido.', details: parsed.error.flatten() });
  }

  const banner = await prisma.banner.create({ data: parsed.data });
  res.status(201).json({ data: banner });
});

app.post('/api/admin/blog-posts', authMiddleware, async (req, res) => {
  const parsed = blogPostSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: 'Post invÃ¡lido.', details: parsed.error.flatten() });
  }

  const post = await prisma.blogPost.upsert({
    where: { slug: parsed.data.slug },
    update: {
      ...parsed.data,
      publishedAt: parsed.data.isPublished ? new Date() : null,
    },
    create: {
      ...parsed.data,
      publishedAt: parsed.data.isPublished ? new Date() : null,
    },
  });

  res.status(201).json({ data: post });
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
    () => prisma.ebook.findMany({
      where: { isActive: true },
      orderBy: { position: 'asc' },
      select: { id: true, title: true, description: true, category: true, coverUrl: true, fileUrl: true, mauticFormId: true, pages: true, year: true },
    }),
    []
  );
  res.json({ data: ebooks });
});

app.get('/api/events', async (_req, res) => {
  const events = await withDatabase(
    () => prisma.event.findMany({
      where: { isActive: true },
      orderBy: { startsAt: 'asc' },
    }),
    []
  );
  res.json({ data: events.map((e) => ({ ...e, price: Number(e.price) })) });
});

app.post('/api/admin/ebooks', authMiddleware, async (req, res) => {
  const parsed = ebookSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'E-book invÃ¡lido.', details: parsed.error.flatten() });
  }
  const ebook = await prisma.ebook.create({ data: parsed.data });
  res.status(201).json({ data: ebook });
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
    return res.status(400).json({ error: 'Evento invÃ¡lido.', details: parsed.error.flatten() });
  }

  const event = await prisma.event.upsert({
    where: { slug: parsed.data.slug },
    update: {
      ...parsed.data,
      startsAt: parseLocalDate(parsed.data.startsAt),
    },
    create: {
      ...parsed.data,
      startsAt: parseLocalDate(parsed.data.startsAt),
    },
  });

  res.status(201).json({ data: { ...event, price: Number(event.price) } });
});

// â”€â”€ Admin list endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

app.get('/api/admin/banners', authMiddleware, async (_req, res) => {
  const banners = await withDatabase(() => prisma.banner.findMany({ orderBy: { sortOrder: 'asc' } }), []);
  res.json({ data: banners });
});

app.get('/api/admin/courses', authMiddleware, async (_req, res) => {
  const courses = await withDatabase(async () => (await prisma.course.findMany({ orderBy: { title: 'asc' } })).map(serializeCourse), seedCourses);
  res.json({ data: courses });
});

app.get('/api/admin/blog-posts', authMiddleware, async (_req, res) => {
  const posts = await withDatabase(() => prisma.blogPost.findMany({ orderBy: { publishedAt: 'desc' } }), []);
  res.json({ data: posts });
});

app.get('/api/admin/ebooks', authMiddleware, async (_req, res) => {
  const ebooks = await withDatabase(
    () => prisma.ebook.findMany({ orderBy: { position: 'asc' } }),
    []
  );
  res.json({ data: ebooks });
});

app.get('/api/admin/events', authMiddleware, async (_req, res) => {
  const events = await withDatabase(async () => (await prisma.event.findMany({ orderBy: { startsAt: 'asc' } })).map((e) => ({ ...e, price: Number(e.price) })), []);
  res.json({ data: events });
});

app.get('/api/admin/leads', authMiddleware, async (_req, res) => {
  const leads = await withDatabase(() => prisma.lead.findMany({ orderBy: { createdAt: 'desc' }, include: { course: true } }), seedLeads as any);
  res.json({ data: leads });
});

// â”€â”€ Admin update / delete â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

app.put('/api/admin/banners/:id', authMiddleware, async (req, res) => {
  const parsed = bannerSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados invÃ¡lidos.' });
  try {
    const banner = await prisma.banner.update({ where: { id: req.params.id }, data: parsed.data });
    res.json({ data: banner });
  } catch { res.status(404).json({ error: 'Banner nÃ£o encontrado.' }); }
});

app.delete('/api/admin/banners/:id', authMiddleware, async (req, res) => {
  try { await prisma.banner.delete({ where: { id: req.params.id } }); res.json({ ok: true }); }
  catch { res.status(404).json({ error: 'Banner nÃ£o encontrado.' }); }
});

app.put('/api/admin/courses/:id', authMiddleware, async (req, res) => {
  const parsed = courseSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados invÃ¡lidos.' });
  try {
    const course = await prisma.course.update({ where: { id: req.params.id }, data: parsed.data });
    res.json({ data: serializeCourse(course) });
  } catch { res.status(404).json({ error: 'Curso nÃ£o encontrado.' }); }
});

app.delete('/api/admin/courses/:id', authMiddleware, async (req, res) => {
  try {
    await prisma.course.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch { res.status(404).json({ error: 'Curso nÃ£o encontrado.' }); }
});

app.put('/api/admin/blog-posts/:id', authMiddleware, async (req, res) => {
  const parsed = blogPostSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados invÃ¡lidos.' });
  try {
    const post = await prisma.blogPost.update({
      where: { id: req.params.id },
      data: { ...parsed.data, publishedAt: parsed.data.isPublished ? new Date() : null },
    });
    res.json({ data: post });
  } catch { res.status(404).json({ error: 'Post nÃ£o encontrado.' }); }
});

app.delete('/api/admin/blog-posts/:id', authMiddleware, async (req, res) => {
  try { await prisma.blogPost.delete({ where: { id: req.params.id } }); res.json({ ok: true }); }
  catch { res.status(404).json({ error: 'Post nÃ£o encontrado.' }); }
});

app.put('/api/admin/ebooks/:id', authMiddleware, async (req, res) => {
  const parsed = ebookSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados invÃ¡lidos.', details: parsed.error.flatten() });
  try {
    const ebook = await prisma.ebook.update({ where: { id: req.params.id }, data: parsed.data });
    res.json({ data: ebook });
  } catch { res.status(404).json({ error: 'E-book nÃ£o encontrado.' }); }
});

app.delete('/api/admin/ebooks/:id', authMiddleware, async (req, res) => {
  try { await prisma.ebook.delete({ where: { id: req.params.id } }); res.json({ ok: true }); }
  catch { res.status(404).json({ error: 'E-book nÃ£o encontrado.' }); }
});

app.put('/api/admin/events/:id', authMiddleware, async (req, res) => {
  const parsed = eventSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados invÃ¡lidos.' });
  try {
    const ev = await prisma.event.update({
      where: { id: req.params.id },
      data: { ...parsed.data, startsAt: parsed.data.startsAt !== undefined ? parseLocalDate(parsed.data.startsAt) : undefined },
    });
    res.json({ data: { ...ev, price: Number(ev.price) } });
  } catch { res.status(404).json({ error: 'Evento nÃ£o encontrado.' }); }
});

app.delete('/api/admin/events/:id', authMiddleware, async (req, res) => {
  try { await prisma.event.delete({ where: { id: req.params.id } }); res.json({ ok: true }); }
  catch { res.status(404).json({ error: 'Evento nÃ£o encontrado.' }); }
});

app.put('/api/admin/leads/:id', authMiddleware, async (req, res) => {
  const schema = z.object({ status: z.enum(['novo', 'em_atendimento', 'matriculado', 'perdido']), notes: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados invÃ¡lidos.' });
  try {
    const lead = await prisma.lead.update({ where: { id: req.params.id }, data: parsed.data });
    res.json({ data: lead });
  } catch { res.status(404).json({ error: 'Lead nÃ£o encontrado.' }); }
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
          phone: parsed.data.phone,
          cpf: parsed.data.cpf,
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

  if (!result) return res.status(503).json({ error: 'Banco de dados indisponÃ­vel.' });
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
  if (!parsed.success) return res.status(400).json({ error: 'Dados invÃ¡lidos.', details: parsed.error.flatten() });

  const result = await withDatabase(async () => {
    const course = await prisma.course.findUnique({ where: { slug: req.params.slug } });
    if (!course) throw new Error('Curso nÃ£o encontrado');

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
    await prisma.referralCode.create({ data: { studentId: user.id, code } });

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
    await prisma.menuItem.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: 'Menu nÃ£o encontrado.' });
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
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(port, () => {
  console.log(`Instituto Sentidos API rodando na porta ${port}`);
});
