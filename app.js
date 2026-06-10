
// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('SW Registered:', reg.scope))
      .catch(err => console.log('SW Registration Failed:', err));
  });
}

// ----------------------------------------------------
// 1. RETRO SYNTHESIS SOUND ENGINE
// ----------------------------------------------------
class RetroSoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      } else {
        this.enabled = false;
      }
    } catch (e) {
      console.warn("Web Audio API not supported:", e);
      this.enabled = false;
    }
  }

  playTone(freq, type, duration, slideTo = 0) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      
      // Unlock if suspended
      if (this.ctx.state === 'suspended' && typeof this.ctx.resume === 'function') {
        this.ctx.resume();
      }

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      
      if (slideTo > 0) {
        osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);
      }

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("Error playing retro audio tone:", e);
    }
  }

  playClick() { this.playTone(600, 'triangle', 0.08, 150); }
  playScore() {
    this.playTone(523.25, 'square', 0.08); // C5
    setTimeout(() => this.playTone(659.25, 'square', 0.12), 60); // E5
  }
  playHit() { this.playTone(180, 'sawtooth', 0.18, 50); }
  playGameOver() {
    this.playTone(250, 'sawtooth', 0.3, 60);
    setTimeout(() => this.playTone(180, 'sawtooth', 0.5, 40), 120);
  }
  playWin() {
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major Chord Arpeggio
    notes.forEach((note, i) => {
      setTimeout(() => this.playTone(note, 'triangle', 0.15), i * 90);
    });
  }
}

const sounds = new RetroSoundEngine();

// ----------------------------------------------------
// 2. STATE AND MENU MANAGER
// ----------------------------------------------------
const STATE = {
  menu: 'menu',
  playing: 'playing',
  paused: 'paused',
  gameover: 'gameover'
};

const gamesList = ['snake', 'blocks', 'paddle', 'defender', 'memory', 'runner', 'minesweeper'];

const DOM = {
  menuScreen: document.getElementById('menuScreen'),
  gameScreen: document.getElementById('gameScreen'),
  canvas: document.getElementById('gameCanvas'),
  ctx: document.getElementById('gameCanvas').getContext('2d'),
  
  difficultySelect: document.getElementById('difficultySelect'),
  soundToggle: document.getElementById('soundToggle'),
  hofButton: document.getElementById('hofButton'),
  randomGameBtn: document.getElementById('randomGameBtn'),
  
  exitGameBtn: document.getElementById('exitGameBtn'),
  pauseGameBtn: document.getElementById('pauseGameBtn'),
  activeGameTitle: document.getElementById('activeGameTitle'),
  currentScore: document.getElementById('currentScore'),
  activeHighScore: document.getElementById('activeHighScore'),
  
  instructionsOverlay: document.getElementById('instructionsOverlay'),
  instructionText: document.getElementById('instructionText'),
  startGameBtn: document.getElementById('startGameBtn'),
  
  mobileController: document.getElementById('mobileController'),
  ctrlDpad: document.getElementById('ctrlDpad'),
  ctrlLeftRightAction: document.getElementById('ctrlLeftRightAction'),
  ctrlJumpOnly: document.getElementById('ctrlJumpOnly'),
  
  // Modals
  hofModal: document.getElementById('hofModal'),
  closeHofBtn: document.getElementById('closeHofBtn'),
  resetScoresBtn: document.getElementById('resetScoresBtn'),
  
  pauseModal: document.getElementById('pauseModal'),
  resumeBtn: document.getElementById('resumeBtn'),
  restartBtn: document.getElementById('restartBtn'),
  quitBtn: document.getElementById('quitBtn'),
  
  gameOverModal: document.getElementById('gameOverModal'),
  finalScore: document.getElementById('finalScore'),
  finalHighScore: document.getElementById('finalHighScore'),
  newHighScoreAlert: document.getElementById('newHighScoreAlert'),
  goRestartBtn: document.getElementById('goRestartBtn'),
  goQuitBtn: document.getElementById('goQuitBtn'),
};

let activeGameKey = null;
let activeGame = null;
let appState = STATE.menu;
let score = 0;
let difficulty = 'normal';
let rafId = null;
let isPaused = false;

// Key states tracking
const keysPressed = {};

// Prevent scrolling when pressing mobile controls
DOM.mobileController.addEventListener('touchstart', (e) => {
  e.preventDefault();
}, { passive: false });

DOM.canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
}, { passive: false });

// Helper: Local Storage Scores
function getHighScore(gameKey) {
  return parseInt(localStorage.getItem(`arcade_${gameKey}`) || '0', 10);
}

function setHighScore(gameKey, val) {
  localStorage.setItem(`arcade_${gameKey}`, val);
}

// ----------------------------------------------------
// 3. SOUND TOGGLE CONTROL
// ----------------------------------------------------
DOM.soundToggle.addEventListener('click', () => {
  sounds.enabled = !sounds.enabled;
  sounds.playClick();
  DOM.soundToggle.innerHTML = `<span class="btn-text">🔊 SOUND ${sounds.enabled ? 'ON' : 'OFF'}</span>`;
  if (!sounds.enabled) {
    DOM.soundToggle.classList.add('danger-btn');
  } else {
    DOM.soundToggle.classList.remove('danger-btn');
  }
});

// ----------------------------------------------------
// 4. HALL OF FAME LEADERBOARD MODAL
// ----------------------------------------------------
function updateHofDisplay() {
  document.getElementById('scoreSnake').textContent = getHighScore('snake');
  document.getElementById('scoreBlocks').textContent = getHighScore('blocks');
  document.getElementById('scorePaddle').textContent = getHighScore('paddle');
  document.getElementById('scoreDefender').textContent = getHighScore('defender');
  document.getElementById('scoreMemory').textContent = getHighScore('memory');
  document.getElementById('scoreRunner').textContent = getHighScore('runner');
  document.getElementById('scoreMinesweeper').textContent = getHighScore('minesweeper');
}

DOM.hofButton.addEventListener('click', () => {
  sounds.playClick();
  updateHofDisplay();
  DOM.hofModal.classList.add('active');
});

DOM.closeHofBtn.addEventListener('click', () => {
  sounds.playClick();
  DOM.hofModal.classList.remove('active');
});

DOM.resetScoresBtn.addEventListener('click', () => {
  sounds.playClick();
  if (confirm('RESET ALL HIGH SCORES TO ZERO? Are you sure?')) {
    gamesList.forEach(k => setHighScore(k, 0));
    updateHofDisplay();
    sounds.playHit();
  }
});

// ----------------------------------------------------
// 5. SELECTION CONTROLLER
// ----------------------------------------------------
document.querySelectorAll('.game-card').forEach(card => {
  card.addEventListener('click', () => {
    const gameKey = card.dataset.game;
    launchGame(gameKey);
  });
});

DOM.randomGameBtn.addEventListener('click', () => {
  sounds.playClick();
  const randKey = gamesList[Math.floor(Math.random() * gamesList.length)];
  launchGame(randKey);
});

DOM.difficultySelect.addEventListener('change', (e) => {
  difficulty = e.target.value;
  sounds.playClick();
});

// ----------------------------------------------------
// 6. GAME LAUNCH & ARENA LIFECYCLE
// ----------------------------------------------------
function launchGame(gameKey) {
  sounds.playClick();
  activeGameKey = gameKey;
  appState = STATE.playing;
  
  DOM.menuScreen.classList.remove('active');
  DOM.gameScreen.classList.add('active');
  
  const formattedNames = {
    snake: 'SNAKE PIXEL',
    blocks: 'BLOCK DROP',
    paddle: 'PADDLE BOUNCE',
    defender: 'SPACE DEFENDER',
    memory: 'MEMORY TILES',
    runner: 'PIXEL RUNNER',
    minesweeper: 'MINESWEEPER RETRO'
  };
  DOM.activeGameTitle.textContent = formattedNames[gameKey];
  
  // Show high score
  DOM.activeHighScore.textContent = getHighScore(gameKey);
  score = 0;
  DOM.currentScore.textContent = score;

  // Toggle mobile layouts
  DOM.ctrlDpad.classList.add('hidden');
  DOM.ctrlLeftRightAction.classList.add('hidden');
  DOM.ctrlJumpOnly.classList.add('hidden');

  if (gameKey === 'snake') {
    DOM.ctrlDpad.classList.remove('hidden');
    DOM.instructionText.textContent = "Navigate the grid. Eat green/gold apples. Do not crash!";
  } else if (gameKey === 'blocks') {
    DOM.ctrlLeftRightAction.classList.remove('hidden');
    document.getElementById('btnActionA').textContent = 'ROTATE';
    document.getElementById('btnActionB').textContent = 'DROP';
    DOM.instructionText.textContent = "Move blocks. Rotate to align rows and clear lines.";
  } else if (gameKey === 'paddle') {
    DOM.ctrlLeftRightAction.classList.remove('hidden');
    document.getElementById('btnActionA').textContent = '---';
    document.getElementById('btnActionB').textContent = '---';
    DOM.instructionText.textContent = "Bounce the square ball. Smash bricks. Grab glowing items.";
  } else if (gameKey === 'defender') {
    DOM.ctrlLeftRightAction.classList.remove('hidden');
    document.getElementById('btnActionA').textContent = 'FIRE';
    document.getElementById('btnActionB').textContent = '---';
    DOM.instructionText.textContent = "Defend the grid from asteroids and space alien invasions.";
  } else if (gameKey === 'memory') {
    // Memory Tiles is tap-based on the canvas, hide keys
    DOM.instructionText.textContent = "Tap tiles. Pair identical icons. Avoid mistakes.";
  } else if (gameKey === 'runner') {
    DOM.ctrlJumpOnly.classList.remove('hidden');
    DOM.instructionText.textContent = "Jump over red spikes and birds. Gain speed.";
  } else if (gameKey === 'minesweeper') {
    // Tap based on canvas
    DOM.instructionText.textContent = "Tap to dig. Hold (>350ms) to flag. Safe first click!";
  }
  
  DOM.instructionsOverlay.classList.remove('hidden');
}

