import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export default function GlbViewer({ url, height = '400px' }) {
    const containerRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const sceneRef = useRef(null);
    
    useEffect(() => {
        if (!url || !containerRef.current) return;
        
        const container = containerRef.current;
        const width = container.clientWidth;
        const height_px = container.clientHeight;
        
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x3a3a5c);
        
        const camera = new THREE.PerspectiveCamera(45, width / height_px, 0.1, 1000);
        camera.position.set(5, 5, 5);
        
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height_px);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.innerHTML = '';
        container.appendChild(renderer.domElement);
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);
        
        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight1.position.set(10, 10, 5);
        scene.add(directionalLight1);
        
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight2.position.set(-10, 5, -5);
        scene.add(directionalLight2);
        
        let model = null;
        const loader = new GLTFLoader();
        loader.load(
            url,
            (gltf) => {
                if (model) scene.remove(model);
                model = gltf.scene;
                model.scale.set(1, 5, 1);
                scene.add(model);
                setLoading(false);
            },
            undefined,
            (error) => {
                console.error('Error loading model:', error);
                setLoading(false);
            }
        );
        
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        let spherical = { theta: Math.PI / 4, phi: Math.PI / 4, radius: 7 };
        
        const updateCameraPosition = () => {
            camera.position.x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
            camera.position.y = spherical.radius * Math.cos(spherical.phi);
            camera.position.z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
            camera.lookAt(0, 0, 0);
        };
        
        const onMouseDown = (e) => {
            isDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        };
        
        const onMouseMove = (e) => {
            if (!isDragging) return;
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;
            spherical.theta -= deltaX * 0.01;
            spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi - deltaY * 0.01));
            previousMousePosition = { x: e.clientX, y: e.clientY };
            updateCameraPosition();
        };
        
        const onMouseUp = () => {
            isDragging = false;
        };
        
        const onWheel = (e) => {
            spherical.radius = Math.max(2, Math.min(20, spherical.radius + e.deltaY * 0.01));
            updateCameraPosition();
        };
        
        container.addEventListener('mousedown', onMouseDown);
        container.addEventListener('mousemove', onMouseMove);
        container.addEventListener('mouseup', onMouseUp);
        container.addEventListener('mouseleave', onMouseUp);
        container.addEventListener('wheel', onWheel);
        
        updateCameraPosition();
        
        const animate = () => {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        };
        animate();
        
        sceneRef.current = { scene, renderer, model };
        
        const handleResize = () => {
            const newWidth = container.clientWidth;
            const newHeight = container.clientHeight;
            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, newHeight);
        };
        
        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('resize', handleResize);
            container.removeEventListener('mousedown', onMouseDown);
            container.removeEventListener('mousemove', onMouseMove);
            container.removeEventListener('mouseup', onMouseUp);
            container.removeEventListener('mouseleave', onMouseUp);
            container.removeEventListener('wheel', onWheel);
            if (sceneRef.current) {
                sceneRef.current.renderer.dispose();
            }
        };
    }, [url]);
    
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
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '14px', fontFamily: 'sans-serif', zIndex: 10 }}>
                    Loading 3D model...
                </div>
            )}
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
}