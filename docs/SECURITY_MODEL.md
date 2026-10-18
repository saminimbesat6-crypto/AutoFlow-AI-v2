# AutoFlow AI — Security Model & Defense Architecture

## 1. Threat Model & Principles
AutoFlow AI follows defense-in-depth principles across data storage, external network requests, user expressions, and third-party integrations:

1. **Confidentiality**: Credential secrets are never exposed in plaintext in workflows, logs, or API responses.
2. **Integrity**: Workflows, node executions, and credentials cannot be tampered with or corrupted across restarts.
3. **Availability & Isolation**: User code, large payloads, or hostile remote endpoints cannot exhaust server resources or hijack host operating system privileges.

---

## 2. Cryptographic Storage & Key Management
- **Cipher**: **AES-256-GCM** (Galois/Counter Mode) authenticated encryption.
- **Key Derivation**: 256-bit key sourced from `ENCRYPTION_SECRET` environment variable or dynamically generated cryptographic root key saved with restricted file permissions (`chmod 600`).
- **Initialization Vectors**: Fresh, cryptographically secure 128-bit random IV generated via `crypto.randomBytes(16)` per credential entry.
- **Tamper Detection**: 128-bit authentication tag (`authTag`) stored alongside ciphertext; decryption fails immediately with `AuthenticationTagVerificationError` if ciphertext or metadata is altered.

---

## 3. Server-Side Request Forgery (SSRF) Defense
Outbound HTTP requests (e.g. from `HttpRequestNode`) must be strictly guarded against intranet reconnaissance:
- **Disallowed IP Ranges**:
  - Loopback: `127.0.0.0/8`, `::1`
  - Private Class A: `10.0.0.0/8`
  - Private Class B: `172.16.0.0/12`
  - Private Class C: `192.168.0.0/16`
  - Link-Local: `169.254.0.0/16` (Cloud Metadata endpoints: AWS `169.254.169.254`, GCP metadata)
  - Carrier-Grade NAT: `100.64.0.0/10`
- **Enforcement**: URL hostname is validated before connection. Unless `allowPrivateNetwork: true` is explicitly enabled by the administrator, requests to internal subnets are blocked.

---

## 4. Sandboxed Expression & Code Evaluation
- Node expressions (`{{ ... }}`) and custom code nodes run in isolated JavaScript execution contexts (`node:vm`).
- **Restricted Globals**: `process`, `require`, `fs`, `child_process`, `global`, `globalThis`, and `module` are omitted from the sandbox context.
- **Resource Limits**: Configurable execution timeout (default 3,000ms) to prevent infinite loops (e.g. `while(true)`) from hanging the event loop.

---

## 5. Secret Redaction & Sanitization
- Logs, error stacks, and execution inspection payloads automatically sanitize common credential keys (`password`, `apiKey`, `token`, `secret`, `authorization`, `accessToken`).
- Pinned data and execution traces store masked previews rather than raw secret values.
