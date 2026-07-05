const AUTH_TOKEN_KEY = "coretext-token";
const AUTH_USER_KEY = "coretext-user";
const AUTH_USERS_KEY = "coretext-mock-users";

const demoUsers = [
  {
    id: "demo-user",
    name: "Kayke",
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

export async function login({ email, password }) {
  await wait();

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    throw createAuthError("Informe e-mail e senha para continuar.");
  }

  const user = getStoredUsers().find(
    (candidate) => candidate.email.toLowerCase() === normalizedEmail
  );

  if (!user || user.password !== password) {
    throw createAuthError("E-mail ou senha inválidos. Verifique os dados e tente novamente.");
  }

  return persistSession(user);
}

export async function register({ name, email, password }) {
  await wait();

  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedName || !normalizedEmail || !password) {
    throw createAuthError("Preencha nome, e-mail e senha para criar sua conta.");
  }

  if (password.length < 8) {
    throw createAuthError("A senha deve ter pelo menos 8 caracteres.");
  }

  const alreadyExists = getStoredUsers().some(
    (user) => user.email.toLowerCase() === normalizedEmail
  );

  if (alreadyExists) {
    throw createAuthError("Já existe uma conta cadastrada com este e-mail.");
  }

  const user = {
    id: createMockId(),
    name: normalizedName,
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

export function isAuthenticated() {
  return Boolean(getToken());
}
