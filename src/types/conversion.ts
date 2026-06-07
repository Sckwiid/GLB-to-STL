export type ConversionStatus = "pending" | "converting" | "done" | "error";

export interface ConversionItem {
  id: string;
  file: File;
  name: string;
  size: number;
  format: "glb" | "gltf" | "unknown";
  status: ConversionStatus;
  progress: number;
  error?: string;
  stlBlob?: Blob;
  stlFileName?: string;
  convertedSize?: number;
  durationMs?: number;
  createdAt: number;
}

export interface ConversionResult {
  stlBlob: Blob;
  stlFileName: string;
  convertedSize: number;
}
