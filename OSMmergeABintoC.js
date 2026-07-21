// merge-geojson.js
// Merges A.geojson + B.geojson → C.geojson (unique by properties.osm)
import { count } from 'console';
import fs from 'fs/promises';  // Node.js
import { normalize } from 'path';

async function mergeGeoJSONFiles(fileA, fileB, outputFile) {
    // Helper to check uniqueness
    function addIfUnique(feature) {
      const osmId = feature.properties?.osm;    
      if (!seen.has(osmId)) {
        seen.add(osmId);
        uniqueFeatures.push(feature);
        return true;
      }
      return false;
    }
    const fiveDigit = num => Number(num.toFixed(5)); // 5 decimal places for coordinates
    function slugifyHard(str) {
        if (!str) return '';
        return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    }
    function normalized(feature) {
        const f = { ...feature };
        f.properties.osm = f.properties.osm || f.properties.lid.replace("OSM", "");
        if(f.properties.use === "rail") f.properties.use = "r";
        f.properties.name = slugifyHard(f.properties.name);
        f.geometry.coordinates = f.geometry.coordinates.map(coord => [fiveDigit(coord[0]), fiveDigit(coord[1])]);
        return f;
    }
    const osmIdToSkip = ["879849972", "174347425", "1340185485"]; // known duplicates to skip

    const [dataA, dataB] = await Promise.all([
        fs.readFile(fileA, 'utf8').then(JSON.parse),
        fs.readFile(fileB, 'utf8').then(JSON.parse)
    ]);
    console.log(`Merging ${dataA.features.length} + ${dataB.features.length}`);
    
    const seen = new Set(dataA.features.map(f => f.properties.osm));
    const uniqueFeatures = [...dataA.features];
    for (const f of dataB.features) {
        if (!seen.has(f.properties.osm) && !osmIdToSkip.includes(f.properties.osm)) {
          seen.add(f.properties.osm);
          uniqueFeatures.push(normalized(f));
        }
    }
    // Index B.features, add if unique (O(m))
    const fromB = dataB.features.filter(addIfUnique);
    console.log(`Unique features in B: ${fromB.length} ${seen.size}`);
    const merged = {
      type: 'FeatureCollection',
      metadata: {'type':"osm", 'country':dataA.metadata?.country || dataB.metadata?.country || "87"},
      features: uniqueFeatures
    };
    // Write C.geojson
    fs.writeFile(outputFile, JSON.stringify(merged, null, 2)).then(
        a => console.log(`saved ${outputFile} with ${uniqueFeatures.length} features`),
        err => console.error(`Error writing ${outputFile}: ${err}`)
    );
    console.log(`A: ${dataA.features.length} + B: ${dataB.features.length} → Total: ${dataA.features.length + dataB.features.length} :<?>: ${uniqueFeatures.length}`);
}

console.log(`Merging ${process.argv[2]} + ${process.argv[3]} → ${process.argv[4]}`);
console.log(process.argv.length);
mergeGeoJSONFiles(process.argv[2], process.argv[3], process.argv[4])
  .catch(console.error);