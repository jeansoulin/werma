// imports from modules
const { roundDistanceInKm, mapifyProperty, mapifyPropertyHard, countWithinMap, histoByProperty,  lignifyNormalGares, checkCcFrance, checkCcBelge, saveSync } = require("./carp_modules/index.js");
const fs = require('fs/promises');
const fss = require('fs');
const { features } = require( "process" );
let dumpLOG = "validateData"; // for debugging, will be added in error messages to trace the code
const VERBOSE = false;

//const geogaresname = "data/FR/gareFranceV4.geojson"; // Belge "newTestV4.json";
const geogaresname = "data/BE/newTestV4.geojson";

loadAndValidateFiles(geogaresname)
  .then(res => console.log((dumpLOG = "done")))
  .catch(err => console.error(`overall failure: ${err.message} ${dumpLOG}`));


async function loadAndValidateFiles(...fileNames) {
  try { // Process an array of Promises
    const fileContents = await Promise.all(fileNames.map(fn => fs.readFile(fn, 'utf8')));
    dumpLOG = `// Loading: (${fileContents.length}), loaded: ${fileNames.join(', ')}`;
    const gares = fileContents[0];
    const validGares = twoStepsValidation(JSON.parse(gares));
    //  const processes = fileContents.map(data => twoStepsValidation(JSON.parse(data)));
    return;
  } catch (err) {
    console.error(`❌ load error: ${err.code} ${err.message}`);
    throw err;  // Re-throw so caller knows it failed
  }
}
function outSync(data, filout = "outest.geojson") {
  dumpLOG = `outSync: ${typeof data} data of length ${data?.length} into ${filout}`;
  if (!data) return console.error('outSync: no data provided');
  const dir = process.cwd(); console.log(`writing ${dumpLOG} in Current directory: ${dir}`);
  try {
      // ✅ CORRECT: writeFileSync takes NO CALLBACK
      fss.writeFileSync(filout, data, 'utf8');
      console.log(`✅ Wrote ${data.length} bytes to ${dir} : ${filout}`);
      return "ok";
  } catch (err) {
      console.error(`❌ outSync error: ${err.code} ${err.message}`);
      throw err;  // Re-throw so caller knows it failed
  }
}

function twoStepsValidation(geojson) {
  // Must be FeatureCollection and have features array of Point features 
  let features = validateHeader(geojson);
  const mapsAndCounts = buildMapsAndCounts(features);
  recapFirstStep(features, mapsAndCounts);
  const globalChecks = globalConsistencyChecking(features, mapsAndCounts);
  recapStep2(features, globalChecks);
  // saving computed datasets
  outSync(JSON.stringify(featuresToGeojson(geojson.metadata, features)), "outTestA.geojson");
  const lineFeatures = [...mapsAndCounts.LineSequensMap.values()];
  const lineMeta = Object.assign({}, geojson.metadata, {"type":"line", "doc":"computed"});
  outSync(JSON.stringify(featuresToGeojson(lineMeta, lineFeatures)), "outTestLine.geojson");

  return mapsAndCounts.LineSequensMap;
}
// feature by feature map builder and check (may stop anytime))
function addAndCheckAnytime(sameKeyList, key, feature, anytimeCheck){
  if(!key) return feature;
  if (!sameKeyList.has(key)) sameKeyList.set(key, []);
  sameKeyList.get(key).push(feature);
  // anytime feature check against first recorded feature of same key
  return anytimeCheck ? anytimeCheck(feature, sameKeyList.get(key)) : feature;
}
// ... and list of accepted check functions
function anytimeUic(feature, sameUic){
  if(sameUic.length > 1 && feature.properties.id !== sameUic[0].properties.id)
     throw Error(`uic-id problem ${sameUic.map(g => g.properties.id).join(', ')}`);
  return feature;
}
function anytimeNodeok(feature, sameId) {
  function validateIdConsistency(sameId) {
    const uic0 = sameId[0].properties.uic;
    if(sameId.filter(f => !f.properties.uic || f.properties.uic !== uic0).length > 1)
      throw Error(`Nodeok: =Id but ≠Uic: ${sameId.map(f => f.properties.uic).join(', ')}`);
    return feature;
  }
  function validateJCount(sameId) {
    //dumpLOG = `all must have use="J" except one 'master'`;
    // TODO: this part could be improved by using a new property "hub" instead of use="J"
    if(sameId.filter(f => f.properties.use !== 'J').length > 1)
      throw Error(`Nodeok: bad J count ${sameId.map(f => JSON.stringify(f.properties, ["id","use","uic"]).join("\n"))}`);
    return feature;
  }
  function validateNumPkConsistency(sameId) {
    //dumpLOG = `(num, pk) consistency, may share num or pk, not both: example of loops`;
    if(new Set(sameId.map(f => f.properties.num)).size === 1 && new Set(sameId.map(f => f.properties.pk)).size === 1)
      throw Error(`Nodeok: inconsistent num/pk ${sameId.map(f => `${f.properties.num}/${f.properties.pk}`).join(', ')}`);
    return feature;
  }
  const fp = feature.properties;
  if(sameId.length < 2 || fp.use === 'X' || fp.use.startsWith('F'))
    return feature; // skip checking + TODO: check if pseudo-stops already checked
  //dumpLOG = "check same-id features consistent by uic, use and num/pk";
  validateIdConsistency(sameId);
  validateJCount(sameId);
  validateNumPkConsistency(sameId);
  return feature;
}
function anytimePseudo(feature, sameId) {
  return feature; //"TODO";
}
function anytimeSlugId(feature, directIdSet,slugedIdSet) {
  directIdSet.add(slugifyLite(feature.properties.id));
  slugedIdSet.add(slugifyLite(feature.properties.id));
  if(directIdSet.size !== slugedIdSet.size)
    throw Error(`avoid ambiguous id string @${feature.properties.id}`);
  return feature;
}


