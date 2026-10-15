// Pure function: structuredContent (+ authored config) -> everything the UI needs.
// No DOM, no bridge, no fetch. The EDS block imports it in the browser and the
// trace runner imports it in Node, which is how one piece of rendering logic ends
// up serving the chat widget, the website and the test suite.

const money = (n, currency) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency, maximumFractionDigits: 0,
}).format(n);

export function toViewModel(state, config = {}) {
  if (!state) return { empty: true, message: config.emptyMessage || 'No build yet.' };

  const { currency } = state.price;

  return {
    empty: false,
    title: `${state.model} ${state.trimLabel}`,
    heroImage: state.heroImage,
    groups: state.groups.map((g) => ({
      id: g.id,
      label: g.label,
      options: g.options.map((o) => ({
        id: o.id,
        label: o.label,
        swatch: o.swatch,
        selected: o.id === g.selected,
        disabled: !o.available,
        title: o.available
          ? (o.delta ? `+ ${money(o.delta, currency)}` : 'Included')
          : o.reason,
        delta: o.delta ? `+ ${money(o.delta, currency)}` : '',
      })),
    })),
    notices: state.dropped.map((d) => d.reason),
    price: {
      total: money(state.price.total, currency),
      rows: [
        { label: 'Base', value: money(state.price.base, currency) },
        ...state.price.lines.map((l) => ({ label: l.label, value: money(l.amount, currency) })),
      ],
      note: config.priceNote || state.price.disclaimer,
    },
    cta: { label: config.ctaLabel || state.cta, href: config.ctaHref || state.deepLink },
  };
}
