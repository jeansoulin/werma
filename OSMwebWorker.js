/* OSM SEARCH web Worker
 * ********************* */
import { getWWname } from './tierGeoCode.js';

let WW = getWWname(import.meta.url);
let DUMPLOG = WW;

const RADIUS = 5000; // 5 km
let lon = 0;
let lat = 0;
let resultDivInnerHTML = "";
let closestPointLayer = null;
let railwayLayer = null;


// runtime: input expected e = [action, [lon, lat]]
// output: succesful = object content
//   ...   unsuccesful or error: string message
self.onmessage = async (e) => {
  try {
    const {action, lon, lat} = e.data;
    if(!lon || !lat)
        return postMessage(`${WW}: bad input data`);
    if (action === 'init') {
DUMPLOG = `${WW} init ${JSON.stringify(e.data)}`;
        clearRegionalCache();
        //initialLonLat = [lon, lat];
        client = new OverpassClient(25);
        await processQuery(lon, lat);
        return;
    }
    if (action === 'click') {
DUMPLOG = `${WW} adding ${JSON.stringify(e.data)}`;
        await processQuery(lon, lat);
    }
        //initiate content to be posted back:
    let content = {"lola": [lon,lat], layerData};
    DUMPLOG = ` ***** precompiled info ${JSON.stringify(content)}`;
    return postmessage( findNearestRailway(lon, lat) );
  } catch(error) {return postMessage(error +" / "+ DUMPLOG)};
}
self.onerror = (event) => {console.error(`${event.type} error in ${DUMPLOG}`)};


async function processQuery(lon, lat) {
  try {
    const data = await client.queryRailwaysAround(lat, lon);
    const elements = data.elements || [];
    // Accumulate (deduplicated)
    const added = accumulateFeatures(elements);
    // Get collections
    const collections = getGeoJSONCollections();
    // Send back
    self.postMessage({
      action: 'featuresUpdated',
      data: {regionalCollections: collections}
    });
  } catch (error) {
    self.postMessage({action: 'error', error: error.message});
  }
}
// Accumulates Overpass results → deduplicated GeoJSON collections
const regionalRailwayFeatureMap = new Map();  // key → GeoJSON Feature
function accumulateFeatures(elements) {
    function osmElementToGeoJSON(el) {
        const getProperties = (el) =>
        ({osmId:el.id, ...tags?.name&&{osmName:tags.name}, ...tags?.railway&&{osmWay:tags.railway}});
        const getGeometry = (el) => {
            if (el.type === 'node') {
                if (typeof el.lon !== 'number' || typeof el.lat !== 'number') return null;
                return { type: 'Point', coordinates: [el.lon, el.lat] };
            } else if (el.type === 'way') {
                if (!Array.isArray(el.geometry) || el.geometry.length < 2) return null;
                return { type: 'LineString', coordinates: el.geometry.map(p => [p.lon, p.lat]) };
            }
            return null;
        };
        // Skip invalid elements
        if (!el.id) return null;
        let geometry = getGeometry(el);
        if (!geometry) return null;
        return { properties: getProperties(el), type: 'Feature', geometry };
    }
    let addedCount = 0;
    for (const el of elements) {
        const feature = osmElementToGeoJSON(el);
        if (!feature) continue;
        const key = feature.id; // Map check + set
        if (!regionalRailwayFeatureMap.has(key)) {
            regionalRailwayFeatureMap.set(key, feature);
            addedCount++;
        }
    }
    return addedCount;
}
function getGeoJSONCollections() {
    const allFeatures = Array.from(regionalRailwayFeatureMap.values());
    const nodes = allFeatures.filter(f => f.geometry.type === 'Point');
    const ways = allFeatures.filter(f => f.geometry.type === 'LineString');
    return {
        allFeatures,
        nodes: { type: 'FeatureCollection', features: nodes },
        ways: { type: 'FeatureCollection', features: ways }
    };
}
function clearRegionalCache() {
    regionalRailwayFeatureMap.clear();
}





// build overpass-client.js
// Robust Overpass client with endpoint rotation + retry for Western Europe

const SERVERS = [
  // Global primary
  'https://overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  
  // Europe/Regional
  'https://overpass.osm.ch/api/interpreter',        // Switzerland (fast)
  'https://overpass.nchc.org/api/interpreter',      // Taiwan mirror (stable)
  'https://overpass.kumi.systems/api/interpreter',  // Community mirror
  
  // Fallback
  'https://public-gw.api.overpass.openstreetmap.fr/api/interpreter'  // France-focused
];

const BACKOFF_DELAYS = [500, 1000, 2000, 4000, 8000, 16000];  // ms
const TIMEOUT = 25; // ms. or s.

