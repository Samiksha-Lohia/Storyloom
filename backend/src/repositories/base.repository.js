import mongoose from 'mongoose';

class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async create(data, options = {}) {
    if (options.session) {
      const docs = await this.model.create(Array.isArray(data) ? data : [data], { session: options.session });
      return Array.isArray(data) ? docs : docs[0];
    }
    return this.model.create(data);
  }

  async findById(id, projection = null, options = {}) {
    return this.model.findById(id, projection, options);
  }

  async findOne(filter = {}, projection = null, options = {}) {
    return this.model.findOne(filter, projection, options);
  }

  async find(filter = {}, projection = null, options = {}) {
    const { sort, skip, limit, populate } = options;
    let query = this.model.find(filter, projection, options);

    if (populate) {
      query = query.populate(populate);
    }
    if (sort) {
      query = query.sort(sort);
    }
    if (skip) {
      query = query.skip(skip);
    }
    if (limit) {
      query = query.limit(limit);
    }

    return query.exec();
  }

  async updateById(id, updateData, options = {}) {
    return this.model.findByIdAndUpdate(id, updateData, { new: true, runValidators: true, ...options });
  }

  async updateOne(filter, updateData, options = {}) {
    return this.model.findOneAndUpdate(filter, updateData, { new: true, runValidators: true, ...options });
  }

  async updateMany(filter, updateData, options = {}) {
    return this.model.updateMany(filter, updateData, options);
  }

  async deleteById(id, options = {}) {
    return this.model.findByIdAndDelete(id, options);
  }

  async deleteMany(filter, options = {}) {
    return this.model.deleteMany(filter, options);
  }

  async count(filter = {}, options = {}) {
    return this.model.countDocuments(filter, options);
  }

  static async runTransaction(fn) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const result = await fn(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

export default BaseRepository;
