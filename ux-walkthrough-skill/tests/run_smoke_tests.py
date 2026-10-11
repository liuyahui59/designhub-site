#!/usr/bin/env python3

from __future__ import annotations

import json
import importlib.util
import subprocess
import sys
import tempfile
import types
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
FIXTURES = ROOT / "tests" / "fixtures"
PYTHON = sys.executable or "python3"


def run_json(command: list[str]) -> dict:
    completed = subprocess.run(command, capture_output=True, text=True, check=False)
    if completed.returncode != 0:
        raise AssertionError(f"命令执行失败: {' '.join(command)}\nSTDERR:\n{completed.stderr}\nSTDOUT:\n{completed.stdout}")
    try:
        return json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        raise AssertionError(f"命令未返回 JSON: {' '.join(command)}\n{completed.stdout}") from exc


def run_json_failure(command: list[str]) -> dict:
    completed = subprocess.run(command, capture_output=True, text=True, check=False)
    if completed.returncode == 0:
        raise AssertionError(f"命令应失败但成功: {' '.join(command)}\n{completed.stdout}")
    try:
        return json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        raise AssertionError(f"失败命令未返回 JSON: {' '.join(command)}\n{completed.stdout}") from exc


def coverage_entry(target_type: str, target_id: str, **result: object) -> dict:
    return {"target_type": target_type, "results": [{"target_id": target_id, **result}]}


def test_monorepo_gate() -> None:
    repo = FIXTURES / "monorepo"

    root_detect = run_json(
        [
            PYTHON,
            str(SCRIPTS / "detect_input_mode.py"),
            "--repo-path",
            str(repo),
            "--json",
        ]
    )
    assert root_detect["status"] == "continue"
    assert root_detect["next_action"] == "run_scan_pages"

    precheck = run_json(
        [
            PYTHON,
            str(SCRIPTS / "precheck_walkthrough.py"),
            "--repo-path",
            str(repo),
            "--json",
        ]
    )
    assert precheck["status"] == "continue"
    assert precheck["mode"] == "code"
    assert precheck["scan"]["summary"]["total_pages"] >= 1
    assert precheck["next_action"] in {
        "continue_walkthrough",
        "try_url_walkthrough",
        "start_dev_server_then_url_walkthrough",
        "fallback_code_walkthrough",
    }


def test_url_login_gate() -> None:
    result = run_json(
        [
            PYTHON,
            str(SCRIPTS / "precheck_walkthrough.py"),
            "--url",
            "https://example.com/app",
            "--current-url",
            "https://example.com/login",
            "--page-title",
            "登录",
            "--page-reachable",
            "true",
            "--login-required",
            "true",
            "--has-screenshot-evidence",
            "false",
            "--json",
        ]
    )
    assert result["status"] == "failed"
    assert result["next_action"] == "explain_failure"
    assert result["failure_preset"] == "url_login_required"


def test_annotate_script() -> None:
    from PIL import Image

    with tempfile.TemporaryDirectory(prefix="uxw-annotate-test-") as tmp_dir:
        raw_path = Path(tmp_dir) / "raw.png"
        output_path = Path(tmp_dir) / "annotated.png"
        Image.new("RGB", (640, 360), "#FFFFFF").save(raw_path)

        result = run_json(
            [
                PYTHON,
                str(SCRIPTS / "annotate.py"),
                "--input",
                str(raw_path),
                "--output",
                str(output_path),
                "--box",
                "80,60,220,90",
                "--label",
                "主按钮说明不清晰",
                "--json",
            ]
        )
        assert result["status"] == "generated"
        assert output_path.is_file()
        assert "font_source" in result


