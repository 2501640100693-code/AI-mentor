"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  ASSEMBLY_DURATION,
  ASSEMBLY_SCATTER,
  CLUSTER_RADIUS,
  COLOR_ACTIVE_LIME,
  COLOR_ACTIVE_TEAL,
  COLOR_IDLE,
  COLOR_TYPING_WARM,
  COLOR_WHITE,
  COLOR_YELLOW,
  DISPLACE_PULL,
  DISPLACE_SWIRL,
  ENERGY_DECAY,
  ENTRANCE_FLASH,
  ENTRANCE_QUIET,
  ENTRANCE_QUIET_AMP,
  ESCAPE_MAX,
  ESCAPE_MIN,
  HEMI_AIRY_SCALE,
  HEMI_BEAT_DURATION,
  HEMI_BEAT_GAP,
  HEMI_THIN_FRACTION,
  INSTANCE_PACK,
  NOISE_SPEED_FOCUS,
  NOISE_SPEED_IDLE,
  POINTER_CORE_FACTOR,
  POINTER_FALLOFF_FACTOR,
  POINTER_FRONT_DOT,
  POINTER_STEPS,
  RADIAL_POP,
  SCALE_IDLE,
  SPARK_ENERGY_THRESHOLD,
  SPARK_SPAWN_CHANCE,
  SPIN_SPEED,
  SPHERE_OFFSET,
  SUCCESS_PASS,
  SURGE_DEPTH,
  THRESH_HIGH,
  THRESH_LOW,
  TYPING_CONTRACT,
  TYPING_ESCAPE_CHANCE,
  TYPING_FOCUS_HOLD,
  TYPING_GLOW_DECAY,
  TYPING_GLOW_PEAK,
  TYPING_INNER_LIGHT,
  TYPING_BLINK_FRACTION,
  TYPING_SIGNAL_SPEED,
  TYPING_SIGNAL_WIDTH,
  TYPING_SPARK_BURST,
  TYPING_SPIN_BOOST,
  TYPING_WAVE_BOOST,
  VANISH_CHANCE,
  VANISH_ENERGY,
  YELLOW_BERRY_FRACTION,
  WAVE_AXIS_SPEED,
  WAVE_TRAVEL,
  WAVE_WIDTH,
} from "./constants";
import {
  averageNearestNeighborDistance,
  easeInOutCubic,
  fibonacciSphere,
  smoothstep,
} from "./geometry";
import { useFresnelOrbMaterial } from "./useFresnelOrbMaterial";
import SparkEmbers, { type SparkEmbersHandle } from "./SparkEmbers";
import EscapingSphere, { type EscapingSphereHandle } from "./EscapingSphere";

export type FocusField = "email" | "password" | null;
export type PointerNDC = { x: number; y: number };

type ParticleSphereProps = {
  count: number;
  reducedMotion: boolean;
  successTick: number;
  typingTick: number;
  focusField: FocusField;
  pointerRef: MutableRefObject<PointerNDC | null>;
};

const idleColor = new THREE.Color(COLOR_IDLE);
const tealColor = new THREE.Color(COLOR_ACTIVE_TEAL);
const limeColor = new THREE.Color(COLOR_ACTIVE_LIME);
const whiteColor = new THREE.Color(COLOR_WHITE);
const warmColor = new THREE.Color(COLOR_TYPING_WARM);
const yellowColor = new THREE.Color(COLOR_YELLOW);

const D1 = new THREE.Vector3(0.72, 0.41, 0.56).normalize();
const D2 = new THREE.Vector3(-0.38, 0.82, 0.43).normalize();
const D3 = new THREE.Vector3(0.22, -0.55, 0.8).normalize();

function layeredNoise(p: THREE.Vector3, t: number): number {
  const s1 = Math.sin(p.dot(D1) * 1.15 + t * 1.35);
  const s2 = Math.sin(p.dot(D2) * 2.05 + t * 0.72);
  const s3 = Math.sin(p.dot(D3) * 0.68 + t * 2.15);
  return 0.55 * s1 + 0.3 * s2 + 0.15 * s3;
}

