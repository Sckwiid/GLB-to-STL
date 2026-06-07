import {
  Download,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  Box,
} from "lucide-react";
import ProgressBar from "./ProgressBar";
import { formatDuration, formatFileSize } from "../lib/formatFileSize";
import type { ConversionItem, ConversionStatus } from "../types/conversion";

interface FileItemProps {
  item: ConversionItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onDownload: (item: ConversionItem) => void;
  onConvert: (id: string) => void;
  conversionDisabled: boolean;
}

const statusConfig: Record<
  ConversionStatus,
  { label: string; className: string; icon: typeof Clock3 }
> = {
  pending: {
    label: "Pending",
    className: "border-slate-500/30 bg-slate-500/10 text-slate-200",
    icon: Clock3,
  },
  converting: {
    label: "Converting",
    className: "border-blue-400/30 bg-blue-400/10 text-blue-100",
    icon: Loader2,
  },
  done: {
    label: "Done",
    className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
    icon: CheckCircle2,
  },
  error: {
    label: "Error",
    className: "border-rose-400/30 bg-rose-400/10 text-rose-100",
    icon: AlertCircle,
  },
};

export default function FileItem({
  item,
  isSelected,
  onSelect,
  onRemove,
  onDownload,
  onConvert,
  conversionDisabled,
}: FileItemProps) {
  const config = statusConfig[item.status];
  const StatusIcon = config.icon;
  const canDownload = item.status === "done" && Boolean(item.stlBlob);
  const canConvert = item.format !== "unknown" && item.status !== "converting";

  return (
    <li
      className={`rounded-2xl border p-4 transition ${
        isSelected
          ? "border-cyan-300/60 bg-cyan-300/10"
          : "border-white/10 bg-slate-950/35 hover:border-white/20 hover:bg-slate-900/45"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <button
          className="min-w-0 flex-1 text-left"
          type="button"
          onClick={() => onSelect(item.id)}
        >
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-300/10 text-violet-200 ring-1 ring-violet-200/20">
              <Box className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-white sm:text-base">
                {item.name}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                <span>{formatFileSize(item.size)}</span>
                <span>{item.format.toUpperCase()}</span>
                {item.convertedSize ? <span>STL {formatFileSize(item.convertedSize)}</span> : null}
                {item.durationMs ? <span>{formatDuration(item.durationMs)}</span> : null}
              </div>
            </div>
          </div>
        </button>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${config.className}`}
          >
            <StatusIcon
              className={`h-3.5 w-3.5 ${item.status === "converting" ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            {config.label}
          </span>

          <button
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-200/40 hover:bg-cyan-200/10 disabled:cursor-not-allowed disabled:opacity-40"
            type="button"
            disabled={!canDownload}
            onClick={() => onDownload(item)}
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            STL
          </button>

          <button
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-violet-200/40 hover:bg-violet-200/10 disabled:cursor-not-allowed disabled:opacity-40"
            type="button"
            disabled={!canConvert || conversionDisabled}
            onClick={() => onConvert(item.id)}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Reconvert
          </button>

          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-300 transition hover:border-rose-200/40 hover:bg-rose-300/10 hover:text-rose-100"
            type="button"
            aria-label={`Remove ${item.name}`}
            onClick={() => onRemove(item.id)}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-4">
        <ProgressBar value={item.progress} compact />
      </div>

      {item.error ? (
        <p className="mt-3 rounded-xl border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-xs leading-5 text-rose-100">
          {item.error}
        </p>
      ) : null}
    </li>
  );
}
