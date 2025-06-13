import { getNeo4jSession } from '../utils/neo4j';

export default defineEventHandler(async (event) => {
  const session = getNeo4jSession();
  try {
    // Clear existing data to ensure a clean import
    await session.run('MATCH (n) DETACH DELETE n');

    // Define stations
    const initialStations = [
      { name: 'Vienna Hbf', city: 'Wien', latitude: 48.2082, longitude: 16.3738 },
      { name: 'Salzburg Hbf', city: 'Salzburg', latitude: 47.8095, longitude: 13.0550 },
      { name: 'Munich Hbf', city: 'München', latitude: 48.1372, longitude: 11.5755 },
      { name: 'Prague hl.n.', city: 'Prag', latitude: 50.0833, longitude: 14.4333 },
      { name: 'Budapest Keleti', city: 'Budapest', latitude: 47.4979, longitude: 19.0402 },
    ];

    let allStations = [...initialStations];

    // Generate 95 more random stations to reach ~100 total
    const numAdditionalStations = 95;
    for (let i = 0; i < numAdditionalStations; i++) {
      const randomCity = `City${Math.floor(Math.random() * 50)}`; // Random city name
      const randomLat = 40 + Math.random() * 15; // Latitude between 40 and 55 (Europe range)
      const randomLon = 0 + Math.random() * 30;  // Longitude between 0 and 30 (Europe range)
      allStations.push({ name: `Station ${i + 1}`, city: randomCity, latitude: randomLat, longitude: randomLon });
    }

    // Create or merge Station nodes
    for (const station of allStations) {
      await session.run(
        `MERGE (s:Station {name: $name})
         ON CREATE SET s.city = $city, s.latitude = $latitude, s.longitude = $longitude
         ON MATCH SET s.city = $city, s.latitude = $latitude, s.longitude = $longitude`,
        station
      );
    }

    // Define initial connections with durations
    const initialConnections = [
      { from: 'Vienna Hbf', to: 'Salzburg Hbf', duration: 150 },
      { from: 'Salzburg Hbf', to: 'Munich Hbf', duration: 100 },
      { from: 'Vienna Hbf', to: 'Prague hl.n.', duration: 250 },
      { from: 'Vienna Hbf', to: 'Budapest Keleti', duration: 160 },
      { from: 'Prague hl.n.', to: 'Munich Hbf', duration: 380 },
    ];

    // Add random connections to ensure connectivity and more data
    const numAdditionalConnections = 200;
    const randomConnections = [];
    for (let i = 0; i < numAdditionalConnections; i++) {
      const fromStation = allStations[Math.floor(Math.random() * allStations.length)];
      let toStation = allStations[Math.floor(Math.random() * allStations.length)];
      // Ensure from and to stations are different
      while (fromStation.name === toStation.name) {
        toStation = allStations[Math.floor(Math.random() * allStations.length)];
      }
      const duration = Math.floor(Math.random() * 500) + 30; // Random duration between 30 and 530 minutes
      randomConnections.push({ from: fromStation.name, to: toStation.name, duration });
    }

    const allConnections = [...initialConnections, ...randomConnections];

    // Import calculateDistance
    const { calculateDistance } = await import('../utils/neo4j');

    // Create or merge CONNECTS relationships
    for (const conn of allConnections) {
      // Retrieve coordinates for distance calculation
      const nodeCoordsResult = await session.run(
        `MATCH (a:Station {name: $from})
         MATCH (b:Station {name: $to})
         RETURN a.latitude AS fromLat, a.longitude AS fromLon, b.latitude AS toLat, b.longitude AS toLon`,
        { from: conn.from, to: conn.to }
      );

      const { fromLat, fromLon, toLat, toLon } = nodeCoordsResult.records[0].toObject();

      let distance = null;
      if (fromLat !== null && fromLon !== null && toLat !== null && toLon !== null) {
        distance = calculateDistance(fromLat, fromLon, toLat, toLon);
      }

      await session.run(
        `MATCH (a:Station {name: $from})
         MATCH (b:Station {name: $to})
         MERGE (a)-[r:CONNECTS]->(b)
         ON CREATE SET r.duration = $duration, r.distance = $distance
         ON MATCH SET r.duration = $duration, r.distance = $distance`,
        { ...conn, distance }
      );
    }

    return { message: 'Simple European rail data imported successfully!' };
  } catch (error: any) {
    console.error('Neo4j simple import error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to import simple rail data: ' + error.message,
    });
  } finally {
    await session.close();
  }
});
