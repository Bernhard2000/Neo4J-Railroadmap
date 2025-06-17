import { getNeo4jSession } from '../utils/neo4j';

export default defineEventHandler(async (event) => {
  const session = getNeo4jSession();
  try {
    const body = await readBody(event);
    const { name } = body;

    if (!name) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing station name for deletion',
      });
    }

    const result = await session.run(
      'MATCH (s:Station {name: $name}) DETACH DELETE s',
      { name }
    );

    if ((result.summary.counters as any).nodesDeleted === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: `Station with name ${name} not found.`,
      });
    }

    return { message: `Station ${name} and its relationships deleted successfully` };
  } catch (error: any) {
    console.error('Neo4j delete station error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete station from Neo4j: ' + error.message,
    });
  } finally {
    await session.close();
  }
});
