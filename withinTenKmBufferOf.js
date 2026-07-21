import { readFile, writeFile } from 'fs/promises'; // Node.js fs.promises
import buffer from '@turf/buffer';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { type } from 'os';
import { saveSync, slugifyTopo } from './carp_modules/index.js';

function OLD_mergeAndBuffer(franceDepts, bufferDistance) {
    console.log('Mainland France depts:', franceDepts.features.length);
    const mainlandDepts = franceDepts.features.filter(f => {
        const cc = f.properties.code;
        return (cc !== "2A" && cc !== "2B" && cc !== "20" && Number(cc) < 96);
    });
    console.log('Mainland filtered features:', mainlandDepts.length);
    // UNION first → single clean polygon
    let mainlandUnion = mainlandDepts[0];
    for (let i = 1; i < mainlandDepts.length; i++) {
        mainlandUnion = union(mainlandUnion, mainlandDepts[i]);
    }
    // Single polygon → buffer → perfect for booleanPointInPolygon
    return buffer(mainlandUnion, bufferDistance, { units: 'kilometers' });
}


function mergeAndBuffer(franceDepts, bufferDistance) {
    console.log('Total depts:', franceDepts.features.length);
    const mainlandDepts = franceDepts.features.filter(f => {
        const cc = f.properties.code;
        return (cc !== "2A" && cc !== "2B" && cc !== "20" && Number(cc) < 96);
    });
    console.log('Mainland depts:', mainlandDepts.length);
    // Buffer entire FeatureCollection directly (Turf handles MultiPolygon/holes/islands)
    return buffer({
        type: 'FeatureCollection',
        features: mainlandDepts
    }, bufferDistance, { units: 'kilometers' });
}

function selectWithinZone(stops, bufferedFrance) {
    console.log(`Filtering ${stops.features.length} stops within buffered France`);
    console.log(`Buffered France features: ${bufferedFrance.features.length} / ${Object.keys(bufferedFrance.features[0])}`);
    // Loop buffered features (Turf returns MultiPolygon FeatureCollection)
    const filtered = stops.features.filter(stop => 
        bufferedFrance.features.some(zone => 
            booleanPointInPolygon(stop, zone)
        )
    );
    console.log('Filtered stops:', filtered.length);
    return { type: 'FeatureCollection', metadata: {type:"node",country:87, doc:`${KMBUFFER} km buffer`}, features: filtered };
}

async function clippedStops(inputFile, franceUrl) {
    try {
        const data = await readFile(inputFile, 'utf8');
        console.log('Input data type:', typeof data);
        console.log('Input preview:', data.slice(0, 160));
        const franceDepts = await fetch(franceUrl).then(res => res.json());
        const zone = mergeAndBuffer(franceDepts, KMBUFFER);
        const stops = JSON.parse(data);  // Parse input GeoJSON
        return selectWithinZone(stops, zone);
    } catch (error) {
        console.error('Error in clippedStops:', error);
        throw error;
    }
}

function buildKey([lon, lat], precision) {
    return `${Math.round(lon * precision) / precision}_${Math.round(lat * precision) / precision}`;
}
function buildIndex(features, precision) {
    const index = new Map();  
    features.forEach(f => {
      const key = buildKey(f.geometry.coordinates, precision);
      if (!index.has(key)) index.set(key, new Set());
      index.get(key).add(f);
    });
    return index;
}
/**
 * Matches aFeatures against bIndex using given PRECISION
 * @param {Array} aFeatures - Features to match (from file A)
 * @param {Map} bIndex - Index of B features: key → Set<features>
 * @param {number} precision of the grid (500~300m, 1000=~140m, 2000=~70m)
 * @returns {Map} matches: gridKey → Set<{a: fA, b: fB}> pairs
 */
