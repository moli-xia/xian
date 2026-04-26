import './style.css'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'

type CultivatorKind = 'player' | 'enemy'
type OrbType = 'blade' | 'speed' | 'lightning' | 'dash' | 'wall' | 'heal'
type ActiveSkill = 'lightning' | 'dash' | 'wall'
type SkillCounts = Record<ActiveSkill, number>

interface OrbPickup {
  group: THREE.Group
  shell: THREE.Mesh
  core: THREE.Mesh
  ring: THREE.Mesh
  symbol: THREE.Object3D
  label: THREE.Sprite
  type: OrbType
  amount: number
  radius: number
  spinOffset: number
}

interface Cultivator {
  id: string
  kind: CultivatorKind
  profileKey: string
  name: string
  maxHp: number
  hp: number
  hpBarGroup: THREE.Group
  hpBar: THREE.Mesh
  nameSprite: THREE.Sprite | null
  powerValueSprite: THREE.Sprite | null
  powerDot: THREE.Mesh | null
  powerLabelText: string
  group: THREE.Group
  visualRoot: THREE.Group
  modelPivot: THREE.Group
  cloudGroup: THREE.Group
  cloudTrails: THREE.Group[]
  body: THREE.Mesh
  head: THREE.Mesh
  aura: THREE.Mesh
  crownHalo: THREE.Group
  bladeAnchor: THREE.Group
  bladeTrail: THREE.Points
  modelRoot: THREE.Object3D | null
  modelBasePosition: THREE.Vector3
  motionBone: THREE.Bone | null
  motionBoneBasePosition: THREE.Vector3 | null
  modelMixer: THREE.AnimationMixer | null
  idleAction: THREE.AnimationAction | null
  moveAction: THREE.AnimationAction | null
  animationState: 'idle' | 'move'
  blades: THREE.Group[]
  velocity: THREE.Vector3
  moveDir: THREE.Vector3
  wanderTarget: THREE.Vector3
  baseSpeed: number
  speed: number
  radius: number
  score: number
  bladeCount: number
  bladeScale: number
  bladeOrbitRadius: number
  baseBladeSpinSpeed: number
  bladeSpinSpeed: number
  bladeSpinDirection: number
  hue: number
  strength: number
  alive: boolean
  clashCooldown: number
  bodyHitCooldown: number
  damageGraceCooldown: number
  lastStandCooldown: number
  collectCooldown: number
  clashWobble: number
  kills: number
  speedBuffDuration: number
  skills: ActiveSkill[]
  skillCounts: SkillCounts
  selectedSkillIndex: number
  skillCooldown: number
  stunDuration: number
  dashTimer: number
  dashDirection: THREE.Vector3
  dashImpactReady: boolean
  dashHitTargets: Set<string>
  teleportCooldown: number
  hoverPhase: number
  hoverHeight: number
  cloudBaseOffset: number
  bladeAnchorHeight: number
  bladeAnchorRatio: number
}

interface Critter {
  group: THREE.Group
  velocity: THREE.Vector3
  wanderTarget: THREE.Vector3
  radius: number
  alive: boolean
  profile: CritterProfile
  modelRoot: THREE.Object3D | null
  modelMixer: THREE.AnimationMixer | null
  fallbackVisual: THREE.Object3D | null
  mistGroup: THREE.Group
  mistPuffs: THREE.Mesh[]
  hoverPhase: number
  baseHeight: number
}

interface Spark {
  mesh: THREE.Mesh
  life: number
  velocity: THREE.Vector3
}

interface DefeatNotice {
  id: number
  text: string
  life: number
  accent: boolean
}

interface Obstacle {
  mesh: THREE.Object3D
  radius: number
}

interface Teleporter {
  group: THREE.Group
  base: THREE.Mesh
  ring: THREE.Mesh
  runeRing: THREE.Mesh
  core: THREE.Mesh
  particles: THREE.Points
  position: THREE.Vector3
}

interface CharacterProfile {
  key: string
  name: string
  color: THREE.ColorRepresentation
  modelUrl: string
  targetHeight: number
  hoverHeight: number
  modelRotationY: number
  idleAnimationUrl?: string
}

interface CritterProfile {
  key: string
  name: string
  modelUrl: string
  targetHeight: number
  radius: number
  moveSpeed: number
  modelRotationY: number
}

interface ModelAsset {
  scene: THREE.Group
  animations: THREE.AnimationClip[]
}

interface PreparedModel {
  root: THREE.Group
  height: number
  waistHeight: number
}

interface ObstacleVariantConfig {
  key: string
  url: string
  targetFootprint: number
  targetHeight: number
  collisionRadius: number
  uniformScaleMultiplier?: number
  allowScaleJitter?: boolean
}

interface SpawnedObstacleLayout {
  key: string
  position: THREE.Vector3
  radius: number
}

interface ArenaFirefly {
  mesh: THREE.Mesh
  basePosition: THREE.Vector3
  baseScale: number
  phase: number
  speed: number
  sway: number
  drift: number
}

interface ArenaSpiritMotes {
  points: THREE.Points
  basePositions: Float32Array
  driftFactors: Float32Array
  phase: number
}

interface StarfieldLayer {
  points: THREE.Points
  baseOpacity: number
  twinkleSpeed: number
  twinklePhase: number
}

interface Starfield {
  group: THREE.Group
  layers: StarfieldLayer[]
}

interface CentralAltar {
  group: THREE.Group
  visualRoot: THREE.Group
  halo: THREE.Mesh
  flamePoints: THREE.Points
  emberPoints: THREE.Points
  flameSeeds: Float32Array
  emberSeeds: Float32Array
  light: THREE.PointLight
  radius: number
}

interface OpeningPillar {
  cultivator: Cultivator
  group: THREE.Group
  beam: THREE.Mesh
  core: THREE.Mesh
  ring: THREE.Mesh
  glow: THREE.PointLight
  color: THREE.Color
  elapsed: number
  revealDone: boolean
}

const ARENA_HALF = 48
const ORB_TARGET_COUNT = 34
const CULTIVATOR_COUNT = 7
const CRITTER_COUNT = 18
const OBSTACLE_COUNT = 18
const LIGHTNING_DURATION = 0.8
const DASH_DURATION = 0.26
const DASH_SPEED_BONUS = 24
const WALL_DURATION = 1.0
const DESKTOP_PIXEL_RATIO_CAP = 1.5
const MOBILE_PIXEL_RATIO_CAP = 1.25
const MOON_SHADOW_MAP_SIZE = 1024
const ARENA_FIREFLY_COUNT = 20
const ARENA_SPIRIT_MOTE_COUNT = 84
const ALTAR_FLAME_COUNT = 30
const ALTAR_EMBER_COUNT = 14
const ORB_RESPAWN_INTERVAL = 0.16
const SKILL_ORB_RESPAWN_INTERVAL = 1.6
const MAX_SKILL_ORBS_ON_FIELD = 14
const TELEPORTER_RADIUS = 3.4
const TELEPORT_COOLDOWN = 2.4
const ORB_TELEPORTER_CLEARANCE = TELEPORTER_RADIUS + 2.2
const LIGHTNING_STRIKE_RADIUS = 7.5
const LIGHTNING_FALLBACK_RADIUS = 13
const LIGHTNING_TARGET_LIMIT = 3
const MODEL_FLOAT_AMPLITUDE = 0.05
const MODEL_FLOAT_SPEED = 1.9
const BAGUA_SPAWN_RADIUS = 23
const OPENING_PILLAR_DURATION = 1.65
const CLOUD_MODEL_URL = `${import.meta.env.BASE_URL}models/cloud_model/tripo_convert_9f8ea70e-3d9c-4b8b-9bbf-bddc127cb882.fbx`
const SWORD_MODEL_URL = `${import.meta.env.BASE_URL}models/sword_model/tripo_convert_fe9e0521-b117-4c94-9628-9e7acbde6e59.fbx`
const CAT_MODEL_URL = `${import.meta.env.BASE_URL}models/cat_model/tripo_convert_3e7c4535-8bf4-4723-a700-c9f1df25a82e.fbx`
const DOG_MODEL_URL = `${import.meta.env.BASE_URL}models/dog_model/tripo_convert_e8bcf1a7-d597-4be4-87a8-e8fda2735404.fbx`
const HERO_IDLE_ANIMATION_URL = new URL('./assets/models/hero-l-idle.fbx', import.meta.url).href
const GROUND_TEXTURE_URL = new URL('./assets/texture/background2-optimized.png', import.meta.url).href
const OBSTACLE_LINGJING_URL = new URL('./assets/texture/lingjing.glb', import.meta.url).href
const OBSTACLE_SHIBEI_URL = new URL('./assets/texture/shibei.glb', import.meta.url).href
const OBSTACLE_SHIZHU_URL = new URL('./assets/texture/shizhu.glb', import.meta.url).href
const OBSTACLE_TAJI_URL = new URL('./assets/texture/taji.glb', import.meta.url).href
const OBSTACLE_SHITAI_URL = new URL('./assets/texture/shitai.glb', import.meta.url).href
const OBSTACLE_DUANBEI_URL = new URL('./assets/texture/duanbei.glb', import.meta.url).href

const OBSTACLE_VARIANTS: ObstacleVariantConfig[] = [
  {
    key: 'lingjing',
    url: OBSTACLE_LINGJING_URL,
    targetFootprint: 3.6,
    targetHeight: 4.8,
    collisionRadius: 1.7,
  },
  {
    key: 'shibei',
    url: OBSTACLE_SHIBEI_URL,
    targetFootprint: 3.8,
    targetHeight: 4.5,
    collisionRadius: 1.9,
  },
  {
    key: 'shizhu',
    url: OBSTACLE_SHIZHU_URL,
    targetFootprint: 3.2,
    targetHeight: 5.4,
    collisionRadius: 1.55,
    uniformScaleMultiplier: 3,
    allowScaleJitter: false,
  },
  {
    key: 'taji',
    url: OBSTACLE_TAJI_URL,
    targetFootprint: 4.2,
    targetHeight: 4.2,
    collisionRadius: 2.1,
  },
  {
    key: 'shitai',
    url: OBSTACLE_SHITAI_URL,
    targetFootprint: 4.4,
    targetHeight: 2.6,
    collisionRadius: 2.2,
  },
  {
    key: 'duanbei',
    url: OBSTACLE_DUANBEI_URL,
    targetFootprint: 4.6,
    targetHeight: 4.7,
    collisionRadius: 2.25,
  },
]

const CENTRAL_ALTAR_VARIANT: ObstacleVariantConfig = {
  key: 'shitai',
  url: OBSTACLE_SHITAI_URL,
  targetFootprint: 4.8,
  targetHeight: 3,
  collisionRadius: 2.45,
}

const PLAYER_PROFILE: CharacterProfile = {
  key: 'hero',
  name: '主角',
  color: 0xd7f1ff,
  modelUrl: new URL('./assets/models/hero-l.fbx', import.meta.url).href,
  targetHeight: 2.8,
  hoverHeight: 0.42,
  modelRotationY: 0,
  idleAnimationUrl: HERO_IDLE_ANIMATION_URL,
}

const ENEMY_PROFILES: CharacterProfile[] = [
  {
    key: 'hunyuandijun',
    name: '混元帝君',
    color: 0xffd27d,
    modelUrl: new URL('./assets/models/hunyuandijun.fbx', import.meta.url).href,
    targetHeight: 2.9,
    hoverHeight: 0.44,
    modelRotationY: Math.PI,
  },
  {
    key: 'jiutianxuanv',
    name: '九天玄女',
    color: 0xffb8ea,
    modelUrl: new URL('./assets/models/jiutianxuanv.fbx', import.meta.url).href,
    targetHeight: 2.85,
    hoverHeight: 0.42,
    modelRotationY: Math.PI,
  },
  {
    key: 'taishangdaozu',
    name: '太上道祖',
    color: 0xcde8ff,
    modelUrl: new URL('./assets/models/taishangdaozu.fbx', import.meta.url).href,
    targetHeight: 2.95,
    hoverHeight: 0.45,
    modelRotationY: Math.PI,
  },
  {
    key: 'tuntianmozun',
    name: '吞天魔尊',
    color: 0xff8b8b,
    modelUrl: new URL('./assets/models/tuntianmozun.fbx', import.meta.url).href,
    targetHeight: 3.0,
    hoverHeight: 0.46,
    modelRotationY: Math.PI,
  },
  {
    key: 'wujixianwang',
    name: '无极仙王',
    color: 0xa5ffec,
    modelUrl: new URL('./assets/models/wujixianwang.fbx', import.meta.url).href,
    targetHeight: 2.88,
    hoverHeight: 0.43,
    modelRotationY: Math.PI,
  },
  {
    key: 'yaochishengmu',
    name: '瑶池圣母',
    color: 0xffe3b0,
    modelUrl: new URL('./assets/models/yaochishengmu.fbx', import.meta.url).href,
    targetHeight: 2.86,
    hoverHeight: 0.43,
    modelRotationY: Math.PI,
  },
  {
    key: 'ziweidadi',
    name: '紫薇大帝',
    color: 0xc6a4ff,
    modelUrl: new URL('./assets/models/ziweidadi.fbx', import.meta.url).href,
    targetHeight: 2.92,
    hoverHeight: 0.45,
    modelRotationY: Math.PI,
  },
]

const CRITTER_PROFILES: CritterProfile[] = [
  {
    key: 'cat',
    name: '灵猫',
    modelUrl: CAT_MODEL_URL,
    targetHeight: 1.34,
    radius: 0.62,
    moveSpeed: 4.7,
    modelRotationY: Math.PI,
  },
  {
    key: 'dog',
    name: '灵狗',
    modelUrl: DOG_MODEL_URL,
    targetHeight: 1.48,
    radius: 0.68,
    moveSpeed: 4.3,
    modelRotationY: Math.PI,
  },
]

const clock = new THREE.Clock()
const appRoot = document.querySelector<HTMLDivElement>('#app')

if (!appRoot) {
  throw new Error('无法找到 #app 容器')
}

const app = appRoot

app.innerHTML = `
  <div id="loading-screen">
    <div class="panel loading-panel">
      <p class="loading-kicker">Preparing Assets</p>
      <h1>资源加载中</h1>
      <p>正在校验并预加载首局所需资源，请稍候进入游戏。</p>
      <div class="loading-progress" aria-hidden="true">
        <div id="start-progress-fill" class="loading-progress-fill"></div>
      </div>
      <div class="loading-progress-meta">
        <p id="start-loading-label" class="loading-loading-label">正在初始化资源...</p>
        <p id="start-loading-detail" class="loading-loading-detail">0 / 0</p>
      </div>
    </div>
  </div>
  <div id="start-screen" class="hidden">
    <div class="panel start-panel">
      <p class="start-kicker">Xian Arena</p>
      <h1>修仙竞技场</h1>
      <p>驾驭法器、争夺水晶、踏云飞行，在仙气缭绕的竞技场里击败所有敌修。</p>
      <label class="start-field" for="player-name">玩家名称</label>
      <input id="player-name" type="text" maxlength="12" placeholder="请输入你的道号" value="道友" />
      <button id="start-button" type="button">开始游戏</button>
    </div>
  </div>
  <div id="hud">
    <div class="panel title-panel">
      <h1>修仙竞技场</h1>
    </div>
    <div class="stats-stack">
      <div class="panel stats-panel">
        <div class="stat">
          <span>灵力值</span>
          <strong id="level">0</strong>
        </div>
        <div class="stat"><span>法器</span><strong id="blades">2</strong></div>
        <div class="stat"><span>移速</span><strong id="move-speed">1.0x</strong></div>
        <div class="stat"><span>击败</span><strong id="kills">0</strong></div>
      </div>
      <div id="defeat-feed" class="panel defeat-feed"></div>
    </div>
    <div id="tips-panel" class="panel tips-panel">
      <button id="tips-toggle" class="tips-toggle" type="button" aria-expanded="true" aria-label="收起说明">&gt;</button>
      <div class="tips-content">
        <p>WASD / 方向键移动。鼠标左键施放当前技能，鼠标右键切换技能。抢夺水晶球，靠更强的护体法器斩灭对手。</p>
        <p>护体法器越多越强，法器相撞时弱者陨落，双方都会被震退。</p>
        <div class="orb-legend">
          <span class="orb-chip blade">器：加 1 片法器</span>
          <span class="orb-chip dash">冲：加 1 次冲刺</span>
          <span class="orb-chip heal">愈：恢复生命</span>
          <span class="orb-chip speed">速：加移速</span>
        </div>
      </div>
    </div>
    <div class="panel audio-panel">
      <div class="audio-controls">
        <label><input type="checkbox" id="bgm-toggle" checked> BGM</label>
        <label><input type="checkbox" id="sfx-toggle" checked> 音效</label>
      </div>
      <div class="audio-controls">
        <label>音量 <input type="range" id="master-volume" min="0" max="100" value="50"></label>
      </div>
    </div>
    <div class="panel skill-bar">
      <div class="skill-slot" id="skill-slot-lightning">
        <span class="skill-icon lightning">雷</span>
        <span class="skill-label">闪电</span>
        <strong id="skill-count-lightning">x0</strong>
      </div>
      <div class="skill-slot" id="skill-slot-dash">
        <span class="skill-icon dash">冲</span>
        <span class="skill-label">冲刺</span>
        <strong id="skill-count-dash">x0</strong>
      </div>
      <div class="skill-slot" id="skill-slot-wall">
        <span class="skill-icon wall">墙</span>
        <span class="skill-label">气墙</span>
        <strong id="skill-count-wall">x0</strong>
      </div>
    </div>
  </div>
  <div id="impact-flash" aria-hidden="true"></div>
  <div id="overlay" class="hidden">
    <div class="panel overlay-panel">
      <h2 id="overlay-title">渡劫成功</h2>
      <p id="overlay-text"></p>
      <p class="overlay-tip">按 R 重新开局</p>
    </div>
  </div>
  <div id="pause-overlay" class="hidden">
    <div class="panel overlay-panel pause-panel">
      <h2>游戏暂停</h2>
      <p>按 ESC 继续游戏，或选择下方操作。</p>
      <div class="overlay-actions">
        <button id="pause-restart-button" class="overlay-button" type="button">重玩</button>
        <button id="pause-continue-button" class="overlay-button primary" type="button">继续</button>
      </div>
    </div>
  </div>
`

function getRequiredElement<T extends Element>(selector: string): T {
  const element = app.querySelector<T>(selector)
  if (!element) {
    throw new Error(`缺少必要节点: ${selector}`)
  }
  return element
}

const loadingScreen = getRequiredElement<HTMLDivElement>('#loading-screen')
const startScreen = getRequiredElement<HTMLDivElement>('#start-screen')
const startButton = getRequiredElement<HTMLButtonElement>('#start-button')
const playerNameInput = getRequiredElement<HTMLInputElement>('#player-name')
const startProgressFill = getRequiredElement<HTMLDivElement>('#start-progress-fill')
const startLoadingLabel = getRequiredElement<HTMLParagraphElement>('#start-loading-label')
const startLoadingDetail = getRequiredElement<HTMLParagraphElement>('#start-loading-detail')
const hudRoot = getRequiredElement<HTMLDivElement>('#hud')
const hudLevel = getRequiredElement<HTMLElement>('#level')
const hudBlades = getRequiredElement<HTMLElement>('#blades')
const hudMoveSpeed = getRequiredElement<HTMLElement>('#move-speed')
const hudKills = getRequiredElement<HTMLElement>('#kills')
const hudSkillCountLightning = getRequiredElement<HTMLElement>('#skill-count-lightning')
const hudSkillCountDash = getRequiredElement<HTMLElement>('#skill-count-dash')
const hudSkillCountWall = getRequiredElement<HTMLElement>('#skill-count-wall')
const hudSkillSlotLightning = getRequiredElement<HTMLDivElement>('#skill-slot-lightning')
const hudSkillSlotDash = getRequiredElement<HTMLDivElement>('#skill-slot-dash')
const hudSkillSlotWall = getRequiredElement<HTMLDivElement>('#skill-slot-wall')
const defeatFeed = getRequiredElement<HTMLDivElement>('#defeat-feed')
const tipsPanel = getRequiredElement<HTMLDivElement>('#tips-panel')
const tipsToggle = getRequiredElement<HTMLButtonElement>('#tips-toggle')
const tipsContent = getRequiredElement<HTMLDivElement>('.tips-content')
const impactFlash = getRequiredElement<HTMLDivElement>('#impact-flash')

// UI 音频控制
const bgmToggle = getRequiredElement<HTMLInputElement>('#bgm-toggle')
const sfxToggle = getRequiredElement<HTMLInputElement>('#sfx-toggle')
const masterVolume = getRequiredElement<HTMLInputElement>('#master-volume')

const overlay = getRequiredElement<HTMLDivElement>('#overlay')
const overlayTitle = getRequiredElement<HTMLElement>('#overlay-title')
const overlayText = getRequiredElement<HTMLElement>('#overlay-text')
const pauseOverlay = getRequiredElement<HTMLDivElement>('#pause-overlay')
const pauseRestartButton = getRequiredElement<HTMLButtonElement>('#pause-restart-button')
const pauseContinueButton = getRequiredElement<HTMLButtonElement>('#pause-continue-button')
let tipsCollapsed = false

function syncTipsPanelHeight(): void {
  const wasCollapsed = tipsCollapsed
  if (wasCollapsed) {
    tipsPanel.classList.remove('collapsed')
  }
  tipsContent.style.removeProperty('position')
  tipsContent.style.removeProperty('visibility')
  const panelHeight = Math.ceil(tipsPanel.getBoundingClientRect().height)
  tipsPanel.style.setProperty('--tips-panel-height', `${panelHeight}px`)
  if (wasCollapsed) {
    tipsPanel.classList.add('collapsed')
  }
}

syncTipsPanelHeight()

tipsToggle.addEventListener('click', () => {
  if (!tipsCollapsed) {
    syncTipsPanelHeight()
  }
  tipsCollapsed = !tipsCollapsed
  tipsPanel.classList.toggle('collapsed', tipsCollapsed)
  tipsToggle.textContent = tipsCollapsed ? '<' : '>'
  tipsToggle.setAttribute('aria-expanded', String(!tipsCollapsed))
  tipsToggle.setAttribute('aria-label', tipsCollapsed ? '展开说明' : '收起说明')
  if (!tipsCollapsed) {
    requestAnimationFrame(() => {
      syncTipsPanelHeight()
    })
  }
})

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b1420)
scene.fog = new THREE.FogExp2(0x102236, 0.012)

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 220)
camera.position.set(0, 20, 22)

function getTargetPixelRatio(): number {
  const deviceRatio = window.devicePixelRatio || 1
  return Math.min(deviceRatio, window.innerWidth <= 900 ? MOBILE_PIXEL_RATIO_CAP : DESKTOP_PIXEL_RATIO_CAP)
}

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(getTargetPixelRatio())
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.17
app.appendChild(renderer.domElement)

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.38, 0.22, 0.86)
composer.addPass(bloomPass)

const audioContext = new AudioContext()
let audioReady = false
let gameStarted = false
let startupAssetsReady = false
let startupAssetsFailed = false
let startupAssetsPromise: Promise<void> | null = null
const fbxLoader = new FBXLoader()
const gltfLoader = new GLTFLoader()
const textureLoader = new THREE.TextureLoader()
const modelAssetCache = new Map<string, Promise<ModelAsset>>()
const obstacleModelAssetCache = new Map<string, Promise<THREE.Group>>()
let cloudModelAssetPromise: Promise<THREE.Group> | null = null
let swordModelAssetPromise: Promise<THREE.Group> | null = null

// 音频管理器
class AudioManager {
  private bgmAudio: HTMLAudioElement
  private sfxBuffers: Array<AudioBuffer | null> = new Array(7).fill(null)
  private collectBuffer: AudioBuffer | null = null
  private fastImpactBuffer: AudioBuffer | null = null
  private lightningBuffer: AudioBuffer | null = null
  private rushBuffer: AudioBuffer | null = null
  private wallBuffer: AudioBuffer | null = null
  private femaleLaughBuffer: AudioBuffer | null = null
  private femaleDeathBuffer: AudioBuffer | null = null
  private littleMonsterBuffer: AudioBuffer | null = null
  private maleBattleBuffers: Array<AudioBuffer | null> = [null, null]
  private maleDeathBuffer: AudioBuffer | null = null
  private sfxGainNode: GainNode
  private femaleLaughCooldownUntil = 0
  private maleBattleCooldownUntil = 0
  private littleMonsterCooldownUntil = 0
  private sfxLoadPromise: Promise<void>
  private bgmReadyPromise: Promise<void>

  public bgmEnabled = true
  public sfxEnabled = true
  public masterVolume = 0.5

  constructor() {
    this.sfxGainNode = audioContext.createGain()
    this.sfxGainNode.gain.value = this.masterVolume
    this.sfxGainNode.connect(audioContext.destination)

    // 加载背景音乐
    this.bgmAudio = new Audio(new URL('./assets/music/background.mp3', import.meta.url).href)
    this.bgmAudio.loop = true
    this.bgmAudio.preload = 'auto'
    this.bgmAudio.volume = this.masterVolume

    this.bgmReadyPromise = this.preloadBGM()
    this.sfxLoadPromise = this.loadSFX()
  }

  private async loadBuffer(url: string): Promise<AudioBuffer | null> {
    try {
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      return await audioContext.decodeAudioData(arrayBuffer)
    } catch (e) {
      console.warn(`Failed to load audio: ${url}`, e)
      return null
    }
  }

  private preloadBGM(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.bgmAudio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
        resolve()
        return
      }

      const cleanup = () => {
        this.bgmAudio.removeEventListener('canplaythrough', handleReady)
        this.bgmAudio.removeEventListener('error', handleError)
      }
      const handleReady = () => {
        cleanup()
        resolve()
      }
      const handleError = () => {
        cleanup()
        reject(new Error('背景音乐加载失败'))
      }