function buildMapsAndCounts(features){
  function updateUseBreakdown(f) {
    const use = f.properties?.use;
    if (use != null) UseCounts[use] = (UseCounts[use] || 0) + 1;
  }
  function updateSchemaCounts(f) {
    Object.keys(f.properties).forEach(prop => {
      SchemaCounts[prop] = (SchemaCounts[prop] || 0) + 1;
    });
    if(f.geometry?.coordinates[1]) SchemaCounts.GEO = (SchemaCounts.GEO || 0) + 1;
  }
  // counts *unique values* for each property
  function updateSchemaSingle(f) {
    Object.keys(f.properties).forEach(prop => {
      if (!SchemaSingle[prop]) SchemaSingle[prop] = new Set();
      SchemaSingle[prop].add(f.properties[prop]);
    });
  }
  function updateTownCodeCounts(f) {
    if(f.properties.cc) InseeUnits.add(f.properties.cc);
    if(f.properties.cc2) InseeUnits.add(f.properties.cc2);
  }

  const nodeIsBNOTJ = f => ["N","O","T","B","J"].some(u => f.properties.use.startsWith(u));
  const okBname = id => /^(Y|R|VM|VP)[A-Za-z0-9]{0,3}\./.test(id);
  //
  const IdToNodesokMap = new Map();
  const IdToPseudosMap = new Map();
  const LonLatNodesMap = new Map();
  const UicFeaturesMap = new Map();
  const LineSequensMap = new Map();
  const junctionSet = new Set();
  const directIdSet = new Set();
  const slugedIdSet = new Set();
  const warnBIdName = [];
  const UseCounts = {}; // { ...UseBreakdownONTABFX };
  const SchemaCounts = {"num":0,"pk":0,"use":0,"id":0,"GEO":0,"uic":0,"cc":0}; //presence
  const SchemaSingle = {"num":0,"pk":0,"use":0,"id":0,"GEO":0,"uic":0,"cc":0}; //unique
  const InseeUnits = new Set();
  let prevNode = null;

  // every node-feature is checked by itself, and with respect to previous nodes
  // on same line, what => a line has at least two nodes
  features.forEach(f => {
    f = validBasicFeature(f);
    // to check no sluged(id) may bring ambiguity into further comparisons
    f = anytimeSlugId(f, directIdSet,slugedIdSet);
    const fpid = f.properties.id;
    const fpuse = f.properties.use;
    const fpuic = f.properties.uic;
    if(f.properties.uic) 
      addAndCheckAnytime(UicFeaturesMap, fpuic, f, anytimeUic);
    if(nodeIsBNOTJ(f))
      addAndCheckAnytime(IdToNodesokMap, fpid, f, anytimeNodeok);
    else
      addAndCheckAnytime(IdToPseudosMap, fpid, f, anytimePseudo);

    //dumpLOG = `// BuildMaps Step1-b: check next-to-previous feature consistency`;
    prevNode = checkSequencing(f, prevNode, LineSequensMap);
    //dumpLOG = "// BuildMaps Step1-c: (key,listf) maps for quick lookup of props|geom";
    addAndCheckAnytime(LonLatNodesMap, aroundLonLatKey(f.geometry?.coordinates), f, null);

    updateSchemaCounts(f);
    updateSchemaSingle(f);
    updateUseBreakdown(f);
    updateTownCodeCounts(f);

    if(fpuse === "J") junctionSet.add(fpid);
    if(fpuse==="B" && !okBname(fpid)) warnBIdName.push(fpid);
    return;
  });
  return ({IdToNodesokMap, IdToPseudosMap, LonLatNodesMap, UicFeaturesMap, junctionSet, LineSequensMap, SchemaCounts, SchemaSingle, UseCounts, InseeUnits, warnBIdName});
}

