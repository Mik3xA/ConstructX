import { Component, Input } from '@angular/core';
import { EstadoPedido } from '../../../core/models/models';

const CONFIG: Record<EstadoPedido, { texto: string; clase: string }> = {
  PENDIENTE: { texto: 'Pendiente', clase: 'chip--amber' },
  EN_RUTA: { texto: 'En ruta', clase: 'chip--orange' },
  ENTREGADO: { texto: 'Entregado', clase: 'chip--olive' },
};

@Component({
  selector: 'cx-estado-pedido',
  standalone: true,
  template: `<span class="chip" [class]="'chip ' + cfg.clase">
    <span class="dot" [class.dot--pulse]="estado === 'EN_RUTA'"></span>{{ cfg.texto }}
  </span>`,
})
export class EstadoPedidoComponent {
  @Input({ required: true }) estado!: EstadoPedido;
  get cfg() {
    return CONFIG[this.estado] ?? CONFIG.PENDIENTE;
  }
}
