# Vertrauenswürdige lokale HTTPS-Zertifikate (mkcert) für PWA-Dev.
# Einmal: choco install mkcert  ODER  scoop install mkcert  ODER  https://github.com/FiloSottile/mkcert
#
# Aufruf:
#   pnpm run setup:https
#   pnpm run setup:https -- 192.168.x.x

param(
  [string]$LanIp = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$certsDir = Join-Path $root "certs"
New-Item -ItemType Directory -Force -Path $certsDir | Out-Null

if (-not (Get-Command mkcert -ErrorAction SilentlyContinue)) {
  Write-Error "mkcert nicht gefunden. Installieren: https://github.com/FiloSottile/mkcert#installation"
}

Write-Host "Installiere lokale CA (einmalig, ggf. Admin-Rechte) …"
mkcert -install

$names = @("localhost", "127.0.0.1", "::1")
if ($LanIp) {
  $names += $LanIp
  Write-Host "Zusätzlicher Host: $LanIp"
}

$key = Join-Path $certsDir "localhost-key.pem"
$cert = Join-Path $certsDir "localhost.pem"

& mkcert -key-file $key -cert-file $cert @names

Write-Host ""
Write-Host "Fertig. Zertifikate in certs/"
Write-Host "  pnpm dev:pwa        -> https://localhost:5173"
if ($LanIp) {
  Write-Host "  pnpm dev:pwa:host   -> https://${LanIp}:5173"
}
Write-Host "CMS: VITE_STRAPI_PROXY_TARGET in .env.pwadev.local (z. B. http://127.0.0.1:1337)"
