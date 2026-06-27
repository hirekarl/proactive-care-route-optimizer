#!/usr/bin/env python
"""Django management entrypoint."""

import os
import sys
from pathlib import Path


def main() -> None:
    # Put src/ on the path so Django can find the core and api packages.
    sys.path.insert(0, str(Path(__file__).parent / "src"))

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Make sure it's installed and available on your "
            "PYTHONPATH environment variable. Did you forget to run 'uv sync'?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
