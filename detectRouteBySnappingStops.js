// assembleRailRoute_NoDeps.js
import { geometry } from '@turf/turf';
import { readFile, writeFile } from 'fs/promises'; // Node.js fs.promises
// No other external dependencies. Pure JS implementation.

/*
const EARTH_RADIUS = 6371000; // meters

// --- Geometry helpers ---

function deg2rad(d) { return d * Math.PI / 180; }

// Haversine distance between two lnglat coords [lon,lat] in meters
function haversineDistance(a, b) {
  const lat1 = deg2rad(a[1]), lon1 = deg2rad(a[0]);
  const lat2 = deg2rad(b[1]), lon2 = deg2rad(b[0]);
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const aH = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(aH), Math.sqrt(1 - aH));
  return EARTH_RADIUS * c;
}

// Axis-aligned bbox from array of coordinates [lon,lat]
function coordsBbox(coords) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  coords.forEach(c => {
    if (c[0] < minX) minX = c[0];
    if (c[1] < minY) minY = c[1];
    if (c[0] > maxX) maxX = c[0];
    if (c[1] > maxY) maxY = c[1];
  });
  return [minX, minY, maxX, maxY];
}
// Helper: test bbox intersection (bbox: [minX,minY,maxX,maxY])
function bboxIntersects(a, b) {
  return !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);
}

// Computes per-pair filtered set of way ids.
// - stopsCoords: array of [lon,lat] ordered stops
// - candidateWays: array of way features (GeoJSON LineString features)
// - pairBufferMeters: buffer around each pair bbox in meters (e.g. 100)
// - returns: Set of way ids (string) that intersect any buffered pair bbox
function filterWaysBySuccessiveStopPairs(stopsCoords, candidateWays, pairBufferMeters = 100, idProp = 'id') {
  if (!stopsCoords || stopsCoords.length < 2) {
    // nothing to do, return all candidate IDs
    return new Set(candidateWays.map(f => String((f.properties && f.properties[idProp]) ?? f.id)));
  }

  // compute per-pair bboxes expanded by pairBufferMeters
  const pairBboxes = [];
  for (let i = 0; i < stopsCoords.length - 1; i++) {
    const a = stopsCoords[i], b = stopsCoords[i + 1];
    const minX = Math.min(a[0], b[0]), minY = Math.min(a[1], b[1]);
    const maxX = Math.max(a[0], b[0]), maxY = Math.max(a[1], b[1]);
    // convert buffer meters to degrees at pair center (approx)
    const centerLat = (a[1] + b[1]) / 2;
    const latDegPerM = 1 / 111320;
    const lonDegPerM = 1 / (111320 * Math.cos(deg2rad(centerLat)));
    const dx = pairBufferMeters * lonDegPerM;
    const dy = pairBufferMeters * latDegPerM;
    pairBboxes.push([minX - dx, minY - dy, maxX + dx, maxY + dy]);
  }

  const keep = new Set();
  // Precompute way bboxes to avoid repeated work
  const wayBboxes = candidateWays.map((way) => {
    const coords = way.geometry.coordinates;
    const wb = coordsBbox(coords);
    return { way, bbox: wb, id: String((way.properties && way.properties[idProp]) ?? way.id) };
  });

  // For each pair bbox, test intersection against each way bbox
  for (let p = 0; p < pairBboxes.length; p++) {
    const pb = pairBboxes[p];
    for (let w = 0; w < wayBboxes.length; w++) {
      if (bboxIntersects(pb, wayBboxes[w].bbox)) {
        keep.add(wayBboxes[w].id);
      }
    }
  }
  return keep; // Set of way ids to keep
}
// Expand bbox by buffer meters (approx convert meters to degrees at bbox center)
function expandBbox(bbox, bufferMeters) {
  const cx = (bbox[0] + bbox[2]) / 2;
  // degrees per meter approx at latitude
  const latDegPerM = 1 / 111320; // ~ degrees per meter
  const lonDegPerM = 1 / (111320 * Math.cos(deg2rad((bbox[1] + bbox[3]) / 2)));
  const dx = bufferMeters * lonDegPerM;
  const dy = bufferMeters * latDegPerM;
  return [bbox[0] - dx, bbox[1] - dy, bbox[2] + dx, bbox[3] + dy];
}

function pointInBbox(pt, bbox) {
  return pt[0] >= bbox[0] && pt[0] <= bbox[2] && pt[1] >= bbox[1] && pt[1] <= bbox[3];
}

// Dot product and helper for projection in 2D (lon/lat treated as Euclidean here)
function dot(ax, ay, bx, by) { return ax * bx + ay * by; }
function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }

// Project point P onto segment AB (all coords [lon,lat]) and clamp to segment.
// Returns {point: [lon,lat], t: fractionAlongSegment}
function projectPointOnSegment(A, B, P) {
  const ABx = B[0] - A[0], ABy = B[1] - A[1];
  const APx = P[0] - A[0], APy = P[1] - A[1];
  const denom = ABx * ABx + ABy * ABy;
  if (denom === 0) return { point: A.slice(), t: 0 };
  let t = (APx * ABx + APy * ABy) / denom;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  const proj = [A[0] + ABx * t, A[1] + ABy * t];
  return { point: proj, t };
}

// Find nearest point on a polyline (LineString) to point P. Returns {point, distanceMeters, segIndex, t}
function nearestPointOnLineString(lineCoords, P) {
  let best = { distance: Infinity, point: null, segIndex: -1, t: 0 };
  for (let i = 0; i < lineCoords.length - 1; i++) {
    const A = lineCoords[i], B = lineCoords[i + 1];
    const proj = projectPointOnSegment(A, B, P);
    const d = haversineDistance(P, proj.point);
    if (d < best.distance) {
      best = { distance: d, point: proj.point.slice(), segIndex: i, t: proj.t };
    }
  }
  return best;
}

// Check if two coordinates equal within small epsilon
function coordsEqual(a, b, eps = 1e-8) {
  if (!a || !b) return false;
  return Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps;
}

/* --- Main assembly function
railWaysGeoJSON: FeatureCollection(LineString). Each feature must have .id or properties.id
stopsGeoJSON: FeatureCollection(Point). Each feature should have .id and optionally properties.mileage
options:
  snapTolerance (meters)
  bboxBuffer (meters) default 20000 (20 km)
  idProp (string) property name to read way id if feature.id is missing
* //
function assembleRelationNoDeps(railWaysGeoJSONfeatures, routeStops, options = {}) {
  const snapTolerance = options.snapTolerance ?? 20;
  const bboxBuffer = options.bboxBuffer ?? 20000;
  const idProp = options.idProp ?? 'id';

  // 1) compute stops bbox
  const stopCoords = routeStops.map(f => f.geometry.coordinates);
  const stopsBbox = coordsBbox(stopCoords);
  const expanded = expandBbox(stopsBbox, bboxBuffer);
  console.log(`bufferedBbox ${expanded.join()}`);

  // 2) pre-filter rail ways by bbox (fast)
  const candidateWays = railWaysGeoJSONfeatures.filter(f => {
    const wayCoords = f.geometry.coordinates;
    const wb = coordsBbox(wayCoords);
    // simple bbox intersection test between wb and expanded
    return !(wb[2] < expanded[0] || wb[0] > expanded[2] || wb[3] < expanded[1] || wb[1] > expanded[3]);
  });
  console.log(`candidateWays ${candidateWays.length}`);

  const keepSet = filterWaysBySuccessiveStopPairs(stopsCoords, candidateWays, 100, idProp);

  // helper to get way id
  function getWayId(feat) {
    return (feat.properties && feat.properties[idProp]) ?? feat.id;
  }

  // small map from wayId to feature for endpoints lookup
  const wayIdToFeat = new Map();
  candidateWays.forEach(f => wayIdToFeat.set(String(getWayId(f)), f));

  // helper: get endpoints [E1,E2] of way by id (first and last coordinate)
  function getWayEndpoints(wayId) {
    const f = wayIdToFeat.get(String(wayId));
    if (!f) return null;
    const coords = f.geometry.coordinates;
    return [coords[0].slice(), coords[coords.length - 1].slice()];
  }

  // helper: check if two ways share exact endpoint coordinate
  function waysShareEndpoint(aId, bId) {
    const Aeps = getWayEndpoints(aId);
    const Beps = getWayEndpoints(bId);
    if (!Aeps || !Beps) return false;
    const [A1, A2] = Aeps;
    const [B1, B2] = Beps;
    return coordsEqual(A1, B1) || coordsEqual(A1, B2) || coordsEqual(A2, B1) || coordsEqual(A2, B2);
  }

  // 3) For each stop in order: snap or not; record members
  const members = [];
  let currentAttachment = null; // [lon,lat]
  let currentAttachmentIsOnWay = false;

  function findLastWayMember() {
    for (let i = members.length - 1; i >= 0; i--) {
      if (members[i].type === 'way') return members[i];
    }
    return null;
  }

  for (let idx = 0; idx < routeStops.length; idx++) {
    const stopFeat = routeStops[idx];
    const stopId = stopFeat.id ?? String(idx);
    const stopMileage = stopFeat.properties ? stopFeat.properties.mileage ?? null : null;
    const stopCoord = stopFeat.geometry.coordinates.slice();

    // find nearest segment among candidateWays
    let bestSnap = null;
    let bestDist = Infinity;
    let bestWayId = null;

    for (let w = 0; w < candidateWays.length; w++) {
      const wayFeat = candidateWays[w];
      const wayCoords = wayFeat.geometry.coordinates;
      const np = nearestPointOnLineString(wayCoords, stopCoord);
      if (np.distance < bestDist) {
        bestDist = np.distance;
        bestSnap = np;
        bestWayId = String(getWayId(wayFeat));
      }
    }

    const snapped = (bestSnap && bestDist <= snapTolerance) ? {
      wayId: bestWayId,
      snappedCoord: bestSnap.point.slice(),
      distance: bestDist,
      segIndex: bestSnap.segIndex
    } : null;

    if (snapped) {
      // snapped to a way
      const endpoints = getWayEndpoints(snapped.wayId) || [snapped.snappedCoord.slice(), snapped.snappedCoord.slice()];
      const wayMember = {
        type: 'way',
        wayId: snapped.wayId,
        snappedCoord: snapped.snappedCoord.slice(),
        wayEndpoints: endpoints,
        stopId,
        stopMileage,
        origStopIndex: idx
      };

      if (currentAttachment) {
        if (currentAttachmentIsOnWay) {
          const lastWay = findLastWayMember();
          if (lastWay && lastWay.wayId !== wayMember.wayId) {
            if (!waysShareEndpoint(lastWay.wayId, wayMember.wayId)) {
              // insert stop-less bridge between nearest endpoints of the two ways
              const [A1, A2] = lastWay.wayEndpoints;
              const [B1, B2] = wayMember.wayEndpoints;
              const pairs = [
                { a: A1, b: B1 },
                { a: A1, b: B2 },
                { a: A2, b: B1 },
                { a: A2, b: B2 }
              ];
              let bestPair = null, bestPairD = Infinity;
              pairs.forEach(p => {
                const d = haversineDistance(p.a, p.b);
                if (d < bestPairD) { bestPairD = d; bestPair = p; }
              });
              if (bestPair && !coordsEqual(bestPair.a, bestPair.b)) {
                members.push({
                  type: 'bridge',
                  from: bestPair.a.slice(),
                  to: bestPair.b.slice(),
                  note: `stop-less bridge between ways ${lastWay.wayId} and ${wayMember.wayId}`
                });
              }
            } // else they share endpoint -> connected
          }
        } else {
          // previous attachment is stop or bridge endpoint -> connect that to nearest endpoint of this way
          const [E1, E2] = endpoints;
          const d1 = haversineDistance(E1, currentAttachment);
          const d2 = haversineDistance(E2, currentAttachment);
          const chosenTo = (d1 <= d2 ? E1 : E2).slice();
          const chosenFrom = currentAttachment.slice();
          if (!coordsEqual(chosenFrom, chosenTo)) {
            members.push({
              type: 'bridge',
              from: chosenFrom,
              to: chosenTo,
              note: `bridge from prev attachment to snapped way at stop ${idx}`
            });
          }
        }
      }

      members.push(wayMember);
      currentAttachment = snapped.snappedCoord.slice();
      currentAttachmentIsOnWay = true;
    } else {
      // unsnapped stop: create bridge from previous attachment (preferring endpoint)
      if (currentAttachment) {
        let from = currentAttachment.slice();
        if (currentAttachmentIsOnWay) {
          const lastWay = findLastWayMember();
          if (lastWay && lastWay.wayEndpoints) {
            const [PE1, PE2] = lastWay.wayEndpoints;
            const d1 = haversineDistance(PE1, stopCoord);
            const d2 = haversineDistance(PE2, stopCoord);
            from = (d1 <= d2 ? PE1 : PE2).slice();
          }
        }
        if (!coordsEqual(from, stopCoord)) {
          members.push({
            type: 'bridge',
            from,
            to: stopCoord.slice(),
            note: `bridge to unsnapped stop ${idx}`
          });
        }
      }

      members.push({
        type: 'stop',
        coord: stopCoord.slice(),
        stopId,
        stopMileage,
        origStopIndex: idx
      });

      currentAttachment = stopCoord.slice();
      currentAttachmentIsOnWay = false;
    }
  }

  return {
    type: 'route_relation_like',
    properties: {
      snapTolerance,
      bboxBuffer,
      generatedAt: new Date().toISOString()
    },
    members
  };
}
*/

