(() => {
  "use strict";

  const CONFIG = {
    world: { width: 960, height: 600, maxPixelRatio: 2, maxFrameSeconds: 0.05, tileSize: 48 },
    path: { points: [[0, 126], [220, 126], [220, 258], [468, 258], [468, 134], [735, 134], [735, 414], [555, 414], [555, 515], [960, 515]], width: 64, safeMargin: 43 },
    garden: { startingHealth: 20, easyHealthBonus: 6, hardHealthPenalty: 5 },
    economy: { startingCoins: 190, minimumCoins: 0, killCoinBonus: 3 },
    waves: { startingEnemies: 7, enemiesPerWave: 2, maxEnemies: 42, spawnInterval: 0.78, intermission: 2, healthGrowth: 0.18, speedGrowth: 0.025, scorePerWave: 25, bossEveryWaves: 5 },
    enemy: {
      baseHealth: 34, baseSpeed: 43, leakDamage: 2,
      types: {
        sprout: { health: 1, speed: 1, reward: 9, score: 10, radius: 10, color: "#ff9d72" },
        swift: { health: 0.65, speed: 1.65, reward: 8, score: 12, radius: 8, color: "#ffd16f" },
        bramble: { health: 2.45, speed: 0.72, reward: 17, score: 20, radius: 14, color: "#d47aff" },
        wisp: { health: 1.35, speed: 1.22, reward: 13, score: 17, radius: 11, color: "#7be9de" },
        guardian: { health: 9, speed: 0.58, reward: 65, score: 120, radius: 21, color: "#ff6d9e" }
      }
    },
    towers: {
      bloom: { label: "Bloom", cost: 55, range: 142, damage: 9, cooldown: 0.58, projectileSpeed: 350, color: "#ff9fd0", projectileColor: "#fff1bd", upgradeCost: 42, description: "Rapid petals" },
      thorn: { label: "Thorn", cost: 80, range: 220, damage: 25, cooldown: 1.35, projectileSpeed: 490, color: "#bd9bff", projectileColor: "#e5d7ff", upgradeCost: 64, description: "Long range" },
      dew: { label: "Dew", cost: 70, range: 155, damage: 6, cooldown: 0.86, projectileSpeed: 300, color: "#73e8e1", projectileColor: "#d0fffa", slowFactor: 0.58, slowSeconds: 1.8, upgradeCost: 56, description: "Slows foes" }
    },
    upgrades: { maxLevel: 3, damageMultiplier: 1.55, rangeMultiplier: 1.12, cooldownMultiplier: 0.84, sellRefundRatio: 0.65 },
    projectiles: { radius: 4, maxCount: 150 },
    effects: { particleCap: 180, reducedParticleCap: 45, enemyBurst: 9, towerBurst: 5 },
    difficulties: {
      easy: { label: "Easy", enemyHealth: 0.78, enemySpeed: 0.85, spawnInterval: 0.95, startingHealth: 6, startingCoins: 215 },
      medium: { label: "Medium", enemyHealth: 1, enemySpeed: 1, spawnInterval: 0.78, startingHealth: 0, startingCoins: 190 },
      hard: { label: "Hard", enemyHealth: 1.38, enemySpeed: 1.2, spawnInterval: 0.64, startingHealth: -5, startingCoins: 165 }
    },
    initialDifficulty: "medium",
    storagePrefix: "labz-garden-guardians-best-v1"
  };

  const canvas = document.querySelector("#game-canvas");
  const context = canvas?.getContext("2d");
  const boardWrap = document.querySelector("#board-wrap");
  const overlay = document.querySelector("#game-overlay");
  const overlayIcon = document.querySelector("#overlay-icon");
  const overlayEyebrow = document.querySelector("#overlay-eyebrow");
  const overlayTitle = document.querySelector("#overlay-title");
  const overlayMessage = document.querySelector("#overlay-message");
  const overlayAction = document.querySelector("#overlay-action");
  const changeDifficultyButton = document.querySelector("#change-difficulty-button");
  const difficultyButtons = [...document.querySelectorAll(".difficulty-button")];
  const towerButtons = [...document.querySelectorAll(".tower-card")];
  const healthValue = document.querySelector("#health-value");
  const coinsValue = document.querySelector("#coins-value");
  const waveValue = document.querySelector("#wave-value");
  const scoreValue = document.querySelector("#score-value");
  const difficultyLabel = document.querySelector("#difficulty-label");
  const bestValue = document.querySelector("#best-value");
  const detailTitle = document.querySelector("#detail-title");
  const detailDescription = document.querySelector("#detail-description");
  const detailActions = document.querySelector("#detail-actions");
  const upgradeButton = document.querySelector("#upgrade-button");
  const sellButton = document.querySelector("#sell-button");
  const pauseButton = document.querySelector("#pause-button");
  const restartButton = document.querySelector("#restart-button");
  const statusElement = document.querySelector("#game-status");

  if (!canvas || !context || !boardWrap || !overlay || !overlayIcon || !overlayEyebrow || !overlayTitle || !overlayMessage || !overlayAction || !changeDifficultyButton || difficultyButtons.length !== 3 || towerButtons.length !== Object.keys(CONFIG.towers).length || !healthValue || !coinsValue || !waveValue || !scoreValue || !difficultyLabel || !bestValue || !detailTitle || !detailDescription || !detailActions || !upgradeButton || !sellButton || !pauseButton || !restartButton || !statusElement) {
    console.error("Garden Guardians could not initialize: required game elements or Canvas 2D support are unavailable.");
    if (overlayTitle) overlayTitle.textContent = "Game unavailable";
    if (overlayMessage) overlayMessage.textContent = "This browser could not start the Canvas game. Try a current browser with Canvas 2D support.";
    if (overlayAction) overlayAction.disabled = true;
    return;
  }

  const W = CONFIG.world.width;
  const H = CONFIG.world.height;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pathPoints = CONFIG.path.points.map(([x, y]) => ({ x, y }));
  const pathSegments = [];
  let routeLength = 0;
  for (let index = 0; index < pathPoints.length - 1; index += 1) {
    const start = pathPoints[index];
    const end = pathPoints[index + 1];
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    pathSegments.push({ start, end, length, startDistance: routeLength });
    routeLength += length;
  }
  const decorativeFlowers = Array.from({ length: 76 }, (_, index) => ({
    x: (index * 127 + 41) % W,
    y: (index * 193 + 28) % H,
    size: 2 + (index % 4),
    color: ["#b96bb1", "#e4c66d", "#73c7a2", "#7799ce"][index % 4]
  }));
  const towers = [];
  const enemies = [];
  const projectiles = [];
  const particles = [];
  const projectilePool = [];
  const particlePool = [];
  const keys = new Set();
  const cleanups = [];
  let selectedDifficulty = CONFIG.initialDifficulty;
  let selectedTowerType = "bloom";
  let selectedTower = null;
  let health = 20;
  let coins = CONFIG.economy.startingCoins;
  let wave = 0;
  let score = 0;
  let bestScore = 0;
  let state = "ready";
  let enemiesRemaining = 0;
  let guardianSpawned = false;
  let spawnTimer = 0;
  let intermissionTimer = 0;
  let simulationTime = 0;
  let animationFrame = 0;
  let lastFrameTime = 0;
  let deviceScale = 1;
  let pointerCell = null;
  let gridCell = { column: 0, row: 0 };
  let disposed = false;
  let resizeObserver = null;

  function listen(target, eventName, handler, options) {
    target.addEventListener(eventName, handler, options);
    cleanups.push(() => target.removeEventListener(eventName, handler, options));
  }

  function highScoreKey() {
    return `${CONFIG.storagePrefix}-${selectedDifficulty}`;
  }

  function loadBest() {
    try {
      const saved = Number(window.localStorage.getItem(highScoreKey()));
      bestScore = Number.isSafeInteger(saved) && saved >= 0 ? saved : 0;
    } catch (error) {
      console.warn("Garden Guardians could not read its saved best score.", error);
      bestScore = 0;
    }
    bestValue.textContent = String(bestScore);
    difficultyLabel.textContent = CONFIG.difficulties[selectedDifficulty].label;
  }

  function saveBest() {
    if (score <= bestScore) return;
    bestScore = score;
    bestValue.textContent = String(bestScore);
    try {
      window.localStorage.setItem(highScoreKey(), String(bestScore));
    } catch (error) {
      console.warn("Garden Guardians could not save the best score; this run will continue.", error);
    }
  }

  function updateHud() {
    const maximumHealth = healthMaximum();
    healthValue.textContent = `${state === "ready" ? maximumHealth : Math.max(0, health)} / ${maximumHealth}`;
    coinsValue.textContent = String(coins);
    waveValue.textContent = wave ? String(wave) : "—";
    scoreValue.textContent = String(score);
    bestValue.textContent = String(bestScore);
    difficultyLabel.textContent = CONFIG.difficulties[selectedDifficulty].label;
    towerButtons.forEach((button) => {
      const type = CONFIG.towers[button.dataset.tower];
      button.disabled = state === "running" && coins < type.cost;
      button.classList.toggle("is-selected", button.dataset.tower === selectedTowerType && !selectedTower);
      button.setAttribute("aria-pressed", String(button.dataset.tower === selectedTowerType && !selectedTower));
    });
  }

  function healthMaximum() {
    return Math.max(1, CONFIG.garden.startingHealth + CONFIG.difficulties[selectedDifficulty].startingHealth);
  }

  function describeSelection() {
    if (selectedTower) {
      const tower = selectedTower;
      const type = CONFIG.towers[tower.type];
      detailTitle.textContent = `${type.label} · Level ${tower.level}`;
      detailDescription.textContent = `${type.description}. ${Math.round(type.damage * Math.pow(CONFIG.upgrades.damageMultiplier, tower.level - 1))} damage.`;
      detailActions.hidden = false;
      const upgradeCost = nextUpgradeCost(tower);
      upgradeButton.textContent = tower.level >= CONFIG.upgrades.maxLevel ? "Max level" : `Upgrade · ${upgradeCost}`;
      upgradeButton.disabled = tower.level >= CONFIG.upgrades.maxLevel || coins < upgradeCost;
      sellButton.disabled = false;
      return;
    }
    const type = CONFIG.towers[selectedTowerType];
    detailTitle.textContent = `${type.label} selected`;
    detailDescription.textContent = `${type.description}. Choose an open tile beside the trail.`;
    detailActions.hidden = true;
  }

  function nextUpgradeCost(tower) {
    return CONFIG.towers[tower.type].upgradeCost * tower.level;
  }

  function pointOnRoute(distance) {
    const clamped = Math.max(0, Math.min(routeLength, distance));
    const segment = pathSegments.find((item) => clamped <= item.startDistance + item.length) || pathSegments[pathSegments.length - 1];
    const amount = segment.length ? (clamped - segment.startDistance) / segment.length : 0;
    return {
      x: segment.start.x + (segment.end.x - segment.start.x) * amount,
      y: segment.start.y + (segment.end.y - segment.start.y) * amount
    };
  }

  function distanceToRoute(x, y) {
    let minimum = Infinity;
    for (const segment of pathSegments) {
      const dx = segment.end.x - segment.start.x;
      const dy = segment.end.y - segment.start.y;
      const lengthSquared = dx * dx + dy * dy;
      const amount = Math.max(0, Math.min(1, ((x - segment.start.x) * dx + (y - segment.start.y) * dy) / lengthSquared));
      const px = segment.start.x + amount * dx;
      const py = segment.start.y + amount * dy;
      minimum = Math.min(minimum, Math.hypot(x - px, y - py));
    }
    return minimum;
  }

  function cellCenter(column, row) {
    return { x: (column + 0.5) * CONFIG.world.tileSize, y: (row + 0.5) * CONFIG.world.tileSize };
  }

  function isValidPlacement(x, y) {
    if (distanceToRoute(x, y) < CONFIG.path.safeMargin) return false;
    const spacing = CONFIG.world.tileSize * 0.88;
    return towers.every((tower) => Math.hypot(tower.x - x, tower.y - y) >= spacing);
  }

  function showOverlay(kind) {
    overlay.hidden = false;
    const difficultyPicker = overlay.querySelector(".difficulty-picker");
    difficultyPicker.hidden = kind !== "ready";
    changeDifficultyButton.hidden = kind !== "gameover";
    if (kind === "ready") {
      overlayIcon.textContent = "❋";
      overlayEyebrow.textContent = "A GARDEN NEEDS YOU";
      overlayTitle.textContent = "Guard the garden.";
      overlayMessage.textContent = "Build a line of flower towers along the winding trail. Defeat each wave before the creatures reach your garden.";
      overlayAction.textContent = "Start Defending";
      overlayAction.disabled = false;
      overlayAction.focus();
    } else if (kind === "paused") {
      overlayIcon.textContent = "Ⅱ";
      overlayEyebrow.textContent = "GARDEN AT REST";
      overlayTitle.textContent = "Take a breath, guardian.";
      overlayMessage.textContent = `Wave ${wave} · ${coins} coins. Your garden is safe while the game is paused.`;
      overlayAction.textContent = "Resume";
      overlayAction.disabled = false;
      overlayAction.focus();
    } else {
      overlayIcon.textContent = "✧";
      overlayEyebrow.textContent = "GARDEN OVERRUN";
      overlayTitle.textContent = "The wilds got through.";
      overlayMessage.textContent = `Final score: ${score} · Wave reached: ${wave}${score >= bestScore && score > 0 ? " · New best!" : ""}`;
      overlayAction.textContent = "Play Again";
      overlayAction.disabled = false;
      overlayAction.focus();
    }
    draw();
  }

  function drawBackground() {
    const background = context.createLinearGradient(0, 0, 0, H);
    background.addColorStop(0, "#10241f");
    background.addColorStop(0.52, "#14251f");
    background.addColorStop(1, "#101d23");
    context.fillStyle = background;
    context.fillRect(0, 0, W, H);
    for (const flower of decorativeFlowers) {
      context.globalAlpha = 0.25;
      context.fillStyle = flower.color;
      context.beginPath();
      context.arc(flower.x, flower.y, flower.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    context.strokeStyle = "rgba(156, 205, 155, .055)";
    context.lineWidth = 1;
    for (let x = 0; x <= W; x += CONFIG.world.tileSize) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, H);
      context.stroke();
    }
    for (let y = 0; y <= H; y += CONFIG.world.tileSize) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(W, y);
      context.stroke();
    }
    for (const segment of pathSegments) {
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = "rgba(15, 20, 26, .78)";
      context.lineWidth = CONFIG.path.width + 10;
      context.beginPath();
      context.moveTo(segment.start.x, segment.start.y);
      context.lineTo(segment.end.x, segment.end.y);
      context.stroke();
      context.strokeStyle = "#857552";
      context.lineWidth = CONFIG.path.width;
      context.stroke();
      context.strokeStyle = "rgba(235, 210, 149, .14)";
      context.lineWidth = CONFIG.path.width - 12;
      context.stroke();
      context.setLineDash([6, 12]);
      context.strokeStyle = "rgba(247, 224, 172, .22)";
      context.lineWidth = 2;
      context.stroke();
      context.setLineDash([]);
    }
    const start = pathPoints[0];
    const end = pathPoints[pathPoints.length - 1];
    drawGate(start.x + 25, start.y);
    drawGarden(end.x - 25, end.y);
  }

  function drawGate(x, y) {
    context.save();
    context.translate(x, y);
    context.fillStyle = "#4d3565";
    context.strokeStyle = "#b794dc";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(0, 0, 25, Math.PI, 0);
    context.lineTo(25, 16);
    context.lineTo(-25, 16);
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();
  }

  function drawGarden(x, y) {
    context.save();
    context.translate(x, y);
    context.shadowColor = "#62e5be";
    context.shadowBlur = 20;
    context.fillStyle = "#4c9c76";
    context.beginPath();
    context.arc(0, 0, 23, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = "#b4e8c1";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(0, 0, 16 + (reducedMotion.matches ? 0 : Math.sin(simulationTime * 2) * 2), 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = "#ffe493";
    context.beginPath();
    context.arc(0, 0, 5, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawTower(tower) {
    const config = CONFIG.towers[tower.type];
    const pulse = 1 + (reducedMotion.matches ? 0 : Math.sin(simulationTime * 2.7 + tower.id) * 0.04);
    context.save();
    context.translate(tower.x, tower.y);
    context.fillStyle = "rgba(9, 15, 24, .45)";
    context.beginPath();
    context.ellipse(2, 13, 19, 11, 0, 0, Math.PI * 2);
    context.fill();
    context.shadowColor = config.color;
    context.shadowBlur = 12;
    context.fillStyle = "#243444";
    context.strokeStyle = config.color;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(0, 0, 15 * pulse, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.shadowBlur = 0;
    context.fillStyle = config.color;
    if (tower.type === "bloom") {
      for (let petal = 0; petal < 6; petal += 1) {
        const angle = petal * Math.PI / 3 + simulationTime * 0.16;
        context.beginPath();
        context.ellipse(Math.cos(angle) * 7, Math.sin(angle) * 7, 4, 6, angle, 0, Math.PI * 2);
        context.fill();
      }
      context.fillStyle = "#ffe59b";
      context.beginPath();
      context.arc(0, 0, 4, 0, Math.PI * 2);
      context.fill();
    } else if (tower.type === "thorn") {
      context.rotate(Math.PI / 4);
      context.fillRect(-6, -6, 12, 12);
      context.fillRect(-2, -11, 4, 22);
      context.fillRect(-11, -2, 22, 4);
    } else {
      context.beginPath();
      context.arc(0, 0, 7, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "#d7fffb";
      context.beginPath();
      context.arc(0, 0, 11, 0, Math.PI * 2);
      context.stroke();
    }
    for (let level = 1; level < tower.level; level += 1) {
      context.fillStyle = "#fff0a8";
      context.beginPath();
      context.arc(-7 + level * 7, 19, 2, 0, Math.PI * 2);
      context.fill();
    }
    if (tower === selectedTower) {
      context.strokeStyle = "rgba(246, 238, 255, .76)";
      context.lineWidth = 1.5;
      context.setLineDash([4, 5]);
      context.beginPath();
      context.arc(0, 0, config.range, 0, Math.PI * 2);
      context.stroke();
    }
    context.restore();
  }

  function drawEnemy(enemy) {
    const config = CONFIG.enemy.types[enemy.type];
    const bob = reducedMotion.matches ? 0 : Math.sin(simulationTime * 7 + enemy.id) * 1.5;
    context.save();
    context.translate(enemy.x, enemy.y + bob);
    context.shadowColor = config.color;
    context.shadowBlur = enemy.type === "guardian" ? 18 : 10;
    context.fillStyle = config.color;
    context.beginPath();
    context.arc(0, 0, config.radius, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = "#20202d";
    context.beginPath();
    context.arc(-3.5, -1.5, 1.5, 0, Math.PI * 2);
    context.arc(3.5, -1.5, 1.5, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#38243b";
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(0, 2, 3, 0.15, Math.PI - 0.15);
    context.stroke();
    const ratio = Math.max(0, enemy.health / enemy.maxHealth);
    context.fillStyle = "rgba(8, 11, 18, .8)";
    context.fillRect(-config.radius, -config.radius - 6, config.radius * 2, 3);
    context.fillStyle = "#a9f6b6";
    context.fillRect(-config.radius, -config.radius - 6, config.radius * 2 * ratio, 3);
    context.restore();
  }

  function drawProjectile(projectile) {
    context.save();
    context.shadowColor = projectile.color;
    context.shadowBlur = 11;
    context.fillStyle = projectile.color;
    context.beginPath();
    context.arc(projectile.x, projectile.y, CONFIG.projectiles.radius, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function draw() {
    context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
    context.clearRect(0, 0, W, H);
    drawBackground();
    if (pointerCell && !overlay.hidden && state === "running") {
      const center = cellCenter(pointerCell.column, pointerCell.row);
      const type = CONFIG.towers[selectedTowerType];
      context.globalAlpha = 0.22;
      context.fillStyle = isValidPlacement(center.x, center.y) && coins >= type.cost ? type.color : "#ff6689";
      context.beginPath();
      context.arc(center.x, center.y, 16, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
    }
    for (const tower of towers) drawTower(tower);
    for (const projectile of projectiles) drawProjectile(projectile);
    for (const enemy of enemies) drawEnemy(enemy);
    for (const particle of particles) {
      context.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      context.fillStyle = particle.color;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function worldPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * W / rect.width,
      y: (event.clientY - rect.top) * H / rect.height
    };
  }

  function cellAt(x, y) {
    const column = Math.max(0, Math.min(Math.ceil(W / CONFIG.world.tileSize) - 1, Math.floor(x / CONFIG.world.tileSize)));
    const row = Math.max(0, Math.min(Math.ceil(H / CONFIG.world.tileSize) - 1, Math.floor(y / CONFIG.world.tileSize)));
    return { column, row };
  }

  function towerAt(x, y) {
    return towers.find((tower) => Math.hypot(tower.x - x, tower.y - y) <= 23) || null;
  }

  function placementMessage(point) {
    const center = cellCenter(point.column, point.row);
    const type = CONFIG.towers[selectedTowerType];
    if (coins < type.cost) {
      statusElement.textContent = `Not enough coins for ${type.label}.`;
      return;
    }
    if (!isValidPlacement(center.x, center.y)) {
      statusElement.textContent = "That spot is too close to the trail or another tower.";
      return;
    }
    towers.push({
      id: simulationTime + towers.length + Math.random(),
      type: selectedTowerType, x: center.x, y: center.y, level: 1, cooldown: 0, invested: type.cost
    });
    coins -= type.cost;
    selectedTower = towers[towers.length - 1];
    addParticle(center.x, center.y, type.color, CONFIG.effects.towerBurst);
    updateHud();
    describeSelection();
    statusElement.textContent = `${type.label} tower planted. Select it to upgrade or sell.`;
    draw();
  }

  function handleBoardAction(event) {
    if (state !== "running") return;
    const point = worldPoint(event);
    const existing = towerAt(point.x, point.y);
    if (existing) {
      selectedTower = existing;
      describeSelection();
      draw();
      statusElement.textContent = `${CONFIG.towers[existing.type].label}, level ${existing.level} selected.`;
      return;
    }
    selectedTower = null;
    describeSelection();
    placementMessage(cellAt(point.x, point.y));
  }

  function createEnemy() {
    const difficulty = CONFIG.difficulties[selectedDifficulty];
    const guardianWave = wave % CONFIG.waves.bossEveryWaves === 0;
    const types = Object.keys(CONFIG.enemy.types);
    let type = "sprout";
    if (guardianWave && !guardianSpawned) {
      type = "guardian";
      guardianSpawned = true;
    }
    else if (wave >= 4 && Math.random() < 0.12) type = "bramble";
    else if (wave >= 3 && Math.random() < 0.27) type = "swift";
    else if (wave >= 2 && Math.random() < 0.22) type = "wisp";
    if (!types.includes(type)) type = "sprout";
    const config = CONFIG.enemy.types[type];
    const start = pointOnRoute(0);
    const multiplier = 1 + (wave - 1) * CONFIG.waves.healthGrowth;
    const healthFactor = difficulty.enemyHealth * multiplier * config.health;
    const maxHealth = Math.max(1, CONFIG.enemy.baseHealth * healthFactor);
    enemies.push({
      id: simulationTime + Math.random(), type, x: start.x, y: start.y, distance: 0,
      maxHealth, health: maxHealth,
      speed: CONFIG.enemy.baseSpeed * difficulty.enemySpeed * (1 + (wave - 1) * CONFIG.waves.speedGrowth) * config.speed,
      reward: config.reward + Math.floor(wave / 3) * CONFIG.economy.killCoinBonus,
      score: config.score,
      slowUntil: 0
    });
  }

  function startWave() {
    wave += 1;
    const count = Math.min(CONFIG.waves.maxEnemies, CONFIG.waves.startingEnemies + (wave - 1) * CONFIG.waves.enemiesPerWave);
    enemiesRemaining = count;
    guardianSpawned = false;
    spawnTimer = 0.15;
    intermissionTimer = 0;
    updateHud();
    statusElement.textContent = wave % CONFIG.waves.bossEveryWaves === 0
      ? `Wave ${wave}. A Garden Guardian is approaching.`
      : `Wave ${wave} begins. ${count} creatures on the trail.`;
  }

  function startGame() {
    if (state === "paused") {
      resumeGame();
      return;
    }
    const difficulty = CONFIG.difficulties[selectedDifficulty];
    state = "running";
    health = Math.max(1, CONFIG.garden.startingHealth + difficulty.startingHealth);
    coins = difficulty.startingCoins;
    wave = 0;
    score = 0;
    enemiesRemaining = 0;
    spawnTimer = 0;
    intermissionTimer = 0;
    simulationTime = 0;
    towers.length = 0;
    enemies.length = 0;
    projectiles.length = 0;
    particles.length = 0;
    selectedTower = null;
    selectedTowerType = "bloom";
    towerButtons.forEach((button) => {
      const selected = button.dataset.tower === selectedTowerType;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    pauseButton.disabled = false;
    overlay.hidden = true;
    updateHud();
    describeSelection();
    canvas.focus({ preventScroll: true });
    startWave();
    lastFrameTime = 0;
    draw();
    startLoop();
  }

  function gameOver() {
    if (state !== "running") return;
    state = "gameover";
    pauseButton.disabled = true;
    saveBest();
    statusElement.textContent = `Garden overrun. Score ${score}. You reached wave ${wave}.`;
    stopLoop();
    showOverlay("gameover");
  }

  function pauseGame() {
    if (state !== "running") return;
    state = "paused";
    keys.clear();
    pauseButton.disabled = true;
    stopLoop();
    statusElement.textContent = "Game paused.";
    showOverlay("paused");
  }

  function resumeGame() {
    if (state !== "paused") return;
    state = "running";
    overlay.hidden = true;
    pauseButton.disabled = false;
    lastFrameTime = 0;
    startLoop();
    canvas.focus({ preventScroll: true });
  }

  function addParticle(x, y, color, amount = CONFIG.effects.enemyBurst) {
    const cap = reducedMotion.matches ? CONFIG.effects.reducedParticleCap : CONFIG.effects.particleCap;
    for (let index = 0; index < amount; index += 1) {
      if (particles.length >= cap) {
        particlePool.push(particles.shift());
      }
      const particle = particlePool.pop() || {};
      const angle = Math.random() * Math.PI * 2;
      const speed = 26 + Math.random() * 105;
      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.life = 0.24 + Math.random() * 0.42;
      particle.maxLife = particle.life;
      particle.size = 1.5 + Math.random() * 3;
      particle.color = color;
      particles.push(particle);
    }
  }

  function killEnemy(enemy) {
    const index = enemies.indexOf(enemy);
    if (index < 0) return;
    enemies.splice(index, 1);
    coins += enemy.reward;
    score += enemy.score + wave * CONFIG.waves.scorePerWave;
    saveBest();
    addParticle(enemy.x, enemy.y, CONFIG.enemy.types[enemy.type].color);
    updateHud();
    if (enemies.length === 0 && enemiesRemaining === 0) intermissionTimer = CONFIG.waves.intermission;
  }

  function updateEnemies(dt) {
    const difficulty = CONFIG.difficulties[selectedDifficulty];
    if (enemiesRemaining > 0) {
      spawnTimer -= dt;
      while (spawnTimer <= 0 && enemiesRemaining > 0) {
        createEnemy();
        enemiesRemaining -= 1;
        spawnTimer += difficulty.spawnInterval;
      }
    }
    for (let index = enemies.length - 1; index >= 0; index -= 1) {
      const enemy = enemies[index];
      const slowMultiplier = enemy.slowUntil > simulationTime ? CONFIG.towers.dew.slowFactor : 1;
      enemy.distance += enemy.speed * slowMultiplier * dt;
      const position = pointOnRoute(enemy.distance);
      enemy.x = position.x;
      enemy.y = position.y;
      if (enemy.distance >= routeLength) {
        health = Math.max(0, health - (enemy.type === "guardian" ? CONFIG.enemy.leakDamage * 3 : CONFIG.enemy.leakDamage));
        addParticle(enemy.x, enemy.y, "#ff8097", CONFIG.effects.towerBurst);
        enemies.splice(index, 1);
        updateHud();
        if (health <= 0) {
          gameOver();
          return;
        }
      }
    }
    if (enemiesRemaining === 0 && enemies.length === 0) {
      if (intermissionTimer <= 0) intermissionTimer = CONFIG.waves.intermission;
      else {
        intermissionTimer -= dt;
        if (intermissionTimer <= 0) startWave();
      }
    } else {
      intermissionTimer = 0;
    }
  }

  function fireTower(tower, target) {
    if (projectiles.length >= CONFIG.projectiles.maxCount) return;
    const config = CONFIG.towers[tower.type];
    const projectile = projectilePool.pop() || {};
    projectile.x = tower.x;
    projectile.y = tower.y;
    projectile.target = target;
    projectile.speed = config.projectileSpeed;
    projectile.damage = config.damage * Math.pow(CONFIG.upgrades.damageMultiplier, tower.level - 1);
    projectile.color = config.projectileColor;
    projectile.slowUntil = tower.type === "dew" ? simulationTime + config.slowSeconds * (1 + (tower.level - 1) * 0.35) : 0;
    projectiles.push(projectile);
  }

  function updateTowers(dt) {
    for (const tower of towers) {
      tower.cooldown = Math.max(0, tower.cooldown - dt);
      if (tower.cooldown > 0) continue;
      const config = CONFIG.towers[tower.type];
      const range = config.range * Math.pow(CONFIG.upgrades.rangeMultiplier, tower.level - 1);
      let target = null;
      for (const enemy of enemies) {
        if (enemy.health <= 0) continue;
        const distance = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);
        if (distance <= range && (!target || enemy.distance > target.distance)) target = enemy;
      }
      if (target) {
        fireTower(tower, target);
        tower.cooldown = config.cooldown * Math.pow(CONFIG.upgrades.cooldownMultiplier, tower.level - 1);
      }
    }
  }

  function updateProjectiles(dt) {
    for (let index = projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = projectiles[index];
      const target = projectile.target;
      if (!enemies.includes(target)) {
        projectiles.splice(index, 1);
        projectilePool.push(projectile);
        continue;
      }
      const dx = target.x - projectile.x;
      const dy = target.y - projectile.y;
      const distance = Math.hypot(dx, dy);
      const step = projectile.speed * dt;
      if (distance <= step + CONFIG.projectiles.radius + CONFIG.enemy.types[target.type].radius) {
        target.health -= projectile.damage;
        if (projectile.slowUntil) target.slowUntil = Math.max(target.slowUntil, projectile.slowUntil);
        addParticle(projectile.x, projectile.y, projectile.color, 3);
        if (target.health <= 0) killEnemy(target);
        projectiles.splice(index, 1);
        projectilePool.push(projectile);
      } else {
        projectile.x += dx / distance * step;
        projectile.y += dy / distance * step;
      }
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
  }

  function update(dt) {
    simulationTime += dt;
    updateParticles(dt);
    if (state !== "running") return;
    updateEnemies(dt);
    if (state !== "running") return;
    updateTowers(dt);
    updateProjectiles(dt);
  }

  function frame(timestamp) {
    animationFrame = 0;
    if (disposed || (state !== "running" && state !== "ready")) return;
    if (!lastFrameTime) lastFrameTime = timestamp;
    const dt = Math.min((timestamp - lastFrameTime) / 1000, CONFIG.world.maxFrameSeconds);
    lastFrameTime = timestamp;
    update(dt);
    draw();
    if (state === "running" || state === "ready") animationFrame = window.requestAnimationFrame(frame);
  }

  function startLoop() {
    if (!animationFrame && !disposed && (state === "running" || state === "ready")) {
      lastFrameTime = 0;
      animationFrame = window.requestAnimationFrame(frame);
    }
  }

  function stopLoop() {
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    lastFrameTime = 0;
  }

  function resizeCanvas() {
    const bounds = boardWrap.getBoundingClientRect();
    if (!bounds.width) return;
    deviceScale = Math.min(window.devicePixelRatio || 1, CONFIG.world.maxPixelRatio);
    canvas.width = Math.round(W * deviceScale);
    canvas.height = Math.round(H * deviceScale);
    draw();
  }

  function upgradeTower() {
    if (!selectedTower || selectedTower.level >= CONFIG.upgrades.maxLevel) return;
    const cost = nextUpgradeCost(selectedTower);
    if (coins < cost) {
      statusElement.textContent = "Not enough coins for this upgrade.";
      return;
    }
    coins -= cost;
    selectedTower.invested += cost;
    selectedTower.level += 1;
    addParticle(selectedTower.x, selectedTower.y, CONFIG.towers[selectedTower.type].color, CONFIG.effects.towerBurst);
    updateHud();
    describeSelection();
    draw();
    statusElement.textContent = `${CONFIG.towers[selectedTower.type].label} upgraded to level ${selectedTower.level}.`;
  }

  function sellTower() {
    if (!selectedTower) return;
    const refund = Math.floor(selectedTower.invested * CONFIG.upgrades.sellRefundRatio);
    const { x, y } = selectedTower;
    const index = towers.indexOf(selectedTower);
    if (index >= 0) towers.splice(index, 1);
    selectedTower = null;
    coins += refund;
    addParticle(x, y, "#f5d894", CONFIG.effects.towerBurst);
    updateHud();
    describeSelection();
    draw();
    statusElement.textContent = `Tower sold for ${refund} coins.`;
  }

  function chooseTower(type) {
    if (!CONFIG.towers[type]) return;
    selectedTowerType = type;
    selectedTower = null;
    towerButtons.forEach((button) => {
      const selected = button.dataset.tower === type;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    describeSelection();
    draw();
  }

  function changeDifficulty(type) {
    if (!CONFIG.difficulties[type] || state === "running" || state === "paused") return;
    selectedDifficulty = type;
    difficultyButtons.forEach((button) => {
      const selected = button.dataset.difficulty === type;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    loadBest();
    updateHud();
  }

  function handleKeyDown(event) {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const movementKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    if (movementKeys.includes(key)) {
      event.preventDefault();
      keys.add(key);
      const columns = Math.ceil(W / CONFIG.world.tileSize);
      const rows = Math.ceil(H / CONFIG.world.tileSize);
      if (key === "ArrowLeft") gridCell.column = Math.max(0, gridCell.column - 1);
      if (key === "ArrowRight") gridCell.column = Math.min(columns - 1, gridCell.column + 1);
      if (key === "ArrowUp") gridCell.row = Math.max(0, gridCell.row - 1);
      if (key === "ArrowDown") gridCell.row = Math.min(rows - 1, gridCell.row + 1);
      pointerCell = { ...gridCell };
      draw();
      return;
    }
    if (key === " " || key === "Enter") {
      if (state === "running" && document.activeElement === canvas) {
        event.preventDefault();
        if (selectedTower) {
          selectedTower = null;
          describeSelection();
        } else {
          placementMessage(gridCell);
        }
      } else if (key === "Enter" && (state === "ready" || state === "gameover")) {
        startGame();
      }
    }
    if (["1", "2", "3"].includes(key) && state === "running") chooseTower(Object.keys(CONFIG.towers)[Number(key) - 1]);
    if (key === "p" || key === "Escape") {
      if (state === "running") pauseGame();
      else if (state === "paused") resumeGame();
    }
  }

  function handleKeyUp(event) {
    keys.delete(event.key);
  }

  difficultyButtons.forEach((button) => listen(button, "click", () => changeDifficulty(button.dataset.difficulty)));
  towerButtons.forEach((button) => listen(button, "click", () => chooseTower(button.dataset.tower)));
  listen(overlayAction, "click", startGame);
  listen(changeDifficultyButton, "click", () => {
    if (state !== "gameover") return;
    state = "ready";
    showOverlay("ready");
    difficultyButtons.find((button) => button.dataset.difficulty === selectedDifficulty)?.focus();
  });
  listen(pauseButton, "click", () => {
    if (state === "running") pauseGame();
    else if (state === "paused") resumeGame();
  });
  listen(restartButton, "click", startGame);
  listen(upgradeButton, "click", upgradeTower);
  listen(sellButton, "click", sellTower);
  listen(canvas, "pointermove", (event) => {
    if (state !== "running") return;
    const point = worldPoint(event);
    pointerCell = cellAt(point.x, point.y);
    draw();
  });
  listen(canvas, "pointerleave", () => {
    pointerCell = null;
    draw();
  });
  listen(canvas, "pointerdown", (event) => {
    if (state !== "running") return;
    event.preventDefault();
    const point = worldPoint(event);
    const cell = cellAt(point.x, point.y);
    gridCell = cell;
    pointerCell = cell;
    handleBoardAction(event);
    canvas.focus({ preventScroll: true });
  });
  listen(window, "keydown", handleKeyDown, { passive: false });
  listen(window, "keyup", handleKeyUp);
  listen(window, "blur", () => {
    keys.clear();
    if (state === "running") pauseGame();
  });
  listen(document, "visibilitychange", () => {
    if (document.hidden && state === "running") pauseGame();
    else if (!document.hidden && state === "ready") startLoop();
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
    resizeObserver.observe(boardWrap);
  }
  loadBest();
  updateHud();
  describeSelection();
  resizeCanvas();
  showOverlay("ready");
  startLoop();
})();