      this.bgmAudio.addEventListener('canplaythrough', handleReady, { once: true })
      this.bgmAudio.addEventListener('error', handleError, { once: true })
      this.bgmAudio.load()
    })
  }

  private async loadSFX(): Promise<void> {
    const numberedUrls = Array.from({ length: 7 }, (_, index) => new URL(`./assets/BFX/${index + 1}.wav`, import.meta.url).href)
    this.sfxBuffers = await Promise.all(numberedUrls.map((url) => this.loadBuffer(url)))

    const [
      collectBuffer,
      fastImpactBuffer,
      lightningBuffer,
      rushBuffer,
      wallBuffer,
      femaleLaughBuffer,
      femaleDeathBuffer,
      littleMonsterBuffer,
      maleBattleBufferA,
      maleBattleBufferB,
      maleDeathBuffer,
    ] = await Promise.all([
      this.loadBuffer(new URL('./assets/BFX/collect.wav', import.meta.url).href),
      this.loadBuffer(new URL('./assets/BFX/fast-impact.wav', import.meta.url).href),
      this.loadBuffer(new URL('./assets/BFX/lightning.wav', import.meta.url).href),
      this.loadBuffer(new URL('./assets/BFX/rush.wav', import.meta.url).href),
      this.loadBuffer(new URL('./assets/BFX/wall.wav', import.meta.url).href),
      this.loadBuffer(new URL('./assets/BFX/laugh-female.wav', import.meta.url).href),
      this.loadBuffer(new URL('./assets/BFX/death-female.wav', import.meta.url).href),
      this.loadBuffer(new URL('./assets/BFX/littlemonster.wav', import.meta.url).href),
      this.loadBuffer(new URL('./assets/BFX/battle-man.wav', import.meta.url).href),
      this.loadBuffer(new URL('./assets/BFX/battle-man-2.wav', import.meta.url).href),
      this.loadBuffer(new URL('./assets/BFX/death-man.wav', import.meta.url).href),
    ])

    this.collectBuffer = collectBuffer
    this.fastImpactBuffer = fastImpactBuffer
    this.lightningBuffer = lightningBuffer
    this.rushBuffer = rushBuffer
    this.wallBuffer = wallBuffer
    this.femaleLaughBuffer = femaleLaughBuffer
    this.femaleDeathBuffer = femaleDeathBuffer
    this.littleMonsterBuffer = littleMonsterBuffer
    this.maleBattleBuffers = [maleBattleBufferA, maleBattleBufferB]
    this.maleDeathBuffer = maleDeathBuffer
  }

  public async preloadAll(): Promise<void> {
    await Promise.all([this.bgmReadyPromise, this.sfxLoadPromise])
  }

  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol))
    if (this.bgmEnabled) this.bgmAudio.volume = this.masterVolume
    this.sfxGainNode.gain.value = this.masterVolume
  }

  public toggleBGM(enabled: boolean) {
    this.bgmEnabled = enabled
    if (enabled && audioReady) {
      this.bgmAudio.play().catch(() => {})
      this.bgmAudio.volume = this.masterVolume
    } else {
      this.bgmAudio.pause()
    }
  }

  public toggleSFX(enabled: boolean) {
    this.sfxEnabled = enabled
  }

  public startBGM() {
    if (this.bgmEnabled) {
      this.bgmAudio.play().catch(() => {})
    }
  }

  private playBuffer(buffer: AudioBuffer | null, when: number, gainScale: number, playbackRate: number) {
    if (!buffer) return
    const source = audioContext.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = playbackRate

    const gainNode = audioContext.createGain()
    gainNode.gain.value = gainScale
    source.connect(gainNode)
    gainNode.connect(this.sfxGainNode)
    source.start(when)
  }

  private playClashSample(bufferIndex: number, when: number, gainScale: number) {
    this.playBuffer(this.sfxBuffers[bufferIndex], when, gainScale, 0.96 + Math.random() * 0.08)
  }

  // 播放碰撞音效，level 为 1~7，density 越高越密集
  public playClashSound(level: number, density = 1) {
    if (!this.sfxEnabled || !audioReady || !this.sfxBuffers.some(Boolean)) return

    const clampedLevel = Math.max(1, Math.min(7, level))
    const scaledLevel = clampedLevel - 1
    const lowIndex = Math.max(0, Math.min(6, Math.floor(scaledLevel)))
    const highIndex = Math.max(0, Math.min(6, Math.ceil(scaledLevel)))
    const repeatCount = Math.max(1, Math.min(4, Math.round(density)))
    const interval = THREE.MathUtils.lerp(0.1, 0.035, (repeatCount - 1) / 3)
    const baseGain = 0.42 + (scaledLevel / 6) * 0.52

    for (let i = 0; i < repeatCount; i += 1) {
      const gainFalloff = Math.max(0.4, 1 - i * 0.16)
      const blend = scaledLevel - Math.floor(scaledLevel)
      const useHigh = lowIndex !== highIndex && Math.random() < blend + i * 0.06
      const chosenIndex = useHigh ? highIndex : lowIndex
      this.playClashSample(chosenIndex, audioContext.currentTime + i * interval, baseGain * gainFalloff)
    }
  }

  public playCollectSound(isSkillPickup = false) {
    if (!this.sfxEnabled || !audioReady || !this.collectBuffer) return

    this.playBuffer(
      this.collectBuffer,
      audioContext.currentTime,
      isSkillPickup ? 1.18 : 0.86,
      isSkillPickup ? 1.1 + Math.random() * 0.05 : 1.02 + Math.random() * 0.08,
    )
  }

  public playOpeningPillarSequence(count: number) {
    if (!this.sfxEnabled || !audioReady || !this.fastImpactBuffer || count <= 0) return

    const now = audioContext.currentTime
    const interval = 0.034
    for (let index = 0; index < count; index += 1) {
      this.playBuffer(
        this.fastImpactBuffer,
        now + index * interval,
        index === 0 ? 0.62 : 0.34,
        index === 0 ? 0.94 : 1.04 + index * 0.014,
      )
    }
  }

  public playLightningCastSound() {
    if (!this.sfxEnabled || !audioReady || !this.lightningBuffer) return
    this.playBuffer(this.lightningBuffer, audioContext.currentTime, 0.54, 0.98 + Math.random() * 0.05)
  }

  public playRushCastSound() {
    if (!this.sfxEnabled || !audioReady || !this.rushBuffer) return
    this.playBuffer(this.rushBuffer, audioContext.currentTime, 0.5, 0.98 + Math.random() * 0.06)
  }

  public playWallCastSound() {
    if (!this.sfxEnabled || !audioReady || !this.wallBuffer) return
    this.playBuffer(this.wallBuffer, audioContext.currentTime, 0.56, 0.97 + Math.random() * 0.05)
  }

  public playFemaleLaughSound() {
    if (!this.sfxEnabled || !audioReady || !this.femaleLaughBuffer) return
    const now = audioContext.currentTime
    if (now < this.femaleLaughCooldownUntil) return
    this.femaleLaughCooldownUntil = now + 2.8
    this.playBuffer(this.femaleLaughBuffer, now, 0.42, 0.96 + Math.random() * 0.08)
  }

  public playLittleMonsterSound(force = false) {
    if (!this.sfxEnabled || !audioReady || !this.littleMonsterBuffer) return
    const now = audioContext.currentTime
    if (!force && now < this.littleMonsterCooldownUntil) return
    this.littleMonsterCooldownUntil = now + (force ? 0.18 : 2.6)
    this.playBuffer(this.littleMonsterBuffer, now, 0.4, 0.94 + Math.random() * 0.08)
  }

  public playMaleBattleSound() {
    if (!this.sfxEnabled || !audioReady) return
    const now = audioContext.currentTime
    if (now < this.maleBattleCooldownUntil) return
    const availableBuffers = this.maleBattleBuffers.filter((buffer): buffer is AudioBuffer => buffer !== null)
    if (availableBuffers.length === 0) return
    this.maleBattleCooldownUntil = now + 1.1
    const chosen = availableBuffers[Math.floor(Math.random() * availableBuffers.length)]
    this.playBuffer(chosen, now, 0.44, 0.95 + Math.random() * 0.12)
  }

  public playMaleDeathSound() {
    if (!this.sfxEnabled || !audioReady || !this.maleDeathBuffer) return
    this.playBuffer(this.maleDeathBuffer, audioContext.currentTime, 0.56, 0.95 + Math.random() * 0.06)
  }

  public playFemaleDeathSound() {
    if (!this.sfxEnabled || !audioReady || !this.femaleDeathBuffer) return
    this.playBuffer(this.femaleDeathBuffer, audioContext.currentTime, 0.54, 0.97 + Math.random() * 0.06)
  }
}

const audioManager = new AudioManager()

function updateStartLoadingProgress(loaded: number, total: number, label: string): void {
  const progress = total > 0 ? loaded / total : 0
  startLoadingLabel.textContent = label
  startLoadingDetail.textContent = `${loaded} / ${total}`
  startProgressFill.style.transform = `scaleX(${THREE.MathUtils.clamp(progress, 0, 1)})`
}

function setStartReadyState(): void {
  startupAssetsReady = true
  updateStartLoadingProgress(1, 1, '资源加载完成，请点击开始游戏')
  loadingScreen.classList.add('hidden')
  startScreen.classList.remove('hidden')
}

function setStartLoadFailedState(message: string): void {
  startupAssetsFailed = true
  updateStartLoadingProgress(0, 1, message)
  startLoadingDetail.textContent = '请刷新页面后重试'
  loadingScreen.classList.remove('hidden')
  startScreen.classList.add('hidden')
}

function buildStartupPreloadTasks(): Array<{ label: string; run: () => Promise<unknown> }> {
  const characterProfiles = [PLAYER_PROFILE, ...ENEMY_PROFILES]
  const uniqueCharacterAssets = new Map<string, { key: string; url: string }>()
  for (const profile of characterProfiles) {
    uniqueCharacterAssets.set(profile.key, { key: profile.key, url: profile.modelUrl })
    if (profile.idleAnimationUrl) {
      uniqueCharacterAssets.set(`${profile.key}-idle`, { key: `${profile.key}-idle`, url: profile.idleAnimationUrl })
    }
  }

  const uniqueCritterAssets = new Map<string, CritterProfile>()
  for (const profile of CRITTER_PROFILES) {
    uniqueCritterAssets.set(profile.key, profile)
  }

  const uniqueObstacleVariants = new Map<string, ObstacleVariantConfig>()
  for (const variant of [...OBSTACLE_VARIANTS, CENTRAL_ALTAR_VARIANT]) {
    uniqueObstacleVariants.set(variant.key, variant)
  }

  return [
    { label: '背景音乐与音效', run: () => audioManager.preloadAll() },
    { label: '地面贴图', run: () => textureLoader.loadAsync(GROUND_TEXTURE_URL) },
    { label: '飞剑坐骑模型', run: () => loadSwordModelAsset() },
    { label: '云朵坐骑模型', run: () => loadCloudModelAsset() },
    ...Array.from(uniqueCharacterAssets.values(), (asset) => ({
      label: `角色资源 ${asset.key}`,
      run: () => loadFbxAsset(asset.key, asset.url),
    })),
    ...Array.from(uniqueCritterAssets.values(), (profile) => ({
      label: `灵兽资源 ${profile.key}`,
      run: () => loadFbxAsset(`critter-${profile.key}`, profile.modelUrl),
    })),
    ...Array.from(uniqueObstacleVariants.values(), (variant) => ({
      label: `场景资源 ${variant.key}`,
      run: () => loadObstacleModelAsset(variant),
    })),
  ]
}

async function preloadStartupAssets(): Promise<void> {
  if (startupAssetsPromise) {
    return startupAssetsPromise
  }

  const tasks = buildStartupPreloadTasks()
  let loaded = 0
  updateStartLoadingProgress(0, tasks.length, '正在加载资源...')

  startupAssetsPromise = Promise.all(
    tasks.map(async (task) => {
      await task.run()
      loaded += 1
      updateStartLoadingProgress(loaded, tasks.length, `已加载：${task.label}`)
    }),
  )
    .then(() => {
      setStartReadyState()
    })
    .catch((error) => {
      console.error('启动资源加载失败', error)
      setStartLoadFailedState('资源加载失败，无法开始游戏')
      throw error
    })

  return startupAssetsPromise
}

void preloadStartupAssets().catch(() => {})

bgmToggle.addEventListener('change', (e) => {
  audioManager.toggleBGM((e.target as HTMLInputElement).checked)
})
sfxToggle.addEventListener('change', (e) => {
  audioManager.toggleSFX((e.target as HTMLInputElement).checked)
})
masterVolume.addEventListener('input', (e) => {
  const vol = parseInt((e.target as HTMLInputElement).value, 10) / 100
  audioManager.setMasterVolume(vol)
})

const keys = new Set<string>()
let gameEnded = false
let gamePaused = false
const cameraOffset = new THREE.Vector3(0, 21, 22)
const desiredCameraPosition = new THREE.Vector3()
const desiredLookTarget = new THREE.Vector3()
const cameraFollowPosition = new THREE.Vector3()
const cameraLookTarget = new THREE.Vector3()
const cameraShakeOffset = new THREE.Vector3()
const tempVectorA = new THREE.Vector3()
const tempVectorB = new THREE.Vector3()
const tempVectorD = new THREE.Vector3()
let orbRespawnTimer = 0
let skillOrbRespawnTimer = 3
let screenShakeTime = 0
let screenShakeDuration = 0
let screenShakeStrength = 0
let impactFlashTime = 0
let impactFlashDuration = 0
let impactFlashStrength = 0
let hitStopTime = 0
const defeatNotices: DefeatNotice[] = []
let defeatNoticeSequence = 0
let renderedDefeatNoticeId = -1

// 鼠标瞄准与技能系统相关
const mouse = new THREE.Vector2()
const raycaster = new THREE.Raycaster()
const cursorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const cursorPosition = new THREE.Vector3()
const ALL_ACTIVE_SKILLS: ActiveSkill[] = ['lightning', 'dash', 'wall']

const cursorMesh = new THREE.Mesh(
  new THREE.RingGeometry(1.8, 2.0, 32),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
)
cursorMesh.rotation.x = -Math.PI / 2
cursorMesh.position.y = 0.1
cursorMesh.visible = false
scene.add(cursorMesh)

const activeEffects: { update: (delta: number) => boolean }[] = []

const groundTexture = createGroundTexture()
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.MeshStandardMaterial({
    map: groundTexture,
    color: 0x7f8c8d,
    roughness: 0.95,
    metalness: 0.02,
  }),
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

const ambientLight = new THREE.HemisphereLight(0xcbe0f1, 0x24361c, 1.02)
scene.add(ambientLight)

const moonLight = new THREE.DirectionalLight(0xb8d6f0, 1.72)
moonLight.position.set(-14, 18, 8)
moonLight.castShadow = true
moonLight.shadow.mapSize.set(MOON_SHADOW_MAP_SIZE, MOON_SHADOW_MAP_SIZE)
moonLight.shadow.camera.left = -50
moonLight.shadow.camera.right = 50
moonLight.shadow.camera.top = 50
moonLight.shadow.camera.bottom = -50
scene.add(moonLight)

const fillLight = new THREE.DirectionalLight(0x9ec6b2, 0.26)
fillLight.position.set(16, 11, -14)
scene.add(fillLight)

const arenaGlowLight = new THREE.PointLight(0x79ffb6, 3.2, 72, 2.6)
arenaGlowLight.position.set(0, 6.5, 0)
scene.add(arenaGlowLight)

let starfield: Starfield | null = null

scene.add(createSkyDome())
starfield = createStarfield()
scene.add(starfield.group)
scene.add(createGridAura())

const obstacles: Obstacle[] = []
const orbs: OrbPickup[] = []
const cultivators: Cultivator[] = []
const critters: Critter[] = []
const sparks: Spark[] = []
const teleporters: Teleporter[] = []
const arenaFireflies: ArenaFirefly[] = []
let arenaSpiritMotes: ArenaSpiritMotes | null = null
let centralAltar: CentralAltar | null = null
const openingPillars: OpeningPillar[] = []
let introActive = false
const baguaSpawnPositions = createBaguaSpawnPositions()

scene.add(createArenaFireflySwarm())
arenaSpiritMotes = createArenaSpiritMotes()
scene.add(arenaSpiritMotes.points)
createCentralAltar()

const crescentGeometry = createCrescentGeometry()
const crystalCoreGeometry = new THREE.TorusKnotGeometry(0.18, 0.06, 96, 12)

spawnObstacles()
createTeleporters()

const player = createCultivator('player', new THREE.Vector3(0, 0, 0), PLAYER_PROFILE)
placeCultivatorAtBaguaSlot(player, 0)
setCultivatorManifested(player, false)
scene.add(player.group)
cultivators.push(player)
cameraFollowPosition.copy(player.group.position)
cameraLookTarget.set(player.group.position.x, 2.9, player.group.position.z)

for (let index = 0; index < Math.min(CULTIVATOR_COUNT, ENEMY_PROFILES.length); index += 1) {
  const enemy = createCultivator(
    'enemy',
    baguaSpawnPositions[index + 1].clone(),
    ENEMY_PROFILES[index],
  )
  enemy.score = 4 + index * 2
  enemy.bladeCount = THREE.MathUtils.clamp(3 + Math.floor(index * 0.7), 3, 9)
  enemy.baseBladeSpinSpeed += index * 0.08
  enemy.bladeSpinSpeed = enemy.baseBladeSpinSpeed
  enemy.speed += index * 0.14
  placeCultivatorAtBaguaSlot(enemy, index + 1)
  setCultivatorManifested(enemy, false)
  syncCultivatorStats(enemy)
  scene.add(enemy.group)
  cultivators.push(enemy)
}

for (let index = 0; index < CRITTER_COUNT; index += 1) {
  let critterPosition = randomArenaPosition(3)
  for (let attempt = 0; attempt < 24 && isNearBaguaSpawnSlot(critterPosition, 6.2); attempt += 1) {
    critterPosition = randomArenaPosition(3)
  }
  const critter = createCritter(critterPosition)
  critters.push(critter)
  scene.add(critter.group)
  void attachCritterModel(critter)
}

for (let index = 0; index < ORB_TARGET_COUNT; index += 1) {
  spawnOrbFromCritter(undefined, undefined, false)
}

const restart = () => window.location.reload()

function setPaused(paused: boolean): void {
  if (!gameStarted || gameEnded) {
    gamePaused = false
    pauseOverlay.classList.add('hidden')
    return
  }

  gamePaused = paused
  pauseOverlay.classList.toggle('hidden', !paused)
  keys.clear()
  cursorMesh.visible = false
}

function togglePause(): void {
  setPaused(!gamePaused)
}

async function startGame(): Promise<void> {
  if (gameStarted) {
    return
  }

  if (startupAssetsFailed) {
    return
  }

  if (!startupAssetsReady) {
    try {
      await preloadStartupAssets()
    } catch {
      return
    }
  }

  setCultivatorDisplayName(player, playerNameInput.value)

  gameStarted = true
  startScreen.classList.add('hidden')

  if (!audioReady) {
    try {
      await audioContext.resume()
      audioReady = true
    } catch (error) {
      console.warn('音频上下文启动失败', error)
    }
  }

  beginOpeningPillarIntro()
  audioManager.startBGM()
}

startButton.addEventListener('click', () => {
  void startGame()
})

pauseRestartButton.addEventListener('click', () => {
  restart()
})

pauseContinueButton.addEventListener('click', () => {
  setPaused(false)
})

playerNameInput.addEventListener('keydown', (event) => {
  if (event.code === 'Enter' || event.code === 'NumpadEnter') {
    event.preventDefault()
    void startGame()
  }
})

window.addEventListener('keydown', (event) => {
  if (!gameStarted) {
    return
  }

  if (event.code === 'Escape' && !gameEnded) {
    event.preventDefault()
    togglePause()
    return
  }

  keys.add(event.code)

  if (event.code === 'KeyR' && gameEnded) {
    restart()
  }
})

window.addEventListener('keyup', (event) => {
  keys.delete(event.code)
})

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(getTargetPixelRatio())
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
  syncTipsPanelHeight()
})

window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
})

window.addEventListener('contextmenu', (e) => {
  e.preventDefault()
  if (!gameStarted) return
  if (gamePaused) return
  if (introActive) return
  syncSkillLoadout(player)
  if (gameEnded || !player.alive || player.skills.length === 0) return
  player.selectedSkillIndex = (player.selectedSkillIndex + 1) % player.skills.length
})

window.addEventListener('mousedown', (e) => {
  if (!gameStarted) return
  if (gamePaused) return
  if (introActive) return
  if (e.button === 0) { // 左键
    syncSkillLoadout(player)
    if (gameEnded || !player.alive || player.skills.length === 0) return
    if (player.skillCooldown <= 0 && useSelectedSkill(player, getPlayerSkillTargetPosition())) {
      player.skillCooldown = 1.5 // 基础冷却
    }
  }
})

updateHud()
animate()

function animate(): void {
  requestAnimationFrame(animate)

  const rawDelta = Math.min(clock.getDelta(), 0.033)
  const delta = gamePaused || hitStopTime > 0 ? 0 : rawDelta
  if (!gamePaused) {
    hitStopTime = Math.max(0, hitStopTime - rawDelta)
  }

  if (gamePaused) {
    updateHud()
    cursorMesh.visible = false
    composer.render()
    return
  }

  if (!gameStarted) {
    updateCultivatorBlades(rawDelta * 0.55)
    updateOrbs(rawDelta * 0.35)
    updateTeleporters(rawDelta * 0.35)
    updateSparks(rawDelta)
  } else if (introActive) {
    updateOpeningPillarIntro(rawDelta)
    updateDefeatNotices(rawDelta)
    updateCultivatorBlades(rawDelta * 0.4)
    updateTeleporters(rawDelta * 0.5)
    updateSparks(rawDelta)
    updateHud()
  } else if (!gameEnded) {
    updatePlayer(delta)
    updateEnemies(delta)
    updateCritters(delta)
    updateOrbs(delta)
    updateTeleporters(delta)
    updateCultivatorBlades(delta)
    if (delta > 0) {
      resolveDashImpacts()
      resolveBodyCollisions()
      resolveBladeClashes()
      resolveBladeBodyHits()
      resolveCritterBladeHits()
    }
    updateSparks(rawDelta)
    updateDefeatNotices(rawDelta)
    if (delta > 0) {
      ensureOrbCount(delta)
    }
    checkWinLoss()
    updateHud()
  } else {
    updateCultivatorBlades(delta * 0.35)
    updateOrbs(delta)
    updateSparks(rawDelta)
  }

  updateArenaAtmospherics(rawDelta)

  updateCamera(rawDelta)
  
  // 更新技能特效
  for (let i = activeEffects.length - 1; i >= 0; i--) {
    if (activeEffects[i].update(delta)) {
      activeEffects.splice(i, 1)
    }
  }

  // 更新鼠标瞄准圈
  if (gameStarted && !introActive && player.alive && player.skills.length > 0) {
    updateCursorWorldPosition()
    cursorMesh.position.x = cursorPosition.x
    cursorMesh.position.z = cursorPosition.z
    cursorMesh.visible = true
    
    // 根据当前技能改变圈颜色
    const currentSkill = player.skills[player.selectedSkillIndex]
    if (currentSkill === 'lightning') {
      ;(cursorMesh.material as THREE.MeshBasicMaterial).color.setHex(0x9922ff)
      cursorMesh.scale.set(1.5, 1.5, 1.5) // 闪电范围扩大
    } else if (currentSkill === 'dash') {
      ;(cursorMesh.material as THREE.MeshBasicMaterial).color.setHex(0xff3b30)
      cursorMesh.scale.set(1.15, 1.15, 1.15)
    } else if (currentSkill === 'wall') {
      ;(cursorMesh.material as THREE.MeshBasicMaterial).color.setHex(0xeeaa22)
      cursorMesh.scale.set(1.5, 1.5, 1.5) // 气墙范围与其他法术保持一致
    }
  } else {
    cursorMesh.visible = false
  }

  composer.render()
}

function createGroundTexture(): THREE.Texture {
  const texture = textureLoader.load(GROUND_TEXTURE_URL)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(6, 6)
  texture.anisotropy = Math.max(8, renderer.capabilities.getMaxAnisotropy() / 2)
  return texture
}

function createEmptySkillCounts(): SkillCounts {
  return {
    lightning: 0,
    dash: 0,
    wall: 0,
  }
}

function syncSkillLoadout(cultivator: Cultivator): void {
  cultivator.skills = ALL_ACTIVE_SKILLS.filter((skill) => cultivator.skillCounts[skill] > 0)
  if (cultivator.skills.length === 0) {
    cultivator.selectedSkillIndex = 0
    return
  }
  cultivator.selectedSkillIndex %= cultivator.skills.length
}

function useSelectedSkill(caster: Cultivator, targetPos: THREE.Vector3): boolean {
  syncSkillLoadout(caster)
  const skill = caster.skills[caster.selectedSkillIndex]
  if (!skill) {
    return false
  }
  return useSkill(caster, skill, targetPos)
}

function useSkill(caster: Cultivator, skill: ActiveSkill, targetPos: THREE.Vector3): boolean {
  if (caster.skillCounts[skill] <= 0) {
    syncSkillLoadout(caster)
    return false
  }

  caster.skillCounts[skill] -= 1
  castSkill(caster, skill, targetPos)
  if (caster.kind === 'player') {
    createSparks(targetPos.clone().setY(0.8), skill === 'lightning' ? 12 : 8, getOrbStyle(skill).shell.clone())
  }
  syncSkillLoadout(caster)
  return true
}

function updateCursorWorldPosition(): boolean {
  raycaster.setFromCamera(mouse, camera)
  const hit = raycaster.ray.intersectPlane(cursorPlane, cursorPosition)
  return hit !== null
}

function getPlayerSkillTargetPosition(): THREE.Vector3 {
  if (updateCursorWorldPosition()) {
    return cursorPosition.clone()
  }

  const fallbackEnemy = cultivators
    .filter((target) => target.alive && target !== player)
    .sort((a, b) => a.group.position.distanceToSquared(player.group.position) - b.group.position.distanceToSquared(player.group.position))[0]

  if (fallbackEnemy) {
    return fallbackEnemy.group.position.clone()
  }

  const forward = player.moveDir.clone().setY(0)
  if (forward.lengthSq() < 0.001) {
    forward.set(0, 0, -1)
  } else {
    forward.normalize()
  }
  return player.group.position.clone().addScaledVector(forward, 7)
}

function castSkill(caster: Cultivator, skill: ActiveSkill, targetPos: THREE.Vector3): void {
  if (skill === 'lightning') {
    audioManager.playLightningCastSound()
    createLightningEffect(targetPos.clone(), caster)
  } else if (skill === 'dash') {
    audioManager.playRushCastSound()
    createDashEffect(targetPos.clone(), caster)
  } else if (skill === 'wall') {
    audioManager.playWallCastSound()
    createWallEffect(targetPos.clone(), caster)
  }
}

