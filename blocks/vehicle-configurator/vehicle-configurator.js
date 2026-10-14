import { toViewModel } from './view-model.js';

const ACTION = 'configure_vehicle';

// Every node is built with DOM APIs and every external string lands via textContent.
// Nothing from the handler is ever concatenated into markup. Adobe's current widget
// guidance requires this, and the handler result is untrusted data by definition.
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

// ---- Input 1: the authored DOM -----------------------------------------------
// The block table on the EDS page. Brand copy, CTA wording, legal notes, feature
// flags. Authored in DA, published in seconds, no deploy and no token cost.
function readAuthoredConfig(block) {
  const cfg = {};
  for (const row of block.querySelectorAll(':scope > div')) {
    const cells = [...row.children];
    if (cells.length < 2) continue;
    const key = cells[0].textContent.trim();
    const value = cells[1].textContent.trim();
    if (key) cfg[key] = value;
  }
  return cfg;
}

// ---- Input 2: live data -------------------------------------------------------
async function loadState(bridge, cfg) {
  if (bridge) {
    const result = await bridge.toolResult;
    return result?.structuredContent ?? null;
  }
  // On the website the same block calls the same configurator API directly.
  const endpoint = cfg.apiEndpoint;
  if (!endpoint) return null;
  try {
    const res = await fetch(`${endpoint}?${new URLSearchParams(window.location.search)}`);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

function renderOption(groupId, option) {
  const button = el('button', 'vc-option');
  button.type = 'button';
  button.dataset.group = groupId;
  button.dataset.option = option.id;
  button.title = option.title;
  button.setAttribute('aria-pressed', String(option.selected));
  if (option.selected) button.classList.add('is-selected');
  if (option.disabled) {
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
  }

  if (option.swatch) {
    const swatch = el('span', 'vc-swatch');
    swatch.style.background = option.swatch;
    button.append(swatch);
  }
  button.append(el('span', 'vc-option-label', option.label));
  if (option.delta) button.append(el('span', 'vc-delta', option.delta));

  return button;
}

function renderGroup(group) {
  const fieldset = el('fieldset', 'vc-group');
  fieldset.dataset.group = group.id;
  fieldset.append(el('legend', null, group.label));

  const options = el('div', 'vc-options');
  for (const option of group.options) options.append(renderOption(group.id, option));
  fieldset.append(options);

  return fieldset;
}

function renderPrice(price) {
  const wrapper = el('div', 'vc-price');
  const dl = el('dl');
  for (const row of price.rows) {
    dl.append(el('dt', null, row.label));
    dl.append(el('dd', null, row.value));
  }
  wrapper.append(dl);
  wrapper.append(el('p', 'vc-total', price.total));
  wrapper.append(el('p', 'vc-note', price.note));
  return wrapper;
}

function render(block, vm) {
  if (vm.empty) {
    block.replaceChildren(el('p', 'vc-empty', vm.message));
    return;
  }

  const parts = [];

  if (vm.heroImage) {
    const figure = el('figure', 'vc-hero');
    const img = document.createElement('img');
    img.src = vm.heroImage;
    img.alt = vm.title;
    img.loading = 'lazy';
    figure.append(img);
    parts.push(figure);
  }

  parts.push(el('h3', 'vc-title', vm.title));

  if (vm.notices.length) {
    const ul = el('ul', 'vc-notices');
    for (const notice of vm.notices) ul.append(el('li', null, notice));
    parts.push(ul);
  }

  const groups = el('div', 'vc-groups');
  for (const group of vm.groups) groups.append(renderGroup(group));
  parts.push(groups);

  parts.push(renderPrice(vm.price));

  const cta = el('a', 'vc-cta', vm.cta.label);
  cta.href = vm.cta.href;
  cta.rel = 'noopener';
  parts.push(cta);

  block.replaceChildren(...parts);
}

export default async function decorate(block, bridge) {
  const cfg = readAuthoredConfig(block);

  // Pull the host's CSS variables and fonts in so the card sits inside the chat
  // rather than on top of it. A no-op on the website, where brand CSS wins.
  if (bridge) bridge.applyHostStyles();

  let state = await loadState(bridge, cfg);
  render(block, toViewModel(state, cfg));

  block.addEventListener('click', async (event) => {
    const button = event.target.closest('.vc-option');
    if (!button || button.disabled || !state) return;

    const patch = { [button.dataset.group]: button.dataset.option };
    const groups = block.querySelector('.vc-groups');

    if (bridge) {
      // Round trip through the rules engine. The server decides what is legal,
      // never the model and never this block. No model turn is consumed.
      if (groups) groups.setAttribute('aria-busy', 'true');
      const result = await bridge.callTool(ACTION, { ...state.selections, ...patch });
      state = result?.structuredContent ?? state;
    } else {
      state = await loadState(bridge, { ...cfg, ...patch });
    }

    render(block, toViewModel(state, cfg));
    if (bridge) bridge.autoResize(block);
  });

  if (bridge) {
    bridge.onContextChange((ctx) => { block.dataset.theme = ctx.theme; });
    bridge.autoResize(block);
  }
}
