"""Templates de prompt enviados à LLM para geração de resumos."""

INDIVIDUAL_SUMMARY_SYSTEM_INSTRUCTION = (
    "Você é um assistente que gera resumos claros e objetivos de documentos PDF "
    "para estudantes universitários. Responda sempre em português do Brasil."
)


def build_individual_summary_prompt(document_text: str) -> str:
    """Monta o prompt de resumo individual a partir do texto extraído do PDF."""
    return (
        "Resuma o documento abaixo, destacando os pontos principais, conceitos-chave "
        "e conclusões. Use linguagem clara, organizada em parágrafos curtos ou tópicos "
        "quando apropriado. Não invente informações que não estejam no texto.\n\n"
        "Documento:\n"
        f'"""\n{document_text}\n"""'
    )
