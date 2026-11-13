import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { API_URL } from '../api.config';
import { LoginResponse, Rol, Usuario } from '../models/models';

const TOKEN_KEY = 'bs_token';
const USER_KEY = 'bs_user';

/** Ruta de inicio según rol. */
export const HOME_POR_ROL: Record<Rol, string> = {
  admin: '/dashboard',
  bodeguero: '/bodega',
  residente: '/campo',
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly api = inject(API_URL);

  private readonly userSubject = new BehaviorSubject<Usuario | null>(this.leerUsuario());
  readonly user$ = this.userSubject.asObservable();
  readonly isLoggedIn$ = this.user$.pipe(map((u) => !!u));

  get user(): Usuario | null {
    return this.userSubject.value;
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  login(email: string, password: string): Observable<Usuario> {
    return this.http.post<LoginResponse>(`${this.api}/auth/login`, { email, password }).pipe(
      tap(({ token, user }) => {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        this.userSubject.next(user);
      }),
      map(({ user }) => user),
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.userSubject.next(null);
    this.router.navigateByUrl('/login');
  }

  hasRole(...roles: Rol[]): boolean {
    const u = this.user;
    return !!u && (u.rol === 'admin' || roles.includes(u.rol));
  }

  homeUrl(): string {
    return this.user ? HOME_POR_ROL[this.user.rol] : '/login';
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
