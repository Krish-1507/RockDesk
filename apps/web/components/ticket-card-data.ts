export interface TicketCardData {
  id: string;
  ticketNumber: number;
  title: string;
  assignee: { name: string } | null;
  dueDate: string | null;
  priority: string;
  status: string;
}
