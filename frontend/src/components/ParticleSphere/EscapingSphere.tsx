"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COLOR_WHITE, ESCAPE_DURATION } from "./constants";

export type EscapingSphereHandle = {
  busy: () => boolean;
  launch: (origin: THREE.Vector3, outward: THREE.Vector3, radius: number) => void;
};

const EscapingSphere = forwardRef<EscapingSphereHandle, { enabled?: boolean }>(
  function EscapingSphere({ enabled = true }, ref) {
    const meshRef = useRef<THREE.Mesh>(null);
    const origin = useMemo(() => new THREE.Vector3(), []);
    const dir = useMemo(() => new THREE.Vector3(), []);
    const age = useRef(-1);
    const duration = useRef(ESCAPE_DURATION);
    const travel = useRef(0.4);
    const travelScale = useRef(1);

    useImperativeHandle(ref, () => ({
      busy: () => age.current >= 0 && age.current < duration.current,
      launch(from, outward, radius) {
        if (!enabled) return;
        if (age.current >= 0 && age.current < duration.current) return;
        origin.copy(from);
        dir.copy(outward).normalize();
        travel.current = radius * 2;
        travelScale.current = radius / 0.08;
        duration.current = ESCAPE_DURATION;
        age.current = 0;
        const mesh = meshRef.current;
        if (mesh) {
          mesh.visible = true;
          mesh.position.copy(from);
          mesh.scale.setScalar(travelScale.current);
        }
      },
    }));

    useFrame((_, dt) => {
      const mesh = meshRef.current;
      if (!mesh) return;
      if (age.current < 0) {
        mesh.visible = false;
        return;
      }

      age.current += dt;
      const u = Math.min(1, age.current / duration.current);
      const ease = 1 - Math.pow(1 - u, 2);
      mesh.position.copy(origin).addScaledVector(dir, travel.current * ease);
      const fade = u > 0.55 ? 1 - (u - 0.55) / 0.45 : 1;
      mesh.scale.setScalar(travelScale.current * Math.max(0, fade));
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = Math.max(0, fade);
      mat.emissiveIntensity = 1.2 * fade;

      if (u >= 1) {
        age.current = -1;
        mesh.visible = false;
      }
    });

    return (
      <mesh ref={meshRef} visible={false} renderOrder={3}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial
          color={COLOR_WHITE}
          emissive={COLOR_WHITE}
          emissiveIntensity={1.2}
          roughness={0.12}
          metalness={0.05}
          transparent
          opacity={1}
          toneMapped={false}
        />
      </mesh>
    );
  }
);

export default EscapingSphere;
