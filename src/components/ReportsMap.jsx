import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { MAP_CENTER, MAP_ZOOM, getCategory } from '../constants'
import {
  ALL_DISTRICTS,
  DISTRICT_GEO,
  DISTRICT_ZOOM,
  DISTRICT_ZOOM_NARROW,
  NARROW_MAP_WIDTH,
} from '../constants/districts'
import { clusterIcon, reportIcon, spiderIcon } from '../utils/mapIcons'
import { groupOverlapping, spiderPositions } from '../utils/markerClusters'

/**
 * Secilen isaretciyi panelin ortmedigi bolgeye kaydirir.
 *
 * Panel ekranin ortasinda (mobilde altta) durdugu icin isaretci arkasinda
 * kalabiliyor. Cozum: haritayi, isaretci ekranin ust bandina gelecek sekilde
 * kaydirmak.
 *
 * Matematik: panTo(L) verilen konumu kabin merkezine (C) getirir. Isaretcinin
 * hedef noktaya (T) gelmesini istiyorsak, yeni merkez su anki kordinatlarda
 * P - T + C noktasidir (P = isaretcinin su anki nokta konumu).
 */
function PanToSelected({ report }) {
  const map = useMap()

  useEffect(() => {
    if (!report) return

    const size = map.getSize()
    const isNarrow = size.x <= 860

    // Isaretcinin oturmasini istedigimiz nokta: yatayda orta, dikeyde ust bant
    const targetX = size.x / 2
    const targetY = size.y * (isNarrow ? 0.2 : 0.13)

    const point = map.latLngToContainerPoint([report.latitude, report.longitude])
    const newCenter = map.containerPointToLatLng([
      point.x - targetX + size.x / 2,
      point.y - targetY + size.y / 2,
    ])

    map.panTo(newCenter, { animate: true, duration: 0.35 })
  }, [report, map])

  return null
}

/**
 * Isaretci katmani. Ust uste binenleri tek sayaca topluyor, tiklaninca
 * cember uzerine daginiyor.
 *
 * Neden burada: gruplama ekran pikseline gore yapiliyor, yani harita
 * ornegine (map.project) ihtiyac var. Bu ancak MapContainer'in cocugunda
 * mumkun.
 */
function MarkerLayer({ reports, selectedId, onSelect, onClear }) {
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())
  const [openKey, setOpenKey] = useState(null)

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
    // Bos bir yere tiklamak hem secimi hem acik kumeyi kapatiyor
    click: () => {
      setOpenKey(null)
      onClear()
    },
  })

  const groups = useMemo(
    () =>
      groupOverlapping(reports, (report) =>
        map.project([report.latitude, report.longitude], zoom),
      ),
    [reports, zoom, map],
  )

  // Zoom degisince piksel yakinliklari degisiyor: eski grup artik ayni grup
  // olmayabilir, acik durumu tasimanin anlami yok.
  useEffect(() => {
    setOpenKey(null)
  }, [zoom])

  // Secili kayit kapali bir kumenin icindeyse kumeyi ac — aksi halde panel
  // acilir ama haritada hangi isaretci oldugu gorunmez.
  useEffect(() => {
    if (!selectedId) return
    const owner = groups.find(
      (group) =>
        group.members.length > 1 &&
        group.members.some((member) => member.id === selectedId),
    )
    if (owner) setOpenKey(owner.key)
  }, [selectedId, groups])

  const toLatLng = useCallback(
    (x, y) => map.unproject([x, y], zoom),
    [map, zoom],
  )

  return groups.flatMap((group) => {
    const index = reports.indexOf(group.members[0])

    // --- tek isaretci: eskisi gibi ---
    if (group.members.length === 1) {
      const report = group.members[0]
      return [
        <Marker
          key={report.id}
          position={[report.latitude, report.longitude]}
          // index kademeli "damla" animasyonunun gecikmesini belirliyor
          icon={reportIcon(
            report.category,
            report.status,
            index,
            report.id === selectedId,
          )}
          eventHandlers={{ click: () => onSelect(report.id) }}
          alt={getCategory(report.category).label}
          keyboard
        />,
      ]
    }

    const center = toLatLng(group.x, group.y)

    // --- kapali kume: sayac ---
    if (openKey !== group.key) {
      const hasSelected = group.members.some(
        (member) => member.id === selectedId,
      )
      return [
        <Marker
          key={group.key}
          position={center}
          icon={clusterIcon(group.members.length, hasSelected)}
          eventHandlers={{ click: () => setOpenKey(group.key) }}
          alt={`${group.members.length} bildirim`}
          keyboard
        />,
      ]
    }

    // --- acik kume: bacaklar + dagilmis uyeler ---
    const offsets = spiderPositions(group.members.length)

    return group.members.flatMap((report, memberIndex) => {
      const offset = offsets[memberIndex]
      const position = toLatLng(group.x + offset.dx, group.y + offset.dy)

      return [
        <Polyline
          key={`${report.id}-leg`}
          positions={[center, position]}
          pathOptions={{ className: 'map-spider-leg', interactive: false }}
        />,
        <Marker
          key={report.id}
          position={position}
          icon={spiderIcon(
            report.category,
            report.status,
            report.id === selectedId,
            offset,
            memberIndex,
          )}
          eventHandlers={{ click: () => onSelect(report.id) }}
          alt={getCategory(report.category).label}
          keyboard
        />,
      ]
    })
  })
}

/**
 * Ilce secildiginde haritayi o ilcenin merkezine ucur.
 * "Tumu" secilince Adana geneline geri doner.
 */
function FlyToDistrict({ district }) {
  const map = useMap()

  useEffect(() => {
    if (district === ALL_DISTRICTS) {
      map.flyTo(MAP_CENTER, MAP_ZOOM, { duration: 0.6 })
      return
    }

    const geo = DISTRICT_GEO[district]
    if (!geo) return

    // Zoom ekran genisligine gore: sabit bir deger masaustunde dogru gelirken
    // telefonda ilcenin yalnizca ucte birini gosteriyor.
    const zoom =
      map.getSize().x < NARROW_MAP_WIDTH ? DISTRICT_ZOOM_NARROW : DISTRICT_ZOOM

    // focus tanimliysa o, degilse geometrik merkez — bkz. districts.js
    map.flyTo(geo.focus ?? geo.center, zoom, { duration: 0.6 })
  }, [district, map])

  return null
}

export default function ReportsMap({
  reports,
  selectedId,
  onSelect,
  onClear,
  focusDistrict,
}) {
  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedId) ?? null,
    [reports, selectedId],
  )

  return (
    <MapContainer
      className="map"
      center={MAP_CENTER}
      zoom={MAP_ZOOM}
      scrollWheelZoom
      /* Ilce odaginin yarim kademede durabilmesi icin (13.5). Varsayilan 1
         ile tam kademeler arasinda secim yok: 13 fazla genis, 14 fazla yakin.
         zoomDelta 1 kaliyor, yani +/- dugmeleri yine tam kademe atliyor. */
      zoomSnap={0.5}
      zoomDelta={1}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıda bulunanlar'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FlyToDistrict district={focusDistrict} />
      <PanToSelected report={selectedReport} />

      <MarkerLayer
        reports={reports}
        selectedId={selectedId}
        onSelect={onSelect}
        onClear={onClear}
      />
    </MapContainer>
  )
}
