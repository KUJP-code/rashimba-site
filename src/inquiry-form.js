let recaptchaLoader;

export function getRecaptchaToken(siteKey, action) {
  if (!siteKey) return Promise.resolve('');
  recaptchaLoader ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => reject(new Error('認証を読み込めませんでした。もう一度お試しください。')));
    document.head.append(script);
  }).catch((error) => {
    recaptchaLoader = undefined;
    throw error;
  });
  let timeout;
  return Promise.race([
    recaptchaLoader.then(() => new Promise((resolve, reject) => {
      window.grecaptcha.ready(() => {
        window.grecaptcha.execute(siteKey, { action }).then(resolve, reject);
      });
    })),
    new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error('認証がタイムアウトしました。もう一度お試しください。')), 15000);
    }),
  ]).finally(() => clearTimeout(timeout));
}

export function initInquiryForm(form, {
  apiBaseUrl = 'https://kids-up.app',
  endpoint,
  action,
  siteKey = '',
  fetchRequest = (...args) => fetch(...args),
  captchaToken = getRecaptchaToken,
  onAccepted = () => {},
} = {}) {
  if (!form) return;
  form.action = `${apiBaseUrl.replace(/\/$/, '')}${endpoint}`;
  const button = form.querySelector('button[type="submit"]');
  const originalText = button.textContent;
  const status = document.createElement('p');
  status.className = 'form-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.tabIndex = -1;
  form.append(status);
  let busy = false;
  let submissionKey;
  let previousPayload;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    const payload = Object.fromEntries(new FormData(form));
    const fingerprint = JSON.stringify(payload);
    if (!submissionKey || fingerprint !== previousPayload) {
      submissionKey = crypto.randomUUID();
      previousPayload = fingerprint;
    }
    payload.submission_key = submissionKey;
    busy = true;
    button.disabled = true;
    button.textContent = '送信中…';
    status.textContent = '';
    status.dataset.state = '';
    form.setAttribute('aria-busy', 'true');
    let timeout;
    try {
      payload.recaptcha_token = await captchaToken(siteKey, action);
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 20000);
      const response = await fetchRequest(form.action, {
        method: 'POST', credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal: controller.signal,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 409) submissionKey = undefined;
        const fallback = response.status === 429
          ? '送信回数の上限に達しました。時間をおいてお試しください。'
          : '送信できませんでした。入力内容を確認し、時間をおいてお試しください。';
        throw new Error(Array.isArray(result.errors) && result.errors.length ? result.errors.join(' / ') : fallback);
      }
      if (response.status !== 202 || result.status !== 'accepted') {
        throw new Error('送信結果を確認できませんでした。時間をおいてもう一度お試しください。');
      }
      status.textContent = result.message || '送信を受け付けました。確認メールをお送りします。';
      status.dataset.state = 'success';
      if (JSON.stringify(Object.fromEntries(new FormData(form))) === fingerprint) form.reset();
      submissionKey = undefined;
      previousPayload = undefined;
      // Optional reporting must never turn an accepted inquiry into a form error.
      try { onAccepted(); } catch { /* Analytics may be blocked or unavailable. */ }
    } catch (error) {
      status.textContent = error.name === 'AbortError' || error instanceof TypeError
        ? '通信できませんでした。入力内容は保存されています。もう一度お試しください。'
        : error.message;
      status.dataset.state = 'error';
    } finally {
      clearTimeout(timeout);
      busy = false;
      button.disabled = false;
      button.textContent = originalText;
      form.setAttribute('aria-busy', 'false');
      status.focus();
    }
  });
}
