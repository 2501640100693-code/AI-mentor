"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  SPARK_DRAG,
  SPARK_JITTER,
  SPARK_LIFE_MAX,
  SPARK_LIFE_MIN,
  SPARK_POOL,
  SPARK_SPEED_MAX,
  SPARK_SPEED_MIN,
} from "./constants";

export type SparkEmbersHandle = {
  spawn: (origin: THREE.Vector3, normal: THREE.Vector3) => void;
};

type Spark = {
  alive: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  lifetime: number;
};

const SparkEmbers = forwardRef<SparkEmbersHandle, { enabled?: boolean; poolSize?: number }>(
  function SparkEmbers({ enabled = true, poolSize = SPARK_POOL }, ref) {
    const pointsRef = useRef<THREE.Points>(null);
    const jitter = useRef(new THREE.Vector3());
    const cursor = useRef(0);

    const { sparks, positions, colors } = useMemo(() => {
      const sparks: Spark[] = Array.from({ length: poolSize }, () => ({
        alive: false,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        age: 0,
        lifetime: 1,
      }));
      return {
        sparks,
        positions: new Float32Array(poolSize * 3),
        colors: new Float32Array(poolSize * 3),
      };
    }, [poolSize]);

    useImperativeHandle(ref, () => ({
      spawn(origin, normal) {
        if (!enabled) return;
        const spark = sparks[cursor.current];
        cursor.current = (cursor.current + 1) % sparks.length;
        const speed = SPARK_SPEED_MIN + Math.random() * (SPARK_SPEED_MAX - SPARK_SPEED_MIN);
        spark.position.copy(origin);
        spark.velocity
          .copy(normal)
          .normalize()
          .multiplyScalar(speed)
          .add(
            jitter.current.set(
              (Math.random() - 0.5) * SPARK_JITTER,
              (Math.random() - 0.5) * SPARK_JITTER,
              (Math.random() - 0.5) * SPARK_JITTER
            )
          );
        spark.age = 0;
        spark.lifetime = SPARK_LIFE_MIN + Math.random() * (SPARK_LIFE_MAX - SPARK_LIFE_MIN);
        spark.alive = true;
      },
    }));

    useFrame((_, dt) => {
      const points = pointsRef.current;
      if (!points) return;
      const posAttr = points.geometry.getAttribute("position") as THREE.BufferAttribute;
      const colAttr = points.geometry.getAttribute("color") as THREE.BufferAttribute;

      for (let i = 0; i < sparks.length; i++) {
        const spark = sparks[i];
        const i3 = i * 3;
        if (!spark.alive) {
          posAttr.array[i3] = 0;
          posAttr.array[i3 + 1] = 0;
          posAttr.array[i3 + 2] = 0;
          colAttr.array[i3] = 0;
          colAttr.array[i3 + 1] = 0;
          colAttr.array[i3 + 2] = 0;
          continue;
        }

        spark.age += dt;
        if (spark.age >= spark.lifetime) {
          spark.alive = false;
          continue;
        }

        spark.velocity.multiplyScalar(SPARK_DRAG);
        spark.position.addScaledVector(spark.velocity, dt);

        const life = 1 - spark.age / spark.lifetime;
        posAttr.array[i3] = spark.position.x;
        posAttr.array[i3 + 1] = spark.position.y;
        posAttr.array[i3 + 2] = spark.position.z;
        colAttr.array[i3] = life;
        colAttr.array[i3 + 1] = life;
        colAttr.array[i3 + 2] = life;
      }

      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    });

    return (
      <points ref={pointsRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          vertexColors
          size={0.045}
          sizeAttenuation
          transparent
          opacity={0.7}
          depthWrite={false}
          toneMapped={false}
        />
      </points>
    );
  }
);

export default SparkEmbers;
