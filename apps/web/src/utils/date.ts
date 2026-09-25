export function formatDateTime(isoStr: string | null | undefined): string {
  if (!isoStr) return '-'
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', 
    hour: 'numeric', minute: '2-digit', hour12: true
  })
}
