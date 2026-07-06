import { apiRequest } from "./api";

const mockSummaryContent = `Este resumo destaca os principais pontos do documento selecionado, organizando as informações em uma leitura rápida para apoiar revisão e tomada de decisão.

Principais pontos identificados:
- O documento apresenta conceitos centrais e exemplos práticos relacionados ao tema.
- As seções mais relevantes foram condensadas em tópicos objetivos.
- Há oportunidades de aprofundamento em definições, aplicações e possíveis impactos.

Conclusão:
O material pode ser usado como base para estudo, revisão e consulta rápida, preservando os pontos essenciais do conteúdo original.`;

function wait(ms = 900) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

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

function createMockSummary({ mode, fileIds, fileNames }) {
  const isIntegrated = mode === "integrated" || fileIds.length > 1;

  return {
    id: `mock-summary-${Date.now()}`,
    type: isIntegrated ? "integrated" : "individual",
    fileName: fileNames[0] || "Documento selecionado.pdf",
    files: fileNames.length ? fileNames : fileIds.map((fileId) => `Arquivo #${fileId}`),
    content: isIntegrated
      ? `${mockSummaryContent}

Resumo integrado:
Os documentos selecionados foram comparados em conjunto para produzir uma visão consolidada. A síntese combina recorrências, conceitos complementares e pontos de convergência entre os arquivos.`
      : mockSummaryContent,
    generatedAt: new Date().toISOString(),
    generationTimeMs: 842,
    source: "mock",
  };
}

export async function generateSummary({ mode = "individual", fileIds = [], fileNames = [] }) {
  if (!fileIds.length) {
    throw new Error("Selecione pelo menos um arquivo para gerar resumo.");
  }

  const shouldGenerateIntegrated = mode === "integrated" || fileIds.length > 1;

  try {
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
  } catch {
    await wait();
    return createMockSummary({ mode, fileIds, fileNames });
  }
}