function createLightningEffect(pos: THREE.Vector3, caster: Cultivator): void {
  const lightningStyle = getOrbStyle('lightning')
  const strikeTargets = cultivators
    .filter((target) => target.alive && target !== caster)
    .map((target) => ({
      target,
      distanceSq: target.group.position.distanceToSquared(pos),
    }))
    .filter((entry) => entry.distanceSq <= LIGHTNING_STRIKE_RADIUS * LIGHTNING_STRIKE_RADIUS)
    .sort((a, b) => a.distanceSq - b.distanceSq)
    .slice(0, LIGHTNING_TARGET_LIMIT)
    .map((entry) => entry.target)

  if (strikeTargets.length === 0) {
    const fallbackTarget = cultivators
      .filter((target) => target.alive && target !== caster)
      .map((target) => ({
        target,
        distanceSq: target.group.position.distanceToSquared(pos),
      }))
      .sort((a, b) => a.distanceSq - b.distanceSq)[0]

    if (fallbackTarget && fallbackTarget.distanceSq <= LIGHTNING_FALLBACK_RADIUS * LIGHTNING_FALLBACK_RADIUS) {
      strikeTargets.push(fallbackTarget.target)
      pos.copy(fallbackTarget.target.group.position)
    }
  }

  const group = new THREE.Group()
  scene.add(group)

  const flash = new THREE.Mesh(
    new THREE.CircleGeometry(LIGHTNING_STRIKE_RADIUS * 0.42, 28),
    new THREE.MeshBasicMaterial({
      color: lightningStyle.shell,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  )
  flash.rotation.x = -Math.PI / 2
  flash.position.copy(pos)
  flash.position.y = 0.12
  group.add(flash)

  const starShape = new THREE.Shape()
  const outerRadius = 1.22
  const innerRadius = 0.5
  for (let index = 0; index < 10; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius
    const angle = -Math.PI / 2 + (index / 10) * Math.PI * 2
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    if (index === 0) {
      starShape.moveTo(x, y)
    } else {
      starShape.lineTo(x, y)
    }
  }
  starShape.closePath()
  const starBaseMaterial = new THREE.MeshBasicMaterial({
    color: lightningStyle.core,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const starBase = new THREE.Mesh(new THREE.ShapeGeometry(starShape), starBaseMaterial)
  starBase.rotation.x = -Math.PI / 2
  starBase.position.copy(pos)
  starBase.position.y = 0.14
  group.add(starBase)

  const impactRingMaterial = new THREE.MeshBasicMaterial({
    color: lightningStyle.core,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const impactRing = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.28, 32), impactRingMaterial)
  impactRing.rotation.x = -Math.PI / 2
  impactRing.position.copy(pos)
  impactRing.position.y = 0.16
  group.add(impactRing)

  const impactGlow = createSoftGlowSprite(lightningStyle.core.clone())
  impactGlow.position.copy(pos)
  impactGlow.position.y = 1.15
  impactGlow.scale.set(4.6, 4.6, 1)
  group.add(impactGlow)

  const targetGlows: THREE.Sprite[] = []
  const arcOuterMaterials: THREE.MeshBasicMaterial[] = []
  const arcCoreMaterials: THREE.MeshBasicMaterial[] = []
  const arcGlows: THREE.Sprite[] = []
  const skySource = pos.clone().setY(11.8)
  const sourceGlow = createSoftGlowSprite(lightningStyle.shell.clone())
  sourceGlow.position.copy(skySource)
  sourceGlow.scale.set(2.2, 2.2, 1)
  group.add(sourceGlow)

  const branchTargets = strikeTargets.length > 0 ? strikeTargets : [undefined]
  const primaryTargetPos = branchTargets[0] ? branchTargets[0].group.position.clone().setY(1.2) : pos.clone().setY(1.2)
  appendLightningArc(
    group,
    skySource,
    primaryTargetPos,
    lightningStyle.shell.clone(),
    lightningStyle.core.clone(),
    arcOuterMaterials,
    arcCoreMaterials,
    arcGlows,
  )

  const branchAnchor = primaryTargetPos.clone()
  for (let index = 0; index < branchTargets.length; index += 1) {
    const target = branchTargets[index]
    const targetPos = target ? target.group.position.clone().setY(1.2) : pos.clone().setY(1.2)
    const targetGlow = createSoftGlowSprite(lightningStyle.core.clone())
    targetGlow.position.set(targetPos.x, 1.25, targetPos.z)
    targetGlow.scale.set(2.7, 2.7, 1)
    group.add(targetGlow)
    targetGlows.push(targetGlow)

    if (index > 0 || !target) {
      const branchStart =
        target && index % 2 === 0
          ? branchAnchor.clone().lerp(skySource, 0.16)
          : branchAnchor.clone().add(new THREE.Vector3(
              THREE.MathUtils.randFloatSpread(0.6),
              THREE.MathUtils.randFloat(0.35, 0.95),
              THREE.MathUtils.randFloatSpread(0.6),
            ))
      appendLightningArc(
        group,
        branchStart,
        targetPos,
        lightningStyle.shell.clone(),
        lightningStyle.core.clone(),
        arcOuterMaterials,
        arcCoreMaterials,
        arcGlows,
      )
    }
  }

  let life = LIGHTNING_DURATION
  activeEffects.push({
    update: (delta) => {
      life -= delta
      const progress = 1 - life / LIGHTNING_DURATION
      ;(flash.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - progress) * 0.42)
      flash.scale.setScalar(1 + progress * 1.35)
      starBaseMaterial.opacity = Math.max(0, (1 - progress) * 0.72)
      starBase.rotation.z += delta * 2.6
      starBase.scale.setScalar(1 + progress * 1.45)
      impactRingMaterial.opacity = Math.max(0, (1 - progress) * 0.9)
      impactRing.scale.setScalar(1 + progress * 2.8)
      ;(impactGlow.material as THREE.SpriteMaterial).opacity = Math.max(0, (1 - progress) * 0.42)
      impactGlow.scale.setScalar(4.6 + progress * 4.2)

      ;(sourceGlow.material as THREE.SpriteMaterial).opacity = Math.max(0, (1 - progress) * 0.3)
      sourceGlow.scale.setScalar(2.2 + progress * 1.7)
      targetGlows.forEach((targetGlow) => {
        const targetGlowMaterial = targetGlow.material as THREE.SpriteMaterial
        targetGlowMaterial.opacity = Math.max(0, (1 - progress) * 0.34)
        targetGlow.scale.setScalar(2.7 + progress * 1.8)
      })
      arcOuterMaterials.forEach((material, index) => {
        material.opacity = Math.max(0, (1 - progress) * (0.8 - (index % 3) * 0.05))
      })
      arcCoreMaterials.forEach((material, index) => {
        material.opacity = Math.max(0, (1 - progress) * (0.98 - (index % 2) * 0.06))
      })
      arcGlows.forEach((glow, index) => {
        const glowMaterial = glow.material as THREE.SpriteMaterial
        glowMaterial.opacity = Math.max(0, (1 - progress) * (0.28 + (index % 2) * 0.04))
        glow.scale.multiplyScalar(1 + delta * 1.8)
      })

      if (life <= 0) {
        scene.remove(group)
        flash.geometry.dispose()
        ;(flash.material as THREE.Material).dispose()
        starBase.geometry.dispose()
        starBaseMaterial.dispose()
        impactRing.geometry.dispose()
        impactRingMaterial.dispose()
        disposeSpriteMaterial(impactGlow.material as THREE.SpriteMaterial)
        disposeSpriteMaterial(sourceGlow.material as THREE.SpriteMaterial)
        targetGlows.forEach((glow) => disposeSpriteMaterial(glow.material as THREE.SpriteMaterial))
        group.children.forEach((child) => {
          if (child instanceof THREE.Mesh && child !== flash && child !== impactRing) {
            child.geometry.dispose()
          }
        })
        arcOuterMaterials.forEach((material) => material.dispose())
        arcCoreMaterials.forEach((material) => material.dispose())
        arcGlows.forEach((glow) => disposeSpriteMaterial(glow.material as THREE.SpriteMaterial))
        return true
      }
      return false
    },
  })

  createSparks(pos.clone().setY(0.8), 22, lightningStyle.core.clone())
  spawnSpark(pos.clone().setY(0.8), 1.3)
  if (caster.kind === 'player') {
    triggerHitStop(0.024)
  }

  for (const target of strikeTargets) {
    target.stunDuration = Math.max(target.stunDuration, LIGHTNING_DURATION + 0.15)
    target.bladeCount = Math.max(2, target.bladeCount - 2)
    syncCultivatorStats(target)
    target.clashWobble = 1.0
    createSparks(target.group.position, 22, lightningStyle.shell.clone())
    spawnSpark(target.group.position.clone().setY(1.1), 1.15)
    applyCombatDamage(target, caster, target.kind === 'player' ? 12 : 18, {
      grace: target.kind === 'player' ? 0.55 : 0.35,
      hitStop: target.kind === 'player' ? 0.03 : 0.02,
      sparkCount: target.kind === 'player' ? 18 : 14,
      sparkColor: new THREE.Color('#c8a6ff'),
      sparkPower: target.kind === 'player' ? 1.2 : 0.95,
      screenShake: target.kind === 'player' ? 0.38 : 0.22,
      impactPoint: target.group.position.clone(),
    })
  }
}

function createDashEffect(pos: THREE.Vector3, caster: Cultivator): void {
  const dashStyle = getOrbStyle('dash')
  const dashDirection = pos.clone().sub(caster.group.position).setY(0)
  if (dashDirection.lengthSq() < 0.001) {
    dashDirection.copy(caster.moveDir).setY(0)
  }
  if (dashDirection.lengthSq() < 0.001) {
    dashDirection.copy(caster.velocity).setY(0)
  }
  if (dashDirection.lengthSq() < 0.001) {
    dashDirection.set(0, 0, caster.kind === 'player' ? -1 : 1)
  }
  dashDirection.normalize()

  caster.dashDirection.copy(dashDirection)
  caster.dashTimer = DASH_DURATION
  caster.dashImpactReady = true
  caster.dashHitTargets.clear()
  caster.velocity.copy(dashDirection).multiplyScalar(caster.speed + DASH_SPEED_BONUS)
  caster.moveDir.copy(dashDirection)
  caster.collectCooldown = Math.max(caster.collectCooldown, 0.18)

  const group = new THREE.Group()
  scene.add(group)

  const streakMaterial = new THREE.MeshBasicMaterial({
    color: dashStyle.shell,
    transparent: true,
    opacity: 0.62,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const streak = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.56, 2.7, 12, 1, true), streakMaterial)
  streak.rotation.z = Math.PI / 2
  group.add(streak)

  const tipMaterial = new THREE.MeshBasicMaterial({
    color: dashStyle.core,
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.92, 12), tipMaterial)
  tip.rotation.z = -Math.PI / 2
  tip.position.x = 1.55
  group.add(tip)

  const wakeMaterial = new THREE.MeshBasicMaterial({
    color: dashStyle.core,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const wake = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.15), wakeMaterial)
  wake.position.x = -0.15
  group.add(wake)

  const burstRingMaterial = new THREE.MeshBasicMaterial({
    color: dashStyle.shell,
    transparent: true,
    opacity: 0.82,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const burstRing = new THREE.Mesh(new THREE.RingGeometry(0.72, 1.04, 32), burstRingMaterial)
  burstRing.rotation.x = -Math.PI / 2
  burstRing.position.copy(caster.group.position)
  burstRing.position.y = 0.08
  scene.add(burstRing)

  const dashGlow = createSoftGlowSprite(dashStyle.core.clone())
  dashGlow.scale.set(2.5, 2.5, 1)
  group.add(dashGlow)

  createSparks(caster.group.position.clone().setY(0.9), 12, dashStyle.core.clone())
  spawnSpark(caster.group.position.clone().setY(0.95), 1.1)

  let life = DASH_DURATION + 0.08
  let trailTimer = 0
  activeEffects.push({
    update: (delta) => {
      life -= delta
      trailTimer -= delta
      group.position.copy(caster.group.position).addScaledVector(caster.dashDirection, -0.55)
      group.position.y = 1.0 + caster.group.position.y * 0.08
      group.lookAt(group.position.clone().add(caster.dashDirection))
      streakMaterial.opacity = Math.max(0, life * 2.2)
      tipMaterial.opacity = Math.max(0, life * 2.8)
      wakeMaterial.opacity = Math.max(0, life * 1.55)
      ;(dashGlow.material as THREE.SpriteMaterial).opacity = Math.max(0, life * 1.9)
      dashGlow.scale.setScalar(2.5 + Math.max(life, 0) * 2.8)
      group.scale.setScalar(1.02 + Math.max(life, 0) * 0.8)
      burstRing.position.copy(caster.group.position)
      burstRing.position.y = 0.08
      burstRingMaterial.opacity = Math.max(0, life * 1.65)
      burstRing.scale.setScalar(1 + (1 - life / (DASH_DURATION + 0.08)) * 1.4)

      if (trailTimer <= 0 && life > 0) {
        trailTimer = 0.04
        const trailPos = caster.group.position.clone().addScaledVector(caster.dashDirection, -0.25)
        trailPos.y = 0.9
        createSparks(trailPos, 4, dashStyle.shell.clone())
      }

      if (life <= 0) {
        createDashImpactWave(caster.group.position.clone(), caster.dashDirection.clone(), dashStyle.shell.clone(), dashStyle.core.clone())
        scene.remove(group)
        scene.remove(burstRing)
        streak.geometry.dispose()
        streakMaterial.dispose()
        tip.geometry.dispose()
        tipMaterial.dispose()
        wake.geometry.dispose()
        wakeMaterial.dispose()
        burstRing.geometry.dispose()
        burstRingMaterial.dispose()
        disposeSpriteMaterial(dashGlow.material as THREE.SpriteMaterial)
        return true
      }
      return false
    },
  })
}

function createWallEffect(pos: THREE.Vector3, caster: Cultivator): void {
  const wallStyle = getOrbStyle('wall')
  const width = 12
  const height = 6
  const depth = 0.68
  const dir = pos.clone().sub(caster.group.position).setY(0)
  if (dir.lengthSq() < 0.001) dir.set(0, 0, -1)
  else dir.normalize()

  const angle = Math.atan2(dir.x, dir.z)
  const wallGroup = new THREE.Group()
  wallGroup.position.copy(pos)
  wallGroup.rotation.y = angle
  scene.add(wallGroup)

  const geo = new THREE.BoxGeometry(width, height, depth)
  const mat = new THREE.MeshBasicMaterial({
    color: wallStyle.shell,
    transparent: true,
    opacity: 0.38,
    blending: THREE.AdditiveBlending,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.y = height / 2
  wallGroup.add(mesh)

  const coreMaterial = new THREE.MeshBasicMaterial({
    color: wallStyle.core,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const frontPlane = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.92, height * 0.8), coreMaterial)
  frontPlane.position.set(0, height * 0.52, depth * 0.52)
  wallGroup.add(frontPlane)

  const backPlane = frontPlane.clone()
  backPlane.position.z = -depth * 0.52
  backPlane.rotation.y = Math.PI
  wallGroup.add(backPlane)

  const railGeometry = new THREE.BoxGeometry(width * 0.98, 0.18, 0.18)
  const railMaterial = new THREE.MeshBasicMaterial({
    color: wallStyle.core,
    transparent: true,
    opacity: 0.62,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const topRail = new THREE.Mesh(railGeometry, railMaterial)
  topRail.position.set(0, height - 0.1, 0)
  wallGroup.add(topRail)

  const bottomRail = topRail.clone()
  bottomRail.position.y = 0.1
  wallGroup.add(bottomRail)

  const baseRingMaterial = new THREE.MeshBasicMaterial({
    color: wallStyle.shell,
    transparent: true,
    opacity: 0.54,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const baseRing = new THREE.Mesh(new THREE.RingGeometry(width * 0.36, width * 0.46, 48), baseRingMaterial)
  baseRing.rotation.x = -Math.PI / 2
  baseRing.position.y = 0.08
  wallGroup.add(baseRing)

  const upperBaseRingMaterial = new THREE.MeshBasicMaterial({
    color: wallStyle.core,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const upperBaseRing = new THREE.Mesh(new THREE.RingGeometry(width * 0.24, width * 0.33, 48), upperBaseRingMaterial)
  upperBaseRing.rotation.x = -Math.PI / 2
  upperBaseRing.position.y = 0.11
  wallGroup.add(upperBaseRing)

  const basePatternGroup = new THREE.Group()
  basePatternGroup.position.y = 0.1
  wallGroup.add(basePatternGroup)
  const basePatternMaterial = new THREE.MeshBasicMaterial({
    color: wallStyle.core,
    transparent: true,
    opacity: 0.48,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const basePatternGeometry = new THREE.PlaneGeometry(0.78, 0.18)
  const basePatternCount = 18
  for (let index = 0; index < basePatternCount; index += 1) {
    const angleStep = (index / basePatternCount) * Math.PI * 2
    const rune = new THREE.Mesh(basePatternGeometry, basePatternMaterial)
    const radius = width * 0.41
    rune.position.set(Math.cos(angleStep) * radius, 0, Math.sin(angleStep) * radius)
    rune.rotation.x = -Math.PI / 2
    rune.rotation.z = angleStep
    basePatternGroup.add(rune)
  }

  const innerSigilGroup = new THREE.Group()
  basePatternGroup.add(innerSigilGroup)
  const sigilRingMaterial = new THREE.MeshBasicMaterial({
    color: wallStyle.core,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const sigilOuterRing = new THREE.Mesh(new THREE.RingGeometry(width * 0.14, width * 0.19, 48), sigilRingMaterial)
  sigilOuterRing.rotation.x = -Math.PI / 2
  innerSigilGroup.add(sigilOuterRing)
  const sigilInnerRing = new THREE.Mesh(new THREE.RingGeometry(width * 0.05, width * 0.09, 40), sigilRingMaterial)
  sigilInnerRing.rotation.x = -Math.PI / 2
  sigilInnerRing.position.y = 0.002
  innerSigilGroup.add(sigilInnerRing)

  const sigilRayGeometry = new THREE.PlaneGeometry(1.25, 0.11)
  const sigilRayMaterial = new THREE.MeshBasicMaterial({
    color: wallStyle.shell,
    transparent: true,
    opacity: 0.44,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  for (let index = 0; index < 8; index += 1) {
    const ray = new THREE.Mesh(sigilRayGeometry, sigilRayMaterial)
    ray.rotation.x = -Math.PI / 2
    ray.rotation.z = (index / 8) * Math.PI * 2
    innerSigilGroup.add(ray)
  }

  const starMaterial = new THREE.MeshBasicMaterial({
    color: wallStyle.shell,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const starLongGeometry = new THREE.PlaneGeometry(1.85, 0.16)
  const starShortGeometry = new THREE.PlaneGeometry(1.15, 0.14)
  const eightStarGroup = new THREE.Group()
  eightStarGroup.position.y = 0.016
  innerSigilGroup.add(eightStarGroup)
  for (let index = 0; index < 4; index += 1) {
    const straightRay = new THREE.Mesh(starLongGeometry, starMaterial)
    straightRay.rotation.x = -Math.PI / 2
    straightRay.rotation.z = (index / 4) * Math.PI * 2
    eightStarGroup.add(straightRay)

    const diagonalRay = new THREE.Mesh(starShortGeometry, starMaterial)
    diagonalRay.rotation.x = -Math.PI / 2
    diagonalRay.rotation.z = (index / 4) * Math.PI * 2 + Math.PI / 4
    eightStarGroup.add(diagonalRay)
  }
  const starCore = new THREE.Mesh(new THREE.CircleGeometry(width * 0.045, 24), starMaterial)
  starCore.rotation.x = -Math.PI / 2
  starCore.position.y = 0.003
  eightStarGroup.add(starCore)

  const wallGlow = createSoftGlowSprite(wallStyle.core.clone())
  wallGlow.position.set(0, height * 0.52, 0)
  wallGlow.scale.set(6.8, 4.8, 1)
  wallGroup.add(wallGlow)

  const runeGeometry = new THREE.PlaneGeometry(0.42, 0.16)
  const runeMaterial = new THREE.MeshBasicMaterial({
    color: wallStyle.core,
    transparent: true,
    opacity: 0.46,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: false,
  })
  const frontRunes: THREE.Mesh[] = []
  const backRunes: THREE.Mesh[] = []
  const runeCount = 14
  for (let index = 0; index < runeCount; index += 1) {
    const frontRune = new THREE.Mesh(runeGeometry, runeMaterial)
    const backRune = new THREE.Mesh(runeGeometry, runeMaterial)
    wallGroup.add(frontRune)
    wallGroup.add(backRune)
    frontRunes.push(frontRune)
    backRunes.push(backRune)
  }

  const tempObstacles: any[] = []
  const segments = 7
  const segmentWidth = width / segments
  const right = new THREE.Vector3(-dir.z, 0, dir.x).normalize()

  for (let i = 0; i < segments; i++) {
    const offset = (i - Math.floor(segments / 2)) * segmentWidth
    const obsPos = pos.clone().add(right.clone().multiplyScalar(offset))
    const obsMesh = new THREE.Mesh()
    obsMesh.position.copy(obsPos)

    const obs = { mesh: obsMesh, radius: depth * 0.9 }
    obstacles.push(obs)
    tempObstacles.push(obs)
  }

  let life = WALL_DURATION
  let sparkTimer = 0
  activeEffects.push({
    update: (delta) => {
      life -= delta
      sparkTimer -= delta
      const progress = 1 - life / WALL_DURATION
      const pulse = 0.7 + Math.sin(progress * Math.PI * 6) * 0.18
      mat.opacity = THREE.MathUtils.clamp(0.28 + pulse * 0.12, 0.18, 0.44)
      coreMaterial.opacity = THREE.MathUtils.clamp(0.14 + pulse * 0.1, 0.08, 0.3)
      railMaterial.opacity = THREE.MathUtils.clamp(0.32 + pulse * 0.18, 0.22, 0.58)
      baseRingMaterial.opacity = THREE.MathUtils.clamp(0.34 + pulse * 0.16, 0.18, 0.56)
      upperBaseRingMaterial.opacity = THREE.MathUtils.clamp(0.28 + pulse * 0.16, 0.16, 0.5)
      basePatternMaterial.opacity = THREE.MathUtils.clamp(0.24 + pulse * 0.14, 0.14, 0.42)
      sigilRingMaterial.opacity = THREE.MathUtils.clamp(0.3 + pulse * 0.16, 0.18, 0.54)
      sigilRayMaterial.opacity = THREE.MathUtils.clamp(0.22 + pulse * 0.14, 0.12, 0.44)
      starMaterial.opacity = THREE.MathUtils.clamp(0.3 + pulse * 0.18, 0.18, 0.56)
      runeMaterial.opacity = THREE.MathUtils.clamp(0.26 + pulse * 0.16, 0.14, 0.48)
      ;(wallGlow.material as THREE.SpriteMaterial).opacity = THREE.MathUtils.clamp(0.08 + pulse * 0.08, 0.04, 0.16)
      wallGlow.scale.set(
        6.8 + Math.sin(progress * Math.PI * 3) * 0.45,
        4.8 + Math.cos(progress * Math.PI * 3) * 0.32,
        1,
      )
      baseRing.rotation.z += delta * 1.5
      upperBaseRing.rotation.z -= delta * 2.3
      basePatternGroup.rotation.y -= delta * 1.8
      innerSigilGroup.rotation.y += delta * 2.4
      eightStarGroup.rotation.y -= delta * 1.2
      wallGroup.scale.z = 1 + Math.sin(progress * Math.PI * 2) * 0.05
      const perimeter = width * 2 + height * 2
      frontRunes.forEach((rune, index) => {
        const travel = (progress * perimeter * 1.6 + (perimeter / runeCount) * index) % perimeter
        const halfWidth = width * 0.5
        let x = 0
        let y = 0
        let rotationZ = 0

        if (travel < width) {
          x = -halfWidth + travel
          y = height - 0.2
          rotationZ = 0
        } else if (travel < width + height) {
          x = halfWidth - 0.12
          y = height - 0.2 - (travel - width)
          rotationZ = Math.PI * 0.5
        } else if (travel < width * 2 + height) {
          x = halfWidth - (travel - width - height)
          y = 0.2
          rotationZ = Math.PI
        } else {
          x = -halfWidth + 0.12
          y = 0.2 + (travel - width * 2 - height)
          rotationZ = -Math.PI * 0.5
        }

        const runeScale = 0.84 + Math.sin(progress * Math.PI * 5 + index * 0.85) * 0.18
        rune.position.set(x, y, depth * 0.58)
        rune.rotation.set(0, 0, rotationZ)
        rune.scale.set(runeScale, 1 + runeScale * 0.14, 1)

        const backRune = backRunes[index]
        backRune.position.set(x, y, -depth * 0.58)
        backRune.rotation.set(0, Math.PI, -rotationZ)
        backRune.scale.copy(rune.scale)
      })

      if (sparkTimer <= 0 && life > 0) {
        sparkTimer = 0.12
        const edgeOffset = right.clone().multiplyScalar((Math.random() - 0.5) * width * 0.8)
        const sparkPos = pos.clone().add(edgeOffset)
        sparkPos.y = 0.9 + Math.random() * (height - 1.4)
        createSparks(sparkPos, 4, wallStyle.core.clone())
      }

      if (life <= 0) {
        scene.remove(wallGroup)
        geo.dispose()
        mat.dispose()
        frontPlane.geometry.dispose()
        coreMaterial.dispose()
        railGeometry.dispose()
        railMaterial.dispose()
        baseRing.geometry.dispose()
        baseRingMaterial.dispose()
        upperBaseRing.geometry.dispose()
        upperBaseRingMaterial.dispose()
        basePatternGeometry.dispose()
        basePatternMaterial.dispose()
        sigilOuterRing.geometry.dispose()
        sigilInnerRing.geometry.dispose()
        sigilRingMaterial.dispose()
        sigilRayGeometry.dispose()
        sigilRayMaterial.dispose()
        starLongGeometry.dispose()
        starShortGeometry.dispose()
        starCore.geometry.dispose()
        starMaterial.dispose()
        runeGeometry.dispose()
        runeMaterial.dispose()
        disposeSpriteMaterial(wallGlow.material as THREE.SpriteMaterial)

        for (const obs of tempObstacles) {
          const idx = obstacles.indexOf(obs)
          if (idx > -1) {
            obstacles.splice(idx, 1)
          }
        }
        return true
      }
      return false
    }
  })
}

function createSkyDome(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(140, 24, 24)
  const material = new THREE.MeshBasicMaterial({
    side: THREE.BackSide,
    color: 0x070d17,
  })
  const dome = new THREE.Mesh(geometry, material)
  return dome
}

function createStarfieldLayer(starCount: number, radiusMin: number, radiusMax: number, size: number, opacity: number): StarfieldLayer {
  const positions = new Float32Array(starCount * 3)
  const colors = new Float32Array(starCount * 3)

  for (let index = 0; index < starCount; index += 1) {
    const baseIndex = index * 3
    const radius = THREE.MathUtils.randFloat(radiusMin, radiusMax)
    const theta = Math.random() * Math.PI * 2
    const phi = THREE.MathUtils.randFloat(Math.PI * 0.14, Math.PI * 0.82)
    const tintRoll = Math.random()
    const tint =
      tintRoll < 0.72
        ? new THREE.Color(0xffffff)
        : tintRoll < 0.9
          ? new THREE.Color(0xbfd6ff)
          : new THREE.Color(0xd5c7ff)

    positions[baseIndex] = radius * Math.sin(phi) * Math.cos(theta)
    positions[baseIndex + 1] = radius * Math.cos(phi)
    positions[baseIndex + 2] = radius * Math.sin(phi) * Math.sin(theta)
    colors[baseIndex] = tint.r
    colors[baseIndex + 1] = tint.g
    colors[baseIndex + 2] = tint.b
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size,
    vertexColors: true,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  })

  const points = new THREE.Points(geometry, material)
  points.renderOrder = 1
  return {
    points,
    baseOpacity: opacity,
    twinkleSpeed: THREE.MathUtils.randFloat(0.18, 0.42),
    twinklePhase: Math.random() * Math.PI * 2,
  }
}

function createStarfield(): Starfield {
  const group = new THREE.Group()
  const layers = [
    createStarfieldLayer(220, 96, 112, 0.78, 0.48),
    createStarfieldLayer(320, 104, 122, 0.62, 0.38),
    createStarfieldLayer(180, 112, 132, 0.96, 0.28),
  ]

  layers.forEach((layer, index) => {
    layer.points.rotation.x = -0.03 + index * 0.015
    layer.points.rotation.z = index * 0.22
    group.add(layer.points)
  })

  return { group, layers }
}

function createGridAura(): THREE.Group {
  const group = new THREE.Group()
  const ringGeometry = new THREE.RingGeometry(20, 20.15, 96)
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x56ffb3,
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide,
  })

  for (let index = 0; index < 4; index += 1) {
    const ring = new THREE.Mesh(ringGeometry, ringMaterial.clone())
    ring.rotation.x = -Math.PI / 2
    ring.scale.setScalar(1 + index * 0.45)
    ring.position.y = 0.02 + index * 0.01
    group.add(ring)
  }

  return group
}

function createCrescentGeometry(): THREE.ShapeGeometry {
  const outerRadius = 0.62
  const innerRadius = 0.41
  const shape = new THREE.Shape()
  shape.absarc(0, 0, outerRadius, Math.PI * 0.18, Math.PI * 1.8, false)
  const hole = new THREE.Path()
  hole.absarc(0.18, 0, innerRadius, Math.PI * 0.22, Math.PI * 1.78, false)
  shape.holes.push(hole)

  const geometry = new THREE.ShapeGeometry(shape, 48)
  geometry.center()
  geometry.rotateY(Math.PI / 2)
  return geometry
}

function populateFallbackCloudCore(target: THREE.Group, _color: THREE.ColorRepresentation): void {
  const puffGeometry = new THREE.SphereGeometry(0.42, 18, 16)
  const puffMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: new THREE.Color(0xffffff).multiplyScalar(0.08),
    emissiveIntensity: 0.24,
    roughness: 0.88,
    metalness: 0.02,
  })

  const puffOffsets = [
    new THREE.Vector3(0, 0.1, 0),
    new THREE.Vector3(-0.48, 0, 0.08),
    new THREE.Vector3(0.46, 0.02, 0.12),
    new THREE.Vector3(-0.14, 0.16, -0.42),
    new THREE.Vector3(0.18, 0.12, -0.38),
  ]

  for (const offset of puffOffsets) {
    const puff = new THREE.Mesh(puffGeometry, puffMaterial.clone())
    puff.position.copy(offset)
    puff.scale.set(1 + Math.random() * 0.18, 0.68 + Math.random() * 0.12, 1 + Math.random() * 0.18)
    puff.castShadow = true
    puff.receiveShadow = true
    target.add(puff)
  }
}

function updateCloudMountMetrics(cloudGroup: THREE.Group, cloudCore: THREE.Object3D): void {
  cloudCore.updateMatrixWorld(true)
  const bounds = new THREE.Box3().setFromObject(cloudCore)
  if (bounds.isEmpty()) {
    cloudGroup.userData.topY = 0.34
    cloudGroup.userData.contactY = 0.2
    return
  }

  const topPoint = new THREE.Vector3((bounds.min.x + bounds.max.x) * 0.5, bounds.max.y, (bounds.min.z + bounds.max.z) * 0.5)
  cloudGroup.worldToLocal(topPoint)
  cloudGroup.userData.topY = Math.max(topPoint.y, 0.18)
  cloudGroup.userData.contactY = Math.max(cloudGroup.userData.topY * 0.42, 0.14)
}

function prepareCloudModel(sceneRoot: THREE.Group, _color: THREE.ColorRepresentation): THREE.Group {
  const cloned = SkeletonUtils.clone(sceneRoot) as THREE.Group
  const tintColor = new THREE.Color(0xffffff)

  cloned.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return
    }

    child.castShadow = true
    child.receiveShadow = true
    child.frustumCulled = false

    if (Array.isArray(child.material)) {
      child.material = child.material.map((material) => {
        const clonedMaterial = material.clone()
        if ('color' in clonedMaterial && clonedMaterial.color instanceof THREE.Color) {
          clonedMaterial.color.copy(tintColor)
        }
        if ('emissive' in clonedMaterial && clonedMaterial.emissive instanceof THREE.Color) {
          clonedMaterial.emissive.copy(tintColor).multiplyScalar(0.05)
        }
        if ('emissiveIntensity' in clonedMaterial && typeof clonedMaterial.emissiveIntensity === 'number') {
          clonedMaterial.emissiveIntensity = Math.max(clonedMaterial.emissiveIntensity, 0.08)
        }
        if ('roughness' in clonedMaterial && typeof clonedMaterial.roughness === 'number') {
          clonedMaterial.roughness = Math.max(clonedMaterial.roughness, 0.72)
        }
        return clonedMaterial
      })
    } else {
      const clonedMaterial = child.material.clone()
      if ('color' in clonedMaterial && clonedMaterial.color instanceof THREE.Color) {
        clonedMaterial.color.copy(tintColor)
      }
      if ('emissive' in clonedMaterial && clonedMaterial.emissive instanceof THREE.Color) {
        clonedMaterial.emissive.copy(tintColor).multiplyScalar(0.05)
      }
      if ('emissiveIntensity' in clonedMaterial && typeof clonedMaterial.emissiveIntensity === 'number') {
        clonedMaterial.emissiveIntensity = Math.max(clonedMaterial.emissiveIntensity, 0.08)
      }
      if ('roughness' in clonedMaterial && typeof clonedMaterial.roughness === 'number') {
        clonedMaterial.roughness = Math.max(clonedMaterial.roughness, 0.72)
      }
      child.material = clonedMaterial
    }
  })

  cloned.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(cloned)
  const size = box.getSize(new THREE.Vector3())
  const footprint = Math.max(size.x, size.z, 0.01)
  const scaleFactor = 2.45 / footprint
  cloned.scale.set(scaleFactor, scaleFactor * 0.7, scaleFactor)
  cloned.updateMatrixWorld(true)

  const scaledBox = new THREE.Box3().setFromObject(cloned)
  const center = scaledBox.getCenter(new THREE.Vector3())
  cloned.position.set(-center.x, -scaledBox.min.y, -center.z)
  cloned.updateMatrixWorld(true)
  return cloned
}

async function loadCloudModelAsset(): Promise<THREE.Group> {
  if (!cloudModelAssetPromise) {
    cloudModelAssetPromise = fbxLoader.loadAsync(CLOUD_MODEL_URL)
  }
  return cloudModelAssetPromise
}

async function attachCloudModelToMount(target: THREE.Group, color: THREE.ColorRepresentation): Promise<void> {
  try {
    const loadedScene = await loadCloudModelAsset()
    if (!target.parent) {
      return
    }

    const preparedCloud = prepareCloudModel(loadedScene, color)
    target.clear()
    target.add(preparedCloud)
    updateCloudMountMetrics(target.parent as THREE.Group, target)
  } catch (error) {
    console.warn('云朵模型加载失败，继续使用程序云台', error)
  }
}

function populateFallbackSwordCore(target: THREE.Group, color: THREE.ColorRepresentation): void {
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.05, 2.5),
    new THREE.MeshStandardMaterial({
      color: 0xdce6f2,
      metalness: 0.9,
      roughness: 0.2,
      emissive: new THREE.Color(color).multiplyScalar(0.08),
    }),
  )
  blade.castShadow = true
  blade.receiveShadow = true
  target.add(blade)

  const guard = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.08, 0.18),
    new THREE.MeshStandardMaterial({
      color: 0xe2c572,
      metalness: 0.78,
      roughness: 0.26,
      emissive: new THREE.Color(color).multiplyScalar(0.05),
    }),
  )
  guard.position.z = -0.8
  guard.castShadow = true
  guard.receiveShadow = true
  target.add(guard)

  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 0.62, 12),
    new THREE.MeshStandardMaterial({
      color: 0x412c20,
      roughness: 0.72,
      metalness: 0.12,
    }),
  )
  handle.rotation.x = Math.PI * 0.5
  handle.position.z = -1.12
  handle.castShadow = true
  handle.receiveShadow = true
  target.add(handle)
}

function prepareSwordModel(sceneRoot: THREE.Group): THREE.Group {
  const cloned = SkeletonUtils.clone(sceneRoot) as THREE.Group
  cloned.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return
    }

    child.castShadow = true
    child.receiveShadow = true
    child.frustumCulled = false
    if (Array.isArray(child.material)) {
      child.material = child.material.map((material) => material.clone())
    } else {
      child.material = child.material.clone()
    }
  })

  cloned.updateMatrixWorld(true)
  const initialBox = new THREE.Box3().setFromObject(cloned)
  const initialSize = initialBox.getSize(new THREE.Vector3())
  if (initialSize.y >= initialSize.x && initialSize.y >= initialSize.z) {
    cloned.rotation.z = Math.PI * 0.5
  } else if (initialSize.x >= initialSize.z) {
    cloned.rotation.y = Math.PI * 0.5
  }
  cloned.rotation.x = Math.PI
  cloned.rotation.y -= Math.PI * 0.5
  cloned.rotation.y += Math.PI
  cloned.updateMatrixWorld(true)

  const box = new THREE.Box3().setFromObject(cloned)
  const size = box.getSize(new THREE.Vector3())
  const length = Math.max(size.x, size.z, 0.01)
  const scaleFactor = 3.5 / length
  cloned.scale.setScalar(scaleFactor)
  cloned.updateMatrixWorld(true)

  const scaledBox = new THREE.Box3().setFromObject(cloned)
  const center = scaledBox.getCenter(new THREE.Vector3())
  cloned.position.set(-center.x, -scaledBox.min.y, -center.z)
  cloned.updateMatrixWorld(true)
  return cloned
}

function populateFallbackObstacleVisual(target: THREE.Group, radius: number): void {
  target.clear()

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.72, radius * 0.92, Math.max(1.6, radius * 1.6), 10),
    new THREE.MeshStandardMaterial({
      color: 0x52627f,
      roughness: 0.88,
      metalness: 0.08,
      emissive: new THREE.Color(0x284066),
      emissiveIntensity: 0.14,
    }),
  )
  base.position.y = Math.max(0.8, radius * 0.8)
  base.castShadow = true
  base.receiveShadow = true
  target.add(base)

  const cap = new THREE.Mesh(
    new THREE.OctahedronGeometry(radius * 0.44, 0),
    new THREE.MeshStandardMaterial({
      color: 0xa4d8ff,
      roughness: 0.36,
      metalness: 0.22,
      emissive: new THREE.Color(0x3d6dc1),
      emissiveIntensity: 0.2,
    }),
  )
  cap.position.y = base.position.y + Math.max(0.7, radius * 0.7)
  cap.castShadow = true
  cap.receiveShadow = true
  target.add(cap)
}

function brightenObstacleMaterial(material: THREE.Material, boost = 1): void {
  const typedMaterial = material as THREE.Material & {
    color?: THREE.Color
    emissive?: THREE.Color
    emissiveIntensity?: number
    roughness?: number
    metalness?: number
    envMapIntensity?: number
  }

  if (typedMaterial.color instanceof THREE.Color) {
    typedMaterial.color.multiplyScalar(0.82 + boost * 0.04)
  }

  if (typedMaterial.emissive instanceof THREE.Color) {
    if (typedMaterial.emissive.getHex() === 0) {
      const sourceTint = typedMaterial.color instanceof THREE.Color ? typedMaterial.color.clone() : new THREE.Color(0x5577a4)
      typedMaterial.emissive.copy(sourceTint.multiplyScalar(0.014 * boost))
    } else {
      typedMaterial.emissive.multiplyScalar(0.42 + boost * 0.05)
    }
    typedMaterial.emissiveIntensity = THREE.MathUtils.clamp((typedMaterial.emissiveIntensity ?? 0.08) * 0.56, 0.04, 0.2)
  }

  if (typeof typedMaterial.roughness === 'number') {
    typedMaterial.roughness = THREE.MathUtils.clamp(typedMaterial.roughness * 1.02, 0.24, 1)
  }

  if (typeof typedMaterial.metalness === 'number') {
    typedMaterial.metalness = THREE.MathUtils.clamp(typedMaterial.metalness * 0.7, 0, 0.45)
  }

  if (typeof typedMaterial.envMapIntensity === 'number') {
    typedMaterial.envMapIntensity = THREE.MathUtils.clamp(typedMaterial.envMapIntensity * 0.72, 0.2, 0.8)
  }

  material.needsUpdate = true
}

function prepareObstacleModel(sceneRoot: THREE.Group, config: ObstacleVariantConfig, scaleJitter: number): THREE.Group {
  const cloned = sceneRoot.clone(true)
  const brightnessBoost = config.key === 'lingjing' ? 1.28 : config.key === 'shizhu' ? 1.18 : 1.1
  cloned.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return
    }

    child.castShadow = true
    child.receiveShadow = true
    child.frustumCulled = false
    child.renderOrder = 3
    if (Array.isArray(child.material)) {
      child.material = child.material.map((material) => {
        const clonedMaterial = material.clone()
        brightenObstacleMaterial(clonedMaterial, brightnessBoost)
        return clonedMaterial
      })
    } else {
      const clonedMaterial = child.material.clone()
      brightenObstacleMaterial(clonedMaterial, brightnessBoost)
      child.material = clonedMaterial
    }
  })

  cloned.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(cloned)
  if (box.isEmpty()) {
    return cloned
  }

  const size = box.getSize(new THREE.Vector3())
  const footprint = Math.max(size.x, size.z, 0.01)
  const height = Math.max(size.y, 0.01)
  const scaleFactor = Math.min(config.targetFootprint / footprint, config.targetHeight / height) * scaleJitter
  cloned.scale.setScalar(scaleFactor)
  cloned.updateMatrixWorld(true)

  const scaledBox = new THREE.Box3().setFromObject(cloned)
  const center = scaledBox.getCenter(new THREE.Vector3())
  cloned.position.set(-center.x, -scaledBox.min.y, -center.z)
  cloned.updateMatrixWorld(true)
  return cloned
}

