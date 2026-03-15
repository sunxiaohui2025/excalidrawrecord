# Excalidraw Record

基于 [excalidraw/excalidraw](https://github.com/excalidraw/excalidraw) 二次开发的白板录制工具

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](package.json)

## ✨ 功能特性

### 🎨 白板功能
- **手绘风格画布** - 自然流畅的手绘效果，支持多种图形元素
- **多人协作** - 实时多人协同编辑，支持链接分享
- **丰富的图形库** - 矩形、圆形、箭头、线条、自由绘制、文字等
- **无限画布** - 自由缩放和滚动，无限创作空间
- **本地存储** - 自动保存到浏览器本地，数据不丢失
- **导出支持** - 支持 PNG、SVG、JSON 等多种格式导出

### 📹 录屏功能
- **画布录制** - 直接录制白板画布内容
- **屏幕录制** - 录制整个屏幕或指定窗口
- **摄像头叠加** - 画中画模式，支持摄像头画面叠加
- **鼠标高亮** - 录制时显示鼠标位置和点击效果
- **自定义区域** - 支持指定录制区域
- **多种比例** - 16:9、4:3、9:16、1:1 等多种视频比例
- **多种格式** - 支持 WebM、MP4、MOV 等视频格式

### 📽️ PPT 录制模式
- **幻灯片录制** - 基于画框元素的 PPT 式录制
- **自动切换** - 支持幻灯片之间的淡入淡出切换效果
- **提词器** - 内置提词器功能，支持滚动播放
- **录制控制** - 暂停、继续、停止等完整控制

## 🚀 快速开始

### 环境要求
- Node.js >= 18.0.0
- Yarn 1.22.22

### 安装依赖

```bash
yarn install
```

### 开发模式

```bash
# 启动开发服务器
yarn start

# 或先构建包再启动示例
yarn start:example
```

### 构建项目

```bash
# 构建所有包
yarn build:packages

# 构建应用
yarn build:app

# 完整构建
yarn build
```

### 测试

```bash
# 运行所有测试
yarn test:all

# 运行单元测试
yarn test:app

# 代码检查
yarn test:code

# TypeScript 类型检查
yarn test:typecheck
```

## 📁 项目结构

```
excalidraw-record/
├── excalidraw-app/          # 主应用程序
│   ├── components/          # 组件目录
│   │   └── RecordingControl/  # 录屏控制组件
│   │       ├── ControlMenu.tsx       # 录制控制菜单
│   │       ├── SettingsPanel.tsx     # 录制设置面板
│   │       ├── CameraOverlay.tsx     # 摄像头叠加层
│   │       ├── TeleprompterPanel.tsx # 提词器面板
│   │       ├── SlideshowPanel.tsx    # 幻灯片面板
│   │       ├── SlideshowRecordMode.tsx # PPT录制模式
│   │       ├── RecordingFrame.tsx    # 录制框
│   │       ├── useScreenRecorder.ts  # 录屏逻辑 Hook
│   │       └── useRecordingDimensions.ts # 录制尺寸 Hook
│   ├── collab/              # 协作功能
│   ├── data/                # 数据管理
│   └── App.tsx              # 主应用入口
├── packages/                # 核心包
│   ├── excalidraw/          # 白板核心库
│   ├── element/             # 元素处理
│   ├── common/              # 公共工具
│   ├── math/                # 数学计算
│   └── utils/               # 工具函数
├── examples/                # 示例项目
│   ├── with-nextjs/         # Next.js 集成示例
│   └── with-script-in-browser/ # 浏览器脚本示例
└── dev-docs/                # 开发文档
```

## 🎬 使用指南

### 开始录制

1. 点击画布右上角的录制控制菜单
2. 选择录制模式（画布/屏幕）
3. 配置录制设置（比例、格式、摄像头等）
4. 点击录制按钮开始

### PPT 录制模式

1. 在白板上创建画框元素作为幻灯片
2. 打开幻灯片录制面板
3. 选择要录制的幻灯片
4. 开始录制，使用方向键切换幻灯片

### 提词器使用

1. 点击提词器按钮打开面板
2. 在文本框中输入台词内容
3. 调整滚动速度和透明度
4. 点击播放按钮开始滚动

## ⚙️ 录制设置

| 设置项 | 说明 | 可选值 |
|--------|------|--------|
| 视频比例 | 输出视频的长宽比 | 16:9、4:3、9:16、1:1、自定义 |
| 视频格式 | 输出文件格式 | WebM(推荐)、MP4、MOV |
| 背景 | 录制背景样式 | 渐变色、纯色、透明 |
| 圆角 | 视频圆角大小 | 0-50px |
| 内边距 | 录制区域边距 | 0-100px |
| 摄像头位置 | 画中画位置 | 左上、右上、左下、右下 |
| 摄像头大小 | 画中画尺寸 | 50-300px |
| 鼠标高亮 | 显示鼠标效果 | 开/关 |
| 鼠标颜色 | 高亮颜色 | 自定义颜色 |

## 🛠️ 技术栈

- **前端框架**: React 19
- **构建工具**: Vite 5
- **类型系统**: TypeScript 5.9
- **状态管理**: Jotai
- **样式方案**: SCSS + CSS Modules
- **测试框架**: Vitest
- **代码规范**: ESLint + Prettier

## 🤝 参与贡献

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 开发规范

- 提交前运行 `yarn test:all` 确保测试通过
- 使用 `yarn fix` 自动修复代码格式问题
- 遵循现有的代码风格和命名规范

## 📄 许可证

本项目基于 [MIT](LICENSE) 许可证开源

## 🙏 致谢

- [Excalidraw](https://github.com/excalidraw/excalidraw) - 优秀的开源白板工具
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [React](https://react.dev/) - 用户界面构建库

---

**注意**: 本项目为 Excalidraw 的二次开发版本，添加了录屏和 PPT 录制功能。如需使用原版 Excalidraw，请访问 [官方仓库](https://github.com/excalidraw/excalidraw)。
