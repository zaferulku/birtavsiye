import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/apiAdmin";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type ScoreBreakdown = {
  lexical?: number | null;
  vector?: number | null;
  offer?: number | null;
  image?: number | null;
  freshness?: number | null;
  source_trust?: number | null;
  price_penalty?: number | null;
  total?: number | null;
};

type CandidateTrace = {
  id?: string;
  title?: string;
  ranking_reasons?: string[] | null;
  sources?: string[] | null;
  score_breakdown?: ScoreBreakdown | null;
};

type DiagnosticsPayload = {
  retrieval_stage?: string | null;
  query_profile?: {
    mode?: string | null;
    priceSensitive?: boolean | null;
    accessoryIntent?: boolean | null;
  } | null;
  rerank_applied?: boolean | null;
  strict_term_count?: number | null;
  supplemented_by_legacy?: boolean | null;
  supplemental_candidate_count?: number | null;
  top_candidates?: CandidateTrace[] | null;
  pre_rerank_top_candidates?: CandidateTrace[] | null;
};

type AgentDecisionRow = {
  id: number | string;
  timestamp: string | null;
  method: string | null;
  confidence: number | null;
  latency_ms: number | null;
  input_data: {
    message?: string;
    userId?: string | null;
    chatSessionId?: string | null;
  } | null;
  output_data: {
    method?: string;
    path?: string;
    path_reason?: string;
    intent?: {
      category_slug?: string | null;
      semantic_keywords?: string[];
      confidence?: number | null;
      is_too_vague?: boolean;
      is_off_topic?: boolean;
    } | null;
    kb_chunks?: number;
    product_count?: number;
    latency_ms?: number;
    diagnostics?: unknown;
  } | null;
};

type FeedbackRow = {
  decision_id: number | string;
  feedback_type: string | null;
  created_at?: string | null;
};

type FeedbackSummary = {
  total: number;
  by_type: Record<string, number>;
  latest_at: string | null;
};

type ReasonAggregate = {
  reason: string;
  decisions: number;
  feedback_total: number;
  wrong: number;
  more: number;
};

type SourceAggregate = {
  source: string;
  decisions: number;
  feedback_total: number;
  wrong: number;
  more: number;
};

type ProfileAggregate = {
  profile: string;
  decisions: number;
  rerank_applied: number;
  supplemented_by_legacy: number;
  feedback_total: number;
  wrong: number;
  more: number;
};

type ScoreAccumulator = {
  lexical: number;
  vector: number;
  offer: number;
  image: number;
  freshness: number;
  source_trust: number;
  price_penalty: number;
  total: number;
  sample_count: number;
};

