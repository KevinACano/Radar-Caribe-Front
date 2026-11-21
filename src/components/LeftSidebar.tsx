import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Anchor, 
  MapPin, 
  NavigationArrow, 
  Trash, 
  CaretLeft, 
  CaretRight, 
  CheckCircle, 
  Stack, 
  Sparkle 
} from '@phosphor-icons/react';
import { BasePort, CustomWaypoint, DashboardLayers, SargassumDetection } from '../types';

interface LeftSidebarProps {
  ports: BasePort[];
  selectedPortId: string;
  onSelectPort: (portId: string) => void;
  detections: SargassumDetection[];
  selectedDetectionIds: string[];
  onToggleDetection: (detectionId: string) => void;
  customWaypoints: CustomWaypoint[];
  onRemoveCustomWaypoint: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onResetDefaults: () => void;
  layers: DashboardLayers;
  onToggleLayer: (layerKey: keyof DashboardLayers) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  timeWindow: 'Ahora' | '+6 h' | '+12 h';
  onChangeTimeWindow: (w: 'Ahora' | '+6 h' | '+12 h') => void;
  // Route Props (100% Sugerida)
  suggestedDistanceKm: number;
  suggestedEtaFormatted: string;
  savingsPercent?: number;
  // Circuit & Backend
  returnToBase: boolean;
  onToggleReturnToBase: () => void;
  isCalculatingBackend: boolean;
  onCalculateBackendRoute: () => void;
  backendError?: string | null;
  onMoveWaypointUp?: (index: number) => void;
  onMoveWaypointDown?: (index: number) => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  ports,
  selectedPortId,
  onSelectPort,
  detections,
  selectedDetectionIds,
  onToggleDetection,
  customWaypoints,
  onRemoveCustomWaypoint,
  onSelectAll,
  onClearAll,
  layers,
  onToggleLayer,
  isOpen,
  onToggleOpen,
  timeWindow,
  onChangeTimeWindow,
  suggestedDistanceKm,
  suggestedEtaFormatted,
  savingsPercent = 0,
  returnToBase,
  onToggleReturnToBase,
  isCalculatingBackend,
  onCalculateBackendRoute,
  backendError,
  onMoveWaypointUp,
  onMoveWaypointDown,
}) => {
  const selectedPort = ports.find((p) => p.id === selectedPortId) || ports[0];
  const selectedDetectionsList = selectedDetectionIds
    .map((id) => detections.find((d) => d.id === id))
    .filter((d): d is SargassumDetection => Boolean(d));

  const totalPointsCount = 1 + selectedDetectionsList.length + customWaypoints.length + (returnToBase ? 1 : 0);

  return (
    <>
      {/* Toggle Tab Button when closed (Separado 24px+ hacia abajo del Header) */}
      {!isOpen && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleOpen}
          className="absolute top-[92px] left-4 z-40 bg-[#06292D]/85 backdrop-blur-md text-[#CCFBF1] p-2.5 rounded-2xl border border-teal-400/20 shadow-floating transition-all flex items-center space-x-2 text-xs font-bold pointer-events-auto cursor-pointer"
          title="Abrir Centro de Control"
        >
          <Stack size={18} weight="duotone" className="text-[#2DD4BF]" />
          <span className="font-montserrat font-bold">Control de Recolección</span>
          <CaretRight size={14} weight="bold" className="text-teal-400" />
        </motion.button>
      )}

      {/* Main Floating Card (Verde Abisal Translúcido) */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ opacity: 0, x: -40, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -40, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="absolute top-[92px] left-4 bottom-20 z-40 w-80 md:w-[350px] bg-[#06292D]/85 backdrop-blur-md border border-teal-400/20 shadow-floating rounded-[22px] flex flex-col overflow-hidden select-none pointer-events-auto font-sans"
          >
            {/* Header */}
            <div className="p-4 border-b border-teal-400/20 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-montserrat font-extrabold text-white tracking-tight flex items-center gap-2">
                  <Sparkle size={18} weight="duotone" className="text-[#2DD4BF]" />
                  Control de Recolección
                </h2>
                <p className="text-[10.5px] text-teal-200/80 font-medium">
                  Monitoreo costero y optimización de rutas
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
              {/* SECTION: 100% RUTA SUGERIDA OPTIMIZADA */}
              <div className="space-y-2.5 bg-black/35 p-3 rounded-2xl border border-teal-400/20">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold text-teal-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <NavigationArrow size={13} weight="duotone" className="text-[#2DD4BF]" />
                    Ruta Sugerida
                  </span>
                  <span className="text-[10px] font-mono text-teal-300 font-bold bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-400/25">
                    {totalPointsCount} puntos
                  </span>
                </div>

                {/* Tarjeta Única de Ruta Sugerida */}
                <div className="p-3 rounded-2xl border border-teal-400/60 bg-teal-500/15 shadow-[0_0_18px_rgba(45,212,191,0.2)] ring-1 ring-teal-400/50">
                  <div className="flex items-center justify-between">
                    <span className="font-montserrat font-extrabold text-xs text-white">
                      Ruta Sugerida de Recolección
                    </span>
                    <span className="text-[9.5px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-teal-400/20 text-[#2DD4BF] border border-teal-400/40">
                      {savingsPercent > 0 ? `-${savingsPercent}% distancia` : 'Óptima'}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs font-mono">
                    <div className="text-slate-200">
                      Distancia: <strong className="text-white font-bold">{suggestedDistanceKm.toFixed(1)} km</strong>
                      <span className="text-teal-200/70 text-[10px] ml-1">({(suggestedDistanceKm / 1.852).toFixed(1)} MN)</span>
                    </div>
                    <div className="text-slate-200">
                      ETA: <strong className="text-[#2DD4BF] font-bold">{suggestedEtaFormatted}</strong>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center space-x-1.5 pt-1.5 border-t border-teal-400/15">
                    <div className="h-1 flex-1 rounded-full bg-[#14B8A6] shadow-[0_0_8px_#14B8A6]" />
                    <span className="text-[9px] text-teal-300/80 font-mono">Trazado continuo turquesa</span>
                  </div>
                </div>

                {/* Return to Base Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-200 font-medium">
                    🔁 Circuito cerrado (retorno a base)
                  </span>
                  <button
                    type="button"
                    onClick={onToggleReturnToBase}
                    className={`w-8 h-4 rounded-full transition-colors relative p-0.5 focus:outline-none flex items-center cursor-pointer ${
                      returnToBase ? 'bg-[#0D9488]' : 'bg-slate-700'
                    }`}
                  >
                    <motion.div
                      layout
                      className={`w-3 h-3 rounded-full bg-white shadow-sm ${
                        returnToBase ? 'ml-auto shadow-[0_0_6px_#2DD4BF]' : 'mr-auto'
                      }`}
                    />
                  </button>
                </div>

                {/* ACTION BUTTON: Recalcular Rumbo Óptimo */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isCalculatingBackend}
                  onClick={onCalculateBackendRoute}
                  className={`w-full py-2.5 px-3 rounded-xl font-montserrat font-extrabold text-xs transition-all flex items-center justify-center space-x-2 border shadow-md cursor-pointer ${
                    isCalculatingBackend
                      ? 'bg-teal-900/50 text-teal-200 border-teal-500/40 cursor-wait'
                      : 'bg-gradient-to-r from-[#0F5247] via-[#0D9488] to-[#2DD4BF] text-slate-950 border-teal-300/40 hover:brightness-110 shadow-[0_0_15px_rgba(45,212,191,0.35)]'
                  }`}
                >
                  <NavigationArrow size={15} weight="bold" />
                  <span>{isCalculatingBackend ? 'Calculando rumbo óptimo...' : 'Recalcular Rumbo Óptimo'}</span>
                </motion.button>

                {backendError && (
                  <div className="text-[10px] text-amber-200 bg-amber-500/20 p-2 rounded-xl border border-amber-400/30 leading-snug">
                    {backendError}
                  </div>
                )}
              </div>

              {/* SECTION: 1. PUERTO BASE DE SALIDA */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider block font-mono">
                  1. Puerto Base de Salida
                </span>

                <div className="relative">
                  <select
                    value={selectedPortId}
                    onChange={(e) => onSelectPort(e.target.value)}
                    className="w-full text-xs font-montserrat font-bold text-white bg-slate-900/90 border border-teal-400/30 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2DD4BF] cursor-pointer"
                  >
                    {ports.map((port) => (
                      <option key={port.id} value={port.id} className="bg-[#06292D] text-white">
                        ⚓ {port.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SECTION: 2. PUNTOS DE RECOLECCIÓN */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider font-mono">
                    2. Puntos de Recolección ({selectedDetectionIds.length + customWaypoints.length})
                  </span>
                  <div className="flex items-center space-x-1.5 text-[10px]">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={onSelectAll}
                      className="text-teal-300 font-semibold hover:underline cursor-pointer"
                    >
                      Todos
                    </motion.button>
                    <span className="text-teal-400/40">|</span>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={onClearAll}
                      className="text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      Limpiar
                    </motion.button>
                  </div>
                </div>

                {/* Custom Waypoints Section (Puntos Marcados en el Mapa) */}
                {customWaypoints.length > 0 && (
                  <div className="space-y-1.5 bg-sky-950/40 border border-sky-400/30 p-2 rounded-xl">
                    <div className="flex items-center justify-between text-[10px] text-sky-200 font-bold font-mono">
                      <span>Puntos Marcados en el Mapa ({customWaypoints.length})</span>
                    </div>
                    <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                      {customWaypoints.map((wp, idx) => (
                        <div
                          key={wp.id}
                          className="flex items-center justify-between bg-sky-900/40 p-1.5 rounded-lg text-[11px]"
                        >
                          <div className="flex items-center space-x-1.5 truncate">
                            <span className="w-4 h-4 rounded-full bg-sky-500/30 text-sky-300 font-bold text-[9px] flex items-center justify-center shrink-0">
                              P{idx + 1}
                            </span>
                            <span className="text-white truncate font-medium">{wp.name}</span>
                            <span className="text-[9.5px] text-sky-300 font-mono">~{wp.massTons || 0}t</span>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0">
                            {onMoveWaypointUp && idx > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMoveWaypointUp(idx);
                                }}
                                className="p-0.5 text-slate-300 hover:text-white cursor-pointer"
                                title="Subir orden"
                              >
                                ▲
                              </button>
                            )}
                            {onMoveWaypointDown && idx < customWaypoints.length - 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMoveWaypointDown(idx);
                                }}
                                className="p-0.5 text-slate-300 hover:text-white cursor-pointer"
                                title="Bajar orden"
                              >
                                ▼
                              </button>
                            )}
                            {/* Botón Eliminar Punto Inmediato */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveCustomWaypoint(wp.id);
                              }}
                              className="p-1 text-red-400 hover:text-red-300 rounded hover:bg-white/10 transition-colors cursor-pointer"
                              title="Eliminar punto del mapa"
                            >
                              <Trash size={13} weight="bold" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sargassum Detections Checklist */}
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {detections.map((detection) => {
                    const isChecked = selectedDetectionIds.includes(detection.id);

                    return (
                      <motion.div
                        key={detection.id}
                        whileHover={{ scale: 1.01 }}
                        className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-teal-500/20 border-teal-400/40 text-white'
                            : 'bg-black/20 border-white/5 text-slate-300 hover:bg-black/30'
                        }`}
                        onClick={() => onToggleDetection(detection.id)}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded border-teal-400/50 bg-slate-900 text-teal-400 focus:ring-0 cursor-pointer"
                          />
                          <div className="truncate">
                            <span className="font-montserrat font-semibold text-xs block truncate">
                              {detection.codeName}
                            </span>
                            <span className="text-[10px] text-teal-200/70 font-mono block">
                              {detection.massTons.toLocaleString()} t · {detection.distanceToCoastKm} km a costa
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[9.5px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                            detection.priority === 'Alta'
                              ? 'bg-red-500/30 text-red-300 border border-red-500/40'
                              : detection.priority === 'Media'
                              ? 'bg-orange-500/30 text-orange-300 border border-orange-500/40'
                              : 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/40'
                          }`}
                        >
                          {detection.priority}
                        </span>
                      </motion.div>
                    );
                  })}
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
                    <span>🌿 Bancos</span>
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
                    <span>🧭 Trazado</span>
                    {layers.optimalRoutes && <CheckCircle size={14} weight="bold" className="text-teal-400" />}
                  </button>
                </div>
              </div>

              {/* SECTION: 4. VENTANA DE TIEMPO */}
              <div className="space-y-1.5 pt-1 border-t border-teal-400/15">
                <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider block font-mono">
                  4. Ventana de Pronóstico
                </span>

                <div className="grid grid-cols-3 gap-1 bg-black/30 p-1 rounded-xl border border-teal-400/20">
                  {(['Ahora', '+6 h', '+12 h'] as const).map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => onChangeTimeWindow(w)}
                      className={`py-1 text-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        timeWindow === w
                          ? 'bg-teal-500 text-slate-950 shadow-sm'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default LeftSidebar;
