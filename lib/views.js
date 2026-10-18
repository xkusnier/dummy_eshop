const { categories, catIndex } = require("./data");

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n) => new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR" }).format(n);

// ---------- Formáty cien (test extrakcie) ----------
// SK základná sadzba DPH od 1. 1. 2025 je 23 %. Ceny v dátach sú s DPH.
const VAT_RATE = 0.23;
const NB = " ";
const PRICE_FORMATS = ["default", "dash", "eur-code", "en", "from", "split", "vat"];
const group = (intStr, sep) => intStr.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
// Vracia HTML (len čísla a pevný text, nie je čo escapovať).
function formatPrice(n, format = "default") {
  const [i, d] = Number(n).toFixed(2).split(".");
  switch (format) {
    case "dash": return d === "00" ? `${group(i, " ")},-${NB}€` : `${group(i, " ")},${d}${NB}€`; // 1 199,- €
    case "eur-code": return `${group(i, ".")},${d} EUR`; // 1.199,00 EUR
    case "en": return `€${group(i, ",")}.${d}`; // €1,199.00
    case "from": return `od ${group(i, " ")}${d === "00" ? "" : "," + d}${NB}€`; // od 1 199 €
    case "split": return `<span class="int">${group(i, " ")}</span><span class="dec">,${d}</span>${NB}<span class="cur">€</span>`;
    case "vat": return `${fmt(n)} <small class="vat">s DPH</small><br><small class="novat">${fmt(n / (1 + VAT_RATE))} bez DPH</small>`;
    default: return fmt(n); // 1 199,00 €
  }
}

// Efektívne nastavenie produktu (základ + test overrides + vybraný variant).
function view(p, variantId) {
  const variant = p.variants ? p.variants.find((v) => v.id === variantId) || p.variants[0] : null;
  const structured = p.structured || (p.noJsonLd ? "nojsonld" : "full"); // full | nojsonld | none
  return {
    variant,
    name: variant ? variant.name : p.name,
    price: Math.round((p.price + (variant ? variant.delta : 0)) * 100) / 100,
    ean: variant ? variant.ean : p.ean,
    sku: variant ? variant.sku : p.sku,
    structured,
    microdata: structured !== "none",
    jsonLd: structured === "full",
    priceMode: p.priceMode || "show", // show | hidden | js
    priceFormat: PRICE_FORMATS.includes(p.priceFormat) ? p.priceFormat : "default",
    layout: Number(p.layout) === 2 ? 2 : 1,
  };
}

const stars = (r) => "★".repeat(Math.round(r)) + "☆".repeat(5 - Math.round(r));

function layout({ title, body, cats = categories, q = "", desc = "TechMarket – dummy e-shop na testovanie." }) {
  return `<!doctype html>
<html lang="sk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="stylesheet" href="/static/style.css">
</head>
<body>
<header class="top">
  <div class="wrap bar">
    <a class="logo" href="/">Tech<span>Market</span></a>
    <form class="search" action="/hladat" method="get">
      <input type="search" name="q" value="${esc(q)}" placeholder="Hľadať produkty, značky, EAN…" aria-label="Hľadať">
      <button type="submit">Hľadať</button>
    </form>
    <a class="cart" href="/kosik">🛒 Košík <b id="cart-count">0</b></a>
  </div>
  <nav class="wrap cats">
    ${cats.map((c) => `<a href="/kategoria/${c.slug}">${c.icon} ${esc(c.name)}</a>`).join("")}
  </nav>
</header>
<main class="wrap">
${body}
</main>
<footer>
  <div class="wrap">
    <p>TechMarket – dummy e-shop pre testovanie. Názvy a parametre produktov sú reálne, ale ceny, sklad, hodnotenia a EAN sú vymyslené. Nejde o skutočný obchod.</p>
    <p><a href="/robots.txt">robots.txt</a> · <a href="/sitemap.xml">sitemap.xml</a> · <a href="/fotky">zdroje fotografií</a> · <a href="/__test">test ovládanie</a></p>
  </div>
</footer>
<script>
(function(){
  function get(){try{return JSON.parse(localStorage.getItem("cart")||"[]")}catch(e){return[]}}
  function show(){var el=document.getElementById("cart-count");if(el)el.textContent=get().reduce(function(s,i){return s+i.qty},0)}
  document.addEventListener("click",function(e){
    var b=e.target.closest("[data-add]");if(!b)return;
    var c=get(),s=b.getAttribute("data-add"),i=c.find(function(x){return x.slug===s});
    if(i)i.qty++;else c.push({slug:s,qty:1});
    try{localStorage.setItem("cart",JSON.stringify(c))}catch(e){}
    show();b.textContent="Pridané ✓";
  });
  show();
})();
</script>
</body>
</html>`;
}

