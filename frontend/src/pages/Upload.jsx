import Icon from "../components/Icon";

const recentUploads = [
  {
    name: "Aprendizado de Máquina Avançado.pdf",
    details: "28 páginas • 2,7 MB",
    status: "Concluído",
    date: "21/05/2025, 09:15",
  },
  {
    name: "Redes Neurais e Deep Learning.pdf",
    details: "36 páginas • 3,4 MB",
    status: "Concluído",
    date: "20/05/2025, 16:45",
  },
  {
    name: "Processamento de Linguagem Natural.pdf",
    details: "22 páginas • 1,8 MB",
    status: "Em andamento",
    date: "19/05/2025, 11:02",
  },
];

function Upload() {
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
        <div className="dropzone">
          <div className="pdf-icon">PDF</div>

          <h2>Arraste seu arquivo PDF aqui</h2>

          <p className="muted-text">
            ou <span className="link-text">clique para selecionar</span>
          </p>

          <p className="muted-text small-text">
            Formato aceito: .pdf até 50 MB
          </p>

          <input
            type="file"
            accept="application/pdf"
            className="hidden-file-input"
          />
        </div>

        <div className="selected-file">
          <div className="file-info">
            <span className="file-icon">PDF</span>

            <div>
              <strong>Inteligência Artificial na Educação.pdf</strong>
              <p className="muted-text">1,2 MB • 14 páginas</p>
            </div>
          </div>

          <button type="button" className="icon-button" aria-label="Remover arquivo">
            <Icon name="trash" size={18} />
          </button>
        </div>

        <button type="button" className="primary-button upload-button">
          <Icon name="cloudUpload" size={20} />
          Enviar PDF
        </button>
      </article>

      <article className="card-surface">
        <div className="section-header">
          <h2>Uploads recentes</h2>
          <button type="button" className="text-button">
            Ver todos
            <Icon name="chevronRight" size={18} />
          </button>
        </div>

        <div className="recent-list">
          {recentUploads.map((file) => (
            <div className="recent-row" key={file.name}>
              <div className="file-info">
                <span className="file-icon">PDF</span>

                <div>
                  <strong>{file.name}</strong>
                  <p className="muted-text">{file.details}</p>
                </div>
              </div>

              <span
                className={
                  file.status === "Concluído"
                    ? "status-badge success"
                    : "status-badge progress"
                }
              >
                {file.status}
              </span>

              <span className="muted-text">{file.date}</span>

              <button type="button" className="icon-button" aria-label="Visualizar upload">
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
