"""Convert a screenshot PNG to a 1280x720 JPEG that fits the 256 KiB screenshot cap."""
import sys
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
img = Image.open(src).convert("RGB")
if img.size != (1280, 720):
    img = img.resize((1280, 720), Image.LANCZOS)
for quality in (92, 90, 88, 85, 82, 78, 74, 70):
    img.save(dst, "JPEG", quality=quality, optimize=True, progressive=True)
    size = __import__("os").path.getsize(dst)
    if size <= 250 * 1024:
        break
print(dst, size, "bytes, quality", quality)
