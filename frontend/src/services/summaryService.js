import { apiRequest } from "./api";

function normalizeIndividualSummary(summary, files) {
  return {
    id: summary.id,
    type: "individual",
    fileName: files[0] || `Arquivo #${summary.file_id}`,
    files,
    content: summary.content,
    generatedAt: summary.created_at,
    generationTimeMs: summary.generation_time_ms,
    source: "api",
  };
}

function normalizeIntegratedSummary(summary, files) {
  return {
    id: summary.id,
    type: "integrated",
    fileName: "",
    files,
    content: summary.content,
    generatedAt: summary.created_at,
    generationTimeMs: summary.generation_time_ms,
    source: "api",
  };
}

export async function generateSummary({ mode = "individual", fileIds = [], fileNames = [] }) {
  if (!fileIds.length) {
    throw new Error("Selecione pelo menos um arquivo para gerar resumo.");
  }

  const shouldGenerateIntegrated = mode === "integrated" || fileIds.length > 1;

  if (shouldGenerateIntegrated) {
    const summary = await apiRequest("/summaries/integrated", {
      method: "POST",
      body: JSON.stringify({
        file_ids: fileIds,
      }),
    });

    return normalizeIntegratedSummary(summary, fileNames);
  }

  const summary = await apiRequest(`/files/${fileIds[0]}/summary`, {
    method: "POST",
  });

  return normalizeIndividualSummary(summary, fileNames);
}
