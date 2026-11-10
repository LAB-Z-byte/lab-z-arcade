(() => {
  "use strict";

  const gameGrid = document.querySelector("#game-grid");
  const emptyMessage = document.querySelector("#filter-empty");
  const categoryButtons = [...document.querySelectorAll(".category-chip[data-category]")];
  const searchInput = document.querySelector("#game-search");
  const searchToggle = document.querySelector(".search-toggle");
  const searchContainer = document.querySelector(".nav-search");
  const menuToggle = document.querySelector(".menu-toggle");
  const navPanel = document.querySelector("#primary-menu");
  const navLinks = [...document.querySelectorAll(".nav-links a")];
  const year = document.querySelector("#current-year");
  const favoritesGrid = document.querySelector("#favorites-grid");
  const favoritesSection = document.querySelector("#favorites-section");
  const recentlyPlayedGrid = document.querySelector("#recently-played-grid");
  const recentlyPlayedSection = document.querySelector("#recently-played-section");
  const clearRecentlyPlayed = document.querySelector("#clear-recently-played");
  const soundToggle = document.querySelector("#sound-toggle");
  const logoHanger = document.querySelector(".logo-hanger");

  const games = Array.isArray(window.LABZ_GAMES) ? window.LABZ_GAMES : [];
  let activeCategory = new URLSearchParams(window.location.search).get("category") || "all";
  let searchTerm = "";
  const FAVORITES_KEY = "labz-favorites";
  const RECENT_KEY = "labz-recently-played";
  const gameById = new Map(games.map((game) => [game.id || game.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), game]));
  if (!["all", "favorites", ...new Set(games.flatMap((game) => game.categories))].includes(activeCategory)) {
    activeCategory = "all";
  }
  let favorites = readStoredList(FAVORITES_KEY, (entry) => typeof entry === "string" && gameById.has(entry));
  let recentlyPlayed = readStoredList(RECENT_KEY, (entry) =>
    entry && typeof entry === "object" && typeof entry.id === "string" && gameById.has(entry.id) &&
    Number.isFinite(entry.time) && entry.time >= 0
  ).slice(0, 6);
  let tiltFrame = 0;
  let tiltPoint = null;
  let tiltCard = null;

  function readStoredList(key, validate) {
    try {
      const saved = window.localStorage.getItem(key);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(validate);
    } catch (error) {
      console.warn(`LAB-Z ignored invalid saved ${key} data.`, error);
      return [];
    }
  }

  function persistList(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`LAB-Z could not save ${key}; this page will keep the current selection.`, error);
    }
  }

  function gameId(game) {
    return game.id || game.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);

  const cardMarkup = (game, index) => {
    const id = gameId(game);
    const favorite = favorites.includes(id);
    return `
      <article class="game-card" data-game-id="${escapeHtml(id)}" style="--card-index:${index}">
        <div class="game-art" data-art="${escapeHtml(game.art)}">
          <span class="game-glyph" aria-hidden="true">${escapeHtml(game.glyph)}</span>
          <button class="favorite-toggle${favorite ? " is-favorite" : ""}" type="button" data-game-id="${escapeHtml(id)}" aria-label="${favorite ? "Remove" : "Add"} ${escapeHtml(game.title)} ${favorite ? "from" : "to"} favorites" aria-pressed="${favorite}" title="${favorite ? "Remove from" : "Add to"} favorites">♥</button>
          ${game.playable && game.url
            ? `<a class="game-badge game-play-link" data-game-id="${escapeHtml(id)}" href="${escapeHtml(game.url)}" aria-label="Play ${escapeHtml(game.title)}">Play <span aria-hidden="true">↗</span></a>`
            : '<span class="game-badge">Coming Soon</span>'}
        </div>
        <div class="game-info">
          <h3>${escapeHtml(game.title)}</h3>
          <p>${escapeHtml(game.description)}</p>
          <div class="game-meta">
            <span>${game.playable ? "Playable now" : "In development"}</span>
            <span class="game-categories">${game.categories.map((category) => `<span class="game-tag">${escapeHtml(category)}</span>`).join("")}</span>
          </div>
        </div>
      </article>`;
  };

  const renderGames = () => {
    if (!gameGrid) return;
    const matchingGames = games.filter((game) => {
      const id = gameId(game);
      const matchesCategory = activeCategory === "all" ||
        (activeCategory === "favorites" ? favorites.includes(id) : game.categories.includes(activeCategory));
      const searchableText = `${game.title} ${game.description} ${game.categories.join(" ")}`.toLowerCase();
      return matchesCategory && searchableText.includes(searchTerm);
    });

    const limit = Number(gameGrid.dataset.limit);
    const displayedGames = Number.isInteger(limit) && limit > 0 ? matchingGames.slice(0, limit) : matchingGames;
    gameGrid.innerHTML = displayedGames.map(cardMarkup).join("");
    if (emptyMessage) emptyMessage.hidden = matchingGames.length > 0;

    const favoriteGames = favorites.map((id) => gameById.get(id)).filter(Boolean);
    if (favoritesSection && favoritesGrid) {
      favoritesSection.hidden = favoriteGames.length === 0;
      favoritesGrid.innerHTML = favoriteGames.map(cardMarkup).join("");
    }

    const recentGames = recentlyPlayed
      .map((entry) => gameById.get(entry.id))
      .filter(Boolean);
    if (recentlyPlayedSection && recentlyPlayedGrid) {
      recentlyPlayedSection.hidden = recentGames.length === 0;
      recentlyPlayedGrid.innerHTML = recentGames.map(cardMarkup).join("");
    }
  };

  function syncSoundButton() {
    if (!soundToggle) return;
    const enabled = window.LABZ?.isSoundOn?.() ?? true;
    soundToggle.textContent = enabled ? "♫" : "♪̸";
    soundToggle.setAttribute("aria-label", enabled ? "Mute sounds" : "Enable sounds");
    soundToggle.setAttribute("aria-pressed", String(enabled));
    soundToggle.title = enabled ? "Sound on" : "Sound off";
  }

  function savePlayed(id) {
    recentlyPlayed = [{ id, time: Date.now() }, ...recentlyPlayed.filter((entry) => entry.id !== id)].slice(0, 6);
    persistList(RECENT_KEY, recentlyPlayed);
    renderGames();
  }

  function setFavorite(id, button) {
    const adding = !favorites.includes(id);
    favorites = adding ? [id, ...favorites] : favorites.filter((favorite) => favorite !== id);
    persistList(FAVORITES_KEY, favorites);
    renderGames();
    if (adding) {
      document.querySelectorAll(".favorite-toggle").forEach((favoriteButton) => {
        if (favoriteButton.dataset.gameId !== id) return;
        favoriteButton.classList.add("is-popping");
        favoriteButton.addEventListener("animationend", () => favoriteButton.classList.remove("is-popping"), { once: true });
      });
    }
    if (button) {
      const replacement = [...document.querySelectorAll(".favorite-toggle")].find((favoriteButton) => favoriteButton.dataset.gameId === id);
      replacement?.focus();
    }
  }

  function resetTilt(card) {
    if (!card) return;
    card.style.removeProperty("--tilt-x");
    card.style.removeProperty("--tilt-y");
    card.style.removeProperty("--glow-x");
    card.style.removeProperty("--glow-y");
    card.classList.remove("is-tilting");
  }

  function updateTilt() {
    tiltFrame = 0;
    if (!tiltCard || !tiltPoint) return;
    const rect = tiltCard.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = (tiltPoint.x - rect.left) / rect.width;
    const y = (tiltPoint.y - rect.top) / rect.height;
    tiltCard.style.setProperty("--tilt-x", `${(0.5 - y) * 5}deg`);
    tiltCard.style.setProperty("--tilt-y", `${(x - 0.5) * 5}deg`);
    tiltCard.style.setProperty("--glow-x", `${x * 100}%`);
    tiltCard.style.setProperty("--glow-y", `${y * 100}%`);
    tiltCard.classList.add("is-tilting");
  }

  function handleCardPointer(event) {
    if (event.pointerType === "touch" || window.matchMedia("(pointer: coarse)").matches) return;
    const card = event.target.closest(".game-card");
    if (!card) return;
    tiltCard = card;
    tiltPoint = { x: event.clientX, y: event.clientY };
    if (!tiltFrame) tiltFrame = window.requestAnimationFrame(updateTilt);
  }

  function handleCardPointerLeave(event) {
    const card = event.target.closest(".game-card");
    if (card && !card.contains(event.relatedTarget)) resetTilt(card);
  }

  const closeMenu = () => {
    if (!navPanel || !menuToggle) return;
    navPanel.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation menu");
  };

  categoryButtons.forEach((button) => {
    const isActive = button.dataset.category === activeCategory;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
    button.addEventListener("click", () => {
      activeCategory = button.dataset.category || "all";
      categoryButtons.forEach((categoryButton) => {
        const isActive = categoryButton === button;
        categoryButton.classList.toggle("is-active", isActive);
        categoryButton.setAttribute("aria-pressed", String(isActive));
      });
      renderGames();
    });
  });

  document.addEventListener("click", (event) => {
    const favoriteButton = event.target.closest(".favorite-toggle");
    if (favoriteButton) {
      setFavorite(favoriteButton.dataset.gameId, favoriteButton);
      return;
    }
    const playLink = event.target.closest(".game-play-link[data-game-id]");
    if (playLink) savePlayed(playLink.dataset.gameId);
  });

  document.addEventListener("pointermove", handleCardPointer, { passive: true });
  document.addEventListener("pointerout", handleCardPointerLeave, { passive: true });
  if (clearRecentlyPlayed) {
    clearRecentlyPlayed.addEventListener("click", () => {
      recentlyPlayed = [];
      persistList(RECENT_KEY, recentlyPlayed);
      renderGames();
    });
  }

  if (soundToggle) {
    soundToggle.addEventListener("click", () => {
      const current = window.LABZ?.isSoundOn?.() ?? true;
      window.LABZ?.setSoundOn?.(!current);
      syncSoundButton();
    });
  }
  window.addEventListener("labz:soundchange", syncSoundButton);
  window.addEventListener("storage", (event) => {
    if (event.key === FAVORITES_KEY) favorites = readStoredList(FAVORITES_KEY, (entry) => typeof entry === "string" && gameById.has(entry));
    if (event.key === RECENT_KEY) recentlyPlayed = readStoredList(RECENT_KEY, (entry) =>
      entry && typeof entry === "object" && typeof entry.id === "string" && gameById.has(entry.id) &&
      Number.isFinite(entry.time) && entry.time >= 0
    ).slice(0, 6);
    if (event.key === FAVORITES_KEY || event.key === RECENT_KEY) renderGames();
  });

  if (logoHanger) {
    logoHanger.addEventListener("click", () => {
      logoHanger.classList.remove("is-kicked");
      void logoHanger.offsetWidth;
      logoHanger.classList.add("is-kicked");
    });
    logoHanger.addEventListener("animationend", (event) => {
      if (event.animationName === "logo-kick") logoHanger.classList.remove("is-kicked");
    });
  }

  if (searchToggle && searchContainer && searchInput) {
    searchToggle.addEventListener("click", () => {
      if (!gameGrid || gameGrid.hasAttribute("data-limit")) {
        window.location.href = "games.html";
        return;
      }
      const isOpen = searchContainer.classList.toggle("is-open");
      searchToggle.setAttribute("aria-expanded", String(isOpen));
      searchToggle.setAttribute("aria-label", isOpen ? "Close game search" : "Open game search");
      searchInput.tabIndex = isOpen ? 0 : -1;
      if (isOpen) {
        searchInput.focus();
      } else {
        searchInput.value = "";
        searchTerm = "";
        renderGames();
      }
    });

    searchInput.addEventListener("input", () => {
      searchTerm = searchInput.value.trim().toLowerCase();
      renderGames();
    });
  }

  if (menuToggle && navPanel) {
    menuToggle.addEventListener("click", () => {
      const isOpen = menuToggle.getAttribute("aria-expanded") !== "true";
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      menuToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
      navPanel.classList.toggle("is-open", isOpen);
    });
  }

  navLinks.forEach((link) => link.addEventListener("click", closeMenu));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (navPanel && menuToggle) closeMenu();
      if (searchContainer?.classList.contains("is-open") && searchToggle) {
        searchToggle.click();
        searchToggle.focus();
      }
    }
  });

  if (year) year.textContent = String(new Date().getFullYear());
  if (soundToggle) syncSoundButton();
  renderGames();
})();
