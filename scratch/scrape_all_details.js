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

function extractTabContent(html, tabNum) {
  const tagRegex = new RegExp(`<div[^>]*?class="[^"]*?elementor-tab-content[^"]*?"[^>]*?data-tab="${tabNum}"[^>]*?>`, 'i');
  let match = html.match(tagRegex);
  
  if (!match) {
    const tagRegexAlt = new RegExp(`<div[^>]*?data-tab="${tabNum}"[^>]*?class="[^"]*?elementor-tab-content[^"]*?"[^>]*?>`, 'i');
    match = html.match(tagRegexAlt);
  }
  
  if (!match) return '';

  const startDivIdx = match.index;
  const tagContentStart = startDivIdx + match[0].length;
  
  let pos = tagContentStart;
  let depth = 1;
  while (depth > 0 && pos < html.length) {
    const nextClose = html.indexOf('</div>', pos);
    const nextOpen = html.indexOf('<div', pos);
    if (nextClose === -1) break;
    
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + 4;
    } else {
      depth--;
      pos = nextClose + 6;
    }
  }
  
  const tagContentEnd = pos - 6;
  return html.substring(tagContentStart, tagContentEnd).trim();
}

function parseModulesTable(tableHtml) {
  const modules = [];
  const rowRegex = /<tr[^>]*?>([\s\S]*?)<\/tr>/gi;
  
  let rowMatch;
  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const rowContent = rowMatch[1];
    const cells = [];
    const cellRegex = /<td[^>]*?>([\s\S]*?)<\/td>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      let text = cellMatch[1]
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      cells.push(cleanHtmlEntities(text));
    }
    
    if (cells.length >= 2) {
      let title = '';
      let workload = '';
      
      if (cells.length >= 3) {
        title = cells[1];
        workload = cells[2];
      } else {
        title = cells[0];
        workload = cells[1];
      }
      
      const isHeader = title.toLowerCase().includes('disciplina') || 
                       title.toLowerCase().includes('c/h') ||
                       workload.toLowerCase().includes('disciplina') ||
                       title.trim() === '' ||
                       workload.trim() === '' ||
                       title.toLowerCase().includes('nº') ||
                       title.toLowerCase().includes('carga horaria');
      
      if (!isHeader && title.length > 3) {
        modules.push({
          title: title,
          description: workload
        });
      }
    }
  }
  return modules;
}

function parseCourse(html, url, type) {
  let titleMatch = html.match(/<title>(.*?)<\/title>/i);
  let title = titleMatch ? titleMatch[1].replace(/\s*&#8211;\s*Instituto Sentidos/i, '').trim() : '';
  title = title.replace(/\s*\(Ao Vivo\)/i, '').replace(/\s*\(Presencial\)/i, '').trim();
  title = cleanHtmlEntities(title);
  
  const slug = url.split('/cursos/')[1].replace('/', '');

  const aboutHtml = extractTabContent(html, 1);
  let description = aboutHtml
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (description.length > 250) {
    description = description.substring(0, 247) + '...';
  }
  
  const modulesHtml = extractTabContent(html, 2);
  const modules = parseModulesTable(modulesHtml);
  
  const syllabusHtml = extractTabContent(html, 3);

  // Workload
  let workload = '360h';
  const wlMatch = aboutHtml.match(/totalizando\s+(\d+)\s*(h|h\/a|horas)/i) || 
                  syllabusHtml.match(/totalizando\s+(\d+)\s*(h|h\/a|horas)/i) ||
                  html.match(/totalizando\s+(\d+)\s*(h|h\/a|horas)/i);
  if (wlMatch) {
    workload = wlMatch[1] + 'h';
  } else {
    const matchCH = modulesHtml.match(/CARGA HORARIA TOTAL\s*<\/td>\s*<td[^>]*?>\s*([\d\s]+)\s*H/i) ||
                    modulesHtml.match(/TOTAL\s*<\/td>\s*<td[^>]*?>\s*([\d\s]+)\s*H/i) ||
                    html.match(/(\d+)\s*(h|h\/a|horas)\s*de\s*carga/i);
    if (matchCH) {
      workload = matchCH[1].trim() + 'h';
    }
  }

  // Investment
  let price = 1800;
  if (type === 'pos_online') price = 1680;
  let maxInstallments = 12;

  const priceMatch = syllabusHtml.match(/(\d+)\s*X\s*R\$\s*([\d,.]+)/i) || html.match(/(\d+)\s*X\s*R\$\s*([\d,.]+)/i);
  if (priceMatch) {
    maxInstallments = parseInt(priceMatch[1], 10);
    const instVal = parseFloat(priceMatch[2].replace('.', '').replace(',', '.'));
    price = maxInstallments * instVal;
  }

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
    about: cleanHtmlEntities(aboutHtml),
    syllabus: cleanHtmlEntities(syllabusHtml),
    modules: modules,
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
      console.log(`Parsed: ${parsed.title} | Slug: ${parsed.slug} | Price: ${parsed.price} | WL: ${parsed.workload} | Modules count: ${parsed.modules.length}`);
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
      console.log(`Parsed: ${parsed.title} | Slug: ${parsed.slug} | Price: ${parsed.price} | WL: ${parsed.workload} | Modules count: ${parsed.modules.length}`);
      result.push(parsed);
    } catch (err) {
      console.error(`Error on ${url}:`, err.message);
    }
  }

  const finalSeedCourses = [
    ...result,
    {
      title: 'LIBRAS Iniciante',
      slug: 'libras-iniciante',
      description: 'Curso introdutório para comunicação em Língua Brasileira de Sinais no atendimento, sala de aula e rotina institucional.',
      about: '<p>Curso introdutório para comunicação em Língua Brasileira de Sinais no atendimento, sala de aula e rotina institucional.</p>',
      syllabus: '<p><strong>AULAS</strong><br/>Aos sábados, quinzenalmente.<br/><strong>INVESTIMENTO</strong><br/>Matrícula de R$ 50,00 e mensalidades facilitadas.</p>',
      modules: [
        { title: 'Introdução à Libras e Cultura Surda', description: '20h' },
        { title: 'Vocabulário e Estrutura Gramatical Básica', description: '20h' },
        { title: 'Prática de Sinais e Diálogos do Cotidiano', description: '20h' }
      ],
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
      about: '<p>Programa de mestrado internacional em parceria com a Ivy Enber University, oferecendo formação acadêmica flexível de alto nível.</p>',
      syllabus: '<p><strong>CERTIFICADO</strong><br/>Emitido por Ivy Enber University com assessoria de validação internacional.<br/><strong>DOCUMENTOS NECESSÁRIOS</strong><br/>Diploma de Graduação, Histórico Escolar, Currículo Lattes e Documentos Pessoais.</p>',
      modules: [
        { title: 'Metodologia da Pesquisa Científica', description: '60h' },
        { title: 'Epistemologia da Educação', description: '60h' },
        { title: 'Seminários de Orientação de Dissertação', description: '120h' }
      ],
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
