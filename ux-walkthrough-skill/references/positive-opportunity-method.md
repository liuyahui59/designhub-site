# 正向模式与增强机会方法

> 用于 `positive_patterns[]` 和 `opportunities[]`。两类内容均可为空；不得为“平衡报告”强行表扬，也不得把个人偏好包装成增强机会。

## 正向设计模式

正向模式是页面证据能够证明其设计行为，并能形成明确用户价值机制、值得在后续设计中保留或复用的规律。不是“页面不错”“整体清晰”这类评价。

每项必须包含：

- `id`、`title`
- `observation`：具体页面或交互中观察到什么
- `user_value`：如何帮助理解、效率、防错、恢复、信任或可访问性
- `preservation_guidance`：改版时应保留或推广的规律，不等于冻结当前像素
- `checklist_ids`
- `task_ids / surface_ids`：至少一类非空
- `evidence_ids`

示例：

```json
{
  "id": "POS-01",
  "title": "提交失败后保留已填内容",
  "observation": "模拟失败后所有已填字段仍保留，错误定位到具体字段",
  "user_value": "失败后支持直接修正，无需重新录入已填内容",
  "preservation_guidance": "后续重构表单和错误反馈时继续保留输入保护与字段级定位",
  "checklist_ids": ["CORE-06"],
  "task_ids": ["TASK-01"],
  "surface_ids": ["PAGE-01"],
  "evidence_ids": ["EV-FLOW"]
}
```

正向模式不定 P 级，不因记录优点而降低同区域真实问题的严重度。

只有页面证据时，`user_value` 描述该模式支持的理解、效率、防错或恢复机制，不声称已测得效率提升或错误率下降；实证价值按 `claim-evidence-boundary.md` 说明证据边界。

## 可选增强机会

增强机会是当前体验能够支持用户目标、不达到缺陷标准，但在特定用户、场景或产品阶段下可能创造额外价值的方向。

每项必须包含：

- `id`、`title`
- `current_state`：当前设计如何工作
- `why_not_issue`：为什么当前状态不构成确定问题
- `expected_value`：增强后可能带来的用户价值
- `applicability`：适用的用户、场景、频率、数据规模或产品阶段
- `design_direction`：可探索的设计方向，不写未经确认的开发实现
- `checklist_ids`
- `task_ids / surface_ids`：至少一类非空
- `evidence_ids`

示例：

```json
{
  "id": "OPP-01",
  "title": "为熟练用户提供下单模板",
  "current_state": "当前表单可完整创建订单，但重复订单需要再次填写相同字段",
  "why_not_issue": "当前任务可以准确完成，且前置调查未证明重复录入已造成显著成本",
  "expected_value": "在高频重复场景下减少录入时间",
  "applicability": "仅适用于字段组合稳定且每日重复下单的熟练运营人员",
  "design_direction": "探索保存为模板和从模板创建的可控入口",
  "checklist_ids": ["CORE-08"],
  "task_ids": ["TASK-01"],
  "surface_ids": ["PAGE-01"],
  "evidence_ids": ["EV-FLOW"]
}
```

## 分类边界

- 页面缺陷已确定且能够形成明确影响机制 → `issues[]`。
- 问题是否存在本身依赖用户行为且证据不足 → `validation_backlog[]`。
- 当前有效且值得保留 → `positive_patterns[]`。
- 当前不构成缺陷，但特定条件下可能增值 → `opportunities[]`。
- 纯审美偏好、没有用户价值或没有证据锚点 → 不输出。

增强机会不得包含 `severity / potential_severity / validation_priority`，不进入问题数量、严重度分布或必须整改清单。若机会需要验证它是否已经造成损害，应改入 `validation_backlog[]`。

`expected_value` 始终保持条件化表达，不将假设收益写成已经发生的结果。

## 输出自检

- 正向模式是否具体到页面/任务、观察与证据。
- `user_value` 是否描述用户价值，而不是“设计规范做得好”。
- `preservation_guidance` 是否说明保留规律，而非禁止任何变化。
- 增强机会是否明确解释为什么当前不是问题。
- 适用条件是否足以防止建议被所有用户和场景泛化。
- 是否为了平衡报告而制造表扬或优化项。
