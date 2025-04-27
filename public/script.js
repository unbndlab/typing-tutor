// --- DOM Elements ---
const body = document.body;
const appContainer = document.getElementById('app-container');
const navButtons = document.querySelectorAll('.nav-button');
const sections = document.querySelectorAll('.app-section');

// Game Section Elements
const practiceTypeSelect = document.getElementById('practice-type');
const lessonOptionsDiv = document.getElementById('lesson-options');
const lessonSelect = document.getElementById('lesson-select');
const testOptionsDiv = document.getElementById('test-options');
const testSelect = document.getElementById('test-select');
const wordsOptionsDiv = document.getElementById('words-options');
const wordsSettingSelect = document.getElementById('words-setting');
const timeOptionsDiv = document.getElementById('time-options');
const timeSettingSelect = document.getElementById('time-setting');
const metricsTime = document.getElementById('time');
const metricsWpm = document.getElementById('wpm');
const metricsAccuracy = document.getElementById('accuracy');
const metricsErrors = document.getElementById('errors');
const metricsModeInfo = document.getElementById('mode-info');
const textDisplayContainer = document.getElementById('text-display-container');
const textDisplay = document.getElementById('text-to-type');
const visualKeyboard = document.getElementById('visual-keyboard');
const resultsDisplay = document.getElementById('results-display');
const finalWpm = document.getElementById('final-wpm');
const finalAccuracy = document.getElementById('final-accuracy');
const finalTime = document.getElementById('final-time');
const finalErrors = document.getElementById('final-errors');
const startNextButton = document.getElementById('start-next-button');
const resetButton = document.getElementById('reset-button');

// Dashboard Section Elements
const chartTypeSelect = document.getElementById('chart-type');
const resultFilterSelect = document.getElementById('result-filter');
const progressChartCanvas = document.getElementById('progress-chart').getContext('2d');
const resultsTableContainer = document.getElementById('results-table-container');

// Settings Section Elements
const themeSelect = document.getElementById('theme-select');
const soundToggle = document.getElementById('sound-toggle');

// --- State Variables ---
let textChars = []; // Spans for current text
let currentTextInfo = { // Info about the text being typed
    text: '',
    id: null, // guid of lesson/test
    mode: 'lesson', // 'lesson', 'test', 'words', 'time', 'quote', 'code'
    wordCountTarget: 0,
    durationTarget: 0,
};
let currentCharIndex = 0;
let errors = 0;
let totalTypedChars = 0;
let correctTypedChars = 0; // For WPM/Acc based on correct keypresses
let startTime = null;
let timerInterval = null;
let gameActive = false;
let currentLessonIndex = -1; // Track current lesson for 'Start Next'

// Data Cache
let allLessons = [];
let allTests = [];
let allResults = [];

// Settings
let userSettings = {
    theme: 'light',
    sound: true,
};

// Chart instance
let progressChart = null;

// Audio Context and Buffers (for better sound handling)
let audioContext;
let keySoundBuffer;
let errorSoundBuffer;
let audioInitialized = false;

// --- Constants ---
const API_BASE_URL = '/api'; // Relative path to our backend API
const KEYBOARD_LAYOUT = [
    ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'backspace'],
    ['tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
    ['caps', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'enter'],
    ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'shift'],
    [' '] // Space bar handled separately
];

// --- Initialization ---
async function initializeApp() {
    console.log('Initializing App...');
    setupEventListeners();
    loadSettings();
    // Audio init requires user interaction, deferred slightly

    try {
        showLoadingState(true);
        await Promise.all([
            fetchLessons(),
            fetchTests(),
            fetchResults() // Fetch initial results for dashboard
        ]);
        populateLessonSelect();
        populateTestSelect();
        updateDashboard(); // Initial dashboard render
        await setupGame(); // Setup the initial game state (e.g., first lesson)
    } catch (error) {
        console.error("Initialization failed:", error);
        textDisplay.textContent = "Error loading initial data. Please refresh.";
        // Handle critical init failure
    } finally {
        showLoadingState(false);
         // Ensure correct section is shown initially
         switchSection('main-game');
    }
}

function showLoadingState(isLoading) {
    // Basic loading state - could be improved with a dedicated overlay
    resetButton.disabled = isLoading;
     if (isLoading) {
         textDisplay.textContent = "Loading...";
         console.log("Loading data...");
     } else {
         console.log("Loading complete.");
     }
}

// --- API Fetch Functions ---
async function fetchData(url) {
    try {
        const response = await fetch(`${API_BASE_URL}${url}`);
        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`HTTP error! Status: ${response.status} Body: ${errorBody}`);
            throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
        }
        // Check if response is JSON before parsing
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
             return await response.json();
        } else {
             return await response.text(); // Return as text if not JSON
        }

    } catch (error) {
        console.error(`Error fetching ${url}:`, error);
        throw error; // Re-throw to be handled by caller
    }
}

