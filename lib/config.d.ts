import { Schema } from 'koishi';
export interface Config {
    aliases: string[];
    timeout: number;
    maxRetries: number;
}
export declare const Config: Schema<Config>;
