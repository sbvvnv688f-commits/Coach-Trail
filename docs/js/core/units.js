// Unités, formats d'affichage et dates.
// En interne : mètres, secondes, secondes par km. Les dates sont des chaînes AAAA-MM-JJ,
// calculées en UTC pour échapper aux changements d'heure.

export function fmtAllure(sParKm) {
  if (!Number.isFinite(sParKm) || sParKm <= 0) return "—";
  let m = Math.floor(sParKm / 60);
  let s = Math.round(sParKm - m * 60);
  if (s === 60) { m += 1; s = 0; }
  return `${m}'${String(s).padStart(2, "0")}`;
}

export function fmtDuree(s) {
  if (!Number.isFinite(s)) return "—";
  const mn = Math.round(s / 60);
  const h = Math.floor(mn / 60);
  const r = mn % 60;
  return h ? `${h}h${String(r).padStart(2, "0")}` : `${r} min`;
}

export function fmtKm(m, decimales = 1) {
  if (!Number.isFinite(m)) return "—";
  return (m / 1000).toFixed(decimales).replace(".", ",");
}

export function fmtMetres(m) {
  if (!Number.isFinite(m)) return "—";
  return Math.round(m).toLocaleString("fr-FR");
}

// ---- dates ----

function versUTC(iso) {
  const [a, m, j] = iso.split("-").map(Number);
  return Date.UTC(a, m - 1, j);
}

function depuisUTC(t) {
  return new Date(t).toISOString().slice(0, 10);
}

export function estDateISO(v) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  return depuisUTC(versUTC(v)) === v;
}

export function ajouterJours(iso, n) {
  return depuisUTC(versUTC(iso) + n * 86400000);
}

export function ecartJours(de, a) {
  return Math.round((versUTC(a) - versUTC(de)) / 86400000);
}

// 1 = lundi … 7 = dimanche
export function jourSemaine(iso) {
  const j = new Date(versUTC(iso)).getUTCDay();
  return j === 0 ? 7 : j;
}

export function lundiDe(iso) {
  return ajouterJours(iso, 1 - jourSemaine(iso));
}

export function aujourdhui(date = new Date()) {
  const a = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const j = String(date.getDate()).padStart(2, "0");
  return `${a}-${m}-${j}`;
}

const FMT_LONG = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" });
const FMT_COURT = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", day: "numeric", month: "short" });
const FMT_MOIS = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", month: "long", year: "numeric" });

export function fmtDateLongue(iso) { return FMT_LONG.format(versUTC(iso)); }
export function fmtDateCourte(iso) { return FMT_COURT.format(versUTC(iso)); }
export function fmtMois(iso) {
  const t = FMT_MOIS.format(versUTC(iso));
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export const JOURS_COURTS = ["L", "M", "M", "J", "V", "S", "D"];
export const JOURS_LONGS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
