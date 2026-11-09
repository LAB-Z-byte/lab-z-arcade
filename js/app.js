(() => {
  "use strict";

  const gameGrid = document.querySelector("#game-grid");
  const emptyMessage = document.querySelector("#filter-empty");
  const categoryButtons = [...document.querySelectorAll(".category-chip")];
  const searchInput = document.querySelector("#game-search");
  const searchToggle = document.querySelector(".search-toggle");
  const searchContainer = document.querySelector(".nav-search");
  const menuToggle = document.querySelector(".menu-toggle");
  const navPanel = document.querySelector("#primary-menu");
  const navLinks = [...document.querySelectorAll(".nav-links a")];
  const year = document.querySelector("#current-year");

  if (!gameGrid || !emptyMessage || !Array.isArray(window.LABZ_GAMES)) {
    console.error("LAB-Z Arcade could not initialize: required game data or page elements are missing.");
    return;
  }

  let activeCategory = "all";
  let searchTerm = "";

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);

  const renderGames = () => {
    const matchingGames = window.LABZ_GAMES.filter((game) => {
      const matchesCategory = activeCategory === "all" || game.categories.includes(activeCategory);
      const searchableText = `${game.title} ${game.description} ${game.categories.join(" ")}`.toLowerCase();
      return matchesCategory && searchableText.includes(searchTerm);
    });

    gameGrid.innerHTML = matchingGames.map((game) => `
      <article class="game-card">
        <div class="game-art" data-art="${escapeHtml(game.art)}">
          <span class="game-glyph" aria-hidden="true">${escapeHtml(game.glyph)}</span>
          ${game.playable && game.url
            ? `<a class="game-badge game-play-link" href="${escapeHtml(game.url)}" aria-label="Play ${escapeHtml(game.title)}">Play <span aria-hidden="true">↗</span></a>`
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
      </article>
    `).join("");
    emptyMessage.hidden = matchingGames.length > 0;
  };

  const closeMenu = () => {
    navPanel.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation menu");
  };

  categoryButtons.forEach((button) => {
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

  searchToggle.addEventListener("click", () => {
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

  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") !== "true";
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
    navPanel.classList.toggle("is-open", isOpen);
  });

  navLinks.forEach((link) => link.addEventListener("click", closeMenu));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
      if (searchContainer.classList.contains("is-open")) {
        searchToggle.click();
        searchToggle.focus();
      }
    }
  });

  if (year) year.textContent = String(new Date().getFullYear());
  renderGames();
})();
