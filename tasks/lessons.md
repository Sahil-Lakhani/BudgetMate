# Lessons

- **Plan ↔ code drift:** the original groups plan (Task 15) prescribed `useState(location.state?.groupId || null)` in `Scan.jsx`; the committed code used `useState(null)` and the tracker still marked the task done. After finishing a task, diff the code against the plan step, not just against "it compiles".
- **Cross-user writes need a rules test, not a read-through.** Any client write to another user's path (`users/{other}/notifications`) must be exercised against `firestore.rules` with a *second* identity before calling it done. The emulator + `@firebase/rules-unit-testing` makes this a 30-second check.
- **List queries are evaluated against rules for every matching doc.** A `where("groupId","==",…)` query fails entirely if *one* result is unreadable. When a read rule is narrower than the query, either widen the rule (`get()` on the parent) or narrow the query.
- **Decouple side effects from the primary write.** Notifications after `createSplit` must be `allSettled` — a failed side effect surfacing as "save failed" leads users to retry and duplicate data.
