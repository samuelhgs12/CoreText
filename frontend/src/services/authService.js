const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const AUTH_TOKEN_KEY = "coretext-token";
const AUTH_USER_KEY = "coretext-user";

function resolveUrl(path) {
  return `${API_BASE_URL}${path}`;
}

function createAuthError(message) {
  const error = new Error(message);
  error.name = "AuthError";
  return error;
}

async function parseResponse(response) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw createAuthError(
      data?.detail || "Não foi possível concluir a autenticação. Tente novamente."
    );
  }

  return data;
}

function normalizeUser(user, avatarUrl = "") {
  return {
    id: user.id,
    name: user.full_name || user.username || "Usuário",
    username: user.username,
    email: user.email,
    avatarUrl,
    createdAt: user.created_at,
  };
}

function getStoredAvatarUrl() {
  const rawProfile = localStorage.getItem("coretext-profile");

  if (!rawProfile) {
    return "";
  }

  try {
    return JSON.parse(rawProfile).avatarUrl || "";
  } catch {
    return "";
  }
}

function persistSession({ access_token: token, user }) {
  const sessionUser = normalizeUser(user, getStoredAvatarUrl());

  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(sessionUser));

  if (sessionUser.email) {
    localStorage.setItem("coretext-user-email", sessionUser.email);
  }

  window.dispatchEvent(new CustomEvent("coretext:user-updated", { detail: sessionUser }));

  return {
    token,
    user: sessionUser,
  };
}

export async function login({ identifier, email, password }) {
  const normalizedIdentifier = (identifier || email || "").trim();

  if (!normalizedIdentifier || !password) {
    throw createAuthError("Informe e-mail ou username e senha para continuar.");
  }

  const response = await fetch(resolveUrl("/auth/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      identifier: normalizedIdentifier,
      email: normalizedIdentifier,
      password,
    }),
  });

  return persistSession(await parseResponse(response));
}

export async function register({ name, username, email, password }) {
  const normalizedName = name.trim();
  const normalizedUsername = username.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedName || !normalizedUsername || !normalizedEmail || !password) {
    throw createAuthError("Preencha nome, username, e-mail e senha para criar sua conta.");
  }

  if (password.length < 8) {
    throw createAuthError("A senha deve ter pelo menos 8 caracteres.");
  }

  const response = await fetch(resolveUrl("/auth/register"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      full_name: normalizedName,
      username: normalizedUsername,
      email: normalizedEmail,
      password,
    }),
  });

  return persistSession(await parseResponse(response));
}

export async function fetchCurrentUser() {
  const token = getToken();

  if (!token) {
    return null;
  }

  const response = await fetch(resolveUrl("/auth/me"), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const user = normalizeUser(await parseResponse(response), getCurrentUser()?.avatarUrl || "");
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent("coretext:user-updated", { detail: user }));

  return user;
}

export function logout() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem("coretext-user-email");
  window.dispatchEvent(new CustomEvent("coretext:user-updated", { detail: null }));
}

export function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getCurrentUser() {
  const rawUser = localStorage.getItem(AUTH_USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    return null;
  }
}

export function updateCurrentUser(updates) {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    return null;
  }

  const nextUser = {
    ...currentUser,
    ...updates,
  };

  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser));

  if (nextUser.email) {
    localStorage.setItem("coretext-user-email", nextUser.email);
  }

  window.dispatchEvent(new CustomEvent("coretext:user-updated", { detail: nextUser }));

  return nextUser;
}

export function isAuthenticated() {
  const token = getToken();

  return Boolean(token && token.includes("."));
}
