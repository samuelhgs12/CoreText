import { apiRequest } from "./api";
import { getCurrentUser, updateCurrentUser } from "./authService";

const PROFILE_STORAGE_KEY = "coretext-profile";

const fallbackProfile = {
  name: "",
  username: "",
  email: "",
  avatarUrl: "",
  createdAt: "",
};

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
  } catch (error) {
    if (!storedProfile && !currentUser) {
      throw error;
    }
  }

  return normalizeProfile({
    ...storedProfile,
    name: storedProfile?.name || currentUser?.name || fallbackProfile.name,
    username: storedProfile?.username || currentUser?.username || fallbackProfile.username,
    email: storedProfile?.email || currentUser?.email || fallbackProfile.email,
  });
}

export async function updateProfile(profile) {
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

  persistProfile(normalizedProfile, currentUser || normalizedProfile);

  return {
    profile: normalizedProfile,
    source: "api",
    message: "Perfil atualizado com sucesso.",
  };
}

export async function updateProfileAvatar(avatarUrl) {
  const currentUser = getCurrentUser();
  const storedProfile = getStoredProfile(currentUser);
  const normalizedProfile = normalizeProfile({
    ...storedProfile,
    name: storedProfile?.name || currentUser?.name || "",
    username: storedProfile?.username || currentUser?.username || "",
    email: storedProfile?.email || currentUser?.email || "",
    createdAt: storedProfile?.createdAt || currentUser?.createdAt || "",
    avatarUrl,
    updatedAt: new Date().toISOString(),
  });

  persistProfile(normalizedProfile, currentUser || normalizedProfile);

  return {
    profile: normalizedProfile,
    source: "local",
    message: "Foto de perfil atualizada neste navegador.",
  };
}
