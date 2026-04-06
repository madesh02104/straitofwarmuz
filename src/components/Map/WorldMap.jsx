import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import countriesData from '../../countries.json';
import { useGameStore } from '../../store/gameStore';

// Global drag-over state shared between WorldMap drop handler and CountryMesh
const dragOverState = { targetId: null };

const scale = 2.5;
function mapCoordinates(lon, lat) {
  return [lon / 180 * 100 * scale, lat / 90 * 50 * scale];
}

const mapPanState = { isDragging: false, dragDistance: 0 };

const normalize = (n) => {
  if (!n) return '';
  const map = {
    'United States of America': 'USA',
    'United Kingdom': 'UK'
  };
  const mapped = map[n] || n;
  return mapped.toLowerCase().trim();
};

function getCountryCentroid(feature) {
  const paths = feature.geometry.type === 'Polygon'
    ? [feature.geometry.coordinates]
    : feature.geometry.coordinates;
  let sumX = 0, sumY = 0, count = 0;
  for (const polygon of paths) {
    const coords = polygon[0];
    for (let i = 0; i < coords.length; i++) {
      const pt = mapCoordinates(coords[i][0], coords[i][1]);
      sumX += pt[0];
      sumY += pt[1];
      count++;
    }
  }
  return count > 0 ? [sumX / count, sumY / count] : [0, 0];
}

const threeContext = { camera: null, scene: null, meshes: [] };

const CountryMesh = ({ feature, myCountry, gameState, onFocus, phase }) => {
  const meshRef = useRef();
  const outlineRef = useRef();
  const [hovered, setHovered] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const name = feature.properties.name || feature.properties.ADMIN;
  const normalizedName = normalize(name);
  const normalizedMyCountry = normalize(myCountry);

  const players = Object.values(gameState?.players || {});
  
  let color = '#2a3a4a';
  let owner = null;
  const isMyCountry = normalizedName === normalizedMyCountry;

  for (let p of players) {
    if (normalize(p.country) === normalizedName) {
      owner = p;
      if (p.hp <= 0) color = '#050505';
      else color = '#f85149'; // All active countries are red (including player's own)
      break;
    }
  }

  const geometry = useMemo(() => {
    try {
      const paths = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
      const shapes = [];
      for (const polygon of paths) {
        let shape = new THREE.Shape();
        const coords = polygon[0];
        for (let i = 0; i < coords.length; i++) {
          const pt = mapCoordinates(coords[i][0], coords[i][1]);
          if (i === 0) shape.moveTo(pt[0], pt[1]);
          else {
            if (Math.abs(coords[i][0] - coords[i-1][0]) > 180) {
              shapes.push(shape);
              shape = new THREE.Shape();
              shape.moveTo(pt[0], pt[1]);
            } else shape.lineTo(pt[0], pt[1]);
          }
        }
        shapes.push(shape);
      }
      return new THREE.ShapeGeometry(shapes);
    } catch(err) { return null; }
  }, [feature]);

  const centroid = useMemo(() => getCountryCentroid(feature), [feature]);

  useEffect(() => {
    if (meshRef.current && owner) {
      const existing = threeContext.meshes.find(m => m.mesh === meshRef.current);
      if (!existing) {
        threeContext.meshes.push({ mesh: meshRef.current, ownerId: owner.socketId });
      } else {
        existing.ownerId = owner.socketId;
      }
    }
    return () => {
      threeContext.meshes = threeContext.meshes.filter(m => m.mesh !== meshRef.current);
    };
  }, [owner?.socketId]);

  // Check if this country is drag-over target
  useEffect(() => {
    if (!owner) return;
    const interval = setInterval(() => {
      setIsDragOver(dragOverState.targetId === owner.socketId);
    }, 50);
    return () => clearInterval(interval);
  }, [owner?.socketId]);

  useFrame(() => {
    if (meshRef.current) {
      const isHighlighted = isMyCountry || hovered || isDragOver;
      const targetZ = isHighlighted ? 0.5 : 0;
      meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, targetZ, 0.1);
      const targetScale = isDragOver ? 1.06 : (isMyCountry || hovered) ? 1.02 : 1.0;
      meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, 0.1));
      
      // Override color when dragged over
      if (isDragOver) {
        meshRef.current.material.color.lerp(new THREE.Color('#ffffff'), 0.2);
      }
    }
    // Sync outline with mesh
    if (outlineRef.current && meshRef.current) {
      outlineRef.current.position.copy(meshRef.current.position);
      outlineRef.current.scale.copy(meshRef.current.scale);
    }
  });

  if (!geometry) return null;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      userData={{ countryName: name, ownerId: owner?.socketId }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        if (mapPanState.dragDistance > 5) return;
        if (normalizedName === normalizedMyCountry) {
          e.stopPropagation();
          const box = new THREE.Box3().setFromObject(meshRef.current);
          const center = new THREE.Vector3();
          box.getCenter(center);
          onFocus(center);
        }
      }}
    >
      <meshBasicMaterial color={isDragOver ? '#ffffff' : color} transparent opacity={owner?.hp <= 0 ? 0.3 : 0.8} side={THREE.DoubleSide} />
      {/* White outline for player's own country */}
      {isMyCountry && owner && owner.hp > 0 && geometry && (
        <lineSegments geometry={new THREE.EdgesGeometry(geometry)} position={[0, 0, 0.1]}>
          <lineBasicMaterial color="#ffffff" linewidth={2} transparent opacity={0.9} />
        </lineSegments>
      )}
      {gameState?.lobbyState === 'active' && owner && owner.hp > 0 && (
        <Html position={[centroid[0], centroid[1], 1]} center style={{ pointerEvents: 'none' }}>
          <div className="map-tactical-overlay" style={{ pointerEvents: 'none' }}>
            <div className="map-country-label">{owner.country}</div>
            <div className="map-hp-bar">
              <div className="map-hp-fill" style={{ width: `${owner.hp}%` }}></div>
            </div>
            <div className="map-hp-label">{owner.hp} HP</div>
          </div>
        </Html>
      )}
      {hovered && owner && (
        <Html position={[centroid[0], centroid[1], 2]} center>
          <div className="map-hover-tooltip">
            <span className="tooltip-name">{owner.name}</span>
            <span className="tooltip-rank">COMMANDER</span>
          </div>
        </Html>
      )}
    </mesh>
  );
};

