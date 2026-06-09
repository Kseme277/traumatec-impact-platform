#!/usr/bin/env python3
"""Vérifie si la clé NVIDIA fonctionne et si le quota est épuisé."""

from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "packages" / "tip-common"))

from tip_common.nvidia_client import nvidia_model_chain, probe_nvidia_api  # noqa: E402


def _load_dotenv() -> None:
    env_path = ROOT / ".env"
    if not env_path.is_file():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


async def main() -> int:
    _load_dotenv()
    print("Modèles configurés :", ", ".join(nvidia_model_chain()))
    print("Test NVIDIA en cours…\n")

    result = await probe_nvidia_api()
    print(json.dumps(result, ensure_ascii=False, indent=2))

    if result.get("ok"):
        print("\n✓ NVIDIA répond — clé valide, quota disponible.")
        return 0

    models = result.get("models_tested") or []
    for item in models:
        err = str(item.get("error", "")).lower()
        if item.get("quota_or_auth") or any(
            token in err for token in ("401", "402", "403", "429", "quota", "crédit", "credit", "invalid")
        ):
            print("\n✗ Quota épuisé ou clé invalide — consultez https://build.nvidia.com → Usage / API keys.")
            print("  La plateforme continue avec les règles métier (sans IA).")
            return 2

    print("\n✗ NVIDIA indisponible (réseau ou modèle) — vérifiez NVIDIA_CLASSIFIER_MODEL / FALLBACK_MODELS.")
    return 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
