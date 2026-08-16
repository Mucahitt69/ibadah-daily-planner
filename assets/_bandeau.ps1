# Fabrique le bandeau 1024 x 500 demande par le Play Store (« feature graphic »).
#
# Pourquoi PowerShell et pas _generate.py : ce dernier a besoin de cairosvg,
# qui n'est plus installe et qui est penible a remettre sous Windows. Ici on ne
# redessine RIEN : on reprend telle quelle l'image du motif deja fabriquee
# (assets/icon-foreground.png), pour qu'il n'y ait aucune derive de style entre
# l'icone et le bandeau.
#
# Lancer :  powershell -File assets\_bandeau.ps1

Add-Type -AssemblyName System.Drawing

$VERT       = [System.Drawing.ColorTranslator]::FromHtml('#0B6E55')  # --primary
$VERT_SOMBRE= [System.Drawing.ColorTranslator]::FromHtml('#075442')
$CREME      = [System.Drawing.ColorTranslator]::FromHtml('#F4F1EA')  # --bg

$L = 1024
$H = 500

$ici    = Split-Path -Parent $MyInvocation.MyCommand.Path
$motif  = Join-Path $ici 'icon-foreground.png'
$sortie = Join-Path $ici 'play-store-bandeau.png'

$img = New-Object System.Drawing.Bitmap($L, $H, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g   = [System.Drawing.Graphics]::FromImage($img)
$g.SmoothingMode     = 'AntiAlias'
$g.InterpolationMode = 'HighQualityBicubic'
# PAS de ClearType : ce lissage-la triche avec les sous-pixels rouges et bleus
# de l'ecran. Sur un ecran c'est invisible, mais fige dans une image ca donne
# des franges de couleur autour des lettres. On lisse en niveaux de gris.
$g.TextRenderingHint = 'AntiAliasGridFit'

# Fond : un degrade en diagonale, tres discret. Le Play Store affiche ce
# bandeau a des tailles tres differentes ; un aplat parfait parait mort, un
# degrade voyant fatigue. Entre les deux.
$rect = New-Object System.Drawing.Rectangle(0, 0, $L, $H)
$deg  = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $VERT, $VERT_SOMBRE, 20.0)
$g.FillRectangle($deg, $rect)

$titre    = New-Object System.Drawing.Font('Segoe UI', 78, [System.Drawing.FontStyle]::Bold,    [System.Drawing.GraphicsUnit]::Pixel)
$sous     = New-Object System.Drawing.Font('Segoe UI', 41, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$promesse = New-Object System.Drawing.Font('Segoe UI', 29, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)

$T1 = 'Ibadah'
$T2 = "Carnet d'adoration"
$T3 = 'Sans points. Sans classement.'

# On mesure avant de dessiner, puis on centre le bloc ENTIER (motif + textes).
# Poser les coordonnees a la main donne toujours une image qui penche d'un cote.
$fmt = [System.Drawing.StringFormat]::GenericTypographic
$m1 = $g.MeasureString($T1, $titre,    10000, $fmt)
$m2 = $g.MeasureString($T2, $sous,     10000, $fmt)
$m3 = $g.MeasureString($T3, $promesse, 10000, $fmt)

# Le motif est dessine avec sa propre marge a l'interieur de son carre : a
# taille egale il parait donc plus leger que le texte. On le grandit pour que
# les deux aient le meme poids a l'oeil.
$taille  = 350          # cote du carre du motif
$ecart   = 40           # respiration entre le motif et le texte
$largeurTexte = [math]::Max([math]::Max($m1.Width, $m2.Width), $m3.Width)
$largeurBloc  = $taille + $ecart + $largeurTexte
$x0 = [int](($L - $largeurBloc) / 2)

# Le motif, centre verticalement.
$src = [System.Drawing.Image]::FromFile($motif)
$g.DrawImage($src, $x0, [int](($H - $taille) / 2), $taille, $taille)
$src.Dispose()

# Les trois lignes, centrees verticalement en tant que groupe.
$interligne1 = 14       # entre le nom et le sous-titre
$interligne2 = 18       # entre le sous-titre et la promesse
$hauteurTexte = $m1.Height + $interligne1 + $m2.Height + $interligne2 + $m3.Height
$xT = $x0 + $taille + $ecart
$y  = ($H - $hauteurTexte) / 2

$plein  = New-Object System.Drawing.SolidBrush($CREME)
# Le sous-titre et la promesse sont volontairement moins appuyes que le nom :
# on doit lire « Ibadah » d'abord, meme quand le bandeau est minuscule.
$doux   = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(226, $CREME))
$discret= New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(168, $CREME))

$g.DrawString($T1, $titre,    $plein,   $xT, $y, $fmt)
$y += $m1.Height + $interligne1
$g.DrawString($T2, $sous,     $doux,    $xT, $y, $fmt)
$y += $m2.Height + $interligne2
$g.DrawString($T3, $promesse, $discret, $xT, $y, $fmt)

$img.Save($sortie, [System.Drawing.Imaging.ImageFormat]::Png)

$titre.Dispose(); $sous.Dispose(); $promesse.Dispose()
$plein.Dispose(); $doux.Dispose(); $discret.Dispose()
$deg.Dispose(); $g.Dispose(); $img.Dispose()

Write-Output "ok $sortie"
