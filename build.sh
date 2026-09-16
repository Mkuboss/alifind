#!/usr/bin/env bash
# build.sh — Runtutan build SEO AliFind. Jalankan sebelum commit/deploy.
set -e
cd "$(dirname "$0")"
python3 build_prerender.py
python3 build_category_pages.py
python3 build_product_pages.py
python3 build_sitemap.py
echo "BUILD SEO SELESAI ✔"
