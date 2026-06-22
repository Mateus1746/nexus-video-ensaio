from PIL import Image, ImageDraw, ImageFont
import math

def create_icon(name, draw_fn):
    img = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw_fn(draw)
    img.save(f'assets/icon_{name}.png')
    print(f"✅ Ícone {name} gerado.")

# --- ICON DEFINITIONS ---

def draw_wall(draw):
    draw.rectangle([100, 150, 412, 400], fill="white")
    # Bricks (Negative Space)
    for y in range(150, 400, 50):
        draw.line([100, y, 412, y], fill=(0,0,0,0), width=5)
        offset = 25 if (y//50) % 2 == 0 else 0
        for x in range(100 + offset, 412, 50):
            draw.line([x, y, x, y+50], fill=(0,0,0,0), width=5)

def draw_dollar(draw):
    draw.ellipse([150, 100, 362, 412], outline="white", width=20)
    # S symbol (Negative Space)
    draw.arc([180, 150, 332, 280], start=180, end=30, fill=(0,0,0,0), width=40)
    draw.arc([180, 230, 332, 360], start=0, end=210, fill=(0,0,0,0), width=40)
    draw.line([256, 120, 256, 390], fill=(0,0,0,0), width=20)

def draw_bread_line(draw):
    # Multiple figures in line (Negative Space inside a block)
    draw.rectangle([50, 200, 462, 400], fill="white")
    for i in range(5):
        cx = 100 + i * 80
        draw.ellipse([cx-20, 220, cx+20, 260], fill=(0,0,0,0)) # Head
        draw.rectangle([cx-25, 270, cx+25, 380], fill=(0,0,0,0)) # Body

def draw_dish(draw):
    draw.arc([100, 100, 412, 412], start=180, end=0, fill="white", width=40)
    draw.line([256, 300, 256, 450], fill="white", width=30)
    draw.ellipse([236, 180, 276, 220], fill=(0,0,0,0)) # Focal point

def draw_biohazard(draw):
    center = (256, 256)
    for i in range(3):
        angle = math.radians(i * 120 - 90)
        dist = 80
        cx = center[0] + math.cos(angle) * dist
        cy = center[1] + math.sin(angle) * dist
        draw.ellipse([cx-100, cy-100, cx+100, cy+100], outline="white", width=30)
    draw.ellipse([center[0]-40, center[1]-40, center[0]+40, center[1]+40], fill="white")
    draw.ellipse([center[0]-20, center[1]-20, center[0]+20, center[1]+20], fill=(0,0,0,0))

def draw_peace(draw):
    draw.ellipse([100, 100, 412, 412], outline="white", width=30)
    draw.line([256, 100, 256, 412], fill="white", width=30)
    draw.line([256, 256, 150, 360], fill="white", width=30)
    draw.line([256, 256, 360, 360], fill="white", width=30)

def draw_hammer_sickle(draw):
    # Simplified silhouettes
    draw.arc([150, 150, 350, 350], start=180, end=0, fill="white", width=40)
    draw.rectangle([280, 200, 330, 400], fill="white") # Handle
    draw.rectangle([200, 100, 300, 180], fill="white") # Hammer head

def draw_star(draw):
    points = []
    for i in range(10):
        angle = math.radians(i * 36 - 90)
        r = 200 if i % 2 == 0 else 80
        points.append((256 + r * math.cos(angle), 256 + r * math.sin(angle)))
    draw.polygon(points, fill="white")

def draw_submarine(draw):
    draw.ellipse([100, 200, 412, 320], fill="white")
    draw.rectangle([230, 150, 280, 220], fill="white") # Tower
    draw.line([240, 130, 240, 150], fill="white", width=10) # Periscope

def draw_jet(draw):
    draw.polygon([(256, 100), (200, 400), (256, 350), (312, 400)], fill="white") # Body
    draw.polygon([(256, 250), (100, 350), (256, 300)], fill="white") # Left wing
    draw.polygon([(256, 250), (412, 350), (256, 300)], fill="white") # Right wing

def draw_tv(draw):
    draw.rounded_rectangle([100, 150, 412, 400], radius=30, fill="white")
    draw.rectangle([130, 180, 350, 370], fill=(0,0,0,0)) # Screen
    draw.line([256, 150, 200, 80], fill="white", width=10) # Antennas
    draw.line([256, 150, 312, 80], fill="white", width=10)

def draw_computer(draw):
    draw.rectangle([120, 100, 392, 350], fill="white") # Monitor
    draw.rectangle([140, 120, 372, 300], fill=(0,0,0,0)) # Screen
    draw.rectangle([100, 370, 412, 420], fill="white") # Keyboard

def draw_wheat(draw):
    for i in range(5):
        y = 150 + i * 60
        draw.ellipse([236, y, 276, y+40], fill="white")
        draw.line([200, y+20, 236, y+20], fill="white", width=5)
        draw.line([276, y+20, 312, y+20], fill="white", width=5)
    draw.line([256, 100, 256, 450], fill="white", width=10)

def draw_handshake(draw):
    draw.rectangle([150, 200, 256, 300], fill="white")
    draw.rectangle([256, 200, 362, 300], fill="white")
    draw.line([256, 200, 256, 300], fill=(0,0,0,0), width=10) # Split

def draw_key(draw):
    draw.ellipse([150, 150, 250, 250], outline="white", width=30)
    draw.rectangle([240, 190, 450, 210], fill="white")
    draw.rectangle([400, 210, 420, 250], fill="white")
    draw.rectangle([430, 210, 450, 250], fill="white")

icons = {
    "berlin_wall": draw_wall,
    "dollar_sign": draw_dollar,
    "bread_line": draw_bread_line,
    "satellite_dish": draw_dish,
    "biohazard": draw_biohazard,
    "peace_sign": draw_peace,
    "hammer_sickle": draw_hammer_sickle,
    "star": draw_star,
    "submarine": draw_submarine,
    "jet_plane": draw_jet,
    "television": draw_tv,
    "computer": draw_computer,
    "wheat": draw_wheat,
    "handshake": draw_handshake,
    "key_intel": draw_key
}

for name, fn in icons.items():
    create_icon(name, fn)
