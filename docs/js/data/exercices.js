// Catalogue d'exercices de renforcement. La fiche athlète choisit les identifiants retenus.
// Groupe A : force (premier jour de renforcement de la semaine) ; groupe B : stabilité (second jour).

export const EXERCICES = {
  "mollet-excentrique": {
    groupe: "A", nom: "Mollets excentriques sur marche", series: "3 × 15 par jambe",
    technique: "Montée sur les deux pieds, descente sur un seul en 3 secondes, talon sous le niveau de la marche.",
    eviter: "Descendre trop vite : la lenteur est le stimulus, pas la charge.",
    interet: "La prévention la mieux établie des tendinopathies d'Achille.",
  },
  "chaise": {
    groupe: "A", nom: "Chaise contre un mur", series: "3 × 45 s",
    technique: "Dos plaqué, cuisses parallèles au sol, poids sur les talons.",
    eviter: "Remonter le bassin quand ça brûle : réduire plutôt la durée que la position.",
    interet: "Prépare le quadriceps au freinage répété des descentes.",
  },
  "fentes": {
    groupe: "A", nom: "Fentes marchées", series: "3 × 12 par jambe",
    technique: "Grand pas, genou arrière proche du sol, buste droit.",
    eviter: "Pas trop court, qui reporte la charge sur le genou au lieu de la fesse.",
    interet: "Force en montée et stabilité du bassin en fin de course.",
  },
  "gainage": {
    groupe: "A", nom: "Gainage ventral", series: "3 × 45 s",
    technique: "Appui sur les avant-bras, corps aligné des talons à la nuque.",
    eviter: "Bassin qui s'affaisse ou fesses relevées.",
    interet: "Une foulée tient par le tronc quand les jambes ne suivent plus.",
  },
  "nordic-hamstring": {
    groupe: "A", nom: "Nordic hamstring", series: "3 × 5 à 8",
    technique: "À genoux, chevilles bloquées, descendre le buste vers l'avant le plus lentement possible, rattraper avec les mains.",
    eviter: "Casser les hanches : le corps reste droit des genoux aux épaules.",
    interet: "Renforcement excentrique des ischio-jambiers, contre les crampes et blessures de fin de course.",
  },
  "mollet-excentrique-unilateral": {
    groupe: "B", nom: "Mollet excentrique, côté fragile", series: "3 × 15",
    technique: "Même exécution que le mollet excentrique, sur la jambe la plus fragile uniquement.",
    eviter: "Sauter la séance quand tout va bien : c'est précisément là qu'elle sert.",
    interet: "Dose supplémentaire sur le côté qui a des antécédents.",
  },
  "pont-fessier": {
    groupe: "B", nom: "Pont fessier sur une jambe", series: "3 × 12 par jambe",
    technique: "Allongé sur le dos, une jambe tendue, monter le bassin par la fesse d'appui.",
    eviter: "Pousser avec le bas du dos plutôt qu'avec la fesse.",
    interet: "Un fessier faible transfère la charge sur les ischio-jambiers, puis sur le mollet.",
  },
  "gainage-lateral": {
    groupe: "B", nom: "Gainage latéral", series: "3 × 40 s par côté",
    technique: "Appui sur l'avant-bras et le pied, corps aligné vu de face.",
    eviter: "Bassin qui recule.",
    interet: "Tient le bassin sur les appuis instables des sentiers.",
  },
  "proprioception": {
    groupe: "B", nom: "Équilibre sur plan instable", series: "3 × 45 s par jambe",
    technique: "Genou légèrement fléchi, yeux ouverts puis fermés quand c'est acquis.",
    eviter: "Se rattraper au mur : réduire la durée et rester autonome.",
    interet: "Réduit le risque d'entorse, améliore la vitesse en descente technique.",
  },
  "copenhague": {
    groupe: "B", nom: "Planche de Copenhague", series: "3 × 20 à 30 s par côté",
    technique: "Gainage latéral, pied du dessus posé sur un banc, jambe du dessous libre ; débuter genou sur le banc.",
    eviter: "Laisser tomber la hanche.",
    interet: "Renforce les adducteurs, sujets aux crampes en fin de course longue.",
  },
};

export function seanceRenfo(ids, rangDansSemaine) {
  const groupe = rangDansSemaine === 0 ? "A" : "B";
  return ids.map((id) => ({ id, ...EXERCICES[id] })).filter((e) => e.nom && e.groupe === groupe);
}
