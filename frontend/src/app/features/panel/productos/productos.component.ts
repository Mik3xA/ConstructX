import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ItemInventario } from '../../../core/models/models';
import { InventarioService } from '../../../core/services/inventario.service';
import { PanelService } from '../../../core/services/panel.service';
import { ToastService } from '../../../core/services/toast.service';
import { mensajeError } from '../../../core/utils/http-error';
import { MaterialImgComponent } from '../../../shared/components/material-img/material-img.component';

/** Administración del catálogo: precios, fotos, visibilidad en la tienda y alta de productos. */
@Component({
  selector: 'cx-productos',
  standalone: true,
  imports: [DecimalPipe, FormsModule, ReactiveFormsModule, MaterialImgComponent],
  template: `
    <div class="page">
      <header class="page__header">
        <div><span class="eyebrow">Administración</span><h1>Productos de la tienda</h1><p>Edita precios, fotos y qué productos ven los clientes.</p></div>
        <button type="button" class="btn btn--primary" (click)="nuevoAbierto = !nuevoAbierto">{{ nuevoAbierto ? 'Cerrar' : '+ Nuevo producto' }}</button>
      </header>

      @if (error) { <div class="banner banner--error">{{ error }}</div> }

      @if (nuevoAbierto) {
        <form class="card nuevo" [formGroup]="nuevo" (ngSubmit)="crear()">
          <h2>Nuevo producto</h2>
          <div class="nuevo__grid">
            <div class="field"><label for="n-sku">SKU</label><input id="n-sku" class="input mono" formControlName="codigo_sku" placeholder="CEM-25KG" /></div>
            <div class="field"><label for="n-nombre">Nombre</label><input id="n-nombre" class="input" formControlName="nombre" /></div>
            <div class="field"><label for="n-cat">Categoría</label>
              <select id="n-cat" class="select" formControlName="categoria">@for (c of categorias; track c) { <option [value]="c">{{ c }}</option> }</select></div>
            <div class="field"><label for="n-unidad">Unidad</label><input id="n-unidad" class="input" formControlName="unidad" placeholder="bulto, pieza, m3…" /></div>
            <div class="field"><label for="n-precio">Precio (MXN)</label><input id="n-precio" class="input mono" type="number" min="0" step="0.01" formControlName="precio_unitario" /></div>
            <div class="field"><label for="n-img">URL de imagen</label><input id="n-img" class="input" formControlName="imagen_url" placeholder="https://…" /></div>
          </div>
          <div class="field"><label for="n-desc">Descripción</label><input id="n-desc" class="input" formControlName="descripcion" /></div>
          <div><button class="btn btn--primary" type="submit" [disabled]="nuevo.invalid">Crear producto</button>
            <span class="muted small"> · Se crea con stock 0; la bodega registra la entrada.</span></div>
        </form>
      }

      <section class="card">
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th></th><th>Producto</th><th>Categoría</th><th class="num">Stock</th><th>Precio (MXN)</th><th>En tienda</th></tr></thead>
            <tbody>
              @for (p of productos; track p.material_id) {
                <tr [class.is-off]="!p.activo">
                  <td><cx-material-img class="thumb" [url]="p.imagen_url" [categoria]="p.categoria" [alt]="p.nombre" /></td>
                  <td><strong>{{ p.nombre }}</strong><div class="muted small mono">{{ p.codigo_sku }} · {{ p.unidad }}</div></td>
                  <td class="muted">{{ p.categoria }}</td>
                  <td class="num" [class.text-danger]="p.stock_bajo">{{ p.stock_actual | number: '1.0-2' }}</td>
                  <td>
                    <div class="precio">
                      <input class="input mono" type="number" min="0" step="0.01" [(ngModel)]="precios[p.material_id]" [attr.aria-label]="'Precio de ' + p.nombre" />
                      @if (precios[p.material_id] !== p.precio_unitario) {
                        <button type="button" class="btn btn--primary btn--sm" (click)="guardarPrecio(p)">Guardar</button>
                      }
                    </div>
                  </td>
                  <td>
                    <label class="switch">
                      <input type="checkbox" [checked]="!!p.activo" (change)="alternar(p)" [attr.aria-label]="'Mostrar ' + p.nombre + ' en la tienda'" />
                      <span></span>
                    </label>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
  styles: `
    @use 'variables' as *;
    @use 'mixins' as *;
    .small { font-size: 0.75rem; }
    .thumb { width: 52px; height: 52px; border-radius: $radius-sm; }
    tr.is-off td { opacity: 0.55; }
    .precio { display: flex; gap: 0.4rem; align-items: center; .input { width: 120px; height: 36px; text-align: right; } }
    .nuevo { display: flex; flex-direction: column; gap: 1rem; h2 { font-size: 1.1rem; }
      &__grid { display: grid; gap: 1rem; @include md { grid-template-columns: repeat(3, 1fr); } } }
    .switch { position: relative; display: inline-block; width: 44px; height: 24px;
      input { opacity: 0; width: 0; height: 0; }
      span { position: absolute; inset: 0; border-radius: 999px; background: var(--border-strong); cursor: pointer; transition: background $transition;
        &::before { content: ''; position: absolute; width: 18px; height: 18px; left: 3px; top: 3px; border-radius: 50%; background: #fff; transition: transform $transition; } }
      input:checked + span { background: var(--accent-olive); &::before { transform: translateX(20px); } }
      input:focus-visible + span { @include focus-ring; } }
  `,
})
export class ProductosComponent implements OnInit {
  private readonly inv = inject(InventarioService);
  private readonly panel = inject(PanelService);
  private readonly toasts = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly categorias = ['Cementantes', 'Acero', 'Mampostería', 'Agregados', 'Madera y cimbra', 'General'];
  productos: ItemInventario[] = [];
  precios: Record<string, number> = {};
  nuevoAbierto = false;
  error = '';

  readonly nuevo = this.fb.nonNullable.group({
    codigo_sku: ['', Validators.required],
    nombre: ['', Validators.required],
    categoria: ['Cementantes'],
    unidad: ['pieza', Validators.required],
    precio_unitario: [0, [Validators.required, Validators.min(0)]],
    imagen_url: [''],
    descripcion: [''],
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.inv.cargarInventario().subscribe({
      next: (lista) => {
        this.productos = lista;
        this.precios = Object.fromEntries(lista.map((p) => [p.material_id, p.precio_unitario]));
      },
      error: (e) => (this.error = mensajeError(e)),
    });
  }

  guardarPrecio(p: ItemInventario): void {
    const precio = Number(this.precios[p.material_id]);
    this.panel.actualizarMaterial(p.material_id, { precio_unitario: precio }).subscribe({
      next: () => {
        p.precio_unitario = precio;
        this.toasts.mostrar({ tipo: 'exito', titulo: 'Precio actualizado', mensaje: `${p.nombre}: $${precio}` }, 3000);
      },
      error: (e) => (this.error = mensajeError(e)),
    });
  }

  alternar(p: ItemInventario): void {
    const activo = !p.activo;
    this.panel.actualizarMaterial(p.material_id, { activo }).subscribe({
      next: () => (p.activo = activo ? 1 : 0),
      error: (e) => (this.error = mensajeError(e)),
    });
  }

  crear(): void {
    const v = this.nuevo.getRawValue();
    this.panel.crearMaterial({ ...v, precio_unitario: Number(v.precio_unitario), imagen_url: v.imagen_url || undefined }).subscribe({
      next: (m) => {
        this.toasts.mostrar({ tipo: 'exito', titulo: 'Producto creado', mensaje: m.nombre }, 3000);
        this.nuevo.reset({ categoria: 'Cementantes', unidad: 'pieza', precio_unitario: 0 });
        this.nuevoAbierto = false;
        this.cargar();
      },
      error: (e) => (this.error = mensajeError(e)),
    });
  }
}
