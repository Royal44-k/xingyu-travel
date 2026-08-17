import { z } from 'zod';
import { scoreMatch, type MatchReasonKey, type MatchSignals } from '@/domain/partners/score-match';

export type PartnerRiskStatus = 'clear' | 'review' | 'restricted';

export interface PartnerProfile {
  id: string;
  age: number;
  identityVerified: boolean;
  riskStatus: PartnerRiskStatus;
}

export interface PartnerIntent {
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  pace: string;
  interests: string[];
  route: string;
  lodgingBoundary: string;
  schedule: string;
  socialPreference: string;
  capacity: number;
  certificationRequired: boolean;
}

export interface PartnerCandidate extends PartnerProfile {
  displayName: string;
  introduction: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  pace: string;
  interests: string[];
  route: string;
  lodgingBoundary: string;
  schedule: string;
  socialPreference: string;
  capacity: number;
  certified: boolean;
  blockedUserIds: string[];
  matchPreferences: {
    budgetTolerance: number;
    scheduleCompatibility: number;
    socialCompatibility: number;
  };
}

export type EligibilityResult =
  | { allowed: true }
  | { allowed: false; code: 'AGE_RESTRICTED' | 'IDENTITY_REQUIRED' | 'RISK_RESTRICTED' };

export const defaultPartnerIntent: PartnerIntent = {
  destination: '川西',
  startDate: '2026-09-18',
  endDate: '2026-09-23',
  budget: 5200,
  pace: '舒缓',
  interests: ['雪山', '摄影'],
  route: '成都—康定—新都桥',
  lodgingBoundary: '接受同性拼房，需独立床位',
  schedule: '早起，22:30 前休息',
  socialPreference: '结伴活动，也保留独处时间',
  capacity: 2,
  certificationRequired: true,
};

export const demoViewerProfile: PartnerProfile = {
  id: 'viewer-demo',
  age: 28,
  identityVerified: true,
  riskStatus: 'clear',
};

export const demoPartnerCandidates: PartnerCandidate[] = [{
  id: 'user-muyu',
  displayName: '木雨',
  age: 27,
  identityVerified: true,
  riskStatus: 'clear',
  introduction: '慢节奏风光摄影爱好者，习惯提前确认边界与每日安排。',
  destination: '大理',
  startDate: '2026-09-17',
  endDate: '2026-09-24',
  budget: 5000,
  pace: '舒缓',
  interests: ['雪山', '摄影'],
  route: '成都—康定—新都桥',
  lodgingBoundary: '接受同性拼房，需独立床位',
  schedule: '早起，22:30 前休息',
  socialPreference: '结伴活动，也保留独处时间',
  capacity: 3,
  certified: true,
  blockedUserIds: [],
  matchPreferences: {
    budgetTolerance: 2000,
    scheduleCompatibility: 0.2,
    socialCompatibility: 0.6,
  },
}, {
  id: 'user-azhou',
  displayName: '阿舟',
  age: 30,
  identityVerified: true,
  riskStatus: 'clear',
  introduction: '轻装徒步与在地饮食爱好者，重视预算透明和分开住宿。',
  destination: '川西',
  startDate: '2026-09-19',
  endDate: '2026-09-22',
  budget: 5600,
  pace: '适中',
  interests: ['徒步', '在地饮食'],
  route: '成都—康定—塔公',
  lodgingBoundary: '各自独立房间',
  schedule: '自然醒，23:00 前休息',
  socialPreference: '白天同行，晚间自由安排',
  capacity: 2,
  certified: true,
  blockedUserIds: [],
  matchPreferences: {
    budgetTolerance: 2400,
    scheduleCompatibility: 0.75,
    socialCompatibility: 0.82,
  },
}];

const reasonLabels: Readonly<Record<MatchReasonKey, string>> = {
  date: '旅行日期高度重合',
  budget: '预算范围很接近',
  pace: '旅行节奏很合拍',
  interest: '共同兴趣较多',
  route: '期待路线方向一致',
  lodging: '住宿边界相容',
  schedule: '每日作息较一致',
  social: '社交偏好相近',
};

export function isPartnerEligible(profile: PartnerProfile): EligibilityResult {
  if (!Number.isFinite(profile.age) || profile.age < 18) return { allowed: false, code: 'AGE_RESTRICTED' };
  if (!profile.identityVerified) return { allowed: false, code: 'IDENTITY_REQUIRED' };
  if (profile.riskStatus !== 'clear') return { allowed: false, code: 'RISK_RESTRICTED' };
  return { allowed: true };
}

const realIsoDateSchema = (message: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, message).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}, message);