function createArenaFireflySwarm(): THREE.Group {
  const group = new THREE.Group()

  for (let index = 0; index < ARENA_FIREFLY_COUNT; index += 1) {
    const hue = THREE.MathUtils.randFloat(0.26, 0.38)
    const lightness = THREE.MathUtils.randFloat(0.52, 0.68)
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(hue, 0.95, lightness),
      transparent: true,
      opacity: THREE.MathUtils.randFloat(0.45, 0.82),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), material)
    const baseScale = THREE.MathUtils.randFloat(0.65, 1.35)
    const basePosition = new THREE.Vector3(
      THREE.MathUtils.randFloatSpread(ARENA_HALF * 1.7),
      THREE.MathUtils.randFloat(0.8, 4.2),
      THREE.MathUtils.randFloatSpread(ARENA_HALF * 1.7),
    )

    mesh.position.copy(basePosition)
    mesh.scale.setScalar(baseScale)
    group.add(mesh)
    arenaFireflies.push({
      mesh,
      basePosition,
      baseScale,
      phase: Math.random() * Math.PI * 2,
      speed: THREE.MathUtils.randFloat(0.55, 1.15),
      sway: THREE.MathUtils.randFloat(0.3, 1.2),
      drift: THREE.MathUtils.randFloat(0.35, 1.35),
    })
  }

  return group
}

function createArenaSpiritMotes(): ArenaSpiritMotes {
  const particleCount = ARENA_SPIRIT_MOTE_COUNT
  const positions = new Float32Array(particleCount * 3)
  const basePositions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)
  const driftFactors = new Float32Array(particleCount)

  for (let index = 0; index < particleCount; index += 1) {
    const baseIndex = index * 3
    const x = THREE.MathUtils.randFloatSpread(ARENA_HALF * 1.8)
    const y = THREE.MathUtils.randFloat(0.7, 6.4)
    const z = THREE.MathUtils.randFloatSpread(ARENA_HALF * 1.8)
    const tint = new THREE.Color().setHSL(THREE.MathUtils.randFloat(0.32, 0.56), 0.75, THREE.MathUtils.randFloat(0.58, 0.72))

    positions[baseIndex] = x
    positions[baseIndex + 1] = y
    positions[baseIndex + 2] = z
    basePositions[baseIndex] = x
    basePositions[baseIndex + 1] = y
    basePositions[baseIndex + 2] = z
    colors[baseIndex] = tint.r
    colors[baseIndex + 1] = tint.g
    colors[baseIndex + 2] = tint.b
    driftFactors[index] = THREE.MathUtils.randFloat(0.5, 1.35)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size: 0.26,
    transparent: true,
    opacity: 0.32,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  })

  const points = new THREE.Points(geometry, material)
  points.renderOrder = 2
  return {
    points,
    basePositions,
    driftFactors,
    phase: Math.random() * Math.PI * 2,
  }
}

function createCentralAltarFlameEffect(): Omit<CentralAltar, 'group' | 'visualRoot' | 'radius'> {
  const flameCount = ALTAR_FLAME_COUNT
  const emberCount = ALTAR_EMBER_COUNT
  const flameSeeds = new Float32Array(flameCount)
  const emberSeeds = new Float32Array(emberCount)

  const flameGeometry = new THREE.BufferGeometry()
  const flamePositions = new Float32Array(flameCount * 3)
  const flameColors = new Float32Array(flameCount * 3)
  for (let index = 0; index < flameCount; index += 1) {
    const baseIndex = index * 3
    const seed = Math.random()
    const tint = new THREE.Color().setHSL(0.06 + seed * 0.04, 0.95, 0.56 + seed * 0.12)
    flameSeeds[index] = seed
    flameColors[baseIndex] = tint.r
    flameColors[baseIndex + 1] = tint.g
    flameColors[baseIndex + 2] = tint.b
  }
  flameGeometry.setAttribute('position', new THREE.BufferAttribute(flamePositions, 3))
  flameGeometry.setAttribute('color', new THREE.BufferAttribute(flameColors, 3))

  const flamePoints = new THREE.Points(
    flameGeometry,
    new THREE.PointsMaterial({
      size: 0.34,
      transparent: true,
      opacity: 0.82,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }),
  )
  flamePoints.renderOrder = 5

  const emberGeometry = new THREE.BufferGeometry()
  const emberPositions = new Float32Array(emberCount * 3)
  const emberColors = new Float32Array(emberCount * 3)
  for (let index = 0; index < emberCount; index += 1) {
    const baseIndex = index * 3
    const seed = Math.random()
    const tint = new THREE.Color().setHSL(0.1 + seed * 0.03, 0.8, 0.58 + seed * 0.14)
    emberSeeds[index] = seed
    emberColors[baseIndex] = tint.r
    emberColors[baseIndex + 1] = tint.g
    emberColors[baseIndex + 2] = tint.b
  }
  emberGeometry.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3))
  emberGeometry.setAttribute('color', new THREE.BufferAttribute(emberColors, 3))

  const emberPoints = new THREE.Points(
    emberGeometry,
    new THREE.PointsMaterial({
      size: 0.16,
      transparent: true,
      opacity: 0.5,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }),
  )
  emberPoints.renderOrder = 5

  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(0.92, 40),
    new THREE.MeshBasicMaterial({
      color: 0xff8b3d,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  )
  halo.rotation.x = -Math.PI / 2
  halo.position.y = 0.02
  halo.renderOrder = 4

  const light = new THREE.PointLight(0xff9a52, 2.2, 10, 2)
  light.position.set(0, 0.9, 0)

  return {
    halo,
    flamePoints,
    emberPoints,
    flameSeeds,
    emberSeeds,
    light,
  }
}

function createCentralAltar(): void {
  const group = new THREE.Group()
  const visualRoot = new THREE.Group()
  group.add(visualRoot)
  group.position.set(0, 0, 0)
  scene.add(group)

  populateFallbackObstacleVisual(visualRoot, CENTRAL_ALTAR_VARIANT.collisionRadius)
  void attachObstacleModel(visualRoot, CENTRAL_ALTAR_VARIANT, 1)

  const flameAnchor = new THREE.Group()
  flameAnchor.position.y = 0.24
  group.add(flameAnchor)

  const flameEffect = createCentralAltarFlameEffect()
  flameAnchor.add(flameEffect.halo)
  flameAnchor.add(flameEffect.flamePoints)
  flameAnchor.add(flameEffect.emberPoints)
  flameAnchor.add(flameEffect.light)

  centralAltar = {
    group,
    visualRoot,
    radius: CENTRAL_ALTAR_VARIANT.collisionRadius,
    ...flameEffect,
  }

  obstacles.push({
    mesh: group,
    radius: CENTRAL_ALTAR_VARIANT.collisionRadius,
  })
}

function updateArenaAtmospherics(delta: number): void {
  const time = clock.elapsedTime
  arenaGlowLight.intensity = 2.8 + Math.sin(time * 0.7) * 0.55
  arenaGlowLight.position.x = Math.sin(time * 0.18) * 4
  arenaGlowLight.position.z = Math.cos(time * 0.14) * 3

  if (starfield) {
    starfield.group.rotation.y += delta * 0.004
    starfield.layers.forEach((layer, index) => {
      layer.points.rotation.y += delta * (0.002 + index * 0.0015)
      ;(layer.points.material as THREE.PointsMaterial).opacity =
        layer.baseOpacity + Math.sin(time * (1.1 + layer.twinkleSpeed) + layer.twinklePhase) * 0.05
    })
  }

  arenaFireflies.forEach((firefly, index) => {
    const x = firefly.basePosition.x + Math.sin(time * firefly.speed + firefly.phase) * firefly.sway
    const z = firefly.basePosition.z + Math.cos(time * firefly.speed * 0.82 + firefly.phase + index * 0.11) * firefly.drift
    const y = firefly.basePosition.y + Math.sin(time * firefly.speed * 1.6 + firefly.phase) * 0.35
    const pulse = 0.55 + 0.45 * Math.sin(time * (2.3 + firefly.speed) + firefly.phase)
    firefly.mesh.position.set(x, y, z)
    firefly.mesh.scale.setScalar(firefly.baseScale * (0.8 + pulse * 0.45))
    ;(firefly.mesh.material as THREE.MeshBasicMaterial).opacity = 0.25 + pulse * 0.65
  })

  if (arenaSpiritMotes) {
    const positionAttr = arenaSpiritMotes.points.geometry.getAttribute('position') as THREE.BufferAttribute
    const positions = positionAttr.array as Float32Array

    for (let index = 0; index < arenaSpiritMotes.driftFactors.length; index += 1) {
      const baseIndex = index * 3
      const drift = arenaSpiritMotes.driftFactors[index]
      const offsetA = time * (0.24 + drift * 0.08) + index * 0.73 + arenaSpiritMotes.phase
      const offsetB = time * (0.46 + drift * 0.12) + index * 0.37

      positions[baseIndex] = arenaSpiritMotes.basePositions[baseIndex] + Math.sin(offsetA) * 0.48
      positions[baseIndex + 1] = arenaSpiritMotes.basePositions[baseIndex + 1] + Math.sin(offsetB) * 0.18
      positions[baseIndex + 2] = arenaSpiritMotes.basePositions[baseIndex + 2] + Math.cos(offsetA) * 0.48
    }

    positionAttr.needsUpdate = true
    arenaSpiritMotes.points.rotation.y += delta * 0.018
    ;(arenaSpiritMotes.points.material as THREE.PointsMaterial).opacity = 0.24 + (Math.sin(time * 0.5) + 1) * 0.06
  }

  if (centralAltar) {
    const flameAttr = centralAltar.flamePoints.geometry.getAttribute('position') as THREE.BufferAttribute
    const flamePositions = flameAttr.array as Float32Array
    for (let index = 0; index < centralAltar.flameSeeds.length; index += 1) {
      const baseIndex = index * 3
      const seed = centralAltar.flameSeeds[index]
      const progress = (time * (0.85 + seed * 0.95) + seed * 1.7) % 1
      const swirl = seed * Math.PI * 5 + time * (0.9 + seed * 0.45)
      const radius = (0.18 + seed * 0.42) * (1 - progress * 0.74)
      flamePositions[baseIndex] = Math.cos(swirl) * radius
      flamePositions[baseIndex + 1] = 0.01 + progress * (1.1 + seed * 0.95) + Math.sin(swirl * 1.6) * 0.04
      flamePositions[baseIndex + 2] = Math.sin(swirl) * radius
    }
    flameAttr.needsUpdate = true

    const emberAttr = centralAltar.emberPoints.geometry.getAttribute('position') as THREE.BufferAttribute
    const emberPositions = emberAttr.array as Float32Array
    for (let index = 0; index < centralAltar.emberSeeds.length; index += 1) {
      const baseIndex = index * 3
      const seed = centralAltar.emberSeeds[index]
      const progress = (time * (0.36 + seed * 0.44) + seed * 3.1) % 1
      const swirl = seed * Math.PI * 8 + time * (0.4 + seed * 0.35)
      const radius = 0.26 + seed * 0.42 + progress * 0.1
      emberPositions[baseIndex] = Math.cos(swirl) * radius
      emberPositions[baseIndex + 1] = 0.1 + progress * (1.95 + seed * 1.05)
      emberPositions[baseIndex + 2] = Math.sin(swirl * 1.08) * radius
    }
    emberAttr.needsUpdate = true

    centralAltar.halo.scale.setScalar(0.92 + Math.sin(time * 2.2) * 0.08)
    ;(centralAltar.halo.material as THREE.MeshBasicMaterial).opacity = 0.2 + (Math.sin(time * 2.2) + 1) * 0.06
    centralAltar.light.intensity = 2 + (Math.sin(time * 3.4) + 1) * 0.45
  }
}

function createBaguaSpawnPositions(radius = BAGUA_SPAWN_RADIUS): THREE.Vector3[] {
  const positions: THREE.Vector3[] = []
  for (let index = 0; index < 8; index += 1) {
    const angle = index * (Math.PI / 4)
    positions.push(new THREE.Vector3(Math.sin(angle) * radius, 0, Math.cos(angle) * radius))
  }
  return positions
}

function isNearBaguaSpawnSlot(position: THREE.Vector3, clearance: number): boolean {
  const limitSquared = clearance * clearance
  return baguaSpawnPositions.some((slot) => slot.distanceToSquared(position) < limitSquared)
}

function setCultivatorManifested(cultivator: Cultivator, visible: boolean): void {
  cultivator.visualRoot.visible = visible
  cultivator.bladeAnchor.visible = visible
  cultivator.hpBarGroup.visible = visible
}

function placeCultivatorAtBaguaSlot(cultivator: Cultivator, slotIndex: number): void {
  const slot = baguaSpawnPositions[slotIndex % baguaSpawnPositions.length]
  cultivator.group.position.copy(slot)
  cultivator.velocity.set(0, 0, 0)
  tempVectorA.copy(slot).multiplyScalar(-1).setY(0)
  if (tempVectorA.lengthSq() < 0.0001) {
    tempVectorA.set(0, 0, -1)
  } else {
    tempVectorA.normalize()
  }
  cultivator.moveDir.copy(tempVectorA)
  cultivator.group.rotation.y = Math.atan2(cultivator.moveDir.x, cultivator.moveDir.z)
}

function beginOpeningPillarIntro(): void {
  introActive = true

  for (const pillar of openingPillars) {
    scene.remove(pillar.group)
  }
  openingPillars.length = 0

  cultivators.forEach((cultivator, index) => {
    placeCultivatorAtBaguaSlot(cultivator, index)
    setCultivatorManifested(cultivator, false)

    const pillarColor = createRandomOpeningPillarColor(index)
    const group = new THREE.Group()
    group.position.copy(cultivator.group.position)

    const beamMaterial = new THREE.MeshBasicMaterial({
      color: pillarColor,
      transparent: true,
      opacity: 0.46,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.7, 18, 16, 1, true), beamMaterial)
    beam.position.y = 9
    group.add(beam)

    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.56, 18, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: pillarColor.clone().lerp(new THREE.Color(0xffffff), 0.28),
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    core.position.y = 9
    group.add(core)

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.6, 2.35, 48),
      new THREE.MeshBasicMaterial({
        color: pillarColor,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.08
    group.add(ring)

    const glow = new THREE.PointLight(pillarColor, cultivator.kind === 'player' ? 3.2 : 2.2, 18, 2)
    glow.position.y = 3.6
    group.add(glow)
    scene.add(group)

    openingPillars.push({
      cultivator,
      group,
      beam,
      core,
      ring,
      glow,
      color: pillarColor,
      elapsed: -index * 0.03,
      revealDone: false,
    })
  })

  audioManager.playOpeningPillarSequence(openingPillars.length)
}

function updateOpeningPillarIntro(delta: number): void {
  if (!introActive) {
    return
  }

  let finishedCount = 0
  for (let index = openingPillars.length - 1; index >= 0; index -= 1) {
    const pillar = openingPillars[index]
    pillar.elapsed += delta

    if (pillar.elapsed <= 0) {
      continue
    }

    const progress = THREE.MathUtils.clamp(pillar.elapsed / OPENING_PILLAR_DURATION, 0, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    const beamHeight = THREE.MathUtils.lerp(18, 1.2, eased)
    const beamWidth = THREE.MathUtils.lerp(1.28, 0.18, eased)
    pillar.group.position.copy(pillar.cultivator.group.position)
    pillar.beam.scale.set(beamWidth, beamHeight / 18, beamWidth)
    pillar.beam.position.y = beamHeight * 0.5
    pillar.core.scale.set(beamWidth * 0.48, beamHeight / 18, beamWidth * 0.48)
    pillar.core.position.y = beamHeight * 0.5
    pillar.ring.scale.setScalar(1 + (1 - eased) * 0.55)
    pillar.ring.rotation.z += delta * (1.4 + index * 0.08)
    ;(pillar.beam.material as THREE.MeshBasicMaterial).opacity = 0.54 - eased * 0.38
    ;(pillar.core.material as THREE.MeshBasicMaterial).opacity = 0.82 - eased * 0.5
    ;(pillar.ring.material as THREE.MeshBasicMaterial).opacity = 0.76 - eased * 0.46
    pillar.glow.intensity = (pillar.cultivator.kind === 'player' ? 3.4 : 2.4) * (1 - eased * 0.58)

    if (!pillar.revealDone && progress >= 0.62) {
      setCultivatorManifested(pillar.cultivator, true)
      createSparks(pillar.cultivator.group.position.clone().setY(1.2), 16, pillar.color.clone())
      pillar.revealDone = true
    }

    if (progress >= 1) {
      scene.remove(pillar.group)
      openingPillars.splice(index, 1)
      finishedCount += 1
    }
  }

  if (openingPillars.length === 0 || finishedCount > 0 && openingPillars.every((pillar) => pillar.elapsed >= OPENING_PILLAR_DURATION)) {
    introActive = false
  }
}

async function loadObstacleModelAsset(config: ObstacleVariantConfig): Promise<THREE.Group> {
  const cached = obstacleModelAssetCache.get(config.key)
  if (cached) {
    return cached
  }

  const promise = gltfLoader.loadAsync(config.url).then((loadedScene) => loadedScene.scene)
  obstacleModelAssetCache.set(config.key, promise)
  return promise
}

async function attachObstacleModel(target: THREE.Group, config: ObstacleVariantConfig, scaleJitter: number): Promise<void> {
  try {
    const loadedScene = await loadObstacleModelAsset(config)
    if (!target.parent) {
      return
    }

    const preparedObstacle = prepareObstacleModel(loadedScene, config, scaleJitter)
    target.clear()
    target.add(preparedObstacle)
  } catch (error) {
    console.warn(`障碍物模型加载失败: ${config.key}`, error)
    populateFallbackObstacleVisual(target, config.collisionRadius * scaleJitter)
  }
}

async function loadSwordModelAsset(): Promise<THREE.Group> {
  if (!swordModelAssetPromise) {
    swordModelAssetPromise = fbxLoader.loadAsync(SWORD_MODEL_URL)
  }
  return swordModelAssetPromise
}

async function attachSwordModelToMount(target: THREE.Group, color: THREE.ColorRepresentation): Promise<void> {
  try {
    const loadedScene = await loadSwordModelAsset()
    if (!target.parent) {
      return
    }

    const preparedSword = prepareSwordModel(loadedScene)
    target.clear()
    target.add(preparedSword)
    updateCloudMountMetrics(target.parent as THREE.Group, target)
  } catch (error) {
    console.warn('飞剑模型加载失败，继续使用程序飞剑', error)
    target.clear()
    populateFallbackSwordCore(target, color)
    updateCloudMountMetrics(target.parent as THREE.Group, target)
  }
}

function createCloudMount(kind: CultivatorKind, color: THREE.ColorRepresentation): { group: THREE.Group; trails: THREE.Group[] } {
  const cloudGroup = new THREE.Group()
  const cloudCore = new THREE.Group()
  const trails: THREE.Group[] = []

  if (kind === 'player') {
    cloudGroup.userData.mountType = 'sword'
    populateFallbackSwordCore(cloudCore, color)
    void attachSwordModelToMount(cloudCore, color)
  } else {
    cloudGroup.userData.mountType = 'cloud'
    populateFallbackCloudCore(cloudCore, color)
    void attachCloudModelToMount(cloudCore, color)
  }
  cloudGroup.add(cloudCore)
  trails.forEach((trail) => cloudGroup.add(trail))
  updateCloudMountMetrics(cloudGroup, cloudCore)
  return { group: cloudGroup, trails }
}

async function loadFbxAsset(key: string, url: string): Promise<ModelAsset> {
  const cached = modelAssetCache.get(key)
  if (cached) {
    return cached
  }

  const promise = fbxLoader.loadAsync(url).then((loadedScene) => ({
    scene: loadedScene,
    animations: loadedScene.animations,
  }))
  modelAssetCache.set(key, promise)
  return promise
}

function prepareClonedModel(sceneRoot: THREE.Group, profile: CharacterProfile): PreparedModel {
  const cloned = SkeletonUtils.clone(sceneRoot) as THREE.Group
  cloned.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true
      child.receiveShadow = true
      child.frustumCulled = false
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => {
          material.transparent = material.transparent ?? false
        })
      }
    }
  })

  cloned.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(cloned)
  const size = box.getSize(new THREE.Vector3())
  const height = Math.max(size.y, 0.01)
  const scaleFactor = profile.targetHeight / height
  cloned.scale.setScalar(scaleFactor)
  cloned.rotation.y = profile.modelRotationY
  cloned.updateMatrixWorld(true)

  const scaledBox = new THREE.Box3().setFromObject(cloned)
  const center = scaledBox.getCenter(new THREE.Vector3())
  const scaledHeight = Math.max(scaledBox.max.y - scaledBox.min.y, 0.01)
  cloned.position.set(-center.x, -scaledBox.min.y, -center.z)
  cloned.updateMatrixWorld(true)
  return {
    root: cloned,
    height: scaledHeight,
    waistHeight: scaledHeight * 0.66,
  }
}

function findCultivatorMotionBone(root: THREE.Object3D): THREE.Bone | null {
  let fallbackBone: THREE.Bone | null = null
  root.traverse((child) => {
    if (!(child instanceof THREE.Bone)) {
      return
    }

    if (!fallbackBone) {
      fallbackBone = child
    }

    const parent = child.parent
    if (!(parent instanceof THREE.Bone)) {
      fallbackBone = child
    }
  })
  return fallbackBone
}

function stabilizeCultivatorModel(cultivator: Cultivator): void {
  if (cultivator.modelRoot) {
    cultivator.modelRoot.position.x = cultivator.modelBasePosition.x
    cultivator.modelRoot.position.z = cultivator.modelBasePosition.z
  }

  if (cultivator.motionBone && cultivator.motionBoneBasePosition) {
    cultivator.motionBone.position.x = cultivator.motionBoneBasePosition.x
    cultivator.motionBone.position.z = cultivator.motionBoneBasePosition.z
    cultivator.motionBone.updateMatrixWorld(true)
  }
}

async function attachCultivatorModel(cultivator: Cultivator, profile: CharacterProfile): Promise<void> {
  try {
    const asset = await loadFbxAsset(profile.key, profile.modelUrl)
    const preparedModel = prepareClonedModel(asset.scene, profile)
    const moveClip = asset.animations[0] ?? null
    let idleClip = moveClip

    if (profile.idleAnimationUrl) {
      try {
        const idleAsset = await loadFbxAsset(`${profile.key}-idle`, profile.idleAnimationUrl)
        if (idleAsset.animations.length > 0) {
          idleClip = idleAsset.animations[0]
        }
      } catch (animationError) {
        console.warn(`角色待机动画加载失败: ${profile.name}`, animationError)
      }
    }

    cultivator.modelPivot.clear()
    cultivator.modelPivot.add(preparedModel.root)
    cultivator.modelRoot = preparedModel.root
    cultivator.modelBasePosition.copy(preparedModel.root.position)
    cultivator.motionBone = findCultivatorMotionBone(preparedModel.root)
    cultivator.motionBoneBasePosition = cultivator.motionBone ? cultivator.motionBone.position.clone() : null
    cultivator.modelMixer = moveClip || idleClip ? new THREE.AnimationMixer(preparedModel.root) : null
    cultivator.modelMixer?.stopAllAction()
    cultivator.idleAction = idleClip ? cultivator.modelMixer?.clipAction(idleClip) ?? null : null
    cultivator.moveAction = moveClip ? cultivator.modelMixer?.clipAction(moveClip) ?? null : null
    cultivator.animationState = 'idle'
    cultivator.cloudBaseOffset = 0.26
    cultivator.bladeAnchorHeight = preparedModel.waistHeight + preparedModel.height * 0.22
    cultivator.bladeAnchorRatio = THREE.MathUtils.clamp(preparedModel.waistHeight / preparedModel.height, 0.56, 0.66)

    if (cultivator.idleAction) {
      cultivator.idleAction.reset()
      cultivator.idleAction.enabled = true
      cultivator.idleAction.setEffectiveWeight(1)
      cultivator.idleAction.play()
    }
    if (cultivator.moveAction && cultivator.moveAction !== cultivator.idleAction) {
      cultivator.moveAction.enabled = true
      cultivator.moveAction.setEffectiveWeight(0)
      cultivator.moveAction.play()
    }

    cultivator.body.visible = false
    cultivator.head.visible = false
  } catch (error) {
    console.warn(`角色模型加载失败: ${profile.name}`, error)
  }
}

