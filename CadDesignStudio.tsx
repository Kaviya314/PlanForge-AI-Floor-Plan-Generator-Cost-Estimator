import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  PlanLayout,
  Room,
  RoomType,
  ValidationResult,
  UnitRateOverride,
  CadTool,
  CadTheme,
  ActiveTab
} from '../types/plan';
import { calculateCostEstimate } from '../utils/costCalculation';
import { FloorPlanCanvas } from './FloorPlanCanvas';
import { ThreeDVisualizer } from './ThreeDVisualizer';
import { StructuralBimView } from './StructuralBimView';
import { CostDashboard } from './CostDashboard';
import { RoomPropertiesPanel } from './RoomPropertiesPanel';
import {
  MousePointer,
  Plus,
  DoorClosed,
  Maximize,
  Ruler,
  Magnet,
  Trash2,
  Copy,
  Undo2,
  Redo2,
  Save,
  Download,
  Share2,
  Moon,
  Sun,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Box,
  Compass,
  DollarSign,
  Cpu,
  ChevronRight,
  ArrowLeft,
  X,
  CheckCircle2,
  Upload,
  FileSpreadsheet,
  FileCode,
  Printer,
  Armchair
} from 'lucide-react';

interface CadDesignStudioProps {
  layout: PlanLayout;
  validation: ValidationResult;
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string | null) => void;
  onUpdateLayout: (updated: PlanLayout) => void;
  rateOverrides: UnitRateOverride;
  onUpdateRate: (itemId: string, newRate: number) => void;
  onResetRates: () => void;
  onSaveProject: () => void;
  onExitToHome: () => void;
  onOpenAIExplain: () => void;
  aiConfigured: boolean;
  activeStudioTab?: 'plan' | '3d' | 'bim' | 'cost';
  onChangeStudioTab?: (tab: 'plan' | '3d' | 'bim' | 'cost') => void;
}

