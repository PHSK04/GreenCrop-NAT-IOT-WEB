import { ContactShadows, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type Props = { progress: number; activeIndex: number };
type Vec3 = [number, number, number];

const aluminium = "#e6eaeb";
const edge = "#aab3b7";
const white = "#f7f8f5";
const dark = "#202729";
const water = "#72d7e8";
const green = "#a5c85c";

function Joint({ position }: { position: Vec3 }) {
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={[0.145, 0.145, 0.145]} />
      <meshStandardMaterial color="#343b3d" metalness={0.42} roughness={0.28} />
    </mesh>
  );
}

function Bar({ position, scale, color = aluminium }: { position: Vec3; scale: Vec3; color?: string }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={scale} />
      <meshStandardMaterial color={color} metalness={0.68} roughness={0.25} />
    </mesh>
  );
}

function Pipe({ points, active = false }: { points: Vec3[]; active?: boolean }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point))), [points]);
  const bead = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!active || !bead.current) return;
    bead.current.position.copy(curve.getPoint((clock.elapsedTime * 0.22) % 1));
  });
  return (
    <>
      <mesh castShadow>
        <tubeGeometry args={[curve, 52, 0.065, 12, false]} />
        <meshStandardMaterial color="#edf4f2" roughness={0.18} />
      </mesh>
      {active && (
        <mesh ref={bead}>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={2} />
        </mesh>
      )}
    </>
  );
}

function Valve({ position, color = "#ef4444", rotation = [0, 0, 0] }: { position: Vec3; color?: string; rotation?: Vec3 }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow><cylinderGeometry args={[0.095, 0.095, 0.13, 18]} /><meshStandardMaterial color="#e9eeee" roughness={0.22} /></mesh>
      <mesh position={[0, 0.12, 0]} castShadow><cylinderGeometry args={[0.025, 0.025, 0.17, 10]} /><meshStandardMaterial color="#6b7476" metalness={0.5} /></mesh>
      <mesh position={[0, 0.22, 0]} castShadow><boxGeometry args={[0.3, 0.055, 0.07]} /><meshStandardMaterial color={color} roughness={0.3} /></mesh>
    </group>
  );
}

function Pump({ position, rotation = [0, 0, 0], active }: { position: Vec3; rotation?: Vec3; active: boolean }) {
  const rotor = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (active && rotor.current) rotor.current.rotation.z += delta * 4;
  });
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.19, 0.19, 0.3, 28]} />
        <meshStandardMaterial color={dark} metalness={0.52} roughness={0.28} />
      </mesh>
      <mesh ref={rotor} position={[0, 0, 0.17]}>
        <torusGeometry args={[0.1, 0.028, 10, 28]} />
        <meshStandardMaterial color="#dce2e2" metalness={0.7} roughness={0.2} emissive={active ? "#86efac" : "#000"} emissiveIntensity={active ? 0.4 : 0} />
      </mesh>
      <mesh position={[0, 0.24, 0]} castShadow>
        <boxGeometry args={[0.28, 0.18, 0.24]} />
        <meshStandardMaterial color="#313a3c" metalness={0.45} roughness={0.32} />
      </mesh>
      <mesh position={[-0.22, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.1, 0.1, 0.19, 18]} /><meshStandardMaterial color="#ecefed" roughness={0.24} /></mesh>
      <mesh position={[0.22, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.1, 0.1, 0.19, 18]} /><meshStandardMaterial color="#ecefed" roughness={0.24} /></mesh>
    </group>
  );
}

