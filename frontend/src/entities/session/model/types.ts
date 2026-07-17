export interface SessionUser {
  id: number;
  email: string;
}

export interface Session {
  user: SessionUser;
  token: string;
}

/** Shape returned by the signup/login endpoints. */
export interface AuthResponse {
  token: string;
  user: SessionUser;
}
