const { randomUUID } = require('crypto');
const { db, ahora } = require('../config/database');

const MaterialModel = {
  list() {
    return db.prepare('SELECT * FROM catalogo_materiales ORDER BY nombre').all();
  },

  findById(id) {
    return db.prepare('SELECT * FROM catalogo_materiales WHERE id = ?').get(id);
  },

  /** Crea el material y su registro de inventario en 0. */
  create({ codigo_sku, nombre, unidad }) {
    const id = randomUUID();
    const t = ahora();
    db.transaction(() => {
      db.prepare(
        `INSERT INTO catalogo_materiales (id, codigo_sku, nombre, unidad, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(id, codigo_sku, nombre, unidad, t, t);
      db.prepare(
        `INSERT INTO inventario_central (id, material_id, stock_actual, created_at, updated_at)
         VALUES (?, ?, 0, ?, ?)`
      ).run(randomUUID(), id, t, t);
    })();
    return this.findById(id);
  },

  inventario() {
    return db
      .prepare(
        `SELECT i.id, i.material_id, i.stock_actual, i.updated_at,
                m.codigo_sku, m.nombre, m.unidad
         FROM inventario_central i
         JOIN catalogo_materiales m ON m.id = i.material_id
         ORDER BY m.nombre`
      )
      .all();
  },

  stock(material_id) {
    const row = db
      .prepare('SELECT stock_actual FROM inventario_central WHERE material_id = ?')
      .get(material_id);
    return row ? row.stock_actual : 0;
  },

  /** Suma (delta > 0) o resta (delta < 0) stock. Crea el registro si no existe. */
  ajustarStock(material_id, delta) {
    // Nota: no se usa UPSERT porque SQLite evalúa el CHECK (stock_actual >= 0)
    // sobre la fila a insertar antes de resolver el conflicto (delta negativo fallaría).
    const t = ahora();
    const { changes } = db
      .prepare('UPDATE inventario_central SET stock_actual = stock_actual + ?, updated_at = ? WHERE material_id = ?')
      .run(delta, t, material_id);
    if (changes === 0) {
      db.prepare(
        `INSERT INTO inventario_central (id, material_id, stock_actual, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      ).run(randomUUID(), material_id, delta, t, t);
    }
  },

  cambiosDesde(desde) {
    return {
      catalogo_materiales: db.prepare('SELECT * FROM catalogo_materiales WHERE updated_at > ?').all(desde),
      inventario_central: db.prepare('SELECT * FROM inventario_central WHERE updated_at > ?').all(desde),
    };
  },
};

module.exports = MaterialModel;
