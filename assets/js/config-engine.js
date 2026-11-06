/* ==========================================================
   Caustics – JSON config engine
   Reads config.json and fills the page. Edit config.json, not the HTML.

   HTML attributes understood:
     data-text="site.name"          -> sets the element's text
     data-href="links.paypal"       -> sets the href (hidden if the value is empty)
     data-tpl="Version {{site.version}}"
                                    -> text template; {{path}} is replaced by config values
     data-hide-if-empty="links.x"   -> hides the element when that value is empty
     data-socials                   -> filled with icon links from the "socials" list
                                       (entries with an empty "url" are skipped)

   GitHub "latest release" (optional, set "github.repo": "owner/repo"):
     - the download button points at the latest release asset
       (https://github.com/owner/repo/releases/latest/download/<asset>)
     - site.version is replaced by the latest release tag
     - links.changelog is set to the latest release page
     If GitHub can't be reached, links.download and site.version from
     config.json are used instead.

   If config.json can't be loaded (e.g. file:// in some browsers) the defaults
   already written in the HTML stay in place. Use any static server to enable it.
   ========================================================== */
(function () {
  "use strict";

  const CONFIG_URL = "config.json";
  const CACHE_MIN = 10; // minutes to cache the GitHub answer (API allows 60 requests/hour per visitor)

  const get = (obj, path) =>
    path.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);

  const isEmpty = (v) => v === undefined || v === null || String(v).trim() === "";

  /* Only allow safe link schemes */
  function safeUrl(u) {
    const s = String(u).trim();
    if (/^(https?:|mailto:)/i.test(s)) return s;
    if (/^(javascript|data|vbscript):/i.test(s)) return "";
    return s; // relative path such as downloads/Caustics.zip
  }

  /* Only allow Font Awesome class names */
  const safeIcon = (c) => (/^[a-z0-9\- ]+$/i.test(c) ? c : "fa-solid fa-link");

  function apply(cfg) {
    /* data-text */
    document.querySelectorAll("[data-text]").forEach((el) => {
      const v = get(cfg, el.dataset.text);
      if (!isEmpty(v)) el.textContent = v;
    });

    /* data-tpl */
    document.querySelectorAll("[data-tpl]").forEach((el) => {
      el.textContent = el.dataset.tpl
        .replace(/&middot;/g, "·")
        .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, p) => {
          const v = get(cfg, p);
          return isEmpty(v) ? "" : v;
        });
    });

    /* data-href */
    document.querySelectorAll("[data-href]").forEach((el) => {
      const v = get(cfg, el.dataset.href);
      if (isEmpty(v)) {
        el.hidden = true;
      } else {
        el.setAttribute("href", safeUrl(v));
        el.hidden = false;
      }
    });

    /* data-hide-if-empty */
    document.querySelectorAll("[data-hide-if-empty]").forEach((el) => {
      el.hidden = isEmpty(get(cfg, el.dataset.hideIfEmpty));
    });

    /* data-socials */
    const socials = Array.isArray(cfg.socials) ? cfg.socials.filter((s) => !isEmpty(s.url)) : [];
    document.querySelectorAll("[data-socials]").forEach((box) => {
      box.textContent = "";
      socials.forEach((s) => {
        const a = document.createElement("a");
        a.href = safeUrl(s.url);
        a.target = "_blank";
        a.rel = "noopener";
        a.title = s.name || "";
        a.setAttribute("aria-label", s.name || "link");
        const i = document.createElement("i");
        i.className = safeIcon(s.icon || "");
        a.appendChild(i);
        box.appendChild(a);
      });
      box.hidden = socials.length === 0;
    });

    /* page title */
    if (!isEmpty(get(cfg, "site.name"))) {
      document.title = cfg.site.name + " – Shaders for the Horizon Project";
    }
  }

  /* ---------- GitHub latest release ---------- */
  const REPO_RE = /^[\w.-]+\/[\w.-]+$/;

  function readCache(repo) {
    try {
      const c = JSON.parse(sessionStorage.getItem("caustics-release:" + repo) || "null");
      if (c && Date.now() - c.t < CACHE_MIN * 60000) return c.data;
    } catch (e) {}
    return null;
  }
  function writeCache(repo, data) {
    try { sessionStorage.setItem("caustics-release:" + repo, JSON.stringify({ t: Date.now(), data })); } catch (e) {}
  }

  async function latestRelease(repo) {
    const cached = readCache(repo);
    if (cached) return cached;
    const r = await fetch("https://api.github.com/repos/" + repo + "/releases/latest", {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!r.ok) throw new Error("GitHub API HTTP " + r.status);
    const j = await r.json();
    const data = {
      tag: j.tag_name || "",
      url: j.html_url || "",
      assets: (j.assets || []).map((a) => ({ name: a.name, url: a.browser_download_url })),
    };
    writeCache(repo, data);
    return data;
  }

  async function withGithub(cfg) {
    const gh = cfg.github || {};
    const repo = String(gh.repo || "").trim();
    if (!repo || gh.autoLatest === false) return cfg;
    if (!REPO_RE.test(repo)) {
      console.warn('[config-engine] github.repo must look like "owner/repo"');
      return cfg;
    }
    cfg.links = cfg.links || {};
    cfg.site = cfg.site || {};

    // Direct "latest" link: GitHub redirects it to the newest release's file.
    if (!isEmpty(gh.asset)) {
      cfg.links.download = "https://github.com/" + repo + "/releases/latest/download/" + encodeURIComponent(gh.asset);
    }
    // Ask the API for the tag name (version) and release page; also covers "no asset name given".
    try {
      const rel = await latestRelease(repo);
      if (rel.tag) cfg.site.version = rel.tag.replace(/^v/i, "");
      if (rel.url) cfg.links.changelog = rel.url;
      if (isEmpty(gh.asset)) {
        const zip = rel.assets.find((a) => /\.zip$/i.test(a.name)) || rel.assets[0];
        if (zip) cfg.links.download = zip.url;
        else if (rel.url) cfg.links.download = rel.url;
      }
    } catch (err) {
      console.warn("[config-engine] Could not read the latest GitHub release:", err.message);
    }
    return cfg;
  }

  function start() {
    fetch(CONFIG_URL, { cache: "no-cache" })
      .then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then((cfg) => {
        apply(cfg); // show config.json values immediately
        const repo = cfg.github && String(cfg.github.repo || "").trim();
        if (repo) withGithub(cfg).then(apply); // then upgrade with the latest GitHub release
      })
      .catch((err) => console.warn("[config-engine] Could not load " + CONFIG_URL + ":", err.message));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
