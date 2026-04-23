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

const flagTextureCache = new Map();

function drawStar(ctx, cx, cy, outerR, points) {
  const innerR = outerR * 0.4;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    if (i === 0) ctx.moveTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    else ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
  }
  ctx.closePath();
  ctx.fill();
}

function drawUnionJack(ctx, x, y, w, h) {
  ctx.fillStyle = '#012169';
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = h / 4;
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + w, y + h);
  ctx.moveTo(x + w, y); ctx.lineTo(x, y + h);
  ctx.stroke();
  ctx.strokeStyle = '#C8102E';
  ctx.lineWidth = h / 9;
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + w, y + h);
  ctx.moveTo(x + w, y); ctx.lineTo(x, y + h);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x, y + (h * 3) / 8, w, h / 4);
  ctx.fillRect(x + (w * 3) / 8, y, w / 4, h);
  ctx.fillStyle = '#C8102E';
  ctx.fillRect(x, y + (h * 7) / 16, w, h / 8);
  ctx.fillRect(x + (w * 7) / 16, y, w / 8, h);
}

function drawFlagOnCanvas(ctx, w, h, key) {
  ctx.clearRect(0, 0, w, h);
  switch (key) {
    case 'usa': {
      const sh = h / 13;
      for (let i = 0; i < 13; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#B22234' : '#FFFFFF';
        ctx.fillRect(0, i * sh, w, sh);
      }
      const cw = w * 0.4, ch = sh * 7;
      ctx.fillStyle = '#3C3B6E';
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = '#FFFFFF';
      const rows = [6, 5, 6, 5, 6, 5, 6, 5, 6];
      for (let r = 0; r < 9; r++) {
        const cols = rows[r];
        for (let c = 0; c < cols; c++) {
          const off = r % 2 === 0 ? 0 : cw / cols / 2;
          drawStar(ctx, off + (c + 0.5) * (cw / cols), (r + 0.5) * (ch / 9), ch / 18, 5);
        }
      }
      break;
    }
    case 'china': {
      ctx.fillStyle = '#DE2910';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#FFDE00';
      drawStar(ctx, w * 0.18, h * 0.25, w * 0.1, 5);
      [[w * 0.32, h * 0.1], [w * 0.4, h * 0.2], [w * 0.4, h * 0.37], [w * 0.32, h * 0.45]].forEach(
        ([sx, sy]) => drawStar(ctx, sx, sy, w * 0.04, 5)
      );
      break;
    }
    case 'russia': {
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, w, h / 3);
      ctx.fillStyle = '#0039A6'; ctx.fillRect(0, h / 3, w, h / 3);
      ctx.fillStyle = '#D52B1E'; ctx.fillRect(0, (2 * h) / 3, w, h / 3);
      break;
    }
    case 'india': {
      ctx.fillStyle = '#FF9933'; ctx.fillRect(0, 0, w, h / 3);
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, h / 3, w, h / 3);
      ctx.fillStyle = '#138808'; ctx.fillRect(0, (2 * h) / 3, w, h / 3);
      const [icx, icy, ir] = [w / 2, h / 2, h / 7];
      ctx.strokeStyle = '#000080';
      ctx.lineWidth = ir * 0.12;
      ctx.beginPath(); ctx.arc(icx, icy, ir, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = ir * 0.06;
      for (let i = 0; i < 24; i++) {
        const a = (i * Math.PI * 2) / 24;
        ctx.beginPath(); ctx.moveTo(icx, icy); ctx.lineTo(icx + ir * Math.cos(a), icy + ir * Math.sin(a)); ctx.stroke();
      }
      break;
    }
    case 'uk': {
      drawUnionJack(ctx, 0, 0, w, h);
      break;
    }
    case 'germany': {
      ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, w, h / 3);
      ctx.fillStyle = '#DD0000'; ctx.fillRect(0, h / 3, w, h / 3);
      ctx.fillStyle = '#FFCE00'; ctx.fillRect(0, (2 * h) / 3, w, h / 3);
      break;
    }
    case 'japan': {
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#BC002D';
      ctx.beginPath(); ctx.arc(w / 2, h / 2, h * 0.3, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'brazil': {
      ctx.fillStyle = '#009C3B'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#FFDF00';
      ctx.beginPath();
      ctx.moveTo(w / 2, h * 0.06); ctx.lineTo(w * 0.95, h / 2);
      ctx.lineTo(w / 2, h * 0.94); ctx.lineTo(w * 0.05, h / 2);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#002776';
      ctx.beginPath(); ctx.arc(w / 2, h / 2, h * 0.28, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.arc(w / 2, h / 2, h * 0.28, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, h / 2 - h * 0.04, w, h * 0.08);
      ctx.restore();
      ctx.fillStyle = '#FFFFFF';
      [[w * 0.37, h * 0.37], [w * 0.48, h * 0.44], [w * 0.58, h * 0.46], [w * 0.65, h * 0.41], [w * 0.5, h * 0.62]].forEach(
        ([sx, sy]) => { ctx.beginPath(); ctx.arc(sx, sy, h * 0.016, 0, Math.PI * 2); ctx.fill(); }
      );
      break;
    }
    case 'france': {
      ctx.fillStyle = '#002395'; ctx.fillRect(0, 0, w / 3, h);
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(w / 3, 0, w / 3, h);
      ctx.fillStyle = '#ED2939'; ctx.fillRect((2 * w) / 3, 0, w / 3, h);
      break;
    }
    case 'australia': {
      ctx.fillStyle = '#00008B'; ctx.fillRect(0, 0, w, h);
      drawUnionJack(ctx, 0, 0, w / 2, h / 2);
      ctx.fillStyle = '#FFFFFF';
      [[w * 0.73, h * 0.22], [w * 0.86, h * 0.44], [w * 0.65, h * 0.56], [w * 0.78, h * 0.7], [w * 0.88, h * 0.18]].forEach(
        ([sx, sy]) => drawStar(ctx, sx, sy, w * 0.024, 7)
      );
      drawStar(ctx, w * 0.22, h * 0.75, w * 0.038, 7);
      break;
    }
    case 'north korea': {
      ctx.fillStyle = '#024FA2';
      ctx.fillRect(0, 0, w, h * 0.2);
      ctx.fillRect(0, h * 0.8, w, h * 0.2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, h * 0.2, w, h * 0.07);
      ctx.fillRect(0, h * 0.73, w, h * 0.07);
      ctx.fillStyle = '#C80000'; ctx.fillRect(0, h * 0.27, w, h * 0.46);
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(w * 0.22, h * 0.5, h * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#C80000';
      drawStar(ctx, w * 0.22, h * 0.5, h * 0.14, 5);
      break;
    }
    case 'pakistan': {
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, w * 0.25, h);
      ctx.fillStyle = '#01411C'; ctx.fillRect(w * 0.25, 0, w * 0.75, h);
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(w * 0.57, h * 0.5, h * 0.27, -1.2, 1.2); ctx.fill();
      ctx.fillStyle = '#01411C';
      ctx.beginPath(); ctx.arc(w * 0.64, h * 0.5, h * 0.24, -1.2, 1.2); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      drawStar(ctx, w * 0.75, h * 0.5, h * 0.1, 5);
      break;
    }
    case 'israel': {
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#0038B8';
      ctx.fillRect(0, h * 0.14, w, h * 0.15);
      ctx.fillRect(0, h * 0.71, w, h * 0.15);
      const sq3 = Math.sqrt(3) / 2;
      const [isx, isy, iR] = [w / 2, h / 2, h * 0.2];
      ctx.strokeStyle = '#0038B8'; ctx.lineWidth = h * 0.04;
      ctx.beginPath();
      ctx.moveTo(isx, isy - iR); ctx.lineTo(isx + iR * sq3, isy + iR / 2); ctx.lineTo(isx - iR * sq3, isy + iR / 2);
      ctx.closePath(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(isx, isy + iR); ctx.lineTo(isx - iR * sq3, isy - iR / 2); ctx.lineTo(isx + iR * sq3, isy - iR / 2);
      ctx.closePath(); ctx.stroke();
      break;
    }
    case 'iran': {
      ctx.fillStyle = '#239F40'; ctx.fillRect(0, 0, w, h / 3);
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, h / 3, w, h / 3);
      ctx.fillStyle = '#DA0000'; ctx.fillRect(0, (2 * h) / 3, w, h / 3);
      ctx.fillStyle = '#239F40';
      ctx.beginPath(); ctx.arc(w / 2, h / 2, h * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(w / 2 + h * 0.045, h / 2 - h * 0.045, h * 0.08, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#DA0000';
      ctx.lineWidth = h * 0.025;
      ctx.beginPath(); ctx.moveTo(w / 2, h / 3 + 2); ctx.lineTo(w / 2, (2 * h) / 3 - 2); ctx.stroke();
      break;
    }
    default:
      break;
  }
}

function getFlagTexture(countryKey) {
  if (flagTextureCache.has(countryKey)) return flagTextureCache.get(countryKey);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  drawFlagOnCanvas(ctx, 512, 256, countryKey);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  flagTextureCache.set(countryKey, texture);
  return texture;
}

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

const CountryMesh = ({ feature, myCountry, gameState, onFocus }) => {
  const meshRef = useRef();
  const outlineRef = useRef();
  const [hovered, setHovered] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const name = feature.properties.name || feature.properties.ADMIN;
  const normalizedName = normalize(name);
  const normalizedMyCountry = normalize(myCountry);

  const players = Object.values(gameState?.players || {});

  let owner = null;
  const isMyCountry = normalizedName === normalizedMyCountry;

  for (let p of players) {
    if (normalize(p.country) === normalizedName) {
      if (p.hp > 0) {
        owner = p;
      }
      break;
    }
  }

  const flagTexture = owner ? getFlagTexture(normalize(owner.country)) : null;

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
            if (Math.abs(coords[i][0] - coords[i - 1][0]) > 180) {
              shapes.push(shape);
              shape = new THREE.Shape();
              shape.moveTo(pt[0], pt[1]);
            } else shape.lineTo(pt[0], pt[1]);
          }
        }
        shapes.push(shape);
      }
      const geo = new THREE.ShapeGeometry(shapes);
      // ShapeGeometry sets UV = raw vertex position (map coords ≈ -250..250).
      // Remap to [0,1] based on the actual bounding box so textures render correctly.
      geo.computeBoundingBox();
      const { min, max } = geo.boundingBox;
      const rangeX = (max.x - min.x) || 1;
      const rangeY = (max.y - min.y) || 1;
      const pos = geo.attributes.position;
      const uv = geo.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        uv.setXY(i, (pos.getX(i) - min.x) / rangeX, (pos.getY(i) - min.y) / rangeY);
      }
      uv.needsUpdate = true;
      return geo;
    } catch { return null; }
  }, [feature]);

  const centroid = useMemo(() => getCountryCentroid(feature), [feature]);

  useEffect(() => {
    const meshNode = meshRef.current;
    if (meshNode && owner) {
      const existing = threeContext.meshes.find(m => m.mesh === meshNode);
      if (!existing) {
        threeContext.meshes.push({ mesh: meshNode, ownerId: owner.socketId });
      } else {
        existing.ownerId = owner.socketId;
      }
    }
    return () => {
      threeContext.meshes = threeContext.meshes.filter(m => m.mesh !== meshNode);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner?.socketId]);

  // Check if this country is drag-over target
  useEffect(() => {
    if (!owner) return;
    const interval = setInterval(() => {
      setIsDragOver(dragOverState.targetId === owner.socketId);
    }, 50);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner?.socketId]);

  useFrame(() => {
    if (meshRef.current) {
      const isHighlighted = isMyCountry || hovered || isDragOver;
      const targetZ = isHighlighted ? 0.5 : 0;
      meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, targetZ, 0.1);
      const targetScale = isDragOver ? 1.06 : (isMyCountry || hovered) ? 1.02 : 1.0;
      meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, 0.1));

      if (isDragOver) {
        meshRef.current.material.color.lerp(new THREE.Color('#ffff88'), 0.2);
      } else if (owner) {
        meshRef.current.material.color.lerp(new THREE.Color('#ffffff'), 0.1);
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
      <meshBasicMaterial
        map={flagTexture}
        color={isDragOver ? '#ffff88' : '#ffffff'}
        transparent
        opacity={owner ? (isMyCountry ? 1.0 : 0.9) : 0.6}
        side={THREE.DoubleSide}
      />
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
  
  const lobbyStateRef = useRef(gameState.lobbyState);
  useEffect(() => {
    lobbyStateRef.current = gameState.lobbyState;
  }, [gameState.lobbyState]);

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
      if (lobbyStateRef.current === 'waiting' || lobbyStateRef.current === 'starting') return;
      const z0 = targetZoom.current;
      const delta = e.deltaY > 0 ? -1.5 : 1.5;
      const z1 = Math.max(2.5, Math.min(30, z0 + delta));

      if (z0 !== z1 && threeContext.camera) {
        const rect = el.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const camera = threeContext.camera;

        const bw_x = (nx * (camera.right - camera.left)) / 2;
        const bw_y = (ny * (camera.top - camera.bottom)) / 2;

        targetPan.current.x += bw_x * (1 / z0 - 1 / z1);
        targetPan.current.y += bw_y * (1 / z0 - 1 / z1);
      }
      targetZoom.current = z1;
    };

    const handlePointerDown = (e) => {
      if (lobbyStateRef.current === 'waiting' || lobbyStateRef.current === 'starting') return;
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
    const viewWidth = window.innerWidth / targetZoom.current / 2;
    const viewHeight = window.innerHeight / targetZoom.current / 2;

    const limitX = Math.max(0, 260 - viewWidth);
    const limitY = Math.max(0, 130 - viewHeight);

    targetPan.current.x = Math.max(-limitX, Math.min(limitX, targetPan.current.x));
    targetPan.current.y = Math.max(-limitY, Math.min(limitY, targetPan.current.y));

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
    const length = Math.sqrt(dirX * dirX + dirY * dirY);
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
        const length = Math.sqrt(dirX * dirX + dirY * dirY);
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
  const { attack, gameState } = useGameStore();
  const isLobby = gameState?.lobbyState === 'waiting' || gameState?.lobbyState === 'starting';

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
      style={{ 
        width: '100vw', height: '100vh', background: '#050a10', 
        position: 'absolute', top: 0, left: 0, zIndex: 0,
        filter: isLobby ? 'blur(10px)' : 'none',
        pointerEvents: isLobby ? 'none' : 'auto',
        transition: 'filter 1s ease'
      }}
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