function badge(p) {
  if (p.stock <= 0) return `<span class="stock out">Vypredané</span>`;
  if (p.stock <= 5) return `<span class="stock low">Posledné kusy (${p.stock} ks)</span>`;
  return `<span class="stock in">Na sklade</span>`;
}

function cardPrice(p) {
  const v = view(p);
  if (v.priceMode === "hidden") return `<span class="price ask">Cena na dopyt</span>`;
  const old = p.oldPrice ? `<s class="old">${formatPrice(p.oldPrice, v.priceFormat)}</s>` : "";
  return `${old}<span class="price">${formatPrice(v.price, v.priceFormat)}</span>`;
}

function card(p) {
  const disc = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  return `<article class="card" data-product="${esc(p.slug)}">
  ${disc ? `<span class="disc">-${disc}%</span>` : ""}
  <a href="/produkt/${p.slug}"><img src="${p.img}" alt="${esc(p.name)}" loading="lazy" width="240" height="180"></a>
  <h3><a href="/produkt/${p.slug}">${esc(p.name)}</a></h3>
  <div class="rating" title="${p.rating}/5">${stars(p.rating)} <small>(${p.reviews})</small></div>
  <div class="prices">${cardPrice(p)}</div>
  ${badge(p)}
</article>`;
}

const grid = (list) => (list.length ? `<div class="grid">${list.map(card).join("")}</div>` : `<p class="empty">Žiadne produkty.</p>`);

function home({ categories: cats, deals, top }) {
  return layout({
    title: "TechMarket – elektronika za výhodné ceny",
    body: `
<section class="hero"><h1>Elektronika za výhodné ceny</h1><p>Smartfóny, notebooky, televízory, audio a herné príslušenstvo.</p></section>
<h2>Kategórie</h2>
<div class="catgrid">${cats.map((c) => `<a class="catcard" style="--c:${c.color}" href="/kategoria/${c.slug}"><span>${c.icon}</span><b>${esc(c.name)}</b><small>${esc(c.desc)}</small></a>`).join("")}</div>
<h2>Akciové ponuky</h2>${grid(deals)}
<h2>Najobľúbenejšie</h2>${grid(top)}`,
  });
}

function category({ cat, list, sort, inStock }) {
  const opt = (v, l) => `<option value="${v}"${sort === v ? " selected" : ""}>${l}</option>`;
  return layout({
    title: `${cat.name} – TechMarket`,
    body: `
<nav class="crumbs"><a href="/">Domov</a> › <span>${esc(cat.name)}</span></nav>
<h1>${esc(cat.name)}</h1><p class="muted">${esc(cat.desc)} (${list.length} produktov)</p>
<form class="filters" method="get">
  <label>Zoradiť: <select name="sort" onchange="this.form.submit()">
    ${opt("", "Odporúčané")}${opt("cena_asc", "Cena: od najnižšej")}${opt("cena_desc", "Cena: od najvyššej")}${opt("hodnotenie", "Hodnotenie")}
  </select></label>
  <label><input type="checkbox" name="dostupne" value="1" ${inStock ? "checked" : ""} onchange="this.form.submit()"> Len dostupné</label>
</form>
${grid(list)}`,
  });
}

function search({ q, list }) {
  return layout({
    title: `Hľadať: ${q} – TechMarket`,
    q,
    body: `<h1>Výsledky hľadania: „${esc(q)}"</h1><p class="muted">${list.length} produktov</p>${grid(list)}`,
  });
}

