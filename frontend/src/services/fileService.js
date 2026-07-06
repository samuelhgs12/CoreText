import { apiRequest } from "./api";

const mockFiles = [
  {
    id: 101,
    filename: "Inteligência Artificial na Educação.pdf",
    content_type: "application/pdf",
    file_size_bytes: 1258291,
    uploaded_at: "2026-07-02T13:32:00Z",
  },
  {
    id: 102,
    filename: "Aprendizado de Máquina Avançado.pdf",
    content_type: "application/pdf",
    file_size_bytes: 2831155,
    uploaded_at: "2026-07-01T18:45:00Z",
  },
  {
    id: 103,
    filename: "Processamento de Linguagem Natural.pdf",
    content_type: "application/pdf",
    file_size_bytes: 1887436,
    uploaded_at: "2026-06-29T14:02:00Z",
  },
  {
    id: 104,
    filename: "Redes Neurais e Deep Learning.pdf",
    content_type: "application/pdf",
    file_size_bytes: 3565158,
    uploaded_at: "2026-06-26T20:14:00Z",
  },
];

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

function wait(ms = 250) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function listFiles() {
  try {
    const files = await apiRequest("/files");

    return {
      files: files.map(normalizeFile),
      source: "api",
      message: "",
    };
  } catch {
    return {
      files: mockFiles.map(normalizeFile),
      source: "mock",
      message: "Backend indisponível. Exibindo arquivos mockados para demonstração.",
    };
  }
}

export async function deleteFile(fileId, source = "api") {
  if (source === "mock") {
    await wait();
    return;
  }

  await apiRequest(`/files/${fileId}`, {
    method: "DELETE",
  });
}
