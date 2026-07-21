const fs = require('fs/promises');


async function main(inputName, outputName, removeFilter) {
  const input = await fs.readFile(inputName, 'utf8');
  const geojson = JSON.parse(input);
  let features = geojson.features || [];
    console.log(`features: ${features.length}`);
    features = removeFilter(features);
    console.log(`features: ${features.length}`);
  const outjson = {...geojson, features};
  await fs.writeFile(outputName, JSON.stringify(outjson), 'utf8');
//  await fs.writeFile(outputName, JSON.stringify(outjson, null, 2), 'utf8');
}

async function mainRemove(inputName, outputName) {
  const toRemove = [ "1340185485", "174347425", "879849972" ];

  const input = await fs.readFile(inputName, 'utf8');
  const geojson = JSON.parse(input);
  const removeSet = new Set(toRemove);
  const filtered = {
    ...geojson,
    features: (geojson.features || []).filter(
      f => !removeSet.has(f?.properties?.osm)
    ),
    // features: mainRemoveFrom(geojson, toRemove)
  };
  await fs.writeFile(outputName, JSON.stringify(filtered, null, 2), 'utf8');
}

function mainRemoveFrom(features) {
  const listToRemove = [ "1340185485", "174347425", "879849972" ];
  const removeSet = new Set(listToRemove);
  return features.filter(
    f => !removeSet.has(f?.properties?.osm)
  );
}
function mainRestrictToFrance(features) {
  const isNotPolygon = fgt => fgt && fgt !== "Polygon" && fgt !== "MultiPolygon";
  const isLineString = fgt => fgt && fgt === "LineString" || fgt === "MultiLineString";
  const isRoute = fp => fp["@type"] === "relation" && fp.route;
  return features.filter(
    f => isRoute(f.properties) && !console.log(JSON.stringify(f.properties.name || "----no name ----"))
//    f => isRoute(f.properties) && (!isLineString(f.geometry?.type) && !console.log(f.geometry.type)) && !console.log(JSON.stringify(f.properties))
  );
}
if(false)
  mainRemove("reallyfullOSM.geojson", 'veryFullOSM-v2.geojson').catch(err => {
  console.error(err);
  process.exit(1);
});

const bboxFrance = [-4.82288,51.12556,8.24763,42.31677];
// E:8.24763,48.97681
// N:2.53787,51.12556 
// W:-4.82288,48.42673 
// S:2.52987,42.31677 


if(true)
  main("./data/FR/ultraFranceRelation.geojson","OSMrelFR.geojson", mainRestrictToFrance)
  .catch(err => console.error(`mainRestrictToFrance ${err}`));