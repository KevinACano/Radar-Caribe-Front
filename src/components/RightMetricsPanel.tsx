import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Boat, 
  MapPin, 
  NavigationArrow, 
  Sparkle, 
  CaretRight, 
  CaretLeft, 
  Warning, 
  ShieldCheck, 
  Anchor 
} from '@phosphor-icons/react';
import { OptimizationMetrics, SargassumDetection } from '../types';

interface RightMetricsPanelProps {
  metrics: OptimizationMetrics | null;
  detections: SargassumDetection[];
  selectedDetectionIds: string[];
  onToggleDetection: (id: string) => void;
  isSimulating: boolean;
  onStartSimulation: () => void;
  onStopSimulation: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  vesselName?: string;
  activeStopIndex: number;
}

export const RightMetricsPanel: React.FC<RightMetricsPanelProps> = ({
  metrics,
  detections,
  selectedDetectionIds,
  onToggleDetection,
  isSimulating,
  onStartSimulation,
  onStopSimulation,
  isOpen,
  onToggleOpen,
  vesselName = 'ECO-02',
  activeStopIndex,
}) => {
  const [inspectedId, setInspectedId] = useState<string>(
    selectedDetectionIds[0] || detections[0]?.id || 'SARG-QR-01'
  );
  const [showSnapWarnings, setShowSnapWarnings] = useState<boolean>(false);

  const inspectedDetection = detections.find((d) => d.id === inspectedId) || detections[0];
  const backendRoute = metrics?.backendRoute;
  const snapWarnings = backendRoute?.meta?.snap_warnings || [];
  const legs = backendRoute?.legs || [];

  return (
    <>
      {/* Toggle Button when closed (Separado 24px+ hacia abajo del Header) */}
      {!isOpen && (
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleOpen}
          className="absolute top-[92px] right-4 z-40 bg-[#06292D]/85 backdrop-blur-md text-[#CCFBF1] p-2.5 rounded-2xl border border-teal-400/20 shadow-floating transition-all flex items-center space-x-2 text-xs font-bold pointer-events-auto font-sans cursor-pointer"
          title="Abrir Pronósticos y Métricas"
        >
          <CaretLeft size={16} weight="bold" className="text-[#2DD4BF]" />
          <span className="font-montserrat font-bold">Pronósticos ({detections.length})</span>
        </motion.button>
      )}

      {/* Main Container on Right (Verde Abisal Translúcido) */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ opacity: 0, x: 40, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="absolute top-[92px] right-4 bottom-20 z-40 w-80 md:w-[350px] flex flex-col gap-3 select-none pointer-events-auto font-sans"
          >
            {/* CARD: Pronósticos del Sargazo & Telemetría Operativa */}
            <motion.div 
              className="bg-[#06292D]/85 backdrop-blur-md border border-teal-400/20 shadow-floating rounded-[22px] p-4 space-y-3.5 flex flex-col max-h-[calc(100vh-12rem)] overflow-hidden text-[#F0FDF4]"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-1 border-b border-teal-400/20">
                <div>
                  <h3 className="text-sm font-montserrat font-extrabold text-white tracking-tight flex items-center gap-2">
                    <Sparkle size={18} weight="duotone" className="text-[#2DD4BF]" />
                    Pronósticos de Sargazo
                  </h3>
                  <p className="text-[10.5px] text-teal-200/80">
                    Bancos detectados e intercepción activa
                  </p>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onToggleOpen}
                  className="p-1 hover:bg-white/10 rounded-xl text-teal-300 hover:text-white transition-colors cursor-pointer"
                  title="Cerrar panel"
                >
                  <CaretRight size={16} weight="bold" />
                </motion.button>
              </div>

              {/* LISTA DE PRONÓSTICOS DEL SARGAZO (Scrollable pill list) */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {detections.map((d) => {
                  const isInspected = d.id === inspectedId;
                  const isSelectedInRoute = selectedDetectionIds.includes(d.id);

                  return (
                    <motion.div
                      key={d.id}
                      whileHover={{ scale: 1.01, x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setInspectedId(d.id);
                        if (!isSelectedInRoute) {
                          onToggleDetection(d.id);
                        }
                      }}
                      className={`p-2 rounded-xl text-xs cursor-pointer flex items-center justify-between transition-all border ${
                        isInspected
                          ? 'bg-teal-500/30 border-teal-400/60 text-white shadow-[0_0_15px_rgba(45,212,191,0.25)]'
                          : isSelectedInRoute
                          ? 'bg-white/[0.08] border-teal-400/30 text-teal-100'
                          : 'bg-black/20 border-white/5 text-slate-300 hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          d.priority === 'Alta' ? 'bg-[#EF4444] shadow-[0_0_6px_#EF4444]' : d.priority === 'Media' ? 'bg-[#F97316]' : 'bg-[#EAB308]'
                        }`} />
                        <div className="truncate">
                          <span className="font-montserrat font-bold block text-[11px] truncate">{d.codeName}</span>
                          <span className="text-[9.5px] text-teal-200/70">{d.zoneName}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-[#2DD4BF] text-xs block">
                          ~{d.massTons.toLocaleString()} t
                        </span>
                        <span className="text-[9px] font-semibold text-teal-200/60 font-mono">
                          {d.confidencePercent}% conf.
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="h-px bg-teal-400/20" />

              {/* CARD DE DETALLES Y RUTA DE RECOLECCIÓN */}
              {metrics && (
                <div className="bg-black/35 p-3 rounded-2xl border border-teal-400/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] text-teal-300 font-montserrat font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                      <NavigationArrow size={14} weight="duotone" className="text-[#2DD4BF]" />
                      Ruta Sugerida
                    </span>
                    <span className="text-[9.5px] font-mono font-bold text-teal-200 bg-teal-500/25 px-2 py-0.5 rounded-full border border-teal-400/40 flex items-center gap-1">
                      <ShieldCheck size={12} weight="bold" />
                      Corrientes evaluadas
                    </span>
                  </div>

                  {/* Grid de 2 Columnas (Distancia y Tiempo ETA - Cero Diésel) */}
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-black/40 p-2 rounded-xl border border-teal-400/15">
                      <span className="text-[9.5px] text-teal-200/70 block font-semibold">Distancia Total</span>
                      <span className="font-montserrat font-extrabold text-sm text-white block mt-0.5">
                        {metrics.optimizedDistanceKm} km
                      </span>
                      <span className="text-[9px] text-teal-300/80 font-mono">
                        {metrics.optimizedDistanceNm} MN
                      </span>
                    </div>

                    <div className="bg-black/40 p-2 rounded-xl border border-teal-400/15">
                      <span className="text-[9.5px] text-teal-200/70 block font-semibold">Tiempo Estimado</span>
                      <span className="font-montserrat font-extrabold text-sm text-[#2DD4BF] block mt-0.5">
                        {metrics.etaTotalFormatted}
                      </span>
                      <span className="text-[9px] text-teal-300/80 font-mono">
                        @ {metrics.vesselSpeedKnots} nds
                      </span>
                    </div>
                  </div>

                  {/* Multi-point Legs breakdown */}
                  {legs.length > 0 && (
                    <div className="bg-black/50 p-2 rounded-xl border border-teal-400/15 space-y-1">
                      <div className="flex items-center justify-between text-[9px] text-teal-200/80 font-mono font-bold uppercase tracking-wider">
                        <span>Desglose por Tramos ({legs.length})</span>
                      </div>
                      <div className="max-h-24 overflow-y-auto space-y-1 pr-0.5">
                        {legs.map((leg, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center justify-between text-[10px] font-mono py-0.5 px-1.5 rounded ${
                              activeStopIndex === idx
                                ? 'bg-teal-500/40 text-white font-bold'
                                : 'text-slate-200 hover:bg-white/5'
                            }`}
                          >
                            <span className="truncate pr-1">
                              T{idx + 1}: {leg.from_name || `P${leg.from_index}`} → {leg.to_name || `P${leg.to_index}`}
                            </span>
                            <span className="text-[#2DD4BF] shrink-0 font-bold">
                              {leg.distance_km} km ({Math.round(leg.time_minutes)}m)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Coastal Safety Notice */}
                  {snapWarnings.length > 0 && (
                    <div className="pt-0.5">
                      <button
                        onClick={() => setShowSnapWarnings(!showSnapWarnings)}
                        className="w-full text-left text-[9.5px] text-teal-200 bg-teal-500/15 hover:bg-teal-500/25 p-1.5 rounded-lg border border-teal-400/30 flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-1">
                          <Warning size={13} weight="duotone" className="text-amber-400 shrink-0" />
                          Avisos de navegación costera ({snapWarnings.length})
                        </span>
                        <span>{showSnapWarnings ? '▲' : '▼'}</span>
                      </button>

                      {showSnapWarnings && (
                        <div className="mt-1 p-2 bg-black/60 border border-teal-400/20 rounded-lg text-[9px] text-slate-300 space-y-1 max-h-20 overflow-y-auto font-sans leading-snug">
                          <p className="text-teal-200">
                            Puntos ajustados automáticamente al canal marítimo navegable más cercano sin alterar la seguridad de la misión.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* BOTÓN: Simular Recorrido (con icono Boat de Phosphor) */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={isSimulating ? onStopSimulation : onStartSimulation}
                    className={`w-full py-2.5 px-3 rounded-xl font-montserrat font-extrabold text-xs transition-all flex items-center justify-center space-x-2 border shadow-md cursor-pointer ${
                      isSimulating
                        ? 'bg-amber-600/90 text-white border-amber-400/50 hover:bg-amber-600 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                        : 'bg-gradient-to-r from-[#0F5247] via-[#0D9488] to-[#2DD4BF] text-slate-950 border-teal-300/40 hover:brightness-110 shadow-[0_0_15px_rgba(45,212,191,0.35)]'
                    }`}
                  >
                    <Boat size={17} weight="duotone" className={isSimulating ? 'text-white' : 'text-slate-950'} />
                    <span>{isSimulating ? 'Detener Simulación' : 'Simular Recorrido'}</span>
                  </motion.button>
                </div>
              )}
            </motion.div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default RightMetricsPanel;
