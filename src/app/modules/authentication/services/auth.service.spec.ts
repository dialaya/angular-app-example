import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { RouterTestingModule } from '@angular/router/testing';
import { routes } from '../../../app-routing.module'
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { isEmpty, of } from 'rxjs';

describe('AuthService', () => {
  let service: AuthService;
  let httpClient: HttpClient;
  let router: Router;
  let httpTestingController: HttpTestingController;
  let spyLocalStorageSetItem: any;

  beforeEach(async () => {

    TestBed.configureTestingModule({
      imports:[HttpClientTestingModule, RouterTestingModule.withRoutes(routes)]
    });
    httpTestingController = TestBed.inject(HttpTestingController);
    //service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpTestingController.verify();
    jest.resetAllMocks();
  });
  

  beforeEach(() => {
    httpClient = TestBed.inject(HttpClient);
    router = TestBed.inject(Router);

    // not working: https://github.com/facebook/jest/issues/6858
    // const spyLocalStorageSetItem = jest.spyOn(localStorage, 'setItem');
    spyLocalStorageSetItem = jest.spyOn(Storage.prototype, 'setItem');
    spyLocalStorageSetItem.mockImplementation(jest.fn());
  });

  it('should be created and listen to window add event and remove', () => {
    const spyWindowAddEventLstnr = jest.spyOn(window, 'addEventListener');
    spyWindowAddEventLstnr.mockImplementation(jest.fn());

    const spyWindowRemoveEventListener = jest.spyOn(window, 'removeEventListener');
    spyWindowRemoveEventListener.mockImplementation(jest.fn());

    service = TestBed.inject(AuthService);
    expect(service).toBeTruthy();
    expect(spyWindowAddEventLstnr).toHaveBeenCalledTimes(1);
    service.ngOnDestroy();
    expect(spyWindowRemoveEventListener).toHaveBeenCalledTimes(1);
  });

  it('should save authentication result into localstorage', () => {

    const accessTokenValue = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkJha2FyeSBEamliYSIsImlhdCI6MTUxNjI3OTAyMn0.7riR0auHzQubc_VUhZXDtn6sTbu0z4-zoRCvgCCAGFk';
    const refreshTokenValue = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ7';

    service = TestBed.inject(AuthService);

    service.saveAuthenticationResult({
      login: 'dialaya',
      roles: ['MGR', 'ADM'],
      firstname: 'Bakary',
      lastname: 'Djiba',
      accessToken: accessTokenValue,
      refreshToken: refreshTokenValue
    });

    expect(spyLocalStorageSetItem).toBeCalledTimes(3);
    expect(spyLocalStorageSetItem).toHaveBeenNthCalledWith(1,'access_token',accessTokenValue);
    expect(spyLocalStorageSetItem).toHaveBeenNthCalledWith(2,'refresh_token',refreshTokenValue);
  });

  it('should remove authentication result from localstorage', () => {
    
    // not working: https://github.com/facebook/jest/issues/6858
    // const spyLocalStorageSetItem = jest.spyOn(localStorage, 'removeItem');
    const spyLocalStorageRemoveItem = jest.spyOn(Storage.prototype, 'removeItem');
    spyLocalStorageRemoveItem.mockImplementation(jest.fn());

    service = TestBed.inject(AuthService);

    service.removeAuthenticationResult();

    expect(spyLocalStorageRemoveItem).toBeCalledTimes(2);
    expect(spyLocalStorageRemoveItem).toHaveBeenNthCalledWith(1,'access_token');
    expect(spyLocalStorageRemoveItem).toHaveBeenNthCalledWith(2,'refresh_token');
  });

  it('should return null auth result when call to refresh without refresh_token in storage', (done) => {
    const spyLocalStorageGetItem = jest.spyOn(Storage.prototype, 'getItem');
    spyLocalStorageGetItem.mockImplementation((param) => null);
    service = TestBed.inject(AuthService);
    const emptyRefreshResult = service.refreshToken();
    expect(spyLocalStorageGetItem).toBeCalledWith('refresh_token');
    
    emptyRefreshResult.subscribe(v => {
      expect(v).toBe(null);
      done();
    });
  });

  it('should return an auth result when call to refresh with old refresh_token in storage', (done) => {
    const expiredToken = 'bAm.Dbj';
    const authoResult = {
      login: 'dialaya',
      roles: ['MGR', 'ADM'],
      firstname: 'Bakary',
      lastname: 'Djiba',
      accessToken: 'authoToken',
      refreshToken: 'newRefreshToken'
    };
    const spyLocalStorageGetItem = jest.spyOn(Storage.prototype, 'getItem');
    spyLocalStorageGetItem.mockImplementation((param) => expiredToken);

    const spyHttpClientPost = jest.spyOn(httpClient, 'post');
    spyHttpClientPost.mockImplementation(() => of(authoResult));
    

    service = TestBed.inject(AuthService);
    const refreshedResult = service.refreshToken();
    expect(spyLocalStorageGetItem).toBeCalledWith('refresh_token');
    
    refreshedResult.subscribe(v => {
      expect(v).toBe(authoResult);
      done();
    });
  });

  it('should return an auth result when logged with login and password', (done) => {
    const authoResult = {
      login: 'dialaya',
      roles: ['MGR', 'ADM'],
      firstname: 'Bakary',
      lastname: 'Djiba',
      accessToken: 'authoToken',
      refreshToken: 'newRefreshToken'
    };
    const spyHttpClientPost = jest.spyOn(httpClient, 'post');
    spyHttpClientPost.mockImplementation(() => of(authoResult));
    service = TestBed.inject(AuthService);
    const refreshedResultObservable = service.login('dialaya', 'DmyPwd');
    refreshedResultObservable.subscribe(refreshedResult => {
      expect(refreshedResult).toBeDefined();
      expect(spyHttpClientPost).toHaveBeenCalledWith(expect.stringContaining('/login'),expect.objectContaining({username: 'dialaya'}));
      // TODO: check login notif, storage
      //expect(spyLocalStorageRemoveItem).toHaveBeenNthCalledWith(1,'access_token');
      done();
    });
  });


});
