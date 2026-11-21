import React, { useEffect, useMemo, useRef } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Polyline, 
  Circle, 
  Marker, 
  Popup, 
  Tooltip,
  GeoJSON,
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
  SargassumDetection,
  SargassumGeoJsonCollection,
  SargassumCluster
} from '../types';
import { Boat3DMarker } from './Boat3DMarker';
import { Plus, Minus, NavigationArrow, MapTrifold, Trash, Crosshair, Flame, MapPin } from '@phosphor-icons/react';

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
  // GeoJSON & Clusters
  geoJsonData?: SargassumGeoJsonCollection | null;
  sargassumClusters: SargassumCluster[];
  selectedClusterIds: string[];
  onToggleCluster: (clusterId: string) => void;
  // Manual Waypoint Mode
  isAddPointActive: boolean;
  onCancelAddPointActive?: () => void;
  // Simulation Props
  isSimulating: boolean;
  vesselPosition: [number, number] | null;
  vesselBearing: number;
  currentLegIndex: number;
  onCycleBasemapMode: () => void;
  focusLocation?: [number, number] | null;
}

// Controller to smoothly fly to focused notification coordinates
const MapFocusController: React.FC<{ focusLocation?: [number, number] | null }> = ({ focusLocation }) => {
  const map = useMap();
  useEffect(() => {
    if (focusLocation) {
      map.flyTo(focusLocation, 12, { duration: 1.5 });
    }
  }, [focusLocation, map]);
  return null;
};

// Helper to reliably capture the map instance
const MapInstanceCapture: React.FC<{ onMapReady: (map: L.Map) => void }> = ({ onMapReady }) => {
  const map = useMap();
  useEffect(() => {
    onMapReady(map);
    map.invalidateSize();
  }, [map, onMapReady]);
  return null;
};

