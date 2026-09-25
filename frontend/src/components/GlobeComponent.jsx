import { useEffect, useRef, useState } from "react";
import Globe from "globe.gl";
import {
  Compass,
  RotateCcw,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

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
  const [autoSpin, setAutoSpin] = useState(false);
  const [zoomLevelText, setZoomLevelText] = useState("Regional");

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize 3D Globe with high-precision rendering
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
      .atmosphereAltitude(0.25)
      .width(containerRef.current.clientWidth || 800)
      .height(640);

    globeRef.current = globe;

    // OrbitControls tuning for clean, deep, cinematic zoom
    const controls = globe.controls();
    controls.enableZoom = true;
    controls.zoomSpeed = 1.6;
    controls.minDistance = 101.5; // Allows zooming ultra-close right to street/neighborhood level
    controls.maxDistance = 500;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = false; // Turned off by default so globe stays steady when inspecting/zooming
    controls.autoRotateSpeed = 0.8;

    // Stop auto-rotation as soon as user begins zooming or dragging
    controls.addEventListener("start", () => {
      if (controls.autoRotate) {
        controls.autoRotate = false;
        setAutoSpin(false);
      }
    });

    // Track camera distance to update zoom label
    controls.addEventListener("change", () => {
      const pov = globe.pointOfView();
      if (pov.altitude < 0.15) {
        setZoomLevelText("Street / Neighborhood");
      } else if (pov.altitude < 0.6) {
        setZoomLevelText("City");
      } else if (pov.altitude < 1.2) {
        setZoomLevelText("Regional");
      } else {
        setZoomLevelText("Global");
      }
    });

    // Double-click on any point on the globe zooms in deep to that location
    globe.onGlobeClick(({ lat, lng }) => {
      globe.pointOfView({ lat, lng, altitude: 0.12 }, 1000);
    });

    // Initial point of view centered on India
    const initialLat = activeCity === "Kolkata" ? 22.55 : 13.04;
    const initialLng = activeCity === "Kolkata" ? 88.36 : 80.24;

    globe.pointOfView(
      { lat: initialLat, lng: initialLng, altitude: 1.4 },
      1200
    );

    // Responsive resize
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
          padding: 4px 11px;
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
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s;
        `;
        el.innerHTML = `📍 ${zone.zoneName} (${zone.heatLevel} Priority • ${zone.totalComplaints})`;

        el.addEventListener("mouseenter", () => {
          el.style.transform = "translate(-50%, -50%) scale(1.18)";
          el.style.boxShadow = `0 0 20px ${color}`;
        });

        el.addEventListener("mouseleave", () => {
          el.style.transform = "translate(-50%, -50%) scale(1)";
          el.style.boxShadow = "0 4px 14px rgba(0, 0, 0, 0.45)";
        });

        // Clicking area tag flies in with DEEP ZOOM right to that neighborhood!
        el.addEventListener("click", () => {
          if (onSelectZone) onSelectZone(zone);
          if (globeRef.current) {
            globeRef.current.controls().autoRotate = false;
            setAutoSpin(false);
            globeRef.current.pointOfView(
              { lat: zone.lat, lng: zone.lng, altitude: 0.08 },
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
          <div style="background: rgba(15, 23, 42, 0.95); color: #fff; padding: 8px 12px; border-radius: 10px; font-family: system-ui; font-size: 12px; border: 1px solid #334155; box-shadow: 0 8px 24px rgba(0,0,0,0.5);">
            <b style="color: ${d.color};">${d.urgency || "Normal"}</b> • ${d.complaintId}<br />
            <strong>${d.title}</strong><br />
            <small style="color: #94a3b8;">${d.location?.address || ""}</small>
          </div>
        `
      )
      .onPointClick((point) => {
        if (globeRef.current) {
          globeRef.current.controls().autoRotate = false;
          setAutoSpin(false);
          globeRef.current.pointOfView(
            { lat: point.lat, lng: point.lng, altitude: 0.06 },
            1000
          );
        }
      });
  }, [markers]);

  // Handle Focus Location from external clicks (e.g. sidebar or cards)
  useEffect(() => {
    if (!focusLocation || !globeRef.current) return;

    globeRef.current.controls().autoRotate = false;
    setAutoSpin(false);
    globeRef.current.pointOfView(
      {
        lat: focusLocation.lat,
        lng: focusLocation.lng,
        altitude: 0.08, // DEEP close-up zoom directly to the neighborhood!
      },
      1200
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
    setAutoSpin(false);
    globeRef.current.pointOfView(
      { lat: targetLat, lng: targetLng, altitude: 0.16 }, // Crisp city zoom
      1200
    );
  }, [activeCity, focusLocation]);

  // Manual Zoom Buttons
  const handleZoomIn = () => {
    if (!globeRef.current) return;
    const pov = globeRef.current.pointOfView();
    const newAlt = Math.max(0.04, pov.altitude * 0.55);
    globeRef.current.pointOfView({ altitude: newAlt }, 500);
  };

  const handleZoomOut = () => {
    if (!globeRef.current) return;
    const pov = globeRef.current.pointOfView();
    const newAlt = Math.min(2.5, pov.altitude * 1.6);
    globeRef.current.pointOfView({ altitude: newAlt }, 500);
  };

  const handleResetOrbit = () => {
    if (!globeRef.current) return;
    globeRef.current.pointOfView({ lat: 18, lng: 82, altitude: 1.5 }, 900);
  };

  const toggleAutoSpin = () => {
    if (!globeRef.current) return;
    const next = !autoSpin;
    setAutoSpin(next);
    globeRef.current.controls().autoRotate = next;
  };

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
          cursor: "grab",
        }}
      ></div>

      {/* Floating On-Screen Zoom Controls (+ / - / Reset / Spin) */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In Deep (+)"
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            background: isDark ? "rgba(15, 23, 42, 0.9)" : "rgba(255, 255, 255, 0.95)",
            color: isDark ? "#f8fafc" : "#0f172a",
            border: isDark ? "1px solid #334155" : "1px solid #cbd5e1",
            boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.18s",
          }}
        >
          <ZoomIn size={20} />
        </button>

        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out (-)"
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            background: isDark ? "rgba(15, 23, 42, 0.9)" : "rgba(255, 255, 255, 0.95)",
            color: isDark ? "#f8fafc" : "#0f172a",
            border: isDark ? "1px solid #334155" : "1px solid #cbd5e1",
            boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.18s",
          }}
        >
          <ZoomOut size={20} />
        </button>

        <button
          type="button"
          onClick={handleResetOrbit}
          title="Reset Orbit View"
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            background: isDark ? "rgba(15, 23, 42, 0.9)" : "rgba(255, 255, 255, 0.95)",
            color: isDark ? "#f8fafc" : "#0f172a",
            border: isDark ? "1px solid #334155" : "1px solid #cbd5e1",
            boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.18s",
          }}
        >
          <RotateCcw size={18} />
        </button>

        <button
          type="button"
          onClick={toggleAutoSpin}
          title={autoSpin ? "Stop Auto-Spin" : "Start Auto-Spin"}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            background: autoSpin
              ? "#2563eb"
              : isDark
              ? "rgba(15, 23, 42, 0.9)"
              : "rgba(255, 255, 255, 0.95)",
            color: autoSpin ? "#ffffff" : isDark ? "#f8fafc" : "#0f172a",
            border: isDark ? "1px solid #334155" : "1px solid #cbd5e1",
            boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.18s",
          }}
        >
          <Compass size={18} />
        </button>
      </div>

      {/* Floating Status & Interactive Tips */}
      <div
        style={{
          position: "absolute",
          bottom: "16px",
          left: "16px",
          zIndex: 10,
          background: isDark
            ? "rgba(15, 23, 42, 0.9)"
            : "rgba(255, 255, 255, 0.94)",
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
            backgroundColor: "#22c55e",
            boxShadow: "0 0 10px #22c55e",
          }}
        ></span>
        <span>
          <b>3D Globe Zoom Active</b> • View: <b>{zoomLevelText}</b> • Double-click or scroll to zoom close • Click any area badge
        </span>
      </div>
    </div>
  );
};

export default GlobeComponent;
