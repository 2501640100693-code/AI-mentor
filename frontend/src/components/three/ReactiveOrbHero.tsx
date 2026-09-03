"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * Spline Scene Specification Implementation: "Reactive Orb"
 * -------------------------------------------------------------
 * 1. BG: Dense subdivided plane (200x200), tilted X: -79.8°,
 *    with rolling displacement wave noise and bright teal Fresnel edge rim.
 * 2. Clones: EXACTLY 249 instanced bead spheres forming the orb
 *    with hemispherical Z-bulge, group scale 1.05, Lighting 60, Depth 100, Fresnel 100,
 *    and staggered idle shimmer pulse.
 * 3. Cursor: Smooth lerped pointer tracker driving parallax tilt & translation.
 */

const TOTAL_CLONE_BEADS = 249;

// Custom GLSL Shader for the 249-Bead Orb
const beadShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uBaseColor: { value: new THREE.Color("#051c28") },
    uGlowColor: { value: new THREE.Color("#00f2fe") },
    uFresnelPower: { value: 2.2 },
  },
  vertexShader: `
    uniform float uTime;
    attribute float aInstanceId;
    attribute float aNormDist;
    attribute float aBaseScale;

    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying float vNormDist;
    varying float vInstanceId;
    varying float vShimmer;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vNormDist = aNormDist;
      vInstanceId = aInstanceId;

      // Staggered idle shimmer pulse
      float shimmer = sin(uTime * 2.4 + aInstanceId * 0.17) * 0.5 + 0.5;
      vShimmer = shimmer;
      float scalePulse = aBaseScale * (1.0 + 0.09 * (shimmer - 0.5));

      vec3 transformed = position * scalePulse;
      vec4 worldPos = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
      vec4 mvPosition = viewMatrix * worldPos;

      vViewDir = normalize(-mvPosition.xyz);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform vec3 uBaseColor;
    uniform vec3 uGlowColor;
    uniform float uFresnelPower;

    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying float vNormDist;
    varying float vInstanceId;
    varying float vShimmer;

    void main() {
      float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), uFresnelPower);
      float depthFactor = mix(1.1, 0.45, vNormDist);

      vec3 core = uBaseColor * depthFactor;
      vec3 rim = uGlowColor * (fresnel * 1.6 + vShimmer * 0.25);
      vec3 finalColor = core + rim;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
};

function BeadOrbClones({
  pointerRef,
}: {
  pointerRef: React.RefObject<{ x: number; y: number }>;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const smoothParallax = useRef({ x: 0, y: 0 });

  const { positions, dummy, ids, normDists, baseScales } = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const idArr = new Float32Array(TOTAL_CLONE_BEADS);
    const normDistArr = new Float32Array(TOTAL_CLONE_BEADS);
    const scaleArr = new Float32Array(TOTAL_CLONE_BEADS);
    const d = new THREE.Object3D();

    const maxRadius = 2.35;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < TOTAL_CLONE_BEADS; i += 1) {
      const r = maxRadius * Math.sqrt((i + 0.5) / TOTAL_CLONE_BEADS);
      const theta = i * goldenAngle;
      const x = r * Math.cos(theta);
      const y = r * Math.sin(theta);

      const normDist = Math.min(r / maxRadius, 1);
      const maxZ = 1.32;
      const z = maxZ * Math.cos((normDist * Math.PI) / 2);

      pts.push(new THREE.Vector3(x, y, z));
      idArr[i] = i;
      normDistArr[i] = normDist;
      scaleArr[i] = 1.0 + 0.22 * (1 - normDist);
    }

    return {
      positions: pts,
      dummy: d,
      ids: idArr,
      normDists: normDistArr,
      baseScales: scaleArr,
    };
  }, []);

  useEffect(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < TOTAL_CLONE_BEADS; i += 1) {
      dummy.position.copy(positions[i]);
      dummy.scale.setScalar(baseScales[i]);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;

    const geometry = meshRef.current.geometry;
    geometry.setAttribute(
      "aInstanceId",
      new THREE.InstancedBufferAttribute(ids, 1),
    );
    geometry.setAttribute(
      "aNormDist",
      new THREE.InstancedBufferAttribute(normDists, 1),
    );
    geometry.setAttribute(
      "aBaseScale",
      new THREE.InstancedBufferAttribute(baseScales, 1),
    );
  }, [positions, dummy, ids, normDists, baseScales]);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = time;
    }

    if (pointerRef.current && groupRef.current) {
      smoothParallax.current.x = THREE.MathUtils.lerp(
        smoothParallax.current.x,
        pointerRef.current.x,
        0.06,
      );
      smoothParallax.current.y = THREE.MathUtils.lerp(
        smoothParallax.current.y,
        pointerRef.current.y,
        0.06,
      );

      groupRef.current.rotation.y =
        smoothParallax.current.x * 0.42 + Math.sin(time * 0.35) * 0.04;
      groupRef.current.rotation.x =
        -smoothParallax.current.y * 0.32 + Math.cos(time * 0.28) * 0.03;
      groupRef.current.position.x = smoothParallax.current.x * 0.28;
      groupRef.current.position.y = smoothParallax.current.y * 0.2;
    }
  });

  return (
    <group ref={groupRef} scale={[1.05, 1.05, 1.05]} position={[0, 0, 0]}>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, TOTAL_CLONE_BEADS]}
      >
        <sphereGeometry args={[0.13, 22, 22]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={beadShaderMaterial.vertexShader}
          fragmentShader={beadShaderMaterial.fragmentShader}
          uniforms={beadShaderMaterial.uniforms}
        />
      </instancedMesh>
      <pointLight position={[0, 0, 0.5]} intensity={18} color="#00d4ff" distance={4} />
      <pointLight position={[0, 0, -1]} intensity={8} color="#818cf8" distance={5} />
    </group>
  );
}

const terrainShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uWireColor: { value: new THREE.Color("#00d4ff") },
    uBaseColor: { value: new THREE.Color("#020c14") },
    uDisplacement: { value: -0.67 },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uDisplacement;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying float vElevation;

    float getWaveHeight(vec2 uv, float time) {
      float w1 = sin(uv.x * 12.0 + time * 1.1) * cos(uv.y * 10.0 + time * 0.85);
      float w2 = sin(uv.x * 24.0 - time * 0.7) * 0.35;
      float w3 = cos((uv.x + uv.y) * 16.0 + time * 0.9) * 0.4;
      return (w1 + w2 + w3);
    }

    void main() {
      vUv = uv;
      float elevation = getWaveHeight(uv, uTime) * uDisplacement;
      vElevation = elevation;

      vec3 displacedPos = position + normal * elevation;
      vec4 mvPosition = viewMatrix * modelMatrix * vec4(displacedPos, 1.0);

      vNormal = normalize(normalMatrix * normal);
      vViewDir = normalize(-mvPosition.xyz);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform vec3 uWireColor;
    uniform vec3 uBaseColor;
    uniform float uTime;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying float vElevation;

    void main() {
      float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 2.8);
      float contour = abs(fract(vElevation * 4.5 + uTime * 0.15) - 0.5) * 2.0;
      float lineIntensity = smoothstep(0.72, 0.98, contour);

      vec3 rimGlow = uWireColor * (fresnel * 2.0 + lineIntensity * 0.8);
      vec3 color = mix(uBaseColor, rimGlow, clamp(fresnel * 1.3 + lineIntensity * 0.6, 0.0, 1.0));
      float alpha = smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.75, vUv.y);

      gl_FragColor = vec4(color, alpha * 0.92);
    }
  `,
};

