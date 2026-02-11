#!/usr/bin/env python3
"""
inline_assets.py

Create a single-file HTML build by inlining CSS & JS referenced from an HTML file
and embedding local assets (images, fonts, audio) used by CSS or tags as data URIs.

Usage:
    python scripts/inline_assets.py index.html -o dist/single.html

Features:
- Inlines <link rel="stylesheet"> tags as <style> (preserves media attribute)
- Inlines <script src=> tags as <script> (preserves type, defer/async where safe)
- Replaces tag `src` (img, audio, video, source) with data URIs
- Rewrites url(...) references inside CSS to data URIs (fonts, images)
- Fetches remote assets when a URL starts with http(s)
- Uses BeautifulSoup when available for robust parsing, otherwise falls back to regex

Note: This script favors portability and simplicity over perfect handling of every edge-case
in complex build systems. Test the produced output before deploying.
"""

from __future__ import annotations
import argparse
import base64
import mimetypes
import os
import re
import sys
from pathlib import Path
from typing import Optional

try:
    from bs4 import BeautifulSoup, Comment
    BS4_AVAILABLE = True
except Exception:
    BS4_AVAILABLE = False

try:
    from urllib.request import urlopen, Request
    from urllib.error import URLError, HTTPError
except Exception:
    urlopen = None


def read_bytes_from_source(src: str, base_dir: Path) -> Optional[bytes]:
    """Return bytes for a local path or an HTTP(S) URL. Returns None on error."""
    src = src.strip()
    if src.startswith("data:"):
        # Already a data URI
        return None
    if src.startswith("http://") or src.startswith("https://"):
        try:
            req = Request(src, headers={"User-Agent": "inline-assets/1.0"})
            with urlopen(req) as resp:
                return resp.read()
        except Exception as e:
            print(f"[WARN] Failed to fetch remote asset {src}: {e}")
            return None
    # Local file
    p = (base_dir / src).resolve()
    if not p.exists():
        print(f"[WARN] Local asset not found: {p}")
        return None
    try:
        return p.read_bytes()
    except Exception as e:
        print(f"[WARN] Failed to read {p}: {e}")
        return None


def as_data_uri(src: str, base_dir: Path) -> Optional[str]:
    """Return a data URI for the given src (local path or http URL)."""
    if not src or src.strip().startswith("data:"):
        return src
    raw = read_bytes_from_source(src, base_dir)
    if raw is None:
        return None
    mime, _ = mimetypes.guess_type(src)
    if not mime:
        # fallback binary
        mime = "application/octet-stream"
    b64 = base64.b64encode(raw).decode("ascii")
    return f"data:{mime};base64,{b64}"


def inline_css_urls(css_text: str, css_dir: Path, base_dir: Path) -> str:
    """Find url(...) references in CSS and replace with data URIs when possible."""

    def repl(match):
        raw = match.group(1).strip().strip('"').strip("'")
        if raw.startswith("data:"):
            return f"url({raw})"
        # If it's an absolute http(s) URL, fetch and inline directly
        if raw.startswith("http://") or raw.startswith("https://"):
            data = as_data_uri(raw, base_dir)
            if data:
                return f"url('{data}')"
            else:
                print(f"[WARN] Could not inline remote CSS url({raw})")
                return f"url({raw})"
        # Resolve relative to CSS file directory
        candidate = raw
        # If path is absolute (starts with /), make it relative to base_dir
        if candidate.startswith("/"):
            rel = candidate.lstrip("/")
        else:
            rel = str((css_dir / candidate).as_posix())
            # Try to make path relative to base_dir
            p = Path(rel)
            try:
                rel = str(p.relative_to(base_dir))
            except Exception:
                rel = str(p)
        data = as_data_uri(rel, base_dir)
        if data:
            return f"url('{data}')"
        else:
            print(f"[WARN] Could not inline CSS url({raw})")
            return f"url({raw})"

    return re.sub(r"url\(([^)]+)\)", repl, css_text, flags=re.IGNORECASE)


