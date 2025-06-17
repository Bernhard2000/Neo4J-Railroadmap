import { getNeo4jSession } from '../utils/neo4j';
import { calculateDistance } from '../utils/calculateDistance';

export default defineEventHandler(async (event) => {
  const session = getNeo4jSession();
  try {
    const body = await readBody(event);
    const { originalSourceNodeName, originalTargetNodeName, newSourceNodeName, newTargetNodeName } = body;

    if (!originalSourceNodeName || !originalTargetNodeName || !newSourceNodeName || !newTargetNodeName) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing originalSourceNodeName, originalTargetNodeName, newSourceNodeName, or newTargetNodeName',
      });
    }

    // First, retrieve the nodes to get their coordinates for distance calculation
    const nodeQuery = `
      MATCH (a {name: $newSourceNodeName})
      MATCH (b {name: $newTargetNodeName})
      RETURN a.latitude AS sourceLat, a.longitude AS sourceLon, b.latitude AS targetLat, b.longitude AS targetLon
    `;
    const nodeResult = await session.run(nodeQuery, { newSourceNodeName, newTargetNodeName });

    if (nodeResult.records.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'New source or target node not found. Please ensure nodes exist.',
      });
    }

    const { sourceLat, sourceLon, targetLat, targetLon } = nodeResult.records[0].toObject();

    if (sourceLat === null || sourceLon === null || targetLat === null || targetLon === null) {
      throw createError({
        statusCode: 400,
        statusMessage: 'New source or target node is missing latitude or longitude coordinates.',
      });
    }

    const distance = calculateDistance(sourceLat, sourceLon, targetLat, targetLon);

    // Update the relationship
    const result = await session.run(
      `
      MATCH (s1:Station {name: $originalSourceNodeName})-[r:CONNECTS]->(s2:Station {name: $originalTargetNodeName})
      MATCH (newS1:Station {name: $newSourceNodeName})
      MATCH (newS2:Station {name: $newTargetNodeName})
      DELETE r
      CREATE (newS1)-[newR:CONNECTS {distance: $distance}]->(newS2)
      RETURN newR
      `,
      { originalSourceNodeName, originalTargetNodeName, newSourceNodeName, newTargetNodeName, distance }
    );

    if (result.records.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: `Connection from ${originalSourceNodeName} to ${originalTargetNodeName} not found or failed to update.`,
      });
    }

    const updatedRelationship = result.records[0].get('newR').properties;
    return { message: 'Connection updated successfully', connection: updatedRelationship };
  } catch (error: any) {
    console.error('Neo4j update connection error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update connection in Neo4j: ' + error.message,
    });
  } finally {
    await session.close();
  }
});
