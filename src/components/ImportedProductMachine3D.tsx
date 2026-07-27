import { ContactShadows, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

type Props = { progress: number; activeIndex: number };

const MODEL_URL = `${import.meta.env.BASE_URL}models/greencrop-nat-realistic.glb`;

function FlowBead({ active, offset }: { active: boolean; offset: number }) {
  const bead = useRef<THREE.Mesh>(null);
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.42, 0.25, 0.48),
    new THREE.Vector3(-0.42, 0.78, 0.48),
    new THREE.Vector3(-0.62, 0.78, 0.48),
    new THREE.Vector3(-0.62, 1.08, 0.48),
    new THREE.Vector3(0.58, 1.08, 0.48),
    new THREE.Vector3(0.58, 0.52, 0.48),
  ]), []);
  useFrame(({ clock }) => {
    if (!bead.current) return;
    bead.current.visible = active;
    if (active) bead.current.position.copy(curve.getPoint((clock.elapsedTime * 0.18 + offset) % 1));
  });
  return (
    <mesh ref={bead}>
      <sphereGeometry args={[0.025, 14, 14]} />
      <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={2.5} />
    </mesh>
  );
}

function ImportedMachine({ progress, activeIndex }: Props) {
  const gltf = useGLTF(MODEL_URL);
  const root = useRef<THREE.Group>(null);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  useEffect(() => {
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      const cleaned = object.geometry.clone();
      cleaned.deleteAttribute("normal");
      cleaned.deleteAttribute("tangent");
      cleaned.deleteAttribute("uv");
      const welded = mergeVertices(cleaned, 0.0015);
      welded.computeVertexNormals();
      object.geometry = welded;

      const position = welded.getAttribute("position");
      const index = welded.getIndex();
      const parent = new Int32Array(position.count);
      for (let vertex = 0; vertex < parent.length; vertex += 1) parent[vertex] = vertex;
      const find = (value: number): number => {
        let rootIndex = value;
        while (parent[rootIndex] !== rootIndex) rootIndex = parent[rootIndex];
        while (parent[value] !== value) {
          const next = parent[value];
          parent[value] = rootIndex;
          value = next;
        }
        return rootIndex;
      };
      const union = (a: number, b: number) => {
        const rootA = find(a);
        const rootB = find(b);
        if (rootA !== rootB) parent[rootB] = rootA;
      };
      if (index) {
        for (let offset = 0; offset < index.count; offset += 3) {
          const a = index.getX(offset);
          const b = index.getX(offset + 1);
          const c = index.getX(offset + 2);
          union(a, b);
          union(b, c);
        }
      }

      welded.computeBoundingBox();
      const modelBox = welded.boundingBox!;
      const modelSize = modelBox.getSize(new THREE.Vector3());
      const overall = Math.max(modelSize.x, modelSize.y, modelSize.z);
      const partBounds = new Map<number, THREE.Box3>();
      const point = new THREE.Vector3();
      for (let vertex = 0; vertex < position.count; vertex += 1) {
        point.fromBufferAttribute(position, vertex);
        const rootIndex = find(vertex);
        const bounds = partBounds.get(rootIndex) ?? new THREE.Box3();
        bounds.expandByPoint(point);
        partBounds.set(rootIndex, bounds);
      }

      const colors = new Float32Array(position.count * 3);
      const silver = new THREE.Color("#b9c7c5");
      const white = new THREE.Color("#e8ebe5");
      const graphite = new THREE.Color("#25302f");
      const warmLight = new THREE.Color("#fff0b5");
      const partSize = new THREE.Vector3();
      const partCenter = new THREE.Vector3();
      for (let vertex = 0; vertex < position.count; vertex += 1) {
        const bounds = partBounds.get(find(vertex))!;
        bounds.getSize(partSize);
        bounds.getCenter(partCenter);
        const dimensions = [partSize.x, partSize.y, partSize.z].sort((a, b) => b - a);
        const normalizedHeight = (partCenter.y - modelBox.min.y) / Math.max(modelSize.y, 0.0001);
        let color = silver;
        if (dimensions[1] > overall * 0.11 && dimensions[2] > overall * 0.055) color = white;
        if (dimensions[0] < overall * 0.22 && dimensions[1] > overall * 0.025 && normalizedHeight < 0.72) color = graphite;
        if (normalizedHeight > 0.86 && dimensions[0] > overall * 0.16 && dimensions[1] < overall * 0.055) color = warmLight;
        color.toArray(colors, vertex * 3);
      }
      welded.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      object.material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        metalness: 0.48,
        roughness: 0.3,
        side: THREE.DoubleSide,
      });
    });
  }, [scene]);

  useFrame(({ clock }, delta) => {
    if (!root.current) return;
    const targetY = -0.14 + Math.sin(progress * Math.PI * 2) * 0.24;
    const targetX = activeIndex === 2 ? -0.045 : 0.015;
    root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y, targetY, 4.2, delta);
    root.current.rotation.x = THREE.MathUtils.damp(root.current.rotation.x, targetX, 4.2, delta);
    root.current.position.y = -0.68 + Math.sin(clock.elapsedTime * 0.55) * 0.01;
  });

  const waterActive = activeIndex === 1;
  const sensorActive = activeIndex === 2;

  return (
    <group ref={root} position={[0, -0.68, 0]} scale={0.82}>
      <primitive object={scene} />

      {[0, 0.24, 0.48, 0.72].map((offset) => <FlowBead key={offset} active={waterActive} offset={offset} />)}

      <group position={[0.66, 0.54, 0.43]}>
        <mesh><sphereGeometry args={[0.025, 16, 16]} /><meshStandardMaterial color={sensorActive ? "#4ade80" : "#ef4444"} emissive={sensorActive ? "#22c55e" : "#ef4444"} emissiveIntensity={2.5} /></mesh>
        {sensorActive && <pointLight color="#4ade80" intensity={0.45} distance={0.45} />}
      </group>
    </group>
  );
}

export function ImportedProductMachine3D(props: Props) {
  return (
    <Canvas shadows dpr={[1, 1.5]} camera={{ position: [2.9, 2.05, 4.9], fov: 31 }} gl={{ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
      <ambientLight intensity={1.15} />
      <hemisphereLight color="#ffffff" groundColor="#839188" intensity={0.8} />
      <directionalLight position={[4, 7, 6]} intensity={0.85} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-4, 2, -3]} intensity={0.3} color="#dff4ff" />
      <ImportedMachine {...props} />
      <ContactShadows position={[0, -0.72, 0]} opacity={0.22} scale={3.8} blur={2.7} far={3} />
    </Canvas>
  );
}

useGLTF.preload(MODEL_URL);
