import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Point, DrawingOptions, PenColor } from '../types';

interface SignaturePadProps {
  options: DrawingOptions;
  onStart?: () => void;
  onEnd?: () => void;
}

export interface SignaturePadRef {
  clear: () => void;
  undo: () => void;
  toDataURL: (preserveTransparency?: boolean) => string;
  getCanvas: () => HTMLCanvasElement | null;
  isEmpty: () => boolean;
  loadFromImage: (file: File) => void;
  loadFromDataURL: (dataURL: string) => void;
}

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(({ options, onStart, onEnd }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<ImageData[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  
  // High-DPI handling with ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const handleResize = () => {
        const rect = parent.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        // Prevent setting 0 dimensions which causes crashes in toDataURL/drawImage
        const targetWidth = Math.floor(rect.width * dpr);
        const targetHeight = Math.floor(rect.height * dpr);

        if (targetWidth === 0 || targetHeight === 0) return;

        // Only resize if dimensions changed to prevent unnecessary clearing
        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            // Save current content if any
            let existingContent: ImageData | null = null;
            const ctx = canvas.getContext('2d');
            if (ctx && canvas.width > 0 && canvas.height > 0) {
                 existingContent = ctx.getImageData(0, 0, canvas.width, canvas.height);
            }

            canvas.width = targetWidth;
            canvas.height = targetHeight;

            if (ctx) {
                ctx.scale(dpr, dpr);
                // Try to restore content (naive approach, mostly clears on resize for simplicity in this context)
                // or just clear history as resizing changes coordinate space.
                // For a robust app, we'd redraw paths, but for this simpler version, we accept clear on drastic resize
                // or keep it blank.
            }
            
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;
        }
    };

    // Initial sizing
    handleResize();

    const observer = new ResizeObserver(handleResize);
    observer.observe(parent);

    return () => observer.disconnect();
  }, []);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    clear: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height); 
      historyRef.current = []; // Clear history
      setHasContent(false);
    },
    undo: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (historyRef.current.length > 0) {
        const lastState = historyRef.current.pop();
        if (lastState) {
          ctx.putImageData(lastState, 0, 0);
        }
        // Check if we are back to empty state
        if (historyRef.current.length === 0) {
             // We can't easily know if the very first state was "empty" or not without checking pixels,
             // but usually if history is empty, we are back to start.
             // However, strictly speaking, we might want to check pixel data. 
             // For UI simplicity:
             if (historyRef.current.length === 0) setHasContent(false);
        }
      }
    },
    getCanvas: () => canvasRef.current,
    toDataURL: (preserveTransparency = false) => {
      const canvas = canvasRef.current;
      if (!canvas || canvas.width === 0 || canvas.height === 0) return '';
      
      if (preserveTransparency) {
          return canvas.toDataURL('image/png');
      }

      const w = canvas.width;
      const h = canvas.height;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = w;
      tempCanvas.height = h;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (!tempCtx) return '';
      
      tempCtx.fillStyle = '#FFFFFF';
      tempCtx.fillRect(0, 0, w, h);
      
      try {
        tempCtx.drawImage(canvas, 0, 0);
      } catch (e) {
        console.error("SignaturePad export error:", e);
        return '';
      }
      
      return tempCanvas.toDataURL('image/png');
    },
    isEmpty: () => !hasContent,
    loadFromImage: (file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            if (result) {
                const img = new Image();
                img.onload = () => drawImageCentered(img);
                img.src = result;
            }
        };
        reader.readAsDataURL(file);
    },
    loadFromDataURL: (dataURL: string) => {
        const img = new Image();
        img.onload = () => drawImageCentered(img);
        img.src = dataURL;
    }
  }));

  const drawImageCentered = (img: HTMLImageElement) => {
      const canvas = canvasRef.current;
      if(!canvas || canvas.width === 0 || canvas.height === 0) return;

      const ctx = canvas.getContext('2d');
      if(ctx) {
          saveState(); // Save state before loading new image
          
          const dpr = window.devicePixelRatio || 1;
          // Don't clear rect here if we want to add to existing, but usually load replaces or adds.
          // Let's assume adds on top.
          // ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
          
          const canvasWidth = canvas.width / dpr;
          const canvasHeight = canvas.height / dpr;
          
          const scale = Math.min(canvasWidth / img.width, canvasHeight / img.height) * 0.8;
          const x = (canvasWidth / 2) - (img.width / 2) * scale;
          const y = (canvasHeight / 2) - (img.height / 2) * scale;

          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          setHasContent(true);
      }
  };

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // getImageData returns the pixel data for the full canvas resolution
    const state = ctx.getImageData(0, 0, canvas.width, canvas.height);
    historyRef.current.push(state);
    
    // Limit history size to prevent memory leaks
    if (historyRef.current.length > 20) {
        historyRef.current.shift();
    }
  };

  const getCoordinates = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 0.5 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      pressure: event.pressure || 0.5,
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    setHasContent(true);
    saveState(); // Save history before this stroke
    
    if (onStart) onStart();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (options.color === PenColor.ERASER) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = options.width * 5; // Eraser needs to be bigger
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = options.color;
        ctx.lineWidth = options.width;
    }
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.closePath();
        // Reset composite operation to default just in case
        ctx.globalCompositeOperation = 'source-over';
      }
      if (onEnd) onEnd();
    }
  };

  return (
    <div className="relative w-full h-full bg-white rounded-xl shadow-inner border border-gray-200 overflow-hidden touch-none">
      {/* Background Guide Lines */}
      <div className="absolute inset-0 pointer-events-none opacity-10 flex flex-col justify-center">
         <div className="border-b border-gray-800 w-full mb-12"></div>
         <div className="border-b border-gray-800 w-full"></div>
      </div>
      
      {!hasContent && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-300 select-none">
           <span className="text-2xl font-handwriting">Assine Aqui</span>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className={`w-full h-full touch-none ${options.color === PenColor.ERASER ? 'cursor-cell' : 'cursor-crosshair'}`}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
        onPointerCancel={stopDrawing}
      />
    </div>
  );
});

SignaturePad.displayName = 'SignaturePad';
export default SignaturePad;