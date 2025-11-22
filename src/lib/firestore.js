import { db } from "./firebase"
import { collection, getDocs, query, orderBy, addDoc, doc, setDoc } from "firebase/firestore"

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

export const saveTransaction = async (userId, transactionData) => {
  if (!userId) throw new Error("User ID is required")

  try {
    // Ensure user document exists (optional but good practice)
    const userRef = doc(db, "users", userId)
    await setDoc(userRef, { email: transactionData.email || "", lastUpdated: new Date().toISOString() }, { merge: true })

    // Add transaction to subcollection
    const transactionsRef = collection(db, "users", userId, "transactions")
    const docRef = await addDoc(transactionsRef, {
      ...transactionData,
      createdAt: new Date().toISOString(),
      source: "scan"
    })
    
    return docRef.id
  } catch (error) {
    console.error("Error saving transaction:", error)
    throw error
  }
}
