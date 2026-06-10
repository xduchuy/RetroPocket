
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

const gamesList = ['snake', 'blocks', 'paddle', 'defender', 'memory', 'runner', 'minesweeper', 'flappy', 'frog', 'racer', 'gobbler', 'stacker'];

const DOM = {
  menuScreen: document.getElementById('menuScreen'),
  gameScreen: document.getElementById('gameScreen'),
  canvas: document.getElementById('gameCanvas'),
  ctx: document.getElementById('gameCanvas').getContext('2d'),
  
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
  langToggle: document.getElementById('langToggle'),
  helpInfoBtn: document.getElementById('helpInfoBtn'),
  helpGameBtn: document.getElementById('helpGameBtn'),
  helpModal: document.getElementById('helpModal'),
  closeHelpBtn: document.getElementById('closeHelpBtn'),
  goRestartBtn: document.getElementById('goRestartBtn'),
  goQuitBtn: document.getElementById('goQuitBtn'),
  consoleSelectBtn: document.getElementById('consoleSelectBtn'),
  consoleStartBtn: document.getElementById('consoleStartBtn'),
};

// ----------------------------------------------------
// 2.5 LANGUAGE LOCALIZATION SYSTEM
// ----------------------------------------------------
let locale = localStorage.getItem('arcade_lang') || 'en';

const TRANSLATIONS = {
  en: {
    sound_on: 'SOUND ON',
    sound_off: 'SOUND OFF',
    leaderboard: 'LEADERBOARD',
    random: 'RANDOM',
    welcome: 'INSERT COIN TO SELECT GAME',
    play_now: 'PLAY NOW',
    exit_game: '◀ MENU',
    pause_game: '⏸ PAUSE',
    score: 'SCORE:',
    hi_score: 'HI-SCORE:',
    get_ready: 'GET READY',
    start: 'START',
    reset_all: 'RESET ALL',
    close: 'CLOSE',
    confirm_reset: 'RESET ALL HIGH SCORES TO ZERO? Are you sure?',
    game_paused: 'GAME PAUSED',
    continue: 'CONTINUE',
    restart: 'RESTART',
    quit: 'BACK TO ARCADE',
    game_over: 'GAME OVER',
    final_score: 'SCORE:',
    final_hi_score: 'HI-SCORE:',
    new_hi_score: 'NEW HIGH SCORE!',
    play_again: 'PLAY AGAIN',
    back_to_arcade: 'BACK TO ARCADE',
    
    lbl_rotate: 'ROTATE',
    lbl_drop: 'DROP',
    lbl_fire: 'FIRE',
    lbl_jump: 'JUMP',
    lbl_flap: 'FLAP',
    lbl_stack: 'STACK',
    
    desc_snake: 'Eat neon apples, avoid your tail, and watch out for golden power-ups!',
    desc_blocks: 'Align falling neon blocks, clear rows, and clear high score milestones.',
    desc_paddle: 'Bounce the energy ball to break pixel brick rows. Snatch power-ups!',
    desc_defender: 'Shoot descending space debris, dodge asteroids, and upgrade lasers.',
    desc_memory: 'Flip retro cards to match sets of pixel swords, shields, coins, and shields.',
    desc_runner: 'Leap over spike pits and dodge high obstacles. Keep running!',
    desc_minesweeper: 'Uncover safe grids, scan neighbors, and flag hidden spikes!',
    desc_flappy: 'Flap through barriers and pipes. Gauge your speed and stay aloft!',
    desc_frog: 'Hop across busy lanes and floating logs to reach safety. Time your moves!',
    desc_racer: 'Dodge traffic, change lanes, and speed down a neon-lit highway!',
    desc_gobbler: 'Munch all neon dots in the maze and escape the chasing red ghost!',
    desc_stacker: 'Align moving blocks carefully to build the tallest tower possible!',
    
    instruct_snake: 'Navigate the grid. Eat green/gold apples. Do not crash!',
    instruct_blocks: 'Move blocks. Rotate to align rows and clear lines.',
    instruct_paddle: 'Bounce the square ball. Smash bricks. Grab glowing items.',
    instruct_defender: 'Defend the grid from asteroids and space alien invasions.',
    instruct_memory: 'Tap tiles. Pair identical icons. Avoid mistakes.',
    instruct_runner: 'Jump over red spikes and birds. Gain speed.',
    instruct_minesweeper: 'Tap to dig. Hold (>350ms) to flag. Safe first click!',
    instruct_flappy: 'Press FLAP or Spacebar/Tap Screen to fly. Fly through the neon pipes!',
    instruct_frog: 'Hop across highway lanes and logs to reach the neon bays. Avoid cars and water!',
    instruct_racer: 'Dodge oncoming neon cars! Move left/right to change lanes.',
    instruct_gobbler: 'Eat all neon dots. Avoid the red chasing ghost!',
    instruct_stacker: 'Press STACK or Spacebar to place the moving row. Align them perfectly!',
    
    title_snake: 'SNAKE PIXEL',
    title_blocks: 'BLOCK DROP',
    title_paddle: 'PADDLE BOUNCE',
    title_defender: 'SPACE DEFENDER',
    title_memory: 'MEMORY TILES',
    title_runner: 'PIXEL RUNNER',
    title_minesweeper: 'MINESWEEPER RETRO',
    title_flappy: 'FLAPPY PIXEL',
    title_frog: 'PIXEL HOP',
    title_racer: 'PIXEL RACER',
    title_gobbler: 'PIXEL GOBBLER',
    title_stacker: 'PIXEL STACKER',
    help_btn: '❓ HELP',
    help_title: '❓ HOW TO PLAY ❓',
    help_ctrl_desktop: 'DESKTOP CONTROLS:',
    help_ctrl_desktop_1: 'Arrow Keys / WASD: Move / Rotate / Change Lanes',
    help_ctrl_desktop_2: 'Spacebar: Shoot / Jump / Flap / Stack',
    help_ctrl_desktop_3: 'Mouse: Tap on canvas for Memory Tiles & Minesweeper',
    help_ctrl_mobile: 'MOBILE CONTROLS:',
    help_ctrl_mobile_1: 'Virtual D-Pad & Action Buttons: Slide or tap to steer',
    help_ctrl_mobile_2: 'Canvas Touch: Tap to play Memory/Minesweeper',
    help_ctrl_mobile_3: 'Minesweeper flag: Press and hold (>350ms) to flag',
    help_settings: 'SETTINGS:',
    help_settings_1: '🌐 Language: Toggle EN/VI',
    help_settings_2: '🔊 Sound: Toggle synth SFX',
    help_settings_3: '⚙️ Difficulty: Selected before entering each game'
  },
  vi: {
    sound_on: 'BẬT ÂM',
    sound_off: 'TẤT ÂM',
    leaderboard: 'BXH',
    random: 'NGẪU NHIÊN',
    welcome: 'BỎ XU ĐỂ CHỌN GAME',
    play_now: 'CHƠI NGAY',
    exit_game: '◀ MENU',
    pause_game: 'TẠM DỪNG',
    score: 'ĐIỂM SỐ:',
    hi_score: 'KỶ LỤC:',
    get_ready: 'CHUẨN BỊ',
    start: 'BẮT ĐẦU',
    reset_all: 'ĐẶT LẠI',
    close: 'ĐÓNG',
    confirm_reset: 'ĐẶT LẠI TẤT CẢ ĐIỂM CAO VỀ KHÔNG? Bạn có chắc chắn không?',
    game_paused: 'GAME TẠM DỪNG',
    continue: 'TIẾP TỤC',
    restart: 'CHƠI LẠI',
    quit: 'THOÁT GAME',
    game_over: 'KẾT THÚC',
    final_score: 'ĐIỂM SỐ:',
    final_hi_score: 'KỶ LỤC:',
    new_hi_score: 'KỶ LỤC MỚI!',
    play_again: 'CHƠI LẠI',
    back_to_arcade: 'THOÁT GAME',
    
    lbl_rotate: 'XOAY',
    lbl_drop: 'THẢ',
    lbl_fire: 'BẮN',
    lbl_jump: 'NHẢY',
    lbl_flap: 'BAY',
    lbl_stack: 'XẾP',
    
    desc_snake: 'Ăn táo neon, né đuôi rắn, săn vật phẩm vàng!',
    desc_blocks: 'Sắp xếp khối gạch rơi, xóa hàng ngang và đạt điểm cao.',
    desc_paddle: 'Đỡ bóng phá gạch pixel, nhặt vật phẩm tăng sức mạnh!',
    desc_defender: 'Bắn thiên thạch và tàu ngoài hành tinh rơi xuống!',
    desc_memory: 'Lật thẻ tìm cặp hình pixel giống nhau.',
    desc_runner: 'Nhảy qua hố gai và chướng ngại vật bay. Chạy không ngừng!',
    desc_minesweeper: 'Mở ô trống an toàn, quét bom lân cận và cắm cờ quả mìn!',
    desc_flappy: 'Bay qua các cột ống khói neon và giữ thăng bằng!',
    desc_frog: 'Vượt đường lộ và sông sâu để về tổ an toàn!',
    desc_racer: 'Lách xe qua dòng phương tiện đông đúc trên cao tốc!',
    desc_gobbler: 'Ăn hết chấm vàng trong mê cung và chạy trốn bóng ma!',
    desc_stacker: 'Xếp chồng các khối gạch di động thẳng hàng để xây tháp!',
    
    instruct_snake: 'Di chuyển trong lưới. Ăn táo xanh/vàng. Đừng đâm vào đuôi!',
    instruct_blocks: 'Di chuyển khối gạch. Xoay khối để xếp kín và xóa hàng.',
    instruct_paddle: 'Đỡ bóng năng lượng phá gạch. Nhặt vật phẩm phát sáng.',
    instruct_defender: 'Bảo vệ căn cứ chống thiên thạch và người ngoài hành tinh.',
    instruct_memory: 'Chạm các ô. Tìm các cặp biểu tượng giống nhau. Đừng chọn sai nhiều!',
    instruct_runner: 'Nhảy tránh chông đỏ và quạ bay. Tăng dần tốc độ.',
    instruct_minesweeper: 'Nhấn để đào ô. Đè (>350ms) để cắm cờ. Nhấp đầu tiên luôn an toàn!',
    instruct_flappy: 'Nhấn BAY hoặc phím Cách/Chạm màn hình để cất cánh qua các đường ống!',
    instruct_frog: 'Nhảy qua làn xe và thân gỗ trên sông để về tổ an toàn!',
    instruct_racer: 'Tránh các ô tô neon ngược chiều! Nhấn trái/phải để chuyển làn.',
    instruct_gobbler: 'Ăn tất cả các chấm neon. Né tránh con ma đỏ đuổi theo!',
    instruct_stacker: 'Nhấn XẾP hoặc phím Cách để đặt hàng gạch. Căn chỉnh thật chuẩn!',
    
    title_snake: 'RẮN SĂN MỒI',
    title_blocks: 'XẾP GẠCH',
    title_paddle: 'PHÁ GẠCH',
    title_defender: 'BẮN THIÊN THẠCH',
    title_memory: 'LẬT THẺ',
    title_runner: 'CHẠY NEON',
    title_minesweeper: 'DÒ MÌN',
    title_flappy: 'FLAPPY PIXEL',
    title_frog: 'ẾCH BĂNG SÔNG',
    title_racer: 'ĐUA XE NEON',
    title_gobbler: 'ĂN CHẤM VÀNG',
    title_stacker: 'XẾP THÁP',
    help_btn: '❓ TRỢ GIÚP',
    help_title: '❓ HƯỚNG DẪN CHƠI ❓',
    help_ctrl_desktop: 'ĐIỀU KHIỂN TRÊN MÁY TÍNH:',
    help_ctrl_desktop_1: 'Phím mũi tên / WASD: Di chuyển / Xoay / Chuyển làn',
    help_ctrl_desktop_2: 'Phím Cách (Space): Bắn / Nhảy / Bay / Xếp tháp',
    help_ctrl_desktop_3: 'Chuột: Nhấp trên màn hình cho Lật thẻ & Dò mìn',
    help_ctrl_mobile: 'ĐIỀU KHIỂN TRÊN ĐIỆN THOẠI:',
    help_ctrl_mobile_1: 'D-Pad ảo & Nút hành động: Vuốt hoặc chạm để lái',
    help_ctrl_mobile_2: 'Cảm ứng: Chạm màn hình để chơi Lật thẻ / Dò mìn',
    help_ctrl_mobile_3: 'Cắm cờ Dò mìn: Nhấn và giữ (>350ms)',
    help_settings: 'CÀI ĐẶT:',
    help_settings_1: '🌐 Ngôn ngữ: Nhấn để đổi Anh/Việt',
    help_settings_2: '🔊 Âm thanh: Bật/Tắt hiệu ứng 8-bit',
    help_settings_3: '⚙️ Độ khó: Chọn khi bắt đầu mỗi trò chơi'
  }
};

