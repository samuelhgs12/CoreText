import { apiRequest } from "./api";
import { getCurrentUser, updateCurrentUser } from "./authService";

const PROFILE_STORAGE_KEY = "coretext-profile";

const fallbackProfile = {
  name: "Kayke Silva",
  username: "kayke",
  email: "kayke@example.com",
  avatarUrl: "",
  createdAt: "2024-04-12T12:00:00Z",
};

function wait(ms = 250) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getProfileStorageKey(user) {
  const identifier = user?.id || user?.email || user?.username;

  return identifier
    ? `${PROFILE_STORAGE_KEY}:${encodeURIComponent(identifier)}`
    : PROFILE_STORAGE_KEY;
}

function getStoredProfile(user) {
  const rawProfile = localStorage.getItem(getProfileStorageKey(user));

  if (!rawProfile) {
    return null;
  }

  try {
    return JSON.parse(rawProfile);
  } catch {
    return null;
  }
}

function persistProfile(profile, user = profile) {
  localStorage.setItem(getProfileStorageKey(user), JSON.stringify(profile));
  updateCurrentUser({
    name: profile.name,
    username: profile.username,
    email: profile.email,
    avatarUrl: profile.avatarUrl,
  });
}

function normalizeProfile(profile) {
  return {
    ...fallbackProfile,
    ...profile,
  };
}

export async function getProfile() {
  const currentUser = getCurrentUser();
  const storedProfile = getStoredProfile(currentUser);

  try {
    const user = await apiRequest("/auth/me");
    const apiStoredProfile = getStoredProfile(user);
    const profile = normalizeProfile({
      ...apiStoredProfile,
      name: user.full_name || user.username || fallbackProfile.name,
      username: user.username || fallbackProfile.username,
      email: user.email || fallbackProfile.email,
      createdAt: user.created_at,
    });

    persistProfile(profile, user);
    return profile;
  } catch {
    await wait();
  }

  return normalizeProfile({
    ...storedProfile,
    name: storedProfile?.name || currentUser?.name || fallbackProfile.name,
    username: storedProfile?.username || currentUser?.username || fallbackProfile.username,
    email: storedProfile?.email || currentUser?.email || fallbackProfile.email,
  });
}

export async function updateProfile(profile) {
  await wait();

  const currentUser = getCurrentUser();
  const normalizedProfile = normalizeProfile({
    ...profile,
    name: profile.name.trim(),
    username: profile.username.trim().toLowerCase(),
    email: profile.email.trim().toLowerCase(),
    updatedAt: new Date().toISOString(),
  });

  if (!normalizedProfile.name || !normalizedProfile.username || !normalizedProfile.email) {
    throw new Error("Preencha nome completo, username e e-mail para salvar o perfil.");
  }

  let source = "mock";

  if (currentUser?.id && /^\d+$/.test(String(currentUser.id))) {
    try {
      const updatedUser = await apiRequest("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({
          full_name: normalizedProfile.name,
          username: normalizedProfile.username,
          email: normalizedProfile.email,
        }),
      });
      normalizedProfile.name = updatedUser.full_name || updatedUser.username;
      normalizedProfile.username = updatedUser.username;
      normalizedProfile.email = updatedUser.email;
      normalizedProfile.createdAt = updatedUser.created_at;
      source = "api";
    } catch {
      source = "mock";
    }
  }

  persistProfile(normalizedProfile, currentUser || normalizedProfile);

  return {
    profile: normalizedProfile,
    source,
    message:
      source === "api"
        ? "Perfil atualizado com sucesso."
        : "Perfil salvo localmente. A atualização via backend será usada quando a rota estiver disponível.",
  };
}
