"""Keep application text literal and XML-safe when writing XLSX files."""
import re

from openpyxl.cell.cell import Cell


_INVALID_XML = re.compile("[\x00-\x08\x0b\x0c\x0e-\x1f\ud800-\udfff\ufffe\uffff]")


def append_safe_row(worksheet, values):
    cells = []
    for value in values:
        if isinstance(value, str):
            value = _INVALID_XML.sub("", value)
            cell = Cell(worksheet, value=value)
            # Assignment normally interprets leading '=' and Excel error tokens.
            # Force text without prefixing an apostrophe or changing visible content.
            cell.data_type = "s"
            cells.append(cell)
        else:
            cells.append(value)
    worksheet.append(cells)
