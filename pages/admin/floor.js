// pages/admin/floor.js
import { Stage, Layer, Rect, Circle, Text, Group } from "react-konva";
import { useState, useEffect } from "react";

export default function FloorPlan() {
  const [tables, setTables] = useState([]);

  // Simulacija podataka (kasnije povezujemo sa MongoDB)
  useEffect(() => {
    setTables([
      { id: 1, x: 100, y: 100, seats: 4, reserved: false },
      { id: 2, x: 300, y: 100, seats: 2, reserved: true },
      { id: 3, x: 500, y: 100, seats: 6, reserved: false },
      { id: 4, x: 200, y: 300, seats: 4, reserved: true },
      { id: 5, x: 400, y: 300, seats: 4, reserved: false },
    ]);
  }, []);

  return (
    <div className="flex flex-col items-center p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-4">🪑 Plan stolova restorana</h1>

      <Stage width={800} height={500} className="bg-green-50 border rounded-lg shadow-lg">
        <Layer>
          {/* Šank */}
          <Rect
            x={600}
            y={350}
            width={150}
            height={100}
            fill="#C0A060"
            cornerRadius={10}
          />
          <Text x={630} y={390} text="ŠANK" fontSize={16} fill="#fff" />

          {/* Stolovi */}
          {tables.map((table) => (
            <Group key={table.id}>
              <Circle
                x={table.x}
                y={table.y}
                radius={40}
                fill={table.reserved ? "#FF6B6B" : "#4CAF50"}
                shadowBlur={10}
              />
              <Text
                x={table.x - 25}
                y={table.y - 8}
                text={`Sto ${table.id}`}
                fontSize={14}
                fill="#fff"
              />
            </Group>
          ))}
        </Layer>
      </Stage>

      <p className="mt-4 text-gray-600">
        🟢 Slobodan sto | 🔴 Rezervisan sto
      </p>
    </div>
  );
}
