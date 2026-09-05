import React, { useState } from 'react';
import { FileStack, Download, Plus, Trash2, CheckCircle2, FileText, ArrowUpDown } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ViralScript } from '../types';

interface PdfMergeStudioProps {
  savedScripts?: ViralScript[];
}

export const PdfMergeStudio: React.FC<PdfMergeStudioProps> = ({ savedScripts = [] }) => {
  const [selectedItems, setSelectedItems] = useState<string[]>(
    savedScripts.slice(0, 3).map((s) => s.id)
  );

  const toggleSelect = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleExportConsolidated = () => {
    const scriptsToExport = savedScripts.filter((s) => selectedItems.includes(s.id));
    const content = scriptsToExport
      .map(
        (s, idx) =>
          `===================================================\nROTEIRO #${idx + 1}: ${s.title.toUpperCase()}\nDURAÇÃO: ${s.targetDuration} | PLATAFORMA: ${s.platform}\n===================================================\n\n[PARTE 1 - GANCHO]:\n${s.part1Hook?.selectedHook || s.part1Hook?.options?.[0]}\n\n[PARTE 2 - HISTÓRIA / DOR]:\n${s.part2Story?.storyBeat || ''}\n\n[PARTE 3 - CONTEÚDO]:\n${s.part3Content?.points?.join('\n') || ''}\n\n[PARTE 4 - CTA]:\n${s.part4CTA?.callToAction || ''}\n\n[TEXTO COMPLETO DO TELEPROMPTER]:\n${s.fullTeleprompterText}\n\n`
      )
      .join('\n\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roteiros-consolidados-gravacao-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    confetti({ particleCount: 30, spread: 55 });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300 mb-2">
            <FileStack className="h-3.5 w-3.5 text-purple-400" />
            <span>Juntar & Consolidar Documentos</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">Juntar PDF / Roteiros</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Reúna múltiplos roteiros em uma única apostila consolidada pronta para impressão ou equipe de edição.
          </p>
        </div>

        <button
          onClick={handleExportConsolidated}
          disabled={selectedItems.length === 0}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:scale-105 active:scale-95 disabled:opacity-50 transition"
        >
          <Download className="h-4 w-4" />
          <span>Exportar Pacote Consolidado ({selectedItems.length})</span>
        </button>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Selecione os Roteiros para Consolidar:
        </h3>

        {savedScripts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {savedScripts.map((script) => {
              const isSelected = selectedItems.includes(script.id);
              return (
                <div
                  key={script.id}
                  onClick={() => toggleSelect(script.id)}
                  className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition ${
                    isSelected
                      ? 'border-purple-500/50 bg-purple-600/15 text-white'
                      : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-0"
                    />
                    <div>
                      <h4 className="text-xs font-bold line-clamp-1">{script.title}</h4>
                      <span className="text-[10px] text-slate-400">{script.targetDuration} &bull; {script.platform}</span>
                    </div>
                  </div>
                  <FileText className="h-4 w-4 text-purple-400 flex-shrink-0" />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-slate-500 text-xs">
            Nenhum roteiro salvo no momento. Crie roteiros na aba &quot;Roteiro & IA&quot; para poder juntar e exportar.
          </div>
        )}
      </div>
    </div>
  );
};
