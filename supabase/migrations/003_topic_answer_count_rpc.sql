create or replace function public.adjust_topic_answer_count(
  p_topic_id uuid,
  p_delta integer
)
returns void
language sql
security definer
set search_path = public
as $$
  update topics
  set answer_count = greatest(coalesce(answer_count, 0) + coalesce(p_delta, 0), 0)
  where id = p_topic_id;
$$;
