# Groups & Bill Splitting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Groups / Splits section to BudgetMate where users can create groups, add BudgetMate friends, and split bills with equal or custom amounts.

**Architecture:** New top-level `/groups` route family with 6 pages and 2 reusable components. All group/split data lives in top-level Firestore collections (`groups/`, `splits/`) with flat `memberIds`/`participantIds` arrays for security rule queries. Existing `Scan.jsx` gains a `groupId` passthrough so scan output can feed directly into the SplitScreen.

**Tech Stack:** React 19, React Router v6, Firebase Firestore, Tailwind CSS v4, Lucide React icons, existing design system (paper/ink/news tokens, Playfair Display + Inter fonts).

---

## File Map

| Status | File | Action |
|--------|------|--------|
| [ ] | `src/lib/firestore.js` | Modify — extend saveUser + add 13 new service fns |
| [ ] | `src/App.jsx` | Modify — register 6 new routes |
| [ ] | `src/components/Layout.jsx` | Modify — add Groups nav item + notification badge |
| [ ] | `src/components/UserSearch.jsx` | Create — debounced search by email or display name |
| [ ] | `src/components/SplitRow.jsx` | Create — participant row: avatar + editable amount + toggle |
| [ ] | `src/pages/Groups.jsx` | Create — list all groups the user is in |
| [ ] | `src/pages/CreateGroup.jsx` | Create — group name input + UserSearch member picker |
| [ ] | `src/pages/GroupDetail.jsx` | Create — group members + splits list |
| [ ] | `src/pages/AddSplit.jsx` | Create — choose scan or manual entry |
| [ ] | `src/pages/SplitScreen.jsx` | Create — participant shares + validation + confirm |
| [ ] | `src/pages/SplitDetail.jsx` | Create — view split, mark settled |
| [ ] | `src/pages/Scan.jsx` | Modify — accept `groupId` from location.state |
| [ ] | `firestore.rules` | Modify — add group/split/notification security rules |

---

## Parallelisation Map

```
Round 1 (sequential — all touch firestore.js):
  Task 1 → Task 2 → Task 3 → Task 4

Round 2 (fully parallel — independent files):
  Task 5   App.jsx routes
  Task 6   Layout.jsx nav
  Task 7   UserSearch.jsx
  Task 8   SplitRow.jsx
  Task 13  SplitDetail.jsx
  Task 14  firestore.rules

Round 3 (parallel — depend only on firestore fns from Round 1):
  Task 9   Groups.jsx
  Task 10  CreateGroup.jsx  (needs UserSearch from Round 2)
  Task 11  AddSplit.jsx

Round 4 (parallel):
  Task 12  GroupDetail.jsx
  Task 15  Scan.jsx modification

Round 5 (last — most complex, needs SplitRow from Round 2):
  Task 16  SplitScreen.jsx
```

---

## Task 1 — Extend saveUser + Firestore imports

**Files:**
- Modify: `src/lib/firestore.js`

### What to change

Add these Firestore imports to the top of `firestore.js` (merge with the existing import line):

```js
import {
  db
} from "./firebase"
import {
  collection, getDocs, query, orderBy, addDoc, doc, setDoc,
  getDoc, deleteDoc, where, limit, onSnapshot
} from "firebase/firestore"
```

Replace the existing `saveUser` function body so it also writes `displayName` and `photoURL`:

```js
export const saveUser = async (user) => {
  if (!user) return

  try {
    const userRef = doc(db, "users", user.uid)
    await setDoc(userRef, {
      email: user.email,
      displayName: user.displayName || "",
      photoURL: user.photoURL || "",
      lastUpdated: new Date().toISOString()
    }, { merge: true })
  } catch (error) {
    console.error("Error saving user:", error)
    throw error
  }
}
```

- [ ] Open `src/lib/firestore.js`, add `where`, `limit`, `onSnapshot` to the firebase/firestore import.
- [ ] Replace `saveUser` body with the version above.
- [ ] Verify the file still imports `validateTransaction`, `validateUserSettings`, `checkRateLimit`.
- [ ] Commit: `git add src/lib/firestore.js && git commit -m "feat: extend saveUser to persist displayName and photoURL"`

---

## Task 2 — Group service functions

**Files:**
- Modify: `src/lib/firestore.js`

Append these four functions to the bottom of `firestore.js`:

```js
// ─── Groups ──────────────────────────────────────────────────────────────────

export const createGroup = async (userId, { name, members }) => {
  const memberIds = members.map((m) => m.userId)
  if (!memberIds.includes(userId)) memberIds.push(userId)

  const groupData = {
    name,
    createdBy: userId,
    memberIds,
    members,
    createdAt: new Date().toISOString()
  }

  const ref = await addDoc(collection(db, "groups"), groupData)
  return ref.id
}

export const getUserGroups = async (userId) => {
  if (!userId) return []
  const q = query(collection(db, "groups"), where("memberIds", "array-contains", userId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const getGroup = async (groupId) => {
  const snap = await getDoc(doc(db, "groups", groupId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export const addMemberToGroup = async (groupId, member) => {
  const groupRef = doc(db, "groups", groupId)
  const snap = await getDoc(groupRef)
  if (!snap.exists()) throw new Error("Group not found")

  const { members = [], memberIds = [] } = snap.data()
  if (memberIds.includes(member.userId)) return

  await setDoc(groupRef, {
    members: [...members, member],
    memberIds: [...memberIds, member.userId]
  }, { merge: true })
}
```

