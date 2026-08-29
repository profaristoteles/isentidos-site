import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { seedCourses, seedPosts } from '../server/seed-data.js';

const prisma = new PrismaClient();

const seedEbooks = [
  {
    title: 'Anais do Congresso Maranhense de Educação Especial e Inclusiva — CMEEI',
    description: 'Registro científico completo das apresentações e trabalhos do I CMEEI, II CCEEI e I CEEI, reunindo pesquisas e práticas de referência nacional em educação inclusiva.',
    category: 'Anais de Eventos',
    coverUrl: 'https://isentidos.com.br/wp-content/uploads/2024/10/7-1024x1024.png',
    mauticFormId: 7,
    pages: '320 páginas',
    year: '2024',
    position: 0,
    isActive: true,
  },
  {
    title: 'Anais do Congresso Nacional OnLine de Educação Inclusiva — CONEI',
    description: 'Coletânea de artigos, resumos e relatos de experiência do I CONEI, com produções de pesquisadores e professores de todo o Brasil sobre educação inclusiva.',
    category: 'Anais de Eventos',
    coverUrl: 'https://isentidos.com.br/wp-content/uploads/2024/10/6-1024x1024.png',
    mauticFormId: 7,
    pages: '280 páginas',
    year: '2024',
    position: 1,
    isActive: true,
  },
  {
    title: 'Aplicação do Processo de Enfermagem a Pessoas no Espectro Autista',
    description: 'Guia prático para instrumentalizar Enfermeiros(as) no cuidado humanizado e especializado a pessoas com TEA, com protocolos e abordagens validadas.',
    category: 'Livro Digital',
    coverUrl: 'https://isentidos.com.br/wp-content/uploads/2024/10/8-1024x1024.png',
    mauticFormId: 9,
    pages: '156 páginas',
    year: '2024',
    position: 2,
    isActive: true,
  },
  {
    title: 'Transtorno do Espectro Autista: uma parte de mim, não o todo',
    description: 'Abordagem biopsicossocioeducacional e em saúde para o acompanhamento de pessoas com TEA. Uma visão integral e humanizada sobre o espectro autista além do diagnóstico.',
    category: 'Livro Digital',
    coverUrl: 'https://isentidos.com.br/wp-content/uploads/2024/10/10-1024x1024.png',
    mauticFormId: 6,
    pages: '184 páginas',
    year: '2024',
    position: 3,
    isActive: true,
  },
  {
    title: 'Caminhos da Qualidade de Vida: estimulando a interação social e independência de pessoas no Espectro Autista',
    description: 'Cartilha prática com estratégias acessíveis para famílias, educadores e cuidadores que desejam promover autonomia, interação social e qualidade de vida para pessoas com TEA.',
    category: 'Livro Digital',
    coverUrl: 'https://isentidos.com.br/wp-content/uploads/2024/10/9-1024x1024.png',
    mauticFormId: 3,
    pages: '96 páginas',
    year: '2024',
    position: 4,
    isActive: true,
  },
];

async function main() {
  // Safety check: check if any real data already exists in key tables
  const hasUsers = await prisma.user.count() > 0;
  const hasCourses = await prisma.course.count() > 0;
  const hasBanners = await prisma.banner.count() > 0;
  const hasPosts = await prisma.blogPost.count() > 0;
  const hasEvents = await prisma.event.count() > 0;
  const hasEbooks = await prisma.ebook.count() > 0;
  const hasSettings = await prisma.systemSetting.findUnique({ where: { id: 'default' } }) !== null;

  if (hasUsers || hasCourses || hasBanners || hasPosts || hasEvents || hasEbooks || hasSettings) {
    console.log('Aviso: Registros existentes encontrados no banco de dados. Ignorando a execução do seed para evitar a perda ou sobrescrita de dados.');
    return;
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? 'isentidosedu@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';

  const adminExists = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!adminExists) {
    await prisma.user.create({
      data: {
        name: 'Administrador Instituto Sentidos',
        email: adminEmail,
        role: 'admin',
        passwordHash: await bcrypt.hash(adminPassword, 12),
      },
    });
    console.log('Usuário admin inicial criado.');
  }

  const courseCount = await prisma.course.count();
  if (courseCount === 0) {
    for (const course of seedCourses) {
      await prisma.course.create({
        data: course as any,
      });
    }
    console.log('Cursos padrão criados.');
  } else {
    console.log('Banco já possui cursos. Pulando seed de cursos.');
  }

  const postCount = await prisma.blogPost.count();
  if (postCount === 0) {
    for (const post of seedPosts) {
      await prisma.blogPost.create({
        data: { ...post, publishedAt: post.isPublished ? new Date() : null } as any,
      });
    }
    console.log('Posts de blog padrão criados.');
  } else {
    console.log('Banco já possui posts de blog. Pulando seed de posts.');
  }


  // Seed e-books
  const ebookCount = await prisma.ebook.count();
  if (ebookCount === 0) {
    for (const ebook of seedEbooks) {
      await prisma.ebook.create({ data: ebook });
    }
    console.log('E-books reais do Instituto Sentidos criados.');
  }

  await prisma.referralSettings.upsert({
    where: { id: 'default' },
    update: {
      rewardType: 'pix',
      pixRewardByCategory: {
        livre: 50,
        preparatorio: 50,
        pos_presencial: 50,
        pos_online: 50,
        mestrado_ead: 50,
        doutorado_ead: 50,
        supletivo_eja: 50,
      },
      monthlyPixCap: 1000,
      eligibleCourseTypes: ['livre', 'preparatorio', 'pos_presencial', 'pos_online', 'mestrado_ead', 'doutorado_ead', 'supletivo_eja'],
    },
    create: {
      id: 'default',
      isActive: true,
      rewardType: 'pix',
      pixRewardByCategory: {
        livre: 50,
        preparatorio: 50,
        pos_presencial: 50,
        pos_online: 50,
        mestrado_ead: 50,
        doutorado_ead: 50,
        supletivo_eja: 50,
      },
      monthlyPixCap: 1000,
      discountType: 'percent',
      discountValue: 10,
      maxDiscountPercent: 50,
      isCumulative: true,
      eligibleCourseTypes: ['livre', 'preparatorio', 'pos_presencial', 'pos_online', 'mestrado_ead', 'doutorado_ead', 'supletivo_eja'],
      autoApprove: false,
      linkExpiryDays: null,
    },
  });

  await prisma.systemSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      domain: 'isentidos.com.br',
      whatsapp: '(99) 3199-93940',
      siteName: 'Instituto Sentidos',
      activeAiProvider: 'local',
    },
  });

  // Seed menu items
  const menuCount = await prisma.menuItem.count();
  if (menuCount === 0) {
    const defaultMenus = [
      { label: 'Cursos', href: '/cursos', position: 1, isButton: false, isActive: true },
      { label: 'Blog', href: '/blog', position: 2, isButton: false, isActive: true },
      { label: 'E-books', href: '/ebooks', position: 3, isButton: false, isActive: true },
      { label: 'Eventos', href: '/#eventos', position: 4, isButton: false, isActive: true },
      { label: 'Contato', href: '/#contato', position: 5, isButton: false, isActive: true },
      { label: 'WhatsApp', href: 'https://wa.me/5599319993940', position: 6, isButton: true, isActive: true },
    ];
    for (const menu of defaultMenus) {
      await prisma.menuItem.create({ data: menu });
    }
    console.log('Menu items criados.');
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Seed do Instituto Sentidos concluído.');
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
