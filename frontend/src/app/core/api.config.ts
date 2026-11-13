import { InjectionToken } from '@angular/core';
import { environment } from '../../environments/environment';

/** URL base de la API REST del backend Node.js. */
export const API_URL = new InjectionToken<string>('API_URL', {
  providedIn: 'root',
  factory: () => environment.apiUrl,
});

/** URL del servidor Socket.io (mismo host que la API). */
export const SOCKET_URL = new InjectionToken<string>('SOCKET_URL', {
  providedIn: 'root',
  factory: () => environment.socketUrl,
});
