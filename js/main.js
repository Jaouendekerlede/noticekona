import { rendreMarkdownLeger, echapperHtml, extraireEtapesNumerotees } from "./markdown.js";
import { MENTION_COURTE, MENTION_LEGALE, VERSION_TEXTE } from "./mentions.js";
import { CHECKLISTS } from "./checklists.js";
import {
  listerFavoris, estFavori, basculerFavori,
  listerRecents, noterRecent,
  listerVisites, noterVisite,
  listerSignalements, ajouterSignalement,
  lireTheme, sauverTheme,
  lireChecklist, sauverChecklist,
} from "./stockage.js";

const $ = (id) => document.getElementById(id);

const COULEURS_CAT = {
  demarrage: "#4fc3f7",
  recharge: "#22e5a0",
  "commandes-principales": "#b388ff",
  "ordinateur-de-bord": "#26c6da",
  securite: "#ff6b6b",
  "confort-eclairage": "#ffb400",
  "aide-a-la-conduite": "#7c8cff",
  "acces-vehicule": "#ff80ab",
  entretien: "#ffa726",
};
const COULEURS_VOYANT = { rouge: "#ff5252", orange: "#ffb400", vert: "#22e5a0", bleu: "#4fc3f7", blanc: "#e0e6ee" };

let notice = { categories: [] };
let voyants = [];
let categorieActive = null;
let sectionActive = null;
let glossaire = [];
let indexTitres = new Map(); // titre en minuscules -> { catId, sectionId }
let filtreVoyantActif = "tous";
let checklistActive = "trajet";

const VUES = ["accueil", "categorie", "section", "recherche", "voyants", "glossaire", "checklists"];

function afficherVue(vue, { historique = true } = {}) {
  for (const v of VUES) $(`nk-vue-${v}`).classList.toggle("hidden", v !== vue);
  $("nk-retour-btn").classList.toggle("hidden", vue === "accueil");
  if (vue === "accueil") {
    $("nk-titre").textContent = "🔋 Notice Kona";
    $("nk-recherche").value = "";
    $("nk-recherche-effacer").classList.add("hidden");
    rendreAccueil();
  }
  if (historique) history.pushState({ vue }, "");
}

function extrait(texte, longueur = 90) {
  const t = (texte || "").replace(/[*_\n-]/g, " ").replace(/\s+/g, " ").trim();
  return t.length > longueur ? t.slice(0, longueur) + "…" : t;
}

function contientAvertissement(texte) {
  return /\b(AVERTISSEMENT|ATTENTION|DANGER)\b/i.test(texte || "");
}

// ── Accueil : progression, favoris, récents, catégories ─────────────────

function rendreProgression() {
  const total = notice.categories.reduce((n, c) => n + c.sections.length, 0);
  const vues = new Set(listerVisites()).size;
  const pct = total ? Math.round((Math.min(vues, total) / total) * 100) : 0;
  $("nk-progression").innerHTML = `
    ${vues} / ${total} fiches consultées
    <div class="nk-progression-barre"><div class="nk-progression-barre-remplie" style="width:${pct}%"></div></div>
  `;
}

function trouverSection(catId, sectionId) {
  const cat = notice.categories.find((c) => c.id === catId);
  const section = cat?.sections.find((s) => s.id === sectionId);
  return section ? { cat, section } : null;
}

function carteSectionHtml(cat, section, { withCat = false } = {}) {
  const avert = contientAvertissement(section.contenu) ? `<span class="nk-badge-avertissement" title="Contient un avertissement de sécurité">⚠️</span>` : "";
  return `
    <button type="button" class="nk-section-carte" data-cat="${cat.id}" data-section="${section.id}">
      <span>
        ${withCat ? `<div class="nk-section-carte-cat">${cat.icone || ""} ${echapperHtml(cat.titre)}</div>` : ""}
        <div class="nk-section-carte-titre">${avert}${echapperHtml(section.titre)}</div>
        ${withCat ? "" : `<div class="nk-section-carte-extrait">${echapperHtml(extrait(section.contenu))}</div>`}
      </span>
      <span class="nk-section-carte-fleche">›</span>
    </button>`;
}

