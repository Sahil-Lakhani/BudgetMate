import { db } from "./firebase"
import { collection, getDocs, query, orderBy } from "firebase/firestore"

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