const ContextBridge = () => {
  const { camera, scene } = useThree();
  useEffect(() => {
    threeContext.camera = camera;
    threeContext.scene = scene;
  }, [camera, scene]);
  return null;
};

const MapScene = () => {
  const { gameState, myCountry } = useGameStore();
  const [focusCenter, setFocusCenter] = useState(null);
  const targetZoom = useRef(3);
  const targetPan = useRef({ x: 0, y: 0 });
  const isDraggingMap = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (focusCenter) {
      targetZoom.current = 15;
      targetPan.current = { x: focusCenter.x, y: focusCenter.y };
    } else {
      targetZoom.current = 3;
      targetPan.current = { x: 0, y: 0 };
    }
  }, [focusCenter]);

  useEffect(() => {
    const el = document.getElementById('map-container');
    const handleWheel = (e) => {
      const delta = e.deltaY > 0 ? -2.0 : 2.0;
      targetZoom.current = Math.max(1, Math.min(30, targetZoom.current + delta));
    };
    
    const handlePointerDown = (e) => {
      if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;
      isDraggingMap.current = true;
      mapPanState.isDragging = true;
      mapPanState.dragDistance = 0;
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e) => {
      if (!isDraggingMap.current) return;
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      
      mapPanState.dragDistance += Math.abs(dx) + Math.abs(dy);
      
      const panSpeed = 30 / targetZoom.current; 
      targetPan.current.x -= dx * panSpeed * 0.03;
      targetPan.current.y += dy * panSpeed * 0.03;
      
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = () => {
      isDraggingMap.current = false;
      setTimeout(() => { mapPanState.isDragging = false; }, 50);
    };

    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: true });
      el.addEventListener('pointerdown', handlePointerDown);
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => { 
      if (el) {
        el.removeEventListener('wheel', handleWheel);
        el.removeEventListener('pointerdown', handlePointerDown);
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  const meshes = useMemo(() => {
    if (!countriesData || !countriesData.features) return [];
    
    const phase = gameState.phase || 1;
    
    return countriesData.features
      .filter(f => (f.properties.name || f.properties.ADMIN) !== 'Antarctica')
      .map((f, i) => <CountryMesh key={i} feature={f} myCountry={myCountry} gameState={gameState} onFocus={setFocusCenter} phase={phase} />);
  }, [gameState, myCountry]);

  useFrame((state) => {
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetPan.current.x, 0.1);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetPan.current.y, 0.1);
    state.camera.zoom = THREE.MathUtils.lerp(state.camera.zoom, targetZoom.current, 0.1);
    state.camera.updateProjectionMatrix();
  });

  return (
    <group onPointerMissed={() => setFocusCenter(null)}>
      {meshes}
    </group>
  );
};

