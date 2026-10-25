# Aura Studio

Aura Studio is a responsive, reference-guided image-generation studio built from the supplied v100.8 Master HTML. It includes reference previews, a prompt architect, spatial radar, camera/physique controls, presets, batch output gallery, full-resolution downloads, and Gemini API configuration.

## Requirements

- Node.js 20 or newer for local development, or a Vercel project for deployment.
- A Google Gemini API key with access to one of the image models listed in the studio.

## Run locally

1. Set `GEMINI_API_KEY` in your shell environment. Do not add it to `index.html` or commit it to source control.
2. Run `npm start`.
3. Open `http://localhost:3000`.

Linux/macOS example:

```sh
GEMINI_API_KEY="YOUR_KEY" npm start
```

Windows PowerShell example:

```powershell
$env:GEMINI_API_KEY="YOUR_KEY"
npm start
```

Opening `index.html` directly from a file manager will show the interface but image generation needs the server endpoint (`/api/generate`).

## Deploy to Vercel

1. Import this project folder into a Vercel project, or deploy it using Vercel CLI from this directory.
2. In **Project → Settings → Environment Variables**, add `GEMINI_API_KEY` for Preview and/or Production.
3. Add `AURA_ACCESS_PASSWORD` with a strong private password. Production generation is locked by default unless this is configured, to stop anonymous visitors from spending your Gemini quota.
4. Redeploy after adding the variables.
5. Open Aura → Engine Settings and enter the `AURA_ACCESS_PASSWORD` value. The browser holds it in session storage only; it is not your Gemini API key.
6. Test a single 1K image before running a large batch.

The app uses Vercel's `/api/generate.js` Node.js function and the Gemini Interactions API. The API key is read only on the server. The endpoint validates the model, aspect ratio, image size, and reference data size, and does not silently substitute fake placeholder images when generation fails.

## Models and output size

- `gemini-3.1-flash-image`: default; supports 1K/2K/4K output.
- `gemini-3-pro-image`: premium image model; supports high-resolution output up to 4K.
- `gemini-3.1-flash-lite-image`: fast model; limited to 1K output.

Native output resolution is requested from the model. JPEG/PNG export changes the download encoding, not the image's pixel dimensions. This integration does not claim native 8K generation.

## Security notes

- Production image generation is default-deny until `AURA_ACCESS_PASSWORD` is configured. This is a simple shared-password gate for a personal/starter app, not a substitute for per-user authentication in a public SaaS.
- Never put the Gemini API key in the HTML, browser local storage, a public repository, or a client-side environment variable.
- Add access control and a distributed rate limiter before offering this as a public, multi-user service. The sample app is designed as a personal/starter studio, not as a hardened public SaaS backend.
- Reference images are sent to Google Gemini only when the user presses a generation action. The backend sets `store: false` for the Interactions API request.
