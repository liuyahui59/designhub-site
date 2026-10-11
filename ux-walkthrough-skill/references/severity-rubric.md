# 确定问题严重度模型

> 仅用于 `confidence=high/medium` 的确定问题。待验证风险不定 P 级，使用 `potential_severity` 与 `validation_priority`。

严重度不考虑开发难度、工期、负责人或排期。Checklist 和示例不得提供默认 P 级。

## 必填判断维度

- `task_impact`：`blocking / significant / moderate / none`
- `frequency`：`high / medium / low / unknown`
- `affected_scope`：`system / multiple / local`
- `recoverability`：`none / difficult / easy`
- `business_risk`：`critical / high / normal`
- `visual_impact`：`operation / comprehension / trust / polish / none`

`unknown` 不自动降级；须在定级理由说明信息缺口。证据置信度与严重度分开，不能把潜在高影响问题因证据不足降成 P2。

严重度可基于已确认任务重要性、使用频率、恢复路径和失败后果结合专家推断判断，但不得用未取得的真实耗时、错误率、成功率或转化数据支撑定级。影响依据按 `claim-evidence-boundary.md` 记录；`confidence=high` 不等于已有用户实测。

## P0

- 核心任务无法完成且无合理替代路径。
- 数据丢失、错误提交或不可逆结果且无法恢复。
- 权限、财务、隐私、合规或安全可能造成严重后果。
- 反馈与真实结果相反，可能导致关键业务错误。
- 视觉问题使关键内容或操作不可见、不可读或无法使用。

## P1

- 高频或高价值任务可完成，但明显增加错误、重复劳动、绕路或人工核对。
- 失败后恢复困难，但仍有替代路径。
- 跨多个页面、任务或角色持续出现。
- 状态、反馈、数据或术语导致用户误判结果。
- 视觉层级、密度、组件或系统性粗糙明显影响扫描、理解、操作或企业产品可信度。
- 可访问性问题使部分目标用户难以完成关键任务。

## P2

- 不阻断任务，但影响局部效率、可读性、视觉一致性、专业感或完成度。
- 范围局部且容易恢复。
- 低频状态中的轻度反馈问题。
- 局部间距、字体、图标、边框、文案或状态处理粗糙。

P2 是正式问题，不等于可忽略。

## 不定级

- 证据不足 → `validation_backlog[]`
- 纯个人审美偏好 → 不报告
- 可选增强 → `opportunities[]`
- 正向模式 → `positive_patterns[]`

## 置信度

- `high`：实际运行复现，结果明确。
- `medium`：截图、设计稿、规范或代码能够可靠证明。
- `low`：依赖推断或缺少关键状态；默认进入待验证风险。
