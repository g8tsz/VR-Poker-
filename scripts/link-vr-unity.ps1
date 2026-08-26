# Symlink VR Unity module scripts into the Quest project.
# Run from repo root: .\scripts\link-vr-unity.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ProjectAssets = Join-Path $Root "clients\vr\Project\Assets\VRPoker"
$Modules = @(
  @{ Name = "ClientCore"; Source = "clients\vr\client-core\unity" },
  @{ Name = "Netcode"; Source = "clients\vr\netcode\unity" },
  @{ Name = "Interaction"; Source = "clients\vr\interaction\unity" },
  @{ Name = "Rendering"; Source = "clients\vr\rendering\unity" },
  @{ Name = "Audio"; Source = "clients\vr\audio\unity" },
  @{ Name = "Platform"; Source = "clients\vr\platform\unity" }
)

New-Item -ItemType Directory -Force -Path $ProjectAssets | Out-Null

foreach ($mod in $Modules) {
  $target = Join-Path $ProjectAssets $mod.Name
  $source = Join-Path $Root $mod.Source
  if (-not (Test-Path $source)) {
    Write-Warning "Skip $($mod.Name): $source not found"
    continue
  }
  if (Test-Path $target) { Remove-Item $target -Force -Recurse -ErrorAction SilentlyContinue }
  New-Item -ItemType Junction -Path $target -Target $source | Out-Null
  Write-Host "Linked $($mod.Name) -> $source"
}

Write-Host ""
Write-Host "Next:"
Write-Host "  1. Open clients\vr\Project in Unity 2022.3 LTS + Meta XR SDK"
Write-Host "  2. cp infra\.env.example infra\.env && npm run stack"
Write-Host "  3. Build Android -> Quest (2 headsets or Quest + npm run web)"
