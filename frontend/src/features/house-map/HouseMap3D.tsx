import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows, Float, Text } from '@react-three/drei';
import * as THREE from 'three';

function Room({ position, size, name, color = "#3B82F6", active = false }: { position: [number, number, number], size: [number, number, number], name: string, color?: string, active?: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  
  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <boxGeometry args={size} />
        <meshStandardMaterial 
          color={color} 
          transparent 
          opacity={active ? 0.3 : 0.08} 
          roughness={0.1}
          metalness={0.2}
          envMapIntensity={1}
        />
      </mesh>
      {/* Edges */}
      <mesh>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} wireframe opacity={0.3} transparent />
      </mesh>
      
      {/* Label */}
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
        <Text
          position={[0, size[1] / 2 + 0.4, 0]}
          fontSize={0.22}
          color="#475569"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#ffffff"
        >
          {name.toUpperCase()}
        </Text>
      </Float>

      {/* Status Light */}
      {active && (
        <mesh position={[0, size[1] / 2 + 0.1, 0]}>
           <sphereGeometry args={[0.05, 16, 16]} />
           <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
           <pointLight color={color} intensity={0.5} distance={2} />
        </mesh>
      )}
    </group>
  );
}

export default function HouseMap3D({ devices = [] }: { devices?: any[] }) {
  const rooms: { name: string, position: [number, number, number], size: [number, number, number], color: string }[] = useMemo(() => [
    { name: 'Living Room', position: [-2, 0.5, 0], size: [3, 1, 4], color: '#3B82F6' },
    { name: 'Kitchen', position: [1.5, 0.5, 1], size: [2.5, 1, 2], color: '#F59E0B' },
    { name: 'Master Bed', position: [1.5, 0.5, -1], size: [2.5, 1, 2], color: '#8B5CF6' },
    { name: 'Office', position: [4, 0.5, 0], size: [2, 1, 4], color: '#10B981' },
  ], []);

  return (
    <div className="w-full h-full min-h-[400px] bg-slate-50/50 rounded-[32px] overflow-hidden">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[8, 8, 8]} fov={35} />
        <OrbitControls 
          enablePan={false} 
          autoRotate 
          autoRotateSpeed={0.5} 
          minPolarAngle={Math.PI / 4} 
          maxPolarAngle={Math.PI / 2.5} 
          makeDefault 
        />
        
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />

        <group position={[0, -0.5, 0]}>
          {rooms.map((room, i) => (
            <Room 
              key={i} 
              {...room} 
              active={devices.some(d => d.location === room.name && d.status === 'online')} 
            />
          ))}
          
          {/* Ground Plane */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color="#F8FAFC" transparent opacity={0.6} />
          </mesh>
          <gridHelper args={[20, 20, '#E2E8F0', '#F1F5F9']} position={[0, 0, 0]} />
        </group>

        <ContactShadows 
          position={[0, -0.5, 0]} 
          opacity={0.4} 
          scale={20} 
          blur={2.4} 
          far={4} 
        />
      </Canvas>
    </div>
  );
}