DOM.startGameBtn.addEventListener('click', () => {
  sounds.playClick();
  DOM.instructionsOverlay.classList.add('hidden');
  initActiveGame();
});

// Setup game instance
function initActiveGame() {
  if (activeGame) {
    activeGame.cleanup();
  }
  
  if (activeGameKey === 'snake') activeGame = new SnakeGame(DOM.canvas, difficulty);
  else if (activeGameKey === 'blocks') activeGame = new BlockDropGame(DOM.canvas, difficulty);
  else if (activeGameKey === 'paddle') activeGame = new PaddleBounceGame(DOM.canvas, difficulty);
  else if (activeGameKey === 'defender') activeGame = new SpaceDefenderGame(DOM.canvas, difficulty);
  else if (activeGameKey === 'memory') activeGame = new MemoryTilesGame(DOM.canvas, difficulty);
  else if (activeGameKey === 'runner') activeGame = new PixelRunnerGame(DOM.canvas, difficulty);
  else if (activeGameKey === 'minesweeper') activeGame = new MinesweeperGame(DOM.canvas, difficulty);

  activeGame.init();
  startGameLoop();
}

// Global Game Loop Router
let lastTime = 0;
function startGameLoop() {
  if (rafId) cancelAnimationFrame(rafId);
  lastTime = performance.now();
  isPaused = false;
  
  function loop(now) {
    if (isPaused) return;
    const dt = now - lastTime;
    lastTime = now;
    
    DOM.ctx.fillStyle = '#030308';
    DOM.ctx.fillRect(0, 0, DOM.canvas.width, DOM.canvas.height);
    
    if (activeGame) {
      activeGame.update(dt);
      activeGame.draw(DOM.ctx);
      DOM.currentScore.textContent = score;
    }
    
    rafId = requestAnimationFrame(loop);
  }
  
  rafId = requestAnimationFrame(loop);
}

// Game HUD Actions
DOM.exitGameBtn.addEventListener('click', () => {
  sounds.playClick();
  terminateActiveGame();
  DOM.gameScreen.classList.remove('active');
  DOM.menuScreen.classList.add('active');
  appState = STATE.menu;
});

DOM.pauseGameBtn.addEventListener('click', () => {
  sounds.playClick();
  pauseGame();
});

function pauseGame() {
  isPaused = true;
  appState = STATE.paused;
  DOM.pauseModal.classList.add('active');
  if (activeGame && activeGame.pause) activeGame.pause();
}

function resumeGame() {
  sounds.playClick();
  DOM.pauseModal.classList.remove('active');
  appState = STATE.playing;
  isPaused = false;
  if (activeGame && activeGame.resume) activeGame.resume();
  lastTime = performance.now();
  startGameLoop();
}

DOM.resumeBtn.addEventListener('click', resumeGame);

DOM.restartBtn.addEventListener('click', () => {
  sounds.playClick();
  DOM.pauseModal.classList.remove('active');
  score = 0;
  DOM.currentScore.textContent = 0;
  initActiveGame();
});

DOM.quitBtn.addEventListener('click', () => {
  sounds.playClick();
  DOM.pauseModal.classList.remove('active');
  terminateActiveGame();
  DOM.gameScreen.classList.remove('active');
  DOM.menuScreen.classList.add('active');
  appState = STATE.menu;
});

function terminateActiveGame() {
  if (rafId) cancelAnimationFrame(rafId);
  if (activeGame) {
    activeGame.cleanup();
    activeGame = null;
  }
}

// ----------------------------------------------------
// 7. GAME OVER CONTROLLER
// ----------------------------------------------------
function triggerGameOver() {
  sounds.playGameOver();
  isPaused = true;
  appState = STATE.gameover;
  
  const hi = getHighScore(activeGameKey);
  const newRecord = score > hi;
  if (newRecord) {
    setHighScore(activeGameKey, score);
    DOM.newHighScoreAlert.classList.remove('hidden');
    DOM.activeHighScore.textContent = score;
  } else {
    DOM.newHighScoreAlert.classList.add('hidden');
  }
  
  DOM.finalScore.textContent = score;
  DOM.finalHighScore.textContent = getHighScore(activeGameKey);
  
  DOM.gameOverModal.classList.add('active');
}

DOM.goRestartBtn.addEventListener('click', () => {
  sounds.playClick();
  DOM.gameOverModal.classList.remove('active');
  score = 0;
  DOM.currentScore.textContent = 0;
  initActiveGame();
});

DOM.goQuitBtn.addEventListener('click', () => {
  sounds.playClick();
  DOM.gameOverModal.classList.remove('active');
  terminateActiveGame();
  DOM.gameScreen.classList.remove('active');
  DOM.menuScreen.classList.add('active');
  appState = STATE.menu;
});

// ----------------------------------------------------
// 8. UNIFIED KEYBOARD HANDLER
// ----------------------------------------------------
window.addEventListener('keydown', (e) => {
  keysPressed[e.key] = true;
  
  if (appState === STATE.playing && activeGame) {
    // Prevent default scroll on arrow keys/space inside canvas
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    activeGame.handleInput(e.key, 'keydown');
  }
});

window.addEventListener('keyup', (e) => {
  keysPressed[e.key] = false;
  if (appState === STATE.playing && activeGame) {
    activeGame.handleInput(e.key, 'keyup');
  }
});

// Unified Mouse and Touch Button Emulation
const vBtns = document.querySelectorAll('.ctrl-btn');
vBtns.forEach(btn => {
  const k = btn.dataset.key;
  if (!k) return;
  
  const triggerStart = (e) => {
    e.preventDefault();
    if (appState === STATE.playing && activeGame) {
      activeGame.handleInput(k, 'keydown');
      keysPressed[k] = true;
    }
  };
  
  const triggerEnd = (e) => {
    e.preventDefault();
    if (appState === STATE.playing && activeGame) {
      activeGame.handleInput(k, 'keyup');
      keysPressed[k] = false;
    }
  };

  btn.addEventListener('touchstart', triggerStart, { passive: false });
  btn.addEventListener('touchend', triggerEnd, { passive: false });
  btn.addEventListener('mousedown', triggerStart);
  btn.addEventListener('mouseup', triggerEnd);
  btn.addEventListener('mouseleave', triggerEnd);
});

// Support canvas click (Memory Tiles & Minesweeper)
DOM.canvas.addEventListener('click', (e) => {
  if (appState === STATE.playing && activeGame && activeGame.handleClick) {
    const rect = DOM.canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * DOM.canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * DOM.canvas.height;
    activeGame.handleClick(x, y);
  }
});

// Support desktop right click context menu (Minesweeper flag)
DOM.canvas.addEventListener('contextmenu', (e) => {
  if (appState === STATE.playing && activeGame && activeGame.handleRightClick) {
    e.preventDefault();
    const rect = DOM.canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * DOM.canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * DOM.canvas.height;
    activeGame.handleRightClick(x, y);
  }
});

DOM.canvas.addEventListener('touchstart', (e) => {
  if (appState === STATE.playing && activeGame && e.touches.length > 0) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = DOM.canvas.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * DOM.canvas.width;
    const y = ((touch.clientY - rect.top) / rect.height) * DOM.canvas.height;
    
    if (activeGame.handleTouchStart) {
      activeGame.handleTouchStart(x, y);
    } else if (activeGame.handleClick) {
      activeGame.handleClick(x, y);
    }
  }
}, { passive: false });

DOM.canvas.addEventListener('touchend', (e) => {
  if (appState === STATE.playing && activeGame && activeGame.handleTouchEnd) {
    e.preventDefault();
    activeGame.handleTouchEnd();
  }
}, { passive: false });


