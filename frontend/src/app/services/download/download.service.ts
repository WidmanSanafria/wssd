import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import type { DownloadInfoResponse, Download } from '../../model/download.models';

@Injectable({ providedIn: 'root' })
export class DownloadService {
  private http = inject(HttpClient);

  readonly result  = signal<DownloadInfoResponse | null>(null);
  readonly loading = signal(false);
  readonly error   = signal<string | null>(null);

  getInfo(url: string): Observable<DownloadInfoResponse> {
    this.loading.set(true);
    this.error.set(null);
    return this.http.post<DownloadInfoResponse>('/api/download/info', { url }).pipe(
      tap(res => { this.result.set(res); this.loading.set(false); }),
      catchError(err => {
        const msg = err.error?.error ?? err.error?.detail ?? 'Error al obtener información del video';
        this.error.set(msg);
        this.loading.set(false);
        return throwError(() => new Error(msg));
      })
    );
  }

  getProxyUrl(url: string, filename: string): string {
    return `/api/download/proxy?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
  }

  getMergeUrl(videoUrl: string, audioUrl: string, filename: string): string {
    return `/api/download/merge?video_url=${encodeURIComponent(videoUrl)}&audio_url=${encodeURIComponent(audioUrl)}&filename=${encodeURIComponent(filename)}`;
  }

  getYtdlpUrl(pageUrl: string, formatId: string, filename: string): string {
    return `/api/download/ytdlp?page_url=${encodeURIComponent(pageUrl)}&format_id=${encodeURIComponent(formatId)}&filename=${encodeURIComponent(filename)}`;
  }

  getHistory(): Observable<Download[]> {
    return this.http.get<Download[]>('/api/download/history');
  }

  clearResult(): void {
    this.result.set(null);
    this.error.set(null);
  }
}
