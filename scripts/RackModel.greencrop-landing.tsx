"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const MODEL_URL = "/models/greencrop-nat-realistic.glb";

type WaterSurfaceSpec = {
  center: THREE.Vector3;
  width: number;
  depth: number;
};

function colorizeByConnectedPart(geometry: THREE.BufferGeometry): WaterSurfaceSpec[] {
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex();
  if (!index) return [];

  const parent = new Int32Array(position.count);
  for (let vertex = 0; vertex < parent.length; vertex += 1) parent[vertex] = vertex;
  const find = (value: number): number => {
    let root = value;
    while (parent[root] !== root) root = parent[root];
    while (parent[value] !== value) {
      const next = parent[value];
      parent[value] = root;
      value = next;
    }
    return root;
  };
  const union = (a: number, b: number) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[rootB] = rootA;
  };
  for (let offset = 0; offset < index.count; offset += 3) {
    const a = index.getX(offset);
    const b = index.getX(offset + 1);
    const c = index.getX(offset + 2);
    union(a, b);
    union(b, c);
  }

  geometry.computeBoundingBox();
  const modelBox = geometry.boundingBox!;
  const modelSize = modelBox.getSize(new THREE.Vector3());
  const overall = Math.max(modelSize.x, modelSize.y, modelSize.z);
  const boundsByPart = new Map<number, THREE.Box3>();
  const point = new THREE.Vector3();
  for (let vertex = 0; vertex < position.count; vertex += 1) {
    point.fromBufferAttribute(position, vertex);
    const root = find(vertex);
    const bounds = boundsByPart.get(root) ?? new THREE.Box3();
    bounds.expandByPoint(point);
    boundsByPart.set(root, bounds);
  }

  const silver = new THREE.Color("#8f9d9b");
  const white = new THREE.Color("#f5f0e4");
  const graphite = new THREE.Color("#101716");
  const warm = new THREE.Color("#ffd978");
  const waterBlue = new THREE.Color("#35cce7");
  const colors = new Float32Array(position.count * 3);
  const partSize = new THREE.Vector3();
  const partCenter = new THREE.Vector3();
  const waterSurfaces: WaterSurfaceSpec[] = [];
  const vesselRoots = new Set<number>();

  for (const [root, bounds] of boundsByPart.entries()) {
    bounds.getSize(partSize);
    bounds.getCenter(partCenter);
    const dimensions = [partSize.x, partSize.y, partSize.z].sort((a, b) => b - a);
    const height = (partCenter.y - modelBox.min.y) / Math.max(modelSize.y, 0.0001);
    const isVessel =
      partSize.x > overall * 0.13 &&
      partSize.z > overall * 0.09 &&
      partSize.y > overall * 0.08 &&
      (height < 0.43 || (height > 0.48 && height < 0.72 && partSize.x > overall * 0.38));
    if (isVessel) {
      vesselRoots.add(root);
      const candidate = {
        center: new THREE.Vector3(partCenter.x, bounds.max.y - partSize.y * 0.045, partCenter.z),
        width: partSize.x * 0.82,
        depth: partSize.z * 0.76,
      };
      const duplicate = waterSurfaces.some((surface) => surface.center.distanceTo(candidate.center) < overall * 0.04);
      if (!duplicate) waterSurfaces.push(candidate);
    }
  }

  const filteredIndices: number[] = [];
  const waterVertices = new Set<number>();
  const aPoint = new THREE.Vector3();
  const bPoint = new THREE.Vector3();
  const cPoint = new THREE.Vector3();
  const edgeAB = new THREE.Vector3();
  const edgeAC = new THREE.Vector3();
  const faceNormal = new THREE.Vector3();
  const modelCenter = modelBox.getCenter(new THREE.Vector3());
  for (let offset = 0; offset < index.count; offset += 3) {
    const a = index.getX(offset);
    const b = index.getX(offset + 1);
    const c = index.getX(offset + 2);
    aPoint.fromBufferAttribute(position, a);
    bPoint.fromBufferAttribute(position, b);
    cPoint.fromBufferAttribute(position, c);
    edgeAB.subVectors(bPoint, aPoint);
    edgeAC.subVectors(cPoint, aPoint);
    faceNormal.crossVectors(edgeAB, edgeAC).normalize();
    const centroid = new THREE.Vector3().addVectors(aPoint, bPoint).add(cPoint).multiplyScalar(1 / 3);
    const root = find(a);
    const vesselBounds = boundsByPart.get(root);
    const opensDetectedVessel =
      vesselRoots.has(root) &&
      vesselBounds != null &&
      centroid.y > vesselBounds.max.y - vesselBounds.getSize(new THREE.Vector3()).y * 0.09 &&
      Math.abs(faceNormal.y) > 0.45;
    const leftTankX = modelCenter.x - modelSize.x * 0.31;
    const rightTankX = modelCenter.x + modelSize.x * 0.31;
    const nearTankCenter =
      Math.min(Math.abs(centroid.x - leftTankX), Math.abs(centroid.x - rightTankX)) < modelSize.x * 0.145;
    const opensTank =
      nearTankCenter &&
      Math.abs(centroid.z - modelCenter.z) < modelSize.z * 0.24 &&
      centroid.y > modelBox.min.y + modelSize.y * 0.23 &&
      centroid.y < modelBox.min.y + modelSize.y * 0.36 &&
      Math.abs(faceNormal.y) > 0.45;
    if (opensDetectedVessel || opensTank) {
      waterVertices.add(a);
      waterVertices.add(b);
      waterVertices.add(c);
    }
    filteredIndices.push(a, b, c);
  }
  geometry.setIndex(filteredIndices);

  for (let vertex = 0; vertex < position.count; vertex += 1) {
    const bounds = boundsByPart.get(find(vertex))!;
    bounds.getSize(partSize);
    bounds.getCenter(partCenter);
    const dimensions = [partSize.x, partSize.y, partSize.z].sort((a, b) => b - a);
    const height = (partCenter.y - modelBox.min.y) / Math.max(modelSize.y, 0.0001);
    let color = silver;
    if (dimensions[1] > overall * 0.11 && dimensions[2] > overall * 0.055) color = white;
    if (dimensions[0] < overall * 0.22 && dimensions[1] > overall * 0.025 && height < 0.72) color = graphite;
    if (height > 0.86 && dimensions[0] > overall * 0.16 && dimensions[1] < overall * 0.055) color = warm;
    if (waterVertices.has(vertex)) color = waterBlue;
    color.toArray(colors, vertex * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return waterSurfaces;
}

export type RackModelProps = {
  sensorGlow?: number;
  pumpEnabled?: boolean;
  fanEnabled?: boolean;
  lightsEnabled?: boolean;
  waterEnabled?: boolean;
  showFlowVisualization?: boolean;
};

export default function RackModel({
  sensorGlow = 0,
  pumpEnabled = true,
  fanEnabled = true,
  lightsEnabled = true,
  waterEnabled = true,
  showFlowVisualization = false,
}: RackModelProps) {
  const gltf = useGLTF(MODEL_URL);
  const root = useRef<THREE.Group>(null);
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const waterMeshes = useRef<THREE.Object3D[]>([]);
  const lampMeshes = useRef<THREE.Object3D[]>([]);

  const product = useMemo(() => {
    const clone = gltf.scene.clone(true);
    waterMeshes.current = [];
    lampMeshes.current = [];
    clone.traverse((object) => {
      if (object.name.startsWith("Water_")) waterMeshes.current.push(object);
      if (object.name.startsWith("GrowLight_")) lampMeshes.current.push(object);
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      if (object.name.startsWith("Water_Flow_")) {
        object.visible = showFlowVisualization && waterEnabled;
        const material = object.material as THREE.MeshStandardMaterial;
        material.transparent = true;
        material.opacity = 0.34;
        material.depthWrite = false;
      }
      if (object.name.startsWith("Water_Tank_") || object.name === "Water_GrowTray") {
        object.material = new THREE.MeshPhysicalMaterial({
          color: "#39b8d0",
          transparent: true,
          opacity: 0.52,
          transmission: 0.48,
          thickness: 0.18,
          ior: 1.333,
          roughness: 0.08,
          metalness: 0,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
      }
      if (object.name !== "model") return;
      const source = object.geometry.clone();
      source.deleteAttribute("normal");
      const geometry = mergeVertices(source, 0.0015);
      geometry.computeVertexNormals();
      colorizeByConnectedPart(geometry);
      object.geometry = geometry;
      object.material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        metalness: 0.42,
        roughness: 0.3,
        side: THREE.DoubleSide,
      });
    });

    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const fit = 4.5 / Math.max(size.y, 0.001);
    clone.position.set(-center.x * fit, -center.y * fit, -center.z * fit);
    clone.scale.setScalar(fit);
    return clone;
  }, [gltf.scene]);

  useEffect(() => {
    const animationMixer = new THREE.AnimationMixer(product);
    mixer.current = animationMixer;
    gltf.animations.forEach((clip) => {
      const name = clip.name.toLowerCase();
      const enabled =
        (name.includes("pump_") && pumpEnabled) ||
        (name.includes("fan_") && fanEnabled) ||
        (name.includes("water_") && waterEnabled);
      if (enabled) animationMixer.clipAction(clip).reset().play();
    });
    waterMeshes.current.forEach((object) => {
      object.visible = object.name.startsWith("Water_Flow_")
        ? waterEnabled && showFlowVisualization
        : waterEnabled;
    });
    lampMeshes.current.forEach((object) => {
      object.visible = lightsEnabled;
    });
    return () => {
      animationMixer.stopAllAction();
      animationMixer.uncacheRoot(product);
      mixer.current = null;
    };
  }, [
    product,
    gltf.animations,
    pumpEnabled,
    fanEnabled,
    lightsEnabled,
    waterEnabled,
    showFlowVisualization,
  ]);

  useFrame((state, delta) => {
    mixer.current?.update(delta);
    if (root.current) root.current.rotation.z = Math.sin(sensorGlow * Math.PI) * 0.002;
    const time = state.clock.elapsedTime;
    waterMeshes.current.forEach((object, index) => {
      if (!object.name.startsWith("Water_Tank") && object.name !== "Water_GrowTray") return;
      object.scale.z = 1 + Math.sin(time * 2.2 + index * 0.8) * 0.055;
      object.rotation.z = Math.sin(time * 0.75 + index) * 0.004;
    });
  });

  return (
    <group ref={root} scale={0.58} position={[0, -1.35, 0]}>
      <primitive object={product} />
      {lightsEnabled && [-0.8, -0.4, 0, 0.4, 0.8].map((x) => (
        <pointLight
          key={x}
          position={[x, 2.28, 0]}
          color="#fff1bd"
          intensity={0.4}
          distance={1.2}
        />
      ))}
    </group>
  );
}

useGLTF.preload(MODEL_URL);

useGLTF.preload(MODEL_URL);
