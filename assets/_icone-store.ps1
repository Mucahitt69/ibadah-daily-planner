# Fabrique l'icone 512 x 512 demandee par la fiche du Play Store.
#
# Elle ne redessine RIEN : elle repose le motif (icon-foreground.png) sur son
# fond (icon-background.png), exactement comme Android le fait sur l'ecran
# d'accueil. Aucune difference de dessin entre l'icone du telephone, le
# bandeau et la fiche.
#
# Le fond est repose meme si le motif est deja opaque : la fiche du Play Store
# n'accepte pas de transparence, et une icone transparente y arrive noire.
#
#   powershell -ExecutionPolicy Bypass -File assets\_icone-store.ps1

Add-Type -AssemblyName System.Drawing

$ici    = Split-Path -Parent $MyInvocation.MyCommand.Path
$fond   = [System.Drawing.Image]::FromFile((Join-Path $ici 'icon-background.png'))
$motif  = [System.Drawing.Image]::FromFile((Join-Path $ici 'icon-foreground.png'))
$sortie = Join-Path $ici 'play-store-icone.png'

$carre = New-Object System.Drawing.Bitmap 512, 512
$g = [System.Drawing.Graphics]::FromImage($carre)
$g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

# ⚠️ icon-background.png n'est PAS tout a fait opaque : ses coins sont a
#    alpha 220. Sans le fond plein pose en dessous, l'icone arriverait
#    transparente sur la fiche -- et le Play Store la refuse.
$g.Clear([System.Drawing.Color]::FromArgb(255, 0x0B, 0x6E, 0x55))
$g.DrawImage($fond,  0, 0, 512, 512)
$g.DrawImage($motif, 0, 0, 512, 512)

$g.Dispose()
$carre.Save($sortie, [System.Drawing.Imaging.ImageFormat]::Png)
$carre.Dispose(); $fond.Dispose(); $motif.Dispose()

$poids = [math]::Round((Get-Item $sortie).Length / 1KB, 1)
Write-Host "  play-store-icone.png  512 x 512  ($poids ko)"
