// Authentication service for Cognito via BFF proxy
// Tokens securely persisted in client storage to prevent unwanted logouts on reload

const STORAGE_KEY = 'nodefund_session_tokens';

let idToken = null;
let accessToken = null;
let refreshToken = null;
let user = null;
let refreshTimer = null;

// Tenta restaurar do storage ao carregar o módulo
restoreFromStorage();

function saveToStorage(data) {
  try {
    const payload = {
      id_token: idToken,
      access_token: accessToken,
      refresh_token: refreshToken
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (_) {}
  }
}

function restoreFromStorage() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const data = JSON.parse(raw);
    if (data && data.id_token) {
      idToken = data.id_token;
      accessToken = data.access_token || null;
      refreshToken = data.refresh_token || null;
      decodeUserFromToken(idToken);
      scheduleRefresh();
    }
  } catch (e) {
    console.warn('Erro ao restaurar sessão:', e);
  }
}

function clearStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
}

function decodeUserFromToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    user = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name || payload['custom:name'] || (payload.email ? payload.email.split('@')[0] : 'Usuário')
    };
  } catch (e) {
    user = null;
  }
}

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
  saveToStorage(data);
  return data;
}

export function logout() {
  idToken = null;
  accessToken = null;
  refreshToken = null;
  user = null;
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = null;
  clearStorage();
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
  saveToStorage(data);
  return data;
}

export async function getIdToken() {
  if (!idToken) {
    restoreFromStorage();
  }
  if (!idToken) return null;

  // Check if token is about to expire (< 5 min)
  try {
    const payload = JSON.parse(atob(idToken.split('.')[1]));
    const expiresIn = payload.exp * 1000 - Date.now();
    if (expiresIn < 300000 && refreshToken) { // < 5 minutes
      await refreshSession();
    }
  } catch (e) { /* token parse error, return as-is */ }
  return idToken;
}

export function getUser() {
  if (!user && idToken) {
    decodeUserFromToken(idToken);
  }
  return user;
}

export function isAuthenticated() {
  if (!idToken) {
    restoreFromStorage();
  }
  return !!idToken;
}

function setTokens(data) {
  idToken = data.id_token || data.IdToken || idToken;
  accessToken = data.access_token || data.AccessToken || accessToken;
  refreshToken = data.refresh_token || data.RefreshToken || refreshToken;
  decodeUserFromToken(idToken);
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
