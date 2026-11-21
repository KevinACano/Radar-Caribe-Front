import * as turf from '@turf/turf';
import { SargassumCluster, SargassumGeoJsonFeature } from '../types';

/**
 * Agrupa espacialmente las celdas contiguas de sargazo del GeoJSON
 * para consolidar cada mancha/filamento en UN SOLO punto representativo (centroide ponderado).
 */
export function clusterSargassumFeatures(
  features: SargassumGeoJsonFeature[],
  maxDistanceKm: number = 15
): SargassumCluster[] {
  if (!features || features.length === 0) return [];

  // Convert each feature polygon centroid to a Feature<Point>
  const points = features.map((f, index) => {
    const c = turf.centroid(f as any).geometry.coordinates; // [lng, lat]
    return turf.point(c, {
      featureIndex: index,
      prob: f.properties.presence_probability || 0.05,
      cell_i: f.properties.cell_i,
      cell_j: f.properties.cell_j,
      datetime: f.properties.prediction_datetime,
    });
  });

  const fc = turf.featureCollection(points);
  // Cluster adjacent cells using DBSCAN (15 km neighbourhood covers contiguous ~5 km cells)
  const clustered = turf.clustersDbscan(fc, maxDistanceKm, { units: 'kilometers', minPoints: 1 });

  // Group by cluster ID
  const clusterGroups = new Map<number, any[]>();
  clustered.features.forEach((pt: any) => {
    const clusterId = pt.properties.cluster !== undefined ? pt.properties.cluster : 0;
    if (!clusterGroups.has(clusterId)) {
      clusterGroups.set(clusterId, []);
    }
    clusterGroups.get(clusterId)!.push(pt);
  });

  const clusters: SargassumCluster[] = [];
  const totalClusters = clusterGroups.size;

  clusterGroups.forEach((pts: any[], cid: number) => {
    let sumWeight = 0;
    let sumLat = 0;
    let sumLng = 0;
    let maxProb = 0;
    let sumProb = 0;

    pts.forEach((p: any) => {
      const prob = p.properties.prob || 0.05;
      const [lng, lat] = p.geometry.coordinates;
      const weight = Math.max(0.01, prob);
      sumLat += lat * weight;
      sumLng += lng * weight;
      sumWeight += weight;
      sumProb += prob;
      if (prob > maxProb) maxProb = prob;
    });

    const centroidLat = sumLat / sumWeight;
    const centroidLng = sumLng / sumWeight;
    const cellCount = pts.length;
    const avgProb = sumProb / cellCount;

    // Approximate total biomass estimation based on cell count and density
    const estimatedMassTons = Math.round(sumWeight * 35); // ~1,500 t

    const clusterFeatures = pts.map((p: any) => features[p.properties.featureIndex]);

    clusters.push({
      id: `cluster-${cid}`,
      name: totalClusters === 1 
        ? `Filamento Principal de Sargazo (48 h)`
        : `Mancha de Sargazo #${cid + 1} (${cellCount} celdas)`,
      clusterId: cid,
      cellCount,
      maxProb: Number(maxProb.toFixed(3)),
      avgProb: Number(avgProb.toFixed(3)),
      centroidLat: Number(centroidLat.toFixed(5)),
      centroidLng: Number(centroidLng.toFixed(5)),
      estimatedMassTons,
      datetime: pts[0]?.properties.datetime || '48h',
      features: clusterFeatures,
    });
  });

  return clusters;
}
