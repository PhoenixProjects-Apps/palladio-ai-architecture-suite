import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { Download, X, AlertCircle } from 'lucide-react';
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

// Auto-furniture per room type
const ROOM_FURNITURE = {
  living: 'sofa',
  bedroom: 'bed_double',
  kitchen: 'table',
  bathroom: 'bath',
  dining: 'table',
  office: 'desk',
  study: 'desk'
};

function createLabelSprite(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(15,17,23,0.8)';
  ctx.fillRect(0, 0, 256, 80);
  ctx.font = 'bold 36px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 40);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(3, 0.94, 1);
  return sprite;
}

// Helper to add crisp edges to objects for a better architectural look
function addEdges(mesh, color = 0x000000, opacity = 0.15) {
  const edges = new THREE.EdgesGeometry(mesh.geometry);
  const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
  mesh.add(line);
}

export default function Floorplan3DViewer({ layoutData, onClose }) {
  const containerRef = useRef(null);
  const [activeFloorMat, setActiveFloorMat] = useState(MATERIALS.floor[0]);
  const [activeWallMat, setActiveWallMat] = useState(MATERIALS.wall[0]);
  const [selectedFurniture, setSelectedFurniture] = useState(null);
  
  const sceneRef = useRef(null);
  const objectsRef = useRef([]);
  const selectedFurnitureRef = useRef(null);
  
  // Material Refs for fast updates without recreating the scene
  const floorMatRef = useRef(null);
  const wallMatRef = useRef(null);

  useEffect(() => { selectedFurnitureRef.current = selectedFurniture; }, [selectedFurniture]);

  const hasRooms = layoutData?.rooms?.length > 0;

  // Scene setup hook - Only runs when layoutData changes
  useEffect(() => {
    if (!containerRef.current || !hasRooms) return;

    const rooms = (layoutData.rooms || []).map(r => ({
      name: r.name || 'Room',
      type: (r.type || 'other').toLowerCase(),
      w: Math.max(1, Number(r.width) || 4),
      h: Math.max(1, Number(r.depth) || 4),
      x: Number(r.x) || 0,
      y: Number(r.z) || 0
    }));

    // Setup
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1117);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent camera from going below floor

    // Improved Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0005; // Prevents shadow acne
    scene.add(dirLight);

    // Initial Materials
    floorMatRef.current = new THREE.MeshStandardMaterial({ color: activeFloorMat.color, side: THREE.DoubleSide });
    wallMatRef.current = new THREE.MeshStandardMaterial({ color: activeWallMat.color, transparent: true, opacity: 0.95, roughness: 0.8 });

    // Floor Base
    const baseGeo = new THREE.PlaneGeometry(100, 100);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, side: THREE.DoubleSide });
    const baseFloor = new THREE.Mesh(baseGeo, baseMat);
    baseFloor.rotation.x = -Math.PI / 2;
    baseFloor.position.y = -0.05; // Dropped slightly further down to prevent z-fighting
    baseFloor.receiveShadow = true;
    baseFloor.name = 'baseFloor';
    scene.add(baseFloor);
    objectsRef.current.push(baseFloor);

    // Bounding Box for Camera
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    rooms.forEach(r => {
      minX = Math.min(minX, r.x - r.w / 2);
      maxX = Math.max(maxX, r.x + r.w / 2);
      minZ = Math.min(minZ, r.y - r.h / 2);
      maxZ = Math.max(maxZ, r.y + r.h / 2);
    });
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const spanX = maxX - minX;
    const spanZ = maxZ - minZ;
    const maxSpan = Math.max(spanX, spanZ, 8);

    camera.position.set(centerX, maxSpan * 0.9, centerZ + maxSpan * 0.7);
    controls.target.set(centerX, 0, centerZ);
    controls.update();

    const wallThickness = 0.2;
    const wallHeight = 2.8;

    rooms.forEach((room) => {
      // Room floor
      const fGeo = new THREE.PlaneGeometry(room.w, room.h);
      const fMesh = new THREE.Mesh(fGeo, floorMatRef.current);
      fMesh.rotation.x = -Math.PI / 2;
      fMesh.position.set(room.x, 0, room.y);
      fMesh.receiveShadow = true;
      scene.add(fMesh);
      objectsRef.current.push(fMesh);

      // Walls
      const buildWall = (geo, x, z) => {
        const wall = new THREE.Mesh(geo, wallMatRef.current);
        wall.position.set(x, wallHeight / 2, z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        addEdges(wall, 0xffffff, 0.2); // Light edges for definition
        scene.add(wall);
      };

      const wNGeo = new THREE.BoxGeometry(room.w + wallThickness * 2, wallHeight, wallThickness);
      const wEGeo = new THREE.BoxGeometry(wallThickness, wallHeight, room.h);

      buildWall(wNGeo, room.x, room.y - room.h / 2 - wallThickness / 2); // North
      buildWall(wNGeo, room.x, room.y + room.h / 2 + wallThickness / 2); // South
      buildWall(wEGeo, room.x + room.w / 2 + wallThickness / 2, room.y); // East
      buildWall(wEGeo, room.x - room.w / 2 - wallThickness / 2, room.y); // West

      // Furniture
      const furnitureId = ROOM_FURNITURE[room.type];
      if (furnitureId) {
        const fItem = FURNITURE.find(f => f.id === furnitureId);
        if (fItem && fItem.w < room.w - 0.4 && fItem.d < room.h - 0.4) {
          const mGeo = new THREE.BoxGeometry(fItem.w, fItem.h, fItem.d);
          const mMat = new THREE.MeshStandardMaterial({ color: fItem.color, roughness: 0.6 });
          const mMesh = new THREE.Mesh(mGeo, mMat);
          mMesh.position.set(room.x, fItem.h / 2, room.y);
          mMesh.castShadow = true;
          mMesh.receiveShadow = true;
          addEdges(mMesh);
          scene.add(mMesh);
        }
      }

      // Label
      const label = createLabelSprite(room.name);
      label.position.set(room.x, wallHeight + 0.5, room.y);
      scene.add(label);
    });

    // Raycaster Interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (e) => {
      const current = selectedFurnitureRef.current;
      if (!current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(objectsRef.current);

      if (intersects.length > 0) {
        const p = intersects[0].point;
        const fItem = FURNITURE.find(f => f.id === current);
        if (fItem) {
          const mGeo = new THREE.BoxGeometry(fItem.w, fItem.h, fItem.d);
          const mMat = new THREE.MeshStandardMaterial({ color: fItem.color, roughness: 0.6 });
          const mMesh = new THREE.Mesh(mGeo, mMat);
          mMesh.position.set(p.x, fItem.h / 2, p.z);
          mMesh.castShadow = true;
          mMesh.receiveShadow = true;
          addEdges(mMesh);
          scene.add(mMesh);
        }
      }
    };
    renderer.domElement.addEventListener('click', onClick);

    // Render loop
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
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
      cancelAnimationFrame(animationFrameId);
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      objectsRef.current = [];
    };
  }, [layoutData, hasRooms]); // Removed active materials from dependency array

  // Dynamic Material Updates (No flashing or scene rebuilding!)
  useEffect(() => {
    if (floorMatRef.current) floorMatRef.current.color.setHex(activeFloorMat.color);
  }, [activeFloorMat]);

  useEffect(() => {
    if (wallMatRef.current) wallMatRef.current.color.setHex(activeWallMat.color);
  }, [activeWallMat]);

  const exportOBJ = () => {
    if (!sceneRef.current) return;
    try {
      const exporter = new OBJExporter();
      const result = exporter.parse(sceneRef.current);
      
      const blob = new Blob([result], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = url;
      link.download = 'floorplan.obj';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('OBJ exported successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to export OBJ.');
    }
  };

  if (!hasRooms) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0f1117] flex flex-col items-center justify-center text-center p-6">
        <AlertCircle size={48} className="text-slate-500 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">No 3D layout data available</h2>
        <p className="text-slate-400 max-w-md mb-6">Generate a floorplan from a text description first, then use "View in 3D" to see the real layout.</p>
        <Button onClick={onClose} className="bg-white text-black hover:bg-slate-200">Close</Button>
      </div>
    );
  }

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
                    <div className="w-full h-4 rounded mb-1" style={{ backgroundColor: '#' + m.color.toString(16).padStart(6, '0') }}></div>
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
                    <div className="w-full h-4 rounded mb-1 border border-white/20" style={{ backgroundColor: '#' + m.color.toString(16).padStart(6, '0') }}></div>
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
            <div className="bg-black/50 backdrop-blur-md text-white text-xs px-4 py-2 rounded-full border border-white/10 pointer-events-auto shadow-xl">
              Drag to orbit • Scroll to zoom
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}