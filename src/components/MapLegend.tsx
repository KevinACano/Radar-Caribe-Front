import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Anchor, 
  Boat, 
  MapPin, 
  CaretDown, 
  CaretUp,
  Square,
  Warning
} from '@phosphor-icons/react';

interface MapLegendProps {
  className?: string;
  runType?: string;
}

export const MapLegend: React.FC<MapLegendProps> = ({ 
  className = '',
  runType = 'synthetic_demo' 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
      className={`absolute bottom-16 left-4 z-30 pointer-events-auto select-none max-w-xs ${className}`}
    >
      <div className="bg-[#06292D]/85 backdrop-blur-md border border-teal-400/20 shadow-floating rounded-2xl p-3 text-xs text-[#F0FDF4] font-sans">
        {/* Header with collapse button */}
        <div 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center justify-between cursor-pointer pb-1.5 border-b border-teal-400/20"
        >
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_8px_#2DD4BF]" />
            <h4 className="font-montserrat font-bold text-xs text-white tracking-wide">
              Leyenda Marítima
            </h4>
          </div>
          <button 
            type="button"
            className="p-1 text-teal-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            {isCollapsed ? <CaretUp size={14} weight="bold" /> : <CaretDown size={14} weight="bold" />}
          </button>
        </div>

        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-2.5 pt-2 text-[11px]"
            >
              {/* Probabilidad de Presencia Detectable (0–1) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-mono text-teal-200/90 font-bold uppercase tracking-wider block">
                    Probabilidad de presencia detectable (0–1)
                  </span>
                </div>

                {/* 5-step heatmap gradient */}
                <div 
                  className="h-2 w-full rounded-full border border-black/30 shadow-inner"
                  style={{
                    background: 'linear-gradient(to right, #ffffb2 0%, #fecc5c 25%, #fd8d3c 50%, #f03b20 75%, #bd0026 100%)'
                  }}
                />

                <div className="flex justify-between text-[9px] text-teal-200/90 font-mono font-medium px-0.5">
                  <span>0.05</span>
                  <span>0.25</span>
                  <span>0.50</span>
                  <span>0.75</span>
                  <span className="font-bold text-red-400">1.00</span>
                </div>
              </div>

              {/* Trazado de Ruta Sugerida */}
              <div className="pt-1.5 border-t border-teal-400/15">
                <div className="flex items-center justify-between text-slate-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-1 rounded-full bg-[#14B8A6] shadow-[0_0_8px_#14B8A6]" />
                    <span className="text-[10.5px] font-medium text-white">Ruta Sugerida</span>
                  </div>
                  <span className="text-[9.5px] text-[#2DD4BF] font-mono font-bold">Óptima continua</span>
                </div>
              </div>

              {/* Iconos de Elementos */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-1.5 border-t border-teal-400/15">
                <div className="flex items-center space-x-1.5 text-slate-200">
                  <div className="w-5 h-5 rounded-md bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 shrink-0">
                    <Anchor size={12} weight="duotone" />
                  </div>
                  <span className="truncate">Puerto Base</span>
                </div>

                <div className="flex items-center space-x-1.5 text-slate-200">
                  <div className="w-5 h-5 rounded-md bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 shrink-0">
                    <Boat size={12} weight="duotone" />
                  </div>
                  <span className="truncate">Embarcación</span>
                </div>

                <div className="flex items-center space-x-1.5 text-slate-200">
                  <div className="w-5 h-5 rounded-md bg-[#bd0026]/40 border-2 border-[#14B8A6] flex items-center justify-center text-white shrink-0 shadow-[0_0_8px_rgba(20,184,166,0.5)]">
                    <Square size={10} weight="fill" className="text-[#14B8A6]" />
                  </div>
                  <span className="truncate">Celda en Ruta</span>
                </div>

                <div className="flex items-center space-x-1.5 text-slate-200">
                  <div className="w-5 h-5 rounded-md bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
                    <MapPin size={12} weight="duotone" />
                  </div>
                  <span className="truncate">Punto Manual</span>
                </div>
              </div>

              {/* Synthetic demo notice */}
              {runType === 'synthetic_demo' && (
                <div className="mt-2 pt-1.5 border-t border-teal-400/15 flex items-start space-x-1.5 text-[9.5px] text-teal-200/75 leading-tight">
                  <Warning size={13} weight="duotone" className="text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Simulación de demostración — Probabilidad de presencia detectable (0–1).
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default MapLegend;
