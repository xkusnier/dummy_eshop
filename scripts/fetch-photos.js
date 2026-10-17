// Stiahne fotky produktov z Wikimedia Commons (voľné licencie) do public/photos/ a zapíše autorov do credits.json.
// Použitie:  npm run photos            (preskočí produkty, ktoré už fotku majú)
//            npm run photos -- --force (stiahne znova všetko)
// Potrebuje internet a Node 18+. Výsledok si prezri očami: vyhľadávanie vezme prvý vhodný obrázok, nemusí byť vždy ten pravý.
// Ručná výmena: ulož vlastnú fotku ako public/photos/<slug>.jpg (a uprav/doplň záznam v credits.json).
const fs = require("fs");
const path = require("path");
const { products } = require("../lib/data");

const OUT = path.join(__dirname, "..", "public", "photos");
const CREDITS = path.join(OUT, "credits.json");
const FORCE = process.argv.includes("--force");
const UA = "dummy-eshop-school-project/1.0 (educational test shop; contact: jozef.kusnier@sensoneo.com)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (h) => String(h || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const FREE = /^(CC0|CC BY|CC-BY|Public domain|PD)/i;

async function api(params) {
  const url = "https://commons.wikimedia.org/w/api.php?" + new URLSearchParams({ format: "json", origin: "*", ...params });
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error("API " + res.status);
  return res.json();
}

async function findImage(query) {
  const data = await api({
    action: "query", generator: "search", gsrsearch: `${query} filetype:bitmap`, gsrnamespace: "6", gsrlimit: "12",
    prop: "imageinfo", iiprop: "url|extmetadata|size|mime", iiurlwidth: "900",
  });
  const pages = Object.values((data.query && data.query.pages) || {}).sort((a, b) => a.index - b.index);
  for (const pg of pages) {
    const ii = pg.imageinfo && pg.imageinfo[0];
    if (!ii || !/^image\/(jpeg|png)$/.test(ii.mime) || ii.width < 600) continue;
    const m = ii.extmetadata || {};
    const lic = strip(m.LicenseShortName && m.LicenseShortName.value);
    if (!FREE.test(lic)) continue;
    return {
      url: ii.thumburl || ii.url, mime: ii.mime, license: lic,
      author: strip(m.Artist && m.Artist.value) || "neznámy autor",
      title: pg.title, page: ii.descriptionurl,
    };
  }
  return null;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  let credits = [];
  try { credits = JSON.parse(fs.readFileSync(CREDITS, "utf8")); } catch (e) {}
  const have = (slug) => ["jpg", "png"].some((e) => fs.existsSync(path.join(OUT, `${slug}.${e}`)));
  const missing = [];

  for (const p of products) {
    if (!FORCE && have(p.slug)) { console.log("= už je:", p.slug); continue; }
    try {
      const img = await findImage(p.commonsQuery || p.name);
      if (!img) { console.log("✗ nenájdené:", p.slug, `(hľadané: ${p.commonsQuery})`); missing.push(p.slug); await sleep(800); continue; }
      const res = await fetch(img.url, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error("download " + res.status);
      const ext = img.mime === "image/png" ? "png" : "jpg";
      fs.writeFileSync(path.join(OUT, `${p.slug}.${ext}`), Buffer.from(await res.arrayBuffer()));
      credits = credits.filter((c) => c.slug !== p.slug);
      credits.push({ slug: p.slug, file: `${p.slug}.${ext}`, author: img.author, license: img.license, page: img.page, title: img.title });
      console.log("✓", p.slug, "←", img.title, `[${img.license}]`);
    } catch (e) {
      console.log("✗ chyba:", p.slug, e.message);
      missing.push(p.slug);
    }
    await sleep(1200); // slušne voči Wikimedia
  }
  fs.writeFileSync(CREDITS, JSON.stringify(credits, null, 2));
  console.log(`\nHotovo. Fotky: ${credits.length}/${products.length}. Bez fotky (placeholder): ${missing.join(", ") || "–"}`);
  console.log("Skontroluj fotky v public/photos/ – nesprávnu vymaž alebo nahraď vlastnou.");
})();
