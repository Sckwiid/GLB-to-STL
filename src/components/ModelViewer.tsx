import { useEffect, useRef, useState } from "react";
import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  GridHelper,
  HemisphereLight,
  Mesh,
  Object3D,
  PerspectiveCamera,
  SRGBColorSpace,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RotateCcw } from "lucide-react";
import { loadGltfFromFile, normalizeConversionError } from "../lib/convertGlbToStl";
import type { ConversionItem } from "../types/conversion";

interface ModelViewerProps {
  item: ConversionItem | null;
}

export default function ModelViewer({ item }: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const resetCameraRef = useRef<(() => void) | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !item || item.format === "unknown") {
      setLoadState("idle");
      return;
    }

    let animationFrame = 0;
    let disposed = false;
    const scene = new Scene();
    scene.background = new Color("#070a14");

    const camera = new PerspectiveCamera(45, 1, 0.01, 100000);
    const renderer = new WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.domElement.className = "h-full w-full rounded-2xl";
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    scene.add(new AmbientLight("#dbeafe", 1.1));
    const hemisphere = new HemisphereLight("#e0f2fe", "#312e81", 1.2);
    scene.add(hemisphere);
    const keyLight = new DirectionalLight("#ffffff", 2);
    keyLight.position.set(4, 5, 7);
    scene.add(keyLight);
    const grid = new GridHelper(10, 10, "#22d3ee", "#334155");
    grid.position.y = -0.001;
    scene.add(grid);

    const resize = () => {
      const width = Math.max(container.clientWidth, 1);
      const height = Math.max(container.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    const render = () => {
      controls.update();
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(render);
    };

    const fitCamera = (model: Object3D) => {
      const box = new Box3().setFromObject(model);
      const size = box.getSize(new Vector3());
      const center = box.getCenter(new Vector3());
      const maxDimension = Math.max(size.x, size.y, size.z, 1);
      const distance = maxDimension / (2 * Math.tan((Math.PI * camera.fov) / 360));

      model.position.sub(center);
      grid.scale.setScalar(Math.max(maxDimension / 5, 0.5));

      const cameraDistance = distance * 1.45;
      camera.near = Math.max(cameraDistance / 1000, 0.001);
      camera.far = cameraDistance * 1000;
      camera.position.set(cameraDistance, cameraDistance * 0.65, cameraDistance);
      camera.updateProjectionMatrix();
      controls.target.set(0, 0, 0);
      controls.update();

      resetCameraRef.current = () => {
        camera.position.set(cameraDistance, cameraDistance * 0.65, cameraDistance);
        controls.target.set(0, 0, 0);
        controls.update();
      };
    };

    setLoadState("loading");
    setError(null);
    render();

    loadGltfFromFile(item.file)
      .then((gltf) => {
        if (disposed) {
          disposeObject(gltf.scene);
          return;
        }

        scene.add(gltf.scene);
        fitCamera(gltf.scene);
        setLoadState("ready");
      })
      .catch((loadError) => {
        if (!disposed) {
          setError(normalizeConversionError(loadError));
          setLoadState("error");
        }
      });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      controls.dispose();
      scene.traverse((object) => {
        if (object !== grid) {
          disposeObject(object);
        }
      });
      grid.geometry.dispose();
      if (Array.isArray(grid.material)) {
        grid.material.forEach((material) => material.dispose());
      } else {
        grid.material.dispose();
      }
      renderer.dispose();
      renderer.domElement.remove();
      resetCameraRef.current = null;
    };
  }, [item]);

  return (
    <section className="glass-panel flex min-h-[390px] flex-col rounded-3xl p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-white">3D preview</h2>
          <p className="truncate text-sm text-slate-400">
            {item ? item.name : "Select a queued model"}
          </p>
        </div>
        <button
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-slate-200 transition hover:border-cyan-200/40 hover:bg-cyan-200/10 disabled:cursor-not-allowed disabled:opacity-40"
          type="button"
          aria-label="Reset camera"
          disabled={loadState !== "ready"}
          onClick={() => resetCameraRef.current?.()}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="relative min-h-[300px] flex-1 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60">
        <div ref={containerRef} className="absolute inset-0" />
        {loadState === "idle" ? (
          <div className="absolute inset-0 flex items-center justify-center px-5 text-center text-sm text-slate-400">
            Choose a file from the queue to inspect it before or after conversion.
          </div>
        ) : null}
        {loadState === "loading" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/45 px-5 text-center text-sm text-slate-200">
            Loading preview...
          </div>
        ) : null}
        {loadState === "error" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 px-5 text-center text-sm leading-6 text-rose-100">
            {error}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function disposeObject(object: Object3D): void {
  const mesh = object as Mesh;

  if (mesh.geometry) {
    mesh.geometry.dispose();
  }

  const material = mesh.material;

  if (Array.isArray(material)) {
    material.forEach((item) => item.dispose());
  } else {
    material?.dispose();
  }
}
