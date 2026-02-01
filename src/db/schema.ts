export const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created INTEGER NOT NULL,
    modified INTEGER NOT NULL,
    originalState TEXT NOT NULL,
    currentState TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS keypads (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    area TEXT NOT NULL,
    room TEXT NOT NULL,
    data TEXT NOT NULL,
    FOREIGN KEY (projectId) REFERENCES projects(id)
  );

  CREATE INDEX IF NOT EXISTS idx_keypads_project ON keypads(projectId);
  CREATE INDEX IF NOT EXISTS idx_keypads_location ON keypads(projectId, area, room);

  CREATE TABLE IF NOT EXISTS loads (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    fullPath TEXT NOT NULL,
    area TEXT NOT NULL,
    data TEXT NOT NULL,
    FOREIGN KEY (projectId) REFERENCES projects(id)
  );

  CREATE INDEX IF NOT EXISTS idx_loads_project ON loads(projectId);
  CREATE INDEX IF NOT EXISTS idx_loads_area ON loads(projectId, area);
`;
