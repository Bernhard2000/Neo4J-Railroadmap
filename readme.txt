Simple railroad map as a Nuxt WebApp.
Used BOLT to connect to Neo4J Desktop DB
Using the official NodeJS neo4j-driver.
All DB access on the backend and accessed using API calls.
Used APOC for Dijkstra
Hardcoded example stations and connections, user able to edit/add/remove


Adding station:
await session.run(
      'CREATE (s:Station {name: $name, latitude: $latitude, longitude: $longitude}) RETURN s',
      { name, city, latitude, longitude }
);

Editing Station:
await session.run(
      'MATCH (s:Station {name: $originalName}) SET s.name = $name, s.latitude = $latitude, s.longitude = $longitude RETURN s',
      { originalName, name, latitude, longitude }
    );
    
Adding connection:
MATCH (a {name: $sourceNodeName})
      MATCH (b {name: $targetNodeName})
      RETURN a.latitude AS sourceLat, a.longitude AS sourceLon, b.latitude AS targetLat, b.longitude AS targetLon
      
Editing connection:
MATCH (s1:Station {name: $originalSourceNodeName})-[r:CONNECTS]->(s2:Station {name: $originalTargetNodeName})
      MATCH (newS1:Station {name: $newSourceNodeName})
      MATCH (newS2:Station {name: $newTargetNodeName})
      DELETE r
      CREATE (newS1)-[newR:CONNECTS {distance: $distance}]->(newS2)
      RETURN newR
      
Deleting Station:       
MATCH (s:Station {name: $name}) DETACH DELETE s

Deleting connection:
MATCH (s1:Station {name: $sourceNodeName})-[r:CONNECTS]->(s2:Station {name: $targetNodeName}) DELETE r

Find shortest Path:
MATCH (start:Station {name: $startNodeName}), (end:Station {name: $endNodeName})
      CALL apoc.algo.dijkstra(start, end, 'CONNECTS', 'distance') YIELD path, weight
      WITH nodes(path) AS nodes, relationships(path) AS rels
      UNWIND RANGE(0, size(nodes) - 2) AS i
      WITH nodes[i] AS sourceNode, nodes[i+1] AS targetNode, rels[i] AS relationship
      RETURN
          properties(sourceNode) AS sourceNode,
          properties(targetNode) AS targetNode,
          properties(relationship) AS relationship

