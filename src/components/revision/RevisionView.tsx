"use client";

import { useEffect, useState } from "react";
import { Sparkles, Settings2, BookOpen } from "lucide-react";
import { RevisionSettingsModal } from "./RevisionSettingsModal";
import {
  getRevisionConfig,
  RevisionProviderConfig,
} from "../../lib/revisionAi";

export function RevisionView() {
  const [config, setConfig] = useState<RevisionProviderConfig | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    setConfig(getRevisionConfig());
  }, []);

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full w-full bg-slate-50 dark:bg-slate-950 p-6 items-center justify-center text-center">
      <div className="max-w-md p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Upgrading AI Revision Workspace
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          The revision workspace is transitioning to the new adaptive
          multi-stage AI Tutor (Prelims, Mains &amp; Optional personas, visual
          concept mapping, and unified notes export).
        </p>
        <button
          type="button"
          onClick={() => setShowSettingsModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
        >
          <Settings2 className="w-4 h-4" />
          <span>Configure AI Provider</span>
        </button>
      </div>

      <RevisionSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        currentConfig={config}
        onSave={(updated) => setConfig(updated)}
        onClear={() => setConfig(null)}
      />
    </div>
  );
}
