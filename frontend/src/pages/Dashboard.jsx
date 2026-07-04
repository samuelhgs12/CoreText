function Dashboard() {
	const metrics = [
		{ label: "Documentos enviados", value: "24" },
		{ label: "Resumos gerados", value: "18" },
		{ label: "Arquivos recentes", value: "6" },
	];

	const activities = [
		"Upload do relatório trimestral",
		"Resumo do capítulo 3 atualizado",
		"Novo arquivo indexado com sucesso",
	];

	return (
		<section className="page-stack">
			<div className="page-heading">
				<div>
					<p className="eyebrow">Visão geral</p>
					<h1>Dashboard</h1>
				</div>
				<p className="muted-text">Resumo rápido das principais ações da plataforma.</p>
			</div>

			<div className="metrics-grid">
				{metrics.map((metric) => (
					<article className="metric-card" key={metric.label}>
						<span className="metric-value">{metric.value}</span>
						<span className="muted-text">{metric.label}</span>
					</article>
				))}
			</div>

			<div className="two-column-grid">
				<article className="card-surface">
					<h2>Atividades recentes</h2>
					<ul className="simple-list">
						{activities.map((item) => (
							<li key={item}>{item}</li>
						))}
					</ul>
				</article>

				<article className="card-surface">
					<h2>Próximos passos</h2>
					<p className="muted-text">
						Use o menu lateral para acessar upload, arquivos, resumos e perfil.
					</p>
				</article>
			</div>
		</section>
	);
}

export default Dashboard;
