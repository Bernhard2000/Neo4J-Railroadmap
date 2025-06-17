import { getNeo4jSession } from '../utils/neo4j';

export default defineEventHandler(async (event) => {
  const session = getNeo4jSession();
  try {
    const body = await readBody(event);
    const { sourceNodeName, targetNodeName } = body;

    if (!sourceNodeName || !targetNodeName) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing sourceNodeName or targetNodeName for connection deletion',
      });
    }

    const result = await session.run(
      'MATCH (s1:Station {name: $sourceNodeName})-[r:CONNECTS]->(s2:Station {name: $targetNodeName}) DELETE r',
      { sourceNodeName, targetNodeName }
    );

    if ((result.summary.counters as any).relationshipsDeleted === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: `Connection from ${sourceNodeName} to ${targetNodeName} not found.`,
      });
    }

    return { message: `Connection from ${sourceNodeName} to ${targetNodeName} deleted successfully` };
  } catch (error: any) {
    console.error('Neo4j delete connection error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete connection from Neo4j: ' + error.message,
    });
  } finally {
    await session.close();
  }
});
