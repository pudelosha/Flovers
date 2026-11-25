"""Print existing factory QR identities. Outputs are sensitive possession material."""
import html
import json
from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from .materials import protected_directory


def layout(qr_payload, width_mm, height_mm):
    if not 35 <= width_mm <= 100 or not 40 <= height_mm <= 100:
        raise ValueError("Label size must be 35–100 mm wide and 40–100 mm high.")
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=8, border=4)
    qr.add_data(qr_payload, optimize=0)
    qr.make(fit=True)
    matrix = qr.get_matrix()
    side = min(width_mm - 4, height_mm - 15)
    if side / len(matrix) < 0.35:
        raise ValueError("QR modules would be too small; increase label dimensions.")
    return matrix, side


def label_records(manifest, kit, hardware_id=None):
    records = []
    for slot in manifest["devices"]:
        if hardware_id and slot["hardware_id"] != hardware_id:
            continue
        qr = json.loads(kit[slot["hardware_id"] + "/device-qr.json"])
        records.append((slot, json.dumps(qr, separators=(",", ":"))))
    if not records:
        raise ValueError("No matching factory identity.")
    return records


def export_labels(manifest, kit, output, *, format="pdf", hardware_id=None, width_mm=45, height_mm=45):
    if format not in {"png", "svg", "pdf"}:
        raise ValueError("Unsupported label format.")
    records = label_records(manifest, kit, hardware_id)
    prepared = [(slot, payload, *layout(payload, width_mm, height_mm)) for slot, payload in records]
    output = protected_directory(output)
    # Restricted, deterministic source lets operators compare a print job against its board.
    from .create_identity import write_private
    if format == "pdf":
        path = output / "labels.pdf"
        sheet = canvas.Canvas(str(path), pagesize=A4, pageCompression=1)
        sheet.setTitle("Flovers factory labels")
        cols = int((210 - 20 + 3) // (width_mm + 3))
        rows = int((297 - 20 + 3) // (height_mm + 3))
        if not cols or not rows:
            raise ValueError("Labels do not fit A4.")
        for index, (slot, _payload, matrix, side) in enumerate(prepared):
            if index and index % (cols * rows) == 0:
                sheet.showPage()
            cell = index % (cols * rows)
            x = (10 + cell % cols * (width_mm + 3)) * mm
            y = (297 - 10 - (cell // cols + 1) * height_mm - cell // cols * 3) * mm
            sheet.setFillColorRGB(1, 1, 1); sheet.rect(x, y, width_mm * mm, height_mm * mm, fill=1, stroke=0)
            sheet.setFillColorRGB(0, 0, 0); sheet.setFont("Helvetica-Bold", 9)
            sheet.drawCentredString(x + width_mm * mm / 2, y + (height_mm - 5) * mm, "Flovers")
            module = side * mm / len(matrix)
            left = x + (width_mm - side) * mm / 2
            bottom = y + 8 * mm
            for row, values in enumerate(matrix):
                for col, dark in enumerate(values):
                    if dark:
                        sheet.rect(left + col * module, bottom + (len(matrix) - row - 1) * module, module, module, fill=1, stroke=0)
            font = min(7, (width_mm - 4) * mm / max(1, sheet.stringWidth(slot["serial_number"], "Helvetica", 1)))
            if font < 5:
                raise ValueError("Serial number too long for this label; increase width.")
            sheet.setFont("Helvetica", font)
            sheet.drawCentredString(x + width_mm * mm / 2, y + 5 * mm, slot["serial_number"])
            sheet.setFont("Helvetica", 6)
            sheet.drawCentredString(x + width_mm * mm / 2, y + 2 * mm, "Scan to pair")
        sheet.save()
    for slot, _payload, matrix, side in prepared:
        if format == "pdf":
            continue
        name = slot["serial_number"]
        if format == "svg":
            module = side / len(matrix); left = (width_mm - side) / 2
            parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width_mm}mm" height="{height_mm}mm" viewBox="0 0 {width_mm} {height_mm}">',
                f'<rect width="{width_mm}" height="{height_mm}" fill="white"/>',
                f'<text x="{width_mm / 2}" y="5" text-anchor="middle" font-family="sans-serif" font-size="3.2" font-weight="bold">Flovers</text>']
            top = height_mm - 8 - side
            for row, values in enumerate(matrix):
                for col, dark in enumerate(values):
                    if dark:
                        parts.append(f'<rect x="{left + col * module:.6f}" y="{top + row * module:.6f}" width="{module:.6f}" height="{module:.6f}"/>')
            parts += [f'<text x="{width_mm / 2}" y="{height_mm - 5}" text-anchor="middle" font-family="sans-serif" font-size="2" textLength="{width_mm - 5}" lengthAdjust="spacingAndGlyphs">{html.escape(name)}</text>',
                f'<text x="{width_mm / 2}" y="{height_mm - 2}" text-anchor="middle" font-family="sans-serif" font-size="2">Scan to pair</text>', '</svg>']
            write_private(output / (name + ".svg"), "".join(parts))
        else:
            ppm = 300 / 25.4; size = (round(width_mm * ppm), round(height_mm * ppm))
            image = Image.new("RGB", size, "white"); draw = ImageDraw.Draw(image)
            module = max(1, int(side * ppm / len(matrix)))
            left = (size[0] - len(matrix) * module) // 2
            top = round((height_mm - 8) * ppm) - len(matrix) * module
            for row, values in enumerate(matrix):
                for col, dark in enumerate(values):
                    if dark:
                        draw.rectangle((left + col * module, top + row * module,
                            left + (col + 1) * module - 1, top + (row + 1) * module - 1), fill="black")
            for text, y, font_size in [("Flovers", 2, 32), (name, height_mm - 7, 21), ("Scan to pair", height_mm - 4, 20)]:
                font = ImageFont.load_default(size=font_size)
                while draw.textlength(text, font=font) > size[0] - 4 * ppm and font_size > 12:
                    font_size -= 1; font = ImageFont.load_default(size=font_size)
                if draw.textlength(text, font=font) > size[0] - 4 * ppm:
                    raise ValueError("Serial number too long for label.")
                draw.text((size[0] / 2, y * ppm), text, font=font, fill="black", anchor="mt")
            with (output / (name + ".png")).open("xb") as handle:
                image.save(handle, format="PNG", dpi=(300, 300))
    # This receipt is intentionally public; the label output itself is secret-bearing.
    write_private(output / "print-job.json", json.dumps({"version": 1, "batch": manifest["batch"], "format": format,
        "width_mm": width_mm, "height_mm": height_mm, "devices": [slot for slot, _ in records]}, indent=2))
    return output
