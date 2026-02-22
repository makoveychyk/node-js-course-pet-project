export type JwtPayload = {
  sub: string;
  email: string;
  roles: string[];
  scopes: string[];
};

export type AuthUser = JwtPayload;
