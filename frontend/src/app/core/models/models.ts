export type Rol = 'admin' | 'bodeguero' | 'residente' | 'cliente';
export type TipoMovimiento = 'INGRESO_BODEGA' | 'ENVIO_OBRA' | 'CONSUMO_OBRA' | 'SALIDA_FLETE';
export type EstadoPedido = 'PENDIENTE' | 'EN_RUTA' | 'ENTREGADO';
export type EstadoAlerta = 'ACTIVA' | 'REVISADA' | 'RESUELTA';

export interface Usuario {
  id: string;
  email: string;
  rol: Rol;
  nombre: string;
  telefono?: string | null;
  empresa?: string | null;
  direccion?: string | null;
}

export interface RegistroCliente {
  email: string;
  password: string;
  nombre: string;
  telefono?: string;
  empresa?: string;
  direccion?: string;
}

export interface LoginResponse {
  token: string;
  user: Usuario;
}

export interface Proyecto {
  id: string;
  nombre: string;
  ubicacion: string | null;
  fecha_inicio: string | null;
  estado: string;
  avance_promedio?: number;
  alertas_activas?: number;
  updated_at: string;
}

export interface LineaBom {
  id: string;
  tarea_id: string;
  material_id: string;
  material_nombre: string;
  unidad: string;
  codigo_sku: string;
  cantidad_presupuestada: number;
  cantidad_consumida: number;
}

export interface Tarea {
  id: string;
  fase_id: string;
  nombre: string;
  estado: 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA';
  bom: LineaBom[];
}

export interface Fase {
  id: string;
  proyecto_id: string;
  nombre: string;
  porcentaje_avance_real: number;
  updated_at: string;
  tareas: Tarea[];
}

export interface ProyectoDetalle extends Proyecto {
  fases: Fase[];
}

export interface Material {
  id: string;
  codigo_sku: string;
  nombre: string;
  unidad: string;
}

export interface ItemInventario {
  id: string;
  material_id: string;
  codigo_sku: string;
  nombre: string;
  unidad: string;
  stock_actual: number;
  updated_at: string;
}

export interface Movimiento {
  uuid: string;
  proyecto_id: string | null;
  tarea_id: string | null;
  material_id: string;
  cantidad: number;
  tipo: TipoMovimiento;
  usuario_id: string;
  timestamp: string;
  material_nombre?: string;
  unidad?: string;
  usuario_nombre?: string;
  tarea_nombre?: string | null;
  proyecto_nombre?: string | null;
  duplicado?: boolean;
}

export interface NuevoMovimiento {
  uuid?: string;
  tipo: TipoMovimiento;
  material_id: string;
  cantidad: number;
  proyecto_id?: string | null;
  tarea_id?: string | null;
  timestamp?: string;
}

export interface Alerta {
  id: string;
  proyecto_id: string;
  proyecto_nombre: string;
  fase_nombre: string;
  tarea_nombre: string;
  material_nombre: string;
  unidad: string;
  consumo_pct: number;
  avance_pct: number;
  desviacion_pct: number;
  mensaje: string;
  estado: EstadoAlerta;
  updated_at: string;
}

// ---------- Portal de clientes ----------
export interface MaterialCatalogo {
  id: string;
  codigo_sku: string;
  nombre: string;
  unidad: string;
  categoria: string;
  descripcion: string | null;
  precio_unitario: number;
  imagen_url: string | null;
  stock_disponible: number;
}

export interface CatalogoResponse {
  categorias: string[];
  materiales: MaterialCatalogo[];
  tarifa_flete: { base: number; porcentaje: number; gratis_desde: number };
}

export interface ItemCarrito {
  material: MaterialCatalogo;
  cantidad: number;
}

export interface Cotizacion {
  subtotal: number;
  costo_flete: number;
  total_pagar: number;
  faltantes: Array<{ material_id: string; material_nombre: string; solicitado: number; disponible: number }>;
}

export interface DetallePedido {
  id: string;
  material_id: string;
  material_nombre: string;
  codigo_sku: string;
  unidad: string;
  imagen_url: string | null;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface Pedido {
  uuid: string;
  cliente_id: string;
  cliente_nombre: string;
  cliente_email?: string;
  cliente_empresa?: string | null;
  subtotal: number;
  costo_flete: number;
  total_pagar: number;
  estado: EstadoPedido;
  direccion_entrega: string;
  telefono_contacto: string | null;
  notas: string | null;
  recibo_enviado_at: string | null;
  timestamp: string;
  updated_at: string;
  total_lineas?: number;
  detalles?: DetallePedido[];
  duplicado?: boolean;
  actualizado_por?: string;
}

export interface DashboardResumen {
  comercial: {
    pedidos_pendientes: number;
    pedidos_en_ruta: number;
    ventas_mes: number;
    pedidos_hoy: number;
  };
  pedidos_recientes: Pedido[];
  kpis: {
    proyectos_activos: number;
    alertas_activas: number;
    materiales: number;
    movimientos_hoy: number;
    avance_global: number;
  };
  proyectos: Array<{
    id: string;
    nombre: string;
    ubicacion: string | null;
    estado: string;
    avance_pct: number;
    consumo_pct: number;
    alertas_activas: number;
  }>;
  stock: Array<{ nombre: string; unidad: string; stock_actual: number }>;
  alertas: Alerta[];
}
