import React, { useState } from 'react';
import { Cloud, UploadCloud, DownloadCloud, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';

export const CloudStorage: React.FC = () => {
  const [provider, setProvider] = useState<'s3' | 'supabase'>('supabase');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>('Hoje às 15:42');

  const name = useProjectStore((s) => s.name);
  const getSnapshot = useProjectStore((s) => s.getSnapshot);

  const handleSyncToCloud = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSync(`Hoje às ${new Date().toLocaleTimeString()}`);
    }, 1200);
  };

  return (
    <div className="flex h-full flex-col p-3 text-slate-200">
      <div className="mb-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Armazenamento em Nuvem</h3>
        <p className="text-[11px] text-slate-400">Backup automático e sincronização em múltiplos dispositivos</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar">
        {/* Provider selection */}
        <div>
          <span className="mb-1.5 block text-[10px] font-bold text-slate-400 uppercase">Provedor Cloud</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setProvider('supabase')}
              className={`rounded-xl border p-2.5 text-xs text-left transition ${
                provider === 'supabase'
                  ? 'border-emerald-500 bg-emerald-950/30 text-emerald-300 font-bold'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Cloud className="h-4 w-4 text-emerald-400" />
                <span>Supabase Storage</span>
              </div>
              <span className="mt-1 block text-[10px] text-slate-500">Free Tier 1GB</span>
            </button>

            <button
              type="button"
              onClick={() => setProvider('s3')}
              className={`rounded-xl border p-2.5 text-xs text-left transition ${
                provider === 's3'
                  ? 'border-purple-500 bg-purple-950/30 text-purple-300 font-bold'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Cloud className="h-4 w-4 text-purple-400" />
                <span>Amazon AWS S3</span>
              </div>
              <span className="mt-1 block text-[10px] text-slate-500">Bucket Privado</span>
            </button>
          </div>
        </div>

        {/* Sync Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <div>
                <p className="text-xs font-semibold text-slate-200">{name}</p>
                <span className="text-[10px] text-slate-400">
                  {lastSync ? `Último backup: ${lastSync}` : 'Nunca sincronizado'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSyncToCloud}
        disabled={isSyncing}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-purple-600 py-2.5 text-xs font-bold text-white hover:bg-purple-500 transition disabled:opacity-50"
      >
        <UploadCloud className="h-4 w-4" />
        <span>{isSyncing ? 'Sincronizando com a Nuvem...' : 'Fazer Backup Agora'}</span>
      </button>
    </div>
  );
};
