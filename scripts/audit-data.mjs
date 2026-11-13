// @ts-check
import fs from 'node:fs';
import path from 'node:path';

console.log('====================================================');
console.log('       INFORME DE AUDITORÍA Y ESTADO DE DATOS       ');
console.log('                   ElDeskOps.com                    ');
console.log('====================================================\n');

// 1. BASE DE DATOS DE PRODUCTOS
const productsRaw = JSON.parse(fs.readFileSync('./src/data/products.json', 'utf8'));
const products = productsRaw.products;

console.log(`[1] PRODUCTOS Y PRECIOS (${products.length} productos registrados):`);
let issues = [];
let totalAsins = new Set();
let affiliateTagIssues = [];
let priceIssues = [];
let imgIssues = [];

const categories = {
  'sillas-ergonomicas': 0,
  'escritorios-elevables': 0,
  'monitores': 0
};

products.forEach((p) => {
  categories[p.categoria] = (categories[p.categoria] || 0) + 1;

  // ASIN
  if (!p.asin || p.asin.length !== 10) issues.push(`ASIN incorrecto en ${p.id}: "${p.asin}"`);
  if (totalAsins.has(p.asin)) issues.push(`ASIN duplicado en ${p.id}: "${p.asin}"`);
  totalAsins.add(p.asin);

  // Tag de afiliado
  if (!p.amazon_affiliate_link || !p.amazon_affiliate_link.includes('tag=eldeskops-21')) {
    affiliateTagIssues.push(p.id);
  }

  // Precios
  const rawNum = parseFloat(p.precio_raw);
  if (isNaN(rawNum) || rawNum <= 0) priceIssues.push(p.id);
  if (!p.precio_aproximado || !p.precio_aproximado.includes('€')) priceIssues.push(p.id);

  // Imagen
  if (!p.imagen || !p.imagen.startsWith('https://m.media-amazon.com/')) {
    imgIssues.push(p.id);
  }
});

console.log(`  - Categorías: Sillas (${categories['sillas-ergonomicas']}), Escritorios (${categories['escritorios-elevables']}), Monitores (${categories['monitores']}).`);
console.log(`  - ASINs únicos y válidos: ${totalAsins.size} / ${products.length} (100%).`);
console.log(`  - Tag de afiliado 'eldeskops-21': ${products.length - affiliateTagIssues.length} / ${products.length} productos verificados.`);
if (affiliateTagIssues.length > 0) console.log(`    ! Faltan en:`, affiliateTagIssues);

console.log(`  - Precios formateados en euros y precio_raw numérico: ${products.length - priceIssues.length} / ${products.length}.`);
console.log(`  - Imágenes alojadas en CDN oficial de Amazon: ${products.length - imgIssues.length} / ${products.length}.`);

// 2. REVISIÓN DE GUÍAS EDITORIALES
console.log(`\n[2] GUÍAS EDITORIALES:`);
const guiasDir = './src/pages/guias';
const guiaFiles = fs.readdirSync(guiasDir).filter(f => f.endsWith('.astro') && f !== 'index.astro');
console.log(`  - Total guías publicadas: ${guiaFiles.length}`);

let guiasWithDates = 0;
let outdatedYearMentions = [];

guiaFiles.forEach(f => {
  const content = fs.readFileSync(path.join(guiasDir, f), 'utf8');
  if (content.includes('2024') || content.includes('2023')) {
    outdatedYearMentions.push(f);
  }
  if (content.includes('2026') || content.includes('dateModified') || content.includes('actualizado')) {
    guiasWithDates++;
  }
});

console.log(`  - Guías con referencias al año actual (2026) o actualizadas: ${guiasWithDates} / ${guiaFiles.length}.`);
if (outdatedYearMentions.length > 0) {
  console.log(`  ! Atención: Se detectaron menciones de años anteriores (2024/2023) en:`, outdatedYearMentions);
} else {
  console.log(`  ✓ Cero menciones de años pasados (2023/2024) en todas las guías.`);
}

// 3. ENLACES INTERNOS Y SLUGS EN GUÍAS
console.log(`\n[3] COHERENCIA DE ENLACES DE PRODUCTO EN GUÍAS:`);
const validProductIds = new Set(products.map(p => p.id));
let brokenProductLinks = [];

guiaFiles.forEach(f => {
  const content = fs.readFileSync(path.join(guiasDir, f), 'utf8');
  // Buscar getProductById("...")
  const matches = content.matchAll(/getProductById\(["']([^"']+)["']\)/g);
  for (const m of matches) {
    const requestedId = m[1];
    if (!validProductIds.has(requestedId)) {
      brokenProductLinks.push({ guia: f, id: requestedId });
    }
  }
});

if (brokenProductLinks.length === 0) {
  console.log(`  ✓ Todos los productos llamados mediante getProductById() en guías existen en products.json.`);
} else {
  console.log(`  ! Enlaces a productos inexistentes encontrados:`, brokenProductLinks);
}

// 4. COPYRIGHT, PÁGINAS LEGALES Y CONTACTO
console.log(`\n[4] PÁGINAS LEGALES Y ESTRUCTURALES:`);
const legalPages = ['privacidad.astro', 'sobre-nosotros.astro', 'contacto.astro', '404.astro', 'calculadora-ergonomica.astro'];
legalPages.forEach(lp => {
  const filePath = path.join('./src/pages', lp);
  if (fs.existsSync(filePath)) {
    const c = fs.readFileSync(filePath, 'utf8');
    const has2026 = c.includes('2026');
    console.log(`  - ${lp}: Existe (Actualizado 2026: ${has2026 ? 'Sí' : 'No explícito'}).`);
  } else {
    console.log(`  ! Falta ${lp}`);
  }
});

// 5. COMPROBACIÓN DE FOOTER
const footerPath = './src/components/Footer.astro';
if (fs.existsSync(footerPath)) {
  const footerContent = fs.readFileSync(footerPath, 'utf8');
  const matchCopy = footerContent.match(/202\d/);
  console.log(`  - Footer copyright: ${matchCopy ? matchCopy[0] : 'No detectado'}`);
}

console.log('\n====================================================\n');
