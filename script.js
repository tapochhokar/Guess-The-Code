/* 🛠️ Configuration & State */
const config = {
    length: 4,
    difficulty: 'medium', // Easy (Visual Hints), Medium (Standard), Hard (No yellow hints?) - Keeping standard for now
    repeats: false,
    maxAttempts: 8,
    maxHints: 3
};

const state = {
    code: "",
    attempts: 0,
    hintsUsed: 0,
    history: [],
    gameActive: false
};

/* ⚡ UI Controller */
const ui = {
    // Screen Navigation
    screens: document.querySelectorAll('.screen'),
    
    setLength: (n) => {
        config.length = parseInt(n);
        document.querySelectorAll('#length-control .seg-btn').forEach(b => {
            b.classList.toggle('active', parseInt(b.dataset.val) === n);
        });
    },

    setDiff: (d) => {
        config.difficulty = d;
        document.querySelectorAll('#diff-control .seg-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.val === d);
        });
    },

    toggleRepeats: () => {
        config.repeats = !config.repeats;
        document.querySelector('.setting-card-toggle').classList.toggle('active', config.repeats);
        document.getElementById('repeat-text').innerText = config.repeats ? "On (e.g., 1123)" : "Off (e.g., 1234)";
    },

    // OTP Input Generator
    generateInputs: () => {
        const container = document.getElementById('otp-container');
        container.innerHTML = '';
        for (let i = 0; i < config.length; i++) {
            const input = document.createElement('input');
            input.type = "text"; // Text works better for handling selection/mobile quirks than 'number'
            input.inputMode = "numeric";
            input.maxLength = 1;
            input.className = "otp-digit";
            input.dataset.index = i;
            input.autocomplete = "off";
            
            // Event Listeners for OTP Logic
            input.addEventListener('input', (e) => handleInput(e, i));
            input.addEventListener('keydown', (e) => handleKeyDown(e, i));
            input.addEventListener('focus', (e) => e.target.select());
            
            container.appendChild(input);
        }
    },

    // Feedback Toast
    showFeedback: (msg, type = 'neutral') => {
        const el = document.getElementById('feedback-area');
        el.innerText = msg;
        el.className = 'feedback-toast';
        if(type === 'error') {
            el.classList.add('feedback-error', 'anim-shake');
            setTimeout(() => el.classList.remove('anim-shake'), 400);
        } else if (type === 'success') {
            el.classList.add('feedback-success');
        }
    },

    // Add History Item
    logGuess: (guess, bulls, cows) => {
        const list = document.getElementById('history-list');
        const item = document.createElement('div');
        item.className = 'history-item';
        
        let pills = '';
        if (bulls > 0) pills += `<div class="pill green" title="Correct Position">${bulls} correct</div>`;
        if (cows > 0) pills += `<div class="pill yellow" title="Wrong Position">${cows} misplaced</div>`;
        if (bulls === 0 && cows === 0) pills = `<span style="color:#94a3b8; font-size:0.8rem">No Matches</span>`;

        item.innerHTML = `
            <span class="guess-nums">${guess}</span>
            <div class="result-pills">${pills}</div>
        `;
        list.prepend(item);
    }
};

/* 🎮 Logic Controller */
const gameApp = {
    switchScreen: (id) => {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        const active = document.getElementById(id);
        active.classList.remove('hidden');
        if(id === 'screen-game') setTimeout(() => document.querySelector('.otp-digit').focus(), 500);
    },

    initGame: () => {
        // Reset State
        state.attempts = config.maxAttempts;
        state.hintsUsed = 0;
        state.gameActive = true;
        state.code = generateSecretCode();
        state.history = [];
        
        // Reset UI
        document.getElementById('attempts-count').innerText = state.attempts;
        document.getElementById('hints-left').innerText = config.maxHints;
        document.getElementById('history-list').innerHTML = '';
        document.getElementById('btn-hint').disabled = false;
        document.getElementById('btn-hint').style.opacity = "1";
        
        ui.generateInputs();
        ui.showFeedback("Crack the code!");
        gameApp.switchScreen('screen-game');
    },

    submitGuess: () => {
        if (!state.gameActive) return;

        // Collect Guess
        const inputs = document.querySelectorAll('.otp-digit');
        let guess = "";
        inputs.forEach(input => guess += input.value);

        // Validation
        if (guess.length !== config.length) {
            ui.showFeedback(`Enter ${config.length} digits`, 'error');
            return;
        }
        if (!/^\d+$/.test(guess)) {
            ui.showFeedback("Numbers only", 'error');
            return;
        }

        // Processing
        const feedback = calculateBullsAndCows(guess, state.code);
        state.attempts--;
        document.getElementById('attempts-count').innerText = state.attempts;
        
        ui.logGuess(guess, feedback.bulls, feedback.cows);
        
        // Check End Game
        if (feedback.bulls === config.length) {
            endGame(true);
        } else if (state.attempts <= 0) {
            endGame(false);
        } else {
            ui.showFeedback("Guess recorded", 'neutral');
            // Clear inputs for next guess? Or keep them? Usually better to keep for reference, 
            // but let's clear to force memory/logic usage.
            // inputs.forEach(i => i.value = '');
            inputs[0].focus();
        }
    },

    useHint: () => {
        if (!state.gameActive || state.hintsUsed >= config.maxHints) return;

        // Simple Hint Logic: Reveal the first unsolved digit
        const inputs = document.querySelectorAll('.otp-digit');
        let revealedIndex = -1;
        
        // Find a spot that hasn't been correctly guessed yet? 
        // Since we don't track per-digit locks in UI, let's just reveal a random position
        // Or better: Reveal the first digit they currently have wrong in input?
        // Let's go simple: Reveal specific index based on hint count (not ideal).
        // Let's do: Reveal a random index.
        
        const idx = Math.floor(Math.random() * config.length);
        const val = state.code[idx];

        state.hintsUsed++;
        document.getElementById('hints-left').innerText = config.maxHints - state.hintsUsed;
        
        ui.showFeedback(`Hint: Position ${idx + 1} is '${val}'`, 'success');
        
        if (state.hintsUsed >= config.maxHints) {
            const btn = document.getElementById('btn-hint');
            btn.style.opacity = "0.5";
            btn.disabled = true;
        }
    },

    confirmRestart: () => {
        if(confirm("Restart game? Progress will be lost.")) gameApp.initGame();
    }
};

