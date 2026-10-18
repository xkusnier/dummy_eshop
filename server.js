const express = require("express");
const path = require("path");
const { categories, catIndex, products } = require("./lib/data");
const v = require("./lib/views");

const fs = require("fs");
const app = express();
app.set("trust proxy", 1); // za proxy (Render) kvôli správnemu protokolu v sitemap
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------- Stav pre testovanie (v pamäti) ----------
// overrides[slug] = { price, oldPrice, stock, shipping, status, structured, priceMode, priceFormat, layout, delayMs }
// site = { layout, priceFormat } – predvolené hodnoty pre celý web (napr. simulácia redizajnu)
let overrides = {};
let site = {};
const getP = (p) => ({ ...p, ...site, ...(overrides[p.slug] || {}) });
const MOVED_SUFFIX = "-novy"; // status=301 presmeruje /produkt/:slug na /produkt/:slug-novy
const all = () => products.map(getP);
// Zmazaný produkt (404/410) zmizne aj zo zoznamov, hľadania a podobných produktov, ako na reálnom e-shope.
const listed = () => all().filter((p) => ![404, 410].includes(p.status));
const bySlug = (s) => products.find((p) => p.slug === s);

function similar(p, n = 4) {
  const pool = listed().filter((x) => x.slug !== p.slug);
  const same = pool
    .filter((x) => x.category === p.category)
    .sort((a, b) => Math.abs(a.price - p.price) - Math.abs(b.price - p.price));
  const others = pool
    .filter((x) => x.category !== p.category)
    .sort((a, b) => Math.abs(a.price - p.price) - Math.abs(b.price - p.price));
  return [...same, ...others].slice(0, n);
}

// ---------- Test ovládanie: /__test ----------
app.get("/__test", (req, res) => res.send(v.testPanel(all(), overrides, site)));
app.get("/__test/state", (req, res) => res.json({ site, overrides, products: all() }));
app.all("/__test/reset", (req, res) => {
  overrides = {};
  site = {};
  if (req.method === "POST" || req.query.json === "1") return res.json({ ok: true });
  res.redirect("/__test");
});

const STRUCTURED = ["full", "nojsonld", "none"];
const PRICE_MODES = ["show", "hidden", "js"];
const STATUSES = [301, 403, 404, 410, 429, 503];
// Prázdna hodnota = zmaž override (vráti sa predvolené správanie).
function setEnum(o, key, val, allowed, toValue = String) {
  if (val === undefined) return null;
  if (val === "") { delete o[key]; return null; }
  const x = toValue(val);
  if (!allowed.includes(x)) return `${key} must be one of: ${allowed.join(", ")}`;
  o[key] = x;
  return null;
}
const isForm = (req) => req.method === "POST" && req.is("urlencoded");

// GET aj POST: /__test/site?layout=2&priceFormat=en
app.all("/__test/site", (req, res) => {
  const q = { ...req.query, ...req.body };
  const errors = [
    setEnum(site, "layout", q.layout, [1, 2], Number),
    setEnum(site, "priceFormat", q.priceFormat, v.PRICE_FORMATS),
  ].filter(Boolean);
  if (errors.length) return res.status(400).json({ errors });
  if (isForm(req)) return res.redirect("/__test");
  res.json({ site });
});

