"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AMBIENT_DRIFT_COUNT } from "./constants";

/** Soft floating background motes — decorative depth behind the orb. */
export default function AmbientDrift({ enabled = true }: { enabled?: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const t = useRef(0);
  const velocities = useMemo(() => {
    const v = new Float32Array(AMBIENT_DRIFT_COUNT * 3);
    for (let i = 0; i < AMBIENT_DRIFT_COUNT; i++) {
      v[i * 3] = (Math.random() - 0.5) * 0.16;
      v[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
      v[i * 3 + 2] = (Math.random() - 0.5) * 0.07;
    }
    return v;
  }, []);

  const positions = useMemo(() => {
    const arr = new Float32Array(AMBIENT_DRIFT_COUNT * 3);
    for (let i = 0; i < AMBIENT_DRIFT_COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.2) * 10;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 7;
      arr[i * 3 + 2] = -2 - Math.random() * 4;
    }
    return arr;
  }, []);

  useFrame((_, dt) => {
    if (!enabled) return;
    const pts = pointsRef.current;
    if (!pts) return;
    t.current += dt;
    const attr = pts.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < AMBIENT_DRIFT_COUNT; i++) {
      const i3 = i * 3;
      arr[i3] += velocities[i3] * dt + Math.sin(t.current * 0.55 + i * 0.17) * dt * 0.04;
      arr[i3 + 1] += velocities[i3 + 1] * dt + Math.cos(t.current * 0.4 + i * 0.23) * dt * 0.03;
      arr[i3 + 2] += velocities[i3 + 2] * dt;
      if (arr[i3] > 8) arr[i3] = -4;
      if (arr[i3] < -5) arr[i3] = 7;
      if (arr[i3 + 1] > 4) arr[i3 + 1] = -4;
      if (arr[i3 + 1] < -4) arr[i3 + 1] = 4;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#7af5d0"
        size={0.055}
        sizeAttenuation
        transparent
        opacity={0.42}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}
