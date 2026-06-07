import { useRef, useState } from "react";
import { FileUp, FolderOpen } from "lucide-react";

interface DropzoneProps {
  disabled?: boolean;
  onFiles: (files: File[]) => void;
}

export default function Dropzone({ disabled = false, onFiles }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList?.length) {
      return;
    }

    onFiles(Array.from(fileList));

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <section
      className={`glass-panel relative overflow-hidden rounded-3xl p-5 transition duration-300 sm:p-7 ${
        isDragging ? "border-cyan-300/80 shadow-glow" : ""
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) {
          setIsDragging(true);
        }
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        if (!disabled) {
          handleFiles(event.dataTransfer.files);
        }
      }}
    >
      <div className="absolute inset-0 subtle-grid opacity-60" aria-hidden="true" />
      <div className="relative flex min-h-[270px] flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-200/25 bg-slate-950/30 px-5 py-9 text-center transition hover:border-cyan-200/50 hover:bg-slate-900/45 sm:min-h-[320px]">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-300/10 text-cyan-200">
          <FileUp className="h-8 w-8" aria-hidden="true" />
        </div>
        <h2 className="max-w-xl text-2xl font-semibold tracking-normal text-white sm:text-3xl">
          Drop GLB or embedded GLTF files here
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
          Batch convert browser-side, preview a selected model, then download each STL or
          package all converted files into one ZIP.
        </p>

        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
          multiple
          onChange={(event) => handleFiles(event.target.files)}
        />

        <button
          className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <FolderOpen className="h-4 w-4" aria-hidden="true" />
          Choose files
        </button>
      </div>
    </section>
  );
}
