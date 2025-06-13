import { getNeo4jSession } from '../utils/neo4j';
import { Record } from 'neo4j-driver';

export default defineEventHandler(async (event) => {
  const session = getNeo4jSession();
  try {
    const stationsResult = await session.run('MATCH (s:Station) RETURN s.name AS name, s.latitude AS latitude, s.longitude AS longitude ORDER BY s.name');
    const stations = stationsResult.records.map((record: Record) => ({
      name: record.get('name'),
      latitude: record.get('latitude'),
      longitude: record.get('longitude')
    }));

    const relationshipsResult = await session.run('MATCH (s1:Station)-[r:CONNECTS]->(s2:Station) RETURN s1.name AS sourceName, s1.latitude AS sourceLat, s1.longitude AS sourceLng, s2.name AS targetName, s2.latitude AS targetLat, s2.longitude AS targetLng, r.distance AS distance');
    const relationships = relationshipsResult.records.map((record: Record) => ({
      sourceName: record.get('sourceName'),
      sourceLat: record.get('sourceLat'),
      sourceLng: record.get('sourceLng'),
      targetName: record.get('targetName'),
      targetLat: record.get('targetLat'),
      targetLng: record.get('targetLng'),
      distance: record.get('distance')
    }));

    return { stations, relationships };
  } catch (error) {
    console.error('Neo4j read error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch data from Neo4j',
    });
  } finally {
    await session.close();
  }
});
