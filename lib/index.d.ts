import { Context } from 'koishi';
import { Config } from './config';
export declare const name = "koishi-plugin-deltaforce-simulator";
export * from './config';
export declare function apply(ctx: Context, config: Config): Promise<void>;
