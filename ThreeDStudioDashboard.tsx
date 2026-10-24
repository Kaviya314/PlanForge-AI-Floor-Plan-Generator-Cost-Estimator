import React, { useState } from 'react';
import {
  PlanLayout,
  CostEstimateResult,
  ActiveTab,
  ThreeDStyle,
  ThreeDBackground,
  ThreeDActiveTool,
  ThreeDViewAngle
} from '../types/plan';
import { ThreeDVisualizer } from './ThreeDVisualizer';
import {
  Home,
  RotateCcw,
  Move,
  Search,
  Rotate3d,
  ArrowRight,
  Eye,
  Sliders,
  Map,
  Coins
} from 'lucide-react';

interface ThreeDStudioDashboardProps {
  layout: PlanLayout;
  estimate: CostEstimateResult;
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string | null) => void;
  onSelectTab: (tab: ActiveTab) => void;
}

export const ThreeDStudioDashboard: React.FC<ThreeDStudioDashboardProps> = ({
  layout,
  estimate,
  selectedRoomId,
  onSelectRoom,
  onSelectTab,
}) => {
  const [activeTool, setActiveTool] = useState<ThreeDActiveTool>('orbit');
  const [styleMode, setStyleMode] = useState<ThreeDStyle>('realistic');
  const [backgroundMode, setBackgroundMode] = useState<ThreeDBackground>('soft_white');
  const [viewAngle, setViewAngle] = useState<ThreeDViewAngle>('isometric');

  const formatLakhs = (amt: number) => {
    if (Math.abs(amt) >= 10000000) {
      return `₹${(amt / 10000000).toFixed(2)} Cr`;
    }
    return `₹${(amt / 100000).toFixed(2)} Lakhs`;
  };

  // Compute room breakdown matching reference categories
  const livingCount = layout.rooms.filter((r) => r.type === 'living').length || 1;
  const bedroomCount = layout.rooms.filter((r) => r.type.includes('bed')).length || 3;
  const kitchenCount = layout.rooms.filter((r) => r.type === 'kitchen').length || 1;
  const diningCount = layout.rooms.filter((r) => r.type === 'dining').length || 1;
  const bathCount = layout.rooms.filter((r) => r.type.includes('bath')).length || 2;
  const parkingCount = layout.rooms.filter((r) => r.type === 'parking').length || 1;

  return (
    <div className="w-full space-y-4 animate-fade-in select-none">
      {/* 1. 3D MODEL PAGE HEADER (Matches reference image with leafy illustration on right) */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#EBF3FC] via-[#F3F8FD] to-[#EAF2FC] border border-[#DFEAF5] rounded-2xl p-4 sm:px-6 sm:py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        {/* Decorative leafy branch illustration on far right (as in reference image) */}
        <div className="absolute right-0 top-0 bottom-0 w-36 pointer-events-none opacity-80 hidden md:block overflow-hidden">
          <svg viewBox="0 0 140 90" className="w-full h-full object-cover">
            <path d="M140,85 C110,65 95,45 80,15 C95,20 115,22 135,10 C125,25 110,40 140,48 Z" fill="#65A30D" opacity="0.85" />
            <path d="M120,90 C100,75 85,55 75,30 C60,40 50,60 55,85 C75,70 95,80 120,90 Z" fill="#84CC16" opacity="0.9" />
            <path d="M90,90 C80,60 100,35 125,25 C105,35 85,60 90,90 Z" fill="#4D7C0F" opacity="0.75" />
          </svg>
        </div>

        {/* Left: House Icon, Title & Subtitle */}
        <div className="flex items-center gap-3.5 z-10">
          <div className="w-11 h-11 rounded-xl bg-[#D7F3F2] border border-teal-200/60 text-[#0D7B75] flex items-center justify-center shrink-0 shadow-xs">
            <Home className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-[22px] font-extrabold tracking-tight text-[#0C1E38]">
              3D Model
            </h1>
            <p className="text-xs text-[#5E718D] mt-0.5">
              Explore your home in 3D. Rotate, zoom and get a real feel of your space.
            </p>
          </div>
        </div>

        {/* Right: Segmented Controls (3. 3D View, Top View, Front View) & Reset View Button */}
        <div className="flex items-center gap-2.5 z-10 self-start md:self-auto">
          {/* Segmented Capsule */}
          <div className="flex items-center p-1 rounded-full bg-white border border-[#E2E8F0] text-xs shadow-xs">
            {/* 3. 3D View (Dark Navy Pill as in reference) */}
            <button
              onClick={() => setViewAngle('isometric')}
              className={`px-3.5 py-1.5 rounded-full font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                viewAngle === 'isometric' || viewAngle === 'perspective'
                  ? 'bg-[#0C1E38] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0C1E38]'
              }`}
            >
              <span>3. 3D View</span>
            </button>

            {/* Top View */}
            <button
              onClick={() => setViewAngle('top')}
              className={`px-3 py-1.5 rounded-full font-medium transition cursor-pointer flex items-center gap-1.5 ${
                viewAngle === 'top'
                  ? 'bg-[#0C1E38] text-white shadow-xs font-semibold'
                  : 'text-[#64748B] hover:text-[#0C1E38]'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
              <span>Top View</span>
            </button>

            {/* Front View */}
            <button
              onClick={() => setViewAngle('front')}
              className={`px-3 py-1.5 rounded-full font-medium transition cursor-pointer flex items-center gap-1.5 ${
                viewAngle === 'front'
                  ? 'bg-[#0C1E38] text-white shadow-xs font-semibold'
                  : 'text-[#64748B] hover:text-[#0C1E38]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Front View</span>
            </button>
          </div>

          {/* Reset View Pill Button */}
          <button
            onClick={() => {
              setViewAngle('isometric');
              setActiveTool('orbit');
            }}
            className="px-3.5 py-1.5 rounded-full border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#1E293B] text-xs font-medium transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Reset Camera to Default Angle"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#2B66F6]" />
            <span>Reset View</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN THREE-COLUMN WORKSPACE */}
      <div className="flex flex-col lg:flex-row items-stretch gap-5">
        {/* LEFT COLUMN: VIEW CONTROLS, STYLE & BACKGROUND (~270px) */}
        <aside className="w-full lg:w-[270px] shrink-0 space-y-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-6">
            {/* 1. View Controls (Horizontal row of 4 buttons matching reference!) */}
            <div>
              <h2 className="text-xs font-bold text-[#0C1E38] mb-3">
                View Controls
              </h2>
              <div className="grid grid-cols-4 gap-2">
                {/* Orbit */}
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    onClick={() => setActiveTool('orbit')}
                    className={`w-12 h-12 rounded-xl transition flex items-center justify-center cursor-pointer ${
                      activeTool === 'orbit'
                        ? 'bg-[#2B66F6] text-white shadow-sm'
                        : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50'
                    }`}
                    title="Orbit View"
                  >
                    <Rotate3d className="w-5 h-5 stroke-[2]" />
                  </button>
                  <span className={`text-[11px] font-medium ${activeTool === 'orbit' ? 'text-[#2B66F6] font-semibold' : 'text-[#64748B]'}`}>
                    Orbit
                  </span>
                </div>

                {/* Pan */}
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    onClick={() => setActiveTool('pan')}
                    className={`w-12 h-12 rounded-xl transition flex items-center justify-center cursor-pointer ${
                      activeTool === 'pan'
                        ? 'bg-[#2B66F6] text-white shadow-sm'
                        : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50'
                    }`}
                    title="Pan View"
                  >
                    <Move className="w-4 h-4" />
                  </button>
                  <span className={`text-[11px] font-medium ${activeTool === 'pan' ? 'text-[#2B66F6] font-semibold' : 'text-[#64748B]'}`}>
                    Pan
                  </span>
                </div>

                {/* Zoom */}
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    onClick={() => setActiveTool('zoom')}
                    className={`w-12 h-12 rounded-xl transition flex items-center justify-center cursor-pointer ${
                      activeTool === 'zoom'
                        ? 'bg-[#2B66F6] text-white shadow-sm'
                        : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50'
                    }`}
                    title="Zoom View"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                  <span className={`text-[11px] font-medium ${activeTool === 'zoom' ? 'text-[#2B66F6] font-semibold' : 'text-[#64748B]'}`}>
                    Zoom
                  </span>
                </div>

                {/* Reset */}
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    onClick={() => {
                      setViewAngle('isometric');
                      setActiveTool('orbit');
                    }}
                    className="w-12 h-12 rounded-xl transition flex items-center justify-center cursor-pointer bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50"
                    title="Reset Camera"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-medium text-[#64748B]">
                    Reset
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Style (Horizontal row of 3 preview cards matching reference!) */}
            <div>
              <h2 className="text-xs font-bold text-[#0C1E38] mb-3">
                Style
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {/* Style 1: Realistic (Active) */}
                <div
                  onClick={() => setStyleMode('realistic')}
                  className={`p-1.5 rounded-xl border transition flex flex-col items-center gap-1.5 cursor-pointer ${
                    styleMode === 'realistic'
                      ? 'border-[#2B66F6] ring-1 ring-[#2B66F6] bg-blue-50/20'
                      : 'border-[#E2E8F0] hover:border-slate-300'
                  }`}
                >
                  <div className="w-full h-12 rounded-lg overflow-hidden bg-[#EFF6FF] flex items-center justify-center relative">
                    {/* Realistic miniature render graphic */}
                    <svg viewBox="0 0 60 40" className="w-full h-full">
                      <rect width="60" height="40" fill="#EBF4EC" />
                      <path d="M10,28 L30,12 L50,28 Z" fill="#D97706" />
                      <rect x="14" y="22" width="32" height="15" fill="#FAF5EE" />
                      <rect x="22" y="27" width="8" height="10" fill="#3B82F6" opacity="0.6" />
                      <circle cx="8" cy="24" r="5" fill="#4E7D3A" />
                      <circle cx="52" cy="22" r="6" fill="#4E7D3A" />
                    </svg>
                  </div>
                  <span className={`text-[11px] font-medium ${styleMode === 'realistic' ? 'text-[#2B66F6] font-semibold' : 'text-[#64748B]'}`}>
                    Realistic
                  </span>
                </div>

                {/* Style 2: Modern */}
                <div
                  onClick={() => setStyleMode('modern')}
                  className={`p-1.5 rounded-xl border transition flex flex-col items-center gap-1.5 cursor-pointer ${
                    styleMode === 'modern'
                      ? 'border-[#2B66F6] ring-1 ring-[#2B66F6] bg-blue-50/20'
                      : 'border-[#E2E8F0] hover:border-slate-300'
                  }`}
                >
                  <div className="w-full h-12 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center relative">
                    {/* Modern minimalist graphic */}
                    <svg viewBox="0 0 60 40" className="w-full h-full">
                      <rect width="60" height="40" fill="#F1F5F9" />
                      <rect x="12" y="16" width="36" height="18" fill="#FFFFFF" stroke="#334155" strokeWidth="1" />
                      <rect x="18" y="20" width="12" height="10" fill="#09090B" />
                      <rect x="34" y="22" width="10" height="12" fill="#94A3B8" />
                    </svg>
                  </div>
                  <span className={`text-[11px] font-medium ${styleMode === 'modern' ? 'text-[#2B66F6] font-semibold' : 'text-[#64748B]'}`}>
                    Modern
                  </span>
                </div>

                {/* Style 3: Wireframe */}
                <div
                  onClick={() => setStyleMode('wireframe')}
                  className={`p-1.5 rounded-xl border transition flex flex-col items-center gap-1.5 cursor-pointer ${
                    styleMode === 'wireframe'
                      ? 'border-[#2B66F6] ring-1 ring-[#2B66F6] bg-blue-50/20'
                      : 'border-[#E2E8F0] hover:border-slate-300'
                  }`}
                >
                  <div className="w-full h-12 rounded-lg overflow-hidden bg-[#EFF6FF] flex items-center justify-center relative">
                    {/* Wireframe graphic */}
                    <svg viewBox="0 0 60 40" className="w-full h-full">
                      <rect width="60" height="40" fill="#F0F7FF" />
                      <path d="M14,26 L30,14 L46,26 L30,34 Z" fill="none" stroke="#2B66F6" strokeWidth="1.2" />
                      <path d="M14,26 L14,32 L30,40 L46,32 L46,26" fill="none" stroke="#2B66F6" strokeWidth="1.2" />
                      <line x1="30" y1="34" x2="30" y2="40" stroke="#2B66F6" strokeWidth="1.2" />
                    </svg>
                  </div>
                  <span className={`text-[11px] font-medium ${styleMode === 'wireframe' ? 'text-[#2B66F6] font-semibold' : 'text-[#64748B]'}`}>
                    Wireframe
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Background (5 circular swatches matching reference!) */}
            <div>
              <h2 className="text-xs font-bold text-[#0C1E38] mb-3">
                Background
              </h2>
              <div className="flex items-center justify-between px-1">
                {/* 1. Soft White (Active: Blue ring) */}
                <button
                  onClick={() => setBackgroundMode('soft_white')}
                  className={`w-7 h-7 rounded-full bg-white border cursor-pointer transition ${
                    backgroundMode === 'soft_white'
                      ? 'border-[#2B66F6] ring-2 ring-[#2B66F6]'
                      : 'border-[#CBD5E1] hover:scale-110'
                  }`}
                  title="Soft White Viewport"
                />

                {/* 2. Pale Blue-Grey */}
                <button
                  onClick={() => setBackgroundMode('pale_blue')}
                  className={`w-7 h-7 rounded-full bg-[#E2E8F0] border cursor-pointer transition ${
                    backgroundMode === 'pale_blue'
                      ? 'border-[#2B66F6] ring-2 ring-[#2B66F6]'
                      : 'border-transparent hover:scale-110'
                  }`}
                  title="Pale Blue Viewport"
                />

                {/* 3. Charcoal */}
                <button
                  onClick={() => setBackgroundMode('charcoal')}
                  className={`w-7 h-7 rounded-full bg-[#475569] border cursor-pointer transition ${
                    backgroundMode === 'charcoal'
                      ? 'border-[#2B66F6] ring-2 ring-[#2B66F6]'
                      : 'border-transparent hover:scale-110'
                  }`}
                  title="Dark Charcoal Studio"
                />

                {/* 4. Landscape */}
                <button
                  onClick={() => setBackgroundMode('landscape')}
                  className={`w-7 h-7 rounded-full overflow-hidden border cursor-pointer transition bg-gradient-to-tr from-[#65A30D] to-[#84CC16] ${
                    backgroundMode === 'landscape'
                      ? 'border-[#2B66F6] ring-2 ring-[#2B66F6]'
                      : 'border-transparent hover:scale-110'
                  }`}
                  title="Green Landscape"
                />

                {/* 5. Warm Ground */}
                <button
                  onClick={() => setBackgroundMode('warm_ground')}
                  className={`w-7 h-7 rounded-full overflow-hidden border cursor-pointer transition bg-gradient-to-tr from-[#D97706] to-[#FDE68A] ${
                    backgroundMode === 'warm_ground'
                      ? 'border-[#2B66F6] ring-2 ring-[#2B66F6]'
                      : 'border-transparent hover:scale-110'
                  }`}
                  title="Warm Ground"
                />
              </div>
            </div>
          </div>
        </aside>

        {/* CENTER COLUMN: 3D VIEWPORT WITH THREE.JS CANVAS */}
        <section className="flex-1 min-w-0 h-[580px] sm:h-[640px] lg:h-[690px]">
          <ThreeDVisualizer
            layout={layout}
            selectedRoomId={selectedRoomId}
            onSelectRoom={onSelectRoom}
            styleMode={styleMode}
            backgroundMode={backgroundMode}
            activeTool={activeTool}
            viewAngle={viewAngle}
            onViewAngleChange={setViewAngle}
            onResetCamera={() => setViewAngle('isometric')}
            className="h-full w-full shadow-xs"
          />
        </section>

        {/* RIGHT COLUMN: BUILDING DETAILS, METRICS, ROOMS & ESTIMATE (~340px) */}
        <aside className="w-full lg:w-[340px] shrink-0 space-y-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-5">
            {/* Header: House Icon, Title & Generated Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 text-[#0C1E38] flex items-center justify-center shrink-0">
                  <Home className="w-4 h-4 stroke-[2]" />
                </div>
                <h3 className="text-base font-extrabold text-[#0C1E38] truncate">
                  {layout.house_type || '3BHK'} Home
                </h3>
              </div>

              {/* Status Badge: "Generated" in soft green pill */}
              <span className="px-2.5 py-0.5 rounded-full bg-[#E6F8F0] text-[#00A86B] font-semibold text-[11px]">
                Generated
              </span>
            </div>

            {/* 3 Metrics: Plot Area, Built-up Area, Floors */}
            <div className="grid grid-cols-3 gap-2">
              {/* Plot Area */}
              <div>
                <div className="flex items-center gap-1 text-[11px] text-[#64748B]">
                  <span>Plot Area</span>
                </div>
                <div className="text-sm font-bold text-[#0C1E38] mt-0.5">
                  {layout.plot.width * layout.plot.length} sq.ft
                </div>
              </div>

              {/* Built-up Area */}
              <div>
                <div className="flex items-center gap-1 text-[11px] text-[#64748B]">
                  <span>Built-up Area</span>
                </div>
                <div className="text-sm font-bold text-[#0C1E38] mt-0.5">
                  {estimate.built_up_area_sqft} sq.ft
                </div>
              </div>

              {/* Floors */}
              <div>
                <div className="flex items-center gap-1 text-[11px] text-[#64748B]">
                  <span>Floors</span>
                </div>
                <div className="text-sm font-bold text-[#0C1E38] mt-0.5 flex items-center gap-1">
                  <span>{layout.floors || 1}</span>
                </div>
              </div>
            </div>

            {/* Rooms List (Matches reference image with counts on right!) */}
            <div className="space-y-2.5 pt-1">
              <h4 className="text-xs font-bold text-[#0C1E38]">
                Rooms
              </h4>

              <div className="space-y-2 text-xs text-[#1E293B]">
                {/* Living Room */}
                <div className="flex items-center justify-between py-0.5">
                  <div className="flex items-center gap-2 text-[#475569]">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 9V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                      <path d="M4 18v2M20 18v2" />
                    </svg>
                    <span>Living Room</span>
                  </div>
                  <span className="font-semibold text-[#0C1E38]">{livingCount}</span>
                </div>

                {/* Bedroom */}
                <div className="flex items-center justify-between py-0.5">
                  <div className="flex items-center gap-2 text-[#475569]">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9" />
                    </svg>
                    <span>Bedroom</span>
                  </div>
                  <span className="font-semibold text-[#0C1E38]">{bedroomCount}</span>
                </div>

                {/* Kitchen */}
                <div className="flex items-center justify-between py-0.5">
                  <div className="flex items-center gap-2 text-[#475569]">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 2v20M6 2v20M10 2v20M14 2v20" />
                    </svg>
                    <span>Kitchen</span>
                  </div>
                  <span className="font-semibold text-[#0C1E38]">{kitchenCount}</span>
                </div>

                {/* Dining Area */}
                <div className="flex items-center justify-between py-0.5">
                  <div className="flex items-center gap-2 text-[#475569]">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
                    </svg>
                    <span>Dining Area</span>
                  </div>
                  <span className="font-semibold text-[#0C1E38]">{diningCount}</span>
                </div>

                {/* Bathroom */}
                <div className="flex items-center justify-between py-0.5">
                  <div className="flex items-center gap-2 text-[#475569]">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.67 3 4 3.67 4 4.5V17a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4V5a2 2 0 0 0-2-2H9" />
                    </svg>
                    <span>Bathroom</span>
                  </div>
                  <span className="font-semibold text-[#0C1E38]">{bathCount}</span>
                </div>

                {/* Parking */}
                <div className="flex items-center justify-between py-0.5">
                  <div className="flex items-center gap-2 text-[#475569]">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3 3 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                      <circle cx="7" cy="17" r="2" />
                      <circle cx="17" cy="17" r="2" />
                    </svg>
                    <span>Parking</span>
                  </div>
                  <span className="font-semibold text-[#0C1E38]">{parkingCount}</span>
                </div>
              </div>
            </div>

            {/* "View in 2D Plan" Button (Wide pale mint button matching reference!) */}
            <button
              onClick={() => onSelectTab('plan')}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-[#009688] bg-[#E6F8F6] hover:bg-[#D5F3EE] transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <Map className="w-4 h-4 text-[#009688]" />
              <span>View in 2D Plan</span>
            </button>

            {/* "Estimated Cost" Card (Matching reference image exactly!) */}
            <div className="p-4 rounded-2xl bg-[#F0FAF7] border border-[#E2F4EE] space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#00796B]">
                <Coins className="w-4 h-4 text-[#009688]" />
                <span>Estimated Cost</span>
              </div>

              <div>
                <div className="text-[26px] font-extrabold text-[#0C1E38] tracking-tight leading-tight">
                  {formatLakhs(estimate.grand_total)}
                </div>
                <div className="text-xs text-[#64748B] mt-0.5">
                  ₹{estimate.cost_per_sqft.toLocaleString()} / sq.ft
                </div>
              </div>

              <div className="pt-1">
                <button
                  onClick={() => onSelectTab('cost')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#2B66F6] hover:underline cursor-pointer"
                >
                  <span>View Breakdown</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
