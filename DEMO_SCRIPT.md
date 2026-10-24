# PlanForge — Hackathon Presentation & Live Demo Script

**Duration**: 3 to 4 Minutes  
**Presenter**: 3rd-Year Computer Science Engineering Student  
**Target Categories**:  
1. Best Open-Source AI Project  
2. Best Use of Gemma 4  

---

## 🎙️ 1. Opening Hook (30 Seconds)

> *"Good morning judges! Every year, millions of people want to build their dream home, but before an architect draws a single blueprint or a contractor provides a quote, they face two huge questions: Can my ideas fit on my plot? And how much will it actually cost?*
> 
> *Today, I'm proud to introduce **PlanForge** — Describe. Design. Estimate. An open-source web application that turns natural language housing prompts into preliminary 2D architectural floor plans and transparent, itemized construction cost estimates."*

---

## 💻 2. Live Demo: Natural Language to Layout (60 Seconds)

### Step 1: Input the Scenario
- Navigate to the **Overview & Input** tab.
- Point out the product tagline: *"Describe. Design. Estimate."*
- Highlight the **Honest Mode Indicator**:
  > *"Notice the badge in the top right. PlanForge strictly distinguishes between **Gemma AI Mode** and our rule-based **Demo Mode**. When an API key is absent, it never pretends a mock layout came from an AI."*
- Click **"Load Benchmark 2BHK Preset"**:
  > Prompt: *"I want a 2BHK house on a 30 by 40 feet plot, with two bedrooms, two bathrooms, a kitchen, a living room, and a small balcony. My budget is ₹20 lakhs."*
- Click **"Generate Preliminary Floor Plan & Estimate"**.

---

## 📐 3. Floor Plan Studio & Programmatic Validation (60 Seconds)

### Step 2: The 2D Interactive Canvas
- The view automatically transitions to the **Floor Plan Studio**.
- Point out:
  1. **Plot Boundaries & Setbacks**: The 30×40 ft boundary with dimension arrows and dashed setback clearances.
  2. **Room Zoning**:
     - Active public zones (Living Room, Kitchen) grouped near the entrance.
     - Quiet private zones (Master Suite, Guest Bedroom) buffered towards the rear.
  3. **Architectural Details**: Wall thicknesses, realistic door swing arcs, and exterior window fenestrations.
  4. **Room Information**: Each space displays its name, formatted dimensions (e.g., `14'0" × 12'0"`), and carpet area in sq.ft.

### Step 3: Interactive Editing & Collision Detection
- Click on **Bedroom 2** to select it.
- In the **Room Layout & Inspector** panel on the right, increase its width from `12` to `16` or drag the room to overlap the Living Room.
- **Show the Immediate Feedback**:
  > *"Look at that — PlanForge does not trust geometry blindly. As soon as a room collides or extends past the plot, the canvas displays red warning hatching and the status switches from 'Valid Geometry' to 'Validation Issues'. Our validation engine tests pairwise bounding box intersections in real-time."*
- Drag or adjust the room back into a valid position.

---

## 💰 4. Deterministic Construction Cost Estimator (45 Seconds)

### Step 4: The BOQ & Rate Customization
- Click on the **Cost Estimator** tab.
- Show the KPI summary:
  - **Estimated Total Cost**: e.g., ~₹19.4 Lakhs.
  - **Cost per Square Foot**: ~₹1,649 / sq.ft built-up area.
  - **Budget Comparison**: Target ₹20.0 Lakhs vs Estimated ₹19.4 Lakhs — showing a visual progress bar and a +₹54,000 budget surplus.
- Scroll to the **Bill of Quantities (BOQ)** table:
  > *"We don't let the AI hallucinate random prices. We use a deterministic, area-based engineering takeoff method benchmarked against standard CPWD residential schedules. We itemize Cement bags, TMT Steel, Bricks, Sand, Aggregate, Tiles, Painting, Electrical, Plumbing, and Labour."*
- Click on the **Cement Unit Rate** cell (`₹380`) and change it to `₹450`:
  > *"Watch the subtotal and grand total recalculate instantly with zero double-counting."*
- Mention the **CSV Export** button.

---

## 🤖 5. Gemma 4 Role & Architectural Critique (30 Seconds)

### Step 5: Spatial Analysis
- Click **"Explain Spatial Zoning & Light Flow"**.
- Highlight the structured insights:
  - Functional circulation flow.
  - Cross-ventilation and daylight fenestration analysis.
  - Cost optimization advice (e.g., aligning wet plumbing shafts vertically).

---

## 📦 6. Open-Source Wrap-Up & Closing (30 Seconds)

- Navigate to the **About & Open Source** tab.
- Key Takeaways:
  1. **Best Open-Source AI Project**: Full-stack codebase (React 19 + TypeScript + Python FastAPI), clean Pydantic models, pytest test suite, LocalStorage JSON import/export, and permissive MIT License.
  2. **Best Use of Gemma 4**: Translates unstructured natural language into structured geometric floor plans with safety bounds and architectural critique.
  3. **Engineering Integrity**: Explicit disclaimer that this is a preliminary planning feasibility tool, not a certified structural engineering drawing.
- Conclude:
  > *"PlanForge empowers anyone to describe a housing concept, visualize a valid 2D floor plan, and estimate costs with confidence. Thank you!"*
