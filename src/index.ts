import { Context, h } from 'koishi'
import * as path from 'path'
import { Config } from './config'
import { DataManager, generateContainerImage } from './image'

export const name = 'koishi-plugin-deltaforce-simulator'

export * from './config'

export async function apply(ctx: Context, config: Config) {
  const dataManager = new DataManager(ctx, config)
  await dataManager.load()

  const cmd = ctx.command('deltaforce', '开始模拟跑刀')

  for (const alias of config.aliases) {
    cmd.alias(alias)
  }

  cmd.action(async ({ session }) => {
    if (!session) return;

    try {
      let retries = 0
      const possibleContainers = ["small_safe", "large_safe", "bird_nest", "air_box", "cnw", "gjcwx"]
      
      // 初始开箱
      let containerType = possibleContainers[Math.floor(Math.random() * possibleContainers.length)]
      const containerName = dataManager.containers[containerType]?.name || containerType
      await session.send(`发现了一个 ${containerName}，正在开启...`)
      
      const imageBuffer = await generateContainerImage(ctx, dataManager, containerType, session.username || '玩家')
      await session.send(h.image(imageBuffer, 'image/png'))

      while (retries < config.maxRetries) {
        await session.send('还要吃吗？（回复“还要吃”继续，或“撤离”结束）')
        const reply = await session.prompt(config.timeout)

        // 新增：30% 概率死亡事件
        if (typeof reply === 'string' && reply.trim() === '还要吃' && Math.random() < 0.3) {
          await session.send('你被一脚踢死了')
          const failImgPath = path.resolve(__dirname, '../resource/fail.jpg')
          const failImgBuffer = await import('fs').then(fs => fs.promises.readFile(failImgPath))
          await session.send(h.image(failImgBuffer, 'image/jpeg'))
          return
        }

        if (typeof reply !== 'string') {
          await session.send('操作超时，已自动撤离。')
          return
        }

        if (reply.trim() === '撤离') {
          await session.send('成功撤离！')
          return
        }

        if (reply.trim() !== '还要吃') {
          continue
        }

        retries++
        containerType = possibleContainers[Math.floor(Math.random() * possibleContainers.length)]
        const newContainerName = dataManager.containers[containerType]?.name || containerType
        await session.send(`又发现了一个 ${newContainerName}，正在开启...`)
        
        const newImageBuffer = await generateContainerImage(ctx, dataManager, containerType, session.username || '玩家')
        await session.send(h.image(newImageBuffer, 'image/png'))
      }

      await session.send(`已达到最大次数，自动撤离。`)
    } catch (error) {
      ctx.logger.error('Error in deltaforce command:', error)
      return '执行过程中遇到错误，请查看控制台日志。'
    }
  })
}