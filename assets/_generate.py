import math, os
import cairosvg

GREEN      = "#0B6E55"
CREAM      = "#F4F1EA"
GREEN_LT   = "#3DBE92"
DARK       = "#0D1512"

# ---------------------------------------------------------------- motif
# Dessine dans un repere 1024x1024. Tout tient dans le cercle de 680 (r=340).
A       = 155.0     # demi-largeur de l'arc
Y_BASE  = 725.7
Y_SPR   = 545.7     # ligne de naissance (springing line)
Y_APEX  = 298.3
R       = 275.0
STROKE  = 44.0

# croissant
CX, CY  = 522.0, 522.0
R_OUT   = 108.0
R_CUT   = 104.0
DX, DY  = 44.0, -20.0

def crescent_path():
    d = math.hypot(DX, DY)
    ua = math.atan2(DY, DX)
    a = (R_OUT**2 - R_CUT**2 + d*d) / (2*d)
    h = math.sqrt(max(R_OUT**2 - a*a, 0.0))
    beta  = math.atan2(h, a)          # angle des points d'intersection vus de O
    gamma = math.atan2(h, a - d)      # ... vus de C
    pts = []
    N = 480
    for i in range(N + 1):            # arc exterieur, de +beta a 2pi-beta
        t = ua + beta + (2*math.pi - 2*beta) * i / N
        pts.append((CX + R_OUT*math.cos(t), CY + R_OUT*math.sin(t)))
    for i in range(N + 1):            # arc interieur, retour
        t = ua + (2*math.pi - gamma) - (2*math.pi - 2*gamma) * i / N
        pts.append((CX + DX + R_CUT*math.cos(t), CY + DY + R_CUT*math.sin(t)))
    return "M " + " L ".join(f"{x:.2f} {y:.2f}" for x, y in pts) + " Z"

def motif(color, uid):
    if color == "none":
        return ""
    return f'''
  <path d="M {512-A} {Y_BASE} L {512-A} {Y_SPR}
           A {R} {R} 0 0 1 512 {Y_APEX}
           A {R} {R} 0 0 1 {512+A} {Y_SPR}
           L {512+A} {Y_BASE} Z"
        fill="none" stroke="{color}" stroke-width="{STROKE}"
        stroke-linejoin="round" stroke-linecap="round"/>
  <path d="{crescent_path()}" fill="{color}"/>
'''

SCALE0 = 1.07   # remplit la zone sure sans la depasser

def svg(size, bg, color, uid, mark_radius=None):
    """mark_radius : rayon vise du motif dans le canevas final."""
    s = SCALE0 if mark_radius is None else (mark_radius / 324.0)
    c = size / 2.0
    bgrect = f'<rect width="{size}" height="{size}" fill="{bg}"/>' if bg else ''
    k = (size / 1024.0) * s
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">
{bgrect}
<g transform="translate({c},{c}) scale({k}) translate(-512,-512)">{motif(color, uid)}</g>
</svg>'''

def render(path, size, bg, color, uid, mark_radius=None):
    cairosvg.svg2png(bytestring=svg(size, bg, color, uid, mark_radius).encode(),
                     write_to=path, output_width=size, output_height=size)
    print("ok", path, size)

# Ecrit a cote de ce fichier, c'est-a-dire dans assets/ : c'est la que
# « npx @capacitor/assets generate » va chercher ses cinq images.
# (L'ancien chemin pointait vers la machine ou le script a ete ecrit.)
OUT = os.path.dirname(os.path.abspath(__file__))
os.makedirs(OUT, exist_ok=True)

render(f"{OUT}/icon-foreground.png", 1024, None,   CREAM,    "a")
render(f"{OUT}/icon-background.png", 1024, GREEN,  "none",   "b")
render(f"{OUT}/icon-only.png",       1024, GREEN,  CREAM,    "c")
render(f"{OUT}/splash.png",          2732, CREAM,  GREEN,    "d", mark_radius=470)
render(f"{OUT}/splash-dark.png",     2732, DARK,   GREEN_LT, "e", mark_radius=470)
