// Dummy e-shop: reálne, populárne produkty so skutočnými parametrami (z oficiálnych stránok výrobcov).
// Ceny, sklad, hodnotenia a EAN sú VYMYSLENÉ (len na testovanie).
const fs = require("fs");
const path = require("path");

function ean13(base12) {
  const d = String(base12).padStart(12, "0").split("").map(Number);
  const sum = d.reduce((s, n, i) => s + n * (i % 2 === 0 ? 1 : 3), 0);
  return String(base12).padStart(12, "0") + ((10 - (sum % 10)) % 10);
}

const categories = [
  { slug: "smartfony", name: "Smartfóny", color: "#4f46e5", icon: "📱", desc: "Mobilné telefóny všetkých cenových kategórií." },
  { slug: "notebooky", name: "Notebooky", color: "#0891b2", icon: "💻", desc: "Notebooky pre prácu, školu aj hranie." },
  { slug: "televizory", name: "Televízory", color: "#be123c", icon: "📺", desc: "Smart TV s rôznymi uhlopriečkami." },
  { slug: "sluchadla", name: "Slúchadlá a audio", color: "#15803d", icon: "🎧", desc: "Slúchadlá, reproduktory a soundbary." },
  { slug: "hry", name: "Herné príslušenstvo", color: "#c2410c", icon: "🎮", desc: "Myši, klávesnice, ovládače a headsety." },
  { slug: "prislusenstvo", name: "Príslušenstvo", color: "#6b7280", icon: "🧩", desc: "Kryty, nabíjačky a drobnosti k elektronike." },
];

