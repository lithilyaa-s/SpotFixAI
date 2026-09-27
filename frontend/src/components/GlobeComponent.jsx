import { useEffect, useRef, useState } from "react";
import Globe from "globe.gl";
import * as THREE from "three";
import {
  Compass,
  Layers,
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
  const [globeSkin, setGlobeSkin] = useState(isDark ? "night" : "day");

  useEffect(() => {
    if (!containerRef.current) return;

    // Determine high-resolution texture based on skin selection
    let textureUrl = "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg";
    if (globeSkin === "night") {
      textureUrl = "https://unpkg.com/three-globe/example/img/earth-night.jpg";
    } else if (globeSkin === "satellite") {
      textureUrl = "https://unpkg.com/three-globe/example/img/earth-day.jpg";
    } else if (globeSkin === "topo") {
      textureUrl = "https://unpkg.com/three-globe/example/img/earth-topology.png";
    }

    // Initialize 3D Globe with HD rendering parameters
    const globe = Globe()(containerRef.current)
      .globeImageUrl(textureUrl)
      .bumpImageUrl("https://unpkg.com/three-globe/example/img/earth-topology.png")
      .backgroundColor("rgba(0,0,0,0)")
      .showAtmosphere(true)
      .atmosphereColor(
        globeSkin === "night" || isDark ? "#38bdf8" : "#60a5fa"
      )
      .atmosphereAltitude(0.22)
      .width(containerRef.current.clientWidth || 800)
      .height(640);

    globeRef.current = globe;

    // HIGH-DEFINITION WEBGL CONFIGURATION
    try {
      const renderer = globe.renderer();
      // Enable Retina & 4K High-DPI display scaling (Removes blurriness!)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
      // Cinematic ACESFilmic Tone Mapping for rich color vibrancy
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.18;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    } catch (e) {
      console.warn("WebGL renderer customization notice:", e.message);
    }

    // OrbitControls tuning for clean, deep, cinematic zoom
    const controls = globe.controls();
    controls.enableZoom = true;
    controls.zoomSpeed = 1.35;
    controls.minDistance = 101.2; // Allows deep zoom right into city/neighborhood surface
    controls.maxDistance = 450;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.8;

    controls.addEventListener("start", () => {
      if (controls.autoRotate) {
        controls.autoRotate = false;
        setAutoSpin(false);
      }
    });

    controls.addEventListener("change", () => {
      const pov = globe.pointOfView();
      if (pov.altitude < 0.12) {
        setZoomLevelText("Neighborhood / Street Focus");
      } else if (pov.altitude < 0.45) {
        setZoomLevelText("City Level");
      } else if (pov.altitude < 1.1) {
        setZoomLevelText("Regional");
      } else {
        setZoomLevelText("Global Earth");
      }
    });

    // Double click or direct click zooms straight in to that exact location
    globe.onGlobeClick(({ lat, lng }) => {
      globe.pointOfView({ lat, lng, altitude: 0.08 }, 950);
    });

    // Initial point of view centered on India
    const initialLat = activeCity === "Kolkata" ? 22.55 : 13.04;
    const initialLng = activeCity === "Kolkata" ? 88.36 : 80.24;

    globe.pointOfView(
      { lat: initialLat, lng: initialLng, altitude: 1.35 },
      1100
    );

    const updateDimensions = () => {
      if (containerRef.current && globe) {
        const w = containerRef.current.clientWidth;
        if (w > 0) {
          globe.width(w);
          globe.height(640);
          globe.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
        }
      }
    };

    // ResizeObserver ensures high-DPI canvas always adapts crisply to viewport
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    resizeObserver.observe(containerRef.current);

    window.addEventListener("resize", updateDimensions);
    const initTimer = setTimeout(updateDimensions, 100);

    return () => {
      clearTimeout(initTimer);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateDimensions);
      if (globeRef.current) {
        globeRef.current._destructor?.();
        globeRef.current = null;
      }
    };
  }, [globeSkin, isDark]);

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
          padding: 5px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          border: 2px solid #ffffff;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
          cursor: pointer;
          white-space: nowrap;
          transform: translate(-50%, -50%);
          pointer-events: auto;
          -webkit-font-smoothing: antialiased;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s;
        `;
        el.innerHTML = `📍 ${zone.zoneName} (${zone.heatLevel} Priority • ${zone.totalComplaints})`;

        el.addEventListener("mouseenter", () => {
          el.style.transform = "translate(-50%, -50%) scale(1.18)";
          el.style.boxShadow = `0 0 24px ${color}`;
        });

        el.addEventListener("mouseleave", () => {
          el.style.transform = "translate(-50%, -50%) scale(1)";
          el.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.45)";
        });

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
          <div style="background: rgba(15, 23, 42, 0.96); backdrop-filter: blur(8px); color: #fff; padding: 10px 14px; border-radius: 12px; font-family: system-ui; font-size: 12px; border: 1px solid #334155; box-shadow: 0 12px 30px rgba(0,0,0,0.6);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <b style="color: ${d.color}; font-weight: 800;">${d.urgency || "Normal"}</b>
              <small style="color: #94a3b8; font-weight: 700;">${d.complaintId}</small>
            </div>
            <strong style="font-size: 13px; line-height: 1.3;">${d.title}</strong><br />
            <span style="color: #94a3b8; font-size: 11px;">📍 ${d.location?.address || ""}</span>
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

  // Handle Focus Location from external clicks
  useEffect(() => {
    if (!focusLocation || !globeRef.current) return;

    globeRef.current.controls().autoRotate = false;
    setAutoSpin(false);
    globeRef.current.pointOfView(
      {
        lat: focusLocation.lat,
        lng: focusLocation.lng,
        altitude: 0.08,
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
      { lat: targetLat, lng: targetLng, altitude: 0.16 },
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

      {/* Floating 3D Globe Theme Switcher (Day / Night / Topo) */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          left: "16px",
          zIndex: 10,
          display: "flex",
          gap: "6px",
          background: isDark
            ? "rgba(15, 23, 42, 0.9)"
            : "rgba(255, 255, 255, 0.94)",
          padding: "5px 8px",
          borderRadius: "12px",
          boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
          border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
          backdropFilter: "blur(6px)",
        }}
      >
        <button
          type="button"
          onClick={() => setGlobeSkin("day")}
          style={{
            background: globeSkin === "day" ? "#2563eb" : "transparent",
            color: globeSkin === "day" ? "#fff" : isDark ? "#cbd5e1" : "#475569",
            border: "none",
            borderRadius: "8px",
            padding: "4px 10px",
            fontSize: "11px",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          🌍 Blue Marble HD
        </button>
        <button
          type="button"
          onClick={() => setGlobeSkin("satellite")}
          style={{
            background: globeSkin === "satellite" ? "#2563eb" : "transparent",
            color: globeSkin === "satellite" ? "#fff" : isDark ? "#cbd5e1" : "#475569",
            border: "none",
            borderRadius: "8px",
            padding: "4px 10px",
            fontSize: "11px",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          🛰️ Earth Day HD
        </button>
        <button
          type="button"
          onClick={() => setGlobeSkin("night")}
          style={{
            background: globeSkin === "night" ? "#2563eb" : "transparent",
            color: globeSkin === "night" ? "#fff" : isDark ? "#cbd5e1" : "#475569",
            border: "none",
            borderRadius: "8px",
            padding: "4px 10px",
            fontSize: "11px",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          🌃 Night Lights HD
        </button>
        <button
          type="button"
          onClick={() => setGlobeSkin("topo")}
          style={{
            background: globeSkin === "topo" ? "#2563eb" : "transparent",
            color: globeSkin === "topo" ? "#fff" : isDark ? "#cbd5e1" : "#475569",
            border: "none",
            borderRadius: "8px",
            padding: "4px 10px",
            fontSize: "11px",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          🏔️ Relief
        </button>
      </div>

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
          <b>3D Globe HD</b> • View: <b>{zoomLevelText}</b> • Double-click or scroll to zoom deep • Click any area badge
        </span>
      </div>
    </div>
  );
};

export default GlobeComponent;
