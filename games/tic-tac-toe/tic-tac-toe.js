(() => {
  "use strict";

  const WINS = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const STORAGE_PREFIX = "labz-tic-tac-toe-score-v1";
  const cells = [...document.querySelectorAll(".cell")];
  const modeChoicesPanel = document.querySelector("#mode-choices");
  const modeChoices = [...document.querySelectorAll("[data-mode]")];
  const difficultyChoices = [...document.querySelectorAll(".difficulty-choice")];
  const symbolChoices = [...document.querySelectorAll(".symbol-choice")];
  const setupPanel = document.querySelector("#setup-panel");
  const setupTitle = document.querySelector("#setup-title");
  const setupKicker = document.querySelector("#setup-kicker");
  const setupOptions = document.querySelector("#setup-options");
  const playPanel = document.querySelector("#play-panel");
  const startButton = document.querySelector("#start-button");
  const turnLabel = document.querySelector("#turn-label");
  const modeLabel = document.querySelector("#mode-label");
  const instructions = document.querySelector("#game-instructions");
  const winLine = document.querySelector("#win-line");
  const status = document.querySelector("#game-status");
  const scoreX = document.querySelector("#score-x");
  const scoreO = document.querySelector("#score-o");
  const scoreDraws = document.querySelector("#score-draws");
  const scoreXLabel = document.querySelector("#score-x-label");
  const scoreOLabel = document.querySelector("#score-o-label");

  if (cells.length !== 9 || !modeChoicesPanel || !setupPanel || !setupOptions || !playPanel || !startButton || !turnLabel || !modeLabel || !instructions || !winLine || !status || !scoreX || !scoreO || !scoreDraws) {
    console.error("Tic-Tac-Toe could not initialize: required game elements are missing.");
    return;
  }

  let mode = "";
  let difficulty = "medium";
  let humanSymbol = "X";
  let computerSymbol = "O";
  let board = Array(9).fill("");
  let current = "X";
  let finished = false;
  let computerTimer = 0;
  let scores = { X: 0, O: 0, draws: 0 };

  function scoreKey() {
    return `${STORAGE_PREFIX}-${mode === "local" ? "two-players" : `single-${difficulty}`}`;
  }

  function loadScores() {
    try {
      const saved = JSON.parse(localStorage.getItem(scoreKey()) || "{}");
      scores = {
        X: Number.isSafeInteger(saved.X) && saved.X >= 0 ? saved.X : 0,
        O: Number.isSafeInteger(saved.O) && saved.O >= 0 ? saved.O : 0,
        draws: Number.isSafeInteger(saved.draws) && saved.draws >= 0 ? saved.draws : 0
      };
    } catch (error) {
      console.warn("Tic-Tac-Toe could not read the saved scoreboard; starting at zero.", error);
      scores = { X: 0, O: 0, draws: 0 };
    }
    renderScores();
  }

  function saveScores() {
    try {
      localStorage.setItem(scoreKey(), JSON.stringify(scores));
    } catch (error) {
      console.warn("Tic-Tac-Toe could not save the scoreboard; this session will continue.", error);
    }
  }

  function renderScores() {
    scoreX.textContent = String(scores.X);
    scoreO.textContent = String(scores.O);
    scoreDraws.textContent = String(scores.draws);
  }

  function checkResult(position = board) {
    const line = WINS.find(([a, b, c]) => position[a] && position[a] === position[b] && position[b] === position[c]);
    return line ? { winner: position[line[0]], line } : position.every(Boolean) ? { winner: "", line: null } : null;
  }

  function renderBoard() {
    cells.forEach((cell, index) => {
      const mark = board[index];
      cell.textContent = mark;
      cell.dataset.mark = mark;
      cell.classList.toggle("is-winning", Boolean(winningLine?.includes(index)));
      cell.disabled = finished || Boolean(mark) || (mode === "computer" && current !== humanSymbol);
      const row = Math.floor(index / 3) + 1;
      const column = (index % 3) + 1;
      cell.setAttribute("aria-label", `Row ${row}, column ${column}, ${mark ? mark : "empty"}`);
    });
  }

  let winningLine = null;

  function paintWinLine(line) {
    const coordinates = {
      "0,1,2": { left: "7%", top: "16.7%", width: "86%", angle: "0deg" },
      "3,4,5": { left: "7%", top: "50%", width: "86%", angle: "0deg" },
      "6,7,8": { left: "7%", top: "83.3%", width: "86%", angle: "0deg" },
      "0,3,6": { left: "-26.3%", top: "50%", width: "86%", angle: "90deg" },
      "1,4,7": { left: "7%", top: "50%", width: "86%", angle: "90deg" },
      "2,5,8": { left: "40.3%", top: "50%", width: "86%", angle: "90deg" },
      "0,4,8": { left: "-11%", top: "50%", width: "122%", angle: "45deg" },
      "2,4,6": { left: "-11%", top: "50%", width: "122%", angle: "-45deg" }
    };
    const style = coordinates[line.join(",")];
    if (!style) return;
    Object.assign(winLine.style, { left: style.left, top: style.top, width: style.width, transform: `translateY(-50%) rotate(${style.angle})` });
    winLine.classList.add("is-visible");
  }

  function describeTurn() {
    if (finished) return;
    if (mode === "local") {
      turnLabel.textContent = `Player ${current === "X" ? "1" : "2"} · ${current}'s turn`;
      return;
    }
    turnLabel.textContent = current === humanSymbol ? `Your turn · ${current}` : `Computer · ${current}`;
  }

  function beginRound() {
    window.clearTimeout(computerTimer);
    board = Array(9).fill("");
    current = "X";
    finished = false;
    winningLine = null;
    winLine.classList.remove("is-visible");
    winLine.removeAttribute("style");
    instructions.textContent = "Choose an empty square to place your X or O.";
    renderBoard();
    describeTurn();
    status.textContent = "New round. X goes first.";
    if (mode === "computer" && humanSymbol === "O") scheduleComputerMove();
  }

  function finishGame(result) {
    finished = true;
    window.clearTimeout(computerTimer);
    if (result.winner) {
      winningLine = result.line;
      scores[result.winner] += 1;
      const label = mode === "local"
        ? `Player ${result.winner === "X" ? "1" : "2"} (${result.winner}) wins!`
        : result.winner === humanSymbol ? "You win!" : "Computer wins!";
      turnLabel.textContent = label;
      instructions.textContent = label;
      status.textContent = `${label} Winning line highlighted.`;
      paintWinLine(result.line);
    } else {
      scores.draws += 1;
      turnLabel.textContent = "It's a draw!";
      instructions.textContent = "A draw. Try another round!";
      status.textContent = "It's a draw.";
    }
    saveScores();
    renderScores();
    renderBoard();
  }

  function placeMark(index, mark) {
    if (finished || board[index] || !Number.isInteger(index) || index < 0 || index > 8) return;
    board[index] = mark;
    const result = checkResult();
    if (result) {
      finishGame(result);
      return;
    }
    current = mark === "X" ? "O" : "X";
    renderBoard();
    describeTurn();
    if (mode === "computer" && current !== humanSymbol) scheduleComputerMove();
  }

  function winningMove(position, player) {
    for (const index of emptyCells(position)) {
      position[index] = player;
      const won = checkResult(position)?.winner === player;
      position[index] = "";
      if (won) return index;
    }
    return -1;
  }

  function emptyCells(position) {
    return position.flatMap((cell, index) => cell ? [] : [index]);
  }

  function minimax(position, maximizing, depth) {
    const result = checkResult(position);
    if (result) return result.winner === computerSymbol ? 10 - depth : result.winner ? depth - 10 : 0;
    const choices = emptyCells(position);
    const mark = maximizing ? computerSymbol : humanSymbol;
    if (maximizing) {
      let best = -Infinity;
      for (const index of choices) {
        position[index] = mark;
        best = Math.max(best, minimax(position, false, depth + 1));
        position[index] = "";
      }
      return best;
    }
    let best = Infinity;
    for (const index of choices) {
      position[index] = mark;
      best = Math.min(best, minimax(position, true, depth + 1));
      position[index] = "";
    }
    return best;
  }

  function computerMove() {
    if (finished || mode !== "computer" || current === humanSymbol) return;
    const available = emptyCells(board);
    if (!available.length) return;
    let move;
    if (difficulty === "hard") {
      let bestScore = -Infinity;
      move = available[0];
      for (const index of available) {
        board[index] = computerSymbol;
        const score = minimax(board, false, 0);
        board[index] = "";
        if (score > bestScore) {
          bestScore = score;
          move = index;
        }
      }
    } else if (difficulty === "medium") {
      const win = winningMove(board, computerSymbol);
      const block = winningMove(board, humanSymbol);
      if (win >= 0 && Math.random() > 0.18) move = win;
      else if (block >= 0 && Math.random() > 0.22) move = block;
      else move = available[Math.floor(Math.random() * available.length)];
    } else {
      move = available[Math.floor(Math.random() * available.length)];
    }
    placeMark(move, computerSymbol);
  }

  function scheduleComputerMove() {
    turnLabel.textContent = `Computer · ${current}`;
    cells.forEach((cell) => { cell.disabled = true; });
    computerTimer = window.setTimeout(computerMove, 320);
  }

  function startMode(selectedMode) {
    mode = selectedMode;
    if (mode === "local") {
      setupKicker.textContent = "TWO PLAYERS · SAME DEVICE";
      setupTitle.textContent = "Pass the controls and play together.";
      modeChoicesPanel.hidden = true;
      setupPanel.hidden = true;
      setupOptions.hidden = true;
      playPanel.hidden = false;
      scoreXLabel.textContent = "Player 1 · X";
      scoreOLabel.textContent = "Player 2 · O";
      modeLabel.textContent = "Two Players · Same device";
      instructions.textContent = "Player 1 is X. Player 2 is O.";
    } else {
      setupKicker.textContent = "SINGLE PLAYER · VS COMPUTER";
      setupTitle.textContent = "Choose your difficulty and symbol.";
      modeChoicesPanel.hidden = true;
      setupOptions.hidden = false;
      setupPanel.hidden = false;
      playPanel.hidden = true;
      modeLabel.textContent = `Single Player · ${difficulty[0].toUpperCase()}${difficulty.slice(1)}`;
      scoreXLabel.textContent = `You · ${humanSymbol}`;
      scoreOLabel.textContent = `Computer · ${humanSymbol === "X" ? "O" : "X"}`;
    }
    loadScores();
    if (mode === "local") beginRound();
  }

  function returnToModes() {
    window.clearTimeout(computerTimer);
    mode = "";
    setupPanel.hidden = false;
    modeChoicesPanel.hidden = false;
    setupOptions.hidden = true;
    playPanel.hidden = true;
    setupKicker.textContent = "CHOOSE YOUR GAME";
    setupTitle.textContent = "How do you want to play?";
    status.textContent = "Choose single player or two players.";
    modeChoices[0]?.focus();
  }

  modeChoices.forEach((button) => button.addEventListener("click", () => startMode(button.dataset.mode)));
  difficultyChoices.forEach((button) => button.addEventListener("click", () => {
    difficulty = button.dataset.difficulty;
    difficultyChoices.forEach((choice) => {
      const selected = choice === button;
      choice.classList.toggle("is-selected", selected);
      choice.setAttribute("aria-pressed", String(selected));
    });
    if (mode === "computer") {
      modeLabel.textContent = `Single Player · ${difficulty[0].toUpperCase()}${difficulty.slice(1)}`;
      loadScores();
    }
  }));
  symbolChoices.forEach((button) => button.addEventListener("click", () => {
    humanSymbol = button.dataset.symbol;
    computerSymbol = humanSymbol === "X" ? "O" : "X";
    symbolChoices.forEach((choice) => {
      const selected = choice === button;
      choice.classList.toggle("is-selected", selected);
      choice.setAttribute("aria-pressed", String(selected));
    });
    scoreXLabel.textContent = `You · ${humanSymbol}`;
    scoreOLabel.textContent = `Computer · ${humanSymbol === "X" ? "O" : "X"}`;
  }));
  startButton.addEventListener("click", () => {
    setupPanel.hidden = true;
    playPanel.hidden = false;
    mode = "computer";
    computerSymbol = humanSymbol === "X" ? "O" : "X";
    modeLabel.textContent = `Single Player · ${difficulty[0].toUpperCase()}${difficulty.slice(1)} · ${humanSymbol}`;
    scoreXLabel.textContent = `You · ${humanSymbol}`;
    scoreOLabel.textContent = `Computer · ${humanSymbol === "X" ? "O" : "X"}`;
    loadScores();
    beginRound();
    cells[0].focus();
  });
  cells.forEach((cell) => cell.addEventListener("click", () => {
    const index = Number(cell.dataset.cell);
    if (mode === "local") placeMark(index, current);
    else if (mode === "computer" && current === humanSymbol) placeMark(index, humanSymbol);
  }));
  document.querySelector("#restart-button").addEventListener("click", beginRound);
  document.querySelector("#change-mode-button").addEventListener("click", returnToModes);
})();