/* 🔢 Helper Functions */

// Input Handling (OTP Style)
function handleInput(e, index) {
    const input = e.target;
    const val = input.value;
    const inputs = document.querySelectorAll('.otp-digit');

    // Only allow numbers
    if (!/^\d*$/.test(val)) {
        input.value = "";
        return;
    }

    if (val.length === 1) {
        input.classList.add('filled');
        if (index < config.length - 1) inputs[index + 1].focus();
    } else if (val.length === 0) {
        input.classList.remove('filled');
    }
}

function handleKeyDown(e, index) {
    const inputs = document.querySelectorAll('.otp-digit');
    if (e.key === "Backspace" && !e.target.value && index > 0) {
        inputs[index - 1].focus();
    }
    if (e.key === "Enter") {
        gameApp.submitGuess();
    }
}

// Logic: Bulls (Correct Pos) & Cows (Wrong Pos)
function generateSecretCode() {
    let code = "";
    if (config.repeats) {
        for(let i=0; i<config.length; i++) code += Math.floor(Math.random()*10);
    } else {
        let pool = [0,1,2,3,4,5,6,7,8,9];
        for(let i=0; i<config.length; i++) {
            let idx = Math.floor(Math.random()*pool.length);
            code += pool[idx];
            pool.splice(idx, 1);
        }
    }
    console.log("Dev Code:", code); 
    return code;
}

function calculateBullsAndCows(guess, secret) {
    let bulls = 0; // Correct Position
    let cows = 0;  // Wrong Position

    const guessArr = guess.split('');
    const secretArr = secret.split('');
    const secretUsed = new Array(secret.length).fill(false);
    const guessUsed = new Array(secret.length).fill(false);

    // 1. Find Bulls first
    for (let i = 0; i < secret.length; i++) {
        if (guessArr[i] === secretArr[i]) {
            bulls++;
            secretUsed[i] = true;
            guessUsed[i] = true;
        }
    }

    // 2. Find Cows
    for (let i = 0; i < secret.length; i++) {
        if (guessUsed[i]) continue; // Skip if this guess digit is already a Bull

        for (let j = 0; j < secret.length; j++) {
            if (!secretUsed[j] && guessArr[i] === secretArr[j]) {
                cows++;
                secretUsed[j] = true; // Mark this secret digit as "matched" to prevent double counting
                break;
            }
        }
    }

    return { bulls, cows };
}

function endGame(win) {
    state.gameActive = false;
    document.getElementById('final-code').innerText = state.code.split('').join(' ');
    document.getElementById('stat-attempts').innerText = config.maxAttempts - state.attempts;
    document.getElementById('stat-hints').innerText = state.hintsUsed;
    
    if (win) {
        document.getElementById('result-title').innerText = "Mission Complete!";
        document.getElementById('result-msg').innerText = "You cracked the security code.";
        document.getElementById('result-visual').innerText = "🏆";
        triggerConfetti();
    } else {
        document.getElementById('result-title').innerText = "System Locked";
        document.getElementById('result-msg').innerText = "You ran out of attempts.";
        document.getElementById('result-visual').innerText = "⛔";
    }
    
    setTimeout(() => gameApp.switchScreen('screen-result'), 800);
}

/* 🎉 Confetti Effect */
function triggerConfetti() {
    const container = document.getElementById('confetti-container');
    container.innerHTML = '';
    const colors = ['#6366f1', '#22c55e', '#eab308', '#ef4444'];
    
    for (let i = 0; i < 50; i++) {
        const conf = document.createElement('div');
        conf.className = 'confetti';
        conf.style.left = Math.random() * 100 + 'vw';
        conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        conf.style.animationDuration = (Math.random() * 2 + 2) + 's';
        conf.style.opacity = Math.random();
        container.appendChild(conf);
    }
    setTimeout(() => container.innerHTML = '', 4000);
}

// Init
gameApp.switchScreen('screen-start');