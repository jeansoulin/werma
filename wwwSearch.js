/* WIKI SEARCH web Worker
 * ********************* */
import { dumpErrorCause, getWWname, VGI_formater } from './tierWebSearch.js';
import { getGareInfo } from './infogares.js';
import { getLineInfo } from './infolines.js';

let WW = getWWname(import.meta.url);
let DUMPLOG = WW;

// application constants
const WIKIRADIUS = 500; // search 500 meters around the picked location
  // TODO: WIKIRADIUS should depend on resolution: context().wikiradius() cf. makemaphelpers#getWikiRadius
const LANGARRAY = {"80":["de","en"], "81":["de"], "82":["de","fr"], "83":["it"], "84":["nl"], "85":["de","fr"], "87":["fr"], "88":["fr","nl"]};
const WIKIARRAY = {"80":["wd","we"], "81":["de"], "82":["wd","fr"], "83":["wi"], "84":["wn"], "85":["de","fr"], "87":["wf"], "88":["wf","wn"]};
const WIKIWORDS = {
    "wn":["Spoorlijn_","S-trein_","Tramlijn"],
    "wf":["Ligne_","Chemin","Train","Tramway","Métro","Ancien", "Réseau","Compagnie","Société","Régie","Voie","Ceinture","LGV","CEVA"]
};
const WORDS4GARE = ["origin", "termin", "haf", "halt", "gare", "stati", "rebrouss", "dépot"];
const WORDS4STOP = ["G", "H", "A", "AF", "haf", "gg"];
// expected from Wikipedia:
const ACCEPTEDNAME = [
    "gare", "stati", "halt", "bahnhof", "stazion",
    "dépot", "depot", "triage",
    "railway","tunnel","viaduc","pont "];

const GARE = 'gare', LINE = 'line', AREA = 'area';
//const idofitem = fp => fp.id || fp.num; //ID of GARE is 'id',  of LINE is 'num'
//const idofitem = fp => (fp.type===GARE) ? fp.id : fp.num;

/* to check if some vgi is imported: eg. 'infogares.js', 'infolines.js' ... */
function addInfoFromImport(importInfo, fp){
    //ID of GARE: 'id',  of LINE: 'num', of AREA: 'cc' in WERMA format
    //it works because LINE has no 'id' (instead 'lid' for its name) !WERMA
    const keyID = fp => fp.id || fp.num; //fp.cc;
    if(!importInfo) return false;
    return importInfo(fp.country, keyID(fp));
}


// runtime: expected e = [picklist, lonlat]
self.onmessage = function(event) {
    console.log(`$ {WW}::activated """""""""""""""""""""""""""""""""""""""""""""""" `);
    try{
        console.log(`${WW}::[${JSON.stringify(event.data[0])}, ${event.data[1].join()}]`);

        hitPointData(event.data[0], event.data[1]);
        return event;
    }catch(error){dumpErrorCause(error, DUMPLOG)}
};
self.onerror = (event) => {console.error(`${event.type} error in ${DUMPLOG}`)};

/* mapVGIsites: provides a list of VGI websites, including wikipedia, which may
 * be present in the 'info' property of a 'gare' or 'line', in the form xx:art
 * with xx = 2 characters abbreviation of the VGI target
 * with art= single name | image name | partial htm address
 * TO BE CONT'D ... with websites containing at least several dozen documents
 */
