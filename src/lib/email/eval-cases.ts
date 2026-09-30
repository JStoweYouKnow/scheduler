import type { GmailMessage } from "./port";
import type { NanoInboxPlan, OpenRequestLite } from "./classify";

export type InboxGold = Extract<NanoInboxPlan, { action: "ignore" } | { action: "open" }> | {
  action: "match";
  requestId: string;
};

export type InboxEvalCase = {
  id: string;
  message: GmailMessage;
  gold: InboxGold;
};

const at = new Date("2026-09-15T17:00:00.000Z");
const to = ["v@matriarch-studios.com"];

function mail(
  id: string,
  threadId: string,
  from: string,
  subject: string,
  body: string,
): GmailMessage {
  return {
    id,
    threadId,
    from,
    to,
    subject,
    snippet: body.slice(0, 90),
    body,
    date: at,
  };
}

export const EVAL_OPEN_REQUESTS: OpenRequestLite[] = [
  {
    id: "req-tubi",
    threadId: "thread-tubi",
    counterpartyEmail: "sarah@tubi.tv",
    counterpartyName: "Sarah Chen",
    organization: "Tubi",
    status: "awaiting_reply",
  },
  {
    id: "req-netflix",
    threadId: "thread-netflix",
    counterpartyEmail: "alex.kim@netflix.com",
    counterpartyName: "Alex Kim",
    organization: "Netflix",
    status: "awaiting_reply",
  },
  {
    id: "req-j",
    threadId: "thread-j",
    counterpartyEmail: "j@matriarch-studios.com",
    counterpartyName: "J",
    organization: "Matriarch",
    status: "proposing",
  },
];