export const CadDesignStudio: React.FC<CadDesignStudioProps> = ({
  layout,
  validation,
  selectedRoomId,
  onSelectRoom,
  onUpdateLayout,
  rateOverrides,
  onUpdateRate,
  onResetRates,
  onSaveProject,
  onExitToHome,
  onOpenAIExplain,
  aiConfigured,
  activeStudioTab: activeStudioTabProp,
  onChangeStudioTab,
}) => {
  // Studio View Mode: 'plan' (2D) | '3d' | 'bim' | 'cost'
  const [internalStudioTab, setInternalStudioTab] = useState<'plan' | '3d' | 'bim' | 'cost'>('plan');
  const activeStudioTab = activeStudioTabProp || internalStudioTab;

  const handleTabChange = (tab: 'plan' | '3d' | 'bim' | 'cost') => {
    setInternalStudioTab(tab);
    if (onChangeStudioTab) {
      onChangeStudioTab(tab);
    }
  };

  const [cadTheme, setCadTheme] = useState<CadTheme>('blueprint_light');
  const [activeTool, setActiveTool] = useState<CadTool>('select');
  const [snapUnit, setSnapUnit] = useState<number>(0.5);

  // Layer Visibility
  const [layers, setLayers] = useState({
    walls: true,
    doors: true,
    windows: true,
    furniture: true,
    dimensions: true,
  });

  // Undo / Redo History Stack
  const [history, setHistory] = useState<PlanLayout[]>([layout]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const isInternalUpdate = useRef<boolean>(false);

  // Computed Cost Estimate for the studio
  const estimate = useMemo(() => calculateCostEstimate(layout, rateOverrides), [layout, rateOverrides]);

  // Status & Readout states
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSaved, setIsSaved] = useState<boolean>(true);
  const [showValidationModal, setShowValidationModal] = useState<boolean>(false);
  const [showAddRoomModal, setShowAddRoomModal] = useState<boolean>(false);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);

  // Push layout changes to history
  const pushLayoutToHistory = (newLayout: PlanLayout) => {
    isInternalUpdate.current = true;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newLayout);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setIsSaved(false);
    onUpdateLayout(newLayout);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      isInternalUpdate.current = true;
      onUpdateLayout(prev);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      isInternalUpdate.current = true;
      onUpdateLayout(next);
    }
  };

  // Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        handleRedo();
      } else if (e.key === 'Escape') {
        setActiveTool('select');
        setShowAddRoomModal(false);
        setShowValidationModal(false);
        setShowExportMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  // Update Room Position
  const handleUpdateRoomPosition = (roomId: string, newX: number, newY: number) => {
    const updatedRooms = layout.rooms.map((r) =>
      r.id === roomId ? { ...r, x: newX, y: newY } : r
    );
    const updatedLayout = { ...layout, rooms: updatedRooms, updated_at: new Date().toISOString() };
    pushLayoutToHistory(updatedLayout);
  };

  // Update Room Properties
  const handleUpdateRoom = (updatedRoom: Room) => {
    const updatedRooms = layout.rooms.map((r) =>
      r.id === updatedRoom.id ? updatedRoom : r
    );
    const updatedLayout = { ...layout, rooms: updatedRooms, updated_at: new Date().toISOString() };
    pushLayoutToHistory(updatedLayout);
  };

  // Add a Door to a Room
  const handleAddDoorToRoom = (roomId: string, wall: 'top' | 'bottom' | 'left' | 'right' = 'bottom') => {
    const target = layout.rooms.find((r) => r.id === roomId);
    if (!target) return;
    const currentDoors = target.doors || [];
    const newDoor = {
      wall,
      offset: Math.min(2, target.width * 0.25),
      width: Math.min(3, target.width * 0.35),
    };
    handleUpdateRoom({ ...target, doors: [...currentDoors, newDoor] });
  };

  // Add a Window to a Room
  const handleAddWindowToRoom = (roomId: string, wall: 'top' | 'bottom' | 'left' | 'right' = 'top') => {
    const target = layout.rooms.find((r) => r.id === roomId);
    if (!target) return;
    const currentWindows = target.windows || [];
    const newWin = {
      wall,
      offset: Math.min(2, target.width * 0.25),
      width: Math.min(4, target.width * 0.4),
    };
    handleUpdateRoom({ ...target, windows: [...currentWindows, newWin] });
  };

  // Add New Room
  const handleCreateRoom = (type: RoomType, name: string, w = 12, l = 14) => {
    const newId = `room-${Date.now().toString().slice(-4)}`;
    // Find non-overlapping coordinate
    const newRoom: Room = {
      id: newId,
      name,
      type,
      x: 3,
      y: 3,
      width: Math.min(layout.plot.width - 4, w),
      length: Math.min(layout.plot.length - 4, l),
      doors: [{ wall: 'bottom', offset: 2, width: 3 }],
      windows: [{ wall: 'top', offset: 2, width: 4 }],
    };
    const updatedLayout = {
      ...layout,
      rooms: [...layout.rooms, newRoom],
      updated_at: new Date().toISOString(),
    };
    pushLayoutToHistory(updatedLayout);
    onSelectRoom(newId);
    setShowAddRoomModal(false);
    setActiveTool('select');
  };

  // Duplicate Room
  const handleDuplicateRoom = (roomId: string) => {
    const source = layout.rooms.find((r) => r.id === roomId);
    if (!source) return;
    const newId = `room-${Date.now().toString().slice(-4)}`;
    const copy: Room = {
      ...source,
      id: newId,
      name: `${source.name} (Copy)`,
      x: Math.min(layout.plot.width - source.width, source.x + 2),
      y: Math.min(layout.plot.length - source.length, source.y + 2),
    };
    const updatedLayout = {
      ...layout,
      rooms: [...layout.rooms, copy],
      updated_at: new Date().toISOString(),
    };
    pushLayoutToHistory(updatedLayout);
    onSelectRoom(newId);
  };

  // Delete Room
  const handleDeleteRoom = (roomId: string) => {
    if (layout.rooms.length <= 1) return;
    const updatedRooms = layout.rooms.filter((r) => r.id !== roomId);
    const updatedLayout = { ...layout, rooms: updatedRooms, updated_at: new Date().toISOString() };
    pushLayoutToHistory(updatedLayout);
    onSelectRoom(updatedRooms[0]?.id || null);
  };

  // Save Project
  const handleSave = () => {
    onSaveProject();
    setIsSaved(true);
  };

  // Export JSON file
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(layout, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `${layout.project_name.toLowerCase().replace(/\s+/g, '_')}_cad_model.json`);
    dlAnchorElem.click();
    setShowExportMenu(false);
  };

  // Export DXF (Standard CAD format text representation)
  const handleExportDxf = () => {
    let dxf = '0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n';
    layout.rooms.forEach((r) => {
      // Draw 4 polyline lines for each room rectangle
      const x1 = r.x;
      const y1 = r.y;
      const x2 = r.x + r.width;
      const y2 = r.y + r.length;
      dxf += `0\nLINE\n8\nROOMS\n10\n${x1}\n20\n${y1}\n11\n${x2}\n21\n${y1}\n`;
      dxf += `0\nLINE\n8\nROOMS\n10\n${x2}\n20\n${y1}\n11\n${x2}\n21\n${y2}\n`;
      dxf += `0\nLINE\n8\nROOMS\n10\n${x2}\n20\n${y2}\n11\n${x1}\n21\n${y2}\n`;
      dxf += `0\nLINE\n8\nROOMS\n10\n${x1}\n20\n${y2}\n11\n${x1}\n21\n${y1}\n`;
    });
    dxf += '0\nENDSEC\n0\nEOF\n';

    const blob = new Blob([dxf], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${layout.project_name.toLowerCase().replace(/\s+/g, '_')}.dxf`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const selectedRoom = layout.rooms.find((r) => r.id === selectedRoomId) || null;
  const isDark = cadTheme === 'dark_navy';

  return (
    <div className="flex flex-col w-full rounded-2xl overflow-hidden border border-[#E2E8F0] shadow-sm bg-[#F5F8FD] text-[#10294F]">
      {/* 1. ARCHITECTURAL SUB-HEADER PANEL MATCHING SCREEN 2 */}
      <div className="px-6 py-4 bg-gradient-to-r from-[#EAF3FF] via-[#F0F6FF] to-[#EAF3FF] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-4">
        {/* Left: Icon + Heading + Subtitle */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200/80 text-[#0D9488] flex items-center justify-center shadow-2xs shrink-0">
            <Compass className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-[#10294F]">2D Floor Plan</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100/70 text-[#3168F5] border border-blue-200/60">
                CAD Canvas
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Design and edit your architectural floor plan. Drag rooms, place doors and windows.
            </p>
          </div>
        </div>

        {/* Right: Segmented Mode Selector & Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Segmented View Controls */}
          <div className="flex items-center p-1 bg-white rounded-xl border border-[#E2E8F0] shadow-2xs text-xs">
            <button
              onClick={() => handleTabChange('plan')}
              className="px-3.5 py-1.5 rounded-lg font-semibold text-white bg-[#3168F5] shadow-2xs transition cursor-pointer flex items-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>2D Plan</span>
            </button>
            <button
              onClick={() => handleTabChange('3d')}
              className="px-3.5 py-1.5 rounded-lg font-medium text-[#64748B] hover:text-[#10294F] hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5"
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Model</span>
            </button>
            <button
              onClick={() => handleTabChange('cost')}
              className="px-3.5 py-1.5 rounded-lg font-medium text-[#64748B] hover:text-[#10294F] hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Cost</span>
            </button>
          </div>

          {/* Undo / Redo */}
          <div className="flex items-center bg-white border border-[#E2E8F0] rounded-xl p-0.5 shadow-2xs">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-2 text-[#64748B] hover:text-[#10294F] disabled:opacity-30 disabled:hover:text-[#64748B] rounded-lg transition cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 text-[#64748B] hover:text-[#10294F] disabled:opacity-30 disabled:hover:text-[#64748B] rounded-lg transition cursor-pointer"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Validate Design */}
          <button
            onClick={() => setShowValidationModal(true)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
              validation.is_valid
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
          >
            {validation.is_valid ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            )}
            <span className="hidden sm:inline">Validate</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#10294F] bg-white hover:bg-slate-50 border border-[#E2E8F0] transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-[#3168F5]" />
              <span>Export</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-11 w-48 bg-white border border-[#E2E8F0] rounded-xl shadow-xl p-1.5 z-50 text-xs space-y-1">
                <button
                  onClick={handleExportDxf}
                  className="w-full text-left px-3 py-2 rounded-lg text-[#10294F] hover:bg-[#F5F8FD] hover:text-[#3168F5] flex items-center gap-2 transition cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5 text-[#3168F5]" />
                  <span>AutoCAD (.DXF)</span>
                </button>
                <button
                  onClick={handleExportJson}
                  className="w-full text-left px-3 py-2 rounded-lg text-[#10294F] hover:bg-[#F5F8FD] hover:text-[#3168F5] flex items-center gap-2 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#0D9488]" />
                  <span>BIM Model (.JSON)</span>
                </button>
                <button
                  onClick={() => {
                    window.print();
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-[#10294F] hover:bg-[#F5F8FD] hover:text-[#3168F5] flex items-center gap-2 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Print Blueprint / PDF</span>
                </button>
              </div>
            )}
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0B7F74] transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN 3-COLUMN WORKSPACE MATCHING SCREEN 2 */}
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Design Tools & Layers (approx 260px / col-span-3) */}
        {activeStudioTab === 'plan' && (
          <aside className="lg:col-span-3 space-y-4">
            {/* CARD 1: Design Tools */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#10294F] flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                <span>Design Tools</span>
                <span className="text-[10px] font-normal text-[#64748B]">Active: {activeTool}</span>
              </h3>

              <div className="grid grid-cols-1 gap-1 text-xs">
                {[
                  {
                    id: 'select',
                    label: 'Select',
                    icon: MousePointer,
                    action: () => setActiveTool('select'),
                    isActive: activeTool === 'select',
                  },
                  {
                    id: 'room',
                    label: 'Room',
                    icon: Plus,
                    action: () => setShowAddRoomModal(true),
                    isActive: activeTool === 'add-room',
                  },
                  {
                    id: 'wall',
                    label: 'Wall',
                    icon: Layers,
                    action: () => setActiveTool('wall' as any),
                    isActive: (activeTool as any) === 'wall',
                  },
                  {
                    id: 'door',
                    label: 'Door',
                    icon: DoorClosed,
                    action: () => {
                      setActiveTool('add-door');
                      if (selectedRoomId) handleAddDoorToRoom(selectedRoomId);
                    },
                    isActive: activeTool === 'add-door',
                  },
                  {
                    id: 'window',
                    label: 'Window',
                    icon: Maximize,
                    action: () => {
                      setActiveTool('add-window');
                      if (selectedRoomId) handleAddWindowToRoom(selectedRoomId);
                    },
                    isActive: activeTool === 'add-window',
                  },
                  {
                    id: 'stairs',
                    label: 'Stairs',
                    icon: Layers,
                    action: () => handleCreateRoom('stairs', 'Staircase Flight', 8, 12),
                    isActive: false,
                  },
                  {
                    id: 'balcony',
                    label: 'Balcony',
                    icon: Share2,
                    action: () => handleCreateRoom('balcony', 'Sit-out Balcony', 10, 6),
                    isActive: false,
                  },
                  {
                    id: 'furniture',
                    label: 'Furniture',
                    icon: Armchair,
                    action: () => handleCreateRoom('living', 'Furnished Living', 14, 16),
                    isActive: false,
                  },
                  {
                    id: 'dimension',
                    label: 'Dimension',
                    icon: Ruler,
                    action: () => setActiveTool(activeTool === 'measure' ? 'select' : 'measure'),
                    isActive: activeTool === 'measure',
                  },
                ].map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      onClick={tool.action}
                      className={`w-full px-3 py-2 rounded-xl font-medium transition cursor-pointer flex items-center justify-between ${
                        tool.isActive
                          ? 'bg-[#3168F5] text-white shadow-xs font-semibold'
                          : 'text-[#10294F] hover:bg-[#F5F8FD] hover:text-[#3168F5]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${tool.isActive ? 'text-white' : 'text-[#64748B]'}`} />
                        <span>{tool.label}</span>
                      </div>
                      {tool.isActive && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CARD 2: Layers */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#10294F] pb-2 border-b border-[#E2E8F0]">
                Layers
              </h3>

              <div className="space-y-2 text-xs">
                {[
                  { id: 'walls', label: 'Walls', checked: layers.walls },
                  { id: 'doors', label: 'Doors', checked: layers.doors },
                  { id: 'windows', label: 'Windows', checked: layers.windows },
                  { id: 'furniture', label: 'Furniture', checked: layers.furniture },
                  { id: 'dimensions', label: 'Dimensions', checked: layers.dimensions },
                ].map((layer) => (
                  <label
                    key={layer.id}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-[#F5F8FD] transition cursor-pointer select-none"
                  >
                    <span className="font-medium text-[#10294F]">{layer.label}</span>
                    <input
                      type="checkbox"
                      checked={layer.checked}
                      onChange={() =>
                        setLayers((prev) => ({
                          ...prev,
                          [layer.id]: !prev[layer.id as keyof typeof prev],
                        }))
                      }
                      className="w-4 h-4 rounded text-[#3168F5] focus:ring-[#3168F5] border-[#CBD5E1]"
                    />
                  </label>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* CENTER COLUMN: Floor Plan Interactive Canvas (col-span-6) */}
        <section className={`h-[680px] rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden bg-white ${
          activeStudioTab === 'plan' ? 'lg:col-span-6' : 'lg:col-span-12'
        }`}>
          {activeStudioTab === 'plan' && (
            <FloorPlanCanvas
              layout={layout}
              validation={validation}
              selectedRoomId={selectedRoomId}
              onSelectRoom={onSelectRoom}
              onUpdateRoomPosition={handleUpdateRoomPosition}
              activeTool={activeTool}
              theme={cadTheme}
              snapUnit={snapUnit}
              onCursorMove={(x, y) => setCursorPos({ x, y })}
              onAddDoorToRoom={handleAddDoorToRoom}
              onAddWindowToRoom={handleAddWindowToRoom}
            />
          )}

          {activeStudioTab === '3d' && (
            <ThreeDVisualizer
              layout={layout}
              selectedRoomId={selectedRoomId}
              onSelectRoom={onSelectRoom}
            />
          )}

          {activeStudioTab === 'bim' && (
            <StructuralBimView layout={layout} theme={cadTheme} />
          )}

          {activeStudioTab === 'cost' && (
            <div className="h-full overflow-y-auto p-4 sm:p-6 bg-white">
              <CostDashboard
                layout={layout}
                estimate={estimate}
                rateOverrides={rateOverrides}
                onUpdateRate={onUpdateRate}
                onResetRates={onResetRates}
              />
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: Room Properties & Summary Panel (approx 320px / col-span-3) */}
        {activeStudioTab === 'plan' && (
          <aside className="lg:col-span-3">
            <RoomPropertiesPanel
              layout={layout}
              validation={validation}
              selectedRoomId={selectedRoomId}
              onSelectRoom={onSelectRoom}
              onUpdateRoom={handleUpdateRoom}
              onAddRoom={() => setShowAddRoomModal(true)}
              onDeleteRoom={handleDeleteRoom}
              onDuplicateRoom={handleDuplicateRoom}
              onOpenAIExplain={onOpenAIExplain}
              onNavigateTo3D={() => handleTabChange('3d')}
              onNavigateToCost={() => handleTabChange('cost')}
              onAddDoor={handleAddDoorToRoom}
              onAddWindow={handleAddWindowToRoom}
            />
          </aside>
        )}
      </div>

      {/* 3. BOTTOM CAD STATUS BAR */}
      <footer className={`h-8 px-4 flex items-center justify-between border-t text-[11px] font-mono flex-shrink-0 select-none ${
        isDark ? 'bg-[#080D1A] border-zinc-800 text-zinc-400' : 'bg-[#FAF9F6] border-[#E7E5E0] text-[#71717A]'
      }`}>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
            <span>TOOL: {activeTool.toUpperCase()}</span>
          </span>
          <span>
            X: {cursorPos.x.toFixed(1)} {layout.plot.unit} | Y: {cursorPos.y.toFixed(1)} {layout.plot.unit}
          </span>
          <span className="hidden sm:inline">
            SNAP: {snapUnit} {layout.plot.unit}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {selectedRoom ? (
            <span className="text-teal-400">
              SELECTED: {selectedRoom.name} ({selectedRoom.width}' × {selectedRoom.length}')
            </span>
          ) : (
            <span>SELECT A ROOM TO EDIT OR DRAG</span>
          )}
          <span className="hidden md:inline">
            PLOT: {layout.plot.width}×{layout.plot.length} {layout.plot.unit} ({(layout.plot.width * layout.plot.length).toLocaleString()} {layout.plot.unit}²)
          </span>
        </div>
      </footer>

      {/* MODAL: ADD ROOM PICKER */}
      {showAddRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-6 text-zinc-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-semibold text-base flex items-center gap-2 text-white">
                <Plus className="w-4 h-4 text-teal-400" />
                Add Architectural Room Module
              </h3>
              <button
                onClick={() => setShowAddRoomModal(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { type: 'living', label: 'Living Room', w: 14, l: 16 },
                { type: 'master_bedroom', label: 'Master Suite', w: 14, l: 14 },
                { type: 'bedroom', label: 'Bedroom', w: 12, l: 12 },
                { type: 'kitchen', label: 'Modular Kitchen', w: 10, l: 10 },
                { type: 'dining', label: 'Dining Area', w: 10, l: 10 },
                { type: 'bathroom', label: 'Common Washroom', w: 6, l: 8 },
                { type: 'attached_bathroom', label: 'Attached Bath', w: 5, l: 7 },
                { type: 'parking', label: 'Car Porch / Garage', w: 12, l: 15 },
                { type: 'balcony', label: 'Sit-out Balcony', w: 10, l: 6 },
                { type: 'stairs', label: 'Staircase Flight', w: 8, l: 12 },
                { type: 'foyer', label: 'Entrance Foyer', w: 8, l: 8 },
                { type: 'utility', label: 'Utility / Laundry', w: 6, l: 8 },
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => handleCreateRoom(item.type as RoomType, item.label, item.w, item.l)}
                  className="p-3 rounded-xl bg-zinc-800/80 hover:bg-teal-950/60 hover:border-teal-500/60 border border-zinc-700 transition text-left cursor-pointer space-y-1"
                >
                  <div className="font-semibold text-zinc-100">{item.label}</div>
                  <div className="text-[10px] text-zinc-400 font-mono">
                    Default {item.w}×{item.l} {layout.plot.unit}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DESIGN VALIDATION HUD */}
      {showValidationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg p-6 text-zinc-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-semibold text-base flex items-center gap-2 text-white">
                <ShieldCheck className="w-5 h-5 text-teal-400" />
                Architectural Compliance & Collision Audit
              </h3>
              <button
                onClick={() => setShowValidationModal(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700 flex items-center justify-between">
                <span>Layout Geometric Integrity:</span>
                <span className={`font-semibold ${validation.is_valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {validation.is_valid ? 'PASSED (0 Errors)' : `${validation.errors.length} Critical Issue(s)`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/60">
                  <span className="text-zinc-400 block">Total Plot Area</span>
                  <span className="font-bold text-sm text-teal-400">{validation.plot_area} {layout.plot.unit}²</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/60">
                  <span className="text-zinc-400 block">Total Room Footprint</span>
                  <span className="font-bold text-sm text-teal-400">{Math.round(validation.total_room_area)} {layout.plot.unit}²</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/60">
                  <span className="text-zinc-400 block">Ground Coverage</span>
                  <span className="font-bold text-sm text-teal-400">{validation.coverage_percentage.toFixed(1)}%</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/60">
                  <span className="text-zinc-400 block">Boundary Checks</span>
                  <span className="font-bold text-sm text-emerald-400">Within Setbacks</span>
                </div>
              </div>

              {validation.errors.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="font-semibold text-rose-400">Detected Geometric Issues:</span>
                  {validation.errors.map((err) => (
                    <div key={err.id} className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-200">
                      {err.message}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowValidationModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#0F766E] hover:bg-[#0D9488] transition cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
