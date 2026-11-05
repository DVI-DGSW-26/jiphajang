import { Badge, type BadgeTone } from '../components/Badge.tsx';
import {
  COLLECTION_STATUS,
  CONTAINER_STATUS,
  type CollectionStatus,
  type ContainerStatus,
  INVOICE_STATUS,
  type InvoiceStatus,
} from '../config/enums.ts';

const CONTAINER_TONE: Record<ContainerStatus, BadgeTone> = { IN_TRANSIT: 'wait', RECEIVED: 'ok' };
const INVOICE_TONE: Record<InvoiceStatus, BadgeTone> = {
  DRAFT: 'note',
  PENDING: 'wait',
  SHIPPED: 'ok',
  CANCELED: 'note',
};
const COLLECTION_TONE: Record<CollectionStatus, BadgeTone> = {
  UNPAID: 'bad',
  PARTIAL: 'wait',
  PAID: 'ok',
};

export const ContainerBadge = ({ status }: { status: ContainerStatus }) => (
  <Badge tone={CONTAINER_TONE[status]}>{CONTAINER_STATUS[status]}</Badge>
);

export const InvoiceBadge = ({ status }: { status: InvoiceStatus }) => (
  <Badge tone={INVOICE_TONE[status]}>{INVOICE_STATUS[status]}</Badge>
);

export const CollectionBadge = ({ status }: { status: CollectionStatus }) => (
  <Badge tone={COLLECTION_TONE[status]}>{COLLECTION_STATUS[status]}</Badge>
);
