// assembleRailRoute_Corridor.js
import { geometry, propertiesContainsFilter } from '@turf/turf';
import { readFile, writeFile } from 'fs/promises'; // Node.js fs.promises
// No external dependencies. Corridor-based snapping per successive stop pairs
// then shortest path between ways and bridges

// --- Basic geo helpers ---
// hexagon for France
const hexagone = [
	[51.1, 2.53],  //Bray-Dunes+N
	[49.0, 8.2],   //Lauterbourg+E
	[43.5, 7.6],   //Menton+SE
	[42.2, 2.96],  //Cerbère+S
	[43.33, -1.84], //Irun-Hendaye+SW
	[48.45, -5.1], //Ile d'Ouessant
	[51.1, 2.53]
];
// version for Overpass QL
const hexastring = `(poly="51.1 2.53 49.0 8.2 43.5 7.6 42.2 2.96 43.33 -1.84 51.1 2.53")`;
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
// a LineString (array of coords) has a snap to point P
function hasSnapToPoint(lineCoords, P, snapTolerance) {
  let hasSnap = false;
  for (let i = 0; i < lineCoords.length - 1; i++) {
    const A = lineCoords[i], B = lineCoords[i + 1];
    const proj = projectPointOnSegment(A, B, P);
    const d = haversineDistance(P, proj.point);
    if (d < snapTolerance) {
      hasSnap = hasSnap || true; break;
    }
  }
  return hasSnap;
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

// choose nearest point among two end points
function bothEndPoint([E1, E2], A){
    const dA1 = haversineDistance(E1, A);
    const dA2 = haversineDistance(E2, A);
    return dA1 <= dA2 ? [E1.slice(), E2.slice()] : [E2.slice(), E1.slice()];
}
function bestEndPoint([E1, E2], A){
    return bothEndPoint([E1, E2], A)[0];
}
function closestEndpointTo([E1, E2], stopCoord) {
  const d1 = haversineDistance(E1, stopCoord);
  const d2 = haversineDistance(E2, stopCoord);
  if (d1 <= d2) return { point: E1.slice(), distance: d1, index: 0 };
  return { point: E2.slice(), distance: d2, index: 1 };
}
function idOfWay(w){
  const id = w.properties.group?.length > 1? w.properties.group.at(-1): w.properties.osm;
  return String(id);
}

function endpointsOf(way) {
    if(!way) return console.log(`shouldn't happen`) || null;
    const coords = way.geometry.coordinates;
    return [coords[0].slice(), coords[coords.length - 1].slice()];  
}
function getWayEndpoints(wayFeat, wayId) {
  return endpointsOf(wayFeat.get(wayId)); //
}
function waysShareEndpoint(wayFeat, aId, bId) {
  const Aeps = endpointsOf(wayFeat.get(aId)); //getWayEndpoints(wayFeat, aId);
  const Beps = endpointsOf(wayFeat.get(bId)); //getWayEndpoints(wayFeat, bId);
  if (!Aeps || !Beps) return false;
  const [A1, A2] = Aeps, [B1, B2] = Beps;
  return coordsEqual(A1, B1) || coordsEqual(A1, B2) || coordsEqual(A2, B1) || coordsEqual(A2, B2);
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
/*function assembleRelationFromStopsAndWays_Corridor(wayFeatures, stopFeatures, options = {}) {
    // choose point from way, closest to segment AB:
    // check every vertex V of way: project V onto AB and measure distance
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
    // helper: get way id and endpoints from the filtered global list
    const wayIdToFeat = new Map();
    corridorWays.forEach(f => wayIdToFeat.set(idOfWay(f), f) );
    console.log(`--------------  ${Afeat.properties.id} to ${Bfeat.properties.id} ways${i}: ${wayIdToFeat.size}`);

    // first stop of first pair = given stop
    if(i===0) {
      pushStopMember(Acoord, Afeat.properties.id, Afeat.properties.pk, 'origin');
    }
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
*/


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


function lineLength(coords) {
  let d = 0;
  if(!coords) return d;
  for (let i = 0; i < coords.length - 1; i++) d += haversineDistance(coords[i], coords[i + 1]);
  return d;
}


function buildGraph(localWays, Acoord, Bcoord) {
    const coordKey = (c) => c[0].toFixed(9) + "," + c[1].toFixed(9);
    const nodeKey = (prefix, c) => `${prefix}:${coordKey(c)}`;
  function addNode(key, coord, meta = {}) {
    if (!nodes.has(key)) nodes.set(key, { key, coord: coord.slice(), ...meta });
  }
  function addEdge(u, v, weight, meta = {}) {
    if (!edges.has(u)) edges.set(u, []);
    edges.get(u).push({ to: v, weight, ...meta });
  }
  const nodes = new Map();
  const edges = new Map();
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
  let hookpointA = null, hookpointB = null;

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

function cloneCoords(coords) { return coords.map(p => [p[0], p[1]]); }

function getBestSnapForA(localWays, i, Aend, snapTolerance){ //add i ??? TODO
    const Acoord = Aend.geometry.coordinates;
    const hasSnap = localWays.filter(f => f.properties.snapRank === (i-1));
    hasSnap.forEach((f,i) => console.log(`hasSnapA_${i||""} ${JSON.stringify(f.properties)}`));
    if(hasSnap.length > 1) throw Error(`--- SHOULD NOT HAPPEN --- multiple snaps: ${JSON.stringify(Acoord)}`);
    return hasSnap[0] || snapPointToWays(Aend, localWays, -1, snapTolerance) || null;
}
function getBestSnapForB(localWays, i, Bend, snapTolerance) {
    return snapPointToWays(Bend, localWays, i, snapTolerance);
}
// Dijkstra process: build a graph of connected ways from localWays
// compute the shortest path
// reconnect as route from Aend to Bend
function dijkstraRoute(localWays, Aend, Bend, members) {
  const Acoord = Aend.geometry.coordinates;
  const Bcoord = Bend.geometry.coordinates;
  const graph = buildGraph(localWays, Acoord, Bcoord);
  const path = dijkstra(graph.nodes, graph.edges, graph.aKey, graph.bKey);
  if (!path) {
    console.log(`.................. can this case happen? = ???`);
    console.log(`dijkstra fallback bridge ${haversineDistance(Acoord, Bcoord)}`)
    //members push Bridge(Acoord, Bcoord);
    return members;
  }
  for (const step of path) {
      console.log(`step in dijkstra path ${step.edge.kind}:${step.edge.wayId||"_"}`);
    const e = step.edge;
    if (e.kind === "way") {
      console.log(`dijkstra push way member ${JSON.stringify(e)}`);
      members.push({
        type: "way",
        wayId: e.wayId,
        from: graph.nodes.get(step.from).coord.slice(),
        to: graph.nodes.get(step.to).coord.slice(),
        length: e.weight
      });
    } else if (e.kind === "bridge") {
      console.log(`dijkstra push bridge ${JSON.stringify(e)}`);
      // pushBridge(graph.nodes.get(step.from).coord.slice(), graph.nodes.get(step.to).coord.slice(), "bridge", e.weight);
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
    fromStopId: Aend.id ?? null,
    toStopId: Bend.id ?? null,
    fromPk: Aend.properties ? Aend.properties.pk ?? null : null,
    toPk: Bend.properties ? Bend.properties.pk ?? null : null,
    chainIds: localWays.map(c => c.wayIds)
  });
  console.log(`  >>>>  dijkstra route: ${members.length}`);
  return members;
}
//
function bestEndPointFromWay(bestA, Bcoord){
  return bothEndPoint(bestA.properties.ends, Bcoord)[0];
}

// return a way-like element {osm, name, }
function bridgeClosestWayEndToPoint(Bsnap, Bend, foundWays) {
  const props = {...Bsnap.properties};
  props.osm += "bridge";
  //props.group.push(props.osm); // TODO: check unique addition
  const geometry = {"type":"Linestring", "coordinates":[Bsnap.properties.closestEnd, Bend.geometry.coordinates]};
  return {properties: props, geometry};
}
function bridgePointToClosestWayStart(Asnap, Aend, foundWays) {
  const isSnap = Asnap.properties.closestEnd;
  const props = {...Asnap.properties};
  props.osm = "bridge" + props.osm;
  //props.group.push(props.osm);
  const geometry = {"type":"Linestring", "coordinates":[Aend.geometry.coordinates, Asnap.properties.closestEnd]};
  return {properties: props, geometry};
}
function wayOfFrom(ways, osmid) {
  return osmid? ways.find(w => w.properties.osm === osmid) || console.error(` ?? no ${osmid}: check alternate`) || null : null;
}

// get candidate ways by bbox (coarse selection)
function waysByBbox(wayFeatures, bbox){
  const bboxWays = wayFeatures.filter(f => bboxIntersects(coordsBbox(f.geometry.coordinates), bbox));
  bboxWays.forEach(f => void f.properties.osm === "1218715507" ? console.log("found 1218715507") : 0);
  console.log(`candidateWays by Bbox ${bboxWays.length}`);
  return bboxWays;
}
// look for the coarse ways that intersect the A_to_B "corridor" polygon
function restrictToCorridor(Aend, Bend, coarseWays, i, corridorBuffer) {
  // Build rectangle polygon (4 coords) around segment AB expanded laterally by bufferMeters
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
  // Test if a LineString (array of coords) intersects polygon. Fast reject by bbox then check segments.
  function lineIntersectsPolygon(lineCoords, polygon) {
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
  // get candidate ways by local polygon intersection
  function waysByCorridor(wayFeatures, polygon, rank) {
    // precompute poly bbox
    const polyBbox = coordsBbox(polygon);
    const corridorWays = [];
    for (let f of wayFeatures) {
      const wb = coordsBbox(f.geometry.coordinates);
      if (!bboxIntersects(wb, polyBbox)) continue;
      if (lineIntersectsPolygon(f.geometry.coordinates, polygon)) {
        f.properties.corridorank = rank;
        corridorWays.push(f);
      }
    }
    return corridorWays;
  }
  const Acoord = Aend.geometry.coordinates;
  const Bcoord = Bend.geometry.coordinates;
  const ABlength = haversineDistance(Acoord, Bcoord); // TODO: to use later for comparing with pk km.
  const polygon = buildCorridorPolygon(Acoord, Bcoord, corridorBuffer);
  let polygonWays = waysByCorridor(coarseWays, polygon, i);
  return polygonWays;
}

// get closest Point of a vgiStop to a given way
function snapPointOnLineString(vgiStop, way, snapTolerance) {
  let osm = way?.properties?.osm;
  if(!osm) return null;
  const group = way?.properties?.group;
  if(osm.includes("snake")) {
    console.log(`osm ${osm}`);
    osm = way.properties.group?.at(-1);
    console.log(`osm ${osm}`);
  }
  const lineCoords = way.geometry.coordinates;
  const vgiCoords = vgiStop.geometry.coordinates;
  const id = vgiStop.properties.id;
  const props = {
    id, osm,
    ends: [lineCoords[0].slice(), lineCoords.at(-1).slice()],
    distance: Infinity
  };
  let coords = null;
  for (let i = 0; i < lineCoords.length - 1; i++) {
    const proj = projectPointOnSegment(lineCoords[i], lineCoords[i + 1], vgiCoords);
    const d = haversineDistance(vgiCoords, proj.point);
    if (d < props.distance) {
      props.distance = d;
      coords = proj.point.slice();
    }
  }
  props.distance = +props.distance.toFixed(2);
  if(props.distance <= snapTolerance) props.snapok = id;
  else props.closestEnd = bestEndPoint(props.ends, vgiCoords);
  return { properties:props, geometry: {type:"Point", coordinates:coords} };
}
// get all closest Points of a vgiStop to a set of ways: ascending order of distance
function hookPointsToWays(vgiStop, ways, snapTolerance) {
  // returns an array [ {point, distance}, {point geometry}]
  const hookPoints = ways.map(w => snapPointOnLineString(vgiStop, w, snapTolerance));
  return hookPoints.sort((wa,wb) => wa.properties.distance - wb.properties.distance );
}
// get best hook from all hookpoints of vgiStop to set of ways
function bestHookAmong(hookPoints) {
  let besthook = hookPoints[0];
  return {properties: {...besthook.properties}, geometry: {...besthook.geometry}};
}
// get all snap only hookpoints (or null)
function allSnapAmong(hookPoints) {
  const snaplist = hookPoints.filter(w => w.properties.snapok);
  return snaplist.length ? snaplist : null;
}
// turn a vgi stop into a hook-point
function hookPointFromStop(vgiStop, way) {
  const hpoint = Object.assign(Object.create(vgiStop), vgiStop);
  hpoint.properties.osm = way.properties.osm;
  hpoint.properties.ends = [vgiStop.geometry.coordinates, vgiStop.geometry.coordinates,];
  hpoint.properties.snapok = vgiStop.properties.id;
  hpoint.properties.distance = 0;
  return hpoint;
}
// try to snap a point to a way from a set of ways, else return closest
function snapPointToWays(vgiStop, localWays, index, snapTolerance) {
  const getSnapSet = (ways, vgiCoor, snapTolerance) =>
    new Set(ways.filter(w => hasSnapToPoint(w.geometry.coordinates, vgiCoor, snapTolerance)).map(w => w.properties.osm));
  const vgiCoor = vgiStop.geometry.coordinates; // type Point expected
  const vgiName = vgiStop.properties.id; // string expected
  let bestSnap = null, bestE1 = null, bestE2 = null, bestD = Infinity;
  localWays.forEach(w => {
      const np = nearestPointOnLineString(w.geometry.coordinates, vgiCoor);
      if (np.distance < bestD) {
        bestD = +np.distance;
        bestE1 = w.geometry.coordinates[0].slice();
        bestE2 = w.geometry.coordinates.at(-1).slice();
        bestSnap = {properties: {...w.properties}, geometry: {...w.geometry}};
      }
  });
  //  const snapSet = new Set(localWays.filter(w => hasSnapToPoint(w.geometry.coordinates, vgiCoor, snapTolerance)).map(w => w.properties.osm));
  const snapSet = getSnapSet(localWays, vgiCoor, snapTolerance);
  if(snapSet.size) {
      const snapList = [...snapSet];
      if(snapList.length > 1) console.log(`\t\t\tSNAPS: ${snapList.join()}`);
      bestSnap.properties.snapSet = snapList;
  }
  bestSnap.properties.snapDist = +(bestD.toFixed(2));
  bestSnap.properties.snapRank = index;
  if(bestD <= snapTolerance) { // only "B": why ? TODO:check
      // properties way: osm, use, ...
      bestSnap.properties.ends = [bestE1, bestE2];
      bestSnap.properties.closestEnd = null;
      return bestSnap;
  } // else
  else bestSnap.properties.closestEnd = bestEndPoint([bestE1, bestE2], vgiCoor);

  const hookPoints = hookPointsToWays(vgiStop, localWays, snapTolerance);
  const bestHook = bestHookAmong(hookPoints);
  console.log(`++++++++++++ bestHook for ${vgiName} ${JSON.stringify(bestHook.properties)}`);
  console.log(`++++++++++++ bestSnap ${JSON.stringify(bestSnap.properties)}`);

  return bestSnap;
}
/* / to exclude already visited ways
function notInWays(way, ways) {
  if(!ways || ways.length === 0) return true;
  if(!way) return false;
  return ways.every(w => notInSnake(w, way));
}
// SNAKE: snakeWay management and monitoring
function notInSnake(w, snakeWay) {
  if(!snakeWay) return true;
  const osm0 = w.properties.osm;
  return snakeWay.properties.osm !== osm0 && (!snakeWay.properties.group || !snakeWay.properties.group.includes(osm0));
}
*/
function notInSnakeStrict(w, snakeWay) {
  return !snakeWay || snakeWay.properties.osm !== w.properties.osm;
}
function snakeLengthInKm(way) {
  return +(lineLength(way.geometry?.coordinates) / 1000).toFixed(2);
}
// augment, or create and set SNAKE
function augmentSnakeWayWith(snakeWay, Cway) {
  const updateGroup = (group = [], Cgroup = []) => [...new Set([...group, ...Cgroup])];
  const updateProperties = (way, Cway) => ({
    osm: "snake"+(Cway.properties?.osm || ""),
    group: updateGroup(way.properties?.group, (Cway.properties?.group || [])),
    km: way.properties.km += snakeLengthInKm(Cway)
  });
  if(!Cway) return snakeWay;
  if(!snakeWay) {
    snakeWay = JSON.parse(JSON.stringify(Cway));
    snakeWay.properties.osm = "snake"+Cway.properties.osm,
    snakeWay.properties.group = [...new Set([...Cway.properties.group])];
    snakeWay.properties.km = snakeLengthInKm(Cway)
    console.log(`\t snake0: ${JSON.stringify(snakeWay.properties)}, total length= ${snakeWay.properties.km} km`);
    return snakeWay;
  }
/*  snakeWay.properties.osm = "snake"+Cway.properties.osm;
  snakeWay.properties.group = [...new Set([...snakeWay.properties?.group, ...[Cway.properties.osm]])];
  snakeWay.properties.km += snakeLengthInKm(Cway);*/

  snakeWay.properties = updateProperties(snakeWay, Cway);
  console.log(`\t||snake||: ${typeof snakeWay.geometry}`);
  console.log(`\t||Cway||: ${typeof Cway}`);
  console.log(`\t||Cway||: ${typeof Cway.geometry}`);
  if(Cway.geometry)
    snakeWay.geometry.coordinates = [...snakeWay.geometry?.coordinates, ...Cway.geometry?.coordinates];
  else return snakeWay;
  if(snakeWay?.properties)
    console.log(`\t snake: ${JSON.stringify(snakeWay.properties)}, total length= ${snakeWay.properties?.km} km`);
//  console.log(`\tsnake+${Cway.properties.osm} ${JSON.stringify(snakeWay.properties,["osm","name","group"])}`);
  console.log(`\t||snake||: ${typeof snakeWay.properties}`);
  return snakeWay;
}
function printSnake(way, stop) {
  const gap = (wayEndcoo, stopcoo) => (haversineDistance(wayEndcoo, stopcoo) /1000).toFixed(3);
  if(!way) return console.log(`snake hasn't started yet`);
  return; // console.log(`. snake prop ${JSON.stringify(way.properties)}`);
  console.log(`. snake geom ${way.geometry.type} ${JSON.stringify(way.geometry.coordinates[0])}...${JSON.stringify(way.geometry.coordinates.at(-1))}`);
  if(!stop) return;
  console.log(`. distance Aend-snake ${gap(stop.geometry.coordinates, way.geometry.coordinates.at(-1))}`);
}

// proposing a way-sequence
function alterSequenceFor(w0, corridorWays, corridorIndex, wayLast) {
  if(!w0) console.log("no w0");
  console.log(`w0 ${w0.properties?.osm}`);
  if(!corridorWays) return null;
  const okWays = corridorWays.filter(w => w.properties.osm !== w0.properties.osm).map(w => JSON.parse(JSON.stringify(w)));
  const w0Way = JSON.parse(JSON.stringify(w0)); // initialize sequence with w0
  console.log(`. in: alterSequence for: ${okWays.map(w => JSON.stringify(w.properties,["osm","group"])).join()}`);
  let Cway = shrinkWaySequenceFrom(w0, okWays, wayLast?.properties?.osm);
  return (Cway) ? augmentSnakeWayWith(w0Way, Cway) : console.log(`null alter Cway at: ${corridorIndex}`) || null;
}

function alterWaySequence(wayInit, corridorWays, wayLast) {
  if(!corridorWays) return null;
  console.log(`. in: alterWaySequence: ${corridorWays.map(w => JSON.stringify(w.properties,["osm","group"])).join()}`);
  let Cway = shrinkWaySequenceFrom(wayInit, corridorWays, wayLast.properties.osm);
  return (Cway) ? augmentSnakeWayWith(snakeWay, Cway) : console.log(`null alter Cway at: ${corridorIndex}`) || null;
}
// building a possible way-sequence
function shrinkWaySequenceFrom(initialWay, ways, osmLast) {
  const EPS = 1e-6;
  function addInSequence(currWay, ways, used) {
    const sameCoord = (a, b) => Math.abs(a[0] - b[0]) <= EPS && Math.abs(a[1] - b[1]) <= EPS;
    const endsOf = coo => ({ start: coo[0], end: coo[coo.length - 1] });
    const lastCoord = currWay.geometry.coordinates.at(-1);
    for(const w of ways) {
      const osm = w.properties.osm;
      if (used.has(osm)) continue;
      const { start, end } = endsOf(w.geometry.coordinates);
      if (sameCoord(start, lastCoord)) {
        return doMergeWays(currWay, w, used); // direct
      }
      if (sameCoord(end, lastCoord)) {
        return doMergeWays(currWay, w, used, true); // reverse
      }
    }
    return currWay;
  }
  function doMergeWays(currWay, sequelWay, usedWays, reverseTag) {
    if(!currWay.properties.group) currWay.properties.group = [currWay.properties.osm];
    const osmId = sequelWay.properties.osm;
    currWay.properties.group.push(osmId);
    currWay.properties.osm = osmId;
    currWay.properties.km += snakeLengthInKm(sequelWay);
    usedWays.add(osmId);
    console.log(`concat ${reverseTag?"reverse ":""}${currWay.properties.group.join()}`);
    // update coordinates / reverse / removing shared end duplicated + TODO: adapt if MultiLineString
    let nextCoords = cloneCoords(sequelWay.geometry.coordinates);
    if (reverseTag) nextCoords.reverse();
    currWay.geometry.coordinates.push(...nextCoords.slice(1));
    return currWay;
  }
  if(!ways || ways.length < 1) return ways;
  const osm0 = initialWay.properties.osm;
  const used = new Set([osm0]);
  console.log(`checking origin: ${JSON.stringify(initialWay.properties,["osm","group","name"])}`);  // , ["osm"]
  let coords = endpointsOf(initialWay);
  let currWay = JSON.parse(JSON.stringify(initialWay));
  console.log(`currWay ${currWay.geometry.type} ${JSON.stringify(currWay.properties)}`);
  console.log(`ways ${ways.length} ${JSON.stringify(ways.map(w => w.properties))}`);
  currWay.properties.km = snakeLengthInKm(initialWay);
  let currWayLength = currWay.properties.group?.length || 0;
  while (true) {
    currWay = addInSequence(currWay, ways, used);
    // early exit if osmLast is reached
    if(osmLast && currWay.properties?.group?.some(osmwid => osmwid === osmLast)) {
      return currWay;
    }
    // exit when no more change
    if((currWay.properties.group?.length || 0) === currWayLength) break;
    else currWayLength = currWay.properties.group.length;
  }
  ways = ways.filter(w => !used.has(w.properties.osm))
    .filter(w => w!== currWay.properties.osm);
  ways.push(currWay);  // TODO replace same osmId ???
  return currWay;
}
// CORRIDOR PROCESSING
// maintain a corridor structure: ends, rank, forward/backward direction, set of ways
const corridorList = [];
function corridorData(Aend, Bend, index, corridorWays) {
  const corridor = {Aend, Bend, index};
  if(index===0) {
    corridorList.push(corridor);
    return corridor;
  }
  // check reverse direction
  const corrDirect = corridorList.find(c => c.Aend.properties.id === Bend.properties.id && c.Bend.properties.id === Aend.properties.id);
  if(corrDirect) {
    console.log(`reverse direction for corridor ${index} = reverse ${corrDirect.index}`);
    corridor.reverse = corrDirect.index;
    // reverse ways, Ahook, Bhook
  } else {
  // to be added: corridor ways, Ahook,
  }
  return corridor;
}
/* 1. Phase 1 — connect what’s actually connectable
. Detect which of them share endpoints (i.e. OSM nodes) or intersect.
. Group those into connected components.
. Within each component, order ways so they form maximal chains.
returns: “corridor candidate chains”: some lying along A→B and some irrelevant side branches.
*/
function indexSparseWays(corridorWays, tolerance = 1e-7) {
  const getNode = (coord) => {
    // For robustness, you could snap coordinates with tolerance, but start exact.
    const key = coord.join(',');
    let node = nodeIndex.get(key);
    if (!node) {
      node = { id: nextNodeId++, coord, incidentWays: [] };
      nodeIndex.set(key, node);
    }
    return node;
  };
  const nodeIndex = new Map(); // 'lon,lat' -> node object
  let nextNodeId = 0;
  for (const way of corridorWays) {
    const coords = way.geometry.coordinates;
    const wayId = way.properties.id;
    for (const coord of [coords[0], coords[coords.length - 1]]) {
      const node = getNode(coord);
      node.incidentWays.push(wayId);
    }
  }
  return {
    nodes: Array.from(nodeIndex.values()),
    nodeIndex
  };
}
function buildWayComponents(corridorWays) {
  const { nodes } = indexSparseWays(corridorWays);
  const wayMap = new Map(corridorWays.map(w => [w.properties.id, w]));
  const visitedWays = new Set();
  const components = [];
  for (const [wayId] of wayMap) {
    if (visitedWays.has(wayId)) continue;
    const queue = [wayId];
    const componentWayIds = [];
    while (queue.length) {
      const currentWayId = queue.pop();
      if (visitedWays.has(currentWayId)) continue;
      visitedWays.add(currentWayId);
      componentWayIds.push(currentWayId);
      // Find nodes incident to this way and other ways attached to these nodes
      for (const node of nodes) {
        if (!node.incidentWays.includes(currentWayId)) continue;
        for (const otherWayId of node.incidentWays) {
          if (!visitedWays.has(otherWayId)) queue.push(otherWayId);
        }
      }
    }
    components.push(componentWayIds);
  }
  return components; // each component is a list of way IDs that are topologically connected
}

// loop over sequence of pairs of stops along one VGI route
function loopoverCorridors(stopFeatures, coarseWays, corridorBuffer, snapTolerance) {

  // inner function of the loop over the corridors
  function addOneCorridor(Aend, Ahook, Bend, corridorIndex, corridorBuffer, snapTolerance) {
    console.log(`===== ===== ===== corridor ${corridorIndex} from ${Aend.properties.id} to ${Bend.properties.id}`);

    // 1. if Bend already hooks to the snake: return to continue the loop.
    let Bhook = snapPointOnLineString(Bend, snakeWay, snapTolerance);
    if(Bhook?.properties.snapok) {
      console.log(`just continue at ${Bhook.properties.snapok}`);
      return Bhook;
    }
    let wayLast = Bhook? wayOfFrom(coarseWays, Bhook.properties.osm) : null;

    // 2. restrict coarseWays to A-B-corridor, excluding snake in corridorWays
    let okWays = restrictToCorridor(Aend, Bend, coarseWays, corridorIndex, corridorBuffer);
    let corridorWays = okWays.filter(w => notInSnakeStrict(w, snakeWay));

    if(corridorWays?.length) {
      const phase1snake = buildSnakePhase1(Aend, Bend, corridorWays, snapTolerance);
      if(phase1snake) console.log(`---- phase1snake ---- ---- ---- ---- ---- ---- ----\n${JSON.stringify(phase1snake.properties)}\n ----\n`);
/*
corridorWays.forEach(w => alterSequenceFor(w, corridorWays, corridorIndex, wayLast));
*/
    }


    if(!corridorWays || !corridorWays.length) {
      // bridge direct Ahook to Bhook or Bend
    }

    // 3. check if Aend snaps to multiple ways (at least one differing from snake
    const Ahookpoints = hookPointsToWays(Aend, corridorWays, snapTolerance);
    console.log(`Ahookpoints= ${Ahookpoints.length} ${Ahookpoints.map(w => JSON.stringify(w.properties,["osm","snapok","distance"])).join()}`);
    
    // compare Ahook and Ahookpoints[0];
    let Adist = haversineDistance(Ahook.geometry.coordinates, Ahookpoints[0].geometry.coordinates);
    if(Adist) console.log(`compare Ahook and Ahookpoints[0]: Adist= ${Adist}`);
    let wayInit = wayOfFrom(corridorWays, Ahook.properties.osm);

    if(!wayInit) {
      Ahook = bestHookAmong(Ahookpoints);
      wayInit = wayOfFrom(corridorWays, Ahook.properties.osm);
    }
    console.log(`wayInit ${JSON.stringify(wayInit.properties)}`);
    console.log(`\tA HOOK ${JSON.stringify(Ahook)}`);
    
    // 2. search for any sequence of ways that may reduce their number
/*
    if(corridorWays?.length) {
      let cumulates = [];
      corridorWays.forEach((w, i, t) => {
        let minusw = t.filter(ww => ww.properties.osm !== w.properties.osm)
        cumulates[i] = shrinkWaySequenceFrom(w, minusw, t.at(-1));
      });
      console.log(`> CUMULATES ${cumulates.map(w => w.properties.osm +" / "+ w.properties.group?.join())}`);
    }
*/

    // 3bis. alternative initialisation (e.g. parallel or intersecting line): add an explicit bridge shorter than snap
    // after checking that alternate link is shorter: concat
    if(Ahook.properties.distance < snapTolerance) {
      console.log(`Adist-2 ${haversineDistance(Ahook.geometry.coordinates, Aend.geometry.coordinates)}`);
      let altWayInit = bridgePointToClosestWayStart(Ahook, Aend);
      let altCorridor = [...corridorWays, altWayInit];
      console.log(`\taltWayInit bridge-from-stop@${Aend.properties.id}: ${JSON.stringify(altWayInit.properties,["osm","distance"])}`);
//      let alterSequence = wayLast? alterWaySequence(altWayInit, altCorridor, wayLast) : null;
// TODO

//      wayInit = bridgeClosestWayEndToPoint(Aend, Ahook);
//      if(wayInit) {corridorWays.push(wayInit); coarseWays.push(wayInit);}
//      console.log(`\twayInit stop-to-bridge@${Aend.properties.id}: ${JSON.stringify(wayInit.properties,["osm","distance"])}`);
    }

    // 3. check if corridor first-end needs an ante-bridge
    if(Ahook.properties.closestEnd) {
      console.log(`ici...`);
      wayInit = bridgePointToClosestWayStart(Ahook, Aend);
      if(wayInit) {corridorWays.push(wayInit); coarseWays.push(wayInit);}
      console.log(`\twayInit bridge-from-stop@${Aend.properties.id}: ${JSON.stringify(wayInit.properties,["osm","distance"])}`);
    } else {
      //console.log(`\twayInit snap@${Aend.properties.id}: ${JSON.stringify(wayInit.properties,["osm","snapok","distance"])}`);
    }

    // 4. get corridor last-end way and snap/hook positions
    const Bhookpoints = hookPointsToWays(Bend, corridorWays, snapTolerance);
    console.log(`Bhookpoints= ${Bhookpoints.length} ${Bhookpoints.map(w => JSON.stringify(w.properties,["osm","snapok","distance"])).join()}`);
    Bhook = bestHookAmong(Bhookpoints);
    wayLast = wayOfFrom(coarseWays, Bhook.properties.osm);

    // 7. check if corridor last-end needs a post-bridge
    if(Bhook.properties.closestEnd) {
      wayLast = bridgeClosestWayEndToPoint(Bhook, Bend);
      console.log(`wayLast ${JSON.stringify(wayLast.properties)}`);
      if(wayLast) {corridorWays.push(wayLast); coarseWays.push(wayInit);}
      else console.error(` STRANGE !!!!!!!!!!!!!!!!`);
      console.log(`\twayLast bridge-to-stop@${Bend.properties.id}: ${JSON.stringify(wayLast.properties,["osm","distance"])}`);
      Bhook = hookPointFromStop(Bend, wayLast);
      console.log(`distance Bhook-Bend ${haversineDistance(Bhook.geometry.coordinates, Bend.geometry.coordinates)}`)
    } else {
      //console.log(`\twayLast snap@${Bend.properties.id}: ${JSON.stringify(wayLast.properties,["osm","snapok","distance"])}`);
    }
    console.log(`\tB HOOK ${JSON.stringify(Bhook)}`);


    // 6. check if path is end-to-end complete: ignore unused ways and save, or continue
    if(wayInit.properties.osm === wayLast.properties.osm) {
      console.log(`current snake: unchanged`);
      return Bhook;
    }
    printSnake(snakeWay, Bend);
    console.log(`initial osmInit/osmLast: ${wayInit.properties.osm} ${wayLast.properties.osm}`);

    // 7. try to shrink corridor: trying to expand wayInit as a sequence of ways
    snakeWay = alterWaySequence(wayInit, corridorWays, wayLast) || snakeWay;
    // updates Bhook;
    return Bhook;
  }
  let Aend = stopFeatures[0];
  let hookPoints = hookPointsToWays(Aend, coarseWays, snapTolerance);
  let Ahook = bestHookAmong(hookPoints);
  let Bend = Aend, Bhook = Ahook;
//  let snakeWay = null;
  for (let i = 0; i < stopFeatures.length - 1; i++) {
    Aend = Bend; Ahook = Bhook;
    // update Bend and check it versus ways
    Bend = stopFeatures[i + 1];
    // process one corridor: inner use of array "coarseWays", and resulting route "snakeWay"
    // updates snakeWay (by augmenting) and coarseWays (by addition/replacement)
    Bhook = addOneCorridor(Aend, Ahook, Bend, i, corridorBuffer, snapTolerance);
  }
}

// global coarse filter by full route bbox
function setCoarseBboxFrom(stopFeatures, bboxBuffer) {
  const stopCoords = stopFeatures.map(f => f.geometry.coordinates);
  const stopsBbox = coordsBbox(stopCoords);
  // expand bbox by bboxBuffer (approx)
  const midLat = (stopsBbox[1] + stopsBbox[3]) / 2;
  const [lonDegPerM, latDegPerM] = metersToDegreesAtLat(midLat, 1);
  const dx = bboxBuffer * lonDegPerM, dy = bboxBuffer * latDegPerM;
  const expanded = [stopsBbox[0] - dx, stopsBbox[1] - dy, stopsBbox[2] + dx, stopsBbox[3] + dy];
  console.log(`coarse bufferedBbox ${expanded.join()}`);
  return expanded;
}
function relationFromStopsAndWays_DijkstraChain(wayElements, stopFeatures, options = {}) {
  // 1) global coarse bbox filter
  const candidateWaysGlobal = waysByBbox(wayElements, setCoarseBboxFrom(stopFeatures, options.coarseBuffer));
  // 2) restrict globalWays to Corridors Snake
  loopoverCorridors(stopFeatures, candidateWaysGlobal, options.corridorBuffer, options.snapTolerance);
  return;
}
function addCycleWays(wayElements) {
  const addedWays = [
    {"type":"Feature","properties":{"osm":"1218715507","railway":"abandoned","highway":"cycleway","surface":"asphalt"},"geometry":{"type":"LineString","coordinates":[[7.3365413,47.8681199],[7.3364728,47.8681474],[7.3361949,47.8682592],[7.3357234,47.8684511],[7.3356993,47.8684609],[7.3353708,47.8686964],[7.3349213,47.8690594],[7.3346714,47.8693421],[7.3344686,47.8696772],[7.3341098,47.870365],[7.3339244,47.8707238],[7.3337334,47.8710421],[7.3336353,47.871168],[7.3335154,47.871301],[7.3332482,47.871515],[7.3330385,47.8716727],[7.3328812,47.8717703],[7.3326585,47.8718945],[7.3318381,47.872318],[7.3299636,47.8732405],[7.3286634,47.8739227],[7.3283662,47.8740253],[7.3276988,47.8742038],[7.3275473,47.8742379],[7.3262461,47.8745584],[7.3242857,47.8750254],[7.3238155,47.8751056],[7.3236038,47.8751334],[7.3233785,47.875155],[7.3231693,47.8751721],[7.3230043,47.8751789],[7.3228628,47.8751829],[7.3227274,47.8751843],[7.3224811,47.8751788]]}},
    {"type":"Feature","properties":{"osm":"232704259","railway":"abandoned","abandoned:railway":"rail","bridge":"yes","highway":"cycleway","layer":"1","surface":"asphalt"},"geometry":{"type":"LineString","coordinates":[[7.3369788,47.8679308],[7.3365413,47.8681199]]}},
    {"type":"Feature","properties":{"osm":"1102158645","railway":"abandoned","highway":"cycleway"},"geometry":{"type":"LineString","coordinates":[[7.3369788,47.8679308],[7.3371056,47.8678829],[7.3372964,47.8678097],[7.337342,47.8677922],[7.3376361,47.8676983],[7.338063,47.8675926]]}},
    {"type":"Feature","properties":{"osm":"1218243473","railway":"abandoned","highway":"cycleway"},"geometry":{"type":"LineString","coordinates":[[7.338063,47.8675926],[7.3382127,47.8675648],[7.338335,47.867546],[7.3383947,47.867536]]}},
    {"type":"Feature","id":"way/491338176","properties":{"osm":"491338176","railway":"abandoned","highway":"cycleway","source":"BDOrtho IGN"},"geometry":{"type":"LineString","coordinates":[[7.3447715,47.8665963],[7.3445031,47.8666392],[7.3442899,47.8666797],[7.3442108,47.8667094],[7.3438098,47.8668533],[7.3437172,47.8668812],[7.3435496,47.8669271],[7.3429461,47.8671088],[7.3424791,47.8672564],[7.342414,47.8672685],[7.3423326,47.8673037],[7.3422645,47.8673382],[7.3422363,47.8673486],[7.3422169,47.8673472],[7.3421914,47.8673355],[7.3420103,47.8672051],[7.3419849,47.8671866],[7.3419627,47.8671772],[7.3419346,47.8671722],[7.3418937,47.8671646],[7.3418487,47.8671475],[7.3417884,47.8671228],[7.3417508,47.867116],[7.3416959,47.8671111],[7.3416261,47.8671124],[7.341368,47.8671088],[7.341262,47.8671025],[7.3411802,47.8670922],[7.3411058,47.8670755],[7.3410709,47.8670719],[7.3410112,47.8670701],[7.3408121,47.8670701],[7.340694,47.8670769],[7.3406049,47.8670904],[7.3405056,47.8671075],[7.3398029,47.8672181],[7.3394046,47.8672766],[7.3392959,47.8672964],[7.3389969,47.8673576],[7.3386241,47.8674278],[7.3384806,47.8674646],[7.3384215,47.8674871],[7.3384014,47.867506],[7.3383947,47.867536]]}}
    ];
  //  console.log(`addedWays ${addedWays.length} ${JSON.stringify(addedWays[0].properties)}`)
  wayElements.push(addedWays[0]);
//  wayFeatures.forEach(f => (f.properties.osm === "1218715507") ? console.log(`ok1 ${f.properties.osm}`) : 0);
  return wayElements;
}
async function clippedStops(inputFile, stopFeatures, options) {
  // geoJson filename, geoJson constant, options: in meters
  console.log(`options ${JSON.stringify(options)}`);
  if(!options.snapTolerance || !options.coarseBuffer || !options.corridorBuffer)
    throw Error(`bad options`);
  if (stopFeatures.length < 2)
    throw Error(`only ${stopFeatures.length} stop(s)`);
  try {
    const data = await readFile(inputFile, 'utf8');
    console.log(`Input ${typeof data} from ${inputFile}: ...${data.slice(91,104)}...`);
    // 0) manual addition of !railway but cycleway or abandonned=railway
    const wayElements = addCycleWays(JSON.parse(data).features);
    // 1) global coarse bbox filter
    const coarseBbox = setCoarseBboxFrom(stopFeatures, options.coarseBuffer);
    coarseWays = waysByBbox(wayElements, coarseBbox);
    // 2) restrict globalWays to Corridors Snake
    loopoverCorridors(stopFeatures, coarseWays, options.corridorBuffer, options.snapTolerance);
    return; // console.log(relation.properties.members);  // Ordered list of way/bridge objects
  } catch (error) {
    console.error('try...catch Error:', error);
    throw error;
  }
}

//----- MAIN -----
// input: VGI data excerpt from VGI (WERMA geoJSON) = the "route"
const vgiStopFeatures = [
    {"properties":{"num":"121000","pk":4.08,"use":"J","id":"Colmar-Sud","uic":"87121_","line":{"num":"121000","g":"N","pk0":4.08,"pkf":34.6,"len":30.52,"use":"FD","end":"1992","lid":"Ligne_de_Colmar-Sud_à_Bollwiller","sa":"Ligne_Colmar-Sud_-_Bollwiller","af":[1213]}},"type":"Feature","geometry":{"type":"Point","coordinates":[7.3641,48.05602]}},
    {"properties":{"num":"121000","pk":9.26,"use":"N","id":"Sainte-Croix-en-Plaine","uic":"87182121","cc":"68295"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.3856,48.01198]}},
    {"properties":{"num":"121000","pk":12.56,"use":"N","id":"Niederhergheim","uic":"87182162","cc":"68235"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.39371,47.98502]}},
    {"properties":{"num":"121000","pk":14.64,"use":"N","id":"Oberhergheim","uic":"87182170","cc":"68242"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.38899,47.9667]}},
    {"properties":{"num":"121000","pk":15.61,"use":"N","id":"Biltzheim","cc":"68037"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.38528,47.96]}},
    {"properties":{"num":"121000","pk":17.24,"use":"N","id":"Oberentzen","uic":"87182188","cc":"68241"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.3758,47.9456]}},
    {"properties":{"num":"121000","pk":19.68,"use":"N","id":"Munwiller","cc":"68228"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.35552,47.92943]}},
    {"properties":{"num":"121000","pk":21.53,"use":"N","id":"Meyenheim","uic":"87182212","cc":"68205"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.3521,47.91343]}},
    {"properties":{"num":"121000","pk":23.21,"use":"N","id":"Réguisheim","uic":"87182220","cc":"68266"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.3507,47.89857]}},
    {"properties":{"num":"121000","pk":26.5,"use":"X","id":"Ywn.Ensisheim"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.33436,47.87]}},
    {"properties":{"num":"121000","pk":27,"use":"A","id":"Yws.Ensisheim","uic":"87Ensisheim_à_Habsheim_","info":"TODO Ligne_d'Ensisheim_à_Habsheim 20,8km fermée 1918"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.33777,47.86767]}},
    {"properties":{"num":"121000","pk":27.5,"use":"N","id":"Ensisheim","uic":"87182808","cc":"68082","info":"rebroussement + Ligne_d'Ensisheim_à_Habsheim 20,8km fermée 1918"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.34385,47.8667]}},
    {"properties":{"num":"121000","pk":28.5,"use":"X","id":"Ywn.Ensisheim"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.33436,47.86992]}},
    {"properties":{"num":"121000","pk":30,"use":"X","id":"X.pontVieilleThur"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.32248,47.87518]}},
    {"properties":{"num":"121000","pk":30.94,"use":"N","id":"Ungersheim","cc":"68343"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.30267,47.875]}},
    {"properties":{"num":"121000","pk":32,"use":"X","id":"Xw.Ungersheim"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.29752,47.87332]}},
    {"properties":{"num":"121000","pk":33.34,"use":"N","id":"Feldkirch","cc":"68088","stop":"haf"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.2751,47.86447]}},
    {"properties":{"num":"121000","pk":34,"use":"X","id":"Xn.Feldkirch"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.26867,47.86288]}},
    {"properties":{"num":"121000","pk":34.6,"use":"J","id":"Bollwiller","uic":"87182709","info":"terminus"},"type":"Feature","geometry":{"type":"Point","coordinates":[7.26751,47.85686]}}    
];
// input: filename of the OSM elements (Overpass API filter way[railway] for France bbox)
const fileOSM = "veryFullOSM-v2.geojson"; //"reallyfullOSM.geojson";
// options: buffer sizes, in meters
const options = {
    snapTolerance: 25, coarseBuffer: 200, corridorBuffer: 100
  };
