'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  ExternalLink, 
  FileText, 
  Loader2, 
  Monitor, 
  AlertCircle 
} from 'lucide-react';

interface PdfViewerProps {
  url: string;
  title?: string;
  className?: string;
  showToolbar?: boolean;
}

export function PdfViewer({
  url,
  title = 'Question Paper PDF',
  className = 'w-full h-full flex-1 min-h-0',
  showToolbar = true,
}: PdfViewerProps) {
  // Mode: 'canvas' (PDF.js in-browser engine - unlimited size, mobile friendly) or 'native' (browser iframe)
  const [viewMode, setViewMode] = useState<'canvas' | 'native'>('canvas');
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNum, setPageNum] = useState<number>(1);
  const [pageInput, setPageInput] = useState<string>('1');
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadProgress, setLoadProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentRenderTask = useRef<any>(null);
  const renderInProgressRef = useRef<boolean>(false);
  const pendingRenderRef = useRef<boolean>(false);

  const absoluteUrl = typeof window !== 'undefined'
    ? (url?.startsWith('http') ? url : `${window.location.origin}${url}`)
    : url;

  // 1. Load PDF.js library into window if not present
  const loadPdfJsLibrary = useCallback((): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') return reject('No window');
      if ((window as any).pdfjsLib) {
        return resolve((window as any).pdfjsLib);
      }

      const script = document.createElement('script');
      script.src = '/vendor/pdfjs/pdf.min.js';
      script.onload = () => {
        const lib = (window as any).pdfjsLib;
        if (lib) {
          lib.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.js';
          resolve(lib);
        } else {
          reject(new Error('PDF.js library failed to initialize'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load PDF.js script'));
      document.head.appendChild(script);
    });
  }, []);

  // 2. Fetch and initialize PDF document
  useEffect(() => {
    if (!absoluteUrl || viewMode !== 'canvas') return;

    let isCancelled = false;
    setIsLoading(true);
    setErrorMsg(null);
    setLoadProgress(null);

    loadPdfJsLibrary()
      .then(pdfjsLib => {
        if (isCancelled) return;

        const loadingTask = pdfjsLib.getDocument({
          url: absoluteUrl,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
        });

        loadingTask.onProgress = (progressData: { loaded: number; total: number }) => {
          if (!isCancelled && progressData.total > 0) {
            setLoadProgress({ loaded: progressData.loaded, total: progressData.total });
          }
        };

        return loadingTask.promise;
      })
      .then(doc => {
        if (isCancelled || !doc) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setPageNum(1);
        setPageInput('1');
        setIsLoading(false);
      })
      .catch(err => {
        if (isCancelled) return;
        console.error('Error loading PDF document:', err);
        setErrorMsg(err.message || 'Failed to load PDF file');
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [absoluteUrl, viewMode, loadPdfJsLibrary]);

  // 3. Render current page to canvas with safe render locking and high-DPI scaling
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || !containerRef.current) return;

    // If another render is active on this canvas, cancel it and wait for release
    if (currentRenderTask.current) {
      try {
        currentRenderTask.current.cancel();
        await currentRenderTask.current.promise.catch(() => {});
      } catch {
        // cancellation is expected
      }
      currentRenderTask.current = null;
    }

    if (renderInProgressRef.current) {
      pendingRenderRef.current = true;
      return;
    }

    renderInProgressRef.current = true;

    try {
      const page = await pdfDoc.getPage(pageNum);
      const containerWidth = containerRef.current.clientWidth || 360;
      
      // Compute base viewport to fit container width nicely (with padding)
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const availableWidth = Math.max(280, containerWidth - 24);
      const fitScale = (availableWidth / unscaledViewport.width) * zoomScale;

      const viewport = page.getViewport({ scale: fitScale });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Handle HiDPI (Retina / OLED display pixel ratios)
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      ctx.save();
      ctx.scale(dpr, dpr);

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };

      const renderTask = page.render(renderContext);
      currentRenderTask.current = renderTask;
      await renderTask.promise;
      ctx.restore();
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn('Page render warning:', err);
      }
    } finally {
      currentRenderTask.current = null;
      renderInProgressRef.current = false;
      if (pendingRenderRef.current) {
        pendingRenderRef.current = false;
        renderCurrentPage();
      }
    }
  }, [pdfDoc, pageNum, zoomScale]);

  useEffect(() => {
    if (pdfDoc && viewMode === 'canvas') {
      renderCurrentPage();
    }
  }, [pdfDoc, pageNum, zoomScale, viewMode, renderCurrentPage]);

  // Auto re-render on container resize with debounce
  useEffect(() => {
    if (!containerRef.current) return;
    let resizeTimer: NodeJS.Timeout;
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (pdfDoc && viewMode === 'canvas') {
          renderCurrentPage();
        }
      }, 150);
    });
    resizeObserver.observe(containerRef.current);
    return () => {
      clearTimeout(resizeTimer);
      resizeObserver.disconnect();
    };
  }, [pdfDoc, viewMode, renderCurrentPage]);

  const handlePrevPage = () => {
    if (pageNum > 1) {
      const next = pageNum - 1;
      setPageNum(next);
      setPageInput(String(next));
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextPage = () => {
    if (pageNum < numPages) {
      const next = pageNum + 1;
      setPageNum(next);
      setPageInput(String(next));
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= numPages) {
      setPageNum(p);
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setPageInput(String(pageNum));
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes <= 0) return '0 MB';
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!url) return null;

  return (
    <div className={`flex flex-col bg-slate-100 overflow-hidden relative ${className}`}>
      {/* Top Universal Viewer Toolbar */}
      {showToolbar && (
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-2.5 sm:px-3 py-1.5 text-xs text-slate-700 shrink-0 gap-2 flex-wrap shadow-2xs">
          {/* Document Title & Pages Info */}
          <div className="flex items-center gap-1.5 min-w-0">
            <FileText className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            <span className="truncate text-[11px] sm:text-xs font-semibold text-slate-800">{title}</span>
            {numPages > 0 && viewMode === 'canvas' && (
              <span className="text-[10px] text-slate-400 font-mono hidden xs:inline shrink-0">
                ({numPages} pgs)
              </span>
            )}
          </div>

          {/* Controls: Zoom, Navigation, Mode toggle */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {viewMode === 'canvas' && numPages > 0 && (
              <>
                {/* Page Navigation */}
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-1 py-0.5">
                  <button
                    type="button"
                    disabled={pageNum <= 1}
                    onClick={handlePrevPage}
                    className="p-1 rounded text-slate-500 hover:text-slate-800 disabled:opacity-30 transition-colors"
                    title="Previous Page"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <form onSubmit={handlePageInputSubmit} className="flex items-center">
                    <input
                      type="text"
                      value={pageInput}
                      onChange={e => setPageInput(e.target.value)}
                      onBlur={handlePageInputSubmit}
                      className="w-7 sm:w-8 text-center bg-white border border-slate-300 rounded text-[11px] py-0.5 text-slate-800 font-mono focus:border-indigo-500 outline-none"
                    />
                    <span className="text-[11px] text-slate-400 mx-1 font-mono">/ {numPages}</span>
                  </form>
                  <button
                    type="button"
                    disabled={pageNum >= numPages}
                    onClick={handleNextPage}
                    className="p-1 rounded text-slate-500 hover:text-slate-800 disabled:opacity-30 transition-colors"
                    title="Next Page"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Zoom Controls */}
                <div className="hidden sm:flex items-center gap-0.5 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setZoomScale(prev => Math.max(0.6, prev - 0.2))}
                    className="p-1 rounded text-slate-500 hover:text-slate-800 transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomScale(1.0)}
                    className="px-1.5 text-[10px] font-mono text-slate-600 hover:text-slate-900 transition-colors"
                    title="Reset Fit Width"
                  >
                    {Math.round(zoomScale * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomScale(prev => Math.min(2.5, prev + 0.2))}
                    className="p-1 rounded text-slate-500 hover:text-slate-800 transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            )}

            {/* Toggle Canvas / Native */}
            <button
              type="button"
              onClick={() => setViewMode(prev => prev === 'canvas' ? 'native' : 'canvas')}
              className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] sm:text-[11px] text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              title={viewMode === 'canvas' ? 'Switch to Native Browser PDF frame' : 'Switch to In-App Canvas Reader'}
            >
              <Monitor className="h-3 w-3 text-indigo-600" />
              <span>{viewMode === 'canvas' ? 'Native' : 'Canvas'}</span>
            </button>

            {/* Full Tab Link */}
            <a
              href={absoluteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-700 font-semibold transition-colors px-1"
              title="Open raw PDF in new browser tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Full Tab</span>
            </a>
          </div>
        </div>
      )}

      {/* Main Reader Viewport */}
      {viewMode === 'canvas' ? (
        <div
          ref={containerRef}
          className="relative flex-1 w-full h-full min-h-0 overflow-auto bg-slate-200/70 p-2 sm:p-4 flex flex-col items-center select-none"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Loading Indicator with Download Progress */}
          {isLoading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-xs text-slate-700 p-4">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
              <p className="text-sm font-semibold text-slate-800">Loading Question Paper...</p>
              {loadProgress && loadProgress.total > 0 ? (
                <div className="mt-2 flex flex-col items-center w-56">
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 transition-all duration-200" 
                      style={{ width: `${Math.round((loadProgress.loaded / loadProgress.total) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono mt-1">
                    {formatBytes(loadProgress.loaded)} / {formatBytes(loadProgress.total)} ({Math.round((loadProgress.loaded / loadProgress.total) * 100)}%)
                  </span>
                </div>
              ) : (
                <span className="text-xs text-slate-500 mt-1">Preparing high-resolution pages...</span>
              )}
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="my-auto flex flex-col items-center text-center p-6 bg-white border border-rose-200 rounded-2xl shadow-lg max-w-md">
              <AlertCircle className="h-10 w-10 text-rose-500 mb-2" />
              <h4 className="text-sm font-bold text-slate-900">Document Preview Issue</h4>
              <p className="text-xs text-slate-500 mt-1">{errorMsg}</p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode('native')}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs"
                >
                  Try Native Mode
                </button>
                <a
                  href={absoluteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs"
                >
                  Open in New Tab
                </a>
              </div>
            </div>
          )}

          {/* High-Resolution Document Canvas */}
          <canvas
            ref={canvasRef}
            className={`shadow-2xl rounded-sm transition-opacity duration-200 bg-white max-w-full ${
              isLoading ? 'opacity-20' : 'opacity-100'
            }`}
          />

          {/* Mobile Bottom Floating Page Navigator */}
          {numPages > 1 && !isLoading && (
            <div className="sticky bottom-3 mt-4 z-10 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-full px-3 py-1.5 shadow-xl text-xs text-slate-300">
              <button
                type="button"
                disabled={pageNum <= 1}
                onClick={handlePrevPage}
                className="p-1 rounded-full text-slate-300 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[11px] font-mono font-semibold px-1">
                Page {pageNum} of {numPages}
              </span>
              <button
                type="button"
                disabled={pageNum >= numPages}
                onClick={handleNextPage}
                className="p-1 rounded-full text-slate-300 hover:text-white disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Native Browser Iframe (Fallback) */
        <div className="relative flex-1 w-full h-full min-h-0 overflow-hidden bg-slate-950">
          <iframe
            src={absoluteUrl}
            title={title}
            className="w-full h-full border-0 bg-slate-950"
            style={{ WebkitOverflowScrolling: 'touch' }}
          />
        </div>
      )}
    </div>
  );
}