// GET aj POST: /__test/set/:slug?price=299&stock=0&shipping=0&status=429&structured=none&priceMode=js&priceFormat=en&layout=2&delayMs=500
app.all("/__test/set/:slug", (req, res) => {
  const base = bySlug(req.params.slug);
  if (!base) return res.status(404).json({ error: "unknown slug" });
  const q = { ...req.query, ...req.body };
  const o = (overrides[base.slug] = overrides[base.slug] || {});
  if (q.price !== undefined && q.price !== "") o.price = Number(q.price);
  if (q.oldPrice !== undefined) o.oldPrice = q.oldPrice === "" ? null : Number(q.oldPrice);
  if (q.stock !== undefined && q.stock !== "") o.stock = Number(q.stock);
  if (q.shipping !== undefined && q.shipping !== "") o.shipping = Number(String(q.shipping).replace(",", "."));
  if (q.status !== undefined) { if (q.status === "" || q.status === "200") delete o.status; else o.status = Number(q.status); }
  // Spätná kompatibilita: noJsonLd=1 je to isté ako structured=nojsonld.
  if (q.noJsonLd !== undefined && q.structured === undefined) q.structured = ["1", "true", "on"].includes(String(q.noJsonLd)) ? "nojsonld" : "full";
  if (q.delayMs !== undefined) o.delayMs = Number(q.delayMs) || 0;
  const errors = [
    o.status !== undefined && !STATUSES.includes(o.status) ? `status must be one of: 200, ${STATUSES.join(", ")}` : null,
    setEnum(o, "structured", q.structured, STRUCTURED),
    setEnum(o, "priceMode", q.priceMode, PRICE_MODES),
    setEnum(o, "priceFormat", q.priceFormat, v.PRICE_FORMATS),
    setEnum(o, "layout", q.layout, [1, 2], Number),
  ].filter(Boolean);
  delete o.noJsonLd;
  if (o.structured === "full") delete o.structured;
  if (o.priceMode === "show") delete o.priceMode;
  if (errors.length) { if (o.status !== undefined && !STATUSES.includes(o.status)) delete o.status; return res.status(400).json({ errors }); }
  if (isForm(req)) return res.redirect("/__test");
  res.json({ slug: base.slug, override: o });
});

// ---------- Statické súbory, robots, sitemap ----------
app.use("/static", express.static(path.join(__dirname, "public")));
app.use("/photos", express.static(path.join(__dirname, "public", "photos"), { maxAge: "1d" }));

app.get("/fotky", (req, res) => {
  let list = [];
  try { list = JSON.parse(fs.readFileSync(path.join(__dirname, "public", "photos", "credits.json"), "utf8")); } catch (e) {}
  res.send(v.credits(list));
});

app.get("/robots.txt", (req, res) =>
  res.type("text/plain").send(`User-agent: *\nAllow: /\nDisallow: /kosik\nDisallow: /__test\nSitemap: ${req.protocol}://${req.get("host")}/sitemap.xml\n`)
);
app.get("/sitemap.xml", (req, res) => {
  const base = `${req.protocol}://${req.get("host")}`;
  const urls = [
    "/",
    ...categories.map((c) => "/kategoria/" + c.slug),
    ...all()
      .filter((p) => ![404, 410].includes(p.status))
      .map((p) => "/produkt/" + p.slug + (p.status === 301 ? MOVED_SUFFIX : "")),
  ];
  res.type("application/xml").send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map((u) => `  <url><loc>${base}${u}</loc></url>`).join("\n") +
      `\n</urlset>`
  );
});

// SVG placeholder obrázky produktov
app.get("/img/:slug.svg", (req, res) => {
  const p = bySlug(req.params.slug);
  if (!p) return res.status(404).end();
  res.type("image/svg+xml").set("Cache-Control", "public, max-age=3600").send(v.productSvg(p));
});

// ---------- Stránky obchodu ----------
app.get("/", (req, res) => {
  const list = listed();
  res.send(v.home({ categories, deals: list.filter((p) => p.oldPrice).slice(0, 4), top: [...list].sort((a, b) => b.reviews - a.reviews).slice(0, 4) }));
});

app.get("/kategoria/:slug", (req, res) => {
  const cat = catIndex[req.params.slug];
  if (!cat) return res.status(404).send(v.notFound());
  let list = listed().filter((p) => p.category === cat.slug);
  const inStock = req.query.dostupne === "1";
  if (inStock) list = list.filter((p) => p.stock > 0);
  const sort = req.query.sort || "";
  const sorters = { cena_asc: (a, b) => a.price - b.price, cena_desc: (a, b) => b.price - a.price, hodnotenie: (a, b) => b.rating - a.rating };
  if (sorters[sort]) list.sort(sorters[sort]);
  res.send(v.category({ cat, list, sort, inStock, categories }));
});

