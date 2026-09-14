/* ══════════════════════════════════════════════════════════════════
   AliFind — Kamus pencarian PT-BR ⇄ EN
   ──────────────────────────────────────────────────────────────────
   Nama produk di katalog masih bawaan AliExpress (Inggris), sementara
   pembeli Brasil mencari pakai bahasa Portugis. File ini menjembatani
   keduanya TANPA mengubah data listing (data/products.json tetap utuh).

   Cara kerja: kata kunci PT-BR dipetakan ke kata kunci EN yang benar-benar
   ada di nama produk. Pencarian juga mengabaikan aksen (cilios = cílios).
   ══════════════════════════════════════════════════════════════════ */

window.ALIFIND_SYNONYMS = {
  /* ── Skincare / acne ── */
  "espinha":    ["pimple", "patch", "blemish"],
  "espinhas":   ["pimple", "patch", "blemish"],
  "cravo":      ["pimple", "patch", "blemish"],
  "acne":       ["pimple", "patch", "blemish"],
  "adesivo":    ["patch", "pimple", "blemish"],
  "adesivos":   ["patch", "pimple", "blemish"],
  "esconder":   ["cover", "covering", "invisible"],
  "invisivel":  ["invisible", "hydrocolloid"],
  "rosto":      ["face", "facial", "pimple", "blush", "ice"],
  "pele":       ["skincare", "face", "facial", "pimple"],
  "gelo":       ["ice", "globes", "roller"],
  "massagem":   ["roller", "gua sha", "globes", "facial"],

  /* ── Cílios / olhos ── */
  "cilio":      ["eyelash", "lashes", "lash"],
  "cilios":     ["eyelash", "lashes", "lash"],
  "extensao":   ["extensions", "eyelash"],
  "extensoes":  ["extensions", "eyelash"],
  "volumao":    ["volume", "fans"],
  "russo":      ["russian", "volume"],

  /* ── Unhas ── */
  "unha":       ["nail", "nails", "press on"],
  "unhas":      ["nail", "nails", "press on"],
  "postica":    ["press on", "fake nails"],
  "posticas":   ["press on", "fake nails"],
  "alongamento":["extensions", "press on", "nail tips"],
  "gel":        ["gel", "jelly", "soft gel"],
  "manicure":   ["nail", "nails", "press on"],

  /* ── Maquiagem ── */
  "batom":      ["lipstick", "lip mud", "lip glaze", "lip"],
  "maquiagem":  ["makeup", "lipstick", "blush", "mud", "glaze"],
  "maquilhagem":["makeup", "lipstick", "blush"],
  "boca":       ["lip", "lips", "lipstick"],
  "labio":      ["lip", "lips", "lipstick"],
  "labios":     ["lip", "lips", "lipstick"],
  "bochecha":   ["blush", "cheek"],
  "blush":      ["blush", "cheek"],
  "matte":      ["matte", "mousse"],

  /* ── Piercing / joias ── */
  "brinco":     ["titanium", "ear", "piercing", "stud"],
  "brincos":    ["titanium", "ear", "piercing", "stud"],
  "piercing":   ["piercing", "piercings", "septum", "nose", "labret", "titanium"],
  "piercings":  ["piercing", "piercings", "septum", "nose", "labret"],
  "nariz":      ["nose", "septum", "nostril"],
  "orelha":     ["ear", "labret", "stud"],
  "sobrancelha":["eyebrow", "piercing"],
  "labret":     ["labret", "lip stud"],
  "titanio":    ["titanium", "g23", "f136"],
  "joia":       ["titanium", "piercing", "stud", "ring"],
  "joias":      ["titanium", "piercing", "stud", "ring"],

  /* ── Casa / gadget ── */
  "sabonete":   ["soap", "dispenser", "foam"],
  "saboneteira":["soap", "dispenser", "foam"],
  "sabao":      ["soap", "foam", "dispenser"],
  "dispenser":  ["dispenser", "soap"],
  "sensor":     ["sensor", "automatic", "touchless", "motion", "induction"],
  "automatico": ["automatic", "induction", "touchless"],
  "sem toque":  ["touchless", "contactless"],
  "luz":        ["led", "light", "lights", "solar", "lamp"],
  "luzes":      ["led", "light", "lights", "solar"],
  "luminaria":  ["light", "lights", "led", "solar", "lamp"],
  "lampada":    ["led", "light", "lights"],
  "solar":      ["solar", "garden"],
  "jardim":     ["garden", "outdoor", "yard", "solar"],
  "quintal":    ["garden", "outdoor", "yard"],
  "organizador":["organizer", "storagebox", "display", "case", "stackable"],
  "caixa":      ["box", "storagebox", "case", "display"],
  "guardar":    ["storage", "storagebox", "vacuum bag"],
  "aspirar":    ["vacuum", "pump"],

  /* ── Cozinha ── */
  "cozinha":    ["kitchen", "slicer", "grater", "mandoline"],
  "cortador":   ["slicer", "chopper", "mandoline", "spiralizer"],
  "ralador":    ["grater", "shredder", "mandoline"],
  "fatiador":   ["slicer", "mandoline", "spiralizer"],
  "legume":     ["vegetable", "zucchini", "slicer"],
  "legumes":    ["vegetable", "zucchini", "slicer"],
  "queijo":     ["cheese", "grater", "shredder"],
  "vacuo":      ["vacuum", "pump"],
  "bolsa":      ["bag", "vacuum bag", "storage bag"],
  "viagem":     ["travel", "compact", "storage"],
};

/* Saran yang muncul saat pencarian tidak menemukan apa pun.
   Semua kata di bawah sudah diuji menghasilkan hasil di katalog. */
window.ALIFIND_SUGGESTIONS = [
  "adesivo", "cilios", "batom", "unhas", "brinco", "sabonete", "cozinha", "luz"
];

/* Label kategori PT-BR — supaya mengetik "beleza" juga menemukan produknya. */
window.ALIFIND_CATEGORY_PT = {
  Auto: "auto", Beauty: "beleza", Gadget: "gadget", Hair: "cabelo",
  Home: "casa", Jewelry: "joias", Kitchen: "cozinha", Lashes: "cilios",
  Makeup: "maquiagem", Nails: "unhas", Outdoor: "ar livre", Skincare: "pele",
  Storage: "organizacao", Tools: "ferramentas", Trending: "em alta"
};
