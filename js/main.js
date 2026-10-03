import { rendreMarkdownLeger } from "./markdown.js";
import { MENTION_COURTE, MENTION_LEGALE, VERSION_TEXTE } from "./mentions.js";

const $ = (id) => document.getElementById(id);

let notice = { categories: [] };
let categorieActive = null;

const VUES = ["accueil", "categorie", "section", "recherche"];

function afficherVue(vue, { historique = true } = {}) {
  for (const v of VUES) $(`nk-vue-${v}`).classList.toggle("hidden", v !== vue);
  $("nk-retour-btn").classList.toggle("hidden", vue === "accueil");
  if (vue === "accueil") {
    $("nk-titre").textContent = "🔋 Notice Kona";
    $("nk-recherche").value = "";
    $("nk-recherche-effacer").classList.add("hidden");
  }
  if (historique) history.pushState({ vue }, "");
}

function escapeHtml(s) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function extrait(texte, longueur = 90) {
  const t = (texte || "").replace(/[*_\n-]/g, " ").replace(/\s+/g, " ").trim();
  return t.length > longueur ? t.slice(0, longueur) + "…" : t;
}

// ── Accueil : grille des catégories ─────────────────────────────────────

function rendreAccueil() {
  const conteneur = $("nk-categories");
  conteneur.innerHTML = notice.categories
    .map(
      (cat) => `
      <button type="button" class="nk-categorie-carte" data-cat="${cat.id}">
        <span class="nk-categorie-icone">${cat.icone || "📄"}</span>
        <span class="nk-categorie-titre">${escapeHtml(cat.titre)}</span>
        <span class="nk-categorie-compte">${cat.sections.length} fiche${cat.sections.length > 1 ? "s" : ""}</span>
      </button>`,
    )
    .join("");
  conteneur.querySelectorAll("[data-cat]").forEach((btn) => {
    btn.addEventListener("click", () => ouvrirCategorie(btn.dataset.cat));
  });
}

// ── Catégorie : liste des sections ───────────────────────────────────────

function ouvrirCategorie(id, { historique = true } = {}) {
  const cat = notice.categories.find((c) => c.id === id);
  if (!cat) return;
  categorieActive = cat;
  $("nk-titre").textContent = `${cat.icone || ""} ${cat.titre}`.trim();
  $("nk-categorie-titre").textContent = cat.titre;
  $("nk-sections-liste").innerHTML = cat.sections
    .map(
      (s) => `
      <button type="button" class="nk-section-carte" data-section="${s.id}">
        <span>
          <div class="nk-section-carte-titre">${escapeHtml(s.titre)}</div>
          <div class="nk-section-carte-extrait">${escapeHtml(extrait(s.contenu))}</div>
        </span>
        <span class="nk-section-carte-fleche">›</span>
      </button>`,
    )
    .join("");
  $("nk-sections-liste").querySelectorAll("[data-section]").forEach((btn) => {
    btn.addEventListener("click", () => ouvrirSection(cat.id, btn.dataset.section));
  });
  afficherVue("categorie", { historique });
}

// ── Section : détail (texte + schémas) ──────────────────────────────────

function ouvrirSection(catId, sectionId, { historique = true } = {}) {
  const cat = notice.categories.find((c) => c.id === catId);
  const section = cat?.sections.find((s) => s.id === sectionId);
  if (!section) return;
  categorieActive = cat;
  $("nk-titre").textContent = cat.titre;
  $("nk-section-titre").textContent = section.titre;
  const images = (section.images || []).map((img) => `<img src="./images/${img}" alt="Schéma — ${escapeHtml(section.titre)}" loading="lazy">`).join("");
  $("nk-section-contenu").innerHTML = rendreMarkdownLeger(section.contenu) + images;
  afficherVue("section", { historique });
}

// ── Recherche (toutes catégories/sections confondues) ───────────────────

function rechercher(requete) {
  const q = requete.trim().toLowerCase();
  $("nk-recherche-effacer").classList.toggle("hidden", !q);
  if (!q) {
    afficherVue(categorieActive ? "categorie" : "accueil", { historique: false });
    return;
  }
  const resultats = [];
  for (const cat of notice.categories) {
    for (const s of cat.sections) {
      const cible = `${s.titre} ${s.contenu}`.toLowerCase();
      if (cible.includes(q)) resultats.push({ cat, section: s });
    }
  }
  const conteneur = $("nk-recherche-resultats");
  $("nk-recherche-vide").classList.toggle("hidden", resultats.length > 0);
  conteneur.innerHTML = resultats
    .map(
      ({ cat, section }) => `
      <button type="button" class="nk-section-carte" data-cat="${cat.id}" data-section="${section.id}">
        <span>
          <div class="nk-section-carte-cat">${cat.icone || ""} ${escapeHtml(cat.titre)}</div>
          <div class="nk-section-carte-titre">${escapeHtml(section.titre)}</div>
        </span>
        <span class="nk-section-carte-fleche">›</span>
      </button>`,
    )
    .join("");
  conteneur.querySelectorAll("[data-section]").forEach((btn) => {
    btn.addEventListener("click", () => ouvrirSection(btn.dataset.cat, btn.dataset.section));
  });
  afficherVue("recherche", { historique: false });
}

// ── Chargement des données ───────────────────────────────────────────────

async function chargerNotice() {
  try {
    const reponse = await fetch("./data/notice.json");
    if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
    notice = await reponse.json();
    $("nk-chargement").classList.add("hidden");
    rendreAccueil();
  } catch (e) {
    console.error("[NoticeKona] Chargement impossible :", e);
    $("nk-chargement").classList.add("hidden");
    $("nk-erreur").classList.remove("hidden");
  }
}

// ── Navigation / retour (bouton Android, bouton flèche) ─────────────────

$("nk-retour-btn").addEventListener("click", () => history.back());
window.addEventListener("popstate", (e) => {
  const vue = e.state?.vue || "accueil";
  afficherVue(vue, { historique: false });
  if (vue === "accueil") categorieActive = null;
  else if (vue === "categorie" && categorieActive) ouvrirCategorie(categorieActive.id, { historique: false });
});

// ── Recherche ─────────────────────────────────────────────────────────────

let debounceRecherche = null;
$("nk-recherche").addEventListener("input", (e) => {
  clearTimeout(debounceRecherche);
  debounceRecherche = setTimeout(() => rechercher(e.target.value), 150);
});
$("nk-recherche-effacer").addEventListener("click", () => {
  $("nk-recherche").value = "";
  rechercher("");
});

// ── Mentions / à propos ───────────────────────────────────────────────────

$("nk-mentions-btn").addEventListener("click", () => {
  $("nk-mentions-texte").textContent = `${MENTION_COURTE} — ${VERSION_TEXTE}`;
  $("nk-mentions").querySelector(".nk-mentions-legal").textContent = MENTION_LEGALE;
  $("nk-mentions").classList.remove("hidden");
});
$("nk-mentions-fermer").addEventListener("click", () => $("nk-mentions").classList.add("hidden"));

// ── Service worker (hors-ligne) ───────────────────────────────────────────

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch((e) => console.error("[NoticeKona] SW :", e));
}

history.replaceState({ vue: "accueil" }, "");
chargerNotice();