function mapVGIsites(){
    const franceFerro = (jpg) => "https://www.france-ferroviaire.info/Test/modules/FranceFer/LienImgRef.php?ID_Res=272&ID=" + jpg; // &width=640&height=480 ID_Res=272&
    const archeoFerro = (art) => "http://archeoferroviaire.free.fr/v31/spip.php?article" + art;
    const lignesOubli = (art) => "https://www.lignes-oubliees.com/index.php?act=" + art;
    const fabandonata = (art) => "https://www.ferrovieabbandonate.it/linea_dismessa.php?id=" + art;
    const inventFerro = (art) => `http://www.inventaires-ferroviaires.fr/hd${art}`;
    const massifcentf = (art) => `http://www.massifcentralferroviaire.com/fiches/fichegar_n.php?VARobjetID=${art}`;
    const routesWSara = (name) => `https://routes.fandom.com/wiki/${name}`;
    const trainsWSara = (name) => `https://trains.fandom.com/wiki/${name}`;
    const cheminsTrav = (art) => `http://chemins.de.traverses.free.fr/${art}`; // ex. art:Cahors_Moissac/Index.htm
    //const rail21Franc = (html) => `https://rail21.pagesperso-orange.fr/${html}.html`;
    const rail21Franc = (html) => `http://fbrisou.free.fr/RAIL21/${html}.html`;
    const railBelgium = (jpg) => `https://www.railstation.be/wp-content/uploads/2022/02/${jpg}.jpg`;
    const railBelgiqu = (art) => `https://www.railstation.be/${art}`;
    const garesbelges = (art) => `https://www.garesbelges.be/${art}`;
    const wikipediaDE = (name) => `https://de.wikipedia.org/wiki/${name}`;
    const wikipediaEN = (name) => `https://en.wikipedia.org/wiki/${name}`;
    const wikipediaFR = (name) => `https://fr.wikipedia.org/wiki/${name}`;
    const wikipediaIT = (name) => `https://it.wikipedia.org/wiki/${name}`;
    const wikipediaNL = (name) => `https://nl.wikipedia.org/wiki/${name}`;
    const http_global = (link) => `http://${link}`;
    const httpsglobal = (link) => `https://${link}`;
    // http://tramateurs.free.fr/
    // http://www.photos-de-trains.net/
    const vgiMap = new Map([
        ["https", httpsglobal], ["http", http_global],
        ["ff", franceFerro], ["af", archeoFerro], ["lo", lignesOubli],
        ["IF", inventFerro], ["mc", massifcentf], ["sa", routesWSara],
        ["vu", rail21Franc], ["sb", trainsWSara], ["ct", cheminsTrav],  //"21"
        ["rb", railBelgium], ["rq", railBelgiqu], ["gb", garesbelges],
        ["wd", wikipediaDE], ["we", wikipediaEN], ["wf", wikipediaFR],
        ["wi", wikipediaIT], ["wn", wikipediaNL], ["fa", fabandonata]]);
    return vgiMap;
}

function setLangList(list){
    const texthas = (txt, code) => txt.includes(`"country":"${code}"`);
    const sellangs = new Set();
    const text = JSON.stringify(list);
    const setset = uic => LANGARRAY[uic].forEach(lang => sellangs.add(lang));
    for(const uic in LANGARRAY)
        if(texthas(text, uic)) setset(uic);
    return [...sellangs];
}

const vgiUrlof = (vgikey, v) => mapVGIsites().get(vgikey)(v);  // TODO for all values
function setVGI(fp, getInfoFile, vgiCodes){
    function addInfoListToVGI(vgi, vgilist){
        if(vgilist) vgi = vgiCodes.reduce((ac,key) => updateVgi(ac, key, vgilist[key]), vgi);
        return vgi;
    }
    //depending on gare/line: fp.id/fp.num
    const okstring = v => ""+v;
    const wValueIsOk = (val) => val && (Array.isArray(val) ? val.map(v => okstring(v)) : [okstring(val)]);
    const updateVgi = (ac, key, val) => {
        if(!val) return ac;
        let newval = wValueIsOk(val).map(v => vgiUrlof(key, v));
        if(ac[key]) newval.forEach(nv => {if(!ac[key].includes(nv)) ac[key].push(nv)});
            //TODO: if(ac[key]) addon(ac[key], val)
        else ac[key] = newval; //wValueIsOk(val).map(v => vgiUrlof(key, v));
//        ac[key] = val;
        return ac;
    };
    let vgi = {};
    if(fp.vgi) vgi = vgiCodes.reduce((ac,key) => updateVgi(ac, key, fp.vgi[key]), vgi);
    vgi = addInfoListToVGI(vgi, addInfoFromImport(getInfoFile, fp));
//    if(getInfoFile) vgi = addInfoListToVGI(vgi, addInfoFromImport(getInfoFile, fp));
//    if(getInfoFile) vgi = addInfoListToVGI(vgi, getInfoFile(fp.country, idofitem(fp)));
    if(Object.keys(vgi).length > 0) fp.vgi = vgi;
    return fp;
}

