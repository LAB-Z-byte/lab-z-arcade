# LAB-Z Arcade — Project Handoff

## 1. Project Information

- Project: LAB-Z Arcade
- GitHub repository: https://github.com/LAB-Z-byte/lab-z-arcade
- GitHub username: LAB-Z-byte
- Local directory: `D:\Projects\lab-z-arcade`
- Main branch: `main`
- Website: https://lab-z-byte.github.io/lab-z-arcade/
- Technology: HTML, CSS and JavaScript
- Deployment: GitHub Pages

This is an existing browser-based arcade containing multiple games. All new games and improvements must be integrated into this repository.

## 2. Existing Arcade Games

There are currently eight games:

1. Neon Snake
2. Tic-Tac-Toe
3. Memory Match
4. Space Blaster
5. Garden Guardians
6. Chess Arena
7. Zombie Survival
8. Frontline Defense

Important arcade files:

- `index.html`
- `games.html`
- `categories.html`
- `about.html`
- `css/style.css`
- `css/responsive.css`
- `js/games.js`
- `js/app.js`
- `js/settings.js`

Do not break existing games, navigation, search, categories, favorites, recently played or other shared functionality.

## 3. Development Rules

- Use plain HTML, CSS and JavaScript for browser games.
- Do not introduce frameworks or unnecessary dependencies.
- Do not create separate repositories for new arcade games.
- Keep GitHub Pages relative paths working.
- Optimize performance for integrated graphics and 8 GB RAM.
- Preserve existing features when implementing improvements.
- Never commit secrets, credentials, node_modules or virtual environments.
- Test changes before committing.
- Do not claim untested features work.

### Mandatory Tutorial Requirement

Every arcade game must have an easily accessible How to Play tutorial.

It must explain:
- Objective
- Controls
- Basic gameplay

This applies to all eight existing games and every future game.

Prefer a consistent reusable tutorial interface.

Update `.github/copilot-instructions.md` or equivalent project instructions so future developers follow this requirement.

## 4. Frontline Defense

Game directory:

`games/frontline-defense/`

Main files:

- `index.html`
- `frontline-defense.css`
- `frontline-defense.js`

The game is a military-style tower defense game.

### Art Direction

- Detailed top-down 2D military battlefield.
- 3D-style appearance using layered 2D artwork.
- Realistic-looking military vehicles, soldiers and defensive equipment.
- Animated enemies and battlefield effects.
- Avoid simple colored circles, dots or emoji as character substitutes.
- Optimize rendering for integrated GPUs.

### Existing Towers

1. Machine Gun
2. Heavy Cannon
3. Rocket Launcher
4. Sniper
5. Anti-Aircraft
6. Artillery

### Existing Enemy Types

1. Infantry
2. Scout Jeep
3. APC
4. Heavy Tank
5. Rocket Vehicle
6. Helicopter
7. Combat Drone
8. Elite Squad
9. Boss / Command Tank

Preserve existing targeting rules, damage, armor, abilities, rewards and combat mechanics.

## 5. Completed Frontline Defense Milestones

### Stage 1 — Foundation

Implemented:
- Campaign and Endless modes.
- Initial Green Valley battlefield.
- Enemy waves and fixed routes.
- Base health and scoring.
- Camera controls.
- Pause, restart and speed controls.
- Settings and high scores.
- Arcade integration.

Commit: `0bb66d1`

### Stage 2 — Battlefield Visuals

Implemented:
- Improved terrain.
- Road and scenery.
- Animated infantry sprites.
- Battlefield visual effects.
- Cached Canvas artwork.

Commit: `800867c`

### Milestone 3 — Tower Combat

Implemented:
- Six functional towers.
- Tower placement and selection.
- Targeting and shooting.
- Projectiles and explosions.
- Damage and splash damage.
- Credits and rewards.
- Placement validation.
- How to Play tutorial.

Commit: `bdc5ae5`

### Milestone 4 — Advanced Enemies

Implemented:
- Nine enemy classes.
- Ground and airborne enemy distinctions.
- Air-only Anti-Aircraft targeting.
- Armor and tower matchups.
- Enemy abilities.
- Rocket attacks.
- Boss battles and health indicators.
- Improved wave progression.

Commit: `6713d44`

Milestone 4 was pushed successfully to GitHub.

## 6. Current Git Status

Last confirmed state:

- Branch: `main`
- Latest commit: `6713d44`
- Commit message: `Milestone 4: Add advanced enemies and boss battles`
- Remote: `origin`
- Repository: synchronized with GitHub.
- Working tree: clean.

Before starting work, check:

`git --no-pager status -sb`

## 7. Next Task — Milestone 5: Maps & Campaign

This milestone has NOT been implemented yet.

Implement eight battlefields:

1. Green Valley
2. Desert Outpost
3. Frozen Front
4. Urban Warfare
5. Industrial Zone
6. Mountain Pass
7. Coastal Assault
8. Last Stand

Requirements:

- Distinct terrain and scenery for every battlefield.
- Unique fixed enemy routes.
- Mission objectives and increasing difficulty.
- Campaign progression across all eight maps.
- Boss encounters and challenging final missions.
- Mission rewards.
- Map and mission unlock progression.
- Save progress using localStorage.
- Map and mission selection interface.
- Clearly show locked and unlocked maps.
- Endless Survival should support unlocked battlefield selection.
- Preserve existing combat, towers, enemies and high scores.
- Update the tutorial.
- Maintain mobile responsiveness.
- No external runtime dependencies.

Test the completed implementation before committing.

## 8. Remaining Roadmap

### Milestone 6 — Upgrades & Strategy

Planned:
- Tower upgrades.
- Permanent technology research tree.
- Special attacks.
- Resource management.
- Rewards and strategic progression.

### Milestone 7 — Final Polish

Planned:
- Weather effects.
- Day/night cycles.
- Sound effects.
- Better animations.
- Balancing.
- Performance optimization.
- Final testing.

Also implement the project-wide reusable tutorial system for all existing games and future games if it has not already been completed.

## 9. Git Workflow

Always use this workflow:

1. Inspect changes.
2. Test functionality.
3. Check Git status.
4. Stage only intended files.
5. Check staged diff.
6. Commit.
7. Push to GitHub.
8. Verify the branch is synchronized.

Useful commands:

`git --no-pager status -sb`

`git --no-pager diff --check`

`git --no-pager diff --cached --check`

`git --no-pager diff --cached --stat`

Use descriptive commit messages.

Never start the next milestone until the current milestone is committed and pushed.

## 10. Instructions for the New Copilot Account

You are continuing development of an existing project.

First read:

1. `PROJECT_HANDOFF.md`
2. `.github/copilot-instructions.md`
3. The current Frontline Defense source files.

Verify the actual repository state instead of blindly trusting this document.

The next task is Milestone 5 — Maps & Campaign.

Continue from the existing implementation. Do not recreate completed milestones, overwrite existing systems unnecessarily, or break existing arcade games.

The owner prefers efficient development, fewer unnecessary steps, concise reports, and minimal Copilot credit usage.

Do not commit or push without the owner's approval.