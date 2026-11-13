import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { mensajeError } from '../../../core/utils/http-error';
import { MisPedidosComponent } from '../../mis-pedidos/mis-pedidos.component';

/** Área del cliente: historial de pedidos con seguimiento y edición de perfil. */
@Component({
  selector: 'cx-mi-cuenta',
  standalone: true,
  imports: [AsyncPipe, ReactiveFormsModule, RouterLink, MisPedidosComponent],
  template: `
    <div class="wrap cuenta">
      <header class="cuenta__head">
        <div>
          <span class="eyebrow">Mi cuenta</span>
          <h1>Hola, {{ (auth.user$ | async)?.nombre }}</h1>
          <p class="muted">{{ (auth.user$ | async)?.empresa || 'Cliente ConstructX' }} · {{ (auth.user$ | async)?.email }}</p>
        </div>
        <a class="btn btn--primary" routerLink="/catalogo">Nuevo pedido</a>
      </header>

      <div class="tabs" role="tablist">
        <a role="tab" [class.is-active]="(tab$ | async) !== 'perfil'" [routerLink]="[]" [queryParams]="{ tab: null }">Mis pedidos</a>
        <a role="tab" [class.is-active]="(tab$ | async) === 'perfil'" [routerLink]="[]" [queryParams]="{ tab: 'perfil' }" data-testid="tab-perfil">Mi perfil</a>
      </div>

      @if ((tab$ | async) === 'perfil') {
        <div class="perfil">
          <form class="card form" [formGroup]="perfil" (ngSubmit)="guardarPerfil()">
            <h2>Datos de contacto y entrega</h2>
            <div class="grid2">
              <div class="field"><label for="p-nombre">Nombre</label><input id="p-nombre" class="input" formControlName="nombre" /></div>
              <div class="field"><label for="p-empresa">Empresa</label><input id="p-empresa" class="input" formControlName="empresa" /></div>
              <div class="field"><label for="p-tel">Teléfono</label><input id="p-tel" class="input" formControlName="telefono" /></div>
            </div>
            <div class="field"><label for="p-dir">Dirección de entrega predeterminada</label><input id="p-dir" class="input" formControlName="direccion" /></div>
            @if (msgPerfil) { <div class="banner" [class.banner--ok]="!errPerfil" [class.banner--error]="errPerfil">{{ msgPerfil }}</div> }
            <button class="btn btn--primary" type="submit">Guardar cambios</button>
          </form>

          <form class="card form" [formGroup]="clave" (ngSubmit)="cambiarClave()">
            <h2>Cambiar contraseña</h2>
            <div class="field"><label for="p-actual">Contraseña actual</label><input id="p-actual" class="input" type="password" formControlName="password_actual" autocomplete="current-password" /></div>
            <div class="field"><label for="p-nueva">Nueva contraseña (mín. 8)</label><input id="p-nueva" class="input" type="password" formControlName="password_nueva" autocomplete="new-password" /></div>
            @if (msgClave) { <div class="banner" [class.banner--ok]="!errClave" [class.banner--error]="errClave">{{ msgClave }}</div> }
            <button class="btn btn--ghost" type="submit" [disabled]="clave.invalid">Actualizar contraseña</button>
          </form>
        </div>
      } @else {
        <cx-mis-pedidos />
      }
    </div>
  `,
  styles: `
    @use 'variables' as *;
    @use 'mixins' as *;
    .cuenta { padding-top: 2rem; display: flex; flex-direction: column; gap: 1.25rem; }
    .cuenta__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; flex-wrap: wrap;
      h1 { font-size: clamp(1.6rem, 3vw, 2.1rem); margin: 0.2rem 0; } p { margin: 0; } }
    .tabs { display: flex; gap: 0.25rem; border-bottom: 1px solid var(--border);
      a { padding: 0.75rem 1rem; font-weight: 700; color: var(--text-muted); border-bottom: 3px solid transparent; margin-bottom: -1px;
        &.is-active { color: var(--primary-orange); border-color: var(--primary-orange); } } }
    .perfil { display: grid; gap: 1rem; @include lg { grid-template-columns: 1.4fr 1fr; align-items: start; } }
    .form { display: flex; flex-direction: column; gap: 1rem; h2 { font-size: 1.1rem; } }
    .grid2 { display: grid; gap: 1rem; @include md { grid-template-columns: 1fr 1fr; } }
  `,
})
export class MiCuentaComponent {
  readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  readonly tab$ = this.route.queryParamMap.pipe(map((p) => p.get('tab')));

  readonly perfil = this.fb.nonNullable.group({
    nombre: [this.auth.user?.nombre ?? '', Validators.required],
    empresa: [this.auth.user?.empresa ?? ''],
    telefono: [this.auth.user?.telefono ?? ''],
    direccion: [this.auth.user?.direccion ?? ''],
  });
  readonly clave = this.fb.nonNullable.group({
    password_actual: ['', Validators.required],
    password_nueva: ['', [Validators.required, Validators.minLength(8)]],
  });

  msgPerfil = '';
  errPerfil = false;
  msgClave = '';
  errClave = false;

  guardarPerfil(): void {
    this.auth.actualizarPerfil(this.perfil.getRawValue()).subscribe({
      next: () => ((this.msgPerfil = 'Perfil actualizado.'), (this.errPerfil = false)),
      error: (e) => ((this.msgPerfil = mensajeError(e)), (this.errPerfil = true)),
    });
  }

  cambiarClave(): void {
    this.auth.actualizarPerfil(this.clave.getRawValue()).subscribe({
      next: () => {
        this.msgClave = 'Contraseña actualizada.';
        this.errClave = false;
        this.clave.reset();
      },
      error: (e) => ((this.msgClave = mensajeError(e)), (this.errClave = true)),
    });
  }
}
