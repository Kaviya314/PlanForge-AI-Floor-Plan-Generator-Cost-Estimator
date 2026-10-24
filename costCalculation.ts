import { CostEstimateResult, MaterialCostItem, PlanLayout, UnitRateOverride } from '../types/plan';

export type { UnitRateOverride };

export function calculateCostEstimate(
  layout: PlanLayout,
  rateOverrides: UnitRateOverride = {}
): CostEstimateResult {
  const { plot, rooms, floors = 1, budget_inr = 2000000 } = layout;

  // 1. Calculate areas
  let carpetArea = 0;
  for (const room of rooms) {
    carpetArea += Math.max(0, room.width) * Math.max(0, room.length);
  }

  // Convert to sq.ft if user is in meters
  const isMeters = plot.unit === 'm';
  const carpetAreaSqFt = isMeters ? carpetArea * 10.7639 : carpetArea;
  
  // Built-up area includes ~18% for exterior/interior brick walls, offsets, and circulation
  const builtUpAreaPerFloorSqFt = carpetAreaSqFt * 1.18;
  const totalBuiltUpAreaSqFt = Math.max(1, builtUpAreaPerFloorSqFt * Math.max(1, floors));
  const totalBuiltUpAreaSqM = totalBuiltUpAreaSqFt / 10.7639;

  // Baseline empirical quantities per sq.ft of built-up area (Indian Standard CPWD / RICS residential benchmarks)
  const defaultItems: Omit<MaterialCostItem, 'subtotal'>[] = [
    // Civil & Structural Materials
    {
      id: 'cement',
      category: 'civil',
      name: 'Cement (OPC / PPC 53 Grade)',
      specification: 'For RCC column, beams, slab casting and brick masonry',
      unit: 'bags (50kg)',
      quantity: Math.round(totalBuiltUpAreaSqFt * 0.4),
      unit_rate: 380,
      status: 'default_benchmark',
      formula_notes: '0.40 bags per sq.ft built-up area benchmark',
    },
    {
      id: 'steel',
      category: 'civil',
      name: 'TMT Structural Steel (Fe-550D)',
      specification: 'High yield strength rebar for seismic RCC frame',
      unit: 'kg',
      quantity: Math.round(totalBuiltUpAreaSqFt * 3.8),
      unit_rate: 68,
      status: 'default_benchmark',
      formula_notes: '3.8 kg per sq.ft built-up area benchmark',
    },
    {
      id: 'bricks',
      category: 'civil',
      name: 'Red Clay Bricks / AAC Blocks',
      specification: '9" exterior load/curtain walls and 4.5" internal partition walls',
      unit: 'units',
      quantity: Math.round(totalBuiltUpAreaSqFt * 18),
      unit_rate: 9,
      status: 'default_benchmark',
      formula_notes: '18 bricks per sq.ft of built-up area',
    },
    {
      id: 'sand',
      category: 'civil',
      name: 'Manufactured / River Sand (M-Sand)',
      specification: 'Screened sand for concrete mix and plastering',
      unit: 'cft (cubic feet)',
      quantity: Math.round(totalBuiltUpAreaSqFt * 1.75),
      unit_rate: 55,
      status: 'default_benchmark',
      formula_notes: '1.75 cubic feet per sq.ft',
    },
    {
      id: 'aggregate',
      category: 'civil',
      name: 'Coarse Aggregate (20mm & 10mm)',
      specification: 'Machine-crushed blue granite stone aggregate',
      unit: 'cft (cubic feet)',
      quantity: Math.round(totalBuiltUpAreaSqFt * 1.3),
      unit_rate: 42,
      status: 'default_benchmark',
      formula_notes: '1.30 cubic feet per sq.ft',
    },

    // Finishing & Interior Elements
    {
      id: 'flooring',
      category: 'finishing',
      name: 'Vitrified Tiles & Anti-skid Flooring',
      specification: 'Double-charge 2x2 vitrified tiles with 10% wastage allowance',
      unit: 'sq.ft',
      quantity: Math.round(totalBuiltUpAreaSqFt * 1.12),
      unit_rate: 85,
      status: 'default_benchmark',
      formula_notes: '1.12 × built-up area (accounts for skirting & cuts)',
    },
    {
      id: 'painting',
      category: 'finishing',
      name: 'Internal & External Painting',
      specification: 'Wall putty, 1 coat primer, 2 coats acrylic emulsion / weather guard',
      unit: 'sq.ft surface',
      quantity: Math.round(totalBuiltUpAreaSqFt * 3.2), // wall surface area factor
      unit_rate: 22,
      status: 'default_benchmark',
      formula_notes: '3.2 × floor area (total internal & external wall surface)',
    },
    {
      id: 'doors_windows',
      category: 'finishing',
      name: 'Doors & Windows (Teak / UPVC)',
      specification: 'Main door flush/panel + flush internal doors + 2-track UPVC windows',
      unit: 'sq.ft built-up',
      quantity: Math.round(totalBuiltUpAreaSqFt),
      unit_rate: 95,
      status: 'default_benchmark',
      formula_notes: '₹95 per sq.ft built-up area allowance',
    },

    // Services
    {
      id: 'electrical',
      category: 'services',
      name: 'Electrical Conduiting, Wiring & DB',
      specification: 'FR copper wiring, modular switch plates, distribution board',
      unit: 'sq.ft built-up',
      quantity: Math.round(totalBuiltUpAreaSqFt),
      unit_rate: 75,
      status: 'default_benchmark',
      formula_notes: '₹75 per sq.ft built-up area average',
    },
    {
      id: 'plumbing',
      category: 'services',
      name: 'Plumbing, Drainage & Sanitaryware',
      specification: 'CPVC water supply, PVC drainage, EWC toilets, washbasins, CP fittings',
      unit: 'sq.ft built-up',
      quantity: Math.round(totalBuiltUpAreaSqFt),
      unit_rate: 70,
      status: 'default_benchmark',
      formula_notes: '₹70 per sq.ft built-up area average',
    },

    // Labour & Execution
    {
      id: 'labour_civil',
      category: 'labour',
      name: 'Civil Structural Labour (RCC & Masonry)',
      specification: 'Excavation, bar bending, shuttering formwork, RCC pouring & brickwork',
      unit: 'sq.ft built-up',
      quantity: Math.round(totalBuiltUpAreaSqFt),
      unit_rate: 280,
      status: 'default_benchmark',
      formula_notes: '₹280 per sq.ft prevailing contractor rate',
    },
    {
      id: 'labour_finishing',
      category: 'labour',
      name: 'Finishing Labour (Plaster, Tile & Paint)',
      specification: 'Skilled plasterers, tile masons, electricians, and painters',
      unit: 'sq.ft built-up',
      quantity: Math.round(totalBuiltUpAreaSqFt),
      unit_rate: 125,
      status: 'default_benchmark',
      formula_notes: '₹125 per sq.ft multi-trade finishing labour',
    },
  ];

  // Calculate items with overrides
  let materialSubtotal = 0;
  let labourSubtotal = 0;
  let finishingServicesSubtotal = 0;

  const items: MaterialCostItem[] = defaultItems.map((item) => {
    const isOverridden = rateOverrides[item.id] !== undefined;
    const finalRate = isOverridden ? Math.max(0, rateOverrides[item.id]) : item.unit_rate;
    const subtotal = Math.round(item.quantity * finalRate);

    if (item.category === 'civil') {
      materialSubtotal += subtotal;
    } else if (item.category === 'finishing' || item.category === 'services') {
      finishingServicesSubtotal += subtotal;
    } else if (item.category === 'labour') {
      labourSubtotal += subtotal;
    }

    return {
      ...item,
      unit_rate: finalRate,
      subtotal,
      status: isOverridden ? 'user_modified' : 'default_benchmark',
    };
  });

  // Calculate contingency (4.5% of sum of civil + finishing/services + labour)
  const baseSubtotal = materialSubtotal + finishingServicesSubtotal + labourSubtotal;
  const contingencyAmount = Math.round(baseSubtotal * 0.045);

  items.push({
    id: 'contingency',
    category: 'contingency',
    name: 'Statutory Approvals & Site Contingency',
    specification: 'Temporary water/power, municipal plan scrutiny fee, unexpected site variations',
    unit: 'lump sum (4.5%)',
    quantity: 1,
    unit_rate: contingencyAmount,
    subtotal: contingencyAmount,
    status: 'default_benchmark',
    formula_notes: '4.5% contingency buffer on primary execution costs',
  });

  const grandTotal = baseSubtotal + contingencyAmount;
  const costPerSqFt = totalBuiltUpAreaSqFt > 0 ? Math.round(grandTotal / totalBuiltUpAreaSqFt) : 0;
  const budgetVariance = budget_inr - grandTotal;
  const budgetUtilizedPercentage = budget_inr > 0 ? (grandTotal / budget_inr) * 100 : 0;

  return {
    built_up_area_sqft: Math.round(totalBuiltUpAreaSqFt),
    built_up_area_sqm: Math.round(totalBuiltUpAreaSqM * 10) / 10,
    carpet_area_sqft: Math.round(carpetAreaSqFt),
    floors,
    items,
    material_cost_total: materialSubtotal,
    labour_cost_total: labourSubtotal,
    finishing_services_total: finishingServicesSubtotal,
    contingency_total: contingencyAmount,
    grand_total: grandTotal,
    cost_per_sqft: costPerSqFt,
    budget_inr,
    budget_variance: budgetVariance,
    budget_utilized_percentage: Math.round(budgetUtilizedPercentage * 10) / 10,
    assumptions: [
      'Estimates are based on standard RCC Framed Structure with brick infill walls on normal soil conditions.',
      'Built-up area includes carpet area plus an 18% allowance for exterior walls, partition walls, and circulation corridors.',
      'Unit rates reflect current prevailing metro/tier-2 construction benchmarks in INR and can be adjusted in the Cost Table.',
      'Cost does not include land purchase, deep piling/basement foundation, interior designer fees, or custom luxury woodwork.',
    ],
    disclaimer:
      'PRELIMINARY ESTIMATE NOTICE: This estimate is computed using parametric area-based benchmarks for conceptual planning only. It is not an engineering quantity bill (BOQ) or a binding contractor quotation. Actual construction costs will vary based on geotechnical soil report, structural engineering drawings, local municipal development bylaws, and brand choices.',
    timestamp: new Date().toISOString(),
  };
}
