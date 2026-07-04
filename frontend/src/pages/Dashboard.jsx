import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import {
  dashboardMetrics,
  dashboardQuickActions,
  dashboardSummaries,
} from "../mocks/dashboardMock";

function Dashboard() {
  const userEmail = localStorage.getItem("coretext-user-email") || "kayke@example.com";
  const userName = "Kayke";

  return (
    <section className="page-stack dashboard-page">
      <div className="page-heading">
        <div>
          <h1>Olá, {userName}</h1>
          <p className="muted-text">
            Visão geral dos seus PDFs, resumos e atividades recentes.
          </p>
        </div>
      </div>

      <div className="metrics-grid">
        {dashboardMetrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <div className={`metric-icon ${metric.variant}`}>
              <Icon name={metric.icon} size={24} />
            </div>

            <div>
              <p className="muted-text">{metric.label}</p>
              <strong>{metric.value}</strong>
              <span>{metric.hint}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="dashboard-grid">
        <article className="card-surface dashboard-panel">
          <div className="section-header">
            <h2>Ações rápidas</h2>
          </div>

          <div className="quick-actions">
            {dashboardQuickActions.map((action) => (
              <Link
                to={action.to}
                className={`quick-card ${action.variant}-card`}
                key={action.title}
              >
                <span>
                  <Icon name={action.icon} size={24} />
                </span>
                <div>
                  <strong>{action.title}</strong>
                  <p>{action.description}</p>
                </div>
                <Icon name="chevronRight" className="quick-arrow" size={22} />
              </Link>
            ))}
          </div>
        </article>

        <article className="card-surface profile-summary">
          <div>
            <h3>Seu perfil</h3>
            <p className="muted-text">{userEmail}</p>
          </div>

          <Link to="/perfil" className="ghost-button">
            Editar perfil
          </Link>
        </article>
      </div>

      <article className="card-surface">
        <div className="section-header">
          <h2>Resumos recentes</h2>
          <button type="button" className="text-button">
            Ver todos
            <Icon name="chevronRight" size={18} />
          </button>
        </div>

        <div className="summary-table">
          <div className="summary-table-head">
            <span>Arquivo</span>
            <span>Resumo</span>
            <span>Status</span>
            <span>Criado em</span>
            <span>Ações</span>
          </div>

          {dashboardSummaries.map((item) => (
            <div className="summary-table-row" key={item.file}>
              <div className="file-info">
                <span className="file-icon">PDF</span>

                <div>
                  <strong>{item.file}</strong>
                  <p className="muted-text">{item.details}</p>
                </div>
              </div>

              <span>{item.summary}</span>

              <span
                className={
                  item.status === "Concluído"
                    ? "status-badge success"
                    : "status-badge progress"
                }
              >
                {item.status}
              </span>

              <span className="muted-text">{item.date}</span>

              <div className="row-actions">
                <button type="button" className="icon-button" aria-label="Visualizar resumo">
                  <Icon name="eye" size={18} />
                </button>
                <button type="button" className="icon-button" aria-label="Baixar resumo">
                  <Icon name="download" size={18} />
                </button>
                <button type="button" className="icon-button" aria-label="Mais opções">
                  <Icon name="more" size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

export default Dashboard;
