import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Stage } from "@react-three/drei";
import * as THREE from "three";

export default function Restaurant3D() {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#1f1f1f" }}>
      <Canvas shadows>
        {/* Kamera i kontrole */}
        <PerspectiveCamera makeDefault position={[10, 15, 20]} fov={55} />
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />

        {/* Osvetljenje */}
        <ambientLight intensity={0.4} />
        <spotLight
          position={[15, 40, 20]}
          angle={0.3}
          penumbra={1}
          intensity={1.5}
          castShadow
        />

        {/* POD */}
        <mesh rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[40, 30]} />
          <meshStandardMaterial color="#555" metalness={0.2} roughness={0.7} />
        </mesh>

        {/* KASA */}
        <mesh position={[-12, 1, -10]} castShadow>
          <boxGeometry args={[4, 2, 2]} />
          <meshStandardMaterial color="#996633" metalness={0.4} roughness={0.5} />
        </mesh>

        {/* BAR */}
        <mesh position={[-5, 1, 0]} castShadow>
          <boxGeometry args={[4, 2, 3]} />
          <meshStandardMaterial color="#d17f45" metalness={0.3} roughness={0.5} />
        </mesh>

        {/* STOLOVI */}
        {[
          { x: 0, z: -6, reserved: false },
          { x: 0, z: -2, reserved: true },
          { x: 0, z: 2, reserved: false },
          { x: 0, z: 6, reserved: true },
        ].map((t, i) => (
          <mesh key={i} position={[t.x, 1, t.z]} castShadow>
            <cylinderGeometry args={[1.2, 1.2, 0.3, 32]} />
            <meshStandardMaterial
              color={t.reserved ? "#ff6666" : "#6ecf68"}
              metalness={0.3}
              roughness={0.4}
            />
          </mesh>
        ))}

        {/* LOZA (bela linija) */}
        <mesh position={[10, 0.05, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.2, 20]} />
          <meshStandardMaterial color="white" />
        </mesh>

        {/* KUHINJA ULAZ (stepenice) */}
        <mesh position={[-15, 0.05, -10]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[3, 3]} />
          <meshStandardMaterial color="#333" />
        </mesh>

      </Canvas>
    </div>
  );
}
