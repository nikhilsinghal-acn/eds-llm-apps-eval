# Edits to boilerplate files

Five files that ship with `adobe/aem-boilerplate` need changing. They are delivered as
diffs rather than whole-file replacements because the boilerplate changes over time and
you should apply these against whatever you actually forked.

---

## 1. `scripts/scripts.js` — two changes

### 1a. Let aem-embed.js suppress the page pipeline

`aem-embed.js` takes over rendering inside the chat host. It needs the page's own
bootstrap to stand down. Find the bare `loadPage()` call at the bottom of the file:

```js
// BEFORE
loadPage();
```

```js
// AFTER
if (!window.hlx.suppressLoadPage) loadPage();
```

Without this, the normal page pipeline and the widget pipeline both run and you get a
header and footer inside the chat card, or nothing at all.

### 1b. A `widget` template, so widget pages also preview bare in a browser

Suppression only happens inside the chat host. For you to open
`/eds-widgets/configure-vehicle` in Chrome and verify it before LLM Apps ever sees it,
the page itself must skip header and footer. Drive that from page metadata.

In `loadEager`, after `decorateTemplateAndTheme()`:

```js
// ADD
const template = getMetadata('template');
if (template) document.body.classList.add(`template-${template}`);
```

Then in `loadLazy`, guard the two loads:

```js
// BEFORE
loadHeader(doc.querySelector('header'));
loadFooter(doc.querySelector('footer'));
```

```js
// AFTER
if (!document.body.classList.contains('template-widget')) {
  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));
} else {
  doc.querySelector('header')?.remove();
  doc.querySelector('footer')?.remove();
}
```

`getMetadata` is already exported by `scripts/aem.js` and already imported in
`scripts.js` in the stock boilerplate. If your fork does not import it, add it to the
existing import list.

The `template` value comes from the `/metadata` sheet — see
`content/metadata.csv` in this bundle.

---

## 2. `styles/styles.css` — one line

`aem-embed` renders into **shadow DOM** to isolate CSS from the host page. Custom
properties declared on `:root` do not cross that boundary, so every variable your blocks
rely on resolves to nothing inside the widget.

```css
/* BEFORE */
:root {
  --background-color: white;
  ...
}
```

```css
/* AFTER */
:root,
:host {
  --background-color: white;
  ...
}
```

This is the documented remedy and it is the single most common cause of an
unstyled-looking widget.

---

## 3. `fstab.yaml`

```yaml
mountpoints:
  /: https://content.da.live/nikhilsinghal-acn/eds-llm-apps-eval/
```

---

## 4. `helix-query.yaml`

Keep the widget pages out of the index and out of the sitemap. They are UI fragments, not
pages, and you do not want them surfacing in search or in your own nav.

```yaml
version: 1

indices:
  default:
    include:
      - '/**'
    exclude:
      - '/eds-widgets/**'
      - '/drafts/**'
    target: /query-index.json
    properties:
      title:
        select: head > title
        value: |
          textContent(el)
      description:
        select: head > meta[name="description"]
        value: |
          attribute(el, 'content')
      lastModified:
        select: none
        value: |
          parseTimestamp(headers('last-modified'), 'ddd, DD MMM YYYY hh:mm:ss GMT')
```

---

## 5. `package.json`

```bash
npm install @adobe/llmapps-sdk
```

That adds the dependency **and** runs a post-install script that copies two files into
`scripts/`:

```
scripts/aem-embed.js
scripts/llmapps-sdk.js
```

**Commit both of them.** Post-install only runs where someone ran `npm install`. If they
are not in the repo, Code Sync never publishes them, and the Script URL you configure in
LLM Apps returns 404. This is the single most common cause of a widget that never appears.

```bash
git add scripts/aem-embed.js scripts/llmapps-sdk.js package.json package-lock.json
git commit -m "Add LLM Apps widget SDK"
```

---

## Verifying the edits landed

```bash
aem up      # http://localhost:3000

# with content published, these should render bare — no header, no footer
open http://localhost:3000/eds-widgets/configure-vehicle
```

The block should render its no-bridge fallback. `bridge` is undefined locally, which is
exactly the branch the website uses too.