// Map click handler to drop custom points ONLY when isAddPointActive is true
const MapClickHandler: React.FC<{ 
  isAddPointActive: boolean;
  onMapClick?: (lat: number, lng: number) => void;
}> = ({ isAddPointActive, onMapClick }) => {
  useMapEvents({
    click: (e) => {
      if (isAddPointActive && onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

// Heatmap fill color helper matching prompt requirements
const getCellFillColor = (p: number): string => {
  if (p > 0.75) return '#bd0026'; // Rojo intenso — Alta probabilidad
  if (p > 0.50) return '#f03b20'; // Rojo-naranja
  if (p > 0.25) return '#fd8d3c'; // Naranja
  if (p > 0.10) return '#fecc5c'; // Amarillo-naranja
  return '#ffffb2';                // Amarillo claro (<= 0.10)
};

// Heatmap fill opacity helper (suave y difuminado entre 0.18 y 0.55 sin bordes)
const getCellFillOpacity = (p: number): number => {
  return Math.min(0.55, Math.max(0.18, 0.18 + p * 0.37));
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
  geoJsonData = null,
  sargassumClusters,
  selectedClusterIds,
  onToggleCluster,
  isAddPointActive,
  onCancelAddPointActive,
  isSimulating,
  vesselPosition,
  vesselBearing,
  currentLegIndex,
  onCycleBasemapMode,
  focusLocation = null,
}) => {
  // Center map comfortably to cover both ports and the GeoJSON probability filament
  const mapCenter: [number, number] = [19.95, -86.0];
  const mapRef = useRef<L.Map | null>(null);

  // Helper to focus sargassum filament
  const handleFocusSargassum = () => {
    if (mapRef.current) {
      mapRef.current.flyTo([19.45, -85.25], 9, { duration: 1.2 });
    }
  };

  // Helper: Selected Base Port Icon (Destacado en Ámbar / Dorado vibrante #F59E0B con borde blanco y pulso sutil)
  const createPortCalloutIcon = (_port: BasePort) => {
    return L.divIcon({
      className: 'custom-port-selected',
      html: `
        <div style="
          position: relative;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transform: translate(-18px, -18px);
        " onclick="event.stopPropagation()">
          <!-- Anillo radar de pulso ámbar -->
          <div style="
            position: absolute;
            width: 36px;
            height: 36px;
            border-radius: 9999px;
            background: rgba(245, 158, 11, 0.35);
            animation: pulse 2.2s infinite ease-out;
            pointer-events: none;
          "></div>
          <!-- Círculo base ámbar con borde blanco de alto contraste -->
          <div style="
            width: 28px;
            height: 28px;
            background: #F59E0B;
            border: 2.5px solid #FFFFFF;
            border-radius: 9999px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 16px rgba(245, 158, 11, 0.9), 0 4px 10px rgba(0, 0, 0, 0.5);
            z-index: 2;
          ">
            <svg width="15" height="15" viewBox="0 0 256 256" fill="#07151D">
              <path d="M224,128a96.11,96.11,0,0,1-88,95.66V152h24a8,8,0,0,0,0-16H136V95.6A40,40,0,1,0,120,95.6V136H96a8,8,0,0,0,0,16h24v71.66A96.11,96.11,0,0,1,32,128a8,8,0,0,0-16,0,112.14,112.14,0,0,0,104,111.71V240a8,8,0,0,0,16,0v-.29A112.14,112.14,0,0,0,240,128a8,8,0,0,0-16,0ZM128,40a24,24,0,1,1-24,24A24,24,0,0,1,128,40Z"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
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
          background: #0F5247;
          backdrop-filter: blur(8px);
          border: 1.5px solid #2DD4BF;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          cursor: pointer;
        " title="${port.name}" onclick="event.stopPropagation()">
          <svg width="13" height="13" viewBox="0 0 256 256" fill="#FFFFFF">
            <path d="M224,128a96.11,96.11,0,0,1-88,95.66V152h24a8,8,0,0,0,0-16H136V95.6A40,40,0,1,0,120,95.6V136H96a8,8,0,0,0,0,16h24v71.66A96.11,96.11,0,0,1,32,128a8,8,0,0,0-16,0,112.14,112.14,0,0,0,104,111.71V240a8,8,0,0,0,16,0v-.29A112.14,112.14,0,0,0,240,128a8,8,0,0,0-16,0ZM128,40a24,24,0,1,1-24,24A24,24,0,0,1,128,40Z"/>
          </svg>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  // Helper: Consolidated Sargassum Cluster Representative Centroid Pin Marker
  const createClusterCentroidIcon = (_cluster: SargassumCluster, seqNumber: number) => {
    return L.divIcon({
      className: 'custom-cluster-centroid-pin',
      html: `
        <div style="cursor: pointer; transform: translate(-17px, -17px);" onclick="event.stopPropagation()">
          <div style="
            width: 34px;
            height: 34px;
            background: #06292D;
            border: 2.5px solid #14B8A6;
            border-radius: 9999px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 20px rgba(20, 184, 166, 0.95);
          ">
            <span style="background: #2DD4BF; color: #07151D; font-weight: 900; font-size: 11px; width: 20px; height: 20px; border-radius: 9999px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 0 8px #2DD4BF;">
              ${seqNumber}
            </span>
          </div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
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

  return (
    <div className={`relative w-full h-full overflow-hidden bg-[#07151D] ${isAddPointActive ? 'cursor-crosshair' : ''}`}>
      {/* Banner flotante discreto si el modo de marcado de punto está activo */}
      {isAddPointActive && (
        <div className="absolute top-[88px] left-1/2 -translate-x-1/2 z-40 pointer-events-auto select-none">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#06292D]/90 backdrop-blur-md border border-amber-400/50 px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(251,191,36,0.3)] flex items-center space-x-2.5 text-xs font-sans text-amber-200"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="font-bold font-montserrat">Modo fijar punto activo:</span>
            <span className="text-white">Haz clic sobre el mar para ubicar coordenada</span>
            {onCancelAddPointActive && (
              <button 
                type="button" 
                onClick={onCancelAddPointActive}
                className="ml-2 text-[10px] font-bold text-amber-300 hover:text-white underline cursor-pointer"
              >
                Cancelar
              </button>
            )}
          </motion.div>
        </div>
      )}

      {/* Map Container - Full Bleed Satellite View */}
      <MapContainer
        center={mapCenter}
        zoom={9}
        minZoom={7}
        maxZoom={16}
        scrollWheelZoom={true}
        zoomControl={false}
        className="w-full h-full"
      >
        <MapInstanceCapture onMapReady={(m) => { mapRef.current = m; }} />
        <MapFocusController focusLocation={focusLocation} />
        <MapClickHandler isAddPointActive={isAddPointActive} onMapClick={onAddCustomWaypoint} />

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

        {/* 1. GEOJSON HEATMAP POLYGONS (Capa visual continua de calor suave sin bordes) */}
        {layers.sargassumPrediction && geoJsonData && (
          <GeoJSON
            key={`geojson-prob-visual-${geoJsonData.features.length}`}
            data={geoJsonData as any}
            style={(feature) => {
              if (!feature || !feature.properties) return {};
              const p = (feature.properties as any).presence_probability || 0;
              return {
                fillColor: getCellFillColor(p),
                fillOpacity: getCellFillOpacity(p),
                weight: 0,
                stroke: false,
              };
            }}
            onEachFeature={(_feature, layer) => {
              // Clic en cualquier celda añade/quita el filamento consolidado
              layer.on('click', (e) => {
                L.DomEvent.stopPropagation(e as any);
                if (sargassumClusters.length > 0) {
                  onToggleCluster(sargassumClusters[0].id);
                }
              });
            }}
          />
        )}

        {/* 2. CONSOLIDATED SARGASSUM CLUSTER CENTROID PINS (UN SOLO PUNTO POR MANCHA) */}
        {layers.sargassumPrediction && sargassumClusters.map((cluster) => {
          const isSelected = selectedClusterIds.includes(cluster.id);
          if (!isSelected) return null;

          const seqIndex = metrics?.optimizedSequence.findIndex((s) => s.id === cluster.id);
          const seqNumber = seqIndex !== undefined && seqIndex > -1 ? seqIndex : 1;

          return (
            <Marker
              key={cluster.id}
              position={[cluster.centroidLat, cluster.centroidLng]}
              icon={createClusterCentroidIcon(cluster, seqNumber)}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e as any);
                },
              }}
            >
              <Popup className="custom-leaflet-popup">
                <div 
                  onClick={(e) => e.stopPropagation()} 
                  className="p-3 text-xs min-w-[230px] space-y-2 font-sans"
                >
                  <div className="font-montserrat font-bold text-white text-sm pb-1 border-b border-teal-400/30 flex items-center justify-between">
                    <span>{cluster.name}</span>
                    <span className="text-[9.5px] px-2 py-0.5 rounded-full font-bold bg-teal-500/20 text-[#2DD4BF] border border-teal-400/40">
                      {cluster.cellCount} celdas
                    </span>
                  </div>
                  <div className="text-slate-200 flex justify-between">
                    <span>Centroide Ponderado:</span>
                    <strong className="text-white font-mono">
                      {cluster.centroidLat.toFixed(4)}°N, {Math.abs(cluster.centroidLng).toFixed(4)}°W
                    </strong>
                  </div>
                  <div className="text-slate-200 flex justify-between">
                    <span>Concentración Máxima:</span>
                    <strong className="text-[#2DD4BF] font-mono">
                      {(cluster.maxProb * 100).toFixed(0)}%
                    </strong>
                  </div>
                  <div className="text-slate-200 flex justify-between">
                    <span>Masa estimada acumulada:</span>
                    <strong className="text-white font-mono">
                      ~{cluster.estimatedMassTons.toLocaleString()} t
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCluster(cluster.id);
                    }}
                    className="w-full mt-2 py-1.5 px-3 rounded-xl bg-red-600/90 hover:bg-red-500 text-white font-montserrat font-bold text-xs transition-colors cursor-pointer flex items-center justify-center space-x-1.5 shadow-md"
                  >
                    <Trash size={13} weight="bold" />
                    <span>Quitar mancha de la ruta</span>
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 3. SARGAZO DETECTIONS (Puntos costeros complementarios) */}
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

        {/* 4. CUSTOM WAYPOINTS (Added by user only in addPoint mode) */}
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

        {/* 5. RUTA 100% SUGERIDA Y EXCLUSIVA (Línea Continua Turquesa Brillante #14B8A6) */}
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
          </>
        )}

        {/* 6. BASE PORTS */}
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
              <Tooltip direction="top" offset={[0, -18]} className="custom-port-tooltip">
                <span className="font-montserrat font-bold text-xs text-white">
                  {isSelectedPort ? `⚓ Puerto Base: ${port.name}` : port.name}
                </span>
              </Tooltip>
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

        {/* 7. ANIMATED 3D VESSEL (Modelo .glb Three.js estilo Google Maps) */}
        {isSimulating && vesselPosition && (
          <Boat3DMarker
            position={vesselPosition}
            bearing={vesselBearing}
          />
        )}
      </MapContainer>

      {/* 8. DOCK DE CONTROLES FLOTANTES (Rosa de los Vientos, Focus Sargazo, Capa y Zoom) - UBICADO CON Z-[1000] Y POINTER-EVENTS-AUTO */}
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        className="absolute bottom-6 right-4 z-[1000] flex flex-col items-center space-y-2 select-none pointer-events-auto"
      >
        {/* Rosa de los Vientos */}
        <div 
          className="w-9 h-9 rounded-xl bg-[#06292D]/90 backdrop-blur-md border border-teal-400/30 shadow-floating flex flex-col items-center justify-center text-teal-300 cursor-default"
          title="Norte Geográfico"
        >
          <NavigationArrow size={15} weight="bold" className="text-[#2DD4BF] -rotate-45 filter drop-shadow-[0_0_6px_rgba(45,212,191,0.6)]" />
          <span className="text-[8.5px] font-black text-slate-200 font-mono leading-none mt-0.5">N</span>
        </div>

        {/* Botón Enfocar Celdas de Sargazo */}
        <div className="relative group">
          <motion.button
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={(e) => {
              e.stopPropagation();
              handleFocusSargassum();
            }}
            className="w-9 h-9 rounded-xl bg-[#06292D]/90 backdrop-blur-md border border-teal-400/30 shadow-floating text-teal-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Centrar en filamento de sargazo"
          >
            <Crosshair size={18} weight="bold" className="text-[#2DD4BF]" />
          </motion.button>
          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2.5 px-2.5 py-1 rounded-lg bg-[#06292D]/95 backdrop-blur-md border border-teal-400/30 text-teal-100 text-[10.5px] font-montserrat font-bold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg">
            Centrar en filamento de sargazo
          </div>
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
            className="w-9 h-9 rounded-xl bg-[#06292D]/90 backdrop-blur-md border border-teal-400/30 shadow-floating text-teal-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Cambiar capa base del mapa"
          >
            <MapTrifold size={18} weight="duotone" className="text-[#2DD4BF]" />
          </motion.button>

          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2.5 px-2.5 py-1 rounded-lg bg-[#06292D]/95 backdrop-blur-md border border-teal-400/30 text-teal-100 text-[10.5px] font-montserrat font-bold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg">
            Capa: {layers.basemapMode === 'satellite' ? 'Satelital' : layers.basemapMode === 'ocean' ? 'Oceánico' : 'Costero'}
          </div>
        </div>

        {/* Botones de Zoom (+ / -) con detención estricta de propagación y respuesta garantizada */}
        <div 
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="flex flex-col space-y-1 bg-[#06292D]/90 backdrop-blur-md border border-teal-400/30 shadow-floating rounded-xl p-1 select-none font-sans"
        >
          <motion.button
            type="button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              mapRef.current?.zoomIn();
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
              mapRef.current?.zoomOut();
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-teal-300 hover:text-white hover:bg-white/10 font-bold transition-colors cursor-pointer"
            title="Alejar mapa"
          >
            <Minus size={15} weight="bold" />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default MapBoard;
