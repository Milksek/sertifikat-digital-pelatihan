# create-audit-zip.ps1
# Script to compile a minimal zip archive for tech audit, handling Windows/PowerShell path parsing correctly.

$dest = "C:\Users\Rad\Downloads\SSDP_AUDIT_MINIMAL"
$zip  = "C:\Users\Rad\Downloads\SSDP_AUDIT_MINIMAL.zip"

Write-Output "Preparing SSDP minimal audit pack..."

# Clean up previous attempts
Remove-Item -Recurse -Force $dest -ErrorAction SilentlyContinue
Remove-Item -Force $zip -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $dest | Out-Null

$root = Resolve-Path "$PSScriptRoot\.."

function Copy-Safe($relPath) {
    $src = Join-Path $root $relPath
    $target = Join-Path $dest $relPath
    
    if (!(Test-Path -LiteralPath $src)) {
        Write-Output "Warning: Path not found - $src"
        return
    }

    if ((Get-Item -LiteralPath $src).PSIsContainer) {
        # It's a directory, copy recursively using literal paths
        Get-ChildItem -LiteralPath $src -Recurse -File | ForEach-Object {
            $fileSrc = $_.FullName
            $relFilePath = $fileSrc.Substring($src.Length).TrimStart('\')
            $fileTarget = Join-Path $target $relFilePath
            
            $fileTargetDir = Split-Path $fileTarget -Parent
            if (!(Test-Path -LiteralPath $fileTargetDir)) {
                New-Item -ItemType Directory -Path $fileTargetDir -Force | Out-Null
            }
            [System.IO.File]::Copy($fileSrc, $fileTarget, $true)
        }
    } else {
        # It's a file
        $dir = Split-Path $target -Parent
        if (!(Test-Path -LiteralPath $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
        [System.IO.File]::Copy($src, $target, $true)
    }
}

# Core config & contract files
Copy-Safe "contracts\SertifikatDigital.sol"
Copy-Safe "package.json"
Copy-Safe "tsconfig.json"
Copy-Safe ".env.example"

# API routes
Copy-Safe "src\app\api\admin\mint\route.ts"
Copy-Safe "src\app\api\public\verify\route.ts"
Copy-Safe "src\app\api\auth\sync\route.ts"
Copy-Safe "src\app\api\admin\assessments\[id]\assign\route.ts"
Copy-Safe "src\app\api\admin\dashboard-summary\route.ts"
Copy-Safe "src\app\api\admin\assessors\route.ts"
Copy-Safe "src\app\api\admin\participants\route.ts"
Copy-Safe "src\app\api\admin\preview-certificate\route.ts"
Copy-Safe "src\app\api\assessor\assessments\[id]\route.ts"
Copy-Safe "src\app\api\profile\me\route.ts"
Copy-Safe "src\app\api\profile\by-wallet\route.ts"

# Libraries
Copy-Safe "src\lib\thirdweb.ts"
Copy-Safe "src\lib\supabase.ts"
Copy-Safe "src\lib\certificate-renderer.ts"
Copy-Safe "src\lib\app-config.ts"
Copy-Safe "src\lib\status-labels.ts"
Copy-Safe "src\lib\server-auth.ts"

# Views/Pages
Copy-Safe "src\app\admin\mint\page.tsx"
Copy-Safe "src\app\admin\mint\[id]\page.tsx"
Copy-Safe "src\app\admin\logs\page.tsx"
Copy-Safe "src\app\admin\assessments\page.tsx"
Copy-Safe "src\app\admin\assessors\page.tsx"
Copy-Safe "src\app\admin\participants\page.tsx"
Copy-Safe "src\app\verify\page.tsx"
Copy-Safe "src\app\participant\assessments\page.tsx"
Copy-Safe "src\app\participant\assessments\[id]\page.tsx"
Copy-Safe "src\app\assessor\evaluate\[id]\page.tsx"

# Database migrations
Copy-Safe "supabase\migrations"

# Public assets
Copy-Safe "public\certificate_template.png"

# Testing & Deploy setup
$testRoot = Join-Path $root "cert-system-testing"
if (Test-Path $testRoot) {
    Copy-Safe "cert-system-testing\hardhat.config.js"
    Copy-Safe "cert-system-testing\1-unit-testing-hardhat"
    Copy-Safe "cert-system-testing\scripts\deploy.js"
} else {
    Copy-Safe "hardhat.config.js"
    Copy-Safe "hardhat.config.ts"
    Copy-Safe "1-unit-testing-hardhat"
    Copy-Safe "scripts\deploy.js"
}

# Audit Log (check both locations)
$logPath = "C:\Users\Rad\Downloads\SSDP_AUDIT_LOG.txt"
if (Test-Path $logPath) {
    $logTarget = Join-Path $dest "SSDP_AUDIT_LOG.txt"
    [System.IO.File]::Copy($logPath, $logTarget, $true)
}

Write-Output "All files copied. Compressing zip file..."
Compress-Archive -Path "$dest\*" -DestinationPath $zip -Force

# Verify zip files count and contents
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipObj = [System.IO.Compression.ZipFile]::OpenRead($zip)
Write-Output "Zip packing verified. Total files packed: $($zipObj.Entries.Count)"
$zipObj.Dispose()

Write-Output "SSDP_AUDIT_MINIMAL.zip generated successfully at C:\Users\Rad\Downloads\"
