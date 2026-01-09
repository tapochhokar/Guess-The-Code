/* 🔊 Sound Manager (Fun Factor) */
const audio = {
    enabled: true,
    ctx: new (window.AudioContext || window.webkitAudioContext)(),
    
    playTone: (freq, type, duration) => {
        if (!audio.enabled) return;
        const osc = audio.ctx.createOscillator();
        const gain = audio.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audio.ctx.currentTime);
        gain.gain.setValueAtTime(0.1, audio.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audio.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audio.ctx.destination);
        osc.start();
        osc.stop(audio.ctx.currentTime + duration);
    },
    
    tap: () => audio.playTone(600, 'sine', 0.1),
    error: () => audio.playTone(150, 'sawtooth', 0.3),
    success: () => {
        audio.playTone(400, 'sine', 0.1);
        setTimeout(() => audio.playTone(600, 'sine', 0.2), 100);
    },
    win: () => {
        [300, 400, 500, 600, 800].forEach((f, i) => setTimeout(() => audio.playTone(f, 'square', 0.2), i*100));
    },
    toggle: () => {
        audio.enabled = !audio.enabled;
        document.getElementById('btn-sound').innerText = audio.enabled ? '🔊' : '🔇';
    }
};

/* 🛠️ Configuration & State */
const config = {
    length: 4,
    difficulty: 'medium',
    repeats: false,
    maxAttempts: 8,
    maxHints: 3
};

const state = {
    code: "",
    attempts: 0,
    hintsUsed: 0,
    gameActive: false
};

// Balancing Matrix: Digits -> { Difficulty: Attempts }
const balanceMatrix = {
    3: { easy: 8, medium: 6, hard: 4 },
    4: { easy: 10, medium: 8, hard: 6 },
    5: { easy: 14, medium: 12, hard: 10 }
};

/* ⚡ UI Controller */
const ui = {
    screens: document.querySelectorAll('.screen'),
    
    setLength: (n) => {
        config.length = parseInt(n);
        document.querySelectorAll('#length-control .seg-btn').forEach(b => {
            b.classList.toggle('active', parseInt(b.dataset.val) === n);
        });
        audio.tap();
    },

    setDiff: (d) => {
        config.difficulty = d;
        document.querySelectorAll('#diff-control .seg-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.val === d);
        });
        audio.tap();
    },

    toggleRepeats: () => {
        config.repeats = !config.repeats;
        document.querySelector('.setting-card-toggle').classList.toggle('active', config.repeats);
        document.getElementById('repeat-text').innerText = config.repeats ? "On (+2 Attempts)" : "Off";
        audio.tap();
    },

    generateInputs: () => {
        const container = document.getElementById('otp-container');
        container.innerHTML = '';
        container.style.gridTemplateColumns = `repeat(${config.length}, 1fr)`;
        
        for (let i = 0; i < config.length; i++) {
            const input = document.createElement('input');
            input.type = "text"; 
            input.inputMode = "numeric";
            input.maxLength = 1;
            input.className = "otp-digit";
            input.dataset.index = i;
            input.autocomplete = "off";
            
            input.addEventListener('input', (e) => handleInput(e, i));
            input.addEventListener('keydown', (e) => handleKeyDown(e, i));
            input.addEventListener('focus', (e) => e.target.select());
            
            container.appendChild(input);
        }
    },

    showFeedback: (msg, type = 'neutral') => {
        const el = document.getElementById('feedback-area');
        el.innerText = msg;
        el.className = 'feedback-toast';
        if(type === 'error') {
            el.classList.add('feedback-error', 'anim-shake');
            setTimeout(() => el.classList.remove('anim-shake'), 400);
            audio.error();
        } 
    },

    logGuess: (guess, bulls, cows) => {
        const list = document.getElementById('history-list');
        const item = document.createElement('div');
        item.className = 'history-item';
        
        // 🔥 Calculate Wrong (Red)
        const wrong = config.length - (bulls + cows);

        let pills = '';
        if (bulls > 0) pills += `<div class="pill green" title="Correct">${bulls}</div>`;
        if (cows > 0) pills += `<div class="pill yellow" title="Misplaced">${cows}</div>`;
        if (wrong > 0) pills += `<div class="pill red" title="Wrong">${wrong}</div>`;

        item.innerHTML = `
            <span class="guess-nums">${guess}</span>
            <div class="result-pills">${pills}</div>
        `;
        list.prepend(item);
        audio.success();
    },

    updateAttemptDisplay: () => {
        const badge = document.querySelector('.attempts-badge');
        const count = document.getElementById('attempts-count');
        count.innerText = state.attempts;
        
        // Critical State Visuals (Red Pulse)
        if (state.attempts <= 2) {
            badge.classList.add('low');
            document.body.classList.add('critical-state');
        } else {
            badge.classList.remove('low');
            document.body.classList.remove('critical-state');
        }
    }
};

