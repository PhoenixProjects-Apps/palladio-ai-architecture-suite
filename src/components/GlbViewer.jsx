import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html, useProgress } from '@react-three/drei';

function Loader() {
    const { progress } = useProgress();
    return (
        <Html center>
            <div style={{ color: '#cbd5e1', fontSize: '14px', fontFamily: 'sans-serif' }}>
                Loading 3D model... {Math.round(progress)}%
            </div>
        </Html>
    );
}

function Model({ url }) {
    const { scene } = useGLTF(url);
    return <primitive object={scene} scale={[1, 5, 1]} />;
}

export default function GlbViewer({ url, height = '400px' }) {
    return (
        <div style={{ width: '100%', height, backgroundColor: '#3a3a5c', borderRadius: '12px', overflow: 'hidden' }}>
            <Canvas camera={{ position: [5, 5, 5], fov: 45 }}>
                <ambientLight intensity={0.8} />
                <directionalLight position={[10, 10, 5]} intensity={1.2} castShadow />
                <directionalLight position={[-10, 5, -5]} intensity={0.4} />
                <Suspense fallback={<Loader />}>
                    <Model url={url} />
                </Suspense>
                <OrbitControls makeDefault enablePan enableZoom enableRotate />
            </Canvas>
        </div>
    );
}