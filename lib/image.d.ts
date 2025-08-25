import { Context } from 'koishi';
export interface Item {
    id: number;
    objectName: string;
    grade: number;
    [key: string]: any;
}
export interface Container {
    [key: string]: any;
}
export declare class DataManager {
    ctx: Context;
    private config;
    items: Map<number, Item>;
    containers: Record<string, Container>;
    private dataPath;
    constructor(ctx: Context, config: any);
    load(): Promise<void>;
}
export declare function generateContainerImage(ctx: Context, dataManager: DataManager, containerKey: string, userName: string): Promise<Buffer>;
