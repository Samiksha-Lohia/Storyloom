import User from '../models/user.model.js';
import { UserDto } from '../dtos/user.dto.js';
import { LibraryService } from '../services/library.service.js';
import { sendSuccess } from '../utilities/response.js';
import { NotFoundError } from '../utilities/custom-errors.js';

export class MeController {
  /**
   * PUT /me/mature-ack
   * Acknowledges mature (18+) content warning.
   */
  static async matureAck(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        throw new NotFoundError('User not found.');
      }

      user.matureAckAt = new Date();
      await user.save();

      return sendSuccess(
        res,
        {
          acknowledged: true,
          matureAckAt: user.matureAckAt,
        },
        200,
        'Mature content warning acknowledged successfully.'
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /me/profile
   * Updates user profile (name, bio, defaultTemplate).
   */
  static async updateProfile(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        throw new NotFoundError('User not found.');
      }

      if (req.body.name !== undefined) user.name = req.body.name.trim();
      if (req.body.bio !== undefined) user.bio = req.body.bio.trim();
      if (req.body.defaultTemplate !== undefined) user.defaultTemplate = req.body.defaultTemplate;

      await user.save();

      return sendSuccess(
        res,
        UserDto.toResponse(user),
        200,
        'Profile updated successfully.'
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /me/settings
   * Updates reader typography and theme settings.
   */
  static async updateSettings(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        throw new NotFoundError('User not found.');
      }

      user.readerSettings = {
        ...(user.readerSettings?.toObject?.() || user.readerSettings || {}),
        ...req.body,
      };

      await user.save();

      return sendSuccess(
        res,
        {
          readerSettings: user.readerSettings,
        },
        200,
        'Reader settings updated successfully.'
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /me/library
   * Retrieves reader's reading list.
   */
  static async getLibrary(req, res, next) {
    try {
      const result = await LibraryService.getLibrary(req.user.id, req.query);
      return sendSuccess(res, result, 200, 'Library retrieved successfully.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /me/library/:bookId
   * Retrieves progress for a specific book.
   */
  static async getLibraryBook(req, res, next) {
    try {
      const entry = await LibraryService.getLibraryEntry(req.user.id, req.params.bookId);
      if (!entry) {
        throw new NotFoundError('Book is not in your library.');
      }
      return sendSuccess(res, entry, 200, 'Library entry retrieved.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /me/library/:bookId
   * Updates progress, furthest point, and bookmarks.
   */
  static async updateLibraryBook(req, res, next) {
    try {
      const updated = await LibraryService.updateLibraryEntry(
        req.user.id,
        req.params.bookId,
        req.body
      );
      return sendSuccess(res, updated, 200, 'Library entry updated successfully.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /me/library/:bookId
   * Removes book from reader's library.
   */
  static async deleteLibraryBook(req, res, next) {
    try {
      await LibraryService.deleteLibraryEntry(req.user.id, req.params.bookId);
      return sendSuccess(res, { removed: true }, 200, 'Book removed from library successfully.');
    } catch (err) {
      next(err);
    }
  }
}
