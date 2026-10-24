import React from 'react';
import { AIExplanationResponse } from '../services/api';
import { Sparkles, X, Sun, Compass, DollarSign, CheckCircle2, ShieldCheck } from 'lucide-react';

interface AIDesignNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AIExplanationResponse | null;
  isLoading: boolean;
  projectName: string;
}

export const AIDesignNotesModal: React.FC<AIDesignNotesModalProps> = ({
  isOpen,
  onClose,
  data,
  isLoading,
  projectName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-teal-50/60 to-emerald-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Architectural Spatial Analysis</h3>
              <p className="text-xs text-slate-500 font-medium">Project: {projectName}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {isLoading ? (
            <div className="py-12 text-center space-y-3">
              <Sparkles className="w-8 h-8 mx-auto text-teal-600 animate-spin" />
              <p className="text-sm font-semibold text-slate-700">Synthesizing Architectural Reasoning...</p>
              <p className="text-xs text-slate-400">Evaluating zoning, daylighting, and structural efficiency...</p>
            </div>
          ) : data ? (
            <>
              {/* Mode Pill */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <span className="font-semibold text-slate-800">
                    Source: {data.mode === 'ai' ? `Google Gemma / GenAI (${data.model || 'Gemma 4'})` : 'Architectural Rule Heuristic Engine'}
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                  {data.mode}
                </span>
              </div>

              {/* Summary */}
              <div className="space-y-1">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block">
                  Executive Summary
                </span>
                <p className="text-slate-600 leading-relaxed bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                  {data.explanation.summary}
                </p>
              </div>

              {/* Zoning & Flow */}
              <div className="space-y-1.5">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-teal-600" />
                  Zoning & Circulation Flow
                </span>
                <p className="text-slate-600 leading-relaxed bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                  {data.explanation.zoning_analysis}
                </p>
              </div>

              {/* Daylighting & Ventilation */}
              <div className="space-y-1.5">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  Daylight & Cross-Ventilation
                </span>
                <p className="text-slate-600 leading-relaxed bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                  {data.explanation.lighting_ventilation}
                </p>
              </div>

              {/* Cost Optimization Tips */}
              <div className="space-y-2">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  Cost Reduction & Structural Optimization Tips
                </span>
                <div className="space-y-2">
                  {data.explanation.cost_optimizations.map((tip, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-emerald-950 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-6 text-slate-500">No explanation available.</div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition"
          >
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  );
};
