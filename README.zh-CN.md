<div align="center">
<br />
<br />
<img src="./src/assets/icons/ic-logo-badge.svg" height="140" alt="Brand Guard logo" />
<h3>Brand Guard</h3>
<p style="font-size: 14px">
  社交聆听与品牌监测后台 — React 19、Vite、TypeScript 与现代 UI 技术栈。
</p>
</div>

[English](./README.md) | **中文**

## 快速开始

```bash
pnpm install
pnpm dev
```

浏览器访问 [http://localhost:3001](http://localhost:3001)。

将 `.env.example` 复制为 `.env` 并按需修改。可选品牌链接：

- `VITE_APP_DOCS_URL` — 设置后账户菜单显示「文档」链接。  
- `VITE_APP_REPOSITORY_URL` — 设置后顶栏显示 GitHub 图标。  
- `VITE_APP_COMMUNITY_URL` — 设置后顶栏显示 Discord 图标。  

## 脚本

| 命令           | 说明           |
| -------------- | -------------- |
| `pnpm dev`     | 开发服务器     |
| `pnpm build`   | 类型检查并构建 |
| `pnpm preview` | 预览生产构建   |

## 致谢

界面框架源自 [Slash Admin](https://github.com/d3george/slash-admin)（MIT）。原模板版权归作者所有；Brand Guard 的定制与业务代码遵循本仓库许可。

## 提交规范

与英文 README 中的 Commit conventions 一致（`feat`、`fix`、`docs` 等）。
