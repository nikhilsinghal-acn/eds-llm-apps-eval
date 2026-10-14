#!/usr/bin/env node
// Converts the demo-site markdown into DA body-fragment HTML.
//
//   node tools/md-to-da.mjs                 # writes tools/da-out/**.html
//
// Handles the subset used by the demo pages: headings, paragraphs, bullet lists,
// inline links and bold, and tables. Every table is emitted as an EDS block,
// because the EDS pipeline turns any authored table into a block named after the
// first cell of its first row. Data tables are wrapped in a `Table` block;
// a table whose first row is a single cell keeps that cell as its block name.

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';

const SRC = 'content';
const OUT = 'content/da-out';
const SKIP = ['README.md'];

const esc = (s) => s
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// inline: [text](href) and **bold**
function inline(text) {
  return esc(text)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => `<a href="${href}">${label}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

const splitRow = (line) => line
  .replace(/^\s*\|/, '').replace(/\|\s*$/, '')
  .split('|')
  .map((c) => c.trim());

const isDivider = (line) => /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(line) && line.includes('-');

function tableHtml(rows) {
  // A single-cell first row is an explicit block name (e.g. "Schema").
  // Anything else is a data table, so wrap it in the Table block.
  const named = rows[0].filter(Boolean).length === 1;
  const body = named ? rows : [['Table'], ...rows];
  const width = Math.max(...body.map((r) => r.length));

  const out = ['<table>'];
  body.forEach((row, i) => {
    out.push('  <tr>');
    const span = row.length === 1 && width > 1 ? ` colspan="${width}"` : '';
    row.forEach((cell) => out.push(`    <td${span}>${inline(cell)}</td>`));
    out.push('  </tr>');
    if (i === 0 && !named) out.push('');
  });
  out.push('</table>');
  return out.filter((l) => l !== '').join('\n');
}

function convert(md) {
  const lines = md.split(/\r?\n/);
  const sections = [[]];
  const push = (html) => sections[sections.length - 1].push(html);

  let i = 0;
  let list = null;

  const closeList = () => {
    if (list) {
      push(`<ul>\n${list.map((li) => `  <li>${inline(li)}</li>`).join('\n')}\n</ul>`);
      list = null;
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*---\s*$/.test(line)) {           // section break
      closeList();
      sections.push([]);
      i += 1;
    } else if (/^\s*$/.test(line)) {
      closeList();
      i += 1;
    } else if (/^(#{1,6})\s+/.test(line)) {
      closeList();
      const [, hashes] = line.match(/^(#{1,6})\s+/);
      const level = hashes.length;
      push(`<h${level}>${inline(line.replace(/^#{1,6}\s+/, ''))}</h${level}>`);
      i += 1;
    } else if (/^\s*[-*]\s+/.test(line)) {
      list = list || [];
      list.push(line.replace(/^\s*[-*]\s+/, ''));
      i += 1;
    } else if (line.includes('|') && isDivider(lines[i + 1] || '')) {
      closeList();
      const rows = [splitRow(line)];
      i += 2;                                  // header row + divider
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      push(tableHtml(rows));
    } else {
      closeList();
      const para = [line];
      i += 1;
      while (i < lines.length && lines[i].trim() && !/^[#\-*|]/.test(lines[i])) {
        para.push(lines[i]);
        i += 1;
      }
      push(`<p>${inline(para.join(' '))}</p>`);
    }
  }
  closeList();

  const divs = sections
    .filter((s) => s.length)
    .map((s) => `    <div>\n${s.map((h) => h.split('\n').map((l) => `      ${l}`).join('\n')).join('\n')}\n    </div>`)
    .join('\n');

  return `<body>\n  <header></header>\n  <main>\n${divs}\n  </main>\n  <footer></footer>\n</body>\n`;
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(p));
    else if (entry.name.endsWith('.md') && !SKIP.includes(entry.name)) out.push(p);
  }
  return out;
}

const files = await walk(SRC);
for (const file of files) {
  const rel = relative(SRC, file).replace(/\.md$/, '.html');
  const dest = join(OUT, rel);
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, convert(await readFile(file, 'utf8')));
  console.log(`${file}  ->  ${dest}`);
}
console.log(`\n${files.length} pages converted.`);
