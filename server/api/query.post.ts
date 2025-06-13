import { getNeo4jSession } from '../utils/neo4j';

export default defineEventHandler(async (event) => {
  const session = getNeo4jSession();
  try {
    const { query, params } = await readBody(event);

    if (!query) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Query is required.',
      });
    }

    const result = await session.run(query, params);
    const records = result.records.map(record => {
      const obj: { [key: string]: any } = {};
      record.keys.forEach((key, i) => {
        obj[String(key)] = record.get(i);
      });
      return obj;
    });

    return { records };
  } catch (error: any) {
    console.error('Neo4j query error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to execute query: ' + error.message,
    });
  } finally {
    await session.close();
  }
});
