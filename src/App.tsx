import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell } from '@phosphor-icons/react';
import { Navbar } from './components/Navbar';
import { MapBoard } from './components/MapBoard';
import { LeftSidebar } from './components/LeftSidebar';
import { BottomTelemetryBar } from './components/BottomTelemetryBar';
import { InfoModal } from './components/InfoModal';
import { MapLegend } from './components/MapLegend';
import { PlanningModule } from './components/PlanningModule';
import { 
  BASE_PORTS as LOCAL_BASE_PORTS, 
  CURRENT_MARITIME_WEATHER as LOCAL_WEATHER, 
  DEFAULT_PORT_ID, 
  DEFAULT_SELECTED_DETECTIONS, 
  SARGASSUM_DETECTIONS as LOCAL_DETECTIONS 
} from './data/sargassumData';
import { SAMPLE_GEOJSON } from './data/sampleGeoJson';
import { clusterSargassumFeatures } from './utils/sargassumClustering';
import { 
  calculateBearing, 
  computeRouteOptimization, 
  buildMetricsFromBackendResponse,
  interpolatePosition 
} from './utils/routeOptimizer';
import { 
  BasePort, 
  BackendRouteResponse, 
  CustomWaypoint, 
  DashboardLayers, 
  MaritimeWeather, 
  MissionPlan, 
  OptimizationMetrics, 
  RouteStop, 
  SargassumDetection,
  SargassumGeoJsonCollection,
  SargassumCluster,
  AppNotification
} from './types';
import { 
  checkBackendHealth, 
  fetchBackendDetections, 
  fetchBackendPorts, 
  fetchBackendWeather, 
  requestBackendMultiRoute, 
  requestBackendRoute,
  RoutePointPayload
} from './services/api';

const STORAGE_KEY_PLANS = 'radar_caribe_saved_mission_plans';

