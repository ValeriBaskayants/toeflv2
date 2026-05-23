import type { PlacementStatusResponse, StartTestResponse, AnswerResponse, SkipResponse, RemindLaterResponse } from '@/types/Placement/Placement.types';
import { api } from '../client';


export const placementApi = {
  getStatus: () =>
    api.get<PlacementStatusResponse>('/placement/status'),

  start: () =>
    api.post<StartTestResponse>('/placement/start'),

  answer: (questionIndex: number, selectedIndex: number) =>
    api.post<AnswerResponse>('/placement/answer', { questionIndex, selectedIndex }),

  skip: () =>
    api.post<SkipResponse>('/placement/skip'),

  remindLater: () =>
    api.post<RemindLaterResponse>('/placement/remind-later'),
};