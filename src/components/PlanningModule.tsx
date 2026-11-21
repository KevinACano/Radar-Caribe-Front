import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CalendarCheck, 
  Clock, 
  Boat, 
  Anchor, 
  MapPin, 
  FloppyDisk, 
  NavigationArrow, 
  Trash, 
  CheckCircle, 
  Warning, 
  X, 
  Plus,
  Compass,
  GasPump
} from '@phosphor-icons/react';
import { BasePort, CustomWaypoint, MaritimeWeather, MissionPlan, SargassumDetection } from '../types';

interface PlanningModuleProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'planificacion' | 'historial';
  onSelectTab: (tab: 'operativo' | 'planificacion' | 'historial') => void;
  ports: BasePort[];
  detections: SargassumDetection[];
  customWaypoints: CustomWaypoint[];
  weather: MaritimeWeather;
  savedPlans: MissionPlan[];
  onSavePlan: (newPlan: MissionPlan) => void;
  onDeletePlan: (planId: string) => void;
  onLoadPlanToMap: (plan: MissionPlan) => void;
}

const AVAILABLE_VESSELS = [
  'Sargacera Mayor ECO-01',
  'Sargacera ECO-02 (Patrulla Centro)',
  'Barco Colector Norte',
  'Patrulla Costera Sur ECO-03',
  'Intersector Alfa Riviera',
];

