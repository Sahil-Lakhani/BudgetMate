# Bill Splitting & Groups — Feature Design

**Date:** 2026-04-27  
**Status:** Approved  
**Scope:** Base feature — Groups page, group management, split creation, split screen with equal/custom amounts

---

## Overview

A dedicated **Groups / Splits** section is added to BudgetMate. Users create named groups, add friends (who must have BudgetMate accounts), then add splits to those groups. A split is created by scanning a receipt or adding a transaction manually. After the amount is captured, the payer assigns each group member a share — equal by default, fully editable — and confirms. All participants see the split in their own account with a pending status.

---

## User Flows

### 1. Create a Group
1. User navigates to the new **Groups** page (new nav item)
2. Taps **"New Group"**
3. Enters a group name (e.g. "Roommates", "Bali Trip")
4. Searches for members by **email** or **Google display name** (min 3 chars to trigger search)
5. Adds one or more members from search results
6. Taps **"Create Group"** → group saved to Firestore

### 2. Add a Split to a Group
1. User opens a group
2. Taps **"Add Split"**
3. Chooses:
   - **Scan Receipt** → opens existing scan flow → extracted data pre-fills split
   - **Add Manually** → simple form: merchant name + total amount + date
4. After amount is captured, navigates to the **Split Screen**

### 3. Split Screen
1. All group members are listed, all selected and pre-filled with equal share by default
   - Rounding remainder assigned to payer's row
2. Payer can:
   - Toggle individual members off (their share redistributes equally among remaining)
   - Edit any amount field directly (custom split)
3. Running total shown at bottom: `€9.50 / €12.00 assigned`
4. **Confirm Split** button is disabled until all assigned amounts sum exactly to the total
5. On confirm:
   - Split document saved to `splits/{splitId}`
   - In-app notification created for each participant
   - Shareable link generated (`/split/{splitId}`)
   - User returned to the group detail page

### 4. Viewing & Settling Splits
1. Group detail page lists all splits, most recent first
2. Each split shows: merchant, date, total, payer name, user's own share, status (pending / settled)
3. A participant can tap **"Mark as Settled"** on their own share
4. Payer can also mark any participant's share as settled on their behalf
5. When all shares are settled, the split shows as fully closed

---

## Navigation

A new **"Groups"** entry is added to the sidebar nav (between Scan and Analytics):

```
Dashboard
Expenses
Scan
Groups          ← new
Analytics
Settings
```

### New Routes

```
/groups                            → Groups list page
/groups/new                        → Create group form
/groups/:groupId                   → Group detail (members + splits list)
/groups/:groupId/split/new         → Add split flow (scan or manual)
/groups/:groupId/split/:splitId    → Split detail / settle view
/split/:shareToken                 → Public share link entry point (auth-gated, resolves to split detail)
```

---

## Data Model

### Extend `users/{userId}` document
Add fields on every login (update `saveUser` in `firestore.js`):

```js
{
  email: string,
  displayName: string,   // ← from Google account
  photoURL: string,      // ← from Google account
  lastUpdated: ISO string
}
```

These fields make users searchable by display name and email.

### `groups/{groupId}`

```js
{
  name: string,                  // "Roommates"
  createdBy: userId,
  memberIds: [string],           // flat array of userIds — used for Firestore queries + security rules
  members: [
    {
      userId: string,
      displayName: string,
      email: string,
      photoURL: string
    }
  ],
  createdAt: ISO string
}
```

`memberIds` and `members` are always kept in sync. `memberIds` exists solely for efficient `array-contains` queries and security rule checks. Members array always includes the creator. Max 20 members per group.

### `splits/{splitId}`

```js
{
  groupId: string,
  payerId: string,               // user who added the split
  merchant: string,
  date: string,                  // YYYY-MM-DD
  totalAmount: number,
  participantIds: [string],      // flat array of userIds — used for security rules + queries
  participants: [
    {
      userId: string,
      displayName: string,
      photoURL: string,
      amount: number,            // their share
      status: "pending" | "settled"
    }
  ],
  shareToken: string,            // random 12-char token — used as URL identifier
  createdAt: ISO string
}
```

### `users/{userId}/notifications/{notifId}` *(new subcollection)*

