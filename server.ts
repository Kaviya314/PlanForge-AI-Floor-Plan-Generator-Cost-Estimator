import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GeneratePlanRequest, PlanLayout, Room, UnitRateOverride } from './src/types/plan';
import { validateLayout } from './src/utils/validation';
import { calculateCostEstimate } from './src/utils/costCalculation';
import { generateDeterministicPlan } from './src/utils/demoGenerator';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const activeApiKey = process.env.GEMMA_API_KEY || process.env.GEMINI_API_KEY;
const hasApiKey = Boolean(
  activeApiKey &&
  activeApiKey !== 'MY_GEMINI_API_KEY' &&
  activeApiKey !== 'MY_GEMMA_API_KEY'
);
const AI_MODEL = process.env.AI_MODEL || 'gemma-4-26b-a4b-it';
const AI_PROVIDER = process.env.AI_PROVIDER || 'gemini';

// Initialize Gemini SDK client server-side with Gemma 4 support
const ai = hasApiKey
  ? new GoogleGenAI({
      apiKey: activeApiKey,
      httpOptions: {
        timeout: 45000,
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// JSON extraction helper that safely handles markdown code fences and unescaped control chars
function extractJson(rawText: string): any {
  if (!rawText) return {};
  let text = rawText.trim();

  // Strip markdown code fences if present
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  } else {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      text = text.substring(firstBrace, lastBrace + 1);
    }
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    // Sanitize unescaped newlines/tabs inside string literals
    const cleaned = text.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (m) => {
      return m.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
    });
    return JSON.parse(cleaned);
  }
}

app.use(express.json());

// 1. Health Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    ai_configured: hasApiKey,
    ai_model: AI_MODEL,
    ai_provider: AI_PROVIDER,
    demo_mode_available: true,
    timestamp: new Date().toISOString(),
  });
});

// 2. Safe Public Config Endpoint
app.get('/api/config', (req, res) => {
  res.json({
    ai_available: hasApiKey,
    model_name: AI_MODEL,
    default_unit: 'ft',
    app_version: '1.0.0',
    demo_fallback_active: !hasApiKey,
  });
});

// Resilient Gemma generation with automatic retry for transient 500/504 responses
async function callGemmaWithRetry(
  client: GoogleGenAI,
  model: string,
  prompt: string,
  config?: any,
  retries = 2
) {
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await client.models.generateContent({
        model,
        contents: prompt,
        config,
      });
    } catch (err: any) {
      console.warn(`Gemma API attempt ${attempt} failed: ${err?.message || err}`);
      if (attempt <= retries) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      } else {
        throw err;
      }
    }
  }
}

