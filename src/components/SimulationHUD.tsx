import React from 'react';
import { motion } from 'motion/react';
import { Play, Pause, ArrowCounterClockwise, X, Boat } from '@phosphor-icons/react';
import { RouteStop } from '../types';

interface SimulationHUDProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  onClose: () => void;
  speed: number;
  onChangeSpeed: (newSpeed: number) => void;
  progressPercent: number;
  currentLegIndex: number;
  stops: RouteStop[];
  totalDistanceKm: number;
  currentDistanceKm: number;
}

export const SimulationHUD: React.FC<SimulationHUDProps> = ({
  isPlaying,
  onTogglePlay,
  onReset,
  onClose,
  speed,
  onChangeSpeed,
  progressPercent,
  currentLegIndex,
  stops,
  totalDistanceKm,
  currentDistanceKm,
}) => {
  const currentTarget = stops[currentLegIndex + 1] || stops[stops.length - 1];
  const originPoint = stops[currentLegIndex] || stops[0];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 26 }}
      className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 pointer-events-auto select-none font-sans max-w-2xl w-[94vw] md:w-auto"
    >
      <div className="bg-[#06292D]/90 backdrop-blur-md border border-teal-400/25 shadow-floating rounded-2xl px-3.5 md:px-5 py-2.5 flex items-center justify-between space-x-3 md:space-x-4 text-xs text-[#F0FDF4]">
        {/* 1. Play / Pause & Reset */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <motion.button
            type="button"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={onTogglePlay}
            className={`px-3 py-1.5 rounded-xl font-bold font-montserrat flex items-center space-x-1.5 text-xs transition-colors cursor-pointer border ${
              isPlaying
                ? 'bg-amber-600/80 border-amber-400/40 text-white hover:bg-amber-600 shadow-[0_0_10px_rgba(217,119,6,0.3)]'
                : 'bg-teal-600/80 border-teal-400/40 text-white hover:bg-teal-600 shadow-[0_0_10px_rgba(13,148,136,0.3)]'
            }`}
            title={isPlaying ? 'Pausar simulación' : 'Reanudar simulación'}
          >
            {isPlaying ? <Pause size={13} weight="bold" /> : <Play size={13} weight="bold" />}
            <span>{isPlaying ? 'Pausar' : 'Play'}</span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={onReset}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-slate-200 transition-colors cursor-pointer"
            title="Reiniciar recorrido"
          >
            <ArrowCounterClockwise size={14} weight="bold" />
          </motion.button>
        </div>

        <div className="h-6 w-px bg-teal-400/20 shrink-0 hidden sm:block" />

        {/* 2. Current Leg & Progress */}
        <div className="flex items-center space-x-2.5 truncate">
          <Boat size={18} weight="duotone" className="text-[#2DD4BF] shrink-0 animate-pulse" />
          <div className="truncate">
            <div className="text-[10px] text-teal-200/80 font-mono font-bold flex items-center gap-1 truncate">
              <span>T{currentLegIndex + 1}/{Math.max(1, stops.length - 1)}:</span>
              <span className="text-white font-montserrat font-bold truncate">
                {originPoint?.name?.split(' ')[0]} → {currentTarget?.codeName || currentTarget?.name}
              </span>
            </div>
            <div className="flex items-center space-x-2 mt-0.5">
              <div className="w-20 md:w-28 bg-black/50 h-1.5 rounded-full overflow-hidden border border-teal-400/20">
                <div
                  className="bg-gradient-to-r from-[#14B8A6] to-[#2DD4BF] h-full rounded-full shadow-[0_0_8px_#2DD4BF]"
                  style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                />
              </div>
              <span className="text-[10px] font-mono font-black text-[#2DD4BF]">
                {Math.round(progressPercent)}%
              </span>
            </div>
          </div>
        </div>

        <div className="h-6 w-px bg-teal-400/20 shrink-0 hidden md:block" />

        {/* 3. Distance */}
        <div className="hidden md:flex items-center space-x-2 font-mono text-[11px] text-teal-100 shrink-0">
          <span className="text-teal-200/70">{currentDistanceKm.toFixed(1)} / {totalDistanceKm.toFixed(1)} km</span>
        </div>

        {/* 4. Speed Selector (1x, 2x, 4x) */}
        <div className="flex items-center space-x-0.5 bg-black/40 p-0.5 rounded-xl border border-teal-400/20 shrink-0">
          {[1, 2, 4].map((spd) => (
            <button
              key={spd}
              type="button"
              onClick={() => onChangeSpeed(spd)}
              className={`px-1.5 py-0.5 rounded-lg text-[10.5px] font-mono font-bold transition-colors cursor-pointer ${
                speed === spd
                  ? 'bg-[#2DD4BF] text-slate-950 font-black shadow-[0_0_6px_#2DD4BF]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-teal-400/20 shrink-0" />

        {/* 5. Close Button */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          title="Cerrar simulación"
        >
          <X size={15} weight="bold" />
        </motion.button>
      </div>
    </motion.div>
  );
};

export default SimulationHUD;
