import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Download, Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const FURNITURE = [
  { id: 'sofa', name: 'Sofa', color: 0x334155, w: 2, d: 0.9, h: 0.8 },
  { id: 'bed_double', name: 'Double Bed', color: 0xe2e8f0, w: 1.6, d: 2, h: 0.5 },
  { id: 'bed_single', name: 'Single Bed', color: 0xe2e8f0, w: 0.9, d: 2, h: 0.5 },
  { id: 'table', name: 'Dining Table', color: 0x8b5cf6, w: 1.8, d: 0.9, h: 0.75 },
  { id: 'desk', name: 'Desk', color: 0x475569, w: 1.2, d: 0.6, h: 0.75 },
  { id: 'bath', name: 'Bathtub', color: 0xffffff, w: 1.7, d: 0.7, h: 0.6 }
];

const MATERIALS = {
  floor: [
    { id: 'timber', name: 'Timber', color: 0xd97706 },
    { id: 'concrete', name: 'Concrete', color: 0x94a3b8 },
    { id: 'white_tile', name: 'White Tile', color: 0xf8fafc },
    { id: 'marble', name: 'Marble', color: 0xf1f5f9 },
    { id: 'carpet', name: 'Carpet', color: 0x64748b },
    { id: 'dark_oak', name: 'Dark Oak', color: 0x78350f }
  ],
  wall: [
    { id: 'white', name: 'White', color: 0xffffff },
    { id: 'cream', name: 'Cream', color: 0xfef3c7 },
    { id: 'grey', name: 'Grey', color: 0xcbd5e1 },
    { id: 'sage', name: 'Sage', color: 0x86efac },
    { id: 'navy', name: 'Navy', color: 0x1e3a8a },
    { id: 'charcoal', name: 'Charcoal', color: 0x334155 }
  ]
};

