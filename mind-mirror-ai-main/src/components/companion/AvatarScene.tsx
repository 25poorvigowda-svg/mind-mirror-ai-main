import React, { useRef, useState, useMemo, useEffect, Suspense, Component, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { User, Maximize2, RotateCcw } from 'lucide-react';
import type { EmotionType } from '../../types';

interface AvatarSceneProps {
  isSpeaking: boolean;
  isListening: boolean;
  emotion: EmotionType;
  lipSyncAmplitude: number;
  modelStyle?: 'realistic_pluto' | 'stylized_human';
}

/**
 * Preload Pluto GLB so the 3D model loads instantly
 */
useGLTF.preload('/pluto.glb');

/**
 * Realistic Female 3D Avatar (Pluto) loaded from /pluto.glb
 * Uses full facial blendshapes, bone rigging, cursor tracking, and speech lip-sync.
 * Calibrated in standard coordinates: model stands at Y=0, head at Y=1.77m, eye level at Y=1.62m.
 */
function RealisticPlutoAvatar({
  isSpeaking,
  isListening,
  emotion,
  lipSyncAmplitude,
}: {
  isSpeaking: boolean;
  isListening: boolean;
  emotion: EmotionType;
  lipSyncAmplitude: number;
}) {
  const { scene } = useGLTF('/pluto.glb');
  const avatarRef = useRef<THREE.Group>(null);
  const headBoneRef = useRef<THREE.Bone | null>(null);
  const neckBoneRef = useRef<THREE.Bone | null>(null);

  // Mesh references for morph targets (Wolf3D_Head, Wolf3D_Teeth, EyeLeft, EyeRight)
  const morphMeshesRef = useRef<THREE.SkinnedMesh[]>([]);

  // Blinking timer state
  const blinkTimerRef = useRef(0);
  const [blinkWeight, setBlinkWeight] = useState(0);

  // Cache cloned scene
  const clonedScene = useMemo(() => {
    return scene.clone(true);
  }, [scene]);

  useEffect(() => {
    const meshes: THREE.SkinnedMesh[] = [];
    clonedScene.traverse((node) => {
      if ((node as THREE.Bone).isBone) {
        if (node.name === 'Head') headBoneRef.current = node as THREE.Bone;
        if (node.name === 'Neck') neckBoneRef.current = node as THREE.Bone;
      }
      if ((node as THREE.SkinnedMesh).isSkinnedMesh) {
        const mesh = node as THREE.SkinnedMesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
          meshes.push(mesh);
        }
      }
    });
    morphMeshesRef.current = meshes;
  }, [clonedScene]);

  // Helper to safely set morph target influence on all face meshes
  const setMorph = (targetName: string, value: number) => {
    morphMeshesRef.current.forEach((mesh) => {
      if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
        const idx = mesh.morphTargetDictionary[targetName];
        if (idx !== undefined) {
          mesh.morphTargetInfluences[idx] = THREE.MathUtils.lerp(
            mesh.morphTargetInfluences[idx],
            value,
            0.22
          );
        }
      }
    });
  };

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    // 1. Natural Idle Breathing: subtle 8mm displacement at chest/spine
    if (avatarRef.current) {
      avatarRef.current.position.y = Math.sin(time * 1.6) * 0.008;
    }

    // 2. Cursor tracking with Head and Neck bones (smooth eye-contact feeling)
    if (headBoneRef.current) {
      const targetRotY = state.pointer.x * 0.28;
      const targetRotX = -state.pointer.y * 0.16;
      headBoneRef.current.rotation.y = THREE.MathUtils.lerp(
        headBoneRef.current.rotation.y,
        targetRotY,
        0.08
      );
      headBoneRef.current.rotation.x = THREE.MathUtils.lerp(
        headBoneRef.current.rotation.x,
        targetRotX,
        0.08
      );

      // Listening alert tilt
      const targetTilt = isListening ? 0.08 : emotion === 'confused' ? -0.1 : 0;
      headBoneRef.current.rotation.z = THREE.MathUtils.lerp(
        headBoneRef.current.rotation.z,
        targetTilt,
        0.06
      );
    }

    if (neckBoneRef.current) {
      neckBoneRef.current.rotation.y = THREE.MathUtils.lerp(
        neckBoneRef.current.rotation.y,
        state.pointer.x * 0.12,
        0.05
      );
    }

    // 3. Natural Eye Blinking cycle
    blinkTimerRef.current += delta;
    if (blinkTimerRef.current > 3.6 + Math.sin(time * 0.7) * 1.4) {
      blinkTimerRef.current = 0;
      setBlinkWeight(1);
    }
    if (blinkWeight > 0) {
      setBlinkWeight((prev) => Math.max(0, prev - delta * 7.5));
    }
    setMorph('eyeBlinkLeft', blinkWeight);
    setMorph('eyeBlinkRight', blinkWeight);

    // 4. Emotion-based Facial Expressions
    const isHappy = emotion === 'happy' || emotion === 'excited';
    const isSad = emotion === 'sad' || emotion === 'lonely';
    const isStressed = emotion === 'stressed';
    const isConfused = emotion === 'confused';
    const isAngry = emotion === 'angry';

    setMorph('mouthSmile', isHappy ? 0.75 : emotion === 'calm' ? 0.12 : 0);
    setMorph('mouthSmileLeft', isHappy ? 0.35 : 0);
    setMorph('mouthSmileRight', isHappy ? 0.35 : 0);
    setMorph('mouthFrownLeft', isSad || isAngry ? 0.55 : 0);
    setMorph('mouthFrownRight', isSad || isAngry ? 0.55 : 0);

    setMorph('browInnerUp', isSad || isConfused ? 0.55 : 0);
    setMorph('browOuterUpLeft', isHappy ? 0.4 : 0);
    setMorph('browOuterUpRight', isHappy ? 0.4 : 0);
    setMorph('browDownLeft', isStressed || isAngry ? 0.6 : 0);
    setMorph('browDownRight', isStressed || isAngry ? 0.6 : isConfused ? 0.3 : 0);

    setMorph('eyeSquintLeft', isStressed ? 0.35 : isHappy ? 0.15 : 0);
    setMorph('eyeSquintRight', isStressed ? 0.35 : isHappy ? 0.15 : 0);
    setMorph('eyeWideLeft', emotion === 'excited' ? 0.3 : 0);
    setMorph('eyeWideRight', emotion === 'excited' ? 0.3 : 0);
    setMorph('noseSneerLeft', isAngry ? 0.45 : 0);
    setMorph('noseSneerRight', isAngry ? 0.45 : 0);

    // 5. Speech-Synchronized Lip Movement (Visemes & Jaw Open)
    if (isSpeaking) {
      const baseAmp = lipSyncAmplitude > 0 ? lipSyncAmplitude : (Math.sin(time * 14) * 0.5 + 0.5) * 0.75;
      const openAmount = Math.min(1.0, baseAmp * 1.25);
      const visemeA = Math.sin(time * 11) > 0 ? openAmount * 0.85 : 0.08;
      const visemeO = Math.cos(time * 9) > 0.2 ? openAmount * 0.65 : 0;
      const visemeE = Math.sin(time * 16) > 0 ? openAmount * 0.55 : 0;

      setMorph('mouthOpen', openAmount * 0.75);
      setMorph('jawOpen', openAmount * 0.85);
      setMorph('viseme_aa', visemeA);
      setMorph('viseme_O', visemeO);
      setMorph('viseme_E', visemeE);
    } else {
      setMorph('mouthOpen', 0);
      setMorph('jawOpen', 0);
      setMorph('viseme_aa', 0);
      setMorph('viseme_O', 0);
      setMorph('viseme_E', 0);
    }
  });

  return (
    <group ref={avatarRef} position={[0, 0, 0]} scale={[1, 1, 1]}>
      <primitive object={clonedScene} />
    </group>
  );
}

