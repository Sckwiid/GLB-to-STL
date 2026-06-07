import { LockKeyhole, ServerOff, ShieldCheck } from "lucide-react";

export default function PrivacyCard() {
  return (
    <section className="glass-panel rounded-3xl p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-200 ring-1 ring-emerald-200/20">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Traitement local</h2>
          <p className="text-sm text-slate-400">Compatible GitHub Pages, sans backend.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
          <LockKeyhole className="mb-3 h-5 w-5 text-cyan-200" aria-hidden="true" />
          Les fichiers restent dans le navigateur et ne sont jamais envoyes vers un serveur.
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
          <ServerOff className="mb-3 h-5 w-5 text-violet-200" aria-hidden="true" />
          Aucun endpoint API, aucun upload externe et aucun serveur Node en production.
        </div>
      </div>
    </section>
  );
}
