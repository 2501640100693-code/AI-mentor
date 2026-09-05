import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { FRESNEL_RIM, FRESNEL_STRENGTH } from "./constants";

/** Dark-filled glass bubble with a dim teal fresnel rim. Instance colors drive energy tint. */
export function useFresnelOrbMaterial() {
  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: "#04140F",
      roughness: 0.32,
      metalness: 0.1,
      envMapIntensity: 0.35,
      vertexColors: true,
    });

    mat.onBeforeCompile = (shader) => {
      const token = "#include <opaque_fragment>";
      if (!shader.fragmentShader.includes(token)) return;
      shader.fragmentShader = shader.fragmentShader.replace(
        token,
        `
        float fresnel = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.0);
        outgoingLight += vec3(${FRESNEL_RIM[0]}, ${FRESNEL_RIM[1]}, ${FRESNEL_RIM[2]}) * fresnel * ${FRESNEL_STRENGTH.toFixed(2)};
        // Instance color drives the wave: lit balls emit (and bloom), idle near-black balls stay dark.
        float energy = max(max(vColor.r, vColor.g), vColor.b);
        outgoingLight += vColor.rgb * smoothstep(0.16, 1.0, energy) * 1.7;
        ${token}
        `
      );
    };

    mat.customProgramCacheKey = () => "fresnel-orb-v6";
    return mat;
  }, []);

  useEffect(() => () => material.dispose(), [material]);
  return material;
}
