import { getCategory } from '../constants'

/**
 * Kategori rozeti. Kategoriler renk taşımaz — renk uygulamada yalnızca
 * durumu anlatır. Kategori kimliğini ikon veriyor.
 */
export default function CategoryBadge({ category }) {
  const { label, Icon } = getCategory(category)

  return (
    <span className="badge badge--outline" style={{ '--badge-color': 'var(--color-primary)' }}>
      <Icon aria-hidden="true" />
      {label}
    </span>
  )
}
