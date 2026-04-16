const TOKEN_KEY = "vibe_auth_token";

export const authStore = {
  /**
   * Retrieve the stored token from localStorage.
   * Returns null if no token exists.
   */
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Save a token to localStorage.
   * Called after a successful login.
   */
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  /**
   * Remove the token from localStorage.
   * Called on logout or when a token is expired/invalid.
   */
  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },
};
