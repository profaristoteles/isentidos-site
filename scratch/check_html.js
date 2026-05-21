import fs from 'fs';
const html = fs.readFileSync('scratch/course.html', 'utf8');

// Find all matches of elementor-tab-content
// e.g. <div id="elementor-tab-content-9081" class="elementor-tab-content elementor-clearfix" data-tab="1" role="tabpanel" aria-labelledby="elementor-tab-title-9081">...</div>
const tabContentRegex = /<div\s+[^>]*?class="[^"]*?elementor-tab-content[^"]*?"[^>]*?>([\s\S]*?)<\/div>/gi;

let match;
let count = 1;
while ((match = tabContentRegex.exec(html)) !== null) {
  console.log(`--- MATCH ${count} ---`);
  const fullTag = match[0];
  const innerContent = match[1];
  console.log('Full Tag start:', fullTag.substring(0, 150));
  console.log('Inner content length:', innerContent.length);
  console.log('Inner content snippet:', innerContent.substring(0, 300));
  count++;
}
