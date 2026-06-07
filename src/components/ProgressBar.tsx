interface ProgressBarProps {
  value: number;
  label?: string;
  compact?: boolean;
}

export default function ProgressBar({ value, label, compact = false }: ProgressBarProps) {
  const normalizedValue = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div className="w-full">
      {label ? (
        <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
          <span>{label}</span>
          <span>{normalizedValue}%</span>
        </div>
      ) : null}
      <div
        className={`w-full overflow-hidden rounded-full bg-slate-800/90 ring-1 ring-white/10 ${
          compact ? "h-1.5" : "h-2.5"
        }`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 transition-all duration-300"
          style={{ width: `${normalizedValue}%` }}
        />
      </div>
    </div>
  );
}