// ----------------------------------------------------
// 9. GAME ENGINE 1: SNAKE PIXEL
// ----------------------------------------------------
class SnakeGame {
  constructor(canvas, diff) {
    this.canvas = canvas;
    this.diff = diff;
    this.gridCount = 20; // 20x20
    this.tileSize = canvas.width / this.gridCount;
    this.snake = [];
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.apple = { x: 0, y: 0 };
    this.powerup = null; // { x, y, type: 'gold'/'heart', timer: ms }
    this.stepTimer = 0;
    this.stepInterval = 100; // ms
  }

  init() {
    this.snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.spawnApple();
    this.powerup = null;
    
    if (this.diff === 'easy') this.stepInterval = 130;
    else if (this.diff === 'normal') this.stepInterval = 95;
    else this.stepInterval = 65;
  }

  spawnApple() {
    let onSnake = true;
    while (onSnake) {
      this.apple.x = Math.floor(Math.random() * this.gridCount);
      this.apple.y = Math.floor(Math.random() * this.gridCount);
      onSnake = this.snake.some(segment => segment.x === this.apple.x && segment.y === this.apple.y);
    }
  }

  spawnPowerup() {
    let onSnake = true;
    let rx = 0, ry = 0;
    while (onSnake) {
      rx = Math.floor(Math.random() * this.gridCount);
      ry = Math.floor(Math.random() * this.gridCount);
      onSnake = this.snake.some(segment => segment.x === rx && segment.y === ry) || 
                (rx === this.apple.x && ry === this.apple.y);
    }
    const type = Math.random() < 0.5 ? 'gold' : 'heart';
    this.powerup = { x: rx, y: ry, type, timer: 6000 };
  }

  handleInput(key) {
    if ((key === 'ArrowUp' || key === 'w' || key === 'W') && this.dir.y === 0) {
      this.nextDir = { x: 0, y: -1 };
    } else if ((key === 'ArrowDown' || key === 's' || key === 'S') && this.dir.y === 0) {
      this.nextDir = { x: 0, y: 1 };
    } else if ((key === 'ArrowLeft' || key === 'a' || key === 'A') && this.dir.x === 0) {
      this.nextDir = { x: -1, y: 0 };
    } else if ((key === 'ArrowRight' || key === 'd' || key === 'D') && this.dir.x === 0) {
      this.nextDir = { x: 1, y: 0 };
    }
  }

  update(dt) {
    this.stepTimer += dt;
    
    // Decrement powerup timer
    if (this.powerup) {
      this.powerup.timer -= dt;
      if (this.powerup.timer <= 0) {
        this.powerup = null;
      }
    }

    if (this.stepTimer >= this.stepInterval) {
      this.stepTimer = 0;
      this.dir = { ...this.nextDir };
      
      const head = { 
        x: this.snake[0].x + this.dir.x, 
        y: this.snake[0].y + this.dir.y 
      };

      // Check boundary collision
      if (head.x < 0 || head.x >= this.gridCount || head.y < 0 || head.y >= this.gridCount) {
        triggerGameOver();
        return;
      }

      // Check self collision
      if (this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        triggerGameOver();
        return;
      }

      this.snake.unshift(head);

      // Check apple consumption
      if (head.x === this.apple.x && head.y === this.apple.y) {
        score += 10;
        sounds.playScore();
        this.spawnApple();
        
        // Speed scaling limit
        this.stepInterval = Math.max(this.diff === 'hard' ? 45 : 60, this.stepInterval - 1.5);
        
        // Chance to spawn special item
        if (Math.random() < 0.25 && !this.powerup) {
          this.spawnPowerup();
        }
      } else if (this.powerup && head.x === this.powerup.x && head.y === this.powerup.y) {
        // Power-up eaten
        if (this.powerup.type === 'gold') {
          score += 40;
          sounds.playWin();
        } else if (this.powerup.type === 'heart') {
          // Slow down speed
          this.stepInterval = Math.min(this.diff === 'easy' ? 150 : 120, this.stepInterval + 15);
          sounds.playScore();
        }
        this.powerup = null;
      } else {
        this.snake.pop();
      }
    }
  }

  draw(ctx) {
    // Draw Apples
    ctx.fillStyle = '#ff0055';
    ctx.fillRect(this.apple.x * this.tileSize + 2, this.apple.y * this.tileSize + 2, this.tileSize - 4, this.tileSize - 4);
    
    // Draw Powerups
    if (this.powerup) {
      ctx.fillStyle = this.powerup.type === 'gold' ? '#ffd700' : '#d846ff';
      ctx.beginPath();
      const cx = this.powerup.x * this.tileSize + this.tileSize / 2;
      const cy = this.powerup.y * this.tileSize + this.tileSize / 2;
      ctx.arc(cx, cy, this.tileSize / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Grid Lines (light faint outline)
    ctx.strokeStyle = '#18122b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= this.gridCount; i++) {
      ctx.beginPath();
      ctx.moveTo(i * this.tileSize, 0);
      ctx.lineTo(i * this.tileSize, this.canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * this.tileSize);
      ctx.lineTo(this.canvas.width, i * this.tileSize);
      ctx.stroke();
    }

    // Draw Snake
    this.snake.forEach((seg, index) => {
      if (index === 0) {
        ctx.fillStyle = '#00ffcc'; // head
      } else {
        ctx.fillStyle = `hsl(140, 100%, ${Math.max(30, 75 - index * 3)}%)`;
      }
      ctx.fillRect(seg.x * this.tileSize + 1, seg.y * this.tileSize + 1, this.tileSize - 2, this.tileSize - 2);
    });
  }

  cleanup() {}
}

// ----------------------------------------------------
// 10. GAME ENGINE 2: BLOCK DROP (TETRIS RETRO STYLE)
// ----------------------------------------------------
class BlockDropGame {
  constructor(canvas, diff) {
    this.canvas = canvas;
    this.diff = diff;
    this.cols = 10;
    this.rows = 20;
    this.blockW = 18;
    this.grid = [];
    this.currentPiece = null;
    this.nextPiece = null;
    
    this.offsetX = (canvas.width - this.cols * this.blockW) / 2;
    this.offsetY = (canvas.height - this.rows * this.blockW) / 2;
    
    this.dropTimer = 0;
    this.dropInterval = 500; // ms
    this.fastDrop = false;

    // Standard shapes
    this.shapes = {
      I: [[1, 1, 1, 1]],
      O: [[2, 2], [2, 2]],
      T: [[0, 3, 0], [3, 3, 3]],
      S: [[0, 4, 4], [4, 4, 0]],
      Z: [[5, 5, 0], [0, 5, 5]],
      J: [[6, 0, 0], [6, 6, 6]],
      L: [[0, 0, 7], [7, 7, 7]]
    };
    this.colors = ['#000000', '#00f0ff', '#ffd700', '#d846ff', '#39ff14', '#ff007f', '#3b82f6', '#ff6c00'];
  }

  init() {
    this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
    
    if (this.diff === 'easy') this.dropInterval = 750;
    else if (this.diff === 'normal') this.dropInterval = 450;
    else this.dropInterval = 250;

    this.currentPiece = this.spawnPiece();
    this.nextPiece = this.spawnPiece();
  }

  spawnPiece() {
    const keys = Object.keys(this.shapes);
    const key = keys[Math.floor(Math.random() * keys.length)];
    const shape = this.shapes[key];
    return {
      shape,
      colorIdx: Object.keys(this.shapes).indexOf(key) + 1,
      x: Math.floor((this.cols - shape[0].length) / 2),
      y: 0
    };
  }

