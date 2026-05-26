// CCNA quiz app with timed exam mode and reload-resume support
const QUIZ_STATE_KEY = 'ccna_quiz_state_v1';
const SETUP_STATE_KEY = 'ccna_setup_state_v1';
const LANG_STATE_KEY = 'ccna_lang_v1';
const EXAM_DURATION_MS = 75 * 60 * 1000; // 1h15

// GEMINI BLOCK:
// Add your Gemini API key below when you integrate Gemini features.
// Example: const GEMINI_API_KEY = 'AIza...';
const GEMINI_API_KEY = '';

const I18N = {
    fr: {
        htmlLang: 'fr',
        pageTitle: 'Revision CCNA1 - Cisco Certified Network Associate 1',
        langLabel: 'Langue',
        headerTitle: 'CCNA1 Revision Suite',
        badgeText: 'CISCO STYLE',
        setupTitle: "Configurer l'evaluation",
        labelSource: 'Module CCNA1 :',
        sourceHintDefault: 'Choisissez un module ou tous les modules',
        labelNumQuestions: 'Nombre de questions :',
        badgeQuestionsSuffix: 'questions',
        labelTimedMode: 'Mode examen CCNA (1h15 - chrono officiel)',
        timedModeHint: 'Simule les conditions reelles : arret automatique a 00:00',
        startQuiz: 'Lancer le quiz interactif',
        prev: 'Precedent',
        next: 'Valider et suivant',
        nextLast: 'Valider et terminer',
        finish: 'Terminer',
        correctionsTitle: 'Rapport detaille | Corrections CCNA',
        restartFromCorrection: 'Nouveau quiz',
        footerText: 'Cisco Networking Academy style - Revision CCNA1 | Simulation examen interactif',
        sourceHintNone: 'Aucun module detecte',
        sourceHintModules: '{count} modules detectes',
        sourceHintUsable: '{modules} - {valid}/{raw} questions utilisables',
        sourceHintCount: '{modules} - {valid} questions',
        badgeTitleTotal: 'Nombre total de questions',
        badgeTitleUsable: '{valid} questions utilisables sur {raw}',
        loadError: 'Erreur de chargement des questions. Verifiez les fichiers JSON.',
        invalidNumQuestions: 'Veuillez choisir entre 1 et {max} questions.',
        selectOneAnswer: 'Veuillez selectionner au moins une reponse.',
        questionCounter: 'Question {current} / {total}',
        correctionHeading: 'Les bonnes reponses sont :',
        correctionUnavailable: 'Correction indisponible pour cette question.',
        continueBtn: 'Continuer',
        scoreLabel: 'Votre score',
        restartBtn: 'Recommencer',
        timeUpMessage: 'Temps ecoule. Quiz termine automatiquement.',
        examStatus: 'Mode examen actif - Temps restant: {time}',
        resultExcellent: 'Excellent !',
        resultGreat: 'Tres bien !',
        resultGood: 'Bien joue !',
        resultKeep: 'Continuez a reviser !',
        finalExamLabel: 'Examen final'
    },
    en: {
        htmlLang: 'en',
        pageTitle: 'CCNA1 Revision - Cisco Certified Network Associate 1',
        langLabel: 'Language',
        headerTitle: 'CCNA1 Revision Suite',
        badgeText: 'CISCO STYLE',
        setupTitle: 'Configure your exam',
        labelSource: 'CCNA1 module:',
        sourceHintDefault: 'Choose one module or all modules',
        labelNumQuestions: 'Number of questions:',
        badgeQuestionsSuffix: 'questions',
        labelTimedMode: 'CCNA exam mode (1h15 - official timer)',
        timedModeHint: 'Simulates real conditions: automatic stop at 00:00',
        startQuiz: 'Start interactive quiz',
        prev: 'Previous',
        next: 'Validate and next',
        nextLast: 'Validate and finish',
        finish: 'Finish',
        correctionsTitle: 'Detailed report | CCNA corrections',
        restartFromCorrection: 'New quiz',
        footerText: 'Cisco Networking Academy style - CCNA1 revision | Interactive exam simulation',
        sourceHintNone: 'No module detected',
        sourceHintModules: '{count} modules detected',
        sourceHintUsable: '{modules} - {valid}/{raw} usable questions',
        sourceHintCount: '{modules} - {valid} questions',
        badgeTitleTotal: 'Total number of questions',
        badgeTitleUsable: '{valid} usable questions out of {raw}',
        loadError: 'Error while loading questions. Please check JSON files.',
        invalidNumQuestions: 'Please choose between 1 and {max} questions.',
        selectOneAnswer: 'Please select at least one answer.',
        questionCounter: 'Question {current} / {total}',
        correctionHeading: 'Correct answers:',
        correctionUnavailable: 'Correction unavailable for this question.',
        continueBtn: 'Continue',
        scoreLabel: 'Your score',
        restartBtn: 'Restart',
        timeUpMessage: 'Time is up. Quiz ended automatically.',
        examStatus: 'Exam mode active - Time remaining: {time}',
        resultExcellent: 'Excellent!',
        resultGreat: 'Very good!',
        resultGood: 'Good job!',
        resultKeep: 'Keep revising!',
        finalExamLabel: 'Final exam'
    }
};

