import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { mensajeError } from '../../core/utils/http-error';

@Component({
  selector: 'bs-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="login">
      <section class="hero">
        <div class="hero__grid" aria-hidden="true"></div>
        <div class="hero__copy">
          <span class="eyebrow">BuildSync ERP</span>
          <h1>Cada bulto,<br /><span class="text-primary">trazado.</span></h1>
          <p>Control de materiales de obra en tiempo real. El presupuesto BOM contra el consumo real,
             con alertas <span class="text-accent">naranjas</span> cuando algo no cuadra.</p>
        </div>
      </section>

      <section class="panel">
        <form class="form" [formGroup]="form" (ngSubmit)="entrar()">
          <img src="assets/logo.svg" alt="" width="44" height="44" />
          <div>
            <h2>Iniciar sesión</h2>
            <p class="muted">Accede con tu cuenta corporativa.</p>
          </div>

          <div class="field">
            <label for="email">Correo</label>
            <input id="email" class="input" type="email" formControlName="email" autocomplete="username" placeholder="tu@empresa.com" />
          </div>
          <div class="field">
            <label for="password">Contraseña</label>
            <input id="password" class="input" type="password" formControlName="password" autocomplete="current-password" placeholder="••••••••" />
          </div>

          @if (error) {
            <div class="banner banner--error">{{ error }}</div>
          }

          <button class="btn btn--primary btn--lg btn--block" type="submit" [disabled]="form.invalid || cargando">
            {{ cargando ? 'Verificando…' : 'Entrar' }}
          </button>

          <p class="demo muted">
            Demo: <span class="mono">admin&#64;buildsync.io</span> · <span class="mono">bodega&#64;buildsync.io</span> ·
            <span class="mono">residente&#64;buildsync.io</span> — contraseña <span class="mono">BuildSync123!</span>
          </p>
        </form>
      </section>
    </div>
  `,
  styles: `
    @use 'variables' as *;
    @use 'mixins' as *;

    .login {
      display: grid;
      height: 100vh;
      width: 100vw;
      @include lg { grid-template-columns: 1.2fr 1fr; }
    }

    .hero {
      display: none;
      position: relative;
      overflow: hidden;
      background: radial-gradient(900px 500px at 20% 110%, rgba($blue-600, 0.35), transparent 60%), $charcoal-950;
      border-right: $border;
      @include lg { display: flex; align-items: flex-end; }

      &__grid {
        position: absolute;
        inset: 0;
        background-image: linear-gradient($white-04 1px, transparent 1px), linear-gradient(90deg, $white-04 1px, transparent 1px);
        background-size: 48px 48px;
        mask-image: linear-gradient(180deg, transparent, black 40%, transparent);
      }

      &__copy {
        position: relative;
        padding: 4rem;
        max-width: 620px;
        h1 { font-size: clamp(2.5rem, 4vw, 3.75rem); line-height: 1.05; margin: 0.75rem 0 1.25rem; letter-spacing: -0.03em; }
        p { color: $white-60; font-size: 1.05rem; }
      }
    }

    .panel {
      display: grid;
      place-items: center;
      padding: 1.5rem;
    }

    .form {
      width: 100%;
      max-width: 380px;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      h2 { font-size: 1.6rem; }
      p { margin: 0.25rem 0 0; }
    }

    .demo { font-size: 0.75rem; line-height: 1.7; }
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  cargando = false;
  error = '';

  entrar(): void {
    if (this.form.invalid) return;
    this.cargando = true;
    this.error = '';
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => this.router.navigateByUrl(this.auth.homeUrl()),
      error: (e) => {
        this.error = mensajeError(e);
        this.cargando = false;
      },
    });
  }
}
