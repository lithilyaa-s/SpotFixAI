import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Globe as GlobeIcon,
  Map as MapIcon,
  MapPinned,
  RefreshCw,
  Search,
} from "lucide-react";
import { getPublicHeatmapData } from "../services/heatmapService";
import MapComponent from "../components/MapComponent";
import GlobeComponent from "../components/GlobeComponent";
import HeatmapLegend from "../components/HeatmapLegend";
import Loader from "../components/Loader";
import StatusBadge from "../components/StatusBadge";
import UrgencyBadge from "../components/UrgencyBadge";
import { useTheme } from "../context/ThemeContext";

const MapView = () => {
  const { isDark } = useTheme();

  const [zones, setZones] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("globe"); // "globe" or "map"
  const [keyword, setKeyword] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedZoneName, setSelectedZoneName] = useState("");
  const [focusLocation, setFocusLocation] = useState(null);

  const fetchHeatmap = async () => {
    setLoading(true);

    try {
      const data = await getPublicHeatmapData();
      setZones(data.zones || []);
      setMarkers(data.markers || []);
    } catch (error) {
      console.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeatmap();
  }, []);

  // Dynamically extract unique cities from reported problems
  const cities = useMemo(() => {
    const set = new Set();
    zones.forEach((z) => {
      if (z.area && z.area !== "Unknown City") set.add(z.area);
    });
    markers.forEach((m) => {
      if (m.location?.city) set.add(m.location.city);
    });
    return Array.from(set);
  }, [zones, markers]);

  // Filtered markers based on search keyword, urgency, category, and selected city
  const filteredMarkers = useMemo(() => {
    return markers.filter((marker) => {
      const text = `${marker.title} ${marker.category} ${marker.status} ${
        marker.department
      } ${marker.location?.address || ""} ${
        marker.location?.city || ""
      }`.toLowerCase();

      const matchesKeyword = text.includes(keyword.toLowerCase());
      const matchesUrgency = urgencyFilter
        ? marker.urgency === urgencyFilter
        : true;
      const matchesCategory = categoryFilter
        ? marker.category?.toLowerCase() === categoryFilter.toLowerCase()
        : true;
      const matchesCity = selectedCity
        ? (marker.location?.city || "").toLowerCase() ===
          selectedCity.toLowerCase()
        : true;

      return (
        matchesKeyword && matchesUrgency && matchesCategory && matchesCity
      );
    });
  }, [markers, keyword, urgencyFilter, categoryFilter, selectedCity]);

  // Filtered zones based on selected city
  const filteredZones = useMemo(() => {
    return zones.filter((zone) => {
      if (!selectedCity) return true;
      return (
        (zone.area || "").toLowerCase() === selectedCity.toLowerCase() ||
        (zone.zoneName || "").toLowerCase().includes(selectedCity.toLowerCase())
      );
    });
  }, [zones, selectedCity]);

  const redZones = filteredZones.filter((zone) => zone.heatLevel === "Red").length;
  const yellowZones = filteredZones.filter(
    (zone) => zone.heatLevel === "Yellow"
  ).length;
  const greenZones = filteredZones.filter(
    (zone) => zone.heatLevel === "Green"
  ).length;

  const handleCitySelect = (city) => {
    setSelectedCity(city);
    setSelectedZoneName("");
    setFocusLocation(null);
  };

  const handleZoneClick = (zone) => {
    setSelectedZoneName(zone.zoneName);
    if (zone.centerLocation?.lat && zone.centerLocation?.lng) {
      setFocusLocation({
        lat: zone.centerLocation.lat,
        lng: zone.centerLocation.lng,
        zoom: 15,
        id: zone.zoneName,
      });

      // Smooth scroll up to map card if user scrolled down
      const mapElem = document.querySelector(".map-card");
      if (mapElem) {
        mapElem.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  const handleMarkerCardClick = (marker) => {
    if (marker.location?.lat && marker.location?.lng) {
      setFocusLocation({
        lat: marker.location.lat,
        lng: marker.location.lng,
        zoom: 16,
        id: marker.complaintId,
      });

      const mapElem = document.querySelector(".map-card");
      if (mapElem) {
        mapElem.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  if (loading) {
    return <Loader text="Loading live MongoDB civic heatmap..." />;
  }

  return (
    <main className="map-page">
      <section className="map-header">
        <div>
          <span>Live Civic Issue Heatmap</span>
          <h1>Civic Problem Areas Map</h1>
          <p>
            Real-time geospatial hotspot intelligence powered by MongoDB. View
            all reported problem areas across the globe or drill into street details.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {/* 3D Globe vs 2D Map Toggle */}
          <div
            style={{
              display: "flex",
              background: isDark ? "#1e293b" : "#e2e8f0",
              padding: "4px",
              borderRadius: "14px",
              border: isDark ? "1px solid #334155" : "1px solid #cbd5e1",
            }}
          >
            <button
              type="button"
              className={`city-pill-btn ${viewMode === "globe" ? "active" : ""}`}
              onClick={() => setViewMode("globe")}
              style={{ border: "none", padding: "6px 14px" }}
            >
              <GlobeIcon size={16} /> 3D Globe
            </button>
            <button
              type="button"
              className={`city-pill-btn ${viewMode === "map" ? "active" : ""}`}
              onClick={() => setViewMode("map")}
              style={{ border: "none", padding: "6px 14px" }}
            >
              <MapIcon size={16} /> 2D Map
            </button>
          </div>

          <button className="secondary-action-btn" onClick={fetchHeatmap}>
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>
      </section>

      {/* Modern City / Region Filter Bar */}
      <section className="city-filter-container">
        <span className="city-filter-label">
          <Building2 size={15} style={{ verticalAlign: "middle", marginRight: 4 }} />
          Focus City:
        </span>
        <button
          className={`city-pill-btn ${selectedCity === "" ? "active" : ""}`}
          onClick={() => handleCitySelect("")}
        >
          All Regions <span className="pill-count">{zones.length} zones</span>
        </button>
        {cities.map((city) => {
          const count = zones.filter((z) => z.area === city).length;
          return (
            <button
              key={city}
              className={`city-pill-btn ${
                selectedCity === city ? "active" : ""
              }`}
              onClick={() => handleCitySelect(city)}
            >
              📍 {city} <span className="pill-count">{count}</span>
            </button>
          );
        })}
      </section>

      {/* Summary KPI Cards */}
      <section className="map-summary-grid">
        <div className="map-summary-card red-zone-card">
          <strong>{redZones}</strong>
          <span>High Priority Hotspots</span>
        </div>

        <div className="map-summary-card yellow-zone-card">
          <strong>{yellowZones}</strong>
          <span>Medium Priority Zones</span>
        </div>

        <div className="map-summary-card green-zone-card">
          <strong>{greenZones}</strong>
          <span>Low Priority Areas</span>
        </div>

        <div className="map-summary-card">
          <strong>{filteredMarkers.length}</strong>
          <span>Reported Problems</span>
        </div>
      </section>

      {/* Interactive Filters Toolbar */}
      <section className="map-toolbar" style={{ gridTemplateColumns: "1fr 180px 180px" }}>
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search problems by title, category, neighborhood, or street..."
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
        >
          <option value="">All Categories</option>
          <option value="road">Roads & Footpaths</option>
          <option value="drainage">Drainage & Sewage</option>
          <option value="sanitation">Waste & Sanitation</option>
          <option value="electricity">Streetlights & Power</option>
          <option value="safety">Public Safety</option>
          <option value="environment">Parks & Trees</option>
        </select>

        <select
          value={urgencyFilter}
          onChange={(event) => setUrgencyFilter(event.target.value)}
        >
          <option value="">All Urgencies</option>
          <option value="Critical">🔴 Critical</option>
          <option value="High">🟠 High</option>
          <option value="Medium">🟡 Medium</option>
          <option value="Low">🟢 Low</option>
        </select>
      </section>

      {/* Main Map + Sidebar Layout */}
      <section className="map-layout">
        <div className="map-card" style={{ minHeight: "640px" }}>
          {viewMode === "globe" ? (
            <GlobeComponent
              markers={filteredMarkers}
              zones={filteredZones}
              focusLocation={focusLocation}
              activeCity={selectedCity}
              onSelectZone={handleZoneClick}
              isDark={isDark}
            />
          ) : (
            <MapComponent
              markers={filteredMarkers}
              zones={filteredZones}
              focusLocation={focusLocation}
              activeCity={selectedCity}
            />
          )}
        </div>

        <aside className="map-side">
          <HeatmapLegend />

          <div className="zone-list-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Reported Problem Areas</h3>
              <small style={{ color: "#64748b", fontWeight: 700 }}>Click to Focus</small>
            </div>

            {filteredZones.length === 0 ? (
              <div className="zone-empty">
                <AlertTriangle size={24} />
                <p>No area data for current filters. Clear search to view all.</p>
              </div>
            ) : (
              <div className="zone-list">
                {filteredZones.map((zone) => {
                  const isSelected = selectedZoneName === zone.zoneName;
                  return (
                    <div
                      className={`zone-item ${isSelected ? "selected-zone" : ""}`}
                      key={`${zone.zoneName}-${zone.area}`}
                      onClick={() => handleZoneClick(zone)}
                      title={`Click to zoom into ${zone.zoneName}`}
                    >
                      <div>
                        <h4>📍 {zone.zoneName}</h4>
                        <p>
                          {zone.area} • <b>{zone.totalComplaints} issue{zone.totalComplaints > 1 ? "s" : ""}</b>
                          {zone.highPriorityCount > 0 && (
                            <span style={{ color: "#ef4444", marginLeft: 4, fontWeight: 700 }}>
                              ({zone.highPriorityCount} critical)
                            </span>
                          )}
                        </p>
                      </div>

                      <span
                        className={`zone-pill zone-${zone.heatLevel.toLowerCase()}`}
                      >
                        {zone.heatLevel}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </section>

      {/* Complaint Markers Grid */}
      <section className="marker-list-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <MapPinned size={24} />
            Reported Complaints ({filteredMarkers.length})
          </h2>
          <small style={{ color: "#64748b", fontWeight: 700 }}>
            Click any card to pinpoint on map
          </small>
        </div>

        {filteredMarkers.length === 0 ? (
          <p className="marker-empty">No matching complaints found.</p>
        ) : (
          <div className="marker-list-grid">
            {filteredMarkers.slice(0, 12).map((marker) => (
              <div
                className="marker-card"
                key={marker.id || marker.complaintId}
                onClick={() => handleMarkerCardClick(marker)}
                style={{ cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s" }}
                title="Click to zoom in on map"
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span className="complaint-id">{marker.complaintId}</span>
                  <small style={{ fontWeight: 800, color: "#2563eb" }}>AI: {marker.aiScore}/100</small>
                </div>

                <h3>{marker.title}</h3>

                <div className="marker-badges" style={{ margin: "8px 0" }}>
                  <UrgencyBadge urgency={marker.urgency} />
                  <StatusBadge status={marker.status} />
                </div>

                <p style={{ margin: "6px 0", fontSize: "13px" }}>📍 {marker.location?.address}</p>
                <small style={{ color: "#64748b" }}>🏢 {marker.department}</small>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default MapView;