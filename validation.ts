import { PlanLayout, Room, ValidationResult, ValidationError } from '../types/plan';

export function validateLayout(layout: PlanLayout): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const { plot, rooms } = layout;

  let dimensions_positive = true;
  let within_plot_boundary = true;
  let no_room_overlap = true;
  let unique_ids = true;
  let essential_rooms_present = true;
  let reasonable_coverage = true;

  // 1. Plot dimensions validation
  if (!plot || plot.width <= 0 || plot.length <= 0) {
    errors.push({
      id: 'err-plot-dim',
      field: 'plot',
      message: 'Plot width and length must both be positive numbers.',
      severity: 'error',
    });
    dimensions_positive = false;
  }

  const plotArea = plot && plot.width > 0 && plot.length > 0 ? plot.width * plot.length : 0;
  let totalRoomArea = 0;

  // 2. Room identifiers & dimensions
  const seenIds = new Set<string>();

  rooms.forEach((room, index) => {
    // Unique ID check
    if (!room.id) {
      errors.push({
        id: `err-room-no-id-${index}`,
        message: `Room at index ${index} is missing an identifier.`,
        severity: 'error',
      });
      unique_ids = false;
    } else if (seenIds.has(room.id)) {
      errors.push({
        id: `err-room-dup-${room.id}`,
        roomId: room.id,
        roomName: room.name,
        message: `Duplicate room ID detected: '${room.id}'. Each room must have a unique identifier.`,
        severity: 'error',
      });
      unique_ids = false;
    } else {
      seenIds.add(room.id);
    }

    // Positive dimensions
    if (room.width <= 0 || room.length <= 0) {
      errors.push({
        id: `err-room-pos-${room.id || index}`,
        roomId: room.id,
        roomName: room.name,
        message: `Room "${room.name || 'Unnamed'}" must have positive dimensions (current: ${room.width} × ${room.length}).`,
        severity: 'error',
      });
      dimensions_positive = false;
    }

    const roomArea = Math.max(0, room.width) * Math.max(0, room.length);
    totalRoomArea += roomArea;

    // Small room warning
    const minSizeThreshold = plot.unit === 'm' ? 3.0 : 30; // 30 sq.ft or ~3 sq.m
    if (room.type !== 'bathroom' && room.type !== 'attached_bathroom' && room.type !== 'balcony' && roomArea < minSizeThreshold) {
      warnings.push({
        id: `warn-room-small-${room.id}`,
        roomId: room.id,
        roomName: room.name,
        message: `Room "${room.name}" has an unusually small area (${roomArea.toFixed(1)} ${plot.unit}²). Standard living spaces typically require larger clearances.`,
        severity: 'warning',
      });
    }

    // 3. Boundary check
    if (plot && plot.width > 0 && plot.length > 0) {
      const roomRight = room.x + room.width;
      const roomBottom = room.y + room.length;
      const epsilon = 0.05; // small floating point tolerance

      if (room.x < -epsilon || room.y < -epsilon || roomRight > plot.width + epsilon || roomBottom > plot.length + epsilon) {
        errors.push({
          id: `err-room-oob-${room.id}`,
          roomId: room.id,
          roomName: room.name,
          message: `Room "${room.name}" extends outside plot boundary (Plot: ${plot.width}×${plot.length}, Room bounds: [${room.x.toFixed(1)}, ${room.y.toFixed(1)}] to [${roomRight.toFixed(1)}, ${roomBottom.toFixed(1)}]).`,
          severity: 'error',
        });
        within_plot_boundary = false;
      }
    }
  });

  // 4. Overlap detection (Pairwise test on same floor)
  const EPSILON = 0.05; // tolerance so adjacent shared walls do not count as overlap
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const r1 = rooms[i];
      const r2 = rooms[j];

      // Only check collision if same floor (or floor undefined = 1)
      const floor1 = r1.floor || 1;
      const floor2 = r2.floor || 1;
      if (floor1 !== floor2) continue;

      const r1Right = r1.x + r1.width;
      const r1Bottom = r1.y + r1.length;
      const r2Right = r2.x + r2.width;
      const r2Bottom = r2.y + r2.length;

      const overlapsX = r1.x < r2Right - EPSILON && r1Right > r2.x + EPSILON;
      const overlapsY = r1.y < r2Bottom - EPSILON && r1Bottom > r2.y + EPSILON;

      if (overlapsX && overlapsY) {
        // Calculate overlap area
        const overlapW = Math.min(r1Right, r2Right) - Math.max(r1.x, r2.x);
        const overlapH = Math.min(r1Bottom, r2Bottom) - Math.max(r1.y, r2.y);
        const overlapArea = overlapW * overlapH;

        errors.push({
          id: `err-overlap-${r1.id}-${r2.id}`,
          roomId: r1.id,
          roomName: `${r1.name} & ${r2.name}`,
          message: `Overlap collision: "${r1.name}" overlaps with "${r2.name}" by approx ${overlapArea.toFixed(1)} ${plot.unit}².`,
          severity: 'error',
        });
        no_room_overlap = false;
      }
    }
  }

  // 5. Essential rooms presence check
  const roomTypes = new Set(rooms.map((r) => r.type));
  const roomNames = rooms.map((r) => r.name.toLowerCase());

  const hasKitchen = roomTypes.has('kitchen') || roomNames.some((n) => n.includes('kitchen'));
  const hasBathroom =
    roomTypes.has('bathroom') ||
    roomTypes.has('attached_bathroom') ||
    roomNames.some((n) => n.includes('bath') || n.includes('toilet') || n.includes('wc'));
  const hasLiving =
    roomTypes.has('living') ||
    roomNames.some((n) => n.includes('living') || n.includes('hall') || n.includes('drawing'));

  if (!hasKitchen) {
    warnings.push({
      id: 'warn-no-kitchen',
      message: 'Plan has no designated kitchen area.',
      severity: 'warning',
    });
    essential_rooms_present = false;
  }
  if (!hasBathroom) {
    warnings.push({
      id: 'warn-no-bath',
      message: 'Plan has no designated bathroom / washroom.',
      severity: 'warning',
    });
    essential_rooms_present = false;
  }
  if (!hasLiving && rooms.length > 2) {
    warnings.push({
      id: 'warn-no-living',
      message: 'Plan has no dedicated living room or central hall.',
      severity: 'warning',
    });
  }

  // 6. Coverage calculation & warnings
  const coveragePercentage = plotArea > 0 ? (totalRoomArea / plotArea) * 100 : 0;
  if (coveragePercentage > 100) {
    errors.push({
      id: 'err-area-exceeded',
      message: `Total room area (${totalRoomArea.toFixed(1)} ${plot.unit}²) exceeds total plot area (${plotArea.toFixed(1)} ${plot.unit}²). Coverage is ${coveragePercentage.toFixed(1)}%.`,
      severity: 'error',
    });
    reasonable_coverage = false;
  } else if (coveragePercentage > 85) {
    warnings.push({
      id: 'warn-coverage-high',
      message: `Ground coverage is ${coveragePercentage.toFixed(1)}%. Real-world municipal bylaws typically enforce maximum 65-75% ground coverage to accommodate front/rear setbacks, light ventilation, and structural exterior walls.`,
      severity: 'warning',
    });
  } else if (coveragePercentage < 30 && rooms.length > 0) {
    warnings.push({
      id: 'warn-coverage-low',
      message: `Ground coverage is only ${coveragePercentage.toFixed(1)}% of the plot. Significant open plot area remains unallocated.`,
      severity: 'info',
    });
  }

  // Estimated built-up area (carpet area + 18% wall and circulation factor)
  const builtUpArea = totalRoomArea * 1.18 * (layout.floors || 1);

  const is_valid = errors.length === 0;

  return {
    is_valid,
    errors,
    warnings,
    plot_area: plotArea,
    total_room_area: totalRoomArea,
    built_up_area: builtUpArea,
    coverage_percentage: coveragePercentage,
    unit: plot.unit,
    checks: {
      dimensions_positive,
      within_plot_boundary,
      no_room_overlap,
      unique_ids,
      essential_rooms_present,
      reasonable_coverage,
    },
  };
}
