/**
 * Main UI shell — explore map + carousel, watch view, and saved wilderness.
 * Persists filters, favorites, and recents to localStorage.
 */
import { WILDERNESS_CATEGORIES, filterVideos, findVideoById, getCategoryColor, getStateCodesWithWilderness, VideoWithCategory } from './data';
import { formatDistance, MapWildernessMap } from './map';
import { getPlaceForVideo, groupByPlace } from './places';
import { getVideoAreaLabel } from './geo/area-labels';
import { AppState, AppView } from './types';

type VideoWithRegion = VideoWithCategory;

/** localStorage keys for user data that survives reloads. */
const STORAGE_KEYS = {
  favorites: 'favorites',
  recent: 'recentVideos',
  filters: 'filterPrefs'
};

export class UIRenderer {
  private app: HTMLElement;
  private state: AppState;
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;
  private toastTimer = 0;
  private mapMaximized = false;
  private mapWilderness = new MapWildernessMap();

  /** Loads persisted state from localStorage and renders the app shell. */
  constructor(appElement: HTMLElement) {
    const savedFilters = JSON.parse(localStorage.getItem(STORAGE_KEYS.filters) ?? '{}') as Partial<AppState>;
    this.app = appElement;
    this.state = {
      activeView: (savedFilters.activeView as AppView) ?? 'explore',
      currentCategory: savedFilters.currentCategory ?? null,
      selectedState: savedFilters.selectedState ?? null,
      searchQuery: savedFilters.searchQuery ?? '',
      difficultyFilter: savedFilters.difficultyFilter ?? 'all',
      favoritesOnly: savedFilters.favoritesOnly ?? false,
      favorites: JSON.parse(localStorage.getItem(STORAGE_KEYS.favorites) ?? '[]') as string[],
      recentVideos: JSON.parse(localStorage.getItem(STORAGE_KEYS.recent) ?? '[]') as string[],
      selectedVideoId: savedFilters.selectedVideoId ?? null,
      playerStarted: false,
      onlineStatus: navigator.onLine
    };
    this.setupEventListeners();
    this.render();
  }

  /** Wires online/offline listeners for the status badge. */
  private setupEventListeners(): void {
    window.addEventListener('online', () => {
      this.state.onlineStatus = true;
      this.updateStatusBadge();
    });
    window.addEventListener('offline', () => {
      this.state.onlineStatus = false;
      this.updateStatusBadge();
    });
  }

  /** Returns catalog videos matching current UI filter state. */
  private getFilteredVideos(): VideoWithRegion[] {
    return filterVideos({
      query: this.state.searchQuery,
      categoryId: this.state.currentCategory,
      stateCode: this.state.selectedState,
      difficulty: this.state.difficultyFilter,
      favoritesOnly: this.state.favoritesOnly,
      favoriteIds: this.state.favorites
    });
  }

  /** Returns the enriched video for selectedVideoId, if any. */
  private getSelectedVideo(): VideoWithRegion | undefined {
    return this.state.selectedVideoId ? findVideoById(this.state.selectedVideoId) : undefined;
  }

  /** Saves explore/watch filter prefs to localStorage. */
  private persistFilters(): void {
    localStorage.setItem(STORAGE_KEYS.filters, JSON.stringify({
      activeView: this.state.activeView,
      currentCategory: this.state.currentCategory,
      selectedState: this.state.selectedState,
      searchQuery: this.state.searchQuery,
      difficultyFilter: this.state.difficultyFilter,
      favoritesOnly: this.state.favoritesOnly,
      selectedVideoId: this.state.selectedVideoId
    }));
  }

  /** Prepends a video id to the recent list (max 8) and persists. */
  private pushRecent(videoId: string): void {
    this.state.recentVideos = [videoId, ...this.state.recentVideos.filter(id => id !== videoId)].slice(0, 8);
    localStorage.setItem(STORAGE_KEYS.recent, JSON.stringify(this.state.recentVideos));
  }

  /** Full re-render of the app shell (e.g. after theme or layout changes). Destroys and remounts the map. */
  public render(): void {
    this.mapMaximized = false;
    document.body.classList.remove('map-is-maximized');
    this.mapWilderness.destroy();
    this.app.innerHTML = this.getTemplate();
    this.attachHandlers();
    this.initMap();
    this.restorePlayer();
    this.updateStatusBadge();
    this.setView(this.state.activeView, false);
    requestAnimationFrame(() => {
      this.mapWilderness.invalidateSize();
      this.scrollCarouselToSelected();
    });
  }

  /** Mounts the Leaflet map or shows an offline placeholder. */
  private initMap(): void {
    const container = document.getElementById('mapwilderness-map');
    if (!container) return;

    if (typeof L === 'undefined') {
      container.innerHTML = '<div class="map-offline"><p>Connect to the internet to load the wilderness map.</p></div>';
      return;
    }

    this.mapWilderness.mount(
      container,
      this.getFilteredVideos(),
      this.state.selectedVideoId,
      this.state.selectedState,
      getStateCodesWithWilderness(),
      (videoId, watch) => this.selectVideo(videoId, {
        highlightMap: true,
        flyToMap: false,
        startPlayback: watch,
        switchToWatch: watch
      }),
      (stateCode) => this.selectState(stateCode)
    );
  }

