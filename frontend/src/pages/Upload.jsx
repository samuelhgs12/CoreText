function Upload() {
	return (
		<section className="page-stack">
			<div className="page-heading">
				<div>
					<p className="eyebrow">Envio</p>
					<h1>Upload de arquivos</h1>
				</div>
				<p className="muted-text">Área para enviar documentos e preparar o processamento.</p>
			</div>

			<article className="card-surface upload-card">
				<div className="upload-box">
					<h2>Arraste e solte seus arquivos aqui</h2>
					<p className="muted-text">Aceita PDFs, imagens e documentos de texto para a demonstração.</p>
				</div>

				<label className="field">
					<span>Selecionar arquivo</span>
					<input type="file" />
				</label>

				<button type="button" className="primary-button">Enviar arquivo</button>
			</article>
		</section>
	);
}

export default Upload;
