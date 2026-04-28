import React, { useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrthographicCamera, Html, Line } from "@react-three/drei";
import * as THREE from "three";
import countriesData from "../../countries.json";
import { useGameStore } from "../../store/gameStore";
import missileImg from "../../assets/missile.webp";
import jetImg from "../../assets/jet.webp";
import tankImg from "../../assets/tank.webp";
import submarineImg from "../../assets/submarine.webp";
import nukeImg from "../../assets/nuke.webp";
import domeImg from "../../assets/dome.webp";
import stickybombImg from "../../assets/stickybomb.webp";
import radarImg from "../../assets/radar.webp";
import navalmineImg from "../../assets/navalmine.webp";

const ATTACK_TEXTURE_URLS = {
  missile: missileImg,
  jet: jetImg,
  tank: tankImg,
  sub: submarineImg,
  nuke: nukeImg,
  dome: domeImg,
  stickybomb: stickybombImg,
  radar: radarImg,
  navalmine: navalmineImg,
};

const attackTextureCache = new Map();
const loadAttackTexture = (url) => {
  if (attackTextureCache.has(url)) return attackTextureCache.get(url);
  const tex = new THREE.TextureLoader().load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  attackTextureCache.set(url, tex);
  return tex;
};
Object.values(ATTACK_TEXTURE_URLS).forEach(loadAttackTexture);

const nullRaycast = () => null;

// Global drag-over state shared between WorldMap drop handler and CountryMesh
const dragOverState = { targetId: null, lastDragOver: 0 };

const scale = 2.5;
function mapCoordinates(lon, lat) {
  return [(lon / 180) * 100 * scale, (lat / 90) * 50 * scale];
}

const mapPanState = { isDragging: false, dragDistance: 0 };

const normalize = (n) => {
  if (!n) return "";
  const map = {
    "United States of America": "USA",
    "United Kingdom": "UK",
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
  ctx.fillStyle = "#012169";
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = h / 4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y + h);
  ctx.moveTo(x + w, y);
  ctx.lineTo(x, y + h);
  ctx.stroke();
  ctx.strokeStyle = "#C8102E";
  ctx.lineWidth = h / 9;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y + h);
  ctx.moveTo(x + w, y);
  ctx.lineTo(x, y + h);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(x, y + (h * 3) / 8, w, h / 4);
  ctx.fillRect(x + (w * 3) / 8, y, w / 4, h);
  ctx.fillStyle = "#C8102E";
  ctx.fillRect(x, y + (h * 7) / 16, w, h / 8);
  ctx.fillRect(x + (w * 7) / 16, y, w / 8, h);
}

function drawFlagOnCanvas(ctx, w, h, key) {
  ctx.clearRect(0, 0, w, h);
  switch (key) {
    case "usa": {
      const sh = h / 13;
      for (let i = 0; i < 13; i++) {
        ctx.fillStyle = i % 2 === 0 ? "#B22234" : "#FFFFFF";
        ctx.fillRect(0, i * sh, w, sh);
      }
      const cw = w * 0.4,
        ch = sh * 7;
      ctx.fillStyle = "#3C3B6E";
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = "#FFFFFF";
      const rows = [6, 5, 6, 5, 6, 5, 6, 5, 6];
      for (let r = 0; r < 9; r++) {
        const cols = rows[r];
        for (let c = 0; c < cols; c++) {
          const off = r % 2 === 0 ? 0 : cw / cols / 2;
          drawStar(
            ctx,
            off + (c + 0.5) * (cw / cols),
            (r + 0.5) * (ch / 9),
            ch / 18,
            5,
          );
        }
      }
      break;
    }
    case "china": {
      ctx.fillStyle = "#DE2910";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#FFDE00";
      drawStar(ctx, w * 0.18, h * 0.25, w * 0.1, 5);
      [
        [w * 0.32, h * 0.1],
        [w * 0.4, h * 0.2],
        [w * 0.4, h * 0.37],
        [w * 0.32, h * 0.45],
      ].forEach(([sx, sy]) => drawStar(ctx, sx, sy, w * 0.04, 5));
      break;
    }
    case "russia": {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, w, h / 3);
      ctx.fillStyle = "#0039A6";
      ctx.fillRect(0, h / 3, w, h / 3);
      ctx.fillStyle = "#D52B1E";
      ctx.fillRect(0, (2 * h) / 3, w, h / 3);
      break;
    }
    case "india": {
      ctx.fillStyle = "#FF9933";
      ctx.fillRect(0, 0, w, h / 3);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, h / 3, w, h / 3);
      ctx.fillStyle = "#138808";
      ctx.fillRect(0, (2 * h) / 3, w, h / 3);
      const [icx, icy, ir] = [w / 2, h / 2, h / 7];
      ctx.strokeStyle = "#000080";
      ctx.lineWidth = ir * 0.12;
      ctx.beginPath();
      ctx.arc(icx, icy, ir, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = ir * 0.06;
      for (let i = 0; i < 24; i++) {
        const a = (i * Math.PI * 2) / 24;
        ctx.beginPath();
        ctx.moveTo(icx, icy);
        ctx.lineTo(icx + ir * Math.cos(a), icy + ir * Math.sin(a));
        ctx.stroke();
      }
      break;
    }
    case "uk": {
      drawUnionJack(ctx, 0, 0, w, h);
      break;
    }
    case "germany": {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, w, h / 3);
      ctx.fillStyle = "#DD0000";
      ctx.fillRect(0, h / 3, w, h / 3);
      ctx.fillStyle = "#FFCE00";
      ctx.fillRect(0, (2 * h) / 3, w, h / 3);
      break;
    }
    case "japan": {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#BC002D";
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, h * 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "brazil": {
      ctx.fillStyle = "#009C3B";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#FFDF00";
      ctx.beginPath();
      ctx.moveTo(w / 2, h * 0.06);
      ctx.lineTo(w * 0.95, h / 2);
      ctx.lineTo(w / 2, h * 0.94);
      ctx.lineTo(w * 0.05, h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#002776";
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, h * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, h * 0.28, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, h / 2 - h * 0.04, w, h * 0.08);
      ctx.restore();
      ctx.fillStyle = "#FFFFFF";
      [
        [w * 0.37, h * 0.37],
        [w * 0.48, h * 0.44],
        [w * 0.58, h * 0.46],
        [w * 0.65, h * 0.41],
        [w * 0.5, h * 0.62],
      ].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, h * 0.016, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    }
    case "france": {
      ctx.fillStyle = "#002395";
      ctx.fillRect(0, 0, w / 3, h);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(w / 3, 0, w / 3, h);
      ctx.fillStyle = "#ED2939";
      ctx.fillRect((2 * w) / 3, 0, w / 3, h);
      break;
    }
    case "australia": {
      ctx.fillStyle = "#00008B";
      ctx.fillRect(0, 0, w, h);
      drawUnionJack(ctx, 0, 0, w / 2, h / 2);
      ctx.fillStyle = "#FFFFFF";
      [
        [w * 0.73, h * 0.22],
        [w * 0.86, h * 0.44],
        [w * 0.65, h * 0.56],
        [w * 0.78, h * 0.7],
        [w * 0.88, h * 0.18],
      ].forEach(([sx, sy]) => drawStar(ctx, sx, sy, w * 0.024, 7));
      drawStar(ctx, w * 0.22, h * 0.75, w * 0.038, 7);
      break;
    }
    case "north korea": {
      ctx.fillStyle = "#024FA2";
      ctx.fillRect(0, 0, w, h * 0.2);
      ctx.fillRect(0, h * 0.8, w, h * 0.2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, h * 0.2, w, h * 0.07);
      ctx.fillRect(0, h * 0.73, w, h * 0.07);
      ctx.fillStyle = "#C80000";
      ctx.fillRect(0, h * 0.27, w, h * 0.46);
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(w * 0.22, h * 0.5, h * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#C80000";
      drawStar(ctx, w * 0.22, h * 0.5, h * 0.14, 5);
      break;
    }
    case "pakistan": {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, w * 0.25, h);
      ctx.fillStyle = "#01411C";
      ctx.fillRect(w * 0.25, 0, w * 0.75, h);
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(w * 0.57, h * 0.5, h * 0.27, -1.2, 1.2);
      ctx.fill();
      ctx.fillStyle = "#01411C";
      ctx.beginPath();
      ctx.arc(w * 0.64, h * 0.5, h * 0.24, -1.2, 1.2);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      drawStar(ctx, w * 0.75, h * 0.5, h * 0.1, 5);
      break;
    }
    case "israel": {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#0038B8";
      ctx.fillRect(0, h * 0.14, w, h * 0.15);
      ctx.fillRect(0, h * 0.71, w, h * 0.15);
      const sq3 = Math.sqrt(3) / 2;
      const [isx, isy, iR] = [w / 2, h / 2, h * 0.2];
      ctx.strokeStyle = "#0038B8";
      ctx.lineWidth = h * 0.04;
      ctx.beginPath();
      ctx.moveTo(isx, isy - iR);
      ctx.lineTo(isx + iR * sq3, isy + iR / 2);
      ctx.lineTo(isx - iR * sq3, isy + iR / 2);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(isx, isy + iR);
      ctx.lineTo(isx - iR * sq3, isy - iR / 2);
      ctx.lineTo(isx + iR * sq3, isy - iR / 2);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case "iran": {
      ctx.fillStyle = "#239F40";
      ctx.fillRect(0, 0, w, h / 3);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, h / 3, w, h / 3);
      ctx.fillStyle = "#DA0000";
      ctx.fillRect(0, (2 * h) / 3, w, h / 3);
      ctx.fillStyle = "#239F40";
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, h * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(w / 2 + h * 0.045, h / 2 - h * 0.045, h * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#DA0000";
      ctx.lineWidth = h * 0.025;
      ctx.beginPath();
      ctx.moveTo(w / 2, h / 3 + 2);
      ctx.lineTo(w / 2, (2 * h) / 3 - 2);
      ctx.stroke();
      break;
    }
    default:
      break;
  }
}

