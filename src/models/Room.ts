import { Message } from './Message';

export class Room {
  public messages: Message[] = [];

  constructor(
    public id: number,
    public title: string,
    public namespace: string,
    public isPrivate = false,
  ) {}

  addMessage(msg: Message) {
    this.messages.push(msg);
  }

  clearMessages() {
    this.messages = [];
  }

  toArray() {
    return {
      id: this.id,
      title: this.title,
      namespace: this.namespace,
      isPrivate: this.isPrivate,
      messages: this.messages,
    };
  }
}