// [slug, kategória, názov, značka, cena, pôvodná cena|null, sklad, hodnotenie, počet hodnotení, popis, parametre, hľadací výraz pre Wikimedia Commons]
const raw = [
  // ---- Smartfóny ----
  ["apple-iphone-16-128gb", "smartfony", "Apple iPhone 16 128 GB", "Apple", 829, 879, 14, 4.7, 1240,
    "iPhone 16 má 6,1-palcový OLED displej Super Retina XDR, čip A18 a duálny fotoaparát s hlavným snímačom 48 Mpx. Obsahuje tlačidlo Camera Control a konektor USB-C.",
    { Displej: "6,1\" Super Retina XDR OLED, 2556 × 1179 px (460 ppi), Dynamic Island, jas až 2000 nitov (vonku)", Procesor: "Apple A18 (6-jadrový CPU, 5-jadrové GPU, 16-jadrový Neural Engine)", RAM: "8 GB", Pamäť: "128 GB", "Hlavný fotoaparát": "Duálny: 48 Mpx Fusion (f/1.6, OIS) + 12 Mpx ultraširokouhlý (f/2.2, 120°)", Batéria: "Li-Ion 3561 mAh; prehrávanie videa až 22 h; bezdrôtové MagSafe/Qi2 do 25 W", "Operačný systém": "iOS 18 (pri uvedení)", Hmotnosť: "170 g", Konektivita: "5G, Wi-Fi 7, Bluetooth 5.3, NFC, UWB, USB-C (USB 2), dual eSIM, IP68" },
    "Apple iPhone 16"],
  ["samsung-galaxy-s25-256gb", "smartfony", "Samsung Galaxy S25 256 GB", "Samsung", 899, null, 9, 4.6, 860,
    "Galaxy S25 je kompaktný vlajkový telefón s 6,2-palcovým displejom Dynamic LTPO AMOLED 2X a čipom Snapdragon 8 Elite. Má trojitý fotoaparát s hlavným snímačom 50 Mpx.",
    { Displej: "6,2\" Dynamic LTPO AMOLED 2X, 1080 × 2340 px (~416 ppi), 120 Hz, HDR10+, špičkový jas 2600 nitov, Gorilla Glass Victus 2", Procesor: "Qualcomm Snapdragon 8 Elite (3 nm), 8-jadrový, Adreno 830", RAM: "12 GB", Pamäť: "256 GB (UFS 4.0, bez slotu na kartu)", "Hlavný fotoaparát": "Trojitý: 50 Mpx (f/1.8, OIS) + 10 Mpx teleobjektív (3× zoom, OIS) + 12 Mpx ultraširokouhlý (120°)", Batéria: "Li-Ion 4000 mAh; 25 W drôtové nabíjanie; 15 W bezdrôtové (Qi2 Ready)", "Operačný systém": "Android 15 (pri uvedení)", Hmotnosť: "162 g", Konektivita: "5G, Wi-Fi 7, Bluetooth 5.4, NFC, USB-C 3.2, eSIM, IP68" },
    "Samsung Galaxy S25"],
  ["xiaomi-redmi-note-14-pro-5g-256gb", "smartfony", "Xiaomi Redmi Note 14 Pro 5G 256 GB", "Xiaomi", 329, 369, 22, 4.4, 530,
    "Redmi Note 14 Pro 5G má 6,67-palcový AMOLED displej s obnovovaním 120 Hz a hlavný fotoaparát s 200 Mpx. Je odolný proti vode a prachu (IP68) a podporuje 45 W nabíjanie.",
    { Displej: "6,67\" AMOLED, 2712 × 1220 px, do 120 Hz, špičkový jas 3000 nitov, Gorilla Glass Victus 2, Dolby Vision, HDR10+", Procesor: "MediaTek Dimensity 7300 Ultra (4 nm), 8-jadrový do 2,5 GHz, Mali-G615 MC2", RAM: "8 GB alebo 12 GB (podľa variantu)", Pamäť: "256 GB (UFS 2.2, bez slotu na kartu)", "Hlavný fotoaparát": "Trojitý: 200 Mpx (f/1.65, OIS) + 8 Mpx ultraširokouhlý + 2 Mpx makro", Batéria: "5110 mAh, 45 W rýchle nabíjanie", "Operačný systém": "Xiaomi HyperOS na Androide 14 (pri uvedení)", Hmotnosť: "190 g", Konektivita: "5G, Wi-Fi 6, Bluetooth 5.4, NFC, USB-C 2.0, dual SIM, IR vysielač, IP68" },
    "Xiaomi Redmi Note 14 Pro"],
  ["samsung-galaxy-a55-5g-128gb", "smartfony", "Samsung Galaxy A55 5G 128 GB", "Samsung", 379, null, 0, 4.3, 410,
    "Galaxy A55 5G je telefón strednej triedy so 6,6-palcovým displejom Super AMOLED 120 Hz a kovovým rámom. Má batériu 5000 mAh a odolnosť IP67. (Dummy: vypredané.)",
    { Displej: "6,6\" Super AMOLED, 1080 × 2340 px (~390 ppi), 120 Hz, HDR10+, Gorilla Glass Victus+", Procesor: "Exynos 1480 (4 nm), 8-jadrový (4× 2,75 GHz Cortex-A78 + 4× 2,0 GHz Cortex-A55), Xclipse 530", RAM: "6 GB alebo 8 GB (podľa variantu)", Pamäť: "128 GB (rozšíriteľná microSDXC)", "Hlavný fotoaparát": "Trojitý: 50 Mpx (f/1.8, OIS) + 12 Mpx ultraširokouhlý + 5 Mpx makro", Batéria: "Li-Ion 5000 mAh, 25 W drôtové nabíjanie", "Operačný systém": "Android 14 (pri uvedení)", Hmotnosť: "213 g", Konektivita: "5G, Wi-Fi 6, Bluetooth 5.3, NFC, USB-C 2.0, nano SIM alebo eSIM, IP67" },
    "Samsung Galaxy A55"],

  // ---- Notebooky ----
  ["apple-macbook-air-13-m4", "notebooky", "Apple MacBook Air 13\" M4 (16 GB / 256 GB)", "Apple", 1199, 1299, 8, 4.8, 640,
    "Tenký notebook s čipom Apple M4, 13,6\" displejom Liquid Retina a pasívnym chladením. Základná konfigurácia má 16 GB zjednotenej pamäte a 256 GB SSD.",
    { Displej: "13,6\" Liquid Retina (IPS, LED podsvietenie), 2560 × 1664, 224 ppi, 500 nitov, P3, True Tone", Procesor: "Apple M4, 10-jadrové CPU (4 výkonné + 6 úsporných), 16-jadrový Neural Engine", RAM: "16 GB zjednotená pamäť", SSD: "256 GB", Grafika: "Integrovaná 8-jadrová GPU (Apple M4)", Batéria: "53,8 Wh; až 18 h streamovania videa, až 15 h web", "Operačný systém": "macOS", Hmotnosť: "1,24 kg", Porty: "2× Thunderbolt 4 (USB-C), MagSafe 3, 3,5 mm jack" },
    "MacBook Air M4"],
  ["lenovo-ideapad-slim-3-15irh10", "notebooky", "Lenovo IdeaPad Slim 3 15IRH10 (Core i5-13420H)", "Lenovo", 649, null, 17, 4.2, 188,
    "Cenovo dostupný 15\" notebook s procesorom Intel Core i5-13420H a 15,3\" IPS displejom 16:10. Má dva sloty M.2 pre SSD a čítačku SD kariet.",
    { Displej: "15,3\" WUXGA (1920 × 1200), IPS, 300 nitov, antireflexný, 60 Hz", Procesor: "Intel Core i5-13420H (8 jadier: 4 P + 4 E, 12 vlákien, až 4,6 GHz)", RAM: "DDR5-4800 (podľa konfigurácie až 24 GB)", SSD: "M.2 2242 PCIe 4.0 NVMe (256 GB / 512 GB / 1 TB podľa konfigurácie)", Grafika: "Intel UHD Graphics (integrovaná)", Batéria: "50 Wh; prehrávanie videa až 14,5 h", "Operačný systém": "Windows 11 Home / Pro (podľa konfigurácie)", Hmotnosť: "od 1,59 kg", Porty: "2× USB-A (5 Gb/s), 1× USB-C (5 Gb/s, PD, DisplayPort 1.2), HDMI 1.4, 3,5 mm jack, čítačka SD kariet" },
    "Lenovo IdeaPad Slim 3"],
  ["dell-xps-13-dx13260", "notebooky", "Dell XPS 13 DX13260 (Core 5 320 / 8 GB / 512 GB)", "Dell", 1199, 1299, 3, 4.5, 72,
    "Najtenší a najľahší notebook rady XPS s 13,4\" dotykovým displejom 2.5K a 120 Hz. Základná konfigurácia má procesor Intel Core 5 320 a 52 Wh batériu.",
    { Displej: "13,4\" dotykový, 2.5K (2560 × 1600), 30–120 Hz, 500 nitov, InfinityEdge", Procesor: "Intel Core 5 320 (6 jadier, 6 MB cache, až 4,6 GHz)", RAM: "8 GB LPDDR5x, až 7467 MT/s (voliteľne 16 GB alebo 32 GB)", SSD: "512 GB SSD Gen4 x4 QLC (voliteľne 1 TB)", Grafika: "Intel Graphics (integrovaná)", Batéria: "3-článková, 52 Wh", "Operačný systém": "Windows 11 Home", Hmotnosť: "od 1 kg", Porty: "2× USB 3.2 Gen 2 (10 Gb/s) Type-C s DisplayPort a Power Delivery, bez čítačky kariet" },
    "Dell XPS 13"],
  ["asus-tuf-gaming-a15-fa507uv", "notebooky", "ASUS TUF Gaming A15 FA507UV (Ryzen 7 8845HS / RTX 4060)", "ASUS", 1299, 1399, 6, 4.6, 235,
    "Herný notebook s procesorom AMD Ryzen 7 8845HS, grafikou RTX 4060 a 90 Wh batériou. Má 15,6\" 144 Hz alebo 165 Hz IPS displej, prepínač MUX a Advanced Optimus.",
    { Displej: "15,6\" IPS, FHD 144 Hz alebo QHD 165 Hz (podľa konfigurácie), G-Sync, MUX Switch + NVIDIA Advanced Optimus", Procesor: "AMD Ryzen 7 8845HS (8 jadier, 16 vlákien, až 5,1 GHz, 24 MB cache), NPU až 16 TOPS", RAM: "DDR5-5600 SO-DIMM, 8 alebo 16 GB podľa konfigurácie, max. 32 GB", SSD: "PCIe 4.0 NVMe M.2, 512 GB / 1 TB / 2 TB podľa konfigurácie", Grafika: "NVIDIA GeForce RTX 4060 Laptop GPU, 8 GB GDDR6 (až 140 W)", Batéria: "90 Wh, 4-článková Li-ion", "Operačný systém": "Windows 11 Home / Pro alebo bez OS", Hmotnosť: "2,20 kg", Porty: "3,5 mm combo jack, HDMI 2.1 FRL, 2× USB 3.2 Gen 1 Type-A, USB 3.2 Gen 2 Type-C (DP/PD), USB4 Type-C (DP), RJ45 LAN" },
    "ASUS TUF Gaming A15"],

  // ---- Televízory ----
  ["lg-oled55c44la", "televizory", "LG OLED evo C4 55\" (OLED55C44LA)", "LG", 1399, 1599, 5, 4.8, 305,
    "55-palcový 4K OLED evo televízor s procesorom α9 AI Gen7 a natívnou frekvenciou 120 Hz (až 144 Hz pre hry a PC). Podporuje Dolby Vision, Dolby Atmos a má štyri porty HDMI 2.1.",
    { Uhlopriečka: "55\" (139 cm)", Rozlíšenie: "4K Ultra HD (3 840 × 2 160)", "Typ panelu": "OLED (OLED evo)", "Obnovovacia frekvencia": "120 Hz natívne (VRR do 144 Hz)", HDR: "Dolby Vision, HDR10, HLG", "Smart TV systém": "webOS 24", HDMI: "4× HDMI 2.1 (4K 120 Hz, eARC na HDMI 2, VRR, ALLM, QMS)", Zvuk: "2.2 kanála, 40 W, Dolby Atmos", Hmotnosť: "14,1 kg bez stojana, 16,0 kg so stojanom" },
    "LG OLED C4"],
  ["samsung-ue43du7172", "televizory", "Samsung Crystal UHD 43\" (UE43DU7172UXXH)", "Samsung", 329, 349, 19, 4.2, 512,
    "43-palcový základný 4K televízor s procesorom Crystal 4K a systémom Tizen. Má tri porty HDMI a podporuje HDR a HDR10+.",
    { Uhlopriečka: "43\" (109 cm)", Rozlíšenie: "4K Ultra HD (3 840 × 2 160)", "Typ panelu": "LED LCD (Crystal UHD)", "Obnovovacia frekvencia": "50 Hz", HDR: "HDR, HDR10+", "Smart TV systém": "Tizen", HDMI: "3× HDMI (4K 60 Hz, eARC/ARC)", Zvuk: "2 kanály, 20 W RMS", Hmotnosť: "7,1 kg bez stojana, 7,4 kg so stojanom" },
    "Samsung Crystal UHD DU7000"],
  ["sony-bravia-8-k55xr80", "televizory", "Sony BRAVIA 8 55\" OLED (K-55XR80)", "Sony", 1699, null, 2, 4.8, 97,
    "55-palcový OLED televízor s procesorom XR a systémom Google TV. Zvuk zabezpečuje technológia Acoustic Surface Audio+ s výkonom 5 × 10 W a podporou Dolby Atmos.",
    { Uhlopriečka: "55\" (139 cm)", Rozlíšenie: "4K (3 840 × 2 160)", "Typ panelu": "OLED", "Obnovovacia frekvencia": "120 Hz", HDR: "HDR10, HLG, Dolby Vision", "Smart TV systém": "Google TV", HDMI: "4× HDMI (4K 120 Hz, eARC, VRR na HDMI 3/4, ALLM)", Zvuk: "Acoustic Surface Audio+, 5 × 10 W, Dolby Atmos, DTS:X", Hmotnosť: "17,1 kg bez stojana, 18 kg so stojanom" },
    "Sony Bravia 8 OLED"],
  ["tcl-55c655", "televizory", "TCL C655 55\" QLED (55C655)", "TCL", 469, 529, 0, 4.3, 164,
    "55-palcový QLED televízor s 4K rozlíšením a systémom Google TV. Má audio systém Onkyo 2.1 s Dolby Atmos a podporu Dolby Vision a HDR10+. (Dummy: vypredané.)",
    { Uhlopriečka: "55\"", Rozlíšenie: "4K Ultra HD (3 840 × 2 160)", "Typ panelu": "QLED (Quantum Dot), podsvietenie DLED", HDR: "HDR10+, Dolby Vision", "Smart TV systém": "Google TV", HDMI: "3× HDMI (2.0 a 2.1), eARC", Zvuk: "2.1 kanála, 2 × 10 W + 15 W, Onkyo, Dolby Atmos, DTS Virtual:X", Hmotnosť: "11 kg bez stojana, 11,3 kg so stojanom" },
    "TCL C655"],

  // ---- Slúchadlá a audio ----
  ["apple-airpods-pro-3", "sluchadla", "Apple AirPods Pro 3", "Apple", 249, null, 30, 4.7, 1520,
    "Bezdrôtové slúchadlá do uší s aktívnym potlačením hluku, čipom H2 a puzdrom MagSafe s USB-C. Podporujú Adaptívny zvuk, Hearing Aid a snímanie tepovej frekvencie počas tréningu.",
    { Typ: "True wireless slúchadlá do uší (špuntové)", Pripojenie: "Bluetooth 5.3, čip Apple H2, nabíjacie puzdro MagSafe (USB-C)", "Potlačenie hluku": "Aktívne potlačenie hluku (ANC), režim Priepustnosť, Adaptívny zvuk", "Výdrž batérie": "Až 8 h v slúchadlách s ANC; až 24 h s puzdrom s ANC", Odolnosť: "IP57 (slúchadlá aj puzdro)", Hmotnosť: "5,55 g (slúchadlo); 43,99 g (puzdro)" },
    "Apple AirPods Pro"],
  ["sony-wh-1000xm5", "sluchadla", "Sony WH-1000XM5 bezdrôtové slúchadlá", "Sony", 329, 399, 12, 4.7, 2310,
    "Bezdrôtové slúchadlá cez hlavu s potlačením okolitého hluku a 30 mm budičmi. Majú dva procesory (V1 a QN1), podporujú LDAC a viacbodové pripojenie.",
    { Typ: "Uzavreté dynamické slúchadlá cez uši, 30 mm budiče", Pripojenie: "Bluetooth 5.2 (SBC, AAC, LDAC), 3,5 mm jack, viacbodové pripojenie", "Potlačenie hluku": "Áno, automatický optimalizátor, 8 mikrofónov, procesory V1 a QN1", "Výdrž batérie": "Až 30 h s ANC; až 40 h bez ANC; nabíjanie cez USB približne 3,5 h", Hmotnosť: "Približne 250 g", Ďalšie: "Frekvenčný rozsah 4 Hz – 40 kHz, DSEE Extreme, Speak-to-Chat, skladateľné puzdro" },
    "Sony WH-1000XM5"],
  ["jbl-flip-6", "sluchadla", "JBL Flip 6 prenosný reproduktor", "JBL", 119, 139, 41, 4.6, 3120,
    "Prenosný Bluetooth reproduktor s odolnosťou IP67 a výdržou až 12 hodín. Má dvojpásmový systém s tweeterom a dvoma pasívnymi basovými radiátormi a podporuje PartyBoost.",
    { Typ: "Prenosný Bluetooth reproduktor", Pripojenie: "Bluetooth 5.1, JBL PartyBoost, nabíjanie cez USB-C", "Výdrž batérie": "Až 12 h prehrávania; nabíjanie 2,5 h", Odolnosť: "IP67 (vodotesný a prachotesný)", Hmotnosť: "0,55 kg", Ďalšie: "Výkon 30 W, frekvenčný rozsah 63 Hz – 20 kHz, rozmery 17,8 × 6,8 × 7,2 cm" },
    "JBL Flip 6"],
  ["sonos-beam-gen-2", "sluchadla", "Sonos Beam (Gen 2) soundbar", "Sonos", 499, null, 0, 4.7, 880,
    "Kompaktný chytrý soundbar pre televízory s podporou Dolby Atmos a HDMI eARC. Je súčasťou ekosystému Sonos. (Dummy: vypredané.)",
    { Typ: "Kompaktný soundbar", Pripojenie: "HDMI eARC/ARC (kábel v balení), optický adaptér v balení, Wi-Fi, ovládanie cez aplikáciu Sonos", Hmotnosť: "2,88 kg", Ďalšie: "Dolby Atmos (virtuálna výška), rozmery 65,1 × 6,8 × 10,0 cm (š × v × h), podpora DTS Digital Surround a Dolby Atmos Music" },
    "Sonos Beam Gen 2"],

  // ---- Herné príslušenstvo ----
  ["logitech-g502-x", "hry", "Logitech G502 X herná myš (drôtová)", "Logitech G", 79.9, null, 33, 4.7, 1890,
    "Drôtová herná myš G502 X nadväzuje na rad G502 a váži 89 g. Využíva senzor HERO 25K a hybridné optomechanické spínače LIGHTFORCE.",
    { Senzor: "HERO 25K", Rozlíšenie: "100 – 25 600 DPI", Hmotnosť: "89 g", "Rozmery (V × Š × H)": "131,4 × 41,1 × 79,2 mm", "Spínače tlačidiel": "Hybridné optomechanické LIGHTFORCE", "Programovateľné ovládacie prvky": "13", Pripojenie: "Drôtové, USB" },
    "Logitech G502 X"],
  ["razer-blackwidow-v4", "hry", "Razer BlackWidow V4 mechanická klávesnica", "Razer", 189.99, 219.99, 10, 4.5, 402,
    "Mechanická herná klávesnica s 6 makro klávesmi, multifunkčným kolieskom a 4 mediálnymi klávesmi. Ponúka RGB podsvietenie Razer Chroma a odnímateľnú magnetickú opierku zápästia.",
    { Spínače: "Razer Mechanical Switch, Green (klikavé) alebo Yellow (lineárne, tiché)", "Makro klávesy": "6 dedikovaných", "Mediálne ovládanie": "Multifunkčné koliesko a 4 mediálne klávesy", Podsvietenie: "Razer Chroma RGB, podsvietenie jednotlivých klávesov a 2-stranný underglow", Klávesy: "Doubleshot ABS", Konštrukcia: "Hliníková zliatina 5052", Pripojenie: "Odnímateľný opletený kábel USB-A na USB-C", "Polling rate": "Až 8000 Hz" },
    "Razer BlackWidow V4"],
  ["xbox-wireless-controller", "hry", "Xbox Wireless Controller", "Microsoft", 59.99, null, 48, 4.7, 5210,
    "Bezdrôtový ovládač Xbox s modernizovaným tvarom, hybridným D-padom a texturovanými spúšťami a bumpermi. Má vyhradené tlačidlo Share a funguje s konzolami Xbox, Windows, Androidom aj iOS.",
    { Pripojenie: "Xbox Wireless pre konzoly Xbox, Bluetooth pre Windows 10/11, tablety, iOS a Android", Kompatibilita: "Xbox Series X, Xbox Series S, Xbox One, Windows 10/11, Android, iOS", Napájanie: "Batérie AA, výdrž až 40 hodín", "Ovládacie prvky": "Hybridný D-pad, texturované spúšte, bumpery a zadný kryt, tlačidlo Share", Audio: "3,5 mm stereo konektor na headset", "Mapovanie tlačidiel": "Cez aplikáciu Xbox Accessories" },
    "Xbox Wireless Controller"],
  ["hyperx-cloud-ii-wireless", "hry", "HyperX Cloud II Wireless herný headset", "HyperX", 109.9, 129.9, 0, 4.5, 760,
    "Bezdrôtový herný headset s 53 mm meničmi, hliníkovým rámom a pamäťovou penou. Pripája sa cez 2,4 GHz USB adaptér a vydrží až 30 hodín. (Dummy: vypredané.)",
    { Menič: "Dynamický, 53 mm, neodýmové magnety", Typ: "Cez uši, uzatvorený", "Frekvenčná odozva": "15 Hz – 20 kHz", Citlivosť: "104 dBSPL/mW pri 1 kHz", Pripojenie: "2,4 GHz bezdrôtovo cez USB adaptér, dosah až 20 m", "Výdrž batérie": "30 hodín, nabíjanie 3 hodiny", Mikrofón: "Odnímateľný, elektretový kondenzátorový, s potlačením hluku", Kompatibilita: "PC, PS5, PS4" },
    "HyperX Cloud II Wireless"],

  // ---- Testovacie ponuky pre porovnanie produktov (A6) ----
  // Rovnaký EAN ako iPhone 16 128 GB, ale iný názov (iný predajca by ho tak mohol nazvať). Očakávanie: TEN ISTÝ produkt.
  ["iphone-16-128-gb-cierny-novy", "smartfony", "iPhone 16 (128GB) čierny – nový, 2 roky záruka", "Apple", 815, null, 6, 4.6, 38,
    "Nový Apple iPhone 16 v čiernej farbe s pamäťou 128 GB. Rovnaký produkt ako „Apple iPhone 16 128 GB“, len iný názov ponuky. (Dummy: rovnaký EAN, iný názov.)",
    { Farba: "Čierna", Pamäť: "128 GB", Záruka: "24 mesiacov" },
    "Apple iPhone 16"],
  // Podobný názov ako iPhone 16 128 GB, ale iný produkt a iný EAN. Očakávanie: NIE JE to ten istý produkt.
  ["kryt-apple-iphone-16-128gb-silikon", "prislusenstvo", "Kryt pre Apple iPhone 16 128 GB, silikónový", "TechMarket", 14.9, 19.9, 120, 4.1, 64,
    "Silikónový kryt kompatibilný s Apple iPhone 16. Názov je podobný telefónu, ale ide o príslušenstvo s iným EAN. (Dummy: podobný názov, iný EAN.)",
    { Materiál: "Silikón", Kompatibilita: "Apple iPhone 16", Farba: "Čierna" },
    "silicone phone case"],
];

