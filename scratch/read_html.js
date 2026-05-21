import fs from 'fs';

const filePath = 'scratch/course.html';
let content = fs.readFileSync(filePath, 'utf8');

// Remove scripts, style tags, and head
content = content.replace(/<head>[\s\S]*?<\/head>/gi, '');
content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
content = content.replace(/<style[\s\S]*?<\/style>/gi, '');
content = content.replace(/<svg[\s\S]*?<\/svg>/gi, '');

// Strip html tags
const text = content.replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n').trim();
fs.writeFileSync('scratch/text.txt', text);
console.log('Done!');
