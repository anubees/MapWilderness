/**
 * Leaflet map — state/region boundaries, place markers, geolocation, and popups.
 * One marker per placeId; multiple videos at the same spot share a marker with a count badge.
 */
import { getCategoryColor } from './data';
import { DEFAULT_MAP_REGION, MapRegion } from './geo/regions.config';
import { groupByPlace, PlaceGroup } from './places';
import { VideoWithRegion } from './places';

export interface LocateResult {
  lat: number;
  lng: number;
  accuracy: number;
  stateCode: string | null;
  nearestVideo?: VideoWithRegion;
  nearestDistanceKm?: number;
}

interface LeafletMarker {
  addTo(map: LeafletMap): LeafletMarker;
  bindPopup(html: string, options?: Record<string, unknown>): LeafletMarker;
  on(event: string, handler: () => void): LeafletMarker;
  openPopup(): LeafletMarker;
  closePopup(): LeafletMarker;
  setIcon(icon: unknown): LeafletMarker;
  setLatLng(latlng: [number, number]): LeafletMarker;
  remove(): void;
}

interface LeafletCircle {
  addTo(map: LeafletMap): LeafletCircle;
  setLatLng(latlng: [number, number]): LeafletCircle;
  setRadius(radius: number): LeafletCircle;
  remove(): void;
}

interface LeafletMap {
  remove(): void;
  fitBounds(bounds: unknown, options?: {
    padding?: [number, number];
    paddingTopLeft?: [number, number];
    paddingBottomRight?: [number, number];
    maxZoom?: number;
    animate?: boolean;
    duration?: number;
  }): void;
  flyToBounds(bounds: unknown, options?: {
    padding?: [number, number];
    paddingTopLeft?: [number, number];
    paddingBottomRight?: [number, number];
    maxZoom?: number;
    duration?: number;
  }): void;
  flyTo(latlng: [number, number], zoom: number, options?: { duration?: number }): void;
  getBounds(): { contains(latlng: [number, number]): boolean };
  getZoom(): number;
  invalidateSize(): void;
  once(event: string, handler: () => void): void;
  on(event: string, handler: () => void): void;
  createPane(name: string): HTMLElement;
  getPane(name: string): HTMLElement | undefined;
}

interface GeoJsonLayer {
  addTo(map: LeafletMap): GeoJsonLayer;
  remove(): void;
  resetStyle(layer?: StatePathLayer): void;
  eachLayer(fn: (layer: StatePathLayer) => void): void;
  getBounds(): unknown;
}

interface StatePathLayer {
  feature?: {
    properties?: Record<string, string>;
    geometry?: { type?: string; coordinates?: unknown };
  };
  setStyle(style: Record<string, unknown>): void;
  getBounds(): unknown;
  bindTooltip(content: string, options?: Record<string, unknown>): StatePathLayer;
  on(event: string, handler: () => void): StatePathLayer;
}

interface LeafletLayer {
  addTo(map: LeafletMap): LeafletLayer;
}

/** Minimal Leaflet typings — full types are not bundled; L is loaded from CDN in index.html. */
declare const L: {
  map(el: HTMLElement, options?: Record<string, unknown>): LeafletMap;
  tileLayer(url: string, options?: Record<string, unknown>): LeafletLayer;
  marker(latlng: [number, number], options?: Record<string, unknown>): LeafletMarker;
  circle(latlng: [number, number], options?: Record<string, unknown>): LeafletCircle;
  latLngBounds(points: [number, number][] | unknown): unknown;
  divIcon(options: Record<string, unknown>): unknown;
  geoJSON(
    data: unknown,
    options?: {
      pane?: string;
      style?: (feature?: { properties?: Record<string, string> }) => Record<string, unknown>;
      onEachFeature?: (feature: { properties?: Record<string, string> }, layer: StatePathLayer) => void;
    }
  ): GeoJsonLayer;
  control: {
    /** Zoom. */
    zoom(options?: { position?: string }): { addTo(map: LeafletMap): void };
  };
};

