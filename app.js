
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

const gamesList = ['snake', 'blocks', 'paddle', 'defender', 'memory', 'runner', 'minesweeper', 'flappy', 'frog', 'racer', 'gobbler', 'stacker', 'catcher', 'jumper', 'pong', 'time', 'rhythm', 'gravity', 'flow', 'driller', 'orbit', 'ninja', 'helix', 'shield'];

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
    desc_catcher: 'Catch falling neon stars and gems while dodging dangerous bombs!',
    desc_jumper: 'Bounce up neon platforms, collect stars and springs, and climb as high as possible!',
    desc_pong: 'Duel against CPU in a fast-paced horizontal neon ping-pong match!',
    desc_time: 'Time only flows when you move! Dodge bullet patterns and survive.',
    desc_rhythm: 'Match falling neon beats on 3 lanes. Keep the combo going to play synth music!',
    desc_gravity: 'Gravity-flipping endless runner. Flip floor to ceiling to dodge spikes!',
    desc_flow: 'Rotate pipe segments to connect the plasma flow from source to receiver.',
    desc_driller: 'Drill down through colored blocks. Watch for falling bricks and refill your oxygen!',
    desc_orbit: 'Switch between inner and outer orbits to dodge cosmic debris and collect stars.',
    desc_ninja: 'Climb the walls, jump side to side to avoid spikes, and slice flying shurikens!',
    desc_helix: 'Rotate the helix tower to let the ball bounce and drop through safety gaps.',
    desc_shield: 'Rotate the orbit shield to protect the central reactor core from incoming meteors.',

    
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
    instruct_catcher: 'Move left/right to catch gems and stars. Avoid red bombs!',
    instruct_jumper: 'Move Left/Right to steer. Land on platforms to bounce. Do not fall!',
    instruct_pong: 'Steer Left/Right to slide paddle. Deflect the ball to score points!',
    instruct_time: 'Use D-Pad to move. Time freezes when you stop. Avoid bullet trails!',
    instruct_rhythm: 'Press Left, Action (Up), or Right as notes cross the target line!',
    instruct_gravity: 'Press JUMP or Spacebar to flip gravity instantly. Avoid floor/ceiling spikes!',
    instruct_flow: 'Tap tiles directly on the canvas to rotate them. Link the source (top) to the sink (bottom) before plasma flows!',
    instruct_driller: 'Move Left/Right. Press Down or DRILL to dig. Dig matching colors for chains. Collect O2 canisters!',
    instruct_orbit: 'Press JUMP or Space to switch between inner/outer orbits. Dodge red rocks and collect gold stars.',
    instruct_ninja: 'Press JUMP or Space to leap to the other wall. Your jump is a spin-attack that destroys shurikens. Avoid wall spikes!',
    instruct_helix: 'Press Left/Right to rotate the tower (or drag horizontally on canvas). Bounce on safe platforms and fall through gaps!',
    instruct_shield: 'Press Left/Right to rotate the shield arc around the core. Deflect incoming meteors!',

    
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
    title_catcher: 'PIXEL CATCHER',
    title_jumper: 'NEON JUMPER',
    title_pong: 'NEON PONG',
    title_time: 'TIME WARP',
    title_rhythm: 'NEON BEAT',
    title_gravity: 'GRAVITY FLIP',
    title_flow: 'NEON FLOW',
    title_driller: 'PIXEL DRILLER',
    title_orbit: 'ORBITAL DODGE',
    title_ninja: 'NINJA LEAP',
    title_helix: 'HELIX FALL',
    title_shield: 'CORE SHIELD',

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
    desc_catcher: 'Hứng sao và đá quý rơi từ trên cao, đồng thời né tránh bom đỏ!',
    desc_jumper: 'Nhảy lên các bực neon, thu thập sao và lò xo, leo cao nhất có thể!',
    desc_pong: 'Đối đầu với CPU trong trận bóng bàn neon nằm ngang tốc độ kịch tính!',
    desc_time: 'Thời gian chỉ trôi khi bạn di chuyển! Né tránh làn đạn và sinh tồn.',
    desc_rhythm: 'Khớp các nốt nhạc neon rơi trên 3 làn. Giữ combo để tạo nhạc điện tử!',
    desc_gravity: 'Chạy vô tận đảo ngược trọng lực. Lật giữa sàn và trần để né gai nhọn!',
    desc_flow: 'Xoay các đoạn ống để nối dòng huyết tương chảy từ nguồn đến đích nhận.',
    desc_driller: 'Khoan sâu qua các khối gạch màu. Tránh đá rơi đè và nạp lại oxy!',
    desc_orbit: 'Chuyển đổi giữa hai vòng quỹ đạo để né tránh thiên thạch và nhặt năng lượng vàng.',
    desc_ninja: 'Bám tường leo cao, nhảy qua lại để tránh gai nhọn và chém phi tiêu bay!',
    desc_helix: 'Xoay tháp để bóng nảy liên tục rơi qua khe hở của các tấm đệm an toàn.',
    desc_shield: 'Xoay lá chắn quỹ đạo để bảo vệ hạt nhân lò phản ứng ở tâm khỏi thiên thạch va chạm.',

    
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
    instruct_catcher: 'Di chuyển trái/phải để hứng đá quý và sao. Tránh bom đỏ!',
    instruct_jumper: 'Di chuyển Trái/Phải để điều khiển. Đáp lên bực để nhảy. Đừng để rơi!',
    instruct_pong: 'Nhấn Trái/Phải để trượt vợt. Đánh trả bóng để ghi điểm!',
    instruct_time: 'Dùng D-Pad để di chuyển. Đứng yên để ngưng đọng thời gian. Tránh đạn!',
    instruct_rhythm: 'Nhấn Trái, Hành động (Lên), hoặc Phải khi nốt nhạc chạm vạch mục tiêu!',
    instruct_gravity: 'Nhấn NHẢY hoặc Phím Cách để đảo ngược trọng lực. Tránh gai sàn/trần!',
    instruct_flow: 'Chạm trực tiếp vào các ô để xoay. Kết nối nguồn (trên) với đích (dưới) trước khi dòng năng lượng tràn ra!',
    instruct_driller: 'Trái/Phải để di chuyển. Nhấn Xuống hoặc DRILL để khoan. Khoan khối cùng màu tạo chuỗi nổ. Nhặt O2!',
    instruct_orbit: 'Nhấn NHẢY hoặc phím Cách để chuyển quỹ đạo trong/ngoài. Né tránh đá đỏ và nhặt sao vàng.',
    instruct_ninja: 'Nhấn NHẢY hoặc phím Cách để nhảy sang tường đối diện. Khi nhảy sẽ tự xoay kiếm chém phi tiêu. Tránh gai!',
    instruct_helix: 'Nhấn Trái/Phải để xoay tháp (hoặc vuốt ngang màn hình). Đáp lên bực an toàn và rơi qua khe!',
    instruct_shield: 'Nhấn Trái/Phải để xoay lá chắn quanh tâm. Cản phá tất cả các thiên thạch bay vào!',

    
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
    title_catcher: 'HỨNG ĐÁ QUÝ',
    title_jumper: 'NHẢY NEON',
    title_pong: 'BÓNG BÀN NEON',
    title_time: 'TIME WARP',
    title_rhythm: 'NEON BEAT',
    title_gravity: 'ĐẢO TRỌNG LỰC',
    title_flow: 'NEON FLOW',
    title_driller: 'KHOAN NEON',
    title_orbit: 'QUỸ ĐẠO NÉ TRÁNH',
    title_ninja: 'NINJA BÁM TƯỜNG',
    title_helix: 'HELIX FALL',
    title_shield: 'LÁ CHẮN HẠT NHÂN',

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
  document.body.setAttribute('data-active-game', gameKey);
  
  DOM.activeGameTitle.textContent = getTranslation(`title_${gameKey}`);
  
  // Show high score
  DOM.activeHighScore.textContent = getHighScore(gameKey);
  score = 0;
  DOM.currentScore.textContent = score;

  // Toggle mobile layouts
  DOM.ctrlDpad.classList.add('hidden');
  DOM.ctrlLeftRightAction.classList.add('hidden');
  DOM.ctrlJumpOnly.classList.add('hidden');
  DOM.mobileController.classList.add('hidden');

  if (gameKey === 'snake') {
    DOM.ctrlDpad.classList.remove('hidden');
    DOM.mobileController.classList.remove('hidden');
    DOM.instructionText.textContent = getTranslation('instruct_snake');
  } else if (gameKey === 'blocks') {
    DOM.ctrlLeftRightAction.classList.remove('hidden');
    DOM.mobileController.classList.remove('hidden');
    document.getElementById('btnActionA').textContent = getTranslation('lbl_rotate');
    document.getElementById('btnActionB').textContent = getTranslation('lbl_drop');
    DOM.instructionText.textContent = getTranslation('instruct_blocks');
  } else if (gameKey === 'paddle') {
    DOM.ctrlLeftRightAction.classList.remove('hidden');
    DOM.mobileController.classList.remove('hidden');
    document.getElementById('btnActionA').textContent = 'A';
    document.getElementById('btnActionB').textContent = 'B';
    DOM.instructionText.textContent = getTranslation('instruct_paddle');
  } else if (gameKey === 'defender') {
    DOM.ctrlLeftRightAction.classList.remove('hidden');
    DOM.mobileController.classList.remove('hidden');
    document.getElementById('btnActionA').textContent = getTranslation('lbl_fire');
    document.getElementById('btnActionB').textContent = 'B';
    DOM.instructionText.textContent = getTranslation('instruct_defender');
  } else if (gameKey === 'memory') {
    DOM.instructionText.textContent = getTranslation('instruct_memory');
  } else if (gameKey === 'runner') {
    DOM.ctrlJumpOnly.classList.remove('hidden');
    DOM.mobileController.classList.remove('hidden');
    document.getElementById('btnJumpAction').textContent = getTranslation('lbl_jump');
    DOM.instructionText.textContent = getTranslation('instruct_runner');
  } else if (gameKey === 'minesweeper') {
    DOM.instructionText.textContent = getTranslation('instruct_minesweeper');
  } else if (gameKey === 'flappy') {
    DOM.ctrlJumpOnly.classList.remove('hidden');
    DOM.mobileController.classList.remove('hidden');
    document.getElementById('btnJumpAction').textContent = getTranslation('lbl_flap');
    DOM.instructionText.textContent = getTranslation('instruct_flappy');
  } else if (gameKey === 'frog') {
    DOM.ctrlDpad.classList.remove('hidden');
    DOM.mobileController.classList.remove('hidden');
    DOM.instructionText.textContent = getTranslation('instruct_frog');
  } else if (gameKey === 'racer') {
    DOM.ctrlLeftRightAction.classList.remove('hidden');
    DOM.mobileController.classList.remove('hidden');
    document.getElementById('btnActionA').textContent = 'A';
    document.getElementById('btnActionB').textContent = 'B';
    DOM.instructionText.textContent = getTranslation('instruct_racer');
  } else if (gameKey === 'gobbler') {
    DOM.ctrlDpad.classList.remove('hidden');
    DOM.mobileController.classList.remove('hidden');
    DOM.instructionText.textContent = getTranslation('instruct_gobbler');
  } else if (gameKey === 'stacker') {
    DOM.ctrlJumpOnly.classList.remove('hidden');
    DOM.mobileController.classList.remove('hidden');
    document.getElementById('btnJumpAction').textContent = getTranslation('lbl_stack');
    DOM.instructionText.textContent = getTranslation('instruct_stacker');
  } else if (gameKey === 'catcher') {
    DOM.ctrlLeftRightAction.classList.remove('hidden');
    DOM.mobileController.classList.remove('hidden');
    document.getElementById('btnActionA').textContent = 'A';
    document.getElementById('btnActionB').textContent = 'B';
    DOM.instructionText.textContent = getTranslation('instruct_catcher');
  } else if (gameKey === 'jumper') {
    DOM.ctrlLeftRightAction.classList.remove('hidden');
    DOM.mobileController.classList.remove('hidden');
    document.getElementById('btnActionA').textContent = 'A';
    document.getElementById('btnActionB').textContent = 'B';
    DOM.instructionText.textContent = getTranslation('instruct_jumper');
  } else if (gameKey === 'pong') {
    DOM.ctrlLeftRightAction.classList.remove('hidden');
    DOM.mobileController.classList.remove('hidden');
    document.getElementById('btnActionA').textContent = 'A';
    document.getElementById('btnActionB').textContent = 'B';
    DOM.instructionText.textContent = getTranslation('instruct_pong');
  } else if (gameKey === 'time') {
    DOM.ctrlDpad.classList.remove('hidden');
    DOM.mobileController.classList.remove('hidden');
    DOM.instructionText.textContent = getTranslation('instruct_time');
  } else if (gameKey === 'rhythm') {
    DOM.ctrlLeftRightAction.classList.remove('hidden');
    DOM.mobileController.classList.remove('hidden');
    document.getElementById('btnActionA').textContent = 'MID';
    document.getElementById('btnActionB').textContent = '---';
    DOM.instructionText.textContent = getTranslation('instruct_rhythm');
  } else if (gameKey === 'gravity') {
    DOM.ctrlJumpOnly.classList.remove('hidden');
    DOM.mobileController.classList.remove('hidden');
    document.getElementById('btnJumpAction').textContent = 'FLIP';
    DOM.instructionText.textContent = getTranslation('instruct_gravity');
  } else if (gameKey === 'flow') {
    DOM.instructionText.textContent = getTranslation('instruct_flow');
  } else if (gameKey === 'driller') {
    DOM.ctrlLeftRightAction.classList.remove('hidden');
    DOM.mobileController.classList.remove('hidden');
    document.getElementById('btnActionA').textContent = 'DRILL';
    document.getElementById('btnActionB').textContent = 'B';
    DOM.instructionText.textContent = getTranslation('instruct_driller');
  } else if (gameKey === 'orbit') {
    DOM.ctrlJumpOnly.classList.remove('hidden');
    DOM.mobileController.classList.remove('hidden');
    document.getElementById('btnJumpAction').textContent = 'SWITCH';
    DOM.instructionText.textContent = getTranslation('instruct_orbit');
  } else if (gameKey === 'ninja') {
    DOM.ctrlJumpOnly.classList.remove('hidden');
    DOM.mobileController.classList.remove('hidden');
    document.getElementById('btnJumpAction').textContent = 'LEAP';
    DOM.instructionText.textContent = getTranslation('instruct_ninja');
  } else if (gameKey === 'helix') {
    DOM.ctrlLeftRightAction.classList.remove('hidden');
    DOM.mobileController.classList.remove('hidden');
    document.getElementById('btnActionA').textContent = '---';
    document.getElementById('btnActionB').textContent = '---';
    DOM.instructionText.textContent = getTranslation('instruct_helix');
  } else if (gameKey === 'shield') {
    DOM.ctrlLeftRightAction.classList.remove('hidden');
    DOM.mobileController.classList.remove('hidden');
    document.getElementById('btnActionA').textContent = '---';
    document.getElementById('btnActionB').textContent = '---';
    DOM.instructionText.textContent = getTranslation('instruct_shield');
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
  else if (activeGameKey === 'catcher') activeGame = new PixelCatcherGame(DOM.canvas, difficulty);
  else if (activeGameKey === 'jumper') activeGame = new PixelJumperGame(DOM.canvas, difficulty);
  else if (activeGameKey === 'pong') activeGame = new PixelPongGame(DOM.canvas, difficulty);
  else if (activeGameKey === 'time') activeGame = new TimeWarpGame(DOM.canvas, difficulty);
  else if (activeGameKey === 'rhythm') activeGame = new NeonBeatGame(DOM.canvas, difficulty);
  else if (activeGameKey === 'gravity') activeGame = new GravityFlipGame(DOM.canvas, difficulty);
  else if (activeGameKey === 'flow') activeGame = new FlowGame(DOM.canvas, difficulty);
  else if (activeGameKey === 'driller') activeGame = new DrillerGame(DOM.canvas, difficulty);
  else if (activeGameKey === 'orbit') activeGame = new OrbitGame(DOM.canvas, difficulty);
  else if (activeGameKey === 'ninja') activeGame = new NinjaGame(DOM.canvas, difficulty);
  else if (activeGameKey === 'helix') activeGame = new HelixGame(DOM.canvas, difficulty);
  else if (activeGameKey === 'shield') activeGame = new CoreShieldGame(DOM.canvas, difficulty);




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
  document.body.removeAttribute('data-active-game');
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
    this.inputLock = false;
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
    this.inputLock = false;
    
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
    if (this.inputLock) return;

    let turnRegistered = false;
    if ((key === 'ArrowUp' || key === 'w' || key === 'W') && this.dir.y === 0) {
      this.nextDir = { x: 0, y: -1 };
      turnRegistered = true;
    } else if ((key === 'ArrowDown' || key === 's' || key === 'S') && this.dir.y === 0) {
      this.nextDir = { x: 0, y: 1 };
      turnRegistered = true;
    } else if ((key === 'ArrowLeft' || key === 'a' || key === 'A') && this.dir.x === 0) {
      this.nextDir = { x: -1, y: 0 };
      turnRegistered = true;
    } else if ((key === 'ArrowRight' || key === 'd' || key === 'D') && this.dir.x === 0) {
      this.nextDir = { x: 1, y: 0 };
      turnRegistered = true;
    }

    if (turnRegistered) {
      this.inputLock = true;
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
      this.inputLock = false;
      
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
    const isDownPressed = keysPressed['ArrowDown'] || keysPressed['s'] || keysPressed['S'];
    const interval = isDownPressed ? 40 : this.dropInterval;

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
    let hitAny = false;
    for (let i = 0; i < this.bricks.length; i++) {
      const brick = this.bricks[i];
      if (!brick.alive) continue;

      if (this.ball.x + this.ball.size >= brick.x &&
          this.ball.x <= brick.x + brick.w &&
          this.ball.y + this.ball.size >= brick.y &&
          this.ball.y <= brick.y + brick.h) {
        
        brick.alive = false;
        hitAny = true;
        score += brick.points * this.scoreMultiplier;
        sounds.playScore();

        // Spawn powerup chance (18%)
        if (Math.random() < 0.18) {
          const types = ['expand', 'big', 'double'];
          const type = types[Math.floor(Math.random() * types.length)];
          this.powerups.push({ x: brick.x + brick.w / 2, y: brick.y, type, size: 10 });
        }
        break; // Only hit one brick per frame to prevent double inversion of vy
      }
    }

    if (hitAny) {
      this.ball.vy *= -1;
    }

    const hasBricksLeft = this.bricks.some(b => b.alive);
    if (!hasBricksLeft) {
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
    
    this.gridSize = 8; // 8x8
    this.tileSize = 42;
    this.tileGap = 4;
    this.offsetX = (canvas.width - (this.gridSize * (this.tileSize + this.tileGap) - this.tileGap)) / 2;
    this.offsetY = (canvas.height - (this.gridSize * (this.tileSize + this.tileGap) - this.tileGap)) / 2;
    this.timers = [];
  }

  init() {
    this.tiles = [];
    this.revealedIndices = [];
    this.isChecking = false;
    this.moves = 0;
    this.timers = [];

    // 32 Pairs of shapes/colors (numbered 0-31)
    const shapesList = [];
    for (let i = 0; i < 32; i++) {
      shapesList.push(i, i);
    }
    
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

  setTimer(fn, ms) {
    const id = setTimeout(() => {
      this.timers = this.timers.filter(t => t !== id);
      fn();
    }, ms);
    this.timers.push(id);
    return id;
  }

  checkPair() {
    const idx1 = this.revealedIndices[0];
    const idx2 = this.revealedIndices[1];
    const t1 = this.tiles[idx1];
    const t2 = this.tiles[idx2];

    if (t1.shapeIdx === t2.shapeIdx) {
      // Match!
      this.setTimer(() => {
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
          this.setTimer(() => {
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
      this.setTimer(() => {
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
      const borderW = t.size > 50 ? 3 : 2;
      if (t.state === 'hidden') {
        // Draw hidden blue card back
        ctx.fillStyle = '#18122b';
        ctx.fillRect(t.x, t.y, t.size, t.size);
        ctx.strokeStyle = varColor('--blue');
        ctx.lineWidth = borderW;
        ctx.strokeRect(t.x, t.y, t.size, t.size);
        
        // Inner detail scaled dynamically
        ctx.fillStyle = '#241b3f';
        ctx.fillRect(t.x + t.size / 2 - t.size * 0.15, t.y + t.size / 2 - t.size * 0.15, t.size * 0.3, t.size * 0.3);
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(t.x + t.size / 2 - t.size * 0.06, t.y + t.size / 2 - t.size * 0.06, t.size * 0.12, t.size * 0.12);
      } else if (t.state === 'revealed' || t.state === 'matched') {
        // Draw card front base
        ctx.fillStyle = t.state === 'matched' ? '#07050d' : '#241b3f';
        ctx.fillRect(t.x, t.y, t.size, t.size);
        ctx.strokeStyle = t.state === 'matched' ? '#39ff14' : '#ff007f';
        ctx.lineWidth = borderW;
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

  drawIcon(ctx, shapeIdx, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    
    // Scale down the icon geometry to fit inside 42px tiles (originally designed for 74px)
    ctx.scale(0.52, 0.52);

    const type = shapeIdx % 8;
    const paletteIdx = Math.floor(shapeIdx / 8);
    const palettes = [
      { p: '#00f0ff', s: '#3b82f6' }, // Neon Cyan / Blue
      { p: '#ffd700', s: '#ff6c00' }, // Gold / Orange
      { p: '#39ff14', s: '#22cc0d' }, // Lime / Green
      { p: '#ff007f', s: '#ff0055' }  // Hot Pink / Red
    ];
    const color = palettes[paletteIdx % palettes.length];

    if (type === 0) {
      // Yellow Twinkle Star
      ctx.fillStyle = color.p;
      ctx.fillRect(-4, -16, 8, 8);
      ctx.fillRect(-16, -4, 32, 8);
      ctx.fillRect(-4, 8, 8, 8);
      ctx.fillRect(-4, -4, 8, 8); // center
    } else if (type === 1) {
      // Red Heart
      ctx.fillStyle = color.p;
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
      ctx.fillStyle = color.s;
      ctx.fillRect(-10, 4, 20, 4);
      // Handle
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(-3, 8, 6, 8);
    } else if (type === 3) {
      // Blue Shield
      ctx.fillStyle = color.p;
      ctx.fillRect(-12, -12, 24, 16);
      ctx.fillRect(-8, 4, 16, 8);
      ctx.fillRect(-4, 12, 8, 4);
      // center cross
      ctx.fillStyle = color.s;
      ctx.fillRect(-12, -2, 24, 4);
      ctx.fillRect(-2, -12, 4, 24);
    } else if (type === 4) {
      // Gold Coin
      ctx.fillStyle = color.s;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color.p;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color.s;
      ctx.fillRect(-3, -6, 6, 12);
    } else if (type === 5) {
      // Yellow Lightning
      ctx.fillStyle = color.p;
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
      ctx.fillStyle = color.p;
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
      ctx.fillStyle = color.p;
      ctx.fillRect(-12, -8, 24, 16);
      ctx.fillRect(-16, 0, 32, 8);
      // eyes
      ctx.fillStyle = '#000000';
      ctx.fillRect(-8, -4, 4, 4);
      ctx.fillRect(4, -4, 4, 4);
    }
    
    ctx.restore();
  }

  cleanup() {
    this.timers.forEach(t => clearTimeout(t));
    this.timers = [];
  }
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
    this.gameOverTimeout = null;
    
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
    this.gameOverTimeout = null;
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
      this.gameOverTimeout = setTimeout(() => triggerGameOver(), 1000);
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
      this.gameOverTimeout = setTimeout(() => triggerGameOver(), 1000);
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
    if (this.gameOverTimeout) {
      clearTimeout(this.gameOverTimeout);
      this.gameOverTimeout = null;
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
    this.gameOverTimeout = null;
  }

  init() {
    this.bird.y = 180;
    this.bird.vy = 0;
    this.pipes = [];
    this.gameOver = false;
    this.bgOffset = 0;
    this.floorOffset = 0;
    this.gameOverTimeout = null;

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
    this.gameOverTimeout = setTimeout(() => {
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

  cleanup() {
    if (this.gameOverTimeout) {
      clearTimeout(this.gameOverTimeout);
      this.gameOverTimeout = null;
    }
  }
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
    this.gameOverTimeout = null;
  }

  init() {
    this.frog.x = 220;
    this.frog.y = 380;
    this.obstacles = [];
    this.logs = [];
    this.gameOver = false;
    this.gameOverTimeout = null;

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
    this.gameOverTimeout = setTimeout(() => {
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

  cleanup() {
    if (this.gameOverTimeout) {
      clearTimeout(this.gameOverTimeout);
      this.gameOverTimeout = null;
    }
  }
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
        // Consume buffered input immediately after checking
        this.nextDir = { x: 0, y: 0 };
      }

      if (this.playerDir.x !== 0 || this.playerDir.y !== 0) {
        const nx = this.player.x + this.playerDir.x;
        const ny = this.player.y + this.playerDir.y;
        
        if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize && this.maze[ny][nx] === 0) {
          this.player.x = nx;
          this.player.y = ny;
          
          // Check collision immediately after player moves to prevent phase-through
          if (this.player.x === this.ghost.x && this.player.y === this.ghost.y) {
            triggerGameOver();
            return;
          }
          
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
          
          // Check collision immediately after ghost moves to prevent phase-through
          if (this.player.x === this.ghost.x && this.player.y === this.ghost.y) {
            triggerGameOver();
            return;
          }
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
// 15.5 GAME ENGINE 13: PIXEL CATCHER
// ----------------------------------------------------
class PixelCatcherGame {
  constructor(canvas, diff) {
    this.canvas = canvas;
    this.diff = diff;
    
    this.x = 180;
    this.y = 360;
    this.w = 40;
    this.h = 12;
    this.speed = 6.5;
    this.lives = 3;
    
    this.items = [];
    this.particles = [];
    this.stars = [];
    
    this.spawnTimer = 0;
    this.spawnInterval = 800; // ms
    this.timeElapsed = 0;
    
    this.magnetTimer = 0;
    this.flashTimer = 0;
    
    if (diff === 'easy') {
      this.lives = 4;
      this.spawnInterval = 1000;
      this.baseFallSpeed = 140;
    } else if (diff === 'normal') {
      this.lives = 3;
      this.spawnInterval = 800;
      this.baseFallSpeed = 190;
    } else {
      this.lives = 2;
      this.spawnInterval = 600;
      this.baseFallSpeed = 240;
    }
  }

  init() {
    this.x = 200 - this.w / 2;
    this.y = 360;
    this.magnetTimer = 0;
    this.flashTimer = 0;
    this.timeElapsed = 0;
    this.items = [];
    this.particles = [];
    
    if (this.diff === 'easy') {
      this.lives = 4;
      this.spawnInterval = 1000;
      this.baseFallSpeed = 140;
    } else if (this.diff === 'normal') {
      this.lives = 3;
      this.spawnInterval = 800;
      this.baseFallSpeed = 190;
    } else {
      this.lives = 2;
      this.spawnInterval = 600;
      this.baseFallSpeed = 240;
    }

    // Spawn stars for parallax background
    this.stars = [];
    for (let i = 0; i < 25; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: 1 + Math.random() * 2,
        speed: 30 + Math.random() * 40
      });
    }
  }

  handleInput(key, type) {}

  spawnItem() {
    const scale = Math.min(1.8, 1 + this.timeElapsed / 30000);
    const r = Math.random();
    let type = 'gem';
    let size = 12;
    let color = varColor('--cyan');
    
    let bombWeight = 0.25;
    if (this.diff === 'normal') bombWeight = 0.32;
    if (this.diff === 'hard') bombWeight = 0.40;
    
    if (r < bombWeight) {
      type = 'bomb';
      size = 14;
      color = '#ff3333';
    } else if (r < bombWeight + 0.45) {
      type = 'gem';
      size = 12;
      color = varColor('--cyan');
    } else if (r < bombWeight + 0.45 + 0.15) {
      type = 'star';
      size = 12;
      color = varColor('--yellow');
    } else if (r < bombWeight + 0.45 + 0.15 + 0.05) {
      type = 'magnet';
      size = 16;
      color = varColor('--pink');
    } else {
      type = 'heart';
      size = 12;
      color = varColor('--green');
    }

    const fallSpeed = this.baseFallSpeed * (0.9 + Math.random() * 0.3) * scale;
    
    this.items.push({
      x: 15 + Math.random() * (this.canvas.width - 30),
      y: -20,
      w: size,
      h: size,
      type: type,
      color: color,
      speed: fallSpeed,
      angle: Math.random() * Math.PI * 2,
      spinSpeed: (Math.random() - 0.5) * 4
    });
  }

  createParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        size: 2 + Math.random() * 3,
        life: 400 + Math.random() * 400,
        maxLife: 800
      });
    }
  }

  update(dt) {
    const dtSeconds = dt / 1000;
    this.timeElapsed += dt;
    
    if (this.magnetTimer > 0) {
      this.magnetTimer = Math.max(0, this.magnetTimer - dt);
    }
    if (this.flashTimer > 0) {
      this.flashTimer = Math.max(0, this.flashTimer - dt);
    }

    const currentW = this.magnetTimer > 0 ? 80 : 40;
    
    if (keysPressed['ArrowLeft'] || keysPressed['a'] || keysPressed['A']) {
      this.x = Math.max(0, this.x - this.speed);
    }
    if (keysPressed['ArrowRight'] || keysPressed['d'] || keysPressed['D']) {
      this.x = Math.min(this.canvas.width - currentW, this.x + this.speed);
    }

    this.stars.forEach(s => {
      s.y += s.speed * dtSeconds;
      if (s.y > this.canvas.height) {
        s.y = 0;
        s.x = Math.random() * this.canvas.width;
      }
    });

    this.spawnTimer += dt;
    const scale = Math.min(1.8, 1 + this.timeElapsed / 30000);
    const currentSpawnInterval = this.spawnInterval / scale;
    if (this.spawnTimer >= currentSpawnInterval) {
      this.spawnTimer = 0;
      this.spawnItem();
    }

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.y += item.speed * dtSeconds;
      item.angle += item.spinSpeed * dtSeconds;

      const cupX1 = this.x;
      const cupX2 = this.x + currentW;
      const cupY1 = this.y;
      const cupY2 = this.y + this.h;

      const itemX1 = item.x;
      const itemX2 = item.x + item.w;
      const itemY1 = item.y;
      const itemY2 = item.y + item.h;

      const collides = (itemX2 >= cupX1 && itemX1 <= cupX2 && itemY2 >= cupY1 && itemY1 <= cupY2);
      
      if (collides) {
        if (item.type === 'gem') {
          score += 10;
          sounds.playScore();
          this.createParticles(item.x + item.w/2, item.y + item.h/2, varColor('--cyan'));
        } else if (item.type === 'star') {
          score += 30;
          sounds.playScore();
          this.createParticles(item.x + item.w/2, item.y + item.h/2, varColor('--yellow'), 12);
        } else if (item.type === 'magnet') {
          this.magnetTimer = 8000;
          sounds.playTone(600, 'square', 0.15);
          setTimeout(() => sounds.playTone(800, 'square', 0.15), 100);
          this.createParticles(item.x + item.w/2, item.y + item.h/2, varColor('--pink'), 10);
        } else if (item.type === 'heart') {
          if (this.lives < 5) this.lives++;
          sounds.playWin();
          this.createParticles(item.x + item.w/2, item.y + item.h/2, varColor('--green'), 10);
        } else if (item.type === 'bomb') {
          this.lives--;
          this.flashTimer = 200;
          sounds.playHit();
          this.createParticles(item.x + item.w/2, item.y + item.h/2, '#ff3333', 16);
          if (this.lives <= 0) {
            triggerGameOver();
          }
        }
        this.items.splice(i, 1);
      } else if (item.y > this.canvas.height) {
        this.items.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dtSeconds;
      p.y += p.vy * dtSeconds;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#06040f';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.stars.forEach(s => {
      ctx.fillStyle = '#4e4376';
      ctx.fillRect(s.x, s.y, s.size, s.size);
    });

    ctx.strokeStyle = '#1d173d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 385);
    ctx.lineTo(this.canvas.width, 385);
    ctx.stroke();

    this.items.forEach(item => {
      ctx.save();
      
      if (item.type === 'gem') {
        ctx.translate(item.x + item.w / 2, item.y + item.h / 2);
        ctx.rotate(item.angle);
        ctx.fillStyle = item.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -item.w / 2);
        ctx.lineTo(item.w / 2, 0);
        ctx.lineTo(0, item.w / 2);
        ctx.lineTo(-item.w / 2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (item.type === 'star') {
        ctx.translate(item.x + item.w / 2, item.y + item.h / 2);
        ctx.rotate(item.angle);
        ctx.fillStyle = item.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          ctx.lineTo(0, -item.w / 2);
          ctx.rotate(Math.PI / 4);
          ctx.lineTo(0, -item.w / 4);
          ctx.rotate(Math.PI / 4);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (item.type === 'magnet') {
        ctx.translate(item.x + item.w / 2, item.y + item.h / 2);
        ctx.rotate(item.angle);
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 2, item.w / 2 - 2, 0, Math.PI, true);
        ctx.lineTo(-(item.w / 2 - 2), -4);
        ctx.moveTo(item.w / 2 - 2, 2);
        ctx.lineTo(item.w / 2 - 2, -4);
        ctx.stroke();
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-(item.w / 2 - 2), -4);
        ctx.lineTo(-(item.w / 2 - 2), -6);
        ctx.moveTo(item.w / 2 - 2, -4);
        ctx.lineTo(item.w / 2 - 2, -6);
        ctx.stroke();
      } else if (item.type === 'heart') {
        ctx.translate(item.x + item.w / 2, item.y + item.h / 2);
        ctx.rotate(item.angle);
        ctx.fillStyle = item.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -2);
        ctx.quadraticCurveTo(0, -5, -3, -5);
        ctx.quadraticCurveTo(-6, -5, -6, -2);
        ctx.quadraticCurveTo(-6, 1, 0, 6);
        ctx.quadraticCurveTo(6, 1, 6, -2);
        ctx.quadraticCurveTo(6, -5, 3, -5);
        ctx.quadraticCurveTo(0, -5, 0, -2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (item.type === 'bomb') {
        ctx.translate(item.x + item.w / 2, item.y + item.h / 2);
        ctx.fillStyle = item.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 2, item.w / 2 - 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.strokeStyle = '#ffb300';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -(item.w / 2 - 1) + 2);
        ctx.quadraticCurveTo(3, -9, 6, -11);
        ctx.stroke();
        
        ctx.fillStyle = '#ffea00';
        ctx.beginPath();
        ctx.arc(6, -11, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    });

    const currentW = this.magnetTimer > 0 ? 80 : 40;
    ctx.save();
    
    ctx.shadowBlur = 12;
    ctx.shadowColor = this.magnetTimer > 0 ? '#ff007f' : '#00f0ff';
    
    const grad = ctx.createLinearGradient(this.x, this.y, this.x + currentW, this.y + this.h);
    if (this.magnetTimer > 0) {
      grad.addColorStop(0, '#ff007f');
      grad.addColorStop(0.5, '#ff77ff');
      grad.addColorStop(1, '#ff007f');
    } else {
      grad.addColorStop(0, '#00c0ff');
      grad.addColorStop(0.5, '#00ffff');
      grad.addColorStop(1, '#00c0ff');
    }
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + currentW, this.y);
    ctx.lineTo(this.x + currentW - 5, this.y + this.h);
    ctx.lineTo(this.x + 5, this.y + this.h);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(this.x + 2, this.y + 1);
    ctx.lineTo(this.x + currentW - 2, this.y + 1);
    ctx.stroke();

    if (this.magnetTimer > 0) {
      ctx.strokeStyle = '#ff007f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x - 7, this.y + this.h / 2, 6, -Math.PI / 2, Math.PI / 2, true);
      ctx.moveTo(this.x + currentW + 7, this.y + this.h / 2);
      ctx.arc(this.x + currentW + 7, this.y + this.h / 2, 6, -Math.PI / 2, Math.PI / 2, false);
      ctx.stroke();
    }
    
    ctx.restore();

    ctx.save();
    this.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.restore();

    for (let i = 0; i < this.lives; i++) {
      const hx = 15 + i * 20;
      const hy = 15;
      ctx.save();
      ctx.fillStyle = '#39ff14';
      ctx.beginPath();
      ctx.moveTo(hx, hy + 3);
      ctx.bezierCurveTo(hx, hy, hx - 3, hy, hx - 3, hy + 3);
      ctx.bezierCurveTo(hx - 3, hy + 6, hx, hy + 9, hx, hy + 11);
      ctx.bezierCurveTo(hx, hy + 9, hx + 3, hy + 6, hx + 3, hy + 3);
      ctx.bezierCurveTo(hx + 3, hy, hx, hy, hx, hy + 3);
      ctx.fill();
      ctx.restore();
    }

    if (this.magnetTimer > 0) {
      ctx.fillStyle = '#ff007f';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`MAGNET: ${(this.magnetTimer / 1000).toFixed(1)}s`, this.canvas.width - 15, 20);
      
      const barW = 60;
      const barH = 4;
      const barX = this.canvas.width - 15 - barW;
      const barY = 24;
      
      ctx.fillStyle = '#1d173d';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#ff007f';
      ctx.fillRect(barX, barY, barW * (this.magnetTimer / 8000), barH);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(barX, barY, barW, barH);
    }

    if (this.flashTimer > 0) {
      ctx.fillStyle = `rgba(255, 0, 0, ${0.35 * (this.flashTimer / 200)})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  cleanup() {
    this.items = [];
    this.particles = [];
    this.stars = [];
  }
}

// ----------------------------------------------------
// 15.6 GAME ENGINE 14: NEON JUMPER
// ----------------------------------------------------
class PixelJumperGame {
  constructor(canvas, diff) {
    this.canvas = canvas;
    this.diff = diff;
    
    this.player = {
      x: 180,
      y: 320,
      w: 20,
      h: 20,
      vx: 0,
      vy: 0,
      speed: 300,
      accel: 0.18,
      drag: 0.82
    };
    
    this.gravity = 420;
    this.bounceVel = -280;
    this.springVel = -540;
    
    this.cameraY = 0;
    this.highestY = 320;
    this.highestPlatformY = 380;
    
    this.platforms = [];
    this.particles = [];
    this.stars = [];
    
    this.jetpackTimer = 0;
    this.flashTimer = 0;
    this.timeElapsed = 0;
    this.starBonusScore = 0;
    
    if (diff === 'easy') {
      this.baseSpacing = 50;
      this.maxSpacing = 90;
    } else if (diff === 'normal') {
      this.baseSpacing = 70;
      this.maxSpacing = 115;
    } else {
      this.baseSpacing = 95;
      this.maxSpacing = 145;
    }
  }

  init() {
    this.player.x = 200 - this.player.w / 2;
    this.player.y = 300;
    this.player.vx = 0;
    this.player.vy = 0;
    
    this.cameraY = 100;
    this.highestY = 300;
    this.highestPlatformY = 380;
    
    this.platforms = [];
    this.particles = [];
    this.jetpackTimer = 0;
    this.flashTimer = 0;
    this.timeElapsed = 0;
    this.starBonusScore = 0;
    
    if (this.diff === 'easy') {
      this.baseSpacing = 50;
      this.maxSpacing = 90;
    } else if (this.diff === 'normal') {
      this.baseSpacing = 70;
      this.maxSpacing = 115;
    } else {
      this.baseSpacing = 95;
      this.maxSpacing = 145;
    }

    this.platforms.push({
      x: 80,
      y: 370,
      w: 240,
      h: 8,
      type: 'normal',
      item: null
    });
    
    while (this.highestPlatformY > -200) {
      this.generatePlatform();
    }

    this.stars = [];
    for (let i = 0; i < 30; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: 0.8 + Math.random() * 1.5,
        speed: 10 + Math.random() * 20
      });
    }
  }

  handleInput(key, type) {}

  generatePlatform() {
    const scale = Math.min(1.6, 1 + Math.abs(this.highestPlatformY) / 10000);
    const spacing = Math.min(this.maxSpacing, this.baseSpacing * scale) + Math.random() * 30;
    const nextY = this.highestPlatformY - spacing;
    this.highestPlatformY = nextY;

    const pw = 45;
    const px = 10 + Math.random() * (this.canvas.width - pw - 20);
    const ph = 8;
    
    let type = 'normal';
    const r = Math.random();
    
    let movingWeight = 0.20;
    let brokenWeight = 0.15;
    if (this.diff === 'normal') { movingWeight = 0.25; brokenWeight = 0.20; }
    if (this.diff === 'hard') { movingWeight = 0.30; brokenWeight = 0.30; }

    if (r < movingWeight) {
      type = 'moving';
    } else if (r < movingWeight + brokenWeight) {
      type = 'broken';
    }

    let item = null;
    if (type === 'normal') {
      const ir = Math.random();
      if (ir < 0.06) {
        type = 'spring';
      } else if (ir < 0.15) {
        item = { type: 'star', collected: false, offset: pw / 2 };
      } else if (ir < 0.17) {
        item = { type: 'jetpack', collected: false, offset: pw / 2 };
      }
    } else if (type === 'moving') {
      const ir = Math.random();
      if (ir < 0.15) {
        item = { type: 'star', collected: false, offset: pw / 2 };
      }
    }

    this.platforms.push({
      x: px,
      y: nextY,
      w: pw,
      h: ph,
      type: type,
      speed: 40 + Math.random() * 60,
      dir: Math.random() > 0.5 ? 1 : -1,
      item: item
    });
  }

  createParticles(x, y, color, count = 8, scale = 1) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (20 + Math.random() * 50) * scale;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        size: 1.5 + Math.random() * 2.5,
        life: 300 + Math.random() * 300,
        maxLife: 600
      });
    }
  }

  update(dt) {
    const dtSeconds = dt / 1000;
    this.timeElapsed += dt;

    if (this.jetpackTimer > 0) {
      this.jetpackTimer = Math.max(0, this.jetpackTimer - dt);
      this.player.vy = -450;
      
      if (Math.random() < 0.45) {
        this.particles.push({
          x: this.player.x + this.player.w / 2 - 2 + (Math.random() - 0.5) * 6,
          y: this.player.y + this.player.h,
          vx: (Math.random() - 0.5) * 40,
          vy: 200 + Math.random() * 100,
          color: Math.random() > 0.5 ? '#ff007f' : '#ffd700',
          size: 2 + Math.random() * 3,
          life: 200 + Math.random() * 200,
          maxLife: 400
        });
      }
    } else {
      this.player.vy += this.gravity * dtSeconds;
    }

    let targetVx = 0;
    if (keysPressed['ArrowLeft'] || keysPressed['a'] || keysPressed['A']) {
      targetVx = -this.player.speed;
    } else if (keysPressed['ArrowRight'] || keysPressed['d'] || keysPressed['D']) {
      targetVx = this.player.speed;
    }
    this.player.vx += (targetVx - this.player.vx) * this.player.accel;
    
    this.player.x += this.player.vx * dtSeconds;
    this.player.y += this.player.vy * dtSeconds;

    if (this.player.x < -this.player.w) {
      this.player.x = this.canvas.width;
    } else if (this.player.x > this.canvas.width) {
      this.player.x = -this.player.w;
    }

    this.stars.forEach(s => {
      s.y += (s.speed + (this.player.vy < 0 ? -this.player.vy * 0.15 : 0)) * dtSeconds;
      if (s.y > this.canvas.height) {
        s.y = 0;
        s.x = Math.random() * this.canvas.width;
      }
    });

    if (this.player.vy > 0 && this.jetpackTimer <= 0) {
      const px = this.player.x;
      const py = this.player.y;
      const pw = this.player.w;
      const ph = this.player.h;

      for (let i = 0; i < this.platforms.length; i++) {
        const plat = this.platforms[i];
        
        const collides = (
          px + pw - 4 >= plat.x && 
          px + 4 <= plat.x + plat.w && 
          py + ph >= plat.y && 
          py + ph <= plat.y + 12
        );
        
        if (collides) {
          if (plat.type === 'broken') {
            sounds.playHit();
            this.createParticles(plat.x + plat.w/2, plat.y + plat.h/2, '#ff3333', 12, 1.2);
            this.platforms.splice(i, 1);
            i--;
          } else if (plat.type === 'spring') {
            this.player.vy = this.springVel;
            sounds.playTone(450, 'square', 0.1, 800);
            this.createParticles(plat.x + plat.w/2, plat.y, varColor('--pink'), 10, 1.3);
          } else {
            this.player.vy = this.bounceVel;
            sounds.playTone(320, 'triangle', 0.06);
            this.createParticles(plat.x + plat.w/2, plat.y, varColor('--cyan'), 6, 0.7);
          }
          break;
        }
      }
    }

    this.platforms.forEach(plat => {
      if (plat.item && !plat.item.collected) {
        const itemX = plat.x + plat.item.offset;
        const itemY = plat.y - 12;
        const itemSize = 12;
        
        const px = this.player.x;
        const py = this.player.y;
        const pw = this.player.w;
        const ph = this.player.h;

        const collides = (
          px + pw >= itemX - itemSize/2 &&
          px <= itemX + itemSize/2 &&
          py + ph >= itemY - itemSize/2 &&
          py <= itemY + itemSize/2
        );

        if (collides) {
          plat.item.collected = true;
          if (plat.item.type === 'star') {
            this.starBonusScore += 50;
            sounds.playScore();
            this.createParticles(itemX, itemY, varColor('--yellow'), 10);
          } else if (plat.item.type === 'jetpack') {
            this.jetpackTimer = 2200;
            sounds.playWin();
            this.createParticles(itemX, itemY, varColor('--pink'), 14, 1.5);
          }
        }
      }
    });

    this.platforms.forEach(plat => {
      if (plat.type === 'moving') {
        plat.x += plat.speed * plat.dir * dtSeconds;
        if (plat.x < 10) {
          plat.x = 10;
          plat.dir = 1;
        } else if (plat.x + plat.w > this.canvas.width - 10) {
          plat.x = this.canvas.width - plat.w - 10;
          plat.dir = -1;
        }
      }
    });

    if (this.player.y < this.highestY) {
      this.highestY = this.player.y;
    }

    const altitude = Math.floor(Math.abs(this.highestY - 300) / 8);
    score = Math.max(score, altitude + this.starBonusScore);

    const targetCamY = this.player.y - 180;
    if (targetCamY < this.cameraY) {
      this.cameraY += (targetCamY - this.cameraY) * 0.15;
    }

    this.platforms = this.platforms.filter(plat => plat.y < this.cameraY + 450);
    while (this.highestPlatformY > this.cameraY - 200) {
      this.generatePlatform();
    }

    if (this.player.y > this.cameraY + 410) {
      triggerGameOver();
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dtSeconds;
      p.y += p.vy * dtSeconds;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#060412';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.stars.forEach(s => {
      ctx.fillStyle = '#3e346b';
      ctx.fillRect(s.x, s.y, s.size, s.size);
    });

    this.platforms.forEach(plat => {
      ctx.save();
      const vy = plat.y - this.cameraY;
      
      if (plat.type === 'broken') {
        ctx.strokeStyle = '#ff3333';
        ctx.lineWidth = 3;
        ctx.fillStyle = '#420d0d';
        ctx.beginPath();
        ctx.roundRect(plat.x, vy, plat.w / 2 - 3, plat.h, 2);
        ctx.roundRect(plat.x + plat.w / 2 + 3, vy, plat.w / 2 - 3, plat.h, 2);
        ctx.fill();
        ctx.stroke();
      } else if (plat.type === 'spring') {
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 3;
        ctx.fillStyle = '#0a2e33';
        ctx.beginPath();
        ctx.roundRect(plat.x, vy, plat.w, plat.h, 3);
        ctx.fill();
        ctx.stroke();
        
        ctx.strokeStyle = '#ff007f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const sx = plat.x + plat.w / 2;
        ctx.moveTo(sx - 7, vy);
        ctx.lineTo(sx + 7, vy - 2);
        ctx.lineTo(sx - 5, vy - 4);
        ctx.lineTo(sx + 5, vy - 6);
        ctx.lineTo(sx - 7, vy - 8);
        ctx.lineTo(sx + 7, vy - 8);
        ctx.stroke();
      } else if (plat.type === 'moving') {
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3;
        ctx.fillStyle = '#423b08';
        ctx.beginPath();
        ctx.roundRect(plat.x, vy, plat.w, plat.h, 3);
        ctx.fill();
        ctx.stroke();
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(plat.x + 5, vy + 4);
        ctx.lineTo(plat.x + 10, vy + 4);
        ctx.moveTo(plat.x + plat.w - 10, vy + 4);
        ctx.lineTo(plat.x + plat.w - 5, vy + 4);
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#39ff14';
        ctx.lineWidth = 3;
        ctx.fillStyle = '#0c3808';
        ctx.beginPath();
        ctx.roundRect(plat.x, vy, plat.w, plat.h, 3);
        ctx.fill();
        ctx.stroke();
      }
      
      if (plat.item && !plat.item.collected) {
        const ix = plat.x + plat.item.offset;
        const iy = plat.y - 12 - this.cameraY;
        
        if (plat.item.type === 'star') {
          ctx.save();
          ctx.translate(ix, iy);
          ctx.rotate(this.timeElapsed * 0.0035);
          ctx.fillStyle = '#ffd700';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            ctx.lineTo(0, -6);
            ctx.rotate(Math.PI / 4);
            ctx.lineTo(0, -3);
            ctx.rotate(Math.PI / 4);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        } else if (plat.item.type === 'jetpack') {
          ctx.save();
          ctx.translate(ix - 5, iy - 6);
          ctx.fillStyle = '#ff007f';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.roundRect(0, 0, 10, 12, 2);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = '#cccccc';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(2, 0); ctx.lineTo(2, 12);
          ctx.moveTo(8, 0); ctx.lineTo(8, 12);
          ctx.stroke();
          ctx.restore();
        }
      }
      
      ctx.restore();
    });

    const px = this.player.x;
    const py = this.player.y - this.cameraY;
    const pw = this.player.w;
    const ph = this.player.h;

    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#39ff14';
    ctx.fillStyle = '#39ff14';
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 4);
    ctx.fill();

    ctx.fillStyle = '#000000';
    if (this.player.vy < -120) {
      ctx.fillRect(px + 4, py + 4, 3, 5);
      ctx.fillRect(px + pw - 7, py + 4, 3, 5);
    } else if (this.player.vy > 120) {
      ctx.fillRect(px + 4, py + 6, 3, 3);
      ctx.fillRect(px + pw - 7, py + 6, 3, 3);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + pw/2 - 2, py + 12, 4, 3);
    } else {
      ctx.fillRect(px + 4, py + 5, 3, 3);
      ctx.fillRect(px + pw - 7, py + 5, 3, 3);
      ctx.fillRect(px + pw/2 - 2, py + 11, 4, 2);
    }

    if (this.jetpackTimer > 0) {
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ff007f';
      ctx.fillStyle = '#ff007f';
      ctx.beginPath();
      if (this.player.vx >= 0) {
        ctx.roundRect(px - 5, py + 3, 6, 14, 2);
      } else {
        ctx.roundRect(px + pw - 1, py + 3, 6, 14, 2);
      }
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    this.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.restore();

    if (this.jetpackTimer > 0) {
      ctx.save();
      ctx.fillStyle = '#ff007f';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`JETPACK: ${(this.jetpackTimer / 1000).toFixed(1)}s`, this.canvas.width - 15, 20);
      
      const barW = 60;
      const barH = 4;
      const barX = this.canvas.width - 15 - barW;
      const barY = 24;
      
      ctx.fillStyle = '#1e1c3a';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#ff007f';
      ctx.fillRect(barX, barY, barW * (this.jetpackTimer / 2200), barH);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(barX, barY, barW, barH);
      ctx.restore();
    }
  }

  cleanup() {
    this.platforms = [];
    this.particles = [];
    this.stars = [];
  }
}

// ----------------------------------------------------
// 15.7 GAME ENGINE 15: NEON PONG
// ----------------------------------------------------
class PixelPongGame {
  constructor(canvas, diff) {
    this.canvas = canvas;
    this.diff = diff;
    
    this.paddleW = 55;
    this.paddleH = 8;
    
    this.playerX = 172.5;
    this.playerY = 375;
    this.playerSpeed = 6.5;
    
    this.cpuX = 172.5;
    this.cpuY = 17;
    this.cpuSpeed = 3.5;
    
    this.ball = {
      x: 200,
      y: 200,
      w: 8,
      h: 8,
      vx: 0,
      vy: 0,
      speed: 180
    };
    
    this.playerScore = 0;
    this.cpuScore = 0;
    
    this.particles = [];
    this.shakeTimer = 0;
    this.flashColor = null;
    this.flashTimer = 0;
    this.timeElapsed = 0;
    
    if (diff === 'easy') {
      this.cpuSpeed = 2.4;
      this.ballStartSpeed = 150;
      this.speedIncrement = 1.05;
    } else if (diff === 'normal') {
      this.cpuSpeed = 3.8;
      this.ballStartSpeed = 200;
      this.speedIncrement = 1.08;
    } else {
      this.cpuSpeed = 5.5;
      this.ballStartSpeed = 260;
      this.speedIncrement = 1.11;
    }
  }

  init() {
    this.playerX = 200 - this.paddleW / 2;
    this.cpuX = 200 - this.paddleW / 2;
    
    this.playerScore = 0;
    this.cpuScore = 0;
    
    this.particles = [];
    this.shakeTimer = 0;
    this.flashTimer = 0;
    this.timeElapsed = 0;
    
    if (this.diff === 'easy') {
      this.cpuSpeed = 2.4;
      this.ballStartSpeed = 150;
      this.speedIncrement = 1.05;
    } else if (this.diff === 'normal') {
      this.cpuSpeed = 3.8;
      this.ballStartSpeed = 200;
      this.speedIncrement = 1.08;
    } else {
      this.cpuSpeed = 5.5;
      this.ballStartSpeed = 260;
      this.speedIncrement = 1.11;
    }

    this.resetBall(1);
  }

  resetBall(serveDir) {
    this.ball.x = 200 - this.ball.w / 2;
    this.ball.y = 200 - this.ball.h / 2;
    this.ball.speed = this.ballStartSpeed;
    
    const angle = (serveDir > 0) ? 
                  (Math.PI / 4 + Math.random() * Math.PI / 2) : 
                  (-Math.PI / 4 - Math.random() * Math.PI / 2);
                  
    this.ball.vx = Math.cos(angle) * this.ball.speed;
    this.ball.vy = Math.sin(angle) * this.ball.speed;
  }

  handleInput(key, type) {}

  createParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 60;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        size: 1.5 + Math.random() * 2,
        life: 300 + Math.random() * 300,
        maxLife: 600
      });
    }
  }

  update(dt) {
    const dtSeconds = dt / 1000;
    this.timeElapsed += dt;

    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    }
    if (this.flashTimer > 0) {
      this.flashTimer = Math.max(0, this.flashTimer - dt);
    }

    if (keysPressed['ArrowLeft'] || keysPressed['a'] || keysPressed['A']) {
      this.playerX = Math.max(8, this.playerX - this.playerSpeed);
    }
    if (keysPressed['ArrowRight'] || keysPressed['d'] || keysPressed['D']) {
      this.playerX = Math.min(this.canvas.width - this.paddleW - 8, this.playerX + this.playerSpeed);
    }

    const targetCpuX = this.ball.x + this.ball.w / 2 - this.paddleW / 2;
    const diffX = targetCpuX - this.cpuX;
    
    let activeCPU = true;
    if (this.diff === 'easy' && this.ball.vy > 0 && this.ball.y > 150) {
      activeCPU = false;
    }
    
    if (activeCPU) {
      this.cpuX += Math.sign(diffX) * Math.min(Math.abs(diffX), this.cpuSpeed);
      this.cpuX = Math.max(8, Math.min(this.canvas.width - this.paddleW - 8, this.cpuX));
    }

    this.ball.x += this.ball.vx * dtSeconds;
    this.ball.y += this.ball.vy * dtSeconds;

    if (this.ball.x < 8) {
      this.ball.x = 8;
      this.ball.vx = -this.ball.vx;
      sounds.playTone(200, 'triangle', 0.05);
      this.createParticles(8, this.ball.y + this.ball.h / 2, varColor('--cyan'), 4);
    } else if (this.ball.x + this.ball.w > this.canvas.width - 8) {
      this.ball.x = this.canvas.width - 8 - this.ball.w;
      this.ball.vx = -this.ball.vx;
      sounds.playTone(200, 'triangle', 0.05);
      this.createParticles(this.canvas.width - 8, this.ball.y + this.ball.h / 2, varColor('--cyan'), 4);
    }

    if (this.ball.vy > 0 && 
        this.ball.y + this.ball.h >= this.playerY && 
        this.ball.y <= this.playerY + this.paddleH &&
        this.ball.x + this.ball.w >= this.playerX && 
        this.ball.x <= this.playerX + this.paddleW) {
      
      this.ball.y = this.playerY - this.ball.h;
      
      const relativeX = (this.ball.x + this.ball.w / 2) - (this.playerX + this.paddleW / 2);
      const normalizedHit = relativeX / (this.paddleW / 2);
      const bounceAngle = -Math.PI / 2 + normalizedHit * (Math.PI / 3.5);
      
      this.ball.speed = Math.min(450, this.ball.speed * this.speedIncrement);
      this.ball.vx = Math.cos(bounceAngle) * this.ball.speed;
      this.ball.vy = Math.sin(bounceAngle) * this.ball.speed;
      
      score += 10;
      sounds.playTone(480, 'triangle', 0.08);
      this.createParticles(this.ball.x + this.ball.w/2, this.playerY, varColor('--green'), 8);
      this.shakeTimer = 100;
    }

    if (this.ball.vy < 0 && 
        this.ball.y <= this.cpuY + this.paddleH && 
        this.ball.y + this.ball.h >= this.cpuY &&
        this.ball.x + this.ball.w >= this.cpuX && 
        this.ball.x <= this.cpuX + this.paddleW) {
      
      this.ball.y = this.cpuY + this.paddleH;
      
      const relativeX = (this.ball.x + this.ball.w / 2) - (this.cpuX + this.paddleW / 2);
      const normalizedHit = relativeX / (this.paddleW / 2);
      const bounceAngle = Math.PI / 2 + normalizedHit * (Math.PI / 3.5);
      
      this.ball.speed = Math.min(450, this.ball.speed * this.speedIncrement);
      this.ball.vx = Math.cos(bounceAngle) * this.ball.speed;
      this.ball.vy = Math.sin(bounceAngle) * this.ball.speed;
      
      sounds.playTone(440, 'triangle', 0.08);
      this.createParticles(this.ball.x + this.ball.w/2, this.cpuY + this.paddleH, varColor('--pink'), 8);
      this.shakeTimer = 100;
    }

    if (this.ball.y < 0) {
      this.playerScore++;
      score += 100;
      sounds.playScore();
      this.flashColor = 'rgba(57, 255, 20, 0.2)';
      this.flashTimer = 250;
      
      if (this.playerScore >= 5) {
        score += 500;
        sounds.playWin();
        triggerGameOver();
      } else {
        this.resetBall(1);
      }
    } else if (this.ball.y > this.canvas.height) {
      this.cpuScore++;
      sounds.playHit();
      this.flashColor = 'rgba(255, 0, 127, 0.2)';
      this.flashTimer = 250;
      
      if (this.cpuScore >= 5) {
        triggerGameOver();
      } else {
        this.resetBall(-1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dtSeconds;
      p.y += p.vy * dtSeconds;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.save();

    if (this.shakeTimer > 0) {
      const shakeAmt = 3;
      const dx = (Math.random() - 0.5) * shakeAmt;
      const dy = (Math.random() - 0.5) * shakeAmt;
      ctx.translate(dx, dy);
    }

    ctx.fillStyle = '#060411';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.strokeStyle = '#1b1236';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 12]);
    ctx.beginPath();
    ctx.moveTo(8, 200);
    ctx.lineTo(this.canvas.width - 8, 200);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = '#1d173d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(8, this.canvas.height);
    ctx.moveTo(this.canvas.width - 8, 0);
    ctx.lineTo(this.canvas.width - 8, this.canvas.height);
    ctx.stroke();

    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillText(this.cpuScore, 200, 150);
    ctx.fillText(this.playerScore, 200, 280);
    ctx.font = 'bold 10px monospace';
    ctx.fillText('CPU', 200, 110);
    ctx.fillText('PLAYER', 200, 310);

    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ffd700';
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(this.ball.x, this.ball.y, this.ball.w, this.ball.h);
    ctx.restore();

    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#39ff14';
    ctx.fillStyle = '#39ff14';
    ctx.beginPath();
    ctx.roundRect(this.playerX, this.playerY, this.paddleW, this.paddleH, 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff007f';
    ctx.fillStyle = '#ff007f';
    ctx.beginPath();
    ctx.roundRect(this.cpuX, this.cpuY, this.paddleW, this.paddleH, 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    this.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.restore();

    if (this.flashTimer > 0 && this.flashColor) {
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    ctx.restore();
  }

  cleanup() {
    this.particles = [];
  }
}

// ----------------------------------------------------
// 15.8 GAME ENGINE 16: TIME WARP (CHRONO DODGE)
// ----------------------------------------------------
class TimeWarpGame {
  constructor(canvas, diff) {
    this.canvas = canvas;
    this.diff = diff;
    
    this.player = { x: 200, y: 200, r: 6, speed: 180 };
    this.bullets = [];
    this.particles = [];
    
    this.spawnTimer = 0;
    this.spawnInterval = 900; // ms (real time)
    this.timeElapsed = 0;
    
    if (diff === 'easy') {
      this.spawnInterval = 1200;
      this.bulletSpeed = 110;
    } else if (diff === 'normal') {
      this.spawnInterval = 850;
      this.bulletSpeed = 150;
    } else {
      this.spawnInterval = 600;
      this.bulletSpeed = 200;
    }
  }

  init() {
    this.player.x = 200;
    this.player.y = 200;
    this.bullets = [];
    this.particles = [];
    this.timeElapsed = 0;
    this.spawnTimer = 0;
    
    if (this.diff === 'easy') {
      this.spawnInterval = 1200;
      this.bulletSpeed = 110;
    } else if (this.diff === 'normal') {
      this.spawnInterval = 850;
      this.bulletSpeed = 150;
    } else {
      this.spawnInterval = 600;
      this.bulletSpeed = 200;
    }
  }

  handleInput(key, type) {}

  spawnBullet() {
    // Spawn from a random screen edge
    const rSide = Math.floor(Math.random() * 4);
    let bx = 0, by = 0;
    
    if (rSide === 0) {
      // Top
      bx = Math.random() * this.canvas.width;
      by = -10;
    } else if (rSide === 1) {
      // Right
      bx = this.canvas.width + 10;
      by = Math.random() * this.canvas.height;
    } else if (rSide === 2) {
      // Bottom
      bx = Math.random() * this.canvas.width;
      by = this.canvas.height + 10;
    } else {
      // Left
      bx = -10;
      by = Math.random() * this.canvas.height;
    }

    // Aim towards player's current position plus a tiny random spread
    const destX = this.player.x + (Math.random() - 0.5) * 30;
    const destY = this.player.y + (Math.random() - 0.5) * 30;
    
    const angle = Math.atan2(destY - by, destX - bx);
    const speedScale = 0.8 + Math.random() * 0.4;
    
    this.bullets.push({
      x: bx,
      y: by,
      vx: Math.cos(angle) * this.bulletSpeed * speedScale,
      vy: Math.sin(angle) * this.bulletSpeed * speedScale,
      r: 3.5,
      color: '#ff3333'
    });
  }

  update(dt) {
    const dtSeconds = dt / 1000;
    
    // Check if player is moving
    let isMoving = false;
    let dx = 0, dy = 0;
    
    if (keysPressed['ArrowLeft'] || keysPressed['a'] || keysPressed['A']) {
      dx = -1;
      isMoving = true;
    } else if (keysPressed['ArrowRight'] || keysPressed['d'] || keysPressed['D']) {
      dx = 1;
      isMoving = true;
    }
    
    if (keysPressed['ArrowUp'] || keysPressed['w'] || keysPressed['W']) {
      dy = -1;
      isMoving = true;
    } else if (keysPressed['ArrowDown'] || keysPressed['s'] || keysPressed['S']) {
      dy = 1;
      isMoving = true;
    }

    // Time scaling: standing still slows time down to 6%
    const timeScale = isMoving ? 1.0 : 0.06;
    this.timeElapsed += dt * timeScale;
    
    // Move player in real-time
    if (isMoving) {
      // Normalize diagonals
      if (dx !== 0 && dy !== 0) {
        dx *= 0.7071;
        dy *= 0.7071;
      }
      this.player.x = Math.max(10, Math.min(this.canvas.width - 10, this.player.x + dx * this.player.speed * dtSeconds));
      this.player.y = Math.max(10, Math.min(this.canvas.height - 10, this.player.y + dy * this.player.speed * dtSeconds));
    }

    // Bullet Spawning (ticks in real-time so bullets accumulate when standing still!)
    this.spawnTimer += dt;
    const currentInterval = Math.max(250, this.spawnInterval - (this.timeElapsed / 150));
    if (this.spawnTimer >= currentInterval) {
      this.spawnTimer = 0;
      this.spawnBullet();
    }

    // Move Bullets (time-scaled)
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dtSeconds * timeScale;
      b.y += b.vy * dtSeconds * timeScale;
      
      // Collision check
      const dist = Math.hypot(this.player.x - b.x, this.player.y - b.y);
      if (dist < this.player.r + b.r) {
        sounds.playHit();
        triggerGameOver();
        return;
      }

      // Cleanup off-screen bullets
      if (b.x < -40 || b.x > this.canvas.width + 40 || b.y < -40 || b.y > this.canvas.height + 40) {
        this.bullets.splice(i, 1);
      }
    }

    // Score based on time elapsed
    score = Math.floor(this.timeElapsed / 100);
  }

  draw(ctx) {
    // Draw background
    ctx.fillStyle = '#05030e';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw time warp radar lines
    ctx.strokeStyle = '#1b123d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(200, 200, 100, 0, Math.PI * 2);
    ctx.arc(200, 200, 180, 0, Math.PI * 2);
    ctx.moveTo(0, 0); ctx.lineTo(400, 400);
    ctx.moveTo(400, 0); ctx.lineTo(0, 400);
    ctx.stroke();

    // Draw bullets
    this.bullets.forEach(b => {
      ctx.save();
      // Neon glow
      ctx.shadowBlur = 8;
      ctx.shadowColor = b.color;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Draw Player
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#00f0ff';
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.player.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw HUD indicator
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    
    // Check if keys pressed to determine indicator
    let isMoving = keysPressed['ArrowLeft'] || keysPressed['ArrowRight'] || keysPressed['ArrowUp'] || keysPressed['ArrowDown'] ||
                    keysPressed['a'] || keysPressed['d'] || keysPressed['w'] || keysPressed['s'];
                    
    if (isMoving) {
      ctx.fillStyle = '#ff007f';
      ctx.fillText('TIME: RUNNING', 15, 20);
    } else {
      ctx.fillStyle = '#39ff14';
      ctx.fillText('TIME: FROZEN', 15, 20);
    }
  }

  cleanup() {
    this.bullets = [];
  }
}

// ----------------------------------------------------
// 15.9 GAME ENGINE 17: NEON BEAT (RHYTHM GAME)
// ----------------------------------------------------
class NeonBeatGame {
  constructor(canvas, diff) {
    this.canvas = canvas;
    this.diff = diff;
    
    this.lanes = [100, 200, 300];
    this.targetY = 340;
    this.notes = [];
    this.particles = [];
    
    this.spawnTimer = 0;
    this.spawnInterval = 750; // ms
    this.timeElapsed = 0;
    this.combo = 0;
    this.maxCombo = 0;
    
    this.lives = 3;
    this.noteSpeed = 200; // px/sec
    
    // Synth notes sequence
    this.synthProgression = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25]; // C major notes
    this.synthIndex = 0;
    
    this.feedbackText = '';
    this.feedbackColor = '#ffffff';
    this.feedbackTimer = 0;
    
    if (diff === 'easy') {
      this.lives = 4;
      this.spawnInterval = 950;
      this.noteSpeed = 170;
    } else if (diff === 'normal') {
      this.lives = 3;
      this.spawnInterval = 750;
      this.noteSpeed = 220;
    } else {
      this.lives = 2;
      this.spawnInterval = 550;
      this.noteSpeed = 280;
    }
  }

  init() {
    this.notes = [];
    this.particles = [];
    this.combo = 0;
    this.maxCombo = 0;
    this.timeElapsed = 0;
    this.spawnTimer = 0;
    this.synthIndex = 0;
    this.feedbackText = '';
    this.feedbackTimer = 0;
    
    if (this.diff === 'easy') {
      this.lives = 4;
      this.spawnInterval = 950;
      this.noteSpeed = 170;
    } else if (this.diff === 'normal') {
      this.lives = 3;
      this.spawnInterval = 750;
      this.noteSpeed = 220;
    } else {
      this.lives = 2;
      this.spawnInterval = 550;
      this.noteSpeed = 280;
    }
  }

  handleInput(key, type) {
    if (type !== 'keydown') return;
    
    let targetLane = -1;
    if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      targetLane = 0;
    } else if (key === 'ArrowUp' || key === 'w' || key === 'W' || key === 'MID') {
      targetLane = 1;
    } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      targetLane = 2;
    }
    
    if (targetLane !== -1) {
      this.checkHit(targetLane);
    }
  }

  checkHit(laneIdx) {
    const laneX = this.lanes[laneIdx];
    
    // Find closest note in this lane
    let closestNoteIdx = -1;
    let minDist = 999;
    
    for (let i = 0; i < this.notes.length; i++) {
      const note = this.notes[i];
      if (note.lane === laneIdx) {
        const dist = Math.abs(note.y - this.targetY);
        if (dist < minDist) {
          minDist = dist;
          closestNoteIdx = i;
        }
      }
    }

    if (closestNoteIdx !== -1 && minDist < 36) {
      const note = this.notes[closestNoteIdx];
      let pts = 0;
      
      if (minDist < 14) {
        // Perfect
        this.feedbackText = 'PERFECT!';
        this.feedbackColor = '#39ff14';
        pts = 50;
        this.combo++;
        this.playSynthNote(true);
        this.createSparks(laneX, note.y, varColor('--green'), 12);
      } else {
        // Great
        this.feedbackText = 'GREAT';
        this.feedbackColor = '#00f0ff';
        pts = 20;
        this.combo++;
        this.playSynthNote(false);
        this.createSparks(laneX, note.y, varColor('--cyan'), 6);
      }
      
      this.feedbackTimer = 350;
      
      // Calculate multiplier
      const mult = Math.min(4, 1 + Math.floor(this.combo / 10));
      score += pts * mult;
      
      this.notes.splice(closestNoteIdx, 1);
    } else {
      // Miss on empty trigger
      this.triggerMiss();
    }
  }

  triggerMiss() {
    this.feedbackText = 'MISS';
    this.feedbackColor = '#ff007f';
    this.feedbackTimer = 350;
    this.combo = 0;
    this.lives--;
    sounds.playTone(120, 'sawtooth', 0.15);
    
    if (this.lives <= 0) {
      triggerGameOver();
    }
  }

  playSynthNote(isPerfect) {
    const freq = this.synthProgression[this.synthIndex];
    this.synthIndex = (this.synthIndex + 1) % this.synthProgression.length;
    
    const wave = isPerfect ? 'triangle' : 'sine';
    sounds.playTone(freq, wave, 0.12);
  }

  createSparks(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        size: 2 + Math.random() * 2,
        life: 250 + Math.random() * 250,
        maxLife: 500
      });
    }
  }

  update(dt) {
    const dtSeconds = dt / 1000;
    this.timeElapsed += dt;

    if (this.feedbackTimer > 0) {
      this.feedbackTimer = Math.max(0, this.feedbackTimer - dt);
    }

    // Spawn notes
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      const rLane = Math.floor(Math.random() * 3);
      this.notes.push({
        lane: rLane,
        y: -10,
        w: 24,
        h: 8
      });
    }

    // Move notes down
    for (let i = this.notes.length - 1; i >= 0; i--) {
      const n = this.notes[i];
      n.y += this.noteSpeed * dtSeconds;
      
      // Miss if note falls past target zone
      if (n.y > this.targetY + 28) {
        this.notes.splice(i, 1);
        this.triggerMiss();
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dtSeconds;
      p.y += p.vy * dtSeconds;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#03020b';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw tracks
    ctx.strokeStyle = '#150f33';
    ctx.lineWidth = 2;
    this.lanes.forEach(lx => {
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, this.canvas.height);
      ctx.stroke();
    });

    // Draw target line
    ctx.strokeStyle = '#2d1b5c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(40, this.targetY);
    ctx.lineTo(360, this.targetY);
    ctx.stroke();

    // Draw target circles
    this.lanes.forEach((lx, idx) => {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.arc(lx, this.targetY, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Draw label icons inside target
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      const lbl = idx === 0 ? '◀' : (idx === 1 ? '▲' : '▶');
      ctx.fillText(lbl, lx, this.targetY + 3);
    });

    // Draw notes
    this.notes.forEach(n => {
      ctx.save();
      const lx = this.lanes[n.lane];
      
      let noteColor = varColor('--cyan');
      if (n.lane === 1) noteColor = varColor('--yellow');
      else if (n.lane === 2) noteColor = varColor('--pink');
      
      ctx.shadowBlur = 8;
      ctx.shadowColor = noteColor;
      ctx.fillStyle = noteColor;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      
      ctx.beginPath();
      ctx.roundRect(lx - n.w/2, n.y - n.h/2, n.w, n.h, 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // Draw sparks
    ctx.save();
    this.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.restore();

    // Draw lives (hearts)
    for (let i = 0; i < this.lives; i++) {
      const hx = 15 + i * 20;
      const hy = 15;
      ctx.fillStyle = '#ff007f';
      ctx.beginPath();
      ctx.arc(hx + 3, hy + 3, 3, Math.PI, 0, false);
      ctx.arc(hx + 9, hy + 3, 3, Math.PI, 0, false);
      ctx.lineTo(hx + 6, hy + 9);
      ctx.closePath();
      ctx.fill();
    }

    // Combo Counter
    if (this.combo > 0) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${this.combo}`, this.canvas.width - 20, 30);
      ctx.font = '9px monospace';
      ctx.fillText('COMBO', this.canvas.width - 20, 42);
      
      const mult = Math.min(4, 1 + Math.floor(this.combo / 10));
      if (mult > 1) {
        ctx.fillStyle = '#39ff14';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`${mult}x`, this.canvas.width - 20, 56);
      }
    }

    // Feedback Hit text overlay
    if (this.feedbackTimer > 0 && this.feedbackText) {
      ctx.fillStyle = this.feedbackColor;
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.feedbackText, 200, 180);
    }
  }

  cleanup() {
    this.notes = [];
    this.particles = [];
  }
}

// ----------------------------------------------------
// 15.10 GAME ENGINE 18: GRAVITY FLIP (RUNNER)
// ----------------------------------------------------
class GravityFlipGame {
  constructor(canvas, diff) {
    this.canvas = canvas;
    this.diff = diff;
    
    this.floorY = 320;
    this.ceilingY = 80;
    
    this.player = {
      x: 60,
      y: 300,
      w: 18,
      h: 18,
      vy: 0,
      gravityDir: 1, // 1 for floor, -1 for ceiling
      isTransitioning: false
    };
    
    this.obstacles = [];
    this.stars = [];
    this.particles = [];
    
    this.speed = 210; // px/sec horizontal scroll
    this.spawnTimer = 0;
    this.spawnInterval = 1200; // ms
    this.timeElapsed = 0;
    this.bgOffset = 0;
    
    if (diff === 'easy') {
      this.speed = 170;
      this.spawnInterval = 1400;
    } else if (diff === 'normal') {
      this.speed = 210;
      this.spawnInterval = 1100;
    } else {
      this.speed = 260;
      this.spawnInterval = 850;
    }
  }

  init() {
    this.player.x = 60;
    this.player.y = this.floorY - this.player.h;
    this.player.vy = 0;
    this.player.gravityDir = 1;
    this.player.isTransitioning = false;
    
    this.obstacles = [];
    this.stars = [];
    this.particles = [];
    this.timeElapsed = 0;
    this.spawnTimer = 0;
    this.bgOffset = 0;
    
    if (this.diff === 'easy') {
      this.speed = 170;
      this.spawnInterval = 1400;
    } else if (this.diff === 'normal') {
      this.speed = 210;
      this.spawnInterval = 1100;
    } else {
      this.speed = 260;
      this.spawnInterval = 850;
    }
  }

  handleInput(key, type) {
    if (type === 'keydown' && (key === ' ' || key === 'ArrowUp' || key === 'Enter')) {
      this.flipGravity();
    }
  }

  flipGravity() {
    if (this.player.isTransitioning) return;
    
    this.player.gravityDir = -this.player.gravityDir;
    this.player.isTransitioning = true;
    sounds.playTone(400, 'sine', 0.06);
    this.createSparks(this.player.x + this.player.w/2, this.player.y + this.player.h/2, varColor('--cyan'), 4);
  }

  spawnObstacle() {
    const r = Math.random();
    
    if (r < 0.35) {
      // Floor spike
      this.obstacles.push({
        x: this.canvas.width + 10,
        y: this.floorY,
        w: 16,
        h: 18,
        type: 'spike-bottom'
      });
    } else if (r < 0.70) {
      // Ceiling spike
      this.obstacles.push({
        x: this.canvas.width + 10,
        y: this.ceilingY - 18,
        w: 16,
        h: 18,
        type: 'spike-top'
      });
    } else {
      // Star in middle
      this.obstacles.push({
        x: this.canvas.width + 10,
        y: (this.floorY + this.ceilingY) / 2 - 6,
        w: 12,
        h: 12,
        type: 'star',
        collected: false
      });
    }
  }

  createSparks(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 50;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        size: 1.5 + Math.random() * 2,
        life: 200 + Math.random() * 200,
        maxLife: 400
      });
    }
  }

  update(dt) {
    const dtSeconds = dt / 1000;
    this.timeElapsed += dt;
    
    // Scale speed slowly over time
    const currentSpeed = this.speed * (1 + this.timeElapsed / 60000);

    // Update background offset
    this.bgOffset = (this.bgOffset - currentSpeed * 0.4 * dtSeconds) % 40;

    // Handle vertical gravity transitions
    if (this.player.isTransitioning) {
      const vertSpeed = 360 * this.player.gravityDir; // Up/down travel
      this.player.y += vertSpeed * dtSeconds;
      
      // Lock to ceiling
      if (this.player.gravityDir === -1 && this.player.y <= this.ceilingY) {
        this.player.y = this.ceilingY;
        this.player.isTransitioning = false;
        this.createSparks(this.player.x + this.player.w/2, this.ceilingY, varColor('--green'), 5);
      }
      
      // Lock to floor
      if (this.player.gravityDir === 1 && this.player.y + this.player.h >= this.floorY) {
        this.player.y = this.floorY - this.player.h;
        this.player.isTransitioning = false;
        this.createSparks(this.player.x + this.player.w/2, this.floorY, varColor('--green'), 5);
      }
    } else {
      // Trail particles while running
      if (Math.random() < 0.2) {
        const py = this.player.gravityDir === 1 ? this.floorY : this.ceilingY;
        this.particles.push({
          x: this.player.x,
          y: py + (Math.random() - 0.5) * 2,
          vx: -100 - Math.random() * 50,
          vy: (Math.random() - 0.5) * 10,
          color: varColor('--orange'),
          size: 1.5 + Math.random() * 2,
          life: 150 + Math.random() * 150,
          maxLife: 300
        });
      }
    }

    // Spawn obstacles
    this.spawnTimer += dt;
    const currentInterval = Math.max(500, this.spawnInterval - (this.timeElapsed / 200));
    if (this.spawnTimer >= currentInterval) {
      this.spawnTimer = 0;
      this.spawnObstacle();
    }

    // Update obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.x -= currentSpeed * dtSeconds;
      
      // Collision check
      const collides = (
        this.player.x + this.player.w >= o.x &&
        this.player.x <= o.x + o.w &&
        this.player.y + this.player.h >= o.y &&
        this.player.y <= o.y + o.h
      );

      if (collides) {
        if (o.type === 'star') {
          if (!o.collected) {
            o.collected = true;
            score += 30;
            sounds.playScore();
            this.createSparks(o.x + o.w/2, o.y + o.h/2, varColor('--yellow'), 8);
            this.obstacles.splice(i, 1);
          }
        } else {
          // Spike collision
          sounds.playHit();
          triggerGameOver();
          return;
        }
      } else if (o.x < -30) {
        this.obstacles.splice(i, 1);
      }
    }

    // Score increments with run time
    score = Math.floor(this.timeElapsed / 100);

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dtSeconds;
      p.y += p.vy * dtSeconds;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#060410';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background neon panels (parallax grids)
    ctx.strokeStyle = '#150f2b';
    ctx.lineWidth = 1;
    for (let x = this.bgOffset; x < this.canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, this.ceilingY);
      ctx.lineTo(x, this.floorY);
      ctx.stroke();
    }

    // Draw floor & ceiling neon boundaries
    ctx.strokeStyle = '#39ff14';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#39ff14';
    ctx.beginPath();
    ctx.moveTo(0, this.floorY);
    ctx.lineTo(this.canvas.width, this.floorY);
    ctx.moveTo(0, this.ceilingY);
    ctx.lineTo(this.canvas.width, this.ceilingY);
    ctx.stroke();

    // Draw obstacles
    this.obstacles.forEach(o => {
      ctx.save();
      ctx.shadowBlur = 8;
      
      if (o.type === 'spike-bottom') {
        ctx.fillStyle = '#ff3333';
        ctx.shadowColor = '#ff3333';
        ctx.beginPath();
        ctx.moveTo(o.x, o.y);
        ctx.lineTo(o.x + o.w / 2, o.y - o.h);
        ctx.lineTo(o.x + o.w, o.y);
        ctx.closePath();
        ctx.fill();
      } else if (o.type === 'spike-top') {
        ctx.fillStyle = '#ff3333';
        ctx.shadowColor = '#ff3333';
        ctx.beginPath();
        ctx.moveTo(o.x, o.y + o.h);
        ctx.lineTo(o.x + o.w / 2, o.y);
        ctx.lineTo(o.x + o.w, o.y + o.h);
        ctx.closePath();
        ctx.fill();
      } else if (o.type === 'star') {
        // Star rotating
        ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
        ctx.rotate(this.timeElapsed * 0.0035);
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          ctx.lineTo(0, -6);
          ctx.rotate(Math.PI / 4);
          ctx.lineTo(0, -3);
          ctx.rotate(Math.PI / 4);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    });

    // Draw particles
    ctx.save();
    this.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.restore();

    // Draw Player Runner
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00f0ff';
    ctx.fillStyle = '#00f0ff';
    
    // Smooth eye adjustments based on gravity flip state
    const px = this.player.x;
    const py = this.player.y;
    const pw = this.player.w;
    const ph = this.player.h;
    
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 3);
    ctx.fill();

    // Draw cute runner goggles or eyes
    ctx.fillStyle = '#000000';
    if (this.player.gravityDir === 1) {
      ctx.fillRect(px + 10, py + 4, 6, 3);
      ctx.fillRect(px + 4, py + 11, 10, 2);
    } else {
      ctx.fillRect(px + 10, py + 11, 6, 3);
      ctx.fillRect(px + 4, py + 5, 10, 2);
    }
    ctx.restore();
  }

  cleanup() {
    this.obstacles = [];
    this.particles = [];
  }
}

// ----------------------------------------------------
// 19. NEON FLOW
// ----------------------------------------------------
class FlowGame {
  constructor(canvas, diff) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.diff = diff;
    this.rows = 5;
    this.cols = 5;
    this.grid = [];
    this.cellSize = canvas.width / 5;
    this.flowTimer = 5000;
    this.flowTimeMax = 5000;
    this.isFlowing = false;
    this.flowPath = [];
    this.leakCell = null;
    this.gameOverTriggered = false;
    this.source = { r: 0, c: 2, dir: 0 };
    this.target = { r: 4, c: 2, dir: 2 };
    this.flowSpeed = 1000;
    this.lastFlowTick = 0;
    this.winTriggered = false;
  }

  init() {
    this.cellSize = this.canvas.width / 5;
    const types = ['straight', 'curve', 'cross'];
    for (let r = 0; r < this.rows; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.cols; c++) {
        let type = types[Math.floor(Math.random() * types.length)];
        if ((r === 0 && c === 2) || (r === 4 && c === 2)) {
          type = Math.random() < 0.5 ? 'straight' : 'cross';
        }
        this.grid[r][c] = {
          type: type,
          rotation: Math.floor(Math.random() * 4),
          filled: 0
        };
      }
    }
    this.clickHandler = this.handleClick.bind(this);
    this.canvas.addEventListener('click', this.clickHandler);
    this.canvas.addEventListener('touchstart', this.clickHandler);
    
    if (this.diff === 'easy') { this.flowTimeMax = 7000; this.flowSpeed = 1200; }
    else if (this.diff === 'hard') { this.flowTimeMax = 3500; this.flowSpeed = 700; }
    else { this.flowTimeMax = 5000; this.flowSpeed = 1000; }
    this.flowTimer = this.flowTimeMax;
  }

  handleClick(e) {
    if (appState !== STATE.playing || this.winTriggered || this.gameOverTriggered) return;
    if (e.type === 'touchstart') e.preventDefault();
    
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = ((clientX - rect.left) / rect.width) * this.canvas.width;
    const y = ((clientY - rect.top) / rect.height) * this.canvas.height;
    
    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);
    
    if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
      if (this.grid[row][col].filled > 0) return;
      sounds.playClick();
      this.grid[row][col].rotation = (this.grid[row][col].rotation + 1) % 4;
    }
  }

  getConnections(tile) {
    const rot = tile.rotation;
    if (tile.type === 'straight') {
      return (rot % 2 === 0) ? [0, 2] : [1, 3];
    } else if (tile.type === 'curve') {
      return [rot, (rot + 1) % 4];
    } else if (tile.type === 'cross') {
      return [0, 1, 2, 3];
    }
    return [];
  }

  update(dt) {
    if (this.winTriggered || this.gameOverTriggered) return;

    if (!this.isFlowing) {
      this.flowTimer -= dt;
      if (this.flowTimer <= 0) {
        this.isFlowing = true;
        this.flowPath = [{ r: 0, c: 2, inDir: 0 }];
        this.lastFlowTick = performance.now();
        sounds.playTone(300, 'sine', 0.2);
      }
    } else {
      const now = performance.now();
      const elapsed = now - this.lastFlowTick;
      const progress = Math.min(1, elapsed / this.flowSpeed);
      
      const currentCell = this.flowPath[this.flowPath.length - 1];
      if (currentCell) {
        this.grid[currentCell.r][currentCell.c].filled = progress;
      }

      if (progress >= 1) {
        this.lastFlowTick = now;
        this.advanceFlow();
      }
    }
  }

  advanceFlow() {
    const current = this.flowPath[this.flowPath.length - 1];
    const tile = this.grid[current.r][current.c];
    const connections = this.getConnections(tile);
    const oppositeDir = (current.inDir + 2) % 4;
    if (!connections.includes(oppositeDir)) {
      this.triggerLeak(current.r, current.c);
      return;
    }

    let outDir = null;
    if (tile.type === 'cross') {
      outDir = current.inDir;
    } else {
      outDir = connections.find(d => d !== oppositeDir);
    }

    if (current.r === 4 && current.c === 2 && outDir === 2) {
      this.triggerWin();
      return;
    }

    let nr = current.r;
    let nc = current.c;
    if (outDir === 0) nr--;
    else if (outDir === 1) nc++;
    else if (outDir === 2) nr++;
    else if (outDir === 3) nc--;

    if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) {
      this.triggerLeak(current.r, current.c);
      return;
    }

    const nextTile = this.grid[nr][nc];
    const nextConnections = this.getConnections(nextTile);
    const nextOppositeDir = (outDir + 2) % 4;
    
    if (!nextConnections.includes(nextOppositeDir)) {
      this.triggerLeak(nr, nc);
      return;
    }

    if (this.flowPath.some(cell => cell.r === nr && cell.c === nc)) {
      this.triggerLeak(nr, nc);
      return;
    }

    this.flowPath.push({ r: nr, c: nc, inDir: outDir });
    score += 10;
    sounds.playTone(350 + this.flowPath.length * 30, 'triangle', 0.1);
  }

  triggerLeak(r, c) {
    this.gameOverTriggered = true;
    this.leakCell = { r, c };
    sounds.playHit();
    setTimeout(() => {
      triggerGameOver();
    }, 1200);
  }

  triggerWin() {
    this.winTriggered = true;
    score += 100;
    sounds.playWin();
    setTimeout(() => {
      this.init();
      this.winTriggered = false;
      this.isFlowing = false;
    }, 2000);
  }

  draw(ctx) {
    ctx.fillStyle = '#060412';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.strokeStyle = '#1a182d';
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(i * this.cellSize, 0);
      ctx.lineTo(i * this.cellSize, this.canvas.height);
      ctx.moveTo(0, i * this.cellSize);
      ctx.lineTo(this.canvas.width, i * this.cellSize);
      ctx.stroke();
    }

    ctx.fillStyle = '#39ff14';
    ctx.beginPath();
    ctx.moveTo(2 * this.cellSize + this.cellSize/2 - 10, 5);
    ctx.lineTo(2 * this.cellSize + this.cellSize/2 + 10, 5);
    ctx.lineTo(2 * this.cellSize + this.cellSize/2, 20);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.moveTo(2 * this.cellSize + this.cellSize/2 - 10, this.canvas.height - 20);
    ctx.lineTo(2 * this.cellSize + this.cellSize/2 + 10, this.canvas.height - 20);
    ctx.lineTo(2 * this.cellSize + this.cellSize/2, this.canvas.height - 5);
    ctx.closePath();
    ctx.fill();

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.drawTile(ctx, r, c);
      }
    }

    if (!this.isFlowing) {
      ctx.fillStyle = 'rgba(255, 0, 127, 0.15)';
      ctx.fillRect(2 * this.cellSize, 0, this.cellSize, 20);
      ctx.fillStyle = '#ff007f';
      ctx.font = '8px "Press Start 2P"';
      ctx.textAlign = 'center';
      const secLeft = Math.ceil(this.flowTimer / 1000);
      ctx.fillText(`${secLeft}s`, 2 * this.cellSize + this.cellSize/2, 14);
    }
  }

  drawTile(ctx, r, c) {
    const tile = this.grid[r][c];
    const x = c * this.cellSize + this.cellSize / 2;
    const y = r * this.cellSize + this.cellSize / 2;
    const size = this.cellSize;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tile.rotation * Math.PI / 2);

    ctx.strokeStyle = '#231c3c';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    this.getPath(ctx, tile.type);
    ctx.stroke();

    if (tile.filled > 0) {
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 8;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00f0ff';
      this.getPath(ctx, tile.type);
      ctx.stroke();
    }

    ctx.fillStyle = '#ff007f';
    ctx.shadowBlur = 0;
    const connections = this.getConnections(tile);
    connections.forEach(dir => {
      ctx.save();
      ctx.rotate((dir - tile.rotation) * Math.PI / 2);
      ctx.fillRect(-6, -size/2, 12, 4);
      ctx.restore();
    });

    ctx.restore();

    if (this.leakCell && this.leakCell.r === r && this.leakCell.c === c) {
      ctx.save();
      ctx.strokeStyle = '#ff3333';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(c * this.cellSize + this.cellSize/2, r * this.cellSize + this.cellSize/2, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(c * this.cellSize + 15, r * this.cellSize + 15);
      ctx.lineTo(c * this.cellSize + this.cellSize - 15, r * this.cellSize + this.cellSize - 15);
      ctx.moveTo(c * this.cellSize + this.cellSize - 15, r * this.cellSize + 15);
      ctx.lineTo(c * this.cellSize + 15, r * this.cellSize + this.cellSize - 15);
      ctx.stroke();
      ctx.restore();
    }
  }

  getPath(ctx, type) {
    const r = this.cellSize / 2;
    ctx.beginPath();
    if (type === 'straight') {
      ctx.moveTo(0, -r);
      ctx.lineTo(0, r);
    } else if (type === 'curve') {
      ctx.moveTo(0, -r);
      ctx.lineTo(0, 0);
      ctx.lineTo(r, 0);
    } else if (type === 'cross') {
      ctx.moveTo(0, -r);
      ctx.lineTo(0, r);
      ctx.moveTo(-r, 0);
      ctx.lineTo(r, 0);
    }
  }

  cleanup() {
    this.canvas.removeEventListener('click', this.clickHandler);
    this.canvas.removeEventListener('touchstart', this.clickHandler);
    this.grid = [];
  }
}

