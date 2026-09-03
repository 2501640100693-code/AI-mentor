"use client";

import { Float, MeshDistortMaterial, Stars } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { usePathname } from "next/navigation";
import { useMemo, useRef } from "react";
import type { Points } from "three";
import * as THREE from "three";

function FloatingParticles() {
  const ref = useRef<Points>(null);
  const positions = useMemo(() => {
    const count = 1400;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      arr[i * 3] = (Math.random() - 0.5) * 28;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 16;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 18;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.getElapsedTime() * 0.02;
    ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.05) * 0.05;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#00d4ff"
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function HeroMesh() {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!mesh.current) return;
    mesh.current.rotation.x = clock.getElapsedTime() * 0.08;
    mesh.current.rotation.y = clock.getElapsedTime() * 0.12;
  });
  return (
    <Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.6}>
      <mesh ref={mesh} position={[3.2, 0.4, -2]}>
        <icosahedronGeometry args={[1.15, 1]} />
        <MeshDistortMaterial
          color="#a78bfa"
          wireframe
          distort={0.25}
          speed={1.4}
          transparent
          opacity={0.35}
        />
      </mesh>
    </Float>
  );
}

export default function AppSceneBackground({
  frameloop = "always",
}: {
  frameloop?: "always" | "demand";
}) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <Canvas
        dpr={[1, 1.5]}
        frameloop={frameloop}
        camera={{ position: [0, 0, 8], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.45} />
        <pointLight position={[4, 6, 8]} intensity={18} color="#00d4ff" />
        <pointLight position={[-6, -2, 4]} intensity={10} color="#a78bfa" />
        <Stars radius={60} depth={40} count={1200} factor={3} fade speed={0.4} />
        <FloatingParticles />
        {!isHomePage && <HeroMesh />}
      </Canvas>
    </div>
  );
}

