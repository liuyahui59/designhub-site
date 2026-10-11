---
name: ux-walkthrough
description: 对 PC 端 B 端产品进行首次体验走查或设计修改后的复查。支持代码库、URL、截图输入；基于用户目标并行检查关键任务流程与范围页面视觉质量，输出结构化报告和本地 docx。触发词：体验走查、UX review、设计复查、交互走查、界面审查、体验问题。
---

# UX Walkthrough

## 范围与角色

- 角色：资深 B 端体验设计专家；给出证据充分、可验证的建议，不做主观吐槽。
- 仅正式走查 PC 端 B 端产品；移动端、小程序、App 和触屏任务不在范围内。
- PC 键盘、焦点、对比度、浏览器缩放和辅助技术属于正式检查范围。
- 正式交付：完整 Markdown 报告、结构化 `report.json`、必要标注图、校验结果和本地 `.docx`。
- `.docx` 依赖 `python-docx`；依赖缺失时须报告 `docx_generation` 失败，不得宣称完整交付。

## 输入模式

| 输入 | 模式 | 必读 |
|------|------|------|
| 本地项目目录 | `code` | `references/mode.md#code` |
| `http(s)` URL | `url` | `references/mode.md#url` |
| 图片 | `screenshot` | `references/mode.md#screenshot` |

无法判断时只问一句最小必要澄清。登录、账号、启动命令、依赖、测试数据和截图权限不属于设计前置调查；执行中遇到阻塞再按需询问。

## 走查类型

- 默认 `review_mode=initial`，执行完整 A0 → A1 → B → C。
- 用户明确要求检查修改结果且提供原报告时使用 `review_mode=follow_up`，完整读取 `references/follow-up-review.md`。
- 设计复查复用原报告中已确认的七项 `review_brief`；只有前提发生变化时才补问变化项，不要求重填问卷。
- 缺少可识别的原报告时不得输出“已解决”等复查结论，可请用户补充原报告或改做新的首次走查。

## 四阶段流程

```text
A0 设计前置调查 → A1 输入与证据检查 → B 双轨走查与综合 → C 校验与 docx
```

### A0：设计前置调查

必须完整读取 `references/review-brief.md`。其中 7 项须由用户明确回答；Agent 推断不能代替用户回答。

- 当前对话中用户已明确提供的信息可复用，只追问缺失或含糊项。
- 未通过：`review_brief.status=needs_clarification`，只追问未通过项，不进入 A1。
- 通过：`review_brief.status=confirmed`，按 `references/task-contract.md` 将每条任务与自己的成功标准绑定，并据此建立同 ID 的 `tasks[]`。
- `follow_up`：复用原报告中 `status=confirmed` 的前提；仅在当前前提变化时补充确认变化项。

### A1：输入与证据检查

```bash
python3 <SKILL_ROOT>/scripts/precheck_walkthrough.py <输入> --json
```

- 读取 `next_action / mode / status / gate`；code 模式额外读取 `runtime_probe`。
- code 运行时优先：服务可达或可启动时切到 URL 走查；失败才使用 code fallback。
- 按 `references/evaluation-framework.md` 枚举范围内全部 `surfaces[]`，并选择 `activated_packs[]`。
- 按 `references/scope-inventory-completeness.md` 记录页面清单来源、完整性和已知范围外页面；清单不完整时不能输出 `complete`。
- 固定启用 `core / visual / accessibility-pc`；符合条件时启用 `object-lifecycle / form-configuration / analytics-dashboard / navigation-information-architecture`。

### B：双轨走查与综合

必读：

- `references/evaluation-framework.md`
- `references/evidence-model.md`
- `references/walkthrough-worksheet.md`
- `references/ux-checklist.md`
- `references/visual-checklist.md`
- `references/accessibility-pc.md`
- `references/ignore-list.md`
- `references/severity-rubric.md`
- `references/recommendation-quality.md`
- `references/issue-consolidation.md`
- `references/positive-opportunity-method.md`
- `references/claim-evidence-boundary.md`
- `references/scope-inventory-completeness.md`
- `references/target-coverage-matrix.md`
- `references/task-state-coverage.md`
- `references/task-contract.md`
- `references/cross-page-consistency.md`
- `references/pc-environment-validation.md`

