import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { resolve } from "node:path";
import { FieldValue } from "firebase-admin/firestore";
import { firestore } from "../config/firebase.js";
import { backendRoot } from "../config/paths.js";
const file = resolve(
  backendRoot,
  process.env.DEMO_DATA_FILE || ".data/demo.json",
);
let local = {};
let queue = Promise.resolve();
if (!firestore) {
  try {
    local = JSON.parse(await readFile(file, "utf8"));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
}
function serialize(value) {
  return JSON.parse(
    JSON.stringify(value, (_key, v) =>
      v?.toDate ? v.toDate().toISOString() : v,
    ),
  );
}
function api(transaction, data) {
  const pending = [];
  return {
    pending,
    async get(collection, id) {
      if (firestore) {
        const ref = firestore.collection(collection).doc(id);
        const snap = await (transaction ? transaction.get(ref) : ref.get());
        return snap.exists ? serialize({ ...snap.data(), id: snap.id }) : null;
      }
      return data[collection]?.[id]
        ? structuredClone({ ...data[collection][id], id })
        : null;
    },
    async list(collection, filters = {}) {
      if (firestore) {
        let ref = firestore.collection(collection);
        for (const [key, value] of Object.entries(filters))
          ref = ref.where(key, "==", value);
        const snap = await (transaction ? transaction.get(ref) : ref.get());
        return snap.docs.map((d) => serialize({ ...d.data(), id: d.id }));
      }
      return Object.entries(data[collection] || {})
        .filter(([, row]) =>
          Object.entries(filters).every(([key, value]) => row[key] === value),
        )
        .map(([id, row]) => structuredClone({ ...row, id }));
    },
    async put(collection, id, value) {
      const clean = { ...value };
      delete clean.id;
      if (firestore) {
        clean.updatedAt = FieldValue.serverTimestamp();
        const ref = firestore.collection(collection).doc(id);
        const existing = await (transaction ? transaction.get(ref) : ref.get());
        if (existing.exists) delete clean.createdAt;
        else clean.createdAt = FieldValue.serverTimestamp();
        if (transaction)
          pending.push(() => transaction.set(ref, clean, { merge: true }));
        else await ref.set(clean, { merge: true });
      } else {
        data[collection] ||= {};
        data[collection][id] = {
          ...data[collection][id],
          ...clean,
          createdAt:
            clean.createdAt ||
            data[collection][id]?.createdAt ||
            new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      return { ...clean, id };
    },
    async delete(collection, id) {
      if (firestore) {
        const ref = firestore.collection(collection).doc(id);
        if (transaction) pending.push(() => transaction.delete(ref));
        else await ref.delete();
      } else delete data[collection]?.[id];
    },
  };
}
async function persist(data) {
  await mkdir(resolve(file, ".."), { recursive: true });
  await writeFile(file + ".tmp", JSON.stringify(data, null, 2));
  await rename(file + ".tmp", file);
}
export const store = {
  ...api(null, local),
  async transaction(fn) {
    if (firestore)
      return firestore.runTransaction(async (transaction) => {
        const tx = api(transaction);
        const result = await fn(tx);
        tx.pending.forEach((write) => write());
        return result;
      });
    const job = queue.then(async () => {
      const next = structuredClone(local);
      const result = await fn(api(null, next));
      await persist(next);
      for (const key of Object.keys(local)) delete local[key];
      Object.assign(local, next);
      return result;
    });
    queue = job.catch(() => {});
    return job;
  },
};