const availUrl = (p) => `https://schema.org/${p.stock > 0 ? "InStock" : "OutOfStock"}`;

function shippingLd(p) {
  return {
    "@type": "OfferShippingDetails",
    shippingRate: { "@type": "MonetaryAmount", value: Number(p.shipping).toFixed(2), currency: "EUR" },
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "SK" },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
      transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 2, unitCode: "DAY" },
    },
  };
}

function offerLd(p, price, url, withPrice) {
  const o = { "@type": "Offer", url, priceCurrency: "EUR", availability: availUrl(p), itemCondition: "https://schema.org/NewCondition", shippingDetails: shippingLd(p) };
  if (withPrice) o.price = price.toFixed(2);
  return o;
}

function jsonLd(p, cat, v) {
  const withPrice = v.priceMode === "show"; // pri "hidden" a "js" cena v JSON-LD nie je
  const common = {
    image: `${p.img}`,
    description: p.description,
    brand: { "@type": "Brand", name: p.brand },
    category: cat.name,
    aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating, reviewCount: p.reviews },
  };
  let data;
  if (p.variants) {
    data = {
      "@context": "https://schema.org/",
      "@type": "ProductGroup",
      name: p.name,
      productGroupID: p.sku,
      variesBy: p.variesBy === "color" ? "https://schema.org/color" : "https://schema.org/size",
      ...common,
      hasVariant: p.variants.map((x) => ({
        "@type": "Product",
        name: x.name,
        sku: x.sku,
        gtin13: x.ean,
        [p.variesBy === "color" ? "color" : "size"]: x.label,
        offers: offerLd(p, p.price + x.delta, `/produkt/${p.slug}?variant=${x.id}`, withPrice),
      })),
    };
  } else {
    data = {
      "@context": "https://schema.org/",
      "@type": "Product",
      name: v.name,
      sku: v.sku,
      gtin13: v.ean,
      ...common,
      offers: offerLd(p, v.price, `/produkt/${p.slug}`, withPrice),
    };
  }
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

// Cena na stránke produktu podľa režimu: show (HTML), hidden (cena na dopyt), js (doplní ju až JavaScript).
function priceBlock(p, v, cls) {
  const md = (s) => (v.microdata ? s : "");
  if (v.priceMode === "hidden") return `<div class="${cls} ask" data-price-missing="1">Cena na dopyt</div>`;
  if (v.priceMode === "js") return `<div class="${cls}" data-js-price>Načítavam cenu…</div>`;
  // Pri structured=none nie je v HTML žiadna strojovo čitateľná cena (ani data-price), len viditeľný text.
  const attrs = v.layout === 1 ? ` id="price"${md(` data-price="${v.price.toFixed(2)}"`)}` : "";
  return `<div class="${cls}"${attrs}${md(` itemprop="price" content="${v.price.toFixed(2)}"`)}>${formatPrice(v.price, v.priceFormat)}</div>`;
}

function shippingText(p) {
  const s = Number(p.shipping);
  return `<p class="muted shipping" data-shipping="${s.toFixed(2)}">${s === 0 ? "Doprava zadarmo" : `Doprava: ${fmt(s)}`} · Doručenie do 2 pracovných dní</p>`;
}

function variantPicker(p, v) {
  if (!p.variants) return "";
  return `<div class="variants"><span class="muted">${p.variesBy === "color" ? "Farba" : "Pamäť"}:</span> ${p.variants
    .map((x) => `<a class="variant${x.id === v.variant.id ? " active" : ""}" href="?variant=${x.id}" data-variant="${x.id}">${esc(x.label)} <small>${v.priceMode === "show" ? formatPrice(p.price + x.delta, v.priceFormat) : ""}</small></a>`)
    .join(" ")}</div>`;
}

