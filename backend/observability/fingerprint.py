"""Content-based error grouping key (not timestamp-based).

Identical failures share a fingerprint; different failures separate.
"""

import hashlib
import re
import traceback


def fingerprint_exc(exc: BaseException) -> str:
    tb = traceback.extract_tb(exc.__traceback__)
    frame = f"{tb[-1].filename}:{tb[-1].name}" if tb else ""  # deepest = raising frame
    norm = re.sub(r"\d+", "N", str(exc))  # normalize ids/counts
    key = f"{type(exc).__name__}|{norm}|{frame}"
    return hashlib.sha256(key.encode()).hexdigest()[:32]
