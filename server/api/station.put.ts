import { getNeo4jSession } from '../utils/neo4j';

export default defineEventHandler(async (event) => {
  const session = getNeo4jSession();
  try {
    const body = await readBody(event);
    const { originalName, name, latitude, longitude } = body;

    if (!originalName || !name || latitude === undefined || longitude === undefined) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing originalName, name, latitude, or longitude',
      });
    }

    const result = await session.run(
      'MATCH (s:Station {name: $originalName}) SET s.name = $name, s.latitude = $latitude, s.longitude = $longitude RETURN s',
      { originalName, name, latitude, longitude }
    );

    if (result.records.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: `Station with name ${originalName} not found.`,
      });
    }

    const updatedNode = result.records[0].get('s').properties;
    return { message: 'Station updated successfully', station: updatedNode };
  } catch (error: any) {
    console.error('Neo4j update station error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update station in Neo4j: ' + error.message,
    });
  } finally {
    await session.close();
  }
});
