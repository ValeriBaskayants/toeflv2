import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MultipleChoice, MultipleChoiceDocument } from './schemas/multiple-choice.schema';

@Injectable()
export class MultipleChoiceService {
  constructor(@InjectModel(MultipleChoice.name) private model: Model<MultipleChoiceDocument>) {}

  async findAll(query: { level?: string; difficulty?: string; limit?: number }) {
    const filter: any = {};
    if (query.level) filter.level = query.level;
    if (query.difficulty) filter.difficulty = query.difficulty;
    return this.model.find(filter).limit(query.limit || 100).lean();
  }

  async findRandom(level: string, count: number) {
    return this.model.aggregate([
      { $match: { level } },
      { $sample: { size: count } },
    ]);
  }

  async bulkCreate(items: any[]) {
    let inserted = 0, skipped = 0, errors = 0;
    for (const item of items) {
      try {
        const exists = await this.model.findOne({ question: item.question });
        if (exists) { skipped++; continue; }
        await this.model.create(item);
        inserted++;
      } catch { errors++; }
    }
    return { inserted, skipped, errors };
  }
}
