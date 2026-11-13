# ConstructX — Instrucciones para asistentes de IA

Antes de generar o modificar código, lee y acata:

1. `docs/agents.md` — reglas obligatorias (qué se puede y qué NO se puede hacer) y paleta de colores.
2. `docs/estructura.md` — estructura de carpetas estricta.
3. `docs/flujo_negocio.md` — ciclo de vida de materiales, pedidos de flete y algoritmo auditor.
4. `docs/api.md` — contrato de endpoints y eventos de Socket.io.

Reglas intocables:
- `Consumo_Real% > Avance_Obra% + 5%` ⇒ alerta naranja (`backend/src/servicios/alertas.service.js`).
- Pedido de flete = verificar stock + descontar inventario + crear pedido/detalles/movimientos en UNA transacción (`backend/src/servicios/pedidos.service.js`).

Antes de entregar cambios: `cd backend && npm test` y `cd frontend && npx ng build` deben pasar.
