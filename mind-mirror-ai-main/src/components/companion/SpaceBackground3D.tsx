import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function pseudoRandom(i: number) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * 3D Starfield & Floating Celestial Dust Particles
 * Gently reacts to mouse cursor movement across the entire website.
 */
function CosmicParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const count = 180;
  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const colorA = new THREE.Color('#38bdf8'); // cyan
    const colorB = new THREE.Color('#8b5cf6'); // violet
    const colorC = new THREE.Color('#2dd4bf'); // teal

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (pseudoRandom(i * 3) - 0.5) * 16;
      pos[i * 3 + 1] = (pseudoRandom(i * 3 + 1) - 0.5) * 12;
      pos[i * 3 + 2] = (pseudoRandom(i * 3 + 2) - 0.5) * 10 - 2;

      const pick = pseudoRandom(i + 500);
      const c = pick < 0.4 ? colorA : pick < 0.7 ? colorB : colorC;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return [pos, col];
  }, [count]);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    if (pointsRef.current) {
      // Subtle rotation and mouse parallax
      pointsRef.current.rotation.y = time * 0.02 + state.pointer.x * 0.15;
      pointsRef.current.rotation.x = time * 0.015 - state.pointer.y * 0.12;
    }

    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.04;
      ringRef.current.rotation.x = Math.sin(time * 0.2) * 0.3 + 0.5;
    }
  });

  return (
    <group>
      {/* Distant Pluto Orbital Ring */}
      <mesh ref={ringRef} position={[4, 2, -6]} rotation={[0.6, 0.4, 0]}>
        <ringGeometry args={[2.8, 2.85, 64]} />
        <meshBasicMaterial
          color="#06b6d4"
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Floating 3D Star & Nebula Points */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.045}
          vertexColors
          transparent
          opacity={0.65}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

export const SpaceBackground3D: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-75 dark:opacity-85 light:opacity-25 transition-opacity duration-300">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
      >
        <CosmicParticles />
      </Canvas>
    </div>
  );
};