function recapFirstStep(features, {IdToNodesokMap, junctionSet, LineSequensMap, SchemaCounts, SchemaSingle, UseCounts, InseeUnits, warnBIdName}){
  // recaps TODO: check slug of id are unique IMPORTANT

  const getSingle = cnt => Object.fromEntries(Object.entries(cnt).map(
    ([prop, set]) => [prop, set.size])
  );
  const singleGare = cnt => ["O","N","ON","T"].reduce((acc,u,i) => acc + cnt[u], 0);
  const borderXing = cnt => ["FO","FN"].reduce((acc,u,i) => acc + cnt[u], 0);
  const warnOfPkGap = (dpk) => (dpk?.length) ?
    dpk.sort().reduce((acc, str) => acc + `\n\t<!> ${str}}`, "") : "ok";
  const warningBname = list =>
    list.reduce((acc, id) => acc + `\n\t<!> B_switchname:${id}`, "");
  let log = `
// SchemaCounts:\n ${JSON.stringify(SchemaCounts)}
// SchemaSingle:\n ${JSON.stringify(getSingle(SchemaSingle))}
// Use breakdown: ${JSON.stringify(UseCounts)}
// Counting nodes by status:
   gares (single occurence): ${singleGare(UseCounts)}
   junctions (single @station or switch): ${junctionSet.size}
   border Xings: ${borderXing(UseCounts)}
   communes with a railway/tram stop: ${InseeUnits.size}
// id name suggestions: ${warningBname(warnBIdName) || "none"}
// inter-Pk distances: ${warnOfPkGap(pkdiff)}
// LineSequensMap ${LineSequensMap.size} from ${features.length} features sorted by valid ('num'/'pk') from origin to terminus`;
  console.log(log);
  return;
}

