import { useEffect, useRef } from "react";
import Globe from "globe.gl";

const getZoneColor = (heatLevel) => {
  if (heatLevel === "Red") return "#ef4444";
  if (heatLevel === "Yellow") return "#f59e0b";
  return "#10b981";
};

const GlobeComponent = ({
  markers = [],
  zones = [],
  focusLocation = null,
  activeCity = "",
  onSelectZone = null,
  isDark = false,
}) => {
  const containerRef = useRef(null);
  const globeRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize 3D Globe
    const globe = Globe()(containerRef.current)
      .globeImageUrl(
        isDark
          ? "https://unpkg.com/three-globe/example/img/earth-night.jpg"
          : "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
      )
      .bumpImageUrl("https://unpkg.com/three-globe/example/img/earth-topology.png")
      .backgroundColor("rgba(0,0,0,0)")
      .showAtmosphere(true)
      .atmosphereColor(isDark ? "#38bdf8" : "#60a5fa")
      .atmosphereAltitude(0.22)
      .width(containerRef.current.clientWidth || 800)
      .height(640);

    globeRef.current = globe;

    // Auto-rotation & controls
    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.6;
    globe.controls().enableZoom = true;

    // Initial point of view centering on India (Chennai & Kolkata)
    const initialLat = activeCity === "Kolkata" ? 22.5 : 16.5;
    const initialLng = activeCity === "Kolkata" ? 88.3 : 80.5;

    globe.pointOfView(
      { lat: initialLat, lng: initialLng, altitude: 1.8 },
      1400
    );

    // Resize observer
    const handleResize = () => {
      if (containerRef.current && globe) {
        globe.width(containerRef.current.clientWidth);
        globe.height(640);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (globeRef.current) {
        globeRef.current._destructor?.();
        globeRef.current = null;
      }
    };
  }, [isDark]);

  // Update Rings Data (3D Pulsing Heat Waves for every reported area)
  useEffect(() => {
    if (!globeRef.current) return;

    const rings = zones
      .filter((z) => z.centerLocation?.lat && z.centerLocation?.lng)
      .map((zone) => {
        const color = getZoneColor(zone.heatLevel);
        return {
          lat: zone.centerLocation.lat,
          lng: zone.centerLocation.lng,
          maxR: Math.max(3, Math.min(8, (zone.totalComplaints || 1) * 2)),
          propagationSpeed: 1.8,
          repeatPeriod: 1200,
          color: (t) => {
            const alpha = 1 - t;
            return color === "#ef4444"
              ? `rgba(239, 68, 68, ${alpha})`
              : color === "#f59e0b"
              ? `rgba(245, 158, 11, ${alpha})`
              : `rgba(16, 185, 129, ${alpha})`;
          },
        };
      });

    globeRef.current
      .ringsData(rings)
      .ringColor((d) => d.color)
      .ringMaxRadius((d) => d.maxR)
      .ringPropagationSpeed((d) => d.propagationSpeed)
      .ringRepeatPeriod((d) => d.repeatPeriod);
  }, [zones]);

  // Update HTML Floating Badges (Stating ALL reported problem areas on the globe)
  useEffect(() => {
    if (!globeRef.current) return;

    const labelData = zones
      .filter((z) => z.centerLocation?.lat && z.centerLocation?.lng)
      .map((zone) => ({
        ...zone,
        lat: zone.centerLocation.lat,
        lng: zone.centerLocation.lng,
      }));

    globeRef.current
      .htmlElementsData(labelData)
      .htmlLat((d) => d.lat)
      .htmlLng((d) => d.lng)
      .htmlAltitude(0.04)
      .htmlElement((zone) => {
        const color = getZoneColor(zone.heatLevel);
        const el = document.createElement("div");
        el.className = "globe-area-label";
        el.style.cssText = `
          background: ${color};
          color: #ffffff;
          padding: 3px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          font-family: system-ui, sans-serif;
          border: 2px solid #ffffff;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
          cursor: pointer;
          white-space: nowrap;
          transform: translate(-50%, -50%);
          pointer-events: auto;
          transition: transform 0.2s, box-shadow 0.2s;
        `;
        el.innerHTML = `📍 ${zone.zoneName} (${zone.heatLevel} Priority • ${zone.totalComplaints})`;

        el.addEventListener("mouseenter", () => {
          el.style.transform = "translate(-50%, -50%) scale(1.15)";
          el.style.boxShadow = `0 0 18px ${color}`;
        });

        el.addEventListener("mouseleave", () => {
          el.style.transform = "translate(-50%, -50%) scale(1)";
          el.style.boxShadow = "0 4px 14px rgba(0, 0, 0, 0.45)";
        });

        el.addEventListener("click", () => {
          if (onSelectZone) onSelectZone(zone);
          if (globeRef.current) {
            globeRef.current.pointOfView(
              { lat: zone.lat, lng: zone.lng, altitude: 0.7 },
              1200
            );
          }
        });

        return el;
      });
  }, [zones, onSelectZone]);

  // Update Points (3D Pins for individual complaints)
  useEffect(() => {
    if (!globeRef.current) return;

    const points = markers
      .filter((m) => m.location?.lat && m.location?.lng)
      .map((marker) => ({
        ...marker,
        lat: marker.location.lat,
        lng: marker.location.lng,
        color:
          marker.markerColor === "red"
            ? "#ef4444"
            : marker.markerColor === "yellow"
            ? "#f59e0b"
            : "#10b981",
        size:
          marker.urgency === "Critical" || marker.urgency === "High"
            ? 0.55
            : 0.35,
      }));

    globeRef.current
      .pointsData(points)
      .pointLat((d) => d.lat)
      .pointLng((d) => d.lng)
      .pointColor((d) => d.color)
      .pointAltitude(0.02)
      .pointRadius((d) => d.size)
      .pointLabel(
        (d) => `
          <div style="background: rgba(15, 23, 42, 0.95); color: #fff; padding: 8px 12px; border-radius: 10px; font-family: system-ui; font-size: 12px; border: 1px solid #334155;">
            <b style="color: ${d.color};">${d.urgency || "Normal"}</b> • ${d.complaintId}<br />
            <strong>${d.title}</strong><br />
            <small style="color: #94a3b8;">${d.location?.address || ""}</small>
          </div>
        `
      )
      .onPointClick((point) => {
        if (globeRef.current) {
          globeRef.current.pointOfView(
            { lat: point.lat, lng: point.lng, altitude: 0.6 },
            1000
          );
        }
      });
  }, [markers]);

  // Handle Focus Location from external clicks (e.g. sidebar or cards)
  useEffect(() => {
    if (!focusLocation || !globeRef.current) return;

    globeRef.current.controls().autoRotate = false;
    globeRef.current.pointOfView(
      {
        lat: focusLocation.lat,
        lng: focusLocation.lng,
        altitude: 0.5,
      },
      1400
    );
  }, [focusLocation]);

  // Handle Active City Focus
  useEffect(() => {
    if (!activeCity || !globeRef.current || focusLocation) return;

    let targetLat = 13.04;
    let targetLng = 80.23;

    if (activeCity === "Kolkata") {
      targetLat = 22.55;
      targetLng = 88.35;
    }

    globeRef.current.controls().autoRotate = false;
    globeRef.current.pointOfView(
      { lat: targetLat, lng: targetLng, altitude: 0.8 },
      1400
    );
  }, [activeCity, focusLocation]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "640px",
        borderRadius: "28px",
        overflow: "hidden",
        background: isDark
          ? "radial-gradient(circle at center, #1e293b 0%, #0f172a 70%, #020617 100%)"
          : "radial-gradient(circle at center, #e0f2fe 0%, #f0f9ff 60%, #e2e8f0 100%)",
        boxShadow: "inset 0 0 60px rgba(0, 0, 0, 0.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "640px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      ></div>

      {/* Floating 3D Globe Legend & Info */}
      <div
        style={{
          position: "absolute",
          bottom: "16px",
          left: "16px",
          zIndex: 10,
          background: isDark
            ? "rgba(15, 23, 42, 0.88)"
            : "rgba(255, 255, 255, 0.92)",
          color: isDark ? "#f8fafc" : "#0f172a",
          padding: "8px 16px",
          borderRadius: "14px",
          fontSize: "12px",
          fontWeight: 700,
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
          backdropFilter: "blur(6px)",
          border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: "9px",
            height: "9px",
            borderRadius: "50%",
            backgroundColor: "#38bdf8",
            boxShadow: "0 0 10px #38bdf8",
          }}
        ></span>
        <span>
          🌐 <b>3D Civic Globe Active</b> • Drag to rotate • Scroll to zoom • Click area tag to inspect
        </span>
      </div>
    </div>
  );
};

export default GlobeComponent;