// Doplnkové údaje pre testovacie scenáre (varianty, zdieľaný EAN, doprava).
// Ceny variantov sú VYMYSLENÉ, rovnako ako ostatné ceny.
const extras = {
  "apple-iphone-16-128gb": {
    variesBy: "storage",
    // Varianty na jednej stránke, každý s vlastnou cenou a EAN. Výber: /produkt/apple-iphone-16-128gb?variant=256gb
    variants: [
      { id: "128gb", label: "128 GB", name: "Apple iPhone 16 128 GB", delta: 0 },
      { id: "256gb", label: "256 GB", name: "Apple iPhone 16 256 GB", delta: 130 },
      { id: "512gb", label: "512 GB", name: "Apple iPhone 16 512 GB", delta: 380 },
    ],
  },
  "jbl-flip-6": {
    variesBy: "color",
    variants: [
      { id: "cierna", label: "Čierna", name: "JBL Flip 6 prenosný reproduktor, čierny", delta: 0 },
      { id: "modra", label: "Modrá", name: "JBL Flip 6 prenosný reproduktor, modrý", delta: 0 },
      { id: "cervena", label: "Červená", name: "JBL Flip 6 prenosný reproduktor, červený", delta: 10 },
    ],
  },
  "iphone-16-128-gb-cierny-novy": { sameEanAs: "apple-iphone-16-128gb", imgOf: "apple-iphone-16-128gb" },
};

