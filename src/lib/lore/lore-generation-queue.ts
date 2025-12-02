// src/lib/lore/lore-generation-queue.ts
import { prisma } from '@/lib/db';

export interface LoreGenerationJob {
  id: string;
  campaignId: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  phase?: string;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * LoreGenerationQueue manages the lifecycle of lore generation jobs.
 * Uses campaignId as job ID for automatic idempotency.
 */
export class LoreGenerationQueue {
  private static readonly STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

  /**
   * Enqueue a lore generation job for a campaign.
   * Idempotent - returns existing job if one exists.
   */
  async enqueue(campaignId: string): Promise<{
    success: boolean;
    job?: LoreGenerationJob;
    error?: string;
    alreadyExists?: boolean;
  }> {
    try {
      // Verify campaign exists and has sufficient description
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { id: true, description: true }
      });

      if (!campaign) {
        return { success: false, error: 'Campaign not found' };
      }

      if (!campaign.description || campaign.description.trim().length < 50) {
        return {
          success: false,
          error: 'Campaign description too short for lore generation (minimum 50 characters)'
        };
      }

      // Check for existing lore record
      const existing = await prisma.campaignLore.findUnique({
        where: { campaignId }
      });

      if (existing) {
        // Handle various existing states
        if (existing.generationStatus === 'completed') {
          return {
            success: true,
            alreadyExists: true,
            job: this.recordToJob(existing)
          };
        }

        if (existing.generationStatus === 'generating') {
          // Check for stale job
          const staleThreshold = new Date(Date.now() - LoreGenerationQueue.STALE_THRESHOLD_MS);
          if (existing.startedAt && existing.startedAt < staleThreshold) {
            // Reset stale job
            const updated = await prisma.campaignLore.update({
              where: { campaignId },
              data: {
                generationStatus: 'pending',
                generationError: 'Previous generation attempt timed out',
                startedAt: null
              }
            });
            return { success: true, job: this.recordToJob(updated) };
          }
          // Still processing
          return {
            success: true,
            alreadyExists: true,
            job: this.recordToJob(existing)
          };
        }

        if (existing.generationStatus === 'failed') {
          // Reset for retry
          const updated = await prisma.campaignLore.update({
            where: { campaignId },
            data: {
              generationStatus: 'pending',
              generationError: null,
              startedAt: null
            }
          });
          return { success: true, job: this.recordToJob(updated) };
        }

        // Status is 'pending'
        return { success: true, job: this.recordToJob(existing) };
      }

      // Create new lore record
      const newLore = await prisma.campaignLore.create({
        data: {
          campaignId,
          generationStatus: 'pending'
        }
      });

      return { success: true, job: this.recordToJob(newLore) };
    } catch (error) {
      console.error('Error enqueueing lore generation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }


  /**
   * Claim a job for processing using atomic update.
   * Only one worker can claim a job.
   */
  async claimNextJob(): Promise<LoreGenerationJob | null> {
    const pendingJobs = await prisma.campaignLore.findMany({
      where: { generationStatus: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: 5
    });

    for (const job of pendingJobs) {
      // Atomic claim - only succeeds if status is still 'pending'
      const result = await prisma.campaignLore.updateMany({
        where: {
          campaignId: job.campaignId,
          generationStatus: 'pending'
        },
        data: {
          generationStatus: 'generating',
          startedAt: new Date()
        }
      });

      if (result.count === 1) {
        const claimed = await prisma.campaignLore.findUnique({
          where: { campaignId: job.campaignId }
        });
        return claimed ? this.recordToJob(claimed) : null;
      }
    }

    return null;
  }

  /**
   * Mark a job as completed.
   */
  async markCompleted(campaignId: string): Promise<void> {
    await prisma.campaignLore.update({
      where: { campaignId },
      data: {
        generationStatus: 'completed',
        completedAt: new Date(),
        generationError: null,
        generationPhase: null
      }
    });
  }

  /**
   * Mark a job as failed with error message.
   */
  async markFailed(campaignId: string, error: string): Promise<void> {
    await prisma.campaignLore.update({
      where: { campaignId },
      data: {
        generationStatus: 'failed',
        generationError: error
      }
    });
  }

  /**
   * Update current generation phase for progress tracking.
   */
  async updatePhase(campaignId: string, phase: string): Promise<void> {
    await prisma.campaignLore.update({
      where: { campaignId },
      data: { generationPhase: phase }
    });
  }

  /**
   * Get current status of a job.
   */
  async getStatus(campaignId: string): Promise<LoreGenerationJob | null> {
    const record = await prisma.campaignLore.findUnique({
      where: { campaignId }
    });
    return record ? this.recordToJob(record) : null;
  }

  private recordToJob(record: {
    campaignId: string;
    generationStatus: string;
    generationPhase: string | null;
    generationError: string | null;
    createdAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
  }): LoreGenerationJob {
    return {
      id: record.campaignId,
      campaignId: record.campaignId,
      status: record.generationStatus as LoreGenerationJob['status'],
      phase: record.generationPhase || undefined,
      error: record.generationError || undefined,
      createdAt: record.createdAt,
      startedAt: record.startedAt || undefined,
      completedAt: record.completedAt || undefined
    };
  }
}

export const loreGenerationQueue = new LoreGenerationQueue();
