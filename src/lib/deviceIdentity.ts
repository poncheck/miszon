// OpenClaw device identity — thin browser client
// All crypto (Ed25519 key gen + signing) happens server-side via /api/identity
// Browser just fetches the signed connect frame params

const CLIENT_ID = 'mission-control'
const CLIENT_VERSION = '0.1.0'

// crypto.randomUUID() requires HTTPS — use getRandomValues() which works on HTTP too
export function randomUUID(): string {
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`
}

export interface DeviceIdentity {
  instanceId: string
  deviceId: string
  publicKeyB64: string
  deviceToken?: string
}

export async function getIdentity(): Promise<DeviceIdentity> {
  const res = await fetch('/api/identity')
  if (!res.ok) throw new Error('Failed to fetch identity')
  return res.json() as Promise<DeviceIdentity>
}

export async function signNonce(nonce: string): Promise<{ signature: string; signedAt: number }> {
  const res = await fetch('/api/identity/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nonce }),
  })
  if (!res.ok) throw new Error('Failed to sign nonce')
  return res.json() as Promise<{ signature: string; signedAt: number }>
}

export async function saveDeviceToken(token: string): Promise<void> {
  await fetch('/api/identity/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
}

export function buildConnectFrame(
  identity: DeviceIdentity,
  nonce: string,
  signedAt: number,
  signature: string
): object {
  return {
    type: 'req',
    id: randomUUID(),
    method: 'connect',
    params: {
      minProtocol: 3,
      maxProtocol: 3,
      client: {
        id: CLIENT_ID,
        version: CLIENT_VERSION,
        platform: navigator.platform,
        mode: 'webchat',
        instanceId: identity.instanceId,
      },
      role: 'operator',
      scopes: [
        'operator.admin',
        'operator.read',
        'operator.write',
        'operator.approvals',
        'operator.pairing',
      ],
      device: {
        id: identity.deviceId,
        publicKey: identity.publicKeyB64,
        signature,
        signedAt,
        nonce,
      },
      caps: ['tool-events'],
      auth: identity.deviceToken
        ? { token: identity.deviceToken, deviceToken: identity.deviceToken }
        : {},
      userAgent: navigator.userAgent,
      locale: navigator.language,
    },
  }
}
