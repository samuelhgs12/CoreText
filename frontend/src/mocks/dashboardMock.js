export const dashboardMetrics = [
  {
    label: "PDFs enviados",
    value: "127",
    hint: "+12 este mês",
    icon: "fileText",
    variant: "blue",
  },
  {
    label: "Resumos gerados",
    value: "89",
    hint: "+18 este mês",
    icon: "sparkles",
    variant: "green",
  },
  {
    label: "Em andamento",
    value: "24",
    hint: "+6 este mês",
    icon: "refresh",
    variant: "purple",
  },
  {
    label: "Arquivos recentes",
    value: "6",
    hint: "últimos 7 dias",
    icon: "archive",
    variant: "orange",
  },
];

export const dashboardSummaries = [
  {
    file: "Inteligência Artificial na Educação.pdf",
    details: "14 páginas • 1,2 MB",
    summary: "Resumo completo",
    status: "Concluído",
    date: "22/05/2025, 14:32",
  },
  {
    file: "Aprendizado de Máquina Avançado.pdf",
    details: "28 páginas • 2,7 MB",
    summary: "Resumo completo",
    status: "Concluído",
    date: "21/05/2025, 09:15",
  },
  {
    file: "Processamento de Linguagem Natural.pdf",
    details: "22 páginas • 1,8 MB",
    summary: "Resumo em tópicos",
    status: "Em andamento",
    date: "19/05/2025, 11:02",
  },
];

export const dashboardQuickActions = [
  {
    to: "/upload",
    title: "Enviar PDF",
    description: "Adicionar novo documento",
    icon: "cloudUpload",
    variant: "blue",
  },
  {
    to: "/resumos",
    title: "Gerar resumo",
    description: "Criar resumo com IA",
    icon: "sparkles",
    variant: "green",
  },
  {
    to: "/arquivos",
    title: "Ver arquivos",
    description: "Organizar sua biblioteca",
    icon: "folder",
    variant: "purple",
  },
];