function cablerCartesSections(conteneur) {
  conteneur.querySelectorAll("[data-section]").forEach((btn) => {
    btn.addEventListener("click", () => ouvrirSection(btn.dataset.cat, btn.dataset.section));
  });
}

function rendreAccueil() {
  rendreProgression();

  const favoris = listerFavoris().map((f) => trouverSection(f.catId, f.sectionId)).filter(Boolean);
  $("nk-bloc-favoris").classList.toggle("hidden", favoris.length === 0);
  $("nk-favoris-liste").innerHTML = favoris.map(({ cat, section }) => carteSectionHtml(cat, section, { withCat: true })).join("");
  cablerCartesSections($("nk-favoris-liste"));

  const recents = listerRecents().map((r) => trouverSection(r.catId, r.sectionId)).filter(Boolean);
  $("nk-bloc-recents").classList.toggle("hidden", recents.length === 0);
  $("nk-recents-liste").innerHTML = recents.map(({ cat, section }) => carteSectionHtml(cat, section, { withCat: true })).join("");
  cablerCartesSections($("nk-recents-liste"));

  const conteneur = $("nk-categories");
  conteneur.innerHTML = notice.categories
    .map(
      (cat) => `
      <button type="button" class="nk-categorie-carte" data-cat="${cat.id}" style="--couleur-cat:${COULEURS_CAT[cat.id] || "#22e5a0"}">
        <span class="nk-categorie-icone">${cat.icone || "📄"}</span>
        <span class="nk-categorie-titre">${echapperHtml(cat.titre)}</span>
        <span class="nk-categorie-compte">${cat.sections.length} fiche${cat.sections.length > 1 ? "s" : ""}</span>
      </button>`,
    )
    .join("");
  conteneur.querySelectorAll("[data-cat]").forEach((btn) => btn.addEventListener("click", () => ouvrirCategorie(btn.dataset.cat)));
}

// ── Catégorie : liste des sections ───────────────────────────────────────

function ouvrirCategorie(id, { historique = true } = {}) {
  const cat = notice.categories.find((c) => c.id === id);
  if (!cat) return;
  categorieActive = cat;
  $("nk-titre").textContent = `${cat.icone || ""} ${cat.titre}`.trim();
  $("nk-categorie-titre").textContent = cat.titre;
  $("nk-sections-liste").innerHTML = cat.sections.map((s) => carteSectionHtml(cat, s)).join("");
  cablerCartesSections($("nk-sections-liste"));
  afficherVue("categorie", { historique });
}

// ── Liens croisés : repère les titres d'autres fiches dans le texte ─────

function construireIndexTitres() {
  indexTitres = new Map();
  for (const cat of notice.categories) {
    for (const section of cat.sections) {
      if (section.titre.length >= 8) indexTitres.set(section.titre.toLowerCase(), { catId: cat.id, sectionId: section.id, titre: section.titre });
    }
  }
}

function ajouterLiensCroises(conteneur, titreActuel) {
  const cibles = [...indexTitres.values()].filter((c) => c.titre !== titreActuel).sort((a, b) => b.titre.length - a.titre.length);
  const dejaLie = new Set();
  const marcheur = document.createTreeWalker(conteneur, NodeFilter.SHOW_TEXT);
  const noeuds = [];
  let n;
  while ((n = marcheur.nextNode())) noeuds.push(n);

  for (const noeud of noeuds) {
    if (noeud.parentElement.closest("a,button")) continue;
    for (const cible of cibles) {
      if (dejaLie.has(cible.titre)) continue;
      const idx = noeud.textContent.toLowerCase().indexOf(cible.titre.toLowerCase());
      if (idx === -1) continue;
      const avant = noeud.textContent.slice(0, idx);
      const correspond = noeud.textContent.slice(idx, idx + cible.titre.length);
      const apres = noeud.textContent.slice(idx + cible.titre.length);
      const lien = document.createElement("button");
      lien.type = "button";
      lien.className = "nk-lien-croise";
      lien.textContent = correspond;
      lien.addEventListener("click", () => ouvrirSection(cible.catId, cible.sectionId));
      const parent = noeud.parentNode;
      parent.insertBefore(document.createTextNode(avant), noeud);
      parent.insertBefore(lien, noeud);
      parent.insertBefore(document.createTextNode(apres), noeud);
      parent.removeChild(noeud);
      dejaLie.add(cible.titre);
      break;
    }
  }
}

