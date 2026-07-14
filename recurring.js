export const recurringFrequencies = ['weekly','biweekly','semimonthly','monthly','quarterly','yearly'];

export function addRecurringFrequency(dateValue, frequency = 'monthly') {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) throw new Error('Invalid recurring date');
  if (frequency === 'weekly') date.setDate(date.getDate() + 7);
  else if (frequency === 'biweekly') date.setDate(date.getDate() + 14);
  else if (frequency === 'semimonthly') date.setDate(date.getDate() + 15);
  else if (frequency === 'quarterly') date.setMonth(date.getMonth() + 3);
  else if (frequency === 'yearly') date.setFullYear(date.getFullYear() + 1);
  else date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 10);
}

export function recurringOccurrenceId(ruleId, dateValue) {
  return `${ruleId}:${dateValue}`;
}
