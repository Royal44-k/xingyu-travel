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
  matchSignals: MatchSignals;
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
  destination: '川西',
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
  matchSignals: {
    destination: '川西',
    dateOverlap: 1,
    budgetFit: 0.9,
    paceFit: 1,
    interestFit: 0.8,
    routeFit: 1,
    lodgingFit: 1,
    scheduleFit: 0.6,
    socialFit: 0.8,
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
  matchSignals: {
    destination: '川西',
    dateOverlap: 0.75,
    budgetFit: 0.82,
    paceFit: 0.72,
    interestFit: 0.65,
    routeFit: 0.78,
    lodgingFit: 0.65,
    scheduleFit: 0.75,
    socialFit: 0.82,
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
  if (profile.age < 18) return { allowed: false, code: 'AGE_RESTRICTED' };
  if (!profile.identityVerified) return { allowed: false, code: 'IDENTITY_REQUIRED' };
  if (profile.riskStatus !== 'clear') return { allowed: false, code: 'RISK_RESTRICTED' };
  return { allowed: true };
}

export function validatePartnerIntent(intent: PartnerIntent):
  | { success: true; data: PartnerIntent }
  | { success: false; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  if (!intent.destination.trim()) fieldErrors.destination = '请输入目的地';
  if (!isIsoDate(intent.startDate)) fieldErrors.startDate = '请选择有效的出发日期';
  if (!isIsoDate(intent.endDate)) fieldErrors.endDate = '请选择有效的返程日期';
  else if (isIsoDate(intent.startDate) && intent.endDate < intent.startDate) {
    fieldErrors.endDate = '返程日期不能早于出发日期';
  }
  if (!Number.isFinite(intent.budget) || intent.budget <= 0) fieldErrors.budget = '请输入大于 0 的预算';
  if (!intent.pace.trim()) fieldErrors.pace = '请选择旅行节奏';
  if (!intent.interests.length || intent.interests.some((interest) => !interest.trim())) {
    fieldErrors.interests = '请至少选择一项兴趣';
  }
  if (!intent.route.trim()) fieldErrors.route = '请输入期待路线';
  if (!intent.lodgingBoundary.trim()) fieldErrors.lodgingBoundary = '请说明住宿边界';
  if (!intent.schedule.trim()) fieldErrors.schedule = '请说明日常作息';
  if (!intent.socialPreference.trim()) fieldErrors.socialPreference = '请说明社交偏好';
  if (!Number.isInteger(intent.capacity) || intent.capacity < 1) fieldErrors.capacity = '同行容量至少为 1 人';
  if (Object.keys(fieldErrors).length) return { success: false, fieldErrors };
  return { success: true, data: {
    ...intent,
    destination: intent.destination.trim(),
    interests: intent.interests.map((interest) => interest.trim()),
    route: intent.route.trim(),
    lodgingBoundary: intent.lodgingBoundary.trim(),
    schedule: intent.schedule.trim(),
    socialPreference: intent.socialPreference.trim(),
  } };
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
  const result = scoreMatch(candidate.matchSignals, candidate);
  return {
    candidate,
    score: result.score,
    reasons: result.reasons.map(({ key }) => reasonLabels[key]),
    reasonKeys: result.reasons.map(({ key }) => key),
  };
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}