// ── Section : détail (texte + schémas + favoris/partage/pas-à-pas) ──────

function majBoutonFavori() {
  const actif = estFavori(categorieActive.id, sectionActive.id);
  $("nk-section-favori-btn").textContent = actif ? "★" : "☆";
}

function ouvrirSection(catId, sectionId, { historique = true } = {}) {
  const trouve = trouverSection(catId, sectionId);
  if (!trouve) return;
  const { cat, section } = trouve;
  categorieActive = cat;
  sectionActive = section;
  noterVisite(cat.id, section.id);
  noterRecent(cat.id, section.id);

  $("nk-titre").textContent = cat.titre;
  $("nk-section-titre").textContent = section.titre;
  majBoutonFavori();

  const images = (section.images || []).map((img) => `<img src="./images/${img}" alt="Schéma — ${echapperHtml(section.titre)}" loading="lazy">`).join("");
  $("nk-section-contenu").innerHTML = rendreMarkdownLeger(section.contenu) + images;
  ajouterLiensCroises($("nk-section-contenu"), section.titre);
  $("nk-section-contenu").querySelectorAll("img").forEach((img) => img.addEventListener("click", () => ouvrirLightbox(img.src)));

  const etapes = extraireEtapesNumerotees(section.contenu);
  $("nk-mode-pas-a-pas-btn").classList.toggle("hidden", !etapes);
  $("nk-mode-pas-a-pas-btn").dataset.etapes = etapes ? JSON.stringify(etapes) : "";
  $("nk-pas-a-pas").classList.add("hidden");
  $("nk-section-contenu").classList.remove("hidden");

  afficherVue("section", { historique });
}

function ouvrirLightbox(src) {
  $("nk-lightbox-img").src = src;
  $("nk-lightbox").classList.remove("hidden");
}
$("nk-lightbox").addEventListener("click", () => $("nk-lightbox").classList.add("hidden"));

$("nk-section-favori-btn").addEventListener("click", () => {
  basculerFavori(categorieActive.id, sectionActive.id);
  majBoutonFavori();
});