let allQuestions = [];
let shuffledQuestions = [];
let quizQuestionIndices = [];
let correctlyAnsweredIndices = new Set();
let currentQuestionIndex = 0;
let score = 0;
let discoveredModules = [];
let loadStats = { rawTotal: 0, validTotal: 0, removedInvalid: 0, removedEmptyAnswers: 0 };

let timedModeEnabled = false;
let examEndTime = null;
let examTimerIntervalId = null;
let currentLanguage = 'fr';
let lastCorrectionQuestion = null;
let lastResultReason = '';

// Initialisation
window.addEventListener('DOMContentLoaded', init);

async function init() {
    restoreLanguage();
    applyTranslations();
    await populateSourceSelect();
    restoreSetupState();
    await loadQuestions();
    setNumQuestionsMax();
    setupEventListeners();
    await tryResumeQuiz();
    applyTranslations();
}

function t(key, params = {}) {
    const languagePack = I18N[currentLanguage] || I18N.fr;
    const template = languagePack[key] || I18N.fr[key] || key;
    return template.replace(/\{(\w+)\}/g, (_, name) => {
        return Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : `{${name}}`;
    });
}

function restoreLanguage() {
    const saved = localStorage.getItem(LANG_STATE_KEY);
    if (saved === 'fr' || saved === 'en') {
        currentLanguage = saved;
    }
}

function saveLanguage() {
    localStorage.setItem(LANG_STATE_KEY, currentLanguage);
}

function applyTranslations() {
    document.documentElement.lang = t('htmlLang');
    document.title = t('pageTitle');

    const headerTitle = document.getElementById('header-title');
    if (headerTitle) headerTitle.textContent = t('headerTitle');

    const ciscoBadge = document.getElementById('cisco-badge');
    if (ciscoBadge) ciscoBadge.textContent = t('badgeText');

    const langLabel = document.getElementById('lang-label');
    if (langLabel) langLabel.textContent = t('langLabel');

    const setupTitle = document.getElementById('setup-title');
    if (setupTitle) setupTitle.textContent = t('setupTitle');

    const labelSource = document.getElementById('label-source');
    if (labelSource) labelSource.textContent = t('labelSource');

    const sourceHint = document.getElementById('source-hint');
    if (sourceHint && loadStats.rawTotal === 0) sourceHint.textContent = t('sourceHintDefault');

    const labelNumQuestions = document.getElementById('label-num-questions');
    if (labelNumQuestions) labelNumQuestions.textContent = t('labelNumQuestions');

    const labelTimedMode = document.getElementById('label-timed-mode');
    if (labelTimedMode) labelTimedMode.textContent = t('labelTimedMode');

    const timedModeHint = document.getElementById('timed-mode-hint');
    if (timedModeHint) timedModeHint.textContent = t('timedModeHint');

    const startQuizBtn = document.getElementById('start-quiz-btn');
    if (startQuizBtn) startQuizBtn.textContent = t('startQuiz');

    const correctionsTitle = document.getElementById('corrections-title');
    if (correctionsTitle) correctionsTitle.textContent = t('correctionsTitle');

    const restartFromCorrection = document.getElementById('restartFromCorrection');
    if (restartFromCorrection) restartFromCorrection.textContent = t('restartFromCorrection');

    const footerText = document.getElementById('footer-text');
    if (footerText) footerText.textContent = t('footerText');

    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) languageSelect.value = currentLanguage;

    applyLocalizedModuleLabels();
    setNumQuestionsMax();
    updateSourceHint();
    updateExamStatusBar();
    refreshCurrentViewLanguage();
    updateNavigationState();
}