function globalConsistencyChecking(features, {IdToNodesokMap, IdToPseudosMap, LonLatNodesMap, UicFeaturesMap, LineSequensMap, SchemaCounts, SchemaSingle, UseCounts, InseeUnits}){
  // generic process of multiple occurences sharing some property
  function globalConsistencyOf(mapSameProp, innerFunction, warnArray){
    mapSameProp.forEach((listf, key) => {
        innerFunction(listf, warnArray, key);
    });
    return warnArray;
  }
  // accepted specific innerFunction
  function innerLonLat (listf, warnArray)  {
    const notAllX = listf => listf.some(f => !f.properties.use.startsWith("X"));
    if(listf.length < 2) return;
    const ids = new Set(listf.map(f => f.properties.id));
    if(ids.size > 1) { //  && notAllX(listf)
      warnArray.push(`\n\t<!> !=Id @~LonLat: ${Array.from(ids).join(', ')}`);
    }
  }
  function innerMaxDistHub (listf, warnArray)  {
    const max10m = maxd => maxd < TENMETER? "" : maxd; // TENMETER
    const ceilingOf = use => use==="B" ? SPREADMIN : SPREADMID;
    const prefixOf = (use, ceil) => `\n\t<!> ${use}spread>${ceil}=${max10m(maxd)}`;
    const addPropK = (use, maxd, index) => {
      let mxd = max10m(maxd);
      delete features[index].properties.k;
      if (mxd && use !== "J")
        features[index].properties.k = `${use}:${maxd}`;
    };
    const spreadTest = (flp, maxd, warnArray) => {
      const ceil = ceilingOf(flp.use);
      if(maxd > ceil) {
        let log = prefixOf(flp.use, ceil) + `\t ${JSON.stringify(flp,["num","use","id"])}`;
        warnArray.push(log);
      }
      return warnArray;
    };
    //
    if(listf.length < 2) return warnArray;
    const maxd = maxDistanceKm(listf.map(f => f.geometry.coordinates));
    const flead = listf.find(f => f.properties.use!=="J");
    const flp = flead.properties; // flp.use must start with N|O|T|B
    const index = features.findIndex(f => f.properties.uic === flp.uic && f.properties.num === flp.num);
    addPropK(flp.use, maxd, index);
    return spreadTest(flp, maxd, warnArray);
  }
  function innerMaxDistAlt (listf, warnArray)  {
    const logFeatures = f => JSON.stringify(f.properties, ["id","num"]) +"_"+
            JSON.stringify(f.geometry.coordinates);
    if(listf.length < 2) return warnArray;
    const maxd = maxDistanceKm(listf.map(f => f.geometry.coordinates));
    const flead = listf.find(f => f.properties.use !=="J");
    let log = "";
    if(flead) switch (flead.properties.use.slice(0,1)) {
      case "X": case "F":
        if(maxd > Number.EPSILON) {
          log = `XF-pseudonode id => ${maxd}-dev ${listf.reduce((acc,f) => acc + logFeatures(f), "")}`;
        }
        break;
      case "A":
        log = `use=A shouldn't appear @${JSON.stringify(listf)}`;
        break; // shouldnt happen
      default:
        log = `unexpected use value @${JSON.stringify(listf)}`;
        break; // simple warn
    }
    if(log) warnArray.push(`\n\t<!> ${log}`);
    return warnArray;
  }
  function innerUselessUIC(listf, warnArray, key) {
    if(listf.length > 1) return; // treat only singles
    if(/^\d{8}$/.test(key)) return; //accept UIC="Union Internationale des Chemins de fer"
    const fp = listf[0].properties;
    // non UIC codes: have 1+ alpha character && !@origin/terminus/border-crossing
    if(fp.line || fp.info?.startsWith('terminus') || ["J","A","B","F"].some(u => fp.use.startsWith(u))) return "skip";
    if(fp.use === "X") return "ignore";
    warnArray.push(`\n\t<!> UIC@ ${JSON.stringify(fp)} could be ignored`);
  }
  
  let warnLonLat = [];
  let warnUicUseless = [];
  let warnAltSpread = [];
  let warnSpread = [];
  //dumpLOG = `Connection Step2-a: with LonLat(${LonLatNodesMap.size})`;
  warnLonLat = globalConsistencyOf(LonLatNodesMap, innerLonLat, warnLonLat);
  //dumpLOG = `Connection Step2-b: maxd between IdToNodesokMap(${IdToNodesokMap.size}) occurences`;
  warnSpread = globalConsistencyOf(IdToNodesokMap, innerMaxDistHub, warnSpread);
  //dumpLOG = `Connection Step2-c: maxd between IdToPseudosMap(${IdToPseudosMap.size}) occurences`;
  warnAltSpread = globalConsistencyOf(IdToPseudo, innerMaxDistAlt, warnAltSpread);
  //dumpLOG = `Connection Step2-d: with UicFeaturesMap(${UicFeaturesMap.size}) occurences`;
  warnUicUseless = globalConsistencyOf(UicFeaturesMap, innerUselessUIC, warnUicUseless);
  return ({warnLonLat, warnUicUseless, warnSpread, warnAltSpread});
}
function recapStep2(features, {warnLonLat, warnUicUseless, warnSpread, warnAltSpread}) {
  const warnLog = list => list.reduce((cum, w) => cum + w, "") || `none`;
  let log = `
// recap STEP2: global checking of Unique Values from built 'Maps':
// STEP-2-a: ID @very_close location:${warnLog(warnLonLat)}
// STEP-2-b: Hub_Spread excess ${warnLog(warnSpread.sort())}
// STEP-2-d: psn_Spread > ${SPREADMIN}: ${warnLog(warnAltSpread)}
// STEP-2-e: useless UIC: ${warnLog(warnUicUseless) || "none"}
`;
  console.log(log);
  return;
}

