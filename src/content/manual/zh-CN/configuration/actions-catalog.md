# 动作目录

所有可由键盘触发的 Chrome 动作、所有内置默认和弦，以及所有 `core.*` 注册命令，均收录于此。本页内容由 Bitty 实现生成，而非凭记忆编写：事实来源为 bitty `0.0.22` 的 `crates/bitty-config/src/keymap.rs`（`ChromeAction`、`DEFAULT_KEYMAPS`）与 `crates/bitty-terminal/src/inspect.rs`（`CORE_COMMANDS`）。

## 事实来源与校验

Bitty `0.0.22` 尚未提供 `bitty list actions` 或 `bitty list keymaps`：二者均作为未知 kind 直接失败退出（exit 2，`want themes|plugins|instances`）。该结论已通过本地构建确认（`cargo build -p bitty-terminal`，`CARGO_TARGET_DIR` 置于 `.targets/manual-catalog` 下，二进制报告 `bitty 0.0.22`）：

```bash
bitty list actions --format json
# bitty list: unknown kind "actions" (want themes|plugins|instances) — exit 2

bitty list keymaps --format json
# bitty list: unknown kind "keymaps" (want themes|plugins|instances) — exit 2
```

因此下表均由源码逐条提取，并经过机械化交叉校验：

- Chrome 动作覆盖完整的 `ChromeAction` 词表（`KNOWN_ACTIONS_HINT` 及 `parse` 各分支）：38 行，每个变体一行。带参数的动作（`goto_split:<dir>`、`workspace_focus:<n>` 等）为单行并注明合法取值范围。
- 默认和弦逐条复刻 `DEFAULT_KEYMAPS`：97 行，Alt-as-Mod 拼写，与源码顺序一致。
- `core.*` 命令复刻 `CORE_COMMANDS`：14 行。
- 复检方法：从固定版本检出的 bitty 源码中提取 `DEFAULT_KEYMAPS` 的 `(chord, action)` 对、`ChromeAction::canonical` 的规范拼写以及 `CORE_COMMANDS` 的 id，断言每个提取到的词条都出现在本页对应表格中，且行数为 38 / 97 / 14。逐和弦抽查使用 `bitty inspect key <chord>`（如 `bitty inspect key alt+h` 会指明 `goto_split:left`；未绑定的按键如 `tab` 会以 `bound: false` 成功返回）。

## Chrome 动作

每个 `ChromeAction` 变体一行。「仅手动绑定」表示该动作从不出现在 `DEFAULT_KEYMAPS` 中：它始终可解析、可由用户绑定，只是不附带内置和弦。