const newestao = (fp, w) => `${w}.${fp.num}.k${Math.round(fp.pk)} `;
function parseInfoProperty(fp, words, codes){
    const valArray = v => v.startsWith('[') && v.endsWith(']');
    const valHTTPs = v => v.startsWith("//") ? ([v.slice(2)]) : ([""+v]);
    const arrayVal = v => v.slice(1, -1).split(',').map(s => ""+s);
    const cleanVal = v => !v ? false : (valArray(v) ? arrayVal(v) : valHTTPs(v));
    const mergeVal = (oldv,newv) => {
        return oldv ? (void (!oldv.includes(newv)? oldv.push(newv[0]) : 0) || oldv) : newv;
    };
    const updatVGI = (fp, code, val) => {
        val = cleanVal(val);
        if(!val) return false;
        if(!fp.vgi) {fp.vgi = {}; fp.vgi[code] = val;}
        else {fp.vgi[code] = mergeVal(fp.vgi[code], val);}
        return fp;
    };
    const addalias = ([k,v]) => (k==="a" && v)? (fp.alias = v) : false;
    const addtovgi = (code, [k,v]) => (k===code) ? updatVGI(fp, k, v) : false;
    const add2keep = ([k,v]) => (`${fp.keep||""} ${k}:${v}`).trim();
    const keyvalBk = (fp, part, codes) => {
      let slice = part.split(":");
      if(addalias(slice)) return fp;
      if(codes.some(code => addtovgi(code,slice))) return fp;
      return void (fp.keep = add2keep(slice)) || fp;
        //eg. gare:1000m ... TODO or save in inforest
    };
    const simpleBk = (fp, part, words) => {
        let word = words.find(w => part.startsWith(w)) || "";
        if(word) fp.estado = [newestao(fp,word)];
        if(!word) fp.keep = ((fp.keep||"")+" "+part).trim();
        return fp;
    };
    const breakInP = (fp, part, words, codes) =>
        (part.includes(":")) ? keyvalBk(fp, part, codes) :
            simpleBk(fp, part, words);
    //run
    const parts = fp.info.trim().split(' ');
    for (const part of parts) {
        fp = breakInP(fp, part, words, codes);
    }
    fp.info = fp.keep; delete fp.keep;
    return fp;
}

function parseInfoGare(fp, words, codes){
    //run
    let estag = fp.line ? "origin" : (fp.origin ? "origin" : (fp.terminus ? "termin" : (fp.info?.includes("terminus") ? "termin" : (fp.stop ? fp.stop.charAt(0) : ""))));
    fp.estado = [newestao(fp, estag)];
    fp.num = [fp.num]; fp.pk = [fp.pk]; fp.use = [fp.use];
    //if(fp.stop && !fp.estado) fp.estado = [newestao(fp, fp.stop)];
    return fp.info ? parseInfoProperty(fp, words, codes) : fp;
}
function mergeVGI(fp, fpn) {
    const mergeVGIitem = (vg, vgn) => {
        for(const q in vgn){
            if(!vg[q]) vg[q] = vgn[q];
            else {
                if(Arrays.isArray(vg[q])){
                    vg[q].concat(vgn[q]);
                //TODO: to remove duplicates
                }
                else //always replace?
                    vg[q] = vgn[q];
            }
        }
        return vg;
    };
// TODO: check fp.vgi[ks] versus fpn.vgi[ks]
    if(!fp.vgi) fp.vgi = fpn.vgi;
    else {
        console.log(`fp/fpn.vgi ${JSON.stringify(fp.vgi)}  ${JSON.stringify(fpn.vgi)}`);
        fp.vgi = mergeVGIitem(fp.vgi, fpn.vgi);
//                    fp.vgi = Object.assign(fpn.vgi, fp.vgi);
    }
    return fp;
}
function mergeNewItem(ac, i, fp, newfp, isSameItem, mergeSameItem){
    if(i===0) {ac[0] = newfp; return ac}
    let ind = ac.findIndex(gp => isSameItem(gp, fp));
    if(ind < 0) ac.push(newfp);
    else ac[ind] = mergeSameItem(ac[ind], newfp);
    return ac;
}