/* 🎮 Logic Controller */
const gameApp = {
    switchScreen: (id) => {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        const active = document.getElementById(id);
        active.classList.remove('hidden');
        if(id === 'screen-game') setTimeout(() => {
             const firstInput = document.querySelector('.otp-digit');
             if(firstInput) firstInput.focus();
        }, 500);
    },

    calculateMaxAttempts: () => {
        let base = balanceMatrix[config.length][config.difficulty];
        if (config.repeats) base += 2; // Bonus attempts for duplicates
        return base;
    },

    initGame: () => {
        config.maxAttempts = gameApp.calculateMaxAttempts(); 
        state.attempts = config.maxAttempts;
        state.hintsUsed = 0;
        state.gameActive = true;
        state.code = generateSecretCode();
        
        document.getElementById('hints-left').innerText = config.maxHints;
        document.getElementById('history-list').innerHTML = '';
        document.getElementById('btn-hint').disabled = false;
        document.getElementById('btn-hint').style.opacity = "1";
        
        // Reset Body State
        document.body.classList.remove('critical-state');
        
        ui.updateAttemptDisplay();
        ui.generateInputs();
        ui.showFeedback("Crack the code!");
        gameApp.switchScreen('screen-game');
        
        // Init Audio Context
        if(audio.ctx.state === 'suspended') audio.ctx.resume();
    },

    submitGuess: () => {
        if (!state.gameActive) return;

        const inputs = document.querySelectorAll('.otp-digit');
        let guess = "";
        inputs.forEach(input => guess += input.value);

        if (guess.length !== config.length) {
            ui.showFeedback(`Enter ${config.length} digits`, 'error');
            return;
        }
        if (!/^\d+$/.test(guess)) {
            ui.showFeedback("Numbers only", 'error');
            return;
        }

        const feedback = calculateBullsAndCows(guess, state.code);
        state.attempts--;
        ui.updateAttemptDisplay();
        
        ui.logGuess(guess, feedback.bulls, feedback.cows);
        
        if (feedback.bulls === config.length) {
            endGame(true);
        } else if (state.attempts <= 0) {
            endGame(false);
        } else {
            ui.showFeedback("Guess recorded", 'neutral');
            inputs[0].focus();
        }
    },

    useHint: () => {
        if (!state.gameActive || state.hintsUsed >= config.maxHints) return;
        
        const idx = Math.floor(Math.random() * config.length);
        const val = state.code[idx];

        state.hintsUsed++;
        document.getElementById('hints-left').innerText = config.maxHints - state.hintsUsed;
        
        ui.showFeedback(`Hint: Position ${idx + 1} is '${val}'`, 'success');
        audio.tap();
        
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

/* 🔢 Helper Functions & LOGIC */

function handleInput(e, index) {
    const input = e.target;
    const val = input.value;
    const inputs = document.querySelectorAll('.otp-digit');

    if (!/^\d*$/.test(val)) {
        input.value = "";
        return;
    }

    if (val.length === 1) {
        input.classList.add('filled');
        audio.tap(); 
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

/* 🧠 THE FIXED LOGIC: Prevents Double Counting */
function calculateBullsAndCows(guess, secret) {
    let bulls = 0; // Correct Position
    let cows = 0;  // Wrong Position

    const guessArr = guess.split('');
    const secretArr = secret.split('');
    
    // Arrays to track consumed digits
    const secretUsed = new Array(secret.length).fill(false);
    const guessUsed = new Array(secret.length).fill(false);

    // 1. Find Bulls (Green) First
    for (let i = 0; i < secret.length; i++) {
        if (guessArr[i] === secretArr[i]) {
            bulls++;
            secretUsed[i] = true; 
            guessUsed[i] = true;
        }
    }

    // 2. Find Cows (Yellow)
    for (let i = 0; i < secret.length; i++) {
        if (guessUsed[i]) continue; // Skip if this guess digit is already a Bull

        for (let j = 0; j < secret.length; j++) {
            // Find a match in secret that hasn't been used yet
            if (!secretUsed[j] && guessArr[i] === secretArr[j]) {
                cows++;
                secretUsed[j] = true; // Mark as used
                break; 
            }
        }
    }

    return { bulls, cows };
}

function endGame(win) {
    state.gameActive = false;
    document.body.classList.remove('critical-state');
    
    document.getElementById('final-code').innerText = state.code.split('').join(' ');
    document.getElementById('stat-attempts').innerText = config.maxAttempts - state.attempts;
    document.getElementById('stat-hints').innerText = state.hintsUsed;
    
    if (win) {
        document.getElementById('result-title').innerText = "Mission Complete!";
        document.getElementById('result-msg').innerText = "You cracked the security code.";
        document.getElementById('result-visual').innerText = "🏆";
        audio.win();
        triggerConfetti();
    } else {
        document.getElementById('result-title').innerText = "System Locked";
        document.getElementById('result-msg').innerText = "You ran out of attempts.";
        document.getElementById('result-visual').innerText = "⛔";
        audio.error();
    }
    
    setTimeout(() => gameApp.switchScreen('screen-result'), 800);
}

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

// Start
gameApp.switchScreen('screen-start');