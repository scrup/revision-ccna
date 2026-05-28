## Quick orientation — CCNA1 quiz project

This repository is a small vanilla-JS quiz site for CCNA1-style exam revision. Two implementations exist and are important to know:

- Legacy CSV-based (root):
  - `index.html` (root) + `script.js` — reads `ExamCisco1.csv` using synchronous XHR and `overrideMimeType('iso-8859-1')`.
  - CSV format and parsing live in `script.js` (function `getCSVData()` / `getQuestions()`). The CSV columns are documented at the top of `script.js` — preserve that order when editing `ExamCisco1.csv`.
  - Important CSV conventions: semicolon (`;`) delimiter, ANSI / ISO-8859-1 encoding, type field `1`=text / `2`=image, indices for answers and correct answers are 1-based within the CSV parsing logic.

- Modern JSON-based example (under `exemple/`):
  - `exemple/index.html` + `exemple/script.js` — async/await + Fetch, reads `exemple/questions.json`.
  - JSON question schema used in `exemple/questions.json`:
    - `id` (number), `question` (string), `answers` (array of strings), `correctAnswers` (array of 0-based indices), `image` (string or null), `type` (`text` or `image`).

What to edit and where
- Add/update questions:
  - For quick edits use `exemple/questions.json` (recommended). Follow 0-based `correctAnswers` indices.
  - To modify the legacy dataset edit `ExamCisco1.csv` and keep the header/order used in `script.js`.
- UI / styling: `style.css` (root) controls colors and CSS variables. `exemple/` contains an updated style pattern in its files.

Runtime / developer workflows
- No build step. It's static HTML/JS/CSS.
- Recommended to serve files over a simple local server (some browsers block XHR or fetch when opened as `file://`). From PowerShell run:

```powershell
python -m http.server 8000
# or
php -S localhost:8000
```

- In VS Code use the Live Server extension (right-click `index.html` / `exemple/index.html` -> Open with Live Server).

Project-specific patterns and gotchas for agents
- Two co-existing implementations: changes to one will not affect the other. Before editing, decide whether to update the legacy CSV flow (`script.js` + `ExamCisco1.csv`) or the modern example (`exemple/script.js` + `exemple/questions.json`). Prefer updating `exemple/` for clearer async code and testability.
- CSV parsing details (from `script.js`):
  - `getCSVData()` splits on `\n` and `;`. The code expects the last line may be empty and ignores it.
  - Answer indices used to map `reponsesCorrectes` are 1-based in the CSV; the script converts them to 0-based when indexing into `reponses`.
  - `script.js` sets/reads these localStorage keys: `score`, `currentQuestionIndex`, `showCorrections`.
- Randomization and limits:
  - Root `script.js` enforces `max` of 130 in the setup input and selects random unique questions via `shuffleQuestions()` which mutates the original array (it splices out used items).
  - `exemple/script.js` uses a Fisher–Yates shuffle (`shuffleArray`) and slices a copy — safer for keeping `allQuestions` intact.

Search hints (useful for automated edits)
- Look for these symbols when modifying behavior:
  - `getQuestions`, `getCSVData`, `GetDataQuizz`, `shuffleQuestions` (legacy)
  - `loadQuestions`, `shuffleArray`, `displayQuestion`, `checkAnswer` (modern/example)

Testing small changes
- After editing question data or UI, open the matching `index.html` (root or `exemple/`) via Live Server or the simple HTTP server above and exercise a 3–5 question quiz to verify:
  - Questions render, images load (relative paths), answers selectable, validation advances, and score shows at the end.

Safety and encoding
- When editing `ExamCisco1.csv` keep encoding ISO-8859-1 / ANSI to preserve parsing in `script.js` OR convert `script.js` to expect UTF-8 (preferred long-term) and update XHR override accordingly.

If you need clarification
- Tell me which implementation you want to change (legacy CSV or modern JSON example) and whether you prefer converting CSV -> JSON; I can move CSV to JSON, update the UI, and ensure encoding and tests pass.

Key files to open first
- `index.html`, `script.js`, `ExamCisco1.csv` (root)
- `exemple/index.html`, `exemple/script.js`, `exemple/questions.json`, `exemple/readme.md`

End of file — please review and tell me if you want me to prefer the JSON example, convert the CSV, or add schema validation and tests.