// ----------------------------------------------------
// 20. PIXEL DRILLER
// ----------------------------------------------------
class DrillerGame {
  constructor(canvas, diff) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.diff = diff;
    this.colCount = 8;
    this.rowCount = 12;
    this.cellSize = 50;
    this.grid = [];
    this.player = { col: 3, y: 150, targetY: 150, isFalling: false, lives: 3, flashTime: 0 };
    this.scrollOffset = 0;
    this.scrollSpeed = 15;
    this.oxygen = 100;
    this.oxygenDecay = 3.5;
    this.depth = 0;
    this.particles = [];
  }

  init() {
    const colors = ['#00f0ff', '#ff007f', '#ffd700', '#39ff14'];
    for (let r = 0; r < this.rowCount; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.colCount; c++) {
        if (r < 3) {
          this.grid[r][c] = null;
        } else {
          const rChance = Math.random();
          if (rChance < 0.06) {
            this.grid[r][c] = { color: '#ffffff', type: 'o2' };
          } else {
            this.grid[r][c] = { color: colors[Math.floor(Math.random() * colors.length)], type: 'block' };
          }
        }
      }
    }
    this.player.col = 3;
    this.player.y = 100;
    this.player.targetY = 100;
    this.player.lives = (this.diff === 'easy') ? 4 : (this.diff === 'hard') ? 2 : 3;
    this.scrollSpeed = (this.diff === 'easy') ? 10 : (this.diff === 'hard') ? 22 : 15;
    this.oxygenDecay = (this.diff === 'easy') ? 2.5 : (this.diff === 'hard') ? 4.5 : 3.5;
  }

  update(dt) {
    const dtSec = dt / 1000;
    if (this.player.flashTime > 0) this.player.flashTime -= dt;

    this.scrollOffset += this.scrollSpeed * dtSec;
    this.depth += this.scrollSpeed * dtSec / 10;
    score = Math.floor(this.depth);

    if (this.scrollOffset >= this.cellSize) {
      this.scrollOffset -= this.cellSize;
      this.grid.shift();
      
      const newRow = [];
      const colors = ['#00f0ff', '#ff007f', '#ffd700', '#39ff14'];
      for (let c = 0; c < this.colCount; c++) {
        const rChance = Math.random();
        if (rChance < 0.05) {
          newRow.push({ color: '#ffffff', type: 'o2' });
        } else {
          newRow.push({ color: colors[Math.floor(Math.random() * colors.length)], type: 'block' });
        }
      }
      this.grid.push(newRow);
      this.player.y -= this.cellSize;
      this.player.targetY -= this.cellSize;
    }

    this.oxygen -= this.oxygenDecay * dtSec;
    if (this.oxygen <= 0) {
      sounds.playHit();
      triggerGameOver();
      return;
    }

    if (keysPressed['ArrowLeft'] || keysPressed['a'] || keysPressed['Left']) {
      keysPressed['ArrowLeft'] = false;
      keysPressed['a'] = false;
      if (this.player.col > 0) {
        const pRow = Math.floor(this.player.y / this.cellSize);
        if (pRow >= 0 && pRow < this.grid.length && !this.grid[pRow][this.player.col - 1]) {
          this.player.col--;
          sounds.playTone(400, 'triangle', 0.05);
        }
      }
    }
    if (keysPressed['ArrowRight'] || keysPressed['d'] || keysPressed['Right']) {
      keysPressed['ArrowRight'] = false;
      keysPressed['d'] = false;
      if (this.player.col < this.colCount - 1) {
        const pRow = Math.floor(this.player.y / this.cellSize);
        if (pRow >= 0 && pRow < this.grid.length && !this.grid[pRow][this.player.col + 1]) {
          this.player.col++;
          sounds.playTone(400, 'triangle', 0.05);
        }
      }
    }

    if (keysPressed['ArrowDown'] || keysPressed['s'] || keysPressed['Down'] || keysPressed['ArrowUp'] || keysPressed['w']) {
      keysPressed['ArrowDown'] = false;
      keysPressed['ArrowUp'] = false;
      keysPressed['s'] = false;
      keysPressed['w'] = false;
      this.drillDown();
    }

    const pRow = Math.floor(this.player.y / this.cellSize);
    const belowRow = pRow + 1;
    if (belowRow >= 0 && belowRow < this.grid.length) {
      const blockBelow = this.grid[belowRow][this.player.col];
      if (!blockBelow) {
        this.player.isFalling = true;
        this.player.y += 300 * dtSec;
        const newPRow = Math.floor(this.player.y / this.cellSize);
        if (newPRow >= 0 && newPRow + 1 < this.grid.length && this.grid[newPRow + 1][this.player.col]) {
          this.player.y = newPRow * this.cellSize;
          this.player.isFalling = false;
        }
      } else {
        this.player.isFalling = false;
        this.player.y = pRow * this.cellSize;
      }
    }

    if (this.player.y - this.scrollOffset <= 10) {
      this.player.y = 100;
      this.player.lives--;
      sounds.playHit();
      this.player.flashTime = 500;
      if (this.player.lives <= 0) {
        triggerGameOver();
        return;
      }
    }

    for (let r = this.grid.length - 2; r >= 0; r--) {
      for (let c = 0; c < this.colCount; c++) {
        const b = this.grid[r][c];
        if (b && !this.grid[r + 1][c]) {
          this.grid[r + 1][c] = b;
          this.grid[r][c] = null;
          const blockY = (r + 1) * this.cellSize;
          if (c === this.player.col && Math.abs(blockY - this.player.y) < 25) {
            if (this.player.flashTime <= 0) {
              this.player.lives--;
              this.player.flashTime = 1000;
              sounds.playHit();
              this.clearAreaAroundPlayer();
              if (this.player.lives <= 0) {
                triggerGameOver();
                return;
              }
            }
          }
        }
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  clearAreaAroundPlayer() {
    const pRow = Math.floor(this.player.y / this.cellSize);
    for (let r = Math.max(0, pRow - 1); r <= Math.min(this.grid.length - 1, pRow + 1); r++) {
      for (let c = Math.max(0, this.player.col - 1); c <= Math.min(this.colCount - 1, this.player.col + 1); c++) {
        this.grid[r][c] = null;
      }
    }
  }

  drillDown() {
    if (this.player.isFalling) return;
    const pRow = Math.floor(this.player.y / this.cellSize);
    const targetRow = pRow + 1;
    if (targetRow >= 0 && targetRow < this.grid.length) {
      const block = this.grid[targetRow][this.player.col];
      if (block) {
        sounds.playTone(200, 'sawtooth', 0.12, 100);
        const px = this.player.col * this.cellSize + this.cellSize/2;
        const py = targetRow * this.cellSize + this.cellSize/2;
        for (let i = 0; i < 8; i++) {
          this.particles.push({
            x: px,
            y: py,
            vx: (Math.random() - 0.5) * 120,
            vy: (Math.random() - 0.5) * 120,
            color: block.color,
            size: 2 + Math.random() * 3,
            life: 300 + Math.random() * 200
          });
        }
        if (block.type === 'o2') {
          this.oxygen = Math.min(100, this.oxygen + 30);
          this.grid[targetRow][this.player.col] = null;
          sounds.playScore();
        } else {
          const blockColor = block.color;
          this.drillRecursive(targetRow, this.player.col, blockColor);
        }
      }
    }
  }

  drillRecursive(r, c, color) {
    if (r < 0 || r >= this.grid.length || c < 0 || c >= this.colCount) return;
    const tile = this.grid[r][c];
    if (tile && tile.type === 'block' && tile.color === color) {
      this.grid[r][c] = null;
      setTimeout(() => {
        this.drillRecursive(r - 1, c, color);
        this.drillRecursive(r + 1, c, color);
        this.drillRecursive(r, c - 1, color);
        this.drillRecursive(r, c + 1, color);
      }, 30);
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#0a0815';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(0, -this.scrollOffset);

    for (let r = 0; r < this.grid.length; r++) {
      for (let c = 0; c < this.colCount; c++) {
        const b = this.grid[r][c];
        if (b) {
          const bx = c * this.cellSize;
          const by = r * this.cellSize;
          ctx.save();
          ctx.fillStyle = b.color;
          ctx.shadowBlur = b.type === 'o2' ? 12 : 5;
          ctx.shadowColor = b.color;
          ctx.fillRect(bx + 2, by + 2, this.cellSize - 4, this.cellSize - 4);
          if (b.type === 'o2') {
            ctx.fillStyle = '#000000';
            ctx.font = '10px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('O2', bx + this.cellSize/2, by + this.cellSize/2 + 4);
          }
          ctx.restore();
        }
      }
    }

    if (this.player.flashTime <= 0 || Math.floor(performance.now() / 100) % 2 === 0) {
      const px = this.player.col * this.cellSize + this.cellSize/2;
      const py = this.player.y + this.cellSize/2;
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(px - 6, py + 8);
      ctx.lineTo(px + 6, py + 8);
      ctx.lineTo(px, py + 18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(px - 8, py - 4, 16, 5);
      ctx.restore();
    }

    this.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    });

    ctx.restore();

    ctx.fillStyle = '#ff3333';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ff3333';
    ctx.beginPath();
    for (let x = 0; x < this.canvas.width; x += 16) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 8, 12);
      ctx.lineTo(x + 16, 0);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(10, this.canvas.height - 25, 120, 15);
    ctx.fillStyle = this.oxygen > 30 ? '#00f0ff' : '#ff007f';
    ctx.fillRect(10, this.canvas.height - 25, 1.2 * this.oxygen, 15);
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px "Press Start 2P"';
    ctx.textAlign = 'left';
    ctx.fillText(`AIR: ${Math.floor(this.oxygen)}%`, 14, this.canvas.height - 14);

    ctx.textAlign = 'right';
    let hearts = '';
    for (let i = 0; i < this.player.lives; i++) hearts += '♥';
    ctx.fillStyle = '#ff007f';
    ctx.font = '12px "Press Start 2P"';
    ctx.fillText(hearts, this.canvas.width - 10, this.canvas.height - 13);
  }

  cleanup() {
    this.grid = [];
    this.particles = [];
  }
}

// ----------------------------------------------------
// 21. ORBITAL DODGE
// ----------------------------------------------------
class OrbitGame {
  constructor(canvas, diff) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.diff = diff;
    this.angle = 0;
    this.speed = 2.2;
    this.currentR = 60;
    this.targetR = 60;
    this.sunRotation = 0;
    this.obstacles = [];
    this.stars = [];
    this.particles = [];
    this.spawnTimer = 0;
    this.spawnInterval = 1200;
    this.timeElapsed = 0;
  }

  init() {
    this.angle = 0;
    this.currentR = 60;
    this.targetR = 60;
    this.obstacles = [];
    this.stars = [];
    this.particles = [];
    this.timeElapsed = 0;
    if (this.diff === 'easy') { this.speed = 1.8; this.spawnInterval = 1500; }
    else if (this.diff === 'hard') { this.speed = 2.6; this.spawnInterval = 900; }
    else { this.speed = 2.2; this.spawnInterval = 1200; }
  }

  update(dt) {
    const dtSec = dt / 1000;
    this.timeElapsed += dt;
    score = Math.floor(this.timeElapsed / 100);
    this.angle += this.speed * dtSec;
    this.currentR += (this.targetR - this.currentR) * 15 * dtSec;
    this.sunRotation += 0.5 * dtSec;

    if (keysPressed[' '] || keysPressed['ArrowUp'] || keysPressed['w'] || keysPressed['Jump']) {
      keysPressed[' '] = false;
      keysPressed['ArrowUp'] = false;
      keysPressed['w'] = false;
      keysPressed['Jump'] = false;
      this.targetR = (this.targetR === 60) ? 110 : 60;
      sounds.playTone(380, 'sine', 0.06);
      this.createParticles(this.getPlayerX(), this.getPlayerY(), '#00f0ff', 4);
    }

    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnObstacle();
      if (Math.random() < 0.4) this.spawnStar();
    }

    const px = this.getPlayerX();
    const py = this.getPlayerY();

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.x += o.vx * dtSec;
      o.y += o.vy * dtSec;
      o.rotation += o.rotSpeed * dtSec;
      const dist = Math.hypot(o.x - px, o.y - py);
      if (dist < o.size + 8) {
        sounds.playHit();
        triggerGameOver();
        return;
      }
      if (o.x < -50 || o.x > this.canvas.width + 50 || o.y < -50 || o.y > this.canvas.height + 50) {
        this.obstacles.splice(i, 1);
      }
    }

    for (let i = this.stars.length - 1; i >= 0; i--) {
      const s = this.stars[i];
      s.angle += s.speed * dtSec;
      const sx = 200 + s.r * Math.cos(s.angle);
      const sy = 200 + s.r * Math.sin(s.angle);
      const dist = Math.hypot(sx - px, sy - py);
      if (dist < 18) {
        score += 50;
        this.timeElapsed += 500;
        sounds.playScore();
        this.createParticles(sx, sy, '#ffd700', 8);
        this.stars.splice(i, 1);
        continue;
      }
      s.life -= dt;
      if (s.life <= 0) this.stars.splice(i, 1);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  getPlayerX() { return 200 + this.currentR * Math.cos(this.angle); }
  getPlayerY() { return 200 + this.currentR * Math.sin(this.angle); }

  spawnObstacle() {
    const fromCenter = Math.random() < 0.4;
    let x, y, vx, vy;
    const angle = Math.random() * Math.PI * 2;
    const speed = 70 + Math.random() * 80;
    if (fromCenter) {
      x = 200; y = 200;
      vx = speed * Math.cos(angle);
      vy = speed * Math.sin(angle);
    } else {
      const r = 280;
      x = 200 + r * Math.cos(angle);
      y = 200 + r * Math.sin(angle);
      const targetAngle = angle + Math.PI + (Math.random() - 0.5) * 0.5;
      vx = speed * Math.cos(targetAngle);
      vy = speed * Math.sin(targetAngle);
    }
    this.obstacles.push({
      x, y, vx, vy,
      size: 8 + Math.random() * 8,
      rotation: Math.random() * Math.PI,
      rotSpeed: (Math.random() - 0.5) * 4
    });
  }

  spawnStar() {
    const r = Math.random() < 0.5 ? 60 : 110;
    this.stars.push({ r: r, angle: Math.random() * Math.PI * 2, speed: 0.8 + Math.random() * 0.8, life: 8000 });
  }

  createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 50;
      this.particles.push({ x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, color: color, size: 1.5 + Math.random() * 2, life: 200 + Math.random() * 200 });
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#02020a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.strokeStyle = '#111129';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(200, 200, 60, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(200, 200, 110, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.translate(200, 200);
    ctx.rotate(this.sunRotation);
    ctx.fillStyle = '#ff007f';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff007f';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      ctx.lineTo(0, -18);
      ctx.rotate(Math.PI / 8);
      ctx.lineTo(0, -8);
      ctx.rotate(Math.PI / 8);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const px = this.getPlayerX();
    const py = this.getPlayerY();
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(this.angle + Math.PI/2);
    ctx.fillStyle = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00f0ff';
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(-6, 6);
    ctx.lineTo(6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    this.obstacles.forEach(o => {
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.rotate(o.rotation);
      ctx.fillStyle = '#ff3333';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ff3333';
      ctx.fillRect(-o.size/2, -o.size/2, o.size, o.size);
      ctx.restore();
    });

    this.stars.forEach(s => {
      const sx = 200 + s.r * Math.cos(s.angle);
      const sy = 200 + s.r * Math.sin(s.angle);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(performance.now() * 0.005);
      ctx.fillStyle = '#ffd700';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ffd700';
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        ctx.lineTo(0, -7);
        ctx.rotate(Math.PI / 4);
        ctx.lineTo(0, -3);
        ctx.rotate(Math.PI / 4);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    this.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
  }

  cleanup() {
    this.obstacles = [];
    this.stars = [];
    this.particles = [];
  }
}

// ----------------------------------------------------
// 22. NINJA LEAP
// ----------------------------------------------------
class NinjaGame {
  constructor(canvas, diff) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.diff = diff;
    this.player = { side: 'left', x: 40, y: 300, w: 16, h: 16, state: 'running', vx: 0, rotation: 0 };
    this.scrollSpeed = 160;
    this.obstacles = [];
    this.particles = [];
    this.spawnTimer = 0;
    this.spawnInterval = 1000;
    this.timeElapsed = 0;
  }

  init() {
    this.player.side = 'left';
    this.player.x = 40;
    this.player.y = 300;
    this.player.state = 'running';
    this.player.vx = 0;
    this.player.rotation = 0;
    this.obstacles = [];
    this.particles = [];
    this.timeElapsed = 0;
    if (this.diff === 'easy') { this.scrollSpeed = 120; this.spawnInterval = 1300; }
    else if (this.diff === 'hard') { this.scrollSpeed = 220; this.spawnInterval = 750; }
    else { this.scrollSpeed = 160; this.spawnInterval = 1000; }
  }

  update(dt) {
    const dtSec = dt / 1000;
    this.timeElapsed += dt;
    score = Math.floor(this.timeElapsed / 100);

    if (keysPressed[' '] || keysPressed['ArrowUp'] || keysPressed['w'] || keysPressed['Jump']) {
      keysPressed[' '] = false;
      keysPressed['ArrowUp'] = false;
      keysPressed['w'] = false;
      keysPressed['Jump'] = false;
      if (this.player.state === 'running') {
        this.player.state = 'jumping';
        sounds.playTone(500, 'triangle', 0.08);
        this.player.vx = this.player.side === 'left' ? 600 : -600;
        this.createSparks(this.player.x + (this.player.side === 'left' ? 8 : -8), this.player.y + 8, '#39ff14', 4);
      }
    }

    if (this.player.state === 'jumping') {
      this.player.x += this.player.vx * dtSec;
      this.player.rotation += 20 * dtSec;
      if (this.player.vx > 0 && this.player.x >= 344) {
        this.player.x = 344;
        this.player.side = 'right';
        this.player.state = 'running';
        this.player.rotation = 0;
        sounds.playTone(300, 'sine', 0.05);
        this.createSparks(360, this.player.y + 8, '#39ff14', 5);
      }
      else if (this.player.vx < 0 && this.player.x <= 40) {
        this.player.x = 40;
        this.player.side = 'left';
        this.player.state = 'running';
        this.player.rotation = 0;
        sounds.playTone(300, 'sine', 0.05);
        this.createSparks(40, this.player.y + 8, '#39ff14', 5);
      }
    }

    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnObstacle();
    }

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.y += this.scrollSpeed * dtSec;
      if (o.type === 'shuriken') o.rotation += 10 * dtSec;
      const collides = (
        this.player.x + this.player.w >= o.x &&
        this.player.x <= o.x + o.w &&
        this.player.y + this.player.h >= o.y &&
        this.player.y <= o.y + o.h
      );
      if (collides) {
        if (o.type === 'star') {
          score += 50;
          this.timeElapsed += 500;
          sounds.playScore();
          this.createSparks(o.x + o.w/2, o.y + o.h/2, '#ffd700', 8);
          this.obstacles.splice(i, 1);
          continue;
        } else if (o.type === 'shuriken' && this.player.state === 'jumping') {
          score += 100;
          sounds.playTone(800, 'square', 0.1, 1200);
          this.createSparks(o.x + o.w/2, o.y + o.h/2, '#ffffff', 10);
          this.obstacles.splice(i, 1);
          continue;
        } else {
          sounds.playHit();
          triggerGameOver();
          return;
        }
      }
      if (o.y > this.canvas.height) {
        this.obstacles.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  spawnObstacle() {
    const r = Math.random();
    const side = Math.random() < 0.5 ? 'left' : 'right';
    if (r < 0.45) {
      this.obstacles.push({ type: 'spike', x: side === 'left' ? 40 : 340, y: -30, w: 16, h: 24, side: side });
    } else if (r < 0.80) {
      this.obstacles.push({ type: 'shuriken', x: side === 'left' ? 90 : 290, y: -30, w: 20, h: 20, rotation: 0 });
    } else {
      this.obstacles.push({ type: 'star', x: 100 + Math.random() * 200, y: -30, w: 14, h: 14 });
    }
  }

  createSparks(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 70;
      this.particles.push({ x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, color: color, size: 1.5 + Math.random() * 2.5, life: 200 + Math.random() * 200 });
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#050410';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = '#1c1b35';
    ctx.fillRect(0, 0, 40, this.canvas.height);
    ctx.fillRect(360, 0, 40, this.canvas.height);

    ctx.strokeStyle = '#39ff14';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(40, 0); ctx.lineTo(40, this.canvas.height);
    ctx.moveTo(360, 0); ctx.lineTo(360, this.canvas.height);
    ctx.stroke();

    this.obstacles.forEach(o => {
      ctx.save();
      ctx.shadowBlur = 8;
      if (o.type === 'spike') {
        ctx.fillStyle = '#ff3333';
        ctx.shadowColor = '#ff3333';
        ctx.beginPath();
        if (o.side === 'left') {
          ctx.moveTo(o.x, o.y); ctx.lineTo(o.x + o.w, o.y + o.h/2); ctx.lineTo(o.x, o.y + o.h);
        } else {
          ctx.moveTo(o.x + o.w, o.y); ctx.lineTo(o.x, o.y + o.h/2); ctx.lineTo(o.x + o.w, o.y + o.h);
        }
        ctx.closePath();
        ctx.fill();
      } else if (o.type === 'shuriken') {
        ctx.translate(o.x + o.w/2, o.y + o.h/2);
        ctx.rotate(o.rotation);
        ctx.fillStyle = '#a855f7';
        ctx.shadowColor = '#a855f7';
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          ctx.lineTo(0, -10); ctx.lineTo(3, -3); ctx.lineTo(10, 0); ctx.rotate(Math.PI / 2);
        }
        ctx.closePath();
        ctx.fill();
      } else if (o.type === 'star') {
        ctx.translate(o.x + o.w/2, o.y + o.h/2);
        ctx.rotate(performance.now() * 0.005);
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          ctx.lineTo(0, -7); ctx.rotate(Math.PI / 4); ctx.lineTo(0, -3); ctx.rotate(Math.PI / 4);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    });

    this.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    });

    ctx.save();
    ctx.translate(this.player.x + this.player.w/2, this.player.y + this.player.h/2);
    ctx.rotate(this.player.rotation);
    ctx.fillStyle = '#39ff14';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#39ff14';
    ctx.fillRect(-this.player.w/2, -this.player.h/2, this.player.w, this.player.h);
    ctx.fillStyle = '#ff007f';
    if (this.player.state === 'running') {
      const tailX = this.player.side === 'left' ? -12 : 8;
      ctx.fillRect(tailX, -3, 4, 2);
      ctx.fillRect(tailX - 2, 0, 4, 2);
    }
    ctx.restore();
  }

  cleanup() {
    this.obstacles = [];
    this.particles = [];
  }
}

