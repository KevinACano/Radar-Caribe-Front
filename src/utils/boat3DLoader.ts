import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let boatPerspectiveFrames: string[] | null = null;
let boatLoadPromise: Promise<string[] | null> | null = null;

/**
 * Inicializa y pre-renderiza 72 perspectivas 3D isométricas a 50° (cada 5° de rumbo)
 * utilizando Three.js GLTFLoader sobre el modelo .glb de public/.
 * La rotación ocurre en espacio 3D real (model.rotation.y), mostrando volumen lateral,
 * proa y popa con profundidad isométrica real estilo Google Maps.
 */
export function initBoat3D(): Promise<string[] | null> {
  if (boatPerspectiveFrames) {
    return Promise.resolve(boatPerspectiveFrames);
  }
  if (boatLoadPromise) {
    return boatLoadPromise;
  }

  boatLoadPromise = new Promise<string[] | null>((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }

    const loader = new GLTFLoader();

    const tryLoad = (modelPath: string, fallbackPath?: string) => {
      loader.load(
        modelPath,
        (gltf) => {
          try {
            const sizePx = 128;
            const canvas = document.createElement('canvas');
            canvas.width = sizePx;
            canvas.height = sizePx;

            const renderer = new THREE.WebGLRenderer({
              canvas,
              alpha: true,
              antialias: true,
              preserveDrawingBuffer: true,
              powerPreference: 'low-power',
            });
            renderer.setSize(sizePx, sizePx);
            renderer.setPixelRatio(1);
            renderer.setClearColor(0x000000, 0);

            const scene = new THREE.Scene();

            // Iluminación ambiental y solar direccional para acentuar el volumen 3D
            const ambient = new THREE.AmbientLight(0xffffff, 2.2);
            scene.add(ambient);

            const sun = new THREE.DirectionalLight(0xffffff, 2.8);
            sun.position.set(10, 22, 16);
            scene.add(sun);

            const tealRim = new THREE.DirectionalLight(0x2dd4bf, 1.2);
            tealRim.position.set(-10, 10, -8);
            scene.add(tealRim);

            const root = gltf.scene;

            // Centrar la geometría en el origen
            const box = new THREE.Box3().setFromObject(root);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            root.position.x -= center.x;
            root.position.y -= center.y;
            root.position.z -= center.z;

            // Escala proporcional ajustada al campo visual
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 14 / (maxDim || 1);
            root.scale.set(scale, scale, scale);
            scene.add(root);

            // Perspectiva isométrica a 50° respecto a la horizontal
            const dist = 24;
            const pitchRad = (50 * Math.PI) / 180;
            const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
            camera.position.set(0, Math.sin(pitchRad) * dist, Math.cos(pitchRad) * dist);
            camera.lookAt(0, 0, 0);

            // Generar las 72 perspectivas de rotación en 3D real (cada 5° de rumbo)
            const frames: string[] = [];
            const stepDeg = 5;
            const totalSteps = 72; // 360 / 5

            for (let i = 0; i < totalSteps; i++) {
              const deg = i * stepDeg;
              // Rotación sobre eje vertical Y en 3D
              root.rotation.y = Math.PI - (deg * Math.PI) / 180;
              renderer.render(scene, camera);
              frames.push(canvas.toDataURL('image/png'));
            }

            renderer.dispose();
            boatPerspectiveFrames = frames;
            resolve(frames);
          } catch (err) {
            console.warn('Error al generar vistas 3D con Three.js:', err);
            resolve(null);
          }
        },
        undefined,
        (err) => {
          if (fallbackPath) {
            tryLoad(fallbackPath);
          } else {
            console.warn('No se pudo cargar el modelo 3D (.glb):', err);
            resolve(null);
          }
        }
      );
    };

    tryLoad('/boat.glb', '/barco.glb');
  });

  return boatLoadPromise;
}

/**
 * Obtiene el frame 3D con perspectiva real a 50° según el rumbo (bearing en grados)
 */
export function getBoat3DFrame(bearing: number): string | null {
  if (!boatPerspectiveFrames || boatPerspectiveFrames.length === 0) return null;
  const normalized = ((Math.round(bearing) % 360) + 360) % 360;
  const index = Math.round(normalized / 5) % 72;
  return boatPerspectiveFrames[index] || boatPerspectiveFrames[0];
}

/**
 * Helper de compatibilidad que retorna el primer frame o espera a la inicialización
 */
export function getBoat3DDataUrl(): Promise<string | null> {
  return initBoat3D().then((frames) => (frames && frames.length > 0 ? frames[0] : null));
}
