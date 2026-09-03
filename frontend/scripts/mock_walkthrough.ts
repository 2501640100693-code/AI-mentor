import { mockApi } from "../src/lib/mockApi";

async function walk() {
  const diag = await mockApi.diagnostic("s1", "Ohm's Law");
  console.log("1_diagnostic", !!diag.lesson_id, !!diag.lesson_plan);
  const sess = await mockApi.openReactiveSession(diag.lesson_id);
  console.log("2_reactive", sess.conversation_id);
  const turn = await mockApi.nextTurn();
  console.log("3_turn", turn.stage, turn.visual_type, !!turn.script_text);
  const ans = await mockApi.answer({
    student_id: "s1",
    lesson_id: diag.lesson_id,
    concept_id: turn.concept_id,
    turn_id: turn.turn_id,
    student_answer: "V=IR",
  });
  console.log("4_answer", ans.correct);
  const mastery = await mockApi.mastery("s1");
  console.log("5_mastery", mastery.length);
  const report = await mockApi.report("s1", diag.lesson_id);
  console.log("6_report", report.score_percent);
  const cards = await mockApi.flashcards();
  console.log("7_flashcards", cards.length);
  const cmap = await mockApi.conceptMap();
  console.log("8_concept_map", !!cmap.svg);
  const status = await mockApi.status();
  console.log("9_status", status.force_fallback, status.mock_video);
  console.log("MOCK_WALKTHROUGH_OK");
}

walk().catch((e) => {
  console.error(e);
  process.exit(1);
});
