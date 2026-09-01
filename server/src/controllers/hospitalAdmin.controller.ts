import { Request, Response } from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import { User } from "../models/User.model";
import { Hospital } from "../models/Hospital.model";

/* =========================================================
   HELPERS
========================================================= */

/**
 * Express params can be typed as string | string[].
 * We only accept a single string parameter.
 */
const getStringParam = (
  value: string | string[] | undefined
): string | null => {
  if (typeof value === "string") {
    return value;
  }

  return null;
};

/**
 * Safely convert a value to ObjectId.
 */
const getObjectId = (
  value: unknown
): mongoose.Types.ObjectId | null => {
  if (typeof value !== "string") {
    return null;
  }

  if (!mongoose.Types.ObjectId.isValid(value)) {
    return null;
  }

  return new mongoose.Types.ObjectId(value);
};

/* =========================================================
   GET ALL HOSPITAL ADMINS
   GET /api/hospital-admins
========================================================= */

export const getHospitalAdmins = async (
  req: Request,
  res: Response
) => {
  try {
    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    const status =
      typeof req.query.status === "string"
        ? req.query.status
        : "";

    const hospitalId =
      typeof req.query.hospitalId === "string"
        ? req.query.hospitalId
        : "";

    /* =====================================================
       FILTER
    ===================================================== */

    const filter: Record<string, unknown> = {
      role: "HOSPITAL_ADMIN",
    };

    /* =====================================================
       SEARCH
    ===================================================== */

    if (search) {
      const searchRegex = new RegExp(search, "i");

      filter.$or = [
        {
          name: searchRegex,
        },
        {
          email: searchRegex,
        },
      ];
    }

    /* =====================================================
       STATUS FILTER

       IMPORTANT:
       Database source of truth = isActive
    ===================================================== */

    if (status === "active") {
      filter.isActive = true;
    }

    if (status === "inactive") {
      filter.isActive = false;
    }

    /* =====================================================
       HOSPITAL FILTER
    ===================================================== */

    if (hospitalId) {
      const objectId = getObjectId(hospitalId);

      if (!objectId) {
        return res.status(400).json({
          success: false,
          message: "Invalid hospital ID",
        });
      }

      filter.hospitalId = objectId;
    }

    /* =====================================================
       GET ADMINS
    ===================================================== */

    const admins = await User.find(filter)
      .populate(
        "hospitalId",
        "_id name email phone city state"
      )
      .select(
        "-password -refreshToken -resetPasswordToken"
      )
      .sort({
        createdAt: -1,
      })
      .lean();

    /* =====================================================
       NORMALIZE RESPONSE
    ===================================================== */

    const formattedAdmins = admins.map((admin) => ({
      ...admin,

      /*
       * Keep hospitalId populated because frontend
       * needs hospital name.
       */
      hospitalId:
        admin.hospitalId &&
        typeof admin.hospitalId === "object"
          ? {
              _id: String(
                (admin.hospitalId as any)._id
              ),
              name:
                (admin.hospitalId as any).name ||
                "Hospital not assigned",
              email:
                (admin.hospitalId as any).email,
              phone:
                (admin.hospitalId as any).phone,
            }
          : null,

      /*
       * Always derive status from isActive.
       */
      status: admin.isActive
        ? "ACTIVE"
        : "INACTIVE",
    }));

    return res.status(200).json({
      success: true,
      data: formattedAdmins,
      total: formattedAdmins.length,
    });
  } catch (error) {
    console.error(
      "GET HOSPITAL ADMINS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch hospital admins",
    });
  }
};
/* =========================================================
   GET SINGLE HOSPITAL ADMIN
   GET /api/hospital-admins/:adminId
========================================================= */

export const getHospitalAdmin = async (
  req: Request,
  res: Response
) => {
  try {
    const adminId =
      getStringParam(req.params.adminId);

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin ID",
      });
    }

    const adminObjectId =
      getObjectId(adminId);

    if (!adminObjectId) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin ID",
      });
    }

    /* -----------------------------------------------------
       FIND ADMIN
    ----------------------------------------------------- */

    const admin = await User.findOne({
      _id: adminObjectId,
      role: "HOSPITAL_ADMIN",
    })
      .populate(
        "hospitalId",
        "name email phone address city state pincode"
      )
      .select(
        "-password -refreshToken -resetPasswordToken"
      )
      .lean();

    if (!admin) {
      return res.status(404).json({
        success: false,
        message:
          "Hospital admin not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: admin,
    });
  } catch (error) {
    console.error(
      "GET HOSPITAL ADMIN ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch hospital admin",
    });
  }
};

