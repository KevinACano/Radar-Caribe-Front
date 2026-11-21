import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Compass, Anchor, NavigationArrow, ShieldCheck, Boat, Waves } from '@phosphor-icons/react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md select-none font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="bg-[#0B3B40]/95 backdrop-blur-2xl border border-teal-400/30 shadow-[0_25px_60px_rgba(0,0,0,0.75)] rounded-[24px] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 text-slate-100 space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-teal-400/20">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-[#2DD4BF] shadow-[0_0_15px_rgba(45,212,191,0.25)]">
                <Compass size={24} weight="duotone" className="text-[#2DD4BF]" />
              </div>
              <div>
                <h2 className="text-base font-montserrat font-extrabold text-white">Radar Caribe · Inteligencia Marítima</h2>
                <p className="text-xs text-teal-300 font-mono">
                  Plataforma Operativa de Intercepción y Rutas en Quintana Roo
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.15, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-1.5 text-teal-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <X size={18} weight="bold" />
            </motion.button>
          </div>

          {/* Content sections in Dark Turquoise Glass */}
          <div className="space-y-4 text-xs leading-relaxed text-slate-200">
            <section className="bg-black/30 p-4 rounded-2xl border border-teal-400/20 shadow-sm space-y-2">
              <h3 className="font-montserrat font-bold text-sm text-white flex items-center gap-2">
                <NavigationArrow size={16} weight="duotone" className="text-[#2DD4BF]" />
                1. Planificación y Trazado de Rutas de Recolección
              </h3>
              <p>
                Radar Caribe asiste a capitanes y coordinadores marítimos en la intercepción eficiente de bancos de sargazo en altamar antes de su impacto en las costas y playas turísticas.
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1 text-[11px]">
                <li>
                  <strong className="text-white">Corrientes Marinas en Tiempo Real:</strong> Integra la velocidad y dirección de la corriente de Yucatán para optimizar el avance de las embarcaciones colectoras.
                </li>
                <li>
                  <strong className="text-white">Rutas Multi-Punto:</strong> Conecta dos o más puntos sucesivamente minimizando horas de navegación en altamar.
                </li>
                <li>
                  <strong className="text-white">Ahorro de Combustible:</strong> Disminuye hasta un 25-40% el consumo de diésel marino frente a trayectos no planificados.
                </li>
              </ul>
            </section>

            <section className="bg-black/30 p-4 rounded-2xl border border-teal-400/20 shadow-sm space-y-2">
              <h3 className="font-montserrat font-bold text-sm text-white flex items-center gap-2">
                <Anchor size={16} weight="duotone" className="text-[#2DD4BF]" />
                2. Puertos Base de Apoyo Logístico
              </h3>
              <p>
                La flota opera desde muelles y terminales autorizadas en Quintana Roo con capacidad de transferencia de biomasa marina:
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 font-montserrat text-[11px] text-teal-300 font-bold">
                <div className="bg-black/40 p-2 rounded-xl border border-teal-400/15">
                  • Base Puerto Cancún
                </div>
                <div className="bg-black/40 p-2 rounded-xl border border-teal-400/15">
                  • Terminal Punta Sam
                </div>
                <div className="bg-black/40 p-2 rounded-xl border border-teal-400/15">
                  • Muelle Puerto Morelos
                </div>
                <div className="bg-black/40 p-2 rounded-xl border border-teal-400/15">
                  • Terminal Playa del Carmen
                </div>
              </div>
            </section>

            <section className="bg-black/30 p-4 rounded-2xl border border-teal-400/20 shadow-sm space-y-2">
              <h3 className="font-montserrat font-bold text-sm text-white flex items-center gap-2">
                <Waves size={16} weight="duotone" className="text-[#2DD4BF]" />
                3. Monitoreo Satelital y Puntos Personalizados
              </h3>
              <p>
                Los pronósticos de concentración se derivan de índices de vegetación marina (AFAI/NDVI) satelitales y avistamientos de patrullas. Además, el operador puede hacer clic en cualquier punto del mar para añadir áreas de inspección manuales.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default InfoModal;
