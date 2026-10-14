// Turns an authored two-column "Schema" table into a JSON-LD script tag, then
// removes itself from the page. Lets authors own the structured data the same way
// they own the copy, with no per-page code and no head.html changes.
//
// Price-ish keys collapse into an AggregateOffer; everything else is a flat
// property on the main entity.

const OFFER_KEYS = ['priceCurrency', 'lowPrice', 'highPrice', 'price', 'availability'];
const NUMERIC_KEYS = ['lowPrice', 'highPrice', 'price', 'seatingCapacity'];

function readRows(block) {
  const out = [];
  for (const row of block.querySelectorAll(':scope > div')) {
    const cells = [...row.children];
    if (cells.length < 2) continue;
    const key = cells[0].textContent.trim();
    const value = cells[1].textContent.trim();
    if (key && value && key.toLowerCase() !== 'schema') out.push([key, value]);
  }
  return out;
}

function absolute(value) {
  return value.startsWith('/') ? new URL(value, window.location.origin).href : value;
}

export default function decorate(block) {
  const rows = readRows(block);
  block.remove();
  if (!rows.length) return;

  const entity = { '@context': 'https://schema.org' };
  const offer = {};

  for (const [key, raw] of rows) {
    const value = NUMERIC_KEYS.includes(key) ? Number(raw) : raw;

    if (key === 'type') {
      entity['@type'] = raw;
    } else if (key === 'brand') {
      entity.brand = { '@type': 'Brand', name: raw };
    } else if (key === 'url') {
      entity.url = absolute(raw);
    } else if (key === 'availability') {
      offer.availability = `https://schema.org/${raw}`;
    } else if (OFFER_KEYS.includes(key)) {
      offer[key] = value;
    } else {
      entity[key] = value;
    }
  }

  if (Object.keys(offer).length) {
    entity.offers = {
      '@type': offer.lowPrice && offer.highPrice ? 'AggregateOffer' : 'Offer',
      ...offer,
    };
  }

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(entity, null, 2);
  document.head.append(script);
}
