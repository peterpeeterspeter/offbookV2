import { SecurityMetadata, RetentionPolicy } from './types';
interface CleanupTask {
    id: string;
    resourceId: string;
    scheduledTime: number;
    policy: RetentionPolicy;
    metadata: SecurityMetadata;
}
/**
 * Service for managing secure data deletion and cleanup
 */
export declare class DataCleanupService {
    private readonly deleteData;
    private readonly archiveData;
    private tasks;
    private isRunning;
    private cleanupInterval;
    constructor(deleteData: (resourceId: string) => Promise<void>, archiveData: (resourceId: string) => Promise<void>);
    /**
     * Starts the cleanup service
     */
    start(intervalMs?: number): void;
    /**
     * Stops the cleanup service
     */
    stop(): void;
    /**
     * Schedules data for cleanup
     */
    scheduleCleanup(resourceId: string, metadata: SecurityMetadata, policy: RetentionPolicy): void;
    /**
     * Cancels a scheduled cleanup task
     */
    cancelCleanup(resourceId: string): void;
    /**
     * Runs the cleanup process
     */
    private runCleanup;
    /**
     * Performs secure deletion of data
     */
    private secureDelete;
    /**
     * Verifies that data was properly overwritten
     */
    private verifyOverwrite;
    /**
     * Checks if a resource still exists
     */
    private resourceExists;
    /**
     * Overwrites data with random content before deletion
     */
    private overwriteWithRandom;
    /**
     * Reschedules a failed cleanup task
     */
    private rescheduleFailedTask;
    /**
     * Gets the retry count for a task
     */
    private getRetryCount;
    /**
     * Gets all pending cleanup tasks
     */
    getPendingTasks(): CleanupTask[];
    /**
     * Immediately runs cleanup for a specific resource
     */
    forceCleanup(resourceId: string): Promise<void>;
}
export {};
