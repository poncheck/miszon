// OpenClaw device identity — Ed25519 key pair + pairing state
// Keys are generated once and persisted in localStorage as JWK

const STORAGE_KEY = 'openclaw_mc_identity'
const CLIENT_ID = 'mission-control'
const CLIENT_VERSION = '0.1.0'

export interface DeviceIdentity {
  instanceId: string
  deviceId: string      // SHA-256 of public key (hex, 64 chars)
  publicKeyB64: string  // base64url raw public key (32 bytes)
  privateKeyJwk: JsonWebKey
  deviceToken?: string
}

function b64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function sha256hex(buf: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function generate(): Promise<DeviceIdentity> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'Ed25519' },
    true,
    ['sign', 'verify']
  )
  const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey)
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey)

  return {
    instanceId: crypto.randomUUID(),
    deviceId: await sha256hex(publicKeyRaw),
    publicKeyB64: b64url(publicKeyRaw),
    privateKeyJwk,
  }
}

export async function getOrCreateIdentity(): Promise<DeviceIdentity & { privateKey: CryptoKey }> {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const data = JSON.parse(raw) as DeviceIdentity
      const privateKey = await crypto.subtle.importKey(
        'jwk',
        data.privateKeyJwk,
        { name: 'Ed25519' },
        true,
        ['sign']
      )
      return { ...data, privateKey }
    } catch {
      // corrupt storage — regenerate
    }
  }
  const identity = await generate()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity))
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    identity.privateKeyJwk,
    { name: 'Ed25519' },
    true,
    ['sign']
  )
  return { ...identity, privateKey }
}

export async function signNonce(privateKey: CryptoKey, nonce: string): Promise<string> {
  const msg = new TextEncoder().encode(nonce)
  const sig = await crypto.subtle.sign('Ed25519', privateKey, msg)
  return b64url(sig)
}

export function saveDeviceToken(token: string): void {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return
  const data = JSON.parse(raw) as DeviceIdentity
  data.deviceToken = token
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function clearIdentity(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function buildConnectFrame(
  identity: DeviceIdentity,
  nonce: string,
  signedAt: number,
  signature: string
): object {
  return {
    type: 'req',
    id: crypto.randomUUID(),
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
