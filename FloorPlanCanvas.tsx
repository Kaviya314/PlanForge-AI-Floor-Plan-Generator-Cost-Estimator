import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PlanLayout, Room, ValidationResult, CadTool, CadTheme } from '../types/plan';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  EyeOff,
  Grid,
  Download,
  AlertOctagon,
  Ruler,
  Compass,
  CheckCircle2
} from 'lucide-react';

interface FloorPlanCanvasProps {
  layout: PlanLayout;
  validation: ValidationResult;
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string | null) => void;
  onUpdateRoomPosition: (roomId: string, newX: number, newY: number) => void;
  activeTool?: CadTool;
  theme?: CadTheme;
  snapUnit?: number;
  onCursorMove?: (x: number, y: number) => void;
  onAddDoorToRoom?: (roomId: string, wall: 'top' | 'bottom' | 'left' | 'right') => void;
  onAddWindowToRoom?: (roomId: string, wall: 'top' | 'bottom' | 'left' | 'right') => void;
}

export const FloorPlanCanvas: React.FC<FloorPlanCanvasProps> = ({
  layout,
  validation,
  selectedRoomId,
  onSelectRoom,
  onUpdateRoomPosition,
  activeTool = 'select',
  theme = 'blueprint_light',
  snapUnit = 0.5,
  onCursorMove,
  onAddDoorToRoom,
  onAddWindowToRoom,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dragging a room
  const [draggingRoomId, setDraggingRoomId] = useState<string | null>(null);
  const [dragStartCoords, setDragStartCoords] = useState<{
    mouseX: number;
    mouseY: number;
    roomX: number;
    roomY: number;
  } | null>(null);

  // Measurement Tool State
  const [measureStart, setMeasureStart] = useState<{ x: number; y: number } | null>(null);
  const [measureCurrent, setMeasureCurrent] = useState<{ x: number; y: number } | null>(null);

  // View Layer Toggles
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  const [showDoorsWindows, setShowDoorsWindows] = useState<boolean>(true);
  const [showSetbacks, setShowSetbacks] = useState<boolean>(true);

  const { plot, rooms } = layout;
  const unit = plot.unit || 'ft';

  // Base canvas coordinate space
  const margin = 60;
  const svgWidth = 880;
  const svgHeight = 650;

  const availW = svgWidth - margin * 2;
  const availH = svgHeight - margin * 2;
  const scale = Math.min(availW / Math.max(1, plot.width), availH / Math.max(1, plot.length));

  const originX = margin + (availW - plot.width * scale) / 2;
  const originY = margin + (availH - plot.length * scale) / 2;

  const isDark = theme === 'dark_navy';

  // Center view on mount or plot change
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Identify colliding rooms from validation
  const collidingRoomIds = new Set<string>();
  const outOfBoundsRoomIds = new Set<string>();

  validation.errors.forEach((err) => {
    if (err.id.startsWith('err-overlap') && err.roomId) {
      collidingRoomIds.add(err.roomId);
    }
    if (err.id.startsWith('err-room-oob') && err.roomId) {
      outOfBoundsRoomIds.add(err.roomId);
    }
  });

  // Calculate World Coordinates from Screen Event
  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const mouseCanvasX = clientX - rect.left - rect.width / 2;
      const mouseCanvasY = clientY - rect.top - rect.height / 2;

      const unscaledX = (mouseCanvasX - pan.x) / zoom + svgWidth / 2;
      const unscaledY = (mouseCanvasY - pan.y) / zoom + svgHeight / 2;

      const worldX = (unscaledX - originX) / scale;
      const worldY = (unscaledY - originY) / scale;

      const snappedX = Math.round(worldX * (1 / snapUnit)) * snapUnit;
      const snappedY = Math.round(worldY * (1 / snapUnit)) * snapUnit;

      return {
        x: Math.max(0, Math.min(plot.width, snappedX)),
        y: Math.max(0, Math.min(plot.length, snappedY)),
      };
    },
    [pan, zoom, svgWidth, svgHeight, originX, originY, scale, snapUnit, plot.width, plot.length]
  );

  // Mouse Handlers
  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if (activeTool === 'measure') {
      const world = screenToWorld(e.clientX, e.clientY);
      if (!measureStart) {
        setMeasureStart(world);
        setMeasureCurrent(world);
      } else {
        // Reset or finish measure
        setMeasureStart(null);
        setMeasureCurrent(null);
      }
      return;
    }

    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).id === 'cad-canvas-bg') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      onSelectRoom(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const world = screenToWorld(e.clientX, e.clientY);
    if (onCursorMove) {
      onCursorMove(world.x, world.y);
    }

    if (activeTool === 'measure' && measureStart) {
      setMeasureCurrent(world);
      return;
    }

    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    } else if (draggingRoomId && dragStartCoords) {
      const deltaScreenX = (e.clientX - dragStartCoords.mouseX) / zoom;
      const deltaScreenY = (e.clientY - dragStartCoords.mouseY) / zoom;

      const deltaWorldX = deltaScreenX / scale;
      const deltaWorldY = deltaScreenY / scale;

      const rawX = dragStartCoords.roomX + deltaWorldX;
      const rawY = dragStartCoords.roomY + deltaWorldY;

      const snappedX = Math.round(rawX * (1 / snapUnit)) * snapUnit;
      const snappedY = Math.round(rawY * (1 / snapUnit)) * snapUnit;

      const room = rooms.find((r) => r.id === draggingRoomId);
      if (room) {
        const clampedX = Math.max(0, Math.min(plot.width - room.width, snappedX));
        const clampedY = Math.max(0, Math.min(plot.length - room.length, snappedY));
        onUpdateRoomPosition(draggingRoomId, clampedX, clampedY);
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingRoomId(null);
    setDragStartCoords(null);
  };

  const startDraggingRoom = (e: React.MouseEvent, room: Room) => {
    e.stopPropagation();
    onSelectRoom(room.id);

    // If door or window tool is active, clicking adds to closest wall
    if (activeTool === 'add-door' && onAddDoorToRoom) {
      onAddDoorToRoom(room.id, 'bottom');
      return;
    }
    if (activeTool === 'add-window' && onAddWindowToRoom) {
      onAddWindowToRoom(room.id, 'top');
      return;
    }

    if (activeTool === 'select') {
      setDraggingRoomId(room.id);
      setDragStartCoords({
        mouseX: e.clientX,
        mouseY: e.clientY,
        roomX: room.x,
        roomY: room.y,
      });
    }
  };

  // Color styling based on room type
  const getRoomFill = (type: string, isSelected: boolean, isError: boolean) => {
    if (isError) {
      return isDark
        ? 'fill-rose-950/80 stroke-rose-500 stroke-[2.5]'
        : 'fill-rose-100/90 stroke-rose-600 stroke-[2.5]';
    }
    if (isSelected) {
      return isDark
        ? 'fill-teal-950/80 stroke-teal-400 stroke-[2.5]'
        : 'fill-teal-100/90 stroke-teal-700 stroke-[2.5]';
    }

    if (isDark) {
      switch (type) {
        case 'living':
          return 'fill-[#131C31]/90 stroke-[#38BDF8]/70 stroke-[1.5]';
        case 'master_bedroom':
          return 'fill-[#1E1B38]/90 stroke-[#A78BFA]/70 stroke-[1.5]';
        case 'bedroom':
          return 'fill-[#122434]/90 stroke-[#38BDF8]/60 stroke-[1.5]';
        case 'kitchen':
          return 'fill-[#0E2824]/90 stroke-[#34D399]/70 stroke-[1.5]';
        case 'dining':
          return 'fill-[#1F2518]/90 stroke-[#A3E635]/70 stroke-[1.5]';
        case 'bathroom':
        case 'attached_bathroom':
          return 'fill-[#112733]/90 stroke-[#22D3EE]/70 stroke-[1.5]';
        case 'balcony':
          return 'fill-[#1A2E20]/90 stroke-[#4ADE80]/70 stroke-[1.5]';
        case 'parking':
          return 'fill-[#241F1A]/90 stroke-[#FBBF24]/70 stroke-[1.5]';
        case 'stairs':
          return 'fill-[#2B231B]/90 stroke-[#F97316]/70 stroke-[1.5]';
        default:
          return 'fill-[#161F30]/90 stroke-[#94A3B8]/60 stroke-[1.5]';
      }
    } else {
      switch (type) {
        case 'living':
          return 'fill-sky-50/90 stroke-sky-700/80 stroke-[1.5]';
        case 'master_bedroom':
          return 'fill-indigo-50/90 stroke-indigo-700/80 stroke-[1.5]';
        case 'bedroom':
          return 'fill-blue-50/90 stroke-blue-700/80 stroke-[1.5]';
        case 'kitchen':
          return 'fill-emerald-50/90 stroke-emerald-700/80 stroke-[1.5]';
        case 'dining':
          return 'fill-amber-50/90 stroke-amber-700/80 stroke-[1.5]';
        case 'bathroom':
        case 'attached_bathroom':
          return 'fill-cyan-50/90 stroke-cyan-700/80 stroke-[1.5]';
        case 'balcony':
          return 'fill-lime-50/90 stroke-lime-700/80 stroke-[1.5]';
        case 'parking':
          return 'fill-stone-100/90 stroke-stone-700/80 stroke-[1.5]';
        case 'stairs':
          return 'fill-orange-50/90 stroke-orange-700/80 stroke-[1.5]';
        default:
          return 'fill-slate-100/90 stroke-slate-600/80 stroke-[1.5]';
      }
    }
  };

  // Format dimensions (e.g. 14'0" x 12'0")
  const formatDim = (val: number) => {
    if (unit === 'ft') {
      const feet = Math.floor(val);
      const inches = Math.round((val - feet) * 12);
      return `${feet}'${inches > 0 ? inches + '"' : '0"'}`;
    }
    return `${val.toFixed(1)}m`;
  };

  // Export floor plan as SVG
  const handleExportSvg = () => {
    const svgElem = document.getElementById('planforge-svg-canvas');
    if (!svgElem) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElem);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${layout.project_name.toLowerCase().replace(/\s+/g, '_')}_cad_floorplan.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Compute live measurement distance
  const measuredDistance =
    measureStart && measureCurrent
      ? Math.sqrt(
          Math.pow(measureCurrent.x - measureStart.x, 2) +
            Math.pow(measureCurrent.y - measureStart.y, 2)
        )
      : null;

  return (
    <div
      className={`flex flex-col h-full rounded-2xl overflow-hidden border select-none relative transition-colors duration-150 ${
        isDark ? 'bg-[#0B1120] border-zinc-800 text-zinc-100' : 'bg-[#FAF9F6] border-[#E7E5E0] text-[#18191C]'
      }`}
    >
      {/* Top Floating Controls Toolbar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between pointer-events-none gap-2">
        {/* Left Toolbar: Dimensions & Validation Status */}
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border shadow-xs pointer-events-auto backdrop-blur-md text-xs ${
            isDark
              ? 'bg-zinc-900/90 border-zinc-700/80 text-zinc-200'
              : 'bg-white/95 border-slate-200 text-slate-800'
          }`}
        >
          <span className="font-semibold mr-1 font-mono">
            PLOT: {plot.width} × {plot.length} {unit}
          </span>
          <span className="text-[11px] text-zinc-400">
            ({(plot.width * plot.length).toLocaleString()} {unit}²)
          </span>

          <div className="h-4 w-[1px] bg-zinc-600 mx-1"></div>

          {validation.is_valid ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-700/60 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              CAD Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-300 bg-rose-950/60 border border-rose-700/60 px-2 py-0.5 rounded-md">
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
              {validation.errors.length} Issue{validation.errors.length > 1 ? 's' : ''}
            </span>
          )}

          {activeTool === 'measure' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-300 bg-cyan-950/60 border border-cyan-700/60 px-2 py-0.5 rounded-md animate-pulse">
              <Ruler className="w-3 h-3 text-cyan-400" />
              {measureStart
                ? `Dist: ${measuredDistance?.toFixed(2)} ${unit}`
                : 'Click canvas to measure distance'}
            </span>
          )}
        </div>

        {/* Right Toolbar: Viewport & Layer toggles */}
        <div
          className={`flex items-center gap-1 p-1 rounded-xl border shadow-xs pointer-events-auto backdrop-blur-md ${
            isDark ? 'bg-zinc-900/90 border-zinc-700/80' : 'bg-white/95 border-slate-200'
          }`}
        >
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
            title="Fit to Screen (Reset View)"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <div className="h-4 w-[1px] bg-zinc-700 mx-1"></div>

          <button
            onClick={() => setShowGrid((g) => !g)}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              showGrid
                ? isDark
                  ? 'text-teal-300 bg-teal-500/20 border border-teal-500/40'
                  : 'text-[#0F766E] bg-[#CCFBF1] border border-[#99F6E4]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Toggle Engineering Grid"
          >
            <Grid className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowDimensions((d) => !d)}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              showDimensions
                ? isDark
                  ? 'text-teal-300 bg-teal-500/20 border border-teal-500/40'
                  : 'text-[#0F766E] bg-[#CCFBF1] border border-[#99F6E4]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Toggle Dimension Annotations"
          >
            {showDimensions ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          <div className="h-4 w-[1px] bg-zinc-700 mx-1"></div>

          <button
            onClick={handleExportSvg}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0F766E] hover:bg-[#0D9488] rounded-lg transition cursor-pointer shadow-xs"
            title="Export as Vector SVG Drawing"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CAD SVG</span>
          </button>
        </div>
      </div>

      {/* Main Interactive CAD SVG Canvas Area */}
      <div
        ref={containerRef}
        id="cad-canvas-bg"
        onMouseDown={handleMouseDownCanvas}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`w-full h-full min-h-[520px] flex items-center justify-center overflow-hidden ${
          activeTool === 'measure' ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
        }`}
      >
        <svg
          id="planforge-svg-canvas"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full max-h-[85vh] transition-transform duration-75 ease-out"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          <defs>
            {/* Fine architectural CAD grid */}
            <pattern id="cad-fine-grid" width={10} height={10} patternUnits="userSpaceOnUse">
              <path
                d="M 10 0 L 0 0 0 10"
                fill="none"
                stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}
                strokeWidth="0.8"
              />
            </pattern>
            {/* Major CAD grid */}
            <pattern id="cad-major-grid" width={50} height={50} patternUnits="userSpaceOnUse">
              <rect width="50" height="50" fill="url(#cad-fine-grid)" />
              <path
                d="M 50 0 L 0 0 0 50"
                fill="none"
                stroke={isDark ? 'rgba(6,182,212,0.18)' : 'rgba(15,118,110,0.15)'}
                strokeWidth="1.2"
              />
            </pattern>

            {/* Error Hatching */}
            <pattern
              id="error-hatch"
              width="8"
              height="8"
              patternTransform="rotate(45 0 0)"
              patternUnits="userSpaceOnUse"
            >
              <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(244,63,94,0.5)" strokeWidth="2.5" />
            </pattern>

            {/* Stairs Tread Pattern */}
            <pattern id="stairs-pattern" width="10" height="4" patternUnits="userSpaceOnUse">
              <line x1="0" y1="2" x2="10" y2="2" stroke={isDark ? '#F97316' : '#EA580C'} strokeWidth="1" />
            </pattern>

            {/* Drop Shadows */}
            <filter id="room-shadow" x="-5%" y="-5%" width="110%" height="110%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
            </filter>
            <filter id="selected-glow" x="-8%" y="-8%" width="116%" height="116%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={isDark ? '#06b6d4' : '#0f766e'} floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Background Grid */}
          {showGrid && <rect width={svgWidth} height={svgHeight} fill="url(#cad-major-grid)" />}

          {/* Center Blueprint Origin Group */}
          <g transform={`translate(${originX}, ${originY})`}>
            {/* 1. Plot Boundary Box */}
            <rect
              x={0}
              y={0}
              width={plot.width * scale}
              height={plot.length * scale}
              fill={isDark ? 'rgba(11, 17, 32, 0.85)' : 'rgba(255, 255, 255, 0.85)'}
              stroke={isDark ? '#38BDF8' : '#0284C7'}
              strokeWidth="2.5"
              strokeDasharray="8 4"
            />

            {/* Setback Clearance Guideline */}
            {showSetbacks && (
              <rect
                x={Math.min(3, plot.width * 0.08) * scale}
                y={Math.min(3.5, plot.length * 0.08) * scale}
                width={(plot.width - Math.min(3, plot.width * 0.08) * 2) * scale}
                height={(plot.length - Math.min(3.5, plot.length * 0.08) * 2) * scale}
                fill="none"
                stroke={isDark ? 'rgba(148, 163, 184, 0.25)' : 'rgba(100, 116, 139, 0.3)'}
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            )}

            {/* Plot Outer Dimension Labels */}
            {showDimensions && (
              <>
                {/* Top Width Dimension */}
                <g transform="translate(0, -22)">
                  <line x1={0} y1={8} x2={plot.width * scale} y2={8} stroke={isDark ? '#38bdf8' : '#0284c7'} strokeWidth="1.2" />
                  <line x1={0} y1={2} x2={0} y2={14} stroke={isDark ? '#38bdf8' : '#0284c7'} strokeWidth="1.2" />
                  <line x1={plot.width * scale} y1={2} x2={plot.width * scale} y2={14} stroke={isDark ? '#38bdf8' : '#0284c7'} strokeWidth="1.2" />
                  <rect
                    x={(plot.width * scale) / 2 - 42}
                    y={-2}
                    width={84}
                    height={18}
                    fill={isDark ? '#0f172a' : '#ffffff'}
                    rx={4}
                    stroke={isDark ? '#0284c7' : '#0284c7'}
                    strokeWidth="0.8"
                  />
                  <text
                    x={(plot.width * scale) / 2}
                    y={11}
                    textAnchor="middle"
                    fill={isDark ? '#38bdf8' : '#0284c7'}
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {plot.width} {unit} FRONT
                  </text>
                </g>

                {/* Left Depth Dimension */}
                <g transform="translate(-24, 0)">
                  <line x1={8} y1={0} x2={8} y2={plot.length * scale} stroke={isDark ? '#38bdf8' : '#0284c7'} strokeWidth="1.2" />
                  <line x1={2} y1={0} x2={14} y2={0} stroke={isDark ? '#38bdf8' : '#0284c7'} strokeWidth="1.2" />
                  <line x1={2} y1={plot.length * scale} x2={14} y2={plot.length * scale} stroke={isDark ? '#38bdf8' : '#0284c7'} strokeWidth="1.2" />
                  <g transform={`translate(4, ${(plot.length * scale) / 2}) rotate(-90)`}>
                    <rect x={-45} y={-9} width={90} height={18} fill={isDark ? '#0f172a' : '#ffffff'} rx={4} stroke="#0284c7" strokeWidth="0.8" />
                    <text x={0} y={4} textAnchor="middle" fill={isDark ? '#38bdf8' : '#0284c7'} fontSize="10" fontWeight="bold" fontFamily="monospace">
                      {plot.length} {unit} DEPTH
                    </text>
                  </g>
                </g>
              </>
            )}

            {/* 2. Room Elements */}
            {rooms.map((room) => {
              const rx = room.x * scale;
              const ry = room.y * scale;
              const rw = room.width * scale;
              const rh = room.length * scale;
              const isSelected = selectedRoomId === room.id;
              const hasCollision = collidingRoomIds.has(room.id);
              const isOutOfBounds = outOfBoundsRoomIds.has(room.id);
              const isError = hasCollision || isOutOfBounds;
              const roomArea = room.width * room.length;

              return (
                <g
                  key={room.id}
                  transform={`translate(${rx}, ${ry})`}
                  onMouseDown={(e) => startDraggingRoom(e, room)}
                  className="cursor-move group"
                  filter={isSelected ? 'url(#selected-glow)' : 'url(#room-shadow)'}
                >
                  {/* Room Base Rectangle */}
                  <rect
                    width={rw}
                    height={rh}
                    rx={2}
                    className={`transition-colors ${getRoomFill(room.type, isSelected, isError)}`}
                  />

                  {/* Error Hatch overlay if colliding */}
                  {isError && (
                    <rect width={rw} height={rh} fill="url(#error-hatch)" pointerEvents="none" />
                  )}

                  {/* Stairs Tread Fill */}
                  {room.type === 'stairs' && (
                    <rect width={rw} height={rh} fill="url(#stairs-pattern)" pointerEvents="none" opacity={0.6} />
                  )}

                  {/* Corner Dimension Corner Anchors */}
                  {isSelected && (
                    <>
                      <circle cx={0} cy={0} r={4} fill="#06B6D4" stroke="#FFF" strokeWidth="1" />
                      <circle cx={rw} cy={0} r={4} fill="#06B6D4" stroke="#FFF" strokeWidth="1" />
                      <circle cx={0} cy={rh} r={4} fill="#06B6D4" stroke="#FFF" strokeWidth="1" />
                      <circle cx={rw} cy={rh} r={4} fill="#06B6D4" stroke="#FFF" strokeWidth="1" />
                    </>
                  )}

                  {/* 3. Door Openings (Architectural Swing Arc) */}
                  {showDoorsWindows &&
                    room.doors &&
                    room.doors.map((door, dIdx) => {
                      const dOff = door.offset * scale;
                      const dW = door.width * scale;

                      let doorX = 0;
                      let doorY = 0;
                      let pathD = '';

                      if (door.wall === 'bottom') {
                        doorX = dOff;
                        doorY = rh;
                        pathD = `M ${doorX} ${doorY} L ${doorX} ${doorY - dW} A ${dW} ${dW} 0 0 1 ${doorX + dW} ${doorY}`;
                      } else if (door.wall === 'top') {
                        doorX = dOff;
                        doorY = 0;
                        pathD = `M ${doorX} ${doorY} L ${doorX} ${doorY + dW} A ${dW} ${dW} 0 0 0 ${doorX + dW} ${doorY}`;
                      } else if (door.wall === 'left') {
                        doorX = 0;
                        doorY = dOff;
                        pathD = `M ${doorX} ${doorY} L ${doorX + dW} ${doorY} A ${dW} ${dW} 0 0 1 ${doorX} ${doorY + dW}`;
                      } else {
                        doorX = rw;
                        doorY = dOff;
                        pathD = `M ${doorX} ${doorY} L ${doorX - dW} ${doorY} A ${dW} ${dW} 0 0 0 ${doorX} ${doorY + dW}`;
                      }

                      return (
                        <g key={`door-${dIdx}`}>
                          {/* Door frame cutout */}
                          {door.wall === 'bottom' || door.wall === 'top' ? (
                            <line x1={dOff} y1={door.wall === 'bottom' ? rh : 0} x2={dOff + dW} y2={door.wall === 'bottom' ? rh : 0} stroke={isDark ? '#0B1120' : '#FFFFFF'} strokeWidth="3" />
                          ) : (
                            <line x1={door.wall === 'left' ? 0 : rw} y1={dOff} x2={door.wall === 'left' ? 0 : rw} y2={dOff + dW} stroke={isDark ? '#0B1120' : '#FFFFFF'} strokeWidth="3" />
                          )}
                          {/* Door Swing Arc */}
                          <path
                            d={pathD}
                            fill="none"
                            stroke={isDark ? '#F59E0B' : '#D97706'}
                            strokeWidth="1.2"
                            strokeDasharray="2 2"
                          />
                        </g>
                      );
                    })}

                  {/* 4. Window Openings (Double Line with Glazing Core) */}
                  {showDoorsWindows &&
                    room.windows &&
                    room.windows.map((win, wIdx) => {
                      const wOff = win.offset * scale;
                      const wW = win.width * scale;

                      let x1 = 0;
                      let y1 = 0;
                      let x2 = 0;
                      let y2 = 0;

                      if (win.wall === 'top') {
                        x1 = wOff;
                        y1 = 0;
                        x2 = wOff + wW;
                        y2 = 0;
                      } else if (win.wall === 'bottom') {
                        x1 = wOff;
                        y1 = rh;
                        x2 = wOff + wW;
                        y2 = rh;
                      } else if (win.wall === 'left') {
                        x1 = 0;
                        y1 = wOff;
                        x2 = 0;
                        y2 = wOff + wW;
                      } else {
                        x1 = rw;
                        y1 = wOff;
                        x2 = rw;
                        y2 = wOff + wW;
                      }

                      return (
                        <g key={`win-${wIdx}`}>
                          {/* Glazing aperture line */}
                          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#38BDF8" strokeWidth="3.5" />
                          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FFFFFF" strokeWidth="1.2" />
                        </g>
                      );
                    })}

                  {/* Room Label & Dimension Badge */}
                  <g transform={`translate(${rw / 2}, ${rh / 2})`}>
                    <text
                      textAnchor="middle"
                      y={-6}
                      className="font-bold tracking-tight pointer-events-none"
                      fill={isDark ? '#F1F5F9' : '#0F172A'}
                      fontSize={Math.max(9, Math.min(13, rw / 8))}
                    >
                      {room.name}
                    </text>
                    <text
                      textAnchor="middle"
                      y={10}
                      className="font-mono pointer-events-none"
                      fill={isDark ? '#94A3B8' : '#475569'}
                      fontSize={Math.max(8, Math.min(11, rw / 10))}
                    >
                      {formatDim(room.width)} × {formatDim(room.length)}
                    </text>
                    <text
                      textAnchor="middle"
                      y={22}
                      className="font-mono text-[9px] pointer-events-none"
                      fill={isDark ? '#38BDF8' : '#0F766E'}
                      fontSize="9"
                    >
                      {Math.round(roomArea)} {unit}²
                    </text>
                  </g>
                </g>
              );
            })}

            {/* 5. Measurement Line Overlay */}
            {activeTool === 'measure' && measureStart && measureCurrent && (
              <g>
                <line
                  x1={measureStart.x * scale}
                  y1={measureStart.y * scale}
                  x2={measureCurrent.x * scale}
                  y2={measureCurrent.y * scale}
                  stroke="#06B6D4"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
                <circle cx={measureStart.x * scale} cy={measureStart.y * scale} r={4} fill="#06B6D4" />
                <circle cx={measureCurrent.x * scale} cy={measureCurrent.y * scale} r={4} fill="#06B6D4" />
                <rect
                  x={(measureStart.x + measureCurrent.x) / 2 * scale - 28}
                  y={(measureStart.y + measureCurrent.y) / 2 * scale - 12}
                  width={56}
                  height={18}
                  rx={4}
                  fill="#0F172A"
                  stroke="#06B6D4"
                  strokeWidth="1"
                />
                <text
                  x={(measureStart.x + measureCurrent.x) / 2 * scale}
                  y={(measureStart.y + measureCurrent.y) / 2 * scale + 1}
                  textAnchor="middle"
                  fill="#06B6D4"
                  fontSize="9.5"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {measuredDistance?.toFixed(1)} {unit}
                </text>
              </g>
            )}
          </g>
        </svg>
      </div>
    </div>
  );
};