/** 30 labeled inbox items: 12 ignore, 9 match, 9 open. */
export const INBOX_EVAL_CASES: InboxEvalCase[] = [
  {
    id: "ignore-digest",
    message: mail("m01", "t-news", "noreply@deals.com", "Your weekly digest", "Deals inside. Unsubscribe anytime."),
    gold: { action: "ignore", reason: "newsletter" },
  },
  {
    id: "ignore-github",
    message: mail("m02", "t-gh", "notifications@github.com", "[scheduler] New comment on PR #12", "A review was requested on pull request #12."),
    gold: { action: "ignore", reason: "github" },
  },
  {
    id: "ignore-stripe",
    message: mail("m03", "t-pay", "noreply@stripe.com", "Receipt for $42.00", "You paid $42.00 to Figma. Invoice INV-8841."),
    gold: { action: "ignore", reason: "receipt" },
  },
  {
    id: "ignore-linkedin",
    message: mail("m04", "t-li", "updates@linkedin.com", "You appeared in 8 searches this week", "See who viewed your profile."),
    gold: { action: "ignore", reason: "social" },
  },
  {
    id: "ignore-slack",
    message: mail("m05", "t-slack", "noreply@slack.com", "Slack digest for Matriarch", "12 unread messages in #general."),
    gold: { action: "ignore", reason: "slack" },
  },
  {
    id: "ignore-reset",
    message: mail("m06", "t-reset", "no-reply@accounts.google.com", "Password reset", "Someone requested a password reset for this account."),
    gold: { action: "ignore", reason: "auth" },
  },
  {
    id: "ignore-zoom",
    message: mail("m07", "t-zoom", "no-reply@zoom.us", "Cloud recording is ready", "Your recording from Friday is available to download."),
    gold: { action: "ignore", reason: "zoom" },
  },
  {
    id: "ignore-thanks",
    message: mail("m08", "t-thanks", "pat@example.com", "Thanks again", "Great catching up yesterday. No action needed on my side."),
    gold: { action: "ignore", reason: "fyi" },
  },
  {
    id: "ignore-docusign",
    message: mail("m09", "t-ds", "dse@docusign.net", "Completed: NDA", "All parties have signed. View the completed document."),
    gold: { action: "ignore", reason: "docusign" },
  },
  {
    id: "ignore-drive",
    message: mail("m10", "t-drive", "drive-shares-noreply@google.com", "Document shared with you", "Alex shared “Budget Q3” with you."),
    gold: { action: "ignore", reason: "drive" },
  },
  {
    id: "ignore-shipped",
    message: mail("m11", "t-ship", "shipment-tracking@amazon.com", "Your package has shipped", "Arriving Thursday. Track your package."),
    gold: { action: "ignore", reason: "shipping" },
  },
  {
    id: "ignore-saas",
    message: mail("m12", "t-saas", "ae@notourproduct.io", "Book a demo of our platform", "Grab time with our AE this week — 15 min product tour."),
    gold: { action: "ignore", reason: "cold_outbound" },
  },
  {
    id: "match-sarah-thread",
    message: mail("m13", "thread-tubi", "sarah@tubi.tv", "Re: Times that work next week", "Tuesday 2pm PT still works for me."),
    gold: { action: "match", requestId: "req-tubi" },
  },
  {
    id: "match-sarah-email",
    message: mail("m14", "thread-sarah-new", "sarah@tubi.tv", "One more time that works", "If Tuesday slips, Wednesday 3pm PT is open."),
    gold: { action: "match", requestId: "req-tubi" },
  },
  {
    id: "match-sarah-assistant",
    message: mail("m15", "thread-sarah-asst", "assistant@tubi.tv", "Sarah Chen availability", "Sarah Chen is free Wednesday afternoon for the one-sheet call."),
    gold: { action: "match", requestId: "req-tubi" },
  },
  {
    id: "match-tubi-org",
    message: mail("m16", "thread-tubi-press", "press@tubi.tv", "Tubi one-sheet follow-up", "The Tubi team can do 30 minutes Thursday if you still want the intro."),
    gold: { action: "match", requestId: "req-tubi" },
  },
  {
    id: "match-alex-thread",
    message: mail("m17", "thread-netflix", "alex.kim@netflix.com", "Re: lookbook window", "Thursday 11am PT works on my side."),
    gold: { action: "match", requestId: "req-netflix" },
  },
  {
    id: "match-alex-email",
    message: mail("m18", "thread-alex-new", "alex.kim@netflix.com", "Need to move us", "Can we reschedule the Netflix lookbook chat to Friday?"),
    gold: { action: "match", requestId: "req-netflix" },
  },
  {
    id: "match-j-thread",
    message: mail("m19", "thread-j", "j@matriarch-studios.com", "Re: internal hold", "Can we move Tuesday to 4pm? Edit bay ran long."),
    gold: { action: "match", requestId: "req-j" },
  },
  {
    id: "match-sarah-confirm",
    message: mail("m20", "thread-tubi", "sarah@tubi.tv", "Re: Times that work next week", "Locked. See you Tuesday — 30 min is plenty."),
    gold: { action: "match", requestId: "req-tubi" },
  },
  {
    id: "match-netflix-assistant",
    message: mail("m21", "thread-netflix", "ea@netflix.com", "Re: lookbook window", "Confirming Alex Kim for Thursday. 30 minutes on the lookbook."),
    gold: { action: "match", requestId: "req-netflix" },
  },
  {
    id: "open-investor",
    message: mail("m22", "thread-inv", "maya@lighthouse.vc", "Intro chat?", "Would love 30 minutes next week to hear about the slate."),
    gold: { action: "open" },
  },
  {
    id: "open-thursday",
    message: mail("m23", "thread-thu", "jordan@example.net", "Are you free Thursday", "Can we hop on a call Thursday afternoon? 20–30 min."),
    gold: { action: "open" },
  },
  {
    id: "open-unknown-reschedule",
    message: mail("m24", "thread-unk", "lee@newstudio.tv", "Need to reschedule", "Something came up — can we find another time this week for a meeting?"),
    gold: { action: "open" },
  },
  {
    id: "open-lookbook",
    message: mail("m25", "thread-look", "priya@harborfilms.com", "Hold 30 min for lookbook review", "Harbor wants a lookbook review next Wednesday if you have a slot."),
    gold: { action: "open" },
  },
  {
    id: "open-vendor",
    message: mail("m26", "thread-vendor", "ops@colorlab.io", "Set up a call?", "Can we schedule 30 minutes to go over deliverables and dates?"),
    gold: { action: "open" },
  },
  {
    id: "open-coffee",
    message: mail("m27", "thread-coffee", "niko@friendof.studio", "Coffee in Silver Lake?", "Want to find time next week for a 30 min coffee?"),
    gold: { action: "open" },
  },
  {
    id: "open-both",
    message: mail("m28", "thread-vj", "casey@streamco.tv", "Need 45 min with V and J", "Trying to schedule 45 minutes with both of you Thursday or Friday."),
    gold: { action: "open" },
  },
  {
    id: "open-tomorrow",
    message: mail("m29", "thread-tmrw", "sam@indie.tv", "Hop on a call tomorrow?", "Any chance of a 20 minute call tomorrow to talk times that work next month?"),
    gold: { action: "open" },
  },
  {
    id: "open-pitch",
    message: mail("m30", "thread-pitch", "renee@festival.org", "Hold time for the pitch", "Can we hold a time next Tuesday for a 30 min pitch meeting?"),
    gold: { action: "open" },
  },
];
