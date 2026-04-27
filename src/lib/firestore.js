import { db } from "./firebase"
import { collection, getDocs, query, orderBy, addDoc, doc, setDoc, getDoc, deleteDoc, where, limit, onSnapshot } from "firebase/firestore"
import { validateTransaction, validateUserSettings } from "./validation"
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
  try {
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

export const addMemberToGroup = async (groupId, member) => {
  try {
    const groupRef = doc(db, "groups", groupId)
    const snap = await getDoc(groupRef)
    if (!snap.exists()) throw new Error("Group not found")

    const { members = [], memberIds = [] } = snap.data()
    if (memberIds.includes(member.userId)) return

    await setDoc(groupRef, {
      members: [...members, member],
      memberIds: [...memberIds, member.userId]
    }, { merge: true })
  } catch (error) {
    console.error("Error adding member to group:", error)
    throw error
  }
}

// ─── Splits ───────────────────────────────────────────────────────────────────

export const createSplit = async (groupId, payerId, { merchant, date, totalAmount, participants }) => {
  try {
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
  } catch (error) {
    console.error("Error creating split:", error)
    throw error
  }
}

export const getGroupSplits = async (groupId) => {
  try {
    const q = query(collection(db, "splits"), where("groupId", "==", groupId))
    const snap = await getDocs(q)
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  } catch (error) {
    console.error("Error fetching group splits:", error)
    throw error
  }
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

export const settleSplit = async (splitId, userId) => {
  try {
    const splitRef = doc(db, "splits", splitId)
    const snap = await getDoc(splitRef)
    if (!snap.exists()) throw new Error("Split not found")

    const { participants } = snap.data()
    const updated = participants.map((p) =>
      p.userId === userId ? { ...p, status: "settled" } : p
    )

    await setDoc(splitRef, { participants: updated }, { merge: true })
  } catch (error) {
    console.error("Error settling split:", error)
    throw error
  }
}

// ─── User Search ─────────────────────────────────────────────────────────────

export const searchUsersByEmail = async (email) => {
  if (!email) return []
  try {
    const q = query(collection(db, "users"), where("email", "==", email), limit(5))
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
      collection(db, "users"),
      where("displayName", ">=", name),
      where("displayName", "<=", name + ""),
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

export const createNotification = async (userId, notifData) => {
  try {
    const ref = collection(db, "users", userId, "notifications")
    await addDoc(ref, { ...notifData, read: false, createdAt: new Date().toISOString() })
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
