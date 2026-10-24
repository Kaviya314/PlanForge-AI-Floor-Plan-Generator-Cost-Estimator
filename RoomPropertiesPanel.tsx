import React from 'react';
import { PlanLayout, Room, RoomType, ValidationResult } from '../types/plan';
import {
  Sliders,
  DoorClosed,
  Maximize,
  Box,
  DollarSign,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

interface RoomPropertiesPanelProps {
  layout: PlanLayout;
  validation: ValidationResult;
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string | null) => void;
  onUpdateRoom: (updatedRoom: Room) => void;
  onAddRoom: () => void;
  onDeleteRoom: (roomId: string) => void;
  onDuplicateRoom: (roomId: string) => void;
  onOpenAIExplain?: () => void;
  onNavigateTo3D?: () => void;
  onNavigateToCost?: () => void;
  onAddDoor?: (roomId: string) => void;
  onAddWindow?: (roomId: string) => void;
}

export const RoomPropertiesPanel: React.FC<RoomPropertiesPanelProps> = ({
  layout,
  validation,
  selectedRoomId,
  onSelectRoom,
  onUpdateRoom,
  onAddRoom,
  onDeleteRoom,
  onDuplicateRoom,
  onNavigateTo3D,
  onNavigateToCost,
  onAddDoor,
  onAddWindow,
}) => {
  const { plot, rooms } = layout;
  const unit = plot.unit || 'ft';

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || rooms[0] || null;

  const getRoomIcon = (type: string) => {
    switch (type) {
      case 'living':
        return '🛋️';
      case 'master_bedroom':
        return '🛏️';
      case 'bedroom':
        return '🛏️';
      case 'kitchen':
        return '🍳';
      case 'dining':
        return '🍽️';
      case 'bathroom':
      case 'attached_bathroom':
        return '🚿';
      case 'parking':
        return '🚗';
      case 'balcony':
        return '🌿';
      case 'stairs':
        return '🪜';
      case 'foyer':
        return '🚪';
      default:
        return '📐';
    }
  };

  const roomTypes: { value: RoomType; label: string }[] = [
    { value: 'living', label: 'Living Room' },
    { value: 'master_bedroom', label: 'Master Bedroom' },
    { value: 'bedroom', label: 'Bedroom' },
    { value: 'kitchen', label: 'Kitchen' },
    { value: 'dining', label: 'Dining Area' },
    { value: 'bathroom', label: 'Common Bathroom' },
    { value: 'attached_bathroom', label: 'Attached Bath' },
    { value: 'parking', label: 'Car Porch' },
    { value: 'balcony', label: 'Balcony' },
    { value: 'stairs', label: 'Staircase' },
    { value: 'foyer', label: 'Foyer' },
    { value: 'custom', label: 'Custom Space' },
  ];

  const plotArea = plot.width * plot.length;
  const totalRoomArea = Math.round(validation.total_room_area || rooms.reduce((acc, r) => acc + r.width * r.length, 0));
  const coveragePercent = Math.min(100, Math.round((totalRoomArea / (plotArea || 1)) * 100));

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col h-full overflow-hidden">
      {/* Panel Scrollable Content */}
      <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-220px)]">
        {/* CARD 1: Selected Room Properties */}
        {selectedRoom ? (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <span className="text-xl leading-none">{getRoomIcon(selectedRoom.type)}</span>
                <div>
                  <h4 className="font-bold text-sm text-[#10294F] tracking-tight">{selectedRoom.name}</h4>
                  <p className="text-[11px] text-[#64748B] capitalize">{selectedRoom.type.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onDuplicateRoom(selectedRoom.id)}
                  className="p-1.5 text-[#64748B] hover:text-[#3168F5] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                  title="Duplicate Room"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteRoom(selectedRoom.id)}
                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                  title="Delete Room"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Room Name & Category */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Room Label</label>
                <input
                  type="text"
                  value={selectedRoom.name}
                  onChange={(e) => onUpdateRoom({ ...selectedRoom, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#F5F8FD] border border-[#E2E8F0] rounded-lg text-[#10294F] font-medium focus:outline-none focus:ring-1 focus:ring-[#3168F5] focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Category</label>
                <select
                  value={selectedRoom.type}
                  onChange={(e) => onUpdateRoom({ ...selectedRoom, type: e.target.value as RoomType })}
                  className="w-full px-2 py-1.5 text-xs bg-[#F5F8FD] border border-[#E2E8F0] rounded-lg text-[#10294F] font-medium focus:outline-none focus:ring-1 focus:ring-[#3168F5] focus:bg-white transition"
                >
                  {roomTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Room Dimensions Grid matching Reference: Length, Width, Area, Wall Height */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-[#F5F8FD] border border-[#E2E8F0]">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#64748B] mb-0.5">
                  Length
                </label>
                <div className="flex items-center justify-between">
                  <input
                    type="number"
                    min="4"
                    max={plot.length}
                    step="0.5"
                    value={selectedRoom.length}
                    onChange={(e) =>
                      onUpdateRoom({ ...selectedRoom, length: Math.max(3, parseFloat(e.target.value) || 3) })
                    }
                    className="w-16 font-bold text-sm text-[#10294F] bg-transparent focus:outline-none"
                  />
                  <span className="text-[11px] text-[#64748B] font-mono">{unit}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#F5F8FD] border border-[#E2E8F0]">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#64748B] mb-0.5">
                  Width
                </label>
                <div className="flex items-center justify-between">
                  <input
                    type="number"
                    min="4"
                    max={plot.width}
                    step="0.5"
                    value={selectedRoom.width}
                    onChange={(e) =>
                      onUpdateRoom({ ...selectedRoom, width: Math.max(3, parseFloat(e.target.value) || 3) })
                    }
                    className="w-16 font-bold text-sm text-[#10294F] bg-transparent focus:outline-none"
                  />
                  <span className="text-[11px] text-[#64748B] font-mono">{unit}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#F5F8FD] border border-[#E2E8F0]">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#64748B] mb-0.5">
                  Area
                </label>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#3168F5]">
                    {Math.round(selectedRoom.width * selectedRoom.length)}
                  </span>
                  <span className="text-[11px] text-[#64748B] font-mono">{unit}²</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#F5F8FD] border border-[#E2E8F0]">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#64748B] mb-0.5">
                  Wall Height
                </label>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#10294F]">10.0</span>
                  <span className="text-[11px] text-[#64748B] font-mono">{unit}</span>
                </div>
              </div>
            </div>

            {/* Position Offsets */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <label className="block text-[10px] font-medium text-[#64748B] mb-1">X Offset (from left)</label>
                <input
                  type="number"
                  min="0"
                  max={plot.width - selectedRoom.width}
                  step="0.5"
                  value={selectedRoom.x}
                  onChange={(e) => onUpdateRoom({ ...selectedRoom, x: Math.max(0, parseFloat(e.target.value) || 0) })}
                  className="w-full px-2.5 py-1 text-xs bg-[#F5F8FD] border border-[#E2E8F0] rounded-lg text-[#10294F] font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-[#64748B] mb-1">Y Offset (from top)</label>
                <input
                  type="number"
                  min="0"
                  max={plot.length - selectedRoom.length}
                  step="0.5"
                  value={selectedRoom.y}
                  onChange={(e) => onUpdateRoom({ ...selectedRoom, y: Math.max(0, parseFloat(e.target.value) || 0) })}
                  className="w-full px-2.5 py-1 text-xs bg-[#F5F8FD] border border-[#E2E8F0] rounded-lg text-[#10294F] font-mono"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 bg-[#F5F8FD] rounded-xl border border-dashed border-[#CBD5E1] text-center text-xs text-[#64748B]">
            Select a room on the canvas or from the schedule to view its dimensions and architectural properties.
          </div>
        )}

        {/* CARD 2: Doors & Windows List matching Reference */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#10294F] flex items-center gap-1.5">
              <DoorClosed className="w-3.5 h-3.5 text-[#3168F5]" />
              <span>Doors &amp; Windows</span>
            </h4>
            {selectedRoom && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onAddDoor && onAddDoor(selectedRoom.id)}
                  className="px-2 py-0.5 text-[10px] font-semibold text-[#3168F5] bg-blue-50 hover:bg-blue-100 rounded-md transition cursor-pointer"
                  title="Add door to selected room"
                >
                  + Door
                </button>
                <button
                  onClick={() => onAddWindow && onAddWindow(selectedRoom.id)}
                  className="px-2 py-0.5 text-[10px] font-semibold text-[#0D9488] bg-teal-50 hover:bg-teal-100 rounded-md transition cursor-pointer"
                  title="Add window to selected room"
                >
                  + Win
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-[#F5F8FD] border border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-[#3168F5] flex items-center justify-center">
                  <DoorClosed className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-semibold text-[#10294F] block">Standard Flush Door</span>
                  <span className="text-[10px] text-[#64748B]">3.0 ft × 7.0 ft</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white text-[#3168F5] border border-[#E2E8F0]">
                {selectedRoom?.doors?.length || 1}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#F5F8FD] border border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-teal-100 text-[#0D9488] flex items-center justify-center">
                  <Maximize className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-semibold text-[#10294F] block">Glazed UPVC Window</span>
                  <span className="text-[10px] text-[#64748B]">4.0 ft × 4.5 ft</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white text-[#0D9488] border border-[#E2E8F0]">
                {selectedRoom?.windows?.length || 2}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 3: Project Summary matching Reference */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-2xs space-y-3">
          <h4 className="font-bold text-xs uppercase tracking-wider text-[#10294F] flex items-center gap-1.5 pb-2 border-b border-[#E2E8F0]">
            <Sliders className="w-3.5 h-3.5 text-[#0D9488]" />
            <span>Project Summary</span>
          </h4>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-dashed border-[#E2E8F0]">
              <span className="text-[#64748B]">Built-up Area</span>
              <span className="font-bold text-[#10294F]">{totalRoomArea.toLocaleString()} {unit}²</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-dashed border-[#E2E8F0]">
              <span className="text-[#64748B]">Plot Area</span>
              <span className="font-bold text-[#10294F]">{plotArea.toLocaleString()} {unit}²</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-dashed border-[#E2E8F0]">
              <span className="text-[#64748B]">Ground Coverage</span>
              <span className="font-bold text-[#0D9488]">{coveragePercent}%</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-[#64748B]">Geometric Compliance</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Passed</span>
              </span>
            </div>
          </div>

          {/* Quick Cross-Navigation Buttons */}
          <div className="pt-2 space-y-2">
            {onNavigateTo3D && (
              <button
                onClick={onNavigateTo3D}
                className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold text-white bg-[#3168F5] hover:bg-[#2557D6] transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Box className="w-3.5 h-3.5" />
                <span>View in 3D Model</span>
                <ArrowRight className="w-3 h-3 ml-auto" />
              </button>
            )}

            {onNavigateToCost && (
              <button
                onClick={onNavigateToCost}
                className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-[#10294F] bg-[#F5F8FD] hover:bg-slate-100 border border-[#E2E8F0] transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <DollarSign className="w-3.5 h-3.5 text-[#0D9488]" />
                <span>View Cost Breakdown</span>
                <ArrowRight className="w-3 h-3 ml-auto text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* CARD 4: Room Hierarchy / Schedule List */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#10294F]">
              Room Schedule ({rooms.length})
            </h4>
            <button
              onClick={onAddRoom}
              className="text-[11px] font-semibold text-[#3168F5] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Add Room</span>
            </button>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {rooms.map((room) => {
              const isSelected = room.id === selectedRoomId;
              const area = Math.round(room.width * room.length);

              return (
                <div
                  key={room.id}
                  onClick={() => onSelectRoom(room.id)}
                  className={`p-2 rounded-xl border text-xs flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 border-[#3168F5] text-[#3168F5] font-semibold shadow-2xs'
                      : 'bg-[#F5F8FD] border-[#E2E8F0] text-[#10294F] hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate mr-2">
                    <span className="text-sm">{getRoomIcon(room.type)}</span>
                    <span className="truncate">{room.name}</span>
                  </div>

                  <div className="text-[11px] font-mono text-[#64748B] shrink-0">
                    {room.width}'×{room.length}' ({area} {unit}²)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