  handleInput(key, type) {
    if (type === 'keydown') {
      if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
        this.move(-1);
      } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
        this.move(1);
      } else if (key === 'ArrowUp' || key === 'w' || key === 'W') {
        this.rotate();
      } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
        this.fastDrop = true;
      }
    } else if (type === 'keyup') {
      if (key === 'ArrowDown' || key === 's' || key === 'S') {
        this.fastDrop = false;
      }
    }
  }

  move(dx) {
    this.currentPiece.x += dx;
    if (this.checkCollision()) {
      this.currentPiece.x -= dx;
    } else {
      sounds.playClick();
    }
  }

  rotate() {
    const p = this.currentPiece;
    const nRows = p.shape.length;
    const nCols = p.shape[0].length;
    
    // Rotate matrix
    const newShape = Array.from({ length: nCols }, () => Array(nRows).fill(0));
    for (let r = 0; r < nRows; r++) {
      for (let c = 0; c < nCols; c++) {
        newShape[c][nRows - 1 - r] = p.shape[r][c];
      }
    }
    
    const prevShape = p.shape;
    p.shape = newShape;
    
    // Wall kick simple check
    if (this.checkCollision()) {
      p.shape = prevShape; // revert
    } else {
      sounds.playClick();
    }
  }

  checkCollision() {
    const p = this.currentPiece;
    for (let r = 0; r < p.shape.length; r++) {
      for (let c = 0; c < p.shape[r].length; c++) {
        if (p.shape[r][c] !== 0) {
          const gx = p.x + c;
          const gy = p.y + r;
          
          if (gx < 0 || gx >= this.cols || gy >= this.rows) {
            return true;
          }
          if (gy >= 0 && this.grid[gy][gx] !== 0) {
            return true;
          }
        }
      }
    }
    return false;
  }

  lockPiece() {
    const p = this.currentPiece;
    for (let r = 0; r < p.shape.length; r++) {
      for (let c = 0; c < p.shape[r].length; c++) {
        if (p.shape[r][c] !== 0) {
          const gy = p.y + r;
          const gx = p.x + c;
          if (gy < 0) {
            triggerGameOver();
            return;
          }
          this.grid[gy][gx] = p.colorIdx;
        }
      }
    }
    sounds.playHit();
    this.clearLines();
    this.currentPiece = this.nextPiece;
    this.nextPiece = this.spawnPiece();
    
    // Check if new piece collides immediately
    if (this.checkCollision()) {
      triggerGameOver();
    }
  }

  clearLines() {
    let cleared = 0;
    for (let r = this.rows - 1; r >= 0; r--) {
      if (this.grid[r].every(val => val !== 0)) {
        this.grid.splice(r, 1);
        this.grid.unshift(Array(this.cols).fill(0));
        cleared++;
        r++; // check same index again since it shifted down
      }
    }
    if (cleared > 0) {
      score += [0, 40, 100, 300, 1200][cleared] || 100;
      sounds.playScore();
    }
  }

  update(dt) {
    this.dropTimer += dt;
    const interval = this.fastDrop ? 40 : this.dropInterval;

    if (this.dropTimer >= interval) {
      this.dropTimer = 0;
      this.currentPiece.y++;
      
      if (this.checkCollision()) {
        this.currentPiece.y--;
        this.lockPiece();
      }
    }
  }

  draw(ctx) {
    // Draw Grid Outer Frame
    ctx.strokeStyle = varColor('--cyan');
    ctx.lineWidth = 3;
    ctx.strokeRect(this.offsetX - 3, this.offsetY - 3, this.cols * this.blockW + 6, this.rows * this.blockW + 6);
    
    // Draw Faint grid slots
    ctx.fillStyle = '#07050d';
    ctx.fillRect(this.offsetX, this.offsetY, this.cols * this.blockW, this.rows * this.blockW);

    // Draw Locked bricks
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const idx = this.grid[r][c];
        if (idx !== 0) {
          ctx.fillStyle = this.colors[idx];
          ctx.fillRect(this.offsetX + c * this.blockW + 1, this.offsetY + r * this.blockW + 1, this.blockW - 2, this.blockW - 2);
        }
      }
    }

    // Draw Active piece
    if (this.currentPiece) {
      const p = this.currentPiece;
      ctx.fillStyle = this.colors[p.colorIdx];
      for (let r = 0; r < p.shape.length; r++) {
        for (let c = 0; c < p.shape[r].length; c++) {
          if (p.shape[r][c] !== 0) {
            ctx.fillRect(this.offsetX + (p.x + c) * this.blockW + 1, this.offsetY + (p.y + r) * this.blockW + 1, this.blockW - 2, this.blockW - 2);
          }
        }
      }
    }

    // Draw Next Piece Indicator in corner
    ctx.fillStyle = '#fff';
    ctx.font = '8px "Press Start 2P"';
    ctx.fillText("NEXT", 15, 30);
    
    if (this.nextPiece) {
      const p = this.nextPiece;
      ctx.fillStyle = this.colors[p.colorIdx];
      for (let r = 0; r < p.shape.length; r++) {
        for (let c = 0; c < p.shape[r].length; c++) {
          if (p.shape[r][c] !== 0) {
            ctx.fillRect(20 + c * 10, 40 + r * 10, 8, 8);
          }
        }
      }
    }
  }

  cleanup() {}
}

// ----------------------------------------------------
// 11. GAME ENGINE 3: PADDLE BOUNCE (BRICK BREAKER)
// ----------------------------------------------------
class PaddleBounceGame {
  constructor(canvas, diff) {
    this.canvas = canvas;
    this.diff = diff;
    
    this.paddle = { x: 0, y: 370, w: 60, h: 10, speed: 7 };
    this.ball = { x: 200, y: 300, vx: 0, vy: 0, size: 8 };
    this.bricks = [];
    this.powerups = []; // { x, y, type, timer }
    this.lives = 3;
    this.scoreMultiplier = 1;
    this.powerupTimers = { expand: 0, big: 0, double: 0 };
    
    this.brickCols = 8;
    this.brickRows = 5;
    this.brickW = 44;
    this.brickH = 12;
    this.brickGap = 4;
    this.offsetX = (canvas.width - (this.brickCols * (this.brickW + this.brickGap) - this.brickGap)) / 2;
    this.offsetY = 40;
  }

  init() {
    this.lives = 3;
    this.paddle.w = 60;
    this.ball.size = 8;
    this.scoreMultiplier = 1;
    this.powerups = [];
    this.powerupTimers = { expand: 0, big: 0, double: 0 };
    this.resetBall();
    this.spawnBricks();
  }

  resetBall() {
    this.ball.x = this.paddle.x + this.paddle.w / 2;
    this.ball.y = this.paddle.y - 12;
    
    let baseSpeed = 4.5;
    if (this.diff === 'easy') baseSpeed = 3.5;
    else if (this.diff === 'hard') baseSpeed = 6.0;

    this.ball.vx = (Math.random() > 0.5 ? 1 : -1) * (baseSpeed * 0.7);
    this.ball.vy = -baseSpeed;
  }

  spawnBricks() {
    this.bricks = [];
    const colors = ['#ff007f', '#ff6c00', '#ffd700', '#39ff14', '#00f0ff'];
    for (let r = 0; r < this.brickRows; r++) {
      for (let c = 0; c < this.brickCols; c++) {
        this.bricks.push({
          x: this.offsetX + c * (this.brickW + this.brickGap),
          y: this.offsetY + r * (this.brickH + this.brickGap),
          w: this.brickW,
          h: this.brickH,
          color: colors[r % colors.length],
          points: (this.brickRows - r) * 10,
          alive: true
        });
      }
    }
  }

  handleInput() {}

  update(dt) {
    // Move Paddle
    if (keysPressed['ArrowLeft'] || keysPressed['a'] || keysPressed['A']) {
      this.paddle.x = Math.max(0, this.paddle.x - this.paddle.speed);
    }
    if (keysPressed['ArrowRight'] || keysPressed['d'] || keysPressed['D']) {
      this.paddle.x = Math.min(this.canvas.width - this.paddle.w, this.paddle.x + this.paddle.speed);
    }

    // Power-up durations countdown
    Object.keys(this.powerupTimers).forEach(k => {
      if (this.powerupTimers[k] > 0) {
        this.powerupTimers[k] -= dt;
        if (this.powerupTimers[k] <= 0) {
          // Revert effects
          if (k === 'expand') this.paddle.w = 60;
          if (k === 'big') this.ball.size = 8;
          if (k === 'double') this.scoreMultiplier = 1;
        }
      }
    });

    // Move Ball
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;

    // Walls Collision
    if (this.ball.x <= 0 || this.ball.x >= this.canvas.width - this.ball.size) {
      this.ball.vx *= -1;
      sounds.playClick();
    }
    if (this.ball.y <= 0) {
      this.ball.vy *= -1;
      sounds.playClick();
    }

    // Drop through bottom
    if (this.ball.y >= this.canvas.height) {
      this.lives--;
      sounds.playHit();
      if (this.lives <= 0) {
        triggerGameOver();
      } else {
        this.resetBall();
      }
      return;
    }

    // Paddle hit
    if (this.ball.vy > 0 && 
        this.ball.x + this.ball.size >= this.paddle.x && 
        this.ball.x <= this.paddle.x + this.paddle.w &&
        this.ball.y + this.ball.size >= this.paddle.y && 
        this.ball.y <= this.paddle.y + this.paddle.h) {
      
      this.ball.vy *= -1;
      // Change bounce angle based on hit position
      const hitSpot = (this.ball.x + this.ball.size / 2) - (this.paddle.x + this.paddle.w / 2);
      const relativeHit = hitSpot / (this.paddle.w / 2);
      this.ball.vx = relativeHit * 4;
      sounds.playClick();
    }

    // Bricks Collisions
    let activeBricks = 0;
    this.bricks.forEach(brick => {
      if (!brick.alive) return;
      activeBricks++;

      if (this.ball.x + this.ball.size >= brick.x &&
          this.ball.x <= brick.x + brick.w &&
          this.ball.y + this.ball.size >= brick.y &&
          this.ball.y <= brick.y + brick.h) {
        
        brick.alive = false;
        this.ball.vy *= -1;
        score += brick.points * this.scoreMultiplier;
        sounds.playScore();

        // Spawn powerup chance (18%)
        if (Math.random() < 0.18) {
          const types = ['expand', 'big', 'double'];
          const type = types[Math.floor(Math.random() * types.length)];
          this.powerups.push({ x: brick.x + brick.w / 2, y: brick.y, type, size: 10 });
        }
      }
    });

    if (activeBricks === 0) {
      sounds.playWin();
      this.spawnBricks();
      this.resetBall();
    }

    // Move powerups
    this.powerups.forEach((pu, i) => {
      pu.y += 2;
      
      // Catch check
      if (pu.y >= this.paddle.y && pu.y <= this.paddle.y + this.paddle.h &&
          pu.x >= this.paddle.x && pu.x <= this.paddle.x + this.paddle.w) {
        
        sounds.playWin();
        if (pu.type === 'expand') {
          this.paddle.w = 90;
          this.powerupTimers.expand = 9000;
        } else if (pu.type === 'big') {
          this.ball.size = 16;
          this.powerupTimers.big = 9000;
        } else if (pu.type === 'double') {
          this.scoreMultiplier = 2;
          this.powerupTimers.double = 9000;
        }
        this.powerups.splice(i, 1);
      } else if (pu.y >= this.canvas.height) {
        this.powerups.splice(i, 1);
      }
    });
  }

