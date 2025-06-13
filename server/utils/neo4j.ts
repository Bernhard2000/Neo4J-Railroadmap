import neo4j from 'neo4j-driver';

const config = useRuntimeConfig();

const driver = neo4j.driver(
  config.neo4jUrl || 'bolt://localhost:7687',
  neo4j.auth.basic(config.neo4jUser || 'neo4j', config.neo4jPassword || 'password')
);

export function getNeo4jSession() {
  return driver.session();
}

// Haversine formula to calculate distance between two lat/lon points in kilometers
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

// Ensure the driver is closed when the Nuxt app is closing
process.on('beforeExit', () => {
  driver.close();
});
