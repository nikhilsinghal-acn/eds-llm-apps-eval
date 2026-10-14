// The EDS pipeline turns every authored table into a block, so a data table has to
// be wrapped in a block named "Table" and converted back into a real <table> here.
// Without this, /options and /compare render as stacked divs and the demo looks broken.
//
// First authored row becomes <thead>. Everything after it becomes <tbody>.

function buildCell(content, tag) {
  const cell = document.createElement(tag);
  if (tag === 'th') cell.setAttribute('scope', 'col');
  cell.append(...content.childNodes);
  return cell;
}

export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  rows.forEach((row, index) => {
    const tr = document.createElement('tr');
    [...row.children].forEach((cell) => {
      tr.append(buildCell(cell, index === 0 ? 'th' : 'td'));
    });
    (index === 0 ? thead : tbody).append(tr);
  });

  table.append(thead, tbody);
  block.replaceChildren(table);
}
