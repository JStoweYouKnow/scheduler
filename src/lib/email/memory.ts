import type { GmailContact, GmailDraft, GmailMessage, GmailPort, SentMail } from "./port";

export class MemoryGmail implements GmailPort {
  messages: GmailMessage[] = [];
  drafts: Array<GmailDraft & { to: string; subject: string; body: string }> = [];
  sent: SentMail[] = [];

  seed(messages: GmailMessage[]): void {
    this.messages = [...messages];
  }

  async listLabeled(): Promise<GmailMessage[]> {
    return [...this.messages];
  }

  async readThread(_userEmail: string, threadId: string): Promise<GmailMessage[]> {
    return this.messages
      .filter((message) => message.threadId === threadId)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  async createDraft(
    _userEmail: string,
    input: { to: string; subject: string; body: string; threadId?: string },
  ): Promise<GmailDraft> {
    const draft = {
      draftId: `draft_${this.drafts.length + 1}`,
      threadId: input.threadId,
      to: input.to,
      subject: input.subject,
      body: input.body,
    };
    this.drafts.push(draft);
    return { draftId: draft.draftId, threadId: draft.threadId };
  }

  async sendDraft(_userEmail: string, draftId: string): Promise<SentMail> {
    const draft = this.drafts.find((item) => item.draftId === draftId);
    if (!draft) throw new Error(`Draft ${draftId} not found`);
    const sent = {
      messageId: `msg_${this.sent.length + 1}`,
      threadId: draft.threadId,
    };
    this.sent.push(sent);
    return sent;
  }

  async sendMessage(
    _userEmail: string,
    input: { to: string; subject: string; body: string; threadId?: string },
  ): Promise<SentMail> {
    const sent = {
      messageId: `msg_${this.sent.length + 1}`,
      threadId: input.threadId ?? `thread_${this.sent.length + 1}`,
    };
    this.sent.push(sent);
    return sent;
  }

  async searchContacts(_userEmail: string, query: string): Promise<GmailContact[]> {
    const needle = query.toLowerCase();
    const seen = new Map<string, GmailContact>();
    for (const message of this.messages) {
      if (
        message.from.includes(needle) ||
        message.subject.toLowerCase().includes(needle) ||
        message.body.toLowerCase().includes(needle)
      ) {
        seen.set(message.from, { email: message.from });
      }
    }
    return [...seen.values()];
  }
}
