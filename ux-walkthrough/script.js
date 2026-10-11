const phases = {
  a0: {
    kicker: "REVIEW BRIEF · 7/7 CONFIRMED",
    title: "设计前置调查",
    desc: "确认走查范围、主要用户、核心目标、关键任务、PC 使用情境、成功标准和失败影响。",
    proofLabel: "GATE",
    proof: "7 项前提由用户明确确认",
  },
  a1: {
    kicker: "INPUT PRECHECK · MODE DETECTED",
    title: "输入与证据检查",
    desc: "识别代码库、URL 或截图；检查运行环境、枚举范围页面，并选择本次需要启用的领域模块。",
    proofLabel: "OUTPUT",
    proof: "surface 清单、task 契约、证据边界",
  },
  b: {
    kicker: "DUAL TRACK · SURFACE + TASK",
    title: "双轨走查与综合",
    desc: "对每个页面完成视觉轨，对每条关键任务完成流程、状态和 PC 无障碍检查，再横向比较跨页一致性。",
    proofLabel: "RULE",
    proof: "确定问题与待验证风险分开",
  },
  c: {
    kicker: "VALIDATION · REFERENCES PASSED",
    title: "校验交付与设计复查",
    desc: "校验 coverage 矩阵和所有引用，交付 Markdown、JSON 与本地 DOCX；修改后回到原验收标准，并检查相邻页面与状态的回归。",
    proofLabel: "DELIVERY",
    proof: "结构、标注、文档三道校验",
  },
};

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const rootStyles = getComputedStyle(document.documentElement);
const motion = {
  entrance: rootStyles.getPropertyValue("--easing-entrance-productive").trim(),
  moderate02: reduceMotion ? 1 : Number.parseFloat(rootStyles.getPropertyValue("--duration-moderate-02")),
};

const header = $("[data-header]");
window.addEventListener("scroll", () => header.classList.toggle("scrolled", window.scrollY > 20), { passive: true });

const menuToggle = $("[data-menu-toggle]");
const nav = $("[data-nav]");
menuToggle.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "关闭导航" : "打开导航");
});
$$('a[href^="#"]', nav).forEach((link) => link.addEventListener("click", () => {
  nav.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
}));

$$('[data-phase]').forEach((button) => button.addEventListener("click", () => {
  const phase = phases[button.dataset.phase];
  $$('[data-phase]').forEach((tab) => {
    const active = tab === button;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  $("[data-phase-kicker]").textContent = phase.kicker;
  $("[data-phase-title]").textContent = phase.title;
  $("[data-phase-desc]").textContent = phase.desc;
  $("[data-phase-proof-label]").textContent = phase.proofLabel;
  $("[data-phase-proof]").textContent = phase.proof;
  $(".phase-copy").animate(
    [{ opacity: .5, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }],
    { duration: motion.moderate02, easing: motion.entrance }
  );
}));

$$('[data-matrix]').forEach((button) => button.addEventListener("click", () => {
  const selected = button.dataset.matrix;
  $$('[data-matrix]').forEach((item) => {
    const active = item === button;
    item.classList.toggle("active", active);
    item.setAttribute("aria-pressed", String(active));
  });
  $$('[data-type]').forEach((cell) => cell.classList.toggle("hidden-cell", selected !== "all" && cell.dataset.type !== selected));
}));

const copyButton = $("[data-copy-prompt]");
copyButton.addEventListener("click", async () => {
  const text = $("[data-prompt]").textContent;
  try {
    await navigator.clipboard.writeText(text);
    $("[data-copy-label]").textContent = "已复制";
    window.setTimeout(() => { $("[data-copy-label]").textContent = "复制指令"; }, 1600);
  } catch {
    $("[data-copy-label]").textContent = "已选中";
    const range = document.createRange();
    range.selectNodeContents($("[data-prompt]"));
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: .12 });
$$('.reveal').forEach((element) => observer.observe(element));
