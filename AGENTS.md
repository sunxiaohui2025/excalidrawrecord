# AGENTS.md

## 项目概述

Excalidraw 是一个虚拟白板工具的 monorepo，使用 Yarn workspaces 管理。它包含：

- `packages/excalidraw/` - 主 React 组件库，发布为 `@excalidraw/excalidraw`
- `excalidraw-app/` - 完整的 Web 应用（excalidraw.com）
- `packages/` - 核心包：`@excalidraw/common`、`@excalidraw/element`、`@excalidraw/math`、`@excalidraw/utils`
- `examples/` - 集成示例（NextJS、browser script）

## 构建/检查/测试命令

所有命令需在仓库根目录下运行。

### 测试

```bash
yarn test                    # 使用 vitest 运行所有测试（监视模式）
yarn test:app                # 同上
yarn test:app --watch=false  # 运行一次测试（无监视）
yarn test:app <pattern>      # 运行匹配模式的具体测试文件
vitest run <file>            # 直接运行单个测试文件
yarn test:update             # 运行测试并更新快照（提交前必须执行）
yarn test:coverage           # 运行测试并生成覆盖率报告
yarn test:ui                 # 使用 UI 界面运行测试
```

### 类型检查与代码检查

```bash
yarn test:typecheck          # TypeScript 类型检查（tsc）
yarn test:code               # 运行 ESLint
yarn test:all                # 运行 typecheck + eslint + prettier + tests
```

### 格式化

```bash
yarn fix                     # 自动修复格式化和代码检查问题
yarn fix:code                # 仅修复 ESLint 问题
yarn fix:other               # 仅修复 prettier 问题
```

### 构建

```bash
yarn build:packages          # 构建所有包
yarn build:app               # 构建 Web 应用
yarn build:excalidraw        # 仅构建主包
yarn start                   # 启动开发服务器
```

## 代码风格指南

### 导入

- **导入顺序由 ESLint 强制执行**：内置 → 外部 → 内部 → 父级 → 同级 → 索引
- **始终使用 type 导入类型**：`import type { MyType } from "./types"`
- **内部包使用路径别名**：
  ```typescript
  import { something } from "@excalidraw/common";
  import { Element } from "@excalidraw/element";
  import { Point } from "@excalidraw/math";
  ```
- **禁止直接从 "jotai" 导入**。请使用应用特定模块：
  ```typescript
  // 错误
  import { atom } from "jotai";
  // 正确
  import { atom } from "editor-jotai"; // 或 "app-jotai"
  ```
- 导入组之间必须有空行。

### TypeScript

- **启用严格模式** - 所有严格类型检查选项
- 优先使用 `const` 和 `readonly` 以保持不可变性
- 使用可选链（`?.`）和空值合并（`??`）
- 尽可能优先使用无内存分配的实现
- 选择更高性能的方案（用内存换 CPU 周期）

### 数学/几何代码

- **始终使用 `@excalidraw/math` 中的 Point 类型**，而非 `{ x, y }` 对象：
  ```typescript
  // 错误
  const point = { x: 10, y: 20 };
  // 正确
  import type { GlobalPoint } from "@excalidraw/math/types";
  const point: GlobalPoint = [10, 20];
  ```
- 可用的品牌类型：`GlobalPoint`、`LocalPoint`、`Vector`、`Radians`、`Degrees`、`Line`、`LineSegment`

### React

- 使用 **函数式组件与 hooks**
- 遵循 React hooks 规则（禁止条件性 hooks）
- 保持组件小巧且职责单一
- 使用 **CSS modules** 进行组件样式
- 实现 error boundaries 以进行正确的错误处理

### 命名规范

- **PascalCase**：组件名称、接口、类型别名、类
- **camelCase**：变量、函数、方法、属性
- **ALL_CAPS**：真正的常量（不仅仅是 const 声明）
- **文件命名**：测试文件使用 `.test.ts`，React 组件使用 `.tsx`

### 错误处理

- 异步操作使用 `try/catch` 块
- 在 React 组件中实现 error boundaries
- 始终记录带有上下文信息的错误
- 有意义地传播错误；不要静默吞掉

### 测试

- 测试文件使用 `.test.ts` 或 `.test.tsx` 扩展名
- 使用 vitest 全局变量（describe、it、expect）- 无需导入
- 修改影响快照的代码后运行 `yarn test:update`
- 提交前必须修复测试失败

## 文件结构说明

- 路径别名定义在 `tsconfig.json` 和 `vitest.config.mts` 中
- 每个包都有自己的 `tsconfig.json`，继承自根配置
- ESLint 配置继承 `@excalidraw/eslint-config`
- Prettier 配置：`@excalidraw/prettier-config`

## 重要规则（来自 Copilot 指令）

1. 简洁明了 - 不做不必要的解释
2. 代码优先于讨论
3. 被纠正后停止道歉
4. 除非被要求，否则不总结更改
5. 修改后始终提议运行 `yarn test:app`
6. 始终尝试修复测试失败
