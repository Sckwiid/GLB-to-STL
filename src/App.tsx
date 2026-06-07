import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Archive, Boxes, Download, Hammer, Trash2, Zap } from "lucide-react";
import Dropzone from "./components/Dropzone";
import FileQueue from "./components/FileQueue";
import ModelViewer from "./components/ModelViewer";
import PrivacyCard from "./components/PrivacyCard";
import ProgressBar from "./components/ProgressBar";
import {
  convertGlbToStl,
  getModelFormat,
  isSupportedModelFile,
  normalizeConversionError,
} from "./lib/convertGlbToStl";
import { zipFiles } from "./lib/zipFiles";
import type { ConversionItem } from "./types/conversion";

const CONVERSION_CONCURRENCY = 2;

interface ConversionRun {
  completed: number;
  total: number;
}

export default function App() {
  const [items, setItems] = useState<ConversionItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionRun, setConversionRun] = useState<ConversionRun | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const itemsRef = useRef(items);
  const isConvertingRef = useRef(false);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const convertedItems = useMemo(
    () => items.filter((item) => item.status === "done" && item.stlBlob),
    [items],
  );
  const pendingCount = items.filter((item) => item.status === "pending").length;
  const errorCount = items.filter((item) => item.status === "error").length;
  const convertingCount = items.filter((item) => item.status === "converting").length;
  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
  const canConvert = items.some(
    (item) =>
      item.format !== "unknown" &&
      item.status !== "converting" &&
      item.status !== "done",
  );
  const globalProgress =
    items.length === 0
      ? 0
      : items.reduce((total, item) => total + item.progress, 0) / items.length;
  const runLabel = conversionRun
    ? `Converting ${conversionRun.completed} / ${conversionRun.total}`
    : `${convertedItems.length} / ${items.length} ready`;

  const updateItem = useCallback(
    (id: string, updater: Partial<ConversionItem> | ((item: ConversionItem) => ConversionItem)) => {
      setItems((currentItems) =>
        currentItems.map((item) => {
          if (item.id !== id) {
            return item;
          }

          return typeof updater === "function" ? updater(item) : { ...item, ...updater };
        }),
      );
    },
    [],
  );

  const handleFiles = useCallback(
    (files: File[]) => {
      const additions = files.map(createConversionItem);

      setItems((currentItems) => [...currentItems, ...additions]);

      if (!selectedId) {
        const firstSupported = additions.find((item) => item.format !== "unknown");
        setSelectedId(firstSupported?.id ?? additions[0]?.id ?? null);
      }
    },
    [selectedId],
  );

  const handleRemove = useCallback(
    (id: string) => {
      const nextItems = items.filter((item) => item.id !== id);
      setItems(nextItems);

      if (selectedId === id) {
        setSelectedId(nextItems.find((item) => item.format !== "unknown")?.id ?? nextItems[0]?.id ?? null);
      }
    },
    [items, selectedId],
  );

  const handleClear = useCallback(() => {
    setItems([]);
    setSelectedId(null);
    setConversionRun(null);
    setZipProgress(0);
  }, []);

  const convertItems = useCallback(
    async (targetIds?: string[], force = false) => {
      if (isConvertingRef.current) {
        return;
      }

      const targets = itemsRef.current.filter((item) => {
        const matchesTarget = targetIds ? targetIds.includes(item.id) : true;
        const shouldSkipDone = !force && item.status === "done";

        return matchesTarget && item.format !== "unknown" && item.status !== "converting" && !shouldSkipDone;
      });

      if (targets.length === 0) {
        return;
      }

      isConvertingRef.current = true;
      setIsConverting(true);
      setConversionRun({ completed: 0, total: targets.length });

      let cursor = 0;
      let completed = 0;

      const worker = async () => {
        while (cursor < targets.length) {
          const item = targets[cursor];
          cursor += 1;
          const start = performance.now();

          updateItem(item.id, {
            status: "converting",
            progress: 5,
            error: undefined,
            stlBlob: undefined,
            stlFileName: undefined,
            convertedSize: undefined,
            durationMs: undefined,
          });

          try {
            const result = await convertGlbToStl(item.file, (progress) => {
              updateItem(item.id, { progress });
            });

            updateItem(item.id, {
              status: "done",
              progress: 100,
              error: undefined,
              stlBlob: result.stlBlob,
              stlFileName: result.stlFileName,
              convertedSize: result.convertedSize,
              durationMs: Math.round(performance.now() - start),
            });
          } catch (error) {
            updateItem(item.id, {
              status: "error",
              progress: 100,
              error: normalizeConversionError(error),
              durationMs: Math.round(performance.now() - start),
            });
          } finally {
            completed += 1;
            setConversionRun({ completed, total: targets.length });
            await waitForBrowser();
          }
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(CONVERSION_CONCURRENCY, targets.length) }, worker),
      );

      isConvertingRef.current = false;
      setIsConverting(false);
      window.setTimeout(() => setConversionRun(null), 800);
    },
    [updateItem],
  );

  const handleDownload = useCallback((item: ConversionItem) => {
    if (!item.stlBlob || !item.stlFileName) {
      return;
    }

    downloadBlob(item.stlBlob, item.stlFileName);
  }, []);

  const handleDownloadZip = useCallback(async () => {
    if (convertedItems.length === 0 || isZipping) {
      return;
    }

    setIsZipping(true);
    setZipProgress(0);

    try {
      const zipBlob = await zipFiles(convertedItems, setZipProgress);
      downloadBlob(zipBlob, "converted-stl-files.zip");
    } finally {
      setIsZipping(false);
      window.setTimeout(() => setZipProgress(0), 600);
    }
  }, [convertedItems, isZipping]);

  return (
    <main className="min-h-screen overflow-hidden px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-slate-950/35 px-5 py-5 backdrop-blur sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-violet-400 p-3 text-slate-950 shadow-lg shadow-cyan-950/30">
              <Hammer className="h-7 w-7" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-normal text-white sm:text-3xl">
                MeshForge Converter
              </h1>
              <p className="mt-1 text-sm text-slate-300 sm:text-base">
                Convert GLB/GLTF to STL directly in your browser
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 lg:min-w-[470px]">
            <Metric label="Queued" value={items.length} />
            <Metric label="Converting" value={convertingCount} />
            <Metric label="Ready" value={convertedItems.length} />
            <Metric label="Errors" value={errorCount} />
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)]">
          <div className="flex flex-col gap-6">
            <Dropzone disabled={isConverting} onFiles={handleFiles} />

            <section className="glass-panel rounded-3xl p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Conversion dashboard</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {pendingCount} pending, {convertedItems.length} done, {errorCount} error
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    className="inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-45"
                    type="button"
                    disabled={!canConvert || isConverting}
                    onClick={() => void convertItems()}
                  >
                    <Zap className="h-4 w-4" aria-hidden="true" />
                    Convertir en STL
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-cyan-200/40 hover:bg-cyan-200/10 disabled:cursor-not-allowed disabled:opacity-45"
                    type="button"
                    disabled={convertedItems.length === 0 || isZipping}
                    onClick={() => void handleDownloadZip()}
                  >
                    <Archive className="h-4 w-4" aria-hidden="true" />
                    {isZipping ? `ZIP ${zipProgress}%` : "Télécharger tout en ZIP"}
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-rose-200/40 hover:bg-rose-300/10 disabled:cursor-not-allowed disabled:opacity-45"
                    type="button"
                    disabled={items.length === 0}
                    onClick={handleClear}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Vider la liste
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <ProgressBar value={isZipping ? zipProgress : globalProgress} label={runLabel} />
              </div>

              <div className="mt-5">
                <FileQueue
                  items={items}
                  selectedId={selectedId}
                  conversionDisabled={isConverting}
                  onSelect={setSelectedId}
                  onRemove={handleRemove}
                  onDownload={handleDownload}
                  onConvert={(id) => void convertItems([id], true)}
                />
              </div>
            </section>
          </div>

          <aside className="flex flex-col gap-6">
            <ModelViewer item={selectedItem} />
            <PrivacyCard />

            <section className="glass-panel rounded-3xl p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-300/10 text-blue-200 ring-1 ring-blue-200/20">
                  <Boxes className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Batch queue</h2>
                  <p className="text-sm text-slate-400">Limited to {CONVERSION_CONCURRENCY} parallel conversions.</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                Already converted files are skipped by the main batch action. Use Reconvert on a
                row when you want to regenerate its STL output.
              </p>
              {convertedItems.length > 0 ? (
                <button
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-200/20 bg-cyan-200/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-200/15"
                  type="button"
                  onClick={() => convertedItems.forEach(handleDownload)}
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Download every STL separately
                </button>
              ) : null}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function createConversionItem(file: File): ConversionItem {
  const supported = isSupportedModelFile(file.name);

  return {
    id: createId(),
    file,
    name: file.name,
    size: file.size,
    format: getModelFormat(file.name),
    status: supported ? "pending" : "error",
    progress: supported ? 0 : 100,
    error: supported
      ? undefined
      : "Format non supporte. Ajoutez uniquement des fichiers .glb ou .gltf.",
    createdAt: Date.now(),
  };
}

function createId(): string {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function waitForBrowser(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}
