import { createFileRoute } from "@tanstack/react-router";

const UPSTREAM_BASE_URL =
  process.env.SKOR_API_BASE_URL ??
  process.env.VITE_API_BASE_URL ??
  "http://178.105.130.105:8001";

function buildCorsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function buildUpstreamUrl(pathname: string, search: string) {
  const upstream = new URL(UPSTREAM_BASE_URL);
  const incomingPath = pathname.replace(/^\/api\/public\/skor\/?/, "");
  upstream.pathname = `${upstream.pathname.replace(/\/$/, "")}/${incomingPath}`.replace(/\/+/g, "/");
  upstream.search = search;
  return upstream.toString();
}

function isStartSessionRequest(pathname: string) {
  return pathname.replace(/\/$/, "").endsWith("/start_session");
}

function startSessionFallbackResponse(request: Request, message = "Quiz service unavailable") {
  return new Response(
    JSON.stringify({
      error: "SERVICE_UNAVAILABLE",
      message,
      fallback: true,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...buildCorsHeaders(request),
      },
    },
  );
}

async function proxyRequest(request: Request) {
  const url = new URL(request.url);
  const upstreamUrl = buildUpstreamUrl(url.pathname, url.search);
  const method = request.method.toUpperCase();
  const corsHeaders = buildCorsHeaders(request);

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method,
      headers: {
        Accept: request.headers.get("accept") ?? "application/json",
        ...(method !== "GET" && method !== "HEAD"
          ? { "Content-Type": request.headers.get("content-type") ?? "application/json" }
          : {}),
      },
      body: method === "GET" || method === "HEAD" ? undefined : await request.text(),
    });

    if (!upstreamResponse.ok && isStartSessionRequest(url.pathname)) {
      console.warn("[Skor proxy] start_session upstream failed", upstreamResponse.status);
      return startSessionFallbackResponse(request);
    }

    const responseHeaders = new Headers(corsHeaders);
    const contentType = upstreamResponse.headers.get("content-type");
    if (contentType) responseHeaders.set("Content-Type", contentType);

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    if (isStartSessionRequest(url.pathname)) {
      console.warn("[Skor proxy] start_session request failed", error);
      return startSessionFallbackResponse(request);
    }

    return new Response(
      JSON.stringify({
        error: "Failed to reach quiz backend",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  }
}

export const Route = createFileRoute("/api/public/skor/$")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) =>
        new Response(null, {
          status: 204,
          headers: buildCorsHeaders(request),
        }),
      GET: async ({ request }) => proxyRequest(request),
      POST: async ({ request }) => proxyRequest(request),
    },
  },
});