const { categories, catIndex } = require("./data");

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n) => new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR" }).format(n);
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

function card(p) {
  const disc = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  return `<article class="card" data-product="${esc(p.slug)}">
  ${disc ? `<span class="disc">-${disc}%</span>` : ""}
  <a href="/produkt/${p.slug}"><img src="${p.img}" alt="${esc(p.name)}" loading="lazy" width="240" height="180"></a>
  <h3><a href="/produkt/${p.slug}">${esc(p.name)}</a></h3>
  <div class="rating" title="${p.rating}/5">${stars(p.rating)} <small>(${p.reviews})</small></div>
  <div class="prices">${p.oldPrice ? `<s class="old">${fmt(p.oldPrice)}</s>` : ""}<span class="price">${fmt(p.price)}</span></div>
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

function jsonLd(p, cat) {
  const data = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: p.name,
    image: `${p.img}`,
    description: p.description,
    sku: p.sku,
    gtin13: p.ean,
    brand: { "@type": "Brand", name: p.brand },
    category: cat.name,
    aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating, reviewCount: p.reviews },
    offers: {
      "@type": "Offer",
      url: `/produkt/${p.slug}`,
      priceCurrency: "EUR",
      price: p.price.toFixed(2),
      availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

function product({ p, cat, similar }) {
  const disc = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  return layout({
    title: `${p.name} | TechMarket`,
    desc: p.description,
    body: `
<nav class="crumbs"><a href="/">Domov</a> › <a href="/kategoria/${cat.slug}">${esc(cat.name)}</a> › <span>${esc(p.name)}</span></nav>
<section class="detail" itemscope itemtype="https://schema.org/Product">
  <div class="gallery"><img src="${p.img}" alt="${esc(p.name)}" width="480" height="360" itemprop="image"></div>
  <div class="info">
    <h1 itemprop="name">${esc(p.name)}</h1>
    <p class="meta">Značka: <b itemprop="brand">${esc(p.brand)}</b> · Kód: <span itemprop="sku">${esc(p.sku)}</span> · EAN: <span class="ean" itemprop="gtin13">${p.ean}</span></p>
    <div class="rating">${stars(p.rating)} <small>${p.rating}/5 (${p.reviews} hodnotení)</small></div>
    <div class="buybox" itemprop="offers" itemscope itemtype="https://schema.org/Offer">
      <meta itemprop="priceCurrency" content="EUR">
      ${p.oldPrice ? `<div><s class="old">${fmt(p.oldPrice)}</s> <span class="disc inline">-${disc}%</span></div>` : ""}
      <div class="price big" id="price" data-price="${p.price.toFixed(2)}" itemprop="price" content="${p.price.toFixed(2)}">${fmt(p.price)}</div>
      <div id="availability">${badge(p)}</div>
      <link itemprop="availability" href="https://schema.org/${p.stock > 0 ? "InStock" : "OutOfStock"}">
      <p class="muted">Doprava od 3,90 € · Doručenie do 2 pracovných dní</p>
      <button class="buy" data-add="${p.slug}" ${p.stock <= 0 ? "disabled" : ""}>${p.stock > 0 ? "Do košíka" : "Nedostupné"}</button>
    </div>
    <p itemprop="description">${esc(p.description)}</p>
  </div>
</section>
<section>
  <h2>Parametre</h2>
  <table class="specs">${Object.entries(p.specs).map(([k, val]) => `<tr><th>${esc(k)}</th><td>${esc(val)}</td></tr>`).join("")}</table>
</section>
<section class="similar">
  <h2>Podobné produkty</h2>
  ${grid(similar)}
</section>
${p.noJsonLd ? "" : jsonLd(p, cat)}`,
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

function testPanel(list, overrides) {
  return layout({
    title: "Test ovládanie – TechMarket",
    body: `<h1>Test ovládanie</h1>
<p class="muted">Mení stav produktov v pamäti servera (reset = <a href="/__test/reset">/__test/reset</a>). API: <code>/__test/set/:slug?price=299&amp;stock=0&amp;status=404|410|429|503|403&amp;noJsonLd=1&amp;delayMs=500</code> · stav: <a href="/__test/state">/__test/state</a></p>
<table class="specs test">
<tr><th>Produkt</th><th>Cena</th><th>Sklad</th><th>HTTP stav</th><th>Bez JSON-LD</th><th>Oneskorenie ms</th><th></th></tr>
${list
  .map(
    (p) => `<tr>
<td><a href="/produkt/${p.slug}">${esc(p.name)}</a>${overrides[p.slug] ? " <b>*</b>" : ""}</td>
<td><input form="f-${p.slug}" name="price" value="${p.price}" size="7"></td>
<td><input form="f-${p.slug}" name="stock" value="${p.stock}" size="3"></td>
<td><select form="f-${p.slug}" name="status">${["", "404", "410", "429", "503", "403"].map((s) => `<option value="${s}"${String(p.status || "") === s ? " selected" : ""}>${s || "200 OK"}</option>`).join("")}</select></td>
<td><input form="f-${p.slug}" type="checkbox" name="noJsonLd" value="1"${p.noJsonLd ? " checked" : ""}></td>
<td><input form="f-${p.slug}" name="delayMs" value="${p.delayMs || 0}" size="5"></td>
<td><form id="f-${p.slug}" method="post" action="/__test/set/${p.slug}"><button>Uložiť</button></form></td></tr>`
  )
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

module.exports = { credits, home, category, search, product, cart, notFound, rateLimited, unavailable, challenge, productSvg, testPanel };
