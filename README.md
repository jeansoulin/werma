WERMA is about software and data that are produced during the WERMA project.

WERMA is a 'TimeMachine' project: https://www.timemachine.eu/ltm-projects/werma-west-europe-rail-map-archive/

Data.
Data consist in lists of stations, ordered along rail routes that have existed -or still exist- since creation of European railways.
"Station" term is used to encompassing any place a train can stop, from central station, hauptbanhof, gare, ... to mere on-demand stop on rural lines, tramways, lignes secondaires ou vicinales ... but always on a railway, ferrovia, chemin de fer, eisenbahn ...
All stations -during their lifetime- are assigned to at least one "route", which is identified relatively to a local or national network.
Identifiers for routes and stations may change through time (most recent/common is used), or may have versions (eg. in Belgium, alt names may be mentioned).

Data structure.
Data structure is "inspired" by the INSPIRE(EU) ontology and formats for transportation data, limited to encoding the minimal requested information.
This limitation consists in ordering stations by "route" (from A to B) and to ensure that routes connect to each other in a graph.
The nodes of that graph are : stations, branch nodes (Y) or special locations (eg. bridges).
