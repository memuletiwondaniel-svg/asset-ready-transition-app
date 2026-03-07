

# Plan: ORIP Scoring Engine Using Existing VCR Item Categories

## Impact Assessment: Zero Breaking Changes

**No existing workflows will be affected.** The approach reuses the existing `vcr_item_categories` table (Design Integrity, Technical Integrity, Operating Integrity, Management Systems, Health & Safety) as the readiness dimensions for ORI scoring. All changes are additive:

- The `vcr_item_categories` table gets a `tenant_id` column and weight/confidence fields -- existing rows remain intact
- The `readiness_nodes` table gets a new nullable `dimension_id` column pointing to `vcr_item_categories`
- The `sync_readiness_nodes` and `calculate_ori_score` functions are replaced with enhanced versions that use category-based dimensions instead of module-based grouping
- Existing P2A, ORA, PSSR, ORM workflows are untouched -- the ontology layer only reads from them

## Current VCR Item Categories (Become Readiness Dimensions)

| Code | Name | Active |
|------|------|--------|
| DI2 | Design Integrity | Yes |
| TI | Technical Integrity | Yes |
| OI | Operating Integrity | Yes |
| MS | Management Systems | Yes |
| HS | Health & Safety | Yes |

These become the tenant-configurable readiness dimensions. Different tenants can add/rename/reweight their own categories.

## Implementation Tasks

### Task 1: Extend `vcr_item_categories` for ORI Scoring
Add columns to make categories serve double duty as readiness dimensions:
- `tenant_id UUID` (nullable, defaults via trigger -- existing rows get current tenant)
- `default_weight NUMERIC(5,4)` (e.g., 0.20 = 20%)
- `confidence_factor_default NUMERIC(3,2)` (default 0.8)
- `risk_severity_multiplier NUMERIC(3,1)` (default 1.0)
- `is_readiness_dimension BOOLEAN DEFAULT true`

Add `dimension_id UUID REFERENCES vcr_item_categories(id)` to `readiness_nodes`.

### Task 2: Enhanced ORI Formula
Replace `calculate_ori_score()` with the full ORIP formula:

```
DS_i = (Σ Subcomponent_Weight × Completion%) × Confidence_Factor
RP_i = Σ (Risk_Severity × Impact_Multiplier)  -- capped at 15%
ORI  = Σ (Dimension_Weight_i × DS_i) − Global_Risk_Penalty
SCS  = ORI × Schedule_Adherence × Critical_Path_Stability
```

Add columns to `ori_scores`: `dimension_scores JSONB`, `risk_penalty_total NUMERIC`, `startup_confidence_score NUMERIC`, `schedule_adherence_index NUMERIC`, `critical_path_stability_index NUMERIC`.

Add `confidence_factor NUMERIC(3,2) DEFAULT 0.8` and `risk_severity TEXT DEFAULT 'none'` to `readiness_nodes`.

### Task 3: Update Sync Function
Update `sync_readiness_nodes()` to auto-assign `dimension_id` by mapping:
- P2A VCR prerequisites → mapped via their `vcr_items.category_id` directly to `vcr_item_categories`
- ORA activities → default to "Operating Integrity" or map via metadata
- PSSR items → map via PSSR checklist category → nearest VCR category
- ORM deliverables → default to "Management Systems"
- Training → default to "Operating Integrity"

Set confidence factors: completed/approved = 1.0, in-progress = 0.8, not-started = 0.7.

### Task 4: Executive Dashboard Enhancement
Redesign `ExecutiveDashboard.tsx` to match the strategic layout:
- **Top Banner**: Large ORI + SCS + color coding (Green >85, Amber 70-85, Red <70)
- **Dimension Breakdown**: Bar/table showing each VCR category's score, trend arrow, risk level
- **Top 5 Startup Blockers**: Blocked/critical nodes with severity
- **Predictive Trend**: ORI line chart with dashed target curve
- **Risk Impact Summary**: 4 stat boxes (Open High Risks, Startup-blocking, Dimensions below 70%, Systems below 60%)

### Task 5: Tenant-Configurable Weight Profiles
Update the existing `ori_weight_profiles` to store dimension-based weights keyed by `vcr_item_categories.id` instead of module names. Add a simple admin UI for editing weights per tenant.

### Task 6: Update Living Documents
- **Security & Compliance Doc**: Add rows for Readiness Dimensions, Risk Penalty Engine, Startup Confidence Score (mark as Active)
- **Platform Guide**: Add "Readiness Ontology & Scoring Engine" section documenting the 6 dimensions, ORI formula, SCS
- **Strategic North Star**: Update scoring engine status from Planned to Active, add dimension-based architecture detail

