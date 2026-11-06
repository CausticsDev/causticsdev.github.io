/* ==========================================================
   Caustics – static site script (no build step, no server code)
   Images come from assets/js/images.js  ->  window.DEMO_IMAGES = ["DEMO/a.jpg", ...]
   ========================================================== */
const SLIDE_INTERVAL = 6000; // ms between slides

const $ = (id) => document.getElementById(id);
let images = [];
let current = 0;
let timer = null;

/* Make any file name safe for a URL (spaces, brackets, #, etc.) */
const url = (p) => encodeURI(p).replace(/#/g, "%23");

/* Optional fallback: if assets/js/images.js is empty, try reading the DEMO/ folder
   listing (works on most static hosts / local servers that show folder indexes). */
async function fromDirectoryListing() {
  try {
    const res = await fetch("DEMO/");
    if (!res.ok) return [];
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    return [...doc.querySelectorAll("a")]
      .map((a) => decodeURIComponent(a.getAttribute("href") || ""))
      .filter((h) => /\.(jpe?g|png|webp|avif|gif)$/i.test(h))
      .map((h) => "DEMO/" + h.split("/").pop())
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  } catch (e) {
    return [];
  }
}

/* ---------- Slideshow ---------- */
function buildSlideshow() {
  const slides = $("slides"), dots = $("dots");
  images.forEach((src, i) => {
    const s = document.createElement("div");
    s.className = "slide";
    s.style.backgroundImage = `url("${url(src)}")`;
    slides.appendChild(s);

    const d = document.createElement("button");
    d.setAttribute("aria-label", `Slide ${i + 1}`);
    d.onclick = () => { goTo(i); restart(); };
    dots.appendChild(d);
  });
  goTo(0);
  restart();
}

function goTo(i) {
  const slides = document.querySelectorAll(".slide");
  const dots = document.querySelectorAll(".dots button");
  if (!slides.length) return;
  current = (i + slides.length) % slides.length;
  slides.forEach((s, n) => s.classList.toggle("active", n === current));
  dots.forEach((d, n) => d.classList.toggle("active", n === current));
}

function restart() {
  clearInterval(timer);
  if (images.length > 1) timer = setInterval(() => goTo(current + 1), SLIDE_INTERVAL);
}

$("next").onclick = () => { goTo(current + 1); restart(); };
$("prev").onclick = () => { goTo(current - 1); restart(); };

/* ---------- Grid + Lightbox ---------- */
let lbIndex = 0;

function buildGrid() {
  const grid = $("grid");
  images.forEach((src, i) => {
    const t = document.createElement("div");
    t.className = "thumb";
    const img = document.createElement("img");
    img.src = url(src);
    img.loading = "lazy";
    img.alt = `Caustics screenshot ${i + 1}`;
    t.appendChild(img);
    t.onclick = () => openLB(i);
    grid.appendChild(t);
  });
}

function openLB(i) {
  lbIndex = (i + images.length) % images.length;
  $("lbImg").src = url(images[lbIndex]);
  $("lightbox").hidden = false;
  document.body.style.overflow = "hidden";
}
function closeLB() {
  $("lightbox").hidden = true;
  document.body.style.overflow = "";
}
$("lbClose").onclick = closeLB;
$("lbNext").onclick = () => openLB(lbIndex + 1);
$("lbPrev").onclick = () => openLB(lbIndex - 1);
$("lightbox").onclick = (e) => { if (e.target.id === "lightbox") closeLB(); };

document.addEventListener("keydown", (e) => {
  if (!$("lightbox").hidden) {
    if (e.key === "Escape") closeLB();
    if (e.key === "ArrowRight") openLB(lbIndex + 1);
    if (e.key === "ArrowLeft") openLB(lbIndex - 1);
  } else {
    if (e.key === "ArrowRight") { goTo(current + 1); restart(); }
    if (e.key === "ArrowLeft") { goTo(current - 1); restart(); }
  }
});

let touchX = null;
$("slideshow").addEventListener("touchstart", (e) => (touchX = e.touches[0].clientX), { passive: true });
$("slideshow").addEventListener("touchend", (e) => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 50) { goTo(current + (dx < 0 ? 1 : -1)); restart(); }
  touchX = null;
});

/* ---------- Nav ---------- */
const nav = $("nav");
window.addEventListener("scroll", () => nav.classList.toggle("scrolled", window.scrollY > 40));
$("navToggle").onclick = () => $("navLinks").classList.toggle("open");
$("navLinks").addEventListener("click", () => $("navLinks").classList.remove("open"));
$("year").textContent = new Date().getFullYear();

/* ---------- Init ---------- */
(async function init() {
  images = Array.isArray(window.DEMO_IMAGES) ? window.DEMO_IMAGES.slice() : [];
  if (!images.length) images = await fromDirectoryListing();

  if (!images.length) {
    $("empty").hidden = false;
    $("prev").style.display = $("next").style.display = "none";
    return;
  }
  if (images.length < 2) $("prev").style.display = $("next").style.display = "none";
  buildSlideshow();
  buildGrid();
})();
