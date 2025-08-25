import { Schema } from 'koishi'

export interface Config {
  aliases: string[]
  timeout: number
  maxRetries: number
}

export const Config: Schema<Config> = Schema.object({
  aliases: Schema.array(String).description('指令别名。').default(['跑刀']),
  timeout: Schema.number().description('操作超时时间（毫秒）。').default(60000),
  maxRetries: Schema.number().description('“还要吃”的最大次数。').default(5),
})