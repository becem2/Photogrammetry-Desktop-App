import { useState, useRef, useEffect, useMemo } from "react";
import {
  Grid3x3,
  Lightbulb,
  Maximize2,
  RotateCcw,
  Box,
  Ruler,
  Camera,
  Palette,
  Navigation,
  Monitor,
  FileImage,
  Map,
  TreePine,
  Cuboid,
} from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";
import * as Switch from "@radix-ui/react-switch";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { PLYLoader } from "three/addons/loaders/PLYLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { useNavigate, useParams } from "react-router-dom";
import { collection, getDocs, limit, query, where, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../../Config/Firebase";

const hasElectronApi = () =>
  typeof window !== "undefined" && window.electronAPI !== undefined;

type SavedViewState = {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  target: [number, number, number];
  zoom: number;
};

type MeasurementPoint = {
  x: number;
  y: number;
  z: number;
};

type PointCloudColorMode = "rgb" | "elevation" | "intensity" | "classification";

const swapYAndZInAttribute = (attribute: THREE.BufferAttribute) => {
  for (let i = 0; i < attribute.count; i += 1) {
    const y = attribute.getY(i);
    const z = attribute.getZ(i);
    attribute.setY(i, z);
    attribute.setZ(i, y);
  }
  attribute.needsUpdate = true;
};

const swapYAndZInGeometry = (geometry: THREE.BufferGeometry) => {
  const position = geometry.getAttribute("position");
  if (position && position.itemSize >= 3 && position instanceof THREE.BufferAttribute) {
    swapYAndZInAttribute(position);
  }

  const normal = geometry.getAttribute("normal");
  if (normal && normal.itemSize >= 3 && normal instanceof THREE.BufferAttribute) {
    swapYAndZInAttribute(normal);
  }

  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
};

type ViewerProps = {
  projectIdOverride?: string | null;
};

export function Viewer({ projectIdOverride }: ViewerProps = {}) {
  const { projectId: routeProjectId } = useParams();
  const projectId = projectIdOverride ?? routeProjectId;
  const navigate = useNavigate();
  const [dataType, setDataType] = useState<"3d" | "orthophoto" | "ndvi">("3d");
  const [viewMode, setViewMode] = useState<"mesh" | "pointcloud">("mesh");
  const [wireframe, setWireframe] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [lighting, setLighting] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [showShadows, setShowShadows] = useState(false);
  const [ambientOcclusion, setAmbientOcclusion] = useState(false);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState("#071126");
  const [renderQuality, setRenderQuality] = useState<"low" | "medium" | "high" | "ultra">("high");
  const [fieldOfView, setFieldOfView] = useState(60);
  const [pointSize, setPointSize] = useState(0.02);
  const [colorMode, setColorMode] = useState<PointCloudColorMode>("rgb");
  const [meshOpacity, setMeshOpacity] = useState(100);
  const [measurementTool, setMeasurementTool] = useState<"distance" | "area" | null>(null);
  const [distancePoints, setDistancePoints] = useState<MeasurementPoint[]>([]);
  const [areaPoints, setAreaPoints] = useState<MeasurementPoint[]>([]);
  const [plyGeometry, setPlyGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [sceneObject, setSceneObject] = useState<THREE.Object3D | null>(null);
  const [plyName, setPlyName] = useState("demo_point_cloud.ply");
  const [loadedFilePath, setLoadedFilePath] = useState("");
  const [status, setStatus] = useState("Ready");
  const [pointCount, setPointCount] = useState(0);
  const [rasterName, setRasterName] = useState("demo_orthophoto.png");
  const [plyError, setPlyError] = useState("");
  const [isLoadingPly, setIsLoadingPly] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [rasterRevision, setRasterRevision] = useState(0);
  const [currentProjectRootPath, setCurrentProjectRootPath] = useState("");
  const [isViewerFullscreen, setIsViewerFullscreen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const measurementCanvasRef = useRef<HTMLCanvasElement>(null);
  const threeContainerRef = useRef<HTMLDivElement>(null);
  const rasterImageRef = useRef<HTMLImageElement | null>(null);
  const dragDepthRef = useRef(0);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rootRef = useRef<THREE.Group | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const axesRef = useRef<THREE.AxesHelper | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const directionalLightRef = useRef<THREE.DirectionalLight | null>(null);
  const activeCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const activeControlsRef = useRef<OrbitControls | null>(null);
  const measurementPlaneYRef = useRef(0);
  const lastAutoLoadedProjectIdRef = useRef<string | null>(null);
  const autoCapturedProjectIconIdRef = useRef<string | null>(null);
  const viewerSettingsRef = useRef({
    backgroundColor,
    renderQuality,
    fieldOfView,
    pointSize,
    colorMode,
    meshOpacity,
    lighting,
    showGrid,
    showAxes,
    showShadows,
    wireframe,
    showMeasurements,
    measurementTool,
    distancePoints,
    areaPoints,
  });
  const saved3DViewStateRef = useRef<SavedViewState | null>(null);
  const plyLoader = useMemo(() => new PLYLoader(), []);
  const plyHasFaces = Boolean(plyGeometry?.getIndex());
  const effective3DViewMode = sceneObject ? viewMode : (plyGeometry && !plyHasFaces ? "pointcloud" : viewMode);

  useEffect(() => {
    viewerSettingsRef.current = {
      backgroundColor,
      renderQuality,
      fieldOfView,
      pointSize,
      colorMode,
      meshOpacity,
      lighting,
      showGrid,
      showAxes,
      showShadows,
      wireframe,
      showMeasurements,
      measurementTool,
      distancePoints,
      areaPoints,
    };
  }, [
    backgroundColor,
    renderQuality,
    fieldOfView,
    pointSize,
    colorMode,
    meshOpacity,
    lighting,
    showGrid,
    showAxes,
    showShadows,
    wireframe,
    showMeasurements,
    measurementTool,
    distancePoints,
    areaPoints,
  ]);

  const applyPointCloudColorMode = (pointsObject: THREE.Points, mode: PointCloudColorMode) => {
    const material = Array.isArray(pointsObject.material) ? pointsObject.material[0] : pointsObject.material;
    if (!(material instanceof THREE.PointsMaterial)) {
      return;
    }

    const geometry = pointsObject.geometry;
    const alreadyAppliedMode = geometry.userData.appliedPointCloudColorMode as PointCloudColorMode | undefined;
    if (alreadyAppliedMode === mode) {
      return;
    }

    const positionAttribute = geometry.getAttribute("position");
    if (!(positionAttribute instanceof THREE.BufferAttribute)) {
      return;
    }

    const existingColorAttribute = geometry.getAttribute("color");
    if (
      !geometry.userData.originalColorAttribute &&
      existingColorAttribute &&
      existingColorAttribute instanceof THREE.BufferAttribute
    ) {
      geometry.userData.originalColorAttribute = existingColorAttribute.clone();
    }

    if (mode === "rgb") {
      const originalColorAttribute = geometry.userData.originalColorAttribute;
      if (originalColorAttribute instanceof THREE.BufferAttribute) {
        geometry.setAttribute("color", originalColorAttribute.clone());
        material.vertexColors = true;
        material.color.set("#ffffff");
      } else {
        geometry.deleteAttribute("color");
        material.vertexColors = false;
        material.color.set("#f3c969");
      }
      geometry.userData.appliedPointCloudColorMode = mode;
      material.needsUpdate = true;
      return;
    }

    const scalarSourceMode =
      mode === "elevation" || geometry.getAttribute(mode) instanceof THREE.BufferAttribute
        ? mode
        : "elevation";
    const scalarAttribute =
      scalarSourceMode === "elevation"
        ? positionAttribute
        : (geometry.getAttribute(scalarSourceMode) as THREE.BufferAttribute);

    let minValue = Number.POSITIVE_INFINITY;
    let maxValue = Number.NEGATIVE_INFINITY;
    const scalarValues = new Float32Array(positionAttribute.count);

    for (let index = 0; index < positionAttribute.count; index += 1) {
      const scalarValue =
        scalarSourceMode === "elevation" ? positionAttribute.getY(index) : scalarAttribute.getX(index);
      scalarValues[index] = scalarValue;
      minValue = Math.min(minValue, scalarValue);
      maxValue = Math.max(maxValue, scalarValue);
    }

    const range = Math.max(maxValue - minValue, 1e-6);
    const colors = new Float32Array(positionAttribute.count * 3);
    const gradientColor = new THREE.Color();

    for (let index = 0; index < positionAttribute.count; index += 1) {
      const normalized = (scalarValues[index] - minValue) / range;
      gradientColor.setHSL((1 - normalized) * 0.65, 1, 0.5);
      const colorOffset = index * 3;
      colors[colorOffset] = gradientColor.r;
      colors[colorOffset + 1] = gradientColor.g;
      colors[colorOffset + 2] = gradientColor.b;
    }

    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.userData.appliedPointCloudColorMode = mode;
    material.vertexColors = true;
    material.color.set("#ffffff");
    material.needsUpdate = true;
  };

  const applyRootAppearanceSettings = () => {
    const root = rootRef.current;
    if (!root) return;

    const settings = viewerSettingsRef.current;

    root.traverse((object: THREE.Object3D) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = settings.showShadows;
        object.receiveShadow = settings.showShadows;

        const material = Array.isArray(object.material) ? object.material[0] : object.material;
        if (!material) return;

        const meshMaterial = material as THREE.Material & {
          wireframe?: boolean;
          transparent?: boolean;
          opacity?: number;
          needsUpdate?: boolean;
        };

        if ("wireframe" in meshMaterial) {
          meshMaterial.wireframe = settings.wireframe;
        }
        if ("opacity" in meshMaterial) {
          meshMaterial.transparent = settings.meshOpacity < 100;
          meshMaterial.opacity = settings.meshOpacity / 100;
        }
        meshMaterial.needsUpdate = true;
      }

      if (object instanceof THREE.Points) {
        const material = Array.isArray(object.material) ? object.material[0] : object.material;
        if (material instanceof THREE.PointsMaterial) {
          applyPointCloudColorMode(object, settings.colorMode);
          material.size = settings.pointSize;
          material.transparent = settings.meshOpacity < 100;
          material.opacity = settings.meshOpacity / 100;
          material.depthWrite = settings.meshOpacity === 100;
          material.needsUpdate = true;
        }
      }
    });
  };

  const applySceneSettings = () => {
    const settings = viewerSettingsRef.current;

    if (rendererRef.current) {
      rendererRef.current.setPixelRatio(
        Math.min(
          window.devicePixelRatio *
            (settings.renderQuality === "low"
              ? 0.7
              : settings.renderQuality === "medium"
                ? 1
                : settings.renderQuality === "high"
                  ? 1.25
                  : 1.5),
          2.5
        )
      );
      rendererRef.current.shadowMap.enabled = settings.showShadows;
      rendererRef.current.setClearColor(settings.backgroundColor);
    }

    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(settings.backgroundColor);
    }

    if (gridRef.current) {
      gridRef.current.visible = settings.showGrid;
    }

    if (axesRef.current) {
      axesRef.current.visible = settings.showAxes;
    }

    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = settings.lighting ? 0.8 : 0.15;
    }

    if (directionalLightRef.current) {
      directionalLightRef.current.intensity = settings.lighting ? 0.9 : 0;
      directionalLightRef.current.castShadow = settings.showShadows;
    }

    applyRootAppearanceSettings();

    if (activeCameraRef.current) {
      activeCameraRef.current.fov = settings.fieldOfView;
      activeCameraRef.current.updateProjectionMatrix();
    }

    if (activeControlsRef.current) {
      activeControlsRef.current.enabled = !(settings.showMeasurements && settings.measurementTool !== null);
    }
  };

  useEffect(() => {
    applySceneSettings();
  }, [
    backgroundColor,
    renderQuality,
    fieldOfView,
    pointSize,
    colorMode,
    meshOpacity,
    lighting,
    showGrid,
    showAxes,
    showShadows,
    wireframe,
    showMeasurements,
    measurementTool,
  ]);

  const distanceBetweenPoints = (first: MeasurementPoint, second: MeasurementPoint) => {
    const dx = second.x - first.x;
    const dy = second.y - first.y;
    const dz = second.z - first.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };

  const polygonAreaFromPoints = (points: MeasurementPoint[]) => {
    if (points.length < 3) return 0;

    let sum = 0;
    for (let index = 0; index < points.length; index += 1) {
      const current = points[index];
      const next = points[(index + 1) % points.length];
      if (!current || !next) continue;
      sum += current.x * next.z - next.x * current.z;
    }

    return Math.abs(sum) / 2;
  };

  const normalizePath = (value: string) => value.replace(/\//g, "\\").replace(/[\\/]+$/, "");

  const deriveProjectRootPathFromPlyPath = (filePath: string) => {
    const normalized = normalizePath(filePath);
    const parts = normalized.split("\\");
    const filterPointsIndex = parts.findIndex((part) => part.toLowerCase() === "odm_filterpoints");

    if (filterPointsIndex > 0) {
      return parts.slice(0, filterPointsIndex).join("\\");
    }

    return normalized.replace(/[\\/][^\\/]+$/, "");
  };

  const updateProjectRootPath = (filePath: string) => {
    setCurrentProjectRootPath(deriveProjectRootPathFromPlyPath(filePath));
  };

  const resetSaved3DViewStates = () => {
    saved3DViewStateRef.current = null;
  };

  const selectMeasurementTool = (tool: "distance" | "area") => {
    setShowMeasurements(true);
    setMeasurementTool((currentTool) => (currentTool === tool ? null : tool));
  };

  const handleShowMeasurementsChange = (nextValue: boolean) => {
    setShowMeasurements(nextValue);
    if (!nextValue) {
      setMeasurementTool(null);
    }
  };

  const captureAndSaveScreenshot = async () => {
    if (!hasElectronApi()) {
      setStatus("Electron bridge is unavailable. Start with \"npm run dev\".");
      return;
    }

    const rendererCanvas = threeContainerRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    if (!rendererCanvas) {
      setStatus("Screenshot unavailable.");
      return;
    }

    const projectRootPath = currentProjectRootPath || deriveProjectRootPathFromPlyPath(loadedFilePath);
    if (!projectRootPath) {
      setStatus("Project folder not found for screenshot.");
      return;
    }

    const timestamp = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    const fileName = `screenshot_${timestamp.getFullYear()}-${pad(timestamp.getMonth() + 1)}-${pad(timestamp.getDate())}_${pad(timestamp.getHours())}-${pad(timestamp.getMinutes())}-${pad(timestamp.getSeconds())}.png`;
    const screenshotPath = joinPath(joinPath(projectRootPath, "Screenshots"), fileName);

    try {
      setStatus("Saving screenshot...");
      const dataUrl = rendererCanvas.toDataURL("image/png");
      await window.electronAPI.saveScreenshot({ filePath: screenshotPath, dataUrl });
      setStatus(`Screenshot saved to Screenshots/${fileName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save screenshot.";
      setPlyError(message);
      setStatus(message);
    }
  };

  const setPresetView = (view: "top" | "front" | "right") => {
    const camera = activeCameraRef.current;
    const controls = activeControlsRef.current;
    if (!camera || !controls) return;

    const target = controls.target.clone();
    const distance = Math.max(camera.position.distanceTo(target), 1);
    const direction = new THREE.Vector3(0, 0, 1);

    if (view === "top") {
      direction.set(0, 1, 0);
      camera.up.set(0, 0, -1);
    } else if (view === "right") {
      direction.set(1, 0, 0);
      camera.up.set(0, 1, 0);
    } else {
      direction.set(0, 0, 1);
      camera.up.set(0, 1, 0);
    }

    camera.position.copy(target).addScaledVector(direction, distance);
    camera.lookAt(target);
    controls.target.copy(target);
    camera.updateProjectionMatrix();
    controls.update();

    saved3DViewStateRef.current = {
      position: [camera.position.x, camera.position.y, camera.position.z],
      quaternion: [camera.quaternion.x, camera.quaternion.y, camera.quaternion.z, camera.quaternion.w],
      target: [controls.target.x, controls.target.y, controls.target.z],
      zoom: camera.zoom,
    };
  };

  useEffect(() => {
    if (dataType === "3d") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      drawScene();
    };

    const drawScene = () => {
      // Clear canvas
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (dataType === "orthophoto") {
        drawOrthophoto(ctx, canvas.width, canvas.height);
      } else if (dataType === "ndvi") {
        drawNDVI(ctx, canvas.width, canvas.height);
      }
    };

    const drawOrthophoto = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      if (rasterImageRef.current) {
        const image = rasterImageRef.current;
        const scale = Math.min(width / image.width, height / image.height);
        const drawWidth = image.width * scale;
        const drawHeight = image.height * scale;
        const x = (width - drawWidth) / 2;
        const y = (height - drawHeight) / 2;

        ctx.drawImage(image, x, y, drawWidth, drawHeight);
        return;
      }

      // Draw mock orthophoto
      const gridSize = 50;
      const offsetX = (width % gridSize) / 2;
      const offsetY = (height % gridSize) / 2;

      for (let y = 0; y < height; y += gridSize) {
        for (let x = 0; x < width; x += gridSize) {
          const brightness = Math.floor(Math.random() * 100) + 100;
          ctx.fillStyle = `rgb(${brightness - 20}, ${brightness}, ${brightness - 40})`;
          ctx.fillRect(x + offsetX, y + offsetY, gridSize, gridSize);
        }
      }

      // Add some features
      ctx.fillStyle = "#6b7280";
      ctx.fillRect(width * 0.3, height * 0.4, 100, 150);
      ctx.fillRect(width * 0.6, height * 0.3, 80, 120);

      // Add overlay text
      ctx.fillStyle = "rgba(16, 185, 129, 0.1)";
      ctx.fillRect(20, 20, 200, 60);
      ctx.fillStyle = "#10b981";
      ctx.font = "14px sans-serif";
      ctx.fillText("Orthophoto View", 30, 45);
      ctx.fillText("Scale: 1:500", 30, 65);
    };

    const drawNDVI = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      if (rasterImageRef.current) {
        const image = rasterImageRef.current;
        const scale = Math.min(width / image.width, height / image.height);
        const drawWidth = image.width * scale;
        const drawHeight = image.height * scale;
        const x = (width - drawWidth) / 2;
        const y = (height - drawHeight) / 2;

        ctx.drawImage(image, x, y, drawWidth, drawHeight);

        ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
        ctx.fillRect(16, 16, 280, 36);
        ctx.fillStyle = "#ffffff";
        ctx.font = "13px sans-serif";
        ctx.fillText("Imported raster preview (NDVI palette not computed)", 24, 39);
        return;
      }

      // Draw NDVI heat map
      const gridSize = 40;
      const colors = [
        "#8B0000", // Dark red (low vegetation)
        "#FF4500", // Orange-red
        "#FFA500", // Orange
        "#FFFF00", // Yellow
        "#9ACD32", // Yellow-green
        "#32CD32", // Lime green
        "#228B22", // Forest green
        "#006400", // Dark green (high vegetation)
      ];

      for (let y = 0; y < height; y += gridSize) {
        for (let x = 0; x < width; x += gridSize) {
          const colorIndex = Math.floor(Math.random() * colors.length);
          ctx.fillStyle = colors[colorIndex];
          ctx.fillRect(x, y, gridSize, gridSize);
        }
      }

      // Add legend
      const legendX = width - 120;
      const legendY = 40;
      const legendHeight = 200;
      const legendWidth = 30;

      // Draw gradient legend
      const gradient = ctx.createLinearGradient(0, legendY, 0, legendY + legendHeight);
      gradient.addColorStop(0, "#006400");
      gradient.addColorStop(0.33, "#32CD32");
      gradient.addColorStop(0.66, "#FFA500");
      gradient.addColorStop(1, "#8B0000");

      ctx.fillStyle = gradient;
      ctx.fillRect(legendX, legendY, legendWidth, legendHeight);

      // Legend border
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

      // Legend labels
      ctx.fillStyle = "#ffffff";
      ctx.font = "12px sans-serif";
      ctx.fillText("High", legendX + legendWidth + 10, legendY + 10);
      ctx.fillText("Low", legendX + legendWidth + 10, legendY + legendHeight);

      // Add overlay text
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(20, 20, 180, 80);
      ctx.fillStyle = "#ffffff";
      ctx.font = "14px sans-serif";
      ctx.fillText("NDVI Analysis", 30, 45);
      ctx.fillText("Mean: 0.68", 30, 65);
      ctx.fillText("Range: 0.21 - 0.89", 30, 85);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [backgroundColor, dataType, rasterRevision]);

  useEffect(() => {
    const container = threeContainerRef.current;
    if (!container) return;

    let animationFrame = 0;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    rendererRef.current = renderer;
    renderer.shadowMap.enabled = viewerSettingsRef.current.showShadows;
    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio *
          (viewerSettingsRef.current.renderQuality === "low"
            ? 0.7
            : viewerSettingsRef.current.renderQuality === "medium"
              ? 1
              : viewerSettingsRef.current.renderQuality === "high"
                ? 1.25
                : 1.5),
        2.5
      )
    );
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(viewerSettingsRef.current.backgroundColor);

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(viewerSettingsRef.current.backgroundColor);

    const aspect = container.clientWidth / Math.max(container.clientHeight, 1);
    const camera = new THREE.PerspectiveCamera(fieldOfView, aspect, 0.01, 100000);

    camera.position.set(0, 0, 4);

    camera.fov = fieldOfView;
    camera.updateProjectionMatrix();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);
    activeCameraRef.current = camera;
    activeControlsRef.current = controls;

    const savedView = saved3DViewStateRef.current;
    if (savedView) {
      camera.position.set(...savedView.position);
      camera.quaternion.set(...savedView.quaternion);
      camera.zoom = savedView.zoom;
      controls.target.set(...savedView.target);
      camera.updateProjectionMatrix();
      controls.update();
    }

    const grid = new THREE.GridHelper(20, 20, 0x374151, 0x374151);
    gridRef.current = grid;
    grid.visible = viewerSettingsRef.current.showGrid;
    scene.add(grid);

    const axes = new THREE.AxesHelper(4);
    axesRef.current = axes;
    axes.visible = viewerSettingsRef.current.showAxes;
    scene.add(axes);

    const ambientLight = new THREE.AmbientLight("#ffffff", viewerSettingsRef.current.lighting ? 0.8 : 0.15);
    ambientLightRef.current = ambientLight;
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight("#8cc9ff", viewerSettingsRef.current.lighting ? 0.9 : 0);
    directionalLightRef.current = dirLight;
    dirLight.position.set(3, 4, 5);
    dirLight.castShadow = viewerSettingsRef.current.showShadows;
    scene.add(dirLight);

    const root = new THREE.Group();
    rootRef.current = root;
    scene.add(root);

    if (sceneObject) {
      const imported = sceneObject.clone(true);

      // Clone materials/geometries so renderer cleanup won't mutate imported source references.
      imported.traverse((object: THREE.Object3D) => {
        if (!(object instanceof THREE.Mesh || object instanceof THREE.Points)) return;

        object.geometry = object.geometry.clone();
        if (Array.isArray(object.material)) {
          object.material = object.material.map((material) => material.clone());
        } else {
          object.material = object.material.clone();
        }

        if (object instanceof THREE.Mesh) {
          const material = Array.isArray(object.material) ? object.material[0] : object.material;
          const meshMaterial = material as THREE.Material & {
            wireframe?: boolean;
            transparent?: boolean;
            opacity?: number;
            needsUpdate?: boolean;
          };
          if ("wireframe" in meshMaterial) {
            meshMaterial.wireframe = viewerSettingsRef.current.wireframe;
          }
          if ("opacity" in meshMaterial) {
            meshMaterial.transparent = viewerSettingsRef.current.meshOpacity < 100;
            meshMaterial.opacity = viewerSettingsRef.current.meshOpacity / 100;
          }
          meshMaterial.needsUpdate = true;
          object.castShadow = viewerSettingsRef.current.showShadows;
          object.receiveShadow = viewerSettingsRef.current.showShadows;
        }

        if (object instanceof THREE.Points) {
          const material = Array.isArray(object.material) ? object.material[0] : object.material;
          if (material instanceof THREE.PointsMaterial) {
            material.size = viewerSettingsRef.current.pointSize;
            material.transparent = viewerSettingsRef.current.meshOpacity < 100;
            material.opacity = viewerSettingsRef.current.meshOpacity / 100;
          }
        }
      });

      root.add(imported);
    } else {
      const colorAttribute = plyGeometry?.getAttribute("color") as THREE.BufferAttribute | undefined;
      const hasVertexColors = Boolean(colorAttribute);
      let geometry = plyGeometry?.clone();

      if (!geometry) {
        if (viewMode === "pointcloud") {
          const positions = new Float32Array(12000);
          for (let i = 0; i < positions.length; i += 3) {
            positions[i] = (Math.random() - 0.5) * 8;
            positions[i + 1] = (Math.random() - 0.5) * 8;
            positions[i + 2] = (Math.random() - 0.5) * 8;
          }
          geometry = new THREE.BufferGeometry();
          geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        } else {
          geometry = new THREE.TorusKnotGeometry(1.7, 0.45, 220, 32);
        }
      }

      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();

      if (effective3DViewMode === "pointcloud") {
        const pointsMaterial = new THREE.PointsMaterial({
          size: viewerSettingsRef.current.pointSize,
          sizeAttenuation: true,
          color: hasVertexColors ? "#ffffff" : "#f3c969",
          vertexColors: hasVertexColors,
          transparent: viewerSettingsRef.current.meshOpacity < 100,
          opacity: viewerSettingsRef.current.meshOpacity / 100,
        });
        root.add(new THREE.Points(geometry, pointsMaterial));
      } else {
        if (!geometry.getAttribute("normal")) {
          geometry.computeVertexNormals();
        }

        const meshMaterial = new THREE.MeshStandardMaterial({
          color: hasVertexColors ? 0xffffff : 0x9ca3af,
          vertexColors: hasVertexColors,
          wireframe: viewerSettingsRef.current.wireframe,
          transparent: viewerSettingsRef.current.meshOpacity < 100,
          opacity: viewerSettingsRef.current.meshOpacity / 100,
        });

        const mesh = new THREE.Mesh(geometry, meshMaterial);
        mesh.castShadow = viewerSettingsRef.current.showShadows;
        mesh.receiveShadow = viewerSettingsRef.current.showShadows;
        root.add(mesh);
      }
    }

    const fitToObject = () => {
      const box = new THREE.Box3().setFromObject(root);
      if (box.isEmpty()) return;

      const target = box.getCenter(new THREE.Vector3());
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      const radius = Math.max(sphere.radius, 1e-6);

      controls.target.copy(target);
      const distance = Math.max(radius * 2.8, 1);
      camera.position.set(target.x, target.y, target.z + distance);

      // Keep clipping planes proportional to data scale to avoid clipped or invisible clouds.
      camera.near = Math.max(radius / 200, 0.001);
      camera.far = Math.max(radius * 100, 1000);

      camera.updateProjectionMatrix();
    };

    if (!savedView) {
      fitToObject();
    }

    measurementPlaneYRef.current = controls.target.y;

    camera.fov = fieldOfView;
    camera.updateProjectionMatrix();

    const measurementCanvas = measurementCanvasRef.current;
    const measurementCtx = measurementCanvas?.getContext("2d");

    const resizeMeasurementCanvas = () => {
      if (!measurementCanvas) return;
      measurementCanvas.width = container.clientWidth;
      measurementCanvas.height = container.clientHeight;
    };

    resizeMeasurementCanvas();

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const worldPointToScreen = (point: MeasurementPoint) => {
      const projected = new THREE.Vector3(point.x, point.y, point.z).project(camera);
      return {
        x: (projected.x * 0.5 + 0.5) * container.clientWidth,
        y: (-projected.y * 0.5 + 0.5) * container.clientHeight,
      };
    };

    const drawLabel = (ctx: CanvasRenderingContext2D, x: number, y: number, text: string) => {
      ctx.font = "12px sans-serif";
      const paddingX = 6;
      const metrics = ctx.measureText(text);
      const boxWidth = metrics.width + paddingX * 2;
      const boxHeight = 18;
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.fillText(text, x - metrics.width / 2, y + 4);
    };

    const drawMeasurementOverlay = () => {
      if (!measurementCtx || !measurementCanvas) return;

      const settings = viewerSettingsRef.current;
      if (!settings.showMeasurements) {
        measurementCtx.clearRect(0, 0, measurementCanvas.width, measurementCanvas.height);
        return;
      }

      const width = measurementCanvas.width;
      const height = measurementCanvas.height;
      measurementCtx.clearRect(0, 0, width, height);

      const strokeColor = "#f97316";
      const pointColor = "#ffffff";

      const drawPolyline = (points: MeasurementPoint[], closePath = false) => {
        if (points.length === 0) return;

        const screenPoints = points.map(worldPointToScreen);

        measurementCtx.strokeStyle = strokeColor;
        measurementCtx.fillStyle = pointColor;
        measurementCtx.lineWidth = 2;
        measurementCtx.beginPath();
        screenPoints.forEach((screenPoint, index) => {
          if (index === 0) {
            measurementCtx.moveTo(screenPoint.x, screenPoint.y);
          } else {
            measurementCtx.lineTo(screenPoint.x, screenPoint.y);
          }
        });
        if (closePath && screenPoints.length > 2) {
          measurementCtx.lineTo(screenPoints[0]!.x, screenPoints[0]!.y);
        }
        measurementCtx.stroke();

        screenPoints.forEach((screenPoint) => {
          measurementCtx.beginPath();
          measurementCtx.arc(screenPoint.x, screenPoint.y, 4, 0, Math.PI * 2);
          measurementCtx.fill();
        });

        return screenPoints;
      };

      if (settings.distancePoints.length === 1) {
        drawPolyline(settings.distancePoints, false);
      }

      if (settings.distancePoints.length === 2) {
        const screenPoints = drawPolyline(settings.distancePoints, false);
        if (screenPoints && screenPoints.length === 2) {
          const [startPoint, endPoint] = screenPoints;
          const midX = (startPoint.x + endPoint.x) / 2;
          const midY = (startPoint.y + endPoint.y) / 2;
          drawLabel(measurementCtx, midX, midY - 14, `${distanceBetweenPoints(settings.distancePoints[0]!, settings.distancePoints[1]!).toFixed(2)} m`);
        }
      }

      if (settings.areaPoints.length > 0) {
        const screenPoints = drawPolyline(settings.areaPoints, settings.areaPoints.length >= 3);
        if (screenPoints && screenPoints.length >= 2) {
          for (let index = 0; index < settings.areaPoints.length; index += 1) {
            const current = settings.areaPoints[index];
            const next = settings.areaPoints[(index + 1) % settings.areaPoints.length];
            if (!current || !next) continue;

            const start = screenPoints[index]!;
            const end = screenPoints[(index + 1) % screenPoints.length]!;
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;
            drawLabel(measurementCtx, midX, midY - 12, `${distanceBetweenPoints(current, next).toFixed(2)} m`);
          }
        }

        if (settings.areaPoints.length >= 3) {
          const areaLabel = `${polygonAreaFromPoints(settings.areaPoints).toFixed(2)} m²`;
          const centroid = settings.areaPoints.reduce(
            (accumulator, point) => ({
              x: accumulator.x + point.x,
              y: accumulator.y + point.y,
              z: accumulator.z + point.z,
            }),
            { x: 0, y: 0, z: 0 }
          );
          centroid.x /= settings.areaPoints.length;
          centroid.y /= settings.areaPoints.length;
          centroid.z /= settings.areaPoints.length;
          const centroidScreen = worldPointToScreen(centroid);
          drawLabel(measurementCtx, centroidScreen.x, centroidScreen.y, areaLabel);
        }
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const settings = viewerSettingsRef.current;
      if (dataType !== "3d" || !settings.measurementTool) return;
      if (event.button !== 0) return;

      const rect = container.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
      raycaster.setFromCamera(pointer, camera);

      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -measurementPlaneYRef.current);
      const intersection = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(plane, intersection)) return;

      const point: MeasurementPoint = { x: intersection.x, y: intersection.y, z: intersection.z };

      if (settings.measurementTool === "distance") {
        setDistancePoints((previousPoints) => {
          if (previousPoints.length >= 2) {
            return [point];
          }

          return [...previousPoints, point];
        });
      }

      if (settings.measurementTool === "area") {
        setAreaPoints((previousPoints) => [...previousPoints, point]);
      }
    };

    const removeClosestPointAtScreenPosition = (clientX: number, clientY: number) => {
      const settings = viewerSettingsRef.current;
      if (!settings.measurementTool) return;

      const rect = container.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const clickY = clientY - rect.top;
      const maxDistancePx = 12;
      const maxDistanceSq = maxDistancePx * maxDistancePx;

      const points = settings.measurementTool === "distance" ? settings.distancePoints : settings.areaPoints;
      if (points.length === 0) return;

      let nearestIndex = -1;
      let nearestDistanceSq = Number.POSITIVE_INFINITY;

      points.forEach((point, index) => {
        const screenPoint = worldPointToScreen(point);
        const dx = screenPoint.x - clickX;
        const dy = screenPoint.y - clickY;
        const distanceSq = dx * dx + dy * dy;

        if (distanceSq <= maxDistanceSq && distanceSq < nearestDistanceSq) {
          nearestDistanceSq = distanceSq;
          nearestIndex = index;
        }
      });

      if (nearestIndex < 0) return;

      if (settings.measurementTool === "distance") {
        setDistancePoints((previousPoints) => previousPoints.filter((_, index) => index !== nearestIndex));
      } else {
        setAreaPoints((previousPoints) => previousPoints.filter((_, index) => index !== nearestIndex));
      }
    };

    const handleContextMenu = (event: MouseEvent) => {
      const settings = viewerSettingsRef.current;
      if (dataType !== "3d" || !settings.measurementTool) return;

      event.preventDefault();
      removeClosestPointAtScreenPosition(event.clientX, event.clientY);
    };

    container.addEventListener("pointerdown", handlePointerDown);
    container.addEventListener("contextmenu", handleContextMenu);

    const handleResize = () => {
      const width = container.clientWidth;
      const height = Math.max(container.clientHeight, 1);
      const nextAspect = width / height;

      renderer.setSize(width, height);
      resizeMeasurementCanvas();

      camera.aspect = nextAspect;

      camera.updateProjectionMatrix();
    };

    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      drawMeasurementOverlay();
      animationFrame = window.requestAnimationFrame(animate);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    resizeObserver.observe(container);
    window.addEventListener("resize", handleResize);
    animate();

    return () => {
      saved3DViewStateRef.current = {
        position: [camera.position.x, camera.position.y, camera.position.z],
        quaternion: [camera.quaternion.x, camera.quaternion.y, camera.quaternion.z, camera.quaternion.w],
        target: [controls.target.x, controls.target.y, controls.target.z],
        zoom: camera.zoom,
      };

      container.removeEventListener("pointerdown", handlePointerDown);
      container.removeEventListener("contextmenu", handleContextMenu);
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      window.cancelAnimationFrame(animationFrame);
      controls.dispose();

      if (activeCameraRef.current === camera) {
        activeCameraRef.current = null;
      }
      if (activeControlsRef.current === controls) {
        activeControlsRef.current = null;
      }

      scene.traverse((object: THREE.Object3D) => {
        if (!(object instanceof THREE.Mesh || object instanceof THREE.Points)) return;

        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((material: THREE.Material) => material.dispose());
        } else {
          object.material.dispose();
        }
      });

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [dataType, plyGeometry, sceneObject, effective3DViewMode]);

  useEffect(() => {
    const camera = activeCameraRef.current;
    if (!camera) return;

    camera.fov = fieldOfView;
    camera.updateProjectionMatrix();
  }, [fieldOfView]);

  useEffect(() => {
    if (!isViewerFullscreen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsViewerFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isViewerFullscreen]);

  const loadPlyFromFile = (file: File) => {
    setIsLoadingPly(true);
    setPlyError("");
    setStatus("Loading .ply file...");

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const buffer = reader.result;
        if (!(buffer instanceof ArrayBuffer)) {
          throw new Error("Unsupported file data");
        }

        const geometry = plyLoader.parse(buffer);

        if (!geometry.getAttribute("position")) {
          throw new Error("No vertex positions found in PLY file.");
        }

        swapYAndZInGeometry(geometry);

        geometry.computeVertexNormals();
        const positions = geometry.getAttribute("position");

        setPlyGeometry(geometry);
        setSceneObject(null);
        resetSaved3DViewStates();
        autoCapturedProjectIconIdRef.current = null;
        setMeasurementTool(null);
        setDistancePoints([]);
        setAreaPoints([]);
        setViewMode("pointcloud");
        setPlyName(file.name);
        setLoadedFilePath((file as File & { path?: string }).path || file.name);
        setPointCount(positions.count);
        setStatus("Loaded successfully");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Cannot parse this PLY file.";
        setPlyError(message);
        setStatus(message);
      } finally {
        setIsLoadingPly(false);
      }
    };

    reader.onerror = () => {
      const message = "Cannot read the selected file.";
      setPlyError(message);
      setStatus(message);
      setIsLoadingPly(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const loadPlyFromPath = async (filePath: string) => {
    if (!hasElectronApi()) {
      const message = 'Electron bridge is unavailable. Start with "npm run dev".';
      setPlyError(message);
      setStatus(message);
      return;
    }

    try {
      setIsLoadingPly(true);
      setPlyError("");
      setStatus("Loading .ply file...");

      const arrayBuffer = await window.electronAPI.readPlyFile(filePath);
      const geometry = plyLoader.parse(arrayBuffer);

      if (!geometry.getAttribute("position")) {
        throw new Error("The selected PLY file does not contain point positions.");
      }

      swapYAndZInGeometry(geometry);

      geometry.computeVertexNormals();
      const positions = geometry.getAttribute("position");

      setPlyGeometry(geometry);
      setSceneObject(null);
      resetSaved3DViewStates();
      autoCapturedProjectIconIdRef.current = null;
      setMeasurementTool(null);
      setDistancePoints([]);
      setAreaPoints([]);
      setViewMode("pointcloud");
      setPointCount(positions.count);
      setStatus("Loaded successfully");

      const chunks = filePath.split(/[\\/]/);
      setPlyName(chunks[chunks.length - 1] || filePath);
      setLoadedFilePath(filePath);
      updateProjectRootPath(filePath);
      updateProjectRootPath(filePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load the .ply file.";
      setPlyError(message);
      setStatus(message);
    } finally {
      setIsLoadingPly(false);
    }
  };

  const joinPath = (basePath: string, child: string) => {
    const normalizedBase = basePath.replace(/[\\/]+$/, "");
    return `${normalizedBase}\\${child}`;
  };

  type DirectoryEntry = {
    name: string;
    path: string;
    isDirectory: boolean;
    size: number;
    type: string;
  };

  const readDirectoryEntries = async (dirPath: string): Promise<DirectoryEntry[]> => {
    if (!hasElectronApi()) return [];

    const payload = await window.electronAPI.readDirectory(dirPath);

    if (
      payload &&
      typeof payload === "object" &&
      !Array.isArray(payload) &&
      "error" in payload
    ) {
      return [];
    }

    if (!Array.isArray(payload)) {
      return [];
    }

    return payload as DirectoryEntry[];
  };

  const findPointCloudPly = async (projectRootPath: string): Promise<string | null> => {
    // Fast path: expected output location.
    const directFolderPath = joinPath(projectRootPath, "odm_filterpoints");
    const directEntries = await readDirectoryEntries(directFolderPath);
    const directPly = directEntries.find(
      (entry) => !entry.isDirectory && entry.name.toLowerCase() === "point_cloud.ply"
    );
    if (directPly) return directPly.path;

    // Fallback: recursive scan to locate odm_filterpoints/point_cloud.ply anywhere in project tree.
    const maxDepth = 6;
    const queue: Array<{ path: string; depth: number }> = [{ path: projectRootPath, depth: 0 }];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;

      const entries = await readDirectoryEntries(current.path);

      for (const entry of entries) {
        if (entry.isDirectory) {
          const isFilterPoints = entry.name.toLowerCase() === "odm_filterpoints";
          if (isFilterPoints) {
            const filterEntries = await readDirectoryEntries(entry.path);
            const pointCloud = filterEntries.find(
              (candidate) => !candidate.isDirectory && candidate.name.toLowerCase() === "point_cloud.ply"
            );
            if (pointCloud) return pointCloud.path;
          }

          if (current.depth < maxDepth) {
            queue.push({ path: entry.path, depth: current.depth + 1 });
          }
        }
      }
    }

    return null;
  };

  useEffect(() => {
    const autoLoadProjectPointCloud = async () => {
      if (dataType !== "3d") return;
      if (!projectId || projectId.trim().length === 0) return;
      if (lastAutoLoadedProjectIdRef.current === projectId) return;

      const currentUser = auth.currentUser;
      if (!currentUser?.uid) return;

      try {
        setIsLoadingPly(true);
        setPlyError("");

        const projectsRef = collection(db, "Users", currentUser.uid, "Projects");
        const projectQuery = query(projectsRef, where("projectId", "==", projectId), limit(1));
        const projectSnapshot = await getDocs(projectQuery);

        if (projectSnapshot.empty) {
          setPlyError("Project not found.");
          setStatus("Project not found.");
          return;
        }

        const projectData = projectSnapshot.docs[0].data() as {
          projectPath?: string;
          basePath?: string;
        };

        const projectRootPath = (projectData.projectPath || projectData.basePath || "").trim();
        if (!projectRootPath) {
          setPlyError("Project output path is not set.");
          setStatus("Project output path is not set.");
          return;
        }

        setCurrentProjectRootPath(projectRootPath);

        const plyPath = await findPointCloudPly(projectRootPath);

        if (!plyPath) {
          setPlyError("Could not find odm_filterpoints/point_cloud.ply in this project.");
          setStatus("Could not find odm_filterpoints/point_cloud.ply in this project.");
          return;
        }

        await loadPlyFromPath(plyPath);
        lastAutoLoadedProjectIdRef.current = projectId;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to auto-load point cloud.";
        setPlyError(message);
        setStatus(message);
      } finally {
        setIsLoadingPly(false);
      }
    };

    void autoLoadProjectPointCloud();
  }, [dataType, projectId]);

  useEffect(() => {
    if (dataType !== "3d") return;
    if (!projectId || projectId.trim().length === 0) return;
    if (autoCapturedProjectIconIdRef.current === projectId) return;
    if (isLoadingPly) return;
    if (!plyGeometry && !sceneObject) return;

    let canceled = false;

    const captureTopViewAsProjectIcon = async (attempt = 0): Promise<void> => {
      if (canceled) return;

      const currentUser = auth.currentUser;
      if (!currentUser?.uid || !hasElectronApi()) return;

      const rendererCanvas = threeContainerRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
      const camera = activeCameraRef.current;
      const controls = activeControlsRef.current;

      const projectRootPath = currentProjectRootPath || (loadedFilePath ? deriveProjectRootPathFromPlyPath(loadedFilePath) : "");

      if (!rendererCanvas || !camera || !controls || !projectRootPath) {
        if (attempt < 10) {
          window.setTimeout(() => {
            void captureTopViewAsProjectIcon(attempt + 1);
          }, 150);
        }
        return;
      }

      const previousView = {
        position: camera.position.clone(),
        quaternion: camera.quaternion.clone(),
        up: camera.up.clone(),
        zoom: camera.zoom,
        target: controls.target.clone(),
      };

      try {
        const distance = Math.max(camera.position.distanceTo(controls.target), 1);
        camera.up.set(0, 0, -1);
        camera.position.copy(controls.target).addScaledVector(new THREE.Vector3(0, 1, 0), distance);
        camera.lookAt(controls.target);
        camera.updateProjectionMatrix();
        controls.update();

        await new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve());
          });
        });

        const iconPath = joinPath(projectRootPath, "project-icon.png");
        const dataUrl = rendererCanvas.toDataURL("image/png");
        await window.electronAPI.saveScreenshot({ filePath: iconPath, dataUrl });

        const projectsRef = collection(db, "Users", currentUser.uid, "Projects");
        const projectQuery = query(projectsRef, where("projectId", "==", projectId), limit(1));
        const projectSnapshot = await getDocs(projectQuery);

        if (!projectSnapshot.empty) {
          await setDoc(
            projectSnapshot.docs[0].ref,
            {
              projectIconPath: iconPath,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }

        autoCapturedProjectIconIdRef.current = projectId;
      } catch (error) {
        console.error("Failed to auto-capture project icon", error);
      } finally {
        camera.position.copy(previousView.position);
        camera.quaternion.copy(previousView.quaternion);
        camera.up.copy(previousView.up);
        camera.zoom = previousView.zoom;
        controls.target.copy(previousView.target);
        camera.updateProjectionMatrix();
        controls.update();

        saved3DViewStateRef.current = {
          position: [camera.position.x, camera.position.y, camera.position.z],
          quaternion: [camera.quaternion.x, camera.quaternion.y, camera.quaternion.z, camera.quaternion.w],
          target: [controls.target.x, controls.target.y, controls.target.z],
          zoom: camera.zoom,
        };
      }
    };

    void captureTopViewAsProjectIcon();

    return () => {
      canceled = true;
    };
  }, [dataType, projectId, isLoadingPly, currentProjectRootPath, loadedFilePath, plyGeometry, sceneObject]);

  const loadObjFromFile = (file: File) => {
    setIsLoadingPly(true);
    setPlyError("");

    const objectUrl = URL.createObjectURL(file);
    const loader = new OBJLoader();

    loader.load(
      objectUrl,
      (object) => {
        setSceneObject(object);
        setPlyGeometry(null);
        resetSaved3DViewStates();
        autoCapturedProjectIconIdRef.current = null;
        setMeasurementTool(null);
        setDistancePoints([]);
        setAreaPoints([]);
        setPlyName(file.name);
        setLoadedFilePath((file as File & { path?: string }).path || file.name);
        setIsLoadingPly(false);
        URL.revokeObjectURL(objectUrl);
      },
      undefined,
      (error) => {
        setPlyError(error instanceof Error ? error.message : "Cannot load this OBJ file.");
        setIsLoadingPly(false);
        URL.revokeObjectURL(objectUrl);
      }
    );
  };

  const loadGltfFromFile = (file: File) => {
    setIsLoadingPly(true);
    setPlyError("");

    const objectUrl = URL.createObjectURL(file);
    const loader = new GLTFLoader();

    loader.load(
      objectUrl,
      (gltf) => {
        setSceneObject(gltf.scene);
        setPlyGeometry(null);
        resetSaved3DViewStates();
        autoCapturedProjectIconIdRef.current = null;
        setMeasurementTool(null);
        setDistancePoints([]);
        setAreaPoints([]);
        setPlyName(file.name);
        setLoadedFilePath((file as File & { path?: string }).path || file.name);
        setIsLoadingPly(false);
        URL.revokeObjectURL(objectUrl);
      },
      undefined,
      (error) => {
        setPlyError(error instanceof Error ? error.message : "Cannot load this GLTF/GLB file.");
        setIsLoadingPly(false);
        URL.revokeObjectURL(objectUrl);
      }
    );
  };

  const loadRasterFromFile = (file: File) => {
    setIsLoadingPly(true);
    setPlyError("");

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      rasterImageRef.current = image;
      setRasterName(file.name);
      setRasterRevision((value) => value + 1);
      setIsLoadingPly(false);
      URL.revokeObjectURL(objectUrl);
    };

    image.onerror = () => {
      setPlyError("This image format is not supported for preview.");
      setIsLoadingPly(false);
      URL.revokeObjectURL(objectUrl);
    };

    image.src = objectUrl;
  };

  const importFile = (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase() || "";

    if (dataType === "3d") {
      if (extension === "ply") {
        const electronPath = (file as File & { path?: string }).path;
        if (electronPath) {
          void loadPlyFromPath(electronPath);
          return;
        }

        loadPlyFromFile(file);
        return;
      }

      if (extension === "obj") {
        loadObjFromFile(file);
        return;
      }

      if (extension === "glb" || extension === "gltf") {
        loadGltfFromFile(file);
        return;
      }

      setPlyError("Unsupported 3D format. Use .ply, .obj, .glb or .gltf");
      setStatus("Unsupported 3D format. Use .ply, .obj, .glb or .gltf");
      return;
    }

    loadRasterFromFile(file);
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragActive(true);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragActive(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    dragDepthRef.current = 0;
    setIsDragActive(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const droppedPath = (file as File & { path?: string }).path;

    if (dataType === "3d" && extension === "ply" && droppedPath) {
      void loadPlyFromPath(droppedPath);
      return;
    }

    importFile(file);
  };

  const shouldShowOpenProjectPrompt =
    !projectId &&
    !loadedFilePath &&
    !plyGeometry &&
    !sceneObject &&
    !isLoadingPly &&
    dataType === "3d";

  if (shouldShowOpenProjectPrompt) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#0a0e14] p-6">
        <div className="max-w-md w-full rounded-xl border border-border bg-card/95 p-8 text-center shadow-xl">
          <h2 className="text-xl font-semibold mb-2">Open a project first</h2>
          <p className="text-sm text-muted-foreground mb-6">
            You need to open a project before accessing the viewer.
          </p>
          <button
            type="button"
            onClick={() => navigate("/openproject")}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            Go to Open Project
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex ${isViewerFullscreen ? "fixed inset-0 z-50 bg-[#0a0e14]" : ""}`}>
      {/* Main Viewer - Fixed */}
      <div
        className={`flex flex-col relative bg-[#0a0e14] ${isViewerFullscreen ? "w-full h-full" : "flex-1"}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Toolbar */}
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          {dataType === "3d" && (
            <>
              <Tabs.Root value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                <Tabs.List className="flex bg-card border border-border rounded-lg p-1">
                  <Tabs.Trigger
                    value="pointcloud"
                    className="px-4 py-2 text-sm rounded transition-colors data-[state=active]:bg-primary data-[state=active]:text-white"
                  >
                    Point Cloud
                  </Tabs.Trigger>
                </Tabs.List>
              </Tabs.Root>

              <div className="flex bg-card border border-border rounded-lg p-1">
                <IconButton
                  icon={Grid3x3}
                  active={wireframe}
                  onClick={() => setWireframe(!wireframe)}
                  tooltip="Wireframe"
                />
                <IconButton
                  icon={Lightbulb}
                  active={lighting}
                  onClick={() => setLighting(!lighting)}
                  tooltip="Lighting"
                />
                <IconButton
                  icon={RotateCcw}
                  onClick={() => {
                    setDataType("3d");
                    setViewMode("pointcloud");
                    setWireframe(false);
                    setShowGrid(true);
                    setLighting(true);
                    setShowAxes(true);
                    setShowShadows(false);
                    setAmbientOcclusion(false);
                    setShowMeasurements(false);
                    setBackgroundColor("#071126");
                    setRenderQuality("high");
                    setPointSize(0.02);
                    setColorMode("rgb");
                    setMeshOpacity(100);
                    setMeasurementTool(null);
                    setDistancePoints([]);
                    setAreaPoints([]);
                  }}
                  tooltip="Reset View"
                />
              </div>
            </>
          )}
        </div>

        {/* View Controls */}
        {dataType === "3d" && (
          <div className="absolute top-4 right-4 z-10">
            <div className="bg-card border border-border rounded-lg p-1">
              <ViewCube onSelectView={setPresetView} />
            </div>
          </div>
        )}

        {isViewerFullscreen && (
          <div className="absolute bottom-4 right-4 z-30">
            <button
              type="button"
              onClick={() => setIsViewerFullscreen(false)}
              className="rounded-lg border border-border bg-card/95 px-4 py-2 text-sm shadow-lg hover:bg-accent"
            >
              Exit Fullscreen
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="absolute bottom-20 left-4 z-10 bg-card/90 backdrop-blur border border-border rounded-lg px-4 py-2">
          <div className="flex items-center gap-6 text-xs">
            {dataType === "3d" ? (
              <>
                <div>
                  <span className="text-muted-foreground">Vertices: </span>
                  <span>{pointCount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">File: </span>
                  <span>{plyName}</span>
                </div>
                <div className="max-w-[320px] truncate" title={loadedFilePath}>
                  <span className="text-muted-foreground">Path: </span>
                  <span>{loadedFilePath || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status: </span>
                  <span>{status}</span>
                </div>
              </>
            ) : dataType === "orthophoto" ? (
              <>
                <div>
                  <span className="text-muted-foreground">Resolution: </span>
                  <span>2.5 cm/px</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Area: </span>
                  <span>4.2 hectares</span>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className="text-muted-foreground">Mean NDVI: </span>
                  <span>0.68</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Std Dev: </span>
                  <span>0.12</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Data Type Switcher - Bottom Center */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <div className="flex bg-card/95 backdrop-blur border border-border rounded-lg p-1 shadow-lg">
            <button
              onClick={() => setDataType("3d")}
              className={`px-6 py-2.5 rounded-lg flex items-center gap-2 transition-all ${
                dataType === "3d"
                  ? "bg-primary text-white shadow-lg"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <Cuboid className="w-5 h-5" />
              <span className="text-sm font-medium">3D Model</span>
            </button>
            <button
              onClick={() => setDataType("orthophoto")}
              className={`px-6 py-2.5 rounded-lg flex items-center gap-2 transition-all ${
                dataType === "orthophoto"
                  ? "bg-primary text-white shadow-lg"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <Map className="w-5 h-5" />
              <span className="text-sm font-medium">Orthophoto</span>
            </button>
            <button
              onClick={() => setDataType("ndvi")}
              className={`px-6 py-2.5 rounded-lg flex items-center gap-2 transition-all ${
                dataType === "ndvi"
                  ? "bg-primary text-white shadow-lg"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <TreePine className="w-5 h-5" />
              <span className="text-sm font-medium">NDVI</span>
            </button>
          </div>
        </div>

        {/* Canvas layers - keep 3D mounted so view state is preserved across data type switches */}
        <div
          ref={threeContainerRef}
          className={`absolute inset-0 ${
            dataType === "3d" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        />
        <canvas
          ref={canvasRef}
          className={`w-full h-full ${dataType === "3d" ? "hidden" : "block"}`}
          style={{ display: dataType === "3d" ? "none" : "block" }}
        />

        {dataType === "3d" && (
          <canvas
            ref={measurementCanvasRef}
            className="absolute inset-0 z-20 pointer-events-none"
          />
        )}

        {(isLoadingPly || plyError) && (
          <div className="absolute bottom-4 left-4 z-10 bg-card/95 backdrop-blur border border-border rounded-lg px-3 py-2 text-xs">
            {isLoadingPly ? "Importing file..." : <span className="text-red-400">{plyError}</span>}
          </div>
        )}

        {isDragActive && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 border-2 border-dashed border-primary pointer-events-none">
            <div className="px-5 py-3 rounded-lg bg-card/95 border border-border text-center">
              <p className="text-sm font-medium">
                {dataType === "3d"
                  ? "Drop a 3D file (.ply, .obj, .glb, .gltf)"
                  : "Drop a raster/image file"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Scrollable Controls Only */}
      {!isViewerFullscreen && (
        <div className="w-80 bg-card border-l border-border flex flex-col">
        {/* Fixed Header */}
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-base">Viewer Controls</h2>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            <div className="space-y-2">
              {/* Model Info */}
              <details className="border border-border rounded-lg overflow-hidden">
                <summary className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent transition-colors cursor-pointer">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Box className="w-4 h-4" />
                    Model Information
                  </span>
                  <span className="text-muted-foreground">▼</span>
                </summary>
                <div className="px-4 pb-4 space-y-2 text-xs border-t border-border">
                  <PropertyRow label="File" value={dataType === "3d" ? plyName : "scene_preview"} />
                  {dataType !== "3d" && <PropertyRow label="Raster" value={rasterName} />}
                  <PropertyRow label="Size" value="342 MB" />
                  <PropertyRow label="Vertices" value="1,245,832" />
                  <PropertyRow label="Faces" value="2,491,664" />
                  <PropertyRow label="Texture" value="4096x4096 px" />
                  <PropertyRow label="Format" value="Wavefront OBJ" />
                  <PropertyRow label="Created" value="Feb 25, 2026" />
                </div>
              </details>

              {/* Camera Settings */}
              {dataType === "3d" && (
                <details className="border border-border rounded-lg overflow-hidden">
                  <summary className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent transition-colors cursor-pointer">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      Camera Settings
                    </span>
                    <span className="text-muted-foreground">▼</span>
                  </summary>
                  <div className="px-4 pb-4 space-y-4 border-t border-border">
                    <div>
                      <label className="text-sm mb-2 block">Field of View</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="30"
                          max="120"
                          step="5"
                          value={fieldOfView}
                          onChange={(event) => setFieldOfView(parseInt(event.target.value, 10))}
                          className="w-full"
                        />
                        <span className="text-xs text-muted-foreground w-10">{fieldOfView}°</span>
                      </div>
                    </div>
                  </div>
                </details>
              )}

              {/* Rendering Options */}
              {dataType === "3d" && (
                <details className="border border-border rounded-lg overflow-hidden" open>
                  <summary className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent transition-colors cursor-pointer">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      Rendering Options
                    </span>
                    <span className="text-muted-foreground">▼</span>
                  </summary>
                  <div className="px-4 pb-4 space-y-3 border-t border-border">
                    <ToggleRow label="Show Grid" checked={showGrid} onChange={setShowGrid} />
                    <ToggleRow label="Wireframe" checked={wireframe} onChange={setWireframe} />
                    <ToggleRow label="Lighting" checked={lighting} onChange={setLighting} />
                    <ToggleRow label="Show Axes" checked={showAxes} onChange={setShowAxes} />
                    <ToggleRow label="Shadows" checked={showShadows} onChange={setShowShadows} />
                    <ToggleRow label="Ambient Occlusion" checked={ambientOcclusion} onChange={setAmbientOcclusion} />
                    
                    <div className="pt-2">
                      <label className="text-sm mb-2 block">Point Cloud Opacity</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={meshOpacity}
                          onChange={(e) => setMeshOpacity(parseInt(e.target.value))}
                          className="w-full"
                        />
                        <span className="text-xs text-muted-foreground w-8">{meshOpacity}%</span>
                      </div>
                    </div>
                  </div>
                </details>
              )}

              {/* Point Cloud Settings */}
              {dataType === "3d" && effective3DViewMode === "pointcloud" && (
                <details className="border border-border rounded-lg overflow-hidden">
                  <summary className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent transition-colors cursor-pointer">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Navigation className="w-4 h-4" />
                      Point Cloud Settings
                    </span>
                    <span className="text-muted-foreground">▼</span>
                  </summary>
                  <div className="px-4 pb-4 space-y-4 border-t border-border">
                    <div>
                      <label className="text-sm mb-2 block">Point Size</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0.001"
                          max="0.2"
                          step="0.001"
                          value={pointSize}
                          onChange={(e) => setPointSize(parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <span className="text-xs text-muted-foreground w-12">{pointSize.toFixed(3)}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm mb-2 block">Color Mode</label>
                      <select
                        value={colorMode}
                        onChange={(event) => setColorMode(event.target.value as PointCloudColorMode)}
                        className="w-full px-3 py-2 bg-secondary border border-border rounded text-sm"
                      >
                        <option value="rgb">RGB</option>
                        <option value="elevation">Elevation</option>
                        <option value="intensity">Intensity</option>
                        <option value="classification">Classification</option>
                      </select>
                    </div>
                  </div>
                </details>
              )}

              {/* Display Settings */}
              <details className="border border-border rounded-lg overflow-hidden">
                <summary className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent transition-colors cursor-pointer">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Display Settings
                  </span>
                  <span className="text-muted-foreground">▼</span>
                </summary>
                <div className="px-4 pb-4 space-y-4 border-t border-border">
                  <div>
                    <label className="text-sm mb-2 block">Background Color</label>
                    <div className="flex gap-2">
                      {["#0a0e14", "#1a1a1a", "#ffffff", "#f3f4f6"].map((color) => (
                        <button
                          key={color}
                          onClick={() => setBackgroundColor(color)}
                          className={`w-10 h-10 rounded border-2 transition-all ${
                            backgroundColor === color ? "border-primary scale-110" : "border-border"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm mb-2 block">Quality</label>
                    <select
                      value={renderQuality}
                      onChange={(event) => setRenderQuality(event.target.value as "low" | "medium" | "high" | "ultra")}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded text-sm"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="ultra">Ultra</option>
                    </select>
                  </div>
                </div>
              </details>

              {/* Measurements & Annotations */}
              <details className="border border-border rounded-lg overflow-hidden">
                <summary className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent transition-colors cursor-pointer">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Ruler className="w-4 h-4" />
                    Measurements & Tools
                  </span>
                  <span className="text-muted-foreground">▼</span>
                </summary>
                <div className="px-4 pb-4 space-y-3 border-t border-border">
                  <ToggleRow label="Show Measurements" checked={showMeasurements} onChange={handleShowMeasurementsChange} />
                  
                  <div className="pt-2 space-y-2">
                    <button
                      type="button"
                      onClick={() => selectMeasurementTool("distance")}
                      className={`w-full px-3 py-2 border rounded text-sm flex items-center gap-2 transition-colors ${
                        measurementTool === "distance"
                          ? "bg-primary text-white border-primary"
                          : "bg-secondary hover:bg-accent border-border"
                      }`}
                    >
                      <Ruler className="w-4 h-4" />
                      Distance Tool
                    </button>
                    <button
                      type="button"
                      onClick={() => selectMeasurementTool("area")}
                      className={`w-full px-3 py-2 border rounded text-sm flex items-center gap-2 transition-colors ${
                        measurementTool === "area"
                          ? "bg-primary text-white border-primary"
                          : "bg-secondary hover:bg-accent border-border"
                      }`}
                    >
                      <Box className="w-4 h-4" />
                      Area Tool
                    </button>
                  </div>
                </div>
              </details>

            </div>

            {/* Action Buttons */}
            <div className="space-y-2 mt-6">
              <button
                onClick={() => void captureAndSaveScreenshot()}
                className="w-full px-4 py-2.5 bg-secondary hover:bg-accent border border-border rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <FileImage className="w-4 h-4" />
                Take Screenshot
              </button>
              <button
                type="button"
                onClick={() => setIsViewerFullscreen(true)}
                className="w-full px-4 py-2.5 bg-secondary hover:bg-accent border border-border rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Maximize2 className="w-4 h-4" />
                Fullscreen
              </button>
            </div>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}

function ViewCube({ onSelectView }: { onSelectView: (view: "top" | "front" | "right") => void }) {
  return (
    <div className="grid grid-cols-3 gap-1 p-2">
      <ViewCubeButton label="Top" onClick={() => onSelectView("top")} />
      <ViewCubeButton label="Front" onClick={() => onSelectView("front")} />
      <ViewCubeButton label="Right" onClick={() => onSelectView("right")} />
    </div>
  );
}

function ViewCubeButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-12 h-12 bg-secondary hover:bg-accent border border-border rounded text-xs transition-colors"
    >
      {label}
    </button>
  );
}

function IconButton({
  icon: Icon,
  active,
  onClick,
  tooltip,
}: {
  icon: any;
  active?: boolean;
  onClick?: () => void;
  tooltip?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={`
        w-9 h-9 rounded flex items-center justify-center transition-colors
        ${active ? "bg-primary text-white" : "hover:bg-accent"}
      `}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

function PropertyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}:</span>
      <span>{value}</span>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <Switch.Root
        checked={checked}
        onCheckedChange={onChange}
        className="w-11 h-6 bg-secondary border border-border rounded-full relative data-[state=checked]:bg-primary transition-colors outline-none"
      >
        <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform translate-x-0.5 data-[state=checked]:translate-x-5.5" />
      </Switch.Root>
    </div>
  );
}

