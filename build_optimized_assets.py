#!/usr/bin/env python3
"""
Build optimized static assets for subacute web deployment without altering
the master `data/quiz_data.js` or `images/**/*.png` source files:
  1. Converts all referenced PNG images to `images_webp/<relpath>.webp` (q=82, method=6)
  2. Splits `data/quiz_data.js` into slimmed per-subject JSON files under `data/subjects/`
     with content-hashed WebP image URLs (`images_webp/...webp?v=<8-char-md5>`)
  3. Generates `data/subjects_manifest.js` with subject metadata, hashes, and ordered IDs
"""

from __future__ import annotations

import argparse
import copy
import gzip
import hashlib
import json
import os
import re
import sys
from collections import defaultdict
from pathlib import Path

from PIL import Image

ROOT_DIR = Path(__file__).resolve().parent
QUIZ_DATA_JS = ROOT_DIR / "data" / "quiz_data.js"
IMAGES_DIR = ROOT_DIR / "images"
IMAGES_WEBP_DIR = ROOT_DIR / "images_webp"
SUBJECTS_DIR = ROOT_DIR / "data" / "subjects"
MANIFEST_JS = ROOT_DIR / "data" / "subjects_manifest.js"

SUBJECT_SLUGS = {
    "진단검사의학과": "lab_med",
    "내과": "internal_med",
    "외과": "surgery",
    "산부인과": "obgyn",
    "소아청소년과": "pediatrics",
    "신경과": "neurology",
    "정신건강의학과": "psychiatry",
    "정형외과": "orthopedics",
    "영상의학과": "radiology",
}

IMG_REF_PATTERN = re.compile(r'(?<![/\w])images/[^"\'\\)\s?]+\.png(?:\?[^"\'\\)\s]+)?')


def md5_8(path: Path) -> str:
    h = hashlib.md5()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()[:8]


def md5_8_bytes(data: bytes) -> str:
    return hashlib.md5(data).hexdigest()[:8]


def load_master_questions() -> list[dict]:
    raw = QUIZ_DATA_JS.read_text(encoding="utf-8")
    i1 = raw.index("[")
    i2 = raw.rindex("]") + 1
    data = json.loads(raw[i1:i2])
    if not isinstance(data, list) or not data:
        raise RuntimeError(f"Expected non-empty array in {QUIZ_DATA_JS}")
    return data


def collect_referenced_pngs(data: list[dict]) -> set[str]:
    refs: set[str] = set()

    def scan(obj) -> None:
        if isinstance(obj, dict):
            for v in obj.values():
                scan(v)
        elif isinstance(obj, list):
            for v in obj:
                scan(v)
        elif isinstance(obj, str):
            for m in IMG_REF_PATTERN.findall(obj):
                rel = m.split("?", 1)[0]
                refs.add(rel)

    scan(data)
    return refs


def convert_image_to_webp(src_png: Path, dst_webp: Path, quality: int = 82) -> None:
    dst_webp.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src_png) as img:
        has_alpha = img.mode in ("RGBA", "LA") or (
            img.mode == "P" and "transparency" in img.info
        )
        converted = img.convert("RGBA" if has_alpha else "RGB")
        converted.save(dst_webp, format="WEBP", quality=quality, method=6)


