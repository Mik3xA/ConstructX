import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Rol } from '../models/models';
import { AuthService } from '../services/auth.service';

/** Requiere sesión activa. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  return auth.user ? true : inject(Router).createUrlTree(['/acceso'], { queryParams: { volver: state.url } });
};

/** Panel interno: solo personal (admin, bodeguero, residente). */
export const staffGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.user) return router.createUrlTree(['/acceso'], { queryParams: { volver: state.url } });
  return auth.esCliente ? router.createUrlTree(['/']) : true;
};

/** Requiere uno de los roles indicados en `data.roles` (admin siempre pasa). */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const roles = (route.data['roles'] as Rol[] | undefined) ?? [];

  if (!auth.user) return router.createUrlTree(['/acceso']);
  return auth.hasRole(...roles) ? true : router.createUrlTree([auth.homeUrl()]);
};

/** Evita que un usuario autenticado vea el login. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.user ? inject(Router).createUrlTree([auth.homeUrl()]) : true;
};

/** Redirige la raíz a la pantalla de inicio del rol (cliente -> catálogo, admin -> dashboard...). */
export const homeGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return inject(Router).createUrlTree([auth.homeUrl()]);
};
