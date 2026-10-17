# bitty.panel 与 bitty.workspace 参考手册

`bitty.panel` 和 `bitty.workspace` 模块提供对窗口布局、面板展示模式以及多工作区组织的编程式控制。

## 面板管理 (`bitty.panel`)

面板承载终端 Shell 视图、富文本展示或自定义插件 UI 界面。

### 面板方法

#### `bitty.panel.create(spec)`

在当前活动工作区中创建一个新面板。

```lua
local result = bitty.panel.create({ type = "terminal" })
print("Created Panel ID: " .. result.id .. ", Generation: " .. result.generation)
```

- **参数**：包含 `type` 字符串（`"terminal"`, `"rich"` 或自定义提供者）的 `spec` 表。
- **返回值**：包含 `id` (`integer`) 与 `generation` (`integer`) 的表。

#### `bitty.panel.get_presentation(panel_id)`

查询面板当前的展示模式。

```lua
local mode = bitty.panel.get_presentation(panel_id)
-- 返回: "tiled", "floating" 或 "overlay"
```

#### `bitty.panel.set_presentation(panel_id, mode)`

动态设置面板的展示模式。

```lua
bitty.panel.set_presentation(panel_id, "floating")
```

#### `bitty.panel.toggle_floating(panel_id)`

在平铺二叉树布局与浮动窗口模式之间切换面板状态。

```lua
local is_floating = bitty.panel.toggle_floating(panel_id)
```

#### `bitty.panel.get_state(panel_id)`

获取面板的几何尺寸、焦点状态与视图属性。

```lua
local state = bitty.panel.get_state(panel_id)
if state then
  print(string.format("Width: %d, Height: %d, Focused: %s", state.width, state.height, tostring(state.focused)))
end
```

#### `bitty.panel.close(panel_id)` / `bitty.panel.destroy(panel_id)`

关闭或强制销毁指定面板。

```lua
bitty.panel.close(panel_id)
```

---

## 工作区管理 (`bitty.workspace`)

工作区充当独立的虚拟桌面标签页。

> [!IMPORTANT]
> 查询工作区需要 `workspace.read` 能力；修改工作区需要在 `bitty-plugin.toml` 中声明 `workspace.control` 能力。

### 工作区方法

#### `bitty.workspace.list()`

返回所有打开的工作区及其布局描述符的数组。

```lua
local list = bitty.workspace.list()
for _, ws in ipairs(list) do
  print(string.format("Workspace [%s]: %s (Active: %s)", ws.id, ws.name, tostring(ws.active)))
end
```

#### `bitty.workspace.new()`

创建一个新的工作区标签页。

```lua
bitty.workspace.new()
```

#### `bitty.workspace.focus(id)`

将活动视图切换至与 `id` 匹配的工作区。

```lua
bitty.workspace.focus(workspace_id)
```

#### `bitty.workspace.next()`

循环聚焦到下一个工作区标签页。

```lua
bitty.workspace.next()
```

#### `bitty.workspace.rename(id, name)`

重命名已有工作区。

```lua
bitty.workspace.rename(workspace_id, "Development")
```

#### `bitty.workspace.close(id)`

关闭指定工作区（若为 `nil` 则关闭当前聚焦的工作区）。

```lua
bitty.workspace.close(workspace_id)
```

#### `bitty.workspace.move_panel(target_workspace_id)`

将当前聚焦的面板移动到另一个工作区标签页。

```lua
bitty.workspace.move_panel(target_workspace_id)
```

---

## 实战示例：便签终端 (Scratchpad Panel)

构建一个可一键切换的浮动便签终端：

```lua
local scratchpad_id = nil

bitty.commands.register({
  id = "scratchpad:toggle",
  title = "Toggle Floating Scratchpad",
  run = function()
    if not scratchpad_id then
      local created = bitty.panel.create({ type = "terminal" })
      scratchpad_id = created.id
      bitty.panel.set_presentation(scratchpad_id, "floating")
    else
      local state = bitty.panel.get_state(scratchpad_id)
      if state and state.focused then
        bitty.panel.close(scratchpad_id)
        scratchpad_id = nil
      else
        bitty.panel.set_presentation(scratchpad_id, "floating")
      end
    end
  end,
})

bitty.keymaps.suggest({
  chord = "leader t s",
  command = "scratchpad:toggle",
})
```
