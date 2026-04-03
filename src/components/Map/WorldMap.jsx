import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import countriesData from '../../countries.json';
import { useGameStore } from '../../store/gameStore';

const scale = 2.5;
function mapCoordinates(lon, lat) {
  return [lon / 180 * 100 * scale, lat / 90 * 50 * scale];
}

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
  const [hovered, setHovered] = useState(false);
  const name = feature.properties.name || feature.properties.ADMIN;
  const normalizedName = normalize(name);
  const normalizedMyCountry = normalize(myCountry);

  const players = Object.values(gameState?.players || {});
  
  let color = '#2a3a4a';
  let owner = null;

  for (let p of players) {
    if (normalize(p.country) === normalizedName) {
      owner = p;
      if (p.hp <= 0) color = '#050505';
      else if (normalize(p.country) === normalizedMyCountry) color = '#ffffff';
      else color = '#f85149';
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

  useFrame(() => {
    if (meshRef.current) {
      const targetZ = (normalizedName === normalizedMyCountry || hovered) ? 0.5 : 0;
      meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, targetZ, 0.1);
      const targetScale = (normalizedName === normalizedMyCountry || hovered) ? 1.02 : 1.0;
      meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, 0.1));
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
        if (normalizedName === normalizedMyCountry) {
          e.stopPropagation();
          const box = new THREE.Box3().setFromObject(meshRef.current);
          const center = new THREE.Vector3();
          box.getCenter(center);
          onFocus(center);
        }
      }}
    >
      <meshBasicMaterial color={color} transparent opacity={owner?.hp <= 0 ? 0.3 : 0.8} side={THREE.DoubleSide} />
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

  const meshes = useMemo(() => {
    if (!countriesData || !countriesData.features) return [];
    
    const phase = gameState.phase || 1;
    
    return countriesData.features
      .filter(f => (f.properties.name || f.properties.ADMIN) !== 'Antarctica')
      .map((f, i) => <CountryMesh key={i} feature={f} myCountry={myCountry} gameState={gameState} onFocus={setFocusCenter} phase={phase} />);
  }, [gameState, myCountry]);

  useFrame((state) => {
    if (focusCenter) {
      state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, focusCenter.x, 0.05);
      state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, focusCenter.y, 0.05);
      state.camera.zoom = THREE.MathUtils.lerp(state.camera.zoom, 15, 0.05);
    } else {
      state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, 0, 0.05);
      state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 0, 0.05);
      state.camera.zoom = THREE.MathUtils.lerp(state.camera.zoom, 3, 0.05);
    }
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
      const attackerPlayer = players[data.attacker];
      const targetPlayer = players[data.target];
      if (!attackerPlayer || !targetPlayer) return;

      const attackerCountry = countriesData.features.find(f => normalize(f.properties.name || f.properties.ADMIN) === normalize(attackerPlayer.country));
      const targetCountry = countriesData.features.find(f => normalize(f.properties.name || f.properties.ADMIN) === normalize(targetPlayer.country));

      if (attackerCountry && targetCountry) {
        const start = getCountryCentroid(attackerCountry);
        const end = getCountryCentroid(targetCountry);
        
        const line = {
          id: Date.now() + Math.random(),
          start: new THREE.Vector3(start[0], start[1], 0),
          end: new THREE.Vector3(end[0], end[1], 0),
          color: data.success ? '#ff4444' : '#58a6ff'
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
    
    const midPoint = new THREE.Vector3(midX + perpX * (length * 0.25), midY + perpY * (length * 0.25), 10);
    return new THREE.QuadraticBezierCurve3(start, midPoint, end);
  }, [line]);

  const [progress, setProgress] = useState(0);

  useFrame(() => {
    setProgress(p => Math.min(1, p + 0.05));
  });

  const points = useMemo(() => {
    if (progress === 0) return [];
    const pts = curve.getPoints(20).slice(0, Math.max(2, Math.floor(progress * 20)));
    return pts.map(p => [p.x, p.y, p.z]);
  }, [curve, progress]);

  if (points.length < 2) return null;

  return (
    <Line 
      points={points}
      color={line.color}
      lineWidth={2}
      dashed={false}
      transparent
      opacity={0.8}
    />
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
          text: data.success ? `-${data.damage} HP` : 'COUNTERED',
          color: data.success ? '#ff4444' : '#58a6ff'
        };
        setPopups(prev => [...prev, popup]);
        setTimeout(() => setPopups(prev => prev.filter(p => p.id !== popup.id)), 2000);
      }
    };
    window.addEventListener('attackEvent', onAttackEvent);
    return () => window.removeEventListener('attackEvent', onAttackEvent);
  }, []);

  return popups.map(p => (
    <Html key={p.id} position={[p.pos[0], p.pos[1], 5]} center>
      <div className="damage-popup" style={{ color: p.color }}>{p.text}</div>
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
    }
  };

  return (
    <div 
      ref={canvasRef}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
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
