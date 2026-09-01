import type {
  Request,
  Response,
} from "express";

import mongoose from "mongoose";

import { Department } from "../models/Department.model";

/* =========================================================
   HELPER
   Express params can be string | string[]
========================================================= */

const getParamString = (
  value:
    | string
    | string[]
    | undefined,
): string | undefined => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0];
  }

  return undefined;
};

/* =========================================================
   CREATE DEPARTMENT
   POST /api/departments
========================================================= */

export const createDepartment = async (
  req: Request,
  res: Response,
) => {
  try {
    console.log(
      "CREATE DEPARTMENT BODY:",
      req.body,
    );

    const {
      name,
      tokenPrefix,
      description,
    } = req.body;

    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    /*
     * Department creation is for hospital users.
     * Super Admin should create departments by
     * explicitly supplying hospitalId if you want
     * Super Admin department creation.
     */
    let hospitalId: string | undefined;

    if (user.role === "SUPER_ADMIN") {
      hospitalId =
        typeof req.body.hospitalId === "string"
          ? req.body.hospitalId
          : undefined;
    } else {
      hospitalId = user.hospitalId;
    }

    if (!hospitalId) {
      return res.status(400).json({
        success: false,
        message:
          "Hospital information is required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        hospitalId,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid hospital ID",
      });
    }

    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Department name is required",
      });
    }

    if (
      typeof tokenPrefix !== "string" ||
      !tokenPrefix.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Token prefix is required",
      });
    }

    const existingDepartment =
      await Department.findOne({
        hospitalId,
        name: name.trim(),
      });

    if (existingDepartment) {
      return res.status(409).json({
        success: false,
        message:
          "Department already exists in this hospital",
      });
    }

    const department =
      await Department.create({
        hospitalId,
        name: name.trim(),
        tokenPrefix: tokenPrefix
          .trim()
          .toUpperCase(),
        description:
          typeof description === "string"
            ? description.trim()
            : "",
      });

    return res.status(201).json({
      success: true,
      message:
        "Department created successfully",
      data: department,
    });
  } catch (error) {
    console.error(
      "Create department error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Internal server error",
    });
  }
};
/* =========================================================
   GET DEPARTMENTS
   GET /api/departments

   SUPER_ADMIN:
   /api/departments?hospitalId=xxxx

   NORMAL USER:
   hospitalId comes from req.user
========================================================= */

export const getDepartments = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    /*
     * =====================================================
     * SUPER ADMIN
     *
     * GET /api/departments?hospitalId=xxxxx
     * =====================================================
     */

    if (user.role === "SUPER_ADMIN") {
      const hospitalId =
        typeof req.query.hospitalId === "string"
          ? req.query.hospitalId
          : undefined;

      if (!hospitalId) {
        return res.status(400).json({
          success: false,
          message:
            "hospitalId is required for super admin",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          hospitalId,
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid hospital ID",
        });
      }

      const departments =
        await Department.find({
          hospitalId,
          isActive: true,
        }).sort({
          name: 1,
        });

      return res.status(200).json({
        success: true,
        count: departments.length,
        data: departments,
      });
    }

    /*
     * =====================================================
     * NORMAL HOSPITAL USER
     * =====================================================
     */

    const hospitalId =
      user.hospitalId;

    if (!hospitalId) {
      return res.status(400).json({
        success: false,
        message:
          "Hospital is not assigned to this user",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        hospitalId,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid hospital ID",
      });
    }

    const departments =
      await Department.find({
        hospitalId,
        isActive: true,
      }).sort({
        name: 1,
      });

    return res.status(200).json({
      success: true,
      count: departments.length,
      data: departments,
    });
  } catch (error) {
    console.error(
      "Get departments error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch departments",
    });
  }
};

/* =========================================================
   UPDATE DEPARTMENT
   PUT /api/departments/:id

   SUPER_ADMIN:
   body:
   {
     hospitalId: "...",
     name: "...",
     description: "...",
     isActive: true
   }

   NORMAL USER:
   hospitalId comes from req.user
========================================================= */

export const updateDepartment = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const departmentId =
      typeof req.params.id === "string"
        ? req.params.id
        : undefined;

    if (!departmentId) {
      return res.status(400).json({
        success: false,
        message:
          "Department ID is required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        departmentId,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid department ID",
      });
    }

    const {
      name,
      description,
      isActive,
      hospitalId,
    } = req.body;

    /*
     * =====================================================
     * DETERMINE TARGET HOSPITAL
     * =====================================================
     */

    let targetHospitalId: string | undefined;

    if (user.role === "SUPER_ADMIN") {
      targetHospitalId =
        typeof hospitalId === "string"
          ? hospitalId
          : undefined;
    } else {
      targetHospitalId =
        user.hospitalId;
    }

    if (!targetHospitalId) {
      return res.status(400).json({
        success: false,
        message:
          "Hospital information is required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        targetHospitalId,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid hospital ID",
      });
    }

    /*
     * =====================================================
     * FIND DEPARTMENT
     * =====================================================
     */

    const department =
      await Department.findOne({
        _id: departmentId,
        hospitalId: targetHospitalId,
      });

    if (!department) {
      return res.status(404).json({
        success: false,
        message:
          "Department not found in the selected hospital",
      });
    }

    /*
     * =====================================================
     * UPDATE
     * =====================================================
     */

    if (
      typeof name === "string" &&
      name.trim()
    ) {
      department.name =
        name.trim();
    }

    if (
      typeof description === "string"
    ) {
      department.description =
        description.trim();
    }

    if (
      typeof isActive === "boolean"
    ) {
      department.isActive =
        isActive;
    }

    await department.save();

    return res.status(200).json({
      success: true,
      message:
        "Department updated successfully",
      data: department,
    });
  } catch (error) {
    console.error(
      "Update department error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Internal server error",
    });
  }
};
/* =========================================================
   DELETE DEPARTMENT
   DELETE /api/departments/:id

   SUPER_ADMIN:
   body:
   {
     hospitalId: "..."
   }

   NORMAL USER:
   hospitalId comes from req.user
========================================================= */

export const deleteDepartment = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const departmentId =
      typeof req.params.id === "string"
        ? req.params.id
        : undefined;

    if (!departmentId) {
      return res.status(400).json({
        success: false,
        message:
          "Department ID is required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        departmentId,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid department ID",
      });
    }

    /*
     * =====================================================
     * SUPER ADMIN
     * =====================================================
     */

    if (user.role === "SUPER_ADMIN") {
      const hospitalId =
        typeof req.body.hospitalId === "string"
          ? req.body.hospitalId
          : undefined;

      if (!hospitalId) {
        return res.status(400).json({
          success: false,
          message:
            "hospitalId is required",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          hospitalId,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid hospital ID",
        });
      }

      const department =
        await Department.findOneAndDelete({
          _id: departmentId,
          hospitalId,
        });

      if (!department) {
        return res.status(404).json({
          success: false,
          message:
            "Department not found in the selected hospital",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Department deleted successfully",
      });
    }

    /*
     * =====================================================
     * NORMAL HOSPITAL USER
     * =====================================================
     */

    if (!user.hospitalId) {
      return res.status(400).json({
        success: false,
        message:
          "Hospital is not assigned to this user",
      });
    }

    const department =
      await Department.findOneAndDelete({
        _id: departmentId,
        hospitalId:
          user.hospitalId,
      });

    if (!department) {
      return res.status(404).json({
        success: false,
        message:
          "Department not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Department deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete department error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Internal server error",
    });
  }
};