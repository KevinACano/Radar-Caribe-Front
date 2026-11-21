export interface BasePort {
  id: string;
  name: string;
  shortName: string;
  municipality: string;
  lat: number;
  lng: number;
  description: string;
  facilities: string;
}

export interface MaritimeWeather {
  wind: string;
  windSpeedKmh: number;
  windDirection: string;
  waveHeightM: number;
  waveDescription: string;
  current: string;
  currentVelocity: string; // e.g. "0.4–0.8 m/s"
  currentSpeedKnots: number;
  currentDirection: string;
  status: 'Óptimo para recolección' | 'Precaución' | 'Condición Severa';
  waterTemperatureC: number;
  visibilityNm: number;
  updatedAt: string;
  forecastConfidence: string; // e.g. "82–87%"
  vesselAssigned: string; // e.g. "ECO-02"
}

export interface DashboardLayers {
  sargassumPrediction: boolean; // Predicción de sargazo
  currents: boolean;            // Corrientes
  tides: boolean;               // Mareas
  wind: boolean;                // Viento
  optimalRoutes: boolean;        // Rutas óptimas
  fuelConsumption: boolean;      // Consumo estimado
  basemapMode: 'ocean' | 'satellite' | 'osm';
  coordinates: boolean;
}

export interface AlertMass {
  id: string;
  cell_count: number;
  area_km2: number;
  density_sum: number;
  centroid: { lat: number; lon: number };
  bbox: [number, number, number, number]; // [west, south, east, north]
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

export interface AlertSummary {
  id: string;
  title: string;
  message: string;
  prediction_utc: string;
  frame_minutes: number;
  area_id: string;
  mass: AlertMass;
  intersection: { cell_count: number; density_sum: number };
  destination: { lat: number; lon: number };
  recommended_port_id: string;
  route_count: number;
}

export interface AlertsResponse {
  run_id: string;
  t0: string;
  generated_utc: string;
  collection_area_ids: string[];
  alerts: AlertSummary[];
}

export interface RouteMeta {
  distance_km: number;
  time_minutes: number;
  data_source?: string;
  selected_time?: string;
  snap_warnings?: string[];
  disclaimer?: string;
  smoothing?: { applied: boolean; method: string; raw_points: number; simplified_points: number };
}

export interface AlertRoute {
  status: 'ok' | 'error';
  route?: { type: 'LineString'; coordinates: [number, number][] }; // [lon, lat]
  meta?: RouteMeta;
  error?: string | null;
}

export interface AlertDetail extends AlertSummary {
  routes: Record<string, AlertRoute>;
}

export interface PaletteStop {
  stop: number;
  color: string;
}

export interface SargassumManifest {
  run_id: string;
  t0: string;
  step_minutes: number;
  bbox: [number, number, number, number];
  vmin: number;
  vmax: number;
  palette: PaletteStop[];
  frames: { minutes: number; valid_utc: string }[];
}

export type FrameCollection = GeoJSON.FeatureCollection<GeoJSON.Polygon, { density: number }>;

export interface AppNotification {
  id: string; // alert id
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}
