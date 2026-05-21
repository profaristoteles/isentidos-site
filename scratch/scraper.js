import fs from 'fs';
import https from 'https';

const urls = {
  pos_online: [
    'https://isentidos.com.br/cursos/psicopedagogia-clinica-e-institucional-2/',
    'https://isentidos.com.br/cursos/educacao-especial-inclusiva-2/',
    'https://isentidos.com.br/cursos/deficiencia-visual-com-enfase-em-sistema-braille/',
    'https://isentidos.com.br/cursos/pos-graduacao-em-atendimento-educacional-especializado-aee-2/',
    'https://isentidos.com.br/cursos/pos-graduacao-em-neuropsicopedagogia-clinica-3/',
    'https://isentidos.com.br/cursos/pos-graduacao-em-educacao-infantil-e-anos-iniciais-do-ensino-fundamental-2/',
    'https://isentidos.com.br/cursos/pos-graduacao-em-gestao-coordenacao-supervisao-e-orientacao-escolar-2/'
  ],
  pos_presencial: [
    'https://isentidos.com.br/cursos/educacao-fisica-escolar/',
    'https://isentidos.com.br/cursos/pos-graduacao-em-gestao-coordenacao-supervisao-e-orientacao-escolar/',
    'https://isentidos.com.br/cursos/educacao-especial-inclusiva/',
    'https://isentidos.com.br/cursos/pos-graduacao-em-alfabetizacao-e-letramento/',
    'https://isentidos.com.br/cursos/psicopedagogia-clinica-e-institucional/',
    'https://isentidos.com.br/cursos/pos-graduacao-em-atendimento-educacional-especializado-aee/',
    'https://isentidos.com.br/cursos/pos-graduacao-em-neuropsicopedagogia-clinica-2/',
    'https://isentidos.com.br/cursos/pos-graduacao-em-analise-do-comportamento-aplicada-ao-autismo/',
    'https://isentidos.com.br/cursos/pos-graduacao-em-educacao-infantil-e-anos-iniciais-do-ensino-fundamental/'
  ]
};

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function cleanHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#038;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function parseCourse(html, url, type) {
  // Title
  let titleMatch = html.match(/<title>(.*?)<\/title>/i);
  let title = titleMatch ? titleMatch[1].replace(/\s*&#8211;\s*Instituto Sentidos/i, '').trim() : '';
  title = title.replace(/\s*\(Ao Vivo\)/i, '').replace(/\s*\(Presencial\)/i, '').trim();
  title = cleanHtmlEntities(title);
  
  // Extract slug from URL
  const slug = url.split('/cursos/')[1].replace('/', '');

  // Extract presentation text (Apresentação)
  let description = '';
  // Let's strip HTML tags inside body to search easily
  const bodyMatch = html.match(/<body[\s\S]*?<\/body>/i);
  const bodyText = bodyMatch ? bodyMatch[0].replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '') : html;
  const cleanText = bodyText.replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n');

  // Let's find "Apresentação"
  const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Find all indices matching "Apresentação" case-insensitively
  const presentationIndices = [];
  lines.forEach((l, idx) => {
    if (l.toLowerCase() === 'apresentação') {
      presentationIndices.push(idx);
    }
  });

  // Find the index that is followed by the actual description paragraph (not just tab headers)
  for (const idx of presentationIndices) {
    let candidate = lines[idx + 1] || '';
    if (candidate.length < 100 && lines[idx + 2]) {
      candidate = lines[idx + 2];
    }
    // Ensure it's not a tab title, doesn't contain "/" and is reasonably long
    if (
      candidate.length > 80 &&
      !candidate.includes('/') &&
      !candidate.toLowerCase().includes('perguntas') &&
      !candidate.toLowerCase().includes('informações')
    ) {
      description = cleanHtmlEntities(candidate);
      break;
    }
  }

  // Workload
  let workload = '360h'; // default fallback
  const workloadLine = lines.find(l => l.toLowerCase().includes('carga-horária') || l.toLowerCase().includes('carga horária') || l.toLowerCase().includes('c/h'));
  if (workloadLine) {
    const wlMatch = workloadLine.match(/(\d+)\s*(h|h\/a|horas)/i);
    if (wlMatch) {
      workload = wlMatch[1] + 'h';
    } else {
      // check neighboring lines
      const wlIdx = lines.indexOf(workloadLine);
      if (wlIdx !== -1 && lines[wlIdx + 1]) {
        const nextWlMatch = lines[wlIdx + 1].match(/(\d+)\s*(h|h\/a|horas)/i);
        if (nextWlMatch) workload = nextWlMatch[1] + 'h';
      }
    }
  }
  // Try to find totalizing in other lines
  const totalizingLine = lines.find(l => l.toLowerCase().includes('totalizando'));
  if (totalizingLine) {
    const totMatch = totalizingLine.match(/totalizando\s+(\d+)\s*(h|h\/a|horas)/i);
    if (totMatch) workload = totMatch[1] + 'h';
  }

  // Investment
  let price = 1800; // default pos_presencial default
  if (type === 'pos_online') price = 1680; // default pos_online default
  let maxInstallments = 12;

  const investLineIdx = lines.findIndex(l => l.toLowerCase().includes('investimento'));
  if (investLineIdx !== -1) {
    // Check next few lines for price info like "12 X R$200,00" or similar
    for (let i = 1; i <= 5; i++) {
      const line = lines[investLineIdx + i];
      if (!line) continue;
      const priceMatch = line.match(/(\d+)\s*X\s*R\$\s*([\d,.]+)/i);
      if (priceMatch) {
        maxInstallments = parseInt(priceMatch[1], 10);
        const instVal = parseFloat(priceMatch[2].replace('.', '').replace(',', '.'));
        price = maxInstallments * instVal;
        break;
      }
      const singlePriceMatch = line.match(/R\$\s*([\d,.]+)/i);
      if (singlePriceMatch && !line.includes('X')) {
        // Maybe total price
        const val = parseFloat(singlePriceMatch[1].replace('.', '').replace(',', '.'));
        if (val > 500) {
          price = val;
        }
      }
    }
  }

  // Area
  let area = 'Educação';
  if (title.toLowerCase().includes('neuropsico') || title.toLowerCase().includes('autismo') || title.toLowerCase().includes('psicopedagogia')) {
    area = 'Saúde e Educação';
  } else if (title.toLowerCase().includes('educação física')) {
    area = 'Educação e Educação Física';
  }

  return {
    title,
    slug,
    description: description || `Especialização em ${title} voltada para capacitação e aperfeiçoamento profissional.`,
    type,
    modality: type === 'pos_online' ? 'online_ao_vivo' : 'presencial',
    workload,
    price,
    maxInstallments,
    area,
    partnerInstitution: 'FAEPI',
    isFeatured: true
  };
}

