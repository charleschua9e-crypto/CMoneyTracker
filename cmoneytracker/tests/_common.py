"""Jalur & server bersama untuk semua tes (dipakai lewat: from _common import ...)."""
import os, subprocess, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist')            # hasil `npm run build` — yang diuji
SP = os.path.join(ROOT, '.test-out') + os.sep  # keluaran tes (screenshot, unduhan)
OUT = os.path.join(SP, 'shots') + os.sep
os.makedirs(OUT, exist_ok=True)


def serve(port):
    """Server statis untuk dist/, dimatikan dengan srv.terminate()."""
    srv = subprocess.Popen(['python3', '-m', 'http.server', str(port)], cwd=DIST,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    return srv
