import { apiRequest } from "./api";

const inFlightSummaryRequests = new Map();

function normalizeIndividualSummary(summary, files) {
  const fileName = files[0] || `Arquivo #${summary.file_id}`;

  return {
    id: `individual-${summary.id}`,
    type: "individual",
    fileName,
    title: fileName,
    files,
    content: summary.content,
    generatedAt: summary.created_at,
    generationTimeMs: summary.generation_time_ms,
    source: "api",
  };
}

function normalizeIntegratedSummary(summary, files) {
  return {
    id: `integrated-${summary.id}`,
    type: "integrated",
    fileName: "",
    title: `Resumo integrado de ${files.length} arquivos`,
    files,
    content: summary.content,
    generatedAt: summary.created_at,
    generationTimeMs: summary.generation_time_ms,
    source: "api",
  };
}

function normalizeHistorySummary(summary) {
  return {
    id: summary.id,
    type: summary.type,
    fileName: summary.type === "individual" ? summary.title : "",
    title: summary.title,
    files: summary.files,
    content: summary.content,
    generatedAt: summary.created_at,
    generationTimeMs: summary.generation_time_ms,
    source: "api",
  };
}

export async function listSummaries() {
  const summaries = await apiRequest("/summaries");

  return summaries.map(normalizeHistorySummary);
}

export async function deleteSummary(summaryId) {
  const [summaryType, rawId] = String(summaryId).split("-");

  if (!summaryType || !rawId) {
    throw new Error("Resumo inválido para exclusão.");
  }

  await apiRequest(`/summaries/${summaryType}/${rawId}`, {
    method: "DELETE",
  });
}

export async function generateSummary({ mode = "individual", fileIds = [], fileNames = [] }) {
  if (!fileIds.length) {
    throw new Error("Selecione pelo menos um arquivo para gerar resumo.");
  }

  const shouldGenerateIntegrated = mode === "integrated" || fileIds.length > 1;
  const requestKey = `${shouldGenerateIntegrated ? "integrated" : "individual"}:${fileIds.join(",")}`;

  if (inFlightSummaryRequests.has(requestKey)) {
    return inFlightSummaryRequests.get(requestKey);
  }

  const requestPromise = (async () => {
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
  })();

  inFlightSummaryRequests.set(requestKey, requestPromise);

  return requestPromise.finally(() => {
    inFlightSummaryRequests.delete(requestKey);
  });
}