function setGareInformation(list, vgiCodes){
    function mergmoregare(ac, fp, i, vgiCodes) {
        function mergeItems(fp, fpn){
//console.log(`mergeInfoString fp: ${JSON.stringify(fp)}`);
//console.log(`mergeInfoString newfp: ${JSON.stringify(fpn)}`);
            fp.num = fp.num.concat(fpn.num); // allow lines to loop
            fp.pk = fp.pk.concat(fpn.pk);
            fp.use = fp.use.concat(fpn.use);
            if(fpn.alias) fp.alias = fpn.alias; // only last alias???TODO
            fp.estado = fp.estado.concat(fpn.estado) || fpn.estado;
            if(fpn.inforest) fp.inforest = ((fp.inforest||"") +" "+ fpn.inforest).trim();
            if(fpn.vgi) return mergeVGI(fp, fpn);
            return fp;
        }
        const isSameItem = (gp, fp) => gp.id===fp.id;
        DUMPLOG = `mergmoregare ${i}/${list.length} `;
        let newfp = parseInfoGare(fp, WORDS4GARE, vgiCodes);
        return mergeNewItem(ac, i, fp, newfp, isSameItem, mergeItems);
    }
    if(list.length < 1) return [];
    DUMPLOG = "setGareInformationJJJ";
console.log(`${DUMPLOG} ${JSON.stringify(list)}`);
    let sublist = list.reduce((ac, f, i) => mergmoregare(ac,f,i,vgiCodes), []);
    if(typeof getGareInfo != "undefined")
        sublist = sublist.map(fp => setVGI(fp, getGareInfo, vgiCodes));
    return sublist;
}
function setLineInformation(list, vgiCodes){
    function parseInfoString(fp){
        function askWikiVGILinks (fp, prevgi) {
            const getURLof = lid => lid && lid.split("#")[0];
            const addVGInfo = (vgi, key, val) => (vgi[key] = val) && vgi;
            const browniWW = (lid, pays) => {
                    const vgi = {};
                    if(!lid) return null;
                    return WIKIARRAY[pays].reduce((ac, warray) => {
                        let wordok = WIKIWORDS[warray].find(w => lid.startsWith(w));
                        return wordok ? addVGInfo(ac, warray, lid) : ac;
                    }, vgi);
            };
            let vgi = browniWW(getURLof(fp.lid), fp.country);
            if(!vgi) return prevgi;
            return Object.assign((prevgi || {}), vgi);
        }
        const ask_Jeeves = (lid) => (typeof getLineInfo === "undefined") ? lid : getLineInfo(fp.country, fp.num)?.lid;
        const statusofline = fp => (fp.end && parseInt(fp.end) > 1830 && parseInt(fp.end) < 2025) ? `<b>&dagger;</b>${fp.end}` : `${fp.use}`;
        let lid = fp.lid || ask_Jeeves();
        if(lid) { fp.lid = lid; }
        fp.use = [fp.use];
        fp.pk0 = [fp.pk0||0];
        let len = fp.len || (fp.pkf && ((100*fp.pkf)-(100*(fp.pk0||0)))/100) || console.warn("bad pk/len values")||0.12345;
        fp.len = [len];
        fp.pkf = [fp.pkf || len];
        fp.end = [fp.end||"no"];
        fp.estado = [statusofline(fp)];
        if(fp.lid) fp.vgi = askWikiVGILinks(fp, fp.vgi);
        return fp;
    }
    function mergeotherli(ac, fp, i){
//const reformatline = fp => ({'num':fp.num, 'lid':fp.lid||"", 'len':fp.len, 'country':fp.country, 'info':fp.info||"", 'etat':statusofline(fp)});
        const mergeItems = (fpold, fp) => {
            fpold.estado.push(fp.estado);
            if(fp.info) ((fpold.info||"") +" "+ fp.info).trim();
            return fpold;
        };
        const isSameItem = (gp, fp) => gp.num===fp.num;
        // regular "WERMA" line or not (ex.: OSM-way)
        if(fp.num) {
            let newfp = parseInfoString(fp, vgiCodes);
            return mergeNewItem(ac, i, fp, newfp, isSameItem, mergeItems);
        }
/* console.log('else: not a fetched "regular" line (ex.: osm-way)');
        let newfp = {"lid": fp.name||fp.lid||fp.osm||"R"};
        if(fp.use) newfp.use = fp.use;
        ac.push(newfp);
SKIP: TODO: better */
        return ac;
    }
    if(list?.length < 1) return [];
    DUMPLOG = "setLineInformationJJJ"; console.log(`${DUMPLOG} ${JSON.stringify(list)}`);
    
    let sublist = list.reduce((ac, f, i) => mergeotherli(ac,f,i), []);
    if(typeof getLineInfo != "undefined")
        sublist = sublist.map(fp => setVGI(fp, getLineInfo, vgiCodes));
    return sublist;
}
function setAreaInformation(list){
    function parseInfoString(fp){
        let id = fp.nom || fp.name; // TODO BETTER  name, code, ...
        if(id) {fp.vgi = Object.assign((fp.vgi||{}), {"wf":[vgiUrlof("wf",id)]});}
        return fp;
    }
    function mergefeatures(ac, fp, i){
        const samearea = (gp, fp) => Object.keys(gp).some(k => gp[k] === fp[k]); // TODO better
        const mergesam = (fpold, fp) => Object.assign(fpold, fp, {"ok":"ok"});
        let newfp = parseInfoString(fp);
        return mergeNewItem(ac, i, fp, newfp, samearea, mergesam);
/*        if(i===0) ac.push(newfp);
        else {
            let ind = ac.findIndex(gp => samearea(gp,fp));
            if(ind < 0) ac.push(newfp);
            else ac[ind] = mergesam(ac[ind],newfp);
        }
        return ac;*/
    }
    if(list?.length < 1) return [];
    DUMPLOG = "setAreaInformationJJJ";
console.log(`${DUMPLOG} ${JSON.stringify(list)}`);
    let sublist = list.reduce((ac, f, i) => mergefeatures(ac,f,i), []);
    if(typeof getAreaInfo != "undefined")
        console.log("popup relevant area information");
    return sublist;
}
function setElseInformation(list) {
    const merge = (ac, fp, i) => {ac.push(fp); return ac;};
    if(list?.length < 1) return [];
    console.log(`${WW} ${(DUMPLOG = "OSM or else")} ${JSON.stringify(list)}`);
    let sublist = list.reduce((ac, f, i) => merge(ac,f,i), []);
    return sublist;
}