//NEWVERSION
// assembleRailRoute_Corridor.js
// No external dependencies. Corridor-based snapping per successive stop pairs.

// --- Basic geo helpers ---
const EARTH_RADIUS = 6371000; // meters
function deg2rad(d) { return d * Math.PI / 180; }
function rad2deg(r) { return r * 180 / Math.PI; }
// Haversine distance between two [lon,lat] in meters
function haversineDistance(a, b) {
  const lat1 = deg2rad(a[1]), lon1 = deg2rad(a[0]);
  const lat2 = deg2rad(b[1]), lon2 = deg2rad(b[0]);
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const aH = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(aH), Math.sqrt(1 - aH));
  return EARTH_RADIUS * c;
}
// bbox from coords array
function coordsBbox(coords) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  coords.forEach(c => {
    if (c[0] < minX) minX = c[0];
    if (c[1] < minY) minY = c[1];
    if (c[0] > maxX) maxX = c[0];
    if (c[1] > maxY) maxY = c[1];
  });
  return [minX, minY, maxX, maxY];
}
// bbox intersection
function bboxIntersects(a, b) {
  return !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);
}
function coordsEqual(a, b, eps = 1e-9) {
  if (!a || !b) return false;
  return Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps;
}
// Approximate meters->degrees at latitude (for small distances)
function metersToDegreesAtLat(lat, meters) {
  const latDeg = meters / 111320; // approx
  const lonDeg = meters / (111320 * Math.cos(deg2rad(lat)));
  return [lonDeg, latDeg];
}
// Project point P onto segment AB (Euclidean on lon/lat). Returns {point:[lon,lat], t}
function projectPointOnSegment(A, B, P) {
  const ABx = B[0] - A[0], ABy = B[1] - A[1];
  const APx = P[0] - A[0], APy = P[1] - A[1];
  const denom = ABx * ABx + ABy * ABy;
  if (denom === 0) return { point: A.slice(), t: 0 };
  let t = (APx * ABx + APy * ABy) / denom;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  return { point: [A[0] + ABx * t, A[1] + ABy * t], t };
}
// Nearest point on a LineString (array of coords) to point P
function nearestPointOnLineString(lineCoords, P) {
  let best = { distance: Infinity, point: null, segIndex: -1, t: 0 };
  for (let i = 0; i < lineCoords.length - 1; i++) {
    const A = lineCoords[i], B = lineCoords[i + 1];
    const proj = projectPointOnSegment(A, B, P);
    const d = haversineDistance(P, proj.point);
    if (d < best.distance) {
      best = { distance: d, point: proj.point.slice(), segIndex: i, t: proj.t };
    }
  }
  return best;
}
// Segment-segment intersection in 2D (lon/lat) — returns true if segments AB and CD intersect
function segmentsIntersect(A, B, C, D) {
  function orient(p, q, r) {
    return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  }
  function onSegment(p, q, r) {
    return Math.min(p[0], r[0]) <= q[0] + 1e-12 && q[0] <= Math.max(p[0], r[0]) + 1e-12 &&
           Math.min(p[1], r[1]) <= q[1] + 1e-12 && q[1] <= Math.max(p[1], r[1]) + 1e-12;
  }
  const o1 = orient(A, B, C);
  const o2 = orient(A, B, D);
  const o3 = orient(C, D, A);
  const o4 = orient(C, D, B);
  if (o1 === 0 && onSegment(A, C, B)) return true;
  if (o2 === 0 && onSegment(A, D, B)) return true;
  if (o3 === 0 && onSegment(C, A, D)) return true;
  if (o4 === 0 && onSegment(C, B, D)) return true;
  return (o1 > 0 && o2 < 0 || o1 < 0 && o2 > 0) && (o3 > 0 && o4 < 0 || o3 < 0 && o4 > 0);
}
// Build corridor rectangle polygon (4 coords) around segment AB expanded laterally by bufferMeters
function buildCorridorPolygon(A, B, bufferMeters) {
  // midpoint latitude for degree conversion
  const midLat = (A[1] + B[1]) / 2;
  const [lonDegPerM, latDegPerM] = metersToDegreesAtLat(midLat, 1);
  // vector AB in degrees
  const vx = B[0] - A[0], vy = B[1] - A[1];
  // length in degrees (approx)
  const len = Math.sqrt(vx * vx + vy * vy) || 1e-12;
  // perpendicular (unit) in degrees
  const px = -vy / len, py = vx / len;
  // lateral offset in degrees
  const offsetX = px * bufferMeters * lonDegPerM;
  const offsetY = py * bufferMeters * latDegPerM;
  // four corners: A+offset, B+offset, B-offset, A-offset
  const c1 = [A[0] + offsetX, A[1] + offsetY];
  const c2 = [B[0] + offsetX, B[1] + offsetY];
  const c3 = [B[0] - offsetX, B[1] - offsetY];
  const c4 = [A[0] - offsetX, A[1] - offsetY];
  return [c1, c2, c3, c4];
}
// Test if a LineString (array of coords) intersects polygon (corridor). Fast reject by bbox then check segments.
function lineIntersectsPolygon(lineCoords, polygon) {
  // Point-in-polygon (ray casting), polygon is array of coords [[x,y],...], closed or not
  function pointInPolygon(pt, polygon) {
    const x = pt[0], y = pt[1];
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi + 1e-16) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }
  const polyBbox = coordsBbox(polygon);
  const lineBbox = coordsBbox(lineCoords);
  if (!bboxIntersects(polyBbox, lineBbox)) return false;
  // If any line vertex inside polygon -> intersect
  for (let i = 0; i < lineCoords.length; i++) {
    if (pointInPolygon(lineCoords[i], polygon)) return true;
  }
  // Check segment intersection between each line segment and each polygon edge
  for (let i = 0; i < lineCoords.length - 1; i++) {
    const A = lineCoords[i], B = lineCoords[i + 1];
    for (let j = 0; j < polygon.length; j++) {
      const C = polygon[j], D = polygon[(j + 1) % polygon.length];
      if (segmentsIntersect(A, B, C, D)) return true;
    }
  }
  return false;
}

