# Met les captures d'ecran au format que le Play Store accepte.
#
# Le piege : une capture brute du S24 fait 1080 x 2340, soit une image 2,17
# fois plus haute que large. Le Play Store refuse au-dela de 9:16 (1,78).
# On rogne donc la barre d'etat en haut et la barre de navigation d'Android en
# bas — ce sont des elements du telephone, pas de l'application — puis on pose
# ce qui reste, a l'echelle, sur un fond couleur sable identique a celui de
# l'application.
#
# Lancer :  powershell -File assets\_captures.ps1 <dossier-des-captures>

param([string]$Source = ".")

Add-Type -AssemblyName System.Drawing

$SABLE = [System.Drawing.ColorTranslator]::FromHtml('#F4F1EA')   # --bg
$L_FIN = 1080
$H_FIN = 1920

# Bornes de la zone qui appartient vraiment a l'application.
$HAUT = 90      # sous l'horloge et les icones du telephone
$BAS  = 2200    # au-dessus des trois touches d'Android

$dossier = Resolve-Path $Source
$sortie  = Join-Path $dossier 'play-store'
New-Item -ItemType Directory -Force -Path $sortie | Out-Null

Get-ChildItem -Path $dossier -Filter 'cap-*.png' | ForEach-Object {
  $src = [System.Drawing.Image]::FromFile($_.FullName)

  $hUtile = $BAS - $HAUT
  $zone   = New-Object System.Drawing.Rectangle(0, $HAUT, $src.Width, $hUtile)

  # On garde les proportions : l'image ne doit jamais etre etiree.
  # ⚠️ [double] n'est pas decoratif. 1080/1080 vaut 1 en ENTIER ; PowerShell
  # convertit alors l'autre valeur (0,91) en entier pour comparer, ce qui donne
  # 1 lui aussi, et l'image se retrouve AGRANDIE au lieu d'etre reduite : elle
  # deborde du cadre, et on perd la date en haut et les onglets en bas.
  $facteur = [Math]::Min([double]$L_FIN / $src.Width, [double]$H_FIN / $hUtile)
  $l = [int]($src.Width * $facteur)
  $h = [int]($hUtile   * $facteur)
  $x = [int](($L_FIN - $l) / 2)
  $y = [int](($H_FIN - $h) / 2)

  $img = New-Object System.Drawing.Bitmap($L_FIN, $H_FIN, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g   = [System.Drawing.Graphics]::FromImage($img)
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.Clear($SABLE)
  $g.DrawImage($src, (New-Object System.Drawing.Rectangle($x, $y, $l, $h)), $zone, [System.Drawing.GraphicsUnit]::Pixel)

  $nom = $_.BaseName -replace '^cap-', 'capture-'
  $img.Save((Join-Path $sortie "$nom.png"), [System.Drawing.Imaging.ImageFormat]::Png)

  $g.Dispose(); $img.Dispose(); $src.Dispose()
  Write-Output "  $nom.png  $L_FIN x $H_FIN"
}

Write-Output "Ecrites dans : $sortie"
