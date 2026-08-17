import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteReport } from '../services/reportsService'

/**
 * Silme butonu — iki adimli.
 *
 * Tek tikla silmiyor: once "Emin misiniz?" durumuna geciyor. Silme geri
 * alinamaz bir islem ve bu kartlar liste icinde yan yana duruyor; yanlis
 * karta tiklamak cok kolay. Tarayicinin confirm() penceresi yerine satir ici
 * onay kullaniliyor, boylece hangi kaydin silinecegi gozden kaybolmuyor.
 */
export default function DeleteReportButton({ reportId, onDeleted, label = 'Sil' }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setBusy(true)
    setError('')

    try {
      await deleteReport(reportId)
      // Basarili olursa bilesen genellikle listeden dusup unmount olur;
      // bu yuzden burada state guncellemiyoruz.
      onDeleted?.()
    } catch (deleteError) {
      console.error('[report] silme hatasi:', deleteError)
      setError(
        deleteError?.code === 'permission-denied'
          ? 'Silme yetkiniz yok. Yalnızca kendi bildirimlerinizi silebilirsiniz.'
          : (deleteError.message ?? 'Bildirim silinemedi.'),
      )
      setBusy(false)
      setConfirming(false)
    }
  }

  if (error) {
    return (
      <span className="delete-action__error" role="alert">
        {error}
      </span>
    )
  }

  if (!confirming) {
    return (
      <button
        type="button"
        className="btn btn--sm btn--danger-ghost"
        onClick={() => setConfirming(true)}
      >
        <Trash2 size={14} aria-hidden="true" />
        {label}
      </button>
    )
  }

  return (
    <span className="delete-action">
      <span className="delete-action__question">Silinsin mi?</span>
      <button
        type="button"
        className="btn btn--sm btn--danger"
        onClick={handleDelete}
        disabled={busy}
      >
        {busy ? 'Siliniyor…' : 'Evet, sil'}
      </button>
      <button
        type="button"
        className="btn btn--sm btn--outline"
        onClick={() => setConfirming(false)}
        disabled={busy}
      >
        Vazgeç
      </button>
    </span>
  )
}
