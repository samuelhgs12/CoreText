import { Link, useNavigate } from "react-router-dom";

function Register() {
	const navigate = useNavigate();

	const handleSubmit = (event) => {
		event.preventDefault();
		localStorage.setItem("coretext-token", "demo-token");
		navigate("/dashboard", { replace: true });
	};

	return (
		<div className="auth-page">
			<section className="auth-card">
				<p className="eyebrow">Novo usuário</p>
				<h1>Criar cadastro</h1>
				<p className="muted-text">Tela simples para demonstrar o fluxo de criação de conta.</p>

				<form className="auth-form" onSubmit={handleSubmit}>
					<label className="field">
						<span>Nome</span>
						<input type="text" placeholder="Seu nome" required />
					</label>

					<label className="field">
						<span>E-mail</span>
						<input type="email" placeholder="voce@exemplo.com" required />
					</label>

					<label className="field">
						<span>Senha</span>
						<input type="password" placeholder="Crie uma senha" required />
					</label>

					<button type="submit" className="primary-button">Criar conta</button>
				</form>

				<p className="auth-footer">
					Já tem conta? <Link to="/login">Voltar para o login</Link>
				</p>
			</section>

			<section className="auth-aside card-surface">
				<span className="status-pill">Fluxo simples</span>
				<h2>Cadastro pensado para uma demonstração rápida da interface.</h2>
				<p className="muted-text">
					Após criar a conta, a navegação leva para o painel principal.
				</p>
			</section>
		</div>
	);
}

export default Register;
