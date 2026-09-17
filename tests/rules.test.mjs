// Firestore rules tests for groups (add / leave / immutables) and in-app notifications.
// Run:  npm run test:rules   (starts the emulator, runs this file, shuts it down)
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing"
import { readFileSync } from "node:fs"
import { doc, setDoc, updateDoc, addDoc, collection, getDoc } from "firebase/firestore"

const PROJECT = "budgetmate-rules-test"
const env = await initializeTestEnvironment({
  projectId: PROJECT,
  firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 }
})

const alice = env.authenticatedContext("alice").firestore()
const bob = env.authenticatedContext("bob").firestore()
const carol = env.authenticatedContext("carol").firestore()
const mallory = env.authenticatedContext("mallory").firestore()

const member = (id) => ({ userId: id, displayName: id, email: `${id}@x.io`, photoURL: "" })
const baseGroup = {
  name: "Trip", createdBy: "alice", createdAt: "2026-09-17T00:00:00.000Z",
  members: [member("alice"), member("bob")], memberIds: ["alice", "bob"]
}

let passed = 0, failed = 0
async function check(name, fn) {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "groups", "g1"), baseGroup)
  })
  try { await fn(); passed++; console.log("  ok   ", name) }
  catch (e) { failed++; console.log("  FAIL ", name, "\n        ", e.message.split("\n")[0]) }
}

const gref = (dbx) => doc(dbx, "groups", "g1")
const withMembers = (ids, extra = {}) => ({ members: ids.map(member), memberIds: ids, ...extra })

console.log("groups/update")
await check("member adds a member", () =>
  assertSucceeds(updateDoc(gref(bob), withMembers(["alice", "bob", "carol"]))))
await check("outsider cannot add themselves", () =>
  assertFails(updateDoc(gref(mallory), withMembers(["alice", "bob", "mallory"]))))
await check("member cannot remove someone else", () =>
  assertFails(updateDoc(gref(bob), withMembers(["bob"]))))
await check("member cannot swap someone out while adding", () =>
  assertFails(updateDoc(gref(bob), withMembers(["bob", "carol", "dave"]))))
await check("member may leave (remove only self)", () =>
  assertSucceeds(updateDoc(gref(bob), withMembers(["alice"]))))
await check("creator may leave too", () =>
  assertSucceeds(updateDoc(gref(alice), withMembers(["bob"]))))
await check("members[] and memberIds must stay the same length", () =>
  assertFails(updateDoc(gref(bob), { members: [member("alice"), member("bob")], memberIds: ["alice", "bob", "carol"] })))
await check("duplicate ids are rejected", () =>
  assertFails(updateDoc(gref(bob), { members: [member("alice"), member("bob"), member("bob")], memberIds: ["alice", "bob", "bob"] })))
await check("cap of 20 members on update", async () => {
  const ids = ["alice", "bob", ...Array.from({ length: 19 }, (_, i) => `u${i}`)]
  await assertFails(updateDoc(gref(bob), withMembers(ids)))
  await assertSucceeds(updateDoc(gref(bob), withMembers(ids.slice(0, 20))))
})
await check("name is immutable on update", () =>
  assertFails(updateDoc(gref(bob), { ...withMembers(["alice", "bob", "carol"]), name: "Renamed" })))
await check("createdBy is immutable on update", () =>
  assertFails(updateDoc(gref(bob), { ...withMembers(["alice", "bob", "carol"]), createdBy: "bob" })))
await check("re-added member can read the group again", async () => {
  await assertSucceeds(updateDoc(gref(bob), withMembers(["alice"])))
  await assertFails(getDoc(gref(bob)))
  await assertSucceeds(updateDoc(gref(alice), withMembers(["alice", "bob"])))
  await assertSucceeds(getDoc(gref(bob)))
})

console.log("notifications/group_added")
const notif = (extra = {}) => ({
  type: "group_added", groupId: "g1", groupName: "Trip", addedByName: "bob",
  read: false, createdAt: "2026-09-17T00:00:00.000Z", ...extra
})
const notifsOf = (dbx, uid) => collection(dbx, "users", uid, "notifications")

await check("member notifies a newly added member", async () => {
  await updateDoc(gref(bob), withMembers(["alice", "bob", "carol"]))
  await assertSucceeds(addDoc(notifsOf(bob, "carol"), notif()))
})
await check("cannot notify someone who is not (yet) a member", () =>
  assertFails(addDoc(notifsOf(bob, "carol"), notif())))
await check("outsider cannot notify a member", () =>
  assertFails(addDoc(notifsOf(mallory, "alice"), notif({ addedByName: "mallory" }))))
await check("cannot notify yourself", () =>
  assertFails(addDoc(notifsOf(bob, "bob"), notif())))
await check("extra keys are rejected", async () => {
  await updateDoc(gref(bob), withMembers(["alice", "bob", "carol"]))
  await assertFails(addDoc(notifsOf(bob, "carol"), notif({ amount: 5 })))
})
await check("must be created unread", async () => {
  await updateDoc(gref(bob), withMembers(["alice", "bob", "carol"]))
  await assertFails(addDoc(notifsOf(bob, "carol"), notif({ read: true })))
})
await check("recipient reads their own notification; others cannot", async () => {
  await updateDoc(gref(bob), withMembers(["alice", "bob", "carol"]))
  const ref = await addDoc(notifsOf(bob, "carol"), notif())
  await assertSucceeds(getDoc(doc(carol, "users", "carol", "notifications", ref.id)))
  await assertFails(getDoc(doc(bob, "users", "carol", "notifications", ref.id)))
})

console.log("notifications/split_added (regression)")
await check("payer notifies a participant", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "splits", "s1"), {
      groupId: "g1", payerId: "alice", participantIds: ["alice", "bob"], totalAmount: 10,
      participants: [{ userId: "alice", amount: 5, status: "settled" }, { userId: "bob", amount: 5, status: "pending" }],
      shares: { alice: 5, bob: 5 }
    })
  })
  await assertSucceeds(addDoc(notifsOf(alice, "bob"), {
    type: "split_added", splitId: "s1", groupId: "g1", groupName: "Trip", payerName: "alice",
    merchant: "Cafe", amount: 5, read: false, createdAt: "2026-09-17T00:00:00.000Z"
  }))
})

await env.cleanup()
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
