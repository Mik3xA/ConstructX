import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Rol, UsuarioAdmin } from '../../../core/models/models';
import { AuthService } from '../../../core/services/auth.service';
import { PanelService } from '../../../core/services/panel.service';
import { ToastService } from '../../../core/services/toast.service';
import { mensajeError } from '../../../core/utils/http-error';

const ETIQUETA: Record<Rol, string> = { admin: 'Administrador', bodeguero: 'Bodeguero', residente: 'Residente', cliente: 'Cliente' };

/** Administración de usuarios: clientes (con su historial de compra) y equipo interno. */
@Component({
  selector: 'cx-usuarios',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule],
  template: `
    <div class="page">
      <header class="page__header">
        <div><span class="eyebrow">Administración</span><h1>Usuarios</h1><p>Activa o desactiva cuentas y da de alta a tu equipo.</p></div>
      </header>

      @if (error) { <div class="banner banner--error">{{ error }}</div> }

      <div class="tabs" role="tablist">
        <button type="button" role="tab" [class.is-active]="vista === 'clientes'" (click)="vista = 'clientes'">Clientes ({{ clientes.length }})</button>
        <button type="button" role="tab" [class.is-active]="vista === 'equipo'" (click)="vista = 'equipo'">Equipo interno ({{ equipo.length }})</button>
      </div>

      @if (vista === 'equipo') {
        <form class="card alta" [formGroup]="form" (ngSubmit)="crear()">
          <h2>Dar de alta a un empleado</h2>
          <div class="alta__grid">
            <div class="field"><label for="u-nombre">Nombre</label><input id="u-nombre" class="input" formControlName="nombre" /></div>
            <div class="field"><label for="u-email">Correo</label><input id="u-email" class="input" type="email" formControlName="email" /></div>
            <div class="field"><label for="u-rol">Rol</label>
              <select id="u-rol" class="select" formControlName="rol">
                <option value="bodeguero">Bodeguero</option><option value="residente">Residente de obra</option><option value="admin">Administrador</option>
              </select></div>
            <div class="field"><label for="u-pass">Contraseña inicial</label><input id="u-pass" class="input" type="password" formControlName="password" autocomplete="new-password" /></div>
          </div>
          <div><button class="btn btn--primary" type="submit" [disabled]="form.invalid">Crear cuenta</button></div>
        </form>
      }

      <section class="card">
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Usuario</th><th>Rol</th>
              @if (vista === 'clientes') { <th class="num">Pedidos</th><th class="num">Comprado</th> }
              <th>Alta</th><th>Estado</th></tr></thead>
            <tbody>
              @for (u of (vista === 'clientes' ? clientes : equipo); track u.id) {
                <tr [class.is-off]="!u.activo" data-testid="fila-usuario">
                  <td><strong>{{ u.nombre }}</strong><div class="muted small">{{ u.email }}@if (u.empresa) { · {{ u.empresa }} }</div></td>
                  <td><span class="chip" [class.chip--orange]="u.rol === 'admin'" [class.chip--amber]="u.rol !== 'admin' && u.rol !== 'cliente'">{{ etiqueta[u.rol] }}</span></td>
                  @if (vista === 'clientes') {
                    <td class="num">{{ u.total_pedidos }}</td>
                    <td class="num">{{ u.total_comprado | currency: 'MXN' : 'symbol-narrow' : '1.0-0' }}</td>
                  }
                  <td class="muted small">{{ u.created_at | date: 'd MMM y' }}</td>
                  <td>
                    @if (u.id === yo) { <span class="muted small">Tú</span> }
                    @else {
                      <button type="button" class="btn btn--sm" [class.btn--ghost]="u.activo" [class.btn--soft]="!u.activo" (click)="alternar(u)">
                        {{ u.activo ? 'Desactivar' : 'Reactivar' }}
                      </button>
                    }
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
    tr.is-off td:not(:last-child) { opacity: 0.5; }
    .tabs { display: flex; gap: 0.25rem; border-bottom: 1px solid var(--border);
      button { padding: 0.7rem 1rem; border: 0; background: none; font: inherit; font-weight: 700; color: var(--text-muted); cursor: pointer; border-bottom: 3px solid transparent; margin-bottom: -1px;
        &.is-active { color: var(--primary-orange); border-color: var(--primary-orange); } } }
    .alta { display: flex; flex-direction: column; gap: 1rem; h2 { font-size: 1.1rem; }
      &__grid { display: grid; gap: 1rem; @include md { grid-template-columns: repeat(2, 1fr); } @include lg { grid-template-columns: repeat(4, 1fr); } } }
  `,
})
export class UsuariosComponent implements OnInit {
  private readonly panel = inject(PanelService);
  private readonly toasts = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  readonly yo = inject(AuthService).user?.id;
  readonly etiqueta = ETIQUETA;

  vista: 'clientes' | 'equipo' = 'clientes';
  usuarios: UsuarioAdmin[] = [];
  error = '';

  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    rol: ['bodeguero' as Rol],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  get clientes(): UsuarioAdmin[] {
    return this.usuarios.filter((u) => u.rol === 'cliente');
  }
  get equipo(): UsuarioAdmin[] {
    return this.usuarios.filter((u) => u.rol !== 'cliente');
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.panel.usuarios().subscribe({ next: (u) => (this.usuarios = u), error: (e) => (this.error = mensajeError(e)) });
  }

  alternar(u: UsuarioAdmin): void {
    this.panel.actualizarUsuario(u.id, { activo: !u.activo }).subscribe({
      next: (act) => {
        u.activo = act.activo;
        this.toasts.mostrar({ tipo: 'info', titulo: act.activo ? 'Cuenta reactivada' : 'Cuenta desactivada', mensaje: u.email }, 3000);
      },
      error: (e) => (this.error = mensajeError(e)),
    });
  }

  crear(): void {
    this.panel.crearEmpleado(this.form.getRawValue()).subscribe({
      next: (u) => {
        this.toasts.mostrar({ tipo: 'exito', titulo: 'Empleado creado', mensaje: `${u.nombre} (${ETIQUETA[u.rol]})` }, 3000);
        this.form.reset({ rol: 'bodeguero' });
        this.cargar();
      },
      error: (e) => (this.error = mensajeError(e)),
    });
  }
}
