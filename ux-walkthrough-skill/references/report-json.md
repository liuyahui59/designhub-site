# v7 结构化报告约定

`report.json` 是 Markdown、校验器和 DOCX 的共同数据源。完整示例见 `tests/fixtures/report/minimal-report.json`。

## 顶层结构

```json
{
  "schema_version": 7,
  "title": "订单后台完整体验走查报告",
  "project": "订单后台",
  "source": "url",
  "review_mode": "initial",
  "report_status": "complete",
  "generated_at": "2026-08-21T12:00:00+08:00",
  "scope": "订单列表、详情和批量处理",
  "review_brief": {},
  "activated_packs": ["core", "visual", "accessibility-pc"],
  "scope_inventory": {
    "inventory_basis": [],
    "inventory_completeness": "confirmed",
    "completeness_reason": "",
    "excluded_surfaces": [],
    "surfaces": [],
    "tasks": []
  },
  "pc_environment_validation": {},
  "cross_page_consistency": {},
  "evidence": [],
  "coverage": {},
  "summary": {},
  "issues": [],
  "validation_backlog": [],
  "positive_patterns": [],
  "opportunities": [],
  "appendix": {}
}
```

`review_mode` 只允许 `initial / follow_up`；省略时按 `initial` 兼容。`initial` 省略 `follow_up_review` 或设为 `null`，`follow_up` 必须按下文提供完整对象。

## Review Brief

`review_brief` 必须符合 `review-brief.md`：`status=confirmed`、`answered_by_user=true`，并包含对象范围、主要用户、用户目标、关键任务契约、PC 使用情境（含常用屏幕与窗口方式）、失败影响与业务约束。

每条关键任务按 `task-contract.md` 直接绑定自己的主要用户、起点、目标结果和成功标准：

```json
"critical_tasks": [
  {
    "id": "TASK-01",
    "name": "批量处理异常订单",
    "primary_user": "内部运营人员",
    "start_condition": "从订单列表进入异常订单处理",
    "intended_outcome": "完成批量处理并确认每条订单结果",
    "success_criteria": [
      "成功数量与失败明细明确",
      "失败订单可直接修改并重试"
    ]
  }
]
```

不得再使用全局 `review_brief.success_criteria[]`。`scope_inventory.tasks[]` 必须与 `critical_tasks[]` 使用完全相同的任务 ID 集合，相同 ID 的名称也必须一致。

## 启用模块

固定包含：

```json
["core", "visual", "accessibility-pc"]
```

符合触发条件时加入 `object-lifecycle / form-configuration / analytics-dashboard / navigation-information-architecture`。Coverage 必须包含全部已启用模块 ID，未验证使用 `not_tested / blocked`，不能省略。

## 页面与任务清单

```json
"scope_inventory": {
  "inventory_basis": [
    {
      "id": "BASIS-01",
      "type": "user_confirmed_scope",
      "description": "用户明确限定为订单列表、详情和批量处理流程"
    },
    {
      "id": "BASIS-02",
      "type": "navigation_traversal",
      "description": "已遍历订单模块菜单、列表入口、详情入口和批量结果弹层"
    }
  ],
  "inventory_completeness": "confirmed",
  "completeness_reason": "用户指定范围均能映射到实际入口，未发现未解释的页面缺口。",
  "excluded_surfaces": [
    {
      "id": "EXCLUDED-01",
      "name": "登录页",
      "reason_code": "outside_user_scope",
      "reason": "用户明确不检查登录流程"
    }
  ],
  "surfaces": [
    {
      "id": "PAGE-01",
      "name": "订单列表",
      "visual_status": "completed",
      "evidence_ids": ["EV-01"]
    }
  ],
  "tasks": [
    {
      "id": "TASK-01",
      "name": "批量处理异常订单",
      "flow_status": "completed",
      "state_inventory": {
        "inventory_basis": [
          {
            "type": "interaction_path",
            "description": "实际完成批量选择、提交、部分成功和失败重试路径"
          }
        ],
        "inventory_completeness": "confirmed",
        "completeness_reason": "主路径与可观察异常分支均已映射。",
        "excluded_states": [],
        "results": [
          {
            "state_id": "partial_success",
            "state_name": "部分成功",
            "status": "verified_pass",
            "method": "interaction",
            "evidence_ids": ["EV-03"],
            "observation": "结果分别展示成功与失败对象，并支持仅重试失败项"
          }
        ]
      },
      "evidence_ids": ["EV-02", "EV-03"]
    }
  ]
}
```