function validateHeader(geojson) {
    //dumpLOG = "validateHeader";
    if (!geojson || geojson.type !== 'FeatureCollection') {
        throw Error('Header: Must be a FeatureCollection');
    }
    if (!Array.isArray(geojson.features)) {
        throw Error('Header: features must be an array');
    }
    return geojson.features || [];
}
function validBasicFeature(feature){
  function validBasicGeometry(feature) {
    const validCoo = coo => Array.isArray(coo) && coo.length >= 2 && !isNaN(coo[0]) && !isNaN(coo[1]); // may accept altitude
    const validGeo = fg => fg && fg.type === 'Point' && validCoo(fg.coordinates);
    const fiveDCoo = coo => coo; // TODO: trunk to 5 digits
    if (feature.gop) {
      //dumpLOG = `validBasicGeometry: try shorter 'gop format' geometry`;
      if(!validCoo(feature.gop.coordinates))
        throw Error(`Geometry: gop geometry ${JSON.stringify(feature)}  must have 2 coordinates (lng, lat)`);
      //feature.gop.coordinates = fiveDCoo(feature.gop.coordinates);
    } else {
      //dumpLOG = `validBasicGeometry: try Regular geojson geometry instead`;
      if(!validGeo(feature.geometry))
        throw Error(`Geometry: Regular geoJson geometry ${JSON.stringify(feature)} !! type=Point and 2 coordinates (lng, lat)`);
    }
    return feature;
  }
  function validMandatoryProperties(feature){
    const validINP = fp => fp && typeof fp.id === 'string' && typeof fp.num === 'string' && typeof fp.pk === 'number' && typeof fp.use === 'string';
    //dumpLOG = "validate mandatory: Id, Num, Pk, Use";
    if (!validINP(feature.properties)) // First: check id, num, pk mandatory properties
      throw Error(`mandatory missing or pk not a number @${JSON.stringify(feature.properties, ["num","pk","use","id"])}`);
    return feature;
  }  
  //dumpLOG = `Basic Validation check-1: geometry and mandatory properties`;
  return validBasicGeometry( validMandatoryProperties( feature ) );
}






/* STRING PROCESSING utilities
 * slugify strings to avoid ambiguities in further processing
 * ------------------------------------------------------------ */
function slugifyLite(str) {
  if (!str) return '';
  return str.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')    // remove diacritics
      .replace(/œ/g, 'oe')                // replace œ ligature and...
      .replace(/ß/g, 'ss').replace(/æ/g, 'ae').replace(/ĳ/g, 'ij')
      .replace(/[^a-z0-9\s-]/g, ' ')      // remove non-alpha/digit chars but keeps -
      .replace(/\s+/g, ' ').trim();       // single inner whitespaces
}

/* GEOMETRIC MEASUREMENT utilities
 * and checking intended to prevent coordinates 'gross' typing errors
 * (e.g. [-1.45] instead of [1.45], [.6876] instead of [2.6876])
 * roundDistanceInKm comes from module
 * ------------------------------------------------------------ */
const INTERPKMX = 2.9; // distance in km
const INTERPKWEIRD = 35; // TODO: avoids case of TGV
const INTERPKREALLYWEIRD = 90; // TODO: specific cases?
const SPREADMID = 0.43; // 400 m
const SPREADMIN = 0.1; // 100 m
const SPREADNOT = 0.002; // 2 m = guess equal
const TENMETER = 0.01; // 10 m

