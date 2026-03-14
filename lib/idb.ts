export const DB_NAME = 'BMLDB';
export const DB_VERSION = 2; // Upgraded to v2
export const STORE_NAME = 'keyval';
export const TXN_STORE_NAME = 'transactions'; // New store for individual transactions

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB not available'));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (event.oldVersion < 1) {
        db.createObjectStore(STORE_NAME);
      }
      if (event.oldVersion < 2) {
        const txnStore = db.createObjectStore(TXN_STORE_NAME, { keyPath: 'id' });
        txnStore.createIndex('date', 'date', { unique: false });
        txnStore.createIndex('item', 'item', { unique: false });
      }
    };
  });
}

// ---- Legacy/Config keyval operations ----
export async function get<T = any>(key: string): Promise<T | undefined> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  } catch (e) {
    return undefined;
  }
}

export async function set(key: string, val: any): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(val, key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function del(key: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// ---- V2 Transactions operations ----
export async function getAllTransactions<T = any>(): Promise<T[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(TXN_STORE_NAME, 'readonly');
      const store = transaction.objectStore(TXN_STORE_NAME);
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  } catch (e) {
    console.warn("Failed to get transactions from IDB v2", e);
    return [];
  }
}

export async function saveTransactions(txns: any[]): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TXN_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(TXN_STORE_NAME);
    
    // Clear out old records entirely to ensure full sync with array state
    store.clear().onsuccess = () => {
      let count = 0;
      if (txns.length === 0) {
        resolve();
        return;
      }
      txns.forEach(txn => {
        const req = store.put(txn);
        req.onsuccess = () => {
          count++;
          if (count === txns.length) resolve();
        };
        req.onerror = () => reject(req.error);
      });
    };
    transaction.onerror = () => reject(transaction.error);
  });
}
