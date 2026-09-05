#!/usr/bin/env node

/**
 * CLI Certificate Issuer Utility for PDFSeal Owner (ES Module)
 * 
 * Usage:
 *   node scripts/generate-certificate.js --email user@example.com --tier lifetime --name "Alice"
 *   node scripts/generate-certificate.js --email user@example.com --tier annual
 *   node scripts/generate-certificate.js --name "Acme Corp" --tier enterprise
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PRIVATE_KEY_PATH = path.join(__dirname, '../.keys/issuer-private-key.json');

const subtle = globalThis.crypto.subtle;

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {
    email: '',
    name: 'Supporter',
    tier: 'lifetime' // 'annual' | 'lifetime' | 'enterprise'
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) params.email = args[++i];
    if (args[i] === '--name' && args[i + 1]) params.name = args[++i];
    if (args[i] === '--tier' && args[i + 1]) params.tier = args[++i];
  }
  return params;
}

function bytesToBase64Url(bytes) {
  const binary = Buffer.from(bytes).toString('binary');
  const base64 = Buffer.from(binary, 'binary').toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function main() {
  if (!fs.existsSync(PRIVATE_KEY_PATH)) {
    console.error('Error: Private key file not found at ' + PRIVATE_KEY_PATH);
    process.exit(1);
  }

  const privateKeyJwk = JSON.parse(fs.readFileSync(PRIVATE_KEY_PATH, 'utf8'));
  const params = parseArgs();

  let tierKey = 'pro_lifetime';
  let expiresAt = null;
  const now = Date.now();

  if (params.tier === 'annual') {
    tierKey = 'pro_annual';
    // 365 days + 2 days grace period
    expiresAt = now + (367 * 24 * 60 * 60 * 1000);
  } else if (params.tier === 'enterprise') {
    tierKey = 'enterprise';
    expiresAt = null;
  } else {
    tierKey = 'pro_lifetime';
    expiresAt = null;
  }

  const payload = {
    id: 'cert_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7),
    name: params.name,
    email: params.email,
    tier: tierKey,
    issuedAt: now,
    expiresAt: expiresAt
  };

  const privateKey = await subtle.importKey(
    'jwk',
    privateKeyJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const payloadJson = JSON.stringify(payload);
  const payloadBytes = Buffer.from(payloadJson, 'utf8');

  const signatureBuffer = await subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    privateKey,
    payloadBytes
  );

  const payloadB64 = bytesToBase64Url(payloadBytes);
  const signatureB64 = bytesToBase64Url(new Uint8Array(signatureBuffer));
  const certString = `SEAL-${payloadB64}.${signatureB64}`;

  console.log('\n========================================');
  console.log('🎉 证书签发成功！PDFSeal Supporter Certificate:');
  console.log('========================================');
  console.log('用户姓名:', payload.name);
  console.log('用户邮箱:', payload.email || '(未指定)');
  console.log('授权级别:', payload.tier);
  console.log('有效期至:', expiresAt ? new Date(expiresAt).toLocaleDateString() : '终生有效 (Lifetime)');
  console.log('----------------------------------------');
  console.log('证书代码 (复制发送给客户):\n');
  console.log(certString);
  console.log('\n========================================\n');
}

main().catch(err => {
  console.error('Failed to issue certificate:', err);
  process.exit(1);
});
