# CCNA1 Quiz – Révision interactive (Cisco Certified Network Associate 1)

> Application web statique (HTML/CSS/JS) pour s'entraîner aux questions de type CCNA1. Les questions sont chargées depuis des fichiers JSON (examen final + modules) et un quiz aléatoire est généré avec suivi de progression et score.

## Sommaire
- [Aperçu](#aperçu)
- [Fonctionnalités](#fonctionnalités)
- [Structure du projet](#structure-du-projet)
- [Schéma des données](#schéma-des-données)
  - [Format JSON moderne](#format-json-moderne)
  - [Ancien format CSV](#ancien-format-csv)
- [Utilisation rapide](#utilisation-rapide)
- [Chargement et sélection des jeux de données](#chargement-et-sélection-des-jeux-de-données)
- [Ajouter / Mettre à jour des questions](#ajouter--mettre-à-jour-des-questions)
- [Scraper externe (récupération de modules depuis un site)](#scraper-externe-récupération-de-modules-depuis-un-site)
- [Conversion CSV -> JSON](#conversion-csv---json)
- [Manifeste des modules](#manifeste-des-modules)
- [Personnalisation / Style](#personnalisation--style)
- [Roadmap / Idées futures](#roadmap--idées-futures)
- [Avertissement / Droits](#avertissement--droits)

## Aperçu
L'application propose un quiz interactif basé sur un jeu de questions CCNA1. Chaque session permet de choisir:
- La source des questions (examen final ou modules extraits).
- Le nombre de questions (limité dynamiquement au total disponible dans la source sélectionnée).

Les réponses sont validées question par question. En cas d'erreur, les bonnes réponses sont affichées avant de continuer.

## Fonctionnalités
- Chargement dynamique des datasets JSON.
- Sélecteur de source rempli automatiquement depuis `data/modules-manifest.json`.
- Limitation automatique du nombre de questions (badge visuel avec état).
- Mélange aléatoire (Fisher–Yates) sans modifier le jeu original.
- Gestion des questions à réponse unique ou multiple (radio / checkbox).
- Affichage des corrections et du score final (avec appréciation selon le pourcentage).
- Scripts Python pour:
  - Conversion de l'ancien CSV.
  - Scraping de pages modules CCNA pour extraction heuristique des Q/R.

## Structure du projet
```
CCNA1/
├── index.html              # Page principale du quiz
├── style.css               # Styles globaux
├── script.js               # Logique du quiz (chargement, affichage, scoring)
├── ExamCisco1.csv          # Ancien jeu de données (format CSV historique)
├── questions.json          # (Peut être obsolète si remplacé par data/final.json)
├── data/
│   ├── final.json          # Examen final (source principale consolidée)
│   ├── modules-1-3.json    # Exemple module (scrapé / à vérifier)
│   ├── modules-4-7.json    # … (autres modules potentiels)
│   ├── ...
│   └── modules-manifest.json # Liste des sources disponibles
└── tools/
    ├── scrape_ccna.py      # Scraper configurable (--url / --out)
    ├── csv_to_json.py      # Convertisseur CSV -> JSON
```

## Schéma des données
### Format JSON moderne
Chaque fichier JSON est une liste d'objets question:
```json
{
  "id": 12,
  "question": "Texte de la question",
  "answers": ["Réponse A", "Réponse B", "Réponse C"],
  "correctAnswers": [1],        // indices 0-based
  "image": null,                // ou chemin/URL vers l'image
  "type": "text"               // "text" ou "image"
}
```
- `correctAnswers` contient un tableau (multi-réponses possible). Une seule bonne réponse => tableau d'un seul index.
- `type` doit refléter la présence d'une image (`image != null` → "image").

### Ancien format CSV
Le fichier `ExamCisco1.csv` était structuré avec separateur `;` et indices de réponses correctes 1-based. Colonnes observées:
```
question ; type ; nbReponses ; nbCorrect ; reponse1 ; reponse2 ; … ; correctIndex1 ; correctIndex2 ; … ; image
```
Le script `csv_to_json.py` convertit ces lignes en objets JSON modernes.

## Utilisation rapide
### 1. Servir localement (recommandé)
Certaines méthodes de chargement (fetch) échouent en `file://`. Démarrez un petit serveur:
```powershell
py -m http.server 8000
# Ouvrez ensuite http://localhost:8000/
```
Ou via PHP si installé:
```powershell
php -S localhost:8000
```
Ou utilisez l'extension VS Code "Live Server" (clic droit sur `index.html`).

### 2. Lancer un quiz
1. Sélectionnez la source (Examen final ou module).
2. Ajustez le nombre de questions (champ borné automatiquement).
3. Cliquez "Commencer le quiz".
4. Validez chaque question; en cas d'erreur, l'écran de correction s'affiche.
5. Consultez le score final puis recommencez si souhaité.

## Chargement et sélection des jeux de données
- Le `<select id="questionSource">` est rempli à l'initialisation via `populateSourceSelect()`.
- Le manifeste JSON fournit label + chemin; chaque entrée devient une option.
- La sélection par défaut privilégie l'entrée `final` si présente.

## Ajouter / Mettre à jour des questions
### Méthode recommandée (JSON)
- Éditez `data/final.json` ou un fichier module existant (`data/modules-x-y.json`).
- Respectez le schéma (indices 0-based pour `correctAnswers`).
- Ajoutez une entrée dans `data/modules-manifest.json` si c'est un nouveau fichier (label descriptif + chemin relatif).

### Depuis le CSV historique
- Gardez l'ordre et le séparateur `;`.
- Exécutez le convertisseur pour générer un JSON à partir du CSV.

## Scraper externe (récupération de modules depuis un site)
Script: `tools/scrape_ccna.py`

Usage:
```powershell
py tools/scrape_ccna.py --url https://ccnareponses.com/modules-1-3-examen-sur-la-connectivite-des-reseaux-de-base-et-les-communications-reponses/
# Optionnel: préciser la sortie
py tools/scrape_ccna.py --url <URL> --out data/mon-module.json
```

Fonctionnement:
- Télécharge la page HTML avec un user-agent "navigateur".
- Cherche des blocs question (`<p><strong>Question …</strong></p>` ou titres) + liste `<ul>` des réponses.
- Marque les réponses correctes si la classe `correct_answer` est détectée.
- Tente d'associer une image si un `<img>` apparaît avant la liste des réponses.
- Produit un fichier JSON (nom dérivé du slug `modules-x-y`).

Limites:
- Heuristique fragile → révision manuelle nécessaire.
- Peut manquer explications (boîtes `message_box`).

## Conversion CSV -> JSON
Script: `tools/csv_to_json.py`

Usage:
```powershell
py tools/csv_to_json.py
```
Sortie: `exemple/questions_from_csv.json` (vous pouvez la déplacer ensuite vers `data/final.json` ou un autre fichier de module).

Points clés:
- Gère auto-détection encodage (`utf-8-sig` fallback `iso-8859-1`).
- Convertit indices corrects 1-based → 0-based.
- Fixe `type` à `image` si une colonne image non vide est trouvée.

## Manifeste des modules
Fichier: `data/modules-manifest.json`

Exemple:
```json
[
  { "label": "Examen final", "path": "data/final.json" },
  { "label": "Modules 1–3", "path": "data/modules-1-3.json" }
]
```
Ajout d'un module:
1. Créez ou copiez le fichier JSON des questions dans `data/`.
2. Ajoutez une entrée `{ "label": "Modules X–Y", "path": "data/modules-x-y.json" }`.
3. Rechargez la page (le sélecteur devrait inclure le nouveau module).

## Personnalisation / Style
- Palette et variables CSS dans `style.css`.
- Le sélecteur source est stylisé (flèche custom, focus accessible).
- Adapter les couleurs: modifiez les variables `--primary-color`, `--background`, etc.

## Roadmap / Idées futures
- Génération automatique du manifeste en scannant `data/*.json`.
- Affichage du nombre de questions dans chaque option (ex: "Modules 1–3 (62)").
- Mode "examen combiné" fusionnant plusieurs modules.
- Ajout champ "explanation" (récupéré via blocs `message_box`) pour l'apprentissage.
- Tests automatisés (validation schéma JSON + intégrité indices).
- Internationalisation (i18n FR/EN).

## Avertissement / Droits
Ce projet est destiné à l'entraînement personnel. Les marques Cisco et CCNA appartiennent à Cisco Systems. Vérifiez les conditions d'utilisation des sources web avant tout scraping ou diffusion.

Aucune garantie: les données peuvent contenir des erreurs ou nécessiter une validation supplémentaire. Utilisation à vos risques.

---
**Auteur**: Rémy Cuvelier (2025)

Contributions bienvenues: ouvrez une *issue* ou proposez une *pull request*.
