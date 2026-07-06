import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Icon from "../components/Icon";
import { deleteSummary, generateSummary, listSummaries } from "../services/summaryService";

function formatDate(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function formatDuration(milliseconds) {
  if (!milliseconds && milliseconds !== 0) {
    return "Não informado";
  }

  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)} ms`;
  }

  return `${(milliseconds / 1000).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })} s`;
}

function SummaryDisplay({ summary }) {
  const isIntegrated = summary.type === "integrated";

  return (
    <article className="card-surface summary-result-card">
      <div className="summary-result-header">
        <div>
          <span className={`status-badge ${isIntegrated ? "progress" : "success"}`}>
            {isIntegrated ? "Resumo integrado" : "Resumo individual"}
          </span>
          <h2>{isIntegrated ? "Resumo integrado dos arquivos" : summary.fileName}</h2>
        </div>

        <Link to="/arquivos" className="ghost-button">
          <Icon name="chevronRight" size={18} />
          Voltar para arquivos
        </Link>
      </div>

      <div className="summary-meta-grid">
        <div>
          <span>Gerado em</span>
          <strong>{formatDate(summary.generatedAt)}</strong>
        </div>
        <div>
          <span>Tempo de geração</span>
          <strong>{formatDuration(summary.generationTimeMs)}</strong>
        </div>
        <div>
          <span>Origem</span>
          <strong>Backend</strong>
        </div>
      </div>

      <section className="summary-files-section">
        <h3>{isIntegrated ? "Arquivos utilizados" : "Arquivo resumido"}</h3>
        <div className="summary-file-list">
          {summary.files.map((fileName) => (
            <span key={fileName}>
              <Icon name="fileText" size={18} />
              {fileName}
            </span>
          ))}
        </div>
      </section>

      <section className="summary-content-section">
        <h3>Conteúdo do resumo</h3>
        <div className="summary-content">
          {summary.content.split("\n").map((line, index) => (
            <p key={`${line}-${index}`}>{line || "\u00A0"}</p>
          ))}
        </div>
      </section>
    </article>
  );
}

function SummaryHistory({
  summaries,
  selectedSummaryId,
  deletingSummaryId,
  isLoading,
  error,
  onSelectSummary,
  onDeleteSummary,
}) {
  return (
    <article className="card-surface summary-history-card">
      <div className="section-header">
        <h2>Resumos gerados</h2>
        <Link to="/arquivos" className="text-button">
          Gerar novo
          <Icon name="chevronRight" size={18} />
        </Link>
      </div>

      {isLoading && <div className="empty-state">Carregando histórico...</div>}

      {!isLoading && error && (
        <p className="feedback-message error" role="status">
          {error}
        </p>
      )}

      {!isLoading && !error && summaries.length === 0 && (
        <div className="empty-state">
          <Icon name="fileText" size={30} />
          <strong>Nenhum resumo gerado ainda</strong>
          <p className="muted-text">Selecione PDFs na tela de arquivos para gerar resumos.</p>
        </div>
      )}

      {!isLoading && !error && summaries.length > 0 && (
        <div className="summary-history-list">
          {summaries.map((summary) => {
            const isSelected = summary.id === selectedSummaryId;
            const isIntegrated = summary.type === "integrated";

            return (
              <div
                className={`summary-history-item ${isSelected ? "active" : ""}`}
                key={summary.id}
              >
                <button type="button" onClick={() => onSelectSummary(summary)}>
                  <span className={`status-badge ${isIntegrated ? "progress" : "success"}`}>
                    {isIntegrated ? "Integrado" : "Individual"}
                  </span>
                  <div>
                    <strong>{summary.title || summary.fileName}</strong>
                    <p className="muted-text">
                      {summary.files.length} arquivo{summary.files.length === 1 ? "" : "s"} •{" "}
                      {formatDate(summary.generatedAt)}
                    </p>
                  </div>
                  <Icon name="chevronRight" size={18} />
                </button>

                <button
                  type="button"
                  className="icon-button danger-icon-button"
                  disabled={deletingSummaryId === summary.id}
                  onClick={() => onDeleteSummary(summary)}
                  aria-label={`Excluir ${summary.title || summary.fileName}`}
                >
                  <Icon name="trash" size={18} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

function Summary() {
  const location = useLocation();
  const state = location.state || {};
  const fileIds = useMemo(() => state.selectedFileIds || [], [state.selectedFileIds]);
  const fileNames = useMemo(() => state.selectedFiles || [], [state.selectedFiles]);
  const mode = state.summaryMode || (fileIds.length > 1 ? "integrated" : "individual");
  const [summary, setSummary] = useState(null);
  const [summaryHistory, setSummaryHistory] = useState([]);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(fileIds.length));
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [deletingSummaryId, setDeletingSummaryId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      setIsHistoryLoading(true);
      setHistoryError("");

      try {
        const summaries = await listSummaries();

        if (!isMounted) {
          return;
        }

        setSummaryHistory(summaries);

        if (!fileIds.length) {
          setSummary((currentSummary) => currentSummary || summaries[0] || null);
        }
      } catch (historyError) {
        if (!isMounted) {
          return;
        }

        setHistoryError(historyError.message || "Não foi possível carregar seus resumos.");
      } finally {
        if (isMounted) {
          setIsHistoryLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [fileIds.length]);

  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      if (!fileIds.length) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const generatedSummary = await generateSummary({
          mode,
          fileIds,
          fileNames,
        });

        if (!isMounted) {
          return;
        }

        setSummary(generatedSummary);
        setSummaryHistory((currentSummaries) => [
          generatedSummary,
          ...currentSummaries.filter((item) => item.id !== generatedSummary.id),
        ]);
      } catch (summaryError) {
        if (!isMounted) {
          return;
        }

        setError(summaryError.message || "Não foi possível gerar o resumo.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSummary();

    return () => {
      isMounted = false;
    };
  }, [fileIds, fileNames, mode]);

  async function handleDeleteSummary(summaryToDelete) {
    setDeletingSummaryId(summaryToDelete.id);
    setHistoryError("");
    setError("");

    try {
      await deleteSummary(summaryToDelete.id);

      setSummaryHistory((currentSummaries) => {
        const nextSummaries = currentSummaries.filter(
          (item) => item.id !== summaryToDelete.id
        );

        if (summary?.id === summaryToDelete.id) {
          setSummary(nextSummaries[0] || null);
        }

        return nextSummaries;
      });
    } catch (deleteError) {
      setHistoryError(deleteError.message || "Não foi possível excluir o resumo.");
    } finally {
      setDeletingSummaryId(null);
    }
  }

  return (
    <section className="page-stack summary-page">
      <div className="page-heading">
        <div>
          <h1>Resumos</h1>
          <p className="muted-text">
            Acompanhe o resumo gerado a partir dos documentos selecionados.
          </p>
        </div>
      </div>

      <SummaryHistory
        summaries={summaryHistory}
        selectedSummaryId={summary?.id}
        deletingSummaryId={deletingSummaryId}
        isLoading={isHistoryLoading}
        error={historyError}
        onSelectSummary={(selectedSummary) => {
          setSummary(selectedSummary);
          setError("");
        }}
        onDeleteSummary={handleDeleteSummary}
      />

      {isLoading && (
        <article className="card-surface summary-state-card">
          <span className="loading-spinner" aria-hidden="true" />
          <h2>Gerando resumo...</h2>
          <p className="muted-text">
            Estamos processando os arquivos selecionados. Isso pode levar alguns segundos.
          </p>
        </article>
      )}

      {!isLoading && error && (
        <article className="card-surface summary-state-card error">
          <Icon name="shield" size={32} />
          <h2>Não foi possível gerar o resumo</h2>
          <p className="muted-text">{error}</p>
          <Link to="/arquivos" className="primary-button">
            Voltar para arquivos
          </Link>
        </article>
      )}

      {!isLoading && !isHistoryLoading && !error && !summary && (
        <article className="card-surface summary-state-card">
          <Icon name="fileText" size={34} />
          <h2>Nenhum arquivo selecionado</h2>
          <p className="muted-text">
            Selecione um ou mais PDFs na tela de arquivos para gerar um resumo.
          </p>
          <Link to="/arquivos" className="primary-button">
            Ir para arquivos
          </Link>
        </article>
      )}

      {!isLoading && !error && summary && <SummaryDisplay summary={summary} />}
    </section>
  );
}

export default Summary;
