# Gabarit du cadre de la fenêtre de jet

La fenêtre de jet à la manière de BG3 (quand le MJ demande un jet) se dessine en CSS par défaut. Elle peut être habillée par
des images faites dans Photoshop : **cinq fichiers pour le cadre** et, si tu veux, **la face du d20** (plus bas), posés dans `module/assets/roll/`, et c'est tout — la fenêtre les détecte
toute seule à son ouverture (un F5 suffit, pas besoin de relancer le monde). Un fichier absent garde son dessin CSS : on peut
les livrer un par un.

Les gabarits annotés sont dans [`gabarit-cadre-jet/`](gabarit-cadre-jet/) : ouvrir chacun dans Photoshop comme calque guide
(au-dessus de tout, opacité ~40 %), dessiner dessous, masquer le guide à l'export.

## Les cinq images

| Fichier | Taille du PSD (×2) | Affiché | Rôle |
|---|---|---|---|
| `medallion.webp` | **720 × 840** | 360 × 420 | Facultatif : un cadre derrière le DD, les dés, le bandeau et le mode (sans lui, aucun cadre n'est dessiné). |
| `tile.webp` | **220 × 240** | 110 × 120 | Une tuile de bonus (caractéristique, maîtrise, Assistance…). |
| `tile-active.webp` | **220 × 240** | 110 × 120 | La même, une fois l'aide accordée (lueur, filet vert…). |
| `banner.webp` | **600 × 80** | 300 × 40 | Le bandeau « Cliquer sur les dés pour les lancer », puis le résultat. |
| `button.webp` | **460 × 88** | 230 × 44 | Le bouton « Annuler ». |

Chaque image est **étirée exactement** à sa taille d'affichage (pas de découpe en 9 tranches) : garder les proportions du
gabarit, sinon le dessin se déforme.

## Les zones (cotes du PSD, origine en haut à gauche)

Couleurs des gabarits : **vert** = texte posé par le module par-dessus l'image (garder un fond lisible, sombre et uni) ;
**bleu** = les dés ; **jaune** = un autre élément s'y pose (garder calme) ; **filet fuchsia** = marge de sécurité ;
**filet or** = bord de l'image.

### Médaillon (720 × 840)

- **DD** : 240 → 480 en x, 92 → 260 en y. Petit libellé en capitales (« DEGRÉ DE DIFFICULTÉ ») puis le nombre en grand. La zone
  reste réservée même sans DD.
- **Dés** : un d20 de 280 × 280 centré en (360, 430) ; avec l'Avantage ou le Désavantage, deux d20 côte à côte dans
  116 → 604 × 310 → 550. Un fond sombre, éventuellement un halo ou un cercle gravé derrière, met les dés en valeur.
- **Bandeau** : 60 → 660 × 612 → 692 — c'est là que se pose `banner.webp`, puis, au résultat, le bandeau « Réussite » / « Échec » (plus
  large que le médaillon, il en déborde de chaque côté). Ne rien y mettre d'important.
- **Avantage / Désavantage** : texte vert ou rouge de 15 px, centré, 768 → 812 en y (le bas du médaillon).
- Tout ce qui est hors de la forme du médaillon doit être **transparent** (la fenêtre est posée sur un voile sombre).

### Tuiles (220 × 240)

- **Valeur** (« +4 », « +1d4 ») : 20 → 200 × 12 → 56, 18 px.
- **Icône** : 96 × 96 centrée, 62 → 158 × 60 → 156 — c'est là que s'affiche le pictogramme de la caractéristique ou le
  portrait de l'aidant (coins arrondis).
- **Libellé** : 12 → 208 × 160 → 228, deux lignes de 12 px.

### Bandeau (600 × 80) et bouton (460 × 88)

Texte centré de 16 px ; garder le centre uni, ornements aux extrémités.

## Le d20 du médaillon (facultatif)

Le d20 du médaillon est dessiné par le module (il tourne pendant que Dice So Nice lance, puis affiche le chiffre sorti et le décompte). Il peut
être remplacé par une image : `d20.webp`, **280 × 280** (affiché 140 × 140, ou 120 × 120 quand deux dés sont montrés), fond transparent, la
face du dé vue de face. Le module écrit le chiffre au centre (26 px) : garder le centre uni sur environ 120 × 70 (PSD).

## Export

- Photoshop : *Fichier › Exporter › Exporter sous…* → **WebP**, qualité 90, **transparence conservée**, à la taille du PSD (×2 :
  l'écran affiche la moitié, net sur les écrans haute densité).
- Noms exacts ci-dessus, en minuscules, dans `module/assets/roll/` (du dépôt `darsh-dnd-ui`).
- Viser moins de 300 Ko pour le médaillon, moins de 60 Ko pour une tuile.

## Ce qui ne change pas avec les images

Les couleurs du texte, des dés, de la réussite et de l'échec restent celles du thème choisi (éditeur de couleurs, groupe
« Fenêtre de jet ») : une image habille le cadre, le thème colore le reste. Rien de Baldur's Gate 3 ne doit être repris
(ni image, ni capture) : s'en inspirer seulement.