function aroundLonLatKey ([lng, lat])  {
  return `${Math.round(lng * 1e4/5)},${Math.round(lat * 1e4/5)}`; // ~3~4 digits roundup
}
/* note: 1e4/7 means a radius ~50m. for features with same key
| Target Radius | E | D     | Step Size (°) | Notes    |
| ------------- | - | ----- | ------------- | -------- |
|  50 m           4   7                                |
| 100 m         | 4 | 3.5   | 0.000286      | ~102 m   |
| 500 m         | 4 | 0.7   | 0.00143       | ~510 m   |
| 1000 m        | 4 | 0.35  | 0.00286       | ~1020 m  |
| 5 km          | 3 | 1.75  | 0.00571       | ~5.1 km  |
| 10 km         | 3 | 0.875 | 0.0114        | ~10.2 km |
| 50 km         | 2 | 1.75  | 0.0571        | ~51 km   |
at ~45° latitude:
equality on 3rd decimal => less than 140 m distance
(Math.round(1000 * lon1)) === (Math.round(1000 * lon2)) &&
(Math.round(1000 * lat1)) === (Math.round(1000 * lat2)) */

function diffPkInKm (pkf, pk0)  {
  return parseFloat((1e3 * (pkf - (pk0 || 0) + Number.EPSILON))/1e3).toFixed(2);
   // add epsilon to avoid floating point issues
}


const pktgvs = []; const pkdiff = [];
function checkSequencing(feature, prevNode, LineSequensMap) {
  function validLineInfo(fp) { //TODO: improve
    return !!(fp && typeof fp.line === 'object' &&
      typeof fp.line.lid === 'string' && ( fp.line.pk0 === undefined || typeof fp.line.pk0 === 'number' ));
  }
  function validNumPkFirst(currf, prevf){
    const cnum = currf.properties.num;
    const pnum = prevf.properties.num;
    if (cnum < pnum)
      throw Error(`Ordering: Not sorted @(${currf.properties.id}): ${cnum} < ${pnum}`);
    if (!validLineInfo(currf.properties))
      throw Error(`Ordering: ${cnum} curline w/ line property @(${currf.properties.id})`);
    if (!prevf.properties.info?.includes("terminus"))
      throw Error(`Ordering: ${pnum} curline w/ "terminus" @(${prevf.properties.id})`);
    // process correct order TODO
    return "valid first point of line group";
  }
  function validNumPkInner(currf, prevf){
    function correctPkOrder (cp, pp) {
      if (cp.pk <= pp.pk)
        throw Error(`Ordering: sort error @(${cp.id}): ${cp.pk} <= ${pp.pk}`);
      // process correct order TODO: better checking?
      if(pp.info?.includes("terminus"))
        throw Error(`Ordering: extra "terminus" @(${pp.id})`);
      if(cp.line)
        throw Error(`Ordering: extra "line" @(${cp.id})`);
      return true;
    }
    function divergenceExcess(dp, dg){
      let diffdpdg = Math.abs(dp - dg); // crooked lines -> 8 times longer ?
      return (diffdpdg > 8*dp); // && diffdpdg > INTERPKMX);
    }    
    function interPkDistance (f,fprev, dp, dg)  {
      const isLGV = f => f.properties.id.includes("GV"); // belongs to high-speed line
      //dumpLOG = "dp, dg: distances in KM. Check them and their divergence";
      if(dg >= INTERPKREALLYWEIRD)
        throw Error((`geo ${dg}>${INTERPKREALLYWEIRD} @${JSON.stringify(f.properties)}`));
      if(dg > INTERPKWEIRD){ 
        if(isLGV(fprev) || isLGV(f)){
            f.properties.dg = dg;
            pkdiff.push(`LGV. ${JSON.stringify(f.properties)}`);
        }
        else throw Error((`geo ${dg}>${INTERPKWEIRD} @${JSON.stringify(f.properties)}`));
      }
      if(divergenceExcess(dp, dg)){
          f.properties.dp = dp;
          f.properties.dg = dg;
          pkdiff.push(`std. ${JSON.stringify(f.properties)}`);
      }
      return void "acceptable distance and divergence";
    }
    const cp = currf.properties;
    const pp = prevf.properties;
    if(!correctPkOrder(cp, pp)) return false;
    // assessing distance TODO
    const dg = roundDistanceInKm(currf.geometry.coordinates, prevf.geometry.coordinates);
    interPkDistance(currf, prevf, diffPkInKm(cp.pk, pp.pk), dg);
    return "valid next point in the line group";
  }
  function validNumPk(currf, prevf){
    //dumpLOG = `line comparison: within same ${currf.properties.num}`;
    if (currf.properties.num === prevf.properties.num) { // continuing a curline
      validNumPkInner(currf, prevf);
    } else { // new curline group to check
      validNumPkFirst(currf, prevf);
    }
    return true;
  }
  const initCurline = (props, coords) => {
    const curline = {'type':"Feature",'geometry':{"type":"LineString"}};
    curline.properties = Object.assign(Object.create({}), props);
    curline.geometry.coordinates = [coords];
    return curline; // reset
  };
  const updateCurline = (curline, currf) => {
    const lp = curline.properties;
    if(lp.pk0) {
      curline.properties.len = diffPkInKm(currf.properties.pk, lp.pk0);
      //parseFloat((1000 * (currf.properties.pk - ( lp.pk0 || 0 ) + Number.EPSILON))/1000).toFixed(2); // add epsilon to avoid floating point issues
      curline.properties.pkf = lp.pk;
    } else { // default (pk0=0)
      curline.properties.len = lp.pk; // default len = pkf = pk
    }
    return curline;
  };
  //
  const fp = feature.properties;
  if (!prevNode) {
    //dumpLOG = "process first feature of first curline";
    if (!validLineInfo(fp))
      throw Error(`Ordering: Very first feature (id:${fp.id}) must have line property`);
    LineSequensMap.set(fp.num, initCurline(fp.line, feature.geometry.coordinates));
  } else {
    //dumpLOG = "point in a curline or new 'num' curline, with a valid object line";
    if(validNumPk(feature, prevNode) && fp.line) // next new curline
      LineSequensMap.set(fp.num, initCurline(fp.line, feature.geometry.coordinates));
    else {
      //dumpLOG = "any next point in curline => update curline";
      let curline = LineSequensMap.get(fp.num);
      curline.geometry.coordinates.push(feature.geometry.coordinates);
      if(fp.info?.includes('terminus')) {
        curline = updateCurline(curline, feature);
      }
      LineSequensMap.set(fp.num, curline); // rewrite curline object
    }
  }
  return prevNode = feature;
}

