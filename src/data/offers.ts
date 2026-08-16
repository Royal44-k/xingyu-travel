import type { RawOffer } from '@/domain/comparison/types';

export const SANDBOX_OBSERVED_AT = '2026-08-16T09:00:00+08:00';

export const sandboxOffers: readonly RawOffer[] = [
  {
    id: 'DEMO-FLIGHT-DAL-01',
    provider: '星屿沙箱演示航班',
    kind: 'flight',
    title: '上海至大理演示航班 A',
    origin: '上海',
    destination: '大理',
    basePrice: 860,
    taxes: 120,
    mandatoryFees: 40,
    baggageIncluded: true,
    refundable: false,
    providerVerified: true,
    includedBenefits: ['托运行李'],
    updatedAt: SANDBOX_OBSERVED_AT,
    demoMode: true,
  },
  {
    id: 'DEMO-FLIGHT-DAL-02',
    provider: '星屿沙箱演示航班',
    kind: 'flight',
    title: '上海至大理演示航班 B',
    origin: '上海',
    destination: '大理',
    basePrice: 930,
    taxes: 80,
    mandatoryFees: 0,
    baggageIncluded: false,
    refundable: true,
    providerVerified: true,
    includedBenefits: [],
    updatedAt: SANDBOX_OBSERVED_AT,
    demoMode: true,
  },
  {
    id: 'DEMO-HOTEL-DAL-01',
    provider: '星屿沙箱演示住宿',
    kind: 'hotel',
    title: '大理湖畔演示住宿',
    destination: '大理',
    basePrice: 680,
    taxes: 30,
    mandatoryFees: 20,
    baggageIncluded: false,
    refundable: true,
    providerVerified: true,
    includedBenefits: ['双人早餐'],
    updatedAt: SANDBOX_OBSERVED_AT,
    demoMode: true,
  },
  {
    id: 'DEMO-TICKET-DAL-01',
    provider: '星屿沙箱演示门票',
    kind: 'ticket',
    title: '大理古城体验演示门票',
    destination: '大理',
    basePrice: 88,
    taxes: 0,
    mandatoryFees: 0,
    baggageIncluded: false,
    refundable: true,
    providerVerified: true,
    includedBenefits: ['古城导览'],
    updatedAt: SANDBOX_OBSERVED_AT,
    demoMode: true,
  },
] as const;

export type SandboxSupplierRunFixture =
  | {
      status: 'success';
      provider: string;
      kind: 'flight' | 'hotel' | 'ticket';
      destination: string;
      offerIds: readonly string[];
    }
  | {
      status: 'failure';
      provider: string;
      kind: 'flight' | 'hotel' | 'ticket';
      destination: string;
      message: string;
    };

export const sandboxSupplierRuns: readonly SandboxSupplierRunFixture[] = [
  {
    status: 'success',
    provider: '星屿沙箱演示航班',
    kind: 'flight',
    destination: '大理',
    offerIds: ['DEMO-FLIGHT-DAL-01', 'DEMO-FLIGHT-DAL-02'],
  },
  {
    status: 'failure',
    provider: '云际航旅沙箱',
    kind: 'flight',
    destination: '大理',
    message: '云际航旅沙箱暂未响应',
  },
  {
    status: 'success',
    provider: '星屿沙箱演示住宿',
    kind: 'hotel',
    destination: '大理',
    offerIds: ['DEMO-HOTEL-DAL-01'],
  },
  {
    status: 'success',
    provider: '星屿沙箱演示门票',
    kind: 'ticket',
    destination: '大理',
    offerIds: ['DEMO-TICKET-DAL-01'],
  },
  {
    status: 'failure',
    provider: '大理景区直连',
    kind: 'ticket',
    destination: '大理',
    message: '大理景区直连暂未响应',
  },
] as const;