// ----------------------------------------------------
// 23. HELIX FALL
// ----------------------------------------------------
class HelixGame {
  constructor(canvas, diff) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.diff = diff;
    this.ball = { x: 200, y: 120, vy: 0, radius: 6, maxVy: 400 };
    this.gravity = 500;
    this.bounceForce = -230;
    this.towerRotation = 0;
    this.platforms = [];
    this.cameraY = 120;
    this.particles = [];
  }

  init() {
    this.ball.x = 200;
    this.ball.y = 120;
    this.ball.vy = 0;
    this.towerRotation = 0;
    this.platforms = [];
    this.cameraY = 120;
    this.particles = [];
    for (let i = 0; i < 30; i++) {
      this.generatePlatform(i);
    }
    this.ball.y = this.platforms[0].y - 40;
    this.dragStart = null;
    this.touchStartHandler = (e) => { this.dragStart = e.touches[0].clientX; };
    this.touchMoveHandler = (e) => {
      if (this.dragStart === null) return;
      const dx = e.touches[0].clientX - this.dragStart;
      this.towerRotation += dx * 0.015;
      this.dragStart = e.touches[0].clientX;
    };
    this.touchEndHandler = () => { this.dragStart = null; };
    this.canvas.addEventListener('touchstart', this.touchStartHandler);
    this.canvas.addEventListener('touchmove', this.touchMoveHandler);
    this.canvas.addEventListener('touchend', this.touchEndHandler);
  }

  generatePlatform(index) {
    const y = 200 + index * 130;
    const sectors = [];
    const gapIndex = Math.floor(Math.random() * 8);
    const dangerIndex1 = (gapIndex + 4) % 8;
    const dangerIndex2 = (gapIndex + 3) % 8;
    for (let s = 0; s < 8; s++) {
      let type = 'safe';
      if (s === gapIndex) type = 'gap';
      else if (s === dangerIndex1 || (this.diff === 'hard' && s === dangerIndex2)) type = 'danger';
      sectors.push({ startAngle: s * Math.PI / 4, endAngle: (s + 1) * Math.PI / 4, type: type });
    }
    this.platforms.push({ y, sectors });
  }

  update(dt) {
    const dtSec = dt / 1000;
    let rotSpeed = 3.5;
    if (keysPressed['ArrowLeft'] || keysPressed['a'] || keysPressed['Left']) {
      this.towerRotation += rotSpeed * dtSec;
    }
    if (keysPressed['ArrowRight'] || keysPressed['d'] || keysPressed['Right']) {
      this.towerRotation -= rotSpeed * dtSec;
    }
    this.ball.vy += this.gravity * dtSec;
    if (this.ball.vy > this.ball.maxVy) this.ball.vy = this.ball.maxVy;
    this.ball.y += this.ball.vy * dtSec;
    this.cameraY += (this.ball.y - this.cameraY) * 6 * dtSec;

    this.platforms.forEach((p, idx) => {
      if (this.ball.vy > 0 && Math.abs(this.ball.y - p.y) < 8) {
        let checkAngle = (Math.PI / 2 - this.towerRotation) % (Math.PI * 2);
        if (checkAngle < 0) checkAngle += Math.PI * 2;
        const sector = p.sectors.find(s => checkAngle >= s.startAngle && checkAngle <= s.endAngle);
        if (sector) {
          if (sector.type === 'gap') {
            // fall through
          } else if (sector.type === 'danger') {
            sounds.playHit();
            triggerGameOver();
          } else {
            this.ball.vy = this.bounceForce;
            this.ball.y = p.y - 4;
            sounds.playTone(320, 'sine', 0.06);
            score = idx * 10;
            for (let i = 0; i < 5; i++) {
              this.particles.push({
                x: this.ball.x + (Math.random() - 0.5) * 12,
                y: p.y,
                vx: (Math.random() - 0.5) * 60,
                vy: -80 - Math.random() * 80,
                color: '#39ff14',
                size: 2,
                life: 300 + Math.random() * 200
              });
            }
          }
        }
      }
    });

    if (this.ball.y > this.platforms[this.platforms.length - 5].y) {
      const curLen = this.platforms.length;
      for (let i = 0; i < 10; i++) {
        this.generatePlatform(curLen + i);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.vy += 400 * dtSec;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#060412';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = '#1c1b35';
    ctx.fillRect(190, 0, 20, this.canvas.height);

    this.platforms.forEach((p) => {
      const py = 200 + (p.y - this.cameraY);
      if (py < -50 || py > this.canvas.height + 50) return;
      p.sectors.forEach(s => {
        if (s.type === 'gap') return;
        ctx.save();
        ctx.strokeStyle = s.type === 'danger' ? '#ff3333' : '#a855f7';
        ctx.shadowBlur = s.type === 'danger' ? 8 : 0;
        ctx.shadowColor = s.type === 'danger' ? '#ff3333' : 'transparent';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        const drawStart = s.startAngle + this.towerRotation;
        const drawEnd = s.endAngle + this.towerRotation;
        ctx.ellipse(200, py, 90, 14, 0, drawStart, drawEnd);
        ctx.stroke();
        ctx.restore();
      });
    });

    this.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y - this.cameraY + 200, p.size, p.size);
    });

    const by = 200 + (this.ball.y - this.cameraY);
    ctx.save();
    ctx.fillStyle = '#39ff14';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#39ff14';
    ctx.beginPath();
    ctx.arc(this.ball.x, by, this.ball.radius, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  cleanup() {
    this.canvas.removeEventListener('touchstart', this.touchStartHandler);
    this.canvas.removeEventListener('touchmove', this.touchMoveHandler);
    this.canvas.removeEventListener('touchend', this.touchEndHandler);
    this.platforms = [];
    this.particles = [];
  }
}

