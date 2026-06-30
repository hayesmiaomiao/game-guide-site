import fs from "node:fs";
import path from "node:path";

export const SEARCH_CONSOLE_SCOPE =
  "https://www.googleapis.com/auth/webmasters.readonly";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const CLIENT_FILE_PATTERN = /^client_secret_.*\.json$/;

type GoogleClientConfig = {
  client_id?: string;
  client_secret?: string;
  redirect_uris?: string[];
};

type GoogleClientFile = {
  web?: GoogleClientConfig;
  installed?: GoogleClientConfig;
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

export class GoogleTokenRequestError extends Error {
  readonly status: number | null;
  readonly responseBody: string | null;
  readonly cause: unknown;

  constructor(
    message: string,
    status: number | null = null,
    responseBody: string | null = null,
    cause?: unknown
  ) {
    super(message);
    this.name = "GoogleTokenRequestError";
    this.status = status;
    this.responseBody = responseBody;
    this.cause = cause;
  }
}

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

function readLocalClientFile(): GoogleClientConfig | null {
  const credentialFile = fs
    .readdirSync(process.cwd())
    .find((file) => CLIENT_FILE_PATTERN.test(file));

  if (!credentialFile) return null;

  const parsed = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), credentialFile), "utf8")
  ) as GoogleClientFile;

  return parsed.web ?? parsed.installed ?? null;
}

export function getGoogleOAuthConfig(
  fallbackRedirectUri?: string
): GoogleOAuthConfig {
  const localClient = readLocalClientFile();
  const clientId =
    process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() ||
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    localClient?.client_id?.trim();
  const clientSecret =
    process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() ||
    process.env.GOOGLE_CLIENT_SECRET?.trim() ||
    localClient?.client_secret?.trim();
  const redirectUri =
    process.env.GOOGLE_SEARCH_CONSOLE_REDIRECT_URI?.trim() ||
    fallbackRedirectUri ||
    localClient?.redirect_uris?.[0];

  if (!clientId || !clientSecret) {
    throw new Error(
      "Google OAuth client credentials are missing. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in .env, or keep the downloaded client_secret_*.json file in the project root."
    );
  }

  if (!redirectUri) {
    throw new Error(
      "Google OAuth redirect URI is missing. Set GOOGLE_SEARCH_CONSOLE_REDIRECT_URI in .env."
    );
  }

  return { clientId, clientSecret, redirectUri };
}

function serializeEnvValue(value: string) {
  return JSON.stringify(value);
}

export function saveSearchConsoleTokens(
  accessToken: string,
  refreshToken?: string
) {
  const envPath = path.join(process.cwd(), ".env");
  const existing = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, "utf8")
    : "";
  const newline = existing.includes("\r\n") ? "\r\n" : "\n";
  const updates: Record<string, string> = {
    GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN: accessToken
  };

  if (refreshToken) {
    updates.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN = refreshToken;
  }

  let next = existing;
  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${serializeEnvValue(value)}`;
    const pattern = new RegExp(`^${key}=.*$`, "m");
    next = pattern.test(next)
      ? next.replace(pattern, line)
      : `${next}${next && !next.endsWith("\n") ? newline : ""}${line}${newline}`;
    process.env[key] = value;
  }

  fs.writeFileSync(envPath, next, "utf8");
}

async function requestTokens(
  parameters: URLSearchParams,
  operation: string
): Promise<TokenResponse> {
  let response: Response;

  try {
    response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: parameters,
      cache: "no-store"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new GoogleTokenRequestError(
      `${operation} could not reach the Google token endpoint: ${message}`,
      null,
      null,
      error
    );
  }

  const responseBody = await response.text();
  let payload: TokenResponse;

  try {
    payload = responseBody
      ? (JSON.parse(responseBody) as TokenResponse)
      : {};
  } catch (error) {
    throw new GoogleTokenRequestError(
      `${operation} received an invalid response from Google.`,
      response.status,
      responseBody,
      error
    );
  }

  if (!response.ok || payload.error) {
    throw new GoogleTokenRequestError(
      `${operation} failed: ${
        payload.error_description || payload.error || response.statusText
      }`,
      response.status,
      responseBody
    );
  }

  return payload;
}

export async function exchangeAuthorizationCode(
  code: string,
  redirectUri: string
) {
  const config = getGoogleOAuthConfig(redirectUri);
  const payload = await requestTokens(
    new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code"
    }),
    "Google OAuth code exchange"
  );

  if (!payload.access_token) {
    throw new Error("Google OAuth response did not include an access token.");
  }

  return payload;
}

export async function refreshSearchConsoleAccessToken() {
  const refreshToken =
    process.env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN?.trim();

  if (!refreshToken) {
    throw new Error(
      "Google Search Console refresh token is missing. Visit http://localhost:3000/api/auth/google to connect the account."
    );
  }

  const config = getGoogleOAuthConfig();
  const payload = await requestTokens(
    new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    }),
    "Google OAuth token refresh"
  );

  if (!payload.access_token) {
    throw new Error("Google token refresh did not include an access token.");
  }

  saveSearchConsoleTokens(payload.access_token, payload.refresh_token);
  return payload.access_token;
}

export async function getSearchConsoleAccessToken() {
  const accessToken =
    process.env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN?.trim();

  return accessToken || refreshSearchConsoleAccessToken();
}
