# 门禁与完成自检

> 主流程见 `SKILL.md`。本文只写通过条件、失败回路和禁止项，不包含统计或上报协议。

## 核心原则

- 未通过当前阶段门禁，不进入下一阶段
- 设计前置调查必须由用户回答；Agent 推断不能代替用户确认
- 证据不足时先补证据，不提前输出完整报告
- 完成由报告正文、结构化 `report.json`、标注校验和 docx 结果共同判定
- 对外优先调用 `precheck_walkthrough.py` 与 `generate_docx.py`；底层脚本仅用于调试
- 本文不定义 usage stats、telemetry closeout 或授权补传状态；这些不属于本 skill 的完成门禁
- 若环境缺少 `python-docx`，`.docx` 生成必须判定为失败，并明确说明依赖缺失；不得把报告正文当作完整完成

---

## 阶段 A0：设计前置调查（用户回答门禁）

对应 `references/review-brief.md`。

### 通过条件

- 7 项设计前提均由用户明确回答
- `review_brief.status=confirmed`
- 主要用户、核心目标、关键任务、使用情境、成功标准、失败影响和业务约束均满足 `review-brief.md` 的通过标准
- 每条关键任务按 `task-contract.md` 绑定自己的主要用户、起点、目标结果和成功标准

`review_mode=follow_up` 时，原报告中已确认的七项回答可以直接复用；只有当前前提发生变化时才补充确认变化项。缺少原报告则不能进入复查结论阶段。

### 失败回路

- 缺失或含糊 → `review_brief.status=needs_clarification`
- 只追问未通过项，不要求用户重填已通过项
- 不得用页面、代码或 Agent 推断补写用户答案
- 未通过时不进入输入检查，不输出正式问题报告

登录、账号、启动命令、依赖、测试数据准备和截图权限等执行条件不属于 A0；在 A1 或后续模式执行中遇到阻塞再按需询问。

---

## 阶段 A1：输入与证据检查（输入 · 模式 · 证据门禁）

对应 precheck 的 `mode`、`gate`、`next_action`。仅在 A0 已通过后执行。

### 通过条件

- 输入类型可识别（code / url / screenshot）
- `next_action=continue_walkthrough`，或 code 模式下 runtime 分支：
  - `try_url_walkthrough`
  - `start_dev_server_then_url_walkthrough`
  - `fallback_code_walkthrough`

### 失败回路

| 情况 | 动作 |
|------|------|
| 输入无法识别 | 只问一句最小澄清 |
| URL 在登录页 | 暂停；等登录或改 screenshot |
| 截图不足 | 标记证据不足；不进入正式交付 |
| 非页面项目 | 说明当前输入不是页面项目，并提示补充真正页面输入 |
| gate 固定失败 | 说明失败原因和下一步，不写完整报告 |

### 模式差异（证据门禁）

**code：** 目录可读；能扫描或手动识别页面结构；gate 通过后执行 `runtime_probe`（见 `probe_dev_server.py`）。  
**url：** 已进入业务页；可截图留证。  
**screenshot：** 截图可读且数量/顺序足够。

#### code · 运行时优先

| `runtime_probe.next_action` | 阶段 B |
|-----------------------------|--------|
| `try_url_walkthrough` | 对 `reachable_urls` 做 URL precheck + 浏览器走查，`source=url` |
| `start_dev_server_then_url_walkthrough` | 启动 `suggested_dev_command`；成功 → URL；失败 → 收窄 code |
| `fallback_code_walkthrough` | `source=code`；i18n/token/响应式降级或标「待启动后验证」 |

URL 无登录态但用户能补截图 → 可降级 `screenshot`。

---

## 阶段 B：走查与报告（证据采集 · 判断 · 输出）

### 证据采集

| 模式 | 必需材料 |
|------|----------|
| code（URL 分支） | 与 url 相同：首屏/关键交互截图、标注图 |
| code（fallback） | 扫描/手动定位：路由、页面、组件、样式；附录注明未启动 |
| url | 首屏截图、关键交互截图、标注图 |
| screenshot | 原图路径、局部确认图、标注图 |