function createCultivator(kind: CultivatorKind, position: THREE.Vector3, profile: CharacterProfile): Cultivator {
  const group = new THREE.Group()
  group.position.copy(position)
  const baseSpeed = kind === 'player' ? 11.5 : 8.2 + Math.random() * 1.6
  const baseBladeSpinSpeed = kind === 'player' ? 2.15 : 1.75 + Math.random() * 0.35
  const visualRoot = new THREE.Group()
  group.add(visualRoot)

  const aura = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 1.2, 0.12, 18),
    new THREE.MeshBasicMaterial({
      color: kind === 'player' ? 0x73d4ff : profile.color,
      transparent: true,
      opacity: 0.08,
    }),
  )
  aura.position.y = 0.06
  visualRoot.add(aura)

  const cloudMount = createCloudMount(kind, profile.color)
  const cloudGroup = cloudMount.group
  cloudGroup.position.y = 0.04
  visualRoot.add(cloudGroup)

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.55, 1.3, 6, 12),
    new THREE.MeshStandardMaterial({
      color: profile.color,
      roughness: 0.45,
      metalness: 0.12,
      emissive: new THREE.Color(profile.color).multiplyScalar(kind === 'player' ? 0.06 : 0.04),
    }),
  )
  body.position.y = 1.35
  body.castShadow = true
  visualRoot.add(body)

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 20, 18),
    new THREE.MeshStandardMaterial({
      color: 0xf4dfcb,
      roughness: 0.85,
      emissive: 0x261712,
      emissiveIntensity: 0.18,
    }),
  )
  head.position.set(0, 2.45, 0)
  head.castShadow = true
  visualRoot.add(head)

  const crownHalo = new THREE.Group()
  const crownHaloGlow = createHaloGlowSprite()
  crownHaloGlow.scale.set(4.5, 4.5, 1)
  crownHaloGlow.renderOrder = 25
  crownHalo.add(crownHaloGlow)

  const crownHaloRing = new THREE.Mesh(
    new THREE.RingGeometry(0.84, 1.2, 96),
    new THREE.MeshBasicMaterial({
      color: 0xf1cf78,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    }),
  )
  crownHaloRing.renderOrder = 26
  crownHalo.add(crownHaloRing)
  crownHalo.userData.ring = crownHaloRing
  crownHalo.userData.glow = crownHaloGlow
  crownHalo.position.set(0, 3.72, -0.5)
  visualRoot.add(crownHalo)

  const modelPivot = new THREE.Group()
  visualRoot.add(modelPivot)

  const bladeAnchor = new THREE.Group()
  bladeAnchor.position.y = 1.5
  visualRoot.add(bladeAnchor)

  const bladeTrailGeometry = new THREE.BufferGeometry()
  bladeTrailGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(18 * 3), 3))
  const bladeTrail = new THREE.Points(
    bladeTrailGeometry,
    new THREE.PointsMaterial({
      color: kind === 'player' ? 0xbfe8ff : new THREE.Color(profile.color).lerp(new THREE.Color(0xffffff), 0.25),
      size: 0.14,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    }),
  )
  bladeAnchor.add(bladeTrail)

  const hpBarGroup = new THREE.Group()
  hpBarGroup.position.set(0, 3.8, 0)
  group.add(hpBarGroup)

  const hpBarBg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 0.15),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5, depthTest: false })
  )
  hpBarBg.renderOrder = 998
  hpBarGroup.add(hpBarBg)

  const hpBar = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 0.15),
    new THREE.MeshBasicMaterial({ color: kind === 'player' ? 0x00ff00 : 0xff3333, depthTest: false })
  )
  hpBar.renderOrder = 999
  hpBar.position.z = 0.01
  hpBarGroup.add(hpBar)

  const name = profile.name

  const cultivator: Cultivator = {
    id: `${kind}-${Math.random().toString(16).slice(2, 8)}`,
    kind,
    profileKey: profile.key,
    name,
    maxHp: 100,
    hp: 100,
    hpBarGroup,
    hpBar,
    nameSprite: null,
    powerValueSprite: null,
    powerDot: null,
    powerLabelText: '',
    group,
    visualRoot,
    modelPivot,
    cloudGroup,
    cloudTrails: cloudMount.trails,
    body,
    head,
    aura,
    crownHalo,
    bladeAnchor,
    bladeTrail,
    modelRoot: null,
    modelBasePosition: new THREE.Vector3(),
    motionBone: null,
    motionBoneBasePosition: null,
    modelMixer: null,
    idleAction: null,
    moveAction: null,
    animationState: 'idle',
    blades: [],
    velocity: new THREE.Vector3(),
    moveDir: new THREE.Vector3(0, 0, 1),
    wanderTarget: randomArenaPosition(6),
    baseSpeed,
    speed: baseSpeed,
    radius: 1.1,
    score: kind === 'player' ? 0 : 4,
    bladeCount: 2,
    bladeScale: 1,
    bladeOrbitRadius: 1.5,
    baseBladeSpinSpeed,
    bladeSpinSpeed: baseBladeSpinSpeed,
    bladeSpinDirection: kind === 'player' ? -1 : 1,
    hue: kind === 'player' ? 0.56 : Math.random(),
    strength: 1,
    alive: true,
    clashCooldown: 0,
    bodyHitCooldown: 0,
    damageGraceCooldown: 0,
    lastStandCooldown: 0,
    collectCooldown: 0,
    clashWobble: 0,
    kills: 0,
    speedBuffDuration: 0,
    skills: [],
    skillCounts: createEmptySkillCounts(),
    selectedSkillIndex: 0,
    skillCooldown: 0,
    stunDuration: 0,
    dashTimer: 0,
    dashDirection: new THREE.Vector3(0, 0, -1),
    dashImpactReady: false,
    dashHitTargets: new Set<string>(),
    teleportCooldown: 0,
    hoverPhase: Math.random() * Math.PI * 2,
    hoverHeight: profile.hoverHeight,
    cloudBaseOffset: 0.3,
    bladeAnchorHeight: 2.2,
    bladeAnchorRatio: 0.6,
  }

  setCultivatorDisplayName(cultivator, name)
  syncCultivatorStats(cultivator)
  void attachCultivatorModel(cultivator, profile)
  return cultivator
}

function createCritter(position: THREE.Vector3): Critter {
  const profile = CRITTER_PROFILES[Math.floor(Math.random() * CRITTER_PROFILES.length)]
  const group = new THREE.Group()
  const placeholder = new THREE.Group()
  const mistGroup = new THREE.Group()
  const mistPuffs: THREE.Mesh[] = []
  group.position.copy(position)

  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 14, 12),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(Math.random(), 0.45, 0.42),
      roughness: 0.72,
      emissive: 0x060606,
      emissiveIntensity: 0.6,
    }),
  )
  body.castShadow = true
  placeholder.add(body)

  const eyeGeometry = new THREE.SphereGeometry(0.06, 8, 8)
  for (const offset of [-0.12, 0.12]) {
    const eye = new THREE.Mesh(
      eyeGeometry,
      new THREE.MeshBasicMaterial({ color: 0xff7c7c }),
    )
    eye.position.set(offset, 0.05, 0.35)
    placeholder.add(eye)
  }
  group.add(placeholder)

  const mistGeometry = new THREE.SphereGeometry(0.22, 12, 10)
  const mistOffsets = [
    new THREE.Vector3(0, 0.02, 0),
    new THREE.Vector3(-0.2, -0.01, 0.08),
    new THREE.Vector3(0.22, 0, -0.04),
    new THREE.Vector3(0.04, 0.04, -0.18),
  ]
  for (const [index, offset] of mistOffsets.entries()) {
    const puff = new THREE.Mesh(
      mistGeometry,
      new THREE.MeshBasicMaterial({
        color: profile.key === 'cat' ? 0xdff6ff : 0xf2f7ff,
        transparent: true,
        opacity: index === 0 ? 0.18 : 0.13,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    puff.position.copy(offset)
    puff.scale.set(1 + index * 0.16, 0.48 + index * 0.06, 1 + index * 0.14)
    mistGroup.add(puff)
    mistPuffs.push(puff)
  }
  mistGroup.position.y = -0.18
  group.add(mistGroup)

  return {
    group,
    velocity: new THREE.Vector3(),
    wanderTarget: randomArenaPosition(2),
    radius: profile.radius,
    alive: true,
    profile,
    modelRoot: null,
    modelMixer: null,
    fallbackVisual: placeholder,
    mistGroup,
    mistPuffs,
    hoverPhase: Math.random() * Math.PI * 2,
    baseHeight: profile.key === 'cat' ? 0.42 : 0.46,
  }
}

function prepareCritterModel(sceneRoot: THREE.Group, profile: CritterProfile): THREE.Group {
  const cloned = SkeletonUtils.clone(sceneRoot) as THREE.Group
  cloned.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true
      child.receiveShadow = true
      child.frustumCulled = false
    }
  })

  cloned.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(cloned)
  const size = box.getSize(new THREE.Vector3())
  const height = Math.max(size.y, 0.01)
  const scaleFactor = profile.targetHeight / height
  cloned.scale.setScalar(scaleFactor)
  cloned.rotation.y = profile.modelRotationY
  cloned.updateMatrixWorld(true)

  const scaledBox = new THREE.Box3().setFromObject(cloned)
  const center = scaledBox.getCenter(new THREE.Vector3())
  cloned.position.set(-center.x, -scaledBox.min.y, -center.z)
  cloned.updateMatrixWorld(true)
  return cloned
}

async function attachCritterModel(critter: Critter): Promise<void> {
  try {
    const asset = await loadFbxAsset(`critter-${critter.profile.key}`, critter.profile.modelUrl)
    if (!critter.group.parent) {
      return
    }

    const preparedModel = prepareCritterModel(asset.scene, critter.profile)
    critter.group.add(preparedModel)
    critter.modelRoot = preparedModel
    critter.modelMixer = asset.animations.length > 0 ? new THREE.AnimationMixer(preparedModel) : null
    critter.modelMixer?.stopAllAction()
    critter.baseHeight = critter.profile.key === 'cat' ? 0.42 : 0.46

    for (const clip of asset.animations) {
      const action = critter.modelMixer?.clipAction(clip)
      if (action) {
        action.reset()
        action.play()
      }
    }

    if (critter.fallbackVisual) {
      critter.fallbackVisual.visible = false
    }
  } catch (error) {
    console.warn(`小怪模型加载失败: ${critter.profile.name}`, error)
  }
}

function isFemaleEnemyCultivator(cultivator: Cultivator): boolean {
  return cultivator.kind === 'enemy' && (cultivator.profileKey === 'jiutianxuanv' || cultivator.profileKey === 'yaochishengmu')
}

function isMaleEnemyCultivator(cultivator: Cultivator): boolean {
  return cultivator.kind === 'enemy' && !isFemaleEnemyCultivator(cultivator)
}

function setCultivatorAnimationState(cultivator: Cultivator, nextState: 'idle' | 'move'): void {
  if (!cultivator.modelMixer || cultivator.animationState === nextState) {
    return
  }

  const fromAction = nextState === 'move' ? cultivator.idleAction : cultivator.moveAction
  const toAction = nextState === 'move' ? cultivator.moveAction : cultivator.idleAction
  if (!toAction) {
    return
  }

  toAction.enabled = true
  toAction.reset()
  toAction.setEffectiveTimeScale(1)
  toAction.setEffectiveWeight(1)
  toAction.play()

  if (fromAction && fromAction !== toAction) {
    fromAction.crossFadeTo(toAction, 0.18, true)
  }

  cultivator.animationState = nextState
}

function createOrb(position: THREE.Vector3, forcedType?: OrbType, forcedAmount?: number): OrbPickup {
  const type = forcedType ?? chooseOrbTypeForSpawn()
  const amount =
    forcedAmount ??
    (type === 'blade'
      ? 1
      : type === 'speed'
          ? THREE.MathUtils.randInt(1, 2)
          : 1) // 技能水晶默认数量为1
  const orbStyle = getOrbStyle(type)
  const group = new THREE.Group()
  group.position.copy(position)
  group.position.y = 0.8

  // 根据属性区分外壳形状：法器为球体，移速为八面体，闪电为四面体，冲刺为箭簇体，气墙为立方体
  let shellGeo: THREE.BufferGeometry
  if (type === 'speed') {
    shellGeo = new THREE.OctahedronGeometry(0.6, 0)
  } else if (type === 'lightning') {
    shellGeo = new THREE.TetrahedronGeometry(0.6, 0)
  } else if (type === 'dash') {
    shellGeo = new THREE.CylinderGeometry(0.24, 0.58, 1.12, 8)
  } else if (type === 'wall') {
    shellGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8)
  } else if (type === 'heal') {
    shellGeo = new THREE.SphereGeometry(0.62, 22, 22)
  } else {
    shellGeo = new THREE.SphereGeometry(0.6, 22, 22)
  }

  const shell = new THREE.Mesh(
    shellGeo,
    new THREE.MeshPhysicalMaterial({
      color: orbStyle.shell,
      roughness: 0.08,
      metalness: 0.02,
      transmission: 0.88,
      thickness: 0.7,
      transparent: true,
      opacity: 0.8,
      emissive: orbStyle.shell,
      emissiveIntensity: 0.05,
    }),
  )
  shell.castShadow = true
  group.add(shell)

  const core = new THREE.Mesh(
    crystalCoreGeometry,
    new THREE.MeshStandardMaterial({
      color: orbStyle.core,
      emissive: orbStyle.core,
      emissiveIntensity: 0.12,
      roughness: 0.26,
      metalness: 0.65,
    }),
  )
  core.scale.setScalar(0.3)
  group.add(core)

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(type === 'blade' ? 0.75 : 0.65, 0.03, 12, 60),
    new THREE.MeshBasicMaterial({
      color: orbStyle.core,
      transparent: true,
      opacity: 0.46,
    }),
  )
  ring.rotation.x = Math.PI / 2
  group.add(ring)

  const symbol = createOrbSymbol(type, orbStyle)
  symbol.position.set(0, type === 'blade' ? -0.12 : 0, 0)
  group.add(symbol)

  const label = createTextSprite(`${orbStyle.prefix}${amount}`, orbStyle.label)
  label.position.set(0, 0.85, 0)
  label.scale.set(0.75, 0.75, 0.75)
  group.add(label)

  return {
    group,
    shell,
    core,
    ring,
    symbol,
    label,
    type,
    amount,
    radius: 0.75,
    spinOffset: Math.random() * Math.PI * 2,
  }
}

function pickOrbSpitter(): Critter | undefined {
  const candidates = critters.filter((critter) => critter.alive)
  if (candidates.length === 0) {
    return critters.length > 0 ? critters[Math.floor(Math.random() * critters.length)] : undefined
  }
  return candidates[Math.floor(Math.random() * candidates.length)]
}

function getCritterSpitPosition(critter: Critter): THREE.Vector3 {
  const hasVelocity = critter.velocity.lengthSq() > 0.01
  if (hasVelocity) {
    tempVectorD.copy(critter.velocity).setY(0).normalize()
  } else {
    tempVectorD.set(Math.sin(critter.hoverPhase), 0, Math.cos(critter.hoverPhase)).normalize()
  }

  const spitPosition = critter.group.position.clone().addScaledVector(tempVectorD, critter.radius + 0.75)
  spitPosition.y = 0
  spitPosition.x = THREE.MathUtils.clamp(spitPosition.x, -ARENA_HALF + 1.2, ARENA_HALF - 1.2)
  spitPosition.z = THREE.MathUtils.clamp(spitPosition.z, -ARENA_HALF + 1.2, ARENA_HALF - 1.2)
  if (isNearTeleporter(spitPosition, ORB_TELEPORTER_CLEARANCE)) {
    return randomArenaPosition(4, true)
  }
  return spitPosition
}

function spawnOrbFromCritter(forcedType?: OrbType, forcedAmount?: number, playSound = true): OrbPickup {
  const spitter = pickOrbSpitter()
  const orbPosition = spitter ? getCritterSpitPosition(spitter) : randomArenaPosition(4, true)
  const orb = createOrb(orbPosition, forcedType, forcedAmount)
  orbs.push(orb)
  scene.add(orb.group)

  if (spitter && playSound && orb.type === 'blade' && Math.random() < 0.3) {
    createSparks(orb.group.position.clone().setY(0.72), 4, new THREE.Color('#dff6ff'))
    audioManager.playLittleMonsterSound(true)
  }

  return orb
}

function isSkillOrb(type: OrbType): boolean {
  return type === 'lightning' || type === 'dash' || type === 'wall'
}

function countSkillOrbs(): number {
  let total = 0
  for (const orb of orbs) {
    if (isSkillOrb(orb.type)) {
      total += 1
    }
  }
  return total
}

function chooseOrbTypeForSpawn(): OrbType {
  const canSpawnSkillOrb = skillOrbRespawnTimer <= 0 && countSkillOrbs() < MAX_SKILL_ORBS_ON_FIELD
  const roll = Math.random()

  if (canSpawnSkillOrb && roll > 0.38) {
    const skillTypes: ActiveSkill[] = ['lightning', 'lightning', 'lightning', 'dash', 'dash', 'dash', 'wall', 'wall', 'wall']
    const picked = skillTypes[Math.floor(Math.random() * skillTypes.length)]
    skillOrbRespawnTimer = SKILL_ORB_RESPAWN_INTERVAL
    return picked
  }

  if (roll < 0.055) return 'heal'
  if (roll < 0.44) return 'blade'
  if (roll < 0.985) return 'speed'
  return 'blade'
}

function getOrbStyle(type: OrbType): { shell: THREE.Color; core: THREE.Color; label: string; prefix: string } {
  if (type === 'speed') {
    return {
      shell: new THREE.Color('#22cc44'), // 明亮的绿色
      core: new THREE.Color('#88ffaa'),
      label: '#d0ffe0',
      prefix: '速',
    }
  }
  
  if (type === 'lightning') {
    return {
      shell: new THREE.Color('#9922ff'), // 紫色闪电
      core: new THREE.Color('#cc88ff'),
      label: '#eeddff',
      prefix: '雷',
    }
  }

  if (type === 'dash') {
    return {
      shell: new THREE.Color('#ff3b30'),
      core: new THREE.Color('#ff9b95'),
      label: '#ffe1df',
      prefix: '冲',
    }
  }

  if (type === 'wall') {
    return {
      shell: new THREE.Color('#eeaa22'), // 土黄色气墙
      core: new THREE.Color('#ffcc88'),
      label: '#ffeedd',
      prefix: '墙',
    }
  }

  if (type === 'heal') {
    return {
      shell: new THREE.Color('#ff73c7'),
      core: new THREE.Color('#ffc2e8'),
      label: '#ffe6f6',
      prefix: '愈',
    }
  }

  return {
    shell: new THREE.Color('#2288ff'), // 清晰的蓝色
    core: new THREE.Color('#88ccff'),
    label: '#d0f0ff',
    prefix: '器',
  }
}

function createOrbSymbol(
  type: OrbType,
  orbStyle: { shell: THREE.Color; core: THREE.Color; label: string; prefix: string },
): THREE.Object3D {
  if (type === 'blade') {
    const symbol = new THREE.Mesh(
      crescentGeometry,
      new THREE.MeshStandardMaterial({
        color: orbStyle.core,
        emissive: orbStyle.core,
        emissiveIntensity: 0.08,
        roughness: 0.28,
        metalness: 0.72,
      }),
    )
    symbol.scale.setScalar(0.28)
    symbol.rotation.z = Math.PI / 2
    return symbol
  }

  if (type === 'wall') {
    const group = new THREE.Group()
    const material = new THREE.MeshStandardMaterial({
      color: orbStyle.core,
      emissive: orbStyle.core,
      emissiveIntensity: 0.08,
      roughness: 0.3,
      metalness: 0.65,
    })
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.1), material)
    group.add(block)
    return group
  }

  if (type === 'heal') {
    const heartShape = new THREE.Shape()
    heartShape.moveTo(0, -0.18)
    heartShape.bezierCurveTo(-0.34, -0.48, -0.62, -0.14, -0.62, 0.16)
    heartShape.bezierCurveTo(-0.62, 0.44, -0.34, 0.6, 0, 0.82)
    heartShape.bezierCurveTo(0.34, 0.6, 0.62, 0.44, 0.62, 0.16)
    heartShape.bezierCurveTo(0.62, -0.14, 0.34, -0.48, 0, -0.18)

    const heart = new THREE.Mesh(
      new THREE.ShapeGeometry(heartShape, 24),
      new THREE.MeshStandardMaterial({
        color: orbStyle.core,
        emissive: orbStyle.core,
        emissiveIntensity: 0.12,
        roughness: 0.24,
        metalness: 0.38,
        side: THREE.DoubleSide,
      }),
    )
    heart.scale.setScalar(0.34)
    return heart
  }

  const group = new THREE.Group()
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.42, 12),
    new THREE.MeshStandardMaterial({
      color: orbStyle.core,
      emissive: orbStyle.core,
      emissiveIntensity: 0.08,
      roughness: 0.28,
      metalness: 0.68,
    }),
  )
  shaft.rotation.z = Math.PI / 2
  group.add(shaft)

  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.11, 0.22, 12),
    new THREE.MeshStandardMaterial({
      color: orbStyle.core,
      emissive: orbStyle.core,
      emissiveIntensity: 0.08,
      roughness: 0.28,
      metalness: 0.68,
    }),
  )
  tip.rotation.z = -Math.PI / 2
  tip.position.x = 0.27
  group.add(tip)
  return group
}

function createNameSprite(text: string, textColor = '#f8fdff'): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 64
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('无法创建名称贴图')
  }

  context.clearRect(0, 0, 256, 64)
  context.fillStyle = textColor
  context.font = 'bold 36px "Microsoft YaHei", sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.shadowColor = 'rgba(0,0,0,0.8)'
  context.shadowBlur = 4
  context.shadowOffsetX = 1
  context.shadowOffsetY = 1
  context.fillText(text, 128, 32)

  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.LinearFilter
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    }),
  )
  sprite.scale.set(3, 0.75, 1)
  sprite.renderOrder = 1000
  return sprite
}

function disposeNameSprite(sprite: THREE.Sprite | null): void {
  if (!sprite) {
    return
  }
  const material = sprite.material as THREE.SpriteMaterial
  material.map?.dispose()
  material.dispose()
}

function getEnemyNameHalfWidth(name: string): number {
  return THREE.MathUtils.clamp(name.length * 0.18 + 0.26, 0.55, 1.08)
}

function syncEnemyNameplateLayout(cultivator: Cultivator): void {
  if (cultivator.kind !== 'enemy' || !cultivator.nameSprite) {
    return
  }

  const nameHalfWidth = getEnemyNameHalfWidth(cultivator.name)
  cultivator.nameSprite.position.set(0, 0.35, 0)
  cultivator.nameSprite.userData.nameHalfWidth = nameHalfWidth

  if (cultivator.powerDot) {
    cultivator.powerDot.position.set(nameHalfWidth + 0.18, 0.36, 0.03)
  }

  if (cultivator.powerValueSprite) {
    cultivator.powerValueSprite.position.set(nameHalfWidth + 0.42, 0.35, 0)
  }
}

function setCultivatorDisplayName(cultivator: Cultivator, name: string): void {
  const trimmedName = name.trim() || (cultivator.kind === 'player' ? '道友' : cultivator.name)
  cultivator.name = trimmedName

  if (cultivator.nameSprite) {
    cultivator.hpBarGroup.remove(cultivator.nameSprite)
    disposeNameSprite(cultivator.nameSprite)
  }

  const nameColor = cultivator.kind === 'player' ? '#9fe8ff' : '#ffb020'
  const nameSprite = createNameSprite(trimmedName, nameColor)
  nameSprite.position.set(0, 0.35, 0)
  cultivator.hpBarGroup.add(nameSprite)
  cultivator.nameSprite = nameSprite

  syncEnemyNameplateLayout(cultivator)
}

function createEnemyPowerValueSprite(text: string, textColor = '#ffffff'): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 128
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('无法创建灵力值贴图')
  }

  context.clearRect(0, 0, 256, 128)
  context.fillStyle = textColor
  context.font = text.length >= 3 ? 'bold 56px "Segoe UI", sans-serif' : 'bold 64px "Segoe UI", sans-serif'
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  context.shadowColor = 'rgba(0,0,0,0.82)'
  context.shadowBlur = 8
  context.shadowOffsetX = 2
  context.shadowOffsetY = 2
  context.fillText(text, 16, 66)

  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.LinearFilter
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    }),
  )
  sprite.center.set(0, 0.5)
  sprite.scale.set(2.3, 1.12, 1)
  sprite.renderOrder = 1001
  return sprite
}

function syncCultivatorPowerLabel(cultivator: Cultivator): void {
  if (cultivator.kind !== 'enemy') {
    return
  }

  const nextLabel = spiritPowerValue(cultivator.score)
  if (nextLabel === cultivator.powerLabelText) {
    return
  }

  if (!cultivator.powerDot) {
    const powerDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 24, 24),
      new THREE.MeshStandardMaterial({
        color: 0xff5757,
        emissive: 0xff2a2a,
        emissiveIntensity: 2.1,
        roughness: 0.28,
        metalness: 0.08,
      }),
    )
    powerDot.position.set(1.3, 0.36, 0.03)
    powerDot.renderOrder = 1001
    cultivator.hpBarGroup.add(powerDot)
    cultivator.powerDot = powerDot
  }

  if (cultivator.powerValueSprite) {
    cultivator.hpBarGroup.remove(cultivator.powerValueSprite)
    disposeNameSprite(cultivator.powerValueSprite)
  }

  const powerSprite = createEnemyPowerValueSprite(nextLabel, '#ffffff')
  powerSprite.position.set(0, 0.35, 0)
  cultivator.hpBarGroup.add(powerSprite)
  cultivator.powerValueSprite = powerSprite
  cultivator.powerLabelText = nextLabel
  syncEnemyNameplateLayout(cultivator)
}

function createTextSprite(text: string, textColor = '#f8fdff'): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('无法创建数字贴图')
  }

  context.clearRect(0, 0, 128, 128)
  context.beginPath()
  context.arc(64, 64, 44, 0, Math.PI * 2)
  context.fillStyle = 'rgba(6, 24, 44, 0.56)'
  context.fill()
  context.strokeStyle = 'rgba(180, 238, 255, 0.85)'
  context.lineWidth = 4
  context.stroke()
  context.fillStyle = textColor
  context.font = text.length >= 2 ? 'bold 38px Segoe UI' : 'bold 52px Segoe UI'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text, 64, 68)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true

  return new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    }),
  )
}

function createHaloGlowSprite(): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('无法创建光环贴图')
  }

  const gradient = context.createRadialGradient(64, 64, 10, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(255, 248, 216, 0.9)')
  gradient.addColorStop(0.38, 'rgba(255, 232, 156, 0.36)')
  gradient.addColorStop(0.72, 'rgba(255, 214, 112, 0.14)')
  gradient.addColorStop(1, 'rgba(255, 204, 92, 0)')

  context.clearRect(0, 0, 128, 128)
  context.fillStyle = gradient
  context.fillRect(0, 0, 128, 128)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true

  return new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      color: 0xffdf96,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    }),
  )
}

function createSoftGlowSprite(color: THREE.ColorRepresentation = 0xffffff): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('无法创建柔光贴图')
  }

  const gradient = context.createRadialGradient(64, 64, 8, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.75)')
  gradient.addColorStop(0.26, 'rgba(255, 255, 255, 0.34)')
  gradient.addColorStop(0.62, 'rgba(255, 255, 255, 0.1)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

  context.clearRect(0, 0, 128, 128)
  context.fillStyle = gradient
  context.fillRect(0, 0, 128, 128)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true

  return new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      color,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    }),
  )
}

function disposeSpriteMaterial(material: THREE.SpriteMaterial): void {
  material.map?.dispose()
  material.dispose()
}

function createRandomOpeningPillarColor(index: number): THREE.Color {
  return new THREE.Color().setHSL(
    (Math.random() * 0.82 + index * 0.137) % 1,
    0.72 + Math.random() * 0.16,
    0.56 + Math.random() * 0.12,
  )
}

