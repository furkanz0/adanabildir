import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { MAP_CENTER } from '../constants'
import { pickerIcon } from '../utils/mapIcons'

function ClickHandler({ onChange }) {
  useMapEvents({
    click(event) {
      onChange(event.latlng.lat, event.latlng.lng)
    },
  })
  return null
}

/**
 * Konumu harita uzerinden secmeyi saglar.
 *
 * navigator.geolocation her ortamda calismaz: kurumsal cihazlarda konum
 * servisi kapali olabilir, tarayici izin vermeyebilir ya da HTTPS olmayan bir
 * adresten aciliyor olabilir. Bu bilesen o durumlarda geri donus yolu, GPS
 * calisirken de duzeltme araci olarak kullaniliyor.
 */
export default function LocationPicker({ value, onChange }) {
  const center = value ? [value.latitude, value.longitude] : MAP_CENTER

  return (
    <div className="location-picker">
      <MapContainer
        className="location-picker__map"
        center={center}
        zoom={value ? 16 : 13}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıda bulunanlar'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ClickHandler onChange={onChange} />

        {value ? (
          <Marker
            position={[value.latitude, value.longitude]}
            icon={pickerIcon}
            draggable
            eventHandlers={{
              dragend: (event) => {
                const { lat, lng } = event.target.getLatLng()
                onChange(lat, lng)
              },
            }}
          />
        ) : null}
      </MapContainer>

      <p className="location-picker__hint">
        Sorunun olduğu yere haritada tıklayın. İşaretçiyi sürükleyerek de ince
        ayar yapabilirsiniz.
      </p>
    </div>
  )
}
