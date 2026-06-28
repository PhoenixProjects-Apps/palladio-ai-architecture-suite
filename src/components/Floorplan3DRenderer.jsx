import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Box, Sparkles, AlertCircle, Image as ImageIcon, Download } from 'lucide-react';
import { toast } from 'sonner';

const FURNITURE = {
  sofa: { color: 0x334155, w: 2, d: 0.9, h: 0.8 },
  bed: { color: 0xe2e8f0, w: 1.6, d: 2, h: 0.5 },
  table: { color: 0x8b5cf6, w: 1.8, d: 0.9, h: 0.75 },
  desk: { color: 0x475569, w: 1.2, d: 0.6, h: 0.75 },
  tub: { color: 0xffffff, w: 1.7, d: 0.7, h: 0.6 },
  counter: { color: 0x94a3b8, w: 2, d: 0.6, h: 0.9 }
};

const ROOM_FURNITURE = {
  living: 'sofa', bedroom: 'bed', kitchen: 'counter', bathroom: 'tub',
  dining: 'table', office: 'desk', study: 'desk'
};

const PRESETS = [
  'Warm sunset lighting, photorealistic',
  'Scandinavian minimalist, soft daylight',
  'Luxury real estate photography, evening',
  'Tropical resort style, lush greenery'
];

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

function addEdges(mesh, color = 0x000000, opacity = 0.15) {
  const edges = new THREE.EdgesGeometry(mesh.geometry);
  const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
  mesh.add(line);
}