| 动作                                   | 行为                                                                                                                                           | 默认和弦                                                                                                                                                                                                                                                                                                             | 仅手动绑定                   |
| :------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------- |
| `goto_split:<left\|right\|up\|down>`   | 将焦点按空间方向移至相邻窗格。                                                                                                                 | `alt+h`、`alt+j`、`alt+k`、`alt+l`、`alt+left`、`alt+down`、`alt+up`、`alt+right`、`ctrl+alt+left`、`ctrl+alt+down`、`ctrl+alt+up`、`ctrl+alt+right`                                                                                                                                                                 | 否                           |
| `new_split:<left\|right\|up\|down>`    | 沿固定方向切分当前聚焦窗格。                                                                                                                   | `shift+alt+h`、`shift+alt+j`、`shift+alt+k`、`shift+alt+l`、`shift+alt+left`、`shift+alt+down`、`shift+alt+up`、`shift+alt+right`                                                                                                                                                                                    | 否                           |
| `new_panel`                            | 以自适应 dwindle 轴新建面板（宽并排、窄堆叠），新面板居右/居下并自动获焦。                                                                     | `alt+n`                                                                                                                                                                                                                                                                                                              | 否                           |
| `resize_split:<left\|right\|up\|down>` | 按一个 `layout.resize_step` 步长微调所在分屏比例。                                                                                             | `shift+ctrl+h`、`shift+ctrl+j`、`shift+ctrl+k`、`shift+ctrl+l`、`shift+ctrl+left`、`shift+ctrl+down`、`shift+ctrl+up`、`shift+ctrl+right`、`ctrl+shift+alt+h`、`ctrl+shift+alt+j`、`ctrl+shift+alt+k`、`ctrl+shift+alt+l`、`ctrl+shift+alt+left`、`ctrl+shift+alt+down`、`ctrl+shift+alt+up`、`ctrl+shift+alt+right` | 否                           |
| `close_view`                           | 关闭当前聚焦窗格（别名 `close_surface`、`close_panel`、`exit_panel`）。受 `close_confirm` 约束：首次按键进入待确认，再次按键确认，`Esc` 取消。 | `alt+d`、`alt+q`                                                                                                                                                                                                                                                                                                     | 否                           |
| `toggle_zoom`                          | 切换单窗格缩放（别名 `toggle_split_zoom`、`suspend_panel`、`detach_panel`）。                                                                  | `alt+m`、`alt+f`、`alt+z`                                                                                                                                                                                                                                                                                            | 否                           |
| `toggle_help`                          | 切换浮动帮助浮层，列出所有已绑定的快捷键（别名 `show_help`；行内容由实时注册表生成）。                                                         | ``alt+` ``、`alt+?`、`alt+shift+?`、`alt+shift+/`                                                                                                                                                                                                                                                                    | 否                           |
| `focus_next`                           | 按深度优先顺序聚焦下一个窗格。                                                                                                                 | `ctrl+tab`                                                                                                                                                                                                                                                                                                           | 否                           |
| `focus_prev`                           | 按深度优先顺序聚焦上一个窗格。                                                                                                                 | `ctrl+shift+tab`                                                                                                                                                                                                                                                                                                     | 否                           |
| `focus:<1..=256>`                      | 按数字视图 id 聚焦。已退出默认绑定（工作区编号占用了 `Alt` 槽位）；仍可解析，供显式绑定使用。                                                  | —                                                                                                                                                                                                                                                                                                                    | 是（有意为之）               |
| `copy_to_clipboard`                    | 将当前选区复制到系统剪贴板（无选区时告警且布局不变）。                                                                                         | `ctrl+shift+c`                                                                                                                                                                                                                                                                                                       | 否                           |
| `paste_from_clipboard`                 | 将系统剪贴板经由可疑粘贴确认门粘贴为终端输入。                                                                                                 | `ctrl+shift+v`                                                                                                                                                                                                                                                                                                       | 否                           |
| `scroll_page_up`                       | 将当前聚焦窗格向上滚动一个视口页。                                                                                                             | `alt+i`                                                                                                                                                                                                                                                                                                              | 否                           |
| `scroll_page_down`                     | 将当前聚焦窗格向下滚动一个视口页。                                                                                                             | `alt+u`                                                                                                                                                                                                                                                                                                              | 否                           |
| `increase_font_size`                   | 将单窗口字号放大一档（别名 `zoom_in`、`font_zoom_in`）。                                                                                       | `ctrl+equal`、`ctrl+plus`、`ctrl+shift+equal`、`ctrl+shift+plus`                                                                                                                                                                                                                                                     | 否                           |
| `decrease_font_size`                   | 将单窗口字号缩小一档（别名 `zoom_out`、`font_zoom_out`）。                                                                                     | `ctrl+minus`、`ctrl+shift+minus`                                                                                                                                                                                                                                                                                     | 否                           |
| `reset_font_size`                      | 将单窗口字号重置为启动值（别名 `zoom_reset`、`font_zoom_reset`）。                                                                             | `ctrl+0`                                                                                                                                                                                                                                                                                                             | 否                           |
| `open_composer`                        | 打开命令编辑器（提交后向当前聚焦 PTY 写入一帧）。                                                                                              | —                                                                                                                                                                                                                                                                                                                    | 是（有意为之）               |
| `fold_toggle`                          | 翻转最新命令块的折叠状态（别名 `toggle_fold`）。                                                                                               | —                                                                                                                                                                                                                                                                                                                    | 是（有意为之）               |
| `fold_expand`                          | 确保最新命令块处于展开状态，幂等（别名 `expand_fold`）。                                                                                       | —                                                                                                                                                                                                                                                                                                                    | 是（有意为之）               |
| `fold_collapse`                        | 确保最新命令块处于折叠状态，幂等（别名 `collapse_fold`）。                                                                                     | —                                                                                                                                                                                                                                                                                                                    | 是（有意为之）               |
| `workspace_new`                        | 新建工作区并切换过去。                                                                                                                         | `alt+t`                                                                                                                                                                                                                                                                                                              | 否                           |
| `workspace_close`                      | 关闭当前工作区（存在存活会话时进入待确认，再次按键确认，`Esc` 取消）。                                                                         | `alt+w`                                                                                                                                                                                                                                                                                                              | 否                           |
| `workspace_prev`                       | 切换到上一个工作区。                                                                                                                           | `alt+-`                                                                                                                                                                                                                                                                                                              | 否                           |
| `workspace_next`                       | 切换到下一个工作区。                                                                                                                           | `alt+=`                                                                                                                                                                                                                                                                                                              | 否                           |
| `workspace_last`                       | 切换到最近使用的工作区（MRU 顺序；仅一个工作区时为空操作）。                                                                                   | `alt+tab`                                                                                                                                                                                                                                                                                                            | 否                           |
| `workspace_next_occupied`              | 向右切换到下一个有人（occupied）的工作区并回绕（别名 `workspace_cycle_next`、`workspace_cycle_next_occupied`）。                               | `alt+[`                                                                                                                                                                                                                                                                                                              | 否                           |
| `workspace_prev_occupied`              | 向左切换到上一个有人（occupied）的工作区并回绕（别名 `workspace_cycle_prev`、`workspace_cycle_prev_occupied`）。                               | `alt+]`                                                                                                                                                                                                                                                                                                              | 否                           |
| `workspace_focus:<1..=16>`             | 跳转到编号为 N 的工作区（未知编号告警且状态不变）。                                                                                            | `alt+1`、`alt+2`、`alt+3`、`alt+4`、`alt+5`、`alt+6`、`alt+7`、`alt+8`、`alt+9`（`10..=16` 未绑定）                                                                                                                                                                                                                  | 部分（`10..=16` 需手动绑定） |
| `workspace_move:<1..=16>`              | 将当前聚焦窗口移动到编号为 N 的工作区（别名 `workspace_move_window`）。                                                                        | `shift+alt+1`、`shift+alt+2`、`shift+alt+3`、`shift+alt+4`、`shift+alt+5`、`shift+alt+6`、`shift+alt+7`、`shift+alt+8`、`shift+alt+9`（`10..=16` 未绑定）                                                                                                                                                            | 部分（`10..=16` 需手动绑定） |
| `workspace_swap:<1..=16>`              | 将当前工作区与编号为 N 的工作区交换（目标为空时直接迁移过去）。                                                                                | `ctrl+shift+alt+1`、`ctrl+shift+alt+2`、`ctrl+shift+alt+3`、`ctrl+shift+alt+4`、`ctrl+shift+alt+5`、`ctrl+shift+alt+6`、`ctrl+shift+alt+7`、`ctrl+shift+alt+8`、`ctrl+shift+alt+9`（`10..=16` 未绑定）                                                                                                               | 部分（`10..=16` 需手动绑定） |
| `jump_to_prompt:prev`                  | 将当前聚焦视口跳转到上一个 shell 提示符（别名 `jump_to_prompt_prev`、`prompt_prev`）。                                                         | `shift+alt+pageup`                                                                                                                                                                                                                                                                                                   | 否                           |
| `jump_to_prompt:next`                  | 将当前聚焦视口跳转到下一个 shell 提示符（别名 `jump_to_prompt_next`、`prompt_next`）。                                                         | `shift+alt+pagedown`                                                                                                                                                                                                                                                                                                 | 否                           |
| `select_command_output`                | 精确选中上一条命令的输出（别名 `select_output`）。                                                                                             | `alt+o`                                                                                                                                                                                                                                                                                                              | 否                           |
| `toggle_palette`                       | 切换命令面板浮层（别名 `open_palette`、`palette_toggle`）。面板宿主落地前保持 bundled-disabled；已绑定的和弦会被消费为 inert 并告警。          | —                                                                                                                                                                                                                                                                                                                    | 是（有意为之）               |
| `toggle_floating`                      | 切换当前聚焦面板的平铺/浮动状态（别名 `floating_toggle`）。                                                                                    | `alt+a`                                                                                                                                                                                                                                                                                                              | 否                           |
| `toggle_pinned`                        | 切换当前聚焦面板的置顶（sticky-float）状态（别名 `pinned_toggle`）。                                                                           | —                                                                                                                                                                                                                                                                                                                    | 是（有意为之）               |
| `command:<owner:command>`              | 以空参数调用一个已注册的插件命令（别名 `invoke_command`、`run_command`）。要求必填参数的命令会大声拒绝该和弦。                                 | —                                                                                                                                                                                                                                                                                                                    | 是（有意为之）               |

## `core.*` 注册命令

静态 Core 命令面（`inspect.rs` 中的 `CORE_COMMANDS`）：11 个 `ctl` 可执行体加 3 个 `list` 可执行体。使用 `bitty inspect command <id>` 查看任意条目（点式与冒号式等价，如 `bitty inspect command core.terminal.text`）；使用 `bitty cmd <qualified-id> [-- <args-json>]` 直达调用（对没有实时派发目标的合法 id，会直接失败并指明已有的 `bitty ctl ...` 糖形式）。

| 命令                      | 类别      | 说明                                           |
| :------------------------ | :-------- | :--------------------------------------------- |
| **`core.instance.list`**  | `local`   | 列出存活实例（socket 发现，不拉取终端内容）。  |
| **`core.window.list`**    | `runtime` | 列出所选实例的窗口。                           |
| **`core.view.list`**      | `runtime` | 列出所选实例的视图。                           |
| **`core.terminal.list`**  | `runtime` | 列出所选实例的终端。                           |
| **`core.terminal.spawn`** | `runtime` | 新建终端（需显式提权）。                       |
| **`core.terminal.close`** | `runtime` | 按 id 关闭终端（需显式提权）。                 |
| **`core.terminal.send`**  | `runtime` | 向当前聚焦终端发送输入文本（非可信字节）。     |
| **`core.terminal.text`**  | `runtime` | 读取终端文本（非可信观测数据）。               |
| **`core.view.split`**     | `runtime` | 沿指定方向切分当前聚焦视图。                   |
| **`core.view.focus`**     | `runtime` | 按 id 聚焦视图。                               |
| **`core.config.reload`**  | `runtime` | 在存活实例中重载配置（需显式提权）。           |
| **`core.list.themes`**    | `local`   | 枚举内置主题预设（本地）。                     |
| **`core.list.plugins`**   | `local`   | 枚举静态 bundled 插件目录（本地，不加载 VM）。 |
| **`core.list.instances`** | `runtime` | 枚举存活实例（socket 发现，不拉取终端内容）。  |

Bundled 插件命令（与 `bitty list plugins` 同源）同样经由 `bitty inspect command <publisher.name:command>` 查询。shell-integration 包未声明任何命令，因此插件命令列表当前为空；工作区动词位于 Core，以 `bitty ctl workspace` 提供。

## 默认键位

内置映射为规范的 Alt-as-Mod 拼写：裸 `Tab`、裸方向键、裸字母与裸数字均故意不绑定，一律透传给 shell。共 97 条，与源码顺序一致：

| 默认和弦               | 动作                      |
| :--------------------- | :------------------------ |
| `alt+h`                | `goto_split:left`         |
| `alt+j`                | `goto_split:down`         |
| `alt+k`                | `goto_split:up`           |
| `alt+l`                | `goto_split:right`        |
| `alt+left`             | `goto_split:left`         |
| `alt+down`             | `goto_split:down`         |
| `alt+up`               | `goto_split:up`           |
| `alt+right`            | `goto_split:right`        |
| `alt+1`                | `workspace_focus:1`       |
| `alt+2`                | `workspace_focus:2`       |
| `alt+3`                | `workspace_focus:3`       |
| `alt+4`                | `workspace_focus:4`       |
| `alt+5`                | `workspace_focus:5`       |
| `alt+6`                | `workspace_focus:6`       |
| `alt+7`                | `workspace_focus:7`       |
| `alt+8`                | `workspace_focus:8`       |
| `alt+9`                | `workspace_focus:9`       |
| `shift+alt+1`          | `workspace_move:1`        |
| `shift+alt+2`          | `workspace_move:2`        |
| `shift+alt+3`          | `workspace_move:3`        |
| `shift+alt+4`          | `workspace_move:4`        |
| `shift+alt+5`          | `workspace_move:5`        |
| `shift+alt+6`          | `workspace_move:6`        |
| `shift+alt+7`          | `workspace_move:7`        |
| `shift+alt+8`          | `workspace_move:8`        |
| `shift+alt+9`          | `workspace_move:9`        |
| `ctrl+shift+alt+1`     | `workspace_swap:1`        |
| `ctrl+shift+alt+2`     | `workspace_swap:2`        |
| `ctrl+shift+alt+3`     | `workspace_swap:3`        |
| `ctrl+shift+alt+4`     | `workspace_swap:4`        |
| `ctrl+shift+alt+5`     | `workspace_swap:5`        |
| `ctrl+shift+alt+6`     | `workspace_swap:6`        |
| `ctrl+shift+alt+7`     | `workspace_swap:7`        |
| `ctrl+shift+alt+8`     | `workspace_swap:8`        |
| `ctrl+shift+alt+9`     | `workspace_swap:9`        |
| `alt+u`                | `scroll_page_down`        |
| `alt+i`                | `scroll_page_up`          |
| `ctrl+alt+left`        | `goto_split:left`         |
| `ctrl+alt+right`       | `goto_split:right`        |
| `ctrl+alt+up`          | `goto_split:up`           |
| `ctrl+alt+down`        | `goto_split:down`         |
| `ctrl+tab`             | `focus_next`              |
| `ctrl+shift+tab`       | `focus_prev`              |
| `shift+alt+h`          | `new_split:left`          |
| `shift+alt+j`          | `new_split:down`          |
| `shift+alt+k`          | `new_split:up`            |
| `shift+alt+l`          | `new_split:right`         |
| `shift+alt+left`       | `new_split:left`          |
| `shift+alt+down`       | `new_split:down`          |
| `shift+alt+up`         | `new_split:up`            |
| `shift+alt+right`      | `new_split:right`         |
| `shift+ctrl+h`         | `resize_split:left`       |
| `shift+ctrl+j`         | `resize_split:down`       |
| `shift+ctrl+k`         | `resize_split:up`         |
| `shift+ctrl+l`         | `resize_split:right`      |
| `shift+ctrl+left`      | `resize_split:left`       |
| `shift+ctrl+down`      | `resize_split:down`       |
| `shift+ctrl+up`        | `resize_split:up`         |
| `shift+ctrl+right`     | `resize_split:right`      |
| `ctrl+shift+alt+h`     | `resize_split:left`       |
| `ctrl+shift+alt+j`     | `resize_split:down`       |
| `ctrl+shift+alt+k`     | `resize_split:up`         |
| `ctrl+shift+alt+l`     | `resize_split:right`      |
| `ctrl+shift+alt+left`  | `resize_split:left`       |
| `ctrl+shift+alt+down`  | `resize_split:down`       |
| `ctrl+shift+alt+up`    | `resize_split:up`         |
| `ctrl+shift+alt+right` | `resize_split:right`      |
| `alt+d`                | `close_view`              |
| `alt+q`                | `close_view`              |
| `alt+w`                | `workspace_close`         |
| `alt+m`                | `toggle_zoom`             |
| `alt+f`                | `toggle_zoom`             |
| `ctrl+shift+c`         | `copy_to_clipboard`       |
| `ctrl+shift+v`         | `paste_from_clipboard`    |
| `alt+z`                | `toggle_zoom`             |
| `alt+n`                | `new_panel`               |
| `alt+a`                | `toggle_floating`         |
| `alt+t`                | `workspace_new`           |
| `alt+-`                | `workspace_prev`          |
| `alt+=`                | `workspace_next`          |
| `alt+tab`              | `workspace_last`          |
| `alt+[`                | `workspace_next_occupied` |
| `alt+]`                | `workspace_prev_occupied` |
| `ctrl+equal`           | `increase_font_size`      |
| `ctrl+plus`            | `increase_font_size`      |
| `ctrl+shift+equal`     | `increase_font_size`      |
| `ctrl+shift+plus`      | `increase_font_size`      |
| `ctrl+minus`           | `decrease_font_size`      |
| `ctrl+shift+minus`     | `decrease_font_size`      |
| `ctrl+0`               | `reset_font_size`         |
| ``alt+` ``             | `toggle_help`             |
| `alt+?`                | `toggle_help`             |
| `alt+shift+?`          | `toggle_help`             |
| `alt+shift+/`          | `toggle_help`             |
| `shift+alt+pageup`     | `jump_to_prompt:prev`     |
| `shift+alt+pagedown`   | `jump_to_prompt:next`     |
| `alt+o`                | `select_command_output`   |