export const partnerIntentSchema = z.object({
  destination: z.string().trim().min(1, '请输入目的地').max(80, '目的地不能超过 80 个字符'),
  startDate: realIsoDateSchema('请选择有效的出发日期'),
  endDate: realIsoDateSchema('请选择有效的返程日期'),
  budget: z.number().finite().positive('请输入大于 0 的预算'),
  pace: z.string().trim().min(1, '请选择旅行节奏').max(80, '旅行节奏不能超过 80 个字符'),
  interests: z.array(z.string().trim().min(1, '兴趣不能为空').max(80, '单项兴趣不能超过 80 个字符'))
    .min(1, '请至少选择一项兴趣').max(20, '兴趣最多填写 20 项'),
  route: z.string().trim().min(1, '请输入期待路线').max(240, '期待路线不能超过 240 个字符'),
  lodgingBoundary: z.string().trim().min(1, '请说明住宿边界').max(240, '住宿边界不能超过 240 个字符'),
  schedule: z.string().trim().min(1, '请说明日常作息').max(240, '日常作息不能超过 240 个字符'),
  socialPreference: z.string().trim().min(1, '请说明社交偏好').max(240, '社交偏好不能超过 240 个字符'),
  capacity: z.number().int('同行容量必须是整数').min(1, '同行容量至少为 1 人').max(12, '同行容量最多为 12 人'),
  certificationRequired: z.boolean(),
}).strict().superRefine((intent, context) => {
  if (intent.endDate < intent.startDate) {
    context.addIssue({ code: 'custom', path: ['endDate'], message: '返程日期不能早于出发日期' });
  }
});

export function validatePartnerIntent(intent: unknown):
  | { success: true; data: PartnerIntent }
  | { success: false; fieldErrors: Record<string, string> } {
  const parsed = partnerIntentSchema.safeParse(intent);
  if (parsed.success) return { success: true, data: parsed.data };
  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = typeof issue.path[0] === 'string' ? issue.path[0] : 'form';
    fieldErrors[key] ??= key === 'form' ? '意愿数据包含未知或无效字段' : issue.message;
  }
  return { success: false, fieldErrors };
}

export function filterPartnerCandidates(
  intent: PartnerIntent,
  candidates: PartnerCandidate[],
  relations: { viewerId: string; blockedCandidateIds: string[] },
) {
  const blocked = new Set(relations.blockedCandidateIds);
  return candidates.filter((candidate) =>
    candidate.destination === intent.destination &&
    candidate.startDate <= intent.endDate &&
    candidate.endDate >= intent.startDate &&
    candidate.capacity >= intent.capacity &&
    (!intent.certificationRequired || candidate.certified) &&
    !candidate.blockedUserIds.includes(relations.viewerId) &&
    !blocked.has(candidate.id) &&
    isPartnerEligible(candidate).allowed,
  );
}

export function scorePartnerCandidate(_intent: PartnerIntent, candidate: PartnerCandidate): {
  candidate: PartnerCandidate;
  score: number;
  reasons: string[];
  reasonKeys: MatchReasonKey[];
} {
  const result = scoreMatch(deriveMatchSignals(_intent, candidate), candidate);
  return {
    candidate,
    score: result.score,
    reasons: result.reasons.map(({ key }) => reasonLabels[key]),
    reasonKeys: result.reasons.map(({ key }) => key),
  };
}

function deriveMatchSignals(intent: PartnerIntent, candidate: PartnerCandidate): MatchSignals {
  const paceOrder = ['舒缓', '适中', '紧凑'];
  const intentPace = paceOrder.indexOf(intent.pace);
  const candidatePace = paceOrder.indexOf(candidate.pace);
  return {
    destination: intent.destination,
    dateOverlap: dateOverlap(intent.startDate, intent.endDate, candidate.startDate, candidate.endDate),
    budgetFit: Math.max(0, 1 - Math.abs(intent.budget - candidate.budget) / candidate.matchPreferences.budgetTolerance),
    paceFit: intentPace < 0 || candidatePace < 0 ? 0 : Math.max(0, 1 - Math.abs(intentPace - candidatePace) / 2),
    interestFit: overlapRatio(intent.interests, candidate.interests),
    routeFit: overlapRatio(routeStops(intent.route), routeStops(candidate.route)),
    lodgingFit: intent.lodgingBoundary === candidate.lodgingBoundary ? 1 : 0,
    scheduleFit: intent.schedule === candidate.schedule ? candidate.matchPreferences.scheduleCompatibility : 0,
    socialFit: intent.socialPreference === candidate.socialPreference ? candidate.matchPreferences.socialCompatibility : 0,
  };
}

function dateOverlap(intentStart: string, intentEnd: string, candidateStart: string, candidateEnd: string) {
  const day = 86_400_000;
  const start = Math.max(Date.parse(`${intentStart}T00:00:00Z`), Date.parse(`${candidateStart}T00:00:00Z`));
  const end = Math.min(Date.parse(`${intentEnd}T00:00:00Z`), Date.parse(`${candidateEnd}T00:00:00Z`));
  const intentDays = (Date.parse(`${intentEnd}T00:00:00Z`) - Date.parse(`${intentStart}T00:00:00Z`)) / day + 1;
  return end < start || intentDays <= 0 ? 0 : Math.min(1, ((end - start) / day + 1) / intentDays);
}

function routeStops(route: string) {
  return route.split(/[—–→>\/、,，-]+/).map((stop) => stop.trim()).filter(Boolean);
}

function overlapRatio(intentValues: string[], candidateValues: string[]) {
  const intentSet = new Set(intentValues.map((value) => value.trim()).filter(Boolean));
  if (intentSet.size === 0) return 0;
  const candidateSet = new Set(candidateValues.map((value) => value.trim()).filter(Boolean));
  return [...intentSet].filter((value) => candidateSet.has(value)).length / intentSet.size;
}
