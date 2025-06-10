import { ObjectId } from 'mongodb';
import { DynamicRepository } from '../../repositories/DynamicRepository';

export class AidoOrderProcessing {
  private repository: DynamicRepository;

  constructor() {
    this.repository = new DynamicRepository('aido_order_processing');
  }

  async create(data: {
    url: string;
    original_filename: string;
    file_type: string;
    id: string;
    folder_path?: string;
  }) {
    return this.repository.create(data);
  }

  async find(filter: any = {}) {
    return this.repository.find(filter);
  }

  async findById(id: string) {
    return await this.repository.findOne({ _id: new ObjectId(id) });
  }

  async update(id: string, data: any) {
    return this.repository.update(id, data);
  }

  async delete(id: string) {
    return this.repository.delete(id);
  }
} 