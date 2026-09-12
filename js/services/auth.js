// Authentication service for Cognito via BFF proxy
// Tokens stored in memory only (not localStorage) for security

let idToken = null;
let accessToken = null;
let refreshToken = null;
let user = null;
let refreshTimer = null;

export async function signup(email, password, name) {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Erro ao criar conta.');
  }
  return res.json();
}

export async function confirmSignup(email, code) {
  const res = await fetch('/api/auth/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Código inválido.');
  }
  return res.json();
}

export async function login(email, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Credenciais inválidas.');
  }
  const data = await res.json();
  setTokens(data);
  return data;
}

export function logout() {
  idToken = null;
  accessToken = null;
  refreshToken = null;
  user = null;
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = null;
  window.dispatchEvent(new CustomEvent('auth_logout'));
}

export async function refreshSession() {
  if (!refreshToken) throw new Error('Sem refresh token.');
  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  if (!res.ok) {
    logout();
    throw new Error('Sessão expirada. Faça login novamente.');
  }
  const data = await res.json();
  setTokens(data);
  return data;
}

export async function getIdToken() {
  if (!idToken) return null;
  // Check if token is about to expire (< 5 min)
  try {
    const payload = JSON.parse(atob(idToken.split('.')[1]));
    const expiresIn = payload.exp * 1000 - Date.now();
    if (expiresIn < 300000) { // < 5 minutes
      await refreshSession();
    }
  } catch (e) { /* token parse error, return as-is */ }
  return idToken;
}

export function getUser() { return user; }
export function isAuthenticated() { return !!idToken; }

function setTokens(data) {
  idToken = data.id_token || data.IdToken || idToken;
  accessToken = data.access_token || data.AccessToken || accessToken;
  refreshToken = data.refresh_token || data.RefreshToken || refreshToken;
  // Decode user from idToken
  try {
    const payload = JSON.parse(atob(idToken.split('.')[1]));
    user = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name || payload['custom:name'] || payload.email.split('@')[0]
    };
  } catch (e) { user = null; }
  // Schedule refresh 5 minutes before expiry
  scheduleRefresh();
}

function scheduleRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  if (!idToken) return;
  try {
    const payload = JSON.parse(atob(idToken.split('.')[1]));
    const expiresIn = payload.exp * 1000 - Date.now() - 300000; // 5 min before
    if (expiresIn > 0) {
      refreshTimer = setTimeout(() => refreshSession().catch(() => {}), expiresIn);
    }
  } catch (e) { /* ignore */ }
}
