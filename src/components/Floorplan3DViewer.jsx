// Calculate the overall bounding box of all rooms
let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
rooms.forEach(r => {
  minX = Math.min(minX, r.x - r.w / 2);
  maxX = Math.max(maxX, r.x + r.w / 2);
  minZ = Math.min(minZ, r.y - r.h / 2);
  maxZ = Math.max(maxZ, r.y + r.h / 2);
});

const wallThickness = 0.2;
const wallHeight = 2.8;

// 1. Draw the Outer Boundary (The Exterior Surface)
const outerShape = new THREE.Shape();
outerShape.moveTo(minX - wallThickness, minZ - wallThickness);
outerShape.lineTo(maxX + wallThickness, minZ - wallThickness);
outerShape.lineTo(maxX + wallThickness, maxZ + wallThickness);
outerShape.lineTo(minX - wallThickness, maxZ + wallThickness);
outerShape.lineTo(minX - wallThickness, minZ - wallThickness);

// 2. Draw the Inner Boundary as a "Hole" (The Interior Surface)
// Note: Holes must be drawn in the opposite direction (counter-clockwise) to the outer shape
const innerHole = new THREE.Path();
innerHole.moveTo(minX, minZ);
innerHole.lineTo(minX, maxZ); 
innerHole.lineTo(maxX, maxZ);
innerHole.lineTo(maxX, minZ);
innerHole.lineTo(minX, minZ);

// Punch the hole into the outer shape
outerShape.holes.push(innerHole);

// 3. Extrude the 2D shape into a 3D wall shell
const extrudeSettings = {
  depth: wallHeight,
  bevelEnabled: false // Keep edges sharp and architectural
};

const wallGeometry = new THREE.ExtrudeGeometry(outerShape, extrudeSettings);

// ExtrudeGeometry extrudes along the Z axis by default, so we rotate it to stand up on the Y axis
wallGeometry.rotateX(-Math.PI / 2);

// 4. Create the Mesh and add to scene
const externalWalls = new THREE.Mesh(wallGeometry, wallMatRef.current);
externalWalls.position.set(0, 0, 0); // Position is handled by the min/max coordinates
externalWalls.castShadow = true;
externalWalls.receiveShadow = true;

// Add crisp architectural edges
addEdges(externalWalls, 0xffffff, 0.2); 

scene.add(externalWalls);