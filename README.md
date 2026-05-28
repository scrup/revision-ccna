# Revision CCNA1 - Plateforme de quiz interactive

Application web statique pour s'entrainer aux questions CCNA1 avec un mode examen, un suivi de progression local et une interface bilingue (francais/anglais).

## Fonctionnalites principales
- Quiz interactif a choix simple et multiple.
- Mode examen chronometre: 1h15 (fin automatique a 00:00).
- Navigation entre questions: Precedent, Valider et suivant, Terminer.
- Correction immediate en cas d'erreur.
- Reprise apres rechargement de page (progression en `localStorage`).
- Interface bilingue FR/EN avec selection de langue.
- Chargement dynamique des sources via `data/modules-manifest.json`.

## Structure du projet
- `CCNA1-main/index.html`: page principale.
- `CCNA1-main/style.css`: styles.
- `CCNA1-main/script.js`: logique du quiz, i18n, timer, persistance.
- `CCNA1-main/data/*.json`: banques de questions.
- `CCNA1-main/data/modules-manifest.json`: liste des modules disponibles.
- `CCNA1-main/tools/`: scripts utilitaires (CSV/JSON, scraping).

## Lancer en local
Depuis la racine du projet:

```powershell
py -m http.server 8000
```

Puis ouvrir:
- `http://localhost:8000/CCNA1-main/index.html`

## Format des questions (JSON)
Chaque question suit ce schema:

```json
{
  "id": 1,
  "question": "Texte de la question",
  "answers": ["A", "B", "C"],
  "correctAnswers": [1],
  "image": null,
  "type": "text"
}
```

Notes:
- `correctAnswers` utilise des index bases sur 0.
- Pour une question a plusieurs bonnes reponses, fournir plusieurs index.

## Ajouter un module
1. Ajouter le fichier JSON dans `CCNA1-main/data/`.
2. Ajouter une entree dans `CCNA1-main/data/modules-manifest.json`:

```json
{ "label": "Modules X-Y", "path": "data/modules-x-y.json" }
```

3. Recharger la page.

## Persistance locale
L'application enregistre:
- langue choisie,
- configuration du quiz,
- progression en cours,
- score,
- ordre des questions,
- etat du timer.

Ces donnees sont stockees en local dans le navigateur (`localStorage`).

## Bloc Gemini (preparation)
Un bloc est deja present dans `CCNA1-main/script.js`:
- `GEMINI BLOCK`
- `const GEMINI_API_KEY = '';`

Tu peux y ajouter ta cle API quand tu activeras les fonctionnalites Gemini.

## Avertissement
Projet destine a la revision et a l'entrainement.
Verifier les droits d'utilisation des contenus de questions si tu partages publiquement le depot.