- [ ] Append the four group functions to `src/lib/firestore.js`.
- [ ] Commit: `git add src/lib/firestore.js && git commit -m "feat: add createGroup, getUserGroups, getGroup, addMemberToGroup"`

---

## Task 3 — Split service functions

**Files:**
- Modify: `src/lib/firestore.js`

Append these four functions:

```js
// ─── Splits ───────────────────────────────────────────────────────────────────

export const createSplit = async (groupId, payerId, { merchant, date, totalAmount, participants }) => {
  const participantIds = participants.map((p) => p.userId)
  const shareToken = Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8)

  const splitData = {
    groupId,
    payerId,
    merchant,
    date,
    totalAmount,
    participantIds,
    participants,
    shareToken,
    createdAt: new Date().toISOString()
  }

  const ref = await addDoc(collection(db, "splits"), splitData)
  return { splitId: ref.id, shareToken }
}

export const getGroupSplits = async (groupId) => {
  const q = query(collection(db, "splits"), where("groupId", "==", groupId))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export const getSplit = async (splitId) => {
  const snap = await getDoc(doc(db, "splits", splitId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export const settleSplit = async (splitId, userId) => {
  const splitRef = doc(db, "splits", splitId)
  const snap = await getDoc(splitRef)
  if (!snap.exists()) throw new Error("Split not found")

  const { participants } = snap.data()
  const updated = participants.map((p) =>
    p.userId === userId ? { ...p, status: "settled" } : p
  )

  await setDoc(splitRef, { participants: updated }, { merge: true })
}
```

- [ ] Append the four split functions to `src/lib/firestore.js`.
- [ ] Commit: `git add src/lib/firestore.js && git commit -m "feat: add createSplit, getGroupSplits, getSplit, settleSplit"`

---

## Task 4 — User search + notification functions

**Files:**
- Modify: `src/lib/firestore.js`

Append these five functions:

```js
// ─── User Search ─────────────────────────────────────────────────────────────

export const searchUsersByEmail = async (email) => {
  if (!email) return []
  const q = query(collection(db, "users"), where("email", "==", email), limit(5))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ userId: d.id, ...d.data() }))
}

export const searchUsersByName = async (name) => {
  if (!name) return []
  const q = query(
    collection(db, "users"),
    where("displayName", ">=", name),
    where("displayName", "<=", name + ""),
    limit(5)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ userId: d.id, ...d.data() }))
}

// ─── Notifications ────────────────────────────────────────────────────────────

export const createNotification = async (userId, notifData) => {
  const ref = collection(db, "users", userId, "notifications")
  await addDoc(ref, { ...notifData, read: false, createdAt: new Date().toISOString() })
}

export const getUserNotifications = async (userId) => {
  if (!userId) return []
  const ref = collection(db, "users", userId, "notifications")
  const snap = await getDocs(query(ref, where("read", "==", false)))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const markNotificationRead = async (userId, notifId) => {
  const ref = doc(db, "users", userId, "notifications", notifId)
  await setDoc(ref, { read: true }, { merge: true })
}
```

- [ ] Append the five functions to `src/lib/firestore.js`.
- [ ] Commit: `git add src/lib/firestore.js && git commit -m "feat: add user search and notification functions"`

---

## Task 5 — App.jsx: register new routes

**Files:**
- Modify: `src/App.jsx`

Add these imports after the existing page imports:

```jsx
import Groups from "./pages/Groups"
import CreateGroup from "./pages/CreateGroup"
import GroupDetail from "./pages/GroupDetail"
import AddSplit from "./pages/AddSplit"
import SplitScreen from "./pages/SplitScreen"
import SplitDetail from "./pages/SplitDetail"
```

Add these routes inside the `<Routes>` block after the `/scan` route:

```jsx
<Route path="/groups" element={<Groups />} />
<Route path="/groups/new" element={<CreateGroup />} />
<Route path="/groups/:groupId" element={<GroupDetail />} />
<Route path="/groups/:groupId/split/new" element={<AddSplit />} />
<Route path="/groups/:groupId/split/:splitId/screen" element={<SplitScreen />} />
<Route path="/groups/:groupId/split/:splitId" element={<SplitDetail />} />
```

- [ ] Add the 6 imports to `src/App.jsx`.
- [ ] Add the 6 routes.
- [ ] Commit: `git add src/App.jsx && git commit -m "feat: register groups and splits routes"`

---

## Task 6 — Layout.jsx: Groups nav item + notification badge

**Files:**
- Modify: `src/components/Layout.jsx`

**Step 1 — Add imports.**

