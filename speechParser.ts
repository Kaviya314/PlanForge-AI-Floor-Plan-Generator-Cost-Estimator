/**
 * Speech & Natural Language Parser for PlanForge Voice-to-Blueprint
 * Supports English and Tamil spoken house requirements.
 */

export interface ParsedSpeechRequirements {
  plotArea?: number;
  plotWidth?: number;
  plotLength?: number;
  unit?: 'ft' | 'm';
  numBedrooms?: number;
  numBathrooms?: number;
  numKitchens?: number;
  numLivingRooms?: number;
  hasBalcony?: boolean;
  hasDining?: boolean;
  hasParking?: boolean;
  hasGarden?: boolean;
  floors?: number;
  houseType?: string;
  designStyle?: string;
  budgetInr?: number;
  detectedTags: { key: string; label: string; value: string }[];
}

// Convert English number words to integers
const WORD_TO_NUM: Record<string, number> = {
  zero: 0,
  one: 1,
  single: 1,
  two: 2,
  double: 2,
  three: 3,
  triple: 3,
  four: 4,
  five: 5,
  six: 6,
  // Tamil number words
  ஒரு: 1,
  ஒன்று: 1,
  இரு: 2,
  இரண்டு: 2,
  மூன்று: 3,
  நான்கு: 4,
  ஐந்து: 5,
  ஆறு: 6,
};

function parseNumber(token: string): number | null {
  const clean = token.toLowerCase().trim();
  const directInt = parseInt(clean, 10);
  if (!isNaN(directInt)) return directInt;
  if (WORD_TO_NUM[clean] !== undefined) return WORD_TO_NUM[clean];
  return null;
}

