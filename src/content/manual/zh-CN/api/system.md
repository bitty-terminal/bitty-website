# 核心系统 API：终端、配置、环境变量、文件系统与任务

本文档介绍 Bitty Core 的运行时系统 API，涵盖终端网格快照、只读配置反射、沙箱化环境变量、受能力鉴权管控的文件系统访问以及后台异步微任务调度。

## 终端检查 (`bitty.terminal`)

`bitty.terminal` 模块提供对活动终端字符网格状态的安全、有界检查。

### `bitty.terminal.snapshot(options)`

捕获当前活动终端窗格的语义快照：

```lua
-- bitty-plugin.toml 中需声明：
-- [capabilities]
-- terminal = ["terminal.semantic-read"]

local snapshot = bitty.terminal.snapshot({ scope = "semantic" })
if snapshot then
  bitty.notify.show({
    title = "Terminal Snapshot",
    body = string.format("Captured terminal grid with %d lines", #snapshot.lines or 0),
  })
end
```

- **参数**：包含 `scope = "semantic"` 的 `options` 表。
- **返回值**：包含结构化行文本、单元格属性以及语义区域描述符的表。
- **所需能力**：`terminal.semantic-read`。
- **预算与错误处理**：
  - 缺失能力直接返回错误 `E_CAPABILITY_DENIED`。
  - 不支持的作用域返回 `E_SNAPSHOT_SCOPE_UNSUPPORTED`。
  - 超过 256 KiB 的快照将以 `E_SNAPSHOT_TOO_LARGE` 错误安全中断，以保证可预测的内存边界。

---

## 配置反射 (`bitty.settings`)

`bitty.settings` 模块提供对宿主当前生效配置的只读视图。

### `bitty.settings.get(key)`

查询配置项的当前有效值：

```lua
local current_theme = bitty.settings.get("appearance.theme")
local font_family = bitty.settings.get("font.family")
local scrollback = bitty.settings.get("terminal.scrollback")
```

- **参数**：`key` (`string`, 1..=128 字节)。必须指定已声明的配置字段路径（例如 `"appearance.theme"`, `"font.size"`）。
- **返回值**：生效的配置值，未设置或未声明时返回 `nil`。
- **安全边界**：完全只读。插件无法通过此接口修改用户配置；用户配置文件保留最高主权。

---

## 环境变量 (`bitty.env`)

`bitty.env` 模块提供对宿主进程特定环境变量的受控访问。

### 能力鉴权与脱敏拒绝 (Desensitized Denial)

不受信任的插件不具有任何宿主环境变量的默认环境访问权限。访问必须在 `bitty-plugin.toml` 中显式逐项声明：

```toml
[capabilities]
env = ["env.read:PWD", "env.read:TERM", "env.read:BITTY_*"]
```

> [!SECURITY]
> 当插件查询未获授权的环境变量时，`bitty.env` 统一返回 `nil`（或抛出 `E_NOT_IMPLEMENTED` 错误）。这种脱敏拒绝机制有效防止恶意插件探测用户宿主系统上是否存在敏感环境变量（例如 Token、API Key 或认证凭据）。

### 环境变量访问方法

#### `bitty.env.get(key)`

获取已获授权的环境变量字符串值：

```lua
local current_dir = bitty.env.get("PWD")
if current_dir then
  -- 使用目录路径
end
```

- **参数**：`key` (`string`, 1..=64 字节，大写 ASCII、数字和下划线)。
- **返回值**：字符串值；未设置或未授权时返回 `nil`。

#### `bitty.env.has(key)`

测试环境变量是否已被授予并在宿主中定义：

```lua
if bitty.env.has("TERM") then
  -- 宿主已定义 TERM
end
```

- **返回值**：`boolean`（仅在变量已被授予且当前存在时返回 `true`）。

---

## 沙箱化文件系统 (`bitty.fs`)