Add `Users` and `Bell` to the lucide-react import, and add `useEffect`, `useRef` to the react import. Also import the notification function:

```jsx
import { LayoutDashboard, Receipt, ScanLine, PieChart, Settings, Menu, Sun, Moon, LogOut, Users, Bell } from "lucide-react"
import { useState, useEffect } from "react"
```

Add this import below the existing imports:

```jsx
import { getUserNotifications } from "../lib/firestore"
import { useAuth } from "../context/AuthContext"
```

(`useAuth` is already imported — keep only one import.)

**Step 2 — Add notification count state + effect.**

Inside `Layout`, after the existing state declarations, add:

```jsx
const [unreadCount, setUnreadCount] = useState(0)

useEffect(() => {
  if (!user) return
  getUserNotifications(user.uid)
    .then((notifs) => setUnreadCount(notifs.length))
    .catch(() => {})
}, [user])
```

**Step 3 — Add Groups to navItems.**

Replace the existing `navItems` array with:

```jsx
const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Receipt, label: "Expenses", path: "/expenses" },
  { icon: ScanLine, label: "Scan", path: "/scan" },
  { icon: Users, label: "Groups", path: "/groups", badge: unreadCount },
  { icon: PieChart, label: "Analytics", path: "/analytics" },
  { icon: Settings, label: "Settings", path: "/settings" },
]
```

**Step 4 — Update the nav link render to show badge.**

Replace the nav link inner content from:

```jsx
<Icon className="h-5 w-5" />
{item.label}
```

to:

```jsx
<Icon className="h-5 w-5" />
{item.label}
{item.badge > 0 && (
  <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
    {item.badge > 9 ? "9+" : item.badge}
  </span>
)}
```

- [ ] Apply all four steps to `src/components/Layout.jsx`.
- [ ] Commit: `git add src/components/Layout.jsx && git commit -m "feat: add Groups nav item with unread notification badge"`

---

## Task 7 — UserSearch.jsx component

**Files:**
- Create: `src/components/UserSearch.jsx`

```jsx
import { useState, useCallback } from "react"
import { Input } from "./Input"
import { Loader2, UserPlus, Check } from "lucide-react"
import { searchUsersByEmail, searchUsersByName } from "../lib/firestore"

export function UserSearch({ addedIds = [], onAdd }) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  const search = useCallback(async (value) => {
    if (value.length < 3) { setResults([]); return }
    setLoading(true)
    try {
      const [byEmail, byName] = await Promise.all([
        searchUsersByEmail(value),
        searchUsersByName(value)
      ])
      const merged = [...byEmail, ...byName]
      const deduped = merged.filter(
        (u, i, arr) => arr.findIndex((x) => x.userId === u.userId) === i
      )
      setResults(deduped)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    search(val)
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          placeholder="Search by email or name (min 3 chars)"
          value={query}
          onChange={handleChange}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-news" />
        )}
      </div>

      {results.length > 0 && (
        <div className="border border-border rounded-md bg-card divide-y divide-border">
          {results.map((u) => {
            const alreadyAdded = addedIds.includes(u.userId)
            return (
              <div key={u.userId} className="flex items-center gap-3 px-3 py-2">
                {u.photoURL ? (
                  <img src={u.photoURL} alt={u.displayName} className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-ink/10 flex items-center justify-center text-xs font-bold text-ink">
                    {(u.displayName || u.email)[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{u.displayName || "—"}</p>
                  <p className="text-xs text-news truncate">{u.email}</p>
                </div>
                <button
                  disabled={alreadyAdded}
                  onClick={() => onAdd(u)}
                  className="shrink-0 p-1 rounded-md text-ink/60 hover:text-ink hover:bg-ink/8 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {alreadyAdded ? <Check className="h-4 w-4 text-green-500" /> : <UserPlus className="h-4 w-4" />}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] Create `src/components/UserSearch.jsx` with the code above.
- [ ] Commit: `git add src/components/UserSearch.jsx && git commit -m "feat: add UserSearch component with email/name search"`

---

## Task 8 — SplitRow.jsx component

**Files:**
- Create: `src/components/SplitRow.jsx`

```jsx
import { cn } from "../lib/utils"