### `mod_key`：Super 重映射规则

一项设置即可重绑整张 Chrome 映射。`mod_key` 仅接受 `"alt"`（默认）或 `"super"`；`ctrl`/`shift` 会直接失败，因为它们会吞掉 shell 输入并遮蔽下面的固定和弦。

```lua
return {
  mod_key = "super", -- 默认 "alt"：所有携带 alt 的默认项都会改走 super（alt+h -> super+h）
}
```

当 `mod_key = "super"` 时，所有携带 `alt` 的默认和弦都会经由 `alt` 槽位重绑（`alt+h` 变为 `super+h`，`shift+alt+h` 变为 `shift+super+h`，`ctrl+alt+left` 变为 `ctrl+super+left`）。不含 `alt` 的和弦原样通过。用户显式的 `keymaps` 条目保留其确切拼写，并按 `context + chord` 身份叠加（相同身份替换默认，其余追加），因此翻转修饰键永远不会改写用户意图。

### 保留规则：单主与固定和弦

- 单主（single-owner）：按键事件与某条已绑定和弦精确匹配时，即被对应的 Chrome 动作消费，绝不透传给 PTY；未绑定的按键一律进入 shell。匹配仅做和弦精确相等——不存在模糊或前缀匹配（Leader 和弦同样如此）。
- 固定和弦：以下与修饰键无关的默认项没有 `alt` 槽位，Super 翻转时原样通过：`ctrl+tab` / `ctrl+shift+tab` 轮转、`shift+ctrl`（含 `shift+ctrl+arrows`）缩放、`ctrl+shift+c` / `ctrl+shift+v` 复制粘贴，以及 `ctrl` 按住的字号缩放。纯 `shift+alt` 恒为新建（`new_split`）：它不能同时承担缩放，`shift+alt+arrows` 负责新建而 `shift+ctrl+arrows` 负责缩放，提示符跳转因此使用空闲的翻页键。
- 一个和弦恰好有一个主人。数字键在该规则下保持空闲（`shift+alt+h/j/k/l` 仍为新建，而 `shift+alt+1..=9` 负责移动窗口）。
- 目前仅支持 `global` 上下文；任何其他上下文都会直接失败。裸修饰键名永远不能充当和弦按键，单字符按键至少需要一个修饰键，因此绑定不可能悄悄吞掉 shell 输入。

