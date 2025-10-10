import React, { useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html, Float } from "@react-three/drei";

// Admin 3D floor plan (Top-down interactive)
// - 8 pravougaonih stolova
// - jedan sto (zadnji dole pored bara) ima 6 mesta, ostali 4
// - klik na sto prikazuje modal/tooltip sa informacijama
// - klik na Bar i Kasa prikazuje info

// Pozicije su u metričkoj skali (možeš podešavati)
const TABLES = [
  // left-side (uz zid pored bara)
  { id: 1, x: -6, z: -4, w: 2.0, d: 1.0, seats: 4 },
  { id: 2, x: -6, z: 0, w: 2.0, d: 1.0, seats: 4 },
  { id: 3, x: -6, z: 4, w: 2.0, d: 1.0, seats: 4 },
  // central area
  { id: 4, x: -1.5, z: -1.5, w: 2.2, d: 1.1, seats: 4 },
  { id: 5, x: -1.5, z: 2.0, w: 2.2, d: 1.1, seats: 4 },
  { id: 6, x: 1.8, z: -1.0, w: 2.2, d: 1.1, seats: 4 },
  // right-side row (uz zid, loza)
  { id: 7, x: 5.5, z: -3.5, w: 2.0, d: 1.0, seats: 4 },
  // zadnji dole pored bara (6 mesta)
  { id: 8, x: 3.5, z: 3.5, w: 2.6, d: 1.2, seats: 6 },
];

function TableMesh({ table, onClick, isSelected }) {
  const ref = useRef();
  // color and material
  const color = isSelected ? "#ffb86b" : "#8b5e3c"; // elegant wood tone

  return (
    <group position={[table.x, 0.6, table.z]}>
      {/* table top */}
      <mesh
        ref={ref}
        castShadow
        receiveShadow
        onPointerDown={(e) => {
          e.stopPropagation();
          onClick(table);
        }}
      >
        <boxGeometry args={[table.w, 0.18, table.d]} />
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.5} />
      </mesh>

      {/* legs */}
      {[
        [-table.w / 2 + 0.15, -table.d / 2 + 0.15],
        [table.w / 2 - 0.15, -table.d / 2 + 0.15],
        [-table.w / 2 + 0.15, table.d / 2 - 0.15],
        [table.w / 2 - 0.15, table.d / 2 - 0.15],
      ].map((pos, i) => (
        <mesh key={i} position={[pos[0], -0.35, pos[1]]}>
          <boxGeometry args={[0.14, 0.7, 0.14]} />
          <meshStandardMaterial color="#613A24" metalness={0.2} roughness={0.6} />
        </mesh>
      ))}

      {/* chairs placed around table depending on seats */}
      {renderChairs(table)}

      {/* table label */}
      <Html center distanceFactor={6} position={[0, 0.5, 0]}> 
        <div className={`text-sm font-semibold px-2 py-1 rounded-lg shadow-md`} style={{ background: isSelected ? 'rgba(255,184,107,0.95)' : 'rgba(255,255,255,0.9)' }}>
          Sto {table.id}
        </div>
      </Html>
    </group>
  );
}

function renderChairs(table) {
  const chairs = [];
  const seatCount = table.seats;
  // arrange chairs along long sides first, then short sides (for 6-seat table)
  const alongLong = Math.min(4, seatCount);
  const remaining = seatCount - alongLong;

  // chairs on the long sides (two per side for 4/6 seaters)
  const longOffsets = [-table.w / 2 - 0.22, table.w / 2 + 0.22];
  const zOffsets = [-table.d / 4, table.d / 4];
  let idx = 0;

  for (let side = 0; side < 2; side++) {
    for (let i = 0; i < alongLong / 2; i++) {
      const z = zOffsets[i];
      const x = longOffsets[side];
      chairs.push(
        <mesh key={`c-${table.id}-${idx}`} position={[x, -0.25, z]} rotation-y={side === 0 ? 0 : Math.PI}>
          <boxGeometry args={[0.35, 0.5, 0.35]} />
          <meshStandardMaterial color="#C28A5A" metalness={0.1} roughness={0.6} />
        </mesh>
      );
      idx++;
    }
  }

  // if there are extra seats (6-seater), put them on the short sides
  if (remaining > 0) {
    // front short side
    chairs.push(
      <mesh key={`c-${table.id}-short1`} position={[0, -0.25, -table.d / 2 - 0.22]}>
        <boxGeometry args={[0.35, 0.5, 0.35]} />
        <meshStandardMaterial color="#C28A5A" metalness={0.1} roughness={0.6} />
      </mesh>
    );
    // back short side
    chairs.push(
      <mesh key={`c-${table.id}-short2`} position={[0, -0.25, table.d / 2 + 0.22]} rotation-y={Math.PI}>
        <boxGeometry args={[0.35, 0.5, 0.35]} />
        <meshStandardMaterial color="#C28A5A" metalness={0.1} roughness={0.6} />
      </mesh>
    );
  }

  return chairs;
}

