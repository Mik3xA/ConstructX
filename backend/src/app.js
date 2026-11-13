const express = require('express');
const cors = require('cors');
const { CORS_ORIGIN } = require('./config/env');
const { notFound, errorHandler } = require('./middlewares/error.middleware');

const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: CORS_ORIGIN.split(',').map((o) => o.trim()) }));
app.use(express.json({ limit: '2mb' }));

// Salud (sin datos sensibles)
app.get('/api/health', (req, res) => res.json({ status: 'ok', server_time: new Date().toISOString() }));

app.use('/api/auth', require('./rutas/auth.routes'));
app.use('/api', require('./rutas/proyectos.routes'));
app.use('/api', require('./rutas/inventario.routes'));
app.use('/api', require('./rutas/alertas.routes'));
app.use('/api', require('./rutas/sync.routes'));
app.use('/api', require('./rutas/pedidos.routes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
