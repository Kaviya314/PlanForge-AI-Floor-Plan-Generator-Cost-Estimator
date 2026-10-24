import { PlanLayout, UnitRateOverride } from '../types/plan';

export interface SavedProject {
  id: string;
  name: string;
  layout: PlanLayout;
  rate_overrides?: UnitRateOverride;
  saved_at: string;
}

const STORAGE_KEY = 'planforge_saved_projects_v1';
const CURRENT_PROJECT_KEY = 'planforge_current_project_v1';
const RATES_KEY = 'planforge_unit_rates_v1';

export function getSavedProjects(): SavedProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read saved projects from localStorage:', e);
    return [];
  }
}

export function saveProject(layout: PlanLayout, rateOverrides?: UnitRateOverride): SavedProject {
  const projects = getSavedProjects();
  const existingIdx = projects.findIndex((p) => p.name.toLowerCase() === layout.project_name.toLowerCase());

  const newEntry: SavedProject = {
    id: existingIdx >= 0 ? projects[existingIdx].id : `proj-${Date.now()}`,
    name: layout.project_name,
    layout,
    rate_overrides: rateOverrides,
    saved_at: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    projects[existingIdx] = newEntry;
  } else {
    projects.unshift(newEntry);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  saveCurrentProject(layout);
  return newEntry;
}

export function renameSavedProject(id: string, newName: string): boolean {
  const projects = getSavedProjects();
  const target = projects.find((p) => p.id === id);
  if (!target) return false;

  target.name = newName;
  target.layout.project_name = newName;
  target.saved_at = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  return true;
}

export function deleteSavedProject(id: string): boolean {
  const projects = getSavedProjects();
  const filtered = projects.filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

export function saveCurrentProject(layout: PlanLayout): void {
  try {
    localStorage.setItem(CURRENT_PROJECT_KEY, JSON.stringify(layout));
  } catch (e) {
    console.warn('Failed to cache current project:', e);
  }
}

export function getCurrentProject(): PlanLayout | null {
  try {
    const raw = localStorage.getItem(CURRENT_PROJECT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function saveStoredRates(rates: UnitRateOverride): void {
  try {
    localStorage.setItem(RATES_KEY, JSON.stringify(rates));
  } catch (e) {
    console.warn('Failed to save rate overrides:', e);
  }
}

export function getStoredRates(): UnitRateOverride {
  try {
    const raw = localStorage.getItem(RATES_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}
