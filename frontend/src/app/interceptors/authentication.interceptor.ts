import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/authentication/authentication.service';

export const jwtInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const auth = inject(AuthService);
  const token = auth.getAccessToken();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // Never try to refresh if this IS the refresh call itself (avoid infinite loop)
      const isRefreshCall = req.url.includes('/api/auth/refresh');

      if (err.status === 401 && !isRefreshCall && auth.getRefreshToken()) {
        return auth.refreshToken().pipe(
          switchMap(res => {
            const retried = req.clone({ setHeaders: { Authorization: `Bearer ${res.accessToken}` } });
            return next(retried);
          }),
          catchError(refreshErr => {
            auth.logout();
            return throwError(() => refreshErr);
          })
        );
      }
      return throwError(() => err);
    })
  );
};
