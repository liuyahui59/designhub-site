# 关键任务状态清单与覆盖

> 用于证明关键任务的适用状态经过识别并实际检查。状态清单不是固定十状态打卡；它随任务、业务规则和可观察分支建立。

## 先建立状态范围

每个 `task` 必须包含 `state_inventory`。先根据用户确认的任务、实际交互路径、界面分支、设计说明、代码路径或原复查报告识别适用状态，再开始判断问题。

优先考虑但不机械穷举：

- `entry`：入口、前置条件和初始落点
- `input`：录入、选择、编辑或配置过程
- `processing`：提交、加载、异步处理或等待
- `success`：成功结果和后续行动
- `failure`：校验失败、请求失败或业务拒绝
- `recovery`：修正、重试、撤销或返回
- `permission`：无权限、部分权限或权限变化
- `empty`：无数据、无结果或首次使用
- `partial_success`：批量或多对象任务的部分成功
- `context_return`：返回列表、详情或上游任务时的上下文保持

可使用其他符合业务语义的 `snake_case` 状态 ID。不存在或对当前任务没有体验判断价值的状态不加入 `results[]`；只有容易被误认为应检查、但实际不适用的状态才写入 `excluded_states[]` 并说明理由。

## 结构

```json
"state_inventory": {
  "inventory_basis": [
    {
      "type": "interaction_path",
      "description": "实际完成创建订单的录入、提交、失败和重试路径"
    },
    {
      "type": "interface_branch",
      "description": "提交控件和结果区明确存在处理中、成功与失败分支"
    }
  ],
  "inventory_completeness": "confirmed",
  "completeness_reason": "任务主路径及可观察异常分支均已映射，没有未解释状态缺口。",
  "excluded_states": [
    {
      "state_id": "partial_success",
      "state_name": "部分成功",
      "reason": "该任务一次只创建一个订单，不存在多对象混合结果"
    }
  ],
  "results": [
    {
      "state_id": "failure",
      "state_name": "提交失败",
      "status": "verified_pass",
      "method": "interaction",
      "evidence_ids": ["EV-03"],
      "observation": "失败原因定位到字段，已填内容保留并可直接重试"
    }
  ]
}
```

`inventory_basis[].type` 使用：

- `user_confirmed_task`
- `interaction_path`
- `interface_branch`
- `design_spec`
- `code_path`
- `baseline_report`

`inventory_completeness`：

- `confirmed`：有依据支持当前适用状态范围，且没有未解释的状态分支。
- `partial`：仍可能遗漏状态、分支或业务条件；报告不能为 `complete`。

`confirmed` 不能只依赖 `user_confirmed_task`。至少还须包含 `interaction_path / interface_branch / design_spec / code_path / baseline_report` 之一，用实际输入证明状态范围。

## 状态结果

- `verified_pass`：必须有 `method / evidence_ids / observation`。
- `issue`：必须有 `method / evidence_ids / observation / issue_ids`；问题须关联当前任务，并与状态结果共享证据。
- `not_tested`：必须有 `reason / validation_method`。
- `blocked`：必须有 `reason / validation_method`。

状态结果不使用 `not_applicable`；不适用状态只在确有解释价值时进入 `excluded_states[]`。

每条状态证据必须关联当前任务。一个交互证据可以覆盖连续的多个状态，但每个状态仍须有独立结果和具体观察，不能用“流程已走通”代替失败、恢复或返回上下文的判断。

## 完成门槛

任务可标为 `flow_status=completed` 仅当：

- 状态清单完整性为 `confirmed`；
- `results[]` 非空；
- 每个适用状态均为 `verified_pass / issue`；
- 没有 `not_tested / blocked`。

状态清单或任一适用状态未完成时，任务使用 `partial / blocked / missing`，报告不能为 `complete`。

## 边界

- 不为满足格式制造理论状态或技术故障组合。
- 不要求遍历所有接口错误码；按用户影响和实际设计差异选择有体验判断价值的代表状态。
- 登录、账号、测试数据和故障模拟条件仍在执行中按需沟通，不进入 A0 前置问卷。
- 静态截图通常只能证明截图内可见状态；不可见的动态、失败和恢复状态标为 `not_tested` 或 `blocked`。

## 输出

JSON 和校验结果保留完整状态清单。Markdown 与 DOCX 只按任务展示适用状态及结果摘要，不输出冗长内部矩阵。
