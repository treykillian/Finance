export function safeToSpendBreakdown({
  cash = 0,
  buffer = 0,
  obligations = [],
  start = '2026-01-01',
  end = '2026-01-01'
} = {}) {
  const obligationTotal = obligations.reduce((total, item) => total + Number(item.amount || 0), 0);
  const safeAmount = Math.max(Number(cash || 0) - Number(buffer || 0) - obligationTotal, 0);
  const days = Math.max(daysBetween(start, end) + 1, 1);
  return {
    cash: Number(cash || 0),
    buffer: Number(buffer || 0),
    obligationTotal,
    safeAmount,
    dailyAmount: safeAmount / days,
    start,
    end
  };
}

export function daysBetween(startValue, endValue) {
  const start = new Date(`${startValue}T00:00:00`);
  const end = new Date(`${endValue}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(Math.round((end - start) / 86400000), 0);
}

export function chooseBestAction({ dueSoon = [], dataIssueCount = 0, safeAmount = 0, savingsRatio = 0, leftover = 0 } = {}) {
  if (dueSoon.length) return 'handle-due-item';
  if (dataIssueCount > 0) return 'clean-data';
  if (safeAmount <= 0) return 'hold-spending';
  if (savingsRatio < 0.2 && leftover > 0) return 'move-leftover';
  return 'stay-on-track';
}
