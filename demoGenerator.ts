import { GeneratePlanRequest, PlanLayout, Room } from '../types/plan';

export function generateDeterministicPlan(req: GeneratePlanRequest): PlanLayout {
  const plotWidth = Number(req.plot_width) || 30;
  const plotLength = Number(req.plot_length) || 40;
  const unit = req.unit || 'ft';
  const houseType = req.house_type || '2BHK';
  const hasBalcony = req.has_balcony !== false;
  const hasParking = Boolean(req.has_parking);
  const hasDining = Boolean(req.has_dining);
  const budget = Number(req.budget_inr) || 2000000;
  const projectName = req.project_name || `${houseType} Residence (${plotWidth}×${plotLength} ${unit})`;

  // Calculate usable building footprint within plot setbacks
  // On standard plots (e.g. 30x40), keep modest 2.5ft side/rear setback and 3.5ft front setback
  const setbackX = plotWidth >= 25 ? Math.min(3, plotWidth * 0.08) : 1;
  const setbackY = plotLength >= 30 ? Math.min(3.5, plotLength * 0.08) : 1;

  const usableWidth = plotWidth - setbackX * 2;
  const usableLength = plotLength - setbackY * 2;

  const rooms: Room[] = [];

  if (houseType === '1BHK') {
    // 1BHK Layout: Living Room, Kitchen/Dining, Master Bedroom, Bath, Balcony
    const col1W = Math.round(usableWidth * 0.58 * 10) / 10;
    const col2W = Math.round((usableWidth - col1W) * 10) / 10;

    const row1H = Math.round(usableLength * 0.52 * 10) / 10;
    const row2H = Math.round((usableLength - row1H) * 10) / 10;

    // Living Room (Front Left)
    rooms.push({
      id: 'living-1',
      name: 'Living & Dining Room',
      type: 'living',
      x: setbackX,
      y: setbackY,
      width: col1W,
      length: row1H,
      doors: [{ wall: 'bottom', offset: 2, width: 3.2 }],
      windows: [{ wall: 'top', offset: 2, width: 4 }],
    });

    // Kitchen (Front Right)
    rooms.push({
      id: 'kitchen-1',
      name: 'Modular Kitchen',
      type: 'kitchen',
      x: setbackX + col1W,
      y: setbackY,
      width: col2W,
      length: row1H * 0.7,
      doors: [{ wall: 'left', offset: 2, width: 2.8 }],
      windows: [{ wall: 'top', offset: 2, width: 3 }],
    });

    // Bathroom (Mid Right)
    rooms.push({
      id: 'bath-1',
      name: 'Common Washroom',
      type: 'bathroom',
      x: setbackX + col1W,
      y: setbackY + row1H * 0.7,
      width: col2W,
      length: row1H * 0.3,
      doors: [{ wall: 'left', offset: 1.5, width: 2.5 }],
      windows: [{ wall: 'right', offset: 1, width: 2 }],
    });

    // Bedroom (Rear Left)
    rooms.push({
      id: 'bed-1',
      name: 'Master Bedroom',
      type: 'master_bedroom',
      x: setbackX,
      y: setbackY + row1H,
      width: col1W,
      length: row2H,
      doors: [{ wall: 'top', offset: 2, width: 3 }],
      windows: [{ wall: 'bottom', offset: 2, width: 4 }],
    });

    // Balcony / Utility (Rear Right)
    if (hasBalcony) {
      rooms.push({
        id: 'balcony-1',
        name: 'Sitout / Balcony',
        type: 'balcony',
        x: setbackX + col1W,
        y: setbackY + row1H,
        width: col2W,
        length: row2H,
        doors: [{ wall: 'left', offset: 2, width: 2.8 }],
        windows: [{ wall: 'bottom', offset: 1.5, width: 3 }],
      });
    }
  } else if (houseType === '3BHK') {
    // 3BHK Layout: Living, Kitchen, Dining, 3 Bedrooms, 2-3 Baths, Balcony
    const splitX = Math.round(usableWidth * 0.52 * 10) / 10;
    const rightX = Math.round((usableWidth - splitX) * 10) / 10;
    const row1H = Math.round(usableLength * 0.36 * 10) / 10;
    const row2H = Math.round(usableLength * 0.32 * 10) / 10;
    const row3H = Math.round((usableLength - row1H - row2H) * 10) / 10;

    // Front Row: Living Hall + (Car Parking or Guest Bedroom)
    rooms.push({
      id: 'living-1',
      name: 'Living Hall',
      type: 'living',
      x: setbackX,
      y: setbackY,
      width: splitX,
      length: row1H,
      doors: [{ wall: 'bottom', offset: 3, width: 3.5 }],
      windows: [{ wall: 'top', offset: 2, width: 5 }],
    });

    if (hasParking) {
      rooms.push({
        id: 'parking-1',
        name: 'Car Parking / Porch',
        type: 'parking',
        x: setbackX + splitX,
        y: setbackY,
        width: rightX,
        length: row1H,
        doors: [{ wall: 'bottom', offset: 2, width: 4 }],
        windows: [{ wall: 'top', offset: 2, width: 3.5 }],
      });
    } else {
      rooms.push({
        id: 'bed-3',
        name: 'Guest Bedroom',
        type: 'bedroom',
        x: setbackX + splitX,
        y: setbackY,
        width: rightX,
        length: row1H,
        doors: [{ wall: 'left', offset: 2, width: 3 }],
        windows: [{ wall: 'top', offset: 2, width: 3.5 }],
      });
    }

    // Mid Row: Kitchen, Dining, Washroom, and Bedrooms
    if (hasDining) {
      // Split left side into Modular Kitchen and Dining Space
      const kitchenW = Math.round(splitX * 0.55 * 10) / 10;
      const diningW = Math.round((splitX - kitchenW) * 10) / 10;

      rooms.push({
        id: 'kitchen-1',
        name: 'Modular Kitchen',
        type: 'kitchen',
        x: setbackX,
        y: setbackY + row1H,
        width: kitchenW,
        length: row2H,
        doors: [{ wall: 'top', offset: 2, width: 2.8 }],
        windows: [{ wall: 'left', offset: 2, width: 3.5 }],
      });

      rooms.push({
        id: 'dining-1',
        name: 'Dining Area',
        type: 'dining',
        x: setbackX + kitchenW,
        y: setbackY + row1H,
        width: diningW,
        length: row2H,
        doors: [{ wall: 'top', offset: 1.5, width: 2.5 }],
        windows: [{ wall: 'bottom', offset: 1.5, width: 3.0 }],
      });
    } else {
      rooms.push({
        id: 'kitchen-1',
        name: 'Kitchen & Dining',
        type: 'kitchen',
        x: setbackX,
        y: setbackY + row1H,
        width: splitX * 0.65,
        length: row2H,
        doors: [{ wall: 'top', offset: 2, width: 3 }],
        windows: [{ wall: 'left', offset: 2, width: 3.5 }],
      });

      rooms.push({
        id: 'bath-1',
        name: 'Common Bath',
        type: 'bathroom',
        x: setbackX + splitX * 0.65,
        y: setbackY + row1H,
        width: splitX * 0.35,
        length: row2H,
        doors: [{ wall: 'left', offset: 1.5, width: 2.5 }],
        windows: [{ wall: 'right', offset: 1, width: 2 }],
      });
    }

    if (hasParking) {
      // When parking takes the front right, place Bed 2 and Bed 3 in the middle/rear
      const bedSplitH = Math.round(row2H * 0.5 * 10) / 10;
      const bed2H = Math.round((row2H - bedSplitH) * 10) / 10;

      rooms.push({
        id: 'bed-3',
        name: 'Guest Bedroom',
        type: 'bedroom',
        x: setbackX + splitX,
        y: setbackY + row1H,
        width: rightX,
        length: bedSplitH,
        doors: [{ wall: 'left', offset: 2, width: 3 }],
        windows: [{ wall: 'right', offset: 2, width: 3.5 }],
      });

      rooms.push({
        id: 'bed-2',
        name: 'Bedroom 2',
        type: 'bedroom',
        x: setbackX + splitX,
        y: setbackY + row1H + bedSplitH,
        width: rightX,
        length: bed2H,
        doors: [{ wall: 'left', offset: 2, width: 3 }],
        windows: [{ wall: 'right', offset: 2, width: 3.5 }],
      });
    } else {
      rooms.push({
        id: 'bed-2',
        name: 'Bedroom 2',
        type: 'bedroom',
        x: setbackX + splitX,
        y: setbackY + row1H,
        width: rightX,
        length: row2H,
        doors: [{ wall: 'left', offset: 2, width: 3 }],
        windows: [{ wall: 'right', offset: 2, width: 4 }],
      });
    }

    // Rear: Master Bedroom + Attached Bath + Balcony
    const masterW = Math.round(usableWidth * 0.58 * 10) / 10;
    const rearRightW = Math.round((usableWidth - masterW) * 10) / 10;

    rooms.push({
      id: 'master-bed',
      name: 'Master Suite',
      type: 'master_bedroom',
      x: setbackX,
      y: setbackY + row1H + row2H,
      width: masterW,
      length: row3H,
      doors: [{ wall: 'top', offset: 3, width: 3 }],
      windows: [{ wall: 'bottom', offset: 2, width: 4.5 }],
    });

    rooms.push({
      id: 'master-bath',
      name: 'Attached Bath',
      type: 'attached_bathroom',
      x: setbackX + masterW,
      y: setbackY + row1H + row2H,
      width: rearRightW * 0.45,
      length: row3H,
      doors: [{ wall: 'left', offset: 1.5, width: 2.5 }],
      windows: [{ wall: 'right', offset: 1, width: 2 }],
    });

    if (hasBalcony) {
      rooms.push({
        id: 'balcony-1',
        name: 'Private Balcony',
        type: 'balcony',
        x: setbackX + masterW + rearRightW * 0.45,
        y: setbackY + row1H + row2H,
        width: rearRightW * 0.55,
        length: row3H,
        doors: [{ wall: 'left', offset: 1, width: 2.8 }],
        windows: [{ wall: 'bottom', offset: 1, width: 3 }],
      });
    }
  } else {
    // 2BHK Layout (Default flagship scenario: 30x40 or any plot)
    // Clear functional separation:
    // Left column: Living Room (front) + Dining & Kitchen (mid/rear)
    // Right column: Bedroom 2 (front), Common Bath & Master Bath (mid), Master Bedroom (rear)
    const leftWidth = Math.round(usableWidth * 0.52 * 10) / 10;
    const rightWidth = Math.round((usableWidth - leftWidth) * 10) / 10;

    const frontHeight = Math.round(usableLength * 0.48 * 10) / 10;
    const rearHeight = Math.round((usableLength - frontHeight) * 10) / 10;

    // 1. Living Room (Front Left)
    rooms.push({
      id: 'room-living',
      name: 'Living Room',
      type: 'living',
      x: setbackX,
      y: setbackY,
      width: leftWidth,
      length: frontHeight,
      doors: [{ wall: 'bottom', offset: 2.5, width: 3.5 }],
      windows: [
        { wall: 'top', offset: 2.0, width: 4.0 },
        { wall: 'left', offset: 2.5, width: 4.0 },
      ],
    });

    // 2. Bedroom 2 / Guest Bedroom (Front Right)
    rooms.push({
      id: 'room-bed-2',
      name: 'Bedroom 2',
      type: 'bedroom',
      x: setbackX + leftWidth,
      y: setbackY,
      width: rightWidth,
      length: frontHeight * 0.72,
      doors: [{ wall: 'bottom', offset: 2.0, width: 3.0 }],
      windows: [
        { wall: 'top', offset: 2.0, width: 3.5 },
        { wall: 'right', offset: 2.0, width: 3.5 },
      ],
    });

    // 3. Common Bathroom (Between Bed 2 and Master Bed)
    const bathHeight = frontHeight * 0.28;
    rooms.push({
      id: 'room-bath-common',
      name: 'Common Bath',
      type: 'bathroom',
      x: setbackX + leftWidth,
      y: setbackY + frontHeight * 0.72,
      width: rightWidth,
      length: bathHeight,
      doors: [{ wall: 'left', offset: 1.5, width: 2.5 }],
      windows: [{ wall: 'right', offset: 1.0, width: 2.0 }],
    });

    // 4. Kitchen & Dining (Rear Left)
    const kitchenLength = hasBalcony ? rearHeight * 0.72 : rearHeight;
    rooms.push({
      id: 'room-kitchen',
      name: 'Kitchen & Dining',
      type: 'kitchen',
      x: setbackX,
      y: setbackY + frontHeight,
      width: leftWidth,
      length: kitchenLength,
      doors: [{ wall: 'top', offset: 2.0, width: 3.0 }],
      windows: [
        { wall: 'left', offset: 2.0, width: 3.5 },
        { wall: 'bottom', offset: 2.0, width: 3.5 },
      ],
    });

    // 5. Utility / Balcony (Rear Left Corner)
    if (hasBalcony) {
      rooms.push({
        id: 'room-balcony',
        name: 'Balcony / Sitout',
        type: 'balcony',
        x: setbackX,
        y: setbackY + frontHeight + kitchenLength,
        width: leftWidth,
        length: rearHeight - kitchenLength,
        doors: [{ wall: 'top', offset: 2.0, width: 2.8 }],
        windows: [{ wall: 'bottom', offset: 1.5, width: 4.0 }],
      });
    }

    // 6. Master Bedroom (Rear Right) with Attached Bath
    const masterBathW = Math.round(rightWidth * 0.42 * 10) / 10;
    const masterBedW = Math.round((rightWidth - masterBathW) * 10) / 10;

    rooms.push({
      id: 'room-master-bed',
      name: 'Master Bedroom',
      type: 'master_bedroom',
      x: setbackX + leftWidth,
      y: setbackY + frontHeight,
      width: masterBedW,
      length: rearHeight,
      doors: [{ wall: 'left', offset: 2.0, width: 3.0 }],
      windows: [
        { wall: 'bottom', offset: 2.0, width: 4.0 },
        { wall: 'right', offset: 2.0, width: 4.0 },
      ],
    });

    // 7. Attached Bathroom for Master Bed
    rooms.push({
      id: 'room-master-bath',
      name: 'Attached Bath',
      type: 'attached_bathroom',
      x: setbackX + leftWidth + masterBedW,
      y: setbackY + frontHeight,
      width: masterBathW,
      length: rearHeight,
      doors: [{ wall: 'left', offset: 2.0, width: 2.5 }],
      windows: [{ wall: 'right', offset: 1.5, width: 2.0 }],
    });
  }

  return {
    project_name: projectName,
    plot: {
      width: plotWidth,
      length: plotLength,
      unit,
    },
    rooms,
    floors: Number(req.floors) || 1,
    house_type: houseType,
    budget_inr: budget,
    design_notes: [
      'Demo Mode: Layout generated using deterministic architectural rule heuristics.',
      `Setbacks: ${setbackX} ${unit} side/rear clearances, ${setbackY} ${unit} front road approach clearance.`,
      'Zoning: Active public zones (Living, Foyer) grouped in front; private resting zones (Master Suite, Guest Bed) buffered towards rear.',
      'Cross-ventilation: Every habitable room features external wall openings for natural daylight and airflow.',
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    mode: 'demo',
    ai_model_used: undefined,
    ai_explanation:
      'Plan generated via PlanForge deterministic rule engine. The layout places common living zones in the front for immediate entrance access, isolates the master suite in the quiet rear quadrant, and provides standard setbacks ensuring zero geometric overlap.',
  };
}