function Tank({ x, level, sensorActive }: { x: number; level: number; sensorActive: boolean }) {
  const h = 0.12 + level * 0.78;
  return (
    <group position={[x, -1.55, 0]}>
      <RoundedBox args={[1.42, 0.12, 1.12]} radius={0.05} smoothness={3} position={[0, 0, 0]} castShadow><meshStandardMaterial color="#d7dcda" roughness={0.35} /></RoundedBox>
      <RoundedBox args={[0.1, 1.15, 1.12]} radius={0.04} smoothness={3} position={[-0.66, 0.62, 0]} castShadow><meshStandardMaterial color={white} roughness={0.24} /></RoundedBox>
      <RoundedBox args={[0.1, 1.15, 1.12]} radius={0.04} smoothness={3} position={[0.66, 0.62, 0]} castShadow><meshStandardMaterial color={white} roughness={0.24} /></RoundedBox>
      <RoundedBox args={[1.22, 1.15, 0.1]} radius={0.04} smoothness={3} position={[0, 0.62, -0.51]} castShadow><meshStandardMaterial color={white} roughness={0.24} /></RoundedBox>
      <RoundedBox args={[1.22, 1.15, 0.1]} radius={0.04} smoothness={3} position={[0, 0.62, 0.51]} castShadow><meshStandardMaterial color={white} roughness={0.24} /></RoundedBox>
      <mesh position={[0, 0.1 + h / 2, 0]}>
        <boxGeometry args={[1.16, h, 0.92]} />
        <meshPhysicalMaterial color={water} transparent opacity={0.68} roughness={0.08} transmission={0.12} />
      </mesh>
      <mesh position={[0, 0.13 + h, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.14, 0.9, 8, 8]} />
        <meshPhysicalMaterial color="#9ce6ef" transparent opacity={0.9} roughness={0.08} />
      </mesh>
      <group position={[0.4, 1.14, 0.22]}>
        <mesh><boxGeometry args={[0.34, 0.11, 0.3]} /><meshStandardMaterial color="#f3f3ef" /></mesh>
        <mesh position={[0, 0.07, 0]}><boxGeometry args={[0.14, 0.05, 0.12]} /><meshStandardMaterial color="#ef4444" emissive={sensorActive ? "#ef4444" : "#000"} emissiveIntensity={sensorActive ? 0.8 : 0} /></mesh>
      </group>
      <mesh position={[0.28, 0.68, 0.33]}><cylinderGeometry args={[0.025, 0.025, 0.85, 10]} /><meshStandardMaterial color="#283236" /></mesh>
    </group>
  );
}

function GrowBed({ active }: { active: boolean }) {
  return (
    <group position={[0, 0.78, 0]}>
      <RoundedBox args={[4.5, 0.13, 1.08]} radius={0.05} smoothness={3} position={[0, -0.45, 0]} castShadow><meshStandardMaterial color="#d9ddda" roughness={0.3} /></RoundedBox>
      <RoundedBox args={[4.5, 0.78, 0.1]} radius={0.04} smoothness={3} position={[0, 0, -0.49]} castShadow><meshStandardMaterial color={white} roughness={0.22} /></RoundedBox>
      <RoundedBox args={[4.5, 0.78, 0.1]} radius={0.04} smoothness={3} position={[0, 0, 0.49]} castShadow><meshStandardMaterial color={white} roughness={0.22} /></RoundedBox>
      <RoundedBox args={[0.1, 0.78, 0.9]} radius={0.04} smoothness={3} position={[-2.2, 0, 0]} castShadow><meshStandardMaterial color={white} roughness={0.22} /></RoundedBox>
      <RoundedBox args={[0.1, 0.78, 0.9]} radius={0.04} smoothness={3} position={[2.2, 0, 0]} castShadow><meshStandardMaterial color={white} roughness={0.22} /></RoundedBox>
      <mesh position={[0, 0.24, 0]}>
        <boxGeometry args={[4.25, 0.08, 0.82]} />
        <meshStandardMaterial color={green} roughness={0.82} emissive={active ? "#365314" : "#000"} emissiveIntensity={active ? 0.18 : 0} />
      </mesh>
      {Array.from({ length: 18 }).map((_, index) => {
        const x = -1.9 + (index % 9) * 0.47;
        const z = -0.18 + Math.floor(index / 9) * 0.36;
        return (
          <group key={index} position={[x, 0.34, z]} rotation={[0, index * 1.7, 0]}>
            <mesh position={[-0.035, 0.018, 0]} rotation={[0.1, 0, -0.45]}><sphereGeometry args={[0.06, 12, 8]} /><meshStandardMaterial color="#6f9c38" roughness={0.78} /></mesh>
            <mesh position={[0.04, 0.026, 0]} rotation={[-0.1, 0, 0.5]}><sphereGeometry args={[0.065, 12, 8]} /><meshStandardMaterial color="#8bb94b" roughness={0.74} /></mesh>
          </group>
        );
      })}
      <group position={[1.83, 0.45, 0.35]}>
        <mesh><boxGeometry args={[0.35, 0.1, 0.3]} /><meshStandardMaterial color="#f3f3ef" /></mesh>
        <mesh position={[0, 0.07, 0]}><boxGeometry args={[0.13, 0.05, 0.1]} /><meshStandardMaterial color="#ef4444" /></mesh>
      </group>
    </group>
  );
}

