const USER_PERMIT_API_PATH = '/v1.0/end-user/services/vibe/user-permit';

export const dynamic = 'force-dynamic';

function watermarkLink(): string {
  return process.env.REGION?.toUpperCase() === 'AY' ? 'https://coding.tuyasmart.com' : 'https://coding.tuya.ai';
}

export async function GET() {
  const link = watermarkLink();
  const baseUrl = process.env.TUYA_OPEN_API_BASE_URL?.replace(/\/+$/, '');
  const authKey = process.env.TUYA_OPEN_API_AUTH_KEY;
  if (!baseUrl || !authKey) {
    return Response.json({ show: true, link });
  }

  try {
    const resp = await fetch(`${baseUrl}${USER_PERMIT_API_PATH}`, {
      headers: { Authorization: `Bearer ${authKey}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    if (!resp.ok) {
      return Response.json({ show: true, link });
    }

    const data = await resp.json();
    const hide = data?.success === true && data.result?.watermark === false;
    return Response.json({ show: !hide, link });
  } catch {
    return Response.json({ show: true, link });
  }
}
