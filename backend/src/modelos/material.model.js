const { randomUUID } = require('crypto');
const { db, ahora } = require('../config/database');

const MaterialModel = {
  list() {
    return db.prepare('SELECT * FROM catalogo_materiales ORDER BY nombre').all();
  },

  findById(id) {
    return db.prepare('SELECT * FROM catalogo_materiales WHERE id = ?').get(id);
  },

  /** Catálogo comercial para el portal de clientes (con precio, imagen y stock disponible). */
  catalogo({ categoria, q } = {}) {
    const where = ['m.activo = 1'];
    const params = {};
    if (categoria) { where.push('m.categoria = @categoria'); params.categoria = categoria; }
    if (q) { where.push('(m.nombre LIKE @q OR m.codigo_sku LIKE @q OR m.descripcion LIKE @q)'); params.q = `%${q}%`; }
    return db
      .prepare(
        `SELECT m.id, m.codigo_sku, m.nombre, m.unidad, m.categoria, m.descripcion,
                m.precio_unitario, m.imagen_url, COALESCE(i.stock_actual, 0) AS stock_disponible,
                COALESCE((SELECT SUM(d.cantidad) FROM detalles_pedido d WHERE d.material_id = m.id), 0) AS vendidos
         FROM catalogo_materiales m
         LEFT JOIN inventario_central i ON i.material_id = m.id
         WHERE ${where.join(' AND ')}
         ORDER BY m.categoria, m.nombre`
      )
      .all(params);
  },

  categorias() {
    return db
      .prepare('SELECT DISTINCT categoria FROM catalogo_materiales WHERE activo = 1 ORDER BY categoria')
      .all()
      .map((r) => r.categoria);
  },

  /** Crea el material y su registro de inventario en 0. */
  create({ codigo_sku, nombre, unidad, categoria = 'General', descripcion = null, precio_unitario = 0, imagen_url = null }) {
    const id = randomUUID();
    const t = ahora();
    db.transaction(() => {
      db.prepare(
        `INSERT INTO catalogo_materiales
           (id, codigo_sku, nombre, unidad, categoria, descripcion, precio_unitario, imagen_url, activo, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
      ).run(id, codigo_sku, nombre, unidad, categoria, descripcion, precio_unitario, imagen_url, t, t);
      db.prepare(
        `INSERT INTO inventario_central (id, material_id, stock_actual, created_at, updated_at)
         VALUES (?, ?, 0, ?, ?)`
      ).run(randomUUID(), id, t, t);
    })();
    return this.findById(id);
  },

  update(id, campos) {
    const actual = this.findById(id);
    if (!actual) return null;
    const m = { ...actual };
    for (const k of ['nombre', 'unidad', 'categoria', 'descripcion', 'precio_unitario', 'imagen_url']) {
      if (k in campos) m[k] = campos[k];
    }
    if ('activo' in campos) m.activo = campos.activo ? 1 : 0;
    m.precio_unitario = Number(m.precio_unitario);
    db.prepare(
      `UPDATE catalogo_materiales SET nombre = @nombre, unidad = @unidad, categoria = @categoria,
              descripcion = @descripcion, precio_unitario = @precio_unitario, imagen_url = @imagen_url,
              activo = @activo, updated_at = @updated_at WHERE id = @id`
    ).run({ id, nombre: m.nombre, unidad: m.unidad, categoria: m.categoria, descripcion: m.descripcion,
            precio_unitario: m.precio_unitario, imagen_url: m.imagen_url, activo: m.activo, updated_at: ahora() });
    return this.findById(id);
  },

  inventario() {
    return db
      .prepare(
        `SELECT i.id, i.material_id, i.stock_actual, i.stock_minimo, i.updated_at,
                m.codigo_sku, m.nombre, m.unidad, m.categoria, m.precio_unitario, m.imagen_url, m.activo,
                CASE WHEN i.stock_actual <= i.stock_minimo THEN 1 ELSE 0 END AS stock_bajo
         FROM inventario_central i
         JOIN catalogo_materiales m ON m.id = i.material_id
         ORDER BY m.nombre`
      )
      .all();
  },

  /** Materiales en o por debajo de su punto de reorden. */
  stockBajo() {
    return db
      .prepare(
        `SELECT m.id AS material_id, m.nombre, m.unidad, m.codigo_sku, i.stock_actual, i.stock_minimo
         FROM inventario_central i JOIN catalogo_materiales m ON m.id = i.material_id
         WHERE i.stock_actual <= i.stock_minimo
         ORDER BY (i.stock_actual / MAX(i.stock_minimo, 1)) ASC`
      )
      .all();
  },

  fijarStockMinimo(material_id, stock_minimo) {
    const { changes } = db
      .prepare('UPDATE inventario_central SET stock_minimo = ?, updated_at = ? WHERE material_id = ?')
      .run(stock_minimo, ahora(), material_id);
    return changes > 0;
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