def _load_annotate_module() -> types.ModuleType:
    module_path = SCRIPTS / "annotate.py"
    scripts_path = str(SCRIPTS)
    if scripts_path not in sys.path:
        sys.path.insert(0, scripts_path)
    spec = importlib.util.spec_from_file_location("uxw_annotate_test", module_path)
    if spec is None or spec.loader is None:
        raise AssertionError("无法加载 annotate.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_annotate_fallback_warning() -> None:
    from PIL import Image

    annotate_module = _load_annotate_module()

    with tempfile.TemporaryDirectory(prefix="uxw-annotate-warning-") as tmp_dir:
        raw_path = Path(tmp_dir) / "raw.png"
        output_path = Path(tmp_dir) / "annotated.png"
        Image.new("RGB", (320, 180), "#FFFFFF").save(raw_path)

        original_candidates = annotate_module.FONT_CANDIDATES
        try:
            annotate_module.FONT_CANDIDATES = []
            args = annotate_module._build_parser().parse_args(
                [
                    "--input",
                    str(raw_path),
                    "--output",
                    str(output_path),
                    "--box",
                    "20,20,120,50",
                    "--label",
                    "中文告警测试",
                ]
            )
            result = annotate_module.build_result(args)
        finally:
            annotate_module.FONT_CANDIDATES = original_candidates

        assert result["status"] == "generated"
        assert result["font_source"] == "PIL_default"
        assert result["warnings"]


def test_docx_generation() -> None:
    with tempfile.TemporaryDirectory(prefix="uxw-docx-test-") as tmp_dir:
        output_path = Path(tmp_dir) / "report.docx"
        result = run_json(
            [
                PYTHON,
                str(SCRIPTS / "generate_docx.py"),
                "--report-json",
                str(FIXTURES / "report" / "minimal-report.json"),
                "--output",
                str(output_path),
                "--overwrite",
                "--json",
            ]
        )
        assert result["status"] == "generated"
        assert output_path.is_file()
        with zipfile.ZipFile(output_path) as archive:
            document_xml = archive.read("word/document.xml").decode("utf-8")
        assert "页面清单完整性" in document_xml
        assert "BASIS-01" in document_xml
        assert "关键任务与成功标准" in document_xml
        assert "创建订单并确认结果" in document_xml
        assert "失败后保留输入并可重试" in document_xml
        assert "主要 PC 环境" in document_xml
        assert "跨页面一致性" in document_xml


def test_review_brief_required() -> None:
    with tempfile.TemporaryDirectory(prefix="uxw-review-brief-test-") as tmp_dir:
        source = json.loads((FIXTURES / "report" / "minimal-report.json").read_text(encoding="utf-8"))
        source.pop("review_brief")
        report_path = Path(tmp_dir) / "missing-review-brief.json"
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        result = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("review_brief" in error for error in result["errors"])


def test_task_contract_gate() -> None:
    with tempfile.TemporaryDirectory(prefix="uxw-task-contract-test-") as tmp_dir:
        fixture = json.loads((FIXTURES / "report" / "minimal-report.json").read_text(encoding="utf-8"))
        report_path = Path(tmp_dir) / "task-contract.json"

        report_path.write_text(json.dumps(fixture, ensure_ascii=False), encoding="utf-8")
        accepted = run_json(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert accepted["brief_task_count"] == 1
        assert accepted["mapped_task_count"] == 1

        source = json.loads(json.dumps(fixture, ensure_ascii=False))
        source["review_brief"]["critical_tasks"] = ["进入下单页 → 填写并提交 → 确认结果"]
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        string_tasks = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("不能使用字符串" in error for error in string_tasks["errors"])

        source = json.loads(json.dumps(fixture, ensure_ascii=False))
        source["review_brief"]["critical_tasks"][0].pop("success_criteria")
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        missing_criteria = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("TASK-01.success_criteria 必须是非空字符串数组" in error for error in missing_criteria["errors"])

        for field in ("primary_user", "start_condition", "intended_outcome"):
            source = json.loads(json.dumps(fixture, ensure_ascii=False))
            source["review_brief"]["critical_tasks"][0].pop(field)
            report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
            missing_field = run_json_failure(
                [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
            )
            assert any(f"缺少 {field}" in error for error in missing_field["errors"])

        source = json.loads(json.dumps(fixture, ensure_ascii=False))
        source["review_brief"]["success_criteria"] = ["不应保留的全局标准"]
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        global_criteria = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("review_brief.success_criteria 已废弃" in error for error in global_criteria["errors"])

        source = json.loads(json.dumps(fixture, ensure_ascii=False))
        source["review_brief"]["critical_tasks"].append(
            {
                "id": "TASK-02",
                "name": "查看订单详情并返回",
                "primary_user": "内部运营人员",
                "start_condition": "从订单列表打开一条订单",
                "intended_outcome": "确认订单详情并返回原列表上下文",
                "success_criteria": ["关键信息可确认", "返回后保留筛选和浏览位置"]
            }
        )
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        missing_runtime = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("scope_inventory.tasks 缺少用户确认任务：TASK-02" in error for error in missing_runtime["errors"])

        source = json.loads(json.dumps(fixture, ensure_ascii=False))
        extra_task = json.loads(json.dumps(source["scope_inventory"]["tasks"][0], ensure_ascii=False))
        extra_task["id"] = "TASK-02"
        extra_task["name"] = "未确认任务"
        source["scope_inventory"]["tasks"].append(extra_task)
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        unexpected_runtime = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("含未在 review_brief 确认的任务：TASK-02" in error for error in unexpected_runtime["errors"])

        source = json.loads(json.dumps(fixture, ensure_ascii=False))
        source["scope_inventory"]["tasks"][0]["name"] = "被改名的任务"
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        renamed_runtime = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("task TASK-01 名称与 review_brief 不一致" in error for error in renamed_runtime["errors"])


def test_scope_inventory_completeness_gate() -> None:
    with tempfile.TemporaryDirectory(prefix="uxw-scope-inventory-test-") as tmp_dir:
        source = json.loads((FIXTURES / "report" / "minimal-report.json").read_text(encoding="utf-8"))
        report_path = Path(tmp_dir) / "scope-inventory.json"
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        accepted = run_json(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert accepted["inventory_completeness"] == "confirmed"
        assert accepted["inventory_basis_count"] == 2
        assert accepted["excluded_surface_count"] == 0

        inventory = source["scope_inventory"]
        basis = inventory.pop("inventory_basis")
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        missing_basis = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("inventory_basis 必须是非空数组" in error for error in missing_basis["errors"])

        inventory["inventory_basis"] = basis
        inventory["inventory_completeness"] = "partial"
        inventory["completeness_reason"] = "当前无法确认是否存在仅特定权限可见的下单页面"
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        false_complete = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any(
            "report_status=complete" in error and "页面清单" in error
            for error in false_complete["errors"]
        )

        source["report_status"] = "partial"
        source["title"] = "示例系统阶段性体验走查报告"
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        partial = run_json(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert partial["ok"] is True
        assert partial["inventory_completeness"] == "partial"

        inventory["excluded_surfaces"] = [
            {
                "id": "PAGE-01",
                "name": "下单页",
                "reason_code": "outside_user_scope",
                "reason": "错误地排除范围内页面"
            }
        ]
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        overlapping_scope = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("同时列为范围内与范围外：PAGE-01" in error for error in overlapping_scope["errors"])


def test_cross_page_consistency_gate() -> None:
    with tempfile.TemporaryDirectory(prefix="uxw-cross-page-test-") as tmp_dir:
        fixture = json.loads((FIXTURES / "report" / "minimal-report.json").read_text(encoding="utf-8"))
        report_path = Path(tmp_dir) / "cross-page.json"

        report_path.write_text(json.dumps(fixture, ensure_ascii=False), encoding="utf-8")
        single_page = run_json(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert single_page["cross_page_consistency_status"] == "not_applicable"

        source = json.loads(json.dumps(fixture, ensure_ascii=False))
        source.pop("cross_page_consistency")
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        missing_review = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("缺少 cross_page_consistency 对象" in error for error in missing_review["errors"])

        source = json.loads(json.dumps(fixture, ensure_ascii=False))
        source["cross_page_consistency"] = {
            "status": "completed",
            "surface_ids": ["PAGE-01"],
            "evidence_ids": ["EV-VIS"],
            "observation": "错误地把单页面标成已完成跨页面比较"
        }
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        false_single_page = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("单页面范围" in error for error in false_single_page["errors"])


def test_pc_environment_validation_gate() -> None:
    with tempfile.TemporaryDirectory(prefix="uxw-pc-environment-test-") as tmp_dir:
        fixture = json.loads((FIXTURES / "report" / "minimal-report.json").read_text(encoding="utf-8"))
        report_path = Path(tmp_dir) / "pc-environment.json"

        report_path.write_text(json.dumps(fixture, ensure_ascii=False), encoding="utf-8")
        accepted = run_json(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert accepted["schema_version"] == 7
        assert accepted["pc_environment_validation_status"] == "completed"
        assert accepted["pc_environment_count"] == 1

        source = json.loads(json.dumps(fixture, ensure_ascii=False))
        source.pop("pc_environment_validation")
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        missing_validation = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("缺少 pc_environment_validation 对象" in error for error in missing_validation["errors"])

        source = json.loads(json.dumps(fixture, ensure_ascii=False))
        source["pc_environment_validation"]["target_environment"] = "1366×768，全屏"
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        mismatched_target = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("target_environment 必须与" in error for error in mismatched_target["errors"])

        source = json.loads(json.dumps(fixture, ensure_ascii=False))
        source["pc_environment_validation"]["environments"][0]["role"] = "additional"
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        missing_primary = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("必须且只能有一个 primary" in error for error in missing_primary["errors"])

        source = json.loads(json.dumps(fixture, ensure_ascii=False))
        duplicate = json.loads(json.dumps(source["pc_environment_validation"]["environments"][0], ensure_ascii=False))
        duplicate["id"] = "PC-ENV-02"
        source["pc_environment_validation"]["environments"].append(duplicate)
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        duplicate_primary = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("必须且只能有一个 primary" in error for error in duplicate_primary["errors"])

        source = json.loads(json.dumps(fixture, ensure_ascii=False))
        source["pc_environment_validation"]["environments"][0]["surface_ids"] = []
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        missing_surface = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("surface_ids 缺少范围页面：PAGE-01" in error for error in missing_surface["errors"])

        source = json.loads(json.dumps(fixture, ensure_ascii=False))
        source["evidence"].append(
            {
                "id": "EV-ENV-UNSCOPED",
                "type": "screenshot",
                "source": "url",
                "task_ids": [],
                "surface_ids": [],
                "state": "browser_frame",
                "observation": "只记录浏览器外框，未形成页面证据",
                "confidence": "high"
            }
        )
        source["pc_environment_validation"]["environments"][0]["evidence_ids"] = ["EV-ENV-UNSCOPED"]
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        unsupported_surface = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("evidence_ids 未覆盖范围页面：PAGE-01" in error for error in unsupported_surface["errors"])

        source = json.loads(json.dumps(fixture, ensure_ascii=False))
        environment = source["pc_environment_validation"]["environments"][0]
        environment["browser_zoom_percent"] = None
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        unexplained_zoom = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("为 null 时必须填写 limitations" in error for error in unexplained_zoom["errors"])

        environment["limitations"] = "用户截图未显示浏览器缩放值"
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        explained_zoom = run_json(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert explained_zoom["ok"] is True

        source = json.loads(json.dumps(fixture, ensure_ascii=False))
        source["schema_version"] = 6
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        old_schema = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("schema_version 必须是 7" in error for error in old_schema["errors"])


def test_checklist_gate() -> None:
    result = run_json(
        [
            PYTHON,
            str(SCRIPTS / "validate_checklist_coverage.py"),
            "--report-json",
            str(FIXTURES / "report" / "minimal-report.json"),
            "--json",
        ]
    )
    assert result["ok"] is True
    assert result["required_count"] == 30
    assert result["coverage_count"] == 30
    assert result["coverage_target_result_count"] == 30
    assert result["task_state_result_count"] == 6
    assert result["confirmed_state_inventory_count"] == 1
    assert result["cross_page_consistency_status"] == "not_applicable"
    assert result["issue_count"] == 0


def test_task_state_inventory_gate() -> None:
    with tempfile.TemporaryDirectory(prefix="uxw-task-state-test-") as tmp_dir:
        fixture = json.loads((FIXTURES / "report" / "minimal-report.json").read_text(encoding="utf-8"))
        report_path = Path(tmp_dir) / "task-states.json"

        source = json.loads(json.dumps(fixture, ensure_ascii=False))
        source["schema_version"] = 6
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        old_schema = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("schema_version 必须是 7" in error for error in old_schema["errors"])

        source = json.loads(json.dumps(fixture, ensure_ascii=False))
        source["scope_inventory"]["tasks"][0].pop("state_inventory")
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        missing_inventory = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("缺少 state_inventory" in error for error in missing_inventory["errors"])

        source = json.loads(json.dumps(fixture, ensure_ascii=False))
        failure_state = source["scope_inventory"]["tasks"][0]["state_inventory"]["results"][4]
        failure_state.clear()
        failure_state.update(
            {
                "state_id": "failure",
                "state_name": "提交失败",
                "status": "not_tested",
                "reason": "当前环境尚未模拟失败响应",
                "validation_method": "模拟失败响应后检查错误定位、输入保护和重试"
            }
        )
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        false_complete = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("状态清单未确认或仍有 not_tested / blocked" in error for error in false_complete["errors"])

        source["report_status"] = "partial"
        source["title"] = "示例系统阶段性体验走查报告"
        source["scope_inventory"]["tasks"][0]["flow_status"] = "partial"
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        valid_partial = run_json(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert valid_partial["task_state_result_count"] == 6

        source = json.loads(json.dumps(fixture, ensure_ascii=False))
        source["issues"] = [
            {
                "id": "ISSUE-STATE-01",
                "index": 1,
                "evaluation_track": "task",
                "title": "提交失败后没有说明失败字段",
                "severity": "P2",
                "confidence": "high",
                "checklist_ids": ["CORE-05"],
                "affected_users": ["内部运营人员"],
                "task_ids": ["TASK-01"],
                "surface_ids": ["PAGE-01"],
                "state": "failure",
                "observation": "提交失败只显示通用错误，没有定位具体字段",
                "expected_experience": "用户应能识别失败字段、原因和修正方式",
                "user_impact": "用户需要逐项排查输入才能恢复任务",
                "impact_basis": "expert_inference",
                "impact_basis_rationale": "通用错误没有建立失败原因与字段的对应关系",
                "impact_evidence_ids": ["EV-FLOW"],
                "reproduction": ["填写无效订单信息", "提交订单", "查看失败反馈"],
                "evidence_ids": ["EV-FLOW"],
                "severity_assessment": {
                    "task_impact": "moderate",
                    "frequency": "medium",
                    "affected_scope": "local",
                    "recoverability": "easy",
                    "business_risk": "normal",
                    "visual_impact": "comprehension"
                },
                "severity_reason": "任务可以恢复，但需要额外逐项排查",
                "design_objective": "让用户直接定位并修正失败字段",
                "recommendation": ["在对应字段展示失败原因和修正提示"],
                "recommendation_rationale": "字段级定位能把通用失败转为可执行的修正路径",
                "acceptance_criteria": ["提交失败时明确标出失败字段、原因和修正方式"],
                "images": []
            }
        ]
        source["coverage"]["CORE-05"] = coverage_entry(
            "task",
            "TASK-01",
            status="issue",
            issue_ids=["ISSUE-STATE-01"],
            evidence_ids=["EV-FLOW"],
        )
        failure_state = source["scope_inventory"]["tasks"][0]["state_inventory"]["results"][4]
        failure_state.update(
            {
                "status": "issue",
                "method": "interaction",
                "evidence_ids": ["EV-FLOW"],
                "observation": "提交失败只显示通用错误，没有定位具体字段",
                "issue_ids": ["ISSUE-STATE-01"]
            }
        )
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        linked_issue = run_json(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert linked_issue["issue_count"] == 1

        source["issues"][0]["task_ids"] = []
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        unlinked_state_issue = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("问题未关联任务 TASK-01" in error for error in unlinked_state_issue["errors"])

        source = json.loads(json.dumps(fixture, ensure_ascii=False))
        source["scope_inventory"]["tasks"][0]["state_inventory"]["excluded_states"].append(
            {
                "state_id": "failure",
                "state_name": "提交失败",
                "reason": "错误地把已验证状态同时标成不适用"
            }
        )
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        overlapping_state = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("不能同时出现在 results 与 excluded_states" in error for error in overlapping_state["errors"])


def test_target_coverage_matrix_gate() -> None:
    with tempfile.TemporaryDirectory(prefix="uxw-target-matrix-test-") as tmp_dir:
        source = json.loads((FIXTURES / "report" / "minimal-report.json").read_text(encoding="utf-8"))
        source["scope_inventory"]["surfaces"].append(
            {
                "id": "PAGE-02",
                "name": "订单详情",
                "visual_status": "completed",
                "evidence_ids": ["EV-VIS-02"]
            }
        )
        source["evidence"].append(
            {
                "id": "EV-VIS-02",
                "type": "screenshot",
                "source": "url",
                "task_ids": [],
                "surface_ids": ["PAGE-02"],
                "state": "default",
                "observation": "订单详情页面的视觉层级、布局、组件和状态清晰可见",
                "confidence": "high"
            }
        )
        source["cross_page_consistency"] = {
            "status": "completed",
            "surface_ids": ["PAGE-01", "PAGE-02"],
            "evidence_ids": ["EV-VIS", "EV-VIS-02"],
            "observation": "列表与详情的页面框架、状态表达和操作层级一致；详情页密度差异符合阅读任务"
        }
        primary_environment = source["pc_environment_validation"]["environments"][0]
        primary_environment["surface_ids"].append("PAGE-02")
        primary_environment["evidence_ids"].append("EV-VIS-02")
        report_path = Path(tmp_dir) / "target-matrix.json"
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        missing_surface_results = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("coverage.VIS-01.results 缺少目标：PAGE-02" in error for error in missing_surface_results["errors"])

        for check_id, entry in source["coverage"].items():
            if check_id.startswith("VIS-"):
                entry["results"].append(
                    {
                        "target_id": "PAGE-02",
                        "status": "verified_pass",
                        "method": "screenshot",
                        "evidence_ids": ["EV-VIS-02"],
                        "observation": f"订单详情已完成 {check_id} 检查，未发现确定问题"
                    }
                )
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        two_surface_matrix = run_json(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert two_surface_matrix["coverage_target_result_count"] == 40
        assert two_surface_matrix["cross_page_consistency_status"] == "completed"

        source["cross_page_consistency"]["evidence_ids"] = ["EV-VIS"]
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        incomplete_comparison_evidence = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any(
            "cross_page_consistency.evidence_ids 未覆盖范围页面：PAGE-02" in error
            for error in incomplete_comparison_evidence["errors"]
        )
        source["cross_page_consistency"]["evidence_ids"] = ["EV-VIS", "EV-VIS-02"]

        source["review_brief"]["critical_tasks"].append(
            {
                "id": "TASK-02",
                "name": "查看订单详情并返回",
                "primary_user": "内部运营人员",
                "start_condition": "从订单列表打开一条订单",
                "intended_outcome": "确认订单详情并返回原列表上下文",
                "success_criteria": [
                    "订单关键信息和当前状态可确认",
                    "返回后保留原筛选和浏览位置"
                ]
            }
        )
        source["scope_inventory"]["tasks"].append(
            {
                "id": "TASK-02",
                "name": "查看订单详情并返回",
                "flow_status": "completed",
                "state_inventory": {
                    "inventory_basis": [
                        {
                            "type": "interaction_path",
                            "description": "实际完成进入详情、读取订单信息并返回列表"
                        }
                    ],
                    "inventory_completeness": "confirmed",
                    "completeness_reason": "只读详情任务的入口、读取结果与返回路径均已映射。",
                    "excluded_states": [],
                    "results": [
                        {
                            "state_id": state_id,
                            "state_name": state_name,
                            "status": "verified_pass",
                            "method": "interaction",
                            "evidence_ids": ["EV-FLOW-02"],
                            "observation": observation
                        }
                        for state_id, state_name, observation in (
                            ("entry", "详情入口", "从订单列表进入对应订单详情"),
                            ("success", "信息读取", "订单关键信息和当前状态可确认"),
                            ("context_return", "返回上下文", "返回列表后保留原筛选和浏览位置")
                        )
                    ]
                },
                "evidence_ids": ["EV-FLOW-02"]
            }
        )
        source["evidence"].append(
            {
                "id": "EV-FLOW-02",
                "type": "interaction",
                "source": "url",
                "task_ids": ["TASK-02"],
                "surface_ids": ["PAGE-02"],
                "state": "entry_success_context_return",
                "observation": "实际完成进入详情、读取订单信息并返回列表",
                "confidence": "high"
            }
        )
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        missing_task_results = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("coverage.CORE-01.results 缺少目标：TASK-02" in error for error in missing_task_results["errors"])

        for check_id, entry in source["coverage"].items():
            if not check_id.startswith("VIS-"):
                entry["results"].append(
                    {
                        "target_id": "TASK-02",
                        "status": "verified_pass",
                        "method": "interaction",
                        "evidence_ids": ["EV-FLOW-02"],
                        "observation": f"查看详情任务已完成 {check_id} 检查，未发现确定问题"
                    }
                )
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        full_matrix = run_json(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert full_matrix["coverage_target_result_count"] == 60
        assert full_matrix["brief_task_count"] == 2
        assert full_matrix["mapped_task_count"] == 2

        visual_result = source["coverage"]["VIS-01"]["results"][1]
        visual_result.clear()
        visual_result.update(
            {
                "target_id": "PAGE-02",
                "status": "issue",
                "issue_ids": ["ISSUE-VIS-02"],
                "evidence_ids": ["EV-VIS-02"]
            }
        )
        source["issues"] = [
            {
                "id": "ISSUE-VIS-02",
                "index": 1,
                "evaluation_track": "visual",
                "title": "订单详情主次信息视觉权重接近",
                "severity": "P2",
                "confidence": "high",
                "checklist_ids": ["VIS-01"],
                "affected_users": ["内部运营人员"],
                "task_ids": [],
                "surface_ids": ["PAGE-02"],
                "state": "default",
                "observation": "订单编号、关键状态和辅助元数据使用相近字号、字重和颜色",
                "expected_experience": "关键状态和对象标识应先于辅助元数据被识别",
                "user_impact": "用户需要逐项阅读才能定位当前订单的关键状态",
                "impact_basis": "expert_inference",
                "impact_basis_rationale": "关键与辅助信息视觉权重接近，削弱详情页的扫描顺序",
                "impact_evidence_ids": ["EV-VIS-02"],
                "reproduction": ["打开订单详情", "观察首屏信息顺序"],
                "evidence_ids": ["EV-VIS-02"],
                "severity_assessment": {
                    "task_impact": "moderate",
                    "frequency": "medium",
                    "affected_scope": "local",
                    "recoverability": "easy",
                    "business_risk": "normal",
                    "visual_impact": "comprehension"
                },
                "severity_reason": "不阻断任务，但增加详情页扫描和定位成本",
                "design_objective": "建立对象标识、状态与辅助元数据的明确视觉顺序",
                "recommendation": ["提高订单标识和关键状态权重，降低辅助元数据层级"],
                "recommendation_rationale": "差异化视觉权重能建立稳定的首屏扫描路径",
                "acceptance_criteria": ["首屏无需逐项阅读即可先识别订单标识和关键状态"],
                "images": []
            }
        ]
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        mixed_results = run_json(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert mixed_results["ok"] is True
        assert source["coverage"]["VIS-01"]["results"][0]["status"] == "verified_pass"
        assert source["coverage"]["VIS-01"]["results"][1]["status"] == "issue"


def test_form_configuration_pack() -> None:
    observations = {
        "FORM-01": "字段分组与填写顺序符合下单业务判断顺序",
        "FORM-02": "标签、必填、单位、格式和帮助说明清楚",
        "FORM-03": "选择、数值和日期控件匹配字段的数据意图",
        "FORM-04": "默认值来源清楚且减少重复录入",
        "FORM-05": "字段联动可预测且不会静默丢失输入",
        "FORM-06": "错误靠近字段并说明原因与修正方式",
        "FORM-07": "长表单分组定位和完成状态清楚",
        "FORM-08": "编辑、保存、取消与未保存保护一致",
    }
    with tempfile.TemporaryDirectory(prefix="uxw-form-pack-test-") as tmp_dir:
        source = json.loads((FIXTURES / "report" / "minimal-report.json").read_text(encoding="utf-8"))
        source["activated_packs"].append("form-configuration")
        for check_id, observation in observations.items():
            source["coverage"][check_id] = coverage_entry(
                "task",
                "TASK-01",
                status="verified_pass",
                method="interaction",
                evidence_ids=["EV-FLOW"],
                observation=observation,
            )
        report_path = Path(tmp_dir) / "form-pack.json"
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        result = run_json(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert result["ok"] is True
        assert result["required_count"] == 38
        assert result["coverage_count"] == 38
        assert "form-configuration" in result["activated_packs"]

        source["coverage"].pop("FORM-08")
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        rejected = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("FORM-08" in error for error in rejected["errors"])


def test_analytics_dashboard_pack() -> None:
    observations = {
        "DASH-01": "关键指标、异常与行动入口支持用户监控和处理目标",
        "DASH-02": "指标名称、单位、范围、时间与时区语境明确",
        "DASH-03": "变化值提供适合当前判断的同期比较与方向说明",
        "DASH-04": "趋势和比较采用匹配任务且不易误读的视觉编码",
        "DASH-05": "坐标、图例、提示和明细支持扫描与精确读取",
        "DASH-06": "筛选、联动、下钻和返回过程保持分析上下文",
        "DASH-07": "更新时间、延迟与部分缺失状态对用户透明",
        "DASH-08": "加载、无数据、失败与异常处理入口形成闭环",
    }
    with tempfile.TemporaryDirectory(prefix="uxw-dashboard-pack-test-") as tmp_dir:
        source = json.loads((FIXTURES / "report" / "minimal-report.json").read_text(encoding="utf-8"))
        source["activated_packs"].append("analytics-dashboard")
        for check_id, observation in observations.items():
            source["coverage"][check_id] = coverage_entry(
                "task",
                "TASK-01",
                status="verified_pass",
                method="interaction",
                evidence_ids=["EV-FLOW"],
                observation=observation,
            )
        report_path = Path(tmp_dir) / "dashboard-pack.json"
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        result = run_json(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert result["ok"] is True
        assert result["required_count"] == 38
        assert result["coverage_count"] == 38
        assert "analytics-dashboard" in result["activated_packs"]

        source["coverage"].pop("DASH-08")
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        rejected = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("DASH-08" in error for error in rejected["errors"])


def test_navigation_information_architecture_pack() -> None:
    observations = {
        "NAV-01": "模块和对象结构符合主要用户的业务概念与工作顺序",
        "NAV-02": "全局、模块、页面和对象内导航层级清楚稳定",
        "NAV-03": "菜单、页面、面包屑和入口采用一致业务命名",
        "NAV-04": "从主要入口和深链接进入后均能识别当前位置",
        "NAV-05": "关键任务入口可发现且同类入口跨页面一致",
        "NAV-06": "菜单、面包屑、页签和步骤组件匹配关系类型",
        "NAV-07": "跨页处理并返回后保留筛选、分页和滚动上下文",
        "NAV-08": "权限和对象状态变化后的入口仍可理解且有替代路径",
    }
    with tempfile.TemporaryDirectory(prefix="uxw-navigation-pack-test-") as tmp_dir:
        source = json.loads((FIXTURES / "report" / "minimal-report.json").read_text(encoding="utf-8"))
        source["activated_packs"].append("navigation-information-architecture")
        for check_id, observation in observations.items():
            source["coverage"][check_id] = coverage_entry(
                "task",
                "TASK-01",
                status="verified_pass",
                method="interaction",
                evidence_ids=["EV-FLOW"],
                observation=observation,
            )
        report_path = Path(tmp_dir) / "navigation-pack.json"
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        result = run_json(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert result["ok"] is True
        assert result["required_count"] == 38
        assert result["coverage_count"] == 38
        assert "navigation-information-architecture" in result["activated_packs"]

        source["coverage"].pop("NAV-08")
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        rejected = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("NAV-08" in error for error in rejected["errors"])


def test_low_confidence_is_backlog_only() -> None:
    with tempfile.TemporaryDirectory(prefix="uxw-confidence-test-") as tmp_dir:
        source = json.loads((FIXTURES / "report" / "minimal-report.json").read_text(encoding="utf-8"))
        source["validation_backlog"] = [
            {
                "id": "RISK-01",
                "title": "失败后可能丢失输入",
                "task_ids": ["TASK-01"],
                "surface_ids": ["PAGE-01"],
                "checklist_ids": ["CORE-06"],
                "reason": "当前证据没有覆盖接口超时",
                "potential_impact": "用户可能需要重新录入订单",
                "potential_severity": "P1",
                "validation_priority": "high",
                "validation_method": "模拟接口超时后检查输入保留与重试"
            }
        ]
        accepted_path = Path(tmp_dir) / "backlog.json"
        accepted_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        accepted = run_json(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(accepted_path), "--json"]
        )
        assert accepted["ok"] is True

        source["issues"] = [{"id": "ISSUE-LOW", "confidence": "low"}]
        rejected_path = Path(tmp_dir) / "low-confidence-issue.json"
        rejected_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        rejected = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(rejected_path), "--json"]
        )
        assert any("low 应进入 validation_backlog" in error for error in rejected["errors"])


def test_recommendation_quality_gate() -> None:
    with tempfile.TemporaryDirectory(prefix="uxw-recommendation-test-") as tmp_dir:
        source = json.loads((FIXTURES / "report" / "minimal-report.json").read_text(encoding="utf-8"))
        source["coverage"]["CORE-05"] = coverage_entry(
            "task",
            "TASK-01",
            status="issue",
            issue_ids=["ISSUE-01"],
            evidence_ids=["EV-FLOW"],
        )
        source["issues"] = [
            {
                "id": "ISSUE-01",
                "index": 1,
                "evaluation_track": "task",
                "title": "批量失败后无法定位失败对象",
                "severity": "P1",
                "confidence": "high",
                "checklist_ids": ["CORE-05"],
                "affected_users": ["内部运营人员"],
                "task_ids": ["TASK-01"],
                "surface_ids": ["PAGE-01"],
                "state": "partial_failure",
                "observation": "结果只展示失败数量，没有失败对象与原因",
                "expected_experience": "用户能够识别失败对象、理解原因并继续处理",
                "user_impact": "用户需要返回列表逐条人工核对",
                "business_impact": "可能造成订单漏处理",
                "impact_basis": "expert_inference",
                "impact_basis_rationale": "结果缺少失败对象和原因，结合高频任务，用户只能返回列表人工定位",
                "impact_evidence_ids": ["EV-FLOW"],
                "reproduction": ["提交包含异常数据的订单", "查看处理结果"],
                "evidence_ids": ["EV-FLOW"],
                "severity_assessment": {
                    "task_impact": "significant",
                    "frequency": "high",
                    "affected_scope": "multiple",
                    "recoverability": "difficult",
                    "business_risk": "high",
                    "visual_impact": "comprehension"
                },
                "severity_reason": "高频任务需要人工核对且可能漏处理",
                "design_objective": "让用户确认每条结果并继续处理失败项",
                "recommendation": ["展示失败对象与原因", "提供仅重试失败项的入口"],
                "recommendation_rationale": "失败明细把逐条核对转为可定位、可继续的恢复流程",
                "constraints_tradeoffs": ["结果区需兼顾批量概览与失败明细的扫描密度"],
                "acceptance_criteria": ["部分失败时可查看失败对象、原因和重试入口"],
                "images": []
            }
        ]
        report_path = Path(tmp_dir) / "recommendation.json"
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        accepted = run_json(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert accepted["ok"] is True
        assert accepted["impact_basis_counts"]["expert_inference"] == 1

        source["issues"][0].pop("impact_basis_rationale")
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        missing_impact_basis = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("impact_basis_rationale" in error for error in missing_impact_basis["errors"])

        source["issues"][0]["impact_basis_rationale"] = "页面结果缺少失败明细，用户只能返回列表定位"
        source["issues"][0]["impact_basis"] = "observed_user_behavior"
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        false_user_evidence = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("type=user_observation" in error for error in false_user_evidence["errors"])

        source["evidence"].append(
            {
                "id": "EV-USER-01",
                "type": "user_observation",
                "source": "usability_session",
                "task_ids": ["TASK-01"],
                "surface_ids": ["PAGE-01"],
                "state": "partial_failure",
                "observation": "目标用户在失败结果出现后返回列表逐条查找失败订单",
                "confidence": "high"
            }
        )
        source["issues"][0]["evidence_ids"].append("EV-USER-01")
        source["issues"][0]["impact_evidence_ids"] = ["EV-USER-01"]
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        observed_user_impact = run_json(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert observed_user_impact["impact_basis_counts"]["observed_user_behavior"] == 1

        impact_docx = Path(tmp_dir) / "impact-evidence.docx"
        generated_impact_report = run_json(
            [
                PYTHON,
                str(SCRIPTS / "generate_docx.py"),
                "--report-json",
                str(report_path),
                "--output",
                str(impact_docx),
                "--skip-annotation-check",
                "--json",
            ]
        )
        assert generated_impact_report["status"] == "generated"
        with zipfile.ZipFile(impact_docx) as archive:
            document_xml = archive.read("word/document.xml").decode("utf-8")
        assert "影响依据理由" in document_xml
        assert "observed_user_behavior" in document_xml
        assert "EV-USER-01" in document_xml

        source["issues"][0]["impact_basis"] = "expert_inference"
        source["issues"][0]["impact_evidence_ids"] = ["EV-FLOW"]

        source["issues"][0].pop("recommendation_rationale")
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        missing_rationale = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("recommendation_rationale" in error for error in missing_rationale["errors"])

        source["issues"][0]["recommendation_rationale"] = "失败明细支持直接恢复任务"
        source["issues"][0].pop("constraints_tradeoffs")
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        missing_tradeoffs = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("constraints_tradeoffs" in error for error in missing_tradeoffs["errors"])

        source["issues"][0]["severity"] = "P2"
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        p2_without_tradeoff = run_json(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert p2_without_tradeoff["ok"] is True


def test_issue_consolidation_gate() -> None:
    with tempfile.TemporaryDirectory(prefix="uxw-consolidation-test-") as tmp_dir:
        source = json.loads((FIXTURES / "report" / "minimal-report.json").read_text(encoding="utf-8"))
        source["scope_inventory"]["surfaces"].append(
            {
                "id": "PAGE-02",
                "name": "订单详情",
                "visual_status": "completed",
                "evidence_ids": ["EV-VIS-02"]
            }
        )
        source["evidence"].append(
            {
                "id": "EV-VIS-02",
                "type": "screenshot",
                "source": "url",
                "task_ids": [],
                "surface_ids": ["PAGE-02"],
                "state": "default",
                "observation": "详情页状态标签与列表页采用不同术语和颜色规则",
                "confidence": "high"
            }
        )
        source["cross_page_consistency"] = {
            "status": "completed",
            "surface_ids": ["PAGE-01", "PAGE-02"],
            "evidence_ids": ["EV-VIS", "EV-VIS-02"],
            "observation": "列表与详情的相同订单状态使用不同术语和颜色，形成跨页面一致性问题"
        }
        primary_environment = source["pc_environment_validation"]["environments"][0]
        primary_environment["surface_ids"].append("PAGE-02")
        primary_environment["evidence_ids"].append("EV-VIS-02")
        for check_id, entry in source["coverage"].items():
            if check_id.startswith("VIS-") and check_id != "VIS-06":
                entry["results"].append(
                    {
                        "target_id": "PAGE-02",
                        "status": "verified_pass",
                        "method": "screenshot",
                        "evidence_ids": ["EV-VIS-02"],
                        "observation": f"订单详情已完成 {check_id} 检查，未发现确定问题"
                    }
                )
        source["coverage"]["VIS-06"] = {
            "target_type": "surface",
            "results": [
                {
                    "target_id": "PAGE-01",
                    "status": "issue",
                    "issue_ids": ["ISSUE-SYSTEM"],
                    "evidence_ids": ["EV-VIS"]
                },
                {
                    "target_id": "PAGE-02",
                    "status": "issue",
                    "issue_ids": ["ISSUE-SYSTEM"],
                    "evidence_ids": ["EV-VIS-02"]
                }
            ]
        }
        issue = {
            "id": "ISSUE-SYSTEM",
            "index": 1,
            "evaluation_track": "visual_system",
            "title": "状态标签语义跨页面不一致",
            "severity": "P2",
            "confidence": "high",
            "checklist_ids": ["VIS-06"],
            "affected_users": ["内部运营人员"],
            "task_ids": [],
            "surface_ids": ["PAGE-01", "PAGE-02"],
            "state": "default",
            "observation": "相同订单状态在列表和详情使用不同术语与颜色",
            "expected_experience": "相同状态在不同页面保持一致且可识别",
            "user_impact": "用户需要重新判断状态含义并可能误读",
            "impact_basis": "expert_inference",
            "impact_basis_rationale": "相同状态在相邻页面使用不同术语和颜色，增加重新解释并产生误读风险",
            "impact_evidence_ids": ["EV-VIS", "EV-VIS-02"],
            "reproduction": ["查看订单列表状态", "进入详情比较状态"],
            "evidence_ids": ["EV-VIS", "EV-VIS-02"],
            "occurrences": [
                {
                    "id": "OCC-01",
                    "task_ids": [],
                    "surface_ids": ["PAGE-01"],
                    "state": "default",
                    "observation": "列表页显示“已完成”并使用绿色标签",
                    "evidence_ids": ["EV-VIS"]
                },
                {
                    "id": "OCC-02",
                    "task_ids": [],
                    "surface_ids": ["PAGE-02"],
                    "state": "default",
                    "observation": "详情页显示“处理结束”并使用蓝色标签",
                    "evidence_ids": ["EV-VIS-02"]
                }
            ],
            "severity_assessment": {
                "task_impact": "moderate",
                "frequency": "medium",
                "affected_scope": "multiple",
                "recoverability": "easy",
                "business_risk": "normal",
                "visual_impact": "polish"
            },
            "severity_reason": "跨页面重复出现但不阻断任务",
            "design_objective": "建立一致的订单状态语义和视觉规则",
            "recommendation": ["统一列表与详情的状态术语、颜色和组件状态"],
            "recommendation_rationale": "稳定的状态规则减少跨页面重新理解",
            "constraints_tradeoffs": ["需保留不同状态之间足够的非颜色辨识"],
            "acceptance_criteria": ["相同订单状态在列表和详情使用相同术语与视觉语义"],
            "images": []
        }
        source["issues"] = [issue]
        report_path = Path(tmp_dir) / "consolidated.json"
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        accepted = run_json(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert accepted["ok"] is True

        occurrences = source["issues"][0].pop("occurrences")
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        missing_occurrences = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("缺少 occurrences" in error for error in missing_occurrences["errors"])

        source["issues"][0]["occurrences"] = occurrences[:1]
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        missing_surface = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("PAGE-02" in error for error in missing_surface["errors"])


def test_positive_opportunity_gate() -> None:
    with tempfile.TemporaryDirectory(prefix="uxw-positive-opportunity-test-") as tmp_dir:
        source = json.loads((FIXTURES / "report" / "minimal-report.json").read_text(encoding="utf-8"))
        opportunity = {
            "id": "OPP-01",
            "title": "为高频用户提供下单模板",
            "current_state": "当前表单可以准确完成下单，但重复订单仍需再次填写相同字段",
            "why_not_issue": "当前关键任务可完整完成，且没有证据证明重复录入已造成显著成本",
            "expected_value": "字段组合稳定时可以减少重复录入时间",
            "applicability": "仅适用于每日重复下单且字段组合稳定的熟练运营人员",
            "design_direction": "探索保存为模板和从模板创建的可控入口",
            "checklist_ids": ["CORE-08"],
            "task_ids": ["TASK-01"],
            "surface_ids": ["PAGE-01"],
            "evidence_ids": ["EV-FLOW"]
        }
        source["opportunities"] = [opportunity]
        report_path = Path(tmp_dir) / "supplemental.json"
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        accepted = run_json(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert accepted["ok"] is True
        assert accepted["positive_pattern_count"] == 1
        assert accepted["opportunity_count"] == 1

        opportunity["severity"] = "P2"
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        graded_opportunity = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("不得包含 severity" in error for error in graded_opportunity["errors"])

        opportunity.pop("severity")
        opportunity.pop("why_not_issue")
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        unexplained_opportunity = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("why_not_issue" in error for error in unexplained_opportunity["errors"])

        opportunity["why_not_issue"] = "当前任务可完整完成且没有显著负面影响证据"
        source["positive_patterns"][0]["evidence_ids"] = []
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        unsupported_positive = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("positive_patterns POS-01.evidence_ids 不得为空" in error for error in unsupported_positive["errors"])


def test_follow_up_review_gate() -> None:
    with tempfile.TemporaryDirectory(prefix="uxw-follow-up-test-") as tmp_dir:
        source = json.loads((FIXTURES / "report" / "minimal-report.json").read_text(encoding="utf-8"))
        source["review_mode"] = "follow_up"
        source["title"] = "示例系统设计复查报告"
        source["follow_up_review"] = {
            "baseline_report": {
                "title": "示例系统完整体验走查报告",
                "generated_at": "2026-08-21T15:10:00+08:00",
                "source_reference": "original-report.json"
            },
            "brief_change_status": "unchanged",
            "brief_changes": [],
            "scope_type": "targeted",
            "issue_results": [
                {
                    "id": "RECHECK-01",
                    "original_issue_id": "ISSUE-ORIGINAL-01",
                    "title": "提交失败后输入丢失",
                    "status": "resolved",
                    "task_ids": ["TASK-01"],
                    "surface_ids": ["PAGE-01"],
                    "acceptance_results": [
                        {
                            "criterion": "提交失败后保留已填写内容",
                            "result": "passed",
                            "observation": "模拟失败后全部已填写内容仍保留",
                            "evidence_ids": ["EV-FLOW"]
                        }
                    ],
                    "conclusion": "原问题验收标准已通过。"
                }
            ],
            "regression_check": {
                "surface_ids": ["PAGE-01"],
                "task_ids": ["TASK-01"],
                "result": "passed",
                "observation": "受影响页面和任务均完成回归检查，未发现新问题。",
                "evidence_ids": ["EV-FLOW", "EV-VIS"]
            }
        }
        report_path = Path(tmp_dir) / "follow-up.json"
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        accepted = run_json(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert accepted["ok"] is True
        assert accepted["review_mode"] == "follow_up"
        assert accepted["follow_up_result_count"] == 1

        output_path = Path(tmp_dir) / "follow-up.docx"
        generated = run_json(
            [
                PYTHON,
                str(SCRIPTS / "generate_docx.py"),
                "--report-json",
                str(report_path),
                "--output",
                str(output_path),
                "--json",
            ]
        )
        assert generated["review_mode"] == "follow_up"
        with zipfile.ZipFile(output_path) as archive:
            document_xml = archive.read("word/document.xml").decode("utf-8")
        assert "设计复查结论" in document_xml
        assert "原问题验收标准已通过" in document_xml

        result = source["follow_up_review"]["issue_results"][0]
        result["acceptance_results"][0]["result"] = "failed"
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        false_resolution = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("resolved 时全部验收标准必须 passed" in error for error in false_resolution["errors"])

        result["acceptance_results"][0]["result"] = "passed"
        source["follow_up_review"]["regression_check"]["surface_ids"] = []
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        missing_regression_scope = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("未覆盖复查页面：PAGE-01" in error for error in missing_regression_scope["errors"])

        source["follow_up_review"]["regression_check"]["surface_ids"] = ["PAGE-01"]
        result["status"] = "partially_resolved"
        result["acceptance_results"].append(
            {
                "criterion": "失败原因定位到具体字段",
                "result": "failed",
                "observation": "修改后仍只显示通用失败提示",
                "evidence_ids": ["EV-FLOW"]
            }
        )
        result["current_issue_id"] = "ISSUE-CURRENT-01"
        source["coverage"]["CORE-05"] = coverage_entry(
            "task",
            "TASK-01",
            status="issue",
            issue_ids=["ISSUE-CURRENT-01"],
            evidence_ids=["EV-FLOW"],
        )
        source["issues"] = [
            {
                "id": "ISSUE-CURRENT-01",
                "index": 1,
                "issue_origin": "baseline",
                "original_issue_id": "ISSUE-ORIGINAL-01",
                "evaluation_track": "task",
                "title": "失败原因仍无法定位到具体字段",
                "severity": "P2",
                "confidence": "high",
                "checklist_ids": ["CORE-05"],
                "affected_users": ["内部运营人员"],
                "task_ids": ["TASK-01"],
                "surface_ids": ["PAGE-01"],
                "state": "failure",
                "observation": "修改后保留了输入，但失败提示仍未定位具体字段",
                "expected_experience": "用户能够直接识别并修正失败字段",
                "user_impact": "用户仍需逐项排查失败原因",
                "impact_basis": "expert_inference",
                "impact_basis_rationale": "失败提示没有关联字段，用户只能逐项检查输入以定位原因",
                "impact_evidence_ids": ["EV-FLOW"],
                "reproduction": ["填写无效数据", "提交表单", "查看失败提示"],
                "evidence_ids": ["EV-FLOW"],
                "severity_assessment": {
                    "task_impact": "moderate",
                    "frequency": "medium",
                    "affected_scope": "local",
                    "recoverability": "easy",
                    "business_risk": "normal",
                    "visual_impact": "comprehension"
                },
                "severity_reason": "可以恢复，但需要额外排查失败字段",
                "design_objective": "让用户直接定位并修正失败字段",
                "recommendation": ["将失败原因关联到具体字段并提供修正说明"],
                "recommendation_rationale": "字段级错误定位减少逐项排查",
                "acceptance_criteria": ["失败时明确标出具体字段、原因和修正方式"],
                "images": []
            }
        ]
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        partial = run_json(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert partial["ok"] is True

        new_issue = json.loads(json.dumps(source["issues"][0], ensure_ascii=False))
        new_issue["id"] = "ISSUE-NEW-01"
        new_issue["issue_origin"] = "new"
        new_issue.pop("original_issue_id")
        new_issue["title"] = "修改后错误提示遮挡主要操作"
        source["issues"].append(new_issue)
        source["coverage"]["CORE-05"]["results"][0]["issue_ids"].append("ISSUE-NEW-01")
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        hidden_new_issue = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("回归检查标为 passed，但存在 issue_origin=new" in error for error in hidden_new_issue["errors"])

        source["follow_up_review"]["regression_check"]["result"] = "issues_found"
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        disclosed_new_issue = run_json(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert disclosed_new_issue["ok"] is True

        result.pop("current_issue_id")
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        unlinked_partial = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("缺少 current_issue_id" in error for error in unlinked_partial["errors"])


def test_partial_report_requires_staged_title() -> None:
    with tempfile.TemporaryDirectory(prefix="uxw-partial-title-test-") as tmp_dir:
        source = json.loads((FIXTURES / "report" / "minimal-report.json").read_text(encoding="utf-8"))
        source["report_status"] = "partial"
        source["scope_inventory"]["tasks"][0]["flow_status"] = "partial"
        source["coverage"]["CORE-06"] = coverage_entry(
            "task",
            "TASK-01",
            status="not_tested",
            reason="当前阶段尚未模拟接口失败",
        )
        report_path = Path(tmp_dir) / "partial.json"
        report_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
        rejected = run_json_failure(
            [PYTHON, str(SCRIPTS / "validate_checklist_coverage.py"), "--report-json", str(report_path), "--json"]
        )
        assert any("阶段性" in error for error in rejected["errors"])


def main() -> int:
    test_monorepo_gate()
    test_url_login_gate()
    test_review_brief_required()
    test_task_contract_gate()
    test_scope_inventory_completeness_gate()
    test_pc_environment_validation_gate()
    test_cross_page_consistency_gate()
    test_annotate_script()
    test_annotate_fallback_warning()
    test_checklist_gate()
    test_task_state_inventory_gate()
    test_target_coverage_matrix_gate()
    test_form_configuration_pack()
    test_analytics_dashboard_pack()
    test_navigation_information_architecture_pack()
    test_low_confidence_is_backlog_only()
    test_recommendation_quality_gate()
    test_issue_consolidation_gate()
    test_positive_opportunity_gate()
    test_follow_up_review_gate()
    test_partial_report_requires_staged_title()
    test_docx_generation()
    print("Smoke tests passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
