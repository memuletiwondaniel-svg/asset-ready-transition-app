

## Plan: Create ORP Phase Table and Redesign ORA Activity Catalog Table

### Current State
The existing `ora_activity_catalog` table has 25 columns with a complex schema. The user wants a simplified, fresh structure with different columns. The table is already empty (truncated previously).

### Step 1: Create `orp_phases` reference table

Create a new lookup table with the 6 phases and seed data:

```sql
CREATE TABLE public.orp_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,        -- 'IDENTIFY', 'ASSESS', etc.
  label TEXT NOT NULL,              -- 'Identify', 'Assess', etc.
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS with read access for authenticated users
ALTER TABLE public.orp_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read phases"
  ON public.orp_phases FOR SELECT TO authenticated USING (true);

-- Seed the 6 phases
INSERT INTO public.orp_phases (code, label, display_order) VALUES
  ('IDENTIFY', 'Identify', 1),
  ('ASSESS', 'Assess', 2),
  ('SELECT', 'Select', 3),
  ('DEFINE', 'Define', 4),
  ('EXECUTE', 'Execute', 5),
  ('OPERATE', 'Operate', 6);
```

### Step 2: Drop and recreate `ora_activity_catalog` with new schema

Drop the existing table (it's empty) and create the new simplified structure:

```sql
DROP TABLE public.ora_activity_catalog;

CREATE TABLE public.ora_activity_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_code TEXT NOT NULL UNIQUE,           -- Auto-generated: ORA-001, ORA-002...
  activity TEXT NOT NULL,                        -- Free text activity name
  description TEXT,                              -- Free text description
  phase_id UUID REFERENCES public.orp_phases(id),-- FK to orp_phases
  parent_activity_id UUID REFERENCES public.ora_activity_catalog(id), -- Self-referencing FK
  duration_high INTEGER,                         -- Days (high estimate)
  duration_med INTEGER,                          -- Days (medium estimate)
  duration_low INTEGER,                          -- Days (low estimate)
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Auto-generate activity_code (ORA-001, ORA-002, etc.)
CREATE OR REPLACE FUNCTION public.generate_ora_activity_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(activity_code FROM 'ORA-(\d+)') AS INTEGER)), 0) + 1
  INTO next_num FROM public.ora_activity_catalog;
  NEW.activity_code := 'ORA-' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_generate_ora_activity_code
  BEFORE INSERT ON public.ora_activity_catalog
  FOR EACH ROW WHEN (NEW.activity_code IS NULL OR NEW.activity_code = '')
  EXECUTE FUNCTION public.generate_ora_activity_code();

-- Updated_at trigger
CREATE TRIGGER trg_ora_activity_updated_at
  BEFORE UPDATE ON public.ora_activity_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS policies
ALTER TABLE public.ora_activity_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read activities"
  ON public.ora_activity_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert activities"
  ON public.ora_activity_catalog FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update activities"
  ON public.ora_activity_catalog FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete activities"
  ON public.ora_activity_catalog FOR DELETE TO authenticated USING (true);
```

### Step 3: Update frontend hook (`useORAActivityCatalog.ts`)

- Update the `ORAActivity` interface to match the new columns (activity_code, activity, description, phase_id, parent_activity_id, duration_high, duration_med, duration_low)
- Update `ORAActivityInput` similarly
- Remove old constants (ORA_AREAS, ORA_ENTRY_TYPES, ORA_REQUIREMENT_LEVELS)
- Add a new `useORPPhases` hook or query to fetch from `orp_phases`

### Step 4: Update frontend form (`ORAActivityCatalog.tsx`)

- Update the Add/Edit dialog form fields to match the new schema: Activity, Description, Phase dropdown (from `orp_phases`), Parent Activity dropdown (self-referencing), Duration High/Med/Low
- Activity Code shown as read-only (auto-generated)
- Remove all references to old columns (level, area, entry_type, requirement_level, etc.)

### Step 5: Update wizard types (`src/components/ora/wizard/types.ts`)

- Update `catalogToWizardActivity` and `WizardActivity` to align with the new table structure

### Files to modify
- **Migration**: New SQL migration (Steps 1 & 2)
- `src/hooks/useORAActivityCatalog.ts` — Rewrite interfaces and queries
- `src/components/ora/ORAActivityCatalog.tsx` — Update form and display
- `src/components/ora/wizard/types.ts` — Align with new schema
- `src/integrations/supabase/types.ts` — Auto-updated after migration

