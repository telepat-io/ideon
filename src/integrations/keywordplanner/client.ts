import {
  buildGenerateIdeasBody,
  buildGetHistoricalDataBody,
  buildForecastBody,
  parseGenerateIdeasResponse,
  parseGetHistoricalDataResponse,
  parseGetForecastDataResponse,
  type GkpGenerateIdeasInput,
  type GkpGetHistoricalDataInput,
  type GkpGetForecastDataInput,
  type GenerateIdeasResponse,
  type GetHistoricalDataResponse,
  type GetForecastDataResponse,
} from './models.js';

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const API_BASE = 'https://googleads.googleapis.com/v24';
const EXPIRY_BUFFER_MS = 60_000;
const HTTP_TIMEOUT_MS = 30_000;

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  DEVELOPER_TOKEN_INVALID: 'Invalid developer token. Set it via: ideon config set googleAdsDeveloperToken <token>. Get one at https://ads.google.com/aw/apicenter.',
  DEVELOPER_TOKEN_NOT_APPROVED: 'Developer token is in test mode and cannot access real accounts. Apply for Basic access at https://ads.google.com/aw/apicenter and wait for Google approval (a few days).',
  DEVELOPER_TOKEN_PROHIBITED: 'Developer token is not associated with this Google Cloud project. Ensure the token and OAuth client belong to the same GCP project.',
  OAUTH_TOKEN_INVALID: 'OAuth access token is invalid. Re-configure your refresh token via: ideon config set googleAdsRefreshToken <token>.',
  GOOGLE_ACCOUNT_COOKIE_INVALID: 'Google account cookie is invalid. Re-configure your refresh token via: ideon config set googleAdsRefreshToken <token>.',
  CLIENT_CUSTOMER_ID_INVALID: 'Customer ID is invalid. Set it via: ideon config set googleAdsCustomerId <10-digit-id>. Use the account number from the top-right of the Google Ads UI.',
  CLIENT_CUSTOMER_ID_IS_REQUIRED: 'Customer ID is required. Set it via: ideon config set googleAdsCustomerId <10-digit-id>.',
  CUSTOMER_NOT_FOUND: 'Google Ads account not found. Verify googleAdsCustomerId is correct and the account is provisioned. Set via: ideon config set googleAdsCustomerId <id>.',
  NOT_ADS_USER: 'Google account is not associated with any Google Ads account. Sign in to ads.google.com and create or link an account first.',
  USER_PERMISSION_DENIED: 'Permission denied. If accessing through a manager account, set: ideon config set googleAdsLoginCustomerId <manager-account-id>.',
  CUSTOMER_NOT_ENABLED: 'Google Ads account is not enabled. Complete account setup at ads.google.com.',
  ACCESS_TOKEN_SCOPE_INSUFFICIENT: 'OAuth token is missing required "adwords" scope. Re-authorize with scope https://www.googleapis.com/auth/adwords and set the new refresh token via: ideon config set googleAdsRefreshToken <token>.',
};

interface GoogleAdsError {
  errorCode?: Record<string, unknown>;
  message?: string;
}

interface GoogleAdsFailure {
  error?: GoogleAdsError[];
}

function stripDashes(customerId: string): string {
  return customerId.replace(/-/g, '');
}

function extractErrorMessage(statusCode: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as GoogleAdsFailure;
    const errors = parsed.error;
    if (errors && errors.length > 0) {
      const firstError = errors[0];
      const message = firstError.message;
      const errorCode = firstError.errorCode;

      if (errorCode) {
        for (const [key, value] of Object.entries(errorCode)) {
          if (value === true && AUTH_ERROR_MESSAGES[key]) {
            return AUTH_ERROR_MESSAGES[key];
          }
        }
      }

      if (message) return message;
    }
  } catch {
    // Not a valid GoogleAdsFailure JSON, fall through
  }

  return `Google Ads API returned HTTP ${statusCode}: ${body}`;
}

export interface GkpClientOptions {
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  customerId: string;
  loginCustomerId?: string;
}

export class GkpClient {
  private readonly developerToken: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly refreshToken: string;
  private readonly customerId: string;
  private readonly loginCustomerId?: string;
  private readonly baseUrl: string;

  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(options: GkpClientOptions) {
    this.developerToken = options.developerToken;
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.refreshToken = options.refreshToken;
    this.customerId = stripDashes(options.customerId);
    this.loginCustomerId = options.loginCustomerId ? stripDashes(options.loginCustomerId) : undefined;
    this.baseUrl = `${API_BASE}/customers/${this.customerId}`;
  }

  private async refreshAccessToken(): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);

    try {
      const body = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token',
      });

      const response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OAuth2 token exchange failed (${response.status}): ${errorBody}`);
      }

      const data = (await response.json()) as { access_token: string; expires_in: number };
      if (!data.access_token) {
        throw new Error('OAuth2 response did not include an access_token.');
      }

      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + data.expires_in * 1000 - EXPIRY_BUFFER_MS;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }
    await this.refreshAccessToken();
    if (!this.accessToken) {
      throw new Error('Failed to obtain access token.');
    }
    return this.accessToken;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'developer-token': this.developerToken,
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };

    if (this.loginCustomerId) {
      headers['login-customer-id'] = this.loginCustomerId;
    }

    return headers;
  }

  private async request<T>(method: string, path: string, body?: Record<string, unknown>): Promise<T> {
    const token = await this.getAccessToken();
    const headers = this.buildHeaders();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(extractErrorMessage(response.status, responseText));
      }

      return JSON.parse(responseText) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  async generateKeywordIdeas(input: GkpGenerateIdeasInput): Promise<GenerateIdeasResponse> {
    const body = buildGenerateIdeasBody(input);
    const raw = await this.request('POST', ':generateKeywordIdeas', body);
    return parseGenerateIdeasResponse(raw as Record<string, unknown>);
  }

  async getHistoricalMetrics(input: GkpGetHistoricalDataInput): Promise<GetHistoricalDataResponse> {
    const body = buildGetHistoricalDataBody(input);
    const raw = await this.request('POST', ':generateKeywordHistoricalMetrics', body);
    return parseGetHistoricalDataResponse(raw as Record<string, unknown>);
  }

  async getForecastData(input: GkpGetForecastDataInput): Promise<GetForecastDataResponse> {
    const body = buildForecastBody(input);
    const raw = await this.request('POST', ':generateKeywordForecastMetrics', body);
    return parseGetForecastDataResponse(raw as Record<string, unknown>);
  }
}
