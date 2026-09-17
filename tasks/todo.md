# Tasks

## Groups — add members after creation + split edge cases (2026-09-17)

- [x] `firestore.rules`: group `update` allows only (a) add members: superset, ≤20, members/memberIds same size, no duplicate ids, or (b) leave: old − self; `name`/`createdBy` immutable on update. Notifications: `group_added` creatable by a group member for another member (not self)
- [x] `validation.js`: `NotificationSchema` → discriminated union (`split_added` | `group_added`); `GroupSchema` rejects duplicate member ids; `validateGroupMember`; `GROUP_MEMBER_LIMIT`
- [x] `firestore.js`: `addMemberToGroup` as `runTransaction` (not found / already member / cap 20 → `GROUP_ERRORS`), rate-limited + validated, returns fresh members
- [x] `GroupDetail.jsx`: "Add member" toggles inline `UserSearch`; roster updates in place; known errors shown verbatim; fire-and-forget `group_added` notification (in-app only)
- [x] `Groups.jsx`: Activity renders `group_added` ("X added you to Group") and opens the group
- [x] `SplitScreen.jsx`: total normalised (Number, >0, 2dp) else "Missing split data"; payer-not-a-member screen; shares clamped ≥0 and rounded to cents; 0.00 non-payers dropped at confirm (with note); "Split equally" button
- [x] Verify: `npm run build` ✅ · lint on touched files ✅ · emulator rules tests `tests/rules.test.mjs` via `npm run test:rules` (20) ✅ · schema/helper checks ✅
- [ ] User: `firebase deploy --only firestore:rules`, two-account manual check (add B from A's group page → B sees Activity entry → B opens group → B not in A's earlier split)

### Review
- New members are deliberately **not** back-filled into existing splits; the Members card says so.
- Anyone in the group can add (rules-level), matching the previous update rule's intent; only self-removal exists — no kick.
- The rules harness now lives in the repo (`tests/`, `firebase.json`, `@firebase/rules-unit-testing` devDependency). Note `test` (singular) in the root is a stray Java snippet and is gitignored.

## Groups & Splits — Round 3 (2026-09-13) — spec: docs/superpowers/specs/2026-09-13-groups-round3-design.md

- [x] `validation.js`: transaction `type` (expense|refund), `source` "split", `splitId`; refund may be negative and have no line items
- [x] `balances.js`: `computeBalances(splits, me)` + unit checks
- [x] `firestore.js`: `shares` map on split; payer expense on create; settle writes participant expense + payer refund (deterministic ids); `subscribeGroupSplits`/`subscribeUserSplits`; `leaveGroup`; `deleteGroup`; drop `getUsers`
- [x] `firestore.rules`: cross-user split transaction creates; leave = remove self only; group delete (creator); split delete (payer or group creator)
- [x] UI: GroupDetail balances + leave/delete; Groups overall + per-card net (live); SplitDetail note; UserSearch no preload; Scan/SplitScreen pass line items
- [x] Refund rendering: Expenses, Dashboard recent, TransactionDetails; exclude refunds from category charts (Dashboard, Analytics)
- [x] Verify: unit checks (10) ✅ · emulator rules tests (55) ✅ · `npm run build` ✅ · lint on touched files ✅
- [ ] User: `firebase deploy --only firestore:rules`, two-account manual run

## Groups & Splits — Round 2 fixes (2026-09-13)

- [x] Rules: payer may create `split_added` notifications for participants; splits readable by group members; `/users` owner-only; create validation for groups/splits
- [x] Zod: `GroupSchema`, `SplitSchema`, `NotificationSchema` + `validateGroup/Split/Notification`
- [x] `firestore.js`: rate-limit + validate `createGroup`/`createSplit`/`settleSplit`; search reads `userProfiles`; `markAllNotificationsRead`
- [x] `SplitScreen.jsx`: remainder → payer; payer locked as participant; notifications fire-and-forget after save
- [x] `Scan.jsx`: `groupId` from navigation state; group banner + "Continue to Split"
- [x] `GroupDetail.jsx`: independent loads; payer + total on split cards; "not included"
- [x] `Groups.jsx`: Activity (unread notifications) card with mark-read
- [x] `Layout.jsx`: badge re-counts on route change + mark-read event; nav active on sub-routes
- [x] `UserSearch.jsx`: hide self, debounce, drop empty profiles
- [x] Verify: `npm run build` ✅ · schema/share checks ✅ · 31 emulator rules tests ✅
- [ ] Deploy rules: `firebase deploy --only firestore:rules`
- [ ] Manual E2E with two Google accounts (see plan "Verification")

## Review

Bugs were all at the boundary between client writes and security rules, or between navigation state and page init — none were visible from a single file. Rules are now covered by an emulator test harness (kept outside the repo in the job temp dir; worth adding to the repo as `tests/rules.test.mjs` if this area keeps changing).

## Backlog (out of scope this round)

- [x] Add member to existing group (`addMemberToGroup` exists, no UI) — done 2026-09-17
- [ ] `/split/:shareToken` public page (token is generated and stored)
- [ ] Pre-existing lint errors across Dashboard/Analytics/Scan (24 errors, not from this round)
