import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

interface VesselMarkerProps {
  position: [number, number];
  bearing: number;
  speedKnots: number;
  currentLeg: number;
  totalLegs: number;
  targetName: string;
}

export const VesselMarker: React.FC<VesselMarkerProps> = ({
  position,
  bearing,
  speedKnots,
  currentLeg,
  totalLegs,
  targetName,
}) => {
  // DivIcon with rotating boat icon and nautical glow
  const vesselIcon = L.divIcon({
    className: 'custom-vessel-icon',
    html: `
      <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
        <!-- Pulsing radar glow ring -->
        <div style="position: absolute; width: 48px; height: 48px; border-radius: 9999px; background: rgba(45, 212, 191, 0.25); animation: pulse 2s infinite ease-out;"></div>
        
        <!-- Rotating Vessel container -->
        <div style="transform: rotate(${bearing}deg); transition: transform 0.25s ease-out; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: #0B3B40; border: 2.5px solid #2DD4BF; border-radius: 9999px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.6), 0 0 12px rgba(45, 212, 191, 0.5);">
          <!-- Phosphor-style Boat Silhouette -->
          <svg width="22" height="22" viewBox="0 0 256 256" fill="#2DD4BF">
            <path d="M245.92,130.63l-28.7-67A16,16,0,0,0,202.5,54H136V40a8,8,0,0,0-16,0V54H53.5a16,16,0,0,0-14.72,9.69l-28.7,67A16,16,0,0,0,24,144H33l13.6,54.4A16,16,0,0,0,62.14,210H193.86a16,16,0,0,0,15.51-11.6L223,144h9a16,16,0,0,0,13.92-13.37ZM53.5,70H120v58H34.42ZM136,70h66.5l24.86,58H136Zm57.86,124H62.14l-11-44H204.86Z"/>
          </svg>
        </div>

        <!-- Speed tag pill -->
        <div style="position: absolute; bottom: -8px; background: #07151D; color: #2DD4BF; font-size: 9.5px; font-weight: 800; font-family: 'JetBrains Mono', monospace; padding: 1px 6px; border-radius: 9999px; border: 1px solid rgba(45, 212, 191, 0.6); white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.5);">
          ${speedKnots} nd
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });

  return (
    <Marker position={position} icon={vesselIcon} zIndexOffset={1000}>
      <Popup className="custom-leaflet-popup">
        <div className="p-3 text-xs min-w-[200px] font-sans">
          <div className="flex items-center space-x-1.5 text-teal-300 font-bold pb-1.5 border-b border-teal-400/20 font-montserrat">
            <span>🚤</span>
            <span className="text-white text-sm">Embarcación Colectora</span>
          </div>
          <div className="mt-2 space-y-1 text-slate-200">
            <div className="flex justify-between">
              <span className="text-slate-400">Velocidad:</span>
              <strong className="text-white font-mono">{speedKnots} nudos</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Rumbo de proa:</span>
              <strong className="text-teal-300 font-mono">{Math.round(bearing)}°</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Tramo de misión:</span>
              <strong className="text-emerald-400 font-mono">{currentLeg} / {totalLegs}</strong>
            </div>
            <div className="pt-1.5 text-[10.5px] text-slate-300 border-t border-teal-400/15 truncate">
              Destino: <strong className="text-teal-300">{targetName}</strong>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

export default VesselMarker;
