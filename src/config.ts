import { Schema } from 'koishi'

export interface Config {
        timeout: number
        maxRetries: number
}

export const Config: Schema<Config> = Schema.object({
        timeout: Schema.number().description('操作超时时间（毫秒）。').default(60000),
        maxRetries: Schema.number().description('“还要吃”的最大次数。').default(5),
})