async function postData(url, data) {
    try {
        const response = await fetch(`${API_BASE_URL}${url}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
             const errorBody = await response.text(); // Try to get error details
             console.error(`HTTP error! Status: ${response.status} Body: ${errorBody}`);
            throw new Error(`HTTP error! status: ${response.status} ${response.statusText} - ${errorBody}`);
        }
         // Check if response is JSON before parsing
         const contentType = response.headers.get("content-type");
         if (contentType && contentType.indexOf("application/json") !== -1) {
              return await response.json();
         } else {
              return await response.text(); // Return as text if not JSON
         }
    } catch (error) {
        console.error(`Error posting to ${url}:`, error);
        throw error; // Re-throw
    }
}

async function fetchLessons() {
    allLessons = await fetchData('/content/lessons');
}

async function fetchTests() {
    allTests = await fetchData('/content/tests');
}

async function fetchResults() {
    allResults = await fetchData('/results');
    allResults.forEach(r => r.timestamp = new Date(r.timestamp)); // Parse dates
}

async function saveResult(resultData) {
    try {
        const response = await postData('/results', resultData);
        console.log('Result saved:', response);
        // Refresh results data for dashboard after saving
        await fetchResults();
        updateDashboard();
    } catch (error) {
        console.error('Failed to save result:', error);
        // Optionally notify user
    }
}

// --- Settings Functions ---
function loadSettings() {
    const savedSettings = localStorage.getItem('typingTutorSettings');
    if (savedSettings) {
         try {
             userSettings = JSON.parse(savedSettings);
             // Ensure defaults if parsing fails or structure changed
             userSettings.theme = userSettings.theme || 'light';
             userSettings.sound = userSettings.sound !== undefined ? userSettings.sound : true;
         } catch (e) {
             console.error("Failed to parse settings, using defaults.", e);
              userSettings = { theme: 'light', sound: true };
         }
    }
    applySettings();
}

function saveSettings() {
    localStorage.setItem('typingTutorSettings', JSON.stringify(userSettings));
}

function applySettings() {
    // Theme
    body.className = `theme-${userSettings.theme}`;
    themeSelect.value = userSettings.theme;
    updateChartTheme(); // Update chart colors if chart exists

    // Sound
    soundToggle.checked = userSettings.sound;

    console.log('Settings applied:', userSettings);
}

function handleThemeChange() {
    userSettings.theme = themeSelect.value;
    applySettings();
    saveSettings();
}

function handleSoundToggle() {
    userSettings.sound = soundToggle.checked;
    if (userSettings.sound && !audioInitialized) {
        initAudioOnInteraction(); // Prompt user interaction if sound enabled but not init
    }
    saveSettings();
}

// --- Audio Functions ---
function initAudioOnInteraction() {
     // Check if already initialized or not supported
    if (audioInitialized || !window.AudioContext && !window.webkitAudioContext) {
        // console.warn('AudioContext already initialized or not supported.');
        return;
    }
    const initAudio = async () => {
        // Remove listeners once triggered
        document.removeEventListener('click', initAudio);
        document.removeEventListener('keydown', initAudio);

        if (audioInitialized) return; // Prevent double initialization

         try {
             audioContext = new (window.AudioContext || window.webkitAudioContext)();
             // Resume context if needed (Chrome often starts suspended)
             if (audioContext.state === 'suspended') {
                 await audioContext.resume();
             }

             // Load sounds only after context is running
             if (audioContext.state === 'running') {
                 console.log('AudioContext running. Loading sounds...');
                 const [keyBuffer, errorBuffer] = await Promise.all([
                      loadSound('sounds/keypress.wav'),
                      loadSound('sounds/error.wav')
                 ]);
                 keySoundBuffer = keyBuffer;
                 errorSoundBuffer = errorBuffer;
                 audioInitialized = true; // Mark as initialized successfully
                 console.log('Audio setup complete.');
             } else {
                  console.error('AudioContext failed to resume.');
             }

         } catch (e) {
             console.error('Error initializing AudioContext:', e);
             audioContext = null;
             audioInitialized = false;
         }
     };
     // Add listeners for first interaction
     document.addEventListener('click', initAudio, { once: true });
     document.addEventListener('keydown', initAudio, { once: true });
      console.log('Audio initialization listeners added. Interact with the page to enable sound.');
}


async function loadSound(url) {
    if (!audioContext) return null;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to load sound (${response.status}): ${url}`);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log(`Sound loaded: ${url}`);
        return audioBuffer;
    } catch (error) {
        console.error(`Error loading sound ${url}:`, error);
        return null;
    }
}

function playSound(buffer) {
    // Check settings and ensure context/buffer are ready
    if (!userSettings.sound || !audioInitialized || !audioContext || audioContext.state !== 'running' || !buffer) {
        return;
    }
    try {
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start(0);
    } catch (error) {
        console.error('Error playing sound:', error);
    }
}

// --- Navigation & UI Updates ---
function switchSection(targetSectionId) {
    sections.forEach(section => {
        section.classList.toggle('active-section', section.id === targetSectionId);
    });
    navButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.section === targetSectionId);
    });
    console.log(`Switched to section: ${targetSectionId}`);
    // Refresh dashboard if switching to it
     if (targetSectionId === 'dashboard') {
         updateDashboard();
     }
}

function handleNavClick(event) {
    if (event.target.matches('.nav-button')) {
        const targetSection = event.target.dataset.section;
        switchSection(targetSection);
    }
}

function updatePracticeOptionsVisibility() {
    const practiceType = practiceTypeSelect.value;
    lessonOptionsDiv.style.display = practiceType === 'lesson' ? 'flex' : 'none';
    testOptionsDiv.style.display = practiceType === 'test' ? 'flex' : 'none';
    wordsOptionsDiv.style.display = practiceType === 'words' ? 'flex' : 'none';
    timeOptionsDiv.style.display = practiceType === 'time' ? 'flex' : 'none';
}

