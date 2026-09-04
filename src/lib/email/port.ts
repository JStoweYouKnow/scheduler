export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string[];
  subject: string;
  snippet: string;
  body: string;
  date: Date;
}

export interface GmailDraft {
  draftId: string;
  threadId?: string;
}

export interface SentMail {
  messageId: string;
  threadId?: string;
}

export interface GmailContact {
  email: string;
  name?: string;
}

export interface GmailPort {
  listLabeled(userEmail: string, label: string, newerThanDays?: number): Promise<GmailMessage[]>;
  readThread(userEmail: string, threadId: string): Promise<GmailMessage[]>;
  createDraft(
    userEmail: string,
    input: { to: string; subject: string; body: string; threadId?: string },
  ): Promise<GmailDraft>;
  sendDraft(userEmail: string, draftId: string): Promise<SentMail>;
  sendMessage(
    userEmail: string,
    input: { to: string; subject: string; body: string; threadId?: string },
  ): Promise<SentMail>;
  searchContacts(userEmail: string, query: string): Promise<GmailContact[]>;
}
