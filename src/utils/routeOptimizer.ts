import { BasePort, OptimizationMetrics, RouteStop, SargassumDetection } from '../types';

const EARTH_RADIUS_KM = 6371.0088;
const KM_TO_NM = 1 / 1.852;
const VESSEL_SPEED_KNOTS = 8.0; // 8 knots (~14.816 km/h)
const VESSEL_SPEED_KMH = VESSEL_SPEED_KNOTS * 1.852;
const FUEL_LITERS_PER_KM = 1.89; // Realistic fuel consumption model

export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (angle: number) => (angle * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));

  const bearing = (toDeg(Math.atan2(y, x)) + 360) % 360;
  return bearing;
}

export function interpolatePosition(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  fraction: number
): [number, number];
export function interpolatePosition(
  p1: [number, number],
  p2: [number, number],
  fraction: number
): [number, number];
export function interpolatePosition(
  a: number | [number, number],
  b: number | [number, number],
  c: number,
  d?: number,
  e?: number
): [number, number] {
  if (Array.isArray(a) && Array.isArray(b)) {
    const clamped = Math.max(0, Math.min(1, c));
    return [
      a[0] + (b[0] - a[0]) * clamped,
      a[1] + (b[1] - a[1]) * clamped,
    ];
  }
  const lat1 = a as number;
  const lng1 = b as number;
  const lat2 = c as number;
  const lng2 = (d !== undefined ? d : 0) as number;
  const fraction = (e !== undefined ? e : 0) as number;
  const clamped = Math.max(0, Math.min(1, fraction));
  return [
    lat1 + (lat2 - lat1) * clamped,
    lng1 + (lng2 - lng1) * clamped,
  ];
}

interface Point {
  id: string;
  name: string;
  codeName?: string;
  lat: number;
  lng: number;
  isPort: boolean;
  massTons?: number;
  priority?: SargassumDetection['priority'];
  confidencePercent?: number;
}

function buildSequenceWithMetrics(points: Point[]): RouteStop[] {
  let cumulativeKm = 0;
  const stops: RouteStop[] = [];

  for (let i = 0; i < points.length; i++) {
    const curr = points[i];
    let legDistKm = 0;

    if (i > 0) {
      const prev = points[i - 1];
      legDistKm = haversineDistanceKm(prev.lat, prev.lng, curr.lat, curr.lng);
    }

    cumulativeKm += legDistKm;
    const legDistNm = legDistKm * KM_TO_NM;
    const cumulativeDistNm = cumulativeKm * KM_TO_NM;
    const legEtaMinutes = (legDistKm / VESSEL_SPEED_KMH) * 60;

    stops.push({
      id: curr.id,
      name: curr.name,
      codeName: curr.codeName,
      lat: curr.lat,
      lng: curr.lng,
      isPort: curr.isPort,
      massTons: curr.massTons,
      priority: curr.priority,
      confidencePercent: curr.confidencePercent,
      legDistKm: Number(legDistKm.toFixed(2)),
      legDistNm: Number(legDistNm.toFixed(2)),
      cumulativeDistKm: Number(cumulativeKm.toFixed(2)),
      cumulativeDistNm: Number(cumulativeDistNm.toFixed(2)),
      legEtaMinutes: Math.round(legEtaMinutes),
    });
  }

  return stops;
}

function calculateTourDistance(tour: Point[]): number {
  let total = 0;
  for (let i = 0; i < tour.length - 1; i++) {
    total += haversineDistanceKm(tour[i].lat, tour[i].lng, tour[i + 1].lat, tour[i + 1].lng);
  }
  return total;
}

function solveOptimalTour(basePoint: Point, targetPoints: Point[]): Point[] {
  const n = targetPoints.length;
  if (n === 0) return [basePoint, basePoint];
  if (n === 1) return [basePoint, targetPoints[0], basePoint];

  // Exact optimal permutation for N <= 8
  if (n <= 8) {
    let bestPermutation: Point[] = [...targetPoints];
    let bestDist = Infinity;

    function permute(arr: Point[], l: number) {
      if (l === arr.length) {
        const candidateTour = [basePoint, ...arr, basePoint];
        const dist = calculateTourDistance(candidateTour);
        if (dist < bestDist) {
          bestDist = dist;
          bestPermutation = [...arr];
        }
        return;
      }
      for (let i = l; i < arr.length; i++) {
        [arr[l], arr[i]] = [arr[i], arr[l]];
        permute(arr, l + 1);
        [arr[l], arr[i]] = [arr[i], arr[l]];
      }
    }

    permute([...targetPoints], 0);
    return [basePoint, ...bestPermutation, basePoint];
  }

  // Nearest Neighbor + 2-Opt
  const unvisited = [...targetPoints];
  const tour: Point[] = [basePoint];
  let current = basePoint;

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let minD = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const d = haversineDistanceKm(current.lat, current.lng, unvisited[i].lat, unvisited[i].lng);
      if (d < minD) {
        minD = d;
        nearestIdx = i;
      }
    }

    current = unvisited.splice(nearestIdx, 1)[0];
    tour.push(current);
  }
  tour.push(basePoint);

  return tour;
}