/* choose point from way, closest to segment AB:
   check every vertex V of way: project V onto AB and measure distance */
function bestWayPointToABsegment(local, Acoord, Bcoord){
  let corridorBest = { dist: Infinity, wayFeat: null, wayClosestPoint: null };
  for (let f of local) {
    let bestLocal = Infinity;
    for (let vi = 0; vi < f.geometry.coordinates.length; vi++) {
      const V = f.geometry.coordinates[vi];
      const proj = projectPointOnSegment(Acoord, Bcoord, V);
      const d = haversineDistance(V, proj.point);
      if (d < bestLocal) bestLocal = d;
    }
    // also project A and B onto each way segment and measure distances (catch near-segment cases)
    for (let si = 0; si < f.geometry.coordinates.length - 1; si++) {
      const S0 = f.geometry.coordinates[si], S1 = f.geometry.coordinates[si + 1];
      const pA = projectPointOnSegment(S0, S1, Acoord);
      const pB = projectPointOnSegment(S0, S1, Bcoord);
      const dA = haversineDistance(Acoord, pA.point);
      const dB = haversineDistance(Bcoord, pB.point);
      if (dA < bestLocal) bestLocal = dA;
      if (dB < bestLocal) bestLocal = dB;
    }
    if (bestLocal < corridorBest.dist) corridorBest = { dist: bestLocal, wayFeat: f };
  }
  return corridorBest;
}
// choose nearest point among two end points
function bestEndPoint([E1, E2], A){
  const dA1 = haversineDistance(E1, A);
  const dA2 = haversineDistance(E2, A);
  return dA1 <= dA2 ? E1.slice() : E2.slice();
}  
function closestEndpointTo([E1, E2], stopCoord) {
  const d1 = haversineDistance(E1, stopCoord);
  const d2 = haversineDistance(E2, stopCoord);
  if (d1 <= d2) return { point: E1.slice(), distance: d1, index: 0 };
  return { point: E2.slice(), distance: d2, index: 1 };
}