/** Haversine distance in kilometres (used for "nearest wilderness" and popup labels). */
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  /** Converts degrees to radians. */
  const toRad = (d: number) => (d * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Ray-casting point-in-polygon for one GeoJSON ring ([lng, lat] vertices). */
function pointInRing(lat: number, lng: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersects =
      (yi > lat) !== (yj > lat) &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** True when a lat/lng lies inside a GeoJSON Polygon or MultiPolygon. */
function pointInGeoJsonGeometry(
  lat: number,
  lng: number,
  geometry?: { type?: string; coordinates?: unknown }
): boolean {
  if (!geometry?.type || !geometry.coordinates) return false;

  /** Tests outer ring and subtracts polygon holes. */
  const inPolygon = (rings: number[][][]): boolean => {
    if (!rings.length || !pointInRing(lat, lng, rings[0])) return false;
    for (let i = 1; i < rings.length; i++) {
      if (pointInRing(lat, lng, rings[i])) return false;
    }
    return true;
  };

  if (geometry.type === 'Polygon') {
    return inPolygon(geometry.coordinates as number[][][]);
  }
  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates as number[][][][]).some(inPolygon);
  }
  return false;
}

/** Formats kilometres as metres or miles for popup labels. */
function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  const miles = km * 0.621371;
  if (miles < 10) return `${miles.toFixed(1)} mi away`;
  return `${Math.round(miles)} mi away`;
}

export class MapWildernessMap {
  /** Active boundary layer config. Swap when adding non-US regions in a future phase. */
  private mapRegion: MapRegion = DEFAULT_MAP_REGION;
  private map: LeafletMap | null = null;
  private placeMarkers = new Map<string, LeafletMarker>();
  private stateLayers = new Map<string, StatePathLayer>();
  private statesGeoLayer: GeoJsonLayer | null = null;
  private container: HTMLElement | null = null;
  private selectedId: string | null = null;
  private selectedState: string | null = null;
  private stateCodesWithWilderness = new Set<string>();
  private discoveryMode = false;
  private interactiveStateCodes = new Set<string>();
  private onSelect: ((videoId: string, watch: boolean) => void) | null = null;
  private onStateSelect: ((stateCode: string | null) => void) | null = null;
  private currentVideos: VideoWithRegion[] = [];
  private userMarker: LeafletMarker | null = null;
  private userAccuracy: LeafletCircle | null = null;
  private userLatLng: [number, number] | null = null;
  private popupHandler: ((e: Event) => void) | null = null;
  private onExpandRequest: (() => void) | null = null;
  private statesLoading = false;
  /** Last state the map was framed to — avoids refitting on filter-only updates. */
  private framedStateCode: string | null = null;

  /** Create or update the map on first mount; subsequent calls sync markers and selection. */
  mount(
    container: HTMLElement,
    videos: VideoWithRegion[],
    selectedId: string | null,
    selectedState: string | null,
    stateCodesWithWilderness: Set<string>,
    discoveryMode: boolean,
    interactiveStateCodes: Set<string>,
    onSelect: (videoId: string, watch: boolean) => void,
    onStateSelect: (stateCode: string | null) => void,
    onExpandRequest?: () => void
  ): void {
    this.container = container;
    this.onSelect = onSelect;
    this.onStateSelect = onStateSelect;
    this.onExpandRequest = onExpandRequest ?? null;
    this.selectedId = selectedId;
    this.selectedState = selectedState;
    this.stateCodesWithWilderness = stateCodesWithWilderness;
    this.discoveryMode = discoveryMode;
    this.interactiveStateCodes = interactiveStateCodes;
    this.currentVideos = videos;

    if (!this.map) {
      container.innerHTML = '';
      this.map = L.map(container, {
        zoomControl: false,
        scrollWheelZoom: true,
        doubleClickZoom: false,
        attributionControl: true,
        minZoom: 3,
        maxZoom: 14
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap &copy; CARTO'
      }).addTo(this.map);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19,
        pane: 'overlayPane',
        opacity: 0.85
      }).addTo(this.map);

      L.control.zoom({ position: 'bottomright' }).addTo(this.map);

      this.map.createPane('statesPane');
      const statesPane = this.map.getPane('statesPane');
      if (statesPane) statesPane.style.zIndex = '350';

      this.loadStatesLayer();

      const [[south, west], [north, east]] = this.mapRegion.defaultBounds;
      this.map.fitBounds(
        L.latLngBounds([[south, west], [north, east]]) as [number, number][],
        { padding: [32, 32], maxZoom: 5 }
      );