function appendLightningArc(
  group: THREE.Group,
  start: THREE.Vector3,
  end: THREE.Vector3,
  shellColor: THREE.Color,
  coreColor: THREE.Color,
  outerMaterials: THREE.MeshBasicMaterial[],
  coreMaterials: THREE.MeshBasicMaterial[],
  glowSprites: THREE.Sprite[],
): void {
  const distance = start.distanceTo(end)
  if (distance < 0.35) {
    return
  }

  const direction = end.clone().sub(start).normalize()
  const lateral = new THREE.Vector3(-direction.z, 0, direction.x)
  if (lateral.lengthSq() < 0.001) {
    lateral.set(1, 0, 0)
  } else {
    lateral.normalize()
  }
  const vertical = new THREE.Vector3().crossVectors(direction, lateral).normalize()
  const subdivisionCount = THREE.MathUtils.clamp(Math.round(distance / 0.7), 7, 14)
  const points: THREE.Vector3[] = [start.clone()]
  const bendPhase = Math.random() * Math.PI * 2
  const snakeAmplitude = 1.1 + distance * 0.12
  const verticalAmplitude = 0.55 + distance * 0.07

  for (let index = 1; index < subdivisionCount; index += 1) {
    const t = index / subdivisionCount
    const intensity = Math.sin(t * Math.PI)
    const point = start.clone().lerp(end, t)
    const snakeWave = Math.sin(t * Math.PI * 4 + bendPhase) * snakeAmplitude * intensity
    const snakeTwist = Math.cos(t * Math.PI * 3 + bendPhase * 0.6) * verticalAmplitude * intensity
    point.addScaledVector(lateral, snakeWave)
    point.addScaledVector(vertical, snakeTwist)
    points.push(point)

    if (index < subdivisionCount - 1) {
      const arcGlow = createSoftGlowSprite(coreColor.clone())
      arcGlow.position.copy(point)
      arcGlow.scale.set(1.15 + intensity * 0.9, 1.15 + intensity * 0.9, 1)
      group.add(arcGlow)
      glowSprites.push(arcGlow)
    }
  }

  points.push(end.clone())

  for (let index = 0; index < points.length - 1; index += 1) {
    const segmentStart = points[index]
    const segmentEnd = points[index + 1]
    const segment = segmentEnd.clone().sub(segmentStart)
    const segmentLength = segment.length()
    if (segmentLength < 0.08) {
      continue
    }

    const midpoint = segmentStart.clone().add(segmentEnd).multiplyScalar(0.5)
    const outerMaterial = new THREE.MeshBasicMaterial({
      color: shellColor,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const outerBolt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.24, segmentLength, 7),
      outerMaterial,
    )
    outerBolt.position.copy(midpoint)
    outerBolt.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), segment.normalize())
    group.add(outerBolt)
    outerMaterials.push(outerMaterial)

    const coreMaterial = new THREE.MeshBasicMaterial({
      color: coreColor,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const coreBolt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.1, segmentLength * 1.02, 7),
      coreMaterial,
    )
    coreBolt.position.copy(midpoint)
    coreBolt.quaternion.copy(outerBolt.quaternion)
    group.add(coreBolt)
    coreMaterials.push(coreMaterial)
  }
}

function createDashImpactWave(
  position: THREE.Vector3,
  direction: THREE.Vector3,
  shellColor: THREE.Color,
  coreColor: THREE.Color,
): void {
  const group = new THREE.Group()
  group.position.copy(position)
  group.position.y = 0.08
  group.rotation.y = Math.atan2(direction.x, direction.z)
  scene.add(group)

  const ringMaterial = new THREE.MeshBasicMaterial({
    color: shellColor,
    transparent: true,
    opacity: 0.82,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.72, 48), ringMaterial)
  ring.rotation.x = -Math.PI / 2
  group.add(ring)

  const gustMaterial = new THREE.MeshBasicMaterial({
    color: coreColor,
    transparent: true,
    opacity: 0.58,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const gust = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.7), gustMaterial)
  gust.rotation.x = -Math.PI / 2
  gust.position.z = 1.6
  group.add(gust)

  const glow = createSoftGlowSprite(coreColor.clone())
  glow.scale.set(4.6, 4.6, 1)
  group.add(glow)

  createSparks(position.clone().setY(0.9), 14, shellColor.clone())
  spawnSpark(position.clone().setY(0.95), 1.5)

  let life = 0.18
  activeEffects.push({
    update: (delta) => {
      life -= delta
      const progress = 1 - life / 0.18
      ringMaterial.opacity = Math.max(0, (1 - progress) * 0.82)
      ring.scale.setScalar(1 + progress * 2.8)
      gustMaterial.opacity = Math.max(0, (1 - progress) * 0.58)
      gust.scale.set(1 + progress * 1.55, 1 + progress * 0.6, 1)
      gust.position.z = 1.6 + progress * 1.25
      ;(glow.material as THREE.SpriteMaterial).opacity = Math.max(0, (1 - progress) * 0.34)
      glow.scale.setScalar(4.6 + progress * 3.8)

      if (life <= 0) {
        scene.remove(group)
        ring.geometry.dispose()
        ringMaterial.dispose()
        gust.geometry.dispose()
        gustMaterial.dispose()
        disposeSpriteMaterial(glow.material as THREE.SpriteMaterial)
        return true
      }
      return false
    },
  })
}

function getCultivatorSpinBoost(cultivator: Cultivator): number {
  const spiritBoost = Math.sqrt(Math.max(cultivator.score, 0)) * 0.19
  const bladeBoost = Math.max(0, cultivator.bladeCount - 2) * 0.014
  const buffBoost = cultivator.speedBuffDuration > 0 ? 0.4 : 0
  return THREE.MathUtils.clamp(spiritBoost + bladeBoost + buffBoost, 0, 4.8)
}

function getCultivatorBladeSpinSpeed(cultivator: Cultivator): number {
  return cultivator.baseBladeSpinSpeed + getCultivatorSpinBoost(cultivator)
}

function syncCultivatorStats(cultivator: Cultivator): void {
  cultivator.bladeCount = Math.max(cultivator.bladeCount, 2)
  cultivator.bladeSpinSpeed = getCultivatorBladeSpinSpeed(cultivator)
  
  // 控制角色本体成长上限，尽量缩小整体体积
  const bodyScale = THREE.MathUtils.clamp(
    0.94 + cultivator.bladeCount * 0.008 + cultivator.score * 0.0012,
    0.94,
    1.2,
  )
  cultivator.body.scale.setScalar(bodyScale)
  cultivator.head.scale.setScalar(bodyScale)
  cultivator.head.position.y = 2.55 * bodyScale
  cultivator.crownHalo.position.y = 3.55 * bodyScale
  cultivator.crownHalo.position.z = -0.5 * bodyScale
  cultivator.hpBarGroup.position.y = 4.4 * bodyScale
  cultivator.modelPivot.scale.setScalar(
    THREE.MathUtils.clamp(0.98 + (bodyScale - 0.94) * 0.8, 0.98, 1.18),
  )
  const cloudBaseScale =
    cultivator.kind === 'player'
      ? THREE.MathUtils.clamp(1.14 + cultivator.bladeCount * 0.008 + cultivator.score * 0.00014, 1.14, 1.32)
      : THREE.MathUtils.clamp(0.92 + cultivator.bladeCount * 0.01 + cultivator.score * 0.00025, 0.92, 1.16)
  cultivator.cloudGroup.userData.baseScale = cloudBaseScale
  cultivator.cloudGroup.scale.setScalar(cloudBaseScale)
  cultivator.hoverHeight = THREE.MathUtils.clamp(0.1 + cultivator.score * 0.00006 + cultivator.bladeCount * 0.003, 0.1, 0.2)

  // 法器尺寸和轨道尽量收紧，避免后期遮挡过强
  cultivator.bladeScale = THREE.MathUtils.clamp(
    0.56 + cultivator.bladeCount * 0.0018 + cultivator.score * 0.00014,
    0.56,
    0.82,
  )
  cultivator.bladeOrbitRadius = THREE.MathUtils.clamp(
    1.1 + cultivator.bladeCount * 0.005 + cultivator.score * 0.00032,
    1.1,
    1.6,
  )
  
  cultivator.hue =
    cultivator.kind === 'player'
      ? 0.58 - Math.min(cultivator.score, 500) * 0.0004
      : (cultivator.hue + Math.max(cultivator.score, 1) * 0.0001) % 1
  cultivator.strength =
    cultivator.bladeCount * 2.4 +
    cultivator.bladeScale * 4.4 +
    cultivator.score * 0.42 +
    cultivator.bladeSpinSpeed * 0.45 +
    cultivator.speed * 0.34

  // 背部光圈压缩到更小的可控范围
  const auraScale = THREE.MathUtils.clamp(
    bodyScale * (0.54 + cultivator.bladeCount * 0.0035 + cultivator.score * 0.00022),
    0.54,
    0.94,
  )
  cultivator.aura.scale.setScalar(auraScale)
  ;(cultivator.aura.material as THREE.MeshBasicMaterial).color.setHSL(cultivator.hue, 0.42, 0.26 + Math.min(cultivator.score * 0.00024, 0.1))
  ;(cultivator.aura.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.clamp(0.045 + cultivator.score * 0.00008, 0.045, 0.09)

  const haloProgress = THREE.MathUtils.clamp((cultivator.score - 100) / 500, 0, 1)
  const haloLateFade = THREE.MathUtils.lerp(1, 0.5, haloProgress)
  cultivator.crownHalo.visible = haloProgress > 0
  cultivator.crownHalo.scale.setScalar(
    THREE.MathUtils.lerp(bodyScale * 1.1, bodyScale * 2.3, haloProgress),
  )
  const crownRing = cultivator.crownHalo.userData.ring as THREE.Mesh
  const crownGlow = cultivator.crownHalo.userData.glow as THREE.Sprite
  const crownRingMaterial = crownRing.material as THREE.MeshBasicMaterial
  const crownGlowMaterial = crownGlow.material as THREE.SpriteMaterial
  crownRingMaterial.color.setRGB(
    THREE.MathUtils.lerp(0.98, 1, haloProgress),
    THREE.MathUtils.lerp(0.9, 0.98, haloProgress),
    THREE.MathUtils.lerp(0.62, 0.84, haloProgress),
  )
  crownGlowMaterial.color.copy(crownRingMaterial.color)
  crownRingMaterial.opacity = THREE.MathUtils.lerp(0, 0.8, haloProgress) * haloLateFade
  crownGlowMaterial.opacity = THREE.MathUtils.lerp(0, 0.36, haloProgress) * haloLateFade
  crownGlow.scale.setScalar(THREE.MathUtils.lerp(4.5, 6.2, haloProgress))
  syncCultivatorPowerLabel(cultivator)
  refreshBlades(cultivator)
}

function applyUpgrade(cultivator: Cultivator, orbGain: number, orbType: OrbType = 'blade'): void {
  cultivator.score += orbType === 'blade' ? 1.2 : orbGain

  if (orbType === 'blade') {
    cultivator.bladeCount += 1
  } else if (orbType === 'speed') {
    // 改为限时Buff，每次拾取增加 8 秒持续时间
    cultivator.speedBuffDuration += 8
  } else if (orbType === 'heal') {
    cultivator.hp = Math.min(cultivator.maxHp, cultivator.hp + orbGain * 18)
    cultivator.hpBar.scale.x = Math.max(0, cultivator.hp / cultivator.maxHp)
  } else if (orbType === 'lightning' || orbType === 'dash' || orbType === 'wall') {
    cultivator.skillCounts[orbType] += orbGain
    syncSkillLoadout(cultivator)
  }

  if (cultivator.kind === 'enemy') {
    cultivator.hue = (cultivator.hue + 0.006 * Math.max(orbGain, 1)) % 1
  }

  syncCultivatorStats(cultivator)
}

function getCultivatorColorProgress(progress: number): THREE.Color {
  // 白->淡黄->深黄->金黄->铜红->红->紫红->紫->彩色
  const stops = [
    { p: 0.00, c: new THREE.Color('#ffffff') }, // 白
    { p: 0.15, c: new THREE.Color('#ffffe0') }, // 淡黄
    { p: 0.30, c: new THREE.Color('#ffcc00') }, // 深黄
    { p: 0.45, c: new THREE.Color('#ffaa00') }, // 金黄
    { p: 0.60, c: new THREE.Color('#b87333') }, // 铜红
    { p: 0.75, c: new THREE.Color('#ff0000') }, // 红
    { p: 0.90, c: new THREE.Color('#c71585') }, // 紫红
    { p: 1.00, c: new THREE.Color('#800080') }, // 紫
  ]
  
  if (progress <= 0) return stops[0].c.clone()
  if (progress >= 1) return stops[stops.length - 1].c.clone()
  
  for (let i = 0; i < stops.length - 1; i++) {
    if (progress >= stops[i].p && progress <= stops[i + 1].p) {
      const t = (progress - stops[i].p) / (stops[i + 1].p - stops[i].p)
      return stops[i].c.clone().lerp(stops[i + 1].c, t)
    }
  }
  return stops[0].c.clone()
}

function refreshBlades(cultivator: Cultivator): void {
  cultivator.bladeAnchor.clear()
  cultivator.blades = []
  cultivator.bladeAnchor.userData.chainLinks = []
  cultivator.bladeAnchor.add(cultivator.bladeTrail)
  const growthProgress = THREE.MathUtils.clamp((cultivator.bladeCount - 2) / 150 + cultivator.score / 500, 0, 1)
  const rainbowStrength = THREE.MathUtils.clamp((growthProgress - 0.9) / 0.1, 0, 1)

  let baseProgressColor: THREE.Color
  if (cultivator.kind === 'player') {
    baseProgressColor = getCultivatorColorProgress(growthProgress)
  } else {
    baseProgressColor = new THREE.Color().setHSL(cultivator.hue, 0.3 + growthProgress * 0.5, 0.8 - growthProgress * 0.4)
  }

  const spinRatio = THREE.MathUtils.clamp(getCultivatorSpinBoost(cultivator) / 4.8, 0, 1)
  const trailMaterial = cultivator.bladeTrail.material as THREE.PointsMaterial
  trailMaterial.color.copy(baseProgressColor).lerp(new THREE.Color(0xe4f7ff), 0.22 + spinRatio * 0.12)
  trailMaterial.opacity = 0.12 + spinRatio * 0.12 + rainbowStrength * 0.04
  trailMaterial.size = 0.11 + spinRatio * 0.05

  for (let index = 0; index < cultivator.bladeCount; index += 1) {
    const bladesPerLayer = 18
    const layer = Math.floor(index / bladesPerLayer)
    const indexInLayer = index % bladesPerLayer
    const bladesInThisLayer = Math.min(bladesPerLayer, cultivator.bladeCount - layer * bladesPerLayer)
    const angle = (indexInLayer / bladesInThisLayer) * Math.PI * 2 + layer * 0.32
    const currentOrbitRadius = cultivator.bladeOrbitRadius + layer * 0.14
    const heightOffset = Math.sin(layer * Math.PI / 2) * 0.045
    const hueOffset = (cultivator.hue + index * 0.042 * rainbowStrength) % 1
    const celestialColor = new THREE.Color().setHSL(hueOffset, 0.88, 0.68)
    const artifactColor = baseProgressColor.clone().lerp(celestialColor, rainbowStrength)
    const blade = new THREE.Group()
    const artifactSheet = new THREE.Mesh(
      crescentGeometry,
      new THREE.MeshStandardMaterial({
        color: artifactColor,
        emissive: artifactColor.clone().multiplyScalar(0.035 + rainbowStrength * 0.02),
        roughness: 0.32,
        metalness: 0.64,
        side: THREE.DoubleSide,
      }),
    )
    artifactSheet.castShadow = false
    artifactSheet.scale.setScalar(cultivator.bladeScale)
    blade.add(artifactSheet)
    blade.userData.artifactCore = artifactSheet
    blade.userData.artifactSheet = artifactSheet

    const artifactGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.74, 0.74),
      new THREE.MeshBasicMaterial({
        color: artifactColor,
        transparent: true,
        opacity: 0.16 + spinRatio * 0.07 + rainbowStrength * 0.08,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    artifactGlow.scale.setScalar(cultivator.bladeScale * (1.26 + spinRatio * 0.18))
    artifactGlow.position.z = -0.015
    blade.add(artifactGlow)
    blade.userData.artifactGlow = artifactGlow

    blade.position.set(
      Math.cos(angle) * currentOrbitRadius,
      heightOffset,
      Math.sin(angle) * currentOrbitRadius,
    )
    blade.rotation.set(0, -angle, Math.PI / 2)
    cultivator.bladeAnchor.add(blade)
    cultivator.blades.push(blade)
  }
}

function shuffleInPlace<T>(items: T[]): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[items[index], items[swapIndex]] = [items[swapIndex], items[index]]
  }
  return items
}

function buildObstacleSpawnPlan(): ObstacleVariantConfig[] {
  const spawnVariants = OBSTACLE_VARIANTS.filter((variant) => variant.key !== CENTRAL_ALTAR_VARIANT.key)
  const pool: ObstacleVariantConfig[] = []
  const guaranteedCopies = Math.floor(OBSTACLE_COUNT / spawnVariants.length)
  const remainder = OBSTACLE_COUNT % spawnVariants.length

  for (const variant of spawnVariants) {
    for (let count = 0; count < guaranteedCopies; count += 1) {
      pool.push(variant)
    }
  }

  if (remainder > 0) {
    const extraVariants = shuffleInPlace([...spawnVariants]).slice(0, remainder)
    pool.push(...extraVariants)
  }

  shuffleInPlace(pool)

  // 尽量避免生成序列中出现连续同款，降低“复制粘贴”观感。
  for (let index = 1; index < pool.length; index += 1) {
    if (pool[index].key !== pool[index - 1].key) {
      continue
    }

    const swapIndex = pool.findIndex((candidate, candidateIndex) =>
      candidateIndex > index && candidate.key !== pool[index - 1].key)

    if (swapIndex > index) {
      ;[pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]]
    }
  }

  return pool
}

function findObstacleSpawnPosition(clearance: number, variantKey: string, placedLayouts: SpawnedObstacleLayout[]): THREE.Vector3 {
  const sameVariantSpacing = Math.max(clearance * 2.2, 14)

  for (let attempt = 0; attempt < 90; attempt += 1) {
    const candidate = new THREE.Vector3(
      THREE.MathUtils.randFloatSpread((ARENA_HALF - clearance) * 2),
      0,
      THREE.MathUtils.randFloatSpread((ARENA_HALF - clearance) * 2),
    )

    if (isNearTeleporter(candidate, ORB_TELEPORTER_CLEARANCE + clearance * 0.2)) {
      continue
    }

    if (isNearBaguaSpawnSlot(candidate, clearance + 4.6)) {
      continue
    }

    const blocked = placedLayouts.some((layout) => {
      const dx = layout.position.x - candidate.x
      const dz = layout.position.z - candidate.z
      return Math.hypot(dx, dz) < layout.radius + clearance
    })

    if (blocked) {
      continue
    }

    const nearSameVariant = placedLayouts.some((layout) => {
      if (layout.key !== variantKey) {
        return false
      }
      return layout.position.distanceToSquared(candidate) < sameVariantSpacing * sameVariantSpacing
    })

    if (!nearSameVariant) {
      return candidate
    }
  }

  return randomArenaPosition(clearance, true)
}

function spawnObstacles(): void {
  const spawnPlan = buildObstacleSpawnPlan()
  const placedLayouts: SpawnedObstacleLayout[] = centralAltar
    ? [{ key: CENTRAL_ALTAR_VARIANT.key, position: centralAltar.group.position.clone(), radius: centralAltar.radius + 3.2 }]
    : []

  for (const variant of spawnPlan) {
    const scaleJitter =
      variant.allowScaleJitter === false
        ? (variant.uniformScaleMultiplier ?? 1)
        : (0.92 + Math.random() * 0.18) * (variant.uniformScaleMultiplier ?? 1)
    const radius = variant.collisionRadius * scaleJitter
    const clearance = Math.max(radius + 4.6, 7.2)
    const position = findObstacleSpawnPosition(clearance, variant.key, placedLayouts)
    const obstacle = new THREE.Group()
    const visualRoot = new THREE.Group()
    obstacle.position.copy(position)
    obstacle.rotation.y = Math.random() * Math.PI * 2
    obstacle.add(visualRoot)
    populateFallbackObstacleVisual(visualRoot, radius)
    scene.add(obstacle)
    void attachObstacleModel(visualRoot, variant, scaleJitter)

    obstacles.push({
      mesh: obstacle,
      radius,
    })
    placedLayouts.push({
      key: variant.key,
      position: position.clone(),
      radius,
    })
  }
}

