// GDPR self-service: data export (Art. 15/20) and account erasure (Art. 17).
import { auth, db } from "./firebase"
import { collection, doc, getDoc, getDocs, query, where, writeBatch, setDoc } from "firebase/firestore"
import { GoogleAuthProvider, reauthenticateWithPopup, deleteUser } from "firebase/auth"
import { clearLocalUserData } from "./localData"

const docs = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }))

export async function exportUserData(uid) {
  const [userDoc, profileDoc, transactions, notifications, groups, splits] = await Promise.all([
    getDoc(doc(db, "users", uid)),
    getDoc(doc(db, "userProfiles", uid)),
    getDocs(collection(db, "users", uid, "transactions")),
    getDocs(collection(db, "users", uid, "notifications")),
    getDocs(query(collection(db, "groups"), where("memberIds", "array-contains", uid))),
    getDocs(query(collection(db, "splits"), where("participantIds", "array-contains", uid)))
  ])

  return {
    exportedAt: new Date().toISOString(),
    account: { uid, ...(userDoc.exists() ? userDoc.data() : {}) },
    publicProfile: profileDoc.exists() ? profileDoc.data() : null,
    transactions: docs(transactions),
    notifications: docs(notifications),
    groups: docs(groups),
    // shareToken is an internal capability string, not personal data
    splits: docs(splits).map((split) => { const copy = { ...split }; delete copy.shareToken; return copy })
  }
}

export function downloadJson(data, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }))
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function deleteAll(refs) {
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db)
    refs.slice(i, i + 400).forEach((ref) => batch.delete(ref))
    await batch.commit()
  }
}

// Removes the user's own data and the sign-in account.
// Shared split records stay with the other group members (see Privacy Policy §5).
export async function deleteAccount() {
  const user = auth.currentUser
  if (!user) throw new Error("Not signed in")
  const uid = user.uid

  // Deleting a sign-in account requires a recent login — confirm identity before touching any data
  await reauthenticateWithPopup(user, new GoogleAuthProvider())

  // Groups: delete the ones only this user is in (with their splits), leave the rest
  const groups = await getDocs(query(collection(db, "groups"), where("memberIds", "array-contains", uid)))
  for (const g of groups.docs) {
    const { members = [], memberIds = [], createdBy } = g.data()
    if (memberIds.length === 1 && createdBy === uid) {
      const splits = await getDocs(query(collection(db, "splits"), where("groupId", "==", g.id)))
      await deleteAll([...splits.docs.map((d) => d.ref), g.ref])
    } else {
      await setDoc(g.ref, {
        members: members.filter((m) => m.userId !== uid),
        memberIds: memberIds.filter((id) => id !== uid)
      }, { merge: true })
    }
  }

  const [transactions, notifications] = await Promise.all([
    getDocs(collection(db, "users", uid, "transactions")),
    getDocs(collection(db, "users", uid, "notifications"))
  ])
  await deleteAll([
    ...transactions.docs.map((d) => d.ref),
    ...notifications.docs.map((d) => d.ref),
    doc(db, "userProfiles", uid),
    doc(db, "users", uid)
  ])

  clearLocalUserData()
  await deleteUser(user)
}