export function computeRouteOptimization(
  port: BasePort,
  selectedTargets: SargassumDetection[]
): OptimizationMetrics {
  const basePoint: Point = {
    id: port.id,
    name: port.name,
    codeName: port.shortName,
    lat: port.lat,
    lng: port.lng,
    isPort: true,
  };

  const targetPoints: Point[] = selectedTargets.map((d) => ({
    id: d.id,
    name: d.zoneName,
    codeName: d.codeName,
    lat: d.lat,
    lng: d.lng,
    isPort: false,
    massTons: d.massTons,
    priority: d.priority,
    confidencePercent: d.confidencePercent,
  }));

  const initialTourPoints: Point[] = [basePoint, ...targetPoints, basePoint];
  const initialSequence = buildSequenceWithMetrics(initialTourPoints);
  const initialDistanceKm =
    initialSequence.length > 0
      ? initialSequence[initialSequence.length - 1].cumulativeDistKm
      : 0;

  const optimalTourPoints = solveOptimalTour(basePoint, targetPoints);
  const optimizedSequence = buildSequenceWithMetrics(optimalTourPoints);
  const optimizedDistanceKm =
    optimizedSequence.length > 0
      ? optimizedSequence[optimizedSequence.length - 1].cumulativeDistKm
      : 0;

  const initialDistanceNm = Number((initialDistanceKm * KM_TO_NM).toFixed(2));
  const optimizedDistanceNm = Number((optimizedDistanceKm * KM_TO_NM).toFixed(2));

  const distanceReductionKm = Math.max(0, Number((initialDistanceKm - optimizedDistanceKm).toFixed(2)));
  const distanceReductionNm = Number((distanceReductionKm * KM_TO_NM).toFixed(2));

  const rawPercentage = initialDistanceKm > 0
    ? ((initialDistanceKm - optimizedDistanceKm) / initialDistanceKm) * 100
    : 0;
  const percentageReduction = Number(Math.max(0, rawPercentage).toFixed(1));

  const totalTravelHours = optimizedDistanceKm / VESSEL_SPEED_KMH;
  const etaHours = Math.floor(totalTravelHours);
  const etaMinutes = Math.round((totalTravelHours - etaHours) * 60);
  const etaTotalFormatted = `${etaHours} h ${etaMinutes} m`;

  const fuelEstimatedLiters = Math.round(optimizedDistanceKm * FUEL_LITERS_PER_KM);
  const fuelSavedLiters = Math.round(distanceReductionKm * FUEL_LITERS_PER_KM);

  const totalMassTons = selectedTargets.reduce((sum, d) => sum + d.massTons, 0);

  return {
    initialSequence,
    optimizedSequence,
    initialDistanceKm,
    initialDistanceNm,
    optimizedDistanceKm,
    optimizedDistanceNm,
    distanceReductionKm,
    distanceReductionNm,
    percentageReduction,
    etaHours,
    etaMinutes,
    etaTotalFormatted,
    fuelEstimatedLiters,
    fuelSavedLiters,
    totalMassTons,
    vesselSpeedKnots: VESSEL_SPEED_KNOTS,
  };
}

export function buildMetricsFromBackendResponse(
  backendRes: import('../types').BackendRouteResponse,
  baseSequence: RouteStop[],
  totalMassTons: number
): OptimizationMetrics {
  const KM_TO_NM_FACTOR = 1 / 1.852;
  const optimizedDistanceKm = Number(backendRes.meta.distance_km.toFixed(2));
  const optimizedDistanceNm = Number((optimizedDistanceKm * KM_TO_NM_FACTOR).toFixed(2));
  const timeMinutes = backendRes.meta.time_minutes;
  const etaHours = Math.floor(timeMinutes / 60);
  const etaMinutes = Math.round(timeMinutes % 60);
  const etaTotalFormatted = `${etaHours} h ${etaMinutes} m`;

  const initialDistanceKm =
    baseSequence.length > 0
      ? baseSequence[baseSequence.length - 1].cumulativeDistKm
      : optimizedDistanceKm;
  const initialDistanceNm = Number((initialDistanceKm * KM_TO_NM_FACTOR).toFixed(2));

  const distanceReductionKm = Math.max(0, Number((initialDistanceKm - optimizedDistanceKm).toFixed(2)));
  const distanceReductionNm = Number((distanceReductionKm * KM_TO_NM_FACTOR).toFixed(2));
  const rawPercentage =
    initialDistanceKm > 0
      ? ((initialDistanceKm - optimizedDistanceKm) / initialDistanceKm) * 100
      : 0;
  const percentageReduction = Number(Math.max(0, rawPercentage).toFixed(1));

  const fuelEstimatedLiters = Math.round(optimizedDistanceKm * 1.89);
  const fuelSavedLiters = Math.round(distanceReductionKm * 1.89);

  return {
    initialSequence: baseSequence,
    optimizedSequence: baseSequence,
    initialDistanceKm,
    initialDistanceNm,
    optimizedDistanceKm,
    optimizedDistanceNm,
    distanceReductionKm,
    distanceReductionNm,
    percentageReduction,
    etaHours,
    etaMinutes,
    etaTotalFormatted,
    fuelEstimatedLiters,
    fuelSavedLiters,
    totalMassTons,
    vesselSpeedKnots: 8.0,
    backendRoute: backendRes,
    isBackendRoute: true,
  };
}

