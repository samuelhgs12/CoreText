const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getPlaceholderUserId() {
  return localStorage.getItem("coretext-user-id") || "1";
}

function resolveUrl(path) {
  return `${API_BASE_URL}${path}`;
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(resolveUrl(path), {
    ...options,
    headers: {
      "X-User-Id": getPlaceholderUserId(),
      ...options.headers,
    },
  });

  const hasBody = response.status !== 204;
  const data = hasBody ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const message =
      data?.detail || "Não foi possível concluir a operação. Tente novamente.";
    throw new ApiError(message, response.status);
  }

  return data;
}