  draw(ctx) {
    // Draw Paddle
    ctx.fillStyle = varColor('--cyan');
    ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h);

    // Draw Ball
    ctx.fillStyle = this.powerupTimers.big > 0 ? '#ff007f' : '#ffd700';
    ctx.fillRect(this.ball.x, this.ball.y, this.ball.size, this.ball.size);

    // Draw Bricks
    this.bricks.forEach(b => {
      if (!b.alive) return;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = '#020205';
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    });

    // Draw falling items
    this.powerups.forEach(pu => {
      const colors = { expand: '#00f0ff', big: '#ff007f', double: '#ffd700' };
      ctx.fillStyle = colors[pu.type];
      ctx.fillRect(pu.x - 5, pu.y - 5, 10, 10);
    });

    // Lives bar
    ctx.fillStyle = '#ff3333';
    for (let i = 0; i < this.lives; i++) {
      ctx.fillRect(10 + i * 14, 15, 8, 8);
    }

    // Powerup indicators text
    ctx.font = '8px "Press Start 2P"';
    ctx.fillStyle = '#ff6c00';
    let lineIdx = 0;
    if (this.powerupTimers.expand > 0) {
      ctx.fillText(`WIDE: ${Math.ceil(this.powerupTimers.expand / 1000)}s`, 280, 20 + lineIdx * 10);
      lineIdx++;
    }
    if (this.powerupTimers.big > 0) {
      ctx.fillText(`BIG: ${Math.ceil(this.powerupTimers.big / 1000)}s`, 280, 20 + lineIdx * 10);
      lineIdx++;
    }
    if (this.powerupTimers.double > 0) {
      ctx.fillText(`X2: ${Math.ceil(this.powerupTimers.double / 1000)}s`, 280, 20 + lineIdx * 10);
    }
  }

  cleanup() {}
}

// ----------------------------------------------------
// 12. GAME ENGINE 4: SPACE DEFENDER
// ----------------------------------------------------
class SpaceDefenderGame {
  constructor(canvas, diff) {
    this.canvas = canvas;
    this.diff = diff;
    
    this.ship = { x: 180, y: 360, w: 24, h: 16, speed: 5, health: 3 };
    this.lasers = [];
    this.enemies = [];
    this.stars = [];
    this.shootCooldown = 0;
    this.spawnTimer = 0;
    this.spawnRate = 1800; // ms
  }

  init() {
    this.ship.health = this.diff === 'easy' ? 4 : (this.diff === 'hard' ? 2 : 3);
    this.ship.x = 180;
    this.lasers = [];
    this.enemies = [];
    this.shootCooldown = 0;
    this.spawnTimer = 0;

    if (this.diff === 'easy') this.spawnRate = 2200;
    else if (this.diff === 'hard') this.spawnRate = 1200;
    else this.spawnRate = 1700;

    // Generate Stars background
    this.stars = [];
    for (let i = 0; i < 40; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2,
        speed: 1 + Math.random() * 2
      });
    }
  }

  handleInput(key) {
    if (key === 'ArrowUp' || key === ' ' || key === 'w' || key === 'W') {
      this.fireLaser();
    }
  }

  fireLaser() {
    if (this.shootCooldown <= 0) {
      this.lasers.push({
        x: this.ship.x + this.ship.w / 2 - 2,
        y: this.ship.y,
        w: 4,
        h: 8,
        speed: 7
      });
      sounds.playClick();
      this.shootCooldown = 220; // 220ms cooldown
    }
  }

  update(dt) {
    this.shootCooldown = Math.max(0, this.shootCooldown - dt);
    this.spawnTimer += dt;

    // Background Stars motion
    this.stars.forEach(s => {
      s.y += s.speed;
      if (s.y > this.canvas.height) {
        s.y = 0;
        s.x = Math.random() * this.canvas.width;
      }
    });

    // Ship Horizontal moves
    if (keysPressed['ArrowLeft'] || keysPressed['a'] || keysPressed['A']) {
      this.ship.x = Math.max(10, this.ship.x - this.ship.speed);
    }
    if (keysPressed['ArrowRight'] || keysPressed['d'] || keysPressed['D']) {
      this.ship.x = Math.min(this.canvas.width - this.ship.w - 10, this.ship.x + this.ship.speed);
    }

    // Auto Fire on space hold
    if (keysPressed[' '] || keysPressed['ArrowUp']) {
      this.fireLaser();
    }

    // Spawn Enemy Asteroids / Space Aliens
    if (this.spawnTimer >= this.spawnRate) {
      this.spawnTimer = 0;
      const size = 16 + Math.random() * 20;
      const points = size > 26 ? 15 : 25; // Smaller are faster/harder
      const speed = (1.5 + Math.random() * 1.5) * (this.diff === 'hard' ? 1.3 : (this.diff === 'easy' ? 0.8 : 1.0));
      
      this.enemies.push({
        x: Math.random() * (this.canvas.width - size),
        y: -size,
        w: size,
        h: size,
        speed,
        points,
        type: Math.random() < 0.35 ? 'alien' : 'meteor'
      });
    }

    // Move Lasers
    this.lasers.forEach((laser, idx) => {
      laser.y -= laser.speed;
      if (laser.y < 0) {
        this.lasers.splice(idx, 1);
      }
    });

    // Move Enemies
    this.enemies.forEach((enemy, eIdx) => {
      enemy.y += enemy.speed;

      // Check crash with ship
      if (enemy.x + enemy.w >= this.ship.x &&
          enemy.x <= this.ship.x + this.ship.w &&
          enemy.y + enemy.h >= this.ship.y &&
          enemy.y <= this.ship.y + this.ship.h) {
        
        this.enemies.splice(eIdx, 1);
        this.ship.health--;
        sounds.playHit();
        if (this.ship.health <= 0) {
          triggerGameOver();
        }
        return;
      }

      // Check slide past bottom boundary
      if (enemy.y >= this.canvas.height) {
        this.enemies.splice(eIdx, 1);
        this.ship.health--;
        sounds.playHit();
        if (this.ship.health <= 0) {
          triggerGameOver();
        }
        return;
      }

      // Laser collisions
      this.lasers.forEach((laser, lIdx) => {
        if (laser.x + laser.w >= enemy.x &&
            laser.x <= enemy.x + enemy.w &&
            laser.y + laser.h >= enemy.y &&
            laser.y <= enemy.y + enemy.h) {
          
          sounds.playScore();
          score += enemy.points;
          this.enemies.splice(eIdx, 1);
          this.lasers.splice(lIdx, 1);
        }
      });
    });
  }

  draw(ctx) {
    // Draw Stars
    ctx.fillStyle = '#ffffff';
    this.stars.forEach(s => {
      ctx.fillRect(s.x, s.y, s.size, s.size);
    });

    // Draw Ship (Cool Neon Cyan triangle base with rocket thruster)
    ctx.fillStyle = varColor('--cyan');
    ctx.beginPath();
    ctx.moveTo(this.ship.x + this.ship.w / 2, this.ship.y);
    ctx.lineTo(this.ship.x + this.ship.w, this.ship.y + this.ship.h);
    ctx.lineTo(this.ship.x, this.ship.y + this.ship.h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = varColor('--pink');
    ctx.fillRect(this.ship.x + this.ship.w / 2 - 2, this.ship.y + this.ship.h, 4, 3); // Engine fire

    // Draw Lasers
    ctx.fillStyle = varColor('--pink');
    this.lasers.forEach(l => {
      ctx.fillRect(l.x, l.y, l.w, l.h);
    });

    // Draw Enemies
    this.enemies.forEach(e => {
      if (e.type === 'alien') {
        ctx.fillStyle = varColor('--green');
        // Simple Space Invader-like block drawing
        ctx.fillRect(e.x + e.w * 0.2, e.y, e.w * 0.6, e.h * 0.4);
        ctx.fillRect(e.x, e.y + e.h * 0.4, e.w, e.h * 0.4);
        ctx.fillRect(e.x + e.w * 0.1, e.y + e.h * 0.8, e.w * 0.2, e.h * 0.2);
        ctx.fillRect(e.x + e.w * 0.7, e.y + e.h * 0.8, e.w * 0.2, e.h * 0.2);
      } else {
        ctx.fillStyle = '#6e6785'; // Grey asteroid
        ctx.fillRect(e.x, e.y, e.w, e.h);
        ctx.fillStyle = '#4c465d'; // details
        ctx.fillRect(e.x + 3, e.y + 3, 5, 5);
        ctx.fillRect(e.x + e.w - 8, e.y + e.h - 8, 4, 4);
      }
    });

    // Draw Health indicators (Hearts / small blocks)
    ctx.fillStyle = varColor('--pink');
    for (let i = 0; i < this.ship.health; i++) {
      ctx.fillRect(10 + i * 15, 15, 8, 8);
    }
  }

  cleanup() {}
}