function jsPriceScript(p, v) {
  if (v.priceMode !== "js") return "";
  const q = v.variant ? `?variant=${v.variant.id}` : "";
  // Cena sa načíta až po 400 ms z API, statické HTML ju neobsahuje (test pre Playwright fetcher).
  return `<script>setTimeout(function(){fetch("/api/cena/${p.slug}${q}").then(function(r){return r.json()}).then(function(d){
document.querySelectorAll("[data-js-price]").forEach(function(el){el.innerHTML=d.priceHtml;el.setAttribute("data-price",d.price);el.id=el.id||"price";});
var a=document.getElementById("availability");if(a&&d.availabilityHtml)a.innerHTML=d.availabilityHtml;})},400);</script>`;
}

function product({ p, cat, similar, variantId }) {
  const v = view(p, variantId);
  const md = (s) => (v.microdata ? s : "");
  const disc = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  const showOld = p.oldPrice && v.priceMode === "show";
  const buy = `<button class="buy" data-add="${p.slug}" ${p.stock <= 0 || v.priceMode === "hidden" ? "disabled" : ""}>${v.priceMode === "hidden" ? "Kontaktujte nás" : p.stock > 0 ? "Do košíka" : "Nedostupné"}</button>`;
  const availability = v.priceMode === "js" ? `<span class="muted">…</span>` : badge(p);
  const info =
    v.layout === 1
      ? `
  <div class="info">
    <h1${md(` itemprop="name"`)}>${esc(v.name)}</h1>
    <p class="meta">Značka: <b${md(` itemprop="brand"`)}>${esc(p.brand)}</b> · Kód: <span${md(` itemprop="sku"`)}>${esc(v.sku)}</span> · EAN: <span class="ean"${md(` itemprop="gtin13"`)}>${v.ean}</span></p>
    <div class="rating">${stars(p.rating)} <small>${p.rating}/5 (${p.reviews} hodnotení)</small></div>
    ${variantPicker(p, v)}
    <div class="buybox"${md(` itemprop="offers" itemscope itemtype="https://schema.org/Offer"`)}>
      ${md(`<meta itemprop="priceCurrency" content="EUR">`)}
      ${showOld ? `<div><s class="old">${formatPrice(p.oldPrice, v.priceFormat)}</s> <span class="disc inline">-${disc}%</span></div>` : ""}
      ${priceBlock(p, v, "price big")}
      <div id="availability">${availability}</div>
      ${v.priceMode === "show" ? md(`<link itemprop="availability" href="${availUrl(p)}">`) : ""}
      ${shippingText(p)}
      ${buy}
    </div>
    <p${md(` itemprop="description"`)}>${esc(p.description)}</p>
  </div>`
      : // Layout 2: iná štruktúra a triedy (simulácia redizajnu e-shopu). Selektory z layoutu 1 tu nefungujú.
        `
  <div class="pdp">
    <div class="pdp-head"><h2 class="pdp-title"${md(` itemprop="name"`)}>${esc(v.name)}</h2>
      <ul class="pdp-meta"><li>${esc(p.brand)}</li><li>Kat. č. ${esc(v.sku)}</li><li data-gtin>${v.ean}</li></ul></div>
    ${variantPicker(p, v)}
    <aside class="pdp-cost"${md(` itemprop="offers" itemscope itemtype="https://schema.org/Offer"`)}>
      ${md(`<meta itemprop="priceCurrency" content="EUR">`)}
      <span class="pdp-cost__label">Naša cena</span>
      ${priceBlock(p, v, "pdp-cost__value")}
      ${showOld ? `<span class="pdp-cost__was">Pôvodne ${formatPrice(p.oldPrice, v.priceFormat)}</span>` : ""}
      <div class="pdp-stock" id="availability">${availability}</div>
      ${shippingText(p)}
      ${buy}
    </aside>
    <div class="pdp-desc">${esc(p.description)}</div>
  </div>`;
  return layout({
    title: `${v.name} | TechMarket`,
    desc: p.description,
    body: `
<nav class="crumbs"><a href="/">Domov</a> › <a href="/kategoria/${cat.slug}">${esc(cat.name)}</a> › <span>${esc(v.name)}</span></nav>
<section class="detail${v.layout === 2 ? " v2" : ""}"${md(` itemscope itemtype="https://schema.org/Product"`)}>
  <div class="gallery"><img src="${p.img}" alt="${esc(v.name)}" width="480" height="360"${md(` itemprop="image"`)}></div>
  ${info}
</section>
<section>
  <h2>Parametre</h2>
  <table class="specs">${Object.entries(p.specs).map(([k, val]) => `<tr><th>${esc(k)}</th><td>${esc(val)}</td></tr>`).join("")}</table>
</section>
<section class="similar">
  <h2>Podobné produkty</h2>
  ${grid(similar)}
</section>
${v.jsonLd ? jsonLd(p, cat, v) : ""}
${jsPriceScript(p, v)}`,
  });
}

