"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = void 0;
const koishi_1 = require("koishi");
exports.Config = koishi_1.Schema.object({
    aliases: koishi_1.Schema.array(String).description('指令别名。').default(['跑刀']),
    timeout: koishi_1.Schema.number().description('操作超时时间（毫秒）。').default(60000),
    maxRetries: koishi_1.Schema.number().description('“还要吃”的最大次数。').default(5),
});