function DisplacementTerrainBG({
  pointerRef,
}: {
  pointerRef: React.RefObject<{ x: number; y: number }>;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const smoothParallax = useRef({ x: 0, y: 0 });

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = time;
    }

    if (pointerRef.current && meshRef.current) {
      smoothParallax.current.x = THREE.MathUtils.lerp(
        smoothParallax.current.x,
        pointerRef.current.x,
        0.04,
      );
      smoothParallax.current.y = THREE.MathUtils.lerp(
        smoothParallax.current.y,
        pointerRef.current.y,
        0.04,
      );

      meshRef.current.position.x = -1.2 + smoothParallax.current.x * 0.4;
      meshRef.current.position.y = -1.9 + smoothParallax.current.y * 0.2;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[-1.2, -1.9, -6.5]}
      rotation={[-1.39277, 0, 0]}
      castShadow={false}
      receiveShadow
    >
      <planeGeometry args={[18, 9, 200, 200]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={terrainShaderMaterial.vertexShader}
        fragmentShader={terrainShaderMaterial.fragmentShader}
        uniforms={terrainShaderMaterial.uniforms}
        transparent
        side={THREE.FrontSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function AmbientEmbers() {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 180;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const radius = 2.0 + Math.random() * 3.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi) * 0.6;
    }
    return pos;
  }, [count]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const t = clock.getElapsedTime() * 0.08;
    pointsRef.current.rotation.y = t;
    pointsRef.current.rotation.z = t * 0.5;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.038}
        color="#38bdf8"
        transparent
        opacity={0.65}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function SceneContents({
  pointerRef,
}: {
  pointerRef: React.RefObject<{ x: number; y: number }>;
}) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 0, 5.8);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.5} color="#00d4ff" />
      <directionalLight position={[-6, -4, 3]} intensity={1.2} color="#a78bfa" />
      <DisplacementTerrainBG pointerRef={pointerRef} />
      <BeadOrbClones pointerRef={pointerRef} />
      <AmbientEmbers />
    </>
  );
}

export default function ReactiveOrbHero() {
  const pointerRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    pointerRef.current = { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
  };

  const handlePointerLeave = () => {
    pointerRef.current = { x: 0, y: 0 };
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative h-full w-full select-none"
    >
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 5.8], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <SceneContents pointerRef={pointerRef} />
      </Canvas>
    </div>
  );
}


