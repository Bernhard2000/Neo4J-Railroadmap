import { getNeo4jSession } from '../utils/neo4j';
import { calculateDistance } from '../utils/calculateDistance';

export default defineEventHandler(async (event) => {
  const session = getNeo4jSession();
  try {
    const body = await readBody(event);
    console.log('Incoming body for relationship.post.ts:', JSON.stringify(body, null, 2));
    const { sourceNodeName, relationshipType, targetNodeName } = body;

    if (!sourceNodeName || !relationshipType || !targetNodeName) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing sourceNodeName, relationshipType, or targetNodeName',
      });
    }

    // First, retrieve the nodes to get their coordinates
    const nodeQuery = `
      MATCH (a {name: $sourceNodeName})
      MATCH (b {name: $targetNodeName})
      RETURN a.latitude AS sourceLat, a.longitude AS sourceLon, b.latitude AS targetLat, b.longitude AS targetLon
    `;
    const nodeResult = await session.run(nodeQuery, { sourceNodeName, targetNodeName });

    if (nodeResult.records.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Source or target node not found. Please ensure nodes exist before creating relationships.',
      });
    }

    const { sourceLat, sourceLon, targetLat, targetLon } = nodeResult.records[0].toObject();

    if (sourceLat === null || sourceLon === null || targetLat === null || targetLon === null) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Source or target node is missing latitude or longitude coordinates.',
      });
    }

    const distance = calculateDistance(sourceLat, sourceLon, targetLat, targetLon);

    const relationshipQuery = `
      MATCH (a {name: $sourceNodeName})
      MATCH (b {name: $targetNodeName})
      CREATE (a)-[r:${relationshipType} {distance: $distance}]->(b)
      RETURN a, r, b
    `;

    const result = await session.run(relationshipQuery, { sourceNodeName, relationshipType, targetNodeName, distance });

    if (result.records.length === 0) {
      throw createError({
        statusCode: 500, // Should not happen if nodes were found in the previous step
        statusMessage: 'Failed to create relationship after finding nodes.',
      });
    }

    return { message: 'Relationship created successfully', relationship: result.records[0].get('r').type };
  } catch (error: any) { // Cast error to any
    console.error('Neo4j relationship creation error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create relationship in Neo4j: ' + error.message,
    });
  } finally {
    await session.close();
  }
});
