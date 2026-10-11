# 跨页面视觉与交互一致性

> 用途：在逐页视觉检查之后横向比较范围内页面，识别单页检查不易发现的系统性不一致。该步骤不是新的 checklist 模块，也不要求不同场景机械统一。

## 何时执行

- `scope_inventory.surfaces[]` 只有一个页面时，记录 `status=not_applicable` 并说明只有一个可比较页面。
- 有两个及以上页面时必须执行；完整报告要求 `status=completed`。
- code fallback 无法取得实际渲染时使用 `partial / blocked`，说明缺口和补证方式，不根据代码外观推断视觉一致。

## 比较方法

使用各页面已有视觉证据进行横向比较，根据实际页面选择有意义的关系：

- 页面框架、标题区、内容边界和主要操作位置。
- 同类筛选、工具栏、表格、表单、弹窗、抽屉与反馈组件。
- 相同业务状态、功能色、图标、术语和交互结果表达。
- 字体、间距、组件尺寸、信息密度与视觉节奏。
- 列表、详情、编辑、配置等相邻页面之间的连续性。

不要求页面使用完全相同的布局。对象类型、任务深度、风险和信息密度不同造成的合理差异应保留；只有差异影响理解、操作预期、学习成本或专业完成度时才形成问题。

## 结构化记录

```json
"cross_page_consistency": {
  "status": "completed",
  "surface_ids": ["PAGE-01", "PAGE-02"],
  "evidence_ids": ["EV-PAGE-01", "EV-PAGE-02"],
  "observation": "列表与详情沿用相同页面标题、状态标签和操作层级；详情的信息密度差异符合阅读任务。"
}
```

- `surface_ids[]` 必须覆盖本次范围内全部页面，避免只挑相似页面比较。
- `completed` 必须有覆盖全部页面的视觉证据和具体观察；结论可以是未发现问题。
- `partial / blocked` 必须填写 `reason / validation_method`，正式报告只能为 `partial`。
- `not_applicable` 仅允许单页面范围，并填写 `reason`。
- 不设置统一页面数量、间距或组件尺寸阈值；根据项目 Design System、页面关系和实际体验判断。

## 问题记录

- 单页局部问题仍使用 `evaluation_track=visual`。
- 同一视觉或交互规律影响两个以上页面时使用 `evaluation_track=visual_system`。
- `visual_system` 问题至少关联两个 `surface_ids`，并按 `issue-consolidation.md` 用 `occurrences[]` 保留每个页面实例和证据。
- 一个跨页面问题只形成一条归并问题，不按页面重复统计。
