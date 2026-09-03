"use client";

import { Float, MeshDistortMaterial } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

function IconMesh({ kind }: { kind: "book" | "atom" | "doc" }) {
  if (kind === "atom") {
    return (
      <Float speed={2} rotationIntensity={1.1} floatIntensity={1.4}>
        <mesh>
          <torusKnotGeometry args={[0.7, 0.18, 128, 16]} />
          <meshStandardMaterial color="#00d4ff" metalness={0.5} roughness={0.2} />
        </mesh>
      </Float>
    );
  }
  if (kind === "doc") {
    return (
      <Float speed={1.6} rotationIntensity={0.5} floatIntensity={1.1}>
        <mesh rotation={[0.3, 0.4, 0.1]}>
          <boxGeometry args={[1.2, 1.6, 0.12]} />
          <MeshDistortMaterial color="#a78bfa" distort={0.15} speed={1.5} />
        </mesh>
      </Float>
    );
  }
  return (
    <Float speed={1.8} rotationIntensity={0.7} floatIntensity={1.2}>
      <mesh rotation={[0.4, -0.3, 0.2]}>
        <boxGeometry args={[1.4, 1.05, 0.22]} />
        <meshStandardMaterial color="#34d399" metalness={0.35} roughness={0.25} />
      </mesh>
    </Float>
  );
}

export default function FloatingIcon3D({
  kind = "book",
}: {
  kind?: "book" | "atom" | "doc";
}) {
  return (
    <div className="h-64 w-full">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 3.4], fov: 50 }}>
        <ambientLight intensity={0.7} />
        <pointLight position={[2, 3, 4]} intensity={18} color="#00d4ff" />
        <IconMesh kind={kind} />
      </Canvas>
    </div>
  );
}
