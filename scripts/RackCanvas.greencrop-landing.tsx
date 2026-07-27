"use client";

import { useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import RackModel from "./RackModel";
import { rackTarget } from "@/lib/rackState";
import { prefersReducedMotion } from "@/lib/gsapConfig";

function Rig() {
  const group = useRef<THREE.Group>(null);
  const current = useRef({
    x: 0,
    y: 0,
    z: 0,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    scale: 0.85,
    opacity: 0,
    sensorGlow: 0,
  });
  const reduced = prefersReducedMotion();

  useFrame((state, delta) => {
    if (!group.current) return;
    const c = current.current;
    const t = rackTarget;
    const ease = reduced ? 1 : Math.min(1, delta * 3.2);

    c.x += (t.x - c.x) * ease;
    c.y += (t.y - c.y) * ease;
    c.z += (t.z - c.z) * ease;
    c.rotX += (t.rotX - c.rotX) * ease;
    c.rotY += (t.rotY - c.rotY) * ease;
    c.rotZ += (t.rotZ - c.rotZ) * ease;
    c.scale += (t.scale - c.scale) * ease;
    c.opacity += (t.opacity - c.opacity) * ease;
    c.sensorGlow += (t.sensorGlow - c.sensorGlow) * ease;

    const ambient = reduced ? 0 : state.clock.getElapsedTime() * 0.12;

    group.current.position.set(c.x, c.y, c.z);
    group.current.rotation.set(c.rotX, c.rotY + ambient, c.rotZ);
    group.current.scale.setScalar(c.scale);
    group.current.visible = c.opacity > 0.01;

    group.current.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if ((mesh as THREE.Mesh).isMesh) {
        const mat = mesh.material as THREE.MeshPhysicalMaterial;
        if (mat && "transparent" in mat) {
          mat.transparent = true;
          mat.opacity = c.opacity;
        }
      }
    });
  });

  return (
    <group ref={group}>
      <RackModel sensorGlow={rackTarget.sensorGlow} />
    </group>
  );
}

export default function RackCanvas() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-10"
      style={{ contain: "layout style" }}
    >
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.15, 5.2], fov: 32 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.72} />
          <directionalLight
            position={[3, 4, 4]}
            intensity={1.85}
            color="#fffdf5"
          />
          <directionalLight
            position={[-4, 1, 2]}
            intensity={0.42}
            color="#dff7ef"
          />
          <pointLight position={[-3, -1, 2]} intensity={2.4} color="#d8fff0" />
          <pointLight position={[2, -2, -3]} intensity={1.8} color="#4fd19a" />
          <pointLight position={[0, 2, -4]} intensity={1.6} color="#fff1c7" />

          <Rig />

          <ContactShadows
            position={[0, -1.42, 0]}
            opacity={0.55}
            scale={6}
            blur={2.6}
            far={2}
            color="#000000"
          />
          <Sparkles
            count={24}
            speed={0.25}
            opacity={0.35}
            scale={[4, 5, 4]}
            size={2}
            color="#8fe0ba"
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