def build_webp_images(referenced_pngs: set[str], force: bool = False) -> tuple[dict[str, str], dict]:
    url_map: dict[str, str] = {}
    expected_webp_paths: set[Path] = set()
    total_png_bytes = 0
    total_webp_bytes = 0
    converted_count = 0
    skipped_count = 0

    for rel_png in sorted(referenced_pngs):
        src_png = ROOT_DIR / rel_png
        if not src_png.exists():
            raise FileNotFoundError(f"Referenced image not found: {src_png}")

        rel_under_images = Path(rel_png).relative_to("images")
        dst_webp = IMAGES_WEBP_DIR / rel_under_images.with_suffix(".webp")
        expected_webp_paths.add(dst_webp.resolve())

        need_convert = force or not dst_webp.exists()
        if not need_convert:
            need_convert = dst_webp.stat().st_mtime < src_png.stat().st_mtime

        if need_convert:
            convert_image_to_webp(src_png, dst_webp)
            converted_count += 1
        else:
            skipped_count += 1

        # Verify valid RIFF....WEBP header
        with dst_webp.open("rb") as wf:
            hdr = wf.read(12)
        if not (hdr.startswith(b"RIFF") and hdr[8:12] == b"WEBP"):
            raise RuntimeError(f"Invalid WebP file generated: {dst_webp}")

        total_png_bytes += src_png.stat().st_size
        total_webp_bytes += dst_webp.stat().st_size

        webp_rel = dst_webp.relative_to(ROOT_DIR).as_posix()
        url_map[rel_png] = f"{webp_rel}?v={md5_8(dst_webp)}"

    # Prune any stale WebP files under images_webp/ not referenced anymore
    removed_stale = 0
    if IMAGES_WEBP_DIR.exists():
        for p in sorted(IMAGES_WEBP_DIR.rglob("*.webp")):
            if p.resolve() not in expected_webp_paths:
                p.unlink()
                removed_stale += 1

    stats = {
        "referenced_count": len(referenced_pngs),
        "converted_count": converted_count,
        "skipped_count": skipped_count,
        "removed_stale": removed_stale,
        "png_bytes": total_png_bytes,
        "webp_bytes": total_webp_bytes,
    }
    return url_map, stats


def rewrite_image_urls_in_value(val, url_map: dict[str, str]):
    if isinstance(val, dict):
        return {k: rewrite_image_urls_in_value(v, url_map) for k, v in val.items()}
    if isinstance(val, list):
        return [rewrite_image_urls_in_value(v, url_map) for v in val]
    if isinstance(val, str) and "images/" in val:
        def _repl(match: re.Match[str]) -> str:
            base = match.group(0).split("?", 1)[0]
            return url_map.get(base, match.group(0))
        return IMG_REF_PATTERN.sub(_repl, val)
    return val


def slim_question(orig_q: dict, url_map: dict[str, str]) -> dict:
    q = copy.deepcopy(orig_q)
    exp = q.get("explanation")

    # Promote / deduplicate option_explanations (app.js prefers top-level q.option_explanations)
    top_opt_exp = q.get("option_explanations")
    if isinstance(exp, dict) and "option_explanations" in exp:
        exp_opt_exp = exp.get("option_explanations")
        if top_opt_exp and len(top_opt_exp) > 0:
            del exp["option_explanations"]
        elif exp_opt_exp and len(exp_opt_exp) > 0:
            q["option_explanations"] = exp.pop("option_explanations")
        else:
            del exp["option_explanations"]

    if isinstance(exp, dict):
        exp.pop("theme_title", None)
        exp.pop("subspecialty", None)

    for unused_key in ("freq_years", "internal_index", "source_pdf", "is_frequent"):
        q.pop(unused_key, None)

    if q.get("stem") and "question" in q:
        q.pop("question", None)

    return rewrite_image_urls_in_value(q, url_map)


