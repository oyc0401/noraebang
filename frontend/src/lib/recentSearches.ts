const DB_NAME = "song-search";
const STORE_NAME = "recent-searches";
const DB_VERSION = 1;
const MAX_ITEMS = 20;

interface RecentSearchRecord {
  query: string;
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "query" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveRecentSearch(query: string): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed) return;

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const getAllReq = store.getAll();
    getAllReq.onsuccess = () => {
      const all: RecentSearchRecord[] = getAllReq.result;

      store.delete(trimmed);
      store.put({ query: trimmed, timestamp: Date.now() });

      const others = all.filter((item) => item.query !== trimmed);
      if (others.length >= MAX_ITEMS) {
        others.sort((a, b) => a.timestamp - b.timestamp);
        for (const item of others.slice(0, others.length - MAX_ITEMS + 1)) {
          store.delete(item.query);
        }
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getRecentSearches(): Promise<string[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => {
      const all: RecentSearchRecord[] = req.result;
      resolve(
        all
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, MAX_ITEMS)
          .map((item) => item.query),
      );
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteRecentSearch(query: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(query);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
