export const validateFileSizeByType = (file) => {
  const MAX_SIZES = {
    "application/pdf": 10 * 1024 * 1024,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": 5 * 1024 * 1024,
    "text/plain": 2 * 1024 * 1024,
    "text/csv": 2 * 1024 * 1024,
  };

  const maxSize = MAX_SIZES[file.mimetype];

  if (!maxSize) {
    throw new Error("Unsupported file type");
  }

  if (file.size > maxSize) {
    throw new Error("File too large for this type");
  }
};