import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { mensajeError } from '../../core/utils/http-error';

type Modo = 'login' | 'registro';

@Component({
  selector: 'cx-login',
  standalone: true,
  imports: [ReactiveFormsModule, AsyncPipe],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly theme = inject(ThemeService);

  modo: Modo = 'login';
  cargando = false;
  error = '';

  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  readonly registroForm = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    empresa: [''],
    email: ['', [Validators.required, Validators.email]],
    telefono: [''],
    direccion: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  readonly demos = [
    { rol: 'Cliente', email: 'cliente@constructx.mx' },
    { rol: 'Admin', email: 'admin@constructx.mx' },
    { rol: 'Bodega', email: 'bodega@constructx.mx' },
    { rol: 'Residente', email: 'residente@constructx.mx' },
  ];

  cambiarModo(m: Modo): void {
    this.modo = m;
    this.error = '';
  }

  usarDemo(email: string): void {
    this.cambiarModo('login');
    this.loginForm.setValue({ email, password: 'ConstructX123!' });
  }

  entrar(): void {
    if (this.loginForm.invalid || this.cargando) return;
    const { email, password } = this.loginForm.getRawValue();
    this.ejecutar(this.auth.login(email, password));
  }

  registrar(): void {
    if (this.registroForm.invalid || this.cargando) {
      this.registroForm.markAllAsTouched();
      return;
    }
    this.ejecutar(this.auth.registrar(this.registroForm.getRawValue()));
  }

  private ejecutar(obs: ReturnType<AuthService['login']>): void {
    this.cargando = true;
    this.error = '';
    obs.subscribe({
      next: () => this.router.navigateByUrl(this.auth.homeUrl()),
      error: (e) => {
        this.error = mensajeError(e);
        this.cargando = false;
      },
    });
  }
}
