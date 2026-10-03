from PIL import Image, ImageDraw

# Icône : silhouette de voiture blanche sur fond bleu dégradé (couleur Kona EV).
def fond(size):
    img = Image.new("RGB", (size, size))
    haut, bas = (20, 60, 110), (10, 28, 54)
    d = ImageDraw.Draw(img)
    for y in range(size):
        t = y / size
        d.line([(0, y), (size, y)], fill=tuple(int(haut[i] + (bas[i] - haut[i]) * t) for i in range(3)))
    return img

def icone(size, echelle, maskable):
    img = fond(size).convert("RGBA")
    d = ImageDraw.Draw(img)
    cx, cy = size / 2, size / 2
    s = size * echelle
    blanc = (235, 245, 255, 255)

    # Carrosserie (forme simplifiée d'un SUV compact vu de côté).
    corps_w, corps_h = s * 0.74, s * 0.26
    corps_x0, corps_y0 = cx - corps_w / 2, cy - s * 0.02
    d.rounded_rectangle([corps_x0, corps_y0, corps_x0 + corps_w, corps_y0 + corps_h], radius=corps_h * 0.4, fill=blanc)

    # Toit/habitacle.
    toit_w = corps_w * 0.52
    toit_h = s * 0.16
    toit_x0 = cx - toit_w / 2
    toit_y0 = corps_y0 - toit_h * 0.85
    d.rounded_rectangle([toit_x0, toit_y0, toit_x0 + toit_w, toit_y0 + toit_h + 4], radius=toit_h * 0.35, fill=blanc)

    # Roues.
    rayon = s * 0.11
    roue_y = corps_y0 + corps_h
    for dx in (-0.27, 0.27):
        rx = cx + s * dx
        d.ellipse([rx - rayon, roue_y - rayon, rx + rayon, roue_y + rayon], fill=fond(2).getpixel((0, 0)))
        d.ellipse([rx - rayon * 0.42, roue_y - rayon * 0.42, rx + rayon * 0.42, roue_y + rayon * 0.42], fill=blanc)

    # Éclair (symbole électrique) au centre de la carrosserie.
    eclair_couleur = (34, 229, 160, 255)
    ex, ey = cx, corps_y0 + corps_h * 0.48
    es = s * 0.09
    points = [
        (ex + es * 0.25, ey - es * 1.1), (ex - es * 0.55, ey + es * 0.1), (ex - es * 0.05, ey + es * 0.1),
        (ex - es * 0.25, ey + es * 1.1), (ex + es * 0.55, ey - es * 0.1), (ex + es * 0.05, ey - es * 0.1),
    ]
    d.polygon(points, fill=eclair_couleur)

    if not maskable:
        masque = Image.new("L", (size, size), 0)
        ImageDraw.Draw(masque).rounded_rectangle([0, 0, size - 1, size - 1], radius=size * 0.22, fill=255)
        sortie = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        sortie.paste(img, (0, 0), masque)
        return sortie
    return img

for s in (192, 512):
    icone(s, 1.0, False).save(f"icons/icon-{s}.png")
    icone(s, 0.78, True).save(f"icons/icon-{s}-maskable.png")
icone(256, 1.0, False).save("icons/noticekona.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print("icons ok")
