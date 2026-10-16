# Lua API 参考手册 (Lua API Reference)

Bitty 通过 Lua 中的全局只读命名空间 `bitty` 向沙箱提供运行时 API。

## API 架构与扩展层级

API 在结构上清晰划分为两个不同的运行层级：

```text
Global bitty Namespace
├── L1 Control & State (控制与状态)
│   ├── bitty.commands        # 注册上下文命令
│   ├── bitty.events          # 订阅运行时生命周期事件
│   ├── bitty.keymaps         # 建议默认键盘快捷键序列
│   ├── bitty.panel           # 控制面板生命周期与展示模式
│   ├── bitty.workspace       # 查询与排布工作区
│   ├── bitty.notify          # 显示系统桌面通知
│   ├── bitty.store           # 代次隔离的键值持久化存储
│   ├── bitty.settings        # 读写用户配置项
│   ├── bitty.timers          # 高精度异步定时器
│   ├── bitty.tasks           # 异步任务执行器
│   └── bitty.services        # 跨插件服务提供总线（仅对等提供）
└── L2 Presentation & UI (展示与界面)
    └── bitty.ui              # 声明式 UI 场景树、插槽与覆层系统
```

- **L1 控制层 (L1 Control Level)**：管理状态、处理动作、协调命令并响应事件。改变行为逻辑，不直接触碰终端渲染管线。
- **L2 展示层 (L2 Presentation Level)**：将声明式 UI 场景子树挂载到宿主管理的插槽中。改变界面外观，不篡改终端字符流事实。

## 版本探测 (Version Discovery)

在运行时检查当前运行的 Plugin API 契约版本：

```lua
local api_version = bitty.api_version
print("Running Bitty Plugin API: " .. tostring(api_version))
```

## 结构化错误处理模型 (`BridgeError`)

穿透宿主桥接层的所有权限拒绝或运行时故障，均以带有三个结构化字段的捕获型 Lua 错误表返回：

```text
{
  class   = "runtime" | "validation" | "resolution" | "budget",
  code    = "E_CAPABILITY_DENIED" | "E_TIMEOUT" | "E_UI_UNAVAILABLE" | ...,
  message = "来自宿主的可读描述"
}
```

### 惯用错误处理模式

建议始终匹配 `err.code`，而非通过解析字符串内容判断错误：

```lua
local ok, err = pcall(function()
  return bitty.ui.mount("statusline", {
    kind = "Text",
    text = "Status text",
  })
end)

if not ok then
  if type(err) == "table" then
    if err.code == "E_CAPABILITY_DENIED" then
      print("Error: Missing ui.rich capability in bitty-plugin.toml")
    elseif err.code == "E_UI_UNAVAILABLE" then
      print("Error: The requested slot is unavailable in this host build")
    else
      print(string.format("[%s] %s: %s", err.class, err.code, err.message))
    end
  else
    print("Fatal error: " .. tostring(err))
  end
end
```

## API 模块参考

查看各个细分功能模块的专用参考文档：

- [bitty.ui 参考文档](ui.md) — 声明式场景树、插槽、覆层与目标渲染框架。
- [bitty.commands 与 bitty.keymaps 参考文档](commands-keymaps.md) — 命令注册与键盘快捷键序列管理。
- [bitty.panel 与 bitty.workspace 参考文档](panel-workspace.md) — 面板展示模式、布局操作与工作区导航。
- [bitty.services、通知与状态管理参考文档](services-notify.md) — 服务发现、桌面通知、键值存储与定时器。
- [核心系统 API 参考文档](system.md) — 终端快照、配置反射、沙箱化环境变量、文件系统与任务。
