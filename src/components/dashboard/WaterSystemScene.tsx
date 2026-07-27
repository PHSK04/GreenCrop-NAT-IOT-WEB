import { ContactShadows, OrbitControls, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type Props = {
  liveSignal: boolean;
  pump1On: boolean;
  pump2On: boolean;
  wls1: boolean;
  wls2: boolean;
  wls3: boolean;
  alarm: boolean;
};

const metal = "#d9e0e7";
const pipe = "#f8fafc";
const water = "#38bdf8";
const green = "#22c55e";
const red = "#ef4444";

function Beam({ position, scale }: { position: [number, number, number]; scale: [number, number, number] }) {
  return <mesh position={position} castShadow receiveShadow><boxGeometry args={scale} /><meshStandardMaterial color={metal} metalness={0.7} roughness={0.28} /></mesh>;
}

function Pipe({ points, active, color = water }: { points: [number, number, number][]; active: boolean; color?: string }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point))), [points]);
  return <>
    <mesh castShadow><tubeGeometry args={[curve, 40, 0.11, 10, false]} /><meshStandardMaterial color={pipe} metalness={0.1} roughness={0.25} /></mesh>
    {active && <Flow curve={curve} color={color} />}
  </>;
}

function Flow({ curve, color }: { curve: THREE.Curve<THREE.Vector3>; color: string }) {
  const bead = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const point = curve.getPoint((clock.getElapsedTime() * 0.28) % 1);
    bead.current?.position.copy(point);
  });
  return <mesh ref={bead}><sphereGeometry args={[0.14, 16, 16]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.3} /></mesh>;
}

function Pump({ position, active, label }: { position: [number, number, number]; active: boolean; label: string }) {
  const rotor = useRef<THREE.Group>(null);
  useFrame((_, delta) => { if (active && rotor.current) rotor.current.rotation.x += delta * 11; });
  return <group position={position}>
    <mesh rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.32, 0.32, 0.46, 24]} /><meshStandardMaterial color="#111827" metalness={0.45} roughness={0.3} emissive={active ? green : "#000000"} emissiveIntensity={active ? 0.7 : 0} /></mesh>
    <group ref={rotor} rotation={[0, Math.PI / 2, 0]}>
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((rotation) => <mesh key={rotation} rotation={[0, 0, rotation]} position={[0.28, 0, 0]}><boxGeometry args={[0.18, 0.1, 0.05]} /><meshStandardMaterial color={active ? "#a7f3d0" : "#cbd5e1"} /></mesh>)}
    </group>
    <mesh position={[0, 0.33, 0]}><boxGeometry args={[0.28, 0.18, 0.24]} /><meshStandardMaterial color="#1e293b" /></mesh>
  </group>;
}

function Tank({ x, level, sensorOn, label }: { x: number; level: number; sensorOn: boolean; label: string }) {
  const waterHeight = 0.08 + level * 1.18;
  const indicator = sensorOn ? green : red;
  return <group position={[x, 0, 0]}>
    <RoundedBox args={[2.18, 0.16, 1.78]} radius={0.08} smoothness={4} position={[0, 0.08, 0]} castShadow><meshStandardMaterial color="#e8edf2" roughness={0.28} /></RoundedBox>
    <RoundedBox args={[0.15, 1.65, 1.78]} radius={0.06} smoothness={4} position={[-1.02, 0.88, 0]} castShadow><meshStandardMaterial color="#f7f5ef" roughness={0.25} /></RoundedBox>
    <RoundedBox args={[0.15, 1.65, 1.78]} radius={0.06} smoothness={4} position={[1.02, 0.88, 0]} castShadow><meshStandardMaterial color="#f7f5ef" roughness={0.25} /></RoundedBox>
    <RoundedBox args={[1.9, 1.65, 0.15]} radius={0.06} smoothness={4} position={[0, 0.88, -0.82]} castShadow><meshStandardMaterial color="#f7f5ef" roughness={0.25} /></RoundedBox>
    <RoundedBox args={[1.9, 1.65, 0.15]} radius={0.06} smoothness={4} position={[0, 0.88, 0.82]} castShadow><meshStandardMaterial color="#f7f5ef" roughness={0.25} /></RoundedBox>
    <mesh position={[0, 0.17 + waterHeight / 2, 0]}><boxGeometry args={[1.84, waterHeight, 1.48]} /><meshPhysicalMaterial color={water} transparent opacity={0.7} roughness={0.06} transmission={0.08} /></mesh>
    <mesh position={[0, 0.19 + waterHeight, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.82, 1.46, 12, 12]} /><meshPhysicalMaterial color="#8be3f5" transparent opacity={0.82} roughness={0.08} /></mesh>
    <mesh position={[0.78, 1.35, 0.73]}><sphereGeometry args={[0.1, 16, 16]} /><meshStandardMaterial color={indicator} emissive={indicator} emissiveIntensity={sensorOn ? 1 : 0.45} /></mesh>
    <mesh position={[0.65, 1.68, 0]}><cylinderGeometry args={[0.07, 0.07, 1.2, 12]} /><meshStandardMaterial color="#334155" /></mesh>
    <mesh position={[0.65, 1.1, 0]}><cylinderGeometry args={[0.14, 0.14, 0.1, 16]} /><meshStandardMaterial color={indicator} emissive={indicator} emissiveIntensity={0.55} /></mesh>
  </group>;
}

