# 双轨走查工作表（阶段 B 内部用）

## 1. 范围与模块

- `review_brief.critical_tasks[]`：按 `task-contract.md` 记录用户确认的任务、主要用户、起点、目标结果和该任务的成功标准。
- `tasks[]`：复用任务契约的 ID 与名称，不得遗漏、增加或改名。
- `surfaces[]`：本次范围内全部 PC 页面、弹层和工作台。
- `inventory_basis[] / inventory_completeness / excluded_surfaces[]`：按 `scope-inventory-completeness.md` 记录页面清单依据与边界。
- `activated_packs[]`：固定含 `core / visual / accessibility-pc`；满足条件时加入 `object-lifecycle / form-configuration / analytics-dashboard / navigation-information-architecture`。

## 2. 页面视觉轨

先按 `pc-environment-validation.md` 建立主要 PC 环境记录。主要环境证据须覆盖全部 surface；额外 PC 环境只在用户情境或页面风险需要时检查，不做固定多尺寸矩阵。

对每个 surface 逐项填写 `VIS-01 ... VIS-10`，并记录 `completed / partial / blocked / missing`、证据 ID 和观察。页面清单为 `confirmed` 且所有范围内页面均完成视觉检查，才可把视觉轨判为完成。

## 3. 关键任务轨

对每个 task：

1. 先以该任务自己的 `start_condition / intended_outcome / success_criteria[]` 确认走查边界和判定依据。
2. 按 `CORE-01 ... CORE-10` 走查。
3. 按 `task-state-coverage.md` 建立状态清单，逐状态记录证据、观察和结果。
4. 完成 `A11Y-01 ... A11Y-10` 的 PC 基础可访问性检查。
5. 若启用领域模块，再完成该模块的全部适用项。

## 4. 跨页面一致性

- 只有一个 surface：`cross_page_consistency.status=not_applicable`，说明无可比较页面。
- 两个及以上 surface：按 `cross-page-consistency.md` 使用全部页面证据进行横向比较。
- 记录具体观察；系统性问题使用 `visual_system + occurrences[]`，合理差异不报问题。

## 5. Coverage 目标矩阵

- 为每个 surface 分别填写全部 `VIS-*` 结果。
- 为每个 task 分别填写全部 `CORE-* / A11Y-*` 和已启用领域模块结果。
- 领域模块对不适用任务使用 `not_applicable` 并记录理由。
- Checklist 目标矩阵与任务状态清单是两种不同证明：前者防止漏检查项，后者防止漏任务状态；两者都必须完成。

| 状态 | 必需记录 |
|------|----------|
| `verified_pass` | method、evidence_ids、observation |
| `issue` | issue_ids、evidence_ids |
| `not_tested` | reason |
| `not_applicable` | reason |
| `blocked` | reason、validation_method |

待验证风险写入 `validation_backlog[]`，不得混入 `issues[]`。确定问题必须关联 checklist、task/surface 与 evidence。

矩阵结构、目标完整性和双向引用见 `target-coverage-matrix.md`。

## 6. 综合

- 汇总跨任务问题。
- 汇总跨页面视觉系统问题。
- 记录 `positive_patterns[]`。
- 分别计算视觉、任务和状态覆盖，不合并为单一百分比。
