(() => {
  "use strict";

  const LEVELS = {
    easy: { label: "Easy", columns: 4, rows: 3, symbols: ["🌙", "⭐", "🌸", "🍀", "💎", "🪐"] },
    medium: { label: "Medium", columns: 4, rows: 4, symbols: ["🌙", "⭐", "🌸", "🍀", "💎", "🪐", "🔥", "🦋"] },
    hard: { label: "Hard", columns: 6, rows: 4, symbols: ["🌙", "⭐", "🌸", "🍀", "💎", "🪐", "🔥", "🦋", "🍄", "🐚", "☀️", "🎈"] }
  };
  const STORAGE_PREFIX = "labz-memory-match-best-v1";
  const levelButtons = [...document.querySelectorAll(".level-button")];
  const levelPanel = document.querySelector("#level-panel");
  const playPanel = document.querySelector("#play-panel");
  const cardGrid = document.querySelector("#card-grid");
  const startButton = document.querySelector("#start-button");
  const restartButton = document.querySelector("#restart-button");
  const changeLevelButton = document.querySelector("#change-level-button");
  const playAgainButton = document.querySelector("#play-again-button");
  const winOverlay = document.querySelector("#win-overlay");
  const currentLevel = document.querySelector("#current-level");
  const movesElement = document.querySelector("#moves");
  const timerElement = document.querySelector("#timer");
  const bestElement = document.querySelector("#best");
  const winMessage = document.querySelector("#win-message");
  const status = document.querySelector("#game-status");

  if (!levelButtons.length || !levelPanel || !playPanel || !cardGrid || !startButton || !restartButton || !changeLevelButton || !playAgainButton || !winOverlay || !movesElement || !timerElement || !bestElement || !status) {
    console.error("Memory Match could not initialize: required game elements are missing.");
    return;
  }

  let selectedLevel = "medium";
  let deck = [];
  let flipped = [];
  let matchedPairs = 0;
  let moves = 0;
  let startedAt = 0;
  let elapsedSeconds = 0;
  let timerInterval = 0;
  let locked = false;
  let roundComplete = false;

  function readBest(level) {
    try {
      const saved = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}-${level}`) || "null");
      if (!saved || typeof saved !== "object" || !Number.isSafeInteger(saved.moves) || saved.moves < 1 || !Number.isSafeInteger(saved.seconds) || saved.seconds < 0) return null;
      return saved;
    } catch (error) {
      console.warn("Memory Match could not read this level's saved best; starting fresh.", error);
      return null;
    }
  }

  function formatTime(seconds) {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function updateStats() {
    movesElement.textContent = String(moves);
    timerElement.textContent = formatTime(elapsedSeconds);
    const best = readBest(selectedLevel);
    bestElement.textContent = best ? `${best.moves} · ${formatTime(best.seconds)}` : "—";
  }

  function shuffle(items) {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const other = Math.floor(Math.random() * (index + 1));
      [items[index], items[other]] = [items[other], items[index]];
    }
    return items;
  }

  function createDeck() {
    const symbols = LEVELS[selectedLevel].symbols;
    return shuffle(symbols.flatMap((symbol, pair) => [
      { symbol, pair, id: `${pair}-a` },
      { symbol, pair, id: `${pair}-b` }
    ]));
  }

  function renderCards() {
    const level = LEVELS[selectedLevel];
    cardGrid.className = `card-grid ${selectedLevel}`;
    cardGrid.style.gridTemplateColumns = `repeat(${level.columns}, minmax(0, 1fr))`;
    cardGrid.setAttribute("aria-label", `${level.label} Memory Match board, ${level.columns} columns by ${level.rows} rows`);
    cardGrid.innerHTML = deck.map((card, index) => `
      <button class="memory-card" type="button" data-index="${index}" aria-label="Card ${index + 1}, face down" aria-pressed="false">
        <span class="card-inner">
          <span class="card-face card-back" aria-hidden="true">✦</span>
          <span class="card-face card-front" aria-hidden="true">${card.symbol}</span>
        </span>
      </button>
    `).join("");
    cardGrid.querySelectorAll(".memory-card").forEach((button) => button.addEventListener("click", () => flipCard(button)));
  }

  function startTimer() {
    if (timerInterval || startedAt) return;
    startedAt = Date.now();
    timerInterval = window.setInterval(() => {
      elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      updateStats();
    }, 250);
  }

  function stopTimer() {
    window.clearInterval(timerInterval);
    timerInterval = 0;
    if (startedAt) elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
    startedAt = 0;
    updateStats();
  }

  function startRound() {
    window.clearInterval(timerInterval);
    timerInterval = 0;
    startedAt = 0;
    elapsedSeconds = 0;
    moves = 0;
    matchedPairs = 0;
    flipped = [];
    locked = false;
    roundComplete = false;
    deck = createDeck();
    currentLevel.textContent = `${LEVELS[selectedLevel].label} · ${LEVELS[selectedLevel].columns} × ${LEVELS[selectedLevel].rows}`;
    updateStats();
    renderCards();
    levelPanel.hidden = true;
    playPanel.hidden = false;
    winOverlay.hidden = true;
    status.textContent = `${LEVELS[selectedLevel].label} game started. ${deck.length / 2} pairs to find.`;
    cardGrid.querySelector(".memory-card")?.focus();
  }

  function finishRound() {
    roundComplete = true;
    stopTimer();
    const prior = readBest(selectedLevel);
    const isBest = !prior || moves < prior.moves || (moves === prior.moves && elapsedSeconds < prior.seconds);
    if (isBest) {
      try {
        localStorage.setItem(`${STORAGE_PREFIX}-${selectedLevel}`, JSON.stringify({ moves, seconds: elapsedSeconds }));
      } catch (error) {
        console.warn("Memory Match could not save this level's best score.", error);
      }
    }
    updateStats();
    winMessage.textContent = `${moves} moves · ${formatTime(elapsedSeconds)}${isBest ? " · New best!" : ""}`;
    winOverlay.hidden = false;
    status.textContent = `All pairs matched in ${moves} moves and ${formatTime(elapsedSeconds)}${isBest ? ". New best score." : "."}`;
    playAgainButton.focus();
  }

  function flipCard(button) {
    if (locked || roundComplete || button.disabled || button.classList.contains("is-flipped")) return;
    const index = Number(button.dataset.index);
    if (!Number.isInteger(index) || !deck[index]) return;
    startTimer();
    button.classList.add("is-flipped");
    button.setAttribute("aria-pressed", "true");
    button.setAttribute("aria-label", `Card ${index + 1}, ${deck[index].symbol}`);
    flipped.push({ button, index });

    if (flipped.length < 2) return;
    moves += 1;
    updateStats();
    const [first, second] = flipped;
    if (deck[first.index].pair === deck[second.index].pair) {
      first.button.classList.add("is-matched");
      second.button.classList.add("is-matched");
      first.button.disabled = true;
      second.button.disabled = true;
      matchedPairs += 1;
      flipped = [];
      status.textContent = "Match found.";
      if (matchedPairs === LEVELS[selectedLevel].symbols.length) finishRound();
      return;
    }

    locked = true;
    status.textContent = "Not a match. Cards will turn back over.";
    window.setTimeout(() => {
      for (const card of flipped) {
        card.button.classList.remove("is-flipped");
        card.button.setAttribute("aria-pressed", "false");
        card.button.setAttribute("aria-label", `Card ${card.index + 1}, face down`);
      }
      flipped = [];
      locked = false;
      status.textContent = "Choose two cards to find a match.";
    }, 750);
  }

  levelButtons.forEach((button) => button.addEventListener("click", () => {
    selectedLevel = button.dataset.level;
    levelButtons.forEach((choice) => {
      const selected = choice === button;
      choice.classList.toggle("is-selected", selected);
      choice.setAttribute("aria-pressed", String(selected));
    });
  }));
  startButton.addEventListener("click", startRound);
  restartButton.addEventListener("click", startRound);
  changeLevelButton.addEventListener("click", () => {
    window.clearInterval(timerInterval);
    timerInterval = 0;
    startedAt = 0;
    playPanel.hidden = true;
    levelPanel.hidden = false;
    winOverlay.hidden = true;
    levelButtons.find((button) => button.dataset.level === selectedLevel)?.focus();
  });
  playAgainButton.addEventListener("click", startRound);
})();
