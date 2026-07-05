import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { deleteFile, listFiles } from "../services/fileService";

function formatFileSize(bytes) {
  if (!bytes) {
    return "0 KB";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;

  return `${value.toLocaleString("pt-BR", {
    maximumFractionDigits: value >= 10 ? 0 : 1,
  })} ${units[index]}`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function Files() {
  const navigate = useNavigate();
  const selectAllRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [dataSource, setDataSource] = useState("api");
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedCount = selectedIds.size;
  const hasFiles = files.length > 0;
  const allSelected = hasFiles && selectedCount === files.length;
  const selectedFiles = useMemo(
    () => files.filter((file) => selectedIds.has(file.id)),
    [files, selectedIds]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadFiles() {
      setIsLoading(true);

      try {
        const result = await listFiles();

        if (!isMounted) {
          return;
        }

        setFiles(result.files);
        setDataSource(result.source);
        setFeedback(
          result.message
            ? {
                type: "info",
                text: result.message,
              }
            : null
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setFeedback({
          type: "error",
          text: error.message || "Não foi possível carregar seus arquivos.",
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadFiles();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedCount > 0 && !allSelected;
    }
  }, [allSelected, selectedCount]);

  function handleToggleFile(fileId) {
    setSelectedIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(fileId)) {
        nextIds.delete(fileId);
      } else {
        nextIds.add(fileId);
      }

      return nextIds;
    });
  }

  function handleToggleAll() {
    setSelectedIds(() => {
      if (allSelected) {
        return new Set();
      }

      return new Set(files.map((file) => file.id));
    });
  }

  function handleGenerateSummary() {
    if (selectedCount === 0) {
      setFeedback({
        type: "error",
        text: "Selecione pelo menos um PDF para gerar resumo.",
      });
      return;
    }

    navigate("/resumos", {
      state: {
        selectedFileIds: Array.from(selectedIds),
        selectedFiles: selectedFiles.map((file) => file.name),
      },
    });
  }

  async function handleDelete(fileIds) {
    if (fileIds.length === 0) {
      setFeedback({
        type: "error",
        text: "Selecione pelo menos um arquivo para excluir.",
      });
      return;
    }

    setIsDeleting(true);
    setFeedback(null);

    try {
      await Promise.all(fileIds.map((fileId) => deleteFile(fileId, dataSource)));

      setFiles((currentFiles) => currentFiles.filter((file) => !fileIds.includes(file.id)));
      setSelectedIds((currentIds) => {
        const nextIds = new Set(currentIds);
        fileIds.forEach((fileId) => nextIds.delete(fileId));
        return nextIds;
      });
      setFeedback({
        type: "success",
        text:
          fileIds.length === 1
            ? "Arquivo excluído com sucesso."
            : `${fileIds.length} arquivos excluídos com sucesso.`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.message || "Não foi possível excluir o arquivo. Tente novamente.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="page-stack files-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Biblioteca</p>
          <h1>Arquivos</h1>
          <p className="muted-text">
            Visualize PDFs enviados, selecione documentos para resumo e gerencie exclusões.
          </p>
        </div>
      </div>

      <article className="card-surface files-panel">
        <div className="section-header files-header">
          <div>
            <h2>PDFs enviados</h2>
            <p className="muted-text">
              {isLoading
                ? "Carregando arquivos..."
                : `${files.length} arquivo${files.length === 1 ? "" : "s"} encontrado${
                    files.length === 1 ? "" : "s"
                  }`}
            </p>
          </div>

          <div className="files-actions">
            <span className="status-pill">
              {selectedCount} selecionado{selectedCount === 1 ? "" : "s"}
            </span>
            <button
              type="button"
              className="ghost-button danger-button"
              disabled={selectedCount === 0 || isDeleting}
              onClick={() => handleDelete(Array.from(selectedIds))}
            >
              <Icon name="trash" size={18} />
              Excluir
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={selectedCount === 0}
              onClick={handleGenerateSummary}
            >
              <Icon name="sparkles" size={18} />
              Gerar resumo
            </button>
          </div>
        </div>

        {feedback && (
          <p className={`feedback-message ${feedback.type}`} role="status">
            {feedback.text}
          </p>
        )}

        <div className="files-table" aria-busy={isLoading}>
          <div className="files-table-head">
            <label className="selection-cell">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allSelected}
                disabled={!hasFiles || isLoading}
                onChange={handleToggleAll}
                aria-label="Selecionar todos os arquivos"
              />
            </label>
            <span>Arquivo</span>
            <span>Tamanho</span>
            <span>Upload</span>
            <span>Status</span>
            <span>Ações</span>
          </div>

          {isLoading && <div className="empty-state">Carregando arquivos...</div>}

          {!isLoading && !hasFiles && (
            <div className="empty-state">
              <Icon name="folder" size={30} />
              <strong>Nenhum PDF enviado ainda</strong>
              <p className="muted-text">Quando você enviar arquivos, eles aparecerão aqui.</p>
            </div>
          )}

          {!isLoading &&
            files.map((file) => {
              const isSelected = selectedIds.has(file.id);

              return (
                <div
                  className={`files-table-row ${isSelected ? "selected" : ""}`}
                  key={file.id}
                >
                  <label className="selection-cell">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleFile(file.id)}
                      aria-label={`Selecionar ${file.name}`}
                    />
                  </label>

                  <div className="file-info">
                    <span className="file-icon">PDF</span>
                    <div>
                      <strong>{file.name}</strong>
                      <p className="muted-text">{file.contentType}</p>
                    </div>
                  </div>

                  <span className="muted-text">{formatFileSize(file.sizeBytes)}</span>
                  <span className="muted-text">{formatDate(file.uploadedAt)}</span>
                  <span className="status-badge success">{file.status}</span>

                  <div className="row-actions">
                    <button
                      type="button"
                      className="icon-button danger-icon-button"
                      disabled={isDeleting}
                      onClick={() => handleDelete([file.id])}
                      aria-label={`Excluir ${file.name}`}
                    >
                      <Icon name="trash" size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </article>
    </section>
  );
}

export default Files;