// Haversine formula helper
const computeDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const toRad = (a: number) => (a * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const App: React.FC = () => {
  // Real Data states
  const [ports, setPorts] = useState<BasePort[]>(LOCAL_BASE_PORTS);
  const [detections, setDetections] = useState<SargassumDetection[]>(LOCAL_DETECTIONS);
  const [weather, setWeather] = useState<MaritimeWeather>(LOCAL_WEATHER);

  // GeoJSON Sargassum Probability Dataset
  const [geoJsonData] = useState<SargassumGeoJsonCollection | null>(
    SAMPLE_GEOJSON as unknown as SargassumGeoJsonCollection
  );

  // Clusters espaciales consolidados (1 SOLO PUNTO POR MANCHA CONTIGUA)
  const sargassumClusters: SargassumCluster[] = useMemo(() => {
    if (!geoJsonData?.features) return [];
    return clusterSargassumFeatures(geoJsonData.features);
  }, [geoJsonData]);

  // Inicio limpio: 0 puntos ni manchas seleccionadas al cargar
  const [selectedClusterIds, setSelectedClusterIds] = useState<string[]>([]);

  // Ports and Detections Selection (0 puntos precargados)
  const [selectedPortId, setSelectedPortId] = useState<string>(DEFAULT_PORT_ID);
  const [selectedDetectionIds, setSelectedDetectionIds] = useState<string[]>([]);

  // Custom Waypoints & Point Dropping Mode
  const [customWaypoints, setCustomWaypoints] = useState<CustomWaypoint[]>([]);
  const [isAddPointActive, setIsAddPointActive] = useState<boolean>(false);

  // 100% Ruta Sugerida Optimizada
  const [returnToBase, setReturnToBase] = useState<boolean>(true);
  const [backendRoute, setBackendRoute] = useState<BackendRouteResponse | null>(null);
  const [backendConnected, setBackendConnected] = useState<boolean>(true);
  const [isCalculatingBackend, setIsCalculatingBackend] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);

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

  // Time window: Ahora, +6 h, +12 h
  const [timeWindow, setTimeWindow] = useState<'Ahora' | '+6 h' | '+12 h'>('Ahora');

  // UI Panels state (Panel derecho eliminado para total protagonismo del mapa)
  const [isLeftOpen, setIsLeftOpen] = useState<boolean>(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'operativo' | 'planificacion'>('operativo');

  // Sistema de Alertas y Notificaciones (Campana Bell en Header)
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: 'notif-base-1',
      title: 'Vigilancia Satelital Activa',
      message: 'Red de sensores satelitales Copernicus y SIMAR-CONABIO sincronizada.',
      timestamp: 'Hace 3 min',
      read: true,
      type: 'sargassum_alert',
    },
  ]);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const [focusLocation, setFocusLocation] = useState<[number, number] | null>(null);

  // Planning & Saved Mission Plans
  const [savedPlans, setSavedPlans] = useState<MissionPlan[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PLANS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Simulation State (Bucle automático continuo a 2x)
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [currentLegIndex, setCurrentLegIndex] = useState<number>(0);
  const [legProgressFraction, setLegProgressFraction] = useState<number>(0);
  const [vesselPosition, setVesselPosition] = useState<[number, number] | null>(null);
  const [vesselBearing, setVesselBearing] = useState<number>(0);

  // Sync data with backend on load
  const syncWithBackend = async () => {
    try {
      const health = await checkBackendHealth();
      if (health.status === 'ok') {
        setBackendConnected(true);
        const [fetchedPorts, fetchedDetections, fetchedWeather] = await Promise.all([
          fetchBackendPorts().catch(() => LOCAL_BASE_PORTS),
          fetchBackendDetections().catch(() => LOCAL_DETECTIONS),
          fetchBackendWeather().catch(() => LOCAL_WEATHER),
        ]);
        if (fetchedPorts.length > 0) setPorts(fetchedPorts);
        if (fetchedDetections.length > 0) setDetections(fetchedDetections);
        setWeather(fetchedWeather);
      } else {
        setBackendConnected(false);
      }
    } catch {
      setBackendConnected(false);
    }
  };

  useEffect(() => {
    syncWithBackend();
  }, []);

  // Simulación automática de nuevo avistamiento detectado unos segundos después de abrir la app
  useEffect(() => {
    const timer = setTimeout(() => {
      const newAlert: AppNotification = {
        id: `notif-live-${Date.now()}`,
        title: 'Nueva Detección de Sargazo',
        message: 'Nueva detección de sargazo registrada frente a Puerto Morelos (~48 t, prob. 94%).',
        timestamp: 'Ahora mismo',
        read: false,
        type: 'sargassum_alert',
        locationName: 'Frente a Puerto Morelos',
        lat: 20.854,
        lng: -86.821,
        massTons: 48,
        probPercent: 94,
      };
      setNotifications((prev) => [newAlert, ...prev]);
      setActiveToast(newAlert);
    }, 4500);

    return () => clearTimeout(timer);
  }, []);

  // Cierre automático del toast tras 8 segundos
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [activeToast]);

  const handleNotificationClick = (notif: AppNotification) => {
    if (notif.lat && notif.lng) {
      setFocusLocation([notif.lat, notif.lng]);
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    setActiveToast(null);
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Save plans to localStorage
  const handleSavePlan = (newPlan: MissionPlan) => {
    setSavedPlans((prev) => {
      const updated = [newPlan, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY_PLANS, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const handleDeletePlan = (planId: string) => {
    setSavedPlans((prev) => {
      const updated = prev.filter((p) => p.id !== planId);
      try {
        localStorage.setItem(STORAGE_KEY_PLANS, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const handleLoadPlanToMap = (plan: MissionPlan) => {
    if (plan.portId) setSelectedPortId(plan.portId);
    if (plan.assignedPointIds && plan.assignedPointIds.length > 0) {
      setSelectedDetectionIds(
        plan.assignedPointIds.filter((id) => !id.startsWith('custom-') && !id.startsWith('cluster-'))
      );
    }
    setBackendRoute(null);
    setActiveTab('operativo');
  };

  // Selected entities
  const selectedPort = useMemo(() => {
    return ports.find((p) => p.id === selectedPortId) || ports[0];
  }, [ports, selectedPortId]);

  const selectedDetections = useMemo(() => {
    const map = new Map(detections.map((d) => [d.id, d]));
    return selectedDetectionIds
      .map((id) => map.get(id))
      .filter((d): d is SargassumDetection => Boolean(d));
  }, [detections, selectedDetectionIds]);

  // Combined targets (Detections + Custom Waypoints + 1 Consolidated Point per Sargassum Cluster)
  const allSelectedTargets = useMemo(() => {
    const targets: SargassumDetection[] = [...selectedDetections];

    // Custom waypoints (only those explicitly placed by user)
    customWaypoints.forEach((wp) => {
      targets.push({
        id: wp.id,
        codeName: wp.name,
        zoneName: 'Punto Manual en Mar',
        lat: wp.lat,
        lng: wp.lng,
        detectionDate: 'Punto de Paso',
        source: 'Avistamiento Costero',
        massTons: wp.massTons || 0,
        priority: 'Media',
        confidencePercent: 95,
        areaKm2: 1.0,
        estimatedDepthM: 1.0,
        distanceToCoastKm: 5.0,
      });
    });

    // 1 SOLO PUNTO CONSOLIDADO POR MANCHA CONTIGUA DE SARGAZO
    sargassumClusters.forEach((cluster) => {
      if (selectedClusterIds.includes(cluster.id)) {
        targets.push({
          id: cluster.id,
          codeName: cluster.name,
          zoneName: `Filamento Predictivo (P. máx: ${(cluster.maxProb * 100).toFixed(0)}%)`,
          lat: cluster.centroidLat,
          lng: cluster.centroidLng,
          detectionDate: cluster.datetime,
          source: 'SIMAR-CONABIO',
          massTons: cluster.estimatedMassTons,
          priority: 'Alta',
          confidencePercent: Math.round(cluster.maxProb * 100),
          areaKm2: cluster.cellCount * 25.0,
          estimatedDepthM: 1.5,
          distanceToCoastKm: Number(
            computeDistanceKm(cluster.centroidLat, cluster.centroidLng, selectedPort.lat, selectedPort.lng).toFixed(1)
          ),
        });
      }
    });

    return targets;
  }, [selectedDetections, customWaypoints, sargassumClusters, selectedClusterIds, selectedPort]);

  // Base TSP Metrics (Instant fallback / baseline)
  const baseLocalMetrics = useMemo(() => {
    if (allSelectedTargets.length === 0) return null;
    return computeRouteOptimization(selectedPort, allSelectedTargets);
  }, [selectedPort, allSelectedTargets]);

  // Combined Suggested Route Metrics
  const metrics: OptimizationMetrics | null = useMemo(() => {
    if (!baseLocalMetrics) return null;

    if (backendRoute) {
      return buildMetricsFromBackendResponse(
        backendRoute,
        baseLocalMetrics.optimizedSequence,
        baseLocalMetrics.totalMassTons
      );
    }

    return baseLocalMetrics;
  }, [baseLocalMetrics, backendRoute]);

  // 100% RUTA SUGERIDA COORDENADAS
  const suggestedRouteCoordinates: [number, number][] = useMemo(() => {
    if (backendRoute?.route?.coordinates && backendRoute.route.coordinates.length > 0) {
      return backendRoute.route.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]);
    }
    if (metrics?.optimizedSequence && metrics.optimizedSequence.length > 0) {
      const coords: [number, number][] = metrics.optimizedSequence.map((s) => [s.lat, s.lng]);
      if (returnToBase && coords.length > 1) {
        coords.push([selectedPort.lat, selectedPort.lng]);
      }
      return coords;
    }
    return [];
  }, [backendRoute, metrics, returnToBase, selectedPort]);

  const suggestedDistanceKm = useMemo(() => {
    return metrics?.optimizedDistanceKm || 0;
  }, [metrics]);

  const suggestedEtaFormatted = useMemo(() => {
    return metrics?.etaTotalFormatted || '0 h 0 m';
  }, [metrics]);

  const savingsPercent = useMemo(() => {
    return metrics?.percentageReduction || 0;
  }, [metrics]);

  // Coordenadas activas para simulación y mapa (100% Sugerida)
  const activeRouteCoordinates: [number, number][] = suggestedRouteCoordinates;

  // Request backend route calculation
  const handleCalculateBackendRoute = async () => {
    if (allSelectedTargets.length === 0) return;
    setIsCalculatingBackend(true);
    setBackendError(null);

    try {
      const portPayload: RoutePointPayload = {
        lat: selectedPort.lat,
        lon: selectedPort.lng,
        name: selectedPort.name,
        id: selectedPort.id,
      };
      const targetPayloads: RoutePointPayload[] = allSelectedTargets.map((d) => ({
        lat: d.lat,
        lon: d.lng,
        name: d.codeName || d.zoneName,
        id: d.id,
      }));

      if (targetPayloads.length === 1 && !returnToBase) {
        const response = await requestBackendRoute(portPayload, targetPayloads[0]);
        setBackendRoute(response);
      } else {
        const pointsPayload: RoutePointPayload[] = [portPayload, ...targetPayloads];
        const response = await requestBackendMultiRoute(pointsPayload, returnToBase);
        setBackendRoute(response);
      }
    } catch (err: any) {
      console.warn('Backend calculation fallback:', err.message);
      setBackendError('Calculando sobre cartas de navegación satelital.');
    } finally {
      setIsCalculatingBackend(false);
    }
  };

  // Add Custom Waypoint on Map Click ONLY if isAddPointActive is true
  const handleAddCustomWaypoint = (lat: number, lng: number) => {
    if (!isAddPointActive) return;
    const nextIndex = customWaypoints.length + 1;
    const newWp: CustomWaypoint = {
      id: `custom-${Date.now()}`,
      name: `Punto Manual #${nextIndex}`,
      lat,
      lng,
      massTons: 15,
      createdAt: new Date().toISOString(),
    };
    setCustomWaypoints((prev) => [...prev, newWp]);
    setBackendRoute(null);
    setIsAddPointActive(false); // Automatically deactivate after placing the point
  };

  // Remove Custom Waypoint
  const handleRemoveCustomWaypoint = (id: string) => {
    setCustomWaypoints((prev) => prev.filter((w) => w.id !== id));
    setBackendRoute(null);
  };

  const handleMoveWaypointUp = (index: number) => {
    if (index === 0) return;
    setCustomWaypoints((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      return next;
    });
    setBackendRoute(null);
  };

  const handleMoveWaypointDown = (index: number) => {
    if (index >= customWaypoints.length - 1) return;
    setCustomWaypoints((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      return next;
    });
    setBackendRoute(null);
  };

  // Selection handlers for coastal detections
  const handleToggleDetection = (id: string) => {
    setSelectedDetectionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    setBackendRoute(null);
  };

  // Cluster Selection Handler (Toggle the consolidated cluster point)
  const handleToggleCluster = (clusterId: string) => {
    setSelectedClusterIds((prev) =>
      prev.includes(clusterId) ? prev.filter((id) => id !== clusterId) : [...prev, clusterId]
    );
    setBackendRoute(null);
  };

  const handleSelectAll = () => {
    setSelectedDetectionIds(detections.map((d) => d.id));
    setSelectedClusterIds(sargassumClusters.map((c) => c.id));
    setBackendRoute(null);
  };

  const handleClearAll = () => {
    setSelectedDetectionIds([]);
    setCustomWaypoints([]);
    setSelectedClusterIds([]);
    setBackendRoute(null);
  };

  const handleResetDefaults = () => {
    setSelectedPortId(DEFAULT_PORT_ID);
    setSelectedDetectionIds([]);
    setCustomWaypoints([]);
    setSelectedClusterIds([]);
    setBackendRoute(null);
  };

  const handleCycleBasemapMode = () => {
    setLayers((prev) => {
      const nextMode: 'ocean' | 'satellite' | 'osm' =
        prev.basemapMode === 'ocean'
          ? 'satellite'
          : prev.basemapMode === 'satellite'
          ? 'osm'
          : 'ocean';
      return { ...prev, basemapMode: nextMode };
    });
  };

  const handleToggleLayer = (layerKey: keyof DashboardLayers) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

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
      {/* 1. HEADER FLOTANTE ESTILO VERDE ABISAL TRANSLÚCIDO CON CENTRO DE NOTIFICACIONES */}
      <Navbar
        weather={weather}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        backendConnected={backendConnected}
        isBackendCalculating={isCalculatingBackend}
        onRefreshBackend={syncWithBackend}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
      />

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

      {/* 2. FULLSCREEN SATELLITE MAP & FLOATING MODULES */}
      <main className="relative w-full h-full overflow-hidden">
        <MapBoard
          ports={ports}
          selectedPortId={selectedPortId}
          onSelectPort={setSelectedPortId}
          detections={detections}
          selectedDetectionIds={selectedDetectionIds}
          onToggleDetection={handleToggleDetection}
          customWaypoints={customWaypoints}
          onAddCustomWaypoint={handleAddCustomWaypoint}
          onRemoveCustomWaypoint={handleRemoveCustomWaypoint}
          layers={layers}
          metrics={metrics}
          suggestedRouteCoordinates={suggestedRouteCoordinates}
          geoJsonData={geoJsonData}
          sargassumClusters={sargassumClusters}
          selectedClusterIds={selectedClusterIds}
          onToggleCluster={handleToggleCluster}
          isAddPointActive={isAddPointActive}
          onCancelAddPointActive={() => setIsAddPointActive(false)}
          isSimulating={isSimulating}
          vesselPosition={vesselPosition}
          vesselBearing={vesselBearing}
          currentLegIndex={currentLegIndex}
          onCycleBasemapMode={handleCycleBasemapMode}
          focusLocation={focusLocation}
        />

        {/* 3. LEFT CONTROL PANEL (Separación vertical 28px–32px y 100% Ruta Sugerida) */}
        <LeftSidebar
          ports={ports}
          selectedPortId={selectedPortId}
          onSelectPort={setSelectedPortId}
          detections={detections}
          selectedDetectionIds={selectedDetectionIds}
          onToggleDetection={handleToggleDetection}
          customWaypoints={customWaypoints}
          onRemoveCustomWaypoint={handleRemoveCustomWaypoint}
          onSelectAll={handleSelectAll}
          onClearAll={handleClearAll}
          onResetDefaults={handleResetDefaults}
          layers={layers}
          onToggleLayer={handleToggleLayer}
          isOpen={isLeftOpen}
          onToggleOpen={() => setIsLeftOpen(!isLeftOpen)}
          timeWindow={timeWindow}
          onChangeTimeWindow={setTimeWindow}
          suggestedDistanceKm={suggestedDistanceKm}
          suggestedEtaFormatted={suggestedEtaFormatted}
          savingsPercent={savingsPercent}
          returnToBase={returnToBase}
          onToggleReturnToBase={() => setReturnToBase(!returnToBase)}
          isCalculatingBackend={isCalculatingBackend}
          onCalculateBackendRoute={handleCalculateBackendRoute}
          backendError={backendError}
          onMoveWaypointUp={handleMoveWaypointUp}
          onMoveWaypointDown={handleMoveWaypointDown}
          isAddPointActive={isAddPointActive}
          onToggleAddPointActive={() => setIsAddPointActive(!isAddPointActive)}
          sargassumClusters={sargassumClusters}
          selectedClusterIds={selectedClusterIds}
          onToggleCluster={handleToggleCluster}
        />

        {/* 4. BOTTOM TELEMETRY DOCK (Corrientes, Oleaje, Viento en Verde Abisal) */}
        <BottomTelemetryBar weather={weather} />

        {/* 7. FLOATING MAP LEGEND (Esquina inferior izquierda en Verde Abisal) */}
        <MapLegend />

        {/* 8. MODAL DE PLANIFICACIÓN TOTALMENTE FUNCIONAL */}
        {activeTab === 'planificacion' && (
          <PlanningModule
            isOpen={true}
            onClose={() => setActiveTab('operativo')}
            activeTab="planificacion"
            onSelectTab={(tab) => {
              if (tab === 'operativo' || tab === 'planificacion') {
                setActiveTab(tab);
              }
            }}
            ports={ports}
            detections={detections}
            customWaypoints={customWaypoints}
            weather={weather}
            savedPlans={savedPlans}
            onSavePlan={handleSavePlan}
            onDeletePlan={handleDeletePlan}
            onLoadPlanToMap={handleLoadPlanToMap}
          />
        )}

        {/* 9. MODAL INFORMATIVO */}
        <InfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
      </main>
    </div>
  );
};

export default App;
