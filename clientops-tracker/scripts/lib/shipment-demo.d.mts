export interface ShipmentDemo {
  ticketId: string;
  revisionId: string;
  projectId: string;
  title: string;
}
export function prepareShipmentDemo(origin: string): Promise<ShipmentDemo>;
