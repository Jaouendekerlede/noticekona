// Rendu Markdown très léger (gras, listes, paragraphes) -- le contenu généré
// pour cette notice ne contient que ça (voir le prompt d'extraction). Pas de
// dépendance externe : le contenu est fixe (généré une fois, pas de texte
// libre d'un tiers), mais on échappe quand même le HTML en premier par
// prudence avant d'interpréter la syntaxe Markdown.

function echapperHtml(texte) {
  return texte.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function ligneEnHtml(ligne) {
  return ligne
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

export function rendreMarkdownLeger(texte) {
  const lignes = echapperHtml(texte || "").split(/\r?\n/);
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
    if (puce) {
      fermerParagraphe();
      listeEnCours.push(puce[1]);
    } else {
      fermerListe();
      paragrapheEnCours.push(ligne);
    }
  }
  fermerParagraphe();
  fermerListe();
  return blocs.join("\n");
}
