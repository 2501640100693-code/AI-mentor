"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlowButton } from "@/components/ui/GlowButton";
import { PageShell } from "@/components/ui/PageShell";
import { useApp } from "@/contexts/AppContext";
import { api } from "@/lib/api";
import { humanError } from "@/lib/errors";

export default function ConceptMapPage() {
  const { profile } = useApp();
  const [svg, setSvg] = useState("");
  const [empty, setEmpty] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .conceptMap(profile.topic || "Ohm's Law", profile.level)
      .then((data) => {
        setSvg(data.svg || "");
        setEmpty(!data.svg);
        setError("");
      })
      .catch((err) => {
        setSvg("");
        setEmpty(true);
        setError(humanError(err, "Could not load the concept map."));
      });
  }, [profile.topic, profile.level]);

  function downloadPng() {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width || 800;
      canvas.height = img.height || 400;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#0f0c29";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = "concept-map.png";
      a.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  return (
    <PageShell title="Concept map" subtitle="How today's ideas depend on each other.">
      <GlassCard className="p-6 shadow-[0_20px_80px_rgba(0,212,255,0.12)]" hover={false}>
        {error ? <p className="mb-3 text-sm text-[color:var(--ember)]">{error}</p> : null}
        {empty ? (
          <p className="py-16 text-center text-white/60">
            {error
              ? "The map could not be loaded."
              : "No map yet — run a diagnostic from Upload and this graph will light up."}
          </p>
        ) : (
          <div className="overflow-auto drop-shadow-[0_12px_40px_rgba(0,212,255,0.25)]" dangerouslySetInnerHTML={{ __html: svg }} />
        )}
      </GlassCard>
      <GlowButton className="mt-6" type="button" onClick={downloadPng} disabled={!svg}>
        Download PNG
      </GlowButton>
    </PageShell>
  );
}
