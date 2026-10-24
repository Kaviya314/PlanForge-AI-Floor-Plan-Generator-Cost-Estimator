import React, { useState } from 'react';
import {
  BookOpen,
  Rocket,
  Mic,
  Compass,
  Box,
  Coins,
  FolderKanban,
  HelpCircle,
  ArrowRight,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

export const AboutView: React.FC = () => {
  const [activeTopic, setActiveTopic] = useState<
    'started' | 'voice' | '2d' | '3d' | 'cost' | 'projects' | 'faqs'
  >('started');

  return (
    <div className="w-full space-y-5 animate-fade-in select-none">
      {/* 1. SUB-HEADER BANNER (Matches Screen 6 in reference image) */}
      <div className="bg-gradient-to-r from-[#EBF3FC] via-[#F3F8FD] to-[#EAF2FC] border border-[#DFEAF5] rounded-2xl p-5 flex items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#D7F3F2] border border-teal-200/60 text-[#0D7B75] flex items-center justify-center shrink-0 shadow-xs">
            <BookOpen className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-[22px] font-extrabold tracking-tight text-[#0C1E38]">
              Help &amp; Guide
            </h1>
            <p className="text-xs text-[#5E718D] mt-0.5">
              Learn how to use PlanForge and get the most out of your home design journey.
            </p>
          </div>
        </div>
      </div>

      {/* 2. MAIN 2-COLUMN HELP CENTER */}
      <div className="flex flex-col lg:flex-row items-start gap-5">
        {/* Left Help Navigation Menu (~260px width) */}
        <aside className="w-full lg:w-[260px] shrink-0 bg-white rounded-2xl border border-[#E2E8F0] p-3 shadow-xs space-y-1">
          {/* 1. Getting Started */}
          <button
            onClick={() => setActiveTopic('started')}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-3 cursor-pointer ${
              activeTopic === 'started'
                ? 'bg-[#EBF3FC] text-[#2B66F6]'
                : 'text-[#475569] hover:bg-slate-50 hover:text-[#0C1E38]'
            }`}
          >
            <Rocket className="w-4 h-4 text-[#2B66F6]" />
            <span>Getting Started</span>
          </button>

          {/* 2. Voice to Blueprint */}
          <button
            onClick={() => setActiveTopic('voice')}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-3 cursor-pointer ${
              activeTopic === 'voice'
                ? 'bg-[#EBF3FC] text-[#2B66F6]'
                : 'text-[#475569] hover:bg-slate-50 hover:text-[#0C1E38]'
            }`}
          >
            <Mic className="w-4 h-4 text-teal-600" />
            <span>Voice to Blueprint</span>
          </button>

          {/* 3. 2D Floor Plan Editor */}
          <button
            onClick={() => setActiveTopic('2d')}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-3 cursor-pointer ${
              activeTopic === '2d'
                ? 'bg-[#EBF3FC] text-[#2B66F6]'
                : 'text-[#475569] hover:bg-slate-50 hover:text-[#0C1E38]'
            }`}
          >
            <Compass className="w-4 h-4 text-blue-500" />
            <span>2D Floor Plan Editor</span>
          </button>

          {/* 4. 3D Model Viewer */}
          <button
            onClick={() => setActiveTopic('3d')}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-3 cursor-pointer ${
              activeTopic === '3d'
                ? 'bg-[#EBF3FC] text-[#2B66F6]'
                : 'text-[#475569] hover:bg-slate-50 hover:text-[#0C1E38]'
            }`}
          >
            <Box className="w-4 h-4 text-indigo-500" />
            <span>3D Model Viewer</span>
          </button>

          {/* 5. Cost Estimator */}
          <button
            onClick={() => setActiveTopic('cost')}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-3 cursor-pointer ${
              activeTopic === 'cost'
                ? 'bg-[#EBF3FC] text-[#2B66F6]'
                : 'text-[#475569] hover:bg-slate-50 hover:text-[#0C1E38]'
            }`}
          >
            <Coins className="w-4 h-4 text-amber-500" />
            <span>Cost Estimator</span>
          </button>

          {/* 6. Projects */}
          <button
            onClick={() => setActiveTopic('projects')}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-3 cursor-pointer ${
              activeTopic === 'projects'
                ? 'bg-[#EBF3FC] text-[#2B66F6]'
                : 'text-[#475569] hover:bg-slate-50 hover:text-[#0C1E38]'
            }`}
          >
            <FolderKanban className="w-4 h-4 text-emerald-500" />
            <span>Projects</span>
          </button>

          {/* 7. FAQs */}
          <button
            onClick={() => setActiveTopic('faqs')}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-3 cursor-pointer ${
              activeTopic === 'faqs'
                ? 'bg-[#EBF3FC] text-[#2B66F6]'
                : 'text-[#475569] hover:bg-slate-50 hover:text-[#0C1E38]'
            }`}
          >
            <HelpCircle className="w-4 h-4 text-purple-500" />
            <span>FAQs</span>
          </button>
        </aside>

        {/* Right Main Content Panel (Matches Screen 6 in reference image) */}
        <main className="flex-1 min-w-0 bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-8">
          {activeTopic === 'started' && (
            <div className="space-y-8 animate-fade-in">
              {/* Header with Architectural House Graphic on Right */}
              <div className="flex items-start justify-between gap-6 pb-6 border-b border-[#F1F5F9]">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#0C1E38]">
                    Getting Started
                  </h2>
                  <p className="text-xs sm:text-sm text-[#64748B] mt-1">
                    Learn the basics and create your first home design in minutes.
                  </p>
                </div>

                {/* Cute Isometric Architectural House Illustration */}
                <div className="w-28 h-20 shrink-0 hidden sm:block">
                  <svg viewBox="0 0 100 80" className="w-full h-full">
                    <polygon points="50,10 90,30 50,50 10,30" fill="#E2EBF5" stroke="#2B66F6" strokeWidth="1.5" />
                    <polygon points="10,30 50,50 50,75 10,55" fill="#F8FAFC" stroke="#2B66F6" strokeWidth="1.5" />
                    <polygon points="50,50 90,30 90,55 50,75" fill="#CBD5E1" stroke="#2B66F6" strokeWidth="1.5" />
                    <rect x="25" y="42" width="10" height="15" fill="#2B66F6" opacity="0.3" />
                    <rect x="65" y="42" width="12" height="15" fill="#0D9488" opacity="0.3" />
                  </svg>
                </div>
              </div>

              {/* 4 Step Process (1, 2, 3, 4 with colored circular numbers) */}
              <div className="space-y-5">
                {/* Step 1 */}
                <div className="flex items-start gap-4">
                  <div className="w-7 h-7 rounded-full bg-[#2B66F6] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    1
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-[#0C1E38]">
                      Describe your home
                    </h3>
                    <p className="text-xs text-[#64748B]">
                      Use text or voice to tell us your requirements.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-4">
                  <div className="w-7 h-7 rounded-full bg-[#0D9488] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    2
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-[#0C1E38]">
                      Generate a floor plan
                    </h3>
                    <p className="text-xs text-[#64748B]">
                      Our AI will create a detailed 2D layout based on your input.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-4">
                  <div className="w-7 h-7 rounded-full bg-[#2B66F6] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    3
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-[#0C1E38]">
                      Explore in 3D
                    </h3>
                    <p className="text-xs text-[#64748B]">
                      View and adjust your design in an interactive 3D model.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex items-start gap-4">
                  <div className="w-7 h-7 rounded-full bg-[#2B66F6] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    4
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-[#0C1E38]">
                      Check the cost
                    </h3>
                    <p className="text-xs text-[#64748B]">
                      Get a detailed construction estimate with material and labour breakdown.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Card: Need more help? */}
              <div className="p-4 rounded-xl bg-[#F0FAF7] border border-[#E2F4EE] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[#0C1E38] block">Need more help?</span>
                  <span className="text-[11px] text-[#64748B]">Visit our FAQ or contact support.</span>
                </div>

                <button
                  onClick={() => setActiveTopic('faqs')}
                  className="px-3.5 py-1.5 rounded-lg border border-[#0D9488] text-xs font-semibold text-[#0D9488] hover:bg-teal-50 transition cursor-pointer flex items-center gap-1 self-start sm:self-auto"
                >
                  <span>View FAQs</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {activeTopic === 'voice' && (
            <div className="space-y-5 animate-fade-in">
              <h2 className="text-xl font-bold text-[#0C1E38]">Voice to Blueprint Guide</h2>
              <p className="text-xs text-[#64748B] leading-relaxed">
                PlanForge supports voice dictation in both English and Tamil. Click the microphone button in the Requirements page and speak your requirements naturally, such as:
              </p>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-[#0C1E38]">
                &ldquo;Create a 1200 square feet east-facing house with three bedrooms, two bathrooms, a modular kitchen, living room, and car parking.&rdquo;
              </div>
              <p className="text-xs text-[#64748B] leading-relaxed">
                The speech recognition engine automatically converts your spoken request into editable text and extracts parameters for bedrooms, plot dimensions, and parking.
              </p>
            </div>
          )}

          {activeTopic === '2d' && (
            <div className="space-y-5 animate-fade-in">
              <h2 className="text-xl font-bold text-[#0C1E38]">2D Floor Plan Editor Guide</h2>
              <p className="text-xs text-[#64748B] leading-relaxed">
                The 2D editor provides an interactive architectural canvas where you can click and drag rooms, adjust dimensions, duplicate spaces, and add doors and windows. Every adjustment updates the shared project state instantly.
              </p>
            </div>
          )}

          {activeTopic === '3d' && (
            <div className="space-y-5 animate-fade-in">
              <h2 className="text-xl font-bold text-[#0C1E38]">3D Model Viewer Guide</h2>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Inspect your generated house in full 3D WebGL. Hold the left mouse button to orbit, right-click to pan, and use the scroll wheel to zoom. Toggle between dollhouse cutaway walls and full-height exterior walls using the floating dock.
              </p>
            </div>
          )}

          {activeTopic === 'cost' && (
            <div className="space-y-5 animate-fade-in">
              <h2 className="text-xl font-bold text-[#0C1E38]">Cost Estimator & Takeoff Guide</h2>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Quantities are computed using CPWD empirical ratios based on built-up area. Click on any unit rate in the breakdown table to adjust it to local contractor prices.
              </p>
            </div>
          )}

          {activeTopic === 'projects' && (
            <div className="space-y-5 animate-fade-in">
              <h2 className="text-xl font-bold text-[#0C1E38]">Projects Guide</h2>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Save plans locally in browser storage, browse past projects, filter by house type, and reopen any project at any time.
              </p>
            </div>
          )}

          {activeTopic === 'faqs' && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-xl font-bold text-[#0C1E38]">Frequently Asked Questions</h2>
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-slate-50">
                  <span className="font-bold text-[#0C1E38] block">Is PlanForge an official construction bid?</span>
                  <span className="text-[#64748B] mt-1 block">PlanForge is a preliminary feasibility and spatial exploration tool. Structural sign-off from an on-site engineer is required before construction.</span>
                </div>
                <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-slate-50">
                  <span className="font-bold text-[#0C1E38] block">Do my changes stay saved when switching tabs?</span>
                  <span className="text-[#64748B] mt-1 block">Yes, all project dimensions, room adjustments, and custom unit rates are kept in sync across all tabs without data loss.</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
