import { promises as fs } from 'fs'
import * as path from 'path'
import { Context } from 'koishi'
import sharp from 'sharp'

// 定义物品和容器的类型接口，以便 TypeScript 进行类型检查
// （这些接口可以根据 JSON 文件的具体结构进行细化）
export interface Item {
  id: number
  objectName: string
  grade: number
  [key: string]: any
}

export interface Container {
  [key: string]: any
}

export class DataManager {
  public items: Map<number, Item> = new Map()
  public containers: Record<string, Container> = {}
  private dataPath: string

  constructor(public ctx: Context, private config: any) {
    // 固定使用插件自带的资源路径
    this.dataPath = path.resolve(__dirname, '../resource')
  }

  async load() {
    // 加载容器配置
    const containerConfigPath = path.resolve(__dirname, '../container_configs.json')
    try {
      const containerContent = await fs.readFile(containerConfigPath, 'utf-8')
      this.containers = JSON.parse(containerContent)
    } catch (error) {
      console.error('Failed to load container configs:', error)
      // 可以在这里进行更详细的错误处理，例如抛出错误或使用默认值
    }

    // 加载所有物品
    const itemFiles = ['armor.json', 'bag.json', 'chest.json', 'helmet.json', 'collection.json']
    for (const fileName of itemFiles) {
      const filePath = path.join(this.dataPath, fileName)
      try {
        const fileContent = await fs.readFile(filePath, 'utf-8')
        const items: Item[] = JSON.parse(fileContent)
        for (const item of items) {
          this.items.set(item.id, item)
        }
      } catch (error) {
        console.error(`Failed to load item file ${fileName}:`, error)
      }
    }

    console.log(`Loaded ${Object.keys(this.containers).length} containers and ${this.items.size} items.`)
  }
}

// 图片生成的主函数，后续将在这里实现
// 生成多物品网格图片，完整移植 Python 版逻辑
export async function generateContainerImage(ctx: Context, dataManager: DataManager, containerKey: string, userName: string): Promise<Buffer> {
  const container = dataManager.containers[containerKey]
  if (!container) throw new Error(`Unknown container ${containerKey}`)

  // 从 DataManager 获取所有物品
  const allItems = Array.from(dataManager.items.values())

  // 按容器类型过滤与权重选择
  const allowedItems = allItems.filter(it => container.allow_types.includes(it.secondClass))
  let weighted: Item[] = []
  for (const it of allowedItems) {
    const w = container.grade_weights?.[it.grade] ?? 1
    weighted.push(...Array(w).fill(it))
  }

  const count = Math.min(weighted.length, Math.floor(Math.random() * (container.max_items - container.min_items + 1)) + container.min_items)
  const selected = []
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * weighted.length)
    selected.push(weighted[idx])
    weighted.splice(idx, 1)
  }

  // 画布参数
  const cellSize = 150
  const gridSize = container.grid_size
  const gridImage = await sharp({
    create: {
      width: gridSize * cellSize,
      height: gridSize * cellSize,
      channels: 4,
      background: { r: 28, g: 33, b: 34, alpha: 0.8 },
    }
  }).png().toBuffer()

  const gridOccupied = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));
  const gradeColors: Record<number, { r: number; g: number; b: number; alpha: number; }> = {
    1: { r: 206, g: 213, b: 213, alpha: 1 },
    2: { r: 56, g: 139, b: 35, alpha: 1 },
    3: { r: 110, g: 137, b: 203, alpha: 1 },
    4: { r: 151, g: 99, b: 197, alpha: 1 },
    5: { r: 224, g: 170, b: 88, alpha: 1 },
    6: { r: 191, g: 83, b: 78, alpha: 1 },
  };

  let currentGridImage = gridImage;

  for (const item of selected) {
    const itemWidth = item.width * cellSize;
    const itemHeight = item.length * cellSize;

    let originalImg: sharp.Sharp;
    try {
      const arrBuf: ArrayBuffer = await ctx.http.get(item.pic, { responseType: 'arraybuffer' });
      originalImg = sharp(Buffer.from(arrBuf));
    } catch (e) {
      console.error(`Failed to download image for ${item.objectName}:`, e);
      originalImg = sharp({
        create: {
          width: itemWidth,
          height: itemHeight,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 0.5 }
        }
      });
    }

    const metadata = await originalImg.metadata();
    const aspectRatio = (metadata.width && metadata.height) ? (metadata.width / metadata.height) : 1;

    let newWidth: number, newHeight: number;
    if (aspectRatio > 1) { // 宽大于高
      newWidth = itemWidth;
      newHeight = Math.round(itemWidth / aspectRatio);
    } else { // 高大于宽
      newHeight = itemHeight;
      newWidth = Math.round(itemHeight * aspectRatio);
    }

    const resizedImgBuffer = await originalImg.resize(newWidth, newHeight, { fit: 'inside' }).png().toBuffer();

    const xOffset = Math.floor((itemWidth - newWidth) / 2);
    const yOffset = Math.floor((itemHeight - newHeight) / 2);

    const background = sharp({
      create: {
        width: itemWidth,
        height: itemHeight,
        channels: 4,
        background: gradeColors[item.grade] ?? { r: 255, g: 255, b: 255, alpha: 1 },
      }
    });

    const finalItemImageBuffer = await background
      .composite([{ input: resizedImgBuffer, top: yOffset, left: xOffset }])
      .png()
      .toBuffer();

    let placed = false;
    for (let y = 0; y <= gridSize - item.length; y++) {
      for (let x = 0; x <= gridSize - item.width; x++) {
        let canPlace = true;
        for (let i = 0; i < item.length; i++) {
          for (let j = 0; j < item.width; j++) {
            if (gridOccupied[y + i][x + j]) {
              canPlace = false;
              break;
            }
          }
          if (!canPlace) break;
        }

        if (canPlace) {
          currentGridImage = await sharp(currentGridImage)
            .composite([{ input: finalItemImageBuffer, top: y * cellSize, left: x * cellSize }])
            .png()
            .toBuffer();

          for (let i = 0; i < item.length; i++) {
            for (let j = 0; j < item.width; j++) {
              gridOccupied[y + i][x + j] = true;
            }
          }
          placed = true;
          break;
        }
      }
      if (placed) break;
    }
  }

  const titledHeight = gridSize * cellSize + 80
  const fullCanvas = sharp({
    create: {
      width: gridSize * cellSize,
      height: titledHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  });

  // 容器图标
  let iconBuffer: Buffer | null = null
  try {
    const iconPath = path.resolve(__dirname, '../resource', container.icon)
    iconBuffer = await fs.readFile(iconPath)
  } catch {}

  const titleSvg = `
    <svg width="${gridSize * cellSize}" height="80">
      <rect width="100%" height="100%" fill="rgba(128,128,128,0.7)"/>
      <text x="50%" y="50%" font-size="24" text-anchor="middle" fill="#fff" dy=".3em">${userName} 摸到了 ${container.name}</text>
    </svg>
  `

  let layers: sharp.OverlayOptions[] = [];
  if (iconBuffer) {
    layers.push({ input: iconBuffer, top: 5, left: 20 });
  }
  layers.push({ input: Buffer.from(titleSvg), top: 0, left: 0 });
  layers.push({ input: currentGridImage, top: 80, left: 0 });

  const finalImage = await fullCanvas.composite(layers).png().toBuffer();
  return finalImage;
}