export function SplitRow({ participant, amount, isActive, onToggle, onAmountChange, currencySymbol, isLastActive }) {
  return (
    <div className={cn(
      "flex items-center gap-3 py-3 border-b border-border last:border-0 transition-opacity",
      !isActive && "opacity-40"
    )}>
      {participant.photoURL ? (
        <img src={participant.photoURL} alt={participant.displayName} className="w-9 h-9 rounded-full shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-ink/10 flex items-center justify-center text-sm font-bold text-ink shrink-0">
          {(participant.displayName || participant.email || "?")[0].toUpperCase()}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink truncate">{participant.displayName}</p>
        <p className="text-xs text-news truncate">{participant.email}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-news">{currencySymbol}</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={isActive ? amount : ""}
            disabled={!isActive}
            onChange={(e) => onAmountChange(parseFloat(e.target.value) || 0)}
            className="w-24 pl-5 pr-2 py-1.5 text-sm border border-border rounded-md bg-paper text-ink disabled:bg-news-light disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-ink"
          />
        </div>

        <button
          onClick={onToggle}
          disabled={isActive && isLastActive}
          title={isActive ? "Remove from split" : "Add to split"}
          className={cn(
            "w-6 h-6 rounded border-2 flex items-center justify-center transition-colors",
            isActive
              ? "bg-ink border-ink text-paper"
              : "bg-paper border-news hover:border-ink",
            isActive && isLastActive && "opacity-40 cursor-not-allowed"
          )}
        >
          {isActive && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
```

- [ ] Create `src/components/SplitRow.jsx` with the code above.
- [ ] Commit: `git add src/components/SplitRow.jsx && git commit -m "feat: add SplitRow component"`

---

## Task 9 — Groups.jsx page

**Files:**
- Create: `src/pages/Groups.jsx`

```jsx
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { getUserGroups } from "../lib/firestore"
import { Card, CardContent } from "../components/Card"
import { Button } from "../components/Button"
import { Users, Plus, Loader2 } from "lucide-react"
import { usePageTitle } from "../lib/usePageTitle"

export default function Groups() {
  usePageTitle("Groups")
  const { user } = useAuth()
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getUserGroups(user.uid)
      .then(setGroups)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-ink">Groups</h1>
          <p className="text-news text-sm mt-1">Split bills with friends</p>
        </div>
        <Button onClick={() => navigate("/groups/new")} className="gap-2">
          <Plus className="h-4 w-4" />
          New Group
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-news" />
        </div>
      )}

      {!loading && groups.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center gap-4">
            <Users className="h-12 w-12 text-news" />
            <div>
              <p className="font-medium text-ink">No groups yet</p>
              <p className="text-sm text-news mt-1">Create a group to start splitting bills</p>
            </div>
            <Button onClick={() => navigate("/groups/new")}>Create your first group</Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {groups.map((g) => (
          <Card key={g.id} className="cursor-pointer hover:border-ink/30 transition-colors" onClick={() => navigate(`/groups/${g.id}`)}>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="w-10 h-10 rounded-full bg-ink flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-paper" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-ink">{g.name}</p>
                <p className="text-xs text-news mt-0.5">{g.members.length} member{g.members.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex -space-x-2">
                {g.members.slice(0, 3).map((m) => (
                  m.photoURL
                    ? <img key={m.userId} src={m.photoURL} alt={m.displayName} className="w-7 h-7 rounded-full border-2 border-paper" />
                    : <div key={m.userId} className="w-7 h-7 rounded-full border-2 border-paper bg-news-light flex items-center justify-center text-xs font-bold text-ink">{(m.displayName || "?")[0]}</div>
                ))}
                {g.members.length > 3 && (
                  <div className="w-7 h-7 rounded-full border-2 border-paper bg-news-light flex items-center justify-center text-xs font-bold text-ink">
                    +{g.members.length - 3}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

- [ ] Create `src/pages/Groups.jsx`.
- [ ] Commit: `git add src/pages/Groups.jsx && git commit -m "feat: add Groups list page"`

---

## Task 10 — CreateGroup.jsx page

**Files:**
- Create: `src/pages/CreateGroup.jsx`

```jsx
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { createGroup } from "../lib/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import { Button } from "../components/Button"
import { Input } from "../components/Input"
import { UserSearch } from "../components/UserSearch"
import { X, Loader2 } from "lucide-react"
import { usePageTitle } from "../lib/usePageTitle"

export default function CreateGroup() {
  usePageTitle("New Group")
  const { user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [members, setMembers] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const addedIds = [user.uid, ...members.map((m) => m.userId)]

  const handleAdd = (u) => {
    if (addedIds.includes(u.userId)) return
    setMembers((prev) => [...prev, u])
  }

  const handleRemove = (userId) => {
    setMembers((prev) => prev.filter((m) => m.userId !== userId))
  }

  const handleCreate = async () => {
    if (!name.trim()) { setError("Group name is required"); return }
    setSaving(true)
    setError("")
    try {
      const selfMember = {
        userId: user.uid,
        displayName: user.displayName || "",
        email: user.email || "",
        photoURL: user.photoURL || ""
      }
      const groupId = await createGroup(user.uid, { name: name.trim(), members: [selfMember, ...members] })
      navigate(`/groups/${groupId}`)
    } catch (e) {
      setError("Failed to create group. Try again.")
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-3xl font-serif font-bold text-ink">New Group</h1>
        <p className="text-news text-sm mt-1">Name your group and add members</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Group Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-ink block mb-1">Group Name</label>
            <Input
              placeholder="e.g. Roommates, Bali Trip"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-ink block mb-2">Add Members</label>
            <UserSearch addedIds={addedIds} onAdd={handleAdd} />
          </div>

          {members.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-news uppercase tracking-wider">Added ({members.length})</p>
              {members.map((m) => (
                <div key={m.userId} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  {m.photoURL
                    ? <img src={m.photoURL} alt={m.displayName} className="w-8 h-8 rounded-full" />
                    : <div className="w-8 h-8 rounded-full bg-ink/10 flex items-center justify-center text-xs font-bold">{(m.displayName || m.email)[0].toUpperCase()}</div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{m.displayName}</p>
                    <p className="text-xs text-news truncate">{m.email}</p>
                  </div>
                  <button onClick={() => handleRemove(m.userId)} className="text-news hover:text-red-500 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => navigate("/groups")} className="flex-1">Cancel</Button>
            <Button onClick={handleCreate} disabled={saving} className="flex-1 gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Group
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] Create `src/pages/CreateGroup.jsx`.
- [ ] Commit: `git add src/pages/CreateGroup.jsx && git commit -m "feat: add CreateGroup page"`

---

## Task 11 — AddSplit.jsx page

**Files:**
- Create: `src/pages/AddSplit.jsx`

```jsx
import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import { Button } from "../components/Button"
import { Input } from "../components/Input"
import { ScanLine, PenLine, Loader2 } from "lucide-react"
import { usePageTitle } from "../lib/usePageTitle"
import { useCurrency } from "../context/CurrencyContext"
import { getCurrencySymbol } from "../lib/currency"

export default function AddSplit() {
  usePageTitle("Add Split")
  const { groupId } = useParams()
  const navigate = useNavigate()
  const { currency } = useCurrency()
  const currencySymbol = getCurrencySymbol(currency)

  const [mode, setMode] = useState(null) // null | "manual"
  const [merchant, setMerchant] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [error, setError] = useState("")

  const handleScan = () => {
    navigate("/scan", { state: { groupId } })
  }

  const handleManualContinue = () => {
    if (!merchant.trim()) { setError("Merchant name is required"); return }
    const total = parseFloat(amount)
    if (!total || total <= 0) { setError("Enter a valid amount"); return }
    navigate(`/groups/${groupId}/split/${Date.now()}/screen`, {
      state: { merchant: merchant.trim(), totalAmount: total, date, fromManual: true }
    })
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-3xl font-serif font-bold text-ink">Add Split</h1>
        <p className="text-news text-sm mt-1">Scan a receipt or enter details manually</p>
      </div>

      {!mode && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="cursor-pointer hover:border-ink/40 transition-colors" onClick={handleScan}>
            <CardContent className="flex flex-col items-center py-10 gap-3">
              <ScanLine className="h-10 w-10 text-ink" />
              <p className="font-medium text-ink">Scan Receipt</p>
              <p className="text-xs text-news text-center">Use camera to extract total automatically</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-ink/40 transition-colors" onClick={() => setMode("manual")}>
            <CardContent className="flex flex-col items-center py-10 gap-3">
              <PenLine className="h-10 w-10 text-ink" />
              <p className="font-medium text-ink">Manual Entry</p>
              <p className="text-xs text-news text-center">Enter merchant and amount yourself</p>
            </CardContent>
          </Card>
        </div>
      )}

      {mode === "manual" && (
        <Card>
          <CardHeader><CardTitle>Bill Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-ink block mb-1">Merchant</label>
              <Input placeholder="e.g. Pizza Palace" value={merchant} onChange={(e) => setMerchant(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-ink block mb-1">Total Amount ({currencySymbol})</label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-ink block mb-1">Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setMode(null)} className="flex-1">Back</Button>
              <Button onClick={handleManualContinue} className="flex-1">Continue</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

- [ ] Create `src/pages/AddSplit.jsx`.
- [ ] Commit: `git add src/pages/AddSplit.jsx && git commit -m "feat: add AddSplit page with scan/manual choice"`

---

## Task 12 — GroupDetail.jsx page

**Files:**
- Create: `src/pages/GroupDetail.jsx`

```jsx
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { getGroup, getGroupSplits } from "../lib/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import { Button } from "../components/Button"
import { Badge } from "../components/Badge"
import { Plus, Loader2, ArrowLeft, Users } from "lucide-react"
import { usePageTitle } from "../lib/usePageTitle"
import { useCurrency } from "../context/CurrencyContext"
import { getCurrencySymbol, formatCurrency } from "../lib/currency"

export default function GroupDetail() {
  usePageTitle("Group")
  const { groupId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { currency } = useCurrency()
  const currencySymbol = getCurrencySymbol(currency)

  const [group, setGroup] = useState(null)
  const [splits, setSplits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!groupId) return
    Promise.all([getGroup(groupId), getGroupSplits(groupId)])
      .then(([g, s]) => { setGroup(g); setSplits(s) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [groupId])

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-news" /></div>
  if (!group) return <p className="text-news">Group not found.</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/groups")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-serif font-bold text-ink">{group.name}</h1>
          <p className="text-news text-sm">{group.members.length} members</p>
        </div>
        <Button onClick={() => navigate(`/groups/${groupId}/split/new`)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Split
        </Button>
      </div>

      {/* Members */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" /> Members</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border">
          {group.members.map((m) => (
            <div key={m.userId} className="flex items-center gap-3 py-2.5">
              {m.photoURL
                ? <img src={m.photoURL} alt={m.displayName} className="w-8 h-8 rounded-full" />
                : <div className="w-8 h-8 rounded-full bg-ink/10 flex items-center justify-center text-xs font-bold">{(m.displayName || "?")[0]}</div>
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{m.displayName}</p>
                <p className="text-xs text-news truncate">{m.email}</p>
              </div>
              {m.userId === group.createdBy && (
                <Badge variant="secondary" className="text-xs">Creator</Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Splits */}
      <div>
        <h2 className="text-lg font-serif font-bold text-ink mb-3">Splits</h2>
        {splits.length === 0 && (
          <Card>
            <CardContent className="text-center py-12 text-news">
              No splits yet. Tap "Add Split" to create one.
            </CardContent>
          </Card>
        )}
        <div className="space-y-3">
          {splits.map((s) => {
            const myShare = s.participants.find((p) => p.userId === user.uid)
            const allSettled = s.participants.every((p) => p.status === "settled")
            return (
              <Card
                key={s.id}
                className="cursor-pointer hover:border-ink/30 transition-colors"
                onClick={() => navigate(`/groups/${groupId}/split/${s.id}`)}
              >
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink truncate">{s.merchant}</p>
                    <p className="text-xs text-news mt-0.5">{s.date}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-ink">
                      {currencySymbol}{myShare ? myShare.amount.toFixed(2) : "—"} <span className="text-news font-normal">your share</span>
                    </p>
                    <Badge variant={allSettled ? "success" : "secondary"} className="text-xs mt-1">
                      {allSettled ? "Settled" : "Pending"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] Create `src/pages/GroupDetail.jsx`.
- [ ] Note: `Badge` already exists at `src/components/Badge.jsx` — use it as-is; check its API with a quick read before importing.
- [ ] Commit: `git add src/pages/GroupDetail.jsx && git commit -m "feat: add GroupDetail page"`

---

## Task 13 — SplitDetail.jsx page

**Files:**
- Create: `src/pages/SplitDetail.jsx`

```jsx
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { getSplit, settleSplit } from "../lib/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import { Button } from "../components/Button"
import { Badge } from "../components/Badge"
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react"
import { usePageTitle } from "../lib/usePageTitle"
import { useCurrency } from "../context/CurrencyContext"
import { getCurrencySymbol } from "../lib/currency"

export default function SplitDetail() {
  usePageTitle("Split")
  const { groupId, splitId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { currency } = useCurrency()
  const currencySymbol = getCurrencySymbol(currency)

  const [split, setSplit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [settling, setSettling] = useState(false)

  const load = () => {
    getSplit(splitId)
      .then(setSplit)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [splitId])

  const handleSettle = async (targetUserId) => {
    setSettling(true)
    try {
      await settleSplit(splitId, targetUserId)
      load()
    } catch (e) {
      console.error(e)
    } finally {
      setSettling(false)
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-news" /></div>
  if (!split) return <p className="text-news">Split not found.</p>

  const allSettled = split.participants.every((p) => p.status === "settled")

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/groups/${groupId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-serif font-bold text-ink">{split.merchant}</h1>
          <p className="text-news text-sm">{split.date} · Total: {currencySymbol}{split.totalAmount.toFixed(2)}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Shares
            <Badge variant={allSettled ? "success" : "secondary"}>{allSettled ? "Fully Settled" : "Pending"}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {split.participants.map((p) => {
            const isMe = p.userId === user.uid
            const isPayer = p.userId === split.payerId
            const settled = p.status === "settled"
            const canSettle = (isMe || user.uid === split.payerId) && !settled

            return (
              <div key={p.userId} className="flex items-center gap-3 py-3">
                {p.photoURL
                  ? <img src={p.photoURL} alt={p.displayName} className="w-8 h-8 rounded-full" />
                  : <div className="w-8 h-8 rounded-full bg-ink/10 flex items-center justify-center text-xs font-bold">{(p.displayName || "?")[0]}</div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">
                    {p.displayName} {isMe && <span className="text-news">(you)</span>} {isPayer && <span className="text-news">· payer</span>}
                  </p>
                  <p className="text-xs font-mono text-ink mt-0.5">{currencySymbol}{p.amount.toFixed(2)}</p>
                </div>
                {settled ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                ) : canSettle ? (
                  <Button size="sm" variant="outline" disabled={settling} onClick={() => handleSettle(p.userId)}>
                    Mark Settled
                  </Button>
                ) : (
                  <Badge variant="secondary" className="text-xs">Pending</Badge>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] Create `src/pages/SplitDetail.jsx`.
- [ ] Commit: `git add src/pages/SplitDetail.jsx && git commit -m "feat: add SplitDetail page with settle flow"`

---

## Task 14 — Firestore security rules

**Files:**
- Modify: `firestore.rules`

Add the following rules blocks. Locate the existing `rules_version` block and append inside `service cloud.firestore`:

```
// Groups: readable by members, writable by members
match /groups/{groupId} {
  allow read: if request.auth != null && request.auth.uid in resource.data.memberIds;
  allow create: if request.auth != null;
  allow update: if request.auth != null && request.auth.uid in resource.data.memberIds;
}

// Splits: readable/writable by participants
match /splits/{splitId} {
  allow read: if request.auth != null && request.auth.uid in resource.data.participantIds;
  allow create: if request.auth != null;
  allow update: if request.auth != null && request.auth.uid in resource.data.participantIds;
}

// Notifications: owner-only
match /users/{userId}/notifications/{notifId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}

// Users: readable by any authenticated user (for search), writable by self
match /users/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.uid == userId;
}
```

After editing:

```bash
firebase deploy --only firestore:rules
```

- [ ] Locate `firestore.rules` (project root) and append the four rule blocks.
- [ ] Run `firebase deploy --only firestore:rules`.
- [ ] Commit: `git add firestore.rules && git commit -m "feat: add security rules for groups, splits, notifications"`

---

## Task 15 — Scan.jsx: groupId passthrough

**Files:**
- Modify: `src/pages/Scan.jsx`

**Where to change:**

1. After the scan extracts data and the user confirms, instead of calling `saveTransaction` directly, check if `location.state?.groupId` is set. If it is, navigate to SplitScreen instead.

2. In the `useEffect` that reads `location.state?.file`, also read `groupId`:

```js
useEffect(() => {
  if (location.state?.file) {
    const file = location.state.file
    setFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setStatus("preview")
    // preserve groupId across navigation clear
    const gId = location.state.groupId || null
    navigate(location.pathname, { replace: true, state: {} })
    if (gId) setGroupId(gId)
  }
}, [location.state, navigate])
```

3. Add `const [groupId, setGroupId] = useState(location.state?.groupId || null)` to state.

4. In the save/confirm handler (where `saveTransaction` is called), add a branch:

```js
if (groupId) {
  navigate(`/groups/${groupId}/split/${Date.now()}/screen`, {
    state: {
      merchant: extractedData.merchant,
      totalAmount: parseFloat(extractedData.total),
      date: extractedData.date || new Date().toISOString().slice(0, 10),
      fromScan: true
    }
  })
  return
}
// existing saveTransaction call follows
```

- [ ] Read `src/pages/Scan.jsx` fully to find the save handler.
- [ ] Apply all three changes.
- [ ] Commit: `git add src/pages/Scan.jsx && git commit -m "feat: scan can pass extracted data to SplitScreen via groupId state"`

---

## Task 16 — SplitScreen.jsx page (most complex)

**Files:**
- Create: `src/pages/SplitScreen.jsx`

```jsx
import { useEffect, useState } from "react"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { getGroup, createSplit, createNotification } from "../lib/firestore"
import { SplitRow } from "../components/SplitRow"
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import { Button } from "../components/Button"
import { Loader2, ArrowLeft } from "lucide-react"
import { usePageTitle } from "../lib/usePageTitle"
import { useCurrency } from "../context/CurrencyContext"
import { getCurrencySymbol } from "../lib/currency"

function distributeEvenly(total, count) {
  if (count === 0) return []
  const base = Math.floor((total * 100) / count) / 100
  const remainder = Math.round((total - base * count) * 100) / 100
  return Array.from({ length: count }, (_, i) => (i === 0 ? base + remainder : base))
}

export default function SplitScreen() {
  usePageTitle("Split")
  const { groupId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { currency } = useCurrency()
  const currencySymbol = getCurrencySymbol(currency)

  const { merchant, totalAmount, date } = location.state || {}

  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState({})     // userId → boolean
  const [amounts, setAmounts] = useState({})   // userId → number
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!groupId) return
    getGroup(groupId).then((g) => {
      setGroup(g)
      if (g) {
        const initialActive = {}
        g.members.forEach((m) => { initialActive[m.userId] = true })
        setActive(initialActive)

        const shares = distributeEvenly(totalAmount, g.members.length)
        const initialAmounts = {}
        g.members.forEach((m, i) => { initialAmounts[m.userId] = shares[i] })
        setAmounts(initialAmounts)
      }
    }).catch(console.error).finally(() => setLoading(false))
  }, [groupId, totalAmount])

  const activeMembers = group?.members.filter((m) => active[m.userId]) || []
  const assigned = activeMembers.reduce((sum, m) => sum + (amounts[m.userId] || 0), 0)
  const diff = Math.round((totalAmount - assigned) * 100) / 100
  const isValid = Math.abs(diff) < 0.005

  const handleToggle = (userId) => {
    const nextActive = { ...active, [userId]: !active[userId] }
    const nowActive = group.members.filter((m) => nextActive[m.userId])
    if (nowActive.length === 0) return // can't deselect last

    const shares = distributeEvenly(totalAmount, nowActive.length)
    const nextAmounts = { ...amounts }
    nowActive.forEach((m, i) => { nextAmounts[m.userId] = shares[i] })
    setActive(nextActive)
    setAmounts(nextAmounts)
  }

  const handleAmountChange = (userId, value) => {
    setAmounts((prev) => ({ ...prev, [userId]: value }))
  }

  const handleConfirm = async () => {
    if (!isValid) return
    setSaving(true)
    setError("")
    try {
      const participants = group.members
        .filter((m) => active[m.userId])
        .map((m) => ({
          userId: m.userId,
          displayName: m.displayName,
          photoURL: m.photoURL || "",
          amount: amounts[m.userId],
          status: "pending"
        }))

      const { splitId } = await createSplit(groupId, user.uid, {
        merchant,
        date,
        totalAmount,
        participants
      })

      // Notify all participants except the payer
      const notifPromises = participants
        .filter((p) => p.userId !== user.uid)
        .map((p) =>
          createNotification(p.userId, {
            type: "split_added",
            splitId,
            groupId,
            groupName: group.name,
            payerName: user.displayName || user.email,
            merchant,
            amount: p.amount
          })
        )
      await Promise.all(notifPromises)

      navigate(`/groups/${groupId}`)
    } catch (e) {
      console.error(e)
      setError("Failed to save split. Try again.")
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-news" /></div>
  if (!group || !merchant || !totalAmount) return (
    <div className="space-y-4">
      <p className="text-news">Missing split data. Go back and try again.</p>
      <Button onClick={() => navigate(`/groups/${groupId}`)}>Back to Group</Button>
    </div>
  )

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-serif font-bold text-ink">Split Bill</h1>
          <p className="text-news text-sm">{merchant} · {currencySymbol}{totalAmount?.toFixed(2)}</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Assign Shares</CardTitle></CardHeader>
        <CardContent>
          {group.members.map((m) => (
            <SplitRow
              key={m.userId}
              participant={m}
              amount={amounts[m.userId] || 0}
              isActive={!!active[m.userId]}
              isLastActive={activeMembers.length === 1 && active[m.userId]}
              onToggle={() => handleToggle(m.userId)}
              onAmountChange={(val) => handleAmountChange(m.userId, val)}
              currencySymbol={currencySymbol}
            />
          ))}
        </CardContent>
      </Card>

      {/* Running total */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-md font-medium text-sm ${isValid ? "bg-green-50 dark:bg-green-900/20 text-green-700" : "bg-red-50 dark:bg-red-900/20 text-red-600"}`}>
        <span>Assigned</span>
        <span>
          {currencySymbol}{assigned.toFixed(2)} / {currencySymbol}{totalAmount.toFixed(2)}
          {!isValid && ` (${diff > 0 ? `-${diff.toFixed(2)}` : `+${Math.abs(diff).toFixed(2)}`} remaining)`}
        </span>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button
        className="w-full"
        disabled={!isValid || saving}
        onClick={handleConfirm}
      >
        {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : "Confirm Split"}
      </Button>
    </div>
  )
}
```

- [ ] Create `src/pages/SplitScreen.jsx`.
- [ ] Commit: `git add src/pages/SplitScreen.jsx && git commit -m "feat: add SplitScreen with equal/custom split validation"`

---

## Self-Review

### Spec coverage

| Spec requirement | Task |
|-----------------|------|
| saveUser writes displayName/photoURL | Task 1 |
| createGroup / getUserGroups / getGroup / addMemberToGroup | Task 2 |
| createSplit / getGroupSplits / getSplit / settleSplit | Task 3 |
| searchUsersByEmail / searchUsersByName | Task 4 |
| createNotification / getUserNotifications / markNotificationRead | Task 4 |
| Groups nav item + notification badge | Task 6 |
| All 6 routes registered | Task 5 |
| UserSearch (min 3 chars, email + name, dedup) | Task 7 |
| SplitRow (toggle, editable amount, avatar) | Task 8 |
| Groups list page | Task 9 |
| CreateGroup page | Task 10 |
| GroupDetail (members + splits list) | Task 12 |
| AddSplit (scan or manual) | Task 11 |
| SplitScreen (equal default, toggle redistribution, sum validation) | Task 16 |
| SplitDetail (settle by self or payer) | Task 13 |
| Firestore security rules | Task 14 |
| Scan passthrough to SplitScreen | Task 15 |
| Notifications on split creation | Task 16 (createNotification calls) |
| Rounding remainder to payer row | Task 16 (distributeEvenly assigns remainder to index 0 = first member; adjust if payer isn't always first — payer is always in members[0] since createGroup puts self first) |

### Notes
- `shareToken` is generated in `createSplit` (Task 3) but the `/split/:shareToken` public redirect route is **out of scope for v1** per design doc.
- `Badge` variant `"success"` is used — verify this variant exists in `src/components/Badge.jsx` before Task 12/13; add it if missing.
- `formatCurrency` import in Task 12 — verify it exists in `src/lib/currency.js`; remove import if not present (only `getCurrencySymbol` is strictly needed).