function refreshCurrentViewLanguage() {
    const correctionsSection = document.getElementById('corrections');
    const questionsSection = document.getElementById('questions');

    if (correctionsSection && correctionsSection.style.display === 'block' && lastCorrectionQuestion) {
        showCorrectAnswers(lastCorrectionQuestion);
        return;
    }

    if (questionsSection && questionsSection.style.display === 'block') {
        if (document.querySelector('.score-display')) {
            showResults(lastResultReason);
            return;
        }
        if (shuffledQuestions.length > 0 && currentQuestionIndex < shuffledQuestions.length) {
            displayQuestion();
        }
    }
}

function setupEventListeners() {
    const form = document.getElementById('quiz-setup-form');
    if (form) {
        form.addEventListener('submit', startQuiz);
    }

    const sourceSelect = document.getElementById('questionSource');
    if (sourceSelect) {
        sourceSelect.addEventListener('change', async () => {
            saveSetupState();
            await loadQuestions();
            setNumQuestionsMax();
        });
    }

    const numInput = document.getElementById('numQuestions');
    if (numInput) {
        numInput.addEventListener('change', saveSetupState);
        numInput.addEventListener('input', saveSetupState);
    }

    const timedMode = document.getElementById('timedMode');
    if (timedMode) {
        timedMode.addEventListener('change', saveSetupState);
    }

    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) {
        prevBtn.addEventListener('click', goToPreviousQuestion);
    }

    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        nextBtn.addEventListener('click', checkAnswer);
    }

    const finishBtn = document.getElementById('finishBtn');
    if (finishBtn) {
        finishBtn.addEventListener('click', finishQuizEarly);
    }

    const restartFromCorrection = document.getElementById('restartFromCorrection');
    if (restartFromCorrection) {
        restartFromCorrection.addEventListener('click', restartQuiz);
    }

    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.addEventListener('change', () => {
            currentLanguage = (languageSelect.value === 'en') ? 'en' : 'fr';
            saveLanguage();
            applyTranslations();
        });
    }
}

