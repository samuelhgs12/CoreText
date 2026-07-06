import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import { dashboardQuickActions } from "../mocks/dashboardMock";
import { getCurrentUser } from "../services/authService";
import { getDashboard } from "../services/dashboardService";

function formatDate(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function Dashboard() {
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [metrics, setMetrics] = useState([]);
  const [recentSummaries, setRecentSummaries] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const userName = currentUser?.name?.split(" ")?.[0] || "Usuário";
  const userEmail = currentUser?.email || currentUser?.username || "Conta CoreText";

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setFeedback(null);

      try {
        const dashboard = await getDashboard();

        if (!isMounted) {
          return;
        }

        setMetrics(dashboard.metrics);
        setRecentSummaries(dashboard.recentSummaries);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setFeedback({
          type: "error",
          text: error.message || "Não foi possível carregar os dados do dashboard.",
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    function handleUserUpdated() {
      setCurrentUser(getCurrentUser());
    }

    loadDashboard();
    window.addEventListener("coretext:user-updated", handleUserUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener("coretext:user-updated", handleUserUpdated);
    };
  }, []);

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

      {feedback && (
        <p className={`feedback-message ${feedback.type}`} role="status">
          {feedback.text}
        </p>
      )}

      <div className="metrics-grid">
        {isLoading &&
          Array.from({ length: 4 }).map((_, index) => (
            <article className="metric-card" key={index}>
              <div className="metric-icon blue">
                <Icon name="refresh" size={24} />
              </div>

              <div className="metric-content">
                <p className="muted-text">Carregando</p>
                <strong>...</strong>
              </div>
            </article>
          ))}

        {!isLoading && metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <div className={`metric-icon ${metric.variant}`}>
              <Icon name={metric.icon} size={24} />
            </div>

            <div className="metric-content">
              <p className="muted-text">{metric.label}</p>
              <strong>{metric.value}</strong>
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
            Ver perfil
          </Link>
        </article>
      </div>

      <article className="card-surface">
        <div className="section-header">
          <h2>Resumos recentes</h2>
          <Link to="/resumos" className="text-button">
            Ver todos
            <Icon name="chevronRight" size={18} />
          </Link>
        </div>

        <div className="summary-table">
          <div className="summary-table-head">
            <span>Arquivo</span>
            <span>Resumo</span>
            <span>Status</span>
            <span>Criado em</span>
            <span>Ações</span>
          </div>

          {isLoading && <div className="empty-state">Carregando resumos...</div>}

          {!isLoading && recentSummaries.length === 0 && (
            <div className="empty-state">
              <Icon name="sparkles" size={30} />
              <strong>Nenhum resumo gerado ainda</strong>
              <p className="muted-text">
                Selecione arquivos na listagem para gerar seu primeiro resumo.
              </p>
            </div>
          )}

          {!isLoading && recentSummaries.map((item) => (
            <div className="summary-table-row" key={item.id}>
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

              <span className="muted-text">{formatDate(item.date)}</span>

              <div className="row-actions">
                <Link to="/resumos" className="icon-button" aria-label="Visualizar resumo">
                  <Icon name="eye" size={18} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

export default Dashboard;
