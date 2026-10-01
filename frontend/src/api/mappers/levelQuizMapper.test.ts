import { describe, expect, it } from "vitest";
import { mapLevelQuiz } from "@/api/mappers/levelQuizMapper";

describe("mapLevelQuiz", () => {
  it("maps question content and answers with correctAnswer", () => {
    const raw = {
      content: [
        {
          type: "paragraph",
          children: [{ type: "text", text: "Wie versickert Regenwasser?" }],
        },
      ],
      answers: [
        {
          id: 1,
          content: [
            {
              type: "paragraph",
              children: [{ type: "text", text: "Entsiegeln" }],
            },
          ],
          correctAnswer: true,
        },
        {
          id: 2,
          content: [
            {
              type: "paragraph",
              children: [{ type: "text", text: "Mehr Asphalt" }],
            },
          ],
          correctAnswer: false,
        },
      ],
    };

    const quiz = mapLevelQuiz(raw);
    expect(quiz).not.toBeNull();
    expect(quiz?.answers).toHaveLength(2);
    expect(quiz?.answers[0]?.correctAnswer).toBe(true);
    expect(quiz?.answers[1]?.correctAnswer).toBe(false);
    expect(quiz?.question?.[0]).toMatchObject({ type: "paragraph" });
  });

  it("returns null when there are no answers", () => {
    expect(mapLevelQuiz({ content: [], answers: [] })).toBeNull();
  });
});
