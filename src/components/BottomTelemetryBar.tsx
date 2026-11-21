import React from 'react';
import { motion } from 'motion/react';
import { Waves, Wind, Compass } from '@phosphor-icons/react';
import { MaritimeWeather } from '../types';

interface BottomTelemetryBarProps {
  weather: MaritimeWeather;
  fuelEstimatedLiters?: number;
}

export const BottomTelemetryBar: React.FC<BottomTelemetryBarProps> = ({
  weather,
}) => {
  return (
    <>
      {/* Bottom Center: Telemetry Dock (Verde Abisal Translúcido) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-auto select-none"
      >
        <motion.div 
          whileHover={{ y: -2, scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="bg-[#06292D]/85 backdrop-blur-md border border-teal-400/20 shadow-floating rounded-[22px] px-6 py-2.5 flex items-center space-x-6 text-xs text-[#F0FDF4] font-sans"
        >
          {/* Corrientes marinas */}
          <div className="flex items-center space-x-2.5">
            <Waves size={20} weight="duotone" className="text-[#2DD4BF] filter drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]" />
            <div>
              <span className="text-[10px] text-teal-200/70 block font-semibold uppercase tracking-wider font-mono">
                Corrientes
              </span>
              <span className="font-montserrat font-bold text-white text-xs">
                {weather.currentVelocity}
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-teal-400/20" />

          {/* Mareas y oleaje */}
          <div className="flex items-center space-x-2.5">
            <Compass size={20} weight="duotone" className="text-cyan-300 filter drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
            <div>
              <span className="text-[10px] text-teal-200/70 block font-semibold uppercase tracking-wider font-mono">
                Oleaje
              </span>
              <span className="font-montserrat font-bold text-white text-xs">
                +{weather.waveHeightM} m regular
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-teal-400/20" />

          {/* Viento */}
          <div className="flex items-center space-x-2.5">
            <Wind size={20} weight="duotone" className="text-sky-300 filter drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
            <div>
              <span className="text-[10px] text-teal-200/70 block font-semibold uppercase tracking-wider font-mono">
                Viento
              </span>
              <span className="font-montserrat font-bold text-white text-xs">
                {weather.wind}
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Bottom Left: Cartography Scale Bar */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.15 }}
        className="absolute bottom-4 left-4 z-40 pointer-events-auto select-none hidden lg:block"
      >
        <div className="bg-[#06292D]/85 backdrop-blur-md border border-teal-400/20 shadow-floating rounded-[18px] px-3.5 py-1.5 text-xs text-[#F0FDF4] font-mono">
          <div className="flex items-center space-x-3 text-[9.5px] text-teal-200/70 border-b border-teal-400/20 pb-0.5">
            <span>0</span>
            <span>10</span>
            <span>25 km</span>
          </div>
          <div className="flex h-1.5 w-full mt-0.5 rounded-sm overflow-hidden">
            <div className="bg-teal-400 w-1/3" />
            <div className="bg-slate-700 w-1/3" />
            <div className="bg-teal-400 w-1/3" />
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default BottomTelemetryBar;