  /** Reloads the YouTube iframe when revisiting the watch view. */
  private restorePlayer(): void {
    const selected = this.getSelectedVideo();
    const shell = document.getElementById('playerShell');
    if (!shell || !selected) return;
    this.loadPlayer(shell, selected, this.state.playerStarted);
  }

  /** HTML for the explore view (map, carousel, filters). */
  private getTemplate(): string {
    const filtered = this.getFilteredVideos();
    const selected = this.getSelectedVideo();

    return `
      <main class="app-main">
        <section id="view-explore" class="view-panel${this.state.activeView === 'explore' ? ' active' : ''}" aria-label="Explore wilderness">
          <div class="explore-toolbar">
            <div class="toolbar-filters">
              <label class="search-field compact-search">
                <span class="visually-hidden">Search wilderness</span>
                <input id="search-input" type="search" placeholder="Search wilderness, tags, creators…" value="${this.escapeHtml(this.state.searchQuery)}" autocomplete="off">
              </label>
              <label class="compact-select">
                <span class="visually-hidden">Difficulty</span>
                <select id="difficulty-filter">
                  <option value="all" ${this.state.difficultyFilter === 'all' ? 'selected' : ''}>Any difficulty</option>
                  <option value="easy" ${this.state.difficultyFilter === 'easy' ? 'selected' : ''}>Easy</option>
                  <option value="moderate" ${this.state.difficultyFilter === 'moderate' ? 'selected' : ''}>Moderate</option>
                  <option value="hard" ${this.state.difficultyFilter === 'hard' ? 'selected' : ''}>Hard</option>
                </select>
              </label>
              <label class="toggle-field compact-toggle">
                <input id="favorites-filter" type="checkbox" ${this.state.favoritesOnly ? 'checked' : ''}>
                <span>★ Saved</span>
              </label>
            </div>
          </div>

          <div class="explore-layout">
            <div class="map-wrap map-wrap-full">
              <div class="map-stage">
                <div id="mapwilderness-map" class="map-panel" role="application" aria-label="Map Wilderness map"></div>
                <div class="map-vignette" aria-hidden="true"></div>
                <div class="map-controls">
                  <button type="button" id="locateMeButton" class="map-control-btn" aria-label="Find my location">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <span class="map-control-label">My location</span>
                  </button>
                  <button type="button" id="fitWildernessButton" class="map-control-btn" aria-label="Show all wilderness on map">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M4 9V4h5M15 4h5v5M4 15v5h5M15 20h5v-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <span class="map-control-label">Fit wilderness</span>
                  </button>
                </div>
                <div class="map-controls-br">
                  <button type="button" id="mapMaximizeButton" class="map-control-btn map-maximize-btn" aria-label="Maximize map" aria-pressed="false">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M16 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <span class="visually-hidden">Expand map</span>
                  </button>
                </div>
                <div id="mapToast" class="map-toast" role="status" aria-live="polite" hidden></div>
              </div>
              ${this.buildMapLegend()}
            </div>

            <section class="wilderness-carousel-section" aria-labelledby="wildernessCarouselTitle">
              <div class="carousel-header">
                <div>
                  <h2 id="wildernessCarouselTitle">Wilderness videos</h2>
                  <p class="carousel-subtitle">
                    <span id="resultCount" aria-live="polite">${filtered.length}</span> videos
                    · <span id="placeCount">${groupByPlace(filtered).length}</span> places
                    ${this.state.selectedState ? `<span class="carousel-state-note">in ${this.escapeHtml(getVideoAreaLabel('us', this.state.selectedState))}</span>` : ''}
                  </p>
                </div>
                <div class="carousel-nav-buttons">
                  <button type="button" id="carouselPrev" class="carousel-nav-btn" aria-label="Scroll videos left">‹</button>
                  <button type="button" id="carouselNext" class="carousel-nav-btn" aria-label="Scroll videos right">›</button>
                </div>
              </div>
              <div id="wildernessCarousel" class="wilderness-carousel-stack">
                ${this.buildWildernessCarousel(filtered)}
              </div>
            </section>
          </div>
        </section>

        <section id="view-watch" class="view-panel wilderness-detail-view${this.state.activeView === 'watch' ? ' active' : ''}" aria-labelledby="playerTitle">
          ${this.buildWatchSection(selected)}
        </section>

        <section id="view-saved" class="view-panel${this.state.activeView === 'saved' ? ' active' : ''}" aria-labelledby="savedTitle">
          <div class="saved-header">
            <div>
              <p class="eyebrow">On this device</p>
              <h2 id="savedTitle">Your wilderness</h2>
            </div>
            <button id="reset-data-button" class="secondary-button compact-button danger-button" type="button">Reset data</button>
          </div>

          <div class="saved-grid">
            <div class="saved-block">
              <h3>Favorites <span class="count-badge">${this.state.favorites.length}</span></h3>
              <div id="favoritesList" class="wilderness-list compact-saved">
                ${this.buildSavedList(this.state.favorites)}
              </div>
            </div>
            <div class="saved-block">
              <h3>Recently watched</h3>
              <div id="recentList" class="wilderness-list compact-saved">
                ${this.state.recentVideos.length === 0
                  ? '<p class="local-empty">No recent videos yet</p>'
                  : this.buildSavedList(this.state.recentVideos)}
              </div>
            </div>
          </div>
        </section>
      </main>

      <nav class="bottom-nav" aria-label="App sections">
        <button type="button" class="nav-item ${this.state.activeView === 'explore' ? 'active' : ''}" data-view="explore" aria-current="${this.state.activeView === 'explore' ? 'page' : 'false'}">
          <span class="nav-icon" aria-hidden="true">🗺</span>
          Explore
        </button>
        <button type="button" class="nav-item ${this.state.activeView === 'watch' ? 'active' : ''}" data-view="watch" aria-current="${this.state.activeView === 'watch' ? 'page' : 'false'}">
          <span class="nav-icon" aria-hidden="true">▶</span>
          Watch
          ${selected ? '<span class="nav-dot" aria-hidden="true"></span>' : ''}
        </button>
        <button type="button" class="nav-item ${this.state.activeView === 'saved' ? 'active' : ''}" data-view="saved" aria-current="${this.state.activeView === 'saved' ? 'page' : 'false'}">
          <span class="nav-icon" aria-hidden="true">★</span>
          Saved
        </button>
      </nav>
    `;
  }

