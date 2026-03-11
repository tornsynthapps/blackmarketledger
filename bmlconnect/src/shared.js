(function () {
  const LEDGER_KEY = 'torn_invest_tracker_logs';
  const EXT_STORAGE_KEY = 'bml_cost_basis';
  const AUTH_STORAGE_KEY = 'bml_auth';
  const API_KEY_STORAGE_KEY = 'bml_api_key';
  const OVERLAY_ENABLED_KEY = 'bml_overlay_enabled';
  const OVERLAY_POSITION_KEY = 'bml_overlay_position';

  const SUPABASE_VERIFY_URL = 'https://yxjmnkaollkpcvymiicd.supabase.co/functions/v1/verify-subscription';

  function getExtApi() {
    if (typeof browser !== 'undefined' && browser.storage?.local) return browser;
    if (typeof chrome !== 'undefined' && chrome.storage?.local) return chrome;
    return null;
  }

  function calculateCostBasis(transactions) {
    const inventory = new Map();

    for (const t of transactions) {
      if (!t || !t.type) continue;
      if (t.type !== 'BUY' && t.type !== 'SELL') continue;

      const item = String(t.item || '').trim().toLowerCase();
      if (!item) continue;

      const current = inventory.get(item) || {
        stock: 0,
        totalCost: 0,
        avgCost: 0,
        normal: { stock: 0, totalCost: 0, avgCost: 0 },
        abroad: { stock: 0, totalCost: 0, avgCost: 0 }
      };

      const amount = Number(t.amount) || 0;
      const price = Number(t.price) || 0;
      const isAbroad = t.tag === 'Abroad';

      if (t.type === 'BUY') {
        current.stock += amount;
        current.totalCost += price * amount;

        if (isAbroad) {
          current.abroad.stock += amount;
          current.abroad.totalCost += price * amount;
          current.abroad.avgCost = current.abroad.stock > 0 ? current.abroad.totalCost / current.abroad.stock : 0;
        } else {
          current.normal.stock += amount;
          current.normal.totalCost += price * amount;
          current.normal.avgCost = current.normal.stock > 0 ? current.normal.totalCost / current.normal.stock : 0;
        }
      }

      if (t.type === 'SELL') {
        const avgCost = current.stock > 0 ? current.totalCost / current.stock : 0;
        current.stock -= amount;
        current.totalCost -= avgCost * amount;

        if (isAbroad) {
          const segAvg = current.abroad.stock > 0 ? current.abroad.totalCost / current.abroad.stock : 0;
          current.abroad.stock -= amount;
          current.abroad.totalCost -= segAvg * amount;
          current.abroad.avgCost = current.abroad.stock > 0 ? current.abroad.totalCost / current.abroad.stock : 0;
        } else {
          const segAvg = current.normal.stock > 0 ? current.normal.totalCost / current.normal.stock : 0;
          current.normal.stock -= amount;
          current.normal.totalCost -= segAvg * amount;
          current.normal.avgCost = current.normal.stock > 0 ? current.normal.totalCost / current.normal.stock : 0;
        }
      }

      current.avgCost = current.stock > 0 ? current.totalCost / current.stock : 0;
      inventory.set(item, current);
    }

    const items = [];
    inventory.forEach((value, item) => {
      if (value.stock <= 0) return;
      items.push({ item, ...value });
    });

    items.sort((a, b) => a.item.localeCompare(b.item));

    return {
      version: 1,
      syncedAt: Date.now(),
      sourceStorageKey: LEDGER_KEY,
      items
    };
  }

  function formatMoney(value) {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value || 0);
  }

  window.BMLExt = {
    LEDGER_KEY,
    EXT_STORAGE_KEY,
    AUTH_STORAGE_KEY,
    API_KEY_STORAGE_KEY,
    OVERLAY_ENABLED_KEY,
    OVERLAY_POSITION_KEY,
    SUPABASE_VERIFY_URL,
    getExtApi,
    calculateCostBasis,
    formatMoney
  };
})();
