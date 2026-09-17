# Groups Round 3 — Balances, Budget Integration, Leave/Delete, Search

Date: 2026-09-13 · Status: awaiting approval

## Goals

1. Show each member how much they **owe** and are **owed**, live, per group and overall.
2. Splits flow into the personal ledger and budget:
   - Payer splits a bill → the **full bill** is an expense in the payer's transactions.
   - A participant's share is settled → the participant gets an **expense** for their share; the payer gets a **refund** for the same amount (budget "Remaining" goes back up). Both appear in Transactions.
3. Any member can leave a group; the creator can delete it (with its splits).
4. User search shows nothing until the user types.

Already true, no change needed: any member can add a split (whoever adds it is the payer).

## Data model changes

### `splits/{id}` — add `shares` map
```
shares: { [userId]: amount }      // mirrors participants[].amount
```
Needed so security rules can look up a participant's share by uid (rules can't search arrays of maps).

### `users/{uid}/transactions/{id}` — new fields
```
type:    "expense" | "refund"     // default "expense"; refund has negative `total`
source:  ... | "split"            // existing enum gains "split"
splitId: string                   // present on split-related transactions
```
Deterministic document IDs make every split-related write idempotent (a retry hits "already exists" and is treated as success):

| Event | Ledger | Doc id | type | total |
|---|---|---|---|---|
| Payer creates split S | payer | `split-{S}` | expense | +totalAmount |
| Participant P settled | P | `split-{S}-{P}` | expense | +shares[P] |
| Participant P settled | payer | `split-{S}-{P}` | refund | −shares[P] |

Either the participant (settling themselves) or the payer (marking them settled) triggers the settle, so **both** ledgers get one cross-user write. Rules allow exactly these writes and nothing else (see below).

Line items: split transactions carry one synthetic line item `{ name: merchant, price, quantity: 1, totalPrice, category: "Other" }` (the scan path passes the real receipt line items through instead). Refund transactions carry no line items.

## Balance math — `src/lib/balances.js` (pure, unit-tested)

```
computeBalances(splits, me) → {
  youOwe,   // Σ my pending share on splits where I'm not payer
  owedToYou,// Σ others' pending shares on splits where I'm payer
  net,      // owedToYou − youOwe
  byMember: { [uid]: { displayName, amount } }  // +ve they owe me, −ve I owe them
}
```
Settled shares contribute nothing. Used by GroupDetail (per group) and Groups (per card + overall).

## Live updates

`subscribeGroupSplits(groupId, cb)` (`onSnapshot`) replaces `getGroupSplits` in GroupDetail. Groups page subscribes to `where("groupId","in", myGroupIds)` (chunked by 30) so cards update when anyone adds or settles. Subscriptions are torn down on unmount.

## Aggregation changes (existing pages)

All monthly/yearly totals already `Σ parseFloat(t.total)`, so a negative refund **automatically** raises "Remaining Budget" and lowers "Total Expenses". Only category breakdowns must skip refunds:
- `Dashboard.jsx` categoryTotals, `Analytics.jsx` computeCategories: `if (t.type === "refund") continue`.
- `Expenses.jsx`, `Dashboard.jsx` recent list, `TransactionDetails.jsx`: render refunds as `+ €x.xx` in green and label "Refund · split".

## Security rules

```
users/{userId}/transactions/{txId}
  read, update, delete: owner
  create: owner
    OR (cross-user split write) signedIn()
      && request.resource.data.source == 'split'
      && txId == 'split-' + splitId + '-' + counterparty
      && (
        // refund into payer's ledger, written by the participant who settled
        ( type == 'refund'  && split.payerId == userId
          && request.auth.uid in split.participantIds
          && total == -split.shares[request.auth.uid] && txId ends with request.auth.uid )
        ||
        // expense into participant's ledger, written by the payer
        ( type == 'expense' && split.payerId == request.auth.uid
          && userId in split.participantIds
          && total == split.shares[userId] && txId ends with userId )
      )

groups/{id}
  delete: createdBy == uid
  update: member (leave = member removes only themselves — enforced: memberIds after == memberIds before minus uid)

splits/{id}
  delete: payerId == uid  OR  group(createdBy) == uid        // for group delete cascade
```

## Service layer (`firestore.js`)

- `createSplit` → also writes `shares` and the payer's `split-{S}` expense (best-effort after the split doc, idempotent).
- `settleSplit(splitId, targetUserId)` → update split status → write participant expense → write payer refund (each idempotent; "already-exists" swallowed).
- `subscribeGroupSplits`, `subscribeUserSplits`.
- `leaveGroup(groupId, userId)`, `deleteGroup(groupId)` (batch: group + its splits; caller must be creator).
- Remove `getUsers`.

## UI

- **GroupDetail**: balance strip ("You owe €X · You're owed €Y") + per-member lines; "Leave group" (non-creator) / "Delete group" (creator, confirm; warns if unsettled splits exist).
- **Groups**: overall balance card at top; each group card shows net (`+€12.00` green / `−€3.50` red).
- **SplitDetail**: after settling, small note "Added to your transactions".
- **UserSearch**: no default list; results only after 2+ chars.

## Out of scope

Editing/undoing a settlement, partial payments, share links, add-member UI, editing a split after creation.

## Verification

- Unit: `computeBalances` cases; Zod refund/expense cases.
- Emulator rules: +12 cases (cross-user tx writes allowed exactly as specified, wrong amount / wrong id / non-participant denied; leave can only remove self; delete creator-only; split delete payer-or-creator).
- Manual two-account run: create split → payer's Transactions shows the bill; participant settles → both ledgers updated, budget "Remaining" moves by the share on both sides; balances update live on the other account without refresh.