## 自定义

在 `$XDG_CONFIG_HOME/bitty/init.lua`（回退为 `config.lua`）中覆盖或扩展映射。条目为 `Live` 级别：保存文件即调和生效，不中断 PTY 会话。

```lua
return {
  mod_key = "alt",
  keymaps = {
    -- 替换默认：相同的 context + chord 身份优先于内置条目。
    { chord = "alt+h", action = "goto_split:left", context = "global" },
    -- 在空闲和弦上追加仅手动绑定的动作。
    { chord = "alt+e", action = "open_composer", context = "global" },
    -- 带参数的动作与插件调用同样可以绑定。
    { chord = "alt+g", action = "workspace_focus:10", context = "global" },
    { chord = "ctrl+alt+p", action = "command:bitty-featured.devtools:plugins", context = "global" },
  },
}
```

和弦语法：`<mod>+...+<key>`，大小写不敏感，修饰键顺序任意。修饰键为 `ctrl`/`control`、`alt`/`opt`/`option`、`shift`、`super`/`meta`/`cmd`/`command`/`win`/`windows`。按键为一个命名键（`tab`、`enter`、`escape`、`space`、`backspace`、`delete`/`del`、`insert`/`ins`、`home`/`hm`、`end`、`pageup`/`pgup`/`pu`、`pagedown`/`pgdn`/`pd`、`up`、`down`、`left`、`right`、`f1`..`f35`）或一个 ASCII 字符（必须至少带一个修饰键）。权威语法见 `bitty-config/src/keymap.rs` 中的 `Chord::parse`；未知词条会连同已知动作列表一起直接失败。

