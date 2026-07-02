export const TENANT_COLORS = [
  '#22d3ee',
  '#c084fc',
  '#34d399',
  '#fb7185',
  '#facc15',
  '#60a5fa',
  '#f97316',
  '#a3e635',
]

export function getTenantColor(tenantId: string | undefined, orderedTenantIds: string[] = []) {
  if (!tenantId) {
    return '#94a3b8'
  }

  const orderedIndex = orderedTenantIds.indexOf(tenantId)
  const colorIndex = orderedIndex >= 0 ? orderedIndex : hashTenantId(tenantId)

  return TENANT_COLORS[colorIndex % TENANT_COLORS.length]
}

function hashTenantId(tenantId: string) {
  return tenantId.split('').reduce((hash, character) => hash + character.charCodeAt(0), 0)
}
