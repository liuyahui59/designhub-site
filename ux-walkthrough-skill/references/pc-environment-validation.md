# PC 设计环境验证

> 用途：确保页面视觉与布局结论来自用户回答的典型 PC 使用情境，而不是任意浏览器尺寸。这里只评价实际页面体验，不检查响应式代码或开发实现。

## 基本原则

- 不增加前置调查题目；直接复用 `review_brief.context.display_environment`。
- 正式视觉走查至少记录一个 `primary` PC 环境，并用该环境的页面证据覆盖全部范围 surface。
- 主要环境按用户回答设置。若用户回答“未知”，使用本次实际可验证的 PC viewport、窗口方式与缩放，并说明未知项或限制，不因未知而要求重填问卷。
- 只有用户明确使用分屏/窄窗，或实际页面出现换行、横滚、遮挡、不可达等风险时，才增加 `additional` 环境；不建立固定分辨率矩阵。
- 不检查移动端、触屏或跨设备适配。浏览器缩放仍属于 PC 体验。

## 检查内容

在主要环境中检查范围内全部页面：

- 页面框架、侧栏、标题、筛选区、工具栏和主要操作是否完整可达。
- 表格、表单、弹窗、抽屉、图表和固定区域是否裁切、遮挡或产生不可理解的横滚。
- 长文本、标签、按钮、状态与数值是否换行、截断或溢出。
- 信息密度和可扫描性是否符合用户的数据量、熟练度与窗口方式。
- 浏览器缩放后的焦点、操作与内容可达性继续按 `A11Y-04` 判断。

不因出现横向滚动就直接报问题；应判断滚动是否符合数据结构、是否保持关键列与操作可达，以及是否实际增加理解或操作成本。

## 结构化记录

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
      "surface_ids": ["PAGE-01", "PAGE-02"],
      "evidence_ids": ["EV-PAGE-01", "EV-PAGE-02"],
      "observation": "全部范围页面在主要工作环境中可达，筛选、表格、弹窗和主要操作未出现裁切。"
    }
  ]
}
```

## 字段与完成规则

- `target_environment` 必须与用户回答的 `review_brief.context.display_environment` 一致，建立判断依据。
- `status`：`completed / partial / blocked`。
- `completed` 必须且只能有一个 `role=primary` 环境；可按需增加 `additional`。
- primary 的 `surface_ids[]` 必须覆盖全部范围页面，其 evidence 也必须实际关联这些页面。
- `viewport_width / viewport_height` 是实际证据 viewport 的正整数，不是设计阈值。
- `browser_zoom_percent` 使用实际正整数；确实未知时写 `null`，并在该环境填写字符串 `limitations`。
- `window_mode` 使用实际描述，如“全屏”“左右分屏”“自定义窗口”“截图中未知”。
- `capture_source`：`live_browser / user_screenshot / design_export`。
- `partial / blocked` 必须填写 `reason / validation_method`，正式报告只能为 `partial`。

`completed` 只证明用户指定范围在记录的主要 PC 环境中完成检查，不代表所有桌面分辨率、窗口尺寸或缩放比例均已覆盖。
