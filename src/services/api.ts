import { BasePort, BackendRouteResponse, MaritimeWeather, SargassumDetection } from '../types';

const API_BASE = '/api/v1';

async function fetchWithFallback<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(errBody.detail || `Error HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } catch (err: any) {
    // If proxied fetch failed (e.g. running in different env), try direct 127.0.0.1:8000
    if (!url.startsWith('http://127.0.0.1:8000') && !url.startsWith('http://localhost:8000')) {
      const directUrl = `http://127.0.0.1:8000${url.startsWith('/') ? '' : '/'}${url}`;
      const res = await fetch(directUrl, options);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(errBody.detail || `Error HTTP ${res.status}`);
      }
      return (await res.json()) as T;
    }
    throw err;
  }
}

export async function checkBackendHealth(): Promise<{ status: string; copernicus?: string }> {
  try {
    const data = await fetchWithFallback<{ status: string; copernicus?: string }>('/health');
    return data;
  } catch (e) {
    return { status: 'offline' };
  }
}

export async function fetchBackendPorts(): Promise<BasePort[]> {
  const data = await fetchWithFallback<any[]>(`${API_BASE}/ports`);
  return data.map((p) => ({
    id: p.id,
    name: p.name,
    shortName: p.short_name,
    municipality: p.municipality,
    lat: p.lat,
    lng: p.lng,
    description: p.description,
    facilities: p.facilities,
  }));
}

export async function fetchBackendDetections(): Promise<SargassumDetection[]> {
  const data = await fetchWithFallback<any[]>(`${API_BASE}/detections`);
  return data.map((d) => ({
    id: d.id,
    codeName: d.code_name,
    zoneName: d.zone_name,
    lat: d.lat,
    lng: d.lng,
    detectionDate: d.detection_date,
    source: d.source,
    massTons: d.mass_tons,
    priority: d.priority,
    confidencePercent: d.confidence_percent,
    areaKm2: d.area_km2,
    estimatedDepthM: d.estimated_depth_m,
    distanceToCoastKm: d.distance_to_coast_km,
    nearestVessel: d.nearest_vessel,
    vesselDistanceKm: d.vessel_distance_km,
    vesselEtaMinutes: d.vessel_eta_minutes,
  }));
}

export async function fetchBackendWeather(): Promise<MaritimeWeather> {
  const w = await fetchWithFallback<any>(`${API_BASE}/weather`);
  return {
    wind: w.wind,
    windSpeedKmh: w.wind_speed_kmh,
    windDirection: w.wind_direction,
    waveHeightM: w.wave_height_m,
    waveDescription: w.wave_description,
    current: w.current,
    currentVelocity: w.current_velocity,
    currentSpeedKnots: w.current_speed_knots,
    currentDirection: w.current_direction,
    status: w.status,
    waterTemperatureC: w.water_temperature_c,
    visibilityNm: w.visibility_nm,
    updatedAt: w.updated_at,
    forecastConfidence: w.forecast_confidence,
    vesselAssigned: w.vessel_assigned,
  };
}

export interface RoutePointPayload {
  lat: number;
  lon: number;
  name?: string;
  id?: string;
}

export async function requestBackendRoute(
  origin: RoutePointPayload,
  destination: RoutePointPayload,
  vesselSpeedKnots?: number
): Promise<BackendRouteResponse> {
  return fetchWithFallback<BackendRouteResponse>(`${API_BASE}/routes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin: { lat: origin.lat, lon: origin.lon, name: origin.name, id: origin.id },
      destination: { lat: destination.lat, lon: destination.lon, name: destination.name, id: destination.id },
      vessel_speed_knots: vesselSpeedKnots,
    }),
  });
}

export async function requestBackendMultiRoute(
  points: RoutePointPayload[],
  returnToOrigin: boolean = false,
  vesselSpeedKnots?: number
): Promise<BackendRouteResponse> {
  return fetchWithFallback<BackendRouteResponse>(`${API_BASE}/routes/multi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      points: points.map((p) => ({
        lat: p.lat,
        lon: p.lon,
        name: p.name,
        id: p.id,
      })),
      return_to_origin: returnToOrigin,
      vessel_speed_knots: vesselSpeedKnots,
    }),
  });
}