// 3. Plan Generation Endpoint
app.post('/api/plan/generate', async (req, res) => {
  const body: GeneratePlanRequest = req.body;
  const forceDemo = body.force_demo || !hasApiKey || !ai;

  if (forceDemo) {
    const demoPlan = generateDeterministicPlan(body);
    const validation = validateLayout(demoPlan);
    return res.json({
      plan: demoPlan,
      validation,
      mode: 'demo',
      message: hasApiKey
        ? 'Generated using deterministic architectural rules (Demo mode requested).'
        : 'Generated in Demo Mode (No AI API key configured).',
    });
  }

  try {
    const prompt = `You are PlanForge's senior architectural planning engine powered by Google Gemma.
Generate a residential 2D floor plan layout as a JSON object matching this specification:
- User prompt: "${body.natural_prompt || ''}"
- Project Name: "${body.project_name || 'My Residence'}"
- Plot Dimensions: ${body.plot_width} ${body.unit} width by ${body.plot_length} ${body.unit} depth (Total Area: ${body.plot_width * body.plot_length} ${body.unit}²).
- House Type: ${body.house_type}
- Required Rooms: Bedrooms: ${body.num_bedrooms}, Bathrooms: ${body.num_bathrooms}, Kitchens: ${body.num_kitchens}, Living Rooms: ${body.num_living_rooms}, Dining: ${body.has_dining ? 'Yes' : 'No'}, Car Parking: ${body.has_parking ? 'Yes' : 'No'}, Balcony: ${body.has_balcony ? 'Yes' : 'No'}
- Floors: ${body.floors || 1}
- Target Budget: ₹${body.budget_inr} INR

GEOMETRIC RULES:
1. Every room must have positive width and length.
2. Every room must be placed completely inside the plot boundary: x >= 0, y >= 0, (x + width) <= ${body.plot_width}, (y + length) <= ${body.plot_length}. Leave a 2-3 ${body.unit} setback for walls.
3. Rooms must NOT overlap each other. Rectangles must be non-intersecting partitions.
4. Arrange rooms logically (Living/entrance in front, Kitchen adjacent to dining/exterior, Bedrooms in private quiet zones).

Output strictly a JSON object with this structure:
{
  "project_name": "${body.project_name || 'My Residence'}",
  "plot": { "width": ${body.plot_width}, "length": ${body.plot_length}, "unit": "${body.unit}" },
  "rooms": [
    { "id": "room-1", "name": "Living Room", "type": "living", "x": 2, "y": 2, "width": 14, "length": 16 }
  ],
  "budget_inr": ${body.budget_inr},
  "design_notes": ["Well-ventilated perimeter zoning"],
  "ai_explanation": "Spatial layout explanation"
}`;

    const response = await callGemmaWithRetry(ai!, AI_MODEL, prompt, {
      maxOutputTokens: 1200,
      temperature: 0.1,
    });

    const parsedJson = extractJson(response?.text || '{}');

    // Extract rooms array accommodating different Gemma JSON response structures
    const rawRooms =
      parsedJson.rooms ||
      parsedJson.apartment_layout?.rooms ||
      parsedJson.layout?.rooms ||
      parsedJson.apartment_layout?.layout ||
      [];

    const rooms: Room[] = (rawRooms.length > 0 ? rawRooms : []).map((r: any, idx: number) => {
      let width = Math.max(
        3,
        Number(r.width || r.dimensions?.width || r.dim?.width || (r.area_sqft ? Math.round(Math.sqrt(r.area_sqft) * 1.1) : 12))
      );
      let length = Math.max(
        3,
        Number(r.length || r.dimensions?.length || r.dim?.length || (r.area_sqft ? Math.round(r.area_sqft / width) : 14))
      );

      // Default positioning in 2 columns if coordinates omitted
      const defaultX = idx % 2 === 0 ? 2.5 : Math.min(body.plot_width - width - 1, 16);
      const defaultY = Math.floor(idx / 2) * 15 + 2.5;

      const x = r.x !== undefined ? Math.max(0, Number(r.x)) : r.coordinates?.x !== undefined ? Math.max(0, Number(r.coordinates.x)) : defaultX;
      const y = r.y !== undefined ? Math.max(0, Number(r.y)) : r.coordinates?.y !== undefined ? Math.max(0, Number(r.coordinates.y)) : defaultY;

      return {
        id: String(r.id || r.room_id || `room-${idx + 1}`),
        name: String(r.name || r.room_name || `Room ${idx + 1}`),
        type: String(r.type || 'custom').toLowerCase().replace(/\s+/g, '_') as any,
        x,
        y,
        width,
        length,
        doors:
          r.doors && r.doors.length > 0
            ? r.doors
            : [{ wall: 'bottom', offset: Math.min(2, width * 0.2), width: Math.min(3, width * 0.35) }],
        windows:
          r.windows && r.windows.length > 0
            ? r.windows
            : [{ wall: 'top', offset: Math.min(2, width * 0.2), width: Math.min(4, width * 0.45) }],
      };
    });

    // If model returned no rooms, fallback to deterministic rooms
    if (rooms.length === 0) {
      throw new Error('Gemma response did not contain an interpretable rooms array.');
    }

    const plan: PlanLayout = {
      project_name: parsedJson.project_name || body.project_name || 'Gemma 4 Generated Plan',
      plot: {
        width: Number(parsedJson.plot?.width) || body.plot_width,
        length: Number(parsedJson.plot?.length) || body.plot_length,
        unit: body.unit,
      },
      rooms,
      floors: body.floors || 1,
      house_type: body.house_type || 'Custom',
      budget_inr: Number(parsedJson.budget_inr) || body.budget_inr,
      design_notes: Array.isArray(parsedJson.design_notes)
        ? parsedJson.design_notes
        : [
            `Spatial layout synthesized via Google Gemma (${AI_MODEL}).`,
            'Zoning optimized for natural daylight and ventilation.',
          ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      mode: 'ai',
      ai_model_used: AI_MODEL,
      ai_explanation:
        parsedJson.ai_explanation ||
        'Plan synthesized using Google Gemma spatial reasoning with natural light zoning.',
    };

    const validation = validateLayout(plan);

    return res.json({
      plan,
      validation,
      mode: 'ai',
      ai_model_used: AI_MODEL,
      message: validation.is_valid
        ? 'Plan successfully synthesized and validated via Google Gemma 4.'
        : 'Plan synthesized with geometric validation warnings. You can easily adjust room bounds in the workspace editor.',
    });
  } catch (error: any) {
    console.error('AI plan generation error, falling back to Demo Mode:', error?.message || error);
    const fallbackPlan = generateDeterministicPlan(body);
    const validation = validateLayout(fallbackPlan);
    return res.json({
      plan: fallbackPlan,
      validation,
      mode: 'demo',
      error_fallback: true,
      fallback_reason: error?.message || 'External AI inference error or rate limit',
      message: 'Switched to Demo Mode due to AI endpoint response. Full layout and estimate are ready.',
    });
  }
});

// 4. Plan Validation Endpoint
app.post('/api/plan/validate', (req, res) => {
  const layout: PlanLayout = req.body;
  if (!layout) {
    return res.status(400).json({ error: 'Missing layout object' });
  }
  const result = validateLayout(layout);
  res.json(result);
});

// 5. Cost Estimation Endpoint
app.post('/api/cost/estimate', (req, res) => {
  const { layout, rate_overrides = {} }: { layout: PlanLayout; rate_overrides?: UnitRateOverride } = req.body;
  if (!layout) {
    return res.status(400).json({ error: 'Missing layout object' });
  }
  const estimate = calculateCostEstimate(layout, rate_overrides);
  res.json(estimate);
});

// 6. AI Architectural Explanation Endpoint
app.post('/api/ai/explain', async (req, res) => {
  const { layout, query }: { layout: PlanLayout; query?: string } = req.body;

  if (!layout) {
    return res.status(400).json({ error: 'Missing layout object' });
  }

  if (!hasApiKey || !ai) {
    return res.json({
      mode: 'demo',
      explanation: {
        summary: `Preliminary architectural evaluation for ${layout.project_name} (${layout.house_type}) on a ${layout.plot.width}×${layout.plot.length} ${layout.plot.unit} plot.`,
        zoning_analysis:
          'Public zones (Living, Foyer) are strategically positioned for immediate entry accessibility, while private sleeping zones are insulated toward the rear. Wet service areas (Kitchen & Washrooms) are aligned to optimize plumbing shaft clustering.',
        lighting_ventilation:
          'Rooms on the perimeter have access to exterior fenestrations for cross-ventilation, reducing daytime lighting load and thermal heat gain.',
        cost_optimizations: [
          'Stacking wet areas vertically (bathrooms and kitchen) drastically cuts plumbing conduit costs by 12-15%.',
          'Standardizing room wall alignments reduces structural cantilever beams and RCC formwork costs.',
          'Keeping ground coverage within 70% preserves open setback space required by fire safety and municipal bylaws.',
        ],
      },
    });
  }

  try {
    const prompt = `Analyze this floor plan layout and provide an architectural critique:
Layout: ${JSON.stringify(layout)}
User query: ${query || 'Provide an architectural analysis of spatial efficiency, ventilation, and cost saving tips.'}`;

    const response = await ai.models.generateContent({
      model: AI_MODEL,
      contents: prompt,
      config: {
        systemInstruction:
          'You are an architect and cost engineer. Respond with practical, professional insights regarding circulation, daylighting, structural economy, and material optimization.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            zoning_analysis: { type: Type.STRING },
            lighting_ventilation: { type: Type.STRING },
            cost_optimizations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['summary', 'zoning_analysis', 'lighting_ventilation', 'cost_optimizations'],
        },
      },
    });

    const parsed = extractJson(response.text || '{}');
    return res.json({
      mode: 'ai',
      model: AI_MODEL,
      explanation: parsed,
    });
  } catch (error: any) {
    return res.json({
      mode: 'demo_fallback',
      explanation: {
        summary: `Architectural analysis for ${layout.project_name} (${layout.house_type})`,
        zoning_analysis: 'Functional spatial distribution balances living accessibility with private bedroom zones.',
        lighting_ventilation: 'External wall setbacks allow natural light infiltration into primary living quarters.',
        cost_optimizations: [
          'Aligning column grids minimizes RCC steel rebar quantities.',
          'Selecting AAC lightweight blocks reduces dead load on foundation.',
        ],
      },
    });
  }
});

// Vite server integration
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PlanForge server running on http://0.0.0.0:${PORT} (AI configured: ${hasApiKey})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