      /** Delegates clicks inside map popups to video select/watch handlers. */
      this.popupHandler = (e: Event) => {
        const watchBtn = (e.target as HTMLElement).closest('.map-popup-watch[data-popup-video-id]');
        if (watchBtn) {
          e.preventDefault();
          const videoId = watchBtn.getAttribute('data-popup-video-id');
          if (videoId) this.onSelect?.(videoId, true);
          return;
        }

        const target = (e.target as HTMLElement).closest('.map-popup-video[data-popup-video-id]');
        if (!target) return;
        e.preventDefault();
        const videoId = target.getAttribute('data-popup-video-id');
        if (videoId) this.onSelect?.(videoId, false);
      };
      container.addEventListener('click', this.popupHandler);

      this.map.on('dragstart', () => this.closeAllPopups());
      this.map.on('zoomstart', () => this.closeAllPopups());
      this.map.on('dblclick', () => this.onExpandRequest?.());
    }

    this.syncPlaceMarkers(videos);
    this.refreshStateStyles();
    if (selectedId) {
      this.highlightSelected(selectedId, false, false);
    } else if (selectedState) {
      this.flyToState(selectedState);
    } else if (!this.discoveryMode && videos.length > 0) {
      this.fitToVideos(videos);
    }

    this.openPopupIfSinglePlace(videos);

    requestAnimationFrame(() => {
      this.map?.invalidateSize();
      window.setTimeout(() => this.map?.invalidateSize(), 120);
    });
  }

  /** Refresh markers and map framing after filters change without tearing down Leaflet. */
  sync(
    videos: VideoWithRegion[],
    selectedId: string | null,
    selectedState: string | null = this.selectedState,
    stateCodesWithWilderness: Set<string> = this.stateCodesWithWilderness,
    discoveryMode: boolean = this.discoveryMode,
    interactiveStateCodes: Set<string> = this.interactiveStateCodes
  ): void {
    this.selectedId = selectedId;
    this.selectedState = selectedState;
    this.stateCodesWithWilderness = stateCodesWithWilderness;
    this.discoveryMode = discoveryMode;
    this.interactiveStateCodes = interactiveStateCodes;
    this.currentVideos = videos;
    if (!this.map || !this.container) return;
    this.closeAllPopups();
    this.syncPlaceMarkers(videos);
    this.refreshStateStyles();
    if (selectedId) {
      this.highlightSelected(selectedId, false, false);
    } else if (selectedState) {
      if (this.framedStateCode !== selectedState) {
        this.flyToState(selectedState);
      } else {
        this.focusVideosIfNeeded(videos);
      }
    } else {
      this.framedStateCode = null;
      if (!this.discoveryMode && !this.userLatLng) {
        this.fitToVideos(videos);
      }
    }

    this.openPopupIfSinglePlace(videos);
  }

  /** Sets the highlighted state and optionally flies the map to it. */
  setSelectedState(stateCode: string | null, fly = true): void {
    this.selectedState = stateCode;
    this.refreshStateStyles();
    if (stateCode && fly) {
      this.flyToState(stateCode);
    }
  }

  /** Highlights the marker for a video and optionally opens its popup. */
  setSelected(videoId: string | null, fly = true): void {
    this.selectedId = videoId;
    if (!videoId) return;
    this.highlightSelected(videoId, fly, fly);
  }

  /** Closes every open place-marker popup. */
  private closeAllPopups(): void {
    this.placeMarkers.forEach(marker => marker.closePopup());
  }

  /** Leaflet popup options for a place (width varies for multi-video). */
  private popupOptions(place: PlaceGroup): Record<string, unknown> {
    return {
      className: place.videos.length > 1 ? 'mapwilderness-popup mapwilderness-popup-wide' : 'mapwilderness-popup',
      maxWidth: place.videos.length > 1 ? 300 : 280,
      minWidth: 220,
      autoPan: true,
      autoPanPadding: [70, 70],
      keepInView: false
    };
  }

  /** When a single state is selected and only one place remains, open its popup automatically. */
  private openPopupIfSinglePlace(videos: VideoWithRegion[]): void {
    if (!this.selectedState) return;
    const places = groupByPlace(videos);
    if (places.length !== 1) return;
    this.openPlacePopup(places[0].id, true);
  }

  /** Opens a place marker popup, optionally after the map finishes moving. */
  private openPlacePopup(placeId: string, waitForMove = false): void {
    const marker = this.placeMarkers.get(placeId);
    if (!marker || !this.map) return;

    /** Opens the place popup after optional map moveend wait. */
    const open = (): void => {
      marker.openPopup();
      requestAnimationFrame(() => this.map?.invalidateSize());
    };

    if (waitForMove) {
      this.map.once('moveend', open);
    } else {
      open();
    }
  }

  /** Frames the map to show all currently filtered videos. */
  fitAllWilderness(): void {
    this.fitToVideos(this.currentVideos);
  }

  /** Returns the US state code containing a lat/lng, if boundaries are loaded. */
  findStateCodeAt(lat: number, lng: number): string | null {
    for (const [code, layer] of this.stateLayers) {
      if (pointInGeoJsonGeometry(lat, lng, layer.feature?.geometry)) return code;
    }
    return null;
  }

  /** Requests geolocation, shows user marker, and frames nearest wilderness. */
  locateUser(): Promise<LocateResult> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported on this device.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const accuracy = position.coords.accuracy;
          this.userLatLng = [lat, lng];
          this.showUserLocation(lat, lng, accuracy);

          const stateCode = this.findStateCodeAt(lat, lng);
          const nearest = this.findNearestVideo(lat, lng, this.currentVideos);
          const nearestDistanceKm = nearest
            ? distanceKm(lat, lng, nearest.lat, nearest.lng)
            : undefined;

          if (this.map && !stateCode) {
            if (nearest && nearestDistanceKm !== undefined && nearestDistanceKm < 800) {
              this.map.fitBounds(
                L.latLngBounds([[lat, lng], [nearest.lat, nearest.lng]]) as [number, number][],
                { padding: [80, 80], maxZoom: 9 }
              );
            } else {
              this.map.flyTo([lat, lng], 8, { duration: 1 });
            }
          }

          resolve({
            lat,
            lng,
            accuracy,
            stateCode,
            nearestVideo: nearest,
            nearestDistanceKm
          });

          this.syncPlaceMarkers(this.currentVideos);
        },
        (error) => {
          const messages: Record<number, string> = {
            1: 'Location access was denied. Enable location in your browser settings.',
            2: 'Could not determine your location.',
            3: 'Location request timed out. Try again.'
          };
          reject(new Error(messages[error.code] ?? 'Unable to get your location.'));
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
      );
    });
  }

  /** Tells Leaflet to recalculate map size after layout changes. */
  invalidateSize(): void {
    this.map?.invalidateSize();
  }

  /** Tears down markers, layers, listeners, and the Leaflet instance. */
  destroy(): void {
    if (this.container && this.popupHandler) {
      this.container.removeEventListener('click', this.popupHandler);
    }
    this.popupHandler = null;
    this.clearUserLocation();
    this.placeMarkers.forEach(m => m.remove());
    this.placeMarkers.clear();
    this.statesGeoLayer?.remove();
    this.statesGeoLayer = null;
    this.stateLayers.clear();
    this.map?.remove();
    this.map = null;
    this.container = null;
    this.userLatLng = null;
    this.framedStateCode = null;
    this.onStateSelect = null;
    this.onExpandRequest = null;
  }

  /** Fetches and renders the region GeoJSON boundary layer. */
  private loadStatesLayer(): void {
    if (!this.map || this.statesGeoLayer || this.statesLoading) return;
    this.statesLoading = true;

    fetch(this.mapRegion.geoJsonUrl)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load state boundaries');
        return res.json();
      })
      .then(data => {
        if (!this.map) return;

        this.statesGeoLayer = L.geoJSON(data, {
          pane: 'statesPane',
          style: (feature) => this.stateStyleForFeature(feature),
          onEachFeature: (feature, layer) => {
            const name = this.featureName(feature);
            const code = this.areaCodeFromFeature(name);
            if (!code) return;

            this.stateLayers.set(code, layer);
          }
        }).addTo(this.map);

        this.refreshStateStyles();
        this.bindStateClickHandlers();
      })
      .catch((err) => {
        console.warn('State boundaries failed to load:', err);
      })
      .finally(() => {
        this.statesLoading = false;
      });
  }

  /** Reads the area name from a GeoJSON feature using the region config. */
  private featureName(feature?: { properties?: Record<string, string> }): string {
    const key = this.mapRegion.featureNameProperty;
    return feature?.properties?.[key] ?? '';
  }

  /** Converts a GeoJSON feature name to an area code. */
  private areaCodeFromFeature(name: string): string | undefined {
    return this.mapRegion.codeFromFeatureName(name);
  }

  /** Fill/stroke style for a state based on selection and video coverage. */
  private stateStyleForFeature(feature?: { properties?: Record<string, string> }): Record<string, unknown> {
    const name = this.featureName(feature);
    const code = this.areaCodeFromFeature(name);
    const hasWilderness = code ? this.stateCodesWithWilderness.has(code) : false;
    const hasCatalog = code ? this.interactiveStateCodes.has(code) : false;
    const selected = code === this.selectedState;
    const filteredOut = Boolean(this.selectedState && code && code !== this.selectedState);

    if (this.discoveryMode) {
      return {
        fillColor: '#1a2a33',
        fillOpacity: hasCatalog ? 0.1 : 0.03,
        color: '#2a3d48',
        weight: 1,
        interactive: hasCatalog
      };
    }

    if (selected) {
      return {
        fillColor: '#52d593',
        fillOpacity: 0.38,
        color: '#52d593',
        weight: 2.5,
        interactive: hasWilderness
      };
    }

    if (filteredOut || !hasWilderness) {
      return {
        fillColor: '#152028',
        fillOpacity: filteredOut ? 0.03 : 0.04,
        color: '#1e2d36',
        weight: 1,
        interactive: hasWilderness
      };
    }

    if (!this.selectedState) {
      return {
        fillColor: '#68d8ff',
        fillOpacity: 0.2,
        color: '#3d6878',
        weight: 1,
        interactive: true
      };
    }

    return {
      fillColor: '#2a4550',
      fillOpacity: 0.22,
      color: '#3d6878',
      weight: 1,
      interactive: true
    };
  }

  /** Attach click handlers after GeoJSON load (handlers depend on interactiveStateCodes). */
  private bindStateClickHandlers(): void {
    this.stateLayers.forEach((layer, code) => {
      if (!this.interactiveStateCodes.has(code)) return;
      layer.on('click', () => {
        if (this.selectedState === code) return;
        this.selectedState = code;
        this.refreshStateStyles();
        this.onStateSelect?.(code);
        this.flyToState(code);
      });
    });
  }

  /** Re-applies styles to every state polygon after filter/selection changes. */
  private refreshStateStyles(): void {
    if (!this.statesGeoLayer) return;
    this.statesGeoLayer.eachLayer(layer => {
      const name = this.featureName(layer.feature);
      const code = this.areaCodeFromFeature(name);
      if (!code) return;
      layer.setStyle(this.stateStyleForFeature(layer.feature));
    });
  }

  /** Pans/zooms the map so the selected state fills the viewport. */
  private flyToState(stateCode: string): void {
    const layer = this.stateLayers.get(stateCode);
    if (!layer || !this.map) return;
    this.animateToBounds(layer.getBounds());
    this.framedStateCode = stateCode;
  }

  /** Animated bounds fit with consistent padding (state + in-state results). */
  private animateToBounds(bounds: unknown): void {
    if (!this.map) return;
    const options = {
      paddingTopLeft: [12, 12] as [number, number],
      paddingBottomRight: [52, 12] as [number, number],
      maxZoom: 10,
      duration: 0.9
    };
    if (typeof this.map.flyToBounds === 'function') {
      this.map.flyToBounds(bounds, options);
    } else {
      this.map.fitBounds(bounds, { ...options, animate: true });
    }
  }

  /** True when every filtered place marker lies inside the current map view. */
  private areAllPlacesInView(videos: VideoWithRegion[]): boolean {
    if (!this.map || videos.length === 0) return true;
    const view = this.map.getBounds();
    return groupByPlace(videos).every(place => view.contains([place.lat, place.lng]));
  }

  /** Pans/zooms to filtered markers when they fall outside the viewport (e.g. category change). */
  private focusVideosIfNeeded(videos: VideoWithRegion[]): void {
    if (!this.map || videos.length === 0 || this.areAllPlacesInView(videos)) return;

    const places = groupByPlace(videos);
    if (places.length === 1) {
      const targetZoom = Math.min(Math.max(this.map.getZoom(), 8), 10);
      this.map.flyTo([places[0].lat, places[0].lng], targetZoom, { duration: 0.9 });
      return;
    }

    const points: [number, number][] = places.map(p => [p.lat, p.lng]);
    this.animateToBounds(L.latLngBounds(points) as [number, number][]);
  }

  /** Finds the closest filtered video to a lat/lng. */
  private findNearestVideo(
    lat: number,
    lng: number,
    videos: VideoWithRegion[]
  ): VideoWithRegion | undefined {
    if (videos.length === 0) return undefined;
    return videos.reduce((nearest, video) => {
      const d = distanceKm(lat, lng, video.lat, video.lng);
      const nearestD = distanceKm(lat, lng, nearest.lat, nearest.lng);
      return d < nearestD ? video : nearest;
    });
  }

  /** Draws the user dot, accuracy ring, and "You are here" popup. */
  private showUserLocation(lat: number, lng: number, accuracy: number): void {
    if (!this.map) return;

    const icon = L.divIcon({
      className: 'user-location-wrap',
      html: `
        <div class="user-location-marker" aria-hidden="true">
          <span class="user-location-ring"></span>
          <span class="user-location-dot"></span>
        </div>`,
      iconSize: [48, 48],
      iconAnchor: [24, 24]
    });

    if (this.userMarker) {
      this.userMarker.setLatLng([lat, lng]).setIcon(icon);
    } else {
      this.userMarker = L.marker([lat, lng], { icon, zIndexOffset: 1000 })
        .addTo(this.map)
        .bindPopup('<div class="map-popup"><strong>You are here</strong><span>Tap a marker to explore wilderness nearby</span></div>');
    }

    const radius = Math.max(accuracy, 80);
    if (this.userAccuracy) {
      this.userAccuracy.setLatLng([lat, lng]).setRadius(radius);
    } else {
      this.userAccuracy = L.circle([lat, lng], {
        radius,
        color: '#68d8ff',
        fillColor: '#68d8ff',
        fillOpacity: 0.12,
        weight: 2,
        opacity: 0.55
      }).addTo(this.map);
    }

    this.userMarker.openPopup();
  }

  /** Removes the user location marker and accuracy circle. */
  private clearUserLocation(): void {
    this.userMarker?.remove();
    this.userAccuracy?.remove();
    this.userMarker = null;
    this.userAccuracy = null;
  }

  /** Reconcile place markers with the filtered video list (add, update icons, remove stale). */
  private syncPlaceMarkers(videos: VideoWithRegion[]): void {
    if (!this.map) return;

    const places = groupByPlace(videos);
    const visiblePlaceIds = new Set(places.map(p => p.id));

    this.placeMarkers.forEach((marker, placeId) => {
      if (!visiblePlaceIds.has(placeId)) {
        marker.closePopup();
        marker.remove();
        this.placeMarkers.delete(placeId);
      }
    });

    for (const place of places) {
      const isSelected = place.videos.some(v => v.id === this.selectedId);
      const color = getCategoryColor(place.category);
      const icon = this.createPlaceIcon(color, isSelected, place.videos.length);

      const existing = this.placeMarkers.get(place.id);
      const popupOpts = this.popupOptions(place);
      if (existing) {
        existing.setIcon(icon);
        existing.bindPopup(this.buildPlacePopup(place), popupOpts);
        continue;
      }

      const marker = L.marker([place.lat, place.lng], { icon, riseOnHover: true })
        .addTo(this.map)
        .bindPopup(this.buildPlacePopup(place), popupOpts);

      this.placeMarkers.set(place.id, marker);
    }
  }

  /** Updates marker icons/popups for the selected video id. */
  private highlightSelected(videoId: string, fly: boolean, openPopup = false): void {
    const place = groupByPlace(this.currentVideos).find(p => p.videos.some(v => v.id === videoId));
    if (!place) return;

    for (const groupedPlace of groupByPlace(this.currentVideos)) {
      const isSelected = groupedPlace.videos.some(v => v.id === videoId);
      const color = getCategoryColor(groupedPlace.category);
      const marker = this.placeMarkers.get(groupedPlace.id);
      if (marker) {
        marker.setIcon(this.createPlaceIcon(color, isSelected, groupedPlace.videos.length));
        marker.bindPopup(this.buildPlacePopup(groupedPlace), this.popupOptions(groupedPlace));
      }
    }

    if (!openPopup) return;

    if (fly && this.map) {
      this.map.flyTo([place.lat, place.lng], 10, { duration: 0.9 });
      this.openPlacePopup(place.id, true);
    } else {
      this.openPlacePopup(place.id, false);
    }
  }

  /** Frames the map to visible place markers (and user location if set). */
  private fitToVideos(videos: VideoWithRegion[]): void {
    if (!this.map || videos.length === 0) return;
    const places = groupByPlace(videos);
    const points: [number, number][] = places.map(p => [p.lat, p.lng]);
    if (this.userLatLng) points.push(this.userLatLng);
    if (points.length === 1) {
      this.map.flyTo(points[0], 8, { duration: 0.7 });
      return;
    }
    this.map.fitBounds(L.latLngBounds(points) as [number, number][], {
      padding: [48, 48],
      maxZoom: 7
    });
  }

  /** Builds a Leaflet divIcon for a place marker pin. */
  private createPlaceIcon(color: string, selected: boolean, count: number): unknown {
    const countBadge = count > 1
      ? `<span class="marker-count">${count}</span>`
      : '';

    return L.divIcon({
      className: `wilderness-marker-wrap${selected ? ' is-selected' : ''}${count > 1 ? ' has-count' : ''}`,
      html: `
        <div class="wilderness-marker" style="--marker-color:${color}">
          <svg class="wilderness-marker-pin" viewBox="0 0 28 36" aria-hidden="true">
            <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.3 21.7 0 14 0z" fill="currentColor"/>
            <circle cx="14" cy="14" r="5.5" fill="#061318" opacity="0.35"/>
            <circle cx="14" cy="14" r="3.5" fill="#fff"/>
          </svg>
          ${countBadge}
          ${selected ? '<span class="wilderness-marker-pulse"></span>' : ''}
        </div>`,
      iconSize: [28, 36],
      iconAnchor: [14, 36],
      popupAnchor: [0, -34]
    });
  }

  /** HTML for a single- or multi-video map popup. */
  private buildPlacePopup(place: PlaceGroup): string {
    const color = getCategoryColor(place.category);

    if (place.videos.length === 1) {
      return this.buildSingleVideoPopup(place.videos[0], color, place.name);
    }

    let distanceLine = '';
    if (this.userLatLng) {
      const km = distanceKm(this.userLatLng[0], this.userLatLng[1], place.lat, place.lng);
      distanceLine = `<span class="map-popup-distance">${formatDistance(km)}</span>`;
    }

    const videoItems = place.videos.map(video => {
      const isSelected = video.id === this.selectedId;
      const safeTitle = this.escapeHtml(video.title);
      return `
        <div class="map-popup-video-row${isSelected ? ' is-selected' : ''}">
          <button type="button" class="map-popup-video" data-popup-video-id="${video.id}">
            <img class="map-popup-video-thumb" src="${video.thumbnail}" alt="" loading="eager">
            <span class="map-popup-video-info">
              <strong>${safeTitle}</strong>
              <span>${this.escapeHtml(video.creator)} · ${this.escapeHtml(video.duration)} · ${this.escapeHtml(video.difficulty)}</span>
            </span>
          </button>
          <button type="button" class="map-popup-watch map-popup-watch-row" data-popup-video-id="${video.id}" aria-label="Watch ${safeTitle}">Watch</button>
        </div>`;
    }).join('');

    return `
      <div class="map-popup map-popup-multi">
        <div class="map-popup-header">
          <span class="map-popup-region" style="color:${color}">${place.categoryName}</span>
          <strong>${this.escapeHtml(place.name)}</strong>
          <span class="map-popup-meta">${place.videos.length} videos at this location</span>
          ${distanceLine}
        </div>
        <div class="map-popup-videos">${videoItems}</div>
      </div>`;
  }

  /** HTML for a one-video map popup with watch button. */
  private buildSingleVideoPopup(video: VideoWithRegion, color: string, placeName: string): string {
    let nearestLine = '';
    if (this.userLatLng) {
      const km = distanceKm(this.userLatLng[0], this.userLatLng[1], video.lat, video.lng);
      nearestLine = `<span class="map-popup-distance">${formatDistance(km)}</span>`;
    }
    return `
      <div class="map-popup">
        <img class="map-popup-thumb" src="${video.thumbnail}" alt="" loading="eager">
        <div class="map-popup-body">
          <span class="map-popup-region" style="color:${color}">${video.categoryName}</span>
          <strong>${this.escapeHtml(placeName)}</strong>
          <span class="map-popup-meta">${this.escapeHtml(video.title)}</span>
          <span class="map-popup-meta">${this.escapeHtml(video.difficulty)} · ${this.escapeHtml(video.duration)} · ${this.escapeHtml(video.distance)}</span>
          ${nearestLine}
          <button type="button" class="map-popup-watch" data-popup-video-id="${video.id}">Watch video</button>
        </div>
      </div>`;
  }

  /** Escapes text for safe insertion into popup HTML strings. */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

export { formatDistance };
