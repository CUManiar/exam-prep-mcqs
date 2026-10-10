'use client';

import React, { useState, useEffect } from 'react';
import { ExternalLink, FileText, Smartphone, Monitor, RotateCw, Loader2 } from 'lucide-react';

interface PdfViewerProps {
  url: string;
  title?: string;
  className?: string;
  showToolbar?: boolean;
}

export function PdfViewer({
  url,
  title = 'Document PDF',
  className = 'w-full h-full flex-1 min-h-0',
  showToolbar = true,
}: PdfViewerProps) {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [useGoogleViewer, setUseGoogleViewer] = useState<boolean>(false);
  const [isLocalhost, setIsLocalhost] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [reloadKey, setReloadKey] = useState<number>(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mobileDevice = 
        /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
        (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent)) ||
        window.innerWidth < 768;
      const local = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      setIsMobile(mobileDevice);
      setIsLocalhost(local);
      
      // On mobile in production/cloud, default to Google Docs viewer for seamless embedded preview
      if (mobileDevice && !local) {
        setUseGoogleViewer(true);
      }
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    // Timeout to dismiss spinner after 3.5s if cross-origin iframe doesn't bubble onLoad
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3500);
    return () => clearTimeout(timer);
  }, [url, useGoogleViewer, reloadKey]);

  if (!url) return null;

  const absoluteUrl = typeof window !== 'undefined' 
    ? (url.startsWith('http') ? url : `${window.location.origin}${url}`)
    : url;

  const finalViewerSrc = useGoogleViewer && !isLocalhost
    ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(absoluteUrl)}`
    : absoluteUrl;

  const handleToggleViewer = () => {
    setIsLoading(true);
    setUseGoogleViewer(prev => !prev);
    setReloadKey(k => k + 1);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setReloadKey(k => k + 1);
  };

  return (
    <div className={`flex flex-col bg-slate-950 overflow-hidden ${className}`}>
      {showToolbar && (
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-3 py-1.5 text-xs text-slate-400 shrink-0 gap-2">
          <div className="flex items-center gap-1.5 truncate">
            <FileText className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <span className="truncate text-[11px] font-medium text-slate-300">{title}</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Toggle between Mobile Cloud Viewer & Native */}
            {!isLocalhost && (
              <button
                type="button"
                onClick={handleToggleViewer}
                className="flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                title={useGoogleViewer ? 'Switch to direct native PDF' : 'Switch to mobile embedded reader'}
              >
                {useGoogleViewer ? (
                  <>
                    <Smartphone className="h-3 w-3 text-emerald-400" />
                    <span className="text-[10px]">Mobile View</span>
                  </>
                ) : (
                  <>
                    <Monitor className="h-3 w-3 text-indigo-400" />
                    <span className="text-[10px]">Direct PDF</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleRefresh}
              className="p-1 rounded-md border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Reload preview"
            >
              <RotateCw className="h-3 w-3" />
            </button>

            <a
              href={absoluteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors px-1"
            >
              <ExternalLink className="h-3 w-3" />
              <span className="hidden sm:inline">Full Tab</span>
            </a>
          </div>
        </div>
      )}

      <div className="relative flex-1 w-full h-full min-h-0 overflow-hidden bg-slate-950">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-xs text-slate-400 pointer-events-none">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-400 mb-2" />
            <span className="text-xs">Loading PDF preview...</span>
          </div>
        )}

        <iframe
          key={`${finalViewerSrc}-${reloadKey}`}
          src={finalViewerSrc}
          title={title}
          onLoad={() => setIsLoading(false)}
          className="w-full h-full border-0 bg-slate-950"
          style={{
            WebkitOverflowScrolling: 'touch',
          }}
        />
      </div>
    </div>
  );
}
