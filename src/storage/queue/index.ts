type QueueMessage = {
  type: string;
  payload: unknown;
};

abstract class Queue {
  abstract send(message: QueueMessage): Promise<void>;
  abstract sendBatch(messages: QueueMessage[]): Promise<void>;
}

export type { QueueMessage };
export { Queue };