function idOfWay(way){
  return String(way.properties.osm);
}
function getWayEndpoints(wayIdToFeat, wayId) {
  const f = wayIdToFeat.get(wayId);
  if (!f) return null;
  const coords = f.geometry.coordinates;
  return [coords[0].slice(), coords[coords.length - 1].slice()];
}
function waysShareEndpoint(wayIdToFeat, aId, bId) {
  const Aeps = getWayEndpoints(wayIdToFeat, aId);
  const Beps = getWayEndpoints(wayIdToFeat, bId);
  if (!Aeps || !Beps) return false;
  const [A1, A2] = Aeps, [B1, B2] = Beps;
  return coordsEqual(A1, B1) || coordsEqual(A1, B2) || coordsEqual(A2, B1) || coordsEqual(A2, B2);
}
// get candidate ways by bbox (coarse selection)
function waysByBbox(wayFeatures, bbox){
  const okWays = wayFeatures.filter(f => bboxIntersects(coordsBbox(f.geometry.coordinates), bbox));
  console.log(`candidateWays by Bbox ${okWays.length}`);
  return okWays;
}
// get candidate ways by local A-to-B-corridor intersection
function waysByCorridor(wayFeatures, corridor) {
  // precompute poly bbox
  const polyBbox = coordsBbox(corridor);
  const okWays = [];
  for (let f of wayFeatures) {
    const wb = coordsBbox(f.geometry.coordinates);
    if (!bboxIntersects(wb, polyBbox)) continue;
    if (lineIntersectsPolygon(f.geometry.coordinates, corridor))
      okWays.push(f);
  }
  return okWays;
}
function rankLocalWays(wayIdToFeat, wayFeatures, Acoord, Bcoord) {
  return wayFeatures.map(f => {
    const wayId = idOfWay(f);
    const endpoints = getWayEndpoints(wayIdToFeat, wayId);
    if (!endpoints) return null;
    const from = closestEndpointTo(endpoints, Acoord);
    const to = closestEndpointTo(endpoints, Bcoord);
    f.properties = {from, to, score1: from.distance, score2: from.distance + to.distance,  ...f.properties };
    return f;
  }).filter(Boolean)
    .sort((a, b) => (a.score1 - b.score1) || (a.score2 - b.score2));
}

