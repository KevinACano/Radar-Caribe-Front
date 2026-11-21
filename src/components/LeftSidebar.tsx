import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Anchor,
  NavigationArrow,
  CaretLeft,
  CaretRight,
  CaretDown,
  CheckCircle,
  Stack,
  Compass,
  Flame,
  Plant,
  Path
} from '@phosphor-icons/react';
import { AlertDetail, AlertSummary, BasePort, DashboardLayers, SargassumManifest } from '../types';
import { fmtUtc } from '../utils/density';

interface LeftSidebarProps {
  ports: BasePort[];
  selectedPortId: string;
  onSelectPort: (portId: string) => void;
  alerts: AlertSummary[];
  selectedAlertId: string | null;
  onSelectAlert: (id: string) => void;
  detail: AlertDetail | null;
  layers: DashboardLayers;
  onToggleLayer: (layerKey: keyof DashboardLayers) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  manifest: SargassumManifest | null;
  minutes: number;
  onChangeMinutes: (m: number) => void;
}

const fmtMinutes = (m: number) => `${Math.floor(m / 60)} h ${Math.round(m % 60)} m`;

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  ports,
  selectedPortId,
  onSelectPort,
  alerts,
  selectedAlertId,
  onSelectAlert,
  detail,
  layers,
  onToggleLayer,
  isOpen,
  onToggleOpen,
  manifest,
  minutes,
  onChangeMinutes,
}) => {
  const [routeOpen, setRouteOpen] = useState(false);
  useEffect(() => {
    if (selectedAlertId) setRouteOpen(true);
  }, [selectedAlertId]);

  return (
    <>
      {/* Toggle Tab Button when closed (Separado 32px hacia abajo del Header) */}
      {!isOpen && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleOpen}
          className="absolute top-[116px] left-4 z-40 bg-[#06292D]/85 backdrop-blur-md text-[#CCFBF1] p-2.5 rounded-2xl border border-teal-400/20 shadow-floating transition-all flex items-center space-x-2 text-xs font-bold pointer-events-auto cursor-pointer"
          title="Abrir Centro de Control"
        >
          <Stack size={18} weight="duotone" className="text-[#2DD4BF]" />
          <span className="font-montserrat font-bold">Control de Recolección</span>
          <CaretRight size={14} weight="bold" className="text-teal-400" />
        </motion.button>
      )}

      {/* Main Floating Card (Verde Abisal Translúcido con separación del header) */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ opacity: 0, x: -40, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -40, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="absolute top-[116px] left-4 bottom-20 z-40 w-80 md:w-[350px] bg-[#06292D]/85 backdrop-blur-md border border-teal-400/20 shadow-floating rounded-[22px] flex flex-col overflow-hidden select-none pointer-events-auto font-sans"
          >
            {/* Header con icono náutico sobrio Compass */}
            <div className="p-4 border-b border-teal-400/20 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-montserrat font-extrabold text-white tracking-tight flex items-center gap-2">
                  <Compass size={18} weight="duotone" className="text-[#2DD4BF]" />
                  Control de Recolección
                </h2>
                <p className="text-[10.5px] text-teal-200/80 font-medium">
                  Alertas de predicción y rutas pre-generadas
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={onToggleOpen}
                className="p-1.5 hover:bg-white/10 rounded-xl text-teal-300 hover:text-white transition-colors cursor-pointer"
                title="Ocultar panel"
              >
                <CaretLeft size={16} weight="bold" />
              </motion.button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs text-[#F0FDF4]">
              {/* SECTION: 1. ALERTAS */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider block font-mono">
                  1. Alertas de Recolección ({alerts.length})
                </span>
                {alerts.length > 0 && !selectedAlertId && (
                  <div className="text-[11px] text-amber-200 bg-amber-500/15 p-2 rounded-xl border border-amber-400/30">
                    Selecciona una alerta para ver la masa y su ruta
                  </div>
                )}
                {alerts.length === 0 && (
                  <div className="text-[11px] text-slate-400 bg-black/20 p-2 rounded-xl border border-white/5">
                    Sin alertas disponibles.
                  </div>
                )}
                {alerts.map((a) => {
                  const isSelected = a.id === selectedAlertId;
                  return (
                    <motion.div
                      key={a.id}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => onSelectAlert(a.id)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-400/60 text-white shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                          : 'bg-black/20 border-white/5 text-slate-300 hover:bg-black/30'
                      }`}
                    >
                      <span className="font-montserrat font-semibold text-xs flex items-center gap-1.5">
                        <Flame size={13} weight="fill" className="text-orange-400 shrink-0" />
                        {fmtUtc(a.prediction_utc)}
                      </span>
                      <span className="text-[10px] text-teal-200/70 font-mono block mt-0.5">
                        Masa {a.mass.area_km2.toFixed(1)} km² · {a.intersection.cell_count} celdas en zona
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              {/* SECTION: 2. RUTA PRE-GENERADA */}
              <div className="space-y-2 bg-black/35 p-3 rounded-2xl border border-teal-400/20">
                <button
                  type="button"
                  aria-expanded={routeOpen}
                  aria-controls="ruta-desde-puerto"
                  onClick={() => setRouteOpen((o) => !o)}
                  className="w-full flex items-center justify-between cursor-pointer text-[10.5px] font-bold text-teal-300 uppercase tracking-wider font-mono"
                >
                  <span className="flex items-center gap-1.5">
                    <NavigationArrow size={13} weight="duotone" className="text-[#2DD4BF]" />
                    2. Ruta desde puerto
                  </span>
                  <CaretDown size={14} weight="bold" className={`transition-transform ${routeOpen ? 'rotate-180' : ''}`} />
                </button>

                <div id="ruta-desde-puerto" hidden={!routeOpen}>
                {!detail ? (
                  <div className="text-[11px] text-slate-400">
                    {selectedAlertId ? 'Cargando rutas…' : 'Selecciona una alerta para ver la masa y su ruta'}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {ports
                      .filter((p) => detail.routes[p.id])
                      .map((p) => {
                        const r = detail.routes[p.id];
                        const isSel = p.id === selectedPortId;
                        return (
                          <motion.button
                            type="button"
                            key={p.id}
                            whileTap={{ scale: 0.98 }}
                            disabled={r.status !== 'ok'}
                            onClick={() => onSelectPort(p.id)}
                            className={`w-full text-left p-2 rounded-xl border transition-all ${
                              isSel
                                ? 'border-teal-400/60 bg-teal-500/15 ring-1 ring-teal-400/50'
                                : 'border-white/5 bg-black/20 hover:bg-black/30'
                            } ${r.status !== 'ok' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-montserrat font-bold text-xs text-white flex items-center gap-1.5">
                                <Anchor size={12} weight="duotone" className="text-teal-300" />
                                {p.shortName}
                              </span>
                              {p.id === detail.recommended_port_id && (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-teal-400/20 text-[#2DD4BF] border border-teal-400/40">
                                  Recomendado
                                </span>
                              )}
                            </div>
                            <div className="text-[10.5px] font-mono text-slate-300 mt-0.5">
                              {r.status === 'ok' && r.meta
                                ? `${r.meta.distance_km.toFixed(1)} km (${(r.meta.distance_km / 1.852).toFixed(1)} MN) · ${fmtMinutes(r.meta.time_minutes)}`
                                : r.error || 'Ruta no disponible'}
                            </div>
                          </motion.button>
                        );
                      })}
                  </div>
                )}
                </div>
              </div>

              {/* SECTION: 3. CAPAS DE INFORMACIÓN */}
              <div className="space-y-1.5 pt-1 border-t border-teal-400/15">
                <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider block font-mono">
                  3. Capas del Mapa
                </span>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onToggleLayer('sargassumPrediction')}
                    className={`p-2 rounded-xl text-left border transition-all text-xs flex items-center justify-between cursor-pointer ${
                      layers.sargassumPrediction
                        ? 'bg-teal-500/20 text-[#2DD4BF] border-teal-400/50 font-bold'
                        : 'bg-black/20 text-slate-400 border-white/5'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Plant size={15} weight="duotone" className="text-teal-300" />
                      <span>Bancos / Celdas</span>
                    </span>
                    {layers.sargassumPrediction && <CheckCircle size={14} weight="bold" className="text-teal-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleLayer('optimalRoutes')}
                    className={`p-2 rounded-xl text-left border transition-all text-xs flex items-center justify-between cursor-pointer ${
                      layers.optimalRoutes
                        ? 'bg-teal-500/20 text-[#2DD4BF] border-teal-400/50 font-bold'
                        : 'bg-black/20 text-slate-400 border-white/5'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Path size={15} weight="duotone" className="text-teal-300" />
                      <span>Trazado</span>
                    </span>
                    {layers.optimalRoutes && <CheckCircle size={14} weight="bold" className="text-teal-400" />}
                  </button>
                </div>
              </div>

              {/* SECTION: 4. VENTANA DE TIEMPO */}
              <div className="space-y-1.5 pt-1 border-t border-teal-400/15">
                <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider block font-mono">
                  4. Ventana de Pronóstico
                </span>
                {manifest && manifest.frames.length > 0 ? (
                  <div className="bg-black/30 p-2.5 rounded-xl border border-teal-400/20 space-y-1">
                    <input
                      type="range"
                      min={0}
                      max={manifest.frames.length - 1}
                      value={Math.max(0, manifest.frames.findIndex((f) => f.minutes === minutes))}
                      onChange={(e) => onChangeMinutes(manifest.frames[Number(e.target.value)].minutes)}
                      className="w-full accent-teal-400 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10.5px] font-mono text-slate-200">
                      <strong className="text-[#2DD4BF]">
                        {fmtUtc(manifest.frames.find((f) => f.minutes === minutes)?.valid_utc ?? manifest.t0)}
                      </strong>
                      <span>+{(minutes / 60).toFixed(1)} h</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400">Sin predicciones disponibles.</div>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default LeftSidebar;