function matchName(aId, bName, aName) {
    const notArticle = w => w.length > 2 && (w!=="des" && w!=="les" && w!=="lez") && w!=="saint" && w!=="gare" && w!=="ancienne";
    const wordsA = aId.split(" ").filter(notArticle); // ignore short words
    const wordsB = bName && bName.split(" ").filter(notArticle);
    if(!wordsB) return true; // consider it a match (TODO: log this case)
    // TODO: be less restrictive: match if at least n-1 word(s) in common
    const ok = wordsA.every(wA => wordsB.includes(wA) || wA === aName);
    return ok;
}
function roughDistanceInKm([lon1, lat1], [lon2, lat2]) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180; 
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function matchFeatures(aFeatures, bIndex, precision) {
    function analyseDirect(fA, bList){
        const slugA = slugifyTopo(fA.properties.id);
        const slugAalt = fA.properties.info?.includes("a:") ? slugifyTopo(fA.properties.info.split("a:")[1].split(" ")[0]) : "";
        const slugAnom = slugifyTopo(fA.properties.nom);
        return bList.map((b,ind) => {
            const dd = roughDistanceInKm(fA.geometry.coordinates, b.geometry.coordinates);
            b.properties.dd = dd.toFixed(3);
            const slugB = slugifyTopo(b.properties.name);
            let nameToCheck = matchName(slugA, slugB, slugAnom);
            if(!nameToCheck && slugAalt) nameToCheck = matchName(slugAalt, slugB, slugAnom);
            if(!nameToCheck) {
                totalToCheck++;
                console.warn(`Match[${totalAF}]: ${fA.properties.id} → ${b.properties.name} ${dd > DDMAX ? "("+dd.toFixed(2)+"km)" : ""} ---MISMATCH---`);
            }
            return b;
        }).sort((bj,bk) => bj.properties.dd - bk.properties.dd);
    }
    let noMatchForA = 0;
    const matches = new Map();
    const matchedA = [];
    let totalToCheck = 0;
    let totalAF = 0;
    let totalBGroups = 0;
    console.log('Input preview:', aFeatures.length);
    // fA is expected to be unique in the WERMA structure
    aFeatures.forEach(fA => {
        const key = buildKey(fA.geometry.coordinates, precision);
        if(!bIndex.has(key)) return noMatchForA++;
        const bSet = bIndex.get(key);
        const bArray = Array.from(bSet);
        analyseDirect(fA, bArray);
        totalAF++; totalBGroups += bArray.length; 
        matches.set(fA, Array.from(bSet));
        fA.properties.osmNodes = Array.from(bIndex.get(key)).map(b => b.properties);
        matchedA.push(fA);
    });
    console.log(`With precision:${precision}: among ${aFeatures.length} A features, no match: ${noMatchForA}`);
    console.log(`Corse: ${totalToCheck}/${totalAF}/${totalBGroups} keys`);
    return matchedA;
}
/*
function analyseDirect(fA, bList){
    return bList.forEach(b => {
        const dd = roughDistanceInKm(fA.geometry.coordinates, b.geometry.coordinates);
        const slugB = slugifyTopo(b.properties.name);
        let nameToCheck = matchName(slugifyTopo(fA.properties.id), slugB);
        if(!nameToCheck && fA.properties.info?.includes("a:"))
            nameToCheck = matchName(slugifyTopo(fA.properties.info.split("a:")[1].split(";")[0]), slugB);
        if(!nameToCheck) {
            totalToCheck++;
            console.warn(`Match[${totalFineGroups}]: ${fA.properties.id} → ${b.properties.name} ${dd > DDMAX ? "("+dd.toFixed(2)+"km)" : ""} ---MISMATCH---`);
        }
        return totalFineGroups++;
    });
}
function analyseMatches(matches) {
    let totalFineGroups = 0;
    let totalToCheck = 0;
    const matchesByAId = new Map();
    matches.forEach((pairs, key) => {
        for (const { a, b } of pairs) {
            if (!matchesByAId.has(a)) matchesByAId.set(a, []);
            matchesByAId.get(a).push(b);
        }
    });
    console.log(`Total unique A features in matches: ${matchesByAId.size}`);
    matchesByAId.forEach((bList, a) => {
        return bList.forEach(b => {
            const dd = roughDistanceInKm(a.geometry.coordinates, b.geometry.coordinates);
            const slugB = slugifyTopo(b.properties.name);
            let nameToCheck = matchName(slugifyTopo(a.properties.id), slugB);
            if(!nameToCheck && a.properties.info?.includes("a:"))
                nameToCheck = matchName(slugifyTopo(a.properties.info.split("a:")[1].split(";")[0]), slugB);
            if(!nameToCheck) {
                totalToCheck++;
                console.warn(`Match[${totalFineGroups}]: ${a.properties.id} → ${b.properties.name} ${dd > DDMAX ? "("+dd.toFixed(2)+"km)" : ""} ---NAME MISMATCH---`);
            }
            totalFineGroups++;
        });
// *        const pairsArray = Array.from(pairs.values());
        let countAIds = new Set(pairsArray.map(p => p.a.properties.id)).size;
        if(countAIds > 1) {
            console.warn(`>>>>>>>>>> @ ${pairsArray[0].a.properties.id}: ${countAIds} unique A IDs among ${pairs.size} pairs`);
        }
        return pairsArray.forEach(({a, b}) => {
            const dd = roughDistanceInKm(a.geometry.coordinates, b.geometry.coordinates);
            const slugB = slugifyTopo(b.properties.name);
            let nameToCheck = matchName(slugifyTopo(a.properties.id), slugB);
            if(!nameToCheck && a.properties.info?.includes("a:"))
                nameToCheck = matchName(slugifyTopo(a.properties.info.split("a:")[1].split(";")[0]), slugB);
            if(!nameToCheck) {
                totalToCheck++;
                console.warn(`Match[${totalFineGroups}]: ${a.properties.id} → ${b.properties.name} ${dd > DDMAX ? "("+dd.toFixed(2)+"km)" : ""} ---NAME MISMATCH---`);
            } else {void 0;}
            totalFineGroups++;
        }); * //
    });
    return console.log(`Coarse: ${totalToCheck}/${totalFineGroups} keys`);
}
async function twoPassMatching(fileA, fileB) {
    const bandPassMatching = (afs, bfs, precision) => 
        matchFeatures(afs, buildIndex(bfs, precision), precision);
    const aFeatures = await loadGeoJSON(fileA);
    const bFeatures = await loadGeoJSON(fileB);

    // Pass 1: Coarse matching -> Map of gridKey → Set<{a, b}> pairs
    const COARSE_PRECISION = 1000;
    const coarseMatches = bandPassMatching(aFeatures, bFeatures, COARSE_PRECISION);
    console.log(`Coarse matches: ${coarseMatches.size} keys`);
  
    // Pass 2: Fine matching within coarse groups
    // TODO: more complex differentiator (or band-pass filter) e.g., name check
    const FINE_PRECISION = 2000;
    let totalFineGroups = 0;
    for (const [coarseKey, coarsePairs] of coarseMatches) {
      // Extract A and B features from coarse pairs
      const fineA = Array.from(coarsePairs, pair => pair.a);
      const fineB = Array.from(coarsePairs, pair => pair.b);
      const fineMatches = bandPassMatching(fineA, fineB, FINE_PRECISION);
      
      totalFineGroups += fineMatches.size;
      console.log(`Coarse ${coarseKey} → ${fineMatches.size} fine groups`);
    }
    console.log(`Total fine groups: ${totalFineGroups}`);
    return coarseMatches; // Or return fineMatches if needed
}
*/

