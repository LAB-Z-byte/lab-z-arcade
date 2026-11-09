(() => {
  "use strict";

  const CONFIG = {
    world: { width: 960, height: 640, maxPixelRatio: 2, maxFrameSeconds: 0.05, starCount: 100 },
    player: {
      width: 38, height: 42, speed: 420, startY: 0.87, lowerBound: 0.66, hitRadius: 16,
      fireCooldown: 0.22, rapidFireCooldown: 0.095, bulletSpeed: 650, tripleSpread: 0.19,
      invincibilitySeconds: 1.55, extraLifeLimit: 5, maxPowerUpIndicatorSeconds: 15
    },
    enemies: {
      baseColumns: 6, maxColumns: 10, baseRows: 2, maxRows: 4, slotWidth: 76, slotHeight: 55,
      topOffset: 68, formationSpeed: 34, waveSpeedIncrease: 3.2, maxSpeed: 150,
      descendDistance: 24, diveChance: 0.11, diveDelayMin: 1.8, diveDelayMax: 4.3,
      diveSpeed: 185, fireDelayMin: 1.7, fireDelayMax: 4.5, fireRateIncrease: 0.045,
      minFireDelay: 0.48, bulletSpeed: 250, collisionRadius: 18, score: 100,
      powerUpChance: 0.12, breachY: 575
    },
    boss: {
      everyWaves: 5, width: 150, height: 74, baseHealth: 28, healthPerWave: 4,
      speed: 115, bulletSpeed: 275, attackDelay: 1.05, spreadAngle: 0.25,
      collisionRadius: 34, score: 1500
    },
    powerUps: {
      fallSpeed: 105, size: 15, rapidDurationSeconds: 8,
      tripleDurationSeconds: 8, shieldDurationSeconds: 10, dropCap: 8
    },
    effects: { particleCap: 220, reducedParticleCap: 54, explosionParticles: 16, bossParticles: 38, shakeSeconds: 0.14, shakeAmount: 5 },
    bullets: { playerCap: 80, enemyCap: 120, playerWidth: 5, playerHeight: 15, enemyRadius: 5 },
    difficulties: {
      easy: { label: "Easy", enemySpeed: 0.78, fireRate: 0.7, lives: 4 },
      medium: { label: "Medium", enemySpeed: 1, fireRate: 1, lives: 3 },
      hard: { label: "Hard", enemySpeed: 1.28, fireRate: 1.35, lives: 2 }
    },
    initialDifficulty: "medium",
    storagePrefix: "labz-space-blaster-v1"
  };

  const canvas = document.querySelector("#game-canvas");
  const context = canvas?.getContext("2d");
  const container = document.querySelector("#game-container");
  const overlay = document.querySelector("#game-overlay");
  const overlayIcon = document.querySelector("#overlay-icon");
  const overlayEyebrow = document.querySelector("#overlay-eyebrow");
  const overlayTitle = document.querySelector("#overlay-title");
  const overlayMessage = document.querySelector("#overlay-message");
  const overlayAction = document.querySelector("#overlay-action");
  const difficultyPicker = document.querySelector("#difficulty-picker");
  const difficultyButtons = [...document.querySelectorAll(".difficulty-button")];
  const changeDifficultyButton = document.querySelector("#change-difficulty");
  const pauseButton = document.querySelector("#pause-button");
  const restartButton = document.querySelector("#restart-button");
  const scoreElement = document.querySelector("#score");
  const highScoreElement = document.querySelector("#high-score");
  const difficultyNameElement = document.querySelector("#score-difficulty");
  const waveElement = document.querySelector("#wave");
  const livesElement = document.querySelector("#lives");
  const powerUpIndicators = document.querySelector("#powerup-indicators");
  const statusElement = document.querySelector("#game-status");
  const joystick = document.querySelector("#joystick");
  const joystickKnob = document.querySelector("#joystick-knob");
  const fireButton = document.querySelector("#fire-button");
  const autoFireButton = document.querySelector("#auto-fire-button");
  const touchPauseButton = document.querySelector("#touch-pause-button");

  if (!canvas || !context || !container || !overlay || !overlayIcon || !overlayEyebrow || !overlayTitle || !overlayMessage || !overlayAction || !difficultyPicker || difficultyButtons.length !== Object.keys(CONFIG.difficulties).length || !changeDifficultyButton || !pauseButton || !restartButton || !scoreElement || !highScoreElement || !difficultyNameElement || !waveElement || !livesElement || !powerUpIndicators || !statusElement || !joystick || !joystickKnob || !fireButton || !autoFireButton || !touchPauseButton) {
    console.error("Space Blaster could not initialize: required game elements or Canvas 2D support are unavailable.");
    if (overlayTitle) overlayTitle.textContent = "Game unavailable";
    if (overlayMessage) overlayMessage.textContent = "This browser could not start the Canvas game. Try a current browser with Canvas 2D support.";
    if (overlayAction) overlayAction.disabled = true;
    return;
  }

  const W = CONFIG.world.width;
  const H = CONFIG.world.height;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const keys = new Set();
  const stars = Array.from({ length: CONFIG.world.starCount }, (_, index) => ({
    x: (index * 197.37) % W,
    y: (index * 83.19) % H,
    size: 0.65 + ((index * 13) % 12) / 10,
    speed: 12 + ((index * 29) % 52),
    alpha: 0.25 + ((index * 17) % 70) / 100
  }));
  const playerBullets = [];
  const playerBulletPool = [];
  const enemyBullets = [];
  const enemyBulletPool = [];
  const particles = [];
  const particlePool = [];
  let enemies = [];
  let powerUps = [];
  let player = null;
  let boss = null;
  let selectedDifficulty = CONFIG.initialDifficulty;
  let highScore = 0;
  let score = 0;
  let wave = 1;
  let wavePattern = 1;
  let lives = CONFIG.difficulties[CONFIG.initialDifficulty].lives;
  let state = "ready";
  let frameId = 0;
  let lastFrameTime = 0;
  let simulationTime = 0;
  let formationOffsetX = 0;
  let formationDirection = 1;
  let formationDropY = 0;
  let wavePause = 0;
  let shakeTimer = 0;
  let fireTimer = 0;
  let fireHeld = false;
  let autoFire = true;
  let joystickPointer = null;
  let joystickX = 0;
  let joystickY = 0;
  let deviceScale = 1;
  let lastStoredRun = null;
  let renderedPowerUpMarkup = "";
  let disposed = false;
  const cleanups = [];
  let resizeObserver = null;

  function listen(target, eventName, handler, options) {
    target.addEventListener(eventName, handler, options);
    cleanups.push(() => target.removeEventListener(eventName, handler, options));
  }

  function storageKey(difficulty) {
    return `${CONFIG.storagePrefix}-${difficulty}`;
  }

  function readSaved(difficulty) {
    try {
      const raw = window.localStorage.getItem(storageKey(difficulty));
      if (!raw) return { highScore: 0, run: null };
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== "object" || Array.isArray(saved)) return { highScore: 0, run: null };
      const best = Number.isSafeInteger(saved.highScore) && saved.highScore >= 0 ? saved.highScore : 0;
      const run = saved.run && typeof saved.run === "object" &&
        Number.isSafeInteger(saved.run.score) && saved.run.score >= 0 &&
        Number.isSafeInteger(saved.run.wave) && saved.run.wave > 0 &&
        Number.isSafeInteger(saved.run.lives) && saved.run.lives > 0 &&
        saved.run.lives <= CONFIG.player.extraLifeLimit
        ? { score: saved.run.score, wave: saved.run.wave, lives: saved.run.lives }
        : null;
      return { highScore: best, run };
    } catch (error) {
      console.warn("Space Blaster could not read saved progress; starting with a fresh run.", error);
      return { highScore: 0, run: null };
    }
  }

  function persist(run = null) {
    try {
      window.localStorage.setItem(storageKey(selectedDifficulty), JSON.stringify({ highScore, run }));
      lastStoredRun = run;
    } catch (error) {
      console.warn("Space Blaster could not save progress; this run will continue without persistence.", error);
    }
  }

  function updateHud() {
    scoreElement.textContent = String(score);
    highScoreElement.textContent = String(highScore);
    difficultyNameElement.textContent = CONFIG.difficulties[selectedDifficulty].label;
    waveElement.textContent = String(wave);
    livesElement.textContent = Array.from({ length: lives }, () => "♥").join(" ") || "—";
    livesElement.setAttribute("aria-label", `${lives} ${lives === 1 ? "life" : "lives"}`);
  }

  function refreshDifficulty() {
    const saved = readSaved(selectedDifficulty);
    highScore = saved.highScore;
    lastStoredRun = saved.run;
    const canContinue = Boolean(saved.run);
    if (state === "ready") {
      score = saved.run ? saved.run.score : 0;
      wave = saved.run ? saved.run.wave : 1;
      lives = saved.run ? saved.run.lives : CONFIG.difficulties[selectedDifficulty].lives;
    }
    overlayAction.textContent = canContinue ? "Continue Run" : "Start Game";
    difficultyNameElement.textContent = CONFIG.difficulties[selectedDifficulty].label;
    highScoreElement.textContent = String(highScore);
  }

  function drawShip(x, y, scale, color, glow) {
    context.save();
    context.translate(x, y);
    context.scale(scale, scale);
    context.shadowColor = glow;
    context.shadowBlur = 18;
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(0, -22);
    context.lineTo(17, 15);
    context.lineTo(6, 11);
    context.lineTo(0, 17);
    context.lineTo(-6, 11);
    context.lineTo(-17, 15);
    context.closePath();
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = "#0a1830";
    context.beginPath();
    context.moveTo(0, -11);
    context.lineTo(5, 8);
    context.lineTo(0, 5);
    context.lineTo(-5, 8);
    context.closePath();
    context.fill();
    context.fillStyle = "#8ffcff";
    context.fillRect(-2, 11, 4, 8 + Math.sin(simulationTime * 28) * 3);
    context.restore();
  }

  function drawEnemy(enemy) {
    const palettes = ["#ff689d", "#b98aff", "#ffae6e"];
    const color = palettes[enemy.kind % palettes.length];
    context.save();
    context.translate(enemy.x, enemy.y);
    context.shadowColor = color;
    context.shadowBlur = 13;
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(-17, -8);
    context.lineTo(-9, -15);
    context.lineTo(0, -10);
    context.lineTo(9, -15);
    context.lineTo(17, -8);
    context.lineTo(12, 9);
    context.lineTo(0, 14);
    context.lineTo(-12, 9);
    context.closePath();
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = "#19132e";
    context.fillRect(-9, -2, 5, 4);
    context.fillRect(4, -2, 5, 4);
    context.restore();
  }

  function drawBoss() {
    if (!boss) return;
    context.save();
    context.translate(boss.x, boss.y);
    context.shadowColor = "#ff69ba";
    context.shadowBlur = 22;
    context.fillStyle = "#cb61c9";
    context.beginPath();
    context.moveTo(-boss.width / 2, -15);
    context.lineTo(-boss.width / 2 + 25, -boss.height / 2);
    context.lineTo(-18, -boss.height / 2 + 10);
    context.lineTo(0, -boss.height / 2 - 3);
    context.lineTo(18, -boss.height / 2 + 10);
    context.lineTo(boss.width / 2 - 25, -boss.height / 2);
    context.lineTo(boss.width / 2, -15);
    context.lineTo(boss.width / 2 - 12, 22);
    context.lineTo(0, boss.height / 2);
    context.lineTo(-boss.width / 2 + 12, 22);
    context.closePath();
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = "#271837";
    context.fillRect(-boss.width * 0.32, -9, boss.width * 0.64, 18);
    context.fillStyle = "#8ffcff";
    context.fillRect(-boss.width * 0.24, -4, boss.width * 0.48, 5);
    context.restore();

    const barWidth = Math.min(290, W * 0.46);
    const ratio = Math.max(0, boss.health / boss.maxHealth);
    context.fillStyle = "rgba(7, 10, 25, .8)";
    context.fillRect((W - barWidth) / 2, 20, barWidth, 12);
    context.fillStyle = "#c55ef1";
    context.fillRect((W - barWidth) / 2, 20, barWidth * ratio, 12);
    context.strokeStyle = "rgba(228, 190, 255, .6)";
    context.strokeRect((W - barWidth) / 2, 20, barWidth, 12);
    context.fillStyle = "#e9dcff";
    context.font = "700 10px Segoe UI, sans-serif";
    context.textAlign = "center";
    context.fillText("BOSS", W / 2, 15);
  }

  function draw() {
    context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
    context.clearRect(0, 0, W, H);
    const background = context.createLinearGradient(0, 0, 0, H);
    background.addColorStop(0, "#090d20");
    background.addColorStop(1, "#080d19");
    context.fillStyle = background;
    context.fillRect(0, 0, W, H);

    for (const star of stars) {
      context.globalAlpha = star.alpha;
      context.fillStyle = star.size > 1.4 ? "#b9adff" : "#7beaf2";
      context.fillRect(star.x, star.y, star.size, star.size);
    }
    context.globalAlpha = 1;

    context.save();
    if (shakeTimer > 0 && !reducedMotion.matches) {
      const shake = (shakeTimer / CONFIG.effects.shakeSeconds) * CONFIG.effects.shakeAmount;
      context.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }
    for (const bullet of playerBullets) {
      context.shadowColor = "#65f5ff";
      context.shadowBlur = 12;
      context.fillStyle = "#c8ffff";
      context.fillRect(bullet.x - CONFIG.bullets.playerWidth / 2, bullet.y - CONFIG.bullets.playerHeight / 2, CONFIG.bullets.playerWidth, CONFIG.bullets.playerHeight);
    }
    for (const bullet of enemyBullets) {
      context.shadowColor = bullet.color;
      context.shadowBlur = 8;
      context.fillStyle = bullet.color;
      context.beginPath();
      context.arc(bullet.x, bullet.y, CONFIG.bullets.enemyRadius, 0, Math.PI * 2);
      context.fill();
    }
    context.shadowBlur = 0;
    for (const enemy of enemies) if (enemy.alive) drawEnemy(enemy);
    for (const powerUp of powerUps) drawPowerUp(powerUp);
    drawBoss();
    for (const particle of particles) {
      context.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      context.fillStyle = particle.color;
      context.fillRect(particle.x, particle.y, particle.size, particle.size);
    }
    context.globalAlpha = 1;
    if (player && (simulationTime >= player.invincibleUntil || Math.floor(simulationTime * 14) % 2 === 0)) {
      drawShip(player.x, player.y, 1, player.shieldUntil > simulationTime ? "#62e5ee" : "#a98aff", "#62e5ee");
      if (player.shieldUntil > simulationTime) {
        context.beginPath();
        context.arc(player.x, player.y, 29, 0, Math.PI * 2);
        context.strokeStyle = "rgba(98,229,238,.55)";
        context.lineWidth = 2;
        context.stroke();
      }
    }
    context.restore();
  }

  function drawPowerUp(powerUp) {
    const designs = {
      rapid: { color: "#ffe177", label: "R" },
      triple: { color: "#b996ff", label: "3" },
      shield: { color: "#62e5ee", label: "S" },
      life: { color: "#ff79ad", label: "+" }
    };
    const design = designs[powerUp.type];
    context.save();
    context.translate(powerUp.x, powerUp.y);
    context.rotate(simulationTime * 1.4);
    context.shadowColor = design.color;
    context.shadowBlur = 15;
    context.strokeStyle = design.color;
    context.lineWidth = 2;
    context.strokeRect(-CONFIG.powerUps.size, -CONFIG.powerUps.size, CONFIG.powerUps.size * 2, CONFIG.powerUps.size * 2);
    context.rotate(-simulationTime * 1.4);
    context.fillStyle = "#f4f3ff";
    context.font = "700 12px Segoe UI, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(design.label, 0, 0);
    context.restore();
  }

  function updateStars(dt) {
    for (const star of stars) {
      star.y += star.speed * dt;
      if (star.y > H) {
        star.y = 0;
        star.x = Math.random() * W;
      }
    }
  }

  function getBullet(pool, active, cap, x, y, vx, vy, color, owner) {
    if (active.length >= cap) return;
    const bullet = pool.pop() || {};
    bullet.x = x;
    bullet.y = y;
    bullet.vx = vx;
    bullet.vy = vy;
    bullet.color = color;
    bullet.owner = owner;
    active.push(bullet);
  }

  function spawnPlayerShot(angle = 0) {
    if (!player) return;
    const speed = CONFIG.player.bulletSpeed;
    getBullet(playerBulletPool, playerBullets, CONFIG.bullets.playerCap, player.x, player.y - CONFIG.player.height / 2, Math.sin(angle) * speed, -Math.cos(angle) * speed, "#72f6ff", "player");
  }

  function shoot() {
    if (!player || state !== "running") return;
    const rapid = player.rapidUntil > simulationTime;
    if (simulationTime < fireTimer) return;
    fireTimer = simulationTime + (rapid ? CONFIG.player.rapidFireCooldown : CONFIG.player.fireCooldown);
    if (player.tripleUntil > simulationTime) {
      spawnPlayerShot(-CONFIG.player.tripleSpread);
      spawnPlayerShot(0);
      spawnPlayerShot(CONFIG.player.tripleSpread);
    } else {
      spawnPlayerShot();
    }
  }

  function createWave() {
    enemies = [];
    boss = null;
    formationDropY = 0;
    formationOffsetX = 0;
    formationDirection = 1;
    wavePause = 0;
    wavePattern = wave % 3;
    if (wave % CONFIG.boss.everyWaves === 0) {
      const health = CONFIG.boss.baseHealth + Math.floor(wave / CONFIG.boss.everyWaves) * CONFIG.boss.healthPerWave;
      boss = { x: W / 2, y: 92, width: CONFIG.boss.width, height: CONFIG.boss.height, health, maxHealth: health, attackTimer: CONFIG.boss.attackDelay, attackIndex: 0, direction: 1 };
      statusElement.textContent = `Wave ${wave}. Boss incoming.`;
      return;
    }

    const extra = Math.floor((wave - 1) / 2);
    const columns = Math.min(CONFIG.enemies.maxColumns, CONFIG.enemies.baseColumns + extra);
    const rows = Math.min(CONFIG.enemies.maxRows, CONFIG.enemies.baseRows + Math.floor((wave - 1) / 4));
    const difficulty = CONFIG.difficulties[selectedDifficulty];
    let id = 0;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const x = (W - (columns - 1) * CONFIG.enemies.slotWidth) / 2 + column * CONFIG.enemies.slotWidth;
        const fireDelay = CONFIG.enemies.fireDelayMin + Math.random() * (CONFIG.enemies.fireDelayMax - CONFIG.enemies.fireDelayMin);
        enemies.push({
          id, kind: (row + column) % 3, x, baseX: x, y: CONFIG.enemies.topOffset + row * CONFIG.enemies.slotHeight,
          baseY: CONFIG.enemies.topOffset + row * CONFIG.enemies.slotHeight, alive: true,
          dive: false, diveClock: CONFIG.enemies.diveDelayMin + Math.random() * (CONFIG.enemies.diveDelayMax - CONFIG.enemies.diveDelayMin),
          fireClock: fireDelay / difficulty.fireRate, fireDelay,
          phase: Math.random() * Math.PI * 2
        });
        id += 1;
      }
    }
    statusElement.textContent = `Wave ${wave}. ${enemies.length} enemies incoming.`;
  }

  function beginRun(savedRun = null) {
    state = "running";
    score = savedRun ? savedRun.score : 0;
    wave = savedRun ? savedRun.wave : 1;
    lives = savedRun ? savedRun.lives : CONFIG.difficulties[selectedDifficulty].lives;
    simulationTime = 0;
    fireTimer = 0;
    wavePause = 0;
    player = {
      x: W / 2, y: H * CONFIG.player.startY, rapidUntil: 0, tripleUntil: 0, shieldUntil: 0, invincibleUntil: CONFIG.player.invincibilitySeconds
    };
    playerBullets.length = 0;
    enemyBullets.length = 0;
    particles.length = 0;
    powerUps.length = 0;
    keys.clear();
    fireHeld = false;
    joystickPointer = null;
    joystickX = 0;
    joystickY = 0;
    resetJoystick();
    updateHud();
    createWave();
    overlay.hidden = true;
    pauseButton.disabled = false;
    touchPauseButton.disabled = false;
    touchPauseButton.textContent = "Pause";
    persist({ score, wave, lives });
    canvas.focus({ preventScroll: true });
    draw();
    startLoop();
  }

  function showOverlay(kind) {
    overlay.hidden = false;
    difficultyPicker.hidden = kind !== "ready";
    changeDifficultyButton.hidden = kind !== "gameover";
    if (kind === "ready") {
      overlayIcon.textContent = "✦";
      overlayEyebrow.textContent = "READY PILOT";
      overlayTitle.textContent = "The stars are calling.";
      overlayMessage.textContent = "Move through the lower part of the screen and hold fire. Clear each wave, collect power-ups, and watch out for a boss every fifth wave.";
      overlayAction.textContent = lastStoredRun ? "Continue Run" : "Start Game";
      overlayAction.disabled = false;
      overlayAction.focus();
    } else if (kind === "paused") {
      overlayIcon.textContent = "Ⅱ";
      overlayEyebrow.textContent = "PAUSED";
      overlayTitle.textContent = "Catch your breath, pilot.";
      overlayMessage.textContent = `Score ${score} · Wave ${wave}. Your run is saved.`;
      overlayAction.textContent = "Resume";
      overlayAction.disabled = false;
      overlayAction.focus();
    } else {
      overlayIcon.textContent = "✕";
      overlayEyebrow.textContent = "RUN COMPLETE";
      overlayTitle.textContent = "The stars will remember.";
      overlayMessage.textContent = `Final score: ${score} · Wave reached: ${wave}${score >= highScore && score > 0 ? " · New high score!" : ""}`;
      overlayAction.textContent = "Play Again";
      overlayAction.disabled = false;
      overlayAction.focus();
      changeDifficultyButton.hidden = false;
    }
    draw();
  }

  function pauseGame() {
    if (state !== "running") return;
    state = "paused";
    keys.clear();
    fireHeld = false;
    joystickPointer = null;
    joystickX = 0;
    joystickY = 0;
    resetJoystick();
    persist({ score, wave, lives });
    pauseButton.disabled = true;
    touchPauseButton.textContent = "Resume";
    stopLoop();
    showOverlay("paused");
  }

  function resumeGame() {
    if (state !== "paused") return;
    state = "running";
    overlay.hidden = true;
    pauseButton.disabled = false;
    touchPauseButton.textContent = "Pause";
    lastFrameTime = 0;
    startLoop();
    canvas.focus({ preventScroll: true });
  }

  function finishGame() {
    state = "gameover";
    player = null;
    keys.clear();
    fireHeld = false;
    pauseButton.disabled = true;
    touchPauseButton.disabled = true;
    if (score > highScore) highScore = score;
    persist(null);
    updateHud();
    statusElement.textContent = `Game over. Score ${score}. Wave ${wave}.`;
    stopLoop();
    showOverlay("gameover");
  }

  function updateScore(points) {
    score += points;
    if (score > highScore) highScore = score;
    updateHud();
    persist({ score, wave, lives });
  }

  function spawnParticles(x, y, color, amount = CONFIG.effects.explosionParticles) {
    const cap = reducedMotion.matches ? CONFIG.effects.reducedParticleCap : CONFIG.effects.particleCap;
    for (let index = 0; index < amount; index += 1) {
      if (particles.length >= cap) {
        const oldest = particles.shift();
        particlePool.push(oldest);
      }
      const particle = particlePool.pop() || {};
      const angle = Math.random() * Math.PI * 2;
      const speed = 35 + Math.random() * 175;
      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.life = 0.28 + Math.random() * 0.5;
      particle.maxLife = particle.life;
      particle.size = 1 + Math.random() * 3;
      particle.color = color;
      particles.push(particle);
    }
    if (!reducedMotion.matches) shakeTimer = CONFIG.effects.shakeSeconds;
  }

  function dropPowerUp(x, y) {
    if (powerUps.length >= CONFIG.powerUps.dropCap || Math.random() > CONFIG.enemies.powerUpChance) return;
    const types = ["rapid", "triple", "shield", "life"];
    powerUps.push({ x, y, type: types[Math.floor(Math.random() * types.length)], vy: CONFIG.powerUps.fallSpeed });
  }

  function enemyKilled(enemy) {
    enemy.alive = false;
    spawnParticles(enemy.x, enemy.y, ["#ff689d", "#b98aff", "#ffae6e"][enemy.kind % 3]);
    dropPowerUp(enemy.x, enemy.y);
    updateScore(CONFIG.enemies.score * Math.max(1, Math.floor(wave / 2)));
  }

  function bossKilled() {
    spawnParticles(boss.x, boss.y, "#f277e8", CONFIG.effects.bossParticles);
    boss = null;
    updateScore(CONFIG.boss.score * Math.max(1, Math.floor(wave / CONFIG.boss.everyWaves)));
    wavePause = 1.6;
    statusElement.textContent = "Boss defeated. Prepare for the next wave.";
  }

  function damagePlayer() {
    if (!player || simulationTime < player.invincibleUntil) return;
    if (player.shieldUntil > simulationTime) {
      player.shieldUntil = 0;
      player.invincibleUntil = simulationTime + 0.55;
      spawnParticles(player.x, player.y, "#62e5ee", 10);
      return;
    }
    lives -= 1;
    player.invincibleUntil = simulationTime + CONFIG.player.invincibilitySeconds;
    spawnParticles(player.x, player.y, "#aa91ff", 14);
    updateHud();
    persist(lives > 0 ? { score, wave, lives } : null);
    statusElement.textContent = lives ? `${lives} lives remaining.` : "Last life lost.";
    if (lives <= 0) finishGame();
  }

  function movePlayer(dt) {
    if (!player) return;
    let dx = joystickX;
    let dy = joystickY;
    if (keys.has("ArrowLeft") || keys.has("a")) dx -= 1;
    if (keys.has("ArrowRight") || keys.has("d")) dx += 1;
    if (keys.has("ArrowUp") || keys.has("w")) dy -= 1;
    if (keys.has("ArrowDown") || keys.has("s")) dy += 1;
    const magnitude = Math.hypot(dx, dy);
    if (magnitude > 1) { dx /= magnitude; dy /= magnitude; }
    player.x = Math.max(CONFIG.player.width / 2, Math.min(W - CONFIG.player.width / 2, player.x + dx * CONFIG.player.speed * dt));
    player.y = Math.max(H * CONFIG.player.lowerBound, Math.min(H - CONFIG.player.height / 2, player.y + dy * CONFIG.player.speed * dt));
    if (fireHeld || keys.has(" ") || autoFire) shoot();
  }

  function fireEnemy(enemy) {
    if (!player) return;
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    const speed = CONFIG.enemies.bulletSpeed + Math.min(wave * 2, 90);
    getBullet(enemyBulletPool, enemyBullets, CONFIG.bullets.enemyCap, enemy.x, enemy.y + 13, Math.cos(angle) * speed, Math.sin(angle) * speed, "#ff80bc", "enemy");
  }

  function fireBoss() {
    if (!boss || !player) return;
    const aimAngle = Math.atan2(player.y - boss.y, player.x - boss.x);
    const speed = CONFIG.boss.bulletSpeed + Math.min(wave, 30);
    if (boss.attackIndex % 2 === 0) {
      for (let index = -1; index <= 1; index += 1) {
        const angle = aimAngle + index * CONFIG.boss.spreadAngle;
        getBullet(enemyBulletPool, enemyBullets, CONFIG.bullets.enemyCap, boss.x, boss.y + boss.height / 3, Math.cos(angle) * speed, Math.sin(angle) * speed, "#ff75d5", "boss");
      }
    } else {
      for (let index = -2; index <= 2; index += 1) {
        const angle = Math.PI / 2 + index * CONFIG.boss.spreadAngle;
        getBullet(enemyBulletPool, enemyBullets, CONFIG.bullets.enemyCap, boss.x, boss.y + boss.height / 3, Math.cos(angle) * speed, Math.sin(angle) * speed, "#bd86ff", "boss");
      }
    }
    boss.attackIndex += 1;
  }

  function updateEnemies(dt) {
    const difficulty = CONFIG.difficulties[selectedDifficulty];
    const speed = Math.min(CONFIG.enemies.maxSpeed, (CONFIG.enemies.formationSpeed + wave * CONFIG.enemies.waveSpeedIncrease) * difficulty.enemySpeed);
    const offsetStep = speed * dt * formationDirection;
    formationOffsetX += offsetStep;
    let left = W;
    let right = 0;
    for (const enemy of enemies) {
      if (enemy.alive && !enemy.dive) {
        left = Math.min(left, enemy.baseX + formationOffsetX);
        right = Math.max(right, enemy.baseX + formationOffsetX);
      }
    }
    if (right > 0) {
      const margin = CONFIG.enemies.slotWidth / 2;
      if (right > W - margin || left < margin) {
        formationDirection *= -1;
        formationOffsetX += formationDirection * Math.abs(offsetStep);
        formationDropY += CONFIG.enemies.descendDistance;
      }
    }

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      if (enemy.dive) {
        const angle = player ? Math.atan2(player.y - enemy.y, player.x - enemy.x) : Math.PI / 2;
        enemy.x += Math.cos(angle) * CONFIG.enemies.diveSpeed * dt;
        enemy.y += Math.sin(angle) * CONFIG.enemies.diveSpeed * dt;
        if (enemy.y > H + 30 || enemy.x < -30 || enemy.x > W + 30) enemy.alive = false;
      } else {
        enemy.x = enemy.baseX + formationOffsetX;
        const zigzag = wavePattern === 2;
        const verticalAmplitude = zigzag ? CONFIG.enemies.slotHeight * 0.22 : 4;
        enemy.y = enemy.baseY + formationDropY + Math.sin(simulationTime * (zigzag ? 3.2 : 1.6) + (zigzag ? enemy.id * 0.8 : enemy.phase)) * verticalAmplitude;
        enemy.diveClock -= dt;
        const diveChance = wavePattern === 0 ? 1 : CONFIG.enemies.diveChance;
        if (enemy.diveClock <= 0 && Math.random() < diveChance) {
          enemy.dive = true;
          continue;
        }
      }
      enemy.fireClock -= dt;
      if (enemy.fireClock <= 0) {
        fireEnemy(enemy);
        enemy.fireClock = Math.max(CONFIG.enemies.minFireDelay, enemy.fireDelay / difficulty.fireRate - wave * CONFIG.enemies.fireRateIncrease);
      }
      if (player && Math.hypot(player.x - enemy.x, player.y - enemy.y) < CONFIG.enemies.collisionRadius + CONFIG.player.hitRadius) {
        enemyKilled(enemy);
        damagePlayer();
      }
      if (enemy.y > CONFIG.enemies.breachY) {
        enemy.alive = false;
        damagePlayer();
      }
    }
    if (!boss && enemies.every((enemy) => !enemy.alive) && wavePause <= 0) {
      wavePause = 1.1;
      statusElement.textContent = `Wave ${wave} cleared.`;
    }
  }

  function updateBoss(dt) {
    if (!boss) return;
    boss.x += boss.direction * CONFIG.boss.speed * (1 + wave * 0.018) * dt;
    const edge = boss.width / 2 + 8;
    if (boss.x > W - edge || boss.x < edge) boss.direction *= -1;
    boss.attackTimer -= dt;
    if (boss.attackTimer <= 0) {
      fireBoss();
      boss.attackTimer = CONFIG.boss.attackDelay * (selectedDifficulty === "hard" ? 0.78 : selectedDifficulty === "easy" ? 1.2 : 1);
    }
    if (player && Math.hypot(player.x - boss.x, player.y - boss.y) < CONFIG.boss.collisionRadius + CONFIG.player.hitRadius) damagePlayer();
  }

  function updateBullets(dt) {
    for (let index = playerBullets.length - 1; index >= 0; index -= 1) {
      const bullet = playerBullets[index];
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      let hit = false;
      if (boss && bullet.y < boss.y + boss.height / 2 && bullet.y > boss.y - boss.height / 2 && Math.abs(bullet.x - boss.x) < boss.width / 2) {
        boss.health -= 1;
        hit = true;
        if (boss.health <= 0) bossKilled();
      } else {
        for (const enemy of enemies) {
          if (enemy.alive && Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y) < CONFIG.enemies.collisionRadius) {
            enemyKilled(enemy);
            hit = true;
            break;
          }
        }
      }
      if (hit || bullet.y < -20) {
        playerBullets.splice(index, 1);
        playerBulletPool.push(bullet);
      }
    }
    for (let index = enemyBullets.length - 1; index >= 0; index -= 1) {
      const bullet = enemyBullets[index];
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      if (player && Math.hypot(player.x - bullet.x, player.y - bullet.y) < CONFIG.player.hitRadius + CONFIG.bullets.enemyRadius) {
        damagePlayer();
        enemyBullets.splice(index, 1);
        enemyBulletPool.push(bullet);
      } else if (bullet.y > H + 20 || bullet.x < -20 || bullet.x > W + 20) {
        enemyBullets.splice(index, 1);
        enemyBulletPool.push(bullet);
      }
    }
  }

  function collectPowerUp(powerUp) {
    if (!player) return;
    const powerUpDurations = {
      rapid: CONFIG.powerUps.rapidDurationSeconds,
      triple: CONFIG.powerUps.tripleDurationSeconds,
      shield: CONFIG.powerUps.shieldDurationSeconds
    };
    if (powerUp.type === "life") {
      lives = Math.min(CONFIG.player.extraLifeLimit, lives + 1);
    } else {
      const field = powerUp.type === "rapid" ? "rapidUntil" : powerUp.type === "triple" ? "tripleUntil" : "shieldUntil";
      player[field] = Math.max(player[field], simulationTime) + powerUpDurations[powerUp.type];
    }
    statusElement.textContent = `${powerUp.type === "life" ? "Extra life" : `${powerUp.type} shot power-up`} collected.`;
    spawnParticles(powerUp.x, powerUp.y, powerUp.type === "life" ? "#ff79ad" : "#62e5ee", 9);
    updateHud();
    persist({ score, wave, lives });
  }

  function updatePowerUps(dt) {
    for (let index = powerUps.length - 1; index >= 0; index -= 1) {
      const powerUp = powerUps[index];
      powerUp.y += powerUp.vy * dt;
      if (player && Math.hypot(player.x - powerUp.x, player.y - powerUp.y) < CONFIG.player.hitRadius + CONFIG.powerUps.size) {
        collectPowerUp(powerUp);
        powerUps.splice(index, 1);
      } else if (powerUp.y > H + CONFIG.powerUps.size) {
        powerUps.splice(index, 1);
      }
    }
  }

  function updatePowerUpIndicators() {
    if (!player) {
      if (renderedPowerUpMarkup) {
        powerUpIndicators.replaceChildren();
        renderedPowerUpMarkup = "";
      }
      return;
    }
    const active = [
      ["rapidUntil", "Rapid fire"],
      ["tripleUntil", "Triple shot"],
      ["shieldUntil", "Shield"]
    ].filter(([field]) => player[field] > simulationTime);
    const markup = active.map(([field, label]) => {
      const seconds = Math.ceil(Math.min(CONFIG.player.maxPowerUpIndicatorSeconds, player[field] - simulationTime));
      return `<span class="powerup-indicator">${label} · ${seconds}s</span>`;
    }).join("");
    if (markup !== renderedPowerUpMarkup) {
      powerUpIndicators.innerHTML = markup;
      renderedPowerUpMarkup = markup;
    }
  }

  function updateParticles(dt) {
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.985;
      particle.vy *= 0.985;
      if (particle.life <= 0) {
        particles.splice(index, 1);
        particlePool.push(particle);
      }
    }
    shakeTimer = Math.max(0, shakeTimer - dt);
  }

  function update(dt) {
    simulationTime += dt;
    updateStars(dt);
    updateParticles(dt);
    if (state !== "running") return;
    movePlayer(dt);
    updateEnemies(dt);
    updateBoss(dt);
    updateBullets(dt);
    updatePowerUps(dt);
    updatePowerUpIndicators();
    if (wavePause > 0) {
      wavePause -= dt;
      if (wavePause <= 0 && state === "running") {
        wave += 1;
        updateHud();
        persist({ score, wave, lives });
        createWave();
      }
    }
  }

  function frame(timestamp) {
    frameId = 0;
    if (disposed || (state !== "running" && state !== "ready")) return;
    if (!lastFrameTime) lastFrameTime = timestamp;
    const dt = Math.min((timestamp - lastFrameTime) / 1000, CONFIG.world.maxFrameSeconds);
    lastFrameTime = timestamp;
    update(dt);
    draw();
    if (state === "running" || state === "ready") frameId = window.requestAnimationFrame(frame);
  }

  function startLoop() {
    if (!frameId && !disposed && (state === "running" || state === "ready")) {
      lastFrameTime = 0;
      frameId = window.requestAnimationFrame(frame);
    }
  }

  function stopLoop() {
    if (frameId) window.cancelAnimationFrame(frameId);
    frameId = 0;
    lastFrameTime = 0;
  }

  function resizeCanvas() {
    const rect = container.getBoundingClientRect();
    if (!rect.width) return;
    deviceScale = Math.min(window.devicePixelRatio || 1, CONFIG.world.maxPixelRatio);
    canvas.width = Math.round(W * deviceScale);
    canvas.height = Math.round(H * deviceScale);
    draw();
  }

  function resetJoystick() {
    joystick.style.setProperty("--stick-x", "0px");
    joystick.style.setProperty("--stick-y", "0px");
    joystickKnob.style.transform = "translate(0, 0)";
  }

  function pauseOrResume() {
    if (state === "running") pauseGame();
    else if (state === "paused") resumeGame();
  }

  function startSelectedRun() {
    if (state === "paused") {
      resumeGame();
      return;
    }
    const saved = readSaved(selectedDifficulty);
    beginRun(saved.run);
  }

  function handleKeyDown(event) {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const movementKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"];
    if (movementKeys.includes(key) || key === " ") event.preventDefault();
    if (event.repeat && ["Enter", "Escape", "p"].includes(key)) return;
    if (movementKeys.includes(key) || key === " ") keys.add(key);
    if (key === "p" || key === "Escape") pauseOrResume();
    if (key === "Enter" && (state === "ready" || state === "gameover")) {
      if (state === "ready") startSelectedRun();
      else beginRun();
    }
  }

  function handleKeyUp(event) {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    keys.delete(key);
  }

  function startJoystick(event) {
    if (state !== "running") return;
    event.preventDefault();
    joystickPointer = event.pointerId;
    joystick.setPointerCapture(event.pointerId);
    moveJoystick(event);
  }

  function moveJoystick(event) {
    if (joystickPointer !== event.pointerId) return;
    const rect = joystick.getBoundingClientRect();
    const radius = Math.max(1, Math.min(rect.width, rect.height) * 0.34);
    let dx = event.clientX - (rect.left + rect.width / 2);
    let dy = event.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(dx, dy);
    if (distance > radius) { dx = dx / distance * radius; dy = dy / distance * radius; }
    joystickX = dx / radius;
    joystickY = dy / radius;
    joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  function stopJoystick(event) {
    if (joystickPointer !== event.pointerId) return;
    joystickPointer = null;
    joystickX = 0;
    joystickY = 0;
    resetJoystick();
  }

  difficultyButtons.forEach((button) => {
    listen(button, "click", () => {
      if (state !== "ready" && state !== "gameover") return;
      selectedDifficulty = button.dataset.difficulty;
      difficultyButtons.forEach((choice) => {
        const selected = choice === button;
        choice.classList.toggle("is-selected", selected);
        choice.setAttribute("aria-pressed", String(selected));
      });
      refreshDifficulty();
      updateHud();
    });
  });
  listen(overlayAction, "click", startSelectedRun);
  listen(changeDifficultyButton, "click", () => {
    state = "ready";
    player = null;
    showOverlay("ready");
    refreshDifficulty();
    difficultyButtons.find((button) => button.dataset.difficulty === selectedDifficulty)?.focus();
  });
  listen(pauseButton, "click", pauseOrResume);
  listen(touchPauseButton, "click", pauseOrResume);
  listen(restartButton, "click", () => beginRun());
  listen(autoFireButton, "click", () => {
    autoFire = !autoFire;
    autoFireButton.setAttribute("aria-pressed", String(autoFire));
    autoFireButton.textContent = `Auto-fire: ${autoFire ? "On" : "Off"}`;
  });
  listen(fireButton, "pointerdown", (event) => {
    if (state !== "running") return;
    event.preventDefault();
    fireHeld = true;
    fireButton.setPointerCapture(event.pointerId);
    shoot();
  });
  listen(fireButton, "pointerup", () => { fireHeld = false; });
  listen(fireButton, "pointercancel", () => { fireHeld = false; });
  listen(joystick, "pointerdown", startJoystick);
  listen(joystick, "pointermove", moveJoystick);
  listen(joystick, "pointerup", stopJoystick);
  listen(joystick, "pointercancel", stopJoystick);
  listen(window, "keydown", handleKeyDown, { passive: false });
  listen(window, "keyup", handleKeyUp);
  listen(window, "blur", () => {
    keys.clear();
    fireHeld = false;
    if (state === "running") pauseGame();
  });
  listen(document, "visibilitychange", () => {
    if (document.hidden) {
      if (state === "running") pauseGame();
      else stopLoop();
    } else if (state === "ready") {
      startLoop();
    }
  });
  listen(window, "resize", resizeCanvas, { passive: true });
  listen(window, "orientationchange", resizeCanvas, { passive: true });
  listen(window, "pagehide", () => {
    disposed = true;
    stopLoop();
    if (resizeObserver) resizeObserver.disconnect();
    cleanups.splice(0).forEach((cleanup) => cleanup());
  }, { once: true });

  if ("ResizeObserver" in window) {
    resizeObserver = new window.ResizeObserver(resizeCanvas);
    resizeObserver.observe(container);
  }
  autoFire = window.matchMedia("(pointer: coarse)").matches;
  autoFireButton.setAttribute("aria-pressed", String(autoFire));
  autoFireButton.textContent = `Auto-fire: ${autoFire ? "On" : "Off"}`;
  refreshDifficulty();
  updateHud();
  resizeCanvas();
  showOverlay("ready");
  startLoop();
})();
