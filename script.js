const el = (id) => document.getElementById(id);

const memorizeRange = el('memorizeRange');
const memorizeValue = el('memorizeValue');
const inputRange = el('inputRange');
const inputValue = el('inputValue');
const litRange = el('litRange');
const litValue = el('litValue');
const sizeRange = el('sizeRange');
const sizeValue = el('sizeValue');
const sizeValue2 = el('sizeValue2');
const startBtn = el('startBtn');

const phaseLabel = el('phaseLabel');
const timerBarWrap = el('timerBarWrap');
const timerBar = el('timerBar');
const board = el('board');
const resultMessage = el('resultMessage');

const statAttempts = el('statAttempts');
const statClears = el('statClears');
const statRate = el('statRate');
const statStreak = el('statStreak');

const STATS_KEY = 'memoryGridStats';
const stats = JSON.parse(localStorage.getItem(STATS_KEY) || '{"attempts":0,"clears":0,"streak":0}');

let phase = 'idle'; // idle | memorize | input | result
let gridSize = 7;
let litCount = 5;
let correctCells = new Set();
let selectedCells = new Set();
let phaseDeadline = 0;
let phaseDuration = 0;
let timerInterval = null;

function renderStats() {
    statAttempts.textContent = stats.attempts;
    statClears.textContent = stats.clears;
    statRate.textContent = stats.attempts ? Math.round((stats.clears / stats.attempts) * 100) + '%' : '-';
    statStreak.textContent = stats.streak;
}

function saveResult(won) {
    stats.attempts++;
    if (won) {
        stats.clears++;
        stats.streak++;
    } else {
        stats.streak = 0;
    }
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    renderStats();
}

memorizeRange.addEventListener('input', () => { memorizeValue.textContent = (memorizeRange.value / 1000).toFixed(1); });
inputRange.addEventListener('input', () => { inputValue.textContent = (inputRange.value / 1000).toFixed(1); });
litRange.addEventListener('input', () => { litValue.textContent = litRange.value; });
sizeRange.addEventListener('input', () => {
    sizeValue.textContent = sizeRange.value;
    sizeValue2.textContent = sizeRange.value;
});

function pickRandomCells(size, count) {
    const total = size * size;
    const indices = Array.from({ length: total }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return new Set(indices.slice(0, count));
}

function renderBoard() {
    const cellSize = Math.max(28, Math.min(56, Math.floor(420 / gridSize)));
    board.style.setProperty('--cell-size', cellSize + 'px');
    board.style.gridTemplateColumns = `repeat(${gridSize}, var(--cell-size, 48px))`;
    board.innerHTML = '';

    for (let i = 0; i < gridSize * gridSize; i++) {
        const btn = document.createElement('button');
        btn.className = 'cell';
        if (phase === 'memorize' && correctCells.has(i)) btn.classList.add('lit');
        if (phase === 'input' && selectedCells.has(i)) btn.classList.add('selected');
        if (phase === 'result') {
            if (correctCells.has(i)) btn.classList.add('correct');
            else if (selectedCells.has(i)) btn.classList.add('wrong');
        }
        btn.disabled = phase !== 'input';
        btn.addEventListener('click', () => onCellClick(i));
        board.appendChild(btn);
    }
}

function onCellClick(index) {
    if (phase !== 'input') return;
    if (selectedCells.has(index)) {
        selectedCells.delete(index);
    } else if (selectedCells.size < litCount) {
        selectedCells.add(index);
    }
    renderBoard();

    if (selectedCells.size === litCount) {
        finishInput();
    }
}

function startPhaseTimer(durationMs, onExpire) {
    clearInterval(timerInterval);
    phaseDeadline = performance.now() + durationMs;
    phaseDuration = durationMs;
    timerBarWrap.classList.add('active');
    timerBar.style.transition = 'none';
    timerBar.style.width = '100%';
    timerBar.classList.remove('danger');
    void timerBar.offsetWidth;
    timerBar.style.transition = `width ${durationMs}ms linear`;
    timerBar.style.width = '0%';

    timerInterval = setInterval(() => {
        const remaining = phaseDeadline - performance.now();
        if (remaining / phaseDuration < 0.25) timerBar.classList.add('danger');
        if (remaining <= 0) {
            clearInterval(timerInterval);
            onExpire();
        }
    }, 50);
}

function startGame() {
    gridSize = Number(sizeRange.value);
    litCount = Math.min(Number(litRange.value), gridSize * gridSize - 1);
    const memorizeMs = Number(memorizeRange.value);
    const inputMs = Number(inputRange.value);

    startBtn.disabled = true;
    resultMessage.textContent = '';
    resultMessage.className = 'result-message';
    selectedCells = new Set();
    correctCells = pickRandomCells(gridSize, litCount);

    phase = 'memorize';
    phaseLabel.textContent = '覚えてください';
    renderBoard();

    startPhaseTimer(memorizeMs, () => {
        phase = 'input';
        phaseLabel.textContent = '同じ位置をクリックしてください';
        renderBoard();
        startPhaseTimer(inputMs, () => finishInput(true));
    });
}

function finishInput(timedOut) {
    clearInterval(timerInterval);
    timerBarWrap.classList.remove('active');
    phase = 'result';

    const won = !timedOut &&
        selectedCells.size === correctCells.size &&
        [...selectedCells].every((i) => correctCells.has(i));

    phaseLabel.textContent = '';
    resultMessage.textContent = won ? 'クリア!' : (timedOut ? '時間切れ...' : '失敗...');
    resultMessage.className = 'result-message ' + (won ? 'success' : 'fail');
    renderBoard();
    saveResult(won);

    startBtn.disabled = false;
}

startBtn.addEventListener('click', startGame);

renderStats();