function getTranslation(key) {
  return TRANSLATIONS[locale][key] || TRANSLATIONS['en'][key] || key;
}

function updateModalTitle(modal, text) {
  const title = modal.querySelector('.modal-title');
  if (title) {
    title.textContent = text;
    title.setAttribute('data-text', text);
  }
}

function applyLanguage() {
  DOM.langToggle.querySelector('.btn-text').textContent = `🌐 ${locale.toUpperCase()}`;
  DOM.hofButton.querySelector('.btn-text').textContent = getTranslation('leaderboard');
  DOM.randomGameBtn.querySelector('.btn-text').textContent = getTranslation('random');
  DOM.soundToggle.querySelector('.btn-text').textContent = `${sounds.enabled ? '🔊' : '🔇'} ${getTranslation(sounds.enabled ? 'sound_on' : 'sound_off')}`;
  document.getElementById('welcomeText').textContent = getTranslation('welcome');
  
  document.querySelectorAll('.game-card').forEach(card => {
    const key = card.dataset.game;
    card.querySelector('.game-desc').textContent = getTranslation(`desc_${key}`);
    card.querySelector('.play-btn .btn-text').textContent = getTranslation('play_now');
  });
  
  document.getElementById('hudScoreLabel').textContent = getTranslation('score');
  document.getElementById('hudHighScoreLabel').textContent = getTranslation('hi_score');
  DOM.exitGameBtn.querySelector('.btn-text').textContent = getTranslation('exit_game');
  DOM.pauseGameBtn.querySelector('.btn-text').textContent = getTranslation('pause_game');
  
  updateModalTitle(DOM.hofModal, getTranslation('leaderboard'));
  DOM.resetScoresBtn.querySelector('.btn-text').textContent = getTranslation('reset_all');
  DOM.closeHofBtn.querySelector('.btn-text').textContent = getTranslation('close');
  
  updateModalTitle(DOM.pauseModal, getTranslation('game_paused'));
  DOM.resumeBtn.querySelector('.btn-text').textContent = getTranslation('continue');
  DOM.restartBtn.querySelector('.btn-text').textContent = getTranslation('restart');
  DOM.quitBtn.querySelector('.btn-text').textContent = getTranslation('quit');
  
  updateModalTitle(DOM.gameOverModal, getTranslation('game_over'));
  document.getElementById('labelFinalScore').textContent = getTranslation('final_score');
  document.getElementById('labelFinalHighScore').textContent = getTranslation('final_hi_score');
  DOM.newHighScoreAlert.textContent = getTranslation('new_hi_score');
  DOM.goRestartBtn.querySelector('.btn-text').textContent = getTranslation('play_again');
  DOM.goQuitBtn.querySelector('.btn-text').textContent = getTranslation('back_to_arcade');
  
  DOM.instructionsOverlay.querySelector('.instruct-title').textContent = getTranslation('get_ready');
  DOM.startGameBtn.querySelector('.btn-text').textContent = getTranslation('start');
  
  DOM.helpInfoBtn.querySelector('.btn-text').textContent = getTranslation('help_btn');
  updateModalTitle(DOM.helpModal, getTranslation('help_title'));
  document.getElementById('helpContent1').textContent = getTranslation('help_ctrl_desktop');
  document.getElementById('helpItem1').textContent = getTranslation('help_ctrl_desktop_1');
  document.getElementById('helpItem2').textContent = getTranslation('help_ctrl_desktop_2');
  document.getElementById('helpItem3').textContent = getTranslation('help_ctrl_desktop_3');
  document.getElementById('helpContent2').textContent = getTranslation('help_ctrl_mobile');
  document.getElementById('helpItem4').textContent = getTranslation('help_ctrl_mobile_1');
  document.getElementById('helpItem5').textContent = getTranslation('help_ctrl_mobile_2');
  document.getElementById('helpItem6').textContent = getTranslation('help_ctrl_mobile_3');
  document.getElementById('helpContent3').textContent = getTranslation('help_settings');
  document.getElementById('helpItem7').textContent = getTranslation('help_settings_1');
  document.getElementById('helpItem8').textContent = getTranslation('help_settings_2');
  document.getElementById('helpItem9').textContent = getTranslation('help_settings_3');
  DOM.closeHelpBtn.querySelector('.btn-text').textContent = getTranslation('close');
  
  if (activeGameKey) {
    DOM.instructionText.textContent = getTranslation(`instruct_${activeGameKey}`);
    DOM.activeGameTitle.textContent = getTranslation(`title_${activeGameKey}`);
  }
}

