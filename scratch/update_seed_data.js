import fs from 'fs';
import path from 'path';

const scrapedPath = path.resolve('scratch/scraped_courses.json');
const outputPath = path.resolve('server/seed-data.ts');

if (!fs.existsSync(scrapedPath)) {
  console.error('Arquivo scraped_courses.json não encontrado!');
  process.exit(1);
}

const scrapedCourses = JSON.parse(fs.readFileSync(scrapedPath, 'utf-8'));

// Mapeamento dos cursos para incluir campos de parcelamento e taxa de matricula
const mappedCourses = scrapedCourses.map(c => {
  const isPos = c.type && (c.type.startsWith('pos_') || c.type === 'pos_online' || c.type === 'pos_presencial');
  const enrollmentFee = isPos ? 50 : 0;
  
  let installmentValue = 0;
  if (c.price && c.maxInstallments && c.maxInstallments > 0) {
    installmentValue = Math.round((c.price / c.maxInstallments) * 100) / 100;
  }

  // Sanitiza a descrição para o banco (remove quebras de linha excessivas e html curto)
  const description = c.description ? c.description.replace(/<\/?[^>]+(>|$)/g, "").substring(0, 500).trim() + "..." : "";

  return {
    title: c.title,
    slug: c.slug,
    description: description || c.title,
    syllabus: c.syllabus || null,
    about: c.about || null,
    type: c.type || 'pos_online',
    modality: c.modality || 'online_ao_vivo',
    workload: c.workload || '360h',
    price: c.price || 0,
    maxInstallments: c.maxInstallments || 1,
    enrollmentFee: enrollmentFee,
    installmentValue: installmentValue,
    area: c.area || 'Geral',
    partnerInstitution: c.partnerInstitution || 'FAEPI',
    isFeatured: c.isFeatured || false,
    modules: c.modules || [] // Salva o array de objetos JSON direto
  };
});

const seedLeads = [
  {
    name: 'Ana Clara Mendes',
    email: 'ana.clara@example.com',
    phone: '(99) 98888-1020',
    source: 'site',
    status: 'novo',
    notes: 'Interessada em pós online ao vivo.',
    consentLgpd: true,
  },
  {
    name: 'João Lima',
    email: 'joao.lima@example.com',
    phone: '(99) 97777-2040',
    source: 'whatsapp',
    status: 'em_atendimento',
    notes: 'Quer turma presencial aos sábados.',
    consentLgpd: true,
  },
  {
    name: 'Renata Alves',
    email: 'renata.alves@example.com',
    phone: '(99) 96666-3090',
    source: 'indicacao',
    status: 'matriculado',
    referralCode: 'MARIA123',
    notes: 'Convertida via indicação.',
    consentLgpd: true,
  },
];