const isTypeOfGare = list => list.filter(f => f.type === "gare");
const isTypeOfLine = list => list.filter(f => f.type === "line");
const isTypeOfArea = list => list.filter(f => f.type === "area" || f.type === "town"); //legacy:town
 // OSM-type=way or any other type
const isTypeOfElse = list => list.filter(f => !(["gare","line","area","town"].some(t => f.type===t)));

function hitPointData(picklist, lonlat){
//simple coordinates, no feature at hit point: posting lonlat only
    if( !picklist || isNaN(picklist.length) || picklist.length < 1 )
        return postMessage(lonlat);
    try { //parse data collected at a list of features: direct, precompiled, Internet
        DUMPLOG = `${WW}/hitPointData *** PopupInfo`;
console.log(`${DUMPLOG} ${JSON.stringify(picklist)}`);
        const vgiCodes = [...mapVGIsites().keys()];
        let gali = setGareInformation(isTypeOfGare(picklist), vgiCodes);
        let lili = setLineInformation(isTypeOfLine(picklist), vgiCodes);
        let toli = setAreaInformation(isTypeOfArea(picklist));
        let elsi = setElseInformation(isTypeOfElse(picklist));
console.log(`${JSON.stringify(gali)}\n${JSON.stringify(lili)}`);
console.log(`${JSON.stringify(toli)}\n${JSON.stringify(elsi)}`);
        // set initial content to be posted back:
        let content = {"lola":lonlat, gali, lili, toli, elsi}; //gali, lili, toli
        DUMPLOG = ` ***** precompiled info`;
        return sendWikiGeoSearch(content, setLangList(picklist));
    } catch (err) {dumpErrorCause(err, DUMPLOG)}
}
/* what follows must remain global: sendWikiGeoSearch
 * *******************************  °°°°°°°°°°°°°°°°°
 * send a wikimedia geosearch request @lonlat coordinates
 * seek for all languages in 'lang' array (at least 1)
 * combine whatever result with the 'logdetails' HTML text
 * callback: internetQuery#receiveWikiGeoSearch
 */
const wikitongue = (lang) => `https://${lang}.wikipedia.org/`;

function queryWikiGeoSearch(lang, rd, lonlat){
    let qq = "action=query&list=geosearch&gscoord=lat|lon&gsradius=meters&gsnamespace=6&gsprimary=all"; // ???
    const cooFormated = ([lon,lat]) => `${lat}|${lon}`;
    const gc = cooFormated(lonlat);
    const wikiGAPI = `${wikitongue(lang)}w/api.php?action=query&list=geosearch`;
    const actionWG = `&gsradius=${rd}&gscoord=${gc}&format=json&origin=*`;
    return `${wikiGAPI}${actionWG}`;
}

