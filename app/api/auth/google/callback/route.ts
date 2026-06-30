import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  exchangeAuthorizationCode,
  GoogleTokenRequestError,
  saveSearchConsoleTokens
} from "@/lib/search-console/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE = "gsc_oauth_state";

function statesMatch(expected: string, received: string) {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

function textResponse(message: string, status = 200) {
  const response = new NextResponse(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
  response.cookies.delete(STATE_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  if (
    !["localhost", "127.0.0.1", "::1"].includes(request.nextUrl.hostname)
  ) {
    return textResponse("Google OAuth setup is available locally only.", 403);
  }

  const oauthError = request.nextUrl.searchParams.get("error");
  if (oauthError) {
    return textResponse(`Google OAuth was not completed: ${oauthError}`, 400);
  }

  const code = request.nextUrl.searchParams.get("code");
  const receivedState = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;

  if (
    !code ||
    !receivedState ||
    !expectedState ||
    !statesMatch(expectedState, receivedState)
  ) {
    return textResponse("Invalid or expired Google OAuth state.", 400);
  }

  try {
    const redirectUri = new URL(
      "/api/auth/google/callback",
      request.nextUrl.origin
    ).toString();
    const tokens = await exchangeAuthorizationCode(code, redirectUri);
    const refreshToken =
      tokens.refresh_token ||
      process.env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN?.trim();

    if (!refreshToken) {
      return textResponse(
        "Google did not return a refresh token. Revoke the existing app grant and try connecting again.",
        502
      );
    }

    saveSearchConsoleTokens(tokens.access_token!, refreshToken);
    return textResponse("Connected to Google Search Console successfully.");
  } catch (error) {
    const tokenError =
      error instanceof GoogleTokenRequestError ? error : null;
    const message =
      error instanceof Error ? error.message : "Unknown Google OAuth error.";
    const redirectUri = new URL(
      "/api/auth/google/callback",
      request.nextUrl.origin
    ).toString();

    console.error("Google OAuth callback failed.", {
      errorMessage: message,
      responseStatus: tokenError?.status ?? "No response received",
      responseBody:
        tokenError?.responseBody ?? "No response body received from Google",
      redirectUri,
      hasGoogleClientId: Boolean(process.env.GOOGLE_CLIENT_ID?.trim()),
      hasGoogleClientSecret: Boolean(
        process.env.GOOGLE_CLIENT_SECRET?.trim()
      ),
      errorName: error instanceof Error ? error.name : typeof error,
      errorStack: error instanceof Error ? error.stack : undefined
    });

    const statusDetail =
      tokenError?.status === null || tokenError?.status === undefined
        ? "No HTTP response was received from Google."
        : `Google token endpoint returned HTTP ${tokenError.status}.`;
    const bodyDetail = tokenError?.responseBody
      ? `Google response: ${tokenError.responseBody}`
      : "Google did not return a response body.";

    return textResponse(
      [
        "Google Search Console connection failed.",
        "",
        `Error: ${message}`,
        statusDetail,
        bodyDetail,
        `Redirect URI: ${redirectUri}`,
        "",
        "See the local development console for full diagnostic details."
      ].join("\n"),
      500
    );
  }
}
