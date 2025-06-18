import { defineEventHandler } from "h3";
import { getNeo4jSession } from "../../server/utils/neo4j";

export default defineEventHandler(async (event) => {
  const session = getNeo4jSession();
  try {
    // Clear existing data to ensure a clean import
    await session.run('MATCH (n) DETACH DELETE n');

    // Define European cities with their coordinates
    const cities = [
      { name: 'Vienna', latitude: 48.2082, longitude: 16.3738 },
      { name: 'Salzburg', latitude: 47.8095, longitude: 13.0550 },
      { name: 'Munich', latitude: 48.1372, longitude: 11.5755 },
      { name: 'Prague', latitude: 50.0755, longitude: 14.4378 },
      { name: 'Budapest', latitude: 47.4979, longitude: 19.0402 },
      { name: 'Innsbruck', latitude: 47.2692, longitude: 11.4041 },
      { name: 'Graz', latitude: 47.0707, longitude: 15.4395 },
      { name: 'Rome', latitude: 41.9028, longitude: 12.4964 },
      { name: 'Milan', latitude: 45.4642, longitude: 9.1900 },
      { name: 'Berlin', latitude: 52.5200, longitude: 13.4050 },
      { name: 'Frankfurt', latitude: 50.1109, longitude: 8.6821 },
      { name: 'Zurich', latitude: 47.3769, longitude: 8.5417 },
      { name: 'Geneva', latitude: 46.2044, longitude: 6.1432 },
      { name: 'Florence', latitude: 43.7696, longitude: 11.2558 },
      { name: 'Cologne', latitude: 50.9375, longitude: 6.9603 },
      { name: 'Linz', latitude: 48.3069, longitude: 14.2858 },
      { name: 'Verona', latitude: 45.4384, longitude: 10.9916 },
      { name: 'Nürnberg', latitude: 49.4521, longitude: 11.0767 },
      { name: 'Paris', latitude: 48.8566, longitude: 2.3522 },
      { name: 'Monaco', latitude: 43.7384, longitude: 7.4246 },
      { name: 'Marseille', latitude: 43.2965, longitude: 5.3698 },
      { name: 'Bordeaux', latitude: 44.8378, longitude: -0.5792 },
      { name: 'Rimini', latitude: 44.0678, longitude: 12.5695 },
      { name: 'Ljubljana', latitude: 46.0569, longitude: 14.5058 },
      { name: 'Hamburg', latitude: 53.5511, longitude: 9.9937 },
    ];

    for (const city of cities) {
      await session.run(
      `CREATE (c:Station {name: $name, latitude: $latitude, longitude: $longitude})`,
      city
      );
    }

    // Helper function to calculate distance between two points using Haversine formula
    const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; // Radius of Earth in kilometers
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;
      return distance;
    };

    // Manually define sensible connections between cities
    const connections = [
      { from: 'Vienna', to: 'Graz' },
      { from: 'Vienna', to: 'Linz' },
      { from: 'Linz', to: 'Salzburg' },
      { from: 'Vienna', to: 'Prague' },
      { from: 'Vienna', to: 'Budapest' },
      { from: 'Salzburg', to: 'Munich' },
      { from: 'Salzburg', to: 'Innsbruck' },
      { from: 'Salzburg', to: 'Graz' },
      { from: 'Nürnberg', to: 'Berlin' },
      { from: 'Munich', to: 'Frankfurt' },
      { from: 'Munich', to: 'Zurich' },
      { from: 'Munich', to: 'Nürnberg' },
      { from: 'Prague', to: 'Berlin' },
      { from: 'Budapest', to: 'Graz' },
      { from: 'Innsbruck', to: 'Zurich' },
      { from: 'Innsbruck', to: 'Verona' },
      { from: 'Rome', to: 'Florence' },
      { from: 'Verona', to: 'Milan' },
      { from: 'Milan', to: 'Zurich' },
      { from: 'Milan', to: 'Geneva' },
      { from: 'Berlin', to: 'Cologne' },
      { from: 'Frankfurt', to: 'Cologne' },
      { from: 'Zurich', to: 'Geneva' },
      { from: 'Paris', to: 'Cologne' },
      { from: 'Paris', to: 'Geneva' },
      { from: 'Florence', to: 'Verona' },
      { from: 'Nürnberg', to: 'Frankfurt' },
      { from: 'Monaco', to: 'Marseille' },
      { from: 'Marseille', to: 'Paris' },
      { from: 'Marseille', to: 'Bordeaux' },
      { from: 'Monaco', to: 'Marseille' },
      { from: 'Rimini', to: 'Florence' },
      { from: 'Rimini', to: 'Verona' },
      { from: 'Ljubljana', to: 'Graz' },
      { from: 'Ljubljana', to: 'Verona' },
      { from: 'Bordeaux', to: 'Paris' },
      { from: 'Monaco', to: 'Milan' },
      { from: 'Hamburg', to: 'Berlin' },
      { from: 'Hamburg', to: 'Cologne' },
      { from: 'Geneva', to: 'Marseille' },
    ];

    // Create relationships between cities based on calculated distance
    for (const connection of connections) {
      const city1 = cities.find(c => c.name === connection.from);
      const city2 = cities.find(c => c.name === connection.to);

      if (city1 && city2) {
        const distance = haversineDistance(city1.latitude, city1.longitude, city2.latitude, city2.longitude);
        await session.run(
          `MATCH (a:Station {name: $from}), (b:Station {name: $to})
           CREATE (a)-[:CONNECTS {distance: $distance}]->(b)`,
          { from: connection.from, to: connection.to, distance: Math.round(distance) }
        );
      }
    }

    return { message: 'European cities imported successfully' };
  }
  catch (error) {
    console.error('Neo4j import error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to import European cities into Neo4j',
    });
  }
  finally {
    await session.close();
  }
});
