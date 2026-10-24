import { PlanLayout, StructuralColumn, StructuralBeam, StructuralGridLine, BimSummary } from '../types/plan';

export interface BimModel {
  columns: StructuralColumn[];
  beams: StructuralBeam[];
  gridLines: StructuralGridLine[];
  summary: BimSummary;
}

export function generateBimStructure(layout: PlanLayout): BimModel {
  const { plot, rooms } = layout;
  const unit = plot.unit || 'ft';

  // 1. Collect all corner vertices from rooms
  const cornerMap = new Map<string, { x: number; y: number }>();

  rooms.forEach((room) => {
    const corners = [
      { x: Math.round(room.x * 10) / 10, y: Math.round(room.y * 10) / 10 },
      { x: Math.round((room.x + room.width) * 10) / 10, y: Math.round(room.y * 10) / 10 },
      { x: Math.round(room.x * 10) / 10, y: Math.round((room.y + room.length) * 10) / 10 },
      { x: Math.round((room.x + room.width) * 10) / 10, y: Math.round((room.y + room.length) * 10) / 10 },
    ];

    corners.forEach((c) => {
      // Cluster nearby points within 0.5 unit to avoid duplicate adjacent columns
      const key = `${Math.round(c.x)}_${Math.round(c.y)}`;
      if (!cornerMap.has(key)) {
        cornerMap.set(key, c);
      }
    });
  });

  // Extract unique X and Y coordinates for structural grid lines
  const xCoords = Array.from(new Set(Array.from(cornerMap.values()).map((p) => p.x))).sort((a, b) => a - b);
  const yCoords = Array.from(new Set(Array.from(cornerMap.values()).map((p) => p.y))).sort((a, b) => a - b);

  // 2. Generate Grid Lines (X: 1, 2, 3... ; Y: A, B, C...)
  const gridLines: StructuralGridLine[] = [];
  xCoords.forEach((x, idx) => {
    gridLines.push({
      id: `grid-x-${idx + 1}`,
      label: String(idx + 1),
      axis: 'x',
      position: x,
    });
  });

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  yCoords.forEach((y, idx) => {
    gridLines.push({
      id: `grid-y-${idx + 1}`,
      label: alphabet[idx % alphabet.length] || `Y${idx + 1}`,
      axis: 'y',
      position: y,
    });
  });

  // 3. Generate Columns at corners
  const columns: StructuralColumn[] = [];
  let colIdx = 1;
  const colSize = unit === 'ft' ? 0.85 : 0.25; // 10" x 10" (0.85 ft) or 250mm

  Array.from(cornerMap.values()).forEach((pt) => {
    // Determine closest grid label
    const closestX = gridLines.filter((g) => g.axis === 'x').reduce((prev, curr) => (Math.abs(curr.position - pt.x) < Math.abs(prev.position - pt.x) ? curr : prev), gridLines[0]);
    const closestY = gridLines.filter((g) => g.axis === 'y').reduce((prev, curr) => (Math.abs(curr.position - pt.y) < Math.abs(prev.position - pt.y) ? curr : prev), gridLines[0]);

    const ref = `${closestY?.label || 'A'}-${closestX?.label || colIdx}`;

    columns.push({
      id: `col-${colIdx}`,
      name: `C${colIdx}`,
      x: pt.x,
      y: pt.y,
      width: colSize,
      length: colSize,
      gridRef: ref,
    });
    colIdx++;
  });

  // 4. Generate Beams connecting adjacent columns
  const beams: StructuralBeam[] = [];
  let beamIdx = 1;

  for (let i = 0; i < columns.length; i++) {
    for (let j = i + 1; j < columns.length; j++) {
      const c1 = columns[i];
      const c2 = columns[j];

      const dx = Math.abs(c1.x - c2.x);
      const dy = Math.abs(c1.y - c2.y);

      // Connect columns aligned horizontally or vertically within reasonable span (< 22 ft)
      const isHorizontal = dy < 0.2 && dx > 2 && dx <= 22;
      const isVertical = dx < 0.2 && dy > 2 && dy <= 22;

      if (isHorizontal || isVertical) {
        const span = Math.round((isHorizontal ? dx : dy) * 10) / 10;
        beams.push({
          id: `bm-${beamIdx}`,
          name: `B${beamIdx}`,
          x1: c1.x,
          y1: c1.y,
          x2: c2.x,
          y2: c2.y,
          spanLength: span,
          type: 'plinth',
        });
        beamIdx++;
      }
    }
  }

  // 5. Compute Structural Summary
  const totalBeamSpan = beams.reduce((acc, b) => acc + b.spanLength, 0);
  const footingCount = columns.length;

  // Empirical structural calculations
  // Column concrete = count * (0.85 * 0.85 * 10.5 ft) in cu.ft -> cu.m
  const colVolCuFt = columns.length * (0.85 * 0.85 * 10.5);
  // Beam concrete = totalSpan * (0.85 * 1.25 ft) in cu.ft
  const beamVolCuFt = totalBeamSpan * (0.85 * 1.25);
  // Footings concrete = count * (4 * 4 * 1.5 ft)
  const footingVolCuFt = footingCount * (4 * 4 * 1.5);
  // Slab concrete (5" slab over rooms area)
  const totalFloorArea = rooms.reduce((acc, r) => acc + r.width * r.length, 0);
  const slabVolCuFt = totalFloorArea * (5 / 12);

  const totalVolCuFt = colVolCuFt + beamVolCuFt + footingVolCuFt + slabVolCuFt;
  const concreteVolumeCuM = Math.round(totalVolCuFt * 0.0283168 * 10) / 10;
  // Rebar density: ~110 kg per cu.m of RCC structure
  const rebarTonnageKg = Math.round(concreteVolumeCuM * 110);

  return {
    columns,
    beams,
    gridLines,
    summary: {
      columnCount: columns.length,
      beamCount: beams.length,
      totalBeamSpan: Math.round(totalBeamSpan),
      footingCount,
      concreteVolumeCuM,
      rebarTonnageKg,
    },
  };
}
