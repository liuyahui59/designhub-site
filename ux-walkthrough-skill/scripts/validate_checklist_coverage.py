#!/usr/bin/env python3
"""Validate the v7 UX walkthrough report, target coverage, and cross references."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

PACK_FILES = {
    "core": "ux-checklist.md",
    "visual": "visual-checklist.md",
    "accessibility-pc": "accessibility-pc.md",
    "object-lifecycle": "domain-object-lifecycle.md",
    "form-configuration": "domain-form-configuration.md",
    "analytics-dashboard": "domain-analytics-dashboard.md",
    "navigation-information-architecture": "domain-navigation-information-architecture.md",
}
PACK_TARGET_TYPES = {
    "core": "task",
    "visual": "surface",
    "accessibility-pc": "task",
    "object-lifecycle": "task",
    "form-configuration": "task",
    "analytics-dashboard": "task",
    "navigation-information-architecture": "task",
}
MANDATORY_PACKS = ("core", "visual", "accessibility-pc")
CHECK_ID_RE = re.compile(r"^###\s+([A-Z][A-Z0-9]*-\d{2})\s+", re.MULTILINE)
COVERAGE_STATUSES = {"verified_pass", "issue", "not_tested", "not_applicable", "blocked"}
TASK_STATE_STATUSES = {"verified_pass", "issue", "not_tested", "blocked"}
CROSS_PAGE_STATUSES = {"completed", "not_applicable", "partial", "blocked"}
PC_ENVIRONMENT_STATUSES = {"completed", "partial", "blocked"}
PC_ENVIRONMENT_ROLES = {"primary", "additional"}
PC_ENVIRONMENT_CAPTURE_SOURCES = {"live_browser", "user_screenshot", "design_export"}
TASK_STATE_ID_RE = re.compile(r"^[a-z][a-z0-9_]*$")
TASK_STATE_BASIS_TYPES = {
    "user_confirmed_task",
    "interaction_path",
    "interface_branch",
    "design_spec",
    "code_path",
    "baseline_report",
}
STATE_EVIDENCE_BASIS_TYPES = TASK_STATE_BASIS_TYPES - {"user_confirmed_task"}
TRACK_STATUSES = {"completed", "partial", "blocked", "missing"}
SEVERITIES = {"P0", "P1", "P2"}
CONFIDENCES = {"high", "medium"}
EVALUATION_TRACKS = {"task", "visual", "visual_system"}
REVIEW_MODES = {"initial", "follow_up"}
FOLLOW_UP_STATUSES = {"resolved", "partially_resolved", "unresolved", "cannot_verify"}
ACCEPTANCE_RESULTS = {"passed", "failed", "not_verified"}
ISSUE_ORIGINS = {"baseline", "new"}
IMPACT_BASES = {"expert_inference", "observed_user_behavior", "behavioral_data"}
IMPACT_EVIDENCE_TYPES = {
    "observed_user_behavior": "user_observation",
    "behavioral_data": "behavioral_data",
}
INVENTORY_BASIS_TYPES = {
    "user_confirmed_scope",
    "navigation_traversal",
    "route_scan",
    "screenshot_set",
    "design_inventory",
    "baseline_report",
}
INVENTORY_COMPLETENESS = {"confirmed", "partial"}
EXCLUSION_REASON_CODES = {
    "outside_user_scope",
    "non_pc",
    "duplicate_representation",
    "not_user_interface",
}
ASSESSMENT_VALUES = {
    "task_impact": {"blocking", "significant", "moderate", "none"},
    "frequency": {"high", "medium", "low", "unknown"},
    "affected_scope": {"system", "multiple", "local"},
    "recoverability": {"none", "difficult", "easy"},
    "business_risk": {"critical", "high", "normal"},
    "visual_impact": {"operation", "comprehension", "trust", "polish", "none"},
}


def _skill_root() -> Path:
    return Path(__file__).resolve().parent.parent


def _text(value: object) -> str:
    return value.strip() if isinstance(value, str) else ""


def _string_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [item.strip() for item in value if isinstance(item, str) and item.strip()]


def _object_list(value: object) -> list[dict]:
    return [item for item in value if isinstance(item, dict)] if isinstance(value, list) else []


def _collect_ids(items: list[dict], label: str, errors: list[str]) -> set[str]:
    result: set[str] = set()
    for index, item in enumerate(items):
        item_id = _text(item.get("id"))
        if not item_id:
            errors.append(f"{label}[{index}] 缺少 id")
        elif item_id in result:
            errors.append(f"{label} 含重复 id：{item_id}")
        else:
            result.add(item_id)
    return result


def load_pack_ids(pack: str) -> list[str]:
    file_name = PACK_FILES[pack]
    path = _skill_root() / "references" / file_name
    ids = CHECK_ID_RE.findall(path.read_text(encoding="utf-8"))
    if not ids:
        raise ValueError(f"未能从 {path} 解析检查项 ID")
    return ids


def _validate_refs(
    refs: list[str],
    valid: set[str],
    label: str,
    errors: list[str],
    *,
    required: bool = False,
) -> None:
    if required and not refs:
        errors.append(f"{label} 不得为空")
    missing = sorted(set(refs) - valid)
    if missing:
        errors.append(f"{label} 引用不存在：{'、'.join(missing)}")


def _validate_inventory(report: dict, errors: list[str]) -> tuple[set[str], set[str], list[dict], list[dict]]:
    inventory = report.get("scope_inventory")
    if not isinstance(inventory, dict):
        errors.append("缺少 scope_inventory 对象")
        return set(), set(), [], []

    raw_basis = inventory.get("inventory_basis")
    if not isinstance(raw_basis, list) or not raw_basis:
        errors.append("scope_inventory.inventory_basis 必须是非空数组")
        basis_items: list[dict] = []
    else:
        basis_items = _object_list(raw_basis)
        if len(basis_items) != len(raw_basis):
            errors.append("scope_inventory.inventory_basis 中每一项必须是对象")
    _collect_ids(basis_items, "scope_inventory.inventory_basis", errors)
    for item in basis_items:
        basis_id = _text(item.get("id")) or "unknown"
        if _text(item.get("type")) not in INVENTORY_BASIS_TYPES:
            errors.append(f"inventory basis {basis_id} type 无效")
        if not _text(item.get("description")):
            errors.append(f"inventory basis {basis_id} 缺少 description")

    completeness = _text(inventory.get("inventory_completeness"))
    if completeness not in INVENTORY_COMPLETENESS:
        errors.append("scope_inventory.inventory_completeness 必须是 confirmed / partial")
    if not _text(inventory.get("completeness_reason")):
        errors.append("scope_inventory 缺少 completeness_reason")

    raw_excluded = inventory.get("excluded_surfaces", [])
    if not isinstance(raw_excluded, list):
        errors.append("scope_inventory.excluded_surfaces 必须是数组，可为空")
        excluded: list[dict] = []
    else:
        excluded = _object_list(raw_excluded)
        if len(excluded) != len(raw_excluded):
            errors.append("scope_inventory.excluded_surfaces 中每一项必须是对象")
    excluded_ids = _collect_ids(excluded, "scope_inventory.excluded_surfaces", errors)
    for item in excluded:
        excluded_id = _text(item.get("id")) or "unknown"
        if not _text(item.get("name")):
            errors.append(f"excluded surface {excluded_id} 缺少 name")
        if _text(item.get("reason_code")) not in EXCLUSION_REASON_CODES:
            errors.append(f"excluded surface {excluded_id} reason_code 无效")
        if not _text(item.get("reason")):
            errors.append(f"excluded surface {excluded_id} 缺少 reason")

    surfaces = _object_list(inventory.get("surfaces"))
    tasks = _object_list(inventory.get("tasks"))
    if not surfaces:
        errors.append("scope_inventory.surfaces 必须是非空数组")
    if not tasks:
        errors.append("scope_inventory.tasks 必须是非空数组")
    surface_ids = _collect_ids(surfaces, "surfaces", errors)
    task_ids = _collect_ids(tasks, "tasks", errors)
    overlapping_excluded = sorted(surface_ids & excluded_ids)
    if overlapping_excluded:
        errors.append(f"scope_inventory 页面不能同时列为范围内与范围外：{'、'.join(overlapping_excluded)}")

    for item in surfaces:
        item_id = _text(item.get("id")) or "unknown"
        status = _text(item.get("visual_status"))
        if status not in TRACK_STATUSES:
            errors.append(f"surface {item_id} visual_status 无效")
        if status == "completed" and not _string_list(item.get("evidence_ids")):
            errors.append(f"surface {item_id} 标为 completed 但缺少 evidence_ids")

    for item in tasks:
        item_id = _text(item.get("id")) or "unknown"
        status = _text(item.get("flow_status"))
        if status not in TRACK_STATUSES:
            errors.append(f"task {item_id} flow_status 无效")
        if status == "completed" and not _string_list(item.get("evidence_ids")):
            errors.append(f"task {item_id} 标为 completed 但缺少 evidence_ids")
    source = _text(report.get("source")).lower()
    if source == "code":
        for item in surfaces:
            if _text(item.get("visual_status")) == "completed":
                errors.append(f"code fallback 不能把 surface {_text(item.get('id'))} 标为视觉 completed")
    if source == "screenshot":
        for item in tasks:
            if _text(item.get("flow_status")) == "completed":
                errors.append(f"screenshot 模式不能把 task {_text(item.get('id'))} 标为流程 completed")

    return surface_ids, task_ids, surfaces, tasks


def _task_state_inventory_is_complete(task: dict) -> bool:
    inventory = task.get("state_inventory")
    if not isinstance(inventory, dict):
        return False
    results = _object_list(inventory.get("results"))
    return (
        _text(inventory.get("inventory_completeness")) == "confirmed"
        and bool(results)
        and all(_text(result.get("status")) in {"verified_pass", "issue"} for result in results)
    )


def _validate_task_state_inventories(
    tasks: list[dict],
    evidence_ids: set[str],
    evidence_by_id: dict[str, dict],
    issue_ids: set[str],
    issue_by_id: dict[str, dict],
    errors: list[str],
) -> tuple[int, int]:
    result_count = 0
    confirmed_count = 0
    for task in tasks:
        task_id = _text(task.get("id")) or "unknown"
        inventory = task.get("state_inventory")
        if not isinstance(inventory, dict):
            errors.append(f"task {task_id} 缺少 state_inventory 对象")
            continue

        raw_basis = inventory.get("inventory_basis")
        if not isinstance(raw_basis, list) or not raw_basis:
            errors.append(f"task {task_id}.state_inventory.inventory_basis 必须是非空数组")
            basis_items: list[dict] = []
        else:
            basis_items = _object_list(raw_basis)
            if len(basis_items) != len(raw_basis):
                errors.append(f"task {task_id}.state_inventory.inventory_basis 中每一项必须是对象")
        for basis in basis_items:
            basis_type = _text(basis.get("type"))
            if basis_type not in TASK_STATE_BASIS_TYPES:
                errors.append(f"task {task_id}.state_inventory basis type 无效：{basis_type or 'missing'}")
            if not _text(basis.get("description")):
                errors.append(f"task {task_id}.state_inventory basis 缺少 description")

        completeness = _text(inventory.get("inventory_completeness"))
        if completeness not in INVENTORY_COMPLETENESS:
            errors.append(f"task {task_id}.state_inventory.inventory_completeness 必须是 confirmed / partial")
        elif completeness == "confirmed":
            confirmed_count += 1
        if not _text(inventory.get("completeness_reason")):
            errors.append(f"task {task_id}.state_inventory 缺少 completeness_reason")
        if completeness == "confirmed" and not any(
            _text(basis.get("type")) in STATE_EVIDENCE_BASIS_TYPES for basis in basis_items
        ):
            errors.append(
                f"task {task_id}.state_inventory 标为 confirmed，但缺少交互、界面、设计、代码或原报告依据"
            )

        raw_excluded = inventory.get("excluded_states", [])
        if not isinstance(raw_excluded, list):
            errors.append(f"task {task_id}.state_inventory.excluded_states 必须是数组，可为空")
            excluded_states: list[dict] = []
        else:
            excluded_states = _object_list(raw_excluded)
            if len(excluded_states) != len(raw_excluded):
                errors.append(f"task {task_id}.state_inventory.excluded_states 中每一项必须是对象")

        excluded_ids: set[str] = set()
        for excluded in excluded_states:
            state_id = _text(excluded.get("state_id"))
            label = f"task {task_id}.excluded_state {state_id or 'unknown'}"
            if not state_id:
                errors.append(f"{label} 缺少 state_id")
            elif not TASK_STATE_ID_RE.fullmatch(state_id):
                errors.append(f"{label}.state_id 必须使用 snake_case")
            elif state_id in excluded_ids:
                errors.append(f"task {task_id}.state_inventory.excluded_states 重复 state_id：{state_id}")
            else:
                excluded_ids.add(state_id)
            if not _text(excluded.get("state_name")):
                errors.append(f"{label} 缺少 state_name")
            if not _text(excluded.get("reason")):
                errors.append(f"{label} 缺少 reason")

        raw_results = inventory.get("results")
        if not isinstance(raw_results, list) or not raw_results:
            errors.append(f"task {task_id}.state_inventory.results 必须是非空数组")
            results: list[dict] = []
        else:
            results = _object_list(raw_results)
            if len(results) != len(raw_results):
                errors.append(f"task {task_id}.state_inventory.results 中每一项必须是对象")
        result_count += len(results)

        seen_states: set[str] = set()
        for result in results:
            state_id = _text(result.get("state_id"))
            label = f"task {task_id}.state_result {state_id or 'unknown'}"
            if not state_id:
                errors.append(f"{label} 缺少 state_id")
            elif not TASK_STATE_ID_RE.fullmatch(state_id):
                errors.append(f"{label}.state_id 必须使用 snake_case")
            elif state_id in seen_states:
                errors.append(f"task {task_id}.state_inventory.results 重复 state_id：{state_id}")
            else:
                seen_states.add(state_id)
            if state_id in excluded_ids:
                errors.append(f"task {task_id} 状态 {state_id} 不能同时出现在 results 与 excluded_states")
            if not _text(result.get("state_name")):
                errors.append(f"{label} 缺少 state_name")

            status = _text(result.get("status"))
            if status not in TASK_STATE_STATUSES:
                errors.append(f"{label}.status 无效")
                continue
            evidence_refs = _string_list(result.get("evidence_ids"))
            _validate_refs(evidence_refs, evidence_ids, f"{label}.evidence_ids", errors)
            for evidence_id in evidence_refs:
                if task_id not in _string_list(evidence_by_id.get(evidence_id, {}).get("task_ids")):
                    errors.append(f"{label} 引用 evidence {evidence_id}，但证据未关联任务 {task_id}")

            if status in {"verified_pass", "issue"}:
                if not _text(result.get("method")):
                    errors.append(f"{label} {status} 缺少 method")
                if not evidence_refs:
                    errors.append(f"{label} {status} 缺少 evidence_ids")
                if not _text(result.get("observation")):
                    errors.append(f"{label} {status} 缺少 observation")
            if status == "issue":
                refs = _string_list(result.get("issue_ids"))
                _validate_refs(refs, issue_ids, f"{label}.issue_ids", errors, required=True)
                for issue_id in refs:
                    issue = issue_by_id.get(issue_id, {})
                    if task_id not in _string_list(issue.get("task_ids")):
                        errors.append(f"{label} 引用 issue {issue_id}，但问题未关联任务 {task_id}")
                    if evidence_refs and not set(evidence_refs) & set(_string_list(issue.get("evidence_ids"))):
                        errors.append(f"{label} 与 issue {issue_id} 没有共同 evidence")
            elif status in {"not_tested", "blocked"}:
                if not _text(result.get("reason")):
                    errors.append(f"{label} {status} 缺少 reason")
                if not _text(result.get("validation_method")):
                    errors.append(f"{label} {status} 缺少 validation_method")

        if _text(task.get("flow_status")) == "completed" and not _task_state_inventory_is_complete(task):
            errors.append(
                f"task {task_id} 标为 completed，但状态清单未确认或仍有 not_tested / blocked"
            )

    return result_count, confirmed_count


def _validate_review_brief(report: dict, errors: list[str]) -> tuple[set[str], dict[str, dict]]:
    brief = report.get("review_brief")
    if not isinstance(brief, dict):
        errors.append("缺少 review_brief 对象")
        return set(), {}
    if _text(brief.get("status")) != "confirmed":
        errors.append("review_brief.status 必须是 confirmed")
    if brief.get("answered_by_user") is not True:
        errors.append("review_brief.answered_by_user 必须是 true；Agent 推断不能代替用户回答")
    for field in (
        "object_scope_purpose",
        "primary_users",
        "user_goal",
        "failure_impact",
        "fixed_constraints",
    ):
        if not _text(brief.get(field)):
            errors.append(f"review_brief 缺少 {field}")
    raw_tasks = brief.get("critical_tasks")
    if not isinstance(raw_tasks, list) or not raw_tasks:
        errors.append("review_brief.critical_tasks 必须是非空对象数组")
        tasks: list[dict] = []
    else:
        tasks = _object_list(raw_tasks)
        if len(tasks) != len(raw_tasks):
            errors.append("review_brief.critical_tasks 中每一项必须是任务对象，不能使用字符串")
    task_ids = _collect_ids(tasks, "review_brief.critical_tasks", errors)
    task_by_id = {_text(item.get("id")): item for item in tasks if _text(item.get("id"))}
    for index, task in enumerate(tasks):
        task_id = _text(task.get("id")) or f"index-{index}"
        for field in ("name", "primary_user", "start_condition", "intended_outcome"):
            if not _text(task.get(field)):
                errors.append(f"review brief task {task_id} 缺少 {field}")
        raw_criteria = task.get("success_criteria")
        criteria = _string_list(raw_criteria)
        if not isinstance(raw_criteria, list) or not criteria or len(criteria) != len(raw_criteria):
            errors.append(f"review brief task {task_id}.success_criteria 必须是非空字符串数组")
    if "success_criteria" in brief:
        errors.append("review_brief.success_criteria 已废弃；成功标准必须写入所属 critical_tasks[] 任务")
    context = brief.get("context")
    if not isinstance(context, dict):
        errors.append("review_brief.context 必须是对象")
        return task_ids, task_by_id
    for field in ("frequency", "display_environment", "data_scale", "time_pressure", "interruption_collaboration"):
        if not _text(context.get(field)):
            errors.append(f"review_brief.context 缺少 {field}")
    return task_ids, task_by_id


def _validate_task_contract_mapping(
    brief_task_ids: set[str],
    brief_task_by_id: dict[str, dict],
    runtime_task_ids: set[str],
    runtime_tasks: list[dict],
    errors: list[str],
) -> int:
    missing_runtime = sorted(brief_task_ids - runtime_task_ids)
    if missing_runtime:
        errors.append(f"scope_inventory.tasks 缺少用户确认任务：{'、'.join(missing_runtime)}")
    unexpected_runtime = sorted(runtime_task_ids - brief_task_ids)
    if unexpected_runtime:
        errors.append(f"scope_inventory.tasks 含未在 review_brief 确认的任务：{'、'.join(unexpected_runtime)}")

    runtime_task_by_id = {_text(item.get("id")): item for item in runtime_tasks if _text(item.get("id"))}
    mapped_count = 0
    for task_id in sorted(brief_task_ids & runtime_task_ids):
        brief_name = _text(brief_task_by_id.get(task_id, {}).get("name"))
        runtime_name = _text(runtime_task_by_id.get(task_id, {}).get("name"))
        if brief_name != runtime_name:
            errors.append(
                f"task {task_id} 名称与 review_brief 不一致：{runtime_name or '缺失'} != {brief_name or '缺失'}"
            )
        else:
            mapped_count += 1
    return mapped_count


def _validate_evidence(
    report: dict,
    surface_ids: set[str],
    task_ids: set[str],
    errors: list[str],
) -> tuple[set[str], list[dict]]:
    evidence = _object_list(report.get("evidence"))
    evidence_ids = _collect_ids(evidence, "evidence", errors)
    for item in evidence:
        evidence_id = _text(item.get("id")) or "unknown"
        if not _text(item.get("type")):
            errors.append(f"evidence {evidence_id} 缺少 type")
        if not _text(item.get("observation")):
            errors.append(f"evidence {evidence_id} 缺少 observation")
        if _text(item.get("confidence")) not in {"high", "medium", "low"}:
            errors.append(f"evidence {evidence_id} confidence 无效")
        _validate_refs(_string_list(item.get("task_ids")), task_ids, f"evidence {evidence_id}.task_ids", errors)
        _validate_refs(_string_list(item.get("surface_ids")), surface_ids, f"evidence {evidence_id}.surface_ids", errors)
    return evidence_ids, evidence


def _validate_cross_page_consistency(
    report: dict,
    surface_ids: set[str],
    evidence_ids: set[str],
    evidence_by_id: dict[str, dict],
    errors: list[str],
) -> str:
    review = report.get("cross_page_consistency")
    if not isinstance(review, dict):
        errors.append("缺少 cross_page_consistency 对象")
        return ""

    status = _text(review.get("status"))
    if status not in CROSS_PAGE_STATUSES:
        errors.append("cross_page_consistency.status 无效")

    raw_reviewed_surfaces = review.get("surface_ids")
    reviewed_surfaces = _string_list(raw_reviewed_surfaces)
    if not isinstance(raw_reviewed_surfaces, list) or len(reviewed_surfaces) != len(raw_reviewed_surfaces):
        errors.append("cross_page_consistency.surface_ids 必须是非空字符串数组")
    _validate_refs(reviewed_surfaces, surface_ids, "cross_page_consistency.surface_ids", errors, required=True)
    missing_surfaces = sorted(surface_ids - set(reviewed_surfaces))
    if missing_surfaces:
        errors.append(f"cross_page_consistency.surface_ids 缺少范围页面：{'、'.join(missing_surfaces)}")
    if len(reviewed_surfaces) != len(set(reviewed_surfaces)):
        errors.append("cross_page_consistency.surface_ids 含重复页面")

    raw_evidence_refs = review.get("evidence_ids")
    evidence_refs = _string_list(raw_evidence_refs)
    if not isinstance(raw_evidence_refs, list) or len(evidence_refs) != len(raw_evidence_refs):
        errors.append("cross_page_consistency.evidence_ids 必须是字符串数组，可为空")
    _validate_refs(
        evidence_refs,
        evidence_ids,
        "cross_page_consistency.evidence_ids",
        errors,
        required=status == "completed",
    )

    if len(surface_ids) < 2:
        if status != "not_applicable":
            errors.append("单页面范围的 cross_page_consistency.status 必须是 not_applicable")
        if not _text(review.get("reason")):
            errors.append("cross_page_consistency 为 not_applicable 时缺少 reason")
        return status

    if status == "not_applicable":
        errors.append("多页面范围不能把 cross_page_consistency 标为 not_applicable")
    if status == "completed":
        if not _text(review.get("observation")):
            errors.append("cross_page_consistency 标为 completed 但缺少 observation")
        evidenced_surfaces: set[str] = set()
        for evidence_id in evidence_refs:
            evidenced_surfaces.update(_string_list(evidence_by_id.get(evidence_id, {}).get("surface_ids")))
        missing_evidence = sorted(surface_ids - evidenced_surfaces)
        if missing_evidence:
            errors.append(
                f"cross_page_consistency.evidence_ids 未覆盖范围页面：{'、'.join(missing_evidence)}"
            )
    elif status in {"partial", "blocked"}:
        if not _text(review.get("reason")):
            errors.append(f"cross_page_consistency 为 {status} 时缺少 reason")
        if not _text(review.get("validation_method")):
            errors.append(f"cross_page_consistency 为 {status} 时缺少 validation_method")
    return status


def _validate_pc_environment_validation(
    report: dict,
    surface_ids: set[str],
    evidence_ids: set[str],
    evidence_by_id: dict[str, dict],
    errors: list[str],
) -> tuple[str, int]:
    validation = report.get("pc_environment_validation")
    if not isinstance(validation, dict):
        errors.append("缺少 pc_environment_validation 对象")
        return "", 0

    status = _text(validation.get("status"))
    if status not in PC_ENVIRONMENT_STATUSES:
        errors.append("pc_environment_validation.status 无效")

    brief = report.get("review_brief") if isinstance(report.get("review_brief"), dict) else {}
    context = brief.get("context") if isinstance(brief.get("context"), dict) else {}
    expected_target = _text(context.get("display_environment"))
    target_environment = _text(validation.get("target_environment"))
    if target_environment != expected_target:
        errors.append("pc_environment_validation.target_environment 必须与 review_brief.context.display_environment 完全一致")

    raw_environments = validation.get("environments")
    if not isinstance(raw_environments, list):
        errors.append("pc_environment_validation.environments 必须是数组")
        environments: list[dict] = []
    else:
        environments = _object_list(raw_environments)
        if len(environments) != len(raw_environments):
            errors.append("pc_environment_validation.environments 中每一项必须是对象")

    _collect_ids(environments, "pc_environment_validation.environments", errors)
    primary_environments: list[dict] = []
    for index, environment in enumerate(environments):
        environment_id = _text(environment.get("id")) or f"index-{index}"
        role = _text(environment.get("role"))
        if role not in PC_ENVIRONMENT_ROLES:
            errors.append(f"PC 环境 {environment_id} role 无效")
        elif role == "primary":
            primary_environments.append(environment)

        for field in ("viewport_width", "viewport_height"):
            value = environment.get(field)
            if type(value) is not int or value <= 0:
                errors.append(f"PC 环境 {environment_id}.{field} 必须是正整数")

        zoom = environment.get("browser_zoom_percent")
        if zoom is not None and (type(zoom) is not int or zoom <= 0):
            errors.append(f"PC 环境 {environment_id}.browser_zoom_percent 必须是正整数或 null")
        if zoom is None and not _text(environment.get("limitations")):
            errors.append(f"PC 环境 {environment_id} 的 browser_zoom_percent 为 null 时必须填写 limitations")
        if not _text(environment.get("window_mode")):
            errors.append(f"PC 环境 {environment_id} 缺少 window_mode")
        if _text(environment.get("capture_source")) not in PC_ENVIRONMENT_CAPTURE_SOURCES:
            errors.append(f"PC 环境 {environment_id} capture_source 无效")
        if not _text(environment.get("observation")):
            errors.append(f"PC 环境 {environment_id} 缺少 observation")

        raw_surface_refs = environment.get("surface_ids")
        surface_refs = _string_list(raw_surface_refs)
        if not isinstance(raw_surface_refs, list) or len(surface_refs) != len(raw_surface_refs):
            errors.append(f"PC 环境 {environment_id}.surface_ids 必须是非空字符串数组")
        _validate_refs(surface_refs, surface_ids, f"PC 环境 {environment_id}.surface_ids", errors, required=True)
        if len(surface_refs) != len(set(surface_refs)):
            errors.append(f"PC 环境 {environment_id}.surface_ids 含重复页面")

        raw_evidence_refs = environment.get("evidence_ids")
        evidence_refs = _string_list(raw_evidence_refs)
        if not isinstance(raw_evidence_refs, list) or len(evidence_refs) != len(raw_evidence_refs):
            errors.append(f"PC 环境 {environment_id}.evidence_ids 必须是非空字符串数组")
        _validate_refs(evidence_refs, evidence_ids, f"PC 环境 {environment_id}.evidence_ids", errors, required=True)

    if status == "completed":
        if len(primary_environments) != 1:
            errors.append("pc_environment_validation.status=completed 时必须且只能有一个 primary 环境")
        else:
            primary = primary_environments[0]
            primary_id = _text(primary.get("id")) or "unknown"
            primary_surfaces = _string_list(primary.get("surface_ids"))
            missing_surfaces = sorted(surface_ids - set(primary_surfaces))
            unexpected_surfaces = sorted(set(primary_surfaces) - surface_ids)
            if missing_surfaces:
                errors.append(f"primary PC 环境 {primary_id}.surface_ids 缺少范围页面：{'、'.join(missing_surfaces)}")
            if unexpected_surfaces:
                errors.append(f"primary PC 环境 {primary_id}.surface_ids 含范围外页面：{'、'.join(unexpected_surfaces)}")
            evidenced_surfaces: set[str] = set()
            for evidence_id in _string_list(primary.get("evidence_ids")):
                evidenced_surfaces.update(_string_list(evidence_by_id.get(evidence_id, {}).get("surface_ids")))
            missing_evidence = sorted(surface_ids - evidenced_surfaces)
            if missing_evidence:
                errors.append(f"primary PC 环境 {primary_id}.evidence_ids 未覆盖范围页面：{'、'.join(missing_evidence)}")
    elif status in {"partial", "blocked"}:
        if not _text(validation.get("reason")):
            errors.append(f"pc_environment_validation 为 {status} 时缺少 reason")
        if not _text(validation.get("validation_method")):
            errors.append(f"pc_environment_validation 为 {status} 时缺少 validation_method")

    return status, len(environments)


def _validate_issues(
    report: dict,
    required_check_ids: set[str],
    surface_ids: set[str],
    task_ids: set[str],
    evidence_ids: set[str],
    evidence_by_id: dict[str, dict],
    errors: list[str],
) -> tuple[set[str], dict[str, dict]]:
    raw = report.get("issues", [])
    if not isinstance(raw, list):
        errors.append("issues 必须是数组，可为空")
        raw = []
    issues = _object_list(raw)
    if len(issues) != len(raw):
        errors.append("issues 中每一项必须是对象")
    issue_ids = _collect_ids(issues, "issues", errors)
    issue_by_id = {_text(item.get("id")): item for item in issues if _text(item.get("id"))}

    required_text = (
        "title",
        "observation",
        "expected_experience",
        "user_impact",
        "severity_reason",
        "design_objective",
        "recommendation_rationale",
    )
    for item in issues:
        issue_id = _text(item.get("id")) or "unknown"
        for field in required_text:
            if not _text(item.get(field)):
                errors.append(f"issue {issue_id} 缺少 {field}")
        severity = _text(item.get("severity")).upper()
        if severity not in SEVERITIES:
            errors.append(f"issue {issue_id} severity 无效")
        if _text(item.get("confidence")) not in CONFIDENCES:
            errors.append(f"issue {issue_id} confidence 必须是 high / medium；low 应进入 validation_backlog")
        track = _text(item.get("evaluation_track"))
        if track not in EVALUATION_TRACKS:
            errors.append(f"issue {issue_id} evaluation_track 无效")

        review_mode = _text(report.get("review_mode")) or "initial"
        issue_origin = _text(item.get("issue_origin"))
        original_issue_id = _text(item.get("original_issue_id"))
        if review_mode == "follow_up":
            if issue_origin not in ISSUE_ORIGINS:
                errors.append(f"issue {issue_id} issue_origin 必须是 baseline / new")
            elif issue_origin == "baseline" and not original_issue_id:
                errors.append(f"issue {issue_id} 来自原报告但缺少 original_issue_id")
            elif issue_origin == "new" and original_issue_id:
                errors.append(f"issue {issue_id} 为新问题，不得包含 original_issue_id")
        elif issue_origin or original_issue_id:
            errors.append(f"issue {issue_id} 仅复查报告可使用 issue_origin / original_issue_id")

        checklist_refs = _string_list(item.get("checklist_ids"))
        task_refs = _string_list(item.get("task_ids"))
        surface_refs = _string_list(item.get("surface_ids"))
        evidence_refs = _string_list(item.get("evidence_ids"))
        _validate_refs(checklist_refs, required_check_ids, f"issue {issue_id}.checklist_ids", errors, required=True)
        _validate_refs(task_refs, task_ids, f"issue {issue_id}.task_ids", errors, required=track == "task")
        _validate_refs(surface_refs, surface_ids, f"issue {issue_id}.surface_ids", errors, required=track in {"visual", "visual_system"})
        _validate_refs(evidence_refs, evidence_ids, f"issue {issue_id}.evidence_ids", errors, required=True)

        impact_basis = _text(item.get("impact_basis"))
        if impact_basis not in IMPACT_BASES:
            errors.append(
                f"issue {issue_id} impact_basis 必须是 expert_inference / observed_user_behavior / behavioral_data"
            )
        if not _text(item.get("impact_basis_rationale")):
            errors.append(f"issue {issue_id} 缺少 impact_basis_rationale")
        impact_evidence_refs = _string_list(item.get("impact_evidence_ids"))
        _validate_refs(
            impact_evidence_refs,
            evidence_ids,
            f"issue {issue_id}.impact_evidence_ids",
            errors,
            required=True,
        )
        extra_impact_evidence = sorted(set(impact_evidence_refs) - set(evidence_refs))
        if extra_impact_evidence:
            errors.append(
                f"issue {issue_id}.impact_evidence_ids 必须属于问题顶层 evidence_ids：{'、'.join(extra_impact_evidence)}"
            )
        required_evidence_type = IMPACT_EVIDENCE_TYPES.get(impact_basis)
        if required_evidence_type and not any(
            _text(evidence_by_id.get(evidence_id, {}).get("type")) == required_evidence_type
            for evidence_id in impact_evidence_refs
        ):
            errors.append(
                f"issue {issue_id} impact_basis={impact_basis} 至少需要一条 type={required_evidence_type} 的影响证据"
            )

        raw_occurrences = item.get("occurrences", [])
        if not isinstance(raw_occurrences, list):
            errors.append(f"issue {issue_id}.occurrences 必须是数组")
            raw_occurrences = []
        occurrences = _object_list(raw_occurrences)
        if len(occurrences) != len(raw_occurrences):
            errors.append(f"issue {issue_id}.occurrences 中每一项必须是对象")
        requires_occurrences = len(task_refs) > 1 or len(surface_refs) > 1 or track == "visual_system"
        if requires_occurrences and not occurrences:
            errors.append(f"issue {issue_id} 为多页面、多任务或系统性问题，缺少 occurrences")
        if track == "visual_system" and len(surface_refs) < 2:
            errors.append(f"issue {issue_id} 为 visual_system，必须关联至少两个 surface")

        occurrence_ids: set[str] = set()
        covered_tasks: set[str] = set()
        covered_surfaces: set[str] = set()
        for occurrence in occurrences:
            occurrence_id = _text(occurrence.get("id"))
            label = f"issue {issue_id}.occurrence {occurrence_id or 'unknown'}"
            if not occurrence_id:
                errors.append(f"issue {issue_id}.occurrence 缺少 id")
            elif occurrence_id in occurrence_ids:
                errors.append(f"issue {issue_id}.occurrences 含重复 id：{occurrence_id}")
            else:
                occurrence_ids.add(occurrence_id)
            occurrence_tasks = _string_list(occurrence.get("task_ids"))
            occurrence_surfaces = _string_list(occurrence.get("surface_ids"))
            occurrence_evidence = _string_list(occurrence.get("evidence_ids"))
            if not occurrence_tasks and not occurrence_surfaces:
                errors.append(f"{label} 至少关联 task 或 surface")
            _validate_refs(occurrence_tasks, task_ids, f"{label}.task_ids", errors)
            _validate_refs(occurrence_surfaces, surface_ids, f"{label}.surface_ids", errors)
            _validate_refs(occurrence_evidence, evidence_ids, f"{label}.evidence_ids", errors, required=True)
            if set(occurrence_tasks) - set(task_refs):
                errors.append(f"{label}.task_ids 必须属于问题顶层 task_ids")
            if set(occurrence_surfaces) - set(surface_refs):
                errors.append(f"{label}.surface_ids 必须属于问题顶层 surface_ids")
            if set(occurrence_evidence) - set(evidence_refs):
                errors.append(f"{label}.evidence_ids 必须属于问题顶层 evidence_ids")
            if not _text(occurrence.get("state")):
                errors.append(f"{label} 缺少 state")
            if not _text(occurrence.get("observation")):
                errors.append(f"{label} 缺少 observation")
            covered_tasks.update(occurrence_tasks)
            covered_surfaces.update(occurrence_surfaces)
        if occurrences:
            missing_tasks = sorted(set(task_refs) - covered_tasks)
            missing_surfaces = sorted(set(surface_refs) - covered_surfaces)
            if missing_tasks:
                errors.append(f"issue {issue_id}.occurrences 未覆盖顶层 task：{'、'.join(missing_tasks)}")
            if missing_surfaces:
                errors.append(f"issue {issue_id}.occurrences 未覆盖顶层 surface：{'、'.join(missing_surfaces)}")

        if not _string_list(item.get("affected_users")):
            errors.append(f"issue {issue_id} 缺少 affected_users")
        if not _string_list(item.get("reproduction")):
            errors.append(f"issue {issue_id} 缺少 reproduction")
        if not _string_list(item.get("recommendation")):
            errors.append(f"issue {issue_id} 缺少 recommendation")
        if not _string_list(item.get("acceptance_criteria")):
            errors.append(f"issue {issue_id} 缺少 acceptance_criteria")
        if severity in {"P0", "P1"} or track == "visual_system":
            if not _string_list(item.get("constraints_tradeoffs")):
                errors.append(f"issue {issue_id} 为 P0/P1 或系统性问题，缺少 constraints_tradeoffs")
        for optional_list in ("constraints_tradeoffs", "alternatives"):
            if optional_list in item and not isinstance(item.get(optional_list), list):
                errors.append(f"issue {issue_id}.{optional_list} 必须是数组")

        assessment = item.get("severity_assessment")
        if not isinstance(assessment, dict):
            errors.append(f"issue {issue_id} 缺少 severity_assessment")
        else:
            for field, allowed in ASSESSMENT_VALUES.items():
                if _text(assessment.get(field)) not in allowed:
                    errors.append(f"issue {issue_id} severity_assessment.{field} 无效")

    return issue_ids, issue_by_id


def _validate_backlog(
    report: dict,
    required_check_ids: set[str],
    surface_ids: set[str],
    task_ids: set[str],
    errors: list[str],
) -> None:
    raw = report.get("validation_backlog", [])
    if not isinstance(raw, list):
        errors.append("validation_backlog 必须是数组")
        return
    risks = _object_list(raw)
    _collect_ids(risks, "validation_backlog", errors)
    for item in risks:
        risk_id = _text(item.get("id")) or "unknown"
        for field in ("title", "reason", "potential_impact", "validation_method"):
            if not _text(item.get(field)):
                errors.append(f"risk {risk_id} 缺少 {field}")
        if _text(item.get("potential_severity")).upper() not in SEVERITIES:
            errors.append(f"risk {risk_id} potential_severity 无效")
        if _text(item.get("validation_priority")) not in {"high", "medium", "low"}:
            errors.append(f"risk {risk_id} validation_priority 无效")
        if "severity" in item:
            errors.append(f"risk {risk_id} 不得使用 severity；请使用 potential_severity")
        _validate_refs(_string_list(item.get("checklist_ids")), required_check_ids, f"risk {risk_id}.checklist_ids", errors, required=True)
        _validate_refs(_string_list(item.get("task_ids")), task_ids, f"risk {risk_id}.task_ids", errors)
        _validate_refs(_string_list(item.get("surface_ids")), surface_ids, f"risk {risk_id}.surface_ids", errors)


def _required_packs(report: dict, errors: list[str]) -> tuple[list[str], list[str], dict[str, str]]:
    packs = _string_list(report.get("activated_packs"))
    if not packs:
        errors.append("activated_packs 必须是非空数组")
    for pack in MANDATORY_PACKS:
        if pack not in packs:
            errors.append(f"activated_packs 缺少必需模块：{pack}")
    unknown = sorted(set(packs) - set(PACK_FILES))
    if unknown:
        errors.append(f"activated_packs 含未知模块：{'、'.join(unknown)}")

    ids: list[str] = []
    target_types: dict[str, str] = {}
    for pack in packs:
        if pack not in PACK_FILES:
            continue
        try:
            pack_ids = load_pack_ids(pack)
            ids.extend(pack_ids)
            target_types.update({check_id: PACK_TARGET_TYPES[pack] for check_id in pack_ids})
        except (OSError, ValueError) as exc:
            errors.append(str(exc))
    return packs, ids, target_types


def _validate_coverage(
    report: dict,
    required_ids: list[str],
    target_types: dict[str, str],
    issue_ids: set[str],
    issue_by_id: dict[str, dict],
    surface_ids: set[str],
    task_ids: set[str],
    evidence_ids: set[str],
    evidence_by_id: dict[str, dict],
    errors: list[str],
) -> None:
    coverage = report.get("coverage")
    if not isinstance(coverage, dict):
        errors.append("coverage 必须是对象")
        return
    required_set = set(required_ids)
    missing = [item_id for item_id in required_ids if item_id not in coverage]
    if missing:
        errors.append(f"coverage 缺少检查项：{'、'.join(missing[:8])}" + (f" 等共 {len(missing)} 条" if len(missing) > 8 else ""))
    extra = sorted(set(coverage) - required_set)
    if extra:
        errors.append(f"coverage 含未启用检查项：{'、'.join(extra)}")

    result_index: dict[tuple[str, str], dict] = {}
    for check_id in required_ids:
        entry = coverage.get(check_id)
        if not isinstance(entry, dict):
            errors.append(f"coverage.{check_id} 必须是对象")
            continue
        expected_target_type = target_types.get(check_id, "")
        target_type = _text(entry.get("target_type"))
        if target_type != expected_target_type:
            errors.append(f"coverage.{check_id}.target_type 必须是 {expected_target_type}")
        expected_targets = surface_ids if expected_target_type == "surface" else task_ids
        raw_results = entry.get("results")
        if not isinstance(raw_results, list) or not raw_results:
            errors.append(f"coverage.{check_id}.results 必须是非空数组")
            continue
        results = _object_list(raw_results)
        if len(results) != len(raw_results):
            errors.append(f"coverage.{check_id}.results 中每一项必须是对象")
        seen_targets: set[str] = set()
        for result in results:
            target_id = _text(result.get("target_id"))
            label = f"coverage.{check_id}.results[{target_id or 'unknown'}]"
            if not target_id:
                errors.append(f"{label} 缺少 target_id")
                continue
            if target_id in seen_targets:
                errors.append(f"coverage.{check_id}.results 重复 target_id：{target_id}")
            else:
                seen_targets.add(target_id)
                result_index[(check_id, target_id)] = result
            if target_id not in expected_targets:
                errors.append(f"{label}.target_id 引用不存在或目标类型错误：{target_id}")

            status = _text(result.get("status"))
            if status not in COVERAGE_STATUSES:
                errors.append(f"{label}.status 无效")
                continue
            evidence_refs = _string_list(result.get("evidence_ids"))
            _validate_refs(evidence_refs, evidence_ids, f"{label}.evidence_ids", errors)
            for evidence_id in evidence_refs:
                evidence = evidence_by_id.get(evidence_id, {})
                target_field = "surface_ids" if expected_target_type == "surface" else "task_ids"
                if target_id not in _string_list(evidence.get(target_field)):
                    errors.append(f"{label} 引用 evidence {evidence_id}，但证据未关联目标 {target_id}")

            if status == "verified_pass":
                if not _text(result.get("method")):
                    errors.append(f"{label} verified_pass 缺少 method")
                if not evidence_refs:
                    errors.append(f"{label} verified_pass 缺少 evidence_ids")
                if not _text(result.get("observation")):
                    errors.append(f"{label} verified_pass 缺少 observation")
            elif status == "issue":
                refs = _string_list(result.get("issue_ids"))
                _validate_refs(refs, issue_ids, f"{label}.issue_ids", errors, required=True)
                if not evidence_refs:
                    errors.append(f"{label} issue 缺少 evidence_ids")
                for issue_id in refs:
                    issue = issue_by_id.get(issue_id, {})
                    if check_id not in _string_list(issue.get("checklist_ids")):
                        errors.append(f"{label} 引用 issue {issue_id}，但问题未反向引用该检查项")
                    issue_targets = _string_list(
                        issue.get("surface_ids" if expected_target_type == "surface" else "task_ids")
                    )
                    if target_id not in issue_targets:
                        errors.append(f"{label} 引用 issue {issue_id}，但问题未关联目标 {target_id}")
            elif status in {"not_tested", "not_applicable"}:
                if not _text(result.get("reason")):
                    errors.append(f"{label} {status} 缺少 reason")
            elif status == "blocked":
                if not _text(result.get("reason")):
                    errors.append(f"{label} blocked 缺少 reason")
                if not _text(result.get("validation_method")):
                    errors.append(f"{label} blocked 缺少 validation_method")

        missing_targets = sorted(expected_targets - seen_targets)
        extra_targets = sorted(seen_targets - expected_targets)
        if missing_targets:
            errors.append(f"coverage.{check_id}.results 缺少目标：{'、'.join(missing_targets)}")
        if extra_targets:
            errors.append(f"coverage.{check_id}.results 含额外目标：{'、'.join(extra_targets)}")

    for issue_id, issue in issue_by_id.items():
        for check_id in _string_list(issue.get("checklist_ids")):
            target_type = target_types.get(check_id, "")
            issue_targets = _string_list(issue.get("surface_ids" if target_type == "surface" else "task_ids"))
            if not issue_targets:
                errors.append(f"issue {issue_id} 引用 {check_id}，但缺少对应 {target_type} 目标")
            for target_id in issue_targets:
                result = result_index.get((check_id, target_id), {})
                if _text(result.get("status")) != "issue":
                    errors.append(f"issue {issue_id} 引用 {check_id}/{target_id}，但对应 coverage 结果未标 issue")
                elif issue_id not in _string_list(result.get("issue_ids")):
                    errors.append(f"issue {issue_id} 未出现在 coverage.{check_id}/{target_id}.issue_ids")


def _validate_supplemental_findings(
    report: dict,
    required_check_ids: set[str],
    surface_ids: set[str],
    task_ids: set[str],
    evidence_ids: set[str],
    errors: list[str],
) -> None:
    specifications = {
        "positive_patterns": ("observation", "user_value", "preservation_guidance"),
        "opportunities": ("current_state", "why_not_issue", "expected_value", "applicability", "design_direction"),
    }
    for field, required_text in specifications.items():
        raw = report.get(field, [])
        if not isinstance(raw, list):
            errors.append(f"{field} 必须是数组，可为空")
            continue
        items = _object_list(raw)
        if len(items) != len(raw):
            errors.append(f"{field} 中每一项必须是对象")
        _collect_ids(items, field, errors)
        for item in items:
            item_id = _text(item.get("id")) or "unknown"
            label = f"{field} {item_id}"
            if not _text(item.get("title")):
                errors.append(f"{label} 缺少 title")
            for text_field in required_text:
                if not _text(item.get(text_field)):
                    errors.append(f"{label} 缺少 {text_field}")
            checklist_refs = _string_list(item.get("checklist_ids"))
            task_refs = _string_list(item.get("task_ids"))
            surface_refs = _string_list(item.get("surface_ids"))
            evidence_refs = _string_list(item.get("evidence_ids"))
            _validate_refs(checklist_refs, required_check_ids, f"{label}.checklist_ids", errors, required=True)
            _validate_refs(task_refs, task_ids, f"{label}.task_ids", errors)
            _validate_refs(surface_refs, surface_ids, f"{label}.surface_ids", errors)
            _validate_refs(evidence_refs, evidence_ids, f"{label}.evidence_ids", errors, required=True)
            if not task_refs and not surface_refs:
                errors.append(f"{label} 至少关联 task 或 surface")
            for forbidden in ("severity", "potential_severity", "validation_priority"):
                if forbidden in item:
                    errors.append(f"{label} 不得包含 {forbidden}；正向模式与增强机会不参与问题定级")


def _validate_follow_up_review(
    report: dict,
    issue_by_id: dict[str, dict],
    surface_ids: set[str],
    task_ids: set[str],
    evidence_ids: set[str],
    errors: list[str],
) -> tuple[str, int]:
    review_mode = _text(report.get("review_mode")) or "initial"
    if review_mode not in REVIEW_MODES:
        errors.append("review_mode 必须是 initial / follow_up")
        return review_mode, 0

    follow_up = report.get("follow_up_review")
    if review_mode == "initial":
        if follow_up is not None:
            errors.append("review_mode=initial 不得包含 follow_up_review")
        return review_mode, 0

    if not isinstance(follow_up, dict):
        errors.append("review_mode=follow_up 必须包含 follow_up_review 对象")
        return review_mode, 0

    baseline = follow_up.get("baseline_report")
    if not isinstance(baseline, dict):
        errors.append("follow_up_review 缺少 baseline_report 对象")
    else:
        for field in ("title", "generated_at"):
            if not _text(baseline.get(field)):
                errors.append(f"follow_up_review.baseline_report 缺少 {field}")

    brief_status = _text(follow_up.get("brief_change_status"))
    if brief_status not in {"unchanged", "changed"}:
        errors.append("follow_up_review.brief_change_status 必须是 unchanged / changed")
    raw_changes = follow_up.get("brief_changes", [])
    changes = _string_list(raw_changes)
    if not isinstance(raw_changes, list) or len(changes) != len(raw_changes):
        errors.append("follow_up_review.brief_changes 必须是字符串数组")
    if brief_status == "changed" and not changes:
        errors.append("follow_up_review 前提发生变化时必须填写 brief_changes")
    if brief_status == "unchanged" and changes:
        errors.append("follow_up_review 前提未变化时 brief_changes 应为空")

    if _text(follow_up.get("scope_type")) not in {"targeted", "full"}:
        errors.append("follow_up_review.scope_type 必须是 targeted / full")

    raw_results = follow_up.get("issue_results")
    if not isinstance(raw_results, list) or not raw_results:
        errors.append("follow_up_review.issue_results 必须是非空数组")
        results: list[dict] = []
    else:
        results = _object_list(raw_results)
        if len(results) != len(raw_results):
            errors.append("follow_up_review.issue_results 中每一项必须是对象")
    _collect_ids(results, "follow_up_review.issue_results", errors)

    reviewed_tasks: set[str] = set()
    reviewed_surfaces: set[str] = set()
    result_by_original: dict[str, dict] = {}
    for item in results:
        result_id = _text(item.get("id")) or "unknown"
        label = f"follow_up_review.issue_result {result_id}"
        original_issue_id = _text(item.get("original_issue_id"))
        if not original_issue_id:
            errors.append(f"{label} 缺少 original_issue_id")
        elif original_issue_id in result_by_original:
            errors.append(f"follow_up_review.issue_results 重复复查原问题：{original_issue_id}")
        else:
            result_by_original[original_issue_id] = item
        for field in ("title", "conclusion"):
            if not _text(item.get(field)):
                errors.append(f"{label} 缺少 {field}")

        status = _text(item.get("status"))
        if status not in FOLLOW_UP_STATUSES:
            errors.append(f"{label}.status 无效")
        item_tasks = _string_list(item.get("task_ids"))
        item_surfaces = _string_list(item.get("surface_ids"))
        _validate_refs(item_tasks, task_ids, f"{label}.task_ids", errors)
        _validate_refs(item_surfaces, surface_ids, f"{label}.surface_ids", errors)
        if not item_tasks and not item_surfaces:
            errors.append(f"{label} 至少关联 task 或 surface")
        reviewed_tasks.update(item_tasks)
        reviewed_surfaces.update(item_surfaces)

        raw_acceptance = item.get("acceptance_results")
        if not isinstance(raw_acceptance, list) or not raw_acceptance:
            errors.append(f"{label}.acceptance_results 必须是非空数组")
            acceptance: list[dict] = []
        else:
            acceptance = _object_list(raw_acceptance)
            if len(acceptance) != len(raw_acceptance):
                errors.append(f"{label}.acceptance_results 中每一项必须是对象")
        criteria: set[str] = set()
        acceptance_values: list[str] = []
        for entry in acceptance:
            criterion = _text(entry.get("criterion"))
            if not criterion:
                errors.append(f"{label}.acceptance_results 缺少 criterion")
            elif criterion in criteria:
                errors.append(f"{label}.acceptance_results 重复验收标准：{criterion}")
            else:
                criteria.add(criterion)
            acceptance_result = _text(entry.get("result"))
            acceptance_values.append(acceptance_result)
            if acceptance_result not in ACCEPTANCE_RESULTS:
                errors.append(f"{label}.acceptance_results result 无效")
                continue
            entry_evidence = _string_list(entry.get("evidence_ids"))
            _validate_refs(
                entry_evidence,
                evidence_ids,
                f"{label}.acceptance_results.evidence_ids",
                errors,
                required=acceptance_result in {"passed", "failed"},
            )
            if acceptance_result in {"passed", "failed"} and not _text(entry.get("observation")):
                errors.append(f"{label}.acceptance_results {acceptance_result} 缺少 observation")
            if acceptance_result == "not_verified":
                if not _text(entry.get("reason")):
                    errors.append(f"{label}.acceptance_results not_verified 缺少 reason")
                if not _text(entry.get("validation_method")):
                    errors.append(f"{label}.acceptance_results not_verified 缺少 validation_method")

        if status == "resolved" and (not acceptance_values or any(value != "passed" for value in acceptance_values)):
            errors.append(f"{label} 标为 resolved 时全部验收标准必须 passed")
        if status == "partially_resolved" and not (
            "passed" in acceptance_values and any(value in {"failed", "not_verified"} for value in acceptance_values)
        ):
            errors.append(f"{label} 标为 partially_resolved 时须同时包含 passed 与 failed/not_verified")
        if status == "unresolved" and not (
            "passed" not in acceptance_values and "failed" in acceptance_values
        ):
            errors.append(f"{label} 标为 unresolved 时不得有 passed，且至少一项 failed")
        if status == "cannot_verify" and (
            not acceptance_values or any(value != "not_verified" for value in acceptance_values)
        ):
            errors.append(f"{label} 标为 cannot_verify 时全部验收标准必须 not_verified")

        current_issue_id = _text(item.get("current_issue_id"))
        if status in {"partially_resolved", "unresolved"}:
            if not current_issue_id:
                errors.append(f"{label} 为 {status}，缺少 current_issue_id")
            elif current_issue_id not in issue_by_id:
                errors.append(f"{label}.current_issue_id 引用不存在：{current_issue_id}")
            else:
                current_issue = issue_by_id[current_issue_id]
                if _text(current_issue.get("issue_origin")) != "baseline":
                    errors.append(f"{label}.current_issue_id 必须指向 issue_origin=baseline 的当前问题")
                if _text(current_issue.get("original_issue_id")) != original_issue_id:
                    errors.append(f"{label}.current_issue_id 与 original_issue_id 不一致")
        elif current_issue_id:
            errors.append(f"{label} 为 {status}，不得包含 current_issue_id")

    for current_issue_id, issue in issue_by_id.items():
        if _text(issue.get("issue_origin")) != "baseline":
            continue
        original_issue_id = _text(issue.get("original_issue_id"))
        result = result_by_original.get(original_issue_id)
        if not result:
            errors.append(f"issue {current_issue_id} 来自原报告，但 follow_up_review 未记录对应复查结果")
        elif _text(result.get("current_issue_id")) != current_issue_id:
            errors.append(f"issue {current_issue_id} 未被对应复查结果的 current_issue_id 引用")

    regression = follow_up.get("regression_check")
    new_issue_ids = {
        issue_id for issue_id, issue in issue_by_id.items() if _text(issue.get("issue_origin")) == "new"
    }
    if not isinstance(regression, dict):
        errors.append("follow_up_review 缺少 regression_check 对象")
    else:
        regression_tasks = _string_list(regression.get("task_ids"))
        regression_surfaces = _string_list(regression.get("surface_ids"))
        regression_evidence = _string_list(regression.get("evidence_ids"))
        _validate_refs(regression_tasks, task_ids, "follow_up_review.regression_check.task_ids", errors)
        _validate_refs(regression_surfaces, surface_ids, "follow_up_review.regression_check.surface_ids", errors)
        _validate_refs(
            regression_evidence,
            evidence_ids,
            "follow_up_review.regression_check.evidence_ids",
            errors,
            required=True,
        )
        if not regression_tasks and not regression_surfaces:
            errors.append("follow_up_review.regression_check 至少关联 task 或 surface")
        missing_tasks = sorted(reviewed_tasks - set(regression_tasks))
        missing_surfaces = sorted(reviewed_surfaces - set(regression_surfaces))
        if missing_tasks:
            errors.append(f"follow_up_review.regression_check 未覆盖复查任务：{'、'.join(missing_tasks)}")
        if missing_surfaces:
            errors.append(f"follow_up_review.regression_check 未覆盖复查页面：{'、'.join(missing_surfaces)}")
        if not _text(regression.get("observation")):
            errors.append("follow_up_review.regression_check 缺少 observation")
        regression_result = _text(regression.get("result"))
        if regression_result not in {"passed", "issues_found", "partial"}:
            errors.append("follow_up_review.regression_check.result 无效")
        if regression_result == "passed" and new_issue_ids:
            errors.append("回归检查标为 passed，但存在 issue_origin=new 的问题")
        if regression_result == "issues_found" and not new_issue_ids:
            errors.append("回归检查标为 issues_found，但没有 issue_origin=new 的问题")
        if regression_result == "partial" and _text(report.get("report_status")) != "partial":
            errors.append("回归检查为 partial 时 report_status 必须是 partial")

    return review_mode, len(results)


def _validate_report_status(
    report: dict,
    surfaces: list[dict],
    tasks: list[dict],
    required_ids: list[str],
    errors: list[str],
) -> None:
    status = _text(report.get("report_status"))
    if status not in {"complete", "partial"}:
        errors.append("report_status 必须是 complete / partial")
        return
    title = _text(report.get("title"))
    if not title:
        errors.append("title 不得为空")
    if status == "partial" and "阶段性" not in title:
        errors.append("report_status=partial 时标题必须包含“阶段性”")
    evidence = _object_list(report.get("evidence"))
    if not evidence:
        errors.append(f"report_status={status} 至少需要一条有效 evidence；无有效证据时应判 blocked 且不输出正式报告")
    all_surfaces = bool(surfaces) and all(_text(item.get("visual_status")) == "completed" for item in surfaces)
    all_tasks = bool(tasks) and all(
        _text(item.get("flow_status")) == "completed" and _task_state_inventory_is_complete(item)
        for item in tasks
    )
    coverage = report.get("coverage", {}) if isinstance(report.get("coverage"), dict) else {}
    coverage_complete = all(
        isinstance(coverage.get(item_id), dict)
        and bool(_object_list(coverage[item_id].get("results")))
        and all(
            _text(result.get("status")) in {"verified_pass", "issue", "not_applicable"}
            for result in _object_list(coverage[item_id].get("results"))
        )
        for item_id in required_ids
    )
    inventory = report.get("scope_inventory") if isinstance(report.get("scope_inventory"), dict) else {}
    inventory_confirmed = _text(inventory.get("inventory_completeness")) == "confirmed"
    cross_page = report.get("cross_page_consistency") if isinstance(report.get("cross_page_consistency"), dict) else {}
    expected_cross_page_status = "not_applicable" if len(surfaces) < 2 else "completed"
    cross_page_complete = _text(cross_page.get("status")) == expected_cross_page_status
    pc_environment = (
        report.get("pc_environment_validation")
        if isinstance(report.get("pc_environment_validation"), dict)
        else {}
    )
    pc_environment_complete = _text(pc_environment.get("status")) == "completed"
    fully_complete = (
        inventory_confirmed
        and pc_environment_complete
        and all_surfaces
        and all_tasks
        and coverage_complete
        and cross_page_complete
    )
    if status == "complete" and not fully_complete:
        errors.append("report_status=complete 但页面清单、主要 PC 环境、页面视觉、跨页面对比、任务状态清单或 coverage 仍未全部完成")
    if status == "partial" and fully_complete:
        errors.append("页面清单、主要 PC 环境、页面视觉、跨页面对比、任务状态清单和 coverage 均已完成，应使用 report_status=complete")


def validate_report(report: dict) -> dict:
    errors: list[str] = []
    if report.get("schema_version") != 7:
        errors.append("schema_version 必须是 7")

    brief_task_ids, brief_task_by_id = _validate_review_brief(report, errors)
    packs, required_ids, target_types = _required_packs(report, errors)
    surface_ids, task_ids, surfaces, tasks = _validate_inventory(report, errors)
    mapped_task_count = _validate_task_contract_mapping(
        brief_task_ids, brief_task_by_id, task_ids, tasks, errors
    )
    evidence_ids, evidence = _validate_evidence(report, surface_ids, task_ids, errors)
    evidence_by_id = {_text(item.get("id")): item for item in evidence if _text(item.get("id"))}
    pc_environment_validation_status, pc_environment_count = _validate_pc_environment_validation(
        report, surface_ids, evidence_ids, evidence_by_id, errors
    )
    cross_page_consistency_status = _validate_cross_page_consistency(
        report, surface_ids, evidence_ids, evidence_by_id, errors
    )

    for item in surfaces:
        _validate_refs(_string_list(item.get("evidence_ids")), evidence_ids, f"surface {_text(item.get('id'))}.evidence_ids", errors)
    for item in tasks:
        _validate_refs(_string_list(item.get("evidence_ids")), evidence_ids, f"task {_text(item.get('id'))}.evidence_ids", errors)

    required_set = set(required_ids)
    issue_ids, issue_by_id = _validate_issues(
        report, required_set, surface_ids, task_ids, evidence_ids, evidence_by_id, errors
    )
    task_state_result_count, confirmed_state_inventory_count = _validate_task_state_inventories(
        tasks, evidence_ids, evidence_by_id, issue_ids, issue_by_id, errors
    )
    _validate_backlog(report, required_set, surface_ids, task_ids, errors)
    _validate_supplemental_findings(report, required_set, surface_ids, task_ids, evidence_ids, errors)
    review_mode, follow_up_result_count = _validate_follow_up_review(
        report, issue_by_id, surface_ids, task_ids, evidence_ids, errors
    )
    _validate_coverage(
        report,
        required_ids,
        target_types,
        issue_ids,
        issue_by_id,
        surface_ids,
        task_ids,
        evidence_ids,
        evidence_by_id,
        errors,
    )
    _validate_report_status(report, surfaces, tasks, required_ids, errors)

    if _text(report.get("source")).lower() not in {"code", "url", "screenshot"}:
        errors.append("source 必须是 code / url / screenshot")
    impact_basis_counts = {
        basis: sum(_text(issue.get("impact_basis")) == basis for issue in issue_by_id.values())
        for basis in sorted(IMPACT_BASES)
    }
    inventory = report.get("scope_inventory") if isinstance(report.get("scope_inventory"), dict) else {}
    coverage = report.get("coverage") if isinstance(report.get("coverage"), dict) else {}
    coverage_target_result_count = sum(
        len(_object_list(entry.get("results"))) for entry in coverage.values() if isinstance(entry, dict)
    )
    return {
        "activated_packs": packs,
        "brief_task_count": len(brief_task_ids),
        "coverage_count": len(report.get("coverage", {})) if isinstance(report.get("coverage"), dict) else 0,
        "coverage_target_result_count": coverage_target_result_count,
        "cross_page_consistency_status": cross_page_consistency_status,
        "errors": errors,
        "evidence_count": len(evidence),
        "follow_up_result_count": follow_up_result_count,
        "issue_count": len(issue_ids),
        "impact_basis_counts": impact_basis_counts,
        "inventory_basis_count": len(_object_list(inventory.get("inventory_basis"))),
        "inventory_completeness": _text(inventory.get("inventory_completeness")),
        "mapped_task_count": mapped_task_count,
        "excluded_surface_count": len(_object_list(inventory.get("excluded_surfaces"))),
        "opportunity_count": len(_object_list(report.get("opportunities"))),
        "positive_pattern_count": len(_object_list(report.get("positive_patterns"))),
        "pc_environment_count": pc_environment_count,
        "pc_environment_validation_status": pc_environment_validation_status,
        "ok": not errors,
        "report_status": _text(report.get("report_status")),
        "review_mode": review_mode,
        "required_count": len(required_ids),
        "schema_version": report.get("schema_version"),
        "surface_count": len(surfaces),
        "task_count": len(tasks),
        "task_state_result_count": task_state_result_count,
        "confirmed_state_inventory_count": confirmed_state_inventory_count,
    }


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="校验 ux-walkthrough v7 report.json")
    parser.add_argument("--report-json", required=True)
    parser.add_argument("--json", action="store_true")
    return parser


def main() -> int:
    args = _build_parser().parse_args()
    path = Path(args.report_json).expanduser().resolve()
    try:
        report = json.loads(path.read_text(encoding="utf-8"))
        result = validate_report(report) if isinstance(report, dict) else {"ok": False, "errors": ["根节点必须是对象"]}
    except (OSError, json.JSONDecodeError) as exc:
        result = {"ok": False, "errors": [f"无法读取 report.json：{exc}"]}
    result["report_json"] = str(path)
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    elif result.get("ok"):
        print("OK: v7 report coverage gate passed")
    else:
        print("\n".join(result.get("errors", [])))
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