$("nk-section-partager-btn").addEventListener("click", async () => {
  const texte = `${sectionActive.titre} — Notice Kona\n\n${sectionActive.contenu}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: sectionActive.titre, text: texte });
    } catch {
      // partage annulé par l'utilisateur : rien à faire
    }
  } else if (navigator.clipboard) {
    await navigator.clipboard.writeText(texte);
    alert("Copié dans le presse-papiers (le partage direct n'est pas disponible sur ce navigateur).");
  }
});

// ── Mode pas-à-pas ────────────────────────────────────────────────────────

let etapesCourantes = [];
let indexEtapeCourante = 0;

function afficherEtape() {
  $("nk-pas-a-pas-compte").textContent = `Étape ${indexEtapeCourante + 1} / ${etapesCourantes.length}`;
  $("nk-pas-a-pas-texte").textContent = etapesCourantes[indexEtapeCourante];
  $("nk-pas-precedent").disabled = indexEtapeCourante === 0;
  $("nk-pas-suivant").textContent = indexEtapeCourante === etapesCourantes.length - 1 ? "Terminé ✓" : "Suivant ›";
}

$("nk-mode-pas-a-pas-btn").addEventListener("click", () => {
  etapesCourantes = JSON.parse($("nk-mode-pas-a-pas-btn").dataset.etapes || "[]");
  if (!etapesCourantes.length) return;
  indexEtapeCourante = 0;
  $("nk-section-contenu").classList.add("hidden");
  $("nk-pas-a-pas").classList.remove("hidden");
  afficherEtape();
});
$("nk-pas-suivant").addEventListener("click", () => {
  if (indexEtapeCourante < etapesCourantes.length - 1) {
    indexEtapeCourante++;
    afficherEtape();
  } else {
    $("nk-pas-a-pas").classList.add("hidden");
    $("nk-section-contenu").classList.remove("hidden");
  }
});
$("nk-pas-precedent").addEventListener("click", () => {
  if (indexEtapeCourante > 0) {
    indexEtapeCourante--;
    afficherEtape();
  }
});
$("nk-pas-a-pas-quitter").addEventListener("click", () => {
  $("nk-pas-a-pas").classList.add("hidden");
  $("nk-section-contenu").classList.remove("hidden");
});

// ── Signaler une erreur/un manque ────────────────────────────────────────

function rendreSignalements() {
  const liste = listerSignalements();
  $("nk-signaler-liste").innerHTML = liste.length
    ? liste.map((s) => `<div class="nk-section-carte" style="cursor:default;"><span><div class="nk-section-carte-cat">${echapperHtml(s.contexte || "")} — ${new Date(s.date).toLocaleDateString("fr-FR")}</div><div class="nk-section-carte-titre">${echapperHtml(s.texte)}</div></span></div>`).join("")
    : `<div class="nk-vide" style="padding:16px;">Aucune note pour l'instant.</div>`;
}

$("nk-section-signaler-btn").addEventListener("click", () => {
  $("nk-signaler-texte").value = "";
  rendreSignalements();
  $("nk-signaler-modale").classList.remove("hidden");
});
$("nk-signaler-fermer").addEventListener("click", () => $("nk-signaler-modale").classList.add("hidden"));
$("nk-signaler-envoyer").addEventListener("click", () => {
  const texte = $("nk-signaler-texte").value.trim();
  if (!texte) return;
  ajouterSignalement(texte, sectionActive?.titre || "");
  $("nk-signaler-texte").value = "";
  rendreSignalements();
});

// ── Recherche (toutes catégories/sections confondues) ───────────────────

function surligner(texte, q) {
  if (!q) return echapperHtml(texte);
  const echappe = echapperHtml(texte);
  const motEchappe = echapperHtml(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return echappe.replace(new RegExp(`(${motEchappe})`, "gi"), "<mark>$1</mark>");
}

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
          <div class="nk-section-carte-cat">${cat.icone || ""} ${echapperHtml(cat.titre)}</div>
          <div class="nk-section-carte-titre">${surligner(section.titre, q)}</div>
        </span>
        <span class="nk-section-carte-fleche">›</span>
      </button>`,
    )
    .join("");
  cablerCartesSections(conteneur);
  afficherVue("recherche", { historique: false });
}

let debounceRecherche = null;
$("nk-recherche").addEventListener("input", (e) => {
  clearTimeout(debounceRecherche);
  debounceRecherche = setTimeout(() => rechercher(e.target.value), 150);
});
$("nk-recherche-effacer").addEventListener("click", () => {
  $("nk-recherche").value = "";
  rechercher("");
});

// ── Recherche vocale ──────────────────────────────────────────────────────

const ReconnaissanceVocale = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!ReconnaissanceVocale) $("nk-recherche-vocale").classList.add("hidden");
else {
  const reco = new ReconnaissanceVocale();
  reco.lang = "fr-FR";
  reco.interimResults = false;
  let enEcoute = false;
  reco.addEventListener("result", (e) => {
    const texte = e.results[0][0].transcript;
    $("nk-recherche").value = texte;
    rechercher(texte);
  });
  reco.addEventListener("end", () => {
    enEcoute = false;
    $("nk-recherche-vocale").classList.remove("nk-recherche-vocale-active");
  });
  $("nk-recherche-vocale").addEventListener("click", () => {
    if (enEcoute) {
      reco.stop();
      return;
    }
    enEcoute = true;
    $("nk-recherche-vocale").classList.add("nk-recherche-vocale-active");
    try {
      reco.start();
    } catch {
      enEcoute = false;
      $("nk-recherche-vocale").classList.remove("nk-recherche-vocale-active");
    }
  });
}

// ── Voyants (témoins du tableau de bord) ─────────────────────────────────

function rendreVoyants() {
  const filtres = voyants.filter((v) => filtreVoyantActif === "tous" || (v.couleur || "").toLowerCase() === filtreVoyantActif);
  $("nk-voyants-vide").classList.toggle("hidden", voyants.length > 0);
  $("nk-voyants-liste").innerHTML = filtres
    .map(
      (v) => `
      <div class="nk-voyant-carte">
        <span class="nk-voyant-pastille" style="background:${COULEURS_VOYANT[(v.couleur || "").toLowerCase()] || "#999"}"></span>
        <span>
          <div class="nk-voyant-nom">${echapperHtml(v.nom)}</div>
          <div class="nk-voyant-signification">${echapperHtml(v.signification)}</div>
          <div class="nk-voyant-action"><strong>À faire :</strong> ${echapperHtml(v.action)}</div>
        </span>
      </div>`,
    )
    .join("");
}

$("nk-ouvrir-voyants").addEventListener("click", () => {
  rendreVoyants();
  afficherVue("voyants");
});
$("nk-voyants-filtres").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-couleur]");
  if (!btn) return;
  filtreVoyantActif = btn.dataset.couleur;
  $("nk-voyants-filtres").querySelectorAll(".nk-filtre-couleur").forEach((b) => b.classList.toggle("active", b === btn));
  rendreVoyants();
});

// ── Glossaire des sigles ──────────────────────────────────────────────────

function construireGlossaire() {
  const trouves = new Map();
  for (const cat of notice.categories) {
    for (const s of cat.sections) {
      const m = /^(.*?)\s*\(([A-ZÀ-Ü0-9]{2,8})\)/.exec(s.titre);
      if (m && !trouves.has(m[2])) trouves.set(m[2], { sigle: m[2], definition: m[1].trim(), catId: cat.id, sectionId: s.id });
    }
  }
  glossaire = [...trouves.values()].sort((a, b) => a.sigle.localeCompare(b.sigle));
}

function rendreGlossaire() {
  $("nk-glossaire-vide").classList.toggle("hidden", glossaire.length > 0);
  $("nk-glossaire-liste").innerHTML = glossaire
    .map(
      (g) => `
      <button type="button" class="nk-section-carte" data-cat="${g.catId}" data-section="${g.sectionId}">
        <span>
          <div class="nk-section-carte-titre">${echapperHtml(g.sigle)}</div>
          <div class="nk-section-carte-extrait">${echapperHtml(g.definition)}</div>
        </span>
        <span class="nk-section-carte-fleche">›</span>
      </button>`,
    )
    .join("");
  cablerCartesSections($("nk-glossaire-liste"));
}

$("nk-ouvrir-glossaire").addEventListener("click", () => {
  rendreGlossaire();
  afficherVue("glossaire");
});

// ── Checklists ────────────────────────────────────────────────────────────

function rendreChecklist() {
  const def = CHECKLISTS[checklistActive];
  const coches = new Set(lireChecklist(checklistActive));
  $("nk-checklist-liste").innerHTML = def.items
    .map(
      (texte, i) => `
      <label class="nk-checklist-item${coches.has(i) ? " coche" : ""}" data-index="${i}">
        <input type="checkbox" ${coches.has(i) ? "checked" : ""}>
        <span>${echapperHtml(texte)}</span>
      </label>`,
    )
    .join("");
  $("nk-checklist-liste").querySelectorAll(".nk-checklist-item").forEach((label) => {
    label.querySelector("input").addEventListener("change", (e) => {
      const coches2 = new Set(lireChecklist(checklistActive));
      const i = Number(label.dataset.index);
      if (e.target.checked) coches2.add(i);
      else coches2.delete(i);
      sauverChecklist(checklistActive, [...coches2]);
      label.classList.toggle("coche", e.target.checked);
    });
  });
}

$("nk-ouvrir-checklists").addEventListener("click", () => {
  rendreChecklist();
  afficherVue("checklists");
});
document.querySelectorAll(".nk-checklist-onglet").forEach((btn) => {
  btn.addEventListener("click", () => {
    checklistActive = btn.dataset.check;
    document.querySelectorAll(".nk-checklist-onglet").forEach((b) => b.classList.toggle("active", b === btn));
    rendreChecklist();
  });
});
$("nk-checklist-reinit").addEventListener("click", () => {
  if (confirm("Décocher toutes les cases de cette checklist ?")) {
    sauverChecklist(checklistActive, []);
    rendreChecklist();
  }
});
$("nk-checklist-imprimer").addEventListener("click", () => window.print());

// ── Impression / export PDF d'une catégorie (via le navigateur) ─────────

$("nk-categorie-imprimer-btn").addEventListener("click", () => {
  const fenetre = window.open("", "_blank", "width=850,height=1000");
  if (!fenetre) return;
  const corps = categorieActive.sections
    .map((s) => {
      const images = (s.images || []).map((img) => `<img src="./images/${img}" style="max-width:100%;margin:8px 0;">`).join("");
      return `<h2>${echapperHtml(s.titre)}</h2>${rendreMarkdownLeger(s.contenu)}${images}`;
    })
    .join("<hr>");
  fenetre.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${echapperHtml(categorieActive.titre)}</title>
    <style>body{font-family:Arial,sans-serif;color:#111;padding:28px;max-width:800px;margin:0 auto;line-height:1.5;}h1{border-bottom:2px solid #333;padding-bottom:8px;}img{max-width:100%;}</style>
    </head><body><h1>${echapperHtml(categorieActive.titre)} — Notice Kona</h1>${corps}</body></html>`);
  fenetre.document.close();
  fenetre.focus();
  setTimeout(() => fenetre.print(), 300);
});