function populateLessonSelect() {
    lessonSelect.innerHTML = ''; // Clear existing
    if (allLessons.length > 0) {
        allLessons.forEach((lesson, index) => {
            const option = document.createElement('option');
            option.value = lesson.guid;
            option.textContent = `L${lesson.sequence || index + 1}: ${lesson.title}`;
            lessonSelect.appendChild(option);
        });
    } else {
        lessonSelect.innerHTML = '<option value="">No lessons found</option>';
    }
}

function populateTestSelect() {
    testSelect.innerHTML = ''; // Clear existing
    if (allTests.length > 0) {
        allTests.forEach(test => {
            const option = document.createElement('option');
            option.value = test.guid;
            option.textContent = test.title;
            testSelect.appendChild(option);
        });
    } else {
        testSelect.innerHTML = '<option value="">No tests found</option>';
    }
}

function updateModeInfo(mode, setting = null, title = '') {
     let infoText = `Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`;
     if (title) {
         infoText += `: ${title}`;
     } else if (setting) {
         if (mode === 'time') infoText += ` (${setting}s)`;
         else if (mode === 'words') infoText += ` (${setting} words)`;
     }
     metricsModeInfo.textContent = infoText;
}


// --- Game Setup & Logic ---
async function setupGame() {
    console.log('Setting up new game...');
    resetGameState();
    resultsDisplay.style.display = 'none'; // Hide previous results
    textDisplayContainer.classList.remove('game-over');
    textDisplay.innerHTML = 'Loading Text...'; // Show loading in text area
    resetButton.disabled = true;

    const practiceType = practiceTypeSelect.value;
    let text = '';
    let mode = practiceType;
    let referenceId = null;
    let duration = 0;
    let wordCount = 0;
    let displayTitle = '';


    try {
        if (practiceType === 'lesson') {
            const selectedLessonGuid = lessonSelect.value;
            if (!selectedLessonGuid && allLessons.length > 0) selectedLessonGuid = allLessons[0].guid; // Default to first lesson
            if (!selectedLessonGuid) throw new Error("No lessons available");

            const lesson = allLessons.find(l => l.guid === selectedLessonGuid);
            if (!lesson) throw new Error(`Lesson with guid ${selectedLessonGuid} not found.`);
            text = lesson.lesson_text;
            referenceId = lesson.guid;
            mode = 'lesson';
            displayTitle = `L${lesson.sequence}: ${lesson.title}`;
            currentLessonIndex = allLessons.findIndex(l => l.guid === selectedLessonGuid);

        } else if (practiceType === 'test') {
            const selectedTestGuid = testSelect.value;
             if (!selectedTestGuid && allTests.length > 0) selectedTestGuid = allTests[0].guid; // Default to first test
             if (!selectedTestGuid) throw new Error("No tests available");

            const test = allTests.find(t => t.guid === selectedTestGuid);
            if (!test) throw new Error(`Test with guid ${selectedTestGuid} not found.`);

            mode = test.category; // Mode derived from test category
            referenceId = test.guid;
            displayTitle = test.title;

            if (test.category === 'time' || test.category === 'words') {
                duration = test.duration || 0;
                wordCount = test.wordCount || 0;

                 if (test.textSource) {
                     console.log(`Fetching wordlist: ${test.textSource}`);
                     const wordListData = await fetchData(`/content/wordlist/${test.textSource}`);
                     const words = wordListData.words;
                     if (!words || words.length === 0) throw new Error(`Word list ${test.textSource} is empty or invalid.`);

                     const shuffledWords = [...words].sort(() => 0.5 - Math.random());
                     const targetCount = test.category === 'words' ? wordCount : 250;
                      let neededWords = [];
                      while (neededWords.length < targetCount) {
                           neededWords = neededWords.concat(shuffledWords);
                           if (shuffledWords.length === 0) break; // Prevent infinite loop if source is too small
                      }
                     text = neededWords.slice(0, targetCount).join(' ') + (test.category === 'words' ? ' ' : '');

                 } else if (test.test_text) {
                     text = test.test_text;
                 } else {
                     throw new Error(`Test ${test.guid} has no text source or embedded text.`);
                 }
            } else { // Quote, Code etc.
                 if (!test.test_text) throw new Error(`Test ${test.guid} needs embedded text.`);
                 text = test.test_text;
            }

        } else if (practiceType === 'words' || practiceType === 'time') {
             duration = practiceType === 'time' ? parseInt(timeSettingSelect.value, 10) : 0;
             wordCount = practiceType === 'words' ? parseInt(wordsSettingSelect.value, 10) : 0;
             const setting = duration || wordCount;
             displayTitle = `${practiceType === 'time' ? setting + 's' : setting + ' words'} Practice`;
             mode = practiceType;
             const wordListSource = 'common_words_medium'; // Or make this selectable later
             console.log(`Fetching wordlist: ${wordListSource}`);
             const wordListData = await fetchData(`/content/wordlist/${wordListSource}`);
             const words = wordListData.words;
             if (!words || words.length === 0) throw new Error(`Word list ${wordListSource} is empty or invalid.`);

             const shuffledWords = [...words].sort(() => 0.5 - Math.random());
             const targetCount = practiceType === 'words' ? wordCount : 250; // Large block for time
              let neededWords = [];
               while (neededWords.length < targetCount) {
                   neededWords = neededWords.concat(shuffledWords);
                   if (shuffledWords.length === 0) break;
               }
             text = neededWords.slice(0, targetCount).join(' ') + (practiceType === 'words' ? ' ' : '');
        } else {
            throw new Error("Invalid practice type selected");
        }

        currentTextInfo = {
            text: normalizeText(text),
            id: referenceId,
            mode: mode, // Use derived mode
            durationTarget: duration,
            wordCountTarget: wordCount
        };
        updateModeInfo(mode, duration || wordCount, displayTitle); // Update UI info

        renderText();
        renderKeyboard(); // Initial keyboard render
        updateCurrentCharHighlight();

    } catch (error) {
        console.error("Error setting up game:", error);
        textDisplay.textContent = `Error: ${error.message}`;
        currentTextInfo.text = ''; // Clear text on error
        textChars = [];
    } finally {
         resetButton.disabled = false; // Re-enable reset button
    }
}