function toDecisionKey(id: number | string): string {
  return String(id);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readDiagnostics(value: unknown): DiagnosticsPayload | null {
  if (!isObject(value)) return null;

  const topCandidates = Array.isArray(value.top_candidates)
    ? value.top_candidates.filter(isObject)
    : [];
  const preRerankTopCandidates = Array.isArray(value.pre_rerank_top_candidates)
    ? value.pre_rerank_top_candidates.filter(isObject)
    : [];

  return {
    retrieval_stage:
      typeof value.retrieval_stage === "string" ? value.retrieval_stage : null,
    query_profile: isObject(value.query_profile)
      ? {
          mode:
            typeof value.query_profile.mode === "string"
              ? value.query_profile.mode
              : null,
          priceSensitive:
            typeof value.query_profile.priceSensitive === "boolean"
              ? value.query_profile.priceSensitive
              : null,
          accessoryIntent:
            typeof value.query_profile.accessoryIntent === "boolean"
              ? value.query_profile.accessoryIntent
              : null,
        }
      : null,
    rerank_applied:
      typeof value.rerank_applied === "boolean" ? value.rerank_applied : null,
    strict_term_count:
      typeof value.strict_term_count === "number" ? value.strict_term_count : null,
    supplemented_by_legacy:
      typeof value.supplemented_by_legacy === "boolean"
        ? value.supplemented_by_legacy
        : null,
    supplemental_candidate_count:
      typeof value.supplemental_candidate_count === "number"
        ? value.supplemental_candidate_count
        : null,
    top_candidates: topCandidates as CandidateTrace[],
    pre_rerank_top_candidates: preRerankTopCandidates as CandidateTrace[],
  };
}

function safeArrayOfStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function readFeedbackTypeCount(summary: FeedbackSummary, type: string): number {
  return summary.by_type[type] ?? 0;
}

function sortByFeedback<T extends { feedback_total: number; decisions: number }>(
  rows: T[]
): T[] {
  return rows.sort((left, right) => {
    if (right.feedback_total !== left.feedback_total) {
      return right.feedback_total - left.feedback_total;
    }
    return right.decisions - left.decisions;
  });
}

function finalizeScoreAccumulator(accumulator: ScoreAccumulator) {
  if (accumulator.sample_count === 0) {
    return {
      lexical: 0,
      vector: 0,
      offer: 0,
      image: 0,
      freshness: 0,
      source_trust: 0,
      price_penalty: 0,
      total: 0,
      sample_count: 0,
    };
  }

  const divisor = accumulator.sample_count;
  return {
    lexical: Number((accumulator.lexical / divisor).toFixed(2)),
    vector: Number((accumulator.vector / divisor).toFixed(2)),
    offer: Number((accumulator.offer / divisor).toFixed(2)),
    image: Number((accumulator.image / divisor).toFixed(2)),
    freshness: Number((accumulator.freshness / divisor).toFixed(2)),
    source_trust: Number((accumulator.source_trust / divisor).toFixed(2)),
    price_penalty: Number((accumulator.price_penalty / divisor).toFixed(2)),
    total: Number((accumulator.total / divisor).toFixed(2)),
    sample_count: divisor,
  };
}

function buildDecisionSummary(
  decisions: AgentDecisionRow[],
  feedbackByDecision: Map<string, FeedbackSummary>
) {
  const stageMap = new Map<
    string,
    {
      decisions: number;
      rerank_applied: number;
      feedback_total: number;
      wrong: number;
      more: number;
    }
  >();
  const profileMap = new Map<string, ProfileAggregate>();
  const reasonMap = new Map<string, ReasonAggregate>();
  const sourceMap = new Map<string, SourceAggregate>();
  const topCandidateScore: ScoreAccumulator = {
    lexical: 0,
    vector: 0,
    offer: 0,
    image: 0,
    freshness: 0,
    source_trust: 0,
    price_penalty: 0,
    total: 0,
    sample_count: 0,
  };

  let rerankAppliedCount = 0;
  let feedbackTotal = 0;
  let wrongTotal = 0;
  let moreTotal = 0;

  for (const decision of decisions) {
    const key = toDecisionKey(decision.id);
    const feedback = feedbackByDecision.get(key) ?? {
      total: 0,
      by_type: {},
      latest_at: null,
    };
    const diagnostics = readDiagnostics(decision.output_data?.diagnostics);
    const retrievalStage = diagnostics?.retrieval_stage ?? "unknown";
    const queryProfile = diagnostics?.query_profile?.mode ?? "unknown";
    const rerankApplied = diagnostics?.rerank_applied === true;
    const supplementedByLegacy = diagnostics?.supplemented_by_legacy === true;
    const topCandidate = diagnostics?.top_candidates?.[0] ?? null;

    feedbackTotal += feedback.total;
    wrongTotal += readFeedbackTypeCount(feedback, "wrong");
    moreTotal += readFeedbackTypeCount(feedback, "more");

    const stageEntry = stageMap.get(retrievalStage) ?? {
      decisions: 0,
      rerank_applied: 0,
      feedback_total: 0,
      wrong: 0,
      more: 0,
    };
    stageEntry.decisions += 1;
    stageEntry.feedback_total += feedback.total;
    stageEntry.wrong += readFeedbackTypeCount(feedback, "wrong");
    stageEntry.more += readFeedbackTypeCount(feedback, "more");
    if (rerankApplied) {
      stageEntry.rerank_applied += 1;
      rerankAppliedCount += 1;
    }
    stageMap.set(retrievalStage, stageEntry);

    const profileEntry = profileMap.get(queryProfile) ?? {
      profile: queryProfile,
      decisions: 0,
      rerank_applied: 0,
      supplemented_by_legacy: 0,
      feedback_total: 0,
      wrong: 0,
      more: 0,
    };
    profileEntry.decisions += 1;
    profileEntry.feedback_total += feedback.total;
    profileEntry.wrong += readFeedbackTypeCount(feedback, "wrong");
    profileEntry.more += readFeedbackTypeCount(feedback, "more");
    if (rerankApplied) profileEntry.rerank_applied += 1;
    if (supplementedByLegacy) profileEntry.supplemented_by_legacy += 1;
    profileMap.set(queryProfile, profileEntry);

    if (!topCandidate) {
      continue;
    }

    for (const reason of safeArrayOfStrings(topCandidate.ranking_reasons)) {
      const reasonEntry = reasonMap.get(reason) ?? {
        reason,
        decisions: 0,
        feedback_total: 0,
        wrong: 0,
        more: 0,
      };
      reasonEntry.decisions += 1;
      reasonEntry.feedback_total += feedback.total;
      reasonEntry.wrong += readFeedbackTypeCount(feedback, "wrong");
      reasonEntry.more += readFeedbackTypeCount(feedback, "more");
      reasonMap.set(reason, reasonEntry);
    }

    for (const source of safeArrayOfStrings(topCandidate.sources)) {
      const sourceEntry = sourceMap.get(source) ?? {
        source,
        decisions: 0,
        feedback_total: 0,
        wrong: 0,
        more: 0,
      };
      sourceEntry.decisions += 1;
      sourceEntry.feedback_total += feedback.total;
      sourceEntry.wrong += readFeedbackTypeCount(feedback, "wrong");
      sourceEntry.more += readFeedbackTypeCount(feedback, "more");
      sourceMap.set(source, sourceEntry);
    }

    if (isObject(topCandidate.score_breakdown)) {
      topCandidateScore.lexical += Number(topCandidate.score_breakdown.lexical ?? 0);
      topCandidateScore.vector += Number(topCandidate.score_breakdown.vector ?? 0);
      topCandidateScore.offer += Number(topCandidate.score_breakdown.offer ?? 0);
      topCandidateScore.image += Number(topCandidate.score_breakdown.image ?? 0);
      topCandidateScore.freshness += Number(topCandidate.score_breakdown.freshness ?? 0);
      topCandidateScore.source_trust += Number(
        topCandidate.score_breakdown.source_trust ?? 0
      );
      topCandidateScore.price_penalty += Number(
        topCandidate.score_breakdown.price_penalty ?? 0
      );
      topCandidateScore.total += Number(topCandidate.score_breakdown.total ?? 0);
      topCandidateScore.sample_count += 1;
    }
  }

  return {
    totals: {
      decisions: decisions.length,
      rerank_applied: rerankAppliedCount,
      feedback_total: feedbackTotal,
      wrong: wrongTotal,
      more: moreTotal,
      with_feedback: decisions.filter(
        (decision) => (feedbackByDecision.get(toDecisionKey(decision.id))?.total ?? 0) > 0
      ).length,
    },
    by_retrieval_stage: Array.from(stageMap.entries())
      .map(([stage, value]) => ({
        retrieval_stage: stage,
        ...value,
      }))
      .sort((left, right) => right.decisions - left.decisions),
    by_query_profile: Array.from(profileMap.values()).sort(
      (left, right) => right.decisions - left.decisions
    ),
    top_ranking_reasons: sortByFeedback(Array.from(reasonMap.values()))
      .slice(0, 20)
      .map((entry) => ({
        ...entry,
        wrong_rate:
          entry.decisions > 0 ? Number((entry.wrong / entry.decisions).toFixed(3)) : 0,
      })),
    top_sources: sortByFeedback(Array.from(sourceMap.values()))
      .slice(0, 12)
      .map((entry) => ({
        ...entry,
        wrong_rate:
          entry.decisions > 0 ? Number((entry.wrong / entry.decisions).toFixed(3)) : 0,
      })),
    avg_top_candidate_score_breakdown: finalizeScoreAccumulator(topCandidateScore),
  };
}

export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const limitParam = Number(url.searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(limitParam)
    ? Math.max(1, Math.min(limitParam, 100))
    : 20;
  const chatSessionId = url.searchParams.get("chat_session_id");
  const feedbackType = url.searchParams.get("feedback_type");
  const retrievalStageFilter = url.searchParams.get("retrieval_stage");
  const queryProfileFilter = url.searchParams.get("query_profile");
  const pathFilter = url.searchParams.get("path");
  const rerankFilterParam = url.searchParams.get("rerank_applied");
  const rerankAppliedFilter =
    rerankFilterParam === "true"
      ? true
      : rerankFilterParam === "false"
        ? false
        : null;
  const hasLocalFilters =
    Boolean(retrievalStageFilter) ||
    Boolean(queryProfileFilter) ||
    Boolean(pathFilter) ||
    rerankAppliedFilter !== null;
  const fetchLimit = hasLocalFilters ? Math.min(limit * 4, 250) : limit;

  let query = supabaseAdmin
    .from("agent_decisions")
    .select(
      "id, timestamp, method, confidence, latency_ms, input_data, output_data"
    )
    .eq("agent_name", "chatbot-search")
    .order("timestamp", { ascending: false })
    .limit(fetchLimit);

  if (chatSessionId) {
    query = query.eq("input_data->>chatSessionId", chatSessionId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let decisions = (data ?? []) as AgentDecisionRow[];

  if (hasLocalFilters) {
    decisions = decisions.filter((decision) => {
      const diagnostics = readDiagnostics(decision.output_data?.diagnostics);
      const decisionPath =
        typeof decision.output_data?.path === "string" ? decision.output_data.path : null;
      const retrievalStage = diagnostics?.retrieval_stage ?? null;
      const queryProfile = diagnostics?.query_profile?.mode ?? null;
      const rerankApplied =
        diagnostics?.rerank_applied === true
          ? true
          : diagnostics?.rerank_applied === false
            ? false
            : null;

      if (retrievalStageFilter && retrievalStage !== retrievalStageFilter) {
        return false;
      }

      if (queryProfileFilter && queryProfile !== queryProfileFilter) {
        return false;
      }

      if (pathFilter && decisionPath !== pathFilter) {
        return false;
      }

      if (rerankAppliedFilter !== null && rerankApplied !== rerankAppliedFilter) {
        return false;
      }

      return true;
    });
  }

  decisions = decisions.slice(0, limit);
  const decisionIds = decisions.map((decision) => decision.id);

  let feedbackRows: FeedbackRow[] = [];
  if (decisionIds.length > 0) {
    let feedbackQuery = supabaseAdmin
      .from("decision_feedback")
      .select("decision_id, feedback_type, created_at")
      .in("decision_id", decisionIds);

    if (feedbackType) {
      feedbackQuery = feedbackQuery.eq("feedback_type", feedbackType);
    }

    const { data: feedbackData, error: feedbackError } = await feedbackQuery;
    if (feedbackError) {
      return NextResponse.json({ error: feedbackError.message }, { status: 500 });
    }

    feedbackRows = (feedbackData ?? []) as FeedbackRow[];
  }

  const feedbackByDecision = new Map<
    string,
    {
      total: number;
      by_type: Record<string, number>;
      latest_at: string | null;
    }
  >();

  for (const feedback of feedbackRows) {
    const key = toDecisionKey(feedback.decision_id);
    const existing = feedbackByDecision.get(key) ?? {
      total: 0,
      by_type: {},
      latest_at: null,
    };

    existing.total += 1;
    const typeKey = feedback.feedback_type ?? "unknown";
    existing.by_type[typeKey] = (existing.by_type[typeKey] ?? 0) + 1;
    if (
      feedback.created_at &&
      (!existing.latest_at || feedback.created_at > existing.latest_at)
    ) {
      existing.latest_at = feedback.created_at;
    }

    feedbackByDecision.set(key, existing);
  }

  return NextResponse.json(
    {
      decisions: decisions.map((decision) => ({
        ...decision,
        feedback:
          feedbackByDecision.get(toDecisionKey(decision.id)) ?? {
            total: 0,
            by_type: {},
            latest_at: null,
          },
      })),
      summary: buildDecisionSummary(decisions, feedbackByDecision),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