async function loadQuestions() {
    const sourceSelect = document.getElementById('questionSource');
    const source = sourceSelect ? sourceSelect.value : 'final';
    const path = getSourcePath(source);

    try {
        const response = await fetch(path, { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const rawQuestions = Array.isArray(data) ? data : (data.questions || []);
        const { questions, removedInvalid, removedEmptyAnswers } = sanitizeQuestions(rawQuestions);

        allQuestions = questions;
        loadStats = {
            rawTotal: rawQuestions.length,
            validTotal: questions.length,
            removedInvalid,
            removedEmptyAnswers
        };

        if (allQuestions.length === 0) {
            throw new Error('No valid questions after sanitization.');
        }

        updateSourceHint();
    } catch (error) {
        console.error(`Could not load ${path}:`, error);
        alert(t('loadError'));
    }
}

function sanitizeQuestions(rawQuestions) {
    const cleaned = [];
    let removedInvalid = 0;
    let removedEmptyAnswers = 0;

    for (const q of rawQuestions) {
        const questionText = (q && typeof q.question === 'string') ? q.question.trim() : '';
        const answers = (q && Array.isArray(q.answers)) ? q.answers : [];
        const remap = new Map();
        const cleanedAnswers = [];

        answers.forEach((answer, oldIndex) => {
            const text = (typeof answer === 'string') ? answer.trim() : '';
            if (text.length === 0) {
                removedEmptyAnswers++;
                return;
            }
            remap.set(oldIndex, cleanedAnswers.length);
            cleanedAnswers.push(text);
        });

        const rawCorrectAnswers = (q && Array.isArray(q.correctAnswers)) ? q.correctAnswers : [];
        const cleanedCorrectAnswers = [...new Set(
            rawCorrectAnswers
                .map(index => Number(index))
                .filter(Number.isInteger)
                .map(index => remap.get(index))
                .filter(index => index !== undefined)
        )].sort((a, b) => a - b);

        const isValid = questionText.length > 0 && cleanedAnswers.length >= 2 && cleanedCorrectAnswers.length > 0;
        if (!isValid) {
            removedInvalid++;
            continue;
        }

        cleaned.push({
            ...q,
            question: questionText,
            answers: cleanedAnswers,
            correctAnswers: cleanedCorrectAnswers
        });
    }

    return { questions: cleaned, removedInvalid, removedEmptyAnswers };
}

function getSourcePath(source) {
    if (source === 'final') {
        return 'data/final.json';
    }
    const match = discoveredModules.find((m) => m.value === source);
    return match ? match.path : 'data/final.json';
}

function setNumQuestionsMax() {
    const input = document.getElementById('numQuestions');
    if (!input) return;

    const total = allQuestions.length || 0;
    if (total > 0) {
        input.max = total;
        if (parseInt(input.value, 10) > total) {
            input.value = total;
        }
    }

    const badge = document.getElementById('questions-badge');
    if (badge) {
        badge.textContent = total > 0 ? `${total} ${t('badgeQuestionsSuffix')}` : `- ${t('badgeQuestionsSuffix')}`;
        badge.classList.remove('good', 'warn');
        if (total > 0) {
            badge.classList.add('good');
        }
        if (loadStats.rawTotal > total) {
            badge.title = t('badgeTitleUsable', { valid: total, raw: loadStats.rawTotal });
        } else {
            badge.title = t('badgeTitleTotal');
        }
    }
}

function updateSourceHint() {
    const hint = document.getElementById('source-hint');
    if (!hint) return;

    const modulesText = t('sourceHintModules', { count: discoveredModules.length });
    if (loadStats.rawTotal > 0) {
        if (loadStats.rawTotal > loadStats.validTotal) {
            hint.textContent = t('sourceHintUsable', {
                modules: modulesText,
                valid: loadStats.validTotal,
                raw: loadStats.rawTotal
            });
        } else {
            hint.textContent = t('sourceHintCount', {
                modules: modulesText,
                valid: loadStats.validTotal
            });
        }
        return;
    }

    hint.textContent = t('sourceHintDefault');
}

async function populateSourceSelect() {
    const select = document.getElementById('questionSource');
    if (!select) return;

    try {
        const resp = await fetch('data/modules-manifest.json', { cache: 'no-cache' });
        if (!resp.ok) {
            throw new Error('Manifest not found');
        }

        const manifest = await resp.json();
        discoveredModules = manifest.map((entry) => ({
            baseLabel: entry.label || entry.path,
            path: entry.path,
            value: (entry.path.split('/').pop() || '').replace('.json', '')
        }));

        for (const mod of discoveredModules) {
            if (select.querySelector(`option[value='${mod.value}']`)) continue;
            const opt = document.createElement('option');
            opt.value = mod.value;
            opt.textContent = getLocalizedModuleLabel(mod);
            select.appendChild(opt);
        }

        if (select.querySelector("option[value='final']")) {
            select.value = 'final';
        } else if (select.options.length > 0) {
            select.selectedIndex = 0;
        }

        updateSourceHint();
    } catch (error) {
        console.warn('Module discovery failed:', error);
        const hint = document.getElementById('source-hint');
        if (hint) {
            hint.textContent = t('sourceHintNone');
        }
    }
}

function getLocalizedModuleLabel(moduleEntry) {
    const label = moduleEntry.baseLabel || moduleEntry.path || '';
    if (currentLanguage === 'en') {
        if (/^examen final/i.test(label)) {
            return t('finalExamLabel');
        }
    }
    return label;
}

function applyLocalizedModuleLabels() {
    const select = document.getElementById('questionSource');
    if (!select || discoveredModules.length === 0) return;

    for (const mod of discoveredModules) {
        const option = select.querySelector(`option[value='${mod.value}']`);
        if (option) {
            option.textContent = getLocalizedModuleLabel(mod);
        }
    }
}

function startQuiz(event) {
    event.preventDefault();

    const numQuestions = parseInt(document.getElementById('numQuestions').value, 10);
    if (!Number.isInteger(numQuestions) || numQuestions < 1 || numQuestions > allQuestions.length) {
        alert(t('invalidNumQuestions', { max: allQuestions.length }));
        return;
    }

    currentQuestionIndex = 0;
    score = 0;
    correctlyAnsweredIndices = new Set();
    lastCorrectionQuestion = null;
    lastResultReason = '';

    const sourceIndices = [...Array(allQuestions.length).keys()];
    quizQuestionIndices = shuffleArray(sourceIndices).slice(0, numQuestions);
    shuffledQuestions = quizQuestionIndices.map((index) => allQuestions[index]);

    const timedCheckbox = document.getElementById('timedMode');
    timedModeEnabled = !!(timedCheckbox && timedCheckbox.checked);
    examEndTime = timedModeEnabled ? (Date.now() + EXAM_DURATION_MS) : null;

    document.getElementById('setup').style.display = 'none';
    document.getElementById('corrections').style.display = 'none';
    document.getElementById('questions').style.display = 'block';

    if (timedModeEnabled) {
        startExamTimer();
    } else {
        stopExamTimer();
        updateExamStatusBar();
    }

    saveSetupState();
    saveQuizState();
    displayQuestion();
    updateNavigationState();
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function displayQuestion() {
    const question = shuffledQuestions[currentQuestionIndex];
    const quizContainer = document.getElementById('quizz');

    if (!question || !quizContainer) {
        return;
    }

    updateProgress();

    const timerBadge = timedModeEnabled
        ? `<span class="timer-inline ${getTimerUrgencyClass()}">${formatRemaining(examEndTime - Date.now())}</span>`
        : '';

    const html = `
        <div class="question-header">
            <span class="question-number">${t('questionCounter', { current: currentQuestionIndex + 1, total: shuffledQuestions.length })}</span>
            ${timerBadge}
        </div>

        <div class="question-text">
            ${escapeHtml(question.question)}
        </div>

        ${question.image ? `<img src="${question.image}" alt="Question image">` : ''}

        <div class="answers-container">
            ${question.answers.map((answer, index) => `
                <div class="answer-option" data-index="${index}">
                    <input
                        type="${question.correctAnswers.length === 1 ? 'radio' : 'checkbox'}"
                        name="answer"
                        id="answer-${index}"
                        value="${index}">
                    <label for="answer-${index}">${escapeHtml(answer)}</label>
                </div>
            `).join('')}
        </div>

    `;

    quizContainer.innerHTML = html;
    attachAnswerClickEvents();
    updateExamStatusBar();
    updateNavigationState();
}

function attachAnswerClickEvents() {
    const answerOptions = document.querySelectorAll('.answer-option');
    const question = shuffledQuestions[currentQuestionIndex];
    const isMultiple = question.correctAnswers.length > 1;

    answerOptions.forEach((option) => {
        option.addEventListener('click', function (e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL') {
                return;
            }

            const index = this.dataset.index;
            const input = document.getElementById(`answer-${index}`);

            if (isMultiple) {
                input.checked = !input.checked;
            } else {
                input.checked = true;
            }
        });
    });
}

function updateProgress() {
    const progress = document.getElementById('progress');
    if (!progress || shuffledQuestions.length === 0) return;

    const percentage = (currentQuestionIndex / shuffledQuestions.length) * 100;
    progress.style.width = `${percentage}%`;
}

function checkAnswer() {
    if (timedModeEnabled && examEndTime !== null && Date.now() >= examEndTime) {
        handleTimeUp();
        return;
    }

    const question = shuffledQuestions[currentQuestionIndex];
    const selectedAnswers = Array.from(document.querySelectorAll('input[name="answer"]:checked'))
        .map((input) => parseInt(input.value, 10));

    if (selectedAnswers.length === 0) {
        alert(t('selectOneAnswer'));
        return;
    }

    const isCorrect = arraysEqual(
        [...selectedAnswers].sort((a, b) => a - b),
        [...question.correctAnswers].sort((a, b) => a - b)
    );

    if (isCorrect) {
        if (!correctlyAnsweredIndices.has(currentQuestionIndex)) {
            score++;
            correctlyAnsweredIndices.add(currentQuestionIndex);
        }
        nextQuestion();
    } else {
        showCorrectAnswers(question);
        saveQuizState();
    }
}

function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((value, index) => value === arr2[index]);
}

function showCorrectAnswers(question) {
    const correctionsSection = document.getElementById('corrections');
    const correctAnswersDiv = document.getElementById('correct-answers');

    if (!correctionsSection || !correctAnswersDiv) {
        return;
    }

    lastCorrectionQuestion = question;

    const correctAnswersText = question.correctAnswers
        .map((index) => question.answers[index])
        .filter((answer) => typeof answer === 'string' && answer.trim().length > 0)
        .map((answer) => escapeHtml(answer))
        .join(', ');

    correctAnswersDiv.innerHTML = `
        <p><strong>${t('correctionHeading')}</strong></p>
        <p>${correctAnswersText || t('correctionUnavailable')}</p>
        <div class="button-group">
            <button class="btn-secondary" onclick="nextQuestion()">${t('continueBtn')}</button>
        </div>
    `;

    correctionsSection.style.display = 'block';
    document.getElementById('questions').style.display = 'none';
    updateNavigationState();
}

function nextQuestion() {
    document.getElementById('corrections').style.display = 'none';
    lastCorrectionQuestion = null;

    currentQuestionIndex++;

    if (currentQuestionIndex >= shuffledQuestions.length) {
        document.getElementById('questions').style.display = 'block';
        showResults();
        return;
    }

    document.getElementById('questions').style.display = 'block';
    saveQuizState();
    displayQuestion();
    updateNavigationState();
}

function showResults(reason = '') {
    stopExamTimer();
    lastResultReason = reason;

    const quizContainer = document.getElementById('quizz');
    if (!quizContainer) return;

    const total = shuffledQuestions.length || 1;
    const percentage = ((score / total) * 100).toFixed(1);

    let message = '';
    if (percentage >= 90) {
        message = t('resultExcellent');
    } else if (percentage >= 75) {
        message = t('resultGreat');
    } else if (percentage >= 60) {
        message = t('resultGood');
    } else {
        message = t('resultKeep');
    }

    const timeUpNote = reason === 'timeup'
        ? `<p style="color: var(--error-color); margin-bottom: 1rem;"><strong>${t('timeUpMessage')}</strong></p>`
        : '';

    const html = `
        <div class="score-display">
            ${timeUpNote}
            <h2 style="color: var(--text-primary); margin-bottom: 2rem;">${message}</h2>
            <div class="score-label">${t('scoreLabel')}</div>
            <div class="score-value">${score} / ${shuffledQuestions.length}</div>
            <div class="percentage" style="margin-top: 1rem; color: var(--primary-color);">${percentage}%</div>
            <div class="button-group" style="margin-top: 3rem;">
                <button class="btn-primary" onclick="restartQuiz()">${t('restartBtn')}</button>
            </div>
        </div>
    `;

    quizContainer.innerHTML = html;

    const progress = document.getElementById('progress');
    if (progress) {
        progress.style.width = '100%';
    }

    clearQuizState();
    updateExamStatusBar();
    updateNavigationState();
}

function restartQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    shuffledQuestions = [];
    quizQuestionIndices = [];
    correctlyAnsweredIndices = new Set();
    timedModeEnabled = false;
    examEndTime = null;
    lastCorrectionQuestion = null;
    lastResultReason = '';

    stopExamTimer();

    document.getElementById('setup').style.display = 'block';
    document.getElementById('questions').style.display = 'none';
    document.getElementById('corrections').style.display = 'none';

    const progress = document.getElementById('progress');
    if (progress) {
        progress.style.width = '0%';
    }

    clearQuizState();
    updateExamStatusBar();
    updateNavigationState();
}