/* --- Pipeline: corridor-based sequential assembler ---
 Inputs:
 - wayFeatures: FeatureCollection(LineString), each feature must have .id or properties.id
 - stopFeatures: FeatureCollection(Point), ordered by route (stop.props.pk in km available)
 Options:
 - snapTolerance (meters) default 20
 - coarseBuffer (meters) global prefilter default 20000
 - corridorBuffer (meters) lateral corridor width; default = snapTolerance (you can make it slightly larger)
 Output:
 - route relation-like object with ordered members array
*/
function assembleRelationFromStopsAndWays_Corridor(wayFeatures, stopFeatures, options = {}) {
  if(!options.snapTolerance || !options.coarseBuffer || !options.corridorBuffer)
    throw Error(`bad options ${JSON.stringify(options)}`);
  if (stopFeatures.length < 2)
    throw Error(`impossible to work with ${stopFeatures.length}`);
  console.log(`options ${JSON.stringify(options)}`);

  const snapTolerance = options.snapTolerance ?? 20;
  const corridorBuffer = options.corridorBuffer ?? snapTolerance;

  // 1) global coarse bbox filter
  const stopCoords = stopFeatures.map(f => f.geometry.coordinates);
  const stopsBbox = coordsBbox(stopCoords);
  // expand bbox by coarseBuffer (approx)
  const midLat = (stopsBbox[1] + stopsBbox[3]) / 2;
  const [lonDegPerM, latDegPerM] = metersToDegreesAtLat(midLat, 1);
  const dx = options.coarseBuffer * lonDegPerM, dy = options.coarseBuffer * latDegPerM;
  const expanded = [stopsBbox[0] - dx, stopsBbox[1] - dy, stopsBbox[2] + dx, stopsBbox[3] + dy];
  console.log(`bufferedBbox ${expanded.join()}`);

  const candidateWaysGlobal = waysByBbox(wayFeatures, expanded);
  // helper: get way id and endpoints from the filtered global list
  const wayIdToFeat = new Map();
  candidateWaysGlobal.forEach(f => wayIdToFeat.set(idOfWay(f), f) );
  console.log(`wayIdToFeat ${wayIdToFeat.size}`);

  // 2) sequential processing by successive pairs using corridor rectangles
  const members = [];
  let currentAttachment = null; // { type: 'way'|'stop', coord, id: 'wayId'|'stopId', wayEndpoints }
  function pushWayMember(wayId, snappedCoord, endpoints, stopId = null, stopMileage = null) {
    const w = { type: 'way', id:wayId, snappedCoord: snappedCoord.slice(), wayEndpoints: [endpoints[0].slice(), endpoints[1].slice()], stopId, stopMileage };
    members.push(w);
    currentAttachment = { type: 'way', coord: snappedCoord.slice(), id:wayId, wayEndpoints: [endpoints[0].slice(), endpoints[1].slice()] };
    return console.log(`adding way-member: ${wayId}`);
  }
  function pushStopMember(coord, stopId, stopMileage, note) {
    currentAttachment = { type: 'stop', coord: coord.slice(), id: stopId, km: stopMileage };
    members.push({...currentAttachment});
    return console.log(`adding stop-member: ${stopId} ${note}`);
  }
  
  function pushBridge(from, to, note = null) {
    members.push({ type: 'bridge', from: from.slice(), to: to.slice(), note });
    return console.log(`adding bridge-member: ${note}`);
  }

  // iterate pairs
  for (let i = 0; i < stopFeatures.length - 1; i++) {
    const Afeat = stopFeatures[i], Bfeat = stopFeatures[i + 1];
    const Acoord = Afeat.geometry.coordinates.slice(), Bcoord = Bfeat.geometry.coordinates.slice();
    const corridor = buildCorridorPolygon(Acoord, Bcoord, corridorBuffer);
    const corridorWays = waysByCorridor(candidateWaysGlobal, corridor);
    const wayIdToFeat = new Map();
    corridorWays.forEach(f => wayIdToFeat.set(idOfWay(f), f) );
    console.log(`--------------  ${Afeat.properties.id} to ${Bfeat.properties.id} ways${i}: ${wayIdToFeat.size}`);

    // first stop of first pair = given stop
    if(i===0) {
      pushStopMember(Acoord, Afeat.properties.id, Afeat.properties.pk, 'origin');
    }
  //  const rankedWays = rankLocalWays(wayIdToFeat, corridorWays, Acoord, Bcoord, getWayEndpoints);
    // try to snap B to local ways
    let best = null, bestD = Infinity, bestWayId = null;
    for (let f of corridorWays) {
      const np = nearestPointOnLineString(f.geometry.coordinates, Bcoord);
      if (np.distance < bestD) { bestD = np.distance; best = np; bestWayId = idOfWay(f); }
    }
    if (best && bestD <= snapTolerance) {
      // snapped B to bestWayId at best.point
      const endpointsB = getWayEndpoints(wayIdToFeat, bestWayId) || [best.point.slice(), best.point.slice()];
      // determine what to emit between currentAttachment and this snapped way
      if (currentAttachment && currentAttachment.type === 'way') {
        const prevWayId = currentAttachment.wayId;
        if (prevWayId === bestWayId) {
          // same way: do nothing (both on same OSM way). Optionally you could merge segments.
        } else {
          // different snapped ways: if they don't share endpoint insert stop-less bridge between nearest endpoints
          if (!waysShareEndpoint(wayIdToFeat, prevWayId, bestWayId)) {
            const [A1, A2] = currentAttachment.wayEndpoints;
            const [B1, B2] = endpointsB;
            const pairs = [{a:A1,b:B1},{a:A1,b:B2},{a:A2,b:B1},{a:A2,b:B2}];
            let bestPair = null, bestPD = Infinity;
            pairs.forEach(p => { const d = haversineDistance(p.a, p.b); if (d < bestPD) { bestPD = d; bestPair = p; }});
            if (bestPair && !coordsEqual(bestPair.a, bestPair.b)) pushBridge(bestPair.a, bestPair.b, `stop-less bridge between ways ${prevWayId} and ${bestWayId}`);
          }
        }
      } else if (currentAttachment && currentAttachment.type === 'stop') {
        // from stop to nearest endpoint of this way
        const chosenTo = bestEndPoint(endpointsB, currentAttachment.coord);
        if (!coordsEqual(chosenTo, currentAttachment.coord)) pushBridge(currentAttachment.coord, chosenTo, `bridge from stop to snapped way at stop index ${i+1}`);
      } else if (!currentAttachment) {
        // fallback: use Acoord
        const chosenTo = bestEndPoint(endpointsB, Acoord);
        if (!coordsEqual(chosenTo, Acoord)) pushBridge(Acoord, chosenTo, `bridge fallback to snapped way at stop index ${i+1}`);
      }
      // push snapped way member
      pushWayMember(bestWayId, best.point, endpointsB, Bfeat.id ?? null, Bfeat.properties ? Bfeat.properties.pk ?? null : null, i+1);
    } else {
      // B unsnapped. If any local way intersects corridor, insert corridor-handling: A -> E1, way, E2 -> B
      if (corridorWays.length > 0) {
        // choose best local way by min distance between way-LineString and segment AB (~nearest point/way to AB)
        const  corridorBest = bestWayPointToABsegment(corridorWays, Acoord, Bcoord);
        if (corridorBest.wayFeat && corridorBest.dist <= corridorBuffer) {
          const chosenWay = corridorBest.wayFeat;
          const wayId = idOfWay(chosenWay);
          const endpoints = getWayEndpoints(wayIdToFeat, wayId); // || [chosenWay.geometry.coordinates[0].slice(), chosenWay.geometry.coordinates[chosenWay.geometry.coordinates.length - 1].slice()];
          // choose endpoint closest to A and to B respectively
          const fromEndpoint = bestEndPoint(endpoints, Acoord);
          // bridge from previous attachment / A to fromEndpoint
          const bridgeFrom = currentAttachment ?
            (currentAttachment.type === 'way' ?
              bestEndPoint(currentAttachment.wayEndpoints, Acoord)
              : currentAttachment.coord.slice() )
            : Acoord.slice();;
          if (!coordsEqual(bridgeFrom, fromEndpoint)) pushBridge(bridgeFrom, fromEndpoint, `corridor bridge A->E1 for way ${wayId}`);

          // push the way member (snappedCoord set to fromEndpoint for provenance)
          pushWayMember(wayId, fromEndpoint.slice(), endpoints, null, null, null);

          const toEndpoint = bestEndPoint(endpoints, Bcoord);
          // bridge from other endpoint to B
          if (!coordsEqual(fromEndpoint, toEndpoint)) {
            pushBridge(toEndpoint, Bcoord.slice(), `corridor bridge E2->B for way ${wayId}`);
          }

          // then push stop B
          pushStopMember(Bcoord.slice(), Bfeat.id ?? null, Bfeat.properties ? Bfeat.properties.pk ?? null : null, `next B-stop ${i+1}`);
          continue; // proceed to next pair
        }
      }
      // No corridor way accepted -> normal unsnapped handling: bridge from prev attachment -> B, then push stop B
      if (currentAttachment) {
        const fromW = currentAttachment.type === 'way' ?
          bestEndPoint(currentAttachment.wayEndpoints, Bcoord)
          : currentAttachment.coord.slice();
          if (!coordsEqual(fromW, Bcoord)) pushBridge(fromW, Bcoord.slice(), `bridge to unsnapped stop ${Bfeat.id ?? 'unknown'}`);
      }
      pushStopMember(Bcoord.slice(), Bfeat.id ?? null, Bfeat.properties ? Bfeat.properties.pk ?? null : null, `last stop`);
    }
  }
  return { type: 'route_relation_like', properties: { snapTolerance, corridorBuffer, generatedAt: new Date().toISOString() }, members };
}

