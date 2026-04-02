/**
 * 审稿模块 - 唯一入口点
 * 外部只需要调用这个函数就能走完所有审核流程
 * 低耦合高内聚，模块化设计
 */
import { AuditOptions, AuditTaskResult } from './types';
export * from './types';
export * from './audit-auto-service';
/**
 * 运行完整审稿流程 - 唯一对外暴露的函数
 * @param options 审核选项
 * @returns 审核任务结果列表
 */
export declare function runAuditPipeline(options?: AuditOptions): Promise<AuditTaskResult[]>;
declare const _default: {
    run: typeof runAuditPipeline;
};
export default _default;
