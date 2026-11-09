(() => {
  "use strict";

  const CONFIG = {
    columns: 24,
    rows: 20,
    canvasWidth: 600,
    canvasHeight: 500,
    maxPixelRatio: 2,
    initialSnake: [{ x: 11, y: 10 }, { x: 10, y: 10 }, { x: 9, y: 10 }],
    initialDifficulty: "medium",
    foodPoints: 10,
    highScoreStoragePrefix: "labz-neon-snake-high-score",
    legacyHighScoreKey: "labz-neon-snake-high-score",
    hard: {
      timedFoodChance: 0.35,
      timedFoodBonus: 30,
      timedMinimumLifetimeMs: 8500,
      timedSafetySteps: 10,
      trickyPoolRatio: 0.3,
      wallRisk: 3,
      nearWallRisk: 1.5,
      cornerRisk: 2,
      adjacentBodyDistance: 1,
      nearBodyDistance: 2,
      adjacentBodyRisk: 4,
      nearBodyRisk: 2,
      distanceRisk: 2
    },
    difficulties: {
      easy: { label: "Easy", startStepMs: 210, foodsPerSpeedUp: 5, speedUpMs: 4, minimumStepMs: 175 },
      medium: { label: "Medium", startStepMs: 150, foodsPerSpeedUp: 4, speedUpMs: 9, minimumStepMs: 85 },
      hard: { label: "Hard", startStepMs: 105, foodsPerSpeedUp: 3, speedUpMs: 8, minimumStepMs: 52 }
    },
    pathDirections: [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }]
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
  const pauseButton = document.querySelector("#pause-button");
  const restartButton = document.querySelector("#restart-button");
  const scoreElement = document.querySelector("#score");
  const highScoreElement = document.querySelector("#high-score");
  const difficultyNameElement = document.querySelector("#score-difficulty");
  const difficultyPicker = document.querySelector("#difficulty-picker");
  const difficultyButtons = [...document.querySelectorAll(".difficulty-button")];
  const changeDifficultyButton = document.querySelector("#change-difficulty");
  const statusElement = document.querySelector("#game-status");

  if (!canvas || !context || !container || !overlay || !overlayAction || !pauseButton || !restartButton || !scoreElement || !highScoreElement || !difficultyNameElement || !difficultyPicker || !changeDifficultyButton || !statusElement || difficultyButtons.length !== Object.keys(CONFIG.difficulties).length) {
    console.error("Neon Snake could not initialize: required game elements or Canvas 2D support are unavailable.");
    if (overlayTitle) overlayTitle.textContent = "Game unavailable";
    if (overlayMessage) overlayMessage.textContent = "This browser could not start the Canvas game. Try a current browser with Canvas 2D support.";
    if (overlayAction) overlayAction.disabled = true;
    return;
  }

  const DIRECTIONS = {
    ArrowUp: { x: 0, y: -1 },
    w: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    s: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    a: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    d: { x: 1, y: 0 }
  };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let snake = [];
  let food = { x: 0, y: 0, timed: false, remainingMs: 0, lifetimeMs: 0, pathDistance: 0 };
  let selectedDifficulty = CONFIG.initialDifficulty;
  let direction = { x: 1, y: 0 };
  let queuedDirection = { x: 1, y: 0 };
  let score = 0;
  let foodsEaten = 0;
  let highScore = loadHighScore(selectedDifficulty);
  let state = "ready";
  let animationFrame = 0;
  let lastFrameTime = 0;
  let accumulator = 0;
  let lastTouch = null;
  let boardWidth = 0;
  let boardHeight = 0;

  function loadHighScore(difficulty) {
    try {
      const key = `${CONFIG.highScoreStoragePrefix}-${difficulty}`;
      const stored = window.localStorage.getItem(key);
      const legacy = stored === null && difficulty === CONFIG.initialDifficulty
        ? window.localStorage.getItem(CONFIG.legacyHighScoreKey)
        : null;
      const saved = Number(stored === null ? legacy : stored);
      return Number.isSafeInteger(saved) && saved >= 0 ? saved : 0;
    } catch (error) {
      console.warn("Neon Snake could not read its saved high score; this run will still work.", error);
      return 0;
    }
  }

  function saveHighScore(value) {
    try {
      window.localStorage.setItem(`${CONFIG.highScoreStoragePrefix}-${selectedDifficulty}`, String(value));
    } catch (error) {
      console.warn("Neon Snake could not save the high score; it will be available for this session only.", error);
    }
  }

  function updateScore() {
    scoreElement.textContent = String(score);
    highScoreElement.textContent = String(highScore);
    difficultyNameElement.textContent = CONFIG.difficulties[selectedDifficulty].label;
  }

  function getReachableCells() {
    const distances = new Int16Array(CONFIG.columns * CONFIG.rows);
    distances.fill(-1);
    const queue = [];
    const startIndex = snake[0].y * CONFIG.columns + snake[0].x;
    distances[startIndex] = 0;
    queue.push(snake[0]);
    const blocked = new Set(snake.slice(1).map((segment) => segment.y * CONFIG.columns + segment.x));

    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      const currentIndex = current.y * CONFIG.columns + current.x;
      for (const step of CONFIG.pathDirections) {
        const x = current.x + step.x;
        const y = current.y + step.y;
        if (x < 0 || x >= CONFIG.columns || y < 0 || y >= CONFIG.rows) continue;
        const nextIndex = y * CONFIG.columns + x;
        if (distances[nextIndex] !== -1 || blocked.has(nextIndex)) continue;
        distances[nextIndex] = distances[currentIndex] + 1;
        queue.push({ x, y });
      }
    }

    const reachable = [];
    for (let y = 0; y < CONFIG.rows; y += 1) {
      for (let x = 0; x < CONFIG.columns; x += 1) {
        const distance = distances[y * CONFIG.columns + x];
        if (distance > 0 && !snake.some((segment) => segment.x === x && segment.y === y)) {
          reachable.push({ x, y, distance });
        }
      }
    }
    return reachable;
  }

  function chooseHardFood(reachable) {
    const maxDistance = Math.max(...reachable.map((cell) => cell.distance), 1);
    const settings = CONFIG.hard;
    const ranked = reachable.map((cell) => {
      const wallDistance = Math.min(cell.x, CONFIG.columns - 1 - cell.x, cell.y, CONFIG.rows - 1 - cell.y);
      const wallRisk = wallDistance === 0 ? settings.wallRisk : wallDistance === 1 ? settings.nearWallRisk : 0;
      const cornerRisk = (cell.x === 0 || cell.x === CONFIG.columns - 1) && (cell.y === 0 || cell.y === CONFIG.rows - 1) ? settings.cornerRisk : 0;
      const bodyDistance = Math.min(...snake.slice(1).map((segment) => Math.abs(cell.x - segment.x) + Math.abs(cell.y - segment.y)), CONFIG.columns + CONFIG.rows);
      const bodyRisk = bodyDistance === settings.adjacentBodyDistance
        ? settings.adjacentBodyRisk
        : bodyDistance === settings.nearBodyDistance ? settings.nearBodyRisk : 0;
      const distanceRisk = (cell.distance / maxDistance) * settings.distanceRisk;
      return { cell, risk: wallRisk + cornerRisk + bodyRisk + distanceRisk };
    }).sort((left, right) => right.risk - left.risk);
    const poolSize = Math.max(1, Math.ceil(ranked.length * CONFIG.hard.trickyPoolRatio));
    return ranked[Math.floor(Math.random() * poolSize)].cell;
  }

  function makeFood() {
    const reachable = getReachableCells();
    if (reachable.length === 0) {
      endGame(snake.length === CONFIG.columns * CONFIG.rows);
      return;
    }
    const placement = selectedDifficulty === "hard"
      ? chooseHardFood(reachable)
      : reachable[Math.floor(Math.random() * reachable.length)];
    const hardSettings = CONFIG.hard;
    const timed = selectedDifficulty === "hard" && Math.random() < hardSettings.timedFoodChance;
    const stepMs = stepDuration();
    const lifetimeMs = timed
      ? Math.max(hardSettings.timedMinimumLifetimeMs, (placement.distance + hardSettings.timedSafetySteps) * stepMs)
      : 0;
    food = {
      x: placement.x,
      y: placement.y,
      timed,
      remainingMs: lifetimeMs,
      lifetimeMs,
      pathDistance: placement.distance
    };
  }

  function resetRound() {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    accumulator = 0;
    lastFrameTime = 0;
    score = 0;
    foodsEaten = 0;
    snake = CONFIG.initialSnake.map((segment) => ({ ...segment }));
    direction = { x: 1, y: 0 };
    queuedDirection = { x: 1, y: 0 };
    makeFood();
    updateScore();
    state = "running";
    overlay.hidden = true;
    pauseButton.disabled = false;
    pauseButton.innerHTML = '<span aria-hidden="true">Ⅱ</span> Pause';
    statusElement.textContent = "Game started. Use arrow keys or WASD to move.";
    canvas.focus({ preventScroll: true });
    draw();
    if (document.visibilityState === "visible") {
      animationFrame = requestAnimationFrame(gameFrame);
    } else {
      pauseGame("hidden");
    }
  }

  function showOverlay(kind) {
    overlay.hidden = false;
    if (kind === "ready") {
      difficultyPicker.hidden = false;
      changeDifficultyButton.hidden = true;
      overlayIcon.textContent = "↝";
      overlayEyebrow.textContent = "READY PLAYER ONE";
      overlayTitle.textContent = "Ready to play?";
      overlayMessage.textContent = "Use the arrow keys or WASD to steer. Eat the glowing orbs to grow. Avoid the walls and your tail.";
      overlayAction.textContent = "Start Game";
    } else if (kind === "paused") {
      difficultyPicker.hidden = true;
      changeDifficultyButton.hidden = true;
      overlayIcon.textContent = "Ⅱ";
      overlayEyebrow.textContent = "TAKE A BREATHER";
      overlayTitle.textContent = "Game paused";
      overlayMessage.textContent = "Your run is saved right where you left it. Resume when you're ready.";
      overlayAction.textContent = "Resume Game";
    } else {
      difficultyPicker.hidden = true;
      changeDifficultyButton.hidden = false;
      overlayIcon.textContent = "✦";
      overlayEyebrow.textContent = "RUN COMPLETE";
      overlayTitle.textContent = "Game Over";
      overlayMessage.textContent = `You scored ${score} point${score === 1 ? "" : "s"}. Ready for another run?`;
      overlayAction.textContent = "Play Again";
    }
  }

  function startRound() {
    resetRound();
  }

  function selectDifficulty(difficulty) {
    if (!Object.prototype.hasOwnProperty.call(CONFIG.difficulties, difficulty)) return;
    selectedDifficulty = difficulty;
    highScore = loadHighScore(selectedDifficulty);
    difficultyButtons.forEach((button) => {
      const selected = button.dataset.difficulty === selectedDifficulty;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    updateScore();
  }

  function returnToDifficultySelection() {
    if (state !== "over") return;
    state = "ready";
    pauseButton.disabled = true;
    showOverlay("ready");
    statusElement.textContent = "Choose a difficulty, then start a new game.";
    const selectedButton = difficultyButtons.find((button) => button.dataset.difficulty === selectedDifficulty);
    selectedButton?.focus();
  }

  function pauseGame(reason = "player") {
    if (state !== "running") return;
    state = "paused";
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    pauseButton.innerHTML = '<span aria-hidden="true">▶</span> Resume';
    if (reason === "hidden") {
      showOverlay("paused");
      overlayMessage.textContent = "The game paused while this tab was hidden. Resume when you're ready.";
      statusElement.textContent = "Game paused because the tab is hidden.";
    } else {
      showOverlay("paused");
      statusElement.textContent = "Game paused.";
    }
    draw();
  }

  function resumeGame() {
    if (state !== "paused" || document.visibilityState !== "visible") return;
    state = "running";
    overlay.hidden = true;
    pauseButton.innerHTML = '<span aria-hidden="true">Ⅱ</span> Pause';
    accumulator = 0;
    lastFrameTime = 0;
    statusElement.textContent = "Game resumed.";
    canvas.focus({ preventScroll: true });
    draw();
    animationFrame = requestAnimationFrame(gameFrame);
  }

  function togglePause() {
    if (state === "running") pauseGame();
    else if (state === "paused") resumeGame();
  }

  function endGame(won = false) {
    if (state !== "running") return;
    state = "over";
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    pauseButton.disabled = true;
    showOverlay("over");
    if (won) {
      overlayEyebrow.textContent = "BOARD CLEARED";
      overlayTitle.textContent = "You did it!";
      overlayMessage.textContent = `You filled the board and scored ${score} points. Incredible run!`;
    }
    statusElement.textContent = won ? `Board cleared. Final score: ${score}.` : `Game over. Final score: ${score}.`;
    draw();
    overlayAction.focus({ preventScroll: true });
  }

  function queueTurn(next) {
    if (state !== "running") return;
    if (next.x === -direction.x && next.y === -direction.y) return;
    if (next.x === -queuedDirection.x && next.y === -queuedDirection.y) return;
    queuedDirection = next;
  }

  function stepGame() {
    direction = queuedDirection;
    const head = {
      x: snake[0].x + direction.x,
      y: snake[0].y + direction.y
    };

    if (head.x < 0 || head.x >= CONFIG.columns || head.y < 0 || head.y >= CONFIG.rows) {
      endGame();
      return;
    }

    const eating = head.x === food.x && head.y === food.y;
    const bodyToCheck = eating ? snake : snake.slice(0, -1);
    if (bodyToCheck.some((segment) => segment.x === head.x && segment.y === head.y)) {
      endGame();
      return;
    }

    snake.unshift(head);
    if (eating) {
      score += CONFIG.foodPoints + (food.timed ? CONFIG.hard.timedFoodBonus : 0);
      foodsEaten += 1;
      if (score > highScore) {
        highScore = score;
        saveHighScore(highScore);
      }
      makeFood();
      updateScore();
    } else {
      snake.pop();
    }
  }

  function stepDuration() {
    const difficulty = CONFIG.difficulties[selectedDifficulty];
    return Math.max(
      difficulty.minimumStepMs,
      difficulty.startStepMs - Math.floor(foodsEaten / difficulty.foodsPerSpeedUp) * difficulty.speedUpMs
    );
  }

  function gameFrame(timestamp) {
    animationFrame = 0;
    if (state !== "running" || document.visibilityState !== "visible") return;
    if (lastFrameTime === 0) lastFrameTime = timestamp;
    const elapsed = Math.min(timestamp - lastFrameTime, 250);
    accumulator += elapsed;
    lastFrameTime = timestamp;

    let updated = false;
    if (food.timed) {
      food.remainingMs -= elapsed;
      if (food.remainingMs <= 0) {
        makeFood();
        updated = true;
      }
    }
    while (accumulator >= stepDuration() && state === "running") {
      accumulator -= stepDuration();
      stepGame();
      updated = true;
    }
    if (updated || food.timed) draw();
    if (state === "running") animationFrame = requestAnimationFrame(gameFrame);
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, CONFIG.maxPixelRatio);
    const width = Math.round(rect.width * pixelRatio);
    const height = Math.round(rect.height * pixelRatio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      boardWidth = width;
      boardHeight = height;
      draw();
    }
  }

  function draw() {
    if (!boardWidth || !boardHeight) {
      boardWidth = canvas.width;
      boardHeight = canvas.height;
    }
    const cellWidth = boardWidth / CONFIG.columns;
    const cellHeight = boardHeight / CONFIG.rows;
    context.clearRect(0, 0, boardWidth, boardHeight);
    context.fillStyle = "#0b1020";
    context.fillRect(0, 0, boardWidth, boardHeight);

    context.save();
    if (!reducedMotion.matches) {
      context.shadowBlur = 12;
      context.shadowColor = "rgba(98, 229, 238, .12)";
    }
    context.strokeStyle = "rgba(151, 164, 213, .055)";
    context.lineWidth = 1;
    context.beginPath();
    for (let x = 0; x <= CONFIG.columns; x += 1) {
      const px = Math.round(x * cellWidth) + 0.5;
      context.moveTo(px, 0);
      context.lineTo(px, boardHeight);
    }
    for (let y = 0; y <= CONFIG.rows; y += 1) {
      const py = Math.round(y * cellHeight) + 0.5;
      context.moveTo(0, py);
      context.lineTo(boardWidth, py);
    }
    context.stroke();
    context.restore();

    drawFood(cellWidth, cellHeight);
    snake.forEach((segment, index) => drawSegment(segment, index, cellWidth, cellHeight));
  }

  function drawFood(cellWidth, cellHeight) {
    const centerX = (food.x + 0.5) * cellWidth;
    const centerY = (food.y + 0.5) * cellHeight;
    const radius = Math.min(cellWidth, cellHeight) * 0.26;
    const timeRatio = food.timed ? Math.max(0, food.remainingMs / food.lifetimeMs) : 1;
    context.save();
    if (!reducedMotion.matches && !food.timed) {
      context.shadowBlur = 18;
      context.shadowColor = "#62e5ee";
    }
    context.globalAlpha = food.timed && !reducedMotion.matches ? Math.max(0.35, timeRatio) : 1;
    context.fillStyle = food.timed ? "#ff8be0" : "#62e5ee";
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fill();
    if (food.timed) {
      context.globalAlpha = 1;
      context.strokeStyle = "rgba(255, 139, 224, .82)";
      context.lineWidth = Math.max(1.5, radius * 0.16);
      context.beginPath();
      context.arc(centerX, centerY, radius * (reducedMotion.matches ? 1.65 : 0.85 + timeRatio * 0.8), 0, Math.PI * 2);
      context.stroke();
    }
    context.restore();
    context.fillStyle = "rgba(235, 255, 255, .85)";
    context.beginPath();
    context.arc(centerX - radius * 0.23, centerY - radius * 0.25, radius * 0.25, 0, Math.PI * 2);
    context.fill();
  }

  function drawSegment(segment, index, cellWidth, cellHeight) {
    const inset = Math.min(cellWidth, cellHeight) * 0.12;
    const x = segment.x * cellWidth + inset;
    const y = segment.y * cellHeight + inset;
    const width = cellWidth - inset * 2;
    const height = cellHeight - inset * 2;
    const radius = Math.min(width, height) * 0.28;
    context.save();
    if (index === 0 && !reducedMotion.matches) {
      context.shadowBlur = 16;
      context.shadowColor = "#a77bff";
    }
    context.fillStyle = index === 0 ? "#b9a2ff" : `rgba(98, 229, 238, ${Math.max(0.42, 0.86 - index / (snake.length * 1.8))})`;
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
    context.fill();
    context.restore();

    if (index === 0) drawEyes(segment, cellWidth, cellHeight);
  }

  function drawEyes(head, cellWidth, cellHeight) {
    const centerX = (head.x + 0.5) * cellWidth;
    const centerY = (head.y + 0.5) * cellHeight;
    const offset = Math.min(cellWidth, cellHeight) * 0.15;
    const sideOffset = Math.min(cellWidth, cellHeight) * 0.18;
    let eyes;
    if (direction.x !== 0) {
      eyes = [
        { x: centerX + direction.x * offset, y: centerY - sideOffset },
        { x: centerX + direction.x * offset, y: centerY + sideOffset }
      ];
    } else {
      eyes = [
        { x: centerX - sideOffset, y: centerY + direction.y * offset },
        { x: centerX + sideOffset, y: centerY + direction.y * offset }
      ];
    }
    context.fillStyle = "#11142a";
    eyes.forEach((eye) => {
      context.beginPath();
      context.arc(eye.x, eye.y, Math.min(cellWidth, cellHeight) * 0.055, 0, Math.PI * 2);
      context.fill();
    });
  }

  function handleKeydown(event) {
    const target = event.target;
    const isTextEntry = target instanceof HTMLElement && (target.matches("input, select, textarea") || target.isContentEditable);
    const isGameFocused = container.contains(document.activeElement);
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const nextDirection = DIRECTIONS[key];

    if (nextDirection) {
      if (!isTextEntry) event.preventDefault();
      if (state === "running" && isGameFocused && !isTextEntry) queueTurn(nextDirection);
      return;
    }

    if (!isGameFocused || (target instanceof HTMLElement && target.matches("button, a, input, select, textarea"))) return;
    if (key === " " || key === "p") {
      event.preventDefault();
      togglePause();
    } else if (key === "Enter" && state !== "running") {
      event.preventDefault();
      startRound();
    }
  }

  function handlePointerDown(event) {
    if (event.pointerType === "touch") {
      lastTouch = { x: event.clientX, y: event.clientY };
      event.preventDefault();
    }
  }

  function handlePointerUp(event) {
    if (event.pointerType !== "touch" || !lastTouch) return;
    const deltaX = event.clientX - lastTouch.x;
    const deltaY = event.clientY - lastTouch.y;
    lastTouch = null;
    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 18) return;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      queueTurn({ x: Math.sign(deltaX), y: 0 });
    } else {
      queueTurn({ x: 0, y: Math.sign(deltaY) });
    }
    event.preventDefault();
  }

  overlayAction.addEventListener("click", () => {
    if (state === "paused") resumeGame();
    else startRound();
  });
  difficultyButtons.forEach((button) => {
    button.addEventListener("click", () => selectDifficulty(button.dataset.difficulty));
  });
  changeDifficultyButton.addEventListener("click", returnToDifficultySelection);
  pauseButton.addEventListener("click", () => {
    if (state === "running") pauseGame();
    else if (state === "paused") resumeGame();
  });
  restartButton.addEventListener("click", startRound);
  document.addEventListener("keydown", handleKeydown);
  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", () => { lastTouch = null; });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && state === "running") pauseGame("hidden");
  });
  window.addEventListener("resize", resizeCanvas, { passive: true });
  if (typeof ResizeObserver === "function") {
    new ResizeObserver(resizeCanvas).observe(canvas);
  }

  canvas.width = CONFIG.canvasWidth;
  canvas.height = CONFIG.canvasHeight;
  snake = CONFIG.initialSnake.map((segment) => ({ ...segment }));
  makeFood();
  selectDifficulty(CONFIG.initialDifficulty);
  updateScore();
  showOverlay("ready");
  pauseButton.disabled = true;
  resizeCanvas();
  draw();
})();
