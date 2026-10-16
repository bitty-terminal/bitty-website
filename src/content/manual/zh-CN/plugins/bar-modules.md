# 状态栏模块用户指南 (Bar Modules User Guide)

统一状态栏（`bitty-terminal.bar`）渲染一个内嵌行：工作区药丸加上三组有序的可选系统模块——左侧、中间、右侧——在你的[插件配置文件](plugin-settings.md)中声明。布局借鉴你可能熟悉的 Waybar，但有一个宿主限制：v1 API 没有提供弹性间隔节点，因此三组按声明顺序从左到右渲染，而非真正的左/中/右对齐。

## 选择模块

```toml
# $XDG_CONFIG_HOME/bitty/plugins/bitty-terminal.bar.toml
show = true
modules_left = ["workspaces", "cpu", "memory", "battery"]
modules_center = []
modules_right = ["clock", "pulseaudio"]
```

未知模块名、非列表分组或解析为空的计划永远不会隐藏状态栏：计划回退为 `modules_left = ["workspaces"]`。单个工作区会隐藏状态栏，除非设置 `show_single = true`；`show = false` 隐藏一切。

## Fail-closed 行为

当 provider 缺失、未授权、数据过期超过期限、被撤销或格式错误时，每个 provider 驱动的模块都会隐藏自己——其余部分不受影响。隐藏的模块永远不会连带隐藏状态栏，且 provider 只发送原始数值：阈值与图标在 Lua 侧求值，因此数据源丢失只会退化为缺席，绝不会伪造零值。

读与控制永远不在同一接口上。缺少控制授权时降级为只读渲染（点击时降级为通知），绝不会报错、重试或提权。

## 模块目录

### workspaces（事件驱动）

每个工作区一个药丸（`{stable-id}:{name}`，活动药丸带 `*` 标记），其后为工作区计数。名称按 `name_max_chars`（默认 `32`）截断；整行限制 1024 UTF-8 字节。点击非活动药丸聚焦对应工作区；活动药丸、分隔符与计数后缀不可点击。窗口暂存槽被占用时在计数后追加 "[scratchpad]" 标记，即使单个工作区也会强制显示状态栏。

### clock（本地，无需授权）

按模块级 `format`（默认 `"%H:%M"`）渲染 `os.date`。按 `tick_ms`（默认 `60000`，下限 `200` ms）刷新。

### cpu（provider `system.cpu`）

按 provider 2 s 上限轮询聚合 CPU 使用率（`tick_ms` 默认 `2000`，下限 `1000` ms）。模板键：`{total}`、`{total_pct}`（取整）；默认格式 `"{total}%"`。

| 选项       | 默认值       | 说明                                                    |
| :--------- | :----------- | :------------------------------------------------------ |
| `format`   | `"{total}%"` | 模板覆盖                                                |
| `warning`  | `80`         | 达到或超过即为 `warning`；需满足 `warning` < `critical` |
| `critical` | `90`         | 达到或超过即为 `critical`                               |
| `tick_ms`  | `2000`       | 轮询节奏；下限 `1000` ms                                |
| `tooltip`  | 无           | 详情文本，例如 `CPU 42% (8 cores)`                      |

### memory（provider `system.memory`）

按 2 s 上限轮询内存与交换分区使用率（`tick_ms` 默认 `2000`，下限 `1000` ms）。模板键：`{pct}`、`{used}`、`{total}`（GiB）及交换分区三元组；默认格式 `"{pct}%"`。`warning`（`80`）与 `critical`（`90`）与 `cpu` 同为向上告警方向。默认详情：`Memory 5/8 GiB (63%)`，有交换分区数据时一并显示。

### battery（provider `system.battery`）

按 5 s 上限轮询电量与充电状态（`tick_ms` 默认 `5000`，下限 `1000` ms）。模板键：`{icon}`、`{capacity}`、`{state}`；默认格式 `"{icon} {capacity}%"`。

| 选项       | 默认值 | 说明                                |
| :--------- | :----- | :---------------------------------- |
| `warning`  | `30`   | 低于或等于即为 `warning`——仅放电时  |
| `critical` | `15`   | 低于或等于即为 `critical`——仅放电时 |

仅放电中的电池会在低电量时告警；`full`、`charging`、`plugged` 与 `unknown` 状态按默认样式渲染图标。图标为按电量划分的五个 ASCII 档（`[    ]` 到 `[====]`），充电时带 `+` 标记。默认详情：`Battery 63% discharging`，有上报时附带功率与剩余时间。

### network（provider `network`，下限 3 s）

