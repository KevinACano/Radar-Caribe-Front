# Radar Caribe

Radar Caribe es una interfaz web para visualizar y planificar operaciones relacionadas con el sargazo en el Caribe. Permite consultar puertos y avistamientos, revisar condiciones marítimas, seleccionar puntos de interés y calcular rutas marítimas optimizadas.

## Funcionalidades

- Visualización geográfica de puertos y detecciones de sargazo.
- Consulta de condiciones marítimas.
- Selección de destinos y creación de puntos personalizados.
- Cálculo de rutas individuales y rutas múltiples.
- Simulación de recorridos y métricas operativas.

## Requisitos

- Node.js 18 o superior.
- npm, incluido con Node.js.


## Instalación

Desde la carpeta del proyecto:

```bash
npm install
```

## Ejecutar el proyecto

Inicia el servidor de desarrollo:

```bash
npm run dev
```

Abre la dirección que muestra Vite. Por defecto es:

```text
http://localhost:5173
```

Si el backend se ejecuta en `http://127.0.0.1:8000`, Vite reenviará automáticamente las solicitudes que comienzan con `/api` y `/health`.

## Generar una versión de producción

```bash
npm run build
```

Los archivos generados se guardan en la carpeta `dist`.

Para previsualizar la compilación:

```bash
npm run preview
```

## Tecnologías principales

- React
- TypeScript
- Vite
- Tailwind CSS
- React Leaflet y Leaflet
