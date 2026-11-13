import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { API_URL } from '../api.config';
import { CatalogoResponse } from '../models/models';

@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_URL);

  private readonly catalogoSubject = new BehaviorSubject<CatalogoResponse | null>(null);
  readonly catalogo$ = this.catalogoSubject.asObservable();

  cargar(filtro: { categoria?: string; q?: string } = {}): Observable<CatalogoResponse> {
    let params = new HttpParams();
    if (filtro.categoria) params = params.set('categoria', filtro.categoria);
    if (filtro.q) params = params.set('q', filtro.q);
    return this.http
      .get<CatalogoResponse>(`${this.api}/catalogo`, { params })
      .pipe(tap((c) => this.catalogoSubject.next(c)));
  }
}
