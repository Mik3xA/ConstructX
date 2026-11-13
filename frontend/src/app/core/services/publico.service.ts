import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { API_URL } from '../api.config';
import { CatalogoPublico, InfoPublica, MaterialCatalogo } from '../models/models';

/** API pública de la tienda (no requiere sesión). */
@Injectable({ providedIn: 'root' })
export class PublicoService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_URL);

  /** Se cachea durante la sesión de navegación. */
  readonly info$: Observable<InfoPublica> = this.http.get<InfoPublica>(`${this.api}/public/info`).pipe(shareReplay(1));

  catalogo(filtro: { categoria?: string; q?: string } = {}): Observable<CatalogoPublico> {
    let params = new HttpParams();
    if (filtro.categoria) params = params.set('categoria', filtro.categoria);
    if (filtro.q) params = params.set('q', filtro.q);
    return this.http.get<CatalogoPublico>(`${this.api}/public/catalogo`, { params });
  }

  producto(sku: string): Observable<{ producto: MaterialCatalogo; relacionados: MaterialCatalogo[] }> {
    return this.http.get<{ producto: MaterialCatalogo; relacionados: MaterialCatalogo[] }>(
      `${this.api}/public/catalogo/${encodeURIComponent(sku)}`,
    );
  }

  contacto(datos: { nombre: string; email: string; telefono?: string; asunto: string; mensaje: string }) {
    return this.http.post<{ ok: boolean; id: string }>(`${this.api}/public/contacto`, datos);
  }
}