// Predvolená doprava podľa kategórie (EUR). Dá sa zmeniť cez /__test/set/:slug?shipping=…
const shippingByCategory = { televizory: 9.9, notebooky: 4.9 };
const DEFAULT_SHIPPING = 3.9;

const photoDir = path.join(__dirname, "..", "public", "photos");
function imageFor(slug) {
  for (const ext of ["jpg", "jpeg", "png", "webp"]) {
    if (fs.existsSync(path.join(photoDir, `${slug}.${ext}`))) return `/photos/${slug}.${ext}`;
  }
  return `/img/${slug}.svg`; // záloha: SVG placeholder
}

const catIndex = Object.fromEntries(categories.map((c) => [c.slug, c]));

const products = raw.map((r, i) => ({
  id: i + 1,
  slug: r[0],
  category: r[1],
  name: r[2],
  brand: r[3],
  price: r[4],
  oldPrice: r[5],
  stock: r[6],
  rating: r[7],
  reviews: r[8],
  description: r[9],
  specs: r[10],
  commonsQuery: r[11],
  img: imageFor(r[0]),
  ean: ean13(859000000000 + 1000 + i * 7), // vymyslený, ale platný EAN-13 (checksum)
  sku: "TM-" + String(1000 + i),
  shipping: shippingByCategory[r[1]] ?? DEFAULT_SHIPPING,
}));

// Aplikuj doplnkové údaje (až po vytvorení všetkých produktov, aby sedeli EAN a obrázky).
const bySlugRaw = Object.fromEntries(products.map((p) => [p.slug, p]));
products.forEach((p, i) => {
  const x = extras[p.slug];
  if (!x) return;
  if (x.sameEanAs) p.ean = bySlugRaw[x.sameEanAs].ean;
  if (x.imgOf) p.img = bySlugRaw[x.imgOf].img;
  if (x.variesBy) p.variesBy = x.variesBy;
  if (x.variants) {
    p.variants = x.variants.map((v, j) => ({
      ...v,
      ean: j === 0 ? p.ean : ean13(859000500000 + i * 10 + j), // prvý variant = EAN produktu
      sku: j === 0 ? p.sku : `${p.sku}-${v.id.toUpperCase()}`,
    }));
  }
});

module.exports = { categories, catIndex, products, ean13 };