- `inventory_basis[].type`：`user_confirmed_scope / navigation_traversal / route_scan / screenshot_set / design_inventory / baseline_report`；每项必须有 `id / description`。
- `inventory_completeness`：`confirmed / partial`，并填写 `completeness_reason`。
- `excluded_surfaces[]` 可为空；非空时每项包含 `id / name / reason_code / reason`。`reason_code` 只允许 `outside_user_scope / non_pc / duplicate_representation / not_user_interface`。
- 页面和任务状态只允许 `completed / partial / blocked / missing`。
- `tasks[]` 是任务契约的运行记录，ID 集合和名称必须与 `review_brief.critical_tasks[]` 完全一致。
- 每个任务必须包含 `state_inventory`；结构、状态选择与完成门槛见 `task-state-coverage.md`。
- `complete` 报告要求页面清单为 `confirmed`，全部 surface 和 task 为 `completed`，且每个任务的状态清单为 `confirmed`、适用状态均已形成结论；否则只能是 `partial`。
- 范围内因权限、环境、动态入口或证据问题受阻的页面不得放入 `excluded_surfaces[]`，须保留为 `blocked / missing / partial`。
- 详细边界见 `scope-inventory-completeness.md`。

## 主要 PC 环境

复用 `review_brief.context.display_environment`，按 `pc-environment-validation.md` 记录本次视觉结论实际依据的 PC 环境：

```json
"pc_environment_validation": {
  "status": "completed",
  "target_environment": "1920×1080，浏览器 100% 缩放，全屏使用",
  "environments": [
    {
      "id": "PC-ENV-01",
      "role": "primary",
      "viewport_width": 1920,
      "viewport_height": 1080,
      "browser_zoom_percent": 100,
      "window_mode": "全屏",
      "capture_source": "live_browser",
      "surface_ids": ["PAGE-01"],
      "evidence_ids": ["EV-VIS"],
      "observation": "范围页面在主要工作环境中可达，未出现裁切。"
    }
  ]
}
```

- `status` 只允许 `completed / partial / blocked`；`report_status=complete` 时必须为 `completed`。
- `target_environment` 必须与 `review_brief.context.display_environment` 完全一致。
- `completed` 必须且只能有一个 `role=primary`；其 `surface_ids[]` 必须恰好覆盖全部范围页面，引用的 evidence 也必须共同覆盖这些页面。
- `role` 只允许 `primary / additional`；额外环境仅在用户使用情境或实际页面风险需要时增加。
- 每个环境必须记录正整数 `viewport_width / viewport_height`、实际 `window_mode`、`capture_source`、页面、证据和观察；`capture_source` 只允许 `live_browser / user_screenshot / design_export`。
- `browser_zoom_percent` 使用正整数；确实未知时可设为 `null`，但该环境必须填写字符串 `limitations`。
- `partial / blocked` 必须填写 `reason / validation_method`，并使用 `report_status=partial`。
- 这里验证实际 PC 页面体验，不要求固定分辨率矩阵、移动端检查或代码层响应式审查。

## 跨页面一致性

逐页视觉检查完成后，按 `cross-page-consistency.md` 记录一次轻量横向对比：

```json
"cross_page_consistency": {
  "status": "completed",
  "surface_ids": ["PAGE-01", "PAGE-02"],
  "evidence_ids": ["EV-01", "EV-02"],
  "observation": "列表与详情的页面框架、状态标签和操作层级一致；详情页为阅读任务采用更低密度，属于合理差异。"
}
```

- `surface_ids[]` 必须恰好覆盖全部范围页面。
- 两个以上页面时，`completed` 必须有覆盖所有页面的 evidence 和具体 observation；`partial / blocked` 必须有 `reason / validation_method`。
- 单页面只能使用 `not_applicable` 并填写 `reason`。
- `report_status=complete` 要求多页面为 `completed`，单页面为 `not_applicable`。
- 该对象不新增检查项；系统性问题仍使用 `evaluation_track=visual_system` 和 `occurrences[]`。

## Evidence

字段与模式边界见 `evidence-model.md`。每个 ID 唯一，所有 task、surface、issue 和 coverage 引用必须存在。

## Coverage

```json
"coverage": {
  "CORE-04": {
    "target_type": "task",
    "results": [
      {
        "target_id": "TASK-01",
        "status": "verified_pass",
        "method": "interaction",
        "evidence_ids": ["EV-02"],
        "observation": "提交期间按钮禁用并显示处理中"
      },
      {
        "target_id": "TASK-02",
        "status": "not_applicable",
        "reason": "该只读查看任务不包含提交或长时操作"
      }
    ]
  },
  "CORE-05": {
    "target_type": "task",
    "results": [
      {
        "target_id": "TASK-01",
        "status": "issue",
        "issue_ids": ["ISSUE-01"],
        "evidence_ids": ["EV-03"]
      },
      {
        "target_id": "TASK-02",
        "status": "verified_pass",
        "method": "interaction",
        "evidence_ids": ["EV-04"],
        "observation": "查看任务的加载、结果和返回反馈明确"
      }
    ]
  },
  "VIS-01": {
    "target_type": "surface",
    "results": [
      {
        "target_id": "PAGE-01",
        "status": "verified_pass",
        "method": "screenshot",
        "evidence_ids": ["EV-01"],
        "observation": "标题、核心数据和主操作形成明确阅读顺序"
      }
    ]
  }
}
```