def build_subject_bundles(data: list[dict], url_map: dict[str, str]) -> dict:
    SUBJECTS_DIR.mkdir(parents=True, exist_ok=True)
    by_subject: dict[str, list[dict]] = defaultdict(list)
    for orig_q in data:
        sub = orig_q["subject"]
        if sub not in SUBJECT_SLUGS:
            raise KeyError(f"Missing slug mapping for subject: {sub}")
        by_subject[sub].append(slim_question(orig_q, url_map))

    # Preserve canonical subject order defined in SUBJECT_SLUGS (or encounter order for any extras)
    ordered_subjects = [s for s in SUBJECT_SLUGS if s in by_subject]
    for s in by_subject:
        if s not in ordered_subjects:
            ordered_subjects.append(s)

    subjects_meta: dict[str, dict] = {}
    hash_concat_parts: list[str] = []
    total_raw_bytes = 0
    total_gz_bytes = 0
    expected_json_files: set[Path] = set()

    per_subject_stats = []
    for sub in ordered_subjects:
        slug = SUBJECT_SLUGS[sub]
        qs = by_subject[sub]
        out_path = SUBJECTS_DIR / f"{slug}.json"
        expected_json_files.add(out_path.resolve())

        payload = json.dumps(qs, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        out_path.write_bytes(payload)

        file_hash = md5_8_bytes(payload)
        gz_bytes = len(gzip.compress(payload, compresslevel=9))
        total_raw_bytes += len(payload)
        total_gz_bytes += gz_bytes
        hash_concat_parts.append(f"{slug}:{file_hash}")

        subjects_meta[sub] = {
            "slug": slug,
            "file": f"data/subjects/{slug}.json",
            "hash": file_hash,
            "count": len(qs),
            "ids": [q["id"] for q in qs],
        }
        per_subject_stats.append((sub, slug, len(qs), len(payload), gz_bytes, file_hash))

    # Remove stale subject JSONs if any
    for p in SUBJECTS_DIR.glob("*.json"):
        if p.resolve() not in expected_json_files:
            p.unlink()

    combined_version = md5_8_bytes("|".join(hash_concat_parts).encode("utf-8"))
    manifest = {
        "version": combined_version,
        "totalCount": len(data),
        "subjects": subjects_meta,
    }
    manifest_js_bytes = (
        "window.SUBJECTS_MANIFEST="
        + json.dumps(manifest, ensure_ascii=False, separators=(",", ":"))
        + ";\n"
    ).encode("utf-8")
    MANIFEST_JS.write_bytes(manifest_js_bytes)
    manifest_gz_bytes = len(gzip.compress(manifest_js_bytes, compresslevel=9))

    return {
        "version": combined_version,
        "total_count": len(data),
        "per_subject": per_subject_stats,
        "total_raw_bytes": total_raw_bytes,
        "total_gz_bytes": total_gz_bytes,
        "manifest_raw_bytes": len(manifest_js_bytes),
        "manifest_gz_bytes": manifest_gz_bytes,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Build WebP images & split per-subject quiz JSON bundles.")
    parser.add_argument("--force", action="store_true", help="Force re-encoding of all WebP images.")
    args = parser.parse_args()

    data = load_master_questions()
    refs = collect_referenced_pngs(data)
    url_map, img_stats = build_webp_images(refs, force=args.force)
    bundle_stats = build_subject_bundles(data, url_map)

    master_raw = QUIZ_DATA_JS.stat().st_size
    master_gz = len(gzip.compress(QUIZ_DATA_JS.read_bytes(), compresslevel=9))

    png_mb = img_stats["png_bytes"] / 1048576
    webp_mb = img_stats["webp_bytes"] / 1048576
    img_reduction = (1 - img_stats["webp_bytes"] / max(img_stats["png_bytes"], 1)) * 100

    print("=== WebP Image Conversion Summary ===")
    print(
        f"Referenced PNGs: {img_stats['referenced_count']} "
        f"(converted: {img_stats['converted_count']}, cached: {img_stats['skipped_count']}, "
        f"stale removed: {img_stats['removed_stale']})"
    )
    print(f"Referenced PNG size : {png_mb:.2f} MB")
    print(f"Generated WebP size : {webp_mb:.2f} MB (-{img_reduction:.1f}%)")

    # Compare against whole images/ folder including orphans
    all_png_bytes = sum(p.stat().st_size for p in IMAGES_DIR.rglob("*.png"))
    print(f"Total images/ (incl. orphans): {all_png_bytes/1048576:.2f} MB -> WebP: {webp_mb:.2f} MB (-{(1 - img_stats['webp_bytes']/max(all_png_bytes,1))*100:.1f}%)")

    print("\n=== Per-Subject Bundle Summary ===")
    print(f"Master quiz_data.js : {master_raw/1048576:.2f} MB raw | {master_gz/1048576:.2f} MB gzip")
    print(
        f"Manifest (v={bundle_stats['version']}) : "
        f"{bundle_stats['manifest_raw_bytes']/1024:.1f} KB raw | "
        f"{bundle_stats['manifest_gz_bytes']/1024:.1f} KB gzip"
    )
    for sub, slug, cnt, raw_b, gz_b, fhash in bundle_stats["per_subject"]:
        print(f"  {sub:8s} ({slug:12s}, {cnt:3d}q, #{fhash}): {raw_b/1048576:.2f} MB raw | {gz_b/1024:.1f} KB gzip")
    print(
        f"Total split JSONs ({bundle_stats['total_count']}q) : "
        f"{bundle_stats['total_raw_bytes']/1048576:.2f} MB raw | "
        f"{bundle_stats['total_gz_bytes']/1048576:.2f} MB gzip"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
