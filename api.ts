import { CostEstimateResult, GeneratePlanRequest, PlanLayout, UnitRateOverride, ValidationResult } from '../types/plan';
import { generateDeterministicPlan } from '../utils/demoGenerator';
import { validateLayout } from '../utils/validation';
import { calculateCostEstimate } from '../utils/costCalculation';

export interface HealthStatus {
  status: string;
  ai_configured: boolean;
  ai_model: string;
  ai_provider: string;
  demo_mode_available: boolean;
}

export interface ConfigStatus {
  ai_available: boolean;
  model_name: string;
  default_unit: string;
  app_version: string;
  demo_fallback_active: boolean;
}

export interface AIExplanationResponse {
  mode: string;
  model?: string;
  explanation: {
    summary: string;
    zoning_analysis: string;
    lighting_ventilation: string;
    cost_optimizations: string[];
  };
}

export async function fetchHealth(): Promise<HealthStatus> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('Health check failed');
    return await res.json();
  } catch (err) {
    return {
      status: 'offline',
      ai_configured: false,
      ai_model: 'gemini-3.8-flash',
      ai_provider: 'local_browser_fallback',
      demo_mode_available: true,
    };
  }
}

export async function fetchConfig(): Promise<ConfigStatus> {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('Config fetch failed');
    return await res.json();
  } catch (err) {
    return {
      ai_available: false,
      model_name: 'gemini-3.8-flash',
      default_unit: 'ft',
      app_version: '1.0.0',
      demo_fallback_active: true,
    };
  }
}

export async function apiGeneratePlan(req: GeneratePlanRequest): Promise<{
  plan: PlanLayout;
  validation: ValidationResult;
  mode: 'ai' | 'demo';
  message: string;
}> {
  try {
    const res = await fetch('/api/plan/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    }
    throw new Error(`Server returned ${res.status}`);
  } catch (err) {
    console.warn('API error during plan generation, falling back to local deterministic generator:', err);
    const plan = generateDeterministicPlan(req);
    const validation = validateLayout(plan);
    return {
      plan,
      validation,
      mode: 'demo',
      message: 'Generated using local deterministic architectural generator (Offline / Demo fallback).',
    };
  }
}

export async function apiValidatePlan(layout: PlanLayout): Promise<ValidationResult> {
  try {
    const res = await fetch('/api/plan/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(layout),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // client-side validation fallback
  }
  return validateLayout(layout);
}

export async function apiEstimateCost(
  layout: PlanLayout,
  rateOverrides?: UnitRateOverride
): Promise<CostEstimateResult> {
  try {
    const res = await fetch('/api/cost/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layout, rate_overrides: rateOverrides }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // client-side calculation fallback
  }
  return calculateCostEstimate(layout, rateOverrides);
}

export async function apiExplainLayout(layout: PlanLayout, query?: string): Promise<AIExplanationResponse> {
  try {
    const res = await fetch('/api/ai/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layout, query }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // fallback
  }
  return {
    mode: 'demo',
    explanation: {
      summary: `Preliminary architectural appraisal for ${layout.project_name} on a ${layout.plot.width}×${layout.plot.length} ${layout.plot.unit} plot.`,
      zoning_analysis:
        'Functional zoning organizes the active living hall and foyer near the main access road, keeping quiet bedrooms toward the rear quadrant.',
      lighting_ventilation:
        'Every room is bordered by exterior perimeter walls to facilitate cross-ventilation and natural daylight ingress.',
      cost_optimizations: [
        'Grouping wet plumbing areas (baths, kitchen) minimizes vertical shaft pipe runs.',
        'Standard rectilinear room geometries reduce shuttering formwork waste and masonry labour.',
      ],
    },
  };
}