function Wheel({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.12, 0.12, 0.1, 18]} /><meshStandardMaterial color="#22292b" roughness={0.5} /></mesh>
      <mesh position={[0, 0.17, 0]}><boxGeometry args={[0.08, 0.28, 0.08]} /><meshStandardMaterial color={edge} metalness={0.75} roughness={0.22} /></mesh>
    </group>
  );
}

function Machine({ progress, activeIndex }: Props) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const target = -0.08 + Math.sin(progress * Math.PI * 2) * 0.18;
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, target, 4, delta);
    group.current.position.y = Math.sin(clock.elapsedTime * 0.55) * 0.025;
  });
  const waterActive = activeIndex === 1;
  const sensorsActive = activeIndex === 2;

  return (
    <group ref={group} position={[0, 0.1, 0]}>
      <group>
        {[-2.5, 2.5].flatMap((x) => [-0.72, 0.72].map((z) => <Bar key={`post-${x}-${z}`} position={[x, 0, z]} scale={[0.1, 5.45, 0.1]} />))}
        {[-0.72, 0.72].map((z) => <Bar key={`base-${z}`} position={[0, -2.68, z]} scale={[5.1, 0.1, 0.1]} />)}
        {[-0.72, 0.72].map((z) => <Bar key={`top-${z}`} position={[0, 2.68, z]} scale={[5.1, 0.1, 0.1]} />)}
        {[-2.5, 2.5].map((x) => <Bar key={`side-${x}`} position={[x, 2.68, 0]} scale={[0.1, 0.1, 1.55]} />)}
        {[-1.7, -0.85, 0, 0.85, 1.7].map((x) => <Bar key={`roof-${x}`} position={[x, 2.65, 0]} scale={[0.07, 0.07, 1.42]} />)}
        <Bar position={[0, 0.05, -0.7]} scale={[5, 0.08, 0.08]} />
        {[-2.5, 2.5].flatMap((x) => [-0.72, 0.72].flatMap((z) => [-2.68, 2.68].map((y) => <Joint key={`joint-${x}-${y}-${z}`} position={[x, y, z]} />)))}
      </group>

      <group position={[0, 2.43, 0]}>
        {[-1.65, -0.82, 0, 0.82, 1.65].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh castShadow><boxGeometry args={[0.62, 0.055, 0.08]} /><meshStandardMaterial color="#f5f3df" emissive="#fff5c2" emissiveIntensity={0.8} /></mesh>
            <pointLight position={[0, -0.1, 0]} color="#fff6d5" intensity={0.14} distance={1.8} />
          </group>
        ))}
      </group>

      <GrowBed active={waterActive} />
      <Tank x={-1.25} level={sensorsActive ? 0.72 : 0.58} sensorActive={sensorsActive} />
      <Tank x={1.18} level={sensorsActive ? 0.64 : 0.5} sensorActive={sensorsActive} />

      <Pump position={[0, -1.78, 0.52]} active={waterActive} />
      <Pump position={[2.12, 0.13, 0.51]} active={waterActive} />
      <Pump position={[0.22, 0.05, 0.52]} active={waterActive} />

      <Pipe points={[[-0.56, -1.65, 0.48], [-0.2, -1.65, 0.48], [0.5, -1.65, 0.48]]} active={waterActive} />
      <Pipe points={[[-1.25, -0.97, 0.42], [-1.25, -0.3, 0.42], [-2.05, -0.3, 0.42], [-2.05, 0.95, 0.42]]} active={waterActive} />
      <Pipe points={[[2.04, -0.96, 0.42], [2.04, 0.05, 0.42], [2.04, 0.58, 0.42]]} active={waterActive} />
      <Pipe points={[[2.04, 0.58, 0.42], [1.4, 0.58, 0.42], [1.4, 0.4, 0.42]]} active={waterActive} />
      <Pipe points={[[-2.05, 0.95, 0.42], [-1.65, 0.95, 0.42], [-1.65, 0.52, 0.42]]} active={waterActive} />

      <Valve position={[-1.25, -0.92, 0.44]} color="#ef4444" />
      <Valve position={[1.18, -0.92, 0.44]} color="#ef4444" />
      <Valve position={[-1.25, -1.66, 0.49]} color="#2563eb" rotation={[0, 0, Math.PI / 2]} />

      <group position={[2.22, -0.88, 0.03]}>
        <RoundedBox args={[0.62, 1.62, 0.55]} radius={0.05} smoothness={3} castShadow><meshStandardMaterial color="#dce1df" metalness={0.35} roughness={0.28} /></RoundedBox>
        <mesh position={[0, 0.25, 0.285]}><boxGeometry args={[0.42, 0.28, 0.02]} /><meshStandardMaterial color="#1d2928" emissive={sensorsActive ? "#16a34a" : "#000"} emissiveIntensity={sensorsActive ? 0.5 : 0} /></mesh>
        <mesh position={[-0.19, 0.68, 0.29]}><sphereGeometry args={[0.035, 12, 12]} /><meshStandardMaterial color={sensorsActive ? "#22c55e" : "#ef4444"} emissive={sensorsActive ? "#22c55e" : "#ef4444"} emissiveIntensity={1.5} /></mesh>
        <mesh position={[0.08, 0.68, 0.29]}><sphereGeometry args={[0.035, 12, 12]} /><meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.7} /></mesh>
        <mesh position={[0.2, -0.46, 0.29]}><boxGeometry args={[0.14, 0.1, 0.03]} /><meshStandardMaterial color="#64748b" metalness={0.4} /></mesh>
      </group>

      <Pipe points={[[2.1, -1.55, -0.1], [2.45, -1.55, -0.1], [2.45, -0.6, -0.1]]} />

      {[-2.5, 2.5].flatMap((x) => [-0.72, 0.72].map((z) => <Wheel key={`${x}-${z}`} position={[x, -2.9, z]} />))}
    </group>
  );
}

export function ProductMachine3D(props: Props) {
  return (
    <Canvas shadows dpr={[1, 1.6]} camera={{ position: [6.6, 3.5, 9.3], fov: 32 }} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={0.65} />
      <hemisphereLight color="#ffffff" groundColor="#6f8174" intensity={0.9} />
      <directionalLight position={[5, 9, 7]} intensity={1.8} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-5, 3, -4]} intensity={0.55} color="#bde8ff" />
      <spotLight position={[0, 7, 2]} intensity={0.7} angle={0.65} penumbra={0.7} />
      <Machine {...props} />
      <ContactShadows position={[0, -2.94, 0]} opacity={0.2} scale={9} blur={2.8} far={5} />
    </Canvas>
  );
}