async function sendWikiGeoSearch(content, langs, prevquery = null){
    const logEnding = (content) => {
        content.last = content.last?.replace("JOKER","").trim() || "";
        return content;
    };
    DUMPLOG = `sendWikiGeoSearch ***** {JSON.stringify(content)}`;
    if(langs.length < 1) return postMessage(VGI_formater(logEnding(content)));
    let tong = langs[0]; langs.shift(); //new tongue, decrement list of langs
    let query = queryWikiGeoSearch(tong, WIKIRADIUS, content.lola);
    const jsonr = fetch(query).then(a => a.json())
        .then(b => sendWikiGeoSearch(receiveWikiGeoSearch(content, tong, b.query.geosearch), langs))
        .catch(e => sendWikiGeoSearch(content, langs, query));
    return;
}

/* routine to receive answer from Wikimedia GeoSearch API cf. ACCEPTEDNAME */
function receiveWikiGeoSearch(content, lang, pages){
    //update the placeholder: {lonlat, ..., "last": addit+"JOKER" }
    const logUpdate = (content, log) => {
        log = log? (log + " JOKER") : "JOKER";
        content.last = content.last?.replace("JOKER", log) || log;
        return content;
    };
    const wikiendpoint = (p, lg) => `<a href="${wikitongue(lg)}?curid=${p.pageid}">${(p.title).replaceAll(" ","_")}</a>`;
    const relevantwiki = (txt) => ACCEPTEDNAME.some(n => (txt.toLowerCase()).includes(n));
    DUMPLOG += "receiveWikiGeoSearch ...";
    if(!Array.isArray(pages))
        return console.error("!!! bad wiki pages format\t\t!!!!!!!") || content;
    let log = "";
    try{
        pages.forEach(p => void (log += relevantwiki(p.title)? wikiendpoint(p, lang) : ""));
        return logUpdate(content, log);
    } catch  (error) {dumpErrorCause(error, "receiveWikiGeoSearch in ww");
    } finally {}
    return content;
}

/**
 * Extracts the most appropriate image from a Wikipedia page for a given location.
 * 
 * @param {string} locationName - The name of the location (e.g., a railway station).
 * @returns {Promise<string|null>} - The URL of the most appropriate image, or null if no suitable image is found.
 */
async function getLocationImage(locationName) {
    let prefix = "en"; //wikipediaPefix(countrycode); // the country prefix
    let prefixUrl = lg => `https://${lg}.wikipedia.org/w/api.php?action=query&`;
    let suffixUrl = tt => `titles=${tt}&prop=pageimages&format=json&pithumbsize=300`;
    
  try {
    // Construct the Wikipedia API URL
    const apiUrl = prefixUrl(prefix) + suffixUrl(encodeURIComponent(locationName));
    //`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(locationName)}&prop=pageimages&format=json&pithumbsize=300`;

    // Fetch the Wikipedia page data
    const response = await fetch(apiUrl);
    const data = await response.json();

    // Get the page ID and page image data
    const pageId = Object.keys(data.query.pages)[0];
    const pageImage = data.query.pages[pageId].pageimage;

    if (pageImage) {
      // Construct the image URL
      const imageUrl = `https://en.wikipedia.org/wiki/Special:Redirect/file/${encodeURIComponent(pageImage)}`;

      // Check if the image is the most appropriate (i.e., not a logo)
      if (!isLogo(imageUrl)) {
        return imageUrl;
      }
    }
    // If no suitable image is found, return null
    return null;
  } catch (error) {
    console.error('Error fetching location image:', error);
    return null;
  }
}
/**
 * Checks if the given image URL is likely to be a logo.
 * This is a simple heuristic that looks for common logo keywords in the URL.
 * 
 * @param {string} imageUrl - The URL of the image.
 * @returns {boolean} - True if the image is likely a logo, false otherwise.
 */
function hasLogo(imageUrl) {
  const logoKeywords = ['logo', 'emblem', 'seal', 'coat', 'crest'];
  return logoKeywords.filter(kw => imageUrl.toLowerCase().includes(kw)).join();
}
// Example usage
if(false) getLocationImage('London Victoria station')
  .then(imageUrl => {
    if (imageUrl) {
      console.log('Most appropriate image:', imageUrl);
    } else {
      console.log('No suitable image found.');
    }
  })
  .catch(error => {
    console.error('Error:', error);
  });
