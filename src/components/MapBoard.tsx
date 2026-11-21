import React, { useEffect, useMemo, useRef } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Polyline, 
  Circle, 
  Marker, 
  Popup, 
  useMap,
  useMapEvents 
} from 'react-leaflet';
import L from 'leaflet';
import { motion } from 'motion/react';
import { 
  BasePort, 
  CustomWaypoint, 
  DashboardLayers, 
  OptimizationMetrics, 
  SargassumDetection 
} from '../types';
import { VesselMarker } from './VesselMarker';
import { Plus, Minus, NavigationArrow, MapTrifold, MapPin, Trash } from '@phosphor-icons/react';

interface MapBoardProps {
  ports: BasePort[];
  selectedPortId: string;
  onSelectPort: (portId: string) => void;
  detections: SargassumDetection[];
  selectedDetectionIds: string[];
  onToggleDetection: (detectionId: string) => void;
  customWaypoints: CustomWaypoint[];
  onAddCustomWaypoint: (lat: number, lng: number) => void;
  onRemoveCustomWaypoint: (id: string) => void;
  layers: DashboardLayers;
  metrics: OptimizationMetrics | null;
  suggestedRouteCoordinates?: [number, number][];
  // Simulation Props
  isSimulating: boolean;
  vesselPosition: [number, number] | null;
  vesselBearing: number;
  currentLegIndex: number;
  onCycleBasemapMode: () => void;
}

const MapController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [map]);
  return null;
};

// Map click handler to drop custom points
const MapClickHandler: React.FC<{ onMapClick?: (lat: number, lng: number) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

// Map Controls Dock (Zoom, Rosa de los Vientos, Switcher) ubicado DENTRO de MapContainer
const MapControlsDock: React.FC<{
  basemapMode: string;
  onCycleBasemapMode: () => void;
}> = ({ basemapMode, onCycleBasemapMode }) => {
  const map = useMap();
  const dockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dockRef.current) {
      L.DomEvent.disableClickPropagation(dockRef.current);
      L.DomEvent.disableScrollPropagation(dockRef.current);
    }
  }, []);

  return (
    <div
      ref={dockRef}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className="absolute bottom-6 right-4 z-[1000] flex flex-col items-center space-y-2 select-none pointer-events-auto"
    >
      {/* Rosa de los Vientos */}
      <div 
        className="w-9 h-9 rounded-xl bg-[#06292D]/85 backdrop-blur-md border border-teal-400/20 shadow-floating flex flex-col items-center justify-center text-teal-300 cursor-default"
        title="Norte Geográfico"
      >
        <NavigationArrow size={15} weight="bold" className="text-[#2DD4BF] -rotate-45 filter drop-shadow-[0_0_6px_rgba(45,212,191,0.6)]" />
        <span className="text-[8.5px] font-black text-slate-200 font-mono leading-none mt-0.5">N</span>
      </div>

      {/* Botón Cuadrado Compacto de Capa Base (MapTrifold) con Tooltip a la Izquierda */}
      <div className="relative group">
        <motion.button
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={(e) => {
            e.stopPropagation();
            onCycleBasemapMode();
          }}
          className="w-9 h-9 rounded-xl bg-[#06292D]/85 backdrop-blur-md border border-teal-400/20 shadow-floating text-teal-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          title="Cambiar capa base del mapa"
        >
          <MapTrifold size={18} weight="duotone" className="text-[#2DD4BF]" />
        </motion.button>

        {/* Tooltip limpio a la izquierda */}
        <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2.5 px-2.5 py-1 rounded-lg bg-[#06292D]/95 backdrop-blur-md border border-teal-400/30 text-teal-100 text-[10.5px] font-montserrat font-bold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg">
          Capa: {basemapMode === 'satellite' ? 'Satelital' : basemapMode === 'ocean' ? 'Oceánico' : 'Costero'}
        </div>
      </div>

      {/* Botones de Zoom (+ / -) con detención estricta de propagación */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col space-y-1 bg-[#06292D]/85 backdrop-blur-md border border-teal-400/20 shadow-floating rounded-xl p-1 select-none font-sans"
      >
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            map.zoomIn();
          }}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-teal-300 hover:text-white hover:bg-white/10 font-bold transition-colors cursor-pointer"
          title="Acercar mapa"
        >
          <Plus size={15} weight="bold" />
        </motion.button>
        <div className="h-px bg-teal-400/20" />
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            map.zoomOut();
          }}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-teal-300 hover:text-white hover:bg-white/10 font-bold transition-colors cursor-pointer"
          title="Alejar mapa"
        >
          <Minus size={15} weight="bold" />
        </motion.button>
      </div>
    </div>
  );
};