function startExamTimer() {
    stopExamTimer();
    updateExamStatusBar();

    examTimerIntervalId = setInterval(() => {
        if (!timedModeEnabled || examEndTime === null) {
            stopExamTimer();
            updateExamStatusBar();
            return;
        }

        const remaining = examEndTime - Date.now();
        if (remaining <= 0) {
            handleTimeUp();
            return;
        }

        updateExamStatusBar();
        const inlineTimer = document.querySelector('.timer-inline');
        if (inlineTimer) {
            inlineTimer.textContent = formatRemaining(remaining);
            inlineTimer.className = `timer-inline ${getTimerUrgencyClass(remaining)}`;
        }
    }, 1000);
}

function stopExamTimer() {
    if (examTimerIntervalId !== null) {
        clearInterval(examTimerIntervalId);
        examTimerIntervalId = null;
    }
}

function handleTimeUp() {
    stopExamTimer();
    document.getElementById('corrections').style.display = 'none';
    document.getElementById('questions').style.display = 'block';
    showResults('timeup');
}

function getTimerUrgencyClass(remainingOverride) {
    if (!timedModeEnabled || examEndTime === null) {
        return '';
    }

    const remaining = typeof remainingOverride === 'number' ? remainingOverride : (examEndTime - Date.now());
    if (remaining <= 5 * 60 * 1000) {
        return 'timer-danger';
    }
    if (remaining <= 15 * 60 * 1000) {
        return 'timer-warn';
    }
    return 'timer-ok';
}

