import { db } from "./firebase"
import { collection, getDocs, query, addDoc, doc, setDoc, getDoc, deleteDoc, where, limit, onSnapshot, writeBatch, runTransaction } from "firebase/firestore"
import { validateTransaction, validateUserSettings, validateGroup, validateGroupMember, validateSplit, validateNotification, GROUP_MEMBER_LIMIT } from "./validation"
import { checkRateLimit } from "./rateLimit"

export const getUserTransactions = async (userId) => {
  if (!userId) return []

  try {
    const transactionsRef = collection(db, "users", userId, "transactions")
    // Order by date descending by default
    const q = query(transactionsRef) // We can add orderBy("date", "desc") if indexes are set up

    const querySnapshot = await getDocs(q)
    const transactions = []

    querySnapshot.forEach((doc) => {
      transactions.push({
        id: doc.id,
        ...doc.data()
      })
    })

    // Sort manually to avoid index requirements for now
    return transactions.sort((a, b) => new Date(b.date) - new Date(a.date))
  } catch (error) {
    console.error("Error fetching transactions:", error)
    throw error
  }
}

export const saveUser = async (user) => {
  if (!user) return

  try {
    const publicData = {
      email: user.email,
      displayName: user.displayName || "",
      photoURL: user.photoURL || "",
      lastUpdated: new Date().toISOString()
    }

    // Write public profile (searchable by other users)
    await setDoc(doc(db, "userProfiles", user.uid), publicData, { merge: true })

    // Write private user doc (owner-only)
    await setDoc(doc(db, "users", user.uid), publicData, { merge: true })
  } catch (error) {
    console.error("Error saving user:", error)
    throw error
  }
}

export const saveTransaction = async (userId, transactionData) => {
  if (!userId) throw new Error("User ID is required")

  try {
    // Check rate limit
    checkRateLimit('firestore-write');

    // Validate transaction data
    const validatedData = validateTransaction(transactionData);

    // Ensure user document exists (optional but good practice)
    // const userRef = doc(db, "users", userId)
    // await setDoc(userRef, { email: transactionData.email || "", lastUpdated: new Date().toISOString() }, { merge: true })

    // Add transaction to subcollection
    const transactionsRef = collection(db, "users", userId, "transactions")
    const docRef = await addDoc(transactionsRef, {
      ...validatedData,
      createdAt: new Date().toISOString(),
      source: validatedData.source || "scan"
    })

    return docRef.id
  } catch (error) {
    console.error("Error saving transaction:", error)
    throw error
  }
}

export const getTransaction = async (userId, transactionId) => {
  if (!userId || !transactionId) throw new Error("User ID and Transaction ID are required")

  try {
    const docRef = doc(db, "users", userId, "transactions", transactionId)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() }
    } else {
      return null
    }
  } catch (error) {
    console.error("Error fetching transaction:", error)
    throw error
  }
}
export const deleteTransaction = async (userId, transactionId) => {
  if (!userId || !transactionId) throw new Error("User ID and Transaction ID are required")

  try {
    const docRef = doc(db, "users", userId, "transactions", transactionId)
    await deleteDoc(docRef)
  } catch (error) {
    console.error("Error deleting transaction:", error)
    throw error
  }
}

export const getUserSettings = async (userId) => {
  if (!userId) return null

  try {
    const userRef = doc(db, "users", userId)
    const docSnap = await getDoc(userRef)

    if (docSnap.exists()) {
      return docSnap.data().settings || null
    }
    return null
  } catch (error) {
    console.error("Error fetching user settings:", error)
    throw error
  }
}

export const updateUserSettings = async (userId, settings) => {
  if (!userId) throw new Error("User ID is required")

  try {
    // Check rate limit
    checkRateLimit('firestore-write');

    // Read existing settings first to avoid overwriting unrelated fields
    const userRef = doc(db, "users", userId)
    const existing = await getDoc(userRef)
    const currentSettings = existing.exists() ? (existing.data().settings || {}) : {}

    // Merge new settings on top of existing
    const validatedSettings = validateUserSettings({ ...currentSettings, ...settings });

    await setDoc(userRef, { settings: validatedSettings }, { merge: true })
  } catch (error) {
    console.error("Error updating user settings:", error)
    throw error
  }
}

