import { HttpErrorResponse } from '@angular/common/http';

/** Extrae un mensaje legible de un error HTTP del backend. */
export function mensajeError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'No hay conexión con el servidor.';
    return (err.error && err.error.error) || `Error ${err.status}`;
  }
  return 'Error inesperado.';
}
