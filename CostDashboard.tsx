import React, { useState } from 'react';
import { CostEstimateResult, MaterialCostItem, PlanLayout, UnitRateOverride } from '../types/plan';
import {
  Coins,
  ShieldCheck,
  Edit2,
  Check,
  ArrowRight
} from 'lucide-react';

interface CostDashboardProps {
  layout: PlanLayout;
  estimate: CostEstimateResult;
  rateOverrides: UnitRateOverride;
  onUpdateRate: (itemId: string, newRate: number) => void;
  onResetRates: () => void;
}

export const CostDashboard: React.FC<CostDashboardProps> = ({
  layout,
  estimate,
  rateOverrides,
  onUpdateRate,
  onResetRates,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isEditingAll, setIsEditingAll] = useState<boolean>(false);

  const formatLakhs = (amt: number) => {
    if (Math.abs(amt) >= 10000000) {
      return `₹${(amt / 10000000).toFixed(2)} Cr`;
    }
    return `₹${(amt / 100000).toFixed(2)} Lakhs`;
  };

  const formatCurrency = (amt: number) => {
    return `₹${Math.round(amt).toLocaleString('en-IN')}`;
  };

  const startEdit = (item: MaterialCostItem) => {
    setEditingId(item.id);
    setEditValue(item.unit_rate.toString());
  };

  const saveEdit = (itemId: string) => {
    const val = parseFloat(editValue);
    if (!isNaN(val) && val >= 0) {
      onUpdateRate(itemId, val);
    }
    setEditingId(null);
  };

  // Group items into categories for display
  const items = estimate.items;

  // Percentage breakdown for Donut Chart
  const materialsTotal = estimate.material_cost_total || Math.round(estimate.grand_total * 0.68);
  const labourTotal = estimate.labour_cost_total || Math.round(estimate.grand_total * 0.18);
  const finishingTotal = estimate.finishing_services_total || Math.round(estimate.grand_total * 0.10);
  const othersTotal = estimate.contingency_total || Math.round(estimate.grand_total * 0.04);

  const materialsPct = Math.round((materialsTotal / estimate.grand_total) * 100) || 68;
  const labourPct = Math.round((labourTotal / estimate.grand_total) * 100) || 18;
  const finishingPct = Math.round((finishingTotal / estimate.grand_total) * 100) || 10;
  const othersPct = 100 - (materialsPct + labourPct + finishingPct);

  return (
    <div className="w-full space-y-5 animate-fade-in select-none">
      {/* 1. SUB-HEADER BANNER (Matches Screen 4 in reference image) */}
      <div className="bg-gradient-to-r from-[#EBF3FC] via-[#F3F8FD] to-[#EAF2FC] border border-[#DFEAF5] rounded-2xl p-5 flex items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#D7F3F2] border border-teal-200/60 text-[#0D7B75] flex items-center justify-center shrink-0 shadow-xs">
            <Coins className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-[22px] font-extrabold tracking-tight text-[#0C1E38]">
              Construction Cost Estimator
            </h1>
            <p className="text-xs text-[#5E718D] mt-0.5">
              Get a detailed breakdown of your estimated construction cost based on current design and material rates.
            </p>
          </div>
        </div>
      </div>

      {/* 2. THREE SUMMARY KPI CARDS (Matches Screen 4 in reference image) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Estimated Total Cost */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
          <span className="text-xs text-[#64748B] block font-medium">Estimated Total Cost</span>
          <div className="text-2xl sm:text-[28px] font-extrabold text-[#0C1E38] mt-1 tracking-tight">
            {formatLakhs(estimate.grand_total)}
          </div>
          <span className="text-[11px] text-[#94A3B8] mt-0.5 block">(Approximate estimate)</span>
        </div>

        {/* Card 2: Cost per Sq.ft */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
          <span className="text-xs text-[#64748B] block font-medium">Cost per Sq.ft</span>
          <div className="text-2xl sm:text-[28px] font-extrabold text-[#0C1E38] mt-1 tracking-tight">
            ₹{estimate.cost_per_sqft.toLocaleString()}{' '}
            <span className="text-base font-normal text-[#64748B]">/ sq.ft</span>
          </div>
        </div>

        {/* Card 3: Built-up Area */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
          <span className="text-xs text-[#64748B] block font-medium">Built-up Area</span>
          <div className="text-2xl sm:text-[28px] font-extrabold text-[#0C1E38] mt-1 tracking-tight">
            {estimate.built_up_area_sqft}{' '}
            <span className="text-base font-normal text-[#64748B]">sq.ft</span>
          </div>
        </div>
      </div>

      {/* 3. MAIN 2-COLUMN CONTENT: BREAKDOWN TABLE + DONUT CHART & NOTES */}
      <div className="flex flex-col lg:flex-row items-start gap-5">
        {/* Left: Material & Labour Breakdown Table (approx 65% width) */}
        <div className="w-full lg:flex-1 bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
            <h2 className="text-sm font-bold text-[#0C1E38]">
              Material &amp; Labour Breakdown
            </h2>
            <button
              onClick={() => setIsEditingAll(!isEditingAll)}
              className="text-xs font-semibold text-[#2B66F6] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{isEditingAll ? 'Done Editing' : 'Edit Unit Rates'}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#F1F5F9] text-[#64748B] font-semibold text-[11px]">
                  <th className="pb-3 pr-4">Category</th>
                  <th className="pb-3 pr-4">Quantity</th>
                  <th className="pb-3 pr-4">Unit Rate</th>
                  <th className="pb-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F8FAFC]">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 pr-4 font-medium text-[#1E293B]">
                      {item.name}
                    </td>
                    <td className="py-3 pr-4 text-[#64748B]">
                      {item.quantity ? `${item.quantity.toLocaleString()} ${item.unit}` : '-'}
                    </td>
                    <td className="py-3 pr-4 text-[#64748B]">
                      {editingId === item.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-20 px-2 py-0.5 rounded border border-[#2B66F6] text-xs font-semibold text-[#0C1E38] outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(item.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                          />
                          <button
                            onClick={() => saveEdit(item.id)}
                            className="p-1 rounded bg-[#2B66F6] text-white cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => startEdit(item)}
                          className={`cursor-pointer ${isEditingAll ? 'text-[#2B66F6] underline font-semibold' : ''}`}
                          title="Click to edit unit rate"
                        >
                          {item.unit_rate ? `₹${item.unit_rate.toLocaleString()}` : '-'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right font-bold text-[#0C1E38]">
                      {formatCurrency(item.subtotal)}
                    </td>
                  </tr>
                ))}

                {/* Bottom Total Row */}
                <tr className="border-t-2 border-[#E2E8F0] font-extrabold text-sm text-[#0C1E38]">
                  <td className="pt-4 pr-4" colSpan={3}>
                    Total Estimated Cost
                  </td>
                  <td className="pt-4 text-right text-base font-extrabold text-[#0C1E38]">
                    {formatCurrency(estimate.grand_total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Cost Distribution Donut Chart & Notes (approx 35% width) */}
        <div className="w-full lg:w-[360px] shrink-0 space-y-4">
          {/* Card 1: Cost Distribution Donut */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0C1E38]">
                Cost Distribution
              </h3>
              <button
                onClick={() => setIsEditingAll(!isEditingAll)}
                className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] text-[11px] font-semibold text-[#2B66F6] hover:bg-blue-50 cursor-pointer"
              >
                Edit Rates
              </button>
            </div>

            {/* SVG Donut Chart */}
            <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
              <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {/* Background circle */}
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#F1F5F9" strokeWidth="18" />

                  {/* Materials arc: ~68% (Amber/Gold) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="18"
                    strokeDasharray={`${materialsPct * 2.39} 240`}
                    strokeDashoffset="0"
                  />

                  {/* Labour arc: ~18% (Blue) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#2B66F6"
                    strokeWidth="18"
                    strokeDasharray={`${labourPct * 2.39} 240`}
                    strokeDashoffset={`${-materialsPct * 2.39}`}
                  />

                  {/* Finishing arc: ~10% (Rose/Red) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="18"
                    strokeDasharray={`${finishingPct * 2.39} 240`}
                    strokeDashoffset={`${-(materialsPct + labourPct) * 2.39}`}
                  />

                  {/* Others arc: ~4% (Teal) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="18"
                    strokeDasharray={`${othersPct * 2.39} 240`}
                    strokeDashoffset={`${-(materialsPct + labourPct + finishingPct) * 2.39}`}
                  />
                </svg>

                {/* Donut Center Label: ₹16.02L */}
                <div className="absolute text-center">
                  <span className="text-sm font-extrabold text-[#0C1E38] block tracking-tight">
                    {formatLakhs(estimate.grand_total).replace(' Lakhs', 'L')}
                  </span>
                </div>
              </div>

              {/* Legend with colored dots */}
              <div className="space-y-2 text-xs w-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                    <span className="text-[#475569]">Materials</span>
                  </div>
                  <span className="font-bold text-[#0C1E38]">{materialsPct}%</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2B66F6]" />
                    <span className="text-[#475569]">Labour</span>
                  </div>
                  <span className="font-bold text-[#0C1E38]">{labourPct}%</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                    <span className="text-[#475569]">Finishing</span>
                  </div>
                  <span className="font-bold text-[#0C1E38]">{finishingPct}%</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                    <span className="text-[#475569]">Others</span>
                  </div>
                  <span className="font-bold text-[#0C1E38]">{othersPct}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Notes & Assumptions (Matches Screen 4 in reference image) */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-[#0C1E38] uppercase tracking-wider">
              Notes &amp; Assumptions
            </h3>

            <ul className="space-y-2 text-[11px] text-[#64748B] leading-relaxed list-disc pl-4">
              <li>Rates are approximate and may vary by location.</li>
              <li>Based on standard construction quality.</li>
              <li>Does not include land cost or other government charges.</li>
              <li>Actual cost may vary based on design changes and material availability.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
