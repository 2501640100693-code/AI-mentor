"use client";

import { useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import ParticleSphere, { type FocusField, type PointerNDC } from "./ParticleSphere";
import AmbientDrift from "./AmbientDrift";
import { CanvasErrorBoundary } from "./CanvasErrorBoundary";
import {
  BLOOM_INTENSITY,
  BLOOM_SMOOTHING,
  BLOOM_THRESHOLD,
  PARTICLE_COUNT,
  PARTICLE_COUNT_MOBILE,
} from "./constants";
import { useParticleCount, usePrefersReducedMotion, useTabVisible } from "./hooks";

type ParticleSphereCanvasProps = {
  successTick?: number;
  typingTick?: number;
  focusField?: FocusField;
};

export default function ParticleSphereCanvas({
  successTick = 0,
  typingTick = 0,
  focusField = null,
}: ParticleSphereCanvasProps) {
  const reducedMotion = usePrefersReducedMotion();
  const visible = useTabVisible();
  const count = useParticleCount(PARTICLE_COUNT, PARTICLE_COUNT_MOBILE);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<PointerNDC | null>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      pointerRef.current = {
        x: ((e.clientX - r.left) / r.width) * 2 - 1,
        y: -((e.clientY - r.top) / r.height) * 2 + 1,
      };
    };
    const onLeave = () => {
      pointerRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, []);

  return (
    <div ref={wrapRef} className="pointer-events-none fixed inset-0 z-0">
      <CanvasErrorBoundary>
        <Canvas
          dpr={[1, 2]}
          frameloop={!visible ? "never" : reducedMotion ? "demand" : "always"}
          camera={{ position: [0, 0, 6.6], fov: 40 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: "transparent" }}
          onCreated={({ gl, invalidate }) => {
            gl.setClearColor(0x000000, 0);
            invalidate();
          }}
        >
          <ambientLight intensity={0.32} />
          <pointLight position={[5, 3, 7]} intensity={1.05} color="#10CD98" />
          <pointLight position={[-4, -2, 3]} intensity={0.22} color="#04140F" />
          <directionalLight position={[2, 3, 5]} intensity={0.55} color="#ffffff" />

          <AmbientDrift enabled={!reducedMotion} />

          <ParticleSphere
            count={count}
            reducedMotion={reducedMotion}
            successTick={successTick}
            typingTick={typingTick}
            focusField={focusField}
            pointerRef={pointerRef}
          />

          {!reducedMotion && (
            <EffectComposer>
              <Bloom
                mipmapBlur
                luminanceThreshold={BLOOM_THRESHOLD}
                luminanceSmoothing={BLOOM_SMOOTHING}
                intensity={BLOOM_INTENSITY}
              />
            </EffectComposer>
          )}
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  );
}
