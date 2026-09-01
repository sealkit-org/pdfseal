import fs from 'fs';
import path from 'path';

function getVueFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) results = results.concat(getVueFiles(fullPath));
    else if (fullPath.endsWith('.vue')) results.push(fullPath);
  });
  return results;
}

const vueFiles = getVueFiles('./src');
const usedKeys = new Set();
const keyRegex = /t\(\s*['"]([^'"]+)['"]\s*\)/g;

vueFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  let match;
  while ((match = keyRegex.exec(content)) !== null) {
    usedKeys.add(match[1]);
  }
});

const languages = ['en', 'zh', 'de', 'es', 'fr'];
const dictionaries = {};
languages.forEach(lang => {
  dictionaries[lang] = JSON.parse(fs.readFileSync(`./src/locales/${lang}.json`, 'utf8'));
});

console.log('Total used translation keys found in Vue components:', usedKeys.size);

languages.forEach(lang => {
  const missing = Array.from(usedKeys).filter(k => !(k in dictionaries[lang]));
  console.log(`Missing keys in ${lang}.json:`, missing);
});
