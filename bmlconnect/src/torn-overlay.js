(function () {
  const {
    EXT_STORAGE_KEY,
    AUTH_STORAGE_KEY,
    OVERLAY_ENABLED_KEY,
    OVERLAY_POSITION_KEY,
    getExtApi,
    formatMoney
  } = window.BMLExt || {};
  const ext = getExtApi?.();

  if (!ext || !EXT_STORAGE_KEY || !AUTH_STORAGE_KEY || !OVERLAY_ENABLED_KEY || !OVERLAY_POSITION_KEY || !formatMoney) return;

  const ROOT_ID = 'bml-cost-basis-root';
  const TOGGLE_ID = 'bml-cost-basis-toggle';

  function titleCase(item) {
    return item
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  function getStorage(keys) {
    return new Promise((resolve) => {
      ext.storage.local.get(keys, (result) => resolve(result || {}));
    });
  }

  function setStorage(data) {
    return new Promise((resolve) => {
      ext.storage.local.set(data, resolve);
    });
  }

  function ensureToggleButton() {
    const existing = document.getElementById(TOGGLE_ID);
    if (existing) return existing;

    const btn = document.createElement('button');
    btn.id = TOGGLE_ID;
    btn.textContent = 'Show BML';
    btn.style.position = 'fixed';
    btn.style.top = '20px';
    btn.style.right = '20px';
    btn.style.zIndex = '999998';
    btn.style.border = 'none';
    btn.style.borderRadius = '8px';
    btn.style.padding = '8px 10px';
    btn.style.background = '#3a78f2';
    btn.style.color = '#fff';
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '12px';
    btn.style.display = 'none';
    btn.addEventListener('click', async () => {
      await setStorage({ [OVERLAY_ENABLED_KEY]: true });
    });

    document.body.appendChild(btn);
    return btn;
  }

  function ensureRoot() {
    const existing = document.getElementById(ROOT_ID);
    if (existing) return existing;

    const root = document.createElement('div');
    root.id = ROOT_ID;
    root.style.position = 'fixed';
    root.style.top = '20px';
    root.style.right = '20px';
    root.style.zIndex = '999999';
    root.style.width = '340px';
    root.style.maxHeight = '70vh';
    root.style.overflow = 'hidden';
    root.style.background = 'rgba(14, 17, 22, 0.95)';
    root.style.border = '1px solid rgba(255,255,255,0.15)';
    root.style.borderRadius = '10px';
    root.style.boxShadow = '0 10px 30px rgba(0,0,0,0.4)';
    root.style.fontFamily = 'Inter, system-ui, sans-serif';
    root.style.color = '#f4f6f8';

    document.body.appendChild(root);
    return root;
  }

  function applyPosition(root, pos) {
    if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') return;
    root.style.left = `${pos.x}px`;
    root.style.top = `${pos.y}px`;
    root.style.right = 'auto';
  }

  function enableDrag(root) {
    const handle = document.getElementById('bml-drag-handle');
    if (!handle) return;

    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    handle.onmousedown = (event) => {
      dragging = true;
      const rect = root.getBoundingClientRect();
      offsetX = event.clientX - rect.left;
      offsetY = event.clientY - rect.top;
      document.body.style.userSelect = 'none';
    };

    document.onmousemove = (event) => {
      if (!dragging) return;
      const x = Math.max(0, event.clientX - offsetX);
      const y = Math.max(0, event.clientY - offsetY);
      root.style.left = `${x}px`;
      root.style.top = `${y}px`;
      root.style.right = 'auto';
    };

    document.onmouseup = async () => {
      if (!dragging) return;
      dragging = false;
      document.body.style.userSelect = '';
      const rect = root.getBoundingClientRect();
      await setStorage({ [OVERLAY_POSITION_KEY]: { x: Math.round(rect.left), y: Math.round(rect.top) } });
    };
  }

  function renderUnauthorized(root, auth) {
    const username = auth?.username || 'Not signed in';
    const until = auth?.validUntil ? new Date(auth.validUntil).toLocaleString() : 'No active subscription';

    root.innerHTML = `
      <div id="bml-drag-handle" style="cursor:move;padding:10px 12px;background:rgba(255,255,255,0.05);border-bottom:1px solid rgba(255,255,255,0.1);font-weight:600;font-size:13px;display:flex;justify-content:space-between;align-items:center;">
        <span>BML Connect</span>
        <button id="bml-hide-btn" style="border:none;background:#444;color:#fff;border-radius:6px;padding:4px 8px;font-size:12px;cursor:pointer">Hide</button>
      </div>
      <div style="padding:10px 12px;font-size:12px;line-height:1.5;">
        <div>Signed in: <strong>${username}</strong></div>
        <div>Subscription: <strong>Inactive</strong></div>
        <div>Valid until: ${until}</div>
        <div style="margin-top:8px;color:rgba(255,255,255,0.75)">Open extension popup to update API key and subscription.</div>
      </div>
    `;
  }

  function renderSubscribed(root, payload, auth) {
    const synced = payload.syncedAt ? new Date(payload.syncedAt).toLocaleString() : 'Unknown';
    const rows = payload.items.slice(0, 40).map((entry) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.08)">${titleCase(entry.item)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:right">${entry.stock}</td>
        <td style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:right">$${formatMoney(entry.avgCost)}</td>
      </tr>
    `).join('');

    root.innerHTML = `
      <div id="bml-drag-handle" style="cursor:move;padding:10px 12px;background:rgba(255,255,255,0.05);border-bottom:1px solid rgba(255,255,255,0.1);font-weight:600;font-size:13px;display:flex;justify-content:space-between;align-items:center;">
        <span>BML Connect • ${auth?.username || 'Unknown'}</span>
        <button id="bml-hide-btn" style="border:none;background:#444;color:#fff;border-radius:6px;padding:4px 8px;font-size:12px;cursor:pointer">Hide</button>
      </div>
      <div style="padding:8px 10px;font-size:11px;color:rgba(255,255,255,0.7)">Last sync: ${synced}</div>
      <div style="max-height:52vh;overflow:auto;padding:0 8px 8px;">
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr>
              <th style="text-align:left;padding:6px 8px;color:rgba(255,255,255,0.8)">Item</th>
              <th style="text-align:right;padding:6px 8px;color:rgba(255,255,255,0.8)">Stock</th>
              <th style="text-align:right;padding:6px 8px;color:rgba(255,255,255,0.8)">Avg Cost</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="3" style="padding:8px">No open stock positions.</td></tr>'}</tbody>
        </table>
      </div>
    `;
  }

  async function loadAndRender() {
    const toggle = ensureToggleButton();
    const root = ensureRoot();

    const data = await getStorage([EXT_STORAGE_KEY, AUTH_STORAGE_KEY, OVERLAY_ENABLED_KEY, OVERLAY_POSITION_KEY]);
    const payload = data[EXT_STORAGE_KEY];
    const auth = data[AUTH_STORAGE_KEY];
    const enabled = data[OVERLAY_ENABLED_KEY] !== false;

    if (!enabled) {
      root.style.display = 'none';
      toggle.style.display = 'block';
      return;
    }

    toggle.style.display = 'none';
    root.style.display = 'block';
    applyPosition(root, data[OVERLAY_POSITION_KEY]);

    if (!auth?.isAuthenticated || !auth?.subscriptionValid) {
      renderUnauthorized(root, auth);
    } else if (!payload || !Array.isArray(payload.items)) {
      root.innerHTML = '<div style="padding:12px">No synced cost-basis yet. Open blackmarketledger.web.app first.</div>';
    } else {
      renderSubscribed(root, payload, auth);
    }

    document.getElementById('bml-hide-btn')?.addEventListener('click', async () => {
      await setStorage({ [OVERLAY_ENABLED_KEY]: false });
    });

    enableDrag(root);
  }

  ext.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[EXT_STORAGE_KEY] || changes[AUTH_STORAGE_KEY] || changes[OVERLAY_ENABLED_KEY] || changes[OVERLAY_POSITION_KEY]) {
      loadAndRender();
    }
  });

  loadAndRender();
})();
