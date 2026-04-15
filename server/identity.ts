// OpenClaw device identity — server side
// Node.js crypto has native Ed25519 support — works without any extra libs

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

const DATA_DIR = process.env.EVENTS_DIR
  ? path.dirname(process.env.EVENTS_DIR)
  : path.join(process.cwd(), 'data')

const IDENTITY_FILE = path.join(DATA_DIR, 'identity.json')

interface StoredIdentity {
  instanceId: string
  deviceId: string      // SHA-256 of public key (hex)
  publicKeyB64: string  // base64url raw public key (32 bytes)
  privateKeyPem: string // PEM-encoded Ed25519 private key
  deviceToken?: string
}

let cachedIdentity: StoredIdentity | null = null

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function generateIdentity(): StoredIdentity {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519')

  // Export raw public key (32 bytes)
  const pubRaw = publicKey.export({ type: 'spki', format: 'der' })
  // SPKI for Ed25519 = 12 bytes header + 32 bytes key
  const pubBytes = pubRaw.slice(-32)

  const deviceId = crypto.createHash('sha256').update(pubBytes).digest('hex')
  const publicKeyB64 = b64url(pubBytes)
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string

  return {
    instanceId: crypto.randomUUID(),
    deviceId,
    publicKeyB64,
    privateKeyPem,
  }
}

export function getOrCreateIdentity(): StoredIdentity {
  if (cachedIdentity) return cachedIdentity

  if (fs.existsSync(IDENTITY_FILE)) {
    try {
      cachedIdentity = JSON.parse(fs.readFileSync(IDENTITY_FILE, 'utf-8')) as StoredIdentity
      return cachedIdentity
    } catch {
      // corrupt — regenerate
    }
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }

  const identity = generateIdentity()
  fs.writeFileSync(IDENTITY_FILE, JSON.stringify(identity, null, 2), 'utf-8')
  cachedIdentity = identity
  console.log(`[identity] New device identity generated: ${identity.deviceId.slice(0, 16)}...`)
  return identity
}

export interface SignPayloadParams {
  nonce: string
  signedAt: number
  clientId: string
  clientMode: string
  role: string
  scopes: string[]
  platform: string
  deviceFamily?: string
}

// OpenClaw v3 device auth payload — pipe-delimited string that gets signed
function buildDeviceAuthPayloadV3(params: SignPayloadParams, identity: StoredIdentity): string {
  const { nonce, signedAt, clientId, clientMode, role, scopes, platform, deviceFamily } = params
  const token = identity.deviceToken ?? ''
  return [
    'v3',
    identity.deviceId,
    clientId,
    clientMode,
    role,
    scopes.join(','),
    String(signedAt),
    token,
    nonce,
    platform,
    deviceFamily ?? '',
  ].join('|')
}

export function signPayload(params: SignPayloadParams): string {
  const identity = getOrCreateIdentity()
  const payload = buildDeviceAuthPayloadV3(params, identity)
  const privateKey = crypto.createPrivateKey(identity.privateKeyPem)
  const msg = Buffer.from(payload, 'utf-8')
  const sig = crypto.sign(null, msg, privateKey)
  console.debug('[identity] signing payload:', payload)
  return b64url(sig)
}

export function saveDeviceToken(token: string): void {
  const identity = getOrCreateIdentity()
  identity.deviceToken = token
  cachedIdentity = identity
  fs.writeFileSync(IDENTITY_FILE, JSON.stringify(identity, null, 2), 'utf-8')
  console.log('[identity] Device token saved')
}

export function getPublicInfo() {
  const id = getOrCreateIdentity()
  return {
    instanceId: id.instanceId,
    deviceId: id.deviceId,
    publicKeyB64: id.publicKeyB64,
    deviceToken: id.deviceToken,
  }
}