function normalizeText(text) {
    // Replace smart quotes and potentially other normalization
     if (!text) return ''; // Handle null/undefined input
    return text
        .replace(/[\u2018\u2019]/g, "'") // Left/right single quotes -> straight
        .replace(/[\u201C\u201D]/g, '"') // Left/right double quotes -> straight
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();
}

function renderText() {
    textDisplay.innerHTML = '';
    textChars = currentTextInfo.text.split('').map(char => {
        const span = document.createElement('span');
        // Handle spaces explicitly for styling if needed later
        span.textContent = char; // Use textContent for performance/security
        textDisplay.appendChild(span);
        return span;
    });
     if (textChars.length > 0) {
        textChars[0].classList.add('current');
        updateVisualKeyboardHighlight(currentTextInfo.text[0]);
    } else {
         textDisplay.textContent = "Select a lesson or test to start.";
    }
}

function resetGameState() {
    gameActive = false;
    clearInterval(timerInterval);
    timerInterval = null;
    startTime = null;
    currentCharIndex = 0;
    errors = 0;
    totalTypedChars = 0;
    correctTypedChars = 0;

    // Reset metrics display
     metricsTime.textContent = currentTextInfo.durationTarget > 0 ? currentTextInfo.durationTarget : '0';
    metricsWpm.textContent = '0';
    metricsAccuracy.textContent = '100';
    metricsErrors.textContent = '0';

    // Clear previous character highlights
    textChars.forEach(span => span.className = '');
}

function startGame() {
    if (gameActive || textChars.length === 0 || isGameEndConditionMet(false)) return; // Don't start if already ended

    // Attempt to initialize audio on first game start interaction
     if (!audioInitialized) {
         initAudioOnInteraction();
     }

    startTime = new Date();
    gameActive = true;
    console.log("Game Started - Mode:", currentTextInfo.mode, "Target:", currentTextInfo.durationTarget || currentTextInfo.wordCountTarget || 'End of Text');

    if (currentTextInfo.durationTarget > 0) {
        metricsTime.textContent = currentTextInfo.durationTarget; // Start countdown display
        timerInterval = setInterval(updateTimerCountdown, 1000);
    } else {
         metricsTime.textContent = '0'; // Start countup display
        timerInterval = setInterval(updateTimerCountup, 1000);
    }
}

function updateTimerCountup() {
    if (!gameActive || !startTime) return;
    const elapsedTime = Math.floor((new Date() - startTime) / 1000);
    metricsTime.textContent = elapsedTime;
    updateMetrics(); // Update WPM dynamically
}

function updateTimerCountdown() {
    if (!gameActive || !startTime) return;

    const currentTime = new Date();
    const elapsedTime = (currentTime - startTime) / 1000;
    const remainingTime = Math.max(0, Math.ceil(currentTextInfo.durationTarget - elapsedTime));
    metricsTime.textContent = remainingTime;

    if (remainingTime <= 0 && gameActive) { // Check gameActive again
        console.log("Time's up!");
         metricsTime.textContent = 0;
        endGame(true); // Pass true to indicate time ran out
    } else {
        updateMetrics(); // Update WPM dynamically while timer runs
    }
}

function updateMetrics(isFinal = false) {
    if (!startTime && !isFinal) {
        // Reset visuals if called before start/during init
        metricsWpm.textContent = '0';
        metricsAccuracy.textContent = '100';
        return;
    }
    // If called when inactive but not final, only update errors display potentially
    if (!gameActive && !isFinal) {
         metricsErrors.textContent = errors;
         return;
    }


    const now = new Date();
    // Use 0 elapsed if not started but final=true (e.g. 0 duration test)
    const elapsedTime = ((now - (startTime || now)) / 1000);
    const elapsedMinutes = Math.max(0.001, elapsedTime / 60); // Avoid division by zero


    // --- WPM Calculation ---
    // Net WPM = (Correct Chars / 5) / Minutes
    const wpm = Math.round((correctTypedChars / 5) / elapsedMinutes);
    metricsWpm.textContent = Math.max(0, wpm);


    // --- Accuracy Calculation ---
    // Accuracy = (Correct Chars Attempted / Total Chars Attempted) * 100
    // Correct Chars Attempted = totalTypedChars - errors
    let accuracy = 100;
    if (totalTypedChars > 0) {
        const correctForAcc = Math.max(0, totalTypedChars - errors);
        accuracy = Math.round((correctForAcc / totalTypedChars) * 100);
        accuracy = Math.max(0, Math.min(100, accuracy)); // Clamp 0-100
    } else if (errors > 0) {
        accuracy = 0; // If errors exist with zero attempts, accuracy is 0
    }
    metricsAccuracy.textContent = accuracy;

    // Update error count display
    metricsErrors.textContent = errors;
}