  /** HTML for the watch/detail view for a selected video. */
  private buildWatchSection(selected: VideoWithRegion | undefined): string {
    if (!selected) {
      return `
        <div class="wilderness-detail wilderness-detail-empty">
          <div class="detail-empty-card">
            <span class="detail-empty-icon" aria-hidden="true">🏔</span>
            <h2 id="playerTitle">Choose a wilderness</h2>
            <p>Tap a video on the map or in the gallery below to open wilderness details and playback.</p>
            <button type="button" id="backToExplore" class="primary-button">Browse wilderness</button>
          </div>
        </div>`;
    }

    const regionColor = getCategoryColor(selected.category);
    const isFavorite = this.state.favorites.includes(selected.id);
    const place = getPlaceForVideo(selected.id);
    const difficultyClass = selected.difficulty.toLowerCase();

    return `
      <article class="wilderness-detail">
        <div class="wilderness-detail-hero" style="--hero-image: url('${selected.thumbnail}')">
          <div class="wilderness-detail-hero-bg" aria-hidden="true"></div>
          <div class="wilderness-detail-hero-overlay" aria-hidden="true"></div>
          <div class="wilderness-detail-toolbar">
            <button type="button" id="backToExplore" class="detail-back-btn">← Explore</button>
          </div>
          <div id="playerStage" class="player-stage">
            <div id="playerShell" class="player-shell player-shell-cinema">
              <div class="player-placeholder">
                <span aria-hidden="true">▶</span>
                <p>Press play to start the wilderness video in-app.</p>
              </div>
            </div>
            <button type="button" id="player-fullscreen-button" class="player-fullscreen-btn" aria-label="Enter fullscreen" aria-pressed="false">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M16 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="wilderness-detail-sheet">
          <div class="detail-sheet-accent" style="background: linear-gradient(90deg, ${regionColor}, transparent)" aria-hidden="true"></div>

          <header class="detail-sheet-header">
            <div class="detail-title-block">
              <span class="detail-region-pill" style="--pill-color: ${regionColor}">${this.escapeHtml(selected.categoryName)}</span>
              ${place && place.videos.length > 1 ? `<span class="detail-place-pill">${place.videos.length} videos here</span>` : ''}
              <h1 id="playerTitle">${this.escapeHtml(selected.title)}</h1>
              <p class="detail-creator">Filmed by <strong>${this.escapeHtml(selected.creator)}</strong></p>
            </div>
          </header>

          <div class="detail-stats" id="detailStats">
            <div class="detail-stat detail-stat-difficulty stat-${difficultyClass}">
              <span class="detail-stat-label">Difficulty</span>
              <strong id="statDifficulty">${this.escapeHtml(selected.difficulty)}</strong>
            </div>
            <div class="detail-stat">
              <span class="detail-stat-label">Distance</span>
              <strong id="statDistance">${this.escapeHtml(selected.distance)}</strong>
            </div>
            <div class="detail-stat">
              <span class="detail-stat-label">Duration</span>
              <strong id="statDuration">${this.escapeHtml(selected.duration)}</strong>
            </div>
            <div class="detail-stat">
              <span class="detail-stat-label">Category</span>
              <strong id="statRegion">${this.escapeHtml(selected.categoryName)}</strong>
            </div>
          </div>

          <div class="detail-actions">
            <button id="start-watch-button" class="primary-button detail-play-btn" type="button">
              <span aria-hidden="true">▶</span> Play wilderness video
            </button>
            <div class="detail-actions-secondary">
              <button id="favorite-route-button" class="secondary-button ${isFavorite ? 'is-saved' : ''}" type="button">
                ${isFavorite ? '★ Saved' : '☆ Save'}
              </button>
              <button type="button" id="viewOnMapButton" class="secondary-button">View on map</button>
            </div>
          </div>

          <ul class="detail-tags pill-list" id="detailTags">
            ${selected.tags.map(t => `<li>${this.escapeHtml(t)}</li>`).join('')}
          </ul>

          <div id="placeSwitcher">${this.buildPlaceSwitcher(selected)}</div>
        </div>
      </article>`;
  }

