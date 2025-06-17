import neo4j from 'neo4j-driver';

const config = useRuntimeConfig();

const driver = neo4j.driver(
  config.neo4jUrl || 'bolt://localhost:7687',
  neo4j.auth.basic(config.neo4jUser || 'neo4j', config.neo4jPassword || 'password')
);

export function getNeo4jSession() {
  return driver.session({
  database: 'trainNetwork'
});
}

process.on('beforeExit', () => {
  driver.close();
});