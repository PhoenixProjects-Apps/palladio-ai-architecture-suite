import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

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
        renderer.setPixelRatio(window.devicePixelRatio);
        container.innerHTML = '';
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
        loader.load(
            url,
            (gltf) => {
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
                console.error('Error loading model:', error);
                setLoading(false);
            }
        );
        
        // 5. Mouse Interaction Handlers
        const onMouseDown = (e) => {
            isDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        };
        
        const onMouseMove = (e) => {
            if (!isDragging) return;
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;
            
            spherical.theta -= deltaX * 0.007;
            spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, spherical.phi - deltaY * 0.007)); // Prevents going under the floor
            
            previousMousePosition = { x: e.clientX, y: e.clientY };
            updateCameraPosition();
        };
        
        const onMouseUp = () => { isDragging = false; };
        
        const onWheel = (e) => {
            e.preventDefault();
            spherical.radius = Math.max(2, Math.min(50, spherical.radius + e.deltaY * 0.02));
            updateCameraPosition();
        };
        
        container.addEventListener('mousedown', onMouseDown);
        container.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp); // Listen on window for smoother dragging release
        container.addEventListener('wheel', onWheel, { passive: false });
        
        // 6. Safe Safe Animation Loop
        renderer.setAnimationLoop(() => {
            renderer.render(scene, camera);
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
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mouseup', onMouseUp);
            container.removeEventListener('mousedown', onMouseDown);
            container.removeEventListener('mousemove', onMouseMove);
            container.removeEventListener('wheel', onWheel);
            
            // Stop the loop completely to avoid rendering a destroyed canvas context
            renderer.setAnimationLoop(null); 
            renderer.dispose();
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
        <div style={{ width: '100%', height, backgroundColor: '#3a3a5c', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
            {loading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '14px', fontFamily: 'sans-serif', zIndex: 10, backgroundColor: 'rgba(58, 58, 92, 0.8)' }}>
                    Loading 3D model...
                </div>
            )}
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
}