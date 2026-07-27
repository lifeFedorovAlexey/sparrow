export class InMemoryRunLog {
  constructor({ clock = () => new Date() } = {}) {
    this.clock = clock;
    this.events = [];
  }

  record({ runId, agent, status, details = null }) {
    const event = {
      runId,
      agent,
      status,
      details,
      timestamp: this.clock().toISOString(),
    };
    this.events.push(event);
    return event;
  }
}