function maxDistanceKm (pts) {
  // order-preserving faster distances: used only to sort points
  const quickShortDistance = ([x1,y1], [x2, y2]) => (x2 - x1)**2 + (y2 - y1)**2;
  const ptslen = pts.length; let maxeud = 0, eui = 0, euj = 0;
  for (let i = 0; i < ptslen; i++) for (let j = i + 1; j < ptslen; j++) {
      let eud = quickShortDistance(pts[i],pts[j]);
      if(maxeud < eud) {eui = i; euj = j; maxeud = eud;}
  }
  return roundDistanceInKm(pts[eui],pts[euj]);
  //Math.round(1000*distanceGreatCircleInKm2(pts[eui],pts[euj]))/1000;  //to the meter
}


/*
function validateConnectionsUIC(features) {
    const sameUicToFeatures = new Map();
    //dumpLOG = "validateConnectionsUIC";
    features.forEach(f => {
        const fp = f.properties;
        const keyuic = fp.uic;
        if(!keyuic) return; // skip features without uic
        // if uic exists, it's an alt key, hence must be consistent across features
        const key = fp.id; // always exists (already checked)
        if (!sameUicToFeatures.has(keyuic)) sameUicToFeatures.set(keyuic, []);
        // no need to use geometry, push fp only
        sameUicToFeatures.get(keyuic).push(fp);
        const sameuic = sameUicToFeatures.get(keyuic);
        if(sameuic.length > 1) { // as soon as we have two features with same uic, check immediately 
           if(sameuic.filter(fp => fp.id !== key).length > 1)
            throw Error(`Connection ${keyuic} has multiple features with differing ids: ${sameuic.map(fp => fp.id).join(', ')}`);
        }
    });
      // check if uic is set for single occurences, hence useless, and if so, warn about it
    sameUicToFeatures.forEach((sameuic, k) => {
        if(sameuic.length > 1) return; // skip (uic mandatory))
        // skip UIC valid codes, UIC="Union Internationale des Chemins de fer", codes assigned to active railway stations
        if(/^\d{8}$/.test(k)) return; // skip UIC valid codes or true connections
        const fp = sameuic[0];
        // other uic codes, for testing purposes only, contain at list one alphabetic character: used at origin, terminus, border-crossing
        if(fp.line || (fp.info && fp.info.startsWith('terminus')) || fp.use.startsWith('F') || fp.use.startsWith('A')) return; // skip
        else console.warn(`Warning: UIC${sameuic.length} ${JSON.stringify(fp)} may be unnecessary`);
    });
    dumpLOG = `validateConnectionsUIC has ${sameUicToFeatures.size} unique uic values`;
    console.log(dumpLOG)
    return features;
}*/
/*
function setGroupsToLines(features, groups) {
  const validCoordinates = coords => coords && Array.isArray(coords) && coords.length === 2;
  const resetCurGroup = () => { curgroup.properties = {}; curgroup.geometry = null; };
  let curnum = null;
  let countGroups = 0;
  const curgroup = { properties: {}, type: 'Feature', geometry: null };
  features.forEach((feature, i) => {
      const fp = feature.properties;
      const coords = feature.geometry?.coordinates;
      if(!validCoordinates(coords))
          throw Error(`setGroupsToLines: Feature ${fp.id} has invalid geometry coordinates`);
      if(fp.line) {
        if(curnum !== null)
          throw Error(`setGroupsToLines: New group: ${fp.id} but previous group ${curnum} was not closed with a terminus`);
        // first feature in group: set curnum to this feature num, set line properties on group, add coordinates of this feature to the line geometry of the group
        curnum = fp.num;
        curgroup.properties = Object.assign({}, fp.line); // set line property on the group of points with the same num as this line feature
        curgroup.geometry = Object.assign({}, {type:'LineString', coordinates:[coords]}); // add first coordinates to the LineString geometry of the group
        //dumpLOG = `setGroupsToLines: Starting ${JSON.stringify(curgroup)}`;
      } else {
        // other features in group, add their coordinates to the geometry of the group
        if(fp.num !== curnum)
          throw Error(`setGroupsToLines: Feature ${fp.id} has num ${fp.num} that does not match current group num ${curnum}`);
        curgroup.geometry.coordinates.push(coords);
        //dumpLOG = `setGroupsToLines: Added point ${coords.join(', ')}`;
      }
      if(fp.info?.includes('terminus')) {
          // last feature = "terminus": update the line.length and pkf values based on the pk of this feature, and line.pk0 (or default 0 if not defined)
          if(curgroup.properties.pk0) { // if(curgroup.geometry.coordinates.pk0) {
            curgroup.properties.len = parseFloat((1000 * (fp.pk - ( curgroup.properties.pk0 || 0 ) + Number.EPSILON))/1000).toFixed(2); // add epsilon to avoid floating point issues
            curgroup.properties.pkf = fp.pk;
          } else {
            curgroup.properties.len = fp.pk; // if pk0 is not defined, use pk as length (and default pkf as well)
           }
          groups[curnum] = curgroup;
          if(countGroups%500 === 67) { console.log(`\nsetGroupsToLines_${countGroups}: Ending ${JSON.stringify(curgroup)}\n`); }
          resetCurGroup(); curnum = null; // reset curnum to null to start a new group on next line feature
          countGroups++;
        };
  });
  return false && console.log(`setGroupsToLines: Created ${Object.keys(groups).length} line groups`);
}
*/

function featuresToGeojson(metadata, ff) {
  return ({
    "type":"FeatureCollection",
    "metadata": Object.assign(metadata, {date:new Date().toLocaleDateString("en-UK", { weekday:"short", month:"short", day:"numeric"})}),
    "features": ff
  });
}