> [!IMPORTANT]
> `bitty.fs` 的调用形式（`read` / `write` / `list`）存在，但 Bitty Core **没有附带文件系统后端**：即使声明了授予，每次调用都以 `E_NOT_IMPLEMENTED` 安全中断。下述能力语法记录的是未来后端必须遵守的契约。

根据 RFC-0005，`bitty.fs` 模块提供一个有界、受能力管控的文件系统桥接，旨在杜绝路径遍历攻击和句柄泄漏。

### 能力与路径模式授权

插件必须在 `[capabilities]` 下声明路径模式授权：

```toml
[capabilities]
fs = [
  "fs.read:/tmp/my-plugin/*",
  "fs.write:/tmp/my-plugin/cache.json"
]
```

### 核心不变量

1. **无 `open` 原语**：Bitty 不向 Lua 暴露裸文件句柄或文件描述符。文件访问是离散且有界的。
2. **不可信来源溯源 (Untrusted Provenance)**：所有通过 `bitty.fs.read` 读取的内容均携带 `{ untrusted = true }` 标记。将文件内容接入 Shell 执行或系统剪贴板需要另外的显式权限。
3. **无文件监听器或流式游标**：Bitty 严禁在 Lua VM 滴答周期之间维持常驻句柄或流式游标。

### 文件系统操作方法

#### `bitty.fs.read(path)`

将整个文件读取至内存中：

```lua
local result = bitty.fs.read("/tmp/my-plugin/config.json")
if result then
  local content = result.content
  -- result.untrusted 为 true
end
```

- **参数**：`path` (`string`, 1..=4096 字节)。
- **返回值**：表 `{ content = string, untrusted = true }`。
- **所需能力**：`fs.read:<PATTERN>`。

#### `bitty.fs.write(path, content, options)`

将字符串内容写入文件：

```lua
bitty.fs.write("/tmp/my-plugin/cache.json", '{"ready": true}', {
  append = false, -- false 创建或覆盖；true 追加
})
```

- **参数**：
  - `path` (`string`, 1..=4096 字节)。
  - `content` (`string`, 受宿主预算约束)。
  - `options` (`table`, 可选)：`{ append = boolean }`（默认 `false`）。
- **所需能力**：`fs.write:<PATTERN>`。
- **提交前超时机制**：所有写入操作受超时定时器保护；过期的写入直接失败闭合，不产生磁盘改动。

#### `bitty.fs.list(prefix, max_entries)`

列出与路径前缀匹配的目录项：

```lua
local entries = bitty.fs.list("/tmp/my-plugin/", 64)
for _, entry in ipairs(entries) do
  -- entry.name: 文件名字符串
  -- entry.kind: "file" | "directory" | "symlink"
end
```

- **参数**：
  - `prefix` (`string`, 1..=4096 字节)。
  - `max_entries` (`integer`, 可选，默认 `256`，最大 `4096`)。
- **返回值**：目录项描述符表的数组 (`{ name = string, kind = string }`)。
- **所需能力**：`fs.read:<PATTERN>`。

---

## 后台任务 (`bitty.tasks`)

`bitty.tasks` 模块允许插件调度由 Bitty 无栈事件循环管理的后台异步微任务，不会阻塞用户的终端会话。

### `bitty.tasks.spawn(fn)`

派生一个延迟执行的微任务：

```lua
local task_handle = bitty.tasks.spawn(function()
  -- 在宿主事件循环 tick 滴答周期上异步执行
  bitty.notify.show({
    title = "Background Task",
    body = "Asynchronous task completed",
  })
end)
```

- **参数**：`fn` (`function`)。
- **返回值**：`integer` 任务句柄。
- **配额**：每个插件代次最多允许 64 个并发任务 (`REGISTRATION_MAX_TASKS`)。第 65 个 spawn 将以 `E_BUDGET_TASK` 错误安全中断。

### `bitty.tasks.cancel(handle)`

在微任务执行前取消它：

```lua
local cancelled = bitty.tasks.cancel(task_handle)
```

- **参数**：`handle` (`integer`)。
- **返回值**：`boolean`（若任务存在且在执行前成功移除则返回 `true`）。
