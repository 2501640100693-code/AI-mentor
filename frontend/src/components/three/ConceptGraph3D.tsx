"use client";

import { Line } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { ConceptNode } from "@/lib/types";

export default function ConceptGraph3D({ concepts }: { concepts: ConceptNode[] }) {
  const nodes = concepts.slice(0, 6).map((c, i) => {
    const angle = (i / Math.max(concepts.length, 1)) * Math.PI * 2;
    return {
      ...c,
      pos: [Math.cos(angle) * 1.6, Math.sin(angle) * 0.85, 0] as [number, number, number],
    };
  });

  return (
    <div className="h-[200px] w-full">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 4.2], fov: 50 }}>
        <ambientLight intensity={0.8} />
        <pointLight position={[2, 2, 3]} intensity={10} color="#00d4ff" />
        {nodes.map((n) => (
          <mesh key={n.concept_id} position={n.pos}>
            <sphereGeometry args={[0.18, 24, 24]} />
            <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={0.4} />
          </mesh>
        ))}
        {nodes.flatMap((n) =>
          n.prerequisite_ids
            .map((pid) => nodes.find((x) => x.concept_id === pid))
            .filter(Boolean)
            .map((src) => (
              <Line
                key={`${n.concept_id}-${src!.concept_id}`}
                points={[src!.pos, n.pos]}
                color="#a78bfa"
                lineWidth={1.5}
              />
            )),
        )}
      </Canvas>
    </div>
  );
}