export default function Floorplan3DRenderer({ layoutData, floorplanImage, onRequireFloorplan }) {
  const containerRef = useRef(null);
  const [prompt, setPrompt] = useState('');
  const [isRendering, setIsRendering] = useState(false);
  const [renderResult, setRenderResult] = useState(null);
  const hasRooms = layoutData?.rooms?.length > 0;

  // Bird's-eye 3D scene — camera locked to a high top-down angle (no orbit rotation).
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

    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1117);

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableRotate = false; // permanently bird's eye
    controls.enablePan = true;
    controls.enableZoom = true;

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    const floorMat = new THREE.MeshStandardMaterial({ color: 0xd97706, side: THREE.DoubleSide });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, roughness: 0.8 });

    const baseGeo = new THREE.PlaneGeometry(100, 100);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, side: THREE.DoubleSide });
    const baseFloor = new THREE.Mesh(baseGeo, baseMat);
    baseFloor.rotation.x = -Math.PI / 2;
    baseFloor.position.y = -0.05;
    baseFloor.receiveShadow = true;
    scene.add(baseFloor);

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    rooms.forEach(r => {
      minX = Math.min(minX, r.x - r.w / 2);
      maxX = Math.max(maxX, r.x + r.w / 2);
      minZ = Math.min(minZ, r.y - r.h / 2);
      maxZ = Math.max(maxZ, r.y + r.h / 2);
    });
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const maxSpan = Math.max(maxX - minX, maxZ - minZ, 8);

    // Bird's eye: high above, looking down at a steep angle.
    camera.position.set(centerX, maxSpan * 1.2, centerZ + maxSpan * 0.35);
    controls.target.set(centerX, 0, centerZ);
    controls.update();

    const wallThickness = 0.2;
    const wallHeight = 2.8;

    rooms.forEach((room) => {
      const fGeo = new THREE.PlaneGeometry(room.w, room.h);
      const fMesh = new THREE.Mesh(fGeo, floorMat);
      fMesh.rotation.x = -Math.PI / 2;
      fMesh.position.set(room.x, 0, room.y);
      fMesh.receiveShadow = true;
      scene.add(fMesh);

      const buildWall = (geo, x, z) => {
        const wall = new THREE.Mesh(geo, wallMat);
        wall.position.set(x, wallHeight / 2, z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        addEdges(wall, 0xffffff, 0.2);
        scene.add(wall);
      };

      const wNGeo = new THREE.BoxGeometry(room.w + wallThickness * 2, wallHeight, wallThickness);
      const wEGeo = new THREE.BoxGeometry(wallThickness, wallHeight, room.h);
      buildWall(wNGeo, room.x, room.y - room.h / 2 - wallThickness / 2);
      buildWall(wNGeo, room.x, room.y + room.h / 2 + wallThickness / 2);
      buildWall(wEGeo, room.x + room.w / 2 + wallThickness / 2, room.y);
      buildWall(wEGeo, room.x - room.w / 2 - wallThickness / 2, room.y);

      const furnitureId = ROOM_FURNITURE[room.type];
      if (furnitureId) {
        const fItem = FURNITURE[furnitureId];
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

      const label = createLabelSprite(room.name);
      label.position.set(room.x, wallHeight + 0.5, room.y);
      scene.add(label);
    });

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
      cancelAnimationFrame(animationFrameId);
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [layoutData, hasRooms]);

  const handleRender = async () => {
    if (!floorplanImage) {
      toast.error('Generate a floorplan first.');
      return;
    }
    setIsRendering(true);
    try {
      const tokenRes = await base44.functions.invoke('consumeToken', { amount: 5 });
      if (tokenRes.data?.error) {
        toast.error("You don't have enough AI tokens. Rendering requires 5 tokens. Please upgrade your plan.");
        setIsRendering(false);
        return;
      }
      const fullPrompt = `3D architectural floorplan render, bird's eye view, top-down isometric 3D visualization, photorealistic materials and lighting, detailed roof cutaway showing furnished rooms. ${prompt}. Keep the exact room layout and proportions from the reference floorplan.`;
      const res = await base44.integrations.Core.GenerateImage({
        prompt: fullPrompt,
        existing_image_urls: [floorplanImage]
      });
      setRenderResult(res.url);
    } catch (err) {
      console.error(err);
      toast.error('Render failed. Please try again.');
    } finally {
      setIsRendering(false);
    }
  };

  if (!hasRooms || !floorplanImage) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white/5 border border-white/10 rounded-3xl border-dashed">
        <AlertCircle size={48} className="text-slate-600 mb-4" />
        <h3 className="text-lg font-medium text-slate-300">No floorplan to render</h3>
        <p className="text-slate-500 text-sm mt-2 max-w-md mb-6">Generate a floorplan from a text description first — the 3D renderer uses that layout.</p>
        <Button onClick={onRequireFloorplan} className="bg-violet-600 hover:bg-violet-700 text-white h-11 rounded-xl">
          <Box size={18} className="mr-2" /> Go to Floorplan Generator
        </Button>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[360px_1fr] gap-8">
      {/* Prompt + render result */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
        <div>
          <label className="text-sm font-medium text-slate-400 mb-3 block">Render prompt</label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="E.g., warm sunset lighting, photorealistic, landscaped garden surroundings..."
            className="bg-slate-900 border-slate-700 text-white min-h-[110px] rounded-xl mb-3"
          />
          <div className="flex flex-wrap gap-2 mb-4">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setPrompt(p)}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
          <Button
            onClick={handleRender}
            disabled={isRendering}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white h-12 rounded-xl shadow-lg shadow-violet-500/20"
          >
            {isRendering ? <><Loader2 size={18} className="animate-spin mr-2" /> Rendering...</> : <><Sparkles size={18} className="mr-2" /> Render 3D Floorplan</>}
          </Button>
          <p className="text-xs text-slate-500 mt-2 text-center">Uses 5 AI tokens per render</p>
        </div>

        <div>
          {renderResult ? (
            <div className="space-y-3 animate-in fade-in duration-500">
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-lg">
                <img src={renderResult} alt="3D floorplan render" className="w-full h-auto" />
              </div>
              <a href={renderResult} download="3d-floorplan-render.png" target="_blank" rel="noreferrer">
                <Button className="w-full bg-white text-black hover:bg-slate-200 h-11 rounded-xl">
                  <Download size={18} className="mr-2" /> Download Render
                </Button>
              </a>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-6 bg-slate-900 rounded-2xl border border-dashed border-white/10">
              <ImageIcon size={32} className="text-slate-600 mb-2" />
              <p className="text-slate-500 text-sm">Your rendered 3D floorplan will appear here.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bird's-eye 3D viewer */}
      <div className="flex flex-col min-w-0">
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-xl relative h-[460px] lg:h-full lg:min-h-[520px]">
          <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-md text-white text-xs px-4 py-2 rounded-full border border-white/10">
            Bird's eye view • Scroll to zoom • Drag to pan
          </div>
          <div className="w-full h-full" ref={containerRef} />
        </div>
      </div>
    </div>
  );
}