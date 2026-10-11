# 双轨证据与覆盖模型

## 证据对象

每条证据使用唯一 `id`，并关联 task、surface 或两者：

```json
{
  "id": "EV-03",
  "type": "interaction",
  "source": "url",
  "task_ids": ["TASK-01"],
  "surface_ids": ["PAGE-01"],
  "state": "partial_failure",
  "observation": "结果只显示失败数量，没有失败对象与原因",
  "artifact": "/abs/path/result-annotated.png",
  "confidence": "high"
}
```

`type` 可为 `interaction / screenshot / dom / accessibility_tree / code_confirmed / code_inferred / design_spec / user_observation / behavioral_data`。

- `user_observation`：真实用户在明确任务中的可观察行为；`observation` 说明用户、任务、行为和观察边界。
- `behavioral_data`：分析数据、任务日志、调研结果或其他行为证据；`observation` 说明来源、时间或样本边界。
- 页面截图、交互和代码证据不能冒充上述两类实证证据。

问题的页面证据与影响依据按 `claim-evidence-boundary.md` 区分。`confidence` 表示证据对当前结论的可靠程度，不表示已经进行用户测试。

## 双轨覆盖状态

### Surface 视觉状态

`completed / partial / blocked / missing`

- `completed`：有实际渲染或清晰截图，已完成全部视觉清单。
- `partial`：只有部分区域、状态或代码推断。
- `blocked`：原计划检查，但证据获取受阻。
- `missing`：没有有效证据。

纯代码不能把视觉轨标为 `completed`。

### Task 流程状态

`completed / partial / blocked / missing`

任务按 `task-state-coverage.md` 建立实际适用状态清单。`entry / input / processing / success / failure / recovery / permission / empty / partial_success / context_return` 是候选状态，不是固定打卡项；也可使用业务特有状态。截图模式通常只能标 `partial`，不能仅凭多张静态图宣称流程完成。

`flow_status=completed` 要求状态清单为 `confirmed`，且全部适用状态均为 `verified_pass / issue`。`not_tested / blocked` 表示任务轨尚未完成。

## Coverage 目标结果状态

每个启用清单 ID 按 `target-coverage-matrix.md` 为每个页面或任务提供独立结果，结果使用：

- `verified_pass`：已实际验证且未发现问题
- `issue`：已实际验证且存在确定问题
- `not_tested`：本次未验证，不能下结论
- `not_applicable`：对当前用户、任务和页面确实不适用
- `blocked`：原计划验证，但受环境、权限或数据限制阻塞

示例：

```json
"CORE-04": {
  "target_type": "task",
  "results": [
    {
      "target_id": "TASK-01",
      "status": "verified_pass",
      "method": "interaction",
      "evidence_ids": ["EV-03"],
      "observation": "提交期间按钮禁用并显示处理中状态"
    }
  ]
}
```

规则：

- `verified_pass` 结果必须有 `method`、`evidence_ids` 和具体观察。
- `issue` 结果必须有 `issue_ids`，并与正式问题和目标互相引用。
- `not_tested` / `not_applicable` 必须有 `reason`。
- `blocked` 必须有 `reason` 和 `validation_method`。
- 不使用自由文本 `pass:...`，不以字符长度代替证据质量。
- 同一检查项不能用一条结果代表多个目标；详细矩阵规则见 `target-coverage-matrix.md`。

## 确定问题与待验证风险

- `issues[]` 只放 `confidence=high/medium` 的确定问题，可为空。
- `confidence=low` 或缺关键状态时放 `validation_backlog[]`，不计入正式问题数量，不定 P0/P1/P2。
- 待验证风险使用 `potential_severity` 与 `validation_priority`，并写明验证方法。
- 页面缺陷已确定但用户影响属于专家推断时仍可进入 `issues[]`；只有问题是否存在本身依赖用户行为且证据不足时进入待验证风险。

## 模式边界

- URL：可同时完成视觉轨和任务轨；必须记录实际交互与截图。
- screenshot：可完成有证据页面的视觉轨；流程轨通常为 `partial`。
- code runtime：按 URL 证据处理。
- code fallback：逻辑可用 `code_confirmed`；视觉只能 `partial`，`code_inferred` 不能作为高置信度问题的唯一证据。
