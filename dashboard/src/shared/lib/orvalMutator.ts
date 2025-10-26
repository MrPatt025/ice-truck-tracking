import type { AxiosRequestConfig } from 'axios';
import { api } from './apiClient';

export const customInstance = <T = unknown>(config: AxiosRequestConfig) => {
  return api.request<T>(config);
};
