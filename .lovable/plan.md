

# UX Feature Parity Audit: Replicate Recent Improvements Across All Task Types

## Current State — Feature Matrix

| Feature | Simple Task | Ad-Hoc Review | P2A Author | P2A Reviewer | ORA Author | ORA Reviewer | ORA Activity | VCR Delivery |
|---|---|---|---|---|---|---|---|---|
| **Collaborative Document Editor** | Yes | Yes (shared) | **No** | **No** | **No** | **No** | **No** | **No** |
| **Task Attachments** | Yes | Yes (shared) | **No** | **No** | **No** | **No** | **No** | **No** |
| **Task Reviewers Section** | Yes | N/A | **No** | N/A | **No** | N/A | Yes | **No** |
| **TaskActivityFeed (comments)** | Yes | Yes (source) | No (has P2AActivityFeed) | No (has P2AActivityFeed) | No (has ApprovalActivityFeed) | No (has ApprovalActivityFeed) | Custom feed | **No** |
| **Rejection Banner** | N/A | N/A | Yes | Yes | Yes | Yes | N/A | **No** |
| **Progress Tiers** | N/A | N/A | Yes (86/95/100) | N/A | Yes (83/95/100) | N/A | N/A | **No** |
| **Kanban Drag Guards** | N/A | N/A | Yes | N/A | Yes | N/A | N/A | **No** |

## Gaps to Fix

### 1. Add Collaborative Document Editor to P2A, ORA, and VCR author tasks
These are long-running authoring tasks where users should be able to maintain working notes, meeting minutes, or supporting documentation alongside the wizard workflow.

**In `TaskDetailSheet.tsx`**: After the wizard CTA and activity feed sections for `isP2aTask`, `isOraTask`, and `isVcrDeliveryPlanTask`, add a `CollaborativeDocumentEditor` component. Mark as read-only when `isCompleted`.

### 2. Add Task Attachments to P2A, ORA, and VCR author tasks
Users creating plans need to attach reference documents (specifications, drawings, prior reports).

**In `TaskDetailSheet.tsx`**: Add `TaskAttachmentsSection` for `isP2aTask`, `isOraTask`, and `isVcrDeliveryPlanTask`.

### 3. Add Task Activity Feed (comments) to VCR tasks
VCR delivery plan tasks currently have no activity feed at all — no comments, no status change history.

**In `TaskDetailSheet.tsx`**: Add `TaskActivityFeed` for `isVcrDeliveryPlanTask`.

### 4. Add TaskReviewersSection to P2A and VCR author tasks
P2A and VCR task owners should be able to assign ad-hoc reviewers (outside of the formal approval workflow) for preliminary feedback.

**In `TaskDetailSheet.tsx`**: Add `TaskReviewersSection` for `isP2aTask` and `isVcrDeliveryPlanTask`.

### 5. Add Attachments to ORA Activity tasks
ORA activity tasks in `ORAActivityTaskSheet` have reviewers but no attachments or collaborative editing.

**In `ORAActivityTaskSheet.tsx`**: Add `TaskAttachmentsSection` after the reviewers section.

### 6. Add Collaborative Document Editor to ORA Activity tasks
**In `ORAActivityTaskSheet.tsx`**: Add `CollaborativeDocumentEditor` for working notes.

## Implementation Summary

### Files to Modify

| File | Changes |
|---|---|
| `src/components/tasks/TaskDetailSheet.tsx` | Add `CollaborativeDocumentEditor`, `TaskAttachmentsSection`, `TaskReviewersSection`, and `TaskActivityFeed` blocks for P2A author, ORA author, VCR delivery plan, P2A reviewer, and ORA reviewer task types |
| `src/components/tasks/ORAActivityTaskSheet.tsx` | Add `TaskAttachmentsSection` and `CollaborativeDocumentEditor` |

### Approach
- Reuse existing components (`CollaborativeDocumentEditor`, `TaskAttachmentsSection`, `TaskReviewersSection`, `TaskActivityFeed`) — no new components needed
- Place the new sections **after** the existing specialized content (wizard CTAs, approval feeds, rejection banners) using the same `Separator` + component pattern used by simple tasks
- All sections respect `isCompleted` / `isReadOnly` state
- No database changes required — the `task_documents`, `task_attachments`, `task_reviewers`, and `task_comments` tables already support any task via `task_id` foreign key

