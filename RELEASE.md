# Obsidian ListenHub 插件发布流程

本文档说明如何发布和更新 Obsidian ListenHub 插件。

## 📦 发布前准备

### 1. 确保代码质量

```bash
# 运行构建测试
npm run build

# 检查 TypeScript 类型
npx tsc --noEmit
```

### 2. 更新版本号

编辑以下文件中的版本号：

- `manifest.json` - 更新 `version` 字段
- `package.json` - 更新 `version` 字段
- `versions.json` - 添加新版本与最小 Obsidian 版本的映射

```json
// versions.json 示例
{
  "1.0.0": "0.15.0",
  "1.0.1": "0.15.0",
  "1.1.0": "0.16.0"
}
```

### 3. 更新 CHANGELOG

创建或更新 `CHANGELOG.md`，记录版本变更：

```markdown
## [1.0.1] - 2024-01-15

### Added
- 新增双人播客快捷命令

### Fixed
- 修复音频下载失败的问题

### Changed
- 优化轮询策略
```

## 🚀 发布流程

### 步骤 1: 构建生产版本

```bash
# 构建生产版本
npm run build

# 确保生成了以下文件
ls -la main.js manifest.json styles.css
```

### 步骤 2: 创建 Git Tag

```bash
# 提交所有变更
git add .
git commit -m "Release v1.0.0"

# 创建标签
git tag -a 1.0.0 -m "Release version 1.0.0"

# 推送代码和标签
git push origin main
git push origin 1.0.0
```

### 步骤 3: 创建 GitHub Release

1. 访问 GitHub 仓库的 Releases 页面
2. 点击「Draft a new release」
3. 选择刚创建的 tag（如 `1.0.0`）
4. 填写 Release 标题和说明
5. **上传以下文件**（必须）：
   - `main.js`
   - `manifest.json`
   - `styles.css`
6. 点击「Publish release」

### 步骤 4: 提交到 Obsidian 社区插件市场

#### 首次提交

1. Fork [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases) 仓库

2. 在 `community-plugins.json` 中添加你的插件：

```json
{
  "id": "obsidian-listenhub-plugin",
  "name": "ListenHub Podcast Generator",
  "author": "Your Name",
  "description": "Generate podcasts from your Obsidian notes using ListenHub API",
  "repo": "yourusername/obsidian-listenhub-plugin"
}
```

3. 创建 Pull Request

4. 等待 Obsidian 团队审核（通常 1-2 周）

#### 后续更新

更新后会自动同步到社区插件市场，无需重复提交。

## 🔄 更新流程

### 修复 Bug（补丁版本）

```bash
# 1. 修复代码
# 2. 更新版本号（如 1.0.0 → 1.0.1）
# 3. 构建
npm run build

# 4. 提交并打标签
git add .
git commit -m "Fix: 修复音频下载问题"
git tag -a 1.0.1 -m "Bug fix release"
git push origin main --tags

# 5. 创建 GitHub Release 并上传文件
```

### 新功能（次版本）

```bash
# 版本号：1.0.0 → 1.1.0
npm version minor
npm run build
git push origin main --tags
```

### 重大变更（主版本）

```bash
# 版本号：1.0.0 → 2.0.0
npm version major
npm run build
git push origin main --tags
```

## 📋 发布检查清单

发布前确保完成以下检查：

- [ ] 代码构建成功无错误
- [ ] 更新了所有版本号
- [ ] 更新了 CHANGELOG
- [ ] 测试了主要功能
- [ ] 更新了 README（如有需要）
- [ ] 创建了 Git tag
- [ ] 创建了 GitHub Release
- [ ] 上传了必需的三个文件（main.js, manifest.json, styles.css）
- [ ] Release 说明清晰完整

## 🔍 测试发布版本

在发布到社区前，建议先在本地测试：

```bash
# 1. 构建插件
npm run build

# 2. 复制到测试 vault
cp main.js manifest.json styles.css /path/to/test-vault/.obsidian/plugins/obsidian-listenhub-plugin/

# 3. 重新加载 Obsidian
# 4. 测试所有功能
```

## 📱 移动端支持

如果插件支持移动端，确保：

1. `manifest.json` 中 `isDesktopOnly` 设为 `false`
2. 在移动设备上测试所有功能
3. 使用移动端友好的 UI 组件

## 🐛 回滚版本

如果发现严重问题需要回滚：

```bash
# 1. 删除有问题的 tag
git tag -d 1.0.1
git push origin :refs/tags/1.0.1

# 2. 在 GitHub 删除对应的 Release

# 3. 修复问题后重新发布
```

## 📊 版本号规范（Semantic Versioning）

```
主版本号.次版本号.修订号 (MAJOR.MINOR.PATCH)

1.0.0
│ │ │
│ │ └─ 修订号：Bug 修复
│ └─── 次版本号：新功能（向后兼容）
└───── 主版本号：重大变更（可能不兼容）
```

## 🔗 相关资源

- [Obsidian 插件开发文档](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [Obsidian 插件发布指南](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin)
- [Semantic Versioning](https://semver.org/)
- [GitHub Releases 文档](https://docs.github.com/en/repositories/releasing-projects-on-github)

## 💡 最佳实践

1. **频繁的小更新优于大更新** - 更容易定位问题
2. **详细的 Release Notes** - 帮助用户了解变更
3. **向后兼容** - 尽量避免破坏性变更
4. **充分测试** - 在多个环境中测试
5. **及时响应反馈** - 关注 GitHub Issues 和用户反馈

---

祝发布顺利！🚀
