import { useState } from 'react'
import { MessageSquarePlus, MessageSquareText } from 'lucide-react'
import { updateReportNote } from '../services/reportsService'

const MAX_LENGTH = 300

/**
 * Admin panelinde belediye aciklamasini yazma/duzenleme alani.
 *
 * Varsayilan olarak kapali duruyor: her kartta acik bir metin kutusu listeyi
 * okunmaz hale getirirdi. Not varsa buton "Notu duzenle" olur ve metnin ilk
 * satiri kartta gorunur, boylece admin hangi kayda not yazdigini listeden
 * gorebilir.
 */
export default function AdminNoteEditor({ reportId, note }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setBusy(true)
    setError('')

    try {
      await updateReportNote(reportId, value)
      setOpen(false)
    } catch (saveError) {
      console.error('[admin] not kaydetme hatasi:', saveError)
      setError(
        saveError?.code === 'permission-denied'
          ? "Firestore kuralları not yazmaya izin vermiyor. README'deki güncel kuralı yayınlayın."
          : (saveError.message ?? 'Not kaydedilemedi.'),
      )
    } finally {
      setBusy(false)
    }
  }

  function handleCancel() {
    setValue(note ?? '')
    setError('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn--sm btn--outline"
        onClick={() => setOpen(true)}
      >
        {note ? (
          <MessageSquareText size={14} aria-hidden="true" />
        ) : (
          <MessageSquarePlus size={14} aria-hidden="true" />
        )}
        {note ? 'Notu düzenle' : 'Not ekle'}
      </button>
    )
  }

  return (
    <div className="note-editor">
      <label className="field__hint" htmlFor={`note-${reportId}`}>
        Belediye açıklaması
      </label>
      <textarea
        id={`note-${reportId}`}
        className="input note-editor__input"
        rows={3}
        maxLength={MAX_LENGTH}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Örn. Ekipler 12 Ağustos'ta asfalt yamasını tamamladı."
        disabled={busy}
      />
      <span className="note-editor__counter">
        {value.length}/{MAX_LENGTH}
      </span>

      {error ? (
        <span className="field__error" role="alert">
          {error}
        </span>
      ) : null}

      <div className="note-editor__actions">
        <button
          type="button"
          className="btn btn--sm btn--outline"
          onClick={handleCancel}
          disabled={busy}
        >
          Vazgeç
        </button>
        <button
          type="button"
          className="btn btn--sm btn--primary"
          onClick={handleSave}
          disabled={busy}
        >
          {busy ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </div>
  )
}
