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
// overrides[slug] = { price, oldPrice, stock, status, noJsonLd, delayMs }
let overrides = {};
const getP = (p) => ({ ...p, ...(overrides[p.slug] || {}) });
const all = () => products.map(getP);
const bySlug = (s) => products.find((p) => p.slug === s);

function similar(p, n = 4) {
  const pool = all().filter((x) => x.slug !== p.slug);
  const same = pool
    .filter((x) => x.category === p.category)
    .sort((a, b) => Math.abs(a.price - p.price) - Math.abs(b.price - p.price));
  const others = pool
    .filter((x) => x.category !== p.category)
    .sort((a, b) => Math.abs(a.price - p.price) - Math.abs(b.price - p.price));
  return [...same, ...others].slice(0, n);
}

// ---------- Test ovládanie: /__test ----------
app.get("/__test", (req, res) => res.send(v.testPanel(all(), overrides)));
app.get("/__test/state", (req, res) => res.json({ overrides, products: all() }));
app.all("/__test/reset", (req, res) => {
  overrides = {};
  res.redirect("/__test");
});
// GET aj POST: /__test/set/:slug?price=299&stock=0&status=429&noJsonLd=1&delayMs=500
app.all("/__test/set/:slug", (req, res) => {
  const base = bySlug(req.params.slug);
  if (!base) return res.status(404).json({ error: "unknown slug" });
  const q = { ...req.query, ...req.body };
  if (req.method === "POST" && req.is("urlencoded") && q.noJsonLd === undefined) q.noJsonLd = "0"; // nezaškrtnutý checkbox
  const o = (overrides[base.slug] = overrides[base.slug] || {});
  if (q.price !== undefined && q.price !== "") o.price = Number(q.price);
  if (q.oldPrice !== undefined) o.oldPrice = q.oldPrice === "" ? null : Number(q.oldPrice);
  if (q.stock !== undefined && q.stock !== "") o.stock = Number(q.stock);
  if (q.status !== undefined) { if (q.status === "" || q.status === "200") delete o.status; else o.status = Number(q.status); }
  if (q.noJsonLd !== undefined) o.noJsonLd = q.noJsonLd === "1" || q.noJsonLd === "true" || q.noJsonLd === "on";
  if (q.delayMs !== undefined) o.delayMs = Number(q.delayMs) || 0;
  if (req.method === "POST" && req.is("urlencoded")) return res.redirect("/__test");
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
  const urls = ["/", ...categories.map((c) => "/kategoria/" + c.slug), ...products.map((p) => "/produkt/" + p.slug)];
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
  const list = all();
  res.send(v.home({ categories, deals: list.filter((p) => p.oldPrice).slice(0, 4), top: [...list].sort((a, b) => b.reviews - a.reviews).slice(0, 4) }));
});

app.get("/kategoria/:slug", (req, res) => {
  const cat = catIndex[req.params.slug];
  if (!cat) return res.status(404).send(v.notFound());
  let list = all().filter((p) => p.category === cat.slug);
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
  const list = q ? all().filter((p) => [p.name, p.brand, p.ean, p.sku].some((s) => String(s).toLowerCase().includes(ql))) : [];
  res.send(v.search({ q, list, categories }));
});

app.get("/produkt/:slug", async (req, res) => {
  const base = bySlug(req.params.slug);
  if (!base) return res.status(404).send(v.notFound());
  const p = getP(base);
  if (p.delayMs) await new Promise((r) => setTimeout(r, p.delayMs));
  if (p.status === 404 || p.status === 410) return res.status(p.status).send(v.notFound(p.status === 410 ? "Produkt bol stiahnutý z ponuky." : undefined));
  if (p.status === 429) return res.status(429).set("Retry-After", "30").send(v.rateLimited());
  if (p.status === 503) return res.status(503).set("Retry-After", "30").send(v.unavailable());
  if (p.status === 403) {
    // Simulácia stránky s overením prehliadača (len na testovanie detekcie, nič reálne)
    return res.status(403).set({ "cf-ray": "dummy1234567890-BTS", server: "cloudflare-dummy" }).send(v.challenge());
  }
  res.send(v.product({ p, cat: catIndex[p.category], similar: similar(p), categories }));
});

app.get("/kosik", (req, res) => res.send(v.cart({ categories, products: all() })));

app.use((req, res) => res.status(404).send(v.notFound()));

app.listen(PORT, () => {
  console.log(`Dummy e-shop beží na http://localhost:${PORT}`);
  console.log(`Test ovládanie: http://localhost:${PORT}/__test`);
});
