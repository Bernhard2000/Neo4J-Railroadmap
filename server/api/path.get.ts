import { getNeo4jSession } from '../../server/utils/neo4j';

export default eventHandler(async (event) => {
  const session = getNeo4jSession();
  try {
    const { startNodeName, endNodeName } = getQuery(event);

    if (!startNodeName || !endNodeName) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing startNodeName or endNodeName query parameters.',
      });
    }

    const query = `
      MATCH (start:Station {name: $startNodeName}), (end:Station {name: $endNodeName})
      CALL apoc.algo.dijkstra(start, end, 'CONNECTS', 'distance') YIELD path, weight
      WITH nodes(path) AS nodes, relationships(path) AS rels
      UNWIND RANGE(0, size(nodes) - 2) AS i
      WITH nodes[i] AS sourceNode, nodes[i+1] AS targetNode, rels[i] AS relationship
      RETURN
          properties(sourceNode) AS sourceNode,
          properties(targetNode) AS targetNode,
          properties(relationship) AS relationship
    `;

    const result = await session.run(query, { startNodeName, endNodeName });

    const pathSegments = result.records.map(record => {
      const sourceNode = record.get('sourceNode');
      const targetNode = record.get('targetNode');
      const relationship = record.get('relationship');
      return {
        sourceName: sourceNode.name,
        sourceLat: sourceNode.latitude,
        sourceLng: sourceNode.longitude,
        targetName: targetNode.name,
        targetLat: targetNode.latitude,
        targetLng: targetNode.longitude,
        distance: relationship.distance,
      };
    });

    return pathSegments;
  } catch (error : any) {
    console.error('Error fetching shortest path:', error);
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch shortest path ${error.message}`,
    });
  } finally {
    await session.close();
  }
});
