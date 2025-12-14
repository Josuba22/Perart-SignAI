import React from 'react';
import { SignatureAnalysisResult } from '../types';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: SignatureAnalysisResult | null;
}

const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, onClose, data }) => {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up md:animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-brand-600 to-brand-500 text-white flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold">Análise de Assinatura</h2>
            <p className="text-brand-100 text-sm mt-1">Grafologia via IA</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Identity & Score */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome Identificado</p>
              <p className="text-2xl font-serif font-bold text-gray-900">{data.identifiedName || "Desconhecido"}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Legibilidade</p>
              <div className="flex items-baseline justify-end gap-1 text-brand-600">
                <span className="text-2xl font-bold">{data.legibilityScore}</span>
                <span className="text-sm font-medium text-gray-400">/10</span>
              </div>
            </div>
          </div>

          {/* Traits Chips */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Traços de Personalidade</p>
            <div className="flex flex-wrap gap-2">
              {data.personalityTraits.map((trait, idx) => (
                <span key={idx} className="px-3 py-1 bg-brand-50 text-brand-900 text-sm font-medium rounded-full border border-brand-100">
                  {trait}
                </span>
              ))}
            </div>
          </div>

          {/* Professionalism */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Profissionalismo</p>
            <p className="text-gray-800 font-medium">{data.professionalism}</p>
          </div>

          {/* Full Summary */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Análise Detalhada</p>
            <p className="text-gray-600 leading-relaxed text-sm">
              {data.graphologySummary}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-white border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Fechar Análise
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;