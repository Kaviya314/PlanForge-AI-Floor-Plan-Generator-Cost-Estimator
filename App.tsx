/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { GeneratePlanRequest, PlanLayout, Room, UnitRateOverride, ActiveTab } from './types/plan';
import { validateLayout } from './utils/validation';
import { calculateCostEstimate } from './utils/costCalculation';
import { generateDeterministicPlan } from './utils/demoGenerator';
import {
  apiGeneratePlan,
  apiExplainLayout,
  fetchHealth,
  AIExplanationResponse,
} from './services/api';
import {
  saveProject,
  getCurrentProject,
  saveCurrentProject,
  getStoredRates,
  saveStoredRates,
  getSavedProjects,
  SavedProject,
} from './services/storage';

import { Header } from './components/Header';
import { PlanForm } from './components/PlanForm';
import { FloorPlanCanvas } from './components/FloorPlanCanvas';
import { ThreeDVisualizer } from './components/ThreeDVisualizer';
import { RoomPropertiesPanel } from './components/RoomPropertiesPanel';
import { CostDashboard } from './components/CostDashboard';
import { SavedProjectsView } from './components/SavedProjectsView';
import { AboutView } from './components/AboutView';
import { AIDesignNotesModal } from './components/AIDesignNotesModal';
import { CadDesignStudio } from './components/CadDesignStudio';
import { ThreeDStudioDashboard } from './components/ThreeDStudioDashboard';

