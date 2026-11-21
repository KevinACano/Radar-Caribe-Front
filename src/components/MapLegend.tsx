import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Anchor, 
  CaretDown, 
  CaretUp,
} from '@phosphor-icons/react';
import { SargassumManifest } from '../types';

interface MapLegendProps {
  className?: string;
  manifest?: SargassumManifest | null;
  alertSelected?: boolean;
}

export const MapLegend: React.FC<MapLegendProps> = ({ 
  className = '',
  manifest = null,
  alertSelected = false,
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
            <h4 className="font-montserrat font-bold text-xs text-white tracking-wide">
              Leyenda
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
              {manifest && (
                <div className="space-y-1.5">
                  <span className="text-[10.5px] font-medium text-white block">
                    Concentración prevista de sargazo
                  </span>
                  <div
                    className="h-2 w-full rounded-full border border-black/30 shadow-inner"
                    style={{
                      background: `linear-gradient(to right, ${manifest.palette
                        .map((p) => `${p.color} ${(p.stop * 100).toFixed(0)}%`)
                        .join(', ')})`,
                    }}
                  />
                  <div className="flex justify-between text-[10px] text-teal-200/90 font-medium px-0.5">
                    <span>Baja</span>
                    <span>Media</span>
                    <span>Alta</span>
                  </div>
                  <p className="text-[9.5px] text-teal-200/70 leading-tight">
                    Concentración relativa entre celdas de 1 km; no indica toneladas.
                  </p>
                </div>
              )}

              {alertSelected && (
                <div className="space-y-1.5 pt-1.5 border-t border-teal-400/15 text-slate-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-3 rounded-sm border-2 border-dashed border-white bg-amber-500/30 shrink-0" />
                    <span className="text-[10.5px] font-medium text-white">Masa que llega a la zona de recolección</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-3 rounded-sm bg-teal-300/20 border border-white/10 shrink-0" />
                    <span className="text-[10.5px] font-medium text-white">Sargazo fuera de la zona de recolección</span>
                  </div>
                </div>
              )}

              <div className="pt-1.5 border-t border-teal-400/15 space-y-0.5">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-1 rounded-full bg-[#14B8A6] shadow-[0_0_8px_#14B8A6] shrink-0" />
                  <span className="text-[10.5px] font-medium text-white">Ruta sugerida desde el puerto</span>
                </div>
                <p className="text-[9.5px] text-teal-200/70 leading-tight pl-7">Calculada con corrientes; no es una ruta de navegación validada.</p>
              </div>

              <div className="flex items-center space-x-1.5 text-slate-200 pt-1.5 border-t border-teal-400/15">
                <div className="w-5 h-5 rounded-md bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 shrink-0">
                  <Anchor size={12} weight="duotone" />
                </div>
                <span>Puerto</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default MapLegend;
