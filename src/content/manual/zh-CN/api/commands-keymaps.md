# bitty.commands 与 bitty.keymaps 参考手册

命令与键位映射子系统协调 Bitty 全局的用户动作、命令面板（Command Palette）入口及键盘快捷键，同时严格捍卫用户对键位绑定的最终主权。

## 命令系统 (`bitty.commands`)

命令代表命名的操作行为，可以通过键位映射、UI 点击处理器或交互式命令面板触发。

### 注册命令

```lua
bitty.commands.register({
  id = "my-plugin:format-buffer",
  title = "Format Active Buffer",
  description = "Runs the configured formatter on the current active view",
  run = function(args)
    -- 执行动作逻辑
    bitty.notify.show({
      title = "Formatter",
      body = "Buffer formatted successfully",
    })
  end,
})
```

- **参数**：包含 `id` (`string`, 最长 128 字节)、`title` (`string`, 最长 128 字节)、可选 `description` (`string`, 最长 1024 字节) 和 `run` (`function`) 的表。
- **配额**：每个插件代次最多允许 128 个已注册命令 (`REGISTRATION_MAX_COMMANDS`)。
- **延迟加载清单声明**：在 `bitty-plugin.toml` 的 `[lazy]` 下声明 `commands = ["my-plugin:format-buffer"]`。启动时，命令将立即出现在命令面板中，而无需初始化该插件的 Lua VM。当用户首次调用该命令时，VM 才会按需加载。

## 键位建议 (`bitty.keymaps`)

在 Bitty 中，用户配置文件拥有键盘绑定的终极仲裁权。插件**绝不允许**在未经用户控制的情况下强行劫持或绑定全局快捷键。

### 建议默认键位

插件通过 `bitty.keymaps.suggest` 提出快捷键建议：

```lua
-- 建议一个全局组合键
local handle = bitty.keymaps.suggest({
  chord = "ctrl+shift+k",
  command = "my-plugin:format-buffer",
  when = "global",
})
```

- **`chord`**：指定修饰键与按键组合的序列字符串（例如 `"ctrl+shift+k"`, `"alt+p"`）。
- **`command`**：触发的目标命令 ID。
- **`when`**：执行上下文作用域（默认 `"global"`）。

### Leader 前缀建议

插件可以使用用户配置的 Leader 前缀来建议组合键：

```lua
-- 建议按 Leader 后跟 'f' 再按 'b'
bitty.keymaps.suggest({
  chord = "leader f b",
  command = "my-plugin:format-buffer",
  when = "global",
})
```

使用 `"leader <key>"` 会自动解析用户配置的 `input.leader`（或 `leader_key`），无需硬编码具体的修饰键。

### 用户键位配置 (`init.lua`)

用户可以直接在 `$XDG_CONFIG_HOME/bitty/init.lua` 中绑定或覆盖键位序列：

```lua
return {
  keymaps = {
    {
      chord = "ctrl+shift+k",
      action = "my-plugin:format-buffer",
      context = "global",
    },
    {
      chord = "ctrl+p",
      action = "palette:toggle",
      context = "global",
    },
  },
}
```

## 事件系统 (`bitty.events`)

使用 `bitty.events.subscribe` 订阅终端生命周期与运行环境事件：

```lua
bitty.events.subscribe("focus.changed", function(event)
  if event.focused then
    -- 面板获得焦点
  else
    -- 面板失去焦点
  end
end)
```

- **参数**：`kind` (`string`, 1..=128 字节) 和 `handler` (`function`)。
- **配额**：每个插件代次最多允许 256 个事件订阅 (`REGISTRATION_MAX_EVENTS`)。

### 标准事件列表

宿主只接纳封闭集合内的事件类型；订阅未知类型将安全拒绝载荷：

| 事件名称                   | 说明                                                                                        |
| :------------------------- | :------------------------------------------------------------------------------------------ |
| `"terminal.opened"`        | 终端会话已打开。                                                                            |
| `"terminal.closed"`        | 终端会话已关闭。                                                                            |
| `"terminal.title-changed"` | 终端标题发生变更。                                                                          |
| `"terminal.cwd-changed"`   | 终端工作目录发生变更。                                                                      |
| `"terminal.bell"`          | 终端铃声 (Bell) 报警被触发。                                                                |
| `"focus.changed"`          | 窗格或窗口焦点获取/失去。                                                                   |
| `"selection.changed"`      | 终端选区发生变更。                                                                          |
| `"process.exited"`         | 被监管的子进程已退出。                                                                      |
| `"config.reloaded"`        | 生效配置已重新加载。                                                                        |
| `"plugin.activated"`       | 插件代次已激活。                                                                            |
| `"plugin.suspended"`       | 插件代次已挂起。                                                                            |
| `"plugin.disposed"`        | 插件代次已销毁。                                                                            |
| `"handler.violation"`      | 插件处理器违反预算或契约。                                                                  |
| `"intercept.*"`            | 门控拦截钩子（`command-dispatch`、`terminal-spawn`、`paste`、`open-url`）——载荷按授予脱敏。 |
