import axios from "axios";
import axiosRetry from "axios-retry";

axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

export const getAxiosClient = (baseURL: string, authHeaderValue: string) => {
  const client = axios.create({
    baseURL,
    auth: { username: "", password: authHeaderValue },
    headers: {
      "Content-Type": "application/json",
    },
  });

  return client;
};