function handleKeyPress(event) {
     if (!textChars.length || resultsDisplay.style.display === 'block') return; // Don't type if no text or results showing

     // Allow starting the game (will also trigger audio init request)
    if (!gameActive) {
         if ((event.key.length === 1 && !event.ctrlKey && !event.metaKey) || event.key === 'Backspace') {
             if (isGameEndConditionMet(false)) {
                 console.log("Game condition met before start, not starting.");
                 return;
             }
             startGame();
              // Audio init might be slightly delayed, but game logic can proceed
              if (!gameActive && startTime === null) return; // Check if startGame failed to set startTime
         } else {
             return; // Ignore non-start keys
         }
    }

    // If game is active, process keys
    const typedChar = event.key;
    const targetChar = currentCharIndex < textChars.length ? textChars[currentCharIndex].textContent : null; // Use textContent

    // Ignore control keys (except backspace) after game start
    if ((event.metaKey || event.ctrlKey || event.altKey) || (typedChar.length > 1 && typedChar !== 'Backspace')) {
        return;
    }

    event.preventDefault(); // Prevent default actions for handled keys

    // --- Process Input ---
    if (typedChar === 'Backspace') {
        handleBackspace();
    } else if (targetChar !== null && typedChar.length === 1) { // Only process single chars
        totalTypedChars++; // Increment attempt count
        if (typedChar === targetChar) {
            handleCorrectKey();
            playSound(keySoundBuffer);
        } else {
            handleIncorrectKey();
            playSound(errorSoundBuffer);
        }
    } else {
        // Ignore typing past the end
    }

     // Update metrics immediately after processing
     updateMetrics();

    // --- Check end condition AFTER processing key ---
     if (gameActive && isGameEndConditionMet(true)) {
        endGame();
    } else {
        // Scroll text into view if needed (basic implementation)
         scrollCurrentCharIntoView();
    }
}

function handleCorrectKey() {
     if (currentCharIndex >= textChars.length) return;

    correctTypedChars++;
    textChars[currentCharIndex].className = 'correct'; // Set only 'correct'
    currentCharIndex++;

    updateCurrentCharHighlight();
}

function handleIncorrectKey() {
    if (currentCharIndex >= textChars.length) return;

    // Only increment error count if it's not already marked incorrect
    if(!textChars[currentCharIndex].classList.contains('incorrect')) {
        errors++;
        textChars[currentCharIndex].className = 'incorrect current'; // Mark incorrect, keep current
    }
    // Don't advance index, force user to correct or backspace
    updateVisualKeyboardHighlight(textChars[currentCharIndex].textContent, true); // Highlight expected key with error state
}

function handleBackspace() {
     // Can backspace even if game isn't "active" but timer started (e.g., first char)
    if (currentCharIndex > 0) {
         if (gameActive) totalTypedChars++; // Count backspace as an action/attempt *during* the game

        currentCharIndex--;

        const previousSpan = textChars[currentCharIndex];

        // If the char being deleted was correct, decrement correct count
        if (previousSpan.classList.contains('correct')) {
            correctTypedChars--;
        }
        // Note: We don't decrement 'errors' count here based on common practice

        previousSpan.className = 'current'; // Reset to just 'current'

        // Remove style from the character *after* the new current one (if it exists)
        if (textChars[currentCharIndex + 1]) {
            textChars[currentCharIndex + 1].className = '';
        }

        updateCurrentCharHighlight(); // Update visual indicators
        scrollCurrentCharIntoView();
    }
     updateMetrics(); // Update metrics after backspace
}


