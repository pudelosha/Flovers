"""Resource-bounded image normalization, usable without importing Django.

Decode untrusted input in a small child process, not alongside the recognition
model in the web worker. Only normalized JPEG bytes leave that process.
"""
import base64
from io import BytesIO
import json
import sys
import warnings

from PIL import Image, ImageOps, UnidentifiedImageError

MAX_INPUT = 5 * 1024 * 1024
MAX_PIXELS = 20_000_000


def _encode(source, longest_edge, byte_limit):
    image = source.copy()
    image.thumbnail((longest_edge, longest_edge), Image.Resampling.LANCZOS)
    while True:
        for quality in (78, 72, 65, 58):
            output = BytesIO()
            image.save(output, format="JPEG", quality=quality, optimize=True,
                       progressive=True, exif=b"", icc_profile=None)
            data = output.getvalue()
            if len(data) <= byte_limit:
                return data, image.width, image.height
        if max(image.size) <= 160:
            raise ValueError("Image cannot fit the permitted size.")
        image.thumbnail((max(1, int(image.width * .8)), max(1, int(image.height * .8))), Image.Resampling.LANCZOS)


def normalize(data):
    if not data or len(data) > MAX_INPUT:
        raise ValueError("Invalid image size.")
    with warnings.catch_warnings():
        warnings.simplefilter("error", Image.DecompressionBombWarning)
        with Image.open(BytesIO(data), formats=("JPEG", "PNG")) as probe:
            if probe.width * probe.height > MAX_PIXELS or getattr(probe, "n_frames", 1) != 1:
                raise ValueError("Image dimensions or animation are not supported.")
            probe.verify()
        with Image.open(BytesIO(data), formats=("JPEG", "PNG")) as incoming:
            oriented = ImageOps.exif_transpose(incoming).convert("RGB")
            # A fresh image drops EXIF, XMP, GPS, text chunks and color profiles.
            clean = Image.new("RGB", oriented.size)
            clean.paste(oriented)
        display, width, height = _encode(clean, 1280, 300 * 1024)
        thumbnail, _, _ = _encode(clean, 320, 40 * 1024)
    return {"display": display, "thumbnail": thumbnail, "width": width, "height": height}


def main():
    try:
        try:
            import resource
            resource.setrlimit(resource.RLIMIT_AS, (384 * 1024 * 1024, 384 * 1024 * 1024))
            resource.setrlimit(resource.RLIMIT_CPU, (8, 8))
        except ImportError:
            pass  # Windows: the caller still enforces the wall-clock deadline.
        result = normalize(sys.stdin.buffer.read(MAX_INPUT + 1))
        result["display"] = base64.b64encode(result["display"]).decode("ascii")
        result["thumbnail"] = base64.b64encode(result["thumbnail"]).decode("ascii")
        sys.stdout.write(json.dumps(result))
        return 0
    except (ValueError, OSError, MemoryError, UnidentifiedImageError,
            Image.DecompressionBombError, Image.DecompressionBombWarning):
        sys.stdout.write(json.dumps({"error": "invalid_photo"}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