/** Dark → teal → lime → white peak. */
function colorFromActivation(a: number, out: THREE.Color) {
  if (a <= 0.001) {
    out.copy(idleColor);
    return out;
  }
  if (a < 0.4) {
    out.copy(idleColor).lerp(tealColor, a / 0.4);
    return out;
  }
  if (a < 0.72) {
    out.copy(tealColor).lerp(limeColor, (a - 0.4) / 0.32);
    return out;
  }
  out.copy(limeColor).lerp(whiteColor, (a - 0.72) / 0.28);
  return out;
}

function beatEnvelope(age: number, duration: number): number {
  if (age < 0 || age >= duration) return 0;
  const rise = 0.28;
  const fall = 0.32;
  if (age < rise) return smoothstep(0, rise, age);
  if (age > duration - fall) return 1 - smoothstep(duration - fall, duration, age);
  return 1;
}

export default function ParticleSphere({
  count,
  reducedMotion,
  successTick,
  typingTick,
  focusField,
  pointerRef,
}: ParticleSphereProps) {
  const { camera, raycaster, viewport } = useThree();
  const clusterRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const scratchColor = useMemo(() => new THREE.Color(), []);
  const waveAxis = useMemo(() => new THREE.Vector3(0.55, 0.72, 0.4), []);
  const sparksRef = useRef<SparkEmbersHandle>(null);
  const escapeRef = useRef<EscapingSphereHandle>(null);
  const sparkNormal = useRef(new THREE.Vector3());
  const elapsed = useRef(0);
  const lastTypingTick = useRef(typingTick);
  const lastSuccessTick = useRef(successTick);
  const successAge = useRef(-1);
  const typingGlow = useRef(0);
  const typingBurst = useRef(false);
  const pulseAge = useRef(0);
  const pulseAxis = useRef(new THREE.Vector3(0.42, 0.78, 0.46));
  const wavePhase = useRef(0);
  const axisPhase = useRef(0);
  const hemiBeatAge = useRef(-1);
  const nextHemiAt = useRef(ENTRANCE_QUIET + ENTRANCE_FLASH + 0.8);
  const beatSmooth = useRef(0);
  const wireOp = useRef(0);
  const wireRef = useRef<THREE.LineSegments>(null);
  const clusterScale = useRef(1);
  const innerLightRef = useRef<THREE.PointLight>(null);
  const nextEscapeAt = useRef(ESCAPE_MIN + Math.random() * (ESCAPE_MAX - ESCAPE_MIN));
  const lastPointer = useRef(new THREE.Vector2());
  const hadPointer = useRef(false);
  const hitPoint = useRef(new THREE.Vector3());
  const hitLocal = useRef(new THREE.Vector3());
  const hitNormal = useRef(new THREE.Vector3());
  const ndcVec = useRef(new THREE.Vector2());
  const lerpNdc = useRef(new THREE.Vector2());
  const lastHitLocal = useRef(new THREE.Vector3());
  const persistHit = useRef(new THREE.Vector3());
  const persistHitN = useRef(new THREE.Vector3());
  const persistValid = useRef(false);
  const tangent = useRef(new THREE.Vector3());
  const toward = useRef(new THREE.Vector3());
  const hasLastHit = useRef(false);
  const proxySphere = useMemo(() => new THREE.Sphere(new THREE.Vector3(), CLUSTER_RADIUS), []);
  const material = useFresnelOrbMaterial();

  const points = useMemo(() => fibonacciSphere(count, CLUSTER_RADIUS), [count]);
  const scattered = useMemo(() => {
    return points.map((p) => {
      const dir = p.clone().normalize();
      const start = dir.multiplyScalar(CLUSTER_RADIUS * ASSEMBLY_SCATTER);
      start.x += (Math.random() - 0.5) * 0.85;
      start.y += (Math.random() - 0.5) * 0.85;
      start.z += (Math.random() - 0.5) * 0.85;
      return start;
    });
  }, [points]);
  const instanceRadius = useMemo(() => {
    const spacing = averageNearestNeighborDistance(points);
    return spacing * INSTANCE_PACK;
  }, [points]);
  const restSize = useMemo(() => {
    const s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      s[i] = 0.52 + ((i * 13) % 100) / 100 * 0.58;
    }
    return s;
  }, [count]);
  const yellowBerry = useMemo(() => {
    const flags = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      flags[i] = ((i * 53) % 100) / 100 < YELLOW_BERRY_FRACTION ? 1 : 0;
    }
    return flags;
  }, [count]);
  const edgeIndices = useMemo(() => {
    const scored = points.map((p, i) => ({ i, z: p.z, r: p.length() }));
    scored.sort((a, b) => b.r - a.r);
    return scored.slice(0, Math.max(12, Math.floor(count * 0.18))).map((s) => s.i);
  }, [points, count]);

  const activation = useMemo(() => new Float32Array(count), [count]);
  const prevActivation = useMemo(() => new Float32Array(count), [count]);
  const energy = useMemo(() => new Float32Array(count), [count]);
  const signal = useMemo(() => new Float32Array(count), [count]);
  const thinAmt = useMemo(() => new Float32Array(count), [count]);
  const keyPop = useMemo(() => new Float32Array(count), [count]);
  const lastKeyPop = useRef(0);
  const wireGeom = useMemo(() => {
    const ico = new THREE.IcosahedronGeometry(CLUSTER_RADIUS, 1);
    const edges = new THREE.EdgesGeometry(ico);
    ico.dispose();
    return edges;
  }, []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    if (!mesh.instanceColor) {
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
    }
    scratchColor.copy(idleColor);
    for (let i = 0; i < count; i++) {
      dummy.position.copy(reducedMotion ? points[i] : scattered[i]);
      dummy.scale.setScalar(reducedMotion ? SCALE_IDLE : 0.001);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, scratchColor);
      activation[i] = 0;
      prevActivation[i] = 0;
      energy[i] = 0;
      signal[i] = 0;
      thinAmt[i] = 0;
      keyPop[i] = 0;
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
  }, [count, dummy, points, scattered, scratchColor, activation, prevActivation, energy, signal, thinAmt, keyPop, reducedMotion]);

  useEffect(() => () => wireGeom.dispose(), [wireGeom]);

  useFrame((_, dt) => {
    const mesh = meshRef.current;
    const spin = spinRef.current;
    if (!mesh) return;
    const step = Math.min(dt, 0.05);
    elapsed.current += step;

    if (!reducedMotion && spin) {
      spin.rotation.y += SPIN_SPEED * step * (1 + typingGlow.current * TYPING_SPIN_BOOST);
    }

    if (successTick !== lastSuccessTick.current) {
      lastSuccessTick.current = successTick;
      if (successTick > 0) successAge.current = 0;
    }
    if (successAge.current >= 0) {
      successAge.current += step;
      if (successAge.current > SUCCESS_PASS) successAge.current = -1;
    }

    const focused = focusField !== null;
    const speed = focused ? NOISE_SPEED_FOCUS : NOISE_SPEED_IDLE;
    const t = elapsed.current * speed;

    typingBurst.current = false;
    if (typingTick !== lastTypingTick.current) {
      lastTypingTick.current = typingTick;
      if (typingTick > 0) {
        typingGlow.current = 1;
        pulseAge.current = 0;
        typingBurst.current = true;
        pulseAxis.current
          .set(
            Math.sin(elapsed.current * 3.1 + typingTick * 1.7),
            Math.cos(elapsed.current * 2.2 + typingTick * 0.9),
            Math.sin(elapsed.current * 1.4 + typingTick * 2.3)
          )
          .normalize();
        if (!reducedMotion && count > 0) {
          let idx = Math.floor(Math.random() * count);
          if (idx === lastKeyPop.current && count > 1) {
            idx = (idx + 1 + Math.floor(Math.random() * (count - 1))) % count;
          }
          lastKeyPop.current = idx;
          keyPop[idx] = 1;
        }
      }
    } else {
      typingGlow.current *= TYPING_GLOW_DECAY;
      if (typingGlow.current < 0.002) typingGlow.current = 0;
    }
    if (focused && typingGlow.current < TYPING_FOCUS_HOLD) {
      typingGlow.current = TYPING_FOCUS_HOLD;
    }
    pulseAge.current += step;
    const glow = reducedMotion ? 0 : typingGlow.current;
    const targetCluster = 1 - glow * TYPING_CONTRACT;
    clusterScale.current += (targetCluster - clusterScale.current) * 0.08;
    const targetX =
      viewport.width < 4.4
        ? Math.min(0.35, viewport.width * 0.08)
        : Math.min(Math.max(viewport.width * 0.22, 1.15), 2.05);
    if (clusterRef.current) {
      clusterRef.current.scale.setScalar(clusterScale.current);
      const px = clusterRef.current.position.x;
      clusterRef.current.position.set(
        px + (targetX - px) * 0.1,
        SPHERE_OFFSET[1],
        SPHERE_OFFSET[2]
      );
    }
    if (innerLightRef.current) {
      const targetLight = glow * TYPING_INNER_LIGHT;
      innerLightRef.current.intensity +=
        (targetLight - innerLightRef.current.intensity) * 0.12;
    }

    const assembling = !reducedMotion && elapsed.current < ASSEMBLY_DURATION;
    const assembleT = assembling
      ? easeInOutCubic(elapsed.current / ASSEMBLY_DURATION)
      : 1;

    if (!reducedMotion && assembleT >= 1) {
      if (hemiBeatAge.current >= 0) {
        hemiBeatAge.current += step;
        if (hemiBeatAge.current >= HEMI_BEAT_DURATION) {
          hemiBeatAge.current = -1;
          nextHemiAt.current = elapsed.current + HEMI_BEAT_GAP;
        }
      } else if (elapsed.current >= nextHemiAt.current) {
        hemiBeatAge.current = 0;
      }
    }
    const beatTarget = reducedMotion ? 0 : beatEnvelope(hemiBeatAge.current, HEMI_BEAT_DURATION);
    beatSmooth.current += (beatTarget - beatSmooth.current) * Math.min(1, step * 7);
    const beat = beatSmooth.current;
    if (wireRef.current) {
      const mat = wireRef.current.material as THREE.LineBasicMaterial;
      wireOp.current += (beat * 0.28 - wireOp.current) * Math.min(1, step * 6);
      mat.opacity = wireOp.current;
      wireRef.current.visible = wireOp.current > 0.01;
    }

    const surge =
      0.5 +
      0.5 * Math.sin(elapsed.current * 0.42 + 1.3) * Math.sin(elapsed.current * 0.11 + 0.4);
    let threshLow = THRESH_LOW - surge * SURGE_DEPTH - glow * 0.2;
    let threshHigh = THRESH_HIGH - surge * (SURGE_DEPTH * 0.8) - glow * 0.16;
    let amp = 1 + glow * 0.4;

    const e = elapsed.current;
    if (e < ENTRANCE_QUIET) {
      amp = ENTRANCE_QUIET_AMP;
      threshLow += 0.12;
      threshHigh += 0.08;
    }
    const flashStart = ENTRANCE_QUIET;
    const flashEnd = ENTRANCE_QUIET + ENTRANCE_FLASH;
    const flash =
      e >= flashStart && e <= flashEnd
        ? smoothstep(flashStart, flashStart + 0.28, e) *
          (1 - smoothstep(flashStart + 0.45, flashEnd, e))
        : 0;

    let successBoost = 0;
    if (successAge.current >= 0) {
      const u = successAge.current / SUCCESS_PASS;
      successBoost = Math.sin(Math.min(1, u) * Math.PI) * 0.85;
    }

    wavePhase.current += step * WAVE_TRAVEL * (1 + glow * TYPING_WAVE_BOOST);
    axisPhase.current += step * WAVE_AXIS_SPEED * (1 + glow * TYPING_WAVE_BOOST);
    const tw = axisPhase.current;
    waveAxis
      .set(Math.sin(tw * 0.71 + 0.2), Math.cos(tw * 0.43 + 1.1), Math.sin(tw * 0.29 + 0.7))
      .normalize();
    const bandPos = Math.sin(wavePhase.current) * CLUSTER_RADIUS * 0.85;

    const pointerNDC = reducedMotion ? null : pointerRef.current;
    hasLastHit.current = false;
    if (pointerNDC) {
      const current = ndcVec.current.set(pointerNDC.x, pointerNDC.y);
      if (!hadPointer.current) {
        lastPointer.current.copy(current);
        hadPointer.current = true;
      }
      if (spin) {
        spin.getWorldPosition(proxySphere.center);
      }
      const falloff = CLUSTER_RADIUS * POINTER_FALLOFF_FACTOR;
      const core = CLUSTER_RADIUS * POINTER_CORE_FACTOR;
      for (let s = 1; s <= POINTER_STEPS; s++) {
        lerpNdc.current.copy(lastPointer.current).lerp(current, s / POINTER_STEPS);
        raycaster.setFromCamera(lerpNdc.current, camera);
        const hit = raycaster.ray.intersectSphere(proxySphere, hitPoint.current);
        if (!hit || !spin) continue;
        hitLocal.current.copy(hitPoint.current);
        spin.worldToLocal(hitLocal.current);
        hitNormal.current.copy(hitLocal.current).normalize();
        lastHitLocal.current.copy(hitLocal.current);
        hasLastHit.current = true;
        for (let i = 0; i < count; i++) {
          const front = points[i].dot(hitNormal.current) / CLUSTER_RADIUS;
          if (front < POINTER_FRONT_DOT) continue;
          const d = points[i].distanceTo(hitLocal.current);
          let paint = 1 - smoothstep(0, falloff, d);
          if (d < core) paint = 1;
          if (paint > energy[i]) energy[i] = paint;
        }
      }
      lastPointer.current.copy(current);
      if (hasLastHit.current) {
        let best = 0;
        let bestD = Infinity;
        for (let i = 0; i < count; i++) {
          const d = points[i].distanceToSquared(lastHitLocal.current);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
        if (energy[best] < 0.92) energy[best] = 0.92;
        persistHit.current.copy(lastHitLocal.current);
        persistHitN.current.copy(hitNormal.current);
        persistValid.current = true;
      }
    } else {
      hadPointer.current = false;
    }

    const sparkHandle = sparksRef.current;
    const typeGlow = glow * TYPING_GLOW_PEAK;
    const pingCenter = pulseAge.current * TYPING_SIGNAL_SPEED * CLUSTER_RADIUS - CLUSTER_RADIUS;
    for (let i = 0; i < count; i++) {
      energy[i] *= ENERGY_DECAY;
      if (energy[i] < 0.002) energy[i] = 0;
      keyPop[i] *= 0.88;
      if (keyPop[i] < 0.01) keyPop[i] = 0;

      const n = (layeredNoise(points[i], t) * 0.5 + 0.5) * amp;
      const plane = points[i].dot(waveAxis) - bandPos;
      const band = 1 - smoothstep(0, WAVE_WIDTH, Math.abs(plane));
      const mixed = band * (0.32 + 0.68 * n);
      let a = smoothstep(threshLow, threshHigh, mixed);
      let sig = 0;
      if (glow > 0.02) {
        const along = points[i].dot(pulseAxis.current);
        const ping = 1 - smoothstep(0, TYPING_SIGNAL_WIDTH, Math.abs(along - pingCenter));
        const lobe = smoothstep(0.18, 0.74, along / CLUSTER_RADIUS);
        sig = Math.max(ping, lobe * 0.95) * glow;
      }
      signal[i] = sig;
      if (beat > 0.02) {
        const ndot = points[i].dot(waveAxis) / CLUSTER_RADIUS;
        const lit = smoothstep(-0.08, 0.38, ndot) * beat;
        a = Math.max(a, lit);
      }
      a = Math.max(a, energy[i], sig, flash * 0.92, successBoost * (0.55 + n * 0.45));
      if (reducedMotion) a = 0;
      activation[i] = a;

      if (
        !reducedMotion &&
        sparkHandle &&
        prevActivation[i] < SPARK_ENERGY_THRESHOLD &&
        a >= SPARK_ENERGY_THRESHOLD &&
        Math.random() < SPARK_SPAWN_CHANCE * (1 + glow * 2.4)
      ) {
        sparkNormal.current.copy(points[i]).normalize();
        sparkHandle.spawn(points[i], sparkNormal.current);
      }
    }

    if (!reducedMotion && typingBurst.current && sparkHandle) {
      let spawned = 0;
      const seed = (typingTick * 19) % Math.max(1, count);
      for (let k = 0; k < count && spawned < TYPING_SPARK_BURST; k++) {
        const i = (seed + k * 7) % count;
        if (signal[i] < 0.42) continue;
        sparkNormal.current.copy(points[i]).normalize();
        sparkHandle.spawn(points[i], sparkNormal.current);
        spawned++;
      }
    }

    if (
      !reducedMotion &&
      elapsed.current > ASSEMBLY_DURATION &&
      escapeRef.current &&
      !escapeRef.current.busy() &&
      (elapsed.current >= nextEscapeAt.current ||
        (typingBurst.current && Math.random() < TYPING_ESCAPE_CHANCE))
    ) {
      let best = edgeIndices[0] ?? 0;
      let bestA = -1;
      for (const idx of edgeIndices) {
        const score = Math.max(activation[idx], signal[idx]);
        if (score > bestA) {
          bestA = score;
          best = idx;
        }
      }
      sparkNormal.current.copy(points[best]).normalize();
      escapeRef.current.launch(points[best], sparkNormal.current, instanceRadius);
      nextEscapeAt.current =
        elapsed.current + ESCAPE_MIN + Math.random() * (ESCAPE_MAX - ESCAPE_MIN);
    }

    prevActivation.set(activation);

    for (let i = 0; i < count; i++) {
      dummy.position.lerpVectors(scattered[i], points[i], assembleT);
      const e = energy[i];
      const sig = signal[i];
      const pop = Math.max(e, sig);
      const kp = keyPop[i];
      if (assembleT > 0.95 && e > 0.01 && persistValid.current) {
        tangent.current.copy(persistHitN.current).cross(points[i]);
        if (tangent.current.lengthSq() < 1e-8) {
          tangent.current.set(0, 1, 0).cross(points[i]);
        }
        tangent.current.normalize();
        dummy.position.addScaledVector(
          tangent.current,
          e * DISPLACE_SWIRL * Math.sin(elapsed.current * 7.5 + i * 0.37)
        );
        toward.current.copy(persistHit.current).sub(points[i]);
        toward.current.addScaledVector(
          persistHitN.current,
          -toward.current.dot(persistHitN.current)
        );
        if (toward.current.lengthSq() > 1e-8) {
          toward.current.normalize();
          dummy.position.addScaledVector(toward.current, e * DISPLACE_PULL);
        }
      }
      if (assembleT > 0.95 && pop > 0.01) {
        sparkNormal.current.copy(points[i]).normalize();
        dummy.position.addScaledVector(sparkNormal.current, pop * RADIAL_POP);
      }
      if (assembleT > 0.95 && kp > 0.02) {
        sparkNormal.current.copy(points[i]).normalize();
        dummy.position.addScaledVector(sparkNormal.current, kp * 0.07);
      }
      const ndot = points[i].dot(waveAxis) / CLUSTER_RADIUS;
      const lit = beat > 0.02 ? smoothstep(-0.08, 0.38, ndot) * beat : 0;
      const thinPick = ((i * 41) % 100) / 100;
      const hideTeal =
        !yellowBerry[i] && lit < 0.32 && thinPick < HEMI_THIN_FRACTION * beat;
      thinAmt[i] += ((hideTeal ? 1 : 0) - thinAmt[i]) * Math.min(1, step * 8);
      dummy.scale.setScalar(
        restSize[i] *
          SCALE_IDLE *
          Math.max(0.04, assembleT) *
          (1 + e * 0.22 + sig * 0.3) *
          (1 - lit * (1 - HEMI_AIRY_SCALE)) *
          (1 - thinAmt[i] * 0.997) *
          (1 + kp * 0.7) *
          (yellowBerry[i] ? 1.12 : 1)
      );
      const flicker = Math.sin(elapsed.current * 14 + i * 2.31) * 0.5 + 0.5;
      const pick = ((i * 47) % 100) / 100;
      if (e > VANISH_ENERGY && pick < VANISH_CHANCE && flicker > 0.62 && !yellowBerry[i] && kp < 0.2) {
        dummy.scale.setScalar(0.001);
      }
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      if (mesh.instanceColor) {
        colorFromActivation(Math.max(activation[i], typeGlow * 0.12, e), scratchColor);
        if (lit > 0.18) {
          scratchColor.lerp(whiteColor, Math.min(1, lit * 1.2));
        }
        if (lit > 0.72) {
          scratchColor.copy(whiteColor);
        }
        if (e > 0.18) {
          scratchColor.lerp(whiteColor, Math.min(1, (e - 0.18) * 1.35));
          const cursorSpark = ((i * 19) % 100) / 100;
          if (e > 0.48 && cursorSpark < 0.38) {
            scratchColor.lerp(warmColor, (e - 0.48) * 1.6);
          }
        }
        if (sig > 0.18) {
          scratchColor.lerp(limeColor, Math.min(1, sig * 1.15));
        }
        if (sig > 0.52) {
          scratchColor.copy(limeColor).lerp(whiteColor, (sig - 0.52) / 0.48);
        }
        if (sig > 0.8) {
          scratchColor.copy(whiteColor);
        }
        const terminator = 1 - Math.abs(ndot);
        const blinkPick = ((i * 31) % 100) / 100;
        const blinkWave = Math.sin(elapsed.current * 11.4 + i * 1.73) * 0.5 + 0.5;
        if (beat > 0.25 && terminator > 0.62 && blinkPick < 0.24 && blinkWave > 0.5) {
          scratchColor.copy(yellowColor).lerp(limeColor, blinkWave * 0.4);
        }
        if (
          glow > TYPING_FOCUS_HOLD + 0.04 &&
          blinkPick < TYPING_BLINK_FRACTION &&
          blinkWave > 0.5 &&
          sig < 0.55
        ) {
          scratchColor.copy(warmColor).lerp(whiteColor, blinkWave);
        }
        if (yellowBerry[i] && kp < 0.2) {
          scratchColor.copy(yellowColor);
        }
        if (kp > 0.12) {
          scratchColor.copy(whiteColor);
        }
        mesh.setColorAt(i, scratchColor);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <group ref={clusterRef} position={SPHERE_OFFSET}>
      <group ref={spinRef}>
        <pointLight intensity={0.7} color="#10CD98" distance={5.2} decay={2} />
        <pointLight intensity={0.35} color="#93FF0C" distance={3.4} decay={2} />
        <pointLight
          ref={innerLightRef}
          color={COLOR_TYPING_WARM}
          intensity={0}
          distance={4.2}
          decay={2}
        />
        <instancedMesh
          key={count}
          ref={meshRef}
          args={[undefined, undefined, count]}
          frustumCulled={false}
          material={material}
        >
          <sphereGeometry args={[instanceRadius, 16, 16]} />
        </instancedMesh>
        <lineSegments ref={wireRef} geometry={wireGeom} visible={false} frustumCulled={false}>
          <lineBasicMaterial
            color="#10CD98"
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
          />
        </lineSegments>
        <SparkEmbers ref={sparksRef} enabled={!reducedMotion} />
        <EscapingSphere ref={escapeRef} enabled={!reducedMotion} />
      </group>
    </group>
  );
}
