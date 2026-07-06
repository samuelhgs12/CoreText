const AUTH_TOKEN_KEY = "coretext-token";
const AUTH_USER_KEY = "coretext-user";
const AUTH_USERS_KEY = "coretext-mock-users";

const demoUsers = [
  {
    id: "demo-user",
    name: "Kayke",
    username: "kayke",
    email: "kayke@example.com",
    password: "12345678",
  },
];

function wait(ms = 450) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createAuthError(message) {
  const error = new Error(message);
  error.name = "AuthError";
  return error;
}

function getStoredUsers() {
  const rawUsers = localStorage.getItem(AUTH_USERS_KEY);

  if (!rawUsers) {
    return demoUsers;
  }

  try {
    return [...demoUsers, ...JSON.parse(rawUsers)];
  } catch {
    return demoUsers;
  }
}

function saveRegisteredUser(user) {
  const rawUsers = localStorage.getItem(AUTH_USERS_KEY);
  const users = rawUsers ? JSON.parse(rawUsers) : [];
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify([...users, user]));
}

function createMockToken(user) {
  return `mock-token-${btoa(`${user.email}:${Date.now()}`)}`;
}

function createMockId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `mock-user-${Date.now()}`;
}

function persistSession(user) {
  const token = createMockToken(user);
  const sessionUser = {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
  };

  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(sessionUser));
  localStorage.setItem("coretext-user-email", user.email);

  return {
    token,
    user: sessionUser,
  };
}

export async function login({ identifier, email, password }) {
  await wait();

  const normalizedIdentifier = (identifier || email || "").trim().toLowerCase();

  if (!normalizedIdentifier || !password) {
    throw createAuthError("Informe e-mail ou username e senha para continuar.");
  }

  const user = getStoredUsers().find(
    (candidate) =>
      candidate.email.toLowerCase() === normalizedIdentifier ||
      candidate.username?.toLowerCase() === normalizedIdentifier
  );

  if (!user || user.password !== password) {
    throw createAuthError("Credenciais inválidas. Verifique os dados e tente novamente.");
  }

  return persistSession(user);
}

export async function register({ name, username, email, password }) {
  await wait();

  const normalizedName = name.trim();
  const normalizedUsername = username.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedName || !normalizedUsername || !normalizedEmail || !password) {
    throw createAuthError("Preencha nome, username, e-mail e senha para criar sua conta.");
  }

  if (password.length < 8) {
    throw createAuthError("A senha deve ter pelo menos 8 caracteres.");
  }

  const users = getStoredUsers();
  const emailAlreadyExists = users.some(
    (user) => user.email.toLowerCase() === normalizedEmail
  );

  if (emailAlreadyExists) {
    throw createAuthError("Já existe uma conta cadastrada com este e-mail.");
  }

  const usernameAlreadyExists = users.some(
    (user) => user.username?.toLowerCase() === normalizedUsername
  );

  if (usernameAlreadyExists) {
    throw createAuthError("Já existe uma conta cadastrada com este username.");
  }

  const user = {
    id: createMockId(),
    name: normalizedName,
    username: normalizedUsername,
    email: normalizedEmail,
    password,
  };

  saveRegisteredUser(user);

  return persistSession(user);
}

export function logout() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem("coretext-user-email");
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
  return Boolean(getToken());
}
