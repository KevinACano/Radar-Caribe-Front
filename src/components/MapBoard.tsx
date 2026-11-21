import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import { booleanIntersects } from '@turf/turf';
import { motion } from 'motion/react';
import { BasePort, DashboardLayers, FrameCollection, SargassumManifest } from '../types';
import { densityColor } from '../utils/density';
import { Boat3DMarker } from './Boat3DMarker';
import { Plus, Minus, NavigationArrow, MapTrifold, Crosshair } from '@phosphor-icons/react';

type Bounds = [[number, number], [number, number]]; // [[south, west], [north, east]]

interface MapBoardProps {
  ports: BasePort[];
  selectedPortId: string;
  onSelectPort: (portId: string) => void;
  layers: DashboardLayers;
  routeCoordinates: [number, number][];
  frame: FrameCollection | null;
  manifest: SargassumManifest | null;
  highlightGeometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  highlightId: string | null;
  focusAreaGeometry: GeoJSON.Polygon | null;
  focusBounds: Bounds | null;
  isSimulating: boolean;
  vesselPosition: [number, number] | null;
  vesselBearing: number;
  onCycleBasemapMode: () => void;
}

// Flies to the bounds each time a new bounds object is passed
const MapFocusController: React.FC<{ bounds: Bounds | null }> = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.flyToBounds(bounds, { duration: 1.2, padding: [80, 80], maxZoom: 12 });
  }, [bounds, map]);
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

export const MapBoard: React.FC<MapBoardProps> = ({
  ports,
  selectedPortId,
  onSelectPort,
  layers,
  routeCoordinates,
  frame,
  manifest,
  highlightGeometry,
  highlightId,
  focusAreaGeometry,
  focusBounds,
  isSimulating,
  vesselPosition,
  vesselBearing,
  onCycleBasemapMode,
}) => {
  const mapCenter: [number, number] = [20.9, -86.7];
  const mapRef = useRef<L.Map | null>(null);

  // Cells touching the alert's area (memoized per frame + area)
  const insideCells = useMemo(() => {
    if (!frame || !focusAreaGeometry) return null;
    const set = new Set<GeoJSON.Feature>();
    for (const f of frame.features) if (booleanIntersects(f, focusAreaGeometry)) set.add(f);
    return set;
  }, [frame, focusAreaGeometry]);

  const handleFocusSargassum = () => {
    if (!mapRef.current) return;
    if (focusBounds) mapRef.current.flyToBounds(focusBounds, { duration: 1.2, padding: [80, 80], maxZoom: 12 });
    else if (manifest) {
      const [w, s, e, n] = manifest.bbox;
      mapRef.current.flyToBounds([[s, w], [n, e]], { duration: 1.2 });
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

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#07151D]">
      {/* Map Container - Full Bleed Satellite View */}
      <MapContainer
        center={mapCenter}
        zoom={9}
        minZoom={7}
        maxZoom={16}
        scrollWheelZoom={true}
        preferCanvas
        zoomControl={false}
        className="w-full h-full"
      >
        <MapInstanceCapture onMapReady={(m) => { mapRef.current = m; }} />
        <MapFocusController bounds={focusBounds} />

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

        {/* PREDICCIÓN: celdas de densidad del frame seleccionado (escala log del manifest) */}
        {layers.sargassumPrediction && frame && manifest && (
          <GeoJSON
            key={`frame-${manifest.run_id}-${frame.features.length}-${frame.features[0]?.properties.density}-${insideCells ? 'dim' : 'all'}`}
            data={frame}
            interactive={false}
            style={(f) => ({
              fillColor: densityColor(f?.properties?.density ?? 0, manifest.vmin, manifest.vmax, manifest.palette),
              ...(insideCells && f && !insideCells.has(f)
                ? { fillOpacity: 0.17, stroke: true, weight: 0.5, color: '#FFFFFF', opacity: 0.06 }
                : { fillOpacity: 0.6, stroke: false }),
            })}
          />
        )}

        {/* MASA DE LA ALERTA SELECCIONADA */}
        {layers.sargassumPrediction && highlightGeometry && (
          <GeoJSON
            key={`mass-${highlightId}`}
            data={highlightGeometry}
            interactive={false}
            style={{ color: '#FFFFFF', weight: 3, fillColor: '#F59E0B', fillOpacity: 0.25, dashArray: '6 4' }}
          />
        )}

        {/* 5. RUTA 100% SUGERIDA Y EXCLUSIVA (Línea Continua Turquesa Brillante #14B8A6) */}
        {layers.optimalRoutes && routeCoordinates.length > 1 && (
          <>
            {/* Glow underlay */}
            <Polyline
              positions={routeCoordinates}
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
              positions={routeCoordinates}
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
            title="Centrar en la alerta"
          >
            <Crosshair size={18} weight="bold" className="text-[#2DD4BF]" />
          </motion.button>
          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2.5 px-2.5 py-1 rounded-lg bg-[#06292D]/95 backdrop-blur-md border border-teal-400/30 text-teal-100 text-[10.5px] font-montserrat font-bold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg">
            Centrar en la alerta
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
