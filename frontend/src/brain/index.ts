import { API_PATH, API_HOST } from "../constants";
import { Brain } from "./Brain";
import type { RequestParams } from "./http-client";
import { auth } from "../app/auth";

const isLocalhost = /localhost:\d{4}/i.test(window.location.origin);

const constructBaseUrl = (): string => {
  if (isLocalhost) {
    return `${window.location.origin}${API_PATH}`;
  }

  return `${API_HOST}${API_PATH}`;
};

type BaseApiParams = Omit<RequestParams, "signal" | "baseUrl" | "cancelToken">;

const constructBaseApiParams = (): BaseApiParams => {
  return {
    credentials: "include",
    headers: {},
  };
};

const constructClient = () => {
  const baseUrl = constructBaseUrl();
  const baseApiParams = constructBaseApiParams();

  const brainClient = new Brain({
    baseUrl,
    baseApiParams,
  });

  // Add auth header to all requests
  const originalRequest = brainClient.request.bind(brainClient);
  brainClient.request = async (config) => {
    const authHeader = await auth.getAuthHeaderValue();
    if (authHeader) {
      config.headers = {
        ...config.headers,
        Authorization: authHeader,
      };
    }
    return originalRequest(config);
  };

  return brainClient;
};

const brain = constructClient();

export default brain;
