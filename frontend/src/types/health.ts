export interface HealthResponse {
  status: string;
  appName: string;
  environment: string;
  utcTime: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string | null;
}