export const MapBoard: React.FC<MapBoardProps> = ({
  ports,
  selectedPortId,
  onSelectPort,
  detections,
  selectedDetectionIds,
  onToggleDetection,
  customWaypoints,
  onAddCustomWaypoint,
  onRemoveCustomWaypoint,
  layers,
  metrics,
  suggestedRouteCoordinates = [],
  isSimulating,
  vesselPosition,
  vesselBearing,
  currentLegIndex,
  onCycleBasemapMode,
}) => {
  const mapCenter: [number, number] = [20.88, -86.76];

  // Helper: Selected Base Port Callout Icon
  const createPortCalloutIcon = (port: BasePort) => {
    return L.divIcon({
      className: 'custom-port-callout',
      html: `
        <div style="display: flex; align-items: center; cursor: pointer; transform: translate(-16px, -16px);" onclick="event.stopPropagation()">
          <div style="
            width: 34px;
            height: 34px;
            background: #06292D;
            border: 2px solid #2DD4BF;
            border-radius: 9999px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 16px rgba(45, 212, 191, 0.65);
            z-index: 10;
          ">
            <svg width="18" height="18" viewBox="0 0 256 256" fill="#2DD4BF">
              <path d="M224,128a96.11,96.11,0,0,1-88,95.66V152h24a8,8,0,0,0,0-16H136V95.6A40,40,0,1,0,120,95.6V136H96a8,8,0,0,0,0,16h24v71.66A96.11,96.11,0,0,1,32,128a8,8,0,0,0-16,0,112.14,112.14,0,0,0,104,111.71V240a8,8,0,0,0,16,0v-.29A112.14,112.14,0,0,0,240,128a8,8,0,0,0-16,0ZM128,40a24,24,0,1,1-24,24A24,24,0,0,1,128,40Z"/>
            </svg>
          </div>

          <div style="
            background: rgba(6, 41, 45, 0.92);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(45, 212, 191, 0.45);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
            padding: 5px 12px;
            border-radius: 12px;
            margin-left: 8px;
            white-space: nowrap;
          ">
            <span style="font-size: 11.5px; font-weight: 800; color: #FFFFFF; font-family: Montserrat, sans-serif; letter-spacing: -0.01em;">
              ⚓ ${port.name}
            </span>
          </div>
        </div>
      `,
      iconSize: [180, 36],
      iconAnchor: [16, 16],
    });
  };

  // Helper: Unselected Minor Port Icon
  const createMinorPortIcon = (port: BasePort) => {
    return L.divIcon({
      className: 'custom-minor-port',
      html: `
        <div style="
          width: 24px;
          height: 24px;
          background: rgba(6, 41, 45, 0.9);
          backdrop-filter: blur(8px);
          border: 1.5px solid #2DD4BF;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          cursor: pointer;
        " title="${port.name}" onclick="event.stopPropagation()">
          <svg width="13" height="13" viewBox="0 0 256 256" fill="#2DD4BF">
            <path d="M224,128a96.11,96.11,0,0,1-88,95.66V152h24a8,8,0,0,0,0-16H136V95.6A40,40,0,1,0,120,95.6V136H96a8,8,0,0,0,0,16h24v71.66A96.11,96.11,0,0,1,32,128a8,8,0,0,0-16,0,112.14,112.14,0,0,0,104,111.71V240a8,8,0,0,0,16,0v-.29A112.14,112.14,0,0,0,240,128a8,8,0,0,0-16,0ZM128,40a24,24,0,1,1-24,24A24,24,0,0,1,128,40Z"/>
          </svg>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  // Helper: Selected Sargassum Target Badge
  const createSelectedDetectionIcon = (detection: SargassumDetection, seqNumber?: number) => {
    const seqBadge = seqNumber
      ? `<span style="background: #2DD4BF; color: #07151D; font-weight: 900; font-size: 10.5px; width: 19px; height: 19px; border-radius: 9999px; display: inline-flex; align-items: center; justify-content: center; margin-right: 6px; box-shadow: 0 0 8px #2DD4BF;">${seqNumber}</span>`
      : '';

    return L.divIcon({
      className: 'custom-selected-detection',
      html: `
        <div style="
          background: rgba(6, 41, 45, 0.94);
          backdrop-filter: blur(20px);
          border: 1.5px solid #2DD4BF;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.65), 0 0 16px rgba(45, 212, 191, 0.35);
          padding: 7px 14px;
          border-radius: 14px;
          white-space: nowrap;
          cursor: pointer;
          transform: translate(24px, -24px);
        " onclick="event.stopPropagation()">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <div style="display: flex; align-items: center;">
              ${seqBadge}
              <span style="font-size: 12px; font-weight: 800; color: #FFFFFF; font-family: Montserrat, sans-serif;">
                ${detection.codeName} – ${detection.massTons.toLocaleString()} t
              </span>
            </div>
            <span style="font-size: 9px; font-weight: 800; background: #0D9488; color: white; padding: 1px 6px; border-radius: 9999px;">ACTIVO</span>
          </div>
          <div style="font-size: 10px; color: #99F6E4; font-weight: 500; font-family: Inter, sans-serif; margin-top: 1px;">
            Confianza: <strong style="color: #2DD4BF;">${detection.confidencePercent}%</strong>
          </div>
        </div>
      `,
      iconSize: [230, 52],
      iconAnchor: [0, 26],
    });
  };

  // Helper: Unselected Minor Sargassum Target
  const createMinorDetectionIcon = (detection: SargassumDetection) => {
    return L.divIcon({
      className: 'custom-minor-detection',
      html: `
        <div style="
          width: 14px;
          height: 14px;
          background: #F97316;
          border: 2px solid #FFFFFF;
          border-radius: 9999px;
          box-shadow: 0 0 10px rgba(249, 115, 22, 0.85);
          cursor: pointer;
        " title="${detection.codeName} (${detection.massTons}t) - Clic para agregar a la ruta" onclick="event.stopPropagation()"></div>
      `,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
  };

  // Helper: Custom Waypoint Icon (Added on map click)
  const createCustomWaypointIcon = (wp: CustomWaypoint, index: number) => {
    return L.divIcon({
      className: 'custom-waypoint-marker',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer; transform: translate(-15px, -15px);" onclick="event.stopPropagation()">
          <div style="
            width: 30px;
            height: 30px;
            background: #06292D;
            border: 2px solid #38BDF8;
            border-radius: 9999px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 14px rgba(56, 189, 248, 0.7);
          ">
            <span style="font-size: 10px; font-weight: 900; color: #38BDF8; font-family: Montserrat, sans-serif;">P${index}</span>
          </div>
          <div style="
            position: absolute;
            top: -20px;
            background: rgba(6, 41, 45, 0.92);
            border: 1px solid #38BDF8;
            color: #E0F2FE;
            font-size: 9.5px;
            font-weight: bold;
            font-family: Montserrat, sans-serif;
            padding: 1px 6px;
            border-radius: 6px;
            white-space: nowrap;
          ">
            ${wp.name}
          </div>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  };

  // Helper: Route Name Pill on Map
  const createRouteNamePillIcon = (label: string, color: string) => {
    return L.divIcon({
      className: 'custom-route-pill',
      html: `
        <div style="
          background: rgba(6, 41, 45, 0.94);
          backdrop-filter: blur(12px);
          border: 1.5px solid ${color};
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.6), 0 0 12px ${color}66;
          padding: 3px 12px;
          border-radius: 9999px;
          color: ${color};
          font-weight: 800;
          font-size: 11px;
          font-family: Montserrat, sans-serif;
          white-space: nowrap;
          transform: translate(-50%, -50%);
        ">
          ${label}
        </div>
      `,
      iconSize: [160, 26],
      iconAnchor: [80, 13],
    });
  };

  // Coordenadas resueltas para Ruta Sugerida (100% Óptima)
  const resolvedSuggestedCoords: [number, number][] = useMemo(() => {
    if (suggestedRouteCoordinates && suggestedRouteCoordinates.length > 0) {
      return suggestedRouteCoordinates;
    }
    if (!metrics || !layers.optimalRoutes) return [];
    if (metrics.backendRoute && metrics.backendRoute.route?.coordinates?.length) {
      return metrics.backendRoute.route.coordinates.map(
        ([lon, lat]) => [lat, lon] as [number, number]
      );
    }
    return metrics.optimizedSequence.map((stop) => [stop.lat, stop.lng] as [number, number]);
  }, [suggestedRouteCoordinates, metrics, layers.optimalRoutes]);

  const suggestedMidpoint: [number, number] | null = useMemo(() => {
    if (resolvedSuggestedCoords.length < 2) return null;
    const midIdx = Math.floor(resolvedSuggestedCoords.length / 2);
    return resolvedSuggestedCoords[midIdx];
  }, [resolvedSuggestedCoords]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#07151D]">
      {/* Map Container - Full Bleed Satellite View */}
      <MapContainer
        center={mapCenter}
        zoom={10}
        minZoom={8}
        maxZoom={16}
        scrollWheelZoom={true}
        zoomControl={false}
        className="w-full h-full"
      >
        <MapController center={mapCenter} zoom={10} />
        <MapClickHandler onMapClick={onAddCustomWaypoint} />

        {/* 100% RELIABLE HIGH-CONTRAST BASEMAPS */}
        {layers.basemapMode === 'ocean' && (
          <>
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri Ocean</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"
              maxZoom={16}
            />
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}"
              maxZoom={16}
              opacity={0.9}
            />
          </>
        )}

        {layers.basemapMode === 'satellite' && (
          <>
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri World Imagery</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={16}
            />
            <TileLayer
              url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              maxZoom={16}
              opacity={0.7}
            />
          </>
        )}

        {layers.basemapMode === 'osm' && (
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO Voyager</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            maxZoom={16}
          />
        )}

        {/* 1. SARGAZO DETECTIONS */}
        {layers.sargassumPrediction &&
          detections.map((detection) => {
            const isSelected = selectedDetectionIds.includes(detection.id);
            const seqIndex = metrics?.optimizedSequence.findIndex((s) => s.id === detection.id);
            const seqNumber = seqIndex !== undefined && seqIndex > -1 ? seqIndex : undefined;

            return (
              <React.Fragment key={detection.id}>
                {isSelected && (
                  <Circle
                    center={[detection.lat, detection.lng]}
                    radius={1200}
                    pathOptions={{
                      color: '#2DD4BF',
                      fillColor: '#2DD4BF',
                      fillOpacity: 0.12,
                      weight: 1.5,
                      dashArray: '4, 4',
                    }}
                  />
                )}

                <Marker
                  position={[detection.lat, detection.lng]}
                  icon={
                    isSelected
                      ? createSelectedDetectionIcon(detection, seqNumber)
                      : createMinorDetectionIcon(detection)
                  }
                  eventHandlers={{
                    click: (e) => {
                      L.DomEvent.stopPropagation(e as any);
                      onToggleDetection(detection.id);
                    },
                  }}
                >
                  <Popup className="custom-leaflet-popup">
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="p-3 text-xs min-w-[210px] space-y-1.5 font-sans"
                    >
                      <div className="font-montserrat font-bold text-white text-sm pb-1 border-b border-teal-400/20 flex items-center justify-between">
                        <span>{detection.codeName}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            detection.priority === 'Alta'
                              ? 'bg-red-500/80 text-white'
                              : detection.priority === 'Media'
                              ? 'bg-orange-500/80 text-white'
                              : 'bg-yellow-500/80 text-slate-950'
                          }`}
                        >
                          {detection.priority}
                        </span>
                      </div>
                      <div className="text-slate-200 flex justify-between">
                        <span>Masa estimada:</span>
                        <strong className="text-white font-mono">{detection.massTons.toLocaleString()} t</strong>
                      </div>
                      <div className="text-slate-200 flex justify-between">
                        <span>Distancia a costa:</span>
                        <span className="text-slate-300 font-mono">{detection.distanceToCoastKm} km</span>
                      </div>
                      <div className="text-[10px] font-mono text-teal-200/70 pt-1 border-t border-teal-400/15">
                        Coord: {detection.lat.toFixed(5)}°N, {Math.abs(detection.lng).toFixed(5)}°W
                      </div>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleDetection(detection.id);
                          }}
                          className={`w-full py-1.5 px-2 rounded-xl font-montserrat font-bold text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-teal-600 text-white shadow-[0_0_12px_rgba(20,184,166,0.5)]'
                              : 'bg-white/10 text-teal-300 border border-teal-400/40 hover:bg-white/20'
                          }`}
                        >
                          {isSelected ? '✓ Asignada a Recolección' : '+ Seleccionar masa'}
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}

        {/* 2. CUSTOM WAYPOINTS (Added by user on click) */}
        {customWaypoints.map((wp, idx) => (
          <Marker
            key={wp.id}
            position={[wp.lat, wp.lng]}
            icon={createCustomWaypointIcon(wp, idx + 1)}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e as any);
              },
            }}
          >
            <Popup className="custom-leaflet-popup">
              <div 
                onClick={(e) => e.stopPropagation()} 
                className="p-3 text-xs min-w-[210px] space-y-1.5 font-sans"
              >
                <div className="font-montserrat font-bold text-white text-sm pb-1 border-b border-cyan-400/30 flex items-center justify-between">
                  <span>{wp.name}</span>
                  <span className="text-[9.5px] text-cyan-300 font-mono">Punto Manual</span>
                </div>
                <div className="text-slate-200 flex justify-between">
                  <span>Latitud / Longitud:</span>
                  <strong className="text-white font-mono">{wp.lat.toFixed(4)}°N, {Math.abs(wp.lng).toFixed(4)}°W</strong>
                </div>
                <div className="text-slate-200 flex justify-between">
                  <span>Masa asignada:</span>
                  <strong className="text-cyan-300 font-mono">~{wp.massTons || 0} t</strong>
                </div>
                {/* Botón claro: "Eliminar punto" con Phosphor Trash */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onRemoveCustomWaypoint(wp.id);
                  }}
                  className="w-full mt-2 py-1.5 px-3 rounded-xl bg-red-600/90 hover:bg-red-500 text-white font-montserrat font-bold text-xs transition-colors cursor-pointer flex items-center justify-center space-x-1.5 shadow-md"
                >
                  <Trash size={14} weight="bold" />
                  <span>Eliminar punto</span>
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 3. RUTA 100% SUGERIDA Y EXCLUSIVA (Línea Continua Turquesa Brillante #14B8A6) */}
        {layers.optimalRoutes && resolvedSuggestedCoords.length > 1 && (
          <>
            {/* Glow underlay */}
            <Polyline
              positions={resolvedSuggestedCoords}
              pathOptions={{
                color: '#14B8A6',
                weight: 8,
                opacity: 0.35,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Main high-contrast line */}
            <Polyline
              positions={resolvedSuggestedCoords}
              pathOptions={{
                color: '#14B8A6',
                weight: 4,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {suggestedMidpoint && (
              <Marker position={suggestedMidpoint} icon={createRouteNamePillIcon('Ruta Sugerida', '#2DD4BF')} />
            )}
          </>
        )}

        {/* 4. BASE PORTS */}
        {ports.map((port) => {
          const isSelectedPort = port.id === selectedPortId;
          return (
            <Marker
              key={port.id}
              position={[port.lat, port.lng]}
              icon={
                isSelectedPort
                  ? createPortCalloutIcon(port)
                  : createMinorPortIcon(port)
              }
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e as any);
                  onSelectPort(port.id);
                },
              }}
            >
              <Popup className="custom-leaflet-popup">
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="p-3 text-xs min-w-[210px] space-y-1.5 font-sans"
                >
                  <div className="font-montserrat font-bold text-white text-sm pb-1 border-b border-teal-400/20 flex items-center justify-between">
                    <span>⚓ {port.name}</span>
                    {isSelectedPort && (
                      <span className="text-[9px] bg-teal-500 text-slate-950 font-black px-1.5 py-0.5 rounded-full">
                        BASE
                      </span>
                    )}
                  </div>
                  <div className="text-slate-300 text-[11px]">{port.description}</div>
                  <div className="text-teal-300 text-[10px] pt-1 border-t border-teal-400/15">
                    Instalaciones: {port.facilities}
                  </div>
                  {!isSelectedPort && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPort(port.id);
                      }}
                      className="w-full mt-2 py-1 px-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-montserrat font-bold text-xs transition-colors cursor-pointer"
                    >
                      Elegir como Puerto Base
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 5. ANIMATED VESSEL (Phosphor Boat icon, bearing, speed) */}
        {isSimulating && vesselPosition && (
          <VesselMarker
            position={vesselPosition}
            bearing={vesselBearing}
            speedKnots={8.0}
            currentLeg={currentLegIndex + 1}
            totalLegs={Math.max(1, (metrics?.optimizedSequence.length || 2) - 1)}
            targetName={
              metrics?.optimizedSequence[currentLegIndex + 1]?.codeName ||
              metrics?.optimizedSequence[currentLegIndex + 1]?.name ||
              'Objetivo'
            }
          />
        )}

        {/* 6. DOCK DE CONTROLES FLOTANTES (Rosa de los Vientos, Capa y Zoom) DENTRO DE MAPCONTAINER */}
        <MapControlsDock
          basemapMode={layers.basemapMode}
          onCycleBasemapMode={onCycleBasemapMode}
        />
      </MapContainer>
    </div>
  );
};

export default MapBoard;