export function parseSpokenRequirements(rawText: string): ParsedSpeechRequirements {
  if (!rawText || !rawText.trim()) {
    return { detectedTags: [] };
  }

  const text = rawText.toLowerCase();
  const result: ParsedSpeechRequirements = {
    detectedTags: [],
  };

  // 1. Detect Plot Area (English & Tamil)
  // e.g. "1200 square feet", "1200 sq ft", "1200 sqft", "1200 sq.ft", "1200 சதுர அடி", "1200 சதுரஅடி"
  const areaRegex = /(\d{3,5})\s*(?:square\s*feet|sq\.?\s*ft|sqft|சதுர\s*அடி|சதுரஅடி)/i;
  const areaMatch = text.match(areaRegex);

  // Direct dimension like "30 by 40", "30x40", "30*40", "30க்கு 40"
  const dimRegex = /(\d{2,3})\s*(?:by|x|\*|க்கு)\s*(\d{2,3})/i;
  const dimMatch = text.match(dimRegex);

  if (dimMatch) {
    const w = parseInt(dimMatch[1], 10);
    const l = parseInt(dimMatch[2], 10);
    if (w >= 15 && l >= 15) {
      result.plotWidth = Math.min(w, l);
      result.plotLength = Math.max(w, l);
      result.plotArea = result.plotWidth * result.plotLength;
      result.detectedTags.push({
        key: 'plot',
        label: 'Plot Dimensions',
        value: `${result.plotWidth}×${result.plotLength} ft (${result.plotArea} sq.ft)`,
      });
    }
  } else if (areaMatch) {
    const area = parseInt(areaMatch[1], 10);
    if (area >= 300 && area <= 10000) {
      result.plotArea = area;
      // Propose balanced architectural aspect ratio (~1:1.33)
      const proposedWidth = Math.round(Math.sqrt(area / 1.33) / 5) * 5;
      const validWidth = Math.max(20, proposedWidth);
      const proposedLength = Math.round(area / validWidth);
      result.plotWidth = validWidth;
      result.plotLength = proposedLength;
      result.detectedTags.push({
        key: 'plot',
        label: 'Plot Area',
        value: `${area} sq.ft (~${validWidth}×${proposedLength} ft)`,
      });
    }
  }

  // 2. Detect House Type / BHK (English: "2BHK", "3 BHK", "2 bhk")
  const bhkMatch = text.match(/([1-5])\s*bhk/i);
  if (bhkMatch) {
    const count = parseInt(bhkMatch[1], 10);
    result.houseType = `${count}BHK`;
    result.numBedrooms = count;
    result.numBathrooms = Math.max(1, count >= 3 ? 3 : count >= 2 ? 2 : 1);
    result.detectedTags.push({
      key: 'house_type',
      label: 'House Type',
      value: `${count}BHK`,
    });
  }

  // 3. Detect Bedrooms (English & Tamil)
  // "three bedrooms", "3 bedrooms", "3 படுக்கையறைகள்", "மூன்று படுக்கையறைகள்", "3 பெட்ரூம்", "மூன்று பெட்ரூம்"
  const bedRegex = /(one|two|three|four|five|single|double|triple|\d+|ஒரு|ஒன்று|இரு|இரண்டு|மூன்று|நான்கு|ஐந்து)\s*(?:bedrooms?|beds?|படுக்கையறை|படுக்கையறைகள்|பெட்ரூம்)/i;
  const bedMatch = text.match(bedRegex);
  if (bedMatch) {
    const beds = parseNumber(bedMatch[1]);
    if (beds && beds >= 1 && beds <= 6) {
      result.numBedrooms = beds;
      result.houseType = `${beds}BHK`;
      result.detectedTags.push({
        key: 'bedrooms',
        label: 'Bedrooms',
        value: `${beds} Bedroom${beds > 1 ? 's' : ''}`,
      });
    }
  }

  // 4. Detect Bathrooms (English & Tamil)
  // "two bathrooms", "2 bathrooms", "இரண்டு குளியலறைகள்", "2 கழிப்பறைகள்", "இரண்டு பாத்ரூம்"
  const bathRegex = /(one|two|three|four|five|single|double|triple|\d+|ஒரு|ஒன்று|இரு|இரண்டு|மூன்று|நான்கு|ஐந்து)\s*(?:bathrooms?|baths?|toilets?|குளியலறை|குளியலறைகள்|கழிப்பறை|கழிப்பறைகள்|பாத்ரூம்)/i;
  const bathMatch = text.match(bathRegex);
  if (bathMatch) {
    const baths = parseNumber(bathMatch[1]);
    if (baths && baths >= 1 && baths <= 6) {
      result.numBathrooms = baths;
      result.detectedTags.push({
        key: 'bathrooms',
        label: 'Bathrooms',
        value: `${baths} Bathroom${baths > 1 ? 's' : ''}`,
      });
    }
  } else if (!result.numBathrooms && result.numBedrooms) {
    result.numBathrooms = Math.max(1, result.numBedrooms >= 3 ? 2 : 1);
  }

  // 5. Detect Kitchen (English & Tamil)
  if (
    text.includes('kitchen') ||
    text.includes('cooking') ||
    text.includes('சமையலறை') ||
    text.includes('கிச்சன்')
  ) {
    result.numKitchens = 1;
    result.detectedTags.push({
      key: 'kitchen',
      label: 'Kitchen',
      value: '1 Kitchen',
    });
  }

  // 6. Detect Living Room / Hall (English & Tamil)
  if (
    text.includes('living') ||
    text.includes('hall') ||
    text.includes('வரவேற்பறை') ||
    text.includes('லிவிங்')
  ) {
    result.numLivingRooms = 1;
  }

  // 7. Detect Dining Area (English & Tamil)
  if (
    text.includes('dining') ||
    text.includes('சாப்பாட்டு அறை') ||
    text.includes('டைனிங்')
  ) {
    result.hasDining = true;
    result.detectedTags.push({
      key: 'dining',
      label: 'Dining',
      value: 'Dedicated Dining Space',
    });
  }

  // 8. Detect Parking / Garage / Porch (English & Tamil)
  if (
    text.includes('parking') ||
    text.includes('car park') ||
    text.includes('car porch') ||
    text.includes('garage') ||
    text.includes('பார்க்கிங்') ||
    text.includes('கார் பார்க்கிங்') ||
    text.includes('வாகன நிறுத்துமிடம்')
  ) {
    result.hasParking = true;
    result.detectedTags.push({
      key: 'parking',
      label: 'Parking',
      value: 'Car Porch / Parking',
    });
  }

  // 9. Detect Balcony / Sit-out (English & Tamil)
  if (
    text.includes('balcony') ||
    text.includes('sitout') ||
    text.includes('sit-out') ||
    text.includes('verandah') ||
    text.includes('patio') ||
    text.includes('terrace') ||
    text.includes('பால்கனி') ||
    text.includes('திண்ணை')
  ) {
    result.hasBalcony = true;
    result.detectedTags.push({
      key: 'balcony',
      label: 'Balcony',
      value: 'Sit-out Balcony',
    });
  }

  // 10. Detect Garden / Courtyard (English & Tamil)
  if (
    text.includes('garden') ||
    text.includes('lawn') ||
    text.includes('courtyard') ||
    text.includes('backyard') ||
    text.includes('தோட்டம்') ||
    text.includes('முற்றம்')
  ) {
    result.hasGarden = true;
    result.detectedTags.push({
      key: 'garden',
      label: 'Garden',
      value: 'Private Courtyard / Garden',
    });
  }

  // 11. Detect Floors (English & Tamil)
  if (
    text.includes('two floor') ||
    text.includes('2 floor') ||
    text.includes('double storey') ||
    text.includes('duplex') ||
    text.includes('g+1') ||
    text.includes('இரண்டு மாடி') ||
    text.includes('இரு மாடி')
  ) {
    result.floors = 2;
    result.detectedTags.push({
      key: 'floors',
      label: 'Floors',
      value: '2 Floors (G+1)',
    });
  } else if (
    text.includes('single floor') ||
    text.includes('ground floor') ||
    text.includes('1 floor') ||
    text.includes('ஒரு மாடி') ||
    text.includes('தரைத்தளம்')
  ) {
    result.floors = 1;
    result.detectedTags.push({
      key: 'floors',
      label: 'Floors',
      value: '1 Floor (Ground)',
    });
  }

  // 12. Detect Budget (English & Tamil)
  // e.g. "20 lakhs", "25 lakh", "30 lakhs", "1 crore", "20 லட்சம்", "30 லட்சம்"
  const lakhMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:lakhs?|lac|லட்சம்)/i);
  const croreMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:crores?|cr|கோடி)/i);
  if (croreMatch) {
    const cr = parseFloat(croreMatch[1]);
    result.budgetInr = Math.round(cr * 10000000);
    result.detectedTags.push({
      key: 'budget',
      label: 'Budget',
      value: `₹${cr} Crore`,
    });
  } else if (lakhMatch) {
    const lk = parseFloat(lakhMatch[1]);
    result.budgetInr = Math.round(lk * 100000);
    result.detectedTags.push({
      key: 'budget',
      label: 'Budget',
      value: `₹${lk} Lakhs`,
    });
  }

  // 13. Detect Style (English & Tamil)
  if (text.includes('vastu') || text.includes('வாஸ்து')) {
    result.designStyle = 'Modern Vastu Compliant';
    result.detectedTags.push({
      key: 'style',
      label: 'Style',
      value: 'Modern Vastu Compliant',
    });
  } else if (text.includes('traditional') || text.includes('courtyard') || text.includes('பாரம்பரியம்')) {
    result.designStyle = 'Traditional Courtyard';
    result.detectedTags.push({
      key: 'style',
      label: 'Style',
      value: 'Traditional Courtyard',
    });
  } else if (text.includes('scandinavian') || text.includes('functional')) {
    result.designStyle = 'Scandinavian Functional';
    result.detectedTags.push({
      key: 'style',
      label: 'Style',
      value: 'Scandinavian Functional',
    });
  } else if (text.includes('contemporary') || text.includes('minimalist') || text.includes('modern') || text.includes('நவீன')) {
    result.designStyle = 'Contemporary Minimalist';
    result.detectedTags.push({
      key: 'style',
      label: 'Style',
      value: 'Contemporary Minimalist',
    });
  }

  return result;
}
