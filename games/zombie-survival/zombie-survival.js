(() => {
  "use strict";

  const WORLD = { width: 960, height: 600, maxZombies: 58, maxBullets: 110, particleCap: 180, reducedParticleCap: 40 };
  const DIFFICULTIES = {
    easy: { label: "Easy", speed: 0.8, health: 0.78, spawn: 1.15 },
    medium: { label: "Medium", speed: 1, health: 1, spawn: 1 },
    hard: { label: "Hard", speed: 1.25, health: 1.35, spawn: 0.76 }
  };
  const WEAPONS = {
    pistol: { label: "Pistol", damage: 22, cooldown: 0.34, magazine: 12, reserve: 60, maxReserve: 144, reload: 1.15, pellets: 1, spread: 0.035, speed: 720 },
    shotgun: { label: "Shotgun", damage: 13, cooldown: 0.78, magazine: 6, reserve: 30, maxReserve: 72, reload: 1.55, pellets: 6, spread: 0.34, speed: 580 },
    rifle: { label: "Rifle", damage: 15, cooldown: 0.115, magazine: 30, reserve: 120, maxReserve: 270, reload: 1.45, pellets: 1, spread: 0.075, speed: 820 }
  };
  const ZOMBIE_TYPES = {
    walker: { health: 34, speed: 42, radius: 15, damage: 9, score: 100, xp: 8, color: "#78b683", drop: 0.12 },
    runner: { health: 19, speed: 86, radius: 12, damage: 7, score: 140, xp: 9, color: "#d0bd68", drop: 0.1 },
    tank: { health: 115, speed: 25, radius: 22, damage: 18, score: 260, xp: 18, color: "#8b74a9", drop: 0.28 },
    spitter: { health: 29, speed: 33, radius: 15, damage: 8, score: 190, xp: 14, color: "#5eaaa5", drop: 0.18 }
  };
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
  const changeDifficulty = document.querySelector("#change-difficulty");
  const upgradeOptions = document.querySelector("#upgrade-options");
  const healthValue = document.querySelector("#health-value");
  const healthBar = document.querySelector("#health-bar");
  const weaponValue = document.querySelector("#weapon-value");
  const ammoValue = document.querySelector("#ammo-value");
  const waveValue = document.querySelector("#wave-value");
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
  const weaponButtons = [...document.querySelectorAll(".weapon-button")];
  const difficultyButtons = [...document.querySelectorAll(".difficulty-button")];

  const requiredElements = [
    canvas, context, overlay, overlayIcon, overlayEyebrow, overlayTitle, overlayMessage, overlayAction,
    overlayHint, difficultyPicker, changeDifficulty, upgradeOptions, healthValue, healthBar, weaponValue,
    ammoValue, waveValue, scoreValue, bestValue, difficultyLabel, levelValue, xpValue, xpBar, xpProgress,
    pauseButton, restartButton, reloadButton, touchReload, touchPause, statusElement, moveStick, aimStick
  ];
  if (requiredElements.some((element) => !element) || weaponButtons.length !== 3 || difficultyButtons.length !== 3) {
    console.error("Zombie Survival could not initialize: required game elements or Canvas 2D support are unavailable.");
    if (overlayTitle) overlayTitle.textContent = "Game unavailable";
    if (overlayMessage) overlayMessage.textContent = "This browser could not start the Canvas game. Try a current browser with Canvas 2D support.";
    if (overlayAction) overlayAction.disabled = true;
    return;
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
  const cleanups = [];
  const weaponState = Object.fromEntries(Object.entries(WEAPONS).map(([id, weapon]) => [
    id, { magazine: weapon.magazine, reserve: weapon.reserve }
  ]));

  let selectedDifficulty = "medium";
  let selectedWeapon = "pistol";
  let gameState = "ready";
  let score = 0;
  let bestScore = 0;
  let bestWave = 0;
  let wave = 1;
  let spawnRemaining = 0;
  let bossPending = false;
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

  function storageKey(difficulty) {
    return `labz-zombie-survival-best-v1-${difficulty}`;
  }

  function loadBest() {
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
    scoreValue.textContent = String(score);
    bestValue.textContent = `${bestScore} · W${bestWave}`;
    levelValue.textContent = `LV ${level}`;
    xpValue.textContent = `${xp} / ${xpGoal} XP`;
    xpBar.style.width = `${Math.min(100, xp / xpGoal * 100)}%`;
    xpProgress.setAttribute("aria-valuemax", String(xpGoal));
    xpProgress.setAttribute("aria-valuenow", String(xp));
  }

  function updateWeaponButtons() {
    weaponButtons.forEach((button) => {
      const selected = button.dataset.weapon === selectedWeapon;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function selectWeapon(id) {
    if (!WEAPONS[id]) return;
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
    changeDifficulty.hidden = true;
    overlayHint.hidden = false;
    overlayAction.hidden = false;
    overlayAction.dataset.action = "";
    overlayIcon.textContent = "☣";

    if (kind === "ready") {
      overlayEyebrow.textContent = "STAY SHARP";
      overlayTitle.textContent = "The night is yours to survive.";
      overlayMessage.textContent = "Keep moving and clear each wave. Every fifth wave brings a boss. Collect supplies, earn XP, and choose upgrades to stay alive.";
      difficultyPicker.hidden = false;
      overlayAction.textContent = "Start Survival";
      overlayAction.dataset.action = "start";
      overlayHint.textContent = "Move: WASD / arrows · Aim: mouse · Fire: click / Space · Reload: R · Pause: P / Esc";
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

  function spawnZombie(typeId, boss = false) {
    if (zombies.length >= WORLD.maxZombies) return false;
    const definition = boss ? { health: 620, speed: 22, radius: 34, damage: 24, score: 1800, xp: 75, color: "#ec5278", drop: 1 } : ZOMBIE_TYPES[typeId];
    const side = Math.floor(Math.random() * 4);
    const x = side === 0 ? -25 : side === 1 ? WORLD.width + 25 : 35 + Math.random() * (WORLD.width - 70);
    const y = side === 2 ? -25 : side === 3 ? WORLD.height + 25 : 35 + Math.random() * (WORLD.height - 70);
    const factor = DIFFICULTIES[selectedDifficulty];
    const zombie = takeFromPool(zombiePool, () => ({}));
    const waveScale = 1 + Math.max(0, wave - 1) * 0.085;
    Object.assign(zombie, {
      id: typeId, boss, x, y, radius: definition.radius * (boss ? 1 : 0.94 + Math.random() * 0.12),
      health: definition.health * factor.health * waveScale,
      maxHealth: definition.health * factor.health * waveScale,
      speed: definition.speed * factor.speed * (1 + Math.min(0.35, wave * 0.012)),
      damage: definition.damage, score: definition.score, xp: definition.xp,
      color: definition.color, drop: definition.drop, attackCooldown: 0.4 + Math.random() * 0.7,
      spitCooldown: 0.8 + Math.random() * 1.6, hitFlash: 0, wobble: Math.random() * Math.PI * 2
    });
    zombies.push(zombie);
    return true;
  }

  function chooseZombieType() {
    const choices = ["walker", "walker", "walker", "runner"];
    if (wave >= 2) choices.push("runner", "spitter");
    if (wave >= 3) choices.push("tank");
    if (wave >= 4) choices.push("spitter", "runner");
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function beginWave() {
    spawnRemaining = Math.min(7 + wave * 2, 34);
    bossPending = wave % 5 === 0;
    spawnTimer = 0.35;
    announce(bossPending ? `Wave ${wave}. Boss detected.` : `Wave ${wave}. Incoming.`);
    updateHud();
  }

  function resetRun() {
    for (let index = zombies.length - 1; index >= 0; index -= 1) release(zombies, index, zombiePool, (item) => { item.id = ""; });
    for (let index = bullets.length - 1; index >= 0; index -= 1) release(bullets, index, bulletPool, (item) => { item.x = 0; });
    for (let index = enemyBullets.length - 1; index >= 0; index -= 1) release(enemyBullets, index, enemyBulletPool, (item) => { item.x = 0; });
    for (let index = pickups.length - 1; index >= 0; index -= 1) release(pickups, index, pickupPool, (item) => { item.kind = ""; });
    for (let index = particles.length - 1; index >= 0; index -= 1) release(particles, index, particlePool, (item) => { item.life = 0; });
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
    pauseButton.disabled = true;
    showOverlay("gameover");
    render();
    announce(`Game over. Score ${score}, wave ${wave}.`);
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
    if (xp >= xpGoal) {
      xp -= xpGoal;
      level += 1;
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
      if (ammo.reserve > 0) reload();
      return;
    }
    ammo.magazine -= 1;
    fireCooldown = weapon.cooldown / fireRateMultiplier;
    const baseAngle = Math.atan2(player.aimY, player.aimX);
    const shotCount = Math.min(weapon.pellets, WORLD.maxBullets - bullets.length);
    for (let index = 0; index < shotCount; index += 1) {
      const centered = index - (shotCount - 1) / 2;
      const angle = baseAngle + centered * weapon.spread + (Math.random() - 0.5) * weapon.spread * 0.22;
      const bullet = takeFromPool(bulletPool, () => ({}));
      Object.assign(bullet, {
        x: player.x + Math.cos(angle) * 19, y: player.y + Math.sin(angle) * 19,
        vx: Math.cos(angle) * weapon.speed, vy: Math.sin(angle) * weapon.speed,
        damage: weapon.damage * damageMultiplier, radius: selectedWeapon === "shotgun" ? 3.5 : 3,
        life: 0.9, color: selectedWeapon === "shotgun" ? "#ffbd78" : "#7ff8ec"
      });
      bullets.push(bullet);
    }
    spawnParticle(player.x + player.aimX * 21, player.y + player.aimY * 21, "#ffd59b", selectedWeapon === "shotgun" ? 8 : 4, 0.7);
    updateHud();
  }

  function damagePlayer(amount) {
    if (player.invulnerable > 0 || gameState !== "playing") return;
    player.health = Math.max(0, player.health - amount);
    player.invulnerable = 0.7;
    shakeRemaining = reducedMotion.matches ? 0 : 0.2;
    spawnParticle(player.x, player.y, "#ff536b", 15, 1.3);
    spawnDamageNumber(player.x, player.y - 23, amount, "#ff7687");
    updateHud();
    if (player.health <= 0) finishGame();
  }

  function killZombie(index) {
    const zombie = zombies[index];
    score += zombie.score;
    saveBest();
    spawnParticle(zombie.x, zombie.y, zombie.color, zombie.boss ? 36 : 10, zombie.boss ? 1.4 : 1);
    if (Math.random() < zombie.drop) {
      const kind = Math.random() < 0.54 ? "ammo" : "health";
      spawnPickup(zombie.x, zombie.y, kind);
    }
    const earnedXP = zombie.xp;
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
    player.x = Math.max(player.radius + 5, Math.min(WORLD.width - player.radius - 5, player.x + dx * player.speed * movementMultiplier * delta));
    player.y = Math.max(player.radius + 5, Math.min(WORLD.height - player.radius - 5, player.y + dy * player.speed * movementMultiplier * delta));

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
      zombie.wobble += delta * (zombie.id === "runner" ? 8 : 4);
      const dx = player.x - zombie.x;
      const dy = player.y - zombie.y;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      let move = true;
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
        zombie.x += dx / distance * zombie.speed * delta;
        zombie.y += dy / distance * zombie.speed * delta;
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
      if (bullet.life <= 0 || bullet.x < -20 || bullet.x > WORLD.width + 20 || bullet.y < -20 || bullet.y > WORLD.height + 20) {
        release(bullets, index, bulletPool, (item) => { item.x = 0; });
        continue;
      }
      let hit = false;
      for (let zombieIndex = zombies.length - 1; zombieIndex >= 0; zombieIndex -= 1) {
        const zombie = zombies[zombieIndex];
        if (Math.hypot(bullet.x - zombie.x, bullet.y - zombie.y) > bullet.radius + zombie.radius) continue;
        zombie.health -= bullet.damage;
        zombie.hitFlash = 0.09;
        spawnDamageNumber(zombie.x, zombie.y - zombie.radius, bullet.damage);
        spawnParticle(bullet.x, bullet.y, zombie.color, 2, 0.45);
        release(bullets, index, bulletPool, (item) => { item.x = 0; });
        hit = true;
        if (zombie.health <= 0) killZombie(zombieIndex);
        if (gameState !== "playing") return;
        break;
      }
      if (hit && gameState !== "playing") return;
    }
    for (let index = enemyBullets.length - 1; index >= 0; index -= 1) {
      const bullet = enemyBullets[index];
      bullet.x += bullet.vx * delta;
      bullet.y += bullet.vy * delta;
      bullet.life -= delta;
      if (bullet.life <= 0 || bullet.x < -20 || bullet.x > WORLD.width + 20 || bullet.y < -20 || bullet.y > WORLD.height + 20) {
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
    shakeRemaining = Math.max(0, shakeRemaining - delta);
    player.invulnerable = Math.max(0, player.invulnerable - delta);
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
            announce(`Wave ${wave} boss entered.`);
          }
        }
        spawnTimer = interval;
      }
    } else if (zombies.length === 0) {
      waveDelay += delta;
      if (waveDelay >= 1.8) {
        wave += 1;
        waveDelay = 0;
        beginWave();
      }
    }
    saveBest();
    updateHud();
  }

  function drawBackground() {
    context.fillStyle = "#10131d";
    context.fillRect(0, 0, WORLD.width, WORLD.height);
    context.fillStyle = "rgba(94, 123, 108, .08)";
    for (let index = 0; index < 65; index += 1) {
      const x = (index * 157 + 37) % WORLD.width;
      const y = (index * 97 + 23) % WORLD.height;
      context.beginPath();
      context.ellipse(x, y, 4 + index % 8, 2 + index % 3, (index % 7) * 0.4, 0, Math.PI * 2);
      context.fill();
    }
    context.strokeStyle = "rgba(153, 165, 189, .045)";
    context.lineWidth = 1;
    for (let x = 0; x <= WORLD.width; x += 48) {
      context.beginPath(); context.moveTo(x, 0); context.lineTo(x, WORLD.height); context.stroke();
    }
    for (let y = 0; y <= WORLD.height; y += 48) {
      context.beginPath(); context.moveTo(0, y); context.lineTo(WORLD.width, y); context.stroke();
    }
    context.strokeStyle = "rgba(98,229,238,.18)";
    context.lineWidth = 3;
    context.strokeRect(2, 2, WORLD.width - 4, WORLD.height - 4);
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
      if (event.repeat && ["r", "p", "escape", "1", "2", "3"].includes(key)) return;
      if (key === "p" || key === "escape") {
        togglePause();
        return;
      }
      if (key === "r") { reload(); return; }
      if (key === "1") { selectWeapon("pistol"); return; }
      if (key === "2") { selectWeapon("shotgun"); return; }
      if (key === "3") { selectWeapon("rifle"); return; }
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
      const upgradeButtonElement = event.target.closest("[data-upgrade]");
      if (upgradeButtonElement && gameState === "upgrade") {
        applyUpgrade(upgradeButtonElement.dataset.upgrade);
        return;
      }
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (action === "start" || action === "restart") startGame();
      else if (action === "resume") resumeGame();
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
  loadBest();
  updateWeaponButtons();
  updateHud();
  showOverlay("ready");
  resizeCanvas();
})();