// ----------------------------------------------------
// 13. GAME ENGINE 5: MEMORY TILES (PAIR MATCHING)
// ----------------------------------------------------
class MemoryTilesGame {
  constructor(canvas, diff) {
    this.canvas = canvas;
    this.diff = diff;
    this.tiles = []; // Array of card objects
    this.revealedIndices = [];
    this.isChecking = false;
    this.moves = 0;
    
    this.gridSize = 4; // 4x4
    this.tileSize = 74;
    this.tileGap = 8;
    this.offsetX = (canvas.width - (this.gridSize * (this.tileSize + this.tileGap) - this.tileGap)) / 2;
    this.offsetY = (canvas.height - (this.gridSize * (this.tileSize + this.tileGap) - this.tileGap)) / 2;
  }

  init() {
    this.tiles = [];
    this.revealedIndices = [];
    this.isChecking = false;
    this.moves = 0;

    // 8 Pairs of shapes (numbered 0-7)
    const shapesList = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7];
    
    // Fisher-Yates Shuffle
    for (let i = shapesList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shapesList[i], shapesList[j]] = [shapesList[j], shapesList[i]];
    }

    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const index = r * this.gridSize + c;
        this.tiles.push({
          id: index,
          r, c,
          shapeIdx: shapesList[index],
          state: 'hidden', // 'hidden', 'flipping', 'revealed', 'matched'
          x: this.offsetX + c * (this.tileSize + this.tileGap),
          y: this.offsetY + r * (this.tileSize + this.tileGap),
          size: this.tileSize
        });
      }
    }
  }

  handleInput() {}

  handleClick(mx, my) {
    if (this.isChecking) return;

    const clickedTile = this.tiles.find(t => 
      mx >= t.x && mx <= t.x + t.size &&
      my >= t.y && my <= t.y + t.size
    );

    if (!clickedTile || clickedTile.state !== 'hidden') return;

    sounds.playClick();
    clickedTile.state = 'revealed';
    this.revealedIndices.push(clickedTile.id);

    if (this.revealedIndices.length === 2) {
      this.moves++;
      this.isChecking = true;
      this.checkPair();
    }
  }

  checkPair() {
    const idx1 = this.revealedIndices[0];
    const idx2 = this.revealedIndices[1];
    const t1 = this.tiles[idx1];
    const t2 = this.tiles[idx2];

    if (t1.shapeIdx === t2.shapeIdx) {
      // Match!
      setTimeout(() => {
        t1.state = 'matched';
        t2.state = 'matched';
        this.revealedIndices = [];
        this.isChecking = false;
        
        let reward = 25;
        if (this.diff === 'hard') reward = 40;
        else if (this.diff === 'easy') reward = 15;
        
        score += reward;
        sounds.playScore();

        // Check if game won
        if (this.tiles.every(t => t.state === 'matched')) {
          setTimeout(() => {
            sounds.playWin();
            // Bonus points for fewer moves
            let moveBonus = Math.max(0, (30 - this.moves) * 10);
            score += moveBonus;
            triggerGameOver();
          }, 300);
        }
      }, 500);
    } else {
      // No Match
      setTimeout(() => {
        t1.state = 'hidden';
        t2.state = 'hidden';
        this.revealedIndices = [];
        this.isChecking = false;
        
        // Hard difficulty penalty
        if (this.diff === 'hard') {
          score = Math.max(0, score - 6);
        } else if (this.diff === 'normal') {
          score = Math.max(0, score - 2);
        }
        sounds.playHit();
      }, 800);
    }
  }

  update() {}

  draw(ctx) {
    // Render Tiles
    this.tiles.forEach(t => {
      if (t.state === 'hidden') {
        // Draw hidden blue card back
        ctx.fillStyle = '#18122b';
        ctx.fillRect(t.x, t.y, t.size, t.size);
        ctx.strokeStyle = varColor('--blue');
        ctx.lineWidth = 3;
        ctx.strokeRect(t.x, t.y, t.size, t.size);
        
        // Inner detail
        ctx.fillStyle = '#241b3f';
        ctx.fillRect(t.x + t.size / 2 - 10, t.y + t.size / 2 - 10, 20, 20);
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(t.x + t.size / 2 - 4, t.y + t.size / 2 - 4, 8, 8);
      } else if (t.state === 'revealed' || t.state === 'matched') {
        // Draw card front base
        ctx.fillStyle = t.state === 'matched' ? '#07050d' : '#241b3f';
        ctx.fillRect(t.x, t.y, t.size, t.size);
        ctx.strokeStyle = t.state === 'matched' ? '#39ff14' : '#ff007f';
        ctx.lineWidth = 3;
        ctx.strokeRect(t.x, t.y, t.size, t.size);

        // Draw Icons (Pixel Art styles based on Index)
        this.drawIcon(ctx, t.shapeIdx, t.x + t.size / 2, t.y + t.size / 2);
      }
    });

    // Display Stats
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px "Press Start 2P"';
    ctx.fillText(`MOVES: ${this.moves}`, 15, 25);
  }

  drawIcon(ctx, type, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    
    if (type === 0) {
      // Yellow Twinkle Star
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(-4, -16, 8, 8);
      ctx.fillRect(-16, -4, 32, 8);
      ctx.fillRect(-4, 8, 8, 8);
      ctx.fillRect(-4, -4, 8, 8); // center
    } else if (type === 1) {
      // Red Heart
      ctx.fillStyle = '#ff0055';
      ctx.fillRect(-12, -8, 8, 8);
      ctx.fillRect(4, -8, 8, 8);
      ctx.fillRect(-16, 0, 32, 8);
      ctx.fillRect(-12, 8, 24, 8);
      ctx.fillRect(-4, 16, 8, 8);
    } else if (type === 2) {
      // Silver Sword
      // Blade
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(-3, -16, 6, 20);
      // Hilt guard
      ctx.fillStyle = '#ff6c00';
      ctx.fillRect(-10, 4, 20, 4);
      // Handle
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(-3, 8, 6, 8);
    } else if (type === 3) {
      // Blue Shield
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(-12, -12, 24, 16);
      ctx.fillRect(-8, 4, 16, 8);
      ctx.fillRect(-4, 12, 8, 4);
      // center cross
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(-12, -2, 24, 4);
      ctx.fillRect(-2, -12, 4, 24);
    } else if (type === 4) {
      // Gold Coin
      ctx.fillStyle = '#ff6c00';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff6c00';
      ctx.fillRect(-3, -6, 6, 12);
    } else if (type === 5) {
      // Yellow Lightning
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(8, -4);
      ctx.lineTo(0, -4);
      ctx.lineTo(6, 16);
      ctx.lineTo(-8, 4);
      ctx.lineTo(-2, 4);
      ctx.closePath();
      ctx.fill();
    } else if (type === 6) {
      // Purple Diamond
      ctx.fillStyle = '#d846ff';
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(12, 0);
      ctx.lineTo(0, 15);
      ctx.lineTo(-12, 0);
      ctx.closePath();
      ctx.fill();
      // shine
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3, -4, 4, 4);
    } else if (type === 7) {
      // Green Slime/Monster
      ctx.fillStyle = '#39ff14';
      ctx.fillRect(-12, -8, 24, 16);
      ctx.fillRect(-16, 0, 32, 8);
      // eyes
      ctx.fillStyle = '#000000';
      ctx.fillRect(-8, -4, 4, 4);
      ctx.fillRect(4, -4, 4, 4);
    }
    
    ctx.restore();
  }

  cleanup() {}
}

// ----------------------------------------------------
// 14. GAME ENGINE 6: PIXEL RUNNER
// ----------------------------------------------------
class PixelRunnerGame {
  constructor(canvas, diff) {
    this.canvas = canvas;
    this.diff = diff;
    
    this.groundY = 300;
    this.runner = { x: 50, y: 0, w: 20, h: 28, vy: 0, gravity: 0.6, jumpForce: -11.5, isGrounded: false };
    this.obstacles = [];
    this.obstacleTimer = 0;
    this.obstacleInterval = 1500; // ms
    this.gameSpeed = 4.2;
    this.scoreTimer = 0;
    
    this.cloudTimer = 0;
    this.clouds = [];
    
    // Runner Run Stride Animation frames
    this.strideTimer = 0;
    this.strideFrame = 0;
  }

