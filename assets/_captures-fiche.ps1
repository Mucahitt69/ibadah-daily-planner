# Met les captures du telephone au format accepte par le Play Store.
#
# Le probleme : l'ecran du Galaxy S24 fait 1080 x 2340, soit 2,17 fois plus
# haut que large. Le Play Store n'accepte les captures de telephone que
# jusqu'a 9:16 (1,78). Une capture brute est REFUSEE par le formulaire, sans
# toujours dire pourquoi.
#
# Ce qu'on fait, et pourquoi pas autrement :
#   1. On retire la barre de navigation d'Android tout en bas (les trois
#      boutons). C'est du systeme, pas de l'application : elle n'apprend rien
#      a quelqu'un qui regarde la fiche.
#   2. On pose ce qui reste, mis a l'echelle SANS DEFORMER, au centre d'une
#      toile de 1080 x 1920 remplie du creme de l'application.
#
# On ne recadre pas dans l'image : couper 420 points mangerait soit l'en-tete,
# soit la barre d'onglets -- c'est-a-dire justement ce qu'on veut montrer.
#
#   powershell -ExecutionPolicy Bypass -File assets\_captures-fiche.ps1

Add-Type -AssemblyName System.Drawing

$ici     = Split-Path -Parent $MyInvocation.MyCommand.Path
$dossier = Join-Path $ici 'play-store-captures'
$BARRE   = 120      # hauteur de la barre de navigation d'Android, en points
$CREME   = [System.Drawing.Color]::FromArgb(255, 0xF4, 0xF1, 0xEA)

# ⚠️ -Filter ne comprend pas [0-9] : c'est du caractere joker de fichier, pas
#    une expression reguliere. Un filtre qui n'attrape rien ne dit rien, il
#    fait juste... rien. D'ou le Where-Object.
Get-ChildItem $dossier -Filter '*.png' |
  Where-Object { $_.Name -match '^\d-' } | Sort-Object Name | ForEach-Object {
  $src = [System.Drawing.Image]::FromFile($_.FullName)

  $hauteurUtile = $src.Height - $BARRE

  # ⚠️ Les [double] ne sont PAS decoratifs. Sans eux, 1080/1080 vaut l'entier
  #    1, [math]::Min choisit sa version entiere, arrondit 0,86 a 1 -- et
  #    l'image est dessinee a sa taille reelle, qui deborde de 150 points en
  #    haut et en bas. Resultat : la barre d'etat et la barre d'onglets
  #    coupees, sans le moindre message d'erreur.
  $echelle = [math]::Min([double]1080 / $src.Width, [double]1920 / $hauteurUtile)
  $l = [int]($src.Width * $echelle)
  $h = [int]($hauteurUtile * $echelle)
  $x = [int]((1080 - $l) / 2)
  $y = [int]((1920 - $h) / 2)

  $toile = New-Object System.Drawing.Bitmap 1080, 1920
  $g = [System.Drawing.Graphics]::FromImage($toile)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear($CREME)

  # On dessine la capture privee de sa barre de navigation.
  $decoupe = New-Object System.Drawing.Rectangle 0, 0, $src.Width, $hauteurUtile
  $place   = New-Object System.Drawing.Rectangle $x, $y, $l, $h
  $g.DrawImage($src, $place, $decoupe, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()

  $sortie = Join-Path $dossier ('fiche-' + $_.BaseName + '.png')
  $toile.Save($sortie, [System.Drawing.Imaging.ImageFormat]::Png)
  $toile.Dispose(); $src.Dispose()

  $poids = [math]::Round((Get-Item $sortie).Length / 1KB)
  Write-Host ("  fiche-{0}.png   1080 x 1920   ({1} ko)" -f $_.BaseName, $poids)
}
