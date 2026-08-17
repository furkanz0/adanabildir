import { Filter, X } from 'lucide-react'
import { CATEGORIES, STATUSES } from '../constants'
import { ALL_DISTRICTS, DISTRICTS } from '../constants/districts'
import { ALL_DATES, DATE_RANGES } from '../constants/dateRanges'

export const ALL = 'hepsi'

/**
 * Harita ustunde duran suzgec cubugu.
 *
 * Dort suzgecin dordu de ISTEMCIDE calisiyor — veri zaten `onSnapshot` ile
 * bellekte, her degisimde Firestore'a gitmenin anlami yok. (Ilce suzmesi bir
 * ara sunucuda yapiliyordu; ilce alani olmayan eski kayitlari tamamen
 * dusurdugu icin geri alindi — bkz. reportsService.js)
 *
 * Cubuk kac kaydin gizlendigini de soyluyor; aksi halde haritada 3 isaretci
 * varken sagdaki panelin "7 kayit" demesi celiskili gorunurdu.
 */
export default function MapFilters({
  status,
  category,
  district,
  dateRange,
  onStatusChange,
  onCategoryChange,
  onDistrictChange,
  onDateRangeChange,
  onReset,
  visibleCount,
  totalCount,
}) {
  const isFiltered =
    status !== ALL ||
    category !== ALL ||
    district !== ALL_DISTRICTS ||
    dateRange !== ALL_DATES

  return (
    <div className="map-filters">
      <span className="map-filters__icon" aria-hidden="true">
        <Filter size={15} />
      </span>

      <label className="map-filters__field">
        <span className="map-filters__label">İlçe</span>
        <select
          className="map-filters__select"
          value={district}
          onChange={(event) => onDistrictChange(event.target.value)}
        >
          <option value={ALL_DISTRICTS}>Tümü</option>
          {DISTRICTS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="map-filters__field">
        <span className="map-filters__label">Durum</span>
        <select
          className="map-filters__select"
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
        >
          <option value={ALL}>Hepsi</option>
          {Object.entries(STATUSES).map(([key, { label }]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="map-filters__field">
        <span className="map-filters__label">Kategori</span>
        <select
          className="map-filters__select"
          value={category}
          onChange={(event) => onCategoryChange(event.target.value)}
        >
          <option value={ALL}>Hepsi</option>
          {Object.entries(CATEGORIES).map(([key, { label }]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="map-filters__field">
        <span className="map-filters__label">Tarih</span>
        <select
          className="map-filters__select"
          value={dateRange}
          onChange={(event) => onDateRangeChange(event.target.value)}
        >
          {DATE_RANGES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {isFiltered ? (
        <>
          <span className="map-filters__count">
            {visibleCount}/{totalCount}
          </span>
          <button
            type="button"
            className="map-filters__reset"
            onClick={onReset}
            aria-label="Filtreleri temizle"
          >
            <X size={15} />
          </button>
        </>
      ) : null}
    </div>
  )
}