function cart({ products }) {
  return layout({
    title: "Košík – TechMarket",
    body: `<h1>Košík</h1><div id="cart"></div>
<script>
var P=${JSON.stringify(products.map((p) => ({ slug: p.slug, name: p.name, price: p.price })))};
var c=[];try{c=JSON.parse(localStorage.getItem("cart")||"[]")}catch(e){}
var el=document.getElementById("cart"),t=0;
if(!c.length){el.innerHTML="<p class='empty'>Košík je prázdny.</p>"}
else{el.innerHTML="<table class='specs'>"+c.map(function(i){var p=P.find(function(x){return x.slug===i.slug});if(!p)return"";t+=p.price*i.qty;
return "<tr><td><a href='/produkt/"+p.slug+"'>"+p.name+"</a></td><td>"+i.qty+" ks</td><td>"+(p.price*i.qty).toFixed(2).replace(".",",")+" €</td></tr>"}).join("")+"</table><p class='price big'>Spolu: "+t.toFixed(2).replace(".",",")+" €</p><p class='muted'>Dummy obchod – objednávku nie je možné dokončiť.</p>"}
</script>`,
  });
}

const notFound = (msg = "Stránka sa nenašla.") =>
  layout({ title: "404 – TechMarket", body: `<h1>404</h1><p>${esc(msg)}</p><p><a href="/">Späť na domovskú stránku</a></p>` });
const rateLimited = () => layout({ title: "429 – Príliš veľa požiadaviek", body: `<h1>429 Too Many Requests</h1><p>Príliš veľa požiadaviek. Skúste to neskôr.</p>` });
const unavailable = () => layout({ title: "503 – Služba nedostupná", body: `<h1>503 Service Unavailable</h1><p>Obchod je dočasne nedostupný.</p>` });
const challenge = () => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Just a moment...</title></head>
<body><h1>Just a moment...</h1><p>Checking if the site connection is secure. Please verify you are human. (dummy challenge page for testing)</p></body></html>`;

function productSvg(p) {
  const cat = catIndex[p.category];
  const label = p.name.length > 28 ? p.name.slice(0, 27) + "…" : p.name;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">
<rect width="480" height="360" fill="${cat.color}" opacity="0.12"/>
<rect x="20" y="20" width="440" height="320" rx="16" fill="none" stroke="${cat.color}" stroke-width="3" opacity="0.5"/>
<text x="240" y="170" font-size="96" text-anchor="middle">${cat.icon}</text>
<text x="240" y="250" font-family="Arial,sans-serif" font-size="22" font-weight="700" text-anchor="middle" fill="${cat.color}">${esc(label)}</text>
<text x="240" y="285" font-family="Arial,sans-serif" font-size="16" text-anchor="middle" fill="#555">${esc(p.brand)}</text>
</svg>`;
}

const STATUSES = ["", "301", "404", "410", "429", "503", "403"];
const STRUCTURED = [["full", "JSON-LD + microdata"], ["nojsonld", "len microdata"], ["none", "žiadne"]];
const PRICE_MODES = [["show", "v HTML"], ["hidden", "na dopyt"], ["js", "cez JavaScript"]];
const sel = (form, name, opts, cur) =>
  `<select form="${form}" name="${name}">${opts.map((o) => { const [val, label] = Array.isArray(o) ? o : [o, o]; return `<option value="${val}"${String(cur) === String(val) ? " selected" : ""}>${label || val}</option>`; }).join("")}</select>`;

