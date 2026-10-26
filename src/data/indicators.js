export const TASK_ONE_INDICATORS = Object.freeze(['pop_resident', 'pop_density'])

export function formatValue(value, metadata = {}) {
  if (value === null || value === undefined) return '无数据'
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: metadata.decimals ?? 1,
    maximumFractionDigits: metadata.decimals ?? 1,
  }).format(value)
}
