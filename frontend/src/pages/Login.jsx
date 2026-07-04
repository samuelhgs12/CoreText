import { Link, useLocation, useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";

function Login() {
	const navigate = useNavigate();
	const location = useLocation();
	const redirectTo = location.state?.from || "/dashboard";

	const handleSubmit = (event) => {
		event.preventDefault();
		localStorage.setItem("coretext-token", "demo-token");
		navigate(redirectTo, { replace: true });
	};

	return (
		<div className="auth-page">
			<ThemeToggle className="auth-theme-toggle" />

			<section className="auth-card">
				<p className="eyebrow">Acesso à plataforma</p>
				<h1>Entrar no CoreText</h1>
				<p className="muted-text">Use a tela abaixo para simular o login da demonstração.</p>

				<form className="auth-form" onSubmit={handleSubmit}>
					<label className="field">
						<span>E-mail</span>
						<input type="email" placeholder="voce@exemplo.com" required />
					</label>

					<label className="field">
						<span>Senha</span>
						<input type="password" placeholder="••••••••" required />
					</label>

					<button type="submit" className="primary-button">Entrar</button>
				</form>

				<p className="auth-footer">
					Não tem conta? <Link to="/cadastro">Criar cadastro</Link>
				</p>
			</section>

			<section className="auth-aside card-surface">
				<span className="status-pill">Demo</span>
				<h2>Organize documentos, uploads e resumos em uma única base visual.</h2>
				<p className="muted-text">
					A tela de login prepara o acesso às áreas internas e redireciona para o dashboard.
				</p>
			</section>
		</div>
	);
}

export default Login;
