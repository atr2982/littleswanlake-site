# Little Swan Lake Website

Source-controlled rebuild of the Little Swan Lake website.
Initial import pending.

## Build Static Output

Use the source files in `public_html` for editing.

- Shared chrome source: `public_html/template.html`
- Page-specific content: individual files in `public_html`
- Build output: `build/public_html`

Run:

```powershell
npm run build-site
```

That command:

- writes rebuilt HTML files into `build/public_html`
- preserves subfolders like `forms/forms.html`
- writes a built `index.js` that skips the runtime template fetch

Upload only the generated HTML files plus `build/public_html/index.js` to iPage. The source files in `public_html` are not modified by the build.
