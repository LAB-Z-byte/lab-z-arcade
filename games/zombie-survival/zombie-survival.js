(() => {
  "use strict";

  const WORLD = { width: 960, height: 600, maxZombies: 58, maxBullets: 110, particleCap: 180, reducedParticleCap: 40, maxBlood: 90, maxPuddles: 16 };
  const DIFFICULTIES = {
    easy: { label: "Easy", speed: 0.8, health: 0.78, spawn: 1.15 },
    medium: { label: "Medium", speed: 1, health: 1, spawn: 1 },
    hard: { label: "Hard", speed: 1.25, health: 1.35, spawn: 0.76 }
  };
  const WEAPONS = {
    pistol: { label: "Pistol", damage: 22, cooldown: 0.34, magazine: 12, reserve: 60, maxReserve: 144, reload: 1.15, pellets: 1, spread: 0.035, speed: 720, muzzle: "#ffd59b" },
    shotgun: { label: "Shotgun", damage: 13, cooldown: 0.78, magazine: 6, reserve: 30, maxReserve: 72, reload: 1.55, pellets: 6, spread: 0.34, speed: 580, muzzle: "#ffbd78" },
    rifle: { label: "Rifle", damage: 15, cooldown: 0.115, magazine: 30, reserve: 120, maxReserve: 270, reload: 1.45, pellets: 1, spread: 0.075, speed: 820, sound: "rifle", muzzle: "#7ff8ec" },
    smg: { label: "SMG", damage: 8, cooldown: 0.075, magazine: 42, reserve: 168, maxReserve: 336, reload: 1.65, pellets: 1, spread: 0.13, speed: 690, sound: "smg", muzzle: "#ffe36e", unlockWave: 3 },
    sniper: { label: "Sniper", damage: 92, cooldown: 1.05, magazine: 5, reserve: 25, maxReserve: 55, reload: 1.9, pellets: 1, spread: 0.008, speed: 1180, pierce: true, sound: "sniper", muzzle: "#b8d7ff", unlockWave: 5 },
    grenade: { label: "Grenade Launcher", damage: 84, cooldown: 1.1, magazine: 3, reserve: 12, maxReserve: 24, reload: 2, pellets: 1, spread: 0.02, speed: 390, explosive: true, sound: "grenade", muzzle: "#ff875e", unlockWave: 8 }
  };
  const ZOMBIE_TYPES = {
    walker: { health: 34, speed: 42, radius: 22, damage: 9, score: 100, xp: 8, color: "#78b683", drop: 0.12, sound: "groan" },
    runner: { health: 19, speed: 86, radius: 18, damage: 7, score: 140, xp: 9, color: "#d0bd68", drop: 0.1, sound: "runner" },
    tank: { health: 115, speed: 25, radius: 27, damage: 18, score: 260, xp: 18, color: "#8b74a9", drop: 0.28, sound: "tank" },
    spitter: { health: 29, speed: 33, radius: 21, damage: 8, score: 190, xp: 14, color: "#5eaaa5", drop: 0.18, sound: "spitter" },
    crawler: { health: 24, speed: 68, radius: 14, damage: 6, score: 155, xp: 10, color: "#9bac72", drop: 0.1, sound: "crawler" },
    exploder: { health: 52, speed: 39, radius: 25, damage: 28, score: 230, xp: 15, color: "#c5a45b", drop: 0.18, sound: "exploder" },
    screamer: { health: 38, speed: 34, radius: 22, damage: 5, score: 245, xp: 17, color: "#b47a9d", drop: 0.16, sound: "screamer" },
    armored: { health: 82, speed: 31, radius: 23, damage: 13, score: 255, xp: 18, color: "#8996a3", drop: 0.2, sound: "armored" },
    toxic: { health: 46, speed: 36, radius: 22, damage: 8, score: 225, xp: 16, color: "#7fb45e", drop: 0.18, sound: "toxic" },
    ghoul: { health: 42, speed: 32, radius: 20, damage: 14, score: 270, xp: 18, color: "#b8d5b9", drop: 0.18, sound: "ghoul" }
  };
  const LEVELS = [
    { name: "Graveyard", boss: "Gravedigger", floor: "#171b20", accent: "#8d9b75", obstacle: "#525348", mix: ["walker", "runner", "tank", "crawler"] },
    { name: "Abandoned Town", boss: "Mutant Doctor", floor: "#20201d", accent: "#c79665", obstacle: "#706557", mix: ["walker", "runner", "spitter", "exploder", "screamer"] },
    { name: "Toxic Lab", boss: "Frost Giant", floor: "#132322", accent: "#78d7ae", obstacle: "#405d57", mix: ["walker", "spitter", "armored", "toxic", "ghoul"] },
    { name: "Frozen Outpost", boss: "Blood Beast", floor: "#172331", accent: "#94d7ef", obstacle: "#596d7d", mix: ["runner", "tank", "armored", "crawler", "ghoul"] },
    { name: "Blood Moon Arena", boss: "Blood Moon", floor: "#24171e", accent: "#ff5a77", obstacle: "#60414a", mix: ["runner", "tank", "spitter", "exploder", "screamer", "armored", "toxic", "ghoul"] }
  ];
  const LEVEL_OBSTACLES = [
    [[140, 120, 48, 62, "tomb"], [278, 392, 55, 42, "tomb"], [730, 152, 60, 42, "tomb"], [790, 394, 46, 60, "tomb"], [438, 112, 80, 24, "wall"], [530, 458, 78, 24, "wall"]],
    [[140, 130, 120, 30, "wall"], [280, 220, 48, 48, "crate"], [685, 138, 108, 34, "wall"], [704, 404, 52, 52, "crate"], [320, 468, 124, 28, "wall"], [522, 302, 48, 48, "crate"]],
    [[140, 134, 74, 46, "crate"], [292, 440, 104, 30, "wall"], [728, 145, 54, 54, "crate"], [770, 410, 110, 30, "wall"], [460, 110, 34, 96, "wall"], [530, 390, 34, 96, "wall"]],
    [[128, 132, 118, 34, "wall"], [278, 422, 60, 56, "crate"], [734, 146, 52, 52, "crate"], [764, 414, 120, 30, "wall"], [444, 122, 80, 26, "wall"], [526, 444, 82, 26, "wall"]],
    [[152, 130, 74, 52, "crate"], [288, 432, 112, 30, "wall"], [718, 145, 74, 50, "crate"], [752, 408, 100, 30, "wall"], [438, 112, 34, 94, "wall"], [532, 394, 34, 94, "wall"]]
  ];
  const UPGRADE_DEFS = [
    { id: "damage", name: "Hotter Rounds", detail: "Deal 20% more weapon damage.", icon: "✦" },
    { id: "fireRate", name: "Quick Hands", detail: "Fire 15% faster with every weapon.", icon: "»" },
    { id: "speed", name: "Fleet Feet", detail: "Move 12% faster.", icon: "⌁" },
    { id: "maxHealth", name: "Field Medic", detail: "Gain 20 max health and restore 20.", icon: "+" },
    { id: "reload", name: "Sleight of Hand", detail: "Reload 18% faster.", icon: "↻" }
  ];

  const canvas = document.querySelector("#game-canvas");
  const context = canvas?.getContext("2d");
  const overlay = document.querySelector("#game-overlay");
  const overlayIcon = document.querySelector("#overlay-icon");
  const overlayEyebrow = document.querySelector("#overlay-eyebrow");
  const overlayTitle = document.querySelector("#overlay-title");
  const overlayMessage = document.querySelector("#overlay-message");
  const overlayAction = document.querySelector("#overlay-action");
  const overlayHint = document.querySelector("#overlay-hint");
  const difficultyPicker = document.querySelector("#difficulty-picker");
  const levelPicker = document.querySelector("#level-picker");
  const changeDifficulty = document.querySelector("#change-difficulty");
  const upgradeOptions = document.querySelector("#upgrade-options");
  const healthValue = document.querySelector("#health-value");
  const healthBar = document.querySelector("#health-bar");
  const weaponValue = document.querySelector("#weapon-value");
  const ammoValue = document.querySelector("#ammo-value");
  const waveValue = document.querySelector("#wave-value");
  const regionValue = document.querySelector("#region-value");
  const scoreValue = document.querySelector("#score-value");
  const bestValue = document.querySelector("#best-value");
  const difficultyLabel = document.querySelector("#difficulty-label");
  const levelValue = document.querySelector("#level-value");
  const xpValue = document.querySelector("#xp-value");
  const xpBar = document.querySelector("#xp-bar");
  const xpProgress = document.querySelector("#xp-progress");
  const pauseButton = document.querySelector("#pause-button");
  const restartButton = document.querySelector("#restart-button");
  const reloadButton = document.querySelector("#reload-button");
  const touchReload = document.querySelector("#touch-reload");
  const touchPause = document.querySelector("#touch-pause");
  const statusElement = document.querySelector("#game-status");
  const moveStick = document.querySelector("#move-stick");
  const aimStick = document.querySelector("#aim-stick");
  const soundToggle = document.querySelector("#sound-toggle");
  const weaponButtons = [...document.querySelectorAll(".weapon-button")];
  const difficultyButtons = [...document.querySelectorAll(".difficulty-button")];

  const requiredElements = [
    canvas, context, overlay, overlayIcon, overlayEyebrow, overlayTitle, overlayMessage, overlayAction,
    overlayHint, difficultyPicker, levelPicker, changeDifficulty, upgradeOptions, healthValue, healthBar, weaponValue,
    ammoValue, waveValue, regionValue, scoreValue, bestValue, difficultyLabel, levelValue, xpValue, xpBar, xpProgress,
    pauseButton, restartButton, reloadButton, touchReload, touchPause, statusElement, moveStick, aimStick, soundToggle
  ];
  if (requiredElements.some((element) => !element) || weaponButtons.length !== Object.keys(WEAPONS).length || difficultyButtons.length !== 3) {
    console.error("Zombie Survival could not initialize: required game elements or Canvas 2D support are unavailable.");
    if (overlayTitle) overlayTitle.textContent = "Game unavailable";
    if (overlayMessage) overlayMessage.textContent = "This browser could not start the Canvas game. Try a current browser with Canvas 2D support.";
    if (overlayAction) overlayAction.disabled = true;
    return;
  }

  function explodeAt(x, y, damage, radius, ignoreZombie = null) {
    if (explosions.length >= 12) explosions.shift();
    explosions.push({ x, y, radius, life: 0.32 });
    shakeRemaining = reducedMotion.matches ? 0 : 0.26;
    playSound("explosion");
    spawnParticle(x, y, "#ff9c62", 22, 1.1);
    if (Math.hypot(player.x - x, player.y - y) < radius + player.radius) damagePlayer(damage);
    for (let index = zombies.length - 1; index >= 0; index -= 1) {
      const target = zombies[index];
      if (target === ignoreZombie) continue;
      const distance = Math.hypot(target.x - x, target.y - y);
      if (distance > radius + target.radius) continue;
      target.health -= damage * (1 - Math.min(0.65, distance / (radius * 1.6)));
      target.hitFlash = 0.12;
      if (target.health <= 0) killZombie(index, true);
    }
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const keys = new Set();
  const zombies = [];
  const zombiePool = [];
  const bullets = [];
  const bulletPool = [];
  const enemyBullets = [];
  const enemyBulletPool = [];
  const pickups = [];
  const pickupPool = [];
  const particles = [];
  const particlePool = [];
  const damageNumbers = [];
  const damageNumberPool = [];
  const bloodSplats = [];
  const bloodPool = [];
  const puddles = [];
  const puddlePool = [];
  const explosions = [];
  const obstacles = [];
  const zombieSprites = {};
  const levelBackgrounds = [];
  const cleanups = [];
  let audioContext = null;
  let activeSounds = 0;
  let audioUnlockBound = false;
  const weaponState = Object.fromEntries(Object.entries(WEAPONS).map(([id, weapon]) => [
    id, { magazine: weapon.magazine, reserve: weapon.reserve }
  ]));

  let selectedDifficulty = "medium";
  let selectedLevel = 0;
  let unlockedLevels = 1;
  let unlockedWeapons = new Set(["pistol", "shotgun", "rifle"]);
  let selectedWeapon = "pistol";
  let gameState = "ready";
  let score = 0;
  let bestScore = 0;
  let bestWave = 0;
  let wave = 1;
  let spawnRemaining = 0;
  let bossPending = false;
  let weaponNotice = 0;
  let weaponNoticeLabel = "";
  let spawnTimer = 0;
  let waveDelay = 0;
  let player = { x: WORLD.width / 2, y: WORLD.height / 2, radius: 13, health: 100, maxHealth: 100, speed: 205, aimX: 1, aimY: 0, invulnerable: 0 };
  let damageMultiplier = 1;
  let fireRateMultiplier = 1;
  let movementMultiplier = 1;
  let reloadMultiplier = 1;
  let level = 1;
  let xp = 0;
  let xpGoal = 40;
  let queuedUpgrades = 0;
  let activeUpgrades = [];
  let fireCooldown = 0;
  let reloadRemaining = 0;
  let invulnerabilityTimer = 0;
  let shakeRemaining = 0;
  let mouseX = WORLD.width / 2;
  let mouseY = WORLD.height / 2;
  let mouseFire = false;
  let keyboardFire = false;
  let moveAxisX = 0;
  let moveAxisY = 0;
  let aimAxisX = 0;
  let aimAxisY = 0;
  let movePointer = null;
  let aimPointer = null;
  let frameHandle = 0;
  let previousFrameTime = 0;
  let pixelRatio = 1;
  let storageWarningShown = false;
  let resizeObserver = null;

  function listen(target, event, handler, options) {
    target.addEventListener(event, handler, options);
    cleanups.push(() => target.removeEventListener(event, handler, options));
  }

  function storageKey(difficulty, levelIndex = selectedLevel) {
    return `labz-zombie-survival-v2-best-${levelIndex}-${difficulty}`;
  }

  function saveProgress() {
    try {
      window.localStorage.setItem("labz-zombie-survival-v2-progress", JSON.stringify({ unlockedLevels }));
    } catch (error) {
      if (!storageWarningShown) {
        console.warn("Zombie Survival could not save level progress; this run will continue.", error);
        storageWarningShown = true;
      }
    }
    renderLevelPicker();
  }

  function loadBest() {
    try {
      const progress = JSON.parse(window.localStorage.getItem("labz-zombie-survival-v2-progress") || "{}");
      unlockedLevels = Number.isSafeInteger(progress.unlockedLevels) ? Math.min(LEVELS.length, Math.max(1, progress.unlockedLevels)) : 1;
    } catch (error) {
      console.warn("Zombie Survival could not read saved level progress; using the first level.", error);
      unlockedLevels = 1;
    }
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey(selectedDifficulty)) || "{}");
      bestScore = saved && Number.isSafeInteger(saved.score) && saved.score >= 0 ? saved.score : 0;
      bestWave = saved && Number.isSafeInteger(saved.wave) && saved.wave >= 0 ? saved.wave : 0;
    } catch (error) {
      console.warn("Zombie Survival could not read saved records; starting with a fresh record.", error);
      bestScore = 0;
      bestWave = 0;
    }
    bestValue.textContent = `${bestScore} · W${bestWave}`;
    difficultyLabel.textContent = DIFFICULTIES[selectedDifficulty].label;
    renderLevelPicker();
  }

  function saveBest() {
    const newBestScore = Math.max(bestScore, score);
    const newBestWave = Math.max(bestWave, wave);
    if (newBestScore === bestScore && newBestWave === bestWave) return;
    bestScore = newBestScore;
    bestWave = newBestWave;
    bestValue.textContent = `${bestScore} · W${bestWave}`;
    try {
      window.localStorage.setItem(storageKey(selectedDifficulty), JSON.stringify({ score: bestScore, wave: bestWave }));
    } catch (error) {
      if (!storageWarningShown) {
        console.warn("Zombie Survival could not save its best record; this run will continue.", error);
        storageWarningShown = true;
      }
    }
  }

  function updateHud() {
    healthValue.textContent = `${Math.ceil(player.health)} / ${player.maxHealth}`;
    healthBar.style.width = `${Math.max(0, player.health / player.maxHealth) * 100}%`;
    healthBar.setAttribute("aria-label", `${Math.ceil(player.health)} of ${player.maxHealth} health`);
    const weapon = WEAPONS[selectedWeapon];
    const ammo = weaponState[selectedWeapon];
    weaponValue.textContent = weapon.label;
    ammoValue.textContent = `${ammo.magazine} / ${ammo.reserve}${reloadRemaining > 0 ? " · RELOADING" : ""}`;
    waveValue.textContent = String(wave);
    regionValue.textContent = LEVELS[selectedLevel].name;
    scoreValue.textContent = String(score);
    bestValue.textContent = `${bestScore} · W${bestWave}`;
    levelValue.textContent = `LV ${level}`;
    xpValue.textContent = `${xp} / ${xpGoal} XP`;
    xpBar.style.width = `${Math.min(100, xp / xpGoal * 100)}%`;
    xpProgress.setAttribute("aria-valuemax", String(xpGoal));
    xpProgress.setAttribute("aria-valuenow", String(xp));
  }

  function syncSoundButton() {
    const enabled = window.LABZ?.isSoundOn?.() ?? true;
    soundToggle.textContent = enabled ? "♫" : "♪̸";
    soundToggle.setAttribute("aria-label", enabled ? "Mute sounds" : "Enable sounds");
    soundToggle.setAttribute("aria-pressed", String(enabled));
    soundToggle.title = enabled ? "Sound on" : "Sound off";
  }

  function unlockAudio() {
    if (audioUnlockBound || !(window.LABZ?.isSoundOn?.() ?? true)) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      if (!audioContext) audioContext = new Audio();
      if (audioContext.state === "suspended") {
        audioContext.resume().catch((error) => console.warn("Zombie Survival could not resume audio.", error));
      }
      audioUnlockBound = true;
    } catch (error) {
      console.warn("Zombie Survival could not initialize audio.", error);
    }
  }

  function playSound(type) {
    if (!(window.LABZ?.isSoundOn?.() ?? true) || !audioContext || audioContext.state !== "running" || activeSounds >= 12) return;
    const sounds = {
      pistol: [220, 0.055, "square", 0.035], shotgun: [105, 0.11, "sawtooth", 0.055],
      rifle: [165, 0.045, "square", 0.03], smg: [245, 0.035, "square", 0.022],
      sniper: [82, 0.18, "sawtooth", 0.065], grenade: [64, 0.24, "triangle", 0.075],
      reload: [340, 0.13, "sine", 0.035], empty: [125, 0.035, "square", 0.018],
      groan: [92, 0.32, "sawtooth", 0.022], runner: [150, 0.2, "triangle", 0.018],
      tank: [58, 0.42, "sawtooth", 0.03], spitter: [195, 0.3, "triangle", 0.022],
      crawler: [74, 0.26, "sawtooth", 0.02], exploder: [110, 0.35, "sawtooth", 0.025],
      screamer: [480, 0.42, "sawtooth", 0.025], armored: [130, 0.24, "square", 0.025],
      toxic: [105, 0.34, "triangle", 0.024], ghoul: [68, 0.3, "sawtooth", 0.025],
      hit: [280, 0.045, "triangle", 0.022], death: [72, 0.2, "sawtooth", 0.025],
      explosion: [54, 0.32, "sawtooth", 0.07], hurt: [115, 0.16, "sawtooth", 0.05],
      pickup: [620, 0.09, "sine", 0.03], levelup: [520, 0.2, "triangle", 0.035],
      wave: [250, 0.13, "sine", 0.03], boss: [62, 0.55, "sawtooth", 0.045],
      complete: [740, 0.35, "triangle", 0.04], gameover: [95, 0.55, "sawtooth", 0.045]
    };
    const [frequency, duration, waveform, volume] = sounds[type] || sounds.hit;
    try {
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const pitch = frequency * (type === "groan" || type === "death" ? 0.85 + Math.random() * 0.3 : 1);
      oscillator.type = waveform;
      oscillator.frequency.setValueAtTime(pitch, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(35, pitch * (type === "pickup" || type === "levelup" ? 1.5 : 0.55)), now + duration);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      activeSounds += 1;
      oscillator.onended = () => { activeSounds = Math.max(0, activeSounds - 1); };
      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch (error) {
      console.warn("Zombie Survival could not play a sound effect.", error);
    }
  }

  function updateWeaponButtons() {
    weaponButtons.forEach((button) => {
      const selected = button.dataset.weapon === selectedWeapon;
      const unlocked = unlockedWeapons.has(button.dataset.weapon);
      button.disabled = !unlocked;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function selectWeapon(id) {
    if (!WEAPONS[id] || !unlockedWeapons.has(id)) return;
    if (reloadRemaining > 0) reloadRemaining = 0;
    selectedWeapon = id;
    updateWeaponButtons();
    updateHud();
  }

  function showOverlay(kind) {
    overlay.hidden = false;
    overlay.scrollTop = 0;
    upgradeOptions.hidden = true;
    upgradeOptions.innerHTML = "";
    difficultyPicker.hidden = true;
    levelPicker.hidden = true;
    changeDifficulty.hidden = true;
    overlayHint.hidden = false;
    overlayAction.hidden = false;
    overlayAction.dataset.action = "";
    overlayIcon.textContent = "☣";

    if (kind === "ready") {
      overlayEyebrow.textContent = "STAY SHARP";
      overlayTitle.textContent = "The night is yours to survive.";
      overlayMessage.textContent = "Survive 10 waves in each region. Every fifth wave brings its boss. Collect supplies, earn XP, and choose upgrades.";
      difficultyPicker.hidden = false;
      levelPicker.hidden = false;
      overlayAction.textContent = "Start Survival";
      overlayAction.dataset.action = "start";
      overlayHint.textContent = "Move: WASD / arrows · Aim: mouse · Fire: click / Space · Weapons unlock as you survive.";
    } else if (kind === "paused") {
      overlayEyebrow.textContent = "TAKE A BREATHER";
      overlayTitle.textContent = "Run paused.";
      overlayMessage.textContent = `Wave ${wave} · Score ${score}. The horde can wait.`;
      overlayAction.textContent = "Resume";
      overlayAction.dataset.action = "resume";
      overlayHint.textContent = "Press P or Escape to jump back in.";
    } else if (kind === "gameover") {
      overlayIcon.textContent = "✕";
      overlayEyebrow.textContent = "RUN COMPLETE";
      overlayTitle.textContent = "The night got you.";
      overlayMessage.textContent = `You reached wave ${wave} with a score of ${score}. Best: ${bestScore} points · wave ${bestWave} on ${DIFFICULTIES[selectedDifficulty].label}.`;
      overlayAction.textContent = "Try Again";
      overlayAction.dataset.action = "restart";
      changeDifficulty.hidden = false;
      overlayHint.textContent = "Switch up the difficulty or take another run.";
      levelPicker.hidden = false;
    } else if (kind === "levelcomplete") {
      overlayIcon.textContent = "✦";
      overlayEyebrow.textContent = `REGION ${selectedLevel + 1} CLEARED`;
      overlayTitle.textContent = "Level Complete";
      overlayMessage.textContent = `${LEVELS[selectedLevel].name} survived. Score ${score}. ${selectedLevel < LEVELS.length - 1 ? `${LEVELS[selectedLevel + 1].name} is now unlocked.` : "You cleared the Blood Moon Arena."}`;
      overlayAction.textContent = selectedLevel < LEVELS.length - 1 ? "Next Level" : "Choose Level";
      overlayAction.dataset.action = selectedLevel < LEVELS.length - 1 ? "next-level" : "level-select";
      overlayHint.textContent = "Your score and unlocked level are saved.";
      if (selectedLevel === LEVELS.length - 1) levelPicker.hidden = false;
    } else if (kind === "upgrade") {
      overlayIcon.textContent = "✦";
      overlayEyebrow.textContent = `LEVEL ${level} REACHED`;
      overlayTitle.textContent = "Pick your edge.";
      overlayMessage.textContent = "Choose one upgrade before the next wave closes in.";
      overlayAction.hidden = true;
      overlayHint.hidden = true;
      upgradeOptions.hidden = false;
      upgradeOptions.innerHTML = activeUpgrades.map((upgrade) => `
        <button class="upgrade-choice" type="button" data-upgrade="${upgrade.id}">
          <span aria-hidden="true">${upgrade.icon}</span>
          <span><strong>${upgrade.name}</strong><small>${upgrade.detail}</small></span>
        </button>
      `).join("");
    }
  }

  function hideOverlay() {
    overlay.hidden = true;
  }

  function announce(message) {
    statusElement.textContent = message;
  }

  function renderLevelPicker() {
    if (!levelPicker) return;
    levelPicker.innerHTML = LEVELS.map((item, index) => {
      const locked = index >= unlockedLevels;
      return `<button class="level-choice" type="button" data-level="${index}" aria-pressed="${index === selectedLevel}" ${locked ? "disabled" : ""}>${item.name}${locked ? " · Locked" : ""}</button>`;
    }).join("");
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * pixelRatio);
    canvas.height = Math.round(rect.height * pixelRatio);
    context.setTransform(canvas.width / WORLD.width, 0, 0, canvas.height / WORLD.height, 0, 0);
    render();
  }

  function takeFromPool(pool, factory) {
    return pool.pop() || factory();
  }

  function release(array, index, pool, reset) {
    const item = array[index];
    array[index] = array[array.length - 1];
    array.pop();
    reset(item);
    pool.push(item);
  }

  function spawnParticle(x, y, color, count = 1, force = 1) {
    const cap = reducedMotion.matches ? WORLD.reducedParticleCap : WORLD.particleCap;
    for (let index = 0; index < count && particles.length < cap; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (35 + Math.random() * 180) * force;
      const particle = takeFromPool(particlePool, () => ({}));
      Object.assign(particle, {
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 0.18 + Math.random() * 0.42, maxLife: 0.6, size: 1.5 + Math.random() * 3.5, color
      });
      particle.maxLife = particle.life;
      particles.push(particle);
    }
  }

  function spawnDamageNumber(x, y, amount, color = "#ffe6b4") {
    if (damageNumbers.length >= 30) return;
    const number = takeFromPool(damageNumberPool, () => ({}));
    Object.assign(number, { x, y, text: String(Math.round(amount)), life: 0.72, maxLife: 0.72, color });
    damageNumbers.push(number);
  }

  function spawnPickup(x, y, kind) {
    if (pickups.length >= 18) return;
    const pickup = takeFromPool(pickupPool, () => ({}));
    Object.assign(pickup, { x, y, kind, life: 13, pulse: Math.random() * 5 });
    pickups.push(pickup);
  }

  function buildLevels() {
    LEVELS.forEach((theme, index) => {
      const scene = document.createElement("canvas");
      scene.width = WORLD.width;
      scene.height = WORLD.height;
      const sceneContext = scene.getContext("2d");
      sceneContext.fillStyle = theme.floor;
      sceneContext.fillRect(0, 0, WORLD.width, WORLD.height);
      sceneContext.globalAlpha = 0.18;
      sceneContext.fillStyle = theme.accent;
      for (let mark = 0; mark < 48; mark += 1) {
        const x = (mark * 173 + index * 47 + 61) % WORLD.width;
        const y = (mark * 113 + index * 29 + 31) % WORLD.height;
        sceneContext.beginPath();
        sceneContext.ellipse(x, y, 3 + mark % 7, 2 + mark % 4, mark * 0.4, 0, Math.PI * 2);
        sceneContext.fill();
      }
      sceneContext.globalAlpha = 1;
      sceneContext.strokeStyle = `${theme.accent}16`;
      sceneContext.lineWidth = 1;
      for (let x = 0; x <= WORLD.width; x += 48) {
        sceneContext.beginPath(); sceneContext.moveTo(x, 0); sceneContext.lineTo(x, WORLD.height); sceneContext.stroke();
      }
      for (let y = 0; y <= WORLD.height; y += 48) {
        sceneContext.beginPath(); sceneContext.moveTo(0, y); sceneContext.lineTo(WORLD.width, y); sceneContext.stroke();
      }
      const levelObstacles = LEVEL_OBSTACLES[index].map(([x, y, width, height, kind]) => ({ x, y, width, height, kind }));
      levelObstacles.forEach((obstacle) => {
        sceneContext.fillStyle = "#090b12";
        sceneContext.fillRect(obstacle.x + 3, obstacle.y + 5, obstacle.width, obstacle.height);
        sceneContext.fillStyle = theme.obstacle;
        sceneContext.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        sceneContext.strokeStyle = `${theme.accent}b0`;
        sceneContext.lineWidth = 2;
        sceneContext.strokeRect(obstacle.x + 1, obstacle.y + 1, obstacle.width - 2, obstacle.height - 2);
        if (obstacle.kind === "tomb") {
          sceneContext.beginPath();
          sceneContext.moveTo(obstacle.x + 5, obstacle.y + 9);
          sceneContext.quadraticCurveTo(obstacle.x + obstacle.width / 2, obstacle.y - 7, obstacle.x + obstacle.width - 5, obstacle.y + 9);
          sceneContext.lineTo(obstacle.x + obstacle.width - 5, obstacle.y + obstacle.height - 5);
          sceneContext.lineTo(obstacle.x + 5, obstacle.y + obstacle.height - 5);
          sceneContext.closePath();
          sceneContext.fillStyle = theme.obstacle;
          sceneContext.fill();
          sceneContext.stroke();
        } else {
          sceneContext.strokeStyle = "rgba(10,12,16,.48)";
          sceneContext.beginPath();
          sceneContext.moveTo(obstacle.x + 5, obstacle.y + 5);
          sceneContext.lineTo(obstacle.x + obstacle.width - 5, obstacle.y + obstacle.height - 5);
          sceneContext.moveTo(obstacle.x + obstacle.width - 5, obstacle.y + 5);
          sceneContext.lineTo(obstacle.x + 5, obstacle.y + obstacle.height - 5);
          sceneContext.stroke();
        }
      });
      levelBackgrounds[index] = scene;
    });
  }

  function circleHitsObstacle(x, y, radius) {
    return obstacles.some((obstacle) => {
      const nearestX = Math.max(obstacle.x, Math.min(x, obstacle.x + obstacle.width));
      const nearestY = Math.max(obstacle.y, Math.min(y, obstacle.y + obstacle.height));
      return Math.hypot(x - nearestX, y - nearestY) < radius;
    });
  }

  function setLevelScene() {
    obstacles.length = 0;
    LEVEL_OBSTACLES[selectedLevel].forEach(([x, y, width, height, kind]) => obstacles.push({ x, y, width, height, kind }));
    render();
  }

  function spawnBlood(x, y, color = "#7d2838") {
    if (bloodSplats.length >= WORLD.maxBlood) {
      const oldest = bloodSplats.shift();
      bloodPool.push(oldest);
    }
    const splat = takeFromPool(bloodPool, () => ({}));
    Object.assign(splat, { x, y, radius: 5 + Math.random() * 12, life: 4.5, maxLife: 4.5, color });
    bloodSplats.push(splat);
  }

  function spawnPuddle(x, y, kind = "toxic") {
    if (puddles.length >= WORLD.maxPuddles) {
      puddlePool.push(puddles.shift());
    }
    const puddle = takeFromPool(puddlePool, () => ({}));
    Object.assign(puddle, { x, y, radius: 22 + Math.random() * 12, life: 7, damageTimer: 0, kind });
    puddles.push(puddle);
  }

  function spawnZombie(typeId, boss = false) {
    if (zombies.length >= WORLD.maxZombies) return false;
    const bossName = boss ? LEVELS[selectedLevel].boss : "";
    const definition = boss ? { health: 620 + selectedLevel * 90, speed: 22 + selectedLevel, radius: 34, damage: 24 + selectedLevel * 2, score: 1800 + selectedLevel * 250, xp: 75, color: LEVELS[selectedLevel].accent, drop: 1, sound: "boss" } : ZOMBIE_TYPES[typeId];
    const side = Math.floor(Math.random() * 4);
    const x = side === 0 ? -25 : side === 1 ? WORLD.width + 25 : 35 + Math.random() * (WORLD.width - 70);
    const y = side === 2 ? -25 : side === 3 ? WORLD.height + 25 : 35 + Math.random() * (WORLD.height - 70);
    const factor = DIFFICULTIES[selectedDifficulty];
    const zombie = takeFromPool(zombiePool, () => ({}));
    const waveScale = 1 + Math.max(0, wave - 1) * 0.085;
    Object.assign(zombie, {
      id: typeId, boss, bossName, x, y, radius: definition.radius * (boss ? 1 : 0.94 + Math.random() * 0.12),
      health: definition.health * factor.health * waveScale,
      maxHealth: definition.health * factor.health * waveScale,
      speed: definition.speed * factor.speed * (1 + Math.min(0.35, wave * 0.012)),
      damage: definition.damage, score: definition.score, xp: definition.xp,
      color: definition.color, drop: definition.drop, sound: definition.sound, attackCooldown: 0.4 + Math.random() * 0.7,
      spitCooldown: 0.8 + Math.random() * 1.6, hitFlash: 0, wobble: Math.random() * Math.PI * 2,
      armor: typeId === "armored" ? 48 : 0, screamerCooldown: 1.5, buffTime: 0, lungeTime: 0.7, pauseTime: 0.5
    });
    zombies.push(zombie);
    if (boss) playSound("boss");
    else if (Math.random() < 0.14) playSound(definition.sound);
    return true;
  }

  function chooseZombieType() {
    const levelMix = LEVELS[selectedLevel].mix;
    const choices = ["walker", "walker", "walker"];
    if (wave >= 2) choices.push("runner", levelMix.includes("crawler") ? "crawler" : "runner");
    if (wave >= 3) choices.push("tank", ...levelMix.filter((type) => ["exploder", "screamer"].includes(type)));
    if (wave >= 4) choices.push("spitter", ...levelMix.filter((type) => ["armored", "toxic", "ghoul"].includes(type)));
    if (wave >= 6) choices.push(...levelMix);
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function beginWave() {
    spawnRemaining = Math.min(7 + wave * 2, 34);
    bossPending = wave === 5 || wave === 10;
    spawnTimer = 0.35;
    announce(bossPending ? `Wave ${wave}. Boss detected.` : `Wave ${wave}. Incoming.`);
    playSound(bossPending ? "boss" : "wave");
    for (const [id, definition] of Object.entries(WEAPONS)) {
      if (definition.unlockWave && wave >= definition.unlockWave && !unlockedWeapons.has(id)) {
        unlockedWeapons.add(id);
        weaponNotice = 2.8;
        weaponNoticeLabel = definition.label;
        updateWeaponButtons();
        announce(`${definition.label} unlocked!`);
      }
    }
    updateHud();
  }

  function resetRun() {
    for (let index = zombies.length - 1; index >= 0; index -= 1) release(zombies, index, zombiePool, (item) => { item.id = ""; });
    for (let index = bullets.length - 1; index >= 0; index -= 1) release(bullets, index, bulletPool, (item) => { item.x = 0; });
    for (let index = enemyBullets.length - 1; index >= 0; index -= 1) release(enemyBullets, index, enemyBulletPool, (item) => { item.x = 0; });
    for (let index = pickups.length - 1; index >= 0; index -= 1) release(pickups, index, pickupPool, (item) => { item.kind = ""; });
    for (let index = particles.length - 1; index >= 0; index -= 1) release(particles, index, particlePool, (item) => { item.life = 0; });
    for (let index = bloodSplats.length - 1; index >= 0; index -= 1) release(bloodSplats, index, bloodPool, (item) => { item.life = 0; });
    for (let index = puddles.length - 1; index >= 0; index -= 1) release(puddles, index, puddlePool, (item) => { item.life = 0; });
    explosions.length = 0;
    damageNumbers.length = 0;
    score = 0;
    wave = 1;
    spawnRemaining = 0;
    bossPending = false;
    spawnTimer = 0;
    waveDelay = 0;
    player = { x: WORLD.width / 2, y: WORLD.height / 2, radius: 13, health: 100, maxHealth: 100, speed: 205, aimX: 1, aimY: 0, invulnerable: 0 };
    damageMultiplier = 1;
    fireRateMultiplier = 1;
    movementMultiplier = 1;
    reloadMultiplier = 1;
    level = 1;
    xp = 0;
    xpGoal = 40;
    queuedUpgrades = 0;
    activeUpgrades = [];
    fireCooldown = 0;
    reloadRemaining = 0;
    invulnerabilityTimer = 0;
    shakeRemaining = 0;
    selectedWeapon = "pistol";
    unlockedWeapons = new Set(["pistol", "shotgun", "rifle"]);
    Object.entries(WEAPONS).forEach(([id, weapon]) => {
      weaponState[id].magazine = weapon.magazine;
      weaponState[id].reserve = weapon.reserve;
    });
    moveAxisX = 0;
    moveAxisY = 0;
    aimAxisX = 0;
    aimAxisY = 0;
    mouseFire = false;
    keyboardFire = false;
    resetStick(moveStick);
    resetStick(aimStick);
    updateWeaponButtons();
    updateHud();
  }

  function startGame() {
    resetRun();
    setLevelScene();
    gameState = "playing";
    hideOverlay();
    pauseButton.disabled = false;
    pauseButton.innerHTML = '<span aria-hidden="true">Ⅱ</span> Pause';
    touchPause.textContent = "Pause";
    beginWave();
    previousFrameTime = 0;
    startLoop();
    canvas.focus({ preventScroll: true });
  }

  function startLoop() {
    if (!frameHandle && gameState === "playing") frameHandle = window.requestAnimationFrame(frame);
  }

  function stopLoop() {
    if (frameHandle) window.cancelAnimationFrame(frameHandle);
    frameHandle = 0;
    previousFrameTime = 0;
  }

  function pauseGame() {
    if (gameState !== "playing") return;
    gameState = "paused";
    stopLoop();
    pauseButton.innerHTML = '<span aria-hidden="true">▶</span> Resume';
    touchPause.textContent = "Resume";
    showOverlay("paused");
    render();
    announce("Game paused.");
  }

  function resumeGame() {
    if (gameState !== "paused") return;
    gameState = "playing";
    hideOverlay();
    pauseButton.innerHTML = '<span aria-hidden="true">Ⅱ</span> Pause';
    touchPause.textContent = "Pause";
    announce(`Wave ${wave}. Keep moving.`);
    startLoop();
  }

  function togglePause() {
    if (gameState === "playing") pauseGame();
    else if (gameState === "paused") resumeGame();
  }

  function finishGame() {
    if (gameState === "gameover") return;
    gameState = "gameover";
    stopLoop();
    saveBest();
    playSound("gameover");
    pauseButton.disabled = true;
    showOverlay("gameover");
    render();
    announce(`Game over. Score ${score}, wave ${wave}.`);
  }

  function finishLevel() {
    gameState = "levelcomplete";
    stopLoop();
    saveBest();
    unlockedLevels = Math.max(unlockedLevels, Math.min(LEVELS.length, selectedLevel + 2));
    saveProgress();
    playSound("complete");
    showOverlay("levelcomplete");
    render();
    announce(`${LEVELS[selectedLevel].name} complete. Level ${unlockedLevels} unlocked.`);
  }

  function shuffledUpgrades() {
    const choices = UPGRADE_DEFS.slice();
    for (let index = choices.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [choices[index], choices[swap]] = [choices[swap], choices[index]];
    }
    return choices.slice(0, 3);
  }

  function gainXP(amount) {
    xp += amount;
    if (xp >= xpGoal && gameState === "playing") {
      xp -= xpGoal;
      level += 1;
      playSound("levelup");
      xpGoal = Math.round(xpGoal * 1.18 + 10);
      queuedUpgrades += 1;
      openUpgrade();
    }
    updateHud();
  }

  function openUpgrade() {
    if (!queuedUpgrades) return;
    queuedUpgrades -= 1;
    gameState = "upgrade";
    stopLoop();
    activeUpgrades = shuffledUpgrades();
    showOverlay("upgrade");
    announce(`Level ${level}. Choose an upgrade.`);
  }

  function applyUpgrade(id) {
    if (id === "damage") damageMultiplier *= 1.2;
    if (id === "fireRate") fireRateMultiplier *= 1.15;
    if (id === "speed") movementMultiplier *= 1.12;
    if (id === "maxHealth") {
      player.maxHealth += 20;
      player.health = Math.min(player.maxHealth, player.health + 20);
    }
    if (id === "reload") reloadMultiplier *= 1.18;
    updateHud();
    if (queuedUpgrades > 0) {
      openUpgrade();
      return;
    }
    gameState = "playing";
    hideOverlay();
    announce(`Upgrade selected. Level ${level}.`);
    startLoop();
  }

  function reload() {
    const weapon = WEAPONS[selectedWeapon];
    const ammo = weaponState[selectedWeapon];
    if (gameState !== "playing" || reloadRemaining > 0 || ammo.magazine >= weapon.magazine || ammo.reserve <= 0) return;
    reloadRemaining = weapon.reload / reloadMultiplier;
    playSound("reload");
    updateHud();
    announce(`Reloading ${weapon.label.toLowerCase()}.`);
  }

  function finishReload() {
    const weapon = WEAPONS[selectedWeapon];
    const ammo = weaponState[selectedWeapon];
    const amount = Math.min(weapon.magazine - ammo.magazine, ammo.reserve);
    ammo.magazine += amount;
    ammo.reserve -= amount;
    reloadRemaining = 0;
    updateHud();
  }

  function fire() {
    if (gameState !== "playing" || reloadRemaining > 0 || fireCooldown > 0) return;
    const weapon = WEAPONS[selectedWeapon];
    const ammo = weaponState[selectedWeapon];
    if (ammo.magazine <= 0) {
      playSound("empty");
      if (ammo.reserve > 0) reload();
      return;
    }
    ammo.magazine -= 1;
    fireCooldown = weapon.cooldown / fireRateMultiplier;
    playSound(weapon.sound || selectedWeapon);
    const baseAngle = Math.atan2(player.aimY, player.aimX);
    const shotCount = Math.min(weapon.pellets, WORLD.maxBullets - bullets.length);
    for (let index = 0; index < shotCount; index += 1) {
      const centered = index - (shotCount - 1) / 2;
      const angle = baseAngle + centered * weapon.spread + (Math.random() - 0.5) * weapon.spread * 0.22;
      const bullet = takeFromPool(bulletPool, () => ({}));
      const hitZombies = bullet.hitZombies || new Set();
      hitZombies.clear();
      Object.assign(bullet, {
        x: player.x + Math.cos(angle) * 19, y: player.y + Math.sin(angle) * 19,
        vx: Math.cos(angle) * weapon.speed, vy: Math.sin(angle) * weapon.speed,
        damage: weapon.damage * damageMultiplier, radius: selectedWeapon === "shotgun" ? 3.5 : 3,
        life: selectedWeapon === "sniper" ? 1.4 : 0.9,
        color: weapon.muzzle,
        explosive: Boolean(weapon.explosive), pierce: Boolean(weapon.pierce), hitZombies
      });
      bullets.push(bullet);
    }
    spawnParticle(player.x + player.aimX * 21, player.y + player.aimY * 21, weapon.muzzle, selectedWeapon === "shotgun" ? 8 : weapon.explosive ? 10 : 4, 0.7);
    if (weapon.explosive) shakeRemaining = reducedMotion.matches ? 0 : 0.16;
    updateHud();
  }

  function damagePlayer(amount) {
    if (player.invulnerable > 0 || gameState !== "playing") return;
    player.health = Math.max(0, player.health - amount);
    playSound("hurt");
    player.invulnerable = 0.7;
    shakeRemaining = reducedMotion.matches ? 0 : 0.2;
    spawnParticle(player.x, player.y, "#ff536b", 15, 1.3);
    spawnDamageNumber(player.x, player.y - 23, amount, "#ff7687");
    updateHud();
    if (player.health <= 0) finishGame();
  }

  function killZombie(index, fromBlast = false) {
    const zombie = zombies[index];
    if (zombie.id === "exploder" && !zombie.exploded && !fromBlast) {
      zombie.exploded = true;
      explodeAt(zombie.x, zombie.y, zombie.damage, 76, zombie);
    }
    spawnBlood(zombie.x, zombie.y, zombie.id === "toxic" ? "#57983e" : "#7d2838");
    if (zombie.id === "toxic") spawnPuddle(zombie.x, zombie.y);
    score += zombie.score;
    playSound("death");
    saveBest();
    spawnParticle(zombie.x, zombie.y, zombie.color, zombie.boss ? 36 : 10, zombie.boss ? 1.4 : 1);
    if (Math.random() < zombie.drop) {
      const kind = Math.random() < 0.54 ? "ammo" : "health";
      spawnPickup(zombie.x, zombie.y, kind);
    }
    const earnedXP = zombie.xp;
    zombie.corpseType = zombie.id;
    zombie.corpseBoss = zombie.boss;
    release(zombies, index, zombiePool, (item) => { item.id = ""; });
    gainXP(earnedXP);
    updateHud();
  }

  function movePlayer(delta) {
    const left = keys.has("a") || keys.has("arrowleft");
    const right = keys.has("d") || keys.has("arrowright");
    const up = keys.has("w") || keys.has("arrowup");
    const down = keys.has("s") || keys.has("arrowdown");
    let dx = Number(right) - Number(left) + moveAxisX;
    let dy = Number(down) - Number(up) + moveAxisY;
    const length = Math.hypot(dx, dy);
    if (length > 1) { dx /= length; dy /= length; }
    const nextX = Math.max(player.radius + 5, Math.min(WORLD.width - player.radius - 5, player.x + dx * player.speed * movementMultiplier * delta));
    const nextY = Math.max(player.radius + 5, Math.min(WORLD.height - player.radius - 5, player.y + dy * player.speed * movementMultiplier * delta));
    if (!circleHitsObstacle(nextX, player.y, player.radius)) player.x = nextX;
    if (!circleHitsObstacle(player.x, nextY, player.radius)) player.y = nextY;

    if (aimPointer !== null && Math.hypot(aimAxisX, aimAxisY) > 0.18) {
      player.aimX = aimAxisX;
      player.aimY = aimAxisY;
      const aimLength = Math.hypot(player.aimX, player.aimY) || 1;
      player.aimX /= aimLength;
      player.aimY /= aimLength;
    } else {
      const aimDX = mouseX - player.x;
      const aimDY = mouseY - player.y;
      const aimLength = Math.hypot(aimDX, aimDY);
      if (aimLength > 1) {
        player.aimX = aimDX / aimLength;
        player.aimY = aimDY / aimLength;
      }
    }
  }

  function updateZombies(delta) {
    for (let index = zombies.length - 1; index >= 0; index -= 1) {
      const zombie = zombies[index];
      zombie.hitFlash = Math.max(0, zombie.hitFlash - delta);
      zombie.attackCooldown = Math.max(0, zombie.attackCooldown - delta);
      zombie.spitCooldown = Math.max(0, zombie.spitCooldown - delta);
      zombie.screamerCooldown = Math.max(0, zombie.screamerCooldown - delta);
      zombie.buffTime = Math.max(0, zombie.buffTime - delta);
      zombie.wobble += delta * (zombie.id === "runner" || zombie.id === "crawler" ? 8 : 4);
      const dx = player.x - zombie.x;
      const dy = player.y - zombie.y;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      let move = true;
      let speedMultiplier = zombie.buffTime > 0 ? 1.45 : 1;
      if (zombie.id === "screamer" && zombie.screamerCooldown <= 0) {
        for (const nearby of zombies) {
          if (nearby !== zombie && Math.hypot(nearby.x - zombie.x, nearby.y - zombie.y) < 245) nearby.buffTime = 3.5;
        }
        zombie.screamerCooldown = 8;
        playSound("screamer");
        spawnParticle(zombie.x, zombie.y, "#e596d1", 10, 0.6);
      }
      if (zombie.id === "ghoul") {
        if (zombie.pauseTime > 0) {
          zombie.pauseTime -= delta;
          move = false;
        } else {
          if (zombie.lungeTime <= 0) {
            zombie.lungeTime = 0.62;
            zombie.pauseTime = 0.82;
          }
          zombie.lungeTime -= delta;
          speedMultiplier *= 2.8;
        }
      }
      if (zombie.id === "exploder" && distance < zombie.radius + player.radius + 22) {
        zombie.exploded = true;
        explodeAt(zombie.x, zombie.y, zombie.damage, 82, zombie);
        const indexToRemove = zombies.indexOf(zombie);
        if (indexToRemove >= 0) killZombie(indexToRemove);
        if (gameState !== "playing") return;
        continue;
      }
      if (zombie.id === "spitter" && !zombie.boss && distance < 265) {
        move = distance < 155;
        if (zombie.spitCooldown <= 0 && distance < 390 && enemyBullets.length < WORLD.maxBullets) {
          const angle = Math.atan2(dy, dx);
          const bullet = takeFromPool(enemyBulletPool, () => ({}));
          Object.assign(bullet, {
            x: zombie.x + Math.cos(angle) * zombie.radius, y: zombie.y + Math.sin(angle) * zombie.radius,
            vx: Math.cos(angle) * 205, vy: Math.sin(angle) * 205, radius: 6, damage: zombie.damage,
            life: 2.8, color: "#79efe0"
          });
          enemyBullets.push(bullet);
          zombie.spitCooldown = 2.25 + Math.random() * 0.8;
        }
      }
      if (move) {
        const speed = zombie.speed * speedMultiplier;
        const nextX = zombie.x + dx / distance * speed * delta;
        const nextY = zombie.y + dy / distance * speed * delta;
        if (!circleHitsObstacle(nextX, zombie.y, zombie.radius)) zombie.x = nextX;
        if (!circleHitsObstacle(zombie.x, nextY, zombie.radius)) zombie.y = nextY;
      }
      if (distance < zombie.radius + player.radius && zombie.attackCooldown <= 0) {
        damagePlayer(zombie.damage);
        zombie.attackCooldown = zombie.boss ? 1.1 : 0.9;
      }
      if (gameState !== "playing") return;
    }
  }

  function updateBullets(delta) {
    for (let index = bullets.length - 1; index >= 0; index -= 1) {
      const bullet = bullets[index];
      bullet.x += bullet.vx * delta;
      bullet.y += bullet.vy * delta;
      bullet.life -= delta;
      const blocked = obstacles.some((obstacle) => bullet.x >= obstacle.x && bullet.x <= obstacle.x + obstacle.width && bullet.y >= obstacle.y && bullet.y <= obstacle.y + obstacle.height);
      if (bullet.life <= 0 || bullet.x < -20 || bullet.x > WORLD.width + 20 || bullet.y < -20 || bullet.y > WORLD.height + 20) {
        if (bullet.explosive) explodeAt(bullet.x, bullet.y, bullet.damage, 82);
        release(bullets, index, bulletPool, (item) => { item.x = 0; });
        continue;
      }
      if (blocked) {
        if (bullet.explosive) explodeAt(bullet.x, bullet.y, bullet.damage, 82);
        release(bullets, index, bulletPool, (item) => { item.x = 0; });
        continue;
      }
      let hit = false;
      for (let zombieIndex = zombies.length - 1; zombieIndex >= 0; zombieIndex -= 1) {
        const zombie = zombies[zombieIndex];
        if (Math.hypot(bullet.x - zombie.x, bullet.y - zombie.y) > bullet.radius + zombie.radius) continue;
        if (bullet.hitZombies?.has(zombie)) continue;
        if (bullet.pierce) bullet.hitZombies.add(zombie);
        const damage = bullet.explosive ? bullet.damage * 0.35 : zombie.armor > 0 ? bullet.damage * 0.38 : bullet.damage;
        if (zombie.armor > 0) zombie.armor = Math.max(0, zombie.armor - bullet.damage * 0.9);
        zombie.health -= damage;
        zombie.hitFlash = 0.09;
        playSound("hit");
        spawnDamageNumber(zombie.x, zombie.y - zombie.radius, damage);
        spawnParticle(bullet.x, bullet.y, zombie.color, 2, 0.45);
        if (bullet.explosive) {
          if (zombie.health <= 0) killZombie(zombieIndex);
          explodeAt(bullet.x, bullet.y, bullet.damage, 90, zombie.health <= 0 ? zombie : null);
          release(bullets, index, bulletPool, (item) => { item.x = 0; });
        } else if (!bullet.pierce) {
          release(bullets, index, bulletPool, (item) => { item.x = 0; });
          if (zombie.health <= 0) killZombie(zombieIndex);
        } else if (zombie.health <= 0) {
          killZombie(zombieIndex);
        }
        hit = true;
        if (gameState !== "playing") return;
        if (bullet.pierce) continue;
        break;
      }
      if (hit && gameState !== "playing") return;
    }
    for (let index = enemyBullets.length - 1; index >= 0; index -= 1) {
      const bullet = enemyBullets[index];
      bullet.x += bullet.vx * delta;
      bullet.y += bullet.vy * delta;
      bullet.life -= delta;
      const blocked = obstacles.some((obstacle) => bullet.x >= obstacle.x && bullet.x <= obstacle.x + obstacle.width && bullet.y >= obstacle.y && bullet.y <= obstacle.y + obstacle.height);
      if (blocked || bullet.life <= 0 || bullet.x < -20 || bullet.x > WORLD.width + 20 || bullet.y < -20 || bullet.y > WORLD.height + 20) {
        release(enemyBullets, index, enemyBulletPool, (item) => { item.x = 0; });
      } else if (Math.hypot(bullet.x - player.x, bullet.y - player.y) < bullet.radius + player.radius) {
        damagePlayer(bullet.damage);
        release(enemyBullets, index, enemyBulletPool, (item) => { item.x = 0; });
        if (gameState !== "playing") return;
      }
    }
  }

  function collectPickups(delta) {
    for (let index = pickups.length - 1; index >= 0; index -= 1) {
      const pickup = pickups[index];
      pickup.life -= delta;
      pickup.pulse += delta * 4;
      if (pickup.life <= 0) {
        release(pickups, index, pickupPool, (item) => { item.kind = ""; });
        continue;
      }
      if (Math.hypot(pickup.x - player.x, pickup.y - player.y) > player.radius + 17) continue;
      if (pickup.kind === "health") {
        const restored = Math.min(30, player.maxHealth - player.health);
        if (restored <= 0) continue;
        player.health += restored;
        spawnDamageNumber(player.x, player.y - 23, `+${restored}`, "#87f0b0");
      } else {
        const ammo = weaponState[selectedWeapon];
        const added = Math.min(WEAPONS[selectedWeapon].maxReserve - ammo.reserve, Math.ceil(WEAPONS[selectedWeapon].magazine * 1.5));
        if (added <= 0) continue;
        ammo.reserve += added;
        spawnDamageNumber(player.x, player.y - 23, `+${added}`, "#7ff8ec");
      }
      spawnParticle(pickup.x, pickup.y, pickup.kind === "health" ? "#83e7a7" : "#7ff8ec", 9);
      playSound("pickup");
      release(pickups, index, pickupPool, (item) => { item.kind = ""; });
      announce(pickup.kind === "health" ? "Health restored." : `${WEAPONS[selectedWeapon].label} ammo collected.`);
      updateHud();
    }
  }

  function updateEffects(delta) {
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vx *= Math.max(0, 1 - delta * 2.5);
      particle.vy *= Math.max(0, 1 - delta * 2.5);
      particle.life -= delta;
      if (particle.life <= 0) release(particles, index, particlePool, (item) => { item.life = 0; });
    }
    for (let index = damageNumbers.length - 1; index >= 0; index -= 1) {
      const number = damageNumbers[index];
      number.y -= 27 * delta;
      number.life -= delta;
      if (number.life <= 0) release(damageNumbers, index, damageNumberPool, (item) => { item.life = 0; });
    }
    for (let index = bloodSplats.length - 1; index >= 0; index -= 1) {
      bloodSplats[index].life -= delta;
      if (bloodSplats[index].life <= 0) release(bloodSplats, index, bloodPool, (item) => { item.life = 0; });
    }
    for (let index = puddles.length - 1; index >= 0; index -= 1) {
      const puddle = puddles[index];
      puddle.life -= delta;
      puddle.damageTimer -= delta;
      if (puddle.damageTimer <= 0 && Math.hypot(player.x - puddle.x, player.y - puddle.y) < puddle.radius + player.radius) {
        damagePlayer(5);
        puddle.damageTimer = 0.8;
      }
      if (puddle.life <= 0) release(puddles, index, puddlePool, (item) => { item.life = 0; });
    }
    for (let index = explosions.length - 1; index >= 0; index -= 1) {
      explosions[index].life -= delta;
      if (explosions[index].life <= 0) explosions.splice(index, 1);
    }
    shakeRemaining = Math.max(0, shakeRemaining - delta);
    player.invulnerable = Math.max(0, player.invulnerable - delta);
    weaponNotice = Math.max(0, weaponNotice - delta);
  }

  function update(delta) {
    if (gameState !== "playing") return;
    fireCooldown = Math.max(0, fireCooldown - delta);
    if (reloadRemaining > 0) {
      reloadRemaining = Math.max(0, reloadRemaining - delta);
      if (reloadRemaining === 0) finishReload();
    }
    movePlayer(delta);
    updateZombies(delta);
    if (gameState !== "playing") return;
    updateBullets(delta);
    if (gameState !== "playing") return;
    collectPickups(delta);
    updateEffects(delta);
    if (gameState !== "playing") return;

    if (mouseFire || keyboardFire || (aimPointer !== null && Math.hypot(aimAxisX, aimAxisY) > 0.18)) fire();

    if (spawnRemaining > 0 || bossPending) {
      spawnTimer -= delta;
      const interval = Math.max(0.27, 1.12 * DIFFICULTIES[selectedDifficulty].spawn - Math.min(0.32, wave * 0.015));
      if (spawnTimer <= 0 && zombies.length < WORLD.maxZombies) {
        if (spawnRemaining > 0) {
          if (spawnZombie(chooseZombieType())) spawnRemaining -= 1;
        } else if (bossPending) {
          if (spawnZombie("boss", true)) {
            bossPending = false;
            announce(`${LEVELS[selectedLevel].boss} entered the arena.`);
          }
        }
        spawnTimer = interval;
      }
    } else if (zombies.length === 0) {
      waveDelay += delta;
      if (waveDelay >= 1.8) {
        waveDelay = 0;
        if (wave >= 10) {
          finishLevel();
          return;
        }
        wave += 1;
        beginWave();
      }
    }
    saveBest();
    updateHud();
  }

  function drawBackground() {
    const scene = levelBackgrounds[selectedLevel];
    if (scene) context.drawImage(scene, 0, 0);
    context.strokeStyle = `${LEVELS[selectedLevel].accent}55`;
    context.lineWidth = 3;
    context.strokeRect(2, 2, WORLD.width - 4, WORLD.height - 4);
  }

  function drawZombieLegacy(zombie, dying = false) {
    const now = performance.now();
    if (dying) {
      if (zombie.deathVisualHealth !== zombie.health) {
        zombie.deathVisualHealth = zombie.health;
        zombie.deathVisualStarted = now;
      }
    } else {
      zombie.deathVisualHealth = zombie.health;
      zombie.deathVisualStarted = 0;
    }

    const deathProgress = dying ? Math.min(1, (now - zombie.deathVisualStarted) / 620) : 0;
    if (dying && deathProgress >= 1) return;
    const phaseSpeed = Math.min(1.9, Math.max(0.65, zombie.speed / 42));
    const phase = zombie.wobble * phaseSpeed;
    const step = Math.sin(phase);
    const sway = Math.sin(phase * 0.5) * 0.08;
    const scale = zombie.radius * 1.35;
    const isBoss = zombie.boss;
    const type = isBoss ? "boss" : zombie.id;
    const skin = zombie.hitFlash > 0 && !dying ? "#fff0de" : ({
      walker: "#7f927f",
      runner: "#b4c399",
      tank: "#405a49",
      spitter: "#84bd61",
      boss: "#6d343f"
    }[type] || "#788d78");
    const outline = type === "boss" ? "#301c2c" : "#202a29";
    const clothes = ({
      walker: "#303b3b",
      runner: "#514b48",
      tank: "#283c35",
      spitter: "#40563c",
      boss: "#382b3a"
    }[type] || "#303b3b");
    const forwardX = player.x - zombie.x;
    const forwardY = player.y - zombie.y;
    const facing = Math.atan2(forwardY, forwardX);
    const bodyWidth = type === "runner" ? 0.72 : type === "boss" ? 1.2 : 1;
    const bodyLength = type === "runner" ? 1.08 : type === "boss" ? 1.18 : 1;
    const torsoX = type === "runner" ? 0.04 : -0.12;
    const headX = type === "runner" ? 0.88 : 0.72;
    const bob = dying ? deathProgress * 5 : Math.abs(step) * 0.65;
    const fall = dying ? deathProgress * 1.15 : 0;

    context.save();
    context.globalAlpha = dying ? 1 - deathProgress : 1;
    context.translate(zombie.x, zombie.y + bob);
    context.rotate(facing + sway + fall);
    context.scale(scale * bodyLength, scale * bodyWidth);

    context.fillStyle = "rgba(0,0,0,.34)";
    context.beginPath();
    context.ellipse(-0.15, 0.65, isBoss ? 1.9 : 1.3, type === "runner" ? 0.62 : 0.92, 0, 0, Math.PI * 2);
    context.fill();

    if (isBoss && !dying) {
      const aura = 1.7 + (Math.sin(phase * 0.55) + 1) * 0.16;
      context.strokeStyle = "rgba(255,76,108,.2)";
      context.lineWidth = 0.18;
      context.beginPath();
      context.arc(-0.05, 0, aura, 0, Math.PI * 2);
      context.stroke();
    }

    const raisedSpitArm = type === "spitter" && zombie.spitCooldown > 1.9;
    const armReach = type === "runner" ? 0.62 : type === "boss" ? 0.95 : 0.77;
    const armThickness = type === "boss" ? 0.34 : type === "tank" ? 0.29 : 0.2;
    const shoulderWidth = type === "boss" ? 0.67 : type === "tank" ? 0.53 : 0.4;

    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = outline;
    context.lineWidth = armThickness + 0.1;
    for (const side of [-1, 1]) {
      const pump = type === "runner" ? 0.37 : 0.14;
      const armSwing = Math.sin(phase + side * Math.PI) * pump;
      const startX = type === "runner" ? 0.15 : 0.05;
      const startY = side * shoulderWidth;
      const elbowX = 0.34 + armSwing;
      const elbowY = side * (shoulderWidth + (raisedSpitArm && side < 0 ? -0.15 : 0.12));
      const handX = armReach + armSwing * 0.65;
      const handY = side * (type === "runner" ? 0.34 : 0.1);
      context.beginPath();
      context.moveTo(startX, startY);
      context.quadraticCurveTo(elbowX, elbowY, handX, handY);
      context.stroke();
      context.strokeStyle = skin;
      context.lineWidth = armThickness;
      context.beginPath();
      context.moveTo(startX, startY);
      context.quadraticCurveTo(elbowX, elbowY, handX, handY);
      context.stroke();
      context.fillStyle = outline;
      context.beginPath();
      context.arc(handX, handY, type === "boss" ? 0.24 : 0.16, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = skin;
      context.beginPath();
      context.arc(handX, handY, type === "boss" ? 0.16 : 0.105, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = outline;
    }

    if (raisedSpitArm) {
      context.strokeStyle = "#c8ec75";
      context.lineWidth = 0.08;
      context.beginPath();
      context.moveTo(0.44, -0.88);
      context.lineTo(0.72, -0.83);
      context.stroke();
    }

    const legSwing = step * (type === "runner" ? 0.37 : 0.24);
    for (const side of [-1, 1]) {
      const hipY = side * (type === "boss" ? 0.36 : 0.27);
      const footX = -0.92 + legSwing * side;
      const footY = hipY + side * 0.08;
      context.strokeStyle = outline;
      context.lineWidth = type === "boss" ? 0.35 : 0.24;
      context.beginPath();
      context.moveTo(-0.45, hipY);
      context.lineTo(footX, footY);
      context.stroke();
      context.strokeStyle = clothes;
      context.lineWidth = type === "boss" ? 0.24 : 0.14;
      context.beginPath();
      context.moveTo(-0.45, hipY);
      context.lineTo(footX, footY);
      context.stroke();
      context.fillStyle = outline;
      context.beginPath();
      context.ellipse(footX - 0.08, footY, 0.24, 0.16, 0, 0, Math.PI * 2);
      context.fill();
    }

    context.fillStyle = outline;
    context.beginPath();
    context.ellipse(torsoX, 0, 0.76, type === "runner" ? 0.48 : type === "boss" ? 0.78 : 0.62, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = clothes;
    context.beginPath();
    context.ellipse(torsoX, 0, 0.68, type === "runner" ? 0.39 : type === "boss" ? 0.68 : 0.53, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = type === "boss" ? "#79606b" : type === "tank" ? "#647264" : "#59605a";
    context.beginPath();
    context.ellipse(torsoX + 0.16, -0.08, 0.32, type === "boss" ? 0.56 : 0.36, 0, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = type === "boss" ? "#463640" : type === "tank" ? "#35463b" : "#242e2d";
    context.beginPath();
    context.ellipse(torsoX - 0.15, -0.2, 0.24, 0.12, -0.35, 0, Math.PI * 2);
    context.ellipse(torsoX + 0.1, 0.24, 0.19, 0.1, 0.4, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#8b3e42";
    context.beginPath();
    context.arc(-0.34, 0.15, 0.1, 0, Math.PI * 2);
    context.arc(0.08, -0.28, 0.075, 0, Math.PI * 2);
    context.fill();

    if (type === "tank" || isBoss) {
      context.fillStyle = type === "boss" ? "#554451" : "#51634d";
      context.beginPath();
      context.ellipse(0.03, -0.48, type === "boss" ? 0.48 : 0.4, 0.3, 0, 0, Math.PI * 2);
      context.ellipse(0.03, 0.48, type === "boss" ? 0.48 : 0.4, 0.3, 0, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = type === "boss" ? "#a99aa1" : "#8d9b7c";
      context.lineWidth = 0.055;
      context.beginPath();
      context.moveTo(-0.48, -0.23); context.lineTo(-0.1, -0.04); context.lineTo(-0.3, 0.18);
      context.moveTo(0.3, -0.15); context.lineTo(0.12, 0.03); context.lineTo(0.45, 0.25);
      context.stroke();
    }

    if (type === "runner") {
      context.fillStyle = "#85796a";
      context.beginPath();
      context.moveTo(-0.1, -0.38); context.lineTo(-0.52, -0.3); context.lineTo(-0.28, -0.2); context.fill();
    }

    context.fillStyle = outline;
    context.beginPath();
    context.arc(headX, 0, type === "boss" ? 0.45 : type === "tank" ? 0.38 : 0.34, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = skin;
    context.beginPath();
    context.arc(headX + 0.01, 0, type === "boss" ? 0.37 : type === "tank" ? 0.31 : 0.28, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = type === "runner" ? "#9caa85" : type === "spitter" ? "#b3d77a" : "#a8ad89";
    context.beginPath();
    context.ellipse(headX + 0.1, -0.1, 0.15, 0.08, -0.2, 0, Math.PI * 2);
    context.fill();

    const eyeColor = isBoss ? "#ff334f" : type === "spitter" ? "#d9ff77" : "#e4e6cc";
    context.fillStyle = eyeColor;
    if (isBoss) {
      context.strokeStyle = "rgba(255,55,76,.7)";
      context.lineWidth = 0.12;
    }
    for (const side of [-1, 1]) {
      context.beginPath();
      context.ellipse(headX + 0.06, side * 0.13, isBoss ? 0.09 : 0.065, 0.052, 0, 0, Math.PI * 2);
      context.fill();
      if (isBoss) context.stroke();
    }
    context.fillStyle = type === "spitter" ? "#d4ff70" : "#3c1f24";
    context.beginPath();
    context.ellipse(headX + 0.31, 0.02, type === "spitter" ? 0.15 : 0.1, type === "spitter" ? 0.12 : 0.055, 0, 0, Math.PI * 2);
    context.fill();
    if (type === "spitter") {
      context.fillStyle = "#dcff80";
      context.beginPath();
      context.arc(headX + 0.31, 0.02, 0.075, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();

    if (dying) return;
    const barWidth = zombie.radius * 2.2;
    const barY = zombie.y - zombie.radius - 8;
    context.fillStyle = "rgba(0,0,0,.55)";
    context.fillRect(zombie.x - barWidth / 2, barY, barWidth, 3);
    context.fillStyle = isBoss ? "#ff5f83" : "#8ce18e";
    context.fillRect(zombie.x - barWidth / 2, barY, barWidth * Math.max(0, zombie.health / zombie.maxHealth), 3);
    if (isBoss) {
      context.fillStyle = "#ffb5c3";
      context.font = "700 10px Segoe UI, sans-serif";
      context.textAlign = "center";
      context.fillText("BOSS", zombie.x, barY - 5);
    }
  }

  function paintZombieSprite(type, frame, colorOverride, bossVariant = 0) {
    const sprite = document.createElement("canvas");
    sprite.width = 88;
    sprite.height = 88;
    const art = sprite.getContext("2d");
    const colors = {
      walker: ["#92b884", "#46554a"], runner: ["#d0bd68", "#5b4840"],
      tank: ["#70896e", "#344239"], spitter: ["#86c778", "#405b43"],
      crawler: ["#b2c47c", "#564b3a"], exploder: ["#c59e59", "#574a36"],
      screamer: ["#ca8eb3", "#554052"], armored: ["#abb9bf", "#49545b"],
      toxic: ["#93d36d", "#405a36"], ghoul: ["#bbd6bf", "#435348"],
      boss: [colorOverride || "#d34f68", "#3b252e"]
    };
    const [skin, clothes] = colors[type] || colors.walker;
    const outline = "#171b1b";
    const armShift = frame ? 5 : -5;
    art.lineCap = "round";
    art.lineJoin = "round";
    art.fillStyle = "rgba(0,0,0,.32)";
    art.beginPath(); art.ellipse(40, 48, 30, 24, 0, 0, Math.PI * 2); art.fill();

    for (const side of [-1, 1]) {
      const shoulderY = 43 + side * 13;
      const elbowY = 42 + side * (18 + armShift * side);
      const handY = 40 + side * (15 + armShift * side);
      art.strokeStyle = outline; art.lineWidth = type === "boss" || type === "tank" ? 11 : 9;
      art.beginPath(); art.moveTo(38, shoulderY); art.quadraticCurveTo(53 + armShift, elbowY, 70, handY); art.stroke();
      art.strokeStyle = skin; art.lineWidth = type === "boss" || type === "tank" ? 7 : 6;
      art.beginPath(); art.moveTo(38, shoulderY); art.quadraticCurveTo(53 + armShift, elbowY, 70, handY); art.stroke();
      art.fillStyle = outline; art.beginPath(); art.arc(72, handY, 6, 0, Math.PI * 2); art.fill();
      art.fillStyle = skin; art.beginPath(); art.arc(72, handY, 4, 0, Math.PI * 2); art.fill();
    }

    art.fillStyle = outline; art.beginPath(); art.ellipse(39, 43, type === "tank" || type === "boss" ? 25 : 21, type === "crawler" ? 11 : 16, -0.08, 0, Math.PI * 2); art.fill();
    art.fillStyle = clothes; art.beginPath(); art.ellipse(39, 43, type === "tank" || type === "boss" ? 21 : 18, type === "crawler" ? 8 : 13, -0.08, 0, Math.PI * 2); art.fill();
    art.fillStyle = skin; art.beginPath(); art.ellipse(54, 38, type === "boss" ? 12 : 10, type === "tank" ? 11 : 9, 0, 0, Math.PI * 2); art.fill();
    art.strokeStyle = outline; art.lineWidth = 3; art.beginPath(); art.ellipse(54, 38, type === "boss" ? 12 : 10, type === "tank" ? 11 : 9, 0, 0, Math.PI * 2); art.stroke();
    art.fillStyle = skin; art.beginPath(); art.ellipse(61, 40, 7, 5, 0, 0, Math.PI * 2); art.fill();
    art.fillStyle = type === "toxic" || type === "spitter" ? "#d9ff76" : type === "boss" ? "#ff385c" : "#f4e7c7";
    art.beginPath(); art.arc(57, 35, 2.2, 0, Math.PI * 2); art.arc(57, 41, 2.2, 0, Math.PI * 2); art.fill();
    art.fillStyle = "#25191c"; art.beginPath(); art.ellipse(65, 40, 3.2, 2.3, 0, 0, Math.PI * 2); art.fill();

    art.fillStyle = outline;
    art.beginPath();
    art.moveTo(23, 34); art.lineTo(31, 31); art.lineTo(34, 36); art.lineTo(42, 32);
    art.lineTo(47, 36); art.lineTo(44, 49); art.lineTo(37, 54); art.lineTo(29, 49);
    art.lineTo(25, 53); art.lineTo(21, 48); art.closePath(); art.fill();
    art.fillStyle = type === "armored" ? "#8b9aa2" : clothes;
    art.beginPath();
    art.moveTo(24, 35); art.lineTo(31, 33); art.lineTo(35, 37); art.lineTo(42, 34);
    art.lineTo(45, 37); art.lineTo(42, 48); art.lineTo(37, 51); art.lineTo(30, 47);
    art.lineTo(25, 50); art.lineTo(23, 47); art.closePath(); art.fill();
    art.fillStyle = "#a74d48";
    art.beginPath(); art.moveTo(32, 46); art.lineTo(36, 44); art.lineTo(34, 51); art.fill();
    art.beginPath(); art.moveTo(43, 37); art.lineTo(48, 36); art.lineTo(45, 42); art.fill();

    if (type === "armored") {
      art.fillStyle = "#65717a"; art.strokeStyle = outline; art.lineWidth = 2;
      art.beginPath(); art.arc(54, 34, 11, Math.PI, Math.PI * 2); art.lineTo(65, 37); art.lineTo(46, 37); art.closePath(); art.fill(); art.stroke();
    }
    if (type === "toxic" || type === "spitter") {
      art.fillStyle = "rgba(174,255,86,.75)"; art.beginPath(); art.arc(33, 39, 3, 0, Math.PI * 2); art.arc(39, 47, 2.5, 0, Math.PI * 2); art.fill();
    }
    if (type === "exploder") {
      art.fillStyle = "#d1a256"; art.strokeStyle = outline; art.lineWidth = 3;
      art.beginPath(); art.ellipse(37, 42, 21, 18, 0, 0, Math.PI * 2); art.fill(); art.stroke();
      art.fillStyle = "#7a5939"; art.beginPath(); art.arc(31, 39, 2.5, 0, Math.PI * 2); art.arc(41, 46, 3, 0, Math.PI * 2); art.fill();
    }
    if (type === "screamer") {
      art.fillStyle = "#271b25"; art.beginPath(); art.ellipse(66, 41, 4, 6, 0, 0, Math.PI * 2); art.fill();
      art.strokeStyle = "#f3a5d1"; art.lineWidth = 2; art.beginPath(); art.arc(54, 36, 14, Math.PI, Math.PI * 1.8); art.stroke();
    }
    if (type === "boss") {
      const hornColor = bossVariant === 2 ? "#b9f1ff" : bossVariant === 4 ? "#ffb5c3" : "#f4cf90";
      art.strokeStyle = hornColor; art.lineWidth = 4;
      art.beginPath();
      if (bossVariant === 0) {
        art.moveTo(28, 37); art.lineTo(15, 24); art.lineTo(17, 18);
        art.strokeStyle = "#b7b9a7"; art.lineWidth = 4; art.stroke();
        art.fillStyle = "#b7b9a7"; art.fillRect(11, 14, 14, 4);
      } else if (bossVariant === 1) {
        art.moveTo(49, 30); art.lineTo(47, 19); art.lineTo(54, 24); art.lineTo(62, 17); art.lineTo(60, 30); art.stroke();
        art.fillStyle = "#e8ead9"; art.fillRect(59, 36, 11, 8);
        art.fillStyle = "#c94958"; art.fillRect(63, 37, 3, 6); art.fillRect(61, 39, 7, 2);
      } else if (bossVariant === 2) {
        for (const x of [25, 38, 49]) {
          art.beginPath(); art.moveTo(x, 31); art.lineTo(x + 5, 15); art.lineTo(x + 10, 32); art.closePath(); art.fillStyle = "#b9f1ff"; art.fill();
        }
      } else if (bossVariant === 3) {
        art.beginPath(); art.moveTo(48, 30); art.lineTo(42, 16); art.lineTo(53, 24); art.lineTo(64, 13); art.lineTo(61, 31); art.stroke();
        art.fillStyle = "#f3ded0"; art.beginPath(); art.moveTo(59, 42); art.lineTo(65, 40); art.lineTo(62, 49); art.closePath(); art.fill();
      } else {
        art.beginPath(); art.moveTo(47, 31); art.lineTo(43, 13); art.lineTo(54, 23); art.lineTo(65, 10); art.lineTo(61, 31); art.stroke();
        art.strokeStyle = "rgba(255,60,91,.8)"; art.lineWidth = 2;
        art.beginPath(); art.arc(43, 43, 33, -0.75, 0.75); art.stroke();
      }
    }
    return sprite;
  }

  function buildZombieSprites() {
    for (const type of Object.keys(ZOMBIE_TYPES)) {
      zombieSprites[type] = [paintZombieSprite(type, 0), paintZombieSprite(type, 1)];
    }
    LEVELS.forEach((theme, index) => {
      zombieSprites[`boss-${index}`] = [
        paintZombieSprite("boss", 0, theme.accent, index),
        paintZombieSprite("boss", 1, theme.accent, index)
      ];
    });
  }

  function drawZombie(zombie, dying = false) {
    const now = performance.now();
    if (dying) {
      if (zombie.deathVisualHealth !== zombie.health) {
        zombie.deathVisualHealth = zombie.health;
        zombie.deathVisualStarted = now;
      }
    } else {
      zombie.deathVisualHealth = zombie.health;
      zombie.deathVisualStarted = 0;
    }
    const deathProgress = dying ? Math.min(1, (now - zombie.deathVisualStarted) / 620) : 0;
    if (dying && deathProgress >= 1) return;
    const type = dying ? (zombie.corpseBoss ? `boss-${selectedLevel}` : zombie.corpseType) : (zombie.boss ? `boss-${selectedLevel}` : zombie.id);
    const frames = zombieSprites[type] || zombieSprites.walker;
    const frame = dying || reducedMotion.matches ? 0 : Math.floor(zombie.wobble * 1.15) % 2;
    const facing = Math.atan2(player.y - zombie.y, player.x - zombie.x);
    const size = zombie.radius * (zombie.id === "crawler" || zombie.corpseType === "crawler" ? 2.25 : 2.5);
    context.save();
    context.globalAlpha = zombie.hitFlash > 0 && !dying ? 0.65 : dying ? 1 - deathProgress : 1;
    context.translate(zombie.x, zombie.y + (dying ? deathProgress * 8 : Math.abs(Math.sin(zombie.wobble * 2)) * 1.2));
    context.rotate(facing + (dying ? deathProgress * 1.1 : reducedMotion.matches ? 0 : Math.sin(zombie.wobble) * 0.035));
    context.drawImage(frames[frame], -size / 2, -size / 2, size, size);
    if (!dying && zombie.id === "armored" && zombie.armor <= 0) {
      context.strokeStyle = "#dce9ea";
      context.lineWidth = Math.max(1, size * 0.035);
      context.beginPath();
      context.moveTo(size * 0.15, -size * 0.27);
      context.lineTo(size * 0.27, -size * 0.08);
      context.lineTo(size * 0.19, size * 0.03);
      context.moveTo(size * 0.27, -size * 0.08);
      context.lineTo(size * 0.4, -size * 0.17);
      context.stroke();
    }
    if (zombie.hitFlash > 0 && !dying) {
      context.globalAlpha = Math.min(0.55, zombie.hitFlash * 6);
      context.fillStyle = "#fff4df";
      context.beginPath(); context.ellipse(0, 0, size * 0.34, size * 0.24, 0, 0, Math.PI * 2); context.fill();
    }
    context.restore();
    if (dying) return;
    if (zombie.buffTime > 0) {
      context.strokeStyle = "rgba(255,215,119,.7)";
      context.lineWidth = 2;
      context.beginPath(); context.arc(zombie.x, zombie.y, zombie.radius + 5, 0, Math.PI * 2); context.stroke();
    }
    const barWidth = zombie.radius * 2.2;
    const barY = zombie.y - zombie.radius - 8;
    context.fillStyle = "rgba(0,0,0,.55)";
    context.fillRect(zombie.x - barWidth / 2, barY, barWidth, 3);
    context.fillStyle = zombie.boss ? "#ff5f83" : "#8ce18e";
    context.fillRect(zombie.x - barWidth / 2, barY, barWidth * Math.max(0, zombie.health / zombie.maxHealth), 3);
    if (zombie.armor > 0) {
      context.fillStyle = "#c5e1f4";
      context.fillRect(zombie.x - barWidth / 2, barY - 3, barWidth * zombie.armor / 48, 2);
    }
    if (zombie.boss) {
      context.fillStyle = "#ffb5c3";
      context.font = "700 10px Segoe UI, sans-serif";
      context.textAlign = "center";
      context.fillText(zombie.bossName.toUpperCase(), zombie.x, barY - 5);
    }
  }

  function drawPlayer() {
    if (player.invulnerable > 0 && Math.floor(player.invulnerable * 16) % 2 === 0) return;
    context.save();
    context.translate(player.x, player.y);
    context.rotate(Math.atan2(player.aimY, player.aimX));
    context.fillStyle = "rgba(0,0,0,.35)";
    context.beginPath(); context.ellipse(0, 9, 15, 9, 0, 0, Math.PI * 2); context.fill();
    context.fillStyle = "#c8c0f7";
    context.beginPath(); context.arc(0, 0, player.radius, 0, Math.PI * 2); context.fill();
    context.fillStyle = "#6559a9";
    context.beginPath(); context.arc(-2, -2, 8, 0, Math.PI * 2); context.fill();
    context.fillStyle = "#72f6eb";
    context.fillRect(2, -4, selectedWeapon === "shotgun" ? 19 : 17, 8);
    context.fillStyle = "#eaffff";
    context.fillRect(15, -2, 9, 4);
    context.restore();
  }

  function render() {
    if (!context || !canvas.width || !canvas.height) return;
    context.setTransform(canvas.width / WORLD.width, 0, 0, canvas.height / WORLD.height, 0, 0);
    drawBackground();
    context.save();
    if (shakeRemaining > 0 && !reducedMotion.matches) {
      const intensity = Math.min(8, shakeRemaining * 38);
      context.translate((Math.random() - 0.5) * intensity, (Math.random() - 0.5) * intensity);
    }
    for (const splat of bloodSplats) {
      context.globalAlpha = Math.max(0, splat.life / splat.maxLife) * 0.72;
      context.fillStyle = splat.color;
      context.beginPath();
      context.ellipse(splat.x, splat.y, splat.radius, splat.radius * 0.62, splat.radius * 0.04, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha *= 0.85;
      for (let drop = 0; drop < 3; drop += 1) {
        context.beginPath();
        context.arc(splat.x + (drop - 1) * splat.radius * 0.7, splat.y + (drop % 2 ? 1 : -1) * splat.radius * 0.52, splat.radius * 0.18, 0, Math.PI * 2);
        context.fill();
      }
    }
    context.globalAlpha = 1;
    for (const puddle of puddles) {
      context.globalAlpha = Math.min(0.5, puddle.life / 8);
      context.fillStyle = "#9df05b";
      context.beginPath(); context.ellipse(puddle.x, puddle.y, puddle.radius, puddle.radius * 0.58, 0, 0, Math.PI * 2); context.fill();
      context.globalAlpha = Math.min(0.8, puddle.life / 8);
      context.strokeStyle = "#c8ff6d"; context.lineWidth = 2;
      context.beginPath(); context.ellipse(puddle.x, puddle.y, puddle.radius * 0.72, puddle.radius * 0.38, 0, 0, Math.PI * 2); context.stroke();
    }
    context.globalAlpha = 1;
    for (const pickup of pickups) {
      const pulse = 1 + Math.sin(pickup.pulse) * 0.12;
      context.save();
      context.translate(pickup.x, pickup.y);
      context.scale(pulse, pulse);
      context.fillStyle = pickup.kind === "health" ? "rgba(103,230,149,.17)" : "rgba(98,229,238,.17)";
      context.beginPath(); context.arc(0, 0, 14, 0, Math.PI * 2); context.fill();
      context.strokeStyle = pickup.kind === "health" ? "#80eea8" : "#77f5eb";
      context.lineWidth = 2;
      context.beginPath(); context.arc(0, 0, 9, 0, Math.PI * 2); context.stroke();
      context.fillStyle = "#f4f6ff";
      context.font = "700 12px Segoe UI, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(pickup.kind === "health" ? "+" : "•", 0, 0);
      context.restore();
    }
    for (const zombie of zombies) drawZombie(zombie);
    const corpseLimit = Math.min(zombiePool.length, 12);
    for (let index = zombiePool.length - corpseLimit; index < zombiePool.length; index += 1) {
      const corpse = zombiePool[index];
      if (corpse.id === "" && corpse.health <= 0) drawZombie(corpse, true);
    }
    for (const bullet of bullets) {
      context.fillStyle = bullet.color;
      context.shadowColor = bullet.color;
      context.shadowBlur = 9;
      context.beginPath(); context.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2); context.fill();
      context.shadowBlur = 0;
    }
    for (const explosion of explosions) {
      context.globalAlpha = Math.max(0, explosion.life / 0.32);
      context.fillStyle = "rgba(255,131,69,.28)";
      context.beginPath(); context.arc(explosion.x, explosion.y, explosion.radius * (1 - explosion.life / 0.32), 0, Math.PI * 2); context.fill();
      context.strokeStyle = "#ffb477"; context.lineWidth = 4;
      context.beginPath(); context.arc(explosion.x, explosion.y, explosion.radius * (1 - explosion.life / 0.32), 0, Math.PI * 2); context.stroke();
    }
    context.globalAlpha = 1;
    for (const bullet of enemyBullets) {
      context.fillStyle = bullet.color;
      context.shadowColor = bullet.color;
      context.shadowBlur = 8;
      context.beginPath(); context.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2); context.fill();
      context.shadowBlur = 0;
    }
    drawPlayer();
    for (const particle of particles) {
      context.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      context.fillStyle = particle.color;
      context.beginPath(); context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); context.fill();
    }
    context.globalAlpha = 1;
    if (weaponNotice > 0) {
      context.globalAlpha = Math.min(1, weaponNotice);
      context.fillStyle = "rgba(9,14,24,.82)";
      context.fillRect(WORLD.width / 2 - 115, 24, 230, 34);
      context.fillStyle = "#a9f6eb";
      context.font = "700 15px Segoe UI, sans-serif";
      context.textAlign = "center";
      context.fillText(`${weaponNoticeLabel} unlocked!`, WORLD.width / 2, 46);
      context.globalAlpha = 1;
    }
    for (const number of damageNumbers) {
      context.globalAlpha = Math.min(1, number.life / 0.3);
      context.fillStyle = number.color;
      context.font = "700 13px Segoe UI, sans-serif";
      context.textAlign = "center";
      context.fillText(number.text, number.x, number.y);
    }
    context.globalAlpha = 1;
    if (gameState === "playing" && waveDelay > 0.15 && spawnRemaining === 0 && !bossPending && zombies.length === 0) {
      context.fillStyle = "rgba(237,241,255,.82)";
      context.font = "700 21px Segoe UI, sans-serif";
      context.textAlign = "center";
      context.fillText("AREA CLEAR", WORLD.width / 2, WORLD.height / 2);
    }
    context.restore();
  }

  function frame(timestamp) {
    frameHandle = 0;
    if (gameState !== "playing") return;
    const delta = previousFrameTime ? Math.min(0.05, Math.max(0, (timestamp - previousFrameTime) / 1000)) : 0;
    previousFrameTime = timestamp;
    update(delta);
    render();
    if (gameState === "playing") frameHandle = window.requestAnimationFrame(frame);
  }

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width * WORLD.width,
      y: (event.clientY - rect.top) / rect.height * WORLD.height
    };
  }

  function resetStick(stick) {
    const knob = stick.querySelector(".joystick-knob");
    if (knob) knob.style.transform = "translate(0, 0)";
    if (stick === moveStick) {
      moveAxisX = 0; moveAxisY = 0; movePointer = null;
    } else {
      aimAxisX = 0; aimAxisY = 0; aimPointer = null;
    }
  }

  function updateStick(stick, event) {
    const rect = stick.getBoundingClientRect();
    const radius = Math.max(1, rect.width * 0.34);
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(dx, dy);
    const scale = distance > radius ? radius / distance : 1;
    const x = dx * scale / radius;
    const y = dy * scale / radius;
    const knob = stick.querySelector(".joystick-knob");
    if (knob) knob.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
    if (stick === moveStick) {
      moveAxisX = x; moveAxisY = y;
      movePointer = event.pointerId;
    } else {
      aimAxisX = x; aimAxisY = y;
      aimPointer = event.pointerId;
    }
  }

  function bindStick(stick) {
    listen(stick, "pointerdown", (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      event.preventDefault();
      stick.setPointerCapture(event.pointerId);
      updateStick(stick, event);
    });
    listen(stick, "pointermove", (event) => {
      if (stick === moveStick && event.pointerId === movePointer || stick === aimStick && event.pointerId === aimPointer) {
        event.preventDefault();
        updateStick(stick, event);
      }
    });
    const end = (event) => {
      if (stick === moveStick && event.pointerId === movePointer || stick === aimStick && event.pointerId === aimPointer) resetStick(stick);
    };
    listen(stick, "pointerup", end);
    listen(stick, "pointercancel", end);
    listen(stick, "lostpointercapture", end);
  }

  function bindEvents() {
    bindStick(moveStick);
    bindStick(aimStick);
    listen(window, "pointerdown", unlockAudio);
    listen(window, "click", unlockAudio);
    listen(canvas, "pointermove", (event) => {
      if (event.pointerType === "touch") return;
      const position = pointerPosition(event);
      mouseX = position.x;
      mouseY = position.y;
    });
    listen(canvas, "pointerdown", (event) => {
      if (event.pointerType === "touch" || event.button !== 0) return;
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      mouseFire = true;
      const position = pointerPosition(event);
      mouseX = position.x;
      mouseY = position.y;
      const aimLength = Math.hypot(mouseX - player.x, mouseY - player.y);
      if (aimLength > 1) {
        player.aimX = (mouseX - player.x) / aimLength;
        player.aimY = (mouseY - player.y) / aimLength;
      }
      fire();
    });
    listen(canvas, "pointerup", (event) => { if (event.pointerType !== "touch") mouseFire = false; });
    listen(canvas, "pointercancel", () => { mouseFire = false; });
    listen(window, "pointerup", () => { mouseFire = false; });

    listen(window, "keydown", (event) => {
      const key = event.key.toLowerCase();
      const focusedControl = event.target instanceof Element && event.target.closest("button, a, input, select, textarea");
      if (key === " " && focusedControl) return;
      if (gameState === "playing" && ["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) event.preventDefault();
      if (event.repeat && ["r", "p", "escape", "1", "2", "3", "4", "5", "6"].includes(key)) return;
      if (key === "p" || key === "escape") {
        togglePause();
        return;
      }
      if (key === "r") { reload(); return; }
      if (key === "1") { selectWeapon("pistol"); return; }
      if (key === "2") { selectWeapon("shotgun"); return; }
      if (key === "3") { selectWeapon("rifle"); return; }
      if (key === "4") { selectWeapon("smg"); return; }
      if (key === "5") { selectWeapon("sniper"); return; }
      if (key === "6") { selectWeapon("grenade"); return; }
      if (key === " " && gameState === "playing") {
        keyboardFire = true;
        fire();
      }
      keys.add(key);
    });
    listen(window, "keyup", (event) => {
      const key = event.key.toLowerCase();
      keys.delete(key);
      if (key === " ") keyboardFire = false;
    });
    listen(window, "blur", () => {
      keys.clear();
      keyboardFire = false;
      mouseFire = false;
      if (gameState === "playing") pauseGame();
    });
    listen(document, "visibilitychange", () => {
      if (document.hidden && gameState === "playing") pauseGame();
    });

    listen(overlay, "click", (event) => {
      const difficultyButton = event.target.closest("[data-difficulty]");
      if (difficultyButton && difficultyPicker.contains(difficultyButton)) {
        selectedDifficulty = difficultyButton.dataset.difficulty;
        difficultyButtons.forEach((button) => {
          const selected = button.dataset.difficulty === selectedDifficulty;
          button.classList.toggle("is-selected", selected);
          button.setAttribute("aria-pressed", String(selected));
        });
        loadBest();
        updateHud();
        return;
      }
      const levelButton = event.target.closest("[data-level]");
      if (levelButton && levelPicker.contains(levelButton) && !levelButton.disabled) {
        selectedLevel = Number(levelButton.dataset.level);
        loadBest();
        if (gameState === "levelcomplete") showOverlay("ready");
        return;
      }
      const upgradeButtonElement = event.target.closest("[data-upgrade]");
      if (upgradeButtonElement && gameState === "upgrade") {
        applyUpgrade(upgradeButtonElement.dataset.upgrade);
        return;
      }
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (action === "start" || action === "restart") startGame();
      else if (action === "resume") resumeGame();
      else if (action === "next-level") {
        selectedLevel = Math.min(LEVELS.length - 1, selectedLevel + 1);
        loadBest();
        startGame();
      } else if (action === "level-select") {
        showOverlay("ready");
      }
    });
    listen(changeDifficulty, "click", () => {
      const showing = !difficultyPicker.hidden;
      difficultyPicker.hidden = showing;
      changeDifficulty.textContent = showing ? "Change difficulty" : "Keep this difficulty";
    });
    listen(pauseButton, "click", togglePause);
    listen(touchPause, "click", togglePause);
    listen(restartButton, "click", startGame);
    listen(reloadButton, "click", reload);
    listen(touchReload, "click", reload);
    listen(soundToggle, "click", () => {
      const enabled = window.LABZ?.isSoundOn?.() ?? true;
      window.LABZ?.setSoundOn?.(!enabled);
      syncSoundButton();
    });
    listen(window, "labz:soundchange", syncSoundButton);
    weaponButtons.forEach((button) => listen(button, "click", () => selectWeapon(button.dataset.weapon)));
    listen(window, "resize", resizeCanvas);
    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(resizeCanvas);
      resizeObserver.observe(canvas);
    }
    listen(window, "pagehide", () => {
      stopLoop();
      cleanups.forEach((cleanup) => cleanup());
      if (resizeObserver) resizeObserver.disconnect();
    }, { once: true });
  }

  bindEvents();
  buildLevels();
  buildZombieSprites();
  setLevelScene();
  loadBest();
  syncSoundButton();
  updateWeaponButtons();
  updateHud();
  showOverlay("ready");
  resizeCanvas();
})();