  /** HTML for category legend filter buttons below the map. */
  private buildMapLegend(): string {
    return `
      <div class="map-legend" role="group" aria-label="Wilderness category legend and filters">
        <span class="map-legend-title">Legend</span>
        <div class="map-legend-items">
          <button type="button" class="map-legend-btn ${!this.state.currentCategory ? 'active' : ''}" data-category="">
            <span class="map-legend-dot map-legend-dot-all" aria-hidden="true"></span>
            All wilderness
          </button>
          ${WILDERNESS_CATEGORIES.map(c => `
            <button type="button" class="map-legend-btn ${this.state.currentCategory === c.id ? 'active' : ''}"
              data-category="${c.id}" style="--legend-color:${c.color}">
              <span class="map-legend-dot" style="background:${c.color}" aria-hidden="true"></span>
              ${this.escapeHtml(c.name)}
            </button>
          `).join('')}
        </div>
      </div>`;
  }

  /** HTML for category-grouped horizontal video carousel. */
  private buildWildernessCarousel(videos: VideoWithRegion[]): string {
    if (videos.length === 0) {
      return '<div class="carousel-empty"><strong>No wilderness match</strong><p>Try another category or search term.</p></div>';
    }

    const placeSizes = new Map<string, number>();
    for (const v of videos) {
      placeSizes.set(v.placeId, (placeSizes.get(v.placeId) ?? 0) + 1);
    }

    const categoriesToShow = this.state.currentCategory
      ? WILDERNESS_CATEGORIES.filter(c => c.id === this.state.currentCategory)
      : WILDERNESS_CATEGORIES;

    return categoriesToShow.map(category => {
      const categoryVideos = videos.filter(v =>
        this.state.currentCategory
          ? v.categoryIds.includes(category.id)
          : v.category === category.id
      );
      if (categoryVideos.length === 0) return '';

      return `
        <section class="carousel-region-block" aria-label="${this.escapeHtml(category.name)} wilderness">
          <div class="carousel-region-label">
            <span class="carousel-region-dot" style="background:${category.color}"></span>
            <h3>${this.escapeHtml(category.name)}</h3>
            <span class="carousel-region-count">${categoryVideos.length}</span>
          </div>
          <div class="wilderness-carousel-row" role="list">
            ${categoryVideos.map(v => this.buildCarouselCard(v, placeSizes.get(v.placeId)!)).join('')}
          </div>
        </section>`;
    }).join('');
  }

  /** HTML for one carousel video card button. */
  private buildCarouselCard(video: VideoWithRegion, placeVideoCount: number): string {
    const isSelected = this.state.selectedVideoId === video.id;
    const isFavorite = this.state.favorites.includes(video.id);
    const regionColor = getCategoryColor(video.category);
    const place = getPlaceForVideo(video.id);
    const placeLabel = placeVideoCount > 1 && place
      ? `${place.name} · ${place.videos.findIndex(v => v.id === video.id) + 1}/${placeVideoCount}`
      : '';

    return `
      <button type="button" class="wilderness-carousel-card ${isSelected ? 'selected' : ''}" data-video-id="${video.id}" role="listitem">
        <span class="carousel-card-art">
          <img src="${video.thumbnail}" alt="" loading="lazy">
          <span class="carousel-card-play" aria-hidden="true">▶</span>
          <span class="carousel-card-difficulty diff-${video.difficulty.toLowerCase()}">${this.escapeHtml(video.difficulty)}</span>
          <span class="carousel-card-duration">${this.escapeHtml(video.duration)}</span>
          ${isFavorite ? '<span class="carousel-card-fav" aria-hidden="true">★</span>' : ''}
        </span>
        <span class="carousel-card-body">
          <span class="carousel-card-region" style="color:${regionColor}">${this.escapeHtml(video.categoryName)}</span>
          ${placeLabel ? `<span class="carousel-card-place">${this.escapeHtml(placeLabel)}</span>` : ''}
          <strong>${this.escapeHtml(video.title)}</strong>
          <span class="carousel-card-meta">${this.escapeHtml(video.creator)} · ${this.escapeHtml(video.distance)}</span>
        </span>
      </button>`;
  }

  /** HTML for related videos at the same place on the watch view. */
  private buildPlaceSwitcher(selected: VideoWithRegion | undefined): string {
    if (!selected) return '';

    const place = getPlaceForVideo(selected.id);
    if (!place || place.videos.length <= 1) return '';

    return `
      <div class="detail-related">
        <h3 class="detail-related-title">More at ${this.escapeHtml(place.name)}</h3>
        <div class="detail-related-scroll" role="listbox" aria-label="Videos at ${this.escapeHtml(place.name)}">
          ${place.videos.map(v => `
            <button type="button" class="detail-related-card place-switcher-item ${v.id === selected.id ? 'active' : ''}"
              data-video-id="${v.id}" role="option" aria-selected="${v.id === selected.id}">
              <img src="${v.thumbnail}" alt="" loading="lazy">
              <span>
                <strong>${this.escapeHtml(v.title)}</strong>
                <span>${this.escapeHtml(v.duration)} · ${this.escapeHtml(v.difficulty)}</span>
              </span>
            </button>
          `).join('')}
        </div>
      </div>`;
  }

