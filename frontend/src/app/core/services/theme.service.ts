import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';

export type Tema = 'light' | 'dark';
const CLAVE = 'cx_theme';

/**
 * Tema Light/Dark.
 * - Sin preferencia guardada: sigue al sistema (`prefers-color-scheme`) y reacciona si cambia.
 * - Con el toggle: fija `<html data-theme="...">` y lo recuerda en este navegador.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly media = this.doc.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');

  private readonly elegido = new BehaviorSubject<Tema | null>(this.leer());
  private readonly sistema = new BehaviorSubject<Tema>(this.media?.matches ? 'dark' : 'light');

  /** Tema efectivo (elección manual o, si no hay, el del sistema). */
  readonly tema$ = this.elegido.pipe(map((t) => t ?? this.sistema.value));

  constructor() {
    this.media?.addEventListener?.('change', (e) => {
      this.sistema.next(e.matches ? 'dark' : 'light');
      if (!this.elegido.value) this.elegido.next(null); // re-emite tema$
    });
    this.aplicar(this.elegido.value);
  }

  get tema(): Tema {
    return this.elegido.value ?? this.sistema.value;
  }

  alternar(): void {
    this.fijar(this.tema === 'dark' ? 'light' : 'dark');
  }

  fijar(tema: Tema): void {
    try {
      localStorage.setItem(CLAVE, tema);
    } catch {
      /* sin almacenamiento: solo dura la sesión */
    }
    this.aplicar(tema);
    this.elegido.next(tema);
  }

  private aplicar(tema: Tema | null): void {
    const html = this.doc.documentElement;
    if (tema) html.setAttribute('data-theme', tema);
    else html.removeAttribute('data-theme');
  }

  private leer(): Tema | null {
    try {
      const t = localStorage.getItem(CLAVE);
      return t === 'light' || t === 'dark' ? t : null;
    } catch {
      return null;
    }
  }
}
