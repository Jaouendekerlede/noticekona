// Tout ce qui est gardé en local (favoris, historique, progression,
// signalements, checklists, thème) -- jamais envoyé nulle part.

const CLE_FAVORIS = "nk_favoris";
const CLE_RECENTS = "nk_recents";
const CLE_VISITES = "nk_visites";
const CLE_SIGNALEMENTS = "nk_signalements";
const CLE_THEME = "nk_theme";
const MAX_RECENTS = 8;

function lireJson(cle, defaut) {
  try {
    const brut = localStorage.getItem(cle);
    return brut ? JSON.parse(brut) : defaut;
  } catch {
    return defaut;
  }
}
function ecrireJson(cle, valeur) {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    // stockage plein ou indisponible : tant pis, pas de persistance cette fois
  }
}

const cleItem = (catId, sectionId) => `${catId}::${sectionId}`;

// ── Favoris ───────────────────────────────────────────────────────────────

export function listerFavoris() {
  return lireJson(CLE_FAVORIS, []);
}
export function estFavori(catId, sectionId) {
  return listerFavoris().some((f) => f.catId === catId && f.sectionId === sectionId);
}
export function basculerFavori(catId, sectionId) {
  const favoris = listerFavoris();
  const idx = favoris.findIndex((f) => f.catId === catId && f.sectionId === sectionId);
  if (idx >= 0) favoris.splice(idx, 1);
  else favoris.push({ catId, sectionId });
  ecrireJson(CLE_FAVORIS, favoris);
  return idx < 0;
}

// ── Récemment consultées ────────────────────────────────────────────────

export function listerRecents() {
  return lireJson(CLE_RECENTS, []);
}
export function noterRecent(catId, sectionId) {
  let recents = listerRecents().filter((r) => !(r.catId === catId && r.sectionId === sectionId));
  recents.unshift({ catId, sectionId });
  recents = recents.slice(0, MAX_RECENTS);
  ecrireJson(CLE_RECENTS, recents);
}

// ── Progression (fiches déjà ouvertes au moins une fois) ────────────────

export function listerVisites() {
  return lireJson(CLE_VISITES, []);
}
export function noterVisite(catId, sectionId) {
  const visites = new Set(listerVisites());
  visites.add(cleItem(catId, sectionId));
  ecrireJson(CLE_VISITES, [...visites]);
}

// ── Signalements (notes locales "à corriger") ───────────────────────────

export function listerSignalements() {
  return lireJson(CLE_SIGNALEMENTS, []);
}
export function ajouterSignalement(texte, contexte) {
  const signalements = listerSignalements();
  signalements.unshift({ texte, contexte, date: new Date().toISOString() });
  ecrireJson(CLE_SIGNALEMENTS, signalements);
}

// ── Thème ─────────────────────────────────────────────────────────────────

export function lireTheme() {
  return localStorage.getItem(CLE_THEME) || "sombre";
}
export function sauverTheme(theme) {
  try {
    localStorage.setItem(CLE_THEME, theme);
  } catch {
    // tant pis
  }
}

// ── Checklists (cases cochées, par identifiant de checklist) ────────────

export function lireChecklist(id) {
  return lireJson(`nk_checklist_${id}`, []);
}
export function sauverChecklist(id, indicesCoches) {
  ecrireJson(`nk_checklist_${id}`, indicesCoches);
}
