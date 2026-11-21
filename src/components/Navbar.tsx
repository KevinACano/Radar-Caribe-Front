import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CalendarCheck, 
  MapPin, 
  CaretDown,
  Bell
} from '@phosphor-icons/react';
import { MaritimeWeather, AppNotification } from '../types';

interface NavbarProps {
  weather?: MaritimeWeather;
  onOpenInfoModal?: () => void;
  activeTab?: 'operativo' | 'planificacion';
  onSelectTab?: (tab: 'operativo' | 'planificacion') => void;
  backendConnected?: boolean;
  isBackendCalculating?: boolean;
  onRefreshBackend?: () => void;
  notifications?: AppNotification[];
  onNotificationClick?: (notification: AppNotification) => void;
  onMarkAllNotificationsRead?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  activeTab = 'operativo',
  onSelectTab,
  notifications = [],
  onNotificationClick,
  onMarkAllNotificationsRead,
}) => {
  const [selectedRegion, setSelectedRegion] = useState('Caribe mexicano');
  const [showRegionMenu, setShowRegionMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const regions = [
    'Caribe mexicano (Cancún – Cozumel)',
    'Costa Maya (Mahahual – Xcalak)',
    'Riviera Maya (Tulum – P. Carmen)',
  ];

  return (
    <div className="absolute top-4 left-4 right-4 md:top-5 md:left-6 md:right-6 z-50 pointer-events-none select-none">
      <motion.header
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="pointer-events-auto rounded-2xl bg-gradient-to-r from-[#DCE5D3] to-[#CFDCC6] border border-[#9DB293] shadow-[0_10px_35px_rgba(0,0,0,0.35)] px-4 md:px-6 py-2 flex items-center justify-between text-[#0F2E27] font-sans"
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
            className="h-14 md:h-16 w-auto object-contain drop-shadow-[0_3px_6px_rgba(15,46,39,0.35)] transition-transform duration-300"
          />

          <div className="border-l border-[#0F2E27]/25 pl-3 flex flex-col justify-center">
            <h1 className="text-lg md:text-xl font-display font-extrabold tracking-tight text-[#0F2E27] leading-tight">
              Radar Caribe
            </h1>
            <p className="text-[10px] md:text-[11px] text-[#2F5A4C] font-bold tracking-normal font-display mt-0.5">
              Radar de Sargazo en el Caribe
            </p>
          </div>
        </motion.div>

        {/* Right: Planificación Button + Region Selector + Notifications Bell */}
        <div className="flex items-center space-x-2 md:space-x-3 text-xs">
          {/* Botón de Planificación */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelectTab && onSelectTab('planificacion')}
            className={`focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C42] focus-visible:ring-offset-1 focus-visible:ring-offset-[#DCE5D3] flex items-center space-x-2 px-3.5 py-1.5 rounded-xl transition-all font-montserrat font-bold cursor-pointer border ${
              activeTab === 'planificacion'
                ? 'bg-[#0F4C42] text-white border-[#0F4C42] shadow-md'
                : 'bg-white/50 text-[#0F2E27] border-[#0F4C42]/40 hover:bg-white/80 hover:border-[#0F4C42]'
            }`}
          >
            <CalendarCheck size={16} weight="duotone" className={activeTab === 'planificacion' ? 'text-white' : 'text-[#0F4C42]'} />
            <span>Planificación</span>
          </motion.button>

          {/* Selector de Región */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setShowRegionMenu(!showRegionMenu);
                setShowNotifMenu(false);
              }}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C42] flex items-center space-x-1.5 bg-white/50 hover:bg-white/80 border border-[#0F4C42]/40 px-3 py-1.5 rounded-xl text-[#0F2E27] text-xs font-bold font-montserrat transition-all shadow-sm cursor-pointer"
            >
              <MapPin size={15} weight="bold" className="text-[#0F4C42]" />
              <span className="hidden sm:inline">{selectedRegion.split(' (')[0]}</span>
              <span className="sm:hidden">Caribe</span>
              <CaretDown size={12} weight="bold" className="text-[#0F4C42]" />
            </motion.button>

            <AnimatePresence>
              {showRegionMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-64 bg-[#06292D]/95 backdrop-blur-2xl border border-teal-400/30 rounded-2xl shadow-2xl p-1.5 z-50 text-xs font-sans"
                >
                  {regions.map((reg) => (
                    <button
                      key={reg}
                      onClick={() => {
                        setSelectedRegion(reg);
                        setShowRegionMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl transition-colors font-medium cursor-pointer ${
                        selectedRegion === reg
                          ? 'bg-teal-500/30 text-[#2DD4BF] font-bold border border-teal-400/30'
                          : 'text-[#F0FDF4] hover:bg-white/10'
                      }`}
                    >
                      {reg}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Botón de Notificaciones con Campana Bell y Badge Numérico (Extremo Derecho) */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setShowNotifMenu(!showNotifMenu);
                setShowRegionMenu(false);
              }}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C42] relative p-2 rounded-xl bg-white/50 text-[#0F2E27] hover:bg-white/80 border border-[#0F4C42]/40 transition-all cursor-pointer flex items-center justify-center"
              title="Centro de Alertas y Predicciones"
            >
              <Bell
                size={17}
                weight={unreadCount > 0 ? 'duotone' : 'bold'}
                className={unreadCount > 0 ? 'text-amber-700' : 'text-[#0F4C42]'}
              />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-400 text-[#06292D] text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center font-montserrat shadow-md animate-pulse">
                  {unreadCount}
                </span>
              )}
            </motion.button>

            {/* Menú desplegable de Alertas y Notificaciones alineado a la derecha */}
            <AnimatePresence>
              {showNotifMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-80 md:w-96 bg-[#06292D]/95 backdrop-blur-2xl border border-teal-400/30 rounded-2xl shadow-2xl p-3 z-50 text-xs font-sans text-slate-100"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-teal-400/20 mb-2">
                    <div className="flex items-center space-x-2">
                      <Bell size={16} weight="duotone" className="text-amber-400" />
                      <span className="font-montserrat font-bold text-white text-xs">
                        Alertas y Detecciones
                      </span>
                    </div>
                    {unreadCount > 0 && onMarkAllNotificationsRead && (
                      <button
                        onClick={onMarkAllNotificationsRead}
                        className="text-[10px] text-teal-300 hover:text-teal-200 cursor-pointer font-montserrat font-semibold"
                      >
                        Marcar todas leídas
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      No hay alertas registradas en este momento
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            if (onNotificationClick) onNotificationClick(notif);
                            setShowNotifMenu(false);
                          }}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                            notif.read
                              ? 'bg-white/5 border-teal-400/10 text-slate-300 hover:bg-white/10'
                              : 'bg-teal-950/60 border-amber-400/40 text-white hover:bg-teal-900/60 shadow-[0_0_12px_rgba(251,191,36,0.15)]'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-1.5">
                              {!notif.read && (
                                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                              )}
                              <h5 className="font-montserrat font-bold text-xs text-amber-200">
                                {notif.title}
                              </h5>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {notif.timestamp}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-200 mt-1 leading-snug">
                            {notif.message}
                          </p>
                          <div className="mt-1.5 flex items-center space-x-1 text-[10px] text-teal-300 font-montserrat font-bold">
                            <MapPin size={12} weight="bold" />
                            <span>Clic para ver masa y ruta</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.header>
    </div>
  );
};

export default Navbar;
