# Groups & Splits — Implementation Tracker

> Last updated: 2026-04-27  
> Full plan: `docs/superpowers/plans/2026-04-27-groups-splits.md`

---

## Progress Overview

| Phase | Status | Tasks |
|-------|--------|-------|
| Phase 1 — Data Layer | ✅ Done | T1 → T2 → T3 → T4 |
| Phase 2 — Routing & Nav | ✅ Done | T5, T6 |
| Phase 3 — Components | ✅ Done | T7, T8 |
| Phase 4 — Pages | ✅ Done | T9, T10, T11, T12, T13 |
| Phase 5 — Complex Page | ✅ Done | T14 (Security Rules), T15 (Scan mod), T16 |

---

## Task Checklist

### Phase 1 — Data Layer (sequential)

- [x] **T1** `src/lib/firestore.js` — Extend `saveUser` (add `displayName`, `photoURL`), add Firestore imports (`where`, `limit`, `onSnapshot`)
- [x] **T2** `src/lib/firestore.js` — Add group fns: `createGroup`, `getUserGroups`, `getGroup`, `addMemberToGroup`
- [x] **T3** `src/lib/firestore.js` — Add split fns: `createSplit`, `getGroupSplits`, `getSplit`, `settleSplit`
- [x] **T4** `src/lib/firestore.js` — Add user search + notification fns: `searchUsersByEmail`, `searchUsersByName`, `createNotification`, `getUserNotifications`, `markNotificationRead`

### Phase 2 — Routing & Navigation (parallel)

- [x] **T5** `src/App.jsx` — Register 6 new routes (groups, create, detail, addSplit, splitScreen, splitDetail)
- [x] **T6** `src/components/Layout.jsx` — Add Groups nav item with `Users` icon + unread notification badge

### Phase 3 — Reusable Components (parallel)

- [x] **T7** `src/components/UserSearch.jsx` — Create: debounced search by email/name, dedup, add button
- [x] **T8** `src/components/SplitRow.jsx` — Create: avatar + editable amount input + toggle checkbox

### Phase 4 — Pages (parallel within round)

- [x] **T9** `src/pages/Groups.jsx` — Create: list groups, empty state, navigate to detail/new
- [x] **T10** `src/pages/CreateGroup.jsx` — Create: name input + UserSearch + member list + create
- [x] **T11** `src/pages/AddSplit.jsx` — Create: scan or manual choice; manual form with merchant/amount/date
- [x] **T12** `src/pages/GroupDetail.jsx` — Create: members list + splits list + Add Split button
- [x] **T13** `src/pages/SplitDetail.jsx` — Create: participants + amounts + settle button

### Phase 5 — Final (parallel)

- [x] **T14** `firestore.rules` — Add security rules for groups, splits, notifications, users; deploy
- [x] **T15** `src/pages/Scan.jsx` — Modify: read `groupId` from location.state, route to SplitScreen instead of saving
- [x] **T16** `src/pages/SplitScreen.jsx` — Create: equal distribution, toggle + redistribute, sum validation, confirm + notify

---

## Completed Tasks

| Task | File | Notes |
|------|------|-------|
| T1 | `src/lib/firestore.js` | Added `where`, `limit`, `onSnapshot` imports; `saveUser` now writes `displayName` + `photoURL` |
| T2 | `src/lib/firestore.js` | `createGroup`, `getUserGroups`, `getGroup`, `addMemberToGroup` — all with try/catch |
| T3 | `src/lib/firestore.js` | `createSplit` (12-char shareToken), `getGroupSplits`, `getSplit`, `settleSplit` |
| T4 | `src/lib/firestore.js` | `searchUsersByName` uses U+FFFF upper bound for prefix scan; notification CRUD |
| T5 | `src/App.jsx` | 6 imports + 6 routes under protected Layout |
| T6 | `src/components/Layout.jsx` | Groups nav item with red notification badge (9+ capped) |
| T7 | `src/components/UserSearch.jsx` | Debounced parallel email+name search, dedup by userId, add/added toggle |
| T8 | `src/components/SplitRow.jsx` | Toggle checkbox, currency-prefixed input, dims to opacity-40 when inactive |
| T9 | `src/pages/Groups.jsx` | Group list with avatar stack, empty state CTA |
| T10 | `src/pages/CreateGroup.jsx` | Name + UserSearch + member list + createGroup call |
| T11 | `src/pages/AddSplit.jsx` | Scan vs Manual choice; manual form navigates to SplitScreen |
| T12 | `src/pages/GroupDetail.jsx` | Parallel fetch group+splits; member list; splits as clickable cards |
| T13 | `src/pages/SplitDetail.jsx` | Participant shares; settle button for self or payer |
| T14 | `firestore.rules` | Full rules: groups, splits, notifications, users (readable for search) |
| T15 | `src/pages/Scan.jsx` | Reads `groupId` from location.state; routes to SplitScreen on match |
| T16 | `src/pages/SplitScreen.jsx` | `distributeEvenly`, toggle+redistribute, float-safe sum validation, confirm+notify |

