import React from 'react';
import { Boat3DMarker, Boat3DMarkerProps } from './Boat3DMarker';

export const VesselMarker: React.FC<Boat3DMarkerProps> = (props) => {
  return <Boat3DMarker {...props} />;
};

export default VesselMarker;
