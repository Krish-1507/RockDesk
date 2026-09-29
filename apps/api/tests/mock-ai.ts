import type { AIProvider, TicketAnalysis, TicketAnalysisInput } from "@chat-to-ticket/shared";

/** Scripted mock AI: each analyzeTicket call consumes the next response. */
export class MockAIProvider implements AIProvider {
  private queue: TicketAnalysis[] = [];
  calls: TicketAnalysisInput[] = [];
  failWith: Error | null = null;

  enqueue(response: TicketAnalysis): void {
    this.queue.push(response);
  }

  async analyzeTicket(input: TicketAnalysisInput): Promise<TicketAnalysis> {
    this.calls.push(input);
    if (this.failWith) throw this.failWith;
    const next = this.queue.shift();
    if (!next) throw new Error("MockAIProvider: no response enqueued");
    return next;
  }
}

export function baseAnalysis(overrides: Partial<TicketAnalysis> = {}): TicketAnalysis {
  return {
    intent: "create_ticket",
    status: "needs_clarification",
    normalizedEnglishTitle: null,
    description: null,
    assigneeCandidate: null,
    assigneeResolution: "unknown",
    resolvedAssigneeId: null,
    dueDate: null,
    dueDateRaw: null,
    dueDateResolution: "unknown",
    priority: "Medium",
    tags: [],
    language: "en",
    missingFields: [],
    userResponse: "mock reply",
    ...overrides,
  };
}
