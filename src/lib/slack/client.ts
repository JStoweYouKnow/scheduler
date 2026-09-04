export interface SlackMessage {
  channel: string;
  text: string;
  threadTs?: string;
  blocks?: unknown[];
}

export async function postSlackMessage(message: SlackMessage): Promise<{ ts?: string }> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.warn("SLACK_BOT_TOKEN missing; Slack message skipped");
    return {};
  }
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: message.channel,
      text: message.text,
      thread_ts: message.threadTs,
      blocks: message.blocks,
    }),
  });
  const json = (await res.json()) as { ok: boolean; ts?: string; error?: string };
  if (!json.ok) {
    throw new Error(`Slack post failed: ${json.error ?? "unknown"}`);
  }
  return { ts: json.ts };
}

export function approvalBlocks(args: {
  approvalId: string;
  summary: string;
}) {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Approval needed*\n${args.summary}`,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Approve" },
          style: "primary",
          action_id: "approve_send",
          value: args.approvalId,
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Reject" },
          style: "danger",
          action_id: "reject_send",
          value: args.approvalId,
        },
      ],
    },
  ];
}
