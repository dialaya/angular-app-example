import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, delay, map, Observable, of, Subscription, tap } from 'rxjs';
import { environment } from '@src/environments/environment';
import { AuthenticatedUser } from '../models/authenticated-user';
import { AuthenticationResult } from '../models/authentication-result';

@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnDestroy {
  
  private readonly apiUrl = `${environment.apiBaseUrl}api/account`;
  private _timer: Subscription | null = null;
  private _loggedUser = new BehaviorSubject<AuthenticatedUser | null>(null);
  loggedUserObs$ = this._loggedUser.asObservable();

  constructor(private httpClient: HttpClient, private router: Router) 
  { 
    window.addEventListener('storage', this.storageEventListener.bind(this));
  }

  ngOnDestroy(): void {
    window.removeEventListener('storage', this.storageEventListener.bind(this));
  }

  private _stopTokenAutoRefreshTimer() {
    this._timer?.unsubscribe();
  }

  private storageEventListener(event: StorageEvent) {
    if (event.storageArea === localStorage) {
      if (event.key === 'logout-event') {
        this._stopTokenAutoRefreshTimer();
        this._loggedUser.next(null);
      }
      if (event.key === 'login-event') {
        this._stopTokenAutoRefreshTimer();
        this.httpClient.get<AuthenticationResult>(`${this.apiUrl}/user`).subscribe((usr) => {
          this._loggedUser.next({
            login: usr.login,
            roles: usr.roles,
            fullname:  usr.firstname + ' ' + usr.lastname
          });
        });
      }
    }
  }

  private getTokenRemainingTime() {
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
      const jwtToken = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString('ascii'));
      const expires = new Date(jwtToken.exp * 1000);
      return expires.getTime() - Date.now();
    }
    return 0;
  }

  removeAuthenticationResult() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.setItem('logout-event', 'logout' + Math.random());
  }

  saveAuthenticationResult(ar: AuthenticationResult) {
    localStorage.setItem('access_token', ar.accessToken);
    localStorage.setItem('refresh_token', ar.refreshToken);
    localStorage.setItem('login-event', 'login' + Math.random());
  }

  private startTokenAutoRefreshTimer() {
    const timeout = this.getTokenRemainingTime();
    this._timer = of(true)
      .pipe(
        delay(timeout),
        tap({
          next: () => this.refreshToken().subscribe(),
        })
      )
      .subscribe();
  }

  login(usr: string, pwd: string) {
    const cxnData = {username: usr, password: pwd};
    return this.httpClient.post(this.apiUrl + '/login', cxnData)
    .pipe(
      map(result => {
        return result;
      })
    );
  }

  refreshToken(): Observable<AuthenticationResult | null> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      this.removeAuthenticationResult();
      return of(null);
    }

    return this.httpClient
      .post<AuthenticationResult>(`${this.apiUrl}/refresh-token`, { refreshToken })
      .pipe(
        map((v) => {
          this._loggedUser.next({
            login: v.login,
            roles: v.roles,
            fullname: v.firstname + ' ' + v.lastname,
          });
          this.saveAuthenticationResult(v);
          this.startTokenAutoRefreshTimer();
          return v;
        })
      );
  }

}
