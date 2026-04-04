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

## Admin Auth

This project now includes an Express-based admin login flow backed by MongoDB.

1. Copy `.env.example` to `.env`
2. Fill in:
   - `MONGODB_URI`
   - `SESSION_SECRET`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
3. Start the app:

```powershell
npm run dev
```

Routes:

- `/login` for the admin login page
- `/admin` for the protected admin page
- `/logout` to end the session

On first startup, the server creates the single admin user from `ADMIN_EMAIL` and `ADMIN_PASSWORD` if it does not already exist.