/////////////////// DIJKSTRA SHORTEST PATH VERSION
// assembleRailRoute_DijkstraChain.js
// Uses existing helpers:
// - haversineDistance(a, b)
// - coordsEqual(a, b, eps)
// - coordsBbox(coords)
// - bboxIntersects(a, b)
// - deg2rad(d)
// - projectPointOnSegment(A, B, P)
// - nearestPointOnLineString(lineCoords, P)

function coordKey(c) {
  return c[0].toFixed(9) + "," + c[1].toFixed(9);
}

function lineLength(coords) {
  let d = 0;
  for (let i = 0; i < coords.length - 1; i++) d += haversineDistance(coords[i], coords[i + 1]);
  return d;
}


function mergeWaysIntoChains(localWays) {
  const wayEndpoints = way => { const c = way.geometry.coordinates; return [c[0].slice(), c[c.length - 1].slice()] };
  const idToWay = new Map();
  const endpointMap = new Map();
  for (const w of localWays) {
    const id = idOfWay(w);
    idToWay.set(id, w);
    const [e1, e2] = wayEndpoints(w);
    const k1 = coordKey(e1);
    const k2 = coordKey(e2);
    if (!endpointMap.has(k1)) endpointMap.set(k1, []);
    if (!endpointMap.has(k2)) endpointMap.set(k2, []);
    endpointMap.get(k1).push(id);
    endpointMap.get(k2).push(id);
  }
  const used = new Set();
  const chains = [];
  for (const w of localWays) {
    const startId = idOfWay(w);
    if (used.has(startId)) continue;
    let coords = w.geometry.coordinates.map(c => c.slice());
    const ids = [startId];
    used.add(startId);
    let extended = true;
    while (extended) {
      extended = false;
      const first = coords[0];
      const last = coords[coords.length - 1];
      const nextIds = endpointMap.get(coordKey(last)) || [];
      for (const nid of nextIds) {
        if (used.has(nid)) continue;
        const nw = idToWay.get(nid);
        if (!nw) continue;
        const nc = nw.geometry.coordinates;
        if (coordsEqual(last, nc[0])) {
          coords = coords.concat(nc.slice(1).map(c => c.slice()));
          ids.push(nid);
          used.add(nid);
          extended = true;
          break;
        }
        if (coordsEqual(last, nc[nc.length - 1])) {
          const rev = nc.slice().reverse();
          coords = coords.concat(rev.slice(1).map(c => c.slice()));
          ids.push(nid);
          used.add(nid);
          extended = true;
          break;
        }
      }
      if (extended) continue;
      const prevIds = endpointMap.get(coordKey(first)) || [];
      for (const pid of prevIds) {
        if (used.has(pid)) continue;
        const pw = idToWay.get(pid);
        if (!pw) continue;
        const pc = pw.geometry.coordinates;
        if (coordsEqual(first, pc[pc.length - 1])) {
          coords = pc.slice(0, pc.length - 1).concat(coords);
          ids.unshift(pid);
          used.add(pid);
          extended = true;
          break;
        }
        if (coordsEqual(first, pc[0])) {
          const rev = pc.slice().reverse();
          coords = rev.slice(0, rev.length - 1).map(c => c.slice()).concat(coords);
          ids.unshift(pid);
          used.add(pid);
          extended = true;
          break;
        }
      }
    }
    chains.push({ wayIds: ids, coords });
  }
  return chains;
}

function buildGraph(localWays, Acoord, Bcoord) {
  const nodes = new Map();
  const edges = new Map();
  const nodeKey = (prefix, c) => `${prefix}:${coordKey(c)}`;
  function addNode(key, coord, meta = {}) {
    if (!nodes.has(key)) nodes.set(key, { key, coord: coord.slice(), ...meta });
  }
  function addEdge(u, v, weight, meta = {}) {
    if (!edges.has(u)) edges.set(u, []);
    edges.get(u).push({ to: v, weight, ...meta });
  }
  const aKey = nodeKey("A", Acoord);
  const bKey = nodeKey("B", Bcoord);
  addNode(aKey, Acoord, { type: "stop", role: "from" });
  addNode(bKey, Bcoord, { type: "stop", role: "to" });
  const endpointKeys = [];
  for (const w of localWays) {
    console.log(JSON.stringify(w.properties));
    const wayId = idOfWay(w);
    const c = w.geometry.coordinates;
    const e1 = c[0];
    const e2 = c[c.length - 1];
    const n1 = nodeKey(`W${wayId}`, e1);
    const n2 = nodeKey(`W${wayId}`, e2);
    const len = lineLength(c);
    addNode(n1, e1, { type: "endpoint", wayId, end: 0 });
    addNode(n2, e2, { type: "endpoint", wayId, end: 1 });
    endpointKeys.push(n1, n2);
    addEdge(n1, n2, len, { kind: "way", wayId });
    addEdge(n2, n1, len, { kind: "way", wayId });
  }
  for (const ek of endpointKeys) {
    const c = nodes.get(ek).coord;
    addEdge(aKey, ek, haversineDistance(Acoord, c), { kind: "attach", role: "from" });
    addEdge(ek, aKey, haversineDistance(Acoord, c), { kind: "attach", role: "from" });
    addEdge(bKey, ek, haversineDistance(Bcoord, c), { kind: "attach", role: "to" });
    addEdge(ek, bKey, haversineDistance(Bcoord, c), { kind: "attach", role: "to" });
  }
  for (let i = 0; i < endpointKeys.length; i++) {
    for (let j = i + 1; j < endpointKeys.length; j++) {
      const u = endpointKeys[i];
      const v = endpointKeys[j];
      const d = haversineDistance(nodes.get(u).coord, nodes.get(v).coord);
      addEdge(u, v, d, { kind: "bridge" });
      addEdge(v, u, d, { kind: "bridge" });
    }
  }
  return { nodes, edges, aKey, bKey };
}

