import type { ProjectStatus, TicketCategory, TicketPriority, TicketStatus } from './types';

export const projectStatuses: ProjectStatus[] = ['ACTIVE', 'PAUSED', 'COMPLETED'];

export const ticketStatuses: TicketStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_CLIENT',
  'RESOLVED',
  'CLOSED',
];

export const ticketPriorities: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const ticketCategories: TicketCategory[] = [
  'BUG',
  'FEATURE_REQUEST',
  'SUPPORT',
  'SECURITY',
  'PERFORMANCE',
];
