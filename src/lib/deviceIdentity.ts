// OpenClaw device identity — Ed25519 key pair + pairing state
// Uses @noble/ed25519 (pure JS) so it works on HTTP (no secure context needed)

import * as ed from '@noble/ed25519'
import { sha256, sha512 } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'

// Configure noble ed25519 to use noble sha512 (no Web Crypto API required)
ed.etc.sha512Sync = (...m: Parameters<typeof sha512>) => sha512(...m)

const STORAGE_KEY = 'openclaw_mc_identity'
const CLIENT_ID = 'mission-control'
const CLIENT_VERSION = '0.1.0'

export interface DeviceIdentity {
  instanceId: string
  deviceId: string      // SHA-256 of public key (hex, 64 chars)
  publicKeyB64: string  // base64url raw public key (32 bytes)
  privateKeyHex: string // hex-encoded 32-byte private key scalar
  deviceToken?: string
}

// --- helpers ---

function randomUUID(): string {
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`
}

function b64url(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function hexToBytes(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return arr
}

// --- core ---

function generate(): DeviceIdentity {
  const privBytes = ed.utils.randomPrivateKey()          // 32 random bytes
  const pubBytes = ed.getPublicKey(privBytes)             // 32-byte public key
  const deviceId = bytesToHex(sha256(pubBytes))           // SHA-256 of pub key
  return {
    instanceId: randomUUID(),
    deviceId,
    publicKeyB64: b64url(pubBytes),
    privateKeyHex: bytesToHex(privBytes),
  }
}

export function getOrCreateIdentity(): DeviceIdentity {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      return JSON.parse(raw) as DeviceIdentity
    } catch {
      // corrupt — regenerate
    }
  }
  const identity = generate()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity))
  return identity
}

export function signNonce(identity: DeviceIdentity, nonce: string): string {
  const msg = new TextEncoder().encode(nonce)
  const privBytes = hexToBytes(identity.privateKeyHex)
  const sig = ed.sign(msg, privBytes)
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
