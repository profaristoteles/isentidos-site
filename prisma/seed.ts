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
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@isentidos.com.br';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: 'admin' },
    create: {
      name: 'Administrador Instituto Sentidos',
      email: adminEmail,
      role: 'admin',
      passwordHash: await bcrypt.hash(adminPassword, 12),
    },
  });

  for (const course of seedCourses) {
    await prisma.course.upsert({
      where: { slug: course.slug },
      update: course,
      create: course,
    });
  }

  for (const post of seedPosts) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: { ...post, publishedAt: post.isPublished ? new Date() : null },
      create: { ...post, publishedAt: post.isPublished ? new Date() : null },
    });
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
    update: {},
    create: {
      id: 'default',
      isActive: true,
      discountType: 'percent',
      discountValue: 10,
      maxDiscountPercent: 50,
      isCumulative: true,
      eligibleCourseTypes: ['pos_presencial', 'pos_online'],
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
