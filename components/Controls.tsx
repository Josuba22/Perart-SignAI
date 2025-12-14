import React from 'react';
import { DrawingOptions, PenColor } from '../types';

interface ControlsProps {
  options: DrawingOptions;
  onOptionsChange: (options: DrawingOptions) => void;
  onClear: () => void;
  onUndo: () => void;
  onSave: () => void;
  onAnalyze: () => void;
  onDigitize: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isAnalyzing: boolean;
  isDigitizing: boolean;
}

const Controls: React.FC<ControlsProps> = ({ 
  options, 
  onOptionsChange, 
  onClear,
  onUndo,
  onSave, 
  onAnalyze,
  onDigitize,
  onUpload,
  isAnalyzing,
  isDigitizing
}) => {
  
  const colors = [PenColor.BLACK, PenColor.BLUE, PenColor.RED, PenColor.GREEN];
  const widths = [1, 3, 5];

  const isLoading = isAnalyzing || isDigitizing;

  return (
    <div className="flex flex-col gap-4 p-4 bg-white border-t border-gray-200 md:rounded-2xl md:shadow-lg md:border md:w-full max-w-2xl mx-auto">
      
      {/* Top Row: Tools & Colors */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        
        {/* Color Picker & Eraser */}
        <div className="flex gap-2 items-center">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => onOptionsChange({ ...options, color: c })}
              className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                options.color === c ? 'border-gray-900 scale-110 shadow-sm' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }}
              aria-label={`Select color ${c}`}
            />
          ))}
          
          <div className="w-px h-8 bg-gray-200 mx-1"></div>

          {/* Eraser Tool */}
          <button
            onClick={() => onOptionsChange({ ...options, color: PenColor.ERASER })}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
                options.color === PenColor.ERASER 
                ? 'bg-gray-800 text-white shadow-md scale-105' 
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            title="Borracha"
          >
            {/* Improved Eraser Icon */}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16.24 3.56l4.2 4.2a2 2 0 0 1 0 2.83l-10 10a2 2 0 0 1-2.83 0l-4.2-4.2a2 2 0 0 1 0-2.83l10-10a2 2 0 0 1 2.83 0Z M13.41 6.39L6.34 13.46l4.2 4.2 7.07-7.07-4.2-4.2Z" />
            </svg>
          </button>
        </div>

        {/* Width Picker (Hidden when Eraser is active to simplify UI, or kept) */}
        {options.color !== PenColor.ERASER && (
            <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-1 animate-fade-in">
            {widths.map((w) => (
                <button
                key={w}
                onClick={() => onOptionsChange({ ...options, width: w })}
                className={`h-8 w-10 flex items-center justify-center rounded-md transition-colors ${
                    options.width === w ? 'bg-white shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
                aria-label={`Select width ${w}`}
                >
                <div 
                    className="bg-current rounded-full" 
                    style={{ width: w * 2, height: w * 2, backgroundColor: options.width === w ? 'black' : 'currentColor' }} 
                />
                </button>
            ))}
            </div>
        )}
      </div>

      {/* Bottom Row: Actions */}
      <div className="grid grid-cols-5 gap-2">
         {/* Undo Button */}
         <button 
           onClick={onUndo}
           disabled={isLoading}
           className="col-span-1 px-2 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center"
           title="Desfazer último traço"
         >
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
         </button>

         {/* Clear Button */}
         <button 
           onClick={onClear}
           disabled={isLoading}
           className="col-span-1 px-2 py-3 text-sm font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 disabled:opacity-50 flex items-center justify-center"
           title="Limpar tudo"
         >
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
         </button>
         
         {/* Upload Button */}
         <label 
           className={`col-span-1 px-2 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center cursor-pointer ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
           title="Carregar Imagem"
         >
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
           <input type="file" className="hidden" accept="image/*" onChange={onUpload} disabled={isLoading}/>
         </label>

         {/* Save Button */}
         <button 
           onClick={onSave}
           disabled={isLoading}
           className="col-span-1 px-2 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center"
           title="Baixar assinatura (Salvar)"
         >
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
         </button>

         {/* Analyze Button */}
         <button 
           onClick={onAnalyze}
           disabled={isLoading}
           className="col-span-1 px-2 py-3 text-sm font-medium text-white bg-brand-600 rounded-xl hover:bg-brand-500 disabled:opacity-50 shadow-md shadow-brand-500/20 flex items-center justify-center"
           title="Analisar Assinatura"
         >
            {isAnalyzing ? (
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            )}
         </button>
      </div>
      
      {/* Secondary Row for less common actions like Digitize */}
       <div className="flex justify-center">
            <button 
                onClick={onDigitize}
                disabled={isLoading}
                className="text-xs font-medium text-brand-600 hover:text-brand-800 flex items-center gap-1 transition-colors"
            >
                {isDigitizing ? (
                    <span className="animate-pulse">Digitalizando...</span>
                ) : (
                    <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                        Digitalizar / Vetorizar (Avançado)
                    </>
                )}
            </button>
       </div>
    </div>
  );
};

export default Controls;