```js
{
  type: "split_added",
  splitId: string,
  groupId: string,
  groupName: string,
  payerName: string,
  merchant: string,
  amount: number,               // this user's share
  read: boolean,
  createdAt: ISO string
}
```

---

## User Search

**Trigger:** minimum 3 characters typed in the member search field.

**By email** (exact match):
```
users where email == inputValue
```

**By display name** (prefix match):
```
users where displayName >= inputValue
     and displayName <= inputValue + ''
```

Both queries run in parallel. Results are merged, deduped by `userId`, and the current user is filtered out. Already-added members are shown as disabled/greyed in results.

**Limitation:** Firestore prefix search is case-sensitive. Display name is stored exactly as Google returns it. Search is case-sensitive for names (acceptable for v1).

---

## Split Validation Rules

| Rule | Behaviour |
|------|-----------|
| All members selected by default | Equal share pre-filled |
| Rounding remainder | Assigned to payer's row |
| Member toggled off | Their share redistributed equally among active members |
| Any amount edited manually | Other fields are NOT auto-adjusted (user owns the values) |
| Sum < total | Confirm button disabled, remainder shown in red |
| Sum > total | Confirm button disabled, overage shown in red |
| Sum == total | Confirm button enabled |
| Only 1 participant left | Cannot deselect last person |

---

## Components to Build

| Component | Location | Purpose |
|-----------|----------|---------|
| `GroupsList` | `src/pages/Groups.jsx` | Lists all groups the user is in |
| `GroupDetail` | `src/pages/GroupDetail.jsx` | Members list + splits list for one group |
| `CreateGroup` | `src/pages/CreateGroup.jsx` | Group name input + member search/add |
| `AddSplit` | `src/pages/AddSplit.jsx` | Choose scan or manual entry |
| `SplitScreen` | `src/pages/SplitScreen.jsx` | Participant list + amount fields + validation |
| `SplitDetail` | `src/pages/SplitDetail.jsx` | View a split, mark shares settled |
| `UserSearch` | `src/components/UserSearch.jsx` | Reusable search-by-email/name component |
| `SplitRow` | `src/components/SplitRow.jsx` | Single participant row with avatar + editable amount |
| `NotificationBadge` | `src/components/Layout.jsx` | Badge count on Groups nav item |

---

## Firestore Service Functions (new in `firestore.js`)

```
createGroup(userId, { name, members })
getUserGroups(userId)                   // groups where userId is in members[]
getGroup(groupId)
addMemberToGroup(groupId, member)

createSplit(groupId, payerId, splitData)
getGroupSplits(groupId)
getSplit(splitId)
settleSplit(splitId, userId)            // marks one participant as settled

searchUsersByEmail(email)
searchUsersByName(name)

createNotification(userId, notifData)
getUserNotifications(userId)
markNotificationRead(userId, notifId)
```

---

## Firestore Security Rules (additions needed)

```
// Groups: readable by members only (via flat memberIds array), writable by creator
match /groups/{groupId} {
  allow read: if request.auth.uid in resource.data.memberIds;
  allow create: if request.auth != null;
  allow update: if request.auth.uid in resource.data.memberIds;
}

// Splits: readable/writable by participants only (via flat participantIds array)
match /splits/{splitId} {
  allow read: if request.auth.uid in resource.data.participantIds;
  allow create: if request.auth != null;
  allow update: if request.auth.uid in resource.data.participantIds;
}

// Notifications: only the owner can read/write
match /users/{userId}/notifications/{notifId} {
  allow read, write: if request.auth.uid == userId;
}

// Users: readable by anyone authenticated (for search), writable by self only
match /users/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth.uid == userId;
}
```

---

## Share Link Flow

- On split creation, a `shareToken` (random 12-char alphanumeric) is generated and stored on the split document
- The shareable URL is `https://budgetmate.vercel.app/split/{shareToken}`
- Visiting the link while logged in redirects to `/groups/{groupId}/split/{splitId}`
- Visiting while logged out redirects to `/login?redirect=/split/{shareToken}`
- If the logged-in user is not a participant in the split, they see a "You are not part of this split" message

---

## Out of Scope for v1

- Push / email notifications (in-app only)
- Editing a split after creation
- Deleting a group (only leave group)
- In-app payments / payment integration
- Running balances across multiple splits (net "you owe X total" across all splits with a person)
- Group chat or comments on a split
