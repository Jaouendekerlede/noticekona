// Checklists curées à partir du contenu de la notice (catégories Recharge et
// Entretien) -- pas générées à chaque fois par l'IA, fixes et vérifiées.

export const CHECKLISTS = {
  trajet: {
    titre: "Avant un long trajet",
    items: [
      "Batterie chargée au niveau cible prévu pour le trajet (voir Recharge)",
      "Pression des pneus vérifiée (témoin TPMS éteint)",
      "Niveau de liquide lave-glace suffisant",
      "Essuie-glaces en bon état (pas de traces/stries)",
      "Câble de recharge (CA/portable) emporté si recharge prévue en route",
      "Éclairage extérieur fonctionnel (feux, clignotants, stop)",
      "Itinéraire et arrêts de recharge planifiés (TrajetVE)",
      "Objets dans le coffre/habitacle bien arrimés",
    ],
  },
  hivernage: {
    titre: "Avant une longue période sans rouler (hivernage)",
    items: [
      "Batterie haute tension chargée à un niveau confortable (ni vide, ni 100 % en continu)",
      "Recharger au moins une fois tous les 3 mois si le véhicule reste à l'arrêt",
      "Batterie 12V vérifiée (se recharge normalement seule via la haute tension)",
      "Pression des pneus vérifiée avant l'arrêt prolongé",
      "Véhicule garé si possible à l'abri des températures extrêmes",
      "Niveau de liquide lave-glace adapté au gel (hiver)",
      "Vérifier l'état de charge avant de reprendre la route après une longue pause",
    ],
  },
};
