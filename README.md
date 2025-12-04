# Obsidian ListenHub 播客生成器

一个 Obsidian 插件，让你可以直接从 Markdown 笔记生成播客音频。通过集成 [ListenHub](https://listenhub.ai) API，将文字内容转换为高质量的音频播客。

## ✨ 功能特点

- 🎙️ **一键生成播客** - 右键点击任何笔记即可生成播客
- 👥 **多种模式** - 支持单人、双人对话和辩论模式
- ⚡ **灵活配置** - Quick/Deep/Debate 三种生成模式
- 🎵 **多种音色** - 支持中英文多种音色选择
- 📊 **任务管理** - 实时查看生成进度和历史记录
- 💾 **自动下载** - 可选自动下载生成的音频文件
- 🌍 **多语言** - 支持中文和英文

## 📋 前置要求

1. **ListenHub 订阅**：需要以下任一订阅计划
   - Pro（专业版）
   - Business（商业版）
   - Enterprise（企业版）

   > ⚠️ Free 和 Creator 计划暂不支持 API 访问

2. **API Key**：在 [ListenHub API Keys 设置页](https://listenhub.ai/settings/api-keys) 获取

## 🚀 安装

### 方式 1: 从 Obsidian 社区插件市场安装（推荐）

1. 打开 Obsidian 设置
2. 进入「第三方插件」→「浏览」
3. 搜索「ListenHub」
4. 点击「安装」

### 方式 2: 手动安装

1. 下载最新的 Release 文件
2. 解压到你的 vault 的 `.obsidian/plugins/obsidian-listenhub-plugin/` 目录
3. 重新加载 Obsidian
4. 在设置中启用插件

### 方式 3: 开发版本安装

```bash
# 克隆仓库到你的插件目录
cd /path/to/your/vault/.obsidian/plugins
git clone https://github.com/yourusername/obsidian-listenhub-plugin.git

# 安装依赖
cd obsidian-listenhub-plugin
npm install

# 构建
npm run build
```

## ⚙️ 配置

1. 打开 Obsidian 设置
2. 找到「ListenHub 播客生成器」
3. 输入你的 **API Key**
4. 点击「验证」确认 API Key 有效
5. 配置默认设置：
   - 默认语言（中文/英文）
   - 默认模式（Quick/Deep/Debate）
   - 默认音色

## 📖 使用方法

### 方法 1: 功能区图标

1. 打开任意 Markdown 笔记
2. 点击左侧功能区的 🎙️ 图标
3. 在弹出的对话框中配置生成参数
4. 点击「开始生成」

### 方法 2: 命令面板

1. 打开命令面板（`Ctrl/Cmd + P`）
2. 搜索「ListenHub」相关命令：
   - **生成单人播客** - 使用一个音色
   - **生成双人播客** - 使用两个音色对话
   - **打开任务管理器** - 查看所有生成任务
   - **查询积分余额** - 查看账户信息

### 方法 3: 右键菜单

1. 在文件列表中右键点击 Markdown 文件
2. 选择「生成播客」
3. 配置参数并开始生成

### 方法 4: 编辑器右键菜单

1. 在编辑器中右键点击
2. 选择「生成播客」

## 🎛️ 生成模式说明

| 模式 | 播客时长 | 生成时间 | 特点 | 适用场景 |
|------|---------|---------|------|----------|
| **Quick** | ~5 分钟 | 1-2 分钟 | 快速生成，效率优先 | 新闻快报、时效性内容 |
| **Deep** | ~15 分钟 | 2-4 分钟 | 深度分析，内容质量高 | 专业知识分享、深度解读 |
| **Debate** | ~10 分钟 | 2-4 分钟 | 双主持人辩论形式 | 观点讨论、多角度分析 |

> 💡 **说明**：
> - **播客时长**：最终生成的音频文件的长度
> - **生成时间**：API 处理并生成播客所需的时间

## 📊 任务管理器

任务管理器会显示所有播客生成任务的状态：

- ⏳ **Pending** - 等待处理
- 🔄 **Processing** - 生成中
- ✅ **Success** - 生成成功
- ❌ **Failed** - 生成失败

对于成功的任务，你可以：
- 📋 复制音频链接
- ▶️ 在浏览器中播放
- 💾 下载到 vault

## 🎨 可用音色

### 中文音色示例

- **原野** (`CN-Man-Beijing-V2`) - 男声
- **晓曼** (`chat-girl-105-cn`) - 女声
- 更多音色请查看 [音色列表文档](https://docs.marswave.ai/openapi-user.html#tag/speaker)

### 英文音色

访问 ListenHub API 文档查看完整的英文音色列表。

## 💰 积分消耗

播客生成会消耗积分，具体消耗量取决于：
- 内容长度
- 生成模式
- 音色数量

在插件设置中可以随时「查询余额」查看当前可用积分。

详细计费说明：[ListenHub 积分指南](https://www.notion.so/ListenHub-278c70a104c480ada429d31d3c6d52be)

## 🔧 开发

### 构建项目

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 生产构建
npm run build
```

### 项目结构

```
obsidian-listenhub-plugin/
├── main.ts                    # 插件主入口
├── manifest.json              # 插件清单
├── src/
│   ├── api-client.ts         # ListenHub API 客户端
│   ├── settings.ts           # 设置界面
│   ├── types.ts              # 类型定义
│   └── ui/
│       ├── podcast-modal.ts  # 生成配置对话框
│       └── task-manager.ts   # 任务管理视图
├── styles.css                # 样式文件
└── package.json              # 项目配置
```

## 📝 API 限制

- **频率限制**：每分钟最多 3 次创建请求（3 RPM）
- **内容长度**：建议至少 100 字符
- **超时时间**：生成任务最长等待 5 分钟

## ❓ 常见问题

### Q: 为什么提示 API Key 无效？

A: 请检查：
1. API Key 是否正确复制（无多余空格）
2. 是否订阅了 Pro/Business/Enterprise 计划
3. API Key 是否过期

### Q: 生成失败怎么办？

A: 可能原因：
1. 积分不足 - 查询余额并充值
2. 内容太短 - 确保至少 100 字符
3. 内容违规 - 检查内容合规性
4. 网络问题 - 检查网络连接

### Q: 如何选择合适的模式？

A:
- 需要快速生成 → **Quick**
- 需要深度内容 → **Deep**
- 需要多角度讨论 → **Debate**（需要两个音色）

### Q: 音频保存在哪里？

A:
- 开启「自动下载」后保存在 `podcasts/` 目录
- 也可以通过任务管理器手动下载
- 或直接复制链接在线播放

## 🔗 相关链接

- [ListenHub 官网](https://listenhub.ai)
- [ListenHub API 文档](https://docs.marswave.ai/openapi-user.html)
- [获取 API Key](https://listenhub.ai/settings/api-keys)
- [积分计费说明](https://www.notion.so/ListenHub-278c70a104c480ada429d31d3c6d52be)
- [问题反馈](https://github.com/yourusername/obsidian-listenhub-plugin/issues)

## 📧 技术支持

如有疑问，请联系：
- ListenHub 技术支持：support@marswave.ai
- 插件问题：[GitHub Issues](https://github.com/yourusername/obsidian-listenhub-plugin/issues)

## 📄 许可证

MIT License

## 🙏 致谢

感谢 [ListenHub](https://listenhub.ai) 提供的优质 API 服务。

---

**Enjoy podcasting! 🎙️✨**
