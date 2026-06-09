"""Utilitaires openpyxl — écriture sûre dans les plages fusionnées."""

from __future__ import annotations

from typing import Any

from openpyxl.cell.cell import MergedCell
from openpyxl.worksheet.worksheet import Worksheet


def writable_cell(sheet: Worksheet, cell: Any) -> Any:
    """Retourne la cellule ancre si ``cell`` fait partie d'une fusion."""
    if not isinstance(cell, MergedCell):
        return cell
    for merged_range in sheet.merged_cells.ranges:
        if cell.coordinate in merged_range:
            return sheet.cell(row=merged_range.min_row, column=merged_range.min_col)
    return cell


def cell_value(sheet: Worksheet, cell: Any) -> Any:
    return writable_cell(sheet, cell).value


def set_cell_value(sheet: Worksheet, cell: Any, value: Any) -> bool:
    """Écrit une valeur ; retourne True si la cellule a été modifiée."""
    target = writable_cell(sheet, cell)
    if target.value == value:
        return False
    target.value = value
    return True