const Trajectories = () => {
  const [lines, setLines] = useState([]);

  useEffect(() => {
    const onAttackEvent = (e) => {
      const data = e.detail;
      const { players } = useGameStore.getState().gameState;
      const startPlayerId = data.deflected ? data.originalTarget : data.attacker;
      const endPlayerId = data.target;
      
      const attackerPlayer = players[startPlayerId];
      const targetPlayer = players[endPlayerId];
      if (!attackerPlayer || !targetPlayer) return;

      const attackerCountry = countriesData.features.find(f => normalize(f.properties.name || f.properties.ADMIN) === normalize(attackerPlayer.country));
      const targetCountry = countriesData.features.find(f => normalize(f.properties.name || f.properties.ADMIN) === normalize(targetPlayer.country));

      if (attackerCountry && targetCountry) {
        let start = getCountryCentroid(attackerCountry);
        let end = getCountryCentroid(targetCountry);

        const line = {
          id: Date.now() + Math.random(),
          start: new THREE.Vector3(start[0], start[1], 0),
          end: new THREE.Vector3(end[0], end[1], 0),
          color: data.deflected ? '#00ffcc' : (data.success ? '#ff4444' : '#58a6ff'),
          itemId: data.itemId
        };
        setLines(prev => [...prev, line]);
        setTimeout(() => setLines(prev => prev.filter(l => l.id !== line.id)), 1000);
      }
    };
    window.addEventListener('attackEvent', onAttackEvent);
    return () => window.removeEventListener('attackEvent', onAttackEvent);
  }, []);

  return lines.map(line => <TrajectoryCurve key={line.id} line={line} />);
};

