import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Mistake, MistakeDocument } from './schemas/mistake.schema';

@Injectable()
export class MistakesService {
  constructor(@InjectModel(Mistake.name) private model: Model<MistakeDocument>) {}

  async findAll(userId: string, itemType?: string) {
    const filter: any = { userId };
    if (itemType) filter.itemType = itemType;
    return this.model.find(filter).sort({ occurrenceCount: -1 }).lean();
  }

  async getWeakSpots(userId: string) {
    return this.model.aggregate([
      { $match: { userId: userId as any } },
      { $group: { _id: { topic: '$topic', itemType: '$itemType' }, count: { $sum: '$occurrenceCount' }, level: { $first: '$level' } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { topic: '$_id.topic', itemType: '$_id.itemType', count: 1, level: 1, _id: 0 } },
    ]);
  }
}
