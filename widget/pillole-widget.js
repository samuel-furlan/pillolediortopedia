// Pillole di ortopedia – widget per Scriptable (iPhone)
// Mostra la lezione del giorno; toccandolo si apre la pagina delle lezioni.
// Funziona nei formati piccolo, medio e grande.

const SITO = "https://samuel-furlan.github.io/pillolediortopedia/";
const AREE = {
  "ginocchio-piede": { nome: "Ginocchio, caviglia e piede", colori: ["#30d158", "#00a389", "#6e4fe0"] },
  "generale": { nome: "Ortopedia generale", colori: ["#0a84ff", "#5e5ce6", "#3634a3"] },
  "mano": { nome: "Mano e polso", colori: ["#ff9f0a", "#ff375f", "#bf2a6b"] }
};
const MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const GIORNI = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];

const fm = FileManager.local();
const cache = fm.joinPath(fm.documentsDirectory(), "pillole-cache.json");

function oggiISO() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function dataBreve(iso) {
  const p = iso.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2]);
  return GIORNI[d.getDay()] + " " + d.getDate() + " " + MESI[d.getMonth()];
}

async function caricaLezioni() {
  try {
    const r = new Request(SITO + "index.html?t=" + Date.now());
    r.timeoutInterval = 20;
    const html = await r.loadString();
    const m = html.match(/<script id="lezioni" type="application\/json">\n([\s\S]*?)\n<\/script>/);
    if (!m) throw new Error("dati non trovati");
    const lez = JSON.parse(m[1]);
    fm.writeString(cache, JSON.stringify(lez));
    return lez;
  } catch (e) {
    if (fm.fileExists(cache)) return JSON.parse(fm.readString(cache));
    return null;
  }
}

function gradiente(colori) {
  const g = new LinearGradient();
  g.colors = colori.map(c => new Color(c));
  g.locations = colori.length === 3 ? [0, 0.5, 1] : [0, 1];
  g.startPoint = new Point(0, 0);
  g.endPoint = new Point(1, 1);
  return g;
}

function testo(stack, t, size, peso, opacita, righe) {
  const x = stack.addText(t);
  x.font = peso === "bold" ? Font.boldSystemFont(size) : (peso === "heavy" ? Font.heavySystemFont(size) : Font.mediumSystemFont(size));
  x.textColor = new Color("#ffffff", opacita == null ? 1 : opacita);
  if (righe) x.lineLimit = righe;
  return x;
}

async function crea() {
  const w = new ListWidget();
  w.url = SITO;
  w.setPadding(14, 14, 14, 14);
  w.refreshAfterDate = new Date(Date.now() + 3 * 3600 * 1000);

  const lez = await caricaLezioni();
  const formato = config.widgetFamily || "medium";
  if (!lez || !lez.length) {
    w.backgroundGradient = gradiente(["#8e8e93", "#48484a"]);
    testo(w, "Pillole di ortopedia", 14, "bold");
    w.addSpacer(4);
    testo(w, "Lezioni non raggiungibili. Riprova più tardi.", 12, "medium", 0.9);
    return w;
  }
  lez.sort((a, b) => a.n - b.n);
  const oggi = oggiISO();
  let l = lez[0];
  for (const x of lez) if (x.data <= oggi) l = x;
  const prossima = lez.find(x => x.data > oggi);
  const area = AREE[l.area] || AREE.generale;
  w.backgroundGradient = gradiente(area.colori);

  const testa = w.addStack();
  testa.centerAlignContent();
  testo(testa, (l.data === oggi ? "OGGI · " : "") + dataBreve(l.data).toUpperCase(), 11, "bold", 0.85);
  testa.addSpacer();
  testo(testa, "N° " + l.n, 11, "heavy", 0.9);
  w.addSpacer(4);
  testo(w, area.nome, formato === "small" ? 14 : 16, "heavy", 1, 2);
  w.addSpacer(formato === "small" ? 6 : 8);

  const quanti = formato === "small" ? 1 : (formato === "medium" ? 2 : 6);
  const arts = l.articoli.slice(0, quanti);
  arts.forEach((a, i) => {
    const riga = w.addStack();
    riga.spacing = 6;
    testo(riga, "•", formato === "small" ? 12 : 13, "bold", 0.8);
    testo(riga, a.titolo, formato === "small" ? 12 : 13, "medium", 0.95, formato === "large" ? 2 : (formato === "small" ? 4 : 2));
    if (i < arts.length - 1) w.addSpacer(formato === "large" ? 6 : 4);
  });
  if (l.articoli.length > quanti) {
    w.addSpacer(4);
    testo(w, "+ altri " + (l.articoli.length - quanti) + " articoli", 11, "bold", 0.75);
  }
  w.addSpacer();
  if (prossima && formato !== "small") {
    testo(w, "Prossima: " + dataBreve(prossima.data) + " · " + (AREE[prossima.area] || AREE.generale).nome, 10, "medium", 0.75, 1);
  }
  return w;
}

const widget = await crea();
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}
Script.complete();
