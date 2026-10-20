import { Queue as AbstractQueue, type QueueMessage } from "./index";

class CloudflareQueue extends AbstractQueue {
  constructor(private readonly binding: Queue<QueueMessage>) {
    super();
  }

  async send(message: QueueMessage) {
    await this.binding.send(message);
  }

  async sendBatch(messages: QueueMessage[]) {
    if (messages.length === 0) return;
    await this.binding.sendBatch(messages.map((body) => ({ body })));
  }
}

export { CloudflareQueue };
