import React, { useState } from 'react';
import { VERSE_FILES } from '../data/verseFiles';
import { Check, Copy, Download, FileCode2 } from 'lucide-react';

export const VerseCodebaseView: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>(VERSE_FILES[0].id);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeFile =
    VERSE_FILES.find((f) => f.id === selectedId) ?? VERSE_FILES[0];
  const lines = activeFile.content.split('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopiedId(activeFile.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setCopiedId(null);
    }
  };

  const handleDownloadSingle = () => {
    const blob = new Blob([activeFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    const combined = VERSE_FILES.map(
      (f) =>
        `# ======================================================================\n# FICHIER : ${f.path}\n# ======================================================================\n\n${f.content}\n`
    ).join('\n');
    const blob = new Blob([combined], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ZeroSumArena_UEFN_Verse_Bundle.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* File Tree List */}
      <aside className="lg:col-span-4 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">
              Modules UEFN Verse
            </h2>
            <div className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 mt-0.5">
              /uefn/ZeroSumArena/ · {VERSE_FILES.length} fichiers
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownloadAll}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Tout exporter
          </button>
        </div>

        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {VERSE_FILES.map((file) => {
            const selected = file.id === activeFile.id;
            return (
              <button
                key={file.id}
                type="button"
                onClick={() => setSelectedId(file.id)}
                className={`w-full text-left px-4 py-3 cursor-pointer ${
                  selected
                    ? 'bg-neutral-950 text-white dark:bg-neutral-100 dark:text-neutral-950'
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-xs font-mono font-medium truncate">
                    <FileCode2 className="w-3.5 h-3.5 shrink-0" />
                    {file.filename}
                  </span>
                  <span
                    className={`text-[11px] whitespace-nowrap ${
                      selected
                        ? 'text-neutral-300 dark:text-neutral-700'
                        : 'text-neutral-400 dark:text-neutral-500'
                    }`}
                  >
                    {file.phase}
                  </span>
                </div>
                <p
                  className={`text-[11px] mt-1 line-clamp-2 leading-relaxed ${
                    selected
                      ? 'text-neutral-300 dark:text-neutral-700'
                      : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  {file.summary}
                </p>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Code Viewer */}
      <section className="lg:col-span-8 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-mono font-semibold text-neutral-950 dark:text-neutral-50">
              {activeFile.path}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {activeFile.gddSection} · {lines.length} lignes
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-950 text-white dark:bg-neutral-100 dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              {copiedId === activeFile.id ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copié
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copier
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDownloadSingle}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Télécharger
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[640px] overflow-y-auto bg-neutral-50 dark:bg-neutral-950">
          <table className="w-full border-collapse font-mono text-xs leading-relaxed">
            <tbody>
              {lines.map((line, i) => (
                <tr
                  key={i}
                  className="hover:bg-neutral-100/80 dark:hover:bg-neutral-900/80"
                >
                  <td className="select-none text-right px-3 py-0.5 text-neutral-400 dark:text-neutral-600 w-12 align-top tabular-nums border-r border-neutral-200 dark:border-neutral-800">
                    {i + 1}
                  </td>
                  <td className="px-4 py-0.5 whitespace-pre text-neutral-900 dark:text-neutral-100">
                    {line || ' '}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
