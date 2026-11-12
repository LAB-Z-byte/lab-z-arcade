(() => {
  "use strict";

  const WORLD = { width: 1800, height: 1000 };
  const BASE_HEALTH = 20;
  const CAMPAIGN_WAVES = 2;
  const SETTINGS_KEY = "labz-frontline-settings-v1";
  const RECORD_KEY = "labz-frontline-endless-record-v1";
  const SPEEDS = [0.5, 1, 2];
  const ROUTE = [
    { x: -40, y: 190 },
    { x: 300, y: 190 },
    { x: 300, y: 420 },
    { x: 710, y: 420 },
    { x: 710, y: 180 },
    { x: 1180, y: 180 },
    { x: 1180, y: 650 },
    { x: 940, y: 650 },
    { x: 940, y: 820 },
    { x: 1770, y: 820 }
  ];

  const canvas = document.querySelector("#battlefield");
  const context = canvas?.getContext("2d");
  const startButton = document.querySelector("#start-button");
  const phaseOverlay = document.querySelector("#phase-overlay");
  const overlayTitle = document.querySelector("#overlay-title");
  const overlayCopy = document.querySelector("#overlay-copy");
  const startView = document.querySelector("#start-view");
  const pauseView = document.querySelector("#pause-view");
  const resultView = document.querySelector("#result-view");
  const gameStatus = document.querySelector("#game-status");
  const baseValue = document.querySelector("#base-value");
  const integrityBar = document.querySelector("#integrity-bar");
  const waveValue = document.querySelector("#wave-value");
  const threatValue = document.querySelector("#threat-value");
  const scoreValue = document.querySelector("#score-value");
  const recordValue = document.querySelector("#record-value");
  const missionStatus = document.querySelector("#mission-status");
  const pauseButton = document.querySelector("#pause-button");
  const restartButton = document.querySelector("#restart-button");
  const settingsDialog = document.querySelector("#settings-dialog");
  const settingsButton = document.querySelector("#settings-button");
  const defaultSpeed = document.querySelector("#default-speed");
  const terrainDetail = document.querySelector("#terrain-detail");
  const settingsSaved = document.querySelector("#settings-saved");
  const gridReadout = document.querySelector("#grid-readout");
  const zoomValue = document.querySelector("#zoom-value");
  const requiredElements = [
    canvas, context, startButton, phaseOverlay, overlayTitle, overlayCopy, startView,
    pauseView, resultView, gameStatus, baseValue, integrityBar, waveValue,
    threatValue, scoreValue, recordValue, missionStatus, pauseButton, restartButton,
    settingsDialog, settingsButton, defaultSpeed, terrainDetail, settingsSaved,
    gridReadout, zoomValue
  ];

  if (requiredElements.some((element) => !element)) {
    console.error("LAB-Z Frontline Defense could not initialize: required game elements or Canvas 2D support are unavailable.");
    if (overlayTitle) overlayTitle.textContent = "Simulation unavailable";
    if (overlayCopy) overlayCopy.textContent = "This browser could not initialize the battlefield. Try a current browser with Canvas 2D support.";
    if (startButton) startButton.disabled = true;
    return;
  }

  const terrainCanvas = document.createElement("canvas");
  terrainCanvas.width = WORLD.width;
  terrainCanvas.height = WORLD.height;
  const terrainContext = terrainCanvas.getContext("2d");
  if (!terrainContext) {
    console.error("LAB-Z Frontline Defense could not initialize: the terrain Canvas 2D context is unavailable.");
    overlayTitle.textContent = "Simulation unavailable";
    overlayCopy.textContent = "This browser could not prepare the battlefield terrain.";
    startButton.disabled = true;
    return;
  }

  const modeButtons = [...document.querySelectorAll(".mode-card[data-mode]")];
  const speedButtons = [...document.querySelectorAll(".speed-button[data-speed]")];
  const enemies = [];
  const camera = { x: WORLD.width / 2, y: WORLD.height / 2 };
  const pressedKeys = new Set();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let settings = readSettings();
  let selectedMode = "campaign";
  let gameState = "ready";
  let wave = 0;
  let wavesCompleted = 0;
  let baseHealth = BASE_HEALTH;
  let score = 0;
  let enemiesToSpawn = 0;
  let spawnTimer = 0;
  let intermissionTimer = 0;
  let simulationSpeed = settings.speed;
  let zoom = 1;
  let viewportWidth = 0;
  let viewportHeight = 0;
  let pixelRatio = 1;
  let lastFrameTime = 0;
  let frameHandle = 0;
  let pointerDrag = null;
  let bestEndlessWave = readRecord();

  function readSettings() {
    const defaults = { speed: 1, terrainDetail: true };
    try {
      const saved = window.localStorage.getItem(SETTINGS_KEY);
      if (!saved) return defaults;
      const parsed = JSON.parse(saved);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        console.warn("LAB-Z Frontline Defense ignored invalid saved settings.");
        return defaults;
      }
      const speed = SPEEDS.includes(parsed.speed) ? parsed.speed : defaults.speed;
      const detail = typeof parsed.terrainDetail === "boolean" ? parsed.terrainDetail : defaults.terrainDetail;
      if (speed !== parsed.speed || detail !== parsed.terrainDetail) {
        console.warn("LAB-Z Frontline Defense restored invalid setting values to their defaults.");
      }
      return { speed, terrainDetail: detail };
    } catch (error) {
      console.warn("LAB-Z Frontline Defense could not read saved settings; defaults will be used.", error);
      return defaults;
    }
  }

  function readRecord() {
    try {
      const saved = window.localStorage.getItem(RECORD_KEY);
      if (saved === null) return 0;
      const parsed = Number(saved);
      if (Number.isSafeInteger(parsed) && parsed >= 0) return parsed;
      console.warn("LAB-Z Frontline Defense ignored an invalid endless record.");
    } catch (error) {
      console.warn("LAB-Z Frontline Defense could not read the endless record.", error);
    }
    return 0;
  }

  function saveSettings() {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      settingsSaved.textContent = "Preferences saved on this device.";
      return true;
    } catch (error) {
      settingsSaved.textContent = "Could not save preferences; changes apply for this visit.";
      console.warn("LAB-Z Frontline Defense could not save settings.", error);
      return false;
    }
  }

  function saveRecord(value) {
    bestEndlessWave = Math.max(bestEndlessWave, value);
    recordValue.textContent = `Wave ${bestEndlessWave}`;
    try {
      window.localStorage.setItem(RECORD_KEY, String(bestEndlessWave));
    } catch (error) {
      console.warn("LAB-Z Frontline Defense could not save the endless record.", error);
    }
  }

  function makeRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  function drawTerrain(detailEnabled) {
    const ctx = terrainContext;
    const random = makeRandom(70831);
    ctx.clearRect(0, 0, WORLD.width, WORLD.height);
    ctx.fillStyle = "#526044";
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    for (let index = 0; index < 38; index += 1) {
      const x = random() * WORLD.width;
      const y = random() * WORLD.height;
      const radius = 65 + random() * 150;
      ctx.fillStyle = index % 3 === 0 ? "rgba(151, 151, 99, .10)" : "rgba(27, 46, 34, .10)";
      ctx.beginPath();
      ctx.ellipse(x, y, radius * 1.35, radius * .55, random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.strokeStyle = "rgba(202, 202, 158, .075)";
    ctx.lineWidth = 1;
    for (let index = 0; index < 11; index += 1) {
      ctx.beginPath();
      ctx.ellipse(180 + index * 138, 490 + Math.sin(index) * 55, 150 + index * 8, 63 + index * 5, -.14, .15, Math.PI * 1.78);
      ctx.stroke();
    }
    ctx.restore();

    if (detailEnabled) {
      for (let index = 0; index < 5; index += 1) {
        const x = 70 + random() * (WORLD.width - 360);
        const y = 55 + random() * (WORLD.height - 150);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((random() - .5) * .14);
        ctx.fillStyle = "rgba(177, 165, 112, .16)";
        ctx.fillRect(0, 0, 250 + random() * 130, 75 + random() * 35);
        ctx.strokeStyle = "rgba(209, 195, 141, .12)";
        ctx.lineWidth = 1;
        for (let row = 10; row < 100; row += 11) {
          ctx.beginPath();
          ctx.moveTo(0, row);
          ctx.lineTo(370, row);
          ctx.stroke();
        }
        ctx.restore();
      }

      for (let index = 0; index < 480; index += 1) {
        const x = 15 + random() * (WORLD.width - 30);
        const y = 15 + random() * (WORLD.height - 30);
        const size = 4 + random() * 8;
        const shade = Math.floor(random() * 4);
        ctx.fillStyle = ["#344533", "#3b4c37", "#40503a", "#48563e"][shade];
        ctx.beginPath();
        ctx.ellipse(x + 2, y + 3, size * 1.05, size * .72, random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = ["rgba(124, 139, 91, .55)", "rgba(106, 126, 84, .5)", "rgba(140, 143, 92, .4)"][index % 3];
        ctx.beginPath();
        ctx.arc(x - size * .18, y - size * .2, size * .58, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let index = 0; index < 78; index += 1) {
        const x = random() * WORLD.width;
        const y = random() * WORLD.height;
        ctx.fillStyle = index % 2 ? "rgba(173, 166, 132, .48)" : "rgba(50, 55, 46, .5)";
        ctx.beginPath();
        ctx.ellipse(x, y, 4 + random() * 7, 3 + random() * 5, random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawRoad(ctx);
    drawLocation(ctx, 210, 672, "NORTH RIDGE");
    drawLocation(ctx, 1390, 345, "EAST APPROACH");
    drawLocation(ctx, 1450, 930, "FORWARD BASE · 07");
    ctx.strokeStyle = "rgba(232, 234, 213, .15)";
    ctx.lineWidth = 1;
    ctx.strokeRect(12, 12, WORLD.width - 24, WORLD.height - 24);
  }

  function drawRoad(ctx) {
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    ROUTE.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.strokeStyle = "rgba(41, 43, 35, .58)";
    ctx.lineWidth = 91;
    ctx.stroke();
    ctx.strokeStyle = "#77745e";
    ctx.lineWidth = 82;
    ctx.stroke();
    ctx.strokeStyle = "#55594d";
    ctx.lineWidth = 68;
    ctx.stroke();
    ctx.strokeStyle = "rgba(181, 175, 140, .26)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([12, 13]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(198, 185, 143, .46)";
    for (let index = 1; index < ROUTE.length - 1; index += 1) {
      const point = ROUTE[index];
      ctx.beginPath();
      ctx.arc(point.x, point.y, 47, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLocation(ctx, x, y, label) {
    ctx.save();
    ctx.fillStyle = "rgba(18, 24, 19, .45)";
    ctx.font = "700 12px Segoe UI, sans-serif";
    ctx.letterSpacing = "2px";
    ctx.fillText(label, x + 1, y + 1);
    ctx.fillStyle = "rgba(232, 234, 213, .55)";
    ctx.fillText(label, x, y);
    ctx.restore();
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    viewportWidth = rect.width;
    viewportHeight = rect.height;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(viewportWidth * pixelRatio);
    canvas.height = Math.round(viewportHeight * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    clampCamera();
  }

  function clampCamera() {
    const halfWidth = viewportWidth / (2 * zoom);
    const halfHeight = viewportHeight / (2 * zoom);
    camera.x = Math.max(halfWidth, Math.min(WORLD.width - halfWidth, camera.x));
    camera.y = Math.max(halfHeight, Math.min(WORLD.height - halfHeight, camera.y));
  }

  function updateCameraReadout() {
    zoomValue.textContent = `${Math.round(zoom * 100)}%`;
    const row = String.fromCharCode(65 + Math.floor(camera.y / 200) % 26);
    const column = String(Math.floor(camera.x / 200) + 1).padStart(2, "0");
    gridReadout.textContent = `${row}-${column}`;
  }

  function updateHud() {
    baseValue.textContent = `${baseHealth} / ${BASE_HEALTH}`;
    const integrity = Math.max(0, baseHealth / BASE_HEALTH * 100);
    integrityBar.style.width = `${integrity}%`;
    integrityBar.classList.toggle("is-critical", baseHealth <= 6);
    waveValue.textContent = wave ? `${String(wave).padStart(2, "0")}${selectedMode === "campaign" ? ` / ${CAMPAIGN_WAVES}` : ""}` : "—";
    threatValue.textContent = String(enemies.length + enemiesToSpawn);
    scoreValue.textContent = String(score);
    recordValue.textContent = `Wave ${bestEndlessWave}`;
    pauseButton.disabled = gameState !== "running" && gameState !== "paused";
    pauseButton.innerHTML = gameState === "paused" ? '<span aria-hidden="true">▶</span> Resume' : '<span aria-hidden="true">Ⅱ</span> Pause';
    restartButton.disabled = gameState === "ready";
    updateCameraReadout();
  }

  function announce(message) {
    gameStatus.textContent = message;
  }

  function showOverlay(view) {
    phaseOverlay.hidden = false;
    startView.hidden = view !== "start";
    pauseView.hidden = view !== "pause";
    resultView.hidden = view !== "result";
  }

  function hideOverlay() {
    phaseOverlay.hidden = true;
  }

  function setSelectedMode(mode) {
    selectedMode = mode;
    modeButtons.forEach((button) => {
      const selected = button.dataset.mode === mode;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    document.querySelector("#mission-brief").innerHTML = mode === "campaign"
      ? '<span class="brief-label">MISSION BRIEF</span><p>Protect the base through two incoming waves. Infantry that reaches the perimeter will reduce base integrity.</p>'
      : `<span class="brief-label">SURVIVAL BRIEF · LOCAL RECORD: WAVE ${bestEndlessWave}</span><p>Endless waves increase in size. The operation ends when base integrity reaches zero.</p>`;
    startButton.innerHTML = mode === "campaign"
      ? 'Begin campaign <span aria-hidden="true">↗</span>'
      : 'Begin survival <span aria-hidden="true">↗</span>';
  }

  function setSpeed(speed) {
    if (!SPEEDS.includes(speed)) return;
    simulationSpeed = speed;
    speedButtons.forEach((button) => {
      const selected = Number(button.dataset.speed) === speed;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function startWave(nextWave) {
    wave = nextWave;
    enemiesToSpawn = 5 + (wave - 1) * 2;
    spawnTimer = 0.35;
    intermissionTimer = 0;
    announce(`${selectedMode === "campaign" ? "Campaign" : "Endless"} wave ${wave} in progress. ${enemiesToSpawn} infantry units approaching.`);
    updateHud();
  }

  function beginOperation() {
    enemies.length = 0;
    baseHealth = BASE_HEALTH;
    wave = 0;
    wavesCompleted = 0;
    score = 0;
    spawnTimer = 0;
    intermissionTimer = 0;
    gameState = "running";
    simulationSpeed = settings.speed;
    setSpeed(simulationSpeed);
    camera.x = WORLD.width / 2;
    camera.y = WORLD.height / 2;
    zoom = 1;
    clampCamera();
    missionStatus.textContent = selectedMode === "campaign" ? "Green Valley · Campaign" : "Green Valley · Endless";
    document.querySelector("#pause-operation").textContent = selectedMode === "campaign" ? "Green Valley Campaign" : "Endless Survival";
    startWave(1);
    hideOverlay();
    updateHud();
    canvas.focus({ preventScroll: true });
  }

  function pauseOperation() {
    if (gameState !== "running") return;
    gameState = "paused";
    document.querySelector("#pause-base").textContent = `${baseHealth} / ${BASE_HEALTH}`;
    showOverlay("pause");
    overlayTitle.innerHTML = 'Operation <span>paused.</span>';
    overlayCopy.textContent = "The field simulation is paused. Review the situation or return to the operation select.";
    announce("Operation paused.");
    updateHud();
    document.querySelector("#resume-button").focus({ preventScroll: true });
  }

  function resumeOperation() {
    if (gameState !== "paused") return;
    gameState = "running";
    hideOverlay();
    announce("Operation resumed.");
    updateHud();
    canvas.focus({ preventScroll: true });
  }

  function returnToMenu() {
    gameState = "ready";
    enemies.length = 0;
    enemiesToSpawn = 0;
    baseHealth = BASE_HEALTH;
    wave = 0;
    wavesCompleted = 0;
    score = 0;
    missionStatus.textContent = "Awaiting deployment";
    overlayTitle.innerHTML = 'Hold the <span>line.</span>';
    overlayCopy.textContent = "A hostile infantry column is moving through the valley. Observe the fixed approach route and protect the forward operating base.";
    showOverlay("start");
    announce("Select an operation and begin the simulation.");
    updateHud();
    startButton.focus({ preventScroll: true });
  }

  function finishOperation(success) {
    gameState = success ? "won" : "lost";
    if (selectedMode === "endless") saveRecord(wavesCompleted);
    const headline = success ? "Campaign exercise complete." : "Base integrity lost.";
    missionStatus.textContent = success ? "Mission complete" : "Perimeter overrun";
    overlayTitle.innerHTML = success ? 'Sector <span>secured.</span>' : 'Line <span>overrun.</span>';
    overlayCopy.textContent = success
      ? "The Green Valley perimeter held through the full campaign exercise."
      : "Hostile infantry breached the perimeter. The operation has ended.";
    document.querySelector("#result-copy").textContent = selectedMode === "campaign"
      ? `${headline} Defensive placements and combat systems are not part of this Stage 1 simulation.`
      : `${headline} Your best endless result is wave ${bestEndlessWave}.`;
    document.querySelector("#result-waves").textContent = String(wavesCompleted);
    document.querySelector("#result-integrity").textContent = `${baseHealth} / ${BASE_HEALTH}`;
    document.querySelector("#result-score").textContent = String(score);
    showOverlay("result");
    announce(`${headline} ${wavesCompleted} waves completed. Base integrity ${baseHealth} of ${BASE_HEALTH}.`);
    updateHud();
    document.querySelector("#result-restart-button").focus({ preventScroll: true });
  }

  function spawnEnemy() {
    const health = 100 + Math.max(0, wave - 1) * 8;
    enemies.push({
      x: ROUTE[0].x,
      y: ROUTE[0].y,
      routeIndex: 1,
      health,
      maxHealth: health,
      speed: 72 + Math.min(wave - 1, 15) * 1.8,
      phase: Math.random() * Math.PI * 2
    });
  }

  function updateSimulation(deltaSeconds) {
    if (gameState !== "running") return;
    const delta = deltaSeconds * simulationSpeed;
    updateCamera(deltaSeconds);

    if (enemiesToSpawn > 0) {
      spawnTimer -= delta;
      while (spawnTimer <= 0 && enemiesToSpawn > 0) {
        spawnEnemy();
        enemiesToSpawn -= 1;
        spawnTimer += 1.15;
      }
    }

    for (let index = enemies.length - 1; index >= 0; index -= 1) {
      const enemy = enemies[index];
      let movement = enemy.speed * delta;
      while (movement > 0 && enemy.routeIndex < ROUTE.length) {
        const target = ROUTE[enemy.routeIndex];
        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        const distance = Math.hypot(dx, dy);
        if (distance <= movement) {
          enemy.x = target.x;
          enemy.y = target.y;
          enemy.routeIndex += 1;
          movement -= distance;
        } else {
          enemy.x += dx / distance * movement;
          enemy.y += dy / distance * movement;
          movement = 0;
        }
      }
      if (enemy.routeIndex >= ROUTE.length) {
        enemies.splice(index, 1);
        baseHealth = Math.max(0, baseHealth - 1);
        announce(`An infantry unit reached the base. Base integrity ${baseHealth} of ${BASE_HEALTH}.`);
        if (baseHealth <= 0) {
          finishOperation(false);
          return;
        }
      }
    }

    if (enemiesToSpawn === 0 && enemies.length === 0) {
      if (intermissionTimer === 0) {
        wavesCompleted = wave;
        score += wave * 100;
        if (selectedMode === "endless") saveRecord(wavesCompleted);
        if (selectedMode === "campaign" && wave >= CAMPAIGN_WAVES) {
          finishOperation(true);
          return;
        }
        intermissionTimer = 2.5;
        announce(`Wave ${wave} complete. Next wave in ${intermissionTimer.toFixed(1)} seconds.`);
      } else {
        intermissionTimer -= delta;
        if (intermissionTimer <= 0) startWave(wave + 1);
      }
    }
    updateHud();
  }

  function updateCamera(deltaSeconds) {
    let horizontal = 0;
    let vertical = 0;
    if (pressedKeys.has("a") || pressedKeys.has("arrowleft")) horizontal -= 1;
    if (pressedKeys.has("d") || pressedKeys.has("arrowright")) horizontal += 1;
    if (pressedKeys.has("w") || pressedKeys.has("arrowup")) vertical -= 1;
    if (pressedKeys.has("s") || pressedKeys.has("arrowdown")) vertical += 1;
    if (horizontal === 0 && vertical === 0) return;
    const length = Math.hypot(horizontal, vertical);
    const cameraSpeed = 390 * deltaSeconds / zoom;
    camera.x += horizontal / length * cameraSpeed;
    camera.y += vertical / length * cameraSpeed;
    clampCamera();
  }

  function drawEnemy(ctx, enemy, time) {
    const target = ROUTE[Math.min(enemy.routeIndex, ROUTE.length - 1)];
    const facing = Math.atan2(target.y - enemy.y, target.x - enemy.x) + Math.PI / 2;
    const gait = reducedMotion.matches ? 0 : Math.sin(time * 10 + enemy.phase) * 1.1;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(facing);
    ctx.fillStyle = "rgba(20, 25, 20, .5)";
    ctx.beginPath();
    ctx.ellipse(1, 3, 7, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#34392d";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-2, 4);
    ctx.lineTo(-3 - gait, 9);
    ctx.moveTo(2, 4);
    ctx.lineTo(3 + gait, 9);
    ctx.moveTo(-3, -1);
    ctx.lineTo(-5 - gait, 3);
    ctx.moveTo(3, -1);
    ctx.lineTo(5 + gait, 3);
    ctx.stroke();

    ctx.fillStyle = "#66704e";
    ctx.beginPath();
    ctx.ellipse(0, 1, 4.1, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#535f43";
    ctx.beginPath();
    ctx.arc(0, -5, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#353b2e";
    ctx.fillRect(-2.8, -7, 5.6, 1.7);
    ctx.strokeStyle = "#292f27";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(4, -1);
    ctx.lineTo(4.5, -8);
    ctx.stroke();
    ctx.restore();

    const barWidth = 17;
    const barY = enemy.y - 15;
    ctx.fillStyle = "rgba(16, 20, 16, .78)";
    ctx.fillRect(enemy.x - barWidth / 2, barY, barWidth, 2.5);
    ctx.fillStyle = "#bbc68d";
    ctx.fillRect(enemy.x - barWidth / 2, barY, barWidth * (enemy.health / enemy.maxHealth), 2.5);
  }

  function drawBase(ctx) {
    const base = ROUTE[ROUTE.length - 1];
    ctx.save();
    ctx.translate(base.x - 26, base.y);
    ctx.fillStyle = "rgba(18, 24, 20, .55)";
    ctx.fillRect(-39, -35, 78, 70);
    ctx.strokeStyle = "rgba(206, 211, 171, .48)";
    ctx.lineWidth = 2;
    ctx.strokeRect(-39, -35, 78, 70);
    ctx.fillStyle = "#555c48";
    ctx.fillRect(-24, -23, 48, 46);
    ctx.fillStyle = "#77805d";
    ctx.fillRect(-19, -18, 38, 36);
    ctx.strokeStyle = "rgba(225, 225, 190, .56)";
    ctx.lineWidth = 1;
    ctx.strokeRect(-19, -18, 38, 36);
    ctx.fillStyle = "#d4d7b4";
    ctx.font = "700 9px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("FOB", 0, 3);
    ctx.fillStyle = baseHealth <= 6 ? "#d77d67" : "#c2cf91";
    ctx.beginPath();
    ctx.arc(0, -29, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBattlefield(now) {
    if (!viewportWidth || !viewportHeight) return;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, viewportWidth, viewportHeight);
    context.fillStyle = "#43523b";
    context.fillRect(0, 0, viewportWidth, viewportHeight);
    context.save();
    context.translate(viewportWidth / 2, viewportHeight / 2);
    context.scale(zoom, zoom);
    context.translate(-camera.x, -camera.y);
    context.drawImage(terrainCanvas, 0, 0);
    drawBase(context);
    const seconds = now / 1000;
    enemies.forEach((enemy) => drawEnemy(context, enemy, seconds));
    context.restore();

    if (intermissionTimer > 0 && gameState === "running") {
      context.fillStyle = "rgba(18, 24, 18, .77)";
      context.fillRect(viewportWidth / 2 - 84, 13, 168, 25);
      context.fillStyle = "#d7dfbd";
      context.font = "700 9px Segoe UI, sans-serif";
      context.textAlign = "center";
      context.fillText(`NEXT WAVE IN ${Math.max(1, Math.ceil(intermissionTimer))}`, viewportWidth / 2, 29);
    }
  }

  function animate(now) {
    const elapsed = lastFrameTime ? Math.min((now - lastFrameTime) / 1000, .05) : 0;
    lastFrameTime = now;
    updateSimulation(elapsed);
    drawBattlefield(now);
    frameHandle = window.requestAnimationFrame(animate);
  }

  function adjustZoom(nextZoom, anchorX = viewportWidth / 2, anchorY = viewportHeight / 2) {
    const beforeX = camera.x + (anchorX - viewportWidth / 2) / zoom;
    const beforeY = camera.y + (anchorY - viewportHeight / 2) / zoom;
    zoom = Math.max(.72, Math.min(1.7, nextZoom));
    camera.x = beforeX - (anchorX - viewportWidth / 2) / zoom;
    camera.y = beforeY - (anchorY - viewportHeight / 2) / zoom;
    clampCamera();
    updateCameraReadout();
  }

  function openSettings() {
    let resumeAfterSettings = false;
    if (gameState === "running") {
      resumeAfterSettings = true;
      pauseOperation();
    }
    settingsDialog.dataset.resumeAfterClose = String(resumeAfterSettings);
    if (typeof settingsDialog.showModal !== "function") {
      console.error("LAB-Z Frontline Defense could not open settings: this browser does not support HTML dialogs.");
      settingsSaved.textContent = "Settings are unavailable in this browser.";
      return;
    }
    settingsDialog.showModal();
  }

  function onKeyDown(event) {
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || ["BUTTON", "INPUT", "SELECT", "TEXTAREA"].includes(target.tagName))) return;
    const key = event.key.toLowerCase();
    if (key === "p" || key === "escape" || key === " ") {
      if (settingsDialog.open) return;
      if (gameState === "running") {
        event.preventDefault();
        pauseOperation();
      } else if (gameState === "paused") {
        event.preventDefault();
        resumeOperation();
      }
      return;
    }
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
      if (gameState === "running") {
        pressedKeys.add(key);
        if (key.startsWith("arrow")) event.preventDefault();
      }
    }
    if (key === "+" || key === "=") adjustZoom(zoom * 1.12);
    if (key === "-" || key === "_") adjustZoom(zoom / 1.12);
  }

  function onKeyUp(event) {
    pressedKeys.delete(event.key.toLowerCase());
  }

  modeButtons.forEach((button) => button.addEventListener("click", () => setSelectedMode(button.dataset.mode)));
  speedButtons.forEach((button) => button.addEventListener("click", () => setSpeed(Number(button.dataset.speed))));
  startButton.addEventListener("click", beginOperation);
  document.querySelector("#resume-button").addEventListener("click", resumeOperation);
  pauseButton.addEventListener("click", () => {
    if (gameState === "running") pauseOperation();
    else if (gameState === "paused") resumeOperation();
  });
  restartButton.addEventListener("click", beginOperation);
  document.querySelector("#pause-restart-button").addEventListener("click", beginOperation);
  document.querySelector("#pause-menu-button").addEventListener("click", returnToMenu);
  document.querySelector("#result-restart-button").addEventListener("click", beginOperation);
  document.querySelector("#result-menu-button").addEventListener("click", returnToMenu);
  settingsButton.addEventListener("click", openSettings);
  document.querySelector("#menu-settings-button").addEventListener("click", openSettings);

  defaultSpeed.value = String(settings.speed);
  terrainDetail.checked = settings.terrainDetail;
  setSpeed(settings.speed);
  recordValue.textContent = `Wave ${bestEndlessWave}`;
  drawTerrain(settings.terrainDetail);

  defaultSpeed.addEventListener("change", () => {
    const selectedSpeed = Number(defaultSpeed.value);
    if (!SPEEDS.includes(selectedSpeed)) {
      console.warn("LAB-Z Frontline Defense ignored an unsupported default simulation speed.");
      defaultSpeed.value = String(settings.speed);
      return;
    }
    settings.speed = selectedSpeed;
    saveSettings();
  });
  terrainDetail.addEventListener("change", () => {
    settings.terrainDetail = terrainDetail.checked;
    drawTerrain(settings.terrainDetail);
    saveSettings();
  });
  settingsDialog.addEventListener("close", () => {
    if (settingsDialog.dataset.resumeAfterClose === "true" && gameState === "paused") resumeOperation();
    delete settingsDialog.dataset.resumeAfterClose;
    settingsButton.focus({ preventScroll: true });
  });

  document.querySelector("#zoom-in-button").addEventListener("click", () => adjustZoom(zoom * 1.15));
  document.querySelector("#zoom-out-button").addEventListener("click", () => adjustZoom(zoom / 1.15));
  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || gameState === "ready" || gameState === "won" || gameState === "lost") return;
    pointerDrag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add("is-dragging");
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!pointerDrag || pointerDrag.id !== event.pointerId) return;
    camera.x -= (event.clientX - pointerDrag.x) / zoom;
    camera.y -= (event.clientY - pointerDrag.y) / zoom;
    pointerDrag.x = event.clientX;
    pointerDrag.y = event.clientY;
    clampCamera();
    updateCameraReadout();
  });
  const stopDragging = (event) => {
    if (!pointerDrag || pointerDrag.id !== event.pointerId) return;
    pointerDrag = null;
    canvas.classList.remove("is-dragging");
  };
  canvas.addEventListener("pointerup", stopDragging);
  canvas.addEventListener("pointercancel", stopDragging);
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    adjustZoom(zoom * (event.deltaY < 0 ? 1.08 : 1 / 1.08), event.clientX - rect.left, event.clientY - rect.top);
  }, { passive: false });

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", () => pressedKeys.clear());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && gameState === "running") pauseOperation();
  });
  window.addEventListener("resize", resizeCanvas);
  if ("ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);
  }

  setSelectedMode(selectedMode);
  updateHud();
  resizeCanvas();
  frameHandle = window.requestAnimationFrame(animate);

  window.addEventListener("pagehide", () => {
    if (frameHandle) window.cancelAnimationFrame(frameHandle);
  }, { once: true });
})();
