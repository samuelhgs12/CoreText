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


INTEGRATED_SUMMARY_SYSTEM_INSTRUCTION = (
    "Você é um assistente que gera resumos integrados a partir de múltiplos documentos "
    "PDF para estudantes universitários. Responda sempre em português do Brasil."
)


def build_integrated_summary_prompt(documents: list[tuple[str, str]]) -> str:
    """Monta o prompt de resumo integrado a partir de vários documentos.

    Args:
        documents: lista de tuplas (nome_do_arquivo, texto_extraído), na ordem
            em que o usuário selecionou os arquivos.
    """
    sections = "\n\n".join(
        f'### Documento: {filename}\n"""\n{text}\n"""' for filename, text in documents
    )
    return (
        "A seguir estão os textos extraídos de múltiplos documentos PDF selecionados "
        "pelo mesmo usuário. Gere um ÚNICO resumo integrado que sintetize os pontos "
        "principais de todos os documentos, destacando temas em comum, complementaridades "
        "e eventuais contradições entre eles. Organize o resumo de forma coesa, sem tratar "
        "os documentos separadamente. Não invente informações que não estejam nos textos.\n\n"
        f"{sections}"
    )
