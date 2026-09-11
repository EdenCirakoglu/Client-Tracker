export function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'Not set';
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatHours(value: number | null) {
  if (value === null) {
    return 'No resolved tickets';
  }

  if (value < 1) {
    return '< 1 hour';
  }

  return `${value}h`;
}

export function titleCase(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}
export function ticketReference(id: string) {
  return `CT-${id.slice(0, 8).toUpperCase()}`;
}
