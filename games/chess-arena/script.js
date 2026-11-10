(() => {
  'use strict';

  const PIECES = {
    wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
    bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟'
  };
  const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const FILES = 'abcdefgh';
  const RANKS = '87654321';
  const boardEl = document.getElementById('board');
  const boardWrap = document.getElementById('board-wrap');
  const game = new Chess();
  let flipped = false;
  let selectedSquare = null;
  let legalTargets = [];
  let lastMove = null;
  let isAnimating = false;
  let soundEnabled = true;
  let audioContext = null;
  let pendingPromotion = null;
  let gameStarted = false;
  const captured = { w: [], b: [] };
  const symbolByCaptured = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' };

  const $ = (id) => document.getElementById(id);
  const pieceColorClass = (color) => color === 'w' ? 'white-piece' : 'black-piece';

  function getSquares() {
    const files = flipped ? FILES.split('').reverse().join('') : FILES;
    const ranks = flipped ? RANKS.split('').reverse().join('') : RANKS;
    const squares = [];
    for (const rank of ranks) for (const file of files) squares.push(`${file}${rank}`);
    return squares;
  }

  function renderBoard(options = {}) {
    const { animateFrom, move, rookAnimation, drop = false } = options;
    boardEl.innerHTML = '';
    const targets = new Set(legalTargets.map((item) => item.to));
    const captureTargets = new Set(legalTargets.filter((item) => item.captured || (item.flags && item.flags.includes('e'))).map((item) => item.to));
    const board = game.board();
    const squareOrder = getSquares();
    for (const squareName of squareOrder) {
      const fileIndex = FILES.indexOf(squareName[0]);
      const rankIndex = Number(squareName[1]);
      const square = document.createElement('div');
      square.className = `square ${(fileIndex + rankIndex) % 2 === 0 ? 'light' : 'dark'}`;
      square.dataset.square = squareName;
      square.setAttribute('role', 'gridcell');
      square.setAttribute('aria-label', `${squareName}${game.get(squareName) ? `, ${game.get(squareName).color === 'w' ? 'white' : 'black'} ${game.get(squareName).type}` : ''}`);
      if (lastMove && (lastMove.from === squareName || lastMove.to === squareName)) square.classList.add('last-move');
      if (selectedSquare === squareName) square.classList.add('selected');
      if (game.in_check() && game.turn() === game.get(squareName)?.color && game.get(squareName)?.type === 'k') square.classList.add('in-check');
      if ((fileIndex === 0 && !flipped) || (fileIndex === 7 && flipped)) {
        const rankCoord = document.createElement('span');
        rankCoord.className = 'coordinate';
        rankCoord.textContent = squareName[1];
        square.appendChild(rankCoord);
      }
      if ((rankIndex === 1 && !flipped) || (rankIndex === 8 && flipped)) {
        const fileCoord = document.createElement('span');
        fileCoord.className = 'coordinate';
        fileCoord.style.left = 'auto';
        fileCoord.style.right = '4px';
        fileCoord.style.top = '3px';
        fileCoord.style.bottom = 'auto';
        fileCoord.textContent = squareName[0];
        square.appendChild(fileCoord);
      }
      if (targets.has(squareName)) {
        const marker = document.createElement('span');
        marker.className = captureTargets.has(squareName) ? 'legal-capture' : 'legal-dot';
        square.appendChild(marker);
      }
      const piece = board[8 - rankIndex][fileIndex];
      if (piece) {
        const pieceEl = document.createElement('span');
        pieceEl.className = `piece ${pieceColorClass(piece.color)}`;
        pieceEl.textContent = PIECES[`${piece.color}${piece.type}`];
        pieceEl.dataset.piece = piece.type;
        pieceEl.dataset.color = piece.color;
        pieceEl.setAttribute('aria-hidden', 'true');
        if (drop) pieceEl.classList.add('drop-in');
        const pieceAnimation = move && squareName === move.to
          ? { start: animateFrom, knight: move.piece === 'n' }
          : rookAnimation && squareName === rookAnimation.to
            ? { start: squarePosition(rookAnimation.from), knight: false }
            : null;
        if (pieceAnimation && pieceAnimation.start) {
          pieceEl.classList.add('moving');
          const end = squarePosition(squareName);
          const dx = (pieceAnimation.start.col - end.col) * (boardWrap.clientWidth - 16) / 8;
          const dy = (pieceAnimation.start.row - end.row) * (boardWrap.clientWidth - 16) / 8;
          pieceEl.style.transform = `translate(${dx}px, ${dy}px)`;
          if (pieceAnimation.knight) pieceEl.classList.add('knight-arc');
          requestAnimationFrame(() => { pieceEl.style.transform = 'translate(0,0)'; });
        }
        square.appendChild(pieceEl);
      }
      boardEl.appendChild(square);
    }
    updateMoveList();
    updatePlayers();
    updateStatus();
  }

  function squarePosition(square) {
    const ordered = getSquares();
    const index = ordered.indexOf(square);
    return { row: Math.floor(index / 8), col: index % 8 };
  }

  function handleBoardClick(event) {
    if (isAnimating || !gameStarted || $('result-screen').classList.contains('hidden') === false) return;
    const square = event.target.closest('.square');
    if (!square) return;
    const clicked = square.dataset.square;
    const piece = game.get(clicked);
    if (selectedSquare) {
      const candidate = legalTargets.find((target) => target.to === clicked);
      if (candidate) {
        if (candidate.flags && candidate.flags.includes('p')) {
          showPromotionChoices(candidate, game.turn());
          return;
        }
        playMove(selectedSquare, clicked);
        return;
      }
    }
    if (piece && piece.color === game.turn()) {
      selectedSquare = clicked;
      legalTargets = game.moves({ square: clicked, verbose: true });
    } else {
      selectedSquare = null;
      legalTargets = [];
    }
    renderBoard();
  }

  function showPromotionChoices(move, color) {
    pendingPromotion = { from: selectedSquare, to: move.to, color };
    const options = $('promotion-options');
    options.innerHTML = '';
    for (const type of ['q', 'r', 'b', 'n']) {
      const button = document.createElement('button');
      button.className = 'promotion-choice';
      button.type = 'button';
      button.setAttribute('aria-label', `Promote to ${type}`);
      button.textContent = PIECES[`${color}${type}`];
      button.addEventListener('click', () => {
        const pending = pendingPromotion;
        $('promotion-screen').classList.add('hidden');
        pendingPromotion = null;
        if (pending) playMove(pending.from, pending.to, type);
      });
      options.appendChild(button);
    }
    $('promotion-screen').classList.remove('hidden');
  }

  function playMove(from, to, promotion) {
    const move = game.move({ from, to, ...(promotion ? { promotion } : {}) });
    if (!move) return;
    const start = squarePosition(from);
    selectedSquare = null;
    legalTargets = [];
    lastMove = { from: move.from, to: move.to };
    isAnimating = true;
    if (move.captured) animateCapture(move);
    animateMove(from, move);
    const isCastle = move.flags.includes('k') || move.flags.includes('q');
    const audio = move.captured ? 'capture' : isCastle ? 'castle' : move.promotion ? 'promotion' : 'move';
    playSound(audio);
    if (move.promotion) sparkleAtSquare(move.to);
    window.setTimeout(() => {
      isAnimating = false;
      renderBoard();
      if (game.in_checkmate()) {
        const winner = game.turn() === 'w' ? 'Black' : 'White';
        const losingKing = findKing(game.turn());
        if (losingKing) document.querySelector(`[data-square="${losingKing}"] .piece`)?.classList.add('shatter');
        window.setTimeout(() => showWinnerScreen(winner), prefersReducedMotion() ? 0 : 650);
      } else if (game.in_stalemate() || game.in_threefold_repetition() || game.insufficient_material() || game.in_draw()) {
        showDrawScreen();
      } else if (game.in_check()) {
        showCheck();
      }
    }, isCastle ? 360 : 270);
  }

  function findKing(color) {
    const board = game.board();
    for (let rank = 0; rank < 8; rank++) for (let file = 0; file < 8; file++) {
      if (board[rank][file]?.type === 'k' && board[rank][file]?.color === color) return `${FILES[file]}${8 - rank}`;
    }
    return null;
  }

  function animateMove(from, move) {
    let rookAnimation;
    if (move.flags.includes('k') || move.flags.includes('q')) {
      const rank = move.color === 'w' ? '1' : '8';
      rookAnimation = move.flags.includes('k')
        ? { from: `h${rank}`, to: `f${rank}` }
        : { from: `a${rank}`, to: `d${rank}` };
    }
    renderBoard({ animateFrom: squarePosition(from), move, rookAnimation });
  }

  function animateCapture(move) {
    const capturedColor = move.color === 'w' ? 'b' : 'w';
    captured[capturedColor].push(move.captured);
    const layer = getParticleLayer();
    const index = getSquares().indexOf(move.to);
    const size = (boardWrap.clientWidth - 16) / 8;
    const left = (index % 8) * size;
    const top = Math.floor(index / 8) * size;
    for (let i = 0; i < 7; i++) {
      const shard = document.createElement('span');
      shard.className = 'shard';
      shard.style.left = `${left + size / 2}px`;
      shard.style.top = `${top + size / 2}px`;
      shard.style.setProperty('--dx', `${Math.cos(i * Math.PI * 2 / 7) * (15 + Math.random() * 22)}px`);
      shard.style.setProperty('--dy', `${Math.sin(i * Math.PI * 2 / 7) * (15 + Math.random() * 22)}px`);
      shard.style.setProperty('--rotate', `${Math.random() * 170}deg`);
      shard.style.setProperty('--shard-color', move.color === 'w' ? '#fff1cf' : '#35423c');
      layer.appendChild(shard);
      window.setTimeout(() => shard.remove(), 550);
    }
    boardWrap.classList.remove('shake');
    void boardWrap.offsetWidth;
    boardWrap.classList.add('shake');
    $('board-flash').classList.remove('active');
    void $('board-flash').offsetWidth;
    $('board-flash').classList.add('active');
  }

  function getParticleLayer() {
    let layer = boardWrap.querySelector('.particle-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'particle-layer';
      boardWrap.appendChild(layer);
    }
    return layer;
  }

  function sparkleAtSquare(square) {
    const tile = boardEl.querySelector(`[data-square="${square}"]`);
    if (!tile) return;
    tile.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(1.7)' }, { filter: 'brightness(1)' }], { duration: 500, easing: 'ease-out' });
  }

  function showCheck() {
    $('check-label').classList.remove('show');
    void $('check-label').offsetWidth;
    $('check-label').classList.add('show');
    playSound('check');
  }

  function showWinnerScreen(winner) {
    $('result-card').classList.remove('draw');
    $('result-eyebrow').textContent = 'A DECISIVE MOMENT';
    $('result-title').textContent = 'Checkmate!';
    $('result-copy').textContent = `${winner} wins`;
    $('status-badge').textContent = 'MATCH COMPLETE';
    $('result-screen').classList.remove('hidden');
    burstConfetti();
    playSound('gameover');
  }

  function showDrawScreen() {
    $('result-card').classList.add('draw');
    $('result-eyebrow').textContent = 'A GAME WELL PLAYED';
    $('result-title').textContent = 'Draw';
    $('result-copy').textContent = game.in_stalemate() ? 'Stalemate — neither side can win' : 'The game is drawn';
    $('status-badge').textContent = 'MATCH DRAWN';
    $('result-screen').classList.remove('hidden');
    playSound('gameover');
  }

  function burstConfetti() {
    const layer = $('confetti-layer');
    layer.innerHTML = '';
    if (prefersReducedMotion()) return;
    const colors = ['#d6b77a', '#f0d7a1', '#a8c8b3', '#f0eee7', '#899eaf'];
    for (let i = 0; i < 34; i++) {
      const bit = document.createElement('span');
      bit.className = 'confetti';
      bit.style.setProperty('--dx', `${(Math.random() - .5) * 440}px`);
      bit.style.setProperty('--dy', `${(Math.random() - .5) * 360 + 150}px`);
      bit.style.setProperty('--rotate', `${Math.random() * 720 - 360}deg`);
      bit.style.setProperty('--duration', `${.9 + Math.random() * .8}s`);
      bit.style.setProperty('--confetti-color', colors[i % colors.length]);
      layer.appendChild(bit);
      window.setTimeout(() => bit.remove(), 1900);
    }
  }

  function updateMoveList() {
    const history = game.history();
    const list = $('move-list');
    $('move-count').textContent = `${Math.ceil(history.length / 2)} ${Math.ceil(history.length / 2) === 1 ? 'MOVE' : 'MOVES'}`;
    if (!history.length) {
      list.innerHTML = '<div class="empty-moves"><span>♘</span><p>Your opening move<br>starts the story.</p></div>';
      $('undo-button').disabled = true;
      return;
    }
    list.innerHTML = '';
    for (let i = 0; i < history.length; i += 2) {
      const row = document.createElement('div');
      row.className = 'move-row';
      const number = document.createElement('span');
      number.className = 'move-number';
      number.textContent = `${Math.floor(i / 2) + 1}.`;
      const whiteMove = document.createElement('span');
      whiteMove.textContent = history[i];
      const blackMove = document.createElement('span');
      blackMove.textContent = history[i + 1] || '';
      if (i === history.length - 1) whiteMove.classList.add('latest');
      if (i + 1 === history.length - 1) blackMove.classList.add('latest');
      row.append(number, whiteMove, blackMove);
      list.appendChild(row);
    }
    list.scrollTop = list.scrollHeight;
    $('undo-button').disabled = history.length === 0;
  }

  function updatePlayers() {
    for (const color of ['w', 'b']) {
      const owner = color === 'w' ? 'b' : 'w';
      const tray = $(`${color === 'w' ? 'white' : 'black'}-captured`);
      tray.innerHTML = '';
      const pieces = captured[owner];
      for (const type of pieces) {
        const item = document.createElement('span');
        item.className = `captured-piece ${owner === 'w' ? 'white-captured' : 'black-captured'}`;
        item.textContent = symbolByCaptured[type];
        tray.appendChild(item);
      }
      const ownPoints = captured[owner].reduce((sum, type) => sum + PIECE_VALUES[type], 0);
      const opponentPoints = captured[color].reduce((sum, type) => sum + PIECE_VALUES[type], 0);
      const advantage = ownPoints - opponentPoints;
      $(`${color === 'w' ? 'white' : 'black'}-material`).textContent = advantage > 0 ? `+${advantage}` : '';
    }
  }

  function updateStatus() {
    const turn = game.turn() === 'w' ? 'White' : 'Black';
    $('turn-label').textContent = game.game_over() ? 'Game over' : `${turn} to move`;
    if (game.game_over()) $('status-badge').textContent = 'MATCH COMPLETE';
    else $('status-badge').textContent = 'IN PLAY';
  }

  function resetGame(startAnimation = true) {
    game.reset();
    selectedSquare = null;
    legalTargets = [];
    lastMove = null;
    captured.w = [];
    captured.b = [];
    $('result-screen').classList.add('hidden');
    $('promotion-screen').classList.add('hidden');
    $('confetti-layer').innerHTML = '';
    $('status-badge').textContent = 'IN PLAY';
    gameStarted = true;
    renderBoard({ drop: startAnimation });
    if (startAnimation) {
      const pieces = [...boardEl.querySelectorAll('.piece')];
      pieces.forEach((piece, index) => {
        piece.style.animationDelay = `${index * 38}ms`;
      });
      window.setTimeout(() => {
        $('turn-pill').animate([{ transform: 'translateY(-8px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 450, easing: 'ease-out' });
      }, pieces.length * 38 + 120);
    }
    updatePlayers();
    updateMoveList();
  }

  function undoMove() {
    if (isAnimating || !game.history().length) return;
    const undone = game.undo();
    if (!undone) return;
    if (undone.captured) captured[undone.color === 'w' ? 'b' : 'w'].pop();
    selectedSquare = null;
    legalTargets = [];
    const historyVerbose = game.history({ verbose: true });
    const previous = historyVerbose[historyVerbose.length - 1];
    lastMove = previous ? { from: previous.from, to: previous.to } : null;
    renderBoard();
    playSound('move');
  }

  function toggleTheme() {
    const light = document.body.classList.toggle('light-theme');
    localStorage.setItem('chess-theme', light ? 'light' : 'dark');
    $('theme-label').textContent = light ? 'Switch to dark' : 'Switch to light';
    $('game-theme-toggle').textContent = light ? '☼' : '☾';
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function playSound(type) {
    if (!soundEnabled) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      if (!audioContext) audioContext = new Audio();
      if (audioContext.state === 'suspended') audioContext.resume();
      const now = audioContext.currentTime;
      const notes = {
        move: [520, .075, 'sine'], capture: [210, .16, 'triangle'], check: [740, .22, 'sawtooth'],
        castle: [390, .11, 'sine'], promotion: [650, .21, 'sine'], gameover: [330, .38, 'triangle']
      };
      const [frequency, duration, waveform] = notes[type] || notes.move;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = waveform;
      oscillator.frequency.setValueAtTime(frequency, now);
      if (type === 'check') oscillator.frequency.exponentialRampToValueAtTime(frequency * .7, now + duration);
      if (type === 'promotion' || type === 'gameover') oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.5, now + duration);
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(type === 'check' ? .055 : .035, now + .012);
      gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + duration + .02);
    } catch (error) {
      console.warn('Unable to play chess sound.', error);
    }
  }

  function launchGame() {
    $('menu-screen').classList.add('hidden');
    $('game-screen').classList.remove('hidden');
    resetGame(true);
  }

  boardEl.addEventListener('click', handleBoardClick);
  $('play-button').addEventListener('click', launchGame);
  $('theme-toggle').addEventListener('click', toggleTheme);
  $('game-theme-toggle').addEventListener('click', toggleTheme);
  $('flip-button').addEventListener('click', () => {
    flipped = !flipped;
    renderBoard();
  });
  $('undo-button').addEventListener('click', undoMove);
  $('restart-button').addEventListener('click', () => resetGame(true));
  $('play-again-button').addEventListener('click', () => resetGame(true));
  $('result-menu-button').addEventListener('click', () => {
    $('result-screen').classList.add('hidden');
    $('game-screen').classList.add('hidden');
    $('menu-screen').classList.remove('hidden');
    gameStarted = false;
  });
  $('menu-button').addEventListener('click', () => {
    $('game-screen').classList.add('hidden');
    $('menu-screen').classList.remove('hidden');
    gameStarted = false;
  });
  $('sound-button').addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    $('sound-button').textContent = soundEnabled ? '♫' : '♪̸';
    $('sound-button').setAttribute('aria-label', soundEnabled ? 'Mute sounds' : 'Enable sounds');
  });
  window.addEventListener('resize', () => {
    if (!boardEl.children.length) return;
    const movingPiece = boardEl.querySelector('.piece.moving');
    if (movingPiece) renderBoard();
  });

  const savedTheme = localStorage.getItem('chess-theme');
  if (savedTheme === 'light') document.body.classList.add('light-theme');
  $('theme-label').textContent = savedTheme === 'light' ? 'Switch to dark' : 'Switch to light';
  $('game-theme-toggle').textContent = savedTheme === 'light' ? '☼' : '☾';
  renderBoard();

  const tips = ['Control the center', 'Develop with purpose', 'Every move tells a story', 'Find your own rhythm'];
  let tipIndex = 0;
  const tipTimer = window.setInterval(() => {
    tipIndex = (tipIndex + 1) % tips.length;
    $('loader-tip').style.opacity = '0';
    window.setTimeout(() => {
      $('loader-tip').textContent = tips[tipIndex];
      $('loader-tip').style.opacity = '1';
    }, 240);
  }, 720);
  requestAnimationFrame(() => { $('loader-progress').style.width = '100%'; });
  window.setTimeout(() => {
    clearInterval(tipTimer);
    $('loading-screen').classList.add('done');
    window.setTimeout(() => $('loading-screen').remove(), 700);
  }, 2700);
})();
