'use client'
import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

// Fix default marker icons broken by webpack
function fixLeafletIcons() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

function makeIcon(available: boolean) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:36px;height:36px;border-radius:50%;
        background:${available ? '#22c55e' : '#6b7280'};
        border:3px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.4);
        display:flex;align-items:center;justify-content:center;
        font-size:16px;
      ">⚙️</div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  })
}

interface TechLocation {
  id: number
  name: string
  email: string
  technician: {
    isAvailable: boolean
    currentWorkload: number
    zone: string
    latitude: number | null
    longitude: number | null
    locationUpdatedAt: string | null
    category: { name: string } | null
  } | null
}

interface Props {
  techs: TechLocation[]
}

export default function TechnicianMap({ techs }: Props) {
  useEffect(() => { fixLeafletIcons() }, [])

  // Default centre: Vellore Institute of Technology campus (example)
  const defaultCenter: [number, number] = [12.9716, 79.1588]

  const placed = techs.filter(t => t.technician?.latitude != null && t.technician?.longitude != null)

  const centre: [number, number] =
    placed.length > 0
      ? [placed[0].technician!.latitude!, placed[0].technician!.longitude!]
      : defaultCenter

  return (
    <MapContainer
      center={centre}
      zoom={placed.length > 0 ? 16 : 15}
      style={{ height: '460px', width: '100%', borderRadius: '12px', zIndex: 0 }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {placed.map(tech => {
        const lat = tech.technician!.latitude!
        const lng = tech.technician!.longitude!
        const avail = tech.technician?.isAvailable ?? false
        const updated = tech.technician?.locationUpdatedAt
          ? new Date(tech.technician.locationUpdatedAt).toLocaleTimeString()
          : 'Unknown'

        return (
          <Marker key={tech.id} position={[lat, lng]} icon={makeIcon(avail)}>
            <Popup>
              <div style={{ minWidth: '160px', fontFamily: 'Inter, sans-serif' }}>
                <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>{tech.name}</p>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '2px' }}>{tech.technician?.category?.name ?? 'General'}</p>
                <p style={{ fontSize: '0.8rem', marginBottom: '2px' }}>
                  Zone: <strong>{tech.technician?.zone}</strong>
                </p>
                <p style={{ fontSize: '0.8rem', marginBottom: '2px' }}>
                  Workload: <strong>{tech.technician?.currentWorkload} active</strong>
                </p>
                <p style={{ fontSize: '0.8rem', marginBottom: '6px', color: avail ? '#16a34a' : '#6b7280' }}>
                  {avail ? '🟢 Available' : '⚫ Offline'}
                </p>
                <p style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Updated: {updated}</p>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
