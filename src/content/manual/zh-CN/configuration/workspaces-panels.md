# 工作区与面板 (Workspaces & Panels)

Bitty 通过可组合的容器层级结构组织窗口环境，将工作区布局与各个面板的呈现方式清晰解耦。

## 层级与核心概念

```text
Window
└── Workspaces (虚拟桌面 / 标签页)
    ├── Chrome Insets / 插槽 (视觉状态栏由扩展绘制，Core 从不绘制)
    └── Panels (容器)
        ├── Presentation Mode: Tiled, Floating 或 Overlay
        └── View: Shell 进程 / PTY 会话或原生 UI 部件
```

### 工作区 (Workspaces)

**Workspace** 是一个独立的虚拟桌面。每个工作区维护自己的布局树：

- 切换工作区会切换当前可见的窗格排列，而不会挂起或中断后台正在运行的 Shell 任务。
- 默认平铺算法通过 `workspace.layout` 配置（例如 `"dwindle"`, `"bsp"`）。
- **工作区栏机制分离**：依照 Bitty 的微内核哲学，Bitty Core 本身不绘制原生工作区状态栏，亦不维护栏的 UI 状态。视觉呈现由扩展负责，配置项 `workspace.show_bar` 与 `workspace.bar.edge`（默认 `"bottom"`，亦可设为 `"top"`）是 Core 预留输入，由扩展读取。

### 面板与布局间距 (Panels & Layout Spacing)

**Panel** 是受工作区管理的容器。Panel 将窗口管理逻辑与底层终端会话彻底解耦：

- **Panel ID != View ID != Terminal ID**：Panel 承载一个 View，但其展示模式可以动态改变。
- **平铺模式 (Tiled Mode)**：Panel 参与二叉树定向平铺布局（水平与垂直分屏）。
- **单元格间距 (Cell Gaps)**：平铺窗格之间的字符单元格间距由 `layout.gaps_in`（同级窗格之间的内部间距）和 `layout.gaps_out`（外部容器边距）控制。
- **调整大小步长 (Resize Granularity)**：交互式分屏大小调整使用 `layout.resize_step`（分屏比例增量，默认 `0.05`）。
- **浮动模式 (Floating Mode)**：Panel 脱离平铺树，浮动在活动终端之上，保留其尺寸、位置和焦点状态。
- **覆层模式 (Overlay Mode)**：瞬态可聚焦层（如命令面板 Command Palette 或选择器弹窗）居中显示，并在关闭前捕获键盘输入。

## 管理工作区与面板

面板和工作区可以通过默认快捷键控制，也可以通过 Lua API 进行编程式管理：

- 使用快捷键创建、分屏和导航面板。
- 完整的 Lua 自动化函数（如创建面板、切换浮动模式或切换工作区），请参阅 [bitty.panel 与 bitty.workspace API 参考文档](../api/panel-workspace.md)。
