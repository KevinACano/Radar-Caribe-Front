import { PaletteStop } from '../types';

const hex = (c: string): [number, number, number] => [
  parseInt(c.slice(1, 3), 16),
  parseInt(c.slice(3, 5), 16),
  parseInt(c.slice(5, 7), 16),
];

/** Log-scale density -> palette color (manifest vmin/vmax/palette). */
export function densityColor(density: number, vmin: number, vmax: number, palette: PaletteStop[]): string {
  const t = Math.min(1, Math.max(0, (Math.log(Math.max(density, vmin)) - Math.log(vmin)) / (Math.log(vmax) - Math.log(vmin))));
  let i = 1;
  while (i < palette.length - 1 && palette[i].stop < t) i++;
  const a = palette[i - 1];
  const b = palette[i];
  const k = b.stop === a.stop ? 0 : Math.min(1, Math.max(0, (t - a.stop) / (b.stop - a.stop)));
  const [ca, cb] = [hex(a.color), hex(b.color)];
  return `rgb(${ca.map((v, n) => Math.round(v + (cb[n] - v) * k)).join(',')})`;
}

export const fmtUtc = (iso: string): string => {
  const d = new Date(iso);
  const mon = d.toLocaleString('es-MX', { month: 'short', timeZone: 'UTC' }).replace('.', '');
  return `${d.getUTCDate()} ${mon} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
};
