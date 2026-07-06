import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { listFiles, uploadFile } from "../services/fileService";

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

function Upload() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [recentUploads, setRecentUploads] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const selectedFileDetails = useMemo(() => {
    if (!selectedFile) {
      return "";
    }

    return formatFileSize(selectedFile.size);
  }, [selectedFile]);

  useEffect(() => {
    let isMounted = true;

    async function loadRecentUploads() {
      setIsLoadingRecent(true);

      try {
        const result = await listFiles();

        if (!isMounted) {
          return;
        }

        setRecentUploads(result.files.slice(0, 3));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setFeedback({
          type: "error",
          text: error.message || "Não foi possível carregar seus uploads recentes.",
        });
      } finally {
        if (isMounted) {
          setIsLoadingRecent(false);
        }
      }
    }

    loadRecentUploads();

    return () => {
      isMounted = false;
    };
  }, []);

  function validateSelectedFile(file) {
    if (!file) {
      return false;
    }

    const hasPdfName = file.name.toLowerCase().endsWith(".pdf");
    const hasPdfType = file.type === "application/pdf" || file.type === "";

    if (!hasPdfName || !hasPdfType) {
      setSelectedFile(null);
      setFeedback({
        type: "error",
        text: "Arquivo inválido. Selecione um PDF para continuar.",
      });
      return false;
    }

    setFeedback(null);
    return true;
  }

  function handleSelectFile(file) {
    if (!validateSelectedFile(file)) {
      return;
    }

    setSelectedFile(file);
  }

  function handleInputChange(event) {
    handleSelectFile(event.target.files?.[0]);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    handleSelectFile(event.dataTransfer.files?.[0]);
  }

  function handleRemoveFile() {
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleUpload() {
    if (!selectedFile) {
      setFeedback({
        type: "error",
        text: "Selecione um PDF antes de enviar.",
      });
      return;
    }

    setIsUploading(true);
    setFeedback({
      type: "info",
      text: "Enviando PDF...",
    });

    try {
      const uploadedFile = await uploadFile(selectedFile);

      setRecentUploads((currentUploads) => [
        uploadedFile,
        ...currentUploads.filter((file) => file.id !== uploadedFile.id),
      ].slice(0, 3));
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setFeedback({
        type: "success",
        text: "PDF enviado com sucesso.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.message || "Não foi possível enviar o PDF. Tente novamente.",
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <h1>Upload de PDF</h1>
          <p className="muted-text">
            Envie seus PDFs para gerar resumos rápidos e inteligentes com IA.
          </p>
        </div>
      </div>

      <article className="card-surface upload-panel">
        <label
          className={`dropzone ${isDragging ? "dragging" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className="pdf-icon">PDF</div>

          <h2>Arraste seu arquivo PDF aqui</h2>

          <p className="muted-text">
            ou <span className="link-text">clique para selecionar</span>
          </p>

          <p className="muted-text small-text">
            Formato aceito: .pdf até 50 MB
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden-file-input"
            disabled={isUploading}
            onChange={handleInputChange}
          />
        </label>

        {selectedFile && (
          <div className="selected-file">
            <div className="file-info">
              <span className="file-icon">PDF</span>

              <div>
                <strong>{selectedFile.name}</strong>
                <p className="muted-text">{selectedFileDetails}</p>
              </div>
            </div>

            <button
              type="button"
              className="icon-button"
              aria-label="Remover arquivo"
              disabled={isUploading}
              onClick={handleRemoveFile}
            >
              <Icon name="trash" size={18} />
            </button>
          </div>
        )}

        {feedback && (
          <p className={`feedback-message ${feedback.type}`} role="status">
            {feedback.text}
          </p>
        )}

        <button
          type="button"
          className="primary-button upload-button"
          disabled={!selectedFile || isUploading}
          onClick={handleUpload}
        >
          <Icon name="cloudUpload" size={20} />
          {isUploading ? "Enviando..." : "Enviar PDF"}
        </button>
      </article>

      <article className="card-surface">
        <div className="section-header">
          <h2>Uploads recentes</h2>
          <button type="button" className="text-button" onClick={() => navigate("/arquivos")}>
            Ver todos
            <Icon name="chevronRight" size={18} />
          </button>
        </div>

        <div className="recent-list">
          {isLoadingRecent && <div className="empty-state">Carregando uploads...</div>}

          {!isLoadingRecent && recentUploads.length === 0 && (
            <div className="empty-state">
              <Icon name="folder" size={30} />
              <strong>Nenhum PDF enviado ainda</strong>
              <p className="muted-text">Os arquivos enviados aparecerão nesta lista.</p>
            </div>
          )}

          {!isLoadingRecent &&
            recentUploads.map((file) => (
              <div className="recent-row" key={file.id}>
                <div className="file-info">
                  <span className="file-icon">PDF</span>

                  <div>
                    <strong>{file.name}</strong>
                    <p className="muted-text">{formatFileSize(file.sizeBytes)}</p>
                  </div>
                </div>

                <span className="status-badge success">{file.status}</span>

                <span className="muted-text">{formatDate(file.uploadedAt)}</span>

                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Ver ${file.name} na listagem`}
                  onClick={() => navigate("/arquivos")}
                >
                  <Icon name="eye" size={18} />
                </button>
              </div>
            ))}
        </div>
      </article>
    </section>
  );
}

export default Upload;
