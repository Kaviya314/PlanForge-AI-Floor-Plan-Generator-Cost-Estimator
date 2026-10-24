import React, { useState, useEffect } from 'react';
import { PlanLayout, UnitRateOverride } from '../types/plan';
import {
  getSavedProjects,
  deleteSavedProject,
  SavedProject,
  saveProject
} from '../services/storage';
import {
  FolderKanban,
  Search,
  Plus,
  MoreVertical,
  ExternalLink,
  Trash2,
  Calendar,
  Layers,
  ChevronDown
} from 'lucide-react';

interface SavedProjectsViewProps {
  currentLayout: PlanLayout;
  currentRates: UnitRateOverride;
  onLoadProject: (layout: PlanLayout, rates?: UnitRateOverride) => void;
  onSaveCurrent: () => void;
  onNewProject?: () => void;
}

export const SavedProjectsView: React.FC<SavedProjectsViewProps> = ({
  currentLayout,
  currentRates,
  onLoadProject,
  onSaveCurrent,
  onNewProject,
}) => {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const defaultTemplates: SavedProject[] = [
    {
      id: 'proj-1',
      name: '3BHK Home',
      saved_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      layout: {
        ...currentLayout,
        project_name: '3BHK Home',
        house_type: '3BHK',
        plot: { width: 30, length: 40, unit: 'ft' },
        floors: 1,
      },
    },
    {
      id: 'proj-2',
      name: '2BHK Villa',
      saved_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      layout: {
        ...currentLayout,
        project_name: '2BHK Villa',
        house_type: '2BHK',
        plot: { width: 30, length: 30, unit: 'ft' },
        floors: 1,
      },
    },
    {
      id: 'proj-3',
      name: 'Modern House',
      saved_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      layout: {
        ...currentLayout,
        project_name: 'Modern House',
        house_type: 'Villa',
        plot: { width: 30, length: 50, unit: 'ft' },
        floors: 2,
      },
    },
    {
      id: 'proj-4',
      name: 'Small Home',
      saved_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      layout: {
        ...currentLayout,
        project_name: 'Small Home',
        house_type: '1BHK',
        plot: { width: 25, length: 32, unit: 'ft' },
        floors: 1,
      },
    },
    {
      id: 'proj-5',
      name: 'Duplex Home',
      saved_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      layout: {
        ...currentLayout,
        project_name: 'Duplex Home',
        house_type: 'Duplex',
        plot: { width: 36, length: 50, unit: 'ft' },
        floors: 2,
      },
    },
    {
      id: 'proj-6',
      name: 'Beach House',
      saved_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
      layout: {
        ...currentLayout,
        project_name: 'Beach House',
        house_type: 'Villa',
        plot: { width: 40, length: 50, unit: 'ft' },
        floors: 1,
      },
    },
  ];

  const loadList = () => {
    const stored = getSavedProjects();
    if (stored.length === 0) {
      // Seed with initial realistic project cards matching reference image
      defaultTemplates.forEach((t) => saveProject(t.layout));
      setProjects(getSavedProjects());
    } else {
      setProjects(stored);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSavedProject(id);
    loadList();
  };

  const getStatus = (name: string, idx: number) => {
    if (name.includes('3BHK') || name.includes('Small')) {
      return { label: 'Completed', color: 'bg-[#E6F8F0] text-[#00A86B]' };
    }
    if (name.includes('Villa') || name.includes('Duplex')) {
      return { label: 'In Progress', color: 'bg-blue-50 text-[#2B66F6]' };
    }
    return { label: 'Draft', color: 'bg-amber-50 text-amber-700' };
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days <= 2) return '2 days ago';
    if (days <= 5) return '5 days ago';
    if (days <= 7) return '1 week ago';
    return `${Math.max(2, Math.floor(days / 7))} weeks ago`;
  };

  const filtered = projects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === 'All' || p.layout.house_type.includes(typeFilter);
    return matchSearch && matchType;
  });

  return (
    <div className="w-full space-y-5 animate-fade-in select-none">
      {/* 1. SUB-HEADER BANNER (Matches Screen 5 in reference image) */}
      <div className="bg-gradient-to-r from-[#EBF3FC] via-[#F3F8FD] to-[#EAF2FC] border border-[#DFEAF5] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#D7F3F2] border border-teal-200/60 text-[#0D7B75] flex items-center justify-center shrink-0 shadow-xs">
            <FolderKanban className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-[22px] font-extrabold tracking-tight text-[#0C1E38]">
              My Projects
            </h1>
            <p className="text-xs text-[#5E718D] mt-0.5">
              Manage your saved designs and continue working on your dream homes.
            </p>
          </div>
        </div>

        {/* "+ New Project" Button */}
        <button
          onClick={onNewProject}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#2B66F6] hover:bg-[#1E52D8] transition shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Project</span>
        </button>
      </div>

      {/* 2. SEARCH & FILTER TOOLBAR (Matches Screen 5 in reference image) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        {/* Search Field */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#E2E8F0] text-xs text-[#0C1E38] outline-none focus:border-[#2B66F6]"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* All Types */}
          <div className="relative w-1/2 sm:w-36">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full appearance-none bg-white border border-[#E2E8F0] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#0C1E38] outline-none cursor-pointer"
            >
              <option value="All">All Types</option>
              <option value="1BHK">1BHK</option>
              <option value="2BHK">2BHK</option>
              <option value="3BHK">3BHK</option>
              <option value="Villa">Villa</option>
              <option value="Duplex">Duplex</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#64748B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Sort Order */}
          <div className="relative w-1/2 sm:w-40">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="w-full appearance-none bg-white border border-[#E2E8F0] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#0C1E38] outline-none cursor-pointer"
            >
              <option value="newest">Sort by: Newest</option>
              <option value="oldest">Sort by: Oldest</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#64748B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 3. RESPONSIVE GRID OF PROJECT CARDS (Matches Screen 5 in reference image) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((proj, idx) => {
          const status = getStatus(proj.name, idx);
          const area = proj.layout.plot.width * proj.layout.plot.length;
          const floors = proj.layout.floors || 1;

          return (
            <div
              key={proj.id}
              className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-xs hover:border-[#2B66F6]/40 hover:shadow-md transition group flex flex-col justify-between"
            >
              <div>
                {/* Architectural Preview Thumbnail */}
                <div className="relative w-full h-44 bg-[#F1F5F9] overflow-hidden">
                  <svg viewBox="0 0 280 180" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                    <rect width="280" height="180" fill="#E2EBF5" />
                    <path d="M0,130 Q70,110 140,125 T280,120 L280,180 L0,180 Z" fill="#7BA168" />
                    {/* Architectural Villa Graphic */}
                    <rect x="50" y="60" width="180" height="85" rx="3" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" />
                    <rect x="65" y="70" width="60" height="45" rx="2" fill="#3B82F6" opacity="0.3" />
                    <rect x="140" y="70" width="75" height="75" rx="2" fill="#CBD5E1" />
                    <rect x="155" y="85" width="45" height="60" rx="1" fill="#1E293B" />
                    <rect x="40" y="52" width="200" height="10" rx="2" fill="#334155" />
                    <circle cx="35" cy="115" r="18" fill="#5A8842" />
                    <circle cx="245" cy="105" r="22" fill="#4D7A36" />
                  </svg>

                  {/* 3-Dots Menu Button */}
                  <div className="absolute top-2.5 right-2.5">
                    <button className="w-7 h-7 rounded-full bg-white/90 backdrop-blur text-[#475569] flex items-center justify-center hover:bg-white shadow-xs cursor-pointer">
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#0C1E38] truncate group-hover:text-[#2B66F6] transition-colors">
                      {proj.name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${status.color}`}>
                      {status.label}
                    </span>
                  </div>

                  <div className="text-xs text-[#64748B]">
                    {area} sq.ft &bull; {floors} Floor{floors > 1 ? 's' : ''}
                  </div>

                  <div className="text-[11px] text-[#94A3B8]">
                    Last edited: {getTimeAgo(proj.saved_at)}
                  </div>
                </div>
              </div>

              {/* Bottom Action Strip: Open & Delete */}
              <div className="p-4 pt-0 flex items-center justify-between border-t border-[#F8FAFC] text-xs font-semibold">
                <button
                  onClick={() => onLoadProject(proj.layout)}
                  className="inline-flex items-center gap-1.5 text-[#2B66F6] hover:underline cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open</span>
                </button>

                <button
                  onClick={(e) => handleDelete(proj.id, e)}
                  className="inline-flex items-center gap-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
