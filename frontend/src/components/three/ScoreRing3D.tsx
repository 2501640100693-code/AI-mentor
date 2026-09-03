"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Mesh } from "three";

function Ring({ score }: { score: number }) {
  const ref = useRef<Mesh>(null);
  const color = score >= 70 ? "#34d399" : score >= 50 ? "#fbbf24" : "#f87171";
  const speed = 0.25 + (score / 100) * 0.6;

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * speed;
    ref.current.rotation.x = 0.4;
  });

  const args = useMemo(() => [1.15, 1.45, 64] as const, []);

  return (
    <mesh ref={ref}>
      <torusGeometry args={args} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} metalness={0.4} roughness={0.25} />
    </mesh>
  );
}

export default function ScoreRing3D({ score }: { score: number }) {
  return (
    <div className="relative h-56 w-56">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 4.2], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[2, 2, 3]} intensity={20} color="#00d4ff" />
        <Ring score={score} />
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-semibold text-cyan-300">{Math.round(score)}</div>
          <div className="text-xs uppercase tracking-[0.2em] text-white/60">score</div>
        </div>
      </div>
    </div>
  );
}
