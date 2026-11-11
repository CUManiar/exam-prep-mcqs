"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { ModalShell } from "../ModalShell";
import {
  RevisionProviderConfig,
  PROVIDER_INFO,
  clearRevisionConfig,
  saveRevisionConfig,
  validateApiKey,
} from "../../lib/revisionAi";
import { RevisionProvider } from "../../lib/types";

interface RevisionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: RevisionProviderConfig | null;
  onSave: (config: RevisionProviderConfig) => void;
  onClear: () => void;
}

const ALL_PROVIDERS: RevisionProvider[] = ["gemini", "openai", "anthropic", "groq"];

export function RevisionSettingsModal({
  isOpen,
  onClose,
  currentConfig,
  onSave,
  onClear,
}: RevisionSettingsModalProps) {
  const [provider, setProvider] = useState<RevisionProvider>(
    currentConfig?.provider || "gemini",
  );
  const [apiKey, setApiKey] = useState(currentConfig?.apiKey || "");
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    valid: boolean;
    error?: string;
  } | null>(null);

  const info = PROVIDER_INFO[provider];

  const handleProviderChange = (newProvider: RevisionProvider) => {
    setProvider(newProvider);
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!apiKey.trim()) {
      setTestResult({ valid: false, error: "Please enter an API key first." });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    const res = await validateApiKey(provider, apiKey);
    setIsTesting(false);
    setTestResult(res);
  };

  const handleSave = () => {
    if (!apiKey.trim()) {
      setTestResult({ valid: false, error: "API key cannot be blank." });
      return;
    }
    const newCfg: RevisionProviderConfig = {
      provider,
      apiKey: apiKey.trim(),
    };
    saveRevisionConfig(newCfg);
    onSave(newCfg);
    onClose();
  };

  const handleRemove = () => {
    clearRevisionConfig();
    setApiKey("");
    setTestResult(null);
    onClear();
    onClose();
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="revision-settings-title"
      className="max-w-lg w-full"
    >
      <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="revision-settings-title"
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-white"
              >
                AI Provider Settings
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Free AI is active out-of-the-box • Custom API key is optional
              </p>
            </div>
          </div>
        </div>

        {/* 30-Second Quick Setup Guide */}
        <div className="my-4 p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 space-y-2.5 text-xs text-slate-700 dark:text-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              Optional: Dedicated free key in 30 seconds
            </span>
            <a
              href={info?.keyGetUrl || "https://aistudio.google.com/app/apikey"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-2xs shrink-0"
            >
              <span>Get Free Key from {info?.keyGetLabel || "Provider"}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <ol className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 list-decimal list-inside leading-relaxed">
            <li>Click the button above and log in with your account.</li>
            <li>Click <strong>&quot;Create API Key&quot;</strong> (most providers offer free tiers).</li>
            <li>Paste your key below and click <strong>&quot;Save &amp; Activate&quot;</strong>.</li>
          </ol>
        </div>

        {/* Provider Switcher — 4 Providers */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Choose Provider
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_PROVIDERS.map((p) => {
                const pInfo = PROVIDER_INFO[p];
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleProviderChange(p)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      provider === p
                        ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                      <span className="text-indigo-600 dark:text-indigo-400">{pInfo?.icon}</span>
                      {pInfo?.label}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      {pInfo?.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* API Key Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                {info?.label || "Provider"} API Key
              </label>
            </div>

            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestResult(null);
                }}
                placeholder={info?.keyPlaceholder || "Paste your API key here"}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono pr-16 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-1.5"
                title={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <Lock className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Keys are saved strictly in your local browser storage and never sent elsewhere.</span>
            </div>
          </div>

          {/* Validation Feedback */}
          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs font-medium flex items-start gap-2 ${
                testResult.valid
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
                  : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800"
              }`}
            >
              {testResult.valid ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Key validated successfully!</span> {info?.label} is responsive and ready for UPSC revision.
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Validation failed:</span> {testResult.error}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              {currentConfig?.apiKey && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 dark:hover:text-rose-400 font-semibold px-2 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove Key</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting || !apiKey.trim()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-xs font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-50 transition-colors"
              >
                {isTesting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{isTesting ? "Validating..." : "Test Connection"}</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={!apiKey.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-xs"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save &amp; Activate</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
