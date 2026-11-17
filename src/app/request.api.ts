import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { ApprovalRequest, RequestCategory, Role } from './request.model';

export interface CreateRequest {
  title: string;
  category: RequestCategory;
  amount: number;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class RequestApi {
  private readonly http = inject(HttpClient);
  list() {
    return firstValueFrom(this.http.get<ApprovalRequest[]>('/api/requests').pipe(timeout(10000)));
  }
  create(input: CreateRequest) {
    return firstValueFrom(this.http.post<ApprovalRequest>('/api/requests', input).pipe(timeout(10000)));
  }
  decide(id: string, action: 'Approved' | 'Rejected', note: string, role: Role) {
    return firstValueFrom(this.http.patch<ApprovalRequest>(`/api/requests/${encodeURIComponent(id)}/decision`, { action, note, role }).pipe(timeout(10000)));
  }
  reset() {
    return firstValueFrom(this.http.post<ApprovalRequest[]>('/api/reset', {}).pipe(timeout(10000)));
  }
}
