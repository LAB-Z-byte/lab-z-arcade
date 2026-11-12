(() => {
  "use strict";

  const WORLD = { width: 1800, height: 1000 };
  const BASE_HEALTH = 20;
  const CAMPAIGN_WAVES = 2;
  const STARTING_RESOURCES = 320;
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
  const TOWERS = {
    machineGun: { name: "Machine Gun", cost: 90, range: 178, damage: 15, reload: .34, projectileSpeed: 880, splash: 0, color: "#e1c581", role: "Rapid fire · infantry and scouts", targetsAir: false },
    heavyCannon: { name: "Heavy Cannon", cost: 155, range: 220, damage: 90, reload: 2.15, projectileSpeed: 420, splash: 48, color: "#e7a36f", role: "Armor-piercing · heavy ground units", targetsAir: false },
    rocketLauncher: { name: "Rocket Launcher", cost: 175, range: 248, damage: 56, reload: 1.35, projectileSpeed: 310, splash: 64, color: "#e48558", role: "Guided ground rockets · area blast", targetsAir: false },
    sniperTower: { name: "Sniper Tower", cost: 140, range: 332, damage: 130, reload: 2.25, projectileSpeed: 1150, splash: 0, color: "#d7dfbd", role: "Long range · elite and command targets", targetsAir: false },
    antiAircraft: { name: "Anti-Aircraft", cost: 125, range: 290, damage: 40, reload: .72, projectileSpeed: 760, splash: 0, color: "#91c5a1", role: "Aircraft defense · helicopters and drones", targetsAir: true },
    artillery: { name: "Artillery", cost: 250, range: 445, damage: 104, reload: 4.1, projectileSpeed: 250, splash: 94, color: "#f0ca78", role: "Very long range · heavy ground blast", targetsAir: false }
  };
  const ENEMIES = {
    infantry: { name: "Infantry", health: 100, speed: 72, armor: 0, reward: 28, baseDamage: 1, airborne: false, radius: 17 },
    scoutJeep: { name: "Scout Jeep", health: 108, speed: 133, armor: .08, reward: 36, baseDamage: 2, airborne: false, radius: 20 },
    apc: { name: "APC", health: 350, speed: 56, armor: .24, reward: 58, baseDamage: 2, airborne: false, radius: 23 },
    heavyTank: { name: "Heavy Tank", health: 580, speed: 39, armor: .4, reward: 84, baseDamage: 3, airborne: false, radius: 25 },
    rocketVehicle: { name: "Rocket Vehicle", health: 230, speed: 68, armor: .16, reward: 72, baseDamage: 2, airborne: false, radius: 24 },
    helicopter: { name: "Helicopter", health: 185, speed: 86, armor: .12, reward: 62, baseDamage: 2, airborne: true, radius: 22 },
    combatDrone: { name: "Combat Drone", health: 88, speed: 151, armor: .04, reward: 48, baseDamage: 1, airborne: true, radius: 15 },
    eliteSquad: { name: "Elite Squad", health: 205, speed: 78, armor: .16, reward: 54, baseDamage: 1, airborne: false, radius: 19 },
    boss: { name: "Command Tank", health: 2080, speed: 30, armor: .28, reward: 420, baseDamage: 4, airborne: false, radius: 43 }
  };

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
  const resourceValue = document.querySelector("#resource-value");
  const bossValue = document.querySelector("#boss-value");
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
  const buildGuidance = document.querySelector("#build-guidance");
  const towerInspector = document.querySelector("#tower-inspector");
  const towerOptionButtons = [...document.querySelectorAll(".tower-option[data-tower]")];
  const tutorialDialog = document.querySelector("#tutorial-dialog");
  const requiredElements = [
    canvas, context, startButton, phaseOverlay, overlayTitle, overlayCopy, startView,
    pauseView, resultView, gameStatus, baseValue, integrityBar, waveValue,
    threatValue, scoreValue, resourceValue, bossValue, recordValue, missionStatus, pauseButton, restartButton,
    settingsDialog, settingsButton, defaultSpeed, terrainDetail, settingsSaved,
    gridReadout, zoomValue, buildGuidance, towerInspector, tutorialDialog
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
  const enemySpawnQueue = [];
  const dustParticles = [];
  const towers = [];
  const projectiles = [];
  const combatEffects = [];
  const sceneryObstacles = [];
  const placementPreview = { x: 0, y: 0, type: "", angle: 0, flash: 0 };
  const camera = { x: WORLD.width / 2, y: WORLD.height / 2 };
  const pressedKeys = new Set();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let settings = readSettings();
  let selectedMode = "campaign";
  let gameState = "ready";
  let wave = 0;
  let wavesCompleted = 0;
  let baseHealth = BASE_HEALTH;
  let resources = STARTING_RESOURCES;
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
  let pointerWorld = null;
  let selectedTowerType = null;
  let selectedTower = null;
  let placementFeedback = "";
  let towerControlsDirty = true;
  let nextTowerId = 1;
  let nextEnemyId = 1;
  let tutorialResumeAfterClose = false;
  let bestEndlessWave = readRecord();
  let infantryDustTimer = 0;
  const infantryFrames = createInfantryFrames();
  const eliteFrames = createInfantryFrames(true);
  const enemySprites = createEnemySprites();

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

  function drawTerrainTexture(ctx, random) {
    const ground = ctx.createLinearGradient(0, 0, WORLD.width, WORLD.height);
    ground.addColorStop(0, "#59664a");
    ground.addColorStop(.48, "#505d43");
    ground.addColorStop(1, "#454f3b");
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    for (let patch = 0; patch < 85; patch += 1) {
      const x = random() * WORLD.width;
      const y = random() * WORLD.height;
      const width = 65 + random() * 210;
      const height = 28 + random() * 95;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((random() - .5) * .75);
      ctx.fillStyle = patch % 4 === 0
        ? "rgba(151, 139, 99, .11)"
        : patch % 3 === 0
          ? "rgba(35, 51, 37, .13)"
          : "rgba(184, 170, 116, .045)";
      ctx.beginPath();
      ctx.moveTo(-width * .53, -height * .08);
      ctx.bezierCurveTo(-width * .48, -height * .75, width * .26, -height * .72, width * .54, -height * .22);
      ctx.bezierCurveTo(width * .64, height * .38, width * .12, height * .68, -width * .35, height * .4);
      ctx.bezierCurveTo(-width * .62, height * .29, -width * .66, height * .03, -width * .53, -height * .08);
      ctx.fill();
      ctx.restore();
    }

    for (let mark = 0; mark < 2200; mark += 1) {
      const x = random() * WORLD.width;
      const y = random() * WORLD.height;
      const length = 2 + random() * 12;
      ctx.strokeStyle = mark % 4 === 0 ? "rgba(193, 184, 135, .12)" : "rgba(30, 43, 32, .13)";
      ctx.lineWidth = .55 + random() * .8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (random() - .5) * length, y + length * (random() - .5));
      ctx.stroke();
    }

    for (let tuft = 0; tuft < 820; tuft += 1) {
      const x = random() * WORLD.width;
      const y = random() * WORLD.height;
      const height = 3 + random() * 7;
      ctx.strokeStyle = tuft % 3 === 0 ? "rgba(172, 168, 119, .34)" : "rgba(38, 57, 39, .42)";
      ctx.lineWidth = .7 + random() * .45;
      for (let blade = 0; blade < 3; blade += 1) {
        const offset = (blade - 1) * 2;
        ctx.beginPath();
        ctx.moveTo(x + offset, y);
        ctx.quadraticCurveTo(x + offset - 1.5, y - height * .48, x + offset + (random() - .5) * 4, y - height);
        ctx.stroke();
      }
    }

    ctx.save();
    ctx.strokeStyle = "rgba(218, 210, 165, .09)";
    ctx.lineWidth = 1;
    for (let ridge = 0; ridge < 9; ridge += 1) {
      const baseY = 95 + ridge * 112;
      ctx.beginPath();
      ctx.moveTo(-25, baseY + Math.sin(ridge * 1.4) * 34);
      ctx.bezierCurveTo(
        360, baseY - 38 + Math.cos(ridge * 1.1) * 30,
        590, baseY + 45 - Math.sin(ridge) * 28,
        920, baseY + Math.cos(ridge * 1.7) * 39
      );
      ctx.bezierCurveTo(
        1250, baseY - 22 + Math.sin(ridge * .7) * 34,
        1500, baseY + 36 - Math.cos(ridge * 1.2) * 26,
        WORLD.width + 20, baseY + Math.sin(ridge * 1.9) * 44
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawTree(ctx, x, y, scale, variant) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.rotate(variant * .73);
    ctx.fillStyle = "rgba(19, 28, 21, .3)";
    ctx.beginPath();
    ctx.ellipse(4, 8, 24, 17, -.22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#554a35";
    ctx.fillRect(-3, -1, 7, 17);
    const canopy = ctx.createRadialGradient(-7, -8, 2, 0, 0, 25);
    canopy.addColorStop(0, variant % 3 === 0 ? "#858767" : variant % 3 === 1 ? "#78805b" : "#6f7a56");
    canopy.addColorStop(.48, variant % 2 ? "#4a5b40" : "#42543b");
    canopy.addColorStop(1, "#2c3d30");
    ctx.fillStyle = canopy;
    ctx.strokeStyle = "rgba(31, 43, 32, .76)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let point = 0; point < 12; point += 1) {
      const angle = point / 12 * Math.PI * 2;
      const radius = (15 + ((point * 7 + variant * 3) % 9)) * (point % 3 === 0 ? 1.08 : .92);
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius * .78;
      if (point === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(162, 166, 112, .27)";
    ctx.beginPath();
    ctx.ellipse(-5, -6, 11, 6, -.48, Math.PI, Math.PI * 1.82);
    ctx.fill();
    for (let branch = 0; branch < 5; branch += 1) {
      const angle = branch * Math.PI * 2 / 5 + variant * .17;
      const startX = Math.cos(angle) * 3;
      const startY = Math.sin(angle) * 2.5;
      const endX = Math.cos(angle) * (8 + branch % 2 * 3);
      const endY = Math.sin(angle) * (6 + branch % 2 * 2);
      ctx.strokeStyle = branch % 2 ? "rgba(177, 175, 125, .32)" : "rgba(36, 51, 37, .44)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(startX + 2, startY - 1, endX, endY);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(28, 43, 32, .48)";
    ctx.beginPath();
    ctx.ellipse(7, 7, 11, 5, .28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBush(ctx, x, y, scale, variant) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "rgba(18, 27, 20, .28)";
    ctx.beginPath();
    ctx.ellipse(3, 5, 23, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    const colors = ["#344835", "#3c5039", "#46563b"];
    for (let leaf = 0; leaf < 7; leaf += 1) {
      const angle = leaf * Math.PI * 2 / 7;
      const radius = leaf % 2 ? 8 : 13;
      const lx = Math.cos(angle) * radius;
      const ly = Math.sin(angle) * radius * .6;
      ctx.fillStyle = colors[(leaf + variant) % colors.length];
      ctx.beginPath();
      ctx.ellipse(lx, ly, 9, 6, angle, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(136, 151, 99, .28)";
      ctx.lineWidth = .8;
      ctx.beginPath();
      ctx.moveTo(lx - 3, ly);
      ctx.lineTo(lx + 3, ly - 1);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRock(ctx, x, y, scale, variant) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.rotate(variant * .61);
    ctx.fillStyle = "rgba(18, 24, 19, .31)";
    ctx.beginPath();
    ctx.ellipse(4, 8, 19, 10, .12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4d5044";
    ctx.strokeStyle = "rgba(31, 37, 31, .75)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-18, 2);
    ctx.lineTo(-12, -9);
    ctx.lineTo(-3, -12);
    ctx.lineTo(9, -8);
    ctx.lineTo(16, 1);
    ctx.lineTo(10, 9);
    ctx.lineTo(-9, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(170, 164, 133, .4)";
    ctx.beginPath();
    ctx.moveTo(-11, -7);
    ctx.lineTo(-2, -10);
    ctx.lineTo(3, -5);
    ctx.lineTo(-7, -3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(34, 39, 33, .45)";
    ctx.beginPath();
    ctx.moveTo(2, -4);
    ctx.lineTo(8, 3);
    ctx.lineTo(1, 8);
    ctx.stroke();
    ctx.restore();
  }

  function drawSandbags(ctx, x, y, count, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = "rgba(20, 26, 20, .35)";
    ctx.fillRect(-count * 8, 6, count * 16 + 4, 10);
    for (let bag = 0; bag < count; bag += 1) {
      const bx = -count * 8 + bag * 16;
      const gradient = ctx.createLinearGradient(bx, -6, bx, 8);
      gradient.addColorStop(0, "#a09269");
      gradient.addColorStop(.38, "#817956");
      gradient.addColorStop(1, "#5e6048");
      ctx.fillStyle = gradient;
      ctx.strokeStyle = "rgba(48, 49, 37, .78)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bx, -6, 16, 14, 4);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(205, 190, 143, .38)";
      ctx.beginPath();
      ctx.moveTo(bx + 3, -3);
      ctx.quadraticCurveTo(bx + 8, -5, bx + 13, -3);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawFence(ctx, points) {
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(23, 29, 22, .38)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    points.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(x + 2, y + 3);
      else ctx.lineTo(x + 2, y + 3);
    });
    ctx.stroke();
    ctx.strokeStyle = "#514c3b";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    points.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.strokeStyle = "rgba(174, 160, 119, .55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    points.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(x, y - 4);
      else ctx.lineTo(x, y - 4);
    });
    ctx.stroke();
    points.forEach(([x, y]) => {
      ctx.fillStyle = "#34372d";
      ctx.fillRect(x - 2, y - 8, 5, 13);
      ctx.fillStyle = "#8b8060";
      ctx.fillRect(x - 1, y - 8, 2, 3);
    });
    ctx.restore();
  }

  function drawOutpost(ctx, x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "rgba(18, 24, 19, .34)";
    ctx.fillRect(-47, -31, 98, 70);
    ctx.fillStyle = "#68634d";
    ctx.fillRect(-43, -35, 88, 63);
    ctx.fillStyle = "#8b8061";
    ctx.fillRect(-38, -30, 78, 53);
    ctx.strokeStyle = "rgba(35, 39, 31, .8)";
    ctx.lineWidth = 2;
    ctx.strokeRect(-38, -30, 78, 53);

    const roof = ctx.createLinearGradient(-34, -28, 34, 15);
    roof.addColorStop(0, "#69725a");
    roof.addColorStop(.5, "#4e5947");
    roof.addColorStop(1, "#3d493c");
    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.moveTo(-33, -24);
    ctx.lineTo(-11, -37);
    ctx.lineTo(34, -26);
    ctx.lineTo(34, 11);
    ctx.lineTo(-33, 11);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(24, 32, 27, .8)";
    ctx.stroke();
    ctx.strokeStyle = "rgba(169, 174, 132, .42)";
    ctx.lineWidth = 1;
    for (let line = -25; line < 33; line += 8) {
      ctx.beginPath();
      ctx.moveTo(line, -27);
      ctx.lineTo(line, 9);
      ctx.stroke();
    }
    ctx.fillStyle = "#313a30";
    ctx.fillRect(-7, -1, 13, 12);
    ctx.fillStyle = "rgba(186, 183, 142, .58)";
    ctx.fillRect(15, -16, 10, 7);
    ctx.restore();
  }

  function registerObstacle(x, y, radius) {
    sceneryObstacles.push({ x, y, radius });
  }

  function addStaticScenery(ctx, detailEnabled, random) {
    const trees = [
      [75, 105, 1.2], [151, 84, .93], [216, 112, 1.12], [88, 292, 1.05], [160, 325, 1.22],
      [388, 78, 1.16], [472, 112, .96], [580, 72, 1.24], [613, 322, 1.06], [507, 350, 1.18],
      [842, 72, 1.1], [940, 93, 1.28], [1053, 79, .98], [1292, 86, 1.23], [1408, 80, 1.05],
      [1515, 113, 1.22], [1675, 119, .98], [63, 615, 1.1], [172, 743, 1.25], [378, 699, 1.04],
      [536, 621, 1.24], [760, 737, 1.05], [1100, 739, 1.24], [1292, 729, 1.1], [1560, 717, 1.28],
      [1670, 606, 1.04],       [1360, 910, 1.12], [117, 900, 1.18], [614, 909, 1.08], [1100, 901, 1.14],
      [375, 270, 1.28], [432, 335, 1.08], [550, 274, 1.2], [635, 335, 1.15],
      [765, 285, 1.12], [818, 331, 1.27], [879, 286, 1.05], [1054, 277, 1.24],
      [1105, 335, 1.13], [786, 562, 1.2], [856, 590, 1.13], [1067, 574, 1.26],
      [108, 559, 1.23], [183, 593, 1.1], [244, 626, 1.16], [481, 783, 1.18],
      [565, 744, 1.04], [752, 764, 1.2], [1289, 382, 1.19], [1375, 471, 1.28],
      [1461, 567, 1.08], [1573, 612, 1.24], [1650, 694, 1.12], [1519, 751, 1.2]
    ];
    trees.forEach(([x, y, scale], index) => {
      drawTree(ctx, x, y, scale, index);
      registerObstacle(x, y, 25 * scale + 12);
    });

    const bushes = [
      [248, 97], [430, 135], [604, 102], [846, 118], [1088, 96], [1464, 139], [1624, 94],
      [120, 378], [467, 367], [617, 621], [850, 700], [1223, 728], [1518, 680], [1711, 703],
      [250, 713], [670, 892], [1205, 920], [1570, 893],
      [345, 297], [480, 314], [590, 295], [735, 335], [835, 272], [920, 323],
      [1010, 287], [1127, 383], [789, 533], [888, 590], [1037, 599], [118, 626],
      [202, 680], [415, 777], [645, 735], [1304, 431], [1428, 526], [1513, 563],
      [1634, 644], [1612, 767]
    ];
    bushes.forEach(([x, y], index) => {
      const scale = .75 + index % 3 * .13;
      drawBush(ctx, x, y, scale, index);
      registerObstacle(x, y, 19 * scale + 10);
    });

    const rocks = [
      [113, 294], [195, 384], [385, 326], [552, 153], [619, 493], [844, 330],
      [1010, 91], [1102, 346], [1317, 246], [1486, 417], [1620, 508], [121, 841],
      [471, 760], [765, 895], [1315, 842], [1683, 940], [975, 697], [348, 556]
    ];
    rocks.forEach(([x, y], index) => {
      const scale = .66 + index % 3 * .18;
      drawRock(ctx, x, y, scale, index);
      registerObstacle(x, y, 18 * scale + 9);
    });

    if (detailEnabled) {
      const fences = [
        [[71, 486], [121, 486], [171, 486], [221, 486]],
        [[374, 84], [424, 84], [474, 84], [524, 84]],
        [[1346, 530], [1396, 530], [1446, 530]]
      ];
      fences.forEach((points) => {
        drawFence(ctx, points);
        points.forEach(([x, y]) => registerObstacle(x, y, 15));
      });
      drawSandbags(ctx, 527, 304, 5, -.08);
      drawSandbags(ctx, 1066, 315, 4, .14);
      drawSandbags(ctx, 1324, 853, 5, -.05);
      drawOutpost(ctx, 1540, 444, .9);
      drawOutpost(ctx, 353, 820, .7);
      registerObstacle(527, 304, 51);
      registerObstacle(1066, 315, 43);
      registerObstacle(1324, 853, 51);
      registerObstacle(1540, 444, 54);
      registerObstacle(353, 820, 48);

      for (let index = 0; index < 34; index += 1) {
        const x = 38 + random() * (WORLD.width - 76);
        const y = 42 + random() * (WORLD.height - 84);
        const width = 12 + random() * 23;
        const height = 4 + random() * 8;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((random() - .5) * 1.3);
        ctx.fillStyle = "rgba(18, 25, 20, .3)";
        ctx.fillRect(-width / 2 + 2, 3, width, height);
        ctx.fillStyle = random() > .5 ? "#48533f" : "#585641";
        ctx.fillRect(-width / 2, 0, width, height);
        ctx.fillStyle = "rgba(170, 169, 132, .38)";
        ctx.fillRect(-width / 2, 0, width, 1);
        ctx.restore();
        registerObstacle(x, y, Math.hypot(width, height) / 2 + 8);
      }
    }
  }

  function createInfantryFrames(elite = false) {
    const frames = [];
    for (let frame = 0; frame < 4; frame += 1) {
      const sprite = document.createElement("canvas");
      sprite.width = 48;
      sprite.height = 64;
      const ctx = sprite.getContext("2d");
      if (!ctx) {
        console.error("LAB-Z Frontline Defense could not create the cached infantry sprites.");
        return [];
      }

      const stride = [-2.4, -.7, 2.4, .7][frame];
      ctx.fillStyle = "rgba(17, 22, 18, .42)";
      ctx.beginPath();
      ctx.ellipse(26, 35, 10, 17, .18, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#292f29";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(20, 36);
      ctx.lineTo(18 + stride, 48);
      ctx.lineTo(16 + stride, 53);
      ctx.moveTo(27, 36);
      ctx.lineTo(28 - stride, 48);
      ctx.lineTo(31 - stride, 53);
      ctx.stroke();

      ctx.strokeStyle = "#8a8266";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(15 + stride, 53);
      ctx.lineTo(19 + stride, 54);
      ctx.moveTo(30 - stride, 53);
      ctx.lineTo(34 - stride, 54);
      ctx.stroke();

      ctx.strokeStyle = "#58644c";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(18, 27);
      ctx.lineTo(11 - stride * .3, 35);
      ctx.moveTo(29, 27);
      ctx.lineTo(34 + stride * .3, 35);
      ctx.stroke();
      ctx.strokeStyle = "#b0a47d";
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(17, 27);
      ctx.lineTo(12 - stride * .3, 33);
      ctx.moveTo(29, 27);
      ctx.lineTo(33 + stride * .3, 33);
      ctx.stroke();

      const uniform = ctx.createLinearGradient(15, 20, 31, 40);
      uniform.addColorStop(0, "#89906d");
      uniform.addColorStop(.42, "#677254");
      uniform.addColorStop(1, "#414d3e");
      ctx.fillStyle = uniform;
      ctx.strokeStyle = "#30392f";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(18, 20);
      ctx.lineTo(25, 17);
      ctx.lineTo(31, 21);
      ctx.lineTo(30, 36);
      ctx.lineTo(25, 41);
      ctx.lineTo(17, 37);
      ctx.lineTo(15, 26);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "rgba(193, 184, 142, .55)";
      ctx.fillRect(20, 22, 2, 10);
      ctx.fillStyle = "#424c3c";
      ctx.fillRect(25, 24, 4, 5);
      ctx.strokeStyle = "#343c30";
      ctx.lineWidth = 1;
      ctx.strokeRect(25, 24, 4, 5);

      ctx.fillStyle = "#59634b";
      ctx.beginPath();
      ctx.ellipse(23, 15, 6.2, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#76805a";
      ctx.beginPath();
      ctx.ellipse(22, 12, 6.6, 4.1, -.06, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#303a2f";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = "#b49a72";
      ctx.fillRect(19, 15, 7, 2);

      ctx.save();
      ctx.translate(31, 30);
      ctx.rotate(-.16);
      ctx.fillStyle = "#282f2a";
      ctx.fillRect(-1.6, -12, 3.2, 20);
      ctx.fillStyle = "#59604c";
      ctx.fillRect(-2.8, -6, 5.6, 7);
      ctx.fillStyle = "#9c9978";
      ctx.fillRect(-.65, -12, 1.1, 11);
      ctx.fillStyle = "#242b27";
      ctx.fillRect(-1, -17, 2, 5);
      ctx.restore();

      ctx.fillStyle = "rgba(195, 188, 144, .45)";
      ctx.fillRect(13, 36, 3, 5);
      ctx.fillRect(31, 36, 3, 5);
      if (elite) {
        ctx.fillStyle = "#b17b51";
        ctx.fillRect(16, 23, 3, 8);
        ctx.fillRect(29, 23, 3, 8);
        ctx.fillStyle = "#9ca17c";
        ctx.fillRect(20, 32, 8, 3);
      }
      frames.push(sprite);
    }
    return frames;
  }

  function createEnemySprites() {
    const sprites = Object.create(null);
    const vehicleTypes = Object.keys(ENEMIES).filter((type) => type !== "infantry" && type !== "eliteSquad");
    for (const type of vehicleTypes) {
      const boss = type === "boss";
      const size = boss ? 104 : 72;
      const sprite = document.createElement("canvas");
      sprite.width = size;
      sprite.height = size;
      const ctx = sprite.getContext("2d");
      if (!ctx) {
        console.error("LAB-Z Frontline Defense could not cache the enemy vehicle artwork.");
        return sprites;
      }
      const scale = boss ? 1.28 : 1;
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.scale(scale, scale);
      ctx.fillStyle = "rgba(14, 19, 16, .42)";
      ctx.beginPath();
      ctx.ellipse(4, 7, type === "helicopter" ? 22 : 25, type === "helicopter" ? 17 : 28, -.08, 0, Math.PI * 2);
      ctx.fill();

      const hull = type === "scoutJeep" || type === "combatDrone" ? "#62664c" : "#505b46";
      const highlight = type === "boss" ? "#b89464" : "#969477";
      ctx.strokeStyle = "#292f29";
      ctx.lineWidth = 2;

      if (type === "helicopter") {
        ctx.fillStyle = "#414c40";
        ctx.beginPath();
        ctx.ellipse(0, 0, 10, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#8b8968";
        ctx.beginPath();
        ctx.ellipse(-1, -8, 7, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#353e36";
        ctx.fillRect(-2, 15, 4, 17);
        ctx.fillRect(-10, 29, 20, 3);
        ctx.fillStyle = "#b4b08a";
        ctx.fillRect(-2, -19, 4, 39);
        ctx.fillRect(-18, -1, 36, 3);
        ctx.fillStyle = "#252d29";
        ctx.fillRect(-15, -3, 30, 2);
        ctx.fillRect(-3, -18, 2, 35);
        ctx.fillStyle = "#a4936e";
        ctx.fillRect(8, 4, 4, 8);
      } else if (type === "combatDrone") {
        ctx.fillStyle = "#414b40";
        ctx.beginPath();
        ctx.moveTo(-9, -10);
        ctx.lineTo(-2, -15);
        ctx.lineTo(9, -10);
        ctx.lineTo(13, -2);
        ctx.lineTo(7, 9);
        ctx.lineTo(-8, 9);
        ctx.lineTo(-13, 1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = "#b0aa7d";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-7, -7);
        ctx.lineTo(-22, -19);
        ctx.moveTo(7, -7);
        ctx.lineTo(22, -19);
        ctx.moveTo(-7, 7);
        ctx.lineTo(-22, 19);
        ctx.moveTo(7, 7);
        ctx.lineTo(22, 19);
        ctx.stroke();
        ctx.fillStyle = "#252d28";
        [[-22, -19], [22, -19], [-22, 19], [22, 19]].forEach(([x, y]) => {
          ctx.beginPath();
          ctx.ellipse(x, y, 7, 2, .15, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.fillStyle = "#c17b57";
        ctx.fillRect(-3, -2, 6, 5);
      } else if (type === "scoutJeep" || type === "rocketVehicle") {
        ctx.fillStyle = "#303731";
        ctx.fillRect(-20, -19, 7, 37);
        ctx.fillRect(13, -19, 7, 37);
        for (let wheel = -1; wheel <= 1; wheel += 1) {
          const wheelY = wheel * 13 - 3;
          ctx.fillStyle = "#202721";
          ctx.beginPath();
          ctx.roundRect(-23, wheelY - 4, 10, 8, 3);
          ctx.roundRect(13, wheelY - 4, 10, 8, 3);
          ctx.fill();
          ctx.fillStyle = "#8b8666";
          ctx.fillRect(-20, wheelY - 1, 5, 2);
          ctx.fillRect(15, wheelY - 1, 5, 2);
        }
        ctx.fillStyle = hull;
        ctx.beginPath();
        ctx.moveTo(-13, -22);
        ctx.lineTo(13, -22);
        ctx.lineTo(17, -14);
        ctx.lineTo(15, 17);
        ctx.lineTo(9, 23);
        ctx.lineTo(-12, 21);
        ctx.lineTo(-17, 15);
        ctx.lineTo(-17, -14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        if (type === "scoutJeep") {
          ctx.fillStyle = "#85856a";
          ctx.fillRect(-10, -16, 20, 8);
          ctx.fillStyle = "#333d34";
          ctx.fillRect(-8, -14, 7, 5);
          ctx.fillRect(2, -14, 6, 5);
          ctx.fillStyle = "#b0aa7d";
          ctx.fillRect(-12, 1, 24, 2);
          ctx.fillStyle = "#d5b16b";
          ctx.fillRect(-12, -22, 4, 3);
          ctx.fillRect(8, -22, 4, 3);
          ctx.fillStyle = "#454c3c";
          ctx.fillRect(-2, -4, 4, 14);
          ctx.fillRect(-1, -13, 2, 9);
        } else {
          ctx.fillStyle = "#424b3d";
          ctx.fillRect(-11, 0, 22, 16);
          ctx.strokeRect(-11, 0, 22, 16);
          for (let rocket = -1; rocket <= 1; rocket += 1) {
            ctx.fillStyle = "#b7a577";
            ctx.fillRect(-8, rocket * 7 + 4, 16, 3);
            ctx.fillStyle = "#31382e";
            ctx.fillRect(6, rocket * 7 + 4, 4, 3);
          }
          ctx.fillStyle = "#c17b57";
          ctx.fillRect(-9, 18, 5, 3);
          ctx.fillRect(4, 18, 5, 3);
        }
      } else {
        ctx.fillStyle = "#343a33";
        ctx.fillRect(-22, -23, 8, 46);
        ctx.fillRect(14, -23, 8, 46);
        for (let wheel = -2; wheel <= 2; wheel += 1) {
          const wheelY = wheel * 9 - 3;
          ctx.fillStyle = "#252b27";
          ctx.beginPath();
          ctx.arc(-18, wheelY, 3.2, 0, Math.PI * 2);
          ctx.arc(18, wheelY, 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#938c6c";
          ctx.beginPath();
          ctx.arc(-18, wheelY, 1.2, 0, Math.PI * 2);
          ctx.arc(18, wheelY, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = hull;
        ctx.beginPath();
        ctx.moveTo(-14, -24);
        ctx.lineTo(11, -23);
        ctx.lineTo(15, -13);
        ctx.lineTo(14, 19);
        ctx.lineTo(7, 25);
        ctx.lineTo(-10, 23);
        ctx.lineTo(-15, 14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "rgba(202, 195, 151, .35)";
        ctx.fillRect(-9, -17, 18, 3);
        ctx.fillRect(-11, 14, 22, 2);
        if (type === "apc") {
          ctx.fillStyle = "#74765b";
          ctx.fillRect(-9, -12, 18, 23);
          ctx.strokeRect(-9, -12, 18, 23);
          ctx.fillStyle = "#9d9873";
          ctx.fillRect(-6, -8, 12, 3);
          ctx.fillRect(-6, -2, 12, 3);
          ctx.fillRect(-6, 4, 12, 3);
          ctx.fillStyle = "#353d34";
          ctx.beginPath();
          ctx.arc(0, -14, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#bab38a";
          ctx.fillRect(-2, -24, 4, 12);
          ctx.fillRect(-1, -25, 2, 4);
        } else if (type === "heavyTank" || boss) {
          ctx.fillStyle = boss ? "#857554" : "#6b7056";
          ctx.beginPath();
          ctx.roundRect(-11, -19, 22, 32, 5);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = highlight;
          ctx.beginPath();
          ctx.ellipse(0, -5, boss ? 12 : 9, boss ? 14 : 11, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#b8aa7d";
          ctx.fillRect(-3, -32, 6, 23);
          ctx.fillStyle = "#303830";
          ctx.fillRect(-4, -33, 8, 4);
          ctx.fillStyle = boss ? "#d2a05f" : "#97916b";
          ctx.fillRect(-12, -16, 4, 5);
          ctx.fillRect(8, -16, 4, 5);
          ctx.fillStyle = boss ? "#b9654d" : "#a8a27a";
          ctx.fillRect(-5, 2, 10, 3);
          if (boss) {
            ctx.strokeStyle = "#d6a461";
            ctx.lineWidth = 2;
            ctx.strokeRect(-21, -22, 42, 44);
            ctx.fillStyle = "#c16b51";
            ctx.fillRect(-4, 13, 8, 3);
          }
        } else {
          ctx.fillStyle = "#77785c";
          ctx.fillRect(-10, -12, 20, 26);
          ctx.strokeRect(-10, -12, 20, 26);
          ctx.fillStyle = "#343c33";
          ctx.fillRect(-7, -9, 14, 4);
          ctx.fillRect(-7, -2, 14, 4);
          ctx.fillRect(-7, 5, 14, 4);
          ctx.fillStyle = "#b4a577";
          ctx.fillRect(-4, -21, 8, 11);
          ctx.fillRect(-2, -26, 4, 8);
        }
      }

      ctx.fillStyle = highlight;
      ctx.globalAlpha = .65;
      ctx.fillRect(-9, size * .29, 5, 2);
      ctx.fillRect(5, size * .29, 5, 2);
      ctx.restore();
      sprites[type] = sprite;
    }
    return sprites;
  }

  function drawTerrain(detailEnabled) {
    const ctx = terrainContext;
    const random = makeRandom(70831);
    sceneryObstacles.length = 0;
    ctx.clearRect(0, 0, WORLD.width, WORLD.height);
    drawTerrainTexture(ctx, random);
    drawRoad(ctx, random);
    addStaticScenery(ctx, detailEnabled, random);
    drawLocation(ctx, 210, 672, "NORTH RIDGE");
    drawLocation(ctx, 1390, 345, "EAST APPROACH");
    drawLocation(ctx, 1450, 930, "FORWARD BASE · 07");
    ctx.strokeStyle = "rgba(232, 234, 213, .15)";
    ctx.lineWidth = 1;
    ctx.strokeRect(12, 12, WORLD.width - 24, WORLD.height - 24);
  }

  function traceRoad(ctx) {
    ctx.beginPath();
    ctx.moveTo(ROUTE[0].x, ROUTE[0].y);
    for (let index = 1; index < ROUTE.length - 1; index += 1) {
      const previous = ROUTE[index - 1];
      const corner = ROUTE[index];
      const next = ROUTE[index + 1];
      const incomingLength = Math.hypot(previous.x - corner.x, previous.y - corner.y);
      const outgoingLength = Math.hypot(next.x - corner.x, next.y - corner.y);
      const radius = Math.min(42, incomingLength * .22, outgoingLength * .22);
      const incoming = {
        x: corner.x + (previous.x - corner.x) / incomingLength * radius,
        y: corner.y + (previous.y - corner.y) / incomingLength * radius
      };
      const outgoing = {
        x: corner.x + (next.x - corner.x) / outgoingLength * radius,
        y: corner.y + (next.y - corner.y) / outgoingLength * radius
      };
      ctx.lineTo(incoming.x, incoming.y);
      ctx.quadraticCurveTo(corner.x, corner.y, outgoing.x, outgoing.y);
    }
    const end = ROUTE[ROUTE.length - 1];
    ctx.lineTo(end.x, end.y);
  }

  function drawRoad(ctx, random) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    traceRoad(ctx);
    ctx.strokeStyle = "rgba(24, 28, 22, .58)";
    ctx.lineWidth = 104;
    ctx.shadowColor = "rgba(17, 22, 18, .52)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 7;
    ctx.stroke();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = "#988b69";
    ctx.lineWidth = 92;
    ctx.stroke();
    const dirt = ctx.createLinearGradient(0, 140, WORLD.width, WORLD.height);
    dirt.addColorStop(0, "#85785b");
    dirt.addColorStop(.47, "#75694f");
    dirt.addColorStop(1, "#685f49");
    ctx.strokeStyle = dirt;
    ctx.lineWidth = 80;
    ctx.stroke();

    for (let segment = 0; segment < ROUTE.length - 1; segment += 1) {
      const start = ROUTE[segment];
      const end = ROUTE[segment + 1];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy);
      const steps = Math.floor(length / 16);
      for (let mark = 0; mark < steps; mark += 1) {
        const progress = (mark + random()) / steps;
        const side = random() > .5 ? 1 : -1;
        const offset = side * (8 + random() * 27);
        const x = start.x + dx * progress - dy / length * offset;
        const y = start.y + dy * progress + dx / length * offset;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.atan2(dy, dx) + (random() - .5) * .6);
        ctx.fillStyle = random() > .55 ? "rgba(48, 47, 38, .35)" : "rgba(190, 169, 126, .29)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 1 + random() * 3.5, .7 + random() * 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
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

  function updateTowerControls() {
    towerOptionButtons.forEach((button) => {
      const selected = button.dataset.tower === selectedTowerType;
      const tower = TOWERS[button.dataset.tower];
      button.classList.toggle("is-selected", selected);
      button.classList.toggle("cannot-afford", resources < tower.cost);
      button.setAttribute("aria-pressed", String(selected));
      button.setAttribute("aria-label", `${tower.name}, ${tower.cost} credits${resources < tower.cost ? ", not currently affordable" : ""}`);
    });

    if (selectedTower) {
      const stats = TOWERS[selectedTower.type];
      towerInspector.hidden = false;
      const airNote = selectedTower.type === "antiAircraft" ? "<span>Air defense: helicopters and drones only</span>" : "";
      towerInspector.innerHTML = `<strong>${stats.name} · FIELD UNIT ${String(selectedTower.id).padStart(2, "0")}</strong><span>${stats.role}</span><span>Damage ${stats.damage}</span><span>Range ${stats.range}</span><span>${(1 / stats.reload).toFixed(2)} shots/sec</span><span>Standard issue · no upgrades</span>${airNote}`;
      buildGuidance.textContent = `${stats.name} selected. Its range is outlined; choose another emplacement to build or tap clear ground to deselect.`;
    } else {
      towerInspector.hidden = true;
      towerInspector.textContent = "";
    }

    if (selectedTowerType) {
      const stats = TOWERS[selectedTowerType];
      const available = resources >= stats.cost;
      buildGuidance.textContent = placementFeedback || (gameState !== "running"
        ? `${stats.name} · ${stats.cost} credits · range ${stats.range}. ${gameState === "ready" ? "Begin" : gameState === "paused" ? "Resume" : "Restart"} an operation to place it.`
        : available
          ? `${stats.name} · ${stats.cost} credits · range ${stats.range}. Click or tap clear terrain to deploy.`
          : `${stats.name} costs ${stats.cost} credits; you have ${resources}. Defeat infantry or complete a wave to earn more.`);
    } else if (!selectedTower) {
      buildGuidance.textContent = gameState === "running"
        ? "Select an emplacement, then click or tap clear terrain. Towers target the furthest-along compatible contact."
        : gameState === "ready"
          ? "Deployments are available during an operation. Select an emplacement, then click or tap clear terrain."
          : gameState === "paused"
            ? "Operation paused. Resume to build or inspect emplacements."
            : "Operation complete. Restart to deploy more emplacements.";
    }
    towerControlsDirty = false;
  }

  function updateHud() {
    baseValue.textContent = `${baseHealth} / ${BASE_HEALTH}`;
    const integrity = Math.max(0, baseHealth / BASE_HEALTH * 100);
    integrityBar.style.width = `${integrity}%`;
    integrityBar.classList.toggle("is-critical", baseHealth <= 6);
    waveValue.textContent = wave ? `${String(wave).padStart(2, "0")}${selectedMode === "campaign" ? ` / ${CAMPAIGN_WAVES}` : ""}` : "—";
    threatValue.textContent = String(enemies.length + enemiesToSpawn);
    scoreValue.textContent = String(score);
    resourceValue.textContent = String(resources);
    const activeBoss = enemies.find((enemy) => enemy.type === "boss" && enemy.health > 0);
    bossValue.textContent = activeBoss
      ? `${Math.ceil(activeBoss.health / activeBoss.maxHealth * 100)}%`
      : enemiesToSpawn && enemySpawnQueue.includes("boss")
        ? "Inbound"
        : "None";
    bossValue.classList.toggle("boss-contact", Boolean(activeBoss) || bossValue.textContent === "Inbound");
    recordValue.textContent = `Wave ${bestEndlessWave}`;
    pauseButton.disabled = gameState !== "running" && gameState !== "paused";
    pauseButton.innerHTML = gameState === "paused" ? '<span aria-hidden="true">▶</span> Resume' : '<span aria-hidden="true">Ⅱ</span> Pause';
    restartButton.disabled = gameState === "ready";
    updateCameraReadout();
    if (towerControlsDirty) updateTowerControls();
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
      ? '<span class="brief-label">MISSION BRIEF</span><p>Build a perimeter with 320 starting credits. Earn rewards from infantry and waves; keep the base standing through two attacks.</p>'
      : `<span class="brief-label">SURVIVAL BRIEF · LOCAL RECORD: WAVE ${bestEndlessWave}</span><p>Build with 320 starting credits. Endless waves grow stronger; earn rewards and defend the base for as long as possible.</p>`;
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

  function getWaveComposition(nextWave) {
    if (selectedMode === "campaign") {
      if (nextWave === 1) return ["infantry", "infantry", "infantry", "infantry", "infantry", "infantry"];
      return ["infantry", "scoutJeep", "infantry", "eliteSquad", "scoutJeep", "apc", "heavyTank", "rocketVehicle", "helicopter", "combatDrone", "boss"];
    }

    if (nextWave === 1) return ["infantry", "infantry", "infantry", "infantry", "infantry", "infantry"];
    if (nextWave === 2) return ["infantry", "infantry", "scoutJeep", "infantry", "combatDrone", "scoutJeep", "combatDrone", "eliteSquad"];
    if (nextWave === 3) return ["scoutJeep", "infantry", "apc", "infantry", "helicopter", "rocketVehicle", "combatDrone", "eliteSquad", "apc"];

    const composition = ["infantry", "scoutJeep", "apc", "rocketVehicle", "eliteSquad"];
    for (let index = 0; index < Math.min(2 + Math.floor(nextWave / 3), 9); index += 1) {
      composition.push(index % 3 === 0 ? "heavyTank" : "apc");
      if (index % 2 === 0) composition.push("helicopter");
      composition.push("combatDrone", "infantry");
    }
    if (nextWave % 5 === 0) composition.push("boss");
    return composition;
  }

  function startWave(nextWave) {
    wave = nextWave;
    enemySpawnQueue.length = 0;
    enemySpawnQueue.push(...getWaveComposition(wave));
    enemiesToSpawn = enemySpawnQueue.length;
    spawnTimer = 0.35;
    intermissionTimer = 0;
    const bossInWave = enemySpawnQueue.includes("boss");
    announce(`${selectedMode === "campaign" ? "Campaign" : "Endless"} wave ${wave} in progress. ${enemiesToSpawn} contacts approaching.${bossInWave ? " Command Tank signature detected." : ""}`);
    updateHud();
  }

  function beginOperation() {
    enemies.length = 0;
    towers.length = 0;
    projectiles.length = 0;
    enemySpawnQueue.length = 0;
    combatEffects.length = 0;
    dustParticles.length = 0;
    selectedTowerType = null;
    selectedTower = null;
    placementFeedback = "";
    nextTowerId = 1;
    nextEnemyId = 1;
    baseHealth = BASE_HEALTH;
    resources = STARTING_RESOURCES;
    wave = 0;
    wavesCompleted = 0;
    score = 0;
    spawnTimer = 0;
    intermissionTimer = 0;
    gameState = "running";
    towerControlsDirty = true;
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
    towerControlsDirty = true;
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
    towerControlsDirty = true;
    hideOverlay();
    announce("Operation resumed.");
    updateHud();
    canvas.focus({ preventScroll: true });
  }

  function returnToMenu() {
    gameState = "ready";
    towerControlsDirty = true;
    enemies.length = 0;
    towers.length = 0;
    projectiles.length = 0;
    combatEffects.length = 0;
    dustParticles.length = 0;
    enemiesToSpawn = 0;
    enemySpawnQueue.length = 0;
    baseHealth = BASE_HEALTH;
    resources = STARTING_RESOURCES;
    selectedTowerType = null;
    selectedTower = null;
    placementFeedback = "";
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

  function finishOperation(success, priorityContactLost = false) {
    gameState = success ? "won" : "lost";
    towerControlsDirty = true;
    if (selectedMode === "endless") saveRecord(wavesCompleted);
    const headline = success ? "Campaign exercise complete." : "Base integrity lost.";
    missionStatus.textContent = success ? "Mission complete" : "Perimeter overrun";
    overlayTitle.innerHTML = success ? 'Sector <span>secured.</span>' : 'Line <span>overrun.</span>';
    overlayCopy.textContent = success
      ? "The Green Valley perimeter held through the full campaign exercise."
      : priorityContactLost
        ? "The Command Tank caused the terminal breach. The operation has ended."
        : "Hostile forces breached the perimeter. The operation has ended.";
    document.querySelector("#result-copy").textContent = selectedMode === "campaign"
      ? success
        ? `${headline} Your emplacements held through the full campaign exercise.`
        : `${headline} ${priorityContactLost ? "The Command Tank" : "Enemy forces"} overwhelmed the forward base.`
      : `${headline} Your best endless result is wave ${bestEndlessWave}.`;
    document.querySelector("#result-waves").textContent = String(wavesCompleted);
    document.querySelector("#result-integrity").textContent = `${baseHealth} / ${BASE_HEALTH}`;
    document.querySelector("#result-score").textContent = String(score);
    document.querySelector("#result-stamp").textContent = priorityContactLost
      ? "PRIORITY CONTACT LOST"
      : success
        ? "AFTER ACTION REPORT · SECTOR HELD"
        : "AFTER ACTION REPORT · SECTOR LOST";
    showOverlay("result");
    announce(`${headline} ${wavesCompleted} waves completed. Base integrity ${baseHealth} of ${BASE_HEALTH}.`);
    updateHud();
    document.querySelector("#result-restart-button").focus({ preventScroll: true });
  }

  function spawnEnemy() {
    const type = enemySpawnQueue.shift() || "infantry";
    const stats = ENEMIES[type];
    const healthScale = 1 + Math.min(wave - 1, 20) * .085;
    const enemy = {
      id: nextEnemyId,
      type,
      name: stats.name,
      x: ROUTE[0].x,
      y: ROUTE[0].y,
      routeIndex: 1,
      progress: 0,
      health: Math.round(stats.health * healthScale),
      maxHealth: Math.round(stats.health * healthScale),
      speed: stats.speed + Math.min(wave - 1, 12) * 1.3,
      armor: stats.armor,
      reward: stats.reward,
      baseDamage: stats.baseDamage,
      airborne: stats.airborne,
      radius: stats.radius,
      phase: Math.random() * Math.PI * 2,
      dustTimer: Math.random() * .16,
      hitFlash: 0,
      attackCooldown: type === "rocketVehicle" ? 1.8 : type === "boss" ? 6.5 : 0,
      attackWindup: 0,
      attackTarget: null,
      attackTargetType: "",
      attackX: 0,
      attackY: 0,
      boostCooldown: type === "scoutJeep" ? 2.8 : 0,
      boostTime: 0,
      regenDelay: 0,
      rewarded: false
    };
    enemies.push(enemy);
    nextEnemyId += 1;
    if (type === "boss") {
      announce(`Priority contact: Command Tank entering the route in wave ${wave}. Watch for its marked ground strike.`);
    }
    return enemy;
  }

  function emitDust(enemy) {
    const target = ROUTE[Math.min(enemy.routeIndex, ROUTE.length - 1)];
    const distance = Math.hypot(target.x - enemy.x, target.y - enemy.y) || 1;
    if (dustParticles.length >= 70) dustParticles.shift();
    dustParticles.push({
      x: enemy.x - (target.x - enemy.x) / distance * 9,
      y: enemy.y - (target.y - enemy.y) / distance * 9,
      vx: (Math.random() - .5) * 8,
      vy: -5 - Math.random() * 7,
      age: 0,
      life: .42 + Math.random() * .28,
      size: 2 + Math.random() * 2.5
    });
  }

  function distanceToSegment(x, y, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    const progress = lengthSquared ? Math.max(0, Math.min(1, ((x - start.x) * dx + (y - start.y) * dy) / lengthSquared)) : 0;
    return Math.hypot(x - (start.x + dx * progress), y - (start.y + dy * progress));
  }

  function validateTowerPlacement(type, x, y) {
    const stats = TOWERS[type];
    if (!stats || x < 42 || y < 42 || x > WORLD.width - 42 || y > WORLD.height - 42) {
      return { valid: false, reason: "outside the battlefield" };
    }
    if (resources < stats.cost) return { valid: false, reason: `requires ${stats.cost} credits` };
    for (let index = 0; index < ROUTE.length - 1; index += 1) {
      if (distanceToSegment(x, y, ROUTE[index], ROUTE[index + 1]) < 62) {
        return { valid: false, reason: "enemy road and path are reserved" };
      }
    }
    for (const obstacle of sceneryObstacles) {
      if (Math.hypot(x - obstacle.x, y - obstacle.y) < obstacle.radius + 22) {
        return { valid: false, reason: "blocked by battlefield scenery" };
      }
    }
    for (const tower of towers) {
      if (Math.hypot(x - tower.x, y - tower.y) < 48) {
        return { valid: false, reason: "too close to another emplacement" };
      }
    }
    return { valid: true, reason: "clear terrain" };
  }

  function addCombatEffect(x, y, radius, color, duration = .42) {
    if (combatEffects.length >= 100) combatEffects.shift();
    combatEffects.push({ x, y, radius, color, age: 0, life: duration });
  }

  function defeatEnemy(enemy, x, y) {
    if (enemy.rewarded) return;
    enemy.rewarded = true;
    resources += enemy.reward;
    towerControlsDirty = true;
    score += 30 + enemy.reward;
    addCombatEffect(x, y, enemy.type === "boss" ? 65 : 22, enemy.type === "boss" ? "#e5aa66" : "#d5c396", .48);
    if (enemy.type === "boss") announce(`Command Tank destroyed. ${enemy.reward} credits recovered.`);
    if (enemy.type === "rocketVehicle") announce(`Rocket Vehicle destroyed before it could launch. ${enemy.reward} credits recovered.`);
  }

  function damageTower(tower, amount) {
    if (tower.destroyed) return;
    tower.health = Math.max(0, tower.health - amount);
    tower.hitFlash = .18;
    if (tower.health > 0) return;
    tower.destroyed = true;
    addCombatEffect(tower.x, tower.y, 52, "#dc805f", .58);
    if (selectedTower === tower) {
      selectedTower = null;
      towerControlsDirty = true;
    }
    announce(`${TOWERS[tower.type].name} emplacement destroyed by incoming fire.`);
  }

  function damageTowersInRadius(x, y, radius, damage) {
    for (const tower of towers) {
      if (!tower.destroyed && Math.hypot(tower.x - x, tower.y - y) <= radius) damageTower(tower, damage);
    }
  }

  function fireEnemyRocket(enemy, target, targetType) {
    projectiles.push({
      x: enemy.x,
      y: enemy.y,
      target,
      targetType,
      speed: 335,
      damage: targetType === "base" ? 2 : 46,
      splash: 0,
      color: "#e38360",
      type: "enemyRocket",
      faction: "hostile",
      angle: Math.atan2(target.y - enemy.y, target.x - enemy.x)
    });
    addCombatEffect(enemy.x, enemy.y, 26, "#e38360", .32);
    announce(targetType === "base"
      ? "Rocket Vehicle launched a base strike!"
      : "Rocket Vehicle locked onto a defensive emplacement!");
  }

  function chooseRocketVehicleTarget(enemy) {
    let target = null;
    let nearest = 310;
    for (const tower of towers) {
      if (tower.destroyed) continue;
      const distance = Math.hypot(tower.x - enemy.x, tower.y - enemy.y);
      if (distance < nearest) {
        target = tower;
        nearest = distance;
      }
    }
    if (target) return { target, type: "tower" };
    const base = ROUTE[ROUTE.length - 1];
    if (Math.hypot(base.x - enemy.x, base.y - enemy.y) <= 460) {
      return { target: base, type: "base" };
    }
    return null;
  }

  function chooseBossTarget(enemy) {
    let target = null;
    let nearest = 400;
    for (const tower of towers) {
      if (tower.destroyed) continue;
      const distance = Math.hypot(tower.x - enemy.x, tower.y - enemy.y);
      if (distance < nearest) {
        target = tower;
        nearest = distance;
      }
    }
    if (target) return target;
    const base = ROUTE[ROUTE.length - 1];
    return Math.hypot(base.x - enemy.x, base.y - enemy.y) <= 510 ? base : null;
  }

  function updateEnemyAbilities(enemy, delta) {
    enemy.hitFlash = Math.max(0, enemy.hitFlash - delta);
    if (enemy.type === "eliteSquad") {
      enemy.regenDelay = Math.max(0, enemy.regenDelay - delta);
      if (enemy.regenDelay === 0 && enemy.health > 0) enemy.health = Math.min(enemy.maxHealth, enemy.health + 7 * delta);
    }
    if (enemy.type === "scoutJeep") {
      enemy.boostCooldown -= delta;
      enemy.boostTime = Math.max(0, enemy.boostTime - delta);
      if (enemy.boostCooldown <= 0) {
        enemy.boostTime = .9;
        enemy.boostCooldown = 6.5;
        addCombatEffect(enemy.x, enemy.y, 32, "#e3bf74", .4);
        announce("Scout Jeep accelerating along the route.");
      }
    }
    if (enemy.type === "rocketVehicle") {
      enemy.attackCooldown -= delta;
      if (enemy.attackWindup > 0) {
        enemy.attackWindup = Math.max(0, enemy.attackWindup - delta);
        if (enemy.attackWindup === 0) {
          const locked = enemy.attackTarget;
          if (locked && (enemy.attackTargetType === "base" || towers.includes(locked) && !locked.destroyed)) {
            fireEnemyRocket(enemy, locked, enemy.attackTargetType);
          }
          enemy.attackTarget = null;
        }
      } else if (enemy.attackCooldown <= 0) {
        const selected = chooseRocketVehicleTarget(enemy);
        if (selected) {
          enemy.attackTarget = selected.target;
          enemy.attackTargetType = selected.type;
          enemy.attackWindup = .85;
          enemy.attackCooldown = 4.7;
        } else {
          enemy.attackCooldown = 1.2;
        }
      }
    }
    if (enemy.type === "boss") {
      if (enemy.attackWindup > 0) {
        enemy.attackWindup = Math.max(0, enemy.attackWindup - delta);
        if (enemy.attackWindup === 0) {
          damageTowersInRadius(enemy.attackX, enemy.attackY, 170, 72);
          const base = ROUTE[ROUTE.length - 1];
          if (Math.hypot(base.x - enemy.attackX, base.y - enemy.attackY) <= 170) {
            baseHealth = Math.max(0, baseHealth - 3);
            announce(`Command Tank ground strike hit! Base integrity ${baseHealth} of ${BASE_HEALTH}.`);
          } else {
            announce("Command Tank ground strike hit defensive emplacements!");
          }
          addCombatEffect(enemy.attackX, enemy.attackY, 170, "#e08261", .7);
          if (baseHealth <= 0) finishOperation(false, true);
        }
      } else {
        enemy.attackCooldown -= delta;
        if (enemy.attackCooldown <= 0) {
          const target = chooseBossTarget(enemy);
          if (target) {
            enemy.attackX = target.x;
            enemy.attackY = target.y;
            enemy.attackWindup = 1.2;
            enemy.attackCooldown = 8.5;
            addCombatEffect(enemy.attackX, enemy.attackY, 170, "rgba(224, 130, 97, .68)", 1.2);
            announce("Command Tank marking a ground-strike zone! Move defenses out of the warning ring.");
          } else {
            enemy.attackCooldown = 1.5;
          }
        }
      }
    }
  }

  function applyEnemyDamage(enemy, damage, towerType) {
    if (enemy.health <= 0) return;
    const stats = TOWERS[towerType];
    if (!stats || enemy.airborne !== stats.targetsAir) return;
    let multiplier = 1 - enemy.armor;
    if (towerType === "machineGun") {
      if (enemy.type === "infantry" || enemy.type === "eliteSquad") multiplier *= enemy.type === "infantry" ? 1.25 : 1.12;
      if (enemy.type === "scoutJeep" || enemy.type === "combatDrone") multiplier *= 1.2;
      if (enemy.type === "apc" || enemy.type === "heavyTank" || enemy.type === "boss") multiplier *= .72;
    } else if (towerType === "heavyCannon") {
      multiplier /= Math.max(.45, 1 - enemy.armor * .8);
      if (enemy.type === "apc" || enemy.type === "heavyTank" || enemy.type === "boss") multiplier *= 1.48;
      if (enemy.type === "scoutJeep" || enemy.type === "combatDrone") multiplier *= .78;
    } else if (towerType === "sniperTower") {
      multiplier /= Math.max(.5, 1 - enemy.armor * .6);
      if (enemy.type === "boss") multiplier *= 1.65;
      else if (enemy.type === "eliteSquad" || enemy.type === "rocketVehicle") multiplier *= 1.3;
    } else if (towerType === "antiAircraft") {
      multiplier *= enemy.type === "helicopter" ? 1.35 : 1;
    } else if (towerType === "rocketLauncher" && !enemy.airborne) {
      multiplier *= enemy.armor > .2 ? 1.12 : 1;
    }
    enemy.health -= Math.max(1, Math.round(damage * multiplier));
    enemy.hitFlash = .14;
    enemy.regenDelay = 2.4;
    if (enemy.health <= 0) defeatEnemy(enemy, enemy.x, enemy.y);
    else if (enemy.type === "boss" && enemy.health / enemy.maxHealth < .5 && !enemy.enraged) {
      enemy.enraged = true;
      enemy.armor = Math.max(.12, enemy.armor - .08);
      enemy.speed += 5;
      addCombatEffect(enemy.x, enemy.y, 110, "#e29c68", .72);
      announce("Command Tank damaged. It is accelerating and its armor is failing.");
    }
  }

  function impactProjectile(projectile, x, y) {
    if (projectile.splash > 0) {
      for (const enemy of enemies) {
        if (enemy.health <= 0) continue;
        const distance = Math.hypot(enemy.x - x, enemy.y - y);
        if (enemy === projectile.target || distance <= projectile.splash) {
          const falloff = enemy === projectile.target ? 1 : Math.max(.25, 1 - distance / projectile.splash * .62);
          applyEnemyDamage(enemy, projectile.damage * falloff, projectile.type);
        }
      }
      addCombatEffect(x, y, projectile.splash, projectile.color, .55);
      return;
    }
    if (projectile.faction === "hostile") {
      if (projectile.targetType === "tower" && towers.includes(projectile.target)) {
        damageTower(projectile.target, projectile.damage);
        addCombatEffect(x, y, 30, "#df845f", .34);
      } else if (projectile.targetType === "base") {
        baseHealth = Math.max(0, baseHealth - projectile.damage);
        addCombatEffect(x, y, 52, "#e28762", .48);
        announce(`Rocket strike hit the forward base. Integrity ${baseHealth} of ${BASE_HEALTH}.`);
        if (baseHealth <= 0) finishOperation(false);
      }
      return;
    }
    applyEnemyDamage(projectile.target, projectile.damage, projectile.type);
    addCombatEffect(x, y, projectile.target.type === "boss" ? 25 : 12, projectile.target.type === "boss" ? "#f0ca78" : projectile.color, .25);
  }

  function acquireTarget(tower, stats) {
    let target = null;
    let bestPriority = -Infinity;
    for (const enemy of enemies) {
      if (enemy.health <= 0 || enemy.airborne !== stats.targetsAir || Math.hypot(enemy.x - tower.x, enemy.y - tower.y) > stats.range) continue;
      let priority = enemy.progress;
      if (tower.type === "sniperTower" && enemy.type === "boss") priority += 1050;
      if (tower.type === "sniperTower" && enemy.type === "eliteSquad") priority += 280;
      if (tower.type === "heavyCannon" && (enemy.type === "heavyTank" || enemy.type === "apc" || enemy.type === "boss")) priority += 220;
      if (tower.type === "machineGun" && (enemy.type === "infantry" || enemy.type === "scoutJeep")) priority += 70;
      if (tower.type === "antiAircraft" && enemy.type === "helicopter") priority += 120;
      if (priority > bestPriority) {
        target = enemy;
        bestPriority = priority;
      }
    }
    return target;
  }

  function fireTower(tower, target, stats) {
    tower.cooldown = stats.reload;
    tower.flash = .1;
    projectiles.push({
      x: tower.x,
      y: tower.y,
      target,
      speed: stats.projectileSpeed,
      damage: stats.damage,
      splash: stats.splash,
      color: stats.color,
      type: tower.type,
      faction: "friendly",
      angle: Math.atan2(target.y - tower.y, target.x - tower.x)
    });
  }

  function updateCombat(delta) {
    towers.forEach((tower) => {
      if (tower.destroyed) return;
      const stats = TOWERS[tower.type];
      tower.cooldown = Math.max(0, tower.cooldown - delta);
      tower.flash = Math.max(0, tower.flash - delta);
      tower.hitFlash = Math.max(0, tower.hitFlash - delta);
      const target = acquireTarget(tower, stats);
      if (!target) return;
      tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
      if (tower.cooldown <= 0) fireTower(tower, target, stats);
    });

    for (let index = projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = projectiles[index];
      const targetIsValid = projectile.faction === "hostile"
        ? projectile.targetType === "base" || towers.includes(projectile.target) && !projectile.target.destroyed
        : projectile.target.health > 0 && enemies.includes(projectile.target);
      if (!targetIsValid) {
        projectiles.splice(index, 1);
        continue;
      }
      const dx = projectile.target.x - projectile.x;
      const dy = projectile.target.y - projectile.y;
      const distance = Math.hypot(dx, dy);
      const travel = projectile.speed * delta;
      if (distance <= travel || distance < 1) {
        projectile.x = projectile.target.x;
        projectile.y = projectile.target.y;
        impactProjectile(projectile, projectile.x, projectile.y);
        projectiles.splice(index, 1);
      } else {
        projectile.x += dx / distance * travel;
        projectile.y += dy / distance * travel;
        projectile.angle = Math.atan2(dy, dx);
      }
    }

    for (let index = towers.length - 1; index >= 0; index -= 1) {
      if (towers[index].destroyed) towers.splice(index, 1);
    }

    for (let index = combatEffects.length - 1; index >= 0; index -= 1) {
      const effect = combatEffects[index];
      effect.age += delta;
      if (effect.age >= effect.life) combatEffects.splice(index, 1);
    }
  }

  function updateSimulation(deltaSeconds) {
    if (gameState !== "running") return;
    const delta = deltaSeconds * simulationSpeed;
    updateCamera(deltaSeconds);

    for (let index = dustParticles.length - 1; index >= 0; index -= 1) {
      const particle = dustParticles[index];
      particle.age += delta;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      if (particle.age >= particle.life) dustParticles.splice(index, 1);
    }

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
      enemy.dustTimer -= delta;
      if (enemy.dustTimer <= 0) {
        emitDust(enemy);
        enemy.dustTimer += .18;
      }
      const currentSpeed = enemy.speed * (enemy.boostTime > 0 ? 1.65 : 1);
      let movement = currentSpeed * delta;
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
      enemy.progress += currentSpeed * delta - movement;
      if (enemy.health <= 0) {
        enemies.splice(index, 1);
        continue;
      }
      if (enemy.routeIndex >= ROUTE.length) {
        enemies.splice(index, 1);
        baseHealth = Math.max(0, baseHealth - enemy.baseDamage);
        announce(`${enemy.name} breached the perimeter for ${enemy.baseDamage} damage. Base integrity ${baseHealth} of ${BASE_HEALTH}.`);
        if (baseHealth <= 0) {
          finishOperation(false, enemy.type === "boss");
          return;
        }
        continue;
      }
      updateEnemyAbilities(enemy, delta);
      if (gameState !== "running") return;
    }

    updateCombat(delta);
    if (gameState !== "running") return;
    for (let index = enemies.length - 1; index >= 0; index -= 1) {
      if (enemies[index].health <= 0) enemies.splice(index, 1);
    }
    if (enemies.length === 0 && enemiesToSpawn === 0) dustParticles.length = 0;

    if (enemiesToSpawn === 0 && enemies.length === 0 && projectiles.length === 0) {
      if (intermissionTimer === 0) {
        wavesCompleted = wave;
        score += wave * 100;
        const waveReward = 65 + wave * 20;
        resources += waveReward;
        towerControlsDirty = true;
        if (selectedMode === "endless") saveRecord(wavesCompleted);
        if (selectedMode === "campaign" && wave >= CAMPAIGN_WAVES) {
          finishOperation(true);
          return;
        }
        intermissionTimer = 2.5;
        announce(`Wave ${wave} complete. ${waveReward} field credits awarded. Next wave in ${intermissionTimer.toFixed(1)} seconds.`);
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

  function drawDust(ctx) {
    for (const particle of dustParticles) {
      const opacity = Math.max(0, 1 - particle.age / particle.life);
      ctx.globalAlpha = opacity * .3;
      ctx.fillStyle = "#c0ad84";
      ctx.beginPath();
      ctx.ellipse(particle.x, particle.y, particle.size * (1 + particle.age), particle.size * .52, -.24, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawSmoke(ctx, time) {
    const phases = [0, 1.9, 3.8];
    phases.forEach((phase) => {
      const cycle = (time * .17 + phase) % 1;
      const rise = cycle * 28;
      const alpha = (1 - cycle) * .17;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#d1d0b8";
      ctx.beginPath();
      ctx.ellipse(1684 + Math.sin(phase + cycle * 3) * 4, 755 - rise, 3 + cycle * 4, 5 + cycle * 3, -.25, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawTower(ctx, tower, alpha = 1) {
    const stats = TOWERS[tower.type];
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(tower.x, tower.y);
    ctx.fillStyle = "rgba(17, 22, 17, .42)";
    ctx.beginPath();
    ctx.ellipse(4, 8, 24, 19, -.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#353e34";
    ctx.strokeStyle = "#9a9873";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-20, -11);
    ctx.lineTo(-14, -19);
    ctx.lineTo(13, -19);
    ctx.lineTo(21, -10);
    ctx.lineTo(18, 14);
    ctx.lineTo(8, 20);
    ctx.lineTo(-15, 17);
    ctx.lineTo(-21, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#73785d";
    ctx.fillRect(-15, -12, 30, 24);
    ctx.fillStyle = "rgba(192, 185, 143, .34)";
    ctx.fillRect(-13, -10, 26, 2);
    ctx.strokeStyle = "rgba(38, 45, 37, .88)";
    ctx.lineWidth = 1;

    if (tower.type === "machineGun") {
      ctx.save();
      ctx.rotate(tower.angle);
      ctx.fillStyle = "#555d49";
      ctx.fillRect(-9, -9, 18, 17);
      ctx.fillStyle = "#bec098";
      ctx.fillRect(1, -3, 25, 4);
      ctx.fillStyle = "#292f2a";
      ctx.fillRect(19, -4, 7, 6);
      ctx.fillStyle = "#363d32";
      ctx.fillRect(-8, 7, 3, 13);
      ctx.fillRect(6, 7, 3, 13);
      ctx.fillRect(-2, 9, 3, 11);
      ctx.fillStyle = "#a9a783";
      ctx.fillRect(-7, 11, 2, 7);
      ctx.restore();
    } else if (tower.type === "heavyCannon") {
      ctx.fillStyle = "#40483a";
      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.rotate(tower.angle);
      ctx.fillStyle = "#b9ad82";
      ctx.fillRect(0, -4, 27, 8);
      ctx.fillStyle = "#343a31";
      ctx.fillRect(23, -5, 6, 10);
      ctx.fillStyle = "#8b8b68";
      ctx.fillRect(-7, -9, 12, 18);
    } else if (tower.type === "rocketLauncher") {
      ctx.rotate(tower.angle);
      ctx.fillStyle = "#424b3d";
      ctx.fillRect(-13, -15, 22, 30);
      ctx.strokeRect(-13, -15, 22, 30);
      for (let pod = -1; pod <= 1; pod += 1) {
        ctx.fillStyle = "#b5a47a";
        ctx.fillRect(-3, pod * 8 - 3, 27, 6);
        ctx.fillStyle = "#30362e";
        ctx.fillRect(19, pod * 8 - 2, 6, 4);
      }
      ctx.fillStyle = "#8d7956";
      ctx.fillRect(-12, -18, 9, 36);
    } else if (tower.type === "sniperTower") {
      ctx.save();
      ctx.rotate(tower.angle);
      ctx.fillStyle = "#5b624b";
      ctx.fillRect(-10, -8, 22, 16);
      ctx.fillStyle = "#bdb992";
      ctx.fillRect(-9, -2, 36, 2);
      ctx.fillStyle = "#242c28";
      ctx.fillRect(4, -5, 6, 8);
      ctx.fillStyle = "#a6946c";
      ctx.fillRect(12, -5, 5, 4);
      ctx.fillStyle = "#394234";
      ctx.fillRect(-14, 7, 3, 10);
      ctx.fillRect(8, 7, 3, 10);
      ctx.restore();
    } else if (tower.type === "antiAircraft") {
      ctx.fillStyle = "#4a5544";
      ctx.fillRect(-11, -9, 22, 18);
      ctx.rotate(tower.angle);
      ctx.fillStyle = "#c0bb8f";
      ctx.fillRect(-2, -13, 30, 4);
      ctx.fillRect(-2, 9, 30, 4);
      ctx.fillStyle = "#31382e";
      ctx.fillRect(22, -14, 7, 6);
      ctx.fillRect(22, 8, 7, 6);
      ctx.fillStyle = "#8c906f";
      ctx.fillRect(-8, -16, 7, 32);
    } else {
      ctx.fillStyle = "#3d4639";
      ctx.fillRect(-15, -13, 24, 26);
      ctx.fillStyle = "#282f2a";
      ctx.fillRect(-18, -14, 4, 28);
      ctx.fillRect(10, -14, 4, 28);
      ctx.fillStyle = "#b9ac82";
      ctx.fillRect(-2, -5, 39, 10);
      ctx.fillStyle = "#333a31";
      ctx.fillRect(32, -6, 8, 12);
      ctx.fillStyle = "#8e8d68";
      ctx.fillRect(-11, -18, 21, 5);
      ctx.fillRect(-11, 13, 21, 5);
    }

    ctx.fillStyle = stats.color;
    ctx.globalAlpha = alpha * (tower.flash > 0 ? .9 : .65);
    ctx.fillRect(-17, 15, 6, 2);
    if (tower.hitFlash > 0) {
      ctx.globalAlpha = alpha * Math.min(1, tower.hitFlash * 5);
      ctx.strokeStyle = "#e28368";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 27, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    if (tower.health < tower.maxHealth) {
      const width = 32;
      ctx.fillStyle = "rgba(17, 20, 17, .82)";
      ctx.fillRect(tower.x - width / 2, tower.y + 27, width, 4);
      ctx.fillStyle = tower.health / tower.maxHealth < .35 ? "#df7c69" : "#c2cf91";
      ctx.fillRect(tower.x - width / 2, tower.y + 27, width * (tower.health / tower.maxHealth), 4);
    }
  }

  function drawProjectiles(ctx) {
    ctx.lineCap = "round";
    projectiles.forEach((projectile) => {
      ctx.save();
      ctx.translate(projectile.x, projectile.y);
      ctx.rotate(projectile.angle);
      ctx.strokeStyle = projectile.color;
      ctx.fillStyle = projectile.color;
      ctx.lineWidth = projectile.type === "machineGun" ? 1.6 : projectile.type === "enemyRocket" ? 3.2 : 2.8;
      ctx.globalAlpha = .72;
      ctx.beginPath();
      ctx.moveTo(projectile.type === "artillery" ? -18 : projectile.type === "enemyRocket" ? -15 : -10, 0);
      ctx.lineTo(projectile.type === "artillery" ? 1 : 2, 0);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.ellipse(4, 0, projectile.type === "rocketLauncher" || projectile.type === "enemyRocket" ? 5 : 3.2, projectile.type === "rocketLauncher" || projectile.type === "enemyRocket" ? 2.6 : 2, 0, 0, Math.PI * 2);
      ctx.fill();
      if (projectile.type === "rocketLauncher" || projectile.type === "enemyRocket") {
        ctx.globalAlpha = .48;
        ctx.fillStyle = projectile.type === "enemyRocket" ? "#dc795d" : "#c5a16f";
        ctx.beginPath();
        ctx.moveTo(-2, -2);
        ctx.lineTo(-11, 0);
        ctx.lineTo(-2, 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  function drawCombatEffects(ctx) {
    combatEffects.forEach((effect) => {
      const progress = effect.age / effect.life;
      const alpha = Math.max(0, 1 - progress);
      if (effect.radius > 30) {
        ctx.globalAlpha = alpha * .56;
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 3 + progress * 5;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.radius * (.22 + progress * .72), 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#f0d7a2";
        ctx.globalAlpha = alpha * .48;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.radius * .16 * (1 - progress * .45), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalAlpha = alpha * .85;
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.radius * (.3 + progress * .8), 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;
  }

  function drawSelectedRange(ctx, tower, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, TOWERS[tower.type].range, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(210, 223, 177, .045)";
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawPlacementPreview(ctx) {
    if (!selectedTowerType || !pointerWorld || gameState !== "running") return;
    const stats = TOWERS[selectedTowerType];
    const validation = validateTowerPlacement(selectedTowerType, pointerWorld.x, pointerWorld.y);
    placementPreview.x = pointerWorld.x;
    placementPreview.y = pointerWorld.y;
    placementPreview.type = selectedTowerType;
    const preview = placementPreview;
    const color = validation.valid ? "rgba(207, 227, 158, .58)" : "rgba(222, 113, 94, .72)";
    drawSelectedRange(ctx, preview, color);
    ctx.save();
    ctx.strokeStyle = validation.valid ? "#c8db9c" : "#df7c69";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(preview.x, preview.y, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    drawTower(ctx, preview, .68);
    ctx.save();
    ctx.fillStyle = validation.valid ? "#e4e9d2" : "#f0a08d";
    ctx.font = "700 11px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(validation.valid ? `${stats.name} · ${stats.cost} CR` : `INVALID · ${validation.reason}`, preview.x, preview.y - stats.range - 11);
    ctx.restore();
  }

  function worldFromPointer(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: camera.x + (clientX - rect.left - viewportWidth / 2) / zoom,
      y: camera.y + (clientY - rect.top - viewportHeight / 2) / zoom
    };
  }

  function handleCanvasClick(position) {
    if (gameState !== "running") return;
    const existing = towers.find((tower) => Math.hypot(position.x - tower.x, position.y - tower.y) < 27);
    if (existing) {
      selectedTower = existing;
      selectedTowerType = null;
      placementFeedback = "";
      towerControlsDirty = true;
      updateHud();
      announce(`${TOWERS[existing.type].name} selected. Its range and performance are displayed above the battlefield.`);
      return;
    }
    if (!selectedTowerType) {
      selectedTower = null;
      towerControlsDirty = true;
      updateHud();
      return;
    }

    const validation = validateTowerPlacement(selectedTowerType, position.x, position.y);
    if (!validation.valid) {
      placementFeedback = `Cannot deploy here: ${validation.reason}. No credits were spent.`;
      towerControlsDirty = true;
      updateHud();
      announce(`Placement rejected: ${validation.reason}. No credits were spent.`);
      return;
    }

    const type = selectedTowerType;
    placementFeedback = "";
    const tower = {
    id: nextTowerId,
    type,
    x: position.x,
    y: position.y,
    angle: 0,
    cooldown: .2,
    flash: 0,
    hitFlash: 0,
    health: 150,
    maxHealth: 150,
    destroyed: false
    };
    nextTowerId += 1;
    resources -= TOWERS[type].cost;
    towerControlsDirty = true;
    towers.push(tower);
    selectedTower = tower;
    announce(`${TOWERS[type].name} deployed for ${TOWERS[type].cost} credits. ${resources} credits remain.`);
    updateHud();
  }

  function drawEnemy(ctx, enemy, time) {
    const target = ROUTE[Math.min(enemy.routeIndex, ROUTE.length - 1)];
    const facing = Math.atan2(target.y - enemy.y, target.x - enemy.x) + Math.PI / 2;
    const frame = reducedMotion.matches ? 1 : Math.floor((time * 9 + enemy.phase) % infantryFrames.length);
    if (enemy.type === "rocketVehicle" && enemy.attackWindup > 0 && enemy.attackTarget) {
      ctx.save();
      ctx.strokeStyle = "rgba(232, 130, 91, .86)";
      ctx.fillStyle = "rgba(205, 87, 67, .10)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.arc(enemy.attackTarget.x, enemy.attackTarget.y, 28 + Math.sin(time * 16) * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
    if (enemy.type === "boss" && enemy.attackWindup > 0) {
      const pulse = .9 + Math.sin(time * 12) * .08;
      ctx.save();
      ctx.fillStyle = `rgba(206, 93, 68, ${.08 * pulse})`;
      ctx.strokeStyle = "rgba(234, 133, 95, .88)";
      ctx.lineWidth = 2.4;
      ctx.setLineDash([10, 7]);
      ctx.beginPath();
      ctx.arc(enemy.attackX, enemy.attackY, 170, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(enemy.attackX - 12, enemy.attackY);
      ctx.lineTo(enemy.attackX + 12, enemy.attackY);
      ctx.moveTo(enemy.attackX, enemy.attackY - 12);
      ctx.lineTo(enemy.attackX, enemy.attackY + 12);
      ctx.stroke();
      ctx.restore();
    }
    if (enemy.type === "eliteSquad" && enemy.regenDelay <= 0 && enemy.health < enemy.maxHealth) {
      ctx.save();
      ctx.strokeStyle = `rgba(174, 202, 128, ${.34 + Math.sin(time * 7 + enemy.phase) * .14})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    if (enemy.airborne) {
      ctx.fillStyle = "rgba(15, 20, 17, .34)";
      ctx.beginPath();
      ctx.ellipse(enemy.x + 5, enemy.y + 14, enemy.type === "helicopter" ? 26 : 17, 10, -.12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(facing);
    const infantryEnemy = enemy.type === "infantry" || enemy.type === "eliteSquad";
    const sprite = enemy.type === "eliteSquad"
      ? eliteFrames[frame]
      : enemy.type === "infantry"
        ? infantryFrames[frame]
        : enemySprites[enemy.type];
    if (sprite) {
      if (infantryEnemy) {
        ctx.drawImage(sprite, -24, -32);
      } else {
        const size = enemy.type === "boss" ? 104 : enemy.type === "combatDrone" ? 54 : 68;
        ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
      }
    }
    if (enemy.airborne && !reducedMotion.matches) {
      ctx.rotate(-facing);
      ctx.rotate(time * (enemy.type === "helicopter" ? 18 : 25) + enemy.phase);
      ctx.strokeStyle = "rgba(207, 204, 167, .78)";
      ctx.lineWidth = enemy.type === "helicopter" ? 2 : 1.4;
      ctx.beginPath();
      ctx.moveTo(enemy.type === "helicopter" ? -23 : -15, 0);
      ctx.lineTo(enemy.type === "helicopter" ? 23 : 15, 0);
      ctx.stroke();
    }
    ctx.restore();

    if (enemy.hitFlash > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(248, 220, 156, ${Math.min(.9, enemy.hitFlash * 5)})`;
      ctx.lineWidth = enemy.type === "boss" ? 4 : 2;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    const barWidth = enemy.type === "boss" ? 100 : enemy.type === "heavyTank" || enemy.type === "apc" ? 42 : enemy.airborne ? 36 : 30;
    const barY = enemy.y - (enemy.type === "boss" ? 57 : enemy.radius + 9);
    ctx.fillStyle = "rgba(16, 20, 16, .76)";
    ctx.fillRect(enemy.x - barWidth / 2, barY, barWidth, enemy.type === "boss" ? 7 : 4);
    ctx.fillStyle = enemy.type === "boss" ? "#d28d62" : enemy.health / enemy.maxHealth < .3 ? "#d68167" : "#c4ce9b";
    ctx.fillRect(enemy.x - barWidth / 2, barY, barWidth * (enemy.health / enemy.maxHealth), enemy.type === "boss" ? 7 : 4);
    if (enemy.type === "boss") {
      ctx.fillStyle = "#e9c58f";
      ctx.font = "700 10px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("COMMAND TANK", enemy.x, barY - 5);
    }
  }

  function drawBase(ctx) {
    const base = ROUTE[ROUTE.length - 1];
    ctx.save();
    ctx.translate(base.x - 28, base.y + 2);
    ctx.fillStyle = "rgba(25, 30, 23, .36)";
    ctx.beginPath();
    ctx.moveTo(-61, -39);
    ctx.lineTo(28, -39);
    ctx.lineTo(58, -10);
    ctx.lineTo(58, 39);
    ctx.lineTo(-61, 39);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#6b6952";
    ctx.strokeStyle = "#393f33";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-63, -43);
    ctx.lineTo(25, -43);
    ctx.lineTo(54, -13);
    ctx.lineTo(54, 35);
    ctx.lineTo(-63, 35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#8b8061";
    ctx.fillRect(-50, -30, 35, 27);
    ctx.fillStyle = "#495543";
    ctx.fillRect(-45, -25, 25, 17);
    ctx.fillStyle = "#343c32";
    ctx.fillRect(-40, -20, 11, 12);
    ctx.fillStyle = "#a3946d";
    ctx.fillRect(1, -28, 29, 24);
    ctx.fillStyle = "#646a51";
    ctx.fillRect(5, -24, 22, 16);
    ctx.fillStyle = "#343b31";
    ctx.fillRect(12, -20, 9, 12);
    ctx.strokeStyle = "rgba(198, 185, 143, .7)";
    ctx.lineWidth = 1;
    ctx.strokeRect(-50, -30, 35, 27);
    ctx.strokeRect(1, -28, 29, 24);
    ctx.fillStyle = "#c5c6a5";
    ctx.font = "700 8px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("FOB 07", -3, 20);
    ctx.fillStyle = "rgba(218, 210, 165, .45)";
    ctx.beginPath();
    ctx.arc(39, 21, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = baseHealth <= 6 ? "#d77d67" : "#c2cf91";
    ctx.fillRect(36, 24, 6, 2);
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
    drawSmoke(context, now / 1000);
    drawDust(context);
    drawBase(context);
    if (selectedTower) drawSelectedRange(context, selectedTower, "rgba(211, 223, 160, .52)");
    towers.forEach((tower) => drawTower(context, tower));
    const seconds = now / 1000;
    enemies.forEach((enemy) => drawEnemy(context, enemy, seconds));
    drawProjectiles(context);
    drawCombatEffects(context);
    drawPlacementPreview(context);
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

  function openTutorial() {
    if (typeof tutorialDialog.showModal !== "function") {
      console.error("LAB-Z Frontline Defense could not open the field guide: this browser does not support HTML dialogs.");
      announce("The field guide is unavailable in this browser.");
      return;
    }
    tutorialResumeAfterClose = gameState === "running";
    if (tutorialResumeAfterClose) pauseOperation();
    tutorialDialog.showModal();
  }

  function selectTowerType(type) {
    if (!TOWERS[type]) return;
    selectedTowerType = selectedTowerType === type ? null : type;
    selectedTower = null;
    placementFeedback = "";
    towerControlsDirty = true;
    updateHud();
    if (selectedTowerType) {
      const stats = TOWERS[selectedTowerType];
      announce(`${stats.name} selected. Cost ${stats.cost} credits; range ${stats.range}.`);
    } else {
      announce("Tower placement cancelled.");
    }
  }

  function onKeyDown(event) {
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || ["BUTTON", "INPUT", "SELECT", "TEXTAREA"].includes(target.tagName))) return;
    const key = event.key.toLowerCase();
    if (key === "p" || key === "escape" || key === " ") {
      if (settingsDialog.open || tutorialDialog.open) return;
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
  towerOptionButtons.forEach((button) => button.addEventListener("click", () => selectTowerType(button.dataset.tower)));
  document.querySelector("#cancel-build-button").addEventListener("click", () => {
    selectedTowerType = null;
    selectedTower = null;
    placementFeedback = "";
    towerControlsDirty = true;
    updateHud();
    announce("Tower placement cancelled.");
  });
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
  document.querySelectorAll(".tutorial-button").forEach((button) => button.addEventListener("click", openTutorial));
  document.querySelector("#tutorial-close-button").addEventListener("click", () => tutorialDialog.close());
  document.querySelector("#tutorial-done-button").addEventListener("click", () => tutorialDialog.close());

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
  tutorialDialog.addEventListener("close", () => {
    if (tutorialResumeAfterClose && gameState === "paused") resumeOperation();
    tutorialResumeAfterClose = false;
    document.querySelector("#tutorial-reopen-button").focus({ preventScroll: true });
  });

  document.querySelector("#zoom-in-button").addEventListener("click", () => adjustZoom(zoom * 1.15));
  document.querySelector("#zoom-out-button").addEventListener("click", () => adjustZoom(zoom / 1.15));
  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || gameState === "ready" || gameState === "won" || gameState === "lost") return;
    pointerDrag = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false };
    pointerWorld = worldFromPointer(event.clientX, event.clientY);
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add("is-dragging");
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!pointerDrag || pointerDrag.id !== event.pointerId) {
      pointerWorld = worldFromPointer(event.clientX, event.clientY);
      return;
    }
    if (Math.hypot(event.clientX - pointerDrag.startX, event.clientY - pointerDrag.startY) > 6) pointerDrag.moved = true;
    camera.x -= (event.clientX - pointerDrag.x) / zoom;
    camera.y -= (event.clientY - pointerDrag.y) / zoom;
    pointerDrag.x = event.clientX;
    pointerDrag.y = event.clientY;
    clampCamera();
    pointerWorld = worldFromPointer(event.clientX, event.clientY);
    updateCameraReadout();
  });
  const stopDragging = (event, allowClick) => {
    if (!pointerDrag || pointerDrag.id !== event.pointerId) return;
    const wasClick = allowClick && !pointerDrag.moved;
    pointerDrag = null;
    canvas.classList.remove("is-dragging");
    pointerWorld = worldFromPointer(event.clientX, event.clientY);
    if (wasClick) handleCanvasClick(pointerWorld);
  };
  canvas.addEventListener("pointerleave", () => {
    if (!pointerDrag) pointerWorld = null;
  });
  canvas.addEventListener("pointerup", (event) => stopDragging(event, true));
  canvas.addEventListener("pointercancel", (event) => stopDragging(event, false));
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
