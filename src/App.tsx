import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell } from '@phosphor-icons/react';
import { Navbar } from './components/Navbar';
import { MapBoard } from './components/MapBoard';
import { LeftSidebar } from './components/LeftSidebar';
import { BottomTelemetryBar } from './components/BottomTelemetryBar';
import { InfoModal } from './components/InfoModal';
import { MapLegend } from './components/MapLegend';
import { PlanningModule } from './components/PlanningModule';
import { CURRENT_MARITIME_WEATHER as LOCAL_WEATHER } from './data/sargassumData';
import { calculateBearing, interpolatePosition } from './utils/geo';
import { fmtUtc } from './utils/density';
import {
  AlertDetail,
  AlertsResponse,
  AppNotification,
  BasePort,
  DashboardLayers,
  FrameCollection,
  MaritimeWeather,
  MissionPlan,
  SargassumManifest,
} from './types';
import {
  checkBackendHealth,
  fetchAlertDetail,
  fetchAlerts,
  fetchBackendPorts,
  fetchBackendWeather,
  fetchCollectionAreas,
  fetchFrame,
  fetchManifest,
} from './services/api';

const STORAGE_KEY_PLANS = 'radar_caribe_saved_mission_plans_v2';

export const App: React.FC = () => {
  // Backend data
  const [ports, setPorts] = useState<BasePort[]>([]);
  const [weather, setWeather] = useState<MaritimeWeather>(LOCAL_WEATHER);
  const [backendConnected, setBackendConnected] = useState<boolean>(true);
  const [alertsData, setAlertsData] = useState<AlertsResponse | null>(null);
  const [manifest, setManifest] = useState<SargassumManifest | null>(null);
  const [areas, setAreas] = useState<Record<string, GeoJSON.Polygon>>({});
  const [frame, setFrame] = useState<FrameCollection | null>(null);
  const [details, setDetails] = useState<Record<string, AlertDetail>>({});
  const detailRequests = useRef<Set<string>>(new Set());
  const frameCache = useRef<Map<number, FrameCollection>>(new Map());

  // Selection
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [selectedPortId, setSelectedPortId] = useState<string>('');
  const [minutes, setMinutes] = useState<number>(0);
  const [focusBounds, setFocusBounds] = useState<[[number, number], [number, number]] | null>(null);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);

  // Layer Visibility
  const [layers, setLayers] = useState<DashboardLayers>({
    sargassumPrediction: true,
    currents: true,
    tides: false,
    wind: false,
    optimalRoutes: true,
    fuelConsumption: false,
    basemapMode: 'satellite',
    coordinates: false,
  });

  // UI
  const [isLeftOpen, setIsLeftOpen] = useState<boolean>(true);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'operativo' | 'planificacion'>('operativo');

  const [savedPlans, setSavedPlans] = useState<MissionPlan[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PLANS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Simulation
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [currentLegIndex, setCurrentLegIndex] = useState<number>(0);
  const [legProgressFraction, setLegProgressFraction] = useState<number>(0);
  const [vesselPosition, setVesselPosition] = useState<[number, number] | null>(null);
  const [vesselBearing, setVesselBearing] = useState<number>(0);

  const alerts = alertsData?.alerts ?? [];
  const runId = alertsData?.run_id ?? manifest?.run_id ?? null;

  // Detail fetch (in-memory cache; one request per alert)
  const ensureDetail = useCallback((id: string) => {
    if (detailRequests.current.has(id)) return;
    detailRequests.current.add(id);
    fetchAlertDetail(id)
      .then((d) => setDetails((prev) => ({ ...prev, [id]: d })))
      .catch(() => detailRequests.current.delete(id));
  }, []);

  const handleSelectAlert = useCallback(
    (id: string) => {
      const alert = alerts.find((a) => a.id === id);
      if (!alert) return;
      setSelectedAlertId(id);
      setSelectedPortId(alert.recommended_port_id);
      setMinutes(alert.frame_minutes);
      const [w, s, e, n] = alert.mass.bbox;
      setFocusBounds([[s, w], [n, e]]);
      setReadIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      setActiveToast(null);
      ensureDetail(id);
    },
    [alerts, ensureDetail]
  );

  const syncWithBackend = async () => {
    const health = await checkBackendHealth();
    if (health.status !== 'ok') {
      setBackendConnected(false);
      return;
    }
    setBackendConnected(true);
    const [p, a, w] = await Promise.all([
      fetchBackendPorts().catch(() => [] as BasePort[]),
      fetchAlerts().catch(() => null),
      fetchBackendWeather().catch(() => LOCAL_WEATHER),
    ]);
    setPorts(p);
    setWeather(w);
    setAlertsData(a);
    if (a) {
      const m = await fetchManifest(a.run_id).catch(() => null);
      setManifest(m);
    }
  };

  useEffect(() => {
    syncWithBackend();
  }, []);

  // Toast announcing the alerts; nothing is selected until the user picks one
  useEffect(() => {
    if (alerts.length === 0) return;
    setActiveToast(toNotification(alerts[0], false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertsData]);

  // Collection area polygons: used for dimming logic only, never drawn
  useEffect(() => {
    if (!runId) return;
    fetchCollectionAreas(runId)
      .then((fc) => setAreas(Object.fromEntries(fc.features.map((f) => [f.properties.id, f.geometry]))))
      .catch(() => setAreas({}));
  }, [runId]);

  // Frame for the time control
  useEffect(() => {
    if (!runId) return;
    const cached = frameCache.current.get(minutes);
    if (cached) {
      setFrame(cached);
      return;
    }
    let cancelled = false;
    fetchFrame(runId, minutes)
      .then((f) => {
        frameCache.current.set(minutes, f);
        if (!cancelled) setFrame(f);
      })
      .catch(() => {
        if (!cancelled) setFrame(null);
      });
    return () => {
      cancelled = true;
    };
  }, [runId, minutes]);

  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => setActiveToast(null), 8000);
    return () => clearTimeout(timer);
  }, [activeToast]);

  const toNotification = (a: AlertsResponse['alerts'][number], read: boolean): AppNotification => ({
    id: a.id,
    title: a.title,
    message: `Predicción ${fmtUtc(a.prediction_utc)} · masa de ${a.mass.area_km2.toFixed(1)} km²`,
    timestamp: fmtUtc(a.prediction_utc),
    read,
  });

  const notifications = useMemo(
    () => alerts.map((a) => toNotification(a, readIds.includes(a.id))),
    [alerts, readIds]
  );

  const handleNotificationClick = (notif: AppNotification) => handleSelectAlert(notif.id);
  const handleMarkAllNotificationsRead = () => setReadIds(alerts.map((a) => a.id));

  const persistPlans = (updated: MissionPlan[]) => {
    try {
      localStorage.setItem(STORAGE_KEY_PLANS, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    return updated;
  };
  const handleSavePlan = (newPlan: MissionPlan) => setSavedPlans((prev) => persistPlans([newPlan, ...prev]));
  const handleDeletePlan = (planId: string) =>
    setSavedPlans((prev) => persistPlans(prev.filter((p) => p.id !== planId)));

  const handleLoadPlanToMap = (plan: MissionPlan) => {
    const first = plan.assignedAlertIds.find((id) => alerts.some((a) => a.id === id));
    if (first) handleSelectAlert(first);
    if (plan.portId) setSelectedPortId(plan.portId);
    setActiveTab('operativo');
  };

  const selectedAlert = alerts.find((a) => a.id === selectedAlertId) ?? null;
  const selectedDetail = selectedAlertId ? details[selectedAlertId] ?? null : null;
  const selectedRoute = selectedDetail?.routes[selectedPortId] ?? null;

  const routeCoordinates: [number, number][] = useMemo(
    () =>
      selectedRoute?.status === 'ok' && selectedRoute.route
        ? selectedRoute.route.coordinates.map(([lon, lat]) => [lat, lon] as [number, number])
        : [],
    [selectedRoute]
  );

  const handleCycleBasemapMode = () => {
    setLayers((prev) => ({
      ...prev,
      basemapMode: prev.basemapMode === 'ocean' ? 'satellite' : prev.basemapMode === 'satellite' ? 'osm' : 'ocean',
    }));
  };

  const handleToggleLayer = (layerKey: keyof DashboardLayers) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  const activeRouteCoordinates = routeCoordinates;

  // Inicio / reinicio automático de simulación en bucle continuo al existir ruta óptima
  useEffect(() => {
    if (activeRouteCoordinates.length >= 2) {
      setIsSimulating(true);
      setCurrentLegIndex(0);
      setLegProgressFraction(0);
      setVesselPosition(activeRouteCoordinates[0]);
      if (activeRouteCoordinates[1]) {
        const b = calculateBearing(
          activeRouteCoordinates[0][0],
          activeRouteCoordinates[0][1],
          activeRouteCoordinates[1][0],
          activeRouteCoordinates[1][1]
        );
        setVesselBearing(b);
      }
    } else {
      setIsSimulating(false);
      setVesselPosition(null);
    }
  }, [activeRouteCoordinates]);

  // Bucle de animación continuo a 3x (recorrido y retorno en loop infinito)
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isSimulating || activeRouteCoordinates.length < 2) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const animate = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      // Velocidad de navegación 2x (más fluida y natural)
      const speed = 2;
      const baseSecPerLeg = 14 / speed;
      const progressDelta = dt / baseSecPerLeg;

      setLegProgressFraction((prevFrac) => {
        const nextFrac = prevFrac + progressDelta;

        if (nextFrac >= 1) {
          const nextLeg = currentLegIndex + 1;
          // Si llega al final de la ruta, reinicia el ciclo continuo al puerto base
          if (nextLeg >= activeRouteCoordinates.length - 1) {
            setCurrentLegIndex(0);
            const pA = activeRouteCoordinates[0];
            const pB = activeRouteCoordinates[1];
            if (pA && pB) {
              setVesselPosition(pA);
              setVesselBearing(calculateBearing(pA[0], pA[1], pB[0], pB[1]));
            }
            return 0;
          }
          setCurrentLegIndex(nextLeg);
          const pA = activeRouteCoordinates[nextLeg];
          const pB = activeRouteCoordinates[nextLeg + 1];
          if (pA && pB) {
            setVesselBearing(calculateBearing(pA[0], pA[1], pB[0], pB[1]));
          }
          return 0;
        }

        const pA = activeRouteCoordinates[currentLegIndex];
        const pB = activeRouteCoordinates[currentLegIndex + 1];
        if (pA && pB) {
          const interpolated = interpolatePosition(pA[0], pA[1], pB[0], pB[1], nextFrac);
          setVesselPosition(interpolated);
          setVesselBearing(calculateBearing(pA[0], pA[1], pB[0], pB[1]));
        }

        return nextFrac;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      lastTimeRef.current = 0;
    };
  }, [isSimulating, currentLegIndex, activeRouteCoordinates]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#07151D] font-sans text-slate-100">
      <Navbar
        weather={weather}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        backendConnected={backendConnected}
        onRefreshBackend={syncWithBackend}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
      />

      {!backendConnected && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-40 px-4 py-1.5 rounded-full bg-red-950/85 border border-red-400/50 text-red-200 text-xs font-bold font-montserrat">
          Backend sin conexión · sin alertas ni predicciones
        </div>
      )}

      {/* TOAST FLOTANTE DISCRETO DE NUEVAS ALERTAS DE SARGAZO */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            onClick={() => handleNotificationClick(activeToast)}
            className="fixed top-20 right-4 md:right-6 z-50 max-w-sm cursor-pointer rounded-2xl bg-[#06292D]/92 backdrop-blur-md border border-amber-400/40 p-3.5 shadow-[0_12px_35px_rgba(0,0,0,0.65)] text-[#F0FDF4] font-sans flex items-start space-x-3 transition-transform hover:scale-[1.02] select-none"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center flex-shrink-0 text-amber-300">
              <Bell size={18} weight="duotone" className="animate-bounce" />
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <h4 className="text-xs font-montserrat font-bold text-amber-200 truncate">
                  {activeToast.title}
                </h4>
              </div>
              <p className="text-[11px] text-slate-200 mt-1 leading-snug">
                {activeToast.message}
              </p>
              <div className="mt-1.5 flex items-center space-x-2 text-[10px] text-teal-300 font-montserrat font-bold">
                <span>Clic para centrar en el mapa</span>
                <span>·</span>
                <span className="text-slate-400">{activeToast.timestamp}</span>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveToast(null);
              }}
              className="text-slate-400 hover:text-white p-1 rounded-lg text-xs cursor-pointer"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative w-full h-full overflow-hidden">
        <MapBoard
          ports={ports}
          selectedPortId={selectedPortId}
          onSelectPort={setSelectedPortId}
          layers={layers}
          routeCoordinates={routeCoordinates}
          frame={frame}
          manifest={manifest}
          highlightGeometry={selectedAlert && selectedAlert.frame_minutes === minutes ? selectedAlert.mass.geometry : null}
          highlightId={selectedAlertId}
          focusAreaGeometry={selectedAlert ? areas[selectedAlert.area_id] ?? null : null}
          focusBounds={focusBounds}
          isSimulating={isSimulating}
          vesselPosition={vesselPosition}
          vesselBearing={vesselBearing}
          onCycleBasemapMode={handleCycleBasemapMode}
        />

        <LeftSidebar
          ports={ports}
          selectedPortId={selectedPortId}
          onSelectPort={setSelectedPortId}
          alerts={alerts}
          selectedAlertId={selectedAlertId}
          onSelectAlert={handleSelectAlert}
          detail={selectedDetail}
          layers={layers}
          onToggleLayer={handleToggleLayer}
          isOpen={isLeftOpen}
          onToggleOpen={() => setIsLeftOpen(!isLeftOpen)}
          manifest={manifest}
          minutes={minutes}
          onChangeMinutes={setMinutes}
        />

        <BottomTelemetryBar weather={weather} />
        <MapLegend manifest={manifest} alertSelected={!!selectedAlert} />

        {activeTab === 'planificacion' && (
          <PlanningModule
            isOpen={true}
            onClose={() => setActiveTab('operativo')}
            activeTab="planificacion"
            onSelectTab={(tab) => {
              if (tab === 'operativo' || tab === 'planificacion') setActiveTab(tab);
            }}
            ports={ports}
            alerts={alerts}
            details={details}
            onNeedDetail={ensureDetail}
            weather={weather}
            savedPlans={savedPlans}
            onSavePlan={handleSavePlan}
            onDeletePlan={handleDeletePlan}
            onLoadPlanToMap={handleLoadPlanToMap}
          />
        )}

        <InfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
      </main>
    </div>
  );
};

export default App;
