export type MeasurementUnit = 'ft' | 'm';

export interface Plot {
  width: number;
  length: number;
  unit: MeasurementUnit;
}

export interface Door {
  wall: 'top' | 'bottom' | 'left' | 'right';
  offset: number; // distance from wall start
  width: number;
}

export interface Window {
  wall: 'top' | 'bottom' | 'left' | 'right';
  offset: number;
  width: number;
}

export type RoomType =
  | 'living'
  | 'bedroom'
  | 'master_bedroom'
  | 'kitchen'
  | 'dining'
  | 'bathroom'
  | 'attached_bathroom'
  | 'balcony'
  | 'foyer'
  | 'puja'
  | 'utility'
  | 'corridor'
  | 'parking'
  | 'stairs'
  | 'custom';

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  x: number;
  y: number;
  width: number;
  length: number;
  floor?: number;
  color?: string;
  doors?: Door[];
  windows?: Window[];
}

export interface PlanLayout {
  project_name: string;
  plot: Plot;
  rooms: Room[];
  floors: number;
  house_type: string;
  budget_inr: number;
  design_notes: string[];
  created_at: string;
  updated_at: string;
  mode: 'ai' | 'demo';
  ai_model_used?: string;
  ai_explanation?: string;
}

export interface ValidationError {
  id: string;
  field?: string;
  roomId?: string;
  roomName?: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  is_valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  plot_area: number;
  total_room_area: number;
  built_up_area: number;
  coverage_percentage: number;
  unit: MeasurementUnit;
  checks: {
    dimensions_positive: boolean;
    within_plot_boundary: boolean;
    no_room_overlap: boolean;
    unique_ids: boolean;
    essential_rooms_present: boolean;
    reasonable_coverage: boolean;
  };
}

export interface MaterialCostItem {
  id: string;
  category: 'civil' | 'finishing' | 'services' | 'labour' | 'contingency';
  name: string;
  specification: string;
  unit: string;
  quantity: number;
  unit_rate: number;
  subtotal: number;
  status: 'default_benchmark' | 'user_modified';
  formula_notes: string;
}

export interface CostEstimateResult {
  built_up_area_sqft: number;
  built_up_area_sqm: number;
  carpet_area_sqft: number;
  floors: number;
  items: MaterialCostItem[];
  material_cost_total: number;
  labour_cost_total: number;
  finishing_services_total: number;
  contingency_total: number;
  grand_total: number;
  cost_per_sqft: number;
  budget_inr: number;
  budget_variance: number; // budget - grand_total (positive = under budget, negative = over budget)
  budget_utilized_percentage: number;
  assumptions: string[];
  disclaimer: string;
  timestamp: string;
}

export interface GeneratePlanRequest {
  natural_prompt?: string;
  project_name?: string;
  plot_width: number;
  plot_length: number;
  unit: MeasurementUnit;
  house_type: string;
  num_bedrooms: number;
  num_bathrooms: number;
  num_kitchens: number;
  num_living_rooms: number;
  has_balcony: boolean;
  has_parking?: boolean;
  has_garden?: boolean;
  has_dining?: boolean;
  floors: number;
  design_style?: string;
  budget_inr: number;
  force_demo?: boolean;
}

export type UnitRateOverride = Record<string, number>;

export type ThreeDFinishTheme = 'scandinavian_wood' | 'modern_minimalist' | 'industrial_concrete' | 'classic_warm';
export type ThreeDStyle = 'realistic' | 'modern' | 'wireframe';
export type ThreeDBackground = 'soft_white' | 'pale_blue' | 'charcoal' | 'landscape' | 'warm_ground';
export type ThreeDActiveTool = 'orbit' | 'pan' | 'zoom' | 'reset';
export type ThreeDViewAngle = 'perspective' | 'isometric' | 'top' | 'front';
export type ActiveTab = 'input' | 'plan' | '3d' | 'bim' | 'cost' | 'projects' | 'guide';

export type CadTool =
  | 'select'
  | 'add-room'
  | 'add-wall'
  | 'add-door'
  | 'add-window'
  | 'add-stairs'
  | 'add-balcony'
  | 'measure';

export type CadTheme = 'dark_navy' | 'blueprint_light';

export interface StructuralColumn {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number; // in ft (e.g. 0.75 for 9", 1.0 for 12")
  length: number;
  gridRef: string; // e.g. "C1", "C2"
}

export interface StructuralBeam {
  id: string;
  name: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  spanLength: number;
  type: 'plinth' | 'tie' | 'roof';
}

export interface StructuralGridLine {
  id: string;
  label: string;
  axis: 'x' | 'y';
  position: number;
}

export interface BimSummary {
  columnCount: number;
  beamCount: number;
  totalBeamSpan: number;
  footingCount: number;
  concreteVolumeCuM: number;
  rebarTonnageKg: number;
}
