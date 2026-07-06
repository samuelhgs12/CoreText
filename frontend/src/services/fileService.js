import { apiBlobRequest, apiRequest } from "./api";

function normalizeFile(file) {
  return {
    id: file.id,
    name: file.filename,
    contentType: file.content_type,
    sizeBytes: file.file_size_bytes,
    uploadedAt: file.uploaded_at,
    status: "Disponível",
  };
}

function validatePdf(file) {
  if (!file) {
    throw new Error("Selecione um arquivo PDF para enviar.");
  }

  const hasPdfName = file.name.toLowerCase().endsWith(".pdf");
  const hasPdfType = file.type === "application/pdf" || file.type === "";

  if (!hasPdfName || !hasPdfType) {
    throw new Error("Arquivo inválido. Envie apenas PDFs.");
  }
}

export async function listFiles() {
  const files = await apiRequest("/files");

  return {
    files: files.map(normalizeFile),
  };
}

export async function uploadFile(file) {
  validatePdf(file);

  const formData = new FormData();
  formData.append("file", file);

  const uploadedFile = await apiRequest("/files", {
    method: "POST",
    body: formData,
  });

  return normalizeFile(uploadedFile);
}

export async function deleteFile(fileId) {
  await apiRequest(`/files/${fileId}`, {
    method: "DELETE",
  });
}

export async function viewFile(fileId, targetWindow = null) {
  const blob = await apiBlobRequest(`/files/${fileId}/content`);
  const fileUrl = URL.createObjectURL(blob);

  if (targetWindow) {
    targetWindow.location.href = fileUrl;
  } else {
    window.open(fileUrl, "_blank", "noopener,noreferrer");
  }

  setTimeout(() => {
    URL.revokeObjectURL(fileUrl);
  }, 60_000);
}

export async function downloadFile(fileId, filename) {
  const blob = await apiBlobRequest(`/files/${fileId}/download`);
  const fileUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = fileUrl;
  link.download = filename || "documento.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(fileUrl);
}