// ----------------------------------------------------
// 24. CORE SHIELD
// ----------------------------------------------------
class CoreShieldGame {
  constructor(canvas, diff) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.diff = diff;
    this.core = { x: 200, y: 200, r: 16, lives: 3, flashTime: 0 };
    this.shieldAngle = 0;
    this.shieldRadius = 60;
    this.shieldWidth = Math.PI / 3;
    this.meteors = [];
    this.particles = [];
    this.spawnTimer = 0;
    this.spawnInterval = 1000;
    this.timeElapsed = 0;
    this.screenShake = 0;
  }

  init() {
    this.core.lives = (this.diff === 'easy') ? 4 : (this.diff === 'hard') ? 2 : 3;
    this.core.flashTime = 0;
    this.shieldAngle = 0;
    this.meteors = [];
    this.particles = [];
    this.timeElapsed = 0;
    this.screenShake = 0;
    if (this.diff === 'easy') { this.spawnInterval = 1300; }
    else if (this.diff === 'hard') { this.spawnInterval = 700; }
    else { this.spawnInterval = 1000; }
  }

  update(dt) {
    const dtSec = dt / 1000;
    this.timeElapsed += dt;
    if (this.screenShake > 0) this.screenShake -= dt;
    if (this.core.flashTime > 0) this.core.flashTime -= dt;

    const rotSpeed = 4.5;
    if (keysPressed['ArrowLeft'] || keysPressed['a'] || keysPressed['Left']) {
      this.shieldAngle -= rotSpeed * dtSec;
    }
    if (keysPressed['ArrowRight'] || keysPressed['d'] || keysPressed['Right']) {
      this.shieldAngle += rotSpeed * dtSec;
    }
    this.shieldAngle = (this.shieldAngle + Math.PI * 2) % (Math.PI * 2);

    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnMeteor();
    }

    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      const dx = 200 - m.x;
      const dy = 200 - m.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= 15) {
        if (this.core.flashTime <= 0) {
          this.core.lives--;
          this.core.flashTime = 500;
          this.screenShake = 200;
          sounds.playHit();
          this.createSparks(200, 200, '#ff3333', 12);
          if (this.core.lives <= 0) {
            triggerGameOver();
            return;
          }
        }
        this.meteors.splice(i, 1);
        continue;
      }

      if (m.vx !== 0 || m.vy !== 0) {
        m.x += m.vx * dtSec;
        m.y += m.vy * dtSec;
        const nextDist = Math.hypot(200 - m.x, 200 - m.y);
        if (dist >= this.shieldRadius && nextDist <= this.shieldRadius) {
          let meteorAngle = Math.atan2(m.y - 200, m.x - 200);
          if (meteorAngle < 0) meteorAngle += Math.PI * 2;
          let diff = Math.abs(meteorAngle - this.shieldAngle);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          if (diff <= this.shieldWidth / 2) {
            score += 20;
            sounds.playTone(600, 'triangle', 0.08, 800);
            this.createSparks(m.x, m.y, '#00f0ff', 6);
            this.meteors.splice(i, 1);
            continue;
          }
        }
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  spawnMeteor() {
    let x = 0, y = 0;
    const r = Math.random();
    if (r < 0.25) { x = Math.random() * 400; y = -10; }
    else if (r < 0.50) { x = Math.random() * 400; y = 410; }
    else if (r < 0.75) { x = -10; y = Math.random() * 400; }
    else { x = 410; y = Math.random() * 400; }

    const speed = 70 + Math.random() * 60;
    const angle = Math.atan2(200 - y, 200 - x);
    const vx = speed * Math.cos(angle);
    const vy = speed * Math.sin(angle);
    this.meteors.push({ x, y, vx, vy, size: 6 + Math.random() * 4 });
  }

  createSparks(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 60;
      this.particles.push({ x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, color: color, size: 1.5 + Math.random() * 2, life: 200 + Math.random() * 200 });
    }
  }

  draw(ctx) {
    ctx.save();
    if (this.screenShake > 0) {
      ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
    }
    ctx.fillStyle = '#03020b';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.strokeStyle = '#100f27';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(200, 200, this.shieldRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    if (this.core.flashTime > 0 && Math.floor(performance.now() / 100) % 2 === 0) {
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.fillStyle = '#ff007f';
    }
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff007f';
    ctx.beginPath();
    ctx.arc(200, 200, this.core.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00f0ff';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(200, 200, this.shieldRadius, this.shieldAngle - this.shieldWidth/2, this.shieldAngle + this.shieldWidth/2);
    ctx.stroke();
    ctx.restore();

    this.meteors.forEach(m => {
      ctx.save();
      ctx.fillStyle = '#eab308';
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#eab308';
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    this.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.restore();

    ctx.textAlign = 'right';
    let hearts = '';
    for (let i = 0; i < this.core.lives; i++) hearts += '♥';
    ctx.fillStyle = '#ff007f';
    ctx.font = '10px "Press Start 2P"';
    ctx.fillText(hearts, this.canvas.width - 15, 25);
  }

  cleanup() {
    this.meteors = [];
    this.particles = [];
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
