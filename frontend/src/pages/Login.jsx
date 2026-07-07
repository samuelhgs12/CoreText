import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import ThemeToggle from "../components/ThemeToggle";
import { login } from "../services/authService";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || "/dashboard";
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(formData);
      navigate(redirectTo, { replace: true });
    } catch (authError) {
      setError(authError.message || "Não foi possível fazer login. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <ThemeToggle className="auth-theme-toggle" />

      <section className="auth-visual auth-visual-login">
        <div className="auth-brand">
          <span className="brand-mark">
            <span />
            <span />
            <span />
          </span>
          <strong>CoreText</strong>
        </div>

        <div className="auth-copy">
          <h1>
            Gerencie seus PDFs e gere resumos com IA de forma{" "}
            <span>rápida e inteligente.</span>
          </h1>
          <p>
            Organize, analise e extraia insights dos seus documentos com o poder da
            Inteligência Artificial.
          </p>
        </div>

        <div className="auth-illustration login-illustration" aria-hidden="true">
          <div className="mock-document">
            <span className="pdf-ribbon">PDF</span>
            <span />
            <span />
            <span />
            <span />
            <span />
            <div className="mock-image" />
            <div className="mock-search">
              <Icon name="search" size={34} />
            </div>
          </div>

          <div className="insight-card insight-card-purple">
            <span>
              <Icon name="sparkles" size={30} />
            </span>
            <div>
              <strong>Resumo gerado com IA</strong>
              <em />
              <em />
            </div>
          </div>

          <div className="insight-card insight-card-green">
            <span>
              <Icon name="shield" size={30} />
            </span>
            <div>
              <strong>Informações extraídas</strong>
              <em />
              <em />
            </div>
          </div>
        </div>
      </section>

      <section className="auth-card">
        <h1>Entrar</h1>
        <p className="muted-text">Bem-vindo de volta! Faça login para continuar.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>E-mail ou username</span>
            <div className="input-shell">
              <Icon name="mail" className="input-icon" size={21} />
              <input
                type="text"
                name="identifier"
                value={formData.identifier}
                onChange={handleChange}
                autoComplete="username"
                disabled={isSubmitting}
                required
              />
            </div>
          </label>

          <label className="field">
            <span>Senha</span>
            <div className="input-shell">
              <Icon name="lock" className="input-icon" size={21} />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                disabled={isSubmitting}
                required
              />
              <button
                type="button"
                className="field-icon-button"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                onClick={() => setShowPassword((currentValue) => !currentValue)}
              >
                <Icon name="eye" size={20} />
              </button>
            </div>
          </label>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="auth-divider">
          <span />
          <p>ou</p>
          <span />
        </div>

        <p className="auth-footer">
          Não tem conta? <Link to="/cadastro">Criar conta</Link>
        </p>

        <p className="auth-safe-note">
          <Icon name="shield" size={18} />
          Seus dados estão protegidos com segurança de ponta a ponta.
        </p>
      </section>
    </div>
  );
}

export default Login;
