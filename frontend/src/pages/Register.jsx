import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import ThemeToggle from "../components/ThemeToggle";
import { register } from "../services/authService";

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
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
      await register(formData);
      navigate("/dashboard", { replace: true });
    } catch (authError) {
      setError(authError.message || "Não foi possível criar a conta. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <ThemeToggle className="auth-theme-toggle" />

      <section className="auth-visual auth-visual-register">
        <div className="auth-brand">
          <span className="brand-mark">
            <span />
            <span />
            <span />
          </span>
          <strong>CoreText</strong>
        </div>

        <div className="auth-copy">
          <h1>IA para PDFs e resumos inteligentes.</h1>
          <p>Gerencie, resuma e organize seus documentos com rapidez e segurança.</p>
        </div>

        <div className="auth-feature-list">
          <article>
            <span>
              <Icon name="sparkles" size={26} />
            </span>
            <div>
              <strong>Resumos com IA</strong>
              <p>Gere insights rápidos e precisos dos seus PDFs.</p>
            </div>
          </article>

          <article>
            <span>
              <Icon name="cloudUpload" size={26} />
            </span>
            <div>
              <strong>Armazene com segurança</strong>
              <p>Seus documentos protegidos e sempre disponíveis.</p>
            </div>
          </article>

          <article>
            <span>
              <Icon name="folder" size={26} />
            </span>
            <div>
              <strong>Organize e acesse</strong>
              <p>Encontre e acesse seus arquivos de qualquer lugar.</p>
            </div>
          </article>
        </div>

        <div className="auth-illustration register-illustration" aria-hidden="true">
          <div className="floating-upload">
            <Icon name="cloudUpload" size={34} />
          </div>
          <div className="floating-doc">
            <span />
            <span />
            <div />
            <span />
            <span />
          </div>
          <div className="floating-summary">
            <span />
            <span />
            <span />
          </div>
        </div>
      </section>

      <section className="auth-card">
        <h1>Criar conta</h1>
        <p className="muted-text">Preencha os dados abaixo para criar sua conta no CoreText.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Nome completo</span>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Digite seu nome completo"
              autoComplete="name"
              disabled={isSubmitting}
              required
            />
          </label>

          <label className="field">
            <span>Username</span>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Escolha seu username"
              autoComplete="username"
              disabled={isSubmitting}
              required
            />
          </label>

          <label className="field">
            <span>E-mail</span>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Digite seu e-mail"
              autoComplete="email"
              disabled={isSubmitting}
              required
            />
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
                placeholder="Crie uma senha segura"
                autoComplete="new-password"
                disabled={isSubmitting}
                minLength={8}
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
            <small>Mínimo de 8 caracteres.</small>
          </label>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? "Criando conta..." : "Cadastrar"}
          </button>
        </form>

        <p className="auth-footer">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </section>
    </div>
  );
}

export default Register;
