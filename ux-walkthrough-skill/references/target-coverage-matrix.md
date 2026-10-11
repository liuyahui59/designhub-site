# 页面与任务目标级 Coverage

> 用于证明每个范围内页面完成全部视觉检查、每个关键任务完成核心体验与 PC 可访问性检查。Coverage 是内部证据矩阵；用户报告正文仍按问题归并，不输出巨型检查表。

本矩阵证明检查项没有漏到目标；关键任务内部的适用状态是否完整由 `task-state-coverage.md` 单独证明，二者不能互相替代。

## 矩阵结构

每个已启用检查项只出现一次，但必须为全部相应目标提供独立结果：

- `VIS-*`：`target_type=surface`，`results[]` 必须恰好覆盖 `scope_inventory.surfaces[]` 的全部 ID。
- `CORE-* / A11Y-*`：`target_type=task`，`results[]` 必须恰好覆盖全部 `tasks[]`。
- `LIFE-* / FORM-* / DASH-* / NAV-*`：`target_type=task`。模块启用后也覆盖全部任务；不适用某任务时使用 `not_applicable` 并写具体理由。

一个目标在同一检查项中只能出现一次。不能用一条结果同时代表多个页面或任务。

```json
"VIS-01": {
  "target_type": "surface",
  "results": [
    {
      "target_id": "PAGE-01",
      "status": "verified_pass",
      "method": "screenshot",
      "evidence_ids": ["EV-PAGE-01"],
      "observation": "标题、核心数据和主操作形成明确阅读顺序"
    },
    {
      "target_id": "PAGE-02",
      "status": "issue",
      "issue_ids": ["ISSUE-02"],
      "evidence_ids": ["EV-PAGE-02"]
    }
  ]
}
```

## 目标结果状态

- `verified_pass`：必须包含 `method / evidence_ids / observation`。
- `issue`：必须包含 `issue_ids / evidence_ids`，并与正式问题双向引用。
- `not_tested`：必须包含 `reason`；该目标未形成结论。
- `not_applicable`：必须包含针对该目标的具体 `reason`。
- `blocked`：必须包含 `reason / validation_method`。

每条证据必须关联当前 `target_id`。例如 `VIS-01/PAGE-02` 引用的 evidence 必须包含 `surface_ids=["PAGE-02"]`；任务结果同理。

## 问题双向引用

- 目标结果为 `issue` 时，引用的问题必须包含当前检查项和当前目标。
- 问题引用 `VIS-*` 时，其每个 `surface_id` 都必须有对应 `issue` 结果并反向引用该问题。
- 问题引用任务型检查项时，其每个 `task_id` 都必须有对应 `issue` 结果并反向引用该问题。
- 问题可关联额外页面作为任务上下文，但任务型检查项只要求任务目标矩阵；视觉型检查项只要求页面目标矩阵。

## 完成状态

`complete` 报告要求每个目标结果都是 `verified_pass / issue / not_applicable`。任何 `not_tested / blocked` 都只能输出 `partial`；缺少目标结果则校验失败。

页面或任务顶层的 `completed` 仍表示整条轨道已完成；矩阵负责证明其内部每项覆盖。两者不一致时不得输出完整报告。

## 输出自检

- 是否为每个页面分别完成全部 `VIS-*`。
- 是否为每个任务分别完成全部 `CORE-* / A11Y-*`。
- 条件领域模块是否对不适用任务写明理由，而非省略。
- 同一检查项在不同目标上的通过、问题和阻塞是否独立记录。
- 证据是否真正关联对应目标。
- 正文是否继续按问题归并，避免把内部矩阵变成用户阅读负担。
