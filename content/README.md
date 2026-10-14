# Content for Document Authoring

Authored in DA, not committed to the repo. The markdown here is the source of truth for
what you publish; `da-out/` holds the converted DA body-fragment HTML.

## Pages

| Source | Published path | Role |
|---|---|---|
| `index.md` | `/` | Range overview |
| `models.md` | `/models` | Three models with spec tables |
| `models/terra.md` | `/models/terra` | Trims, specs, and the Schema block |
| `options.md` | `/options` | Option codes, prices, **and the compatibility table** |
| `compare.md` | `/compare` | Trim-by-trim comparison |
| `build.md` | `/build` | The four configuration steps |
| `dealers.md` | `/dealers` | Eight dealers |
| `offers.md` | `/offers` | Finance and lease examples |
| `eds-widgets/configure-vehicle.md` | `/eds-widgets/configure-vehicle` | **The widget surface** |

## The metadata sheet

`metadata.csv` must be created in DA as a **sheet** named `metadata`, not as a page.
The first row is what makes the widget page render bare:

| path | template | robots |
|---|---|---|
| `/eds-widgets/**` | `widget` | `noindex, nofollow` |

`template: widget` is read by the `scripts.js` edit in `patches/BOILERPLATE-EDITS.md` and
suppresses header and footer. Without this row, your widget page renders with site chrome
inside the chat card.

## Publishing

```bash
node tools/md-to-da.mjs          # content/*.md -> content/da-out/*.html
export DA_TOKEN='<bearer from a signed-in da.live session>'
./tools/da-publish.sh
```

Expect `da=201 preview=200 live=200`. Stop on the first page if anything else comes back.

Manual alternative: create each page in the DA editor and paste the matching file from
`da-out/` into the source view.

## Option codes match the handler

Every code on `/options` is a real id in `actions/configure_vehicle/catalog.js`:

- trim: `s-awd`, `dynamic-se`
- paint: `arctic-white`, `slate-grey`, `obsidian-black`, `crimson-red`
- wheels: `r20-gloss`, `r21-satin`, `r22-black`
- pack: `none`, `black-exterior`, `cold-climate`
- roof: `fixed`, `panoramic`

So the arguments the model extracts from the crawled page already line up with the rules
engine. No mapping layer, and the demo's two halves describe the same vehicle.

## The compatibility table is the point

All four rules in `catalog.js` are stated in prose on `/options`. That is what makes the
demo land: a crawler can read "panoramic roof is not available with the Cold Climate Pack"
and still cannot enforce it. Only a tool call can.
