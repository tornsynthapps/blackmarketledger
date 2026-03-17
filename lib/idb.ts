export const DB_VERSION = 2;
export const STORE_NAME = 'keyval';
export const TXN_STORE_NAME = 'transactions';
const IDB_TIMEOUT_MS = 1500;

export type DBName = 'LogsDB' | 'GoogleCacheLogsDB';

function withTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, IDB_TIMEOUT_MS);

    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

function getDB(dbName: DBName): Promise<IDBDatabase> {
  return withTimeout(new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB not available'));
    const request = indexedDB.open(dbName, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`IndexedDB open blocked for ${dbName}`));
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
  }), `IndexedDB open timed out for ${dbName}`);
}

// ---- Key-Value operations ----
export async function get<T = any>(dbName: DBName, key: string): Promise<T | undefined> {
  try {
    const db = await getDB(dbName);
    return await withTimeout(new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    }), `IndexedDB read timed out for ${dbName}`);
  } catch (e) {
    return undefined;
  }
}

export async function set(dbName: DBName, key: string, val: any): Promise<void> {
  const db = await getDB(dbName);
  return withTimeout(new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(val, key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  }), `IndexedDB write timed out for ${dbName}`);
}

export async function del(dbName: DBName, key: string): Promise<void> {
  const db = await getDB(dbName);
  return withTimeout(new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  }), `IndexedDB delete timed out for ${dbName}`);
}

// ---- Transactions operations ----
export async function getAllTransactions<T = any>(dbName: DBName): Promise<T[]> {
  try {
    const db = await getDB(dbName);
    return await withTimeout(new Promise((resolve, reject) => {
      const transaction = db.transaction(TXN_STORE_NAME, 'readonly');
      const store = transaction.objectStore(TXN_STORE_NAME);
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    }), `IndexedDB transaction read timed out for ${dbName}`);
  } catch (e) {
    console.warn(`Failed to get transactions from ${dbName}`, e);
    return [];
  }
}

export async function saveTransactions(dbName: DBName, txns: any[]): Promise<void> {
  const db = await getDB(dbName);
  return withTimeout(new Promise((resolve, reject) => {
    const transaction = db.transaction(TXN_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(TXN_STORE_NAME);
    
    store.clear().onsuccess = () => {
      if (txns.length === 0) {
        resolve();
        return;
      }
      let count = 0;
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
  }), `IndexedDB transaction write timed out for ${dbName}`);
}

// ---- Migration Utilities ----
export async function dbExists(dbName: string): Promise<boolean> {
  if (typeof indexedDB === 'undefined') return false;
  try {
    if ('databases' in indexedDB) {
      const dbs = await indexedDB.databases();
      return dbs.some(db => db.name === dbName);
    }
  } catch (e) {
    // Fallback if databases() fails
  }
  
  // Fallback for browsers that don't support databases()
  return new Promise((resolve) => {
    const request = indexedDB.open(dbName);
    let existed = true;
    request.onupgradeneeded = (e) => {
      if (e.oldVersion === 0) {
        existed = false;
        (request as any).transaction.abort();
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      db.close();
      resolve(existed);
    };
    request.onerror = () => resolve(false);
  });
}

export async function deleteDatabase(dbName: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(dbName);
    
    request.onerror = () => {
      console.error(`Error deleting database ${dbName}`, request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      console.log(`Database ${dbName} deleted successfully`);
      resolve();
    };
    
    request.onblocked = () => {
        console.warn(`Delete database ${dbName} blocked. Closing connections...`);
        // We resolve after a delay because even if blocked, it might eventually delete 
        // once the event loop processes connection closes.
        setTimeout(() => {
          console.warn(`Proceeding after blocked deletion of ${dbName}`);
          resolve();
        }, 1000);
    };
  });
}

export async function getLegacyTransactions(dbName: string): Promise<any[]> {
    try {
        const db = await withTimeout(new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(dbName);
            request.onerror = () => reject(request.error || new Error(`Failed to open ${dbName}`));
            request.onsuccess = () => {
                const database = request.result;
                database.onversionchange = () => database.close();
                resolve(database);
            };
        }), `Timeout opening legacy DB ${dbName}`);

        const txns = await withTimeout(new Promise<any[]>((resolve, reject) => {
            // Priority 1: Check if transactions store exists and has data
            if (db.objectStoreNames.contains(TXN_STORE_NAME)) {
                const transaction = db.transaction(TXN_STORE_NAME, 'readonly');
                const store = transaction.objectStore(TXN_STORE_NAME);
                const request = store.getAll();
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    if (request.result && request.result.length > 0) {
                        resolve(request.result);
                    } else if (!db.objectStoreNames.contains('keyval')) {
                        resolve([]);
                    } else {
                        // Fallback to keyval check if transactions was empty
                        checkKeyValStore(db, resolve, reject);
                    }
                };
            } else if (db.objectStoreNames.contains('keyval')) {
                checkKeyValStore(db, resolve, reject);
            } else {
                resolve([]);
            }
        }), `Timeout reading legacy txns from ${dbName}`);
        
        db.close();
        return txns;
    } catch (e) {
        console.warn(`Failed to read legacy transactions from ${dbName}`, e);
        return [];
    }
}

function checkKeyValStore(db: IDBDatabase, resolve: (value: any[]) => void, reject: (reason?: any) => void) {
    try {
        const transaction = db.transaction('keyval', 'readonly');
        const store = transaction.objectStore('keyval');
        const request = store.get('torn_invest_tracker_logs');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            if (typeof request.result === 'string') {
                try {
                    resolve(JSON.parse(request.result));
                } catch (e) {
                    resolve([]);
                }
            } else if (Array.isArray(request.result)) {
                resolve(request.result);
            } else {
                resolve([]);
            }
        };
    } catch (e) {
        resolve([]);
    }
}
