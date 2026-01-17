# Plan: Connect Reviewer Pending Items Overlay with Real Data

## Objective
When clicking on a reviewer with outstanding actions (e.g., Christian Johnsen with 3 pending tasks), open an overlay showing:
1. The reviewer's name and role
2. A list of all PSSR checklist items pending their approval
3. Each item should be clickable to see full details in a modal

## Current State
- `ApproverPendingItemsOverlay` component already exists and is rendered
- Click handling to open the overlay already exists in `handleApproverClick`
- However, `pendingItemsByApprover` prop is not being passed (defaults to `{}`)
- `onPendingItemClick` is not connected to open the detail modal

## Files to Modify

### 1. `src/components/PSSRDashboard.tsx`

**Add state for item detail modal:**
```tsx
const [selectedPendingItem, setSelectedPendingItem] = useState<CategoryItem | null>(null);
const [isPendingItemModalOpen, setIsPendingItemModalOpen] = useState(false);
```

**Create pending items data structure:**
Build a `pendingItemsByApprover` mapping based on which reviewer is responsible for which items. For now, we'll use mock data that maps to the reviewers defined in `pssrData.reviewers`.

```tsx
// Create pending items mapping for each reviewer/approver
const pendingItemsByApprover: Record<string, PendingItem[]> = {
  // Christian Johnsen (adf6a6f1-...) has 3 pending items
  'adf6a6f1-fdf2-4aaf-b8ec-ab8b1fd0503c': [
    {
      id: 'item-1',
      uniqueId: 'PS-001',
      category: 'Process Safety',
      description: 'Verify pressure relief valves are correctly sized and tested',
      status: 'pending',
      topic: 'Relief Systems'
    },
    {
      id: 'item-2',
      uniqueId: 'PS-003',
      category: 'Process Safety',
      description: 'Confirm process alarms are configured per P&IDs',
      status: 'in_progress',
      topic: 'Alarm Management'
    },
    {
      id: 'item-3',
      uniqueId: 'TI-012',
      category: 'Technical Integrity',
      description: 'Review corrosion monitoring program implementation',
      status: 'pending',
      topic: 'Corrosion'
    }
  ],
  // Lyle Koch has 2 pending items
  '7d5a90f1-2771-4754-93eb-4499592bf638': [
    {
      id: 'item-4',
      uniqueId: 'DOC-005',
      category: 'Documentation',
      description: 'Approve operational procedures for startup sequence',
      status: 'pending'
    },
    {
      id: 'item-5',
      uniqueId: 'ORG-002',
      category: 'Organization',
      description: 'Confirm training records are complete for all operators',
      status: 'pending'
    }
  ],
  // ... other approvers
};
```

**Add handler for pending item click:**
```tsx
const handlePendingItemClick = (itemId: string) => {
  // Find the item across all pending items
  const allItems = Object.values(pendingItemsByApprover).flat();
  const item = allItems.find(i => i.id === itemId);
  if (item) {
    // Convert PendingItem to CategoryItem for the detail modal
    setSelectedPendingItem({
      id: item.id,
      unique_id: item.uniqueId || '',
      question: item.description,
      response: null,
      status: item.status,
      // ... other fields
    });
    setIsPendingItemModalOpen(true);
  }
};
```

**Update PSSRReviewersApprovalsWidget props:**
```tsx
<PSSRReviewersApprovalsWidget
  reviewers={pssrData.reviewers}
  approvers={pssrData.approvers}
  sofApprovers={pssrData.sofApprovers}
  onSendReminder={(personId) => console.log('Send reminder to:', personId)}
  onPersonClick={(personId) => console.log('Person clicked:', personId)}
  pssrId={pssrId}
  pssrReason={pssrData.reason}
  plantName={pssrData.asset}
  facilityName={pssrData.asset}
  projectName={pssrData.projectName}
  pendingItemsByApprover={pendingItemsByApprover}  // NEW
  onPendingItemClick={handlePendingItemClick}       // NEW
/>
```

**Add PSSRItemDetailModal for viewing item details:**
```tsx
<PSSRItemDetailModal
  open={isPendingItemModalOpen}
  onOpenChange={setIsPendingItemModalOpen}
  item={selectedPendingItem}
  pssrId={pssrId || ''}
/>
```

### 2. Add Imports to PSSRDashboard.tsx

```tsx
import { PSSRItemDetailModal } from '@/components/pssr/PSSRItemDetailModal';
import { PendingItem } from '@/components/widgets/ApproverPendingItemsOverlay';
import { CategoryItem } from '@/hooks/usePSSRCategoryProgress';
```

## Implementation Flow

```
User clicks on Christian Johnsen (3 pending)
    |
    v
handleApproverClick() is called
    |
    v
setSelectedApprover(person) + setIsApproverOverlayOpen(true)
    |
    v
ApproverPendingItemsOverlay opens with:
  - Christian Johnsen's name and role
  - 3 pending items from pendingItemsByApprover[personId]
    |
    v
User clicks on a specific item (e.g., PS-001)
    |
    v
onPendingItemClick(itemId) is called
    |
    v
handlePendingItemClick finds the item and opens PSSRItemDetailModal
    |
    v
User sees full item details (question, status, attachments, etc.)
```

## Expected Result
1. Clicking on Christian Johnsen (or any reviewer with pending tasks) opens the overlay
2. Overlay shows:
   - Avatar, name ("Christian Johnsen"), role ("TA2 Process - P&E")
   - Badge showing "3 pending items"
   - List of items grouped by category (Process Safety, Technical Integrity, etc.)
3. Each item shows unique ID, description, status badge
4. Clicking an item opens the full detail modal with complete information
5. "Send Reminder" button available to notify the reviewer

## Future Enhancement (Optional)
Instead of mock data, we could:
1. Create a database table `pssr_item_assignments` linking items to reviewers
2. Query real pending items for each reviewer from the database
3. Filter based on the reviewer's technical authority role (e.g., Process items for Process TA2)
