import { getNeo4jSession } from '../utils/neo4j';

export default defineEventHandler(async (event) => {
  const session = getNeo4jSession();
  try {
    const body = await readBody(event);
    console.log('Incoming body for import-oebb.post.ts:', JSON.stringify(body, null, 2));
    const { features } = body;

    if (!Array.isArray(features)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid payload: expected an array of features.',
      });
    }

    const nodesToCreate = [];
    const relationshipsToCreate = [];

    for (const feature of features) {
      if (feature.type === 'Feature' && feature.geometry && feature.properties) {
        if (feature.geometry.type === 'Point') {
          // This is a station/point node
          const [longitude, latitude] = feature.geometry.coordinates;
          nodesToCreate.push({ ...feature.properties, latitude, longitude });
        } else if (feature.geometry.type === 'LineString') {
          // This is a relationship/line
          relationshipsToCreate.push(feature.properties);
        }
      }
    }

    // Process Nodes first
    for (const nodeProps of nodesToCreate) {
      if (!nodeProps.RP_ID) {
        console.warn('Skipping node due to missing RP_ID:', nodeProps);
        continue; // Skip this node if RP_ID is missing
      }
      const query = `
        MERGE (n:Station {RP_ID: $RP_ID})
        ON CREATE SET n += $properties
        ON MATCH SET n += $properties
      `;
      await session.run(query, { RP_ID: nodeProps.RP_ID, properties: nodeProps });
    }

    // Process Relationships
    for (const relProps of relationshipsToCreate) {
      const query = `
        MATCH (a:Station {RP_ID: $RL_FROMID})
        MATCH (b:Station {RP_ID: $RL_TOID})
        MERGE (a)-[r:CONNECTS]->(b)
        ON CREATE SET r += $properties
        ON MATCH SET r += $properties
      `;
      await session.run(query, {
        RL_FROMID: relProps.RL_FROMID,
        RL_TOID: relProps.RL_TOID,
        properties: relProps,
      });
    }

    return {
      message: `Import successful: ${nodesToCreate.length} nodes and ${relationshipsToCreate.length} relationships processed.`,
    };
  } catch (error: any) {
    console.error('Neo4j import error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to import OEBB data: ' + error.message,
    });
  } finally {
    await session.close();
  }
});
