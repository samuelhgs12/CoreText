const summaries = [
	"Resumo do relatório anual com principais tópicos destacados.",
	"Síntese de reunião com decisões e próximos passos.",
	"Resumo automático do documento de referência.",
];

function Summary() {
	return (
		<section className="page-stack">
			<div className="page-heading">
				<div>
					<p className="eyebrow">Análises</p>
					<h1>Resumos</h1>
				</div>
				<p className="muted-text">Espaço para acompanhar os resumos produzidos pelos documentos.</p>
			</div>

			<article className="card-surface">
				<h2>Resumos recentes</h2>
				<div className="summary-list">
					{summaries.map((summary) => (
						<div key={summary} className="summary-item">
							<span className="tag">Novo</span>
							<p>{summary}</p>
						</div>
					))}
				</div>
			</article>
		</section>
	);
}

export default Summary;
