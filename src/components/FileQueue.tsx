import { Inbox } from "lucide-react";
import FileItem from "./FileItem";
import type { ConversionItem } from "../types/conversion";

interface FileQueueProps {
  items: ConversionItem[];
  selectedId: string | null;
  conversionDisabled: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onDownload: (item: ConversionItem) => void;
  onConvert: (id: string) => void;
}

export default function FileQueue({
  items,
  selectedId,
  conversionDisabled,
  onSelect,
  onRemove,
  onDownload,
  onConvert,
}: FileQueueProps) {
  if (items.length === 0) {
    return (
      <div className="flex min-h-[250px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-950/25 px-5 py-10 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-slate-300">
          <Inbox className="h-7 w-7" aria-hidden="true" />
        </div>
        <h3 className="text-base font-semibold text-white">No files queued</h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
          Add one or more GLB/GLTF files to start a local STL conversion batch.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <FileItem
          key={item.id}
          item={item}
          isSelected={item.id === selectedId}
          conversionDisabled={conversionDisabled}
          onSelect={onSelect}
          onRemove={onRemove}
          onDownload={onDownload}
          onConvert={onConvert}
        />
      ))}
    </ul>
  );
}
