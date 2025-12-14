import React, { useRef, useState, useEffect } from 'react';
import SignaturePad, { SignaturePadRef } from './components/SignaturePad';
import Controls from './components/Controls';
import AnalysisModal from './components/AnalysisModal';
import { DrawingOptions, PenColor, SignatureAnalysisResult } from './types';
import { analyzeSignature, digitizeSignature } from './services/geminiService';

const App: React.FC = () => {
  const padRef = useRef<SignaturePadRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [hasApiKey, setHasApiKey] = useState(false);
  const [drawingOptions, setDrawingOptions] = useState<DrawingOptions>({
    color: PenColor.BLACK,
    width: 3,
  });
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDigitizing, setIsDigitizing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<SignatureAnalysisResult | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selection/Crop State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{x: number, y: number} | null>(null);
  const [selectionRect, setSelectionRect] = useState<{x: number, y: number, w: number, h: number} | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      const win = window as any;
      if (win.aistudio && await win.aistudio.hasSelectedApiKey()) {
        setHasApiKey(true);
      }
    };
    checkKey();
  }, []);

  const handleConnect = async () => {
    const win = window as any;
    if (win.aistudio) {
        await win.aistudio.openSelectKey();
        setHasApiKey(true);
    }
  };

  const handleClear = () => {
    padRef.current?.clear();
    setAnalysisResult(null);
    setErrorMsg(null);
    setSelectionRect(null);
    setIsSelectionMode(false);
  };

  const handleUndo = () => {
      padRef.current?.undo();
  };

  const handleSave = () => {
    // preserveTransparency = true to keep the transparent background if it was digitized
    const dataURL = padRef.current?.toDataURL(true);
    if (dataURL && padRef.current && !padRef.current.isEmpty()) {
      const link = document.createElement('a');
      link.download = `assinatura-${Date.now()}.png`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
        alert("Por favor, assine antes de salvar.");
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && padRef.current) {
          padRef.current.loadFromImage(file);
      }
  }

  // --- Background Removal Utility ---
  const removeBackground = async (imageSrc: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("Could not get context"));
                return;
            }
            
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Iterate over pixels
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                // If pixel is very bright/white, make it transparent
                // Threshold can be adjusted. 230/255 is safe for "clean white" backgrounds
                if (r > 230 && g > 230 && b > 230) {
                    data[i + 3] = 0; // Alpha to 0
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = imageSrc;
    });
  };

  // --- Selection Logic ---
  const handleStartSelection = (e: React.PointerEvent) => {
      if (!isSelectionMode || !containerRef.current) return;
      e.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setSelectionStart({ x, y });
      setSelectionRect({ x, y, w: 0, h: 0 });
  };

  const handleMoveSelection = (e: React.PointerEvent) => {
      if (!isSelectionMode || !selectionStart || !containerRef.current) return;
      e.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      const newX = Math.min(selectionStart.x, currentX);
      const newY = Math.min(selectionStart.y, currentY);
      const newW = Math.abs(currentX - selectionStart.x);
      const newH = Math.abs(currentY - selectionStart.y);

      setSelectionRect({ x: newX, y: newY, w: newW, h: newH });
  };

  const handleEndSelection = async () => {
      if (!isSelectionMode || !selectionRect || !padRef.current) {
          setIsSelectionMode(false);
          setSelectionStart(null);
          setSelectionRect(null);
          return;
      }

      // If selection is too small, assume it was a mis-click and cancel or digitize whole canvas
      if (selectionRect.w < 20 || selectionRect.h < 20) {
          setErrorMsg("Seleção muito pequena. Arraste para selecionar a área.");
          setSelectionStart(null);
          setSelectionRect(null);
          return;
      }

      setIsSelectionMode(false); // Stop selection mode immediately
      await performDigitization(selectionRect);
      
      setSelectionStart(null);
      setSelectionRect(null);
  };

  const performDigitization = async (rect: {x: number, y: number, w: number, h: number}) => {
    try {
        setIsDigitizing(true);
        setErrorMsg(null);

        // 1. Crop image from canvas
        const sourceCanvas = padRef.current?.getCanvas();
        if (!sourceCanvas) return;

        const cropCanvas = document.createElement('canvas');
        const dpr = window.devicePixelRatio || 1;
        
        // Adjust rect for DPR scaling on the source canvas
        // Note: The visual rect is in CSS pixels. The canvas is scaled by DPR.
        // However, SignaturePad visual size matches CSS size, so we need to map carefully.
        // We will grab the image data from the visible context.
        
        cropCanvas.width = rect.w;
        cropCanvas.height = rect.h;
        const cropCtx = cropCanvas.getContext('2d');
        if (!cropCtx) return;

        // Draw white background on crop canvas first (AI needs contrast)
        cropCtx.fillStyle = '#FFFFFF';
        cropCtx.fillRect(0, 0, rect.w, rect.h);

        // Draw the slice
        // sourceCanvas coordinates are scaled by DPR. We need to account for that.
        // Or simpler: Use the toDataURL of the pad (which is white-bg safe) and crop that image.
        // But toDataURL is async/heavy. Let's use the canvas directly.
        
        // The pad's internal canvas is scaled by DPR.
        // The selection rect is in CSS pixels.
        cropCtx.drawImage(
            sourceCanvas, 
            rect.x * dpr, rect.y * dpr, rect.w * dpr, rect.h * dpr, // Source
            0, 0, rect.w, rect.h // Dest
        );
        
        const croppedDataURL = cropCanvas.toDataURL('image/png');

        // 2. Send to Gemini
        const cleanImage = await digitizeSignature(croppedDataURL);
        
        // 3. Remove Background (Client Side)
        const transparentImage = await removeBackground(cleanImage);

        // 4. Update Canvas
        padRef.current?.clear();
        padRef.current?.loadFromDataURL(transparentImage);

    } catch (err: any) {
        console.error(err);
        if (err.message && (err.message.includes("Requested entity was not found") || err.message.includes("403"))) {
             setHasApiKey(false);
             setErrorMsg("Erro de autenticação. Por favor, re-selecione sua chave de API.");
        } else {
             setErrorMsg("Falha ao digitalizar assinatura. Tente novamente.");
        }
    } finally {
        setIsDigitizing(false);
    }
  };

  const handleDigitizeClick = () => {
      if (!padRef.current || padRef.current.isEmpty()) {
          setErrorMsg("Por favor, assine ou carregue uma imagem primeiro.");
          setTimeout(() => setErrorMsg(null), 3000);
          return;
      }
      setIsSelectionMode(true);
      // Give visual feedback
      setErrorMsg("Arraste uma caixa ao redor da assinatura para digitalizar.");
      setTimeout(() => setErrorMsg(null), 4000);
  };

  const handleAnalyze = async () => {
    if (!padRef.current || padRef.current.isEmpty()) {
        setErrorMsg("Por favor, assine ou carregue uma imagem primeiro.");
        setTimeout(() => setErrorMsg(null), 3000);
        return;
    }

    try {
      setIsAnalyzing(true);
      setErrorMsg(null);
      // Use standard export for analysis
      const dataURL = padRef.current.toDataURL(false);
      
      const result = await analyzeSignature(dataURL);
      setAnalysisResult(result);
      setShowModal(true);
    } catch (err: any) {
      console.error(err);
      if (err.message && (err.message.includes("Requested entity was not found") || err.message.includes("403"))) {
        setHasApiKey(false);
        setErrorMsg("Erro de autenticação. Por favor, re-selecione sua chave de API.");
      } else {
        setErrorMsg("Falha ao analisar assinatura. Tente novamente.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!hasApiKey) {
    return (
        <div className="h-[100dvh] w-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center animate-fade-in font-sans">
            <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm shadow-brand-200">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">Perart SignAI</h1>
            <p className="text-lg text-gray-600 mb-8 max-w-md leading-relaxed">
                Transforme seu fluxo de assinaturas com IA. Digitalize caligrafia e analise traços de personalidade em segundos.
            </p>
            <button 
                onClick={handleConnect}
                className="px-8 py-4 bg-brand-600 text-white rounded-xl font-semibold shadow-lg shadow-brand-500/30 hover:bg-brand-500 hover:scale-105 transition-all duration-200 flex items-center gap-3"
            >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                Conectar com Google AI Studio
            </button>
            <div className="mt-8 text-xs text-gray-400 max-w-sm">
                <p className="mb-1">O acesso ao <strong>Gemini 3 Pro</strong> requer uma chave de API paga.</p>
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-brand-600 transition-colors">Ver documentação de faturamento</a>
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50 font-sans">
      {/* Header - Compact for Mobile */}
      <header className="px-6 py-3 bg-white border-b border-gray-200 flex items-center justify-between shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-2 text-brand-600">
           <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
           <h1 className="text-lg md:text-xl font-bold tracking-tight text-gray-900">Perart SignAI</h1>
        </div>
        <div className="hidden md:block text-xs font-medium text-gray-400 uppercase tracking-wider">
          Powered by Gemini 3 Pro
        </div>
      </header>

      {/* Main Canvas Area */}
      <main className="flex-1 relative p-2 md:p-6 flex items-center justify-center overflow-hidden bg-gray-50/50">
        <div 
            ref={containerRef}
            className="relative w-full max-w-4xl h-full max-h-[70vh] md:max-h-[600px] flex flex-col shadow-xl shadow-gray-200/50 rounded-xl"
        >
            <SignaturePad 
                ref={padRef} 
                options={drawingOptions}
            />

            {/* Selection Overlay */}
            {isSelectionMode && (
                <div 
                    className="absolute inset-0 z-20 cursor-crosshair touch-none"
                    onPointerDown={handleStartSelection}
                    onPointerMove={handleMoveSelection}
                    onPointerUp={handleEndSelection}
                    onPointerLeave={handleEndSelection}
                >
                    <div className="absolute inset-0 bg-black/40 pointer-events-none backdrop-blur-[1px]" />
                    
                    {selectionRect && (
                        <div 
                            className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] box-content"
                            style={{
                                left: selectionRect.x,
                                top: selectionRect.y,
                                width: selectionRect.w,
                                height: selectionRect.h,
                            }}
                        >
                            <div className="absolute inset-0 border border-dashed border-white/50 animate-pulse"></div>
                            {/* Dimensions Label */}
                            <div className="absolute -top-8 left-0 bg-brand-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                                Selecionar Área
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
        
        {/* Toast Notification */}
        {errorMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur text-white px-6 py-3 rounded-full shadow-xl text-sm font-medium animate-bounce z-50 border border-white/10">
            {errorMsg}
          </div>
        )}
      </main>

      {/* Footer Controls */}
      <footer className="shrink-0 z-10 bg-white md:bg-transparent pb-safe">
        <Controls 
          options={drawingOptions}
          onOptionsChange={setDrawingOptions}
          onClear={handleClear}
          onUndo={handleUndo}
          onSave={handleSave}
          onAnalyze={handleAnalyze}
          onDigitize={handleDigitizeClick}
          onUpload={handleUpload}
          isAnalyzing={isAnalyzing}
          isDigitizing={isDigitizing}
        />
      </footer>

      {/* Modal */}
      <AnalysisModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        data={analysisResult} 
      />
    </div>
  );
};

export default App;