import {
  AlertDetail,
  AlertsResponse,
  BasePort,
  FrameCollection,
  MaritimeWeather,
  SargassumManifest,
} from '../types';

const API_BASE = '/api/v1';

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `Error HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function checkBackendHealth(): Promise<{ status: string }> {
  try {
    return await getJson<{ status: string }>('/health');
  } catch {
    return { status: 'offline' };
  }
}

export async function fetchBackendPorts(): Promise<BasePort[]> {
  const data = await getJson<any[]>(`${API_BASE}/ports`);
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

export async function fetchBackendWeather(): Promise<MaritimeWeather> {
  const w = await getJson<any>(`${API_BASE}/weather`);
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

export const fetchAlerts = () => getJson<AlertsResponse>(`${API_BASE}/alerts`);

export const fetchAlertDetail = (id: string) =>
  getJson<AlertDetail>(`${API_BASE}/alerts/${encodeURIComponent(id)}`);

export const fetchManifest = (runId: string) =>
  getJson<SargassumManifest>(`${API_BASE}/sargassum/runs/${encodeURIComponent(runId)}/manifest`);

export const fetchFrame = (runId: string, minutes: number) =>
  getJson<FrameCollection>(`${API_BASE}/sargassum/runs/${encodeURIComponent(runId)}/frames/${minutes}`);