// File names: input points GeoJSON FeatureCollection, France departments GeoJSON URL, output file name
const inputFile = './data/fr/rectangularFrance.geojson';
const franceUrl = 'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements-version-simplifiee.geojson';
const KMBUFFER = 5; // Buffer distance in kilometers (10 km radius = 5 km buffer)
const outFileName = `stopsWithin${KMBUFFER}kmOfFrance.geojson`;
const franceStops = await clippedStops(inputFile, franceUrl);
await writeFile(outFileName, JSON.stringify(franceStops));
console.log(`Saved ${franceStops.features.length} stops to ${outFileName}`);
const uniqueStopIds = new Set(franceStops.features.map(f => f.properties.name));
console.log(`Unique stop IDs: ${uniqueStopIds.size}`);
let PRECISION = 450; // ~70m ...300m grid for coarse matching
let DDMAX = 0.02; // Max distance in km for "ok" match (for logging purposes)
const bFeatures = buildIndex(franceStops.features, PRECISION);
// TODO get aFeatures from: 
const sub = await readFile("./data/fr/gareFranceV4.geojson", 'utf8')
    .then(res => {
        const json = JSON.parse(res);
        console.log('Input data type:', typeof json);
        const aFeatures = json.features.filter(f => ["O","N","ON","T"].some(u => f.properties.use === u));
        const coarseMatches = matchFeatures(aFeatures, bFeatures, PRECISION);
        //console.log(`Coarse matches: ${coarseMatches.size} keys`);
        //console.log(`Matching results: ${geook} matched, ${notok} uncertain`);
        return saveSync(JSON.stringify(coarseMatches), "coarseMatches.json");
        /*
        let totalFineGroups = 0;
        let totalToCheck = 0;
        coarseMatches.forEach((pairs, key) => {
            const pairsArray = Array.from(pairs);
            let countAIds = new Set(pairsArray.map(p => p.a.properties.id)).size;
            if(countAIds > 1) {
                console.warn(`>>>>>>>>>> @ ${pairsArray[0].a.properties.id}: ${countAIds} unique A IDs among ${pairs.size} pairs`);
            }
            return pairs.forEach(({a, b}) => {
                const dd = roughDistanceInKm(a.geometry.coordinates, b.geometry.coordinates);
                const nameToCheck = matchName(slugifyTopo(a.properties.id), slugifyTopo(b.properties.name));
                if(!nameToCheck) {
                    totalToCheck++;
                    console.warn(`Match[${totalFineGroups}]: ${a.properties.id} → ${b.properties.name} ${dd > DDMAX ? "("+dd.toFixed(2)+"km)" : ""} ---NAME MISMATCH---`);
                } else {void 0;}
                totalFineGroups++;
            });
        });
        return console.log(`Coarse: ${totalToCheck}/${totalFineGroups} keys`);
        */
    }).catch(err => console.error('Error reading file:', err));
