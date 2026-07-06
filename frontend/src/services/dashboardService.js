import { apiRequest } from "./api";

function normalizeMetric(metric) {
  return {
    label: metric.label,
    value: metric.value,
    hint: metric.hint,
    icon: metric.icon,
    variant: metric.variant,
  };
}

function normalizeSummary(summary) {
  return {
    id: summary.id,
    file: summary.file,
    details: summary.details,
    summary: summary.summary,
    status: summary.status,
    date: summary.date,
    type: summary.type,
  };
}

export async function getDashboard() {
  const dashboard = await apiRequest("/dashboard");

  return {
    metrics: dashboard.metrics.map(normalizeMetric),
    recentSummaries: dashboard.recent_summaries.map(normalizeSummary),
  };
}