function createTeleporters(): void {
  const inset = 6
  const positions = [
    new THREE.Vector3(-ARENA_HALF + inset, 0, -ARENA_HALF + inset),
    new THREE.Vector3(ARENA_HALF - inset, 0, -ARENA_HALF + inset),
    new THREE.Vector3(-ARENA_HALF + inset, 0, ARENA_HALF - inset),
    new THREE.Vector3(ARENA_HALF - inset, 0, ARENA_HALF - inset),
  ]

  for (const position of positions) {
    const group = new THREE.Group()
    group.position.copy(position)
    group.position.y = 0.04

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.6, 0.35, 32),
      new THREE.MeshStandardMaterial({
        color: 0x1c2744,
        emissive: 0x0d1732,
        emissiveIntensity: 1.2,
        roughness: 0.2,
        metalness: 0.68,
      }),
    )
    base.receiveShadow = true
    group.add(base)

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.15, 0.16, 18, 64),
      new THREE.MeshBasicMaterial({
        color: 0x7fd6ff,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    ring.rotation.x = Math.PI / 2
    ring.position.y = 0.22
    group.add(ring)

    const runeRing = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 1.9, 48, 1),
      new THREE.MeshBasicMaterial({
        color: 0xa87bff,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    runeRing.rotation.x = -Math.PI / 2
    runeRing.position.y = 0.24
    group.add(runeRing)

    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.48, 1),
      new THREE.MeshBasicMaterial({
        color: 0xcfe7ff,
        transparent: true,
        opacity: 0.86,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    core.position.y = 1.2
    group.add(core)

    const particleGeo = new THREE.BufferGeometry()
    const particleCount = 8
    const positionsArray = new Float32Array(particleCount * 3)
    for (let index = 0; index < particleCount; index += 1) {
      const theta = (index / particleCount) * Math.PI * 2
      positionsArray[index * 3] = Math.cos(theta) * (1.15 + Math.random() * 0.35)
      positionsArray[index * 3 + 1] = Math.random() * 1.6
      positionsArray[index * 3 + 2] = Math.sin(theta) * (1.15 + Math.random() * 0.35)
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positionsArray, 3))
    const particles = new THREE.Points(
      particleGeo,
      new THREE.PointsMaterial({
        color: 0x9ee8ff,
        size: 0.11,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    group.add(particles)

    scene.add(group)
    teleporters.push({ group, base, ring, runeRing, core, particles, position: position.clone() })
  }
}

function isNearTeleporter(position: THREE.Vector3, clearance: number): boolean {
  return teleporters.some((teleporter) => teleporter.position.distanceToSquared(position) < clearance * clearance)
}

function randomArenaPosition(clearance: number, avoidTeleporters = false): THREE.Vector3 {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const candidate = new THREE.Vector3(
      THREE.MathUtils.randFloatSpread((ARENA_HALF - clearance) * 2),
      0,
      THREE.MathUtils.randFloatSpread((ARENA_HALF - clearance) * 2),
    )

    const blocked = obstacles.some((obstacle) => {
      const dx = obstacle.mesh.position.x - candidate.x
      const dz = obstacle.mesh.position.z - candidate.z
      return Math.hypot(dx, dz) < obstacle.radius + clearance
    })

    if (!blocked && (!avoidTeleporters || !isNearTeleporter(candidate, ORB_TELEPORTER_CLEARANCE + clearance * 0.2))) {
      return candidate
    }
  }

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const candidate = new THREE.Vector3(
      THREE.MathUtils.randFloatSpread((ARENA_HALF - clearance) * 2),
      0,
      THREE.MathUtils.randFloatSpread((ARENA_HALF - clearance) * 2),
    )

    if (!avoidTeleporters || !isNearTeleporter(candidate, ORB_TELEPORTER_CLEARANCE + clearance * 0.2)) {
      return candidate
    }
  }

  return new THREE.Vector3(0, 0, 0)
}

function updateDashMovement(cultivator: Cultivator, delta: number): boolean {
  if (cultivator.dashTimer <= 0) {
    return false
  }

  cultivator.dashTimer = Math.max(0, cultivator.dashTimer - delta)
  cultivator.velocity.copy(cultivator.dashDirection).multiplyScalar(cultivator.speed + DASH_SPEED_BONUS)
  cultivator.group.position.addScaledVector(cultivator.velocity, delta)
  handleArenaBounds(cultivator.group.position, cultivator.velocity)
  resolveObstaclePush(cultivator.group.position, cultivator.radius, cultivator.velocity)
  cultivator.moveDir.copy(cultivator.dashDirection)
  cultivator.group.rotation.y = Math.atan2(cultivator.dashDirection.x, cultivator.dashDirection.z)

  if (cultivator.dashTimer <= 0) {
    cultivator.dashImpactReady = false
    cultivator.dashHitTargets.clear()
    cultivator.velocity.multiplyScalar(0.3)
  }

  return true
}

function updatePlayer(delta: number): void {
  if (!player.alive) {
    player.velocity.multiplyScalar(0.92)
    player.group.position.addScaledVector(player.velocity, delta)
    return
  }

  const isDashing = updateDashMovement(player, delta)
  if (!isDashing) {
    tempVectorA.set(0, 0, 0)
    if (keys.has('KeyW')) tempVectorA.z -= 1
    if (keys.has('KeyS')) tempVectorA.z += 1
    if (keys.has('KeyA')) tempVectorA.x -= 1
    if (keys.has('KeyD')) tempVectorA.x += 1
    if (keys.has('ArrowUp')) tempVectorA.z -= 1
    if (keys.has('ArrowDown')) tempVectorA.z += 1
    if (keys.has('ArrowLeft')) tempVectorA.x -= 1
    if (keys.has('ArrowRight')) tempVectorA.x += 1

    if (tempVectorA.lengthSq() > 0) {
      tempVectorA.normalize()
      player.velocity.copy(tempVectorA.multiplyScalar(player.speed))
    } else {
      player.velocity.set(0, 0, 0)
    }

    player.group.position.addScaledVector(player.velocity, delta)
    handleArenaBounds(player.group.position, player.velocity)
    resolveObstaclePush(player.group.position, player.radius, player.velocity)
    orientCultivator(player, delta)
  }
  tryCollectOrbs(player)
}

function updateEnemies(delta: number): void {
  for (const cultivator of cultivators) {
    if (cultivator.kind !== 'enemy') {
      continue
    }

    if (!cultivator.alive) {
      cultivator.velocity.multiplyScalar(0.9)
      cultivator.group.position.addScaledVector(cultivator.velocity, delta)
      continue
    }

    cultivator.clashCooldown = Math.max(0, cultivator.clashCooldown - delta)
    cultivator.bodyHitCooldown = Math.max(0, cultivator.bodyHitCooldown - delta)
    cultivator.damageGraceCooldown = Math.max(0, cultivator.damageGraceCooldown - delta)
    cultivator.lastStandCooldown = Math.max(0, cultivator.lastStandCooldown - delta)
    cultivator.collectCooldown = Math.max(0, cultivator.collectCooldown - delta)

    const targetOrb = findClosestOrb(cultivator.group.position, 18)
    if (targetOrb) {
      tempVectorA.copy(targetOrb.group.position).setY(0).sub(cultivator.group.position).setY(0)
      if (tempVectorA.lengthSq() > 0.01) {
        tempVectorA.normalize()
        cultivator.moveDir.lerp(tempVectorA, 0.08)
      }
    } else {
      if (cultivator.group.position.distanceToSquared(cultivator.wanderTarget) < 10) {
        cultivator.wanderTarget = randomArenaPosition(3)
      }
      tempVectorA.copy(cultivator.wanderTarget).sub(cultivator.group.position).setY(0)
      if (tempVectorA.lengthSq() > 0.01) {
        tempVectorA.normalize()
        cultivator.moveDir.lerp(tempVectorA, 0.06)
      }
    }

    const dodgeThreat = findNearbyStrongerCultivator(cultivator)
    if (dodgeThreat) {
      tempVectorB.copy(cultivator.group.position).sub(dodgeThreat.group.position).setY(0)
      if (tempVectorB.lengthSq() > 0.001) {
        tempVectorB.normalize()
        cultivator.moveDir.lerp(tempVectorB, 0.11)
      }
    }

    // 敌修AI释放技能
    if (cultivator.skills.length > 0 && cultivator.skillCooldown <= 0) {
      const target = findNearbyWeakerCultivator(cultivator) || (player.alive && player.group.position.distanceToSquared(cultivator.group.position) < 400 ? player : null)
      if (target) {
        // 简单预判目标位置
        const predictPos = target.group.position.clone().addScaledVector(target.velocity, 0.5)
        if (useSelectedSkill(cultivator, predictPos)) {
          cultivator.skillCooldown = 3.0 + Math.random() * 2.0 // 敌修冷却更长
          if (cultivator.skills.length > 0) {
            cultivator.selectedSkillIndex = Math.floor(Math.random() * cultivator.skills.length)
          }
        }
      }
    }

    const isDashing = updateDashMovement(cultivator, delta)
    if (!isDashing) {
      tempVectorA.copy(cultivator.moveDir)
      if (tempVectorA.lengthSq() > 0.0001) {
        tempVectorA.normalize().multiplyScalar(cultivator.speed)
      } else {
        tempVectorA.set(0, 0, 0)
      }
      cultivator.velocity.lerp(tempVectorA, 0.1)
      cultivator.group.position.addScaledVector(cultivator.velocity, delta)
      handleArenaBounds(cultivator.group.position, cultivator.velocity)
      resolveObstaclePush(cultivator.group.position, cultivator.radius, cultivator.velocity)
      orientCultivator(cultivator, delta)
    }
    tryCollectOrbs(cultivator)
  }
}

function updateCritters(delta: number): void {
  for (const critter of critters) {
    critter.modelMixer?.update(delta)
    if (!critter.alive) {
      critter.group.visible = false
      continue
    }

    if (critter.group.position.distanceToSquared(critter.wanderTarget) < 4) {
      critter.wanderTarget = randomArenaPosition(2)
    }

    tempVectorA.copy(critter.wanderTarget).sub(critter.group.position).setY(0)
    if (tempVectorA.lengthSq() > 0.01) {
      tempVectorA.normalize()
      critter.velocity.lerp(tempVectorA.multiplyScalar(critter.profile.moveSpeed), 0.08)
    }

    const nearestCultivator = findClosestAliveCultivator(critter.group.position)
    if (nearestCultivator && nearestCultivator.group.position.distanceToSquared(critter.group.position) < 42) {
      tempVectorB.copy(critter.group.position).sub(nearestCultivator.group.position).setY(0)
      if (tempVectorB.lengthSq() > 0.01) {
        tempVectorB.normalize()
        critter.velocity.lerp(tempVectorB.multiplyScalar(critter.profile.moveSpeed + 2.2), 0.12)
      }
    }

    critter.group.position.addScaledVector(critter.velocity, delta)
    handleArenaBounds(critter.group.position, critter.velocity)
    resolveObstaclePush(critter.group.position, critter.radius, critter.velocity)

    critter.group.rotation.y = Math.atan2(critter.velocity.x, critter.velocity.z)
    const hoverWave = Math.sin(clock.elapsedTime * 4.3 + critter.hoverPhase + critter.group.position.x * 0.1)
    const secondaryWave = Math.sin(clock.elapsedTime * 7.2 + critter.hoverPhase * 0.7) * 0.02
    critter.group.position.y = critter.baseHeight + hoverWave * 0.07 + secondaryWave
    critter.mistGroup.position.y = -0.22 + Math.sin(clock.elapsedTime * 3.6 + critter.hoverPhase) * 0.015
    critter.mistGroup.rotation.y += delta * 0.25
    critter.mistPuffs.forEach((puff, index) => {
      const puffWave = Math.sin(clock.elapsedTime * (2.8 + index * 0.5) + critter.hoverPhase + index) * 0.04
      const puffScale = 0.92 + index * 0.08 + (hoverWave * 0.06 + 0.06)
      puff.position.y = (index === 0 ? 0.02 : 0) + puffWave
      puff.scale.set((1 + index * 0.16) * puffScale, (0.48 + index * 0.06) * (0.9 + Math.abs(puffWave) * 0.6), (1 + index * 0.14) * puffScale)
      ;(puff.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.clamp(0.11 + Math.abs(puffWave) * 0.8 - index * 0.012, 0.05, 0.2)
    })

  }
}

function updateOrbs(delta: number): void {
  for (const orb of orbs) {
    const attractor = findClosestOrbAttractor(orb.group.position)
    if (attractor) {
      tempVectorA.copy(attractor.group.position).sub(orb.group.position).setY(0)
      const distance = tempVectorA.length()
      if (distance < 4.8 && distance > 0.001) {
        tempVectorA.normalize()
        orb.group.position.addScaledVector(tempVectorA, delta * (1.5 + (4.8 - distance) * 1.7))
        orb.ring.scale.setScalar(1.02 + (4.8 - distance) * 0.025)
      }
    }

    orb.group.rotation.y += delta * 1.6
    orb.group.position.y = 1.15 + Math.sin(clock.elapsedTime * 1.6 + orb.spinOffset) * 0.12
    orb.core.rotation.x += delta * 1.8
    orb.core.rotation.y -= delta * 1.35
    orb.ring.rotation.z += delta * (orb.type === 'speed' ? 2.2 : orb.type === 'dash' ? 3.4 : 1.4)
    orb.ring.rotation.y += delta * (orb.type === 'blade' ? 1.8 : 0.8)
    if (!attractor || attractor.group.position.distanceToSquared(orb.group.position) >= 4.8 * 4.8) {
      orb.ring.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2.4 + orb.spinOffset) * 0.05)
    }
    orb.symbol.rotation.y += delta * (orb.type === 'blade' ? 1.1 : orb.type === 'dash' ? 4.8 : 2.4)
    orb.symbol.rotation.z = Math.sin(clock.elapsedTime * 2 + orb.spinOffset) * 0.1
    orb.label.material.rotation = Math.sin(clock.elapsedTime * 1.8 + orb.spinOffset) * 0.02
  }
}

function updateCultivatorBlades(delta: number): void {
  for (const cultivator of cultivators) {
    const horizontalSpeedSq = cultivator.velocity.x * cultivator.velocity.x + cultivator.velocity.z * cultivator.velocity.z
    const shouldMove = cultivator.alive && horizontalSpeedSq > (cultivator.kind === 'player' ? 1.2 : 0.5)
    setCultivatorAnimationState(cultivator, shouldMove ? 'move' : 'idle')
    cultivator.modelMixer?.update(delta * (cultivator.alive ? 1 : 0.35))
    stabilizeCultivatorModel(cultivator)

    cultivator.bladeSpinSpeed = getCultivatorBladeSpinSpeed(cultivator)
    if (cultivator.speedBuffDuration > 0) {
      cultivator.speedBuffDuration -= delta
      cultivator.speed = cultivator.baseSpeed + 6 // 移速大幅提升
    } else {
      cultivator.speed = cultivator.baseSpeed
    }

    // 技能冷却与控制
    if (cultivator.skillCooldown > 0) cultivator.skillCooldown -= delta
    if (cultivator.stunDuration > 0) {
      cultivator.stunDuration -= delta
      cultivator.velocity.set(0, 0, 0)
    }

    const floatWave = Math.sin(clock.elapsedTime * MODEL_FLOAT_SPEED + cultivator.hoverPhase) * MODEL_FLOAT_AMPLITUDE
    const floatSecondary = Math.sin(clock.elapsedTime * 3 + cultivator.hoverPhase * 0.7) * 0.025
    const cloudBob = Math.sin(clock.elapsedTime * 2.4 + cultivator.hoverPhase) * 0.008
    cultivator.visualRoot.position.y = cultivator.hoverHeight + floatWave
    cultivator.modelPivot.position.y = 0.06 + floatSecondary
    if (cultivator.cloudGroup.userData.mountType !== 'sword') {
      cultivator.cloudGroup.rotation.y += delta * 0.18
    }
    let cloudLocalY = cultivator.modelPivot.position.y
    let cloudLocalX = 0
    let cloudLocalZ = 0

    cultivator.bladeAnchor.position.set(0, cultivator.modelPivot.position.y + cultivator.bladeAnchorHeight * cultivator.modelPivot.scale.y, 0)

    const trailDirection = cultivator.velocity.lengthSq() > 0.002 ? cultivator.velocity.clone().setY(0).normalize() : cultivator.moveDir.clone().setY(0).normalize()
    const localTrailDirection =
      trailDirection.lengthSq() > 0.001
        ? trailDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), -cultivator.group.rotation.y).normalize()
        : new THREE.Vector3(0, 0, 1)
    const speedRatio = THREE.MathUtils.clamp(cultivator.velocity.length() / Math.max(cultivator.baseSpeed, 0.01), 0, 1.4)
    const spinRatio = THREE.MathUtils.clamp(getCultivatorSpinBoost(cultivator) / 4.8, 0, 1)
    const trailMaterial = cultivator.bladeTrail.material as THREE.PointsMaterial
    trailMaterial.opacity = THREE.MathUtils.clamp(0.1 + spinRatio * 0.12 + speedRatio * 0.03, 0.08, 0.24)
    trailMaterial.size = 0.11 + spinRatio * 0.05 + speedRatio * 0.02
    const trailAttr = cultivator.bladeTrail.geometry.getAttribute('position') as THREE.BufferAttribute
    const trailPositions = trailAttr.array as Float32Array
    const trackedBlades = Math.min(cultivator.blades.length, 6)
    for (let index = 0; index < trailPositions.length / 3; index += 1) {
      const baseIndex = index * 3
      if (trackedBlades === 0) {
        trailPositions[baseIndex] = 0
        trailPositions[baseIndex + 1] = 0
        trailPositions[baseIndex + 2] = 0
        continue
      }

      const blade = cultivator.blades[index % trackedBlades]
      const trailLayer = Math.floor(index / trackedBlades)
      const trailLag = (0.16 + trailLayer * 0.2) * (1 + spinRatio * 0.2)
      const baseAngle = Math.atan2(blade.position.z, blade.position.x)
      const baseRadius = Math.hypot(blade.position.x, blade.position.z)
      const trailAngle = baseAngle - cultivator.bladeSpinDirection * trailLag
      const radius = baseRadius * (1 - trailLayer * 0.08)
      trailPositions[baseIndex] = Math.cos(trailAngle) * radius
      trailPositions[baseIndex + 1] =
        blade.position.y - trailLayer * 0.035 + Math.sin(clock.elapsedTime * (5.2 + trailLayer) + cultivator.hoverPhase + index * 0.4) * 0.018
      trailPositions[baseIndex + 2] = Math.sin(trailAngle) * radius
    }
    trailAttr.needsUpdate = true
    const cloudBaseScale = Number(cultivator.cloudGroup.userData.baseScale ?? 1)
    const mountType = cultivator.cloudGroup.userData.mountType === 'sword' ? 'sword' : 'cloud'
    const cloudPulse = 1 + Math.sin(clock.elapsedTime * 2.6 + cultivator.hoverPhase) * (mountType === 'sword' ? 0.018 : 0.04)
    const cloudStretch = 1 + speedRatio * (mountType === 'sword' ? 0.08 : 0.18)
    if (mountType === 'sword') {
      cultivator.cloudGroup.scale.set(
        cloudBaseScale * (1 + speedRatio * 0.015),
        cloudBaseScale * (1 + Math.sin(clock.elapsedTime * 3.2 + cultivator.hoverPhase) * 0.01),
        cloudBaseScale * (1 + speedRatio * 0.03),
      )
    } else {
      cultivator.cloudGroup.scale.set(
        cloudBaseScale * cloudPulse * (1 + Math.abs(localTrailDirection.x) * speedRatio * 0.08),
        cloudBaseScale * (0.92 + Math.sin(clock.elapsedTime * 3.8 + cultivator.hoverPhase) * 0.03 - speedRatio * 0.08),
        cloudBaseScale * cloudPulse * cloudStretch,
      )
    }
    const cloudContactY = Number(cultivator.cloudGroup.userData.contactY ?? 0.2)
    const cloudContactOffset = cloudContactY * cultivator.cloudGroup.scale.y
    cultivator.cloudGroup.position.set(
      cloudLocalX,
      cloudLocalY - cloudContactOffset + (mountType === 'sword' ? 1.02 : 0.82) + cloudBob,
      cloudLocalZ,
    )
    const mountRotationLerp = 1 - Math.exp(-delta * 8)
    if (mountType === 'sword') {
      cultivator.cloudGroup.rotation.x = THREE.MathUtils.lerp(
        cultivator.cloudGroup.rotation.x,
        0.02 + Math.sin(clock.elapsedTime * 2.4 + cultivator.hoverPhase) * 0.01,
        mountRotationLerp,
      )
      cultivator.cloudGroup.rotation.y = THREE.MathUtils.lerp(
        cultivator.cloudGroup.rotation.y,
        0,
        mountRotationLerp,
      )
      cultivator.cloudGroup.rotation.z = THREE.MathUtils.lerp(
        cultivator.cloudGroup.rotation.z,
        0,
        mountRotationLerp,
      )
    } else {
      cultivator.cloudGroup.rotation.x = THREE.MathUtils.lerp(cultivator.cloudGroup.rotation.x, localTrailDirection.z * speedRatio * 0.08, mountRotationLerp)
      cultivator.cloudGroup.rotation.z = THREE.MathUtils.lerp(cultivator.cloudGroup.rotation.z, -localTrailDirection.x * speedRatio * 0.1, mountRotationLerp)
    }
    cultivator.cloudTrails.forEach((trail, index) => {
      const wave = Math.sin(clock.elapsedTime * 7 + cultivator.hoverPhase + index * 0.8) * 0.02
      if (mountType === 'sword') {
        const sprayOffset = (index - 1) * (0.06 + speedRatio * 0.02)
        const sprayDistance = 1.1 + index * 0.26 + speedRatio * 0.18
        const tailWhip = Math.sin(clock.elapsedTime * (7.5 + speedRatio * 2.5) + cultivator.hoverPhase + index * 0.65) * (0.04 + speedRatio * 0.12)
        trail.position.set(sprayOffset + tailWhip * (0.45 + index * 0.15), 0.035 + wave * 0.2, -sprayDistance)
        trail.rotation.set(0, tailWhip * 0.22, 0)
        trail.scale.setScalar(1)

        const particles = (trail.userData.particles as THREE.Mesh[] | undefined) ?? []
        particles.forEach((particle, particleIndex) => {
          const particleWave = Math.sin(clock.elapsedTime * (9 + particleIndex) + cultivator.hoverPhase + index) * 0.018
          const particleDepth = particleIndex * (0.22 + speedRatio * 0.05)
          const particleSpread = (particleIndex - 2) * (0.045 + index * 0.008)
          const whipDrift = tailWhip * (0.5 + particleIndex * 0.2)
          particle.position.set(
            particleSpread + sprayOffset * 0.35 + whipDrift,
            particleWave,
            -particleDepth,
          )
          const particleScale = THREE.MathUtils.clamp(0.55 + speedRatio * 0.32 - particleIndex * 0.06, 0.18, 0.92)
          particle.scale.setScalar(particleScale)
          ;(particle.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.clamp(
            0.16 + speedRatio * 0.12 - particleIndex * 0.025,
            0.03,
            0.22,
          )
        })
        return
      }

      const distance = 0.42 + index * (0.16 + speedRatio * 0.1)
      const lateral = (index % 2 === 0 ? -1 : 1) * (0.035 + speedRatio * 0.028) * (index + 1)
      trail.position.set(
        -localTrailDirection.x * distance + localTrailDirection.z * lateral,
        -0.065 - index * 0.013 + wave,
        -localTrailDirection.z * distance - localTrailDirection.x * lateral + wave * 1.2,
      )
      trail.rotation.y = 0
      trail.scale.set(
        1.02 + speedRatio * 0.46 - index * 0.1,
        0.76 + speedRatio * 0.18 - index * 0.05,
        1,
      )
    })

    if (!cultivator.alive) {
      cultivator.bladeAnchor.rotation.y += delta * cultivator.bladeSpinSpeed * cultivator.bladeSpinDirection * 0.45
      cultivator.group.position.y = Math.max(0, cultivator.group.position.y - delta * 5)
      continue
    }

    cultivator.clashCooldown = Math.max(0, cultivator.clashCooldown - delta)
    cultivator.bodyHitCooldown = Math.max(0, cultivator.bodyHitCooldown - delta)
    cultivator.damageGraceCooldown = Math.max(0, cultivator.damageGraceCooldown - delta)
    cultivator.lastStandCooldown = Math.max(0, cultivator.lastStandCooldown - delta)
    cultivator.collectCooldown = Math.max(0, cultivator.collectCooldown - delta)
    cultivator.bladeAnchor.rotation.y =
      (cultivator.bladeAnchor.rotation.y + delta * cultivator.bladeSpinSpeed * cultivator.bladeSpinDirection) % (Math.PI * 2)
    cultivator.body.position.y = 1.35 + Math.sin(clock.elapsedTime * 4 + cultivator.group.position.x) * 0.04
    cultivator.head.position.y = 2.55 + Math.sin(clock.elapsedTime * 4 + cultivator.group.position.x) * 0.04
    const haloProgress = THREE.MathUtils.clamp((cultivator.score - 100) / 500, 0, 1)
    const haloLateFade = THREE.MathUtils.lerp(1, 0.5, haloProgress)
    const haloPulse = 1 + Math.sin(clock.elapsedTime * (2.2 + haloProgress * 1.8) + cultivator.group.position.x) * (0.015 + haloProgress * 0.02)
    const crownRing = cultivator.crownHalo.userData.ring as THREE.Mesh
    const crownGlow = cultivator.crownHalo.userData.glow as THREE.Sprite
    const crownRingMaterial = crownRing.material as THREE.MeshBasicMaterial
    const crownGlowMaterial = crownGlow.material as THREE.SpriteMaterial
    cultivator.crownHalo.position.y = 3.78 + Math.sin(clock.elapsedTime * 2.2 + cultivator.group.position.x) * 0.024
    cultivator.crownHalo.position.z = -0.54 - haloProgress * 0.08
    cultivator.crownHalo.scale.setScalar(THREE.MathUtils.lerp(1.1, 2.3, haloProgress) * haloPulse)
    crownRingMaterial.opacity = THREE.MathUtils.clamp(
      (
        THREE.MathUtils.lerp(0, 0.84, haloProgress) +
        Math.sin(clock.elapsedTime * (3 + haloProgress * 2.2) + cultivator.hoverPhase) * 0.06
      ) * haloLateFade,
      0,
      1,
    )
    crownGlowMaterial.opacity = THREE.MathUtils.clamp(
      (
        THREE.MathUtils.lerp(0, 0.36, haloProgress) +
        Math.sin(clock.elapsedTime * (2.6 + haloProgress * 1.7) + cultivator.hoverPhase) * 0.05
      ) * haloLateFade,
      0,
      0.48,
    )
    crownGlow.scale.setScalar(THREE.MathUtils.lerp(4.5, 6.2, haloProgress) * (1 + haloProgress * 0.08))

    if (cultivator.clashWobble > 0) {
      cultivator.clashWobble = Math.max(0, cultivator.clashWobble - delta * 3.5)
      const wobbleAmount = Math.sin(cultivator.clashWobble * Math.PI * 5) * 0.25 * cultivator.clashWobble
      cultivator.bladeAnchor.rotation.x = wobbleAmount
      cultivator.bladeAnchor.rotation.z = wobbleAmount
    } else {
      cultivator.bladeAnchor.rotation.x = 0
      cultivator.bladeAnchor.rotation.z = 0
    }
  }
}

function countEnemiesNearPosition(position: THREE.Vector3, radius: number, ignored?: Cultivator): number {
  let total = 0
  const radiusSq = radius * radius
  for (const cultivator of cultivators) {
    if (!cultivator.alive || cultivator.kind !== 'enemy' || cultivator === ignored) {
      continue
    }
    if (cultivator.group.position.distanceToSquared(position) < radiusSq) {
      total += 1
    }
  }
  return total
}

function pickTeleportDestination(source: Teleporter, traveller: Cultivator): Teleporter | undefined {
  const candidates = teleporters
    .filter((teleporter) => teleporter !== source)
    .map((teleporter) => ({
      teleporter,
      enemyCount: countEnemiesNearPosition(teleporter.position, 16, traveller),
    }))
    .sort((a, b) => a.enemyCount - b.enemyCount)

  if (candidates.length === 0) {
    return undefined
  }

  const bestEnemyCount = candidates[0].enemyCount
  const softerCandidates = candidates.filter((candidate) => candidate.enemyCount <= bestEnemyCount + 1)
  const picked = softerCandidates[Math.floor(Math.random() * softerCandidates.length)]
  return picked?.teleporter
}

function teleportCultivator(traveller: Cultivator, source: Teleporter, destination: Teleporter): void {
  createSparks(source.position.clone().setY(1), 18, new THREE.Color(0x7fd6ff))
  traveller.group.position.copy(destination.position)
  traveller.group.position.y = Math.max(0, traveller.group.position.y)
  traveller.group.position.add(new THREE.Vector3(THREE.MathUtils.randFloatSpread(1.4), 0, THREE.MathUtils.randFloatSpread(1.4)))
  traveller.velocity.multiplyScalar(0.2)
  traveller.teleportCooldown = TELEPORT_COOLDOWN
  if (traveller.kind === 'player') {
    // 收敛镜头锚点，避免相机横跨全场追赶导致明显眩晕
    cameraFollowPosition.lerp(traveller.group.position, 0.72)
    cameraLookTarget.lerp(
      new THREE.Vector3(
        traveller.group.position.x,
        2.8 + traveller.group.position.y * 0.12 + traveller.visualRoot.position.y * 0.3,
        traveller.group.position.z,
      ),
      0.76,
    )
  }
  createSparks(destination.position.clone().setY(1), 22, new THREE.Color(0xc893ff))
}

function updateTeleporters(delta: number): void {
  teleporters.forEach((teleporter, index) => {
    teleporter.group.rotation.y += delta * 0.45
    teleporter.ring.rotation.z += delta * (1.2 + index * 0.08)
    teleporter.runeRing.rotation.z -= delta * (0.8 + index * 0.06)
    teleporter.core.rotation.y += delta * 1.8
    teleporter.core.position.y = 1.15 + Math.sin(clock.elapsedTime * 3.2 + index) * 0.16
    const pulse = 0.92 + Math.sin(clock.elapsedTime * 5 + index * 1.3) * 0.08
    teleporter.ring.scale.setScalar(pulse)
    teleporter.runeRing.scale.setScalar(0.96 + Math.sin(clock.elapsedTime * 4.5 + index) * 0.06)
    ;(teleporter.ring.material as THREE.MeshBasicMaterial).opacity = 0.58 + Math.sin(clock.elapsedTime * 6 + index) * 0.12
    ;(teleporter.runeRing.material as THREE.MeshBasicMaterial).opacity = 0.22 + Math.sin(clock.elapsedTime * 4 + index) * 0.08
    teleporter.particles.rotation.y -= delta * 0.7
  })

  for (const cultivator of cultivators) {
    if (!cultivator.alive || cultivator.teleportCooldown > 0) {
      cultivator.teleportCooldown = Math.max(0, cultivator.teleportCooldown - delta)
      continue
    }

    for (const teleporter of teleporters) {
      if (cultivator.group.position.distanceToSquared(teleporter.position) > TELEPORTER_RADIUS * TELEPORTER_RADIUS) {
        continue
      }

      const destination = pickTeleportDestination(teleporter, cultivator)
      if (destination) {
        teleportCultivator(cultivator, teleporter, destination)
      }
      break
    }
  }
}

function resolveBodyCollisions(): void {
  for (let index = 0; index < cultivators.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < cultivators.length; otherIndex += 1) {
      const first = cultivators[index]
      const second = cultivators[otherIndex]

      if (!first.alive && !second.alive) {
        continue
      }

      tempVectorA.copy(first.group.position).sub(second.group.position).setY(0)
      const distance = tempVectorA.length()
      const minimumDistance = first.radius + second.radius

      if (distance > 0 && distance < minimumDistance) {
        const push = (minimumDistance - distance) * 0.5
        if (tempVectorA.lengthSq() > 0.0001) {
          tempVectorA.normalize()
        }
        first.group.position.addScaledVector(tempVectorA, push)
        second.group.position.addScaledVector(tempVectorA, -push)
      }
    }
  }
}

function resolveDashImpacts(): void {
  for (const attacker of cultivators) {
    if (!attacker.alive || !attacker.dashImpactReady || attacker.dashTimer <= 0) {
      continue
    }

    let hitAnyTarget = false
    for (const target of cultivators) {
      if (target === attacker || !target.alive) {
        continue
      }
      if (attacker.dashHitTargets.has(target.id)) {
        continue
      }

      tempVectorA.copy(target.group.position).sub(attacker.group.position).setY(0)
      const distance = tempVectorA.length()
      const impactDistance = attacker.radius + target.radius + 0.5
      if (distance > impactDistance) {
        continue
      }

      if (distance > 0.0001) {
        tempVectorA.normalize()
      } else {
        tempVectorA.copy(attacker.dashDirection)
      }

      const impactPoint = attacker.group.position.clone().lerp(target.group.position, 0.5).setY(1.05)
      const dashDamage =
        (target.kind === 'player' ? 7 : 11) +
        attacker.bladeCount * 0.45 +
        attacker.bladeScale * 3.2 +
        attacker.strength * 0.08
      createSparks(impactPoint, target.kind === 'player' ? 20 : 14, new THREE.Color('#ffd59c'))
      spawnSpark(impactPoint, target.kind === 'player' ? 1.3 : 1.0)
      applyCombatDamage(target, attacker, dashDamage, {
        grace: target.kind === 'player' ? 0.55 : 0.3,
        hitStop: target.kind === 'player' ? 0.035 : 0.024,
        sparkCount: target.kind === 'player' ? 20 : 14,
        sparkColor: new THREE.Color('#ffd59c'),
        sparkPower: target.kind === 'player' ? 1.3 : 0.95,
        screenShake: target.kind === 'player' ? 0.45 : 0.2,
        impactPoint,
      })

      target.velocity.addScaledVector(tempVectorA, target.kind === 'player' ? 20 : 14)
      attacker.velocity.addScaledVector(tempVectorA, -6)
      attacker.dashHitTargets.add(target.id)
      hitAnyTarget = true
      attacker.bodyHitCooldown = Math.max(attacker.bodyHitCooldown, 0.2)
      if (attacker.kind === 'player' || target.kind === 'player') {
        triggerHitStop(0.02)
      }
    }

    if (hitAnyTarget) {
      createSparks(attacker.group.position.clone().setY(1.0), 8, new THREE.Color('#ff8a80'))
    }
  }
}

function resolveBladeClashes(): void {
  const bladeWorldA = new THREE.Vector3()
  const bladeWorldB = new THREE.Vector3()

  for (let index = 0; index < cultivators.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < cultivators.length; otherIndex += 1) {
      const first = cultivators[index]
      const second = cultivators[otherIndex]

      if (!first.alive || !second.alive || first.clashCooldown > 0 || second.clashCooldown > 0) {
        continue
      }

      let clashed = false
      for (const bladeA of first.blades) {
        bladeA.getWorldPosition(bladeWorldA)

        for (const bladeB of second.blades) {
          bladeB.getWorldPosition(bladeWorldB)
          const threshold = first.bladeScale * 0.42 + second.bladeScale * 0.42
          if (bladeWorldA.distanceTo(bladeWorldB) < threshold) {
            clashed = true
            spawnSpark(bladeWorldA.clone().lerp(bladeWorldB, 0.5))
            break
          }
        }

        if (clashed) {
          break
        }
      }

      if (!clashed) {
        continue
      }

      // 将碰撞能量离散成 1~7 档，并让高转速的法器形成更密集的连击声
      const averageTipSpeed =
        ((Math.abs(first.bladeSpinSpeed) * first.bladeOrbitRadius) + (Math.abs(second.bladeSpinSpeed) * second.bladeOrbitRadius)) * 0.5
      const powerGap = Math.abs(first.strength - second.strength)
      const speedFactor = THREE.MathUtils.clamp((averageTipSpeed - 3.2) / 10.5, 0, 1)
      const gapFactor = THREE.MathUtils.clamp(powerGap / 28, 0, 1)
      const scaleFactor = THREE.MathUtils.clamp((first.bladeScale + second.bladeScale - 1.1) / 0.85, 0, 1)
      const levelFactor = speedFactor * 0.45 + gapFactor * 0.4 + scaleFactor * 0.15
      const powerGapSigned = first.strength - second.strength
      const powerGapRatio = THREE.MathUtils.clamp(
        powerGap / Math.max(Math.max(first.strength, second.strength), 1),
        0,
        1,
      )
      const dominanceFactor = THREE.MathUtils.clamp(levelFactor * 0.72 + powerGapRatio * 0.95, 0, 1)
      const clashLevel = 1 + levelFactor * 6
      const clashDensity = THREE.MathUtils.clamp(averageTipSpeed / 4.2, 1, 4)
      audioManager.playClashSound(clashLevel, clashDensity)
      if ((first.kind === 'player' && isFemaleEnemyCultivator(second)) || (second.kind === 'player' && isFemaleEnemyCultivator(first))) {
        audioManager.playFemaleLaughSound()
      } else if ((first.kind === 'player' && isMaleEnemyCultivator(second)) || (second.kind === 'player' && isMaleEnemyCultivator(first))) {
        audioManager.playMaleBattleSound()
      }
      const clashPoint = bladeWorldA.clone().lerp(bladeWorldB, 0.5)
      createSparks(clashPoint, 12 + Math.floor(levelFactor * 22), new THREE.Color('#dff6ff'))
      spawnSpark(clashPoint, 1.45 + levelFactor * 1.15)
      if (first.kind === 'player' || second.kind === 'player') {
        triggerHitStop(0.042 + levelFactor * 0.07)
        const shakeIntensity = levelFactor >= 0.58
          ? Math.min(1, 0.72 + levelFactor * 0.62 + powerGapRatio * 0.22)
          : Math.min(0.7, 0.26 + levelFactor * 0.62 + powerGapRatio * 0.16)
        triggerScreenShake(shakeIntensity)
      }

      first.clashCooldown = 0.24
      second.clashCooldown = 0.24
      first.collectCooldown = 0.4
      second.collectCooldown = 0.4

      tempVectorA.copy(first.group.position).sub(second.group.position).setY(0)
      if (tempVectorA.lengthSq() < 0.001) {
        tempVectorA.set(Math.random() - 0.5, 0, Math.random() - 0.5)
      }
      if (tempVectorA.lengthSq() > 0.0001) {
        tempVectorA.normalize()
      } else {
        tempVectorA.set(1, 0, 0)
      }

      createBladeClashBurst(clashPoint, tempVectorA.clone(), 1.2 + levelFactor * 1.15)

      first.velocity.addScaledVector(tempVectorA, 23 + levelFactor * 8.5)
      second.velocity.addScaledVector(tempVectorA, -23 - levelFactor * 8.5)

      first.clashWobble = 1.0
      second.clashWobble = 1.0

      if (Math.abs(powerGapSigned) < 2.6) {
        first.bladeCount = Math.max(0, first.bladeCount - 1)
        second.bladeCount = Math.max(0, second.bladeCount - 1)
      } else {
        const winner = powerGapSigned > 0 ? first : second
        const loser = winner === first ? second : first
        const loserBladeLoss = THREE.MathUtils.clamp(
          1 + Math.round(levelFactor * 1.25 + powerGapRatio * 1.8),
          1,
          3,
        )
        loser.bladeCount = Math.max(0, loser.bladeCount - loserBladeLoss)
        if (Math.random() < THREE.MathUtils.clamp(0.22 - dominanceFactor * 0.14, 0.04, 0.22)) {
          winner.bladeCount = Math.max(0, winner.bladeCount - 1)
        }

        loser.stunDuration = Math.max(loser.stunDuration, 0.08 + dominanceFactor * 0.18)
        winner.speedBuffDuration = Math.max(winner.speedBuffDuration, 1.1 + dominanceFactor * 1.8)
        winner.score += 0.7 + dominanceFactor * 1.1
        winner.hp = Math.min(winner.maxHp, winner.hp + 3 + dominanceFactor * 4)
        winner.hpBar.scale.x = Math.max(0, winner.hp / winner.maxHp)
        winner.hpBar.position.x = (winner.hpBar.scale.x - 1) * 0.9
        applyCombatDamage(loser, winner, 7 + levelFactor * 8 + powerGapRatio * 12, {
          grace: loser.kind === 'player' ? 0.28 : 0.18,
          bodyHitCooldown: loser.kind === 'player' ? 0.3 : 0.2,
          hitStop: loser.kind === 'player' ? 0.032 : 0.022,
          sparkCount: loser.kind === 'player' ? 18 : 12,
          sparkColor: new THREE.Color('#fff0ba'),
          sparkPower: 1.05 + dominanceFactor * 0.55,
          screenShake: loser.kind === 'player' || winner.kind === 'player'
            ? 0.62 + dominanceFactor * 0.3
            : 0.26 + dominanceFactor * 0.18,
          impactPoint: clashPoint.clone(),
        })
      }

      syncCultivatorStats(first)
      syncCultivatorStats(second)
    }
  }
}

