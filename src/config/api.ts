/**
 * 임시 API 경로 — 서버와 아직 맞추지 않았어요. 지금은 가짜 서버(`mock/`)만 답해요.
 * 경로를 바꿀 때는 이 파일만 고쳐요. 화면과 가짜 서버가 모두 여기를 읽어요.
 */

const id = (value: string) => encodeURIComponent(value);

export const API = {
  customers: '/master/customers',
  warehouses: '/master/warehouses',
  parts: '/master/parts',
  partPrices: (partId: string) => `/master/parts/${id(partId)}/prices`,

  containers: '/containers',
  containerReceive: (containerId: string) => `/containers/${id(containerId)}/receive`,

  invoices: '/invoices',
  invoicePreview: '/invoices/preview',
  invoice: (invoiceId: string) => `/invoices/${id(invoiceId)}`,
  invoiceCancel: (invoiceId: string) => `/invoices/${id(invoiceId)}/cancel`,
  invoiceConfirm: (invoiceId: string) => `/invoices/${id(invoiceId)}/confirm`,
  invoiceAttachments: (invoiceId: string) => `/invoices/${id(invoiceId)}/attachments`,

  collections: '/collections',
  collectionSummary: '/collections/summary',

  stockByCustomer: '/stock/by-customer',
  stockByContainer: '/stock/by-container',
} as const;
