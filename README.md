# Caustics – Shader website

A static website for the Caustics shaders, made for the **Horizon Project** (the Rust Minecraft rewrite).
No build step, no server code: plain HTML, CSS and JavaScript.

## Folder tree

```
caustics/
├── index.html                 The page
├── config.json                ← EDIT THIS: links, socials, version, name
├── README.md
├── DEMO/                      ← put your 16:9 screenshots here
├── downloads/                 ← put your shader ZIP here (Caustics.zip)
├── assets/
│   ├── css/style.css          Styling (colors are variables at the top)
│   └── js/
│       ├── config-engine.js   JSON parser engine (reads config.json)
│       ├── images.js          List of demo images (generated)
│       └── main.js            Slideshow, grid, lightbox, nav
└── tools/
    └── generate-images.py     Scans DEMO/ and writes assets/js/images.js
```

## 1. Edit links, socials and version (config.json)

```json
{
  "site":   { "name": "Caustics", "tagline": "...", "version": "1.0" },
  "links":  { "download": "downloads/Caustics.zip",
              "paypal": "https://www.paypal.com/donate/?hosted_button_id=YOUR_BUTTON_ID",
              "horizon": "", "changelog": "" },
  "socials": [
    { "name": "GitHub", "icon": "fa-brands fa-github", "url": "https://github.com/your-username" },
    { "name": "Discord", "icon": "fa-brands fa-discord", "url": "" }
  ]
}
```

- Change `version` once and it updates everywhere it is shown.
- A social with an empty `"url"` is hidden. Add more by copying an entry; `icon` is any Font Awesome class.
- `horizon` and `changelog` links only appear when they are filled in.

Because `config.json` is loaded with `fetch`, view the site through a web server
(for example `python -m http.server 8080` in this folder, or any static host).
If it can't be loaded, the defaults written in `index.html` stay in place.

## 1b. Always link the latest GitHub release (optional)

Publish your shader ZIP as a **GitHub Release**, then set this in `config.json`:

```json
"github": { "repo": "your-username/your-repo", "asset": "Caustics.zip", "autoLatest": true }
```

- The Download button points to `https://github.com/<repo>/releases/latest/download/<asset>`,
  which GitHub always redirects to the newest release. Upload a new release and the button follows.
- The version shown on the site becomes the latest release tag (`v2.3.1` shows as `2.3.1`),
  and the Changelog link points to that release page.
- Leave `"asset"` empty to use the first `.zip` in the latest release.
- Leave `"repo"` empty (or set `"autoLatest": false`) to use `links.download` and `site.version` as written.
- If GitHub can't be reached, the site falls back to `links.download` and `site.version`.

## 2. Add demo images

1. Copy your images into `DEMO/`.
2. Run `python tools/generate-images.py`.
3. Reload the page. Run the script again whenever you add or remove images.

(You can also edit `assets/js/images.js` by hand.)

## 3. Add your download

Put your shader pack at `downloads/Caustics.zip`, or point `links.download` in `config.json` somewhere else (or use the GitHub option above).

## Preview locally

```
python -m http.server 8080
```
then open http://localhost:8080
