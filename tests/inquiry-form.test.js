import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { getRecaptchaToken, initInquiryForm } from '../src/inquiry-form.js';

const originalDocument = globalThis.document;
const originalFormData = globalThis.FormData;

beforeEach(() => {
  globalThis.document = {
    createElement: () => ({ dataset: {}, setAttribute() {}, focus() {} }),
  };
  globalThis.FormData = class {
    constructor(form) { this.values = Object.entries(form.values); }
    [Symbol.iterator]() { return this.values[Symbol.iterator](); }
  };
});
afterEach(() => {
  globalThis.document = originalDocument;
  globalThis.FormData = originalFormData;
});

function makeForm() {
  return {
    values: { email: 'parent@example.com', child_age: '3-5', privacy_consent: 'agreed', website: '' },
    button: { textContent: 'Send', disabled: false },
    resetCount: 0,
    valid: true,
    querySelector() { return this.button; },
    append(status) { this.status = status; },
    setAttribute() {},
    reportValidity() { return this.valid; },
    addEventListener(_event, handler) { this.submit = () => handler({ preventDefault() {} }); },
    reset() { this.resetCount += 1; },
  };
}

const accepted = () => ({ ok: true, status: 202, json: async () => ({ status: 'accepted', message: 'Accepted' }) });
const defaults = {
  endpoint: '/api/rashimba/release_notifications',
  action: 'rashimba_release_notification',
  siteKey: 'public-key',
  captchaToken: async (key, action) => {
    assert.equal(key, 'public-key');
    assert.equal(action, 'rashimba_release_notification');
    return 'fresh-token';
  },
};

test('submits the form contract without cookies, then resets after acceptance', async () => {
  const form = makeForm();
  let captured;
  initInquiryForm(form, { ...defaults, fetchRequest: async (url, options) => {
    captured = { url, ...options, payload: JSON.parse(options.body) };
    assert.equal(form.button.disabled, true);
    return accepted();
  } });
  await form.submit();
  assert.equal(captured.url, 'https://kids-up.app/api/rashimba/release_notifications');
  assert.equal(captured.credentials, 'omit');
  assert.equal(captured.method, 'POST');
  assert.equal(captured.payload.privacy_consent, 'agreed');
  assert.equal(captured.payload.child_age, '3-5');
  assert.equal(captured.payload.recaptcha_token, 'fresh-token');
  assert.match(captured.payload.submission_key, /^[0-9a-f-]{36}$/);
  assert.equal(form.resetCount, 1);
  assert.equal(form.status.textContent, 'Accepted');
  assert.equal(form.button.disabled, false);
});

test('reuses the UUID after a lost response and changes it when input changes', async () => {
  const form = makeForm();
  const keys = [];
  initInquiryForm(form, { ...defaults, fetchRequest: async (_url, options) => {
    keys.push(JSON.parse(options.body).submission_key);
    throw new TypeError('Network failed');
  } });
  await form.submit();
  assert.equal(form.resetCount, 0);
  assert.equal(form.values.email, 'parent@example.com');
  assert.equal(form.status.dataset.state, 'error');
  await form.submit();
  assert.equal(keys[0], keys[1]);
  form.values.email = 'another@example.com';
  await form.submit();
  assert.notEqual(keys[1], keys[2]);
});

test('keeps values and displays API validation errors', async () => {
  const form = makeForm();
  initInquiryForm(form, { ...defaults, fetchRequest: async () => ({
    ok: false, status: 422, json: async () => ({ errors: ['Consent is required'] }),
  }) });
  await form.submit();
  assert.equal(form.status.textContent, 'Consent is required');
  assert.equal(form.resetCount, 0);
  assert.equal(form.button.disabled, false);
});

test('does not submit twice while the first request is running', async () => {
  const form = makeForm();
  let finish;
  let calls = 0;
  const response = new Promise((resolve) => { finish = resolve; });
  initInquiryForm(form, { ...defaults, fetchRequest: async () => {
    calls += 1;
    return response;
  } });
  const first = form.submit();
  await form.submit();
  finish(accepted());
  await first;
  assert.equal(calls, 1);
});

test('does not call the API when browser validation or CAPTCHA fails', async () => {
  const form = makeForm();
  let calls = 0;
  initInquiryForm(form, { ...defaults, captchaToken: async () => { throw new Error('CAPTCHA failed'); },
    fetchRequest: async () => { calls += 1; return accepted(); } });
  form.valid = false;
  await form.submit();
  assert.equal(calls, 0);
  form.valid = true;
  await form.submit();
  assert.equal(calls, 0);
  assert.equal(form.resetCount, 0);
  assert.equal(form.status.textContent, 'CAPTCHA failed');
});

test('does not claim success for an unexpected HTML or JSON response', async () => {
  const form = makeForm();
  initInquiryForm(form, { ...defaults, fetchRequest: async () => ({
    ok: true, status: 200, json: async () => { throw new SyntaxError('HTML'); },
  }) });
  await form.submit();
  assert.equal(form.resetCount, 0);
  assert.equal(form.status.dataset.state, 'error');
});

test('preserves edits made while an earlier submission is pending', async () => {
  const form = makeForm();
  let finish;
  const response = new Promise((resolve) => { finish = resolve; });
  initInquiryForm(form, { ...defaults, fetchRequest: async () => response });
  const submitting = form.submit();
  form.values.email = 'edited@example.com';
  finish(accepted());
  await submitting;
  assert.equal(form.resetCount, 0);
  assert.equal(form.values.email, 'edited@example.com');
});

test('submits without loading reCAPTCHA when no site key is configured', async () => {
  const form = makeForm();
  let captured;
  initInquiryForm(form, { ...defaults, siteKey: '', captchaToken: getRecaptchaToken,
    fetchRequest: async (_url, options) => {
      captured = JSON.parse(options.body);
      return accepted();
    },
  });
  await form.submit();
  assert.equal(captured.recaptcha_token, '');
  assert.equal(form.status.dataset.state, 'success');
  assert.equal(form.resetCount, 1);
});

test('reports an accepted submission once, without passing any form data to the callback', async () => {
  const form = makeForm();
  const calls = [];
  initInquiryForm(form, { ...defaults, fetchRequest: async () => accepted(),
    onAccepted: (...args) => calls.push(args),
  });
  await form.submit();
  assert.deepEqual(calls, [[]]);
});

test('failed, invalid, and unexpected responses never report a successful conversion', async () => {
  for (const fetchRequest of [
    async () => { throw new TypeError('Network failed'); },
    async () => ({ ok: false, status: 422, json: async () => ({}) }),
    async () => ({ ok: true, status: 200, json: async () => ({}) }),
  ]) {
    const form = makeForm();
    let calls = 0;
    initInquiryForm(form, { ...defaults, fetchRequest, onAccepted: () => { calls += 1; } });
    await form.submit();
    assert.equal(calls, 0);
    form.valid = false;
    await form.submit();
    assert.equal(calls, 0);
  }
});

test('analytics errors cannot change an accepted submission into a form failure', async () => {
  const form = makeForm();
  initInquiryForm(form, { ...defaults, fetchRequest: async () => accepted(),
    onAccepted: () => { throw new Error('Analytics blocked'); },
  });
  await form.submit();
  assert.equal(form.status.dataset.state, 'success');
  assert.equal(form.status.textContent, 'Accepted');
  assert.equal(form.resetCount, 1);
  assert.equal(form.button.disabled, false);
});
