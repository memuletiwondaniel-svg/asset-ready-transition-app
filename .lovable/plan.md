

# Remove Remaining Hardcoded Personal Names

## Findings

Line 209 in `SOFQualificationsPanel.tsx` has `approvedBy: 'Ewan McConnachie'` and line 216 has `actionOwner: 'Omar Al-Shammari'`. Beyond that, **8 other non-migration files** still contain hardcoded personal names in mock data:

| File | Names Found |
|------|-------------|
| `SOFQualificationsPanel.tsx` | Ewan McConnachie (L209), Omar Al-Shammari (L216) |
| `SOFProjectOverviewPanel.tsx` | Mousa Al-Tarazi, Azamat Kenzhin, Ahmed Salah (L39-41) |
| `PSSRActivityFeed.tsx` | Omar Al-Basri (L67), Ahmed Al-Rashid (L79) |
| `PSSRDashboard.tsx` | Ahmed Al-Rashid (L190) |
| `PSSRDetails.tsx` | Ahmed Al-Rashid (L31) |
| `EnhancedCreateUserModal.tsx` | Daniel Memuletiwon, Ahmed Al-Rashid, Sarah Mitchell (L212-214) |
| `ORAMaintenanceReadinessTab.tsx` | Fatima Al-Rashid (L97, L107) |
| `ORATrainingItemDetails.tsx` | Ahmed Al-Rashid (L109) |

Note: "OMAR" references in `ai-chat/index.ts` are the acronym for "Operating Modes Analysis Review" — not a person. No action needed there.

## Changes

Replace all hardcoded personal names with role-based labels following the same pattern already applied to `SOFCommentsPanel.tsx`:

| Original Name | Replacement |
|---------------|-------------|
| Ewan McConnachie | ORA Lead |
| Omar Al-Shammari | Training Coordinator |
| Mousa Al-Tarazi | Project Hub Lead |
| Azamat Kenzhin | Snr. ORA Engr. |
| Ahmed Salah | CSU Lead |
| Omar Al-Basri | PSSR Reviewer |
| Ahmed Al-Rashid | Plant Director |
| Daniel Memuletiwon | ORA Lead |
| Sarah Mitchell | TA2 Engineer |
| Fatima Al-Rashid | Materials Lead |

Each file's mock data `name`/`initiator`/`approvedBy`/`actionOwner` fields get replaced with the role title. Where a role is already present alongside the name (e.g., `'Ahmed Al-Rashid, TA2 - Rotating - Asset'`), the name portion is removed and only the role remains.

## Files

| File | Action |
|------|--------|
| `src/components/sof/SOFQualificationsPanel.tsx` | Replace 2 names |
| `src/components/sof/SOFProjectOverviewPanel.tsx` | Replace 3 names |
| `src/components/PSSRActivityFeed.tsx` | Replace 2 names |
| `src/components/PSSRDashboard.tsx` | Replace 1 name |
| `src/components/PSSRDetails.tsx` | Replace 1 name |
| `src/components/user-management/EnhancedCreateUserModal.tsx` | Replace 3 names |
| `src/components/ora/ORAMaintenanceReadinessTab.tsx` | Replace 2 names |
| `src/components/ora/ORATrainingItemDetails.tsx` | Replace 1 name |

