import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  getGoogleOAuthConfig,
  SEARCH_CONSOLE_SCOPE
} from "@/lib/search-console/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE = "gsc_oauth_state";

function isLocalRequest(request: NextRequest) {
  return ["localhost", "127.0.0.1", "::1"].includes(
    request.nextUrl.hostname
  );
}

export async function GET(request: NextRequest) {
  if (!isLocalRequest(request)) {
    return new NextResponse("Google OAuth setup is available locally only.", {
      status: 403
    });
  }

  try {
    const redirectUri = new URL(
      "/api/auth/google/callback",
      request.nextUrl.origin
    ).toString();
    const config = getGoogleOAuthConfig(redirectUri);
    const state = randomBytes(32).toString("hex");
    const authorizationUrl = new URL(
      "https://accounts.google.com/o/oauth2/v2/auth"
    );

    authorizationUrl.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: SEARCH_CONSOLE_SCOPE,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state
    }).toString();

    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 10 * 60,
      path: "/api/auth/google"
    });
    return response;
  } catch (error) {
    return new NextResponse(
      error instanceof Error ? error.message : "Unable to start Google OAuth.",
      { status: 500 }
    );
  }
}
