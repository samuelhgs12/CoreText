const files = [
	{ name: "relatorio-2026.pdf", type: "PDF", status: "Processado" },
	{ name: "transcricao.docx", type: "DOCX", status: "Em revisão" },
	{ name: "imagem-referencia.png", type: "PNG", status: "Indexado" },
];

function Files() {
	return (
		<section className="page-stack">
			<div className="page-heading">
				<div>
					<p className="eyebrow">Biblioteca</p>
					<h1>Arquivos</h1>
				</div>
				<p className="muted-text">Lista dos arquivos enviados para consulta e acompanhamento.</p>
			</div>

			<article className="card-surface">
				<div className="table-head">
					<h2>Últimos uploads</h2>
					<span className="status-pill">3 itens</span>
				</div>

				<div className="table-list">
					{files.map((file) => (
						<div key={file.name} className="table-row">
							<div>
								<strong>{file.name}</strong>
								<p className="muted-text">{file.type}</p>
							</div>
							<span className="tag">{file.status}</span>
						</div>
					))}
				</div>
			</article>
		</section>
	);
}

export default Files;