  /** HTML for one row in a video list. */
  private buildWildernessListItem(video: VideoWithRegion): string {
    const isSelected = this.state.selectedVideoId === video.id;
    const isFavorite = this.state.favorites.includes(video.id);
    const regionColor = getCategoryColor(video.category);

    return `
      <button type="button" class="wilderness-list-item ${isSelected ? 'selected' : ''}" data-video-id="${video.id}">
        <span class="wilderness-thumb">
          <img src="${video.thumbnail}" alt="" loading="lazy">
          <span class="wilderness-difficulty">${this.escapeHtml(video.difficulty)}</span>
        </span>
        <span class="wilderness-info">
          <span class="wilderness-region" style="color:${regionColor}">${this.escapeHtml(video.categoryName)}</span>
          <strong>${this.escapeHtml(video.title)}</strong>
          <span class="wilderness-meta">${this.escapeHtml(video.creator)} · ${this.escapeHtml(video.duration)} · ${this.escapeHtml(video.distance)}</span>
        </span>
        <span class="wilderness-fav ${isFavorite ? 'is-favorite' : ''}" aria-hidden="true">${isFavorite ? '★' : ''}</span>
      </button>
    `;
  }

  /** HTML for favorites or recent lists on the saved view. */
  private buildSavedList(ids: string[]): string {
    const items = ids
      .map(id => findVideoById(id))
      .filter((v): v is VideoWithRegion => Boolean(v));

    if (items.length === 0) {
      return '<p class="local-empty">No saved wilderness yet</p>';
    }

    return items.map(v => this.buildWildernessListItem(v)).join('');
  }

  /** YouTube nocookie embed URL with player params. */
  private buildEmbedUrl(youtubeId: string, autoplay: boolean): string {
    const url = new URL(`https://www.youtube-nocookie.com/embed/${youtubeId}`);
    url.searchParams.set('rel', '0');
    url.searchParams.set('modestbranding', '1');
    url.searchParams.set('playsinline', '1');
    url.searchParams.set('fs', '0');
    url.searchParams.set('iv_load_policy', '3');
    if (typeof window !== 'undefined') {
      url.searchParams.set('origin', window.location.origin);
    }
    if (autoplay) url.searchParams.set('autoplay', '1');
    return url.toString();
  }