// Call on startup once the DOM binds are set
setTimeout(applyLanguage, 0);

let activeGameKey = null;
let activeGame = null;
let appState = STATE.menu;
let score = 0;
let difficulty = 'normal';
let rafId = null;
let isPaused = false;
let isHelpOverlay = false;

// Key states tracking
const keysPressed = {};
let activeTouchKeys = new Set();

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
// 3. SOUND AND LANGUAGE CONTROLS
// ----------------------------------------------------
DOM.soundToggle.addEventListener('click', () => {
  sounds.enabled = !sounds.enabled;
  sounds.playClick();
  DOM.soundToggle.innerHTML = `<span class="btn-text">${sounds.enabled ? '🔊' : '🔇'} ${getTranslation(sounds.enabled ? 'sound_on' : 'sound_off')}</span>`;
  if (!sounds.enabled) {
    DOM.soundToggle.classList.add('danger-btn');
  } else {
    DOM.soundToggle.classList.remove('danger-btn');
  }
});

DOM.langToggle.addEventListener('click', () => {
  locale = locale === 'en' ? 'vi' : 'en';
  sounds.playClick();
  localStorage.setItem('arcade_lang', locale);
  applyLanguage();
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
  document.getElementById('scoreFlappy').textContent = getHighScore('flappy');
  document.getElementById('scoreFrog').textContent = getHighScore('frog');
  document.getElementById('scoreRacer').textContent = getHighScore('racer');
  document.getElementById('scoreGobbler').textContent = getHighScore('gobbler');
  document.getElementById('scoreStacker').textContent = getHighScore('stacker');
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

DOM.helpInfoBtn.addEventListener('click', () => {
  sounds.playClick();
  DOM.helpModal.classList.add('active');
});

DOM.closeHelpBtn.addEventListener('click', () => {
  sounds.playClick();
  DOM.helpModal.classList.remove('active');
});

DOM.resetScoresBtn.addEventListener('click', () => {
  sounds.playClick();
  if (confirm(getTranslation('confirm_reset'))) {
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

// Bind click event listeners to the pre-game difficulty buttons
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    sounds.playClick();
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    difficulty = btn.dataset.diff;
  });
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
  document.body.classList.add('playing-mode');
  
  DOM.activeGameTitle.textContent = getTranslation(`title_${gameKey}`);
  
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
    DOM.instructionText.textContent = getTranslation('instruct_snake');
  } else if (gameKey === 'blocks') {
    DOM.ctrlLeftRightAction.classList.remove('hidden');
    document.getElementById('btnActionA').textContent = getTranslation('lbl_rotate');
    document.getElementById('btnActionB').textContent = getTranslation('lbl_drop');
    DOM.instructionText.textContent = getTranslation('instruct_blocks');
  } else if (gameKey === 'paddle') {
    DOM.ctrlLeftRightAction.classList.remove('hidden');
    document.getElementById('btnActionA').textContent = '---';
    document.getElementById('btnActionB').textContent = '---';
    DOM.instructionText.textContent = getTranslation('instruct_paddle');
  } else if (gameKey === 'defender') {
    DOM.ctrlLeftRightAction.classList.remove('hidden');
    document.getElementById('btnActionA').textContent = getTranslation('lbl_fire');
    document.getElementById('btnActionB').textContent = '---';
    DOM.instructionText.textContent = getTranslation('instruct_defender');
  } else if (gameKey === 'memory') {
    DOM.instructionText.textContent = getTranslation('instruct_memory');
  } else if (gameKey === 'runner') {
    DOM.ctrlJumpOnly.classList.remove('hidden');
    document.getElementById('btnJumpAction').textContent = getTranslation('lbl_jump');
    DOM.instructionText.textContent = getTranslation('instruct_runner');
  } else if (gameKey === 'minesweeper') {
    DOM.instructionText.textContent = getTranslation('instruct_minesweeper');
  } else if (gameKey === 'flappy') {
    DOM.ctrlJumpOnly.classList.remove('hidden');
    document.getElementById('btnJumpAction').textContent = getTranslation('lbl_flap');
    DOM.instructionText.textContent = getTranslation('instruct_flappy');
  } else if (gameKey === 'frog') {
    DOM.ctrlDpad.classList.remove('hidden');
    DOM.instructionText.textContent = getTranslation('instruct_frog');
  } else if (gameKey === 'racer') {
    DOM.ctrlLeftRightAction.classList.remove('hidden');
    document.getElementById('btnActionA').textContent = '---';
    document.getElementById('btnActionB').textContent = '---';
    DOM.instructionText.textContent = getTranslation('instruct_racer');
  } else if (gameKey === 'gobbler') {
    DOM.ctrlDpad.classList.remove('hidden');
    DOM.instructionText.textContent = getTranslation('instruct_gobbler');
  } else if (gameKey === 'stacker') {
    DOM.ctrlJumpOnly.classList.remove('hidden');
    document.getElementById('btnJumpAction').textContent = getTranslation('lbl_stack');
    DOM.instructionText.textContent = getTranslation('instruct_stacker');
  }
  
  // Sync difficulty button highlights with the current global difficulty
  document.querySelectorAll('.diff-btn').forEach(btn => {
    if (btn.dataset.diff === difficulty) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  DOM.instructionsOverlay.classList.remove('hidden');
}

DOM.startGameBtn.addEventListener('click', () => {
  sounds.playClick();
  DOM.instructionsOverlay.classList.add('hidden');
  if (isHelpOverlay) {
    isHelpOverlay = false;
    appState = STATE.playing;
    isPaused = false;
    if (activeGame && activeGame.resume) activeGame.resume();
    lastTime = performance.now();
    startGameLoop();
  } else {
    initActiveGame();
  }
});

// Setup game instance
function initActiveGame() {
  if (activeGame) {
    activeGame.cleanup();
  }
  
  // Clear key states
  for (const k in keysPressed) {
    keysPressed[k] = false;
  }
  activeTouchKeys.clear();
  appState = STATE.playing;
  
  if (activeGameKey === 'snake') activeGame = new SnakeGame(DOM.canvas, difficulty);
  else if (activeGameKey === 'blocks') activeGame = new BlockDropGame(DOM.canvas, difficulty);
  else if (activeGameKey === 'paddle') activeGame = new PaddleBounceGame(DOM.canvas, difficulty);
  else if (activeGameKey === 'defender') activeGame = new SpaceDefenderGame(DOM.canvas, difficulty);
  else if (activeGameKey === 'memory') activeGame = new MemoryTilesGame(DOM.canvas, difficulty);
  else if (activeGameKey === 'runner') activeGame = new PixelRunnerGame(DOM.canvas, difficulty);
  else if (activeGameKey === 'minesweeper') activeGame = new MinesweeperGame(DOM.canvas, difficulty);
  else if (activeGameKey === 'flappy') activeGame = new FlappyPixelGame(DOM.canvas, difficulty);
  else if (activeGameKey === 'frog') activeGame = new PixelHopGame(DOM.canvas, difficulty);
  else if (activeGameKey === 'racer') activeGame = new PixelRacerGame(DOM.canvas, difficulty);
  else if (activeGameKey === 'gobbler') activeGame = new PixelGobblerGame(DOM.canvas, difficulty);
  else if (activeGameKey === 'stacker') activeGame = new PixelStackerGame(DOM.canvas, difficulty);

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

// Game Boy Console System Buttons
DOM.consoleSelectBtn.addEventListener('click', () => {
  sounds.playClick();
  terminateActiveGame();
  DOM.gameScreen.classList.remove('active');
  DOM.menuScreen.classList.add('active');
  appState = STATE.menu;
});

DOM.consoleStartBtn.addEventListener('click', () => {
  sounds.playClick();
  pauseGame();
});

DOM.helpGameBtn.addEventListener('click', () => {
  if (appState !== STATE.playing || !activeGame) return;
  sounds.playClick();
  isPaused = true;
  appState = STATE.paused;
  if (activeGame && activeGame.pause) activeGame.pause();
  
  DOM.instructionsOverlay.classList.remove('hidden');
  isHelpOverlay = true;
  
  DOM.startGameBtn.querySelector('.btn-text').textContent = getTranslation('continue');
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
  // Clear key states
  for (const k in keysPressed) {
    keysPressed[k] = false;
  }
  activeTouchKeys.clear();
  document.body.classList.remove('playing-mode');
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

const handleControllerTouch = (e) => {
  e.preventDefault(); // Prevent double tap zoom / scrolling
  
  if (appState !== STATE.playing || !activeGame) return;
  
  const currentTouchKeys = new Set();
  
  // Find which keys are currently touched
  for (let i = 0; i < e.touches.length; i++) {
    const touch = e.touches[i];
    let target = document.elementFromPoint(touch.clientX, touch.clientY);
    while (target && !target.dataset.key && target !== document.body) {
      target = target.parentElement;
    }
    if (target && target.dataset.key) {
      currentTouchKeys.add(target.dataset.key);
    }
  }
  
  // Trigger keyup for keys that are no longer touched
  activeTouchKeys.forEach(k => {
    if (!currentTouchKeys.has(k)) {
      activeGame.handleInput(k, 'keyup');
      keysPressed[k] = false;
    }
  });
  
  // Trigger keydown for newly touched keys
  currentTouchKeys.forEach(k => {
    if (!activeTouchKeys.has(k)) {
      activeGame.handleInput(k, 'keydown');
      keysPressed[k] = true;
    }
  });
  
  activeTouchKeys = currentTouchKeys;
};

// Bind touch events to the container (allows sliding across D-pad & movement keys)
DOM.mobileController.addEventListener('touchstart', handleControllerTouch, { passive: false });
DOM.mobileController.addEventListener('touchmove', handleControllerTouch, { passive: false });
DOM.mobileController.addEventListener('touchend', handleControllerTouch, { passive: false });
DOM.mobileController.addEventListener('touchcancel', handleControllerTouch, { passive: false });

// Keep mouse events for desktop users
const vBtns = document.querySelectorAll('.ctrl-btn');
vBtns.forEach(btn => {
  const k = btn.dataset.key;
  if (!k) return;
  
  const triggerStart = (e) => {
    if (e.cancelable) e.preventDefault();
    if (appState === STATE.playing && activeGame) {
      activeGame.handleInput(k, 'keydown');
      keysPressed[k] = true;
    }
  };
  
  const triggerEnd = (e) => {
    if (e.cancelable) e.preventDefault();
    if (appState === STATE.playing && activeGame) {
      activeGame.handleInput(k, 'keyup');
      keysPressed[k] = false;
    }
  };

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

DOM.canvas.addEventListener('touchcancel', (e) => {
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

  handleInput(key, type) {
    if (type !== 'keydown') return;
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
      
      // Wrap coordinates around screen boundaries (allow walking through walls)
      const head = { 
        x: (this.snake[0].x + this.dir.x + this.gridCount) % this.gridCount, 
        y: (this.snake[0].y + this.dir.y + this.gridCount) % this.gridCount 
      };

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
    const prevX = p.x;
    p.shape = newShape;
    
    // Simple wall kick offsets to try: [0, -1, 1, -2, 2]
    const kicks = [0, -1, 1, -2, 2];
    let success = false;
    for (let i = 0; i < kicks.length; i++) {
      p.x = prevX + kicks[i];
      if (!this.checkCollision()) {
        success = true;
        break;
      }
    }
    
    if (!success) {
      p.shape = prevShape; // revert shape
      p.x = prevX;         // revert position
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

    // Move powerups (using reverse loop to prevent splice index-shifting)
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const pu = this.powerups[i];
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
    }
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

  handleInput(key, type) {
    if (type === 'keydown' && (key === 'ArrowUp' || key === ' ' || key === 'w' || key === 'W')) {
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

    // Move Lasers (using reverse loop to prevent splice index-shifting)
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      this.lasers[i].y -= this.lasers[i].speed;
      if (this.lasers[i].y < 0) {
        this.lasers.splice(i, 1);
      }
    }

    // Move Enemies (using reverse loops to prevent splice index-shifting)
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.y += enemy.speed;

      // Check crash with ship
      if (enemy.x + enemy.w >= this.ship.x &&
          enemy.x <= this.ship.x + this.ship.w &&
          enemy.y + enemy.h >= this.ship.y &&
          enemy.y <= this.ship.y + this.ship.h) {
        
        this.enemies.splice(i, 1);
        this.ship.health--;
        sounds.playHit();
        if (this.ship.health <= 0) {
          triggerGameOver();
        }
        continue;
      }

      // Check slide past bottom boundary
      if (enemy.y >= this.canvas.height) {
        this.enemies.splice(i, 1);
        this.ship.health--;
        sounds.playHit();
        if (this.ship.health <= 0) {
          triggerGameOver();
        }
        continue;
      }

      // Laser collisions
      let enemyDestroyed = false;
      for (let j = this.lasers.length - 1; j >= 0; j--) {
        const laser = this.lasers[j];
        if (laser.x + laser.w >= enemy.x &&
            laser.x <= enemy.x + enemy.w &&
            laser.y + laser.h >= enemy.y &&
            laser.y <= enemy.y + enemy.h) {
          
          sounds.playScore();
          score += enemy.points;
          this.enemies.splice(i, 1);
          this.lasers.splice(j, 1);
          enemyDestroyed = true;
          break;
        }
      }
      if (enemyDestroyed) continue;
    }
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

    // Move clouds (using reverse loop to prevent splice index-shifting)
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      this.clouds[i].x -= this.clouds[i].speed;
      if (this.clouds[i].x + this.clouds[i].w < 0) {
        this.clouds.splice(i, 1);
      }
    }

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

    // Move & Collide Obstacles (using reverse loop to prevent splice index-shifting)
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const ob = this.obstacles[i];
      ob.x -= this.gameSpeed;

      if (ob.x + ob.w < 0) {
        this.obstacles.splice(i, 1);
        continue;
      }

      // Rect collision
      if (this.runner.x + this.runner.w >= ob.x &&
          this.runner.x <= ob.x + ob.w &&
          this.runner.y + this.runner.h >= ob.y &&
          this.runner.y <= ob.y + ob.h) {
        
        triggerGameOver();
      }
    }
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
// 15. GAME ENGINE 8: FLAPPY PIXEL
// ----------------------------------------------------
class FlappyPixelGame {
  constructor(canvas, diff) {
    this.canvas = canvas;
    this.diff = diff;
    this.bird = { x: 80, y: 180, w: 18, h: 14, vy: 0 };
    this.pipes = [];
    this.speed = 3.0;
    this.gap = 105;
    this.gravity = 0.45;
    this.jumpForce = -6.5;
    this.gameOver = false;
    this.bgOffset = 0;
    this.floorOffset = 0;
  }

  init() {
    this.bird.y = 180;
    this.bird.vy = 0;
    this.pipes = [];
    this.gameOver = false;
    this.bgOffset = 0;
    this.floorOffset = 0;

    if (this.diff === 'easy') {
      this.gap = 130;
      this.speed = 2.2;
      this.gravity = 0.4;
      this.jumpForce = -6.0;
    } else if (this.diff === 'hard') {
      this.gap = 85;
      this.speed = 4.0;
      this.gravity = 0.5;
      this.jumpForce = -7.0;
    } else {
      this.gap = 105;
      this.speed = 3.0;
      this.gravity = 0.45;
      this.jumpForce = -6.5;
    }
    
    // Spawn first pipe
    this.spawnPipe();
  }

  spawnPipe() {
    const minHeight = 40;
    const maxHeight = this.canvas.height - 20 - this.gap - minHeight;
    const topHeight = Math.floor(minHeight + Math.random() * (maxHeight - minHeight));
    const bottomHeight = this.canvas.height - 20 - this.gap - topHeight;
    this.pipes.push({
      x: this.canvas.width,
      topHeight,
      bottomHeight,
      passed: false
    });
  }

  flap() {
    if (this.gameOver) return;
    this.bird.vy = this.jumpForce;
    sounds.playClick();
  }

  handleInput(key, type) {
    if (type === 'keydown') {
      if (key === 'ArrowUp' || key === 'w' || key === 'W' || key === ' ' || key === 'ArrowDown') {
        this.flap();
      }
    }
  }

  handleClick(mx, my) {
    this.flap();
  }

  update(dt) {
    if (this.gameOver) return;

    // Apply gravity
    this.bird.vy += this.gravity;
    this.bird.vy = Math.min(this.bird.vy, 9);
    this.bird.y += this.bird.vy;

    // Floor collision
    if (this.bird.y + this.bird.h / 2 >= this.canvas.height - 20) {
      this.triggerOver();
      return;
    }
    // Ceiling collision
    if (this.bird.y - this.bird.h / 2 <= 0) {
      this.triggerOver();
      return;
    }

    // Scroll speed factor
    const speedFactor = dt / 16.67;

    // Move pipes
    this.pipes.forEach(p => {
      p.x -= this.speed * speedFactor;
    });

    // Check scoring
    this.pipes.forEach(p => {
      if (!p.passed && p.x + 20 < this.bird.x) {
        p.passed = true;
        score += 1;
        sounds.playScore();
      }
    });

    // Check collision with pipes
    const bx1 = this.bird.x - this.bird.w / 2;
    const bx2 = this.bird.x + this.bird.w / 2;
    const by1 = this.bird.y - this.bird.h / 2;
    const by2 = this.bird.y + this.bird.h / 2;

    for (let i = 0; i < this.pipes.length; i++) {
      const p = this.pipes[i];
      // Top pipe box: [p.x, 0, p.x + 40, p.topHeight]
      if (bx2 > p.x && bx1 < p.x + 40) {
        if (by1 < p.topHeight || by2 > this.canvas.height - p.bottomHeight) {
          this.triggerOver();
          return;
        }
      }
    }

    // Spawn new pipes
    if (this.pipes.length > 0 && this.pipes[this.pipes.length - 1].x < this.canvas.width - 160) {
      this.spawnPipe();
    }

    // Remove old pipes
    this.pipes = this.pipes.filter(p => p.x > -60);

    // Update parallax offsets
    this.bgOffset = (this.bgOffset - this.speed * 0.3 * speedFactor) % 40;
    this.floorOffset = (this.floorOffset - this.speed * speedFactor) % 20;
  }

  triggerOver() {
    this.gameOver = true;
    sounds.playHit();
    setTimeout(() => {
      triggerGameOver();
    }, 800);
  }

  draw(ctx) {
    // Parallax background grid lines
    ctx.strokeStyle = '#100a1d';
    ctx.lineWidth = 1;
    for (let x = this.bgOffset; x < this.canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvas.height - 20);
      ctx.stroke();
    }

    // Draw Pipes
    this.pipes.forEach(p => {
      ctx.fillStyle = '#07050d';
      ctx.strokeStyle = '#00f0ff'; // neon cyan
      ctx.lineWidth = 3;

      // Top pipe
      ctx.fillRect(p.x, 0, 40, p.topHeight);
      ctx.strokeRect(p.x, -5, 40, p.topHeight + 5);
      
      // Top pipe rim
      ctx.fillStyle = '#0b0813';
      ctx.fillRect(p.x - 3, p.topHeight - 12, 46, 12);
      ctx.strokeRect(p.x - 3, p.topHeight - 12, 46, 12);

      // Bottom pipe
      ctx.fillStyle = '#07050d';
      ctx.fillRect(p.x, this.canvas.height - p.bottomHeight, 40, p.bottomHeight);
      ctx.strokeRect(p.x, this.canvas.height - p.bottomHeight, 40, p.bottomHeight + 5);

      // Bottom pipe rim
      ctx.fillStyle = '#0b0813';
      ctx.fillRect(p.x - 3, this.canvas.height - p.bottomHeight, 46, 12);
      ctx.strokeRect(p.x - 3, this.canvas.height - p.bottomHeight, 46, 12);
    });

    // Draw Bird
    ctx.save();
    ctx.translate(this.bird.x, this.bird.y);
    let angle = Math.min(Math.max(this.bird.vy * 0.06, -0.5), 0.8);
    ctx.rotate(angle);

    // Yellow body
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(-9, -7, 18, 14);

    // Eye
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(2, -5, 4, 4);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(4, -5, 2, 2);

    // Beak
    ctx.fillStyle = '#ff6c00';
    ctx.fillRect(7, -1, 5, 4);

    // Wing (flapping animation based on velocity)
    ctx.fillStyle = '#ff6c00';
    let wingY = (angle < 0) ? -6 : -2;
    ctx.fillRect(-6, wingY, 6, 6);

    ctx.restore();

    // Draw Floor
    ctx.fillStyle = '#18122b';
    ctx.fillRect(0, this.canvas.height - 20, this.canvas.width, 20);
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, this.canvas.height - 20);
    ctx.lineTo(this.canvas.width, this.canvas.height - 20);
    ctx.stroke();

    // Scroll floor texture
    ctx.strokeStyle = '#241b3f';
    ctx.lineWidth = 2;
    for (let lx = this.floorOffset; lx < this.canvas.width; lx += 20) {
      ctx.beginPath();
      ctx.moveTo(lx, this.canvas.height - 10);
      ctx.lineTo(lx + 5, this.canvas.height - 5);
      ctx.stroke();
    }
  }

  cleanup() {}
}

// ----------------------------------------------------
// 15. GAME ENGINE 9: PIXEL HOP (FROGGER RETRO)
// ----------------------------------------------------
class PixelHopGame {
  constructor(canvas, diff) {
    this.canvas = canvas;
    this.diff = diff;
    this.frog = { x: 220, y: 380 };
    this.obstacles = [];
    this.logs = [];
    this.gameOver = false;
    
    // Difficulty multipliers
    this.speedFactor = 1.0;
    this.spawnGapFactor = 1.0;
  }

  init() {
    this.frog.x = 220;
    this.frog.y = 380;
    this.obstacles = [];
    this.logs = [];
    this.gameOver = false;

    if (this.diff === 'easy') {
      this.speedFactor = 0.75;
      this.spawnGapFactor = 1.25;
    } else if (this.diff === 'hard') {
      this.speedFactor = 1.35;
      this.spawnGapFactor = 0.85;
    } else {
      this.speedFactor = 1.0;
      this.spawnGapFactor = 1.0;
    }
  }

  handleInput(key, type) {
    if (this.gameOver) return;
    if (type === 'keydown') {
      if (key === 'ArrowUp' || key === 'w' || key === 'W' || key === ' ') {
        this.frog.y = Math.max(20, this.frog.y - 40);
        sounds.playClick();
      } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
        this.frog.y = Math.min(380, this.frog.y + 40);
        sounds.playClick();
      } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
        this.frog.x = Math.max(20, this.frog.x - 40);
        sounds.playClick();
      } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
        this.frog.x = Math.min(380, this.frog.x + 40);
        sounds.playClick();
      }
    }
  }

  updateLaneObstacles(y, w, h, speed, color, spawnGap) {
    const laneObstacles = this.obstacles.filter(o => o.y === y);
    if (speed < 0) {
      if (laneObstacles.length === 0 || laneObstacles[laneObstacles.length - 1].x < this.canvas.width - spawnGap) {
        this.obstacles.push({ x: this.canvas.width, y, w, h, speed, color });
      }
    } else {
      if (laneObstacles.length === 0 || laneObstacles[laneObstacles.length - 1].x > spawnGap - w) {
        this.obstacles.push({ x: -w, y, w, h, speed, color });
      }
    }
  }

  updateLaneLogs(y, w, h, speed, color, spawnGap) {
    const laneLogs = this.logs.filter(l => l.y === y);
    if (speed < 0) {
      if (laneLogs.length === 0 || laneLogs[laneLogs.length - 1].x < this.canvas.width - spawnGap) {
        this.logs.push({ x: this.canvas.width, y, w, h, speed, color });
      }
    } else {
      if (laneLogs.length === 0 || laneLogs[laneLogs.length - 1].x > spawnGap - w) {
        this.logs.push({ x: -w, y, w, h, speed, color });
      }
    }
  }

  update(dt) {
    if (this.gameOver) return;

    const dtFactor = dt / 16.67;

    // 1. Spawn Vehicles (Highway lanes)
    this.updateLaneObstacles(200, 35, 24, -2.2 * this.speedFactor, '#ff007f', 180 * this.spawnGapFactor); // Lane 5
    this.updateLaneObstacles(240, 55, 24, 1.3 * this.speedFactor, '#ff6c00', 230 * this.spawnGapFactor);  // Lane 6
    this.updateLaneObstacles(280, 35, 24, -1.6 * this.speedFactor, '#ffd700', 190 * this.spawnGapFactor); // Lane 7
    this.updateLaneObstacles(320, 35, 24, 1.1 * this.speedFactor, '#00f0ff', 200 * this.spawnGapFactor);  // Lane 8

    // 2. Spawn Logs (River lanes)
    this.updateLaneLogs(40, 90, 24, 1.5 * this.speedFactor, '#ff6c00', 170 * this.spawnGapFactor);   // Lane 1
    this.updateLaneLogs(80, 130, 24, -1.0 * this.speedFactor, '#ff6c00', 220 * this.spawnGapFactor);  // Lane 2
    this.updateLaneLogs(120, 100, 24, 1.3 * this.speedFactor, '#ff6c00', 180 * this.spawnGapFactor);  // Lane 3

    // 3. Move Vehicles & filter offscreen
    this.obstacles.forEach(o => o.x += o.speed * dtFactor);
    this.obstacles = this.obstacles.filter(o => o.x > -100 && o.x < this.canvas.width + 100);

    // 4. Move Logs & filter offscreen
    this.logs.forEach(l => l.x += l.speed * dtFactor);
    this.logs = this.logs.filter(l => l.x > -200 && l.x < this.canvas.width + 200);

    // 5. Check Collisions / River Drifting
    if (this.frog.y >= 200 && this.frog.y <= 340) {
      // Highway: check vehicle collisions
      for (let i = 0; i < this.obstacles.length; i++) {
        const o = this.obstacles[i];
        if (o.y === this.frog.y - 20) {
          if (this.frog.x + 10 > o.x && this.frog.x - 10 < o.x + o.w) {
            this.triggerOver();
            return;
          }
        }
      }
    } else if (this.frog.y >= 60 && this.frog.y <= 140) {
      // River: check log intersection
      let onLog = false;
      for (let i = 0; i < this.logs.length; i++) {
        const log = this.logs[i];
        if (log.y === this.frog.y - 20) {
          if (this.frog.x >= log.x && this.frog.x <= log.x + log.w) {
            onLog = true;
            this.frog.x += log.speed * dtFactor;
            break;
          }
        }
      }
      
      // If not on log or drifts off screen: dead
      if (!onLog || this.frog.x < 10 || this.frog.x > this.canvas.width - 10) {
        this.triggerOver();
        return;
      }
    } else if (this.frog.y === 20) {
      // Goal banks checking
      const goals = [60, 220, 340];
      const landedGoal = goals.find(gx => Math.abs(this.frog.x - gx) < 20);
      if (landedGoal !== undefined) {
        score += 100;
        sounds.playWin();
        // Reset frog
        this.frog.x = 220;
        this.frog.y = 380;
      } else {
        this.triggerOver();
      }
    }
  }

  triggerOver() {
    this.gameOver = true;
    sounds.playHit();
    setTimeout(() => {
      triggerGameOver();
    }, 800);
  }

  draw(ctx) {
    // 1. Draw River (deep blue)
    ctx.fillStyle = '#0a1033';
    ctx.fillRect(0, 40, this.canvas.width, 120);

    // 2. Draw Highway (darkest grey)
    ctx.fillStyle = '#07050d';
    ctx.fillRect(0, 200, this.canvas.width, 160);

    // 3. Draw separating dotted highway lines
    ctx.strokeStyle = '#241b3f';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    for (let y = 240; y < 360; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvas.width, y);
      ctx.stroke();
    }
    ctx.setLineDash([]); // Reset line dash

    // 4. Draw Grass Zones (Starting Row & Divider Row)
    ctx.fillStyle = '#18122b';
    ctx.fillRect(0, 360, this.canvas.width, 40);
    ctx.fillRect(0, 160, this.canvas.width, 40);

    // Neon borders for Grass zones
    ctx.strokeStyle = '#ff007f'; // neon pink
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 360); ctx.lineTo(this.canvas.width, 360);
    ctx.moveTo(0, 160); ctx.lineTo(this.canvas.width, 160);
    ctx.moveTo(0, 200); ctx.lineTo(this.canvas.width, 200);
    ctx.stroke();

    // 5. Draw Goal Bank (Row 0)
    ctx.fillStyle = '#18122b';
    ctx.fillRect(0, 0, this.canvas.width, 40);
    
    // Draw 3 Safe Bays
    const goals = [60, 220, 340];
    ctx.fillStyle = '#0a1033'; // River blue for bays
    goals.forEach(gx => {
      ctx.fillRect(gx - 20, 0, 40, 40);
      ctx.strokeStyle = '#00f0ff'; // Neon cyan border for bays
      ctx.lineWidth = 2;
      ctx.strokeRect(gx - 20, 0, 40, 40);
    });

    // Outer bank border
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 40); ctx.lineTo(this.canvas.width, 40);
    ctx.stroke();

    // 6. Draw Logs (River)
    this.logs.forEach(l => {
      ctx.fillStyle = '#ff6c00'; // neon orange wood logs
      ctx.fillRect(l.x, l.y + 6, l.w, l.h);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1;
      ctx.strokeRect(l.x, l.y + 6, l.w, l.h);
    });

    // 7. Draw Vehicles (Highway)
    this.obstacles.forEach(o => {
      ctx.fillStyle = o.color;
      ctx.fillRect(o.x, o.y + 8, o.w, o.h);
      
      // Draw neon headlights/wheels to look futuristic
      ctx.fillStyle = '#ffffff'; // headlights
      if (o.speed < 0) {
        ctx.fillRect(o.x + 2, o.y + 10, 3, 3);
        ctx.fillRect(o.x + 2, o.y + o.h + 1, 3, 3);
      } else {
        ctx.fillRect(o.x + o.w - 5, o.y + 10, 3, 3);
        ctx.fillRect(o.x + o.w - 5, o.y + o.h + 1, 3, 3);
      }
    });

    // 8. Draw Player (Frog)
    ctx.fillStyle = '#39ff14'; // neon green body
    ctx.fillRect(this.frog.x - 10, this.frog.y - 10, 20, 20);
    
    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(this.frog.x - 8, this.frog.y - 12, 4, 4);
    ctx.fillRect(this.frog.x + 4, this.frog.y - 12, 4, 4);
    ctx.fillStyle = '#ff007f'; // pink pupils
    ctx.fillRect(this.frog.x - 7, this.frog.y - 12, 2, 2);
    ctx.fillRect(this.frog.x + 5, this.frog.y - 12, 2, 2);

    // Legs
    ctx.fillStyle = '#22cc0d';
    ctx.fillRect(this.frog.x - 13, this.frog.y - 6, 3, 12);
    ctx.fillRect(this.frog.x + 10, this.frog.y - 6, 3, 12);
  }

  cleanup() {}
}

// ----------------------------------------------------
// 13. GAME ENGINE 10: PIXEL RACER
// ----------------------------------------------------
class PixelRacerGame {
  constructor(canvas, diff) {
    this.canvas = canvas;
    this.diff = diff;
    this.playerWidth = 30;
    this.playerHeight = 55;
    this.laneWidth = canvas.width / 3;
    this.laneCenters = [
      this.laneWidth / 2,
      this.laneWidth + this.laneWidth / 2,
      this.laneWidth * 2 + this.laneWidth / 2
    ];
    this.playerLane = 1;
    this.playerX = this.laneCenters[1];
    this.playerY = 320;
    
    this.obstacles = [];
    this.spawnTimer = 0;
    this.speedMultiplier = 1;
    this.roadOffset = 0;
    this.timeElapsed = 0;
    
    // Difficulty settings
    if (diff === 'easy') {
      this.baseSpeed = 160;
      this.spawnInterval = 1800;
    } else if (diff === 'normal') {
      this.baseSpeed = 240;
      this.spawnInterval = 1300;
    } else {
      this.baseSpeed = 320;
      this.spawnInterval = 900;
    }
  }

  init() {
    this.playerLane = 1;
    this.playerX = this.laneCenters[1];
    this.obstacles = [];
    this.spawnTimer = 0;
    this.speedMultiplier = 1;
    this.roadOffset = 0;
    this.timeElapsed = 0;
  }

  handleInput(key, type) {
    if (type === 'keydown') {
      if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
        if (this.playerLane > 0) {
          this.playerLane--;
          sounds.playTone(300, 'sine', 0.05);
        }
      } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
        if (this.playerLane < 2) {
          this.playerLane++;
          sounds.playTone(300, 'sine', 0.05);
        }
      }
    }
  }

  handleClick(x, y) {
    if (x < 200) {
      if (this.playerLane > 0) {
        this.playerLane--;
        sounds.playTone(300, 'sine', 0.05);
      }
    } else {
      if (this.playerLane < 2) {
        this.playerLane++;
        sounds.playTone(300, 'sine', 0.05);
      }
    }
  }

  update(dt) {
    this.timeElapsed += dt;
    this.speedMultiplier = Math.min(1.8, 1 + this.timeElapsed / 30000);
    
    const currentSpeed = this.baseSpeed * this.speedMultiplier;
    const targetX = this.laneCenters[this.playerLane];
    this.playerX += (targetX - this.playerX) * 0.25;

    this.roadOffset = (this.roadOffset + currentSpeed * (dt / 1000)) % 40;

    this.spawnTimer += dt;
    const currentSpawnInterval = Math.max(450, this.spawnInterval / this.speedMultiplier);
    if (this.spawnTimer >= currentSpawnInterval) {
      this.spawnTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      
      const safeToSpawn = !this.obstacles.some(o => o.lane === lane && o.y < 80);
      if (safeToSpawn) {
        const colors = ['#ff007f', '#ffd700', '#39ff14', '#ff6c00'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        this.obstacles.push({
          lane: lane,
          x: this.laneCenters[lane],
          y: -60,
          w: 28,
          h: 50,
          speed: currentSpeed * (0.8 + Math.random() * 0.4),
          color: color
        });
      }
    }

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.y += o.speed * (dt / 1000);

      const collides = (
        Math.abs(this.playerX - o.x) < (this.playerWidth/2 + o.w/2) &&
        o.y + o.h > this.playerY &&
        o.y < this.playerY + this.playerHeight
      );

      if (collides) {
        triggerGameOver();
        return;
      }

      if (o.y > 400) {
        score += 10;
        sounds.playScore();
        this.obstacles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, 400, 400);

    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(10, 0); ctx.lineTo(10, 400);
    ctx.moveTo(390, 0); ctx.lineTo(390, 400);
    ctx.stroke();

    ctx.strokeStyle = '#2b224d';
    ctx.lineWidth = 2;
    ctx.setLineDash([15, 25]);
    ctx.beginPath();
    ctx.moveTo(this.laneWidth, -40 + this.roadOffset);
    ctx.lineTo(this.laneWidth, 440 + this.roadOffset);
    ctx.moveTo(this.laneWidth * 2, -40 + this.roadOffset);
    ctx.lineTo(this.laneWidth * 2, 440 + this.roadOffset);
    ctx.stroke();
    ctx.setLineDash([]);

    this.obstacles.forEach(o => {
      ctx.fillStyle = o.color;
      ctx.fillRect(o.x - o.w/2, o.y, o.w, o.h);

      ctx.fillStyle = '#111';
      ctx.fillRect(o.x - o.w/2 - 2, o.y + 6, 2, 10);
      ctx.fillRect(o.x + o.w/2, o.y + 6, 2, 10);
      ctx.fillRect(o.x - o.w/2 - 2, o.y + o.h - 16, 2, 10);
      ctx.fillRect(o.x + o.w/2, o.y + o.h - 16, 2, 10);

      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(o.x - o.w/2 + 3, o.y + o.h - 15, o.w - 6, 6);

      ctx.fillStyle = '#ff0055';
      ctx.fillRect(o.x - o.w/2 + 2, o.y + 2, 4, 3);
      ctx.fillRect(o.x + o.w/2 - 6, o.y + 2, 4, 3);
    });

    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(this.playerX - this.playerWidth/2, this.playerY, this.playerWidth, this.playerHeight);

    ctx.fillStyle = '#ff007f';
    ctx.fillRect(this.playerX - this.playerWidth/2 - 2, this.playerY + 6, 2, 12);
    ctx.fillRect(this.playerX + this.playerWidth/2, this.playerY + 6, 2, 12);
    ctx.fillRect(this.playerX - this.playerWidth/2 - 2, this.playerY + this.playerHeight - 18, 2, 12);
    ctx.fillRect(this.playerX + this.playerWidth/2, this.playerY + this.playerHeight - 18, 2, 12);

    ctx.fillStyle = '#ff007f';
    ctx.fillRect(this.playerX - this.playerWidth/2 + 4, this.playerY + 12, this.playerWidth - 8, 8);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(this.playerX - this.playerWidth/2 + 2, this.playerY, 4, 3);
    ctx.fillRect(this.playerX + this.playerWidth/2 - 6, this.playerY, 4, 3);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(this.playerX - this.playerWidth/2 + 2, this.playerY);
    ctx.lineTo(this.playerX - this.playerWidth/2 - 15, 0);
    ctx.lineTo(this.playerX - this.playerWidth/2 + 15, 0);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(this.playerX + this.playerWidth/2 - 6, this.playerY);
    ctx.lineTo(this.playerX + this.playerWidth/2 - 20, 0);
    ctx.lineTo(this.playerX + this.playerWidth/2 + 10, 0);
    ctx.closePath();
    ctx.fill();
  }

  cleanup() {}
}