export const PlanningModule: React.FC<PlanningModuleProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  ports,
  detections,
  customWaypoints,
  weather,
  savedPlans,
  onSavePlan,
  onDeletePlan,
  onLoadPlanToMap,
}) => {
  // Form State
  const [title, setTitle] = useState('Jornada Matutina de Recolección');
  const [scheduledDate, setScheduledDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [scheduledTime, setScheduledTime] = useState('07:30');
  const [selectedVessel, setSelectedVessel] = useState(AVAILABLE_VESSELS[0]);
  const [selectedPortId, setSelectedPortId] = useState(ports[0]?.id || 'port-juarez');
  const [assignedTargetIds, setAssignedTargetIds] = useState<string[]>([
    detections[0]?.id || 'SARG-QR-01',
    detections[1]?.id || 'SARG-QR-02',
  ]);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState(false);

  const selectedPort = ports.find((p) => p.id === selectedPortId) || ports[0];

  const assignedDetections = detections.filter((d) => assignedTargetIds.includes(d.id));
  const assignedCustomPoints = customWaypoints.filter((wp) => assignedTargetIds.includes(wp.id));

  // Compute Mission Estimates
  const totalBiomassTons = assignedDetections.reduce((sum, d) => sum + d.massTons, 0) +
    assignedCustomPoints.reduce((sum, wp) => sum + (wp.massTons || 0), 0);

  const totalPointsCount = assignedDetections.length + assignedCustomPoints.length;
  // Estimate distance roughly 15-20km per target
  const estimatedDistKm = Math.round(Math.max(12, totalPointsCount * 18.5));
  const estimatedDistNm = Number((estimatedDistKm / 1.852).toFixed(1));
  const estimatedHours = Math.floor(estimatedDistKm / 14.8);
  const estimatedMins = Math.round(((estimatedDistKm / 14.8) - estimatedHours) * 60);
  const estimatedDuration = `${estimatedHours} h ${estimatedMins} m`;

  const handleToggleTarget = (id: string) => {
    setAssignedTargetIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSavePlan = () => {
    const newPlan: MissionPlan = {
      id: `plan-${Date.now()}`,
      title,
      scheduledDate,
      scheduledTime,
      vesselName: selectedVessel,
      portId: selectedPort.id,
      portName: selectedPort.name,
      assignedPointIds: assignedTargetIds,
      assignedPointsSummary: `${assignedDetections.map((d) => d.codeName).join(', ')}${assignedCustomPoints.length > 0 ? ` + ${assignedCustomPoints.length} manuales` : ''}`,
      totalDistanceKm: estimatedDistKm,
      totalDistanceNm: estimatedDistNm,
      totalDurationFormatted: estimatedDuration,
      totalMassTons: totalBiomassTons,
      weatherStatus: weather.status,
      createdAt: new Date().toLocaleString(),
      status: 'Programada',
    };

    onSavePlan(newPlan);
    setSavedSuccessMsg(true);
    setTimeout(() => setSavedSuccessMsg(false), 3000);
  };

  const handleLoadAndGo = () => {
    const planToLoad: MissionPlan = {
      id: `temp-${Date.now()}`,
      title,
      scheduledDate,
      scheduledTime,
      vesselName: selectedVessel,
      portId: selectedPort.id,
      portName: selectedPort.name,
      assignedPointIds: assignedTargetIds,
      assignedPointsSummary: title,
      totalDistanceKm: estimatedDistKm,
      totalDistanceNm: estimatedDistNm,
      totalDurationFormatted: estimatedDuration,
      totalMassTons: totalBiomassTons,
      weatherStatus: weather.status,
      createdAt: new Date().toLocaleString(),
      status: 'Programada',
    };
    onLoadPlanToMap(planToLoad);
    onSelectTab('operativo');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="bg-[#0B3B40]/95 backdrop-blur-2xl border border-teal-400/30 shadow-[0_20px_60px_rgba(0,0,0,0.7)] rounded-[26px] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden font-sans text-slate-100"
        >
          {/* Header */}
          <div className="p-5 border-b border-teal-400/20 flex items-center justify-between bg-black/20">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-[#2DD4BF]">
                {activeTab === 'planificacion' ? (
                  <CalendarCheck size={24} weight="duotone" />
                ) : (
                  <Clock size={24} weight="duotone" />
                )}
              </div>
              <div>
                <h2 className="text-base font-montserrat font-extrabold text-white tracking-tight">
                  {activeTab === 'planificacion' ? 'Planificación Operativa de Recolección' : 'Historial de Rutas Guardadas'}
                </h2>
                <p className="text-xs text-teal-200/80">
                  {activeTab === 'planificacion' 
                    ? 'Asigna embarcaciones, horarios y bancos de sargazo para la jornada' 
                    : 'Revisa y ejecuta planes operativos previos en el mapa'}
                </p>
              </div>
            </div>

            {/* Tab switchers + Close button */}
            <div className="flex items-center space-x-2">
              <div className="flex bg-black/40 p-1 rounded-xl border border-teal-400/20 text-xs">
                <button
                  onClick={() => onSelectTab('planificacion')}
                  className={`px-3 py-1.5 rounded-lg font-montserrat font-bold transition-colors ${
                    activeTab === 'planificacion' 
                      ? 'bg-[#2DD4BF] text-slate-950 shadow-[0_0_10px_#2DD4BF]' 
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Nuevo Plan
                </button>
                <button
                  onClick={() => onSelectTab('historial')}
                  className={`px-3 py-1.5 rounded-lg font-montserrat font-bold transition-colors ${
                    activeTab === 'historial' 
                      ? 'bg-[#2DD4BF] text-slate-950 shadow-[0_0_10px_#2DD4BF]' 
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Historial ({savedPlans.length})
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-xl text-teal-300 hover:text-white transition-colors"
                title="Cerrar ventana"
              >
                <X size={18} weight="bold" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === 'planificacion' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Form: 7 cols */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Mission Title */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono font-bold text-teal-300 uppercase tracking-wider">
                      Nombre de la Operación
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full text-xs font-montserrat font-bold text-white bg-black/40 border border-teal-400/30 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]"
                      placeholder="Ej. Operativo Norte Cancún - Cozumel"
                    />
                  </div>

                  {/* Date and Time Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-bold text-teal-300 uppercase tracking-wider">
                        Fecha de Zarpe
                      </label>
                      <input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="w-full text-xs font-montserrat font-bold text-white bg-black/40 border border-teal-400/30 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2DD4BF] cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-bold text-teal-300 uppercase tracking-wider">
                        Hora Estimada
                      </label>
                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full text-xs font-montserrat font-bold text-white bg-black/40 border border-teal-400/30 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2DD4BF] cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Vessel and Base Port Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1">
                        <Boat size={14} weight="duotone" /> Embarcación
                      </label>
                      <select
                        value={selectedVessel}
                        onChange={(e) => setSelectedVessel(e.target.value)}
                        className="w-full text-xs font-montserrat font-bold text-white bg-black/40 border border-teal-400/30 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2DD4BF] cursor-pointer"
                      >
                        {AVAILABLE_VESSELS.map((v) => (
                          <option key={v} value={v} className="bg-[#0B3B40] text-white">
                            🚤 {v}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1">
                        <Anchor size={14} weight="duotone" /> Puerto Base
                      </label>
                      <select
                        value={selectedPortId}
                        onChange={(e) => setSelectedPortId(e.target.value)}
                        className="w-full text-xs font-montserrat font-bold text-white bg-black/40 border border-teal-400/30 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2DD4BF] cursor-pointer"
                      >
                        {ports.map((p) => (
                          <option key={p.id} value={p.id} className="bg-[#0B3B40] text-white">
                            ⚓ {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Targets Checklist */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-mono font-bold text-teal-300 uppercase tracking-wider">
                        Bancos de Sargazo y Puntos Asignados ({assignedTargetIds.length})
                      </label>
                      <span className="text-[10px] text-teal-200/60 font-mono">
                        Selecciona los objetivos a visitar
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {detections.map((d) => {
                        const isChecked = assignedTargetIds.includes(d.id);
                        return (
                          <div
                            key={d.id}
                            onClick={() => handleToggleTarget(d.id)}
                            className={`p-2 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                              isChecked
                                ? 'bg-teal-500/25 border-teal-400/60 text-white shadow-[0_0_10px_rgba(45,212,191,0.2)]'
                                : 'bg-black/25 border-white/5 text-slate-300 hover:bg-white/5'
                            }`}
                          >
                            <div className="truncate">
                              <span className="font-montserrat font-bold text-[11px] block truncate">{d.codeName}</span>
                              <span className="text-[9.5px] text-teal-200/70">{d.zoneName}</span>
                            </div>
                            <span className="font-mono text-teal-300 font-bold text-[11px]">~{d.massTons}t</span>
                          </div>
                        );
                      })}

                      {customWaypoints.map((wp) => {
                        const isChecked = assignedTargetIds.includes(wp.id);
                        return (
                          <div
                            key={wp.id}
                            onClick={() => handleToggleTarget(wp.id)}
                            className={`p-2 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                              isChecked
                                ? 'bg-cyan-500/25 border-cyan-400/60 text-white'
                                : 'bg-black/25 border-white/5 text-slate-300 hover:bg-white/5'
                            }`}
                          >
                            <div className="truncate">
                              <span className="font-montserrat font-bold text-[11px] block truncate">{wp.name}</span>
                              <span className="text-[9.5px] text-cyan-300/80">Punto manual</span>
                            </div>
                            <span className="font-mono text-cyan-300 font-bold text-[11px]">~{wp.massTons || 0}t</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right: Operational Summary Card (5 cols) */}
                <div className="lg:col-span-5 bg-black/40 border border-teal-400/25 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between pb-2 border-b border-teal-400/20">
                      <h4 className="font-montserrat font-bold text-sm text-white flex items-center gap-1.5">
                        <Compass size={17} weight="duotone" className="text-[#2DD4BF]" />
                        Resumen de la Misión
                      </h4>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        {weather.status}
                      </span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="bg-black/40 p-2 rounded-xl border border-teal-400/15">
                        <span className="text-[10px] text-teal-200/70 block font-semibold">Biomasa Estimada</span>
                        <span className="font-montserrat font-extrabold text-base text-white block mt-0.5">
                          ~{totalBiomassTons.toLocaleString()} t
                        </span>
                        <span className="text-[9px] text-teal-300 font-mono">
                          {totalPointsCount} bancos asignados
                        </span>
                      </div>

                      <div className="bg-black/40 p-2 rounded-xl border border-teal-400/15">
                        <span className="text-[10px] text-teal-200/70 block font-semibold">Distancia Recorrido</span>
                        <span className="font-montserrat font-extrabold text-base text-[#2DD4BF] block mt-0.5">
                          {estimatedDistKm} km
                        </span>
                        <span className="text-[9px] text-teal-300 font-mono">
                          ~{estimatedDistNm} MN
                        </span>
                      </div>

                      <div className="bg-black/40 p-2 rounded-xl border border-teal-400/15">
                        <span className="text-[10px] text-teal-200/70 block font-semibold">Tiempo Estimado</span>
                        <span className="font-montserrat font-extrabold text-sm text-amber-300 block mt-0.5">
                          {estimatedDuration}
                        </span>
                        <span className="text-[9px] text-teal-200/60 font-mono">
                          a 8.0 nudos vel.
                        </span>
                      </div>

                      <div className="bg-black/40 p-2 rounded-xl border border-teal-400/15">
                        <span className="text-[10px] text-teal-200/70 block font-semibold">Diésel Aprox.</span>
                        <span className="font-montserrat font-extrabold text-sm text-white block mt-0.5">
                          {Math.round(estimatedDistKm * 1.89)} L
                        </span>
                        <span className="text-[9px] text-emerald-300 font-mono">
                          Consumo estándar
                        </span>
                      </div>
                    </div>

                    {/* Weather preview */}
                    <div className="bg-teal-950/40 p-2.5 rounded-xl border border-teal-400/20 text-xs text-slate-200 space-y-1">
                      <div className="text-[10px] text-teal-300 font-mono font-bold uppercase">
                        Condición Meteorológica Marítima
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span>Viento: <strong>{weather.wind}</strong></span>
                        <span>Oleaje: <strong>+{weather.waveHeightM} m</strong></span>
                      </div>
                      <div className="text-[10px] text-teal-200/80">
                        Corrientes: {weather.currentVelocity} {weather.currentDirection}
                      </div>
                    </div>

                    {savedSuccessMsg && (
                      <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs flex items-center gap-1.5 font-bold">
                        <CheckCircle size={16} weight="bold" />
                        Plan guardado en el Historial con éxito
                      </div>
                    )}
                  </div>

                  {/* Actions Buttons */}
                  <div className="space-y-2 pt-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleLoadAndGo}
                      className="w-full py-2.5 px-4 rounded-xl font-montserrat font-extrabold text-xs bg-gradient-to-r from-[#0F5247] via-[#0D9488] to-[#2DD4BF] text-slate-950 shadow-[0_0_20px_rgba(45,212,191,0.35)] flex items-center justify-center space-x-2 cursor-pointer border border-teal-300/40"
                    >
                      <NavigationArrow size={16} weight="bold" />
                      <span>Cargar en Mapa Operativo</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSavePlan}
                      className="w-full py-2.5 px-4 rounded-xl font-montserrat font-bold text-xs bg-white/10 hover:bg-white/20 text-white border border-teal-400/30 flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <FloppyDisk size={16} weight="duotone" />
                      <span>Guardar Plan de Ruta</span>
                    </motion.button>
                  </div>
                </div>
              </div>
            ) : (
              /* TAB: HISTORIAL DE RUTAS */
              <div className="space-y-4">
                {savedPlans.length === 0 ? (
                  <div className="text-center py-16 space-y-3 text-slate-400">
                    <Clock size={48} weight="duotone" className="mx-auto text-teal-400/40" />
                    <p className="text-sm font-montserrat font-bold text-slate-200">
                      No hay planes de recolección guardados todavía.
                    </p>
                    <p className="text-xs text-teal-200/60 max-w-md mx-auto">
                      Crea un nuevo plan operativo en la pestaña "Nuevo Plan" y guárdalo para poder consultarlo y cargarlo al mapa cuando lo requieras.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {savedPlans.map((plan) => (
                      <div
                        key={plan.id}
                        className="bg-black/35 border border-teal-400/25 rounded-2xl p-4 space-y-3 flex flex-col justify-between hover:border-teal-400/50 transition-colors"
                      >
                        <div>
                          <div className="flex items-center justify-between pb-1.5 border-b border-teal-400/15">
                            <span className="font-montserrat font-bold text-sm text-white truncate pr-2">
                              {plan.title}
                            </span>
                            <span className="text-[10px] font-mono text-teal-300 bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-400/25">
                              {plan.status}
                            </span>
                          </div>

                          <div className="text-xs space-y-1.5 pt-2 text-slate-300">
                            <div className="flex justify-between">
                              <span className="text-teal-200/70">Zarpe:</span>
                              <strong className="text-white font-mono">{plan.scheduledDate} a las {plan.scheduledTime} hrs</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-teal-200/70">Embarcación:</span>
                              <strong className="text-teal-300">{plan.vesselName}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-teal-200/70">Puerto base:</span>
                              <strong className="text-white">{plan.portName}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-teal-200/70">Estimación:</span>
                              <strong className="text-[#2DD4BF] font-mono">{plan.totalDistanceKm} km · ~{plan.totalMassTons} t ({plan.totalDurationFormatted})</strong>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2 pt-2 border-t border-teal-400/15">
                          <button
                            onClick={() => {
                              onLoadPlanToMap(plan);
                              onSelectTab('operativo');
                            }}
                            className="flex-1 py-1.5 px-3 rounded-xl bg-teal-600/80 hover:bg-teal-600 text-white font-montserrat font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors"
                          >
                            <NavigationArrow size={14} weight="bold" />
                            <span>Cargar en Mapa</span>
                          </button>

                          <button
                            onClick={() => onDeletePlan(plan.id)}
                            className="p-1.5 rounded-xl bg-white/10 hover:bg-red-500/20 text-slate-300 hover:text-red-400 transition-colors"
                            title="Eliminar plan"
                          >
                            <Trash size={16} weight="bold" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PlanningModule;