class OverpassClient {
    constructor(regionName) {
        this.regionName = regionName;
        this.cache = new Map();
      }
    query(queryText, options = {}) {
        const {
            cache = true,
            radius = RADIUS  // meters
          } = options;
        const url = this.buildQueryURL(queryText);
        return this.fetchWithRetry(url, cache);
      }
    buildQueryURL(queryText) {
        const query = `[out:json][timeout:${TIMEOUT}];${queryText});out geom;`;
        const server = SERVERS[Math.floor(Math.random() * SERVERS.length)];
        return `${server}?data=${encodeURIComponent(queryText)}`;
    }
      // several attempts to fetch with cache
    async fetchWithRetry(url, useCache = true) {
      if (useCache && this.cache.has(url)) {
        return this.cache.get(url);
      }
      const BACKOFF_DELAYS = [500, 1000, 2000, 4000];  // ms
      for (const [attempt, delay] of BACKOFF_DELAYS.entries()) {
        try {
          const response = await fetch(url);
          const status = response.status;
          // RETRYABLE: Server busy
          if (status === 429 || status === 504 || status === 503) {
            if (attempt === BACKOFF_DELAYS.length - 1) {
              throw new Error(`HTTP ${status} exhausted retries`);
            }
            console.warn(`HTTP ${status} → retry ${attempt + 1}/${BACKOFF_DELAYS.length} in ${delay}ms`);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
          // FAIL FAST: Other errors
          if (status >= 400) {
            throw new Error(`HTTP ${status}: ${response.statusText}`);
          }
          if (!response.ok) {
            throw new Error(`HTTP ${status}: Unexpected`);
          }
          const data = await response.json();
          // Cache success
          if (useCache) {
            this.cache.set(url, data);  // + Auto-expire after 1 hour
            setTimeout(() => this.cache.delete(url), 3600000);
          }
          return data;
        } catch (error) {
          // Final attempt failed
          if (attempt === BACKOFF_DELAYS.length - 1) {
            throw error;
          }
        }
      }
    }
      // Convenience methods for railway queries
    async queryRailwaysAround(lat, lon) {
        const queryText = `[out:json][timeout:${TIMEOUT}];(
            nwr(around:${RADIUS},${lat},${lon})["railway"];
            );out geom;
        `;
        return this.query(queryText);
    }
    clearCache() {
        this.cache.clear();
    }
}

// these functions below may be used if we need
// to get the projection of [lon,lat] onto its nearest OSM feature
/*
function approxDist2(a, b) {
    const latm = ((a[1] + b[1]) * 0.5) * Math.PI / 180;
    const dx = (a[0] - b[0]) * Math.cos(latm);
    const dy = (a[1] - b[1]);
    return dx * dx + dy * dy;
}
function bestPointOnWayGeometry(geometry, target) {
    let best = null;
    let bestScore2 = Infinity;
    for (const p of geometry) {
        const score2 = approxDist2([p.lon, p.lat], target);
        if (score2 < bestScore2) {
            bestScore2 = score2;
            best = { lon: p.lon, lat: p.lat };
        }
      }
    return { closestGeometryPoint: best, closestDistance2: Math. };
}

async function findNearestRailway(lon, lat) {
  try {
    // send Overpass uri: railway lines within RADIUS
    const response = await fetch(queryOSMAround(lon, lat));
    console.log(`Overpass response: ${response.status}`);
    if (!response.ok)
        throw Error(`Overpass error: ${response.status}`);
    // analyse response
    // TODO something with HTTP 504, 429
    const data = await response.json();
    if (!data.elements || data.elements.length === 0)
        return postMessage(`${WW}: no OSM-railway found around ${RADIUS}m.`);

    console.log(`${WW} ${data.elements.length} items found: ${data.elements.map(el => JSON.stringify(el.tags, ["railway", "name"])).join("\n")}`);
    
//"type":"way","id":"","bounds":{},"nodes":[],"geometry":[],"tags":{"abandoned:railway":"rail","bicycle":"yes","cycleway:right":"","cycleway:right:lane":"","cycleway:right:oneway":"","highway":"secondary","lane_markings":"no","lit":"yes","maxspeed":"50","maxspeed:type":"sign","name":"Rue de Bordeaux","name:etymology:wikidata":"Q1479","oneway":"no","railway":"abandoned","sidewalk":"both","surface":"asphalt"
//"type":"node", "tags":"railway"=halt|stop|station|tram_stop|switch
    // Clear previous layers
    if (closestPointLayer) map.removeLayer(closestPointLayer);

    // Create railway lines content for further layer (code into an ol-module)
    // save items of type 'way' with geometry
    // TODO 'node' with 'stop' or 'station'

    const currentRailwayFeatures = data.elements.filter(el =>
        el.type === 'way' && Array.isArray(el.geometry) && el.geometry.length > 0
    );
    
    let bestIndex = -1;
    let closestDistance2 = Infinity;
    let closestGeometryPoint = null;
    for (let i = 0; i < currentRailwayFeatures.length; i++) {
        const el = currentRailwayFeatures[i];
        const candidate = bestPointOnWayGeometry(el.geometry, [lon, lat]);
        if (candidate.closestDistance2 < closestDistance2) {
            closestDistance2 = candidate.closestDistance2;
            bestIndex = i;
            closestGeometryPoint = candidate.closestGeometryPoint;
        }
    }
    const bestElement = bestIndex >= 0 ? currentRailwayFeatures[bestIndex] : null;
    const tags = bestElement?.tags || {};

    console.log`
        <strong>Nearest way:</strong> ${Math.round(closestDistance2}m away<br>
        name: ${tags.name||typeof Tags.name}\n`);

    return ({
        currentRailwayFeatures,
        bestIndex,
        bestElement,
        closestGeometryPoint,
        closestDistance2
    });

/*
// into calling tier: tierGeoCode or else
const buildrailwayLayer = currentRailwayFeatures => {
    return new VectorLayer({
        source: new VectorSource({ features:
            currentRailwayFeatures.map(el => {
                const coords = el.geometry.map(p => fromLonLat([p.lon, p.lat]));
                return new Feature({
                  geometry: new LineString(coords),
                  name: el.tags?.name || 'Railway'
                });
            })
        }),
        style: new Style({stroke: new Stroke({ color: 'orange', width: 3 })})
    });
// then:  map.addLayer(railwayLayer);
;}

    // Show closest point
    const closestFeaturePoint = new Feature({
        geometry: new Point(closestPoint)
    });
    closestPointLayer = new VectorLayer({
        source: new VectorSource({ features: [closestFeaturePoint] }),
        style: bigDotStyle('red')
    });
    map.addLayer(closestPointLayer);
    // Center on closest point
    map.getView().setCenter(closestPoint);

*/
/*
  } catch (error) { postMessage(`Error: ${error.message}`) }
}
*/