function scrollCurrentCharIntoView() {
    const currentSpan = textChars[currentCharIndex];
    if (currentSpan) {
        // Basic scrollIntoView, could be smoother later
        currentSpan.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
}


function updateCurrentCharHighlight() {
    let currentSet = false;
    textChars.forEach((span, index) => {
        // Remove 'current' unless it's the target index and not incorrect
        const isCurrent = index === currentCharIndex && !span.classList.contains('incorrect');
        span.classList.toggle('current', isCurrent);
        if(isCurrent) currentSet = true;

        // Ensure incorrect spans that ARE the current index still get the visual cue
         if(index === currentCharIndex && span.classList.contains('incorrect')) {
             span.classList.add('current'); // Re-add current marker style
             currentSet = true;
         }
    });

     // If loop finished and nothing is current (e.g., end of text), clear keyboard
     const charToHighlight = currentSet && currentCharIndex < textChars.length ? textChars[currentCharIndex].textContent : null;
     const isError = currentSet && currentCharIndex < textChars.length ? textChars[currentCharIndex].classList.contains('incorrect') : false;
     updateVisualKeyboardHighlight(charToHighlight, isError);

}


function isGameEndConditionMet(checkTime = true) {
     // Check mode-specific conditions
     const mode = currentTextInfo.mode;
     const duration = currentTextInfo.durationTarget;
     const wordCount = currentTextInfo.wordCountTarget;

     // Check time first if applicable
     if (mode === 'time' || (duration > 0 && practiceTypeSelect.value === 'test')) { // Check duration target
        if (!checkTime || !startTime || !duration) return false;
        const elapsedTime = (new Date() - startTime) / 1000;
        if (elapsedTime >= duration) return true;
    }

    // Then check word count if applicable
    if (mode === 'words' || (wordCount > 0 && practiceTypeSelect.value === 'test')) { // Check word count target
        if (!wordCount) return false;
        let wordsCompleted = 0;
        let inWord = false;
        let currentWordCorrect = true; // Track errors within the current word
        for(let i = 0; i < currentCharIndex; i++) {
             const span = textChars[i];
            const isSpace = span.textContent === ' '; // Use textContent

            if (!isSpace) {
                inWord = true;
                if(span.classList.contains('incorrect')) {
                    currentWordCorrect = false; // Mark word as incorrect if any char is wrong
                }
            } else { // It's a space
                if (inWord && currentWordCorrect && span.classList.contains('correct')) {
                     // Only count word if space is typed correctly AND word had no errors
                    wordsCompleted++;
                }
                 // Reset for next word regardless of correctness of space/previous word
                inWord = false;
                currentWordCorrect = true;
            }
        }
        // Check if the *last* char typed completed the word count exactly at the end of text
         if (currentCharIndex === currentTextInfo.text.length && inWord && currentWordCorrect && textChars[currentCharIndex - 1]?.classList.contains('correct')) {
              wordsCompleted++;
         }
        return wordsCompleted >= wordCount;
    }

    // Finally, check for reaching the end of text for other modes
    if (mode === 'lesson' || mode === 'quote' || mode === 'code') {
        return currentCharIndex >= currentTextInfo.text.length;
    }

    // Default: game not ended
    return false;
}

function endGame(timedOut = false) {
    if (!gameActive && !timedOut) return; // Allow ending if timedOut even if already inactive
     if (!startTime) { // Don't end if game never really started
          console.log("Attempted to end game that never started.");
          resetGameState(); // Ensure clean state
          return;
     }
     const finalDuration = Math.round((new Date() - startTime) / 1000); // Calculate duration NOW

    console.log('Game Ended.');
    gameActive = false; // Set inactive *before* final metrics/save
    clearInterval(timerInterval);
    timerInterval = null;
    // Keep listener active to allow starting new game? Maybe, remove if causing issues.
    // document.removeEventListener('keydown', handleKeyPress);

    textDisplayContainer.classList.add('game-over');
     updateVisualKeyboardHighlight(null); // Clear keyboard highlight

    // Ensure final metrics are calculated and displayed
    updateMetrics(true);

    // Prepare result data for saving (use final calculated duration)
    const resultData = {
        wpm: parseInt(metricsWpm.textContent, 10),
        accuracy: parseFloat(metricsAccuracy.textContent),
        errors: parseInt(metricsErrors.textContent, 10),
        duration_seconds: finalDuration, // Use duration calculated at end
        mode: currentTextInfo.mode,
        reference_id: currentTextInfo.id // Save the guid of the lesson/test
    };

    // Display in results overlay
    finalWpm.textContent = resultData.wpm;
    finalAccuracy.textContent = resultData.accuracy;
    finalTime.textContent = resultData.duration_seconds;
    finalErrors.textContent = resultData.errors;
    resultsDisplay.style.display = 'block';

     // Update "Start Next" button text/visibility
     if (currentTextInfo.mode === 'lesson' && currentLessonIndex >= 0 && currentLessonIndex < allLessons.length - 1) {
         startNextButton.textContent = "Start Next Lesson";
         startNextButton.style.display = 'inline-block';
     } else {
          startNextButton.textContent = "Practice Again"; // Or hide
         startNextButton.style.display = 'none';
     }

    // Save result to backend
    saveResult(resultData);
     resetButton.focus(); // Focus reset button
}

function handleStartNext() { // Currently only handles lessons
     if (currentTextInfo.mode === 'lesson' && currentLessonIndex >= 0 && currentLessonIndex < allLessons.length - 1) {
         currentLessonIndex++;
         const nextLessonGuid = allLessons[currentLessonIndex].guid;
         lessonSelect.value = nextLessonGuid; // Select next lesson in dropdown
         practiceTypeSelect.value = 'lesson'; // Ensure type is lesson
         updatePracticeOptionsVisibility(); // Update UI
         setupGame(); // Start the next lesson
     } else {
          // Handle "Practice Again"? For now, just hide results.
          resultsDisplay.style.display = 'none';
          setupGame(); // Reset the current game/test
     }
     resultsDisplay.style.display = 'none'; // Hide results after clicking
}


// --- Visual Keyboard Functions ---
function renderKeyboard() {
    visualKeyboard.innerHTML = ''; // Clear existing
    KEYBOARD_LAYOUT.forEach((rowKeys) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'row';
        rowKeys.forEach(key => {
            const keyElement = document.createElement('div');
            keyElement.className = 'key';
            let dataKey = key.toLowerCase();
            let displayText = key;

            // Handle specific keys
            if (key === 'backspace') displayText = 'Bksp';
            else if (key === 'caps') displayText = 'Caps';
            else if (key === 'enter') displayText = 'Enter';
            else if (key === 'shift') displayText = 'Shift';
            else if (key === 'tab') displayText = 'Tab';
            else if (key === ' ') { dataKey = ' '; displayText = 'Space';} // Use ' ' for data-key

            keyElement.dataset.key = dataKey;
            keyElement.textContent = displayText;
            if (key.length > 1 || key === ' ') keyElement.classList.add(key.length > 1 ? key : 'space');

            rowDiv.appendChild(keyElement);
        });
        visualKeyboard.appendChild(rowDiv);
    });
}