async function start() {
  const result = [];
  
  console.log('Starting fetch for Pós Online (Ao Vivo)...');
  for (const url of urls.pos_online) {
    try {
      console.log(`Fetching ${url}...`);
      const html = await fetchUrl(url);
      const parsed = parseCourse(html, url, 'pos_online');
      console.log(`Parsed: ${parsed.title} | Slug: ${parsed.slug} | Price: ${parsed.price} | WL: ${parsed.workload}`);
      result.push(parsed);
    } catch (err) {
      console.error(`Error on ${url}:`, err.message);
    }
  }

  console.log('\nStarting fetch for Pós Presenciais...');
  for (const url of urls.pos_presencial) {
    try {
      console.log(`Fetching ${url}...`);
      const html = await fetchUrl(url);
      const parsed = parseCourse(html, url, 'pos_presencial');
      console.log(`Parsed: ${parsed.title} | Slug: ${parsed.slug} | Price: ${parsed.price} | WL: ${parsed.workload}`);
      result.push(parsed);
    } catch (err) {
      console.error(`Error on ${url}:`, err.message);
    }
  }

  // Also include the Mestrado and Libras from existing seed data if we want
  const finalSeedCourses = [
    ...result,
    {
      title: 'LIBRAS Iniciante',
      slug: 'libras-iniciante',
      description: 'Curso introdutório para comunicação em Língua Brasileira de Sinais no atendimento, sala de aula e rotina institucional.',
      type: 'livre',
      modality: 'presencial',
      workload: '60h',
      price: 97,
      maxInstallments: 1,
      area: 'Inclusão',
      partnerInstitution: 'Instituto Sentidos',
      isFeatured: false
    },
    {
      title: 'Mestrado em Ciências da Educação',
      slug: 'mestrado-ciencias-educacao',
      description: 'Programa internacional para profissionais que buscam titulação acadêmica com orientação consultiva do Instituto Sentidos.',
      type: 'internacional',
      modality: 'internacional',
      workload: '24 meses',
      price: 0,
      maxInstallments: 1,
      area: 'Educação',
      partnerInstitution: 'Ivy Enber University',
      isFeatured: true
    }
  ];

  fs.writeFileSync('scratch/scraped_courses.json', JSON.stringify(finalSeedCourses, null, 2));
  console.log('\nSaved scraped courses to scratch/scraped_courses.json!');
}

start();