function GrowBed({ level, sensorOn, active }: { level: number; sensorOn: boolean; active: boolean }) {
  const indicator = sensorOn ? green : red;
  return <group position={[0, 4.05, 0]}>
    <RoundedBox args={[6.35, 0.18, 1.72]} radius={0.06} smoothness={4} position={[0, -0.27, 0]} castShadow><meshStandardMaterial color="#eeeae1" roughness={0.26} /></RoundedBox>
    <RoundedBox args={[6.35, 0.7, 0.15]} radius={0.06} smoothness={4} position={[0, 0, -0.8]} castShadow><meshStandardMaterial color="#f7f5ef" roughness={0.24} /></RoundedBox>
    <RoundedBox args={[6.35, 0.7, 0.15]} radius={0.06} smoothness={4} position={[0, 0, 0.8]} castShadow><meshStandardMaterial color="#f7f5ef" roughness={0.24} /></RoundedBox>
    <RoundedBox args={[0.15, 0.7, 1.48]} radius={0.06} smoothness={4} position={[-3.1, 0, 0]} castShadow><meshStandardMaterial color="#f7f5ef" roughness={0.24} /></RoundedBox>
    <RoundedBox args={[0.15, 0.7, 1.48]} radius={0.06} smoothness={4} position={[3.1, 0, 0]} castShadow><meshStandardMaterial color="#f7f5ef" roughness={0.24} /></RoundedBox>
    <mesh position={[0, 0.12, 0]}><boxGeometry args={[5.98, 0.12, 1.42]} /><meshPhysicalMaterial color="#81b95a" transparent opacity={0.86} roughness={0.22} /></mesh>
    {Array.from({ length: 21 }).map((_, index) => <mesh key={index} position={[-2.6 + (index % 7) * 0.86, 0.46, -0.34 + Math.floor(index / 7) * 0.34]}><sphereGeometry args={[0.15, 14, 14]} /><meshStandardMaterial color="#78b84d" roughness={0.55} emissive={active ? "#365314" : "#000000"} emissiveIntensity={active ? 0.22 : 0} /></mesh>)}
    <mesh position={[2.84, 0.42, 0.64]}><sphereGeometry args={[0.1, 16, 16]} /><meshStandardMaterial color={indicator} emissive={indicator} emissiveIntensity={sensorOn ? 1 : 0.45} /></mesh>
  </group>;
}

