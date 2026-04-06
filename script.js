// ===== STATE =====
let allGames = [];
let filteredGames = [];
let currentPage = 1;
let currentTab = 'games'; // 'games', 'modded', 'discussion'
const GAMES_PER_PAGE = 60;

// Active filters
const activeCoopFilters = new Set();
const activeGenreFilters = new Set();
const activePlatformFilters = new Set();
let searchQuery = '';

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
    await loadGames();
    applyFilters();

    // Close modal on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            if (document.getElementById('filterPanel').classList.contains('active')) {
                toggleFilterPanel();
            }
            if (document.getElementById('searchContainer').classList.contains('active')) {
                toggleSearch();
            }
        }
    });
});

// ===== LOAD GAMES =====
async function loadGames() {
    try {
        const response = await fetch('games.json');
        const data = await response.json();
        allGames = data.games;
    } catch (error) {
        console.error('Failed to load games:', error);
        allGames = [];
    }
}

// ===== TAB SWITCHING =====
function switchTab(tab) {
    currentTab = tab;
    currentPage = 1;

    // Update tab buttons
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Show/hide sections
    const heroSection = document.getElementById('heroSection');
    const gameGrid = document.getElementById('gameGrid');
    const pagination = document.getElementById('pagination');
    const resultsBar = document.getElementById('resultsBar');
    const activeFiltersEl = document.getElementById('activeFilters');
    const discussionSection = document.getElementById('discussionSection');

    if (tab === 'discussion') {
        heroSection.style.display = 'none';
        gameGrid.style.display = 'none';
        pagination.style.display = 'none';
        resultsBar.style.display = 'none';
        activeFiltersEl.style.display = 'none';
        discussionSection.style.display = 'block';
        // Load global Disqus discussion
        loadDisqus('disqus_thread_global', 'cooptwin-general', 'https://cooptwin.xyz/discussion');
    } else {
        heroSection.style.display = 'block';
        gameGrid.style.display = 'grid';
        discussionSection.style.display = 'none';
        applyFilters();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== SEARCH =====
function toggleSearch() {
    const container = document.getElementById('searchContainer');
    const input = document.getElementById('searchInput');
    container.classList.toggle('active');
    if (container.classList.contains('active')) {
        input.focus();
    } else {
        input.value = '';
        searchQuery = '';
        applyFilters();
    }
}

function handleSearch() {
    searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();
    currentPage = 1;
    applyFilters();
}

// ===== FILTER PANEL =====
function toggleFilterPanel() {
    const panel = document.getElementById('filterPanel');
    const overlay = document.getElementById('filterOverlay');
    panel.classList.toggle('active');
    overlay.classList.toggle('active');
    document.body.style.overflow = panel.classList.contains('active') ? 'hidden' : '';
}

function toggleChip(chip) {
    chip.classList.toggle('active');
    const filter = chip.dataset.filter;
    const section = chip.closest('.filter-section');
    const sectionTitle = section.querySelector('h4').textContent;

    if (sectionTitle === 'Co-op Type') {
        chip.classList.contains('active') ? activeCoopFilters.add(filter) : activeCoopFilters.delete(filter);
    } else if (sectionTitle === 'Genre') {
        chip.classList.contains('active') ? activeGenreFilters.add(filter) : activeGenreFilters.delete(filter);
    } else if (sectionTitle === 'Platform') {
        chip.classList.contains('active') ? activePlatformFilters.add(filter) : activePlatformFilters.delete(filter);
    }

    currentPage = 1;
    applyFilters();
}

function clearFilters() {
    activeCoopFilters.clear();
    activeGenreFilters.clear();
    activePlatformFilters.clear();
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    currentPage = 1;
    applyFilters();
}

function removeActiveFilter(filter, type) {
    if (type === 'coop') activeCoopFilters.delete(filter);
    else if (type === 'genre') activeGenreFilters.delete(filter);
    else if (type === 'platform') activePlatformFilters.delete(filter);

    // Update chip state
    document.querySelectorAll('.chip').forEach(c => {
        if (c.dataset.filter === filter) c.classList.remove('active');
    });

    currentPage = 1;
    applyFilters();
}

// ===== APPLY FILTERS =====
function applyFilters() {
    let games = allGames;

    // Tab filter
    if (currentTab === 'modded') {
        games = games.filter(g => g.modded === true);
    } else if (currentTab === 'games') {
        // Show all games (including modded ones that also have native co-op)
    }

    // Search
    if (searchQuery) {
        games = games.filter(g =>
            g.title.toLowerCase().includes(searchQuery) ||
            g.description.toLowerCase().includes(searchQuery)
        );
    }

    // Co-op type filter
    if (activeCoopFilters.size > 0) {
        games = games.filter(g =>
            [...activeCoopFilters].some(f => g.coopTypes.includes(f))
        );
    }

    // Genre filter
    if (activeGenreFilters.size > 0) {
        games = games.filter(g =>
            [...activeGenreFilters].some(f => g.genres.includes(f))
        );
    }

    // Platform filter
    if (activePlatformFilters.size > 0) {
        games = games.filter(g =>
            [...activePlatformFilters].some(f => g.platforms.includes(f))
        );
    }

    filteredGames = games;
    updateFilterBadge();
    updateActiveFiltersBar();
    renderGameGrid();
    renderPagination();
}

// ===== UPDATE FILTER BADGE =====
function updateFilterBadge() {
    const total = activeCoopFilters.size + activeGenreFilters.size + activePlatformFilters.size;
    const badge = document.getElementById('filterBadge');
    if (total > 0) {
        badge.style.display = 'flex';
        badge.textContent = total;
    } else {
        badge.style.display = 'none';
    }
}

// ===== ACTIVE FILTERS BAR =====
function updateActiveFiltersBar() {
    const container = document.getElementById('activeFilters');
    const chipsContainer = document.getElementById('activeFilterChips');
    const total = activeCoopFilters.size + activeGenreFilters.size + activePlatformFilters.size;

    if (total === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';
    let html = '';

    activeCoopFilters.forEach(f => {
        html += `<button class="active-chip" onclick="removeActiveFilter('${f}', 'coop')">${f} <span class="remove">✕</span></button>`;
    });
    activeGenreFilters.forEach(f => {
        html += `<button class="active-chip" onclick="removeActiveFilter('${f}', 'genre')">${f} <span class="remove">✕</span></button>`;
    });
    activePlatformFilters.forEach(f => {
        html += `<button class="active-chip" onclick="removeActiveFilter('${f}', 'platform')">${f} <span class="remove">✕</span></button>`;
    });

    chipsContainer.innerHTML = html;
}

// ===== RENDER GAME GRID =====
function renderGameGrid() {
    const grid = document.getElementById('gameGrid');
    const resultsCount = document.getElementById('resultsCount');
    const totalGames = filteredGames.length;
    const totalPages = Math.ceil(totalGames / GAMES_PER_PAGE);

    if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;

    const startIdx = (currentPage - 1) * GAMES_PER_PAGE;
    const endIdx = Math.min(startIdx + GAMES_PER_PAGE, totalGames);
    const pageGames = filteredGames.slice(startIdx, endIdx);

    // Results count
    const resultsBar = document.getElementById('resultsBar');
    if (totalGames > 0) {
        resultsBar.style.display = 'block';
        resultsCount.textContent = `Showing ${startIdx + 1}–${endIdx} of ${totalGames} games`;
    } else {
        resultsBar.style.display = 'none';
    }

    if (pageGames.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    <line x1="8" y1="8" x2="14" y2="14"/><line x1="14" y1="8" x2="8" y2="14"/>
                </svg>
                <h3>No games found</h3>
                <p>Try adjusting your filters or search terms.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = pageGames.map(game => {
        const topTags = game.coopTypes.slice(0, 2);
        const modBadge = game.modded ? '<div class="game-card-mod-badge">Modded</div>' : '';

        return `
            <div class="game-card" onclick="openModal('${game.id}')">
                <img src="${game.image}" alt="${game.title}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 460 215%22><rect fill=%22%2313131d%22 width=%22460%22 height=%22215%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%235a576e%22 font-size=%2216%22>No Image</text></svg>'">
                ${modBadge}
                <div class="game-card-overlay">
                    <div class="game-card-title">${game.title}</div>
                    <div class="game-card-meta">
                        ${topTags.map(t => `<span class="game-card-tag">${t}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ===== RENDER PAGINATION =====
function renderPagination() {
    const pagination = document.getElementById('pagination');
    const totalPages = Math.ceil(filteredGames.length / GAMES_PER_PAGE);

    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }

    pagination.style.display = 'flex';
    let html = '';

    // Prev button
    html += `<button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>‹ Prev</button>`;

    // Page numbers
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
        html += `<button class="page-btn" onclick="goToPage(1)">1</button>`;
        if (startPage > 2) html += `<span class="page-total">…</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span class="page-total">…</span>`;
        html += `<button class="page-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }

    // Next button
    html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next ›</button>`;

    // Jump to page
    html += `
        <input type="number" class="page-input" min="1" max="${totalPages}" value="${currentPage}"
            onchange="goToPage(Math.max(1, Math.min(${totalPages}, parseInt(this.value) || 1)))"
            title="Jump to page">
        <span class="page-total">/ ${totalPages}</span>
    `;

    pagination.innerHTML = html;
}

function goToPage(page) {
    const totalPages = Math.ceil(filteredGames.length / GAMES_PER_PAGE);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderGameGrid();
    renderPagination();
    window.scrollTo({ top: 200, behavior: 'smooth' });
}

// ===== MODAL =====
function openModal(gameId) {
    const game = allGames.find(g => g.id === gameId);
    if (!game) return;

    document.getElementById('modalImage').src = game.image;
    document.getElementById('modalImage').alt = game.title;
    document.getElementById('modalTitle').textContent = game.title;
    document.getElementById('modalDesc').textContent = game.description;
    document.getElementById('modalPlayers').textContent = game.players + ' Players';
    document.getElementById('modalPlatforms').textContent = game.platforms.join(', ');
    document.getElementById('modalLink').href = game.link;

    // Tags
    const tagsHtml =
        game.coopTypes.map(t => `<span class="modal-tag coop">${t}</span>`).join('') +
        game.genres.map(t => `<span class="modal-tag genre">${t}</span>`).join('');
    document.getElementById('modalTags').innerHTML = tagsHtml;

    // Mod info
    const modInfo = document.getElementById('modalModInfo');
    if (game.modded && game.modTool) {
        modInfo.style.display = 'block';
        document.getElementById('modalModTool').textContent = game.modTool;
        document.getElementById('modalModNotes').textContent = game.modNotes || '';
        document.getElementById('modalModLink').href = game.modLink || '#';
    } else {
        modInfo.style.display = 'none';
    }

    // Show modal
    document.getElementById('modalOverlay').classList.add('active');
    document.getElementById('gameModal').classList.add('active');
    document.body.style.overflow = 'hidden';

    // Load per-game Disqus comments
    loadDisqus('disqus_thread_game', game.id, 'https://cooptwin.xyz/game/' + game.id);
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    document.getElementById('gameModal').classList.remove('active');
    document.body.style.overflow = '';
}

// ===== DISQUS =====
const DISQUS_SHORTNAME = 'coop-twin';

function loadDisqus(containerId, identifier, url) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear previous comments
    container.innerHTML = '';

    // Remove existing Disqus script if any
    const existingScript = document.getElementById('dsq-embed-scr');
    if (existingScript) existingScript.remove();

    // Reset DISQUS if it exists
    if (window.DISQUS) {
        window.DISQUS.reset({
            reload: true,
            config: function () {
                this.page.identifier = identifier;
                this.page.url = url;
                this.page.title = identifier;
            }
        });
        return;
    }

    // Set Disqus config
    window.disqus_config = function () {
        this.page.url = url;
        this.page.identifier = identifier;
    };

    // Create and load Disqus script
    const script = document.createElement('script');
    script.id = 'dsq-embed-scr';
    script.src = 'https://' + DISQUS_SHORTNAME + '.disqus.com/embed.js';
    script.setAttribute('data-timestamp', +new Date());
    container.appendChild(script);
}
