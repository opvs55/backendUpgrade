// modules/unified/repositories/sqlRepository.js
import pg from 'pg';

const { Pool } = pg;

export class SqlUnifiedReadingsRepository {
  constructor(connectionString) {
    this.pool = new Pool({ connectionString });
    this.tableReady = false;
  }

  async ensureTable() {
    if (this.tableReady) {
      return;
    }
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS unified_readings (
        id UUID PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL,
        payload JSONB NOT NULL,
        warnings JSONB NOT NULL,
        modules JSONB NOT NULL,
        result JSONB NOT NULL
      );
    `);
    this.tableReady = true;
  }

  async create(record) {
    await this.ensureTable();
    const query = `
      INSERT INTO unified_readings (id, created_at, payload, warnings, modules, result)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [
      record.id,
      record.created_at,
      record.payload,
      record.warnings,
      record.modules,
      record.result,
    ];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async findById(id) {
    await this.ensureTable();
    const result = await this.pool.query('SELECT * FROM unified_readings WHERE id = $1;', [id]);
    return result.rows[0] || null;
  }
}