// ─── Groups ──────────────────────────────────────────────────────────────────

export const createGroup = async (userId, { name, members }) => {
  if (!userId) throw new Error("User ID is required")

  try {
    checkRateLimit('firestore-write');

    const validated = validateGroup({ name, members })

    // Creator must be a member (rules require it); keep members/memberIds in sync
    if (!validated.members.some((m) => m.userId === userId)) {
      throw new Error("Group creator must be included in members")
    }
    const allMembers = validated.members

    const groupData = {
      name: validated.name,
      createdBy: userId,
      memberIds: allMembers.map((m) => m.userId),
      members: allMembers,
      createdAt: new Date().toISOString()
    }

    const ref = await addDoc(collection(db, "groups"), groupData)
    return ref.id
  } catch (error) {
    console.error("Error creating group:", error)
    throw error
  }
}

export const getUserGroups = async (userId) => {
  if (!userId) return []
  try {
    const q = query(collection(db, "groups"), where("memberIds", "array-contains", userId))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch (error) {
    console.error("Error fetching user groups:", error)
    throw error
  }
}

export const getGroup = async (groupId) => {
  try {
    const snap = await getDoc(doc(db, "groups", groupId))
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() }
  } catch (error) {
    console.error("Error fetching group:", error)
    throw error
  }
}

// Errors thrown with these messages are safe to show verbatim.
export const GROUP_ERRORS = {
  notFound: "Group not found",
  alreadyMember: "Already a member of this group",
  full: `Groups are limited to ${GROUP_MEMBER_LIMIT} members`
}

// Adds `member` to the roster. A transaction, so two people adding at once cannot
// overwrite each other's add. Resolves with the fresh members list.
export const addMemberToGroup = async (groupId, member) => {
  try {
    checkRateLimit('firestore-write');
    const validated = validateGroupMember(member)
    const groupRef = doc(db, "groups", groupId)

    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(groupRef)
      if (!snap.exists()) throw new Error(GROUP_ERRORS.notFound)

      const { members = [], memberIds = [] } = snap.data()
      if (memberIds.includes(validated.userId)) throw new Error(GROUP_ERRORS.alreadyMember)
      if (memberIds.length >= GROUP_MEMBER_LIMIT) throw new Error(GROUP_ERRORS.full)

      const nextMembers = [...members, validated]
      tx.update(groupRef, {
        members: nextMembers,
        memberIds: [...memberIds, validated.userId]
      })
      return nextMembers
    })
  } catch (error) {
    console.error("Error adding member to group:", error)
    throw error
  }
}

// ─── Splits ───────────────────────────────────────────────────────────────────

// Split-related ledger entries use fixed ids so retries can never double-write:
//   payer's bill:            users/{payer}/transactions/split-{splitId}
//   participant's share:     users/{participant}/transactions/split-{splitId}-{participant}
//   payer's refund of share: users/{payer}/transactions/split-{splitId}-{participant}
const splitTxId = (splitId, participantId) => participantId ? `split-${splitId}-${participantId}` : `split-${splitId}`

// Create-only write; "already exists" means a previous attempt succeeded, so it is not an error.
const createSplitTransaction = async (userId, txId, transactionData) => {
  const validated = validateTransaction(transactionData)
  const ref = doc(db, "users", userId, "transactions", txId)
  try {
    await setDoc(ref, { ...validated, createdAt: new Date().toISOString() })
  } catch (error) {
    // Cross-user writes are create-only, so a retry surfaces as permission-denied;
    // rules allow reading exactly this doc back to confirm it is already there.
    const existing = await getDoc(ref).catch(() => null)
    if (existing?.exists()) return
    throw error
  }
}

const splitLineItems = (merchant, amount, lineItems) =>
  lineItems?.length
    ? lineItems
    : [{ name: merchant, price: amount, quantity: 1, totalPrice: amount, category: "Other" }]

