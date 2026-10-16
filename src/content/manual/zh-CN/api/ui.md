# bitty.ui 参考手册

`bitty.ui` 模块提供了声明式 UI 贡献界面。插件将声明式场景树构建并挂载到宿主管理的插槽中，在改变视觉呈现的同时严格保持终端字符网格的完整性。

## 设计原则

- **纯声明式 (Declarative Only)**：Lua 插件仅生成不可变的数据描述树。Rust 宿主负责布局计算并直接通过 `wgpu` 进行硬件合成渲染。
- **无立即模式循环 (No Immediate-Mode Loops)**：Lua 绝不参与逐帧绘制循环。仅在状态发生变化时响应式触发增量更新。
- **严格资源预算**：场景深度、节点数量以及文本内存分配均受严格限制，杜绝界面掉帧。

## 核心方法

### `bitty.ui.mount(slot, component)`

将声明式组件树挂载到宿主管理的插槽中。

```lua
local handle = bitty.ui.mount(slot, component)
```

- **参数**：
  - `slot` (`string`)：目标插槽名称。
  - `component` (`table`)：声明式节点表。
- **返回值**：`integer` — 不透明且具有代次归属的 `block_id` 句柄。
- **所需能力**：在 `bitty-plugin.toml` 中声明 `ui.rich`。

#### 支持的插槽类型 (Supported Slots)

| 插槽名称       | 布局状态   | 说明                                                             |
| :------------- | :--------- | :--------------------------------------------------------------- |
| `"top"`        | **已绘制** | 顶部窗口修饰边缘栏。                                             |
| `"bottom"`     | **已绘制** | 底部窗口修饰边缘栏。                                             |
| `"statusline"` | **已绘制** | 状态栏（与底部边缘共享层叠堆叠顺序）。                           |
| `"left"`       | 已存储     | 左侧边缘栏（保存在注册表中；当垂直边缘栏激活时绘制）。           |
| `"right"`      | 已存储     | 右侧边缘栏（保存在注册表中；当垂直边缘栏激活时绘制）。           |
| `"tabline"`    | 独占保留   | 独占认领的标签条。需在清单中声明 `[lazy].claims = ["tabline"]`。 |
| `"overlay"`    | 交互式     | 可聚焦的覆层界面。需要 `ui.overlay` 能力。                       |
| `"terminal"`   | 独占保留   | 附加到回滚缓冲区的终端块。                                       |

### `bitty.ui.update(block_id, component)`

替换与活动 `block_id` 关联的场景子树。

```lua
local ok = bitty.ui.update(handle, component)
```

- **参数**：
  - `block_id` (`integer`)：由先前 `bitty.ui.mount` 调用返回的句柄。
  - `component` (`table`)：替换的组件树。
- **返回值**：`boolean` — 更新成功返回 `true`；若句柄已失效或属于其他代次则返回 `false`。

## 声明式节点词汇 (Declarative Node Vocabulary)

Bitty Plugin API v1 接受 4 种轻量级声明式节点类型：

### 1. `Text`

显示带样式文本内容的叶节点。

```lua
{
  kind = "Text",
  text = "  bitty ",
  fg = "accent",          -- 主题 Token 或十六进制颜色
  bg = "surface.2",       -- 主题背景 Token
  bold = true,            -- 可选布尔值
  on_click = {            -- 可选命令触发器
    command = "my-plugin:toggle",
    args = { mode = "fast" },
  },
}
```

### 2. `Row`

水平排列子节点的容器。

```lua
{
  kind = "Row",
  children = {
    { kind = "Text", text = "Branch: " },
    { kind = "Text", text = "main", fg = "accent", bold = true },
  },
}
```

### 3. `Column`

垂直排列子节点的容器。

```lua
{
  kind = "Column",
  children = {
    { kind = "Text", text = "Line 1" },
    { kind = "Text", text = "Line 2" },
  },
}
```

### 4. `List`

顺序列表容器。

```lua
{
  kind = "List",
  children = { item1, item2, item3 },
}
```

> [!NOTE]
> 重量级节点如 `Block`, `Image`, `CodeBlock`, `Table` 和 `Rule` 在 v1 中暂不支持。传入这些节点将返回 `E_UI_COMPONENT_INVALID` 错误。

## 交互式点击命令 (`on_click`)

节点可以绑定交互式点击。点击时，宿主将事件通过命令总线分派，而非直接在渲染线程中调用任意 Lua 闭包：

```lua
on_click = {
  command = "custom.my-plugin:select",
  args = { index = 1, name = "tab" },
}
```

- `command`：命令标识符字符串（最多 64 字节）。
- `args`：键值标量映射（最多 16 个参数，每个字符串最多 256 字节）。

## 硬件安全预算 (Hardware Safety Budgets)

桥接层在将节点提交给 Rust 之前强制执行确定性上限：

- **最大树深度**：16 层 (`UI_MAX_DEPTH`)。
- **每个 UI 块最大节点数**：2,048 个节点 (`UI_MAX_NODES`)。
- **每个 UI 块最大文本字节数**：256 KiB (`UI_MAX_TEXT_BYTES`)。
- **每个插件最大保留 UI 块数**：64 个块 (`UI_MAX_BLOCKS`)。

## 覆层与瞬态输入 (`bitty.ui.overlay`)

对于需要瞬态捕获键盘输入的命令面板、模态弹窗或选择器界面：

```lua
-- 获取输入捕获（需 ui.overlay.focus 能力）
local session = bitty.ui.overlay.acquire({
  title = "Quick File Switcher",
  placeholder = "Type to search...",
})

-- 更新覆层内容
bitty.ui.overlay.update(session, content_tree)

-- 异步轮询捕获的输入事件
local events = bitty.ui.overlay.poll(session, 16)

-- 完成后释放覆层
bitty.ui.overlay.release(session, "submitted") -- 或 "cancelled"
```

## 完整示例：构建实时状态栏组件

```lua
-- bitty-plugin.toml 中需要声明：
-- [capabilities]
-- ui = ["ui.rich"]

local status_tree = {
  kind = "Row",
  children = {
    {
      kind = "Text",
      text = "  BITTY ",
      fg = "accent",
      bold = true,
      on_click = { command = "palette:open", args = {} },
    },
    {
      kind = "Text",
      text = " | Ready",
      fg = "surface.1",
    },
  },
}

-- 挂载到 statusline 插槽
local handle = bitty.ui.mount("statusline", status_tree)

-- 当接收到事件时动态更新状态栏
bitty.events.subscribe("terminal.state_changed", function(ev)
  status_tree.children[2].text = " | " .. ev.state
  bitty.ui.update(handle, status_tree)
end)
```