app.get("/hladat", (req, res) => {
  const q = String(req.query.q || "").trim();
  const ql = q.toLowerCase();
  const list = q ? listed().filter((p) => [p.name, p.brand, p.ean, p.sku].some((s) => String(s).toLowerCase().includes(ql))) : [];
  res.send(v.search({ q, list, categories }));
});

// Nájde produkt podľa slugu; "<slug>-novy" platí len vtedy, keď je produkt presunutý (status=301).
function resolve(slug) {
  const direct = bySlug(slug);
  if (direct) return { p: getP(direct), moved: false };
  if (slug.endsWith(MOVED_SUFFIX)) {
    const base = bySlug(slug.slice(0, -MOVED_SUFFIX.length));
    if (base && getP(base).status === 301) return { p: getP(base), moved: true };
  }
  return null;
}

// Spoločné chybové stavy pre stránku produktu aj API ceny. Vracia true, ak už odpovedal.
function sendStatus(res, p, json) {
  const send = (code, html, headers = {}) => {
    res.status(code).set(headers);
    return json ? res.json({ error: code }) : res.send(html());
  };
  if (p.status === 404 || p.status === 410) { send(p.status, () => v.notFound(p.status === 410 ? "Produkt bol stiahnutý z ponuky." : undefined)); return true; }
  if (p.status === 429) { send(429, v.rateLimited, { "Retry-After": "30" }); return true; }
  if (p.status === 503) { send(503, v.unavailable, { "Retry-After": "30" }); return true; }
  // Simulácia stránky s overením prehliadača (len na testovanie detekcie, nič reálne)
  if (p.status === 403) { send(403, v.challenge, { "cf-ray": "dummy1234567890-BTS", server: "cloudflare-dummy" }); return true; }
  return false;
}

const qs = (req) => (req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : "");

app.get("/produkt/:slug", async (req, res) => {
  const r = resolve(req.params.slug);
  if (!r) return res.status(404).send(v.notFound());
  const { p, moved } = r;
  if (p.delayMs) await new Promise((ok) => setTimeout(ok, p.delayMs));
  if (p.status === 301 && !moved) return res.redirect(301, `/produkt/${p.slug}${MOVED_SUFFIX}${qs(req)}`);
  if (sendStatus(res, p, false)) return;
  res.send(v.product({ p, cat: catIndex[p.category], similar: similar(p), categories, variantId: req.query.variant }));
});

// Cena pre stránky s priceMode=js (volá ju JavaScript na stránke produktu).
app.get("/api/cena/:slug", async (req, res) => {
  const r = resolve(req.params.slug);
  if (!r) return res.status(404).json({ error: 404 });
  const { p } = r;
  if (p.delayMs) await new Promise((ok) => setTimeout(ok, p.delayMs));
  if (sendStatus(res, p, true)) return;
  const pv = v.view(p, req.query.variant);
  if (pv.priceMode === "hidden") return res.json({ slug: p.slug, price: null, currency: "EUR", priceHtml: "Cena na dopyt" });
  res.json({
    slug: p.slug,
    variant: pv.variant ? pv.variant.id : null,
    price: pv.price.toFixed(2),
    currency: "EUR",
    priceHtml: v.formatPrice(pv.price, pv.priceFormat),
    availability: p.stock > 0 ? "InStock" : "OutOfStock",
    availabilityHtml: v.badge(p),
    shipping: Number(p.shipping).toFixed(2),
  });
});

app.get("/kosik", (req, res) => res.send(v.cart({ categories, products: all() })));

app.use((req, res) => res.status(404).send(v.notFound()));

app.listen(PORT, () => {
  console.log(`Dummy e-shop beží na http://localhost:${PORT}`);
  console.log(`Test ovládanie: http://localhost:${PORT}/__test`);
});
