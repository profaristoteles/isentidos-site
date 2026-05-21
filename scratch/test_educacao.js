import https from 'https';

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

async function test() {
  const html = await fetchUrl('https://isentidos.com.br/cursos/educacao-especial-inclusiva-2/');
  
  for (let i = 1; i <= 4; i++) {
    const content = extractTabContent(html, i);
    console.log(`Tab ${i} Content Length:`, content.length);
    console.log(`Tab ${i} Content Snippet:`, content.substring(0, 300));
    console.log('------------------------------------------------------');
  }
}
test();
