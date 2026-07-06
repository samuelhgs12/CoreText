import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import { getDashboard } from "../services/dashboardService";
import { getProfile, updateProfile } from "../services/profileService";

const initialForm = {
  name: "",
  username: "",
  email: "",
  avatarUrl: "",
};

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDate(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function Profile() {
  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [activityItems, setActivityItems] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivityLoading, setIsActivityLoading] = useState(true);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setIsLoading(true);

      try {
        const loadedProfile = await getProfile();

        if (!isMounted) {
          return;
        }

        setProfile(loadedProfile);
        setFormData({
          name: loadedProfile.name,
          username: loadedProfile.username,
          email: loadedProfile.email,
          avatarUrl: loadedProfile.avatarUrl,
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setFeedback({
          type: "error",
          text: error.message || "Não foi possível carregar os dados do perfil.",
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    async function loadActivity() {
      setIsActivityLoading(true);

      try {
        const dashboard = await getDashboard();

        if (!isMounted) {
          return;
        }

        const wantedLabels = ["PDFs enviados", "Resumos gerados", "Resumos integrados"];
        setActivityItems(
          wantedLabels
            .map((label) => dashboard.metrics.find((metric) => metric.label === label))
            .filter(Boolean)
        );
      } catch {
        if (!isMounted) {
          return;
        }

        setActivityItems([]);
      } finally {
        if (isMounted) {
          setIsActivityLoading(false);
        }
      }
    }

    loadProfile();
    loadActivity();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleAvatarChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setFeedback({
        type: "error",
        text: "Escolha uma imagem válida para o perfil.",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setFeedback({
        type: "error",
        text: "Não foi possível carregar essa imagem.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const nextProfile = {
        ...formData,
        avatarUrl: reader.result,
      };

      setIsUploadingPhoto(true);
      setFeedback(null);

      try {
        const result = await updateProfile(nextProfile);

        setProfile(result.profile);
        setFormData({
          name: result.profile.name,
          username: result.profile.username,
          email: result.profile.email,
          avatarUrl: result.profile.avatarUrl,
        });
        setFeedback({
          type: result.source === "api" ? "success" : "info",
          text:
            result.source === "api"
              ? "Foto de perfil atualizada com sucesso."
              : "Foto de perfil salva localmente. A atualização via backend será usada quando a rota estiver disponível.",
        });
      } catch (error) {
        setFeedback({
          type: "error",
          text: error.message || "Não foi possível atualizar a foto de perfil.",
        });
      } finally {
        setIsUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  const initials = getInitials(formData.name || "CoreText");

  return (
    <section className="page-stack profile-page">
      <div className="page-heading profile-heading">
        <div>
          <h1>Meu perfil</h1>
          <p className="muted-text">Atualize suas informações pessoais da conta.</p>
        </div>
      </div>

      {feedback && (
        <p className={`feedback-message ${feedback.type}`} role="status">
          {feedback.text}
        </p>
      )}

      <div className="profile-layout">
        <article className="card-surface profile-editor-card">
          <div className="profile-card-heading">
            <h2>Informações pessoais</h2>
            <p className="muted-text">Visualize seus dados e atualize sua foto de perfil.</p>
          </div>

          <div className="profile-form">
            <aside className="profile-photo-panel">
              <button
                type="button"
                className="profile-avatar-preview"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isUploadingPhoto}
                aria-label="Trocar foto de perfil"
              >
                {formData.avatarUrl ? (
                  <img src={formData.avatarUrl} alt="Foto de perfil" />
                ) : (
                  <span>{initials}</span>
                )}

                <span className="profile-camera-button" aria-hidden="true">
                  <Icon name="camera" size={19} />
                </span>
              </button>

              <strong>Foto de perfil</strong>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif"
                className="hidden-file-input"
                onChange={handleAvatarChange}
              />
            </aside>

            <div className="profile-readonly-list">
              <div>
                <span>Nome completo</span>
                <strong>{formData.name || "Kayke Silva"}</strong>
              </div>

              <div>
                <span>Username</span>
                <strong>@{formData.username || "kayke"}</strong>
              </div>

              <div>
                <span>E-mail</span>
                <strong>{formData.email || "kayke@example.com"}</strong>
              </div>
            </div>
          </div>
        </article>

        <aside className="profile-side-column">
          <article className="card-surface profile-info-card">
            <h2>Informações da conta</h2>

            <div className="profile-info-list">
              <div className="profile-info-item">
                <span>
                  <Icon name="calendar" size={22} />
                </span>
                <div>
                  <p className="muted-text">Data de criação</p>
                  <strong>{formatDate(profile?.createdAt || "2024-04-12T12:00:00Z")}</strong>
                </div>
              </div>

              <div className="profile-info-item">
                <span>
                  <Icon name="shield" size={22} />
                </span>
                <div>
                  <p className="muted-text">Username</p>
                  <strong>@{formData.username || "kayke"}</strong>
                </div>
              </div>

              <div className="profile-info-item">
                <span>
                  <Icon name="mail" size={22} />
                </span>
                <div>
                  <p className="muted-text">E-mail cadastrado</p>
                  <strong>{formData.email || "kayke@example.com"}</strong>
                </div>
              </div>
            </div>
          </article>

          <article className="card-surface profile-info-card">
            <h2>Resumo de atividade</h2>
            <p className="muted-text">Dados sincronizados com o dashboard.</p>

            <div className="activity-list">
              {isActivityLoading &&
                ["PDFs enviados", "Resumos gerados", "Resumos integrados"].map((label) => (
                  <div key={label}>
                    <span className="activity-icon blue">
                      <Icon name="refresh" size={18} />
                    </span>
                    <p>{label}</p>
                    <strong>...</strong>
                  </div>
                ))}

              {!isActivityLoading &&
                activityItems.map((item) => (
                  <div key={item.label}>
                    <span className={`activity-icon ${item.variant}`}>
                      <Icon name={item.icon} size={18} />
                    </span>
                    <p>{item.label}</p>
                    <strong>{item.value}</strong>
                  </div>
                ))}

              {!isActivityLoading && activityItems.length === 0 && (
                <p className="muted-text">Não foi possível carregar a atividade agora.</p>
              )}
            </div>

            <Link to="/dashboard" className="ghost-button profile-dashboard-link">
              Ver dashboard
              <Icon name="chevronRight" size={18} />
            </Link>
          </article>
        </aside>
      </div>
    </section>
  );
}

export default Profile;
