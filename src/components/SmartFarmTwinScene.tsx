import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

type Vec3 = [number, number, number];

interface SmartFarmTwinSceneProps {
  isOn: boolean;
  pumps: boolean[];
  activeTank: number | null;
}

interface LabelProps {
  active?: boolean;
  position: Vec3;
  text: string;
}

function SceneLabel({ active = false, position, text }: LabelProps) {
  return (
    <Html position={position} center distanceFactor={8} transform>
      <div
        style={{
          padding: "6px 10px",
          borderRadius: "999px",
          border: active ? "1px solid rgba(34,211,238,0.45)" : "1px solid rgba(148,163,184,0.25)",
          background: active ? "rgba(2, 6, 23, 0.84)" : "rgba(15, 23, 42, 0.66)",
          color: active ? "#cffafe" : "#cbd5e1",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          boxShadow: active ? "0 0 24px rgba(34,211,238,0.22)" : "none",
          whiteSpace: "nowrap",
          backdropFilter: "blur(10px)",
        }}
      >
        {text}
      </div>
    </Html>
  );
}

function PulseNode({ active, color, position }: { active: boolean; color: string; position: Vec3 }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = active ? 1 + Math.sin(t * 2.8) * 0.25 : 1;
    if (ringRef.current) {
      ringRef.current.scale.setScalar(pulse);
      const material = ringRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = active ? 0.45 + Math.sin(t * 2.8) * 0.18 : 0.18;
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(active ? 1 + Math.sin(t * 3.2) * 0.12 : 1);
    }
  });

  return (
    <group position={position}>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.09, 24, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 2.6 : 0.65} />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.18, 0.02, 12, 40]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

function FlowBeam({
  active,
  color,
  start,
  end,
}: {
  active: boolean;
  color: string;
  start: Vec3;
  end: Vec3;
}) {
  const indicatorRef = useRef<THREE.Mesh>(null);
  const direction = useMemo(() => new THREE.Vector3(end[0] - start[0], end[1] - start[1], end[2] - start[2]), [end, start]);
  const length = direction.length();
  const midpoint = useMemo<Vec3>(() => [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2,
  ], [end, start]);
  const rotation = useMemo(() => {
    const axis = new THREE.Vector3(0, 1, 0);
    const normalizedDirection = direction.clone().normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, normalizedDirection);
    const euler = new THREE.Euler().setFromQuaternion(quaternion);
    return [euler.x, euler.y, euler.z] as Vec3;
  }, [direction]);

  useFrame(({ clock }) => {
    if (!indicatorRef.current) return;
    const progress = active ? (clock.getElapsedTime() * 0.45) % 1 : 0;
    indicatorRef.current.visible = active;
    indicatorRef.current.position.set(
      THREE.MathUtils.lerp(start[0], end[0], progress),
      THREE.MathUtils.lerp(start[1], end[1], progress),
      THREE.MathUtils.lerp(start[2], end[2], progress),
    );
  });

  return (
    <group>
      <mesh position={midpoint} rotation={rotation} castShadow receiveShadow>
        <cylinderGeometry args={[0.03, 0.03, length, 20]} />
        <meshStandardMaterial
          color={active ? color : "#64748b"}
          emissive={active ? color : "#0f172a"}
          emissiveIntensity={active ? 1.1 : 0.15}
          metalness={0.3}
          roughness={0.28}
        />
      </mesh>
      <mesh ref={indicatorRef} visible={active}>
        <sphereGeometry args={[0.07, 18, 18]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.2} />
      </mesh>
    </group>
  );
}

function PumpCore({ active, position }: { active: boolean; position: Vec3 }) {
  const ringRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!ringRef.current) return;
    ringRef.current.rotation.z += delta * (active ? 2.8 : 0.45);
  });

  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.32, 0.32, 0.36, 28]} />
        <meshStandardMaterial color="#0f172a" metalness={0.78} roughness={0.24} />
      </mesh>
      <group ref={ringRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.46, 0.045, 16, 72]} />
          <meshStandardMaterial
            color={active ? "#22d3ee" : "#334155"}
            emissive={active ? "#22d3ee" : "#0f172a"}
            emissiveIntensity={active ? 2.1 : 0.3}
            metalness={0.6}
            roughness={0.18}
          />
        </mesh>
      </group>
    </group>
  );
}