const sortByCreatedDesc = (snap) =>
  snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

export const createSplit = async (groupId, payerId, { merchant, date, totalAmount, participants, lineItems }) => {
  try {
    checkRateLimit('firestore-write');

    const validated = validateSplit({ groupId, payerId, merchant, date, totalAmount, participants })

    const tokenBytes = new Uint8Array(16)
    crypto.getRandomValues(tokenBytes)
    const shareToken = Array.from(tokenBytes, b => b.toString(16).padStart(2, '0')).join('')

    const shares = Object.fromEntries(validated.participants.map((p) => [p.userId, p.amount]))

    // The payer covered the whole bill, so their own share is settled from the start
    const participantsWithPayer = validated.participants.map((p) =>
      p.userId === payerId ? { ...p, status: "settled" } : p
    )

    const splitData = {
      ...validated,
      participants: participantsWithPayer,
      participantIds: validated.participants.map((p) => p.userId),
      shares,
      shareToken,
      createdAt: new Date().toISOString()
    }

    const ref = await addDoc(collection(db, "splits"), splitData)

    // The payer paid the whole bill: record it in their ledger
    await createSplitTransaction(payerId, splitTxId(ref.id), {
      merchant: validated.merchant,
      date: validated.date,
      total: validated.totalAmount,
      lineItems: splitLineItems(validated.merchant, validated.totalAmount, lineItems),
      source: "split",
      type: "expense",
      splitId: ref.id
    })

    return { splitId: ref.id, shareToken }
  } catch (error) {
    console.error("Error creating split:", error)
    throw error
  }
}

export const getGroupSplits = async (groupId) => {
  try {
    const q = query(collection(db, "splits"), where("groupId", "==", groupId))
    return sortByCreatedDesc(await getDocs(q))
  } catch (error) {
    console.error("Error fetching group splits:", error)
    throw error
  }
}

// Live splits for one group. Returns unsubscribe.
export const subscribeGroupSplits = (groupId, onChange, onError = console.error) => {
  const q = query(collection(db, "splits"), where("groupId", "==", groupId))
  return onSnapshot(q, (snap) => onChange(sortByCreatedDesc(snap)), onError)
}

// Live splits across many groups (Firestore "in" allows 30 values per query). Returns unsubscribe.
export const subscribeSplitsForGroups = (groupIds, onChange, onError = console.error) => {
  if (!groupIds.length) { onChange([]); return () => {} }
  const chunks = []
  for (let i = 0; i < groupIds.length; i += 30) chunks.push(groupIds.slice(i, i + 30))
  const perChunk = chunks.map(() => [])
  const emit = () => onChange(perChunk.flat())
  const unsubs = chunks.map((ids, i) =>
    onSnapshot(query(collection(db, "splits"), where("groupId", "in", ids)), (snap) => {
      perChunk[i] = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      emit()
    }, onError)
  )
  return () => unsubs.forEach((u) => u())
}

export const getSplit = async (splitId) => {
  try {
    const snap = await getDoc(doc(db, "splits", splitId))
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() }
  } catch (error) {
    console.error("Error fetching split:", error)
    throw error
  }
}

// Marks `userId`'s share settled, then records it in both ledgers:
// an expense for the participant and a refund for the payer.
export const settleSplit = async (splitId, userId) => {
  try {
    checkRateLimit('firestore-write');

    const splitRef = doc(db, "splits", splitId)
    const snap = await getDoc(splitRef)
    if (!snap.exists()) throw new Error("Split not found")

    const split = snap.data()
    const share = split.participants.find((p) => p.userId === userId)
    if (!share) throw new Error("Not a participant of this split")
    if (share.status !== "settled") {
      const updated = split.participants.map((p) =>
        p.userId === userId ? { ...p, status: "settled" } : p
      )
      await setDoc(splitRef, { participants: updated }, { merge: true })
    }

    // Payer settling their own share moves no money
    if (userId === split.payerId) return

    const today = new Date().toISOString().slice(0, 10)
    const amount = split.shares?.[userId] ?? share.amount
    const txId = splitTxId(splitId, userId)
    const payerName = split.participants.find((p) => p.userId === split.payerId)?.displayName || "payer"

    await createSplitTransaction(userId, txId, {
      merchant: split.merchant,
      date: today,
      total: amount,
      lineItems: splitLineItems(`${split.merchant} — your share (paid to ${payerName})`, amount),
      source: "split",
      type: "expense",
      splitId
    })

    await createSplitTransaction(split.payerId, txId, {
      merchant: `${split.merchant} — repaid by ${share.displayName || "participant"}`,
      date: today,
      total: -amount,
      lineItems: [],
      source: "split",
      type: "refund",
      splitId
    })
  } catch (error) {
    console.error("Error settling split:", error)
    throw error
  }
}