---

## Notes & Issues

| Date | Note |
|------|------|
| 2026-04-27 | Plan created, ready to implement |
| 2026-04-27 | T2 — rewrote group fns to add missing try/catch pattern |
| 2026-04-27 | T4 — `searchUsersByName` upper bound fixed from `""` to `"￿"` (U+FFFF) |
| 2026-04-27 | T6 — badge JSX added in resume session after context interruption |
| 2026-04-27 | All 16 tasks completed and committed to main |

---

## Parallelisation Guide

```
Round 1 (sequential):   T1 → T2 → T3 → T4   ✅
Round 2 (parallel):     T5 + T6 + T7 + T8 + T13 + T14   ✅
Round 3 (parallel):     T9 + T10 + T11   ✅
Round 4 (parallel):     T12 + T15   ✅
Round 5 (last):         T16   ✅
```

---

## Round 2 — Fixes (2026-09-13)

End-to-end review found three flow-breaking bugs plus spec gaps. All fixed; rules verified with 31 emulator tests (two fake users + outsider).

| # | Fix | Files |
|---|-----|-------|
| 1 | Notification writes to other users were rejected by rules → every "Confirm Split" errored and retries duplicated splits. Rules now let the split's **payer** create `split_added` notifications for that split's participants only (field allow-list, `read == false`). Client fan-out is `Promise.allSettled` after save. | `firestore.rules`, `SplitScreen.jsx` |
| 2 | Scan → split never carried `groupId` (only read when a `file` was in state). Now initialised from `location.state.groupId`; review step shows a group banner and "Continue to Split". | `Scan.jsx` |
| 3 | Group page showed "Group not found" for any member excluded from one split (list query hit `participantIds`-only read rule). Splits are now readable by any member of the split's group (`get()` on the group). Group and splits load independently. | `firestore.rules`, `GroupDetail.jsx` |
| 4 | User search now reads `userProfiles`; `/users/{uid}` is owner-only again. Current user hidden from results; 300 ms debounce. | `firestore.js`, `UserSearch.jsx` |
| 5 | Notification inbox ("Activity" card) on `/groups`; click marks read and opens the split; "Mark all read". Nav badge re-counts on route change and on mark-read (window event); Groups nav highlights on sub-routes. | `Groups.jsx`, `Layout.jsx`, `firestore.js` |
| 6 | Rounding remainder goes to the payer (spec) instead of `members[0]`; payer can't be toggled off a split. | `SplitScreen.jsx` |
| 7 | Zod schemas `GroupSchema`, `SplitSchema` (shares must sum to total, payer must participate), `NotificationSchema`; rate-limit on `createGroup` / `createSplit` / `settleSplit`. Rules also validate group name length, ≤20 members, payer == creator, total > 0. | `validation.js`, `firestore.js`, `firestore.rules` |

Still out of scope: add-member-to-existing-group UI (`addMemberToGroup` unused), `/split/:shareToken` page, real-time updates.

**Deploy:** `firebase deploy --only firestore:rules` is required for fixes 1, 3, 4 to take effect.

---

## Round 3 — Balances, budget integration, leave/delete (2026-09-13)

Spec: `docs/superpowers/specs/2026-09-13-groups-round3-design.md`. Rules verified with 55 emulator tests.

| Area | Change |
|---|---|
| Balances | `src/lib/balances.js` `computeBalances()`; GroupDetail shows you-owe / you're-owed + per-member lines; Groups shows overall + per-card net. Both live via `onSnapshot` (`subscribeGroupSplits`, `subscribeSplitsForGroups`). |
| Ledger | Payer's full bill → `users/{payer}/transactions/split-{S}` (expense). Settling participant P → `split-{S}-{P}` expense in P's ledger **and** `split-{S}-{P}` refund (negative total) in payer's ledger. Fixed ids = idempotent. Split doc gains `shares: {uid: amount}`; payer's own share is `settled` at creation. |
| Transactions | `type: expense|refund`, `source: split`, `splitId`. Refunds: negative `total`, no line items, rendered `+ €x` green, excluded from category charts (Dashboard, Analytics). Existing totals sum them naturally, so "Remaining Budget" rises on refund. |
| Rules | Cross-user `create` on `users/{uid}/transactions/{id}` only for the two split-settlement docs (fixed id, amount must equal `shares[uid]`, payer/participant only) + `get` of that one doc for retry checks. Group `update`: member may remove only themselves; `delete`: creator. Split `delete`: payer or group creator. |
| UI | Leave group (non-creator) / Delete group + splits (creator, confirm, unsettled warning). UserSearch shows nothing until 2+ chars typed; `getUsers` removed. SplitDetail shows a note after settling. |

Backlog: undo settlement, partial payments, add-member UI, share links.
