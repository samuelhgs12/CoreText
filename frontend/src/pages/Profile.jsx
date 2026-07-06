function Profile() {
	return (
		<section className="page-stack">
			<div className="page-heading">
				<div>
					<p className="eyebrow">Conta</p>
					<h1>Perfil</h1>
				</div>
				<p className="muted-text">Dados básicos do usuário para apresentação da interface.</p>
			</div>

			<div className="two-column-grid">
				<article className="card-surface profile-card">
					<div className="avatar">KT</div>
					<div>
						<h2>Kayke TCA</h2>
						<p className="muted-text">kayke@example.com</p>
					</div>
				</article>

				<article className="card-surface">
					<h2>Preferências</h2>
					<ul className="simple-list">
						<li>Idioma: Português</li>
						<li>Área padrão: Dashboard</li>
					</ul>
				</article>
			</div>
		</section>
	);
}

export default Profile;
