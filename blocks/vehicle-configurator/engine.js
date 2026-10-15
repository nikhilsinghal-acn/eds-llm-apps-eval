// Browser copy of the handler rules, used by /configure when the page is opened
// outside the chat. Ids and reasons must stay aligned with
// eds-llm-apps-repo/actions/configure_vehicle/catalog.js.

const SITE = 'https://main--eds-llm-apps-eval--nikhilsinghal-acn.aem.live';

const TRIMS = {
  's-awd': { label: 'S AWD', base: 2640000 },
  'dynamic-se': { label: 'Dynamic SE', base: 3180000 },
};

const GROUPS = [
  {
    id: 'paint',
    label: 'Paint',
    default: 'arctic-white',
    options: [
      { id: 'arctic-white', label: 'Arctic White', delta: 0, swatch: '#EDEDE8' },
      { id: 'slate-grey', label: 'Slate Grey', delta: 95000, swatch: '#8A8E90' },
      { id: 'obsidian-black', label: 'Obsidian Black', delta: 95000, swatch: '#1C1C1E' },
      { id: 'crimson-red', label: 'Crimson Red', delta: 145000, swatch: '#7B1420' },
    ],
  },
  {
    id: 'wheels',
    label: 'Wheels',
    default: 'r20-gloss',
    options: [
      { id: 'r20-gloss', label: '20" gloss silver', delta: 0 },
      { id: 'r21-satin', label: '21" satin dark', delta: 120000 },
      { id: 'r22-black', label: '22" gloss black', delta: 240000 },
    ],
  },
  {
    id: 'pack',
    label: 'Pack',
    default: 'none',
    options: [
      { id: 'none', label: 'No pack', delta: 0 },
      { id: 'black-exterior', label: 'Black Exterior Pack', delta: 185000 },
      { id: 'cold-climate', label: 'Cold Climate Pack', delta: 95000 },
    ],
  },
  {
    id: 'roof',
    label: 'Roof',
    default: 'fixed',
    options: [
      { id: 'fixed', label: 'Fixed roof', delta: 0 },
      { id: 'panoramic', label: 'Panoramic roof', delta: 210000 },
    ],
  },
];

const RULES = [
  {
    id: 'r22-requires-dynamic',
    when: (s) => s.wheels === 'r22-black' && s.trim !== 'dynamic-se',
    blocks: 'wheels',
    reason: '22-inch wheels are only offered on Dynamic SE.',
  },
  {
    id: 'black-pack-excludes-white',
    when: (s) => s.pack === 'black-exterior' && s.paint === 'arctic-white',
    blocks: 'pack',
    reason: 'Black Exterior Pack is not offered with Arctic White.',
  },
  {
    id: 'pano-excludes-cold-climate',
    when: (s) => s.roof === 'panoramic' && s.pack === 'cold-climate',
    blocks: 'roof',
    reason: 'Panoramic roof cannot be combined with the Cold Climate Pack.',
  },
  {
    id: 'r22-excludes-cold-climate',
    when: (s) => s.wheels === 'r22-black' && s.pack === 'cold-climate',
    blocks: 'wheels',
    reason: '22-inch wheels are not available with the Cold Climate Pack.',
  },
];

const DEFAULT_TRIM = 's-awd';

function groupById(id) {
  return GROUPS.find((g) => g.id === id);
}

function normalize(args) {
  const trim = TRIMS[args.trim] ? args.trim : DEFAULT_TRIM;
  const sel = { trim };
  for (const group of GROUPS) {
    const known = group.options.some((option) => option.id === args[group.id]);
    sel[group.id] = known ? args[group.id] : group.default;
  }
  return sel;
}

function firstBroken(sel) {
  return RULES.find((rule) => rule.when(sel)) || null;
}

function reconcile(sel) {
  const dropped = [];
  let guard = 0;
  let broken = firstBroken(sel);
  while (broken && guard < GROUPS.length + 1) {
    const group = groupById(broken.blocks);
    dropped.push({
      rule: broken.id,
      group: group.id,
      removed: sel[group.id],
      revertedTo: group.default,
      reason: broken.reason,
    });
    sel[group.id] = group.default;
    broken = firstBroken(sel);
    guard += 1;
  }
  return dropped;
}

function availability(sel) {
  return GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    selected: sel[group.id],
    options: group.options.map((option) => {
      const broken = firstBroken({ ...sel, [group.id]: option.id });
      return {
        id: option.id,
        label: option.label,
        delta: option.delta,
        ...(option.swatch ? { swatch: option.swatch } : {}),
        available: !broken,
        ...(broken ? { reason: broken.reason } : {}),
      };
    }),
  }));
}

function quote(sel) {
  const base = TRIMS[sel.trim].base;
  const lines = [];
  let options = 0;
  for (const group of GROUPS) {
    const option = group.options.find((item) => item.id === sel[group.id]);
    if (option.delta > 0) {
      lines.push({ group: group.id, label: option.label, amount: option.delta });
      options += option.delta;
    }
  }
  return {
    currency: 'INR',
    base,
    options,
    total: base + options,
    lines,
    disclaimer: 'Ex-showroom Delhi. Registration, insurance and taxes extra.',
  };
}

function buildId(sel) {
  const key = `${sel.trim}|${sel.paint}|${sel.wheels}|${sel.pack}|${sel.roof}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return `b_${Math.abs(hash).toString(36)}`;
}

export function configure(args = {}) {
  const selections = normalize(args);
  const dropped = reconcile(selections);
  return {
    view: 'configurator',
    model: 'Terra',
    trim: selections.trim,
    trimLabel: TRIMS[selections.trim].label,
    selections,
    dropped,
    groups: availability(selections),
    price: quote(selections),
    buildId: buildId(selections),
    deepLink: `${SITE}/configure?${new URLSearchParams(selections).toString()}`,
    cta: 'Open in the full configurator',
  };
}
