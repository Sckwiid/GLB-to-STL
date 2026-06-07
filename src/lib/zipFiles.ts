import JSZip from "jszip";
import type { ConversionItem } from "../types/conversion";

export async function zipFiles(
  items: ConversionItem[],
  onProgress?: (progress: number) => void,
): Promise<Blob> {
  const zip = new JSZip();
  const convertedItems = items.filter(
    (item) => item.status === "done" && item.stlBlob && item.stlFileName,
  );

  for (const item of convertedItems) {
    zip.file(item.stlFileName as string, item.stlBlob as Blob);
  }

  return zip.generateAsync(
    {
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      onProgress?.(Math.round(metadata.percent));
    },
  );
}
