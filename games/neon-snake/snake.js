(() => {
  "use strict";

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
  const statusElement = document.querySelector("#game-status");

  if (!canvas || !context || !container || !overlay || !overlayAction || !pauseButton || !restartButton || !scoreElement || !highScoreElement || !statusElement) {
    console.error("Neon Snake could not initialize: required game elements or Canvas 2D support are unavailable.");
    if (overlayTitle) overlayTitle.textContent = "Game unavailable";
    if (overlayMessage) overlayMessage.textContent = "This browser could not start the Canvas game. Try a current browser with Canvas 2D support.";
    if (overlayAction) overlayAction.disabled = true;
    return;
  }

  const COLUMNS = 24;
  const ROWS = 20;
  const CELL = 25;
  const BASE_STEP = 150;
  const MIN_STEP = 76;
  const STORAGE_KEY = "labz-neon-snake-high-score";
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
  let food = { x: 0, y: 0 };
  let direction = { x: 1, y: 0 };
  let queuedDirection = { x: 1, y: 0 };
  let score = 0;
  let foodsEaten = 0;
  let highScore = loadHighScore();
  let state = "ready";
  let animationFrame = 0;
  let lastFrameTime = 0;
  let accumulator = 0;
  let lastTouch = null;
  let boardWidth = 0;
  let boardHeight = 0;

  function loadHighScore() {
    try {
      const saved = Number(window.localStorage.getItem(STORAGE_KEY));
      return Number.isSafeInteger(saved) && saved > 0 ? saved : 0;
    } catch (error) {
      console.warn("Neon Snake could not read its saved high score; this run will still work.", error);
      return 0;
    }
  }

  function saveHighScore(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(value));
    } catch (error) {
      console.warn("Neon Snake could not save the high score; it will be available for this session only.", error);
    }
  }

  function updateScore() {
    scoreElement.textContent = String(score);
    highScoreElement.textContent = String(highScore);
  }

  function makeFood() {
    const emptyCells = [];
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLUMNS; x += 1) {
        if (!snake.some((segment) => segment.x === x && segment.y === y)) {
          emptyCells.push({ x, y });
        }
      }
    }
    if (emptyCells.length === 0) {
      endGame(true);
      return;
    }
    food = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  }

  function resetRound() {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    accumulator = 0;
    lastFrameTime = 0;
    score = 0;
    foodsEaten = 0;
    snake = [
      { x: 11, y: 10 },
      { x: 10, y: 10 },
      { x: 9, y: 10 }
    ];
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
      overlayIcon.textContent = "↝";
      overlayEyebrow.textContent = "READY PLAYER ONE";
      overlayTitle.textContent = "Ready to play?";
      overlayMessage.textContent = "Use the arrow keys or WASD to steer. Eat the glowing orbs to grow. Avoid the walls and your tail.";
      overlayAction.textContent = "Start Game";
    } else if (kind === "paused") {
      overlayIcon.textContent = "Ⅱ";
      overlayEyebrow.textContent = "TAKE A BREATHER";
      overlayTitle.textContent = "Game paused";
      overlayMessage.textContent = "Your run is saved right where you left it. Resume when you're ready.";
      overlayAction.textContent = "Resume Game";
    } else {
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

    if (head.x < 0 || head.x >= COLUMNS || head.y < 0 || head.y >= ROWS) {
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
      score += 10;
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
    return Math.max(MIN_STEP, BASE_STEP - Math.floor(foodsEaten / 4) * 9);
  }

  function gameFrame(timestamp) {
    animationFrame = 0;
    if (state !== "running" || document.visibilityState !== "visible") return;
    if (lastFrameTime === 0) lastFrameTime = timestamp;
    accumulator += Math.min(timestamp - lastFrameTime, 250);
    lastFrameTime = timestamp;

    let updated = false;
    while (accumulator >= stepDuration() && state === "running") {
      accumulator -= stepDuration();
      stepGame();
      updated = true;
    }
    if (updated) draw();
    if (state === "running") animationFrame = requestAnimationFrame(gameFrame);
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
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
    const cellWidth = boardWidth / COLUMNS;
    const cellHeight = boardHeight / ROWS;
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
    for (let x = 0; x <= COLUMNS; x += 1) {
      const px = Math.round(x * cellWidth) + 0.5;
      context.moveTo(px, 0);
      context.lineTo(px, boardHeight);
    }
    for (let y = 0; y <= ROWS; y += 1) {
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
    context.save();
    if (!reducedMotion.matches) {
      context.shadowBlur = 18;
      context.shadowColor = "#62e5ee";
    }
    context.fillStyle = "#62e5ee";
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fill();
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

  snake = [{ x: 11, y: 10 }, { x: 10, y: 10 }, { x: 9, y: 10 }];
  makeFood();
  updateScore();
  showOverlay("ready");
  pauseButton.disabled = true;
  resizeCanvas();
  draw();
})();
