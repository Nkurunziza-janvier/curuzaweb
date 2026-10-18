import { useEffect } from "react";
import { LocateFixed } from "lucide-react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useLanguage } from "../../i18n";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

const kigali: Coordinates = { latitude: -1.9441, longitude: 30.0619 };

const businessPin = L.divIcon({
  className: "",
  html: '<div style="width:34px;height:34px;border:3px solid white;border-radius:50% 50% 50% 0;background:#f1664b;transform:rotate(-45deg);box-shadow:0 3px 12px rgba(23,20,43,.3)"><div style="width:10px;height:10px;margin:9px;border-radius:50%;background:white"></div></div>',
  iconSize: [34, 42],
  iconAnchor: [17, 40],
});

function MapClickHandler({ onSelect }: { onSelect: (coordinates: Coordinates) => void }) {
  useMapEvents({
    click: ({ latlng }) => onSelect({ latitude: latlng.lat, longitude: latlng.lng }),
  });
  return null;
}

function MapCamera({ coordinates }: { coordinates: Coordinates | null }) {
  const map = useMap();
  useEffect(() => {
    if (coordinates) map.flyTo([coordinates.latitude, coordinates.longitude], Math.max(map.getZoom(), 15), { duration: 0.5 });
  }, [coordinates, map]);
  return null;
}

export function LocationPicker({
  coordinates,
  onSelect,
  onGeolocationError,
  title = "Pin your business location",
  description = "Click the map to place or move your pin.",
  mapHeight = 320,
}: {
  coordinates: Coordinates | null;
  onSelect: (coordinates: Coordinates) => void;
  onGeolocationError: (message: string) => void;
  title?: string;
  description?: string;
  mapHeight?: number;
}) {
  const { t } = useLanguage();
  const center = coordinates ?? kigali;

  const useMyLocation = () => {
    onGeolocationError("");
    if (!navigator.geolocation) {
      onGeolocationError(t("Location is not available in this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => onSelect({ latitude: coords.latitude, longitude: coords.longitude }),
      () => onGeolocationError(t("We couldn't access your location. Allow location access or choose a spot on the map.")),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <p className="text-sm font-bold text-ink">{title}</p>
          <p className="text-xs text-muted">{description}</p>
        </div>
        <button type="button" onClick={useMyLocation} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold text-ink transition hover:border-violet hover:text-violet">
          <LocateFixed size={16} /> {t("Use my location")}
        </button>
      </div>
      <MapContainer center={[center.latitude, center.longitude]} zoom={coordinates ? 15 : 12} scrollWheelZoom className="w-full" style={{ height: mapHeight }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onSelect={onSelect} />
        <MapCamera coordinates={coordinates} />
        {coordinates && <Marker position={[coordinates.latitude, coordinates.longitude]} icon={businessPin} />}
      </MapContainer>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-[#faf9f6] px-4 py-3">
        {coordinates
          ? <p className="text-xs font-medium text-muted">{t("Pin selected")} · {coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}</p>
          : <p className="text-xs text-muted">{t("No pin yet — choose a spot on the map.")}</p>}
        {coordinates && <a className="text-xs font-bold text-violet hover:underline" href={`https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`} target="_blank" rel="noreferrer">{t("Open pin in Google Maps")} ↗</a>}
      </div>
    </div>
  );
}
