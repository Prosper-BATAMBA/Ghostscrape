const { marked } = require('marked');
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MD_FILE = path.join(ROOT, 'CAHIER_DES_CHARGES.md');
const PDF_FILE = path.join(ROOT, 'CAHIER_DES_CHARGES.pdf');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function main() {
  console.log('[PDF] Reading markdown...');
  const md = fs.readFileSync(MD_FILE, 'utf-8');

  console.log('[PDF] Converting to HTML...');
  const renderer = new marked.Renderer();
  renderer.code = function({ text, lang }) {
    if (lang === 'mermaid') {
      return '<div class="mermaid">' + text.replace(/</g, '&lt;') + '</div>\n';
    }
    const codeClass = lang ? ' class="language-' + lang + '"' : '';
    const langAttr = lang ? ' lang="' + lang + '"' : '';
    return '<pre' + langAttr + '><code' + codeClass + '>' + text.replace(/</g, '&lt;') + '</code></pre>\n';
  };
  const rawHtml = marked(md, { renderer });

  // Insert page breaks before each ## section (except the first after TOC)
  const bodyHtml = rawHtml.replace(/<h2 /g, '<div class="pb"></div><h2 ');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>GhostScrape — Cahier des Charges</title>
  <script>${fs.readFileSync(path.join(__dirname, '..', 'node_modules', 'mermaid', 'dist', 'mermaid.min.js'), 'utf-8')}</script>
  <style>
    @page {
      size: A4;
      margin: 2cm 2.5cm;
    }
    body {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
    }
    h1 { font-size: 22pt; color: #059669; border-bottom: 3px solid #059669; padding-bottom: 0.3em; margin-top: 1.5em; }
    h2 { font-size: 16pt; color: #047857; border-bottom: 1px solid #ccc; padding-bottom: 0.2em; margin-top: 1.2em; }
    h3 { font-size: 13pt; color: #065f46; margin-top: 1em; }
    h4 { font-size: 11pt; color: #064e3b; }
    p { margin: 0.5em 0; }
    code { font-family: 'Cascadia Code', 'Fira Code', 'Courier New', monospace; font-size: 9pt; background: #f3f4f6; padding: 0.1em 0.3em; border-radius: 3px; }
    pre { background: #f3f4f6; padding: 0.8em; border-radius: 5px; overflow-x: auto; font-size: 7pt; border: 1px solid #e5e7eb; line-height: 1.25; page-break-inside: avoid; }
    pre code { background: none; padding: 0; }
    table { border-collapse: collapse; width: 100%; margin: 0.8em 0; font-size: 10pt; }
    th, td { border: 1px solid #d1d5db; padding: 0.4em 0.6em; text-align: left; }
    th { background: #f0fdf4; color: #065f46; font-weight: 600; }
    tr:nth-child(even) { background: #fafafa; }
    blockquote { border-left: 4px solid #059669; margin: 0.5em 0; padding: 0.3em 1em; background: #f0fdf4; color: #374151; font-style: italic; }
    ul, ol { margin: 0.4em 0; padding-left: 1.5em; }
    li { margin: 0.2em 0; }
    hr { border: none; border-top: 1px solid #d1d5db; margin: 2em 0; display: none; }
    strong { color: #111827; }
    em { color: #4b5563; }
    .pb { page-break-before: always; }
    .mermaid { page-break-inside: avoid; margin: 1em 0; text-align: center; }
    .mermaid svg { max-width: 100%; height: auto; }
    nav ul { list-style: none; padding-left: 0; }
    nav ul li { margin: 0.15em 0; }
    nav a { color: #059669; text-decoration: none; }
    nav a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div id="content">${bodyHtml}</div>
  <script>
    try {
      mermaid.initialize({
        theme: 'neutral',
        maxTextSize: 100000,
        flowchart: { useMaxWidth: true, htmlLabels: true },
        sequence: { showSequenceNumbers: false },
        securityLevel: 'loose'
      });
      mermaid.run({ nodes: document.querySelectorAll('.mermaid') }).then(function() {
        console.log('Mermaid rendering complete');
      }).catch(function(err) {
        console.error('Mermaid render error:', err.message);
      });
    } catch(e) {
      console.error('Mermaid init error:', e.message);
    }
  </script>
</body>
</html>`;

  console.log('[PDF] Launching Edge headless...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('mermaid') || msg.text().includes('Mermaid')) {
      console.log(`[PAGE ${msg.type()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));

  await page.setContent(html, { waitUntil: 'domcontentloaded' });

  // Wait for Mermaid diagrams to render
  console.log('[PDF] Waiting for Mermaid diagrams...');
  try {
    await page.waitForFunction(() => {
      const svgs = document.querySelectorAll('.mermaid svg');
      const errors = document.querySelectorAll('.mermaid .error');
      return svgs.length > 0;
    }, { timeout: 45000 });
    // Extra delay to ensure all rendering completes
    await page.evaluate(() => new Promise(r => setTimeout(r, 1000)));
    console.log('[PDF] Mermaid diagrams rendered successfully');
  } catch (e) {
    console.warn('[PDF] Mermaid render warning:', e.message);
    // Continue anyway — pre blocks will show raw source
  }

  console.log('[PDF] Generating PDF...');
  await page.pdf({
    path: PDF_FILE,
    format: 'A4',
    margin: { top: '2cm', bottom: '2cm', left: '2.5cm', right: '2.5cm' },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="font-size:8px; color:#999; width:100%; text-align:center; padding:0 2.5cm;">
        GhostScrape — Cahier des Charges v2.0 — Page <span class="pageNumber"></span> / <span class="totalPages"></span>
      </div>
    `,
  });

  await browser.close();

  const stats = fs.statSync(PDF_FILE);
  const sizeKB = (stats.size / 1024).toFixed(0);
  console.log(`[PDF] Done! → ${PDF_FILE} (${sizeKB} KB)`);
}

main().catch(err => {
  console.error('[PDF] Error:', err);
  process.exit(1);
});