function Scene({ liveSignal, pump1On, pump2On, wls1, wls2, wls3, alarm }: Props) {
  const p1 = liveSignal && pump1On;
  const p2 = liveSignal && pump2On;
  const low1 = liveSignal ? (wls1 ? 0.58 : 0.18) : 0.16;
  const low2 = liveSignal ? (wls2 ? 0.76 : 0.18) : 0.1;
  const bed = liveSignal ? (wls3 ? 0.48 : 0.15) : 0.15;
  return <>
    <color attach="background" args={["#f8fbff"]} />
    <ambientLight intensity={1.7} />
    <directionalLight position={[6, 10, 7]} intensity={2.3} castShadow />
    <directionalLight position={[-6, 5, -5]} intensity={1} />
    <group position={[0, -1.25, 0]}>
      {[-0.95, 0.95].map((z) => <Beam key={`base-${z}`} position={[0, 0, z]} scale={[7.2, 0.16, 0.16]} />)}
      {[-3.45, 3.45].flatMap((x) => [-0.95, 0.95].map((z) => <Beam key={`${x}-${z}`} position={[x, 3.2, z]} scale={[0.2, 6.5, 0.2]} />))}
      {[-0.95, 0.95].map((z) => <Beam key={`top-${z}`} position={[0, 6.35, z]} scale={[7.05, 0.16, 0.16]} />)}
      {[-3.45, 3.45].map((x) => <Beam key={`top-side-${x}`} position={[x, 6.35, 0]} scale={[0.16, 0.16, 2.05]} />)}
      {[-2.5, -0.8, 0.8, 2.5].map((x) => <group key={x} position={[x, 6.05, 0]}><mesh><boxGeometry args={[1.12, 0.1, 0.12]} /><meshStandardMaterial color="#fff7d6" emissive="#fff3b0" emissiveIntensity={liveSignal ? 2.6 : 0.3} /></mesh><pointLight color="#fff4bc" intensity={liveSignal ? 0.45 : 0} distance={3} /></group>)}
      <GrowBed level={bed} sensorOn={liveSignal && wls3} active={p2} />
      <Tank x={-2.05} level={low1} sensorOn={liveSignal && wls1} label="Tank 1" />
      <Tank x={2.05} level={low2} sensorOn={liveSignal && wls2} label="Tank 2" />
      <Pump position={[0, 0.82, 0.12]} active={p1} label="P1" />
      <Pump position={[3.22, 2.42, 0.08]} active={p2} label="P2" />
      <Pump position={[0, 3.05, 0.08]} active={p2} label="P3" />
      <Pipe points={[[-1.0, 0.9, 0], [-0.45, 0.9, 0], [0.45, 0.9, 0], [1.0, 0.9, 0]]} active={p1} />
      <Pipe points={[[2.9, 1.25, 0], [3.35, 1.25, 0], [3.35, 3.6, 0], [2.8, 3.6, 0]]} active={p2} color={green} />
      <Pipe points={[[2.8, 3.6, 0], [1.25, 3.6, 0], [0, 3.6, 0], [-1.4, 3.6, 0]]} active={p2} color={green} />
      <mesh position={[3.18, 1.15, -0.88]} castShadow><boxGeometry args={[0.56, 1.2, 0.36]} /><meshStandardMaterial color="#e2e8f0" metalness={0.2} roughness={0.35} /></mesh>
      {[-3.45, 3.45].flatMap((x) => [-0.95, 0.95].map((z) => <group key={`wheel-${x}-${z}`} position={[x, -0.18, z]}><mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.16, 0.16, 0.12, 18]} /><meshStandardMaterial color="#1f2937" roughness={0.45} /></mesh><mesh position={[0, 0.16, 0]}><boxGeometry args={[0.12, 0.28, 0.12]} /><meshStandardMaterial color="#94a3b8" metalness={0.75} roughness={0.22} /></mesh></group>))}
      {alarm && <pointLight position={[3.35, 2.1, -0.9]} color={red} intensity={3} distance={2} />}
    </group>
    <ContactShadows position={[0, -1.5, 0]} opacity={0.22} scale={14} blur={2.8} far={5} />
    <OrbitControls enablePan={false} minDistance={9} maxDistance={15} target={[0, 2.05, 0]} minPolarAngle={Math.PI / 3.4} maxPolarAngle={Math.PI / 1.75} />
  </>;
}

export function WaterSystemScene(props: Props) {
  return <div style={{ height: 590, minHeight: 460, width: "100%" }}><Canvas shadows camera={{ position: [0, 3.7, 12.6], fov: 36 }} dpr={[1, 1.5]}><Scene {...props} /></Canvas></div>;
}
