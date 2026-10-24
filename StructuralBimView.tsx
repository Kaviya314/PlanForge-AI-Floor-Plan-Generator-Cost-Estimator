import React, { useState, useMemo, useRef } from 'react';
import { PlanLayout, CadTheme } from '../types/plan';
import { generateBimStructure } from '../utils/bimGenerator';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Layers,
  Activity,
  Cpu,
  Download,
  Info,
  CheckCircle2
} from 'lucide-react';

interface StructuralBimViewProps {
  layout: PlanLayout;
  theme?: CadTheme;
}

export const StructuralBimView: React.FC<StructuralBimViewProps> = ({
  layout,
  theme = 'dark_navy',
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Layer Visibility
  const [showColumns, setShowColumns] = useState<boolean>(true);
  const [showBeams, setShowBeams] = useState<boolean>(true);
  const [showGridLines, setShowGridLines] = useState<boolean>(true);
  const [showFootings, setShowFootings] = useState<boolean>(true);
  const [showRoomOutlines, setShowRoomOutlines] = useState<boolean>(true);

  const bim = useMemo(() => generateBimStructure(layout), [layout]);
  const { plot } = layout;
  const unit = plot.unit || 'ft';

  // SVG Dimensioning
  const margin = 60;
  const svgWidth = 850;
  const svgHeight = 650;
  const availW = svgWidth - margin * 2;
  const availH = svgHeight - margin * 2;
  const scale = Math.min(availW / Math.max(1, plot.width), availH / Math.max(1, plot.length));

  const originX = margin + (availW - plot.width * scale) / 2;
  const originY = margin + (availH - plot.length * scale) / 2;

  const isDark = theme === 'dark_navy';

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className={`flex flex-col h-full rounded-2xl overflow-hidden border select-none relative ${
      isDark ? 'bg-[#080D1A] border-zinc-800 text-zinc-100' : 'bg-[#F8FAFC] border-slate-200 text-slate-900'
    }`}>
      {/* Top Floating Control Dock */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: BIM Metadata Pill */}
        <div className={`px-3.5 py-1.5 rounded-xl border shadow-sm backdrop-blur-md pointer-events-auto flex items-center gap-3 text-xs ${
          isDark ? 'bg-zinc-900/90 border-zinc-700/80 text-zinc-200' : 'bg-white/95 border-slate-200 text-slate-800'
        }`}>
          <div className="flex items-center gap-1.5 font-semibold text-teal-400">
            <Cpu className="w-4 h-4" />
            <span>Structural BIM / Framing Model</span>
          </div>
          <span className="text-zinc-500">•</span>
          <span className="font-mono text-[11px] text-zinc-400">
            {bim.summary.columnCount} Columns ({unit === 'ft' ? "10''×10''" : "250mm"}) • {bim.summary.beamCount} Plinth Beams
          </span>
        </div>

        {/* Right: Layer Toggles & View Controls */}
        <div className={`p-1 rounded-xl border shadow-sm backdrop-blur-md pointer-events-auto flex items-center gap-1 text-xs ${
          isDark ? 'bg-zinc-900/90 border-zinc-700/80' : 'bg-white/95 border-slate-200'
        }`}>
          {/* Layer toggles */}
          <button
            onClick={() => setShowColumns(!showColumns)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              showColumns
                ? isDark ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' : 'bg-teal-50 text-teal-700 border border-teal-200'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Columns
          </button>
          <button
            onClick={() => setShowBeams(!showBeams)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              showBeams
                ? isDark ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' : 'bg-teal-50 text-teal-700 border border-teal-200'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Beams
          </button>
          <button
            onClick={() => setShowFootings(!showFootings)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              showFootings
                ? isDark ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' : 'bg-teal-50 text-teal-700 border border-teal-200'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Footings
          </button>
          <button
            onClick={() => setShowGridLines(!showGridLines)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              showGridLines
                ? isDark ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' : 'bg-teal-50 text-teal-700 border border-teal-200'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Grid Axes
          </button>

          <div className="h-4 w-[1px] bg-zinc-700 mx-1"></div>

          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.15))}
            className="p-1.5 text-zinc-400 hover:text-teal-400 rounded-lg transition cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
            className="p-1.5 text-zinc-400 hover:text-teal-400 rounded-lg transition cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1.5 text-zinc-400 hover:text-teal-400 rounded-lg transition cursor-pointer"
            title="Reset View"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Structural Interactive Canvas */}
      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="w-full h-full min-h-[520px] flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden"
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full max-h-[82vh] transition-transform duration-75 ease-out"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          <defs>
            <pattern id="bim-eng-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke={isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)"} strokeWidth="0.8" />
            </pattern>
            <pattern id="footing-hatch" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="6" stroke={isDark ? "rgba(56, 189, 248, 0.25)" : "rgba(14, 165, 233, 0.3)"} strokeWidth="1" />
            </pattern>
          </defs>

          {/* Canvas Background Grid */}
          <rect width={svgWidth} height={svgHeight} fill="url(#bim-eng-grid)" />

          <g transform={`translate(${originX}, ${originY})`}>
            {/* Plot boundary baseline */}
            <rect
              x={0}
              y={0}
              width={plot.width * scale}
              height={plot.length * scale}
              fill="none"
              stroke={isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.15)"}
              strokeWidth="1.5"
              strokeDasharray="6 4"
            />

            {/* Room outlines underlay for architectural context */}
            {showRoomOutlines &&
              layout.rooms.map((room) => (
                <rect
                  key={room.id}
                  x={room.x * scale}
                  y={room.y * scale}
                  width={room.width * scale}
                  height={room.length * scale}
                  fill={isDark ? "rgba(15, 23, 42, 0.4)" : "rgba(241, 245, 249, 0.5)"}
                  stroke={isDark ? "rgba(148, 163, 184, 0.2)" : "rgba(148, 163, 184, 0.4)"}
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
              ))}

            {/* 1. Structural Grid Lines & Bubbles (Revit/CAD Axis notation) */}
            {showGridLines && (
              <>
                {bim.gridLines.map((grid) => {
                  if (grid.axis === 'x') {
                    const gx = grid.position * scale;
                    return (
                      <g key={grid.id}>
                        {/* Vertical line */}
                        <line
                          x1={gx}
                          y1={-25}
                          x2={gx}
                          y2={plot.length * scale + 25}
                          stroke={isDark ? "rgba(244, 63, 94, 0.35)" : "rgba(239, 68, 68, 0.4)"}
                          strokeWidth="1"
                          strokeDasharray="8 4 2 4"
                        />
                        {/* Top Bubble */}
                        <circle cx={gx} cy={-25} r={11} fill={isDark ? "#18181b" : "#ffffff"} stroke="#f43f5e" strokeWidth="1.5" />
                        <text x={gx} y={-21} textAnchor="middle" fill="#f43f5e" fontSize="9" fontWeight="bold" fontFamily="monospace">
                          {grid.label}
                        </text>
                        {/* Bottom Bubble */}
                        <circle cx={gx} cy={plot.length * scale + 25} r={11} fill={isDark ? "#18181b" : "#ffffff"} stroke="#f43f5e" strokeWidth="1.5" />
                        <text x={gx} y={plot.length * scale + 29} textAnchor="middle" fill="#f43f5e" fontSize="9" fontWeight="bold" fontFamily="monospace">
                          {grid.label}
                        </text>
                      </g>
                    );
                  } else {
                    const gy = grid.position * scale;
                    return (
                      <g key={grid.id}>
                        {/* Horizontal line */}
                        <line
                          x1={-25}
                          y1={gy}
                          x2={plot.width * scale + 25}
                          y2={gy}
                          stroke={isDark ? "rgba(56, 189, 248, 0.35)" : "rgba(2, 132, 199, 0.4)"}
                          strokeWidth="1"
                          strokeDasharray="8 4 2 4"
                        />
                        {/* Left Bubble */}
                        <circle cx={-25} cy={gy} r={11} fill={isDark ? "#18181b" : "#ffffff"} stroke="#0284c7" strokeWidth="1.5" />
                        <text x={-25} y={gy + 3.5} textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                          {grid.label}
                        </text>
                        {/* Right Bubble */}
                        <circle cx={plot.width * scale + 25} cy={gy} r={11} fill={isDark ? "#18181b" : "#ffffff"} stroke="#0284c7" strokeWidth="1.5" />
                        <text x={plot.width * scale + 25} y={gy + 3.5} textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                          {grid.label}
                        </text>
                      </g>
                    );
                  }
                })}
              </>
            )}

            {/* 2. Isolated Concrete Pad Footings */}
            {showFootings &&
              bim.columns.map((col) => {
                const footingSize = (unit === 'ft' ? 3.5 : 1.1) * scale;
                const fx = col.x * scale - footingSize / 2;
                const fy = col.y * scale - footingSize / 2;
                return (
                  <g key={`footing-${col.id}`}>
                    <rect
                      x={fx}
                      y={fy}
                      width={footingSize}
                      height={footingSize}
                      fill="url(#footing-hatch)"
                      stroke={isDark ? "#0284c7" : "#0369a1"}
                      strokeWidth="1"
                      strokeDasharray="3 2"
                      opacity={0.8}
                    />
                  </g>
                );
              })}

            {/* 3. Reinforced Concrete Plinth & Tie Beams */}
            {showBeams &&
              bim.beams.map((beam) => {
                const x1 = beam.x1 * scale;
                const y1 = beam.y1 * scale;
                const x2 = beam.x2 * scale;
                const y2 = beam.y2 * scale;
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;

                return (
                  <g key={beam.id}>
                    {/* Beam center line */}
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={isDark ? "#14b8a6" : "#0f766e"}
                      strokeWidth="3.5"
                      strokeLinecap="square"
                    />
                    {/* Beam Label */}
                    <rect
                      x={midX - 16}
                      y={midY - 6}
                      width={32}
                      height={12}
                      rx={3}
                      fill={isDark ? "#090d16" : "#ffffff"}
                      stroke={isDark ? "#14b8a6" : "#0f766e"}
                      strokeWidth="0.8"
                    />
                    <text
                      x={midX}
                      y={midY + 3}
                      textAnchor="middle"
                      fill={isDark ? "#2dd4bf" : "#0f766e"}
                      fontSize="7.5"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {beam.name} ({beam.spanLength}')
                    </text>
                  </g>
                );
              })}

            {/* 4. Reinforced Concrete Columns (RCC C1..Cn) */}
            {showColumns &&
              bim.columns.map((col) => {
                const cw = (unit === 'ft' ? 1.2 : 0.35) * scale;
                const cx = col.x * scale - cw / 2;
                const cy = col.y * scale - cw / 2;

                return (
                  <g key={col.id} className="cursor-pointer group">
                    {/* Column Solid Body */}
                    <rect
                      x={cx}
                      y={cy}
                      width={cw}
                      height={cw}
                      fill={isDark ? "#f59e0b" : "#d97706"}
                      stroke={isDark ? "#ffffff" : "#78350f"}
                      strokeWidth="1.2"
                    />
                    {/* Interior rebar cross-tie symbol */}
                    <line x1={cx} y1={cy} x2={cx + cw} y2={cy + cw} stroke="#78350f" strokeWidth="0.8" />
                    <line x1={cx + cw} y1={cy} x2={cx} y2={cy + cw} stroke="#78350f" strokeWidth="0.8" />

                    {/* Column Tag Label */}
                    <text
                      x={col.x * scale}
                      y={cy - 4}
                      textAnchor="middle"
                      fill={isDark ? "#fbbf24" : "#92400e"}
                      fontSize="8"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {col.name}
                    </text>
                  </g>
                );
              })}
          </g>
        </svg>
      </div>

      {/* Bottom Structural Takeoff HUD Bar */}
      <div className={`p-4 border-t flex flex-wrap items-center justify-between gap-4 text-xs ${
        isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span>
            <span className="text-zinc-400">RCC Columns:</span>
            <span className="font-mono font-bold text-amber-400">{bim.summary.columnCount} Nos</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-teal-500"></span>
            <span className="text-zinc-400">Plinth Beams:</span>
            <span className="font-mono font-bold text-teal-400">
              {bim.summary.beamCount} Beams ({bim.summary.totalBeamSpan} {unit} total)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-sky-500"></span>
            <span className="text-zinc-400">Pad Footings:</span>
            <span className="font-mono font-bold text-sky-400">{bim.summary.footingCount} Footings</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Est. Concrete:</span>
            <span className="font-mono font-bold text-emerald-400">~{bim.summary.concreteVolumeCuM} m³</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Est. Rebar Steel:</span>
            <span className="font-mono font-bold text-indigo-400">~{bim.summary.rebarTonnageKg.toLocaleString()} kg</span>
          </div>
        </div>

        <div className="text-[11px] text-zinc-500 flex items-center gap-1 font-mono">
          <Info className="w-3.5 h-3.5 text-zinc-400" />
          <span>IS 456 / ACI 318 Standard Framing Matrix</span>
        </div>
      </div>
    </div>
  );
};