插件永远不直接绑定按键：它们经由 `bitty.keymaps.suggest` 提出建议，最终决定权在用户。`suggest`、Leader 前缀建议与 `init.lua` 绑定参考见 [bitty.commands & bitty.keymaps](../api/commands-keymaps.md)。

```lua
-- 仅手动绑定示例：在 alt+e 上启用命令编辑器。
-- 推荐和弦；alt+e 在内置映射中空闲。
return {
  keymaps = {
    { chord = "alt+e", action = "open_composer", context = "global" },
  },
}
```

## 无默认绑定的动作

以下未绑定动作在实现中均有明确标注（定义处均注明 "manual bind only, never in `DEFAULT_KEYMAPS`" 或等价说明），属于有意为之，不存在真正的缺口，因此未向 bitty 提交任何 issue。

| 动作                                                                          | 未绑定的原因                                                                                              |
| :---------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- |
| `focus:<1..=256>`                                                             | 有意为之：`alt+1..=9` 已分配给工作区跳转（CTX-0257）；窗格编号跳转仍可显式绑定，或使用 `ctl view focus`。 |
| `open_composer`                                                               | 有意为之：保持全新配置字节一致，直到用户显式启用（推荐和弦 `alt+e`）。                                    |
| `fold_toggle`、`fold_expand`、`fold_collapse`                                 | 有意为之：同样的字节一致性纪律（`fold_toggle` 推荐和弦 `alt+z`）。                                        |
| `toggle_palette`                                                              | 有意为之：面板宿主落地前面板保持 bundled-disabled（推荐和弦 `ctrl+shift+p`，在内置映射中空闲）。          |
| `toggle_pinned`                                                               | 有意为之：同样的字节一致性纪律（推荐和弦 `alt+p`）。                                                      |
| `command:<owner:command>`                                                     | 有意为之：调用目标与用户、插件相关，无法内置（示例和弦 `ctrl+alt+p`）。                                   |
| `workspace_focus:10..=16`、`workspace_move:10..=16`、`workspace_swap:10..=16` | 有意为之：单和弦数字仅覆盖 `1..=9`；更高编号可由用户绑定（如 `alt+g` 绑定 `workspace_focus:10`）。        |