export default function AdminFloor3D() {
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);

  // simple handler for click on table/bar/kasa
  function handleTableClick(table) {
    setSelected({ type: "table", table });
  }

  function handleBarClick() {
    setSelected({ type: "bar" });
  }

  function handleKasaClick() {
    setSelected({ type: "kasa" });
  }

  return (
    <div className="w-screen h-screen bg-gray-900 text-white flex flex-col">
      <div className="flex-1 relative">
        <Canvas shadows camera={{ position: [0, 18, 0], fov: 60 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 20, 10]} intensity={1} castShadow />

          {/* floor (enterijer) */}
          <mesh rotation-x={-Math.PI / 2} receiveShadow>
            <planeGeometry args={[22, 16]} />
            <meshStandardMaterial color="#3b3b3b" metalness={0.1} roughness={0.9} />
          </mesh>

          {/* Bar (clickable) */}
          <group position={[-9, 0.9, 1]} onPointerDown={(e) => { e.stopPropagation(); handleBarClick(); }}>
            <mesh castShadow>
              <boxGeometry args={[3.5, 1.6, 1.2]} />
              <meshStandardMaterial color="#6b3f2b" metalness={0.2} roughness={0.45} />
            </mesh>
            <Html position={[0, 1.3, 0]} center>
              <div className="text-xs font-medium bg-white text-black px-2 py-1 rounded">BAR</div>
            </Html>
          </group>

          {/* Kasa (clickable) */}
          <group position={[-10.5, 0.9, -6.5]} onPointerDown={(e) => { e.stopPropagation(); handleKasaClick(); }}>
            <mesh castShadow>
              <boxGeometry args={[2.2, 1.6, 1.1]} />
              <meshStandardMaterial color="#2e2e2e" metalness={0.25} roughness={0.6} />
            </mesh>
            <Html position={[0, 1.25, 0]} center>
              <div className="text-xs font-medium bg-white text-black px-2 py-1 rounded">KASA</div>
            </Html>
          </group>

          {/* Tables */}
          {TABLES.map((t) => (
            <TableMesh
              key={t.id}
              table={t}
              onClick={handleTableClick}
              isSelected={selected?.type === 'table' && selected.table?.id === t.id}
            />
          ))}

          <OrbitControls
            enablePan={true}
            enableZoom={true}
            maxPolarAngle={Math.PI / 2.1}
            minPolarAngle={Math.PI / 4}
            target={[0, 0, 0]}
          />
        </Canvas>

        {/* UI overlay: info panel */}
        <div className="absolute right-6 top-6 w-72 bg-white/10 backdrop-blur rounded p-4 shadow-lg">
          <h3 className="text-white font-semibold mb-2">Admin 3D Plan</h3>
          <p className="text-sm text-gray-200 mb-3">Klikni na sto, bar ili kasu za detalje.</p>
          <div className="text-sm text-gray-200">
            <div>Broj stolova: {TABLES.length}</div>
            <div>Skala: metrička (prilagodljivo)</div>
          </div>
        </div>

        {/* Modal / Tooltip for selection */}
        {selected && (
          <div className="absolute left-6 bottom-6 w-80 bg-white rounded p-4 shadow-2xl text-black">
            {selected.type === 'table' && (
              <div>
                <h4 className="font-bold mb-2">Sto {selected.table.id}</h4>
                <p>Broj mesta: {selected.table.seats}</p>
                <p>Dimenzije: {selected.table.w}m × {selected.table.d}m</p>
                <div className="mt-3 flex gap-2">
                  <button className="px-3 py-1 rounded bg-blue-600 text-white text-sm">Pogledaj rezervacije</button>
                  <button className="px-3 py-1 rounded bg-green-600 text-white text-sm">Dodaj rezervaciju</button>
                  <button onClick={() => setSelected(null)} className="px-3 py-1 rounded border">Zatvori</button>
                </div>
                <p className="text-xs text-gray-600 mt-2">*Ovde se kasnije povezuje API za rezervacije (backend)</p>
              </div>
            )}

            {selected.type === 'bar' && (
              <div>
                <h4 className="font-bold mb-2">Šank</h4>
                <p>Funkcija: priprema pića, posluživanje.</p>
                <div className="mt-3 flex gap-2">
                  <button className="px-3 py-1 rounded bg-yellow-500 text-white text-sm">Otvoreno</button>
                  <button onClick={() => setSelected(null)} className="px-3 py-1 rounded border">Zatvori</button>
                </div>
              </div>
            )}

            {selected.type === 'kasa' && (
              <div>
                <h4 className="font-bold mb-2">Kasa</h4>
                <p>Funkcija: obračun, izdavanje računa.</p>
                <div className="mt-3 flex gap-2">
                  <button className="px-3 py-1 rounded bg-indigo-600 text-white text-sm">Pogledaj dnevni promet</button>
                  <button onClick={() => setSelected(null)} className="px-3 py-1 rounded border">Zatvori</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
