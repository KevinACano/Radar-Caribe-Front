import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Anchor, 
  Boat, 
  CaretDown, 
  CaretUp,
} from '@phosphor-icons/react';
import { SargassumManifest } from '../types';

interface MapLegendProps {
  className?: string;
  manifest?: SargassumManifest | null;
}

export const MapLegend: React.FC<MapLegendProps> = ({ 
  className = '',
  manifest = null,
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
              {/* Densidad relativa de masa (escala log del manifest) */}
              {manifest && (
                <div className="space-y-1.5">
                  <span className="text-[9.5px] font-mono text-teal-200/90 font-bold uppercase tracking-wider block">
                    Densidad relativa por celda (escala log)
                  </span>
                  <div
                    className="h-2 w-full rounded-full border border-black/30 shadow-inner"
                    style={{
                      background: `linear-gradient(to right, ${manifest.palette
                        .map((p) => `${p.color} ${(p.stop * 100).toFixed(0)}%`)
                        .join(', ')})`,
                    }}
                  />
                  <div className="flex justify-between text-[9px] text-teal-200/90 font-mono font-medium px-0.5">
                    <span>{manifest.vmin.toExponential(1)}</span>
                    <span>{manifest.vmax.toExponential(1)}</span>
                  </div>
                </div>
              )}

              {/* Trazado de Ruta Sugerida */}
              <div className="pt-1.5 border-t border-teal-400/15">
                <div className="flex items-center justify-between text-slate-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-1 rounded-full bg-[#14B8A6] shadow-[0_0_8px_#14B8A6]" />
                    <span className="text-[10.5px] font-medium text-white">Ruta Sugerida</span>
                  </div>
                  <span className="text-[9.5px] text-[#2DD4BF] font-mono font-bold">Pre-generada</span>
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

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default MapLegend;