/* =========================================================
   CREATE HOSPITAL ADMIN
   POST /api/hospital-admins
========================================================= */

export const createHospitalAdmin = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      name,
      email,
      password,
      hospitalId,
    } = req.body;

    /* -----------------------------------------------------
       VALIDATION
    ----------------------------------------------------- */

    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Admin name is required",
      });
    }

    if (
      typeof email !== "string" ||
      !email.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    if (
      typeof hospitalId !== "string" ||
      !hospitalId
    ) {
      return res.status(400).json({
        success: false,
        message: "Hospital is required",
      });
    }

    /* -----------------------------------------------------
       HOSPITAL OBJECT ID
    ----------------------------------------------------- */

    const hospitalObjectId =
      getObjectId(hospitalId);

    if (!hospitalObjectId) {
      return res.status(400).json({
        success: false,
        message: "Invalid hospital ID",
      });
    }

    /* -----------------------------------------------------
       CHECK HOSPITAL
    ----------------------------------------------------- */

    const hospital =
      await Hospital.findById(
        hospitalObjectId
      );

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: "Hospital not found",
      });
    }

    if (hospital.isActive === false) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot create admin for an inactive hospital",
      });
    }

    /* -----------------------------------------------------
       NORMALIZE EMAIL
    ----------------------------------------------------- */

    const normalizedEmail =
      email.trim().toLowerCase();

    /* -----------------------------------------------------
       CHECK EXISTING USER
    ----------------------------------------------------- */

    const existingUser =
      await User.findOne({
        email: normalizedEmail,
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "A user with this email already exists",
      });
    }

    /* -----------------------------------------------------
       PASSWORD HASH
    ----------------------------------------------------- */

    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );

    /* -----------------------------------------------------
       CREATE USER
       
       IMPORTANT:
       Your User model does not have `phone`,
       so we don't send phone here.
    ----------------------------------------------------- */

    const admin = await User.create({
      name: name.trim(),

      email: normalizedEmail,

      password: hashedPassword,

      role: "HOSPITAL_ADMIN",

      hospitalId: hospitalObjectId,

      isActive: true,
    });

    /* -----------------------------------------------------
       FETCH CREATED ADMIN
    ----------------------------------------------------- */

    const result =
      await User.findById(admin._id)
        .populate(
          "hospitalId",
          "name email phone city state"
        )
        .select(
          "-password -refreshToken -resetPasswordToken"
        )
        .lean();

    return res.status(201).json({
      success: true,

      message:
        "Hospital admin created successfully",

      data: result,
    });
  } catch (error: any) {
    console.error(
      "CREATE HOSPITAL ADMIN ERROR:",
      error
    );

    /* -----------------------------------------------------
       DUPLICATE KEY
    ----------------------------------------------------- */

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A user with this email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to create hospital admin",
    });
  }
};

/* =========================================================
   UPDATE HOSPITAL ADMIN
   PUT /api/hospital-admins/:adminId
========================================================= */

