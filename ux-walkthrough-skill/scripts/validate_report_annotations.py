#!/usr/bin/env python3
"""Validate annotated evidence for confirmed URL/screenshot issues."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

SOURCES_REQUIRE_ANNOTATIONS = {"url", "screenshot"}


def _text(value: object) -> str:
    return value.strip() if isinstance(value, str) else ""


def _bbox(entry: dict) -> list[int] | None:
    raw = entry.get("bbox")
    if not isinstance(raw, list) or len(raw) != 4:
        return None
    try:
        values = [int(value) for value in raw]
    except (TypeError, ValueError):
        return None
    x, y, width, height = values
    return values if x >= 0 and y >= 0 and width > 0 and height > 0 else None


def _resolve_path(entry: dict, base_dir: Path | None) -> Path | None:
    raw = _text(entry.get("path"))
    if not raw:
        return None
    path = Path(raw).expanduser()
    if not path.is_absolute() and base_dir is not None:
        path = (base_dir / path).resolve()
    return path


def validate_report(report: dict, *, base_dir: Path | None = None) -> dict:
    source = _text(report.get("source")).lower()
    raw_issues = report.get("issues", [])
    errors: list[str] = []
    if not isinstance(raw_issues, list):
        return {"ok": False, "errors": ["issues 必须是数组"], "issue_count": 0, "source": source}

    for index, issue in enumerate(raw_issues):
        if not isinstance(issue, dict):
            errors.append(f"issues[{index}] 必须是对象")
            continue
        issue_id = _text(issue.get("id")) or str(index + 1)
        images = issue.get("images", [])
        if not isinstance(images, list):
            errors.append(f"issue {issue_id}.images 必须是数组")
            continue

        if source not in SOURCES_REQUIRE_ANNOTATIONS:
            continue
        if not images:
            errors.append(f"issue {issue_id} 缺少标注图")
            continue

        valid_annotation = False
        for image in images:
            if not isinstance(image, dict) or image.get("annotated") is not True:
                continue
            path = _resolve_path(image, base_dir)
            if path is None or not path.is_file():
                continue
            if _bbox(image) is None:
                continue
            valid_annotation = True
            break
        if not valid_annotation:
            errors.append(f"issue {issue_id} 需要 annotated=true、存在的图片路径和有效 bbox [x,y,w,h]")

    return {
        "errors": errors,
        "issue_count": len(raw_issues),
        "ok": not errors,
        "required": source in SOURCES_REQUIRE_ANNOTATIONS,
        "source": source,
    }


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="校验 ux-walkthrough v7 标注门禁")
    parser.add_argument("--report-json", required=True)
    parser.add_argument("--json", action="store_true")
    return parser


def main() -> int:
    args = _build_parser().parse_args()
    path = Path(args.report_json).expanduser().resolve()
    try:
        report = json.loads(path.read_text(encoding="utf-8"))
        result = validate_report(report, base_dir=path.parent) if isinstance(report, dict) else {"ok": False, "errors": ["根节点必须是对象"]}
    except (OSError, json.JSONDecodeError) as exc:
        result = {"ok": False, "errors": [f"无法读取 report.json：{exc}"]}
    result["report_json"] = str(path)
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    elif result.get("ok"):
        print("OK: annotation gate passed")
    else:
        print("\n".join(result.get("errors", [])))
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