function updateVisualKeyboardHighlight(char, isError = false) {
     if (!visualKeyboard) return;
    const keys = visualKeyboard.querySelectorAll('.key');
    keys.forEach(key => key.classList.remove('lit', 'error')); // Remove previous highlights

    if (char) {
        let targetKey = char.toLowerCase();
        let isShifted = char !== targetKey && char.toUpperCase() === char; // Basic check for shifted chars

         // Special case for space
         if (char === ' ') targetKey = ' ';

        const keyElement = visualKeyboard.querySelector(`.key[data-key="${CSS.escape(targetKey)}"]`); // Use CSS.escape for potential special chars in data-key
        if (keyElement) {
            keyElement.classList.add('lit');
            if (isError) {
                keyElement.classList.add('error'); // Add error class if needed
            }
        }
        // Handle Shift highlighting
        if (isShifted) {
             visualKeyboard.querySelectorAll('.key.shift').forEach(sk => sk.classList.add('lit'));
        }
    }
}

// Add temporary press feedback (optional)
function handleKeyboardPressFeedback(event) {
     if (!visualKeyboard) return;
     let key = event.key;
     let code = event.code; // Use event.code for layout-independent keys if possible

     let dataKey;
     // Map based on code first for layout independence
     if (code.startsWith('Key')) dataKey = code.substring(3).toLowerCase();
     else if (code.startsWith('Digit')) dataKey = code.substring(5);
     else if (code === 'Backspace') dataKey = 'backspace';
     else if (code === 'Tab') dataKey = 'tab';
     else if (code === 'CapsLock') dataKey = 'caps';
     else if (code === 'Enter') dataKey = 'enter';
     else if (code === 'ShiftLeft' || code === 'ShiftRight') dataKey = 'shift';
     else if (code === 'Space') dataKey = ' ';
     else if (code === 'Backslash') dataKey = '\\';
     else if (code === 'Quote') dataKey = "'";
     else if (code === 'Semicolon') dataKey = ';';
     else if (code === 'Comma') dataKey = ',';
     else if (code === 'Period') dataKey = '.';
     else if (code === 'Slash') dataKey = '/';
     else if (code === 'Minus') dataKey = '-';
     else if (code === 'Equal') dataKey = '=';
     else if (code === 'BracketLeft') dataKey = '[';
     else if (code === 'BracketRight') dataKey = ']';
     else if (code === 'Backquote') dataKey = '`';
     else dataKey = key.toLowerCase(); // Fallback to event.key

     // Find elements matching the dataKey
      const keyElements = visualKeyboard.querySelectorAll(`.key[data-key="${CSS.escape(dataKey)}"]`);

      if (keyElements.length > 0) {
          keyElements.forEach(keyElement => {
              keyElement.classList.add('pressed');
              // Remove class after a short delay
              setTimeout(() => keyElement?.classList.remove('pressed'), 150);
          });
      }
}


// --- Dashboard Functions ---
function updateDashboard() {
    renderResultsTable();
    renderProgressChart();
}

