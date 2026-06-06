import Usage from "../usage/usage.model";
import Document from "../document/document.model";
import { Types } from "mongoose";

const MAX_SIZES: Record<string, number> = {
  "application/pdf": 10 * 1024 * 1024,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    5 * 1024 * 1024,
  "text/plain": 2 * 1024 * 1024,
  "text/csv": 2 * 1024 * 1024,
};

export const validateFileSizeByType = (file: Express.Multer.File): void => {
  const maxSize = MAX_SIZES[file.mimetype];

  if (!maxSize) {
    throw new Error("Unsupported file type");
  }

  if (file.size > maxSize) {
    throw new Error("File too large for this type");
  }
};

export const refundQuota = async (
  userId: Types.ObjectId,
  type: "UPLOAD" | "ASK",
  documentId: Types.ObjectId,
): Promise<void> => {
  const session = await Usage.startSession();
  session.startTransaction();

  try {
    // STEP 1: fetch document
    const document = await Document.findById(documentId).session(session);

    if (!document) {
      throw new Error("DOCUMENT_NOT_FOUND");
    }

    // STEP 2: idempotency check
    if (!document.quotaCharged) {
      // already refunded
      await session.commitTransaction();
      session.endSession();
      return;
    }

    const update: Record<string, unknown> = {};

    if (type === "UPLOAD") {
      update.$inc = { uploadsUsed: -1 };
    } else if (type === "ASK") {
      update.$inc = { asksUsed: -1 };
    } else {
      throw new Error("INVALID_REFUND_TYPE");
    }

    // STEP 3: refund quota
    await Usage.findOneAndUpdate({ userId }, update, { session });

    // STEP 4: mark as refunded
    document.quotaCharged = false;
    await document.save({ session });

    await session.commitTransaction();
    session.endSession();
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};
