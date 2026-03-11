(function () {
  const {
    AUTH_STORAGE_KEY,
    API_KEY_STORAGE_KEY,
    OVERLAY_ENABLED_KEY,
    SUPABASE_VERIFY_URL,
    getExtApi
  } = window.BMLExt || {};

  const ext = getExtApi?.();
  if (!ext || !AUTH_STORAGE_KEY || !API_KEY_STORAGE_KEY || !OVERLAY_ENABLED_KEY || !SUPABASE_VERIFY_URL) return;

  const apiInput = document.getElementById('apiKey');
  const saveBtn = document.getElementById('saveBtn');
  const overlayToggle = document.getElementById('overlayToggle');
  const messageEl = document.getElementById('message');
  const usernameEl = document.getElementById('username');
  const userIdEl = document.getElementById('userId');
  const subscriptionEl = document.getElementById('subscription');
  const validUntilEl = document.getElementById('validUntil');

  function setMessage(text, isError) {
    messageEl.textContent = text;
    messageEl.classList.toggle('error', Boolean(isError));
  }

  function setStorage(data) {
    return new Promise((resolve) => ext.storage.local.set(data, resolve));
  }

  function getStorage(keys) {
    return new Promise((resolve) => ext.storage.local.get(keys, resolve));
  }

  function renderAuth(auth) {
    usernameEl.textContent = auth?.username || '-';
    userIdEl.textContent = auth?.userId ? String(auth.userId) : '-';
    subscriptionEl.textContent = auth?.subscriptionValid ? 'Active' : 'Inactive';
    validUntilEl.textContent = auth?.validUntil ? new Date(auth.validUntil).toLocaleString() : '-';
  }

  async function verifyApiKey(apiKey) {
    const response = await fetch(SUPABASE_VERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ apiKey })
    });

    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error || 'Verification failed');
    return payload;
  }

  async function loadInitial() {
    const data = await getStorage([API_KEY_STORAGE_KEY, AUTH_STORAGE_KEY, OVERLAY_ENABLED_KEY]);
    if (data[API_KEY_STORAGE_KEY]) apiInput.value = data[API_KEY_STORAGE_KEY];
    renderAuth(data[AUTH_STORAGE_KEY]);
    overlayToggle.checked = data[OVERLAY_ENABLED_KEY] !== false;
  }

  overlayToggle.addEventListener('change', async () => {
    await setStorage({ [OVERLAY_ENABLED_KEY]: overlayToggle.checked });
    setMessage(overlayToggle.checked ? 'BML Box enabled on Torn pages.' : 'BML Box hidden on Torn pages.');
  });

  saveBtn.addEventListener('click', async () => {
    const apiKey = apiInput.value.trim();
    if (!apiKey) {
      setMessage('Please enter your Torn API key.', true);
      return;
    }

    saveBtn.disabled = true;
    setMessage('Verifying subscription...');

    try {
      const result = await verifyApiKey(apiKey);
      const auth = {
        isAuthenticated: true,
        userId: result.userId,
        username: result.username,
        subscriptionValid: Boolean(result.subscriptionValid),
        validUntil: result.validUntil || null,
        checkedAt: Date.now()
      };

      await setStorage({
        [API_KEY_STORAGE_KEY]: apiKey,
        [AUTH_STORAGE_KEY]: auth
      });

      renderAuth(auth);
      setMessage(auth.subscriptionValid ? 'Signed in. Subscription is active.' : 'Signed in, but no active subscription.', !auth.subscriptionValid);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Verification failed';
      setMessage(message, true);
    } finally {
      saveBtn.disabled = false;
    }
  });

  loadInitial();
})();
