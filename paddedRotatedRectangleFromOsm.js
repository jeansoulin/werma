function paddedRotatedRectangleFromFeatures(features, paddingMeters = 20) {
  const R = 6371000;
  const points = features
    .filter(f => f?.geometry?.type === "Point")
    .map(f => f.geometry.coordinates);
  if (points.length < 2)
    throw new Error("Need at least 2 Points");

  const lon0 = points.reduce((s, p) => s + p[0], 0) / points.length;
  const lat0 = points.reduce((s, p) => s + p[1], 0) / points.length;
  const latR = R * Math.cos(lat0 * Math.PI / 180);
  const toXY = ([lon, lat]) => ([
    (lon - lon0) * Math.PI / 180 * latR,
    (lat - lat0) * Math.PI / 180 * R
  ]);
  const toLonLat = ([x, y]) => ([
    lon0 + (x / latR) * 180 / Math.PI,
    lat0 + (y / R) * 180 / Math.PI
  ]);

  const xy = points.map(toXY);
  let meanX = 0, meanY = 0;
  for (const [x, y] of xy) { meanX += x; meanY += y; }
  meanX /= xy.length;
  meanY /= xy.length;
  let sxx = 0, syy = 0, sxy = 0;
  for (const [x, y] of xy) {
    const dx = x - meanX;
    const dy = y - meanY;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }

  const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rot = ([x, y]) => ([
    cos * (x - meanX) + sin * (y - meanY),
    -sin * (x - meanX) + cos * (y - meanY)
  ]);
  const unrot = ([x, y]) => ([
    meanX + cos * x - sin * y,
    meanY + sin * x + cos * y
  ]);

  const r = xy.map(rot);
  const cornersXY = getCornersFromR(r);
  const geoCorners = [cornersXY.map(c => toLonLat(unrot(c)))];
/*
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of r) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  minX -= paddingMeters;
  minY -= paddingMeters;
  maxX += paddingMeters;
  maxY += paddingMeters;

  const cornersXY = [
    [minX, minY],
    [maxX, minY],
    [maxX, maxY],
    [minX, maxY],
    [minX, minY]
  ];
*/
  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: geoCorners
    },
    properties: {
      paddingMeters
    }
  };
}
function getCornersFromR(r) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of r) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  minX -= paddingMeters; minY -= paddingMeters;
  maxX += paddingMeters; maxY += paddingMeters;
  return ([ [minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY], [minX, minY] ]);
}