import { getStatus } from '../constants'

/**
 * @param {'solid'|'outline'|'soft'} [variant]
 */
export default function StatusBadge({ status, variant = 'solid' }) {
  const { label, hex, ink, text, Icon } = getStatus(status)

  const variantClass =
    variant === 'outline'
      ? 'badge badge--outline'
      : variant === 'soft'
        ? 'badge badge--soft'
        : 'badge'

  return (
    <span
      className={variantClass}
      style={{ '--badge-color': hex, '--badge-ink': ink, '--badge-text': text }}
    >
      <Icon aria-hidden="true" />
      {label}
    </span>
  )
}
