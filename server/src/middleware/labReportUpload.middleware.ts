import multer from "multer";
import path from "path";
import fs from "fs";

// ============================================================
// UPLOAD DIRECTORY
// ============================================================

const uploadDirectory =
  path.join(
    process.cwd(),
    "uploads",
    "lab-reports",
  );

// ============================================================
// CREATE DIRECTORY
// ============================================================

if (
  !fs.existsSync(
    uploadDirectory,
  )
) {
  fs.mkdirSync(
    uploadDirectory,
    {
      recursive: true,
    },
  );
}

// ============================================================
// STORAGE
// ============================================================

const storage =
  multer.diskStorage({
    destination: (
      _req,
      _file,
      cb,
    ) => {
      cb(
        null,
        uploadDirectory,
      );
    },

    filename: (
      _req,
      file,
      cb,
    ) => {
      const extension =
        path.extname(
          file.originalname,
        );

      const baseName =
        path
          .basename(
            file.originalname,
            extension,
          )
          .replace(
            /[^a-zA-Z0-9-_]/g,
            "-",
          );

      const uniqueName =
        `${Date.now()}-${Math.round(
          Math.random() * 1e9,
        )}-${baseName}${extension}`;

      cb(
        null,
        uniqueName,
      );
    },
  });

// ============================================================
// FILE FILTER
// ============================================================

const fileFilter:
  multer.Options["fileFilter"] =
  (
    _req,
    file,
    cb,
  ) => {
    const allowedMimeTypes =
      [
        "application/pdf",
        "image/jpeg",
        "image/png",
      ];

    const allowedExtensions =
      [
        ".pdf",
        ".jpg",
        ".jpeg",
        ".png",
      ];

    const extension =
      path
        .extname(
          file.originalname,
        )
        .toLowerCase();

    if (
      allowedMimeTypes.includes(
        file.mimetype,
      ) &&
      allowedExtensions.includes(
        extension,
      )
    ) {
      cb(
        null,
        true,
      );

      return;
    }

    cb(
      new Error(
        "Only PDF, JPG, JPEG and PNG files are allowed.",
      ),
    );
  };

// ============================================================
// MULTER
// ============================================================

export const labReportUpload =
  multer({
    storage,

    fileFilter,

    limits: {
      fileSize:
        10 * 1024 * 1024,
    },
  });