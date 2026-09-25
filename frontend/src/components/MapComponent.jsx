import { useEffect, useRef, useState } from "react";
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
  if (heatLevel === "Red") {
    return {
      stroke: "#dc2626",
      fill: "#ef4444",
      label: "High Priority",
      badgeBg: "#ef4444",
    };
  }
  if (heatLevel === "Yellow") {
    return {
      stroke: "#d97706",
      fill: "#f59e0b",
      label: "Medium Priority",
      badgeBg: "#d97706",
    };
  }
  return {
    stroke: "#059669",
    fill: "#10b981",
    label: "Low Priority",
    badgeBg: "#059669",
  };
};

const getCategoryIcon = (category = "") => {
  const cat = category.toLowerCase();
  if (cat.includes("road")) return "🛣️";
  if (cat.includes("drain")) return "💧";
  if (cat.includes("sanitation") || cat.includes("garbage")) return "🗑️";
  if (cat.includes("electric") || cat.includes("light")) return "⚡";
  if (cat.includes("water")) return "🚰";
  if (cat.includes("safety") || cat.includes("danger")) return "⚠️";
  if (cat.includes("environment") || cat.includes("tree")) return "🌳";
  if (cat.includes("traffic")) return "🚦";
  return "📍";
};

const MapComponent = ({
  markers = [],
  zones = [],
  focusLocation = null,
  activeCity = "",
}) => {
  const { isDark } = useTheme();
  const token = import.meta.env.VITE_MAPBOX_TOKEN;

  const [showHeatZones, setShowHeatZones] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);

  const mapContainerRef = useRef(null);
  const mapboxRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markerRefs = useRef([]);
  const leafletZonesLayerRef = useRef(null);
  const leafletMarkersLayerRef = useRef(null);

  // ================= 1. MAPBOX ENGINE (If token is provided) =================
  useEffect(() => {
    if (!token || !mapContainerRef.current) return;

    mapboxgl.accessToken = token;

    const initialCenter =
      activeCity === "Kolkata" ? [88.3639, 22.5726] : [80.2341, 13.0418];

    mapboxRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: isDark
        ? "mapbox://styles/mapbox/dark-v11"
        : "mapbox://styles/mapbox/streets-v12",
      center: initialCenter,
      zoom: 12,
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

    if (showMarkers) {
      markers.forEach((marker) => {
        if (!marker.location?.lng || !marker.location?.lat) return;

        coordinates.push([marker.location.lng, marker.location.lat]);

        const markerElement = document.createElement("div");
        markerElement.className = `custom-map-marker ${
          marker.urgency === "Critical" || marker.urgency === "High"
            ? "critical-pulse-marker"
            : ""
        }`;
        markerElement.style.backgroundColor = getMarkerColor(
          marker.markerColor
        );

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
    }

    if (coordinates.length > 0 && !focusLocation) {
      const bounds = new mapboxgl.LngLatBounds();
      coordinates.forEach((c) => bounds.extend(c));
      mapboxRef.current.fitBounds(bounds, { padding: 60, maxZoom: 14 });
    }
  }, [markers, zones, isDark, token, showMarkers]);

  // ================= 2. LEAFLET ENGINE (Modern OpenStreetMap / CartoDB) =================
  useEffect(() => {
    if (token || !mapContainerRef.current) return;

    const initialCenter =
      activeCity === "Kolkata" ? [22.5519, 88.3524] : [13.0418, 80.2341];

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView(initialCenter, 12);

    leafletMapRef.current = map;

    // Use clean, modern CartoDB Voyager tiles (crisp Google-like style)
    const tileUrl = isDark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

    L.tileLayer(tileUrl, {
      attribution:
        '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);

    leafletZonesLayerRef.current = L.layerGroup().addTo(map);
    leafletMarkersLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, [token]);

  // Handle Dark / Light Mode Tile Switch
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
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

    L.tileLayer(tileUrl, {
      attribution:
        '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);
  }, [isDark, token]);

  // Handle Camera Fly-To when focusLocation or activeCity changes
  useEffect(() => {
    if (focusLocation) {
      if (leafletMapRef.current) {
        leafletMapRef.current.flyTo(
          [focusLocation.lat, focusLocation.lng],
          focusLocation.zoom || 15,
          { duration: 1.2, easeLinearity: 0.25 }
        );
      } else if (mapboxRef.current) {
        mapboxRef.current.flyTo({
          center: [focusLocation.lng, focusLocation.lat],
          zoom: focusLocation.zoom || 15,
          duration: 1200,
        });
      }
    }
  }, [focusLocation]);

  // Camera Fly-To on activeCity change
  useEffect(() => {
    if (!activeCity || focusLocation) return;

    let target = null;
    if (activeCity === "Chennai") target = [13.0418, 80.2341];
    else if (activeCity === "Kolkata") target = [22.5519, 88.3524];

    if (target) {
      if (leafletMapRef.current) {
        leafletMapRef.current.flyTo(target, 12, { duration: 1.2 });
      } else if (mapboxRef.current) {
        mapboxRef.current.flyTo({
          center: [target[1], target[0]],
          zoom: 12,
          duration: 1200,
        });
      }
    }
  }, [activeCity]);

  // Render Leaflet Layers (Dual-Ring Heat Aura + Interactive Problem Markers)
  useEffect(() => {
    if (
      token ||
      !leafletMapRef.current ||
      !leafletZonesLayerRef.current ||
      !leafletMarkersLayerRef.current
    )
      return;

    const map = leafletMapRef.current;
    const zonesLayer = leafletZonesLayerRef.current;
    const markersLayer = leafletMarkersLayerRef.current;

    zonesLayer.clearLayers();
    markersLayer.clearLayers();

    const allCoords = [];

    // 1. RENDER PROPER HEATMAP AREAS (Low, Medium, High Priority)
    if (showHeatZones) {
      zones.forEach((zone) => {
        if (!zone.centerLocation?.lat || !zone.centerLocation?.lng) return;

        const lat = zone.centerLocation.lat;
        const lng = zone.centerLocation.lng;
        allCoords.push([lat, lng]);

        const colors = getZoneColor(zone.heatLevel);

        // Core radius scale based on reported complaint intensity
        const baseRadius = Math.max(
          550,
          Math.min(1800, (zone.totalComplaints || 1) * 350)
        );

        // Outer Ambient Dispersion Aura (Soft gradient falloff)
        const outerAura = L.circle([lat, lng], {
          color: colors.stroke,
          weight: 1,
          dashArray: "4, 6",
          fillColor: colors.fill,
          fillOpacity: isDark ? 0.16 : 0.12,
          radius: baseRadius * 1.5,
        });

        // Inner Core Hotspot (Vibrant density focus)
        const coreHotspot = L.circle([lat, lng], {
          color: colors.stroke,
          weight: 2.5,
          fillColor: colors.fill,
          fillOpacity: isDark ? 0.38 : 0.3,
          radius: baseRadius,
        });

        const zonePopupHtml = `
          <div class="map-popup" style="min-width: 220px; font-family: inherit;">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid ${
              colors.stroke
            }; padding-bottom: 6px; margin-bottom: 8px;">
              <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #0f172a;">${
                zone.zoneName
              }</h3>
              <span style="background: ${colors.badgeBg}; color: white; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 800;">
                ${zone.heatLevel} Priority
              </span>
            </div>
            <p style="margin: 4px 0; font-size: 13px; color: #334155;"><b>Region:</b> ${
              zone.area
            }</p>
            <p style="margin: 4px 0; font-size: 13px; color: #0f172a; font-weight: 700;">
              Total Reported Issues: <b>${zone.totalComplaints}</b>
            </p>
            <div style="background: ${
              isDark ? "#1e293b" : "#f1f5f9"
            }; border-radius: 8px; padding: 6px 10px; margin: 8px 0; font-size: 12px;">
              <span style="color: #ef4444; font-weight: 700;">🔴 Critical/High: ${
                zone.highPriorityCount
              }</span><br />
              <span style="color: #f59e0b; font-weight: 700;">🟡 Medium: ${
                zone.mediumPriorityCount
              }</span><br />
              <span style="color: #10b981; font-weight: 700;">🟢 Low: ${
                zone.lowPriorityCount
              }</span>
            </div>
            <div style="font-size: 11px; color: #64748b; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 6px;">
              <span>Pending: <b>${zone.pendingCount}</b></span>
              <span>Resolved: <b>${zone.resolvedCount}</b></span>
            </div>
          </div>
        `;

        outerAura.bindPopup(zonePopupHtml);
        coreHotspot.bindPopup(zonePopupHtml);

        outerAura.addTo(zonesLayer);
        coreHotspot.addTo(zonesLayer);

        // Neat Floating Area Badge directly above the zone
        const badgeIcon = L.divIcon({
          className: "custom-zone-badge-wrap",
          html: `
            <div style="background-color: ${
              colors.badgeBg
            }; color: white; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; border: 2px solid white; box-shadow: 0 4px 14px rgba(0,0,0,0.3); text-align: center; white-space: nowrap; transform: translate(-50%, -50%); cursor: pointer;">
              📍 ${zone.zoneName} (${zone.totalComplaints})
            </div>
          `,
          iconSize: [0, 0],
        });

        const badgeMarker = L.marker([lat, lng], { icon: badgeIcon });
        badgeMarker.bindPopup(zonePopupHtml);
        badgeMarker.addTo(zonesLayer);
      });
    }

    // 2. RENDER REPORTED PROBLEM PINS WITH CATEGORY ICONS & PULSE
    if (showMarkers) {
      markers.forEach((marker) => {
        if (!marker.location?.lat || !marker.location?.lng) return;

        allCoords.push([marker.location.lat, marker.location.lng]);

        const isUrgent =
          marker.urgency === "Critical" || marker.urgency === "High";
        const pinColor = getMarkerColor(marker.markerColor);
        const iconEmoji = getCategoryIcon(marker.category);

        const markerHtml = `
          <div class="${isUrgent ? "critical-pulse-marker" : ""}" style="
            background-color: ${pinColor};
            width: 26px;
            height: 26px;
            border-radius: 50%;
            border: 2.5px solid #ffffff;
            box-shadow: 0 6px 16px rgba(15, 23, 42, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            cursor: pointer;
            transition: transform 0.2s ease;
          " title="${marker.title}">
            ${iconEmoji}
          </div>
        `;

        const customIcon = L.divIcon({
          className: "custom-problem-pin",
          html: markerHtml,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
          popupAnchor: [0, -14],
        });

        const popupHtml = `
          <div class="map-popup" style="min-width: 230px; font-family: inherit;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <span style="background: ${pinColor}; color: white; padding: 2px 7px; border-radius: 6px; font-size: 11px; font-weight: 800;">
                ${marker.urgency || "Normal"}
              </span>
              <small style="font-weight: 800; color: #64748b;">${
                marker.complaintId
              }</small>
            </div>
            <h3 style="margin: 0 0 6px 0; font-size: 15px; font-weight: 800; color: #0f172a; line-height: 1.3;">
              ${marker.title}
            </h3>
            <p style="margin: 3px 0; font-size: 12px; color: #475569;">
              <b>Status:</b> ${marker.status}
            </p>
            <p style="margin: 3px 0; font-size: 12px; color: #475569;">
              <b>Department:</b> ${marker.department}
            </p>
            <p style="margin: 3px 0; font-size: 12px; color: #475569;">
              <b>AI Severity Score:</b> <b>${marker.aiScore}/100</b>
            </p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 4px;">
              📍 ${marker.location?.address || "Address not provided"}
            </p>
          </div>
        `;

        L.marker([marker.location.lat, marker.location.lng], { icon: customIcon })
          .bindPopup(popupHtml)
          .addTo(markersLayer);
      });
    }

    // Auto-fit to active coordinates if not explicitly focusing
    if (allCoords.length > 0 && !focusLocation && !activeCity) {
      map.fitBounds(L.latLngBounds(allCoords), {
        padding: [60, 60],
        maxZoom: 13,
      });
    }
  }, [markers, zones, token, isDark, showHeatZones, showMarkers]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        ref={mapContainerRef}
        className="map-container"
        style={{ width: "100%", height: "640px", borderRadius: "24px" }}
      ></div>

      {/* Floating Modern Map Controls */}
      <div
        style={{
          position: "absolute",
          top: "14px",
          right: "14px",
          zIndex: 1000,
          display: "flex",
          gap: "8px",
          background: isDark
            ? "rgba(15, 23, 42, 0.9)"
            : "rgba(255, 255, 255, 0.94)",
          padding: "6px 10px",
          borderRadius: "14px",
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.15)",
          border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
          backdropFilter: "blur(6px)",
        }}
      >
        <button
          type="button"
          onClick={() => setShowHeatZones(!showHeatZones)}
          style={{
            background: showHeatZones
              ? "#ef4444"
              : isDark
              ? "#334155"
              : "#e2e8f0",
            color: showHeatZones ? "#ffffff" : isDark ? "#cbd5e1" : "#475569",
            border: "none",
            borderRadius: "8px",
            padding: "5px 10px",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          🔥 Heat Areas {showHeatZones ? "ON" : "OFF"}
        </button>

        <button
          type="button"
          onClick={() => setShowMarkers(!showMarkers)}
          style={{
            background: showMarkers ? "#2563eb" : isDark ? "#334155" : "#e2e8f0",
            color: showMarkers ? "#ffffff" : isDark ? "#cbd5e1" : "#475569",
            border: "none",
            borderRadius: "8px",
            padding: "5px 10px",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          📍 Issue Pins {showMarkers ? "ON" : "OFF"}
        </button>
      </div>

      {/* Floating Status Indicator */}
      <div
        style={{
          position: "absolute",
          bottom: "14px",
          left: "14px",
          zIndex: 1000,
          background: isDark
            ? "rgba(15, 23, 42, 0.9)"
            : "rgba(255, 255, 255, 0.94)",
          color: isDark ? "#f8fafc" : "#0f172a",
          padding: "6px 14px",
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: 700,
          boxShadow: "0 6px 20px rgba(15, 23, 42, 0.15)",
          backdropFilter: "blur(6px)",
          border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: "#22c55e",
            boxShadow: "0 0 8px #22c55e",
          }}
        ></span>
        <span>
          <b>MongoDB Live Heatmap</b> • {zones.length} Zones • {markers.length}{" "}
          Complaints
        </span>
      </div>
    </div>
  );
};

export default MapComponent;