function Bucket({
  active,
  position,
}: {
  active: boolean;
  position: Vec3;
}) {
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!glowRef.current) return;
    const scale = active ? 1 + Math.sin(clock.getElapsedTime() * 2.2) * 0.04 : 1;
    glowRef.current.scale.set(scale, 1, scale);
  });

  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.36, 1.38, 28]} />
        <meshStandardMaterial color="#0b1120" metalness={0.42} roughness={0.38} />
      </mesh>
      <mesh position={[0, 0.64, 0]} castShadow>
        <torusGeometry args={[0.39, 0.03, 12, 40]} />
        <meshStandardMaterial color="#1e293b" metalness={0.65} roughness={0.2} />
      </mesh>
      <mesh ref={glowRef} position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.34, 0.34, 1.1, 24]} />
        <meshStandardMaterial
          color={active ? "#0f766e" : "#111827"}
          emissive={active ? "#34d399" : "#000000"}
          emissiveIntensity={active ? 0.9 : 0}
          transparent
          opacity={active ? 0.85 : 0.72}
        />
      </mesh>
    </group>
  );
}

function SmartFarmRig({ isOn, pumps, activeTank }: SmartFarmTwinSceneProps) {
  const hasPump = pumps.some(Boolean);
  const activeBucket = activeTank ? Math.min(Math.max(activeTank, 1), 3) : null;
  const controllerActive = isOn && !hasPump && !activeBucket;
  const sensorActive = isOn && !hasPump;
  const pipeFlowActive = isOn && (hasPump || !!activeBucket);

  return (
    <group position={[0, -0.75, 0]} rotation={[0.06, -0.55, 0]}>
      <mesh position={[0.4, -0.95, 0.12]} receiveShadow>
        <boxGeometry args={[5.8, 0.22, 4.4]} />
        <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.3} />
      </mesh>

      {[[-1.2, 0.65, -0.9], [1.55, 0.65, -0.9], [-1.2, 0.65, 1.05], [1.55, 0.65, 1.05]].map((post, index) => (
        <mesh key={index} position={post as Vec3} castShadow receiveShadow>
          <boxGeometry args={[0.12, 3.2, 0.12]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.72} roughness={0.2} />
        </mesh>
      ))}

      <mesh position={[0.18, 2.1, 0.06]} castShadow receiveShadow>
        <boxGeometry args={[3.5, 0.12, 2.2]} />
        <meshStandardMaterial color="#d8dee8" metalness={0.72} roughness={0.18} />
      </mesh>

      <mesh position={[0.15, 0.14, 0.15]} castShadow receiveShadow>
        <boxGeometry args={[2.95, 0.12, 1.74]} />
        <meshStandardMaterial color="#ced7e2" metalness={0.66} roughness={0.22} />
      </mesh>

      <mesh position={[0.08, 1.48, 0.12]} castShadow receiveShadow>
        <boxGeometry args={[2.05, 0.54, 1.28]} />
        <meshStandardMaterial color="#09090b" metalness={0.34} roughness={0.46} />
      </mesh>

      <mesh position={[0.08, 1.88, 0.12]} castShadow receiveShadow>
        <boxGeometry args={[1.98, 0.08, 1.2]} />
        <meshStandardMaterial color="#111827" metalness={0.26} roughness={0.32} />
      </mesh>

      <group position={[-1.84, 1.74, -0.28]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.62, 1.06, 0.46]} />
          <meshStandardMaterial
            color="#e2e8f0"
            emissive={controllerActive ? "#22d3ee" : "#000000"}
            emissiveIntensity={controllerActive ? 0.65 : 0}
            metalness={0.28}
            roughness={0.24}
          />
        </mesh>
        <mesh position={[-0.31, 0.1, 0]}>
          <boxGeometry args={[0.06, 0.14, 0.14]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
      </group>

      <PumpCore active={hasPump} position={[-0.72, -0.05, 1.52]} />

      <Bucket active={false} position={[-1.9, -0.2, 1.55]} />
      <Bucket active={activeBucket === 1} position={[-0.72, -0.18, 1.0]} />
      <Bucket active={activeBucket === 2} position={[0.28, -0.18, 1.0]} />
      <Bucket active={activeBucket === 3} position={[1.3, -0.18, 1.0]} />

      <FlowBeam active={sensorActive} color="#22d3ee" start={[-1.64, 1.58, -0.12]} end={[-0.22, 1.68, 0.12]} />
      <FlowBeam active={pipeFlowActive} color="#34d399" start={[-0.72, -0.06, 1.17]} end={[1.32, -0.06, 1.17]} />
      <FlowBeam active={pipeFlowActive} color="#34d399" start={[-1.9, -0.02, 1.48]} end={[-0.95, -0.02, 1.48]} />

      <mesh position={[-1.34, -0.1, 1.48]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <torusGeometry args={[0.09, 0.018, 10, 24]} />
        <meshStandardMaterial color={pipeFlowActive ? "#34d399" : "#64748b"} emissive={pipeFlowActive ? "#34d399" : "#000000"} emissiveIntensity={pipeFlowActive ? 1.2 : 0} />
      </mesh>

      <PulseNode active={sensorActive} color="#22d3ee" position={[-0.12, 2.28, 0.18]} />
      <PulseNode active={controllerActive} color="#22d3ee" position={[-1.54, 2.34, -0.16]} />
      <PulseNode active={hasPump} color="#34d399" position={[-0.72, 0.44, 1.52]} />
      <PulseNode active={activeBucket === 1} color="#34d399" position={[-0.72, 0.62, 1.0]} />
      <PulseNode active={activeBucket === 2} color="#34d399" position={[0.28, 0.62, 1.0]} />
      <PulseNode active={activeBucket === 3} color="#34d399" position={[1.3, 0.62, 1.0]} />

      <SceneLabel active={controllerActive} position={[-1.9, 2.55, -0.35]} text="Controller" />
      <SceneLabel active={sensorActive} position={[-0.08, 2.62, 0.32]} text="Sensor" />
      <SceneLabel active={hasPump} position={[-0.74, 0.8, 1.88]} text="Pump" />
      <SceneLabel active={activeBucket === 1} position={[-0.72, 0.95, 1.48]} text="Tank A" />
      <SceneLabel active={activeBucket === 2} position={[0.28, 0.95, 1.48]} text="Tank B" />
      <SceneLabel active={activeBucket === 3} position={[1.3, 0.95, 1.48]} text="Tank C" />
    </group>
  );
}