按需读：

- 启用 `object-lifecycle` 时读 `references/domain-object-lifecycle.md`。
- 启用 `form-configuration` 时读 `references/domain-form-configuration.md`。
- 启用 `analytics-dashboard` 时读 `references/domain-analytics-dashboard.md`。
- 启用 `navigation-information-architecture` 时读 `references/domain-navigation-information-architecture.md`。

#### 视觉质量轨

- 按 `pc-environment-validation.md` 在用户回答的主要 PC 环境中取得覆盖全部页面的视觉证据；未知时记录实际环境与限制，不扩展为固定分辨率矩阵。
- 对每个范围内 surface 完成 `VIS-01 ... VIS-10`。
- URL / screenshot 的视觉完成必须有实际渲染或清晰截图；纯代码只能 `partial`。
- 视觉问题可不关联 task，但必须关联 `surface_ids` 和证据。
- 逐页检查后按 `cross-page-consistency.md` 横向比较页面框架、操作位置、同类组件、状态表达与视觉规律；单页面说明不适用，不要求合理差异机械统一。

#### 关键任务轨

- 对每个 task 完成 `CORE-01 ... CORE-10` 和 `A11Y-01 ... A11Y-10`。
- 按 `task-state-coverage.md` 为每个 task 建立有依据的适用状态清单，并逐状态记录结果；不机械要求固定十状态。
- 符合条件的任务完成相应领域模块。

#### 证据与结论

- Coverage 按 `target-coverage-matrix.md` 使用目标级结果：每个 `VIS-*` 覆盖全部页面，每个任务型检查项覆盖全部任务；结果仅使用 `verified_pass / issue / not_tested / not_applicable / blocked`。
- `issues[]` 只放 `confidence=high/medium` 的确定问题，可为空。
- 证据不足写入 `validation_backlog[]`，不定 P 级、不计入正式问题数量。
- 每个确定问题按 `claim-evidence-boundary.md` 区分页面事实、专家推断与实证影响；没有用户实测不等于不能形成确定问题，但不得虚构量化结果。
- 可选增强写入 `opportunities[]`；正向模式写入 `positive_patterns[]`；两类均可为空，非空时按 `positive-opportunity-method.md` 关联证据与价值。
- 每个确定问题须关联 checklist、evidence，以及 task 或 surface；多页面、多任务或 `visual_system` 问题须用 `occurrences[]` 保留实例映射。
- 没有规范来源的菜单层级、列数、字段数、步骤数和像素值只能作风险信号。

#### 设计复查补充

- `follow_up` 按 `follow-up-review.md` 逐项验证原验收标准，并检查受影响页面、任务与相邻状态的回归。
- 原问题使用 `resolved / partially_resolved / unresolved / cannot_verify`；部分解决和未解决必须继续指向 `issues[]` 中的当前问题。
- `issues[]` 用 `issue_origin=baseline / new` 区分仍存在的原问题与修改产生的新问题。
- 复查只判断修改后的实际设计体验，不记录开发完成状态。

### C：校验与 docx

1. URL / screenshot 确定问题按 `references/annotation-style.md` 生成标注图；禁止手估 bbox。
2. 按 `references/report-json.md` 生成 `report.json`。
3. 校验结构化 coverage 与引用：

```bash
python3 <SKILL_ROOT>/scripts/validate_checklist_coverage.py --report-json <report.json> --json
```

4. 校验标注：

```bash
python3 <SKILL_ROOT>/scripts/validate_report_annotations.py --report-json <report.json> --json
```

5. 生成 DOCX：