function resolveBladeBodyHits(): void {
  const bladeWorld = new THREE.Vector3()

  for (let index = 0; index < cultivators.length; index += 1) {
    const attacker = cultivators[index]
    if (!attacker.alive || attacker.bladeCount <= 0) continue

    for (let otherIndex = 0; otherIndex < cultivators.length; otherIndex += 1) {
      if (index === otherIndex) continue
      const target = cultivators[otherIndex]
      if (!target.alive || target.bodyHitCooldown > 0) continue

      let hit = false
      for (const blade of attacker.blades) {
        blade.getWorldPosition(bladeWorld)
        if (bladeWorld.distanceTo(target.group.position) < target.radius + attacker.bladeScale * 0.45) {
          hit = true
          spawnSpark(bladeWorld.clone())
          break
        }
      }

      if (hit) {
        const baseDamage = 5.5 + attacker.strength * 0.9
        const bladePressure = THREE.MathUtils.clamp((attacker.bladeCount - target.bladeCount) * 0.12, -1.2, 2.4)
        const hitDamage = Math.max(3.5, baseDamage + bladePressure) * (target.kind === 'player' ? 0.82 : 1)
        applyCombatDamage(target, attacker, hitDamage, {
          grace: target.kind === 'player' ? 0.42 : 0.22,
          bodyHitCooldown: target.kind === 'player' ? 0.38 : 0.22,
          hitStop: target.kind === 'player' ? 0.022 : 0.016,
          sparkCount: target.kind === 'player' ? 10 : 6,
          sparkColor: new THREE.Color('#fff1c8'),
          sparkPower: target.kind === 'player' ? 1 : 0.76,
          screenShake: target.kind === 'player' ? 0.36 : 0.22,
          impactPoint: bladeWorld.clone(),
        })
        
        tempVectorA.copy(target.group.position).sub(attacker.group.position).setY(0)
      if (tempVectorA.lengthSq() > 0.0001) tempVectorA.normalize()
      else tempVectorA.set(0, 0, 1)
        target.velocity.addScaledVector(tempVectorA, target.kind === 'player' ? 12 : 9.5)
        attacker.velocity.addScaledVector(tempVectorA, -2.4)

        if (Math.random() < 0.24) {
          target.bladeCount = Math.max(0, target.bladeCount - 1)
          syncCultivatorStats(target)
        }
      }
    }
  }
}

function applyCombatDamage(target: Cultivator, source: Cultivator, amount: number, options?: {
  grace?: number
  bodyHitCooldown?: number
  hitStop?: number
  sparkCount?: number
  sparkColor?: THREE.Color
  sparkPower?: number
  screenShake?: number
  impactPoint?: THREE.Vector3
}): boolean {
  if (!target.alive || amount <= 0) {
    return false
  }

  const graceDuration = options?.grace ?? 0
  if (graceDuration > 0 && target.damageGraceCooldown > 0) {
    return false
  }

  target.hp -= amount
  if (graceDuration > 0) {
    target.damageGraceCooldown = graceDuration
  }
  if (options?.bodyHitCooldown !== undefined) {
    target.bodyHitCooldown = Math.max(target.bodyHitCooldown, options.bodyHitCooldown)
  }
  target.clashWobble = Math.max(target.clashWobble, 0.9)
  target.hpBar.scale.x = Math.max(0, target.hp / target.maxHp)
  target.hpBar.position.x = (target.hpBar.scale.x - 1) * 0.9

  if (options?.hitStop && (target.kind === 'player' || source.kind === 'player')) {
    triggerHitStop(options.hitStop)
  }
  if (options?.impactPoint && options?.sparkCount && options.sparkCount > 0) {
    createSparks(options.impactPoint.clone(), options.sparkCount, options.sparkColor ?? new THREE.Color('#fff1c8'))
  }
  if (options?.impactPoint && options?.sparkPower) {
    spawnSpark(options.impactPoint.clone(), options.sparkPower)
  }
  if (options?.screenShake && (target.kind === 'player' || source.kind === 'player')) {
    triggerScreenShake(options.screenShake)
  }

  if (source.kind === 'player' && isFemaleEnemyCultivator(target)) {
    audioManager.playFemaleLaughSound()
  } else if (target.kind === 'player' && isFemaleEnemyCultivator(source)) {
    audioManager.playFemaleLaughSound()
  } else if ((source.kind === 'player' && isMaleEnemyCultivator(target)) || (target.kind === 'player' && isMaleEnemyCultivator(source))) {
    audioManager.playMaleBattleSound()
  }

  if (target.hp > 0) {
    return true
  }

  if (target.kind === 'player' && target.lastStandCooldown <= 0) {
    target.lastStandCooldown = 7
    target.damageGraceCooldown = Math.max(target.damageGraceCooldown, 1.25)
    target.bodyHitCooldown = Math.max(target.bodyHitCooldown, 0.45)
    target.hp = 18
    target.hpBar.scale.x = Math.max(0, target.hp / target.maxHp)
    target.hpBar.position.x = (target.hpBar.scale.x - 1) * 0.9
    target.bladeCount = Math.max(2, target.bladeCount)
    createSparks(target.group.position.clone(), 24, new THREE.Color('#fff3a8'))
    spawnSpark(target.group.position.clone(), 1.8)
    triggerHitStop(0.055)
    triggerScreenShake(0.65)
    syncCultivatorStats(target)
    return true
  }

  source.kills += 1
  defeatCultivator(target, source)
  return true
}

function resolveCritterBladeHits(): void {
  const bladeWorld = new THREE.Vector3()

  for (const critter of critters) {
    if (!critter.alive) {
      continue
    }

    for (const cultivator of cultivators) {
      if (!cultivator.alive) {
        continue
      }

      let killed = false
      for (const blade of cultivator.blades) {
        blade.getWorldPosition(bladeWorld)
        if (bladeWorld.distanceTo(critter.group.position) < critter.radius + cultivator.bladeScale * 0.45) {
          critter.alive = false
          critter.group.visible = false
          cultivator.kills += 1
          spawnSpark(critter.group.position.clone())
          setTimeout(() => respawnCritter(critter), 2200)
          killed = true
          break
        }
      }

      if (killed) {
        break
      }
    }
  }
}

function respawnCritter(critter: Critter): void {
  critter.alive = true
  critter.group.visible = true
  critter.velocity.set(0, 0, 0)
  critter.group.position.copy(randomArenaPosition(2))
  critter.wanderTarget = randomArenaPosition(2)
}

function tryCollectOrbs(cultivator: Cultivator): void {
  if (cultivator.collectCooldown > 0 || !cultivator.alive) {
    return
  }

  for (let index = orbs.length - 1; index >= 0; index -= 1) {
    const orb = orbs[index]
    const distance = cultivator.group.position.distanceTo(orb.group.position)
    const pickupRadius = cultivator.radius + orb.radius + (cultivator.kind === 'player' ? 1.15 : 0)

    if (distance < pickupRadius) {
      const isSkillPickup = isSkillOrb(orb.type)
      applyUpgrade(cultivator, orb.amount, orb.type)
      cultivator.collectCooldown = cultivator.kind === 'player' ? 0.04 : 0.12
      scene.remove(orb.group)
      orbs.splice(index, 1)
      spawnSpark(orb.group.position.clone())
      createSparks(orb.group.position.clone().setY(0.8), isSkillPickup ? 12 : 8, getOrbStyle(orb.type).core.clone())
      if (cultivator.kind === 'player') {
        audioManager.playCollectSound(isSkillPickup)
      }
      break
    }
  }
}

function ensureOrbCount(delta: number): void {
  orbRespawnTimer = Math.max(0, orbRespawnTimer - delta)
  skillOrbRespawnTimer = Math.max(0, skillOrbRespawnTimer - delta)

  if (orbs.length >= ORB_TARGET_COUNT || orbRespawnTimer > 0) {
    return
  }

  spawnOrbFromCritter()
  orbRespawnTimer = ORB_RESPAWN_INTERVAL
}

function findClosestOrb(position: THREE.Vector3, maxDistance: number): OrbPickup | undefined {
  let closest: OrbPickup | undefined
  let closestDistance = maxDistance * maxDistance

  for (const orb of orbs) {
    const distance = position.distanceToSquared(orb.group.position)
    if (distance < closestDistance) {
      closest = orb
      closestDistance = distance
    }
  }

  return closest
}

function findClosestAliveCultivator(position: THREE.Vector3): Cultivator | undefined {
  let closest: Cultivator | undefined
  let bestDistance = Infinity

  for (const cultivator of cultivators) {
    if (!cultivator.alive) {
      continue
    }

    const distance = position.distanceToSquared(cultivator.group.position)
    if (distance < bestDistance) {
      bestDistance = distance
      closest = cultivator
    }
  }

  return closest
}

function findClosestOrbAttractor(position: THREE.Vector3): Cultivator | undefined {
  let closest: Cultivator | undefined
  let bestScore = Infinity

  for (const cultivator of cultivators) {
    if (!cultivator.alive) {
      continue
    }

    const distanceSq = position.distanceToSquared(cultivator.group.position)
    const score = cultivator.kind === 'player'
      ? distanceSq * (distanceSq < 8.5 * 8.5 ? 0.38 : 0.55)
      : distanceSq

    if (score < bestScore) {
      bestScore = score
      closest = cultivator
    }
  }

  return closest
}

function findNearbyStrongerCultivator(cultivator: Cultivator): Cultivator | undefined {
  let threat: Cultivator | undefined
  let bestDistance = 16 * 16

  for (const other of cultivators) {
    if (other === cultivator || !other.alive) {
      continue
    }

    const distance = cultivator.group.position.distanceToSquared(other.group.position)
    if (distance < bestDistance && other.strength > cultivator.strength + 3) {
      threat = other
      bestDistance = distance
    }
  }

  return threat
}

function findNearbyWeakerCultivator(cultivator: Cultivator): Cultivator | undefined {
  let target: Cultivator | undefined
  let bestDistance = 25 * 25

  for (const other of cultivators) {
    if (other === cultivator || !other.alive) {
      continue
    }

    const distance = cultivator.group.position.distanceToSquared(other.group.position)
    if (distance < bestDistance && cultivator.strength > other.strength + 3) {
      target = other
      bestDistance = distance
    }
  }

  return target
}

function handleArenaBounds(position: THREE.Vector3, velocity: THREE.Vector3): void {
  if (position.x < -ARENA_HALF) {
    position.x = -ARENA_HALF
    velocity.x *= -0.2
  } else if (position.x > ARENA_HALF) {
    position.x = ARENA_HALF
    velocity.x *= -0.2
  }

  if (position.z < -ARENA_HALF) {
    position.z = -ARENA_HALF
    velocity.z *= -0.2
  } else if (position.z > ARENA_HALF) {
    position.z = ARENA_HALF
    velocity.z *= -0.2
  }
}

function resolveObstaclePush(position: THREE.Vector3, radius: number, velocity: THREE.Vector3): void {
  for (const obstacle of obstacles) {
    tempVectorA.copy(position).sub(obstacle.mesh.position).setY(0)
    const distance = tempVectorA.length()
    const limit = obstacle.radius + radius

    if (distance > 0 && distance < limit) {
      const push = limit - distance
      if (tempVectorA.lengthSq() > 0.0001) {
        tempVectorA.normalize()
        position.addScaledVector(tempVectorA, push)
        velocity.addScaledVector(tempVectorA, push * 1.8)
      }
    }
  }
}

function orientCultivator(cultivator: Cultivator, delta: number): void {
  if (cultivator.velocity.lengthSq() >= 0.04) {
    const heading = Math.atan2(cultivator.velocity.x, cultivator.velocity.z)
    cultivator.group.rotation.y = THREE.MathUtils.lerp(cultivator.group.rotation.y, heading, delta * 7.5)
  }
  
  // 确保血条和名称完美朝向摄像机
  cultivator.hpBarGroup.quaternion.copy(cultivator.group.quaternion).invert().multiply(camera.quaternion)
}

function absorbCultivatorEffects(absorber: Cultivator, target: Cultivator): void {
  absorber.score += Math.max(3, Math.round(target.score * 0.5))
  absorber.baseBladeSpinSpeed += Math.max(0.04, (target.baseBladeSpinSpeed - absorber.baseBladeSpinSpeed) * 0.08 + 0.02)
  absorber.bladeSpinSpeed = absorber.baseBladeSpinSpeed
  absorber.speed += Math.max(0.4, (target.speed - target.baseSpeed) * 0.85 + 0.3)
  absorber.hp = Math.min(absorber.maxHp, absorber.hp + 30)
  absorber.hpBar.scale.x = Math.max(0, absorber.hp / absorber.maxHp)
  absorber.hpBar.position.x = (absorber.hpBar.scale.x - 1) * 0.9

  for (const skill of ALL_ACTIVE_SKILLS) {
    const remainingPoints = target.skillCounts[skill]
    if (remainingPoints <= 0) {
      continue
    }

    absorber.skillCounts[skill] += remainingPoints
    target.skillCounts[skill] = 0
  }

  syncSkillLoadout(absorber)
  syncSkillLoadout(target)

  for (let index = 0; index < 4; index += 1) {
    spawnSpark(target.group.position.clone().lerp(absorber.group.position, index / 4))
  }

  syncCultivatorStats(absorber)
}

function defeatCultivator(target: Cultivator, by: Cultivator): void {
  if (!target.alive) {
    return
  }

  target.alive = false
  target.velocity.copy(tempVectorA.multiplyScalar(6))
  target.body.visible = false
  target.head.visible = false
  target.aura.visible = false
  target.crownHalo.visible = false
  target.visualRoot.visible = false
  target.bladeAnchor.visible = false
  target.hpBarGroup.visible = false
  spawnSpark(target.group.position.clone())
  if (isFemaleEnemyCultivator(target)) {
    audioManager.playFemaleDeathSound()
  } else if (isMaleEnemyCultivator(target)) {
    audioManager.playMaleDeathSound()
  }

  if (target.kind === 'enemy' && by !== target) {
    absorbCultivatorEffects(by, target)
  }

  pushDefeatNotice(`${by.name} 击败 ${target.name}`, by.kind === 'player' || target.kind === 'player')

  const droppedOrb = spawnOrbFromCritter('blade', 1)
  droppedOrb.group.position.y = 1.15

  if (target.kind === 'player') {
    endGame(false, `你被 ${by.kind === 'enemy' ? '敌修' : '刀阵'} 击溃，场上还剩 ${aliveEnemyCount()} 名敌修。`)
  }
}

function createSparks(position: THREE.Vector3, count: number, color: THREE.Color): void {
  const actualCount = THREE.MathUtils.clamp(Math.round(count * 0.65), 3, 16)
  for (let i = 0; i < actualCount; i++) {
    const spark = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.12 + Math.random() * 0.08, 0),
      new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.9,
      }),
    )
    spark.position.copy(position)
    spark.position.x += (Math.random() - 0.5) * 0.5
    spark.position.z += (Math.random() - 0.5) * 0.5
    scene.add(spark)

    sparks.push({
      mesh: spark,
      life: 0.3 + Math.random() * 0.2,
      velocity: new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(4.4),
        1.9 + Math.random() * 2.8,
        THREE.MathUtils.randFloatSpread(4.4),
      ),
    })
  }
}

function createBladeClashBurst(position: THREE.Vector3, direction: THREE.Vector3, intensity: number): void {
  const burstGroup = new THREE.Group()
  scene.add(burstGroup)

  const shardCount = THREE.MathUtils.clamp(Math.round(4 + intensity * 3), 4, 8)
  const velocities: THREE.Vector3[] = []
  const spins: THREE.Vector3[] = []
  const materials: THREE.MeshStandardMaterial[] = []

  const baseDir = direction.lengthSq() > 0.001 ? direction.clone().normalize() : new THREE.Vector3(1, 0, 0)
  for (let index = 0; index < shardCount; index += 1) {
    const shardMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.56 + Math.random() * 0.08, 0.75, 0.72),
      emissive: new THREE.Color('#d7f6ff'),
      emissiveIntensity: 0.18,
      roughness: 0.22,
      metalness: 0.76,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
    })
    const shard = new THREE.Mesh(crescentGeometry, shardMaterial)
    shard.scale.setScalar(0.12 + Math.random() * 0.12 + intensity * 0.03)
    shard.position.copy(position)
    shard.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
    burstGroup.add(shard)

    const spread = new THREE.Vector3(
      baseDir.x + THREE.MathUtils.randFloatSpread(1.4),
      0.25 + Math.random() * 0.55,
      baseDir.z + THREE.MathUtils.randFloatSpread(1.4),
    ).normalize()
    velocities.push(spread.multiplyScalar(5.4 + Math.random() * 3.6 + intensity * 2.4))
    spins.push(new THREE.Vector3(
      THREE.MathUtils.randFloatSpread(16),
      THREE.MathUtils.randFloatSpread(16),
      THREE.MathUtils.randFloatSpread(16),
    ))
    materials.push(shardMaterial)
  }

  let life = 0.42 + intensity * 0.12
  activeEffects.push({
    update: (delta) => {
      life -= delta
      const fade = Math.max(0, life / (0.42 + intensity * 0.12))
      burstGroup.children.forEach((child, index) => {
        child.position.addScaledVector(velocities[index], delta)
        velocities[index].y -= delta * 10
        child.rotation.x += spins[index].x * delta
        child.rotation.y += spins[index].y * delta
        child.rotation.z += spins[index].z * delta
        child.scale.multiplyScalar(0.992)
        materials[index].opacity = fade * 0.95
      })

      if (life <= 0) {
        scene.remove(burstGroup)
        burstGroup.children.forEach((_child, index) => {
          materials[index].dispose()
        })
        return true
      }
      return false
    },
  })
}

function spawnSpark(position: THREE.Vector3, power = 1): void {
  const spark = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.16 + power * 0.08, 0),
    new THREE.MeshBasicMaterial({
      color: 0xf7ffff,
      transparent: true,
      opacity: 0.95,
    }),
  )
  spark.position.copy(position)
  scene.add(spark)

  sparks.push({
    mesh: spark,
    life: 0.28 + power * 0.16,
    velocity: new THREE.Vector3(
      THREE.MathUtils.randFloatSpread(2.2 + power * 2.2),
      1.6 + Math.random() * (1.2 + power * 1.4),
      THREE.MathUtils.randFloatSpread(2.2 + power * 2.2),
    ),
  })
}

function updateSparks(delta: number): void {
  for (let index = sparks.length - 1; index >= 0; index -= 1) {
    const spark = sparks[index]
    spark.life -= delta
    spark.mesh.position.addScaledVector(spark.velocity, delta)
    spark.velocity.y -= delta * 10
    spark.mesh.scale.setScalar(0.6 + spark.life * 2.2)
    ;(spark.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(spark.life * 2.4, 0)

    if (spark.life <= 0) {
      scene.remove(spark.mesh)
      spark.mesh.geometry.dispose()
      ;(spark.mesh.material as THREE.Material).dispose()
      sparks.splice(index, 1)
    }
  }
}

function triggerScreenShake(intensity: number): void {
  const clampedIntensity = THREE.MathUtils.clamp(intensity, 0, 1)
  screenShakeStrength = Math.max(screenShakeStrength, 0.16 + clampedIntensity * 0.88)
  screenShakeDuration = Math.max(screenShakeDuration, 0.16 + clampedIntensity * 0.28)
  screenShakeTime = Math.max(screenShakeTime, screenShakeDuration)
  triggerImpactFlash(0.12 + clampedIntensity * 0.88)
}

function triggerImpactFlash(intensity: number): void {
  const clampedIntensity = THREE.MathUtils.clamp(intensity, 0, 1)
  impactFlashStrength = Math.max(impactFlashStrength, 0.14 + clampedIntensity * 0.72)
  impactFlashDuration = Math.max(impactFlashDuration, 0.12 + clampedIntensity * 0.18)
  impactFlashTime = Math.max(impactFlashTime, impactFlashDuration)
}

function triggerHitStop(duration: number): void {
  hitStopTime = Math.max(hitStopTime, THREE.MathUtils.clamp(duration, 0.01, 0.085))
}

function updateCamera(delta: number): void {
  cameraFollowPosition.lerp(player.group.position, 1 - Math.exp(-delta * 8))
  desiredCameraPosition.copy(cameraFollowPosition)
  desiredCameraPosition.add(cameraOffset)

  cameraLookTarget.x = THREE.MathUtils.lerp(cameraLookTarget.x, player.group.position.x, 1 - Math.exp(-delta * 10))
  cameraLookTarget.z = THREE.MathUtils.lerp(cameraLookTarget.z, player.group.position.z, 1 - Math.exp(-delta * 10))
  cameraLookTarget.y = THREE.MathUtils.lerp(
    cameraLookTarget.y,
    2.8 + player.group.position.y * 0.12 + player.visualRoot.position.y * 0.3,
    1 - Math.exp(-delta * 8),
  )
  desiredLookTarget.copy(cameraLookTarget)

  if (screenShakeTime > 0) {
    screenShakeTime = Math.max(0, screenShakeTime - delta)
    const decay = screenShakeDuration > 0 ? screenShakeTime / screenShakeDuration : 0
    const currentStrength = screenShakeStrength * decay * decay
    cameraShakeOffset.set(
      THREE.MathUtils.randFloatSpread(currentStrength),
      THREE.MathUtils.randFloatSpread(currentStrength * 0.85),
      THREE.MathUtils.randFloatSpread(currentStrength),
    )
    if (currentStrength > 0.22) {
      const fullscreenOffsetX = THREE.MathUtils.randFloatSpread(currentStrength * 30)
      const fullscreenOffsetY = THREE.MathUtils.randFloatSpread(currentStrength * 22)
      const fullscreenScale = 1 + currentStrength * 0.015
      const fullscreenRotate = THREE.MathUtils.randFloatSpread(currentStrength * 1.9)
      const fullscreenShake =
        `translate(${fullscreenOffsetX.toFixed(2)}px, ${fullscreenOffsetY.toFixed(2)}px) ` +
        `scale(${fullscreenScale.toFixed(3)}) rotate(${fullscreenRotate.toFixed(2)}deg)`
      renderer.domElement.style.transform = fullscreenShake
      hudRoot.style.transform = fullscreenShake
      overlay.style.transform = fullscreenShake
    } else {
      renderer.domElement.style.transform = ''
      hudRoot.style.transform = ''
      overlay.style.transform = ''
    }
  } else {
    screenShakeDuration = 0
    screenShakeStrength = 0
    cameraShakeOffset.set(0, 0, 0)
    renderer.domElement.style.transform = ''
    hudRoot.style.transform = ''
    overlay.style.transform = ''
  }

  if (impactFlashTime > 0) {
    impactFlashTime = Math.max(0, impactFlashTime - delta)
    const flashDecay = impactFlashDuration > 0 ? impactFlashTime / impactFlashDuration : 0
    const flashOpacity = impactFlashStrength * flashDecay * flashDecay * 0.52
    impactFlash.style.opacity = flashOpacity.toFixed(3)
    impactFlash.style.transform = `scale(${(1 + (1 - flashDecay) * 0.08 + impactFlashStrength * 0.03).toFixed(3)})`
  } else {
    impactFlashDuration = 0
    impactFlashStrength = 0
    impactFlash.style.opacity = '0'
    impactFlash.style.transform = 'scale(1)'
  }

  desiredCameraPosition.add(cameraShakeOffset)
  desiredLookTarget.addScaledVector(cameraShakeOffset, 0.18)

  camera.position.lerp(desiredCameraPosition, 1 - Math.exp(-delta * 6))
  camera.lookAt(desiredLookTarget)
}

function updateHud(): void {
  syncSkillLoadout(player)
  hudLevel.textContent = spiritPowerValue(player.score)
  hudBlades.textContent = `${player.bladeCount} 把`
  hudMoveSpeed.textContent = `${(player.speed / player.baseSpeed).toFixed(1)}x`
  hudKills.textContent = String(player.kills)
  hudSkillCountLightning.textContent = `x${player.skillCounts.lightning}`
  hudSkillCountDash.textContent = `x${player.skillCounts.dash}`
  hudSkillCountWall.textContent = `x${player.skillCounts.wall}`

  const selectedSkill = player.skills[player.selectedSkillIndex]
  hudSkillSlotLightning.classList.toggle('active', selectedSkill === 'lightning')
  hudSkillSlotDash.classList.toggle('active', selectedSkill === 'dash')
  hudSkillSlotWall.classList.toggle('active', selectedSkill === 'wall')
  hudSkillSlotLightning.classList.toggle('empty', player.skillCounts.lightning <= 0)
  hudSkillSlotDash.classList.toggle('empty', player.skillCounts.dash <= 0)
  hudSkillSlotWall.classList.toggle('empty', player.skillCounts.wall <= 0)
  renderDefeatFeed()
}

function pushDefeatNotice(text: string, accent = false): void {
  defeatNotices.unshift({ id: ++defeatNoticeSequence, text, life: accent ? 3.8 : 3, accent })
  if (defeatNotices.length > 4) {
    defeatNotices.length = 4
  }
}

function updateDefeatNotices(delta: number): void {
  for (let index = defeatNotices.length - 1; index >= 0; index -= 1) {
    defeatNotices[index].life -= delta
    if (defeatNotices[index].life <= 0) {
      defeatNotices.splice(index, 1)
    }
  }
}

function renderDefeatFeed(): void {
  const latestNotice = defeatNotices[0]
  if (!latestNotice) {
    defeatFeed.replaceChildren()
    defeatFeed.classList.remove('accent')
    defeatFeed.classList.remove('visible')
    defeatFeed.classList.remove('pulse')
    defeatFeed.style.opacity = '0'
    renderedDefeatNoticeId = -1
    return
  }

  if (latestNotice.id !== renderedDefeatNoticeId) {
    renderedDefeatNoticeId = latestNotice.id
    defeatFeed.replaceChildren()

    const text = document.createElement('span')
    text.className = 'defeat-feed-text'
    text.textContent = latestNotice.text

    defeatFeed.append(text)
    defeatFeed.classList.remove('pulse')
    void defeatFeed.offsetWidth
    defeatFeed.classList.add('pulse')
  }

  const lifeBase = latestNotice.accent ? 3.8 : 3
  defeatFeed.classList.toggle('accent', latestNotice.accent)
  defeatFeed.classList.add('visible')
  defeatFeed.style.opacity = THREE.MathUtils.clamp(latestNotice.life / lifeBase, 0.18, 1).toFixed(2)
}

function aliveEnemyCount(): number {
  return cultivators.filter((cultivator) => cultivator.kind === 'enemy' && cultivator.alive).length
}

function spiritPowerValue(score: number): string {
  return Math.max(0, Math.round(score)).toString()
}

function checkWinLoss(): void {
  if (gameEnded) {
    return
  }

  if (!player.alive) {
    return
  }

  if (aliveEnemyCount() === 0) {
    endGame(true, `你斩尽敌修，累计战果 ${player.kills}，当前灵力值 ${spiritPowerValue(player.score)}。`)
  }
}

function endGame(victory: boolean, message: string): void {
  gamePaused = false
  pauseOverlay.classList.add('hidden')
  gameEnded = true
  overlay.classList.remove('hidden')
  overlayTitle.textContent = victory ? '渡劫成功' : '渡劫失败'
  overlayText.textContent = message
}
