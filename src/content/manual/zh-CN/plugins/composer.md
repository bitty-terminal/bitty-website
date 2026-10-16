# 作曲家模态框用法 (Composer Modal Usage)

作曲家（`bitty-terminal.composer`）是一个模态命令行：在终端上打开可编辑缓冲区，将缓冲区作为一整个括号粘贴帧提交给聚焦面板，然后关闭。关闭期间插件不触碰任何东西——输入字节原样流向 PTY。仅手动打开；没有自动进入路径。

## 打开与关闭

在任何地方按下打开和弦（默认 **Alt+E**）。模态框绘制标题场景：标题行加输入行，缓冲区为空时显示入口提示。

关闭路径及其对缓冲区的影响：

| 动作       | 默认和弦       | 缓冲区结果                                       |
| :--------- | :------------- | :----------------------------------------------- |
| 提交       | **Ctrl+Enter** | 发送到 PTY；接受后清空                           |
| 关闭       | **Esc**        | 会话结束；草稿保留                               |
| 取消命令   | （面板动词）   | 草稿丢弃                                         |
| 外部编辑器 | **Alt+E**      | 在 Core 拥有的临时文件上往返；失败的往返保留草稿 |

非自愿释放（会话中途 overlay 被撤销）保留草稿并关闭会话。失败的提交保留缓冲区且会话保持打开——绝不会出现发了一半的行。

## 输入与提交

正常输入、自由粘贴，或在模态框内按 **Alt+E** 用白名单编辑器（`nvim`、`vim`、`vi`）编辑缓冲区，等待 120 s（上限 300 s，由宿主强制执行）。一条规则管辖所有路径——输入、粘贴、编辑器内容、提交成帧：超过 64 KiB 上限的输入被拒绝，原缓冲区保持不变。不截断，不外发。

提交和弦：

- 重映射的 **Enter 提交**配置可用，包括真实终端：Return 以扁平 CR 字面量到达，插件将 CR/LF 路由经裸 Enter 角色，因为按键字面量只可能来自 Enter 键本身。
- 默认 **Ctrl+Enter 提交**经宿主扁平 overlay 按键事件的修饰键通道工作。若宿主更新后 Ctrl+Enter 不再提交，回退到显式的 `bitty-terminal.composer:submit` 面板动词并上报——该动词是不依赖和弦 plumbing 的精确路径。

## 自定义和弦

五个和弦都在你的[插件配置文件](plugin-settings.md)中，每次读取都重新校验。缺失的键、错误类型的值或非法和弦只对该键回退到出厂默认值；文件的其余部分继续生效。

```toml
# $XDG_CONFIG_HOME/bitty/plugins/bitty-terminal.composer.toml
newline = "enter"
submit = "ctrl+enter"
close = "escape"
external_editor = "alt+e"
open_chord = "alt+e"
```

重映射规则：

- 模态框内角色（`newline`、`submit`、`close`、`external_editor`）必须两两不同。匹配优先级为提交、关闭、外部编辑器、换行、文本。
- 打开和弦严格为 `<mod>+...+<single-char>`（修饰键任意顺序），挂在宿主 keymap 上——它在模态框关闭时指向 `open` 命令，因此永远不会遮挡 shell 输入。模态框内 Alt+E 角色仅在模态框持有捕获时生效，所以两个 Alt+E 默认值永远不会竞争。
- 未声明的键无法读取：宿主对未声明键的读取直接失败，因此只有以上五个键生效。

## 作曲家保持沉默时

- 版本或 capability 不匹配会禁用插件并给出诊断，不做部分激活：没有命令、没有 keymap、没有 overlay。请检查 `bitty plugin doctor` 与[故障排查指南](../faq/troubleshooting.md)。
- 缺少提交授权时缓冲区保留、会话保持打开，并附 `unavailable:no-submit` 提示——缺失授权永远不会丢弃你的草稿。

## 下一步

- [插件配置文件](plugin-settings.md)——文件路径、TOML 子集与 fail-to-default 规则。
- [故障排查与安全模式](../faq/troubleshooting.md)——激活错误及其含义。