### 双轨执行顺序

1. 枚举范围内全部 PC `surfaces[]`
2. 核对 `scope_inventory.tasks[]` 与任务契约 ID、名称完全一致
3. 按 `references/scope-inventory-completeness.md` 记录清单来源与完整性；范围内受阻页面保留在清单
4. 按 `references/pc-environment-validation.md` 记录主要 PC 环境并取得覆盖全部页面的证据
5. 逐页完成 `VIS-01 ... VIS-10`
6. 按 `references/cross-page-consistency.md` 完成跨页面对比；单页面说明不适用
7. 按 `references/task-state-coverage.md` 为每个 `tasks[]` 建立有依据的状态清单，并逐状态验证
8. 对每个任务完成 `CORE-01 ... CORE-10`、`A11Y-01 ... A11Y-10` 与适用领域模块
9. 用 `ignore-list.md` 排除误报，将确定问题与 `validation_backlog[]` 分离
10. 仅对确定问题使用 `severity-rubric.md`，严重度与置信度分别判断
11. 按 `references/claim-evidence-boundary.md` 区分页面事实、专家推断和用户行为实证

复查模式还须按 `references/follow-up-review.md` 逐项验证原验收标准，完成受影响页面和任务的回归检查，并区分仍存在的原问题与新问题。

证据仍不足 → 回到阶段 A1，不进入正式交付。

### 通过条件

- 完整 Markdown 报告已在对话输出
- 固定启用的 30 项均形成目标级 coverage；每个页面覆盖全部视觉项，每个任务覆盖全部核心与 PC 可访问性项，领域模块启用时逐任务追加
- 所有范围内页面已完成视觉轨或明确标记未完成原因
- 主要 PC 环境与用户回答相对应，实际 viewport、窗口方式、缩放及证据已记录并覆盖全部页面
- 多页面范围已用全部页面证据完成跨页面一致性对比；单页面已记录不适用原因
- 页面清单完整性已确认；若未确认则报告保持 `partial`
- 所有关键任务的状态清单均有依据；适用状态逐项有结果，未完成状态有原因与验证方法
- 确定问题均经 P 级与置信度判断；证据不足项进入 `validation_backlog[]`
- `issues[]` 可以为空，不得为满足数量而制造问题

### 禁止

- 先写问题再凑证据
- 模糊标注 / 无坐标依据的全图估框代替定位（见 `annotation-style.md` § 标注流程）
- screenshot / url 模式仅贴原图、不做 overlay（须 `annotate_issue.py`）
- 只给摘要或只给图片路径
- 凭感觉定 P0/P1/P2

---

## 阶段 C：docx 与完成自检

### 通过条件

- `validate_checklist_coverage.py` 已通过
- `validate_report_annotations.py` 已通过（screenshot / url）
- `generate_docx.py` 返回 `status=generated`
- 输出路径可用

### 失败回路

- coverage 门禁未过 → 补全 `coverage`、证据与交叉引用并重跑 `validate_checklist_coverage.py`
- 标注门禁未过 → 补标注产物（`annotate_issue.py`）并重跑 `validate_report_annotations.py`
- `.docx` 生成失败 → 说明失败阶段、直接原因和下一步
- 不可把 docx 失败的任务说成完整完成

字段与命名：`references/report-json.md`（含 JSON 与 DOCX 约定）。

---

## 完成判断（与 SKILL 一致）

- `complete`：A0 已确认；用户指定范围的页面清单完整性已确认；主要 PC 环境证据覆盖全部页面；范围内全部页面视觉轨完成；多页面范围完成跨页面一致性对比；全部关键任务状态清单已确认且适用状态与流程轨完成；校验通过；DOCX 生成成功。
- `partial`：已有有效观察，但仍有页面、任务或 coverage 未完成；标题含“阶段性”；校验通过；DOCX 生成成功。
- `blocked`：没有取得有效页面或任务证据；不输出正式报告。

DOCX 失败须明确说明失败原因，不能将任务宣称为完整交付。
