import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  PlanLayout,
  Room,
  ThreeDStyle,
  ThreeDBackground,
  ThreeDActiveTool,
  ThreeDViewAngle
} from '../types/plan';
import {
  Maximize2,
  Minimize2,
  Box,
  Layers,
  Info
} from 'lucide-react';

export interface ThreeDVisualizerProps {
  layout: PlanLayout;
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string | null) => void;
  styleMode?: ThreeDStyle;
  backgroundMode?: ThreeDBackground;
  activeTool?: ThreeDActiveTool;
  viewAngle?: ThreeDViewAngle;
  onViewAngleChange?: (angle: ThreeDViewAngle) => void;
  onResetCamera?: () => void;
  className?: string;
}

// Procedural textures
function createOakTexture(colorA = '#E5C9A4', colorB = '#BA9768'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = colorA;
  ctx.fillRect(0, 0, 512, 512);

  const plankH = 48;
  for (let y = 0; y < 512; y += plankH) {
    ctx.strokeStyle = 'rgba(90, 55, 25, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();

    const offset = (y / plankH) % 2 === 0 ? 160 : 320;
    ctx.beginPath();
    ctx.moveTo(offset, y);
    ctx.lineTo(offset, y + plankH);
    ctx.moveTo((offset + 256) % 512, y);
    ctx.lineTo((offset + 256) % 512, y + plankH);
    ctx.stroke();

    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = colorB;
      ctx.globalAlpha = 0.12;
      ctx.fillRect(0, y + i * 10, 512, 2);
      ctx.globalAlpha = 1.0;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createBeigeTileTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#F4EDE4';
  ctx.fillRect(0, 0, 512, 512);

  const tileSize = 64;
  ctx.strokeStyle = '#D9CEBF';
  ctx.lineWidth = 2;

  for (let x = 0; x <= 512; x += tileSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y <= 512; y += tileSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.5, 2.5);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createPaverTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#C8D1DC';
  ctx.fillRect(0, 0, 512, 512);

  const bw = 64;
  const bh = 32;
  ctx.strokeStyle = '#8E9BAE';
  ctx.lineWidth = 2;

  let row = 0;
  for (let y = 0; y <= 512; y += bh) {
    const shift = (row % 2) * (bw / 2);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();

    for (let x = shift; x <= 512 + bw; x += bw) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + bh);
      ctx.stroke();
    }
    row++;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export const ThreeDVisualizer: React.FC<ThreeDVisualizerProps> = ({
  layout,
  selectedRoomId,
  onSelectRoom,
  styleMode = 'realistic',
  backgroundMode = 'soft_white',
  activeTool = 'orbit',
  viewAngle = 'isometric',
  onViewAngleChange,
  onResetCamera,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [internalCutaway, setInternalCutaway] = useState<boolean>(true);
  const [hoveredRoom, setHoveredRoom] = useState<Room | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [cameraMatrix, setCameraMatrix] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });

  // Three.js internal references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const houseGroupRef = useRef<THREE.Group | null>(null);
  const groundMeshRef = useRef<THREE.Mesh | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const roomMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const requestRef = useRef<number | null>(null);

  const isSoftwareGlRef = useRef<boolean>(false);

  // Setup Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    try {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (gl) {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const gpu = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        isSoftwareGlRef.current = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      }
    } catch {
      isSoftwareGlRef.current = false;
    }

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 580;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#EBF1F8'); // Soft cool-grey/blue tint as reference
    scene.fog = new THREE.Fog('#EBF1F8', 45, 180);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.5, 450);
    const cx = layout.plot.width / 2;
    const cz = layout.plot.length / 2;
    camera.position.set(cx + 38, 36, cz + 42);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGlRef.current,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGlRef.current ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = !isSoftwareGlRef.current;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.replaceChildren(renderer.domElement);

    // Studio Environment lighting reflection
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 15;
    controls.maxDistance = 160;
    controls.target.set(cx, 1.2, cz);
    controlsRef.current = controls;

    // Lighting
    const hemiLight = new THREE.HemisphereLight('#FFFFFF', '#CBD5E1', 0.85);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight('#FFFBF2', 1.45);
    sunLight.position.set(cx + 40, 60, cz + 25);
    sunLight.castShadow = !isSoftwareGlRef.current;
    if (sunLight.castShadow) {
      sunLight.shadow.mapSize.width = 1024;
      sunLight.shadow.mapSize.height = 1024;
      sunLight.shadow.camera.near = 5;
      sunLight.shadow.camera.far = 170;
      const d = 55;
      sunLight.shadow.camera.left = -d;
      sunLight.shadow.camera.right = d;
      sunLight.shadow.camera.top = d;
      sunLight.shadow.camera.bottom = -d;
      sunLight.shadow.bias = -0.0003;
    }
    scene.add(sunLight);

    const softFill = new THREE.DirectionalLight('#93C5FD', 0.35);
    softFill.position.set(cx - 35, 30, cz - 30);
    scene.add(softFill);

    // Ground Plane: Garden Site surrounded by clean grass & pavers
    const groundGeo = new THREE.PlaneGeometry(300, 300);
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#EBF1F8',
      roughness: 0.95,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(cx, -0.05, cz);
    ground.receiveShadow = !isSoftwareGlRef.current;
    scene.add(ground);
    groundMeshRef.current = ground;

    // Animation Loop
    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);
      controls.update();

      // Track camera direction for XYZ indicator
      if (cameraRef.current && controlsRef.current) {
        const dx = cameraRef.current.position.x - controlsRef.current.target.x;
        const dy = cameraRef.current.position.y - controlsRef.current.target.y;
        const dz = cameraRef.current.position.z - controlsRef.current.target.z;
        setCameraMatrix({ x: dx, y: dy, z: dz });
      }

      renderer.render(scene, camera);
    };
    requestRef.current = requestAnimationFrame(animate);

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newWidth, height: newHeight } = entry.contentRect;
        if (newWidth > 0 && newHeight > 0) {
          camera.aspect = newWidth / newHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(newWidth, newHeight);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      resizeObserver.disconnect();
      renderer.dispose();
      controls.dispose();
      scene.clear();
    };
  }, []);

  // Update background
  useEffect(() => {
    const scene = sceneRef.current;
    const ground = groundMeshRef.current;
    if (!scene || !ground) return;

    const bgColors: Record<ThreeDBackground, { bg: string; ground: string }> = {
      soft_white: { bg: '#EBF1F8', ground: '#E4ECF4' }, // Reference image default
      pale_blue: { bg: '#E0EAF6', ground: '#D6E2F0' },
      charcoal: { bg: '#161D29', ground: '#1E2636' },
      landscape: { bg: '#E3EFE0', ground: '#85A872' },
      warm_ground: { bg: '#F8F4EE', ground: '#E5DCB6' },
    };

    const sel = bgColors[backgroundMode] || bgColors.soft_white;
    scene.background = new THREE.Color(sel.bg);
    scene.fog = new THREE.Fog(sel.bg, 40, 180);
    if (ground.material instanceof THREE.MeshStandardMaterial) {
      ground.material.color.set(sel.ground);
    }
  }, [backgroundMode]);

  // Handle active tool mode (orbit / pan / zoom)
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (activeTool === 'pan') {
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      };
    } else {
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      };
    }
  }, [activeTool]);

  // Procedural 3D House Builder with Furniture & Trees
  const rebuildHouse = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (houseGroupRef.current) {
      scene.remove(houseGroupRef.current);
      houseGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }

    const houseGroup = new THREE.Group();
    houseGroupRef.current = houseGroup;
    roomMeshesRef.current.clear();

    const { width: plotW, length: plotL } = layout.plot;
    const isWireframe = styleMode === 'wireframe';
    const isModern = styleMode === 'modern';
    const wallHeight = internalCutaway ? 3.6 : 9.5;
    const wallThick = 0.45;

    // Shared Materials
    const oakTex = createOakTexture();
    const tileTex = createBeigeTileTexture();
    const paverTex = createPaverTexture();

    const exteriorWallMat = new THREE.MeshStandardMaterial({
      color: isModern ? '#FFFFFF' : '#F7F5EE',
      roughness: 0.88,
      wireframe: isWireframe,
    });

    const interiorWallMat = new THREE.MeshStandardMaterial({
      color: isModern ? '#FFFFFF' : '#FCFAF4',
      roughness: 0.85,
      wireframe: isWireframe,
    });

    const frameMat = new THREE.MeshStandardMaterial({
      color: '#1E293B',
      roughness: 0.6,
      wireframe: isWireframe,
    });

    const doorLeafMat = new THREE.MeshStandardMaterial({
      color: '#8B5A2B',
      roughness: 0.7,
      wireframe: isWireframe,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#BAE6FD',
      transparent: true,
      opacity: 0.45,
      transmission: 0.8,
      roughness: 0.1,
    });

    // 1. Concrete Foundation Plinth & Green Site
    const plinthH = 0.45;
    const siteGroup = new THREE.Group();

    // Inner concrete plinth slab
    const plinthGeo = new THREE.BoxGeometry(plotW + 0.8, plinthH, plotL + 0.8);
    const plinthMat = new THREE.MeshStandardMaterial({ color: '#DCE2E9', roughness: 0.95 });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.set(plotW / 2, plinthH / 2, plotL / 2);
    plinth.receiveShadow = !isSoftwareGlRef.current;
    siteGroup.add(plinth);

    // Surrounding Green Turf Border
    const turfGeo = new THREE.BoxGeometry(plotW + 12, 0.15, plotL + 12);
    const turfMat = new THREE.MeshStandardMaterial({ color: '#7EA665', roughness: 0.95 });
    const turf = new THREE.Mesh(turfGeo, turfMat);
    turf.position.set(plotW / 2, 0.07, plotL / 2);
    turf.receiveShadow = !isSoftwareGlRef.current;
    siteGroup.add(turf);

    // Perimeter Boxwood Hedge (Low green hedges along boundary as in reference)
    const hedgeMat = new THREE.MeshStandardMaterial({ color: '#4E7D3A', roughness: 0.92 });
    const hedgeW = plotW + 10;
    const hedgeL = plotL + 10;
    const hedgeH = 1.6;

    // Top & Bottom hedges
    const hTop = new THREE.Mesh(new THREE.BoxGeometry(hedgeW, hedgeH, 1.2), hedgeMat);
    hTop.position.set(plotW / 2, hedgeH / 2, plotL / 2 - hedgeL / 2);
    siteGroup.add(hTop);

    const hBottom = new THREE.Mesh(new THREE.BoxGeometry(hedgeW - 8, hedgeH, 1.2), hedgeMat);
    hBottom.position.set(plotW / 2 + 4, hedgeH / 2, plotL / 2 + hedgeL / 2);
    siteGroup.add(hBottom);

    // Left & Right hedges
    const hLeft = new THREE.Mesh(new THREE.BoxGeometry(1.2, hedgeH, hedgeL), hedgeMat);
    hLeft.position.set(plotW / 2 - hedgeW / 2, hedgeH / 2, plotL / 2);
    siteGroup.add(hLeft);

    const hRight = new THREE.Mesh(new THREE.BoxGeometry(1.2, hedgeH, hedgeL), hedgeMat);
    hRight.position.set(plotW / 2 + hedgeW / 2, hedgeH / 2, plotL / 2);
    siteGroup.add(hRight);

    // 4 Miniature Architectural Trees along perimeter (as in reference image)
    const treePositions = [
      { x: plotW / 2 - hedgeW / 2 - 1.5, z: plotL / 2 - hedgeL / 2 + 2 },
      { x: plotW / 2 + hedgeW / 2 + 1.5, z: plotL / 2 - hedgeL / 2 + 3 },
      { x: plotW / 2 - hedgeW / 2 - 1.5, z: plotL / 2 + hedgeL / 2 - 4 },
      { x: plotW / 2 + hedgeW / 2 + 1.5, z: plotL / 2 + hedgeL / 2 - 2 },
    ];
    treePositions.forEach((pos) => {
      const tree = new THREE.Group();
      // Trunk
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.4, 3.5, 8),
        new THREE.MeshStandardMaterial({ color: '#5C4033', roughness: 0.9 })
      );
      trunk.position.set(pos.x, 1.75, pos.z);
      trunk.castShadow = !isSoftwareGlRef.current;
      tree.add(trunk);

      // Spherical Leaf Canopy
      const canopy = new THREE.Mesh(
        new THREE.SphereGeometry(2.4, 12, 10),
        new THREE.MeshStandardMaterial({ color: '#4B7B36', roughness: 0.85 })
      );
      canopy.position.set(pos.x, 4.2, pos.z);
      canopy.castShadow = !isSoftwareGlRef.current;
      tree.add(canopy);
      siteGroup.add(tree);
    });

    houseGroup.add(siteGroup);

    // Helper: Furniture generators
    const addBed = (x: number, z: number, rotation = 0) => {
      if (isWireframe) return;
      const bed = new THREE.Group();
      // Bed base
      const base = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.1, 6.2), new THREE.MeshStandardMaterial({ color: '#5A3D28' }));
      base.position.set(0, 0.55, 0);
      bed.add(base);
      // Mattress
      const mattress = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.6, 5.8), new THREE.MeshStandardMaterial({ color: '#FFFFFF' }));
      mattress.position.set(0, 1.15, 0.1);
      bed.add(mattress);
      // Duvet / Blanket
      const blanket = new THREE.Mesh(new THREE.BoxGeometry(5.05, 0.12, 3.8), new THREE.MeshStandardMaterial({ color: '#3A6073' }));
      blanket.position.set(0, 1.48, 1.0);
      bed.add(blanket);
      // Pillows
      const p1 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 1.2), new THREE.MeshStandardMaterial({ color: '#F1F5F9' }));
      p1.position.set(-1.3, 1.55, -1.8);
      bed.add(p1);
      const p2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 1.2), new THREE.MeshStandardMaterial({ color: '#F1F5F9' }));
      p2.position.set(1.3, 1.55, -1.8);
      bed.add(p2);
      // Nightstands
      const n1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 1.2), new THREE.MeshStandardMaterial({ color: '#C4A47C' }));
      n1.position.set(-3.4, 0.45, -1.8);
      bed.add(n1);
      const n2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 1.2), new THREE.MeshStandardMaterial({ color: '#C4A47C' }));
      n2.position.set(3.4, 0.45, -1.8);
      bed.add(n2);

      bed.position.set(x, plinthH, z);
      bed.rotation.y = rotation;
      houseGroup.add(bed);
    };

    const addSofaAndLiving = (x: number, z: number) => {
      if (isWireframe) return;
      const grp = new THREE.Group();
      // Rug
      const rug = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.05, 5.5), new THREE.MeshStandardMaterial({ color: '#E2E8F0' }));
      rug.position.set(0, 0.05, 0);
      grp.add(rug);
      // 3-seater Sofa
      const sofa = new THREE.Mesh(new THREE.BoxGeometry(6.2, 1.4, 2.2), new THREE.MeshStandardMaterial({ color: '#CBD5E1' }));
      sofa.position.set(0, 0.7, -1.8);
      grp.add(sofa);
      // Coffee Table
      const table = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.8, 2.0), new THREE.MeshStandardMaterial({ color: '#E8D5B5' }));
      table.position.set(0, 0.4, 0.4);
      grp.add(table);
      // TV Unit
      const tvStand = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.9, 1.2), new THREE.MeshStandardMaterial({ color: '#1E293B' }));
      tvStand.position.set(0, 0.45, 2.8);
      grp.add(tvStand);
      const tvScreen = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.0, 0.15), new THREE.MeshStandardMaterial({ color: '#09090B' }));
      tvScreen.position.set(0, 1.9, 2.8);
      grp.add(tvScreen);

      grp.position.set(x, plinthH, z);
      houseGroup.add(grp);
    };

    const addDiningTable = (x: number, z: number) => {
      if (isWireframe) return;
      const grp = new THREE.Group();
      // Table top
      const top = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.2, 3.2), new THREE.MeshStandardMaterial({ color: '#8B5A2B' }));
      top.position.set(0, 1.3, 0);
      grp.add(top);
      // Legs
      for (const lx of [-2.3, 2.3]) {
        for (const lz of [-1.3, 1.3]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.3, 0.25), new THREE.MeshStandardMaterial({ color: '#5A3D28' }));
          leg.position.set(lx, 0.65, lz);
          grp.add(leg);
        }
      }
      // 6 Chairs
      const chairPos = [
        { cx: -1.6, cz: -2.0, rot: 0 },
        { cx: 0, cz: -2.0, rot: 0 },
        { cx: 1.6, cz: -2.0, rot: 0 },
        { cx: -1.6, cz: 2.0, rot: Math.PI },
        { cx: 0, cz: 2.0, rot: Math.PI },
        { cx: 1.6, cz: 2.0, rot: Math.PI },
      ];
      chairPos.forEach((cp) => {
        const chair = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.6, 1.1), new THREE.MeshStandardMaterial({ color: '#C4A47C' }));
        chair.position.set(cp.cx, 0.8, cp.cz);
        chair.rotation.y = cp.rot;
        grp.add(chair);
      });

      grp.position.set(x, plinthH, z);
      houseGroup.add(grp);
    };

    const addWhiteCar = (x: number, z: number) => {
      if (isWireframe) return;
      const car = new THREE.Group();
      // Car Body
      const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.4, 7.8), new THREE.MeshStandardMaterial({ color: '#F8FAFC', metalness: 0.2, roughness: 0.3 }));
      body.position.set(0, 1.0, 0);
      car.add(body);
      // Cabin / Roof
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.1, 4.4), new THREE.MeshStandardMaterial({ color: '#0F172A', roughness: 0.1 }));
      cabin.position.set(0, 2.1, -0.4);
      car.add(cabin);
      // Wheels
      for (const wx of [-2.1, 2.1]) {
        for (const wz of [-2.2, 2.2]) {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.4, 12), new THREE.MeshStandardMaterial({ color: '#1E293B' }));
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(wx, 0.65, wz);
          car.add(wheel);
        }
      }
      car.position.set(x, plinthH, z);
      houseGroup.add(car);
    };

    // 2. Room Floor Slabs & Perimeter Walls
    layout.rooms.forEach((room) => {
      const isSelected = room.id === selectedRoomId;
      const isWetArea = room.type.includes('bath') || room.type.includes('kitchen');
      const isBalcony = room.type === 'balcony';
      const isParking = room.type === 'parking';

      // Floor Material
      let roomFloorTex = tileTex;
      if (room.type.includes('bed')) roomFloorTex = oakTex;
      if (isParking || isBalcony) roomFloorTex = paverTex;

      const floorMat = new THREE.MeshStandardMaterial({
        map: isWireframe ? null : roomFloorTex,
        color: isWireframe ? '#2B66F6' : '#FFFFFF',
        roughness: isWetArea ? 0.35 : 0.68,
        wireframe: isWireframe,
      });

      if (isSelected) {
        floorMat.emissive = new THREE.Color('#2B66F6');
        floorMat.emissiveIntensity = 0.3;
      }

      const floorGeo = new THREE.BoxGeometry(room.width - 0.08, 0.1, room.length - 0.08);
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.position.set(room.x + room.width / 2, plinthH + 0.05, room.y + room.length / 2);
      floorMesh.receiveShadow = !isSoftwareGlRef.current;
      floorMesh.userData = { roomId: room.id, room };

      houseGroup.add(floorMesh);
      roomMeshesRef.current.set(room.id, floorMesh);

      // Place realistic procedural furniture based on room type
      const cx = room.x + room.width / 2;
      const cz = room.y + room.length / 2;

      if (room.type.includes('bed')) {
        addBed(cx, cz, room.width > room.length ? Math.PI / 2 : 0);
      } else if (room.type === 'living') {
        addSofaAndLiving(cx, cz);
      } else if (room.type === 'dining') {
        addDiningTable(cx, cz);
      } else if (room.type === 'parking') {
        addWhiteCar(cx, cz);
      }

      // Walls
      const createWallSegment = (
        wx: number,
        wz: number,
        wWidth: number,
        wLength: number,
        isExterior: boolean,
        hasDoor = false,
        hasWindow = false
      ) => {
        if (hasDoor) {
          const doorW = Math.min(2.8, wWidth > wLength ? wWidth * 0.35 : wLength * 0.35);
          const isAlongX = wWidth > wLength;
          const halfSeg = (isAlongX ? wWidth - doorW : wLength - doorW) / 2;

          if (halfSeg > 0.4) {
            const segA = new THREE.Mesh(
              isAlongX ? new THREE.BoxGeometry(halfSeg, wallHeight, wLength) : new THREE.BoxGeometry(wWidth, wallHeight, halfSeg),
              isExterior ? exteriorWallMat : interiorWallMat
            );
            segA.position.set(
              isAlongX ? wx - wWidth / 2 + halfSeg / 2 : wx,
              plinthH + wallHeight / 2,
              isAlongX ? wz : wz - wLength / 2 + halfSeg / 2
            );
            segA.castShadow = !isSoftwareGlRef.current;
            houseGroup.add(segA);

            const segB = new THREE.Mesh(
              isAlongX ? new THREE.BoxGeometry(halfSeg, wallHeight, wLength) : new THREE.BoxGeometry(wWidth, wallHeight, halfSeg),
              isExterior ? exteriorWallMat : interiorWallMat
            );
            segB.position.set(
              isAlongX ? wx + wWidth / 2 - halfSeg / 2 : wx,
              plinthH + wallHeight / 2,
              isAlongX ? wz : wz + wLength / 2 - halfSeg / 2
            );
            segB.castShadow = !isSoftwareGlRef.current;
            houseGroup.add(segB);
          }

          // Door leaf ajar
          if (!internalCutaway && !isWireframe) {
            const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(doorW - 0.1, 7.0, 0.12), doorLeafMat);
            doorLeaf.position.set(wx, plinthH + 3.5, wz);
            doorLeaf.rotation.y = Math.PI / 5;
            houseGroup.add(doorLeaf);
          }
          return;
        }

        if (hasWindow && !isWireframe) {
          const isAlongX = wWidth > wLength;
          const winW = Math.min(3.6, isAlongX ? wWidth * 0.45 : wLength * 0.45);
          const sillH = 1.0;
          const winH = internalCutaway ? 1.8 : 4.5;

          const sillMesh = new THREE.Mesh(
            isAlongX ? new THREE.BoxGeometry(wWidth, sillH, wLength) : new THREE.BoxGeometry(wWidth, sillH, wLength),
            isExterior ? exteriorWallMat : interiorWallMat
          );
          sillMesh.position.set(wx, plinthH + sillH / 2, wz);
          houseGroup.add(sillMesh);

          // Glass Pane
          const glassMesh = new THREE.Mesh(
            isAlongX ? new THREE.BoxGeometry(winW, winH, 0.08) : new THREE.BoxGeometry(0.08, winH, winW),
            glassMat
          );
          glassMesh.position.set(wx, plinthH + sillH + winH / 2, wz);
          houseGroup.add(glassMesh);

          // Frame
          const frameEdges = new THREE.LineSegments(
            new THREE.EdgesGeometry(isAlongX ? new THREE.BoxGeometry(winW, winH, wLength) : new THREE.BoxGeometry(wWidth, winH, winW)),
            new THREE.LineBasicMaterial({ color: '#1E293B', linewidth: 2 })
          );
          frameEdges.position.set(wx, plinthH + sillH + winH / 2, wz);
          houseGroup.add(frameEdges);

          const topH = Math.max(0.4, wallHeight - (sillH + winH));
          const topMesh = new THREE.Mesh(
            isAlongX ? new THREE.BoxGeometry(wWidth, topH, wLength) : new THREE.BoxGeometry(wWidth, topH, wLength),
            isExterior ? exteriorWallMat : interiorWallMat
          );
          topMesh.position.set(wx, plinthH + wallHeight - topH / 2, wz);
          houseGroup.add(topMesh);
          return;
        }

        // Solid wall
        const wallMesh = new THREE.Mesh(
          new THREE.BoxGeometry(wWidth, wallHeight, wLength),
          isExterior ? exteriorWallMat : interiorWallMat
        );
        wallMesh.position.set(wx, plinthH + wallHeight / 2, wz);
        wallMesh.castShadow = !isSoftwareGlRef.current;
        wallMesh.receiveShadow = !isSoftwareGlRef.current;
        houseGroup.add(wallMesh);
      };

      const isLeftExterior = room.x <= 2.5;
      const isRightExterior = room.x + room.width >= plotW - 2.5;
      const isTopExterior = room.y <= 2.5;
      const isBottomExterior = room.y + room.length >= plotL - 2.5;

      const hasTopDoor = room.doors?.some((d) => d.wall === 'top');
      const hasBottomDoor = room.doors?.some((d) => d.wall === 'bottom') || room.type === 'living';
      const hasLeftDoor = room.doors?.some((d) => d.wall === 'left');
      const hasRightDoor = room.doors?.some((d) => d.wall === 'right');

      const hasTopWin = room.windows?.some((w) => w.wall === 'top') || (isTopExterior && !hasTopDoor);
      const hasBottomWin = room.windows?.some((w) => w.wall === 'bottom');
      const hasLeftWin = room.windows?.some((w) => w.wall === 'left') || (isLeftExterior && !hasLeftDoor);
      const hasRightWin = room.windows?.some((w) => w.wall === 'right') || (isRightExterior && !hasRightDoor);

      createWallSegment(room.x + room.width / 2, room.y, room.width, wallThick, isTopExterior, hasTopDoor, hasTopWin);
      createWallSegment(room.x + room.width / 2, room.y + room.length, room.width, wallThick, isBottomExterior, hasBottomDoor, hasBottomWin);
      createWallSegment(room.x, room.y + room.length / 2, wallThick, room.length, isLeftExterior, hasLeftDoor, hasLeftWin);
      createWallSegment(room.x + room.width, room.y + room.length / 2, wallThick, room.length, isRightExterior, hasRightDoor, hasRightWin);
    });

    scene.add(houseGroup);

    if (controlsRef.current) {
      controlsRef.current.target.set(plotW / 2, plinthH + 1.2, plotL / 2);
    }
  }, [layout, styleMode, internalCutaway, selectedRoomId]);

  useEffect(() => {
    rebuildHouse();
  }, [rebuildHouse]);

  // View angle preset helper
  const applyViewAngle = useCallback((angle: ThreeDViewAngle) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const { width: plotW, length: plotL } = layout.plot;
    const cx = plotW / 2;
    const cz = plotL / 2;

    if (angle === 'top') {
      camera.position.set(cx, 75, cz + 0.01);
      controls.target.set(cx, 0, cz);
    } else if (angle === 'front') {
      camera.position.set(cx, 14, cz + 60);
      controls.target.set(cx, 3, cz);
    } else {
      // 3D Isometric View
      camera.position.set(cx + 38, 36, cz + 42);
      controls.target.set(cx, 1.2, cz);
    }
    controls.update();

    if (onViewAngleChange) {
      onViewAngleChange(angle);
    }
  }, [layout.plot, onViewAngleChange]);

  useEffect(() => {
    if (viewAngle) {
      applyViewAngle(viewAngle);
    }
  }, [viewAngle, applyViewAngle]);

  const toggleFullscreen = () => {
    const el = mountRef.current?.parentElement;
    if (!el) return;

    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = mountRef.current;
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    if (!container || !camera || !scene) return;

    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const meshes = Array.from(roomMeshesRef.current.values());
    const intersects = raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh;
      const roomId = hit.userData?.roomId;
      if (roomId) {
        onSelectRoom(roomId);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = mountRef.current;
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    if (!container || !camera || !scene) return;

    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const meshes = Array.from(roomMeshesRef.current.values());
    const intersects = raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh;
      setHoveredRoom(hit.userData?.room || null);
    } else {
      setHoveredRoom(null);
    }
  };

  return (
    <div className={`relative w-full h-full select-none overflow-hidden rounded-2xl bg-[#EBF1F8] border border-[#E2E8F0] ${className}`}>
      {/* 3D WebGL Canvas */}
      <div
        ref={mountRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        className="w-full h-full cursor-grab active:cursor-grabbing outline-none"
      />

      {/* Hovered / Selected Room Inspector HUD Pill */}
      {(hoveredRoom || selectedRoomId) && (
        <div className="absolute top-4 left-4 z-10 pointer-events-none animate-fade-in">
          {(() => {
            const activeRoom = hoveredRoom || layout.rooms.find((r) => r.id === selectedRoomId);
            if (!activeRoom) return null;
            return (
              <div className="px-3.5 py-2 rounded-xl bg-white/95 backdrop-blur-md border border-[#E2E8F0] shadow-md flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-[#2B66F6]" />
                <span className="font-bold text-[#0C1E38]">{activeRoom.name}</span>
                <span className="text-[#64748B]">
                  {activeRoom.width}×{activeRoom.length} ft ({Math.round(activeRoom.width * activeRoom.length)} sq.ft)
                </span>
              </div>
            );
          })()}
        </div>
      )}

      {/* Floating Bottom-Left Capsule Toolbar (Matches reference image!) */}
      <div className="absolute bottom-5 left-5 z-10 flex items-center gap-2.5 p-2 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E2E8F0] shadow-lg text-xs">
        {/* 3D Cube View */}
        <button
          onClick={() => applyViewAngle('isometric')}
          className="p-2 rounded-xl text-[#0C1E38] hover:bg-slate-100 transition cursor-pointer"
          title="Reset to 3D View"
        >
          <Box className="w-4 h-4 text-[#2B66F6]" />
        </button>

        {/* Dollhouse Cutaway Toggle */}
        <button
          onClick={() => setInternalCutaway(!internalCutaway)}
          className={`p-2 rounded-xl transition cursor-pointer ${
            internalCutaway ? 'bg-blue-50 text-[#2B66F6]' : 'text-[#64748B] hover:bg-slate-100'
          }`}
          title={internalCutaway ? 'Dollhouse Cutaway Active' : 'Full Walls Active'}
        >
          <Layers className="w-4 h-4" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-xl text-[#64748B] hover:bg-slate-100 transition cursor-pointer"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Info */}
        <button
          className="p-2 rounded-xl text-[#64748B] hover:bg-slate-100 transition cursor-pointer"
          title="Hold left-click to orbit, right-click to pan, scroll to zoom"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* Coordinate Tripod XYZ Indicator (Matches reference image bottom right!) */}
      <div className="absolute bottom-6 right-6 z-10 pointer-events-none flex items-center justify-center">
        <svg width="64" height="64" viewBox="-32 -32 64 64" className="overflow-visible">
          {/* Z Axis: Blue, pointing UP */}
          <line x1="0" y1="0" x2="0" y2="-24" stroke="#2B66F6" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="0" cy="-24" r="2.5" fill="#2B66F6" />
          <text x="0" y="-28" textAnchor="middle" fill="#2B66F6" fontSize="10" fontWeight="bold">Z</text>

          {/* X Axis: Red, pointing DOWN-RIGHT */}
          <line x1="0" y1="0" x2="22" y2="12" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="22" cy="12" r="2.5" fill="#EF4444" />
          <text x="26" y="16" textAnchor="start" fill="#EF4444" fontSize="10" fontWeight="bold">X</text>

          {/* Y Axis: Green, pointing UP-RIGHT */}
          <line x1="0" y1="0" x2="18" y2="-10" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="18" cy="-10" r="2.5" fill="#10B981" />
          <text x="22" y="-12" textAnchor="start" fill="#10B981" fontSize="10" fontWeight="bold">Y</text>

          {/* Center Origin Dot */}
          <circle cx="0" cy="0" r="3" fill="#0C1E38" />
        </svg>
      </div>
    </div>
  );
};
