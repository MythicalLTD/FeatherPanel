import api from "../api";

export const systemApi = {
  getSettings: async () => {
    const response = await api.get("/system/settings");
    return response.data;
  },
};