```bash
python3 <SKILL_ROOT>/scripts/generate_docx.py \
  --report-json <report.json> \
  --output <SKILL_ROOT>/output/<项目名>-ux-report-<YYYYMMDD>.docx \
  --json
```

## 完成状态

- `complete`：`scope_inventory.inventory_completeness=confirmed`，主要 PC 环境证据覆盖全部范围页面，所有页面完成视觉轨，多页面范围完成跨页面一致性对比，且所有关键任务的状态清单均确认、全部适用状态和流程轨均完成；只表示用户指定范围和已记录 PC 环境完整，不表示整个产品或所有桌面尺寸已检查。
- `partial`：至少有有效观察，但页面清单未确认，或仍有页面、任务未完成；标题必须写“阶段性体验走查报告”。
- `blocked`：没有页面或任务取得有效证据；不输出正式报告。

零问题可以正常交付：明确写“在本次用户、任务、场景与证据范围内，未发现达到正式问题标准的确定缺陷”，并保留 coverage、待验证风险、正向模式和限制。不得制造占位问题。

## 严重度

- Checklist 和示例没有默认严重度。
- 确定问题按 `severity-rubric.md` 记录 P0/P1/P2、置信度、六个判断维度和定级理由。
- 视觉粗糙、系统性不一致若显著影响理解、操作或企业产品可信度可判 P1；局部专业完成度问题可判 P2。
- 开发成本、负责人和排期不属于严重度，也不由本 Skill 推断。

## 报告要求

按 `references/report-template.md` 输出完整 Markdown 报告。每个确定问题至少包含：

- 评价轨、受影响用户、task/surface/state
- 当前观察与预期体验
- 用户影响与可选业务影响
- 影响依据、依据理由与影响证据
- 复现步骤与证据
- 严重度、置信度与理由
- 改进目标、首选建议、推荐理由、适用约束/权衡和可验证验收标准
- 多页面/多任务问题的归并依据与 occurrence 实例

视觉覆盖、任务覆盖和状态覆盖分别展示；不输出单次走查的“Top 3 高频问题类型”。

## 交付前自检

- [ ] A0 的 7 项均由用户回答，`review_brief.status=confirmed`
- [ ] 仅复查模式：已读取原报告并按 `follow-up-review.md` 记录原问题状态与回归结果
- [ ] 范围内全部 PC surfaces 已枚举
- [ ] 页面清单有来源、完整性理由和已知范围外记录；范围内受阻页面未被排除
- [ ] 用户关键 tasks 已建立
- [ ] `review_brief.critical_tasks[]` 中每条任务均有独立成功标准，并与 `scope_inventory.tasks[]` 的 ID 和名称完全一致
- [ ] `core / visual / accessibility-pc` 均启用，领域模块按触发条件启用
- [ ] 每个 surface 已完成或明确标记视觉状态
- [ ] 已按用户回答记录主要 PC viewport、窗口方式和浏览器缩放，且主要环境证据覆盖全部 surface
- [ ] 多页面范围已完成跨页面一致性对比；单页面已说明不适用
- [ ] 每个 task 已按实际分支建立状态清单；适用状态逐项有结果，不适用状态仅在必要时说明理由
- [ ] 确定问题与待验证风险已分离
- [ ] 页面事实、专家推断与用户行为实证已分开，未把推断写成实测结论
- [ ] Coverage、issue、task、surface、evidence 引用一致
- [ ] 每个页面 × `VIS-*`、每个任务 × 已启用任务型检查项的目标矩阵无缺口
- [ ] `flow_status=completed` 的任务状态清单为 `confirmed`，且没有 `not_tested / blocked`
- [ ] 严重度与置信度分开，未使用 checklist 默认 P 级
- [ ] URL / screenshot 的确定问题有有效标注图与 bbox
- [ ] 零问题时未制造占位问题
- [ ] Markdown 报告完整，校验通过，docx 已生成或明确说明失败