  init() {
    this.runner.y = this.groundY - this.runner.h;
    this.runner.vy = 0;
    this.runner.isGrounded = true;
    this.obstacles = [];
    this.obstacleTimer = 0;
    this.scoreTimer = 0;
    this.clouds = [];
    this.strideTimer = 0;
    this.strideFrame = 0;

    if (this.diff === 'easy') {
      this.gameSpeed = 3.6;
      this.obstacleInterval = 1800;
    } else if (this.diff === 'hard') {
      this.gameSpeed = 5.2;
      this.obstacleInterval = 1100;
    } else {
      this.gameSpeed = 4.4;
      this.obstacleInterval = 1450;
    }

    // pre-populate clouds
    for (let i = 0; i < 3; i++) {
      this.clouds.push({
        x: Math.random() * this.canvas.width,
        y: 40 + Math.random() * 60,
        w: 40 + Math.random() * 30,
        h: 12,
        speed: 0.4
      });
    }
  }

  handleInput(key, type) {
    if (type === 'keydown') {
      if ((key === 'ArrowUp' || key === 'w' || key === 'W' || key === ' ') && this.runner.isGrounded) {
        this.runner.vy = this.runner.jumpForce;
        this.runner.isGrounded = false;
        sounds.playClick();
      }
    }
  }

  update(dt) {
    this.scoreTimer += dt;
    if (this.scoreTimer >= 100) {
      this.scoreTimer = 0;
      score += 1;
      // Incrementally speed up game speed slightly
      this.gameSpeed += 0.02;
    }

    // Animate runner legs stride
    this.strideTimer += dt;
    if (this.strideTimer >= 100) {
      this.strideTimer = 0;
      this.strideFrame = (this.strideFrame + 1) % 4;
    }

    // Cloud drift
    this.cloudTimer += dt;
    if (this.cloudTimer >= 4000) {
      this.cloudTimer = 0;
      this.clouds.push({
        x: this.canvas.width,
        y: 40 + Math.random() * 60,
        w: 50,
        h: 12,
        speed: 0.3 + Math.random() * 0.2
      });
    }

    this.clouds.forEach((c, idx) => {
      c.x -= c.speed;
      if (c.x + c.w < 0) {
        this.clouds.splice(idx, 1);
      }
    });

    // Physics Update
    this.runner.vy += this.runner.gravity;
    this.runner.y += this.runner.vy;

    if (this.runner.y >= this.groundY - this.runner.h) {
      this.runner.y = this.groundY - this.runner.h;
      this.runner.vy = 0;
      this.runner.isGrounded = true;
    }

    // Spawn Obstacles
    this.obstacleTimer += dt;
    if (this.obstacleTimer >= this.obstacleInterval) {
      this.obstacleTimer = 0;
      
      const r = Math.random();
      let type = 'spike';
      let w = 15 + Math.random() * 10;
      let h = 20 + Math.random() * 12;
      let y = this.groundY - h;

      if (r < 0.3 && this.diff !== 'easy') {
        type = 'bird';
        w = 22;
        h = 10;
        y = this.groundY - 45; // High flyer
      }

      this.obstacles.push({ x: this.canvas.width, y, w, h, type });
      // Randomize interval slightly
      this.obstacleInterval = Math.max(700, (1300 + Math.random() * 600) * (4.2 / this.gameSpeed));
    }

    // Move & Collide Obstacles
    this.obstacles.forEach((ob, idx) => {
      ob.x -= this.gameSpeed;

      if (ob.x + ob.w < 0) {
        this.obstacles.splice(idx, 1);
        return;
      }

      // Rect collision
      if (this.runner.x + this.runner.w >= ob.x &&
          this.runner.x <= ob.x + ob.w &&
          this.runner.y + this.runner.h >= ob.y &&
          this.runner.y <= ob.y + ob.h) {
        
        triggerGameOver();
      }
    });
  }

  draw(ctx) {
    // Draw Clouds
    ctx.fillStyle = '#241b3f';
    this.clouds.forEach(c => {
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.fillRect(c.x + 8, c.y - 4, c.w - 16, 4);
    });

    // Draw Ground
    ctx.fillStyle = varColor('--pink');
    ctx.fillRect(0, this.groundY, this.canvas.width, 4);
    ctx.fillStyle = '#18122b';
    ctx.fillRect(0, this.groundY + 4, this.canvas.width, this.canvas.height - this.groundY - 4);

    // Draw little details on scrolling ground
    ctx.fillStyle = '#241b3f';
    for (let i = 0; i < this.canvas.width; i += 80) {
      const sx = (i - (score * this.gameSpeed) % 80);
      ctx.fillRect(sx, this.groundY + 12, 10, 3);
      ctx.fillRect(sx + 35, this.groundY + 28, 16, 3);
    }

    // Draw Runner (Cool neon green pixel ninja)
    ctx.fillStyle = varColor('--green');
    
    // Runner Body
    ctx.fillRect(this.runner.x + 4, this.runner.y, this.runner.w - 8, this.runner.h - 10);
    // Head
    ctx.fillRect(this.runner.x + 6, this.runner.y - 8, 8, 8);
    // Headband glow tail
    ctx.fillStyle = varColor('--pink');
    ctx.fillRect(this.runner.x + 2, this.runner.y - 6, 4, 3);

    // Running legs animation
    ctx.fillStyle = varColor('--green');
    if (this.runner.isGrounded) {
      if (this.strideFrame === 0) {
        ctx.fillRect(this.runner.x + 4, this.runner.y + this.runner.h - 10, 4, 10); // L Leg down
        ctx.fillRect(this.runner.x + 12, this.runner.y + this.runner.h - 10, 4, 6); // R Leg bent
      } else if (this.strideFrame === 1) {
        ctx.fillRect(this.runner.x + 4, this.runner.y + this.runner.h - 10, 4, 8);
        ctx.fillRect(this.runner.x + 12, this.runner.y + this.runner.h - 10, 4, 8);
      } else if (this.strideFrame === 2) {
        ctx.fillRect(this.runner.x + 4, this.runner.y + this.runner.h - 10, 4, 6);
        ctx.fillRect(this.runner.x + 12, this.runner.y + this.runner.h - 10, 4, 10);
      } else {
        ctx.fillRect(this.runner.x + 4, this.runner.y + this.runner.h - 10, 4, 8);
        ctx.fillRect(this.runner.x + 12, this.runner.y + this.runner.h - 10, 4, 8);
      }
    } else {
      // Jumping pose: legs spread
      ctx.fillRect(this.runner.x + 2, this.runner.y + this.runner.h - 10, 4, 6);
      ctx.fillRect(this.runner.x + 14, this.runner.y + this.runner.h - 10, 4, 6);
    }

    // Draw Obstacles
    this.obstacles.forEach(ob => {
      if (ob.type === 'bird') {
        ctx.fillStyle = varColor('--yellow');
        ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
        // simple wings flap based on score
        const wingPos = Math.floor(score / 5) % 2 === 0 ? -4 : 4;
        ctx.fillRect(ob.x + 6, ob.y + wingPos, 8, 4);
      } else {
        // Red spike spikes
        ctx.fillStyle = varColor('--pink');
        ctx.beginPath();
        ctx.moveTo(ob.x, ob.y + ob.h);
        ctx.lineTo(ob.x + ob.w / 2, ob.y);
        ctx.lineTo(ob.x + ob.w, ob.y + ob.h);
        ctx.closePath();
        ctx.fill();
      }
    });
  }

  cleanup() {}
}

// ----------------------------------------------------
// 15. GAME ENGINE 7: MINESWEEPER RETRO
// ----------------------------------------------------
class MinesweeperGame {
  constructor(canvas, diff) {
    this.canvas = canvas;
    this.diff = diff;
    
    // Choose grid sizing
    if (diff === 'easy') {
      this.rows = 8;
      this.cols = 8;
      this.minesCount = 8;
      this.tileSize = 40;
      this.offsetX = (canvas.width - this.cols * this.tileSize) / 2;
      this.offsetY = (canvas.height - this.rows * this.tileSize) / 2;
    } else if (diff === 'hard') {
      this.rows = 12;
      this.cols = 12;
      this.minesCount = 25;
      this.tileSize = 28;
      this.offsetX = (canvas.width - this.cols * this.tileSize) / 2;
      this.offsetY = (canvas.height - this.rows * this.tileSize) / 2;
    } else { // normal
      this.rows = 10;
      this.cols = 10;
      this.minesCount = 15;
      this.tileSize = 32;
      this.offsetX = (canvas.width - this.cols * this.tileSize) / 2;
      this.offsetY = (canvas.height - this.rows * this.tileSize) / 2;
    }
    
    this.grid = [];
    this.firstClick = true;
    this.gameOver = false;
    this.gameWon = false;
    
    // Mobile Touch Hold details
    this.touchStartTime = 0;
    this.touchTimer = null;
    this.lastTouchR = -1;
    this.lastTouchC = -1;
  }

