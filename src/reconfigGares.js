/* Convert geoJson line/line
 */
const process = require('process');
const { dumpLOG, metaAnalysis, convertGares, fileFetch, saveSync } = require("./carp_modules/index.js");

// run time
const specif = process.argv.slice(2)[0] || "GaCARP_base";  // rfn2019-revision // railEurope // CARP // lineEurope

fileFetch(specif)
	.then(b => saveSync(JSON.stringify(convertGares(b, specif))))
	.catch(err => console.error(`reconfigGares: ${err}\n${dumpLOG}`));