// ── Thème clair/sombre ────────────────────────────────────────────────────

function appliquerTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $("nk-theme-btn").textContent = theme === "clair" ? "☀️" : "🌙";
}
$("nk-theme-btn").addEventListener("click", () => {
  const nouveau = lireTheme() === "clair" ? "sombre" : "clair";
  sauverTheme(nouveau);
  appliquerTheme(nouveau);
});

// ── Navigation / retour (bouton Android, bouton flèche) ─────────────────

$("nk-retour-btn").addEventListener("click", () => history.back());
window.addEventListener("popstate", (e) => {
  const vue = e.state?.vue || "accueil";
  afficherVue(vue, { historique: false });
  if (vue === "accueil") categorieActive = null;
  else if (vue === "categorie" && categorieActive) ouvrirCategorie(categorieActive.id, { historique: false });
});

// ── Mentions / à propos / vérification de mise à jour ────────────────────

$("nk-mentions-btn").addEventListener("click", () => {
  $("nk-mentions-texte").textContent = `${MENTION_COURTE} — ${VERSION_TEXTE}`;
  $("nk-mentions").querySelector(".nk-mentions-legal").textContent = MENTION_LEGALE;
  $("nk-maj-resultat").textContent = "";
  $("nk-mentions").classList.remove("hidden");
});
$("nk-mentions-fermer").addEventListener("click", () => $("nk-mentions").classList.add("hidden"));

