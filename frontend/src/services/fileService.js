import { apiRequest } from "./api";

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