- `VIS-*` 的 `target_type` 固定为 `surface`，`results[]` 恰好覆盖全部 `surface`。
- 其余已启用检查项的 `target_type` 固定为 `task`，`results[]` 恰好覆盖全部 `task`。
- 每个目标独立记录 `verified_pass / issue / not_tested / not_applicable / blocked`。
- 结果证据必须关联当前 `target_id`；问题、目标、检查项和证据必须双向一致。
- `complete` 要求所有目标结果均为 `verified_pass / issue / not_applicable`。
- 详细状态和矩阵规则见 `evidence-model.md` 与 `target-coverage-matrix.md`。

## 确定问题

`issues` 可以为空。非空时每项至少包含：

```json
{
  "id": "ISSUE-01",
  "index": 1,
  "evaluation_track": "task",
  "title": "批量处理失败后无法定位失败订单",
  "severity": "P1",
  "confidence": "high",
  "checklist_ids": ["CORE-05", "LIFE-05"],
  "affected_users": ["订单运营人员"],
  "task_ids": ["TASK-01"],
  "surface_ids": ["PAGE-01"],
  "state": "partial_failure",
  "observation": "结果只显示失败数量，没有失败对象与原因。",
  "expected_experience": "用户应能识别失败对象、理解原因并继续处理。",
  "user_impact": "需要返回列表逐条核对。",
  "business_impact": "可能造成漏处理。",
  "impact_basis": "expert_inference",
  "impact_basis_rationale": "结果区缺少失败对象和原因，结合每日高频批量处理任务，用户只能返回列表人工定位。",
  "impact_evidence_ids": ["EV-03"],
  "reproduction": ["选择混合状态订单", "执行批量处理", "查看结果"],
  "evidence_ids": ["EV-03"],
  "severity_assessment": {
    "task_impact": "significant",
    "frequency": "high",
    "affected_scope": "multiple",
    "recoverability": "difficult",
    "business_risk": "high",
    "visual_impact": "comprehension"
  },
  "severity_reason": "每日高频任务需要人工逐条核对。",
  "design_objective": "让用户确认每条结果并继续处理失败项。",
  "recommendation": ["展示失败对象与原因", "支持仅重试失败项"],
  "recommendation_rationale": "失败明细把人工逐条核对转为可定位、可继续的恢复流程。",
  "constraints_tradeoffs": ["结果区需兼顾批量概览与失败明细的扫描密度"],
  "alternatives": ["失败项很多时先显示摘要，并提供独立失败明细页"],
  "acceptance_criteria": ["部分失败时展示失败对象和原因"],
  "images": [
    {
      "path": "/abs/path/issue-1-annotated.png",
      "caption": "批量处理结果区",
      "annotated": true,
      "bbox": [120, 80, 240, 96]
    }
  ]
}
```

- `evaluation_track`：`task / visual / visual_system`
- `confidence`：只允许 `high / medium`；low 进入待验证风险
- `impact_basis`：`expert_inference / observed_user_behavior / behavioral_data`
- `impact_basis_rationale`：说明页面事实或实证如何支持用户影响，不得只复述 `user_impact`
- `impact_evidence_ids`：必须引用当前问题 `evidence_ids` 中的证据；用户观察或行为数据必须至少引用相应类型证据
- task 问题至少关联 task；visual 问题至少关联 surface
- 所有问题必须有 `recommendation_rationale`；P0/P1 或 `visual_system` 问题必须有 `constraints_tradeoffs[]`
- `alternatives[]` 可选，只在存在实质不同的合理方向时使用
- 建议与验收标准按 `recommendation-quality.md` 执行
- 多页面、多任务或 `visual_system` 问题必须提供 `occurrences[]`，并按 `issue-consolidation.md` 归并
- URL / screenshot 的确定问题须有真实存在的标注图和有效 bbox
- 影响结论与待验证边界按 `claim-evidence-boundary.md` 执行；真实耗时、错误率、成功率和业务转化没有实证时不得断言

复查报告中的当前问题还须包含：

- `issue_origin=baseline`：原问题仍然存在，并提供 `original_issue_id`。
- `issue_origin=new`：修改后新发现的问题，不提供 `original_issue_id`。
- 初次走查不使用 `issue_origin`。

多实例问题示例：

