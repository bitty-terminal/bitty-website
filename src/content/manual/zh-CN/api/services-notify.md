# bitty.services、通知与状态管理参考手册

本文档介绍服务发现、系统桌面通知、插件持久化键值存储以及异步定时器调度系统。

## 服务提供总线 (`bitty.services`)

服务总线允许插件通过宿主发现并调用由对等插件提供的带版本能力，而无需与外部文件或源码紧密耦合。Bitty Core 本身不提供任何内置服务：目录初始为空，条目仅经 `bitty.services.provide` 出现，且解析要求消费者的清单中具有匹配的 `services.required` 声明（未声明的查找安全中断）。

### 提供与调用服务

```lua
-- 提供方：发布接口表（版本写在清单里：
-- [services.provided] "my-plugin.formatter" = "1.2.0"）
bitty.services.provide("my-plugin.formatter", {
  format = function(text) return text end,
})

-- 调用方（需求先写在清单里）：
-- [services.required]
-- "my-plugin.formatter" = "^1.0"
local formatter = bitty.services.get("my-plugin.formatter")
if formatter then
  local result = formatter.format("hello")
end
```

- 确定性选择：满足约束的最高版本获胜；相同版本按提供方 id 排序。无法解析的需求或版本一律不满足（安全中断）。
- `bitty.services.get(iface, opts)`：`opts.version` 覆盖清单需求文本（但不能替代声明）；`opts.optional = true` 时不可解析返回 `nil` 而非 `E_SERVICE_RESOLUTION`。提供未声明的接口以 `E_SERVICE_UNDECLARED` 失败。

---

## 桌面通知 (`bitty.notify`)

在被授予 `platform.notify` 能力时向系统发送原生桌面通知。

### `bitty.notify.show(payload)`

```lua
local accepted = bitty.notify.show({
  title = "Build Complete",
  body = "Compilation finished in 4.2 seconds.",
  urgency = "normal", -- "low" | "normal" | "critical"
})
```

- **参数**：
  - `title` (`string`)：受长度限制的标题字符串（由宿主渲染）。
  - `body` (`string`)：可选的通知正文。
  - `urgency` (`string`)：优先级等级（`"low"`, `"normal"` 或 `"critical"`）。
- **返回值**：`boolean` — 宿主通知队列成功接收时返回 `true`。

---

## 键值存储 (`bitty.store`)

每个插件分配一个沙箱化、代次隔离的持久化键值存储空间。数据在重启或插件重新加载后依然持久保存。

```lua
-- 保存状态值
bitty.store.set("last_sync_key", "snapshot-2026-10-08")

-- 读取已保存的值
local last_sync = bitty.store.get("last_sync_key")

-- 传入 nil 清除指定的键
bitty.store.set("temporary_cache", nil)
```

- **配额**：每个插件限额——单值 8 KiB（`STORE_MAX_VALUE_BYTES`）、256 条目（`STORE_MAX_ENTRIES`）、总量 64 KiB（`STORE_MAX_TOTAL_BYTES`）、键 128 字节（`STORE_MAX_KEY_BYTES`）。溢出在变更前以 `E_STORE_QUOTA` 安全中断。

---

## 定时器 (`bitty.timers`)

高精度异步定时器调度器，直接由 Bitty Core 的统一事件循环驱动。Lua 代码绝不会通过 sleep 循环阻塞主线程：

```lua
-- 创建延迟执行的毫秒定时器
local timer_handle = bitty.timers.create(1000, function()
  bitty.notify.show({
    title = "Timer",
    body = "Fired after 1 second",
  })
end)

-- 取消活动定时器
local cancelled = bitty.timers.cancel(timer_handle)
```

- **`bitty.timers.create(delay_ms, callback)`**：调度在 `delay_ms` 毫秒后执行回调函数。返回整数句柄。
- **`bitty.timers.cancel(handle)`**：取消等待中的定时器。成功移除时返回 `true`。
