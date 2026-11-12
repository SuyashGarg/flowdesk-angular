export type RequestStatus = "Draft" | "Pending" | "Approved" | "Rejected";
export type Role = "Requester" | "Approver";
export type RequestCategory = "Software" | "Travel" | "Equipment" | "Other";
export interface ApprovalRequest {
  id: string;
  title: string;
  category: RequestCategory;
  amount: number;
  requester: string;
  createdAt: string;
  status: RequestStatus;
  description: string;
  history: { at: string; action: string; by: string }[];
}