function updateExamStatusBar() {
    const bar = document.getElementById('exam-status');
    if (!bar) return;

    if (!timedModeEnabled || examEndTime === null || shuffledQuestions.length === 0) {
        bar.style.display = 'none';
        bar.className = 'exam-status';
        bar.textContent = '';
        return;
    }

    const remaining = Math.max(0, examEndTime - Date.now());
    bar.style.display = 'block';
    bar.className = `exam-status ${getTimerUrgencyClass(remaining)}`;
    bar.textContent = t('examStatus', { time: formatRemaining(remaining) });
}

function formatRemaining(milliseconds) {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function saveQuizState() {
    if (shuffledQuestions.length === 0 || quizQuestionIndices.length === 0) {
        return;
    }

    const sourceSelect = document.getElementById('questionSource');
    const source = sourceSelect ? sourceSelect.value : 'final';

    const state = {
        version: 1,
        source,
        shuffledIndices: quizQuestionIndices,
        correctlyAnsweredIndices: Array.from(correctlyAnsweredIndices),
        currentQuestionIndex,
        score,
        timedModeEnabled,
        examEndTime,
        savedAt: Date.now()
    };

    localStorage.setItem(QUIZ_STATE_KEY, JSON.stringify(state));
}

function clearQuizState() {
    localStorage.removeItem(QUIZ_STATE_KEY);
}

async function tryResumeQuiz() {
    const raw = localStorage.getItem(QUIZ_STATE_KEY);
    if (!raw) {
        return;
    }

    let state;
    try {
        state = JSON.parse(raw);
    } catch (error) {
        clearQuizState();
        return;
    }

    if (!state || !Array.isArray(state.shuffledIndices) || state.shuffledIndices.length === 0) {
        clearQuizState();
        return;
    }

    const sourceSelect = document.getElementById('questionSource');
    const source = (typeof state.source === 'string' && state.source.length > 0) ? state.source : 'final';

    if (sourceSelect && sourceSelect.value !== source) {
        sourceSelect.value = source;
        await loadQuestions();
        setNumQuestionsMax();
    }

    const validIndices = state.shuffledIndices
        .map((index) => Number(index))
        .filter((index) => Number.isInteger(index) && index >= 0 && index < allQuestions.length);

    if (validIndices.length === 0) {
        clearQuizState();
        return;
    }

    quizQuestionIndices = validIndices;
    shuffledQuestions = quizQuestionIndices.map((index) => allQuestions[index]);
    correctlyAnsweredIndices = new Set(
        Array.isArray(state.correctlyAnsweredIndices)
            ? state.correctlyAnsweredIndices
                .map((index) => Number(index))
                .filter((index) => Number.isInteger(index) && index >= 0 && index < shuffledQuestions.length)
            : []
    );
    currentQuestionIndex = clampNumber(state.currentQuestionIndex, 0, shuffledQuestions.length);
    score = clampNumber(
        Number.isInteger(state.score) ? state.score : correctlyAnsweredIndices.size,
        0,
        shuffledQuestions.length
    );
    timedModeEnabled = !!state.timedModeEnabled;
    examEndTime = (typeof state.examEndTime === 'number') ? state.examEndTime : null;

    const numInput = document.getElementById('numQuestions');
    if (numInput) {
        numInput.value = String(shuffledQuestions.length);
    }
    const timedModeCheckbox = document.getElementById('timedMode');
    if (timedModeCheckbox) {
        timedModeCheckbox.checked = timedModeEnabled;
    }

    document.getElementById('setup').style.display = 'none';
    document.getElementById('corrections').style.display = 'none';
    document.getElementById('questions').style.display = 'block';

    if (timedModeEnabled && examEndTime !== null) {
        if (Date.now() >= examEndTime) {
            showResults('timeup');
            return;
        }
        startExamTimer();
    } else {
        stopExamTimer();
        updateExamStatusBar();
    }

    if (currentQuestionIndex >= shuffledQuestions.length) {
        showResults();
        return;
    }

    displayQuestion();
    updateNavigationState();
}

function goToPreviousQuestion() {
    if (currentQuestionIndex <= 0) {
        return;
    }

    document.getElementById('corrections').style.display = 'none';
    document.getElementById('questions').style.display = 'block';
    currentQuestionIndex--;
    saveQuizState();
    displayQuestion();
    updateNavigationState();
}

function finishQuizEarly() {
    if (shuffledQuestions.length === 0) {
        return;
    }
    showResults();
}

function updateNavigationState() {
    const nav = document.getElementById('nav-buttons');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const finishBtn = document.getElementById('finishBtn');
    const setupSection = document.getElementById('setup');
    const questionsSection = document.getElementById('questions');

    if (!nav || !prevBtn || !nextBtn || !finishBtn || !setupSection || !questionsSection) {
        return;
    }

    const questionsVisible = questionsSection.style.display === 'block';
    const setupVisible = setupSection.style.display !== 'none';
    const hasQuiz = shuffledQuestions.length > 0;

    if (!questionsVisible || setupVisible || !hasQuiz) {
        nav.style.display = 'none';
        return;
    }

    nav.style.display = 'flex';
    prevBtn.disabled = currentQuestionIndex <= 0;
    prevBtn.textContent = t('prev');
    finishBtn.textContent = t('finish');
    nextBtn.textContent = currentQuestionIndex >= shuffledQuestions.length - 1 ? t('nextLast') : t('next');
}

function clampNumber(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.min(max, Math.max(min, Math.floor(number)));
}

function saveSetupState() {
    const sourceSelect = document.getElementById('questionSource');
    const numInput = document.getElementById('numQuestions');
    const timedModeCheckbox = document.getElementById('timedMode');

    const state = {
        source: sourceSelect ? sourceSelect.value : 'final',
        numQuestions: numInput ? numInput.value : '20',
        timedMode: !!(timedModeCheckbox && timedModeCheckbox.checked)
    };

    localStorage.setItem(SETUP_STATE_KEY, JSON.stringify(state));
}

function restoreSetupState() {
    const raw = localStorage.getItem(SETUP_STATE_KEY);
    if (!raw) {
        return;
    }

    let state;
    try {
        state = JSON.parse(raw);
    } catch (error) {
        return;
    }

    const sourceSelect = document.getElementById('questionSource');
    if (sourceSelect && typeof state.source === 'string' && sourceSelect.querySelector(`option[value='${state.source}']`)) {
        sourceSelect.value = state.source;
    }

    const numInput = document.getElementById('numQuestions');
    if (numInput && state.numQuestions) {
        numInput.value = state.numQuestions;
    }

    const timedModeCheckbox = document.getElementById('timedMode');
    if (timedModeCheckbox && typeof state.timedMode === 'boolean') {
        timedModeCheckbox.checked = state.timedMode;
    }
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