import {
  Compass,
  Sliders,
  FolderKanban,
  Wand2,
  AlertTriangle,
  CheckCircle2,
  Info,
  Box,
  Layers,
  ArrowRight,
  ShieldCheck,
  Save,
  Building2,
  Sparkles,
  ChevronRight,
  Clock,
  ExternalLink,
  Mic
} from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<ActiveTab>('3d');
  const [aiConfigured, setAiConfigured] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warn' } | null>(null);

  // Standard architectural starting project matching reference specification: 30x40 ft (1200 sq.ft), 3BHK Home
  const initialReq: GeneratePlanRequest = {
    natural_prompt:
      'Create a 1200 sq ft east-facing house with three bedrooms, two bathrooms, an open kitchen, living room, dining area and car parking.',
    project_name: '3BHK Home',
    plot_width: 30,
    plot_length: 40,
    unit: 'ft',
    house_type: '3BHK',
    num_bedrooms: 3,
    num_bathrooms: 2,
    num_kitchens: 1,
    num_living_rooms: 1,
    has_balcony: false,
    has_dining: true,
    has_parking: true,
    has_garden: false,
    floors: 1,
    design_style: 'Contemporary Minimalist',
    budget_inr: 1600000,
  };

  const [layout, setLayout] = useState<PlanLayout>(() => {
    const cached = getCurrentProject();
    if (cached && cached.plot && cached.rooms) return cached;
    return generateDeterministicPlan(initialReq);
  });

  const [rateOverrides, setRateOverrides] = useState<UnitRateOverride>(() => getStoredRates());
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // AI Explanation State
  const [showAIModal, setShowAIModal] = useState<boolean>(false);
  const [aiExplanation, setAiExplanation] = useState<AIExplanationResponse | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);

  // Saved projects for Home workspace view
  const [recentProjects, setRecentProjects] = useState<SavedProject[]>([]);

  const refreshRecentProjects = () => {
    setRecentProjects(getSavedProjects());
  };

  // Check health and server AI configuration
  useEffect(() => {
    fetchHealth().then((health) => {
      setAiConfigured(health.ai_configured);
    });
    refreshRecentProjects();
  }, []);

  // Show transient toast
  const showToast = (text: string, type: 'success' | 'info' | 'warn' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Synchronously compute validation and cost results whenever layout or overrides change
  const validation = useMemo(() => {
    return validateLayout(layout);
  }, [layout]);

  const estimate = useMemo(() => {
    return calculateCostEstimate(layout, rateOverrides);
  }, [layout, rateOverrides]);

  // Keep localStorage synced with active layout
  useEffect(() => {
    saveCurrentProject(layout);
  }, [layout]);

  // Generate Plan Handler
  const handleGeneratePlan = async (req: GeneratePlanRequest) => {
    setIsLoading(true);
    try {
      const result = await apiGeneratePlan(req);
      setLayout(result.plan);
      setSelectedRoomId(result.plan.rooms[0]?.id || null);

      if (result.mode === 'ai' && !(result as any).error_fallback) {
        showToast('Generated architectural floor plan via AI engine.', 'success');
        try {
          confetti({
            particleCount: 30,
            spread: 55,
            origin: { y: 0.8 },
            colors: ['#0F766E', '#14B8A6', '#2DD4BF'],
          });
        } catch {
          // ignore
        }
      } else {
        showToast(
          (result as any).error_fallback
            ? 'Generated layout using deterministic architectural rules.'
            : 'Floor plan and cost estimate generated.',
          'info'
        );
      }

      // Transition to Floor Plan tab
      setCurrentTab('plan');
    } catch (err: any) {
      showToast('Error connecting to engine, falling back to local layout.', 'warn');
      const fallback = generateDeterministicPlan(req);
      setLayout(fallback);
      setCurrentTab('plan');
    } finally {
      setIsLoading(false);
    }
  };

  // Room Manipulation Handlers
  const handleUpdateRoom = (updated: Room) => {
    setLayout((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => (r.id === updated.id ? updated : r)),
      updated_at: new Date().toISOString(),
    }));
  };

  const handleUpdateRoomPosition = (roomId: string, newX: number, newY: number) => {
    setLayout((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => (r.id === roomId ? { ...r, x: newX, y: newY } : r)),
      updated_at: new Date().toISOString(),
    }));
  };

  const handleAddRoom = () => {
    const count = layout.rooms.length + 1;
    const newRoom: Room = {
      id: `room-custom-${Date.now()}`,
      name: `Custom Room ${count}`,
      type: 'custom',
      x: 3,
      y: 3,
      width: Math.min(12, Math.max(8, layout.plot.width / 3)),
      length: Math.min(12, Math.max(8, layout.plot.length / 3)),
      doors: [{ wall: 'bottom', offset: 2, width: 3 }],
      windows: [{ wall: 'top', offset: 2, width: 3 }],
    };

    setLayout((prev) => ({
      ...prev,
      rooms: [...prev.rooms, newRoom],
      updated_at: new Date().toISOString(),
    }));
    setSelectedRoomId(newRoom.id);
    showToast(`Added new room to layout.`, 'info');
  };

  const handleDeleteRoom = (roomId: string) => {
    if (layout.rooms.length <= 1) {
      showToast('Cannot delete the last remaining room.', 'warn');
      return;
    }
    setLayout((prev) => ({
      ...prev,
      rooms: prev.rooms.filter((r) => r.id !== roomId),
      updated_at: new Date().toISOString(),
    }));
    if (selectedRoomId === roomId) {
      setSelectedRoomId(layout.rooms[0]?.id || null);
    }
    showToast('Room removed.', 'info');
  };

  const handleDuplicateRoom = (roomId: string) => {
    const target = layout.rooms.find((r) => r.id === roomId);
    if (!target) return;

    const dup: Room = {
      ...target,
      id: `room-copy-${Date.now()}`,
      name: `${target.name} (Copy)`,
      x: Math.min(layout.plot.width - target.width, target.x + 2),
      y: Math.min(layout.plot.length - target.length, target.y + 2),
    };

    setLayout((prev) => ({
      ...prev,
      rooms: [...prev.rooms, dup],
      updated_at: new Date().toISOString(),
    }));
    setSelectedRoomId(dup.id);
    showToast(`Duplicated ${target.name}.`, 'info');
  };

  // Unit rate overrides
  const handleUpdateRate = (itemId: string, newRate: number) => {
    setRateOverrides((prev: UnitRateOverride) => {
      const updated = { ...prev, [itemId]: newRate };
      saveStoredRates(updated);
      return updated;
    });
    showToast('Custom rate updated in estimate.', 'success');
  };

  const handleResetRates = () => {
    setRateOverrides({});
    saveStoredRates({});
    showToast('Reset all rates to baseline schedules.', 'info');
  };

  // Project persistence
  const handleSaveCurrent = () => {
    saveProject(layout, rateOverrides);
    refreshRecentProjects();
    showToast(`Saved "${layout.project_name}" to projects.`, 'success');
  };

  const handleLoadProject = (newLayout: PlanLayout, newRates?: UnitRateOverride) => {
    setLayout(newLayout);
    if (newRates) {
      setRateOverrides(newRates);
    }
    setSelectedRoomId(newLayout.rooms[0]?.id || null);
    setCurrentTab('plan');
    showToast(`Opened project "${newLayout.project_name}".`, 'success');
  };

  // AI Explanation
  const handleOpenAIExplain = async () => {
    setShowAIModal(true);
    setIsLoadingAI(true);
    try {
      const res = await apiExplainLayout(layout);
      setAiExplanation(res);
    } catch {
      // fallback handled gracefully
    } finally {
      setIsLoadingAI(false);
    }
  };

  return (
    <div className="min-h-screen planforge-page-bg text-[#10294F] font-sans flex flex-col antialiased selection:bg-[#3168F5] selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-fade-in">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 ${
              toastMessage.type === 'success'
                ? 'bg-[#10294F] text-white border-slate-700'
                : toastMessage.type === 'warn'
                ? 'bg-rose-950 text-rose-100 border-rose-800'
                : 'bg-[#10294F] text-white border-slate-700'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : toastMessage.type === 'warn' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            ) : (
              <Info className="w-4 h-4 text-blue-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main App Navigation Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenCreate={() => setCurrentTab('input')}
        aiConfigured={aiConfigured}
        activeMode={layout.mode}
        projectName={layout.project_name}
      />

      {/* Primary Content View Container */}
      <main className="flex-1 max-w-[1520px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* VIEW 1: REQUIREMENTS & HOME WORKSPACE */}
        {currentTab === 'input' && (
          <div className="space-y-10 animate-fade-in">
            {/* Architectural Hero Banner */}
            <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#E7E5E0] shadow-sm relative overflow-hidden">
              <div className="max-w-3xl space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF9F6] border border-[#E7E5E0] text-[#0F766E] text-xs font-semibold tracking-wide uppercase">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Preliminary Home Design & Planning</span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-[#18191C] leading-[1.15]">
                  Design a home that fits your life.
                </h1>

                <p className="text-base sm:text-lg text-[#0F766E] font-medium leading-relaxed pt-0.5">
                  “From a Prompt to a Blueprint, From a Blueprint to a Budget.”
                </p>

                <p className="text-sm sm:text-base text-[#52525B] font-normal leading-relaxed">
                  Describe your dream building using text or voice. PlanForge synthesizes precision 2D CAD floor plans, real 3D WebGL models, structural BIM framing, and CPWD construction budgets.
                </p>

                {/* Quick Navigation Action Strip */}
                <div className="pt-4 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setCurrentTab('plan')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#18191C] hover:bg-[#27272A] transition cursor-pointer shadow-xs"
                  >
                    <Compass className="w-3.5 h-3.5 text-teal-400" />
                    <span>Open CAD Design Studio</span>
                    <ArrowRight className="w-3 h-3 text-zinc-400" />
                  </button>

                  <button
                    onClick={() => setCurrentTab('3d')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#18191C] bg-[#FAF9F6] hover:bg-[#F0EFEA] border border-[#E7E5E0] transition cursor-pointer"
                  >
                    <Box className="w-3.5 h-3.5 text-[#0F766E]" />
                    <span>Interactive 3D Preview</span>
                  </button>

                  <a
                    href="#voice-blueprint-section"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#0F766E] bg-teal-50 hover:bg-teal-100/70 border border-teal-200/70 transition cursor-pointer"
                  >
                    <Mic className="w-3.5 h-3.5 text-[#0F766E]" />
                    <span>Voice-to-Blueprint (EN & தமிழ்)</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Main Project Creation Panel (PlanForm) */}
            <PlanForm onSubmit={handleGeneratePlan} isLoading={isLoading} aiConfigured={aiConfigured} />

            {/* Recent User Projects (Real data from LocalStorage only) */}
            {recentProjects.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-[#0D9488]" />
                    <span>Recent Saved Projects</span>
                  </h3>
                  <button
                    onClick={() => setCurrentTab('projects')}
                    className="text-xs font-medium text-teal-400 hover:text-teal-300 hover:underline"
                  >
                    View All ({recentProjects.length})
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {recentProjects.slice(0, 3).map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleLoadProject(p.layout, p.rate_overrides)}
                      className="p-5 bg-white rounded-2xl border border-[#E7E5E0] hover:border-[#0F766E]/40 hover:shadow-xs transition cursor-pointer space-y-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#18191C] group-hover:text-[#0F766E] transition-colors">
                          {p.name}
                        </span>
                        <span className="text-[10px] text-[#71717A] bg-[#FAF9F6] px-2 py-0.5 rounded-md border border-[#E7E5E0]">
                          {p.layout.house_type}
                        </span>
                      </div>
                      <div className="text-xs text-[#71717A]">
                        {p.layout.plot.width}×{p.layout.plot.length} {p.layout.plot.unit} • {p.layout.rooms.length} rooms
                      </div>
                      <div className="text-[11px] text-[#A1A1AA] flex items-center gap-1 pt-1 border-t border-[#F0EFEA]">
                        <Clock className="w-3 h-3" />
                        <span>Saved {new Date(p.saved_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: EXACT 3D STUDIO DASHBOARD */}
        {currentTab === '3d' && (
          <ThreeDStudioDashboard
            layout={layout}
            estimate={estimate}
            selectedRoomId={selectedRoomId}
            onSelectRoom={setSelectedRoomId}
            onSelectTab={setCurrentTab}
          />
        )}

        {/* VIEW 2: 2D FLOOR PLAN & CAD DESIGN STUDIO */}
        {(currentTab === 'plan' || currentTab === 'bim') && (
          <div className="w-full animate-fade-in -mt-4">
            <CadDesignStudio
              layout={layout}
              validation={validation}
              selectedRoomId={selectedRoomId}
              onSelectRoom={setSelectedRoomId}
              onUpdateLayout={(newLayout) => {
                setLayout(newLayout);
                setSelectedRoomId(newLayout.rooms[0]?.id || null);
              }}
              activeStudioTab={currentTab === 'bim' ? 'bim' : 'plan'}
              onChangeStudioTab={(tab) => setCurrentTab(tab)}
              rateOverrides={rateOverrides}
              onUpdateRate={handleUpdateRate}
              onResetRates={handleResetRates}
              onSaveProject={handleSaveCurrent}
              onExitToHome={() => setCurrentTab('input')}
              onOpenAIExplain={handleOpenAIExplain}
              aiConfigured={aiConfigured}
            />
          </div>
        )}

        {/* VIEW 4: COST ESTIMATOR PAGE */}
        {currentTab === 'cost' && (
          <div className="space-y-6 animate-fade-in bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/80 text-[#0D9488] flex items-center justify-center shrink-0">
                  <Sliders className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-[#10294F]">Cost Estimator &amp; Takeoff</h1>
                  <p className="text-xs text-[#64748B]">Parametric construction quantities, labour subtotals and CPWD schedule benchmarks</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentTab('3d')}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#10294F] bg-[#F5F8FD] hover:bg-slate-100 border border-[#E2E8F0] transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Box className="w-3.5 h-3.5 text-[#3168F5]" />
                  <span>View in 3D</span>
                </button>
                <button
                  onClick={() => setCurrentTab('plan')}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#0D9488] bg-teal-50 hover:bg-teal-100/80 border border-teal-200/80 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Edit in 2D Plan</span>
                </button>
              </div>
            </div>
            <CostDashboard
              layout={layout}
              estimate={estimate}
              rateOverrides={rateOverrides}
              onUpdateRate={handleUpdateRate}
              onResetRates={handleResetRates}
            />
          </div>
        )}

        {/* VIEW 5: PROJECT ARCHIVE & SAVED PLANS */}
        {currentTab === 'projects' && (
          <div className="space-y-6 animate-fade-in">
            <SavedProjectsView
              currentLayout={layout}
              currentRates={rateOverrides}
              onLoadProject={handleLoadProject}
              onSaveCurrent={handleSaveCurrent}
            />
          </div>
        )}

        {/* VIEW 6: ARCHITECTURAL GUIDE & METHODOLOGY */}
        {currentTab === 'guide' && (
          <div className="space-y-6 animate-fade-in">
            <AboutView />
          </div>
        )}
      </main>

      {/* AI Spatial Reasoning Modal */}
      <AIDesignNotesModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        data={aiExplanation}
        isLoading={isLoadingAI}
        projectName={layout.project_name}
      />

      {/* Clean Subtle Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-[#06142E]/70 backdrop-blur-md py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="font-semibold text-white">PlanForge</span>
            <span>&bull;</span>
            <span>Architectural Design &amp; Construction Planning</span>
          </div>

          <div className="text-[11px] text-slate-400 text-center sm:text-right">
            Preliminary feasibility exploration tool. Real construction requires on-site structural engineering sign-off.
          </div>
        </div>
      </footer>
    </div>
  );
}
