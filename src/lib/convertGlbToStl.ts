import { BufferAttribute, BufferGeometry, Group, Mesh, Vector3 } from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { MeshoptDecoder } from "meshoptimizer";
import type { ConversionResult } from "../types/conversion";

type ProgressCallback = (progress: number) => void;

interface GltfJsonResource {
  uri?: string;
}

interface GltfJson {
  buffers?: GltfJsonResource[];
  images?: GltfJsonResource[];
}

export function isSupportedModelFile(fileName: string): boolean {
  return /\.(glb|gltf)$/i.test(fileName);
}

export function getModelFormat(fileName: string): "glb" | "gltf" | "unknown" {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension === "glb" || extension === "gltf") {
    return extension;
  }

  return "unknown";
}

export function createStlFileName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.(glb|gltf)$/i, "");
  const safeName = withoutExtension
    .trim()
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${safeName || "model"}.stl`;
}

export function createConfiguredGltfLoader(): GLTFLoader {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  const baseUrl = import.meta.env.BASE_URL || "./";
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

  dracoLoader.setDecoderPath(`${normalizedBase}draco/`);
  loader.setDRACOLoader(dracoLoader);
  loader.setMeshoptDecoder(MeshoptDecoder);

  return loader;
}

export async function loadGltfFromFile(file: File): Promise<GLTF> {
  const arrayBuffer = await file.arrayBuffer();

  assertEmbeddedGltfResources(file.name, arrayBuffer);
  await MeshoptDecoder.ready;

  return parseGltf(arrayBuffer);
}

export async function convertGlbToStl(
  file: File,
  onProgress?: ProgressCallback,
): Promise<ConversionResult> {
  if (!isSupportedModelFile(file.name)) {
    throw new Error("Format non supporte. Ajoutez uniquement des fichiers .glb ou .gltf.");
  }

  onProgress?.(8);
  await waitForMainThread();

  const gltf = await loadGltfFromFile(file);
  onProgress?.(48);
  await waitForMainThread();

  const exportScene = createBakeTransformedScene(gltf);
  onProgress?.(76);
  await waitForMainThread();

  const stlOutput = exportSceneToStl(exportScene);
  const stlBlob =
    typeof stlOutput === "string"
      ? new Blob([stlOutput], { type: "model/stl;charset=utf-8" })
      : new Blob([toArrayBuffer(stlOutput)], { type: "model/stl" });

  onProgress?.(100);

  return {
    stlBlob,
    stlFileName: createStlFileName(file.name),
    convertedSize: stlBlob.size,
  };
}

export function normalizeConversionError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (/external resources/i.test(message)) {
    return message;
  }

  if (/draco|KHR_draco_mesh_compression/i.test(message)) {
    return "Ce GLB utilise une compression Draco. Verifiez que les decodeurs Draco sont presents dans public/draco/ puis relancez le build.";
  }

  if (/meshopt|EXT_meshopt_compression/i.test(message)) {
    return "Ce GLB utilise une compression meshopt qui n'a pas pu etre decodee dans cette session.";
  }

  if (/out of memory|allocation|Array buffer allocation|maximum call stack/i.test(message)) {
    return "Le navigateur a manque de memoire pendant la conversion. Essayez un modele plus leger ou convertissez moins de fichiers en meme temps.";
  }

  if (/Unexpected token|JSON|Malformed|Invalid/i.test(message)) {
    return "Le fichier semble corrompu ou n'est pas un GLB/GLTF valide.";
  }

  if (/Failed to fetch|404|NetworkError/i.test(message)) {
    return "Le modele reference des ressources introuvables. Utilisez un GLB emballe ou un GLTF avec ressources integrees.";
  }

  return message || "Erreur Three.js pendant la conversion.";
}

function parseGltf(arrayBuffer: ArrayBuffer): Promise<GLTF> {
  const loader = createConfiguredGltfLoader();

  return new Promise((resolve, reject) => {
    loader.parse(arrayBuffer, "", resolve, reject);
  });
}

function assertEmbeddedGltfResources(fileName: string, arrayBuffer: ArrayBuffer): void {
  if (!/\.gltf$/i.test(fileName)) {
    return;
  }

  const text = new TextDecoder().decode(arrayBuffer);
  let gltfJson: GltfJson;

  try {
    gltfJson = JSON.parse(text) as GltfJson;
  } catch {
    throw new Error("Le fichier .gltf n'est pas un JSON valide.");
  }

  const externalBuffers = gltfJson.buffers?.filter(hasExternalUri) ?? [];
  const externalImages = gltfJson.images?.filter(hasExternalUri) ?? [];

  if (externalBuffers.length > 0 || externalImages.length > 0) {
    throw new Error(
      "Ce .gltf reference des ressources externes. Utilisez un fichier .glb ou un .gltf avec buffers et textures integres en data URI.",
    );
  }
}

function hasExternalUri(resource: GltfJsonResource): boolean {
  return Boolean(resource.uri && !resource.uri.startsWith("data:"));
}

function createBakeTransformedScene(gltf: GLTF): Group {
  const exportRoot = new Group();
  let meshCount = 0;

  gltf.scene.updateMatrixWorld(true);

  // STL has no scene graph, so every mesh is cloned with its world transform baked into geometry.
  gltf.scene.traverse((object) => {
    const mesh = object as Mesh;

    if (!mesh.isMesh || !mesh.geometry) {
      return;
    }

    const position = mesh.geometry.getAttribute("position");

    if (!position || position.count < 3) {
      return;
    }

    const geometry = createFloat32TriangleGeometry(mesh);
    geometry.computeVertexNormals();
    exportRoot.add(new Mesh(geometry));
    meshCount += 1;
  });

  if (!gltf.scene.children.length) {
    throw new Error("Scene vide dans le fichier GLB/GLTF.");
  }

  if (meshCount === 0) {
    throw new Error("Aucun mesh exportable n'a ete trouve dans la scene.");
  }

  exportRoot.updateMatrixWorld(true);
  return exportRoot;
}

function createFloat32TriangleGeometry(mesh: Mesh): BufferGeometry {
  const sourceGeometry = mesh.geometry;
  const position = sourceGeometry.getAttribute("position");
  const index = sourceGeometry.index;
  const maxCount = index ? index.count : position.count;
  const rangeStart = sourceGeometry.drawRange.start || 0;
  const rangeCount = Number.isFinite(sourceGeometry.drawRange.count)
    ? sourceGeometry.drawRange.count
    : maxCount - rangeStart;
  const rangeEnd = Math.min(maxCount, rangeStart + rangeCount);
  const triangleCount = Math.floor((rangeEnd - rangeStart) / 3);
  const vertices = new Float32Array(triangleCount * 9);
  const vertex = new Vector3();
  const skinnedMesh = mesh as Mesh & {
    isSkinnedMesh?: boolean;
    applyBoneTransform?: (index: number, target: Vector3) => Vector3;
  };

  let offset = 0;

  for (let cursor = rangeStart; cursor < rangeStart + triangleCount * 3; cursor += 1) {
    const vertexIndex = index ? index.getX(cursor) : cursor;

    vertex.fromBufferAttribute(position, vertexIndex);

    if (skinnedMesh.isSkinnedMesh && skinnedMesh.applyBoneTransform) {
      skinnedMesh.applyBoneTransform(vertexIndex, vertex);
    }

    vertex.applyMatrix4(mesh.matrixWorld);

    vertices[offset] = vertex.x;
    vertices[offset + 1] = vertex.y;
    vertices[offset + 2] = vertex.z;
    offset += 3;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(vertices, 3));

  return geometry;
}

function exportSceneToStl(exportScene: Group): string | ArrayBuffer | DataView {
  const exporter = new STLExporter();

  try {
    return exporter.parse(exportScene, { binary: true });
  } catch {
    return exporter.parse(exportScene);
  }
}

function toArrayBuffer(output: ArrayBuffer | DataView): ArrayBuffer {
  if (output instanceof ArrayBuffer) {
    return output;
  }

  return output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength) as ArrayBuffer;
}

function waitForMainThread(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}
