import { liftReasoningContent, transformNebiusRequestBody } from "./nebius";

describe("Nebius reasoning wrapper", () => {
  it("copies reasoning_content into empty content when there are no tool calls", () => {
    const payload = liftReasoningContent({
      choices: [
        {
          message: {
            content: "",
            reasoning_content: "I should call echo.",
          },
        },
      ],
    });
    expect(payload.choices[0]?.message.content).toBe("I should call echo.");
  });

  it("leaves content empty when tool_calls are present", () => {
    const payload = liftReasoningContent({
      choices: [
        {
          message: {
            content: "",
            reasoning_content: "calling echo",
            tool_calls: [{ id: "1", type: "function" }],
          },
        },
      ],
    });
    expect(payload.choices[0]?.message.content).toBe("");
  });

  it("disables parallel tool calls on the request body", () => {
    const body = transformNebiusRequestBody({ model: "x", messages: [] });
    expect(body.parallel_tool_calls).toBe(false);
    expect(body.chat_template_kwargs).toEqual({ enable_thinking: true });
  });
});
