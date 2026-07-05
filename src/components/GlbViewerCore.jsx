import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { toast } from 'sonner';

export default function GlbViewer({ url, height = '400px', wallHeightMultiplier = 8 }) {
    const containerRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const sceneRef = useRef(null);
    
    useEffect(() => {
        if (!url || !containerRef.current) return;
        
        const container = containerRef.current;
        const width = container.clientWidth;
        const height_px = container.clientHeight;
        
        // 1. Create Scene & Renderer
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x3a3a5c);
        
        const camera = new THREE.PerspectiveCamera(45, width / height_px, 0.1, 1000);
        
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height_px);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.domElement.style.touchAction = 'none';
        renderer.domElement.style.userSelect = 'none';
        container.innerHTML = '';
        container.style.touchAction = 'none';
        container.appendChild(renderer.domElement);
        
        // 2. Lighting Setup
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
        scene.add(ambientLight);
        
        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight1.position.set(10, 15, 10);
        scene.add(directionalLight1);
        
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight2.position.set(-10, 5, -10);
        scene.add(directionalLight2);
        
        let model = null;
        let isMounted = true;
        let modelCenter = new THREE.Vector3(0, 0, 0);
        
        // 3. Camera Interaction Controls (Spherical Coordinates)
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        let spherical = { theta: Math.PI / 4, phi: Math.PI / 3, radius: 10 };
        
        const updateCameraPosition = () => {
            camera.position.x = modelCenter.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
            camera.position.y = modelCenter.y + spherical.radius * Math.cos(spherical.phi);
            camera.position.z = modelCenter.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
            camera.lookAt(modelCenter);
        };

        // 4. Load the GLB Model
        const loader = new GLTFLoader();
        loader.setCrossOrigin('anonymous');
        loader.load(
            url,
            (gltf) => {
                if (!isMounted) {
                    gltf.scene.traverse((child) => {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            const materials = Array.isArray(child.material) ? child.material : [child.material];
                            materials.forEach((material) => material.dispose?.());
                        }
                    });
                    return;
                }
                model = gltf.scene;
                
                // STRETCH WALLS: AI models usually treat Y as the vertical 'up' axis.
                // Increase 'wallHeightMultiplier' prop if walls still look too short.
                model.scale.set(1, wallHeightMultiplier, 1); 

                // If your specific AI model treats Z as up, uncomment the line below instead:
                // model.scale.set(1, 1, wallHeightMultiplier);

                scene.add(model);

                // AUTOMATICALLY CENTER CAMERA ON MODEL
                const box = new THREE.Box3().setFromObject(model);
                box.getCenter(modelCenter);
                const size = box.getSize(new THREE.Vector3());
                
                // Dynamically adjust zoom radius based on how big the model turned out
                const maxDim = Math.max(size.x, size.y, size.z);
                spherical.radius = maxDim * 1.5; 
                
                updateCameraPosition();
                setLoading(false);
            },
            undefined,
            (error) => {
                if (!isMounted) return;
                console.error('Error loading model:', error);
                setLoading(false);
                toast.error('Failed to load 3D model. The file may be inaccessible or expired.');
            }
        );
        
        // 5. Pointer + Wheel Interaction Handlers
        const activePointers = new Map();
        let previousPointerPosition = null;
        let lastPinchDistance = null;

        const clampRadius = (value) => Math.max(2, Math.min(50, value));
        const clampPhi = (value) => Math.max(0.1, Math.min(Math.PI / 2 - 0.05, value));
        const getPointerDistance = () => {
            const points = Array.from(activePointers.values());
            if (points.length < 2) return null;
            const [a, b] = points;
            return Math.hypot(a.x - b.x, a.y - b.y);
        };

        const onPointerDown = (e) => {
            e.preventDefault();
            try { container.setPointerCapture?.(e.pointerId); } catch (_) {}
            activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (activePointers.size === 1) {
                previousPointerPosition = { x: e.clientX, y: e.clientY };
                lastPinchDistance = null;
            } else if (activePointers.size === 2) {
                previousPointerPosition = null;
                lastPinchDistance = getPointerDistance();
            }
        };
        
        const onPointerMove = (e) => {
            if (!activePointers.has(e.pointerId)) return;
            e.preventDefault();
            activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

            if (activePointers.size === 1 && previousPointerPosition) {
                const deltaX = e.clientX - previousPointerPosition.x;
                const deltaY = e.clientY - previousPointerPosition.y;
                spherical.theta -= deltaX * 0.007;
                spherical.phi = clampPhi(spherical.phi - deltaY * 0.007);
                previousPointerPosition = { x: e.clientX, y: e.clientY };
                updateCameraPosition();
            } else if (activePointers.size >= 2) {
                const currentDistance = getPointerDistance();
                if (currentDistance && lastPinchDistance) {
                    const pinchDelta = currentDistance - lastPinchDistance;
                    spherical.radius = clampRadius(spherical.radius - pinchDelta * 0.02);
                    updateCameraPosition();
                }
                lastPinchDistance = currentDistance;
            }
        };
        
        const onPointerUp = (e) => {
            if (activePointers.has(e.pointerId)) {
                activePointers.delete(e.pointerId);
                try { container.releasePointerCapture?.(e.pointerId); } catch (_) {}
            }
            const remaining = Array.from(activePointers.values());
            previousPointerPosition = remaining.length === 1 ? { ...remaining[0] } : null;
            lastPinchDistance = remaining.length >= 2 ? getPointerDistance() : null;
        };
        
        const onWheel = (e) => {
            e.preventDefault();
            spherical.radius = clampRadius(spherical.radius + e.deltaY * 0.02);
            updateCameraPosition();
        };
        
        container.addEventListener('pointerdown', onPointerDown, { passive: false });
        container.addEventListener('pointermove', onPointerMove, { passive: false });
        container.addEventListener('pointerup', onPointerUp);
        container.addEventListener('pointercancel', onPointerUp);
        container.addEventListener('wheel', onWheel, { passive: false });
        
        // 6. Safe Safe Animation Loop
        let disposed = false;
        renderer.setAnimationLoop(() => {
            if (!disposed) renderer.render(scene, camera);
        });
        
        sceneRef.current = { scene, renderer, model };
        
        // 7. Window Resize Handler
        const handleResize = () => {
            const newWidth = container.clientWidth;
            const newHeight = container.clientHeight;
            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, newHeight);
        };
        
        window.addEventListener('resize', handleResize);
        
        // 8. Clean up everything perfectly on unmount/URL change
        return () => {
            isMounted = false;
            disposed = true;
            window.removeEventListener('resize', handleResize);
            container.removeEventListener('pointerdown', onPointerDown);
            container.removeEventListener('pointermove', onPointerMove);
            container.removeEventListener('pointerup', onPointerUp);
            container.removeEventListener('pointercancel', onPointerUp);
            container.removeEventListener('wheel', onWheel);
            activePointers.clear();
            
            if (model) {
                model.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        const materials = Array.isArray(child.material) ? child.material : [child.material];
                        materials.forEach((material) => material.dispose?.());
                    }
                });
            }
            // Stop the loop completely to avoid rendering a destroyed canvas context
            renderer.setAnimationLoop(null); 
            renderer.dispose();
            if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
        };
    }, [url, wallHeightMultiplier]);
    
    if (!url) {
        return (
            <div style={{ width: '100%', height, backgroundColor: '#3a3a5c', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#cbd5e1', fontSize: '14px', fontFamily: 'sans-serif' }}>No 3D model loaded</span>
            </div>
        );
    }
    
    return (
        <div style={{ width: '100%', height, backgroundColor: '#3a3a5c', borderRadius: '12px', overflow: 'hidden', position: 'relative', touchAction: 'none' }}>
            {loading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '14px', fontFamily: 'sans-serif', zIndex: 10, backgroundColor: 'rgba(58, 58, 92, 0.8)' }}>
                    Loading 3D model...
                </div>
            )}
            <div style={{ position: 'absolute', left: 12, bottom: 10, zIndex: 5, color: '#cbd5e1', background: 'rgba(15, 23, 42, 0.65)', borderRadius: 999, padding: '6px 10px', fontSize: 12, fontFamily: 'sans-serif', pointerEvents: 'none' }}>
                Drag to rotate · Pinch to zoom
            </div>
            <div ref={containerRef} style={{ width: '100%', height: '100%', touchAction: 'none' }} />
        </div>
    );
}