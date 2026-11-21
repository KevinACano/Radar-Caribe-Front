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
