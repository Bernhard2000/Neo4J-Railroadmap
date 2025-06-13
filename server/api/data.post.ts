import { getNeo4jSession } from '../utils/neo4j';

export default defineEventHandler(async (event) => {
  const session = getNeo4jSession();
  try {
    const body = await readBody(event);
    console.log('Received body for POST:', body); // Keep for debugging
    const { name, city, latitude, longitude } = body;
    const result = await session.run(
      'CREATE (s:Station {name: $name, latitude: $latitude, longitude: $longitude}) RETURN s',
      { name, city, latitude, longitude }
    );
    const createdNode = result.records[0].get('s').properties;
    return { message: 'Node created successfully', node: createdNode };
  } catch (error) {
    console.error('Neo4j write error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to insert data into Neo4j',
    });
  } finally {
    await session.close();
  }
});