export const updateHospitalAdmin = async (
  req: Request,
  res: Response
) => {
  try {
    const adminId =
      getStringParam(req.params.adminId);

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin ID",
      });
    }

    const adminObjectId =
      getObjectId(adminId);

    if (!adminObjectId) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin ID",
      });
    }

    /* -----------------------------------------------------
       FIND ADMIN
    ----------------------------------------------------- */

    const admin =
      await User.findOne({
        _id: adminObjectId,
        role: "HOSPITAL_ADMIN",
      });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message:
          "Hospital admin not found",
      });
    }

    const {
      name,
      email,
      hospitalId,
    } = req.body;

    /* -----------------------------------------------------
       UPDATE NAME
    ----------------------------------------------------- */

    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        !name.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Admin name cannot be empty",
        });
      }

      admin.name = name.trim();
    }

    /* -----------------------------------------------------
       UPDATE EMAIL
    ----------------------------------------------------- */

    if (email !== undefined) {
      if (
        typeof email !== "string" ||
        !email.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Email cannot be empty",
        });
      }

      const normalizedEmail =
        email.trim().toLowerCase();

      const duplicate =
        await User.findOne({
          email: normalizedEmail,
          _id: {
            $ne: adminObjectId,
          },
        });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message:
            "Another user already uses this email",
        });
      }

      admin.email =
        normalizedEmail;
    }

    /* -----------------------------------------------------
       UPDATE HOSPITAL
    ----------------------------------------------------- */

    if (hospitalId !== undefined) {
      if (
        typeof hospitalId !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid hospital ID",
        });
      }

      const hospitalObjectId =
        getObjectId(hospitalId);

      if (!hospitalObjectId) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid hospital ID",
        });
      }

      const hospital =
        await Hospital.findById(
          hospitalObjectId
        );

      if (!hospital) {
        return res.status(404).json({
          success: false,
          message:
            "Hospital not found",
        });
      }

      if (hospital.isActive === false) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot assign admin to an inactive hospital",
        });
      }

      admin.hospitalId =
        hospitalObjectId;
    }

    /* -----------------------------------------------------
       SAVE
    ----------------------------------------------------- */

    await admin.save();

    /* -----------------------------------------------------
       RETURN UPDATED ADMIN
    ----------------------------------------------------- */

    const result =
      await User.findById(admin._id)
        .populate(
          "hospitalId",
          "name email phone city state"
        )
        .select(
          "-password -refreshToken -resetPasswordToken"
        )
        .lean();

    return res.status(200).json({
      success: true,

      message:
        "Hospital admin updated successfully",

      data: result,
    });
  } catch (error: any) {
    console.error(
      "UPDATE HOSPITAL ADMIN ERROR:",
      error
    );

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A user with this email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to update hospital admin",
    });
  }
};

/* =========================================================
   UPDATE ADMIN STATUS
   PATCH /api/hospital-admins/:adminId/status
========================================================= */

export const updateHospitalAdminStatus =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const adminId =
        getStringParam(
          req.params.adminId
        );

      if (!adminId) {
        return res.status(400).json({
          success: false,
          message: "Invalid admin ID",
        });
      }

      const adminObjectId =
        getObjectId(adminId);

      if (!adminObjectId) {
        return res.status(400).json({
          success: false,
          message: "Invalid admin ID",
        });
      }

      const {
        isActive,
      } = req.body;

      /* -----------------------------------------------------
         VALIDATION
      ----------------------------------------------------- */

      if (
        typeof isActive !== "boolean"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "isActive must be boolean",
        });
      }

      /* -----------------------------------------------------
         FIND ADMIN
      ----------------------------------------------------- */

      const admin =
        await User.findOne({
          _id: adminObjectId,
          role: "HOSPITAL_ADMIN",
        });

      if (!admin) {
        return res.status(404).json({
          success: false,
          message:
            "Hospital admin not found",
        });
      }

      /* -----------------------------------------------------
         UPDATE
      ----------------------------------------------------- */

      admin.isActive =
        isActive;

      await admin.save();

      /* -----------------------------------------------------
         RETURN UPDATED ADMIN
      ----------------------------------------------------- */

      const result =
        await User.findById(admin._id)
          .populate(
            "hospitalId",
            "name email phone city state"
          )
          .select(
            "-password -refreshToken -resetPasswordToken"
          )
          .lean();

      return res.status(200).json({
        success: true,

        message: isActive
          ? "Hospital admin activated successfully"
          : "Hospital admin deactivated successfully",

        data: result,
      });
    } catch (error) {
      console.error(
        "UPDATE HOSPITAL ADMIN STATUS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to update admin status",
      });
    }
  };

/* =========================================================
   DELETE HOSPITAL ADMIN
   DELETE /api/hospital-admins/:adminId
========================================================= */

export const deleteHospitalAdmin = async (
  req: Request,
  res: Response
) => {
  try {
    const adminId =
      getStringParam(
        req.params.adminId
      );

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin ID",
      });
    }

    const adminObjectId =
      getObjectId(adminId);

    if (!adminObjectId) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin ID",
      });
    }

    /* -----------------------------------------------------
       FIND ADMIN
    ----------------------------------------------------- */

    const admin =
      await User.findOne({
        _id: adminObjectId,
        role: "HOSPITAL_ADMIN",
      });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message:
          "Hospital admin not found",
      });
    }

    /* -----------------------------------------------------
       DELETE
    ----------------------------------------------------- */

    await User.deleteOne({
      _id: adminObjectId,
    });

    return res.status(200).json({
      success: true,

      message:
        "Hospital admin deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE HOSPITAL ADMIN ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete hospital admin",
    });
  }
};