function renderResultsTable() {
    resultsTableContainer.innerHTML = ''; // Clear previous
    const filteredResults = filterResults(allResults);

    if (filteredResults.length === 0) {
        resultsTableContainer.innerHTML = '<p>No results recorded yet.</p>';
        return;
    }

    // Sort by date descending for table display
    const sortedForTable = [...filteredResults].sort((a, b) => b.timestamp - a.timestamp);


    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Date</th>
                <th>Mode</th>
                <th>Reference</th>
                <th>WPM</th>
                <th>Accuracy</th>
                <th>Errors</th>
                <th>Time(s)</th>
            </tr>
        </thead>
        <tbody>
            ${sortedForTable.map(r => `
                <tr>
                    <td>${r.timestamp.toLocaleString()}</td>
                    <td>${r.mode ? r.mode.charAt(0).toUpperCase() + r.mode.slice(1) : 'N/A'}</td>
                    <td>${getRefTitle(r.mode, r.reference_id)}</td>
                    <td>${r.wpm}</td>
                    <td>${r.accuracy}%</td>
                    <td>${r.errors}</td>
                    <td>${r.duration_seconds ?? 'N/A'}</td>
                </tr>
            `).join('')}
        </tbody>
    `;
    resultsTableContainer.appendChild(table);
}

function getRefTitle(mode, refId) {
    if (!refId) return 'Practice';
    let item = null;
    if (mode === 'lesson') {
        item = allLessons.find(l => l.guid === refId);
        return item ? `L${item.sequence}: ${item.title}` : refId;
    } else { // Test modes derived from test categories or direct 'words'/'time' practice
         item = allTests.find(t => t.guid === refId);
         return item ? `T: ${item.title}` : (mode === 'words' || mode === 'time' ? 'Custom' : refId); // Label non-test time/words as Custom
    }
    // return refId; // Fallback
}


function filterResults(results) {
    const filter = resultFilterSelect.value;
    if (filter === 'all') return results;
    if (filter === 'lessons') return results.filter(r => r.mode === 'lesson');
    if (filter === 'tests') return results.filter(r => r.mode !== 'lesson' && r.reference_id); // Filter tests by checking ref id presence
    // Add more filters if needed
    return results;
}

function renderProgressChart() {
    const filteredResults = filterResults(allResults);
    if (filteredResults.length === 0) {
         if(progressChart) progressChart.destroy();
         progressChart = null;
         // Clear canvas or show message
          progressChartCanvas.clearRect(0, 0, progressChartCanvas.canvas.width, progressChartCanvas.canvas.height); // Basic clear
        return;
    }

    // Sort results by timestamp ascending for chart
    const sortedResults = [...filteredResults].sort((a, b) => a.timestamp - b.timestamp);

    const chartType = chartTypeSelect.value; // 'wpm' or 'accuracy'
    const labels = sortedResults.map(r => r.timestamp.toLocaleDateString()); // X-axis labels (simplify)
    const dataPoints = sortedResults.map(r => r[chartType]); // Y-axis data

    const chartLabel = chartType.toUpperCase();
    const chartColor = chartType === 'wpm' ? 'rgba(0, 123, 255, 0.6)' : 'rgba(75, 192, 192, 0.6)';
     const pointColor = chartType === 'wpm' ? 'rgba(0, 123, 255, 1)' : 'rgba(75, 192, 192, 1)';

     // Chart.js Theme adaptation
     const isDark = userSettings.theme === 'dark';
     const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
     const ticksColor = isDark ? '#ccc' : '#666';


    const chartData = {
        labels: labels,
        datasets: [{
            label: chartLabel,
            data: dataPoints,
            borderColor: pointColor,
            backgroundColor: chartColor, // Fill color
            borderWidth: 2,
            tension: 0.1, // Slight curve
            fill: true, // Fill area under line
            pointRadius: 4,
             pointHoverRadius: 6,
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: chartType === 'wpm', // Start WPM at 0, Accuracy maybe not
                min: chartType === 'accuracy' ? Math.max(0, Math.min(...dataPoints) - 5) : 0, // Adjust min for accuracy
                max: chartType === 'accuracy' ? 100 : undefined, // Max 100 for accuracy
                title: { display: true, text: chartLabel, color: ticksColor },
                 grid: { color: gridColor },
                 ticks: { color: ticksColor }
            },
            x: {
                 title: { display: true, text: 'Date', color: ticksColor },
                 grid: { color: gridColor },
                 ticks: { color: ticksColor }
            }
        },
        plugins: {
            legend: { display: false }, // Hide legend if only one dataset
             tooltip: {
                 callbacks: {
                      label: function(context) {
                          let label = context.dataset.label || '';
                          if (label) label += ': ';
                          label += context.parsed.y;
                           if (chartType === 'accuracy') label += '%';
                          return label;
                      },
                      title: function(context) {
                           // Show full date/time on tooltip title
                           const index = context[0]?.dataIndex;
                           if (index !== undefined && sortedResults[index]) {
                               return sortedResults[index].timestamp.toLocaleString();
                           }
                           return '';
                      }
                 }
             }
        }
    };

    // Destroy previous chart instance before creating new one
    if (progressChart) {
        progressChart.destroy();
    }

    progressChart = new Chart(progressChartCanvas, {
        type: 'line',
        data: chartData,
        options: chartOptions
    });
}

function updateChartTheme() {
     if (!progressChart) return;
     const isDark = userSettings.theme === 'dark';
     const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
     const ticksColor = isDark ? '#ccc' : '#666';

     progressChart.options.scales.x.grid.color = gridColor;
     progressChart.options.scales.x.ticks.color = ticksColor;
     progressChart.options.scales.x.title.color = ticksColor;
     progressChart.options.scales.y.grid.color = gridColor;
     progressChart.options.scales.y.ticks.color = ticksColor;
      progressChart.options.scales.y.title.color = ticksColor;

     progressChart.update();
}


// --- Event Listeners Setup ---
function setupEventListeners() {
    // Navigation
    navButtons.forEach(button => button.addEventListener('click', handleNavClick));

    // Game Options
    practiceTypeSelect.addEventListener('change', () => {
        updatePracticeOptionsVisibility();
        setupGame(); // Start new game when type changes
    });
    lessonSelect.addEventListener('change', setupGame);
    testSelect.addEventListener('change', setupGame);
    wordsSettingSelect.addEventListener('change', setupGame);
    timeSettingSelect.addEventListener('change', setupGame);

    // Game Control
    resetButton.addEventListener('click', setupGame); // Reset re-runs setup
     startNextButton.addEventListener('click', handleStartNext);

    // Typing Input
    document.addEventListener('keydown', handleKeyPress);
    // Optional: Add visual feedback for keydown on virtual keyboard
    document.addEventListener('keydown', handleKeyboardPressFeedback);


    // Dashboard Controls
    chartTypeSelect.addEventListener('change', renderProgressChart);
    resultFilterSelect.addEventListener('change', updateDashboard); // Refilter results and chart

    // Settings Controls
    themeSelect.addEventListener('change', handleThemeChange);
    soundToggle.addEventListener('change', handleSoundToggle);

    // Trigger audio initialization attempt on first interaction
    initAudioOnInteraction();
}

// --- Run Initialization ---
initializeApp();