export default function Floorplan3DViewer({ layoutText, onClose }) {
  const containerRef = useRef(null);
  const [activeFloorMat, setActiveFloorMat] = useState(MATERIALS.floor[0]);
  const [activeWallMat, setActiveWallMat] = useState(MATERIALS.wall[0]);
  const [selectedFurniture, setSelectedFurniture] = useState(null);
  const sceneRef = useRef(null);
  const objectsRef = useRef([]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Setup
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1117);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(0, 15, 15);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    // Floor Base (Raycast target)
    const baseGeo = new THREE.PlaneGeometry(50, 50);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, side: THREE.DoubleSide });
    const baseFloor = new THREE.Mesh(baseGeo, baseMat);
    baseFloor.rotation.x = -Math.PI / 2;
    baseFloor.position.y = -0.01;
    baseFloor.receiveShadow = true;
    baseFloor.name = 'baseFloor';
    scene.add(baseFloor);
    objectsRef.current.push(baseFloor);

    // Build rooms based on mock regex parsing (very simplified)
    const rooms = parseRoomsFromText(layoutText);
    
    rooms.forEach((room, i) => {
      // Room floor
      const fGeo = new THREE.PlaneGeometry(room.w, room.h);
      const fMat = new THREE.MeshStandardMaterial({ color: activeFloorMat.color, side: THREE.DoubleSide });
      const fMesh = new THREE.Mesh(fGeo, fMat);
      fMesh.rotation.x = -Math.PI / 2;
      fMesh.position.set(room.x, 0, room.y);
      fMesh.receiveShadow = true;
      fMesh.userData = { isRoomFloor: true };
      scene.add(fMesh);
      objectsRef.current.push(fMesh);

      // Walls (simple bounding box)
      const wallThickness = 0.2;
      const wallHeight = 2.8;
      const wMat = new THREE.MeshStandardMaterial({ color: activeWallMat.color });

      // North
      const wNGeo = new THREE.BoxGeometry(room.w + wallThickness*2, wallHeight, wallThickness);
      const wN = new THREE.Mesh(wNGeo, wMat);
      wN.position.set(room.x, wallHeight/2, room.y - room.h/2 - wallThickness/2);
      wN.castShadow = true; wN.receiveShadow = true;
      scene.add(wN);

      // South
      const wS = new THREE.Mesh(wNGeo, wMat);
      wS.position.set(room.x, wallHeight/2, room.y + room.h/2 + wallThickness/2);
      wS.castShadow = true; wS.receiveShadow = true;
      scene.add(wS);

      // East
      const wEGeo = new THREE.BoxGeometry(wallThickness, wallHeight, room.h);
      const wE = new THREE.Mesh(wEGeo, wMat);
      wE.position.set(room.x + room.w/2 + wallThickness/2, wallHeight/2, room.y);
      wE.castShadow = true; wE.receiveShadow = true;
      scene.add(wE);

      // West
      const wW = new THREE.Mesh(wEGeo, wMat);
      wW.position.set(room.x - room.w/2 - wallThickness/2, wallHeight/2, room.y);
      wW.castShadow = true; wW.receiveShadow = true;
      scene.add(wW);
    });

    // Interaction (Raycaster)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (e) => {
      if (!selectedFurniture) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(objectsRef.current);

      if (intersects.length > 0) {
        const p = intersects[0].point;
        const fItem = FURNITURE.find(f => f.id === selectedFurniture);
        if (fItem) {
          const mGeo = new THREE.BoxGeometry(fItem.w, fItem.h, fItem.d);
          const mMat = new THREE.MeshStandardMaterial({ color: fItem.color });
          const mMesh = new THREE.Mesh(mGeo, mMat);
          mMesh.position.set(p.x, fItem.h/2, p.z);
          mMesh.castShadow = true;
          mMesh.receiveShadow = true;
          scene.add(mMesh);
        }
      }
    };
    renderer.domElement.addEventListener('click', onClick);

    // Render loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', onClick);
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [layoutText, activeFloorMat, activeWallMat, selectedFurniture]);

  // Very basic regex to generate mock rooms
  const parseRoomsFromText = (text) => {
    // Generate some default rooms to show something
    return [
      { name: 'Living', x: 0, y: 0, w: 6, h: 5 },
      { name: 'Bed 1', x: -4, y: 0, w: 4, h: 4 },
      { name: 'Kitchen', x: 0, y: 4.5, w: 4, h: 3 }
    ];
  };

  const exportOBJ = () => {
    toast.success('Exporting OBJ...');
    // Real OBJ export would use THREE.OBJExporter
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0f1117] flex flex-col">
      <header className="flex justify-between items-center p-4 border-b border-white/10 bg-[#0f1117]">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10 rounded-full">
            <X size={20} />
          </Button>
          <h2 className="text-white font-semibold">3D Floorplan Viewer</h2>
        </div>
        <Button onClick={exportOBJ} className="bg-white text-black hover:bg-slate-200">
          <Download size={16} className="mr-2" /> Export OBJ
        </Button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Tools */}
        <div className="w-64 bg-slate-900 border-r border-white/10 p-4 overflow-y-auto hidden md:block">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Floor Material</h3>
              <div className="grid grid-cols-2 gap-2">
                {MATERIALS.floor.map(m => (
                  <button 
                    key={m.id} onClick={() => setActiveFloorMat(m)}
                    className={`p-2 rounded border text-xs text-left ${activeFloorMat.id === m.id ? 'bg-violet-600/20 border-violet-500 text-white' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}
                  >
                    <div className="w-full h-4 rounded mb-1" style={{ backgroundColor: '#' + m.color.toString(16) }}></div>
                    {m.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Wall Material</h3>
              <div className="grid grid-cols-2 gap-2">
                {MATERIALS.wall.map(m => (
                  <button 
                    key={m.id} onClick={() => setActiveWallMat(m)}
                    className={`p-2 rounded border text-xs text-left ${activeWallMat.id === m.id ? 'bg-violet-600/20 border-violet-500 text-white' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}
                  >
                    <div className="w-full h-4 rounded mb-1 border border-white/20" style={{ backgroundColor: '#' + m.color.toString(16) }}></div>
                    {m.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Add Furniture</h3>
              <p className="text-xs text-slate-500 mb-2">Select and click on floor to place</p>
              <div className="grid grid-cols-2 gap-2">
                {FURNITURE.map(f => (
                  <button 
                    key={f.id} onClick={() => setSelectedFurniture(f.id === selectedFurniture ? null : f.id)}
                    className={`p-2 rounded border text-xs ${selectedFurniture === f.id ? 'bg-amber-600/20 border-amber-500 text-white' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 3D Canvas */}
        <div className="flex-1 relative bg-black" ref={containerRef}>
          <div className="absolute bottom-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 flex justify-center gap-2 pointer-events-none">
            <div className="bg-black/50 backdrop-blur-md text-white text-xs px-4 py-2 rounded-full border border-white/10 pointer-events-auto">
              Drag to orbit • Scroll to zoom
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}