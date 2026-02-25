

## Fix: Assign Role UUIDs to 20 Users with Missing Roles

### The Difference
- **Position** = detailed job title with location (e.g., "Ops Team Lead - BNGL - Train 2") — a free-text string
- **Role** = generic role category linked via UUID to the `roles` table (e.g., "Ops Team Lead") — used by the system for PSSR matching, permissions, and filtering

All 20 users already have positions. They're just missing the role UUID link.

### What We'll Do
Run 20 UPDATE statements to set each user's `role` column to the correct UUID from the `roles` table. Every role already exists — no new roles needed.

### SQL Updates (via insert tool, not migration)

```sql
-- Ops Team Leads (4 users) → 761eb276-fdd5-4c5d-8d72-a75e00b0fbf6
UPDATE profiles SET role = '761eb276-fdd5-4c5d-8d72-a75e00b0fbf6' WHERE full_name = 'Ammar Al-Harethi' AND role IS NULL;
UPDATE profiles SET role = '761eb276-fdd5-4c5d-8d72-a75e00b0fbf6' WHERE full_name = 'Hussein Mozan' AND role IS NULL;
UPDATE profiles SET role = '761eb276-fdd5-4c5d-8d72-a75e00b0fbf6' WHERE full_name = 'Khalid Isam' AND role IS NULL;
UPDATE profiles SET role = '761eb276-fdd5-4c5d-8d72-a75e00b0fbf6' WHERE full_name = 'Sajad Ali' AND role IS NULL;

-- Ops Managers (3) → 99d4e4cf-829f-42e7-bfa0-1f14814807c5
UPDATE profiles SET role = '99d4e4cf-829f-42e7-bfa0-1f14814807c5' WHERE full_name = 'Ali Al-Matar' AND role IS NULL;
UPDATE profiles SET role = '99d4e4cf-829f-42e7-bfa0-1f14814807c5' WHERE full_name = 'Anwar Al-Nasari' AND role IS NULL;
UPDATE profiles SET role = '99d4e4cf-829f-42e7-bfa0-1f14814807c5' WHERE full_name = 'Bahir Saud' AND role IS NULL;

-- Ops Coaches (3) → 8cb0dbf8-1ddd-475e-8205-45c115931b76
UPDATE profiles SET role = '8cb0dbf8-1ddd-475e-8205-45c115931b76' WHERE full_name = 'Dylan  Smith' AND role IS NULL;
UPDATE profiles SET role = '8cb0dbf8-1ddd-475e-8205-45c115931b76' WHERE full_name = 'Sean  Peppard' AND role IS NULL;
UPDATE profiles SET role = '8cb0dbf8-1ddd-475e-8205-45c115931b76' WHERE full_name = 'Vinny  Spice' AND role IS NULL;

-- Construction Leads (2) → 82b98733-1690-4d04-b2bb-e9c24ec18325
UPDATE profiles SET role = '82b98733-1690-4d04-b2bb-e9c24ec18325' WHERE full_name = 'Dmitriy Trukhinov' AND role IS NULL;
UPDATE profiles SET role = '82b98733-1690-4d04-b2bb-e9c24ec18325' WHERE full_name = 'Vyacheslav Motko' AND role IS NULL;

-- Project Engrs (2) → 88c54747-e81f-47ff-9574-7f982f8520cc
UPDATE profiles SET role = '88c54747-e81f-47ff-9574-7f982f8520cc' WHERE full_name = 'Manu Sankarankutty' AND role IS NULL;
UPDATE profiles SET role = '88c54747-e81f-47ff-9574-7f982f8520cc' WHERE full_name = 'Mohd Arif  Saifi' AND role IS NULL;

-- Individual roles (6 users)
UPDATE profiles SET role = '790e1633-1364-424c-afaf-b6c993f9bdfa' WHERE full_name = 'Abbas Ali' AND role IS NULL;          -- Mtce Mgr. Static
UPDATE profiles SET role = '14defdba-4739-4e4e-a94e-c5c560531dc2' WHERE full_name = 'David Ireland' AND role IS NULL;       -- MCI TA2
UPDATE profiles SET role = '2089e8e0-5362-4b44-b13d-ab5aacc4e899' WHERE full_name = 'Fiirat Al-Naim' AND role IS NULL;      -- Mtce Mgr. Instrument
UPDATE profiles SET role = 'ed6046ca-a68c-4840-a2ba-787f0fd6f3d5' WHERE full_name = 'Fraser  Mentiplay' AND role IS NULL;   -- BFM Lead
UPDATE profiles SET role = '981e268b-470e-43ad-ab48-2d1d3eda5d30' WHERE full_name = 'Mohammed Ali Lafta' AND role IS NULL;  -- Mtce Manager
UPDATE profiles SET role = '2a0b011c-240d-4259-bc39-5adbb6fbebc3' WHERE full_name = 'Murtadha Emad' AND role IS NULL;       -- Mtce Mgr. Rotating
```

No code changes needed — purely a data fix.

