import React from 'react';
import { motion } from 'motion/react';
import { 
  CalendarCheck, 
  MapPin
} from '@phosphor-icons/react';
import { MaritimeWeather } from '../types';

interface NavbarProps {
  weather?: MaritimeWeather;
  onOpenInfoModal?: () => void;
  activeTab?: 'operativo' | 'planificacion';
  onSelectTab?: (tab: 'operativo' | 'planificacion') => void;
  backendConnected?: boolean;
  isBackendCalculating?: boolean;
  onRefreshBackend?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  activeTab = 'operativo',
  onSelectTab,
}) => {
  return (
    <div className="absolute top-3 left-3 right-3 md:top-4 md:left-6 md:right-6 z-50 pointer-events-none select-none">
      <motion.header
        initial={{ opacity: 0, y: -20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="pointer-events-auto rounded-2xl bg-[#06292D]/85 backdrop-blur-md border border-teal-400/20 shadow-[0_10px_35px_rgba(0,0,0,0.5)] px-4 md:px-6 py-2.5 flex items-center justify-between text-[#F0FDF4] font-sans"
      >
        {/* Left: Branding - Logo + Montserrat Heading (Click to return to map) */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectTab && onSelectTab('operativo')}
          className="cursor-pointer flex items-center space-x-3.5"
          title="Radar Caribe · Volver al mapa principal"
        >
          <img 
            src="/Radar Caribe.png" 
            alt="Radar Caribe" 
            className="h-10 md:h-11 w-auto object-contain filter drop-shadow-[0_2px_10px_rgba(45,212,191,0.3)] transition-transform duration-300"
          />

          <div className="border-l border-teal-400/25 pl-3">
            <h1 className="text-base md:text-lg font-montserrat font-extrabold tracking-tight text-[#F0FDF4]">
              Radar Caribe
            </h1>
            <p className="text-[10px] md:text-[10.5px] text-[#CCFBF1]/80 font-bold tracking-wider uppercase font-mono">
              Centro de Control Marítimo
            </p>
          </div>
        </motion.div>

        {/* Right: Planificación Button + Region Selector */}
        <div className="flex items-center space-x-2 md:space-x-3 text-xs">
          {/* Botón único de Planificación */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelectTab && onSelectTab('planificacion')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl transition-all font-montserrat font-bold cursor-pointer border ${
              activeTab === 'planificacion'
                ? 'bg-teal-500 text-slate-950 border-teal-300 shadow-[0_0_15px_rgba(45,212,191,0.4)]'
                : 'bg-teal-500/20 text-[#CCFBF1] border-teal-400/30 hover:bg-teal-500/30 hover:text-white'
            }`}
          >
            <CalendarCheck size={16} weight="duotone" className={activeTab === 'planificacion' ? 'text-slate-950' : 'text-[#2DD4BF]'} />
            <span>Planificación</span>
          </motion.button>

          {/* Región fija */}
          <div className="flex items-center space-x-1.5 bg-[#06292D]/90 border border-teal-400/25 px-3 py-1.5 rounded-xl text-[#F0FDF4] text-xs font-bold font-montserrat shadow-sm">
            <MapPin size={15} weight="bold" className="text-[#2DD4BF]" />
            <span>Caribe mexicano</span>
          </div>
        </div>
      </motion.header>
    </div>
  );
};

export default Navbar;