  /** Injects the YouTube iframe (or offline placeholder) into the player shell. */
  private loadPlayer(shell: HTMLElement, video: VideoWithRegion, autoplay: boolean): void {
    shell.innerHTML = '';
    if (!this.state.onlineStatus) {
      shell.innerHTML = `
        <div class="player-placeholder">
          <span aria-hidden="true">📶</span>
          <p class="player-message">You're offline. Connect to load the video player.</p>
        </div>`;
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.title = `Video: ${video.title}`;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.src = this.buildEmbedUrl(video.youtubeId, autoplay);

    // Covers YouTube's bottom-left "Watch on YouTube" link (not removable via embed API).
    const brandMask = document.createElement('div');
    brandMask.className = 'player-brand-mask';
    brandMask.setAttribute('aria-hidden', 'true');

    shell.append(iframe, brandMask);
  }

  /** Selects a video, syncs map/carousel/watch UI, and optionally plays. */
  private selectVideo(
    videoId: string,
    options: {
      startPlayback?: boolean;
      switchToWatch?: boolean;
      highlightMap?: boolean;
      flyToMap?: boolean;
      fullscreen?: boolean;
    } = {}
  ): void {
    this.state.selectedVideoId = videoId;
    if (options.startPlayback) this.state.playerStarted = true;
    this.pushRecent(videoId);
    this.persistFilters();

    this.updateListSelection();
    this.updateWatchPanel();
    this.updateNavDot();

    if (options.highlightMap !== false) {
      this.mapWilderness.setSelected(videoId, options.flyToMap ?? false);
    }

    this.scrollCarouselToSelected();

    const selected = this.getSelectedVideo();
    const shell = document.getElementById('playerShell');
    if (selected && shell && options.startPlayback) {
      this.loadPlayer(shell, selected, true);
    }

    if (options.switchToWatch || options.startPlayback) {
      this.setView('watch');
    }

    if (options.startPlayback && options.fullscreen) {
      this.requestFullscreen().catch(() => undefined);
    }
  }

  /** Switches explore / watch / saved tab and updates nav state. */
  private setView(view: AppView, persist = true): void {
    this.state.activeView = view;
    if (persist) this.persistFilters();

    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `view-${view}`);
    });
    document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
      const match = btn.getAttribute('data-view') === view;
      btn.classList.toggle('active', match);
      btn.setAttribute('aria-current', match ? 'page' : 'false');
    });

    if (view === 'explore') {
      requestAnimationFrame(() => this.mapWilderness.invalidateSize());
    }
  }

  /** Syncs selected styling on carousel and list items. */
  private updateListSelection(): void {
    document.querySelectorAll('.wilderness-carousel-card, .wilderness-list-item').forEach(item => {
      const id = (item as HTMLElement).dataset.videoId ?? '';
      item.classList.toggle('selected', id === this.state.selectedVideoId);
    });
  }

  /** Scrolls the carousel row to center the selected card. */
  private scrollCarouselToSelected(): void {
    const selected = document.querySelector('.wilderness-carousel-card.selected');
    const row = selected?.closest('.wilderness-carousel-row') as HTMLElement | null;
    if (!selected || !row) return;

    const card = selected as HTMLElement;
    const targetLeft = card.offsetLeft - (row.clientWidth - card.clientWidth) / 2;
    row.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
  }

  /** Re-renders the watch view for the current selection. */
  private updateWatchPanel(): void {
    const selected = this.getSelectedVideo();
    const root = document.getElementById('view-watch');
    if (!root) return;

    root.innerHTML = this.buildWatchSection(selected);

    if (selected) {
      const newShell = document.getElementById('playerShell');
      if (newShell && this.state.playerStarted) {
        this.loadPlayer(newShell, selected, false);
      }
    }

    this.attachPlayerHandlers();
    this.attachPlaceSwitcherHandlers();
    this.updateFullscreenButton();
    document.getElementById('backToExplore')?.addEventListener('click', () => this.setView('explore'));
    document.getElementById('viewOnMapButton')?.addEventListener('click', () => {
      this.setView('explore');
      if (this.state.selectedVideoId) {
        this.mapWilderness.setSelected(this.state.selectedVideoId, true);
      }
    });
  }

  /** Click handlers for related-video cards on watch view. */
  private attachPlaceSwitcherHandlers(): void {
    document.querySelectorAll('.place-switcher-item, .detail-related-card').forEach(item => {
      item.addEventListener('click', () => {
        const videoId = (item as HTMLElement).dataset.videoId ?? '';
        this.selectVideo(videoId, { highlightMap: false, switchToWatch: true });
      });
    });
  }

  /** Shows/hides the dot on the Watch bottom-nav item. */
  private updateNavDot(): void {
    const watchNav = document.querySelector('.bottom-nav [data-view="watch"]');
    if (!watchNav) return;
    watchNav.querySelector('.nav-dot')?.remove();
    if (this.state.selectedVideoId) {
      const dot = document.createElement('span');
      dot.className = 'nav-dot';
      dot.setAttribute('aria-hidden', 'true');
      watchNav.appendChild(dot);
    }
  }

  /** Adds or removes a video id from favorites in localStorage. */
  private toggleFavorite(videoId: string): void {
    const index = this.state.favorites.indexOf(videoId);
    if (index > -1) {
      this.state.favorites.splice(index, 1);
    } else {
      this.state.favorites.push(videoId);
    }
    localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(this.state.favorites));
  }

  /** Sets the map state filter and refreshes explore content. */
  private selectState(stateCode: string | null): void {
    this.state.selectedState = stateCode;
    this.persistFilters();
    this.updateStateFilterUi();
    this.updateExploreContent();
  }

  /** Updates carousel subtitle when a state filter is active. */
  private updateStateFilterUi(): void {
    const subtitle = document.querySelector('.carousel-subtitle');
    if (!subtitle) return;

    subtitle.querySelector('.carousel-state-note')?.remove();
    if (this.state.selectedState) {
      const note = document.createElement('span');
      note.className = 'carousel-state-note';
      note.textContent = `in ${getVideoAreaLabel('us', this.state.selectedState)}`;
      subtitle.appendChild(note);
    }
  }

  /** Refreshes carousel, counts, and map for current filters. */
  private updateExploreContent(options: { fitMap?: boolean; scrollCarousel?: boolean } = {}): void {
    const filtered = this.getFilteredVideos();

    if (this.state.selectedVideoId && !filtered.some(v => v.id === this.state.selectedVideoId)) {
      this.state.selectedVideoId = null;
      this.persistFilters();
      this.updateListSelection();
      this.updateNavDot();
    }

    const carousel = document.getElementById('wildernessCarousel');
    const count = document.getElementById('resultCount');
    const placeCount = document.getElementById('placeCount');
    if (carousel) carousel.innerHTML = this.buildWildernessCarousel(filtered);
    if (count) count.textContent = String(filtered.length);
    if (placeCount) placeCount.textContent = String(groupByPlace(filtered).length);
    this.mapWilderness.sync(filtered, this.state.selectedVideoId, this.state.selectedState, getStateCodesWithWilderness());
    this.attachCarouselHandlers();
    if (options.scrollCarousel !== false) {
      this.scrollCarouselToSelected();
    }
    if (options.fitMap) {
      requestAnimationFrame(() => this.mapWilderness.fitAllWilderness());
    }
  }

  /** Shows or hides the offline badge in the header. */
  private updateStatusBadge(): void {
    const headerInner = document.querySelector('.app-header-inner');
    const existing = document.querySelector('.offline-badge');
    if (!this.state.onlineStatus && !existing && headerInner) {
      const badge = document.createElement('span');
      badge.className = 'offline-badge';
      badge.textContent = 'Offline';
      headerInner.appendChild(badge);
    } else if (this.state.onlineStatus && existing) {
      existing.remove();
    }
  }

  /** Returns the fullscreen wrapper element around the video player. */
  private getPlayerStage(): HTMLElement | null {
    return document.getElementById('playerStage');
  }

  /** Toggles native or fallback fullscreen on the player stage. */
  private async requestFullscreen(): Promise<void> {
    const stage = this.getPlayerStage();
    if (!stage) return;

    const isFs = Boolean(
      document.fullscreenElement === stage ||
      (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement === stage ||
      stage.classList.contains('pwa-fullscreen')
    );

    if (isFs) {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if ((document as Document & { webkitExitFullscreen?: () => void }).webkitExitFullscreen) {
        (document as Document & { webkitExitFullscreen: () => void }).webkitExitFullscreen();
      }
      stage.classList.remove('pwa-fullscreen');
      document.getElementById('pwaFullscreenClose')?.remove();
    } else {
      try {
        if (stage.requestFullscreen) await stage.requestFullscreen();
        else if ((stage as HTMLElement & { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen) {
          (stage as HTMLElement & { webkitRequestFullscreen: () => void }).webkitRequestFullscreen();
        } else {
          stage.classList.add('pwa-fullscreen');
          this.createPwaCloseButton();
        }
      } catch {
        stage.classList.add('pwa-fullscreen');
        this.createPwaCloseButton();
      }
    }
    this.updateFullscreenButton();
  }

  /** Adds a fixed close button when using CSS fullscreen fallback. */
  private createPwaCloseButton(): void {
    if (document.getElementById('pwaFullscreenClose')) return;
    const btn = document.createElement('button');
    btn.id = 'pwaFullscreenClose';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Exit fullscreen');
    btn.textContent = '✕';
    btn.addEventListener('click', () => this.requestFullscreen());
    document.body.appendChild(btn);
  }

  /** Syncs pane fullscreen button label/icon. */
  private updateFullscreenButton(): void {
    const stage = this.getPlayerStage();
    const paneBtn = document.getElementById('player-fullscreen-button');
    if (!stage) return;

    const isFs = Boolean(
      document.fullscreenElement === stage ||
      (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement === stage ||
      stage.classList.contains('pwa-fullscreen')
    );

    if (paneBtn) {
      paneBtn.innerHTML = isFs
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 14h6v6M14 4h6v6M20 14v6h-6M10 4H4v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M16 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
      paneBtn.setAttribute('aria-label', isFs ? 'Exit fullscreen' : 'Enter fullscreen');
      paneBtn.setAttribute('aria-pressed', isFs ? 'true' : 'false');
    }
  }

  /** Escapes text for safe HTML template insertion. */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /** Expands the explore map to a maximized overlay layout. */
  private toggleMapMaximize(): void {
    const wrap = document.querySelector('.map-wrap-full');
    const btn = document.getElementById('mapMaximizeButton');
    if (!wrap) return;

    this.mapMaximized = !this.mapMaximized;
    wrap.classList.toggle('map-maximized', this.mapMaximized);
    document.body.classList.toggle('map-is-maximized', this.mapMaximized);

    if (btn) {
      btn.setAttribute('aria-pressed', this.mapMaximized ? 'true' : 'false');
      btn.setAttribute('aria-label', this.mapMaximized ? 'Exit expanded map' : 'Maximize map');
      btn.innerHTML = this.mapMaximized
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 14h6v6M14 4h6v6M20 14v6h-6M10 4H4v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span class="visually-hidden">Close expanded map</span>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M16 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span class="visually-hidden">Expand map</span>`;
    }

    requestAnimationFrame(() => this.mapWilderness.invalidateSize());
  }

  /** Wires all top-level UI event listeners after render. */
  private attachHandlers(): void {
    this.attachCarouselHandlers();
    this.attachListHandlers();
    this.attachFilterHandlers();
    this.attachPlayerHandlers();
    this.updateFullscreenButton();
    this.attachNavHandlers();
    this.attachMapHandlers();
    this.attachPlaceSwitcherHandlers();

    document.getElementById('backToExplore')?.addEventListener('click', () => this.setView('explore'));

    document.querySelector('.brand')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.setView('explore');
    });

    document.getElementById('reset-data-button')?.addEventListener('click', () => {
      if (!confirm('Clear favorites, recent videos, and preferences?')) return;
      localStorage.removeItem(STORAGE_KEYS.favorites);
      localStorage.removeItem(STORAGE_KEYS.recent);
      localStorage.removeItem(STORAGE_KEYS.filters);
      this.state.favorites = [];
      this.state.recentVideos = [];
      this.state.selectedVideoId = null;
      this.state.playerStarted = false;
      this.state.searchQuery = '';
      this.state.currentCategory = null;
      this.state.selectedState = null;
      this.state.difficultyFilter = 'all';
      this.state.favoritesOnly = false;
      this.state.activeView = 'explore';
      this.render();
    });

    document.addEventListener('fullscreenchange', () => this.updateFullscreenButton());
    document.addEventListener('webkitfullscreenchange', () => this.updateFullscreenButton());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.mapMaximized) {
        this.toggleMapMaximize();
      }
    });
  }

  /** Click and scroll handlers for the video carousel. */
  private attachCarouselHandlers(): void {
    document.querySelectorAll('.wilderness-carousel-card').forEach(card => {
      card.addEventListener('click', () => {
        const videoId = (card as HTMLElement).dataset.videoId ?? '';
        this.selectVideo(videoId, { highlightMap: true, flyToMap: false, switchToWatch: true });
      });
    });

    /** Scrolls a carousel row horizontally by one viewport chunk. */
    const scrollRow = (direction: number): void => {
      const selectedRow = document.querySelector('.wilderness-carousel-card.selected')?.closest('.wilderness-carousel-row');
      const row = selectedRow ?? document.querySelector('.wilderness-carousel-row');
      if (!row) return;
      const amount = Math.min(340, row.clientWidth * 0.85);
      row.scrollBy({ left: direction * amount, behavior: 'smooth' });
    };

    document.getElementById('carouselPrev')?.addEventListener('click', () => scrollRow(-1));
    document.getElementById('carouselNext')?.addEventListener('click', () => scrollRow(1));
  }

  /** Click handlers for list rows (saved/explore). */
  private attachListHandlers(): void {
    document.querySelectorAll('.wilderness-list-item').forEach(item => {
      item.addEventListener('click', () => {
        const videoId = (item as HTMLElement).dataset.videoId ?? '';
        const fromSaved = Boolean(item.closest('#view-saved'));
        this.selectVideo(videoId, {
          highlightMap: !fromSaved,
          flyToMap: fromSaved,
          switchToWatch: fromSaved
        });
      });
    });
  }

  /** Handlers for search, difficulty, favorites, and legend filters. */
  private attachFilterHandlers(): void {
    document.querySelectorAll('.map-legend-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const category = (btn as HTMLElement).dataset.category ?? '';
        this.state.currentCategory = category || null;
        this.state.selectedState = null;
        this.persistFilters();
        document.querySelectorAll('.map-legend-btn').forEach(b => {
          b.classList.toggle('active', b === btn);
        });
        this.updateStateFilterUi();
        this.updateExploreContent({ fitMap: true, scrollCarousel: false });
        (btn as HTMLButtonElement).blur();
      });
    });

    const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
    searchInput?.addEventListener('input', (e) => {
      this.state.searchQuery = (e.target as HTMLInputElement).value;
      this.persistFilters();
      if (this.searchDebounce) clearTimeout(this.searchDebounce);
      this.searchDebounce = setTimeout(() => this.updateExploreContent(), 200);
    });

    document.getElementById('difficulty-filter')?.addEventListener('change', (e) => {
      this.state.difficultyFilter = (e.target as HTMLSelectElement).value;
      this.persistFilters();
      this.updateExploreContent();
    });

    document.getElementById('favorites-filter')?.addEventListener('change', (e) => {
      this.state.favoritesOnly = (e.target as HTMLInputElement).checked;
      this.persistFilters();
      this.updateExploreContent();
    });
  }

  /** Handlers for play, favorite, and fullscreen on watch view. */
  private attachPlayerHandlers(): void {
    /** Toggles player fullscreen from the pane button. */
    const toggleFullscreen = (): void => {
      this.requestFullscreen().catch(() => undefined);
    };

    document.getElementById('player-fullscreen-button')?.addEventListener('click', toggleFullscreen);

    document.getElementById('start-watch-button')?.addEventListener('click', () => {
      const selected = this.getSelectedVideo();
      const shell = document.getElementById('playerShell');
      if (!selected || !shell) return;
      this.state.playerStarted = true;
      this.loadPlayer(shell, selected, true);
      this.requestFullscreen().catch(() => undefined);
    });

    document.getElementById('favorite-route-button')?.addEventListener('click', () => {
      if (!this.state.selectedVideoId) return;
      this.toggleFavorite(this.state.selectedVideoId);
      this.updateWatchPanel();
      this.updateExploreContent();
      const favCount = document.querySelector('.count-badge');
      if (favCount) favCount.textContent = String(this.state.favorites.length);
      const favList = document.getElementById('favoritesList');
      if (favList) favList.innerHTML = this.buildSavedList(this.state.favorites);
      this.attachListHandlers();
    });
  }

  /** Handlers for locate, fit-all, and map maximize controls. */
  private attachMapHandlers(): void {
    document.getElementById('locateMeButton')?.addEventListener('click', () => {
      this.handleLocateMe();
    });

    document.getElementById('fitWildernessButton')?.addEventListener('click', () => {
      this.mapWilderness.fitAllWilderness();
      this.showMapToast('Showing all wilderness on the map');
    });

    document.getElementById('mapMaximizeButton')?.addEventListener('click', () => {
      this.toggleMapMaximize();
    });
  }

  /** Runs geolocation and shows nearest wilderness in a map toast. */
  private handleLocateMe(): void {
    const btn = document.getElementById('locateMeButton');
    btn?.classList.add('is-loading');
    btn?.setAttribute('disabled', 'true');

    this.mapWilderness.locateUser()
      .then(result => {
        if (result.nearestVideo && result.nearestDistanceKm !== undefined) {
          this.showMapToast(
            `Nearest: ${result.nearestVideo.title} · ${formatDistance(result.nearestDistanceKm)}`
          );
        } else {
          this.showMapToast('Location found — explore nearby markers');
        }
      })
      .catch(err => {
        this.showMapToast(err instanceof Error ? err.message : 'Could not get location', 'error');
      })
      .finally(() => {
        btn?.classList.remove('is-loading');
        btn?.removeAttribute('disabled');
      });
  }

  /** Displays a temporary message overlay on the map. */
  private showMapToast(message: string, type: 'info' | 'error' = 'info'): void {
    const toast = document.getElementById('mapToast');
    if (!toast) return;
    toast.hidden = false;
    toast.textContent = message;
    toast.classList.toggle('is-error', type === 'error');
    toast.classList.add('is-visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      toast.classList.remove('is-visible');
      toast.hidden = true;
    }, 4500);
  }

  /** Bottom navigation and data-reset handlers. */
  private attachNavHandlers(): void {
    document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-view') as AppView;
        this.setView(view);
      });
    });
  }
}

declare const L: unknown;
