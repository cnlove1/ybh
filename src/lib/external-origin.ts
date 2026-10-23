import type { NextRequest } from "next/server";

function firstHeaderValue(value: string | null): string | null {
  return (
    value
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean)[0] ?? null
  );
}

export function relativeRedirect(path: string, status = 307): Response {
  return new Response(null, {
    status,
    headers: {
      Location: path,
    },
  });
}

export function resolveExternalOrigin(request: NextRequest): string {
  const configuredOrigin = process.env.APP_EXTERNAL_ORIGIN;
  if (configuredOrigin) {
    return new URL(configuredOrigin).origin;
  }

  const forwardedHost = firstHeaderValue(
    request.headers.get("x-forwarded-host")
  );
  const host = forwardedHost ?? firstHeaderValue(request.headers.get("host"));

  if (!host) {
    throw new Error("External origin cannot be resolved");
  }

  const forwardedProto = firstHeaderValue(
    request.headers.get("x-forwarded-proto")
  );
  const proto = forwardedProto ?? "https";

  return new URL(`${proto}://${host}`).origin;
}
