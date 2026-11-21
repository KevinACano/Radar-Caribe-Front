import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { initBoat3D, getBoat3DFrame } from '../utils/boat3DLoader';

export interface Boat3DMarkerProps {
  position: [number, number];
  bearing: number;
  speedKnots?: number;
  currentLeg?: number;
  totalLegs?: number;
  targetName?: string;
}

export const Boat3DMarker: React.FC<Boat3DMarkerProps> = ({
  position,
  bearing,
}) => {
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const markerRef = useRef<L.Marker | null>(null);

  // Carga inicial del modelo 3D y generación de perspectivas isométricas a 50°
  useEffect(() => {
    let isMounted = true;
    initBoat3D().then((frames) => {
      if (isMounted && frames && frames.length > 0) {
        setIsLoaded(true);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Actualiza dinámicamente la perspectiva 3D real según el rumbo (bearing) en cada tramo
  useEffect(() => {
    if (markerRef.current) {
      const el = markerRef.current.getElement();
      if (el) {
        const img = el.querySelector<HTMLImageElement>('.vessel-3d-img');
        const frame = getBoat3DFrame(bearing);
        if (img && frame && img.src !== frame) {
          img.src = frame;
        }
      }
    }
  }, [bearing, isLoaded]);

  // Marcador Leaflet divIcon estilo Google Maps (limpio, sin popups ni badges)
  const vesselIcon = useMemo(() => {
    const currentFrame = getBoat3DFrame(bearing);

    const innerContent = currentFrame
      ? `<img class="vessel-3d-img" src="${currentFrame}" alt="Embarcación 3D" style="width: 58px; height: 58px; object-fit: contain; pointer-events: none; filter: drop-shadow(0 6px 14px rgba(0,0,0,0.85)); display: block;" />`
      : `<div style="width: 58px; height: 58px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.7));">
           <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="#2DD4BF" viewBox="0 0 256 256">
             <path d="M224,125.77V152c0,56-96,80-96,80s-96-24-96-80V125.77a8,8,0,0,1,5.47-7.59L128,88l90.53,30.18A8,8,0,0,1,224,125.77Z" opacity="0.25"></path>
             <path d="M221.06,110.59,208,106.23V56a16,16,0,0,0-16-16H136V24a8,8,0,0,0-16,0V40H64A16,16,0,0,0,48,56v50.23l-13.06,4.36A16,16,0,0,0,24,125.77V152c0,61.54,97.89,86.72,102.06,87.76a8,8,0,0,0,3.88,0C134.11,238.72,232,213.54,232,152V125.77A16,16,0,0,0,221.06,110.59ZM64,56H192v44.9L130.53,80.41a8,8,0,0,0-5.06,0L64,100.9Zm152,96c0,24.91-23.68,43-43.55,53.83A228.13,228.13,0,0,1,128,223.72,226.85,226.85,0,0,1,83.81,206C47.6,186.35,40,165.79,40,152V125.77L120,99.1V168a8,8,0,0,0,16,0V99.1l80,26.67Z"></path>
           </svg>
         </div>`;

    return L.divIcon({
      className: 'custom-boat-3d-marker',
      html: `
        <div class="vessel-3d-wrapper" style="
          position: relative;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        ">
          <!-- Sutil estela radar náutica GPS -->
          <div style="
            position: absolute;
            width: 44px;
            height: 44px;
            border-radius: 9999px;
            background: radial-gradient(circle, rgba(45, 212, 191, 0.35) 0%, rgba(20, 184, 166, 0.08) 65%, transparent 100%);
            border: 1.5px solid rgba(45, 212, 191, 0.45);
            box-shadow: 0 0 12px rgba(45, 212, 191, 0.35);
            animation: pulse 2.2s infinite ease-out;
            pointer-events: none;
          "></div>

          <!-- Contenedor con perspectiva 3D real isométrica -->
          <div class="vessel-3d-container" style="
            width: 58px;
            height: 58px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            ${innerContent}
          </div>
        </div>
      `,
      iconSize: [60, 60],
      iconAnchor: [30, 30],
    });
  }, [isLoaded]);

  return (
    <Marker 
      ref={markerRef} 
      position={position} 
      icon={vesselIcon} 
      zIndexOffset={1000} 
      interactive={false}
    />
  );
};

export default Boat3DMarker;
