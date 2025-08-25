"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.name = void 0;
exports.apply = apply;
const koishi_1 = require("koishi");
const path = __importStar(require("path"));
const image_1 = require("./image");
exports.name = 'koishi-plugin-deltaforce-simulator';
__exportStar(require("./config"), exports);
async function apply(ctx, config) {
    const dataManager = new image_1.DataManager(ctx, config);
    await dataManager.load();
    const cmd = ctx.command('deltaforce', '开始模拟跑刀');
    for (const alias of config.aliases) {
        cmd.alias(alias);
    }
    cmd.action(async ({ session }) => {
        if (!session)
            return;
        try {
            let retries = 0;
            const possibleContainers = ["small_safe", "large_safe", "bird_nest", "air_box", "cnw", "gjcwx"];
            // 初始开箱
            let containerType = possibleContainers[Math.floor(Math.random() * possibleContainers.length)];
            const containerName = dataManager.containers[containerType]?.name || containerType;
            await session.send(`发现了一个 ${containerName}，正在开启...`);
            const imageBuffer = await (0, image_1.generateContainerImage)(ctx, dataManager, containerType, session.username || '玩家');
            await session.send(koishi_1.h.image(imageBuffer, 'image/png'));
            while (retries < config.maxRetries) {
                await session.send('还要吃吗？（回复“还要吃”继续，或“撤离”结束）');
                const reply = await session.prompt(config.timeout);
                // 新增：30% 概率死亡事件
                if (typeof reply === 'string' && reply.trim() === '还要吃' && Math.random() < 0.3) {
                    await session.send('你被一脚踢死了');
                    const failImgPath = path.resolve(__dirname, '../resource/fail.jpg');
                    const failImgBuffer = await Promise.resolve().then(() => __importStar(require('fs'))).then(fs => fs.promises.readFile(failImgPath));
                    await session.send(koishi_1.h.image(failImgBuffer, 'image/jpeg'));
                    return;
                }
                if (typeof reply !== 'string') {
                    await session.send('操作超时，已自动撤离。');
                    return;
                }
                if (reply.trim() === '撤离') {
                    await session.send('成功撤离！');
                    return;
                }
                if (reply.trim() !== '还要吃') {
                    continue;
                }
                retries++;
                containerType = possibleContainers[Math.floor(Math.random() * possibleContainers.length)];
                const newContainerName = dataManager.containers[containerType]?.name || containerType;
                await session.send(`又发现了一个 ${newContainerName}，正在开启...`);
                const newImageBuffer = await (0, image_1.generateContainerImage)(ctx, dataManager, containerType, session.username || '玩家');
                await session.send(koishi_1.h.image(newImageBuffer, 'image/png'));
            }
            await session.send(`已达到最大次数，自动撤离。`);
        }
        catch (error) {
            ctx.logger.error('Error in deltaforce command:', error);
            return '执行过程中遇到错误，请查看控制台日志。';
        }
    });
}