function dijkstra(nodes, edges, startKey, endKey) {
  const dist = new Map();
  const prev = new Map();
  const seen = new Set();
  for (const k of nodes.keys()) dist.set(k, Infinity);
  dist.set(startKey, 0);
  while (true) {
    let u = null;
    let best = Infinity;
    for (const [k, d] of dist.entries()) {
      if (!seen.has(k) && d < best) { best = d; u = k; }
    }
    if (u === null) break;
    if (u === endKey) break;
    seen.add(u);
    for (const e of (edges.get(u) || [])) {
      const alt = dist.get(u) + e.weight;
      if (alt < dist.get(e.to)) {
        dist.set(e.to, alt);
        prev.set(e.to, { from: u, edge: e });
      }
    }
  }
  if (startKey !== endKey && !prev.has(endKey)) return null;
  const path = [];
  let cur = endKey;
  while (cur !== startKey) {
    const p = prev.get(cur);
    if (!p) break;
    path.push({ from: p.from, to: cur, edge: p.edge });
    cur = p.from;
  }
  path.reverse();
  return path;
}


// store path in globals
  const members = [];
  let currentAttachment = null; // { type: 'way'|'stop', coord, id: 'wayId'|'stopId', wayEndpoints }
function pushWayMember(wayId, snappedCoord, endpoints, stopId = null, stopMileage = null) {
    const w = { type: 'way', id:wayId, snappedCoord: snappedCoord.slice(), wayEndpoints: [endpoints[0].slice(), endpoints[1].slice()], stopId, stopMileage };
    members.push(w);
    currentAttachment = { type: 'way', coord: snappedCoord.slice(), id:wayId, wayEndpoints: [endpoints[0].slice(), endpoints[1].slice()] };
    return console.log(`adding way-member: ${wayId}`);
}
function pushStopMember(coord, stopId, stopMileage, note) {
    currentAttachment = { type: 'stop', coord: coord.slice(), id: stopId, km: stopMileage };
    members.push({...currentAttachment});
    return console.log(`adding stop-member: ${stopId} ${note}`);
}
function pushBridge(from, to, note = null, lengthInM = 0) {
    members.push({ type: 'bridge', from: from.slice(), to: to.slice(), note, lengthInM });
    return console.log(`adding bridge-member: ${note} ${lengthInM}`);
}

function assembleRelationFromStopsAndWays_DijkstraChain(wayFeatures, stopFeatures, options = {}) {
  if(!options.snapTolerance || !options.coarseBuffer || !options.corridorBuffer)
    throw Error(`bad options ${JSON.stringify(options)}`);
  if (stopFeatures.length < 2)
    throw Error(`impossible to work with ${stopFeatures.length}`);
  console.log(`options ${JSON.stringify(options)}`);

  const snapTolerance = options.snapTolerance ?? 20;
  const bboxBuffer = options.coarseBuffer; //options.bboxBuffer ?? 20000;
  const corridorBuffer = options.corridorBuffer;
  const pairBuffer = corridorBuffer;

  // 1) global coarse bbox filter
  const stopCoords = stopFeatures.map(f => f.geometry.coordinates);
  const stopsBbox = coordsBbox(stopCoords);
  // expand bbox by coarseBuffer (approx)
  const midLat = (stopsBbox[1] + stopsBbox[3]) / 2;
  const [lonDegPerM, latDegPerM] = metersToDegreesAtLat(midLat, 1);
  const dx = options.coarseBuffer * lonDegPerM, dy = options.coarseBuffer * latDegPerM;
  const expanded = [stopsBbox[0] - dx, stopsBbox[1] - dy, stopsBbox[2] + dx, stopsBbox[3] + dy];
  console.log(`bufferedBbox ${expanded.join()}`);

  const candidateWaysGlobal = waysByBbox(wayFeatures, expanded);
  /*/ helper: get way id and endpoints from the filtered global list
  const wayIdToFeat = new Map();
  candidateWaysGlobal.forEach(f => wayIdToFeat.set(idOfWay(f), f) );
  console.log(`wayIdToFeat ${wayIdToFeat.size}`);
*/

  const chains = candidateWaysGlobal; //mergeWaysIntoChains(candidateWaysGlobal);

  // 2) sequential processing by successive pairs using corridor rectangles
  for (let i = 0; i < stopFeatures.length - 1; i++) {
    const Afeat = stopFeatures[i];
    const Bfeat = stopFeatures[i + 1];
    const Acoord = Afeat.geometry.coordinates;
    const Bcoord = Bfeat.geometry.coordinates;
    const ABlength = haversineDistance(Acoord, Bcoord);
    // always push first stop of first pair = given origin
    if(!i) pushStopMember(Acoord, Afeat.properties.id, Afeat.properties.pk, 'origin');

    const corridor = buildCorridorPolygon(Acoord, Bcoord, corridorBuffer);
    const corridorWays = waysByCorridor(candidateWaysGlobal, corridor);
    const wayIdToFeat = new Map();
    corridorWays.forEach(f => wayIdToFeat.set(idOfWay(f), f) );
    console.log(`--------------  ${Afeat.properties.id} to ${Bfeat.properties.id} ways${i}: ${wayIdToFeat.size}`);

    if(!corridorWays.length) {
      pushBridge(Acoord, Bcoord, "no local ways", ABlength);
      continue;
    }
    // there are local ways:
    // 1: try to snap B to one of them
    let bestSnap = null;
    let bestDist = Infinity;
    corridorWays.forEach(w => {
      const np = nearestPointOnLineString(w.geometry.coordinates, Bcoord);
      if(np.distance > snapTolerance) return;
      if (np.distance < bestDist) {
        bestDist = np.distance;
        w.properties.snapGeom = np.point.slice();
        w.properties.snapDist = bestDist;
        bestSnap = {properties: w.properties, geometry: w.geometry};
      }
    });
    const snapped = bestSnap;
    // replace Bcoord by bestEndOf(bestSnap.w, Acoord).geometry.coordinates;
    if(bestSnap) {
      console.log(`B bestSnap found at ${JSON.stringify(bestSnap.properties)}`);
    }






    const graph = buildGraph(corridorWays, Acoord, Bcoord);
    const path = dijkstra(graph.nodes, graph.edges, graph.aKey, graph.bKey);
    if (!path) {
      console.log(`can this case happen? = ???`);
      pushBridge(Acoord, Bcoord, "fallback bridge", ABlength);
      continue;
    }
    for (const step of path) {
      const e = step.edge;
      if (e.kind === "way") {
        //pushWayMember(e.wayId, snappedCoord, endpoints, stopId = null, stopMileage = null)
        console.log(`push way member ${JSON.stringify(e)}`);
        members.push({
          type: "way",
          wayId: e.wayId,
          from: graph.nodes.get(step.from).coord.slice(),
          to: graph.nodes.get(step.to).coord.slice(),
          length: e.weight
        });
      } else if (e.kind === "bridge") {
        pushBridge(graph.nodes.get(step.from).coord.slice(), graph.nodes.get(step.to).coord.slice(), "bridge", e.weight);
        members.push({
          type: "bridge",
          from: graph.nodes.get(step.from).coord.slice(),
          to: graph.nodes.get(step.to).coord.slice(),
          length: e.weight
        });
      }
    }
    members.push({
      type: "stop-pair",
      fromStopId: Afeat.id ?? null,
      toStopId: Bfeat.id ?? null,
      fromPk: Afeat.properties ? Afeat.properties.pk ?? null : null,
      toPk: Bfeat.properties ? Bfeat.properties.pk ?? null : null,
      chainIds: corridorWays.map(c => c.wayIds)
    });
  }
  return {
    type: "route_relation_like",
    properties: {
      bboxBuffer,
      pairBuffer,
      generatedAt: new Date().toISOString()
    },
    members
  };
}