```json
"occurrences": [
  {
    "id": "OCC-01",
    "task_ids": ["TASK-01"],
    "surface_ids": ["PAGE-01"],
    "state": "partial_failure",
    "observation": "列表结果只显示失败数量",
    "evidence_ids": ["EV-03"]
  },
  {
    "id": "OCC-02",
    "task_ids": ["TASK-02"],
    "surface_ids": ["PAGE-02"],
    "state": "partial_failure",
    "observation": "导入结果同样不展示失败对象",
    "evidence_ids": ["EV-04"]
  }
]
```

## 待验证风险

```json
{
  "id": "RISK-01",
  "title": "提交失败后可能丢失输入",
  "task_ids": ["TASK-01"],
  "surface_ids": ["PAGE-01"],
  "checklist_ids": ["CORE-06"],
  "reason": "当前环境无法模拟接口失败",
  "potential_impact": "可能需要重新填写复杂表单",
  "potential_severity": "P1",
  "validation_priority": "high",
  "validation_method": "模拟 500 响应后检查表单和重试路径"
}
```

待验证风险不计入正式问题数量，不出现在 P0/P1/P2 分布中。

## 正向模式与增强机会

- `positive_patterns[]`：记录有页面证据、能够形成明确用户价值机制且值得保留和复用的设计模式。每项包含 `id / title / observation / user_value / preservation_guidance / checklist_ids / task_ids / surface_ids / evidence_ids`。
- `opportunities[]`：当前不构成缺陷、在明确条件下可能增值的方向。每项包含 `id / title / current_state / why_not_issue / expected_value / applicability / design_direction / checklist_ids / task_ids / surface_ids / evidence_ids`。
- 两类数组均可为空；非空时须符合 `positive-opportunity-method.md`。
- 两类内容不定 P 级；增强机会不得包含 `severity / potential_severity / validation_priority`。

## 设计复查

仅 `review_mode=follow_up` 使用：

```json
"follow_up_review": {
  "baseline_report": {
    "title": "订单后台完整体验走查报告",
    "generated_at": "2026-08-21T12:00:00+08:00",
    "source_reference": "/abs/path/original-report.json"
  },
  "brief_change_status": "unchanged",
  "brief_changes": [],
  "scope_type": "targeted",
  "issue_results": [
    {
      "id": "RECHECK-01",
      "original_issue_id": "ISSUE-01",
      "title": "批量处理失败后无法定位失败订单",
      "status": "resolved",
      "task_ids": ["TASK-01"],
      "surface_ids": ["PAGE-01"],
      "acceptance_results": [
        {
          "criterion": "部分失败时展示失败对象和原因",
          "result": "passed",
          "observation": "修改后的结果区逐条显示失败订单和原因",
          "evidence_ids": ["EV-RECHECK-01"]
        }
      ],
      "conclusion": "原问题的全部验收标准均通过。"
    }
  ],
  "regression_check": {
    "surface_ids": ["PAGE-01"],
    "task_ids": ["TASK-01"],
    "result": "passed",
    "observation": "受影响页面视觉检查和关键任务流程、状态检查均完成，未发现新问题。",
    "evidence_ids": ["EV-RECHECK-01"]
  }
}
```

- `baseline_report` 必须提供原报告标题和生成时间；`source_reference` 可选。
- `brief_change_status` 只允许 `unchanged / changed`；`changed` 必须列出 `brief_changes[]`。
- `scope_type` 只允许 `targeted / full`。
- 原问题状态只允许 `resolved / partially_resolved / unresolved / cannot_verify`。
- 验收结果只允许 `passed / failed / not_verified`。`passed / failed` 必须包含观察和证据；`not_verified` 必须包含 `reason / validation_method`。
- `partially_resolved / unresolved` 必须用 `current_issue_id` 指向 `issues[]` 中 `issue_origin=baseline` 的当前问题。
- `regression_check.result` 只允许 `passed / issues_found / partial`；`issues_found` 必须至少存在一个 `issue_origin=new` 的当前问题，`partial` 要求 `report_status=partial`。
- 回归范围必须覆盖全部复查问题关联的 task / surface。详细判断见 `follow-up-review.md`。

## 图片和标注

- URL / screenshot 的确定问题每项至少一张标注图。
- `annotated=true`、path 必须存在、bbox 必须为非负 x/y 和正数 w/h。
- 图片路径可为绝对路径，或相对 report.json 所在目录。
- 零问题报告不要求制造标注图。

## DOCX

```bash
python3 <SKILL_ROOT>/scripts/generate_docx.py \
  --report-json <report.json> \
  --output <output.docx> \
  --json
```

DOCX 展示走查前提、主要 PC 环境、双轨覆盖、跨页面一致性结论、任务状态结果摘要、总结、设计复查结论、当前确定问题、待验证风险、正向模式、增强机会和限制。目标级 Coverage 矩阵与完整状态证据保留在 JSON 和校验结果中，不在正文生成巨型表格。`report_status=partial` 时标题必须包含“阶段性”。
