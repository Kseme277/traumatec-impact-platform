"""Palette TIP — miroir de frontend/src/index.css (@theme).

Les emails HTML n'acceptent pas les variables CSS du site : on duplique
les hex ici pour garder la même identité visuelle (boutons, bandeau, footer).
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class TipBrandColors:
    # Brand (TailAdmin / TIP)
    brand_50: str = "#ecf3ff"
    brand_500: str = "#465fff"
    brand_600: str = "#3641f5"
    brand_950: str = "#161950"

    # Neutrals
    white: str = "#ffffff"
    gray_100: str = "#f2f4f7"
    gray_200: str = "#e4e7ec"
    gray_500: str = "#667085"
    gray_600: str = "#475467"
    gray_900: str = "#101828"

    # Footer links on dark background
    footer_text: str = "#c2d6ff"
    footer_muted: str = "#9cb9ff"


TIP_COLORS = TipBrandColors()