$("nk-verifier-maj-btn").addEventListener("click", async () => {
  $("nk-maj-resultat").textContent = "Vérification…";
  try {
    const fraiche = await (await fetch("./data/notice.json", { cache: "no-store" })).json();
    if (fraiche.version && fraiche.version !== notice.version) {
      $("nk-maj-resultat").textContent = "🔄 Une nouvelle version du contenu est disponible. Ferme et rouvre l'appli pour la charger.";
    } else {
      $("nk-maj-resultat").textContent = "✅ Contenu déjà à jour.";
    }
  } catch {
    $("nk-maj-resultat").textContent = "Impossible de vérifier (pas de réseau ?).";
  }
});

// ── Chargement des données ───────────────────────────────────────────────

async function chargerNotice() {
  try {
    const reponse = await fetch("./data/notice.json");
    if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
    notice = await reponse.json();
    construireIndexTitres();
    construireGlossaire();
    try {
      voyants = (await (await fetch("./data/voyants.json")).json()).voyants || [];
    } catch {
      voyants = [];
    }
    $("nk-chargement").classList.add("hidden");
    rendreAccueil();

    // Raccourcis d'appli (manifest "shortcuts") : #recharge, #favoris...
    const hash = location.hash.replace("#", "");
    if (hash === "favoris") {
      /* déjà visible en haut de l'accueil */
    } else if (hash === "voyants") {
      rendreVoyants();
      afficherVue("voyants", { historique: false });
    } else if (hash && notice.categories.some((c) => c.id === hash)) {
      ouvrirCategorie(hash, { historique: false });
    }
  } catch (e) {
    console.error("[NoticeKona] Chargement impossible :", e);
    $("nk-chargement").classList.add("hidden");
    $("nk-erreur").classList.remove("hidden");
  }
}

// ── Service worker (hors-ligne) ───────────────────────────────────────────

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch((e) => console.error("[NoticeKona] SW :", e));
}

appliquerTheme(lireTheme());
history.replaceState({ vue: "accueil" }, "");
chargerNotice();
