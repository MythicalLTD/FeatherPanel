import api from "../api";

export const authApi = {
  login: async (data: {
    username_or_email?: string;
    password?: string;
    turnstile_token?: string;
    sso_token?: string;
    discord_token?: string;
  }) => {
    const response = await api.put("/user/auth/login", data);
    return response.data;
  },

  register: async (data: {
    first_name: string;
    last_name: string;
    email: string;
    username: string;
    password: string;
    turnstile_token?: string;
  }) => {
    const response = await api.put("/user/auth/register", data);
    return response.data;
  },

  logout: async () => {
    const response = await api.delete("/user/auth/logout");
    return response.data;
  },

  forgotPassword: async (email: string, turnstile_token?: string) => {
    const payload: { email: string; turnstile_token?: string } = { email };
    if (turnstile_token) {
      payload.turnstile_token = turnstile_token;
    }
    const response = await api.put("/user/auth/forgot-password", payload);
    return response.data;
  },

  resetPassword: async (data: { token: string; password: string }) => {
    const response = await api.post("/user/auth/reset-password", data);
    return response.data;
  },

  verify2FA: async (data: { username_or_email: string; code: string }) => {
    const response = await api.post("/user/auth/verify-2fa", data);
    return response.data;
  },

  setup2FA: async () => {
    const response = await api.get("/user/auth/setup-2fa");
    return response.data;
  },

  enable2FA: async (code: string) => {
    const response = await api.post("/user/auth/enable-2fa", { code });
    return response.data;
  },
};
