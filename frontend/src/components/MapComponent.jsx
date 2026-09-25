import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTheme } from "../context/ThemeContext";

const getMarkerColor = (markerColor) => {
  if (markerColor === "red") return "#ef4444";
  if (markerColor === "yellow") return "#f59e0b";
  return "#10b981";
};

const getZoneColor = (heatLevel) => {
  if (heatLevel === "Red") return { stroke: "#dc2626", fill: "#ef4444", label: "High Priority" };
  if (heatLevel === "Yellow") return { stroke: "#d97706", fill: "#f59e0b", label: "Medium Priority" };
  return { stroke: "#059669", fill: "#10b981", label: "Low Priority" };
};

const MapComponent = ({ markers = [], zones = [] }) => {
  const { isDark } = useTheme();
  const token = import.meta.env.VITE_MAPBOX_TOKEN;

  const mapContainerRef = useRef(null);
  const mapboxRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markerRefs = useRef([]);
  const leafletZonesLayerRef = useRef(null);
  const leafletMarkersLayerRef = useRef(null);

  // ================= MAPBOX MODE (when token is provided) =================
  useEffect(() => {
    if (!token || !mapContainerRef.current) return;

    mapboxgl.accessToken = token;

    mapboxRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: isDark
        ? "mapbox://styles/mapbox/dark-v11"
        : "mapbox://styles/mapbox/streets-v12",
      center: [80.2341, 13.0418],
      zoom: 11,
    });

    mapboxRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];

      if (mapboxRef.current) {
        mapboxRef.current.remove();
      }
    };
  }, [token]);

  useEffect(() => {
    if (!token || !mapboxRef.current) return;

    mapboxRef.current.setStyle(
      isDark
        ? "mapbox://styles/mapbox/dark-v11"
        : "mapbox://styles/mapbox/streets-v12"
    );
  }, [isDark, token]);

  useEffect(() => {
    if (!token || !mapboxRef.current) return;

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];

    const coordinates = [];

    // Mapbox markers
    markers.forEach((marker) => {
      if (!marker.location?.lng || !marker.location?.lat) return;

      coordinates.push([marker.location.lng, marker.location.lat]);

      const markerElement = document.createElement("div");
      markerElement.className = "custom-map-marker";
      markerElement.style.backgroundColor = getMarkerColor(marker.markerColor);

      const popupHtml = `
        <div class="map-popup">
          <h3>${marker.title}</h3>
          <p><b>ID:</b> ${marker.complaintId}</p>
          <p><b>Status:</b> ${marker.status}</p>
          <p><b>Urgency:</b> ${marker.urgency}</p>
          <p><b>AI Score:</b> ${marker.aiScore}/100</p>
          <p><b>Department:</b> ${marker.department}</p>
          <p><b>Address:</b> ${marker.location?.address || "N/A"}</p>
        </div>
      `;

      const mapMarker = new mapboxgl.Marker(markerElement)
        .setLngLat([marker.location.lng, marker.location.lat])
        .setPopup(new mapboxgl.Popup({ offset: 18 }).setHTML(popupHtml))
        .addTo(mapboxRef.current);

      markerRefs.current.push(mapMarker);
    });

    if (coordinates.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      coordinates.forEach((c) => bounds.extend(c));
      mapboxRef.current.fitBounds(bounds, { padding: 80, maxZoom: 14 });
    }
  }, [markers, zones, isDark, token]);

  // ================= LEAFLET OPENSTREETMAP MODE (Default / Tokenless) =================
  useEffect(() => {
    if (token || !mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current).setView([13.0418, 80.2341], 11);
    leafletMapRef.current = map;

    const tileUrl = isDark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    L.tileLayer(tileUrl, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    leafletZonesLayerRef.current = L.layerGroup().addTo(map);
    leafletMarkersLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, [token]);

  // Tile layer update on dark mode toggle
  useEffect(() => {
    if (token || !leafletMapRef.current) return;

    const map = leafletMapRef.current;
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    const tileUrl = isDark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    L.tileLayer(tileUrl, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
  }, [isDark, token]);

  // Update Leaflet Heatmap Zones & Markers
  useEffect(() => {
    if (token || !leafletMapRef.current || !leafletZonesLayerRef.current || !leafletMarkersLayerRef.current) return;

    const map = leafletMapRef.current;
    const zonesLayer = leafletZonesLayerRef.current;
    const markersLayer = leafletMarkersLayerRef.current;

    zonesLayer.clearLayers();
    markersLayer.clearLayers();

    const allCoords = [];

    // 1. Render Heatmap Area Zones (Low, Medium, High Priority)
    zones.forEach((zone) => {
      if (!zone.centerLocation?.lat || !zone.centerLocation?.lng) return;

      const lat = zone.centerLocation.lat;
      const lng = zone.centerLocation.lng;
      allCoords.push([lat, lng]);

      const colors = getZoneColor(zone.heatLevel);
      const radius = Math.max(500, Math.min(2000, (zone.totalComplaints || 1) * 350));

      // Circular heatmap area zone
      const circle = L.circle([lat, lng], {
        color: colors.stroke,
        weight: 2,
        fillColor: colors.fill,
        fillOpacity: isDark ? 0.35 : 0.28,
        radius: radius,
      });

      const zonePopupHtml = `
        <div class="map-popup" style="min-width: 200px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${colors.fill};"></span>
            <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: #0f172a;">${zone.zoneName}</h3>
          </div>
          <p style="margin: 3px 0; font-size: 12px; color: ${colors.stroke}; font-weight: 700;">
            🔥 ${colors.label} Zone (${zone.heatLevel})
          </p>
          <p style="margin: 3px 0; font-size: 13px; color: #334155;"><b>Area:</b> ${zone.area}</p>
          <p style="margin: 3px 0; font-size: 13px; color: #334155;"><b>Total Complaints:</b> ${zone.totalComplaints}</p>
          <p style="margin: 3px 0; font-size: 13px; color: #ef4444;"><b>High/Critical:</b> ${zone.highPriorityCount}</p>
          <p style="margin: 3px 0; font-size: 13px; color: #f59e0b;"><b>Medium:</b> ${zone.mediumPriorityCount}</p>
          <p style="margin: 3px 0; font-size: 13px; color: #10b981;"><b>Low:</b> ${zone.lowPriorityCount}</p>
          <p style="margin: 3px 0; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 4px; margin-top: 6px;">
            Pending: ${zone.pendingCount} | Resolved: ${zone.resolvedCount}
          </p>
        </div>
      `;

      circle.bindPopup(zonePopupHtml);
      circle.addTo(zonesLayer);

      // Area label badge at center
      const badgeIcon = L.divIcon({
        className: "custom-zone-badge-wrap",
        html: `
          <div style="background-color: ${colors.fill}; color: white; padding: 2px 7px; border-radius: 12px; font-size: 10px; font-weight: 700; border: 1.5px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.35); text-align: center; white-space: nowrap; transform: translate(-50%, -50%); pointer-events: none;">
            ${zone.zoneName} • ${zone.heatLevel} (${zone.totalComplaints})
          </div>
        `,
        iconSize: [0, 0],
      });

      L.marker([lat, lng], { icon: badgeIcon, interactive: false }).addTo(zonesLayer);
    });

    // 2. Render Complaint Markers
    markers.forEach((marker) => {
      if (!marker.location?.lat || !marker.location?.lng) return;

      allCoords.push([marker.location.lat, marker.location.lng]);

      const markerHtml = `
        <div style="background-color: ${getMarkerColor(
          marker.markerColor
        )}; width: 22px; height: 22px; border-radius: 999px; border: 3px solid white; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.4); cursor: pointer; transition: transform 0.2s;"></div>
      `;

      const customIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: markerHtml,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -11],
      });

      const popupHtml = `
        <div class="map-popup">
          <h3 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: #0f172a;">${marker.title}</h3>
          <p style="margin: 3px 0; font-size: 12px; color: #334155;"><b>ID:</b> ${marker.complaintId}</p>
          <p style="margin: 3px 0; font-size: 12px; color: #334155;"><b>Status:</b> ${marker.status}</p>
          <p style="margin: 3px 0; font-size: 12px; color: #334155;"><b>Urgency:</b> <span style="font-weight: 700; color: ${getMarkerColor(marker.markerColor)}">${marker.urgency}</span></p>
          <p style="margin: 3px 0; font-size: 12px; color: #334155;"><b>AI Score:</b> ${marker.aiScore}/100</p>
          <p style="margin: 3px 0; font-size: 12px; color: #334155;"><b>Department:</b> ${marker.department}</p>
          <p style="margin: 3px 0; font-size: 12px; color: #334155;"><b>Address:</b> ${marker.location?.address || "N/A"}</p>
        </div>
      `;

      L.marker([marker.location.lat, marker.location.lng], { icon: customIcon })
        .bindPopup(popupHtml)
        .addTo(markersLayer);
    });

    // Auto-fit view to show all zones and markers
    if (allCoords.length > 0) {
      map.fitBounds(L.latLngBounds(allCoords), {
        padding: [60, 60],
        maxZoom: 14,
      });
    }
  }, [markers, zones, token, isDark]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        ref={mapContainerRef}
        className="map-container"
        style={{ width: "100%", height: "620px" }}
      ></div>

      {!token && (
        <div
          style={{
            position: "absolute",
            bottom: "12px",
            left: "12px",
            zIndex: 1000,
            background: isDark
              ? "rgba(15, 23, 42, 0.88)"
              : "rgba(255, 255, 255, 0.92)",
            color: isDark ? "#e2e8f0" : "#1e293b",
            padding: "6px 12px",
            borderRadius: "8px",
            fontSize: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            backdropFilter: "blur(4px)",
            border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>🗺️ <b>Live Heatmap Active</b> (Red: High, Yellow: Medium, Green: Low Priority)</span>
        </div>
      )}
    </div>
  );
};

export default MapComponent;