/**
 * Holographic Floating Energy Particles centered around Pluto
 */
function HolographicParticleField({ isSpeaking }: { isSpeaking: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 90;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const rx = (Math.sin(i * 14.23 + 1.2) * 43758.54) % 1;
      const ry = (Math.sin(i * 26.54 + 2.7) * 43758.54) % 1;
      const rz = (Math.sin(i * 39.81 + 4.1) * 43758.54) % 1;
      pos[i * 3] = (rx - 0.5) * 3.5;
      pos[i * 3 + 1] = (ry - 0.5) * 2.8 + 1.3; // Centered at chest/head level (Y=1.3)
      pos[i * 3 + 2] = (rz - 0.5) * 2.5;
    }
    return pos;
  }, [count]);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * (isSpeaking ? 0.3 : 0.08);
      pointsRef.current.rotation.x += delta * 0.03;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#38bdf8"
        transparent
        opacity={isSpeaking ? 0.75 : 0.4}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/**
 * Camera Rig that provides smooth framing transitions between:
 * - 'portrait' (Face & Bust companion view): eyes, mouth lip-sync, head movements
 * - 'full' (Full body view): head to shoes
 */
function CameraRig({
  viewMode,
  resetTrigger,
}: {
  viewMode: 'portrait' | 'full';
  resetTrigger: number;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  // Targets and positions in model coordinates:
  // Model: feet at Y=0, hips at Y=0.95, chest at Y=1.3, mouth at Y=1.51, eyes at Y=1.62, top of hair at Y=1.77.
  const targetLookAt = useMemo(() => {
    return viewMode === 'portrait'
      ? new THREE.Vector3(0, 1.50, 0) // chin/upper neck level, framing face & bust
      : new THREE.Vector3(0, 0.88, 0); // torso center, framing full body
  }, [viewMode]);

  const targetCamPos = useMemo(() => {
    return viewMode === 'portrait'
      ? new THREE.Vector3(0, 1.54, 0.95) // tight companion portrait framing
      : new THREE.Vector3(0, 0.92, 2.75); // full body overview framing
  }, [viewMode]);

  // Smooth transition interpolation
  const isTransitioningRef = useRef(true);
  const progressRef = useRef(0);
  const startPosRef = useRef(new THREE.Vector3(0, 1.54, 0.95));
  const startTargetRef = useRef(new THREE.Vector3(0, 1.50, 0));

  useEffect(() => {
    startPosRef.current.copy(camera.position);
    if (controlsRef.current) {
      startTargetRef.current.copy(controlsRef.current.target);
    }
    progressRef.current = 0;
    isTransitioningRef.current = true;
  }, [viewMode, resetTrigger, camera]);

  useFrame((_, delta) => {
    if (isTransitioningRef.current) {
      progressRef.current += delta * 3.0;
      const t = Math.min(1, progressRef.current);
      // Smooth cubic ease out
      const ease = 1 - Math.pow(1 - t, 3);

      camera.position.lerpVectors(startPosRef.current, targetCamPos, ease);
      if (controlsRef.current) {
        controlsRef.current.target.lerpVectors(startTargetRef.current, targetLookAt, ease);
        controlsRef.current.update();
      }

      if (t >= 1) {
        isTransitioningRef.current = false;
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableZoom={true}
      minDistance={viewMode === 'portrait' ? 0.45 : 1.2}
      maxDistance={viewMode === 'portrait' ? 1.9 : 4.0}
      enablePan={false}
      target={viewMode === 'portrait' ? [0, 1.50, 0] : [0, 0.88, 0]}
      maxPolarAngle={Math.PI / 2 + 0.05}
      minPolarAngle={Math.PI / 3.8}
      maxAzimuthAngle={Math.PI / 2.8}
      minAzimuthAngle={-Math.PI / 2.8}
    />
  );
}

/**
 * Fallback glowing loading placeholder while 3D mesh loads
 */
function AvatarLoadingPlaceholder() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 1.5;
    }
  });

  return (
    <group position={[0, 1.5, 0]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.3, 24, 24]} />
        <meshStandardMaterial color="#06b6d4" wireframe transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

/**
 * Error boundary for 3D canvas
 */
class CanvasErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.error('AvatarScene 3D error:', error);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export const AvatarScene: React.FC<AvatarSceneProps> = ({
  isSpeaking,
  isListening,
  emotion,
  lipSyncAmplitude,
}) => {
  // Framing view: 'portrait' (face & upper bust - default) vs 'full' (head to toe)
  const [viewMode, setViewMode] = useState<'portrait' | 'full'>('portrait');
  const [resetCount, setResetCount] = useState(0);

  // Lighting highlights that react to emotional presence
  const rimColor = useMemo(() => {
    switch (emotion) {
      case 'happy':
      case 'excited':
        return '#38bdf8'; // vivid cyan
      case 'stressed':
        return '#f59e0b'; // amber warning
      case 'sad':
      case 'lonely':
        return '#818cf8'; // gentle soft indigo
      case 'angry':
        return '#f43f5e'; // rose
      case 'confused':
        return '#c084fc'; // violet
      case 'calm':
      default:
        return '#2dd4bf'; // teal
    }
  }, [emotion]);

  const handleReset = () => {
    setResetCount((prev) => prev + 1);
  };

  return (
    <div className="relative w-full h-full min-h-[380px] md:min-h-[460px] flex items-center justify-center select-none">
      <CanvasErrorBoundary
        fallback={
          <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-3 text-cyan-400 font-bold text-lg">
              PLUTO
            </div>
            <p className="text-sm font-medium text-slate-200">Pluto 3D Companion Active</p>
            <p className="text-xs text-slate-400 mt-1">Ready for voice and reflection</p>
          </div>
        }
      >
        <Canvas
          camera={{ position: [0, 1.54, 0.95], fov: 34 }}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        >
          {/* Soft Ambient Environment */}
          <ambientLight intensity={0.9} />

          {/* Key Light (Soft Warm Studio Light aimed at Pluto's face and torso) */}
          <directionalLight position={[1.5, 2.5, 2.0]} intensity={1.5} color="#f0f9ff" />

          {/* Soft Fill Light from left */}
          <directionalLight position={[-2, 1.5, 1.5]} intensity={0.9} color="#bae6fd" />

          {/* Reactive Emotional Rim Light at head level behind Pluto */}
          <pointLight position={[0, 1.9, -1.2]} intensity={2.4} color={rimColor} />

          {/* Subtle Underlight to illuminate outfit details */}
          <pointLight position={[0, 0.3, 1.0]} intensity={0.6} color="#0284c7" />

          {/* Realistic Pluto Avatar */}
          <Suspense fallback={<AvatarLoadingPlaceholder />}>
            <RealisticPlutoAvatar
              isSpeaking={isSpeaking}
              isListening={isListening}
              emotion={emotion}
              lipSyncAmplitude={lipSyncAmplitude}
            />
          </Suspense>

          <HolographicParticleField isSpeaking={isSpeaking} />

          {/* Dynamic Camera Rig & OrbitControls */}
          <CameraRig viewMode={viewMode} resetTrigger={resetCount} />
        </Canvas>
      </CanvasErrorBoundary>

      {/* Top Left: Floating Interactive Status Pill */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/85 dark:bg-slate-900/85 light:bg-white/90 border border-cyan-500/30 backdrop-blur-md text-xs font-semibold text-cyan-300 dark:text-cyan-300 light:text-cyan-700 shadow-lg pointer-events-none">
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            isSpeaking
              ? 'bg-cyan-400 animate-ping'
              : isListening
              ? 'bg-violet-400 animate-pulse'
              : 'bg-teal-400'
          }`}
        />
        <span>
          {isSpeaking
            ? 'Pluto: Speaking & Reflecting...'
            : isListening
            ? 'Pluto: Listening to you...'
            : `Pluto 3D • ${emotion.toUpperCase()}`}
        </span>
      </div>

      {/* Top Right: View Mode Toggle Controls (Portrait vs Full Body) */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/85 dark:bg-slate-900/85 border border-slate-700/80 backdrop-blur-md shadow-lg">
        <button
          type="button"
          onClick={() => setViewMode('portrait')}
          title="Face & Bust View (Focus on expressions & lip-sync)"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            viewMode === 'portrait'
              ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Portrait</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('full')}
          title="Full Body View (Head to toe outfit & stance)"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            viewMode === 'full'
              ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
          }`}
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Full Body</span>
        </button>

        <button
          type="button"
          onClick={handleReset}
          title="Reset Camera Angle"
          className="p-1 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Right: Orbit & Zoom Interaction Hint */}
      <div className="absolute bottom-3 right-4 z-10 text-[10px] text-slate-400/80 pointer-events-none flex items-center gap-2 bg-slate-950/60 px-2.5 py-1 rounded-lg backdrop-blur-sm border border-slate-800/60">
        <span>Drag to rotate</span>
        <span>•</span>
        <span>Scroll to zoom</span>
      </div>
    </div>
  );
};