const TrajectoryCurve = ({ line }) => {
  const curve = useMemo(() => {
    const start = line.start;
    const end = line.end;
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    
    const dirX = end.x - start.x;
    const dirY = end.y - start.y;
    const length = Math.sqrt(dirX*dirX + dirY*dirY);
    let perpX = -dirY / length;
    let perpY = dirX / length;
    
    if (perpY < 0) { perpX = -perpX; perpY = -perpY; }
    
    const multiplier = line.itemId === 'nuke' ? 0.5 : 0.25;
    const midPoint = new THREE.Vector3(midX + perpX * (length * multiplier), midY + perpY * (length * multiplier), 10);
    return new THREE.QuadraticBezierCurve3(start, midPoint, end);
  }, [line]);

  const [progress, setProgress] = useState(0);

  useFrame(() => {
    setProgress(p => Math.min(1, p + 0.05));
  });

  const points = useMemo(() => {
    if (progress === 0) return [];
    
    if (line.itemId === 'sub') {
      const pts = [];
      const steps = Math.max(2, Math.floor(progress * 40));
      for (let i = 0; i < steps; i++) {
        const t = i / 39;
        const curX = THREE.MathUtils.lerp(line.start.x, line.end.x, t);
        const curY = THREE.MathUtils.lerp(line.start.y, line.end.y, t);
        
        const dirX = line.end.x - line.start.x;
        const dirY = line.end.y - line.start.y;
        const length = Math.sqrt(dirX*dirX + dirY*dirY);
        let perpX = -dirY / length;
        let perpY = dirX / length;
        
        const frequency = 10;
        const amplitude = 1.5;
        const wave = Math.sin(t * Math.PI * frequency) * amplitude;
        
        pts.push([curX + perpX * wave, curY + perpY * wave, 1]);
      }
      return pts;
    } else {
      const pts = curve.getPoints(20).slice(0, Math.max(2, Math.floor(progress * 20)));
      return pts.map(p => [p.x, p.y, p.z]);
    }
  }, [curve, progress, line]);

  if (points.length < 2) return null;

  return (
    <group>
      <Line 
        points={points}
        color={line.color}
        lineWidth={line.itemId === 'nuke' ? 6 : 2}
        dashed={false}
        transparent
        opacity={line.itemId === 'nuke' ? 0.9 : 0.8}
      />
      {line.itemId === 'nuke' && (
        <mesh position={points[points.length - 1]} scale={2 + Math.abs(Math.sin(progress * Math.PI * 10)) * 2}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color="#ff2222" transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  );
};


const AttackPopups = () => {
  const [popups, setPopups] = useState([]);

  useEffect(() => {
    const onAttackEvent = (e) => {
      const data = e.detail;
      const owner = Object.values(useGameStore.getState().gameState.players).find(p => p.socketId === data.target);
      if (!owner) return;

      const targetCountry = countriesData.features.find(f => {
        return normalize(f.properties.name || f.properties.ADMIN) === normalize(owner.country);
      });

      if (targetCountry) {
        const centroid = getCountryCentroid(targetCountry);
        const popup = {
          id: Date.now() + Math.random(),
          pos: centroid,
          text: data.firewallBlocked ? 'FIREWALL BLOCKED' : (data.deflected ? 'CYBERATTACK' : (data.success ? `-${data.damage} HP` : 'COUNTERED')),
          color: data.firewallBlocked ? '#aaaaaa' : (data.deflected ? '#00ffcc' : (data.success ? '#ff4444' : '#58a6ff'))
        };
        if (data.itemId === 'nuke' && data.success) {
          popup.text = `NUKE DETONATED -${data.damage} HP`;
          popup.color = '#ff0000';
          popup.scale = 2;
        }
        setPopups(prev => [...prev, popup]);
        setTimeout(() => setPopups(prev => prev.filter(p => p.id !== popup.id)), 2000);
      }
    };
    window.addEventListener('attackEvent', onAttackEvent);
    return () => window.removeEventListener('attackEvent', onAttackEvent);
  }, []);

  return popups.map(p => (
    <Html key={p.id} position={[p.pos[0], p.pos[1], 5]} center>
      <div className="damage-popup" style={{ color: p.color, transform: p.scale ? `scale(${p.scale})` : 'scale(1)', fontWeight: 'bold' }}>{p.text}</div>
    </Html>
  ));
};

export const WorldMap = () => {
  const canvasRef = useRef();
  const { attack } = useGameStore();

  const handleDrop = (e) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('itemId');
    if (!itemId) return;

    const { camera, scene } = threeContext;
    if (!camera || !scene) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(x, y);
    raycaster.setFromCamera(mouse, camera);

    const allMeshes = [];
    scene.traverse((obj) => {
      if (obj.isMesh && obj.userData.ownerId) {
        allMeshes.push(obj);
      }
    });

    const intersects = raycaster.intersectObjects(allMeshes, false);
    const mySocketId = useGameStore.getState().socket.id;

    if (intersects.length > 0) {
      const hit = intersects[0];
      const targetId = hit.object.userData.ownerId;
      if (targetId && targetId !== mySocketId) {
        attack(targetId, itemId);
      }
    } else {
      // Snapping fallback logic for small countries
      const worldDropPoint = raycaster.ray.origin;
      let closestTarget = null;
      let minDistance = Infinity;

      allMeshes.forEach(mesh => {
        const ownerId = mesh.userData.ownerId;
        if (ownerId && ownerId !== mySocketId) {
          const box = new THREE.Box3().setFromObject(mesh);
          const center = new THREE.Vector3();
          box.getCenter(center);
          
          const dist = new THREE.Vector2(center.x, center.y).distanceTo(new THREE.Vector2(worldDropPoint.x, worldDropPoint.y));
          if (dist < minDistance) {
            minDistance = dist;
            closestTarget = ownerId;
          }
        }
      });

      const snapThreshold = 30; // approx 10% of map size, generous for small nations
      if (closestTarget && minDistance < snapThreshold) {
        attack(closestTarget, itemId);
      }
    }
  };

  return (
    <div 
      id="map-container"
      ref={canvasRef}
      onDragOver={(e) => {
        e.preventDefault();
        // Raycast to find which country is being hovered during drag
        const { camera, scene } = threeContext;
        if (!camera || !scene || !canvasRef.current) { dragOverState.targetId = null; return; }
        const rect = canvasRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
        const allMeshes = [];
        scene.traverse((obj) => { if (obj.isMesh && obj.userData.ownerId) allMeshes.push(obj); });
        const intersects = raycaster.intersectObjects(allMeshes, false);
        const mySocketId = useGameStore.getState().socket.id;
        if (intersects.length > 0) {
          const targetId = intersects[0].object.userData.ownerId;
          dragOverState.targetId = (targetId && targetId !== mySocketId) ? targetId : null;
        } else {
          dragOverState.targetId = null;
        }
      }}
      onDragLeave={() => { dragOverState.targetId = null; }}
      onDrop={(e) => { dragOverState.targetId = null; handleDrop(e); }}
      style={{ width: '100vw', height: '100vh', background: '#050a10', position: 'absolute', top: 0, left: 0, zIndex: 0 }}
    >
      <Canvas>
        <OrthographicCamera makeDefault position={[0, 0, 100]} zoom={3} near={1} far={1000} />
        <ambientLight intensity={1.5} />
        <ContextBridge />
        <MapScene />
        <AttackPopups />
        <Trajectories />
      </Canvas>
    </div>
  );
};
