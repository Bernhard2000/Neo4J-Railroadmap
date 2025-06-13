import { getNeo4jSession } from '../../server/utils/neo4j';

export default eventHandler(async (event) => {
  const session = getNeo4jSession();
  try {
    const { startNodeName, endNodeName } = await readBody(event);

    const query = `
      MATCH (start:Station {name: $startNodeName}), (end:Station {name: $endNodeName})
      CALL apoc.algo.dijkstra(start, end, 'CONNECTS', 'distance') YIELD path, weight
      UNWIND relationships(path) AS rel
      MATCH (source)-[rel]->(target)
      RETURN
          properties(source) AS sourceNode,
          properties(target) AS targetNode,
          properties(rel) AS relationship
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
  } catch (error) {
    console.error('Error fetching shortest path:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch shortest path',
    });
  } finally {
    await session.close();
  }
});
