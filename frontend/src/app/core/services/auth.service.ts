import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { API_URL } from '../api.config';
import { LoginResponse, RegistroCliente, Rol, Usuario } from '../models/models';
import { CarritoService } from './carrito.service';
import { PedidosService } from './pedidos.service';

const TOKEN_KEY = 'cx_token';
const USER_KEY = 'cx_user';

/** Ruta de inicio según rol. */
export const HOME_POR_ROL: Record<Rol, string> = {
  admin: '/panel/dashboard',
  bodeguero: '/panel/fletes',
  residente: '/panel/campo',
  cliente: '/catalogo',
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly api = inject(API_URL);
  private readonly carrito = inject(CarritoService);
  private readonly pedidos = inject(PedidosService);

  private readonly userSubject = new BehaviorSubject<Usuario | null>(this.leerUsuario());
  readonly user$ = this.userSubject.asObservable();
  readonly isLoggedIn$ = this.user$.pipe(map((u) => !!u));

  get user(): Usuario | null {
    return this.userSubject.value;
  }

  /** Respaldo en memoria si localStorage no está disponible (modo privado estricto). */
  private tokenEnMemoria: string | null = null;

  get token(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY) ?? this.tokenEnMemoria;
    } catch {
      return this.tokenEnMemoria;
    }
  }

  private guardarSesion({ token, user }: LoginResponse): void {
    this.tokenEnMemoria = token;
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      /* se mantiene solo en memoria */
    }
    this.userSubject.next(user);
  }

  login(email: string, password: string): Observable<Usuario> {
    return this.http
      .post<LoginResponse>(`${this.api}/auth/login`, { email, password })
      .pipe(tap((r) => this.guardarSesion(r)), map(({ user }) => user));
  }

  /** Alta pública de clientes del portal. Inicia sesión automáticamente. */
  registrar(datos: RegistroCliente): Observable<Usuario> {
    return this.http
      .post<LoginResponse>(`${this.api}/auth/registro`, datos)
      .pipe(tap((r) => this.guardarSesion(r)), map(({ user }) => user));
  }

  actualizarPerfil(cambios: Partial<Usuario> & { password_actual?: string; password_nueva?: string }): Observable<Usuario> {
    return this.http.patch<Usuario>(`${this.api}/auth/me`, cambios).pipe(tap((u) => this.refrescarUsuario(u)));
  }

  logout(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      /* almacenamiento no disponible */
    }
    this.tokenEnMemoria = null;
    // Nada de la sesión anterior debe quedar visible para el siguiente usuario del navegador
    this.carrito.vaciar();
    this.pedidos.limpiar();
    this.userSubject.next(null);
    this.router.navigateByUrl('/');
  }

  /** El admin pasa siempre (igual que verifyRole en el backend). */
  hasRole(...roles: Rol[]): boolean {
    const u = this.user;
    return !!u && (u.rol === 'admin' || roles.includes(u.rol));
  }

  /** Coincidencia exacta de rol (sin el comodín de admin). Útil para menús. */
  esRol(...roles: Rol[]): boolean {
    const u = this.user;
    return !!u && roles.includes(u.rol);
  }

  homeUrl(): string {
    return this.user ? HOME_POR_ROL[this.user.rol] : '/';
  }

  get esCliente(): boolean {
    return this.user?.rol === 'cliente';
  }

  /** Actualiza el usuario en sesión (p. ej. tras editar el perfil). */
  refrescarUsuario(u: Usuario): void {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    } catch {
      /* solo memoria */
    }
    this.userSubject.next(u);
  }

  private leerUsuario(): Usuario | null {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const raw = localStorage.getItem(USER_KEY);
      if (!token || !raw || this.tokenExpirado(token)) return null;
      return JSON.parse(raw) as Usuario;
    } catch {
      return null;
    }
  }

  private tokenExpirado(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
}