// ----------------------------------------------------
// 14. GAME ENGINE 11: PIXEL GOBBLER
// ----------------------------------------------------
class PixelGobblerGame {
  constructor(canvas, diff) {
    this.canvas = canvas;
    this.diff = diff;
    this.tileSize = 40;
    this.gridSize = 10;
    this.maze = [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 0, 0, 1, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 0, 0, 1, 1, 0, 0, 0, 1],
      [1, 0, 0, 0, 1, 1, 0, 0, 0, 1],
      [1, 0, 1, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 0, 0, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ];
    
    this.player = { x: 1, y: 1 };
    this.ghost = { x: 8, y: 8 };
    this.dots = [];
    
    this.playerDir = { x: 0, y: 0 };
    this.nextDir = { x: 0, y: 0 };
    
    this.playerTimer = 0;
    this.ghostTimer = 0;
    this.level = 1;
    
    if (diff === 'easy') {
      this.playerInterval = 180;
      this.ghostInterval = 340;
    } else if (diff === 'normal') {
      this.playerInterval = 150;
      this.ghostInterval = 250;
    } else {
      this.playerInterval = 120;
      this.ghostInterval = 180;
    }
  }

  init() {
    this.level = 1;
    this.resetLevel();
  }

  resetLevel() {
    this.player.x = 1;
    this.player.y = 1;
    this.ghost.x = 8;
    this.ghost.y = 8;
    this.playerDir = { x: 0, y: 0 };
    this.nextDir = { x: 0, y: 0 };
    this.playerTimer = 0;
    this.ghostTimer = 0;

    this.dots = [];
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.maze[r][c] === 0) {
          this.dots.push({ x: c, y: r, active: true });
        }
      }
    }
  }

  handleInput(key, type) {
    if (type !== 'keydown') return;
    if (key === 'ArrowUp' || key === 'w' || key === 'W') {
      this.nextDir = { x: 0, y: -1 };
    } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
      this.nextDir = { x: 0, y: 1 };
    } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      this.nextDir = { x: -1, y: 0 };
    } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      this.nextDir = { x: 1, y: 0 };
    }
  }

  update(dt) {
    this.playerTimer += dt;
    this.ghostTimer += dt;

    if (this.playerTimer >= this.playerInterval) {
      this.playerTimer = 0;

      if (this.nextDir.x !== 0 || this.nextDir.y !== 0) {
        const nx = this.player.x + this.nextDir.x;
        const ny = this.player.y + this.nextDir.y;
        if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize && this.maze[ny][nx] === 0) {
          this.playerDir = { ...this.nextDir };
        }
      }

      if (this.playerDir.x !== 0 || this.playerDir.y !== 0) {
        const nx = this.player.x + this.playerDir.x;
        const ny = this.player.y + this.playerDir.y;
        
        if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize && this.maze[ny][nx] === 0) {
          this.player.x = nx;
          this.player.y = ny;
          
          const dot = this.dots.find(d => d.x === nx && d.y === ny && d.active);
          if (dot) {
            dot.active = false;
            score += 10;
            sounds.playTone(800, 'sine', 0.05);
            
            const remaining = this.dots.some(d => d.active);
            if (!remaining) {
              score += 150;
              sounds.playWin();
              this.level++;
              this.resetLevel();
              return;
            }
          }
        } else {
          this.playerDir = { x: 0, y: 0 };
        }
      }
    }

    const currentGhostInterval = Math.max(120, this.ghostInterval - (this.level - 1) * 15);
    if (this.ghostTimer >= currentGhostInterval) {
      this.ghostTimer = 0;

      const directions = [
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 1, y: 0 }
      ];

      let bestDir = null;
      let minDistance = Infinity;

      const isRandomChoice = Math.random() < 0.15;
      const validMoves = [];
      directions.forEach(d => {
        const nx = this.ghost.x + d.x;
        const ny = this.ghost.y + d.y;
        if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize && this.maze[ny][nx] === 0) {
          validMoves.push(d);
          const dist = Math.abs(nx - this.player.x) + Math.abs(ny - this.player.y);
          if (dist < minDistance) {
            minDistance = dist;
            bestDir = d;
          }
        }
      });

      if (validMoves.length > 0) {
        let chosenDir = bestDir;
        if (isRandomChoice) {
          chosenDir = validMoves[Math.floor(Math.random() * validMoves.length)];
        }
        if (chosenDir) {
          this.ghost.x += chosenDir.x;
          this.ghost.y += chosenDir.y;
        }
      }
    }

    if (this.player.x === this.ghost.x && this.player.y === this.ghost.y) {
      triggerGameOver();
    }
  }

  draw(ctx) {
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.maze[r][c] === 1) {
          ctx.fillStyle = '#3b82f6';
          ctx.fillRect(c * this.tileSize + 2, r * this.tileSize + 2, this.tileSize - 4, this.tileSize - 4);
          ctx.strokeStyle = '#2563eb';
          ctx.lineWidth = 1;
          ctx.strokeRect(c * this.tileSize + 2, r * this.tileSize + 2, this.tileSize - 4, this.tileSize - 4);
        }
      }
    }

    ctx.fillStyle = '#ffd700';
    this.dots.forEach(d => {
      if (d.active) {
        ctx.beginPath();
        ctx.arc(d.x * this.tileSize + this.tileSize/2, d.y * this.tileSize + this.tileSize/2, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.fillStyle = '#ffd700';
    const px = this.player.x * this.tileSize + this.tileSize/2;
    const py = this.player.y * this.tileSize + this.tileSize/2;
    ctx.beginPath();
    ctx.arc(px, py, 15, 0.2 * Math.PI, 1.8 * Math.PI);
    ctx.lineTo(px, py);
    ctx.closePath();
    ctx.fill();

    const gx = this.ghost.x * this.tileSize + 5;
    const gy = this.ghost.y * this.tileSize + 5;
    const gSize = 30;
    
    ctx.fillStyle = '#ff0055';
    ctx.beginPath();
    ctx.arc(gx + gSize/2, gy + gSize/2, gSize/2, Math.PI, 0, false);
    ctx.lineTo(gx + gSize, gy + gSize);
    ctx.lineTo(gx + (gSize*5)/6, gy + gSize - 5);
    ctx.lineTo(gx + gSize/2, gy + gSize);
    ctx.lineTo(gx + gSize/6, gy + gSize - 5);
    ctx.lineTo(gx, gy + gSize);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(gx + 6, gy + 10, 5, 5);
    ctx.fillRect(gx + 17, gy + 10, 5, 5);
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(gx + 8, gy + 11, 2, 2);
    ctx.fillRect(gx + 19, gy + 11, 2, 2);
  }

  cleanup() {}
}

// ----------------------------------------------------
// 15. GAME ENGINE 12: PIXEL STACKER
// ----------------------------------------------------
class PixelStackerGame {
  constructor(canvas, diff) {
    this.canvas = canvas;
    this.diff = diff;
    this.rowsCount = 15;
    this.colsCount = 10;
    this.blockW = 40;
    this.blockH = 24;
    this.paddingY = 20;
    
    this.grid = [];
    this.activeRow = 14;
    this.blockWidth = 3;
    this.blockX = 0;
    this.blockDir = 1;
    
    this.shiftTimer = 0;
    this.shiftInterval = 100;

    if (diff === 'easy') {
      this.baseInterval = 160;
      this.speedIncrease = 0.94;
    } else if (diff === 'normal') {
      this.baseInterval = 120;
      this.speedIncrease = 0.92;
    } else {
      this.baseInterval = 85;
      this.speedIncrease = 0.89;
    }
  }

  init() {
    this.grid = Array.from({ length: this.rowsCount }, () => Array(this.colsCount).fill(false));
    this.activeRow = this.rowsCount - 1;
    this.blockWidth = this.diff === 'easy' ? 4 : 3;
    this.blockX = 0;
    this.blockDir = 1;
    this.shiftTimer = 0;
    this.shiftInterval = this.baseInterval;
  }

  handleInput(key, type) {
    if (type === 'keydown' && (key === ' ' || key === 'ArrowUp' || key === 'Enter')) {
      this.stackRow();
    }
  }

  handleClick(x, y) {
    this.stackRow();
  }

  stackRow() {
    sounds.playTone(440, 'triangle', 0.08);

    const start = this.blockX;
    const end = this.blockX + this.blockWidth - 1;
    
    if (this.activeRow === this.rowsCount - 1) {
      for (let x = start; x <= end; x++) {
        this.grid[this.activeRow][x] = true;
      }
      score += 10;
    } else {
      const belowRow = this.activeRow + 1;
      let newStart = -1;
      let newEnd = -1;

      for (let x = 0; x < this.colsCount; x++) {
        if (this.grid[belowRow][x] && x >= start && x <= end) {
          if (newStart === -1) newStart = x;
          newEnd = x;
        }
      }

      if (newStart === -1) {
        sounds.playHit();
        triggerGameOver();
        return;
      }

      for (let x = newStart; x <= newEnd; x++) {
        this.grid[this.activeRow][x] = true;
      }

      const placedWidth = newEnd - newStart + 1;
      score += placedWidth * 20;
      this.blockWidth = placedWidth;
    }

    this.activeRow--;

    if (this.activeRow < 0) {
      score += 500;
      sounds.playWin();
      triggerGameOver();
      return;
    }

    this.blockX = 0;
    this.blockDir = 1;
    this.shiftInterval = Math.max(35, this.shiftInterval * this.speedIncrease);
  }

  update(dt) {
    this.shiftTimer += dt;

    if (this.shiftTimer >= this.shiftInterval) {
      this.shiftTimer = 0;
      this.blockX += this.blockDir;

      if (this.blockX + this.blockWidth > this.colsCount) {
        this.blockX = this.colsCount - this.blockWidth;
        this.blockDir = -1;
      } else if (this.blockX < 0) {
        this.blockX = 0;
        this.blockDir = 1;
      }
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#06040a';
    ctx.fillRect(0, 0, 400, 400);

    ctx.strokeStyle = '#110c22';
    ctx.lineWidth = 1;
    for (let c = 0; c <= this.colsCount; c++) {
      ctx.beginPath();
      ctx.moveTo(c * this.blockW, 0);
      ctx.lineTo(c * this.blockW, 400);
      ctx.stroke();
    }
    for (let r = 0; r <= this.rowsCount; r++) {
      ctx.beginPath();
      ctx.moveTo(0, this.paddingY + r * this.blockH);
      ctx.lineTo(400, this.paddingY + r * this.blockH);
      ctx.stroke();
    }

    for (let r = 0; r < this.rowsCount; r++) {
      for (let c = 0; c < this.colsCount; c++) {
        if (this.grid[r][c]) {
          if (r >= 10) ctx.fillStyle = '#ff007f';
          else if (r >= 5) ctx.fillStyle = '#3b82f6';
          else ctx.fillStyle = '#39ff14';

          ctx.fillRect(c * this.blockW + 2, this.paddingY + r * this.blockH + 2, this.blockW - 4, this.blockH - 4);
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1;
          ctx.strokeRect(c * this.blockW + 2, this.paddingY + r * this.blockH + 2, this.blockW - 4, this.blockH - 4);
        }
      }
    }

    if (this.activeRow >= 0) {
      ctx.fillStyle = '#ffd700';
      for (let i = 0; i < this.blockWidth; i++) {
        const c = this.blockX + i;
        ctx.fillRect(c * this.blockW + 2, this.paddingY + this.activeRow * this.blockH + 2, this.blockW - 4, this.blockH - 4);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(c * this.blockW + 2, this.paddingY + this.activeRow * this.blockH + 2, this.blockW - 4, this.blockH - 4);
      }
    }
  }

  cleanup() {}
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
