// Lexique affiché dans les réglages : les termes employés par l'application, en langage courant.

export const LEXIQUE = [
  {
    theme: "Allures et effort",
    termes: [
      ["Allure", "Temps mis pour parcourir un kilomètre, par exemple 5'45 /km. Plus le chiffre est petit, plus tu vas vite."],
      ["Fondamental (EF)", "Endurance fondamentale : allure facile, à laquelle tu tiens une conversation par phrases entières. C'est la base de presque tout l'entraînement."],
      ["Tempo", "Allure soutenue mais maîtrisée, entre le fondamental et le seuil. Quelques mots passent, pas une phrase."],
      ["Seuil", "Allure la plus rapide que tu pourrais tenir environ une heure. Inconfortable, mais la foulée reste propre."],
      ["Récupération", "Allure très lente, plus lente que le fondamental, pour faire circuler le sang sans fatiguer."],
      ["NGP", "Normalized Graded Pace, « allure ajustée à la pente » de la montre : l'effort traduit en allure équivalente sur plat. En montée l'allure réelle ralentit, la NGP reste stable si l'effort est stable."],
      ["Allure de référence", "Allures fondamental, tempo, seuil et récupération de ta fiche, mesurées sur plat lors de séances réelles. Tu peux les modifier dans Profil : le plan et les temps visés suivent."],
      ["Vitesse ascensionnelle", "Mètres de dénivelé gravis en une heure dans une montée raide, en m/h."],
      ["Cadence", "Nombre de pas par minute. Une cadence un peu élevée limite les chocs, surtout en descente."],
    ],
  },
  {
    theme: "Fréquence cardiaque",
    termes: [
      ["FC", "Fréquence cardiaque, en battements par minute (bpm)."],
      ["FC max", "La plus haute fréquence que ton cœur atteint à l'effort maximal. Elle sert à calculer les zones ; une valeur mesurée vaut mieux qu'une formule."],
      ["Zones", "Cinq plages de FC, de la zone 1 (récupération) à la zone 5 (effort maximal). Chaque séance indique la plage à respecter."],
      ["Zone 2", "La zone du fondamental et des sorties longues. Rester en zone 2 est la consigne la plus souvent donnée… et la plus souvent dépassée."],
      ["Plafond", "FC à ne pas dépasser pendant un type de séance, fixée dans ta fiche. Au-delà, ralentis ou marche."],
    ],
  },
  {
    theme: "Séances",
    termes: [
      ["Footing", "Course facile, en fondamental."],
      ["SL", "Sortie longue : la séance la plus longue de la semaine, en endurance, sur un terrain proche de celui de ta course."],
      ["Séance de qualité", "Séance avec une partie plus intense (tempo, seuil, montées). Une seule séance dure par semaine."],
      ["Fractionné", "Alternance d'efforts soutenus et de récupérations, par exemple 3 × 8 min au seuil, récupération 3 min."],
      ["Côtes", "Montées courues ou marchées à effort soutenu, pour la force et l'économie en montée."],
      ["Vallonné", "Sortie en endurance sur un parcours avec du relief, sans recherche d'intensité."],
      ["Renfo", "Renforcement musculaire, après la course certains jours : mollets, cuisses, gainage, équilibre."],
      ["Alternative", "Activité qui peut remplacer la séance (ski de randonnée, ski de fond), au choix selon la neige."],
      ["Séance clé ★", "Séance qui sert de point de contrôle : fin de phase, sortie test, répétition générale."],
      ["Séance déplacée", "Séance que tu as changée de jour dans sa semaine. Sa case a une bordure en pointillés."],
    ],
  },
  {
    theme: "Le plan",
    termes: [
      ["Phase", "Période du plan qui a un but : récupération, base, développement, spécifique, affûtage."],
      ["Base", "Volume progressif en endurance, pour construire le moteur."],
      ["Développement", "Le volume continue de monter, le seuil entre en jeu, le relief augmente."],
      ["Spécifique", "Séances qui ressemblent à la course : dénivelé, terrain, durée, nutrition."],
      ["Affûtage", "Les dernières semaines : le volume baisse, l'intensité reste, pour arriver frais."],
      ["Semaine allégée", "Une semaine sur quatre environ, la charge baisse d'un tiers pour assimiler le travail."],
      ["Charge", "Volume d'entraînement d'une semaine. Elle n'augmente pas de plus de 10 % d'une semaine à l'autre."],
      ["D+", "Dénivelé positif : total des mètres gravis pendant la sortie ou la course."],
      ["Distance-effort", "Distance en km + D+ en centaines de mètres : 50 km et 2 500 m D+ font 75 km-effort. Elle rend comparables des courses de profils différents."],
      ["Temps visés", "Trois scénarios (ambitieux, réaliste, prudent) calculés à partir de ta course de référence, puis ajustés si tu modifies tes allures."],
      ["Course de référence", "Ta dernière course représentative, qui sert à calibrer les temps visés."],
      ["J-", "Nombre de jours avant ta course principale."],
    ],
  },
];
