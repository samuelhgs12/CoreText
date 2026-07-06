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

function getStoredProfile() {
  const rawProfile = localStorage.getItem(PROFILE_STORAGE_KEY);

  if (!rawProfile) {
    return null;
  }

  try {
    return JSON.parse(rawProfile);
  } catch {
    return null;
  }
}

function persistProfile(profile) {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
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
  await wait();

  const currentUser = getCurrentUser();
  const storedProfile = getStoredProfile();

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
      await apiRequest(`/users/${currentUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: normalizedProfile.name,
          username: normalizedProfile.username,
          email: normalizedProfile.email,
          avatar_url: normalizedProfile.avatarUrl,
        }),
      });
      source = "api";
    } catch {
      source = "mock";
    }
  }

  persistProfile(normalizedProfile);

  return {
    profile: normalizedProfile,
    source,
    message:
      source === "api"
        ? "Perfil atualizado com sucesso."
        : "Perfil salvo localmente. A atualização via backend será usada quando a rota estiver disponível.",
  };
}
