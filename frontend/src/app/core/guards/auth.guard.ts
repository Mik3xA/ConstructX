import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Rol } from '../models/models';
import { AuthService } from '../services/auth.service';

/** Requiere sesión activa. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.user ? true : inject(Router).createUrlTree(['/login']);
};

/** Requiere uno de los roles indicados en `data.roles` (admin siempre pasa). */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const roles = (route.data['roles'] as Rol[] | undefined) ?? [];

  if (!auth.user) return router.createUrlTree(['/login']);
  return auth.hasRole(...roles) ? true : router.createUrlTree([auth.homeUrl()]);
};

/** Evita que un usuario autenticado vea el login. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.user ? inject(Router).createUrlTree([auth.homeUrl()]) : true;
};
