export interface AuthenticationResult {
    login: string;
    roles: string[];
    firstname: string;
    lastname: string;
    accessToken: string;
    refreshToken: string;
}