const seedPosts = [
  {
    title: 'Educação Inclusiva: Práticas para a Sala de Aula',
    slug: 'educacao-inclusiva-praticas-sala-aula',
    excerpt: 'Descubra como adaptar materiais e o planejamento pedagógico para acolher alunos com necessidades especiais de forma efetiva.',
    content: '<p>A educação inclusiva não é apenas uma diretriz escolar, mas uma transformação profunda na forma como enxergamos a diversidade em sala de aula.</p><h2>O Papel do Professor</h2><p>O educador é o principal agente de mudança. Ele precisa de suporte, formação continuada e empatia para identificar o potencial de cada aluno, seja ele neurodivergente, com deficiência ou superdotação.</p><h3>Estratégias Práticas</h3><ul><li>Uso de recursos visuais (pictogramas e mapas mentais).</li><li>Flexibilização do tempo de avaliação.</li><li>Ambientes com menos estímulos sensoriais disruptivos.</li></ul><p>O Instituto Sentidos oferece pós-graduação em Educação Especial focada em construir escolas mais humanizadas.</p>',
    category: 'Inclusão',
    tags: ['Educação Especial', 'Práticas Pedagógicas', 'Inclusão', 'Neurodiversidade'],
    coverImageUrl: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1200&q=80',
    isPublished: true,
  },
  {
    title: 'Autismo e ABA: O que todo educador precisa saber',
    slug: 'autismo-e-aba-o-que-educador-precisa-saber',
    excerpt: 'Compreenda os fundamentos da Análise do Comportamento Aplicada (ABA) e como ela ajuda a estruturar o aprendizado de alunos autistas.',
    content: '<p>O Transtorno do Espectro Autista (TEA) apresenta desafios e habilidades únicas. A Análise do Comportamento Aplicada (ABA) é uma ciência baseada em evidências que busca melhorar comportamentos socialmente relevantes.</p><h2>Aplicações da ABA</h2><p>No ambiente escolar, a terapia ABA não visa "corrigir" a criança, mas ensinar novas habilidades através de reforço positivo, permitindo autonomia e participação social.</p><h3>Dicas de Ouro</h3><ul><li>Identifique o que motiva a criança (reforçadores).</li><li>Divida tarefas complexas em etapas simples.</li><li>Comemore pequenos progressos.</li></ul><p>Profissionais com qualificação em ABA estão entre os mais procurados no Brasil para atendimento multidisciplinar.</p>',
    category: 'Autismo',
    tags: ['Autismo', 'ABA', 'Educação Inclusiva', 'Comportamento'],
    coverImageUrl: 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?auto=format&fit=crop&w=1200&q=80',
    isPublished: true,
  },
  {
    title: 'Pós-graduação EaD vs Presencial: Como Escolher?',
    slug: 'pos-graduacao-ead-vs-presencial',
    excerpt: 'Entenda os prós e contras das modalidades online e presencial e escolha a melhor trilha para decolar na sua carreira acadêmica.',
    content: '<p>Decidir entre a educação à distância (EaD) e o ensino presencial pode ser um dilema para muitos profissionais. Ambos os formatos possuem méritos inegáveis, mas atendem a diferentes perfis de rotina e aprendizado.</p><h2>A Força do EaD</h2><p>A modalidade EaD do Instituto Sentidos proporciona flexibilidade total e economia de tempo com deslocamentos, sendo a escolha número um de profissionais que já atuam em jornada dupla.</p><h2>O Valor do Presencial</h2><p>Se o contato humano, o networking físico e as trocas imediatas de experiência são cruciais para você, o presencial ou as aulas "online ao vivo" garantem um senso de comunidade inigualável.</p><p>Explore nossa vitrine de cursos e converse com um de nossos consultores para guiar sua escolha.</p>',
    category: 'Carreira',
    tags: ['Pós-graduação', 'EaD', 'Carreira Acadêmica', 'Ensino Presencial'],
    coverImageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
    isPublished: true,
  },
  {
    title: 'A Importância da LIBRAS na Escola Regular',
    slug: 'importancia-libras-escola-regular',
    excerpt: 'Quebrando as barreiras de comunicação: por que todos os educadores deveriam ter noções de Língua Brasileira de Sinais.',
    content: '<p>A Língua Brasileira de Sinais (LIBRAS) é a segunda língua oficial do Brasil, mas ainda é uma barreira em grande parte das escolas regulares.</p><h2>Mais que Inclusão: Um Direito</h2><p>Estudantes surdos têm o direito a aprender e a se comunicar livremente em sua língua materna. Quando o professor domina o básico da LIBRAS, ele cria uma ponte de pertencimento.</p><h3>Os Primeiros Sinais</h3><p>Cumprimentos simples ("Bom dia", "Tudo bem?") e instruções corriqueiras transformam o clima de sala de aula. É uma habilidade rápida de desenvolver e com imenso impacto humano.</p><p>Nossos cursos livres de LIBRAS estão com matrículas abertas.</p>',
    category: 'Inclusão',
    tags: ['LIBRAS', 'Acessibilidade', 'Inclusão Escolar', 'Comunicação'],
    coverImageUrl: 'https://images.unsplash.com/photo-1517594422361-5e18d418c650?auto=format&fit=crop&w=1200&q=80',
    isPublished: true,
  }
];

const tsContent = `export const seedCourses = ${JSON.stringify(mappedCourses, null, 2)};

export const seedLeads = ${JSON.stringify(seedLeads, null, 2)};

export const seedPosts = ${JSON.stringify(seedPosts, null, 2)};
`;

fs.writeFileSync(outputPath, tsContent, 'utf-8');
console.log('Arquivo server/seed-data.ts gerado com sucesso com os dados raspados ricos!');