def inline_html(input_path: Path, output_path: Path, base_dir: Path):
    html_text = input_path.read_text(encoding="utf-8")
    print(f"[INFO] Using BeautifulSoup: {BS4_AVAILABLE}")

    if BS4_AVAILABLE:
        soup = BeautifulSoup(html_text, "html.parser")

        # Inline stylesheets
        for link in soup.find_all("link", rel=lambda x: x and "stylesheet" in x.lower()):
            href = link.get("href")
            media = link.get("media")
            if not href:
                continue
            print(f"[INFO] Inlining CSS: {href}")
            css_bytes = None
            if href.startswith("http://") or href.startswith("https://"):
                css_bytes = read_bytes_from_source(href, base_dir)
            else:
                css_path = (base_dir / href).resolve()
                if css_path.exists():
                    css_bytes = css_path.read_bytes()
                else:
                    print(f"[WARN] CSS file not found: {css_path}")
            if css_bytes is None:
                continue
            css_text = css_bytes.decode("utf-8")
            css_dir = (base_dir / href).parent
            css_text = inline_css_urls(css_text, css_dir, base_dir)
            style_tag = soup.new_tag("style")
            if media:
                style_tag.attrs["media"] = media
            style_tag.string = css_text
            link.replace_with(style_tag)

        # Inline scripts
        for script in soup.find_all("script", src=True):
            src = script.get("src")
            print(f"[INFO] Inlining JS: {src}")
            js_bytes = None
            if src.startswith("http://") or src.startswith("https://"):
                js_bytes = read_bytes_from_source(src, base_dir)
            else:
                js_path = (base_dir / src).resolve()
                if js_path.exists():
                    js_bytes = js_path.read_bytes()
                else:
                    print(f"[WARN] JS file not found: {js_path}")
            if js_bytes is None:
                continue
            js_text = js_bytes.decode("utf-8")
            # Create inline script; preserve some attributes
            new_script = soup.new_tag("script")
            if script.get("type"):
                new_script.attrs["type"] = script.get("type")
            if script.get("defer"):
                # Inlined scripts execute immediately; defer doesn't apply the same way
                print("[INFO] Dropping defer attribute for inlined script")
            if script.get("async"):
                new_script.attrs["async"] = True
            new_script.string = js_text
            script.replace_with(new_script)

        # Inline src attributes on img, audio, video, source, track
        for tag in soup.find_all(src=True):
            src = tag.get("src")
            if not src:
                continue
            if src.startswith("data:"):
                continue
            print(f"[INFO] Inlining tag src: {src}")
            data = as_data_uri(src, base_dir)
            if data:
                tag["src"] = data

        # Handle <link rel="icon"> etc by inlining href
        for link in soup.find_all("link"):
            if link.get("href") and link.get("href").startswith("data:"):
                continue
            rel = link.get("rel")
            href = link.get("href")
            if not href:
                continue
            if any(r in ("icon", "shortcut icon", "apple-touch-icon") for r in (rel or [])):
                print(f"[INFO] Inlining link asset: {href}")
                data = as_data_uri(href, base_dir)
                if data:
                    link["href"] = data

        out = str(soup)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(out, encoding="utf-8")
        print(f"[SUCCESS] Wrote single-file HTML to {output_path}")
    else:
        # Fallback - simple regex based inlining
        print("[WARN] BeautifulSoup not available. Using limited regex fallback.")
        txt = html_text
        # Inline CSS links
        for m in re.finditer(r'<link[^>]+rel=["\']stylesheet["\'][^>]*>', txt, flags=re.IGNORECASE):
            tag = m.group(0)
            href_m = re.search(r'href=["\']([^"\']+)["\']', tag)
            media_m = re.search(r'media=["\']([^"\']+)["\']', tag)
            if not href_m:
                continue
            href = href_m.group(1)
            media = media_m.group(1) if media_m else None
            print(f"[INFO] Inlining CSS: {href}")
            css_bytes = None
            if href.startswith("http://") or href.startswith("https://"):
                css_bytes = read_bytes_from_source(href, base_dir)
            else:
                css_path = (base_dir / href).resolve()
                if css_path.exists():
                    css_bytes = css_path.read_bytes()
            if css_bytes is None:
                continue
            css_text = css_bytes.decode("utf-8")
            css_dir = (base_dir / href).parent
            css_text = inline_css_urls(css_text, css_dir, base_dir)
            style_tag = f"<style{(' media="' + media + '"') if media else ''}>\n{css_text}\n</style>"
            txt = txt.replace(tag, style_tag)
        # Inline scripts
        for m in re.finditer(r'<script[^>]+src=["\']([^"\']+)["\'][^>]*></script>', txt, flags=re.IGNORECASE):
            full = m.group(0)
            src = m.group(1)
            print(f"[INFO] Inlining JS: {src}")
            js_bytes = None
            if src.startswith("http://") or src.startswith("https://"):
                js_bytes = read_bytes_from_source(src, base_dir)
            else:
                js_path = (base_dir / src).resolve()
                if js_path.exists():
                    js_bytes = js_path.read_bytes()
            if js_bytes is None:
                continue
            js_text = js_bytes.decode("utf-8")
            script_tag = f"<script>\n{js_text}\n</script>"
            txt = txt.replace(full, script_tag)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(txt, encoding="utf-8")
        print(f"[SUCCESS] Wrote single-file HTML to {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Inline assets into a single HTML file for portable deployment")
    parser.add_argument("input", help="Input HTML file (e.g., index.html)")
    parser.add_argument("-o", "--output", default="dist/single.html", help="Output single HTML file")
    parser.add_argument("--base-dir", default=".", help="Base directory to resolve relative assets from")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"[ERROR] Input file not found: {input_path}")
        sys.exit(1)
    output_path = Path(args.output)
    base_dir = Path(args.base_dir).resolve()

    inline_html(input_path, output_path, base_dir)


if __name__ == "__main__":
    main()
