import React, { useState } from 'react';
import {
  Compass,
  Sliders,
  FolderKanban,
  Box,
  BookOpen,
  Check,
  Sun,
  Moon,
  ChevronDown
} from 'lucide-react';
import { ActiveTab } from '../types/plan';

interface HeaderProps {
  currentTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenCreate: () => void;
  aiConfigured: boolean;
  activeMode: 'ai' | 'demo';
  projectName: string;
  themeMode?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenCreate,
  aiConfigured,
  activeMode,
  projectName,
  themeMode = 'light',
  onToggleTheme,
}) => {
  const [internalDark, setInternalDark] = useState<boolean>(themeMode === 'dark');

  const handleToggle = () => {
    setInternalDark(!internalDark);
    if (onToggleTheme) {
      onToggleTheme();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E5EAF2] shadow-xs select-none">
      <div className="max-w-[1540px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[78px]">
          {/* Left: Brand Logo & 2-Line Tagline */}
          <div
            className="flex items-center gap-3.5 cursor-pointer group shrink-0"
            onClick={() => onSelectTab('input')}
          >
            {/* Logo Icon: Dark Navy Rounded Square with Blueprint Mesh */}
            <div className="w-10 h-10 rounded-xl bg-[#0C1E38] flex items-center justify-center text-white shadow-xs group-hover:bg-[#132A4F] transition-colors">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#26C6DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18M5 21V7l7-4 7 4v14M9 10h6M9 14h6M9 18h6" />
              </svg>
            </div>

            {/* Wordmark */}
            <div className="flex items-baseline gap-3">
              <span className="font-extrabold text-[22px] tracking-tight text-[#0C1E38] font-sans">
                Plan<span className="text-[#0D9488]">Forge</span>
              </span>

              {/* Tagline: 2 Lines as in reference */}
              <div className="hidden xl:flex flex-col text-[11px] leading-[1.2] text-[#64748B] pl-2 border-l border-[#E2E8F0]">
                <span>From a Prompt to a Blueprint,</span>
                <span>From a Blueprint to a Budget.</span>
              </div>
            </div>
          </div>

          {/* Center: 4 Step Workflow Navigation */}
          <nav className="hidden lg:flex items-center space-x-2">
            {/* Step 1: Requirements (Completed: Teal checkmark circle) */}
            <button
              onClick={() => onSelectTab('input')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
                currentTab === 'input'
                  ? 'bg-[#2B66F6] text-white font-semibold shadow-sm'
                  : 'text-[#1E293B] hover:text-[#0C1E38]'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                currentTab === 'input'
                  ? 'border-white text-white'
                  : 'border-[#0D9488] text-[#0D9488] bg-teal-50'
              }`}>
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
              <span>1. Requirements</span>
            </button>

            {/* Step 2: 2D Floor Plan (Completed: Teal checkmark circle) */}
            <button
              onClick={() => onSelectTab('plan')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
                currentTab === 'plan'
                  ? 'bg-[#2B66F6] text-white font-semibold shadow-sm'
                  : 'text-[#1E293B] hover:text-[#0C1E38]'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                currentTab === 'plan'
                  ? 'border-white text-white'
                  : 'border-[#0D9488] text-[#0D9488] bg-teal-50'
              }`}>
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
              <span>2. 2D Floor Plan</span>
            </button>

            {/* Step 3: 3. 3D Model (Active: Bright Blue Pill Button with 3D Cube Icon) */}
            <button
              onClick={() => onSelectTab('3d')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                currentTab === '3d'
                  ? 'bg-[#2B66F6] text-white shadow-md shadow-[#2B66F6]/20'
                  : 'text-[#1E293B] hover:text-[#0C1E38] hover:bg-slate-50'
              }`}
            >
              <Box className="w-4 h-4" />
              <span>3. 3D Model</span>
            </button>

            {/* Step 4: 4. Cost Estimator */}
            <button
              onClick={() => onSelectTab('cost')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
                currentTab === 'cost'
                  ? 'bg-[#2B66F6] text-white font-semibold shadow-sm'
                  : 'text-[#64748B] hover:text-[#1E293B] hover:bg-slate-50'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-[#64748B]" />
              <span>4. Cost Estimator</span>
            </button>
          </nav>

          {/* Right: Projects, Guide, Day/Night Toggle & Avatar */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelectTab('projects')}
              className={`hidden md:flex items-center gap-1.5 text-xs font-medium px-2 py-1.5 rounded-lg transition cursor-pointer ${
                currentTab === 'projects' ? 'text-[#2B66F6] font-semibold' : 'text-[#64748B] hover:text-[#0C1E38]'
              }`}
            >
              <FolderKanban className="w-4 h-4" />
              <span>Projects</span>
            </button>

            <button
              onClick={() => onSelectTab('guide')}
              className={`hidden md:flex items-center gap-1.5 text-xs font-medium px-2 py-1.5 rounded-lg transition cursor-pointer ${
                currentTab === 'guide' ? 'text-[#2B66F6] font-semibold' : 'text-[#64748B] hover:text-[#0C1E38]'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Guide</span>
            </button>

            {/* Day / Night Theme Capsule Toggle */}
            <div
              onClick={handleToggle}
              className="flex items-center p-1 rounded-full border border-[#E2E8F0] bg-white cursor-pointer hover:border-slate-300 transition-colors"
              title="Toggle Day / Night mode"
            >
              <span className={`p-1 rounded-full ${!internalDark ? 'text-amber-500 bg-amber-50' : 'text-slate-400'}`}>
                <Sun className="w-3.5 h-3.5" />
              </span>
              <span className={`p-1 rounded-full ${internalDark ? 'text-indigo-400 bg-indigo-950' : 'text-slate-400'}`}>
                <Moon className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* User Profile Avatar with dropdown arrow: 'K' in royal blue */}
            <div className="flex items-center gap-1 cursor-pointer pl-1">
              <div className="w-8 h-8 rounded-full bg-[#1A4FBA] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                K
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bar */}
      <div className="lg:hidden flex items-center justify-around border-t border-[#E5EAF2] py-2 bg-[#F8FAFD] text-xs font-medium text-[#64748B] px-2">
        <button
          onClick={() => onSelectTab('input')}
          className={`px-2.5 py-1 rounded-lg ${currentTab === 'input' ? 'bg-[#2B66F6] text-white font-semibold' : ''}`}
        >
          1. Requirements
        </button>
        <button
          onClick={() => onSelectTab('plan')}
          className={`px-2.5 py-1 rounded-lg ${currentTab === 'plan' ? 'bg-[#2B66F6] text-white font-semibold' : ''}`}
        >
          2. 2D Plan
        </button>
        <button
          onClick={() => onSelectTab('3d')}
          className={`px-2.5 py-1 rounded-lg ${currentTab === '3d' ? 'bg-[#2B66F6] text-white font-semibold' : ''}`}
        >
          3. 3D Model
        </button>
        <button
          onClick={() => onSelectTab('cost')}
          className={`px-2.5 py-1 rounded-lg ${currentTab === 'cost' ? 'bg-[#2B66F6] text-white font-semibold' : ''}`}
        >
          4. Cost
        </button>
      </div>
    </header>
  );
};