function getFlagTexture(countryKey) {
  if (flagTextureCache.has(countryKey)) return flagTextureCache.get(countryKey);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  drawFlagOnCanvas(ctx, 512, 256, countryKey);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  flagTextureCache.set(countryKey, texture);
  return texture;
}

function getCountryCentroid(feature) {
  const paths =
    feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
  let sumX = 0,
    sumY = 0,
    count = 0;
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

const featureBBoxCache = new Map();
function getFeatureBBox(feature) {
  if (featureBBoxCache.has(feature)) return featureBBoxCache.get(feature);
  if (!feature.geometry) {
    const bbox = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    featureBBoxCache.set(feature, bbox);
    return bbox;
  }
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  const paths =
    feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
  for (const polygon of paths) {
    for (const c of polygon[0]) {
      const [x, y] = mapCoordinates(c[0], c[1]);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  const bbox = { minX, minY, maxX, maxY };
  featureBBoxCache.set(feature, bbox);
  return bbox;
}

function pointInRing(px, py, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = mapCoordinates(ring[i][0], ring[i][1]);
    const [xj, yj] = mapCoordinates(ring[j][0], ring[j][1]);
    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi || 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function featureContainsPoint(feature, x, y) {
  const bbox = getFeatureBBox(feature);
  if (x < bbox.minX || x > bbox.maxX || y < bbox.minY || y > bbox.maxY)
    return false;
  const paths =
    feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
  for (const polygon of paths) {
    if (pointInRing(x, y, polygon[0])) return true;
  }
  return false;
}

function findCountryAtPoint(x, y, excludeNorm) {
  for (const f of countriesData.features) {
    const name = f.properties.name || f.properties.ADMIN;
    if (!name) continue;
    if (excludeNorm && normalize(name) === excludeNorm) continue;
    if (featureContainsPoint(f, x, y)) return f;
  }
  return null;
}

function findTankSpawnPoint(targetCountryName, targetCenter, attackerCenter) {
  const excludeNorm = normalize(targetCountryName);

  // Estimate how far the target country extends from its centroid using its bbox diagonal.
  // This ensures the spawn starts beyond the target's actual border, not just beyond its centroid.
  const targetFeature = countriesData.features.find((f) => {
    const n = f.properties.name || f.properties.ADMIN;
    return n && normalize(n) === excludeNorm;
  });
  let targetRadius = 22;
  if (targetFeature && targetFeature.geometry) {
    const bbox = getFeatureBBox(targetFeature);
    const ex = (bbox.maxX - bbox.minX) / 2;
    const ey = (bbox.maxY - bbox.minY) / 2;
    targetRadius = Math.max(18, Math.min(55, Math.sqrt(ex * ex + ey * ey)));
  }
  const minDist = targetRadius + 14;
  const maxDist = minDist + 60;

  const dx = attackerCenter[0] - targetCenter[0];
  const dy = attackerCenter[1] - targetCenter[1];
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const dirX = dx / len;
  const dirY = dy / len;

  // Cap at ~40 tries to avoid blocking the JS thread.
  const tries = [];
  for (let aDeg = 0; aDeg < 360; aDeg += 36) {
    const rad = (aDeg * Math.PI) / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);
    const rx = cosA * dirX - sinA * dirY;
    const ry = sinA * dirX + cosA * dirY;
    for (const d of [minDist, minDist + 20, minDist + 40, maxDist]) {
      tries.push([targetCenter[0] + rx * d, targetCenter[1] + ry * d]);
    }
  }

  for (const [px, py] of tries) {
    if (findCountryAtPoint(px, py, excludeNorm)) return [px, py];
  }
  return [targetCenter[0] + dirX * minDist, targetCenter[1] + dirY * minDist];
}

function isWaterPoint(x, y) {
  for (const f of countriesData.features) {
    if (!f.geometry) continue;
    if (featureContainsPoint(f, x, y)) return false;
  }
  return true;
}

function findSubSpawnPoint(targetCenter, attackerCenter) {
  const dx = attackerCenter[0] - targetCenter[0];
  const dy = attackerCenter[1] - targetCenter[1];
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const perpX = -dy / len;
  const perpY = dx / len;

  // Keep tries small (≤ 32) to avoid freezing the JS thread.
  // Perpendicular sides at 3 distances, then 8 compass directions at 2 distances.
  const tries = [];
  for (const d of [22, 38, 55]) {
    tries.push([targetCenter[0] + perpX * d, targetCenter[1] + perpY * d]);
    tries.push([targetCenter[0] - perpX * d, targetCenter[1] - perpY * d]);
  }
  for (let aDeg = 0; aDeg < 360; aDeg += 45) {
    const rad = (aDeg * Math.PI) / 180;
    const cx = Math.cos(rad);
    const cy = Math.sin(rad);
    for (const d of [28, 50]) {
      tries.push([targetCenter[0] + cx * d, targetCenter[1] + cy * d]);
    }
  }

  for (const [px, py] of tries) {
    if (isWaterPoint(px, py)) return [px, py];
  }
  return [targetCenter[0] + perpX * 35, targetCenter[1] + perpY * 35];
}

const threeContext = { camera: null, scene: null, meshes: [] };

const COLOR_HIGHLIGHT = new THREE.Color("#ffff88");
const COLOR_WHITE = new THREE.Color("#ffffff");

// Registry of all country meshes so one useFrame can animate them all.
const countryMeshRegistry = new Set();

const CountryMesh = React.memo(({ feature, myCountry, onFocus }) => {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const name = feature.properties.name || feature.properties.ADMIN;
  const normalizedName = useMemo(() => normalize(name), [name]);
  const normalizedMyCountry = normalize(myCountry);
  const isMyCountry = normalizedName === normalizedMyCountry;

  const owner = useGameStore((state) => {
    const players = state.gameState?.players;
    if (!players) return null;
    for (const id in players) {
      const p = players[id];
      if (p.hp > 0 && normalize(p.country) === normalizedName) return p;
    }
    return null;
  });
  const lobbyState = useGameStore((state) => state.gameState?.lobbyState);

  const flagTexture = owner ? getFlagTexture(normalize(owner.country)) : null;

  const geometry = useMemo(() => {
    try {
      const paths =
        feature.geometry.type === "Polygon"
          ? [feature.geometry.coordinates]
          : feature.geometry.coordinates;
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
      geo.computeBoundingBox();
      let { min, max } = geo.boundingBox;

      if (paths.length > 1) {
        let maxArea = 0;
        for (const polygon of paths) {
          let pMinX = Infinity, pMinY = Infinity, pMaxX = -Infinity, pMaxY = -Infinity;
          const coords = polygon[0];
          for (let i = 0; i < coords.length; i++) {
            const pt = mapCoordinates(coords[i][0], coords[i][1]);
            if (pt[0] < pMinX) pMinX = pt[0];
            if (pt[0] > pMaxX) pMaxX = pt[0];
            if (pt[1] < pMinY) pMinY = pt[1];
            if (pt[1] > pMaxY) pMaxY = pt[1];
          }
          const area = (pMaxX - pMinX) * (pMaxY - pMinY);
          if (area > maxArea) {
            maxArea = area;
            min = new THREE.Vector3(pMinX, pMinY, 0);
            max = new THREE.Vector3(pMaxX, pMaxY, 0);
          }
        }
      }
      const rangeX = max.x - min.x || 1;
      const rangeY = max.y - min.y || 1;
      const cx = (min.x + max.x) / 2;
      const cy = (min.y + max.y) / 2;

      let texW = rangeX;
      let texH = rangeX / 2.0; // 512x256 flag = 2.0 aspect ratio
      if (texH < rangeY) {
        texH = rangeY;
        texW = rangeY * 2.0;
      }

      const pos = geo.attributes.position;
      const uv = geo.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const u = (pos.getX(i) - cx) / texW + 0.5;
        const v = (pos.getY(i) - cy) / texH + 0.5;
        uv.setXY(i, u, v);
      }
      uv.needsUpdate = true;
      return geo;
    } catch {
      return null;
    }
  }, [feature]);

  const centroid = useMemo(() => getCountryCentroid(feature), [feature]);

  useEffect(() => {
    const meshNode = meshRef.current;
    if (meshNode && owner) {
      const existing = threeContext.meshes.find((m) => m.mesh === meshNode);
      if (!existing) {
        threeContext.meshes.push({ mesh: meshNode, ownerId: owner.socketId });
      } else {
        existing.ownerId = owner.socketId;
      }
    }
    return () => {
      threeContext.meshes = threeContext.meshes.filter(
        (m) => m.mesh !== meshNode,
      );
    };
  }, [owner]);

  const hoveredRef = useRef(false);
  useEffect(() => {
    hoveredRef.current = hovered;
  }, [hovered]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const entry = {
      mesh,
      get ownerId() {
        return owner?.socketId;
      },
      isMyCountry,
      hoveredRef,
    };
    countryMeshRegistry.add(entry);
    return () => {
      countryMeshRegistry.delete(entry);
    };
  }, [owner, isMyCountry]);

  if (!geometry) return null;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      userData={{ countryName: name, ownerId: owner?.socketId }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
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
        color="#ffffff"
        transparent
        opacity={owner ? (isMyCountry ? 1.0 : 0.9) : 0.6}
        side={THREE.DoubleSide}
      />
      {isMyCountry && owner && geometry && (
        <lineSegments
          geometry={new THREE.EdgesGeometry(geometry)}
          position={[0, 0, 0.1]}
        >
          <lineBasicMaterial
            color="#ffffff"
            linewidth={2}
            transparent
            opacity={0.9}
          />
        </lineSegments>
      )}
      {lobbyState === "active" && owner && (
        <Html
          position={[centroid[0], centroid[1], 1]}
          center
          style={{ pointerEvents: "none" }}
        >
          <div
            className="map-tactical-overlay"
            style={{ pointerEvents: "none" }}
          >
            <div className="map-country-label">{owner.country}</div>
            <div className="map-hp-bar">
              <div
                className="map-hp-fill"
                style={{ width: `${owner.hp}%` }}
              ></div>
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
});
CountryMesh.displayName = "CountryMesh";

const ContextBridge = () => {
  const { camera, scene } = useThree();
  useEffect(() => {
    threeContext.camera = camera;
    threeContext.scene = scene;
  }, [camera, scene]);
  return null;
};

const MapScene = () => {
  const myCountry = useGameStore((s) => s.myCountry);
  const lobbyState = useGameStore((s) => s.gameState?.lobbyState);
  const [focusCenter, setFocusCenter] = useState(null);
  const targetZoom = useRef(3);
  const targetPan = useRef({ x: 0, y: 0 });
  const isDraggingMap = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const lobbyStateRef = useRef(lobbyState);
  useEffect(() => {
    lobbyStateRef.current = lobbyState;
  }, [lobbyState]);

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
    const el = document.getElementById("map-container");
    const handleWheel = (e) => {
      if (
        lobbyStateRef.current === "waiting" ||
        lobbyStateRef.current === "starting"
      )
        return;
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
      if (
        lobbyStateRef.current === "waiting" ||
        lobbyStateRef.current === "starting"
      )
        return;
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
      setTimeout(() => {
        mapPanState.isDragging = false;
      }, 50);
    };

    if (el) {
      el.addEventListener("wheel", handleWheel, { passive: true });
      el.addEventListener("pointerdown", handlePointerDown);
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    }
    return () => {
      if (el) {
        el.removeEventListener("wheel", handleWheel);
        el.removeEventListener("pointerdown", handlePointerDown);
      }
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  const meshes = useMemo(() => {
    if (!countriesData || !countriesData.features) return [];
    return countriesData.features
      .filter((f) => (f.properties.name || f.properties.ADMIN) !== "Antarctica")
      .map((f, i) => (
        <CountryMesh
          key={i}
          feature={f}
          myCountry={myCountry}
          onFocus={setFocusCenter}
        />
      ));
  }, [myCountry]);

  useFrame((state) => {
    const viewWidth = window.innerWidth / targetZoom.current / 2;
    const viewHeight = window.innerHeight / targetZoom.current / 2;

    const limitX = Math.max(0, 260 - viewWidth);
    const limitY = Math.max(0, 130 - viewHeight);

    targetPan.current.x = Math.max(
      -limitX,
      Math.min(limitX, targetPan.current.x),
    );
    targetPan.current.y = Math.max(
      -limitY,
      Math.min(limitY, targetPan.current.y),
    );

    const cam = state.camera;
    const dx = targetPan.current.x - cam.position.x;
    const dy = targetPan.current.y - cam.position.y;
    const dz = targetZoom.current - cam.zoom;
    if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001 || Math.abs(dz) > 0.001) {
      cam.position.x += dx * 0.1;
      cam.position.y += dy * 0.1;
      cam.zoom += dz * 0.1;
      cam.updateProjectionMatrix();
    }

    const dragTargetId = dragOverState.targetId;
    countryMeshRegistry.forEach((entry) => {
      const mesh = entry.mesh;
      if (!mesh) return;
      const isDragOver = !!entry.ownerId && dragTargetId === entry.ownerId;
      const isHighlighted =
        entry.isMyCountry || entry.hoveredRef.current || isDragOver;
      const targetZ = isHighlighted ? 0.5 : 0;
      const targetScale = isDragOver ? 1.06 : isHighlighted ? 1.02 : 1.0;
      const zDelta = targetZ - mesh.position.z;
      const sDelta = targetScale - mesh.scale.x;
      if (Math.abs(zDelta) > 0.001) mesh.position.z += zDelta * 0.2;
      if (Math.abs(sDelta) > 0.001) {
        const ns = mesh.scale.x + sDelta * 0.2;
        mesh.scale.set(ns, ns, ns);
      }
      if (isDragOver) {
        mesh.material.color.lerp(COLOR_HIGHLIGHT, 0.25);
      } else if (
        mesh.material.color.r < 0.995 ||
        mesh.material.color.g < 0.995 ||
        mesh.material.color.b < 0.995
      ) {
        mesh.material.color.lerp(COLOR_WHITE, 0.2);
      }
    });
  });

  return <group onPointerMissed={() => setFocusCenter(null)}>{meshes}</group>;
};

const SOFT_PUFF_TEXTURE = (() => {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0.0, "rgba(255,255,255,1.0)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.55)");
  grad.addColorStop(0.7, "rgba(255,255,255,0.15)");
  grad.addColorStop(1.0, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
})();

const useAnimProgress = (duration) => {
  const [progress, setProgress] = useState(0);
  const startRef = useRef(null);
  const lastRef = useRef(-Infinity);
  useFrame(() => {
    const now = performance.now();
    if (startRef.current === null) startRef.current = now;
    const t = Math.min(1, (now - startRef.current) / duration);
    if (t === 1 || now - lastRef.current > 40) {
      lastRef.current = now;
      if (t !== progress) setProgress(t);
    }
  });
  return progress;
};

const tmpColor = new THREE.Color();

const MissileAnimation = ({ evt }) => {
  const duration = evt.success ? (evt.deflected ? 1600 : 1400) : 1000;
  const startRef = useRef(null);
  const missileMatRef = useRef();
  const streakMeshRef = useRef();
  const streakGlowRef = useRef();
  const streakHeadRef = useRef();
  const impactGroupRef = useRef();
  const impactDataRef = useRef({ flashOp: 0, fireOp: 0 });
  const impactFlashRef = useRef();
  const impactFireRef = useRef();
  const impactFire2Ref = useRef();

  // Defense refs
  const domeRef = useRef();
  const domeMatRef = useRef();
  const domeBulletArr = useRef([]);
  const midAirImpactRef = useRef();

  const dx = evt.end.x - evt.start.x;
  const dy = evt.end.y - evt.start.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const arcH = Math.min(10, dist * 0.07);

  const domeShots = useState(() =>
    Array.from({ length: 4 }, (_, i) => ({ start: 0.2 + i * 0.05 })),
  )[0];

  useFrame(() => {
    const now = performance.now();
    if (startRef.current === null) startRef.current = now;
    const p = Math.min(1, (now - startRef.current) / duration);

    // If deflected/failed, missile gets blown up midway (approx p = 0.7 if duration is 1000)
    const interceptP = 0.7;
    let missileAlive = evt.success || p < interceptP;

    if (evt.firewallBlocked && p > 0.6) {
      missileAlive = false;
    }

    const missileOp = missileAlive
      ? p > 0.9
        ? Math.max(0, (1 - p) / 0.1)
        : 1
      : 0;
    if (missileMatRef.current) missileMatRef.current.opacity = missileOp;

    let bulletT = 0;
    let tailT = 0;

    if (evt.deflected) {
      if (p > 0.1 && p <= 0.4) {
        bulletT = ((p - 0.1) / 0.3) * 0.5;
        tailT = Math.max(0, bulletT - 0.12);
      } else if (p > 0.4 && p <= 0.72) {
        bulletT = 0.5 - ((p - 0.4) / 0.32) * 0.5;
        tailT = Math.min(0.5, bulletT + 0.12);
      }
    } else {
      bulletT = p < 0.1 ? 0 : p > 0.72 ? 1 : (p - 0.1) / 0.62;
      tailT = Math.max(0, bulletT - 0.12);
    }

    if (!evt.success && p >= interceptP) bulletT = interceptP;

    const showBullet =
      missileAlive &&
      bulletT > 0 &&
      bulletT < 1 &&
      (evt.deflected ? bulletT > 0.01 : true);

    const bx = evt.start.x + dx * bulletT;
    const by = evt.start.y + dy * bulletT + Math.sin(bulletT * Math.PI) * arcH;
    const tx = evt.start.x + dx * tailT;
    const ty = evt.start.y + dy * tailT + Math.sin(tailT * Math.PI) * arcH;

    if (streakMeshRef.current) {
      streakMeshRef.current.visible = showBullet;
      streakGlowRef.current.visible = showBullet;
      streakHeadRef.current.visible = showBullet;
      if (showBullet) {
        const sdx = bx - tx;
        const sdy = by - ty;
        const slen = Math.sqrt(sdx * sdx + sdy * sdy) || 0.01;
        const angle = Math.atan2(sdy, sdx);
        const cx = (bx + tx) / 2;
        const cy = (by + ty) / 2;
        streakMeshRef.current.position.set(cx, cy, 2.5);
        streakMeshRef.current.rotation.z = angle;
        streakMeshRef.current.scale.set(slen + 2.5, 0.5, 1);
        streakGlowRef.current.position.set(cx, cy, 2.4);
        streakGlowRef.current.rotation.z = angle;
        streakGlowRef.current.scale.set(slen + 5, 2.2, 1);
        streakHeadRef.current.position.set(bx, by, 2.6);
      }
    }

    // Normal impact on target
    if (evt.success && !evt.firewallBlocked) {
      const impactP = p > 0.72 ? (p - 0.72) / 0.28 : 0;
      if (impactGroupRef.current) {
        impactGroupRef.current.visible = impactP > 0;
        if (impactP > 0) {
          const flashP = Math.min(1, impactP / 0.08);
          const flashOp = flashP < 1 ? Math.pow(1 - flashP, 1.6) : 0;
          const fireP = Math.min(1, impactP / 0.35);
          const fireOp = Math.max(0, 1 - fireP);
          const fireScale = 1.5 + fireP * 6;
          if (impactFlashRef.current) {
            impactFlashRef.current.material.opacity = flashOp * 0.95;
            impactFlashRef.current.scale.setScalar(fireScale * 2.4);
          }
          if (impactFireRef.current) {
            impactFireRef.current.material.opacity = fireOp * 0.85;
            impactFireRef.current.scale.setScalar(fireScale * 1.25);
          }
          if (impactFire2Ref.current) {
            impactFire2Ref.current.material.opacity = fireOp * 0.95;
            impactFire2Ref.current.scale.setScalar(fireScale * 0.55);
          }
          impactDataRef.current.flashOp = flashOp;
          impactDataRef.current.fireOp = fireOp;
        }
      }
    }

    // Defense logic
    if (!evt.success) {
      if (domeRef.current && domeMatRef.current) {
        domeRef.current.visible = true;
        const domeAppearP = Math.min(1, p / 0.15);
        const domeScale = 12 * Math.min(1, domeAppearP * 1.2);
        domeRef.current.scale.set(domeScale, domeScale, 1);
        domeMatRef.current.opacity = domeAppearP;
      }
      const midX = evt.start.x + dx * interceptP;
      const midY =
        evt.start.y + dy * interceptP + Math.sin(interceptP * Math.PI) * arcH;

      for (let i = 0; i < domeShots.length; i++) {
        const s = domeShots[i];
        const br = domeBulletArr.current[i];
        if (p < s.start) {
          if (br) br.visible = false;
          continue;
        }
        const bulletTravel = 0.2;
        const bt = Math.min(1, (p - s.start) / bulletTravel);
        if (bt < 1 && p < interceptP) {
          const bxD = evt.end.x + (midX - evt.end.x) * bt;
          const byD = evt.end.y + (midY - evt.end.y) * bt;
          if (br) {
            br.visible = true;
            br.position.set(bxD, byD, 2.5);
          }
        } else {
          if (br) br.visible = false;
        }
      }

      if (midAirImpactRef.current) {
        if (p >= interceptP) {
          midAirImpactRef.current.visible = true;
          midAirImpactRef.current.position.set(midX, midY, 3);
          const blowP = Math.min(1, (p - interceptP) / (1 - interceptP));
          midAirImpactRef.current.scale.setScalar(1 + blowP * 15);
          midAirImpactRef.current.material.opacity = Math.max(0, 1 - blowP);
        } else {
          midAirImpactRef.current.visible = false;
        }
      }
    }
  });

  const missileTex = loadAttackTexture(ATTACK_TEXTURE_URLS.missile);
  const domeTex = loadAttackTexture(ATTACK_TEXTURE_URLS.dome);
  const missileSize = 16;
  const missileXScale = dx > 0 ? -missileSize : missileSize;

  return (
    <group raycast={nullRaycast}>
      <mesh
        position={[evt.start.x, evt.start.y, 3]}
        scale={[missileXScale, missileSize, 1]}
        raycast={nullRaycast}
        renderOrder={50}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={missileMatRef}
          map={missileTex}
          transparent
          opacity={1}
          depthTest={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={streakMeshRef} visible={false} raycast={nullRaycast}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={SOFT_PUFF_TEXTURE}
          color="#ffdd66"
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthTest={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={streakGlowRef} visible={false} raycast={nullRaycast}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={SOFT_PUFF_TEXTURE}
          color="#ffdd66"
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
          depthTest={false}
          toneMapped={false}
        />
      </mesh>
      <mesh
        ref={streakHeadRef}
        visible={false}
        scale={[1.1, 1.1, 1]}
        raycast={nullRaycast}
      >
        <circleGeometry args={[0.4, 10]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthTest={false}
          toneMapped={false}
        />
      </mesh>
      <group
        ref={impactGroupRef}
        position={
          evt.deflected
            ? [evt.start.x, evt.start.y, 2]
            : [evt.end.x, evt.end.y, 2]
        }
        visible={false}
        raycast={nullRaycast}
      >
        <mesh ref={impactFlashRef} position={[0, 0, 0.5]} raycast={nullRaycast}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={SOFT_PUFF_TEXTURE}
            color="#ffffff"
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthTest={false}
            toneMapped={false}
          />
        </mesh>
        <mesh ref={impactFireRef} position={[0, 0, 0.42]} raycast={nullRaycast}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={SOFT_PUFF_TEXTURE}
            color="#ff5522"
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthTest={false}
            toneMapped={false}
          />
        </mesh>
        <mesh
          ref={impactFire2Ref}
          position={[0, 0, 0.44]}
          raycast={nullRaycast}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={SOFT_PUFF_TEXTURE}
            color="#ffee66"
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthTest={false}
            toneMapped={false}
          />
        </mesh>
      </group>
      {!evt.success && (
        <group raycast={nullRaycast}>
          <mesh
            ref={domeRef}
            position={[evt.end.x, evt.end.y, 3]}
            visible={false}
            raycast={nullRaycast}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              ref={domeMatRef}
              map={domeTex}
              transparent
              depthTest={false}
              toneMapped={false}
            />
          </mesh>
          {domeShots.map((_, i) => (
            <mesh
              key={`ds${i}`}
              ref={(el) => {
                domeBulletArr.current[i] = el;
              }}
              visible={false}
              raycast={nullRaycast}
            >
              <circleGeometry args={[0.5, 8]} />
              <meshBasicMaterial
                color="#aaddff"
                transparent
                opacity={0.8}
                blending={THREE.AdditiveBlending}
                depthTest={false}
                toneMapped={false}
              />
            </mesh>
          ))}
          <mesh ref={midAirImpactRef} visible={false} raycast={nullRaycast}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              map={SOFT_PUFF_TEXTURE}
              color="#ffffff"
              transparent
              opacity={0}
              blending={THREE.AdditiveBlending}
              depthTest={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      )}
    </group>
  );
};

const JetAnimation = ({ evt }) => {
  const duration = evt.success ? 1800 : 1200;
  const startRef = useRef(null);
  const jetMeshRef = useRef();
  const jetMatRef = useRef();
  const bombArr = useRef([]);
  const bombGlowArr = useRef([]);
  const impactArr = useRef([]);
  const impactMatArr = useRef([]);

  // Defense refs
  const radarRef = useRef();
  const radarMatRef = useRef();
  const radarBulletArr = useRef([]);
  const jetFireRef = useRef();
  const jetSmokeRef = useRef();

  const dx = evt.end.x - evt.start.x;
  const dy = evt.end.y - evt.start.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const angle = Math.atan2(dy, dx);
  const overshoot = Math.max(20, dist * 0.45);
  const extX = evt.end.x + Math.cos(angle) * overshoot;
  const extY = evt.end.y + Math.sin(angle) * overshoot;
  const totalLen = dist + overshoot;
  const tAtTarget = dist / totalLen;
  const perpX = -Math.sin(angle);
  const perpY = Math.cos(angle);

  const bombs = useMemo(
    () =>
      Array.from({ length: 3 }, (_, i) => {
        const releaseProgress = 0.32 + i * 0.05;
        let releaseT;
        if (releaseProgress < 0.45)
          releaseT = (releaseProgress / 0.45) * (tAtTarget * 0.65);
        else if (releaseProgress < 0.7)
          releaseT =
            tAtTarget * 0.65 +
            ((releaseProgress - 0.45) / 0.25) * (tAtTarget * 0.18);
        else
          releaseT =
            tAtTarget * 0.83 +
            ((releaseProgress - 0.7) / 0.3) * (1 - tAtTarget * 0.83);
        const lateral = (i - 1) * 4;
        return {
          releaseProgress,
          travelDuration: 0.16,
          originX: evt.start.x + (extX - evt.start.x) * releaseT,
          originY: evt.start.y + (extY - evt.start.y) * releaseT,
          targetX: evt.end.x + perpX * lateral,
          targetY: evt.end.y + perpY * lateral,
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }),
    [],
  );

  const radarShots = useState(() =>
    Array.from({ length: 6 }, (_, i) => ({ start: 0.1 + i * 0.06 })),
  )[0];

  useFrame(() => {
    const now = performance.now();
    if (startRef.current === null) startRef.current = now;
    const p = Math.min(1, (now - startRef.current) / duration);

    const interceptP = 0.6; // when jet gets destroyed if !success
    const jetAlive = evt.success || p < interceptP;

    let jetT;
    const effectiveP = jetAlive ? p : interceptP;
    if (effectiveP < 0.45) jetT = (effectiveP / 0.45) * (tAtTarget * 0.65);
    else if (effectiveP < 0.7)
      jetT =
        tAtTarget * 0.65 + ((effectiveP - 0.45) / 0.25) * (tAtTarget * 0.18);
    else
      jetT =
        tAtTarget * 0.83 + ((effectiveP - 0.7) / 0.3) * (1 - tAtTarget * 0.83);

    const jx = evt.start.x + (extX - evt.start.x) * jetT;
    const jy = evt.start.y + (extY - evt.start.y) * jetT;

    if (jetMeshRef.current) {
      jetMeshRef.current.position.set(jx, jy, 3);
      if (!evt.success && p >= interceptP) {
        jetMeshRef.current.position.y -= (p - interceptP) * 30; // falling down visually
      }
      jetMeshRef.current.visible = jetAlive || (!evt.success && p < 1.0);
      if (jetMatRef.current) {
        jetMatRef.current.opacity = jetAlive
          ? 1
          : Math.max(0, 1 - (p - interceptP) / 0.4);
      }
    }

    if (evt.success) {
      for (let i = 0; i < bombs.length; i++) {
        const b = bombs[i];
        const bref = bombArr.current[i];
        const gref = bombGlowArr.current[i];
        const iref = impactArr.current[i];
        const imat = impactMatArr.current[i];
        if (p < b.releaseProgress) {
          if (bref) bref.visible = false;
          if (gref) gref.visible = false;
          if (iref) iref.visible = false;
          continue;
        }
        const bt = Math.min(1, (p - b.releaseProgress) / b.travelDuration);
        if (bt < 1) {
          const bx = b.originX + (b.targetX - b.originX) * bt;
          const by = b.originY + (b.targetY - b.originY) * bt;
          if (bref) {
            bref.visible = true;
            bref.position.set(bx, by, 2);
          }
          if (gref) {
            gref.visible = true;
            gref.position.set(bx, by, 2);
          }
          if (iref) iref.visible = false;
        } else {
          if (bref) bref.visible = false;
          if (gref) gref.visible = false;
          const impactP = Math.min(
            1,
            (p - b.releaseProgress - b.travelDuration) / 0.45,
          );
          if (iref && imat && impactP > 0 && impactP < 1) {
            iref.visible = true;
            const fireP = Math.min(1, impactP / 0.35);
            const fireOp = Math.max(0, 1 - fireP);
            const fireScale = 1.5 + fireP * 6;
            iref.scale.setScalar(fireScale * 1.25);
            imat.opacity = fireOp * 0.9;
          } else if (iref) {
            iref.visible = false;
          }
        }
      }
    } else {
      // Failed jet (radar counter)
      if (radarRef.current && radarMatRef.current) {
        radarRef.current.visible = true;
        const radarAppearP = Math.min(1, p / 0.15);
        const radarScale = 12 * Math.min(1, radarAppearP * 1.2);
        radarRef.current.scale.set(radarScale, radarScale, 1);
        radarMatRef.current.opacity = radarAppearP;
      }

      const midHitP = interceptP;
      const midHitT = (midHitP / 0.45) * (tAtTarget * 0.65);
      const hitX = evt.start.x + (extX - evt.start.x) * midHitT;
      const hitY = evt.start.y + (extY - evt.start.y) * midHitT;

      for (let i = 0; i < radarShots.length; i++) {
        const s = radarShots[i];
        const br = radarBulletArr.current[i];
        if (p < s.start) {
          if (br) br.visible = false;
          continue;
        }
        const bulletTravel = 0.25;
        const bt = Math.min(1, (p - s.start) / bulletTravel);
        if (bt < 1 && p < interceptP) {
          const bxD = evt.end.x + (hitX - evt.end.x) * bt;
          const byD = evt.end.y + (hitY - evt.end.y) * bt;
          if (br) {
            br.visible = true;
            br.position.set(bxD, byD, 2.5);
          }
        } else {
          if (br) br.visible = false;
        }
      }

      if (p >= interceptP) {
        const explP = Math.min(1, (p - interceptP) / 0.4);
        if (jetFireRef.current) {
          jetFireRef.current.visible = true;
          // follow falling jet
          jetFireRef.current.position.set(jx, jy - (p - interceptP) * 30, 3.1);
          jetFireRef.current.scale.setScalar(
            8 + Math.sin(explP * Math.PI) * 10,
          );
          jetFireRef.current.material.opacity = Math.max(0, 1 - explP);
        }
        if (jetSmokeRef.current) {
          jetSmokeRef.current.visible = true;
          jetSmokeRef.current.position.set(jx, jy - (p - interceptP) * 15, 3.2);
          jetSmokeRef.current.scale.setScalar(10 + explP * 25);
          jetSmokeRef.current.material.opacity =
            Math.max(0, 1 - explP * 1.5) * 0.8;
        }
      } else {
        if (jetFireRef.current) jetFireRef.current.visible = false;
        if (jetSmokeRef.current) jetSmokeRef.current.visible = false;
      }
    }
  });

  const jetTex = loadAttackTexture(ATTACK_TEXTURE_URLS.jet);
  const radarTex = loadAttackTexture(ATTACK_TEXTURE_URLS.radar);
  const size = 24;
  const xScale = dx > 0 ? -size : size;
  return (
    <group raycast={nullRaycast}>
      <mesh
        ref={jetMeshRef}
        scale={[xScale, size, 1]}
        raycast={nullRaycast}
        renderOrder={50}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={jetMatRef}
          map={jetTex}
          transparent
          opacity={1}
          depthTest={false}
          toneMapped={false}
        />
      </mesh>
      {bombs.map((_, i) => (
        <React.Fragment key={i}>
          <mesh
            ref={(el) => {
              bombArr.current[i] = el;
            }}
            visible={false}
            raycast={nullRaycast}
          >
            <circleGeometry args={[1.4, 14]} />
            <meshBasicMaterial
              color="#ffcc44"
              transparent
              opacity={1}
              depthTest={false}
              toneMapped={false}
            />
          </mesh>
          <mesh
            ref={(el) => {
              bombGlowArr.current[i] = el;
            }}
            visible={false}
            raycast={nullRaycast}
          >
            <circleGeometry args={[3.1, 16]} />
            <meshBasicMaterial
              color="#ffcc44"
              transparent
              opacity={0.35}
              depthTest={false}
              toneMapped={false}
            />
          </mesh>
          <mesh
            ref={(el) => {
              impactArr.current[i] = el;
            }}
            position={[bombs[i].targetX, bombs[i].targetY, 2]}
            visible={false}
            raycast={nullRaycast}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              ref={(el) => {
                impactMatArr.current[i] = el;
              }}
              map={SOFT_PUFF_TEXTURE}
              color="#ff7722"
              transparent
              opacity={0}
              blending={THREE.AdditiveBlending}
              depthTest={false}
              toneMapped={false}
            />
          </mesh>
        </React.Fragment>
      ))}
      {!evt.success && (
        <group raycast={nullRaycast}>
          <mesh
            ref={radarRef}
            position={[evt.end.x, evt.end.y, 3]}
            visible={false}
            raycast={nullRaycast}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              ref={radarMatRef}
              map={radarTex}
              transparent
              depthTest={false}
              toneMapped={false}
            />
          </mesh>
          {radarShots.map((_, i) => (
            <mesh
              key={`rs${i}`}
              ref={(el) => {
                radarBulletArr.current[i] = el;
              }}
              visible={false}
              raycast={nullRaycast}
            >
              <circleGeometry args={[0.6, 8]} />
              <meshBasicMaterial
                color="#ffcc44"
                transparent
                opacity={0.85}
                blending={THREE.AdditiveBlending}
                depthTest={false}
                toneMapped={false}
              />
            </mesh>
          ))}
          <mesh ref={jetFireRef} visible={false} raycast={nullRaycast}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              map={SOFT_PUFF_TEXTURE}
              color="#ff6600"
              transparent
              opacity={0}
              blending={THREE.AdditiveBlending}
              depthTest={false}
              toneMapped={false}
            />
          </mesh>
          <mesh ref={jetSmokeRef} visible={false} raycast={nullRaycast}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              map={SOFT_PUFF_TEXTURE}
              color="#aaaaaa"
              transparent
              opacity={0}
              blending={THREE.AdditiveBlending}
              depthTest={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      )}
    </group>
  );
};

const TankAnimation = ({ evt }) => {
  const duration = evt.success ? 1600 : 2000;
  const startRef = useRef(null);
  const SHOT_COUNT = 5;
  const bulletArr = useRef([]);
  const glowArr = useRef([]);
  const impactArr = useRef([]);
  const impactMatArr = useRef([]);

  const tankMeshRef = useRef();
  const tankMatRef = useRef();

  // Defense refs
  const stickyBombRef = useRef();
  const stickyBombMatRef = useRef();
  const tankExplosionRef = useRef();

  const tankPos = evt.tankSpawn || [
    evt.start.x + (evt.end.x - evt.start.x) * 0.86,
    evt.start.y + (evt.end.y - evt.start.y) * 0.86,
  ];
  const tankX = tankPos[0];
  const tankY = tankPos[1];

  const shots = useState(() =>
    Array.from({ length: SHOT_COUNT }, (_, i) => {
      const ox = (Math.random() - 0.5) * 6;
      const oy = (Math.random() - 0.5) * 6;
      return {
        start: 0.12 + i * 0.11,
        tx: evt.end.x + ox,
        ty: evt.end.y + oy,
      };
    }),
  )[0];

  useFrame(() => {
    const now = performance.now();
    if (startRef.current === null) startRef.current = now;
    const p = Math.min(1, (now - startRef.current) / duration);

    if (evt.success) {
      for (let i = 0; i < shots.length; i++) {
        const s = shots[i];
        const br = bulletArr.current[i];
        const gr = glowArr.current[i];
        const ir = impactArr.current[i];
        const im = impactMatArr.current[i];
        if (p < s.start) {
          if (br) br.visible = false;
          if (gr) gr.visible = false;
          if (ir) ir.visible = false;
          continue;
        }
        const bt = Math.min(1, (p - s.start) / 0.22);
        if (bt < 1) {
          const bx = tankX + (s.tx - tankX) * bt;
          const by = tankY + (s.ty - tankY) * bt;
          if (br) {
            br.visible = true;
            br.position.set(bx, by, 2);
          }
          if (gr) {
            gr.visible = true;
            gr.position.set(bx, by, 2);
          }
          if (ir) ir.visible = false;
        } else {
          if (br) br.visible = false;
          if (gr) gr.visible = false;
          const impactP = Math.min(1, (p - s.start - 0.22) / 0.35);
          if (ir && im && impactP > 0 && impactP < 1) {
            ir.visible = true;
            const fireP = Math.min(1, impactP / 0.35);
            const fireOp = Math.max(0, 1 - fireP);
            const fireScale = 1.5 + fireP * 6;
            ir.scale.setScalar(fireScale * 1.25);
            im.opacity = fireOp * 0.9;
          } else if (ir) {
            ir.visible = false;
          }
        }
      }
    } else {
      // Sticky Bomb counter
      const travelEnd = 0.4;
      if (stickyBombRef.current) {
        if (p < travelEnd) {
          stickyBombRef.current.visible = true;
          const t = p / travelEnd;
          const arc = Math.sin(t * Math.PI) * 15; // Arc height
          const bx = evt.end.x + (tankX - evt.end.x) * t;
          const by = evt.end.y + (tankY - evt.end.y) * t + arc;
          stickyBombRef.current.position.set(bx, by, 4);
          stickyBombRef.current.rotation.z = t * Math.PI * 4; // spin
          stickyBombRef.current.scale.set(9, 9, 1);
        } else {
          stickyBombRef.current.visible = false;
        }
      }

      if (tankMeshRef.current) {
        if (p >= travelEnd) {
          const destroyP = Math.min(1, (p - travelEnd) / 0.6);
          // Topple over
          tankMeshRef.current.rotation.z = destroyP * Math.PI;
          tankMeshRef.current.position.y = tankY - destroyP * 20; // go away downwards
          if (tankMatRef.current) {
            tankMatRef.current.opacity = Math.max(0, 1 - destroyP);
          }
        }
      }

      if (tankExplosionRef.current) {
        if (p >= travelEnd && p < travelEnd + 0.3) {
          tankExplosionRef.current.visible = true;
          tankExplosionRef.current.position.set(tankX, tankY, 3.5);
          const explP = (p - travelEnd) / 0.3;
          tankExplosionRef.current.scale.setScalar(5 + explP * 12);
          tankExplosionRef.current.material.opacity = Math.max(0, 1 - explP);
        } else {
          tankExplosionRef.current.visible = false;
        }
      }
    }
  });

  const tankTex = loadAttackTexture(ATTACK_TEXTURE_URLS.tank);
  const stickyBombTex = loadAttackTexture(ATTACK_TEXTURE_URLS.stickybomb);
  const tankSize = 20;
  const tankXScale = evt.end.x - tankX > 0 ? -tankSize : tankSize;

  return (
    <group raycast={nullRaycast}>
      <mesh
        ref={tankMeshRef}
        position={[tankX, tankY, 3]}
        scale={[tankXScale, tankSize, 1]}
        raycast={nullRaycast}
        renderOrder={50}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={tankMatRef}
          map={tankTex}
          transparent
          depthTest={false}
          toneMapped={false}
        />
      </mesh>
      {shots.map((s, i) => (
        <React.Fragment key={i}>
          <mesh
            ref={(el) => {
              bulletArr.current[i] = el;
            }}
            visible={false}
            raycast={nullRaycast}
          >
            <circleGeometry args={[1.6, 14]} />
            <meshBasicMaterial
              color="#ffdd44"
              transparent
              depthTest={false}
              toneMapped={false}
            />
          </mesh>
          <mesh
            ref={(el) => {
              glowArr.current[i] = el;
            }}
            visible={false}
            raycast={nullRaycast}
          >
            <circleGeometry args={[3.5, 16]} />
            <meshBasicMaterial
              color="#ffdd44"
              transparent
              opacity={0.35}
              depthTest={false}
              toneMapped={false}
            />
          </mesh>
          <mesh
            ref={(el) => {
              impactArr.current[i] = el;
            }}
            position={[s.tx, s.ty, 2]}
            visible={false}
            raycast={nullRaycast}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              ref={(el) => {
                impactMatArr.current[i] = el;
              }}
              map={SOFT_PUFF_TEXTURE}
              color="#ff8822"
              transparent
              opacity={0}
              blending={THREE.AdditiveBlending}
              depthTest={false}
              toneMapped={false}
            />
          </mesh>
        </React.Fragment>
      ))}
      {!evt.success && (
        <group raycast={nullRaycast}>
          <mesh
            ref={stickyBombRef}
            visible={false}
            raycast={nullRaycast}
            renderOrder={55}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              map={stickyBombTex}
              transparent
              depthTest={false}
              toneMapped={false}
            />
          </mesh>
          <mesh ref={tankExplosionRef} visible={false} raycast={nullRaycast}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              map={SOFT_PUFF_TEXTURE}
              color="#ff6600"
              transparent
              opacity={0}
              blending={THREE.AdditiveBlending}
              depthTest={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      )}
    </group>
  );
};

const SubAnimation = ({ evt }) => {
  const duration = evt.success ? 1600 : 2000;
  const startRef = useRef(null);
  const SHOT_COUNT = 4;
  const bulletArr = useRef([]);
  const impactArr = useRef([]);
  const impactMatArr = useRef([]);

  const subMeshRef = useRef();
  const subMatRef = useRef();

  // Defense refs
  const mineRef = useRef();
  const mineMatRef = useRef();
  const subExplosionRef = useRef();

  const subPos = evt.subSpawn;
  const subX = subPos ? subPos[0] : evt.end.x;
  const subY = subPos ? subPos[1] : evt.end.y;

  const shots = useState(() =>
    Array.from({ length: SHOT_COUNT }, (_, i) => {
      const ox = (Math.random() - 0.5) * 4;
      const oy = (Math.random() - 0.5) * 4;
      return {
        start: 0.18 + i * 0.13,
        tx: evt.end.x + ox,
        ty: evt.end.y + oy,
      };
    }),
  )[0];

  useFrame(() => {
    const now = performance.now();
    if (startRef.current === null) startRef.current = now;
    const p = Math.min(1, (now - startRef.current) / duration);

    if (evt.success) {
      for (let i = 0; i < shots.length; i++) {
        const s = shots[i];
        const br = bulletArr.current[i];
        const ir = impactArr.current[i];
        const im = impactMatArr.current[i];
        if (p < s.start) {
          if (br) br.visible = false;
          if (ir) ir.visible = false;
          continue;
        }
        const bt = Math.min(1, (p - s.start) / 0.32);
        if (bt < 1) {
          const bx = subX + (s.tx - subX) * bt;
          const by =
            subY + (s.ty - subY) * bt + Math.sin(bt * Math.PI * 6) * 0.8;
          if (br) {
            br.visible = true;
            br.position.set(bx, by, 2);
          }
          if (ir) ir.visible = false;
        } else {
          if (br) br.visible = false;
          const impactP = Math.min(1, (p - s.start - 0.32) / 0.4);
          if (ir && im && impactP > 0 && impactP < 1) {
            ir.visible = true;
            const fireP = Math.min(1, impactP / 0.35);
            const fireOp = Math.max(0, 1 - fireP);
            const fireScale = 1.5 + fireP * 5;
            ir.scale.setScalar(fireScale * 1.25);
            im.opacity = fireOp * 0.85;
          } else if (ir) {
            ir.visible = false;
          }
        }
      }
    } else {
      // Naval mine counter
      const mineAppearEnd = 0.3;
      const explodeStart = 0.45;

      if (mineRef.current && mineMatRef.current) {
        if (p < explodeStart) {
          mineRef.current.visible = true;
          const mineP = Math.min(1, p / mineAppearEnd);
          const sc = mineP * 12; // pop up
          mineRef.current.scale.set(sc, sc, 1);
          mineRef.current.position.set(subX + 10, subY + 5, 3.5);
          mineMatRef.current.opacity = mineP;
        } else {
          mineRef.current.visible = false;
        }
      }

      if (subMeshRef.current && subMatRef.current) {
        if (p >= explodeStart) {
          const destroyP = Math.min(1, (p - explodeStart) / 0.5);
          subMeshRef.current.position.y -= destroyP * 0.5; // sink down slowly
          subMatRef.current.opacity = Math.max(0, 1 - destroyP);
        }
      }

      if (subExplosionRef.current) {
        if (p >= explodeStart && p < explodeStart + 0.4) {
          subExplosionRef.current.visible = true;
          subExplosionRef.current.position.set(subX + 5, subY + 2, 4);
          const explP = (p - explodeStart) / 0.4;
          subExplosionRef.current.scale.setScalar(6 + explP * 14);
          subExplosionRef.current.material.opacity = Math.max(0, 1 - explP);
        } else {
          subExplosionRef.current.visible = false;
        }
      }
    }
  });

  const subTex = loadAttackTexture(ATTACK_TEXTURE_URLS.sub);
  const navalmineTex = loadAttackTexture(ATTACK_TEXTURE_URLS.navalmine);
  const subSize = 15;
  const subXScale = evt.end.x - subX > 0 ? -subSize : subSize;
  return (
    <group raycast={nullRaycast}>
      <mesh
        ref={subMeshRef}
        position={[subX, subY, 3]}
        scale={[subXScale, subSize, 1]}
        raycast={nullRaycast}
        renderOrder={50}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={subMatRef}
          map={subTex}
          transparent
          depthTest={false}
          toneMapped={false}
        />
      </mesh>
      {shots.map((s, i) => (
        <React.Fragment key={i}>
          <mesh
            ref={(el) => {
              bulletArr.current[i] = el;
            }}
            visible={false}
            raycast={nullRaycast}
          >
            <circleGeometry args={[0.7, 12]} />
            <meshBasicMaterial
              color="#aaddff"
              transparent
              depthTest={false}
              toneMapped={false}
            />
          </mesh>
          <mesh
            ref={(el) => {
              impactArr.current[i] = el;
            }}
            position={[s.tx, s.ty, 2]}
            visible={false}
            raycast={nullRaycast}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              ref={(el) => {
                impactMatArr.current[i] = el;
              }}
              map={SOFT_PUFF_TEXTURE}
              color="#99ccff"
              transparent
              opacity={0}
              blending={THREE.AdditiveBlending}
              depthTest={false}
              toneMapped={false}
            />
          </mesh>
        </React.Fragment>
      ))}
      {!evt.success && (
        <group raycast={nullRaycast}>
          <mesh
            ref={mineRef}
            visible={false}
            raycast={nullRaycast}
            renderOrder={55}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              ref={mineMatRef}
              map={navalmineTex}
              transparent
              depthTest={false}
              toneMapped={false}
            />
          </mesh>
          <mesh ref={subExplosionRef} visible={false} raycast={nullRaycast}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              map={SOFT_PUFF_TEXTURE}
              color="#ff3300"
              transparent
              opacity={0}
              blending={THREE.AdditiveBlending}
              depthTest={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      )}
    </group>
  );
};

const DEBRIS_COUNT = 10;
const INNER_PUFF_COUNT = 5;
const CENTRAL_COUNT = 3;
const FIRE_LAYER_COUNT = 4;
const FLASH_LAYER_COUNT = 2;

const NukeAnimation = ({ evt }) => {
  const duration = 3000;
  const startRef = useRef(null);

  const targetX = evt.deflected ? evt.start.x : evt.end.x;
  const targetY = evt.deflected ? evt.start.y : evt.end.y;

  const nukeMeshRef = useRef();
  const nukeMatRef = useRef();
  const explosionGroupRef = useRef();

  const flashArr = useRef([]);
  const flashMatArr = useRef([]);
  const fireArr = useRef([]);
  const fireMatArr = useRef([]);
  const debrisArr = useRef([]);
  const debrisMatArr = useRef([]);
  const innerArr = useRef([]);
  const innerMatArr = useRef([]);
  const centralArr = useRef([]);
  const centralMatArr = useRef([]);

  const debris = useState(() =>
    Array.from({ length: DEBRIS_COUNT }, (_, i) => ({
      angle: (i / DEBRIS_COUNT) * Math.PI * 2 + Math.random() * 0.4,
      distance: 45 + Math.random() * 50,
      delay: Math.random() * 0.1,
      size: 20 + Math.random() * 18,
      shade: 24 + Math.random() * 52,
      z: 0.55 + i * 0.007,
    })),
  )[0];
  const innerPuffs = useState(() =>
    Array.from({ length: INNER_PUFF_COUNT }, (_, i) => ({
      ox: (Math.random() - 0.5) * 12,
      oy: (Math.random() - 0.5) * 12,
      delay: 0.15 + i * 0.06 + Math.random() * 0.04,
      size: 24 + Math.random() * 16,
      shade: 30 + Math.random() * 38,
      z: 0.85 + i * 0.01,
      idxCos: Math.cos(i),
      idxSin: Math.sin(i * 1.7),
    })),
  )[0];
  const centralPuffs = useState(() => [
    {
      ox: 0,
      oy: 0,
      baseScale: 55,
      addScale: 40,
      color: "#1a1614",
      z: 1.0,
      maxOp: 0.92,
    },
    {
      ox: 5,
      oy: 2.5,
      baseScale: 36,
      addScale: 24,
      color: "#3a3028",
      z: 1.01,
      maxOp: 0.78,
    },
    {
      ox: -4,
      oy: -3,
      baseScale: 38,
      addScale: 26,
      color: "#2c2820",
      z: 1.02,
      maxOp: 0.82,
    },
  ])[0];
  const fireLayers = useState(() => [
    { scaleMul: 1.5, colorStart: "#cc1500", opMul: 0.72, z: 0.6 },
    { scaleMul: 1.15, colorStart: "#ff3300", opMul: 0.85, z: 0.63 },
    { scaleMul: 0.82, colorStart: "#ff6600", opMul: 0.92, z: 0.66 },
    { scaleMul: 0.3, colorStart: "#ffee88", opMul: 0.95, z: 0.72 },
  ])[0];

  const nukeFlipSign =
    targetX - (evt.deflected ? evt.end.x : evt.start.x) > 0 ? -1 : 1;

  useFrame(() => {
    const now = performance.now();
    if (startRef.current === null) startRef.current = now;
    const p = Math.min(1, (now - startRef.current) / duration);
    const fallEnd = 0.32;

    if (evt.firewallBlocked && p > fallEnd * 0.5) {
      if (nukeMeshRef.current) nukeMeshRef.current.visible = false;
      if (explosionGroupRef.current) explosionGroupRef.current.visible = false;
      return;
    }

    if (p < fallEnd) {
      if (explosionGroupRef.current) explosionGroupRef.current.visible = false;
      if (nukeMeshRef.current) {
        const t = p / fallEnd;
        const fallY = targetY + (1 - t) * 60;
        const sz = 20 + (32 - 20) * t;
        nukeMeshRef.current.visible = true;
        nukeMeshRef.current.position.set(targetX, fallY, 5);
        nukeMeshRef.current.scale.set(sz * nukeFlipSign, sz, 1);
      }
      return;
    }

    if (nukeMeshRef.current) nukeMeshRef.current.visible = false;
    if (!explosionGroupRef.current) return;
    explosionGroupRef.current.visible = true;

    const t = (p - fallEnd) / (1 - fallEnd);

    const flashP = Math.min(1, t / 0.06);
    const flashOp = flashP < 1 ? Math.pow(1 - flashP, 1.3) : 0;
    const f0 = flashArr.current[0];
    const fm0 = flashMatArr.current[0];
    if (f0 && fm0) {
      f0.visible = flashOp > 0.01;
      if (f0.visible) {
        const s = 80 + flashP * 60;
        f0.scale.set(s, s, 1);
        fm0.opacity = flashOp * 0.95;
      }
    }
    const f1 = flashArr.current[1];
    const fm1 = flashMatArr.current[1];
    if (f1 && fm1) {
      f1.visible = flashOp > 0.01;
      if (f1.visible) {
        const s = 40 + flashP * 35;
        f1.scale.set(s, s, 1);
        fm1.opacity = flashOp;
      }
    }

    const fireP = Math.min(1, t / 0.38);
    const fireOp = Math.max(0, 1 - Math.pow(fireP, 1.4));
    const fireScale = 10 + fireP * 60;
    for (let i = 0; i < fireLayers.length; i++) {
      const L = fireLayers[i];
      const m = fireArr.current[i];
      const mat = fireMatArr.current[i];
      if (!m || !mat) continue;
      m.visible = fireOp > 0.01;
      if (m.visible) {
        const s = fireScale * L.scaleMul;
        m.scale.set(s, s, 1);
        mat.opacity = fireOp * L.opMul;
      }
    }

    for (let i = 0; i < debris.length; i++) {
      const d = debris[i];
      const m = debrisArr.current[i];
      const mat = debrisMatArr.current[i];
      if (!m || !mat) continue;
      const pt = Math.max(
        0,
        (t - d.delay - 0.02) / Math.max(0.001, 0.92 - d.delay),
      );
      if (pt <= 0 || pt >= 1) {
        m.visible = false;
        continue;
      }
      m.visible = true;
      const eased = 1 - Math.pow(1 - pt, 1.5);
      const dist = eased * d.distance;
      const px = Math.cos(d.angle) * dist;
      const py = Math.sin(d.angle) * dist;
      const s = d.size * (0.5 + pt * 1.9);
      m.position.set(px, py, d.z);
      m.scale.set(s, s, 1);
      const shade = Math.max(0, Math.min(255, Math.floor(d.shade + pt * 32)));
      tmpColor.setRGB(
        shade / 255,
        Math.max(0, shade - 6) / 255,
        Math.max(0, shade - 12) / 255,
      );
      mat.color.copy(tmpColor);
      mat.opacity = Math.max(0, 1 - pt * 0.9) * 0.9;
    }

    for (let i = 0; i < innerPuffs.length; i++) {
      const d = innerPuffs[i];
      const m = innerArr.current[i];
      const mat = innerMatArr.current[i];
      if (!m || !mat) continue;
      const pt = Math.max(0, (t - d.delay) / Math.max(0.001, 1 - d.delay));
      if (pt <= 0) {
        m.visible = false;
        continue;
      }
      m.visible = true;
      const s = d.size * (0.6 + pt * 1.4);
      const drift = pt * 3.0;
      m.position.set(d.ox + d.idxCos * drift, d.oy + d.idxSin * drift, d.z);
      m.scale.set(s, s, 1);
      const shade = Math.max(0, Math.min(255, Math.floor(d.shade + pt * 24)));
      tmpColor.setRGB(
        shade / 255,
        Math.max(0, shade - 6) / 255,
        Math.max(0, shade - 12) / 255,
      );
      mat.color.copy(tmpColor);
      mat.opacity = Math.max(0, 1 - pt * 0.72) * 0.9;
    }

    const centralP = Math.min(1, Math.max(0, (t - 0.15) / 0.85));
    for (let i = 0; i < centralPuffs.length; i++) {
      const d = centralPuffs[i];
      const m = centralArr.current[i];
      const mat = centralMatArr.current[i];
      if (!m || !mat) continue;
      if (centralP <= 0) {
        m.visible = false;
        continue;
      }
      m.visible = true;
      const s = d.baseScale + centralP * d.addScale;
      m.scale.set(s, s, 1);
      mat.opacity = Math.max(0, (1 - centralP) * d.maxOp);
    }
  });

  const nukeTex = loadAttackTexture(ATTACK_TEXTURE_URLS.nuke);
  return (
    <group raycast={nullRaycast}>
      <mesh
        ref={nukeMeshRef}
        visible={false}
        raycast={nullRaycast}
        renderOrder={50}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={nukeMatRef}
          map={nukeTex}
          transparent
          depthTest={false}
          toneMapped={false}
        />
      </mesh>
      <group
        ref={explosionGroupRef}
        position={[targetX, targetY, 2]}
        visible={false}
        raycast={nullRaycast}
      >
        {[0, 1].map((i) => (
          <mesh
            key={`f${i}`}
            ref={(el) => {
              flashArr.current[i] = el;
            }}
            position={[0, 0, i === 0 ? 1.6 : 1.5]}
            raycast={nullRaycast}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              ref={(el) => {
                flashMatArr.current[i] = el;
              }}
              map={SOFT_PUFF_TEXTURE}
              color={i === 0 ? "#ffffff" : "#ffffcc"}
              transparent
              opacity={0}
              blending={THREE.AdditiveBlending}
              depthTest={false}
              toneMapped={false}
            />
          </mesh>
        ))}
        {fireLayers.map((L, i) => (
          <mesh
            key={`fire${i}`}
            ref={(el) => {
              fireArr.current[i] = el;
            }}
            position={[0, 0, L.z]}
            raycast={nullRaycast}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              ref={(el) => {
                fireMatArr.current[i] = el;
              }}
              map={SOFT_PUFF_TEXTURE}
              color={L.colorStart}
              transparent
              opacity={0}
              blending={THREE.AdditiveBlending}
              depthTest={false}
              toneMapped={false}
            />
          </mesh>
        ))}
        {debris.map((_, i) => (
          <mesh
            key={`d${i}`}
            ref={(el) => {
              debrisArr.current[i] = el;
            }}
            raycast={nullRaycast}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              ref={(el) => {
                debrisMatArr.current[i] = el;
              }}
              map={SOFT_PUFF_TEXTURE}
              color="#888888"
              transparent
              opacity={0}
              depthTest={false}
              toneMapped={false}
            />
          </mesh>
        ))}
        {innerPuffs.map((_, i) => (
          <mesh
            key={`ip${i}`}
            ref={(el) => {
              innerArr.current[i] = el;
            }}
            raycast={nullRaycast}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              ref={(el) => {
                innerMatArr.current[i] = el;
              }}
              map={SOFT_PUFF_TEXTURE}
              color="#555555"
              transparent
              opacity={0}
              depthTest={false}
              toneMapped={false}
            />
          </mesh>
        ))}
        {centralPuffs.map((d, i) => (
          <mesh
            key={`c${i}`}
            ref={(el) => {
              centralArr.current[i] = el;
            }}
            position={[d.ox, d.oy, d.z]}
            raycast={nullRaycast}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              ref={(el) => {
                centralMatArr.current[i] = el;
              }}
              map={SOFT_PUFF_TEXTURE}
              color={d.color}
              transparent
              opacity={0}
              depthTest={false}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
};

const DeflectedTrajectory = ({ evt }) => {
  const progress = useAnimProgress(1000);
  const curve = useMemo(() => {
    const start = evt.start;
    const end = evt.end;
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy) || 1;
    let perpX = -dy / length;
    let perpY = dx / length;
    if (perpY < 0) {
      perpX = -perpX;
      perpY = -perpY;
    }
    const midPoint = new THREE.Vector3(
      midX + perpX * length * 0.25,
      midY + perpY * length * 0.25,
      10,
    );
    return new THREE.QuadraticBezierCurve3(start, midPoint, end);
  }, [evt]);

  const points = useMemo(() => {
    const pts = curve
      .getPoints(24)
      .slice(0, Math.max(2, Math.floor(progress * 24)));
    return pts.map((p) => [p.x, p.y, p.z]);
  }, [curve, progress]);

  if (points.length < 2) return null;
  return (
    <Line
      points={points}
      color="#00ffcc"
      lineWidth={2}
      transparent
      opacity={0.85}
      raycast={nullRaycast}
    />
  );
};

const AttackEffect = ({ evt }) => {
  if (evt.deflected && evt.itemId !== "missile" && evt.itemId !== "nuke")
    return <DeflectedTrajectory evt={evt} />;
  switch (evt.itemId) {
    case "missile":
      return <MissileAnimation evt={evt} />;
    case "jet":
      return <JetAnimation evt={evt} />;
    case "tank":
      return <TankAnimation evt={evt} />;
    case "sub":
      return <SubAnimation evt={evt} />;
    case "nuke":
      return <NukeAnimation evt={evt} />;
    default:
      return <DeflectedTrajectory evt={evt} />;
  }
};

const Trajectories = () => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const onAttackEvent = (e) => {
      const data = e.detail;
      const { players } = useGameStore.getState().gameState;
      const startPlayerId = data.attacker;
      const endPlayerId = data.deflected ? data.originalTarget : data.target;

      const attackerPlayer = players[startPlayerId];
      const targetPlayer = players[endPlayerId];
      if (!attackerPlayer || !targetPlayer) return;

      const attackerCountry = countriesData.features.find(
        (f) =>
          normalize(f.properties.name || f.properties.ADMIN) ===
          normalize(attackerPlayer.country),
      );
      const targetCountry = countriesData.features.find(
        (f) =>
          normalize(f.properties.name || f.properties.ADMIN) ===
          normalize(targetPlayer.country),
      );
      if (!attackerCountry || !targetCountry) return;

      const start = getCountryCentroid(attackerCountry);
      const end = getCountryCentroid(targetCountry);

      let tankSpawn = null;
      if (data.itemId === "tank" && !data.deflected) {
        tankSpawn = findTankSpawnPoint(targetPlayer.country, end, start);
      }

      let subSpawn = null;
      if (data.itemId === "sub" && !data.deflected) {
        subSpawn = findSubSpawnPoint(end, start);
      }

      const evt = {
        id: Date.now() + Math.random(),
        itemId: data.itemId,
        start: new THREE.Vector3(start[0], start[1], 0),
        end: new THREE.Vector3(end[0], end[1], 0),
        deflected: !!data.deflected,
        firewallBlocked: !!data.firewallBlocked,
        success: data.success,
        tankSpawn,
        subSpawn,
      };
      const ttl = evt.deflected
        ? evt.itemId === "nuke"
          ? 3300
          : evt.itemId === "missile"
            ? 2000
            : 1800
        : evt.itemId === "nuke"
          ? 3300
          : evt.itemId === "sub"
            ? 2200
            : evt.itemId === "tank"
              ? 2200
              : 2200;
      setEvents((prev) => [...prev, evt]);
      setTimeout(
        () => setEvents((prev) => prev.filter((x) => x.id !== evt.id)),
        ttl,
      );
    };
    window.addEventListener("attackEvent", onAttackEvent);
    return () => window.removeEventListener("attackEvent", onAttackEvent);
  }, []);

  return events.map((evt) => <AttackEffect key={evt.id} evt={evt} />);
};

const AttackPopups = () => {
  const [popups, setPopups] = useState([]);

  useEffect(() => {
    const onAttackEvent = (e) => {
      const data = e.detail;
      const owner = Object.values(
        useGameStore.getState().gameState.players,
      ).find((p) => p.socketId === data.target);
      if (!owner) return;

      const targetCountry = countriesData.features.find((f) => {
        return (
          normalize(f.properties.name || f.properties.ADMIN) ===
          normalize(owner.country)
        );
      });

      if (targetCountry) {
        const centroid = getCountryCentroid(targetCountry);
        const popup = {
          id: Date.now() + Math.random(),
          pos: centroid,
          text: data.firewallBlocked
            ? "FIREWALL BLOCKED"
            : data.deflected
              ? "CYBERATTACK"
              : data.success
                ? `-${data.damage} HP`
                : "COUNTERED",
          color: data.firewallBlocked
            ? "#aaaaaa"
            : data.deflected
              ? "#00ffcc"
              : data.success
                ? "#ff4444"
                : "#58a6ff",
        };
        if (data.itemId === "nuke" && data.success && !data.firewallBlocked) {
          popup.text = `NUKE DETONATED -${data.damage} HP`;
          popup.color = "#ff0000";
          popup.scale = 2;
        }
        setPopups((prev) => [...prev, popup]);
        setTimeout(
          () => setPopups((prev) => prev.filter((p) => p.id !== popup.id)),
          2000,
        );
      }
    };
    window.addEventListener("attackEvent", onAttackEvent);
    return () => window.removeEventListener("attackEvent", onAttackEvent);
  }, []);

  return popups.map((p) => (
    <Html key={p.id} position={[p.pos[0], p.pos[1], 5]} center>
      <div
        className="damage-popup"
        style={{
          color: p.color,
          transform: p.scale ? `scale(${p.scale})` : "scale(1)",
          fontWeight: "bold",
        }}
      >
        {p.text}
      </div>
    </Html>
  ));
};

export const WorldMap = () => {
  const canvasRef = useRef();
  const attack = useGameStore((s) => s.attack);
  const lobbyState = useGameStore((s) => s.gameState?.lobbyState);
  const isLobby = lobbyState === "waiting" || lobbyState === "starting";

  const handleDrop = (e) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("itemId");
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
      if (obj.isMesh && obj.userData.ownerId) allMeshes.push(obj);
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

      allMeshes.forEach((mesh) => {
        const ownerId = mesh.userData.ownerId;
        if (ownerId && ownerId !== mySocketId) {
          const box = new THREE.Box3().setFromObject(mesh);
          const center = new THREE.Vector3();
          box.getCenter(center);

          const dist = new THREE.Vector2(center.x, center.y).distanceTo(
            new THREE.Vector2(worldDropPoint.x, worldDropPoint.y),
          );
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
        const now = Date.now();
        if (now - dragOverState.lastDragOver < 40) return;
        dragOverState.lastDragOver = now;
        const { camera, scene } = threeContext;
        if (!camera || !scene || !canvasRef.current) {
          dragOverState.targetId = null;
          return;
        }
        const rect = canvasRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
        const allMeshes = [];
        scene.traverse((obj) => {
          if (obj.isMesh && obj.userData.ownerId) allMeshes.push(obj);
        });
        const intersects = raycaster.intersectObjects(allMeshes, false);
        const mySocketId = useGameStore.getState().socket.id;
        if (intersects.length > 0) {
          const targetId = intersects[0].object.userData.ownerId;
          dragOverState.targetId =
            targetId && targetId !== mySocketId ? targetId : null;
        } else {
          dragOverState.targetId = null;
        }
      }}
      onDragLeave={() => {
        dragOverState.targetId = null;
      }}
      onDrop={(e) => {
        dragOverState.targetId = null;
        handleDrop(e);
      }}
      style={{
        width: "100vw",
        height: "100vh",
        background: "#050a10",
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 0,
        pointerEvents: isLobby ? "none" : "auto",
        opacity: isLobby ? 0.25 : 1,
        transition: "opacity 0.6s ease",
      }}
    >
      <Canvas
        dpr={[1, 1.5]}
        gl={{
          antialias: false,
          powerPreference: "high-performance",
          alpha: false,
          stencil: false,
          depth: true,
        }}
        flat
      >
        <OrthographicCamera
          makeDefault
          position={[0, 0, 100]}
          zoom={3}
          near={1}
          far={1000}
        />
        <ambientLight intensity={1.5} />
        <ContextBridge />
        <MapScene />
        <AttackPopups />
        <Trajectories />
      </Canvas>
    </div>
  );
};