// output: global coarseWays = selected ways by buffered bbox for vgiStopFeatures
// output: global snakeWay = resulting way (continuing sequence of ways and gaps) for representing the route
let coarseWays = null;
let snakeWay = null;
clippedStops(fileOSM, vgiStopFeatures, options);


/**********************************************************************
 * Phase 1 tools
 */
function isWithinTolerance(snap, snapTolerance) {
  return snap.properties.distance <= snapTolerance && !!snap.properties.snapok;
}
function getWayId(way) {return way.properties.osm;}  //String(way.properties.id ?? way.properties.osm);
function getSnappedPointOnWay(snap) {
  return snap.geometry.coordinates; // [lon, lat]
}
function findNearestVertexIndex(coords, point) {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < coords.length; i++) {
    const c = coords[i];
    const dx = c[0] - point[0];
    const dy = c[1] - point[1];
    const d2 = dx * dx + dy * dy; // squared distance is enough for comparison

    if (d2 < bestDist) {
      bestDist = d2;
      bestIdx = i;
    }
  }
  return bestIdx;
}
function buildWayComponentsPhase1(corridorWays) {
  const nodeIndex = new Map(); // 'lon,lat' -> { id, coord, incidentWayIds: [] }
  let nextNodeId = 0;
  const getNode = (coord) => {
    const key = coord.join(',');
    let node = nodeIndex.get(key);
    if (!node) {
      node = { id: nextNodeId++, coord, incidentWayIds: [] };
      nodeIndex.set(key, node);
    }
    return node;
  };
  // Index endpoints of each way
  for (const way of corridorWays) {
    const coords = way.geometry.coordinates;
    const wayId = getWayId(way);
    const start = getNode(coords[0]);
    const end = getNode(coords[coords.length - 1]);
    start.incidentWayIds.push(wayId);
    end.incidentWayIds.push(wayId);
  }
  const nodes = Array.from(nodeIndex.values());
  const wayIds = new Set(corridorWays.map(w => getWayId(w)));
  const visited = new Set();
  const components = [];
  // search for sequences, increase components if any next in queue
  for (const wayId of wayIds) {
    if (visited.has(wayId)) continue;
    const queue = [wayId];
    const componentWayIds = [];
    // 
    while (queue.length) {
      const current = queue.pop();
      if (visited.has(current)) continue;
      visited.add(current);
      componentWayIds.push(current);
      // Find nodes incident to this way and other ways on those nodes
      for (const node of nodes) {
        if (!node.incidentWayIds.includes(current)) continue;
        for (const otherId of node.incidentWayIds) {
          if (!visited.has(otherId)) {
            queue.push(otherId);
          }
        }
      }
    }
    components.push(componentWayIds);
  }
  console.log(`components ${JSON.stringify(components)}`)
  return components; // array of [wayId, wayId, ...]
}
function findComponentIndex(components, wayId) {
  for (let i = 0; i < components.length; i++) {
    if (components[i].includes(String(wayId))) return i;
  }
  return null;
}
// Single‑way early exit using snap features
function snakeOnSingleWayUsingSnap(corridorWays, snapA, snapB) {
  const wayId = getWayId(snapA); // same for snapB
  // Find the way feature by id (id or osm)
  const way = corridorWays.find(w => getWayId(w) === wayId);
  if (!way) throw new Error(`Way ${wayId} not found in corridorWays`);
  const coords = way.geometry.coordinates;   // full LineString of the way
  const ptA = snapA.geometry.coordinates;    // snapped point for A on this way
  const ptB = snapB.geometry.coordinates;    // snapped point for B on this way
  // Nearest vertices along the way to each snapped point
  const idxA = findNearestVertexIndex(coords, ptA);
  const idxB = findNearestVertexIndex(coords, ptB);
  // Decide direction along the way:
  // we want the subsequence to go from A to B.
  const segmentCoords = (idxA <= idxB) ? coords.slice(idxA, idxB + 1) : coords.slice(idxB, idxA + 1).reverse();
  // Replace endpoints with exact snapped points, to align with Aend/Bend ????????????????????
  // segmentCoords[0] = ptA; segmentCoords[segmentCoords.length - 1] = ptB;
  return {
    properties: {
      id: `snake-${snapA.properties.id}-${snapB.properties.id}`,
      type: 'snake',
      group: [wayId],                  // only this way is used
      from: snapA.properties.id,       // stop name/id
      to: snapB.properties.id
    },
    geometry: {
      type: 'LineString',
      coordinates: segmentCoords
    }
  };
}
function buildSnakePhase1(Aend, Bend, corridorWays, snapTolerance) {
  // 1. Snap both corridor ends to the set of ways
  const snapA = snapPointToWays(Aend, corridorWays, snapTolerance);
  const snapB = snapPointToWays(Bend, corridorWays, snapTolerance);
  const A_within = isWithinTolerance(snapA, snapTolerance);
  const B_within = isWithinTolerance(snapB, snapTolerance);
  const wayIdA = getWayId(snapA);
  const wayIdB = getWayId(snapB);
  // ---- Early Case 0: both snapped within tolerance AND same way
  if (A_within && B_within && wayIdA === wayIdB) {
    const snake = snakeOnSingleWayUsingSnap(
      corridorWays,
      snapA, // snap on same way for A
      snapB  // snap on same way for B
    );
    return { snake, snapA,snapB,wayIdA,wayIdB, components: null, earlyExit: true };
  }
  // ---- Phase 1: build components over all corridorWays
  const components = buildWayComponentsPhase1(corridorWays);
  const compA = findComponentIndex(components, wayIdA);
  const compB = findComponentIndex(components, wayIdB);

  // ---- Early Case 1: both snapped within tolerance AND same component
  if (A_within && B_within && compA !== null && compA === compB) {
    // We stay within this component; the later routing will use only these ways.
    const componentWayIds = components[compA];
    const componentWays = corridorWays.filter(
      w => componentWayIds.includes(String(w.properties.id ?? w.properties.osm))
    );

    // Return info so the next phase can route inside this component only
    return {
      snake: null,
      snapA,snapB,wayIdA,wayIdB,
      components,
      componentIndex: compA,
      componentWays,
      earlyExit: false,    // Phase 2 must still route within the component
      sameComponent: true
    };
  }
  // ---- General case: needs the full corridor logic (possibly multiple components, bridges, etc.)
  return {
    snake: null,
    snapA,snapB,wayIdA,wayIdB,
    components,
    componentIndex: null,
    componentWays: null,
    earlyExit: false,
    sameComponent: false
  };
}