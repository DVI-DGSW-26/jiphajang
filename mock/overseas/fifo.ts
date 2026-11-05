/** FIFO 배정 — 오래된 컨테이너부터 필요한 만큼 채워요. 가용 재고는 부르는 쪽이 계산해 넘겨요 */

export type FifoLot = { id: string; containerNo: string; available: number };

export type FifoResult = {
  allocations: { lotId: string; containerNo: string; pallets: number }[];
  /** 모자란 팔레트 */
  shortage: number;
};

export function allocateFifo(lots: readonly FifoLot[], pallets: number): FifoResult {
  const allocations: FifoResult['allocations'] = [];
  let left = pallets;
  for (const lot of lots) {
    if (left === 0) break;
    const take = Math.min(lot.available, left);
    if (take <= 0) continue;
    allocations.push({ lotId: lot.id, containerNo: lot.containerNo, pallets: take });
    left -= take;
  }
  return { allocations, shortage: left };
}
