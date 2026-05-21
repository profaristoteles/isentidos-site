async function run() {
  try {
    const urls = [
      'https://isentidos.com.br/pre-matricula-pos-graduacao-online/',
      'https://isentidos.com.br/pre-matricula-pos-graduacao-presencial/'
    ];
    for (const url of urls) {
      console.log('Fetching', url);
      const res = await fetch(url);
      const html = await res.text();
      console.log('HTML length:', html.length);
      
      // Look for iframes or script embeds
      const regex = /<iframe[^>]*src="[^"]*(?:leadconnector|ghl|msgsndr)[^"]*"[^>]*>|<\/iframe>|<script[^>]*src="[^"]*(?:leadconnector|ghl|msgsndr)[^"]*"[^>]*>|window\.location\.href|form/gi;
      let match;
      console.log('--- Search Results for', url, '---');
      // Let's search for leadconnector, msgsndr, or iframe in the html
      const matches = html.match(/<iframe[^>]*>/gi) || [];
      console.log('Total iframes found:', matches.length);
      for (const m of matches) {
        if (m.includes('leadconnector') || m.includes('msgsndr') || m.includes('ghl')) {
          console.log('Found GHL iframe:', m);
        } else {
          console.log('Other iframe:', m);
        }
      }
      
      const scriptMatches = html.match(/<script[^>]*>[^]*?<\/script>/gi) || [];
      for (const s of scriptMatches) {
        if (s.includes('leadconnector') || s.includes('msgsndr') || s.includes('ghl')) {
          console.log('Found GHL script embed:', s);
        }
      }
    }
  } catch (err) {
    console.error(err);
  }
}

run();