  init() {
    this.firstClick = true;
    this.gameOver = false;
    this.gameWon = false;
    this.grid = [];
    
    for (let r = 0; r < this.rows; r++) {
      const row = [];
      for (let c = 0; c < this.cols; c++) {
        row.push({
          r, c,
          isMine: false,
          neighborMines: 0,
          state: 'hidden' // 'hidden', 'revealed', 'flagged'
        });
      }
      this.grid.push(row);
    }
  }

  generateMines(firstR, firstC) {
    let minesPlaced = 0;
    while (minesPlaced < this.minesCount) {
      const r = Math.floor(Math.random() * this.rows);
      const c = Math.floor(Math.random() * this.cols);
      
      // Ensure mine is not on the first clicked cell or its immediate neighbors
      const isAdjacent = Math.abs(r - firstR) <= 1 && Math.abs(c - firstC) <= 1;
      if (!this.grid[r][c].isMine && !isAdjacent) {
        this.grid[r][c].isMine = true;
        minesPlaced++;
      }
    }
    
    // Calculate neighbor counts
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.grid[r][c].isMine) {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                if (this.grid[nr][nc].isMine) count++;
              }
            }
          }
          this.grid[r][c].neighborMines = count;
        }
      }
    }
  }

  revealCell(r, c) {
    if (this.gameOver || this.gameWon) return;
    
    const cell = this.grid[r][c];
    if (cell.state !== 'hidden') return;
    
    if (this.firstClick) {
      this.firstClick = false;
      this.generateMines(r, c);
    }
    
    cell.state = 'revealed';
    
    if (cell.isMine) {
      this.gameOver = true;
      sounds.playHit();
      this.revealAll(false);
      setTimeout(() => triggerGameOver(), 1000);
      return;
    }
    
    score += 10;
    sounds.playScore();
    
    // Auto flood fill on 0 neighbor cells
    if (cell.neighborMines === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
            if (this.grid[nr][nc].state === 'hidden') {
              this.revealCell(nr, nc);
            }
          }
        }
      }
    }
    
    this.checkWin();
  }

  flagCell(r, c) {
    if (this.gameOver || this.gameWon) return;
    const cell = this.grid[r][c];
    if (cell.state === 'revealed') return;
    
    sounds.playClick();
    cell.state = cell.state === 'flagged' ? 'hidden' : 'flagged';
  }

  revealAll(win) {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        if (cell.isMine) {
          cell.state = 'revealed';
        }
      }
    }
  }

  checkWin() {
    let unrevealedSafeCells = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        if (!cell.isMine && cell.state !== 'revealed') {
          unrevealedSafeCells++;
        }
      }
    }
    
    if (unrevealedSafeCells === 0) {
      this.gameWon = true;
      sounds.playWin();
      // Win bonus points
      score += 150;
      setTimeout(() => triggerGameOver(), 1000);
    }
  }

  handleClick(mx, my) {
    const c = Math.floor((mx - this.offsetX) / this.tileSize);
    const r = Math.floor((my - this.offsetY) / this.tileSize);
    if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
      this.revealCell(r, c);
    }
  }

  handleRightClick(mx, my) {
    const c = Math.floor((mx - this.offsetX) / this.tileSize);
    const r = Math.floor((my - this.offsetY) / this.tileSize);
    if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
      this.flagCell(r, c);
    }
  }

  handleTouchStart(mx, my) {
    const c = Math.floor((mx - this.offsetX) / this.tileSize);
    const r = Math.floor((my - this.offsetY) / this.tileSize);
    if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
      this.lastTouchR = r;
      this.lastTouchC = c;
      this.touchStartTime = performance.now();
      
      if (this.touchTimer) clearTimeout(this.touchTimer);
      
      this.touchTimer = setTimeout(() => {
        this.flagCell(this.lastTouchR, this.lastTouchC);
        this.touchTimer = null;
      }, 350); // 350ms long press threshold
    }
  }

  handleTouchEnd() {
    if (this.touchTimer) {
      clearTimeout(this.touchTimer);
      this.touchTimer = null;
      // Perform standard reveal
      if (this.lastTouchR !== -1 && this.lastTouchC !== -1) {
        this.revealCell(this.lastTouchR, this.lastTouchC);
      }
    }
    this.lastTouchR = -1;
    this.lastTouchC = -1;
  }

  draw(ctx) {
    // Colors of retro digits
    const digitColors = [
      '',        // 0
      '#00f0ff', // 1: Cyan
      '#39ff14', // 2: Green
      '#ff007f', // 3: Pink
      '#3b82f6', // 4: Blue
      '#ffd700', // 5: Yellow
      '#d846ff', // 6: Purple
      '#ff6c00', // 7: Orange
      '#ff3333'  // 8: Red
    ];

    // Center board outer border
    ctx.strokeStyle = varColor('--cyan');
    ctx.lineWidth = 4;
    ctx.strokeRect(
      this.offsetX - 4, 
      this.offsetY - 4, 
      this.cols * this.tileSize + 8, 
      this.rows * this.tileSize + 8
    );

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        const cx = this.offsetX + c * this.tileSize;
        const cy = this.offsetY + r * this.tileSize;
        const size = this.tileSize;

        if (cell.state === 'hidden') {
          // Draw 3D Hidden Block
          ctx.fillStyle = '#241b3f'; // background
          ctx.fillRect(cx, cy, size, size);

          // Highlight borders (Retro 3D)
          ctx.fillStyle = '#3a2c66'; // top/left
          ctx.fillRect(cx, cy, size, 2);
          ctx.fillRect(cx, cy, 2, size);
          
          ctx.fillStyle = '#100a1d'; // bottom/right
          ctx.fillRect(cx, cy + size - 2, size, 2);
          ctx.fillRect(cx + size - 2, cy, 2, size);
        } else if (cell.state === 'flagged') {
          // Draw Flagged Block (base hidden block + flag icon)
          ctx.fillStyle = '#241b3f';
          ctx.fillRect(cx, cy, size, size);

          ctx.fillStyle = '#3a2c66'; // light border
          ctx.fillRect(cx, cy, size, 2);
          ctx.fillRect(cx, cy, 2, size);
          
          ctx.fillStyle = '#100a1d'; // dark border
          ctx.fillRect(cx, cy + size - 2, size, 2);
          ctx.fillRect(cx + size - 2, cy, 2, size);

          // Flag drawing (pole + red flag)
          ctx.fillStyle = '#ffffff'; // flagpole
          ctx.fillRect(cx + size / 2 - 2, cy + 8, 2, size - 16);
          ctx.fillStyle = '#ff0055'; // flag
          ctx.fillRect(cx + size / 2 - 10, cy + 8, 8, 8);
        } else if (cell.state === 'revealed') {
          // Flat background
          ctx.fillStyle = cell.isMine ? '#ff3333' : '#07050d';
          ctx.fillRect(cx, cy, size, size);
          
          // Border
          ctx.strokeStyle = '#18122b';
          ctx.lineWidth = 1;
          ctx.strokeRect(cx, cy, size, size);

          if (cell.isMine) {
            // Draw Mine spiked ball
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(cx + size / 2, cy + size / 2, size / 4, 0, Math.PI * 2);
            ctx.fill();

            // Spikes lines
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            
            // vertical/horizontal
            ctx.beginPath();
            ctx.moveTo(cx + size / 2, cy + 4);
            ctx.lineTo(cx + size / 2, cy + size - 4);
            ctx.moveTo(cx + 4, cy + size / 2);
            ctx.lineTo(cx + size - 4, cy + size / 2);
            ctx.stroke();

            // White shiny spot
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx + size / 2 - 2, cy + size / 2 - 2, 2, 2);
          } else if (cell.neighborMines > 0) {
            // Draw Digit
            ctx.fillStyle = digitColors[cell.neighborMines];
            ctx.font = `${size / 2.3}px "Press Start 2P"`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(cell.neighborMines, cx + size / 2, cy + size / 2 + 1);
          }
        }
      }
    }

    // Bottom Mine counts indicator
    let totalMines = this.minesCount;
    let flaggedCount = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c].state === 'flagged') flaggedCount++;
      }
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px "Press Start 2P"';
    ctx.textAlign = 'left';
    ctx.fillText(`MINES: ${totalMines - flaggedCount}`, this.offsetX, this.offsetY + this.rows * this.tileSize + 22);
  }

  cleanup() {
    if (this.touchTimer) {
      clearTimeout(this.touchTimer);
      this.touchTimer = null;
    }
  }
}

// ----------------------------------------------------
// 16. HELPER UTILS
// ----------------------------------------------------
function varColor(cssVar) {
  // Returns color hex matching CSS variables
  const mapping = {
    '--cyan': '#00f0ff',
    '--pink': '#ff007f',
    '--yellow': '#ffd700',
    '--orange': '#ff6c00',
    '--green': '#39ff14',
    '--blue': '#3b82f6'
  };
  return mapping[cssVar] || '#ffffff';
}