async function clippedStops(inputFile, stationGeoJSONFeatures) {
    try {
        const data = await readFile(inputFile, 'utf8');
        console.log('Input data type:', typeof data);
        console.log('Input preview:', data.slice(0, 160));
        //const stops = JSON.parse(data).features;  // Parse input GeoJSON
        // options: in meters
        const options = {
          snapTolerance: 20, coarseBuffer: 500, corridorBuffer: 300
        };
        let wayFeatures = JSON.parse(data).features;
        wayFeatures.concat(addedWays);
        const relation = assembleRelationFromStopsAndWays_DijkstraChain(wayFeatures, stationGeoJSONFeatures, options);

        return console.log(relation.properties.members);  // Ordered list of way/bridge objects
    } catch (error) {
        console.error('Error in clippedStops:', error);
        throw error;
    }
}

const addedWays = [
{"type":"Feature","properties":{"osm":"1218715507","railway":"cycleway","surface":"asphalt"},"geometry":{"type":"LineString","coordinates":[[7.3365413,47.8681199],[7.3364728,47.8681474],[7.3361949,47.8682592],[7.3357234,47.8684511],[7.3356993,47.8684609],[7.3353708,47.8686964],[7.3349213,47.8690594],[7.3346714,47.8693421],[7.3344686,47.8696772],[7.3341098,47.870365],[7.3339244,47.8707238],[7.3337334,47.8710421],[7.3336353,47.871168],[7.3335154,47.871301],[7.3332482,47.871515],[7.3330385,47.8716727],[7.3328812,47.8717703],[7.3326585,47.8718945],[7.3318381,47.872318],[7.3299636,47.8732405],[7.3286634,47.8739227],[7.3283662,47.8740253],[7.3276988,47.8742038],[7.3275473,47.8742379],[7.3262461,47.8745584],[7.3242857,47.8750254],[7.3238155,47.8751056],[7.3236038,47.8751334],[7.3233785,47.875155],[7.3231693,47.8751721],[7.3230043,47.8751789],[7.3228628,47.8751829],[7.3227274,47.8751843],[7.3224811,47.8751788]]}}];
const stationGeoJSONFeatures = [
    {"properties":{"num":"121000","pk":4.08,"use":"N","id":"Colmar-Sud","uic":"87121_","nom":"Colmar","cc":"68066","line":{"num":"121000","g":"N","pk0":4.08,"pkf":34.6,"len":30.52,"use":"FD","end":"1992","lid":"Ligne_de_Colmar-Sud_à_Bollwiller","sa":"Ligne_Colmar-Sud_-_Bollwiller","af":[1213]}},"type":"Feature","geometry":{"type":"Point","coordinates":[7.36419,48.05528]}},
    {"properties":{"num":"121000","pk":9.26,"use":"N","id":"Sainte-Croix-en-Plaine","uic":"87182121","cc":"68295"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.38564,48.01212]}},
    {"properties":{"num":"121000","pk":12.56,"use":"N","id":"Niederhergheim","uic":"87182162","cc":"68235"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.39371,47.98502]}},
    {"properties":{"num":"121000","pk":14.64,"use":"N","id":"Oberhergheim","uic":"87182170","cc":"68242"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.38899,47.9667]}},
    {"properties":{"num":"121000","pk":15.61,"use":"N","id":"Biltzheim","cc":"68037"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.38528,47.96]}},
    {"properties":{"num":"121000","pk":17.24,"use":"N","id":"Oberentzen","uic":"87182188","cc":"68241"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.3758,47.9456]}},
    {"properties":{"num":"121000","pk":19.68,"use":"N","id":"Munwiller","cc":"68228"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.35552,47.92943]}},
    {"properties":{"num":"121000","pk":21.53,"use":"N","id":"Meyenheim","uic":"87182212","cc":"68205"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.3521,47.91343]}},
    {"properties":{"num":"121000","pk":23.21,"use":"N","id":"Réguisheim","uic":"87182220","cc":"68266"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.3507,47.89857]}},
    {"properties":{"num":"121000","pk":27,"use":"X","id":"Xn.Ensisheim"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.33436,47.86992]}},
    {"properties":{"num":"121000","pk":27.5,"use":"N","id":"Ensisheim","uic":"87182808","cc":"68082","info":"rebroussement + Ligne_d'Ensisheim_à_Habsheim 20,8km fermée 1918"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.34385,47.8667]}},
    {"properties":{"num":"121000","pk":28,"use":"X","id":"Xw.Ensisheim"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.33436,47.86992]}},
    {"properties":{"num":"121000","pk":29,"use":"X","id":"X.pontVieilleThur"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.32248,47.87518]}},
    {"properties":{"num":"121000","pk":30.94,"use":"N","id":"Ungersheim","cc":"68343"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.30267,47.875]}},
    {"properties":{"num":"121000","pk":32,"use":"X","id":"Xw.Ungersheim"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.29752,47.87332]}},
    {"properties":{"num":"121000","pk":33.34,"use":"N","id":"Feldkirch","cc":"68088","stop":"haf"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.2751,47.86447]}},
    {"properties":{"num":"121000","pk":34,"use":"X","id":"Xn.Feldkirch"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.26867,47.86288]}},
    {"properties":{"num":"121000","pk":34.6,"use":"J","id":"Bollwiller","uic":"87182709","info":"terminus"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.26751,47.85686]}}    
];
const fileOSM = "reallyfullOSM.geojson";
const railGeoJSON = { /* your OSM ways reallyfullOSM.geojson */ };

clippedStops(fileOSM, stationGeoJSONFeatures);