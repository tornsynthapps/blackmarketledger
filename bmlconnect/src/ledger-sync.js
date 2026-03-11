(function () {
  const { LEDGER_KEY, EXT_STORAGE_KEY, getExtApi, calculateCostBasis } = window.BMLExt || {};
  const ext = getExtApi?.();

  if (!ext || !LEDGER_KEY || !EXT_STORAGE_KEY || !calculateCostBasis) return;

  function readLedgerLogs() {
    const raw = window.localStorage.getItem(LEDGER_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function setStorage(payload) {
    return new Promise((resolve) => {
      ext.storage.local.set({ [EXT_STORAGE_KEY]: payload }, resolve);
    });
  }

  function digest(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0;
    }
    return String(hash);
  }

  let lastDigest = '';

  async function syncNow() {
    const raw = window.localStorage.getItem(LEDGER_KEY) || '[]';
    const nextDigest = digest(raw);
    if (nextDigest === lastDigest) return;

    lastDigest = nextDigest;
    const logs = readLedgerLogs();
    const payload = calculateCostBasis(logs);
    await setStorage(payload);
  }

  syncNow();
  window.addEventListener('focus', syncNow);
  window.addEventListener('storage', (event) => {
    if (event.key === LEDGER_KEY) syncNow();
  });
  setInterval(syncNow, 5000);
})();
