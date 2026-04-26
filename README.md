# 仙 (Xian) - WebGL 3D 仙侠修仙游戏

一款使用 **TypeScript** 和 **Three.js** 构建的 3D 仙侠修仙游戏，直接在浏览器中运行。

## 特性

- **3D 图形：** 基于 Three.js 驱动，包含自定义着色器、泛光特效 (Bloom) 以及骨骼动画。
- **仙侠主题：** 沉浸在一个充满修仙者、飞剑和法宝的修仙世界中。
- **战斗系统：** 包含不同修仙者、生命值条和技能的实时战斗。
- **技能与法球：** 收集各种法球（飞剑、加速、闪电、冲刺、土墙、治疗）来增强实力并解锁主动技能。
- **音效：** 沉浸式的背景音乐和游戏音效。

## 技术栈

- **构建工具：** Vite
- **编程语言：** TypeScript
- **3D 引擎：** Three.js (包含后处理、FBXLoader、GLTFLoader)

## 快速开始

### 环境要求

- Node.js (推荐 v18 或更高版本)

### 安装运行

1. 克隆仓库：
   ```bash
   git clone https://github.com/moli-xia/xian.git
   cd xian
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 启动开发服务器：
   ```bash
   npm run dev
   ```

4. 构建生产版本：
   ```bash
   npm run build
   ```

## 游戏控制
- 移动：`W` `A` `S` `D` 或 方向键
- 技能：数字键或鼠标点击释放技能

## 游戏资源
游戏使用了多种 3D 模型 (`.fbx`, `.glb`) 以及贴图/音频文件，均存放在 `src/assets` 目录下。所有资源都已配置为在游戏过程中动态加载。

## 开源协议

MIT License
