import React, { Suspense, useState, useEffect } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

function Model({ url, onLoaded }) {
    const gltf = useLoader(GLTFLoader, url, (loader) => {
        loader.crossOrigin = 'anonymous';
    });
    
    React.useEffect(() => {
        if (gltf && onLoaded) {
            onLoaded();
        }
    }, [gltf, onLoaded]);
    
    return <primitive object={gltf.scene} scale={[1, 5, 1]} />;
}

export default function GlbViewer({ url, height = '400px' }) {
    const [loading, setLoading] = useState(true);
    
    return (
        <div style={{ width: '100%', height, backgroundColor: '#3a3a5c', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
            {loading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '14px', fontFamily: 'sans-serif', zIndex: 10 }}>
                    Loading 3D model...
                </div>
            )}
            <Canvas camera={{ position: [5, 5, 5], fov: 45 }}>
                <ambientLight intensity={0.8} />
                <directionalLight position={[10, 10, 5]} intensity={1.2} />
                <directionalLight position={[-10, 5, -5]} intensity={0.4} />
                <Suspense fallback={null}>
                    <Model url={url} onLoaded={() => setLoading(false)} />
                </Suspense>
                <OrbitControls makeDefault enablePan enableZoom enableRotate />
            </Canvas>
        </div>
    );
}