链路加实测带宽（`wifi 8.0K/4.0K`）；未测得的速率直接省略，绝不填零。仅当单独授权的 `network.essid` 子接口可解析时才渲染 ESSID（`wifi 8.0K/4.0K (Home)`）；否则该键缺席，其余不受影响。永远不可点击。选项：`format`（`{link}`、`{down}`、`{up}`、`{essid}`）、`tick_ms`（不低于 3 s）、`tooltip`。

### bluetooth（provider `bluetooth`，下限 5 s）

射频状态加已配对设备计数（`bt on (1/2)`）。默认只读；设备列表走详情通知。设置 `toggle = true` 且授予 `bluetooth.control` 后，点击仅经 `set_power` 切换射频电源。选项：`format`（`{status}`、`{connected}`、`{total}`、`{powered}`）、`tick_ms`（不低于 5 s）、`tooltip`、`toggle`。

### backlight（provider `backlight`，下限 5 s）

亮度（`75%`）。点击仅经 `set_step` 按 `step` 个百分点步进（默认 `10`）。被拒绝的尝试会上报 `E_NOT_PERMITTED` 并降级为通知——绝不重试、绝不提权、绝不 setuid。缺少控制授权时模块只读。选项：`format`（`{pct}`）、`tick_ms`（不低于 5 s）、`tooltip`、`step`（`-100..100`）。

### idle（provider `idle`，下限 5 s）

抑制状态（`inhibit:on` / `inhibit:off`；字形由配置侧 `on_text` / `off_text` 决定）。仅在持有授权时点击经 `set` 切换抑制；被拒绝的切换降级为通知。选项：`tick_ms`（不低于 5 s）、`tooltip`、`on_text`、`off_text`。

### pulseaudio（provider `audio.state`，下限 2 s）

音量、静音与端口，图标在 Lua 侧选择。点击切换静音，滚轮经 `audio.control` 步进音量（步幅有界，宿主侧合并）。缺少控制授权时为只读文本；状态监视器缺席时隐藏。

| 选项             | 默认值 | 说明                                                |
| :--------------- | :----- | :-------------------------------------------------- |
| `format`         | 无     | 模板覆盖：`{icon}`、`{volume}`、`{port}`、`{muted}` |
| `show_port`      | `true` | 在文本后追加截断的端口名                            |
| `port_max_chars` | `16`   | 端口显示宽度，`1..64`                               |
| `tick_ms`        | `2000` | 状态轮询节奏，下限 `200` ms                         |

### spectrum（provider `audio.spectrum`，4 fps）

cava-lite 表头：按最多 32 个频谱桶渲染块字符文本行（`buckets` 默认 `8`，范围 `1..32`；`tick_ms` 默认 `250`，下限 `200` ms）。衰减平滑与峰值保持在 Lua 侧运行；`paused = true` 冻结最后一行。在宿主侧落地真实频谱源之前保持隐藏——表头宁可隐藏也不伪造，因此在音频监视器不暴露电平抽头的宿主上你就是看不到表头。

## 模块选项：诚实的限制

模块选项集合（每个模块一组命名配置：`clock`、`cpu`、`memory`、`battery`、`network`、`bluetooth`、`backlight`、`idle`、`pulseaudio`、`spectrum`、`workspaces`）已在 manifest 中声明，但 v1 settings 契约没有表或点路径形式：选项组目前按模块默认值读取，因此在表/点路径 settings 后续工作于宿主与 SDK 侧落地前，用户提供的模块选项保持**惰性（inert）**。落地时无需插件改动。框架标量（`show`、`edge`、`show_single`、`name_max_chars`）与三个模块列表今日可用。

## 已知宿主缺口（不是插件 bug）

- 宿主将 `on_click` 解析进场景，但尚未把条带点击路由到绑定命令，因此模块点击在真实宿主上暂无作用。
- 条带绘制忽略 `fg`、`bg` 与 `bold`。活动工作区药丸通过 `*` 标记保持可辨识。
- 插件条带覆盖边缘内容行而非像 Core 条带那样重排网格，且空（隐藏）条带仍占用堆叠序号。
- 激活是惰性的：插件在首个声明事件或命令到来时激活，因此 `show_single = true` 在首个工作区事件后生效。
- Core 仍在绘制自带工作区行时，请设置 `workspace.show_bar = false` 以避免双条带。

## 下一步

- [插件配置文件](plugin-settings.md)——文件路径、TOML 子集与 fail-to-default 规则。
- [故障排查与安全模式](../faq/troubleshooting.md)——隐藏模块与激活错误的含义。
