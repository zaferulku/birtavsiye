import { supabaseAdmin } from "./supabaseServer";

export async function adjustTopicAnswerCount(topicId: string, delta: number): Promise<void> {
  const { error } = await supabaseAdmin.rpc("adjust_topic_answer_count", {
    p_topic_id: topicId,
    p_delta: delta,
  });

  if (error) {
    throw new Error(`adjust_topic_answer_count failed: ${error.message}`);
  }
}
