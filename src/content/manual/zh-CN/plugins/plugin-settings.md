# 插件配置文件 (Per-Plugin Config Files)

每个插件拥有一个可选的用户文件。你在其中的取值按**键**覆盖插件出厂内置默认值；省略的部分继续按默认值工作——全新安装开箱即用，配置只是覆盖。

## 文件位置

```text
$XDG_CONFIG_HOME/bitty/plugins/<owner>.<name>.toml
```

回退为 `~/.config/bitty/plugins/<owner>.<name>.toml`。Windows 遵循与主配置相同的平台优先级（`%APPDATA%` / `%LOCALAPPDATA%`）。文件名仅由校验过的插件 id 派生，因此校验过的 id 永远无法逃出 `plugins/` 目录。文件缺席（或 `plugins/` 目录缺席）不是错误。

示例：

```text
~/.config/bitty/plugins/bitty-terminal.bar.toml
~/.config/bitty/plugins/bitty-terminal.composer.toml
```

## TOML 子集（仅扁平键）

文件按数据解析，绝不执行：没有 `include`、没有 `exec`、没有 shell、没有分节、没有点键、没有嵌套。

```toml
# 仅扁平键
show = true                  # 布尔值
name_max_chars = 32          # 裸整数
edge = "bottom"              # 双引号字符串
modules_left = ["workspaces", "cpu"]  # 单行字符串数组
```

取值规则：

- 取值为布尔值、裸整数、双引号字符串或单行字符串数组。浮点数、引号数字、内联表、嵌套数组与多行值不在子集中：违规的键回退到默认值，文件的其余部分继续生效。
- 未知键（manifest 从未声明的键）不改变任何东西：它们被记录为跳过。
- 重复键、`[section]`、没有 `=` 的行或非法键名会导致**整个文件**失败——插件继续按默认值运行。未闭合的字符串或数组只跳过该键。
- v1 语法没有表。这就是为什么模块选项组（如状态栏的模块设置）在表/点路径后续工作落地前保持惰性——见[状态栏模块指南](bar-modules.md)。今日存入表会因类型不匹配而读作默认值。
- 非 UTF-8 文件直接失败；插件永远不会看到可能误认为配置的乱码。

大小边界在信任任何取值前失败：单文件至多 16 KiB、512 行，64 个键，每个字符串 512 字节，每个数组 32 个字符串项。

## 优先级与错误类型回退

优先级从低到高：

```text
manifest 出厂默认值 < 宿主共享源 < 你的文件
```

任何一层的错误类型取值只对该键回退到更低一层——垃圾进，默认值出，文件的其余部分不受影响。

## 实例

状态栏框架（标量与模块列表今日生效；模块选项组保持惰性——见上）：

```toml
show = true
show_single = false
name_max_chars = 32
modules_left = ["workspaces", "cpu", "memory", "battery"]
modules_right = ["clock", "pulseaudio"]
```

作曲家和弦（五个键全；非法和弦回退到默认值）：

```toml
newline = "enter"
submit = "ctrl+enter"
close = "escape"
external_editor = "alt+e"
open_chord = "alt+e"
```

无需启动 GUI 即可校验：

```bash
bitty config check
```

## 取值与权限

你的配置文件只承载**取值**——插件该做什么。**权限**（插件可以行使哪些 capability）在安装时经 `bitty plugin install` 在显式同意后授予，之后可用 `bitty plugin revoke` 收窄。配置取值永远无法授予宿主未批准的 capability：没有控制授权时设置 backlight `step` 只会让模块保持只读；收回授权会隐藏需要它的模块。若某设置看似被忽略，先查授权（`bitty plugin list` 显示已授与与申请的 capability）——再看[故障排查指南](../faq/troubleshooting.md)。

## 下一步

- [状态栏模块用户指南](bar-modules.md)——每个模块的显示内容与选项。
- [作曲家模态框用法](composer.md)——打开和弦、提交和弦与自定义设置。