function testPanel(list, overrides, site = {}) {
  return layout({
    title: "Test ovládanie – TechMarket",
    body: `<h1>Test ovládanie</h1>
<p class="muted">Mení stav produktov v pamäti servera. Reset všetkého: <a href="/__test/reset">/__test/reset</a> · stav: <a href="/__test/state">/__test/state</a></p>
<p class="muted">API produktu: <code>/__test/set/:slug?price=299&amp;oldPrice=&amp;stock=0&amp;shipping=0&amp;status=301|404|410|429|503|403&amp;structured=full|nojsonld|none&amp;priceMode=show|hidden|js&amp;priceFormat=${PRICE_FORMATS.join("|")}&amp;layout=1|2&amp;delayMs=500</code></p>
<p class="muted">API celého webu (prepíše predvolené hodnoty pre všetky produkty): <code>/__test/site?layout=2&amp;priceFormat=en</code></p>

<h2>Celý web</h2>
<form method="post" action="/__test/site" class="filters">
  <label>Layout: ${sel("", "layout", ["", "1", "2"], site.layout || "").replace(' form=""', "")}</label>
  <label>Formát ceny: ${sel("", "priceFormat", ["", ...PRICE_FORMATS], site.priceFormat || "").replace(' form=""', "")}</label>
  <button>Uložiť</button>
</form>

<h2>Produkty</h2>
<table class="specs test">
<tr><th>Produkt</th><th>Cena</th><th>Sklad</th><th>Doprava €</th><th>HTTP stav</th><th>Štruktúrované dáta</th><th>Cena</th><th>Formát</th><th>Layout</th><th>Oneskorenie ms</th><th></th></tr>
${list
  .map((p) => {
    const f = `f-${p.slug}`;
    const o = overrides[p.slug] || {};
    return `<tr>
<td><a href="/produkt/${p.slug}">${esc(p.name)}</a>${overrides[p.slug] ? " <b>*</b>" : ""}${p.variants ? " <small>(varianty)</small>" : ""}</td>
<td><input form="${f}" name="price" value="${p.price}" size="7"></td>
<td><input form="${f}" name="stock" value="${p.stock}" size="3"></td>
<td><input form="${f}" name="shipping" value="${p.shipping}" size="4"></td>
<td>${sel(f, "status", STATUSES.map((s) => [s, s || "200 OK"]), p.status || "")}</td>
<td>${sel(f, "structured", STRUCTURED, p.structured || (p.noJsonLd ? "nojsonld" : "full"))}</td>
<td>${sel(f, "priceMode", PRICE_MODES, p.priceMode || "show")}</td>
<td>${sel(f, "priceFormat", [["", "(web)"], ...PRICE_FORMATS], o.priceFormat || "")}</td>
<td>${sel(f, "layout", [["", "(web)"], "1", "2"], o.layout || "")}</td>
<td><input form="${f}" name="delayMs" value="${p.delayMs || 0}" size="5"></td>
<td><form id="${f}" method="post" action="/__test/set/${p.slug}"><button>Uložiť</button></form></td></tr>`;
  })
  .join("")}
</table>`,
  });
}

function credits(list) {
  return layout({
    title: "Zdroje fotografií – TechMarket",
    body: `<h1>Zdroje fotografií</h1><p class="muted">Fotografie produktov pochádzajú z Wikimedia Commons (voľné licencie). Produkty bez fotografie majú zástupný obrázok.</p>
<table class="specs">${list.map((c) => `<tr><td><a href="/produkt/${esc(c.slug)}">${esc(c.slug)}</a></td><td>${esc(c.author || "")}</td><td>${esc(c.license || "")}</td><td><a href="${esc(c.page || "#")}" rel="noopener">zdroj</a></td></tr>`).join("") || "<tr><td>Zatiaľ žiadne (spusti npm run photos).</td></tr>"}</table>`,
  });
}

module.exports = { credits, home, category, search, product, cart, notFound, rateLimited, unavailable, challenge, productSvg, testPanel, formatPrice, view, badge, PRICE_FORMATS };
