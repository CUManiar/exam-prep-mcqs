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
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { ModalShell } from "../ModalShell";
import {
  AVAILABLE_MODELS,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GROQ_MODEL,
  RevisionProviderConfig,
  clearRevisionConfig,
  saveRevisionConfig,
  validateApiKey,
} from "../../lib/revisionAi";

interface RevisionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: RevisionProviderConfig | null;
  onSave: (config: RevisionProviderConfig) => void;
  onClear: () => void;
}

export function RevisionSettingsModal({
  isOpen,
  onClose,
  currentConfig,
  onSave,
  onClear,
}: RevisionSettingsModalProps) {
  const [provider, setProvider] = useState<"gemini" | "groq">(
    currentConfig?.provider || "gemini",
  );
  const [apiKey, setApiKey] = useState(currentConfig?.apiKey || "");
  const [model, setModel] = useState(
    currentConfig?.model ||
      (provider === "gemini" ? DEFAULT_GEMINI_MODEL : DEFAULT_GROQ_MODEL),
  );
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    valid: boolean;
    error?: string;
  } | null>(null);

  const handleProviderChange = (newProvider: "gemini" | "groq") => {
    setProvider(newProvider);
    setModel(
      newProvider === "gemini" ? DEFAULT_GEMINI_MODEL : DEFAULT_GROQ_MODEL,
    );
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!apiKey.trim()) {
      setTestResult({ valid: false, error: "Please enter an API key first." });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    const res = await validateApiKey(provider, apiKey, model);
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
      model,
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
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="revision-settings-title"
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-white"
              >
                AI Revision Key Setup
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                100% Free • Direct from Google AI Studio or Groq
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Free Tier Highlight Alert */}
        <div className="my-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs leading-relaxed text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Zero Expenses Guaranteed:</span> Your API key is stored only in your browser&apos;s local storage and used directly for your study sessions. No credit card is required.
          </div>
        </div>

        {/* Provider Switcher */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Choose Provider
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleProviderChange("gemini")}
                className={`p-3 rounded-lg border text-left transition-all ${
                  provider === "gemini"
                    ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  Google Gemini (Free)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  1M token context, best for UPSC syllabus & case laws.
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleProviderChange("groq")}
                className={`p-3 rounded-lg border text-left transition-all ${
                  provider === "groq"
                    ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                  <span className="text-amber-600 font-black">⚡</span>
                  Groq (Free)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Llama 3.3 70B, blazing fast responses (300+ tok/s).
                </div>
              </button>
            </div>
          </div>

          {/* Model Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {AVAILABLE_MODELS[provider].map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* API Key Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                {provider === "gemini" ? "Google AI Studio API Key" : "Groq API Key"}
              </label>
              <a
                href={
                  provider === "gemini"
                    ? "https://aistudio.google.com/app/apikey"
                    : "https://console.groq.com/keys"
                }
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
              >
                Get free key <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestResult(null);
                }}
                placeholder={
                  provider === "gemini"
                    ? "AIzaSy..."
                    : "gsk_..."
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono pr-16 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-1.5"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {provider === "gemini"
                ? "Visit Google AI Studio, click 'Create API Key', and paste it here."
                : "Create a free key on Groq Cloud and paste it here."}
            </p>
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs leading-relaxed flex items-start gap-2 ${
                testResult.valid
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
                  : "bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-800"
              }`}
            >
              {testResult.valid ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Connection Successful!</span> Your key is active and ready for revision tutoring.
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Validation Error:</span> {testResult.error}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 gap-2">
          {currentConfig?.apiKey ? (
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove Key
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting || !apiKey.trim()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {isTesting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
              ) : (
                <Lock className="h-3.5 w-3.5" />
              )}
              {isTesting ? "Testing..." : "Test Key"}
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={!apiKey.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              <Save className="h-3.5 w-3.5" /> Save Configuration
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
