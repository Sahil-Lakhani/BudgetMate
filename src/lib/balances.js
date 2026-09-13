// Pure balance math over split documents. Settled shares contribute nothing.

const round2 = (n) => Math.round(n * 100) / 100

/**
 * @param {Array} splits  split docs ({ payerId, participants: [{ userId, displayName, amount, status }] })
 * @param {string} me     current user's uid
 * @returns {{ youOwe: number, owedToYou: number, net: number,
 *            byMember: Record<string, { displayName: string, amount: number }> }}
 *          byMember amount: positive = they owe me, negative = I owe them
 */
export function computeBalances(splits, me) {
  let youOwe = 0
  let owedToYou = 0
  const byMember = {}

  const add = (userId, displayName, delta) => {
    if (!byMember[userId]) byMember[userId] = { displayName: displayName || "", amount: 0 }
    byMember[userId].amount += delta
    if (displayName && !byMember[userId].displayName) byMember[userId].displayName = displayName
  }

  for (const s of splits || []) {
    const participants = s.participants || []
    if (s.payerId === me) {
      for (const p of participants) {
        if (p.userId === me || p.status === "settled") continue
        owedToYou += p.amount
        add(p.userId, p.displayName, p.amount)
      }
    } else {
      const mine = participants.find((p) => p.userId === me)
      if (!mine || mine.status === "settled") continue
      youOwe += mine.amount
      const payer = participants.find((p) => p.userId === s.payerId)
      add(s.payerId, payer?.displayName, -mine.amount)
    }
  }

  for (const k of Object.keys(byMember)) {
    byMember[k].amount = round2(byMember[k].amount)
    if (byMember[k].amount === 0) delete byMember[k]
  }

  youOwe = round2(youOwe)
  owedToYou = round2(owedToYou)
  return { youOwe, owedToYou, net: round2(owedToYou - youOwe), byMember }
}
