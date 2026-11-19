# Publicación en Turso (base de datos) y Vercel (aplicación).
#
# Antes de correrlo:
#   1. Iniciar sesión en Vercel:  npx vercel login
#   2. Crear la base en https://app.turso.tech y tener a mano su URL (libsql://...) y un token.
#
# Uso (desde la carpeta del proyecto):
#   powershell -ExecutionPolicy Bypass -File scripts\publicar.ps1 [-Url libsql://...]
#
# El token y el secreto de sesión se piden/generan acá y van directo a Turso y a Vercel:
# no se muestran en pantalla ni se guardan en ningún archivo del proyecto.
param([string]$Url = "")

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
$vercel = "vercel@66.4.0"

function Revisar($paso) {
  if ($LASTEXITCODE -ne 0) { throw "Falló: $paso" }
}

Write-Host "`n1/5  Datos de la base de Turso" -ForegroundColor Cyan
$url = $Url.Trim()
if (-not $url) { $url = (Read-Host "URL de la base (empieza con libsql://)").Trim() }
Write-Host "  Base: $url"
if (-not $url.StartsWith("libsql://")) { throw "La URL tiene que empezar con libsql://" }
# El token se lee del portapapeles (pegar en la terminal a veces lo corta)
Read-Host "Copiá el token en Turso (botón de copiar) y apretá Enter acá"
$token = (Get-Clipboard -Raw).Trim()
if ($token.Length -lt 100) { throw "En el portapapeles no hay un token de Turso (tiene $($token.Length) caracteres). Copialo de nuevo." }
Write-Host "  Token leído del portapapeles ($($token.Length) caracteres)"
Set-Clipboard -Value " "   # se borra del portapapeles

Write-Host "`n2/5  Creando las tablas en Turso (migraciones)" -ForegroundColor Cyan
$env:DATABASE_URL = $url
$env:DATABASE_AUTH_TOKEN = $token
node scripts/probar-conexion.mjs; Revisar "conexión con Turso"
pnpm run db:migrate; Revisar "db:migrate"

Write-Host "`n3/5  Cargando los datos de prueba en Turso" -ForegroundColor Cyan
pnpm run db:seed; Revisar "db:seed"
pnpm run db:verificar; Revisar "db:verificar"
Remove-Item Env:DATABASE_URL, Env:DATABASE_AUTH_TOKEN

Write-Host "`n4/5  Creando el proyecto en Vercel y cargando las variables" -ForegroundColor Cyan
npx --yes $vercel link --yes --project parcial-2-prog-tup-c3; Revisar "vercel link"
$secreto = node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))"
$variables = [ordered]@{ DATABASE_URL = $url; DATABASE_AUTH_TOKEN = $token; SESSION_SECRET = $secreto }
foreach ($nombre in $variables.Keys) {
  npx --yes $vercel env add $nombre --environment production --value $variables[$nombre] --sensitive --force --yes | Out-Null
  Revisar "vercel env add $nombre"
  Write-Host "  ✔ $nombre"
}

Write-Host "`n5/5  Publicando en producción" -ForegroundColor Cyan
npx --yes $vercel deploy --prod --yes; Revisar "vercel deploy"

Write-Host "`nListo. La URL pública es la que aparece arriba como 'Production'." -ForegroundColor Green
