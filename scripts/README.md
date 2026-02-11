# Inline Assets Tool

Use `inline_assets.py` to produce a single, self-contained HTML file by inlining CSS/JS and embedding local assets as data URIs.

Quick usage:

```bash
# Produce dist/single.html from index.html
python3 scripts/inline_assets.py index.html -o dist/single.html

# Specify a base dir if necessary
python3 scripts/inline_assets.py index.html -o dist/single.html --base-dir .
```

Notes:
- The script prefers BeautifulSoup when available; install with `pip install beautifulsoup4` for more robust parsing.
- Remote assets (http/https) are fetched and inlined when possible.
- Test the produced file in a browser to confirm everything works.