// ─── Leave / delete group ────────────────────────────────────────────────────

export const leaveGroup = async (groupId, userId) => {
  try {
    checkRateLimit('firestore-write');
    const groupRef = doc(db, "groups", groupId)
    const snap = await getDoc(groupRef)
    if (!snap.exists()) throw new Error("Group not found")
    const { members = [], memberIds = [] } = snap.data()
    await setDoc(groupRef, {
      members: members.filter((m) => m.userId !== userId),
      memberIds: memberIds.filter((id) => id !== userId)
    }, { merge: true })
  } catch (error) {
    console.error("Error leaving group:", error)
    throw error
  }
}

// Creator only (enforced by rules). Removes the group and every split in it.
export const deleteGroup = async (groupId) => {
  try {
    checkRateLimit('firestore-write');
    const splits = await getDocs(query(collection(db, "splits"), where("groupId", "==", groupId)))
    const batch = writeBatch(db)
    splits.docs.forEach((d) => batch.delete(d.ref))
    batch.delete(doc(db, "groups", groupId))
    await batch.commit()
  } catch (error) {
    console.error("Error deleting group:", error)
    throw error
  }
}

// ─── User Search (reads public userProfiles, never private users docs) ───────

export const searchUsersByEmail = async (email) => {
  if (!email) return []
  try {
    const q = query(collection(db, "userProfiles"), where("email", "==", email), limit(5))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ userId: d.id, ...d.data() }))
  } catch (error) {
    console.error("Error searching users by email:", error)
    throw error
  }
}

export const searchUsersByName = async (name) => {
  if (!name) return []
  try {
    const q = query(
      collection(db, "userProfiles"),
      where("displayName", ">=", name),
      where("displayName", "<=", name + "￿"),
      limit(5)
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ userId: d.id, ...d.data() }))
  } catch (error) {
    console.error("Error searching users by name:", error)
    throw error
  }
}

// ─── Notifications ────────────────────────────────────────────────────────────

// Dispatched on window after notifications are marked read so the nav badge re-counts
export const NOTIFICATIONS_CHANGED_EVENT = "budgetmate:notifications-changed"

// Not rate-limited: fanned out once per participant right after createSplit / addMemberToGroup.
// In-app only — there is no push or email behind this.
export const createNotification = async (userId, notifData) => {
  try {
    const validated = validateNotification(notifData)
    const ref = collection(db, "users", userId, "notifications")
    await addDoc(ref, { ...validated, read: false, createdAt: new Date().toISOString() })
  } catch (error) {
    console.error("Error creating notification:", error)
    throw error
  }
}

export const getUserNotifications = async (userId) => {
  if (!userId) return []
  try {
    const ref = collection(db, "users", userId, "notifications")
    const snap = await getDocs(query(ref, where("read", "==", false)))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch (error) {
    console.error("Error fetching notifications:", error)
    throw error
  }
}

export const markNotificationRead = async (userId, notifId) => {
  try {
    const ref = doc(db, "users", userId, "notifications", notifId)
    await setDoc(ref, { read: true }, { merge: true })
  } catch (error) {
    console.error("Error marking notification read:", error)
    throw error
  }
}

export const markAllNotificationsRead = async (userId) => {
  const unread = await getUserNotifications(userId)
  await Promise.all(unread.map((n) => markNotificationRead(userId, n.id)))
}