export function SmartFarmTwinScene(props: SmartFarmTwinSceneProps) {
  return (
    <div className="h-full min-h-[320px] w-full overflow-hidden rounded-[1.8rem] bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_32%),linear-gradient(180deg,rgba(2,6,23,0.98),rgba(15,23,42,0.96))]">
      <Canvas shadows camera={{ position: [6.8, 4.2, 7.4], fov: 33 }}>
        <color attach="background" args={["#020617"]} />
        <fog attach="fog" args={["#020617", 8, 18]} />
        <ambientLight intensity={0.8} color="#dbeafe" />
        <hemisphereLight intensity={0.9} color="#e0f2fe" groundColor="#020617" />
        <spotLight
          position={[6, 9, 5]}
          angle={0.35}
          penumbra={0.55}
          intensity={26}
          color="#e0fbff"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-5, 3, 4]} intensity={8} color="#22d3ee" />
        <pointLight position={[3, 2, 5]} intensity={5} color="#34d399" />
        <Suspense fallback={null}>
          <SmartFarmRig {...props} />
          <ContactShadows
            position={[0, -1.78, 0]}
            scale={10}
            blur={2.6}
            opacity={0.5}
            far={6}
            color="#0f172a"
          />
        </Suspense>
        <OrbitControls
          enablePan={false}
          minDistance={6}
          maxDistance={10}
          minPolarAngle={0.9}
          maxPolarAngle={1.45}
          autoRotate
          autoRotateSpeed={0.7}
        />
      </Canvas>
    </div>
  );
}
