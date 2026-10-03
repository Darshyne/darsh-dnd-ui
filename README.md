# darsh-dnd · Darsh UI DnD5 (`darsh-dnd-ui`)

Interface de combat façon Baldur's Gate 3 pour **Foundry VTT V14** et **dnd5e 6.x** :

- la **Barre** du bas : actions par onglets, disposition par glisser-déposer propre à chaque acteur, tiroir
  des niveaux pour les sorts surchargeables, jeux d'armes, panneau d20, fin du tour avec anneau de mouvement ;
- le **Groupe** : colonne de portraits des personnages sur le côté ;
- la **Frise** : ordre du tour en haut de l'écran, en combat.

Elle remplace BG3 Inspired HUD, Party HUD et Carousel Combat Tracker (déclarés en conflit). Elle **requiert
le moteur [`dnd5e-combat`](https://github.com/Darshyne/dnd5e-combat)**, dont elle lit l'API d'interface
(`api.ui` : budget du tour, déplacement, raisons des actions grisées, attaques multiples, lumière) sans rien
recalculer elle-même. Aucun code ni aucune image des modules remplacés ou du jeu n'est repris.

## Installation

Dans Foundry (ou sur The Forge), *Installer un module* → coller l'URL de manifeste :

```
https://github.com/Darshyne/darsh-dnd-ui/releases/latest/download/module.json
```

Depuis les sources : le module Foundry est le
sous-dossier `module/`, à copier ou lier dans `Data/modules/darsh-dnd-ui`. Tests : `npm install && npm test`.

Interface en français. En développement actif.

## Licence

Code sous licence MIT (voir `LICENSE`).

Ce travail inclut des éléments du System Reference Document 5.2 (« SRD 5.2 ») de Wizards of the Coast LLC,
disponible sur https://www.dndbeyond.com/srd. Le SRD 5.2 est sous licence Creative Commons Attribution 4.0
International, disponible sur https://creativecommons.org/licenses/by/4.0/legalcode. Ce module n'est ni
affilié à Wizards of the Coast ni approuvé par elle.
