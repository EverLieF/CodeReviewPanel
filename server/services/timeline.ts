import { randomUUID } from "crypto";
import { JsonStore } from "../store/db";
import type { TimelineEvent } from "@shared/types";

class TimelineService {
  private readonly store = new JsonStore<TimelineEvent>("timeline");

  async addEvent(
    type: TimelineEvent["type"],
    data: {
      projectId?: string;
      submissionId?: string;
      runId?: string;
      message?: string;
      details?: unknown;
    } = {}
  ): Promise<TimelineEvent> {
    const event: TimelineEvent = {
      id: randomUUID(),
      type,
      projectId: data.projectId,
      submissionId: data.submissionId,
      runId: data.runId,
      message: data.message,
      details: data.details,
      createdAt: new Date().toISOString(),
    };

    await this.store.save(event);
    return event;
  }

  async getEvents(): Promise<TimelineEvent[]> {
    const events = await this.store.list();
    // Сортируем по времени создания (новые сверху)
    return events.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getEventsByProject(projectId: string): Promise<TimelineEvent[]> {
    const events = await this.store.list();
    return events
      .filter(event => event.projectId === projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getEventsBySubmission(submissionId: string): Promise<TimelineEvent[]> {
    const events = await this.store.list();
    return events
      .filter(event => event.submissionId === submissionId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export const timelineService = new TimelineService();
