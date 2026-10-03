// Rendu Markdown très léger (gras, italique, listes, paragraphes) -- le
// contenu généré pour cette notice ne contient que ça (voir le prompt
// d'extraction). Le HTML est échappé en premier par prudence, avant
// d'interpréter la syntaxe Markdown.

export function echapperHtml(texte) {
  return (texte || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function ligneEnHtml(ligne) {
  return ligne
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

// Les étapes numérotées ("1. ...", "2. ...") d'un contenu, pour le mode
// pas-à-pas -- renvoie null si le contenu n'a pas au moins 3 étapes.
export function extraireEtapesNumerotees(texte) {
  const lignes = (texte || "").split(/\r?\n/).map((l) => l.trim());
  const etapes = [];
  for (const ligne of lignes) {
    const m = /^(\d+)[.)]\s+(.*)/.exec(ligne);
    if (m) etapes.push(m[2]);
  }
  return etapes.length >= 3 ? etapes : null;
}

export function rendreMarkdownLeger(texte) {
  const lignes = echapperHtml(texte).split(/\r?\n/);
  const blocs = [];
  let listeEnCours = [];

  const fermerListe = () => {
    if (listeEnCours.length) {
      blocs.push(`<ul>${listeEnCours.map((l) => `<li>${ligneEnHtml(l)}</li>`).join("")}</ul>`);
      listeEnCours = [];
    }
  };

  let paragrapheEnCours = [];
  const fermerParagraphe = () => {
    if (paragrapheEnCours.length) {
      blocs.push(`<p>${ligneEnHtml(paragrapheEnCours.join(" "))}</p>`);
      paragrapheEnCours = [];
    }
  };

  for (const brute of lignes) {
    const ligne = brute.trim();
    if (!ligne) {
      fermerParagraphe();
      fermerListe();
      continue;
    }
    const puce = /^[-*]\s+(.*)/.exec(ligne);
    const etape = /^\d+[.)]\s+(.*)/.exec(ligne);
    if (puce) {
      fermerParagraphe();
      listeEnCours.push(puce[1]);
    } else if (etape) {
      fermerParagraphe();
      listeEnCours.push(etape[1]);
    } else {
      fermerListe();
      paragrapheEnCours.push(ligne);
    }
  }
  fermerParagraphe();
  fermerListe();
  return blocs.join("\n");
}
