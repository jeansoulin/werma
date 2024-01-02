WERMA is about software and data that are produced during the WERMA project.

WERMA stands for West-Europe Rail Map Archive, a 'TimeMachine.eu' project.

Data consist in lists of railway stations, ordered along rail routes, which have existed -or still exist- since creation of European railways.
"Station" term is used to encompassing any place a train can stop, from central station, hauptbanhof, gare vicinale, ... to mere on-demand stop on rural lines, tramways ...
All stations -during their lifetime- are assiged to at least one "route" with a name, or a letter/number from some local or national network.
Names for routes or stations may have changed through time (most recent/common name is used), or may have different versions (eg. in Belgium, alt names are mentioned).

Data structure.

Data structure is "inspired" by the INSPIRE(EU) ontology and formats for transportation data, limited to simpler way to encoding minimal requested information.
This limitation consists in extracting stations by "route" (from A to B) and to ensure that routes connect to each other in a graph.
The nodes of that graph are stations or branch nodes (Y) or special locations (eg. bridges).
