export type Priority = 'Baja' | 'Media' | 'Alta';

export type DetectionSource = 'Sentinel-2 ESA' | 'SIMAR-CONABIO' | 'Avistamiento Costero';

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

export interface SargassumDetection {
  id: string;
  codeName: string; // e.g. "Masa estimada A"
  zoneName: string;
  lat: number;
  lng: number;
  detectionDate: string;
  source: DetectionSource;
  massTons: number;
  priority: Priority;
  confidencePercent: number; // e.g. 87%
  areaKm2: number;
  estimatedDepthM: number;
  distanceToCoastKm: number;
  avgDailyAccumulationTons?: number;
  nearestVessel?: string;
  vesselDistanceKm?: number;
  vesselEtaMinutes?: number;
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

export interface RouteStop {
  id: string;
  name: string;
  codeName?: string;
  lat: number;
  lng: number;
  isPort: boolean;
  massTons?: number;
  priority?: Priority;
  confidencePercent?: number;
  legDistKm: number;
  legDistNm: number;
  cumulativeDistKm: number;
  cumulativeDistNm: number;
  legEtaMinutes: number;
}

export interface OptimizationMetrics {
  initialSequence: RouteStop[];
  optimizedSequence: RouteStop[];
  initialDistanceKm: number;
  initialDistanceNm: number;
  optimizedDistanceKm: number;
  optimizedDistanceNm: number;
  distanceReductionKm: number;
  distanceReductionNm: number;
  percentageReduction: number;
  etaHours: number;
  etaMinutes: number;
  etaTotalFormatted: string; // e.g. "1 h 45 m"
  fuelEstimatedLiters: number;
  fuelSavedLiters: number;
  totalMassTons: number;
  vesselSpeedKnots: number;
  backendRoute?: BackendRouteResponse;
  isBackendRoute?: boolean;
}

export interface BackendRouteLeg {
  from_index: number;
  to_index: number;
  from_name?: string;
  to_name?: string;
  distance_km: number;
  time_minutes: number;
  coordinates: [number, number][]; // [lon, lat]
  snap_warnings: string[];
}

export interface BackendRouteMeta {
  distance_km: number;
  time_minutes: number;
  data_source: string;
  selected_time: string;
  snap_warnings: string[];
  disclaimer: string;
  legs_count?: number;
}

export interface BackendRouteResponse {
  route: {
    type: string;
    coordinates: [number, number][]; // [lon, lat]
  };
  legs?: BackendRouteLeg[];
  meta: BackendRouteMeta;
}

export interface CustomWaypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  massTons?: number;
  createdAt?: string;
}

export interface MissionPlan {
  id: string;
  title: string;
  scheduledDate: string;
  scheduledTime: string;
  vesselName: string;
  portId: string;
  portName: string;
  assignedPointIds: string[];
  assignedPointsSummary: string;
  totalDistanceKm: number;
  totalDistanceNm: number;
  totalDurationFormatted: string;
  totalMassTons: number;
  weatherStatus: string;
  createdAt: string;
  status: 'Programada' | 'En curso' | 'Completada';
}

export interface SargassumGeoJsonCellProperties {
  cell_i: number;
  cell_j: number;
  presence_probability: number;
  horizon_hours: number;
  prediction_datetime: string;
}

export interface SargassumGeoJsonFeature {
  type: 'Feature';
  id?: string | number;
  properties: SargassumGeoJsonCellProperties;
  geometry: {
    type: 'Polygon';
    coordinates: number[][][]; // [lon, lat][]
  };
}

export interface SargassumGeoJsonMetadata {
  run_type?: string;
  note?: string;
  t0?: string;
  horizon_hours?: number;
  grid_resolution_km?: number;
  min_probability_exported?: number;
  semantics?: string;
}

export interface SargassumGeoJsonCollection {
  type: 'FeatureCollection';
  metadata?: SargassumGeoJsonMetadata;
  features: SargassumGeoJsonFeature[];
}

export interface SelectedGeoJsonCell {
  id: string; // `cell-${cell_i}-${cell_j}`
  cell_i: number;
  cell_j: number;
  presence_probability: number;
  prediction_datetime: string;
  centroidLat: number;
  centroidLng: number;
  priority: Priority;
  confidencePercent: number;
  feature: SargassumGeoJsonFeature;
}

export interface SargassumCluster {
  id: string; // `cluster-${clusterId}`
  name: string;
  clusterId: number;
  cellCount: number;
  maxProb: number;
  avgProb: number;
  centroidLat: number;
  centroidLng: number;
  estimatedMassTons: number;
  datetime: string;
  features: SargassumGeoJsonFeature[];
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'sargassum_alert' | 'route_update' | 'weather_alert';
  locationName?: string;
  lat?: number;
  lng?: number;
  massTons?: number;
  probPercent?: number;
}




