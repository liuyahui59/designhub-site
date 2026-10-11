# UX Walkthrough（体验走查）

对 PC 端 B 端产品做系统性体验走查：支持代码库 / URL / 截图三种输入。先确认用户、目标、关键任务和使用情境，再对全部范围页面检查视觉质量、为关键任务建立适用状态清单并检查流程与状态，输出结构化 Markdown 报告并生成本地 `.docx`。

## 适用场景

- 走查前端项目目录，找出交互与体验问题
- 打开业务 URL，结合截图留证做走查
- 基于设计稿或页面截图做审查

触发词：体验走查、UX review、交互走查、界面审查、体验问题

## 环境要求

- Python 3.9+
- 依赖：

```bash
pip install -r requirements.txt
```

macOS 标注定位可使用 Apple Vision OCR（`ocrmac`）；其他平台可安装 `pytesseract` + tesseract 作为 OCR 兜底。

## 主流程

```
A0 设计前置调查 → A1 输入 precheck → B 走查报告 → C 标注校验与 docx 生成
```

详见 `SKILL.md`。

## 交付物

1. 用户回答并确认的设计走查前置调查
2. 对话中的完整 Markdown 报告与 `report.json`
3. 分开的确定问题、待验证风险、正向模式和增强机会
4. 本地 `.docx` 路径（完整交付必需）
5. URL/截图模式：确定问题附带标注图与 bbox
