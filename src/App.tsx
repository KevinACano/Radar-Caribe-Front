import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { MapBoard } from './components/MapBoard';
import { LeftSidebar } from './components/LeftSidebar';
import { RightMetricsPanel } from './components/RightMetricsPanel';
import { BottomTelemetryBar } from './components/BottomTelemetryBar';
import { SimulationHUD } from './components/SimulationHUD';
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
  SargassumDetection 
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

  // Ports and Detections Selection
  const [selectedPortId, setSelectedPortId] = useState<string>(DEFAULT_PORT_ID);
  const [selectedDetectionIds, setSelectedDetectionIds] = useState<string[]>(DEFAULT_SELECTED_DETECTIONS);

  // Custom Waypoints (Dropped on map click)
  const [customWaypoints, setCustomWaypoints] = useState<CustomWaypoint[]>([]);

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
    basemapMode: 'ocean',
    coordinates: false,
  });

  // Time window: Ahora, +6 h, +12 h
  const [timeWindow, setTimeWindow] = useState<'Ahora' | '+6 h' | '+12 h'>('Ahora');

  // UI Panels state
  const [isLeftOpen, setIsLeftOpen] = useState<boolean>(true);
  const [isRightOpen, setIsRightOpen] = useState<boolean>(true);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'operativo' | 'planificacion'>('operativo');

  // Planning & Saved Mission Plans
  const [savedPlans, setSavedPlans] = useState<MissionPlan[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PLANS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Simulation State
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(2);
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
      setSelectedDetectionIds(plan.assignedPointIds.filter((id) => !id.startsWith('custom-')));
    }
    setBackendRoute(null);
    handleStopSimulation();
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

  // Combined targets (Detections + Custom Waypoints mapped to detection shape)
  const allSelectedTargets = useMemo(() => {
    const targets: SargassumDetection[] = [...selectedDetections];
    customWaypoints.forEach((wp) => {
      targets.push({
        id: wp.id,
        codeName: wp.name,
        zoneName: 'Coordenada Marítima Manual',
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
    return targets;
  }, [selectedDetections, customWaypoints]);

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

  // Tramos discretos para el HUD de simulación y progreso
  const simulationStops: RouteStop[] = useMemo(() => {
    if (metrics?.optimizedSequence && metrics.optimizedSequence.length > 0) {
      const stops = [...metrics.optimizedSequence];
      if (returnToBase && stops.length > 1) {
        const lastStop = stops[stops.length - 1];
        const retDist = computeDistanceKm(lastStop.lat, lastStop.lng, selectedPort.lat, selectedPort.lng);
        const cumDist = lastStop.cumulativeDistKm + retDist;
        stops.push({
          id: `${selectedPort.id}-ret`,
          name: selectedPort.name,
          codeName: selectedPort.shortName || selectedPort.name,
          lat: selectedPort.lat,
          lng: selectedPort.lng,
          isPort: true,
          massTons: 0,
          legDistKm: Number(retDist.toFixed(2)),
          legDistNm: Number((retDist / 1.852).toFixed(2)),
          cumulativeDistKm: Number(cumDist.toFixed(2)),
          cumulativeDistNm: Number((cumDist / 1.852).toFixed(2)),
          legEtaMinutes: Math.round((retDist / 14.816) * 60),
        });
      }
      return stops;
    }
    return [];
  }, [metrics, returnToBase, selectedPort]);

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

  // Add Custom Waypoint on Map Click
  const handleAddCustomWaypoint = (lat: number, lng: number) => {
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
  };

  // Remove Custom Waypoint (Immediate update of state, map and route)
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

  // Selection handlers
  const handleToggleDetection = (id: string) => {
    setSelectedDetectionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    setBackendRoute(null);
  };

  const handleSelectAll = () => {
    setSelectedDetectionIds(detections.map((d) => d.id));
    setBackendRoute(null);
  };

  const handleClearAll = () => {
    setSelectedDetectionIds([]);
    setCustomWaypoints([]);
    setBackendRoute(null);
    handleStopSimulation();
  };

  const handleResetDefaults = () => {
    setSelectedPortId(DEFAULT_PORT_ID);
    setSelectedDetectionIds(DEFAULT_SELECTED_DETECTIONS);
    setCustomWaypoints([]);
    setBackendRoute(null);
    handleStopSimulation();
  };

  const handleToggleLayer = (layerKey: keyof DashboardLayers) => {
    setLayers((prev) => ({
      ...prev,
      [layerKey]: !prev[layerKey],
    }));
  };

  const handleCycleBasemapMode = () => {
    setLayers((prev) => {
      const nextMode =
        prev.basemapMode === 'satellite'
          ? 'ocean'
          : prev.basemapMode === 'ocean'
          ? 'osm'
          : 'satellite';
      return { ...prev, basemapMode: nextMode };
    });
  };

  // ==========================================
  // SIMULACIÓN REACTIVA SEGMENTO POR SEGMENTO
  // ==========================================
  const handleStartSimulation = () => {
    if (activeRouteCoordinates.length < 2) return;
    setCurrentLegIndex(0);
    setLegProgressFraction(0);
    setVesselPosition(activeRouteCoordinates[0]);
    setVesselBearing(
      calculateBearing(
        activeRouteCoordinates[0][0],
        activeRouteCoordinates[0][1],
        activeRouteCoordinates[1][0],
        activeRouteCoordinates[1][1]
      )
    );
    setIsSimulating(true);
    setIsPlaying(true);
  };

  const handleStopSimulation = () => {
    setIsSimulating(false);
    setIsPlaying(false);
    setCurrentLegIndex(0);
    setLegProgressFraction(0);
    setVesselPosition(null);
  };

  const handleResetSimulation = () => {
    if (activeRouteCoordinates.length < 2) return;
    setCurrentLegIndex(0);
    setLegProgressFraction(0);
    setVesselPosition(activeRouteCoordinates[0]);
    setVesselBearing(
      calculateBearing(
        activeRouteCoordinates[0][0],
        activeRouteCoordinates[0][1],
        activeRouteCoordinates[1][0],
        activeRouteCoordinates[1][1]
      )
    );
    setIsPlaying(true);
  };

  // Re-ajustar posición si la ruta cambia durante la simulación
  useEffect(() => {
    if (isSimulating && activeRouteCoordinates.length >= 2) {
      if (currentLegIndex >= activeRouteCoordinates.length - 1) {
        setCurrentLegIndex(0);
        setLegProgressFraction(0);
        setVesselPosition(activeRouteCoordinates[0]);
      }
    }
  }, [activeRouteCoordinates, isSimulating]);

  // 60fps Animation Loop siguiendo EXACTAMENTE activeRouteCoordinates
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isSimulating || !isPlaying || activeRouteCoordinates.length < 2) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastTimeRef.current = null;
      return;
    }

    const coords = activeRouteCoordinates;
    const totalSegments = coords.length - 1;

    const animate = (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }
      const deltaSec = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      // Velocidad en km/s (aprox 15 km/h * speed factor)
      const kmPerSecond = 1.2 * simulationSpeed;

      setCurrentLegIndex((segIdx) => {
        if (segIdx >= totalSegments) {
          setIsPlaying(false);
          return totalSegments - 1;
        }

        const p1 = coords[segIdx];
        const p2 = coords[segIdx + 1];
        const segDistKm = Math.max(0.05, computeDistanceKm(p1[0], p1[1], p2[0], p2[1]));

        setLegProgressFraction((prevFraction) => {
          const stepFraction = (kmPerSecond * deltaSec) / segDistKm;
          const nextFraction = prevFraction + stepFraction;

          if (nextFraction >= 1.0) {
            if (segIdx + 1 < totalSegments) {
              const nextP = coords[segIdx + 2];
              setVesselPosition(p2);
              setVesselBearing(calculateBearing(p2[0], p2[1], nextP[0], nextP[1]));
              setCurrentLegIndex(segIdx + 1);
              return 0;
            } else {
              setVesselPosition(p2);
              setIsPlaying(false);
              return 1.0;
            }
          }

          const pos = interpolatePosition(p1[0], p1[1], p2[0], p2[1], nextFraction);
          setVesselPosition(pos);
          setVesselBearing(calculateBearing(p1[0], p1[1], p2[0], p2[1]));

          return nextFraction;
        });

        return segIdx;
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isSimulating, isPlaying, simulationSpeed, activeRouteCoordinates]);

  // Overall Simulation Progress
  const { progressPercent, currentTraversedKm } = useMemo(() => {
    if (!isSimulating || activeRouteCoordinates.length < 2) {
      return { progressPercent: 0, currentTraversedKm: 0 };
    }
    const totalDist = suggestedDistanceKm;
    const progressFrac = (currentLegIndex + legProgressFraction) / Math.max(1, activeRouteCoordinates.length - 1);
    const progressPercent = Math.min(100, Math.max(0, progressFrac * 100));
    const currentTraversedKm = Number((totalDist * (progressPercent / 100)).toFixed(1));

    return { progressPercent, currentTraversedKm };
  }, [isSimulating, activeRouteCoordinates, currentLegIndex, legProgressFraction, suggestedDistanceKm]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#07151D] font-sans text-slate-100">
      {/* 1. HEADER FLOTANTE ESTILO VERDE ABISAL TRANSLÚCIDO */}
      <Navbar
        weather={weather}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        backendConnected={backendConnected}
        isBackendCalculating={isCalculatingBackend}
        onRefreshBackend={syncWithBackend}
      />

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
          isSimulating={isSimulating}
          vesselPosition={vesselPosition}
          vesselBearing={vesselBearing}
          currentLegIndex={currentLegIndex}
          onCycleBasemapMode={handleCycleBasemapMode}
        />

        {/* 3. SIMULATION HUD - COMPACTO EN LA PARTE INFERIOR CENTRAL */}
        {isSimulating && (
          <SimulationHUD
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onReset={handleResetSimulation}
            onClose={handleStopSimulation}
            speed={simulationSpeed}
            onChangeSpeed={setSimulationSpeed}
            progressPercent={progressPercent}
            currentLegIndex={currentLegIndex}
            stops={simulationStops}
            totalDistanceKm={suggestedDistanceKm}
            currentDistanceKm={currentTraversedKm}
          />
        )}

        {/* 4. LEFT CONTROL PANEL (Separación vertical 24px+ y 100% Ruta Sugerida) */}
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
        />

        {/* 5. RIGHT METRICS & SARGAZO FORECAST PANEL (Separación vertical 24px+ y Cero Diésel) */}
        <RightMetricsPanel
          metrics={metrics}
          detections={detections}
          selectedDetectionIds={selectedDetectionIds}
          onToggleDetection={handleToggleDetection}
          isSimulating={isSimulating}
          onStartSimulation={handleStartSimulation}
          onStopSimulation={handleStopSimulation}
          isOpen={isRightOpen}
          onToggleOpen={() => setIsRightOpen(!isRightOpen)}
          activeStopIndex={currentLegIndex}
        />

        {/* 6. BOTTOM TELEMETRY DOCK (Corrientes, Oleaje, Viento en Verde Abisal) */}
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
