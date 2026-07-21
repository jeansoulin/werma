/** Conversions, Metaanalysis, A-star, InfoBox, ... */
/** @module wermaUtilities */
/** The name of the module. */
const name = 'wermaUtilities';


/* dependencies */
const { getGareBelge } = require("./garesbelgesPages.js");
//const process = require('process');
const fs = require('fs');
//const path = require('path');
// dynamic import: const fetch = require('node-fetch'); // npm install node-fetch
//const Promise = require('promise'); // npm install promise
//const parseInfo = require("infobox-parser"); // npm install infobox-parser
//const geolib = require('geolib');
//const { connect } = require("http2");


/** The current log. and typical error causes */
let dumpLOG = ""; /* to be used in error messages */

module.exports = {
  name,
  dumpLOG,
  aStar,
  slugifyLite,
  slugifyTopo,
  mapifyProperty,
  mapifyPropertyHard,
  histoByProperty,
  countWithinMap,
  metaAnalysis,
  updatePK,
  distanceGreatCircleInKm,
  roundDistanceInKm,
  checkCcFrance,
  convertGares,
  convertLines,
  convertTowns,
  getLineInfoFR,
  lignifyGares,
  lignifyNormalGares,
  checkCommuneStations,
  updataGeojson,
  fileFetch,
  wikiFetchNEW,
  saveSync,
  appendSync
};



/* ------------------------------------------------------------------------ */
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const deg2rad = (deg) => deg * (Math.PI / 180);
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function distanceGreatCircleInKm2 ([lon1,lat1], [lon2, lat2]) {
    const earthRadiusKm = 6367; // km Authalic/Volumetric: 6371 km, Meridional (45°): 6367 km, Equator (0°): 6378 km
	const MathPIover180 = 0.017453292519943295; // degreesToRadians = (degrees) => degrees * Math.PI/180;
	const MathPIover360 = 0.008726646259971648; // degreesToRadians(d)/2 
	const rlat1 = MathPIover180 * lat1, rlat2 = MathPIover180 * lat2;
	const dLat = MathPIover360 * (lat2-lat1);
	const dLon = MathPIover360 * (lon2-lon1);
    const a = Math.sin(dLat)**2 + Math.sin(dLon)**2 * Math.cos(rlat1) * Math.cos(rlat2);
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
//	return earthRadiusKm * Math.acos(sLat1*sLat2 + cLat1*cLat2*cLon);
	/* London (0, 51.5) to Arlington (-77.1, 38.8) =should be= 5918.185064088764 */
//    return getDistance({ latitude:lat1, longitude:lon1 },{ latitude:lat2, longitude:lon2 });
}

function distanceGreatCircleInKm([lon1,lat1], [lon2, lat2]) {
    const earthRadiusKm = 6367; // km Authalic/Volumetric: 6371 km, Meridional (45°): 6367 km, Equator (0°): 6378 km
	const MathPIover180 = 0.017453292519943295; // degreesToRadians = (degrees) => degrees * Math.PI/180;
	const MathPIover360 = 0.008726646259971648; // degreesToRadians(d)/2 
	const rlat1 = MathPIover180 * lat1, rlat2 = MathPIover180 * lat2;
	const dLat = MathPIover360 * (lat2-lat1);
	const dLon = MathPIover360 * (lon2-lon1);
    const a = Math.sin(dLat)**2 + Math.sin(dLon)**2 * Math.cos(rlat1) * Math.cos(rlat2);
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
/* also:   earthRadiusKm * Math.acos(sLat1*sLat2 + cLat1*cLat2*cLon);
 -> London (0, 51.5) to Arlington (-77.1, 38.8) =should be= 5918.185064088764 */
}
function distanceEuclideInKm([lon1,lat1], [lon2, lat2]){
    const Rm = 6371000; // Earth's radius in meters
    const PI180th = Math.PI / 180;
    // Convert latitude and longitude from degrees to radians
    const φ1 = lat1 * PI180th;
    const φ2 = lat2 * PI180th;
    const λ1 = lon1 * PI180th;
    const λ2 = lon2 * PI180th;
    // Calculate the differences
    const Δx = Math.cos(φ2) * Math.cos(λ2) - Math.cos(φ1) * Math.cos(λ1);
    const Δy = Math.cos(φ2) * Math.sin(λ2) - Math.cos(φ1) * Math.sin(λ1);
    const Δz = Math.sin(φ2) - Math.sin(φ1);
    // Calculate the Euclidean distance (unitless)
    const chord = Math.sqrt(Δx**2 + Δy**2 + Δz**2);
    // Multiply by Earth's radius to get distance in kilometers
    return Math.round(Rm * chord)/1000; // 3 digits
}
function roundDistanceInKm(pti, ptj){
    return Math.round(1000*distanceGreatCircleInKm2(pti,ptj))/1000; //via to the meter
//    return Math.round(1000*distanceEuclideInKm(pti,ptj))/1000; //via to the meter
}
exports.roundDistanceInKm = roundDistanceInKm;


function geoDirection(ff){
	/* slope of the origin-terminus line */
	if(ff.geometry.type !== "LineString") return `no geoDirection(${ff.geometry.type})`;
	const nbc = ff.geometry.coordinates.length, pt0 = ff.geometry.coordinates[0], pt1 = ff.geometry.coordinates[nbc-1];
	const lon0 = pt0[0], lat0 = pt0[1], lon1 = pt1[0], lat1 = pt1[1];
	const cardinals = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW","N"];
	const carDirect = (x0,y0, x1,y1) => Math.round( Math.atan2((x1-x0),(y1-y0)) * (8 / Math.PI) );
	const cardIndex = (dir) => dir<0 ? dir+16 : dir;
	return cardinals[cardIndex(carDirect(lat0,lon0,lat1,lon1))];  // A VERIFIER !!
}


const typeOfFeatures = 	(ff) => {
	if(!Array.isArray(ff) || !ff[0]) throw Error("no feature in features",GENERICERROR);
	if(ff[0].geometry.type === "Point") return"gare";
	if(ff[0].geometry.type.includes("LineString")) return "line";
	if(ff[0].geometry.type.includes("Polygon")) return "town";
	else throw Error("unknown type of features",GENERICERROR); "unknown";
}
// Slugify helper (lowercase, remove accents, non-alpha replaced with space)
function slugifyTopo(str) {
    if (!str) return '';
    return str.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')    // remove diacritics
        .replace(/œ/g, 'oe')                // replace œ ligature and...
        .replace(/ß/g, 'ss').replace(/æ/g, 'ae').replace(/ĳ/g, 'ij')
        .replace(/[^a-z0-9\s-]/g, ' ')      // remove non-alpha/digit chars but keeps -
        .replaceAll("-"," ")             // remove remaining hyphens (optional)
        .replace(/\s+/g, ' ').trim();       // single inner whitespaces
}
function slugifyHard(str) {
  if (!str) return '';
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function slugifyLite(str){
    // copied then modified from an external website (?don't remember, sorry)
    str = str.replace(/^\s+|\s+$/g, '').toLowerCase(); // trim string, and make lowercase
    // Remove diacritics (accents, ñ, etc.)
    const de = "ÁÄÂÀÃÅČÇĆĎÉĚËÈÊẼĔȆÍÌÎÏŇÑÓÖÒÔÕØŘŔŠŤÚŮÜÙÛÝŸŽáäâàãåčçćďéěëèêẽĕȇíìîïňñóöòôõøðřŕšťúůüùûýÿžþÞĐđßÆa·/_,:;";
    const to = "AAAAAACCCDEEEEEEEEIIIINNOOOOOORRSTUUUUUYYZaaaaaacccdeeeeeeeeiiiinnooooooorrstuuuuuyyzbBDdBAa------";
    for (let i=0, l=de.length ; i<l ; i++) {
        str = str.replace(new RegExp(de.charAt(i), 'g'), to.charAt(i));
    }
	return str;
}
function nodeIsaGare(f){let u = f.properties.use; return u === "N" || u === "O" || u === "ON" || u === "T";}
function nodeIsaPseu(f){let u = f.properties.use; return u === "B" || u === "J" || u === "A" || u === "X" || u.includes("F");}

const updathistogram = (his, vlmo) => void (his[vlmo] = (his[vlmo]+1)||1)
function ALT_histogByDistan(ff, span = 1){
    const addToHistograM = (hh,dd) => updathistogram(hh, Math.floor(dd / span)) || void (hh.tot += dd) || void (hh.len++) || void (hh.max = Math.max(hh.max, dd));
    const hh= [];
    hh.tot = 0, hh.len = 0, hh.max = 0;
    ff.forEach((f,i) => {if(f.properties.dist) addToHistograM(hh, f.properties.dist)});
    console.log("hh ",hh.length,hh.len,hh.tot,hh.max);
    return hh;
}

/* **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** *
 * constants and helper-functions for performing a CARP dataset Meta-Analysis */
/* values-numeration for 'use'-code, various distance thresholds, error codes */
const REGULARGARES = ["O","ON","T","N"];
exports.REGULARGARES = REGULARGARES;
const BORDERNODES = ["FO","FN"];
exports.BORDERNODES = BORDERNODES;
const JUNCTIONODES = ["A","B","J","NN"];
/* --- CARP metadata for GARE and LINE 'GeoJSON'-features --- */
const GAREPROPLIST = ['id','num','pk','use','uic','end','icon','alias','info'];
const LINEPROPLIST = ['lid','num','pk0','pkf','len','use','end','alias','info','mnemo', 'pklist', 'rg_troncon'];

/* global numeric constants */
const INTERPKMX = 2.9; // distance in km
exports.INTERPKMX = INTERPKMX;
const INTERPKWEIRD = 39; // TODO: avoids case of TGV
exports.INTERPKWEIRD = INTERPKWEIRD;
const INTERPKREALLYWEIRD = 90; // TODO: specific cases?
exports.INTERPKREALLYWEIRD = INTERPKREALLYWEIRD;
const SPREADMID = 0.44; // 400 m
exports.SPREADMID = SPREADMID;
const SPREADMIN = 0.1; // 100 m
exports.SPREADMIN = SPREADMIN;
const SPREADNOT = 0.002; // 2 m = guess equal
exports.SPREADNOT = SPREADNOT;
const TENMETER = 0.01; // 10 m
exports.TENMETER = TENMETER;
const SLICESIZE = 5000; // 500 meters or 0.5 km ? TO VERIFY
const MAXHISTOLENGTH = 30;
/* global boolean constants */
let logok = true; // if true= messages before most heavy functions
const MORELOGS = true;
/** The current log. and typical error causes */
const GENERICERROR = {cause: "_"};
const METAKO = {cause: "INCOMPLETE METADATA"};
exports.METAKO = METAKO;
const NODEKO = {cause: "INCONSISTENT NODE"};
exports.NODEKO = NODEKO;
const LINEKO = {cause: "INCONSISTENT LINE"};
exports.LINEKO = LINEKO;

function dumpErrorCause(err, dump, cause = GENERICERROR){
    {if(true)
        throw Error(`${dump||""}\n${err.name}:${err.cause}:${err.message}`,cause);};
}
exports.dumpErrorCause = dumpErrorCause;

function usePkValue(pk) {
	const epsi = 0.0001; // || Number.EPSILON;
	return pk || (parseFloat(pk)===0? epsi : false);
}
exports.usePkValue = usePkValue;

function updatePK(x, text) {
	x = usePkValue(x);
	if(x == null) return undefined;
	if(isNaN(x)) {
		if(typeof x !== "string") return console.log("!??\t update PKilom???", typeof x, x) || parseFloat(x);
		x = x.replace(",",".");
		if(isNaN(x.charAt(0))) console.log(" !??\t prefixed",x,text||"");
		if(x.includes("+")) return parseFloat(x.replace("+","."));  // dd+00dx -> dd.00d
		if(x.includes("-")) {return console.log(" !??\t neg",x,text||"") || parseFloat(x.replace("-",".")) * (-1);}
	}
	return parseFloat(x);
}

/**
 * Turn an Array into a Map.
 * @param {array} ff - The array of objects.
 * @param {string | function} fprop - The property name or a function.
 * @return {Map} The Map.
 */
function mapifyProperty(ff, fprop, mmap){
    const addtomap = (mm, key, val) => mm.set(key, mm.get(key)? mm.get(key).concat([val]) : [val]);
    mmap = mmap || new Map();
    if(typeof fprop === "function") ff.forEach((f,i) =>
        void addtomap(mmap, fprop(f), f));
    else if(typeof fprop === "string") ff.forEach((f,i) =>
        void (f.properties[fprop]? addtomap(mmap, f.properties[fprop], f) : 0));  // ***** MODIF 2 CHECK *****
    return mmap;
}
function mapifyPropertyHard(ff, propName, mmap = new Map()) {
  ff.forEach (f => {
    const key = f?.properties?.[propName];
    if (key !== undefined) {
      const slug = slugifyHard(key);
      const existing = mmap.get(slug);
      if (existing) {existing.push(f);}
      else {mmap.set(slug, [f]);}
    }
  });
  return mmap;
}
exports.mapifyPropertyHard = mapifyPropertyHard;

function histogramOfmap(mmm, flag){
    const histo= []; mmm.forEach((val, key) => updathistogram(histo, val.length-1));
	if(flag) mmm.forEach((val, key) => val.length === 1? console.log(JSON.stringify(val[0])) : undefined);
	return histo;
}
function countWithinMap(mmm, key){
    return key? (mmm.get(key)?.length || 0) : mmm.size;
}
exports.countWithinMap = countWithinMap;
function normMetadata (previous, metadata, options) {
    if(!previous) throw Error(`no metadata:{type[, country, url, doc]} found!`,METAKO);
    if(!previous.type) throw Error(`no type in ${JSON.stringify(previous)}`,METAKO);
    if(!previous.country) console.warn(`no country-code in ${JSON.stringify(previous)}, may impact the sequel!`);
    if(metadata && metadata.type !== previous.type )  console.warn(`not expected type ${previous.type}`);
    return previous;
}
function OLD_histoByProperty(ff, propname, unicity, defv, modifier){
    /* @param{array} of features
     * @param{string} property name
     * @param{boolean} [unicity check] */
    //	const multip = (k,v,i) => unicity? (v>1? `${i?', ':''}{'k':"${k}",'v':${v}}` : ``) : (v? `${i?', ':''}{'k':"${k}",'v':${v}}` : `${i?', ':''}{'k':"${k}",?}`);
    const multip = (k,v,i) => unicity? (v>1? `${i?', ':''}{"${k}":${v}}` : ``) : (v? `${i?', ':''}{'k':"${k}",'v':${v}}` : `${i?', ':''}{'k':"${k}",?}`);
    const isin = (fpn,hmap) => fpn? (hmap.set(fpn, hmap.get(fpn)+1 || 1)) : undefined;
    const finalmess = (mess) => mess && "["+mess.slice(0,-1)+"}]";
    let mm = ff? (modifier? ff.reduce((s,f) => void isin(modifier(f.properties[propname]), s)||s, new Map()) : ff.reduce((s,f) => void isin(f.properties[propname], s)||s, new Map())) : null;
    let aa = Array.from(mm.entries());
    let cum = aa.reduce((s,x,i) => s + x[1], 0);
    return finalmess(mm && aa.reduce((s,x,i) => s+ multip(x[0],x[1]||defv,i), "").slice(0,6000));
}
function histoByProperty(ff, propname){
    /* @param{array} of features
     * @param{string} property name
     * @param{boolean} [unicity check] */
    //	const multip = (k,v,i) => unicity? (v>1? `${i?', ':''}{'k':"${k}",'v':${v}}` : ``) : (v? `${i?', ':''}{'k':"${k}",'v':${v}}` : `${i?', ':''}{'k':"${k}",?}`);
    const multip = (k,v,i) => v>1? `${i?', ':''}{"${k}":${v}}` : ``;
    const isin = (fpn,hmap) => fpn? (hmap.set(fpn, hmap.get(fpn)+1 || 1)) : undefined;
    const finalmess = (mess) => mess && "["+mess.slice(0,-1)+"}]";
    let mm = ff? ff.reduce((s,f) => void isin(f.properties[propname], s)||s, new Map()) : null;
    let aa = Array.from(mm.entries());
    //let cum = aa.reduce((s,x,i) => s + x[1], 0);
    return finalmess(mm && aa.reduce((s,x,i) => s+ multip(x[0], x[1], i), "").slice(0,6000));
}
exports.histoByProperty = histoByProperty;

function newFretUse(ff) {
    //replace "ON" by "O" plus "info":"[...] fret"
    const addinFretInfo = info => (info && info+" fret") || "fret";
    const addFretInInfo = fp => void (fp.use = "O") || void (fp.info = addinFretInfo(fp.info)) || fp;
    const updateFeature = f => void (f.properties = addFretInInfo(f.properties)) || f;
    return ff.map(f => f.properties.use === "ON"? updateFeature(f) : f);
}
function newEndInfo(ff) {
    const updateFeature = (f) => {
        let info = f.properties.info; // previously checked
        let lid = info.split("origin ")[1].split(" ")[0];
        let line = "lid:'"+lid+"'";
        if(info.includes("metric")) {
            line += ", gauge:1000"; info = info.replace("metric","");
        }
        if(info.includes("electric")) {
            line += ", elec:true"; info = info.replace("electric","");
        }
        line += `, pk0:${f.properties.pk}`; 
        info = info.replace("origin","").replace(lid,"").trim();
        // add pkf, length
        f.properties.info = line +""+ info;
        return f;
    };
    return ff.map(f => f.properties.end? updateFeature(f) : f);
}


/**
 * Perform the Meta-Analysis of a 'WERMA-dataset'.
 * @param {object} geoj - The dataset.
 * @return {string} the diagnostic.
 * {constant} {@link ____#dumpLOG}
 * {function} {@link ____#distanceGreatCircleInKm, aaa}
 */
function metaAnalysis(geoj){
    function analyzeGeometries(ff, type){
        const okcoordinates1 = (fc) => Array.isArray(fc) && fc.length > 1 && parseFloat(fc[0])==fc[0] && parseFloat(fc[1])==fc[1];
        const okcoordinates2 = (fc) => Array.isArray(fc) && fc.length > 0 && fc.every(okcoordinates1);
        const okcoordinates3 = (fc) => Array.isArray(fc) && fc.length > 0 && fc.every(okcoordinates2);
        const okcoordinates4 = (fc) => Array.isArray(fc) && fc.length > 0 && fc.every(okcoordinates3);
        const okpointgeometr = (fg) => fg && (fg.type==="Point" && okcoordinates1(fg.coordinates));
        const oklinegeometry = (fg) => fg && ((fg.type==="LineString" && okcoordinates2(fg.coordinates)) || (fg.type==="MultiLineString" && okcoordinates3(fg.coordinates)));
        const oktowngeometry = (fg) => fg && ((fg.type==="Polygon" && okcoordinates3(fg.coordinates)) || (fg.type==="MultiPolygon" && okcoordinates4(fg.coordinates)));
        const okevergeometry = (fg) => fg && (okpointgeometr(fg) || oklinegeometry(fg) ||
            (fg.type==="MultiPoint" && okcoordinates2(fg.coordinates)) ||
            (fg.type==="Polygon" && okcoordinates3(fg.coordinates)) ||
            (fg.type==="MultiPolygon" && okcoordinates4(fg.coordinates)));
        const geocoorControl = (nog, bad) => (
            nog.length > 0? `\n>>> >>> >>> WARNING <<< features without geometry[${nog.length}]\n` :"" +
            bad.length > 0? `\n>>> >>> >>> WARNING <<< ill-formed geometry[${bad.length}]:\n${bad.map(f => f.properties.id || f.properties.lid).join(", ")}\n` :"") || `\n-- geometries: ok`;
        // runtime:
if(logok) console.log(`run_>>> analyzeGeometries type:${type}`);
        if(type==="gare")
            return geocoorControl(ff.filter(f => !f.geometry), ff.filter(f => !okpointgeometr(f.geometry)));
        if(type==="line")
            return geocoorControl(ff.filter(f => !f.geometry), ff.filter(f => !oklinegeometry(f.geometry)));
        if(type==="town")
            return geocoorControl(ff.filter(f => !f.geometry), ff.filter(f => !oktowngeometry(f.geometry)));
    }
    function analyzeGeometry(type){
        const okcoord1 = (fc) => Array.isArray(fc) && fc.length > 1 && parseFloat(fc[0])==fc[0] && parseFloat(fc[1])==fc[1];
        const okcoord2 = (fc) => Array.isArray(fc) && fc.length > 0 && fc.every(okcoord1);
        const okcoord3 = (fc) => Array.isArray(fc) && fc.length > 0 && fc.every(okcoord2);
        const okcoord4 = (fc) => Array.isArray(fc) && fc.length > 0 && fc.every(okcoord3);
        const okgaregeo = (fg) => fg && (fg.type==="Point" && okcoord1(fg.coordinates));
        const oklinegeo = (fg) => fg && ((fg.type==="LineString" && okcoord2(fg.coordinates)) || (fg.type==="MultiLineString" && okcoord3(fg.coordinates)));
        const oktowngeo = (fg) => fg && ((fg.type==="Polygon" && okcoord3(fg.coordinates)) || (fg.type==="MultiPolygon" && okcoord4(fg.coordinates)));
        const okevergeometry = (fg) => fg && (okgaregeo(fg) || oklinegeo(fg) ||
            (fg.type==="MultiPoint" && okcoord2(fg.coordinates)) ||
            (fg.type==="Polygon" && okcoord3(fg.coordinates)) ||
            (fg.type==="MultiPolygon" && okcoord4(fg.coordinates)));
        const geoControl = (nog, bad) => (
            nog.length > 0? `\n>>> >>> >>> WARNING <<< features without geometry[${nog.length}]\n` :"" +
            bad.length > 0? `\n>>> >>> >>> WARNING <<< ill-formed geometry[${bad.length}]:\n${bad.map(f => f.properties.id || f.properties.lid).join(", ")}\n` :"") || `\n-- geometries: ok`;
        // runtime:
//if(logok) console.log(`run_>>> check Geometry:${type}`);
        const okgeom = type==="gare"? okgaregeo : (type==="line"? oklinegeo: (type==="town"? oktowngeo: null));
        if(okgeom) return ff => geoControl(ff.filter(f => !f.geometry), ff.filter(f => !okgeom(f.geometry)));
        else throw Error(`no type provided for ... ${JSON.stringify(ff[0])}`,METAKO)
    }
	function analyzeCountryCodes(ff, pays){
		const OLD_analyzeCcFrance = (fc) => {
			const inseeCodOk = c => /^\d{5}$/.test(c) || /^2A\d\d\d$/.test(c) || /^2B\d\d\d$/.test(c);
			const checkInsee = fc => {
				const fnf = fc.filter(s => !inseeCodOk(s.properties.cc));
				return `France exceptions: ${fnf.length}/${fc.length} = ` +
					`${fnf.reduce((ac,s,i) => ac + s.properties.cc+",", "")}`;
			};
			return checkInsee(fc);
		}
		const checkInsee = (ff) => {
			const ccIsOk = c => /^\d{5}$/.test(c) || /^2A\d\d\d$/.test(c) || /^2B\d\d\d$/.test(c);
            const withCC = ff => ff.filter(s => s.properties.cc);
            const compCC = ffcc => {
                const fnf = ffcc.filter(s => !ccIsOk(s.properties.cc));
    			return `France exceptions: ${fnf.length}/${ffcc.length} = ` +
					`${fnf.reduce((ac,s,i) => ac + s.properties.cc+",", "")}`;
            };
        // runtime:
if(logok) console.log(`run_>>> check CountryCodes: 87:France`);
            //let nommap = mapifyDblProp(ff.filter(f => !!f.properties.nom),"nom");
            let insmap = mapifyDblProp(ff.filter(f => !!f.properties.cc),"cc");
            const histcc = histogramOfmap(insmap);
            return `\n-- cc as INSEE-France: ${insmap.size} communes avec gare,
        .breakdown: ${histcc},
        .( ${compCC(withCC(ff))} )`; // .topo names: ${nommap.size} (different from gare name),
		};
        const hasInsee = (f) => f.properties.cc ? true : console.log(` Insee missing: ${JSON.stringify(f.properties)}`);
        ff = ff.filter(f => ["N","O","ON","T"].includes(f.properties.use) && hasInsee(f));
        switch (pays) {
            case "87": return checkCcFrance(ff); // Insee code
            case "88": return checkCcBelge(ff); // NIS code
            break;
    // TBC ...
        }
		return "";
	}
    function metaAnalyzeGare(ff, geoj){
        function checkBswitchName(ff){
            return ff
            .filter(f => f.properties.use === "B")
            .reduce((acc, f) => {
                let fp = f.properties;
                let fpid = fp.id;
                if(fpid.startsWith("VM") || fpid.startsWith("VP")) return acc;
                const fp0 = fpid.charAt(0);
                if(fp0 === "Y" || fp0 === "R") return acc;
                acc.push(`\t!:_B_switchname:${fpid}`); //console.log(`\t!:_B_switchname:${fpid}`);
                return acc;
            }, []);
        }
        const spreads = [];
        const bxgeoms = [];
        const uicoffs = [];
        const exoticX = [];
        const warnXXX = [];
        const REGULARNODES = ["O","ON","T","N","FO","FN","X",   "A"]; // REGULARGARES + F + X + A ...
        function verifyNodeConsistency(ff, pays){
            function checkunics(f) {
                const checkConnexU = (f) => {
                    if(f.properties.use==="J")
                        throw Error(`lone use=J ${JSON.stringify(f.properties)}`,NODEKO);
                    return f;
                };
                const expectingANode = (f) => REGULARNODES.includes(f.properties.use)?
                    f : console.log(`  ?BRANCH_Y(${f.properties.use}) ${JSON.stringify(f.properties)}`) || f;
                dumpLOG = "in checkunics";
                return checkConnexU(expectingANode(f));
            }
            function checkambigs(lf) {
                const sameuic = (f, uic0, lonlat0) => {
                    const samecoo = ([lon,lat],[lon0,lat0]) => lon===lon0 && lat===lat0;
                    let fp = f.properties;
                    if(fp.use === "X") return true;  // ignore "X"-pseudo-nodes
                /*  {
                        warnXXX.push(fp);
                        //console.warn("XXXXXX XXXXXX XXXXXX: ",JSON.stringify(fp));
                        if(!samecoo(f.geometry.coordinates, lonlat0))
                            throw Error(`X dups: !=Point ${fp.id}`,NODEKO);
                        return true; // ignore "X"-pseudo-nodes
                    }*/
                    const uic = fp.uic;
                    if(!uic || uic === "*") throw Error(`bad uic/${uic0} ${JSON.stringify(fp)}`,NODEKO);
                    if(uic !== uic0) throw Error(`uic ambiguity: ${uic0} != ${JSON.stringify(fp)}`,NODEKO);
                    return true;
                };
                dumpLOG = "in checkambigs";
                lf.forEach(f => sameuic(f,lf[0].properties.uic,lf[0].geometry.coordinates));
                return true;
            }
            function checkduples(lf) {
                const maximDistance = (pts) => {
                    // preserves distances order, doesn't compute km: use it to sort
                    const quickShortDistance = ([x1,y1], [x2, y2]) => (x2 - x1)**2 + (y2 - y1)**2;
                    const ptslen = pts.length; let maxeud = 0, eui = 0, euj = 0;
                    for (let i = 0; i < ptslen; i++) for (let j = i + 1; j < ptslen; j++) {
                        let eud = quickShortDistance(pts[i],pts[j]);
                        if(maxeud < eud) {eui = i; euj = j; maxeud = eud;}
                    }
                    return roundDistanceInKm(pts[eui],pts[euj]); //to the meter
                };
                const checkConsist = (lf,id0) => {
                    const samenid = (f, id0) => {
                        if(f.properties.id !== id0) throw Error(`dup uic with id != ${id0}`,NODEKO);
                        else return f;
                    };
                //    if(lf.every(f => samenid(f, id0))) return lf;
                    return lf.map(f => samenid(f, id0));
                };
                const checkConnexM = (lf) => {
                    const infoKProperty = (use, lflen, maxd) => `${use}:${lflen}`+(maxd<TENMETER?``:`:${maxd}`);
                    const informFeature = (f, use, lflen, maxd) =>
                        void (f.properties.use !== "J" ? f.properties.k = infoKProperty(use, lflen, maxd) : 0) || f;
                    const checkSpread = (lf, flead) => {
                        const checkNodeX = (fp, maxd, ceiling) => {
                            if(maxd > ceiling) throw Error(`X dups must=Point.coords ${fp.id}`,NODEKO);
                            return maxd;
                        };
                        const spreadTest = (fp, maxd, ceiling, prefix, targetArray) => {
                            if(maxd > ceiling)
                                targetArray.push(`${prefix}${ceiling}=${maxd}\t ${JSON.stringify(fp,["num","pk","use","id","uic"])}`);
                            return maxd;
                        };
                        const maxd = maximDistance(lf.map(f => f.geometry.coordinates));
                        const flp = flead.properties;
                        if(flp.use === "X") return checkNodeX(flp, maxd, SPREADNOT); // pseudo nodes
                        if(flp.use === "B")
                            return spreadTest(flp, maxd, SPREADMIN, "\t_BJgeom>", bxgeoms); // branch nodes
                        else
                            return spreadTest(flp, maxd, SPREADMID, "\t_SPREAD>", spreads); // any dup node
                    };
                    //
                    dumpLOG = "in checkConnexM";
                    if(lf.filter(f => f.properties.use==="J").length !== lf.length-1)
                        throw Error(`bad#of use=J ${lf[0].properties.id}`,NODEKO);
                    const flead = lf.find(f => f.properties.use!=="J");
                    let leadPrp = flead.properties;
                    let leadUse = leadPrp.use;
                    const maxd = checkSpread(lf, flead);
                    if(!(["O","N","ON","T","B","X"].includes(leadUse))){
                /*        if(leadUse === "X") exoticX.push(leadPrp);
                        else console.log(` .EXOTIC_DUP(${leadUse}) ${JSON.stringify(leadPrp)}`);*/
                        console.log(` .EXOTIC_DUP(${leadUse}) ${JSON.stringify(leadPrp)}`);
                    }
                    lf = lf.map(f => informFeature(f, leadUse, lf.length, maxd));
                    return lf;
                };
                //runtime: check variants consistency + eachother distances
                return checkConnexM(checkConsist(lf, lf[0].properties.id));
            }
/*            const selectUseless = (fp, pays) => (fp.uic && fp.uic.startsWith(pays)) && isNaN(fp.uic) &&
                (!fp.info?.includes("terminus") && !fp.info?.includes("origin") && !fp.info?.includes("+"));
            const uselessUIc = (fp, pays) => REGULARGARES.includes(fp.use) && selectUseless(fp,pays) ?
                uicoffs.push(`\t°UIC-- ${JSON.stringify(fp)}`) : void 0;
/*            const gAbroad = (fp, pays) => !fp.use.includes("F") && (fp.uic && !fp.uic.startsWith(pays));
            const ggCount = (mmm,uses) => uses.reduce((acc,key,i,t) => acc + countWithinMap(mmm, key), 0);*/
        // runtime :
            let log = "\nrun_>>> check Nodes"; // Node Consistency: id/uic/use combi, dups are-ok...
            const libmap = mapifyPropertyHard(ff,"id");
            libmap.forEach(lf => lf.length < 2? checkunics(lf[0]) : checkambigs(lf));
            const uicmap = mapifyProperty(ff,"uic");
            uicmap.forEach(lf => lf.length < 2? void 0 : checkduples(lf));
            dumpLOG += log;
/*            uicmap.forEach(lf => lf.length < 2? uselessUIc(lf[0].properties, pays) : checkduples(lf));
/*            const njunct = [...uicmap].filter(([k, v]) => v.length > 1).length;
            const usemap = mapifyProperty(ff,"use");
            const nummap = mapifyProperty(ff,"num");
            if(exoticX.length) exoticX.forEach(fp => console.log(` .EXOTIC_DUP_X ${JSON.stringify(fp)}`));
            if(warnXXX.length) warnXXX.forEach(fp => console.log(`XXXXXX XXXXXX: ${JSON.stringify(fp)}`));*/
//            log += `
//${exoticX.join("\n") || "-exoticX-ok"}
//${warnXXX.join("\n") || "-warnXXX-ok"}
            log += `
${spreads.join("\n") || "-spread-ok"}
${bxgeoms.join("\n") || "-junxs-ok"}
${checkBswitchName(ff).join("\n") || "-BswitchName-ok"}
`;
            return log;
        }
        function nodeCheckUp(ff, pays){
            const selectUseless = (fp, pays) => isNaN(fp.uic) &&
                (!fp.line && !fp.info?.includes("terminus") && !fp.info?.includes("origin") && !fp.info?.includes("+"));
            const uselessUIc = (fp, pays) => REGULARGARES.includes(fp.use) && selectUseless(fp,pays) ?
                uicoffs.push(`\t°UIC-- ${JSON.stringify(fp,["num","pk","use","id","uic"])}`) : void 0;
            const gAbroad = (fp, pays) => !fp.use.includes("F") && (fp.uic && !fp.uic.startsWith(pays));
            const ggCount = (mmm,uses) => uses.reduce((acc,key,i,t) => acc + countWithinMap(mmm, key), 0);
            //run
            dumpLOG = "in nodeCheckUp";
            const usemap = mapifyProperty(ff,"use");
            const uicmap = mapifyProperty(ff,"uic");
            uicmap.forEach(lf => lf.length < 2? uselessUIc(lf[0].properties, pays) : void 0);
            const njunct = [...uicmap].filter(([k, v]) => v.length > 1).length;
            return `
run_>>> nodeCheckUp
${uicoffs.join("\n") || "-uic-ok"}
-- ${usemap.size} use:${histoByProperty(ff, "use", true)}
   gares(unique): ${ggCount(usemap,REGULARGARES)}, junctions: ${njunct}, border-Xing: ${ggCount(usemap,BORDERNODES)}, abroad: ${ff.filter(f => gAbroad(f.properties, pays)).length}
${analyzeCountryCodes(ff, pays)}
`;
        }
        function verifyLineConsistency(ff) {
            const pktgvs = [];
            function checkByLine(ff,num) {
                const check_lineorig = (fp) => {
                    if(fp.line) return fp;  // V4 dataset
                    if(!fp.end)
                        throw Error(`LINE ORIGIN : no END property ${JSON.stringify(fp)}`,LINEKO);
                    if(fp.end == 1111) console.log(` UnKnown_END:${fp.num}`);
                    if(!fp.info?.includes("origin") && !fp.end.includes("orig:"))
                        throw Error(`no LINE ORIGIN data ${JSON.stringify(fp)}`,LINEKO);
                    if(fp.info?.includes("terminus") || fp.end.includes("terminus"))
                        throw Error(`EXTRA TERMINUS in ORIGIN ${JSON.stringify(fp)}`,LINEKO);
//                    if(fp.info?.includes("origin") && !fp.end.includes("orig:")) fp = updateEndInfo(fp);
                    return fp;
                };
                const check_lineterm = (fp) => {
                    if(!fp.info || !fp.info.includes("termin"))
                        throw Error(`NO LINE TERMINUS ${JSON.stringify(fp)}`,LINEKO);
                    if(fp.line || fp.end || fp.info.includes("orig"))
                        throw Error(`EXTRA ORIGIN or END ${JSON.stringify(fp)}`,LINEKO);
                    return fp;
                };
                const check_lininner = (fp, num) => {
                    if(fp.num !== num) throw Error(`Line ${num} mix-messing ${JSON.stringify(fp)}`,LINEKO);
                    if(fp.line || fp.info?.includes("origin")) throw Error(`EXTRA ORIGIN ${JSON.stringify(fp)}`,LINEKO);
                    if(fp.info?.includes("terminus")) throw Error(`EXTRA TERMINUS ${JSON.stringify(fp)}`,LINEKO);
                    if(fp.end) throw Error(`EXTRA END ${JSON.stringify(fp)}`,LINEKO);
                    return fp;
                };    
                const check_pkVSdist = (f,fprev) => {
                    const toMeter = (pk) => Math.round(1000*parseFloat(pk));
                    const dg = roundDistanceInKm(f.geometry.coordinates, fprev.geometry.coordinates);
                    if(dg < Math.EPSILON)
                        throw Error(`PK geo ${dg} overlap: ${JSON.stringify(f.properties)}`,LINEKO);
                    if(dg > INTERPKREALLYWEIRD)  // && !(fprev.properties.id.includes("GV")||f.properties.id.includes("GV")))
                        throw Error(`PK geo ${dg} REALLY off limits: ${JSON.stringify(f.properties)}`,LINEKO);                        
                    if(dg > INTERPKWEIRD){
                        if(fprev.properties.id.includes("GV")||f.properties.id.includes("GV")){
                            f.properties.dg = dg;
                            pktgvs.push(f.properties)
                            //console.log(` _PK TGV ^^^ geo ${dg} off limits: ${JSON.stringify(f.properties)}`);
                        }
                        else throw Error(`PK regular geo ${dg} off limits: ${JSON.stringify(f.properties)}`,LINEKO);
                    }
                    dumpLOG = "in check_pkVSdist";
                    const dp = Math.round(toMeter(f.properties.pk) - toMeter(fprev.properties.pk))/1000;
                    let diffdpdg = Math.abs(dp - dg);
                    if(diffdpdg > 4*dg && diffdpdg > INTERPKMX)
                        console.log(` _INTERPK>${INTERPKMX} ${(dp-dg).toFixed(2)}=${dg}-${dp} ${JSON.stringify(f.properties,["num","pk","use","id","uic"])}`);
                    return;
                };
                const check_linerank = (f, fprev) => {
                    if(f.properties.pk <= fprev.properties.pk)
                        throw Error(`PK order: ${JSON.stringify(f.properties)}`,LINEKO);
                    return check_pkVSdist(f,fprev);
    /*
                    const toMeter = (pk) => Math.round(1000*parseFloat(pk));
                    const warnPk = (dp,dg) =>
                        dg < Math.EPSILON || (Math.abs(dp - dg) > 4*dg && Math.abs(dp - dg) > INTERPKMX);
                    const dp = Math.round(toMeter(f.properties.pk) - toMeter(fprev.properties.pk))/1000;
                    const dg = roundDistanceInKm(f.geometry.coordinates, fprev.geometry.coordinates);
                    let log = "";
                    if(warnPk(dp, dg))
                        log = `\nDPK>${INTERPKMX} ${(dp-dg).toFixed(2)} = ${dg.toFixed(2)} -${dp} ${JSON.stringify(f.properties)}`;
                    return; */
                };
                dumpLOG = "in checkByLine";
                let ik = ff.findIndex(f => f.properties.num === num);
                let jk = ff.findLastIndex(f => f.properties.num === num);
                const lineofk = ff.filter(f => f.properties.num === num);
                let linlen = lineofk.length;
                if(ik < 0 || jk <= ik || linlen < 2 || (ik + linlen-1) !== jk)
                    throw Error(`checkByLine ${num}: ${ik}-${jk} ${linlen}`,LINEKO);
                dumpLOG = "before check_lineorig";
                check_lineorig(ff[ik].properties);
                dumpLOG = "before check_lineterm";
                check_lineterm(ff[jk].properties);
                if(linlen > 2){
                    dumpLOG = "before check_lininner";
                    lineofk.slice(1,-1).forEach(f => check_lininner(f.properties, num));
                }
                dumpLOG = "before check_linerank";
                lineofk.forEach((f,i,t) => i? check_linerank(f,t[i-1]) : void 0);
                // lineofk is ok and can be used to lignifying gares
                return lineofk;
            }
            // runtime : Line Consistency: no num intermix, ok pk order, ok origin-termin ...
            dumpLOG = "starting verifyLineConsistency";
            let log = "";
            const setOfNums = new Set(ff.map(f => f.properties.num));
            dumpLOG = `setOfNums ${setOfNums.size}`;
            setOfNums.forEach((v,num,s) => checkByLine(ff,num));
            if(pktgvs.length) pktgvs.forEach(lp => log += `\n\t_PK along TGV>${INTERPKWEIRD}: ${lp.dg} km: ${JSON.stringify(lp,["num","pk","use","id","uic"])}`);
            return `run_>>> check Lines[${setOfNums.size}]` + log;
        }
		function guessCountryCode(geoj){
			let code = geoj.metadata.country;
			if(!code) throw Error(`no country-code ${JSON.stringify(geoj.metadata)}`,METAKO);
			return code;
		}
		try {
            const pays = guessCountryCode(geoj);
            dumpLOG  = analyzeGeometry("gare")(ff);
            dumpLOG += verifyNodeConsistency(ff); //, pays);
            dumpLOG += verifyLineConsistency(ff);
//            dumpLOG += verifyLineConnectivity(ff);
            dumpLOG += nodeCheckUp(ff, pays);
//            dumpLOG += analyzeCountryCodes(ff, pays);    
        } catch (e) {dumpErrorCause(e, dumpLOG);}
        return dumpLOG;
    }
    function metaAnalyzeLine(ff){
        function analyzeNUM_PK(ff){
            const printHistoByDi = (hh) => hh.length < MAXHISTOLENGTH? `${hh.reduce((ac,h,i) => ac + (i? ","+h:""+h||"0"),"")}` : (void (hh.length = MAXHISTOLENGTH) || `${hh}  ...`);
            const logDistance_VW = (v,w) => (v.geometry&&w.geometry && v.geometry.type==="Point")? ` ${Math.round(1000*distanceGreatCircleInKm(v.geometry.coordinates, w.geometry.coordinates))/1000}km `:" - ";
            const printAmbiguity = (v,w) => JSON.stringify(v.properties,["id","lid","num","pk","pk0"]) + logDistance_VW(v,w) + JSON.stringify(w.properties,["nom","use","pkf","uic"]);
                    const sameEverything = (dups, val) => dups.push(`[${val.length}]:${printAmbiguity(val[0],val[1])}`);
            const probableDuplis = (mmm) => {const dups = []; mmm.forEach((val,key) => val.length > 1? sameEverything(dups, val) : undefined); return dups;};
                    const betweenpkprop = (fp) => [(fp.pk != null? "pk" : "pk0"),"num"].reduce((cum,x,i) => cum+(i?"_":"")+fp[x], "");
            const nummap = mapifyProperty(ff,"num");
            const histo = histogramOfmap(nummap);
            let log = `\n-- count Node/Line of ${nummap.size} line_codes: num[${histo.length}]: ${printHistoByDi(histo)}`;
    if(logok) console.log(`run_>>> analyzeNUM_PK: ${nummap.size} 'num'`);
            if(!ff[0].properties.pk0) return log;
            const pkfnum = mapifyProperty(ff, f => betweenpkprop(f.properties));
            const dupk = probableDuplis(pkfnum);
                log += `\n\t-- ${pkfnum.size} 'pk-num' couples`;
                log += dupk.length? `, duppk: ${dupk.length}\n${dupk}\n\t`: ", all pk-num are different";
            return log;
        }
        function analyzeENDATE(ff){
			const cumulatesKm = (arr) => arr.reduce((acc,f) => acc + f.properties.len, 0);
			const listofyears = (mmap) => {
				const years = [];
				mmap.forEach((arr,k) => years.push({"y":k,"n":arr.length,"km":parseInt(cumulatesKm(arr))}));
				return years.sort((a,b) => a.y - b.y);
			}
	        ff = ff.map(f => f.properties.end === "??"? (void (f.properties.end = "1111") || f) : (f.properties.end === "no"? (void (f.properties.end = "2222") || f) : f));
			return JSON.stringify(listofyears(mapifyProperty(ff, "end")));
		}
        try {dumpLOG += analyzeGeometries(ff,"line");} catch (e) {dumpErrorCause(e, dumpLOG);}
        try {dumpLOG += analyzeNUM_PK(ff);} catch (e) {dumpErrorCause(e, dumpLOG);}
        try {dumpLOG += analyzeENDATE(ff);} catch (e) {dumpErrorCause(e, dumpLOG);}
	//		log += `\n-- analyzing ENDATE:\t${analyzeENDATE(ff)}`;
	//		log += `\n-- overall geo direction:\t${geoDirection(ff)}`;
        return dumpLOG;
    }
    function metaAnalyzeTown(ff){
		let log  = `\n-- geocoorControl:\t${geocoorControl(ff.filter(f => !f.geometry), ff.filter(f => !oktowngeometry(f.geometry)))}`;
			log += "\n-- analyzing nom-insee: " + analyzeCountryCodes(ff);
        return log;
    }
    function geoJsonCheck(geoj){
        function countProperties(ff){
            const goodProp = (k,v) => isNaN(k) && k !== "properties" && k !== "type" && k !== "geometry" && k !== "coordinates" && typeof v != "object";
            const goodGeom = (k) => k === "coordinates";
            const cumulVal = (goodie,card) => (k,v) => (goodie(k) && ((card)[k] = card[k] + 1 || 1), v);
            const kalKount = (ff,inf) => void (JSON.stringify(ff, cumulVal(goodProp,inf.P)) + JSON.stringify(ff, cumulVal(goodGeom,inf.G))) || inf;
            return kalKount(ff, {"P":{}, "G":{}});
        }

        const addprop = (prop,i,msize) => msize? `${i?", ":""}'${prop}':${msize}` : "";
        const mapifiedSchema = (ff) => GAREPROPLIST.reduce((acc,x,i) => acc + addprop(x,i,mapifyProperty(ff,x).size), "");
        //run
        if (!geoj) throw new Error(`\n!?? metaAnalysis >>>> ERROR: no dataset`,METAKO);
        const ff = geoj.features;
        if (!ff) throw new Error(`\n!?? metaAnalysis >>>> ERROR: no features`,METAKO);
        const md = normMetadata(geoj.metadata);
        if(md.type !== typeOfFeatures(ff)) throw Error(`incompatible type:${md.type} of metadata.vs.features`, GENERICERROR);
        let datasetname = md.url || (md.doc?.trim()) || "output";
        //dumpLOG += "run_>>> geoJsonCheck";
        let log = `
run_>>> geoJsonCheck "${md.type}":${datasetname}[${ff.length}]}
-- schema: ${JSON.stringify(countProperties(ff))}
   mapsch: ${mapifiedSchema(ff)}
`;
        return log;
    }
    const metaAnalysisRroceed = (geoj, tof, ff) =>
        (tof==="gare"? metaAnalyzeGare(ff, geoj) :
        (tof==="line"? metaAnalyzeLine(ff) :
        (tof==="town"? metaAnalyzeTown(ff) : "\n!??\t no meta-analysis")));
    const truncateString = (x,n) => (x.length < 2*n? x : `${x.slice(0,n)}\n\t[...${x.length}...]\n${x.slice(-n)}`);
        // run
if(logok) console.log(`run_>>> metanalysis`);
    let log = geoJsonCheck(geoj);
        log += metaAnalysisRroceed(geoj, geoj.metadata.type, geoj.features);
		log += typeof EXCERPT !== "undefined"? `\n...EXCERPT:\n${truncateString(JSON.stringify(ff), 1000)}\n` : "";
    return log;
}

/* **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** *\
 * Country Dependant functions
 * Insee code or equivalent ("cc" for France), should be attributed
	to "railway-station-nodes" (ie.: "use" is "O","N", or "T" - not "J","X")	
*/
function mapifyDblProp(ff, fprop, mmap){
    const addtomap = (mm, key, val) => mm.set(key, mm.get(key)? mm.get(key).concat([val]) : [val]);
    mmap = mmap || new Map();
    const fpro2 = fprop+"2";
    ff.forEach(f =>{
        if(f.properties[fprop]){
            addtomap(mmap, f.properties[fprop], f);
            if(f.properties[fpro2]){
                addtomap(mmap, f.properties[fpro2], f);
            }
        }
    });
    return mmap;
}
function checkCcFrance (ff) {
    const ccIsOk = c => /^\d{5}$/.test(c) || /^2A\d\d\d$/.test(c) || /^2B\d\d\d$/.test(c);
    const withCC = ff => ff.filter(s => s.properties.cc);
    const okffcc = ffcc => ffcc.filter(s => !ccIsOk(s.properties.cc));
    const compCC = ffcc => {
        const fnf = ffcc.filter(s => !ccIsOk(s.properties.cc)).map(s => s.properties.cc);
        return `${fnf.length}/${ffcc.length} = [${[...new Set(fnf)].join()}]`;
    };
    let insmap = mapifyDblProp(ff.filter(f => !!f.properties.cc),"cc");
    return `   INSEE (87:France) communes: ${insmap.size} avec gare, +not Insee: ${compCC(withCC(ff))}
        .breakdown: ${histogramOfmap(insmap)}
`;
}
function checkCcBelge (ff) {
if(logok) console.log(`run_>>> analyzeCountryCodes with:88:Belgium`);
    return `\n-- checkCcBelge as NIS: no cc data yet`;
}





/* CONVERSION STUFF */
function updataGeojson({type, metadata, features, ...rest}, nufeat, numeta = {}){
    if(!metadata) throw new Error('no metadata found in updata Geojson!',METAKO);
	let doc = (rest?.doc)? ((numeta.doc? (numeta.doc+" ") : "") + rest.doc) : (numeta.doc||"");
    metadata.doc = doc ? ((metadata.doc&&(metadata.doc+" ")) + doc) : (metadata.doc||"");
    metadata.year = metadata.year +":"+ (new Date()).toDateString().slice(4);
	return ({type, "metadata":Object.assign({}, numeta, rest, metadata), "features":nufeat});
}
const LOGOK = false;
function convertPropG ({
    num,pk, use, id,uic, nom,cc,nom2,cc2,nom3,cc3, info,
    end, line, //should be exclusive ('end' becoming a property of 'line')
    af,ct,mc,mci,sb,wd,we,wf,wi,wn, ff, http,https,
    insee,k,
    DEPT,DEBUT_RESEAU,
     ...rest} = {}) {
    if(Object.keys(rest).length > 0) {
        if(LOGOK) console.log(`there is a rest with id=${id}:${JSON.stringify(rest)}`);
        // e.g.: libel,alias, icon, nat,frevoy,
    }
    return ({
        // optional intermediate information: may help 'group-by' operation
        ...(DEBUT_RESEAU&&{DEBUT_RESEAU}), ...(DEPT&&{DEPT}),
        // MANDATORY string: line number or code; used to sort the lines (alpha)
        num,
        // MANDATORY number: approx kilometer rank of feature, used to sort it in the 'num' line,
        'pk':Math.round(100 * updatePK(usePkValue(pk), id))/100, // rounded to 2 digits
        // MANDATORY string (or explicit 'unknown') among ['O','N','ON','T','FN','FO', 'A','B','J', 'X']
        'use':use||"unknown", // constraints apply for 'replicated' features ...||nat||frevoy
        // MANDATORY string: identifies the feature, and possibly its replicates
        id, // constraints apply for replicates ... 'id':id||libel
        // optional string = UIC international given code (main stations) | 'num'-'pk' combination (duplicates the constraints)
        ...(uic && uic!=="*" && {uic}), // useless for single'occurence (unreplicated) features
        // optional string low-level locality (eg: commune, dorp, parish, city or town ...)
        ...(nom&&(nom!=id)&&{nom}), ...(nom2&&(nom2!=id)&&{nom2}),
        // optional string : official code (if any) for that locality
        ...((cc||insee)&&{'cc':cc||insee[0]}), ...((cc2||insee)&&{'cc2':cc2||insee[1]}),
        // MANDATORY string for the first and last feature, optional elsewhere
        ...(!end && line && {"line":line}), // first may have 'line' instead of 'orig', + optional line data (gauge, electric ...)
        ...(info&&{info}), // last must have 'term', first must have 'orig' + optional line data (gauge, electric ...)
        // MANDATORY string for the first feature -then date for the entire line-, optional elsewhere -gare only-
        ...(end&&{end}), // list of closing year (startswith '/d/d/d/d') or in ['o','n'] open/no. Default 'no'
        // more options: link to doc or picture, alias name (older, bilingual, ...), ...
        ...(http && {'http':"http://"+http}), ...(https && {'https':"https://"+https}),
        ...(af&&{af}), ...(ct&&{ct}), ...(ff&&{ff}), ...(mc&&{mc}), ...(mci&&{mci}), ...(sb&&{sb}), ...(wd&&{wd}), ...(we&&{we}), ...(wf&&{wf}), ...(wi&&{wi}), ...(wn&&{wn}), ...(rest.if&&{'if':rest.if})
    }); // preferably within 'info' as 'img:icon_name'
}


function pkfloat(x, txt){
	return Math.round(100 * updatePK(usePkValue(x), txt))/100;
}
function convert_Geom(geom){
	const new_Decimals = (x) => Math.round(100000 * x)/100000; // to choose: how many decimals
	const newDcForLoLa = ([x,y]) => ([new_Decimals(x), new_Decimals(y)]);
	const coords_OkPts = (cc) => (Array.isArray(cc) && cc.length===2);
	const coords_OkLst = (cc) => (Array.isArray(cc) && coords_OkPts(cc[0]) && cc.length > 1);
	const coords_OkMLS = (cc) => (Array.isArray(cc) && coords_OkLst(cc[0]));		
	const neuegeometry = (cc) => ({'type':geom.type, 'coordinates':cc});
	const skipextrapts = (zip, f, i, t) => {
		const incremnt = (ac, newz) => void ac.push(newz) || ac;
		const enlength = (curz, newz) => void curz.pop() || curz.concat(newz);
		const updatcur = (ac, newz) => void (ac[ac.length-1] = enlength(ac[ac.length-1], newz)) || ac;
		const last2first = (c1,c2) => c1[0] === c2[0] && c1[1] === c2[1];
		return (zip.length === 0 || !last2first(zip[zip.length -1][zip[zip.length -1].length - 1], f[0])) ?
			incremnt(zip, f) : updatcur(zip, f);
	}
	function compressMulti(coo){
		const zipcoo = coo.reduce((ac, f, i, t) => skipextrapts(ac, f, i, t), []);
		console.log("compressMulti", coo.length, zipcoo.length);
		return coords_OkMLS(zipcoo)?
			neuegeometry(zipcoo) : geom;
		//	neuegeometry(zipcoo.map(ln => ln.map(pt => newDcForLoLa(pt)))) : geom;
	}
	switch(geom && geom.type){
		case "Point": return coords_OkPts(geom.coordinates)?
				neuegeometry(newDcForLoLa(geom.coordinates)) : geom;
		case "LineString": return coords_OkLst(geom.coordinates)?
				neuegeometry(geom.coordinates.map((pt,i) => newDcForLoLa(pt))) : geom;
		case "MultiLineString": return coords_OkMLS(geom.coordinates)?
                compressMulti(geom.coordinates) : geom;
		default:
	}
	return geom; // doesn't make any conversion
}
function convertGares(geoj, specif, suffix = "geojson"){
/* geojson format feature-by-feature conversion:
 * @param{object} should at least contain "type":"FeatureCollection" and "features":{...} made of
 *   geojson standard feature {properties:{},type:"Feature",geometry:{type,coordinates}}
 *   with "properties": {num, pk, id|libel, uic, use|nat|frevoy, [nom, cc|insee ,info, DEBUT_RESEAU, DEPT]}
 * !: num, pk, are mandatory!
 * @returns{object} converted with fiveDecimals coordinates and normalized properties
*/
    const convertGboth = ({properties, type, geometry}) =>
        ({"properties":convertPropG(properties), type, "geometry":convert_Geom(geometry)});
    const sortByNumOfLignes = (a, b) => (a.properties.num - b.properties.num);
    function supplyUIC(uic, countryUIC, num, pk){
		const shortNum = (num) =>
			(num.charAt() === "_")? num.slice(1) :
			(num.slice(3,6) === "000"? num.slice(0,3) :
			 num);
		// check and replace wildcard
		return (!uic || uic.charAt(0) === "*") ? countryUIC+shortNum(num)+"+"+parseInt(10*usePkValue(pk)) : uic;
	}
	function cleanupUICandUSE(f){
		if(f.properties.uic && f.properties.uic.includes("+")) delete f.properties.uic;
		return f;
	}
    function OLD_convertGboth ({properties, type, geometry}){
            const OLD_convertPropG = ({DEPT,DEBUT_RESEAU,id,libel, alias, uic, num,pk, use,nat,frevoy, nom, cc,insee, icon, info,end} = {}) =>
            ({	...(DEBUT_RESEAU&&{DEBUT_RESEAU}), ...(DEPT&&{DEPT}),
                num,
                'pk':Math.round(100 * updatePK(usePkValue(pk), id))/100,
                'use':use||nat||frevoy||undefined,
                'id':id||libel,
        //        'uic':supplyUIC(uic, geoj.metadata.country, num, pk), // check if wildcard? // ***** MODIF 2 CHECK *****
                ...(uic && uic!=="*" && {uic}),      // ***** MODIF 2 CHECK *****
                ...(nom&&(nom!=id)&&{nom}),
                ...((cc||insee)&&{'cc':cc||insee}),
                ...(alias&&{alias}), ...(icon&&{icon}),
                ...(info&&{info}), ...(end&&{end})});
        return ({"properties":convertPropG(properties), type, "geometry":convert_Geom(geometry)});
//	const convertGboth = ({properties, type, geometry}) => ({"properties":convertPropG(properties), type, "geometry":convert_Geom(geometry)});
    }
	function update_Info(f) {
        const aliasId = fp => (fp.info?.split("a:")[1]?.split(" ")[0]) || "";
        if(f.properties.use === "J" || f.properties.use === "B" || f.properties.use === "A" || f.properties.use === "X")
            return f;
        let slugid = slugifyLite(f.properties.id.toLowerCase());
        let slugal = slugifyLite(aliasId(f.properties).toLowerCase());
        let prepto = getGareBelge(slugid) || getGareBelge(slugal);
        if(prepto){
            f.properties.info = f.properties.info? (f.properties.info + prepto) : prepto;
if(false && MORELOGS) console.log(f.properties.id,"=", f.properties.info);
        }
        return f;
    }
    const sortByNum_Pk = (fpa, fpb) => fpa.num.localeCompare(fpb.num) || (fpa.pk0 - fpb.pk0);
    function postprocessGares(ff){
        return ff;
    }
	// constants + run
if(logok) console.log("run_>>> convertGares");
    geoj.metadata = normMetadata(geoj.metadata, {"type":"gare"});
	const convertedfeatures = geoj.features.map(convertGboth)
                                .sort(sortByNumOfLignes);
    dumpLOG = metaAnalysis(updataGeojson(geoj, convertedfeatures));
	console.log(dumpLOG);
	let finalfeatures = convertedfeatures;
	let pays = geoj.metadata.country;
	if(pays == 88) // Belgique
		finalfeatures = finalfeatures.map(f => update_Info(f));
	finalfeatures = finalfeatures.map(f => cleanupUICandUSE(f));
	console.log("===bGares>", finalfeatures.filter(f => f.properties.info?.includes('gb:')).length);
	const convertedGeojson = updataGeojson(geoj, finalfeatures);
	return convertedGeojson;
}

function lignifyGares(ff, lineInfo){
	const listNums_FromGares = (ff) => Array.from(mapifyProperty(ff,"num").entries()).map(x => x[0]).sort();
	function linofCarpNumSet(list){
        function firstpoint(acc, f, i, t, country){
			const buildelect = (num, info) => {
				let elect = "FR" || undefined; // French dependant patch
				if(elect !== "FR") return undefined;
                if(num.startsWith("B")) num = num.slice(1); // removing initial "B" (Belgium)
				elect = undefined; // default unless explicit below:
				if(isNaN(num)) elect = 0; // sub default unless explicit below:
				if(info?.includes("elect")) elect = 1;
				return elect;
			};
			const buildgauge = (num, info) => {
                const getgauge = info => info.split(" g:")[1].split(" ")[0];
				let gauge = "FR" || undefined; // French dependant patch
				if(!gauge) return undefined;
				if(num.startsWith("B")) num = num.slice(1); // removing initial "B" (Belgium)
				gauge = isNaN(num) ? 1000 : 1435; // default unless explicit below:
				if(info?.includes(" g:")) return getgauge(info); // milliimeters
				if(info?.includes("metric")) gauge = 1000; // millimeters
				if(info?.includes("metric:110")) gauge = 1100;
				if(info?.includes("normal")) gauge = 1435;
				if(info?.includes("0,90") || info?.includes("0.9")) console.log(" ecartement special 900 mm",num,info);
				return gauge;
			};
			const buildlinid = (info) => {
				// uses conditional chaining (Safari non compliant)
				return info.includes("origin:")?
					info.split("origin:")[1]?.trim().split(" ")[0] :
					(info.includes("origine ")?
						info.split("origine ")[1]?.trim().split(" ")[0] :
						info.split("origin ")[1]?.trim().split(" ")[0]
					);
			};
			const thisend_ok = (end) => end.startsWith("no") || end === "EXP" || end === "VS" || end === "NEUT";
			const thisuse_ok = (use) => use === "EXP" || use === "VS" || use === "NEUT";
			const buildliend = (end) => end.match(/\d\d\d\d/g)?.sort().reverse()[0] || "??";
			const buildmnemo = (end) => (end.startsWith("no")? "EXP" : (thisuse_ok(end)? end : "FD") );
			const buildprops = (fp, fpterm, country) => {
				const objline = {'num':fp.num};
				const len = fpterm.pk - fp.pk;
                if(len < 0.1) console.log("warning line length", fp.num); objline.len = len;
				const gauge = buildgauge(fp.num, fp.info);
				const elect = buildelect(fp.num, fp.info);
				const end = thisend_ok(fp.end) ? fp.end : buildliend(fp.end);
				const use = buildmnemo(end);
//if(end == 1111) console.log(` line ${fp.num} closing year= ${end}`);
				return Object.assign(objline, {
                    ...(gauge && {'g':gauge}),
			//		len,
                    'pklist':[fp.pk],
                    'lid':buildlinid(fp.info),
					use,
                    ...(!thisuse_ok(use) && {'end':end}),
					...(elect && {'elect':elect})
					});
			};
            const getPropertiesFromLine = (fp) => {
                const line = fp.line;
                return {'num':fp.num, 'g': line.gauge,
                    'pklist': [fp.pk], 'lid': line.lid,
                    'use': buildmnemo(line.end),
                    ...(!thisuse_ok(fp.use) && {'end':thisend_ok(line.end) ? line.end : buildliend(line.end)}),
					...(line.electric && {'elect':line.electric})
                };
            };
            // const properties = buildprops(f.properties, t.at(-1).properties, country);
            const properties = (f.properties.line) ?
                getPropertiesFromLine(f.properties) :
                buildprops(f.properties, t.at(-1).properties, country);

            const geometry = {'type':"LineString",'coordinates':[f.geometry.coordinates]};
            return ({properties, "type":"Feature", geometry});
            //  const firstpoint = (acc, f, i, t, country) =>
            //  ({'properties':buildprops(f.properties, t.at(-1).properties, country),'type':"Feature",'geometry':{'type':"LineString",'coordinates':[f.geometry.coordinates]}});
            // ({'properties':buildprops(f.properties, t[t.length-1].properties, country),'type':"Feature",'geometry':{'type':"LineString",'coordinates':[f.geometry.coordinates]}});
        }
		const lastFpoint = (fp) => fp.info && fp.info.includes("terminus");  //   || fp.use.includes("F")
		const setLinLeng = (pklist) => Math.round(100*(pklist.at(-1) - pklist[0]))/100;
		const setFinalPk = (acc,fp) => lastFpoint(fp)?
            void (acc.properties.len = setLinLeng(acc.properties.pklist)) ||
            void (acc.properties.pk0 = acc.properties.pklist[0]) ||
            void (acc.properties.pkf = acc.properties.pklist.at(-1)) ||
            void (delete acc.properties.pklist) :
            0;
		const nextpoints = (acc, f) =>
            void acc.properties.pklist.push(f.properties.pk) ||
            void acc.geometry.coordinates.push(f.geometry.coordinates) ||
            void setFinalPk(acc,f.properties) ||
            acc;
		const warning4pk = (f,i,t,dpk,dk) => (dk < Math.EPSILON || (Math.abs(dpk - dk) > 4*dk && Math.abs(dpk - dk) > INTERPKMX)) ?
			console.warn(`warn4pk ${dpk.toFixed(3)}-${dk.toFixed(3)}=${(dpk-dk).toFixed(3)} ${JSON.stringify(f.properties)}`) : undefined; //stringify(t[i-1].properties)
		const checkingPk = (f,i,t) => warning4pk(f,i,t, (f.properties.pk - t[i-1].properties.pk), distanceGreatCircleInKm(f.geometry.coordinates, t[i-1].geometry.coordinates));
		const morepoints = (acc,f,i,t, country) => i === 0 ?
            firstpoint(acc,f,i,t, country) :
            (void checkingPk(f,i,t) || nextpoints(acc, f));
        //
        let country = list[0]?.properties.num.startsWith("_")? 87 : list[0]?.properties.uic?.slice(0,2);
if(MORELOGS && !country) console.log("LOG_>>> in linofCarpNumSet", list[0]?.properties.num, country);
		let res = list.length < 1? null : list.reduce((acc,f,i,t) => morepoints(acc,f,i,t, country), {});
if(false && MORELOGS) console.log("line???" + JSON.stringify(res));
		return res;
	}
    function cleanLprops(properties){
        const makeLlength = (pk0,pkf,pklist,len) => {
            if(pklist) return {"pk0":pklist[0],"pkf":pklist.at(-1),"len":Math.round(10*(pklist.at(-1)-pklist[0]))/10};
            if(pkf) return {"pk0":pk0||0, pkf, "len":len||Math.round(10*(pkf-(pk0||0)))/10};
            if(len) return {"pk0":pk0||0, "pkf":pkf||Math.round(10*(len+(pk0||0)))/10, len};
            return null;
        };
        const cleanse = ({num,country,g,gauge,pk0,pkf,pklist,len,use,end,lid, ...rest}) => ({
        	country,num,lid,use,
            'g':g||gauge,
            ...(!!makeLlength(pk0,pkf,pklist,len) && makeLlength(pk0,pkf,pklist,len)),
            ...( (end && use !== "EXP" && use !== "VS" && use !== "NEUT") && {end}),
            ...rest
        }); // rest: if France (only ?)
        return cleanse(properties);
    }
	const acceptLigne = (ac, ll) => void (ll? ac.push(ll) : 0) || ac;
    // run
	const listfg = listNums_FromGares(ff)
		.reduce((ac,num,j) => acceptLigne(ac, linofCarpNumSet(ff.filter(gg => gg.properties.num === num))), []);
    //console.log("listfg " + listfg.length);
	if(false && typeof gareFrance !== "string") return listfg;
	else { // else: FRANCE special processing
	const listfginfo = listfg.map(x => cleanLprops(x.properties));
	console.log("........; building NEW: lininfo.json");
    //    listfginfo.forEach(f => console.log(JSON.stringify(f)));
    //  console.log("before save");
/*
	let log = `{"lininfo":[`;
	lineInfo.forEach(x => {
		const props = ({num,country,gauge,pk0,pkf,pklist,len,use,end,lid, ...rest}) =>
			({	country,num,lid,use,
				'g':gauge,
                ...(!!makeLlength(pk0,pkf,pklist,len) && makeLlength(pk0,pkf,pklist,len)),
//*
                ...(pklist && {"pk0":pklist[0],"pkf":pklist.at(-1),"len":Math.round(10*(pklist.at(-1)-pklist[0]))/10}),
				...(pkf && {"pk0":pk0||0, pkf, "len":len||Math.round(10*(pkf-(pk0||0)))/10||pkf}}),
				...(len && !pk0 && {"pk0":0, "pkf": len, len}),
				...(len && pk0 && {pk0, "pkf": Math.round(10*(pk0+len))/10, len}),
				...(!len && pkf && {"pk0":pk0||0, "pkf":pkf, "len":Math.round(10*(pkf-pk0))/10||pkf}),
//*
                ...( (use !== "EXP" && use !== "VS" && use !== "NEUT" && end) && {end}),
				});
//				lid, ...rest}); // rest: if France (only ?)
		let y = listfginfo.find(z => z.num === x.num);

		if(!y) return (log += ",\n" + JSON.stringify( x ));
		
		const pk0 = y.pklist[0], pkf = y.pklist[y.pklist.length -1];
		const newx = Object.assign(Object.create(y), y);
		Object.assign(newx, x, {pk0,pkf});
		// delete newx.pklist;
		if(typeof newx.af === "number") newx.af = [newx.af];
	//	if(newx.use === "EXP" || newx.use === "VS" || newx.use === "NEUT") delete newx.end;
		
		return (log += ",\n" + JSON.stringify( props(newx) ));
	});
	//saveSync((log + '\n]}'), "lininfo.json");
*/
/*
	const nulininfo = listfginfo.map(x => void (delete x.pklist) || x);
	saveSync(`{"lininfo":\n` + JSON.stringify(nulininfo) + `\n]}`, "lininfo.json");
*/
    //console.log("just before save");	
	saveSync(`{"lininfo":\n` + JSON.stringify(listfginfo) + `\n}`, "lininfo.json");
	//console.log("lininfo.json recorded ...!");
	return listfg;
	}
}
function lignifyNormalGares(geoj, specif, lineInfo = null){
    const belgianExcept = ["B001","B001r1","B065","B066","B067","B068","B069","B069B","B073","B075","B075A","B078","B085","B088","B088A","B092","B094","B096","B097","B098","B098A","B130A","B132o","B132","B134","B138","B138A","B154","B154","B155","B156","B161","B163A","B165","B165F","B165X","B166","B167","B171","BT0","BT268"];
    const belgianFilter = (arr,num) => !arr.includes(num); // num.startsWith("BT") &&
	if(!geoj.metadata || !geoj.metadata.type === "gare") return console.log(specif, "not a gare") || null;
    /***/
    const validLine = fpend => fpend && (fpend.startsWith("no") || fpend.startsWith("NEUT"));
    const addToBelgeExcept = (arr) => arr.concat(geoj.features.filter(f => validLine(f.properties.end)).map(f => f.properties.num));
    const filteredFeatures = geoj.features.filter(f => belgianFilter(addToBelgeExcept(belgianExcept), f.properties.num));
    /***/
	const lignifiedfeatures = lignifyGares(filteredFeatures, lineInfo);
	const lignifiedGeojson = updataGeojson(geoj, lignifiedfeatures, {"type":"line", "norm":"ok", "doc":"lignified"});
    lignifiedGeojson.metadata.type = "line";
    normMetadata(lignifiedGeojson.metadata, {"type":"line"});
	let log  = `======= lignifyNormalGares> ${JSON.stringify(lignifiedGeojson.metadata)}`;
		log += "\n  =====\n  =====\n  =====\n  =====\n  ===== ???????????,";
		log += `\n  ===== ${JSON.stringify(lignifiedGeojson.features[parseInt(lignifiedGeojson.features.length*Math.random())])}`;
		log += `\n  ===== metaAnalysisof lignifiedGares ${metaAnalysis(lignifiedGeojson)}`;
	//console.log(log);
	return lignifiedGeojson;
}

function convertLines(geoj, specif, suffix = "geojson"){
/* geojson format feature-by-feature conversion:
 * @param{object} expected geojson standard  [{properties:{},type:"Feature",geometry:{type,coordinates}}, ...]
 *   with properties: {num|code_ligne, libelle, use|mnemo, pk0|pk_debut_r|pkd, pkf|pk_fin_r [, rg_troncon, lid, len, end|validTo]}
 * @returns{object} converted with fiveDecimals coordinates and normalized properties
*/
		const convertPropL = ({num,code_ligne, lid,lib_ligne, use,mnemo, pkf,pk_fin_r, pk0,pkd,pk_debut_r, pklist, len, end, rg_troncon, info}) =>
		({	'num':num||code_ligne,
			...((lid||lib_ligne)&&{'lid':(lid||lib_ligne)}),
			'use':use||mnemo, //ignores libelle
	//		'pk0':updatePK(usePkValue(pk0) ||usePkValue(pklist[0]) ||usePkValue(pk_debut_r)||usePkValue(pkd), num||code_ligne),
			...((pk0 || pklist)&&{'pk0':updatePK(usePkValue(pk0) ||usePkValue(pklist[0]), num||code_ligne)}),
			...((pkf || pklist)&&{'pk0':updatePK(usePkValue(pkf) ||usePkValue(pklist.at(-1)), num||code_ligne)}),
//	...((pkf || pklist)&&{'pk0':updatePK(usePkValue(pkf) ||usePkValue(pklist[pklist.length-1]), num||code_ligne)}),
			...(len&&{len}),
			...(end&&{end}),
			...(info&&{info}),
			...(pklist&&{'pklist':pklist.map(updatePK)}),
			...((rg_troncon && rg_troncon > 1)&&{rg_troncon})});
		const convertGboth = ({properties, type, geometry}) => ({"properties":convertPropL(properties), type, "geometry":convert_Geom(geometry)});
		const sortByNum_Pk = (fa, fb) => (fa.num === fb.num)? (fa.pk0 - fb.pk0) : fa.num.localeCompare(fb.num);
	// constants + run
    geoj.metadata = normMetadata(geoj.metadata, {"type":"line"});
	//console.log(JSON.stringify(geoj.metadata));
	const convertedfeatures = geoj.features.map(convertGboth).sort((a,b) => sortByNum_Pk(a.properties, b.properties));
	//console.log(JSON.stringify(convertedfeatures[0].properties));
	//console.log(JSON.stringify(convertedfeatures[convertedfeatures.length-1].properties));
	const convertedGeojson = updataGeojson(geoj, convertedfeatures);
	//console.log(JSON.stringify(convertedGeojson.metadata));
		console.log(`=========== convertLines>`, metaAnalysis(convertedGeojson));
	return convertedGeojson;
}
function convertTowns(geoj, specif, suffix = "geojson"){
/* geojson format feature-by-feature conversion:
 * @param{object} expected geojson with features: {properties:{nom, code},type:"Feature",geometry:{type:Polygon|MultiPolygon,coordinates}}, ...
 * @returns{object} converted with fiveDecimals coordinates and normalized properties
*/
		const newInsee = (code) => code;
		const docorsify = (arc) => void arc.splice(1, 0, '0') || arc.join("");
		const uncorsify = (arc) => void arc.splice(1, 1) || arc.join("");
		const updateInsee = (code) => parseInt(code)===2? docorsify(Array.from(code)) : code;
		const restoreInsee = (code) => parseInt(code)===20? uncorsify(Array.from(code)) : code;
		const sortByInsee = (a, b) => a.properties.cc.localeCompare(b.properties.cc);
		const convertPropT = ({nom,code}) =>
		({	'nom':nom, // or slug
			'cc':updateInsee(newInsee(code))});
		const convertGboth = ({properties, type, geometry}) => ({"properties":convertPropT(properties), type, "geometry":convert_Geom(geometry)});
	// constants + run
	geoj.metadata = Object.assign(geoj.metadata || {"url":specif}, {"mime":suffix, "type":"town", "year":(new Date()).getFullYear()});
	console.log(JSON.stringify(geoj.metadata));
	const convertedfeatures = geoj.features.map(convertGboth).sort(sortByInsee).map(x => void (x.properties.cc = restoreInsee(x.properties.cc)) || x);
	const convertedGeojson = updataGeojson(geoj, convertedfeatures);
		console.log(`=========== normalized Towns>`, metaAnalysis(convertedGeojson));
	return convertedGeojson;
}

function booleanPointInPolygon(point, polygon, options = {}) {
/* expected in that adaptation:
 * @param{geoJson-style coordinates}
 * @param{geoJson-style geometry}
*/
	function inRing([px,py], ring, ignoreBoundary) {
/**
 * @param {Array<number>} pt [x,y]
 * @param {Array<Array<number>>} ring [[x,y], [x,y],..]
 * @param {boolean} ignoreBoundary
 * @returns {boolean} inRing
 */
		let isInside = false;
		if (ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]) {
			ring = ring.slice(0, ring.length - 1);
		}
		for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
			const xi = ring[i][0], yi = ring[i][1];
			const xj = ring[j][0], yj = ring[j][1];
			const onBoundary = (py * (xi - xj) + yi * (xj - px) + yj * (px - xi) === 0) && ((xi - px) * (xj - px) <= 0) && ((yi - py) * (yj - py) <= 0);
			if (onBoundary) {return !ignoreBoundary;}
			const intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
			if (intersect) {isInside = !isInside;}
		}
		return isInside;
	}
    if (!point) {throw new Error("point is required");}
    if (!polygon) {throw new Error("polygon is required");}
	const pt = point; // expected geoJson-style coordinates as in {'geometry':{'type':"Point", 'coordinates':[lon,lat]}, ...}
	const geom = polygon; // expected geoJson-style geometry
    var polys = geom.coordinates;
    // Quick elimination if point is not inside bbox
//    if (bbox && inBBox(pt, bbox) === false) {return false;}
    if (geom.type === "Polygon") {polys = [polys];} // normalize to MultiPolygon wise!!
    var insidePoly = false;
    for (var i = 0; i < polys.length && !insidePoly; i++) {
        // check if it is in the outer ring first
        if (inRing(pt, polys[i][0], options.ignoreBoundary)) {
            var inHole = false;
            var k = 1; // check for the point in any of the holes
            while (k < polys[i].length && !inHole) {
                if (inRing(pt, polys[i][k], !options.ignoreBoundary)) {inHole = true;}
                k++;
            }
            if (!inHole) {insidePoly = true;}
        }
    }
    return insidePoly;
}
/* function checkCommuneStations + help having all "insee" codes aligned in 2017*/
function checkCommuneStations(communes, stations){
    function getInseeChanges(){	// regroupements or modifications de communes 2015-2017
        const changed = [
    {"old":"08493", "oldn":"Vrizy-Vandy", "new":"08490", "newn":"Vouziers"},
    {"old":"14371", "oldn":"Livarot", "new":"14371", "newn":"Livarot-Pays-d'Auge"},
    {"old":"14422", "oldn":"Mesnil-Mauger", "new":"14431", "newn":"Mézidon Vallée d'Auge"},
    {"old":"14462", "oldn":"Neuilly", "new":"14342", "newn":"Isigny-sur-Mer"},
    {"old":"14417", "oldn":"Mesnil-Clinchamps", "new":"14658", "newn":"Noues de Sienne"},
    {"old":"15171", "oldn":"Ste-Anastasie", "new":"15141", "newn":"Neussargues en Pinatelle"},
    {"old":"16294", "oldn":"Montmoreau", "new":"16230", "newn":"Montmoreau"},
    {"old":"24270", "oldn":"Milhac-d'Auberoche", "new":"24026", "newn":"Bassillac et Auberoche"},
    {"old":"24369", "oldn":"St-Antoine-d'Auberoche", "new":"24026", "newn":"Bassillac et Auberoche"},
    {"old":"27253", "oldn":"La Rivière-Thibouville", "new":"27425", "newn":"Nassandres sur Risle"},
    {"old":"28356", "oldn":"Courtalain-St-Pellerin", "new":"28012", "newn":"Commune nouvelle d'Arrou"},
    {"old":"28093", "oldn":"Le Bois-Mouchet", "new":"28012", "newn":"Commune nouvelle d'Arrou"},
    {"old":"28101", "oldn":"Civry-St-Cloud", "new":"28330", "newn":"Villemaury"},
    {"old":"41167", "oldn":"Onzain", "new":"41167", "newn":"Veuzain-sur-Loire", "an":"2017"},
    {"old":"41272", "oldn":"Veuves-Monteaux", "new":"41167", "newn":"Veuzain-sur-Loire", "an":"2017"},
    {"old":"45267", "oldn":"St-Benoît-St-Aignan", "new":"45051", "newn":"Bray-Saint-Aignan"},
    {"old":"46331", "oldn":"Vers", "new":"46268", "newn":"Saint Géry-Vers"},
    {"old":"48023", "oldn":"Belvezet", "new":"48027", "newn":"Mont Lozère et Goulet"},
    {"old":"48040", "oldn":"Daufage-le-Goulet", "new":"48027", "newn":"Mont Lozère et Goulet"},
    {"old":"48040", "oldn":"Chasseradès", "new":"48027", "newn":"Mont Lozère et Goulet"},
    {"old":"48183", "oldn":"St-Sauveur-de-Peyre", "new":"48009", "newn":"Peyre en Aubrac"},
    {"old":"49197", "oldn":"Meigne-le-Vicomte", "new":"49228", "newn":"Noyant-Villages"},
    {"old":"49175", "oldn":"Linières-Bouton", "new":"49228", "newn":"Noyant-Villages"},
    {"old":"49136", "oldn":"La Ferrière-de-Flée", "new":"49331", "newn":"Segré-en-Anjou Bleu"},
    {"old":"49119", "oldn":"Le Porage", "new":"49220", "newn":"Morannes sur Sarthe-Daumeray"},
    {"old":"49366", "oldn":"Vergonnes", "new":"49248", "newn":"Ombrée d'Anjou"},
    {"old":"49229", "oldn":"Noyant-la-Gravoyère", "new":"49331", "newn":"Segré-en-Anjou Bleu"},
    {"old":"49103", "oldn":"Combrée", "new":"49248", "newn":"Ombrée d'Anjou"},

        {"old":"50168", "oldn":"Ducey", "new":"50168", "newn":"Ducey-les-Chéris"},
        {"old":"50082", "oldn":"Bricquebec", "new":"50082", "newn":"Bricquebec-en-Cotentin"},
        {"old":"68201", "oldn":"Masevaux", "new":"68201","newn":"Masevaux-Niederbruck"},
        {"old":"68233", "oldn":"Niederbruck", "new":"68201","newn":"Masevaux-Niederbruck"},

    {"old":"69222", "oldn":"St-Laurent-d'Oingt", "new":"69024", "newn":"Val d'Oingt"},
    {"old":"72159", "oldn":"Pont-de-Braye", "new":"72262", "newn":"Loir en Vallée"},
    {"old":"72384", "oldn":"Marçon-Vouvray", "new":"72071", "newn":"Montval-sur-Loir"},
    {"old":"74120", "oldn":"Évires", "new":"74282", "newn":"Fillière"},
    {"old":"74245", "oldn":"St-Martin-Bellevue", "new":"74282", "newn":"Fillière"},
    {"old":"74217", "oldn":"Pringy (Haute-Savoie)", "new":"74010", "newn":"Annecy"},
    {"old":"77491", "oldn":"Moret-Veneux-les-Sablons", "new":"77316", "newn":"Moret-Loing-et-Orvanne"},
    {"old":"80447", "oldn":"Hyencourt-le-Grand", "new":"80621", "newn":"Hypercourt"},
    {"old":"89001", "oldn":"Accolay", "new":"89130", "newn":"Deux Rivières"}
            ];
        return changed;
    }
    function updateInseeCodeAndName({insee,nom}) { // if we do know one of 'insee | nom' !! doesnt check for duplicates name, 
        nom = updateCommuneName(nom);
        const cc = insee && !isNaN(parseInt(insee))? getInseeChanges().find(c => c["old"] === insee) : null;
        return cc? {'insee':cc["new"], 'nom':cc["newn"], 'updated':nom} : {insee,nom};
    }
    function updateInseeCodeFromDeptAndName({dept,nom}) { // if we do know one of 'insee | nom' !! doesnt check for duplicates
        nom = nom? updateCommuneName(nom) : undefined;
        const cc = dept!=null && dept!=="99"? getInseeChanges().find(c => c["old"].startsWith(dept) && c["oldn"] === nom) : null;
        return cc? ({'dept':cc["new"].slice(0,2), 'nom':cc["newn"]}) : (dept || nom? ({...(dept && {dept}), ...(nom && {nom})}) : undefined);
    }
    function topogeoNewInseeName(name) {
        const cc = getInseeChanges().find(c => c["oldn"] === name); return cc? cc["newn"] : name;
    }
    function topogeoNewInseeCode(code) {
        const cc = getInseeChanges().find(c => c["old"] === code); return cc? cc["new"] : code;
    }
    function updateInseeName(code){	// regroupements de communes 2015-2017
        const cc = getInseeChanges().find(c => c["old"] === code); return cc? cc["new"] : code;
    }
    //cf. geometryMatch in territoires.js
    const normal_Saint = (name) => name.replace("St-","Saint-").replace("Ste-","Sainte-");
    const correctinsee = (c) => c && c.length === 5 &&  !Number.isNaN(c.slice(2)) && (!Number.isNaN(c.slice(0,2)) || c.startsWith("2a") || c.startsWith("2b"));
    const unknowninsee = (sp) => !sp.cc || !correctinsee(sp.cc);
    const notgareinsee = (sp) => (sp.use && ["B","A","X","J","F"].some(x => sp.use.includes(x))) || (sp.cc && Number.isNaN(sp.cc.charAt(0)));
	
    const updatedirect = (sp,cp) => (sp.nom = cp.nom) && (sp.cc = cp.code);
    const croxeckinsee = (sp,cp) => sp.cc === cp.code? false :
          (sp.nom===normal_Saint(cp.nom) || sp.id.includes(normal_Saint(cp.nom)) || topogeoNewInseeCode(sp.cc)===cp.code? void (sp.cc = cp.code) : true); // check sp.nom or sp.id
//const inconsistent = (sp,cp) => foreigninsee(sp)? false : (unknowninsee(sp)? void updatedirect(sp,cp) : croxeckinsee(sp,cp));
    const lightStation = (k,v) => (k==='info' || k==='use' || k==='slug' || k==='rang' || k==='uic' || k==='skip')? undefined : v;
    const checkInseeAt = (sp,cp,save,cnt = 0) => croxeckinsee(sp,cp)? void save.push(`${JSON.stringify(sp,lightStation)} .vs. ${JSON.stringify(cp)}`) || (cnt++) : true;
    const isTheCommune = (s,c) => s.properties.cc === c.properties.code;
        // +?: || updateInseeCodeAndName({'insee':s.properties.insee, 'nom':s.properties.nom}).insee === c.properties.insee;
    const mark_Gare_cc = (sp,cp) => (sp.nom = cp.nom) && (sp.cc = cp.code);
	const mark_Commune = (cp) => (cp.gares = (cp.gares+1)||1);
    const sameinsee_ok = (s,c) => c && booleanPointInPolygon(s.geometry.coordinates, c.geometry) && mark_Commune(c.properties);
	const hasTobeSkipd = (sp) => !!(sp.skip);
	const wouldbeSkipd = (sp,ok) => (sp.skip = true) && countsimples++ && (ok? (console.log(JSON.stringify(sp)) || true) : true);
    
	const matchCoSt = (s,c, savetab, cnt) => {
	    let sp = s.properties, cp = c.properties;
	    if(hasTobeSkipd(sp)) return true; // do nothing;
		if(unknowninsee(sp)) return booleanPointInPolygon(s.geometry.coordinates, c.geometry) && mark_Gare_cc(sp,cp) && mark_Commune(cp);
		if(sp.cc === cp.code) return mark_Commune(cp);
	    return booleanPointInPolygon(s.geometry.coordinates, c.geometry) && checkInseeAt(sp,cp,savetab,cnt) && mark_Commune(cp);
	};
	const NNNNNselectGare = (use) => !use.includes("B") || !use.includes("J") || !use.includes("X") || !use.includes("F");
	const selectGare = (use) => use.includes("N") || use.includes("O") || use.includes("T");
	const gareFrance = (sp) => !sp.uic || sp.uic.startsWith("87") && !sp.use.startsWith("F");
	
	const incoherences = [];
    const invalidInsee = [];
	const ffcomm = communes.features;
	const ffgare = stations.features.map(g => (selectGare(g.properties.use) && gareFrance(g.properties))? g : void (g.properties.skip = true) || g);
    console.log(`***************** ffgare: selectGare && gareFrance length: ${ffgare.filter(g => !g.properties.skip).length} / ${ffgare.length}`);
	
	let countsimples = 0; 	// process simple cases first
	ffgare.forEach(s => !hasTobeSkipd(s.properties) && unknowninsee(s.properties)? countsimples++ : void 0); console.log("simply: no insee info",countsimples); countsimples =0;
	ffgare.forEach(s => !hasTobeSkipd(s.properties) && correctinsee(s.properties.cc)? countsimples++ : void 0); console.log("consistent insee info",countsimples); countsimples =0;
	ffgare.forEach(s => !hasTobeSkipd(s.properties) && s.properties.cc && !correctinsee(s.properties.cc)? console.log(JSON.stringify(s.properties)) || countsimples++ : void 0); console.log("inconsistent insee info",countsimples); countsimples =0;
	ffgare.forEach(s => !hasTobeSkipd(s.properties) && notgareinsee(s.properties)? wouldbeSkipd(s.properties) : void 0);
	console.log("simple cases are processed: notgareinsee",countsimples); countsimples =0;
	ffgare.forEach(s => !hasTobeSkipd(s.properties) && (!unknowninsee(s.properties) && sameinsee_ok(s,ffcomm.find(c => isTheCommune(s,c))))? wouldbeSkipd(s.properties) : void 0);
	console.log("simple cases are processed: sameinsee_ok",countsimples); countsimples =0;

//	const stepTimer = stepTimerFunction(timing, ffcomm, 5, "joinC_NS");
	const stepTimer = (i,j,s,c) => (i%999 === 1 && j%999 === 1)? console.log(s.properties.num, c.properties.code) : undefined;
    ffgare.forEach((s,i) => ffcomm.some((c,j) => void stepTimer(i,j,s,c) || matchCoSt(s,c, invalidInsee, countsimples)));

	const commfeatures = ffcomm.filter((c,i) => !!c.properties.gares);
    console.log(`communes[${ffcomm.length}] with gares[${ffgare.length}/${ffgare.length}]: ` + commfeatures.length);
	console.log(`invalid Insee[${invalidInsee.length}] =\n${invalidInsee.reduce((acc,sp,i) => acc+(i?",\n":"\n")+sp,"")}`);
	
	const newGeojson = updataGeojson(communes, commfeatures, {"doc":"communeAvecGare"});
		console.log(`=========== railwayed Towns>`); // , metaAnalysis(newGeojson));

	const usefulnm = (gp) => gp.nom && gp.nom !== gp.id;
	const updprops = (gp) => ({ ...(gp.DEBUT_RESEAU && {"RESEAU":gp.DEBUT_RESEAU}), ...(gp.DEPT && {"DEPT":gp.DEPT}),
		"num":gp.num, "pk":gp.pk, "use":gp.use,
		"id":gp.id,
		...(gp.uic && {"uic":gp.uic}),
		...(usefulnm(gp) && {"nom":gp.nom}), ...(gp.cc && {"cc":gp.cc}),
		...(gp.info && {"info":gp.info}), ...(gp.end && {"end":gp.end})
		});
	const updateff = (g) => ({"properties":updprops(g.properties), "type":g.type, "geometry":g.geometry});
	const garefeatures = ffgare.map(g => updateff(g));
	const newGares = updataGeojson(stations, garefeatures, {"doc":"garesAvecInsee"});
		console.log(`=========== insee_ed Gares>`);
//		console.log(`=========== insee_ed Gares>`, metaAnalysis(newGares));
	saveSync(JSON.stringify(newGares), "GaresInseeNF2.geojson");
	return newGeojson;
}

/* INPUT / OUTPUT */
function fileFetch(specif, prefix = "sncf21/Data/", suffix = "geojson"){
    /* beware: prefix and suffix defaults are used: they may need to be modified
     */
    /* usual parsers: geojson, kmlpoints, ... */
    const geojsonify = (ff,url) => ({"type":"FeatureCollection",
        "metadata":{url,"type":typeOfFeatures(ff)}, "features":ff});
    const geojsonCas = (gj, url) => void (gj.metadata = gj.metadata || {url}) || gj;
    const kml_PtsCas = (fk, url) => geojsonify(kmlparser(fk), url);
    const filenameIn = (specif, prefix, suffix) => prefix + specif + (suffix ? ("."+ suffix) : "");
    const url = filenameIn(specif, prefix, suffix);
    console.log(`run_>>> fileFetch ${url} = ${prefix} ${specif} ${suffix}`);
    return new Promise((resolve, reject) => {
        fs.readFile(url, "utf-8", (err,data) => {
            if (err != null) reject(err);
            else {
    //console.log(`§§§_fileFetch with ${suffix}-${typeof data}: ${data?.slice(0,160)}...${data?.length}`);
            switch (suffix){
                case "json": resolve(JSON.parse(data)); break;
                case "geojson": resolve(geojsonCas(JSON.parse(data,url))); break;
                case "kml": resolve(kmlparser(data)); break; // if multiple features
    //				case "kml": resolve(kml_PtsCas(data,url)); break;
                default:	resolve(data);
                }
            }
        });
    });
}
function saveSync(data, filout = "outest.geojson"){
    /* beware: default filenamOut is used: if it exists, it will be erased and overwritten
     * you may consider: fs.appendFileSync(filename, data, (err) => {
     */
    console.log(`//saveSync ${typeof data}-data into ${filout}`);
    return data?
        fs.writeFileSync(filout, data, (err) => {
            if (err != null) {console.error(`saveSync error: ${typeof err} ${err} ${err.length}`); reject(err);}
            else {console.log(`data appended to ${filename}:...${data?.length}`); resolve("ok");}
        })
    : void console.error(`saveSync: no data provided`) || Promise.resolve("no");
}
function appendSync(data, filout = "FFout.json"){
    /* beware: default filenamOut is used: if it exists, it will be augmented with more data
     * you may consider emptying it before reuse
     */
    return data?
        fs.appendFileSync(filout, data, (err) => {
            if (err != null) {console.error(`saveSync error: ${typeof err} ${err} ${err.length}`); reject(err);}
            else {console.log(`data appended to ${filename}:...${data?.length}`); resolve("ok");}
        })
        : void console.error(`appendSync: no data provided`) || Promise.resolve("no");
}
    
/* **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** *\
 * SPECIFIC ALGORITHMS
 */
    
function kmlparser(str){
/*

<description><![CDATA[<img src="https://lh3.googleusercontent.com/8qgjo4-v-qCpK8uUr86_bnMsv1Zdpmhh6TBQtUIbUDN8A0DzSBchHXpSrRlJrMN-znyJQeAS6pBblsI7eWwYf_qOpfZ7Nb6-OX1xyT-9JkX8FJz1qCqJGWVdaOLRweDBAj5TBw" height="200" width="auto" /><br><br>En savoir plus : http://www.railstation.be/gare-de-sint-mariaburg/]]></description>
 */
	const doproperties = (g,i,gg,numer,nomer) => {
		const donum = (numer) => numer < 100 ? "B0" + numer : "B" + numer;
		const donom = (numer) => "Ligne_"+donum(numer)+"_(Infrabel)";
		const dogid = (g) => (g.split("<name>")[1]?.split("</name>")[0]).replace("\n","");
		const dopic = (g) => g.includes("railstation.be/")?
			" rq:" + g.split("railstation.be/")[1].split("\/]]")[0].split("\/<")[0] : "";
		const dodoc = (g, i, imax, nomer) => i===0? "origin "+nomer : (i===imax? "terminus" : "mmm");
		let num = donum(numer);
		let nomln = donom(numer);
		let id = dogid(g), pk = 10*i, use = "NN", uic = "88"+num+"_"+pk;
		let info = (dodoc(g, i, gg.length-1, nomer)  + dopic(g)).replace("mmm ","");
		let properties = {num, pk, use, id, uic, info};
//console.log(JSON.stringify(properties))
		return properties;
	};
	const dogeometry = (g,i) => {
		const fiveDec = (x) => Math.round(100000 * x)/100000;
		const docoo = (g) => g.split("<coordinates>")[1].split("</coordinates>")[0]
								.trim().split(",").map(x => fiveDec(x));
		let coordinates = docoo(g); if(coordinates.length === 3) coordinates.pop();
		return ({coordinates, "type":"Point"});
	};
	const dofeature = (g, i, gg, numer, nomer) => {
		if(!g.includes("<name>")) return;
		let properties = doproperties(g,i,gg,numer,nomer);
		if(i===0) properties.end = "unknown";
		let geometry = dogeometry(g,i);
		let feature = {properties, geometry, "type":"Feature"};
//console.log(JSON.stringify(feature));
if(i===0) console.log(`dofeature: line ${properties.num} has ${gg.length} gares`);
		return feature;
	};
	const title = str.split("<name>")[1].split("</name>")[0];
	const numer = title.split("Ligne")[1].split("-")[0].trim();
	if(!numer || isNaN(parseInt(numer))) return console.log("nNaN num", numer);
	const nomer = title.split("-").slice(1).join("_").replaceAll(" ","");
	const listofgares = str.split("<Placemark>"); listofgares.shift();
	return listofgares.map((g,i,gg) => dofeature(g,i,gg,numer,nomer));
}

/*	Wikipedia InfoBox parser
 * cf. https://stackoverflow.com/questions/29020722/recursive-promise-in-javascript#29020886
 * wikiFetchNEU(noml,{"properties":{"sncf":noml,"num":numl},"type":"Feature","geometry":null}, PAYS);
*/
function wikipediaFetch(wiki, {noml, numl, countrycode}){
function parseInfoboxNEW(ligeoj, table){ // return a JSON string for the "ligne", and its "gares" (if table info is present)
// * @param{object} passed thru information
// * @param{string} json text to be parsed
// * @returns{string}
	function columnize(line){ // returns an array of 'cols'
		const intBegEnd = (line,beg,end,reducer) => {
			const inner = (y) => y[0] && y[0].split("|").reduce(reducer, "") + (y[1] || ""); //  TO DO !!!!!!!!!!
			const outer = (x) => x[0] + (x[1] && inner(x[1].split(end)));
			const svral = (s) => s.includes(beg)? outer(s.split(beg)) : s;
			const svrec = (s,snew) => s===snew? s : svral(snew);
			return svrec(line,svral(line)); //line.includes(beg)? outer(line.split(beg)) : line;
		}; // sub-processes to handle cases with possible inner '|' not to be considered by final split("|")
		const reduce_BL = (acc,y,i,t) => acc + (i?"/":"") + y;
		const reduce_KM = (acc,y,i,t) => acc + (i? t[0] +"/"+ t[1].replace(/,/g,"+") : ""); //  /^\d{1,3},[\dx]{3}$/
		const reduce_WL = (acc,y,i,t) => acc + (t.length===1? y : (i===1? y +"/"+ t[0] : ""));
		const reduce_RF = (acc,y,i,t) => acc + (i? "" : " Ref. ");
		const reduce_CN = (acc,y,i,t) => acc + (i? "" : "chaînage:"+y);
		const remove_CN = (line) => intBegEnd(line,"{{BS chaînage|","}}",reduce_CN);
		const remove_BL = (line) => intBegEnd(line,"{{BS-lien|","}}",reduce_BL);
		const remove_KM = (line) => intBegEnd(line,"{{BSkm|","}}",reduce_KM);
		const remove_W1 = (line) => intBegEnd(line,"''[[","]]''",reduce_WL);
		const remove_W2 = (line) => intBegEnd(line,"[[","]]",reduce_WL);
		const remove_RF = (line) => intBegEnd(line,"<ref>","</ref>",reduce_RF);
		const unmodeliz = (line) => line.slice(4,-2); // removes initial "{{BS" and trailing "}}"
		return unmodeliz(remove_CN(remove_W2(remove_W1(remove_BL(remove_KM(remove_RF(line))))))).split("|");
	}
	function swatchify(cols){ // returns a filtered array, starting at "pk"
		const unitalics = (col) => (col.startsWith("''") && col.endsWith("''")? col.slice(2,-2) : col);
		const get_pkind = (cols) => cols.findIndex(c => c.match(/^\d{1,3},[\dx]{3}/)); // get rank of "nn,mxx", if any pk format
		const get_bsind = (cols) => (parseInt(cols[0]) || 0) +1; // get n in "{{BSn*bis ... }}"
		const indofcols = (cols,pkind) => pkind >= 0? pkind : get_bsind(cols); // index of 1st usable col, using pk (best), or bs
		const mindex_ok = (col) => !col || (col.charCodeAt(0)> 47 && col?.charCodeAt(0) < 58); // if bs uncertain, try next
		const filterify = (n) => (x,i,t) => mindex_ok(t[n])? (i >= n) && (t[n]+t[n+1]).length > 0 : (i >= ++n) && (t[n]+t[n+1]).length > 0;
		return cols.map(unitalics).filter(filterify(indofcols(cols, get_pkind(cols))));
	}
	const updatjson = (sp,y,i) => { // returns a geojson property equivalent
		const nom = lib => // ouvrages d'art et bifurcations
			["Tunnel","Viaduc d","Viaduc s","Pont sur","Pont d"].some(x => lib?.startsWith(x))? "art"
			: (["Ligne ","Bifurcation","Bif "].some(x => lib?.startsWith(x))? "bif"
			: lib);
		const addinfoval = (spi,y) => spi? (spi += (y?(" "+y):"")) : (spi = (y?(y+" "):"") +"gg"+(sp.pk==="0"?" PK?":""));
		const uicfromnum = (nu,km) => `${PAYS}${nu.split("000")[0]}_${km.split("+")[0]}`;
		const setpkvalue = (pk,i) => pk || i;
		if(!y) return sp;
		if(i===0) return void (sp.pk = y.replace(",",".").replace("+",".")) ||
						 void (sp.uic = uicfromnum(sp.num, setpkvalue(sp.pk,i))) || sp;
		if(i===1) return void ((sp.id = y.split("/")[0]) && (sp.info = addinfoval(sp.info, y.split("/")[1]||""))) || sp;
		return void (sp.info = addinfoval(sp.info, y)) || sp;
	};
	const geojsonln = (x) => ({"properties":x, "type":"Feature","geometry":{"type":"Point","coordinates":[88888]}});
	const propsline = (num) => ({"id":"www",num,"pk":"0","use":"N"}); // "uic":`${PAYS}`,
	const missingli = (ligeoj) => void (ligeoj.schema_BS= "missing") || ligeoj;
	const getaTable = (src) => (src?.split("\n").length > 1)? src.split("\n") : null;
	const line2prop = (line) => swatchify(columnize(line)).reduce((ac,y,i) => updatjson(ac,y,i), propsline(ligeoj.numl));
	if(table.includes("\n"))
		return getaTable(table)?.map(line2prop) // if ok, map "gare" for that "ligne", then filter out 'wrong' ones
		.filter((fp,i) => (fp.pk !== "0" || fp.id !== "www") &&
			(void console.log(`num:${fp.num}, pk:${fp.pk}, id:${fp.id}, info:${fp.info}`) || true))
		.reduce((ac,x)=> ac.push(geojsonln(x)), []);
	else return void console.log(`MISSING: ${ligeoj.numl}:${ligeoj.noml}`) || missingli(ligeoj);
}
	function wikiFetchNEU(wiki, ligeoj){
/*
 * @param{ligeoj} = {noml:mandatory, numl:mandatory, countrycode:default:fr, schema_BS:computed}
 */
	const uic_code = (cc) => cc==="be"? "88" : (cc==="lu"? "82": (cc==="fr"? "87": "87")); // To Be Continued
	const wikicode = (cc) => (cc==="be" || cc==="lu" || cc==="fr")? "fr": cc; // To Be Continued
	function wikiLinkNEW(wiki, wikicode){ // todo: possible use with a different countrycode (not checked)
		const cleanLink = (page) => page.replace(/\s/g,"_").replace(/St-/g,"Saint-").replace(/Ste-/g,"Sainte-");
		const end_Point = (code) => "https://**.wikipedia.org/w/api.php".replace("**",code);
		const queryPage = (page) =>
	"?action=query&prop=revisions&rvslots=*&rvprop=content&formatversion=2&format=json&rvsection=0&titles=**".replace("**",page);
		console.log("wikiLinkNEW", typeof wiki);
		console.log("wikiLinkNEW",  wiki);
		return end_Point(wikicode) + queryPage(encodeURIComponent(cleanLink(wiki)));
	}
	function afterPrefix(res){ // works for both old- and slots- styles
// * @param{object} json wikimedia-style
// * @returns{string} depending on: pp[0].missing===true : just drop it
// *    pp[0].revisions[0].slots.main.content === "#REDIRECTION [[ xxx ]]" : seek new xxx link
		let pp = res.query.pages;
		return (Array.isArray(pp))?
		(pp[0].missing===true? "missing" : pp[0].revisions[0].slots.main.content)
		: void console.log() || Object.values(pp).find(s => s.revisions[0]).revisions[0]["*"];
	}
	function wikiFetchInner(wiki, content, ligeoj, nrecu){
// * @param{string} page name
// * @param{string} "missing" | has BStable: terminates ; has redirect | has schema2: recurs | null or unknown (throws)
// * @param{object} keeping recurring info
// * @param{number} count recurs
// * @returns{string}
		const wikisMissing = s => s === "missing" && "missing";
		const wikihastable = s =>
			(s.includes("{{BS-tabl") && (s.split("{{BS-table}}\n")[1]?.split("\n{{BS-table-fin}}")[0].trim())) ||
		//	(s.includes("{{BS-tabl") && (s.split("{{BS-table")[1]?.split("}}\n")[1]?.split("\n{{BS-table-fin}}")[0].trim())) ||
			(s.includes("{{BS-init") && (s.split("{{BS-init}}\n")[1]?.split("\n{{BS-fin}}")[0].trim()))||"";
		//const terminator = s => s === "missing"? "missing" : (/^{{BS-\w+}}/.test(s)? wikihastable(s) : false);
		const wikihasredir = s => s?.includes("#REDIRECTION")? s.split("#REDIRECTION")[1]?.split("[[")[1].split("]]")[0].trim() : "";
		const wikihasannex = s => s?.includes("sch\u00e9ma2")? s.split("sch\u00e9ma2")[1]?.split("=")[1].split("\n")[0].trim().replace(/\s/g,"_") : "";
		const recurtermine = (casus, ligeoj, nrecu) => console.log(casus, ligeoj.slice(0,144), nrecu) ||
			new Promise((resolve,reject) => casus? resolve([ligeoj, nrecu]) : reject([ligeoj, nrecu]));
		const recurtermess = (nrecu, head = "", url = "") => {
			let str =`\nwikiFetchInner_${nrecu}(${head?.split("\n")[0].slice(0,44)})...${url}`; return console.log(str) || str;}
		// local annex: schema.startsWith("#") -> page#schema. / processed if BS-table has been found first
		console.log(content.slice(0,5000),"==========\n");
		if(wikisMissing(content)) return void recurtermess(nrecu, content, "missing") || recurtermine(true, parseInfoboxNEW(ligeoj,"missing"), nrecu);
		if(wikihastable(content)) return void recurtermess(nrecu, content, "tableOk") || recurtermine(true, parseInfoboxNEW(ligeoj,wikihastable(content)), nrecu);
		if(wikihasannex(content)) return void recurtermess(nrecu, content, "annex->") || recurtermine(false, wikihasannex(content), nrecu);
		if(wikihasredir(content)) return void recurtermess(nrecu, content, "redir->") || recurtermine(false, wikihasredir(content), nrecu);
		else return void recurtermess(nrecu, content, "notable") || recurtermine(true, parseInfoboxNEW(ligeoj, "no table found"), nrecu);
	}
	// runtime: ligeoj is partial at first call, fully set for second, (almost) no third call should be allowed
	ligeoj.nrecu = ligeoj.nrecu || 0;
	import('node-fetch').then(obj => fetch)
	.catch(err => console.error( "no such module"));
	return void console.log(`\n\nwikiFetchOuter_${nrecu++}(${wiki?.slice(0,77)}): ...`) ||
		void (nrecu += 1) || void (ligeoj.nrecu = nrecu) ||
		(typeof wiki === "string" && wiki.length > 4)?
		fetch(wikiLinkNEW(wiki)) // recurs down
		.then(a => a.json())
		.then(b => wikiFetchInner(wiki, afterPrefix(b), ligneojson, nrecu))
		.then(([res, nr]) => saveData(res), ([res, nr]) => wikiFetchNEU(res, ligneojson, nr))
	//	.then(c => saveData(fileIbox, parseInfoboxNEW(ligneojson)))
		.then(c => void console.log("-- wikiFetchOuter_ -- -- -- --", typeof c, --nrecu) || Promise.resolve("ok"))
		.catch(err => console.log(`\nERROR wikiFetchOuter_${nrecu}(${wiki?.slice(0,44)}): ${err}`)) //* || saveData(fileIbox, ligneojson)
		: Promise.resolve(nrecu); // recurs up
	}
// run
	return void console.log(`\n\n wikipediaFetch(${noml},${numl},${countrycode}): (${noml?.slice(0,99)}): ...`) ||
		(typeof noml === "string" && noml.length > 4 ?
			(countrycode==="fr" || countrycode==="be" || countrycode==="lu" ?
				wikiFetchNEU(noml, {noml, numl, countrycode, "nrecu":0}) :
				console.log("wikipediaFetch failure")) :
			console.log("wikipediaFetch BIGger failure"));
}

/* function wikiFetchNEW(wiki, ligneojson, level)
 * @param{string} name of the page, or text to browse (starts at noml)
 * @param{object} {noml: "name_ol_line", numl: "num_of_line", cc: "country_code"}
 * @param{number} recursion level: starts at zero, incremented, then decremented back to 0
 */
function wikiFetchNEW(wiki, ligneojson, nrecu = 0){
	const uic_code = (cc) => cc==="be"? "88" : (cc==="lu"? "82": "87"); // To Be Continued
	const langcode = (cc) => (cc==="be" || cc==="lu" || cc==="fr")? "fr": cc; // To Be Continued
	const uicofnum = (uicc,num,km) => `${uicc}${uicc==="87"? num.split("000")[0] : num}_${km}`;
	function parseInfoboxNEW(ligneojson, table){
// * @param{object} passed thru information
// * @param{string} text (BS-table) to be parsed
// * @returns{string} a JSON string: array of all "gares" for the "ligne"
	function columnize(line){ // returns an array of 'cols'
		const intBegEnd = (line,beg,end,reducer) => {
			const inner = (y) => y[0] && y[0].split("|").reduce(reducer, "") + (y[1] || ""); //  TO DO !!!!!!!!!!
			const outer = (x) => x[0] + (x[1] && inner(x[1].split(end)));
			const svral = (s) => s.includes(beg)? outer(s.split(beg)) : s;
			const svrec = (s,snew) => s===snew? s : svral(snew);
			return svrec(line,svral(line)); //line.includes(beg)? outer(line.split(beg)) : line;
		}; // sub-processes to handle cases with possible inner '|' not to be considered by final split("|")
		const reduce_BL = (acc,y,i,t) => acc + (i?"/":"") + y;
		const reduce_KM = (acc,y,i,t) => acc + (i? t[0] +"/"+ t[1].replace(/,/g,"+") : ""); //  /^\d{1,3},[\dx]{3}$/
		const reduce_WL = (acc,y,i,t) => acc + (t.length===1? y : (i===1? y +"/"+ t[0] : ""));
		const reduce_RF = (acc,y,i,t) => acc + (i? "" : " Ref. ");
		const reduce_CN = (acc,y,i,t) => acc + (i? "" : "chaînage:"+y);
		const remove_CN = (line) => intBegEnd(line,"{{BS chaînage|","}}",reduce_CN);
		const remove_BL = (line) => intBegEnd(line,"{{BS-lien|","}}",reduce_BL);
		const remove_KM = (line) => intBegEnd(line,"{{BSkm|","}}",reduce_KM);
		const remove_W1 = (line) => intBegEnd(line,"''[[","]]''",reduce_WL);
		const remove_W2 = (line) => intBegEnd(line,"[[","]]",reduce_WL);
		const remove_RF = (line) => intBegEnd(line,"<ref>","</ref>",reduce_RF);
		const unmodeliz = (line) => line.slice(4,-2); // removes initial "{{BS" and trailing "}}"
		return unmodeliz(remove_CN(remove_W2(remove_W1(remove_BL(remove_KM(remove_RF(line))))))).split("|");
	}
	function swatchify(cols){ // returns a filtered array, starting at "pk"
		const unitalic1 = (col) => (col.startsWith("'") && col.endsWith("'")? col.slice(1,-1) : col);
		const unitalics = (col) => (col.startsWith("''") && col.endsWith("''")? col.slice(2,-2) : col);
		const get_pkind = (cols) => cols.findIndex(c => c.match(/^\d{1,3},[\dx]{3}/)); // get rank of "nn,mxx", if any pk format
		const get_bsind = (cols) => (parseInt(cols[0]) || 0) +1; // get n in "{{BSn*bis ... }}"
		const indofcols = (cols,pkind) => pkind >= 0? pkind : get_bsind(cols); // index of 1st usable col, using pk (best), or bs
		const mindex_ok = (col) => !col || (col.charCodeAt(0)> 47 && col?.charCodeAt(0) < 58); // if bs uncertain, try next
		const filterify = (n) => (x,i,t) => mindex_ok(t[n])? (i >= n) && (t[n]+t[n+1]).length > 0 : (i >= ++n) && (t[n]+t[n+1]).length > 0;
		return cols.map(unitalics).map(unitalic1).filter(filterify(indofcols(cols, get_pkind(cols))));
	}
	const updatjson = (sp,y,i) => { // returns a geojson property equivalent
		const nom = lib => // ouvrages d'art (X) et bifurcations (Y)
			["Tunnel","Viaduc d","Viaduc s","Pont sur","Pont d"].some(x => lib?.startsWith(x))? "X"
			: (["Ligne ","Bifurcation","Bif "].some(x => lib?.startsWith(x))? "Y"
			: lib);
		const addinfova = (spi,y) => spi? (spi += (y?(" "+y):"")) : ""; //(spi = (y?(y+" "):"") +"ajout?"+(sp.pk==="0"?" PK?":""));
		if(!y) return sp;
		if(i===0) return void (sp.pk = y.replace(",","+")) || sp;
		if(i===1) return void ((sp.id = y.split("/")[0]) && (sp.info = addinfova(sp.info, y.split("/")[1]||""))) || sp;
		return void (sp.info = addinfova(sp.info, y)) || sp;
	};
	const geojsonln = (x) => `\n{"properties":${JSON.stringify(x)}, "type":"Feature","geometry":{"type":"Point","coordinates":[88888]}},`;
	const geojsongg = (x) => `\n${JSON.stringify(x)},`;
	const geojsonga = (x) => ({"properties":x, "type":"Feature","geometry":{"type":"Point","coordinates":[88888]}});
	const propsline = (lgj) => ({"id":"www","uic":""+lgj.code_uic+lgj.numl+"_", "num":lgj.numl,"pk":"000","use":"NN"});
//	const OLD_propsline = (lgj) => ({"id":"www","uic":""+lgj.code_uic+lgj.numl+"_a", "num":lgj.numl,"pk":"0","use":"NN","info":"gg"});
	const missingli = (lgj) => void (lgj.schema_BS= "missing") || lgj;
	const getaTable = (src) => (src?.split("\n").length > 1)? src.split("\n") : null;
	const line2prop = (line) => swatchify(columnize(line)).reduce((ac,y,i) => updatjson(ac,y,i), propsline(ligneojson));
	const rest_info = (info) => info? " "+info : "";
	const specfirst = (line) => void (line.properties.info = "origin:"+ligneojson.noml+rest_info(line.properties.info)) || line;
	const specilast = (line) => void (line.properties.info = "terminus"+rest_info(line.properties.info)) || line;
	console.log(`parseInfoboxNEW( ${ligneojson.numl}, ${ligneojson.noml}, ${ligneojson.code_uic} )`);
	if(table.includes("\n")) return true &&
		getaTable(table)?.map(line2prop) // if ok, map candidate "gares" for that "ligne", + filter out 'wrong' candidates
		.filter((fp,i) => (fp.pk !== "000" || fp.id !== "www") &&
			(void console.log(`num:${fp.num}, pk:${fp.pk}, id:${fp.id}, info:${fp.info}`) || true))
	//	.reduce((ac,x)=> ac + geojsonln(x), `\n\n${JSON.stringify(ligneojson)},`);
		.reduce((ac,x)=> void ac.push( geojsonga(x) ) || ac, [])
		.map(x => void (x.properties.pk = updatePK(x.properties.pk)) || x)
		.map(x => void (x.properties.uic = uicofnum(ligneojson.code_uic, ligneojson.numl, Math.round(x.properties.pk))) || x)
		.reduce((ac,x,i,t) => ac + (i==0? geojsongg(specfirst(x)) : (i==t.length-1? geojsongg(specilast(x)) : geojsongg(x))), "")
	//								.replace(" gg","").replace("gg ",""), "");
	//	.reduce((ac,x,i,t) => ac + (i==0? geojsongg(specfirst(x)) : (i==t.length-1? geojsongg(specilast(x)) : geojsongg(x)))
	//								.replace(" gg","").replace("gg ",""), "");
	else return void console.log(`MISSING: ${ligneojson.numl}:${ligneojson.noml}`) || `\n\n${JSON.stringify(missingli(ligneojson))}`;
	}
	function wikiLinkNEW(page, langcode = "fr"){ // todo: possible use with a different langcode
		const cleanLink = (page) => page.replace(/\s/g,"_").replace(/St-/g,"Saint-").replace(/Ste-/g,"Sainte-");
		const end_Point = (code) => "https://**.wikipedia.org/w/api.php".replace("**",code);
		const queryPage = (page) => "?action=query&prop=revisions&rvslots=*&rvprop=content&formatversion=2&format=json&rvsection=0&titles=**".replace("**",page);
		return end_Point(langcode) + queryPage(encodeURIComponent(cleanLink(page)));
	}
	function afterPrefix(res){ // works for both old- and slots- styles
// * @param{object} json wikimedia-style
// * @returns{string} depending on: pp[0].missing===true : just drop it
// *    pp[0].revisions[0].slots.main.content === "#REDIRECTION [[ xxx ]]" : ... new xxx link
		let pp = res.query.pages;
		return (Array.isArray(pp))?
		(pp[0].missing===true? "missing" : pp[0].revisions[0].slots.main.content)
		: void console.log() || Object.values(pp).find(s => s.revisions[0]).revisions[0]["*"];
	}
	function wikiFetchInner(wiki, content, ligeoj, nrecu){
// * @param{string} wikipedia page name
// * @param{string} "missing" | has BStable: terminates , has redirect | has schema2: recurs , null | unknown: throws
// * @param{object} keeping recurring info
// * @param{number} count recurs
// * @returns{string}
		const wikisMissing = s => s === "missing" && "missing";
		const wikihastable = s =>
			(s?.split("{{BS-table}}\n")[1]?.split("\n{{BS-table-fin}}")[0].trim()) ||
			(s?.split("{{BS-table|}}\n")[1]?.split("\n{{BS-table-fin}}")[0].trim()) ||
			(s?.split("{{BS-init}}\n")[1]?.split("\n{{BS-fin}}")[0].trim()) || "";
		//const terminator = s => s === "missing"? "missing" : (/^{{BS-\w+}}/.test(s)? wikihastable(s) : false);
		const wikihasredir = s => s?.includes("#REDIRECTION")? s.split("#REDIRECTION")[1]?.split("[[")[1].split("]]")[0].trim() : "";
		const wikihasannex = s => s?.includes("sch\u00e9ma2")? s.split("sch\u00e9ma2")[1]?.split("=")[1].split("\n")[0].trim().replace(/\s/g,"_") :
									(s?.includes("sch\u00e9ma")? s.split("sch\u00e9ma")[1]?.split("=")[1].split("\n")[0].trim().replace(/\s/g,"_") :"");
		const recurtermine = (casus, lgj, nrecu) => console.log("recurtermine", typeof lgj) ||
			void (typeof lgj === "object"? lgj.nrecu = nrecu : 0) ||
			new Promise((resolve,reject) => casus? resolve([lgj, nrecu]) : reject([lgj, nrecu]));
		const recurtermess = (nrecu, head = "", url = "") => console.log("recurtermess", typeof head) ||
			`\nwikiFetchInner_${nrecu}(${head?.split("\n")[0].slice(0,44)})...${url}`;
		// local annex: schema.startsWith("#") -> page#schema.
		// That case is processed if BS-table has been found first
		if(wikisMissing(content)) return void recurtermess(nrecu, content, "missing") || recurtermine(true, parseInfoboxNEW(ligeoj,"missing"), nrecu);
		if(wikihastable(content)) return void recurtermess(nrecu, content, "tableOk") || recurtermine(true, parseInfoboxNEW(ligeoj,wikihastable(content)), nrecu);
		if(wikihasannex(content)) return void recurtermess(nrecu, content, "annex->") || recurtermine(false, wikihasannex(content), nrecu);
		if(wikihasredir(content)) return void recurtermess(nrecu, content, "redir->") || recurtermine(false, wikihasredir(content), nrecu);
		else return void recurtermess(nrecu, content, "notable") || recurtermine(true, parseInfoboxNEW(ligeoj, "no table found"), nrecu);
	}
	function finalizeData(data){
		if(typeof data === "string") return Promise.resolve(JSON.parse(`[${data.slice(-data.length, -1)}]`));
		else return console.log(`error exiting wikiFetchNEW ${typeof data} ${data.length}`) || data;
	}
	// runtime: options is undefined for first call, fully set for second, (almost) no third call should be allowed
	console.log(`\n >>>>> wikiFetchNEW (${wiki}, ${JSON.stringify(ligneojson)}, ${nrecu})`);
	import('node-fetch').then(obj => fetch)
	.catch(err => console.error( "no such module"));
	return void console.log(`\n\nwikiFetchOuter_${nrecu++}(${wiki?.slice(0,77)}): ...`) ||
		(typeof wiki === "string" && wiki.length > 4)?
		fetch(wikiLinkNEW(wiki, ligneojson.wiki_code||"fr")) // recurs down
		.then(	a => a.json())
		.then(	b => void (ligneojson.nrecu = nrecu) || wikiFetchInner(wiki, afterPrefix(b), ligneojson, nrecu))
		.then(	([res, nr]) => finalizeData(res), ([res, nr]) => wikiFetchNEW(res, ligneojson, nr))
		.catch(err => console.log(`\nERROR wikiFetchOuter_${nrecu}(${wiki?.slice(0,44)}): ${err}`))
		: Promise.resolve(nrecu); // recurs up
}

function doesURLexist(url, alturl, callback, fallback){
	const request = new XMLHttpRequest();
	request.open('GET', url, true);
	request.onreadystatechange = function(){
		if (request.readyState === 4){
			if (request.status >= 400)
				return alturl? doesURLexist(alturl, null, callback) : fallback(url);
		}
	};
	request.send();
}

/* **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** *\
 * Finds the shortest distance between two nodes using the A-star (A*) algorithm
 * @param graph an adjacency-matrix-representation of the graph where (x,y) is the weight of the edge or 0 if there is no edge.
 * @param heuristic an estimation of distance from node x to y that is guaranteed to be lower than the actual distance. E.g. straight-line distance
 * @param start the node to start from.
 * @param goal the node we're searching for
 * @return The shortest distance to the goal node. Can be easily modified to return the path.
 */
function aStar (graph, start, goal) {
	// precompute heuristic matrix for all i in graph to given goal
	const heuristic = graph.map((f,i) => Math.floor(distanceGreatCircleInKm2(f.xy, goal.xy))); // integer KM
    //Initializes the priorities with which to visit the nodes: start node has a priority equal to straight line distance to goal.
	const MAXKM = 3 * heuristic[start.rk];
	const MINKM = 0.05; // 50m from the goal
	const priorities = graph.map((f,i) => i === start.rk ? heuristic[i] : MAXKM);
    //Initializes the MAX distances from the start node to all other nodes (NOW: 3 times heuristic[i]): start node has a distances equal to zero.
	const distances = graph.map((f,i) => i === start.rk ? 0.0 : MAXKM);
    //This contains whether a node was already visited
    const visited = [];
	const predecessor = [];
    //While there are nodes left to visit...
    while (true) {
        // ... find the node with the currently lowest priority...
        let lowestPriority = MAXKM;
        let lowestPriorityIndex = -1;
		// update priorities ... by going through all nodes that haven't been visited yet, starting at "start"
		priorities.forEach((p,i) => (p < lowestPriority && !visited[i])? void (lowestPriority = p) || void (lowestPriorityIndex = i): undefined);
		// check whether algorithm is over
        if (lowestPriorityIndex === -1) return console.log("SORRY: Node not found") || -1; // every node as been already visited: not found
		if (lowestPriorityIndex === goal.rk) {
			const path = [];
			return console.log(`you reached ${graph[lowestPriorityIndex].id} at ${distances[lowestPriorityIndex]}km`) ||
				console.log(`predecessors: ${predecessor.map((p,i) => p?i:-1).filter(i => i >= 0).join()}`) || distances[lowestPriorityIndex];
        }
        //...then, for all neighboring nodes that haven't been visited yet....
		let neighboring = graph[lowestPriorityIndex].neighbors;
        console.log(`Visiting node ${lowestPriorityIndex}:${graph[lowestPriorityIndex].id} with currently lowest priority=${lowestPriority} among ${neighboring.map(f => f.rk).join()}`);
        for (let j = 0; j < neighboring.length; j++) {
			let i = neighboring[j].rk;
            if (!visited[i]) {
				if (neighboring[j].dh < MINKM)
					return console.log(`you reached ${graph[i].id} at ${distances[i]}km`) ||
						console.log(`predecessors: ${predecessor.join()}`) || distances[i];
			//	console.log(`Trying node-${i}:${graph[i].id}`);
                //...if the path over this edge is shorter...
                if (distances[lowestPriorityIndex] + neighboring[j].dh < distances[i]) {
                    //...save this path as new shortest path
                    distances[i] = distances[lowestPriorityIndex] + neighboring[j].dh;
                    //...and set the priority with which we should continue with this node
                    priorities[i] = distances[i] + heuristic[i];
                    console.log(`Updating distance of node-${i}:${graph[i].id} to ${distances[i]} + ${heuristic[i]} = ${priorities[i]}`);
                }
            }
        }
        // ... last in while loop: mark this node as visited
        visited[lowestPriorityIndex] = true;
		predecessor[lowestPriorityIndex] = true;
        //console.log("Visited nodes: " + visited);
        //console.log("Currently lowest distances: " + distances);
    }
};
const aStarORIGINAL = function (graph, heuristic, start, goal) {
	// (c) code from: https://www.algorithms-and-technologies.com/a_star/javascript
	// precompute heuristic matrix for all i in graph to given goal
	const heuristicToGoal = graph.map(f => distanceGreatCircleInKm2(f.geometry.coordinates,goal.geometry.coordinates));
    //This contains the distances from the start node to all other nodes
    var distances = [];
    //Initializing with a distance of "Infinity"
    for (var i = 0; i < graph.length; i++) distances[i] = Number.MAX_VALUE;
    //The distance from the start node to itself is of course 0
    distances[start] = 0;

    //This contains the priorities with which to visit the nodes, calculated using the heuristic.
    var priorities = [];
    //Initializing with a priority of "Infinity"
    for (var i = 0; i < graph.length; i++) priorities[i] = Number.MAX_VALUE;
    //start node has a priority equal to straight line distance to goal. It will be the first to be expanded.
    priorities[start] = heuristic[start][goal];

    //This contains whether a node was already visited
    var visited = [];

    //While there are nodes left to visit...
    while (true) {

        // ... find the node with the currently lowest priority...
        var lowestPriority = Number.MAX_VALUE;
        var lowestPriorityIndex = -1;
        for (var i = 0; i < priorities.length; i++) {
            //... by going through all nodes that haven't been visited yet
            if (priorities[i] < lowestPriority && !visited[i]) {
                lowestPriority = priorities[i];
                lowestPriorityIndex = i;
            }
        }

        if (lowestPriorityIndex === -1) {
            // There was no node not yet visited --> Node not found
            return -1;
        } else if (lowestPriorityIndex === goal) {
            // Goal node found
            // console.log("Goal node found!");
            return distances[lowestPriorityIndex];
        }

        // console.log("Visiting node " + lowestPriorityIndex + " with currently lowest priority of " + lowestPriority);

        //...then, for all neighboring nodes that haven't been visited yet....
        for (var i = 0; i < graph[lowestPriorityIndex].length; i++) {
            if (graph[lowestPriorityIndex][i] !== 0 && !visited[i]) {
                //...if the path over this edge is shorter...
                if (distances[lowestPriorityIndex] + graph[lowestPriorityIndex][i] < distances[i]) {
                    //...save this path as new shortest path
                    distances[i] = distances[lowestPriorityIndex] + graph[lowestPriorityIndex][i];
                    //...and set the priority with which we should continue with this node
                    priorities[i] = distances[i] + heuristic[i][goal];
                    // console.log("Updating distance of node " + i + " to " + distances[i] + " and priority to " + priorities[i]);
                }
            }
        }

        // Lastly, note that we are finished with this node.
        visited[lowestPriorityIndex] = true;
        //console.log("Visited nodes: " + visited);
        //console.log("Currently lowest distances: " + distances);

    }
};



/* **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** *\
 * line by line data: num, line identity, validTo date, web doc ...
 */
function getLineInfoFR(subset) {
    const lineOff = [
        {"num":"001000", "g":1435, "len":490.9, "use":"EXP", "lid":"Ligne_de_Paris-Est_à_Mulhouse-Ville", "sa":"Ligne_Paris-Est_-_Mulhouse-Ville"}, 
        {"num":"001306", "g":1435, "pk0":2.35, "pkf":2.58, "len":0.23, "use":"EXP", "lid":"#Shunt_Évangile", "sa":"Ligne_Paris-Est_-_Mulhouse-Ville#Raccordement_de_l'Évangile"}, 
        {"num":"001379", "g":1435, "len":1.99, "use":"EXP", "lid":"#Shunt_EOLE_Paris-Mulhouse", "sa":"Ligne_Paris-Est_-_Mulhouse-Ville#Raccordement_de_la_ligne_EOLE_à_la_ligne_Paris-Mulhouse"}, 
        {"num":"001391", "g":1435, "len":1.12, "use":"EXP", "lid":"Raccordement_court_de_Mulhouse", "sa":"Ligne_Paris-Est_-_Mulhouse-Ville#Raccordement_court_de_Mulhouse"}, 
        {"num":"001606", "g":1435, "len":7, "use":"FD", "end":"2005", "lid":"#VM_d'Émerainville_-_Pontault-Combault", "sa":"Ligne_Paris-Est_-_Mulhouse-Ville#Voie-mère_d'Émerainville-Pontault-Combault", "af":[1403]}, 
        {"num":"001699", "g":1435, "len":3.2, "use":"FD", "end":"1950", "lid":"#VM_Montreux-Vieux_à_Foussemagne", "sa":"Ligne_Paris-Est_-_Mulhouse-Ville#Voie-mère_de_Montreux-Vieux_à_Foussemagne"}, 
        {"num":"002000", "g":1435, "pk0":38.32, "pkf":131.72, "len":93.4, "use":"FD", "end":"2000", "lid":"Ligne_de_Gretz-Armainvilliers_à_Sézanne", "sa":"Ligne_Gretz-Armainvilliers_-_Sézanne", "af":[991]}, 
        {"num":"003000", "g":1435, "pk0":88.18, "pkf":127.6, "len":39.42, "use":"FD", "end":"1969-2005", "lid":"Ligne_de_Longueville_à_Esternay", "sa":"Ligne_Longueville_-_Esternay", "af":[992]}, 
        {"num":"004000", "g":1435, "len":78.67, "use":"FD", "end":"1991", "lid":"Ligne_de_Mézy_à_Romilly-sur-Seine", "sa":"Ligne_Mézy_-_Romilly-sur-Seine", "af":[1005]}, 
        {"num":"004306", "g":1435, "pk0":77.11, "pkf":77.94, "len":0.83, "use":"FD", "end":"1964", "lid":"#Shunt_Romilly-sur-Seine", "sa":"Ligne_Mézy_-_Romilly-sur-Seine#Raccordement_de_Romilly-sur-Seine"}, 
        {"num":"005000", "g":1435, "len":405.82, "use":"EXP", "lid":"Ligne_de_Paris_à_Strasbourg_(LGV)", "sa":"LGV_Est-Européenne"}, 
        {"num":"005300", "g":1435, "len":2.86, "use":"EXP", "lid":"#Shunt_Troyes-Preize", "sa":"Ligne_Coolus_-_Sens#Raccordements_de_Troyes-Preize"}, 
        {"num":"005315", "g":1435, "len":3.57, "use":"EXP", "lid":"#Shunt_Trois_Puits", "sa":"LGV_Est-Européenne#Raccordement_des_Trois_Puits"}, 
        {"num":"005329", "g":1435, "len":1.99, "use":"EXP", "lid":"#Shunt_Châlons_Nord", "sa":"LGV_Est-Européenne#Raccordement_de_Châlons_Nord"}, 
        {"num":"005330", "g":1435, "len":1.24, "use":"EXP", "lid":"#Shunt_Châlons_Sud", "sa":"LGV_Est-Européenne#Raccordement_de_Châlons_Sud"}, 
        {"num":"005340", "g":1435, "len":3.63, "use":"EXP", "lid":"#Shunt_Vandières", "sa":"LGV_Est-Européenne#Raccordement_de_Vandières"}, 
        {"num":"005341", "g":1435, "len":3.32, "use":"EXP", "lid":"#Shunt_Pagny", "sa":"LGV_Est-Européenne#Raccordement_de_Pagny"}, 
        {"num":"005343", "g":1435, "len":5.2, "use":"EXP", "lid":"#Shunt_Baudrecourt", "sa":"LGV_Est-Européenne#Raccordement_de_Baudrecourt"}, 
        {"num":"005345", "g":1435, "len":4.5, "use":"EXP", "lid":"#Shunt_Herny", "sa":"LGV_Est-Européenne#Raccordement_de_Herny"}, 
        {"num":"005390", "g":1435, "pk0":405.82, "pkf":408, "len":2.18, "use":"EXP", "lid":"#Shunt_Vendenheim", "sa":"LGV_Est-Européenne#Raccordement_de_Vendenheim"}, 
        {"num":"006000", "g":1435, "len":157.1, "use":"FD", "end":"2015", "lid":"Ligne_de_Coolus_à_Sens", "sa":"Ligne_Coolus_-_Sens", "af":[1006, 1012]}, 
        {"num":"006511", "g":1435, "pk0":154.93, "pkf":155.9, "len":0.97, "use":"FD", "end":"1998", "lid":"#VP_Sens-St-Clément", "sa":"Ligne_Coolus_-_Sens#Voie_de_port_de_Sens-Saint-Clément"}, 
        {"num":"007000", "g":1435, "len":50.47, "use":"FD", "end":"1978", "lid":"Ligne_de_Fère-Champenoise_à_Vitry-le-François", "sa":"Ligne_Fère-Champenoise_-_Vitry-le-François", "lo":"vitry1", "af":[1020]}, 
        {"num":"007399", "g":1435, "len":0.8, "use":"FD", "end":"1964", "lid":"#Shunt_Fère-Champenoise", "sa":"Ligne_Fère-Champenoise_-_Vitry-le-François#Raccordement_de_Fère-Champenoise"}, 
        {"num":"008300", "g":1435, "len":1.38, "use":"FD", "end":"2000", "lid":"#Shunt_Sommesous_n°_2", "sa":"Ligne_Fère-Champenoise_-_Vitry-le-François#Raccordements_de_Sommesous"}, 
        {"num":"010000", "g":1435, "pk0":1.3, "pkf":83.9, "len":82.6, "use":"FD", "end":"2014", "lid":"Ligne_de_Oiry_-_Mareuil_à_Romilly-sur-Seine", "sa":"Ligne_Oiry-Mareuil_-_Romilly-sur-Seine", "af":[1004]}, 
        {"num":"010306", "g":1435, "pk0":0.08, "pkf":0.88, "len":0.8, "use":"FD", "end":"??", "lid":"#Shunt_Oiry-Mareuil", "sa":"Ligne_Oiry-Mareuil_-_Romilly-sur-Seine#Raccordement_d'Oiry-Mareuil"}, 
        {"num":"012000", "g":1435, "pk0":170, "pkf":208.11, "len":38.11, "use":"EXP", "lid":"Ligne_de_Troyes_à_Brienne-le-Château", "sa":"Ligne_Saint-Julien-les-Villas_-_Brienne-le-Château"}, 
        {"num":"013000", "g":1435, "pk0":0.05, "pkf":33.05, "len":33, "use":"EXP", "lid":"Ligne_de_Vallentigny_à_Vitry-le-François", "sa":"Ligne_Vallentigny-Maizières_-_Vitry-le-François"}, 
        {"num":"014000", "g":1435, "pk0":0.8, "pkf":134.48, "len":133.68, "use":"EXP", "lid":"Ligne_Rhin-Rhône_(LGV)", "sa":"LGV_Rhin-Rhône_Branche-Est"}, 
        {"num":"014300", "g":1435, "len":2.89, "use":"EXP", "lid":"#Shunt_Ouest_Besançon_TGV", "sa":"LGV_Rhin-Rhône_Branche-Est#Raccordement_Ouest_Besançon_TGV"}, 
        {"num":"014330", "g":1435, "len":3.06, "use":"EXP", "lid":"#Shunt_Petit-Croix", "sa":"LGV_Rhin-Rhône_Branche-Est#Raccordement_de_Petit-Croix"}, 
        {"num":"015000", "g":1435, "pk0":209.99, "pkf":348.1, "len":138.11, "use":"FD", "end":"1970", "lid":"Ligne_de_Jessains_à_Sorcy", "sa":"Ligne_Jessains_-_Sorcy", "af":[997, 998]}, 
        {"num":"016000", "g":1435, "pk0":245.71, "pkf":263.23, "len":17.52, "use":"FD", "end":"1993", "lid":"Ligne_de_Montier-en-Der_à_Éclaron", "sa":"Ligne_Montier-en-Der_-_Eclaron", "af":[999]}, 
        {"num":"018000", "g":1435, "pk0":235.34, "pkf":273.74, "len":38.4, "use":"FD", "end":"1994", "lid":"Ligne_de_Saint-Dizier_à_Doulevant-le-Château", "sa":"Ligne_Saint-Dizier_-_Doulevant-le-Château", "af":[1000]}, 
        {"num":"019000", "g":1435, "pk0":1, "pkf":27.72, "len":26.72, "use":"FD", "end":"1976", "lid":"Ligne_de_Revigny_à_Saint-Dizier", "sa":"Ligne_Revigny_-_Saint-Dizier", "af":[1001]}, 
        {"num":"020000", "g":1435, "pk0":217.11, "pkf":304.66, "len":87.55, "use":"EXP", "lid":"Ligne_de_Blesme_-_Haussignémont_à_Chaumont", "sa":"Ligne_Blesme-Haussignémont_-_Chaumont"}, 
        {"num":"020311", "g":1435, "pk0":302.25, "pkf":303.63, "len":1.38, "use":"FD", "end":"??", "lid":"#Shunt_Chaumont", "sa":"Ligne_Blesme-Haussignémont_-_Chaumont#Raccordement_de_Chaumont"}, 
        {"num":"021300", "g":1435, "pk0":0.13, "pkf":3.26, "len":3.13, "use":"FD", "end":"??", "lid":"#Shunt_Revigny_n°_3", "sa":"Ligne_Amagne-Lucquy_-_Revigny#Raccordements_de_Revigny"}, 
        {"num":"022300", "g":1435, "len":2.62, "use":"FD", "end":"??", "lid":"#Shunt_Blesme-Haussignémont", "sa":"Ligne_Blesme-Haussignémont_-_Chaumont#Raccordement_direct_de_Blesme-Haussignémont"}, 
        {"num":"026000", "g":1435, "len":94.92, "use":"FD", "end":"1992", "lid":"Ligne_de_Bologne_à_Pagny-sur-Meuse", "sa":"Ligne_Bologne_-_Pagny-sur-Meuse", "af":[1291, 1293]}, 
        {"num":"027000", "g":1435, "len":67, "use":"FD", "end":"1976", "lid":"Ligne_de_Nançois_-_Tronville_à_Neufchâteau", "sa":"Ligne_Nançois-Tronville_-_Neufchâteau", "af":[1294]}, 
        {"num":"028300", "g":1435, "pk0":0.14, "pkf":2, "len":1.86, "use":"FD", "end":"??", "lid":"#Shunt_Gondrecourt-le-Château_n°_1", "sa":"Ligne_Nançois-Tronville_-_Neufchâteau#Raccordements_de_Gondrecourt-le-Château"}, 
        {"num":"030000", "g":1435, "pk0":48.9, "pkf":124, "len":75.1, "use":"x", "end":"no:60%1994", "lid":"Ligne_de_Neufchâteau_à_Épinal", "sa":"Ligne_Neufchâteau_-_Épinal", "af":[1290]}, 
        {"num":"031950", "g":1435, "len":1.88, "use":"EXP", "lid":"#Saut-de-mouton_de_Chaudenay", "sa":"Ligne_Culmont-Chalindrey_-_Toul#Saut-de-mouton_de_Chaudenay"}, 
        {"num":"032000", "g":1435, "len":114.01, "use":"EXP", "lid":"Ligne_de_Culmont-Chalindrey_à_Toul", "sa":"Ligne_Chaudenay_-_Toul"}, 
        {"num":"033000", "g":1435, "len":17.13, "use":"FD", "end":"1988", "lid":"Ligne_de_Langres_à_Andilly-en-Bassigny", "sa":"Ligne_Langres_-_Andilly", "lo":"andilly", "af":[949]}, 
        {"num":"035000", "g":1435, "pk0":30.37, "pkf":88.31, "len":57.94, "use":"EXP", "lid":"Ligne_de_Merrey_à_Hymont_-_Mattaincourt", "sa":"Ligne_Merrey_-_Hymont-Mattaincourt"}, 
        {"num":"036300", "g":1435, "pk0":4.17, "pkf":10.5, "len":6.33, "use":"FD", "end":"??", "lid":"#Contournement_de_Toul", "sa":"Ligne_Toul_-_Rosières-aux-Salines#Raccordements_de_Toul", "af":[1305]}, 
        {"num":"037300", "g":1435, "len":1.38, "use":"FD", "end":"??", "lid":"#Shunt_Toul_n°_3", "sa":"Ligne_Toul_-_Rosières-aux-Salines#Raccordements_de_Toul", "af":[1305]}, 
        {"num":"039000", "g":1435, "len":42.92, "use":"EXP", "lid":"Ligne_de_Toul_à_Rosières-aux-Salines", "sa":"Ligne_Toul_-_Rosières-aux-Salines", "af":[1305]}, 
        {"num":"039306", "g":1435, "len":0.6, "use":"NEUT", "lid":"#Shunt_Neuves-Maisons_n°_1", "sa":"Ligne_Toul_-_Rosières-aux-Salines#Raccordements_de_Neuves-Maisons"}, 
        {"num":"040000", "g":1435, "pk0":0.23, "pkf":57.13, "len":56.9, "use":"EXP", "lid":"Ligne_de_Jarville-la-Malgrange_à_Mirecourt", "sa":"Ligne_Jarville-la-Malgrange_-_Mirecourt"}, 
        {"num":"041000", "g":1435, "len":34.8, "use":"FD", "end":"1993", "lid":"Ligne_de_Barisey-la-Côte_à_Frenelle-la-Grande_-_Puzieux", "sa":"Ligne_Barisey-la-Côte_-_Frenelle-la-Grande-Puzieux", "af":[1292]}, 
        {"num":"042000", "g":1435, "len":125.5, "use":"EXP", "lid":"Ligne_de_Blainville_-_Damelevières_à_Lure", "sa":"Ligne_Blainville-Damelevières_-_Lure"}, 
        {"num":"043300", "g":1435, "len":1.59, "use":"FD", "end":"1994", "lid":"#Shunt_Blainville", "sa":"Ligne_Blainville-Damelevières_-_Lure#Raccordement_de_Blainville"}, 
        {"num":"050000", "g":1435, "pk0":338.75, "pkf":353.73, "len":14.98, "use":"FD", "end":"1991", "lid":"Ligne_de_Vitrey_-_Vernois_à_Bourbonne-les-Bains", "sa":"Ligne_Vitrey-Vernois_-_Bourbonne-les-Bains", "lo":"bourbonne", "af":[896]}, 
        {"num":"051000", "g":1435, "len":72.1, "use":"FD", "end":"1994", "lid":"Ligne_de_Jussey_à_Darnieulles_-_Uxegney", "sa":"Ligne_Jussey_-_Darnieulles-Uxegney", "lo":"darnieulles", "af":[894]}, 
        {"num":"052500", "g":1435, "pk0":66.43, "pkf":67.96, "len":1.53, "use":"FD", "end":"1994", "lid":"#VP_Girancourt", "sa":"Ligne_Jussey_-_Darnieulles-Uxegney#Embranchement_particulier_du_port_de_Girancourt"}, 
        {"num":"053000", "g":1435, "len":10.69, "use":"FD", "end":"1980", "lid":"Ligne_d'Aillevillers_à_Plombières-les-Bains", "sa":"Ligne_Aillevillers_-_Plombières-les-Bains", "lo":"plombieres", "af":[889]}, 
        {"num":"054000", "g":1435, "pk0":94.84, "pkf":113.48, "len":18.64, "use":"FD", "end":"1996", "lid":"Ligne_de_Corbenay_à_Faymont", "sa":"Ligne_Corbenay_-_Faymont", "lo":"faymont", "af":[890]}, 
        {"num":"055000", "g":1435, "pk0":435.83, "pkf":442.91, "len":7.08, "use":"EXP", "lid":"Ligne_de_Bas-Évette_à_Giromagny", "sa":"Ligne_Bas-Évette_-_Giromagny", "lo":"giromagny"}, 
        {"num":"056300", "g":1435, "pk0":0.02, "pkf":1.21, "len":1.19, "use":"FD", "end":"1989", "lid":"#Shunt_Golbey", "sa":"Ligne_Neufchâteau_-_Épinal#Raccordement_de_Golbey"}, 
        {"num":"057000", "g":1435, "pk0":94.9, "pkf":124.31, "len":29.41, "use":"FD", "end":"1998", "lid":"Ligne_d'Aillevillers_à_Port-d'Atelier-Amance", "sa":"Ligne_Aillevillers_-_Port-d'Atelier-Amance", "af":[888]}, 
        {"num":"057306", "g":1435, "len":0.69, "use":"FD", "end":"??", "lid":"#Shunt_Port-d'Atelier-Amance", "sa":"Ligne_Aillevillers_-_Port-d'Atelier-Amance#Raccordement_de_Port-d'Atelier-Amance"}, 
        {"num":"058300", "g":1435, "pk0":0.13, "pkf":3.96, "len":3.83, "use":"FD", "end":"1967", "lid":"#Shunt_Dinozé", "sa":"Ligne_Épinal_-_Bussang#Raccordements_d'Épinal"}, 
        {"num":"059910", "g":1435, "len":2.1, "use":"FD", "end":"1989", "lid":"#Boucle_de_Bertramenil", "sa":"Ligne_Épinal_-_Bussang#Raccordements_d'Épinal"}, 
        {"num":"060000", "g":1435, "pk0":3.69, "pkf":59.92, "len":56.23, "use":"FD", "end":"1993", "lid":"Ligne_d'Épinal_à_Bussang", "sa":"Ligne_Épinal_-_Bussang", "af":[1283]}, 
        {"num":"061000", "g":1435, "len":20.68, "use":"FD", "end":"1994", "lid":"Ligne_de_Remiremont_à_Cornimont", "sa":"Ligne_Remiremont_-_Cornimont", "af":[1284]}, 
        {"num":"062000", "g":1435, "len":48.93, "use":"EXP", "lid":"Ligne_d'Arches_à_Saint-Dié", "sa":"Ligne_Arches_-_Saint-Dié"}, 
        {"num":"062306", "g":1435, "len":0.97, "use":"FD", "end":"1992", "lid":"#Shunt_St-Dié", "sa":"Ligne_Arches_-_Saint-Dié#Raccordement_de_Saint-Dié"}, 
        {"num":"063000", "g":1435, "len":18, "use":"FD", "end":"2017", "lid":"Ligne_de_Laveline-devant-Bruyères_à_Gérardmer", "sa":"Ligne_Laveline-devant-Bruyères_-_Gérardmer", "af":[1286]}, 
        {"num":"064000", "g":1435, "len":7.44, "use":"FD", "end":"2005", "lid":"Ligne_de_Saint-Léonard_à_Fraize", "sa":"Ligne_Saint-Léonard_-_Fraize", "lo":"fraize", "af":[1408]}, 
        {"num":"065000", "g":1435, "len":54.62, "use":"FD", "end":"2018", "lid":"Ligne_de_Mont-sur-Meurthe_à_Bruyères", "sa":"Ligne_Mont-sur-Meurthe_-_Bruyères", "af":[1288]}, 
        {"num":"067000", "g":1435, "pk0":386, "pkf":435.7, "len":49.7, "use":"EXP", "lid":"Ligne_de_Lunéville_à_Saint-Dié", "sa":"Ligne_Lunéville_-_Saint-Dié"}, 
        {"num":"068000", "g":1435, "pk0":409.84, "pkf":423.39, "len":13.55, "use":"FD", "end":"1989", "lid":"Ligne_de_Baccarat_à_Badonviller", "sa":"Ligne_Baccarat_-_Badonviller", "lo":"badonviller", "af":[1280]}, 
        {"num":"069000", "g":1435, "pk0":0.08, "pkf":18.1, "len":18.02, "use":"FD", "end":"1970", "lid":"Ligne_d'Igney_-_Avricourt_à_Cirey", "sa":"Ligne_Igney-Avricourt_-_Cirey", "af":[1256]}, 
        {"num":"070000", "g":1435, "pk0":8.91, "pkf":502, "len":493.09, "use":"EXP", "lid":"Ligne_de_Noisy-le-Sec_à_Strasbourg-Ville", "sa":"Ligne_Noisy-le-Sec_-_Strasbourg-Ville"}, 
    
        {"num":"070326", "g":1435, "len":0.9, "use":"FD", "end":"1980?", "lid":"#Shunt_Coolus", "sa":"Ligne_Noisy-le-Sec_-_Strasbourg-Ville#Raccordement_de_Coolus"}, 
        {"num":"070331", "g":1435, "len":1.62, "use":"EXP", "lid":"#Shunt_Toul_n°_1", "sa":"Ligne_Noisy-le-Sec_-_Strasbourg-Ville#Raccordement_de_Toul"}, 
        {"num":"070336", "g":1435, "pk0":340.66, "pkf":343.28, "len":2.62, "use":"EXP", "lid":"#Shunt_Frouard", "sa":"Ligne_Noisy-le-Sec_-_Strasbourg-Ville#Raccordement_direct_de_Frouard"}, 
        {"num":"070338", "g":1435, "len":1.4, "use":"FD", "end":"1986", "lid":"#Shunt_Réchicourt-le-Château", "sa":"Ligne_Noisy-le-Sec_-_Strasbourg-Ville#Raccordement_de_Réchicourt-le-Château"}, 
        {"num":"070346", "g":1435, "len":1, "use":"EXP", "lid":"#Shunt_Strasbourg-Cronenbourg_à_Strasbourg-Ville, ", "sa":"Ligne_Noisy-le-Sec_-_Strasbourg-Ville#Raccordement_de_Strasbourg-Cronenbourg_à_Strasbourg-Ville, "}, 
        {"num":"070906", "g":1435, "len":1.3, "use":"VS", "lid":"#ITE_ZI_de_Chelles", "sa":"Ligne_Noisy-le-Sec_-_Strasbourg-Ville#Voie_de_desserte_des_embranchements_particuliers_de_la_ZI_de_Chelles"}, 
    
        {"num":"070908", "g":1435, "pk0":0.26, "pkf":6.04, "len":5.78, "use":"EXP", "lid":"#Boucle_de_Vaires", "sa":"Ligne_Noisy-le-Sec_-_Strasbourg-Ville#Boucle_de_Vaires"}, 
        {"num":"070953", "g":1435, "len":2.36, "use":"EXP", "lid":"#Saut-de-mouton_de_Toul", "sa":"Ligne_Noisy-le-Sec_-_Strasbourg-Ville#Saut-de-mouton_de_Toul"}, 
        {"num":"071000", "g":1435, "len":9.88, "use":"EXP", "lid":"Ligne_d'Esbly_à_Crécy-la-Chapelle", "sa":"Ligne_Esbly_-_Crécy-La_Chapelle"}, 
        {"num":"072000", "g":1435, "pk0":51.9, "pkf":124.3, "len":72.4, "use":"EXP", "lid":"Ligne_de_Trilport_à_Bazoches", "sa":"Ligne_Trilport_-_Bazoches"}, 
        {"num":"072311", "g":1435, "len":1.22, "use":"EXP", "lid":"Raccordement_d'Ocquerre", "sa":"Raccordement_d'Ocquerre"}, 
        {"num":"073000", "g":1435, "len":28.26, "use":"FD", "end":"1964", "lid":"Ligne_de_Château-Thierry_à_Oulchy_-_Breny", "sa":"Ligne_Château-Thierry_-_Oulchy-Breny", "af":[1091]}, 
        {"num":"074000", "g":1435, "pk0":142, "pkf":171.86, "len":29.86, "use":"EXP", "lid":"Ligne_d'Épernay_à_Reims", "sa":"Ligne_Epernay_-_Reims"}, 
        {"num":"074306", "g":1435, "len":0.7, "use":"EXP", "lid":"Raccordement_d'Épernay", "sa":"Raccordement_d'Épernay"}, 
        {"num":"076000", "g":1435, "pk0":14.12, "pkf":28.72, "len":14.6, "use":"EXP", "lid":"Ligne_d'Aulnay-sous-Bois_à_Roissy_2-RER", "sa":"Ligne_Aulnay-sous-Bois_-_Roissy_2-RER"}, 
        {"num":"078000", "g":1435, "pk0":348, "pkf":355.5, "len":7.5, "use":"FD", "end":"2001", "lid":"Ligne_de_Champigneulles_à_Houdemont", "sa":"Ligne_Champigneulles_-_Jarville-la-Malgrange", "af":[1463]}, 
        {"num":"081000", "g":1435, "pk0":169.9, "pkf":224.3, "len":54.4, "use":"EXP", "lid":"Ligne_de_Châlons-en-Champagne_à_Reims-Cérès", "sa":"Ligne_Châlons-en-Champagne_-_Reims"}, 
        {"num":"081311", "g":1435, "len":1.13, "use":"EXP", "lid":"Raccordement_de_Reims_n°_3", "sa":"Raccordement_de_Reims_n°_3"}, 
        {"num":"081316", "g":1435, "len":1.38, "use":"EXP", "lid":"Raccordement_de_Reims_n°_1", "sa":"Raccordement_de_Reims_n°_1"}, 
        {"num":"081606", "g":1435, "len":3.41, "use":"VS", "lid":"Voie-mère_nord_de_Reims-St-Léonard-Garage", "sa":"Voie-mère_nord_de_Reims-St-Léonard-Garage"}, 
        {"num":"082000", "g":1435, "pk0":1.34, "pkf":51.96, "len":50.62, "use":"EXP", "lid":"Ligne_de_Reims_à_Laon", "sa":"Ligne_Reims_-_Laon"}, 
        {"num":"082606", "g":1435, "len":8.27, "use":"N", "end":"1987", "lid":"#VM_Guignicourt_n°_1", "sa":"Ligne_Reims_-_Laon#Voies-mères_de_Guignicourt", "af":[1025]}, 
        {"num":"082611", "g":1435, "len":4.71, "use":"VS", "lid":"#VM_Guignicourt_n°_2", "sa":"Ligne_Reims_-_Laon#Voies-mères_de_Guignicourt", "af":[1025]}, 
        {"num":"085000", "g":1435, "pk0":186.12, "pkf":344.99, "len":158.87, "use":"EXP", "lid":"Ligne_de_Saint-Hilaire-au-Temple_à_Hagondange", "sa":"Ligne_Saint-Hilaire-au-Temple_-_Hagondange"}, 
        {"num":"086000", "g":1435, "pk0":317.67, "pkf":344.76, "len":27.09, "use":"FD", "end":"1988", "lid":"Ligne_de_Conflans_-_Jarny_à_Metz-Ville", "sa":"Ligne_Conflans-Jarny_-_Metz-n°_2", "af":[1265]}, 
        {"num":"088000", "g":1435, "pk0":1.05, "pkf":142.86, "len":141.81, "use":"FD", "end":"2018", "lid":"Ligne_de_Lérouville_à_Pont-Maugis", "sa":"Ligne_Lérouville_-_Pont-Maugis", "af":[1036]}, 
        {"num":"089000", "g":1435, "pk0":289.12, "pkf":353.7, "len":64.58, "use":"EXP", "lid":"Ligne_de_Lérouville_à_Metz-Ville", "sa":"Ligne_Lérouville_-_Metz-Ville"}, 
        {"num":"089306", "g":1435, "len":0.97, "use":"EXP", "lid":"Raccordement_de_Lérouville_n°_2", "sa":"Raccordement_de_Lérouville_n°_2"}, 
        {"num":"090000", "g":1435, "pk0":342.4, "pkf":371.87, "len":29.47, "use":"EXP", "lid":"Ligne_de_Frouard_à_Novéant", "sa":"Ligne_Frouard_-_Pagny-sur-Moselle"}, 
        {"num":"094300", "g":1435, "len":1.68, "use":"EXP", "lid":"Raccordement_de_Waville", "sa":"Raccordement_de_Waville"}, 
        {"num":"095000", "g":1435, "pk0":0.85, "pkf":73.35, "len":72.5, "use":"EXP", "lid":"Ligne_de_Longuyon_à_Onville_et_Pagny-sur-Moselle", "sa":"Ligne_Longuyon_-_Pagny-sur-Moselle"}, 
        {"num":"096000", "g":1435, "pk0":0.8, "pkf":21.93, "len":21.13, "use":"FD", "end":"2003", "lid":"Ligne_de_Pompey_à_Nomeny", "sa":"Ligne_Pompey_-_Nomény", "lo":"nomeny", "af":[1304]}, 
        {"num":"097000", "g":1435, "pk0":0.7, "pkf":82.5, "len":81.8, "use":"FD", "end":"1993", "lid":"Ligne_de_Champigneulles_à_Sarralbe", "sa":"Ligne_Champigneulles_-_Sarralbe", "af":[1248]}, 
        {"num":"098000", "g":1435, "pk0":0.22, "pkf":3.1, "len":2.88, "use":"FD", "end":"1952", "lid":"Ligne_de_Burthécourt_à_Vic-sur-Seille", "sa":"Ligne_Burthécourt_-_Vic-sur-Seille", "lo":"vic", "af":[1249]}, 
        {"num":"099000", "g":1435, "pk0":2, "pkf":58.2, "len":56.2, "use":"FD", "end":"1992", "lid":"Ligne_de_Metz-Ville_à_Château-Salins", "sa":"Ligne_Metz-Ville_-_Château-Salins", "af":[1250]}, 
        {"num":"100000", "g":1435, "len":34.53, "use":"FD", "end":"2016", "lid":"Ligne_de_Nouvel-Avricourt_à_Bénestroff", "sa":"Ligne_Nouvel-Avricourt_-_Bénestroff", "lo":"benestroff", "af":[1257]}, 
        {"num":"106000", "g":1435, "pk0":0.1, "pkf":16.26, "len":16.16, "use":"FD", "end":"1995", "lid":"Ligne_de_Sarrebourg_à_Abreschviller", "sa":"Ligne_Sarrebourg_-_Abreschviller", "af":[1254]}, 
        {"num":"107000", "g":1435, "len":9.42, "use":"FD", "end":"1991", "lid":"Ligne_de_La_Forge_à_Vallerysthal", "sa":"Ligne_La_Forge_-_Vallerysthal-Trois-Fontaines", "af":[1255]}, 
        {"num":"110000", "g":1435, "len":86.5, "use":"EXP", "lid":"Ligne_de_Strasbourg-Ville_à_Saint-Dié", "sa":"Ligne_Strasbourg-Ville_-_Saint-Dié"}, 
        {"num":"110306", "g":1435, "pk0":1.93, "pkf":2.85, "len":0.92, "use":"EXP", "lid":"Raccordement_de_Strasbourg_à_Koenigshoffen-Nord", "sa":"Raccordement_de_Strasbourg_à_Koenigshoffen-Nord"}, 
        {"num":"110311", "g":1435, "len":0.98, "use":"EXP", "lid":"Raccordement_de_Strasbourg_à_Koenigshoffen-Sud", "sa":"Raccordement_de_Strasbourg_à_Koenigshoffen-Sud"}, 
        {"num":"111000", "g":1435, "len":65.27, "use":"FD", "end":"1993", "lid":"Ligne_de_Sélestat_à_Saverne", "sa":"Ligne_Sélestat_-_Saverne", "af":[1239]}, 
        {"num":"114300", "g":1435, "len":3.42, "use":"EXP", "lid":"Raccordement_de_Sarrebourg_à_Sarraltroff", "sa":"Raccordement_de_Sarrebourg_à_Sarraltroff"}, 
        {"num":"115000", "g":1435, "pk0":2.48, "pkf":136.92, "len":134.44, "use":"EXP", "lid":"Ligne_de_Strasbourg-Ville_à_Saint-Louis", "sa":"Ligne_Strasbourg-Ville_-_Saint-Louis"}, 
        {"num":"115306", "g":1435, "pk0":0.76, "pkf":1.3, "len":0.54, "use":"EXP", "lid":"Raccordement_de_Mulhouse-Dornach_à_Mulhouse-Nord", "sa":"Raccordement_de_Mulhouse-Dornach_à_Mulhouse-Nord"}, 
        {"num":"116000", "g":1435, "len":31.38, "use":"x", "end":"no:33%1995", "lid":"Ligne_de_Sélestat_à_Lesseux_-_Frapelle", "sa":"Ligne_Sélestat_-_Lesseux-Frapelle", "af":[1223]}, 
        {"num":"117000", "g":1435, "pk0":0.05, "pkf":9.33, "len":9.28, "use":"FD", "end":"1975", "lid":"Ligne_de_Val-de-Villé_à_Villé", "sa":"Ligne_Val-de-Villé_-_Villé", "af":[1225]}, 
        {"num":"118000", "g":1435, "pk0":1.3, "pkf":15.07, "len":13.77, "use":"FD", "end":"1954", "lid":"Ligne_de_Sélestat_à_Sundhouse", "sa":"Ligne_Sélestat_-_Sundhouse", "af":[1224]}, 
        {"num":"119000", "g":1435, "pk0":-0.39, "pkf":24.16, "len":24.55, "use":"EXP", "lid":"Ligne_de_Colmar-Central_à_Metzeral", "sa":"Ligne_Colmar_-_Metzeral"}, 
        {"num":"120000", "g":1435, "pk0":0.4, "pkf":19.9, "len":19.5, "use":"x", "end":"no:10%1953", "lid":"Ligne_de_Colmar-Central_à_Neuf-Brisach", "sa":"Ligne_Colmar-Central_-_Neuf-Brisach", "af":[1380]}, 
        {"num":"121000", "g":1435, "pk0":4.08, "pkf":34.6, "len":30.52, "use":"FD", "end":"1992", "lid":"Ligne_de_Colmar-Sud_à_Bollwiller", "sa":"Ligne_Colmar-Sud_-_Bollwiller", "af":[1213]}, 
        {"num":"122000", "g":1435, "len":13.03, "use":"x", "end":"no:25%1973", "lid":"Ligne_de_Bollwiller_à_Lautenbach", "sa":"Ligne_Bollwiller_-_Lautenbach", "af":[1212]}, 
        {"num":"123000", "g":1435, "pk0":1, "pkf":25.1, "len":24.1, "use":"x", "end":"no:60%1994", "lid":"Ligne_de_Neuf-Brisach_à_Bantzenheim", "sa":"Ligne_Volgelsheim_-_Bantzenheim", "af":[1221]}, 
        {"num":"124000", "g":1435, "pk0":1.38, "pkf":17.55, "len":16.17, "use":"EXP", "lid":"Ligne_de_Mulhouse-Ville_à_Chalampé", "sa":"Ligne_Mulhouse-Ville_-_Chalampé"}, 
        {"num":"125000", "g":1435, "len":10.79, "use":"EXP", "lid":"Ligne_de_Lutterbach_à_Rixheim", "sa":"Ligne_Lutterbach_-_Rixheim"}, 
        {"num":"125306", "g":1435, "len":1.63, "use":"EXP", "lid":"Raccordement_de_la_bifurcation_de_Wanne_à_Mulhouse-Ville", "sa":"Raccordement_de_la_bifurcation_de_Wanne_à_Mulhouse-Ville"}, 
        {"num":"129000", "g":1000, "pk0":-0.28, "pkf":22.5, "len":22.78, "use":"FD", "end":"1954", "lid":"Ligne_de_Colmar-Central_à_Marckolsheim", "sa":"Ligne_Colmar-Central_-_Marckolsheim", "af":[1211]}, 
        {"num":"130000", "g":1435, "pk0":0.38, "pkf":32.03, "len":31.65, "use":"EXP", "lid":"Ligne_de_Lutterbach_à_Kruth", "sa":"Ligne_Lutterbach_-_Kruth"}, 
        {"num":"131000", "g":1435, "len":27.42, "use":"FD", "end":"1976", "lid":"Ligne_de_Cernay_à_Sewen", "sa":"Ligne_Cernay_-_Sewen", "af":[1219]}, 
        {"num":"132000", "g":1435, "len":7, "use":"FD", "end":"??", "lid":"Ligne_3_du_tramway_de_Mulhouse", "sa":"Ligne_Lutterbach_-_Rond_point_Stricker"}, 
        {"num":"133000", "g":1435, "len":20.11, "use":"FD", "end":"1970", "lid":"Ligne_de_Dannemarie_à_Pfetterhouse", "sa":"Ligne_Dannemarie_-_Pfetterhouse", "af":[1215]}, 
        {"num":"134000", "g":1435, "pk0":0.94, "pkf":23.84, "len":22.9, "use":"FD", "end":"1989", "lid":"Ligne_d'Altkirch_à_Ferrette", "sa":"Ligne_Altkirch_-_Ferrette", "af":[1216]}, 
        {"num":"135000", "g":1435, "len":20, "use":"FD", "end":"1992", "lid":"Ligne_de_Waldighoffen_à_Saint-Louis-La_Chaussée", "sa":"Ligne_Waldighoffen_-_Saint-Louis-La_Chaussée", "af":[1217]}, 
        {"num":"136000", "g":1435, "pk0":0.1, "pkf":4, "len":3.9, "use":"EXP", "lid":"Ligne_de_Saint-Louis_à_Huningue", "sa":"Ligne_Saint-Louis_-_Huningue", "af":[1218]}, 
        {"num":"137000", "g":1000, "pk0":1.1, "pkf":20.35, "len":19.25, "use":"FD", "end":"1954", "lid":"Ligne_de_Logelbach_à_Lapoutroie", "sa":"Ligne_Logelbach_-_Lapoutroie", "af":[1210]}, 
        {"num":"138000", "g":1435, "pk0":2.14, "pkf":10, "len":7.86, "use":"EXP", "lid":"Ligne_de_Graffenstaden_à_Hausbergen", "sa":"Ligne_Graffenstaden_-_Hausbergen"}, 
        {"num":"139300", "g":1435, "pk0":499.17, "pkf":500, "len":0.83, "use":"EXP", "lid":"Raccordement_de_Hausbergen_à_Strasbourg-Cronenbourg", "sa":"Raccordement_de_Hausbergen_à_Strasbourg-Cronenbourg"}, 
        {"num":"140000", "g":1435, "pk0":66.82, "pkf":154.32, "len":87.5, "use":"EXP", "lid":"Ligne_de_Réding_à_Metz-Ville", "sa":"Ligne_Réding_-_Metz-Ville"}, 
        {"num":"140370", "g":1435, "len":4.43, "use":"EXP", "lid":"Raccordement_de_Lucy", "sa":"Raccordement_de_Lucy"}, 
        {"num":"141000", "g":1435, "pk0":1.43, "pkf":6.62, "len":5.19, "use":"EXP", "lid":"Ligne_de_Graffenstaden_à_Strasbourg-Neudorf", "sa":"Ligne_Graffenstaden_-_Strasbourg-Neudorf"}, 
        {"num":"141306", "g":1435, "len":1.77, "use":"EXP", "lid":"Raccordement_de_Strasbourg-Neudorf_à_Strasbourg-Koenigshoffen", "sa":"Raccordement_de_Strasbourg-Neudorf_à_Strasbourg-Koenigshoffen"}, 
        {"num":"142000", "g":1435, "len":7.74, "use":"EXP", "lid":"Ligne_de_Strasbourg-Ville_à_Strasbourg-Port-du-Rhin", "sa":"Ligne_Strasbourg-Ville_-_Strasbourg-Port-du-Rhin"}, 
        {"num":"143000", "g":1435, "len":10, "use":"EXP", "lid":"Voies_du_port_de_Strasbourg", "sa":"Ligne_Strasbourg-Ville_-_Strasbourg-Port-du-Rhin#Voies_du_port_de_Strasbourg"}, 
        {"num":"145000", "g":1435, "len":56.84, "use":"EXP", "lid":"Ligne_de_Strasbourg_à_Lauterbourg", "sa":"Ligne_Strasbourg_-_Lauterbourg"}, 
        {"num":"145306", "g":1435, "pk0":0.9, "pkf":2.11, "len":1.21, "use":"FD", "end":"??", "lid":"Raccordement_de_Bischheim", "sa":"Raccordement_de_Bischheim"}, 
        {"num":"146000", "g":1435, "pk0":1.15, "pkf":60.03, "len":58.88, "use":"EXP", "lid":"Ligne_de_Vendenheim_à_Wissembourg", "sa":"Ligne_Vendenheim_-_Wissembourg"}, 
        {"num":"147300", "g":1435, "pk0":0.56, "pkf":3.66, "len":3.1, "use":"FD", "end":"??", "lid":"Raccordement_de_Bischwiller_à_Oberhoffen", "sa":"Raccordement_de_Bischwiller_à_Oberhoffen"}, 
        {"num":"150000", "g":1435, "len":28.85, "use":"FD", "end":"??", "lid":"Ligne_de_Haguenau_à_Rœschwoog_et_frontière", "sa":"Ligne_Haguenau_-_Rheinbrücke_Wintersdorf (frontière)", "af":[1247]}, 
        {"num":"151000", "g":1435, "len":2, "use":"EXP", "lid":"Ligne_de_Lauterbourg-Gare_à_Lauterbourg-Port-du-Rhin", "sa":"Ligne_Lauterbourg-Gare_-_Lauterbourg-Port-du-Rhin"}, 
        {"num":"152000", "g":1435, "pk0":2.1, "pkf":20, "len":17.9, "use":"FD", "end":"1958", "lid":"Ligne_de_Wissembourg_à_Lauterbourg-Gare", "sa":"Ligne_Wissembourg_-_Lauterbourg", "af":[1246]}, 
        {"num":"153000", "g":1435, "len":34.81, "use":"FD", "end":"1995", "lid":"Ligne_de_Mertzwiller_à_Seltz", "sa":"Ligne_Mertzwiller_-_Seltz", "af":[1244]}, 
        {"num":"154000", "g":1435, "len":17.14, "use":"FD", "end":"1991", "lid":"Ligne_de_Walbourg_à_Lembach", "sa":"Ligne_Walbourg_-_Lembach", "af":[1245]}, 
        {"num":"157000", "g":1000, "len":5.77, "use":"FD", "end":"1954", "lid":"Ligne_de_Lutzelbourg_à_Drulingen", "sa":"Ligne_Lutzelbourg_-_Drulingen", "af":[1232]}, 
        {"num":"158000", "g":1435, "len":19.56, "use":"FD", "end":"1954", "lid":"Ligne_de_Lutzelbourg_à_Drulingen", "sa":"Ligne_Lutzelbourg_-_Drulingen", "af":[1232]}, 
        {"num":"159000", "g":1435, "len":125.75, "use":"FD", "end":"??", "lid":"Ligne_de_Haguenau_à_Hargarten-Falck", "sa":"Ligne_Haguenau_-_Hargarten-Falck"}, 
        {"num":"160000", "g":1435, "len":33.5, "use":"FD", "end":"1991", "lid":"Ligne_de_Steinbourg_à_Schweighouse-sur-Moder", "sa":"Ligne_Steinbourg_-_Schweighouse-sur-Moder", "af":[1240]}, 
        {"num":"161000", "g":1435, "len":74.49, "use":"EXP", "lid":"Ligne_de_Mommenheim_à_Sarreguemines", "sa":"Ligne_Mommenheim_-_Sarreguemines"}, 
        {"num":"162000", "g":1435, "len":6.6, "use":"FD", "end":"1954", "lid":"Ligne_de_Bouxwiller_à_Ingwiller", "sa":"Ligne_Bouxwiller_-_Ingwiller", "af":[1241]}, 
        {"num":"163000", "g":1435, "len":1.04, "use":"EXP", "lid":"Ligne_de_Sarreguemines_vers_Sarrebruck", "sa":"Ligne_Sarreguemines_vers_Sarrebruck"}, 
        {"num":"166000", "g":1435, "len":12.07, "use":"FD", "end":"1973", "lid":"Ligne_de_Wingen-sur-Moder_à_Saint-Louis-lès-Bitche_et_frontière", "sa":"Ligne_Wingen-sur-Moder_-_Saint-Louis-lès-Bitche", "af":[1242]}, 
        {"num":"167000", "g":1435, "pk0":1.32, "pkf":28.59, "len":27.27, "use":"FD", "end":"??", "lid":"Ligne_de_Réding_à_Diemeringen", "sa":"Ligne_Réding_-_Diemeringen", "af":[1243]}, 
        {"num":"167320", "g":1435, "len":1.85, "use":"EXP", "lid":"#Raccordement_de_Réding", "sa":"Ligne_Réding_-_Diemeringen#Raccordement_de_Réding"}, 
        {"num":"168000", "g":1435, "len":42.52, "use":"FD", "end":"2018", "lid":"Ligne_de_Berthelming_à_Sarreguemines", "sa":"Ligne_Berthelming_-_Sarreguemines", "af":[1251]}, 
        {"num":"168699", "g":1435, "len":1.7, "use":"FD", "end":"2018", "lid":"Ligne_de_Berthelming_à_Sarreguemines#VM_Europole", "af":[1251]}, 
        {"num":"169000", "g":1435, "len":7.99, "use":"EXP", "lid":"Ligne_de_Kalhausen_à_Sarralbe", "sa":"Ligne_Kalhausen_-_Sarralbe"}, 
        {"num":"170000", "g":1435, "pk0":2.4, "pkf":11.78, "len":9.38, "use":"FD", "end":"1980", "lid":"Ligne_de_Sarreguemines_à_Bliesbruck", "sa":"Ligne_Sarreguemines_-_Bliesbrück", "af":[1252]}, 
        {"num":"172000", "g":1435, "len":51.36, "use":"EXP", "lid":"Ligne_de_Rémilly_à_Stiring-Wendel", "sa":"Ligne_Rémilly_-_Stiring-Wendel"}, 
        {"num":"173000", "g":1435, "len":30.06, "use":"FD", "end":"1987", "lid":"Ligne_de_Courcelles-sur-Nied_à_Téterchen", "sa":"Ligne_Courcelles-sur-Nied_-_Téterchen", "af":[1258]}, 
        {"num":"174000", "g":1435, "pk0":1.2, "pkf":55.17, "len":53.97, "use":"FD", "end":"??", "lid":"Ligne_de_Metz-Ville_à_la_frontière_allemande_vers_Ueberherrn", "sa":"Ligne_Metz-Ville_-_frontière_allemande_vers_Ueberherrn", "af":[1262]}, 
        {"num":"175000", "g":1435, "len":30.13, "use":"FD", "end":"1967", "lid":"Ligne_de_Bettelainville_à_Waldwisse", "sa":"Ligne_Bettelainville_-_Waldwisse", "af":[1261]}, 
        {"num":"176000", "g":1435, "pk0":0.23, "pkf":7.72, "len":7.49, "use":"EXP", "lid":"Ligne_de_Bouzonville_à_Guerstling", "sa":"Ligne_Bouzonville_-_Guerstling", "af":[1406]}, 
        {"num":"177000", "g":1435, "len":29.62, "use":"EXP", "lid":"Ligne_de_Thionville_à_Anzeling", "sa":"Ligne_Thionville_-_Anzeling"}, 
        {"num":"178000", "g":1435, "pk0":1.22, "pkf":22.17, "len":20.95, "use":"EXP", "lid":"Ligne_de_Thionville_à_Apach", "sa":"Ligne_Thionville_-_Apach"}, 
        {"num":"180000", "g":1435, "pk0":154.32, "pkf":203.76, "len":49.44, "use":"EXP", "lid":"Ligne_de_Metz-Ville_à_Zoufftgen", "sa":"Ligne_Metz-Ville_-_Zoufftgen"}, 
        {"num":"186000", "g":1435, "pk0":11.05, "pkf":12.21, "len":1.16, "use":"EXP", "lid":"Ligne_d'Esch-sur-Alzette_à_Audun-le-Tiche", "sa":"Ligne_Bettembourg_-_Audun-le-Tiche"}, 
        {"num":"190000", "g":1435, "len":2.23, "use":"FD", "end":"1990", "lid":"Ligne_d'Hettange-Grande_à_Entrange", "sa":"Ligne_Hettange-Grande_-_Entrange", "elect":1, "af":[1266]}, 
        {"num":"191300", "g":1435, "len":3.79, "use":"EXP", "lid":"#Shunt_Metz-Ville_à_Metz-Marchandises", "sa":"Ceinture_de_Metz#Raccordement_de_Metz-Ville_à_Metz-Marchandises"}, 
        {"num":"192000", "g":1435, "pk0":152.34, "pkf":161, "len":8.66, "use":"EXP", "lid":"Ceinture_de_Metz", "sa":"Ceinture_de_Metz"}, 
        {"num":"194000", "g":1435, "pk0":8.17, "pkf":15.8, "len":7.63, "use":"FD", "end":"1991", "lid":"Ligne_de_Knutange_-_Nilvange_à_Algrange-Rochonvillers", "sa":"Ligne_Hayange_-_Algrange-Rochonvillers", "af":[1267]}, 
        {"num":"195000", "g":1435, "len":21.96, "use":"FD", "end":"1999", "lid":"Ligne_de_Fontoy_à_Audun-le-Tiche", "sa":"Ligne_Fontoy_-_Audun-le-Tiche", "af":[1270]}, 
        {"num":"195599", "g":1435, "pk0":21.5, "pkf":23.5, "len":2, "use":"FD", "end":"1978", "lid":"#voie_minière_Audun-le-Tiche", "sa":"voie_minière_Audun-le-Tiche"}, 
        {"num":"196000", "g":1435, "pk0":2.4, "pkf":8.8, "len":6.4, "use":"FD", "end":"1994", "lid":"Ligne_d'Audun-le-Tiche_à_Hussigny-Godbrange", "sa":"Ligne_Audun-le-Tiche_-_Hussigny-Godbrange", "af":[1271]}, 
        {"num":"196300", "g":1435, "pk0":5.2, "pkf":6.1, "len":0.9, "use":"FD", "end":"1970", "lid":"#embranchement_Heydt_et_frontière", "sa":"Ligne_Audun-le-Tiche_-_Hussigny-Godbrange#Raccordement_d'Audun-le-Tiche"}, 
        {"num":"197000", "g":1435, "len":10.4, "use":"FD", "end":"1975", "lid":"Ligne_de_Boulange_à_Rumelange_-_Ottange", "sa":"Ligne_Boulange_-_Rumelange_(frontière)"}, 
        {"num":"198300", "g":1435, "pk0":2.02, "pkf":4.34, "len":2.32, "use":"FD", "end":"??", "lid":"#Shunt_Uckange", "sa":"Ligne_Mohon_-_Thionville#Raccordement_d'Uckange"}, 
        {"num":"200000", "g":1435, "pk0":195.84, "pkf":198.29, "len":2.45, "use":"FD", "end":"1971", "lid":"Ligne_de_Vireux-Molhain_à_la_frontière_belge_vers_Mariembourg", "sa":"Ligne_Vireux-Molhain_-_frontière_belge_vers_Mariembourg", "af":[1045]}, 
        {"num":"201000", "g":1435, "pk0":212, "pkf":214.7, "len":2.7, "use":"FD", "end":"1985", "lid":"Ligne_de_Montmédy_à_Écouviez", "sa":"Ligne_Montmédy_-_Écouviez", "lo":"ecouviez", "af":[1301]}, 
        {"num":"201212", "g":1435, "pk0":212, "pkf":214.7, "len":2.7, "use":"FD", "end":"1985", "lid":"Ligne_de_Montmédy_à_Écouviez#shunt_Velosnes", "sa":"Ligne_Montmédy_-_Écouviez#Raccordements_de_Montmédy_et_Velosnes", "af":[1301]}, 
        {"num":"202000", "g":1435, "pk0":227.6, "pkf":249.08, "len":21.48, "use":"EXP", "lid":"Ligne_de_Longuyon_à_Mont-Saint-Martin_(vers_Athus)", "sa":"Ligne_Longuyon_-_Mont-Saint-Martin_(vers_Athus)", "af":[1309]}, 
        {"num":"202100", "g":1435, "pk0":248, "pkf":248.63, "len":0.63, "use":"EXP", "lid":"Ligne_de_Longuyon_à_Mont-Saint-Martin_(vers_Luxembourg)", "sa":"Ligne_Longuyon_-_Mont-Saint-Martin_(vers_Athus)#Ligne_Longuyon_-_Mont-Saint-Martin_(vers_Luxembourg)"}, 
        {"num":"203000", "g":1435, "pk0":243.86, "pkf":261.07, "len":17.21, "use":"EXP", "lid":"Ligne_de_Longwy_à_Villerupt-Micheville", "sa":"Ligne_Longwy_-_Villerupt-Micheville", "af":[1274]}, 
        {"num":"204000", "g":1435, "pk0":140.56, "pkf":276.11, "len":135.55, "use":"EXP", "lid":"Ligne_de_Mohon_à_Thionville", "sa":"Ligne_Mohon_-_Thionville"}, 
        {"num":"205000", "g":1435, "pk0":0.75, "pkf":207, "len":206.25, "use":"FD", "end":"??", "lid":"Ligne_de_Soissons_à_Givet", "sa":"Ligne_Soissons_-_Givet", "af":[1093]}, 
        {"num":"206950", "g":1435, "pk0":72.07, "pkf":74.12, "len":2.05, "use":"FD", "end":"2018", "lid":"#Saut-de-mouton_de_Bazancourt", "sa":"Ligne_Bazancourt_-_Challerange#Saut-de-mouton_de_Bazancourt", "af":[1023]}, 
        {"num":"207000", "g":1435, "len":52.45, "use":"FD", "end":"2018", "lid":"Ligne_de_Bazancourt_à_Challerange", "sa":"Ligne_Bazancourt_-_Challerange", "af":[1023]}, 
        {"num":"208000", "g":1435, "pk0":40.98, "pkf":65.33, "len":24.35, "use":"FD", "end":"1970", "lid":"Ligne_de_Challerange_à_Apremont", "sa":"Ligne_Challerange_-_Apremont-sur-Aire", "af":[1049]}, 
        {"num":"209000", "g":1435, "pk0":205.91, "pkf":207, "len":1.09, "use":"FD", "end":"2006", "lid":"Ligne_de_Givet_à_la_frontière_belge_vers_Morialmé", "sa":"Ligne_Givet_-_frontière_belge_vers_Morialmé", "af":[1046]}, 
        {"num":"210000", "g":1435, "len":107.5, "use":"FD", "end":"1972", "lid":"Ligne_d'Amagne-Lucquy_à_Revigny", "sa":"Ligne_Amagne-Lucquy_-_Revigny", "af":[1024]}, 
        {"num":"212000", "g":1435, "pk0":0.8, "pkf":61.75, "len":60.95, "use":"FD", "end":"??", "lid":"Ligne_d'Hirson_à_Amagne-Lucquy", "sa":"Ligne_Hirson_-_Amagne-Lucquy", "af":[1034]}, 
        {"num":"213000", "g":1435, "pk0":68.3, "pkf":140, "len":71.7, "use":"FD", "end":"1954", "lid":"Ligne_de_Marcq-Saint-Juvin_à_Baroncourt", "sa":"Ligne_Marcq-Saint-Juvin_-_Baroncourt", "af":[1051]}, 
        {"num":"214000", "g":1435, "len":8, "use":"FD", "end":"2009", "lid":"Ligne_de_Carignan_à_Messempré", "sa":"Ligne_Carignan_-_Messempré", "af":[1041]}, 
        {"num":"215000", "g":1435, "len":5.3, "use":"FD", "end":"1993", "lid":"Ligne_de_Vrigne-Meuse_à_Vrigne-aux-Bois", "sa":"Ligne_Vrigne-Meuse_-_Vrigne-aux-Bois", "lo":"vrigne", "af":[1040]}, 
        {"num":"216000", "g":1435, "len":140, "use":"EXP", "lid":"Ligne_de_Fretin_à_Fréthun_(LGV)", "sa":"LGV_Nord-Europe"}, 
        {"num":"216302", "g":1435, "len":3.1, "use":"EXP", "lid":"Raccordement_de_Fretin", "sa":"Raccordement_de_Fretin"}, 
        {"num":"216308", "g":1435, "len":1.41, "use":"EXP", "lid":"Raccordement_de_Cassel", "sa":"Raccordement_de_Cassel"}, 
        {"num":"216310", "g":1435, "pk0":285.33, "pkf":286.58, "len":1.25, "use":"EXP", "lid":"Raccordement_sud_de_Fréthun", "sa":"Raccordement_sud_de_Fréthun"}, 
        {"num":"216312", "g":1435, "pk0":287.65, "pkf":288.28, "len":0.63, "use":"EXP", "lid":"Raccordement_nord_de_Fréthun", "sa":"Raccordement_nord_de_Fréthun"}, 
        {"num":"218000", "g":1435, "pk0":0.77, "pkf":21.78, "len":21.01, "use":"FD", "end":"??", "lid":"Ligne_de_Baroncourt_à_Audun-le-Roman", "sa":"Ligne_Baroncourt_-_Audun-le-Roman", "lo":"audun", "af":[1277]}, 
        {"num":"219000", "g":1435, "len":2, "use":"FD", "end":"1994", "lid":"#Audun-le-Tiche_Villerupt", "sa":"Ligne_Audun-le-Tiche_-_Audun-le-Tiche-Villerupt", "af":[1276]}, 
        {"num":"220000", "g":1435, "pk0":324.39, "pkf":366.8, "len":42.41, "use":"FD", "end":"2016", "lid":"Ligne_de_Valleroy-Moineville_à_Villerupt-Micheville", "sa":"Ligne_Valleroy-Moineville_-_Villerupt-Micheville", "af":[1275]}, 
        {"num":"220100", "g":1435, "pk0":362.62, "pkf":366, "len":3.38, "use":"FD", "end":"2016", "lid":"#Branch_Z.I._Villers-la-Montagne"}, 
        {"num":"221000", "g":1435, "len":20.9, "use":"FD", "end":"1964", "lid":"Ligne_de_Charleville-Mézières_à_Hirson_(par_Auvillers)", "sa":"Ligne_Tournes_-_Auvillers", "af":[1043]}, 
        {"num":"222000", "g":1435, "pk0":27.59, "pkf":50.99, "len":23.4, "use":"EXP", "lid":"Ligne_de_Liart_à_Tournes", "sa":"Ligne_Liart_-_Tournes"}, 
        {"num":"223000", "g":1435, "pk0":142.52, "pkf":197, "len":54.48, "use":"FD", "end":"??", "lid":"Ligne_de_Charleville-Mézières_à_Hirson", "sa":"Ligne_Charleville-Mézières_-_Hirson", "af":[1042]}, 
        {"num":"224000", "g":1435, "len":5, "use":"FD", "end":"1950", "lid":"Ligne_de_Monthermé_-_Château-Regnault-Bogny_à_Phade", "sa":"Ligne_Monthermé_-_Phade"}, 
        {"num":"225000", "g":1435, "len":8.78, "use":"FD", "end":"1972", "lid":"Ligne_de_Remilly-Aillicourt_à_Raucourt", "sa":"Ligne_Remilly-Aillicourt_-_Raucourt", "af":[1033]}, 
        {"num":"226000", "g":1435, "len":209.79, "use":"EXP", "lid":"Ligne_de_Gonesse_à_Lille-Frontière_(LGV)", "sa":"LGV_Nord-Europe"}, 
        {"num":"226301", "g":1435, "len":2.31, "use":"EXP", "lid":"Raccordement_de_Vémars", "sa":"Ligne_de_Gonesse_à_Lille-Frontière_(LGV)#Raccordement_de_Vémars"}, 
        {"num":"226306", "g":1435, "len":10.69, "use":"EXP", "lid":"Raccordement_d'Arras-Sud", "sa":"Ligne_de_Gonesse_à_Lille-Frontière_(LGV)#Raccordement_d'Arras-Sud"}, 
        {"num":"226309", "g":1435, "len":1.27, "use":"EXP", "lid":"Raccordement_d'Arras-Nord", "sa":"Ligne_de_Gonesse_à_Lille-Frontière_(LGV)#Raccordement_d'Arras-Nord"}, 
        {"num":"226310", "g":1435, "len":56.83, "use":"EXP", "lid":"LGV_Interconnexion_Est", "sa":"LGV_Interconnexion_Est"}, 
        {"num":"226320", "g":1435, "len":4.94, "use":"EXP", "lid":"Raccordement_d'Annet", "sa":"Ligne_de_Gonesse_à_Lille-Frontière_(LGV)#Raccordement_d'Annet"}, 
        {"num":"226321", "g":1435, "len":2.61, "use":"EXP", "lid":"Raccordement_de_Messy", "sa":"Ligne_de_Gonesse_à_Lille-Frontière_(LGV)#Raccordement_de_Messy"}, 
        {"num":"227000", "g":1435, "pk0":55.62, "pkf":77.13, "len":21.51, "use":"FD", "end":"2006", "lid":"Ligne_d'Ormoy-Villers_à_Mareuil-sur-Ourcq", "sa":"Ligne_Ormoy-Villers_-_Mareuil-sur-Ourcq", "af":[1061]}, 
        {"num":"228000", "g":1435, "pk0":141, "pkf":199.94, "len":58.94, "use":"FD", "end":"??", "lid":"Ligne_de_Laon_à_Liart", "sa":"Ligne_Laon_-_Liart", "lo":"liart", "af":[1047]}, 
        {"num":"229000", "g":1435, "pk0":3.27, "pkf":210.6, "len":207.33, "use":"EXP", "lid":"Ligne_de_La_Plaine_à_Hirson_et_Anor_(frontière)", "sa":"Ligne_La_Plaine_-_Hirson_et_Anor_(frontière)", "af":[1137]}, 
        {"num":"229306", "g":1435, "pk0":55.6, "pkf":57.74, "len":2.14, "use":"EXP", "lid":"Raccordement_du_Bourget", "sa":"Raccordement_du_Bourget"}, 
        {"num":"229606", "g":1435, "len":4.86, "use":"FD", "end":"2010", "lid":"Voie-mère_du_Bourget_(Garonor)", "sa":"Voie-mère_du_Bourget_(Garonor)"}, 
        {"num":"230000", "g":1435, "pk0":7.9, "pkf":75.2, "len":67.3, "use":"FD", "end":"1941", "lid":"Ligne_d'Aulnay-sous-Bois_à_Verberie", "sa":"Ligne_Aulnay-sous-Bois_-_Verberie", "af":[983], "info":"inachevée"}, 
        {"num":"231000", "g":1435, "pk0":42.32, "pkf":71.92, "len":29.6, "use":"FD", "end":"1992", "lid":"Ligne_de_Chantilly_-_Gouvieux_à_Crépy-en-Valois", "sa":"Ligne_Chantilly-Gouvieux_-_Crépy-en-Valois", "af":[984]}, 
        {"num":"231306", "g":1435, "pk0":71.92, "pkf":72.51, "len":0.59, "use":"FD", "end":"1963", "lid":"#Raccordement_d'Ormoy-Villers", "sa":"Ligne_Chantilly-Gouvieux_-_Crépy-en-Valois#Raccordement_d'Ormoy-Villers"}, 
        {"num":"232000", "g":1435, "pk0":55.62, "pkf":143.33, "len":87.71, "use":"FD", "end":"??", "lid":"Ligne_d'Ormoy-Villers_à_Boves", "sa":"Ligne_Ormoy-Villers_-_Boves", "af":[1058]}, 
        {"num":"233000", "g":1435, "pk0":69.6, "pkf":109, "len":39.4, "use":"FD", "end":"1973", "lid":"Ligne_de_Rethondes_à_La_Ferté-Milon", "sa":"Ligne_Rethondes_-_La_Ferté-Milon", "af":[1062, 1357]}, 
        {"num":"234000", "g":1435, "pk0":123, "pkf":147.48, "len":24.48, "use":"FD", "end":"1995", "lid":"Ligne_d'Anizy-Pinon_à_Chauny", "sa":"Ligne_Anizy-Pinon_-_Chauny", "af":[1100]}, 
        {"num":"235100", "g":1435, "len":3, "use":"FD", "end":"1990", "lid":"#Branch_Crouy_à_Soissons-St-Médard", "sa":"Ligne_La_Plaine_-_Hirson_et_Anor_(frontière)#Embranchement_de_Crouy_à_Soissons-St-Médard"}, 
        {"num":"236000", "g":1435, "pk0":141, "pkf":216.8, "len":75.8, "use":"FD", "end":"2011", "lid":"Ligne_de_Laon_au_Cateau", "sa":"Ligne_Laon_-_Le_Cateau", "lo":"cateau1", "af":[1109]}, 
        {"num":"237000", "g":1435, "len":33.6, "use":"FD", "end":"1978", "lid":"Chemin_de_fer_de_Guise_à_Hirson", "sa":"Ligne_Flavigny-le-Grand_-_Ohis-Neuve-Maison", "af":[1110]}, 
        {"num":"238000", "g":1435, "pk0":180.72, "pkf":235, "len":54.28, "use":"FD", "end":"2005", "lid":"Ligne_de_Busigny_à_Hirson", "sa":"Ligne_Busigny_-_Hirson", "af":[1111]}, 
        {"num":"239000", "g":1435, "pk0":93.7, "pkf":108.6, "len":14.9, "use":"FD", "end":"1964", "lid":"Ligne_d'Avesnes_à_Sars-Poteries", "sa":"Ligne_Avesnes_-_Sars-Poteries", "af":[1310]}, 
        {"num":"240000", "g":1435, "pk0":86, "pkf":124.6, "len":38.6, "use":"FD", "end":"1975", "lid":"Ligne_de_Maubeuge_à_Fourmies", "sa":"Ligne_Maubeuge_-_Fourmies", "af":[1136]}, 
        {"num":"241000", "g":1435, "pk0":89.51, "pkf":100.51, "len":11, "use":"EXP", "lid":"Ligne_de_Ferrière-la-Grande_à_Cousolre", "sa":"Ligne_Ferrière-la-Grande_-_Cousolre", "lo":"cousolre", "af":[1464]}, 
        {"num":"242000", "g":1435, "pk0":50.89, "pkf":239.71, "len":188.82, "use":"EXP", "lid":"Ligne_de_Creil_à_Jeumont", "sa":"Ligne_Creil_-_Jeumont"}, 
        {"num":"242360", "g":1435, "len":1.26, "use":"FD", "end":"??", "lid":"Raccordement_d'Honnechy", "sa":"Raccordement_d'Honnechy"}, 
        {"num":"242370", "g":1435, "len":1.07, "use":"EXP", "lid":"Raccordement_d'Aulnoye-Aymeries", "sa":"Raccordement_d'Aulnoye-Aymeries"}, 
        {"num":"242616", "g":1435, "len":3, "use":"FD", "end":"??", "lid":"Voie-mère_de_St-Quentin", "sa":"Voie-mère_de_St-Quentin"}, 
        {"num":"242626", "g":1435, "pk0":0.42, "pkf":37.1, "len":36.68, "use":"FD", "end":"??", "lid":"Chemin_de_fer_de_Saint-Quentin_à_Guise", "af":[1104]}, 
        {"num":"242910", "g":1435, "len":1.36, "use":"FD", "end":"??", "lid":"Voie_de_desserte_de_la_ZI_de_Nogent-sur-Oise-Villers-St-Paul", "sa":"Voie_de_desserte_de_la_ZI_de_Nogent-sur-Oise-Villers-St-Paul"}, 
        {"num":"243300", "g":1435, "pk0":76.18, "pkf":77.74, "len":1.56, "use":"EXP", "lid":"Raccordement_de_Rivecourt-Sud", "sa":"Raccordement_de_Rivecourt-Sud"}, 
        {"num":"243301", "g":1435, "pk0":76.19, "pkf":77.32, "len":1.13, "use":"EXP", "lid":"Raccordement_des_Ageux", "sa":"Raccordement_des_Ageux"}, 
        {"num":"245300", "g":1435, "pk0":76.19, "pkf":78.54, "len":2.35, "use":"EXP", "lid":"Raccordement_de_Rivecourt-Nord", "sa":"Raccordement_de_Rivecourt-Nord"}, 
        {"num":"246300", "g":1435, "pk0":71.72, "pkf":73.08, "len":1.36, "use":"EXP", "lid":"Raccordement_militaire_de_Jussy", "sa":"Raccordement_militaire_de_Jussy"}, 
        {"num":"247000", "g":1435, "pk0":224.88, "pkf":233.11, "len":8.23, "use":"EXP", "lid":"Ligne_d'Hautmont_à_Feignies_(frontière)", "sa":"Ligne_Hautmont_-_Feignies_(frontière)"}, 
        {"num":"247306", "g":1435, "pk0":81.71, "pkf":82.69, "len":0.98, "use":"EXP", "lid":"Raccordement_de_Sous-le-Bois", "sa":"Raccordement_de_Sous-le-Bois"}, 
        {"num":"248000", "g":1435, "pk0":84.43, "pkf":119.37, "len":34.94, "use":"FD", "end":"2002", "lid":"Ligne_de_Compiègne_à_Roye-Faubourg-Saint-Gilles", "sa":"Ligne_Compiègne_-_Roye-Faubourg-Saint-Gilles", "af":[1069]}, 
        {"num":"249000", "g":1435, "pk0":185.47, "pkf":187.58, "len":2.11, "use":"FD", "end":"1994", "lid":"Ligne_de_Marcoing_à_Masnières", "sa":"Ligne_Marcoing_-_Masnières", "af":[1385]}, 
        {"num":"250000", "g":1435, "pk0":181.28, "pkf":230.8, "len":49.52, "use":"EXP", "lid":"Ligne_de_Busigny_à_Somain", "sa":"Ligne_Busigny_-_Somain"}, 
        {"num":"250306", "g":1435, "pk0":204.55, "pkf":205.77, "len":1.22, "use":"EXP", "lid":"Raccordement_de_Cambrai-Sud", "sa":"Raccordement_de_Cambrai-Sud"}, 
        {"num":"250311", "g":1435, "pk0":205.11, "pkf":206.39, "len":1.28, "use":"EXP", "lid":"Raccordement_de_Cambrai-Nord", "sa":"Raccordement_de_Cambrai-Nord"}, 
        {"num":"250316", "g":1435, "pk0":229.4, "pkf":232.18, "len":2.78, "use":"FD", "end":"??", "lid":"Raccordement_d'Erre", "sa":"Raccordement_d'Erre"}, 
        {"num":"251000", "g":1435, "pk0":209.6, "pkf":263, "len":53.4, "use":"FD", "end":"1991", "lid":"Ligne_d'Escaudoeuvres_à_Gussignies", "sa":"Ligne_Escaudoeuvres_-_Gussignies", "af":[1313]}, 
        {"num":"252000", "g":1435, "pk0":54.4, "pkf":85.4, "len":31, "use":"FD", "end":"1970", "lid":"Ligne_de_Prouvy_-_Thiant_au_Cateau", "sa":"Ligne_Prouvy-Thiant_-_Le_Cateau", "af":[1134]}, 
        {"num":"253000", "g":1435, "pk0":48.43, "pkf":82, "len":33.57, "use":"FD", "end":"??", "lid":"Ligne_de_Valenciennes-Faubourg-de-Paris_à_Hautmont", "sa":"Ligne_Valenciennes-Faubourg-de-Paris_-_Douzies", "af":[1314]}, 
        {"num":"254000", "g":1435, "pk0":223.92, "pkf":242.38, "len":18.46, "use":"EXP", "lid":"Ligne_de_Lourches_à_Valenciennes", "sa":"Ligne_Lourches_-_Valenciennes"}, 
        {"num":"254610", "g":1435, "len":4.07, "use":"FD", "end":"??", "lid":"Voie-mère_de_la_ZI_de_Valenciennes-Aéroport_n°_2", "sa":"Voie-mère_de_la_ZI_de_Valenciennes-Aéroport_n°_2"}, 
        {"num":"255000", "g":1435, "pk0":35, "pkf":57.86, "len":22.86, "use":"FD", "end":"1992", "lid":"Ligne_de_Saint-Amand-les-Eaux_à_Blanc-Misseron", "sa":"Ligne_Saint-Amand-les-Eaux_-_Blanc-Misseron", "af":[1316]}, 
        {"num":"256000", "g":1435, "pk0":228.39, "pkf":245.89, "len":17.5, "use":"FD", "end":"2010", "lid":"Ligne_de_Denain_à_Saint-Amand-les-Eaux", "sa":"Ligne_Denain_-_Saint-Amand-les-Eaux", "af":[1317]}, 
        {"num":"257000", "g":1435, "pk0":34.25, "pkf":42.95, "len":8.7, "use":"FD", "end":"??", "lid":"Ligne_de_Saint-Amand-les-Eaux_à_Maulde-Mortagne", "sa":"Ligne_Saint-Amand-les-Eaux_-_Maulde-Mortagne", "af":[1133]}, 
        {"num":"258000", "g":1435, "pk0":208.82, "pkf":223.48, "len":14.66, "use":"FD", "end":"??", "lid":"Ligne_d'Aubigny-au-Bac_à_Somain", "sa":"Ligne_Aubigny-au-Bac_-_Somain", "af":[1135]}, 
        {"num":"259000", "g":1435, "pk0":79.52, "pkf":223.73, "len":144.21, "use":"FD", "end":"??", "lid":"Ligne_de_Saint-Just-en-Chaussée_à_Douai", "sa":"Ligne_Saint-Just-en-Chaussée_-_Douai", "af":[1056]}, 
        {"num":"261000", "g":1435, "pk0":0.55, "pkf":107.09, "len":106.54, "use":"EXP", "lid":"Ligne_d'Amiens_à_Laon", "sa":"Ligne_Amiens_-_Laon"}, 
        {"num":"261306", "g":1435, "pk0":128.55, "pkf":130.65, "len":2.1, "use":"EXP", "lid":"#Shunt_Lamotte-Brebière", "sa":"Ligne_Amiens_-_Laon#Raccordement_de_Lamotte-Brebière"}, 
        {"num":"262000", "g":1435, "pk0":214.71, "pkf":260.93, "len":46.22, "use":"EXP", "lid":"Ligne_de_Douai_à_Blanc-Misseron", "sa":"Ligne_Douai_-_Blanc-Misseron"}, 
        {"num":"263300", "g":1435, "pk0":246.5, "pkf":250.87, "len":4.37, "use":"FD", "end":"??", "lid":"Raccordement_de_Beuvrages", "sa":"Raccordement_de_Beuvrages"}, 
        {"num":"264000", "g":1435, "pk0":220.4, "pkf":247.02, "len":26.62, "use":"FD", "end":"1980", "lid":"Ligne_de_Pont-de-la-Deûle_à_Bachy_-_Mouchin", "sa":"Ligne_Pont-de-la-Deûle_-_Bachy-Mouchin", "af":[1318, 1319]}, 
        {"num":"265000", "g":1435, "pk0":14.8, "pkf":40.4, "len":25.6, "use":"FD", "end":"1976", "lid":"Ligne_de_Templeuve_à_Don-Sainghin", "sa":"Ligne_Templeuve_-_Don-Sainghin", "af":[1132]}, 
        {"num":"265029", "g":1435, "pk0":0.2, "pkf":1.4, "len":1.2, "use":"FD", "end":"??", "lid":"Ligne_de_Seclin_à_Seclin-Annexe", "sa":"Ligne_Seclin_-_Seclin-Annexe"}, 
        {"num":"266300", "g":1435, "pk0":1.33, "pkf":3.23, "len":1.9, "use":"FD", "end":"??", "lid":"Raccordement_de_Lezennes", "sa":"Raccordement_de_Lezennes"}, 
        {"num":"267000", "g":1435, "pk0":2.09, "pkf":122.6, "len":120.51, "use":"EXP", "lid":"Ligne_de_Fives_à_Hirson", "sa":"Ligne_Fives-Sud_-_Hirson"}, 
        {"num":"267306", "g":1435, "len":1.04, "use":"EXP", "lid":"Raccordement_militaire_d'Aulnoye", "sa":"Raccordement_militaire_d'Aulnoye"}, 
        {"num":"268000", "g":1435, "pk0":231.1, "pkf":288.79, "len":57.69, "use":"FD", "end":"??", "lid":"Ligne_de_Somain_à_Halluin", "sa":"Ligne_Somain_-_Halluin_(frontière)", "af":[1131]}, 
        {"num":"269000", "g":1435, "pk0":2.16, "pkf":14, "len":11.84, "use":"EXP", "lid":"Ligne_de_Fives_à_Baisieux", "sa":"Ligne_Fives-Lezennes_-_Baisieux"}, 
        {"num":"271000", "g":1435, "pk0":16.93, "pkf":20.7, "len":3.77, "use":"FD", "end":"1970", "lid":"Ligne_de_Roubaix_-_Wattrelos_à_Wattrelos", "sa":"Ligne_Roubaix-Wattrelos_-_Wattrelos", "af":[1320]}, 
        {"num":"272000", "g":1435, "len":250.93, "use":"EXP", "lid":"Ligne_de_Paris-Nord_à_Lille", "sa":"Ligne_Paris-Nord_-_Lille-Flandres"}, 
        {"num":"272301", "g":1435, "len":1.93, "use":"EXP", "lid":"#Shunt_Blangy-les-Arras", "sa":"Raccordements_de_la_ligne_Paris-Nord_-_Lille#Raccordement_de_Blangy-les-Arras"}, 
        {"num":"272311", "g":1435, "len":1.7, "use":"EXP", "lid":"#Shunt_La_Chapelle-Charbons", "sa":"Raccordements_de_la_ligne_Paris-Nord_-_Lille#Raccordements_en_banlieue_parisienne"}, 
        {"num":"272321", "g":1435, "len":1.37, "use":"EXP", "lid":"#Shunt_Pierrefitte", "sa":"Raccordements_de_la_ligne_Paris-Nord_-_Lille#Raccordements_en_banlieue_parisienne"}, 
        {"num":"272326", "g":1435, "pk0":215.33, "pkf":216.96, "len":1.63, "use":"EXP", "lid":"#Shunt_Douai", "sa":"Raccordements_de_la_ligne_Paris-Nord_-_Lille#Raccordement_de_Douai"}, 
        {"num":"272606", "g":1435, "len":1.67, "use":"EXP", "lid":"#VM_Survilliers_(ZI_de_Moimont_I)", "sa":"Raccordements_de_la_ligne_Paris-Nord_-_Lille#Voies-mères_de_Survilliers"}, 
        {"num":"272608", "g":1435, "len":1.99, "use":"EXP", "lid":"#VM_Survilliers_(ZI_de_Moimont_II)", "sa":"Raccordements_de_la_ligne_Paris-Nord_-_Lille#Voies-mères_de_Survilliers"}, 
        {"num":"273300", "g":1435, "len":3.72, "use":"EXP", "lid":"#Shunt_Ronchin", "sa":"Raccordements_de_la_ligne_Paris-Nord_-_Lille#Raccordement_de_Ronchin"}, 
        {"num":"273308", "g":1435, "len":1.32, "use":"EXP", "lid":"#Shunt_voie_RV_de_Lille", "sa":"Raccordements_de_la_ligne_Paris-Nord_-_Lille#Raccordement_voie_RV_de_Lille"}, 
        {"num":"274100", "g":1435, "pk0":0.29, "pkf":2.21, "len":1.92, "use":"FD", "end":"1970", "lid":"#Embranchements_urbains_d'Arras-Meaulens", "sa":"Raccordements_de_la_ligne_Paris-Nord_-_Lille#Embranchements_urbains_d'Arras-Meaulens"}, 
        {"num":"275100", "g":1435, "len":2, "use":"FD", "end":"1990?", "lid":"Ligne_de_Paris-Nord_à_Lille#Embranchements_urbains_de_Douai(Nord)", "sa":"Raccordements_de_la_ligne_Paris-Nord_-_Lille#Embranchements_urbains_de_Douai"}, 
    //    {"num":"276100", "lid":"#Embranchements_urbains_de_Douai(Sud)", "sa":"Raccordements_de_la_ligne_Paris-Nord_-_Lille#Embranchements_urbains_de_Douai"}, 
        {"num":"277100", "g":1435, "len":1.5, "use":"FD", "end":"2000", "lid":"#Shunt_St-Sauveur", "sa":"Raccordements_de_la_ligne_Paris-Nord_-_Lille#Raccordement_de_St-Sauveur"}, 
        {"num":"278000", "g":1435, "len":14.62, "use":"EXP", "lid":"Ligne_de_Fives_à_Mouscron_(frontière)", "sa":"Ligne_Fives_-_Mouscron_(frontière)"}, 
        {"num":"278306", "g":1435, "len":0.95, "use":"EXP", "lid":"#Shunt_Rougebarre", "sa":"Ligne_Fives_-_Mouscron_(frontière)#Raccordement_de_Rougebarre"}, 
        {"num":"278606", "g":1435, "len":1.5, "use":"EXP", "lid":"#VM_ZI_Pilaterie", "sa":"Ligne_Fives_-_Mouscron_(frontière)#Voie-mère_de_la_ZI_de_La_Pilaterie"}, 
        {"num":"281000", "g":1435, "pk0":211.9, "pkf":230.7, "len":18.8, "use":"FD", "end":"1994", "lid":"Ligne_de_Lens_à_Corbehem", "sa":"Ligne_Lens_-_Corbehem", "af":[1126]}, 
        {"num":"283300", "g":1435, "pk0":212.58, "pkf":215.3, "len":2.72, "use":"FD", "end":"1994", "lid":"#Boucle_de_Méricourt", "sa":"Ligne_Lens_-_Corbehem#Boucle_de_Méricourt"}, 
        {"num":"284000", "g":1435, "pk0":209.3, "pkf":224.72, "len":15.42, "use":"EXP", "lid":"Ligne_de_Lens_à_Ostricourt", "sa":"Ligne_Lens_-_Ostricourt"}, 
        {"num":"284306", "g":1435, "len":1.2, "use":"FD", "end":"??", "lid":"#Shunt_Sallaumines", "sa":"Ligne_Lens_-_Ostricourt#Raccordement_de_Sallaumines"}, 
        {"num":"284311", "g":1435, "pk0":223.38, "pkf":224.6, "len":1.22, "use":"EXP", "lid":"#Shunt_Libercourt", "sa":"Ligne_Lens_-_Ostricourt#Raccordement_de_Libercourt"}, 
        {"num":"284620", "g":1435, "len":1.05, "use":"EXP", "lid":"#VM_Lens", "sa":"Ligne_Lens_-_Ostricourt#Voie-mère_de_Lens"}, 
        {"num":"284621", "g":1435, "len":1.45, "use":"EXP", "lid":"#VM_d'Ostricourt", "sa":"Ligne_Lens_-_Ostricourt#Voie-mère_d'Ostricourt"}, 
        {"num":"285000", "g":1435, "pk0":218.51, "pkf":233.09, "len":14.58, "use":"FD", "end":"1970", "lid":"Ligne_d'Hénin-Beaumont_à_Bauvin-Provin", "sa":"Ligne_Hénin-Beaumont_-_Bauvin-Provin", "af":[1327]}, 
        {"num":"286000", "g":1435, "pk0":210.33, "pkf":227.27, "len":16.94, "use":"EXP", "lid":"Ligne_de_Lens_à_Don_-_Sainghin", "sa":"Ligne_Lens-Sallaumines_-_Don-Sainghin"}, 
        {"num":"286610", "g":1435, "len":11.74, "use":"FD", "end":"1986", "lid":"#VM_Pont-à-Vendin_à_Violaines", "sa":"Ligne_Lens_-_Don-Sainghin#Voies-mères_de_Pont-à-Vendin", "af":[1125]}, 
        {"num":"286612", "g":1435, "len":11, "use":"FD", "end":"1986", "lid":"#VM_Pont-à-Vendin_n°_2", "sa":"Ligne_Lens_-_Don-Sainghin#Voies-mères_de_Pont-à-Vendin"}, 
        {"num":"286614", "g":1435, "len":3.12, "use":"FD", "end":"1986", "lid":"#VM_Pont-à-Vendin_n°_3", "sa":"Ligne_Lens_-_Don-Sainghin#Voies-mères_de_Pont-à-Vendin"}, 
        {"num":"287100", "g":1435, "len":2, "use":"FD", "end":"1986", "lid":"#Embranchement_gare_d'eau_de_Pont-à-Vendin", "sa":"Ligne_Lens_-_Don-Sainghin#Voies-mères_de_Pont-à-Vendin"}, 
        {"num":"288000", "g":1435, "len":9, "use":"FD", "end":"??", "lid":"Ligne_de_Bully_-_Grenay_à_La_Bassée_-_Violaines", "sa":"Ligne_Bully-Grenay_-_La_Bassée-Violaines", "af":[1127]}, 
        {"num":"289000", "g":1435, "len":134, "use":"FD", "end":"??", "lid":"Ligne_de_Fives_à_Abbeville", "sa":"Ligne_Lille-Flandres_-_Abbeville", "af":[1086]}, 
        {"num":"290000", "g":1435, "pk0":36.78, "pkf":39.36, "len":2.58, "use":"FD", "end":"1990", "lid":"Ligne_de_Beuvry_à_Béthune-Rivage", "sa":"Ligne_Beuvry_-_Béthune-Rivage"}, 
        {"num":"291100", "g":1435, "len":6.48, "use":"FD", "end":"1984", "lid":"Ligne_de_Lille-Saint-Sauveur_à_Lille-Port-Vauban", "sa":"Ligne_Lille-Saint-Sauveur_-_Lille-Port-Vauban"}, 
        {"num":"292000", "g":1435, "pk0":10.94, "pkf":19.59, "len":8.65, "use":"EXP", "lid":"Ligne_d'Haubourdin_à_Saint-André", "sa":"Ligne_Haubourdin_-_Saint-André"}, 
        {"num":"292306", "g":1435, "pk0":18.52, "pkf":19.57, "len":1.05, "use":"EXP", "lid":"#Shunt_Saint-André", "sa":"Ligne_Haubourdin_-_Saint-André#Raccordement_de_Saint-André"}, 
        {"num":"292311", "g":1435, "len":3.35, "use":"FD", "end":"??", "lid":"#Shunt_port_fluvial_de_Lille", "sa":"Ligne_Haubourdin_-_Saint-André#Raccordement_du_port_fluvial_de_Lille"}, 
        {"num":"292611", "g":1435, "len":2.34, "use":"FD", "end":"??", "lid":"#VM_Lomme", "sa":"Ligne_Haubourdin_-_Saint-André#Voie-mère_de_Lomme"}, 
        {"num":"293000", "g":1435, "pk0":230.51, "pkf":243, "len":12.49, "use":"FD", "end":"??", "lid":"Ligne_de_Wavrin_à_Armentières", "sa":"Ligne_Wavrin_-_Armentières", "af":[1129]}, 
        {"num":"294000", "g":1435, "pk0":20.12, "pkf":75.6, "len":55.48, "use":"FD", "end":"??", "lid":"Ligne_d'Armentières_à_Arques", "sa":"Ligne_Armentières_-_Arques", "af":[1123]}, 
        {"num":"295000", "g":1435, "len":104.79, "use":"EXP", "lid":"Ligne_de_Lille_aux_Fontinettes", "sa":"Ligne_Lille-Flandres_-_Les_Fontinettes"}, 
        {"num":"296000", "g":1435, "pk0":5.62, "pkf":21.37, "len":15.75, "use":"FD", "end":"2019", "lid":"Ligne_de_La_Madeleine_à_Comines-France", "sa":"Ligne_La_Madeleine_-_Comines-France", "af":[1322]}, 
        {"num":"296111", "g":1435, "pk0":20.9, "pkf":21, "len":0.1, "use":"FD", "end":"??", "lid":"#Embranchement_centrale_thermique"}, 
        {"num":"298000", "g":1435, "pk0":20.84, "pkf":23.06, "len":2.22, "use":"FD", "end":"1991", "lid":"Ligne_d'Armentières_à_Houplines", "sa":"Ligne_Armentières_-_Houplines", "af":[1324]}, 
        {"num":"299000", "g":1435, "len":14.78, "use":"FD", "end":"1991", "lid":"Ligne_de_Hazebrouck_à_Boeschepe", "sa":"Ligne_Hazebrouck_-_Boeschepe", "af":[1332]}, 
        {"num":"300000", "g":1435, "pk0":303.66, "pkf":319.4, "len":15.74, "use":"EXP", "lid":"Ligne_de_Dunkerque-Locale_à_Bray-Dunes", "sa":"Ligne_Dunkerque-Locale_-_Bray-Dunes", "af":[1130]}, 
        {"num":"301000", "g":1435, "pk0":192.13, "pkf":305, "len":112.87, "use":"EXP", "lid":"Ligne_d'Arras_à_Dunkerque-Locale", "sa":"Ligne_Arras_-_Dunkerque-Locale"}, 
        {"num":"301301", "g":1435, "pk0":209.14, "pkf":210.23, "len":1.09, "use":"EXP", "lid":"#Shunt_Avion", "sa":"Ligne_Arras_-_Dunkerque-Locale#Raccordement_d'Avion"}, 
        {"num":"301306", "g":1435, "len":1.3, "use":"EXP", "lid":"#Shunt_Yser", "sa":"Ligne_Arras_-_Dunkerque-Locale#Raccordements_de_Dunkerque"}, 
        {"num":"302506", "g":1435, "len":6.04, "use":"EXP", "lid":"#Shunt_Dunkerque-Ouest", "sa":"Ligne_Arras_-_Dunkerque-Locale#Raccordements_de_Dunkerque"}, 
        {"num":"302511", "g":1435, "pk0":10.22, "pkf":18.6, "len":8.38, "use":"EXP", "lid":"#VP_rapide_(Dunkerque)", "sa":"Ligne_Arras_-_Dunkerque-Locale#Raccordements_de_Dunkerque"}, 
        {"num":"302516", "g":1435, "pk0":12.07, "pkf":14.99, "len":2.92, "use":"EXP", "lid":"#VP_secteur_Mardyck_(Dunkerque)", "sa":"Ligne_Arras_-_Dunkerque-Locale#Raccordements_de_Dunkerque"}, 
        {"num":"302521", "g":1435, "pk0":15.65, "pkf":22, "len":6.35, "use":"EXP", "lid":"#VP_quais_à_pondéreux_(ouest)", "sa":"Ligne_Arras_-_Dunkerque-Locale#Raccordements_de_Dunkerque"}, 
        {"num":"302526", "g":1435, "pk0":304.84, "pkf":312.64, "len":7.8, "use":"EXP", "lid":"#Boucle_de_Dunkerque", "sa":"Ligne_Arras_-_Dunkerque-Locale#Raccordements_de_Dunkerque"}, 
        {"num":"302531", "g":1435, "len":2.99, "use":"EXP", "lid":"#Shunt_Dunkerque-Est", "sa":"Ligne_Arras_-_Dunkerque-Locale#Raccordements_de_Dunkerque"}, 
        {"num":"303000", "g":1435, "pk0":76.68, "pkf":90.1, "len":13.42, "use":"FD", "end":"1958", "lid":"Ligne_de_Watten_-_Éperlecques_à_Bourbourg", "sa":"Ligne_Watten-Éperlecques_-_Bourbourg", "lo":"bourbourg", "af":[1333]}, 
        {"num":"304000", "g":1435, "pk0":-0.7, "pkf":43.66, "len":44.36, "use":"EXP", "lid":"Ligne_de_Coudekerque-Branche_aux_Fontinettes", "sa":"Ligne_Dunkerque-Darses_-_Les_Fontinettes"}, 
        {"num":"304300", "g":1435, "len":7.53, "use":"EXP", "lid":"#Shunt_ferroviaire_sud_de_Dunkerque", "sa":"Ligne_Arras_-_Dunkerque-Locale#Raccordements_de_Dunkerque"}, 
        {"num":"305000", "g":1435, "pk0":2.05, "pkf":61.8, "len":59.75, "use":"FD", "end":"??", "lid":"Ligne_de_Saint-Roch_à_Frévent", "sa":"Ligne_Saint-Roch_-_Frévent", "af":[1078]}, 
        {"num":"306000", "g":1435, "pk0":43.26, "pkf":78.01, "len":34.75, "use":"FD", "end":"2011", "lid":"Ligne_de_Doullens_à_Arras", "sa":"Ligne_Doullens_-_Achicourt", "af":[1087]}, 
        {"num":"307000", "g":1435, "pk0":192.2, "pkf":228.6, "len":36.4, "use":"EXP", "lid":"Ligne_d'Arras_à_Saint-Pol-sur-Ternoise", "sa":"Ligne_Achicourt_-_Saint-Pol-sur-Ternoise"}, 
        {"num":"308000", "g":1435, "pk0":73.6, "pkf":134.3, "len":60.7, "use":"FD", "end":"??", "lid":"Ligne_de_St-Pol-sur-Ternoise_à_Étaples", "sa":"Ligne_Saint-Pol-sur-Ternoise_-_Étaples-Le_Touquet"}, 
        {"num":"309000", "g":1435, "pk0":219.47, "pkf":249, "len":29.53, "use":"FD", "end":"1990", "lid":"Ligne_de_Bully-Grenay_à_Brias", "sa":"Ligne_Bully-Grenay_-_Brias", "af":[1124]}, 
        {"num":"310000", "g":1435, "pk0":64.34, "pkf":117.45, "len":53.11, "use":"FD", "end":"??", "lid":"Ligne_de_Saint-Omer_à_Hesdigneul", "sa":"Ligne_Saint-Omer_-_Hesdigneul", "af":[1122]}, 
        {"num":"311000", "g":1435, "pk0":125.97, "pkf":253.47, "len":127.5, "use":"EXP", "lid":"Ligne_de_Longueau_à_Boulogne-Ville", "sa":"Ligne_Longueau_-_Boulogne-Ville"}, 
        {"num":"311306", "g":1435, "len":2.42, "use":"VS", "lid":"Flèche_d'argent", "sa":"Ligne_Longueau_-_Boulogne-Ville#Raccordement_du_Touquet", "af":[1128]}, 
        {"num":"312300", "g":1435, "pk0":250, "pkf":255.15, "len":5.15, "use":"EXP", "lid":"#Shunt_Outreau_-_hoverport", "sa":"Ligne_Longueau_-_Boulogne-Ville#Raccordements_du_port_de_Boulogne"}, 
        {"num":"312311", "g":1435, "pk0":251.69, "pkf":254.34, "len":2.65, "use":"FD", "end":"2009", "lid":"#Shunt_Boulogne-Maritime", "sa":"Ligne_Longueau_-_Boulogne-Ville#Raccordements_du_port_de_Boulogne"}, 
        {"num":"312502", "g":1435, "len":0.72, "use":"VS", "lid":"#VP_Boulogne-1", "sa":"Ligne_Longueau_-_Boulogne-Ville#Raccordements_du_port_de_Boulogne"}, 
        {"num":"312504", "g":1435, "len":1.62, "use":"FD", "end":"??", "lid":"#VP_Boulogne-2", "sa":"Ligne_Longueau_-_Boulogne-Ville#Raccordements_du_port_de_Boulogne"}, 
        {"num":"314000", "g":1435, "pk0":253.47, "pkf":297.28, "len":43.81, "use":"EXP", "lid":"Ligne_de_Boulogne-Ville_à_Calais-Maritime", "sa":"Ligne_Boulogne-Ville_-_Calais-Maritime"}, 
        {"num":"314306", "g":1435, "pk0":291.89, "pkf":292.58, "len":0.69, "use":"EXP", "lid":"#Shunt_Fontinettes", "sa":"Ligne_Boulogne-Ville_-_Calais-Maritime#Raccordements_de_Calais"}, 
        {"num":"314506", "g":1435, "pk0":293.52, "pkf":297.23, "len":3.71, "use":"EXP", "lid":"#VP_Calais", "sa":"Ligne_Boulogne-Ville_-_Calais-Maritime#Raccordements_de_Calais"}, 
        {"num":"314611", "g":1435, "len":5.4, "use":"EXP", "lid":"#VM_Calais", "sa":"Ligne_Boulogne-Ville_-_Calais-Maritime#Raccordements_de_Calais"}, 
        {"num":"315000", "g":1435, "pk0":24.92, "pkf":35.5, "len":10.58, "use":"EXP", "lid":"Ligne_de_Montsoult-Maffliers_à_Luzarches", "sa":"Ligne_Montsoult-Maffliers_-_Luzarches"}, 
        {"num":"316000", "g":1435, "pk0":50.3, "pkf":84.17, "len":33.87, "use":"EXP", "lid":"Ligne_de_Creil_à_Beauvais", "sa":"Ligne_Creil_-_Beauvais"}, 
        {"num":"317000", "g":1435, "pk0":7.09, "pkf":102.33, "len":95.24, "use":"FD", "end":"2002", "lid":"Ligne_de_Rochy-Condé_à_Soissons", "sa":"Ligne_Rochy-Condé_-_Soissons", "af":[1057, 1063]}, 
        {"num":"318000", "g":1435, "pk0":19.32, "pkf":36.1, "len":16.78, "use":"FD", "end":"1973", "lid":"Ligne_de_La_Rue-Saint-Pierre_à_Saint-Just-en-Chaussée", "sa":"Ligne_La_Rue-Saint-Pierre_-_Saint-Just-en-Chaussée", "af":[1059]}, 
        {"num":"319000", "g":1435, "pk0":95.04, "pkf":101.67, "len":6.63, "use":"EXP", "lid":"Ligne_de_Breteuil-Embranchement_à_Breteuil-Ville", "sa":"Ligne_Breteuil-Embranchement_-_Breteuil-Ville", "lo":"breteuil", "af":[1471]}, 
        {"num":"320000", "g":1435, "pk0":94.21, "pkf":136.7, "len":42.49, "use":"FD", "end":"2001", "lid":"Ligne_de_Saint-Omer-en-Chaussée_à_Vers", "sa":"Ligne_Saint-Omer-en-Chaussée_-_Vers-sur-Selle", "af":[1070]}, 
        {"num":"321000", "g":1435, "pk0":2.05, "pkf":112.8, "len":110.75, "use":"EXP", "lid":"Ligne_de_Saint-Roch_à_Darnétal-Bifurcation", "sa":"Ligne_Saint-Roch_-_Darnétal-Bifurcation"}, 
        {"num":"322000", "g":1435, "pk0":27, "pkf":83.57, "len":56.57, "use":"FD", "end":"1969", "lid":"Ligne_de_Canaples_à_Longroy_-_Gamaches", "sa":"Ligne_Canaples_-_Longroy-Gamaches", "af":[1076, 1077]}, 
        {"num":"323000", "g":1435, "pk0":175.83, "pkf":209.5, "len":33.67, "use":"EXP", "lid":"Ligne_d'Abbeville_à_Eu", "sa":"Ligne_Abbeville_-_Eu"}, 
        {"num":"324000", "g":1435, "pk0":189.01, "pkf":194.32, "len":5.31, "use":"FD", "end":"??", "lid":"Ligne_de_Noyelles-sur-Mer_à_Saint-Valery-Canal", "sa":"Ligne_Noyelles-sur-Mer_-_Saint-Valery-Canal"}, 
        {"num":"325000", "g":1435, "pk0":9.2, "pkf":182.55, "len":173.35, "use":"EXP", "lid":"Ligne_d'Épinay-Villetaneuse_au_Tréport-Mers", "sa":"Ligne_Épinay-Villetaneuse_-_Le_Tréport-Mers"}, 
        {"num":"326000", "g":1435, "pk0":28.25, "pkf":38.43, "len":10.18, "use":"EXP", "lid":"Ligne_de_la_bifurcation_de_Neuville_à_Cergy-Préfecture", "sa":"Ligne_Éragny-Neuville_-_Cergy-le-Haut"}, 
        {"num":"328000", "g":1435, "pk0":14.17, "pkf":29.34, "len":15.17, "use":"EXP", "lid":"Ligne_d'Ermont-Eaubonne_à_Valmondois", "sa":"Ligne_Ermont-Eaubonne_-_Valmondois"}, 
        {"num":"329000", "g":1435, "pk0":26.92, "pkf":67.33, "len":40.41, "use":"EXP", "lid":"Ligne_de_Pierrelaye_à_Creil", "sa":"Ligne_Pierrelaye-Liesse_-_Creil"}, 
        {"num":"330000", "g":1435, "pk0":6.44, "pkf":167.35, "len":160.91, "use":"FD", "end":"??", "lid":"Ligne_de_Saint-Denis_à_Dieppe", "sa":"Ligne_Saint-Denis_-_Dieppe", "af":[937]}, 
        {"num":"330106", "g":1435, "pk0":167.35, "pkf":169.08, "len":1.73, "use":"FD", "end":"1994", "lid":"#Embranchement_de_Dieppe-Maritime", "sa":"Ligne_Saint-Denis_-_Dieppe#Embranchement_de_Dieppe-Maritime"}, 
        {"num":"330306", "g":1435, "len":1.15, "use":"FD", "end":"??", "lid":"#Shunt_Cernay", "sa":"Ligne_Saint-Denis_-_Dieppe#Raccordement_de_Cernay"}, 
        {"num":"331300", "g":1435, "len":1.4, "use":"FD", "end":"??", "lid":"#Shunt_Épluches", "sa":"Ligne_Saint-Denis_-_Dieppe#Raccordement_d'Épluches"}, 
        {"num":"332000", "g":1435, "pk0":1.85, "pkf":33.6, "len":31.75, "use":"FD", "end":"2013", "lid":"Ligne_de_Beauvais_à_Gisors-Embranchement", "sa":"Ligne_Beauvais_-_Gisors", "af":[929]}, 
        {"num":"333000", "g":1435, "pk0":6.22, "pkf":28, "len":21.78, "use":"FD", "end":"2013", "lid":"Ligne_de_Goincourt_à_Gournay_-_Ferrières", "sa":"Ligne_Goincourt_-_Gournay-Ferrières", "af":[943]}, 
        {"num":"334000", "g":1435, "len":57.65, "use":"EXP", "lid":"Ligne_de_Paris-Saint-Lazare_à_Mantes-Station_par_Conflans-Sainte-Honorine", "sa":"Ligne_Paris-Saint-Lazare_-_Mantes-la-Jolie"}, 
        {"num":"334900", "g":1435, "pk0":3.2, "pkf":14.22, "len":11.02, "use":"EXP", "lid":"Ligne_de_Paris-Saint-Lazare_à_Ermont_-_Eaubonne", "sa":"Ligne_Paris-Saint-Lazare_-_Ermont_-_Eaubonne"}, 
        {"num":"335303", "g":1435, "pk0":22.22, "pkf":23.91, "len":1.69, "use":"EXP", "lid":"#Shunt_Achères_Voie_1A", "sa":"Ligne_Achères_-_Pontoise#Raccordements_d'Achères"}, 
        {"num":"335304", "g":1435, "pk0":22.3, "pkf":23.38, "len":1.08, "use":"EXP", "lid":"#Shunt_Achères_Voie_2A", "sa":"Ligne_Achères_-_Pontoise#Raccordements_d'Achères"}, 
        {"num":"336000", "g":1435, "pk0":24.88, "pkf":27.89, "len":3.01, "use":"EXP", "lid":"Ligne_de_Conflans-Sainte-Honorine_à_Éragny-Neuville", "sa":"Ligne_Conflans-Sainte-Honorine_-_Éragny-Neuville"}, 
        {"num":"337300", "g":1435, "pk0":30.4, "pkf":33.1, "len":2.7, "use":"EXP", "lid":"#Shunt_Éragny", "sa":"Ligne_Achères_-_Pontoise#Raccordements_de_Liesse"}, 
        {"num":"338000", "g":1435, "pk0":18.1, "pkf":33, "len":14.9, "use":"EXP", "lid":"Ligne_d'Achères_à_Pontoise", "sa":"Ligne_Achères_-_Pontoise"}, 
        {"num":"339000", "g":1435, "pk0":3.88, "pkf":59.5, "len":55.62, "use":"FD", "end":"1994", "lid":"Ligne_de_Gisors-Boisgeloup_à_Pacy-sur-Eure", "sa":"Ligne_Gisors_-_Pacy-sur-Eure", "af":[925]}, 
        {"num":"340000", "g":1435, "len":227.9, "use":"EXP", "lid":"Ligne_de_Paris-Saint-Lazare_au_Havre", "sa":"Ligne_Paris-Saint-Lazare_-_Le_Havre"}, 
        {"num":"340309", "g":1435, "pk0":133.57, "pkf":135.26, "len":1.69, "use":"EXP", "lid":"#Shunt_dépôt_de_Sotteville", "sa":"Raccordements_de_la_ligne_Paris-Saint-Lazare_-_Le_Havre#Raccordement_du_dépôt_de_Sotteville"}, 
        {"num":"340311", "g":1435, "pk0":136.77, "pkf":137.98, "len":1.21, "use":"EXP", "lid":"#Shunt_Rouen-Martainville", "sa":"Raccordements_de_la_ligne_Paris-Saint-Lazare_-_Le_Havre#Raccordement_de_Rouen-Martainville"}, 
        {"num":"340506", "g":1435, "pk0":137.98, "pkf":150.9, "len":12.92, "use":"EXP", "lid":"#VP_Rouen-Rive-Droite", "sa":"Raccordements_de_la_ligne_Paris-Saint-Lazare_-_Le_Havre#Voies_du_port_de_Rouen-Rive-Droite"}, 
        {"num":"341116", "g":1435, "pk0":0.27, "pkf":28.52, "len":28.25, "use":"EXP", "lid":"#Embranchement_maritime_est_du_port_du_Havre", "sa":"Raccordements_de_la_ligne_Paris-Saint-Lazare_-_Le_Havre#Raccordements_du_port_du_Havre"}, 
        {"num":"341300", "g":1435, "pk0":222.11, "pkf":230.66, "len":8.55, "use":"EXP", "lid":"#Shunt_maritime_du_Havre", "sa":"Raccordements_de_la_ligne_Paris-Saint-Lazare_-_Le_Havre#Raccordements_du_port_du_Havre"}, 
        {"num":"341306", "g":1435, "pk0":224.73, "pkf":226.81, "len":2.08, "use":"EXP", "lid":"#Shunt_Graville_(ouest)", "sa":"Raccordements_de_la_ligne_Paris-Saint-Lazare_-_Le_Havre#Raccordements_de_Graville"}, 
        {"num":"341311", "g":1435, "pk0":224.7, "pkf":225.14, "len":0.44, "use":"EXP", "lid":"#Shunt_Graville_(est)", "sa":"Raccordements_de_la_ligne_Paris-Saint-Lazare_-_Le_Havre#Raccordements_de_Graville"}, 
        {"num":"341315", "g":1435, "pk0":226.16, "pkf":229.08, "len":2.92, "use":"EXP", "lid":"#Shunt_Pont-Rouge", "sa":"Raccordements_de_la_ligne_Paris-Saint-Lazare_-_Le_Havre#Raccordement_du_Pont-Rouge"}, 
        {"num":"341500", "g":1435, "pk0":223.28, "pkf":225.5, "len":2.22, "use":"FD", "end":"??", "lid":"#VP_du_Havre", "sa":"Raccordements_de_la_ligne_Paris-Saint-Lazare_-_Le_Havre#Raccordements_du_port_du_Havre"}, 
        {"num":"341606", "g":1435, "pk0":225.45, "pkf":228.05, "len":2.6, "use":"FD", "end":"??", "lid":"#VM_du_Havre_n°_2_(J._Durand)", "sa":"Raccordements_de_la_ligne_Paris-Saint-Lazare_-_Le_Havre#Voies-mères_du_Havre"}, 
        {"num":"342000", "g":1435, "pk0":0.34, "pkf":53.01, "len":52.67, "use":"FD", "end":"??", "lid":"Ligne_de_Gisors-Embranchement_à_Pont-de-l'Arche", "sa":"Ligne_Gisors_-_Pont-de-l'Arche", "af":[927]}, 
        {"num":"343000", "g":1435, "pk0":107.05, "pkf":123.52, "len":16.47, "use":"FD", "end":"1954", "lid":"Ligne_de_Saint-Pierre-du-Vauvray_aux_Andelys", "sa":"Ligne_Saint-Pierre-du-Vauvray_-_Les_Andelys", "af":[924]}, 
        {"num":"344000", "g":1435, "pk0":104, "pkf":139.7, "len":35.7, "use":"FD", "end":"1972", "lid":"Ligne_de_Charleval_à_Serqueux", "sa":"Ligne_Charleval_-_Serqueux", "af":[928]}, 
        {"num":"347000", "g":1435, "pk0":0.35, "pkf":12.11, "len":11.76, "use":"FD", "end":"2002", "lid":"Ligne_de_Chars_à_Magny-en-Vexin", "sa":"Ligne_Chars_-_Magny-en-Vexin", "af":[962]}, 
        {"num":"349000", "g":1435, "pk0":0.4, "pkf":10.2, "len":9.8, "use":"FD", "end":"1954", "lid":"Ligne_de_Montérolier-Buchy_à_Saint-Saëns", "sa":"Ligne_Montérolier-Buchy_-_Saint-Saëns", "af":[931]}, 
        {"num":"350000", "g":1435, "pk0":150.01, "pkf":200.05, "len":50.04, "use":"EXP", "lid":"Ligne_de_Malaunay_-_Le_Houlme_à_Dieppe", "sa":"Ligne_Malaunay-Le_Houlme_-_Dieppe"}, 
        {"num":"350306", "g":1435, "len":0.4, "use":"NEUT", "lid":"Raccordement_de_St-Pierre", "sa":"Raccordement_de_St-Pierre"}, 
        {"num":"351000", "g":1435, "pk0":156.72, "pkf":185.9, "len":29.18, "use":"FD", "end":"1996", "lid":"Ligne_de_Barentin_à_Caudebec-en-Caux", "sa":"Ligne_Barentin_-_Caudebec-en-Caux", "af":[930]}, 
        {"num":"352300", "g":1435, "len":3, "use":"FD", "end":"1950", "lid":"Raccordement_d'Étaimpuis", "sa":"Raccordement_d'Étaimpuis"}, 
        {"num":"353300", "g":1435, "pk0":0.19, "pkf":6.58, "len":6.39, "use":"NEUT", "lid":"Raccordement_de_Clères", "sa":"Raccordement_de_Clères"}, 
        {"num":"354000", "g":1435, "pk0":0.23, "pkf":35.6, "len":35.37, "use":"EXP", "lid":"Ligne_de_Montérolier-Buchy_à_Motteville", "sa":"Ligne_Montérolier-Buchy_-_Motteville", "af":[938]}, 
        {"num":"356000", "g":1435, "pk0":4.1, "pkf":40.8, "len":36.7, "use":"FD", "end":"??", "lid":"Ligne_de_Rouxmesnil_à_Eu", "sa":"Ligne_Rouxmesnil_-_Eu", "af":[940]}, 
        {"num":"357000", "g":1435, "pk0":0.9, "pkf":71.5, "len":70.6, "use":"FD", "end":"1994", "lid":"Ligne_de_Dieppe_à_Fécamp", "sa":"Ligne_Dieppe_-_Fécamp", "af":[936]}, 
        {"num":"358000", "g":1435, "pk0":170.03, "pkf":201.2, "len":31.17, "use":"FD", "end":"1994", "lid":"Ligne_de_Motteville_à_Saint-Valery-en-Caux", "sa":"Ligne_Motteville_-_Saint-Valéry-en-Caux", "lo":"stvalery"}, 
        {"num":"359000", "g":1435, "pk0":202.01, "pkf":221.92, "len":19.91, "use":"EXP", "lid":"Ligne_de_Bréauté_-_Beuzeville_à_Fecamp", "sa":"Ligne_Bréauté-Beuzeville_-_Fécamp"}, 
        {"num":"360000", "g":1435, "pk0":214.35, "pkf":229.78, "len":15.43, "use":"FD", "end":"??", "lid":"Ligne_des_Ifs_à_Étretat", "sa":"Ligne_Les_Ifs_-_Étretat", "af":[934]}, 
        {"num":"361000", "g":1435, "pk0":223, "pkf":255.44, "len":32.44, "use":"EXP", "lid":"Ligne_du_Havre-Graville_à_Tourville-les-Ifs", "sa":"Ligne_Le_Havre-Graville_-_Tourville-Les_Ifs", "af":[935]}, 
        {"num":"362000", "g":1435, "pk0":203.04, "pkf":221.08, "len":18.04, "use":"EXP", "lid":"Ligne_de_Bréauté-Beuzeville_à_Gravenchon-Port-Jérôme", "sa":"Ligne_Bréauté-Beuzeville_-_Gravenchon-Port-Jérome"}, 
        {"num":"362506", "g":1435, "len":3.2, "use":"VS", "lid":"Raccordement_maritime_de_Gravenchon", "sa":"Raccordement_maritime_de_Gravenchon"}, 
        {"num":"365000", "g":1435, "pk0":0.2, "pkf":9.2, "len":9, "use":"EXP", "lid":"Ligne_de_Rouen-Gauche_à_Petit-Couronne_(voies_des_quais)", "sa":"Ligne_Rouen-Rive-Gauche_-_Petit-Couronne_(voies_des_quais)"}, 
        {"num":"365501", "g":1435, "len":20.7, "use":"VS", "lid":"Voies_du_port_de_Rouen-Rive-Gauche", "sa":"Voies_du_port_de_Rouen-Rive-Gauche"}, 
        {"num":"365502", "g":1435, "len":2.3, "use":"EXP", "lid":"Raccordement_du_Petit-Quevilly", "sa":"Raccordement_du_Petit-Quevilly"}, 
        {"num":"366000", "g":1435, "pk0":57.28, "pkf":370.26, "len":312.98, "use":"EXP", "lid":"Ligne_de_Mantes-la-Jolie_à_Cherbourg", "sa":"Ligne_Mantes-la-Jolie_-_Cherbourg"}, 
        {"num":"366106", "g":1435, "len":5.02, "use":"EXP", "lid":"Embranchement_Cherbourg-Maritime", "sa":"Embranchement_Cherbourg-Maritime"}, 
        {"num":"366199", "g":1435, "pk0":369.8, "pkf":371.5, "len":1.7, "use":"FD", "end":"1970", "lid":"Embranchement_Cherbourg_transatlantique", "sa":"Embranchement_Cherbourg_transatlantique"}, 
        {"num":"366306", "g":1435, "pk0":57.73, "pkf":59.05, "len":1.32, "use":"EXP", "lid":"Raccordement_des_Piquettes", "sa":"Raccordement_des_Piquettes"}, 
        {"num":"366311", "g":1435, "pk0":214.39, "pkf":214.98, "len":0.59, "use":"EXP", "lid":"Raccordement_de_Mézidon", "sa":"Raccordement_de_Mézidon"}, 
        {"num":"366536", "g":1435, "pk0":0.05, "pkf":3.89, "len":3.84, "use":"EXP", "lid":"Raccordement_maritime_de_Homet", "sa":"Raccordement_maritime_de_Homet"}, 
        {"num":"367300", "g":1435, "len":0.72, "use":"EXP", "lid":"Raccordement_d'Eauplet", "sa":"Raccordement_d'Eauplet"}, 
        {"num":"368300", "g":1435, "pk0":136.74, "pkf":137.1, "len":0.36, "use":"EXP", "lid":"Raccordement_de_Sotteville_à_Darnétal", "sa":"Raccordement_de_Sotteville_à_Darnétal"}, 
        {"num":"368301", "g":1435, "pk0":115.42, "pkf":115.83, "len":0.41, "use":"EXP", "lid":"Raccordement_de_Darnétal_à_Rouen-Rive-Droite", "sa":"Raccordement_de_Darnétal_à_Rouen-Rive-Droite"}, 
        {"num":"369000", "g":1435, "pk0":133.6, "pkf":135.3, "len":1.7, "use":"FD", "end":"??", "lid":"Ligne_de_Sotteville_à_Rouen-Rive-Gauche", "sa":"Ligne_Sotteville_-_Rouen-Rive-Gauche"}, 
        {"num":"370000", "g":1435, "pk0":8.68, "pkf":107.37, "len":98.69, "use":"FD", "end":"1969-1990", "lid":"Ligne_de_Saint-Georges-Motel_à_Grand-Quevilly", "sa":"Ligne_Saint-Georges-Motel_-_Grand-Quevilly", "af":[573, 918]}, 
        {"num":"371000", "g":1435, "pk0":0.34, "pkf":21, "len":20.66, "use":"FD", "end":"1959", "lid":"Ligne_d'Évreux-Embranchement_à_Acquigny", "sa":"Ligne_Évreux-Embranchement_-_Acquigny", "af":[917]}, 
        {"num":"372000", "g":1435, "pk0":0.42, "pkf":57.3, "len":56.88, "use":"EXP", "lid":"Ligne_de_Serquigny_à_Oissel", "sa":"Ligne_Serquigny_-_Oissel"}, 
        {"num":"373300", "g":1435, "pk0":1, "pkf":5, "len":4, "use":"FD", "end":"1990", "lid":"Raccordement_de_La_Londe", "sa":"Raccordement_de_La_Londe"}, 
        {"num":"374300", "g":1435, "len":1.75, "use":"EXP", "lid":"Raccordement_de_Serquigny", "sa":"Raccordement_de_Serquigny"}, 
        {"num":"375000", "g":1435, "pk0":107.8, "pkf":187.06, "len":79.26, "use":"FD", "end":"2011", "lid":"Ligne_d'Évreux-Embranchement_à_Quetteville", "sa":"Ligne_Évreux-Embranchement_-_Quetteville", "af":[261, 910]}, 
        {"num":"375199", "g":1435, "pk0":108.3, "pkf":109.31, "len":1.01, "use":"FD", "end":"1975", "lid":"#Branch_Évreux-Navarre", "sa":"Ligne_Évreux-Embranchement_-_Quetteville#Embranchement_d'Évreux-Navarre"}, 
        {"num":"376000", "g":1435, "pk0":106.73, "pkf":113.99, "len":7.26, "use":"FD", "end":"1969", "lid":"Ligne_de_Saint-Pierre-du-Vauvray_à_Louviers", "sa":"Ligne_Saint-Pierre-du-Vauvray_-_Louviers", "af":[917]}, 
        {"num":"377000", "g":1435, "pk0":208.04, "pkf":233.6, "len":25.56, "use":"FD", "end":"??", "lid":"Ligne_de_Pont-l'Évêque_à_Honfleur", "sa":"Ligne_Pont-l'Évêque_-_Honfleur", "lo":"honfleur", "af":[257]}, 
        {"num":"377599", "g":1435, "pk0":232, "pkf":233.04, "len":1.04, "use":"FD", "end":"1977", "lid":"#VP_Honfleur", "sa":"Ligne_Pont-l'Évêque_-_Honfleur#Tracé"}, 
        {"num":"379000", "g":1435, "pk0":0.57, "pkf":50.07, "len":49.5, "use":"FD", "end":"??", "lid":"Ligne_de_Mézidon_à_Trouville-Deauville", "sa":"Ligne_Mézidon_-_Trouville-Deauville", "af":[255]}, 
        {"num":"380000", "g":1435, "len":24, "use":"FD", "end":"1980", "lid":"Ligne_de_Caen_à_Dozulé_-_Putot", "sa":"Ligne_Caen_-_Dozulé-Putot", "af":[254]}, 
        {"num":"381000", "g":1435, "len":4.77, "use":"FD", "end":"1973", "lid":"Ligne_de_Neuilly-la-Forêt_à_Isigny-sur-Mer", "sa":"Ligne_Neuilly_-_Isigny-sur-Mer", "lo":"isigny", "af":[225]}, 
        {"num":"382100", "g":1435, "len":0.88, "use":"FD", "end":"2000", "lid":"#Branch_Évreux-Ville", "sa":"Ligne_Évreux-Embranchement_-_Acquigny#Embranchement_d'Évreux-Ville"}, 
        {"num":"390000", "g":1435, "pk0":190.11, "pkf":219.29, "len":29.18, "use":"EXP", "lid":"Ligne_de_Lisieux_à_Trouville_-_Deauville", "sa":"Ligne_Lisieux_-_Trouville-Deauville"}, 
        {"num":"395000", "g":1435, "pk0":21.45, "pkf":181.83, "len":160.38, "use":"EXP", "lid":"Ligne_de_Saint-Cyr_à_Surdon", "sa":"Ligne_Saint-Cyr_-_Surdon"}, 
        {"num":"395306", "g":1435, "pk0":0.08, "pkf":3, "len":2.92, "use":"EXP", "lid":"#Shunt_Saint-Cyr", "sa":"Ligne_Saint-Cyr_-_Surdon#Raccordement_de_Saint-Cyr"}, 
        {"num":"396000", "g":1435, "pk0":32.22, "pkf":52.2, "len":19.98, "use":"EXP", "lid":"Ligne_de_Plaisir_-_Grignon_à_Épône_-_Mézières", "sa":"Ligne_Plaisir-Grignon_-_Épône-Mézières"}, 
        {"num":"396306", "g":1435, "pk0":50.61, "pkf":51.45, "len":0.84, "use":"EXP", "lid":"#Shunt_Épône", "sa":"Ligne_Plaisir-Grignon_-_Épône-Mézières#Raccordement_d'Épône"}, 
        {"num":"397000", "g":1435, "pk0":1.97, "pkf":36.98, "len":35.01, "use":"FD", "end":"1949-1972", "lid":"Ligne_de_Dreux_à_Saint-Aubin-du-Vieil-Évreux", "sa":"Ligne_Dreux_-_Saint-Aubin-du-Vieil-Évreux", "af":[573, 560, 911]}, 
        {"num":"398000", "g":1435, "pk0":5.66, "pkf":38.42, "len":32.76, "use":"FD", "end":"1991", "lid":"Ligne_de_Saint-Martin-d'Écublei_à_Conches", "sa":"Ligne_Saint-Martin-d'Écublei_-_Conches", "lo":"conches", "af":[245]}, 
        {"num":"400000", "g":1435, "pk0":0.95, "pkf":46.69, "len":45.74, "use":"FD", "end":"1994", "lid":"Ligne_d'Échauffour_à_Bernay", "sa":"Ligne_Échauffour_-_Bernay", "lo":"bernay", "af":[243]}, 
        {"num":"401000", "g":1435, "pk0":0.7, "pkf":29, "len":28.3, "use":"FD", "end":"1969", "lid":"Ligne_de_La_Trinité-de-Réville_à_Lisieux", "sa":"Ligne_La_Trinité-de-Réville_-_Lisieux", "af":[258]}, 
        {"num":"402000", "g":1435, "pk0":0.77, "pkf":62.09, "len":61.32, "use":"FD", "end":"1991", "lid":"Ligne_de_Sainte-Gauburge_à_Mesnil-Mauger", "sa":"Ligne_Sainte-Gauburge_-_Mesnil-Mauger", "af":[242]}, 
        {"num":"403300", "g":1435, "pk0":81.77, "pkf":83.89, "len":2.12, "use":"FD", "end":"??", "lid":"Raccordement_de_Surdon", "sa":"Raccordement_de_Surdon"}, 
        {"num":"405000", "g":1435, "pk0":2.19, "pkf":130.7, "len":128.51, "use":"EXP", "lid":"Ligne_d'Argentan_à_Granville", "sa":"Ligne_Argentan_-_Granville"}, 
        {"num":"405536", "g":1435, "len":1.04, "use":"FD", "end":"??", "lid":"#Raccordement_maritime_de_Granville", "sa":"Ligne_Argentan_-_Granville#Raccordement_maritime_de_Granville"}, 
        {"num":"408000", "g":1435, "len":181.64, "use":"EXP", "lid":"LGV_Bretagne-Pays_de_la_Loire", "sa":"LGV_Bretagne_-_Pays_de_la_Loire"}, 
        {"num":"408315", "g":1435, "len":1.97, "use":"EXP", "lid":"#Raccordement_de_la_Milesse_Fret", "sa":"LGV_Bretagne_-_Pays_de_la_Loire#Raccordement_de_la_Milesse_Fret"}, 
        {"num":"408320", "g":1435, "len":3.57, "use":"EXP", "lid":"#Raccordement_de_la_Milesse-Voyageurs_V1", "sa":"LGV_Bretagne_-_Pays_de_la_Loire#Raccordement_de_la_Milesse-Voyageurs_V1"}, 
        {"num":"408340", "g":1435, "len":9.28, "use":"EXP", "lid":"#Raccordement_de_Sablé-sur-Sarthe", "sa":"LGV_Bretagne_-_Pays_de_la_Loire#Raccordement_de_Sablé-sur-Sarthe"}, 
        {"num":"408345", "g":1435, "len":3.61, "use":"EXP", "lid":"Virgule_de_Sablé", "sa":"LGV_Bretagne_-_Pays_de_la_Loire#Virgule_de_Sablé-sur-Sarthe"}, 
        {"num":"408360", "g":1435, "len":5.58, "use":"EXP", "lid":"#Raccordement_de_Laval-Est", "sa":"LGV_Bretagne_-_Pays_de_la_Loire#Raccordement_de_Laval-Est"}, 
        {"num":"408370", "g":1435, "len":7.68, "use":"EXP", "lid":"#Raccordement_de_Laval-Ouest", "sa":"LGV_Bretagne_-_Pays_de_la_Loire#Raccordement_de_Laval-Ouest"}, 
        {"num":"409000", "g":1435, "len":42, "use":"EXP", "lid":"Ligne_de_Chartres_à_Dreux", "sa":"Ligne_Chartres_-_Dreux", "af":[564]}, 
        {"num":"410000", "g":1435, "pk0":1.6, "pkf":8.24, "len":6.64, "use":"FD", "end":"1990", "lid":"Ligne_de_Couliboeuf_à_Falaise", "sa":"Ligne_Couliboeuf_-_Falaise", "af":[238]}, 
        {"num":"411000", "g":1435, "pk0":0.4, "pkf":29.02, "len":28.62, "use":"FD", "end":"2003", "lid":"Ligne_de_Falaise_à_Berjou", "sa":"Ligne_Falaise_-_Berjou", "af":[238]}, 
        {"num":"412000", "g":1435, "pk0":240.55, "pkf":300.5, "len":59.95, "use":"FD", "end":"1991", "lid":"Ligne_de_Caen_à_Cerisy-Belle-Étoile", "sa":"Ligne_Caen_-_Cerisi-Belle-Étoile", "af":[236]}, 
        {"num":"413000", "g":1435, "pk0":1.28, "pkf":73, "len":71.72, "use":"FD", "end":"1995", "lid":"Ligne_de_Caen_à_Vire", "sa":"Ligne_Caen_-_Vire", "af":[119]}, 
        {"num":"414000", "g":1435, "pk0":0.23, "pkf":21, "len":20.77, "use":"FD", "end":"1991", "lid":"Ligne_de_Saint-Lô_à_Guilberville", "sa":"Ligne_Saint-Lô_-_Guilberville", "lo":"guilberville", "af":[10]}, 
        {"num":"415000", "g":1435, "len":206.21, "use":"EXP", "lid":"Ligne_de_Lison_à_Lamballe", "sa":"Ligne_Lison_-_Lamballe"}, 
        {"num":"416000", "g":1435, "pk0":0.24, "pkf":8.7, "len":8.46, "use":"FD", "end":"1941", "lid":"Ligne_d'Orval_-_Hyenville_à_Regnéville-sur-Mer", "sa":"Ligne_Orval-Hyenville_-_Regnéville-sur-Mer", "lo":"regneville", "af":[224]}, 
        {"num":"417000", "g":1435, "pk0":0.38, "pkf":72.93, "len":72.55, "use":"FD", "end":"1996", "lid":"Ligne_de_Coutances_à_Sottevast", "sa":"Ligne_Coutances_-_Sottevast", "af":[6]}, 
        {"num":"418000", "g":1435, "pk0":313.11, "pkf":355.2, "len":42.09, "use":"FD", "end":"1996", "lid":"Ligne_de_Carentan_à_Carteret", "sa":"Ligne_Carentan_-_Carteret", "lo":"carteret", "af":[7]}, 
        {"num":"419300", "g":1435, "len":2.68, "use":"FD", "end":"1996", "lid":"#Shunt_Baudreville_à_Saint-Sauveur-de-Pierrepont", "sa":"Ligne_Carentan_-_Carteret#Raccordement_de_Baudreville_à_Saint-Sauveur-de-Pierrepont"}, 
        {"num":"420000", "g":1435, "pk0":0.4, "pkf":622.42, "len":622.02, "use":"EXP", "lid":"Ligne_de_Paris-Montparnasse_à_Brest", "sa":"Ligne_Paris-Montparnasse_-_Brest"}, 
        {"num":"421300", "g":1435, "pk0":618.33, "pkf":625, "len":6.67, "use":"EXP", "lid":"#Shunt_Rody_port_de_Brest", "sa":"Ligne_Paris-Montparnasse_-_Brest#Raccordement_du_Rody_au_port_de_Brest"}, 
        {"num":"421501", "g":1435, "pk0":621.13, "pkf":623.2, "len":2.07, "use":"VS", "lid":"#VP_Brest_1", "sa":"Ligne_Paris-Montparnasse_-_Brest#Voies_du_port_de_Brest"}, 
        {"num":"421502", "g":1435, "pk0":621.13, "pkf":622, "len":0.87, "use":"VS", "lid":"#VP_Brest_2", "sa":"Ligne_Paris-Montparnasse_-_Brest#Voies_du_port_de_Brest"}, 
        {"num":"422000", "g":1435, "pk0":0.45, "pkf":82.29, "len":81.84, "use":"FD", "end":"2008", "lid":"Ligne_de_La_Loupe_à_Prey", "sa":"Ligne_La_Loupe_-_Prey", "af":[560]}, 
        {"num":"423000", "g":1435, "pk0":0.39, "pkf":66.3, "len":65.91, "use":"FD", "end":"2001", "lid":"Ligne_d'Alençon_à_Condé-sur-Huisne", "sa":"Ligne_Alençon_-_Condé-sur-Huisne", "af":[87]}, 
        {"num":"424000", "g":1435, "pk0":0.7, "pkf":37.88, "len":37.18, "use":"FD", "end":"1994", "lid":"Ligne_de_Mortagne-au-Perche_à_L'Aigle", "sa":"Ligne_Mortagne-au-Perche_-_L'Aigle", "af":[234]}, 
        {"num":"425000", "g":1435, "pk0":4.17, "pkf":33.56, "len":29.39, "use":"FD", "end":"1960", "lid":"Ligne_de_Mortagne-au-Perche_à_Sainte-Gauburge", "sa":"Ligne_Mortagne-au-Perche_-_Sainte-Gauburge", "af":[241]}, 
        {"num":"426000", "g":1435, "len":38, "use":"FD", "end":"1962", "lid":"Ligne_de_Mamers_à_Mortagne-au-Perche", "sa":"Ligne_Mamers_-_Mortagne-au-Perche", "af":[214]}, 
        {"num":"427000", "g":1435, "pk0":0.4, "pkf":24.6, "len":24.2, "use":"FD", "end":"1989", "lid":"Ligne_de_La_Hutte_-_Coulombiers_à_Mamers", "sa":"Ligne_La_Hutte-Coulombiers_-_Mamers", "af":[214]}, 
        {"num":"428000", "g":1435, "pk0":2.24, "pkf":27.5, "len":25.26, "use":"FD", "end":"1992", "lid":"Ligne_de_Sillé-le-Guillaume_à_La_Hutte-Coulombiers", "sa":"Ligne_Sillé-le-Guillaume_-_La_Hutte-Coulombiers", "lo":"hutte", "af":[215]}, 
        {"num":"429000", "g":1435, "pk0":130.27, "pkf":178, "len":47.73, "use":"EXP", "lid":"Ligne_de_Courtalain_à_Connerré_(LGV)", "sa":"LGV_Atlantique"}, 
        {"num":"429310", "g":1435, "pk0":179.32, "pkf":182.93, "len":3.61, "use":"EXP", "lid":"Raccordement_de_Connerré-Sud", "sa":"Raccordement_de_Connerré-Sud"}, 
        {"num":"430000", "g":1435, "pk0":3.95, "pkf":142.49, "len":138.54, "use":"EXP", "lid":"Ligne_du_Mans_à_Mézidon", "sa":"Ligne_Le_Mans_-_Mézidon"}, 
        {"num":"431000", "g":1435, "pk0":1.22, "pkf":233.8, "len":232.58, "use":"EXP", "lid":"LGV_Atlantique", "sa":"LGV_Atlantique"}, 
        {"num":"431300", "g":1435, "len":1.87, "use":"EXP", "lid":"Raccordement_de_Massy_(LGV)", "sa":"Raccordement_de_Massy_(LGV)"}, 
        {"num":"431302", "g":1435, "pk0":65.83, "pkf":66.44, "len":0.61, "use":"EXP", "lid":"Raccordement_d'Auneau_(LGV)", "sa":"Raccordement_d'Auneau_(LGV)"}, 
        {"num":"431305", "g":1435, "pk0":128.86, "pkf":130.41, "len":1.55, "use":"EXP", "lid":"Raccordement_de_Courtalain_(LGV)", "sa":"Raccordement_de_Courtalain_(LGV)"}, 
        {"num":"431310", "g":1435, "pk0":177.69, "pkf":178.46, "len":0.77, "use":"EXP", "lid":"Raccordement_de_St-Amand-Longpré_(LGV)", "sa":"Raccordement_de_St-Amand-Longpré_(LGV)"}, 
        {"num":"431315", "g":1435, "pk0":214.7, "pkf":217.39, "len":2.69, "use":"EXP", "lid":"Raccordement_de_St-Pierre-des-Corps_(LGV)", "sa":"Raccordement_de_St-Pierre-des-Corps_(LGV)"}, 
        {"num":"432000", "g":1435, "pk0":0.58, "pkf":68.3, "len":67.72, "use":"FD", "end":"2018", "lid":"Ligne_d'Alençon_à_Domfront", "sa":"Ligne_Alençon_-_Domfront", "af":[192]}, 
        {"num":"433000", "g":1435, "pk0":0.24, "pkf":15.7, "len":15.46, "use":"FD", "end":"1992", "lid":"Ligne_de_Couterne_à_La_Ferté-Macé", "sa":"Ligne_Couterne_-_La_Ferté-Macé", "af":[235]}, 
        {"num":"434000", "g":1435, "len":13.72, "use":"FD", "end":"1992", "lid":"Ligne_de_Briouze_à_La_Ferté-Macé", "sa":"Ligne_Briouze_-_La_Ferté-Macé", "af":[235]}, 
        {"num":"435000", "g":1435, "pk0":5.3, "pkf":45.03, "len":39.73, "use":"FD", "end":"1992", "lid":"Ligne_de_Pré-en-Pail_à_Mayenne", "sa":"Ligne_Pré-en-Pail_-_Mayenne", "af":[80]}, 
        {"num":"436000", "g":1435, "pk0":288.85, "pkf":366.27, "len":77.42, "use":"FD", "end":"??", "lid":"Ligne_de_La_Chapelle-Anthenaise_à_Flers", "sa":"Ligne_La_Chapelle-Anthenaise_-_Flers", "af":[184]}, 
        {"num":"437000", "g":1435, "pk0":0.7, "pkf":61.5, "len":60.8, "use":"FD", "end":"1995", "lid":"Ligne_de_Domfront_à_Pontaubault", "sa":"Ligne_Domfront_-_Pontaubault", "af":[61]}, 
        {"num":"438000", "g":1435, "pk0":0.3, "pkf":47, "len":46.7, "use":"FD", "end":"1987", "lid":"Ligne_de_Mayenne_à_La_Selle-en-Luitré", "sa":"Ligne_Mayenne_-_La_Selle-en-Luitré", "lo":"selle", "af":[82]}, 
        {"num":"439000", "g":1435, "pk0":0.41, "pkf":77.6, "len":77.19, "use":"FD", "end":"1991", "lid":"Ligne_de_Vitré_à_Pontorson", "sa":"Ligne_Vitré_-_Pontorson", "af":[42, 52]}, 
        {"num":"440000", "g":1435, "pk0":2.2, "pkf":40, "len":37.8, "use":"FD", "end":"1992", "lid":"Ligne_de_Vire_à_Romagny", "sa":"Ligne_Vire_-_Romagny", "lo":"romagny", "af":[99]}, 
        {"num":"441000", "g":1435, "pk0":375.68, "pkf":456.86, "len":81.18, "use":"EXP", "lid":"Ligne_de_Rennes_à_Saint-Malo_-_Saint-Servan", "sa":"Ligne_Rennes_-_Saint-Malo"}, 
        {"num":"442500", "g":1435, "pk0":453.32, "pkf":454.91, "len":1.59, "use":"EXP", "lid":"Voie_du_port_de_St-Malo", "sa":"Voie_du_port_de_St-Malo"}, 
        {"num":"443000", "g":1435, "pk0":410.58, "pkf":447.7, "len":37.12, "use":"FD", "end":"1994", "lid":"Ligne_de_La_Brohinière_à_Dinan", "sa":"Ligne_La_Brohinière_-_Dinan", "lo":"dinan", "af":[30]}, 
        {"num":"444000", "g":1435, "len":20.8, "use":"FD", "end":"1992", "lid":"Ligne_de_Dinan_à_Dinard-Saint-Énogat", "sa":"Ligne_Dinan_-_Dinard-Saint-Énogat", "lo":"dinard", "af":[164]}, 
        {"num":"445000", "g":1435, "pk0":475.59, "pkf":482, "len":6.41, "use":"FD", "end":"2016", "lid":"Ligne_de_Saint-Brieuc_au_Légué", "sa":"Ligne_Saint-Brieuc_-_Le_Légué"}, 
        {"num":"446000", "g":1435, "pk0":531.25, "pkf":547.15, "len":15.9, "use":"EXP", "lid":"Ligne_de_Plouaret_à_Lannion", "sa":"Ligne_Plouaret-Trégor_-_Lannion"}, 
        {"num":"447000", "g":1435, "pk0":2.64, "pkf":28.2, "len":25.56, "use":"EXP", "lid":"Ligne_de_Morlaix_à_Roscoff", "sa":"Ligne_Morlaix_-_Roscoff"}, 
        {"num":"448000", "g":1435, "pk0":36.7, "pkf":73.98, "len":37.28, "use":"FD", "end":"1938", "lid":"Ligne_de_Saint-Hilaire-du-Harcouët_à_Fougères", "sa":"Ligne_Saint-Hilaire-du-Harcouët_-_Fougères", "af":[33]}, 
        {"num":"449500", "g":1435, "len":2.93, "use":"FD", "end":"??", "lid":"#Voie_du_port_de_Morlaix", "sa":"Ligne_Paris-Montparnasse_-_Brest#Voie_du_port_de_Morlaix", "af":[1338]}, 
        {"num":"450000", "g":1435, "pk0":210.98, "pkf":305.82, "len":94.84, "use":"EXP", "lid":"Ligne_du_Mans_à_Angers-Maître-École", "sa":"Ligne_Le_Mans_-_Angers-Maître-École"}, 
        {"num":"451300", "g":1435, "pk0":0.65, "pkf":3.96, "len":3.31, "use":"EXP", "lid":"Raccordement_de_La_Duboisière_(Le_Mans)", "sa":"Raccordement_de_La_Duboisière_(Le_Mans)"}, 
        {"num":"451311", "g":1435, "pk0":2.5, "pkf":3, "len":0.5, "use":"EXP", "lid":"Raccordement_de_St-Georges_(Le_Mans)", "sa":"Raccordement_de_St-Georges_(Le_Mans)"}, 
        {"num":"453000", "g":1435, "len":10.92, "use":"FD", "end":"1954", "lid":"Ligne_de_Miniac-Morvan_à_La_Gouesnière_-_Cancale_-_Saint-Méloir", "sa":"Ligne_Miniac-Morvan_-_La_Gouesnière-Cancale-Saint-Méloir", "af":[168]}, 
        {"num":"456000", "g":1435, "len":45.47, "use":"FD", "end":"1972", "lid":"Ligne_de_Juigné-sur-Sarthe_à_Sillé-le-Guillaume", "sa":"Ligne_Juigné-sur-Sarthe_-_Sillé-le-Guillaume", "af":[216]}, 
        {"num":"457000", "g":1435, "pk0":314.3, "pkf":394, "len":79.7, "use":"FD", "end":"2011", "lid":"Ligne_de_Segré_à_Nantes-État", "sa":"Ligne_Segré_-_Nantes-État", "af":[81]}, 
        {"num":"458000", "g":1435, "pk0":301.4, "pkf":329.5, "len":28.1, "use":"FD", "end":"2018", "lid":"Ligne_de_Laval_à_Gennes-Longuefuye", "sa":"Ligne_Laval_-_Gennes-Longuefuye", "af":[182]}, 
        {"num":"459300", "g":1435, "pk0":429.62, "pkf":433.38, "len":3.76, "use":"FD", "end":"??", "lid":"#Shunt_Besné-Pontchâteau", "sa":"Ligne_Sablé_-_Montoir-de-Bretagne#Raccordement_de_Besné-Pontchâteau", "af":[180]}, 
        {"num":"460000", "g":1435, "pk0":258.93, "pkf":439.78, "len":180.85, "use":"FD", "end":"2015", "lid":"Ligne_de_Sablé_à_Montoir-de-Bretagne", "sa":"Ligne_Sablé_-_Montoir-de-Bretagne", "af":[180, 183, 317]}, 
        {"num":"461000", "g":1435, "pk0":299.02, "pkf":314, "len":14.98, "use":"FD", "end":"1954", "lid":"Ligne_de_Chemazé_à_Craon", "sa":"Ligne_Chemazé_-_Craon", "lo":"craon", "af":[45]}, 
        {"num":"462000", "g":1435, "pk0":302.24, "pkf":360.5, "len":58.26, "use":"FD", "end":"1998", "lid":"Ligne_de_Laval_à_Pouancé", "sa":"Ligne_Laval_-_Pouancé", "af":[181]}, 
        {"num":"463000", "g":1435, "pk0":356.28, "pkf":449.4, "len":93.12, "use":"FD", "end":"2000", "lid":"Ligne_de_Châteaubriant_à_Ploërmel", "sa":"Ligne_Châteaubriant_-_Ploërmel", "lo":"ploermel1", "af":[29, 32]}, 
        {"num":"464000", "g":1435, "pk0":367.31, "pkf":401.1, "len":33.79, "use":"FD", "end":"1954", "lid":"Ligne_de_Saint-Vincent-des-Landes_à_Massérac", "sa":"Ligne_Saint-Vincent-des-Landes_-_Massérac", "af":[37]}, 
        {"num":"465000", "g":1435, "pk0":428.5, "pkf":456.6, "len":28.1, "use":"FD", "end":"1967", "lid":"Ligne_de_Beslé_à_Blain", "sa":"Ligne_Beslé_-_Blain", "af":[83]}, 
        {"num":"466000", "g":1435, "len":58.63, "use":"EXP", "lid":"Ligne_de_Châteaubriant_à_Rennes", "sa":"Ligne_Châteaubriant_-_Rennes"}, 
        {"num":"467000", "g":1435, "len":38.93, "use":"EXP", "lid":"Ligne_de_Martigné-Ferchaud_à_Vitré", "sa":"Ligne_Martigné-Ferchaud_-_Vitré", "af":[51]}, 
        {"num":"468000", "g":1435, "pk0":373.25, "pkf":443, "len":69.75, "use":"EXP", "lid":"Ligne_de_Rennes_à_Redon", "sa":"Ligne_Rennes_-_Redon"}, 
        {"num":"468306", "g":1435, "pk0":442.77, "pkf":443.29, "len":0.52, "use":"FD", "end":"??", "lid":"Raccordement_de_Redon", "sa":"Raccordement_de_Redon"}, 
        {"num":"470000", "g":1435, "pk0":469.48, "pkf":768.33, "len":298.85, "use":"EXP", "lid":"Ligne_de_Savenay_à_Landerneau", "sa":"Ligne_Savenay_-_Landerneau"}, 
        {"num":"470506", "g":1435, "len":0.4, "use":"FD", "end":"1994", "lid":"Ligne_de_Savenay_à_Landerneau#VP_Redon", "sa":"Ligne_Savenay_-_Landerneau#Voie_du_port_de_Redon"}, 
        {"num":"470606", "g":1435, "len":1.85, "use":"EXP", "lid":"Ligne_de_Savenay_à_Landerneau#VM_Kerpont_de_Lorient", "sa":"Ligne_Savenay_-_Landerneau#Voie-mère_de_Kerpont_de_Lorient"}, 
        {"num":"471000", "g":1435, "pk0":540.33, "pkf":573.5, "len":33.17, "use":"FD", "end":"1994", "lid":"Ligne_de_Questembert_à_Ploërmel", "sa":"Ligne_Questembert_-_Ploërmel", "lo":"ploermel2", "af":[28]}, 
        {"num":"472000", "g":1435, "pk0":33.17, "pkf":74.81, "len":41.64, "use":"FD", "end":"1998", "lid":"Ligne_de_Ploërmel_à_La_Brohinière", "sa":"Ligne_Ploërmel_-_La_Brohinière", "lo":"brohiniere", "af":[28]}, 
        {"num":"473000", "g":1435, "pk0":584.95, "pkf":612.14, "len":27.19, "use":"EXP", "lid":"Ligne_d'Auray_à_Quiberon", "sa":"Ligne_Auray_-_Quiberon", "lo":"quiberon"}, 
        {"num":"474000", "g":1435, "pk0":589, "pkf":639.91, "len":50.91, "use":"EXP", "lid":"Ligne_d'Auray_à_Pontivy", "sa":"Ligne_Auray_-_Pontivy", "lo":"pontivy1", "af":[1445]}, 
        {"num":"475000", "g":1435, "pk0":475.14, "pkf":546.98, "len":71.84, "use":"FD", "end":"2017", "lid":"Ligne_de_Saint-Brieuc_à_Pontivy", "sa":"Ligne_Saint-Brieuc_-_Pontivy", "lo":"pontivy2", "af":[1445]}, 
        {"num":"475606", "g":1435, "pk0":480.43, "pkf":481.9, "len":1.47, "use":"FD", "end":"??", "lid":"#VM_Châtelets_de_St-Brieuc", "sa":"Ligne_Saint-Brieuc_-_Pontivy#Voie-mère_des_Châtelets_de_Saint-Brieuc"}, 
        {"num":"476000", "g":1435, "pk0":664.6, "pkf":679.72, "len":15.12, "use":"FD", "end":"2011", "lid":"Ligne_de_Rosporden_à_Concarneau", "sa":"Ligne_Rosporden_-_Concarneau", "lo":"concarneau", "af":[26]}, 
        {"num":"477000", "g":1435, "pk0":685.92, "pkf":724, "len":38.08, "use":"FD", "end":"2018", "lid":"Ligne_de_Quimper_à_Pont-l'Abbé", "sa":"Ligne_Quimper_-_Saint-Guénolé", "lo":"pontabbe", "af":[15, 72]}, 
        {"num":"478000", "g":1435, "pk0":690, "pkf":708.2, "len":18.2, "use":"FD", "end":"1991", "lid":"Ligne_de_Quimper_à_Douarnenez_-_Tréboul", "sa":"Ligne_Quimper_-_Douarnenez-Tréboul", "lo":"douarnenez", "af":[25]}, 
        {"num":"480000", "g":1000, "len":105.12, "use":"FD", "end":"1969", "lid":"Ligne_de_Carhaix_à_Camaret-sur-Mer", "sa":"Ligne_Carhaix_-_Camaret-sur-Mer", "af":[20, 38]}, 
        {"num":"481000", "g":1000, "pk0":99.6, "pkf":103.4, "len":3.8, "use":"FD", "end":"1969", "lid":"Ligne_de_Perros-Saint-Fiacre_au_Fret", "sa":"Ligne_Perros-Saint-Fiacre_-_Le_Fret", "af":[38]}, 
        {"num":"482000", "g":1000, "len":58.07, "use":"FD", "end":"1969", "lid":"Ligne_de_Saint-Méen_à_Loudéac", "sa":"Ligne_La_Brohinière_-_Loudéac", "af":[53]}, 
        {"num":"483000", "g":1000, "len":48.95, "use":"FD", "end":"1969", "lid":"Ligne_de_Morlaix_à_Carhaix", "sa":"Ligne_Morlaix_-_Carhaix", "af":[19]}, 
        {"num":"484000", "g":1435, "pk0":0.22, "pkf":48.75, "len":48.53, "use":"FD", "end":"1969", "lid":"Ligne_de_Carhaix_à_Rosporden", "sa":"Ligne_Carhaix_-_Rosporden", "af":[18]}, 
        {"num":"485000", "g":1435, "pk0":505.4, "pkf":557.99, "len":52.59, "use":"FD", "end":"1967", "lid":"Ligne_de_Guingamp_à_Carhaix", "sa":"Ligne_Guingamp_-_Carhaix"}, 
        {"num":"486000", "g":1435, "pk0":506, "pkf":541.55, "len":35.55, "use":"EXP", "lid":"Ligne_de_Guingamp_à_Paimpol", "sa":"Ligne_Guingamp_-_Paimpol"}, 
        {"num":"487000", "g":1000, "len":71.71, "use":"FD", "end":"1967", "lid":"Ligne_de_Carhaix_à_Loudéac", "sa":"Ligne_Carhaix_-_Loudéac", "af":[22]}, 
        {"num":"499500", "g":1435, "len":3.5, "use":"FD", "end":"??", "lid":"#VP_Lorient", "sa":"Ligne_Savenay_-_Landerneau#Voies_du_port_de_Lorient"}, 
        {"num":"499501", "g":1435, "pk0":3.5, "pkf":4.84, "len":1.34, "use":"VS", "lid":"#VM_ZI-Lorient", "sa":"Ligne_Savenay_-_Landerneau#Voies_du_port_de_Lorient"}, 
        {"num":"499503", "g":1435, "pk0":2.88, "pkf":4.06, "len":1.18, "use":"FD", "end":"??", "lid":"#VP_port-de-pêche-de-Lorient", "sa":"Ligne_Savenay_-_Landerneau#Voies_du_port_de_Lorient"}, 
        {"num":"500000", "g":1435, "pk0":88.54, "pkf":612.5, "len":523.96, "use":"FD", "end":"??", "lid":"Ligne_de_Chartres_à_Bordeaux-Saint-Jean", "sa":"Ligne_Chartres_-_Bordeaux-Saint-Jean", "af":[106, 130]}, 
        {"num":"500650", "g":1435, "len":4, "use":"VS", "lid":"#VM_ZI-Méron", "sa":"Ligne_Chartres_-_Bordeaux-Saint-Jean#Voie-mère_de_la_ZI_de_Meron"}, 
        {"num":"503300", "g":1435, "pk0":1.87, "pkf":3.24, "len":1.37, "use":"NEUT", "lid":"#Shunt_Bordeaux-Bastide_à_Bordeaux-Benauge", "sa":"Raccordements_de_la_ligne_Paris-Austerlitz_-_Bordeaux-Saint-Jean#Raccordement_de_Bordeaux-Benauge_à_Bordeaux-Bastide"}, 
        {"num":"504000", "g":1435, "len":43.2, "use":"FD", "end":"1973", "lid":"Ligne_de_Brou_à_La_Loupe", "sa":"Ligne_Brou_-_La_Loupe", "lo":"laloupe", "af":[553]}, 
        {"num":"505000", "g":1435, "pk0":0.31, "pkf":41.2, "len":40.89, "use":"FD", "end":"1995", "lid":"Ligne_d'Arrou_à_Nogent-le-Rotrou", "sa":"Ligne_Arrou_-_Nogent-le-Rotrou", "lo":"nogent", "af":[544]}, 
        {"num":"506000", "g":1435, "pk0":0.25, "pkf":49.7, "len":49.45, "use":"FD", "end":"1980", "lid":"Ligne_de_Thorigné_à_Courtalain_-_Saint-Pellerin", "sa":"Ligne_Thorigné_-_Courtalain-Saint-Pellerin", "af":[102]}, 
        {"num":"507000", "g":1435, "len":11.7, "use":"FD", "end":"1954", "lid":"Ligne_de_Bessé-sur-Braye_à_Saint-Calais", "sa":"Ligne_Bessé-sur-Braye_-_Saint-Calais", "lo":"stcalais", "af":[105]}, 
        {"num":"508000", "g":1435, "pk0":297.03, "pkf":359.27, "len":62.24, "use":"FD", "end":"2003", "lid":"Ligne_d'Aubigné-Racan_à_Sablé", "sa":"Ligne_Aubigné-Racan_-_Sablé", "af":[108, 207]}, 
        {"num":"509000", "g":1435, "pk0":336.47, "pkf":358.4, "len":21.93, "use":"FD", "end":"2020", "lid":"Ligne_de_L'Aubinière_à_La_Suze", "sa":"Ligne_L'Aubinière_-_La_Suze", "af":[208]}, 
        {"num":"510000", "g":1435, "pk0":0.58, "pkf":44.64, "len":44.06, "use":"FD", "end":"1992", "lid":"Ligne_de_La_Flèche_à_Vivy", "sa":"Ligne_La_Flèche_-_Vivy", "af":[208]}, 
        {"num":"511000", "g":1435, "pk0":2.81, "pkf":46.6, "len":43.79, "use":"FD", "end":"2001", "lid":"Ligne_d'Angers-Saint-Laud_à_La_Flèche", "sa":"Ligne_Angers-Saint-Laud_-_La_Flèche", "af":[207]}, 
        {"num":"514300", "g":1435, "pk0":1.06, "pkf":5.23, "len":4.17, "use":"FD", "end":"??", "lid":"#Shunt_des_deux_gares", "sa":"Ligne_Tours_-_Saint-Nazaire#Raccordement_des_deux_gares_(Nantes)"}, 
        {"num":"515000", "g":1435, "pk0":235.72, "pkf":494.01, "len":258.29, "use":"EXP", "lid":"Ligne_de_Tours_à_Saint-Nazaire", "sa":"Ligne_Tours_-_Saint-Nazaire"}, 
        {"num":"515199", "g":1435, "len":2, "use":"FD", "end":"1955", "lid":"#Branch_Ancienne_gare_de_St-Nazaire", "sa":"Ligne_Tours_-_Saint-Nazaire#Ancien_tracé_à_Saint-Nazaire"}, 
        {"num":"516000", "g":1435, "pk0":494.01, "pkf":519.78, "len":25.77, "use":"EXP", "lid":"Ligne_de_Saint-Nazaire_au_Croisic", "sa":"Ligne_Saint-Nazaire_-_Le_Croisic"}, 
        {"num":"517000", "g":1435, "pk0":510.5, "pkf":515.17, "len":4.67, "use":"FD", "end":"1991", "lid":"Ligne_de_La_Baule-Escoublac_à_Guérande", "sa":"Ligne_La_Baule-Escoublac_-_Guérande", "af":[170]}, 
        {"num":"518000", "g":1435, "pk0":314.7, "pkf":351.26, "len":36.56, "use":"FD", "end":"2017", "lid":"Ligne_de_Segré_à_Angers-Saint-Serge", "sa":"Ligne_Segré_-_Angers-Saint-Serge", "af":[131]}, 
        {"num":"519000", "g":1435, "pk0":428.28, "pkf":491.9, "len":63.62, "use":"FD", "end":"??", "lid":"Ligne_de_Nantes-Orléans_à_Châteaubriant", "sa":"Ligne_Nantes_-_Châteaubriant_Tram-Train"}, 
        {"num":"520000", "g":1435, "pk0":399.8, "pkf":429.1, "len":29.3, "use":"FD", "end":"1967", "lid":"Ligne_de_Blain_à_La_Chapelle-sur-Erdre", "sa":"Ligne_Blain_-_La_Chapelle-sur-Erdre", "af":[83]}, 
        {"num":"521000", "g":1435, "pk0":70.47, "pkf":154.79, "len":84.32, "use":"FD", "end":"1954", "lid":"Ligne_de_Loudun_à_Angers-Maître-École", "sa":"Ligne_Loudun_-_Angers-Maître-École", "af":[129]}, 
        {"num":"522000", "g":1435, "len":25.7, "use":"FD", "end":"1954", "lid":"Ligne_de_Perray-Jouannet_aux_Fourneaux", "sa":"Ligne_Perray-Jouannet_-_Les_Fourneaux", "af":[132]}, 
        {"num":"523000", "g":1435, "len":165.03, "use":"FD", "end":"2001", "lid":"Ligne_de_La_Possonnière_à_Niort", "sa":"Ligne_La_Possonnière_-_Niort", "af":[77, 305]}, 
        {"num":"524000", "g":1435, "len":71.5, "use":"FD", "end":"1980", "lid":"Ligne_de_Neuville-de-Poitou_à_Bressuire", "sa":"Ligne_Neuville-de-Poitou_-_Bressuire", "af":[304, 310]}, 
        {"num":"525000", "g":1435, "pk0":0.08, "pkf":245.57, "len":245.49, "use":"FD", "end":"??", "lid":"Ligne_des_Sables-d'Olonne_à_Tours", "sa":"Ligne_Les_Sables-d'Olonne_-_Joué-lès-Tours", "af":[315]}, 
        {"num":"526000", "g":1435, "len":72.17, "use":"FD", "end":"1996", "lid":"Ligne_de_Vouvant_-_Cezais_à_Saint-Christophe-du-Bois", "sa":"Ligne_Vouvant-Cezais_-_Saint-Christophe-du-Bois", "lo":"stchristophe", "af":[79]}, 
        {"num":"527000", "g":1435, "pk0":0.24, "pkf":38.94, "len":38.7, "use":"EXP", "lid":"Ligne_de_Clisson_à_Cholet", "sa":"Ligne_Clisson_-_Cholet"}, 
        {"num":"528000", "g":1435, "len":41.15, "use":"FD", "end":"1973", "lid":"Ligne_de_Breuil-Barret_à_Velluire", "sa":"Ligne_Breuil-Barret_-_Velluire", "af":[76]}, 
        {"num":"529000", "g":1435, "pk0":0.35, "pkf":20.08, "len":19.73, "use":"EXP", "lid":"Ligne_de_Fontenay-le-Comte_à_Benet", "sa":"Ligne_Fontenay-le-Comte_-_Benet"}, 
        {"num":"530000", "g":1435, "len":251.29, "use":"EXP", "lid":"Ligne_de_Nantes-Orléans_à_Saintes", "sa":"Ligne_Nantes_-_Saintes"}, 
        {"num":"531000", "g":1435, "len":1.83, "use":"FD", "end":"1944", "lid":"Ligne_de_Nantilly_à_Saumur-Rive-Gauche", "sa":"Ligne_Nantilly-Saumur_-_Saumur-Rive-Gauche"}, 
        {"num":"534000", "g":1435, "pk0":0.7, "pkf":109, "len":108.3, "use":"EXP", "lid":"Ligne_de_Nantes-État_à_La_Roche-sur-Yon_par_Sainte-Pazanne", "sa":"Ligne_Nantes-État_-_La_Roche-sur-Yon_par_Sainte-Pazanne"}, 
        {"num":"534611", "g":1435, "pk0":6.07, "pkf":9.86, "len":3.79, "use":"FD", "end":"??", "lid":"#VM_Rezé-Pont-Rousseau_D2_à_Nantes-Atlantique", "sa":"Ligne_Nantes-État_-_La_Roche-sur-Yon_par_Sainte-Pazanne#Voie-mère_de_Rezé-Pont-Rousseau_à_Nantes-Atlantique"}, 
        {"num":"535000", "g":1435, "len":12.72, "use":"FD", "end":"??", "lid":"Ligne_de_Commequiers_à_Saint-Gilles-Croix-de-Vie", "sa":"Ligne_Commequiers_-_Saint-Gilles-Croix-de-Vie", "af":[203]}, 
        {"num":"536000", "g":1435, "pk0":0.48, "pkf":29.72, "len":29.24, "use":"EXP", "lid":"Ligne_de_Sainte-Pazanne_à_Pornic", "sa":"Ligne_Sainte-Pazanne_-_Pornic"}, 
        {"num":"537000", "g":1435, "pk0":0.33, "pkf":27.43, "len":27.1, "use":"FD", "end":"1998", "lid":"Ligne_de_Saint-Hilaire-de-Chaléons_à_Paimbœuf", "sa":"Ligne_Saint-Hilaire-de-Chaléons_-_Paimbœuf", "lo":"paimboeuf"}, 
        {"num":"537509", "g":1435, "pk0":26.9, "pkf":28, "len":1.1, "use":"FD", "end":"1998", "lid":"#VP_Port-de-Paimboeuf"}, 
        {"num":"538000", "g":1435, "len":140.73, "use":"EXP", "lid":"Ligne_de_Saint-Benoît_à_La_Rochelle-Ville", "sa":"Ligne_Saint-Benoît_-_La_Rochelle-Ville"}, 
        {"num":"538310", "g":1435, "len":4, "use":"EXP", "lid":"#Shunt_R2FS_de_Fontaine-Le_Comte_Sud", "sa":"Ligne_Saint-Benoît_-_La_Rochelle-Ville#Raccordements_de_Fontaine-le-Comte"}, 
        {"num":"539000", "g":1435, "pk0":0.5, "pkf":8.5, "len":8, "use":"EXP", "lid":"Ligne_de_La_Rochelle-Ville_à_La_Rochelle-Pallice", "sa":"Ligne_La_Rochelle-Ville_-_La_Rochelle-Pallice"}, 
        {"num":"539507", "g":1435, "pk0":8.5, "pkf":9, "len":0.5, "use":"VS", "lid":"#VP_La_Rochelle-Pallice_(quai_nord)", "sa":"Ligne_La_Rochelle-Ville_-_La_Rochelle-Pallice#Voies_du_port_de_La_Rochelle"}, 
        {"num":"539614", "g":1435, "pk0":8.5, "pkf":9, "len":0.5, "use":"VS", "lid":"Ligne_de_La_Rochelle-Ville_à_La_Rochelle-Pallice#VM_usines", "sa":"Ligne_La_Rochelle-Ville_-_La_Rochelle-Pallice#Voies_du_port_de_La_Rochelle"}, 
        {"num":"540000", "g":1435, "len":17, "use":"FD", "end":"1948", "lid":"Ligne_d'Aigrefeuille_-_Le_Thou_à_Rochefort", "sa":"Ligne_Aigrefeuille-Le_Thou_-_Rochefort", "lo":"rochefort", "af":[297]}, 
        {"num":"541000", "g":1435, "pk0":0.6, "pkf":7, "len":6.4, "use":"FD", "end":"1971", "lid":"Ligne_de_Saint-Laurent-de-la-Prée_à_Pointe-de-la_Fumée", "sa":"Ligne_Saint-Laurent-de-la-Prée_-_Pointe-de-la_Fumée", "af":[298]}, 
        {"num":"542000", "g":1435, "pk0":0.31, "pkf":30.48, "len":30.17, "use":"FD", "end":"1991", "lid":"Ligne_de_Cabariot_au_Chapus", "sa":"Ligne_Cabariot_-_Le_Chapus", "af":[299]}, 
        {"num":"543000", "g":1435, "len":18.78, "use":"FD", "end":"1940", "lid":"Ligne_de_Saint-Jean-d'Angély_à_Taillebourg", "sa":"Ligne_Saint-Jean-d'Angély_-_Taillebourg", "lo":"taillebourg", "af":[296]}, 
        {"num":"544000", "g":1435, "pk0":0.36, "pkf":37.18, "len":36.82, "use":"EXP", "lid":"Ligne_de_Saintes_à_Royan", "sa":"Ligne_Saintes_-_Royan"}, 
        {"num":"545000", "g":1435, "len":22.37, "use":"FD", "end":"??", "lid":"Ligne_de_Saujon_à_La_Grève", "sa":"Ligne_Saujon-Mouettes_-_La_Grève", "lo":"lagreve", "af":[300]}, 
        {"num":"546000", "g":1435, "len":36.58, "use":"FD", "end":"2004", "lid":"Ligne_de_Pons_à_Saujon", "sa":"Ligne_Pons_-_Saujon", "lo":"saujon", "af":[301]}, 
        {"num":"547000", "g":1435, "len":24.5, "use":"FD", "end":"1997", "lid":"Ligne_de_Saint-Mariens_-_Saint-Yzan_à_Blaye", "sa":"Ligne_Saint-Mariens-Saint-Yzan_-_Blaye", "lo":"blaye"}, 
        {"num":"547506", "g":1435, "len":1.65, "use":"VS", "lid":"Voie_de_port_de_Blaye", "sa":"Voie_de_port_de_Blaye"}, 
        {"num":"549000", "g":1435, "pk0":56.5, "pkf":88.73, "len":32.23, "use":"FD", "end":"1975", "lid":"Ligne_d'Étampes_à_Auneau-Embranchement", "sa":"Ligne_Étampes_-_Auneau", "lo":"auneau1", "af":[569]}, 
        {"num":"550000", "g":1435, "pk0":31.51, "pkf":234.08, "len":202.57, "use":"EXP", "lid":"Ligne_de_Brétigny_à_La_Membrolle-sur-Choisille", "sa":"Ligne_Brétigny_-_La_Membrolle-sur-Choisille"}, 
        {"num":"552000", "g":1435, "pk0":-1.4, "pkf":37, "len":38.4, "use":"FD", "end":"1939", "lid":"Ligne_de_Paris-Luxembourg_à_Limours", "sa":"Ligne_Paris-Luxembourg_-_Limours-PO", "af":[967]}, 
        {"num":"553000", "g":1435, "pk0":2.05, "pkf":85.46, "len":83.41, "use":"FD", "end":"1953", "lid":"Ligne_d'Ouest-Ceinture_à_Chartres", "sa":"Ligne_Ouest-Ceinture_-_Chartres", "af":[566]}, 
        {"num":"554000", "g":1435, "len":49.21, "use":"FD", "end":"1994", "lid":"Ligne_d'Auneau-Ville_à_Dreux", "sa":"Ligne_Auneau-Ville_-_Dreux", "af":[565]}, 
        {"num":"555000", "g":1435, "pk0":0.04, "pkf":22.34, "len":22.3, "use":"FD", "end":"2018", "lid":"Ligne_de_Beaulieu-le-Coudray_à_Auneau-Embranchement", "sa":"Ligne_Beaulieu-Le_Coudray_-_Auneau", "af":[568]}, 
        {"num":"556000", "g":1435, "pk0":0.8, "pkf":73.53, "len":72.73, "use":"FD", "end":"??", "lid":"Ligne_de_Chartres_à_Orléans", "sa":"Ligne_Chartres_-_Orléans", "af":[1451]}, 
        {"num":"556606", "g":1435, "len":2.15, "use":"EXP", "lid":"Ligne_de_Chartres_à_Orléans#VM_Chartres-Lucé", "sa":"Ligne_Chartres_-_Orléans#Voie-mère_de_Chartres-Lucé"}, 
        {"num":"557000", "g":1435, "pk0":0.49, "pkf":29.8, "len":29.31, "use":"FD", "end":"1994", "lid":"Ligne_de_Voves_à_Toury", "sa":"Ligne_Voves_-_Toury", "af":[574]}, 
        {"num":"558000", "g":1435, "pk0":0.22, "pkf":47.6, "len":47.38, "use":"FD", "end":"??", "lid":"Ligne_de_Courtalain_-_Saint-Pellerin_à_Patay", "sa":"Ligne_Courtalain-Saint-Pellerin_-_Patay", "af":[543]}, 
        {"num":"559000", "g":1435, "len":65.9, "use":"FD", "end":"??", "lid":"Ligne_de_Pont-de-Braye_à_Blois", "sa":"Ligne_Pont-de-Braye_-_Blois", "af":[107]}, 
        {"num":"560000", "g":1435, "len":68.58, "use":"FD", "end":"1994", "lid":"Ligne_de_Sargé-sur-Braye_à_Vouvray", "sa":"Ligne_Sargé-sur-Braye_-_Vouvray", "lo":"vouvray", "af":[538]}, 
        {"num":"561000", "g":1435, "pk0":237.39, "pkf":333.69, "len":96.3, "use":"EXP", "lid":"Ligne_de_Tours_au_Mans", "sa":"Ligne_Tours_-_Le_Mans"}, 
        {"num":"561311", "g":1435, "pk0":0.3, "pkf":1.8, "len":1.5, "use":"EXP", "lid":"Raccordement_des_Fontaines_(Le_Mans)", "sa":"Raccordement_des_Fontaines_(Le_Mans)"}, 
        {"num":"561316", "g":1435, "len":0.8, "use":"EXP", "lid":"Raccordement_de_La_Clarté_(Le_Mans)", "sa":"Raccordement_de_La_Clarté_(Le_Mans)"}, 
        {"num":"562300", "g":1435, "pk0":233.25, "pkf":235.44, "len":2.19, "use":"EXP", "lid":"Raccordement_de_Saint-Pierre-des-Corps_vers_Nantes", "sa":"Raccordement_de_Saint-Pierre-des-Corps_vers_Nantes"}, 
        {"num":"563300", "g":1435, "pk0":233.65, "pkf":235.72, "len":2.07, "use":"EXP", "lid":"Raccordement_de_St-Pierre-des-Corps_à_Tours", "sa":"Raccordement_de_St-Pierre-des-Corps_à_Tours"}, 
        {"num":"564300", "g":1435, "pk0":235.72, "pkf":237.74, "len":2.02, "use":"EXP", "lid":"Raccordement_de_Tours_à_Monts_(bifurcation_de_Bordeaux)", "sa":"Raccordement_de_Tours_à_Monts_(bifurcation_de_Bordeaux)"}, 
        {"num":"566000", "g":1435, "len":301.85, "use":"EXP", "lid":"LGV_Sud_Europe_Atlantique", "sa":"LGV_Sud-Europe-Atlantique"}, 
        {"num":"568000", "g":1435, "pk0":578.44, "pkf":581.7, "len":3.26, "use":"FD", "end":"1990", "lid":"Ligne_de_Lormont_à_Bordeaux-Bastide", "sa":"Ligne_Lormont_-_Bordeaux-Bastide"}, 
        {"num":"569000", "g":1435, "pk0":118.93, "pkf":121.05, "len":2.12, "use":"EXP", "lid":"Ligne_des_Aubrais-Orléans_à_Orléans", "sa":"Ligne_Les_Aubrais-Orléans_-_Orléans"}, 
        {"num":"569300", "g":1435, "pk0":121.6, "pkf":122.35, "len":0.75, "use":"EXP", "lid":"Raccordement_d'Orléans_vers_Tours", "sa":"Raccordement_d'Orléans_vers_Tours"}, 
        {"num":"569301", "g":1435, "pk0":121.56, "pkf":122.08, "len":0.52, "use":"EXP", "lid":"Raccordement_d'Orléans_vers_Vierzon", "sa":"Raccordement_d'Orléans_vers_Vierzon"}, 
        {"num":"570000", "g":1435, "len":583.84, "use":"EXP", "lid":"Ligne_de_Paris-Austerlitz_à_Bordeaux-Saint-Jean", "sa":"Ligne_Paris-Austerlitz_-_Bordeaux-Saint-Jean"}, 
        {"num":"570345", "g":1435, "len":6.07, "use":"EXP", "lid":"#Shunt_Monts-Sud", "sa":"Raccordements_de_la_ligne_Paris-Austerlitz_-_Bordeaux-Saint-Jean#Raccordement_de_Monts-Sud"}, 
        {"num":"570350", "g":1435, "len":4.08, "use":"EXP", "lid":"#Shunt_La_Celle_Saint-Avant", "sa":"Raccordements_de_la_ligne_Paris-Austerlitz_-_Bordeaux-Saint-Jean#Raccordement_de_La_Celle-Saint-Avant"}, 
        {"num":"570360", "g":1435, "len":6.78, "use":"EXP", "lid":"#Shunt_Migné-Auxances", "sa":"Raccordements_de_la_ligne_Paris-Austerlitz_-_Bordeaux-Saint-Jean#Raccordement_de_Migné-Auxances"}, 
        {"num":"570380", "g":1435, "len":2.56, "use":"EXP", "lid":"#Shunt_Juillé", "sa":"Raccordements_de_la_ligne_Paris-Austerlitz_-_Bordeaux-Saint-Jean#Raccordement_de_Juillé"}, 
        {"num":"570385", "g":1435, "len":4.44, "use":"EXP", "lid":"#Shunt_Villognon", "sa":"Raccordements_de_la_ligne_Paris-Austerlitz_-_Bordeaux-Saint-Jean#Raccordement_de_Villognon"}, 
        {"num":"570390", "g":1435, "len":5.89, "use":"EXP", "lid":"#Shunt_La_Couronne", "sa":"Raccordements_de_la_ligne_Paris-Austerlitz_-_Bordeaux-Saint-Jean#Raccordement_de_La_Couronne"}, 
        {"num":"570506", "g":1435, "len":1.55, "use":"VS", "lid":"#Voie_de_port_d'Ivry-sur-Seine", "sa":"Raccordements_de_la_ligne_Paris-Austerlitz_-_Bordeaux-Saint-Jean#Voie_de_port_d'Ivry-sur-Seine"}, 
        {"num":"570511", "g":1435, "len":6.9, "use":"VS", "lid":"#Voies_du_port_de_Bassens", "sa":"Raccordements_de_la_ligne_Paris-Austerlitz_-_Bordeaux-Saint-Jean#Voies_du_port_de_Bassens"}, 
        {"num":"570519", "g":1435, "len":3, "use":"VS", "lid":"#VP_Bassens", "sa":"Raccordements_de_la_ligne_Paris-Austerlitz_-_Bordeaux-Saint-Jean#Voies_du_port_de_Bassens"}, 
        {"num":"571000", "g":1435, "pk0":0.62, "pkf":51.5, "len":50.88, "use":"FD", "end":"2013", "lid":"Ligne_de_Port-Boulet_à_Port-de-Piles", "sa":"Ligne_Port-Boulet_-_Port-de-Piles", "af":[396]}, 
        {"num":"572000", "g":1435, "len":15.9, "use":"FD", "end":"2016", "lid":"Ligne_de_Ligré-Rivière_à_Richelieu", "sa":"Ligne_Ligré-Rivière_-_Richelieu", "af":[652]}, 
        {"num":"573000", "g":1435, "pk0":0.43, "pkf":50, "len":49.57, "use":"FD", "end":"2010", "lid":"Ligne_de_Loudun_à_Châtellerault", "sa":"Ligne_Loudun_-_Châtellerault", "af":[333]}, 
        {"num":"574000", "g":1435, "pk0":5.77, "pkf":62.61, "len":56.84, "use":"FD", "end":"1972", "lid":"Ligne_de_Poitiers_à_Arçay", "sa":"Ligne_Poitiers_-_Arçay", "af":[332]}, 
        {"num":"575000", "g":1435, "pk0":0.68, "pkf":15, "len":14.32, "use":"FD", "end":"1954", "lid":"Ligne_d'Airvault-Gare_à_Moncontour", "sa":"Ligne_Airvault-Gare_-_Moncontour", "af":[314]}, 
        {"num":"578000", "g":1435, "len":74.9, "use":"FD", "end":"1993", "lid":"Ligne_d'Aiffres_à_Ruffec", "sa":"Ligne_Aiffres_-_Ruffec", "lo":"ruffec", "af":[313]}, 
        {"num":"579000", "g":1435, "len":64.67, "use":"EXP", "lid":"Ligne_de_Beillant_à_Angoulême", "sa":"Ligne_Beillant_-_Angoulême"}, 
        {"num":"580000", "g":1435, "len":68.95, "use":"FD", "end":"1994", "lid":"Ligne_de_Châteauneuf-sur-Charente_à_Saint-Mariens_-_Saint-Yzan", "sa":"Ligne_Châteauneuf-sur-Charente_-_Saint-Mariens-Saint-Yzan", "lo":"stmariens", "af":[303]}, 
        {"num":"581000", "g":1435, "len":25.57, "use":"FD", "end":"1976", "lid":"Ligne_de_Cavignac_à_Coutras", "sa":"Ligne_Cavignac_-_Coutras", "lo":"coutras", "af":[457]}, 
        {"num":"582000", "g":1435, "len":19.7, "use":"FD", "end":"1960", "lid":"Ligne_de_Marcenais_à_Libourne", "sa":"Ligne_Marcenais_-_Libourne", "lo":"libourne", "af":[458]}, 
        {"num":"583000", "g":1435, "pk0":574.62, "pkf":592.32, "len":17.7, "use":"EXP", "lid":"Ligne_de_Bassens_au_Bec-d'Ambès", "sa":"Ligne_Bassens_-_Le_Bec-d'Ambès"}, 
        {"num":"584000", "g":1435, "pk0":-1, "pkf":102, "len":103, "use":"EXP", "lid":"Ligne_de_Ravezies_à_Pointe-de-Grave", "sa":"Ligne_Bordeaux-Saint-Louis_-_La_Pointe-de-Grave"}, 
        {"num":"585500", "g":1435, "len":5.75, "use":"VS", "lid":"#VP_rive_gauche_(Bordeaux)", "sa":"Ligne_Ravezies_-_Pointe-de-Grave#Voies_des_quais_rive_gauche_à_Bordeaux"}, 
        {"num":"585506", "g":1435, "pk0":5.75, "pkf":12.5, "len":6.75, "use":"NEUT", "lid":"#VP_bassins_à_flot_de_Bordeaux", "sa":"Ligne_Ravezies_-_Pointe-de-Grave#Voies_des_bassins_à_flots_de_Bordeaux"}, 
        {"num":"585599", "g":1435, "pk0":1.1, "pkf":2.7, "len":1.6, "use":"FD", "end":"2005", "lid":"voie_des_quais_vers_Bordeaux-Docks-rive-gauche", "sa":"voie_des_quais_vers_Bordeaux-Docks-rive-gauche"}, 
        {"num":"586000", "g":1435, "pk0":3.94, "pkf":15, "len":11.06, "use":"EXP", "lid":"Ceinture_de_Bordeaux", "sa":"Ceinture_de_Bordeaux"}, 
        {"num":"587300", "g":1435, "pk0":13.5, "pkf":14.74, "len":1.24, "use":"EXP", "lid":"#Shunt_Bonnaous_à_Beyreman", "sa":"Ceinture_de_Bordeaux#Raccordement_de_Bonnaous_à_Beyreman"}, 
        {"num":"588500", "g":1435, "pk0":7.99, "pkf":10.95, "len":2.96, "use":"FD", "end":"??", "lid":"#Branch_Parempuyre_au_port_de_Grattequina", "sa":"Ligne_Ravezies_-_Pointe-de-Grave#Embranchement_de_Parempuyre_au_port_de_Grattequina"}, 
        {"num":"589500", "g":1435, "len":9.18, "use":"VS", "lid":"#VP_avant-port_du_Verdon", "sa":"Ligne_Ravezies_-_Pointe-de-Grave#Raccordement_de_l'avant-port_du_Verdon"}, 
        {"num":"590000", "g":1435, "pk0":117.74, "pkf":663.44, "len":545.7, "use":"EXP", "lid":"Ligne_des_Aubrais-Orléans_à_Montauban-Ville-Bourbon", "sa":"Ligne_Les_Aubrais-Orléans_-_Montauban-Ville-Bourbon"}, 
        {"num":"590306", "g":1435, "pk0":399.63, "pkf":402.03, "len":2.4, "use":"FD", "end":"??", "lid":"Raccordement_de_Limoges-Puy-Imbert_à_Limoges-Montjovis", "sa":"Raccordement_de_Limoges-Puy-Imbert_à_Limoges-Montjovis"}, 
        {"num":"591000", "g":1435, "pk0":123.85, "pkf":178.4, "len":54.55, "use":"FD", "end":"1954", "lid":"Ligne_de_Villefranche-sur-Cher_à_Blois", "sa":"Ligne_Villefranche-sur-Cher_-_Blois", "af":[533]}, 
        {"num":"592000", "g":1000, "pk0":0.54, "pkf":37, "len":36.46, "use":"FD", "end":"1934", "lid":"Ligne_de_Blois_à_Saint-Aignan-sur-Cher", "elect":1, "sa":"Ligne_Blois_-_Saint-Aignan-Noyers", "af":[548]}, 
        {"num":"593000", "g":1435, "pk0":199.13, "pkf":303.77, "len":104.64, "use":"EXP", "lid":"Ligne_de_Vierzon_à_Saint-Pierre-des-Corps", "sa":"Ligne_Vierzon-Ville_-_La_Ville-aux-Dames"}, 
        {"num":"594000", "g":1435, "pk0":240.63, "pkf":352, "len":111.37, "use":"EXP", "lid":"Ligne_de_Joué-lès-Tours_à_Châteauroux", "sa":"Ligne_Joué-lès-Tours_-_Châteauroux", "af":[1353]}, 
        {"num":"597000", "g":1000, "len":3, "use":"FD", "end":"1949", "lid":"Ligne_de_Sainte-Maure_-_Noyant_à_Sainte-Maure-Ville", "sa":"Ligne_Sainte-Maure-Noyant_-_Sainte-Maure-Ville", "af":[413]}, 
        {"num":"598000", "g":1435, "pk0":281.63, "pkf":386.36, "len":104.73, "use":"FD", "end":"2001", "lid":"Ligne_de_Port-de-Piles_à_Argenton-sur-Creuse", "sa":"Ligne_Port-de-Piles_-_Argenton-sur-Creuse", "af":[402, 525]}, 
        {"num":"599000", "g":1435, "pk0":304.85, "pkf":346.2, "len":41.35, "use":"FD", "end":"1973", "lid":"Ligne_de_Châtellerault_à_Launay", "sa":"Ligne_Châtellerault_-_Launay", "af":[335]}, 
        {"num":"600000", "g":1000, "pk0":178.67, "pkf":327.14, "len":148.47, "use":"FD", "end":"1989", "lid":"Ligne_de_Salbris_au_Blanc", "sa":"Ligne_Salbris_-_Le_Blanc", "af":[531, 1352]}, 
        {"num":"601000", "g":1435, "pk0":340.9, "pkf":407.6, "len":66.7, "use":"FD", "end":"2001", "lid":"Ligne_de_Saint-Benoît_au_Blanc", "sa":"Ligne_Saint-Benoît_-_Le_Blanc", "lo":"leblanc", "af":[336]}, 
        {"num":"603000", "g":1435, "len":35.3, "use":"FD", "end":"2001", "lid":"Ligne_de_Montmorillon_à_Saint-Aigny_-_Le_Blanc", "sa":"Ligne_Montmorillon_-_Saint-Aigny-Le_Blanc", "af":[372]}, 
        {"num":"604000", "g":1435, "pk0":347.86, "pkf":456, "len":108.14, "use":"FD", "end":"??", "lid":"Ligne_de_Mignaloux_-_Nouaillé_à_Bersac", "sa":"Ligne_Mignaloux-Nouaillé_-_Bersac", "af":[97]}, 
        {"num":"605000", "g":1435, "pk0":419.23, "pkf":426.43, "len":7.2, "use":"FD", "end":"1994", "lid":"Ligne_du_Dorat_à_Magnac-Laval", "sa":"Ligne_Le_Dorat_-_Magnac-Laval", "lo":"magnac", "af":[98]}, 
        {"num":"606000", "g":1435, "pk0":419.23, "pkf":474, "len":54.77, "use":"EXP", "lid":"Ligne_du_Dorat_à_Limoges-Bénédictins", "sa":"Ligne_Le_Dorat_-_Limoges-Bénédictins"}, 
        {"num":"606606", "g":1435, "pk0":470.24, "pkf":472.67, "len":2.43, "use":"FD", "end":"2010", "lid":"Voie-mère_de_la_ZI_de_Limoges", "sa":"Voie-mère_de_la_ZI_de_Limoges"}, 
        {"num":"607000", "g":1435, "pk0":377.1, "pkf":440.41, "len":63.31, "use":"FD", "end":"2015", "lid":"Ligne_de_Lussac-les-Châteaux_à_Saint-Saviol", "sa":"Ligne_Lussac-les-Châteaux_-_Saint-Saviol", "lo":"stsaviol", "af":[373]}, 
        {"num":"608000", "g":1435, "len":42, "use":"FD", "end":"2006", "lid":"Ligne_de_Roumazières-Loubert_au_Vigeant", "sa":"Ligne_Roumazières-Loubert_-_Le_Vigeant", "lo":"levigeant", "af":[377]}, 
        {"num":"609000", "g":1435, "pk0":402.9, "pkf":467.34, "len":64.44, "use":"FD", "end":"1954", "lid":"Ligne_de_Ruffec_à_Roumazières-Loubert", "sa":"Ligne_Ruffec_-_Roumazières-Loubert", "lo":"roumazieres", "af":[376]}, 
        {"num":"610000", "g":1435, "pk0":400.65, "pkf":519.91, "len":119.26, "use":"EXP", "lid":"Ligne_de_Limoges-Bénédictins_à_Angoulême", "sa":"Ligne_Limoges-Bénédictins_-_Angoulême"}, 
        {"num":"611000", "g":1435, "pk0":402.75, "pkf":499, "len":96.25, "use":"EXP", "lid":"Ligne_de_Limoges-Bénédictins_à_Périgueux", "sa":"Ligne_Limoges-Bénédictins_-_Périgueux"}, 
        {"num":"613000", "g":1435, "pk0":421.19, "pkf":498.57, "len":77.38, "use":"EXP", "lid":"Ligne_de_Nexon_à_Brive-la-Gaillarde", "sa":"Ligne_Nexon_-_Brive-la-Gaillarde"}, 
        {"num":"614000", "g":1435, "pk0":439.1, "pkf":457.35, "len":18.25, "use":"FD", "end":"1954", "lid":"Ligne_de_Bussière-Galant_à_Saint-Yrieix", "sa":"Ligne_Bussière-Galant_-_Saint-Yrieix", "lo":"styrieix", "af":[44]}, 
        {"num":"615000", "g":1435, "pk0":446.81, "pkf":491.5, "len":44.69, "use":"FD", "end":"1996", "lid":"Ligne_de_Saillat-sur-Vienne_à_Bussière-Galant", "sa":"Ligne_Saillat-Chassenon_-_Bussière-Galant", "lo":"bussiere", "af":[43]}, 
        {"num":"616000", "g":1435, "pk0":463.44, "pkf":518.5, "len":55.06, "use":"FD", "end":"1986", "lid":"Ligne_de_Thiviers_à_Saint-Aulaire", "sa":"Ligne_Thiviers_-_Saint-Aulaire", "lo":"staulaire", "af":[48]}, 
        {"num":"617000", "g":1435, "pk0":504.52, "pkf":567.25, "len":62.73, "use":"FD", "end":"1992", "lid":"Ligne_du_Quéroy-Pranzac_à_Thiviers", "sa":"Ligne_Le_Quéroy-Pranzac_-_Thiviers", "af":[50]}, 
        {"num":"618000", "g":1435, "pk0":456.32, "pkf":650.4, "len":194.08, "use":"FD", "end":"1954", "lid":"Ligne_de_Magnac_-_Touvre_à_Marmande", "sa":"Ligne_Magnac-Touvre_-_Marmande", "af":[93, 465, 462]}, 
        {"num":"619000", "g":1435, "pk0":514.8, "pkf":544.8, "len":30, "use":"FD", "end":"1954", "lid":"Ligne_de_Ribérac_à_Parcoul-Médillac", "sa":"Ligne_Ribérac_-_Parcoul-Médillac", "af":[94]}, 
        {"num":"620000", "g":1435, "pk0":507.4, "pkf":532.64, "len":25.24, "use":"FD", "end":"1954", "lid":"Ligne_de_La_Cave_à_Ribérac", "sa":"Ligne_La_Cave_-_Ribérac", "af":[94]}, 
        {"num":"621000", "g":1435, "len":172.86, "use":"EXP", "lid":"Ligne_de_Coutras_à_Tulle", "sa":"Ligne_Coutras_-_Tulle"}, 
        {"num":"623000", "g":1435, "len":22, "use":"FD", "end":"1941", "lid":"Ligne_d'Hautefort_à_Terrasson", "sa":"Ligne_Hautefort_-_Terrasson-Lavilledieu", "lo":"terrasson", "af":[49]}, 
        {"num":"627000", "g":1435, "pk0":524.9, "pkf":560, "len":35.1, "use":"FD", "end":"1954", "lid":"Ligne_de_Condat_-_Le_Lardin_à_Sarlat", "sa":"Ligne_Condat-Le_Lardin_-_Sarlat", "af":[474]}, 
        {"num":"628000", "g":1435, "pk0":564.44, "pkf":613.42, "len":48.98, "use":"FD", "end":"1992", "lid":"Ligne_de_Siorac-en-Périgord_à_Cazoulès", "sa":"Ligne_Siorac-en-Périgord_-_Cazoulès", "af":[472]}, 
        {"num":"629000", "g":1435, "pk0":545.99, "pkf":644.2, "len":98.21, "use":"EXP", "lid":"Ligne_de_Libourne_au_Buisson", "sa":"Ligne_Libourne_-_Le_Buisson"}, 
        {"num":"630000", "g":1435, "pk0":568, "pkf":583, "len":15, "use":"FD", "end":"1955", "lid":"Ligne_de_Carsac_à_Gourdon", "sa":"Ligne_Carsac_-_Gourdon", "lo":"gourdon", "af":[473]}, 
        {"num":"631000", "g":1435, "pk0":511, "pkf":651, "len":140, "use":"EXP", "lid":"Ligne_de_Niversac_à_Agen", "sa":"Ligne_Niversac_-_Agen"}, 
        {"num":"632000", "g":1435, "pk0":608.23, "pkf":653.9, "len":45.67, "use":"FD", "end":"1994", "lid":"Ligne_de_Monsempron-Libos_à_Cahors", "sa":"Ligne_Monsempron-Libos_-_Cahors", "lo":"cahors", "af":[468]}, 
        {"num":"634000", "g":1435, "pk0":625.51, "pkf":667.6, "len":42.09, "use":"FD", "end":"1995", "lid":"Ligne_de_Penne-d'Agenais_à_Tonneins", "sa":"Ligne_Penne_-_Tonneins", "af":[467]}, 
        {"num":"635000", "g":1435, "pk0":634.2, "pkf":674.39, "len":40.19, "use":"FD", "end":"1954", "lid":"Ligne_de_Villeneuve-sur-Lot_à_Falgueyrat", "sa":"Ligne_Villeneuve-sur-Lot_-_Falgueyrat", "af":[466]}, 
        {"num":"637000", "g":1435, "pk0":2.76, "pkf":78.82, "len":76.06, "use":"FD", "end":"1994", "lid":"Ligne_de_Bordeaux-Benauge_à_La_Sauvetat-du-Dropt", "sa":"Ligne_Bordeaux-Benauge_-_La_Sauvetat-du-Dropt", "af":[459]}, 
        {"num":"637100", "g":1435, "len":0.88, "use":"FD", "end":"1960", "lid":"#Branch_Bordeaux-Passerelle", "sa":"Ligne_Bordeaux-Benauge_-_La_Sauvetat-du-Dropt#Embranchement_de_Bordeaux-Passerelle"}, 
        {"num":"637506", "g":1435, "len":6.5, "use":"VS", "lid":"Voies_des_quais_rive_droite_-_port_de_Bordeaux", "sa":"Voies_des_quais_rive_droite_-_port_de_Bordeaux"}, 
        {"num":"638100", "g":1435, "pk0":582.19, "pkf":583.13, "len":0.94, "use":"FD", "end":"1950", "lid":"#Branch_Bordeaux-Deschamps", "sa":"Ligne_Chartres_-_Bordeaux-Saint-Jean#Embranchement_de_Bordeaux-Deschamps"}, 
        {"num":"640000", "g":1435, "len":475.89, "use":"EXP", "lid":"Ligne_de_Bordeaux-Saint-Jean_à_Sète-Ville", "sa":"Ligne_Bordeaux-Saint-Jean_-_Sète"}, 
        {"num":"640100", "g":1435, "len":10.26, "use":"EXP", "lid":"Ligne_de_Colombiers_à_Cazouls-lès-Béziers", "sa":"Ligne_Colombiers_-_Cazouls-lès-Béziers", "af":[632]}, 
        {"num":"640306", "g":1435, "len":0.77, "use":"EXP", "lid":"#Shunt_circulaire_de_Bordeaux-St-Jean", "sa":"Ligne_Bordeaux-Saint-Jean_-_Sète-Ville#Raccordement_circulaire_de_Bordeaux-Saint-Jean"}, 
        {"num":"641000", "g":1435, "pk0":41.63, "pkf":120.6, "len":78.97, "use":"FD", "end":"1992", "lid":"Ligne_de_Langon_à_Gabarret", "sa":"Ligne_Langon_-_Gabarret", "lo":"gabarret", "af":[365]}, 
        {"num":"642000", "g":1435, "pk0":79.77, "pkf":176.6, "len":96.83, "use":"FD", "end":"2015", "lid":"Ligne_de_Marmande_à_Mont-de-Marsan", "sa":"Ligne_Marmande_-_Mont-de-Marsan", "af":[366]}, 
        {"num":"643000", "g":1435, "pk0":115.61, "pkf":230.38, "len":114.77, "use":"FD", "end":"??", "lid":"Ligne_de_Port-Sainte-Marie_à_Riscle", "sa":"Ligne_Port-Sainte-Marie_-_Riscle", "af":[358]}, 
        {"num":"644000", "g":1435, "pk0":134.57, "pkf":227, "len":92.43, "use":"FD", "end":"1972", "lid":"Ligne_de_Nérac_à_Mont-de-Marsan", "sa":"Ligne_Nérac_-_Mont-de-Marsan", "lo":"montmarsan2", "af":[85]}, 
        {"num":"645000", "g":1435, "pk0":154.86, "pkf":177.99, "len":23.13, "use":"FD", "end":"1941", "lid":"Ligne_de_Condom_à_Castéra-Verduzan", "sa":"Ligne_Condom_-_Castéra-Verduzan", "lo":"castera", "af":[360]}, 
        {"num":"646000", "g":1435, "len":56.8, "use":"FD", "end":"1954", "lid":"Ligne_d'Eauze_à_Auch", "sa":"Ligne_Eauze_-_Auch", "lo":"auch", "af":[361]}, 
        {"num":"647000", "g":1435, "pk0":140.7, "pkf":270.4, "len":129.7, "use":"FD", "end":"1968", "lid":"Ligne_de_Bon-Encontre_à_Vic-en-Bigorre", "sa":"Ligne_Bon-Encontre_-_Vic-Bigorre", "af":[367]}, 
        {"num":"648000", "g":1435, "pk0":5.93, "pkf":88.43, "len":82.5, "use":"EXP", "lid":"Ligne_de_Saint-Agne_à_Auch", "sa":"Ligne_Toulouse-Saint-Agne_-_Auch"}, 
        {"num":"649000", "g":1435, "pk0":187.2, "pkf":212.41, "len":25.21, "use":"EXP", "lid":"Ligne_de_Castelsarrasin_à_Beaumont-de-Lomagne", "sa":"Ligne_Castelsarrasin_-_Beaumont-de-Lomagne", "lo":"beaumont", "af":[356]}, 
        {"num":"650000", "g":1435, "pk0":0.4, "pkf":319.1, "len":318.7, "use":"EXP", "lid":"Ligne_de_Toulouse_à_Bayonne", "sa":"Ligne_Toulouse-Matabiau_-_Bayonne"}, 
        {"num":"652000", "g":1435, "pk0":108.54, "pkf":267.45, "len":158.91, "use":"FD", "end":"??", "lid":"Ligne_de_Morcenx_à_Bagnères-de-Bigorre", "sa":"Ligne_Morcenx_-_Bagnères-de-Bigorre"}, 
        {"num":"653000", "g":1435, "pk0":195.41, "pkf":210.41, "len":15, "use":"FD", "end":"2018", "lid":"Ligne_de_Saint-Sever_à_Hagetmau", "sa":"Ligne_Saint-Sever_-_Hagetmau", "lo":"hagetmau", "af":[428]}, 
        {"num":"654000", "g":1435, "pk0":147.46, "pkf":211.47, "len":64.01, "use":"FD", "end":"1992", "lid":"Ligne_de_Dax_à_Mont-de-Marsan", "sa":"Ligne_Dax_-_Mont-de-Marsan", "af":[427]}, 
        {"num":"655000", "g":1435, "len":235.06, "use":"EXP", "lid":"Ligne_de_Bordeaux-Saint-Jean_à_Irun", "sa":"Ligne_Bordeaux-Saint-Jean_-_Irun"}, 
        {"num":"656000", "g":1435, "pk0":270.23, "pkf":300.57, "len":30.34, "use":"EXP", "lid":"Ligne_de_Puyoô_à_Dax", "sa":"Ligne_Puyoô_-_Dax"}, 
        {"num":"657000", "g":1435, "pk0":42.31, "pkf":57.97, "len":15.66, "use":"EXP", "lid":"Ligne_de_Lamothe_à_Arcachon", "sa":"Ligne_Lamothe_-_Arcachon"}, 
        {"num":"658000", "g":1435, "pk0":200, "pkf":203.85, "len":3.85, "use":"FD", "end":"??", "lid":"Ligne_de_Bayonne_à_Allées-Marines", "sa":"Ligne_Bayonne_-_Allées-Marines", "af":[438]}, 
        {"num":"659000", "g":1435, "pk0":207.29, "pkf":210.3, "len":3.01, "use":"FD", "end":"1980", "lid":"Ligne_de_Biarritz-la-Négresse_à_Biarritz-Ville", "sa":"Ligne_Biarritz-la-Négresse_-_Biarritz-Ville", "af":[439]}, 
        {"num":"660000", "g":1435, "pk0":199.6, "pkf":249.55, "len":49.95, "use":"FD", "end":"2010", "lid":"Ligne_de_Bayonne_à_Saint-Jean-Pied-de-Port", "sa":"Ligne_Bayonne_-_Saint-Jean-Pied-de-Port"}, 
        {"num":"660306", "g":1435, "pk0":202.05, "pkf":203, "len":0.95, "lid":"Raccordement_d'Aïtachouria", "sa":"Ligne_Bayonne_-_Saint-Jean-Pied-de-Port#Raccordement_d'Aïtachouria"}, 
        {"num":"661000", "g":1435, "pk0":238.43, "pkf":247.06, "len":8.63, "use":"FD", "end":"2014", "lid":"Ligne_d'Ossès-Saint-Martin-d'Arrossa_à_Saint-Étienne-de-Baïgorry", "sa":"Ligne_Ossès-Saint-Martin-d'Arrossa_-_Saint-Étienne-de-Baïgorry", "af":[435]}, 
        {"num":"662000", "g":1435, "pk0":270.23, "pkf":315.87, "len":45.64, "use":"FD", "end":"1991", "lid":"Ligne_de_Puyoô_à_Mauléon", "sa":"Ligne_Puyoô_-_Mauléon", "lo":"mauleon", "af":[436]}, 
        {"num":"663000", "g":1435, "pk0":289.9, "pkf":299.63, "len":9.73, "use":"FD", "end":"1991", "lid":"Ligne_d'Autevielle_à_Saint-Palais", "sa":"Ligne_Autevielle_-_Saint-Palais", "lo":"stpalais", "af":[437]}, 
        {"num":"664000", "g":1435, "pk0":215.74, "pkf":308.5, "len":92.76, "use":"FD", "end":"1985", "lid":"Ligne_de_Pau_à_Canfranc_(frontière)", "sa":"Ligne_Pau_-_Canfranc_(frontière)", "af":[434]}, 
        {"num":"665000", "g":1435, "pk0":235.27, "pkf":254.08, "len":18.81, "use":"FD", "end":"2012", "lid":"Ligne_de_Buzy_à_Laruns-Eaux-Bonnes-Les_Eaux-Chaudes", "sa":"Ligne_Buzy-en-Béarn_-_Laruns", "lo":"laruns", "af":[441]}, 
        {"num":"666000", "g":1435, "pk0":176.86, "pkf":197.17, "len":20.31, "use":"FD", "end":"1997", "lid":"Ligne_de_Lourdes_à_Pierrefitte-Nestalas", "sa":"Ligne_Lourdes_-_Pierrefitte-Nestalas", "af":[449]}, 
        {"num":"667000", "g":1435, "pk0":120.45, "pkf":145.5, "len":25.05, "use":"FD", "end":"1992", "lid":"Ligne_de_Lannemezan_à_Arreau_-_Cadéac", "elect":1, "sa":"Ligne_Lannemezan_-_Arreau", "lo":"arreau", "af":[448]}, 
        {"num":"668000", "g":1435, "pk0":103.94, "pkf":139.31, "len":35.37, "use":"EXP", "lid":"Ligne_de_Montréjeau_-_Gourdan-Polignan_à_Luchon", "sa":"Ligne_Montréjeau-Gourdan-Polignan_-_Luchon"}, 
        {"num":"669000", "g":1000, "len":62.56, "use":"EXP", "lid":"Ligne_de_Cerdagne", "sa":"Ligne_Villefranche-Vernet-les-Bains_-_Latour-de-Carol-Enveitg"}, 
        {"num":"670000", "g":1435, "pk0":67.96, "pkf":115.5, "len":47.54, "use":"FD", "end":"1993", "lid":"Ligne_de_Boussens_à_Saint-Girons", "sa":"Ligne_Boussens_-_Saint-Girons", "af":[388]}, 
        {"num":"671000", "g":1435, "pk0":82.18, "pkf":127.2, "len":45.02, "use":"FD", "end":"1957", "lid":"Ligne_de_Foix_à_Saint-Girons", "sa":"Ligne_Foix_-_Saint-Girons", "lo":"stgirons2", "af":[389, 391]}, 
        {"num":"672000", "g":1435, "pk0":11.71, "pkf":166.87, "len":155.16, "use":"EXP", "lid":"Ligne_de_Portet-Saint-Simon_à_Puigcerda_(frontière)", "sa":"Ligne_Portet-Saint-Simon_-_Puigcerdà"}, 
        {"num":"673000", "g":1435, "pk0":64.22, "pkf":127.5, "len":63.28, "use":"FD", "end":"1975", "lid":"Ligne_de_Pamiers_à_Limoux", "sa":"Ligne_Pamiers_-_Limoux", "af":[398, 399]}, 
        {"num":"674000", "g":1435, "pk0":96.48, "pkf":128.3, "len":31.82, "use":"FD", "end":"1975", "lid":"Ligne_de_Moulin-Neuf_à_Lavelanet", "sa":"Ligne_Moulin-Neuf_-_Lavelanet", "af":[397]}, 
        {"num":"675000", "g":1435, "pk0":327.15, "pkf":342.46, "len":15.31, "use":"FD", "end":"1975", "lid":"Ligne_de_Bram_à_Belvèze", "sa":"Ligne_Bram_-_Belvèze", "af":[397]}, 
        {"num":"676000", "g":1435, "pk0":347.28, "pkf":470.72, "len":123.44, "use":"FD", "end":"1991", "lid":"Ligne_de_Carcassonne_à_Rivesaltes", "sa":"Ligne_Carcassonne_-_Rivesaltes", "af":[606]}, 
        {"num":"677000", "g":1435, "pk0":406.12, "pkf":510.54, "len":104.42, "use":"EXP", "lid":"Ligne_de_Narbonne_à_Port-Bou_(frontière)", "sa":"Ligne_Narbonne_-_Portbou"}, 
    //    {"num":"677306", "lid":"#Shunt_Narbonne-Triangle", "sa":"Ligne_Narbonne_-_Port-Bou_(frontière)#Raccordement_de_Narbonne-Triangle"}, 
        {"num":"677506", "g":1435, "len":1.8, "use":"EXP", "lid":"#VP_Port-la-Nouvelle", "sa":"Ligne_Narbonne_-_Port-Bou_(frontière)#Voies_de_port_de_Port-la-Nouvelle"}, 
        {"num":"678300", "g":1435, "pk0":497.8, "pkf":498.4, "len":0.6, "use":"EXP", "lid":"#Shunt_Port-Vendres_Port-Vendres-Quais", "sa":"Ligne_Narbonne_-_Port-Bou_(frontière)#Raccordement_de_Port-Vendres-Ville_à_Port-Vendres-Quais"}, 
        {"num":"678500", "g":1435, "pk0":498.4, "pkf":499.16, "len":0.76, "use":"EXP", "lid":"#VP_Port-Vendres-Quais", "sa":"Ligne_Narbonne_-_Port-Bou_(frontière)#Voies_de_port_de_Port-Vendres-Quais"}, 
        {"num":"679000", "g":1435, "pk0":467.83, "pkf":513.13, "len":45.3, "use":"EXP", "lid":"Ligne_de_Perpignan_à_Villefranche_-_Vernet-les-Bains", "sa":"Ligne_Perpignan_-_Villefranche-Vernet-les-Bains"}, 
        {"num":"679305", "g":1435, "len":4.59, "use":"EXP", "lid":"#Shunt_TGV_du_SOLER", "sa":"Ligne_Perpignan_-_Villefranche-Vernet-les-Bains#Raccordement_TGV_du_Soler"}, 
        {"num":"679606", "g":1435, "len":1.22, "use":"FD", "end":"??", "lid":"#VM_du_Grand-St-Charles-en-Roussillon", "sa":"Ligne_Perpignan_-_Villefranche-Vernet-les-Bains#Voie-mère_du_Grand-Saint-Charles-en-Roussillon"}, 
        {"num":"680000", "g":1435, "pk0":481.2, "pkf":515.02, "len":33.82, "use":"FD", "end":"1973", "lid":"Ligne_d'Elne_à_Arles-sur-Tech", "sa":"Ligne_Elne_-_Arles-sur-Tech", "af":[607]}, 
        {"num":"681000", "g":1435, "len":18, "use":"FD", "end":"??", "lid":"Ligne_de_La_Guerche-sur-l'Aubois_à_Marseille-lès-Aubigny", "sa":"Ligne_La_Guerche-sur-l'Aubois_-_Marseilles-lès-Aubigny", "af":[575]}, 
        {"num":"682000", "g":1435, "len":135.2, "use":"FD", "end":"2017", "lid":"Ligne_d'Auxy-Juranville_à_Bourges", "sa":"Ligne_Auxy-Juranville_-_Bourges", "af":[593, 582, 586]}, 
        {"num":"683000", "g":1435, "pk0":117.3, "pkf":175.3, "len":58, "use":"FD", "end":"??", "lid":"Ligne_des_Aubrais-Orléans_à_Malesherbes", "sa":"Ligne_Les_Aubrais-Orléans_-_Malesherbes", "lo":"malesherbes1", "af":[587]}, 
        {"num":"684000", "g":1435, "pk0":55.86, "pkf":115.4, "len":59.54, "use":"FD", "end":"??", "lid":"Ligne_d'Étampes_à_Beaune-la-Rolande", "sa":"Ligne_Étampes_-_Beaune-la-Rolande", "af":[586]}, 
        {"num":"685000", "g":1435, "len":22.98, "use":"FD", "end":"??", "lid":"Ligne_de_Gien_à_Argent", "sa":"Ligne_Gien_-_Argent", "af":[583]}, 
        {"num":"686000", "g":1435, "pk0":117.84, "pkf":188.9, "len":71.06, "use":"FD", "end":"??", "lid":"Ligne_des_Aubrais-Orléans_à_Montargis", "sa":"Ligne_Les_Aubrais-Orléans_-_Montargis", "af":[588]}, 
        {"num":"687000", "g":1435, "pk0":122.64, "pkf":183, "len":60.36, "use":"FD", "end":"2011", "lid":"Ligne_d'Orléans_à_Gien", "sa":"Ligne_Orléans_-_Gien", "af":[591]}, 
        {"num":"688100", "g":1435, "len":2.07, "use":"EXP", "lid":"Embranchement_de_la_gare_d'eau_de_Montargis", "sa":"Embranchement_de_la_gare_d'eau_de_Montargis"}, 
        {"num":"689000", "g":1435, "pk0":239.7, "pkf":300, "len":60.3, "use":"FD", "end":"??", "lid":"Ligne_de_Saint-Germain-du-Puy_à_Cosne-Cours-sur-Loire", "sa":"Ligne_Saint-Germain-du-Puy_-_Cosne", "af":[580]}, 
        {"num":"690000", "g":1435, "pk0":204.9, "pkf":291.75, "len":86.85, "use":"EXP", "lid":"Ligne_de_Vierzon_à_Saincaize", "sa":"Ligne_Vierzon-Forges_-_Saincaize"}, 
        {"num":"690306", "g":1435, "pk0":225.92, "pkf":231.89, "len":5.97, "use":"EXP", "lid":"Raccordement_de_Bourges_au_poste_C_de_Pont-Vert", "sa":"Raccordement_de_Bourges_au_poste_C_de_Pont-Vert"}, 
        {"num":"691000", "g":1435, "len":22.01, "use":"FD", "end":"1990", "lid":"Ligne_de_Saint-Florent-sur-Cher_à_Issoudun", "sa":"Ligne_Saint-Florent-sur-Cher_-_Issoudun", "lo":"issoudun", "af":[539]}, 
        {"num":"692100", "g":1435, "len":1.34, "use":"FD", "end":"1999", "lid":"Ligne_de_Saint-Satur_à_Saint-Satur-Gare-d'Eau", "sa":"Ligne_Saint-Satur_-_Saint-Satur-Gare-d'Eau"}, 
        {"num":"693000", "g":1000, "pk0":178.67, "pkf":220.34, "len":41.67, "use":"FD", "end":"1977", "lid":"Ligne_de_Salbris_à_Argent", "sa":"Ligne_Salbris_-_Argent", "af":[532]}, 
        {"num":"694000", "g":1435, "pk0":477.76, "pkf":517, "len":39.24, "use":"FD", "end":"1998", "lid":"Ligne_de_Paulhan_à_Montpellier", "sa":"Ligne_Paulhan_-_Montpellier-Saint-Roch"}, 
        {"num":"695000", "g":1435, "pk0":225.64, "pkf":537.47, "len":311.83, "use":"EXP", "lid":"Ligne_de_Bourges_à_Miécaze", "sa":"Ligne_Bourges_-_Miécaze", "af":[59, 344, 509]}, 
        {"num":"695606", "g":1435, "len":1.73, "use":"FD", "end":"??", "lid":"#VM_Montluçon-Eau_n°_2", "sa":"Ligne_Bourges_-_Miécaze#Voies-mères_de_la_gare_de_Montluçon-Eau"}, 
        {"num":"696000", "g":1435, "pk0":263.27, "pkf":364.89, "len":101.62, "use":"FD", "end":"2004", "lid":"Ligne_de_Châteauroux_à_La_Ville-Gozet", "sa":"Ligne_Châteauroux_-_La_Ville-Gozet", "af":[537]}, 
        {"num":"697000", "g":1435, "pk0":295.06, "pkf":336.2, "len":41.14, "use":"FD", "end":"1954", "lid":"Ligne_d'Argenton-sur-Creuse_à_La_Chaussée", "sa":"Ligne_Argenton-sur-Creuse_-_La_Chaussée", "af":[526]}, 
        {"num":"698000", "g":1435, "pk0":299.24, "pkf":372.03, "len":72.79, "use":"FD", "end":"1995", "lid":"Ligne_de_La_Châtre_à_Guéret", "sa":"Ligne_La_Châtre_-_Guéret", "af":[518]}, 
        {"num":"699000", "g":1435, "pk0":311.85, "pkf":348.87, "len":37.02, "use":"FD", "end":"1954", "lid":"Ligne_de_Champillet-Urciers_à_Lavaufranche", "sa":"Ligne_Champillet-Urciers_-_Lavaufranche", "af":[95]}, 
        {"num":"701000", "g":1435, "pk0":243.25, "pkf":309.74, "len":66.49, "use":"EXP", "lid":"Ligne_de_Capdenac_à_Rodez", "sa":"Ligne_Capdenac_-_Rodez"}, 
        {"num":"702000", "g":1435, "pk0":326.15, "pkf":448.95, "len":122.8, "use":"EXP", "lid":"Ligne_de_Montluçon_à_Saint-Sulpice-Laurière", "sa":"Ligne_Montluçon-Ville_-_Saint-Sulpice-Laurière"}, 
        {"num":"703000", "g":1435, "pk0":428.84, "pkf":448.36, "len":19.52, "use":"N", "lid":"Ligne_de_Vieilleville_à_Bourganeuf", "sa":"Ligne_Vieilleville_-_Bourganeuf", "lo":"bourganeuf", "af":[519]}, 
        {"num":"704000", "g":1435, "pk0":322.97, "pkf":368.61, "len":45.64, "use":"FD", "end":"1954", "lid":"Ligne_de_Saint-Sébastien_à_Guéret", "sa":"Ligne_Saint-Sébastien_-_Guéret", "lo":"gueret2", "af":[517]}, 
        {"num":"705000", "g":1435, "pk0":327.62, "pkf":408.45, "len":80.83, "use":"FD", "end":"??", "lid":"Ligne_de_Montluçon_à_Moulins", "sa":"Ligne_Montluçon-Ville_-_Moulins-sur-Allier", "lo":"moulins", "af":[654]}, 
        {"num":"706000", "g":1435, "len":10, "use":"FD", "end":"1964", "lid":"Ligne_de_Doyet-la-Presle_à_Bézenet-Orléans", "sa":"Ligne_Doyet-la-Presle_-_Bézenet", "lo":"bezenet", "af":[655]}, 
        {"num":"707000", "g":1435, "pk0":340.85, "pkf":393.9, "len":53.05, "use":"EXP", "lid":"Ligne_de_Commentry_à_Gannat", "sa":"Ligne_Commentry_-_Gannat"}, 
        {"num":"708000", "g":1435, "pk0":327.62, "pkf":372.2, "len":44.58, "use":"FD", "end":"1972", "lid":"Ligne_de_Montluçon_à_Gouttières", "sa":"Ligne_Montluçon-Ville_-_Gouttières", "lo":"gouttieres", "af":[74]}, 
        {"num":"709000", "g":1435, "pk0":359.17, "pkf":415.41, "len":56.24, "use":"EXP", "lid":"Ligne_de_Lapeyrouse_à_Volvic", "sa":"Ligne_Lapeyrouse_-_Volvic", "lo":"volvic", "af":[651]}, 
        {"num":"710000", "g":1435, "pk0":443.16, "pkf":456.62, "len":13.46, "use":"EXP", "lid":"Ligne_de_Laqueuille_au_Mont-Dore", "sa":"Ligne_Laqueuille_-_Mont-Dore", "lo":"montdore"}, 
        {"num":"711000", "g":1435, "pk0":420.66, "pkf":506.82, "len":86.16, "use":"EXP", "lid":"Ligne_d'Eygurande-Merlines_à_Clermont-Ferrand", "sa":"Ligne_Eygurande-Merlines_-_Clermont-Ferrand", "lo":"clermontfd"}, 
        {"num":"712000", "g":1435, "pk0":389.14, "pkf":467.79, "len":78.65, "use":"FD", "end":"??", "lid":"Ligne_de_Busseau-sur-Creuse_à_Ussel", "sa":"Ligne_Busseau_-_Ussel", "lo":"ussel", "af":[503]}, 
        {"num":"713000", "g":1435, "pk0":393.03, "pkf":514.63, "len":121.6, "use":"EXP", "lid":"Ligne_du_Palais_à_Eygurande-Merlines", "sa":"Ligne_Le_Palais_-_Eygurande-Merlines"}, 
        {"num":"714000", "g":1000, "len":31.93, "use":"FD", "end":"1972", "lid":"Ligne_de_Tulle_à_Argentat#Tulle_Uzerche", "sa":"Ligne_Uzerche_-_Tulle", "af":[498]}, 
        {"num":"715000", "g":1000, "len":29.07, "use":"FD", "end":"1972", "lid":"Ligne_de_chemin_de_fer_Seilhac_-_Treignac", "sa":"Ligne_Seilhac_-_Treignac", "af":[500]}, 
        {"num":"716000", "g":1435, "pk0":597.05, "pkf":651.35, "len":54.3, "use":"EXP", "lid":"Ligne_de_Tulle_à_Meymac", "sa":"Ligne_Tulle_-_Meymac"}, 
        {"num":"717000", "g":1000, "len":33.6, "use":"FD", "end":"1972", "lid":"Ligne_de_Tulle_à_Argentat", "sa":"Ligne_Tulle_-_Argentat", "af":[498]}, 
        {"num":"718000", "g":1435, "pk0":148.01, "pkf":396, "len":247.99, "use":"EXP", "lid":"Ligne_de_Brive-la-Gaillarde_à_Toulouse-Matabiau_via_Capdenac", "sa":"Ligne_Brive-la-Gaillarde_-_Toulouse-Matabiau"}, 
        {"num":"719000", "g":1435, "pk0":619.09, "pkf":698.66, "len":79.57, "use":"FD", "end":"??", "lid":"Ligne_de_Souillac_à_Viescamp-sous-Jallès", "sa":"Ligne_Souillac_-_Viescamp-sous-Jallès", "af":[493]}, 
        {"num":"720000", "g":1435, "pk0":237.87, "pkf":408.34, "len":170.47, "use":"EXP", "lid":"Ligne_de_Figeac_à_Arvant", "sa":"Ligne_Figeac_-_Arvant"}, 
        {"num":"721000", "g":1435, "pk0":454.59, "pkf":525.83, "len":71.24, "use":"FD", "end":"1991", "lid":"Ligne_de_Bort-les-Orgues_à_Neussargues", "wf":"Tour_du_Cantal_en_train", "sa":"Ligne_Bort-les-Orgues_-_Neussargues", "lo":"neussargues", "af":[666]}, 
        {"num":"722000", "g":1435, "pk0":433.03, "pkf":708.45, "len":275.42, "use":"EXP", "lid":"Ligne_de_Béziers_à_Neussargues", "sa":"Ligne_Béziers_-_Neussargues"}, 
        {"num":"723000", "g":1435, "pk0":615.16, "pkf":692.5, "len":77.34, "use":"EXP", "lid":"Ligne_du_Monastier_à_La_Bastide-Saint-Laurent-les-Bains", "sa":"Ligne_Le_Monastier_-_La_Bastide-Saint-Laurent-les-Bains"}, 
        {"num":"724000", "g":1435, "pk0":660.27, "pkf":728.85, "len":68.58, "use":"FD", "end":"2011", "lid":"Ligne_de_Cahors_à_Capdenac", "sa":"Ligne_Cahors_-_Capdenac", "af":[492]}, 
        {"num":"725000", "g":1435, "pk0":579.56, "pkf":624.28, "len":44.72, "use":"FD", "end":"2017", "lid":"Ligne_de_Sévérac-le-Château_à_Rodez", "sa":"Ligne_Sévérac-le-Château_-_Rodez"}, 
        {"num":"726000", "g":1435, "pk0":606.36, "pkf":629.06, "len":22.7, "use":"FD", "end":"1992", "lid":"Ligne_de_Bertholène_à_Espalion", "sa":"Ligne_Bertholène_-_Espalion", "lo":"espalion", "af":[370]}, 
        {"num":"727000", "g":1435, "pk0":524.58, "pkf":586.36, "len":61.78, "use":"FD", "end":"1972", "lid":"Ligne_de_Tournemire_-_Roquefort_au_Vigan", "sa":"Ligne_Tournemire-Roquefort_-_Le_Vigan", "lo":"levigan", "af":[54]}, 
        {"num":"728000", "g":1435, "pk0":524.58, "pkf":539.59, "len":15.01, "use":"FD", "end":"1941", "lid":"Ligne_de_Tournemire_-_Roquefort_à_Saint-Affrique", "sa":"Ligne_Tournemire-Roquefort_-_Saint-Affrique", "lo":"staffrique", "af":[346]}, 
        {"num":"729000", "g":1435, "pk0":477.39, "pkf":493, "len":15.61, "use":"FD", "end":"1978", "lid":"Ligne_de_La_Tour-sur-Orb_à_Plaisance-Andabre", "sa":"Ligne_La_Tour-sur-Orb_-_Plaisance-Andabre", "af":[556]}, 
        {"num":"730000", "g":1435, "pk0":467, "pkf":492.51, "len":25.51, "use":"FD", "end":"1972", "lid":"Ligne_de_Faugères_à_Paulhan", "sa":"Ligne_Faugères_-_Paulhan", "lo":"paulhan", "af":[630]}, 
        {"num":"731000", "g":1435, "pk0":475.89, "pkf":488.3, "len":12.41, "use":"FD", "end":"1954", "lid":"Ligne_de_Sète-Ville_à_Montbazin_-_Gigean", "sa":"Ligne_Sète_-_Montbazin-Gigean", "af":[631]}, 
        {"num":"731100", "g":1435, "pk0":4.77, "pkf":6.86, "len":2.09, "use":"FD", "end":"1990", "lid":"Ligne_Balaruc-les-Bains_-_Mèze", "sa":"Ligne_Balaruc-les-Bains_-_Mèze"}, 
        {"num":"732000", "g":1435, "pk0":448.9, "pkf":506.8, "len":57.9, "use":"FD", "end":"2009", "lid":"Ligne_de_Vias_à_Lodève", "sa":"Ligne_Vias_-_Lodève", "lo":"lodeve", "af":[615]}, 
        {"num":"733000", "g":1435, "pk0":424.69, "pkf":444.42, "len":19.73, "use":"FD", "end":"1972", "lid":"Ligne_de_Colombiers_à_Quarante_-_Cruzy", "sa":"Ligne_Colombiers_-_Quarante-Cruzy", "af":[405]}, 
        {"num":"734000", "g":1435, "pk0":407.16, "pkf":426.73, "len":19.57, "use":"FD", "end":"??", "lid":"Ligne_de_Narbonne_à_Bize", "sa":"Ligne_Narbonne_-_Bize", "lo":"bize", "af":[404]}, 
        {"num":"735000", "g":1435, "pk0":372.58, "pkf":399.91, "len":27.33, "use":"FD", "end":"1972", "lid":"Ligne_de_Moux_à_Caunes-Minervois", "sa":"Ligne_Moux_-_Caunes-Minervois", "lo":"caunes", "af":[403]}, 
        {"num":"736000", "g":1435, "pk0":311.2, "pkf":495.5, "len":184.3, "use":"FD", "end":"1995", "lid":"Ligne_de_Castelnaudary_à_Rodez", "sa":"Ligne_Castelnaudary_-_Rodez", "af":[352, 354]}, 
        {"num":"736399", "g":1435, "len":2.5, "use":"FD", "end":"1980", "lid":"embranchement_Puits_La_Grillatié, _Lendrevié, _La_Tronquié", "sa":"embranchement_Puits_La_Grillatié, _Lendrevié, _La_Tronquié"}, 
        {"num":"737000", "g":1435, "pk0":366.15, "pkf":457.8, "len":91.65, "use":"FD", "end":"1995", "lid":"Ligne_de_Castres_à_Bédarieux", "sa":"Ligne_Castres_-_Bédarieux", "af":[350]}, 
        {"num":"738000", "g":1435, "pk0":205.93, "pkf":297.17, "len":91.24, "use":"FD", "end":"1991", "lid":"Ligne_de_Montauban-Ville-Bourbon_à_La_Crémade", "sa":"Ligne_Montauban-Ville-Bourbon_-_La_Crémade", "af":[349]}, 
        {"num":"739000", "g":1435, "pk0":308.4, "pkf":374.61, "len":66.21, "use":"FD", "end":"1987", "lid":"Ligne_de_Lexos_à_Montauban-Ville-Bourbon", "sa":"Ligne_Lexos_-_Montauban-Ville-Bourbon", "af":[340]}, 
        {"num":"741000", "g":1435, "pk0":338.73, "pkf":354.91, "len":16.18, "use":"EXP", "lid":"Ligne_de_Tessonnières_à_Albi", "sa":"Ligne_Tessonnières_-_Albi"}, 
        {"num":"742000", "g":1435, "pk0":413.32, "pkf":422.34, "len":9.02, "use":"EXP", "lid":"Ligne_d'Albi_à_Saint-Juéry", "sa":"Ligne_Albi_-_Saint-Juéry", "af":[346]}, 
        {"num":"743000", "g":1435, "pk0":258.67, "pkf":265, "len":6.33, "use":"FD", "end":"1989", "lid":"Ligne_de_Viviez_à_Decazeville", "sa":"Ligne_Viviez_Decazeville", "af":[495]}, 
        {"num":"744000", "g":1435, "pk0":430, "pkf":454, "len":24, "use":"FD", "end":"1953", "lid":"Ligne_de_Carmaux_à_Vindrac", "sa":"Ligne_Carmaux_-_Cordes-Vindrac", "lo":"vindrac", "af":[348]}, 
        {"num":"745000", "g":1435, "pk0":14.91, "pkf":123.8, "len":108.89, "use":"FD", "end":"??", "lid":"Ligne_de_Villeneuve-Saint-Georges_à_Montargis", "sa":"Ligne_Villeneuve-Saint-Georges_-_Montargis", "af":[592]}, 
        {"num":"746000", "g":1435, "pk0":33.01, "pkf":93.27, "len":60.26, "use":"EXP", "lid":"Ligne_de_Corbeil-Essonnes_à_Montereau", "sa":"Ligne_Corbeil-Essonnes_-_Montereau"}, 
        {"num":"747000", "g":1435, "pk0":0.5, "pkf":25.5, "len":25, "use":"EXP", "lid":"Ligne_de_Bourron-Marlotte-Grez_à_Malesherbes", "sa":"Ligne_Bourron-Marlotte-Grez_-_Malesherbes", "af":[590]}, 
        {"num":"747306", "g":1435, "len":0.73, "use":"FD", "end":"1970", "lid":"#Shunt_Filay", "sa":"Ligne_Bourron-Marlotte-Grez_-_Malesherbes#Raccordement_de_Filay"}, 
        {"num":"748000", "g":1435, "pk0":118.13, "pkf":179.49, "len":61.36, "use":"FD", "end":"??", "lid":"Ligne_de_Montargis_à_Sens", "sa":"Ligne_Montargis_-_Sens", "lo":"sens", "af":[599]}, 
        {"num":"749000", "g":1435, "pk0":140.03, "pkf":216.2, "len":76.17, "use":"FD", "end":"1997", "lid":"Ligne_de_Triguères_à_Surgy", "sa":"Ligne_Triguères_-_Surgy", "lo":"surgy", "af":[1193]}, 
        {"num":"750000", "g":1435, "pk0":66.78, "pkf":559, "len":492.22, "use":"EXP", "lid":"Ligne_de_Moret-Veneux-les-Sablons_à_Lyon-Perrache", "sa":"Ligne_Moret-Veneux-les-Sablons_-_Lyon-Perrache"}, 
        {"num":"750521", "g":1435, "len":0.77, "use":"FD", "end":"??", "lid":"#Embranchement_du_port_de_Roanne", "sa":"Ligne_Moret-Veneux-les-Sablons_-_Lyon-Perrache#Embranchement_du_port_de_Roanne"}, 
        {"num":"750670", "g":1435, "len":2.93, "use":"FD", "end":"??", "lid":"#VM_ZI_de_La_Plaine", "sa":"Ligne_Moret-Veneux-les-Sablons_-_Lyon-Perrache#Voie-mère_ZI_de_La_Plaine"}, 
        {"num":"750672", "g":1435, "len":1.58, "use":"FD", "end":"??", "lid":"#VM_n°_2_d'Andrézieux-Bouthéon", "sa":"Ligne_Moret-Veneux-les-Sablons_-_Lyon-Perrache#Voies-mères_d'Andrézieux-Bouthéon"}, 
        {"num":"751000", "g":1435, "pk0":0.23, "pkf":91.5, "len":91.27, "use":"FD", "end":"1954", "lid":"Ligne_d'Auxerre-Saint-Gervais_à_Gien", "sa":"Ligne_Auxerre-Saint-Gervais_-_Gien", "lo":"gien", "af":[595]}, 
        {"num":"752000", "g":1435, "len":712, "use":"EXP", "lid":"Ligne_de_Combs-la-Ville_à_Saint-Louis_(LGV)", "sa":"LGV_Paris-Sud-Est"}, 
        {"num":"752100", "g":1435, "len":39.41, "use":"EXP", "lid":"Ligne_de_Villeneuve-Saint-Georges_à_la_bifurcation_de_Moisenay_(LGV)", "sa":"LGV_Interconnexion_Est"}, 
        {"num":"752308", "g":1435, "pk0":51.08, "pkf":56.68, "len":5.6, "use":"EXP", "lid":"Raccordement_de_Coubert_(LGV)", "sa":"Raccordement_de_Coubert_(LGV)"}, 
        {"num":"752330", "g":1435, "pk0":380.5, "pkf":394.73, "len":14.23, "use":"EXP", "lid":"Raccordement_de_Lyon-Saint-Clair_(LGV)", "sa":"Raccordement_de_Lyon-Saint-Clair_(LGV)"}, 
        {"num":"752340", "g":1435, "pk0":416.65, "pkf":419.96, "len":3.31, "use":"EXP", "lid":"Raccordement_de_Grenay_(LGV)", "sa":"Raccordement_de_Grenay_(LGV)"}, 
        {"num":"752342", "g":1435, "pk0":493.43, "pkf":496.34, "len":2.91, "use":"EXP", "lid":"Raccordement_de_St-Marcel-lès-Valence", "sa":"Raccordement_de_St-Marcel-lès-Valence"}, 
        {"num":"752350", "g":1435, "pk0":415.86, "pkf":419.08, "len":3.22, "use":"EXP", "lid":"Raccordement_d'Heyrieux_(LGV)", "sa":"Raccordement_d'Heyrieux_(LGV)"}, 
        {"num":"752352", "g":1435, "len":2.11, "use":"EXP", "lid":"Raccordement_de_Crest_(base_d'Eurre)", "sa":"Raccordement_de_Crest_(base_d'Eurre)"}, 
        {"num":"752354", "g":1435, "len":3.1, "use":"EXP", "lid":"Raccordement_nord_de_Bollène-Lamotte-du-Rhône", "sa":"Raccordement_nord_de_Bollène-Lamotte-du-Rhône"}, 
        {"num":"752356", "g":1435, "len":1.61, "use":"EXP", "lid":"Raccordement_sud_de_Bollène-Lamotte-du-Rhône", "sa":"Raccordement_sud_de_Bollène-Lamotte-du-Rhône"}, 
        {"num":"753000", "g":1435, "pk0":154.87, "pkf":289.2, "len":134.33, "use":"FD", "end":"2013", "lid":"Ligne_de_Laroche-Migennes_à_Cosne", "sa":"Ligne_Laroche-Migennes_-_Cosne", "lo":"cosne", "af":[1189]}, 
        {"num":"753306", "g":1435, "len":2.21, "use":"EXP", "lid":"#Shunt_militaire_de_Laroche-Migennes", "sa":"Ligne_Laroche-Migennes_-_Cosne#Raccordement_militaire_de_Laroche-Migennes"}, 
        {"num":"754000", "g":1435, "pk0":229.03, "pkf":301.81, "len":72.78, "use":"EXP", "lid":"Ligne_de_Clamecy_à_Nevers", "sa":"Ligne_Clamecy_-_Nevers", "lo":"nevers", "af":[1190]}, 
        {"num":"755000", "g":1435, "pk0":192.09, "pkf":307.65, "len":115.56, "use":"EXP", "lid":"Ligne_de_Cravant_-_Bazarnes_à_Dracy-Saint-Loup", "sa":"Ligne_Cravant-Bazarnes_-_Dracy-Saint-Loup", "lo":"dracy"}, 
        {"num":"756000", "g":1435, "pk0":230, "pkf":272.2, "len":42.2, "use":"FD", "end":"1954", "lid":"Ligne_d'Avallon_à_Nuits-sous-Ravières", "sa":"Ligne_Avallon_-_Nuits-sous-Ravières", "lo":"nuits", "af":[1195]}, 
        {"num":"757000", "g":1435, "pk0":237.39, "pkf":282.06, "len":44.67, "use":"FD", "end":"1967", "lid":"Ligne_de_Maison-Dieu_aux_Laumes-Alésia", "sa":"Ligne_Maison-Dieu_-_Les_Laumes-Alésia", "lo":"laumes", "af":[1198]}, 
        {"num":"760000", "g":1435, "pk0":1.1, "pkf":162.8, "len":161.7, "use":"EXP", "lid":"Ligne_de_Nevers_à_Chagny", "sa":"Ligne_Nevers_-_Chagny"}, 
        {"num":"760306", "g":1435, "pk0":0.15, "pkf":4.97, "len":4.82, "use":"EXP", "lid":"Raccordement_des_lignes_de_Chagny_à_Dole_et_de_Paris-Lyon_à_Marseille-St-Charles", "sa":"Raccordement_des_lignes_de_Chagny_à_Dole_et_de_Paris-Lyon_à_Marseille-St-Charles"}, 
        {"num":"761000", "g":1435, "pk0":0.38, "pkf":59.54, "len":59.16, "use":"FD", "end":"1989", "lid":"Ligne_d'Étang_à_Santenay_(via_Autun)", "sa":"Ligne_Étang_-_Santenay_(via_Autun)", "lo":"santenay", "af":[1201]}, 
        {"num":"762000", "g":1435, "pk0":226.69, "pkf":353.28, "len":126.59, "use":"FD", "end":"1995", "lid":"Ligne_de_Clamecy_à_Gilly-sur-Loire", "sa":"Ligne_Clamecy_-_Gilly-sur-Loire", "lo":"gilly", "af":[947, 1192]}, 
        {"num":"763000", "g":1435, "pk0":283.55, "pkf":306.69, "len":23.14, "use":"FD", "end":"??", "lid":"Ligne_de_Tamnay-Châtillon_à_Château-Chinon", "sa":"Ligne_Tamnay-Châtillon_-_Château-Chinon", "lo":"chateauchinon", "af":[1191]}, 
        {"num":"764000", "g":1435, "len":25, "use":"FD", "end":"2002", "lid":"Ligne_de_Saint-Florentin_-_Vergigny_à_Monéteau_-_Gurgy", "sa":"Ligne_Saint-Florentin-Vergigny_-_Monéteau-Gurgy", "lo":"moneteau", "af":[1194]}, 
        {"num":"765000", "g":1435, "pk0":1, "pkf":70.3, "len":69.3, "use":"FD", "end":"1992", "lid":"Ligne_d'Épinac_à_Pouillenay", "sa":"Ligne_Épinac_-_Pouillenay", "lo":"pouillenay", "af":[1199]}, 
        {"num":"766000", "g":1435, "pk0":1.08, "pkf":67.93, "len":66.85, "use":"FD", "end":"1989", "lid":"Ligne_de_Dijon-Ville_à_Épinac", "sa":"Ligne_Dijon-Ville_-_Épinac", "lo":"epinac", "af":[1200]}, 
        {"num":"767300", "g":1435, "len":1.6, "use":"EXP", "lid":"Raccordement_de_Montchanin", "sa":"Raccordement_de_Montchanin"}, 
        {"num":"768300", "g":1435, "len":16.45, "use":"EXP", "lid":"Raccordement_de_Pasilly_à_Aisy", "sa":"Raccordement_de_Pasilly_à_Aisy"}, 
        {"num":"769000", "g":1435, "pk0":2.98, "pkf":109.2, "len":106.22, "use":"FD", "end":"1995", "lid":"Ligne_du_Coteau_à_Montchanin", "sa":"Ligne_Le_Coteau_-_Montchanin", "lo":"montchanin1", "af":[825]}, 
        {"num":"770000", "g":1435, "pk0":0.32, "pkf":143.95, "len":143.63, "use":"FD", "end":"1987", "lid":"Ligne_de_Moulins_à_Mâcon", "sa":"Ligne_Moulins-sur-Allier_-_Mâcon-Ville", "lo":"macon", "af":[950, 952]}, 
        {"num":"770606", "g":1435, "pk0":1.39, "pkf":2.58, "len":1.19, "use":"FD", "end":"??", "lid":"Voie-mère_de_la_ZI_de_Moulins_n°_1", "sa":"Voie-mère_de_la_ZI_de_Moulins_n°_1"}, 
        {"num":"771000", "g":1435, "pk0":2.7, "pkf":27.9, "len":25.2, "use":"FD", "end":"1954", "lid":"Ligne_d'Étiveau_à_Montchanin", "sa":"Ligne_Étiveau_-_Montchanin", "lo":"montchanin2", "af":[953]}, 
        {"num":"772000", "g":1435, "pk0":66.04, "pkf":115, "len":48.96, "use":"FD", "end":"2003", "lid":"Ligne_de_Cluny_à_Chalon-sur-Saône", "sa":"Ligne_Cluny_-_Chalon-sur-Saône"}, 
        {"num":"774000", "g":1435, "len":56, "use":"FD", "end":"1954", "lid":"Ligne_de_Pouilly-sous-Charlieu_à_Clermain", "sa":"Ligne_Pouilly-sous-Charlieu_-_Clermain", "lo":"clermain", "af":[955]}, 
        {"num":"775000", "g":1435, "pk0":2, "pkf":134.61, "len":132.61, "use":"EXP", "lid":"Ligne_de_Paray-le-Monial_à_Givors-Canal", "sa":"Ligne_Paray-le-Monial_-_Givors-Canal", "lo":"givors"}, 
        {"num":"775311", "g":1435, "pk0":133.68, "pkf":134.87, "len":1.19, "use":"EXP", "lid":"#Shunt_Badan_(poste_3)_à_(poste_1)", "sa":"Ligne_Paray-le-Monial_-_Givors-Canal#Raccordement_de_Badan_(poste_3)_à_Badan_(poste_1)"}, 
        {"num":"776000", "g":1435, "pk0":0.4, "pkf":12.58, "len":12.18, "use":"FD", "end":"1990", "lid":"Ligne_de_Belleville_à_Beaujeu", "sa":"Ligne_Belleville-sur-Saône_-_Beaujeu", "lo":"beaujeu", "af":[823]}, 
        {"num":"777300", "g":1435, "pk0":0.8, "pkf":6.43, "len":5.63, "use":"EXP", "lid":"Raccordement_de_Pont-de-Veyle", "sa":"Raccordement_de_Pont-de-Veyle"}, 
        {"num":"778300", "g":1435, "len":2.52, "use":"EXP", "lid":"Raccordement_de_Mâcon-Sud", "sa":"Raccordement_de_Mâcon-Sud"}, 
        {"num":"779300", "g":1435, "len":2.22, "use":"EXP", "lid":"Raccordement_de_Mâcon-Nord", "sa":"Raccordement_de_Mâcon-Nord"}, 
        {"num":"780000", "g":1435, "pk0":0.88, "pkf":3.49, "len":2.61, "use":"FD", "end":"2000", "lid":"Ligne_de_Saint-Étienne-La_Terrasse_à_Saint-Étienne-Pont-de-l'Âne", "sa":"Ligne_Saint-La_Terrasse-Stade_-_Saint-Étienne-Pont-de-l'Âne"}, 
        {"num":"780100", "g":1435, "len":3.5, "use":"FD", "end":"2010", "lid":"embranchement_Talaudière-Port-Sec", "sa":"embranchement_Talaudière-Port-Sec"}, 
        {"num":"782000", "g":1435, "len":77.5, "use":"FD", "end":"1973", "lid":"Ligne_de_Lyon-Saint-Paul_à_Montbrison", "sa":"Ligne_Lyon-Saint-Paul_-_Montbrison", "lo":"montbrison", "af":[848]}, 
        {"num":"783000", "g":1435, "pk0":423.12, "pkf":496.34, "len":73.22, "use":"EXP", "lid":"Ligne_du_Coteau_à_Saint-Germain-au-Mont-d'Or", "sa":"Ligne_Le_Coteau_-_Saint-Germain-au-Mont-d'Or"}, 
        {"num":"784000", "g":1435, "pk0":1.52, "pkf":132.04, "len":130.52, "use":"EXP", "lid":"Ligne_de_Clermont-Ferrand_à_Saint-Just-sur-Loire", "sa":"Ligne_Clermont-Ferrand_-_Saint-Just-sur-Loire"}, 
        {"num":"785000", "g":1435, "pk0":356.27, "pkf":514.54, "len":158.27, "use":"FD", "end":"2009", "lid":"Ligne_de_Saint-Germain-des-Fossés_à_Darsac", "sa":"Ligne_Saint-Germain-des-Fossés_-_Darsac", "lo":"darsac", "af":[663]}, 
        {"num":"786000", "g":1435, "pk0":0.41, "pkf":3.49, "len":3.08, "use":"FD", "end":"??", "lid":"Ligne_de_Vichy_à_Cusset", "sa":"Ligne_Vichy_-_Cusset"}, 
        {"num":"787000", "g":1435, "pk0":364.93, "pkf":405.51, "len":40.58, "use":"EXP", "lid":"Ligne_de_Vichy_à_Riom", "sa":"Ligne_Vichy_-_Riom-Châtel-Guyon"}, 
        {"num":"789000", "g":1435, "pk0":332.67, "pkf":367.4, "len":34.73, "use":"FD", "end":"1969", "lid":"Ligne_de_La_Ferté-Hauterive_à_Gannat", "sa":"Ligne_La_Ferté-Hauterive_-_Gannat", "lo":"gannat", "af":[657]}, 
        {"num":"790000", "g":1435, "pk0":354.44, "pkf":723.6, "len":369.16, "use":"EXP", "lid":"Ligne_de_Saint-Germain-des-Fossés_à_Nîmes-CRB1", "sa":"Ligne_Saint-Germain-des-Fossés_-_Nîmes-Courbessac"}, 
        {"num":"790611", "g":1435, "len":2.2, "use":"FD", "end":"??", "lid":"#VM_ZI_de_Ladoux_à_Gerzat", "sa":"Ligne_Saint-Germain-des-Fossés_-_Nîmes-Courbessac#Voie-mère_de_la_ZI_de_Ladoux_à_Gerzat"}, 
        {"num":"791000", "g":1435, "pk0":3.19, "pkf":31.4, "len":28.21, "use":"FD", "end":"1941", "lid":"Ligne_transcévenole", "sa":"Ligne_Brives-Charensac_-_Présailles-Vachères", "lo":"lalevade1", "af":[374], "ct":"Le-Puy_Lalevade"}, 
        {"num":"792000", "g":1435, "pk0":0.69, "pkf":53.37, "len":52.68, "use":"FD", "end":"2008", "lid":"Ligne_du_Puy_à_Langogne", "sa":"Ligne_Le_Puy_-_Langogne", "lo":"langogne", "af":[433]}, 
        {"num":"793000", "g":1435, "pk0":408.1, "pkf":412.41, "len":4.31, "use":"FD", "end":"1973", "lid":"Ligne_de_Riom_à_Châtelguyon", "sa":"Ligne_Riom_-_Châtelguyon", "lo":"chatel", "af":[433]}, 
        {"num":"793606", "g":1435, "len":5.9, "use":"FD", "end":"??", "lid":"#VM_ZI_de_Volvic_à_Riom", "sa":"Ligne_Riom_-_Châtelguyon#Voie-mère_de_la_ZI_de_Volvic_à_Riom"}, 
        {"num":"794000", "g":1435, "len":44, "use":"FD", "end":"1954", "lid":"Ligne_de_Beaumont-Loriat_à_Saint-Flour", "sa":"Ligne_Brioude_-_Saint-Flour-Chaudes-Aigues", "lo":"stflour", "af":[58]}, 
        {"num":"795000", "g":1435, "len":66.46, "use":"FD", "end":"2010", "lid":"Ligne_de_Bonson_à_Sembadel", "sa":"Ligne_Bonson_-_Sembadel", "lo":"sembadel", "af":[669]}, 
        {"num":"796000", "g":1435, "len":16.2, "use":"FD", "end":"1955", "lid":"Ligne_de_Saint-Just-sur-Loire_à_Fraisses_-_Unieux", "sa":"Ligne_Saint-Just-sur-Loire_-_Fraisses-Unieux", "lo":"firminy", "af":[758]}, 
        {"num":"797000", "g":1435, "pk0":0.41, "pkf":84.26, "len":83.85, "use":"FD", "end":"1989", "lid":"Ligne_de_Firminy_à_Saint-Rambert-d'Albon", "sa":"Ligne_Firminy_-_Saint-Rambert-d'Albon", "lo":"strambert", "af":[60]}, 
        {"num":"797306", "g":1435, "len":1.05, "use":"EXP", "lid":"#Shunt_Saint-Rambert-d'Albon_(bifurcation_nord)", "sa":"Ligne_Firminy_-_Saint-Rambert-d'Albon#Raccordements"}, 
        {"num":"797311", "g":1435, "len":0.56, "use":"EXP", "lid":"#Shunt_sud_de_Peyraud", "sa":"Ligne_Firminy_-_Saint-Rambert-d'Albon#Raccordements"}, 
        {"num":"798000", "g":1435, "pk0":0.15, "pkf":138.25, "len":138.1, "use":"EXP", "lid":"Ligne_de_Saint-Georges-d'Aurac_à_Saint-Étienne-Châteaucreux", "sa":"Ligne_Saint-Georges-d'Aurac_-_Saint-Étienne-Châteaucreux"}, 
        {"num":"799000", "g":1435, "pk0":1.5, "pkf":2, "len":0.5, "use":"FD", "end":"1980", "lid":"Ligne_de_Saint-Étienne-le-Clapier_à_La_Béraudière", "sa":"Ligne_Saint-Étienne-Le_Clapier_-_La_Béraudière"}, 
        {"num":"799099", "g":1435, "len":5, "use":"FD", "end":"1899", "lid":"Ligne_de_Saint-Étienne-le-Clapier_à_La_Béraudière#ancien_tracé", "sa":"Ligne_Saint-Étienne-Le_Clapier_-_La_Béraudière#ancien_tracé"}, 
        {"num":"800000", "g":1435, "pk0":530.41, "pkf":784.94, "len":254.53, "use":"EXP", "lid":"Ligne_de_Givors-Canal_à_Grezan", "sa":"Ligne_Givors-Canal_-_Grezan"}, 
        {"num":"800306", "g":1435, "len":0.48, "use":"EXP", "lid":"#Shunt_Peyraud_(bifurcation_nord)", "sa":"Ligne_Firminy_-_Saint-Rambert-d'Albon#Raccordements"}, 
        {"num":"800311", "g":1435, "pk0":4.71, "pkf":5.1, "len":0.39, "use":"EXP", "lid":"#Shunt_nord_de_La_Voulte", "sa":"Ligne_Givors-Canal_-_Grézan#Raccordements_de_La_Voulte"}, 
        {"num":"800316", "g":1435, "pk0":4.71, "pkf":5, "len":0.29, "use":"EXP", "lid":"#Shunt_sud_de_La_Voulte", "sa":"Ligne_Givors-Canal_-_Grézan#Raccordements_de_La_Voulte"}, 
        {"num":"800390", "g":1435, "len":10.37, "use":"EXP", "lid":"#Shunt_Saint-Gervasy", "sa":"Ligne_Givors-Canal_-_Grézan#Raccordement_de_Saint-Gervasy"}, 
        {"num":"804000", "g":1435, "pk0":640.96, "pkf":661.87, "len":20.91, "use":"FD", "end":"2014", "lid":"Ligne_du_Pouzin_à_Privas", "sa":"Ligne_Le_Pouzin_-_Privas", "lo":"privas", "af":[673]}, 
        {"num":"805000", "g":1435, "pk0":665.63, "pkf":764.44, "len":98.81, "use":"FD", "end":"1991", "lid":"Ligne_du_Teil_à_Alès", "sa":"Ligne_Le_Teil_-_Alès", "lo":"ales", "af":[55]}, 
        {"num":"806000", "g":1435, "pk0":692.95, "pkf":711.75, "len":18.8, "use":"FD", "end":"1991", "lid":"Ligne_de_Vogüé_à_Lalevade-d'Ardèche", "sa":"Ligne_Vogüé_-_Lalevade-d'Ardèche-Prades", "lo":"lalevade2", "af":[523]}, 
        {"num":"807000", "g":1435, "pk0":0.25, "pkf":12.81, "len":12.56, "use":"FD", "end":"1991", "lid":"Ligne_de_Saint-Sernin_à_Largentière", "sa":"Ligne_Saint-Sernin_-_Largentière", "lo":"largentiere", "af":[56]}, 
        {"num":"808000", "g":1435, "len":2.41, "use":"FD", "end":"2012", "lid":"Ligne_de_Bessèges_à_Robiac", "sa":"Ligne_Bessèges_-_Robiac"}, 
        {"num":"809000", "g":1435, "len":2.05, "use":"FD", "end":"1964", "lid":"Ligne_de_La_Valette_à_Robiac", "sa":"Ligne_La_Valette_-_Robiac", "af":[640]}, 
        {"num":"810000", "g":1435, "len":104.53, "use":"EXP", "lid":"Ligne_de_Tarascon_à_Sète-Ville", "sa":"Ligne_Tarascon_-_Sète-Ville"}, 
        {"num":"810310", "g":1435, "len":2.62, "use":"EXP", "lid":"Raccordement_de_Jonquières", "sa":"Raccordement_de_Jonquières"}, 
        {"num":"810315", "g":1435, "len":1.05, "use":"EXP", "lid":"Raccordement_de_Nimes-Alès", "sa":"Raccordement_de_Nimes-Alès"}, 
        {"num":"810506", "g":1435, "len":3.4, "use":"FD", "end":"??", "lid":"Voies_de_port_de_Sète-Ville", "sa":"Voies_de_port_de_Sète-Ville"}, 
        {"num":"810611", "g":1435, "len":0.75, "use":"FD", "end":"2000", "lid":"Voie-mère_du_Lantissargues", "sa":"Voie-mère_du_Lantissargues"}, 
        {"num":"811000", "g":1435, "pk0":101.29, "pkf":102, "len":0.71, "use":"EXP", "lid":"Ligne_de_La_Peyrade-Bifurcation_à_Sète-Méditerranée", "sa":"Ligne_La_Peyrade-Bifurcation_-_Sète-Méditerranée"}, 
        {"num":"811505", "g":1435, "pk0":102.28, "pkf":104.5, "len":2.22, "use":"FD", "end":"1999", "lid":"Voie_de_port_de_Sète-Méditerranée_(darse_1)", "sa":"Voie_de_port_de_Sète-Méditerranée_(darse_1)"}, 
        {"num":"812000", "g":1435, "len":57.77, "use":"FD", "end":"2015", "lid":"Ligne_d'Alès_à_Port-L'Ardoise", "sa":"Ligne_Alès_-_Port-L'Ardoise", "af":[639]}, 
        {"num":"812306", "g":1435, "len":0.89, "use":"EXP", "lid":"#Shunt_L'Ardoise_à_Port-L'Ardoise", "sa":"Ligne_Alès_-_Port-L'Ardoise#Raccordement_de_L'Ardoise_à_Port-L'Ardoise", "af":[639]}, 
        {"num":"813000", "g":1435, "pk0":0.21, "pkf":86.3, "len":86.09, "use":"FD", "end":"1938", "lid":"Ligne_du_Martinet_à_Beaucaire", "sa":"Ligne_Le_Martinet_-_Beaucaire", "af":[641, 642, 644]}, 
        {"num":"813399", "g":1435, "len":0.7, "use":"FD", "end":"1954", "lid":"#Shunt_Célas", "sa":"Ligne_Le_Martinet_-_Beaucaire#Raccordement_de_Célas"}, 
        {"num":"814000", "g":1435, "pk0":683.9, "pkf":746.51, "len":62.61, "use":"FD", "end":"1989", "lid":"Ligne_de_Mas-des-Gardies_aux_Mazes-le-Crès", "sa":"Ligne_Mas-des-Gardies_-_Les_Mazes-le-Crès", "af":[637, 636, 634]}, 
        {"num":"815000", "g":1435, "pk0":690.67, "pkf":711.06, "len":20.39, "use":"FD", "end":"1989", "lid":"Ligne_de_Lézan_à_Saint-Jean-du-Gard", "sa":"Ligne_Lézan_-_Saint-Jean-du-Gard", "lo":"stjeangard", "af":[638]}, 
        {"num":"816000", "g":1435, "len":42.83, "use":"FD", "end":"1991", "lid":"Ligne_du_Vigan_à_Quissac", "sa":"Ligne_Le_Vigan_-_Quissac", "lo":"quissac", "af":[636]}, 
        {"num":"817000", "g":1435, "pk0":63.1, "pkf":88.16, "len":25.06, "use":"FD", "end":"1991", "lid":"Ligne_de_Sommières_à_Saint-Césaire", "sa":"Ligne_Sommières_-_Saint-Césaire", "lo":"stcesaire", "af":[635]}, 
        {"num":"818000", "g":1435, "pk0":63.1, "pkf":73.4, "len":10.3, "use":"FD", "end":"1954", "lid":"Ligne_de_Sommières_à_Gallargues", "sa":"Ligne_Sommières_-_Gallargues", "lo":"gallargues", "af":[636]}, 
        {"num":"819000", "g":1435, "pk0":4.67, "pkf":45.18, "len":40.51, "use":"EXP", "lid":"Ligne_de_Saint-Césaire_au_Grau-du-Roi", "sa":"Ligne_Saint-Césaire_-_Le_Grau-du-Roi"}, 
        {"num":"820000", "g":1435, "pk0":1.41, "pkf":44.99, "len":43.58, "use":"FD", "end":"1971", "lid":"Ligne_d'Arles_à_Lunel", "sa":"Ligne_Trinquetaille_-_Lunel", "af":[647]}, 
        {"num":"821000", "g":1435, "len":34, "use":"FD", "end":"1992", "lid":"Ligne_d'Arles_au_canal", "sa":["Ligne_Arles_-_Le_Canal", "Ligne_Lavalduc_-_Fos-Coussoul_(dépôts_pétroliers)#Raccordements"], "af":[702]}, 
        {"num":"823000", "g":1435, "pk0":1, "pkf":18, "len":17, "use":"FD", "end":"1954", "lid":"Ligne_d'Uzès_à_Nozières_-_Brignon", "sa":"Ligne_Uzès_-_Nozières-Brignon", "lo":"nozieres", "af":[643]}, 
        {"num":"824000", "g":1435, "pk0":1.32, "pkf":4.82, "len":3.5, "use":"EXP", "lid":"Ligne_de_Villeneuve-lès-Avignon_à_Avignon", "sa":"Ligne_Villeneuve-lès-Avignon_-_Avignon-Centre"}, 
        {"num":"824301", "g":1435, "len":1, "use":"EXP", "lid":"Raccordement_sud_de_Villeneuve-lès-Avignon", "sa":"Raccordement_sud_de_Villeneuve-lès-Avignon"}, 
        {"num":"824306", "g":1435, "pk0":2.72, "pkf":5, "len":2.28, "use":"EXP", "lid":"Raccordement_de_Villeneuve-lès-Avignon", "sa":"Raccordement_de_Villeneuve-lès-Avignon"}, 
        {"num":"830000", "g":1435, "len":862.05, "use":"EXP", "lid":"Ligne_de_Paris-Lyon_à_Marseille-Saint-Charles", "sa":"Ligne_Paris-Gare-de-Lyon_-_Marseille-Saint-Charles"}, 
        {"num":"830321", "g":1435, "pk0":170, "pkf":172.69, "len":2.69, "use":"EXP", "lid":"Raccordement_militaire_de_Saint-Florentin-Vergigny", "sa":"Raccordement_militaire_de_Saint-Florentin-Vergigny"}, 
        {"num":"830336", "g":1435, "len":1.68, "use":"EXP", "lid":"Raccordement_de_Chasse-sur-Rhône", "sa":"Raccordement_de_Chasse-sur-Rhône"}, 
        {"num":"830341", "g":1435, "len":0.79, "use":"EXP", "lid":"Raccordement_de_Livron-Nord_(bifurcation_nord)", "sa":"Raccordement_de_Livron-Nord_(bifurcation_nord)"}, 
        {"num":"830346", "g":1435, "len":0.7, "use":"EXP", "lid":"Raccordement_de_Livron-Sud_(bifurcation_sud)", "sa":"Raccordement_de_Livron-Sud_(bifurcation_sud)"}, 
        {"num":"830351", "g":1435, "pk0":761.35, "pkf":762.87, "len":1.52, "use":"EXP", "lid":"Raccordement_nord_de_Tarascon", "sa":"Raccordement_nord_de_Tarascon"}, 
        {"num":"830356", "g":1435, "len":1.45, "use":"EXP", "lid":"Raccordement_sud_de_Tarascon", "sa":"Raccordement_sud_de_Tarascon"}, 
        {"num":"830359", "g":1435, "pk0":743.79, "pkf":745.25, "len":1.46, "use":"EXP", "lid":"Virgule_d'Avignon_Courtine", "sa":"Virgule_d'Avignon_Courtine"}, 
        {"num":"830366", "g":1435, "pk0":512.53, "pkf":513.4, "len":0.87, "use":"EXP", "lid":"Raccordement_de_Lyon-Guillotière_à_Lyon-Part-Dieu", "sa":"Raccordement_de_Lyon-Guillotière_à_Lyon-Part-Dieu"}, 
        {"num":"830646", "g":1435, "len":3.04, "use":"EXP", "lid":"Voie-mère_de_Pierrelatte", "sa":"Voie-mère_de_Pierrelatte"}, 
        {"num":"830649", "g":1435, "len":1.58, "use":"EXP", "lid":"Voie-mère_du_centre_des_transports_terrestres_de_Vitrolles", "sa":"Voie-mère_du_centre_des_transports_terrestres_de_Vitrolles"}, 
        {"num":"830900", "g":1435, "len":6.91, "use":"EXP", "lid":"#Voies_de_liaison_de_Dijon_à_Gevrey-Chambertin", "sa":"Raccordements_de_la_ligne_Paris-Lyon_-_Marseille-Saint-Charles#Voies_de_liaison_de_Dijon_à_Gevrey-Chambertin"}, 
        {"num":"831000", "g":1435, "pk0":94.45, "pkf":122.68, "len":28.23, "use":"EXP", "lid":"Ligne_de_Flamboin-Gouaix_à_Montereau", "sa":"Ligne_Flamboin-Gouaix_-_Montereau", "lo":"montereau"}, 
        {"num":"831606", "g":1435, "len":1.56, "use":"EXP", "lid":"Voie-mère_de_Montereau", "sa":"Voie-mère_de_Montereau"}, 
        {"num":"832000", "g":1435, "pk0":169.67, "pkf":221.3, "len":51.63, "use":"FD", "end":"2019", "lid":"Ligne_de_Saint-Julien_(Troyes)_à_Saint-Florentin-Vergigny", "sa":"Ligne_Saint-Julien_(Troyes)_-_Saint-Florentin-Vergigny", "lo":"stflorentin", "af":[1013]}, 
        {"num":"832306", "g":1435, "len":0.74, "use":"FD", "end":"??", "lid":"Raccordement_de_St-Julien_n°_2_(Troyes)", "sa":"Raccordement_de_St-Julien_n°_2_(Troyes)"}, 
        {"num":"832311", "g":1435, "len":1, "use":"FD", "end":"??", "lid":"Raccordement_de_St-Julien_n°_1_(Troyes)", "sa":"Raccordement_de_St-Julien_n°_1_(Troyes)"}, 
        {"num":"832511", "g":1435, "len":0.94, "use":"EXP", "lid":"Voie_de_port_de_Saint-Florentin-Ville", "sa":"Voie_de_port_de_Saint-Florentin-Ville"}, 
        {"num":"833300", "g":1435, "len":1.9, "use":"EXP", "lid":"Raccordement_de_St-Florentin", "sa":"Raccordement_de_St-Florentin"}, 
        {"num":"834000", "g":1435, "len":86.39, "use":"EXP", "lid":"Ligne_des_Angles_à_Lattes_(LGV)", "sa":"LGV_Contournement_de_Nîmes_et_Montpellier"}, 
        {"num":"834100", "g":1435, "len":5.33, "use":"EXP", "lid":"Raccordement_branche_grand-sud_du_triangle_des_Angles_(LGV)", "sa":"Raccordement_branche_grand-sud_du_triangle_des_Angles_(LGV)"}, 
        {"num":"834310", "g":1435, "len":3.3, "use":"EXP", "lid":"Raccordement_R2N_de_Redessan-Manduel", "sa":"Raccordement_R2N_de_Redessan-Manduel"}, 
        {"num":"834340", "g":1435, "len":2.61, "use":"EXP", "lid":"Raccordement_de_Lattes", "sa":"Raccordement_de_Lattes"}, 
        {"num":"837000", "g":1435, "len":48, "use":"EXP", "lid":"Ligne_de_Perpignan_à_Figueras", "sa":"LGV_Perpignan-Figueras"}, 
        {"num":"838000", "g":1435, "pk0":170.09, "pkf":351.92, "len":181.83, "use":"FD", "end":"2008", "lid":"Ligne_de_Saint-Julien_(Troyes)_à_Gray", "sa":"Ligne_Saint-Julien_(Troyes)_-_Gray", "af":[899]}, 
        {"num":"839000", "g":1435, "len":35.43, "use":"EXP", "lid":"Ligne_de_Nuits-sous-Ravières_à_Châtillon-sur-Seine", "sa":"Ligne_Nuits-sous-Ravières_-_Châtillon-sur-Seine"}, 
        {"num":"840000", "g":1435, "len":42, "use":"EXP", "lid":"Ligne_de_Bricon_à_Châtillon-sur-Seine", "sa":"Ligne_Bricon_-_Châtillon-sur-Seine", "af":[1206]}, 
        {"num":"842000", "g":1435, "pk0":280.17, "pkf":326.7, "len":46.53, "use":"FD", "end":"1972", "lid":"Ligne_de_Poinson-Beneuvre_à_Langres", "sa":"Ligne_Poinson-Beneuvre_-_Langres", "af":[944]}, 
        {"num":"843000", "g":1435, "pk0":346.81, "pkf":390.5, "len":43.69, "use":"EXP", "lid":"Ligne_d'Is-sur-Tille_à_Culmont-Chalindrey", "sa":"Ligne_Is-sur-Tille_-_Culmont-Chalindrey"}, 
        {"num":"844300", "g":1435, "pk0":389.31, "pkf":390.53, "len":1.22, "use":"EXP", "lid":"Raccordement_de_Culmont-Chalindrey", "sa":"Raccordement_de_Culmont-Chalindrey"}, 
        {"num":"845950", "g":1435, "len":1.63, "use":"EXP", "lid":"Saut-de-mouton_de_Culmont-Chalindrey", "sa":"Saut-de-mouton_de_Culmont-Chalindrey"}, 
        {"num":"846000", "g":1435, "pk0":309, "pkf":351.92, "len":42.92, "use":"FD", "end":"1991", "lid":"Ligne_de_Culmont-Chalindrey_à_Gray", "sa":"Ligne_Culmont-Chalindrey_-_Gray", "lo":"gray1", "af":[897]}, 
        {"num":"847000", "g":1435, "len":51, "use":"FD", "end":"2018", "lid":"Ligne_de_Vaivre_à_Gray", "sa":"Ligne_Vaivre_-_Gray", "lo":"gray2", "af":[891]}, 
        {"num":"849000", "g":1435, "pk0":318.26, "pkf":346.81, "len":28.55, "use":"EXP", "lid":"Ligne_de_Dijon-Ville_à_Is-sur-Tille", "sa":"Ligne_Dijon-Porte-d'Ouche-Perrigny_-_Is-sur-Tille"}, 
        {"num":"850000", "g":1435, "pk0":315.3, "pkf":459.61, "len":144.31, "use":"EXP", "lid":"Ligne_de_Dijon-Ville_à_Vallorbe_(frontière)", "sa":"Ligne_Dijon-Ville_-_Vallorbe_(frontière)"}, 
        {"num":"851000", "g":1435, "pk0":1.5, "pkf":53, "len":51.5, "use":"EXP", "lid":"Ligne_de_Gray_à_Saint-Jean-de-Losne", "sa":"Ligne_Gray_-_Saint-Jean-de-Losne", "lo":"stjean", "af":[903]}, 
        {"num":"852000", "g":1435, "pk0":361.17, "pkf":501.65, "len":140.48, "use":"EXP", "lid":"Ligne_de_Dole-Ville_à_Belfort", "sa":"Ligne_Dole-Ville_-_Belfort"}, 
        {"num":"852306", "g":1435, "len":1.24, "use":"EXP", "lid":"Raccordement_de_Belfort", "sa":"Raccordement_de_Belfort"}, 
        {"num":"853000", "g":1435, "pk0":0.3, "pkf":43.1, "len":42.8, "use":"FD", "end":"1964", "lid":"Ligne_de_Gray_à_Fraisans", "sa":"Ligne_Gray_-_Fraisans", "lo":"fraisans", "af":[857]}, 
        {"num":"853300", "g":1435, "pk0":37.5, "pkf":38.3, "len":0.8, "use":"FD", "end":"1964", "lid":"raccordement_de_Labarre", "sa":"raccordement_de_Labarre"}, 
        {"num":"854000", "g":1435, "pk0":444.25, "pkf":464.57, "len":20.32, "use":"EXP", "lid":"Ligne_de_Belfort_à_Delle", "sa":"Ligne_Belfort_-_Delle", "lo":"delle", "af":[879]}, 
        {"num":"855000", "g":1435, "pk0":21.23, "pkf":49, "len":27.77, "use":"FD", "end":"1957", "lid":"Ligne_de_Montagney_à_Miserey", "sa":"Ligne_Montagney_-_Miserey", "lo":"miserey", "af":[858]}, 
        {"num":"856000", "g":1435, "pk0":406.1, "pkf":469.6, "len":63.5, "use":"FD", "end":"2002", "lid":"Ligne_de_Besançon-Viotte_à_Vesoul", "sa":"Ligne_Besançon-Viotte_-_Vesoul", "lo":"vesoul", "af":[864]}, 
        {"num":"856350", "g":1435, "len":2.76, "use":"EXP", "lid":"Raccordement_EST_de_Besançon_TGV", "sa":"Raccordement_EST_de_Besançon_TGV"}, 
        {"num":"857000", "g":1435, "pk0":445.64, "pkf":485.35, "len":39.71, "use":"FD", "end":"2011", "lid":"Ligne_de_Montbozon_à_Lure", "sa":"Ligne_Montbozon_-_Lure", "lo":"lure", "af":[865]}, 
        {"num":"858000", "g":1435, "pk0":1.78, "pkf":19.4, "len":17.62, "use":"FD", "end":"2006", "lid":"Ligne_de_Montbéliard_à_Morvillars", "sa":"Ligne_Montbéliard_-_Morvillars", "lo":"morvillars", "af":[878]}, 
        {"num":"859000", "g":1435, "pk0":0.73, "pkf":26.97, "len":26.24, "use":"FD", "end":"2010", "lid":"Ligne_de_Voujeaucourt_à_Saint-Hippolyte", "sa":"Ligne_Voujeaucourt_-_Saint-Hippolyte", "lo":"sthippolyte", "af":[849]}, 
        {"num":"860000", "g":1435, "pk0":314.21, "pkf":426.65, "len":112.44, "use":"EXP", "lid":"Ligne_de_Dijon-Ville_à_Saint-Amour", "sa":"Ligne_Dijon-Ville_-_Saint-Amour"}, 
        {"num":"861300", "g":1435, "pk0":0.09, "pkf":1.52, "len":1.43, "use":"EXP", "lid":"Ligne_de_Dijon-Ville_à_Saint-Amour#Shunt_Lyon_(Dijon-Perrigny)", "sa":"Ligne_Dijon-Ville_-_Saint-Amour#Raccordement_de_Lyon_(Dijon-Perrigny)"}, 
        {"num":"861301", "g":1435, "len":0.8, "use":"EXP", "lid":"Ligne_de_Dijon-Ville_à_Saint-Amour#Shunt_évite-Perrigny", "sa":"Ligne_Dijon-Ville_-_Saint-Amour#Raccordement_évite-Perrigny"}, 
        {"num":"862300", "g":1435, "pk0":1.36, "pkf":2.57, "len":1.21, "use":"EXP", "lid":"#Shunt_supérieur_de_Longvic", "sa":"Ligne_Dijon-Ville_-_Saint-Amour#Raccordement_supérieur_de_Longvic"}, 
        {"num":"862310", "g":1435, "len":2.47, "use":"EXP", "lid":"#Shunt_TGV_de_Perrigny", "sa":"Ligne_Dijon-Ville_-_Saint-Amour#Raccordement_TGV_de_Perrigny"}, 
        {"num":"863300", "g":1435, "len":1.22, "use":"EXP", "lid":"#Shunt_St-Amour_(à_Gevrey-Chambertin)", "sa":"Ligne_Dijon-Ville_-_Saint-Amour#Raccordement_de_Saint-Amour_(à_Gevrey-Chambertin)"}, 
        {"num":"864000", "g":1435, "len":10.2, "use":"FD", "end":"1954", "lid":"Ligne_de_Beaune_à_Saint-Loup-de-la-Salle", "sa":"Ligne_Beaune_-_Saint-Loup-de-la-Salle", "lo":"stloup", "af":[1202]}, 
        {"num":"865000", "g":1435, "pk0":3.01, "pkf":80.21, "len":77.2, "use":"FD", "end":"1978", "lid":"Ligne_de_Chagny_à_Dole-Ville", "sa":"Ligne_Chagny_-_Dole-Ville", "lo":"dole", "af":[867]}, 
        {"num":"866300", "g":1435, "len":1.5, "use":"EXP", "lid":"Raccordement_de_St-Bonnet-en-Bresse", "sa":"Raccordement_de_St-Bonnet-en-Bresse"}, 
        {"num":"867000", "g":1435, "pk0":69.38, "pkf":106, "len":36.62, "use":"FD", "end":"1969", "lid":"Ligne_de_Seurre_à_Chalon-sur-Saône", "sa":"Ligne_Seurre_-_Chalon-sur-Saône", "lo":"seurre", "af":[1203]}, 
        {"num":"867599", "g":1435, "len":4, "use":"FD", "end":"??", "lid":"VP_de_Chalon-sur-Saône_Port-Fluvial", "sa":"VP_de_Chalon-sur-Saône_Port-Fluvial"}, 
        {"num":"867612", "g":1435, "len":1.2, "use":"FD", "end":"??", "lid":"#VM_Chalon-sur-Saône_n°_1C", "sa":"Ligne_Seurre_-_Chalon-sur-Saône#Voies-mères_de_Chalon-sur-Saône"}, 
        {"num":"867618", "g":1435, "len":2, "use":"FD", "end":"??", "lid":"#VM_Chalon-sur-Saône_A", "sa":"Ligne_Seurre_-_Chalon-sur-Saône#Voies-mères_de_Chalon-sur-Saône"}, 
        {"num":"867619", "g":1435, "len":1.5, "use":"FD", "end":"??", "lid":"#VM_Chalon-sur-Saône_B", "sa":"Ligne_Seurre_-_Chalon-sur-Saône#Voies-mères_de_Chalon-sur-Saône"}, 
        {"num":"868000", "g":1435, "pk0":347.02, "pkf":407.4, "len":60.38, "use":"FD", "end":"2014", "lid":"Ligne_de_Chaugey_à_Lons-le-Saunier", "sa":"Ligne_Chaugey_-_Lons-le-Saunier", "lo":"lons1", "af":[821]}, 
        {"num":"869000", "g":1435, "pk0":361.56, "pkf":400.22, "len":38.66, "use":"FD", "end":"2005", "lid":"Ligne_de_Dole-Ville_à_Poligny", "sa":"Ligne_Dole-Ville_-_Poligny", "lo":"poligny", "af":[820]}, 
        {"num":"870000", "g":1435, "pk0":392.29, "pkf":399.41, "len":7.12, "use":"FD", "end":"1978", "lid":"Ligne_de_Mouchard_à_Salins-les-Bains", "sa":"Ligne_Mouchard_-_Salins-les-Bains", "lo":"salins", "af":[835]}, 
        {"num":"871000", "g":1435, "pk0":0.49, "pkf":27.43, "len":26.94, "use":"EXP", "lid":"Ligne_de_Franois_à_Arc-et-Senans", "sa":"Ligne_Franois_-_Arc-et-Senans"}, 
        {"num":"872000", "g":1435, "pk0":407, "pkf":481.74, "len":74.74, "use":"EXP", "lid":"Ligne_de_Besançon-Viotte_au_Locle-Col-des-Roches", "sa":"Ligne_Besançon-Viotte_-_Le_Locle-Col-des-Roches"}, 
        {"num":"873000", "g":1435, "pk0":427.95, "pkf":452.5, "len":24.55, "use":"FD", "end":"1995", "lid":"Ligne_de_L'Hôpital-du-Grosbois_à_Lods", "sa":"Ligne_L'Hôpital-du-Grosbois_-_Lods", "lo":"lods", "af":[844]}, 
        {"num":"874000", "g":1435, "len":23.27, "use":"FD", "end":"2008", "lid":"Ligne_de_Pontarlier_à_Gilley", "sa":"Ligne_Pontarlier_-_Gilley", "lo":"gilley", "af":[839]}, 
        {"num":"875000", "g":1435, "pk0":437.41, "pkf":464.84, "len":27.43, "use":"EXP", "lid":"Ligne_de_Frasne_à_Verrières-de-Joux_(frontière)", "sa":"Ligne_Frasne_-_Verrières-de-Joux_(frontière)"}, 
        {"num":"876000", "g":1435, "pk0":457.36, "pkf":476.33, "len":18.97, "use":"FD", "end":"1969", "lid":"Ligne_de_Pontarlier_à_Vallorbe_(frontière)", "sa":"Ligne_Pontarlier_-_Vallorbe_(frontière)", "lo":"vallorbe", "af":[838]}, 
        {"num":"877300", "g":1435, "pk0":32.8, "pkf":33.99, "len":1.19, "use":"FD", "end":"??", "lid":"Raccordement_Villers-les-Pots_Ouest", "sa":"Raccordement_Villers-les-Pots_Ouest"}, 
        {"num":"877301", "g":1435, "pk0":32.8, "pkf":34.09, "len":1.29, "use":"FD", "end":"1991", "lid":"Raccordement_Villers-les-Pots_Sud", "sa":"Raccordement_Villers-les-Pots_Sud"}, 
        {"num":"878000", "g":1435, "len":116.35, "use":"FD", "end":"2017", "lid":"Ligne_d'Andelot-en-Montagne_à_La_Cluse", "sa":"Ligne_Andelot-en-Montagne_-_La_Cluse"}, 
        {"num":"878301", "g":1435, "pk0":115.49, "pkf":116.4, "len":0.91, "use":"EXP", "lid":"Raccordement_de_La_Cluse", "sa":"Raccordement_de_La_Cluse"}, 
        {"num":"879000", "g":1435, "len":44.31, "use":"FD", "end":"1953", "lid":"Ligne_de_Champagnole_à_Lons-le-Saunier", "sa":"Ligne_Champagnole_-_Lons-le-Saunier", "lo":"lons2", "af":[816]}, 
        {"num":"880000", "g":1435, "pk0":392.29, "pkf":505.49, "len":113.2, "use":"EXP", "lid":"Ligne_de_Mouchard_à_Bourg-en-Bresse", "sa":"Ligne_Mouchard_-_Bourg-en-Bresse"}, 
        {"num":"881000", "g":1435, "pk0":15.58, "pkf":65.38, "len":49.8, "use":"FD", "end":"1993", "lid":"Ligne_de_Saint-Germain-du-Plain_à_Lons-le-Saunier", "sa":"Ligne_Saint-Germain-du-Plain_-_Lons-le-Saunier", "lo":"lons3", "af":[822]}, 
        {"num":"882000", "g":1435, "pk0":0.78, "pkf":77.8, "len":77.02, "use":"FD", "end":"1956", "lid":"Ligne_de_Chalon-sur-Saône_à_Bourg-en-Bresse", "sa":"Ligne_Chalon-sur-Saône_-_Bourg-en-Bresse", "lo":"bourg", "af":[822, 916]}, 
        {"num":"883000", "g":1435, "pk0":0.73, "pkf":68.31, "len":67.58, "use":"EXP", "lid":"Ligne_de_Mâcon_à_Ambérieu", "sa":"Ligne_Mâcon_-_Ambérieu"}, 
        {"num":"883306", "g":1435, "len":0.96, "use":"EXP", "lid":"Raccordement_d'Ambérieu", "sa":"Raccordement_d'Ambérieu"}, 
        {"num":"884000", "g":1435, "pk0":0.51, "pkf":64, "len":63.49, "use":"EXP", "lid":"Ligne_de_Bourg-en-Bresse_à_Bellegarde", "sa":"Ligne_Bourg-en-Bresse_-_Bellegarde"}, 
        {"num":"886000", "g":1435, "pk0":13.18, "pkf":64.5, "len":51.32, "use":"EXP", "lid":"Ligne_de_Lyon-Saint-Clair_à_Bourg-en-Bresse", "sa":"Ligne_Lyon-Saint-Clair_-_Bourg-en-Bresse"}, 
        {"num":"887000", "g":1435, "len":25.1, "use":"FD", "end":"2011", "lid":"Ligne_de_Lyon-Croix-Rousse_à_Trévoux", "sa":"Ligne_Lyon-Croix-Rousse_-_Trévoux", "lo":"trevoux", "af":[831]}, 
        {"num":"887621", "g":1435, "len":4.78, "use":"FD", "end":"2011", "lid":"#VM_ZI_de_Genay-Neuville", "sa":"Ligne_Lyon-Croix-Rousse_-_Trévoux#Voie-mère_de_la_ZI_de_Genay-Neuville"}, 
        {"num":"888000", "g":1435, "len":3, "use":"EXP", "lid":"Ligne_de_Lyon-Gorge-de-Loup_à_Lyon-Vaise", "sa":"Ligne_Lyon-Gorge-de-Loup_-_Lyon-Vaise"}, 
        {"num":"889000", "g":1435, "len":17.76, "use":"FD", "end":"2002", "lid":"Ligne_d'Ambérieu_à_Montalieu-Vercieu", "sa":"Ligne_Ambérieu-en-Bugey_-_Montalieu-Vercieu", "lo":"montalieu", "af":[800]}, 
        {"num":"890000", "g":1435, "pk0":8, "pkf":152.32, "len":144.32, "use":"EXP", "lid":"Ligne_de_Lyon-Perrache_à_Genève_(frontière)", "sa":"Ligne_Lyon-Saint-Clair_-_Challex_(frontière)"}, 
        {"num":"890306", "g":1435, "len":0.61, "use":"EXP", "lid":"#Shunt_Culoz", "sa":"Ligne_Lyon-Perrache_-_Genève_(frontière)#Raccordement_de_Culoz"}, 
        {"num":"890605", "g":1435, "pk0":3, "pkf":18.61, "len":15.61, "use":"FD", "end":"2018", "lid":"#VM_ZI_d'Ambérieu", "sa":"Ligne_Lyon-Perrache_-_Genève_(frontière)#Voie-mère_de_l'embranchement_particulier_de_la_ZI_d'Ambérieu"}, 
        {"num":"891000", "g":1435, "pk0":142.54, "pkf":193.8, "len":51.26, "use":"FD", "end":"2014", "lid":"Ligne_de_Collonges-Fort-l'Écluse_à_Divonne-les-Bains_(frontière)", "sa":"Ligne_Collonges-Fort-l'Écluse_-_Divonne-les-Bains_(frontière)", "lo":"divonne", "af":[871]}, 
        {"num":"892000", "g":1435, "pk0":139.8, "pkf":233.45, "len":93.65, "use":"FD", "end":"1998", "lid":"Ligne_de_Longeray-Léaz_au_Bouveret", "sa":"Ligne_Longeray-Léaz_-_Le_Bouveret"}, 
        {"num":"893000", "g":1435, "pk0":499.75, "pkf":514.2, "len":14.45, "use":"EXP", "lid":"Ligne_de_Collonges-Fontaines_à_Lyon-Guillotière", "sa":"Ligne_Collonges-Fontaines_-_Port-Édouard-Herriot"}, 
        {"num":"893306", "g":1435, "len":2.46, "use":"EXP", "lid":"Raccordement_de_Lyon-Guillotière", "sa":"Raccordement_de_Lyon-Guillotière"}, 
        {"num":"894000", "g":1435, "len":5.99, "use":"FD", "end":"2013", "lid":"Ligne_d'Annemasse_à_Genève-Eaux-Vives_(frontière)", "sa":"Ligne_Annemasse_-_Genève-Eaux-Vives_(frontière)"}, 
        {"num":"895000", "g":1435, "pk0":0.56, "pkf":46.91, "len":46.35, "use":"EXP", "lid":"Ligne_de_La_Roche-sur-Foron_à_Saint-Gervais-les-Bains-Le_Fayet", "sa":"Ligne_La_Roche-sur-Foron_-_Saint-Gervais-les-Bains-Le_Fayet"}, 
        {"num":"896000", "g":1000, "len":37, "use":"EXP", "lid":"Ligne_de_Saint-Gervais-les-Bains-Le_Fayet_à_Vallorcine_(frontière)", "sa":"Ligne_Saint-Gervais-les-Bains-Le_Fayet_-_Vallorcine_(frontière)"}, 
        {"num":"897000", "g":1435, "pk0":0.08, "pkf":94.65, "len":94.57, "use":"EXP", "lid":"Ligne_d'Aix-les-Bains-Le_Revard_à_Annemasse", "sa":"Ligne_Aix-les-Bains-Le_Revard_-_Annemasse"}, 
        {"num":"898000", "g":1435, "pk0":0.48, "pkf":45.35, "len":44.87, "use":"FD", "end":"1999", "lid":"Ligne_d'Annecy_à_Albertville", "sa":"Ligne_Annecy_-_Albertville", "lo":"albertville", "af":[745]}, 
        {"num":"899000", "g":1435, "pk0":1.77, "pkf":80.21, "len":78.44, "use":"EXP", "lid":"Ligne_de_la_Tarentaise", "sa":"Ligne_Saint-Pierre-d'Albigny_-_Bourg-Saint-Maurice"}, 
        {"num":"900000", "g":1435, "pk0":101.36, "pkf":247.32, "len":145.96, "use":"EXP", "lid":"Ligne_de_la_Maurienne", "sa":"Ligne_Culoz_-_Modane_(frontière)"}, 
        {"num":"900903", "g":1435, "len":2.13, "use":"FD", "end":"2013", "lid":"#Évitement_de_Pontamafrey", "sa":"Ligne_Culoz_-_Modane_(frontière)#Évitement_de_Pontamafrey"}, 
        {"num":"901000", "g":1435, "len":64.73, "use":"FD", "end":"2003", "lid":"Chemin_de_fer_de_l'Est_de_Lyon", "sa":"Ligne_Lyon-Part-Dieu_-_Montalieu-Vercieu", "af":[797, 799]}, 
        {"num":"903000", "g":1435, "pk0":63.42, "pkf":106.36, "len":42.94, "use":"EXP", "lid":"Ligne_de_Saint-André-le-Gaz_à_Chambéry", "sa":"Ligne_Saint-André-le-Gaz_-_Chambéry"}, 
        {"num":"903606", "g":1435, "len":1.82, "use":"FD", "end":"1990", "lid":"#VM_A_de_la_ZI_de_Chambéry-Bissy", "sa":"Ligne_Saint-André-le-Gaz_-_Chambéry#Voies-mères_de_la_ZI_de_Chambéry-Bissy"}, 
        {"num":"904000", "g":1435, "pk0":73.4, "pkf":119.77, "len":46.37, "use":"FD", "end":"2017", "lid":"Ligne_de_Pressins_à_Virieu-le-Grand", "sa":"Ligne_Pressins_-_Virieu-le-Grand-Belley", "lo":"virieu", "af":[773]}, 
        {"num":"905000", "g":1435, "pk0":3.83, "pkf":442, "len":438.17, "use":"EXP", "lid":"Ligne_de_Lyon-Perrache_à_Marseille-Saint-Charles_(via_Grenoble)", "sa":"Ligne_Lyon-Perrache_-_Marseille-Saint-Charles_(via_Grenoble)"}, 
        {"num":"905606", "g":1435, "len":0.8, "use":"FD", "end":"2010", "lid":"#VM_Vénissieux", "sa":"Ligne_Lyon-Perrache_-_Marseille-Saint-Charles_(via_Grenoble)#Voie-mère_de_Vénissieux"}, 
        {"num":"906000", "g":1435, "pk0":1.3, "pkf":4.03, "len":2.73, "use":"EXP", "lid":"Ligne_de_Givors-Canal_à_Chasse-sur-Rhône", "sa":"Ligne_Givors-Canal_-_Chasse-sur-Rhône"}, 
        {"num":"907000", "g":1435, "len":55.44, "use":"FD", "end":"2016", "lid":"Ligne_de_Saint-Rambert-d'Albon_à_Rives", "sa":"Ligne_Saint-Rambert-d'Albon_-_Rives", "lo":"rives", "af":[101]}, 
        {"num":"908000", "g":1435, "pk0":1.18, "pkf":79.66, "len":78.48, "use":"EXP", "lid":"Ligne_de_Valence_à_Moirans", "sa":"Ligne_Valence_-_Moirans"}, 
        {"num":"908320", "g":1435, "len":2.02, "use":"EXP", "lid":"#Shunt_Châteauneuf_sur_Isère", "sa":"Ligne_Valence_-_Moirans#Raccordement_de_Châteauneuf-sur-Isère"}, 
        {"num":"909000", "g":1435, "pk0":1, "pkf":49.77, "len":48.77, "use":"EXP", "lid":"Ligne_de_Grenoble_à_Montmélian", "sa":"Ligne_Grenoble_-_Montmélian"}, 
        {"num":"909306", "g":1435, "len":0.82, "use":"EXP", "lid":"#Shunt_Montmélian", "sa":"Ligne_Grenoble_-_Montmélian#Raccordement_de_Montm.C3.A9lian"}, 
        {"num":"909903", "g":1435, "pk0":133.68, "pkf":142, "len":8.32, "use":"FD", "end":"??", "lid":"#Déviation_de_la_ligne_de_Grenoble_à_Montmélian", "sa":"Ligne_Grenoble_-_Montmélian#Déviation_de_la_ligne_de_Grenoble_à_Montmélian"}, 
        {"num":"912000", "g":1435, "len":109.29, "use":"EXP", "lid":"Ligne_de_Livron_à_Aspres-sur-Buëch", "sa":"Ligne_Livron_-_Aspres-sur-Buëch"}, 
        {"num":"913000", "g":1435, "pk0":0.79, "pkf":4.71, "len":3.92, "use":"EXP", "lid":"Ligne_de_Livron_à_La_Voulte", "sa":"Ligne_Livron_-_La_Voulte"}, 
        {"num":"914000", "g":1435, "pk0":3.04, "pkf":41.01, "len":37.97, "use":"FD", "end":"1954", "lid":"Ligne_de_Pierrelatte_à_Nyons", "sa":"Ligne_Pierrelatte_-_Nyons", "lo":"nyons", "af":[684]}, 
        {"num":"915000", "g":1435, "pk0":240.05, "pkf":348.88, "len":108.83, "use":"EXP", "lid":"Ligne_de_Veynes_à_Briançon", "sa":"Ligne_Veynes_-_Briançon", "af":[725]}, 
        {"num":"916000", "g":1435, "pk0":284, "pkf":286, "len":2, "use":"FD", "end":"1960", "lid":"Ligne_de_Chorges_à_Barcelonnette", "sa":"Ligne_Chorges_-_Barcelonnette", "af":[726]}, 
        {"num":"920000", "g":1435, "pk0":306.94, "pkf":328.94, "len":22, "use":"FD", "end":"1991", "lid":"Ligne_de_Saint-Auban_à_Digne", "sa":"Ligne_Saint-Auban_-_Digne", "lo":"digne"}, 
        {"num":"921000", "g":1435, "len":14.8, "use":"FD", "end":"1978", "lid":"Ligne_de_Forcalquier_à_Volx", "sa":"Ligne_Forcalquier_-_Volx", "lo":"volx", "af":[65]}, 
        {"num":"922000", "g":1435, "len":69, "use":"FD", "end":"1991", "lid":"Ligne_de_Cavaillon_à_Saint-Maime_-_Dauphin", "sa":"Ligne_Cavaillon_-_Saint-Maime-Dauphin", "lo":"stmaime", "af":[64]}, 
        {"num":"923000", "g":1435, "pk0":36.37, "pkf":76.83, "len":40.46, "use":"FD", "end":"1971", "lid":"Ligne_de_Cheval-Blanc_à_Pertuis", "sa":"Ligne_Cheval-Blanc_-_Pertuis", "lo":"pertuis"}, 
        {"num":"924000", "g":1435, "len":32.64, "use":"FD", "end":"1973", "lid":"Ligne_de_Salon_à_La_Calade-Éguilles", "sa":"Ligne_Salon_-_La_Calade-Éguilles", "lo":"calade", "af":[704]}, 
        {"num":"925000", "g":1435, "pk0":0.55, "pkf":68.54, "len":67.99, "use":"EXP", "lid":"Ligne_d'Avignon_à_Miramas", "sa":"Ligne_Avignon_-_Miramas"}, 
        {"num":"926000", "g":1435, "len":38, "use":"FD", "end":"2002", "lid":"Ligne_d'Orange_à_l'Isle_-_Fontaine-de-Vaucluse", "sa":"Ligne_Orange_-_L'Isle-Fontaine-de-Vaucluse", "lo":"isle", "af":[698]}, 
        {"num":"927000", "g":1435, "len":16.5, "use":"EXP", "lid":"Ligne_de_Sorgues-Châteauneuf-du-Pape_à_Carpentras", "sa":"Ligne_Sorgues-Châteauneuf-du-Pape_-_Carpentras", "lo":"carpentras"}, 
        {"num":"928000", "g":1435, "len":25.18, "use":"EXP", "lid":"Ligne_de_Rognac_à_Aix-en-Provence", "sa":"Ligne_Rognac_-_Aix-en-Provence", "lo":"aix"}, 
        {"num":"928106", "g":1435, "len":1.13, "use":"EXP", "lid":"#Embranchement_d'Aix-en-Provence-Marchandises", "sa":"Ligne_Rognac_-_Aix-en-Provence#Raccordements"}, 
        {"num":"928616", "g":1435, "len":1.05, "use":"FD", "end":"2010", "lid":"#VM_sud-ouest_des_Milles", "sa":"Ligne_Rognac_-_Aix-en-Provence#Raccordements"}, 
        {"num":"929300", "g":1435, "len":2.07, "use":"EXP", "lid":"#Shunt_Avignon", "sa":"Ligne_Avignon_-_Miramas#Raccordement_d'Avignon"}, 
        {"num":"930000", "g":1435, "len":259.25, "use":"EXP", "lid":"Ligne_de_Marseille-Saint-Charles_à_Vintimille_(frontière)", "sa":"Ligne_Marseille-Saint-Charles_-_Vintimille_(frontière)"}, 
        {"num":"930333", "g":1435, "len":1.5, "use":"EXP", "lid":"#Shunt_Calandre", "sa":"Ligne_Marseille-Saint-Charles_-_Vintimille_(frontière)#Raccordement_de_Calandre"}, 
        {"num":"930506", "g":1435, "len":1.79, "use":"FD", "end":"1980", "lid":"#VP_Brégaillon", "sa":"Ligne_Marseille-Saint-Charles_-_Vintimille_(frontière)#Voies_de_desserte_du_port_de_Brégaillon_et_du_port_marchand_de_Toulon"}, 
        {"num":"931000", "g":1000, "len":49.7, "use":"FD", "end":"1954", "lid":"Ligne_d'Orange_à_Buis-les-Baronnies", "af":[697]}, 
        {"num":"934100", "g":1435, "len":2.41, "use":"FD", "end":"??", "lid":"#Voie_de_desserte_de_Moureplane", "sa":"Ligne_L'Estaque_-_Marseille-Saint-Charles#Raccordements"}, 
        {"num":"935000", "g":1435, "pk0":809.27, "pkf":870.08, "len":60.81, "use":"EXP", "lid":"Ligne_de_Miramas_à_l'Estaque", "sa":"Ligne_Miramas_-_L'Estaque", "af":[715], "wf":"Société_des_chemins_de_fer_de_Miramas_à_Port_de_Bouc"}, 
        {"num":"935111", "g":1435, "pk0":0.22, "pkf":3.48, "len":3.26, "use":"FD", "end":"??", "lid":"Ligne_de_Port-de-Bouc_à_Caronte-la-Gafette", "sa":"Ligne_Port-de-Bouc_-_Caronte-la-Gafette"}, 
        {"num":"935306", "g":1435, "len":1, "use":"EXP", "lid":"#Shunt_sud_de_Lavalduc", "sa":"Ligne_Lavalduc_-_Fos-Coussoul_(dépôts_pétroliers)#Tracé"}, 
        {"num":"935311", "g":1435, "len":1.36, "use":"EXP", "lid":"#Shunt_sud_de_Fos-Graveleau", "sa":"Ligne_Lavalduc_-_Fos-Coussoul_(dépôts_pétroliers)#Tracé"}, 
        {"num":"935606", "g":1435, "len":4.65, "use":"EXP", "lid":"#VM_Martigues_à_Lavera", "sa":"Ligne_Miramas_-_L'Estaque#Voie-mère_de_Martigues_à_Lavera"}, 
        {"num":"935901", "g":1435, "len":8.89, "use":"EXP", "lid":"Ligne_de_Lavalduc_à_Fos-Coussoul_(dépôts_pétroliers)", "sa":"Ligne_Lavalduc_-_Fos-Coussoul_(dépôts_pétroliers)"}, 
        {"num":"935902", "g":1435, "pk0":4.56, "pkf":17.8, "len":13.24, "use":"EXP", "lid":"#VP_môle_minéralier_de_Fos", "sa":"Ligne_Lavalduc_-_Fos-Coussoul_(dépôts_pétroliers)#Tracé"}, 
        {"num":"935903", "g":1435, "pk0":11.78, "pkf":23.78, "len":12, "use":"EXP", "lid":"#VP_Port-St-Louis-du-Rhône", "sa":"Ligne_Lavalduc_-_Fos-Coussoul_(dépôts_pétroliers)#Tracé"}, 
        {"num":"935904", "g":1435, "pk0":19.64, "pkf":25.86, "len":6.22, "use":"FD", "end":"??", "lid":"#VP_Fos-Graveleau", "sa":"Ligne_Lavalduc_-_Fos-Coussoul_(dépôts_pétroliers)#Tracé"}, 
        {"num":"935905", "g":1435, "pk0":22.91, "pkf":25.52, "len":2.61, "use":"EXP", "lid":"#VP_voitures-colis_lourds_de_Fos", "sa":"Ligne_Lavalduc_-_Fos-Coussoul_(dépôts_pétroliers)#Tracé"}, 
        {"num":"935906", "g":1435, "pk0":23.31, "pkf":25.38, "len":2.07, "use":"EXP", "lid":"#VP_nord-est_de_Port-St-Louis-du-Rhône", "sa":"Ligne_Lavalduc_-_Fos-Coussoul_(dépôts_pétroliers)#Tracé"}, 
        {"num":"935907", "g":1435, "pk0":23.78, "pkf":26.18, "len":2.4, "use":"EXP", "lid":"#VP_sud_de_Port-St-Louis-du-Rhône", "sa":"Ligne_Lavalduc_-_Fos-Coussoul_(dépôts_pétroliers)#Tracé"}, 
        {"num":"936300", "g":1435, "pk0":860.26, "pkf":861.57, "len":1.31, "use":"EXP", "lid":"Raccordement_des_Chartreux", "sa":"Raccordement_des_Chartreux"}, 
        {"num":"937000", "g":1435, "len":3.24, "use":"FD", "end":"1980", "lid":"Ligne_de_Marseille-Blancarde_à_Marseille-Prado", "sa":"Ligne_Marseille-Blancarde_-_Marseille-Prado", "af":[708]}, 
        {"num":"938000", "g":1435, "pk0":1.99, "pkf":2.6, "len":0.61, "use":"FD", "end":"??", "lid":"Ligne_de_Marseille-St-Charles_à_Marseille-Joliette", "sa":"Ligne_Marseille-Saint-Charles_-_Marseille-Joliette", "af":[708]}, 
        {"num":"939000", "g":1435, "pk0":857.49, "pkf":860.06, "len":2.57, "use":"EXP", "lid":"Ligne_de_L'Estaque_à_Marseille-Joliette", "sa":"Ligne_L'Estaque_-_Marseille-Joliette"}, 
        {"num":"939001", "g":1435, "pk0":851.7, "pkf":861.5, "len":9.8, "use":"EXP", "lid":"#lignede_L'Estaque_à_Marseille_Saint-Charles", "sa":"Ligne_L'Estaque_-_Marseille-Saint-Charles"}, 
        {"num":"939306", "g":1435, "pk0":856.47, "pkf":857.44, "len":0.97, "use":"EXP", "lid":"#Shunt_Joliette_Marseille-Canet", "sa":"Ligne_Marseille-Arenc_-_Marseille-Canet#Raccordement_de_L'Estaque-Joliette_à_Marseille-Canet"}, 
        {"num":"939516", "g":1435, "pk0":1.38, "pkf":2.75, "len":1.37, "use":"FD", "end":"??", "lid":"#VP_chantier_Joliette_aux_môles_J", "sa":"Ligne_L'Estaque_-_Marseille-Joliette#Tracé"}, 
        {"num":"940100", "g":1435, "len":2.37, "use":"FD", "end":"??", "lid":"Ligne_de_Marseille-Arenc_à_Marseille-Canet", "sa":"Ligne_Marseille-Arenc_-_Marseille-Canet"}, 
        {"num":"941000", "g":1435, "len":3.03, "use":"FD", "end":"1950", "lid":"Ligne_de_Marseille-Prado_à_Marseille-Vieux-Port", "sa":"Ligne_Marseille-Prado_-_Marseille-Vieux-Port", "lo":"marseillevp", "af":[708]}, 
        {"num":"942000", "g":1435, "pk0":0.36, "pkf":18.42, "len":18.06, "use":"FD", "end":"1989", "lid":"Ligne_de_La_Pauline-Hyères_aux_Salins-d'Hyères", "sa":"Ligne_La_Pauline-Hyères_-_Les_Salins-d'Hyères", "lo":"hyeres", "af":[717]}, 
        {"num":"943000", "g":1435, "pk0":0.48, "pkf":12.5, "len":12.02, "use":"FD", "end":"1981", "lid":"Ligne_des_Arcs_à_Draguignan", "sa":"Ligne_Les_Arcs_-_Draguignan", "lo":"draguignan", "af":[716]}, 
        {"num":"944000", "g":1435, "pk0":2.52, "pkf":19.2, "len":16.68, "use":"EXP", "lid":"Ligne_de_Cannes-la-Bocca_à_Grasse", "sa":"Ligne_Cannes-la-Bocca_-_Grasse"}, 
        {"num":"945000", "g":1435, "len":44.09, "use":"EXP", "lid":"Ligne_de_Nice_à_Breil-sur-Roya", "sa":"Ligne_Nice_-_Breil-sur-Roya"}, 
        {"num":"946000", "g":1435, "len":99.4, "use":"EXP", "lid":"Ligne_de_Coni_à_Vintimille", "sa":"Ligne_Coni_-_Vintimille"}, 
        {"num":"947000", "g":1435, "pk0":0.41, "pkf":78.76, "len":78.35, "use":"FD", "end":"1987", "lid":"Ligne_de_Carnoules_à_Gardanne", "sa":"Ligne_Carnoules_-_Gardanne", "lo":"gardanne"}, 
        {"num":"948000", "g":1435, "pk0":0.3, "pkf":30.3, "len":30, "use":"FD", "end":"1987", "lid":"Ligne_d'Aubagne_à_La_Barque", "sa":"Ligne_Aubagne_-_La_Barque-Fuveau", "lo":"barque", "af":[706]}, 
        {"num":"952000", "g":1435, "len":4.46, "use":"FD", "end":"1990", "lid":"Ligne_de_La_Plaine_à_Pantin", "sa":"Ligne_La_Plaine-Tramways_-_Pantin"}, 
        {"num":"953000", "g":1435, "pk0":11.36, "pkf":14.4, "len":3.04, "use":"FD", "end":"1956", "lid":"Ligne_d'Enghien-les-Bains_à_Montmorency", "sa":"Ligne_Enghien-les-Bains_-_Montmorency", "af":[1204]}, 
        {"num":"955000", "g":1435, "pk0":18.88, "pkf":34, "len":15.12, "use":"EXP", "lid":"Ligne_de_La_Râpée_à_Batignolles_(petite_ceinture_de_Paris)", "sa":"Petite_Ceinture_de_Paris"}, 
        {"num":"955306", "g":1435, "pk0":2.29, "pkf":3.37, "len":1.08, "use":"FD", "end":"1969", "lid":"#Raccordement_de_Bel-Air", "sa":"Petite_Ceinture_de_Paris#Raccordement_de_Bel-Air"}, 
        {"num":"956000", "g":1435, "len":66.3, "use":"FD", "end":"1969", "lid":"Ligne_de_Vincennes", "sa":"Ligne_Paris-Bastille_-_Marles-en-Brie", "af":[979]}, 
        {"num":"956999", "g":1435, "len":4.21, "use":"EXP", "lid":"RER_A#Gare-de-Lyon_à_St-Mandé", "sa":"RER_d'Île-de-France_(Ligne_B)#Gare-de-Lyon_à_St-Mandé"}, 
        {"num":"957000", "g":1435, "len":21.28, "use":"EXP", "lid":"Ligne_de_Bobigny_à_Sucy-Bonneuil", "sa":"Ligne_Bobigny_-_Sucy-Bonneuil"}, 
        {"num":"958000", "g":1435, "len":7.87, "use":"EXP", "lid":"Ligne_de_Bondy_à_Aulnay-sous-Bois", "sa":"Ligne_Bondy_-_Aulnay-sous-Bois"}, 
        {"num":"959300", "g":1435, "len":1.85, "use":"EXP", "lid":"Raccordement_nord_de_Villiers-sur-Marne", "sa":"Raccordement_nord_de_Villiers-sur-Marne"}, 
        {"num":"960000", "g":1435, "pk0":44.88, "pkf":55.47, "len":10.59, "use":"EXP", "lid":"Ligne_11_Express_du_tramway_d'Île-de-France", "sa":"Ligne_Épinay-sur-Seine_TT_-_Le_Bourget TT"}, 
        {"num":"962000", "g":1435, "pk0":2.1, "pkf":21.21, "len":19.11, "use":"EXP", "lid":"Ligne_d'Ermont-Eaubonne_à_Champ-de-Mars_(VMI)", "sa":"Ligne_Champ-de-Mars-Tour-Eiffel_-_Ermont-Eaubonne"}, 
        {"num":"963000", "g":1435, "pk0":3.14, "pkf":6.4, "len":3.26, "use":"EXP", "lid":"Ligne_de_La_Plaine_à_Ermont-Eaubonne", "sa":"Ligne_La_Plaine-Tramways_-_Saint_Ouen"}, 
        {"num":"963506", "g":1435, "len":3.67, "use":"EXP", "lid":"Desserte_du_port_de_Gennevilliers", "sa":"Desserte_du_port_de_Gennevilliers"}, 
        {"num":"963606", "g":1435, "len":0.78, "use":"EXP", "lid":"Voie-mère_de_St-Ouen_à_St-Ouen-les-Docks", "sa":"Voie-mère_de_St-Ouen_à_St-Ouen-les-Docks"}, 
        {"num":"965300", "g":1435, "pk0":13.09, "pkf":14.96, "len":1.87, "use":"FD", "end":"??", "lid":"Raccordement_de_Sannois", "sa":"Raccordement_de_Sannois"}, 
        {"num":"966000", "g":1435, "len":5.5, "use":"FD", "end":"1941", "lid":"Ligne_de_Maisons-Laffitte_à_Champ-de-Courses", "sa":"Ligne_Maisons-Laffitte_-_Hippodrome-Maisons-Laffitte", "af":[1462]},
        {"num":"967300", "g":1435, "pk0":8.47, "pkf":12.08, "len":3.61, "use":"EXP", "lid":"Raccordement_de_La_Folie_(La_Garenne-Bezons)", "sa":"Raccordement_de_La_Folie_(La_Garenne-Bezons)"}, 
        {"num":"968301", "g":1435, "len":2.48, "use":"FD", "end":"??", "lid":"Raccordement_de_Courbevoie_à_Colombes_et_à_La_Garenne-Bezons", "sa":"Raccordement_de_Courbevoie_à_Colombes_et_à_La_Garenne-Bezons"},
        {"num":"969300", "g":1435, "len":2.8, "use":"EXP" ,"lid":"Ligne_de_Petite_Ceinture#Raccordement_de_Courcelles","sa":"Petite_Ceinture_de_Paris#Raccordement_de_Courcelles"},
    
        {"num":"971000", "g":1435, "pk0":2.92, "pkf":8.9, "len":5.98, "use":"FD", "end":"1985", "lid":"Ligne_de_Pont-Cardinet_à_Auteuil_-_Boulogne", "sa":"Ligne_Auteuil-Boulogne_-_Pont-Cardinet"}, 
        {"num":"972000", "g":1435, "pk0":3, "pkf":21, "len":18, "use":"FD", "end":"1993", "lid":"Ligne_2_du_tramway_d'Île-de-France", "sa":"Tramway_d'Île-de-France_(Ligne_2)"}, 
        {"num":"973000", "g":1435, "len":22.88, "use":"EXP", "lid":"Ligne_de_Paris-Saint-Lazare_à_Versailles-Rive-Droite", "sa":"Ligne_Paris-Saint-Lazare_-_Versailles-Rive-Droite"}, 
        {"num":"974000", "g":1435, "pk0":14.78, "pkf":29.92, "len":15.14, "use":"EXP", "lid":"Ligne_de_Saint-Cloud_à_Saint-Nom-la-Bretèche-Forêt-de-Marly", "sa":"Ligne_Saint-Cloud_-_Saint-Nom-la-Bretêche-Forêt-de-Marly"}, 
        {"num":"975000", "g":1435, "len":20.48, "use":"EXP", "lid":"Ligne_de_Paris-Saint-Lazare_à_Saint-Germain-en-Laye", "sa":"Ligne_Paris-Saint-Lazare_-_Saint-Germain-en-Laye"}, 
        {"num":"975900", "g":1435, "pk0":10.31, "pkf":13, "len":2.69, "use":"EXP", "lid":"Ligne_de_Nanterre-Université_à_Sartrouville", "sa":"Ligne_Nanterre-Université_-_Sartrouville"}, 
        {"num":"976000", "g":1435, "len":3.3, "use":"FD", "end":"1945", "lid":"Ligne_de_Saint-Germain-Grande-Ceinture_à_Saint-Germain-en-Laye", "sa":"Ligne_Saint-Germain-Grande-Ceinture_-_Saint-Germain-en-Laye", "af":[1461]}, 
        {"num":"977000", "g":1435, "len":17.61, "use":"EXP", "lid":"Ligne_des_Invalides_à_Versailles-Rive-Gauche", "sa":"Ligne_Invalides_-_Versailles-Rive-Gauche"}, 
        {"num":"978300", "g":1435, "pk0":19.28, "pkf":21.56, "len":2.28, "use":"EXP", "lid":"Raccordement_de_Viroflay", "sa":"Raccordement_de_Viroflay"}, 
        {"num":"979000", "g":1435, "len":2, "use":"EXP", "lid":"RER_E", "sa":"RER_d'Île-de-France_(Ligne_E)"}, 
        {"num":"980000", "g":1435, "pk0":8.24, "pkf":18.87, "len":10.63, "use":"FD", "end":"1993", "lid":"Ligne_d'Auteuil-Boulogne_à_La_Râpée_(petite_ceinture_de_Paris)", "sa":"Petite_Ceinture_de_Paris"}, 
        {"num":"980106", "g":1435, "len":0.54, "use":"FD", "end":"1991", "lid":"Embranchement_de_Paris-Gobelins", "sa":"Embranchement_de_Paris-Gobelins"}, 
        {"num":"981000", "g":1435, "len":5.27, "use":"EXP", "lid":"RER_D", "sa":"RER_d'Île-de-France_(Ligne_D)"}, 
        {"num":"983000", "g":1435, "len":0.94, "use":"EXP", "lid":"Ligne_des_Invalides_à_Quai-d'Orsay", "sa":"Ligne_Invalides_-_Quai-d'Orsay"}, 
        {"num":"984000", "g":1435, "pk0":0.94, "pkf":4.57, "len":3.63, "use":"EXP", "lid":"Ligne_de_Quai-d'Orsay_à_Paris-Austerlitz", "sa":"Ligne_Quai-d'Orsay_-_Paris-Austerlitz"}, 
        {"num":"985000", "g":1435, "pk0":9.48, "pkf":25.44, "len":15.96, "use":"EXP", "lid":"Ligne_de_Choisy-le-Roi_à_Massy-Verrières", "sa":"Ligne_Choisy-le-Roi_-_Massy-Verrières"}, 
        {"num":"988000", "g":1435, "pk0":0.39, "pkf":10.95, "len":10.56, "use":"EXP", "lid":"Ligne_de_Grigny_à_Corbeil-Essonnes", "sa":"Ligne_Grigny_-_Corbeil-Essonnes"}, 
        {"num":"990000", "g":1435, "len":120.75, "use":"FD", "end":"1995", "lid":"Ligne_de_la_grande_ceinture_de_Paris", "sa":"Grande_Ceinture_de_Paris"}, 
        {"num":"990321", "g":1435, "pk0":82.53, "pkf":83.77, "len":1.24, "use":"EXP", "lid":"Raccordement_nord_de_Villeneuve-Triage", "sa":"Raccordement_nord_de_Villeneuve-Triage"}, 
        {"num":"990331", "g":1435, "len":7.91, "use":"EXP", "lid":"Raccordement_marché-gare_de_Rungis_voie_MG", "sa":"Raccordement_marché-gare_de_Rungis_voie_MG"}, 
        {"num":"990332", "g":1435, "pk0":5.74, "pkf":9, "len":3.26, "use":"EXP", "lid":"Raccordement_MIN_Rungis_voie_MG", "sa":"Raccordement_MIN_Rungis_voie_MG"}, 
        {"num":"991300", "g":1435, "len":2.7, "use":"EXP", "lid":"Raccordement_de_Gagny-Tronc-Commun", "sa":"Raccordement_de_Gagny-Tronc-Commun"}, 
        {"num":"991301", "g":1435, "len":0.51, "use":"EXP", "lid":"Raccordement_Gagny-Nord", "sa":"Raccordement_Gagny-Nord"}, 
        {"num":"991302", "g":1435, "len":0.54, "use":"EXP", "lid":"Raccordement_Gagny-Sud", "sa":"Raccordement_Gagny-Sud"}, 
        {"num":"992300", "g":1435, "len":2.15, "use":"EXP", "lid":"Raccordement_du_Bas-Martineau", "sa":"Raccordement_du_Bas-Martineau"}, 
        {"num":"995000", "g":1000, "len":157.43, "use":"EXP", "lid":"Ligne_de_Bastia_à_Ajaccio_(ligne_centrale)", "sa":"Ligne_Bastia_-_Ajaccio"}, 
        {"num":"996000", "g":1000, "pk0":46.57, "pkf":119.92, "len":73.35, "use":"EXP", "lid":"Ligne_de_Ponte-Leccia_à_Calvi_(ligne_de_la_Balagne)", "sa":"Ligne_Ponte-Leccia_-_Calvi"}, 
        {"num":"997000", "g":1000, "pk0":21.02, "pkf":31.9, "len":10.88, "use":"FD", "end":"1953", "lid":"Ligne_de_la_côte_orientale_corse", "sa":"Ligne_Casamozza_-_Folelli-Orezza", "af":[596]}, 
        {"num":"997500", "g":1000, "pk0":32, "pkf":150.9, "len":118.9, "use":"FD", "end":"1943", "lid":"Ligne_de_la_côte_orientale_corse", "sa":"Ligne_Casamozza_-_Porto-Vecchio", "af":[596]}
    ];
    const lineSec = [
        {"num":"_01CGTE","g":1000,"len":1,"use":"FD","end":"1938","lid":"CGT_Ferney_Genève","elect":1,"af":[870]},
        {"num":"_01HR1","g":1435,"len":44,"use":"FD","end":"1944","lid":"HR_Brégnier-Cordon_La-Balme","af":[788]},
        {"num":"_01TA1","g":1000,"len":49,"use":"FD","end":"1937","lid":"TA_Ambérieu_Ars-Ville","af":[906]},
        {"num":"_01TA2","g":1000,"len":49,"use":"FD","end":"1951","lid":"Tramways_de_l'Ain#Ambérieu_Nantua","af":[877]},
        {"num":"_01TA3","g":1000,"len":4,"use":"FD","end":"1951","lid":"TA_Pont-de-Préau_Cerdon"},
        {"num":"_01TA4","g":1000,"len":20,"use":"FD","end":"1937","lid":"Tramways_de_l'Ain#Bellegarde-PLM_Chézery","af":[873]},
        {"num":"_01TA5","g":1000,"len":76,"use":"FD","end":"1938","lid":"TA_Bourg_Saint-Laurent-lès-Mâcon","af":[912]},
        {"num":"_01TA6","g":1000,"pk0":2,"pkf":54,"len":52,"use":"FD","end":"1937","lid":"TA_Bourg_Villefranche-sur-Saône","af":[908]},
        {"num":"_01TA7","g":1000,"len":10,"use":"FD","end":"1932","lid":"Tramways_de_l'Ain#Ferney_Gex","elect":1,"af":[869]},
        {"num":"_01TA8","g":1000,"len":11,"use":"FD","end":"1934","lid":"TA_Marlieux_Châtillon-sur-Chalaronne","af":[909]},
        {"num":"_01TA9","g":1000,"len":8,"use":"FD","end":"1949","lid":"TA_Pont-d’Ain_Jujurieux","af":[907]},
        {"num":"_01TAa","g":1000,"len":5,"use":"FD","end":"1936","lid":"PVF_Pont-de-Vaux_Fleurville","af":[914]},
        {"num":"_01TAb","g":1000,"len":29,"use":"FD","end":"1938","lid":"TA_Saint-Trivier-de-Courtes_Cuiseaux","af":[915]},
        {"num":"_01TAc","g":1000,"len":79,"use":"FD","end":"1936","lid":"TA_Trévoux_Saint-Trivier-de-Courtes","af":[913]},
        {"num":"_01TAd","g":1000,"len":23,"use":"FD","end":"1933","lid":"Tramways_de_l'Ain#Virieu_Ruffieu","af":[874]},
        {"num":"_02CDA1","g":1000,"len":6,"use":"FD","end":"1928","lid":"Compagnie_des_chemins_de_fer_départementaux_de_l'Aisne#Appilly_Camelin","af":[1098]},
        {"num":"_02CDA2","g":1000,"len":18,"use":"FD","end":"1948","lid":"Compagnie_des_chemins_de_fer_départementaux_de_l'Aisne#Chauny_Camelin","af":[1097]},
        {"num":"_02CDA3","g":1435,"len":13,"use":"FD","end":"1963","lid":"Compagnie_des_chemins_de_fer_départementaux_de_l'Aisne#Camelin_Coucy-le-Château","af":[1097]},
        {"num":"_02CDA4","g":1000,"len":14,"use":"FD","end":"1932","lid":"Tramway_de_Laon_à_Nouvion-le-Vineux","af":[1106]},
        {"num":"_02CDA5","g":1000,"len":28,"use":"FD","end":"1948","lid":"Compagnie_des_chemins_de_fer_départementaux_de_l'Aisne#Soissons_Guny","af":[1096]},
        {"num":"_02CDA6","g":1000,"len":31,"use":"FD","end":"1948","lid":"Compagnie_des_chemins_de_fer_départementaux_de_l'Aisne#Soissons_Oulchy-Brény","af":[1092]},
        {"num":"_02CDA7","g":1435,"len":20,"use":"FD","end":"1948","lid":"Compagnie_des_chemins_de_fer_départementaux_de_l'Aisne#Vic-sur-Aisne_Montécouvé","af":[1095]},
        {"num":"_02CDA8","g":1435,"len":56,"use":"FD","end":"1955","lid":"Ligne_de_Romery_à_Liart","af":[1048]},
        {"num":"_02NE1","g":1435,"len":21,"use":"FD","end":"1959","lid":"Ligne_de_Marle_à_Montcornet","af":[1108]},
        {"num":"_02NE2","g":1000,"len":18,"use":"FD","end":"1940","elect":1,"lid":"Tramway_de_Tergnier_à_Anizy_-_Pinon","af":[1101,1102]},
        {"num":"_02CSG","g":1435,"len":15,"use":"FD","end":"1994","lid":"Ligne_de_Chauny_à_Saint-Gobain","af":[1099]},
        {"num":"_02CLF","g":1435,"len":22,"use":"FD","end":"1959","lid":"Ligne_de_Dercy-Mortiers_à_Versigny","af":[1107]},
        {"num":"_02CSA1","g":1000,"len":36,"use":"FD","end":"1946","lid":"Compagnie_des_chemins_de_fer_du_Sud_de_l'Aisne#Château-Thierry_Mareuil-sur-Ourcq","af":[1088]},
        {"num":"_02CSA2","g":1000,"len":28,"use":"FD","end":"1938","lid":"#Essômes-sur-Marne_Verdelot","af":[990]},
        {"num":"_02CSA3","g":1000,"len":19,"use":"FD","end":"1961","lid":"Compagnie_des_chemins_de_fer_du_Sud_de_l'Aisne#Gandelu_Neuilly-Saint-Front","af":[1089]},
        {"num":"_02RTA1","g":1000,"len":28.3,"use":"FD","end":"1990","lid":"Ligne_de_Saint-Quentin_à_Ham","af":[1115]},
        {"num":"_02RTA2","g":1435,"len":47,"use":"FD","end":"1992","lid":"Chemin_de_fer_de_Vélu-Bertincourt_à_Saint-Quentin","af":[1382]},
        {"num":"_02NF1","g":1000,"len":40,"use":"FD","end":"1951","lid":"Chemin_de_fer_de_Guise_au_Catelet","af":[1113]},
        {"num":"_02NF2","g":1000,"len":7,"use":"FD","end":"1932","lid":"Chemin_de_fer_de_Roisel_à_Hargicourt","af":[1116]},
        {"num":"_02NF3","g":"1435","pk0":7,"pkf":12,"len":5,"use":"FD","end":"??","lid":"#14-18_Roisel Bellicourt","af":[1114]},
        {"num":"_02MT","g":1435,"len":17,"use":"FD","end":"1963","lid":"Ligne_de_Mézières-sur-Oise_à_La_Fère","af":[1103]},
        {"num":"_02SQG","g":1435,"pk0":0.3,"pkf":18,"len":17.7,"use":"FD","end":"1958","lid":"Ligne_de_Ribemont_à_La_Ferté-Chevresis","af":[1105]},
        {"num":"_02mili","g":1435,"len":11,"use":"FD","end":"1919","lid":"#14-18_Sains_Saint-Gobert","af":[1112],"info":" Chevennes, Marfontaine - TODO - "},
        {"num":"_03MC","g":1000,"len":16,"use":"FD","end":"1915-1943","lid":"Chemin_de_fer_de_Commentry_à_Montluçon","af":[1197]},
        {"num":"_03MC2","g":1000,"len":9,"use":"FD","end":"1915","lid":"Chemin_de_fer_de_Commentry_à_Montluçon#branche_Montvicq","af":[1197]},
        {"num":"_03SÉ1","g":1000,"len":23,"use":"FD","end":"1939","lid":"Réseau_de_l'Allier#Chantelle_Ebreuil","af":[656]},
        {"num":"_03SÉ2","g":1000,"len":44,"use":"FD","end":"1939","lid":"Chemin_de_fer_de_Dompierre_à_Lapalisse","af":[660]},
        {"num":"_03SÉ3","g":1000,"len":22,"use":"FD","end":"1950","lid":"Réseau_de_l'Allier#Lapalisse_Mayet-de-Montagne","af":[661]},
        {"num":"_03SÉ4","g":1000,"len":57,"use":"FD","end":"1950","lid":"Réseau_de_l'Allier#Moulins_Cosne-d'Allier","af":[653]},
        {"num":"_03SÉ5","g":1000,"len":88,"use":"FD","end":"1951","lid":"Réseau_de_l'Allier#Sancoins_Lapeyrouse","af":[579]},
        {"num":"_03SÉ6","g":1000,"len":60,"use":"FD","end":"1939","lid":"Réseau_de_l'Allier#Varennes_Digoin","af":[658]},
        {"num":"_03SÉ7","g":1000,"len":103,"use":"FD","end":"1939","lid":"Réseau_de_l'Allier#Varennes_Marcillat","af":[73]},
        {"num":"_04CP1","g":1000,"pk0":0.2,"pkf":150.05,"len":149.85,"use":"EXP","lid":"Ligne_de_Nice_à_Digne"},
        {"num":"_06Sud","g":1000,"len":1,"use":"FD","end":"1991","lid":"#Sud_Raccordement_Nice-Ville"},
        {"num":"_06TAM1","g":1000,"len":28,"use":"FD","end":"1932","lid":"Tramways_des_Alpes-Maritimes#Grasse-PLM_Cagnes","elect":1,"af":[736]},
        {"num":"_06TAM2","g":1000,"len":3,"use":"FD","end":"1931","lid":"Tramways_des_Alpes-Maritimes#Pré-du-Lac_Bar-sur-Loup","elect":1,"af":[736]},
        {"num":"_06TAM3","g":1000,"len":27,"use":"FD","end":"1931","lid":"Tramways_des_Alpes-Maritimes#Tinée_Saint-Sauveur-sur-Tinée","elect":1,"af":[722]},
        {"num":"_06TAM4","g":1000,"len":34,"use":"FD","end":"1929","lid":"Tramways_des_Alpes-Maritimes#Plan-du-Var_Saint-Martin-Vésubie","elect":1,"af":[730]},
        {"num":"_06TAM5","g":1000,"len":29,"use":"FD","end":"1929","lid":"Tramways_des_Alpes-Maritimes#Pont-Charles-Albert_Roquestéron","af":[729]},
        {"num":"_06TAM6","g":1000,"len":19,"use":"FD","end":"1929","lid":"Tramways_des_Alpes-Maritimes#Pont-de-Gueydan_Guillaumes","af":[724]},
        {"num":"_06TAM7","g":1000,"len":9,"use":"FD","end":"1932","lid":"Tramways_des_Alpes-Maritimes#Villeneuve_Vence","af":[735]},
        {"num":"_06TC1","g":1000,"len":18,"use":"FD","end":"1930","lid":"Tramway_de_Cannes#Antibes_Mandelieu","af":[740],"elect":1},
        {"num":"_06TC2","g":1000,"len":3,"use":"FD","end":"1933","lid":"Tramway_de_Cannes#Le-Cannet","af":[740],"elect":1},
        {"num":"_06TC3","g":1000,"len":3,"use":"FD","end":"1930","lid":"Tramway_de_Cannes#Vallauris","af":[740],"elect":1},
        {"num":"_06TCA","g":1000,"len":17,"use":"FD","end":"1926","lid":"Compagnie_des_tramways_électriques_de_la_Côte_d'Azur#Cannes_Grasse","elect":1,"af":[737]},
        {"num":"_06TNL1","g":1000,"len":17,"use":"FD","end":"1931","lid":"Tramway_de_Menton_à_Sospel","af":[731]},
        {"num":"_06TNL2","g":1000,"len":22,"use":"FD","end":"1950","lid":"Tramway_de_Nice_et_du_Littoral#Nice-Masséna_Bendejun","af":[741]},
        {"num":"_06TNL3","g":1000,"len":27,"use":"FD","end":"1931","lid":"Tramway_de_Nice_et_du_Littoral#Nice-Masséna_Levens","af":[734]},
        {"num":"_06TNL4","g":1000,"len":7,"use":"FD","end":"1947","lid":"Tramway_de_Nice_et_du_Littoral#Pont-de-Peille_La-Grave-de-Peille","af":[742]},
        {"num":"_06TNL5","g":1000,"len":2,"use":"FD","end":"1931","lid":"Tramway_de_Nice_et_du_Littoral#Pont-Saint-Jean_Saint-Jean-Cap-Ferrat","af":[733]},
        {"num":"_06TNL6","g":1000,"len":30,"use":"FD","end":"1931","lid":"Tramway_de_Nice_et_du_Littoral#Nice_Menton","elect":1,"af":[732]},
        {"num":"_06TNL7","g":1000,"len":26,"use":"FD","end":"1930","lid":"Tramway_de_Nice_et_du_Littoral#Nice_Cap-d'Antibes","elect":1,"af":[739]},
        {"num":"_07SATE","g":1000,"len":9,"use":"FD","end":"1932","lid":"Tramway_de_Vals-les-Bains_à_Aubenas","elect":1,"af":[680]},
        {"num":"_07CFD1","g":1000,"len":47,"use":"FD","end":"1968","lid":"#Réseau_du_Vivarais#La-Voulte-sur-Rhône_Le-Cheylard","af":[672]},
        {"num":"_07CFD2","g":1000,"len":53,"use":"FD","end":"1968","lid":"#Réseau_du_Vivarais#Tournon_Le-Cheylard","af":[671]},
        {"num":"_07TA2","g":1000,"len":38,"use":"FD","end":"1929","lid":"Tramways_de_l'Ardèche#Ligne2:Le-Pouzin_Aubenas","af":[677]},
        {"num":"_07TA3","g":1000,"len":13.4,"use":"FD","end":"1926","lid":"Tramways_de_l'Ardèche#Ligne3:Aubenas_Uzer","af":[677]},
        {"num":"_07TA4","g":1000,"len":37,"use":"FD","end":"1929","lid":"Tramways_de_l'Ardèche#Lignes4-5:Uzer_Saint-Paul-le-Jeune","af":[677]},
        {"num":"_07TA6","g":1000,"len":4.5,"use":"FD","end":"1914","lid":"Tramways_de_l'Ardèche#Lignes6:Croisette-d'Uzer_Largentière","af":[678]},
        {"num":"_07TA7","g":1000,"len":9.5,"use":"FD","end":"1914","lid":"Tramways_de_l'Ardèche#Lignes6:Ruoms_Vallon-Pont-d'Arc","af":[679]},
        {"num":"_07TA8","g":1000,"len":31,"use":"FD","end":"1929","lid":"Tramways_de_l'Ardèche#Ligne8:Saint-Péray-PLM_Vernoux","af":[674]},
        {"num":"_07VSP","g":1000,"len":6,"use":"FD","end":"1950","lid":"Tramway_de_Valence_à_Saint-Péray","elect":1,"af":[681]},
        {"num":"_08CFD1","g":1000,"pk0":2,"pkf":22,"len":20,"use":"FD","end":"1950","lid":"Voie_ferrée_Monthermé-Hautes-Rivières","af":[1039]},
        {"num":"_08CFD2","g":1000,"len":14,"use":"FD","end":"1950","lid":"Chemins_de_fer_départementaux_des_Ardennes#Tremblois_Petite-Chapelle","af":[1044]},
        {"num":"_08CFD3","g":1000,"len":11,"use":"FD","end":"1950","lid":"Chemins_de_fer_départementaux_des_Ardennes#Nouzon_Corbion","af":[1038]},
        {"num":"_08CFD4","g":1000,"len":20,"use":"FD","end":"1933","lid":"Chemins_de_fer_départementaux_des_Ardennes#Sedan_Corbion","af":[1037],"info":" + SNCV belge Corbion Palisseul "},
        {"num":"_08CFD5","g":1000,"len":44,"use":"FD","end":"1957","lid":"Chemins_de_fer_départementaux_des_Ardennes#Asfeld_Montcornet","af":[1026]},
        {"num":"_08CFD6","g":1000,"len":18,"use":"FD","end":"1957","lid":"Chemins_de_fer_départementaux_des_Ardennes#Saint-Erme_Dizy-le-Gros","af":[1028]},
        {"num":"_08CFD7","g":1000,"len":25,"use":"FD","end":"1948","lid":"Chemins_de_fer_départementaux_des_Ardennes#Wasigny_Renneville","af":[1027]},
        {"num":"_08CFD8","g":1000,"len":37,"use":"FD","end":"1948","lid":"Chemins_de_fer_départementaux_des_Ardennes#Mézières_Wasigny","af":[1035]},
        {"num":"_08CFD9","g":1000,"len":18,"use":"FD","end":"1933","lid":"Chemins_de_fer_départementaux_des_Ardennes#Baâlons_Attigny","af":[1031]},
        {"num":"_08CFD10","g":1000,"len":40,"use":"FD","end":"1933","lid":"Chemins_de_fer_départementaux_des_Ardennes#Châtillon-sur-Bar_Poix","af":[1030]},
        {"num":"_08CFD11","g":1000,"len":66,"use":"FD","end":"1933","lid":"Chemins_de_fer_départementaux_des_Ardennes#Le_Châtelet_Buzancy","af":[1029]},
        {"num":"_08CFD12","g":1000,"len":15,"use":"FD","end":"1933","lid":"Chemins_de_fer_départementaux_des_Ardennes#Vendresse_Raucourt","af":[1032]},
        {"num":"_08CFM","g":1435,"len":6,"use":"FD","end":"1980","lid":"Compagnie_française_des_métaux#Givet-Flohimont","af":[1388]},
        {"num":"_08SÉ1","g":1435,"len":19,"use":"FD","end":"1937","lid":"Société_générale_des_chemins_de_fer_économiques_(France)#Aubréville_Apremont-sur-Aire","af":[1050]},
        {"num":"_09TEA01","g":1000,"len":15,"use":"FD","end":"1933","lid":"TEA_Oust_Aulus","af":[392]},
        {"num":"_09TEA02","g":1000,"len":23,"use":"FD","end":"1937","lid":"TEA_Saint-Girons_Sentein","elect":1,"af":[267]},
        {"num":"_09TTAA","g":1000,"len":16,"use":"FD","end":"1932","lid":"TTA_Tarascon-sur-Ariège_Auzat","af":[266]},
        {"num":"_10CFD1","g":1000,"len":35.7,"use":"FD","end":"1952","lid":"Ligne_de_Polisot_aux_Riceys_et_à_Cunfin","af":[1003]},
        {"num":"_11TVA1","g":1000,"len":11,"use":"FD","end":"1932","lid":"Tramways_de_l'Aude#Bram_Fanjeaux","af":[613]},
        {"num":"_11TVA2","g":1000,"len":28,"use":"FD","end":"1932","lid":"Tramways_de_l'Aude#Bram_Saint-Denis","af":[614]},
        {"num":"_11TVA3","g":1000,"len":66,"use":"FD","end":"1933","lid":"Tramways_de_l'Aude#Carcassonne_Lézignan-Corbières","af":[617]},
        {"num":"_11TVA4","g":1000,"len":13,"use":"FD","end":"1933","lid":"Tramways_de_l'Aude#Carrefour-de-Bezons_Lastours","af":[618]},
        {"num":"_11TVA5","g":1000,"len":41,"use":"FD","end":"1932","lid":"Tramways_de_l'Aude#Castelnaudary_Belpech","af":[612]},
        {"num":"_11TVA6","g":1000,"len":15,"use":"FD","end":"1932","lid":"Tramways_de_l'Aude#Fabrezan_Saint-Pierre-des-Champs","af":[620]},
        {"num":"_11TVA7","g":1000,"len":30,"use":"FD","end":"1932","lid":"Tramways_de_l'Aude#Les-Palais_Mouthoumet","af":[621]},
        {"num":"_11TVA8","g":1000,"len":52,"use":"FD","end":"1932","lid":"Tramways_de_l'Aude#Lézignan-Corbières_Port-la-Nouvelle","af":[619]},
        {"num":"_11TVA9","g":1000,"len":16,"use":"FD","end":"1932","lid":"Tramways_de_l'Aude#Narbonne_Fleury","af":[624]},
        {"num":"_11TVA10","g":1000,"len":14,"use":"FD","end":"1932","lid":"Tramways_de_l'Aude#Narbonne_Ouveillan","af":[625]},
        {"num":"_11TVA11","g":1000,"len":26,"use":"FD","end":"1932","lid":"Tramways_de_l'Aude#Narbonne_Thézan","af":[623]},
        {"num":"_11TVA12","g":1000,"len":24,"use":"FD","end":"1932","lid":"Tramways_de_l'Aude#Ripaud_Tuchan","af":[622]},
        {"num":"_12TTL","g":1435,"lid":"Train_touristique_du_Larzac","info":" --- TODO --- Sainte-Eulalie-de-Cernon - La Bastide-Pradines "},
        {"num":"_13BdR1","g":1435,"len":46,"use":"FD","end":"1977","lid":"Ligne_d'Arles_à_Salon-de-Provence","if":"13/13065.a.pdf","af":[701]},
        {"num":"_13BdR2","g":1435,"len":48.8,"use":"FD","end":"1950","lid":"Ligne_d'Eyguières_à_Meyrargues","af":[703]},
        {"num":"_13BdR3","g":1435,"len":19,"use":"EXP","lid":"Régie_départementale_des_transports_des_Bouches-du-Rhône#Pas-des-Lanciers_Martigues","af":[711]},
        {"num":"_13BdR4","g":1000,"len":30,"use":"FD","end":"1948","lid":"Compagnie_des_tramways_électriques_des_Bouches-du-Rhône#Aix_Marseille","elect":1,"af":[707]},
        {"num":"_13BdR5","g":1435,"len":28,"use":"FD","end":"1950","lid":"Ligne_de_Barbentane_à_Orgon","af":[699]},
        {"num":"_13BdR6","g":1000,"len":30,"use":"FD","end":"1990","lid":"Ligne_de_Tarascon_à_Orgon","af":[700]},
        {"num":"_13BdR8","g":1435,"len":5,"use":"FD","end":"1990","lid":"Ligne_de_La_Ciotat-gare_à_La_Ciotat-ville","elect":1,"af":[712]},
        {"num":"_13CFC3","g":1000,"len":38,"use":"FD","end":"1953","lid":"Chemins_de_fer_de_Camargue#Arles-Trinquetaille_Salin-de-Giraud","elect":1,"af":[676]},
        {"num":"_13CFC4","g":1000,"pk0":4,"pkf":38,"len":34,"use":"FD","end":"1953","lid":"Chemins_de_fer_de_Camargue#Arles-Trinquetaille_Saintes-Maries-de-la-Mer","elect":1,"af":[675]},
        {"num":"_13CGFT1","g":1435,"len":12,"use":"FD","end":"1950","lid":"Ancien_tramway_de_Marseille#Plan-de-Cuques","elect":1,"af":[709]},
        {"num":"_13CGFT2","g":1435,"pk0":7,"pkf":10,"len":3,"use":"FD","end":"1950","lid":"Ancien_tramway_de_Marseille#Allauch","elect":1,"af":[709]},
        {"num":"_13CGFT3","g":1435,"len":19,"use":"FD","end":"1958","lid":"Ancien_tramway_de_Marseille#Aubagne","elect":1,"af":[710]},
        {"num":"_13CGFT4","g":1000,"pk0":8,"pkf":14,"len":6,"use":"FD","end":"1950","lid":"Ancien_tramway_de_Marseille#Les-Camoins","af":[710]},
        {"num":"_14CFTA02","g":1435,"len":4,"use":"FD","end":"1966","lid":"CFTA_embranchement_Fresne-d'Argences","af":[259]},
        {"num":"_14ETAT","g":1435,"pk0":1,"pkf":31,"len":30,"use":"FD","end":"1968","lid":"Ligne_de_Caen_à_la_mer","af":[247]},
        {"num":"_14SMN","g":1435,"len":30,"use":"FD","end":"1989","lid":"SM_Caen_Soumont"},
        {"num":"_15GE","g":1435,"lid":"Gentiane_Express","info":" --- TODO --- Riom-es-Montagne - Lugarde - Marchastel "},
        {"num":"_16CFD1","g":1000,"len":63,"use":"FD","end":"1950","lid":"Le_petit_Rouillac","af":[91],"wf":"Ligne_d'Angoulême_à_Matha"},
        {"num":"_16ÉC1","g":1000,"len":48,"use":"FD","end":"1939","lid":"Le_petit_Mairat#Angoulême_Barbezieux","af":[282]},
        {"num":"_16ÉC2","g":1000,"len":84,"use":"FD","end":"1951","lid":"Le_petit_Mairat#Angoulême_Confolens","af":[92]},
        {"num":"_16ÉC3","g":1000,"pk0":3,"pkf":67,"len":64,"use":"FD","end":"1946","lid":"Le_petit_Mairat#Angoulême_Roumazières","af":[270]},
        {"num":"_16ÉC4","g":1000,"pk0":1,"pkf":44,"len":43,"use":"FD","end":"1939","lid":"Le_petit_Mairat#Barbezieux_Cognac","af":[283]},
        {"num":"_16ÉC5","g":1000,"len":25,"use":"FD","end":"1938","lid":"Le_petit_Mairat#Blanzac_Villebois","af":[286]},
        {"num":"_16ÉC6","g":1000,"len":32,"use":"FD","end":"1939","lid":"Le_petit_Mairat#Chalais_Barbezieux","af":[285]},
        {"num":"_16ÉC7","g":1000,"len":70,"use":"FD","end":"1939","lid":"Le_petit_Mairat#Ségonzac_Saint-Angeau","af":[284]},
        {"num":"_17carr","g":1000,"len":4,"use":"FD","end":"1940","lid":"#carrières_Jarculet","af":[1355],"info":"https://www.pop.culture.gouv.fr/notice/merimee/IA17000431"},
        {"num":"_17CFD1","g":1000,"len":46,"use":"FD","end":"1950","lid":"#Saint-Jean-d'Angély_Cognac","af":[90]},
        {"num":"_17CFD2","g":1000,"len":67,"use":"FD","end":"1950","lid":"#Saint-Jean-d'Angély_Marans","af":[271]},
        {"num":"_17CFD3","g":1000,"len":21,"use":"FD","end":"1950","lid":"#Saintes-Etat_Burie","af":[302]},
        {"num":"_17ÉC1","g":1000,"len":21,"use":"FD","end":"1939","lid":"#Archiac_Jonzac-Echange","af":[287]},
        {"num":"_17ÉC2","g":1000,"len":22,"use":"FD","end":"1938","lid":"#Archiac_Pons","af":[288]},
        {"num":"_17ÉC3","g":1000,"pk0":22,"pkf":67,"len":45,"use":"FD","end":"1934","lid":"#Pons_Saint-Ciers-sur-Gironde","af":[288]},
        {"num":"_17ÉC4","g":1000,"len":57,"use":"FD","end":"1934","lid":"#Mirambeau-Bifurcation_Saint-Aigulin","af":[292]},
        {"num":"_17ÉC5","g":1000,"len":36,"use":"FD","end":"1947","lid":"#Sablanceaux_Les-Portes","af":[213]},
        {"num":"_17ÉC6","g":1000,"len":5,"use":"FD","end":"1925","lid":"#Saint-Fort_Port-Maubert","af":[290]},
        {"num":"_17ÉC7","g":1000,"len":40.6,"use":"FD","end":"1947","lid":"#Saintes-Etat_Saint-Fort-sur-Gironde","af":[291]},
        {"num":"_17ÉC8","g":1000,"pk0":40.6,"pkf":67,"len":26.4,"use":"FD","end":"1938","lid":"#Saint-Fort-sur-Gironde_Jonzac-Echange","af":[291]},
        {"num":"_17ÉC9","g":1000,"len":5,"use":"FD","end":"1947","lid":"#Touvent_Mortagne-Port","af":[291]},
        {"num":"_17ÉC10","g":1000,"len":13,"use":"FD","end":"1925","lid":"#Saint-Porchaire_Taillebourg-Etat","af":[293]},
        {"num":"_17ÉC11","g":1000,"pk0":3.5,"pkf":29,"len":25.5,"use":"FD","end":"1934","lid":"#Saintes_Pont-l'Abbé-d'Arnoult","af":[275]},
        {"num":"_17ÉC12","g":1000,"pk0":29,"pkf":49,"len":20,"use":"FD","end":"1932","lid":"#Pont-l'Abbé-d'Arnoult_Marennes-Etat","af":[275]},
        {"num":"_17ÉC13","g":1000,"pk0":49,"pkf":54,"len":5,"use":"FD","end":"1925","lid":"#Marennes-Etat_La-Cayenne-de-Seudre","af":[275]},
        {"num":"_17ÉC14","g":1000,"pk0":49,"pkf":67,"len":18,"use":"FD","end":"1932","lid":"#Saujon-Etat_Saint-Just-Luzac","af":[295]},
        {"num":"_17ÉC15","g":1000,"len":37,"use":"FD","end":"1937","lid":"#Saint-Trojan_Saint-Denis","af":[221]},
        {"num":"_17ÉC16","g":1000,"pk0":25,"pkf":30,"len":5,"use":"FD","end":"1935","lid":"#Sauzelle_Boyardville","af":[294]},
        {"num":"_17TLR","g":1000,"len":9,"use":"FD","end":"1929","lid":"Tramway_de_La_Rochelle","af":[1349]},
        {"num":"_18SÉ1","g":1000,"len":55,"use":"FD","end":"1951","lid":"Réseau_du_Cher#Bourges_Laugère","af":[572]},
        {"num":"_18SÉ2","g":1000,"len":88,"use":"FD","end":"1951","lid":"Réseau_du_Cher#La_Guerche-sur-Aubois_Châteaumeillant","af":[571]},
        {"num":"_18SÉ3","g":1000,"pk0":17,"pkf":56,"len":39,"use":"FD","end":"1948","lid":"Réseau_du_Cher#Marseilles-lès-Aubigny_Veaugues","af":[575]},
        {"num":"_18SÉ4","g":1000,"len":51,"use":"FD","end":"1951","lid":"Réseau_du_Cher#Marçais_Saint-Florent","af":[570]},
        {"num":"_18SÉ5","g":1000,"len":16,"use":"FD","end":"1948","lid":"Réseau_du_Cher#Neuilly-Moulin-Jamet_Saint-Satur-Canal","af":[577]},
        {"num":"_18SÉ6","g":1000,"len":49,"use":"FD","end":"1948","lid":"Réseau_du_Cher#Veaugues_Argent","af":[576]},
        {"num":"_18SÉ7","g":1000,"len":67,"use":"FD","end":"1939","lid":"Réseau_du_Cher#Vierzon-Saint-Martin_Neuilly-Moulin-Jamet","af":[578]},
        {"num":"_19barr","g":1435,"len":8,"use":"FD","end":"1926","lid":"#barrage-du-Chavanon","if":"hd19/19083.1.pdf","af":[1409]},
        {"num":"_19TC01","lid":"Tramways_de_la_Corrèze#Aubazines_Beaulieu-sur-Dordogne","af":[505]},
        {"num":"_19TC02","lid":"Tramways_de_la_Corrèze#La_Rivière-de-Mansac_Juillac","af":[502]},
        {"num":"_19TC03","lid":"Tramways_de_la_Corrèze#Turenne_Le-Bosplos","af":[506]},
        {"num":"_19TC04","lid":"Tramways_de_la_Corrèze#Ussel_Neuvic","af":[501]},
        {"num":"_19TC05","lid":"Tramways_de_la_Corrèze#Neuvic_Saint-Bonnet-Avalouze","af":[501]},
        {"num":"_19TC06","lid":"Tramways_de_la_Corrèze#Mortier_Roche-Canillac","af":[501]},
        {"num":"_21CDCO1","g":1000,"len":23,"use":"FD","end":"1933","lid":"Chemins_de_fer_départementaux_de_la_Côte-d'Or#Aisey-sur-Seine_Baigneux-les-Juifs","af":[1170]},
        {"num":"_21CDCO2","g":1000,"pk0":2,"pkf":42,"len":40,"use":"FD","end":"1936","lid":"Chemins_de_fer_départementaux_de_la_Côte-d'Or#Beaune_Arnay-le-Duc-PLM","af":[1171]},
        {"num":"_21CDCO3","g":1000,"len":58,"use":"FD","end":"1932","lid":"Chemins_de_fer_départementaux_de_la_Côte-d'Or#Arnay-le-Duc-PLM_Semur","af":[1171]},
        {"num":"_21CDCO4","g":1000,"len":42,"use":"FD","end":"1936","lid":"Chemins_de_fer_départementaux_de_la_Côte-d'Or#Gevrey-TED_Beaune-Gare","af":[1175]},
        {"num":"_21CDCO5","g":1000,"len":7,"use":"FD","end":"1936","lid":"Chemins_de_fer_départementaux_de_la_Côte-d'Or#Meuilley_Nuits-Saint-Georges","af":[1176]},
        {"num":"_21CDCO6","g":1000,"pk0":2,"pkf":107,"len":105,"use":"FD","end":"1948","lid":"Chemins_de_fer_départementaux_de_la_Côte-d'Or#Dijon-Sévigné_Châtillon-sur-Seine","af":[1169]},
        {"num":"_21CDCO7","g":1000,"pk0":2,"pkf":60,"len":58,"use":"FD","end":"1946","lid":"CDCO_Dijon-Porte-Neuve_Champlitte","af":[902]},
        {"num":"_21CDCO8","g":1000,"len":28,"use":"FD","end":"1930","lid":"#Thoisy_Pouilly","af":[1174],"info":"jamais exploitée"},
        {"num":"_21TED","g":1000,"len":17,"use":"FD","end":"1953","lid":"TE_Dijon-Porte-Neuve_Gevrey-Chambertin","elect":1,"af":[1175]},
        {"num":"_22CDN11","g":1000,"len":17,"use":"FD","end":"1939","lid":"CDN_Plouëc_Tréguier","af":[139]},
        {"num":"_22CDN12","g":1000,"pk0":0.7,"pkf":25.6,"len":24.9,"use":"FD","end":"1937","lid":"CDN_Saint-Brieuc_Moncontour","af":[142]},
        {"num":"_22CDN13","g":1000,"pk0":-2,"pkf":30.7,"len":32.7,"use":"FD","end":"1956","lid":"CDN_Saint-Brieuc_Plouha","af":[141]},
        {"num":"_22CDN14","g":1000,"len":25,"use":"FD","end":"1939","lid":"CDN_Plouha_Guingamp","af":[138]},
        {"num":"_22CDN15","g":1000,"pk0":19,"pkf":25,"len":6,"use":"FD","end":"1948","lid":"CDN_Saint-Brieuc_Phare","af":[141]},
        {"num":"_22CDN16","g":1000,"pk0":25.6,"pkf":41.3,"len":15.7,"use":"FD","end":"1937","lid":"CDN_Moncontour_Collinée","af":[142]},
        {"num":"_22CDN17","g":1000,"pk0":0.5,"pkf":17,"len":16.5,"use":"FD","end":"1949","lid":"CDN_Tréguier_Lannion","af":[136]},
        {"num":"_22CDN18","g":1000,"len":12.1,"use":"FD","end":"1949","lid":"CDN_Lannion_Perros-Guirec","af":[135]},
        {"num":"_22CDN19","g":1000,"len":20,"use":"FD","end":"1939","lid":"CDN_Plancoët_Saint-Cast","af":[144]},
        {"num":"_22CDN20","g":1000,"len":45,"use":"FD","end":"1938","lid":"CDN_Quintin_Rostrenen","af":[148]},
        {"num":"_22CDN22","g":1000,"len":12,"use":"FD","end":"1948","lid":"CDN_Lamballe_Saint-Alban","af":[147]},
        {"num":"_22CDN23","g":1000,"len":19,"use":"FD","end":"1956","lid":"CDN_Paimpol_Plouha","af":[140]},
        {"num":"_22CDN24","g":1000,"len":40,"use":"FD","end":"1938","lid":"CDN_Guingamp_Saint-Nicolas-du-Pélem","af":[46]},
        {"num":"_22CDN25","g":1000,"pk0":8,"pkf":59,"len":51,"use":"FD","end":"1949","lid":"CDN_Yffiniac_Matignon","af":[143]},
        {"num":"_22CDN26","g":1000,"pk0":17,"pkf":37,"len":20,"use":"FD","end":"1950","lid":"CDN_Tréguier_Paimpol","af":[137]},
        {"num":"_22CDN26bis","g":1000,"pk0":24,"pkf":28,"len":4,"use":"FD","end":"1950","lid":"CDN_embranchement_Pleubian","af":[1336]},
        {"num":"_22CDN27","g":1000,"pk0":29,"pkf":50.6,"len":21.6,"use":"FD","end":"1937","lid":"CDN_Plémy_Loudéac","af":[57]},
        {"num":"_22CDN28","g":1000,"pk0":41.3,"pkf":88.4,"len":47.1,"use":"FD","end":"1937","lid":"CDN_Collinée_Dinan","af":[146]},
        {"num":"_22CDN29","g":1000,"len":13.2,"use":"FD","end":"1939","lid":"CDN_Saint-Briac_Guildo","af":[145]},
        {"num":"_22RB","g":1435,"len":1,"use":"FD","end":"1969","lid":"Réseau_Breton#Paimpol_Paimpol-Port","af":[1468]},
        {"num":"_23mines","g":1435,"len":1,"use":"FD","end":"1935","lid":"#EP_Puits-Marthe","af":[1410]},
        {"num":"_24CP1","g":1000,"len":23,"use":"FD","end":"1949","lid":"Société_des_chemins_de_fer_du_Périgord#Vergt","af":[475]},
        {"num":"_24CP2","g":1000,"len":52,"use":"FD","end":"1949","lid":"Société_des_chemins_de_fer_du_Périgord#Saint-Pardoux","af":[478]},
        {"num":"_24CP3","g":1000,"len":75,"use":"FD","end":"1949","lid":"Société_des_chemins_de_fer_du_Périgord#Excideuil","af":[479]},
        {"num":"_24TD1","g":1000,"len":54,"use":"FD","end":"1934","lid":"Tramways_de_la_Dordogne#Sarlat_Villefranche","af":[477]},
        {"num":"_24TD2","g":1000,"len":33,"use":"FD","end":"1934","lid":"Tramways_de_la_Dordogne#Thiviers_Saint-Yrieix","af":[480]},
        {"num":"_24TD3","g":1000,"pk0":23,"pkf":56,"len":33,"use":"FD","end":"1949","lid":"Tramways_de_la_Dordogne#Vergt_Bergerac","af":[475]},
        {"num":"_24TD4","g":1000,"pk0":52,"pkf":91,"len":39,"use":"FD","end":"1934","lid":"Tramways_de_la_Dordogne#St-Pardoux_St-Mathieu","af":[478]},
        {"num":"_25CFD1","g":1000,"len":66,"use":"FD","end":"1952","lid":"Chemins_de_fer_du_Doubs#Besançon-Saint-Paul_Entreportes","af":[837]},
        {"num":"_25CFD2","g":1000,"len":56,"use":"FD","end":"1953","lid":"Chemins_de_fer_du_Doubs#Salins_Pontarlier","af":[836]},
        {"num":"_25TVH3","g":1000,"len":14,"use":"FD","end":"1932","lid":"Tramway_de_la_Vallée_d'Hérimoncourt","af":[880]},
        {"num":"_25TVH4","g":1000,"len":6,"use":"FD","end":"1932","lid":"Tramway_de_la_Vallée_d'Hérimoncourt#Mandeure","af":[880]},
        {"num":"_25RFC1","g":1000,"len":43.7,"use":"FD","end":"1952","lid":"Chemin_de_fer_Morteau_-_Trévillers","af":[845]},
        {"num":"_25CFD3","g":1000,"len":43,"use":"FD","end":"1950","lid":"Ligne_de_tramway_Pontarlier_-_Foncine-le-Haut","af":[834]},
        {"num":"_26CFD1","g":1000,"len":40,"use":"FD","end":"1932","lid":"Chemins_de_fer_de_la_Drôme#Bourg-de-Péage_Pont-en-Royans","af":[692]},
        {"num":"_26CFD2","g":1000,"len":11,"use":"FD","end":"1932","lid":"Chemin_de_fer_Taulignan-Grignan-Chamaret","af":[687]},
        {"num":"_26CFD3","g":1000,"len":9,"use":"FD","end":"1933","lid":"Chemins_de_fer_de_la_Drôme#Clérieux_Saint-Donat","af":[694]},
        {"num":"_26CFD4","g":1000,"len":27,"use":"FD","end":"1934","lid":"Chemins_de_fer_de_la_Drôme#Malissard_Crest","af":[690]},
        {"num":"_26CFD5","g":1000,"len":29,"use":"FD","end":"1936","lid":"Chemins_de_fer_de_la_Drôme#Montélimar-PLM_Dieulefit","af":[688]},
        {"num":"_26CFD6","g":1000,"len":8,"use":"FD","end":"1931","lid":"Chemins_de_fer_de_la_Drôme#Pont-de-Quart_Châtillon-en-Diois","af":[696]},
        {"num":"_26CFD7","g":1000,"len":36,"use":"FD","end":"1931","lid":"Chemins_de_fer_de_la_Drôme#Saint-Vallier_Grand-Serre-Saint-Clair","af":[695]},
        {"num":"_26CFD8","g":1000,"len":20,"use":"FD","end":"1933","lid":"Chemins_de_fer_de_la_Drôme#Tain-l'Hermitage_Bourg-de-Péage","af":[691]},
        {"num":"_26CFD9","g":1000,"len":33,"use":"FD","end":"1934","lid":"Chemins_de_fer_de_la_Drôme#Valence-PLM_Bourg-de-Péage","af":[689]},
        {"num":"_27CGM1","g":1000,"len":27,"use":"FD","end":"1946","lid":"CGM_Bernay_Cormeilles","af":[263]},
        {"num":"_27CGM2","g":1000,"len":30,"use":"FD","end":"1946","lid":"CGM_Glos-Montfort_Cormeilles","af":[262]},
        {"num":"_27CGM3","g":1000,"len":17,"use":"FD","end":"1933","lid":"CGM_Pont-l'Evêque_Cormeilles","af":[256]},
        {"num":"_28TEL1","g":1000,"len":45,"use":"FD","end":"1935","lid":"Tramways_d'Eure-et-Loir#Chartres_Angerville","af":[561]},
        {"num":"_28TEL2","g":1000,"len":41,"use":"FD","end":"1933","lid":"Tramways_d'Eure-et-Loir#Dreux_Senonches","af":[558]},
        {"num":"_28TEL3","g":1000,"len":33,"use":"FD","end":"1932","lid":"Tramways_d'Eure-et-Loir#Lèves_Bonneval","af":[559]},
        {"num":"_28TEL4","g":1000,"len":55,"use":"FD","end":"1933","lid":"Tramways_d'Eure-et-Loir#Perruchet_Nogent-le-Rotrou","af":[545]},
        {"num":"_28TEL5","g":1000,"len":26,"use":"FD","end":"1936","lid":"Tramways_d'Eure-et-Loir#Saint-Sauveur_La-Loupe","af":[557]},
        {"num":"_28TEL6","g":1000,"len":6,"use":"FD","end":"1935","lid":"Tramways_d'Eure-et-Loir#Sours_Prunay-le-Gillon","af":[562]},
        {"num":"_29CFDF26","g":1000,"len":39.1,"use":"FD","end":"1936","lid":"CFDF_Quimperlé_Concarneau","af":[47]},
        {"num":"_29CFDF27","g":1000,"len":19.7,"use":"FD","end":"1946","lid":"CFDF_Douarnenez_Audierne","af":[13]},
        {"num":"_29CFDF28","g":1000,"len":35,"use":"FD","end":"1935","lid":"CFDF_Pont-l'Abbé_Pont-Croix","af":[14]},
        {"num":"_29CFDF21","g":1000,"pk0":6.2,"pkf":42.1,"len":35.9,"use":"FD","end":"1932","lid":"CFDF_Le-Rufa_Porspoder","af":[40]},
        {"num":"_29CFDF12","g":1000,"pk0":17.5,"pkf":35.5,"len":18,"use":"FD","end":"1932","lid":"CFDF_Plabennec_L'Aber-Wrac'h","af":[34]},
        {"num":"_29CFDF23","g":1000,"len":30.6,"use":"FD","end":"1935","lid":"CFDF_Brest_Lesneven","af":[36]},
        {"num":"_29CFDF24","g":1000,"len":29.2,"use":"FD","end":"1946","lid":"CFDF_Landerneau_Brignogan","af":[39,110]},
        {"num":"_29CFDF25","g":1000,"len":29.1,"use":"FD","end":"1946","lid":"CFDF_Plouider_Saint-Pol-de-Léon","af":[36]},
        {"num":"_29CFA1","g":1000,"len":136.3,"use":"FD","end":"1934","lid":"Chemins_de_fer_armoricains#Plouescat_Rosporden","af":[16]},
        {"num":"_29CFA2","g":1000,"len":48,"use":"FD","end":"1937","lid":"Chemins_de_fer_armoricains#Morlaix_Lannion","af":[111]},
        {"num":"_29CFA3","g":1000,"len":12,"use":"FD","end":"1934","lid":"Chemins_de_fer_armoricains#Morlaix_Primel-Trégastel","af":[1337]},
        {"num":"_29mili","g":1000,"len":15,"use":"FD","end":"1945","lid":"#ligne_allemande1942_Saint-Renan_Trébabu","af":[1354]},
        {"num":"_29TEB","g":1000,"len":10,"use":"FD","end":"1944","lid":"Ancien_tramway_de_Brest","elect":1,"af":[1347]},
        {"num":"_29TEF","g":1000,"len":23,"use":"FD","end":"1932","lid":"Tramway_de_Brest_au_Conquet","elect":1,"af":[121]},
        {"num":"_29VPM","g":1435,"len":8.6,"use":"N","lid":"Port_militaire_de_Brest","af":[1456]},
        {"num":"_30CFC1","g":1000,"len":15,"use":"FD","end":"1949","lid":"Chemins_de_fer_de_Camargue#Bouillargues_Saint-Gilles","elect":1,"af":[646]},
        {"num":"_30CFC2","g":1000,"len":29.5,"use":"FD","end":"1951","lid":"Chemins_de_fer_de_Camargue#Nîmes-PLM_Arles-Trinquetaille","elect":1,"af":[645]},
        {"num":"_30PLM","g":1435,"len":3,"use":"FD","end":"1961","lid":"PLM_Chamborigaud_La-Vernarède","sa":"Ligne_Chamborigaud_-_Bessèges","af":[648,649]},
        {"num":"_31CFSO1","g":1000,"len":97.5,"use":"FD","end":"1950","lid":"Ligne_de_Toulouse_à_Boulogne-sur-Gesse","af":[328,368]},
        {"num":"_31CFSO2","g":1000,"pk0":19.8,"pkf":27,"len":7.2,"use":"FD","end":"1950","lid":"Ligne_de_Toulouse_à_Boulogne-sur-Gesse#branche_Sainte-Foy","af":[328]},
        {"num":"_31CFSO3","g":1000,"len":47.7,"use":"FD","end":"1950","lid":"Ligne_de_Toulouse_à_Cadours","af":[384]},
        {"num":"_31CFSO4","g":1000,"pk0":11.1,"pkf":27,"len":15.9,"use":"FD","end":"1946","lid":"Ligne_de_Toulouse_à_Cadours#Lévignac","af":[381]},
        {"num":"_31CFSO5","g":1000,"pk0":2.4,"pkf":76,"len":73.6,"use":"FD","end":"1938","lid":"Ligne_de_Toulouse-Roguet_à_Sabarat","af":[385]},
        {"num":"_31CFSO6","g":1000,"len":36,"use":"FD","end":"1938","lid":"Ligne_de_Carbonne_au_Mas-d'Azil","af":[382]},
        {"num":"_31CFSO7","g":1000,"len":53,"use":"FD","end":"1947","lid":"Ligne_de_Toulouse_à_Revel","af":[327]},
        {"num":"_31CFSO8","g":1000,"len":9,"use":"FD","end":"1939","lid":"CFSO_Caraman_Maurens-Scopont","af":[326]},
        {"num":"_31CFSO9","g":1000,"len":45,"use":"FD","end":"1937","lid":"CFSO_Toulouse-Pont-Matabiau_Villemur","af":[378]},
        {"num":"_31CFSO10","g":1000,"len":21,"use":"FD","end":"1936","lid":"Ligne_de_Saint-Gaudens_à_Aspet","af":[383]},
        {"num":"_31TVA","g":1000,"len":15,"use":"FD","end":"1954","lid":"Ligne_de_Marignac_au_Pont-du-Roy","af":[387]},
        {"num":"_31VFDM","g":1000,"pk0":4,"pkf":77,"len":73,"use":"FD","end":"1939","lid":"VFDM_réseau_du_Tarn_et_Haute_Garonne#Toulouse_Castres","elect":1,"af":[323]},
        {"num":"_33PO","g":1435,"len":7,"use":"NR","end":"1929","lid":"#PO_Libourne_Espiet_Langon","af":[904],"info":"plateforme réalisée  -- +projets:10km,43km"},
        {"num":"_33SÉ1","g":1435,"len":140.6,"use":"FD","end":"1979","lid":"Ligne_de_Lesparre_à_Saint-Symphorien","af":[407,408,409]},
        {"num":"_33SÉ2","g":1435,"len":60.6,"use":"FD","end":"1979","lid":"Ligne_de_Bordeaux_à_Lacanau","af":[406]},
        {"num":"_33SÉ3","g":1435,"len":20.14,"use":"FD","end":"1978","lid":"Ligne_de_Margaux_à_Sainte-Hélène","af":[412]},
        {"num":"_33SÉ4","g":1435,"len":18,"use":"FD","end":"1954","lid":"#Beautiran_Cabanac","af":[407]},
        {"num":"_33SÉ5","g":1435,"pk0":18,"pkf":33,"len":15,"use":"FD","end":"1978","lid":"#Cabanac_Hostens","af":[407]},
        {"num":"_33SÉ6","g":1435,"pk0":11.7,"pkf":20,"len":8.3,"use":"FD","end":"1992","lid":"#Naujac_St-Isidore","af":[522]},
        {"num":"_33SÉ7","g":1435,"len":28,"use":"FD","end":"1954","lid":"#Saint-André-de-Cubzac_Blaye","af":[411]},
        {"num":"_33SÉ8","g":1435,"pk0":29,"pkf":51,"len":22,"use":"FD","end":"1970","lid":"#Blaye_Saint-Ciers-sur-Gironde","af":[411]},
        {"num":"_33TA","g":1000,"len":7,"use":"FD","end":"1930","lid":"Tramway_d'Arcachon","elect":1,"af":[922]},
        {"num":"_33TBC","g":1000,"len":32.3,"use":"FD","end":"1935","lid":"Tramway_de_Bordeaux_à_Cadillac","af":[461]},
        {"num":"_33TC","g":1435,"len":13,"use":"EXP","lid":"Ligne_de_La_Teste_à_Cazaux-Lac","elect":1,"af":[923]},
        {"num":"_33TEL","g":1000,"len":38.1,"use":"FD","end":"1949","lid":"Tramways_électriques_du_Libournais","elect":1,"af":[460]},
        {"num":"_33TEOB1","g":1435,"len":16,"use":"FD","end":"1949","lid":"Ancien_tramway_de_Bordeaux#TEOB_Caillau","elect":1,"af":[464]},
        {"num":"_33TEOB2","g":1435,"len":16,"use":"FD","end":"1949","lid":"Ancien_tramway_de_Bordeaux#TEOB_Camarsac","elect":1,"af":[463]},
        {"num":"_34CFH1","g":1435,"len":21,"use":"FD","end":"1953","lid":"Chemins_de_fer_de_l'Hérault#Agde_Font-Mars","af":[629]},
        {"num":"_34CFH2","g":1435,"len":33,"use":"FD","end":"1968","lid":"Chemins_de_fer_de_l'Hérault#Béziers-Nord_Saint-Chinian","sa":"Chemins_de_fer_de_l'Hérault#Ligne_Béziers_-_Saint-Chinian","af":[616]},
        {"num":"_34CFH3","g":1435,"len":76.2,"use":"FD","end":"1963","lid":"Chemins_de_fer_de_l'Hérault#Montpellier-Chaptal_Béziers-Nord","sa":"Chemins_de_fer_de_l'Hérault#Ligne_Montpellier_-_Béziers","af":[626]},
        {"num":"_34CFH4","g":1435,"len":12,"use":"FD","end":"1968","lid":"Chemins_de_fer_de_l'Hérault#Montpellier-Esplanade_Palavas-les-Flots","sa":"Chemins_de_fer_de_l'Hérault#Ligne_Font-Mars_-_Agde","af":[627]},
        {"num":"_34CFH5","g":1435,"pk0":6.5,"pkf":46,"len":39.5,"use":"FD","end":"1962","lid":"Chemins_de_fer_de_l'Hérault#Montpellier-Chaptal_Rabieux","sa":"Chemins_de_fer_de_l'Hérault#Ligne_Montpellier_-_Rabieux","af":[628]},
        {"num":"_34CFH45","g":1435,"len":1.5,"use":"FD","end":"1968","lid":"Chemins_de_fer_de_l'Hérault#Montpellier-Esplanade_Montpellier-Chaptal","af":[627]},
        {"num":"_35DSB","g":1000,"len":9,"use":"FD","end":"1929","lid":"Tramway_de_Saint-Briac_à_Dinard","wf":"Tramway_de_Saint-Briac_à_Dinard","af":[163]},
        {"num":"_35TB","g":1000,"len":18,"use":"FD","end":"1950","lid":"Tramways_bretons#Saint-Malo_Cancale","af":[166]},
        {"num":"_35TB2","g":1000,"pk0":16,"pkf":20,"len":4,"use":"FD","end":"1947","lid":"Tramways_bretons#branche_La_Houle","af":[166]},
        {"num":"_35TIV11","g":1000,"len":50,"use":"FD","end":"1948","lid":"Tramways_d'Ille-et-Vilaine#Rennes_Fougères","af":[158]},
        {"num":"_35TIV12","g":1000,"len":89.2,"use":"FD","end":"1948","lid":"Tramways_d'Ille-et-Vilaine#Rennes_Redon","af":[151]},
        {"num":"_35TIV13","g":1000,"pk0":3,"pkf":49,"len":46,"use":"FD","end":"1947","lid":"Tramways_d'Ille-et-Vilaine#Rennes_Guerche-de-Bretagne","af":[156]},
        {"num":"_35TIV21","g":1000,"pk0":0.9,"pkf":79.5,"len":78.6,"use":"FD","end":"1950","lid":"Tramways_d'Ille-et-Vilaine#Rennes_Saint-Malo","af":[161]},
        {"num":"_35TIV22","g":1000,"pk0":17,"pkf":41,"len":24,"use":"FD","end":"1947","lid":"Tramways_d'Ille-et-Vilaine#branche_Bécherel","af":[162]},
        {"num":"_35TIV23","g":1000,"pk0":19,"pkf":54,"len":35,"use":"FD","end":"1937","lid":"Tramways_d'Ille-et-Vilaine#Liffré_Antrain","af":[159]},
        {"num":"_35TIV24","g":1000,"pk0":14.7,"pkf":61,"len":46.3,"use":"FD","end":"1937","lid":"Tramways_d'Ille-et-Vilaine#Mi-Forêt_Pleine-Fougères","af":[160]},
        {"num":"_35TIV26","g":1000,"pk0":1.6,"pkf":68,"len":66.4,"use":"FD","end":"1937","lid":"Tramways_d'Ille-et-Vilaine#Rennes_Grand-Fougeray","af":[27]},
        {"num":"_35TIV27","g":1000,"pk0":17,"pkf":70,"len":53,"use":"FD","end":"1937","lid":"Tramways_d'Ille-et-Vilaine#Bréal_Redon","af":[154]},
        {"num":"_35TR1","g":1000,"len":3.5,"use":"FD","end":"1952","lid":"Tramway_de_Rennes","elect":1,"af":[1348]},
        {"num":"_35TR2","g":1000,"len":7,"use":"FD","end":"1952","lid":"Tramway_de_Rennes","elect":1,"af":[1348]},
        {"num":"_35TR3","g":1000,"len":6,"use":"FD","end":"1952","lid":"Tramway_de_Rennes","elect":1,"af":[1348]},
        {"num":"_36TI1","g":1000,"len":41,"use":"FD","end":"1935","lid":"Ligne_du_Blanc_à_Argenton-sur-Creuse_via_Saint-Benoît-du-Sault","af":[337]},
        {"num":"_36TI2","g":1000,"len":23,"use":"FD","end":"1940","lid":"Ligne_du_Blanc_à_Argenton-sur-Creuse_via_Saint-Benoît-du-Sault#Est","af":[337]},
        {"num":"_36TI3","g":1000,"pk0":1,"pkf":12,"len":11,"use":"FD","end":"1940","lid":"Ligne_du_Blanc_à_Argenton-sur-Creuse_via_Saint-Benoît-du-Sault#Ouest","af":[337]},
        {"num":"_36TI4","g":1000,"len":50,"use":"FD","end":"1935","lid":"Tramways_de_l'Indre#Châteauroux_Valençay","af":[393]},
        {"num":"_36TI5","g":1000,"len":54,"use":"FD","end":"1939","lid":"Tramways_de_l'Indre#Issoudun_Vierzon","af":[338]},
        {"num":"_37CFD1","g":1000,"len":52,"use":"FD","end":"1949","lid":"CFD_Réseau_d'Indre-et-Loire_sud#Esvres_Grand-Pressigny","af":[454]},
        {"num":"_37CFD2","g":1000,"len":60,"use":"FD","end":"1949","lid":"CFD_Réseau_d'Indre-et-Loire_sud#Ligueil_Écueillé","af":[401]},
        {"num":"_37CFD3","g":1000,"len":26,"use":"FD","end":"1949","lid":"CFD_Réseau_d'Indre-et-Loire_nord#Rillé-Hommes_Fondettes","af":[395]},
        {"num":"_37CFD4","g":1000,"len":103,"use":"FD","end":"1949","lid":"CFD_Réseau_d'Indre-et-Loire_nord#Port-Boulet_Château-Renault-PO","af":[394]},
        {"num":"_38CFEL1","g":1435,"len":11,"use":"FD","end":"1942","lid":"Chemin_de_fer_de_l'Est_de_Lyon#Saint-Hilaire-de-Brens_Jallieu","af":[798]},
        {"num":"_38CFEL2","g":1435,"pk0":47.8,"pkf":72,"len":24.2,"use":"FD","end":"1960","lid":"Chemin_de_fer_de_l'Est_de_Lyon#Aoste-Saint-Génix","af":[797]},
        {"num":"_38CFEL3","g":1435,"len":3,"use":"FD","end":"1957","lid":"Chemin_de_fer_de_l'Est_de_Lyon#Montalieu_Amblagnieu","af":[799]},
        {"num":"_38OTL1","g":1435,"len":15,"use":"FD","end":"1951","lid":"Ancien_tramway_de_Lyon#OTL_Ligne16_Crémieu","af":[787]},
        {"num":"_38OTL2","g":1435,"pk0":14,"pkf":51,"len":37,"use":"FD","end":"1951","lid":"Ancien_tramway_de_Lyon#OTL_Ligne16_La-Balme","elect":1,"af":[786]},
        {"num":"_38PLA","g":1000,"len":6,"use":"FD","end":"1947","lid":"Tramway_de_Pontcharra_à_la_Rochette_et_Allevard#Détrier_Allevard","af":[770]},
        {"num":"_38SGLM1","g":1000,"len":30,"use":"EXP","lid":"Chemin_de_fer_de_la_Mure","elect":1,"sa":"Chemin_de_fer_de_la_Mure"},
        {"num":"_38SGLM2","g":1000,"len":31,"use":"FD","end":"1949","lid":"Chemin_de_fer_de_la_Mure#Corps","af":[728]},
        {"num":"_38SGLM3","g":1000,"len":6,"use":"FD","end":"1952","lid":"Chemin_de_fer_de_la_Mure#Valbonnais","af":[728]},
        {"num":"_38SGLM4","g":1000,"pk0":22.65,"pkf":25,"len":2.35,"use":"FD","end":"1952","lid":"Chemin_de_fer_de_la_Mure#Notre-Dame-de-Vaulx","af":[789]},
        {"num":"_38SGTE1","g":1000,"len":5,"use":"FD","end":"1948","lid":"Ancien_tramway_de_Grenoble#Grenoble_Eybens","elect":1,"af":[818]},
        {"num":"_38SGTE2","g":1000,"len":20,"use":"FD","end":"1949","lid":"Ancien_tramway_de_Grenoble#Grenoble_Saillants-du-Gua","elect":1,"af":[794]},
        {"num":"_38SGTE3","g":1000,"len":16,"use":"FD","end":"1952","lid":"Ancien_tramway_de_Grenoble#Grenoble_Veurey","elect":1,"af":[792]},
        {"num":"_38SGTE4","g":1000,"len":39,"use":"FD","end":"1950","lid":"SGTE_Grenoble-Fontaine_Villard-de-Lans","elect":1,"af":[122]},
        {"num":"_38SGTE5","g":1000,"len":15,"use":"FD","end":"1951","lid":"Ancien_tramway_de_Grenoble#Grenoble_Voreppe","elect":1,"af":[793]},
        {"num":"_38MLT","g":1000,"len":9,"use":"FD","end":"1929","lid":"#mines de La Taillat","af":[795],"info":"  --- TODO --- 9km direct"},
        {"num":"_38VFD1","g":1000,"len":15,"use":"FD","end":"1935","lid":"Voies_ferrées_du_Dauphiné#Gières_Froges","elect":1,"af":[791]},
        {"num":"_38VFD2","g":1000,"len":55,"use":"FD","end":"1964","lid":"Voies_ferrées_du_Dauphiné#Grenoble_Bourg-d'Oisan","elect":1,"af":[783]},
        {"num":"_38VFD3","g":1000,"len":43,"use":"FD","end":"1947","lid":"Tramway_Grenoble_-_Chapareillan","elect":1,"af":[777]},
        {"num":"_38VFD4","g":1435,"len":3,"use":"FD","end":"2000","lid":"Voies_ferrées_du_Dauphiné#Jarrie_Vizille","af":[784]},
        {"num":"_38VFD5","g":1000,"len":14,"use":"FD","end":"1935","lid":"Tramways_de_l'Ouest_du_Dauphiné#Grand-Lemps","af":[779]},
        {"num":"_38VFD6","g":1000,"len":6,"use":"FD","end":"1936","lid":"Tramway_Vienne_-_Charavines_/_Voiron","af":[780]},
        {"num":"_38VFD7","g":1000,"len":18,"use":"FD","end":"1935","lid":"Tramways_de_l'Ouest_du_Dauphiné#La-Tour-du-Pin_Les-Avenières","af":[785]},
        {"num":"_38VFD8","g":1000,"len":26,"use":"FD","end":"1933","lid":"Tramways_de_l'Ouest_du_Dauphiné#Bonpertuis","af":[781]},
        {"num":"_38VFD9","g":1000,"len":119.3,"use":"FD","end":"1937","lid":"Tramways_de_l'Ouest_du_Dauphiné#Lyon_Saint-Marcellin","af":[782]},
        {"num":"_38VFD10","g":1000,"len":74,"use":"FD","end":"1936","lid":"Tramway_Vienne_-_Charavines_/_Voiron","af":[778]},
        {"num":"_38VFD11","g":1000,"pk0":1,"pkf":2,"len":1,"use":"FD","end":"1933","lid":"Voies_ferrées_du_Dauphiné#Vienne_Estressin","af":[805]},
        {"num":"_38VSB","g":1000,"len":34,"use":"FD","end":"1936","lid":"Chemin_de_fer_de_Voiron_à_Saint-Béron","af":[775]},
        {"num":"_38VSB2","g":1000,"pk0":18,"pkf":20,"len":2,"use":"FD","end":"1936","lid":"Chemin_de_fer_de_Voiron_à_Saint-Béron#Fourvoirie","af":[775]},
        {"num":"_39CFEJ","g":1000,"len":12,"use":"FD","end":"1958","lid":"Chemins_de_fer_électriques_du_Jura#La-Cure_Morez","elect":1,"af":[826]},
        {"num":"_39CFV1","g":1000,"pk0":0.5,"pkf":23.3,"len":22.8,"use":"FD","end":"1950","lid":"Chemins_de_fer_vicinaux_du_Jura#Champagnole_Foncine-le-Bas","elect":1,"af":[852]},
        {"num":"_39CFV2","g":1000,"len":44.6,"use":"FD","end":"1950","lid":"Chemins_de_fer_vicinaux_du_Jura#Clairvaux_Foncine-le-Haut","elect":1,"af":[853]},
        {"num":"_39CFV3","g":1000,"pk0":13.18,"pkf":41.42,"len":28.24,"use":"FD","end":"1948","lid":"Chemins_de_fer_vicinaux_du_Jura#La-Bifurcation_Arinthod","elect":1,"af":[854]},
        {"num":"_39CFV4","g":1000,"len":68.29,"use":"FD","end":"1948","lid":"Chemins_de_fer_vicinaux_du_Jura#Lons_Saint-Claude","elect":1,"af":[855]},
        {"num":"_39CFV5","g":1000,"len":28.82,"use":"FD","end":"1949","lid":"Chemins_de_fer_vicinaux_du_Jura#Sirod_Boujailles","elect":1,"af":[856]},
        {"num":"_40CB1","g":1000,"len":59,"use":"FD","end":"1937","lid":"CB_Amou_Aire-sur-l'Adour","af":[277]},
        {"num":"_40CB2","g":1000,"len":53,"use":"FD","end":"1937","lid":"CB_Dax_Orthez","af":[278]},
        {"num":"_40CB3","g":1000,"pk0":3.6,"pkf":34.2,"len":30.6,"use":"FD","end":"1937","lid":"CB_Dax_Peyrehorade-Sablot","af":[281]},
        {"num":"_40CFEFL","g":750,"len":12,"use":"FD","end":"1934","lid":"#Roquefort_Lencouacq","af":[1060]},
        {"num":"_40VFL1","g":1435,"len":28,"use":"FD","end":"1969","lid":"Voies_ferrées_des_Landes#Dax_Azur","af":[422]},
        {"num":"_40VFL2","g":1435,"len":17,"use":"FD","end":"1957","lid":"Ligne_de_Labenne_à_Seignosse","af":[417]},
        {"num":"_40VFL3","g":1435,"len":28,"use":"FD","end":"1969","lid":"Voies_ferrées_des_Landes#Labouheyre_Bias","af":[414]},
        {"num":"_40VFL4","g":1435,"len":34,"use":"FD","end":"1980","lid":"Voies_ferrées_des_Landes#Labouheyre_Mimizan-Plage","af":[415]},
        {"num":"_40VFL5","g":1435,"len":18,"use":"FD","end":"1969","lid":"Voies_ferrées_des_Landes#Labouheyre_Sabres","af":[416]},
        {"num":"_40VFL6","g":1435,"len":36,"use":"FD","end":"1979","lid":"Voies_ferrées_des_Landes#Laluque_Saint-Girons-en-Marensin","af":[418]},
        {"num":"_40VFL7","g":1435,"len":14,"use":"FD","end":"??","lid":"Voies_ferrées_des_Landes#Laluque_Tartas","af":[419]},
        {"num":"_40VFL8","g":1435,"len":29,"use":"FD","end":"1969","lid":"Voies_ferrées_des_Landes#Morcenx_Saint-Julien-en-Born","af":[421]},
        {"num":"_40VFL9","g":1435,"len":22,"use":"FD","end":"1962","lid":"Voies_ferrées_des_Landes#Naouas_Mimizan-Plage","af":[423]},
        {"num":"_40VFL10","g":1435,"len":39.6,"use":"FD","end":"1978","lid":"Ligne_du_Nizan_à_Luxey","af":[410]},
        {"num":"_40VFL11","g":1435,"len":42,"use":"FD","end":"1959","lid":"Voies_ferrées_des_Landes#Luxey_Mont-de-Marsan","af":[410]},
        {"num":"_40VFL12","g":1435,"pk0":5,"pkf":33,"len":28,"use":"FD","end":"1969","lid":"Voies_ferrées_des_Landes#Sindères_Lit-et-Mixe","af":[420]},
        {"num":"_40VFL13","g":1435,"len":35,"use":"FD","end":"1969","lid":"Voies_ferrées_des_Landes#Saint-Vincent-de-Tyrosse_Léon","af":[424]},
        {"num":"_40VFL14","g":1435,"len":35,"use":"FD","end":"1989","lid":"Ligne_de_Ychoux_à_Biscarrosse","af":[425]},
        {"num":"_40VFL15","g":1435,"len":22,"use":"FD","end":"1979","lid":"Voies_ferrées_des_Landes#Ychoux_Moustey","af":[426]},

        {"num":"_41TELC1","g":1000,"len":39,"use":"FD","end":"1933","lid":"Tramways_électriques_de_Loir-et-Cher#Blois-Amboise","elect":1,"af":[540]},
        {"num":"_41TELC2","g":1000,"len":46,"use":"FD","end":"1933","lid":"Tramways_électriques_de_Loir-et-Cher#Blois_Cléry","elect":1,"af":[541]},
        {"num":"_41TELC3","g":1000,"len":33,"use":"FD","end":"1933","lid":"Tramways_électriques_de_Loir-et-Cher#Les-Montils_Selles-sur-Cher","elect":1,"af":[549]},
        {"num":"_41TLC1","g":1000,"len":40,"use":"FD","end":"1933","lid":"Compagnie_des_tramways_de_Loir-et-Cher#Blois_Château-Renault","af":[456]},
        {"num":"_41TLC2","g":1000,"pk0":2,"pkf":62,"len":60,"use":"FD","end":"1934","lid":"Compagnie_des_tramways_de_Loir-et-Cher#Blois_Lamotte-Beuvron","af":[550]},
        {"num":"_41TLC3","g":1000,"len":27,"use":"FD","end":"1934","lid":"Compagnie_des_tramways_de_Loir-et-Cher#Blois_Oucques","af":[534]},
        {"num":"_41TLC4","g":1000,"len":31,"use":"FD","end":"1934","lid":"Compagnie_des_tramways_de_Loir-et-Cher#Cellettes_Montrichard","af":[547]},
        {"num":"_41TLC5","g":1000,"len":34,"use":"FD","end":"1933","lid":"Compagnie_des_tramways_de_Loir-et-Cher#Gué-du-Loir_Droué","af":[528]},
        {"num":"_41TLC6","g":1000,"len":32,"use":"FD","end":"1933","lid":"Tramways_électriques_de_Loir-et-Cher#Oucques_Châteaudun","elect":1,"af":[535]},
        {"num":"_41TLC7","g":1000,"len":30,"use":"FD","end":"1934","lid":"Compagnie_des_tramways_de_Loir-et-Cher#Romorantin_Neung-sur-Beuvron","af":[552]},
        {"num":"_41TLC8","g":1000,"len":36,"use":"FD","end":"1933","lid":"Compagnie_des_tramways_de_Loir-et-Cher#Vendôme_Mondoubleau","af":[527]},
        {"num":"_41TLC9","g":1000,"len":74,"use":"FD","end":"1934","lid":"Compagnie_des_tramways_de_Loir-et-Cher#Vendôme_Orléans","af":[529]},

        {"num":"_42CCFSEL","lid":"Ligne_de_Saint-Étienne_à_Andrézieux","sb":"Saint-Étienne_-_Andrézieux","wf":"https://commons.wikimedia.org/wiki/File:Railway_map_of_France_-_Saint-%C3%89tienne_-_animated_-_fr.gif#/media/File:Railway_map_of_France_-_Saint-%C3%89tienne_-_animated_-_fr.gif"},
        {"num":"_42CFC1","g":1000,"len":37,"use":"FD","end":"1939","lid":"Société_des_Chemins_de_fer_du_Centre#Balbigny_Régny","if":"hd42/42181.a.pdf","af":[766]},
        {"num":"_42CFC2","g":1435,"pk0":4,"pkf":86,"len":82,"use":"FD","end":"1990","lid":"Société_des_Chemins_de_fer_du_Centre#Cusset_Balbigny","af":[662]},
        {"num":"_42CFC3","g":1000,"len":14,"use":"FD","end":"1938","lid":"Société_des_Chemins_de_fer_du_Centre#Juré_Saint-Polgues","af":[754],"if":"hd42/42003.a.pdf"},
        {"num":"_42CFDL1","g":1000,"len":47,"use":"FD","end":"1933","lid":"Chemins_de_fer_départementaux_de_la_Loire#St-Etienne_Pélussin_Maclas","af":[755],"if":"hd42/42103.a.pdf"},
        {"num":"_42CFDL2","g":1000,"len":54,"use":"FD","end":"1938","lid":"Chemins_de_fer_départementaux_de_la_Loire#Roanne_Boën","af":[756],"if":"hd42/42003.a.pdf"},
        {"num":"_42CFDL3","g":1000,"len":14,"use":"FD","end":"1933","lid":"Chemins_de_fer_départementaux_de_la_Loire#St-Etienne_St-Héand","af":[757]},
        {"num":"_42CFDL4","g":1000,"len":13,"use":"FD","end":"1933","lid":"Chemins_de_fer_départementaux_de_la_Loire#Roanne_Ambierle","af":[759],"if":"hd42/42003.a.pdf"},
        {"num":"_42CFDLa","lid":"Chemins_de_fer_départementaux_de_la_Loire#Balbigny_Hopital-sur-Rhins","af":[796],"info":" --- TODO --- 20 km ancien tracé"},
        {"num":"_42CFSG","g":1000,"len":3,"use":"FD","end":"1954","lid":"#Saint-Galmier-Ville","af":[760]},
        {"num":"_42MRF","g":1435,"len":15,"use":"FD","end":"1960","lid":"#cavalier_Firminy_Grand-Breuil","af":[846]},
        {"num":"_42MRFb","g":1435,"pk0":8,"pkf":10,"len":2,"use":"FD","end":"1960","lid":"#cavalier_Roche-la-Molière-Nord","af":[846]},
        {"num":"_42VE1","g":1000,"len":25,"use":"FD","end":"1932","lid":"Tramway_de_Saint-Étienne#CFVE_La-Madeleine","af":[809]},
        {"num":"_42VE2","g":1000,"len":2,"use":"FD","end":"1932","lid":"Tramway_de_Saint-Étienne#CFVE_St-Jean-Bonnefonds","af":[809]},
        {"num":"_42VE3","g":1000,"len":9,"use":"FD","end":"1932","lid":"Tramway_de_Saint-Étienne#CFVE_Firminy","elect":1,"af":[840]},
        {"num":"_42VE4","g":1000,"pk0":9,"pkf":13,"len":4,"use":"FD","end":"1932","lid":"Tramway_de_Saint-Étienne#CFVE_Le-Pertuiset","elect":1,"af":[840]},
        {"num":"_42VE5","g":1000,"len":7,"use":"FD","end":"1932","lid":"Tramway_de_Saint-Étienne#CFVE_La-Fouillouse","elect":1,"af":[842]},
        {"num":"_42VE6","g":1000,"len":7,"use":"FD","end":"1932","lid":"Tramway_de_Saint-Étienne#CFVE_Roche-La-Molière","elect":1,"af":[843]},
        {"num":"_42VE7","g":1000,"pk0":5,"pkf":6.5,"len":1.5,"use":"FD","end":"1932","lid":"Tramway_de_Saint-Étienne#CFVE_St-Genest-Lerpt","af":[843]},
        {"num":"_42VSC","g":1000,"len":10,"use":"FD","end":"1935","lid":"Tramways_électriques_de_Viricelles-Chazelles_à_St_Symphorien-sur-Coise_et_extensions","af":[807]},

        {"num":"_43CFD1","g":1000,"len":61,"use":"FD","end":"1968","lid":"CFD_Réseau_du_Vivarais#Dunières_Le-Cheylard","af":[668]},
        {"num":"_43CFD2","g":1000,"len":43,"use":"FD","end":"1968","lid":"CFD_Réseau_du_Vivarais#Lavoûte-sur-Loire_Raucoules-Brossettes","af":[667]},
        {"num":"_44CM1","g":1000,"len":40,"use":"FD","end":"1948","lid":"Chemins_de_fer_du_Morbihan#Saint-Nazaire_La-Roche-Bernard"},
        {"num":"_44CM2","g":1000,"len":34,"use":"FD","end":"1938","lid":"#Guérande_Herbignac","af":[171]},
        {"num":"_44CM3","g":1000,"len":31.2,"use":"FD","end":"1938","lid":"Ligne_de_Pornic_à_Paimbœuf"},
        {"num":"_44CM4","g":1000,"len":1.8,"use":"FD","end":"1938","lid":"#La-Plaine-sur-Mer_Préfailles"},
        {"num":"_44TE1","g":1000,"len":20,"use":"FD","end":"1947","lid":"Tramway_d'Erbray#Châteaubriant_La-Chapelle-Glain","af":[172]},
        {"num":"_44TE2","g":1000,"len":43,"use":"FD","end":"1938","lid":"#Erbray_Ancenis","af":[173]},
        {"num":"_44CFVE01","g":1000,"len":44.2,"use":"FD","end":"1935","lid":"Ligne_de_Nantes_à_Legé","af":[174]},
        {"num":"_44CFVE02","g":1000,"len":40,"use":"FD","end":"1935","lid":"Ligne_des_Sorinières_à_Rocheservière","af":[175]},
        {"num":"_45TL1","g":1000,"len":10,"use":"FD","end":"1934","lid":"Compagnie_des_tramways_du_Loiret#Nogent-sur-Vernisson_Châtillon-Coligny","af":[585]},
        {"num":"_45TL2","g":1000,"len":69,"use":"FD","end":"1934","lid":"Compagnie_des_tramways_du_Loiret#Orléans_Brinon-sur-Sauldre","af":[554]},
        {"num":"_45TL3","g":1000,"len":48,"use":"FD","end":"1934","lid":"Compagnie_des_tramways_du_Loiret#Orléans_Neung-sur-Beuvron","af":[551]},
        {"num":"_45TL4","g":1000,"len":8,"use":"FD","end":"1934","lid":"Compagnie_des_tramways_du_Loiret#Tigy_Châteauneuf-sur-Loire","af":[555]},
        {"num":"_46PO","lid":"PO_Cahors_Moissac (inachevé)","af":[342],"ct":"Cahors_Moissac/Index.htm"},
        {"num":"_46TQE","g":1000,"len":10,"use":"FD","end":"1934","lid":"Tramways_du_Quercy#Bretenoux_Saint-Céré","ct":"tramway_lot/biars_st-cere.htm","af":[494]},
        {"num":"_47TLG1","g":1000,"len":44,"use":"FD","end":"1933","lid":"Tramways_de_Lot-et-Garonne#Tonneins_Beauregard","af":[470]},
        {"num":"_47TLG2","g":1000,"len":49,"use":"FD","end":"1933","lid":"Tramways_de_Lot-et-Garonne#Tonneins_Sos","af":[469]},
        {"num":"_47TLG3","g":1000,"len":37,"use":"FD","end":"1933","lid":"Tramways_de_Lot-et-Garonne#Villeneuve_Villeréal","af":[471]},
        {"num":"_48CFD","g":1000,"len":49,"use":"FD","end":"1968","lid":"#Sainte-Cécile-d'Andorge_Florac","af":[431]},
        {"num":"_48MIL","g":1435,"pk0":0.6,"pkf":15,"len":14.4,"use":"FD","end":"1938","lid":"embranchement_Larzalier_Charpal","af":[686]},
        {"num":"_49PA1","g":1000,"len":66,"use":"FD","end":"1948","lid":"Petit_Anjou#Angers-Noyant","af":[125]},
        {"num":"_49PA2","g":1000,"pk0":2,"pkf":81,"len":79,"use":"FD","end":"1944","lid":"Petit_Anjou#Saumur_Cholet","af":[127]},
        {"num":"_49PA3","g":1000,"len":80,"use":"FD","end":"1947","lid":"Petit_Anjou#Cholet-Nantes","af":[123]},
        {"num":"_49PA4","g":1000,"len":47,"use":"FD","end":"1947","lid":"Petit_Anjou#La_Roche_Beaupréau","af":[124]},
        {"num":"_49PA5","g":1000,"len":42,"use":"FD","end":"1955","lid":"Petit_Anjou#Angers_Candé","af":[126],"if":"49/49035.a.pdf"},
        {"num":"_49TVO1","g":1000,"len":17,"use":"FD","end":"1929","lid":"TVO_Saumur_Fontevrault","af":[128]},
        {"num":"_49TVO2","g":1000,"len":4,"use":"FD","end":"1929","lid":"TVO_Saumur_Saint-Hilaire","af":[128]},
        {"num":"_50CTN1","g":1435,"len":10,"use":"FD","end":"1938","lid":"Ligne_de_Pontorson_au_Mont-Saint-Michel","af":[167]},
        {"num":"_50CFM1","g":1000,"len":17,"use":"FD","end":"1933","lid":"Ligne_d'Avranches_à_Saint-James","af":[229]},
        {"num":"_50CFM2","g":1435,"len":31,"use":"FD","end":"1951","lid":"Ligne_de_Cherbourg_à_Barfleur","af":[120]},
        {"num":"_50CFM3","g":1435,"len":36,"use":"FD","end":"1951","lid":"Ligne_de_Valognes_à_Barfleur","af":[1083]},
        {"num":"_50CFM4","g":1435,"len":8,"use":"FD","end":"1951","lid":"Ligne_de_Valognes_Montebourg_à_Saint-Vaast_et_à_Barfleur#Montebourg_St-Martin","af":[1084]},
        {"num":"_50CFM5","g":1000,"len":71,"use":"FD","end":"1935","lid":"Ligne_de_Granville_à_Sourdeval","af":[150]},
        {"num":"_50CFM6","g":1000,"pk0":3.7,"pkf":68,"len":64.3,"use":"FD","end":"1936","lid":"Société_des_chemins_de_fer_de_la_Manche#Granville_Saint-Lô","af":[226]},
        {"num":"_50CFM7","g":1000,"len":17,"use":"FD","end":"1938","lid":"Société_des_chemins_de_fer_de_la_Manche#Saint-Hilaire-du-Harcouët_Landivy","af":[188]},
        {"num":"_50CFM8","g":1000,"len":37,"use":"FD","end":"1932","lid":"Société_des_chemins_de_fer_de_la_Manche#Coutances_Lessay","af":[228]},
        {"num":"_50CFM9","g":1000,"len":10,"use":"FD","end":"1914","lid":"Société_des_chemins_de_fer_de_la_Manche#Ste-Mère_Picauville","af":[230]},
        {"num":"_50IL","g":1435,"len":12,"use":"FD","end":"1944","lid":"Ligne_de_Cherbourg_à_Urville-en-Hague"},
        {"num":"_51CBR1","g":1000,"len":82.2,"use":"FD","end":"1937","lid":"Chemins_de_fer_de_la_Banlieue_de_Reims#Montmirail_Ambonnay","af":[1007]},
        {"num":"_51CBR2","g":1000,"pk0":1,"pkf":58,"len":57,"use":"FD","end":"1933","lid":"Chemins_de_fer_de_la_Banlieue_de_Reims#Reims_Chalons-sur-Marne","af":[1011]},
        {"num":"_51CBR3","g":1000,"pk0":1,"pkf":21,"len":20,"use":"FD","end":"1933","lid":"Chemins_de_fer_de_la_Banlieue_de_Reims#Reims_Cormicy","af":[1019]},
        {"num":"_51CBR5","g":1000,"len":29,"use":"FD","end":"1947","lid":"Chemins_de_fer_de_la_Banlieue_de_Reims#Reims_Vieux-lès-Asfeld","af":[1016]},
        {"num":"_51CBR6","g":1000,"len":42,"use":"FD","end":"1947","lid":"Chemins_de_fer_de_la_Banlieue_de_Reims#Reims_Fismes","af":[1014]},
        {"num":"_51CBR7","g":1000,"pk0":1,"pkf":25,"len":24,"use":"FD","end":"1933","lid":"Chemins_de_fer_de_la_Banlieue_de_Reims#Bouleuse_Dormans","af":[1015]},
        {"num":"_51CBR10","g":1000,"len":18,"use":"FD","end":"1933","lid":"Chemins_de_fer_de_la_Banlieue_de_Reims#Reims_Beine","af":[1017]},
        {"num":"_51CBR13","g":1000,"pk0":8.3,"pkf":35,"len":26.7,"use":"FD","end":"1961","lid":"Chemins_de_fer_de_la_Banlieue_de_Reims#Evergnicourt_Rethel","af":[1025]},
        {"num":"_51CBR40","g":1000,"pk0":11,"pkf":30,"len":19,"use":"FD","end":"1914","lid":"Chemins_de_fer_de_la_Banlieue_de_Reims#Concevreux_Vailly","af":[1021]},
        {"num":"_51CBR41","g":1000,"len":6,"use":"FD","end":"1933","lid":"Chemins_de_fer_de_la_Banlieue_de_Reims#via_Cormicy","af":[1021]},
        {"num":"_51CBR42","g":1000,"len":12,"use":"FD","end":"1914","lid":"Chemins_de_fer_de_la_Banlieue_de_Reims#Roucy_Corbeny","af":[1022]},
        {"num":"_51CBR44","g":1435,"pk0":4.7,"pkf":51,"len":46.3,"use":"FD","end":"1962","lid":"Chemins_de_fer_de_la_Banlieue_de_Reims#Berry_Soissons","af":[1021]},
        {"num":"_51CBR45","g":1435,"len":4.8,"use":"FD","end":"1962","lid":"Chemins_de_fer_de_la_Banlieue_de_Reims#Cuiry_Pontavert","af":[1021]},
        {"num":"_52SÉ1","g":1435,"len":21,"use":"FD","end":"1953","lid":"Ligne_de_Gudmont_à_Rimaucourt","af":[1002]},
        {"num":"_52IL1","g":1000,"len":12,"use":"FD","end":"1947","lid":"Chemin_de_fer_de_Foulain_à_Nogent-en-Bassigny","af":[996]},
        {"num":"_53CFDM01","g":1000,"len":67,"use":"FD","end":"1938","lid":"#Laval_Landivy","af":[190]},
        {"num":"_53CFDM02","g":1000,"len":46,"use":"FD","end":"1947","lid":"#Mayenne_Landivy","af":[189]},
        {"num":"_53CFDM03","g":1000,"len":32,"use":"FD","end":"1938","lid":"#Laval_Saint-Jean-sur-Erve","af":[191]},
        {"num":"_54BA","g":1435,"len":18,"use":"FD","end":"1970","lid":"Base_aérienne_136_Toul-Rosières#accès","af":[1326]},
        {"num":"_54BAa","g":1435,"len":2,"use":"FD","end":"1942","lid":"Base_aérienne_136_Toul-Rosières#branche_nord","af":[1326]},
        {"num":"_54SÉ1","g":1000,"len":42,"use":"FD","end":"1942","lid":"Ligne_de_Toul_à_Thiaucourt","af":[1302]},
        {"num":"_54B165X","g":1000,"len":4,"use":"FD","end":"1983","lid":"#B165_raccordement_international"},
        {"num":"_54CGFT01","g":1000,"len":30,"use":"FD","end":"1952","lid":"#Dombasle-sur-Meurthe_-_Nancy_-_Pont-Saint-Vincent"},
        {"num":"_54CGFT02","g":1000,"len":10,"use":"FD","end":"1949","lid":"#Nancy-Carnot_-_Pompey"},
        {"num":"_54LBB1","g":1000,"len":30.3,"use":"FD","end":"1943","lid":"Ligne_de_Lunéville_à_Blâmont_et_à_Badonviller","af":[1282]},
        {"num":"_54LBB2","g":1000,"len":14.2,"use":"FD","end":"1943","lid":"Ligne_de_Lunéville_à_Blâmont_et_à_Badonviller#branche_Badonviller","af":[1281]},
        {"num":"_54LBB3","g":1000,"len":2,"use":"FD","end":"1943","lid":"Ligne_de_Lunéville_à_Blâmont_et_à_Badonviller#raccordement_Einville"},
        {"num":"_54LBB4","g":1000,"len":10,"use":"FD","end":"1943","lid":"Ligne_de_Lunéville_à_Einville","af":[1287]},
        {"num":"_54mili","g":1435,"len":26,"use":"FD","end":"1918","lid":"#Bayon_Neuves-Maisons","af":[1306],"info":" - TODO - "},
        {"num":"_54NA","g":1435,"len":5,"use":"FD","end":"1967","lid":"Base_aérienne_de_Chambley-Bussières#ITE_NATOairbase","af":[1325],"info":" - TODO - "},
        {"num":"_54ND","g":1435,"len":5,"use":"FD","end":"1967","lid":"#ITE_NATOdepot","af":[1469],"if":"hd54/54007.a.pdf"},
        {"num":"_54TL","g":1000,"len":6,"use":"FD","end":"1933","lid":"Tramway_de_Longwy","elect":1,"af":[1308]},
        {"num":"_54TN","g":1435,"len":92,"use":"FD","end":"1958","lid":"Ancien_tramway_de_Nancy","elect":1,"af":[1307],"info":" - TODO - "},

        {"num":"_55SÉ1","g":1000,"len":52,"use":"FD","end":"1936","lid":"Compagnie_meusienne_de_chemins_de_fer##Bar-le-Duc_Clermont","af":[1295]},
        {"num":"_55SÉ2","g":1000,"len":4,"use":"FD","end":"1936","lid":"#Lisle-en-Barrois_Rembercourt","af":[1298]},
        {"num":"_55SÉ3","g":1000,"len":37,"use":"FD","end":"1936","lid":"#Revigny_Triaucourt","af":[1299]},
        {"num":"_55SÉ4","g":1000,"len":38,"use":"FD","end":"1936","lid":"Compagnie_meusienne_de_chemins_de_fer#Beauzée_Verdun","af":[1296]},
        {"num":"_55SÉ5","g":1000,"len":12,"use":"FD","end":"1936","lid":"#La_Vaux-Marie_Pierrefitte-sur-Aire","af":[1297]},
        {"num":"_55SÉ6","g":1000,"len":66,"use":"FD","end":"1938","lid":"Réseau_de_la_Woëvre#Commercy_Vaux-devant-Damloup","af":[96]},
        {"num":"_55SÉ7","g":1000,"len":61,"use":"FD","end":"1938","lid":"Réseau_de_la_Woëvre#Verdun_Montmédy","af":[89]},
        {"num":"_55SÉ8","g":1435,"pk0":12.5,"pkf":27,"len":14.5,"use":"FD","end":"1971","lid":"Société_générale_des_chemins_de_fer_économiques_(France)#Robert-Espagne_Haironville","af":[1300]},
        {"num":"_55SÉ9","g":1000,"len":19.5,"use":"FD","end":"1929","lid":"Compagnie_meusienne_de_chemins_de_fer#Revigny_Lisle-en-Rigault","af":[1300]},
        {"num":"_55IL1","g":1435,"len":33,"use":"FD","end":"1969","lid":"Ligne_de_Guë_à_Menaucourt","af":[1052]},
        {"num":"_55IL2","g":1435,"len":10,"use":"FD","end":"1937","lid":"#Dammarie_Montiers-sur-Saulx"},
        {"num":"_56CM1","g":1000,"len":76,"use":"FD","end":"1948","lid":"Ligne_de_la_Roche-Bernard_à_Locminé","af":[68,69]},
        {"num":"_56CM2","g":1000,"len":90,"use":"FD","end":"1947","lid":"Chemins_de_fer_du_Morbihan#Ploërmel_Plouay","af":[66]},
        {"num":"_56CM3","g":1000,"len":68,"use":"FD","end":"1947","lid":"Chemins_de_fer_du_Morbihan#Moulin-Gilet_Meslan","af":[41]},
        {"num":"_56CM4","g":1000,"len":74,"use":"FD","end":"1947","lid":"Chemins_de_fer_du_Morbihan#Lorient_Gourin","af":[35]},
        {"num":"_56CM5","g":1000,"pk0":0.1,"pkf":30,"len":29.9,"use":"FD","end":"1947","lid":"Ligne_de_Surzur_à_Port-Navalo","af":[70]},
        {"num":"_56CM6","g":1000,"len":26,"use":"FD","end":"1939","lid":"Chemins_de_fer_du_Morbihan#Ploërmel_La-Trinité-Porhoët","af":[67]},
        {"num":"_56CM7","g":1000,"len":45,"use":"FD","end":"1934","lid":"Chemins_de_fer_du_Morbihan#Baud_Port-Louis","af":[71]},
        {"num":"_56CM8","g":1000,"pk0":609,"pkf":611.26,"len":2.26,"use":"FD","end":"1939","lid":"Chemins_de_fer_du_Morbihan#embranchement_Hennebont"},
        {"num":"_56TTE","g":1000,"len":21,"use":"FD","end":"1940","lid":"Tramway_de_la_Trinité_à_Étel","af":[109]},
        {"num":"_57IL1","g":1435,"len":5,"use":"FD","end":"1936","lid":"#Farschviller_Puttelange-lès-Sarralbe","af":[1253]},
        {"num":"_57IL2","g":1435,"len":5.8,"use":"FD","end":"1964","lid":"Tramway_d'Hagondange","af":[1264]},
        {"num":"_57CFL6b","g":1000,"len":0.85,"use":"EXP","lid":"Ligne_6b_(CFL)#extension_francaise"},
        {"num":"_57SB30","g":1000,"len":4.3,"use":"EXP","lid":"Saarbahn"},
        {"num":"_57SÉ1","g":1000,"len":25,"use":"FD","end":"1935","lid":"Ligne_de_Thionville_à_Mondorf-les-Bains","af":[1268]},
        {"num":"_57SÉ2","g":1435,"len":6,"use":"FD","end":"1935","lid":"Ligne_de_Novéant_à_Gorze","elect":1,"af":[1303]},
        {"num":"_57TM","g":1000,"len":3,"use":"FD","end":"1914","lid":"#Morhange-Ville_Gare","af":[1273]},
        {"num":"_57TS","g":1435,"len":16,"use":"FD","end":"1961","lid":"Creutzwald#Transport","elect":1,"af":[1260]},
        {"num":"_57TT","g":1000,"len":30,"use":"FD","end":"1952","lid":"Tramway_de_Thionville#Fontoy","elect":1,"af":[1269]},
        {"num":"_57TTa","g":1000,"len":3,"use":"FD","end":"1952","lid":"Tramway_de_Thionville#Algrange","elect":1,"af":[1269]},
        {"num":"_57TTb","g":1000,"len":3,"use":"FD","end":"1952","lid":"Tramway_de_Thionville#Neufchef","elect":1,"af":[1269]},
        {"num":"_57TTc","g":1000,"len":3,"use":"FD","end":"1952","lid":"Tramway_de_Thionville#Fameck","elect":1,"af":[1269]},
        {"num":"_57TTd","g":1000,"len":3,"use":"FD","end":"1952","lid":"Tramway_de_Thionville#Yutz","elect":1,"af":[1269]},
        {"num":"_57TVSA","g":1000,"len":3,"use":"FD","end":"1948","lid":"Tramway_de_Saint-Avold","elect":1,"af":[1272]},

        {"num":"_58CFN1","g":1000,"len":22,"use":"FD","end":"1939","lid":"Réseau_de_la_Nièvre#Cosne-sur-Loire_Saint-Amand-en-Puisaye","af":[1182]},
        {"num":"_58CFN2","g":1000,"len":74,"use":"FD","end":"1939","lid":"Réseau_de_la_Nièvre#Nevers_Corbigny","af":[1173]},
        {"num":"_58CFN3","g":1000,"len":75,"use":"FD","end":"1939","lid":"Chemin_de_fer_de_Corbigny_à_Saulieu","af":[1173]},
        {"num":"_58CFN4","g":1000,"len":8,"use":"FD","end":"1939","lid":"Réseau_de_la_Nièvre#Saint-Révérien_Brinon-sur-Beuvron","af":[1183]},
        {"num":"_58CFN5","g":1000,"len":34,"use":"FD","end":"1933","lid":"Réseau_de_la_Nièvre#Saint-Saulge_Moulins-Engilbert-Ville","af":[1181]},
        {"num":"_58RAN","g":1435,"len":9,"use":"FD","end":"1920","lid":"#raccordement_américain_de_Nevers","af":[970],"info":" ligne - TODO - "},

        {"num":"_59CMA","g":1000,"len":35.81,"use":"FD","end":"1989","lid":"Ligne_de_Somain_à_Péruwelz","sa":"Ligne_Somain_-_Péruwelz","af":[1315]},
        {"num":"_59CN1","g":1000,"len":26,"use":"FD","end":"1935","lid":"Tramway_Armentières_-_Halluin","af":[1138]},
        {"num":"_59CN2","g":1000,"len":32,"use":"FD","end":"1932","lid":"Tramway_de_Saint-Amand_à_Hellemmes","af":[1148]},
        {"num":"_59HNP","g":1435,"len":5,"use":"FD","end":"1950","lid":"Compagnie_des_mines_de_Carvin#Carvin_Libercourt","af":[1328]},
        {"num":"_59SCFC1","g":1000,"len":35,"use":"FD","end":"1955","lid":"Société_des_chemins_de_fer_du_Cambrésis#Cambrai_Catillon","af":[1153]},
        {"num":"_59SCFC2","g":1000,"len":82.2,"use":"FD","end":"1960","lid":"Société_des_chemins_de_fer_du_Cambrésis#Denain_Saint-Quentin","af":[1117]},
        {"num":"_59CFF1","g":1000,"len":9,"use":"FD","end":"1954","lid":"Chemin_de_fer_de_Hazebrouck_à_Bergues_et_Hondschoote#Rexpoëde","af":[1141]},
        {"num":"_59CFF2","g":1000,"len":34,"use":"FD","end":"1954","lid":"Chemin_de_fer_de_Hazebrouck_à_Bergues_et_Hondschoote","af":[1140]},
        {"num":"_59SÉ2","g":1435,"pk0":0.5,"pkf":18,"len":17.5,"use":"FD","end":"1951","lid":"Société_générale_des_chemins_de_fer_économiques_(France)#Don-Sainghin_Fromelles","af":[1323]},
        {"num":"_59SÉ2400","g":1000,"len":3,"use":"FD","end":"1951","lid":"#raccordement_Petit-Rivage"},
        {"num":"_59SÉ1","g":1000,"len":18.5,"use":"FD","end":"1951","lid":"Chemin_de_fer_de_Bergues_à_Bollezeele","af":[1139]},
        {"num":"_59SÉ3","g":1000,"len":30,"use":"FD","end":"1951","lid":"Chemin_de_fer_de_Herzeele_à_Saint-Momelin","af":[1142]},
        {"num":"_59SÉ4","g":1000,"len":18,"use":"FD","end":"1933","lid":"Chemin_de_fer_Hondschoote_-_Bray-Dunes","af":[1143]},
        {"num":"_59CGL01","g":1435,"len":6,"use":"FD","end":"1967","lid":"Compagnie_du_Chemin_de_fer_de_Bettrechies_à_Hon_et_Bavay#Hon","af":[1312]},
        {"num":"_59CGL02","g":1435,"pk0":3,"pkf":6,"len":3,"use":"FD","end":"1953","lid":"Compagnie_du_Chemin_de_fer_de_Bettrechies_à_Hon_et_Bavay#Bavay","af":[1312]},
        {"num":"_59CGL03","g":1435,"len":14,"use":"FD","end":"1962","lid":"Compagnie_du_Chemin_de_fer_d'Hazebrouck_à_Merville","af":[1331]},
        {"num":"_59SÉ5","g":1000,"len":26,"use":"FD","end":"1944","lid":"Réseau_du_Nord#Lourches_Cambrai","af":[1154]},
        {"num":"_59SÉ6","g":1000,"len":7,"use":"FD","end":"1939","lid":"Chemin_de_fer_de_Solesmes_à_Quiévy","af":[1155]},
        {"num":"_59SÉ7","g":1000,"len":51,"use":"FD","end":"1914","lid":"Chemin_de_fer_d'Avesnes-sur-Helpe_à_Solesmes","af":[1152]},
        {"num":"_59SÉ7","g":1000,"len":2,"use":"FD","end":"1914","lid":"Chemin_de_fer_d'Avesnes-sur-Helpe_à_Solesmes#Etroengt","af":[1152]},
        {"num":"_59MV","g":1000,"len":13,"use":"FD","end":"1951","lid":"Chemin_de_fer_de_Maubeuge_à_Villers-Sire-Nicole","af":[1150]},
        {"num":"_59EFR","g":1435,"pk0":0.9,"pkf":29,"len":28.1,"use":"FD","end":"1993","lid":"Compagnie_du_chemin_de_fer_de_Pont-de-la-Deûle_à_Pont-à-Marcq","af":[1321]},
        {"num":"_59SNCV","g":1000,"len":1.7,"use":"FD","end":"1932","lid":"Ligne_de_tramway_361#Steenwerck","af":[1147]},
        {"num":"_59CAP","g":1435,"pk0":81.2,"pkf":86,"len":4.8,"use":"FD","end":"1948","lid":"Compagnie_du_Chemin_de_fer_d%27Aulnoye_à_Pont-sur-Sambre","af":[1311]},
        {"num":"_59TC","g":1000,"len":3,"use":"FD","end":"1934","lid":"Tramway_de_Cassel_(France)","elect":1,"af":[1144]},
        {"num":"_59ELRT2","g":1000,"len":17,"use":"FD","end":"1956","lid":"Ligne_de_tramway_2_(ELRT)","elect":1,"af":[1344]},
        {"num":"_59ELRT5","g":1000,"len":6,"use":"FD","end":"1956","lid":"Ligne_de_tramway_5_(ELRT)","elect":1,"af":[1344]},
        {"num":"_59FW","g":1000,"len":6,"use":"FD","end":"1904","lid":"Ligne_de_tramway_de_Fourmies_à_Wignehies","af":[1151]},

        {"num":"_60CGL01","g":1000,"len":32,"use":"FD","end":"1934","lid":"Chemin_de_fer_de_Méru_à_Labosse","af":[959]},
        {"num":"_60CGL02","g":1000,"len":32,"use":"FD","end":"1935","lid":"Compagnie_des_Chemins_de_fer_de_Milly_à_Formerie","af":[1053]},
        {"num":"_60CGL03","g":1000,"len":25,"use":"FD","end":"1955","lid":"Compagnie_des_Chemins_de_fer_de_Milly_à_Formerie_et_de_Noyon_à_Guiscard_et_à_Lassigny#Ham","af":[1067]},
        {"num":"_60CGL04","g":1000,"len":43,"use":"FD","end":"1939-1955","lid":"Compagnie_des_Chemins_de_fer_de_Milly_à_Formerie_et_de_Noyon_à_Guiscard_et_à_Lassigny#Montdidier","af":[1064]},
        {"num":"_60CGL05","g":1000,"len":32,"use":"FD","end":"1979","lid":"Chemin_de_fer_de_Hermes_à_Beaumont","af":[994]},
        {"num":"_60EFC1","g":1000,"len":31,"use":"FD","end":"1961","lid":"Chemin_de_fer_d'Estrées-Saint-Denis_à_Crèvecœur-le-Grand#Estrées","af":[1055]},
        {"num":"_60EFC2","g":1000,"pk0":2.5,"pkf":23,"len":20.5,"use":"FD","end":"1948","lid":"Chemin_de_fer_d'Estrées-Saint-Denis_à_Crèvecœur-le-Grand#Crèvecœur","af":[1054]},
        {"num":"_61VFEO1","g":1000,"len":45,"use":"FD","end":"1937","lid":"Ligne_de_Carrouges_à_Trun","af":[237]},
        {"num":"_61VFEO2","g":1435,"len":20,"use":"FD","end":"1964","lid":"Voies_ferrées_économiques_de_l'Orne#Montsecret_Les-Maures","wf":"Voies_ferrées_économiques_de_l'Orne","af":[100]},
        {"num":"_61VFEO3","g":1000,"len":54,"use":"FD","end":"1934","lid":"Ligne_de_Mortagne-au-Perche_à_La_Loupe","af":[239]},
        {"num":"_62RDT1","g":1435,"len":33,"use":"FD","end":"1969","lid":"Chemin_de_fer_d'Achiet_à_Bapaume_et_Marcoing#Marcoing","af":[1381]},
        {"num":"_62RDT2","g":1435,"len":4,"use":"FD","end":"1969","lid":"RDT_Frémicourt_Quéant","af":[1383]},
        {"num":"_62RDT3","g":1435,"len":46,"use":"FD","end":"1969","lid":"Ligne_de_Boisleux_à_Marquion","af":[1384]},
        {"num":"_62RDT4","g":1435,"len":8,"use":"FD","end":"1933","lid":"RDT_Marquion_Aubencheul-au-Bac","af":[1407]},
        {"num":"_62CGL1","g":1000,"len":34,"use":"FD","end":"1954","lid":"Ligne_d'Aire-sur-la-Lys_à_Berck-Plage#Aire_Fruges","af":[1160]},
        {"num":"_62CGL2","g":1000,"len":91,"use":"FD","end":"1955","lid":"Chemin_de_fer_d'Anvin_à_Calais","af":[1156]},
        {"num":"_62CGL3","g":1000,"len":6,"use":"FD","end":"1955","lid":"Tramway_d'Ardres_à_Pont-d'Ardres","af":[1157]},
        {"num":"_62CGL4","g":1000,"len":44,"use":"FD","end":"1947","lid":"Chemin_de_fer_Boulogne_-_Bonningues","af":[1158]},
        {"num":"_62CGL5","g":1000,"len":55,"use":"FD","end":"1955","lid":"Ligne_d'Aire-sur-la-Lys_à_Berck-Plage#Rimeux_Berck","af":[1159]},
        {"num":"_62CFBP","g":1000,"len":17,"use":"FD","end":"1927","lid":"Ligne_de_Berck-Plage_à_Paris-Plage","af":[1162]},
        {"num":"_62CTA1","g":1000,"len":18,"use":"FD","end":"1933","lid":"Ligne_de_tramway_de_Béthune_à_Estaires","af":[1149]},
        {"num":"_62EP","g":1000,"len":6.4,"use":"FD","end":"1940","lid":"Tramway_d'Étaples_à_Paris-Plage","af":[1163]},
        {"num":"_62CEN1","g":1000,"len":56,"use":"FD","end":"1948","lid":"Chemin_de_fer_Lens_-_Frévent","af":[1161]},
        {"num":"_62CEB","g":1435,"len":11,"use":"FD","end":"1950","lid":"Omnium_lyonnais_de_chemins_de_fer_et_tramways#Estrée-Blanche","af":[1330]},
        {"num":"_62CM1","g":1000,"len":9,"use":"FD","end":"1970","lid":"#cavalier_Estevelles"},
        {"num":"_62HNP","g":1435,"len":7,"use":"FD","end":"1960","lid":"Compagnie_des_mines_de_Marles#Lapugnoy_Rimbert","af":[1329]},
        {"num":"_62TB1","g":1000,"len":15,"use":"FD","end":"1931","lid":"Tramway_de_Boulogne-sur-Mer_à_Hardelot","elect":1,"af":[1165],"info":" - TODO - + Le Portel 5km + Wimereux 7.5km "},
        {"num":"_62TBC","g":1000,"len":11,"use":"FD","end":"1940","lid":"Tramway_de_Calais","elect":1,"af":[1166],"info":" - TODO - ligne_B:Guines 11km "},
        {"num":"_63CFL1","g":1435,"len":20,"use":"FD","end":"1950","lid":"Compagnie_des_chemins_de_fer_de_la_Limagne#Gerzat_Maringues","af":[86]},
        {"num":"_63CFL2","g":1000,"len":18,"use":"FD","end":"1936","lid":"Compagnie_des_chemins_de_fer_de_la_Limagne#Riom_Volvic-PO","af":[84]},
        {"num":"_63CFL3","g":1435,"len":9,"use":"FD","end":"2013","lid":"Compagnie_des_chemins_de_fer_de_la_Limagne#Vertaizon_Billom","af":[665]},
        {"num":"_63PD1","g":1000,"len":11,"use":"FD","end":"1926","lid":"Compagnie_du_chemin_de_fer_de_Clermont-Ferrand_au_sommet_du_Puy-de-Dôme","af":[664]},
        {"num":"_63PD2","g":1000,"pk0":11,"pkf":15,"len":4,"use":"FD","end":"??","lid":"Panoramique_des_Dômes","af":[664]},
        {"num":"_64BAB","g":1435,"len":8,"use":"FD","end":"1952","lid":"Chemin_de_fer_Bayonne-Anglet-Biarritz","elect":1,"af":[440]},
        {"num":"_64CFB","g":1000,"len":22,"use":"FD","end":"1962","lid":"CFB_Mine_de_Baburet","af":[481]},
        {"num":"_64POM1","g":1000,"len":43,"use":"FD","end":"1931","lid":"Chemin_de_fer_de_Pau-Oloron-Mauléon#Oloron_Mauléon","af":[445]},
        {"num":"_64POM2","g":1000,"len":27,"use":"FD","end":"1930","lid":"Chemin_de_fer_de_Pau-Oloron-Mauléon#Pau_Pontacq","af":[442]},
        {"num":"_64POM3","g":1000,"len":66,"use":"FD","end":"1931","lid":"Chemin_de_fer_de_Pau-Oloron-Mauléon#Pau_Aire","af":[429]},
        {"num":"_64POM4","g":1000,"len":25,"use":"FD","end":"1930","lid":"Chemin_de_fer_de_Pau-Oloron-Mauléon#Pau_Monein","af":[443]},
        {"num":"_64POM5","g":1000,"len":39,"use":"FD","end":"1930","lid":"Chemin_de_fer_de_Pau-Oloron-Mauléon#Oloron_Sauveterre-de-Béarn","af":[444]},
        {"num":"_64POM6","g":1000,"len":19,"use":"FD","end":"1930","lid":"Chemin_de_fer_de_Pau-Oloron-Mauléon#St-Laurent-Bretagne_Lembeye","af":[430]},
        {"num":"_64POM7","g":1000,"len":10,"use":"FD","end":"1930","lid":"Tramway_de_Pau#Aviation","af":[482]},
        {"num":"_64Topo","g":1000,"pk0":5,"pkf":21,"len":16,"use":"EXP","lid":"Métro_de_Saint-Sébastien#E2"},
        {"num":"_64VFDM1","lid":"VFDM_Bayonne_Hendaye","af":[446]},
        {"num":"_64VFDM2","lid":"VFDM_Ciboure_Sare","af":[447]},
        {"num":"_64VFDM3","lid":"Chemin_de_fer_de_la_Rhune","af":[447]},
        {"num":"_64SM","g":1000,"len":8,"use":"FD","end":"1936","lid":"#scierie_de_Mendive","af":[1397],"info":" - TODO - "},
        {"num":"_65PCL1","g":1000,"len":2,"use":"FD","end":"1970","lid":"PCL_Cauterets-Gare-des-Oeufs_La_Raillère","elect":1,"af":[452]},
        {"num":"_65PCL2","g":1000,"len":12,"use":"FD","end":"1934","lid":"PCL_Pierrefitte-Nestalas_Esquièze-Luz","elect":1,"af":[451]},
        {"num":"_65PCL3","g":1000,"pk0":2,"pkf":11,"len":9,"use":"FD","end":"1949","lid":"PCL_Pierrefitte-Nestalas_Cauterets","elect":1,"af":[450]},
        {"num":"_65VFP","g":1000,"len":42,"use":"FD","end":"1934","lid":"VF_Lourdes_Artigues","elect":1,"af":[453]},
        {"num":"_66CFPO1","g":1000,"len":21,"use":"FD","end":"1937","lid":"Ligne_d'Arles-sur-Tech_à_Prats-de-Mollo","af":[601]},
        {"num":"_66CFPO2","g":1000,"pk0":10,"pkf":19,"len":9,"use":"FD","end":"1937","lid":"Ligne_d'Arles-sur-Tech_à_Prats-de-Mollo#embranchement_Saint-Laurent-de-Cerdans","af":[602]},
        {"num":"_66CFPO3","g":1435,"len":20,"use":"FD","end":"1950","lid":"Ligne_de_Perpignan_au_Barcarès","af":[603]},
        {"num":"_66CFPO4","g":1435,"len":11,"use":"FD","end":"1950","lid":"Ligne_de_Pia_à_Baixas","af":[604]},
        {"num":"_66CFPO5","g":1435,"len":15.6,"use":"FD","end":"1988","lid":"Ligne_de_Pia_à_Baixas","af":[605]},
        {"num":"_66TP1","g":1000,"len":13,"use":"FD","end":"1954","lid":"Tramway_de_Perpignan#Canet","elect":1,"af":[633]},
        {"num":"_66TP2","g":1000,"pk0":1,"pkf":11.5,"len":10.5,"use":"FD","end":"1935","lid":"Tramway_de_Perpignan#Rivesaltes","elect":1,"af":[633]},
        {"num":"_67TSd","g":1000,"len":12.5,"use":"EXP","lid":"Ligne_D_du_tramway_de_Strasbourg","af":[1237]},
        {"num":"_67CTS1","g":1000,"len":19,"use":"FD","end":"1953","lid":"Ancien_tramway_de_Strasbourg#Dingsheim_Westhoffen","af":[1236]},
        {"num":"_67CTS2","g":1000,"len":15,"use":"FD","end":"1956","lid":"Ancien_tramway_de_Strasbourg#Strasbourg_Truchtersheim","af":[1235]},
        {"num":"_67CTS3","g":1000,"len":35,"use":"FD","end":"1956","lid":"Ancien_tramway_de_Strasbourg#Strasbourg_Ottrott","af":[1233]},
        {"num":"_67CTS4","g":1435,"len":12,"use":"FD","end":"2002","lid":"Ligne_de_Rosheim_à_Saint-Nabor","af":[1238]},
        {"num":"_67CTS5","g":1000,"len":14,"use":"FD","end":"1960","lid":"Ancien_tramway_de_Strasbourg#Erstein-Route-du-Rhin_Meistratzheim","af":[1230,1231]},
        {"num":"_67CTS6","g":1000,"len":55,"use":"FD","end":"1957","lid":"Ancien_tramway_de_Strasbourg#Strasbourg_Marckolsheim","af":[1228]},
        {"num":"_67CTS7","g":1000,"len":2,"use":"FD","end":"1957","lid":"Ancien_tramway_de_Strasbourg#branche_Rhinau","af":[1229]},
        {"num":"_67CTS8","g":1000,"len":12,"use":"FD","end":"1937","lid":"Ancien_tramway_de_Strasbourg#Strasbourg_Breuschwickersheim","af":[1234]},
        {"num":"_68CFTR","g":1435,"pk0":1.4,"pkf":21,"len":19.6,"use":"EXP","lid":"Chemin_de_fer_touristique_du_Rhin"},
        {"num":"_68DNR","g":1435,"len":4,"use":"FD","end":"1917","lid":"#Dornach Morschwiller-le-Bas","af":[1220],"elect":1,"info":"industrie, carrières - TODO - "},
        {"num":"_68TM1","g":1000,"len":13,"use":"FD","end":"1957","lid":"Société anonyme du tramway de Mulhouse à Ensisheim et Wittenheim","af":[1145]},
        {"num":"_68TM2","g":1000,"len":17,"use":"FD","end":"1944","lid":"Société_des_tramways_de_Mulhouse#Battenheim_Ensisheim","af":[1146]},
        {"num":"_68TM3","g":1000,"len":5,"use":"FD","end":"1950","lid":"Société_des_tramways_de_Mulhouse#Pfastatt","af":[1167]},
        {"num":"_68TM4","g":1435,"len":22,"use":"EXP","end":"no","lid":"Tram-train_Mulhouse_Vallée_de_la_Thur","info":" - TODO - "},
        {"num":"_68Bale","g":1000,"len":21,"use":"FD","end":"??","lid":"Tramway_de_Bâle#frontalier"},
        {"num":"_68TMS","g":1000,"len":11,"use":"FD","end":"1914","lid":"Tramway_de_Munster_à_la_Schlucht","af":[1207],"elect":1,"info":"crémaillère - TODO - "},
        {"num":"_68TR","g":1435,"len":4,"use":"FD","end":"1938","lid":"Tramway_de_Ribeauvillé","af":[1222]},
        {"num":"_68TTT","g":1000,"len":9,"use":"FD","end":"1933","lid":"Tramway_de_Turckheim_aux_Trois-Épis","af":[1209],"elect":1,"info":" - TODO - "},
        {"num":"_68mili","g":1435,"len":21,"use":"FD","end":"1918","lid":"Ligne_d'Ensisheim_à_Habsheim","af":[1214],"info":" - TODO - "},
        {"num":"_68mili2","g":1435,"len":23,"use":"FD","end":"1918","lid":"Ligne_de_Bantzenheim_à_Haberhaeusen","af":[1226],"info":" - TODO - "},
        {"num":"_69CFB1","g":1000,"len":48,"use":"FD","end":"1934","lid":"Chemin_de_fer_du_Beaujolais#Monsols","af":[829]},
        {"num":"_69CFB2","g":1000,"len":40,"use":"FD","end":"1934","lid":"Chemin_de_fer_du_Beaujolais#Tarare","af":[832]},
        {"num":"_69CLT1","lid":"Ancien_tramway_de_Lyon#CLT_Genas","af":[804],"info":" --- TODO --- 13 km direct"},
        {"num":"_69CRL","g":1000,"len":31,"use":"FD","end":"1935","lid":"Chemins_de_fer_départementaux_de_Rhône_et_Loire","af":[808]},
        {"num":"_69FOL1","g":1000,"len":14.9,"use":"FD","end":"1954","lid":"Fourvière_Ouest-Lyonnais#Vaugneray","af":[812],"info":" + 813,814,815 "},
        {"num":"_69FOL2","g":1000,"pk0":9.8,"pkf":27.5,"len":17.7,"use":"FD","end":"1935","lid":"Fourvière_Ouest-Lyonnais#Mornant","af":[810,811],"info":" 28 km +projet"},
        {"num":"_69IL1","g":1435,"len":15,"use":"FD","end":"1935","lid":"#Amplepuis_Saint-Vincent-de-Reins","af":[824]},
        {"num":"_69RSL1","g":1000,"len":29,"use":"FD","end":"1934","lid":"Chemins_de_fer_départementaux_du_Rhône_-_Saône-et-Loire#La-Clayette","af":[829]},
        {"num":"_69RSL2","g":1000,"len":34,"use":"FD","end":"1934","lid":"Chemins_de_fer_départementaux_du_Rhône_-_Saône-et-Loire#Cluny","af":[830]},
        {"num":"_69SVC","g":1435,"len":14,"use":"FD","end":"1969","lid":"SVC_Saint-Victor_Cours","af":[828]},
        {"num":"_69SVT","lid":"SVC_Saint-Victor_Thizy","af":[841],"info":" --- TODO --- 7 km "},
        {"num":"_69OTL1","g":1000,"len":8.3,"use":"FD","end":"1941","lid":"Ancien_tramway_de_Lyon#OTL_Limonest","elect":1,"af":[801]},
        {"num":"_69OTL1","g":1000,"len":20,"use":"FD","end":"1941","lid":"Ancien_tramway_de_Lyon#OTL_Ligne17_Montluel","elect":1,"af":[803],"info":" --- TODO --- 20 km 1 corresp"},
        {"num":"_69OTL1","g":1000,"len":8.3,"use":"FD","end":"1941","lid":"Ancien_tramway_de_Lyon#OTL_Ligne17_Rillieux-la-Pape","elect":1,"af":[803],"info":" --- TODO --- branche"},
        {"num":"_69TVS","g":1000,"len":16.2,"use":"FD","end":"1957","lid":"Train_bleu_du_Val_de_Saône","elect":1,"af":[802]},
        {"num":"_70CFV1","g":1000,"len":18,"use":"FD","end":"1937","lid":"Chemins_de_fer_vicinaux_de_la_Haute-Saône#Marnay_Gy","af":[863]},
        {"num":"_70CFV2","g":1000,"len":62,"use":"FD","end":"1938","lid":"Chemins_de_fer_vicinaux_de_la_Haute-Saône#Ancier_Jussey","af":[866]},
        {"num":"_70CFV3","g":1000,"len":33,"use":"FD","end":"1937","lid":"Chemins_de_fer_vicinaux_de_la_Haute-Saône#Courcelles_Vauvillers","af":[884]},
        {"num":"_70CFV4","g":1000,"len":55,"use":"FD","end":"1938","lid":"Chemins_de_fer_vicinaux_de_la_Haute-Saône#Gray_Dole","af":[859]},
        {"num":"_70CFV5","g":1000,"len":40,"use":"FD","end":"1938","lid":"Chemins_de_fer_vicinaux_de_la_Haute-Saône#Gray_Grandvelle","af":[862]},
        {"num":"_70CFV6","g":1000,"len":24,"use":"FD","end":"1938","lid":"Chemins_de_fer_vicinaux_de_la_Haute-Saône#LaVerrerie_Saint-Antoine","af":[892]},
        {"num":"_70CFV7","g":1000,"len":31,"use":"FD","end":"1938","lid":"Chemins_de_fer_vicinaux_de_la_Haute-Saône#Le-Mortard_Le-Thillot","af":[893]},
        {"num":"_70CFV8","g":1000,"len":43,"use":"FD","end":"1938","lid":"Chemins_de_fer_vicinaux_de_la_Haute-Saône#Lure_Héricourt","af":[875]},
        {"num":"_70CFV9","g":1000,"len":70,"use":"FD","end":"1938","lid":"Chemins_de_fer_vicinaux_de_la_Haute-Saône#Vesoul_Besançon","af":[851]},
        {"num":"_70CFV10","g":1000,"len":61,"use":"FD","end":"1937","lid":"Chemins_de_fer_vicinaux_de_la_Haute-Saône#Vesoul_Corravillers","af":[883]},
        {"num":"_70CFV11","g":1000,"len":46,"use":"FD","end":"1937","lid":"Chemins_de_fer_vicinaux_de_la_Haute-Saône#Vesoul_Molay","af":[868]},
        {"num":"_70CFV12","g":1000,"len":38,"use":"FD","end":"1937","lid":"Chemins_de_fer_vicinaux_de_la_Haute-Saône#Vesoul_Saint-Georges","af":[872]},
        {"num":"_71CFD1","g":1435,"len":3,"use":"FD","end":"1957","lid":"#Bourbon-Lancy-Le_Fourneau_Bourbon-Lancy-Ville","af":[946]},
        {"num":"_71CFD2","g":1000,"len":43,"use":"FD","end":"1939","lid":"#Bourbon-Lancy-Ville_Toulon-sur-Arroux","af":[946]},
        {"num":"_71CFD3","g":1000,"len":53,"use":"FD","end":"1953","lid":"#Digoin-Etang-sur-Arroux","af":[945],"info":" ligne - TODO - "},
        {"num":"_71IL1","g":1000,"len":45,"use":"FD","end":"1935","lid":"#Beaubery_Montceau-les-Mines","af":[951],"info":" ligne - TODO - "},
        {"num":"_71IL2","g":1000,"len":36,"use":"FD","end":"1935","lid":"#Mâcon_Fleurville","af":[954],"info":" ligne - TODO - "},
        {"num":"_71SL1","g":1000,"len":31,"use":"FD","end":"1945","lid":"Compagnie_des_chemins_de_fer_d'intérêt_local_de_Saône-et-Loire#Chalon_Mervans","af":[1177]},
        {"num":"_71SL2","g":1000,"len":33,"use":"FD","end":"1945","lid":"Compagnie_des_chemins_de_fer_d'intérêt_local_de_Saône-et-Loire#Tournus_Louhans","af":[1178],"info":" - TODO - "},
        {"num":"_72MSC","g":1000,"pk0":1.5,"pkf":77,"len":75.5,"use":"FD","end":"1977","lid":"Chemin_de_fer_Mamers_-_Saint-Calais","af":[103]},
        {"num":"_72TS1","g":1000,"len":56,"use":"FD","end":"1947","lid":"Tramways_de_la_Sarthe#LeMans_Saint-Jean-sur-Erve","af":[193]},
        {"num":"_72TS2","g":1000,"len":26,"use":"FD","end":"1932","lid":"Tramways_de_la_Sarthe#Cérans_La-Flèche","af":[210]},
        {"num":"_72TS3","g":1000,"len":54,"use":"FD","end":"1944","lid":"Tramways_de_la_Sarthe#Changé_Château-du-Loir","af":[206]},
        {"num":"_72TS4","g":1000,"len":32,"use":"FD","end":"1932","lid":"Tramways_de_la_Sarthe#Fresnay-Alençon","af":[75]},
        {"num":"_72TS5","g":1000,"len":42,"use":"FD","end":"1947","lid":"Tramways_de_la_Sarthe#Détourbe_Montmirail","af":[202]},
        {"num":"_72TS6","g":1000,"len":26,"use":"FD","end":"1947","lid":"Tramways_de_la_Sarthe#Grand-Lucé_Saint-Calais","af":[205]},
        {"num":"_72TS7","g":1000,"len":52,"use":"FD","end":"1947","lid":"Tramways_de_la_Sarthe#Le-Mans_La-Chartre-sur-le-Loir","af":[204]},
        {"num":"_72TS8","g":1000,"len":49,"use":"FD","end":"1946","lid":"Tramways_de_la_Sarthe#Le-Mans_Mayet","af":[209]},
        {"num":"_72TS9","g":1000,"len":37,"use":"FD","end":"1940","lid":"Tramways_de_la_Sarthe#Le-Mans_Ségrie","af":[211]},
        {"num":"_72TS10","g":1000,"len":11,"use":"FD","end":"1969","lid":"Tramways_de_la_Sarthe#Saint-Jean-d'Assé_Ballon","af":[212]},
        {"num":"_72TS11","g":1000,"pk0":5,"pkf":7,"len":2,"use":"FD","end":"1969","lid":"TS1_embranchement_Montbizot","af":[212]},
        {"num":"_72TS12","g":1000,"len":52,"use":"FD","end":"1947","lid":"Tramways_de_la_Sarthe#Le-Mans_Mamers","af":[201]},
        {"num":"_72TS13","lid":"Tramways_de_la_Sarthe#Ségrie_Assé-le-Boisne","af":[542]},
        {"num":"_72TS14","lid":"Tramways_de_la_Sarthe#Mamers_Alençon","af":[546]},
        {"num":"_73MC","g":1100,"len":60,"use":"FD","end":"1871","lid":"Chemin_de_fer_du_Mont-Cenis","wi":"Ferrovia_del_Moncenisio","af":[776],"fa":236},
        {"num":"_73PLA","g":1435,"len":12,"use":"FD","end":"1988","lid":"Tramway_de_Pontcharra_à_la_Rochette_et_Allevard","af":[769]},
        {"num":"_73TPB","g":1000,"len":17,"use":"FD","end":"1953","lid":"Tramway_de_Pont-de-Beauvoisin","af":[774]},
        {"num":"_73VFAF","g":1000,"len":6,"use":"FD","end":"1928","lid":"VFA_Moûtiers_Brides-les-Bains","elect":1,"af":[768]},
        {"num":"_74CEVA","g":1000,"pk0":60.26,"pkf":76.39,"len":16.13,"use":"EXP","lid":"CEVA"},
        {"num":"_74CEN1","g":1000,"len":51,"use":"FD","end":"1959","lid":"CEN_Réseau_de_la_Haute-Savoie#Annemasse_Sixt-Fer-à-Cheval","elect":1,"af":[749]},
        {"num":"_74CEN2","g":1000,"len":13,"use":"FD","end":"1927","lid":"CEN_Réseau_de_la_Haute-Savoie#Bonne-sur-Ménoge_Bonneville","af":[750]},
        {"num":"_74CEN3","g":1000,"len":9,"use":"FD","end":"1946","lid":"CEN_Réseau_de_la_Haute-Savoie#Pont-du-Risse_Marignier","af":[751]},
        {"num":"_74GTE1","g":1435,"len":23,"use":"FD","end":"1958","lid":"Compagnie_genevoise_des_tramways_électriques#Saint-Julien-en-Genevois_Etrembières","af":[761,763]},
        {"num":"_74GTE2","g":1000,"len":15,"use":"FD","end":"1956","lid":"Compagnie_genevoise_des_tramways_électriques#Genève-Rive_Carouge","wf":"Société_du_chemin_de_fer_Genève_-_Veyrier","af":[761,767]},
        {"num":"_74SAL1","g":1000,"len":5.8,"use":"FD","end":"1932","lid":"Chemin_de_fer_du_Salève#Etrembières_Treize-Arbres","af":[762]},
        {"num":"_74SAL2","g":1000,"len":3,"use":"FD","end":"1935","lid":"Chemin_de_fer_du_Salève#Etrembières_Veyrier","af":[762]},
        {"num":"_74TAT","g":1000,"len":22,"use":"FD","end":"1930","lid":"Tramway_d'Annecy_à_Thônes","af":[748]},
        {"num":"_76SÉ1","g":1000,"len":52,"use":"FD","end":"1947","lid":"#Aumale_Envermeu","af":[939,942]},
        {"num":"_76TSRC","g":1000,"len":4,"use":"FD","end":"1929","lid":"Tramway_de_Saint-Romain-de-Colbosc","af":[948]},
        {"num":"_76CFN1","g":1000,"len":34,"use":"FD","end":"1947","lid":"CFN_Gueures_Clères","af":[933]},
        {"num":"_76CFN2","g":1000,"len":32,"use":"FD","end":"1947","lid":"CFN_Ouville-la-Rivière_Motteville","af":[932]},
        {"num":"_77CFD1","g":1000,"len":45,"use":"FD","end":"1947","lid":"Ligne_de_la_Ferté-sous-Jouarre_à_Montmirail","af":[989]},
        {"num":"_77CFD2","g":1000,"len":20,"use":"FD","end":"1934","lid":"Ligne_de_Lagny_à_Mortcerf","af":[982]},
        {"num":"_77CFD3","g":1000,"len":51.4,"use":"FD","end":"1960","lid":"Ligne_de_Montereau_à_Château-Landon","af":[993]},
        {"num":"_77CFD4","g":1000,"len":41,"use":"FD","end":"1956","lid":"Ligne_de_Sens_à_Égreville","af":[1010]},
        {"num":"_77CFD5","g":1000,"len":29.27,"use":"FD","end":"1958","lid":"Tramway_de_Meaux_à_Dammartin","af":[985]},
        {"num":"_77TSM1","g":1000,"len":22,"use":"FD","end":"1938","lid":"Tramway_Sud_de_Seine-et-Marne#Milly_Chailly","af":[976]},
        {"num":"_77TSM2","g":1000,"len":12,"use":"FD","end":"1938","lid":"Tramway_Sud_de_Seine-et-Marne#Melun_Barbizon","af":[977]},
        {"num":"_77SÉ1","g":1000,"len":89,"use":"FD","end":"1965","lid":"Tramway_de_Sablonnières_à_Bray-sur-Seine","af":[981]},
        {"num":"_77SÉ1bis","g":1000,"len":6.5,"use":"FD","end":"1950","lid":"#embranchement_Gastins"},
        {"num":"_77SÉ2","g":1000,"len":23.5,"use":"FD","end":"1950","lid":"Tramway_de_Jouy-le-Châtel_à_Marles-en-Brie","af":[980]},
        {"num":"_77SÉ3","g":1000,"len":18.4,"use":"FD","end":"1951","lid":"Tramway_de_Verneuil-l'Étang_à_Melun","af":[978]},
        {"num":"_78CGB1","g":1435,"len":9,"use":"FD","end":"1948","lid":"CGB_Bouville_La_Ferté-Alais","af":[973]},
        {"num":"_78CGB2","g":1435,"len":55,"use":"FD","end":"1953","lid":"CGB_Corbeil_Saint-Martin-d'Etampes","af":[972]},
        {"num":"_78CGB3","g":1435,"len":30,"use":"FD","end":"1948","lid":"CGB_Étampes_Arpajon","af":[971]},
        {"num":"_78CGB4","g":1435,"len":16,"use":"FD","end":"1949","lid":"CGB_Pontoise_Sagy","af":[965]},
        {"num":"_78CGB5","g":1435,"len":52,"use":"FD","end":"1944-1949","lid":"CGB_Saint-Germain_Magny-en-Vexin","af":[963]},
        {"num":"_78CGB6","g":1435,"len":38,"use":"FD","end":"1951","lid":"Tramway_de_Versailles_à_Maule","af":[966]},
        {"num":"_78CGB7","g":1435,"len":22,"use":"FD","end":"1934","lid":"CGB_Saint-Germain_Gency","af":[964]},
        {"num":"_78STCRP1","g":1435,"pk0":6,"pkf":37,"len":31,"use":"FD","end":"1944","lid":"Chemin_de_fer_Paris_-_Arpajon","af":[968]},
        {"num":"_78STCRP2","g":1435,"len":3,"use":"FD","end":"1936","lid":"Chemin_de_fer_Paris_-_Arpajon#Montlhéry_Marcoussis","af":[968]},
        {"num":"_78SÉ1","g":1000,"len":6,"use":"FD","end":"1951","lid":"#Chars_Marines","af":[960]},
        {"num":"_78SÉ2","g":1000,"len":22,"use":"FD","end":"1951","lid":"Ligne_de_Valmondois_à_Marines","af":[961]},
        {"num":"_78RERA","g":1000,"len":4.7,"use":"EXP","lid":"RER_A#ouest"},
        {"num":"_78RERB","g":1000,"pk0":6.3,"pkf":10.2,"len":3.9,"use":"EXP","lid":"RER_B"},
        {"num":"_78TLB","g":1435,"len":3.3,"use":"FD","end":"1930","lid":"Tramway_de_Livry_à_Gargan","af":[986],"info":" - TODO - "},
        {"num":"_78STV","g":1000,"len":3,"use":"FD","end":"1949","lid":"Tramway_de_Villiers-le-Bel","elect":1,"af":[1395]},
        {"num":"_79CFD1","g":1000,"len":25,"use":"FD","end":"1950","lid":"#Épannes_Ferrières-d'Aunis","af":[272]},
        {"num":"_79CFD2","g":1000,"len":70,"use":"FD","end":"1950","lid":"#Saint-Jean-d'Angély_Saint-Saviol","af":[88]},
        {"num":"_79TDS1","g":1000,"len":43,"use":"FD","end":"1939","lid":"TDS_Parthenay_Saint-Maixent","af":[307]},
        {"num":"_79TDS2","g":1000,"len":31,"use":"FD","end":"1939","lid":"TDS_Saint-Maixent_Lezay","af":[308]},
        {"num":"_79TDS3","g":1000,"pk0":31,"pkf":49,"len":18,"use":"FD","end":"1975","lid":"TDS_Lezay_Melle","af":[308]},
        {"num":"_79TDS4","g":1000,"len":62,"use":"FD","end":"1939","lid":"TDS_Bressuire-Etat_Montreuil-Bellay","af":[187],"if":"49/49215.a.pdf"},

        {"num":"_80%j","g":1435,"len":89,"use":"FD","end":"1920","lid":"Ligne_de_Feuquières_à_Ponthoile","af":[1094],"info":"ligne des 100 jours"},
        {"num":"_80%j1","g":1435,"len":1,"use":"FD","end":"1920","lid":"shunt_321","af":[1094]},
        {"num":"_80%j2","g":1435,"len":1,"use":"FD","end":"1920","lid":"shunt_322","af":[1094]},
        {"num":"_80%j3","g":1435,"len":1,"use":"FD","end":"1920","lid":"shunt_322N","af":[1094]},
        {"num":"_80%j4","g":1435,"len":1,"use":"FD","end":"1920","lid":"shunt_CFBS","af":[1094]},
        {"num":"_80CFBS1","g":1000,"len":7.4,"use":"FD","end":"??","lid":"Chemin_de_fer_de_la_baie_de_Somme#Crotoy"},
        {"num":"_80CFBS2","g":1000,"pk0":5.3,"pkf":17.2,"len":11.9,"use":"FD","end":"??","lid":"Chemin_de_fer_de_la_baie_de_Somme#Cayeux"},
        {"num":"_80SÉ1","g":1000,"len":34,"use":"FD","end":"1965","lid":"Chemins_de_fer_départementaux_de_la_Somme#Abbeville_Dompierre-sur-Authie","af":[1072]},
        {"num":"_80SÉ2","g":1000,"len":42,"use":"FD","end":"1949","lid":"Chemins_de_fer_départementaux_de_la_Somme#Albert_Doullens","af":[1085]},
        {"num":"_80SÉ3","g":1000,"len":75,"use":"FD","end":"1949","lid":"Chemins_de_fer_départementaux_de_la_Somme#Albert_Ham","af":[1082]},
        {"num":"_80SÉ4","g":1000,"pk0":1,"pkf":58,"len":57,"use":"FD","end":"1947","lid":"#Amiens-Saint-Roch_Aumale"},
        {"num":"_80SÉ5","g":1435,"len":12,"use":"FD","end":"1946","lid":"Société_générale_des_chemins_de_fer_économiques_(France)#Woincourt_Onival","af":[1075]},
        {"num":"_80SÉ6","g":1000,"len":53,"use":"FD","end":"1948","lid":"Chemins_de_fer_départementaux_de_la_Somme#Fricourt_Montdidier","af":[1080]},
        {"num":"_80SÉ7","g":1000,"len":11,"use":"FD","end":"1956","lid":"Chemins_de_fer_départementaux_de_la_Somme#Noyelles_Forest-l'Abbaye","af":[1073]},
        {"num":"_80SÉ8","g":1000,"len":33,"use":"FD","end":"1955","lid":"Chemins_de_fer_départementaux_de_la_Somme#Offoy_Bussy","af":[1068]},
        {"num":"_81CFDT1","g":1000,"len":33,"use":"FD","end":"1939","lid":"CFDT_Albi-Orléans_Alban","af":[322]},
        {"num":"_81CFDT2","g":1000,"pk0":3,"pkf":29,"len":26,"use":"FD","end":"1939","lid":"CFDT_Albi-Orléans_Valence-d'Albigeois","af":[318]},
        {"num":"_81CFDT3","g":1000,"len":75,"use":"FD","end":"1962","lid":"CFDT_Castres-Midi_Murat-sur-Vèbre","af":[320]},
        {"num":"_81CFDT4","g":1000,"len":12,"use":"FD","end":"1962","lid":"CFDT_Le Bouissas_Brassac","af":[321],"if":["81/81227.a.pdf"]},
        {"num":"_81VFDM","g":1000,"pk0":4,"pkf":30,"len":26,"use":"FD","end":"1939","lid":"VFDM_Beaupré_Revel","elect":1,"af":[325]},
        {"num":"_82TTG1","g":1000,"len":35,"use":"FD","end":"1933","lid":"Tramways_de_Tarn-et-Garonne#Montauban_Molières","af":[490]},
        {"num":"_82TTG2","g":1000,"len":29,"use":"FD","end":"1933","lid":"Tramways_de_Tarn-et-Garonne#Gasseras_Verdun-sur-Garonne","af":[491]},
        {"num":"_82TTG3","g":1000,"len":25,"use":"FD","end":"1933","lid":"Tramways_de_Tarn-et-Garonne#Montauban_Monclar","af":[483]},
        {"num":"_82TTG4","g":1000,"len":26,"use":"FD","end":"1933","lid":"Tramways_de_Tarn-et-Garonne#Castelsarrasin_Lavit","af":[488]},
        {"num":"_82TTG5","g":1000,"len":22,"use":"FD","end":"1933","lid":"Tramways_de_Tarn-et-Garonne#Caussade_Caylus","af":[487]},
        {"num":"_82TTG6","g":1000,"len":43,"use":"FD","end":"1933","lid":"Tramways_de_Tarn-et-Garonne#Valence-d'Agen_Montaigu","af":[489]},
        {"num":"_83SF1","g":1000,"pk0":12.8,"pkf":107,"len":94.2,"use":"FD","end":"1949","lid":"Ligne_Central-Var","sa":"Ligne_Colomars_-_Meyrargues","af":[63]},
        {"num":"_83SF2","g":1000,"len":83,"use":"FD","end":"1949","lid":"Ligne_Central-Var#Draguignan_Meyrargues","sa":"Ligne_Colomars_-_Meyrargues","af":[62]},
        {"num":"_83CP1","g":1000,"len":12,"use":"FD","end":"1949","lid":"Tramway_Cogolin_-_Saint-Tropez","af":[714]},
        {"num":"_83CP2","g":1000,"len":23,"use":"FD","end":"1949","lid":"Chemins_de_fer_de_Provence#Toulon_Hyères","af":[713]},
        {"num":"_83CP3","g":1000,"len":84,"use":"FD","end":"1948","lid":"Chemins_de_fer_de_Provence#Hyères_Saint-Raphael","af":[713]},
        {"num":"_83CP4","g":1000,"len":3,"use":"FD","end":"1948","lid":"Chemins_de_fer_de_Provence#branche_usine_Schneider","af":[713]},
        {"num":"_83OV1","g":1000,"len":14,"use":"FD","end":"1936","lid":"Tramways_électriques_de_l'Ouest_Varois#La-Seyne","af":[718]},
        {"num":"_83OV2","g":1000,"len":9,"use":"FD","end":"1936","lid":"Tramways_électriques_de_l'Ouest_Varois#Le-Beausset","af":[719]},
        {"num":"_83STVG1","g":1000,"len":8,"use":"FD","end":"1955","lid":"Tramway_de_Toulon#Ollioules","elect":1,"af":[720]},
        {"num":"_83STVG2","g":1000,"len":8,"use":"FD","end":"1955","lid":"Tramway_de_Toulon#Les-Sablettes","elect":1,"af":[720]},
        {"num":"_83STVG3","g":1000,"len":17,"use":"FD","end":"1936","lid":"Tramway_de_Toulon#Hyères","elect":1,"af":[721]},
        {"num":"_83STVG4","g":1000,"len":7,"use":"FD","end":"1936","lid":"Tramway_de_Toulon#La-Garde","elect":1,"af":[721]},
        {"num":"_85TV1","g":1000,"len":91,"use":"FD","end":"1949","lid":"Ligne_de_Bourgneuf_aux_Sables-d'Olonne","af":[198]},
        {"num":"_85TV2","g":1435,"len":6,"use":"FD","end":"1959","lid":"#LePallet_Vallet","af":[176]},
        {"num":"_85TV3","g":1000,"len":25,"use":"FD","end":"1949","lid":"#Challans-Etat_Fromentine","af":[199]},
        {"num":"_85TV4","g":1000,"len":35,"use":"FD","end":"1940","lid":"#Roche-sur-Yon_Legé","af":[149]},
        {"num":"_85TV5","g":1000,"len":43,"use":"FD","end":"1948","lid":"#Roche-sur-Yon_Herbiers-Etat","af":[194]},
        {"num":"_85TV6","g":1000,"len":61,"use":"FD","end":"1949","lid":"#Sables-d'Olonne_Luçon-Etat","af":[195]},
        {"num":"_85TV7","g":1000,"len":22,"use":"FD","end":"1949","lid":"#Luçon-Etat_L'Aiguillon-Port","af":[134]},
        {"num":"_85TV8","g":1000,"len":74,"use":"FD","end":"1949","lid":"#Luçon_Montaigu","af":[197]},
        {"num":"_85TV9","g":1000,"len":24,"use":"FD","end":"1948","lid":"#Talmont_Champ-Saint-Père","af":[196]},
        {"num":"_86TV","g":1000,"len":48,"use":"FD","end":"1934","lid":"#Poitiers_St-Martin-l'Ars","af":[331]},
        {"num":"_86VFEP1","g":1000,"len":69,"use":"FD","end":"2014","lid":"#Châtellerault_Bouresse","af":[334]},
        {"num":"_86VFEP2","g":1000,"len":22,"use":"FD","end":"1932","lid":"#Lencloître_Neuville-de-Poitou","af":[273]},
        {"num":"_86VFEP3","g":1000,"len":50,"use":"FD","end":"1934","lid":"#Neuville-de-Poitou_Lusignan","af":[273]},
        {"num":"_86VFEP4","g":1000,"len":23,"use":"FD","end":"1934","lid":"#Poitiers_Lavausseau","af":[329]},
        {"num":"_87CDHV1","g":1000,"len":54,"use":"FD","end":"1949","lid":"Chemins_de_fer_départementaux_de_la_Haute-Vienne#Limoges_Saint-Mathieu","elect":1,"af":[510]},
        {"num":"_87CDHV2","g":1000,"len":19,"use":"FD","end":"1937","lid":"Chemins_de_fer_départementaux_de_la_Haute-Vienne#Saint-Mathieu_Rochechouart","elect":1,"af":[510]},
        {"num":"_87CDHV3","g":1000,"len":41,"use":"FD","end":"1949","lid":"Chemins_de_fer_départementaux_de_la_Haute-Vienne#Limoges_Saint-Junien","elect":1,"af":[511]},
        {"num":"_87CDHV4","g":1000,"len":43,"use":"FD","end":"1949","lid":"Chemins_de_fer_départementaux_de_la_Haute-Vienne#La-Tuilière_Bussière","elect":1,"af":[512]},
        {"num":"_87CDHV5","g":1000,"len":79,"use":"FD","end":"1949","lid":"Chemins_de_fer_départementaux_de_la_Haute-Vienne#Limoges_St-Sulpice-les-Feuilles","elect":1,"af":[513]},
        {"num":"_87CDHV6","g":1000,"len":30,"use":"FD","end":"1937","lid":"Chemins_de_fer_départementaux_de_la_Haute-Vienne#Rancon_Bussières","elect":1,"af":[514]},
        {"num":"_87CDHV7","g":1000,"len":19,"use":"FD","end":"1937","lid":"Chemins_de_fer_départementaux_de_la_Haute-Vienne#Planchettes_Razès","elect":1,"af":[515]},
        {"num":"_88CRC","g":1435,"len":27.9,"use":"FD","end":"1939-1962","lid":"Ligne_de_Charmes_à_Rambervillers","af":[1289]},
        {"num":"_88SCFES","g":1435,"len":9,"use":"FD","end":"1982","lid":"Ligne_d'Étival_à_Senones","af":[1278]},
        {"num":"_88SATSM","g":1000,"len":6,"use":"FD","end":"1951","lid":"Tramway_de_Moussey"},
        {"num":"_88STG","g":1000,"len":27,"use":"FD","end":"1939","lid":"Tramway_de_Gérardmer","af":[1208]},
        {"num":"_88SCFVC","g":1000,"len":24,"use":"FD","end":"1950","lid":"Ligne_de_Raon-l'Étape_à_Raon-sur-Plaine","af":[1279]},
        {"num":"_88SÉ1","g":1000,"len":26,"use":"FD","end":"1935","lid":"Tramway_de_Remiremont_à_Gérardmer","af":[1285]},
        {"num":"_89IL1","g":1000,"len":10,"use":"FD","end":"1938","lid":"CFD_Réseau_de_l'Yonne#Aillant_Fleury","af":[1186]},
        {"num":"_89IL2","g":1000,"len":34,"use":"FD","end":"1938","lid":"CFD_Réseau_de_l'Yonne#Joigny_Auxerre","af":[1187]},
        {"num":"_89IL3","g":1000,"len":37,"use":"FD","end":"1938","lid":"Ligne_de_Joigny_à_Toucy","af":[1185]},
        {"num":"_89CFD1","g":1000,"len":75,"use":"FD","end":"1951","lid":"Tacot_du_Serein#Laroche-Migennes_L'Isle-Angély","af":[1184]},
        {"num":"_89CFD2","g":1000,"pk0":3,"pkf":57,"len":54,"use":"FD","end":"1938","lid":"Lignes_Sens_-_Villeneuve-l'Archevêque_et_Saint-Maurice-aux-Riches-Hommes_-_Nogent-sur-Seine","af":[1008]},
        {"num":"_89CFD3","g":1000,"len":14,"use":"FD","end":"1934","lid":"Lignes_Sens_-_Villeneuve-l'Archevêque_et_Saint-Maurice-aux-Riches-Hommes_-_Nogent-sur-Seine","af":[1009]},
        {"num":"_90IL1","g":1000,"len":16,"use":"FD","end":"1948","elect":1,"lid":"#Belfort-Ville_Étueffont","af":[901]},
        {"num":"_90IL2","g":1000,"pk0":11,"pkf":17,"len":6,"use":"FD","end":"1934","elect":1,"lid":"#Les_Errues_Rougemont-le-Château","af":[901]},
        {"num":"_90IL3","g":1000,"pk0":11,"pkf":16,"len":5,"use":"FD","end":"1936","elect":1,"lid":"#Les_Errues_Lachapelle-sous-Rougemont","af":[901]},
        {"num":"_90IL4","g":1000,"len":27,"use":"FD","end":"1932","elect":1,"lid":"#Belfort-Ville_Réchésy","af":[900]},
        {"num":"_90IL5","g":1000,"len":16,"use":"FD","end":"1944","lid":"Compagnie_des_Chemins_de_fer_d'intérêt_local_du_Territoire_de_Belfort#Sochaux","af":[882]},
        {"num":"_90mili","g":1000,"len":8,"use":"FD","end":"1921","lid":"#Lachapelle-sous-Rougemont_Sentheim","elect":1,"af":[1119],"info":" - ligne mili viz Mortzwiller TODO - +:n° 1120 ?? - "}

    ];
    if(subset.toLowerCase().startsWith("off")) return lineOff;
    if(subset.toLowerCase().startsWith("sec")) return lineSec;
    return lineOff.concat(lineSec);
}

/* **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** *\
 * getGareBelge
 */
function ALTER_getGareBelge(slugare){
	const t1 = "Les gares belges d'autrefois. Guy Demeulder";
	const t2 = "Création et maintenance: contact@garesbelges.be  Mises à jour: oct 2022";
	const base = "https:// www.garesbelges.be/";
	const garesbelgeslist = [
{"href":"brux/anderlecht.htm","desc":"Anderlecht (3 vues)"},
{"href":"brux/arcades.htm","desc":"Arcades (16 vues/1 plan)"},
{"href":"brux/auderghem.htm","desc":"Auderghem (2 vues)"},
{"href":"brux/berchem_sainte_agathe.htm","desc":"Berchem Sainte Agathe (17 vues)"},
{"href":"brux/bockstael.htm","desc":"Bockstael (6 vues)"}, 
{"href":"brux/boitsfort.htm","desc":"Boitsfort I-II (3 vues)"},
{"href":"brux/boitsfort_foret.htm","desc":"Boitsfort Forêt de Soignes"},
{"href":"brux/boondael.htm","desc":"Boondael/Boondaal (6 vues)"},
{"href":"brux/bordet.htm","desc":"Bordet (4 vues)"},
{"href":"brux/bruxelles_allee_verte.htm","desc":"Bruxelles Allée Verte (3 vues)"},
{"href":"brux/bruxelles_bogards.htm","desc":"Bruxelles gare des Bogards (2 vues)"},
{"href":"brux/bruxelles_central.htm","desc":"Bruxelles Central (7 vues)"},
{"href":"brux/bruxelles_chaussee_de_louvain.htm","desc":"Bruxelles Ch de Louvain (3 vues)"},
{"href":"brux/bruxelles_chapelle.htm","desc":"Bruxelles Chapelle"}, 
{"href":"brux/bruxelles_congres.htm","desc":"Bruxelles Congrès (4 vues)"},
{"href":"brux/bruxelles_congres_2019.htm","desc":"Bruxelles Cong. 2019/22 (28 photos)"},
{"href":"brux/bruxelles_midi_I.htm","desc":"Bruxelles Midi I (9 vues)"},
{"href":"brux/bruxelles_midi_II.htm","desc":"Bruxelles Midi II (3 vues - 1 plan)"},
{"href":"brux/bruxelles_midi_III.htm","desc":"Bruxelles Midi III (4 vues)"},
{"href":"brux/bruxelles_nord_I.htm","desc":"Bruxelles Nord I (17 vues/1 plan)"},
{"href":"brux/bruxelles_nord_II.htm","desc":"Bruxelles Nord II (7 vues)"},
{"href":"brux/bruxelles_luxembourg.htm","desc":"Bruxelles Luxembourg I (16 vues)"},
{"href":"brux/bruxelles_luxembourg_II.htm","desc":"Bruxelles Luxembourg II (6 vues)"},
{"href":"brux/bruxelles_ouest.htm","desc":"Bruxelles Ouest (15 vues)"},
{"href":"brux/bruxelles_schuman.htm","desc":"Bruxelles Schuman (6 vues)"},
{"href":"brux/bruxelles_rue_de_la_loi.htm","desc":"Bruxelles rue de la Loi"},
{"href":"brux/cureghem.htm","desc":"Cureghem (2 vues)"},
{"href":"brux/jette.htm","desc":"Jette (13 vues)"},
{"href":"brux/etterbeek.htm","desc":"Etterbeek  I-II-III (20 vues)"},
{"href":"brux/evere.htm","desc":"Evere (7 vues)"},
{"href":"brux/germoir.htm","desc":"Germoir/Mouterij (12 vues)"},
{"href":"brux/haren.htm","desc":"Haren (14 vues)"},
{"href":"brux/haren_sud.htm","desc":"Haren Sud I-II (15 vues)"},
{"href":"brux/koekelberg.htm","desc":"Koekelberg (4 vues)"},
{"href":"brux/laeken.htm","desc":"Laeken (5 vues)"},
{"href":"brux/laeken_halte_royale.htm","desc":"Laeken H.R. (7 vues)"},
{"href":"brux/meiser.htm","desc":"Meiser (21 vues)"},
{"href":"brux/moensberg.htm","desc":"Moensberg (5 vues)"},
{"href":"brux/uccle_calevoet.htm","desc":"Uccle Calevoet (20 vues)"},
{"href":"brux/uccle_stalle.htm","desc":"Uccle Stalle (15 vues)"},
{"href":"brux/forest_midi.htm","desc":"Forest Midi (2 vues)"},
{"href":"brux/forest_est.htm","desc":"Forest Est (14 vues)"},
{"href":"brux/schaerbeek.htm","desc":"Schaerbeek I-II (8 vues + 2 bonus)"},
{"href":"brux/saint_job.htm","desc":"Saint-Job (9 vues)"},
{"href":"brux/simonis.htm","desc":"Simonis (10 vues)"},
{"href":"brux/tour_taxis_I.htm","desc":"Tour et Taxis (march) I (8 vues)"},
{"href":"brux/tour_taxis_I_2019.htm","desc":"Tour et Taxis (march) I en 2019 (23 vues)"},
{"href":"brux/tour_taxis_II.htm","desc":"Tour et Taxis (voy) II (6 vues)"},
{"href":"brux/vivier_d_oie.htm","desc":"Vivier d'Oie/Diesdelle (11 vues)"},
{"href":"brux/watermael.htm","desc":"Watermael (18 vues)"},
{"href":"brux/woluwe_saint_pierre.htm","desc":"Woluwé Saint Pierre (3 vues)"},
{"href":"brux/woluwe_avenue_tervueren.htm","desc":"Woluwé arrêt Av Tervueren (2 vues)"}, 

{"href":"antwerpen_centraal.htm","desc":"Antwerpen Centraal (17 vues)"},
{"href":"antwerpen_centraal_2012.htm","desc":"Antwerpen Centraal 2012 (11 vues)"},
{"href":"antwerpen_dam.htm","desc":"Antwerpen Dam (25 vues)"},
{"href":"antwerpen_linkeroever.htm","desc":"Antwerpen Linkeroever (10 v/2 p)"},
{"href":"antwerpen_luchtbal.htm","desc":"Antwerpen Luchtbal (15 vues)"}, 
{"href":"antwerpen_noorderdokken.htm","desc":"Antwerpen Noorderdokken (11 vues)"},
{"href":"antwerpen_oost.htm","desc":"Antwerpen Oost I II (6 vues)"},
{"href":"antwerpen_waas.htm","desc":"Antwerpen Waas (2 vues/1 plan)"},
{"href":"antwerpen_zuid.htm","desc":"Antwerpen Zuid I (7 vues-1 plan)"},
{"href":"antwerpen_zuid_II.htm","desc":"Antwerpen Zuid II (6v-2p)"},
{"href":"antwerpen_zurenborg.htm","desc":"Antwerpen Zurenborg Buurtspoorwegen"},
{"href":"balen.htm","desc":"Balen (19 vues)"},
{"href":"berchem.htm","desc":"Berchem II-III (5 vues-2 plans)"},
{"href":"berlaar.htm","desc":"Berlaar (4 vues)"},
{"href":"boechout.htm","desc":"Boechout (7 vues)"},
{"href":"booischot.htm","desc":"Booischot (3 vues)"},
{"href":"boom.htm","desc":"Boom I-II (19 vues)"},
{"href":"bornem.htm","desc":"Bornem I-II (10 vues)"},
{"href":"bouwel.htm","desc":"Bouwel (11 vues)"},
{"href":"brecht.htm","desc":"Brecht Buurtspoorwegen (9 vues)"},
{"href":"duffel.htm","desc":"Duffel I-II-III (8 vues)"},
{"href":"edegem.htm","desc":"Edegem"},
{"href":"ekeren.htm","desc":"Ekeren (21 vues)"},
{"href":"essen.htm","desc":"Essen II-III (10 vues)"},
{"href":"geel.htm","desc":"Geel (5 vues)"},
{"href":"heide.htm","desc":"Heide (8 vues)"},
{"href":"hemiksem.htm","desc":"Hemiksem I-II (12 vues)"},
{"href":"herentals.htm","desc":"Herentals I-II (17 vues)"},
{"href":"heist_op_den_berg.htm","desc":"Heist Op Den Berg I-II (10 vues)"},
{"href":"hoboken_kapellestraat.htm","desc":"Hoboken Kappelestraat"},
{"href":"hoboken_polder.htm","desc":"Hoboken Polder (10 vues)"},
{"href":"hombeek.htm","desc":"Hombeek"},
{"href":"hove.htm","desc":"Hove (9 vues)"}, 
{"href":"hulshout.htm","desc":"Hulshout (2 vues)"}, 
{"href":"kalmthout.htm","desc":"Kalmthout (14 vues)"},
{"href":"kapellen.htm","desc":"Kapellen (11 vues)"},
{"href":"kapellen_militaire.htm","desc":"Kapellen Militair"},
{"href":"kapellenbos.htm","desc":"Kapellenbos"},
{"href":"kessel.htm","desc":"Kessel (10 vues)"},
{"href":"kijkuit.htm","desc":"Kijkuit (8 vues)"},
{"href":"kontich.htm","desc":"Kontich Lint (Contich Kazerne)(6)"},
{"href":"kontich_dorp.htm","desc":"Kontich Dorp (6 vues)"},
{"href":"kontich_nieuwe_lei.htm","desc":"Kontich Nieuwe Lei (+ 2 plans)"},
{"href":"lier.htm","desc":"Lier (7 vues)"},
{"href":"lint.htm","desc":"Lint (2 vues)"},
{"href":"luithagen.htm","desc":"Luithagen (23 vues / 1 plan)"},
{"href":"mechelen_I.htm","desc":"Mechelen I"},
{"href":"mechelen_II.htm","desc":"Mechelen II (9 vues)"},
{"href":"mechelen_III.htm","desc":"Mechelen III (20 vues)"},
{"href":"mechelen_neckerspoel.htm","desc":"Mechelen Nekkerspoel (9)"},
{"href":"mechelen_buurtspoorwegen.htm","desc":"Mechelen Buurtspoorwegen (9)"},
{"href":"meersel_tram_station.htm","desc":"Meesel Buurtspoorwegen (8 vues)"}, 
{"href":"melkouwen.htm","desc":"Melkouwen (3 vues)"},
{"href":"mol.htm","desc":"Mol I-II (13 vues)"},
{"href":"mortsel.htm","desc":"Mortsel (8 vues)"},
{"href":"mortsel_deurnesteenweg.htm","desc":"Mortsel Deurnesteenweg (4 vues)"},
{"href":"mortsel_liersesteenweg.htm","desc":"Mortsel Liersesteenweg (6 vues)"}, 
{"href":"mortsel_oude_god.htm","desc":"Mortsel Oude God II/III/IV (12 vues)"},
{"href":"muizen.htm","desc":"Muizen (12 vues)"}, 
{"href":"niel.htm","desc":"Niel (21 vues)"},
{"href":"nijlen.htm","desc":"Nijlen (4 vues)"},
{"href":"noorderkempen.htm","desc":"Noorderkempen (11 vues)"},  
{"href":"noorderwijk_morkhoven.htm","desc":"Noorderwijk-Morkhoven (7 vues)"}, 
{"href":"olen.htm","desc":"Olen (8 vues)"}, 
{"href":"oorderen.htm","desc":"Oorderen Buurtspoorwegen (2 vues)"},  
{"href":"oppuurs.htm","desc":"Oppuurs (2 vues)"},
{"href":"puurs.htm","desc":"Puurs (22 vues)"}, 
{"href":"puurs_stoomtrein.htm","desc":"Puurs Stoomtrein BVS (10 vues)"}, 
{"href":"reet.htm","desc":"Reet (2 vues)"}, 
{"href":"sauvegarde.htm","desc":"Ruisbroek Sauvegarde I-II (12 vues)"},
{"href":"rumst_buurtspoorwegen.htm","desc":"Rumst Buurtspoorwegen (8 vues)"},
{"href":"schelle.htm","desc":"Schelle I-II (3 vues)"},
{"href":"sint_amands.htm","desc":"Sint-Amands (4 vues)"},
{"href":"sint_katelijne_waver.htm","desc":"Sint Katelijne Waver (18 vues)"},
{"href":"sint_mariaburg.htm","desc":"Sint Mariaburg (11 vues)"},
{"href":"tielen.htm","desc":"Tielen (9 vues)"},
{"href":"turnhout.htm","desc":"Turnhout (14 vues)"},
{"href":"waarloos.htm","desc":"Waarloos (3 vues/2 plans)"},
{"href":"westmeerbeek.htm","desc":"Westmeerbeek (7 vues)"},
{"href":"wildert.htm","desc":"Wildert (7 vues)"},
{"href":"willebroek.htm","desc":"Willebroek I-II (9 vues)"},
{"href":"wilrijk.htm","desc":"Wilrijk (4 vues/1plan)"},
{"href":"wolfstee.htm","desc":"Wolfstee (13 vues)"},
{"href":"zwijndrecht.htm","desc":"Zwijndrecht (8 vues)"},


{"href":"aarschot.htm","desc":"Aarschot I-II (15 vues)"},
{"href":"asse.htm","desc":"Asse (5 vues)"}, 
{"href":"beersel.htm","desc":"Beersel (5 vues)"}, 
{"href":"beert_bellingen.htm","desc":"Beert Bellingen"}, 
{"href":"begijnendijk.htm","desc":"Begijnendijk (4 vues)"},
{"href":"boortmeerbeek.htm","desc":"Boortmeerbeek (5 vues)"},
{"href":"buda.htm","desc":"[Haren-]Buda (13 vues)"},
{"href":"budingen.htm","desc":"Budingen (4 vues)"},
{"href":"buizingen.htm","desc":"Buizingen (3 vues)"},
{"href":"de_hoek.htm","desc":"De Hoek (3 vues)"},
{"href":"deurne.htm","desc":"Deurne"},
{"href":"diegem.htm","desc":"Diegem I-II (14 vues)"},
{"href":"diest.htm","desc":"Diest I-II (17 vues)"},
{"href":"dilbeek.htm","desc":"Dilbeek  (10 vues)"},
{"href":"dilbeek_buurttramstation.htm","desc":"Dilbeek Buurtspoorwegen (10 vues)"},
{"href":"drieslinter.htm","desc":"Drieslinter"},
{"href":"eppegem.htm","desc":"Eppegem (5 vues)"},
{"href":"erps_kwerps.htm","desc":"Erps Kwerps (14 vues)"},
{"href":"essene_lombeek.htm","desc":"Essene Lombeek (2 vues)"},
{"href":"ezemaal.htm","desc":"Ezemaal I-II (10 vues)"},
{"href":"galmarden.htm","desc":"Galmarden I-II (5 vues)"},
{"href":"geetbets.htm","desc":"Geetbets"},
{"href":"gelrode.htm","desc":"Gelrode (2 vues)"},
{"href":"grimde.htm","desc":"Grimde (5)"},
{"href":"groenendaal.htm","desc":"Groenendaal (13 vues)"},
{"href":"groot_bijgarden.htm","desc":"Groot Bijgarden (6 vues)"},
{"href":"haacht.htm","desc":"Haacht I-II-III (10 vues)"},
{"href":"haacht_buurtspoorwegen.htm","desc":"Haacht Buurtspoorwegen (3 vues)"},
{"href":"halle.htm","desc":"Halle II (10 vues)"},
{"href":"halle_III.htm","desc":"Halle III (24 vues)"},
{"href":"hambos.htm","desc":"Hambos (6 vues)"},
{"href":"haren_noord.htm","desc":"Haren Noord (3 vues)"},
{"href":"herent.htm","desc":"Herent I-II (27 vues)"},
{"href":"herne.htm","desc":"Herne (17 vues)"},
{"href":"hever.htm","desc":"Hever I-II (8 vues)"},
{"href":"heverlee.htm","desc":"Heverlee (13 vues)"},
{"href":"hoegaarden.htm","desc":"Hoegaarden (9 vues)"},
{"href":"hoeilaart.htm","desc":"Hoeilaart (11 vues)"}, 
{"href":"hoeilaart_buurttramstation.htm","desc":"Hoeilaart Buurtspoorwegen (4 vues)"}, 
{"href":"hofstade_strand.htm","desc":"Hofstade [Strand] (8 vues)"}, 
{"href":"holleken.htm","desc":"Holleken (4 vues)"},
{"href":"humbeek_buurttramstation.htm","desc":"Humbeek Buurtspoorwegen (7 vues)"}, 
{"href":"kapelle_op_den_bos.htm","desc":"Kapelle-op-den-Bos (2)"},
{"href":"korbeek_lo.htm","desc":"Korbeek Lo (2 vues)"},
{"href":"kortenberg.htm","desc":"Kortenberg I-II (24 vues)"},
{"href":"kumtich.htm","desc":"Kumtich (3 vues)"},
{"href":"landen.htm","desc":"Landen I-II (13 vues)"},
{"href":"langdorp.htm","desc":"Langdorp (5 vues)"},
{"href":"leerbeek.htm","desc":"Leerbeek Buurtspoorwegen (4 vues)"},
{"href":"lembeek.htm","desc":"Lembeek I-II (8 vues)"},
{"href":"liedekerke.htm","desc":"Liedekerke I-II (9 vues)"},
{"href":"linkebeek.htm","desc":"Linkebeek (9 vues)"},
{"href":"leuven.htm","desc":"Leuven (17 vues/2 plans)"},
{"href":"londerzeel_oost.htm","desc":"Londerzeel Oost (3 vues)"},
{"href":"londerzeel.htm","desc":"Londerzeel [West] (6 vues)"},
{"href":"londerzeel_buurtspoorwegen.htm","desc":"Londerzeel Buurtspoorwegen"}, 
{"href":"lot.htm","desc":"Lot I-II (9 vues)"},
{"href":"lovenjoel.htm","desc":"Lovenjoel (2 vues)"},
{"href":"machelen_brabant.htm","desc":"Machelen-Brabant (12 vues)"},
{"href":"malderen.htm","desc":"Malderen I-II (8 vues)"},
{"href":"merchtem.htm","desc":"Merchtem (7 vues)"}, 
{"href":"neerlinter.htm","desc":"Neerlinter (4 vues)"},
{"href":"neerwinden.htm","desc":"Neerwinden I-II (9 vues)"},
{"href":"nossegem.htm","desc":"Nossegem I-II (19 vues)"},
{"href":"oplinter.htm","desc":"Oplinter (7 vues)"},
{"href":"opwijk.htm","desc":"Opwijk (12 vues)"},
{"href":"oud_heverlee.htm","desc":"Oud Heverlee (11 vues)"},
{"href":"overijse.htm","desc":"Overijse buurtspoorwegen"},
{"href":"racour.htm","desc":"Racour (prov. de Liège)"},
{"href":"roosbeek.htm","desc":"Roosbeek (3 vues)"}, 
{"href":"rotselaar.htm","desc":"Rotselaar (2 vues)"},
{"href":"ruisbroek.htm","desc":"Ruisbroek (12 vues)"},
{"href":"schaffen.htm","desc":"Schaffen (4 vues)"},
{"href":"scherpenheuvel.htm","desc":"Scherpenheuvel (Montaigu)(5 vues)"},
{"href":"sint_genesius_rode.htm","desc":"Sint Genesius Rode (13 vues)"},
{"href":"sint_joris_weert.htm","desc":"St Joris Weert (13 vues)"},
{"href":"sint_joris_weert_tram_station.htm","desc":"St Joris Weert Tram St (12 vues)"},
{"href":"sint_martens_bodegem.htm","desc":"Sint Martens Bodegem (4 vues)"},
{"href":"steenhuffel.htm","desc":"Steenhuffel (4 vues)"},
{"href":"ternat.htm","desc":"Ternat (5 vues)"},
{"href":"tervuren.htm","desc":"Tervuren (5 vues)"},
{"href":"testelt.htm","desc":"Testelt I-II (15 vues)"},
{"href":"tienen.htm","desc":"Tienen (5 vues)"},
{"href":"tienen_2019.htm","desc":"Tienen 2018-2019 (27 vues)"},
{"href":"tienen_tramremises.htm","desc":"Tienen Tramremises (4 vues)"}, 
{"href":"tollembeek.htm","desc":"Tollembeek I-III (8 vues)"},
{"href":"tremelo.htm","desc":"Tremelo Buurtspoorwegen (6 vues)"},
{"href":"veltem.htm","desc":"Veltem I-II (15 vues)"},
{"href":"vertrijk.htm","desc":"Vertrijk I-II (13 vues)"},
{"href":"vilvoorde.htm","desc":"Vilvoorde I-II (23 vues)"},
{"href":"vossem.htm","desc":"Vossem Buurtspoorwegen (3 vues)"}, 
{"href":"waasmont.htm","desc":"Waasmont"}, 
{"href":"weerde.htm","desc":"Weerde (7 vues)"},
{"href":"wespelaar.htm","desc":"Wespelaar I-II (10 vues)"},
{"href":"wezemaal.htm","desc":"Wezemaal (6 vues)"}, 
{"href":"wijgmaal.htm","desc":"Wijgmaal (19 vues)"},
{"href":"wolvertem.htm","desc":"Wolvertem Buurtspoorwegen (3 vues)"},
{"href":"zaventem.htm","desc":"Zaventem (Dorp) I-II (25 vues)"},
{"href":"zichem.htm","desc":"Zichem (27 vues)"},
{"href":"zichem_tramstatie.htm","desc":"Zichem tramstatie (3 vues)"},  
{"href":"zoutleeuw.htm","desc":"Zoutleeuw"},


{"href":"aalbeke.htm","desc":"Aalbeke (3 vues)"},
{"href":"aarsele.htm","desc":"Aarsele (5 vues)"},
{"href":"abele.htm","desc":"Abele"},
{"href":"adinkerke.htm","desc":"Adinkerke I-II (13 vues)"},
{"href":"anzegem.htm","desc":"Anzegem (4 vues)"},
{"href":"ardooie.htm","desc":"Ardooie (17 vues)"},
{"href":"assebroek.htm","desc":"Assebroek I II (4 vues)"},
{"href":"avelgem.htm","desc":"Avelgem I-II (12 vues)"},
{"href":"beernem.htm","desc":"Beernem I-II (22 vues)"},
{"href":"beitem.htm","desc":"Beitem (4 vues)"},
{"href":"bissegem.htm","desc":"Bissegem"},
{"href":"blankenberge.htm","desc":"Blankenberge I II III (22 vues)"},
{"href":"blankenberge_buurtspoorwegen.htm","desc":"Blankenberge (Buurtspoorwegen)"},
{"href":"boezinge.htm","desc":"Boezinge (4 vues)"},
{"href":"bossuit.htm","desc":"Bossuit (4 vues)"},
{"href":"brugge_I.htm","desc":"Brugge I  (2 vues/1 plan)"},
{"href":"brugge_II.htm","desc":"Brugge II  (7 vues/1 plan)"},
{"href":"brugge_III.htm","desc":"Brugge III (4 vues/1 plan)"},
{"href":"brugge_sint_pieters.htm","desc":"Brugge St Pieters (12 vues/1 plan)"},
{"href":"adinkerke.htm","desc":"[De Panne > voir Adinkerke (8 vues)]"},
{"href":"deerlijk.htm","desc":"Deerlijk (8 vues)"},
{"href":"de_haan.htm","desc":"De Haan (5 vues)"},
{"href":"adinkerke.htm","desc":"De Panne I-II (13 vues)"}, 
{"href":"desselgem.htm","desc":"Desselgem (2 vues)"},
{"href":"diksmuide.htm","desc":"Diksmuide I-II-III (12 vues)"},
{"href":"diksmuide_buurtspoorwegen.htm","desc":"Diksmuide Buurtspoorwegen (2 vues)"}, 
{"href":"duinbergen.htm","desc":"Duinbergen (10 vues)"},
{"href":"eernegem.htm","desc":"Eernegem"},
{"href":"esen.htm","desc":"Esen (4 vues)"},
{"href":"ghistel.htm","desc":"Gistel"},
{"href":"gits.htm","desc":"Gits (10 vues)"},
{"href":"handzame.htm","desc":"Handzame (8 vues)"},
{"href":"harelbeke.htm","desc":"Harelbeke I-II-III (22 vues)"},
{"href":"heirweg.htm","desc":"Heirweg (2 vues)"},
{"href":"heist.htm","desc":"Heist (Knokke Heist) (17 vues)"},
{"href":"ichteghem.htm","desc":"Ichteghem"},
{"href":"ieper.htm","desc":"Ieper I-II-III (22 vues)"},
{"href":"ieper_de_lijn.htm","desc":"Ieper De Lijn (3 vues)"},
{"href":"ingelmunster.htm","desc":"Ingelmunster (9 vues)"},
{"href":"izegem.htm","desc":"Izegem I-II (9 vues)"},
{"href":"jabbeke.htm","desc":"Jabbeke (10 vues)"},
{"href":"kaaskerke.htm","desc":"Kaaskerke"}, 
{"href":"knokke.htm","desc":"Knokke I-II-III (14 vues)"},
{"href":"koksijde.htm","desc":"Koksijde (2 vues)"}, 
{"href":"kooigem.htm","desc":"Kooigem la gare vicinale"},
{"href":"kortekeer.htm","desc":"Kortekeer (4 vues)"},
{"href":"kortemark.htm","desc":"Kortemark I-II (10 vues)"},
{"href":"kortrijk.htm","desc":"Kortrijk II-III (11 vues)"},
{"href":"langemark.htm","desc":"Langemark I-II (17 vues)"},
{"href":"lauwe.htm","desc":"Lauwe (8 vues)"},
{"href":"ledegem.htm","desc":"Ledegem (5 vues)"},
{"href":"lendelede.htm","desc":"Lendelede"},
{"href":"lichtervelde.htm","desc":"Lichtervelde II-III (14 vues)"},
{"href":"lissewege.htm","desc":"Lissewege II (9 vues)"},
{"href":"marke.htm","desc":"Marke(2 vues)"},
{"href":"menen.htm","desc":"Menen I-II-III (12 vues)"},
{"href":"meulebeke.htm","desc":"Meulebeke (16 vues)"},
{"href":"moen_heestert.htm","desc":"Moen Heestert (6 vues)"},
{"href":"moere.htm","desc":"Moere (12 vues)"},
{"href":"moorslede.htm","desc":"Moorslede Passendale I-II (4 vues)"},
{"href":"nieuwpoort_bad.htm","desc":"Nieuwpoort Bad (4 vues)"},
{"href":"nieuwpoort_stad.htm","desc":"Nieuwpoort Stad (7 vues)"},
{"href":"oostkerke.htm","desc":"Oostkerke (5 vues)"},
{"href":"oostrozebeke.htm","desc":"Oostrozebeke (18 vues)"},
{"href":"oostende_kaai.htm","desc":"Oostende Kaai (12 vues/1 plan)"},
{"href":"oostende_2019.htm","desc":"Oostende 2019 (11 photos)"},
{"href":"oostende_delijn_2019.htm","desc":"Oostende De Lijn 2019 (9 photos)"},
{"href":"oostende_2_stations.htm","desc":"Oostende les 2 gares"},
{"href":"oostende_stad.htm","desc":"Oostende Stad I-II(9 vues/1 plan)"},
{"href":"oostkamp.htm","desc":"Oostkamp (30 vues)"},
{"href":"oostnieuwkerke.htm","desc":"Oostnieuwkerke (5 vues)"},
{"href":"oudenburg.htm","desc":"Oudenburg (5 vues)"},
{"href":"pervijze.htm","desc":"Pervijze (7 vues)"},
{"href":"pittem.htm","desc":"Pittem (3 vues)"},
{"href":"poelkapelle.htm","desc":"Poelkapelle I-II (3 vues)"},
{"href":"poperinge.htm","desc":"Poperinge (16 vues)"},
{"href":"roeselaere.htm","desc":"Roeselaere I-II (39 vues)"}, 
{"href":"rumbeke.htm","desc":"Rumbeke"},{"href":"sijsele.htm","desc":"Sijsele (2 vues)"},
{"href":"sint_denijs_helkijn.htm","desc":"Sint-Denijs-Helkijn (2 vues)"},
{"href":"sint_eloois_vijve.htm","desc":"Sint Eloois Vijve (6 vues)"},  
{"href":"sint_jozef.htm","desc":"Sint Jozef (13 vues)"},
{"href":"sint_michiels.htm","desc":"Sint Michiels"},
{"href":"spiere.htm","desc":"Spiere (4 vues)"}, 
{"href":"staden.htm","desc":"Staden (25 vues)"},
{"href":"stasegem.htm","desc":"Stasegem (2 vues)"},
{"href":"steenbrugge.htm","desc":"Steenbrugge (4 vues)"},
{"href":"tielt.htm","desc":"Tielt I-II (4 vues)"},
{"href":"torhout.htm","desc":"Torhout I-II-III (11 vues)"},
{"href":"varsenare.htm","desc":"Varsenare (10 vues)"},
{"href":"veurne.htm","desc":"Veurne (17 vues)"},
{"href":"vichte.htm","desc":"Vichte (11 vues)"},
{"href":"vlamertinge.htm","desc":"Vlamertinge I-II (12 vues)"},
{"href":"waregem.htm","desc":"Waregem I-II (5 vues)"},
{"href":"wenduine.htm","desc":"Wenduine buurtspoorwegen (3 vues)"}, 
{"href":"wervik.htm","desc":"Wervik I-II (7 vues)"},
{"href":"westende.htm","desc":"Westende buurtspoorwegen"},  
{"href":"westrozebeke.htm","desc":"Westrozebeke (6 vues)"},
{"href":"westvleteren.htm","desc":"Westvleteren Buurtspoorwegen"}, 
{"href":"wevelgem.htm","desc":"Wevelgem (13 vues)"},
{"href":"wielsbeke.htm","desc":"Wielsbeke (2 vues)"},
{"href":"wynendaele.htm","desc":"Wynendaele (2 vues)"},
{"href":"zandvoorde.htm","desc":"Zandvoorde (2 vues)"},
{"href":"zarren.htm","desc":"Zarren I-II (7 vues)"},
{"href":"zedelgem.htm","desc":"Zedelgem (12 vues)"}, 
{"href":"zeebrugge.htm","desc":"Zeebrugge Dorp I-II-III (21v/1p)"},
{"href":"zeebrugge_ferry.htm","desc":"Zeebrugge Ferry (5 vues))"}, 
{"href":"zeebrugge_strand.htm","desc":"Zeebrugge Strand (18v/1p)"},
{"href":"zillebeke.htm","desc":"Zillebeke (2 vues)"},
{"href":"zonnebeke.htm","desc":"Zonnebeke"},
{"href":"zuienkerke.htm","desc":"Zuienkerke (= Lissewege I)"},
{"href":"zwankendamme.htm","desc":"Zwankendamme (3 vues)"},
{"href":"zwevegem.htm","desc":"Zwevegem"}, 


{"href":"aalst.htm","desc":"Aalst (8 vues)"}, 
{"href":"aalst_kerrebroek.htm","desc":"Aalst-Kerrebroek (5 vues)"}, 
{"href":"aalter.htm","desc":"Aalter I-II (17 vues)"},
{"href":"adegem.htm","desc":"Adegem (2 vues)"},
{"href":"appelterre.htm","desc":"Appelterre (5 vues)"},
{"href":"baardegem.htm","desc":"Baardegem (4 vues)"},
{"href":"baasrode_noord.htm","desc":"Baasrode Noord I-II (17 vues)"},
{"href":"baasrode_zuid.htm","desc":"Baasrode Zuid (4 vues)"},
{"href":"balegem.htm","desc":"Balegem"},
{"href":"balegem_dorp.htm","desc":"Balegem Dorp (7 vues)"},
{"href":"bambrugge.htm","desc":"Bambrugge (11 vues)"},
{"href":"bassevelde.htm","desc":"Bassevelde (2 vues)"},
{"href":"beervelde.htm","desc":"Beervelde (8vues)"},
{"href":"bellem.htm","desc":"Bellem I-II (20 vues)"},
{"href":"belsele.htm","desc":"Belsele I-II (4 vues)"},
{"href":"berchem_oost_vlaanderen.htm","desc":"Berchem (Oost Vl.) (2 vues)"},  
{"href":"beveren.htm","desc":"Beveren (Waas) (7 vues)"},
{"href":"boekhoute.htm","desc":"Boekhoute (3 vues)"},
{"href":"buggenhout.htm","desc":"Buggenhout I-II-III (7 vues)"}, 
{"href":"burst.htm","desc":"Burst I-II (6 vues)"},
{"href":"daknam.htm","desc":"Daknam (6 vues)"}, 
{"href":"deinze.htm","desc":"Deinze I-II-III (15 vues)"},
{"href":"de_klinge.htm","desc":"De Klinge (7 vues)"},
{"href":"denderleeuw.htm","desc":"Denderleeuw I-II (6 vues)"},
{"href":"dendermonde.htm","desc":"Dendermonde I-II (8 vues)"},
{"href":"de_pinte.htm","desc":"De Pinte I-II (11 vues)"},
{"href":"donk.htm","desc":"Donk (3 vues)"},  
{"href":"drongen.htm","desc":"Drongen I-II-III (10 vues)"},
{"href":"ede.htm","desc":"Ede (6 vues)"}, 
{"href":"eeklo.htm","desc":"Eeklo I II (2 vues)"},
{"href":"eichem.htm","desc":"Eichem (7 vues)"}, 
{"href":"eine.htm","desc":"Eine (5 vues)"},
{"href":"eke_nazareth.htm","desc":"Eke-Nazareth (4 vues)"}, 
{"href":"eksaarde.htm","desc":"Eksaarde (8 vues)"}, 
{"href":"ename.htm","desc":"Ename"},
{"href":"erembodegem.htm","desc":"Erembodegem (7 vues)"},
{"href":"erpe_mere.htm","desc":"Erpe-Mere I-II (7 vues)"},
{"href":"ertvelde.htm","desc":"Ertvelde (12 vues)"},
{"href":"erwetegem.htm","desc":"Erwetegem"}, 
{"href":"etikhove.htm","desc":"Etikhove (5 vues)"},
{"href":"evergem.htm","desc":"Evergem I-II (13 vues)"},
{"href":"evergem_de_lijn.htm","desc":"Evergem De Lijn (4 vues)"},
{"href":"gavere.htm","desc":"Gavere (2 vues)"},
{"href":"gent_dampoort.htm","desc":"Gent Dampoort (19 vues)"},
{"href":"gent_sint_pieters.htm","desc":"Gent-St-Pieters I-II (20 vues/4 plans)"},
{"href":"gent_waas.htm","desc":"Gent Waas (2 vues)"},
{"href":"gent_zuid.htm","desc":"Gent Zuid (7 vues/2 plans)"},
{"href":"gentbrugge.htm","desc":"Gentbrugge (13 vues)"},
{"href":"gentbrugge_noord.htm","desc":"Gentbrugge Noord"},
{"href":"geraardsbergen.htm","desc":"Geraardsbergen I-II (4 vues)"},
{"href":"gijzegem.htm","desc":"Gijzegem (3 vues)"},
{"href":"gontrode.htm","desc":"Gontrode (12 vues)"},
{"href":"grammene.htm","desc":"Grammene (2 vues)"},
{"href":"grembergen.htm","desc":"Grembergen (2 vues)"},
{"href":"haaltert.htm","desc":"Haaltert (8 vues)"},
{"href":"hamme.htm","desc":"Hamme (5 vues)"},
{"href":"hansbeke.htm","desc":"Hansbeke I-II-III (23 vues)"},
{"href":"heiken.htm","desc":"Heiken"},
{"href":"heizijde.htm","desc":"Heizijde (6 vues)"},
{"href":"herzele.htm","desc":"Herzele (17 vues)"},
{"href":"herzele_tram.htm","desc":"Herzele NMVB (6 vues)"},
{"href":"hillegem.htm","desc":"Hillegem (8 vues)"},
{"href":"hofstade.htm","desc":"Hofstade"},
{"href":"huivelde.htm","desc":"Huivelde (3 vues)"}, 
{"href":"idegem.htm","desc":"Idegem (7 vues)"},
{"href":"kaprijke.htm","desc":"Kaprijke (3 vues)"},
{"href":"kemzeke.htm","desc":"Kemzeke (3 vues)"},
{"href":"klein_sinaai.htm","desc":"Klein-Sinaai (6 vues)"},
{"href":"kwatrecht.htm","desc":"Kwatrecht (9 vues)"},
{"href":"landegem.htm","desc":"Landegem (18 vues)"},
{"href":"landskouter.htm","desc":"Landskouter (9 vues)"},
{"href":"langerbrugge.htm","desc":"Langerbrugge (14 vues)"},
{"href":"lebbeke.htm","desc":"Lebbeke (6 vues)"},
{"href":"lede.htm","desc":"Lede I-II (8 vues)"},
{"href":"leupegem.htm","desc":"Leupegem (5 vues)"},
{"href":"lierde.htm","desc":"[Sint Maria] Lierde (24 vues)"},
{"href":"lochristi.htm","desc":"Lochristi (2 vues)"},
{"href":"lokeren.htm","desc":"Lokeren (8 vues)"},
{"href":"louise_marie.htm","desc":"Louise-Marie"},
{"href":"machelen.htm","desc":"Machelen (2 vues)"}, 
{"href":"maldegem.htm","desc":"Maldegem (6 vues)"},
{"href":"maria_aalter.htm","desc":"Maria-Aalter (16 vues)"},
{"href":"melden.htm","desc":"Melden (2 vues)"},
{"href":"melle.htm","desc":"Melle (11 vues)"},
{"href":"melsele.htm","desc":"Melsele I-II  (7 vues)"},
{"href":"merelbeke.htm","desc":"Merelbeke I-II (19 vues)"},
{"href":"michelbeke.htm","desc":"Michelbeke (3 vues)"},
{"href":"middelburg.htm","desc":"Middelburg buurtspoorwegen"},
{"href":"moerbeke_waas.htm","desc":"Moerbeke Waas (12 vues)"},
{"href":"moortsele.htm","desc":"Moortsele I-II  (9 vues)"},
{"href":"munkzwalm.htm","desc":"Munkzwalm (4 vues)"},
{"href":"nederbrakel.htm","desc":"Nederbrakel (3 vues)"},
{"href":"nieuwkerken.htm","desc":"Nieuwkerken Waas I-II (7 vues)"},
{"href":"ninove.htm","desc":"Ninove (3 vues)"},
{"href":"okegem.htm","desc":"Okegem (10 vues)"},
{"href":"olsene.htm","desc":"Olsene (2 vues)"},
{"href":"oostackker.htm","desc":"Oostakker (7 vues)"},
{"href":"opbrakel.htm","desc":"Opbrakel (3 vues)"},
{"href":"oudegem.htm","desc":"Oudegem I-II (8 vues)"},
{"href":"oudenaarde.htm","desc":"Oudenaarde I (14 vues)"},
{"href":"petegem.htm","desc":"Petegem (2 vues)"},
{"href":"roborst.htm","desc":"Roborst"},
{"href":"ronse.htm","desc":"Ronse I/II (15 vues)"},
{"href":"ruien.htm","desc":"Ruien I-II (10 vues)"},
{"href":"scheldewindeke.htm","desc":"Scheldewindeke (9 vues)"},
{"href":"schellebelle.htm","desc":"Schellebelle I-II (3 vues)"},
{"href":"schendelbeke.htm","desc":"Schendelbeke (6 vues)"},
{"href":"schoonaarde.htm","desc":"Schoonaarde (10 vues)"},
{"href":"serskamp.htm","desc":"Serskamp (6 vues)"},
{"href":"sinaai.htm","desc":"Sinaai (Duizend Appels)(11 vues)"},
{"href":"sint_denijs_boekel.htm","desc":"Sint-Denijs-Boekel-[Nederzwalm] (12 vues)"},
{"href":"sint_denijs_westrem.htm","desc":"Sint-Denijs-Westrem (9 vues)"},
{"href":"sint_gillis_waas.htm","desc":"Sint-Gillis-Waas (9 vues)"},
{"href":"sint_lievens_esse_tram.htm","desc":"Sint Lievens Esse NMVB(4 vues)"}, 
{"href":"lierde.htm","desc":"Sint Maria Lierde > Lierde"},
{"href":"sint_niklaas.htm","desc":"Sint Niklaas I-II (Waes)(10 vues)"},
{"href":"sint_niklaas_west.htm","desc":"Sint Niklaas West (2 vues)"}, 
{"href":"sleidinge.htm","desc":"Sleidinge (10 vues)"},
{"href":"stekene.htm","desc":"Stekene (9 vues)"},
{"href":"temse.htm","desc":"Temse I-II (16 vues)"},
{"href":"terdonk.htm","desc":"Terdonk (2 vues)"},
{"href":"terhagen.htm","desc":"Terhagen (12 vues)"},
{"href":"viane_moerbeke.htm","desc":"Viane Moerbeke (10 vues)"},
{"href":"vijfhuizen.htm","desc":"Vijfhuizen (8 vues)"},
{"href":"waarschoot.htm","desc":"Waarschoot (11 vues)"},
{"href":"waasmunster.htm","desc":"Waasmunster (2 vues)"},
{"href":"wachtebeke.htm","desc":"Wachtebeke (8 vues)"},
{"href":"welle.htm","desc":"Welle (5 vues)"},
{"href":"wetteren.htm","desc":"Wetteren (12 vues)"},
{"href":"wichelen.htm","desc":"Wichelen I-II (8 vues)"},
{"href":"wondelgem.htm","desc":"Wondelgem (8 vues)"},
{"href":"zandbergen.htm","desc":"Zandbergen (9 vues)"},
{"href":"zele.htm","desc":"Zele (3 vues)"},
{"href":"zelzate.htm","desc":"Zelzate I-II (5 vues)"},
{"href":"zeveneken.htm","desc":"Zeveneken Oudenbos (2 vues)"},
{"href":"zingem.htm","desc":"Zingem II (8 vues)"}, 
{"href":"zottegem.htm","desc":"Zottegem I-II (6 vues)"},
{"href":"zulte.htm","desc":"Zulte (2 vues)"},

{"href":"achel.htm","desc":"Achel (3 vues)"},
{"href":"alken.htm","desc":"Alken (7 vues)"},
{"href":"as.htm","desc":"As (22 vues)"},
{"href":"beringen.htm","desc":"Beringen (19 vues)"},
{"href":"beringen_mijnen.htm","desc":"Beringen Mijnen (2 vues)"},
{"href":"bernissem.htm","desc":"Bernissem"},
{"href":"beverlo.htm","desc":"Beverlo (5 vues)"},
{"href":"beverst.htm","desc":"Beverst"},
{"href":"bilzen.htm","desc":"Bilzen (8 vues)"},
{"href":"bokrijk.htm","desc":"Bokrijk (9 vues)"},
{"href":"borgloon.htm","desc":"Borgloon (5 vues)"},
{"href":"diepenbeek.htm","desc":"Diepenbeek (5 vues)"},
{"href":"eigenbilzen.htm","desc":"Eigenbilzen (2 vues)"},
{"href":"elen.htm","desc":"Elen (2 vues)"},
{"href":"eisden.htm","desc":"Eisden (16 vues)"},
{"href":"exel.htm","desc":"Exel"},
{"href":"genk.htm","desc":"Genk I-II (19 vues/1 plan)"},
{"href":"gingelom.htm","desc":"Gingelom (2 vues)"},
{"href":"halen.htm","desc":"Halen (2 vues)"},
{"href":"hamont.htm","desc":"Hamont I-II (23 vues)"},
{"href":"hasselt.htm","desc":"Hasselt II-III (8 vues)"},
{"href":"helchteren.htm","desc":"Helchteren"},
{"href":"heppen.htm","desc":"Heppen (4 vues)"},
{"href":"heusden.htm","desc":"Heusden (6 vues)"},
{"href":"hoepertingen.htm","desc":"Hoepertingen (2 vues)"},
{"href":"hoeselt.htm","desc":"Hoeselt (2 vues)"},
{"href":"jesseren.htm","desc":"Jesseren (9 vues)"},
{"href":"jeuk.htm","desc":"Jeuk Rosoux (2 vues)"}, 
{"href":"kermt.htm","desc":"Kermt (3 vues)"},
{"href":"kerniel.htm","desc":"Kerniel (7 vues)"},
{"href":"kiewit.htm","desc":"Kiewit (11 vues)"},
{"href":"kortenbos.htm","desc":"Kortenbos (2 vues)"},
{"href":"lanaken.htm","desc":"Lanaken (3 vues)"},
{"href":"leopoldsburg.htm","desc":"Leopoldsburg (24 vues)"},
{"href":"leopoldsburg_2022.htm","desc":"Leopoldsburg en 2022 (12))"},
{"href":"lommel.htm","desc":"Lommel I-II (17 vues)"},
{"href":"maaseik.htm","desc":"Maaseik I-II (2 vues)"},
{"href":"melveren.htm","desc":"Melveren"},
{"href":"munsterbilzen.htm","desc":"Munsterbilzen (2 vues)"},
{"href":"nerem.htm","desc":"Nerem"},
{"href":"neerpelt.htm","desc":"Neerpelt (33 vues)"},
{"href":"ordingen.htm","desc":"Ordingen"},
{"href":"overpelt.htm","desc":"Overpelt (9 vues)"},
{"href":"overpelt-Werkplaatsen.htm","desc":"Overpelt Werkplaatsen"}, 
{"href":"piringen.htm","desc":"Piringen (9 vues)"},
{"href":"remersdaal.htm","desc":"Remersdaal (block) (3 vues)"},
{"href":"schulen.htm","desc":"Schulen I-II "},
{"href":"sint_huibrechts_lille.htm","desc":"Sint-Huibrechts-Lille (2)"},
{"href":"sint_martens_voeren.htm","desc":"Sint-Martens-Voeren"},
{"href":"sint_truiden.htm","desc":"Sint Truiden I-II (9 vues)"},
{"href":"tessenderlo.htm","desc":"Tessenderlo (4 vues)"},
{"href":"tongeren.htm","desc":"Tongeren I-II (18 vues)"},
{"href":"velm.htm","desc":"Velm"},
{"href":"waterschei.htm","desc":"Waterschei (10 vues)"},
{"href":"wijchmaal.htm","desc":"Wijchmaal (2 vues)"},
{"href":"wilderen.htm","desc":"Wilderen (22 vues)"},
{"href":"winterslag.htm","desc":"Winterslag (2 vues)"},
{"href":"zelem.htm","desc":"Zelem"},
{"href":"zolder.htm","desc":"Zolder (12 vues)"},
{"href":"zonhoven.htm","desc":"Zonhoven (7 vues)"},
{"href":"zwartberg.htm","desc":"Zwartberg / Genk Goed. (8 vues)"}, 


{"href":"agimont.htm","desc":"Agimont (7 vues)"},
{"href":"aisemont.htm","desc":"Aisemont (2 vues)"},
{"href":"alle_sur_semois.htm","desc":"Alle sur Semois (11 vues)"},
{"href":"andenne.htm","desc":"Andenne I-II (11 vues)"},
{"href":"anhee.htm","desc":"Anhée I-II (6 vues)"},
{"href":"anseremme.htm","desc":"Anseremme (21 vues)"}, 
{"href":"assesse.htm","desc":"Assesse (10 vues)"},
{"href":"aublain.htm","desc":"Aublain (7 vues)"},
{"href":"auvelais.htm","desc":"Auvelais I-II (13 vues)"},
{"href":"bambois.htm","desc":"Bambois (13 vues)"},
{"href":"bauche.htm","desc":"Bauche PN 6 (8 vues)"},
{"href":"beauraing.htm","desc":"Beauraing (15 vues)"},
{"href":"beez.htm","desc":"Beez (3 vues)"},
{"href":"berzee.htm","desc":"Berzée (26 vues)"},
{"href":"beuzet.htm","desc":"Beuzet I-II (6 vues)"},
{"href":"biesmes.htm","desc":"Biesme(s)(9 vues)"},
{"href":"biesmeree.htm","desc":"Biesmerée (10 vues)"},
{"href":"bormenville.htm","desc":"Bormenville (8 vues/1 plan)"},
{"href":"boussu_en_fagne.htm","desc":"Boussu en Fagne(s) (16 vues)"},
{"href":"bouvignes.htm","desc":"Bouvignes sur Meuse"},
{"href":"braibant.htm","desc":"Braibant (4 vues)"},
{"href":"cerfontaine.htm","desc":"Cerfontaine I-II (7 vues/2 plans)"},
{"href":"chapelle_dieu.htm","desc":"Chapelle Dieu (14 vues)"},
{"href":"chapois.htm","desc":"Chapois (7 vues)"},
{"href":"chateau_de_seilles.htm","desc":"Château de Seilles (10 vues)"},
{"href":"ciney_I.htm","desc":"Ciney I (2 vues)"},
{"href":"ciney_II.htm","desc":"Ciney II (7 vues)"},
{"href":"ciney_III.htm","desc":"Ciney III (11 vues)"}, 
{"href":"cognelee.htm","desc":"Cognelée (3 vues)"},
{"href":"corroy_le_chateau.htm","desc":"Corroy-le-Château"}, 
{"href":"courriere.htm","desc":"Courrière (6 vues)"},
{"href":"couvin.htm","desc":"Couvin (14 vues)"},
{"href":"cul_des_sarts.htm","desc":"Cul Des Sarts (2 vues)"},
{"href":"dave_etat.htm","desc":"Dave Etat = Dave St Martin (16)"},
{"href":"dave.htm","desc":"Dave Nord (5 vues)"},
{"href":"denee.htm","desc":"Denée Maredsous (8 vues)"},
{"href":"dinant.htm","desc":"Dinant I-II (24 vues)"},
{"href":"doische.htm","desc":"Doische (8 vues)"},
{"href":"dorinne.htm","desc":"Dorinne Durnal (8 vues)"},
{"href":"eghezee.htm","desc":"Eghezée (3 vues)"},
{"href":"emptinne.htm","desc":"Emptinne (3 vues)"},
{"href":"eprave.htm","desc":"Eprave (6 vues)"},
{"href":"ermeton.htm","desc":"Ermeton sur Biert (13 v)"},
{"href":"ernage.htm","desc":"Ernage I-II (5 vues)"},
{"href":"evrehailles.htm","desc":"Evrehailles Bauche (22 vues)"},
{"href":"fagnolle.htm","desc":"Fagnolle"},
{"href":"falaen.htm","desc":"FalÃ¤en (5 vues)"},
{"href":"falemprise.htm","desc":"Falemprise I-II (3 vues/1 plan)"},
{"href":"falisolle.htm","desc":"Falisolle (19 vues)"},
{"href":"flawinne.htm","desc":"Flawinne (11 vues)"},
{"href":"floree.htm","desc":"Florée"},
{"href":"floreffe.htm","desc":"Floreffe (18 vues)"},
{"href":"florennes.htm","desc":"Florennes Central (4 vues/1 plan)"},
{"href":"florennes_est.htm","desc":"Florennes Est (3 vues/1 plan)"},
{"href":"florennes_pavillon.htm","desc":"Florennes Pavillon (6 vues/1 plan)"},
{"href":"florennes_sud.htm","desc":"Florennes Sud (3 vues/1 plan)"},
{"href":"forville.htm","desc":"Forville (vicinale)"},
{"href":"fosses_la_ville.htm","desc":"Fosses [La Ville] (24 vues)"},
{"href":"fosses_la_ville_vicinal.htm","desc":"Fosses La Ville vicinal (5 vues)"},
{"href":"fraire.htm","desc":"Fraire (9 vues/2 plans)"},
{"href":"fraire_humide.htm","desc":"Fraire Humide (9 vues/1 plan)"}, 
{"href":"franiere.htm","desc":"Franière (14 vues)"},
{"href":"frasnes_lez_couvin.htm","desc":"Frasnes-lez-Couvin (8 vues)"},
{"href":"froidmont_namur.htm","desc":"Froidmont (9 vues/1 plan)"},
{"href":"furnaux.htm","desc":"Furnaux (7 vues)"}, 
{"href":"gedinne.htm","desc":"Gedinne (17 vues)"},
{"href":"gembloux.htm","desc":"Gembloux I-II (16 vues)"},
{"href":"gendron_celles.htm","desc":"Gendron Celles (15 vues)"},
{"href":"gerlimpont.htm","desc":"Gerlimpont (3 vues)"}, 
{"href":"gimnee.htm","desc":"Gimnée"},
{"href":"godinne.htm","desc":"Godinne (15 vues)"},
{"href":"graide.htm","desc":"Graide (11 vues)"},
{"href":"halloy.htm","desc":"Halloy (3 vues)"},
{"href":"halte_royale_d_ardenne.htm","desc":"Halte Royale d'Ardenne (11 vues)"},
{"href":"ham_sur_sambre.htm","desc":"Ham sur Sambre (8 vues)"},
{"href":"hamois.htm","desc":"Hamois (14 vues/1 plan)"},
{"href":"hanzinne.htm","desc":"Hanzinne (4 vues)"},
{"href":"hastiere.htm","desc":"Hastière (9 vues)"},
{"href":"havelange.htm","desc":"Havelange (8 vues/1 plan)"},
{"href":"haversin.htm","desc":"Haversin (10 vues)"},
{"href":"heer_agimont.htm","desc":"Heer Agimont (11 vues)"},
{"href":"hemptinne.htm","desc":"Hemptinne (5 vues)"},
{"href":"hermeton.htm","desc":"Hermeton"},
{"href":"hogne.htm","desc":"Hogne (10 vues)"},
{"href":"hour_havenne.htm","desc":"Hour Havenne (6 vues)"},
{"href":"houyet.htm","desc":"Houyet (29 vues/4 plans)"},
{"href":"houyet_vicinal.htm","desc":"Houyet vicinal"}, 
{"href":"jambes_etat.htm","desc":"Jambes Etat = Jambes Est (7)"},
{"href":"jambes_nord.htm","desc":"Jambes Nord (13 vues)"},
{"href":"jemelle.htm","desc":"Jemelle - Rochefort I-II-III (19 vues)"},
{"href":"jemeppe_sur_sambre.htm","desc":"Jemeppe Sur Sambre (20 vues)"},
{"href":"jemeppe_froidmont.htm","desc":"Jemeppe Froidmont"},
{"href":"laneffe.htm","desc":"Laneffe"},
{"href":"leignon.htm","desc":"Leignon (11 vues)"},
{"href":"lesves_vicinal.htm","desc":"Lesves Gare vicinale."},
{"href":"leuze_longchamps.htm","desc":"Leuze Longchamps (4 vues)"},
{"href":"liennes.htm","desc":"Liennes (2 vues)."},
{"href":"ligny.htm","desc":"Ligny (carrières)(10 vues)"},
{"href":"ligny_sud.htm","desc":"Ligny (sud) (2 vues)"},
{"href":"lonzee.htm","desc":"Lonzée I-II (8 vues)"},
{"href":"lustin.htm","desc":"Lustin I-II (13 vues)"},
{"href":"marche_les_dames.htm","desc":"Marche les Dames (14 vues)"},
{"href":"maredret.htm","desc":"Maredret (9 vues)"},
{"href":"mariembourg.htm","desc":"Mariembourg (10 vues)"},
{"href":"martouzin.htm","desc":"Martouzin (11 vues)"},
{"href":"matagne_la_grande.htm","desc":"Matagne la Grande (4 vues)"},
{"href":"matagne_la_petite.htm","desc":"Matagne la Petite"}, 
{"href":"mazy.htm","desc":"Mazy (20 vues)"},
{"href":"mettet.htm","desc":"Mettet (3 vues)"}, 
{"href":"merlemont.htm","desc":"Merlemont (3 vues)"},
{"href":"moignelee.htm","desc":"Moignelée"},
{"href":"moustier.htm","desc":"Moustier (S Sambre) (21 vues)"},
{"href":"morialme.htm","desc":"Morialmé (14 vues/1 plan)"},
{"href":"morialme_minieres.htm","desc":"Morialmé Minières (6 vues/1 plan)"},
{"href":"nameche.htm","desc":"Namêche (7 vues)"},
{"href":"namur.htm","desc":"Namur (11 vues)"},
{"href":"namur_2017.htm","desc":"Namur en 2017 (6 vues)"},
{"href":"naninne.htm","desc":"Naninne (7 vues)"},
{"href":"natoye.htm","desc":"Natoye (8 vues)"},
{"href":"neuville.htm","desc":"Neuville(Nord) (7 vues)"}, 
{"href":"nismes.htm","desc":"Nismes (5 vues)"},  
{"href":"novilles_taviers.htm","desc":"Novilles Taviers (3 vues)"},
{"href":"ohey.htm","desc":"Ohey Gare vicinale (8 vues)"},
{"href":"olloy.htm","desc":"Olloy sur Viroin (7 vues)"},
{"href":"petit_avin.htm","desc":"Petit Avin (3 vues/1 plan)"},
{"href":"petite_chapelle.htm","desc":"Petite Chapelle (4 vues)"},
{"href":"philippeville1.htm","desc":"Philippeville I (1 vues/2 plans)"},
{"href":"philippeville.htm","desc":"Philippeville II (15 vues/2 plans)"},
{"href":"pondrome.htm","desc":"PondrÃ´me (5 vues)"},
{"href":"pry.htm","desc":"Pry (11 vues)"}, 
{"href":"purnode.htm","desc":"Purnode (5 vues)"},
{"href":"pussemange.htm","desc":"Pussemange (vicinale, 5 vues)"},
{"href":"rhisnes.htm","desc":"Rhisnes (17 vues)"},
{"href":"rochefort.htm","desc":"Rochefort (22 vues)"},
{"href":"romedenne.htm","desc":"Romedenne Surice (7 vues)"},
{"href":"romeree.htm","desc":"Romerée (3 vues)"},
{"href":"ronet.htm","desc":"Ronet (8 vues)"},
{"href":"saint_aubin.htm","desc":"Saint Aubin (6 vues/1 plan)"},
{"href":"saint_denis_bovesse.htm","desc":"Saint-Denis-Bovesse (20 vues)"},
{"href":"saint_gerard.htm","desc":"Saint Gérard (16 vues)"},
{"href":"saint_lambert.htm","desc":"Saint Lambert (16 vues)"},
{"href":"saint_servais.htm","desc":"Saint Servais (6 vues)"},
{"href":"sart_bernard.htm","desc":"Sart Bernard (4 vues)"}, 
{"href":"sauveniere.htm","desc":"Sauveniere (5 vues)"},
{"href":"sclaigneaux.htm","desc":"Sclaigneaux (12 vues)"},
{"href":"scry.htm","desc":"Scry (13 vues)"}, 
{"href":"senenne.htm","desc":"Senenne (4 vues)"},
{"href":"senzeille.htm","desc":"Senzeille (4 vues)"},
{"href":"silenrieux.htm","desc":"Silenrieux"},
{"href":"sombreffe.htm","desc":"Sombreffe (15 vues)"},
{"href":"sovet.htm","desc":"Sovet (4 vues)"},
{"href":"spontin.htm","desc":"Spontin (10 vues)"},
{"href":"spontin_sources.htm","desc":"Spontin Sources (3 vues)"},
{"href":"stave.htm","desc":"Stave (6 vues/1 plan)"}, 
{"href":"tailfer.htm","desc":"Tailfer (3 vues)"},
{"href":"tamines.htm","desc":"Tamines (23 vues)"},
{"href":"thy_le_chateau.htm","desc":"Thy-le-Château (11 vues)"},
{"href":"treignes.htm","desc":"Treignes (5 vues)"},
{"href":"vedrin.htm","desc":"Vedrin (3 vues)"},
{"href":"vierves.htm","desc":"Vierves (2 vues)"},
{"href":"vignee.htm","desc":"Vignee (2 vues)"},
{"href":"villers_le_gambon.htm","desc":"Villers le Gambon (18 vues)"}, 
{"href":"villers_sur_lesse.htm","desc":"Villers Sur Lesse (5 vues)"},
{"href":"voneche.htm","desc":"Vonêche (11 vues)"},
{"href":"walcourt.htm","desc":"Walcourt (18 vues)"},
{"href":"walzin.htm","desc":"Walzin (2 vues)"},
{"href":"wanlin.htm","desc":"Wanlin (9 vues)"},
{"href":"warnant.htm","desc":"Warnant (17 vues)"},
{"href":"warnant_vicinal.htm","desc":"Warnant vicinal"},
{"href":"waulsort.htm","desc":"Waulsort I-II (5 vues)"},
{"href":"waulsort_village.htm","desc":"Waulsort Village (III) (4 vues)"},
{"href":"wiesme.htm","desc":"Wiesme (7 vues)"},
{"href":"yves_gomezee.htm","desc":"Yves Gomezée I-II (8 vues)"},
{"href":"yvoir.htm","desc":"Yvoir I-II (1 plan + 20 vues)"},
{"href":"yvoir_carrieres.htm","desc":"Yvoir Carrières (6 vues)"},


{"href":"archennes.htm","desc":"Archennes (7 vues)"},
{"href":"archennes_vicinal.htm","desc":"Archennes vicinal (3 vues)"}, 
{"href":"autre_eglise.htm","desc":"Autre Eglise (9 vues)"},
{"href":"basse_wavre.htm","desc":"Basse Wavre (6 vues)"},
{"href":"baulers.htm","desc":"Baulers (10 vues)"},
{"href":"beauvechain.htm","desc":"Beauvechain vicinale (8 vues)"},
{"href":"bierghes.htm","desc":"Bierghes (6 vues)"}, 
{"href":"blanmont.htm","desc":"Blanmont (10 vues)"},
{"href":"bousval.htm","desc":"Bousval (2 vues)"},
{"href":"braine_l_alleud.htm","desc":"Braine l'alleud (16 vues)"},
{"href":"braine_le_chateau.htm","desc":"Braine le Chateau (5 vues)"},
{"href":"ceroux.htm","desc":"Ceroux Mousty (8 vues)"},
{"href":"chapelle_saint_lambert.htm","desc":"Chapelle St Lambert Vic (3 vues)"},
{"href":"chastre.htm","desc":"Chastre I-II (8 vues)"},
{"href":"clabecq.htm","desc":"Clabecq (5 vues)"},
{"href":"court_saint_etienne.htm","desc":"Court Saint Etienne (8 vues)"},
{"href":"dongelberg.htm","desc":"Dongelberg (vicinale) (2 vues)"},
{"href":"faux.htm","desc":"Faux I-II (9 vues)"},
{"href":"florival.htm","desc":"Florival (8 vues)"},
{"href":"gastuche.htm","desc":"Gastuche (8 vues)"},
{"href":"genappe.htm","desc":"Genappe (5 vues)"},
{"href":"genval.htm","desc":"Genval II-III (17 vues)"},
{"href":"grand_leez.htm","desc":"Grand Leez Thorembais (11 vues)"},
{"href":"grez_doiceau_vicinal.htm","desc":"Grez Doiceau vicinale (7 vues)"},
{"href":"hamme_mille_vicinal.htm","desc":"Hamme Mille vicinale"},
{"href":"hedenge.htm","desc":"Hédenge (7 vues)"},
{"href":"huppaye.htm","desc":"Huppaye (9 vues)"},
{"href":"jauche.htm","desc":"Jauche (7 vues)"},
{"href":"jodoigne.htm","desc":"Jodoigne (3 vues)"},
{"href":"la_hulpe.htm","desc":"La Hulpe I-II (21 vues)"},
{"href":"la_roche.htm","desc":"La Roche (13 vues)"},
{"href":"lasnes.htm","desc":"Lasnes gare vicinale (7 vues) "},
{"href":"lillois.htm","desc":"Lillois I-II (14 vues)"},
{"href":"limal.htm","desc":"Limal (5 vues)"},  
{"href":"limelette_buston.htm","desc":"Limelette-Buston (3 vues)"},
{"href":"maransart.htm","desc":"Maransart-Aywiers gare vic (14)"},
{"href":"marbisoux.htm","desc":"Marbisoux"},
{"href":"maret.htm","desc":"Maret (6 vues)"},
{"href":"mont_saint_guibert.htm","desc":"Mont-Saint-Guibert I-II (15 vues)"}, 
{"href":"nethen.htm","desc":"Nethen vicinal (4)"},
{"href":"niderand.htm","desc":"Nidérand"},
{"href":"nivelles_est.htm","desc":"Nivelles Est (13 vues)"},
{"href":"nivelles_nord.htm","desc":"Nivelles Nord (4 vues)"},
{"href":"nodebais.htm","desc":"Nodebais (5 vues)"},
{"href":"noirhat.htm","desc":"Noirhat (3 vues)"},
{"href":"noucelles.htm","desc":"Noucelles (7 vues)"},
{"href":"oisquercq.htm","desc":"Oisquercq"},
{"href":"opheylissem.htm","desc":"Opheylissem"},
{"href":"orp.htm","desc":"Orp (10 vues)"},
{"href":"ottignies.htm","desc":"Ottignies I-II (24 vues)"},
{"href":"pecrot.htm","desc":"Pecrot (3 vues)"},
{"href":"perwez.htm","desc":"Perwez (2 vues)"},
{"href":"petit_rosiere.htm","desc":"Petit Rosière (8 vues)"},
{"href":"profondsart.htm","desc":"Profondsart I-II (9 vues)"},
{"href":"quenast.htm","desc":"Quenast (15 vues)"},
{"href":"ramillies.htm","desc":"Ramillies (22 vues)"},
{"href":"rebecq.htm","desc":"Rebecq (22 vues)"},
{"href":"rebecq_2021.htm","desc":"Rebecq-RRR en 2021 (16 vues)"}, 
{"href":"rixensart.htm","desc":"Rixensart I-II (19 vues)"},
{"href":"rognon.htm","desc":"Rognon (15 vues/2 plans)"},
{"href":"saintes.htm","desc":"Saintes (2 vues)"},
{"href":"saint_jean_geest.htm","desc":"Saint-Jean-Geest (2 vues)"},
{"href":"sart_moulin.htm","desc":"Sart Moulin (5 vues)"},
{"href":"sart_risbart.htm","desc":"Sart Risbart vicinale (17 vues)"},
{"href":"thy.htm","desc":"Thy (4 vues)"},
{"href":"tilly.htm","desc":"Tilly (6 vues)"},
{"href":"tourinnes.htm","desc":"Tourinnes-la-Grosse (3 vues)"},
{"href":"tubize.htm","desc":"Tubize I-II (11 vues)"},
{"href":"villers_la_ville.htm","desc":"Villers La Ville (6 vues)"},
{"href":"virginal.htm","desc":"Virginal (2 vues)"},
{"href":"waterloo.htm","desc":"Waterloo I-II (33 vues)"},
{"href":"wauthier.htm","desc":"Wauthier (5 vues)"},
{"href":"wavre.htm","desc":"Wavre (20 vues)"},
{"href":"zetrud.htm","desc":"Zétrud Lumay (10 vues)"},


{"href":"arlon.htm","desc":"Arlon (22 vues)"},
{"href":"athus.htm","desc":"Athus (5 vues)"},
{"href":"aubange.htm","desc":"Aubange (5 vues)"},
{"href":"aye.htm","desc":"Aye (11 vues)"},
{"href":"bande.htm","desc":"Bande vicinal"},
{"href":"baranzy.htm","desc":"Baranzy (4 vues)"},
{"href":"barvaux.htm","desc":"Barvaux (10 vues)"},
{"href":"bastogne_sud.htm","desc":"Bastogne Sud (12 vues)"},
{"href":"bastogne_nord.htm","desc":"Bastogne Nord (3 vues)"},
{"href":"beho.htm","desc":"Beho"},
{"href":"belmont.htm","desc":"Belmont (4 vues)"},
{"href":"benonchamps.htm","desc":"Benonchamps (3 vues)"},
{"href":"bernimont.htm","desc":"Bernimont (3 vues)"},
{"href":"bertrix.htm","desc":"Bertrix (14 vues)"},
{"href":"bodange.htm","desc":"Bodange"},
{"href":"bomal.htm","desc":"Bomal I-II (5 vues)"},
{"href":"bouillon.htm","desc":"Bouillon (vicinale, 4 vues)"},
{"href":"bourcy.htm","desc":"Bourcy (+ vicinal) (11 + 1 vues)"},
{"href":"bovigny.htm","desc":"Bovigny (4 vues)"},
{"href":"burtonville.htm","desc":"Burtonville (+ viaduc)"}, 
{"href":"buzenol.htm","desc":"Buzenol (4 vues)"},
{"href":"carlsbourg.htm","desc":"Carlsbourg (9 vues)"},
{"href":"chatillon_vicinal.htm","desc":"Châtillon"}, 
{"href":"cierreux.htm","desc":"Cierreux"},
{"href":"corbion.htm","desc":"Corbion (vicinale)"}, 
{"href":"croix_rouge.htm","desc":"Croix Rouge (3 vues)"},
{"href":"cugnon.htm","desc":"Cugnon Mortehan"},
{"href":"etalle_vicinal.htm","desc":"Etalle vicinal"},
{"href":"ethe.htm","desc":"Ethe"},
{"href":"ethe_vicinal.htm","desc":"Ethe vicinale (2 vues)"},
{"href":"florenville.htm","desc":"Florenville (16 vues)"},
{"href":"florenville_vicinale.htm","desc":"Florenville vicinale (5)"},
{"href":"forrieres.htm","desc":"Forrières (10 vues)"},
{"href":"fouche.htm","desc":"Fouche (5 vues)"},
{"href":"gantaufet.htm","desc":"Gantaufet"},
{"href":"gouvy.htm","desc":"Gouvy (5 vues)"},
{"href":"gorcy.htm","desc":"Gorcy (FR) (3 vues)"},
{"href":"grandhalleux.htm","desc":"Grand halleux I-II (5 vues)"},
{"href":"grupont.htm","desc":"Grupont (9 vues)"},
{"href":"habay.htm","desc":"Habay la vieille (7 vues)"},
{"href":"halanzy.htm","desc":"Halanzy 23 vues)"},
{"href":"hamipre.htm","desc":"Hamipré (2 vues)"},
{"href":"hatrival.htm","desc":"Hatrival (17 vues)"},
{"href":"herbeumont.htm","desc":"Herbeumont (3 vues)"},
{"href":"houdemont.htm","desc":"Houdemont (3 vues)"},
{"href":"houdrigny.htm","desc":"Houdrigny"},
{"href":"houffalize.htm","desc":"Houffalize vicinale (10)"},
{"href":"izel.htm","desc":"Izel (6 vues)"},
{"href":"jamoigne.htm","desc":"Jamoigne (3 vues)"},
{"href":"lacuisine.htm","desc":"Lacuisine (7 vues)"},
{"href":"lamorteau.htm","desc":"Lamorteau (6 vues)"},
{"href":"laroche_vicinal.htm","desc":"Laroche vicinal (15 vues)"},
{"href":"lavacherie.htm","desc":"Lavacherie"},
{"href":"lavaux.htm","desc":"Lavaux (3 vues)"}, 
{"href":"les_epioux.htm","desc":"Les Epioux (8 vues)"},
{"href":"lesterny.htm","desc":"Lesterny"},
{"href":"libin.htm","desc":"Libin vicinal"},
{"href":"libramont.htm","desc":"Libramont (6 vues)"},
{"href":"limerle.htm","desc":"Limerlé (4 vues)"},
{"href":"longlier.htm","desc":"Longlier Neufchâteau (30 vues)"},
{"href":"maissin.htm","desc":"Maissin vicinal"}, 
{"href":"manhay.htm","desc":"Manhay vicinal (5 vues)"},
{"href":"marbehan.htm","desc":"Marbehan I-II (5 vues)"},
{"href":"marche.htm","desc":"Marche-en-Famenne (14 vues)"},
{"href":"marloie_vicinal.htm","desc":"Marloie vicinal (6 vues)"}, 
{"href":"marloie.htm","desc":"Marloie I-II (19 vues)"},
{"href":"martelange.htm","desc":"Martelange vicinal (3 vues)"},
{"href":"meix_devant_virton.htm","desc":"Meix devant Virton (9 vues)"}, 
{"href":"mellier.htm","desc":"Mellier (10 vues)"},
{"href":"messancy.htm","desc":"Messancy (4 vues)"},
{"href":"melreux.htm","desc":"Melreux Hotton (4 vues)"},
{"href":"mirwart.htm","desc":"Mirwart (2 vues)"}, 
{"href":"morhet.htm","desc":"Morhet (2 vues)"}, 
{"href":"muno.htm","desc":"Muno (9 vues)"},
{"href":"musson.htm","desc":"Musson (12 vues)"},
{"href":"longlier.htm","desc":"Neufchâteau (30 vues) > voir Longlier"},
{"href":"neuvillers.htm","desc":"Neuvillers"},
{"href":"offagne.htm","desc":"Offagne"},
{"href":"opont.htm","desc":"Opont vicinale"},
{"href":"orgeo.htm","desc":"Orgéo"},
{"href":"ourt.htm","desc":"Ourt (5 vues)"}, 
{"href":"paliseul.htm","desc":"Paliseul (15 vues)"},
{"href":"pierrard.htm","desc":"Pierrard (Ecole)"}, 
{"href":"pin.htm","desc":"Pin (3 vues)"}, 
{"href":"poix.htm","desc":"Poix (17 vues)"},
{"href":"poix_saint_hubert_vicinal.htm","desc":"Poix-St-Hubert Vicinale (2 vues)"},
{"href":"recogne.htm","desc":"Recogne (7 vues)"},
{"href":"rencheux.htm","desc":"Rencheux (3 vues)"},
{"href":"resteigne.htm","desc":"Resteigne vicinal (2 vues)"},
{"href":"rosieres.htm","desc":"Rosières (6 vues)"},
{"href":"rossart.htm","desc":"Rossart (11 vues)"},
{"href":"ruette.htm","desc":"Ruette (3 vues)"},
{"href":"saint_hubert_vicinal.htm","desc":"Saint Hubert Vicinal (4 vues)"},
{"href":"saint_leger_vicinal.htm","desc":"Saint Léger Vicinal (4 vues)"},  
{"href":"saint_medard.htm","desc":"Saint Médard (10 vues)"},
{"href":"saint_vincent_bellefontaine.htm","desc":"Saint Vincent Bel (18)"},
{"href":"saint_vincent_bellefontaine_vicinal.htm","desc":"Saint Vincent Bel. Vic. (2)"},
{"href":"sainte_marie_sur_semois.htm","desc":"Sainte Marie [Sur Semois] (3)"},
{"href":"sibret.htm","desc":"Sibret (8 vues)"},
{"href":"signeulx.htm","desc":"Signeulx (7 vues)"},
{"href":"sterpenich.htm","desc":"Sterpenich (7 vues)"},
{"href":"stockem.htm","desc":"Stockem (20 vues)"},
{"href":"straimont.htm","desc":"Straimont"}, 
{"href":"tavigny.htm","desc":"Tavigny (9 vues)"},
{"href":"turpange.htm","desc":"Turpange (3 vues)"},
{"href":"vielsalm.htm","desc":"Vielsalm (10 vues + viaduc)"},
{"href":"villeroux.htm","desc":"Villeroux (3 vues)"},
{"href":"villers_sur_semois.htm","desc":"Vilers-sur-Semois (7 vues)"},
{"href":"virton.htm","desc":"Virton (Saint Mard) (26 vues)"},
{"href":"virton_ville.htm","desc":"Virton (Ville) (5 vues)"},
{"href":"viville.htm","desc":"Viville (6 vues)"},
{"href":"wellin_vicinal.htm","desc":"Wellin Vicinal (5 vues)."},
{"href":"wideumont.htm","desc":"Wideumont (7 vues)"},

{"href":"amay.htm","desc":"Amay (4 vues)"},
{"href":"ampsin.htm","desc":"Ampsin (6 vues)"},
{"href":"angleur.htm","desc":"Angleur I-II (6 vues)"},
{"href":"ans.htm","desc":"Ans (4 vues)"},
{"href":"ans_est.htm","desc":"Ans Est (3 vues)"},
{"href":"argenteau.htm","desc":"Argenteau (11 vues)"},
{"href":"astenet.htm","desc":"Astenet (2 vues)"},
{"href":"aubel.htm","desc":"Aubel (13 vues)"},
{"href":"avennes.htm","desc":"Avennes (3 vues/1 plan)"},
{"href":"avernas.htm","desc":"Avernas (2 vues/1 plan)"},
{"href":"aywaille.htm","desc":"Aywaille (10 vues)"},
{"href":"barse.htm","desc":"Barse (7 vues)"},
{"href":"bas_oha.htm","desc":"Bas-Oha (4 vues)"},
{"href":"bassenge.htm","desc":"Bassenge"}, 
{"href":"battice.htm","desc":"Battice (6 vues)"},
{"href":"beyne.htm","desc":"Beyne (6 vues)"},
{"href":"bierset.htm","desc":"Bierset I-II [Awans] (5 vues)"},
{"href":"bleyberg.htm","desc":"Bleyberg / Plombières (11 vues)"},
{"href":"bois_de_breux.htm","desc":"Bois de Breux (2 vues)"},
{"href":"braives.htm","desc":"Braives (7 vues + 1 plan)"},
{"href":"bressoux.htm","desc":"Bressoux I-II-III (6 vues-1 plan)"},
{"href":"bullange.htm","desc":"BÃ¼llingen/Bullange (2 vues)"},
{"href":"burdinne.htm","desc":"Burdinne (22 vues)"},
{"href":"butgenbach.htm","desc":"BÃ¼tgenbach (2 vues)"},
{"href":"chaineux.htm","desc":"Chaineux (2 vues)"},
{"href":"chanxhe.htm","desc":"Chanxhe (2 vues)"},
{"href":"chaudfontaine.htm","desc":"Chaudfontaine (30 vues)"},
{"href":"chenee.htm","desc":"Chênée II (3 vues)"},
{"href":"cheneeIII.htm","desc":"Chênée III (16 vues/1 plan)"},
{"href":"cheratte.htm","desc":"Cheratte (2 vues)"},
{"href":"clavier.htm","desc":"Clavier (10 vues-1 plan)"},
{"href":"comblain_au_pont.htm","desc":"Comblain au Pont (11 vues)"},
{"href":"comblain_la_tour.htm","desc":"Comblain la Tour I-II (24 vues)"},
{"href":"coo.htm","desc":"Coo II (5 vues)"}, 
{"href":"cornesse.htm","desc":"Cornesse"},
{"href":"corswarem.htm","desc":"Corswarem (2 vues)"},
{"href":"dison.htm","desc":"Dison (5 vues)"},
{"href":"dolhain.htm","desc":"Dolhain Gileppe (4 vues)"},
{"href":"dolhain_II.htm","desc":"Dolhain Gileppe II (22 vues)"},
{"href":"dolhain_vicinal.htm","desc":"Dolhain Vicinal (4 vues)"},
{"href":"elsenborn.htm","desc":"Elsenborn (2 vues)"},
{"href":"engis.htm","desc":"Engis (8 vues)"},
{"href":"ensival.htm","desc":"Ensival I-II (4 vues)"},
{"href":"envoz.htm","desc":"Envoz (10 vues)"},
{"href":"esneux.htm","desc":"Esneux (13 vues)"},
{"href":"eupen.htm","desc":"Eupen I-II (4 vues/2 plans)"},
{"href":"eupen_vicinal.htm","desc":"Eupen vicinal"},
{"href":"fallais.htm","desc":"Fallais (+ 1 plan)"},
{"href":"faymonville.htm","desc":"Faymonville"},
{"href":"fexhe_le_haut_clocher.htm","desc":"Fexhe Le Haut C. (11 vues)"},
{"href":"flemalle_grande.htm","desc":"Flemalle Grande (5 vues)"},
{"href":"flemalle_haute.htm","desc":"Flemalle Haute (11 vues)"},
{"href":"fleron.htm","desc":"Fléron (8 vues)"},
{"href":"fleury.htm","desc":"Fleury (1 vue/1 plan)"},
{"href":"fourneau.htm","desc":"Fourneau (2 vues/1 plan)"},
{"href":"fraipont.htm","desc":"Fraipont (18 vues)"},
{"href":"franchimont.htm","desc":"Franchimont (9 vues)"},
{"href":"francorchamps.htm","desc":"Francorchamps (7 vues)"},
{"href":"froidthier.htm","desc":"Froidthier (3 vues)"},
{"href":"fumal.htm","desc":"Fumal (3 vues/1 plan)"},
{"href":"gemmenich.htm","desc":"Gemmenich (14 vues)"},
{"href":"glons.htm","desc":"Glons (17 vues)"},
{"href":"goffontaine.htm","desc":"Goffontaine (2 vues)"},
{"href":"gomze_andoumont.htm","desc":"Gomzé Andoumont vicinal"}, 
{"href":"hamoir.htm","desc":"Hamoir (15 vues)"},
{"href":"hannut.htm","desc":"Hannut (9 vues/1 plan)"}, 
{"href":"haute_flone.htm","desc":"Haute FlÃ´ne (5 vues)"}, 
{"href":"henne.htm","desc":"Henne Chèvremont(4 vues)"},
{"href":"henri_chapelle.htm","desc":"Henri Chapelle"}, 
{"href":"herbestal.htm","desc":"Herbesthal (7 vues)"},
{"href":"herbestal_2019.htm","desc":"Herbesthal en 2019 (42 vues)"},
{"href":"hergenrath.htm","desc":"Hergenrath II (14 vues)"},
{"href":"hermalle_sous_huy.htm","desc":"Hermalle S Huy (8 vues)"}, 
{"href":"herstal.htm","desc":"Herstal I-II (9 vues)"}, 
{"href":"herstal_2017.htm","desc":"Herstal 2017 (6 vues)"},
{"href":"herve.htm","desc":"Herve I-II-III (12 vues)"},
{"href":"hindel_bas.htm","desc":"Hindel bas"}, 
{"href":"hockai.htm","desc":"Hockai (16 vues)"},
{"href":"hombourg.htm","desc":"Hombourg (16 vues)"},
{"href":"hony.htm","desc":"Hony (6 vues)"},
{"href":"huccorgne.htm","desc":"Huccorgne (3 vues/1 plan)"},
{"href":"huy_ville.htm","desc":"Huy Ville (5 vues/1 plan)"}, 
{"href":"huy_nord_I.htm","desc":"Huy Nord I (21 vues)"},
{"href":"huy_nord_II.htm","desc":"Huy Nord II (3 vues)"},
{"href":"huy_saint_hilaire.htm","desc":"Huy St Hilaire (10 vues/1 plan)"}, 
{"href":"huy_sud.htm","desc":"Huy Sud 11 vues/1 plan)"},
{"href":"java.htm","desc":"Java"},
{"href":"jemeppe_sur_meuse.htm","desc":"Jemeppe Sur Meuse (5 vues)"},
{"href":"jupille.htm","desc":"Jupille"}, 
{"href":"juslenville.htm","desc":"Juslenville (11 vues)"},
{"href":"kalterherberg.htm","desc":"Kalterherberg (6 vues)"},
{"href":"kinkempois.htm","desc":"Kinkempois I-II (6 vues)"}, 
{"href":"konzen.htm","desc":"Konzen (2 vues)"}, 
{"href":"la_brouck.htm","desc":"La Brouck (2 vues)"}, 
{"href":"la_gleize.htm","desc":"La Gleize (5 vues)"},
{"href":"la_prealle.htm","desc":"La Préalle"},
{"href":"la_reid.htm","desc":"La Reid (2 vues)"},
{"href":"lambermont.htm","desc":"Lambermont (2 vues)"}, 
{"href":"lammersdorf.htm","desc":"Lammersdorf (3 vues)"},  
{"href":"lengeler.htm","desc":"Lengeler (3 vues)"}, 
{"href":"les_avins_en_condroz.htm","desc":"Les Avins en Condroz (10 vues)"},
{"href":"liege_jonfosse.htm","desc":"Liège Carré (5 vues/1 plan)"},
{"href":"liege_guillemins_I.htm","desc":"Liège Guillemins I (2 vues)"},
{"href":"liege_guillemins_II.htm","desc":"Liège Guillemins II (9 vues)"},
{"href":"liege_guillemins_III.htm","desc":"Liège Guillemins III (7 vues)"},
{"href":"liege_guillemins_IV.htm","desc":"Liège Guillemins IV (9 vues)"},
{"href":"liege_haut_pre.htm","desc":"Liège Haut pré (3 vues/1 plan)"},
{"href":"liege_jonfosse.htm","desc":"Liège Jonfosse (5 vues/1 plan)"},
{"href":"liege_longdoz.htm","desc":"Liège Longdoz (15 vues/3 plans)"},
{"href":"liege_longdoz_1982.htm","desc":"Liège Longdoz 1982(2 vues/bonus)"}, 
{"href":"liege_longdoz_fin.htm","desc":"Liège Longdoz démolition (12 planches)"}, 
{"href":"liege_montegnee.htm","desc":"Liège Montegnée"},
{"href":"liege_palais.htm","desc":"Liège Palais I-II-III (16 vues/1 plan)"},
{"href":"liege_palais.htm","desc":"Liège Saint Lambert"},
{"href":"liege_vivegnis.htm","desc":"Liège Vivegnis (4 vues/1 c)"},
{"href":"lierneux.htm","desc":"Lierneux gare vicinale (8 vues)"}, 
{"href":"liers.htm","desc":"Liers (9 vues)"},
{"href":"lincent.htm","desc":"Lincent (3 vues)"}, 
{"href":"liotte.htm","desc":"Liotte (5 vues)"},
{"href":"lommersweiler.htm","desc":"Lommersweiler (2 vues)"},
{"href":"lorce_chevron.htm","desc":"Nazé > Lorcé-Chevron (3)"},
{"href":"losheimergraben.htm","desc":"Losheimergraben (3 vues)"}, 
{"href":"malmedy.htm","desc":"Malmedy I-II (10 vues)"},
{"href":"marchin.htm","desc":"Marchin (2 vues)"}, 
{"href":"marteau.htm","desc":"Marteau"},
{"href":"martinrive.htm","desc":"Martinrive (2 vues)"},
{"href":"masta.htm","desc":"Masta"}, 
{"href":"meiz.htm","desc":"Meiz"},  
{"href":"melen.htm","desc":"Melen(3 vues)"},
{"href":"mery.htm","desc":"Méry I-II (11 vues)"},
{"href":"micheroux.htm","desc":"Micheroux (8 vues)"},
{"href":"milmort.htm","desc":"Milmort (6 vues)"},
{"href":"modave.htm","desc":"Modave (4 vues/1 plan)"},
{"href":"modave_village.htm","desc":"Modave village (5 vues/1 plan)"}, 
{"href":"moha.htm","desc":"Moha (3 vues/1 plan)"},
{"href":"momalle.htm","desc":"Momalle (8 vues)"}, 
{"href":"monschau.htm","desc":"Monschau/Montjoie I-II (5 vues)"}, 
{"href":"montenau.htm","desc":"Montenau (3 vues)"},
{"href":"montzen.htm","desc":"Montzen (2 vues)"},
{"href":"moresnet.htm","desc":"Moresnet (7 vues)"},
{"href":"nessonvaux.htm","desc":"Nessonvaux (25 vues)"},
{"href":"niveze.htm","desc":"Nivezé"},
{"href":"nonceveux.htm","desc":"Nonceveux"},
{"href":"ougree.htm","desc":"Ougrée I-II (8 vues)"}, 
{"href":"pepinster_I.htm","desc":"Pepinster I (0 vue)"},
{"href":"pepinster_II.htm","desc":"Pepinster II (8 vues)"},
{"href":"pepinster_III.htm","desc":"Pepinster III (15 vues)"},
{"href":"pepinster_cite.htm","desc":"Pepinster Cité (8 vues)"},
{"href":"plombieres.htm","desc":"Plombières (Bleyberg) (6 vues)"},
{"href":"pont_d_argenteau.htm","desc":"Pont d' Argenteau (3 vues)"},     
{"href":"poulseur.htm","desc":"Poulseur II (16 vues)"},
{"href":"quarreux.htm","desc":"Quarreux"},
{"href":"racour.htm","desc":"Racour (13 vues)"},
{"href":"raeren.htm","desc":"Raeren (9 vues)"}, 
{"href":"recht.htm","desc":"Recht (4 vues)"}, 
{"href":"regissa.htm","desc":"Regissa (2 vues)"},
{"href":"remicourt.htm","desc":"Remicourt (8 vues)"},
{"href":"remouchamps.htm","desc":"Remouchamps (12 vues)"},
{"href":"retinne.htm","desc":"Retinne (5 vues)"},
{"href":"reuland.htm","desc":"Reuland (9 vues)"},
{"href":"rivage.htm","desc":"Rivage (24 vues)"},
{"href":"roanne.htm","desc":"Roanne Coo (5 vues)"},
{"href":"rocourt.htm","desc":"Rocourt (6 vues)"},
{"href":"roetgen.htm","desc":"Roetgen (3 vues)"},
{"href":"roiseux.htm","desc":"Roiseux (2 vues/1plan)"}, 
{"href":"saint_severin.htm","desc":"Saint Séverin (5 vues)"},
{"href":"saint_vith.htm","desc":"Saint Vith (8 vues)"},
{"href":"sainval.htm","desc":"Sainval (7 vues)"}, 
{"href":"sart_lez_spa.htm","desc":"Sart Lez Spa (9 vues)"},
{"href":"sauheid.htm","desc":"Sauheid"},
{"href":"sclessin.htm","desc":"Sclessin (3 vues)"},
{"href":"seraing.htm","desc":"Seraing I-II (5 vues)"},
{"href":"sourbrodt.htm","desc":"Sourbrodt (13 vues)"},
{"href":"sourbrodt_2022.htm","desc":"Sourbrodt en 2022 (21 vues)"},
{"href":"souverain_wandre.htm","desc":"Souverain-Wandre"},
{"href":"souverain_pre.htm","desc":"Souverain-Pré"}, 
{"href":"souvre.htm","desc":"Souvré (3 vues)"}, 
{"href":"spa_I.htm","desc":"Spa I (2 vues)"}, 
{"href":"spa.htm","desc":"Spa II (13 vues)"},
{"href":"spa_geronstere.htm","desc":"Spa-Géronstère (14 vues)"},
{"href":"statte.htm","desc":"Statte (17 vues)"},
{"href":"statte_vicinale.htm","desc":"Statte gare vicinale (2 vues)"},
{"href":"stavelot.htm","desc":"Stavelot"},               
{"href":"steinebruck.htm","desc":"Steinebruck (2 vues)"},
{"href":"stoumont.htm","desc":"Stoumont (5 vues)"},
{"href":"sy.htm","desc":"Sy (12 vues)"},
{"href":"theux.htm","desc":"Theux (17 vues)"},
{"href":"thimister.htm","desc":"Thimister-Clermont (2 vues)"},
{"href":"tilff.htm","desc":"Tilff (21 vues)"},
{"href":"tilleur.htm","desc":"Tilleur (2 vues)"},
{"href":"trooz.htm","desc":"Trooz (6 vues)"},
{"href":"trois_ponts.htm","desc":"Trois Ponts II (11 vues)"},
{"href":"val_saint_lambert.htm","desc":"Val Saint Lambert (7 vues/1 plan/2 bonus)"},
{"href":"val_saint_lambert_vicinal.htm","desc":"Val Saint Lambert Vicinal"},
{"href":"vaux_sous_chevremont.htm","desc":"Vaux S Ch (2 vues)"},
{"href":"verlaine_vicinal.htm","desc":"Verlaine gare vicinale"},
{"href":"verviers_ouest.htm","desc":"Verviers Ouest (7 vues)"},
{"href":"verviers_est.htm","desc":"Verviers Est (4 vues)"},
{"href":"verviers.htm","desc":"Verviers Central (8 vues)"},
{"href":"verviers_galerie_2016.htm","desc":"Verviers C 2015-2016 (15 photos)"},
{"href":"verviers_galerie_2019.htm","desc":"Verviers C 2019 (21 photos)"},
{"href":"verviers_matadi.htm","desc":"Verviers Matadi (5 vues)"}, 
{"href":"verviers_palais.htm","desc":"Verviers Palais (2 vues)"},
{"href":"vinalmont.htm","desc":"Vinalmont"}, 
{"href":"vise_I.htm","desc":"Visé I (3 vues/1 plan)"}, 
{"href":"vise_II.htm","desc":"Visé II (3 vues/1 plan)"}, 
{"href":"vise_III.htm","desc":"Visé III (2 vues/1 plan)"},
{"href":"vise_IV.htm","desc":"Visé IV (14 vues/1 plan)"}, 
{"href":"vyle_tharoul.htm","desc":"Vyle (et) Tharoul (4 vues/1 plan)"}, 
{"href":"waimes.htm","desc":"Waimes (8 vues)"},
{"href":"wandre.htm","desc":"Wandre"},
{"href":"waremme.htm","desc":"Waremme I-II (26 vues)"},
{"href":"waremme_vicinal.htm","desc":"Waremme gare vicinale (2 vues)"},
{"href":"warsage.htm","desc":"Warsage (2 vues)"},
{"href":"welkenraedt.htm","desc":"Welkenraedt I-II-III (23 vues)"},
{"href":"welkenraedt_ouest.htm","desc":"Welkenraedt Ouest"},
{"href":"weywertz.htm","desc":"Weywertz I-II-III (8 vues)"},

{"href":"acoz.htm","desc":"Acoz (18 vues)"},
{"href":"acren.htm","desc":"Acren (11 vues)"},
{"href":"aiseau.htm","desc":"Aiseau (7 vues)"},
{"href":"amougies.htm","desc":"Amougies"},
{"href":"anderlues.htm","desc":"Anderlues (14 vues)"},
{"href":"angre.htm","desc":"Angre (4 vues)"},
{"href":"angreau.htm","desc":"Angreau"},
{"href":"antoing.htm","desc":"Antoing I-II-III (11 vues)"},
{"href":"anvaing.htm","desc":"Anvaing"},
{"href":"ath.htm","desc":"Ath (13 vues + 1 plan)"},
{"href":"audregnies.htm","desc":"Audregnies (2 vues)"},
{"href":"barry_maulde.htm","desc":"Barry Maulde (2 vues)"},
{"href":"bascoup.htm","desc":"Bascoup (6 vues)"},
{"href":"bascoup_etat.htm","desc":"Bascoup Etat (+ 1 plan)"},
{"href":"basecles.htm","desc":"Basècles (3 vues)"},
{"href":"basecles_carrieres.htm","desc":"Basècles Carrières (2 vues)"},
{"href":"bassilly.htm","desc":"Bassilly (11 vues / 1 plan)"}, 
{"href":"baudour.htm","desc":"Baudour (4 vues)"},
{"href":"beaumont.htm","desc":"Beaumont (4 vues)"},
{"href":"beignee.htm","desc":"Beignée I-II (11 vues)"},
{"href":"bellecourt.htm","desc":"Bellecourt"},
{"href":"beloeil.htm","desc":"Beloeil (4 vues)"},
{"href":"bernissart.htm","desc":"Bernissart (10 vues)"},
{"href":"bienne_lez_happart.htm","desc":"Bienne lez Happart (3 vues)"},
{"href":"binche_I.htm","desc":"Binche I (5 vues)"},
{"href":"binche_II.htm","desc":"Binche II (18 vues)"},
{"href":"binche_2017.htm","desc":"Binche II en 2017 (14 vues)"},
{"href":"binche_2019.htm","desc":"Binche II en 2019 (40 vues)"},
{"href":"blandain.htm","desc":"Blandain (12 vues)"},
{"href":"blaregnies.htm","desc":"Blaregnies (2 vues)"}, 
{"href":"blaton.htm","desc":"Blaton I-II (7 vues)"},
{"href":"bleharie.htm","desc":"Bléharies (2 vues)"},
{"href":"bois_du_luc.htm","desc":"Bois du Luc"},
{"href":"bois_noel.htm","desc":"Bois NoÃ«l"},
{"href":"bomeree.htm","desc":"Bomerée"},
{"href":"bonne_esperance.htm","desc":"Bonne Espérance I-II (9 vues)"},
{"href":"bouffioulx.htm","desc":"Bouffioulx (2 vues)"},
{"href":"boussu.htm","desc":"Boussu I-II (22 vues)"},
{"href":"boussu_bois.htm","desc":"Boussu-Bois (1 vue-1 plan)"},
{"href":"boussu_haine.htm","desc":"Boussu-Haine (2 vues)"},
{"href":"boussu_route.htm","desc":"Boussu-Route (2 vues-1 plan)"},
{"href":"bracquegnies.htm","desc":"Bracquegnies I-II (12 vues)"}, 
{"href":"braine_le_comte.htm","desc":"Braine Le Comte (13 vues)"},
{"href":"braine_le_comte_2015_2019.htm","desc":"Braine Le Comte 2015-2016 (16 PH)"},
{"href":"brugelette.htm","desc":"Brugelette I-II (12 vues)"},
{"href":"buvrinnes.htm","desc":"Buvrinnes(3 vues)"},
{"href":"callenelle.htm","desc":"Callenelle (4 vues)"},
{"href":"cambron.htm","desc":"Cambron Casteau (6 vues)"},
{"href":"carnieres.htm","desc":"Carnières (15 vues)"},
{"href":"celles_escanaffles.htm","desc":"Celles Escanaffles"},
{"href":"chapelle_a_wattines.htm","desc":"Chapelle Ã  Wattines"},
{"href":"charleroi_ouest.htm","desc":"Charleroi Ouest I-II-III (23 vues)"},
{"href":"charleroi_sud.htm","desc":"Charleroi Sud (22 vues)"},
{"href":"charleroi_sud_vicinal.htm","desc":"Charleroi Sud TEC (10 vues)"}, 
{"href":"charleroi_ville_haute.htm","desc":"Charleroi Ville Haute (3 vues)"},
{"href":"chassart.htm","desc":"Chassart (1 vue + 1 plan)"}, 
{"href":"chatelineau_chatelet.htm","desc":"Chatelineau Châtelet II III (9 vues)"},
{"href":"chercq.htm","desc":"Chercq"},
{"href":"chievres.htm","desc":"Chievres (5 vues)"},
{"href":"chimay.htm","desc":"Chimay (23 vues)"},
{"href":"comines.htm","desc":"Comines I-II (7 vues)"},
{"href":"commune.htm","desc":"Commune (5 vues + 1 plan)"},
{"href":"couillet_centre.htm","desc":"Couillet Centre (20 vues)"},
{"href":"couillet_montignies.htm","desc":"Couillet Montignies (7 vues)"},
{"href":"courcelles_centre.htm","desc":"Courcelles Centre (14 vues)"},
{"href":"courcelles_motte.htm","desc":"Courcelles Motte I-II (11 vues)"},
{"href":"cour_sur_heure.htm","desc":"Cour Sur Heure (12 vues)"},
{"href":"cronfestu.htm","desc":"Cronfestu (2 vues)"},
{"href":"cuesmes_etat.htm","desc":"Cuesmes Etat (13 vues)"},
{"href":"cuesmes_nord.htm","desc":"Cuesmes Nord (4 vues)"},
{"href":"dampremy.htm","desc":"Dampremy Charbonnage (5 vues)"},
{"href":"la_planche.htm","desc":"[Dampremy] La Planche"},
{"href":"dergneau.htm","desc":"Dergneau (8 vues)"},
{"href":"acren.htm","desc":"Deux Acren (voir Acren)"},
{"href":"dottignies.htm","desc":"Dottignies Saint Léger I-II (8 vues)"},
{"href":"dour.htm","desc":"Dour (4 vues/2 plans)"},
{"href":"ecaussinnes_carrieres.htm","desc":"Ecaussinnes (Carrières) I (18 vues)"},
{"href":"ecaussinnes_nord.htm","desc":"Ecaussinnes Nord (6 vues)"},
{"href":"ellezelles.htm","desc":"Ellezelles (3 vues)"},
{"href":"elouges.htm","desc":"Elouges (3 vues)"},
{"href":"enghien.htm","desc":"Enghien (17 vues)"},
{"href":"erbisoeul.htm","desc":"Erbisoeul [BrÃ»lotte] (5 vues)"},  
{"href":"erbisoeul_herchies.htm","desc":"Erbisoeul-Herchies"}, 
{"href":"erquelinnes.htm","desc":"Erquelinnes (21 vues)"},
{"href":"erquelinnes_village.htm","desc":"Erquelinnes village (5 vues)"},
{"href":"estinnes.htm","desc":"Estinnes (11 vues)"},
{"href":"familleureux.htm","desc":"Familleureux (5 vues)"},
{"href":"farciennes.htm","desc":"Farciennes (14 vues)"},
{"href":"fauquez.htm","desc":"Fauquez (3 vues)"},
{"href":"fauroeulx.htm","desc":"Fauroeulx (10 vues)"},
{"href":"feluy_arquennes.htm","desc":"Feluy Arquennes I-II (10 vues)"},
{"href":"flenu_produits.htm","desc":"Flénu Produits (6 vues/2 plans)"},
{"href":"fleurus.htm","desc":"Fleurus (11 vues)"},
{"href":"flobecq.htm","desc":"Flobecq (3 vues)"},
{"href":"flobecqbois.htm","desc":"Flobecq bois (3 vues)"},
{"href":"flobecq_tram.htm","desc":"Flobecq vicinal"},
{"href":"fontaine_valmont.htm","desc":"Fontaine Valmont (6 vues)"},
{"href":"fontaine_l_eveque.htm","desc":"Fontaine L'Evêque (2 vues) "},
{"href":"forchies.htm","desc":"Forchies(-la-Marche) I (11 vues)"},
{"href":"forchiesII.htm","desc":"Forchies II (4 vues)"}, 
{"href":"forges_lez_chimay.htm","desc":"Forges lez Chimay vic (15)"},
{"href":"frameries.htm","desc":"Frameries I-II (13 vues/2 plans)"},
{"href":"frasnes_lez_buissenal.htm","desc":"Frasnes-lez-Anvaing (16 vues)"},  
{"href":"frasnes_lez_buissenal.htm","desc":"Frasnes-lez-Buissenal (16 vues)"},
{"href":"frasnes_lez_gosselies.htm","desc":"Frasnes lez Gosselies (5 vues)"},
{"href":"froidchapelle.htm","desc":"Froidchapelle (8 vues)"},
{"href":"froidmont.htm","desc":"Froidmont"},
{"href":"froyennes.htm","desc":"Froyennes (14 vues)"}, 
{"href":"genly.htm","desc":"Genly (8 vues)"},
{"href":"gerpinnes.htm","desc":"Gerpinnes (7 vues)"},
{"href":"ghislenghien.htm","desc":"Ghislenghien (14 vues)"},
{"href":"ghlin.htm","desc":"Ghlin (9 vues)"}, 
{"href":"ghoy.htm","desc":"Ghoy (2 vues)"},
{"href":"gilly_sart_allet.htm","desc":"Gilly Sart Allet (27 vues)"},
{"href":"gilly_sart_culpart.htm","desc":"Gilly Sart culpart (5 vues)"},
{"href":"godarville.htm","desc":"Godarville (20 vues)"},
{"href":"gosselies.htm","desc":"Gosselies (12 vues)"},
{"href":"gosselies_vicinal.htm","desc":"Gosselies Vicinale (3 vues)"},
{"href":"gosselies_le_carosse.htm","desc":"Gosselies Le Carosse (2) "},
{"href":"gougnies.htm","desc":"Gougnies (6 vues)"},
 {"href":"gouy_lez_pieton.htm","desc":"Gouy lez Piéton (9 vues)"},
{"href":"grandglise.htm","desc":"Grandglise"},
{"href":"grandmetz.htm","desc":"Grandmetz (6 vues)"},
{"href":"grand_reng_.htm","desc":"Grand Reng (5 vues)"},
{"href":"haine_saint_paul.htm","desc":"Haine St Pierre form (2 vues/2 plans)"},
{"href":"haine_saint_pierre_I.htm","desc":"Haine-St-Pierre I (22 vues/2 plans)"},
{"href":"haine_saint_pierre_2016_2019.htm","desc":"Haine-St-Pierre 2016/2019 (17 v)"},
{"href":"haine_saint_pierre_II.htm","desc":"Haine-St-Pierre II (5 vues/2 plans)"}, 
{"href":"hainin.htm","desc":"Hainin I-II (9 vues)"},
{"href":"ham_sur_heure.htm","desc":"Ham Sur Heure (16 vues)"},
{"href":"hamendes.htm","desc":"Hamendes"},
{"href":"harchies.htm","desc":"Harchies (10 vues)"},
{"href":"harmignies.htm","desc":"Harmignies (2 vues)"},
{"href":"hautrage_etat.htm","desc":"Hautrage Etat (2 vues)"},
{"href":"havinnes.htm","desc":"Havinnes (2 vues)"},
{"href":"havre.htm","desc":"Havre I-II (5 vues)"},
{"href":"hayettes.htm","desc":"Hayettes (3 vues - 2 plans)"},
{"href":"hellebecq.htm","desc":"Hellebecq (7 vues - 1 plan)"},
{"href":"hennuyeres.htm","desc":"Hennuyères (15 vues)"},
{"href":"henripont.htm","desc":"Henripont (3 vues)"},
{"href":"herinnes_warcoing.htm","desc":"Hérinnes Warcoing (2 vues)"},
{"href":"herseaux.htm","desc":"Herseaux (11 vues)"},
{"href":"herseaux_place.htm","desc":"Herseaux Place"},
{"href":"hollain.htm","desc":"Hollain (4 vues)"}, 
{"href":"hornu.htm","desc":"Hornu"},
{"href":"houdeng_goegnies.htm","desc":"Houdeng Goegnies (9 vues)"},
{"href":"houraing.htm","desc":"Houraing (9 vues / 1 plan)"},  
{"href":"hourpes.htm","desc":"Hourpes (31 vues)"},
{"href":"huissignies.htm","desc":"Huissignies (3 vues)"},
{"href":"hyon.htm","desc":"Hyon Ciply (4 vues/1 plan)"},
{"href":"isieres.htm","desc":"Isières (6 vues/1 plan)"},
{"href":"jamioulx.htm","desc":"Jamioulx (12 vues)"},
{"href":"jemappes.htm","desc":"Jemappes (19 vues)"},
{"href":"jumet.htm","desc":"Jumet Brulotte (13 vues)"},
{"href":"jumet_hamendes.htm","desc":"Jumet Hamendes (11 vues)"},
{"href":"jurbise.htm","desc":"Jurbise II (6 vues)"},
{"href":"kain.htm","desc":"Kain (5 vues)"}, 
{"href":"la_buissiere.htm","desc":"La Buissière (5 vues)"},
{"href":"la_croyere.htm","desc":"La Croyère (17 vues/1 plan)"},
{"href":"la_louviere_bouvy.htm","desc":"La Louvière Bouvy (6 vues/2 plans)"}, 
{"href":"la_louviere_centre.htm","desc":"La Louvière Centre II-III (11/2)"},
{"href":"la_louviere_centre_2019.htm","desc":"La Louvière Centre III 2019 (28)"}, 
{"href":"la_louviere_sud.htm","desc":"La Louvière Sud I-II (22 vues/2 plans)"},
{"href":"ladeuze.htm","desc":"Ladeuze"},
{"href":"lambusart.htm","desc":"Lambusart (2 vues)"},
{"href":"landelies.htm","desc":"Landelies (10 vues)"},
{"href":"lanquesaint.htm","desc":"Lanquesaint (5 vues)"},
{"href":"la_planche.htm","desc":"[Dampremy] La Planche"}, 
{"href":"le_campinaire.htm","desc":"Le Campinaire (9 vues)"},
{"href":"leers.htm","desc":"Leers Nord (2 vues)"},
{"href":"lens.htm","desc":"Lens (4 vues)"},
{"href":"le_roeulx.htm","desc":"Le RÅ“ulx"},
{"href":"lessines.htm","desc":"Lessines (5 vues)"},
{"href":"lessines_carrieres.htm","desc":"Lessines Carrières (4 vues)"},
{"href":"leuze.htm","desc":"Leuze (17 vues)"},
{"href":"leval.htm","desc":"Leval (19 vues)"},
{"href":"le_vieux_campinaire.htm","desc":"Le Vieux Campinaire (2 vues)"},
{"href":"ligne.htm","desc":"Ligne I-II "},
{"href":"lobbes.htm","desc":"Lobbes (14 vues)"},
{"href":"lodelinsart.htm","desc":"Lodelinsart I-II (10 vues)"},
{"href":"lodelinsart_ouest.htm","desc":"Lodelinsart Ouest"},
{"href":"lompret.htm","desc":"Lompret (7 vues)"},
{"href":"luttre.htm","desc":"Luttre (13 vues)"},
{"href":"macon.htm","desc":"Macon"},
{"href":"maffle.htm","desc":"Maffle (2 vues)"},
{"href":"manage_I.htm","desc":"Manage I (3 vues)"},
{"href":"manage_II.htm","desc":"Manage II (11 vues)"},
{"href":"manage_III.htm","desc":"Manage III (14 vues)"},
{"href":"manage_saint_eloi.htm","desc":"Manage Saint Eloi"},
{"href":"marchienne_au_pont.htm","desc":"Marchienne au Pont (14 vues)"},
{"href":"marchienne_est.htm","desc":"Marchienne Est (2 vues)"},
{"href":"marchienne_zone.htm","desc":"Marchienne Zone (10 vues)"},
{"href":"marche_lez_ecaussinnes.htm","desc":"Marche les Ecaussinnes I-II (6 vues)"},
{"href":"marcq.htm","desc":"Marcq (2 vues)"},
{"href":"mariemont.htm","desc":"Mariemont III (4 vues)"},
{"href":"masnuy_saint_pierre.htm","desc":"Masnuy Saint Pierre (3 vues)"},  
{"href":"masses_diarbois.htm","desc":"Masses Diarbois (Ransart) (3)"},
{"href":"maubray.htm","desc":"Maubray (2 vues)"},
{"href":"merbes.htm","desc":"Merbes Ste Marie (3 vues)"},
{"href":"meslin.htm","desc":"Meslin l'Evêque (7 vues/1 plan)"},
{"href":"mevergnies.htm","desc":"Mévergnies Attre (5 vues)"},
{"href":"mignault.htm","desc":"Mignault (5 vues)"},
{"href":"momignies.htm","desc":"Momignies (3 vues)"},
{"href":"monceau_usines.htm","desc":"Monceau Usines (+ 1 plan)"},
{"href":"mons.htm","desc":"Mons I "},
{"href":"mons_I.htm","desc":"Mons II (10 vues)"},
{"href":"mons_II.htm","desc":"Mons III (9 vues)"},
{"href":"mons_III.htm","desc":"Mons IV (2 vues)"},
{"href":"mons_III.htm","desc":"Mons V (7 vues)"},
{"href":"monsville.htm","desc":"Monsville (3 vues)"},
{"href":"montignies_sur_sambre.htm","desc":"Montignies sur Sambre (5 vues)"}, 
{"href":"mont_sur_marchienne.htm","desc":"Mont Sur Marchienne Zone Etat"}, 
{"href":"morlanwelz.htm","desc":"Morlanwelz (27 vues)"},
{"href":"morlanwelz_olive.htm","desc":"Morlanwelz l'Olive (2 vues)"},
{"href":"mouscron.htm","desc":"Mouscron (14 vues)"},
{"href":"naast.htm","desc":"Naast (9 vues)"},
{"href":"nechin.htm","desc":"Nechin"},
{"href":"neufvilles.htm","desc":"Neufvilles (11 vues)"},
{"href":"nimy.htm","desc":"Nimy I-II (12 vues)"},
{"href":"nimy_maisieres.htm","desc":"Nimy Maisières"},
{"href":"obaix.htm","desc":"Obaix Buzet (11 vues)"},
{"href":"obigies.htm","desc":"Obigies (11 vues/1 plan)"},
{"href":"obourg.htm","desc":"Obourg I-II (7 vues)"},
{"href":"ogy.htm","desc":"Ogy (3 vues)"},
{"href":"ollignies.htm","desc":"Ollignies I-II (9 vues/1 plan)"},
{"href":"ormeignies.htm","desc":"Ormeignies (3 vues)"},
{"href":"orroir.htm","desc":"Orroir (10 vues)"},
{"href":"papignies.htm","desc":"Papignies (15 vues/1 plan)"},
{"href":"paturages.htm","desc":"Pâturages (4 vues)"},
{"href":"pecq.htm","desc":"Pecq (2 vues)"},
{"href":"pecq_vicinal.htm","desc":"Pecq vicinale"},
{"href":"peronnes.htm","desc":"Peronnes lez Antoing"},
{"href":"peruwelz.htm","desc":"Peruwelz (10 vues)"},
{"href":"petit_enghien.htm","desc":"Petit Enghien (2 vues)"},
{"href":"pieton.htm","desc":"Piéton I-II (14 vues)"},
{"href":"pipaix.htm","desc":"Pipaix (3 vues)"}, 
{"href":"pottes.htm","desc":"Pottes"},
{"href":"pontacellesnord.htm","desc":"Pont Ã  Celles Nord (9 vues)"}, 
{"href":"pontacellessud.htm","desc":"Pont Ã  Celles Sud"},
{"href":"pont_rouge.htm","desc":"Pont Rouge(3 vues)"},
{"href":"quaregnon.htm","desc":"Quaregnon I-II (12 vues)"},
{"href":"quevaucamps.htm","desc":"Quevaucamps (13 vues)"},
{"href":"quevy.htm","desc":"Quévy (19 vues)"},
{"href":"quievrain.htm","desc":"Quiévrain (34 vues)"},
{"href":"quievrain_vic.htm","desc":"Quiévrain vicinale (9 vues)"},
{"href":"rance.htm","desc":"Rance (2 vues)"},
{"href":"ransart.htm","desc":"Ransart (6 vues)"},
{"href":"rebaix.htm","desc":"Rebaix I-II (14 vues)"},
{"href":"ressaix.htm","desc":"Ressaix (8 vues)"},
{"href":"reves.htm","desc":"Rèves (3 vues)"},
{"href":"riezes.htm","desc":"Riezes"},
{"href":"rigaudrye.htm","desc":"Rigaudrye (2 vues/ 1 plan)"},
{"href":"robechies.htm","desc":"Robechies"},
{"href":"roisin.htm","desc":"Roisin Autreppe (23 V/ 2 PL)"},
{"href":"roisin_2019.htm","desc":"Roisin A. en 2019 (19 vues)"},
{"href":"ronquieres.htm","desc":"Ronquières (9 vues)"},
{"href":"roux.htm","desc":"Roux I-II (11 vues)"},
{"href":"rumes.htm","desc":"Rumes (4 vues)"},
{"href":"russeignies.htm","desc":"Russeignies (5 vues)"}, 
{"href":"saint_amand.htm","desc":"Saint-Amand-lez-Fleurus (+1 plan)"},
{"href":"saint_ghislain.htm","desc":"Saint Ghislain (23 vues)"},
{"href":"sart_les_moines.htm","desc":"Sart-les-Moines (4 vues)"}, 
{"href":"seloignes.htm","desc":"Seloignes Monceau (4 vues)"},
{"href":"seneffe.htm","desc":"Seneffe (12 vues)"},
{"href":"silly.htm","desc":"Silly I-II (10 vues / 1 plan)"},
{"href":"sirault.htm","desc":"Sirault (6 vues)"},
{"href":"sivry.htm","desc":"Sivry (15 vues)"},
{"href":"soignies.htm","desc":"Soignies (21 vues)"},
{"href":"soleilmont.htm","desc":"Soleilmont (1 vue / 1 plan)"},
{"href":"solre_saint_gery.htm","desc":"Solre-Saint-Géry (2 vues)"},
{"href":"solre_sur_sambre.htm","desc":"Solre-sur-Sambre (16 vues)"},
{"href":"stambruges.htm","desc":"Stambruges (9 vues)"},
{"href":"stree.htm","desc":"Strée (8 vues)"},
{"href":"templeuve.htm","desc":"Templeuve I-II (10 vues)"},
{"href":"tertre.htm","desc":"Tertre (15 vues)"}, 
{"href":"tertre_carbo.htm","desc":"Tertre Carbo"},  
{"href":"thieu.htm","desc":"Thieu I-II (6 vues)"},
{"href":"thimeon.htm","desc":"Thiméon (3 vues)"},
{"href":"thuillies.htm","desc":"Thuillies I-II (3 vues)"},
{"href":"thuin_nord.htm","desc":"Thuin Nord (14 vues)"},
{"href":"thuin_ouest.htm","desc":"Thuin Ouest (7 vues/4 bonus)"},
{"href":"thulin.htm","desc":"Thulin (13 vues)"},
{"href":"thumaide.htm","desc":"Thumaide (3 vues)"},
{"href":"tournai_I.htm","desc":"Tournai I"},
{"href":"tournai.htm","desc":"Tournai (16 vues/1 bonus)"},
{"href":"tourpes.htm","desc":"Tourpes (2 vues)"}, 
{"href":"trazegnies.htm","desc":"Trazegnies I-II (14 vues)"},
{"href":"trieu_a_vallee.htm","desc":"Trieu-Ã -Vallée"},
{"href":"vaudignies.htm","desc":"Vaudignies (4 vues)"},
{"href":"vaulx.htm","desc":"Vaulx (6 vues)"}, 
{"href":"vellereille.htm","desc":"Vellereille le Sec (3 vues)"},
{"href":"viesville.htm","desc":"Viesville (10 vues)"},
{"href":"ville_pommeroeul.htm","desc":"Ville Pommeroeul (5 vues)"},
{"href":"villerot.htm","desc":"Villerot"},
{"href":"villers_la_tour.htm","desc":"Villers la tour (3 vues)"},
{"href":"villers_perwin.htm","desc":"Villers Perwin (2 vues)"},
{"href":"villers_poterie.htm","desc":"Villers Poterie (9 vues)"},
{"href":"virelles.htm","desc":"Virelles (8 vues)"},
{"href":"warneton.htm","desc":"Warneton (4 vues)"},
{"href":"warquignies.htm","desc":"Warquignies (2 vues/2 plans)"},
{"href":"warquignies_clinique.htm","desc":"Warquignies clinique (1 vue/2 plans)"},
{"href":"wasmes.htm","desc":"Wasmes (2 vues/1 plan)"},
{"href":"wilbeauroux.htm","desc":"Wilbeauroux (2 vues)"},
{"href":"willemeau.htm","desc":"Willemeau Froidmont (4 vues)"}

];

	const xtractname = (str) => str.includes("/")?
		str.split("/")[1].split(".htm")[0] :
		str.split(".htm")[0];
	if(!slugare) return "";
	slugare = slugare.replaceAll(" ","_");
	const res = garesbelgeslist.filter(x => xtractname(x.href) === slugare);
	if(res.length < 1){
		if(slugare.includes("-")) return getGareBelge(slugare.replaceAll("-","_"));
		else return "";
	}
/*if(res.length === 1) void 0; //console.log("getGareBelge of", slugare, xtractname(res[0].href));
else console.log("getGareBelge among", slugare, JSON.stringify(res));*/
	return " gb:['" + res[0].href + "']";
}


/* ------------------------------------------------------------------------ */
function getGaresFrance(n) {
    const checkedGares = [
    "Gare_de_Belley", "Gare_de_Châtillon-en-Michaille", "Gare_de_Charix_-_Lalleyriat", "Gare_d'Arfeuilles_-_Le_Breuil", "Gare_de_Diou_(Allier)", "Gare_de_Néris-les-Bains", "Gare_de_Tournon", "Gare_de_Vogüé", "Gare_de_Talizat", "Gare_de_Châteauneuf-du-Rhône", "Gare_de_Domène", "Gare_de_Lyon-Est", "Gare_de_Chignin_-_Les_Marches", "Gare_de_Vaivre", "Gare_de_Lain_-_Thury", "Gare_de_Kerauzern", "Gare_de_Quimerc'h", "Gare_de_Lambel_-_Camors", "Gare_de_Roc-Saint-André_-_La_Chapelle", "Gare_de_Chéry_-_Lury", "Gare_de_Pouligny-Saint-Pierre", "Gare_de_Saint-Gilles", "Gare_de_Beaune-la-Rolande", "Gare_de_Puiseaux", "Gare_de_Drulingen", "Gare_de_Schopperten", "Gare_de_Vœllerdingen", "Gare_de_Ballersdorf", "Gare_de_Guebwiller", "Gare_de_Ribeauvillé", "Gare_de_Sundhoffen", "Gare_de_Blesme_-_Haussignémont", "Gare_de_Villiers-le-Sec", "Gare_de_Forcelles-Saint-Gorgon", "Gare_de_Gondrexange", "Gare_de_L'Hôpital_(Moselle)", "Gare_de_Meisenthal", "Gare_de_Mittersheim", "Gare_d'Oberstinzel", "Gare_de_Saint-Louis-lès-Bitche", "Gare_de_Soucht", "Gare_d'Anould", "Gare_de_Bouzanville_-_Boulaincourt", "Gare_de_Colroy_-_Lubine", "Gare_de_Faymont", "Gare_de_Jarménil", "Gare_de_Laveline-devant-Bruyères", "Gare_de_Maxonchamp", "Gare_de_Ramonchamp", "Gare_de_Rozières-sur-Mouzon", "Gare_de_Saulxures-sur-Moselotte", "Gare_du_Val-d'Ajol", "Gare_d'Abscon", "Gare_de_Bierne", "Gare_de_Champ-du-Chêne", "Gare_de_Deûlémont_(CEN)", "Gare_de_Killem", "Gare_de_Lille-Saint-Sauveur", "Gare_de_Pitgam", "Gare_de_Roubaix_-_Wattrelos", "Gare_du_Vert-Galant_(Nord)", "Gare_de_Wervicq-Sud", "Gare_de_Croissy-sur-Celle", "Gare_de_Pierrefonds", "Gare_d'Achicourt", "Gare_de_Blendecques", "Gare_de_Calais-Maritime", "Gare_de_Nielles-lès-Bléquin", "Gare_d'Abbeville-Porte-du-Bois", "Gare_de_Canaples", "Gare_de_Feuquerolles", "Gare_de_Longpré-les-Amiens", "Gare_de_Roisel", "Gare_de_Chailly_-_Boissy-le-Châtel", "Gare_de_La_Ferté-Gaucher", "Gare_de_Santeny_-_Servon", "Gare_de_Saint-Cyr-Grande-Ceinture", "Gare_du_boulevard_Victor-Hugo", "Gare_de_Bry-sur-Marne_(SNCF)", "Gare_de_Marines_(Halte)", "Gare_de_Chapelle-la-Délivrande", "Gare_de_Falaise", "Gare_de_Luc-sur-Mer", "Gare_de_Quetteville", "Gare_d'Amécourt_-_Talmontier", "Gare_de_La_Rivière-Thibouville", "Gare_d'Auvers", "Gare_transatlantique_de_Cherbourg", "Gare_de_Lessay", "Gare_de_Montfarville", "Gare_de_Périers-en-Cotentin", "Gare_de_Saint-Jores", "Gare_de_Saint-Vaast-la-Hougue", "Gare_de_Condé-sur-Noireau", "Gare_de_Montsecret_-_Vassy", "Gare_de_Rai_-_Aube", "Gare_de_Bolbec_-_Nointot", "Gare_d'Écrainville", "Gare_de_Grémonville", "Gare_d'Ocqueville", "Gare_de_Saint-Valery-en-Caux", "Gare_de_Roumazières-Loubert", "Gare_du_Chapus", "Gare_de_Saint-André-de-Lidon", "Gare_de_Vergné", "Gare_d'Estivaux", "Gare_de_Bon-Encontre", "Gare_de_Boeil-Bezing", "Gare_de_Frontenay-Rohan-Rohan", "Gare_de_Chauvigny", "Gare_de_La_Trimouille", "Gare_de_Savigny-Lévescault", "Gare_de_Savigny-sous-Faye", "Gare_de_Glanges", "Gare_de_Cépie", "Gare_de_Congénies", "Gare_d'Aussonne", "Gare_de_Cornebarrieu", "Gare_de_Mondonville", "Gare_de_Saint-Cézert", "Gare_de_Sainte-Foy-de-Peyrolières", "Gare_de_Flaujac", "Gare_d'Arcomie", "Gare_de_Pierrefitte-Nestalas", "Gare_de_Céret", "Gare_de_La_Crémade", "Gare_de_Monestiés", "Gare_de_Larrazet", "Gare_de_Saint-André-des-Eaux", "Gare_de_Saint-Clément-des-Levées", "Gare_de_Bois-de-Céné", "Gare_de_Château-Arnoux_-_Volonne", "Gare_de_Forcalquier", "Gare_de_Mison", "Gare_de_Volx", "Gare_de_Piène", "Gare_de_Saint-Barthélémy", "Gare_de_Séon-Saint-Henri", "Gare_de_Brignoles", "Gare_du_Muy", "Gare_de_Maubec", "Gare_de_Saint-Martin", "Gare_d'Ambérieu-en-Bugey", "Gare_d'Ambronay_-_Priay", "Gare_de_Bellegarde", "Gare_de_Bellignat", "Gare_de_Beynost", "Gare_de_Bourg-en-Bresse", "Gare_de_Brion_-_Montréal-la-Cluse", "Gare_de_Ceyzériat", "Gare_de_Meximieux_-_Pérouges", "Gare_de_Miribel", "Gare_d'Oyonnax", "Gare_de_Pont-de-Veyle", "Gare_de_Saint-Maurice-de-Beynost", "Gare_de_Villars-les-Dombes", "Gare_de_Montluçon-Ville", "Gare_de_Vallon-en-Sully", "Gare_de_Viescamp-sous-Jallès", "Gare_de_Montélimar", "Gare_de_Valence_TGV", "Gare_de_Châbons", "Gare_de_Grenoble", "Gare_du_Péage-de-Roussillon", "Gare_de_Saint-André-le-Gaz", "Gare_de_Tullins-Fures", "Gare_d'Andrézieux", "Gare_de_Firminy", "Gare_de_Régny", "Gare_de_Saint-Étienne-Le_Clapier", "Gare_d'Arvant", "Gare_de_Langeac", "Gare_du_Puy-en-Velay", "Gare_d'Aulnat-Aéroport", "Gare_de_Clermont-La_Pardieu", "Gare_des_Martres-de-Veyre", "Gare_de_Pontmort", "Gare_de_Sarliève_-_Cournon", "Gare_de_Belleville-sur-Saône", "Gare_de_Châtillon-d'Azergues", "Gare_de_Dardilly-le-Jubin", "Gare_de_Francheville", "Gare_de_Lozanne", "Gare_de_Lyon-Saint-Paul", "Gare_de_Saint-Germain-au-Mont-d'Or", "Gare_de_Vernaison", "Gare_d'Albertville", "Gare_de_Grésy-sur-Aix", "Gare_de_Notre-Dame-de-Briançon", "Gare_de_Viviers-du-Lac", "Gare_du_Buet", "Gare_de_Groisy_-_Thorens_-_la-Caille", "Gare_des_Moussoux", "Gare_de_La_Roche-sur-Foron", "Gare_de_Sallanches_-_Combloux_-_Megève", "Gare_de_Vaudagne", "Gare_de_Bretigny_-_Norges", "Gare_de_Gemeaux", "Gare_de_Mâlain", "Gare_de_Saint-Julien_-_Clénay", "Gare_de_Verrey", "Gare_de_Besançon-Mouillère", "Gare_de_Deluz", "Gare_de_L'Isle-sur-le-Doubs", "Gare_de_Morteau", "Gare_de_Roche-lez-Beaupré", "Gare_de_Voujeaucourt", "Gare_de_La_Chaumusse_-_Fort-du-Plasne", "Gare_de_Mouchard", "Gare_de_Saint-Laurent-en-Grandvaux", "Gare_de_Corbigny", "Gare_de_La_Charité", "Gare_de_Nevers-les-Perrières", "Gare_de_Tronsanges", "Gare_de_Luxeuil-les-Bains", "Gare_de_Chagny", "Gare_du_Creusot", "Gare_de_Gilly-sur-Loire", "Gare_de_Montchanin", "Gare_d'Accolay", "Gare_d'Arcy-sur-Cure", "Gare_de_Monéteau_-_Gurgy", "Gare_de_Tonnerre", "Gare_de_Belfort", "Gare_de_Carnoët_-_Locarn", "Gare_de_Guingamp", "Gare_des_Mais", "Gare_de_Pleudihen", "Gare_de_Pontrieux", "Gare_d'Yffiniac", "Gare_de_Kerhuon", "Gare_de_Plouigneau", "Gare_de_Saint-Thégonnec", "Gare_de_Bruz", "Gare_de_Dol-de-Bretagne", "Gare_de_Montreuil-sur-Ille", "Halte_de_Rennes-Pontchaillou", "Gare_de_Saint-Médard-sur-Ille", "Gare_de_Landaul_-_Mendon", "Gare_de_Questembert", "Gare_de_Bigny", "Gare_de_Nérondes", "Gare_de_Vierzon-Ville", "Gare_de_Brou", "Gare_de_Dreux", "Gare_de_Maintenon", "Gare_de_La_Taye", "Gare_de_Chabenet", "Gare_de_La_Foulquetière", "Gare_de_Luçay-le-Mâle", "Gare_de_Varennes-sur-Fouzon", "Gare_de_la_Douzillère", "Gare_de_Rivarennes", "Gare_de_Tours", "Gare_du_Faubourg-d'Orléans", "Gare_de_Menars", "Gare_d'Onzain_-_Chaumont-sur-Loire", "Gare_de_Salbris", "Gare_de_Suèvres", "Gare_de_Villeherviers", "Gare_d'Artenay", "Gare_des_Aubrais", "Gare_de_Chaingy-Fourneaux-Plage", "Gare_de_La_Ferté-Saint-Aubin", "Gare_de_Rivoli", "Gare_de_Furiani", "Gare_de_Purettone", "Gare_de_Ponte-Leccia", "Gare_de_Vivario", "Gare_de_Carbuccia", "Gare_de_Pietralba", "Gare_de_L'Île-Rousse", "Gare_de_Lumio-Arinella", "Gare_de_la_Balagne-Orizontenovu_(Calvi)", "Gare_de_Brumath", "Gare_d'Ebersheim", "Gare_de_Graffenstaden", "Gare_de_Herrlisheim_(Bas-Rhin)", "Gare_d'Ingwiller", "Gare_de_La_Wantzenau", "Gare_de_Molsheim", "Gare_de_Niederbronn-les-Bains", "Gare_de_Roppenheim", "Gare_de_Saverne", "Gare_de_Sessenheim", "Gare_de_Strasbourg-Roethig", "Gare_de_Wilwisheim", "Gare_de_Bartenheim", "Gare_de_Colmar-Mésanges", "Gare_de_Habsheim", "Gare_de_Lutterbach", "Gare_de_Raedersheim", "Gare_de_Saint-Louis-la-Chaussée", "Gare_de_Vieux-Thann", "Gare_de_Bogny-sur-Meuse", "Gare_de_Givet", "Gare_de_Monthermé", "Gare_de_Vireux-Molhain", "Gare_de_Romilly-sur-Seine", "Gare_de_Châlons-en-Champagne", "Gare_de_Champagne-Ardenne_TGV", "Gare_de_Jonchery-sur-Vesle", "Gare_de_Reims-Maison-Blanche", "Gare_de_Sillery", "Gare_de_Trois-Puits", "Gare_de_Chevillon", "Gare_de_Gudmont", "Gare_de_Baccarat", "Gare_de_Champigneulles", "Gare_de_Fontenoy-sur-Moselle", "Gare_d'Houdemont", "Gare_de_Ludres", "Gare_de_Neuves-Maisons", "Gare_de_Pont-Saint-Vincent", "Gare_de_Toul", "Gare_de_Baroncourt", "Gare_de_Montmédy", "Gare_d'Apach", "Gare_de_Berthelming", "Gare_de_Farschviller", "Gare_de_Forbach", "Gare_de_Gandrange_-_Amnéville", "Gare_de_Hayange", "Gare_de_Kœnigsmacker", "Gare_de_Novéant", "Vigy#Gare|Gare_de_Vigy_(touristique)", "Gare_d'Arches", "Gare_d'Igney", "Gare_de_Saint-Michel-sur-Meurthe", "Gare_d'Amifontaine", "Gare_de_Clacy_-_Mons", "Gare_de_Dercy_-_Froidmont", "Gare_de_La_Bouteille", "Gare_de_Mennessis", "Gare_de_Saint-Erme", "Gare_de_Versigny", "Gare_d'Annappes", "Gare_d'Aubigny-au-Bac", "Gare_de_Bergues", "Gare_de_Bourbourg", "Gare_de_Cattenières", "Gare_de_Deûlémont", "Gare_d'Escaudœuvres", "Gare_de_Hachette", "Gare_de_Landas", "Gare_de_Lille-Flandres", "Gare_d'Ors", "Gare_de_Prouvy_-_Thiant", "Gare_de_Ronchin", "Gare_de_Saint-Hilaire", "Gare_de_Somain", "Gare_de_Tourcoing", "Gare_de_Wattignies_-_Templemars", "Gare_de_Boran-sur-Oise", "Gare_de_Chevrières", "Gare_de_Crépy-en-Valois", "Gare_de_Gannes", "Gare_de_Lavilletertre", "Gare_de_Méru", "Gare_d'Ormoy-Villers", "Gare_de_Ribécourt", "Gare_de_Saint-Rémy-en-l'Eau", "Gare_de_Wacquemoulin", "Gare_d'Auchy-lès-Hesdin", "Gare_de_Brimeux", "Gare_de_Corbehem", "Gare_de_Dourges", "Gare_d'Hénin-Beaumont", "Gare_de_Leforest", "Gare_de_Loison", "Gare_de_Meurchin", "Gare_de_Pont-à-Vendin", "Gare_de_Watten_-_Éperlecques", "Gare_de_Wimille_-_Wimereux", "Gare_d'Amiens", "Gare_de_Daours", "Gare_d'Hargicourt_-_Pierrepont", "Gare_de_Longpré-les-Corps-Saints", "Gare_de_Moreuil", "Gare_de_Pont-Remy", "Gare_de_Bois-le-Roi", "Gare_de_Chartrettes", "Gare_de_Crécy-la-Chapelle", "Gare_de_Fontaine-le-Port", "Gare_d'Héricy", "Gare_de_Lizy-sur-Ourcq", "Gare_du_Mée", "Gare_de_Moret-Veneux-les-Sablons", "Gare_de_Nemours_-_Saint-Pierre", "Gare_de_Saint-Mammès", "Gare_de_Trilport", "Gare_d'Aubergenville-Élisabethville", "Gare_de_Chatou_-_Croissy", "Gare_de_Fontenay-le-Fleury", "Gare_de_Jouy-en-Josas", "Gare_du_Vésinet_-_Le_Pecq", "Gare_de_Mantes-Station", "Gare_de_Montfort-l'Amaury_-_Méré", "Gare_de_Plaisir_-_Les_Clayes", "Gare_de_Saint-Germain-en-Laye", "Gare_de_Sartrouville", "Gare_de_Versailles-Rive-Droite", "Gare_de_Viroflay-Rive-Gauche", "Gare_de_Bouray", "Gare_de_Brunoy", "Gare_de_Corbeil-Essonnes", "Gare_d'Essonnes_-_Robinson", "Gare_de_Gravigny-Balizy", "Gare_de_La_Hacquinière", "Gare_de_Massy_-_Palaiseau", "Gare_de_Palaiseau_-_Villebon", "Gare_de_Saint-Michel-sur-Orge", "Gare_de_Viry-Châtillon", "Gare_de_Bois-Colombes", "Gare_du_Chemin_d'Antony", "Gare_de_Garches_-_Marnes-la-Coquette", "Gare_de_la_Défense", "Gare_du_Parc_de_Sceaux", "Gare_de_Sèvres-Rive-Gauche", "Gare_de_Vaucresson", "Gare_de_Bondy", "Freinville_-_Sevran_(tramway_d'Île-de-France)", "Gare_des_Yvris-Noisy-le-Grand", "Gare_de_Pierrefitte_-_Stains", "Gare_de_Saint-Ouen", "Gare_de_Villetaneuse-Université", "Gare_de_Bry-sur-Marne_(RATP)", "Gare_de_Joinville-le-Pont", "Gare_du_Pont_de_Rungis_-_Aéroport_d'Orly", "Gare_de_Saint-Maur_-_Créteil", "Gare_de_Sucy_-_Bonneuil", "Gare_de_La_Varenne_-_Chennevières", "Gare_de_Vincennes", "Gare_de_Bouffémont_-_Moisselles", "Gare_du_Champ_de_courses_d'Enghien", "Gare_d'Enghien-les-Bains", "Gare_de_Garges_-_Sarcelles", "Gare_de_Louvres", "Gare_de_Montigny_-_Beauchamp", "Gare_de_Persan_-_Beaumont", "Gare_de_Saint-Ouen-l'Aumône-Liesse", "Gare_de_Seugy", "Gare_de_Vaucelles", "Gare_de_Bretteville_-_Norrey", "Gare_de_Frénouville_-_Cagny", "Gare_du_Molay-Littry", "Gare_de_Vire", "Gare_de_Conches", "Gare_de_Nonancourt", "Gare_de_Verneuil-sur-Avre", "Gare_de_Pontorson_-_Mont-Saint-Michel", "Gare_d'Argentan", "Gare_du_Merlerault", "Gare_d'Aumale", "Gare_d'Épouville", "Gare_d'Harfleur", "Gare_de_Longueville-sur-Scie", "Gare_de_Morgny", "Gare_de_Serqueux", "Gare_de_Chalais", "Gare_de_Ruffec", "Gare_de_Châtelaillon", "Gare_de_Pons", "Gare_de_Saint-Laurent_-_Fouras", "Gare_de_Tonnay-Charente", "Gare_de_Bugeat", "Gare_de_Larche", "Gare_de_Tulle", "Gare_de_Busseau-sur-Creuse", "Gare_de_Montaigut", "Gare_de_Bergerac", "Gare_de_La_Bachellerie", "Gare_de_Mauzens-Miremont", "Gare_de_Niversac", "Gare_de_Saint-Pierre-de-Chignac", "Gare_de_Vélines", "Gare_de_Bassens", "Gare_de_Cadaujac", "Gare_de_Coutras", "Gare_de_Gironde", "Gare_de_Lesparre", "Gare_de_Mérignac-Arlac", "Gare_de_la_Pointe-de-Grave", "Gare_de_Saint-Médard-d'Eyrans", "Gare_de_Soulac-sur-Mer", "Gare_de_Dax", "Gare_de_Peyrehorade", "Gare_d'Aiguillon", "Gare_de_Penne", "Gare_d'Assat", "Gare_de_Biarritz", "Gare_de_Buzy-en-Béarn", "Gare_de_Halsou_-_Larressore", "Gare_d'Ossès_-_Saint-Martin-d'Arrossa", "Gare_de_Sarrance", "Gare_de_Bressuire", "Gare_de_Mauzé", "Gare_d'Iteuil", "Gare_de_Lusignan", "Gare_de_Poitiers", "Gare_d'Aixe-sur-Vienne", "Gare_de_Brignac", "Gare_de_La_Jonchère", "Gare_de_Nieul", "Gare_de_Saint-Germain-les-Belles", "Gare_de_Solignac_-_Le_Vigen", "Gare_d'Andorre_-_L'Hospitalet", "Gare_du_Vernet-d'Ariège", "Gare_de_Couiza_-_Montazels", "Gare_de_Pomas", "Gare_de_Baraqueville_-_Carcenac-Peyralès", "Gare_de_Luc-Primaube", "Gare_de_Tournemire_-_Roquefort", "Gare_de_Beauvoisin", "Gare_de_Grand'Combe-La_Pise", "Gare_de_Saint-Césaire", "Gare_d'Auterive", "Gare_de_Cintegabelle", "Gare_de_Labarthe-Inard", "Gare_de_Longages_-_Noé", "Gare_de_Muret", "Gare_de_Saint-Jory", "Gare_de_Toulouse-Saint-Agne", "Gare_de_Béziers", "Gare_de_Marseillan-Plage", "Gare_de_Valergues_-_Lansargues", "Gare_de_Gourdon", "Gare_de_Rocamadour_-_Padirac", "Gare_d'Aumont-Aubrac", "Gare_de_Chapeauroux", "Gare_des_Salelles", "Gare_de_Saint-Pé-de-Bigorre", "Gare_de_Bolquère_-_Eyne", "Gare_de_Collioure", "Gare_de_Fontpédrouse-Saint-Thomas-les-Bains", "Gare_de_Millas", "Gare_de_Planès", "Gare_de_Saint-Féliu-d'Avall", "Halte_de_Serdinya", "Gare_d'Albi-Madeleine", "Gare_de_Lisle-sur-Tarn", "Gare_de_Tessonnières", "Gare_de_Dieupentale", "Gare_de_Montauban-Ville-Bourbon", "Gare_de_Batz-sur-Mer", "Gare_de_Clisson", "Gare_de_Gorges", "Gare_de_La_Chapelle-Aulnay", "Gare_du_Pouliguen", "Gare_d'Oudon", "Gare_de_Saint-Étienne-de-Montluc", "Gare_de_Sainte-Pazanne", "Gare_de_Vertou", "Gare_de_Cholet", "Gare_du_Vieux-Briollay", "Gare_de_Tiercé", "Gare_du_Genest", "Gare_de_Voutré", "Gare_de_Connerré_-_Beillé", "Gare_de_Laigné_-_Saint-Gervais", "Gare_de_Rouessé-Vassé", "Gare_de_Vaas", "Gare_de_Chantonnay", "Gare_de_Luçon", "Gare_de_Chaudon-Norante", "Gare_de_Manosque_-_Gréoux-les-Bains", "Halte_de_Plan_d'eau_des_Ferréols", "Gare_de_Sisteron", "Gare_de_L'Argentière-les_Écrins", "Gare_de_Cannes", "Gare_d'Èze-sur-Mer", "Gare_de_La_Frayère", "Gare_de_Menton", "Gare_de_Nice-Riquier", "Gare_de_Cap-Martin-Roquebrune", "Gare_de_Touët-de-L'Escarène", "Gare_d'Arles", "Gare_de_Gardanne", "Gare_de_La_Penne-sur-Huveaune", "Gare_de_Marseille-Saint-Charles", "Gare_de_Rassuen", "Gare_de_Saint-Marcel", "Gare_de_Septèmes", "Gare_des_Arcs_-_Draguignan", "Gare_de_Gonfaron", "Gare_d'Ollioules_-_Sanary", "Gare_de_Vidauban", "Gare_de_Courthézon", "Gare_de_Morières-lès-Avignon", "Gare_de_Châtillon-en-Michaille", "Gare_de_Saint-Germain-de-Joux", "Gare_d'Arfeuilles_-_Le_Breuil", "Gare_de_Néris-les-Bains", "Gare_de_Tronget", "Gare_de_Saint-Priest", "Gare_de_Vogüé", "Gare_d'Aouste-sur-Sye", "Gare_de_Lesches_-_Beaumont", "Gare_du_Pont-d'Espenel", "Gare_de_Lyon-Brotteaux", "Gare_d'Ambilly", "Gare_de_Chatelay_-_Chissey", "Gare_de_Colombier", "Gare_de_Villersexel", "Gare_de_Lain_-_Thury", "Gare_d'Hanvec", "Gare_de_Quimerc'h", "Gare_de_Saint-Yvi", "Gare_de_Lambel_-_Camors", "Gare_de_Saint-Nicolas-des-Eaux", "Gare_de_Saint-Hilaire", "Gare_de_Saint-Germain_-_Saint-Rémy", "Gare_du_Blanc", "Gare_de_Saint-Gilles", "Gare_du_Grand-Pressigny", "Gare_de_Saint-Jean-Froidmentel", "Gare_de_Beaune-la-Rolande", "Gare_de_Puiseaux", "Gare_de_Val-de-Villé", "Gare_de_Ballersdorf", "Gare_du_Hasenrain", "Gare_de_Saint-Hippolyte_(Haut-Rhin)", "Gare_de_Schlierbach", "Gare_de_Cons-la-Grandville", "Gare_de_Mont-Saint-Martin", "Gare_de_Nancy-Saint-Georges", "Gare_de_Xermaménil_-_Lamath", "Gare_de_Bitche", "Ancienne_gare_de_Metz", "Gare_d'Oberstinzel", "Gare_de_Rodalbe_-_Bermering", "Gare_de_Rohrbach-lès-Bitche", "Gare_de_Saint-Louis-lès-Bitche", "Gare_de_Sarraltroff", "Gare_de_Sarrebourg", "Gare_d'Anould", "Gare_de_Colroy_-_Lubine", "Gare_de_Corcieux_-_Vanémont", "Gare_de_Cornimont", "Gare_de_Faymont", "Gare_de_Jarménil", "Gare_de_Plombières-les-Bains", "Gare_de_Raves_-_Ban-de-Laveline", "Gare_de_Rehaincourt", "Gare_de_Vagney", "Gare_de_Voulpaix", "Gare_de_Bavay", "Gare_de_Bray-Dunes", "Gare_de_Deûlémont_(CEN)", "Gare_d'Escaudain", "Gare_de_Genech", "Gare_de_Godewaersvelde", "Gare_de_Lille-Sud", "Gare_de_Lomme", "Gare_de_Marcoing", "Gare_de_Saint-Braïou", "Gare_de_Saint-Sylvestre-Cappel", "Halte_du_sanatorium-maritime-de-Zuydcoote", "Gare_de_Tressin", "Gare_de_Valenciennes-Faubourg-de-Paris", "Gare_de_Warhem", "Gare_de_Winnezeele", "Gare_de_Zuydcoote", "Gare_de_Fontaine-Bonneleau", "Gare_de_Beussent", "Gare_de_Boulogne-Aéroglisseurs", "Gare_de_Camblain-l'Abbé", "Gare_de_Verquigneul", "Gare_de_Beaucourt_-_Hamel", "Gare_de_Conty", "Gare_de_Faubourg-de-Rouvroy", "Gare_de_Fontaine-sur-Somme", "Gare_de_Long-Le_Catelet", "Gare_de_Longpré-les-Amiens", "Gare_de_Péronne-la-Chapelette", "Gare_de_Ponthoile-Romaine", "Gare_de_Vers", "Gare_de_Woincourt", "Gare_d'Hermé", "Gare_de_Saint-Siméon", "Gare_de_Poissy-Quai-Talbot", "Gare_des_Carbonnets", "Halte_de_Courbevoie-Sport", "Gare_de_Saint-Ouen-Garibaldi", "Gare_d'Argenteuil-Grande-Ceinture", "Gare_de_Caen-Saint-Pierre", "Gare_de_Dozulé_-_Putot", "Gare_de_Livarot", "Gare_des_Loges-Saulces", "Gare_de_Ménil-Hubert_-_Pont_d'Ouilly", "Gare_de_Thury-Harcourt", "Gare_de_Saint-Germain_-_Saint-Rémy", "Gare_de_Bretteville-en-Saire", "Gare_de_Fermanville", "Halte_de_Lithaire", "Gare_de_Néhou", "Gare_de_Réville", "Halte_de_Saint-Georges-de-la-Rivière", "Gare_de_Saint-Sauveur-le-Vicomte", "Gare_d'Urville-en-Hague", "Gare_de_Berjou", "Gare_de_Nonant-le-Pin", "Gare_de_Darnétal", "Gare_de_Doudeville", "Gare_de_Goderville", "Gare_de_Ruelle", "Gare_de_Saint-Michel-sur-Charente", "Gare_d'Asnières-la-Giraud", "Gare_de_Bourcefranc", "Gare_de_Cozes", "Gare_de_La_Jarne_-_Saint-Rogatien", "Gare_de_Varzay", "Gare_d'Estivaux", "Gare_de_Forgevieille", "Gare_de_Carlux", "Gare_de_Périgueux-Saint-Georges", "Gare_de_Saint-Louis", "Gare_de_Luxey", "Gare_de_Rion-des-Landes", "Gare_de_Bon-Encontre", "Gare_de_Boeil-Bezing", "Gare_de_Champdeniers_-_Saint-Christophe", "Gare_de_Cherveux", "Gare_de_La_Chapelle-Saint-Laurent", "Gare_de_Mazières_-_Verruyes", "Gare_de_Saint-Loup-Lamairé", "Gare_de_Saint-Pardoux-en-Gâtine", "Gare_de_Salles", "Gare_de_Châtellerault-Châteauneuf", "Gare_de_Liglet", "Gare_de_Scorbé-Clairvaux", "Gare_de_Thiat_-_Oradour", "Gare_de_Soupex", "Gare_d'Uzès", "Gare_de_Blajan_-_Nizors", "Halte_de_Lardenne-Rond-Point", "Gare_de_Martres-de-Rivière", "Gare_de_Mondonville", "Gare_de_Plaisance-du-Touch", "Gare_de_Saint-Laurent_-_Salerm", "Gare_de_Roujan_-_Neffiès", "Gare_de_Baladou", "Gare_de_Montvalent", "Halte_de_Larzalier", "Gare_de_Blan", "Gare_de_Campes", "Gare_de_Labourgade", "Gare_de_Larrazet", "Gare_de_Sérignac", "Gare_de_Legé", "Gare_de_Montrelais", "Gare_de_Saint-Clément-des-Levées", "Gare_du_Mans-Les_Halles", "Gare_de_Benet", "Gare_de_l'Île-d'Elle", "Gare_des_Clouzeaux", "Gare_de_Château-Arnoux_-_Volonne", "Gare_de_Mison", "Gare_de_Peyruis_-_Les_Mées", "Gare_du_Sud", "Gare_de_Saint-Joseph", "Anciennes_gares_ferroviaires_de_Draguignan", "Gare_des_Salins-d'Hyères", "Gare_de_Belley", "Gare_de_Châtillon-en-Michaille", "Gare_de_Charix_-_Lalleyriat", "Gare_d'Arfeuilles_-_Le_Breuil", "Gare_de_Diou_(Allier)", "Gare_de_Néris-les-Bains", "Gare_de_Tournon", "Gare_de_Vogüé", "Gare_de_Talizat", "Gare_de_Châteauneuf-du-Rhône", "Gare_de_Domène", "Gare_de_Lyon-Est", "Gare_de_Chignin_-_Les_Marches", "Gare_de_Vaivre", "Gare_de_Lain_-_Thury", "Gare_de_Kerauzern", "Gare_de_Paris-Est", "Gare_de_Pantin", "Gare_de_Noisy-le-Sec", "Gare_de_Rosny-Bois-Perrier", "Gare_de_Rosny-sous-Bois", "Gare_de_Mormant", "Gare_de_Bar-sur-Aube", "Gare_de_Champagney", "Gare_d'Altkirch", "Gare_de_Mulhouse-Ville", "Gare_de_Mortcerf", "Gare_de_Provins", "Gare_de_Donjeux", "Gare_de_Pagny-sur-Meuse", "Gare_de_Rozières-sur-Mouzon", "Gare_de_Jarville-la-Malgrange", "Gare_de_Pierreville", "Gare_de_Poussay", "Gare_d'Igney", "Gare_de_Pouxeux", "Gare_de_Laveline-devant-Bruyères", "Gare_de_Ménil-Flin", "Gare_de_Saint-Michel-sur-Meurthe", "Gare_de_Vaires_-_Torcy", "Gare_de_La_Ferté-sous-Jouarre", "Gare_de_Châlons-en-Champagne", "Gare_de_Fontenoy-sur-Moselle", "Gare_de_Varangéville_-_Saint-Nicolas", "Gare_de_Steinbourg", "Gare_de_Brumath", "Gare_d'Oulchy_-_Breny", "Gare_de_Rilly-la-Montagne", "Gare_de_Bouy", "Gare_de_Conflans-Jarny", "Gare_de_Gandrange-Amnéville", "Gare_de_Marbache", "Gare_de_Sarralbe", "Gare_de_Molsheim", "Gare_de_Lutzelhouse", "Gare_de_Saulxures", "Gare_de_Sélestat", "Gare_de_Goxwiller", "Gare_de_Colmar", "Gare_de_Habsheim", "Gare_de_Turckheim", "Gare_de_Breitenbach", "Gare_de_Moosch", "Gare_de_Berthelming", "Gare_de_Bischheim", "Gare_de_Drusenheim", "Gare_de_Munchhausen", "Gare_de_Bischwiller", "Gare_de_Riedseltz", "Gare_de_Sarreguemines", "Gare_de_Wingen-sur-Moder", "Gare_de_Schopperten", "Gare_de_Kuntzig", "Gare_de_Malling", "Gare_d'Uckange", "Gare_de_Mohon", "Gare_de_Carignan", "Gare_de_Jonchery-sur-Vesle", "Gare_de_Poix-Terron", "Gare_de_Joigny-sur-Meuse", "Gare_de_Deville", "Gare_de_Fumay", "Gare_de_Nanteuil-le-Haudouin", "Gare_de_Crouy", "Gare_de_Verneuil-sur-Serre", "Gare_de_Thézy-Glimont", "Gare_de_Pont-Sainte-Maxence", "Gare_de_Ribécourt", "Gare_de_Fresnoy-le-Grand", "Gare_de_Hautmont", "Gare_de_Jeumont", "Gare_de_Valenciennes", "Gare_de_Cantin", "Gare_de_Nesle", "Gare_de_Somain", "Gare_de_Mont-de-Terre", "Gare_de_Berlaimont", "Gare_d'Ascq", "Gare_de_Baisieux", "Gare_de_Goussainville", "Gare_de_Creil", "Gare_de_Gannes", "Gare_de_Corbie", "Gare_de_Courcelles-le-Comte", "Gare_de_Corbehem", "Gare_de_Croix-Wasquehal", "Gare_de_Dourges", "Gare_de_Lille-Porte-de-Douai", "Gare_de_Salomé", "Gare_de_Saint-Pol-sur-Ternoise", "Gare_de_Steenwerck", "Gare_de_Watten-Éperlecques", "Gare_de_Dunkerque", "Gare_de_Liévin", "Gare_de_Lillers", "Gare_d'Esquelbecq", "Gare_de_Gravelines", "Gare_de_Savy-Berlette", "Gare_de_Maresquel", "Gare_d'Ailly-sur-Somme", "Gare_de_Rue", "Gare_de_Wimille-Wimereux", "Gare_de_Mouy-Bury", "Gare_de_Saint-Omer-en-Chaussée", "Gare_de_Formerie", "Gare_de_Longroy-Gamaches", "Gare_d'Épinay-Villetaneuse", "Gare_de_Fontaine-Lavaganne", "Gare_de_Cergy-Préfecture", "Gare_de_Frépillon", "Gare_d'Auvers-sur-Oise", "Gare_de_Saint-Ouen-l'Aumône_-_Liesse", "Gare_de_Boissy-l'Aillerie", "Gare_de_Liancourt-Saint-Pierre", "Gare_de_Pont-Cardinet", "Gare_d'Andrésy", "Gare_de_Gargenville", "Gare_de_Sannois", "Gare_de_Poissy", "Gare_d'Aubergenville-Élisabethville", "Gare_de_Pont-de-l'Arche", "Gare_de_Malaunay-Le_Houlme", "Gare_de_Bréauté-Beuzeville", "Gare_de_Montville", "Gare_de_Rolleville", "Gare_de_Beaumont-le-Roger", "Gare_de_Bayeux", "Gare_de_Tourville", "Gare_de_Pont-l'Évêque", "Gare_de_Nonancourt", "Gare_de_Surdon", "Gare_de_Saint-Sever", "Gare_de_Carantilly-Marigny", "Gare_de_Miniac", "Gare_de_Paris-Montparnasse", "Gare_de_Versailles-Chantiers", "Gare_de_Saint-Piat", "Gare_de_La_Loupe", "Gare_de_Crissé", "Gare_de_Louverné", "Gare_de_Montfort-sur-Meu", "Gare_de_Plestan", "Gare_de_Plouaret-Trégor", "Gare_de_La_Forest", "Gare_de_La_Hutte-Coulombiers", "Gare_de_Montreuil-sur-Ille", "Gare_de_Roscoff", "Gare_de_Retiers", "Gare_de_Saint-Jacques-de-la-Lande", "Gare_de_Pléchâtel", "Gare_de_Saint-Gildas-des-Bois", "Gare_d'Auray", "Gare_de_Quimper", "Gare_de_Saint-Pierre-Quiberon", "Gare_de_Les_Mais", "Gare_de_Paimpol", "Gare_de_Beauvoir-sur-Niort", "Gare_de_Pons", "Gare_de_Gauriaguet", "Gare_de_Saint-Genouph", "Gare_de_La_Ménitré", "Gare_d'Ancenis", "Gare_de_Cordemais", "Gare_de_Pornichet", "Gare_de_La_Baule-les-Pins", "Gare_d'Erdre-Active", "Gare_de_La_Mothe-Achard", "Gare_d'Azay-le-Rideau", "Gare_de_Gorges", "Gare_d'Angoulins-sur-Mer", "Gare_de_Rezé-Pont-Rousseau", "Gare_de_Saint-Maixent_(Deux-Sèvres)", "Gare_de_La_Rochelle-Porte-Dauphine", "Gare_d'Égly", "Gare_de_Voves", "Gare_de_Château-Renault", "Gare_de_Gentilly", "Gare_de_Toury", "Gare_d'Écommoy", "Gare_d'Athis-Mons", "Gare_de_Chamarande", "Gare_de_Château-Gaillard", "Gare_de_Meung-sur-Loire", "Gare_de_Blois", "Gare_de_Montlouis", "Gare_de_Châtellerault", "Gare_de_Chasseneuil_(Vienne)", "Gare_de_Ruffec", "Gare_de_Saint-Denis-de-Pile", "Gare_de_Cognac", "Gare_de_Caudéran-Mérignac", "Gare_de_Theillay", "Gare_de_Châteauroux", "Gare_de_Fromental", "Gare_de_Saint-Germain-les-Belles", "Gare_de_Souillac", "Gare_de_Thésée", "Gare_de_Reignac", "Gare_de_Loreux", "Gare_de_Varennes-sur-Fouzon", "Gare_de_Nantiat", "Gare_de_Saint-Brice-sur-Vienne", "Gare_de_Ruelle", "Gare_de_Négrondes", "Gare_de_Marmande", "Gare_de_Saint-Astier", "Gare_de_La_Bachellerie", "Gare_d'Aubazine-Saint-Hilaire", "Gare_de_Vélines", "Gare_de_Trémolat", "Gare_de_Laroque", "Gare_de_Bègles", "Gare_de_Podensac", "Gare_de_Caudrot", "Gare_de_Lamagistère", "Gare_de_Lacourtensourt", "Gare_de_Labège-Village", "Gare_de_Bram", "Gare_d'Agde", "Gare_de_Lardenne", "Gare_de_Mérenvielle", "Gare_de_Saint-Martory", "Gare_de_Tournay", "Gare_de_Pau", "Gare_de_Mont-de-Marsan", "Gare_de_Pessac", "Gare_d'Alouette-France", "Gare_de_Dax", "Gare_de_Saubusse-les-Bains", "Gare_de_Bayonne", "Gare_de_La_Hume", "Gare_de_Bidos", "Gare_de_Luchon", "Gare_de_Thuès-Carença", "Gare_de_Bolquère-Eyne", "Gare_de_Bourg-Madame", "Gare_de_Cintegabelle", "Gare_de_Luzenac-Garanou", "Gare_de_Campagne", "Gare_d'Elne", "Gare_de_Ria", "Gare_de_Foëcy", "Gare_de_Saincaize", "Gare_de_Saint-Florent-sur-Cher", "Gare_de_Vallon", "Gare_de_Viviez-Decazeville", "Gare_de_Parsac-Gouzon", "Gare_de_Commentry", "Gare_d'Ussel", "Gare_de_Jassonneix", "Gare_de_Villefranche-de-Rouergue", "Gare_de_Lisle-sur-Tarn", "Gare_de_Pers", "Gare_de_Neussargues", "Gare_de_Tournemire-Roquefort", "Gare_de_Marvejols", "Gare_de_Barjac", "Gare_de_Belvezet", "Gare_de_Carmaux", "Gare_de_Mazamet", "Gare_de_Ris-Orangis", "Gare_de_Ballancourt", "Gare_de_Garchizy", "Gare_de_Moulins-sur-Allier", "Gare_de_Balbigny", "Gare_de_Saint-Étienne-Châteaucreux", "Gare_de_Mesvres", "Gare_de_Saint-Léger-sur-Dheune", "Gare_de_Galuzot", "Gare_de_Civrieux-d'Azergues", "Gare_de_Francheville", "Gare_de_Sain-Bel", "Gare_d'Aulnat-Aéroport", "Gare_de_Thiers", "Gare_de_Vichy", "Gare_de_Gerzat", "Gare_de_Langeac", "Gare_de_Génolhac", "Gare_de_Fraisses-Unieux", "Gare_de_Chamalières-sur-Loire", "Gare_de_La_Ricamarie", "Gare_de_Nîmes-Pont-du-Gard", "Gare_de_Lunel-Viel", "Gare_de_Frontignan", "Gare_de_Créteil-Pompadour", "Gare_de_Cesson", "Gare_de_Villeneuve-la-Guyard", "Gare_de_Tonnerre", "Gare_de_Gevrey-Chambertin", "Gare_de_Romanèche-Thorins", "Gare_de_Couzon-au-Mont-d'Or", "Gare_de_Sérézin", "Gare_de_Saint-Chamas", "Gare_de_Collonges_(Côte-d'Or)", "Gare_de_Frasne", "Gare_de_Besançon-Viotte", "Gare_de_Montbéliard", "Gare_de_Saulon", "Gare_d'Aiserey", "Gare_de_Brazey-en-Plaine", "Gare_de_Chaugey", "Gare_de_Montferrand-Thoraise", "Gare_de_Saône", "Gare_de_La_Chaux-des-Crotenay", "Gare_d'Oyonnax", "Gare_de_Cousance", "Gare_d'Ambérieu-en-Bugey", "Gare_de_Servas-Lent", "Gare_de_Meximieux-Pérouges", "Gare_de_Pougny-Chancy", "Gare_de_Thonon-les-Bains", "Gare_de_Cluses", "Gare_d'Aix-les-Bains-Le_Revard", "Gare_de_Grésy-sur-Aix", "Gare_d'Albens", "Gare_d'Albertville", "Gare_de_Chindrieux", "Gare_d'Épierre-Saint-Léger", "Gare_de_Bardonecchia", "Gare_de_Saint-André-le-Gaz", "Gare_de_Saint-Priest", "Gare_de_Châbons", "Gare_de_Saint-Égrève-Saint-Robert", "Gare_de_Clelles-Mens", "Gare_de_Château-Arnoux-Saint-Auban", "Gare_de_Septèmes", "Gare_de_Saint-Marcellin", "Gare_de_Goncelin", "Gare_de_Chorges", "Gare_de_Saint-Saturnin-d'Avignon", "Gare_de_Carpentras", "Gare_de_La_Penne-sur-Huveaune", "Gare_de_Toulon", "Gare_de_Vidauban", "Gare_d'Antibes", "Gare_de_Beaulieu-sur-Mer", "Gare_d'Istres", "Gare_de_Sausset-les-Pins", "Gare_de_Ranguin", "Gare_de_Peillon-Sainte-Thècle", "Gare_de_Borgo_San_Dalmazzo", "Gare_de_Roccavione", "Gare_de_Saint-Dalmas-de-Tende", "Gare_de_Vincennes", "Gare_de_Bécon-les-Bruyères", "Gare_de_Montreuil", "Gare_de_Nanterre-Université", "Gare_d'Issy", "Gare_de_Vauboyen", "Gare_de_La_Rocade", "Gare_de_Tattone", "Gare_de_Palasca", "Gare_d'Algajola", "Gare_d'Entrevaux", "Gare_d'Anzin", "Gare_de_Robinson"];
    const expectedGaresO = [
    "Gare_de_Paris-Est","Gare_Rosa Parks","Gare_de_Pantin","Gare_de_Noisy-le-Sec","Gare_de_Rosny-Bois-Perrier","Gare_de_Rosny-sous-Bois","Gare_de_Val-de-Fontenay","Gare_de_Nogent-Le Perreux","Gare_de_Les Boullereaux-Champigny","Gare_de_Villiers-sur-Marne-Le Plessis-Trévise","Gare_de_Les Yvris-Noisy-le-Grand","Gare_d'Émerainville-Pontault-Combault","Gare_de_Roissy-en-Brie","Gare_d'Ozoir-la-Ferrière","Gare_de_Gretz-Armainvilliers","Gare_de_Verneuil-l'Étang","Gare_de_Mormant","Gare_de_Nangis","Gare_de_Longueville","Gare_de_Nogent-sur-Seine","Gare_de_Romilly-sur-Seine","Gare_de_Troyes","Gare_de_Vendeuvre (Aube)","Gare_de_Bar-sur-Aube","Gare_de_Chaumont","Gare_de_Langres","Gare_de_Culmont-Chalindrey","Gare_de_Vesoul","Gare_de_Lure","Gare_de_Ronchamp","Gare_de_Champagney","Gare_de_Bas-Évette","Gare_de_Trois-Chênes","Gare_de_Belfort","Gare_de_Chèvremont","Gare_de_Petit-Croix","Gare_de_Montreux-Vieux","Gare_de_Dannemarie","Gare_d'Altkirch","Gare_de_Walheim","Gare_de_Tagolsheim","Gare_d'Illfurth","Gare_de_Zillisheim","Gare_de_Flaxlanden","Gare_de_Hasenrain","Gare_de_Mulhouse-Ville","Gare_de_Magenta","Gare_de_Tournan","Gare_de_Marles-en-Brie","Gare_de_Mortcerf","Gare_de_Guérard-La Celle-sur-Morin","Gare_de_Faremoutiers-Pommeuse","Gare_de_Mouroux","Gare_de_Coulommiers","Gare_de_Sainte-Colombe-Septveilles","Gare_de_Champbenoist-Poigny","Gare_de_Provins","Gare_de_Champagne-Ardenne-TGV","Gare_de_Meuse-TGV","Gare_de_Lorraine-TGV","Gare_de_Sens","Gare_de_Vitry-le-François","Gare_de_Besançon-Franche-Comté-TGV","Gare_de_Belfort-Montbéliard-TGV","Gare_de_Joinville","Gare_de_Saint-Dizier","Gare_d'Eurville-Bienville","Gare_de_Bayard","Gare_de_Chevillon","Gare_de_Fronville-Saint-Urbain","Gare_de_Donjeux","Gare_de_Gudmont","Gare_de_Froncles-Buxières","Gare_de_Vignory","Gare_de_Vraincourt-Viéville","Gare_de_Bologne","Gare_de_Neufchâteau","Gare_de_Pagny-sur-Meuse","Gare_de_Nançois - Tronville","Gare_de_Mirecourt","Gare_de_Hymont - Mattaincourt","Gare_de_Merrey","Gare_de_Toul","Gare_de_Merrey (bif)","Gare_de_Damblain","Gare_de_Rozières-sur-Mouzon","Gare_de_Lamarche","Gare_de_Martigny-les-Bains","Gare_de_Contrexéville","Gare_de_Vittel","Gare_de_Neuves-Maisons","Gare_de_Rosières-aux-Salines","Gare_de_Jarville-la-Malgrange","Gare_de_Houdemont","Gare_de_Ludres","Gare_de_Messein","Gare_de_Pont-Saint-Vincent","Gare_de_Bainville-sur-Madon","Gare_de_Xeuilley","Gare_de_Pierreville","Gare_de_Pulligny-Autrey","Gare_de_Ceintrey","Gare_de_Tantonville","Gare_de_Vézelise","Gare_de_Praye-sous-Vaudémont","Gare_de_Diarville","Gare_de_Poussay","Gare_de_Blainville - Damelevières","Gare_d'Einvaux","Gare_de_Bayon","Gare_de_Charmes","Gare_de_Vincey","Gare_de_Châtel-Nomexy","Gare_d'Igney","Gare_de_Thaon","Gare_d'Épinal","Gare_de_Xertigny","Gare_de_Bains-les-Bains","Gare_d'Aillevillers","Gare_de_Luxeuil-les-Bains","Gare_de_Dinozé","Gare_d'Arches","Gare_de_Pouxeux","Gare_d'Éloyes","Gare_de_Saint-Nabord","Gare_de_Remiremont","Gare_de_Docelles-Cheniménil","Gare_de_Lépanges","Gare_de_Bruyères","Gare_de_Laveline-devant-Bruyères","Gare_de_Biffontaine","Gare_de_Corcieux-Vanémont","Gare_de_Saint-Léonard","Gare_de_Saint-Dié","Gare_de_Mont-sur-Meurthe","Gare_de_Saint-Clément-Laronxe","Gare_de_Chenevières","Gare_de_Ménil-Flin","Gare_d'Azerailles","Gare_de_Baccarat","Gare_de_Bertrichamps","Gare_de_Thiaville","Gare_de_Raon-l'Étape","Gare_d'Étival-Clairefontaine","Gare_de_Saint-Michel-sur-Meurthe","Gare_d'Igney - Avricourt","Gare_de_Bondy","Gare_de_Le Raincy - Villemomble - Montfermeil","Gare_de_Gagny","Gare_de_Chénay-Gagny","Gare_de_Chelles - Gournay","Gare_de_Vaires - Torcy","Gare_de_Lagny - Thorigny","Gare_d'Esbly","Gare_de_Meaux","Gare_de_Trilport","Gare_de_Changis - Saint-Jean","Gare_de_La Ferté-sous-Jouarre","Gare_de_Nanteuil - Saâcy","Gare_de_Nogent-l'Artaud - Charly","Gare_de_Chézy-sur-Marne","Gare_de_Château-Thierry","Gare_de_Dormans","Gare_d'Epernay","Gare_de_Châlons-en-Champagne","Gare_de_Revigny","Gare_de_Bar-le-Duc","Gare_de_Lérouville","Gare_de_Commercy","Gare_de_Foug","Gare_de_Fontenoy-sur-Moselle","Gare_de_Liverdun","Gare_de_Frouard","Gare_de_Champigneulles","Gare_de_Nancy-Ville","Gare_de_Laneuveville-devant-Nancy","Gare_de_Varangéville - Saint-Nicolas","Gare_de_Dombasle-sur-Meurthe","Gare_de_Lunéville","Gare_de_Sarrebourg","Gare_de_Réding","Gare_de_Lutzelbourg","Gare_de_Saverne","Gare_de_Steinbourg","Gare_de_Dettwiller","Gare_de_Wilwisheim","Gare_de_Hochfelden","Gare_de_Schwindratzheim","Gare_de_Mommenheim","Gare_de_Brumath","Gare_de_Stephansfeld","Gare_de_Vendenheim","Gare_de_Mundolsheim","Gare_de_Strasbourg-Ville","Gare_de_Montry - Condé","Gare_de_Couilly - Saint-Germain","Gare_de_Villiers - Montbarbin","Gare_de_Crécy-La Chapelle","Gare_d'Isles-Armentières","Gare_de_Lizy-sur-Ourcq","Gare_de_Crouy-sur-Ourcq","Gare_de_Mareuil-sur-Ourcq","Gare_de_La Ferté-Milon","Gare_de_Neuilly-Saint-Front","Gare_d'Oulchy - Breny","Gare_de_Fère-en-Tardenois","Gare_de_Mont-Notre-Dame","Gare_de_Bazoches","Gare_d'Ay","Gare_d'Avenay","Gare_de_Germaine","Gare_de_Rilly-la-Montagne","Gare_de_Montbré","Gare_de_Trois-Puits","Gare_de_Reims-Maison-Blanche","Gare_de_Reims-Franchet-d'Esperey","Gare_de_Reims","Gare_d'Aulnay-sous-Bois","Gare_de_Sevran-Beaudottes","Gare_de_Villepinte","Gare_de_Parc-des-Expositions","Gare_de_Roissy-Aéroport-Charles-de-Gaulle 1","Gare_de_Roissy-Aéroport-Charles-de-Gaulle 2-TGV (RER)","Gare_de_Saint-Hilaire-au-Temple","Gare_de_Bouy","Gare_de_Mourmelon-le-Petit","Gare_de_Sept-Saulx","Gare_de_Val-de-Vesle","Gare_de_Prunay","Gare_de_Sillery","Gare_de_Courcy-Brimont","Gare_de_Loivre","Gare_d'Aguilcourt-Variscourt","Gare_de_Guignicourt","Gare_d'Amifontaine","Gare_de_Saint-Erme","Gare_de_Coucy-lès-Eppes","Gare_de_Laon","Gare_de_Verdun","Gare_d'Étain","Gare_de_Conflans-Jarny","Gare_de_Hatrize","Gare_de_Valleroy-Moineville","Gare_d'Auboué","Gare_de_Homécourt","Gare_de_Joeuf","Gare_de_Moyeuvre-Grande","Gare_de_Rombas-Clouange","Gare_de_Gandrange-Amnéville","Gare_de_Hagondange","Gare_d'Onville","Gare_de_Novéant","Gare_d'Ancy-sur-Moselle","Gare_d'Ars-sur-Moselle","Gare_de_Metz-Ville","Gare_de_Pompey","Gare_de_Marbache","Gare_de_Belleville","Gare_de_Dieulouard","Gare_de_Pont-à-Mousson","Gare_de_Vandières","Gare_de_Pagny-sur-Moselle","Gare_de_Baroncourt","Gare_de_Bénestroff","Gare_de_Sarralbe","Gare_de_Strasbourg-Roethig","Gare_de_Lingolsheim","Gare_d'Entzheim","Gare_de_Duppigheim","Gare_de_Duttlenheim","Gare_de_Dachstein","Gare_de_Molsheim","Gare_de_Mutzig","Gare_de_Gresswiller","Gare_de_Heiligenberg - Mollkirch","Gare_d'Urmatt","Gare_de_Mullerhof","Gare_de_Lutzelhouse","Gare_de_Wisches","Gare_de_Russ-Hersbach","Gare_de_Schirmeck-La Broque","Gare_de_Rothau","Gare_de_Fouday","Gare_de_Saint-Blaise-la-Roche - Poutay","Gare_de_Saulxures","Gare_de_Bourg-Bruche","Gare_de_Saales","Gare_de_Colroy-Lubine","Gare_de_Provenchères-sur-Fave","Gare_de_Lesseux - Frapelle","Gare_de_Raves - Ban-de-Laveline","Gare_de_Sélestat","Gare_de_Scherwiller","Gare_de_Dambach-la-Ville","Gare_d'Epfig","Gare_d'Eichhoffen","Gare_de_Barr","Gare_de_Gertwiller","Gare_de_Goxwiller","Gare_d'Obernai","Gare_de_Bischoffsheim","Gare_de_Rosheim","Gare_de_Dorlisheim","Gare_de_Graffenstaden","Gare_de_Geispolsheim","Gare_de_Fegersheim-Lipsheim","Gare_de_Limersheim","Gare_d'Erstein","Gare_de_Matzenheim","Gare_de_Benfeld","Gare_de_Kogenheim","Gare_d'Ebersheim","Gare_de_Colmar","Gare_de_Herrlisheim-près-Colmar","Gare_de_Rouffach","Gare_de_Merxheim","Gare_de_Raedersheim","Gare_de_Bollwiller","Gare_de_Staffelfelden","Gare_de_Lutterbach (Haut-Rhin)","Gare_de_Mulhouse-Dornach","Gare_de_Rixheim","Gare_de_Habsheim","Gare_de_Sierentz","Gare_de_Bartenheim","Gare_de_Saint-Louis-la-Chaussée","Gare_de_Saint-Louis (Haut-Rhin)","Gare_de_Colmar-Saint-Joseph","Gare_de_Colmar-Mésanges","Gare_de_Logelbach","Gare_d'Ingersheim-Cité-Scolaire","Gare_de_Turckheim","Gare_de_Saint-Gilles-Lycée-du-Pflixbourg","Gare_de_Walbach","Gare_de_Wihr-au-Val - Soultzbach-les-Bains","Gare_de_Gunsbach - Griesbach","Gare_de_Munster-Badischhof","Gare_de_Munster","Gare_de_Luttenbach-près-Munster","Gare_de_Breitenbach","Gare_de_Muhlbach-sur-Munster","Gare_de_Metzeral","Gare_de_Bantzenheim","Gare_de_Graffenwald","Gare_de_Cernay (Haut-Rhin)","Gare_de_Vieux-Thann ZI","Gare_de_Vieux-Thann","Gare_de_Thann","Gare_de_Thann-Centre","Gare_de_Thann-Saint-Jacques","Gare_de_Bitschwiller (Haut-Rhin)","Gare_de_Willer-sur-Thur","Gare_de_Moosch","Gare_de_Saint-Amarin","Gare_de_Ranspach","Gare_de_Wesserling","Gare_de_Fellering","Gare_d'Oderen","Gare_de_Kruth","Gare_d'Aspach","Gare_de_Lutterbach-TT","Gare_de_Mulhouse-Musées-TT","Gare_de_Mulhouse-Dornach-TT","Gare_de_Zu-Rhein","Gare_de_Daguerre","Gare_de_Mulhouse-Porte-Jeune-TT","Gare_de_Mulhouse-Gare-Centrale-TT","Gare_de_Berthelming","Gare_de_Morhange","Gare_de_Rémilly","Gare_de_Sanry-sur-Nied","Gare_de_Courcelles-sur-Nied","Gare_de_Peltre","Gare_de_Krimmeri-Meinau","Gare_de_Bischheim","Gare_de_Hoenheim-Tram","Gare_de_La Wantzenau","Gare_de_Kilstett","Gare_de_Gambsheim","Gare_de_Herrlisheim","Gare_de_Drusenheim","Gare_de_Sessenheim","Gare_de_Rountzenheim","Gare_de_Roeschwoog","Gare_de_Roppenheim","Gare_de_Seltz","Gare_de_Munchhausen","Gare_de_Mothern","Gare_de_Lauterbourg","Gare_de_Hoerdt","Gare_de_Weyersheim","Gare_de_Kurtzenhouse","Gare_de_Bischwiller","Gare_de_Marienthal","Gare_de_Haguenau","Gare_de_Walbourg","Gare_de_Hoelschloch","Gare_de_Soultz-sous-Forêts","Gare_de_Hoffen","Gare_de_Hunspach","Gare_de_Riedseltz","Gare_de_Wissembourg","Gare_de_Mertzwiller","Gare_de_Schweighouse-sur-Moder","Gare_de_Gundershoffen","Gare_de_Reichshoffen-Ville","Gare_de_Niederbronn-les-Bains","Gare_de_Sarreguemines","Gare_de_Hundling","Gare_de_Farschviller","Gare_de_Farébersviller","Gare_de_Béning","Gare_d'Obermodern","Gare_d'Ingwiller","Gare_de_Wingen-sur-Moder","Gare_de_Tieffenbach-Struth","Gare_de_Diemeringen","Gare_d'Oermingen","Gare_de_Kalhausen","Gare_de_Wittring","Gare_de_Zetting","Gare_de_Sarreinsming","Gare_de_Rémelfing","Gare_de_Sarre-Union","Gare_de_Schopperten","Gare_de_Keskastel","Gare_de_Herbitzheim","Gare_de_Herny","Gare_de_Faulquemont","Gare_de_Teting","Gare_de_Saint-Avold","Gare_de_Hombourg-Haut","Gare_de_Forbach","Gare_de_Forbach-Saarbahn","Gare_d'Anzeling","Gare_de_Freistroff","Gare_de_Bouzonville","Gare_de_Hombourg-Budange","Gare_de_Thionville","Gare_d'Yutz","Gare_de_Kuntzig","Gare_de_Distroff","Gare_de_Metzervisse","Gare_de_Kédange","Gare_d'Ébersviller","Gare_de_Basse-Ham","Gare_de_Koenigsmacker","Gare_de_Malling","Gare_de_Sierck-les-Bains","Gare_d'Apach","Gare_de_Metz-Nord","Gare_de_Woippy","Gare_de_Maizières-lès-Metz","Gare_de_Walibi-Lorraine","Gare_d'Uckange","Gare_de_Hettange-Grande","Gare_d'Audun-le-Tiche","Gare_de_Hayange","Gare_de_Vireux-Molhain","Gare_de_Longwy","Gare_de_Mohon","Gare_de_Lumes","Gare_de_Nouvion-sur-Meuse","Gare_de_Vrigne-Meuse","Gare_de_Donchery","Gare_de_Sedan","Gare_de_Pont-Maugis","Gare_de_Carignan","Gare_de_Montmédy","Gare_de_Longuyon","Gare_d'Audun-le-Roman","Gare_de_Fismes","Gare_de_Magneux-Courlandon","Gare_de_Breuil-Romain","Gare_de_Jonchery-sur-Vesle","Gare_de_Muizon","Gare_de_Bazancourt","Gare_de_Rethel","Gare_d'Amagne-Lucquy","Gare_de_Poix-Terron","Gare_de_Charleville-Mézières","Gare_de_Nouzonville","Gare_de_Joigny-sur-Meuse","Gare_de_Bogny-sur-Meuse","Gare_de_Monthermé","Gare_de_Deville","Gare_de_Laifour","Gare_d'Anchamps","Gare_de_Revin","Gare_de_Fumay","Gare_de_Haybes","Gare_de_Fépin","Gare_d'Aubrives","Gare_de_Givet","Gare_de_Challerange","Gare_de_Liart","Gare_d'Amagne-Lucquy (bif-est)","Gare_de_Vrigne-aux-Bois","Gare_de_Lille-Europe","Gare_de_Calais-Fréthun","Gare_d'Audun-le-Roman (bif-est)","Gare_de_TGV Haute-Picardie","Gare_de_Roissy-Aéroport-Charles-de-Gaulle 2-TGV (TGV)","Gare_de_Marne-la-Vallée-Chessy","Gare_d'Ormoy-Villers","Gare_de_La Plaine-Stade-de-France","Gare_d'Aubervilliers-La Courneuve","Gare_de_Le Bourget","Gare_de_Drancy","Gare_de_Le Blanc-Mesnil","Gare_de_Sevran-Livry","Gare_de_Vert-Galant","Gare_de_Villeparisis","Gare_de_Mitry-Claye","Gare_de_Compans","Gare_de_Thieux-Nantouillet","Gare_de_Dammartin-Juilly-Saint-Mard","Gare_de_Le Plessis-Belleville","Gare_de_Nanteuil-le-Haudouin","Gare_de_Crépy-en-Valois","Gare_de_Vaumoise","Gare_de_Villers-Cotterêts","Gare_de_Corcy","Gare_de_Longpont","Gare_de_Vierzy","Gare_de_Crouy","Gare_de_Margival","Gare_de_Vauxaillon","Gare_d'Anizy-Pinon","Gare_de_Clacy-Mons","Gare_de_Barenton-Bugny","Gare_de_Verneuil-sur-Serre","Gare_de_Dercy-Froidmont","Gare_de_Voyenne","Gare_de_Marle-sur-Serre","Gare_de_Vervins","Gare_de_La Bouteille","Gare_d'Origny-en-Thiérache","Gare_de_Hirson","Gare_d'Anor","Gare_d'Estrées-Saint-Denis","Gare_de_Wacquemoulin","Gare_de_Tricot","Gare_de_Montdidier","Gare_de_Hargicourt-Pierrepont","Gare_de_Moreuil","Gare_de_Thézy-Glimont","Gare_de_Boves","Gare_de_Chauny","Gare_de_Le Cateau","Gare_d'Avesnes","Gare_de_Villers-Saint-Paul","Gare_de_Rieux-Angicourt","Gare_de_Pont-Sainte-Maxence","Gare_de_Chevrières","Gare_de_Longueil-Sainte-Marie","Gare_de_Le Meux-la-Croix-Saint-Ouen","Gare_de_Jaux","Gare_de_Compiègne","Gare_de_Longueil-Annel","Gare_de_Thourotte","Gare_de_Ribécourt","Gare_d'Ourscamps","Gare_de_Noyon","Gare_d'Appilly","Gare_de_Viry-Noureuil","Gare_de_Tergnier","Gare_de_Mennessis","Gare_de_Montescourt","Gare_de_Saint-Quentin","Gare_de_Fresnoy-le-Grand","Gare_de_Bohain","Gare_de_Busigny","Gare_d'Ors","Gare_de_Landrecies","Gare_de_Hachette","Gare_d'Aulnoye-Aymeries","Gare_de_Hautmont","Gare_de_Sous-le-Bois","Gare_de_Louvroil","Gare_de_Maubeuge","Gare_de_Les Bons-Pères","Gare_de_Recquignies","Gare_de_Jeumont","Gare_de_Villers-Saint-Paul (ZI)","Gare_de_Maurois","Gare_de_Bertry","Gare_de_Caudry","Gare_de_Cattenières","Gare_de_Wambaix","Gare_d'Escaudoeuvres","Gare_d'Iwuy","Gare_de_Bouchain","Gare_de_Lourches","Gare_de_Le Quesnoy (Nord)","Gare_de_Prouvy-Thiant","Gare_de_Denain","Gare_de_Trith-Saint-Léger","Gare_de_Valenciennes","Gare_de_Valenciennes-Aéroport","Gare_de_Wallers","Gare_de_Saint-Amand-les-Eaux","Gare_d'Aubigny-au-Bac","Gare_de_Saint-Just-en-Chaussée","Gare_de_Chaulnes","Gare_de_Cambrai","Gare_de_Brunémont","Gare_d'Arleux","Gare_de_Cantin","Gare_de_Sin-le-Noble","Gare_de_Douai","Gare_de_Villers-Bretonneux","Gare_de_Marcelcave","Gare_de_Rosières-en-Santerre","Gare_de_Nesle","Gare_de_Ham","Gare_de_Flavy-le-Martel","Gare_de_La Fère","Gare_de_Versigny","Gare_de_Crépy-Couvron","Gare_de_Montigny-en-Ostrevent","Gare_de_Somain","Gare_de_Raismes","Gare_de_Beuvrages","Gare_de_Pont-de-la-Deûle","Gare_d'Orchies","Gare_de_Nomain-Ouvignies","Gare_de_Seclin","Gare_de_Seclin-Annexe","Gare_de_Mont-de-Terre","Gare_de_Lesquin","Gare_de_Fretin","Gare_d'Ennevelin","Gare_de_Templeuve","Gare_de_Nomain","Gare_de_Landas","Gare_de_Rosult","Gare_de_Le Poirier","Gare_de_Locquignol","Gare_de_Berlaimont","Gare_de_Leval","Gare_de_Dompierre","Gare_de_Saint-Hilaire","Gare_d'Avesnelles","Gare_de_Sains-du-Nord","Gare_de_Fourmies","Gare_de_Hirson-Écoles","Gare_de_Genech","Gare_de_Cobrieux","Gare_de_Cysoing","Gare_de_Bouvines","Gare_d'Anstaing","Gare_de_Tressin","Gare_d'Ascq","Gare_de_Tourcoing","Gare_de_Lezennes","Gare_de_Hellemmes","Gare_de_Pont-de-Bois","Gare_d'Annappes","Gare_de_Baisieux","Gare_de_Paris-Nord","Gare_de_Stade-de-France-Saint-Denis","Gare_de_Saint-Denis","Gare_de_Pierrefitte-Stains","Gare_de_Garges - Sarcelles","Gare_de_Villiers-le-Bel-Gonesse","Gare_de_Goussainville","Gare_de_Les Noues","Gare_de_Louvres","Gare_de_Survilliers-Fosses","Gare_de_La Borne-Blanche","Gare_d'Orry-la-Ville-Coye","Gare_de_Chantilly - Gouvieux","Gare_de_Creil","Gare_de_Laigneville","Gare_de_Liancourt-Rantigny","Gare_de_Clermont-de-l'Oise","Gare_d'Avrechy","Gare_de_Saint-Remy-en-l'Eau","Gare_de_Gannes","Gare_de_Breteuil-Embranchement","Gare_de_La Faloise","Gare_d'Ailly-sur-Noye","Gare_de_Dommartin-Remiencourt","Gare_de_Longueau","Gare_de_Daours","Gare_de_Corbie","Gare_de_Heilly","Gare_de_Méricourt-Ribemont","Gare_de_Buire-sur-l'Ancre","Gare_d'Albert","Gare_de_Miraumont","Gare_d'Achiet","Gare_de_Courcelles-le-Comte","Gare_de_Boisleux","Gare_d'Arras","Gare_de_Roeux","Gare_de_Biache-Saint-Vaast","Gare_de_Vitry-en-Artois","Gare_de_Brebières","Gare_de_Corbehem","Gare_de_Leforest","Gare_d'Ostricourt","Gare_de_Libercourt","Gare_de_Phalempin","Gare_de_Wattignies-Templemars","Gare_de_Ronchin","Gare_de_Lille-Flandres","Gare_de_Croix-Wasquehal","Gare_de_Croix-l'Allumette","Gare_de_Roubaix","Gare_de_Pont-de-Sallaumines","Gare_de_Coron-de-Méricourt","Gare_de_Billy-Montigny","Gare_de_Hénin-Beaumont","Gare_de_Dourges","Gare_de_Sallaumines","Gare_de_Bauvin-Provin","Gare_de_Loison","Gare_de_Pont-à-Vendin","Gare_de_Meurchin","Gare_de_Don-Sainghin","Gare_de_Bully-Grenay","Gare_de_La Bassée-Violaines","Gare_de_Lille-Porte-de-Douai","Gare_de_Lille CHR","Gare_de_Loos-les-Lille","Gare_de_Haubourdin","Gare_de_Santes","Gare_de_Wavrin","Gare_de_La Fontaine-Nord","Gare_de_Marquillies","Gare_de_Salomé","Gare_de_Cuinchy","Gare_de_Beuvry (Pas-de-Calais)","Gare_de_Béthune","Gare_de_Fouquereuil","Gare_de_Vis-à-Marles","Gare_de_Calonne-Ricouart","Gare_de_Pernes-Camblain","Gare_de_Saint-Pol-sur-Ternoise","Gare_d'Armentières","Gare_d'Isbergues","Gare_de_La Madeleine","Gare_de_Saint-André","Gare_de_Pérenchies","Gare_de_Nieppe","Gare_de_Steenwerck","Gare_de_Bailleul","Gare_de_Strazeele","Gare_de_Hazebrouck","Gare_d'Ebblinghem","Gare_de_Renescure","Gare_de_Saint-Omer","Gare_de_Watten-Éperlecques","Gare_de_Ruminghem","Gare_d'Audruicq","Gare_de_Nortkerque","Gare_de_Pont-d'Ardres","Gare_de_Les Fontinettes","Gare_de_Dunkerque","Gare_de_Bailleul-Sir-Berthoult","Gare_de_Farbus","Gare_de_Vimy","Gare_d'Avion","Gare_de_Lens","Gare_de_Loos-en-Gohelle","Gare_de_Liévin","Gare_de_Mazingarbe","Gare_de_Noeux-les-Mines","Gare_de_Chocques","Gare_de_Lillers","Gare_de_Ham-en-Artois","Gare_de_Thiennes","Gare_de_Steenbecque","Gare_de_Cassel","Gare_d'Arnèke","Gare_d'Esquelbecq","Gare_de_Bergues","Gare_de_Coudekerque-Branche","Gare_de_Bourbourg","Gare_de_Grande-Synthe","Gare_de_Gravelines","Gare_de_Beau-Marais","Gare_de_Saint-Roch (Somme)","Gare_de_Maroeuil","Gare_de_Frévin-Capelle","Gare_d'Aubigny-en-Artois","Gare_de_Savy-Berlette","Gare_de_Tincques","Gare_d'Anvin","Gare_de_Blangy-sur-Ternoise","Gare_d'Auchy-lès-Hesdin","Gare_de_Hesdin","Gare_d'Aubin-Saint-Vaast","Gare_de_Maresquel","Gare_de_Beaurainville","Gare_de_Brimeux","Gare_de_Montreuil-sur-Mer","Gare_d'Étaples-Le Touquet","Gare_de_Hesdigneul","Gare_d'Amiens","Gare_de_Dreuil-lès-Amiens","Gare_d'Ailly-sur-Somme","Gare_de_Picquigny","Gare_de_Hangest","Gare_de_Longpré-les-Corps-Saints","Gare_de_Pont-Remy","Gare_d'Abbeville","Gare_de_Noyelles","Gare_de_Rue","Gare_de_Rang-du-Fliers-Verton","Gare_de_Dannes-Camiers","Gare_de_Neufchâtel-Hardelot","Gare_de_Pont-de-Briques","Gare_de_Boulogne-Ville","Gare_de_Boulogne-Tintelleries","Gare_de_Wimille-Wimereux","Gare_de_Marquise-Rinxent","Gare_de_Le Haut-Banc","Gare_de_Caffiers","Gare_de_Pihen","Gare_de_Calais-Ville","Gare_de_Villaines-sous-Bois","Gare_de_Belloy-Saint-Martin","Gare_de_Viarmes","Gare_de_Seugy","Gare_de_Luzarches","Gare_de_Montataire","Gare_de_Cramoisy","Gare_de_Cires-lès-Mello","Gare_de_Balagny-Saint-Épin","Gare_de_Mouy-Bury","Gare_de_Heilles-Mouchy","Gare_de_Hermes-Berthecourt","Gare_de_Villers-Saint-Sépulcre","Gare_de_Montreuil-sur-Thérain","Gare_de_Rochy-Condé","Gare_de_Remy","Gare_de_Saint-Omer-en-Chaussée","Gare_de_Namps-Quevauvillers","Gare_de_Poix-de-Picardie","Gare_de_Fouilloy","Gare_d'Abancourt","Gare_de_Formerie","Gare_de_Serqueux","Gare_de_Sommery","Gare_de_Mathonville - Neufbosc","Gare_de_Montérolier-Buchy","Gare_de_Longuerue-Vieux-Manoir","Gare_de_Morgny","Gare_de_Saint-Martin-du-Vivier","Gare_de_Longroy-Gamaches","Gare_de_Quesnoy-le-Montant","Gare_d'Acheux-Franleu","Gare_de_Chepy-Valines","Gare_de_Feuquerolles","Gare_de_Feuquières-Fressenneville","Gare_de_Woincourt","Gare_d'Épinay-Villetaneuse","Gare_de_Deuil-Montmagny","Gare_de_Groslay","Gare_de_Sarcelles-Saint-Brice","Gare_d'Écouen-Ézanville","Gare_de_Domont","Gare_de_Bouffémont-Moisselles","Gare_de_Montsoult-Maffliers","Gare_de_Presles-Courcelles","Gare_de_Nointel-Mours","Gare_de_Persan-Beaumont","Gare_de_Chambly","Gare_de_Bornel-Belle-Église","Gare_d'Esches","Gare_de_Méru","Gare_de_Laboissière-le-Déluge","Gare_de_Saint-Sulpice-Auteuil","Gare_de_Beauvais","Gare_de_Herchies","Gare_de_Milly-sur-Thérain","Gare_d'Achy","Gare_de_Marseille-en-Beauvaisis","Gare_de_Fontaine-Lavaganne","Gare_de_Grez-Gaudechart","Gare_de_Grandvilliers","Gare_de_Feuquières-Broquiers","Gare_d'Aumale","Gare_de_Blangy-sur-Bresle","Gare_d'Eu","Gare_de_Le Tréport-Mers","Gare_de_Neuville-Université","Gare_de_Cergy-Préfecture","Gare_de_Cergy-Saint-Christophe","Gare_de_Cergy-le-Haut","Gare_d'Ermont-Eaubonne","Gare_d'Ermont-Halte","Gare_de_Gros-Noyer-Saint-Prix","Gare_de_Saint-Leu-la-Forêt","Gare_de_Vaucelles","Gare_de_Taverny","Gare_de_Bessancourt","Gare_de_Frépillon","Gare_de_Méry-sur-Oise)","Gare_de_Mériel","Gare_de_Valmondois","Gare_d'Épluches","Gare_de_Pont-Petit","Gare_de_Chaponval","Gare_d'Auvers-sur-Oise","Gare_de_L'Isle-Adam-Parmain","Gare_de_Champagne-sur-Oise","Gare_de_Bruyères-sur-Oise","Gare_de_Boran-sur-Oise","Gare_de_Précy-sur-Oise","Gare_de_Saint-Leu-d'Esserent","Gare_de_La Barre-Ormesson","Gare_d'Enghien-les-Bains","Gare_de_Champ-de-Courses-d'Enghien","Gare_de_Cernay","Gare_de_Franconville-Plessis-Bouchard","Gare_de_Montigny-Beauchamp","Gare_de_Pierrelaye","Gare_de_Saint-Ouen-l'Aumône - Liesse","Gare_de_Saint-Ouen-l'Aumône","Gare_de_Pontoise","Gare_d'Osny","Gare_de_Boissy-l'Aillerie","Gare_de_Montgeroult-Courcelles","Gare_d'Us","Gare_de_Santeuil-Le Perchay","Gare_de_Chars","Gare_de_La Villetertre","Gare_de_Liancourt-Saint-Pierre","Gare_de_Chaumont-en-Vexin","Gare_de_Trie-Château","Gare_de_Gisors","Gare_de_Sérifontaine","Gare_de_Gournay-Ferrières","Gare_de_Paris-Saint-Lazare","Gare_de_Pont-Cardinet","Gare_de_Clichy-Levallois","Gare_d'Asnières-sur-Seine","Gare_de_Bois-Colombes","Gare_de_Colombes","Gare_de_Le Stade","Gare_d'Argenteuil","Gare_de_Le Val-d'Argenteuil","Gare_de_Cormeilles-en-Parisis","Gare_de_La Frette-Montigny","Gare_de_Herblay","Gare_de_Conflans-Sainte-Honorine","Gare_de_Conflans-Fin-d'Oise","Gare_de_Maurecourt","Gare_d'Andrésy","Gare_de_Chanteloup-les-Vignes","Gare_de_Triel-sur-Seine","Gare_de_Vaux-sur-Seine","Gare_de_Thun-le-Paradis","Gare_de_Meulan-Hardricourt","Gare_de_Juziers","Gare_de_Gargenville","Gare_d'Issou-Porcheville","Gare_de_Limay","Gare_de_Mantes-Station","Gare_de_Mantes-la-Jolie","Gare_de_Sannois","Gare_d'Achères-Ville","Gare_d'Éragny-Neuville","Gare_de_Saint-Ouen-l'Aumône-Église","Gare_de_Les Vallées","Gare_de_La Garenne-Colombes","Gare_de_Houilles-Carrières-sur-Seine","Gare_de_Sartrouville","Gare_de_Maisons-Laffitte","Gare_d'Achères-Grand-Cormier","Gare_de_Poissy","Gare_de_Villennes-sur-Seine","Gare_de_Vernouillet-Verneuil","Gare_de_Les Clairières-de-Verneuil","Gare_de_Les Mureaux","Gare_d'Aubergenville-Élisabethville","Gare_d'Épône-Mézières","Gare_de_Rosny-sur-Seine","Gare_de_Bonnières","Gare_de_Vernon-Giverny","Gare_de_Gaillon-Aubevoye","Gare_de_Saint-Pierre-du-Vauvray","Gare_de_Val-de-Reuil","Gare_de_Pont-de-l'Arche","Gare_d'Oissel","Gare_de_Saint-Étienne-du-Rouvray","Gare_de_Sotteville","Gare_de_Rouen-Rive-Droite","Gare_de_Maromme","Gare_de_Malaunay-Le Houlme","Gare_de_Barentin-Embranchement","Gare_de_Pavilly-Station","Gare_de_Motteville","Gare_d'Yvetot","Gare_de_Foucart-Alvimare","Gare_de_Bolbec-Nointot","Gare_de_Bréauté-Beuzeville","Gare_de_Virville-Manneville","Gare_d'Étainhus-Saint-Romain","Gare_de_Saint-Laurent-Gainneville","Gare_de_Harfleur","Gare_de_Le Havre-Graville","Gare_de_Le Havre","Gare_de_Montville","Gare_de_Clères","Gare_de_Saint-Victor","Gare_d'Auffay","Gare_de_Longueville-sur-Scie","Gare_de_Saint-Aubin-sur-Scie","Gare_de_Dieppe","Gare_de_Fécamp","Gare_de_Les Loges-Vaucottes-sur-Mer","Gare_d'Étretat","Gare_de_Harfleur-Halte","Gare_de_Jacques-Monod-La Demi-Lieue","Gare_de_Montivilliers","Gare_d'Épouville","Gare_de_Rolleville","Gare_de_Bréval","Gare_de_Bueil","Gare_d'Évreux-Embranchement","Gare_de_La Bonneville-sur-Iton","Gare_de_Conches","Gare_de_Romilly-la-Puthenaye","Gare_de_Beaumont-le-Roger","Gare_de_Serquigny","Gare_de_Bernay","Gare_de_Lisieux","Gare_de_Mézidon","Gare_de_Moult-Argences","Gare_de_Frénouville-Cagny","Gare_de_Caen","Gare_de_Bretteville-Norrey","Gare_d'Audrieu","Gare_de_Bayeux","Gare_de_Le Molay-Littry","Gare_de_Lison","Gare_de_Carentan","Gare_de_Valognes","Gare_de_Cherbourg","Gare_de_Brionne","Gare_de_Glos-Montfort","Gare_de_Bourgtheroulde-Thuit-Hébert","Gare_d'Elbeuf-Saint-Aubin","Gare_de_Tourville","Gare_de_Dives-Cabourg","Gare_de_Dives-sur-Mer-Port-Guillaume","Gare_de_Houlgate","Gare_de_Villers-sur-Mer","Gare_de_Blonville-sur-Mer-Benerville","Gare_de_Trouville-Deauville","Gare_de_Le Grand-Jardin","Gare_de_Pont-l'Évêque","Gare_de_Saint-Cyr","Gare_de_Fontenay-le-Fleury","Gare_de_Villepreux-les-Clayes","Gare_de_Plaisir-Les Clayes","Gare_de_Plaisir-Grignon","Gare_de_Villiers-Neauphle-Pontchartrain","Gare_de_Montfort-l'Amaury-Méré","Gare_de_Garancières-la-Queue","Gare_d'Orgérus-Béhoust","Gare_de_Tacoignières-Richebourg","Gare_de_Houdan","Gare_de_Marchezais-Broué","Gare_de_Dreux","Gare_de_Saint-Germain - Saint-Rémy","Gare_de_Nonancourt","Gare_de_Tillières","Gare_de_Verneuil-sur-Avre","Gare_de_Bourth","Gare_de_L'Aigle","Gare_de_Rai-Aube","Gare_de_Sainte-Gauburge","Gare_de_Le Merlerault","Gare_de_Nonant-le-Pin","Gare_de_Surdon","Gare_de_Saint-Quentin-en-Yvelines","Gare_de_Beynes","Gare_de_Mareil-sur-Mauldre","Gare_de_Maule","Gare_de_Nézel-Aulnay","Gare_d'Écouché","Gare_de_Briouze","Gare_de_Flers","Gare_de_Vire","Gare_de_Saint-Sever","Gare_de_Villedieu-les-Poêles","Gare_de_Folligny","Gare_de_Granville","Gare_de_Chartres","Gare_de_Saint-Lô","Gare_de_Pont-Hébert","Gare_de_Carantilly-Marigny","Gare_de_Coutances","Gare_d'Avranches","Gare_de_Pontorson-Mont-Saint-Michel","Gare_de_Dol-de-Bretagne","Gare_de_Plerguer","Gare_de_Miniac","Gare_de_Pleudihen","Gare_de_La Hisse","Gare_de_Dinan","Gare_de_Corseul-Languenan","Gare_de_Plancoët","Gare_de_Landébia","Gare_de_Lamballe","Gare_de_Paris-Montparnasse","Gare_de_Paris-Montparnasse-Pasteur","Gare_de_Paris-Vaugirard","Gare_de_Vanves-Malakoff","Gare_de_Clamart","Gare_de_Meudon","Gare_de_Bellevue","Gare_de_Sèvres-Rive-Gauche","Gare_de_Chaville-Rive-Gauche","Gare_de_Viroflay-Rive-Gauche","Gare_de_Versailles-Chantiers","Gare_de_Trappes-Voyageurs","Gare_de_La Verrière","Gare_de_Coignières","Gare_de_Les Essarts-le-Roi","Gare_de_Le Perray","Gare_de_Rambouillet","Gare_de_Gazeran","Gare_d'Épernon","Gare_de_Maintenon","Gare_de_Saint-Piat","Gare_de_Jouy","Gare_de_La Villette-Saint-Prest","Gare_d'Amilly-Ouerray","Gare_de_Saint-Aubin-Saint-Luperce","Gare_de_Courville-sur-Eure","Gare_de_Pontgouin","Gare_de_La Loupe","Gare_de_Bretoncelles","Gare_de_Condé-sur-Huisne","Gare_de_Nogent-le-Rotrou","Gare_de_Le Theil-La Rouge","Gare_de_La Ferté-Bernard","Gare_de_Sceaux-Boësse","Gare_de_Connerré-Beillé","Gare_de_Montfort-le-Gesnois","Gare_de_Saint-Mars-la-Brière","Gare_de_Champagné","Gare_de_Le Mans","Gare_de_Domfront","Gare_de_Conlie","Gare_de_Crissé","Gare_de_Sillé-le-Guillaume","Gare_de_Rouessé-Vassé","Gare_de_Voutré","Gare_d'Évron","Gare_de_Neau","Gare_de_Montsûrs","Gare_de_Louverné","Gare_de_Laval","Gare_de_Le Genest","Gare_de_Port-Brillet","Gare_de_Saint-Pierre-la-Cour","Gare_de_Vitré","Gare_de_Les Lacs","Gare_de_Châteaubourg","Gare_de_Servon","Gare_de_Noyal-Acigné","Gare_de_Cesson-Sévigné-Halte","Gare_de_Rennes","Gare_de_L'Hermitage-Mordelles","Gare_de_Breteil","Gare_de_Montfort-sur-Meu","Gare_de_Montauban-de-Bretagne","Gare_de_La Brohinière","Gare_de_Quédillac","Gare_de_Caulnes","Gare_de_Broons","Gare_de_Plénée-Jugon","Gare_de_Plestan","Gare_d'Yffiniac","Gare_de_Saint-Brieuc","Gare_de_La Méaugon","Gare_de_Plouvara-Plerneuf","Gare_de_Châtelaudren-Plouagat","Gare_de_Guingamp","Gare_de_Belle-Isle-Bégard","Gare_de_Plouaret-Trégor","Gare_de_Plounérin","Gare_de_Plouigneau","Gare_de_Morlaix","Gare_de_Pleyber-Christ","Gare_de_Saint-Thégonnec","Gare_de_Guimiliau","Gare_de_Landivisiau","Gare_de_La Roche-Maurice","Gare_de_Landerneau","Gare_de_La Forest","Gare_de_Kerhuon","Gare_de_Brest","Gare_de_Neuville-sur-Sarthe","Gare_de_La Guierche","Gare_de_Montbizot","Gare_de_Teillé","Gare_de_Vivoin-Beaumont","Gare_de_La Hutte-Coulombiers","Gare_d'Alençon","Gare_de_Sées","Gare_d'Argentan","Gare_de_Couliboeuf","Gare_de_Saint-Pierre-sur-Dives","Gare_de_Massy-TGV","Gare_de_Vendôme-Villiers-sur-Loir_TGV","Gare_de_Monts","Gare_de_Pontchaillou","Gare_de_Betton","Gare_de_Chevaigné","Gare_de_Saint-Germain-sur-Ille","Gare_de_Saint-Médard-sur-Ille","Gare_de_Montreuil-sur-Ille","Gare_de_Dingé","Gare_de_Combourg","Gare_de_Bonnemain","Gare_de_La Fresnais","Gare_de_La Gouesnière-Cancale","Gare_de_Saint-Malo","Gare_de_Lannion","Gare_de_Saint-Pol-de-Léon","Gare_de_Roscoff","Gare_de_Voivres","Gare_de_La Suze","Gare_de_Noyen","Gare_de_Sablé","Gare_de_Morannes","Gare_d'Étriché-Châteauneuf","Gare_de_Tiercé","Gare_de_Le Vieux-Briollay","Gare_d'Écouflant","Gare_d'Angers-Maître-École","Gare_de_Châteaubriant","Gare_de_Messac-Guipry","Gare_de_Massérac","Gare_de_Martigné-Ferchaud","Gare_de_Retiers","Gare_de_Le Theil-de-Bretagne","Gare_de_Janzé","Gare_de_Corps-Nuds","Gare_de_Saint-Armel (Ille-et-Vilaine)","Gare_de_Vern","Gare_de_La Poterie","Gare_de_Saint-Jacques-de-la-Lande","Gare_de_Ker-Lann-Bruz","Gare_de_Bruz","Gare_de_Laillé","Gare_de_Guichen-Bourg-des-Comptes","Gare_de_Saint-Senoux-Pléchâtel","Gare_de_Pléchâtel","Gare_de_Fougeray-Langon","Gare_de_Beslé","Gare_de_Savenay","Gare_de_Pontchâteau","Gare_de_Drefféac","Gare_de_Saint-Gildas-des-Bois","Gare_de_Sévérac","Gare_de_Redon","Gare_de_Malansac","Gare_de_Questembert","Gare_de_Vannes","Gare_de_Sainte-Anne","Gare_d'Auray","Gare_de_Landaul - Mendon","Gare_de_Landévant","Gare_de_Brandérion","Gare_de_Hennebont","Gare_de_Lorient","Gare_de_Gestel","Gare_de_Quimperlé","Gare_de_Bannalec","Gare_de_Rosporden","Gare_de_Quimper","Gare_de_Châteaulin-Embranchement","Gare_de_Pont-de-Buis-lès-Quimerc'h","Gare_de_Dirinon - Loperhet","Gare_de_Belz-Ploemel","Gare_de_Plouharnel-Carnac","Gare_de_Les Sables-Blancs","Gare_de_Penthièvre","Gare_de_L'Isthme","Gare_de_Kerhostin","Gare_de_Saint-Pierre-Quiberon","Gare_de_Quiberon","Gare_de_Carhaix","Gare_de_Moustéru","Gare_de_Coat-Guégan","Gare_de_Pont-Melvez","Gare_de_Plougonver","Gare_de_Les Mais","Gare_de_Callac","Gare_de_Le Pénity","Gare_de_Carnoët - Locarn","Gare_de_Gourland","Gare_de_Trégonneau-Squiffiec","Gare_de_Brélidy-Plouëc","Gare_de_Pontrieux-Halte","Gare_de_Pontrieux","Gare_de_Frynaudour","Gare_de_Traou-Nez","Gare_de_Lancerf","Gare_de_Paimpol","Gare_de_Lucé","Gare_de_La Taye","Gare_de_Bailleau-le-Pin","Gare_de_Magny-Blandainville","Gare_d'Illiers-Combray","Gare_de_Brou","Gare_d'Arrou","Gare_de_Courtalain-Saint-Pellerin","Gare_de_Château-du-Loir","Gare_de_Saumur-Rive-Droite","Gare_de_Montreuil-Bellay","Gare_de_Thouars","Gare_de_Fors","Gare_de_Marigny","Gare_de_Beauvoir-sur-Niort","Gare_de_Prissé-la-Charrière","Gare_de_Villeneuve-la-Comtesse","Gare_de_Loulay","Gare_de_Saint-Jean-d'Angély","Gare_de_Saint-Hilaire-Brizambourg","Gare_de_Saintes","Gare_de_Beillant","Gare_de_Pons","Gare_de_Clion-sur-Seugne","Gare_de_Jonzac","Gare_de_Fontaines-d'Ozillac","Gare_de_Montendre","Gare_de_Bussac","Gare_de_Saint-Mariens - Saint-Yzan","Gare_de_Cavignac","Gare_de_Gauriaguet","Gare_d'Aubie-Saint-Antoine","Gare_de_Saint-André-de-Cubzac","Gare_de_Cubzac-les-Ponts","Gare_de_La Grave-d'Ambarès-Gare-Inférieure","Gare_de_Sainte-Eulalie-Carbon-Blanc","Gare_de_Cenon","Gare_de_Bordeaux-Benauge","Gare_de_Bordeaux-Saint-Jean","Gare_de_Tours","Gare_de_Saint-Genouph","Gare_de_Savonnières","Gare_de_Cinq-Mars","Gare_de_Langeais","Gare_de_Saint-Patrice","Gare_de_La Chapelle-sur-Loire","Gare_de_Port-Boulet","Gare_de_Les Rosiers-sur-Loire","Gare_de_La Ménitré","Gare_de_Saint-Mathurin","Gare_de_La Bohalle","Gare_de_Trélazé","Gare_d'Angers-Saint-Laud","Gare_de_Savennières-Béhuard","Gare_de_La Possonnière","Gare_de_Champtocé-sur-Loire","Gare_d'Ingrandes-sur-Loire","Gare_de_Varades-Saint-Florent-le-Vieil","Gare_d'Ancenis","Gare_d'Oudon","Gare_de_Le Cellier","Gare_de_Mauves-sur-Loire","Gare_de_Thouaré","Gare_de_Nantes","Gare_de_Chantenay","Gare_de_La Basse-Indre-Saint-Herblain","Gare_de_Couëron","Gare_de_Saint-Étienne-de-Montluc","Gare_de_Cordemais","Gare_de_Donges","Gare_de_Montoir-de-Bretagne","Gare_de_La Croix-de-Méan","Gare_de_Penhoët","Gare_de_Saint-Nazaire","Gare_de_Pornichet","Gare_de_La Baule-les-Pins","Gare_de_La Baule-Escoublac","Gare_de_Le Pouliguen","Gare_de_Batz-sur-Mer","Gare_de_Le Croisic","Gare_de_Haluchère-Batignolles","Gare_de_Babinière","Gare_d'Erdre-Active","Gare_de_La Chapelle-sur-Erdre","Gare_de_La Chapelle-Aulnay","Gare_de_Sucé-sur-Erdre","Gare_de_Nort-sur-Erdre","Gare_d'Abbaretz","Gare_d'Issé","Gare_de_Châteaubriant Tram-Train","Gare_de_Chalonnes","Gare_de_Chemillé","Gare_de_Cholet","Gare_de_Bressuire","Gare_de_Les Sables-d'Olonne","Gare_d'Olonne-sur-Mer","Gare_de_La Mothe-Achard","Gare_de_La Roche-sur-Yon","Gare_de_La Chaize-le-Vicomte","Gare_de_Fougeré","Gare_de_Bournezeau","Gare_de_Chantonnay","Gare_de_Pouzauges","Gare_de_Cerizay","Gare_de_Chinon","Gare_de_Rivarennes-Quinçay","Gare_d'Azay-le-Rideau","Gare_de_Druye","Gare_de_Ballan","Gare_de_Joué-lès-Tours","Gare_de_Clisson","Gare_de_Cugand-la-Bernardière","Gare_de_Boussay-La Bruffière","Gare_de_Torfou","Gare_de_Pas-Enchantés","Gare_de_Frêne-Rond","Gare_de_Vertou","Gare_de_La Haie-Fouassière","Gare_de_Le Pallet","Gare_de_Gorges","Gare_de_Montaigu-Vendée","Gare_de_L'Herbergement-Les Brouzils","Gare_de_Belleville-Vendée","Gare_de_Luçon","Gare_de_La Rochelle-Ville","Gare_d'Aytré-Plage","Gare_d'Angoulins-sur-Mer","Gare_de_Châtelaillon","Gare_de_Saint-Laurent-de-la-Prée","Gare_de_Rochefort","Gare_de_Tonnay-Charente","Gare_de_Bords","Gare_de_Saint-Savinien-sur-Charente","Gare_de_Taillebourg","Gare_de_Rezé-Pont-Rousseau","Gare_de_Bouaye","Gare_de_Port-Saint-Père - Saint-Mars","Gare_de_Sainte-Pazanne","Gare_de_Machecoul","Gare_de_Challans","Gare_de_Saint-Hilaire-de-Riez","Gare_de_Saint-Gilles-Croix-de-Vie","Gare_de_Saint-Hilaire-de-Chaléons","Gare_de_Bourgneuf-en-Retz","Gare_de_Les Moutiers-en-Retz","Gare_de_La Bernerie","Gare_de_Pornic","Gare_de_Lusignan","Gare_de_Rouillé","Gare_de_Pamproux","Gare_de_La Mothe-Saint-Héray","Gare_de_Saint-Maixent (Deux-Sèvres)","Gare_de_La Crèche","Gare_de_Prin-Deyrançon","Gare_de_Mauzé","Gare_de_Surgères","Gare_d'Aigrefeuille-Le Thou","Gare_de_La Jarrie","Gare_de_La Rochelle-Porte-Dauphine","Gare_de_Saujon","Gare_de_Royan","Gare_d'Auneau","Gare_de_Brétigny","Gare_de_La Norville-Saint-Germain-lès-Arpajon","Gare_d'Arpajon","Gare_d'Égly","Gare_de_Breuillet-Bruyères-le-Châtel","Gare_de_Breuillet-Village","Gare_de_Saint-Chéron","Gare_de_Sermaise","Gare_de_Dourdan","Gare_de_Dourdan-la-Forêt","Gare_de_Voves","Gare_de_Bonneval","Gare_de_Châteaudun","Gare_de_Cloyes","Gare_de_Fréteval-Morée","Gare_de_Pezou","Gare_de_Vendôme","Gare_de_Saint-Amand-de-Vendôme","Gare_de_Château-Renault","Gare_de_Monnaie","Gare_de_Notre-Dame-d'Oé","Gare_de_La Membrolle-sur-Choisille","Gare_de_Paris-Luxembourg","Gare_de_Denfert-Rochereau","Gare_de_Cité-Universitaire","Gare_de_Gentilly","Gare_d'Arcueil-Cachan","Gare_de_Bagneux","Gare_de_Bourg-la-Reine","Gare_d'Antony","Gare_de_Massy-Verrières","Gare_de_Massy-Palaiseau","Gare_de_Palaiseau","Gare_de_Palaiseau - Villebon","Gare_de_Lozère","Gare_de_Le Guichet","Gare_d'Orsay-Ville","Gare_de_Bures-sur-Yvette","Gare_de_La Hacquinière","Gare_de_Gif-sur-Yvette","Gare_de_Courcelles-sur-Yvette","Gare_de_Saint-Rémy-les-Chevreuses","Gare_de_Toury","Gare_de_Saint-Antoine-du-Rocher","Gare_de_Neuillé-Pont-Pierre","Gare_de_Saint-Paterne","Gare_de_Vaas","Gare_d'Aubigné-Racan","Gare_de_Mayet","Gare_d'Écommoy","Gare_de_Laigné-Saint-Gervais","Gare_d'Arnage","Gare_de_Les Aubrais-Orléans","Gare_d'Orléans","Gare_de_Paris-Austerlitz","Gare_de_Bibliothèque-François-Mitterrand","Gare_d'Ivry-sur-Seine","Gare_de_Vitry-sur-Seine","Gare_de_Les Ardoines","Gare_de_Choisy-le-Roi","Gare_de_Villeneuve-le-Roi","Gare_d'Ablon","Gare_d'Athis-Mons","Gare_de_Juvisy","Gare_de_Savigny-sur-Orge","Gare_d'Épinay-sur-Orge","Gare_de_Sainte-Geneviève-des-Bois","Gare_de_Saint-Michel-sur-Orge","Gare_de_Marolles-en-Hurepoix","Gare_de_Bouray","Gare_de_Lardy","Gare_de_Chamarande","Gare_d'Étréchy","Gare_d'Étampes","Gare_de_Guillerval","Gare_de_Monnerville","Gare_d'Angerville","Gare_de_Boisseaux","Gare_de_Château-Gaillard","Gare_d'Artenay","Gare_de_Chevilly","Gare_de_Cercottes","Gare_de_La Chapelle-Saint-Mesmin","Gare_de_Chaingy","Gare_de_Saint-Ay","Gare_de_Meung-sur-Loire","Gare_de_Baule","Gare_de_Beaugency","Gare_de_Mer","Gare_de_Suèvres","Gare_de_Menars","Gare_de_La Chaussée-Saint-Victor","Gare_de_Blois","Gare_de_Chouzy","Gare_d'Onzain","Gare_de_Veuves-Monteaux","Gare_de_Limeray","Gare_d'Amboise","Gare_de_Noizay","Gare_de_Montlouis","Gare_de_Saint-Pierre-des-Corps","Gare_de_Villeperdue","Gare_de_Sainte-Maure-Noyant","Gare_de_Maillé","Gare_de_Port-de-Piles","Gare_de_Les Ormes-sur-Vienne","Gare_de_Dangé","Gare_d'Ingrandes-sur-Vienne","Gare_de_Châtellerault","Gare_de_Nerpuy","Gare_de_Naintré-les-Barres","Gare_de_La Tricherie","Gare_de_Dissay","Gare_de_Jaunay-Clan","Gare_de_Futuroscope","Gare_de_Chasseneuil (Vienne)","Gare_de_Poitiers","Gare_de_Ligugé","Gare_d'Iteuil","Gare_de_Vivonne","Gare_d'Anché-Voulon","Gare_d'Épanvilliers","Gare_de_Saint-Saviol","Gare_de_Ruffec","Gare_de_Luxé","Gare_d'Angoulême","Gare_de_Montmoreau","Gare_de_Chalais","Gare_de_Saint-Aigulin - La Roche-Chalais","Gare_de_Les Églisottes","Gare_de_Coutras","Gare_de_Saint-Denis-de-Pile","Gare_de_Libourne","Gare_de_Vayres","Gare_de_Saint-Sulpice-Izon","Gare_de_Saint-Loubès","Gare_de_La Gorp","Gare_de_Bassens","Gare_de_Cognac","Gare_de_Jarnac","Gare_de_Châteauneuf-sur-Charente","Gare_de_Bassens-Sabarèges","Gare_de_Bruges","Gare_de_Blanquefort","Gare_de_Parempuyre","Gare_de_Ludon","Gare_de_Macau","Gare_de_Margaux","Gare_de_Moulis-Listrac","Gare_de_Pauillac","Gare_de_Lesparre","Gare_de_Soulac-sur-Mer","Gare_de_Le Verdon","Gare_de_La Pointe-de-Grave","Gare_d'Arlac","Gare_de_Caudéran-Mérignac","Gare_de_Parempuyre (ZI)","Gare_de_Saint-Cyr-en-Val","Gare_de_La Ferté-Saint-Aubin","Gare_de_Lamotte-Beuvron","Gare_de_Nouan-le-Fuzelier","Gare_de_Salbris","Gare_de_Theillay","Gare_de_Vierzon-Ville","Gare_de_Vierzon-Forges","Gare_de_Reuilly","Gare_de_Sainte-Lizaigne","Gare_d'Issoudun","Gare_de_Neuvy-Pailloux","Gare_de_Châteauroux","Gare_de_Luant","Gare_de_Lothiers","Gare_de_Chabenet","Gare_d'Argenton-sur-Creuse","Gare_d'Éguzon","Gare_de_Saint-Sébastien","Gare_de_La Souterraine","Gare_de_Fromental","Gare_de_Bersac","Gare_de_Saint-Sulpice-Laurière","Gare_de_La Jonchère","Gare_d'Ambazac","Gare_de_Les Bardys","Gare_de_Limoges-Bénédictins","Gare_de_Solignac-Le Vigen","Gare_de_Pierre-Buffière","Gare_de_Magnac-Vicq","Gare_de_Saint-Germain-les-Belles","Gare_de_La Porcherie","Gare_de_Masseret","Gare_d'Uzerche","Gare_de_Vigeois","Gare_d'Allassac","Gare_de_Brive-la-Gaillarde","Gare_de_Gignac-Cressensac","Gare_de_Souillac","Gare_de_Gourdon","Gare_de_Dégagnac","Gare_de_Cahors","Gare_de_Lalbenque-Fontanes","Gare_de_Caussade","Gare_d'Albias","Gare_de_Fonneuve","Gare_de_Montauban-Ville-Bourbon","Gare_de_Mennetou-sur-Cher","Gare_de_Villefranche-sur-Cher","Gare_de_Gièvres","Gare_de_Selles-sur-Cher","Gare_de_Saint-Aignan-Noyers","Gare_de_Thésée","Gare_de_Montrichard","Gare_de_Chissay-en-Touraine","Gare_de_Chenonceaux-Chisseaux","Gare_de_Bléré-la-Croix","Gare_de_Saint-Martin-le-Beau","Gare_d'Azay-sur-Cher","Gare_de_Veretz-Montlouis","Gare_de_La Douzillère","Gare_de_Montbazon","Gare_de_Veigné","Gare_d'Esvres","Gare_de_Cormery","Gare_de_Courçay-Tauxigny","Gare_de_Reignac","Gare_de_Chambourg","Gare_de_Loches","Gare_de_La Ferté-Imbault","Gare_de_Selles-Saint-Denis","Gare_de_Loreux","Gare_de_Villeherviers","Gare_de_Faubourg-d'Orléans","Gare_de_Romorantin-Blanc-Argent","Gare_de_Les Quatre-Roues","Gare_de_Pruniers","Gare_de_Chabris","Gare_de_Varennes-sur-Fouzon","Gare_de_Mignaloux-Nouaillé","Gare_de_Montmorillon","Gare_de_Lussac-les-Châteaux","Gare_de_Lathus","Gare_de_Le Dorat","Gare_de_Bellac","Gare_de_Vaulry","Gare_de_Nantiat","Gare_de_Peyrilhac-Saint-Jouvent","Gare_de_Nieul","Gare_de_Roumazières-Loubert","Gare_de_Limoges-Montjovis","Gare_d'Aixe-sur-Vienne","Gare_de_Verneuil-sur-Vienne","Gare_de_Saint-Victurnien","Gare_de_Saint-Brice-sur-Vienne","Gare_de_Saint-Junien","Gare_de_Saillat-Chassenon","Gare_de_Chabanais","Gare_d'Exideuil-sur-Vienne","Gare_de_Chasseneuil-sur-Bonnieure","Gare_de_La Rochefoucauld","Gare_de_Ruelle","Gare_de_L'Aiguille","Gare_de_Nexon","Gare_de_Lafarge","Gare_de_Bussière-Galant","Gare_de_La Coquille","Gare_de_Thiviers","Gare_de_Les Grandes-Bruges","Gare_de_Négrondes","Gare_d'Agonac","Gare_de_Château-l'Évêque","Gare_de_La Meyze","Gare_de_Saint-Yrieix","Gare_de_Coussac-Bonneval","Gare_de_Lubersac","Gare_de_Pompadour","Gare_de_Vignols-Saint-Solve","Gare_d'Objat","Gare_de_Saint-Aulaire","Gare_de_Le Burg","Gare_de_Varetz","Gare_de_Mussidan","Gare_de_Bergerac","Gare_de_Marmande","Gare_de_La Cave","Gare_de_Saint-Médard-de-Guizières","Gare_de_Saint-Seurin-sur-l'Isle","Gare_de_Montpon-Ménestérol","Gare_de_Douzillac","Gare_de_Neuvic","Gare_de_Saint-Léon-sur-l'Isle","Gare_de_Saint-Astier","Gare_de_Razac","Gare_de_Périgueux","Gare_de_Périgueux-Saint-Georges","Gare_de_Boulazac","Gare_de_Niversac","Gare_de_Saint-Pierre-de-Chignac","Gare_de_Milhac-d'Auberoche","Gare_de_Limeyrat","Gare_de_Thenon","Gare_de_La Bachellerie","Gare_de_Condat - Le Lardin","Gare_de_Terrasson-Lavilledieu","Gare_de_La Rivière-de-Mansac","Gare_de_Larche","Gare_d'Aubazine-Saint-Hilaire","Gare_de_Cornil","Gare_de_Sarlat","Gare_de_Siorac-en-Périgord","Gare_de_Saint-Cyprien-en-Dordogne","Gare_de_Saint-Émilion","Gare_de_Castillon","Gare_de_Lamothe-Montravel","Gare_de_Vélines","Gare_de_Saint-Antoine-de-Breuilh","Gare_de_Sainte-Foy-la-Grande","Gare_de_Gardonne","Gare_de_Lamonzie-Saint-Martin","Gare_de_Couze","Gare_de_Lalinde","Gare_de_Mauzac","Gare_de_Trémolat","Gare_de_Le Buisson","Gare_de_Les Versannes","Gare_de_Mauzens-Miremont","Gare_de_Les Eyzies","Gare_de_Le Bugue","Gare_de_Belvès","Gare_de_Villefranche-du-Périgord","Gare_de_Sauveterre-la-Lémance","Gare_de_Monsempron-Libos","Gare_de_Trentels-Ladignac","Gare_de_Penne","Gare_de_Laroque","Gare_de_Pont-du-Casse","Gare_de_Fumel","Gare_de_Tonneins","Gare_de_Bègles","Gare_de_Villenave-d'Ornon","Gare_de_Cadaujac","Gare_de_Saint-Médard-d'Eyrans","Gare_de_Beautiran","Gare_de_Portets","Gare_d'Arbanats","Gare_de_Podensac","Gare_de_Cérons","Gare_de_Barsac","Gare_de_Preignac","Gare_de_Langon","Gare_de_Saint-Macaire","Gare_de_Saint-Pierre-d'Aurillac","Gare_de_Caudrot","Gare_de_Gironde","Gare_de_La Réole","Gare_de_Lamothe-Landerron","Gare_de_Sainte-Bazeille","Gare_d'Aiguillon","Gare_de_Port-Sainte-Marie","Gare_d'Agen","Gare_de_Lamagistère","Gare_de_Golfech","Gare_de_Valence-d'Agen","Gare_de_Pommevic","Gare_de_Malause","Gare_de_Moissac","Gare_de_Castelsarrasin","Gare_de_Lavilledieu","Gare_de_Montbartier","Gare_de_Dieupentale","Gare_de_Grisolles","Gare_de_Castelnau-d'Estrétefonds","Gare_de_Saint-Jory","Gare_de_Fenouillet-Saint-Alban","Gare_de_Lacourtensourt","Gare_de_Lalande-Église","Gare_de_Route-de-Launaguet","Gare_de_Toulouse-Matabiau","Gare_de_Montaudran","Gare_de_Labège-Innopole","Gare_de_Labège-Village","Gare_d'Escalquens","Gare_de_Montlaur","Gare_de_Baziège","Gare_de_Villenouvelle","Gare_de_Villefranche-de-Lauragais","Gare_d'Avignonet","Gare_de_Castelnaudary","Gare_de_Bram","Gare_de_Carcassonne","Gare_de_Lézignan-Corbières","Gare_de_Narbonne","Gare_de_Coursan","Gare_de_Béziers","Gare_de_Vias","Gare_d'Agde","Gare_de_Marseillan-Plage","Gare_de_Sète","Gare_d'Auch","Gare_de_Galliéni-Cancéropole","Gare_de_Saint-Cyprien-Arènes","Gare_de_Le Toec","Gare_de_Lardenne","Gare_de_Saint-Martin-du-Touch","Gare_de_Les Ramassiers","Gare_de_Colomiers","Gare_de_Colomiers-Lycée-International","Gare_de_Pibrac","Gare_de_Brax-Léguevin","Gare_de_Mérenvielle","Gare_de_L'Isle-Jourdain (Gers)","Gare_de_Gimont-Cahuzac","Gare_d'Aubiet","Gare_de_Toulouse-Saint-Agne","Gare_de_Portet-Saint-Simon","Gare_de_Muret","Gare_de_Fauga","Gare_de_Longages-Noé","Gare_de_Carbonne","Gare_de_Cazères-sur-Garonne","Gare_de_Martres-Tolosane","Gare_de_Boussens","Gare_de_Saint-Martory","Gare_de_Lestelle","Gare_de_Labarthe-Inard","Gare_de_Saint-Gaudens","Gare_de_Montréjeau-Gourdan-Polignan","Gare_de_Lannemezan","Gare_de_Capvern","Gare_de_Tournay","Gare_de_Tarbes","Gare_d'Ossun","Gare_de_Lourdes","Gare_de_Saint-Pé-de-Bigorre","Gare_de_Montaut-Bétharram","Gare_de_Coarraze-Nay","Gare_d'Assat","Gare_de_Pau","Gare_d'Artix","Gare_d'Orthez","Gare_de_Puyoô","Gare_de_Peyrehorade","Gare_d'Urt","Gare_de_Morcenx","Gare_d'Arengosse","Gare_d'Ygos","Gare_de_Saint-Martin-d'Oney","Gare_de_Mont-de-Marsan","Gare_de_Pessac","Gare_d'Alouette-France","Gare_de_Gazinet-Cestas","Gare_de_Marcheprime","Gare_de_Facture-Biganos","Gare_de_Lamothe","Gare_d'Ychoux","Gare_de_Labouheyre","Gare_de_Dax","Gare_de_Saubusse-les-Bains","Gare_de_Saint-Geours-de-Maremne","Gare_de_Saint-Vincent-de-Tyrosse","Gare_de_Bénesse-Maremne","Gare_de_Labenne","Gare_d'Ondres","Gare_de_Le Boucau","Gare_de_Bayonne","Gare_de_Biarritz-la-Négresse","Gare_de_Guéthary","Gare_de_Saint-Jean-de-Luz-Ciboure","Gare_de_Les Deux Jumeaux","Gare_de_Hendaye","Gare_d'Irun","Gare_de_Le Teich","Gare_de_Gujan-Mestras","Gare_de_La Hume","Gare_de_La Teste","Gare_d'Arcachon","Gare_de_Villefranque","Gare_d'Ustaritz","Gare_de_Jatxou","Gare_de_Halsou-Larressore","Gare_de_Cambo-les-Bains","Gare_d'Itxassou","Gare_de_Louhossoa","Gare_de_Pont-Noblia","Gare_d'Ossès-Saint-Martin-d'Arrossa","Gare_de_Saint-Jean-Pied-de-Port","Gare_de_La Croix-du-Prince","Gare_de_Gan","Gare_de_Buzy-en-Béarn","Gare_d'Ogeu-les-Bains","Gare_d'Oloron-Sainte-Marie","Gare_de_Bidos","Gare_de_Saint-Christau-Lurbe","Gare_de_Sarrance","Gare_de_Bedous","Gare_de_Canfranc-Frontière","Gare_de_Loures-Barbazan","Gare_de_Saléchan-Siradan","Gare_de_Marignac-Saint-Béat","Gare_de_Luchon","Gare_de_Villefranche-Vernet-les-Bains","Gare_de_Serdinya","Gare_de_Joncet","Gare_d'Olette-Canaveilles-les-Bains","Gare_de_Nyers","Gare_de_Thuès-les-Bains","Gare_de_Thuès-Carença","Gare_de_Fontpédrouse-Saint-Thomas-les-Bains","Gare_de_Sauto","Gare_de_Planès","Gare_de_Mont-Louis-La Cabanasse","Gare_de_Bolquère-Eyne","Gare_de_Font-Romeu-Odeillo-Via","Gare_d'Estavar","Gare_de_Saillagouse","Gare_d'Err","Gare_de_Sainte-Léocadie","Gare_d'Osséja","Gare_de_Bourg-Madame","Gare_d'Ur-les-Escaldes","Gare_de_Béna-Fanès","Gare_de_Latour-de-Carol-Enveitg","Gare_de_Foix","Gare_de_Pins-Justaret","Gare_de_Vénerque-le-Vernet","Gare_d'Auterive","Gare_de_Cintegabelle","Gare_de_Saverdun","Gare_de_Vernet-d'Ariège","Gare_de_Pamiers","Gare_de_Varilhes","Gare_de_Saint-Jean-de-Verges","Gare_de_Tarascon-sur-Ariège","Gare_de_Les Cabannes","Gare_de_Luzenac-Garanou","Gare_d'Ax-les-Thermes","Gare_de_Mérens-les-Vals","Gare_de_L'Hospitalet-près-l'Andorre","Gare_de_Porté-Puymorens","Gare_de_Puigcerdà","Gare_de_Limoux","Gare_de_Carcassonne (Yw)","Gare_de_Couffoulens-Leuc","Gare_de_Verzeille","Gare_de_Pomas","Gare_de_Limoux-Flassian","Gare_d'Alet-les-Bains","Gare_de_Couiza-Montazels","Gare_d'Espéraza","Gare_de_Campagne","Gare_de_Quillan","Gare_de_Rivesaltes","Gare_de_Port-la-Nouvelle","Gare_de_Leucate-la-Franqui","Gare_de_Salses","Gare_de_Perpignan","Gare_d'Elne","Gare_d'Argelès-sur-Mer","Gare_de_Collioure","Gare_de_Port-Vendres-Ville","Gare_de_Banyuls-sur-Mer","Gare_de_Cerbère","Gare_de_Portbou","Gare_de_Le Soler","Gare_de_Saint-Féliu-d'Avall","Gare_de_Millas","Gare_d'Ille-sur-Têt","Gare_de_Vinça","Gare_de_Marquixanes","Gare_de_Prades-Molitg-les-Bains","Gare_de_Ria","Gare_de_La Guerche-sur-l'Aubois","Gare_de_Saint-Martin-d'Étampes","Gare_de_Gien","Gare_de_Saint-Germain-du-Puy","Gare_de_Cosne","Gare_de_Foëcy","Gare_de_Mehun-sur-Yèvre","Gare_de_Marmagne","Gare_de_Bourges","Gare_d'Avord","Gare_de_Bengy","Gare_de_Nérondes","Gare_de_Saincaize","Gare_de_Saint-Florent-sur-Cher","Gare_de_Lunery","Gare_de_Châteauneuf-sur-Cher","Gare_de_Bigny","Gare_de_Saint-Amand-Montrond-Orval","Gare_d'Urçay","Gare_de_Vallon","Gare_de_Magnette","Gare_de_Les Trillers","Gare_de_La Ville-Gozet","Gare_de_Montluçon-Ville","Gare_de_Lavaufranche","Gare_de_Capdenac","Gare_de_Viviez-Decazeville","Gare_d'Aubin","Gare_de_Cransac","Gare_de_Saint-Christophe-Vallon","Gare_de_Rodez","Gare_de_Huriel","Gare_de_Parsac-Gouzon","Gare_de_Busseau-sur-Creuse","Gare_de_Guéret","Gare_de_Montaigut","Gare_de_Vieilleville","Gare_de_Marsac","Gare_de_Montluçon-Rimard","Gare_de_Commentry","Gare_de_Lapeyrouse","Gare_de_Louroux-de-Bouble","Gare_de_Bellenaves","Gare_de_Saint-Bonnet-de-Rochefort","Gare_de_Volvic","Gare_de_Pontgibaud","Gare_de_Le Vauriat","Gare_de_Durtol-Nohanent","Gare_de_Royat-Chamalières","Gare_de_Clermont-La Rotonde","Gare_de_Lavaveix-les-Mines","Gare_d'Aubusson","Gare_de_Felletin","Gare_d'Ussel","Gare_de_Saint-Priest-Taurion","Gare_de_Brignac","Gare_de_Saint-Léonard-de-Noblat","Gare_de_Saint-Denis-des-Murs","Gare_de_Châteauneuf-Bujaleuf","Gare_d'Eymoutiers-Lac-de-Vassivière","Gare_de_La Celle-Corrèze","Gare_de_Bugeat","Gare_de_Pérols","Gare_de_Jassonneix","Gare_de_Meymac","Gare_de_Tulle","Gare_de_Corrèze","Gare_de_Montaignac-Saint-Hippolyte","Gare_d'Égletons","Gare_de_Turenne","Gare_de_Les Quatre-Routes","Gare_de_Saint-Denis-près-Martel","Gare_de_Rocamadour-Padirac","Gare_de_Gramat","Gare_d'Assier","Gare_de_Figeac","Gare_de_Salles-Courbatiès","Gare_de_Villefranche-de-Rouergue","Gare_de_Najac","Gare_de_Laguépie","Gare_de_Lexos","Gare_de_Cordes-Vindrac","Gare_de_Tessonnières","Gare_de_Gaillac","Gare_de_Lisle-sur-Tarn","Gare_de_Rabastens-Couffouleux","Gare_de_Saint-Sulpice","Gare_de_Roquesérière - Buzet","Gare_de_Montastruc-la-Conseillère","Gare_de_Gragnague","Gare_de_Montrabé","Gare_de_Vayrac","Gare_de_Bétaille","Gare_de_Puybrun","Gare_de_Bretenoux-Biars","Gare_de_Laval-de-Cère","Gare_de_Laroquebrou","Gare_de_Bagnac","Gare_de_Maurs","Gare_de_Boisset","Gare_de_Le Rouget","Gare_de_Pers","Gare_de_La Capelle-Viescamp","Gare_d'Ytrac","Gare_d'Aurillac","Gare_de_Vic-sur-Cère","Gare_de_Le Lioran","Gare_de_Murat","Gare_de_Neussargues","Gare_de_Massiac","Gare_d'Arvant","Gare_de_Magalas","Gare_de_Bédarieux","Gare_de_Le Bousquet-d'Orb","Gare_de_Lunas","Gare_de_Les Cabrils","Gare_de_Ceilhes-Roqueredonde","Gare_de_Montpaon","Gare_de_Tournemire-Roquefort","Gare_de_Saint-Rome-de-Cernon","Gare_de_Saint-Georges-de-Luzençon","Gare_de_Millau","Gare_de_Sévérac-le-Château","Gare_de_Campagnac-Saint-Geniez","Gare_de_Banassac-La Canourgue","Gare_de_Le Monastier","Gare_de_Chirac","Gare_de_Marvejols","Gare_d'Aumont-Aubrac","Gare_de_Saint-Chély-d'Apcher","Gare_de_Saint-Flour - Chaudes-Aigues","Gare_de_Les Salelles","Gare_de_Chanac","Gare_de_Le Bruel","Gare_de_Barjac","Gare_de_Balsièges-Bourg","Gare_de_Mende","Gare_de_Bagnols-Chadenet","Gare_d'Allenc","Gare_de_Belvezet","Gare_de_Chasseradès","Gare_de_La Bastide-Saint-Laurent-les-Bains","Gare_de_Laissac","Gare_de_Castres","Gare_d'Albi","Gare_d'Albi-Madeleine","Gare_de_Carmaux","Gare_de_Tanus","Gare_de_Naucelle","Gare_de_Rancillac","Gare_de_Baraqueville - Carcenac-Peyralès","Gare_de_Le Lac","Gare_de_Luc-Primaube","Gare_de_Labruguière","Gare_de_Mazamet","Gare_de_Les Cauquillous","Gare_de_Lavaur","Gare_de_Damiatte-Saint-Paul","Gare_de_Vielmur-sur-Agout","Gare_de_Marssac-sur-Tarn","Gare_de_Vigneux-sur-Seine","Gare_de_Viry-Châtillon","Gare_de_Ris-Orangis","Gare_de_Grand-Bourg","Gare_d'Évry","Gare_de_Corbeil-Essonnes","Gare_de_Moulin-Galant","Gare_de_Mennecy","Gare_de_Ballancourt","Gare_de_La Ferté-Alais","Gare_de_Boutigny","Gare_de_Maisse","Gare_de_Buno-Gironville","Gare_de_Boigneville","Gare_de_Malesherbes","Gare_d'Essonnes-Robinson","Gare_de_Villabé","Gare_de_Le Plessis-Chenet","Gare_de_Coudray-Montceaux","Gare_de_Saint-Fargeau","Gare_de_Ponthierry-Pringy","Gare_de_Boissise-le-Roi","Gare_de_Vosves","Gare_de_Melun","Gare_de_Livry-sur-Seine","Gare_de_Chartrettes","Gare_de_Fontaine-le-Port","Gare_de_Héricy","Gare_de_Vulaines-sur-Seine-Samoreau","Gare_de_Champagne-sur-Seine","Gare_de_Vernou-sur-Seine","Gare_de_La Grande-Paroisse","Gare_de_Montereau","Gare_de_Moret-Veneux-les-Sablons","Gare_de_Montigny-sur-Loing","Gare_de_Bourron-Marlotte","Gare_de_Nemours-Saint-Pierre","Gare_de_Bagneaux-sur-Loing","Gare_de_Souppes-Château-Landon","Gare_de_Dordives","Gare_de_Ferrières-Fontenay","Gare_de_Nogent-sur-Vernisson","Gare_de_Briare","Gare_de_Tracy-Sancerre","Gare_de_Pouilly-sur-Loire","Gare_de_Mesves-Bulcy","Gare_de_La Charité","Gare_de_La Marche","Gare_de_Tronsanges","Gare_de_Pougues-les-Eaux","Gare_de_Garchizy","Gare_de_Fourchambault","Gare_de_Vauzelles","Gare_de_Nevers","Gare_de_Saint-Pierre-le-Moûtier","Gare_de_Chantenay-Saint-Imbert","Gare_de_Villeneuve-sur-Allier","Gare_de_Moulins-sur-Allier","Gare_de_Bessay","Gare_de_Varennes-sur-Allier","Gare_de_Saint-Germain-des-Fossés","Gare_de_Roanne","Gare_de_Le Coteau","Gare_de_Saint-Jodard","Gare_de_Balbigny","Gare_de_Feurs","Gare_de_Montrond-les-Bains","Gare_de_Saint-Galmier-Veauche","Gare_de_Bouthéon","Gare_de_La Fouillouse","Gare_de_Saint-Étienne-La Terrasse","Gare_de_Saint-Étienne-Châteaucreux","Gare_de_Saint-Chamond","Gare_de_Rive-de-Gier","Gare_de_Givors-Ville","Gare_de_Givors-Canal","Gare_de_Le Sablon","Gare_de_Vernaison","Gare_de_Pierre-Bénite","Gare_d'Oullins","Gare_de_Lyon-Perrache-Voyageurs","Gare_de_Le Creusot-Montceau-Montchanin","Gare_de_Mâcon-Loché-TGV","Gare_de_Lyon-Saint-Exupéry-TGV","Gare_de_Valence-TGV","Gare_d'Avignon-TGV","Gare_d'Aix-en-Provence-TGV","Gare_de_Sathonay-Rillieux","Gare_de_Laroche-Migennes","Gare_de_Chemilly-Appoigny","Gare_de_Monéteau - Gurgy","Gare_d'Auxerre-Saint-Gervais","Gare_de_Champs-Saint-Bris","Gare_de_Cravant-Bazarnes","Gare_de_Mailly-la-Ville","Gare_de_Châtel-Censoir","Gare_de_Coulanges-sur-Yonne","Gare_de_Clamecy","Gare_de_Vermenton","Gare_de_Sermizelles-Vézelay","Gare_d'Avallon","Gare_de_Maison-Dieu (Yonne)","Gare_de_Nuits-sous-Ravières","Gare_de_Les Laumes-Alésia","Gare_de_Les Perrières","Gare_de_Nevers-Le Banlay","Gare_d'Imphy","Gare_de_Béard","Gare_de_Decize","Gare_de_Cercy-la-Tour","Gare_de_Luzy","Gare_d'Étang","Gare_de_Mesvres","Gare_de_Broye","Gare_de_Saint-Symphorien-de-Marmagne","Gare_de_Marmagne-sous-Creusot","Gare_de_Le Creusot","Gare_de_Montchanin","Gare_de_Saint-Léger-sur-Dheune","Gare_de_Cheilly-lès-Maranges","Gare_de_Santenay-les-Bains","Gare_de_Chagny","Gare_de_Brion-Laizy","Gare_d'Autun","Gare_de_Flez-Cuzy-Tannay","Gare_de_Corbigny","Gare_de_Gilly-sur-Loire","Gare_de_Saint-Florentin-Vergigny","Gare_de_Paray-le-Monial","Gare_de_Génelard","Gare_de_Ciry-le-Noble","Gare_de_Galuzot","Gare_de_Montceau-les-Mines","Gare_de_Blanzy-Canal","Gare_de_Dompierre-Sept-Fons","Gare_de_Saint-Agnan","Gare_de_Digoin","Gare_de_Mâcon-Ville","Gare_de_La Clayette-Baudemont","Gare_de_Chauffailles","Gare_de_Lamure-sur-Azergues","Gare_de_Chamelet","Gare_de_Bois-d'Oingt-Légny","Gare_de_Chessy","Gare_de_Châtillon-d'Azergues","Gare_de_Lozanne","Gare_de_Civrieux-d'Azergues","Gare_de_Dommartin-Lissieu","Gare_de_Dardilly-le-Jubin","Gare_de_Dardilly-les-Mouilles","Gare_de_Les Flachères","Gare_de_Tassin","Gare_d'Alaï","Gare_de_Francheville","Gare_de_Chaponost","Gare_de_Brignais","Gare_de_Pont-de-Veyle","Gare_de_Lyon-Saint-Paul","Gare_de_Lyon-Gorge-de-Loup","Gare_d'Écully-la-Demi-Lune","Gare_de_Le Méridien","Gare_de_Charbonnières-les-Bains","Gare_de_Casino-Lacroix-Laval","Gare_de_La Tour-de-Salvagny","Gare_de_Lentilly-Charpenay","Gare_de_Lentilly","Gare_de_Fleurieux-sur-l'Arbresle","Gare_de_L'Arbresle","Gare_de_Sain-Bel","Gare_de_Régny","Gare_de_Saint-Victor-Thizy","Gare_d'Amplepuis","Gare_de_Tarare","Gare_de_Pontcharra-Saint-Forgeux","Gare_de_Saint-Romain-de-Popey","Gare_de_Chazay-Marcilly","Gare_d'Aulnat-Aéroport","Gare_de_Pont-du-Château","Gare_de_Vertaizon","Gare_de_Lezoux","Gare_de_Pont-de-Dore","Gare_de_Thiers","Gare_de_Noirétable","Gare_de_Boën","Gare_de_Montbrison","Gare_de_Saint-Romain-le-Puy","Gare_de_Sury-le-Comtal","Gare_de_Bonson","Gare_d'Andrézieux","Gare_de_Vichy","Gare_de_Darsac","Gare_de_Riom-Châtel-Guyon","Gare_de_Gannat","Gare_d'Aigueperse","Gare_d'Aubiat","Gare_de_Pontmort","Gare_de_Gerzat","Gare_de_Clermont-Ferrand","Gare_de_Clermont-La Pardieu","Gare_de_Sarliève-Cournon","Gare_de_Le Cendre-Orcet","Gare_de_Les Martres-de-Veyre","Gare_de_Vic-le-Comte","Gare_de_Parent-Coudes-Champeix","Gare_d'Issoire","Gare_de_Le Breuil-sur-Couze","Gare_de_Brassac-les-Mines-Sainte-Florine","Gare_de_Brioude","Gare_de_Paulhaguet","Gare_de_Saint-Georges-d'Aurac","Gare_de_Langeac","Gare_de_Monistrol-d'Allier","Gare_d'Alleyras","Gare_de_Chapeauroux","Gare_de_Langogne","Gare_de_Luc","Gare_de_Villefort","Gare_de_Génolhac","Gare_de_Chamborigaud","Gare_de_Sainte-Cécile-d'Andorge","Gare_de_La Levade","Gare_de_Grand'Combe-La Pise","Gare_d'Alès","Gare_de_Boucoiran","Gare_de_Nozières-Brignon","Gare_de_Saint-Geniès-de-Malgoirès","Gare_de_Fons-Saint-Mamert","Gare_de_Fraisses-Unieux","Gare_de_Saint-Rambert-d'Albon","Gare_de_Lachaud-Curmilhac","Gare_de_Le Puy-en-Velay","Gare_de_Lavoûte-sur-Loire","Gare_de_Saint-Vincent-le-Château","Gare_de_Vorey","Gare_de_Chamalières-sur-Loire","Gare_de_Retournac","Gare_de_Pont-de-Lignon","Gare_de_Bas-Monistrol","Gare_d'Aurec","Gare_de_Firminy","Gare_de_Le Chambon-Feugerolles","Gare_de_La Ricamarie","Gare_de_Saint-Étienne-Bellevue","Gare_de_Saint-Étienne-Le Clapier","Gare_de_Saint-Étienne-Carnot","Gare_de_Saint-Péray","Gare_de_Le Teil","Gare_de_Tarascon","Gare_de_Beaucaire","Gare_de_Nîmes-Pont-du-Gard","Gare_de_Manduel-Redessan","Gare_de_Nîmes","Gare_de_Saint-Césaire","Gare_de_Milhaud","Gare_d'Uchaud","Gare_de_Vergèze-Codognan","Gare_de_Gallargues","Gare_de_Lunel","Gare_de_Lunel-Viel","Gare_de_Valergues-Lansargues","Gare_de_Baillargues","Gare_de_Saint-Aunès","Gare_de_Montpellier-Saint-Roch","Gare_de_Villeneuve-lès-Maguelone","Gare_de_Vic-Mireval","Gare_de_Frontignan","Gare_de_Générac","Gare_de_Beauvoisin","Gare_de_Vauvert","Gare_de_Le Cailar","Gare_d'Aimargues","Gare_de_Saint-Laurent-d'Aigouze","Gare_d'Aigues-Mortes","Gare_de_Le Grau-du-Roi","Gare_d'Arles","Gare_d'Avignon-Centre","Gare_de_Paris-Gare-de-Lyon","Gare_de_Paris-Bercy","Gare_de_Maisons-Alfort-Alfortville","Gare_de_Le Vert-de-Maisons","Gare_de_Créteil-Pompadour","Gare_de_Villeneuve-Saint-Georges-Triage","Gare_de_Villeneuve-Saint-Georges","Gare_de_Montgeron-Crosne","Gare_d'Yerres","Gare_de_Brunoy","Gare_de_Boussy-Saint-Antoine","Gare_de_Combs-la-Ville-Quincy","Gare_de_LieuSaint-Moissy","Gare_de_Savigny-le-Temple-Nandy","Gare_de_Cesson","Gare_de_Le Mée","Gare_de_Bois-le-Roi","Gare_de_Fontainebleau-Forêt","Gare_de_Fontainebleau-Avon","Gare_de_Thomery","Gare_de_Saint-Mammès","Gare_de_Villeneuve-la-Guyard","Gare_de_Champigny-sur-Yonne","Gare_de_Pont-sur-Yonne","Gare_d'Étigny-Véron","Gare_de_Villeneuve-sur-Yonne","Gare_de_Saint-Julien-du-Sault","Gare_de_Joigny","Gare_de_Tonnerre","Gare_de_Montbard","Gare_de_Thenissey","Gare_de_Verrey","Gare_de_Blaisy-Bas","Gare_de_Baulme-la-Roche","Gare_de_Mâlain","Gare_de_Lantenay","Gare_de_Velars","Gare_de_Dijon-Ville","Gare_de_Gevrey-Chambertin","Gare_de_Vougeot-Gilly-lès-Cîteaux","Gare_de_Nuits-Saint-Georges","Gare_de_Corgoloin","Gare_de_Beaune","Gare_de_Meursault","Gare_de_Rully","Gare_de_Fontaines-Mercurey","Gare_de_Chalon-sur-Saône","Gare_de_Sennecey-le-Grand","Gare_de_Tournus","Gare_de_Fleurville-Pont-de-Vaux","Gare_de_Senozan","Gare_de_Crêches-sur-Saône","Gare_de_Pontanevaux","Gare_de_Romanèche-Thorins","Gare_de_Belleville-sur-Saône","Gare_de_Saint-Georges-de-Reneins","Gare_de_Villefranche-sur-Saône","Gare_d'Anse","Gare_de_Quincieux","Gare_de_Saint-Germain-au-Mont-d'Or","Gare_d'Albigny-Neuville","Gare_de_Couzon-au-Mont-d'Or","Gare_de_Collonges-Fontaines","Gare_de_Lyon-Vaise","Gare_de_Lyon-Jean-Macé","Gare_de_Saint-Fons","Gare_de_Feyzin","Gare_de_Sérézin","Gare_de_Chasse-sur-Rhône","Gare_d'Estressin","Gare_de_Vienne","Gare_de_Saint-Clair-les-Roches","Gare_de_Le Péage-de-Roussillon","Gare_de_Saint-Vallier-sur-Rhône","Gare_de_Tain-l'Hermitage-Tournon","Gare_de_Valence","Gare_de_Livron","Gare_de_Loriol","Gare_de_Montélimar","Gare_de_Donzère","Gare_de_Pierrelatte","Gare_de_Bollène-la-Croisière","Gare_d'Orange","Gare_de_Courthézon","Gare_de_Bédarrides","Gare_de_Sorgues-Châteauneuf-du-Pape","Gare_de_Saint-Martin-de-Crau","Gare_de_Miramas","Gare_de_Saint-Chamas","Gare_de_Rognac","Gare_de_Vitrolles-Aéroport-Marseille-Provence","Gare_de_Pas-des-Lanciers","Gare_de_L'Estaque","Gare_de_Séon-Saint-Henry","Gare_de_Marseille-Saint-Charles","Gare_d'Avignon-Terminal TER","Gare_de_Montpellier (CNM)","Gare_de_Perpignan (bif.LGV)","Gare_de_Tunnel du Perthus (F)","Gare_de_Tunnel du Perthus (E)","Gare_de_Figueras - Vilafant","Gare_d'Is-sur-Tille","Gare_de_Dijon-Porte-Neuve","Gare_de_Ruffey-lès-Echirey","Gare_de_Bretigny-Norges","Gare_de_Saint-Julien-Clénay","Gare_de_Gemeaux","Gare_de_Neuilly-lès-Dijon","Gare_de_Genlis","Gare_de_Collonges (Côte-d'Or)","Gare_de_Villers-les-Pots","Gare_d'Auxonne","Gare_de_Dole-Ville","Gare_de_Montbarrey","Gare_d'Arc-et-Senans","Gare_de_Mouchard","Gare_d'Andelot","Gare_de_Frasne","Gare_de_Labergement-Sainte-Marie","Gare_de_Les Longevilles-Rochejean","Gare_d'Orchamps","Gare_de_Ranchot","Gare_de_Saint-Vit","Gare_de_Dannemarie-Velesmes","Gare_de_Franois","Gare_de_Besançon-Viotte","Gare_de_Roche-lez-Beaupré","Gare_de_Novillars","Gare_de_Deluz","Gare_de_Laissey","Gare_de_Baume-les-Dames","Gare_de_Clerval","Gare_de_L'Isle-sur-le-Doubs","Gare_de_Colombier-Fontaine","Gare_de_Voujeaucourt","Gare_de_Montbéliard","Gare_de_Héricourt","Gare_de_Morvillars","Gare_de_Grandvillars","Gare_de_Delle","Gare_d'École-Valentin","Gare_d'Ouges","Gare_de_Saulon","Gare_de_Longecourt","Gare_d'Aiserey","Gare_de_Brazey-en-Plaine","Gare_de_Saint-Jean-de-Losne","Gare_de_Chaugey","Gare_de_Pagny (Côte-d'Or)","Gare_de_Seurre","Gare_de_Mervans","Gare_de_Louhans","Gare_de_Saint-Amour","Gare_de_Lons-le-Saunier","Gare_de_Poligny","Gare_de_Montferrand-Thoraise","Gare_de_Torpes-Boussières","Gare_de_Byans","Gare_de_Liesle","Gare_de_Besançon-Mouillère","Gare_de_Besançon-près-de-Vaux","Gare_de_Morre","Gare_de_Saône","Gare_de_Mamirolle","Gare_de_L'Hôpital-du-Grosbois","Gare_d'Étalans","Gare_de_Le Valdahon Camp Militaire","Gare_de_Le Valdahon","Gare_d'Avoudrey","Gare_de_Gilley","Gare_de_Rémonot","Gare_de_Morteau","Gare_de_Pontarlier","Gare_de_La Rivière","Gare_de_Sainte-Colombe","Gare_de_Champagnole","Gare_de_Paul-Émile-Victor","Gare_de_La Chaux-des-Crotenay","Gare_de_La Chaumusse-Fort-du-Plasne","Gare_de_Saint-Laurent-en-Grandvaux","Gare_de_Morbier","Gare_de_Morez","Gare_de_Saint-Claude","Gare_de_Molinges","Gare_d'Oyonnax","Gare_de_Bellignat","Gare_de_La Cluse","Gare_de_Brion-Montréal-la-Cluse","Gare_d'Arbois","Gare_de_Saint-Lothain","Gare_de_Domblans-Voiteur","Gare_de_Cousance","Gare_de_Bourg-en-Bresse","Gare_de_Vonnas","Gare_de_Mézériat","Gare_de_Polliat","Gare_de_Saint-Martin-du-Mont","Gare_de_Pont-d'Ain","Gare_d'Ambronay-Priay","Gare_d'Ambérieu-en-Bugey","Gare_de_Ceyzériat","Gare_de_Villereversure","Gare_de_Simandre-sur-Suran","Gare_de_Cize-Bolozon","Gare_de_Nurieux","Gare_de_Les Échets","Gare_de_Mionnay","Gare_de_Saint-André-de-Corcy","Gare_de_Saint-Marcel-en-Dombes","Gare_de_Villars-les-Dombes","Gare_de_Marlieux-Châtillon","Gare_de_Saint-Paul-de-Varax","Gare_de_Servas-Lent","Gare_de_Crépieux-la-Pape","Gare_de_Miribel","Gare_de_Saint-Maurice-de-Beynost","Gare_de_Beynost","Gare_de_Montluel","Gare_de_La Valbonne","Gare_de_Meximieux-Pérouges","Gare_de_Saint-Rambert-en-Bugey","Gare_de_Tenay-Hauteville","Gare_de_Virieu-le-Grand-Belley","Gare_de_Culoz","Gare_de_Seyssel-Corbonod","Gare_de_Bellegarde","Gare_de_Pougny-Chancy","Gare_de_Nyon","Gare_de_Valleiry","Gare_de_Saint-Julien-en-Genevois","Gare_d'Annemasse","Gare_de_Machilly","Gare_de_Bons-en-Chablais","Gare_de_Perrignier","Gare_de_Thonon-les-Bains","Gare_d'Évian-les-Bains","Gare_de_Saint-Gingolph (CH)","Gare_de_Le Bouveret","Gare_de_Lyon-Part-Dieu","Gare_de_Chêne-Bourg","Gare_de_Genève-Eaux-Vives","Gare_de_Saint-Pierre-en-Faucigny","Gare_de_Bonneville","Gare_de_Marignier","Gare_de_Cluses","Gare_de_Magland","Gare_de_Sallanches-Combloux-Megève","Gare_de_Saint-Gervais-les-Bains-Le Fayet","Gare_de_Chedde-Voie-Étroite","Gare_de_Servoz","Gare_de_Vaudagne","Gare_de_Viaduc-Sainte-Marie","Gare_de_Les Houches","Gare_de_Taconnaz","Gare_de_Les Bossons","Gare_de_Les Pélerins","Gare_de_Les Moussoux","Gare_de_Chamonix-Aiguille du Midi","Gare_de_Chamonix-Mont-Blanc","Gare_de_Les Praz-de-Chamonix","Gare_de_Les Tines","Gare_de_Chamonix-La Joux","Gare_d'Argentière","Gare_de_Montroc-le-Planet","Gare_de_Le Buet","Gare_de_Vallorcine","Gare_de_Le Châtelard-Frontière","Gare_d'Aix-les-Bains-Le Revard","Gare_de_Grésy-sur-Aix","Gare_d'Albens","Gare_de_Rumilly","Gare_d'Annecy","Gare_de_Pringy (Haute-Savoie)","Gare_de_Groisy-Thorens-la-Caille","Gare_de_La Roche-sur-Foron","Gare_de_Reignier","Gare_d'Albertville","Gare_de_Grésy-sur-Isère","Gare_de_Frontenex","Gare_de_Notre-Dame-de-Briançon","Gare_de_Moûtiers","Gare_d'Aime-La Plagne","Gare_de_Landry","Gare_de_Bourg-Saint-Maurice","Gare_de_Vions-Chanaz","Gare_de_Chindrieux","Gare_de_Viviers-du-Lac","Gare_de_Chambéry-Challes-les-Eaux","Gare_de_Montmélian","Gare_de_Saint-Pierre-d'Albigny","Gare_de_Chamousset","Gare_d'Aiguebelle","Gare_d'Épierre-Saint-Léger","Gare_de_Saint-Avre-la-Chambre","Gare_de_Saint-Jean-de-Maurienne-Arvan","Gare_de_Saint-Michel-Valloire","Gare_de_Modane","Gare_de_Tunnel (Modane)","Gare_de_Tunnel (Bardonecchia)","Gare_de_Bardonecchia","Gare_de_Lyon-Est","Gare_de_Villeurbanne","Gare_de_Vaulx-en-Velin - La Soie","Gare_de_Décines","Gare_de_Meyzieu","Gare_de_Meyzieu-Z.I.","Gare_de_Saint-André-le-Gaz","Gare_de_Les Abrets-Fitilieu","Gare_de_Pont-de-Beauvoisin","Gare_de_Saint-Béron-La Bridoire","Gare_de_Lépin-le-Lac-La Bauche","Gare_d'Aiguebelette-le-Lac","Gare_de_Vénissieux-Voyageurs","Gare_de_Saint-Priest","Gare_de_Saint-Quentin-Fallavier","Gare_de_La Verpillière","Gare_de_L'Isle-d'Abeau","Gare_de_Bourgoin-Jallieu","Gare_de_Cessieu","Gare_de_La Tour-du-Pin","Gare_de_Virieu-sur-Bourbre","Gare_de_Châbons","Gare_de_Le Grand-Lemps","Gare_de_Rives","Gare_de_Réaumont-Saint-Cassien","Gare_de_Voiron","Gare_de_Moirans","Gare_de_Voreppe","Gare_de_Saint-Égrève-Saint-Robert","Gare_de_Grenoble","Gare_de_Pont-de-Claix","Gare_de_Jarrie-Vizille","Gare_de_Saint-Georges-de-Commiers","Gare_de_Vif","Gare_de_Monestier-de-Clermont","Gare_de_Clelles-Mens","Gare_de_Lus-la-Croix-Haute","Gare_d'Aspres-sur-Buëch","Gare_de_Veynes-Dévoluy","Gare_de_Serres","Gare_de_Laragne","Gare_de_Sisteron","Gare_de_Château-Arnoux-Saint-Auban","Gare_de_La Brillanne-Oraison","Gare_de_Manosque-Gréoux-les-Bains","Gare_de_Pertuis","Gare_de_Meyrargues","Gare_d'Aix-en-Provence","Gare_de_Gardanne","Gare_de_Simiane","Gare_de_Septèmes","Gare_de_Saint-Antoine (MR)","Gare_de_Saint-Joseph-Le Castellas","Gare_de_Sainte-Marthe-en-Provence","Gare_de_Picon-Busserine","Gare_de_Romans-Bourg-de-Péage","Gare_de_Saint-Hilaire-Saint-Nazaire","Gare_de_Saint-Marcellin","Gare_de_Vinay","Gare_de_Poliénas","Gare_de_Tullins-Fures","Gare_de_Moirans-la-Galifette","Gare_de_Grenoble-Université-Gières","Gare_de_Lancey","Gare_de_Brignoud","Gare_de_Goncelin","Gare_de_Pontcharra","Gare_d'Échirolles","Gare_de_Crest","Gare_de_Saillans","Gare_de_Die","Gare_de_Luc-en-Diois","Gare_de_Gap","Gare_de_Chorges","Gare_d'Embrun","Gare_de_Montdauphin-Guillestre","Gare_de_L'Argentière-les-Écrins","Gare_de_Briançon","Gare_de_Digne","Gare_de_Cavaillon","Gare_de_Salon","Gare_de_Montfavet","Gare_de_Morières-lès-Avignon","Gare_de_Saint-Saturnin-d'Avignon","Gare_de_Gadagne","Gare_de_Le Thor","Gare_de_L'Isle-Fontaine-de-Vaucluse","Gare_d'Orgon","Gare_de_Sénas","Gare_de_Lamanon","Gare_de_Carpentras","Gare_d'Entraigues-sur-la-Sorgue","Gare_de_Monteux","Gare_de_Marseille-Blancarde","Gare_de_La Pomme","Gare_de_Saint-Marcel","Gare_de_La Barasse","Gare_de_La Penne-sur-Huveaune","Gare_d'Aubagne","Gare_de_Cassis","Gare_de_La Ciotat","Gare_de_Saint-Cyr-les-Lècques-La Cadière","Gare_de_Bandol","Gare_d'Ollioules-Sanary-sur-Mer","Gare_de_La Seyne-Tamaris-sur-Mer","Gare_de_Toulon","Gare_de_La Garde","Gare_de_La Pauline-Hyères","Gare_de_Solliès-Pont","Gare_de_Cuers-Pierrefeu","Gare_de_Puget-Ville","Gare_de_Carnoules","Gare_de_Pignans","Gare_de_Gonfaron","Gare_de_Le Luc-et-Le Cannet","Gare_de_Vidauban","Gare_de_Les Arcs-Draguignan","Gare_de_Fréjus","Gare_de_Fréjus-Saint-Raphaël","Gare_de_Saint-Raphaël-Valescure","Gare_de_Boulouris-sur-Mer","Gare_de_Le Dramont","Gare_d'Agay","Gare_d'Anthéor-Cap-Roux","Gare_de_Le Trayas","Gare_de_Théoule-sur-Mer","Gare_de_Mandelieu-la-Napoule","Gare_de_Cannes-la-Bocca","Gare_de_Cannes","Gare_de_Golfe-Juan-Vallauris","Gare_de_Juan-les-Pins","Gare_d'Antibes","Gare_de_Biot","Gare_de_Villeneuve-Loubet-Plage","Gare_de_Cagnes-sur-Mer","Gare_de_Cros-de-Cagnes","Gare_de_Saint-Laurent-du-Var","Gare_de_Nice-Saint-Augustin","Gare_de_Nice-Ville","Gare_de_Nice-Riquier","Gare_de_Villefranche-sur-Mer","Gare_de_Beaulieu-sur-Mer","Gare_de_Èze","Gare_de_Cap-d'Ail","Gare_de_Monte-Carlo-Country-Club","Gare_de_Cap-Martin-Roquebrune","Gare_de_Carnolès","Gare_de_Menton","Gare_de_Menton-Garavan","Gare_d'Istres","Gare_de_Rassuen","Gare_de_Fos-sur-Mer","Gare_de_Port-de-Bouc","Gare_de_Croix-Sainte","Gare_de_Martigues","Gare_de_La Couronne-Carro","Gare_de_Sausset-les-Pins","Gare_de_Carry-le-Rouet","Gare_de_La Redonne-Ensuès","Gare_de_Niolon","Gare_de_La Crau","Gare_de_Hyères","Gare_de_Le Bosquet","Gare_de_La Frayère","Gare_de_Ranguin","Gare_de_Mouans-Sartoux","Gare_de_Grasse","Gare_de_Halte Nice-Pont-Michel","Gare_de_L'Ariane","Gare_de_La Trinité-Victor","Gare_de_Drap-Cantaron","Gare_de_Halte de Fontanil-Lycée de Drap","Gare_de_Peillon-Sainte-Thècle","Gare_de_Peille","Gare_de_L'Escarène","Gare_de_Touët-de-l'Escarène","Gare_de_Sospel","Gare_de_Breil-sur-Roya","Gare_de_Coni","Gare_de_Borgo San Dalmazzo","Gare_de_Roccavione","Gare_de_Robilante","Gare_de_Vernante","Gare_de_Limone","Gare_de_Viévola","Gare_de_Tende","Gare_de_La Brigue","Gare_de_Saint-Dalmas-de-Tende","Gare_de_Fontan-Saorge","Gare_d'Olivetta-San-Michele","Gare_d'Airole PM","Gare_d'Airole","Gare_de_Bevera","Gare_de_Péreire-Levallois","Gare_de_Vincennes","Gare_de_Fontenay-sous-bois","Gare_de_Nogent-sur-Marne","Gare_de_Joinville-le-Pont","Gare_de_Saint-Maur-Créteil","Gare_de_Le Parc-de-Saint-Maur","Gare_de_Champigny","Gare_de_La Varenne-Chennevières","Gare_de_Sucy-Bonneuil","Gare_de_Boissy-Saint-Léger","Gare_de_Remise-à-Jorelle","Gare_de_Les Coquetiers","Gare_d'Allée-de-la-Tour-Rendez-Vous","Gare_de_Pavillons-sous-Bois","Gare_de_Gargan","Gare_de_Lycée-Henri-Sellier","Gare_de_L'Abbaye","Gare_de_Freinville-Sevran","Gare_de_Rougemont-Chanteloup","Gare_d'Épinay-sur-Seine TT","Gare_d'Épinay-Villetaneuse TT","Gare_de_Villetaneuse-Université TT","Gare_de_Pierrefite-Stains TT","Gare_de_Stains-Cerisaie TT","Gare_de_Dugny-La Courneuve TT","Gare_de_Le Bourget TT","Gare_de_Champ-de-Mars-Tour-Eiffel","Gare_de_Champ-de-Mars (Y)","Gare_d'Avenue-du-Président-Kennedy-Radio-France","Gare_de_Boulainvilliers","Gare_d'Avenue-Henri-Martin","Gare_d'Avenue-Foch","Gare_de_Neuilly-Porte-Maillot","Gare_de_Porte-de-Clichy","Gare_de_Saint-Ouen","Gare_de_Les Grésillons","Gare_de_Gennevilliers","Gare_d'Épinay-sur-Seine","Gare_de_Saint-Gratien","Gare_de_Pont-de-Bezons","Gare_de_Parc-Pierre-Lagravère","Gare_de_Charlebourg","Gare_de_La Défense","Gare_de_Puteaux","Gare_de_Belvédère","Gare_de_Suresnes-Longchamp","Gare_de_Les Côteaux","Gare_de_Pont-de-Saint-Cloud","Gare_de_Pont-de-Sèvres","Gare_de_Bellevue-Funiculaire","Gare_de_Le Bas-Meudon","Gare_de_Les Moulineaux-Billancourt","Gare_d'Issy-Val-de-Seine","Gare_de_Porte-de-Versailles (T2)","Gare_de_Bécon-les-Bruyères","Gare_de_Courbevoie","Gare_de_Suresnes-Mont-Valérien","Gare_de_Le Val-d'Or","Gare_de_Saint-Cloud","Gare_de_Sèvres-Ville-d'Avray","Gare_de_Chaville-Rive-Droite","Gare_de_Viroflay-Rive-Droite","Gare_de_Montreuil","Gare_de_Versailles-Rive-Droite","Gare_de_Garches-Marnes-la-Coquette","Gare_de_Vaucresson","Gare_de_La Celle-Saint-Cloud","Gare_de_Bougival","Gare_de_Louveciennes","Gare_de_Marly-le-Roi","Gare_de_L'Étang-la-Ville","Gare_de_Saint-Nom-la-Bretêche-Forêt-de-Marly","Gare_de_Nanterre-Université","Gare_de_Rueil-Malmaison","Gare_de_Chatou - Croissy","Gare_de_Le Vésinet-Centre","Gare_de_Le Vésinet - Le Pecq","Gare_de_Saint-Germain-en-Laye","Gare_d'Invalides","Gare_de_Pont-de-l'Alma","Gare_de_Javel","Gare_de_Pont-du-Garigliano Hôpital-Georges-Pompidou","Gare_d'Issy","Gare_de_Meudon-Val-Fleury","Gare_de_Chaville-Vélizy","Gare_de_Porchefontaine","Gare_de_Versailles-Rive-Gauche","Gare_de_Haussmann-Saint-Lazare","Gare_de_Paris-Nord-Souterraine","Gare_de_Chatelet-les-Halles","Gare_de_Paris-Gare-de-Lyon (Banlieue)","Gare_de_Musée-d'Orsay","Gare_de_Saint-Michel-Notre-Dame","Gare_de_Paris-Austerlitz (Banlieue)","Gare_de_Les Saules","Gare_d'Orly-Ville","Gare_de_Pont-de-Rungis-Aéroport-d'Orly","Gare_de_Rungis-la-Fraternelle","Gare_de_Chemin-d'Antony","Gare_de_Grigny-Centre","Gare_d'Orangis-Bois-de-l'Épine","Gare_d'Évry-Courcouronnes","Gare_de_Le Bras-de-fer","Gare_de_Noisy-le-Roi","Gare_de_L'Étang - Les Sablons","Gare_de_Mareil-Marly","Gare_de_Saint-Germain-Bel-Air","Gare_de_Saint-Germain-Grande-Ceinture","Gare_de_Petit-Vaux","Gare_de_Gravigny-Balizy","Gare_de_Chilly-Mazarin-Grande-Ceinture","Gare_de_Longjumeau-Grande-Ceinture","Gare_de_Massy-Palaiseau-Grande-Ceinture","Gare_d'Igny","Gare_de_Bièvres","Gare_de_Vauboyen","Gare_de_Jouy-en-Josas","Gare_de_Petit-Jouy-Les Loges","Gare_de_Bastia","Gare_de_Lupino","Gare_de_Rivoli","Gare_de_Bassanese","Gare_de_L'Arinella","Gare_de_Montesoro","Gare_de_Polyclinique","Gare_de_La Rocade","Gare_de_Furiani","Gare_de_Saltatojo","Gare_de_Fornacina","Gare_de_Ceppe","Gare_de_Casatorra","Gare_de_Biguglia","Gare_de_Purretone","Gare_de_Borgo","Gare_de_Lucciana","Gare_de_Casamozza","Gare_de_Barchetta","Gare_de_Ponte-Nuovo","Gare_de_Ponte-Leccia","Gare_de_Francardo","Gare_d'Omessa","Gare_de_Soveria","Gare_de_Corte","Gare_de_Poggio-Riventosa","Gare_de_Venaco","Gare_de_Vivario","Gare_de_Savaggio","Gare_de_Tattone","Gare_de_Vizzavona","Gare_de_Bocognano","Gare_de_Tavera","Gare_d'Ucciani","Gare_de_Carbuccia","Gare_de_Mezzana","Gare_de_Caldaniccia","Gare_de_Campo-dell-Oro","Gare_de_Les Salines","Gare_d'Ajaccio","Gare_de_Pietralba","Gare_de_Novella","Gare_de_Palasca","Gare_de_San-Gavino","Gare_de_Belgodere","Gare_de_Le Regino","Gare_de_L'Île-Rousse","Gare_de_Davia","Gare_d'Algajola","Gare_de_Sant'-Ambroggio","Gare_de_Club Med Cocody","Gare_de_Lumio","Gare_de_GR 20 Dolce-Vita","Gare_de_Tennis-Club","Gare_de_Calvi","Gare_de_Nice-CP","Gare_de_Nice-La Madeleine","Gare_de_Saint-Isidore","Gare_de_Lingostière","Gare_de_Nice-Saint-Sauveur","Gare_de_Colomars-La Manda","Gare_de_Castagniers","Gare_de_Saint-Blaise (Alpes-Maritimes)","Gare_de_Saint-Martin-du-Var","Gare_de_Pont-Charles-Albert","Gare_de_Baus-Roux","Gare_de_La Vésubie–Plan-du-Var","Gare_de_Le Chaudan","Gare_de_La Tinée","Gare_de_La Mescla","Gare_de_Malaussène","Gare_de_Villars-sur-Var","Gare_de_Le Tournel","Gare_de_Touët-sur-Var","Gare_de_Rigaud-Pont-du-Cians","Gare_de_Les Clos","Gare_de_Puget-Théniers","Gare_d'Entrevaux","Gare_de_Plan d'Entrevaux","Gare_d'Agnerc","Gare_de_Pont-de-Gueydan","Gare_de_Saint-Benoît","Gare_de_Scaffarels","Gare_d'Annot","Gare_de_Les Lunières","Gare_de_Le Fugeret","Gare_de_Méailles","Gare_de_Peyresq","Gare_de_Thorame-Haute","Gare_d'Allons-Argens","Gare_de_La Mure-Argens","Gare_de_Saint-André-les-Alpes","Gare_de_Moriez","Gare_de_Gévaudan","Gare_de_La Thuilière","Gare_de_Barrême","Gare_de_Le Poil–Majastres","Gare_de_Chaudon-Norante","Gare_de_Chabrières","Gare_de_Saint-Michel-de-Cousson","Gare_de_Mézel – Châteauredon","Gare_de_Saint-Jurson","Gare_d'Arrêt du Golf","Gare_de_Gaubert–Le Chaffaut","Gare_de_Plan-de-Gaubert","Gare_de_Plan d'eau des Ferréols","Gare_de_Saint-Erme-CA","Gare_de_Marseille-Noailles","Gare_de_Marseille-Saint-Pierre","Gare_d'Aubagne-Piscine","Gare_de_Vannes CM","Gare_de_Lorient CM","Gare_de_Volmerange-les-Mines","Gare_de_Taffin","Gare_de_Le Galibot","Gare_de_Valenciennes-Saint-Waast","Gare_d'Anzin","Gare_d'Amara-Donostia","Gare_de_Ficoba-Irun","Gare_de_Hendaia","Gare_de_Poteries","Gare_de_Hôpital de Hautepierre","Gare_de_Strasbourg-Rotonde","Gare_de_Gare Centrale","Gare_de_Homme de Fer","Gare_de_Porte de l'Hôpital","Gare_de_Landsberg","Gare_de_Port du Rhin","Gare_de_Kehl Bahnhof","Gare_de_Kehl Rathaus","Gare_de_Saint-Louis-tram (Haut-Rhin)","Gare_de_Barfüsserplatz (tram)","Gare_de_Leymen (tram)","Gare_de_Genève-Cornavin","Gare_de_Lancy-Pont-Rouge","Gare_de_Lancy-Bachet","Gare_de_Genève-Champel","Gare_d'Auber","Gare_de_Sceaux","Gare_de_Fontenay-aux-Roses","Gare_de_Robinson","Gare_de_Saint-Valéry-Ville","Gare_de_Pendé-Routhiauville","Gare_de_Lanchères - Pendé","Gare_de_Hurt","Gare_de_Cayeux-sur-Mer-Brighton-Plage","Gare_de_Saint-Hilaire-de-Riez-TV","Gare_de_Croix-de-Vie-Saint-Gilles"
    ];
    const expectedGaresON = [
    "Gare_de_Schiltigheim","Gare_de_Creutzwald","Gare_de_Mont-Saint-Martin","Gare_de_Rethondes","Gare_de_Lumbres","Gare_de_Saint-Méen","Gare_de_La_Boissière","Gare_de_Saint-Varent","Gare_de_Chalandray","Gare_de_Fontenay-le-Comte","Gare_d'Aytré","Gare_de_Bordeaux-Bastide","Gare_de_Saint-Jean-de-Sauves","Gare_de_Montierchaume","Gare_de_Cases-de-Pène","Gare_de_Saint-Jean-Pla-de-Corts","Gare_de_Pithiviers","Gare_de_Laqueuille","Gare_de_Lorcy","Gare_de_Saulieu","Gare_de_Salindres","Gare_de_Châtillon-sur-Seine","Gare_de_Domène","Gare_de_Neuilly-sur-Marne","Gare_de_Grandpuits", "Gare_de_Maison-Rouge-en-Brie", "Gare_de_Flamboin-Gouaix", "Gare_de_Mézy", "Gare_de_Ligny", "Gare_de_Metz-Chambière", "Gare_de_Roye_(Somme)", "Gare_de_Péronne-la-Chapelette", "Gare_de_Fives", "Gare_de_Wizernes", "Gare_d'Uzel", "Gare_d'Aiffres", "Gare_de_Layrac", "Gare_de_Lapradelle", "Gare_de_Beaune-la-Rolande", "Gare_de_Souvigny", "Gare_de_La_Chapelle-la-Reine", "Gare_de_Berre", "Gare_de_Gray", "Gare_de_Giromagny", "Gare_de_Hausbergen", "Gare_de_Metz-devant-les-Ponts", "Gare_de_Blanc-Misseron", "Gare_de_Leffrinckoucke", "Gare_de_Montières", "Gare_de_Rouen-Martainville", "Gare_de_Pontivy", "Gare_de_Concarneau", "Gare_de_Niort", "Gare_de_Loudun", "Gare_de_Coulombiers", "Gare_de_Bon-Encontre", "Gare_de_Cases-de-Pène", "Gare_de_La_Voulte-sur-Rhône", "Gare_de_Salindres", "Gare_de_Wissous", "Gare_de_Richwiller", "Gare_d'Arques-la-Bataille", "Gare_de_Tournon-Saint-Martin", "Gare_de_Beaumont-de-Lomagne", "Gare_de_Solférino", "Gare_de_Courtenay", "Gare_de_La_Roche-en-Brenil", "Gare_de_Lyon-Guillotière", "Gare_de_Bry-sur-Marne", "Gare_de_Héming", "Gare_de_Mulhouse-Nord", "Gare_de_Drulingen", "Gare_de_Réhon", "Gare_de_Saulnes", "Gare_de_Guillaucourt", "Gare_de_Lomme", "Gare_de_Quéménéven", "Gare_de_Loudéac", "Gare_de_Bobigny", "Gare_de_Villiers-Saint-Georges", "Gare_de_Beuzeville_(Eure)", "Gare_de_Quintin", "Gare_de_Caudiès", "Gare_d'Arenc-Euroméditerranée", "Gare_de_Villepatour-Presles", "Gare_d'Ozouer-le-Voulgis", "Gare_de_Genevreuille", "Gare_de_Barbonne-Fayel", "Gare_de_Fougerolles", "Gare_de_Maxonchamp", "Gare_de_Syndicat-Saint-Amé", "Gare_de_Laval_(Vosges)", "Gare_de_Gérardmer", "Gare_d'Arzviller", "Gare_de_Sainte-Menehould", "Gare_de_Saint-Hippolyte_(Haut-Rhin)", "Gare_de_Schlierbach", "Gare_de_Sundhoffen", "Gare_de_Mittersheim", "Gare_d'Enchenberg", "Gare_de_Diebling", "Gare_de_Voellerdingen", "Gare_de_Viviers-sur-Chiers", "Gare_de_Briey", "Gare_de_Berzy-le-Sec", "Gare_de_Cousolre", "Gare_de_Marcoing", "Gare_de_Bavay", "Gare_de_Roisel", "Gare_de_Blangy-Glisy", "Gare_de_Vicoigne", "Gare_de_Gruson", "Gare_de_Tourcoing-les-Francs", "Gare_de_Wattrelos", "Gare_de_Carvin", "Gare_de_Wambrechies", "Gare_de_Verquigneul", "Gare_de_Saint-Josse", "Gare_de_Calais-Maritime", "Gare_de_Conty", "Gare_de_Bel-Air", "Gare_de_Valmont", "Gare_de_Lillebonne", "Gare_de_Fresville", "Gare_de_La_Rivière-Saint-Sauveur", "Gare_de_Livarot", "Gare_de_Viessoix", "Gare_de_Mutrécy", "Gare_d'Airel", "Gare_de_Périers-en-Cotentin", "Gare_de_Bricquebec", "Gare_de_Domfront_(Orne)", "Gare_de_Plouénan", "Gare_de_Blain", "Gare_de_Châteaulin-Ville", "Gare_de_Saint-Loup-Lamairé", "Gare_de_Saint-Denis-du-Pin", "Gare_de_Trémentines", "Gare_de_Chavagnes-les-Redoux", "Gare_de_Pas-de-Jeu", "Gare_de_Cabariot", "Gare_de_Gémozac", "Gare_de_Berthegon", "Gare_de_Ravezies", "Gare_de_Noailles_(Corrèze)", "Gare_de_Carlux", "Gare_de_Lafox", "Gare_de_Nissan", "Gare_de_Monferran", "Gare_de_Pierrefitte-Nestalas", "Gare_de_Hèches", "Gare_de_Sarrancolin", "Gare_de_Saint-Paul-Saint-Antoine", "Gare_de_Madame", "Gare_de_Saint-Benoît_-_Saint-Aignan", "Gare_de_Monteils", "Gare_de_Molompize", "Gare_de_Laurens", "Gare_de_Grigny-Val-de-Seine", "Gare_d'Augy-Vaux", "Gare_d'Arcy-sur-Cure", "Gare_de_Diou_(Allier)", "Gare_de_Robiac", "Gare_d'Aubenas", "Gare_de_Saint-Barthélémy", "Gare_de_Latrecey", "Gare_de_Boujailles", "Gare_de_Neyron", "Gare_de_Rossillon", "Gare_de_Divonne-les-Bains", "Gare_de_Bloye", "Gare_de_Belley", "Gare_de_Sainte-Tulle", "Gare_de_La_Beaume", "Gare_de_Prelles", "Gare_de_Velaux-Coudoux", "Gare_de_La_Plage-d'Hyères", "Gare_de_Villecresnes", "Gare_de_Saint-Ouen-Garibaldi", "Gare_de_Paris-Gobelins", "Gare_de_Valdieu", "Gare_de_Barisey-la-Côte", "Gare_de_Ferdrupt", "Gare_de_Syndicat-Saint-Amé", "Gare_de_La_Houssière", "Gare_de_Réchicourt-le-Château", "Gare_de_Saint-Hippolyte_(Haut-Rhin)", "Gare_de_Loudrefing", "Gare_de_Bannstein", "Gare_de_L'Hôpital_(Moselle)", "Gare_d'Any", "Gare_de_La_Plaine-Voyageurs", "Gare_de_Marcoing", "Gare_de_Blécourt", "Gare_de_Champ-du-Chêne", "Gare_de_Lille-Saint-Sauveur", "Gare_de_Conteville", "Gare_de_Comines-France", "Gare_de_Zuydcoote", "Gare_de_Mont-Saint-Éloi", "Gare_de_Samer", "Gare_de_Fontaine-Bonneleau", "Gare_de_Port-Villez", "Gare_de_Rouen-Rive-Gauche", "Gare_de_Couville", "Gare_de_Quetteville", "Gare_d'Isigny-sur-Mer", "Gare_de_Cerisi-Belle-Étoile", "Gare_de_Berjou", "Gare_de_Caligny", "Gare_de_Cérences", "Gare_de_Saint-Sauveur-Lendelin", "Gare_de_Saint-Sauveur-le-Vicomte", "Gare_de_Port-Bail", "Gare_de_Fougères", "Gare_d'Elven", "Gare_de_Loyat", "Gare_de_Saint-Julien_(Côtes-d'Armor)", "Gare_de_Montrelais", "Gare_de_La_Claie", "Gare_de_La_Chapelle-Saint-Laurent", "Gare_de_Noirterre", "Gare_de_Chambretaud", "Gare_de_Saumur-Rive-Gauche", "Gare_de_Varzay", "Gare_de_Lormont", "Gare_de_Scorbé-Clairvaux", "Gare_de_Talence-Médoquine", "Gare_de_Glanges", "Gare_de_Cazoulès", "Gare_de_Pouligny-Saint-Pierre", "Gare_de_La_Roche-Posay", "Gare_de_Saint-Aigny_-_Le_Blanc", "Gare_de_Saint-Julien-sur-Garonne", "Gare_de_Laruns", "Gare_de_Porta", "Gare_de_Madame", "Gare_de_La_Chapelle-Saint-Ursin-Bourg", "Gare_d'Eygurande-Merlines", "Gare_de_Saint-Dizier-Leyrenne", "Gare_de_Noyant-d'Allier", "Gare_de_Bourg-Lastic-Messeix", "Gare_de_Flaujac", "Gare_de_Loubaresse", "Gare_de_Balsièges", "Gare_de_Caux", "Gare_de_Lyon-Saint-Clair", "Gare_de_Vincelles", "Gare_de_Voutenay", "Gare_de_Manlay", "Gare_de_Dracy-Saint-Loup", "Gare_de_Vandenesse", "Gare_de_Lissac", "Gare_de_Bourg-Saint-Andéol", "Gare_de_Sauveterre", "Gare_de_Bessèges", "Gare_de_Châteauneuf-du-Rhône", "Gare_de_Saint-Germain-de-Joux", "Gare_de_Paradis", "Gare_de_Cevins", "Gare_de_Pont-de-Livron", "Gare_de_Beaurières", "Gare_de_La_Farlède", "Gare_de_La_Plage-d'Hyères", "Gare_de_Grisy-Suisnes"
    ];
        if(1) return console.log(`expectedGaresO ${expectedGaresO.length}`) || expectedGaresO;
        if(2) return console.log(`expectedGaresON ${expectedGaresON.length}`) || expectedGaresON;
        if(3) return console.log(`checkedGares ${checkedGares.length}`) || checkedGares;
    }
    

/* **************** probably to be deleted ****************** */
/*
		function OLD_verifyLineConnectivity(ff) {
			const verifiesUse = (ff, use) => {
				const filtff = (use === "J")?
					Array.from(mapifyProperty(ff,"uic").values()).reduce((ac,v) => v.some(f => f.properties.use === use)? ac.concat(v) : ac, []) :
					ff.filter(f => f.properties.use === use);
				const useMap = mapifyProperty(filtff,"uic");
				const histogUse = histogramOfmap(useMap);
				return `${useMap.size} ${use}-branches: histo[${histogUse.length}]: ${printHistoByDi(histogUse)}`;
			}
		// runtime :
if(logok) console.log("run_>>> verifyLineConnectivity of B-nodes, the J-nodes");
            let logB = "\n-- connectivity of " + verifiesUse(ff,"B");
            let logJ = "\n-- connectivity of " + verifiesUse(ff,"J");
			return logJ + logB;
		}
        function breakDownDist(ff){
            function distanceSpreading(mmm){
                const euclidistance = (pti,ptj) => Math.sqrt(Math.pow(pti[0] - ptj[0], 2) + Math.pow(pti[1] - ptj[1], 2));
                const maximDistance = (pts) => {
                    const ptslen = pts.length; let maxDist = 0, eui = 0, euj = 0;
                    for (let i = 0; i < ptslen; i++) for (let j = i + 1; j < ptslen; j++) {
                        let eud = euclidistance(pts[i],pts[j]); if(maxDist < eud) {eui = i; euj = j; maxDist = eud;}
                    }
                    return distanceGreatCircleInKm2(pts[eui],pts[euj]);
                };
                const computeMaxDis = arr => maximDistance(arr.map(x => x.geometry.coordinates));
                const doitMaxSpread = (g,d, res) => void (g.properties.dist = d) || void res.push(g.properties) || res;
                const saveMaxSpread = (g,d, res) => d > SPREADMIN ? doitMaxSpread(g,d,res) : res;
                const keepMaximDist = (arr, res) => (arr.length > 1) ? saveMaxSpread(arr[0], computeMaxDis(arr), res) : res;
            // run: provide the spreading list of distances of a multi-node
                const spread = [];
                mmm.forEach((v,k) => keepMaximDist(v,spread));
                return spread;
            }
            function histogByDistan(ffp){ // (dd < SLICESIZE? 0 : Math.floor(dd / span))
                const addToHistograM = (hh,dd) => updathistogram(hh,Math.floor(dd)) || void (hhtot += dd) || void (hhlen++) || void (hhmax = Math.max(hhmax, dd)) || hh;
                const spreadlog = (hh) => (!hh.length)? `\n   [no spread data]` :
                `\n   spreads: histo=[${printHistoByDi(hh)}]: max= ${hhmax.toFixed(3)}, mean= ${(hhtot/hhlen).toFixed(3)}`;
                let hhtot = 0, hhlen = 0, hhmax = 0;
if(logok) console.log("before>>>  addToHistograM");
                const hh = ffp.reduce((acc,fp) => (fp.dist? addToHistograM(acc, fp.dist) : acc), []);
if(logok) console.log("before>>>  spreadlog");
                return spreadlog(hh);
            }
            //
if(logok) console.log("run_>>> analyze multi-nodes distance-spreading");
			const uicmap = mapifyProperty(ff, "uic");
			const spread = distanceSpreading(uicmap);
            let log = `\n-- nodes spread-analysis(> ${SPREADMID}) on ${spread.length}/${uicmap.size}`;
            log += spread.reduce((acc,fp) => acc + (fp.dist>SPREADMID? `\nSPREAD ${JSON.stringify(fp)}` : ""), "");
            log += histogByDistan(spread);
            return log;
        }

function verifiesUIC_OLD(features){
    const checkAmbiguity = (v) => v.properties.uic; //v.split("_")[1];
const sameLib_difUic = (ambs, val, vref) => val.forEach((v) => checkAmbiguity(v) != vref? ambs.push(`[${val.length}]:${printAmbiguity(v,val[0])}`) : undefined);
const logUicLibAddid = (list, funktion) => {let log = funktion(list); return log? `\n${list.length}:${log}` : ""};
const logOversizedPp = (mmap, funktion) => {let log = "";
    if(mmap) mmap.forEach((val, key) => val.length > 1? void (log += logUicLibAddid(val, funktion)) : 0);
    return log;
};
const featureSameUic = (f1,f2) => f1.properties.uic === f2.properties.uic;
const featureSame_Id = (f1,f2) => f1.properties.id === f2.properties.id;
const featureIsAGare = (f) => f.properties.use.startsWith("O") || f.properties.use.startsWith("N") || f.properties.use.startsWith("T");
const featureJunc2Do = (f1,f2) => featureIsAGare(f1) && featureIsAGare(f2);
const logUicLibelDuf = (list) => list.reduce((cum,f,i,t) => cum +(featureSameUic(f,t[0])? (i?"":"") : ((i?", ":"")+f.properties.id)), "");
const logUicLibelDif = (list) => list.reduce((cum,f,i,t) => cum +((featureSame_Id(f,t[0]) || f.properties.geodev < 0)? (i?"":"") : ((i?", ":"")+f.properties.id)), "");
const logValuUseDiff = (list) => list[0].properties.use;
function uicInconsistent(mmap) {
    const jokeruic = (v0, k) => k || "cc"+ v0.properties.num +"_"+ v0.properties.pk;
    const checkAlone = (v, k) => {
        let use = v[0].properties.use;
        if(use === "B" || use === "J") throw Error(`uicInconsistent/checkAlone ${use}:${jokeruic(v[0],k)}`,NODEKO);
        return "";
    };
    const checkMultiUIC = (v, k) => {
        let use = v[0].properties.use;
        if(use === "A" || use === "X" || use.includes("F")) return ` !??\t uicInconsistent/checkmultiple ${use}: ${k}, `;
        if(!k || v.filter((f,i) => f.properties.use !== "J").length > 1)
            throw Error(`uicInconsistent/multi-inconsistent ${JSON.stringify(v)}: ${k || jokeruic(v[0],k)}`,NODEKO);
        return "";
    };
if(logok) console.log("run_>>> uicInconsistent:");
    let log = "";
    mmap.forEach((val,key) => log += val.length > 1? checkMultiUIC(val,key) : checkAlone(val,key));
    return log? "\n"+log : "";
}
function ambiguities (val,key,log) {
    const searchBaseNode = arr => arr.filter(x => x.properties.use !== "J");
    const everyCode_IsOk = arr => arr.every(x => x.properties.uic === arr[0].properties.uic);
    const expectingANode = (use) =>
        !isRegularGareValue(use)? `\nBRANCH(${use}) EXPECTED? ${key}` : '';
    //
    const baseNode = searchBaseNode(val);
    if(!everyCode_IsOk(val))
        throw Error(`same ID diff UIC:${JSON.stringify(val[0])}`,NODEKO);
    if (baseNode.length !== 1)
        throw new Error(`USE at:${JSON.stringify(val[0])}`,NODEKO);
    if(val.length === 1) log += expectingANode(baseNode[0].properties.use);
    return log; 
}
function dupcodities (val,key,log) {
    const everyIdOk = arr => arr.every(x => x.properties.id === arr[0].properties.id);
    if(!everyIdOk(val))
        throw Error(`same UIC diff ID:${JSON.stringify(val[0])}`,NODEKO);
    if(val.length === 1)
        if(val[0].properties.uic && isNaN(val[0].properties.uic))
            log += `\nUIC-USELESS VALUE: ${val[0].properties.uic}`;
    return log;
}
// runtime
if(logok) console.log("run_>>> verifiesUIC:");
const libmap = mapifyProperty(features,"id");
const histId = histogramOfmap(libmap);
const uicmap = mapifyProperty(features,"uic");
const histoUic = histogramOfmap(uicmap);
let log = "\n-- checking for nodes 'id'.vs.'uic'.vs.'use' consistency";
log += `\n  .libX[${histId.length}]: ${histId} /UNOS: ${libmap.size} id`;
log += `\n  .uicX[${histoUic.length}]: ${histoUic} /UNOS: ${uicmap.size} uic`;
log += `\n  .use breakdown[${mapifyProperty(features,"use").size}]:${histoByProperty(features, "use", true)}`;
libmap.forEach((val,key) => log + ambiguities(val,key,log));
uicmap.forEach((val,key) => log + dupcodities(val,key,log));

let ff= features; //.filter(f => f.properties.use !== "X"); // ignores "pseudo-nodes"
let libnum = mapifyProperty(ff, f => ["id","num"].reduce((cum,x,i) => cum+(i?"_":"")+f.properties[x], ""));

let libuic = mapifyProperty(ff, f => ["id","uic"].reduce((cum,x,i) => cum+(i?"_":"")+(f.properties[x]||""), ""));

log += `\n\n-- node id/uic: single=${histoUic[0]} ; multiple=${histoUic.reduce((ac,h,i) => ac + (i*h), 0)}`;
log += libmap.size !== uicmap.size ? ` !??\t warning: ${uicmap.size} != ${libmap.size}` : "";
log += uicInconsistent(libmap);
log += `\tUNOS: ${uicmap.size} uic, ${libmap.size} id, DUOS: ${libuic.size} id-uic, ${libnum.size} id-num`;
log += `\n  .libX[${histId.length}]: ${histId} ${logOversizedPp(libmap, logUicLibelDuf)}`;

let ambs = []; //, dups = [];
libmap.forEach((val,key) => {const vref = checkAmbiguity(val[0]); return val.length > 1? sameLib_difUic(ambs, val, vref) : undefined;});
log += ambs.length? `\n\t\t ¨¨_ambiguities: ${ambs.length} ${ambs.reduce((cum,d,i) => cum+(i > 0 && i <= MAXHISTOLENGTH?"-":"")+d,"")}${ambs.length > MAXHISTOLENGTH?" ...":""}` : " no ambiguities";
    log += `\n  .uicX[${histoUic.length}]: ${histoUic} ${logOversizedPp(uicmap, logUicLibelDif)}`;
const dups = probableDuplis(libnum);
log += dups.length? `\n\t\t ¨¨_duplicates: ${dups.length} ${dups.reduce((cum,d,i) => cum+(i > 0 && i <= MAXHISTOLENGTH?"-":"")+d,"")}${dups.length > MAXHISTOLENGTH?" ...":""}` : " no duplicates";

return log;
}
*/
/* unused functions
function verifyLineConsistency(ff) {
	const check_consistency = (accum, f, i, t) => {
		let fp = f.properties;
		if(t.length === 1) log += `\n~?~\t ISOLATED GARE: ${fp.num}, ${fp.id}, ${fp.uic}`;
		if(i===0){
			let fn = t[t.length-1];
			if(!fp.info) console.log("check_consistency",JSON.stringify(fp));
			if(!(fp.info.includes("origin")))
				return void (log += `\n~?~\t no inforigin ${JSON.stringify(fp)}`) ||
				console.log(log) || void accum.push(f) || accum;
			if(!(fp.end))
				return void (log += `\n~?~\t no end ${fp.num}`) ||
				console.log(log) || void accum.push(f) || accum;
			if(fp.info.includes("terminus"))
				return void (log += `\n~?~\t extra terminus ${JSON.stringify(fp)}`) ||
				console.log(log) || void accum.push(f) || accum;
			if(!(fn.properties.info && fn.properties.info.includes("terminus")))
				return void (log += `\n~?~\t no terminus ${fn.properties.num}`) ||
				console.log(log) || void accum.push(fn) || accum;
		}else{
			if(fp.info?.includes("origin"))
				return void (log += `\n~?~\t extra inforigin ${fp.uic}`) ||
				console.log(log) || void accum.push(f) || accum;
			if(fp.end)
				return void (log += `\n~?~\t extra end ${fp.num} ${fp.uic}`) ||
				console.log(log) || void accum.push(f) || accum;
			if(i < t.length-1 && fp.info?.includes("terminus"))
				return void (log += `\n~?~\t extra terminus ${JSON.stringify(fp)}`) ||
				console.log(log) || void accum.push(f) || accum;
			if(parseFloat(fp.pk) <= parseFloat(t[i-1].properties.pk))
				return void (log += `\n~?~\t pk order: ${fp.num} ${fp.uic} ${fp.pk}`) ||
				console.log(log) || void accum.push(f) || accum;
		}
		return accum;
	};
	let inconsistencies = [];
if(logok) console.log("run_>>> verifyLineConsistency");
	const nummap = mapifyProperty(ff,"num");
	let log = "\n-- checking GARE line-consistency:";
	nummap.forEach((v,k) => v.reduce((ac,f,i,t) => check_consistency(ac,f,i,t, log), inconsistencies));
	if(inconsistencies.length > 0){
		log = `\n.inconsistencies.length=${inconsistencies.length}: log`;
		log += "\n" + inconsistencies.reduce((ac,f,i) => ac + "\n? "+JSON.stringify(f.properties), "");
	}
	return log;
//	return inconsistencies;
}

function verifyInfoConsistency(ff, checkedGares) {
	const updatInfoGareWiki = (fp, wg, g) => {
		const cleansing = (str) => str.split("Gare_")[1].split(" ")[0]?.replace("_-_","-");
		if(fp.info?.includes("Gare_d") || fp.info?.includes("Halte_d")) return fp;
//		if(wg.endsWith(fp.id.replaceAll(" ","_").replace("_-_","-"))) {
		let fpg = fp.id.replaceAll(" ","_").replace("_-_","-");
		if(wg === "Gare_de_"+fpg || wg === "Gare_d'"+fpg) {
			fp.info = g + (fp.info? " "+fp.info : "");
			console.log("add", fp.info);
		}
		return fp;
	};

// 	const checkInfoPb = (inf, id) => inf? (inf.startsWith("Gare_de_")? (inf.split("Gare_de_")[1].split(" ")[0] !== id? true: false) : false) : false;
// 	ff.forEach(f => void (f.properties.use === "O" && checkInfoPb(f.properties.info, f.properties.id)? console.log("?", JSON.stringify(f.properties)) : 0));

// 	const gares2check = [...new Set(getGaresFrance(3))]; // checkedGares
// 	console.log("gares2check", getGaresFrance(3).length, gares2check.length);
// 	const gares3check = gares2check.map(g => g.replace("_-_","-"));
// 	ff.filter(f => (f.properties.use === "N" || f.properties.use === "ON")
// 					&& parseInt(f.properties.uic) == f.properties.uic
// 					&& (!f.properties.info || !f.properties.info.startsWith("Gare_d") ))
// 	  .forEach(f => gares3check.forEach((g,i) => updatInfoGareWiki(f.properties, g, gares2check[i])));

// 	const prefixedByGare = (str) => ["A","E","É","I","O","U","Y"].some(v => str.startsWith(v)) ? "Gare_d'"+str : "Gare_de_"+str;
// 	const candigares = ff.filter(f => f.properties.use === "N" && parseInt(f.properties.uic) == f.properties.uic).map(f => prefixedByGare(f.properties.id.replaceAll(" ","_")));
// 	console.log(" ");
// 	console.log(JSON.stringify(candigares));
// 	console.log(" ");

// 	const gares2check = [...new Set(checkedGares)];
// 	console.log("gares2check", checkedGares.length, gares2check.length);
// 	const gares3check = gares2check.map(g => g.replace("_-_","-"));
// 	ff.filter(f => f.properties.use === "N" || f.properties.use === "O" || f.properties.use === "ON" || f.properties.use === "T")
// 	  .forEach(f => gares3check.forEach((g,i) => updatInfoGareWiki(f.properties, g, gares2check[i])));
// 	const updateInfoJ = (fp) => {let splitf = fp.info.split(" "); fp.info = splitf[1]? (void splitf.shift() || splitf.join(" ")): ""; return fp.info;};
// 	ff.forEach(f => void (f.properties.use === "J" && f.properties.info?.startsWith("Gare_d")? console.log("J", updateInfoJ(f.properties)) : 0));
// 	ff.forEach(f => void (f.properties.info ? 0 : delete f.properties.info));
// 	ff.forEach(f => void (f.properties.cc ? 0 : delete f.properties.cc));
// 	ff.forEach(f => void (f.properties.nom ? 0 : delete f.properties.nom));

	const removeExtra = (str,extra) => {let intra = extra+str.split(extra)[1].split(" ")[0]; return str.replace(intra,"gare");};
	ff.forEach(f => void (f.properties.info && f.properties.info.includes("Gare_d")? (f.properties.info = removeExtra(f.properties.info,"Gare_d")) : 0));
	return ff;
}


function updataUseOfGare(ff){
	const closerToA_thanToB = ([x,y],[ax,ay],[bx,by]) => (x-bx)**2 + (y-by)**2 >= (x-ax)**2 + (y-ay)**2;
	const betterAmong_AandB = (g,cur,prev) => closerToA_thanToB(g.geometry.coordinates, cur.geometry.coordinates, prev.geometry.coordinates)? cur : prev; // TODO...
	const bestIn_LineString = (g, ls) => ls.reduce((ptprev, ptcur) => betterAmong_AandB(g, ptcur, ptprev), [0,0]);
	const bestInListofGares = (g, ls) => ls.reduce((gprev, gcur) => betterAmong_AandB(g, gcur.geometry.coordinates, gprev.geometry.coordinates), [0,0]);
	const list2BeProcessedB = (list) => list.length===1 && list[0].properties.use === "B";
	const list2BeProcessedJ = (list) => list.some(f => f.properties.use === "J") && (list.length===1 ||
	list.filter(f => f.properties.use === "J").length !== list.length-1);
	const countCorrectionBJ = (v,k,tt) => console.log(`updataUseOf_Gare:${v[0].properties.use}:`, k, tt) || console.dir(v[0].properties);
	//tt%50? "" : console.log(`updataUseOf_Gare:${v[0].properties.use}:`, k, tt);

	const sortByNumOfLignes = (fpa, fpb) => (fpa.num - fpb.num); // (fpa.num === fpb.num)? (fpa.pk0 - fpb.pk0) : (fpa.num - fpb.num);
	const checkUSE_ofFirstJ = (f0, tlen) => tlen>1? void (f0.properties.info = (f0.properties.info? (f0.properties.info + " +jj") : "+jj")) || f0 : f0;
	const check_USE_ofNextJ = (f0, fn) => {
		let fnuse = fn.properties.use;
		if(fnuse === "B") {if(fnuse !== f0.properties.use) console.log("check_USE_of_Next:'B'", f0.properties.uic); return fn;}
		if(fnuse === "J" || fnuse === "A" || fnuse === "X" || fnuse.charAt(0) === "F") return fn;
		if(fnuse !== f0.properties.use && f0.properties.use !== "J")
			console.log("updataUseOf_Gare:check_USE_of_Next:PwoBlem", f0.properties.id, fn.properties.use, f0.properties.use);
		fn.properties.use = "J"; delete fn.properties.nom; delete fn.properties.cc;
		fn.properties.info = (fn.properties.info? fn.properties.info + " +" : "+") +f0.properties.num;
		return fn;
	};
	const check_USE_ofNextB = (f0, fn) => {
		let fnuse = fn.properties.use;
		if(fnuse === "B") {if(fnuse !== f0.properties.use) console.log("check_USE_of_Next:'B'", f0.properties.uic); return fn;}
		return fn;
	};
	const getUSE_andUpdateJ = (f, i, t) => i? check_USE_ofNextJ(t[0], f) : checkUSE_ofFirstJ(f,t.length);
	const getUSE_andUpdateB = (f, ff) => {
		const bestg = ff.reduce((acc, cur) => (!(cur.properties.num.endsWith("000")) || cur.properties.num === f.properties.num || cur.properties.uic === f.properties.uic) ? acc : betterAmong_AandB(f, cur, acc));
		if(false) console.log(`bestInListofGares`, f.properties.id, f.properties.num, f.properties.uic, "->", bestg.properties.id, bestg.properties.num, bestg.properties.uic, " = ",
			parseInt(100*distanceGreatCircleInKm2(f.geometry.coordinates,bestg.geometry.coordinates))/100);
		return f;
	};
	const checkUSEandUpdate = (nf, newfeatures) => void newfeatures.push(nf) || nf;
	const replaceBy_Updated = (f, nf) => nf || f;
	const listOfBto_becomeJ = (f, map) => {
		let list = map.get(f.properties.uic);
		if(list.some((g,i) => i && g.properties.num === f.properties.num)) return void (f.properties.use = "J") || f;
		return f;
	};
// run
	//if(verifyLineConsistency(verifyInfoConsistency(ff, getGaresFrance(2)))) return ff;   ?????????????? TODO xxxxxxxxxx  expectedGaresON
if(logok) console.log(`run_>>> updataUseOfGare`);
	ff.sort((a,b) => sortByNumOfLignes(a.properties, b.properties));
	let newfeatures = [], newfeaturesB = [];
	let uicmap = mapifyProperty(ff,"uic");
	let todos = 0;
	uicmap.forEach((v,k) => list2BeProcessedJ(v)? countCorrectionBJ(v,k,todos++) : undefined);
    let log = `\n-- updataUseOfGare/J: ${todos>1? "ToDoJs= "+todos : "ok"}`;
	if(todos){ todos = 0;
		uicmap.forEach((v,k) => v.map((f,i,t) => checkUSEandUpdate(getUSE_andUpdateJ(f,i,t),newfeatures)));
		ff = ff.map(f => replaceBy_Updated(f, uicmap.get(f.properties.uic).find(v => v.properties.num === f.properties.num)));
	}
	uicmap.forEach((v,k) => list2BeProcessedB(v)? checkUSEandUpdate(getUSE_andUpdateB(v[0],ff), newfeaturesB) : undefined);
	todos = newfeaturesB.length;
	if(todos === 0){
		ff = ff.map(f => f.properties.use === "B"? replaceBy_Updated(f, listOfBto_becomeJ(f, uicmap)) : f);
	}
        log += `\n                  /B: ${todos? "ToDoBs= "+todos : "ok"}`;
    dumpLOG += log;
	ff.forEach(f => {if(f.properties.use === "B" && uicmap.get(f.properties.uic).length < 2)
                        console.log(JSON.stringify(f.properties));});
	if(false){
		uicmap.forEach((v,k) => v.map((f,i,t) => checkUSEandUpdate(getUSE_andUpdateB(f,ff), newfeatures)));
		ff = ff.map(f => replaceBy_Updated(f, uicmap.get(f.properties.uic).find(v => v.properties.num === f.properties.num)));
		if(newfeatures.length) console.log("== updataUseOf_Gare/checkUSEandUpdate newfeatures.length:", newfeatures.length, "\n", JSON.stringify(newfeatures).slice(0,800));
	}
	return ff;
}
*/
/*
            //const byline = ff.reduce((acc,f,i,t) => groupbyline(f,i,t), []);
            let inconsistencies = [];
            nummap.forEach((v,k) => v.reduce((ac,f,i,t) => check_consistency(ac,f,i,t, log), inconsistencies));
            log += ` inconsistencies=${inconsistencies.length}`;
            if(inconsistencies.length > 0){
if(logok) console.log("run_>>> line inconsistencies:");
                log += "\n" + inconsistencies.reduce((ac,f,i) => ac + "\n? "+JSON.stringify(f.properties), "");
            }
*/
/*
        function OLD_verifyNodeConsistency(ff, pays){
            function ambiguities (val, id) {
                const multPseudoNode = arr => arr.every(x => x.properties.use === "X");
                const uniqueBaseNode = arr => arr.filter(x => x.properties.use !== "J").length === 1;
                const everyCode_IsOk = arr => arr.every(x => x.properties.uic === arr[0].properties.uic);
                const expectingANode = (id, use) =>
                    REGULARNODES.includes(use)? "" : `\n  WARNING *** BRANCH(${use}) EXPECTED? ${id}`;
                //
                if(multPseudoNode(val)) return ""; // exception: ignore uic when use="X"
                if(!uniqueBaseNode(val))
                    throw new Error(`check multiples of:${JSON.stringify(val[0])}`,NODEKO);
                if(val.length === 1) return expectingANode(id, val[0].properties.use);
                else if(!everyCode_IsOk(val))
                    throw Error(`same ID diff UIC:${JSON.stringify(val[0])}`,NODEKO);
                return ""; 
            }
            function dupcodities (val, uic, pays) {
                const everyIdOk = arr => arr.every(x => x.properties.id === arr[0].properties.id);
                const uselessUIc = (uic, use) =>
                    REGULARGARES.includes(use) && uic && isNaN(uic) && uic.startsWith(pays) ? `\nUIC-USELESS VALUE: ${uic}` : "";
                if(val.length === 1) return MORELOGS ? uselessUIc(uic, val[0].properties.use) : "";
                if(!everyIdOk(val))
                    throw Error(`same UIC (or =pk) diff ID:${JSON.stringify(val[0])}`,NODEKO);
                return "";
            }
            const gAbroad = (fp, pays) => !fp.use.includes("F") && (fp.uic && !fp.uic.startsWith(pays));
            const ggCount = (mmm,uses) => uses.reduce((acc,key,i,t) => acc + countWithinMap(mmm, key), 0);
        // runtime :
            verifyNodeContinuity(ff,pays);
// see behind logok
            return log;
        }
//*if(logok) console.log("run_>>> verifyNodeConsistency:");
            const uicmap = mapifyProperty(ff,"uic");
            const usemap = mapifyProperty(ff,"use");
            let log = ""; //`\n-- use breakdown ${usemap.size}:${histoByProperty(ff, "use", true)}`;

            const libmap = mapifyProperty(ff,"id");
            const histoUic = histogramOfmap(uicmap);
            const histId = histogramOfmap(libmap);
            log += `\n  .libX[${histId.length}]: ${histId} /UNOS: ${libmap.size} id`;
            log += `\n  .uicX[${histoUic.length}]: ${histoUic} /UNOS: ${uicmap.size} uic`;
            libmap.forEach((val,key) => log += ambiguities(val,key));
            uicmap.forEach((val,key) => log += dupcodities(val,key));
            const njunct = [...uicmap].filter(([k, v]) => v.length > 1).length;
            log += `\n  gares(unique): ${ggCount(usemap,REGULARGARES)}, junctions: ${njunct}, border-Xing: ${ggCount(usemap,BORDERNODES)}, gares étranger: ${ff.filter(f => gAbroad(f.properties, pays)).length}`;
if(logok) console.log(`verifyNodeConsistency ${log}`);
*/
/*
        function OLD_verifyLineConsistency(ff) {
            const updateEndInfo = (end,info) => end +" "+ info; // TODO better!
            const check_lineorig = (fp) => {
                if(!fp.end)
                    throw Error(`BAD LINE ORIGIN : no END property ${JSON.stringify(fp)}`,LINEKO);
                if(!fp.info?.includes("origin") && !fp.end.includes("orig"))
                    throw Error(`BAD LINE METADATA ${JSON.stringify(fp)}`,LINEKO);
                if(fp.info?.includes("origin") && !fp.end.includes("orig"))
                    return (fp.end = updateEndInfo(fp.end, fp.info));
            };
            const check_lineterm = (fp) => {
                if(!fp.info || !fp.info.includes("termin"))
                    throw Error(`NO LINE TERMINUS ${JSON.stringify(fp)}`,LINEKO);
                return fp;
            };
            const check_linethru = (fp) => {
                if(fp.info?.includes("origin")) throw Error(`EXTRA ORIGIN ${JSON.stringify(fp)}`,LINEKO);
                if(fp.info?.includes("termin")) throw Error(`EXTRA TERMINUS ${JSON.stringify(fp)}`,LINEKO);
                if(fp.end) throw Error(`EXTRA END DATE METADATA ${JSON.stringify(fp)}`);
                return fp;
            };
            const check_linerank = (f, fprev) => {
                const warnPk = (dp,dg) =>
                    dg < Math.EPSILON || (Math.abs(dp - dg) > 4*dg && Math.abs(dp - dg) > INTERPKMX);
                if(f.properties.pk <= fprev.properties.pk)
                    throw Error(`PK order: ${JSON.stringify(f.properties)}`,LINEKO);
                const dp = parseInt(10*parseFloat(f.properties.pk) - 10*parseFloat(fprev.properties.pk))/10;
                const dg = distanceGreatCircleInKm(f.geometry.coordinates, fprev.geometry.coordinates);
                let log = "";
                if(warnPk(dp, dg))
                    log = `\nDPK>${INTERPKMX} ${(dp-dg).toFixed(2)} = ${dg.toFixed(2)} -${dp} ${JSON.stringify(f.properties)}`;
                return log;
            };
            const check_line1234 = (f,i,t) => {
                let fp = f.properties;
                if(t.length < 2) throw Error(`LINE WITH A SINGLE NODE: ${JSON.stringify(fp)}`,LINEKO);
                let log = "";
                if(i===0) check_lineorig(fp);
                else {
                    if(i===t.length-1) check_lineterm(fp);
                    else check_linethru(fp);
                    log += check_linerank(f, t[i-1]);
                }
                return log;
            };
            const groupByLine = (v,k,ff) => {
                const compline = (v,w) => //(v.length === w.length) &&
                    v.every(x => w.find(y => y.properties.id === x.properties.id) ||
                            console.error(`missing: ${JSON.stringify(x.properties)}`));
                let ik = ff.findIndex(f => f.properties.num === k);
                let jk = ff.findLastIndex(f => f.properties.num === k);
                if(ik < 0) throw Error(`let's rather check line ${k}`,LINEKO);
                if(!check_lineorig(ff[ik].properties.end))
                    throw Error(`wrong line_origin ${ff[ik].properties.end}`,LINEKO);
                if(!check_lineterm(ff[jk].properties.end))
                    throw Error(`wrong line_terminus ${ff[jk].properties.end}`,LINEKO);
                if(jk <= ik) throw Error(`check line ${k} length`,LINEKO);
                const lineofk = ff.slice(ik, jk+1);
                // lineofk can be used to lignifying gares
                const innerofk = lineofk.slice(1,-1);
                //.forEach(f => console.log(f.properties.num,f.properties.id));
                // inner lineof not including origin and terminus, can be empty
                if(innerofk.some(f => f.properties.num !== k))
                    throw Error(`Line ${k} mix-messing`,LINEKO);
                // analyze lineofk NOW
                const linek = [];
                do {
                    if(ff[ik].properties.num !== k)
                        throw Error(`Line ${k} mix-messing`,LINEKO);
                    linek.push(ff[ik]); ik++;
                } while(ik <= jk); // while(ff[ik]?.properties.num === k);
                if(!compline(linek,v)) throw Error(`Some Line Mixing`,LINEKO);
                return linek;
            };
        // runtime :
if(logok) console.log("run_>>> verifyLineConsistency: no num intermix, ok pk order, ok origin-termin ...");
            const nummap = mapifyProperty(ff,"num");
            let log = "\n-- line-consistency:" +nummap.size+ " ... ";
            nummap.forEach((v,k) => groupByLine(v,k,ff).forEach((f,i,t) => (log += check_line1234(f,i,t))));
            return log + "looks ok"; // no inconsistencies thrown in error
        }

            const OLD_check_consistency = (accum, f, i, t, log) => {
//if(logok) console.log(`run_>>> check_consistency ${i} ${f.properties.num}`);
                let fp = f.properties;
                if(t.length < 2) throw Error(`\n~?~\t LINE WITH A SINGLE NODE: ${fp.num}`,LINEKO);
                if(i===0) check_lineorig(fp);
                else {
                    if(i===t.length-1) check_lineterm(fp);
                    else check_linethru(fp);
                    check_linerank(fp, t[i-1].properties);
                }
// ...
                if(i===0){
                    let fn = t.at(-1); //t[t.length-1];
                    if(!fp.info) console.log("check_consistency",JSON.stringify(fp));
                    if(!(fp.info.includes("origin")))
                        return void (log += `\n~?~\t no inforigin ${JSON.stringify(fp)}`) ||
                        console.log(log) || void accum.push(f) || accum;
                    if(!(fp.end))
                        return void (log += `\n~?~\t no end ${fp.num}`) ||
                        console.log(log) || void accum.push(f) || accum;
                    if(fp.info.includes("terminus"))
                        return void (log += `\n~?~\t extra terminus ${JSON.stringify(fp)}`) ||
                        console.log(log) || void accum.push(f) || accum;
                    if(!(fn.properties.info && fn.properties.info.includes("terminus")))
                        return void (log += `\n~?~\t no terminus ${fn.properties.num}`) ||
                        console.log(log) || void accum.push(fn) || accum;
                }else{
                    if(fp.info?.includes("origin"))
                        return void (log += `\n~?~\t extra inforigin ${fp.uic}`) ||
                        console.log(log) || void accum.push(f) || accum;
                    if(fp.end)
                        return void (log += `\n~?~\t extra end ${fp.num} ${fp.uic}`) ||
                        console.log(log) || void accum.push(f) || accum;
                    if(i < t.length-1 && fp.info?.includes("terminus"))
                        return void (log += `\n~?~\t extra terminus ${JSON.stringify(fp)}`) ||
                        console.log(log) || void accum.push(f) || accum;
                    if(parseFloat(fp.pk) <= parseFloat(t[i-1].properties.pk))
                        return void (log += `\n~?~\t pk order: ${fp.num} ${fp.uic} ${fp.pk}`) ||
                        console.log(log) || void accum.push(f) || accum;
                }
// ...
                return accum;
            };

			const warningUse = (f, use, kas) => `\n${kas}:${use}-${f.properties.use}-${JSON.stringify(f.properties)}`;
			const checkAlone = (f) => f.properties.use === "B" || f.properties.use === "J" ? warningUse(f,f.properties.use,"checkAlone") : "";
			const checkMulti = (v) => {
				if(nodeIsaGare(v[0]))
                    return v.some((f,i) => i && f.properties.use !== "J")? warningUse(f,use,"?_Multi") : "";
				let use = v[0].properties.use;
// ??
if(logok & false) console.log("checkMulti:", use, JSON.stringify(v[0].properties));

				if(use === "B" && v.length > 1) return v[1].properties.use === "J" ? "" : "b";
				if(use === "J") return warningUse(f,use,"J wrongFirst");
				if(use === "B" && v.length === 1) return warningUse(f,use,"B checkAlone");
				return v.some((f,i) => i && f.properties.use !== use)? warningUse(f,use,"?_Multi") : "";
*/

/*
function ODL___kmlparser(str){
	const getName = (str) => str.split("</name>")[0].trim();
	const fiveDec = (x) => Math.round(100000 * x)/100000;
	const getCoor = (str) => (str.split("<coordinates>")[1].split(",0")[0].trim()).split(",")
		.map(x => fiveDec(parseFloat(x)));
	const getItem = (str) => str.split("</coordinates>")[0].trim();
	const getLnId = (list) => list.join();
	const getLnDf = (ori) => ori.reduce((ac,s,i) => i>1? ac+"_"+s : s, "");
	const getURLn = (ln) => ln.replace(" ","_")+"_(Infrabel)";
	const getOrig = (ori) => `,"info":"origin:${getURLn(ori[0])} ${getLnDf(ori)}","end":"validto"`;
	const getTerm = () => `,"info":"terminus"`;
	const getInfo = (i) => (i===0? getOrig(lineId) : (i===imax? getTerm() : ""));
	const getGare = (s,i) => getName(s) +",["+ getCoor(s) +"]"+ getInfo(i,imax,lineId);
	const feature = (num,s,i) => 
`{"properties":{"num":"B0${num}","pk":${dd*i},"uic":"88${num}_${dd*i}","use":"N","id":"${getName(s)}"${getInfo(i)}},"type":"Feature","geometry":{"type":"Point","coordinates":[${getCoor(s)}]}}`;
// run
// run 2
	const dd = 2; // default: mean dist between 2 gares for default PK
	const list = str.split("<name>");
	console.log(getName(getItem(list[1])));
	const lineId = getName(getItem(list[1])).split(" - ");
	list.shift();list.shift();
	const imax = list.length-1;
	const num = lineId[0].split(" ")[1];
	console.log(num,lineId);
	let rest = list.map((s,i) => getGare(getItem(s),i));
	console.log(rest);
	 rest = list.map((s,i) => feature(num,getItem(s),i));
	console.log(rest.join(",\n") + ",");
	return list.map((s,i) => JSON.parse(feature(num,getItem(s),i)));
}
*/
