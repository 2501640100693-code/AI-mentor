"use client";

import { Float } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";

function BookMesh() {
  const groupRef = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = clock.getElapsedTime() * 0.3;
  });
  return (
    <group ref={groupRef} rotation={[0.15, 0, 0]}>
      {/* left page/cover */}
      <mesh position={[-0.55, 0, 0]} rotation={[0, 0.35, 0]}>
        <boxGeometry args={[1.1, 1.5, 0.08]} />
        <meshStandardMaterial color="#D9A441" metalness={0.3} roughness={0.35} />
      </mesh>
      {/* right page/cover */}
      <mesh position={[0.55, 0, 0]} rotation={[0, -0.35, 0]}>
        <boxGeometry args={[1.1, 1.5, 0.08]} />
        <meshStandardMaterial color="#E8BE6E" metalness={0.3} roughness={0.35} />
      </mesh>
      {/* spine */}
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[0.14, 1.55, 0.16]} />
        <meshStandardMaterial color="#221503" metalness={0.4} roughness={0.3} />
      </mesh>
    </group>
  );
}

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
        <BookMesh />
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
        <pointLight position={[2, 3, 4]} intensity={16} color="#D9A441" />
        <IconMesh kind={kind} />
      </Canvas>
    </div>
  );
}