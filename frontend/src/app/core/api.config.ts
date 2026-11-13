import { InjectionToken } from '@angular/core';

/** URL base del backend Node.js. */
export const API_URL = new InjectionToken<string>('API_URL', {
  providedIn: 'root',
  factory: () => 'http://localhost:3000/api',
});
