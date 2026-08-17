const immediateDangerPattern = /失联|人身危险|昏迷|晕厥|失去意识|胸痛|呼吸困难|大出血|抽搐|持刀|暴力袭击|绑架|火灾|着火|被困/;

export function isImmediateDanger(question: string): boolean {
  return immediateDangerPattern.test(question);
}

const unverifiedClaimPattern = /实时|当前航班|(?:航班|天气|景区).{0,12}(?:已|将|正在).{0,8}(?:延误|取消|关闭|下雨)|确诊|诊断|法律结论|违法|救援(?:已|正在)|已报警|已联系/;

export function containsUnverifiedHighStakesClaim(answer: string): boolean {
  return unverifiedClaimPattern.test(answer);
}
