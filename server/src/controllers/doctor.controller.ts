import type {
  Request,
  Response,
} from "express";

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import { User } from "../models/User.model";
import { Department } from "../models/Department.model";

/* =========================================================
   TYPES
========================================================= */

type UserRole =
  | "SUPER_ADMIN"
  | "HOSPITAL_ADMIN"
  | "DOCTOR"
  | "RECEPTIONIST";

/* =========================================================
   AUTH USER
========================================================= */

const getAuthUser = (req: Request) => {
  return req.user;
};

/* =========================================================
   OBJECT ID VALIDATION
========================================================= */

const isValidObjectId = (
  value: unknown,
): value is string => {
  return (
    typeof value === "string" &&
    mongoose.Types.ObjectId.isValid(value)
  );
};

/* =========================================================
   TO OBJECT ID
========================================================= */

const toObjectId = (
  value: string,
): mongoose.Types.ObjectId => {
  return new mongoose.Types.ObjectId(value);
};

/* =========================================================
   GET TARGET HOSPITAL
========================================================= */

const getTargetHospitalId = (
  req: Request,
  suppliedHospitalId?: unknown,
): string | null => {
  const user = getAuthUser(req);

  if (!user) {
    return null;
  }

  /* -----------------------------------------
     SUPER ADMIN
  ----------------------------------------- */

  if (user.role === "SUPER_ADMIN") {
    if (
      typeof suppliedHospitalId !==
      "string"
    ) {
      return null;
    }

    return suppliedHospitalId;
  }

  /* -----------------------------------------
     NORMAL USER
  ----------------------------------------- */

  if (!user.hospitalId) {
    return null;
  }

  return String(user.hospitalId);
};

/* =========================================================
   FORMAT DOCTOR
========================================================= */

const formatDoctor = (
  doctor: any,
) => {
  if (!doctor) {
    return null;
  }

  const hospitalId =
    doctor.hospitalId?._id ??
    doctor.hospitalId;

  const departmentId =
    doctor.departmentId?._id ??
    doctor.departmentId;

  return {
    _id: String(doctor._id),

    name: doctor.name ?? "",

    email: doctor.email ?? "",

    phone: doctor.phone ?? "",

    role: doctor.role,

    hospitalId:
      hospitalId
        ? String(hospitalId)
        : "",

    departmentId:
      departmentId
        ? String(departmentId)
        : "",

    hospital:
      doctor.hospitalId &&
        typeof doctor.hospitalId ===
        "object"
        ? {
          _id:
            doctor.hospitalId._id
              ? String(
                doctor.hospitalId
                  ._id,
              )
              : "",
          name:
            doctor.hospitalId
              .name ?? "",
        }
        : undefined,

    department:
      doctor.departmentId &&
        typeof doctor.departmentId ===
        "object"
        ? {
          _id:
            doctor.departmentId
              ._id
              ? String(
                doctor
                  .departmentId
                  ._id,
              )
              : "",
          name:
            doctor.departmentId
              .name ?? "",
          description:
            doctor.departmentId
              .description ??
            "",
        }
        : undefined,

    status:
      doctor.isActive === false
        ? "INACTIVE"
        : "ACTIVE",

    isActive:
      doctor.isActive !== false,

    createdAt:
      doctor.createdAt
        ? new Date(
          doctor.createdAt,
        ).toISOString()
        : undefined,

    updatedAt:
      doctor.updatedAt
        ? new Date(
          doctor.updatedAt,
        ).toISOString()
        : undefined,
  };
};

/* =========================================================
   CREATE DOCTOR
   POST /api/doctors
========================================================= */

export const createDoctor = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = getAuthUser(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const {
      name,
      email,
      phone,
      password,
      specialization,
      hospitalId,
      departmentId,
    } = req.body;

    /* -----------------------------------------
       NAME
    ----------------------------------------- */

    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Doctor name is required",
      });
    }

    /* -----------------------------------------
       EMAIL
    ----------------------------------------- */

    if (
      typeof email !== "string" ||
      !email.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Doctor email is required",
      });
    }

    /* -----------------------------------------
       PASSWORD
    ----------------------------------------- */

    if (
      typeof password !== "string" ||
      !password.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Doctor password is required",
      });
    }

    /* -----------------------------------------
       DEPARTMENT
    ----------------------------------------- */

    if (
      typeof departmentId !==
      "string"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Department is required",
      });
    }

    /* -----------------------------------------
       TARGET HOSPITAL
    ----------------------------------------- */

    const targetHospitalId =
      getTargetHospitalId(
        req,
        hospitalId,
      );

    if (!targetHospitalId) {
      return res.status(400).json({
        success: false,
        message:
          user.role ===
            "SUPER_ADMIN"
            ? "Hospital is required"
            : "Hospital is not assigned to this user",
      });
    }

    /* -----------------------------------------
       VALIDATE HOSPITAL
    ----------------------------------------- */

    if (
      !isValidObjectId(
        targetHospitalId,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid hospital ID",
      });
    }

    /* -----------------------------------------
       VALIDATE DEPARTMENT
    ----------------------------------------- */

    if (
      !isValidObjectId(
        departmentId,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid department ID",
      });
    }

    const hospitalObjectId =
      toObjectId(
        targetHospitalId,
      );

    const departmentObjectId =
      toObjectId(
        departmentId,
      );

    /* -----------------------------------------
       FIND DEPARTMENT
    ----------------------------------------- */

    const department =
      await Department.findOne({
        _id: departmentObjectId,
        hospitalId:
          hospitalObjectId,
        isActive: true,
      });

    if (!department) {
      return res.status(404).json({
        success: false,
        message:
          "Department not found in the selected hospital",
      });
    }

    /* -----------------------------------------
       EMAIL
    ----------------------------------------- */

    const normalizedEmail =
      email.trim().toLowerCase();

    const existingUser =
      await User.findOne({
        email: normalizedEmail,
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "Email already exists",
      });
    }

    /* -----------------------------------------
       PASSWORD HASH
    ----------------------------------------- */

    const hashedPassword =
      await bcrypt.hash(
        password.trim(),
        10,
      );

    /* -----------------------------------------
       CREATE
    ----------------------------------------- */

    const doctor =
      await User.create({
        name: name.trim(),

        email:
          normalizedEmail,

        phone:
          typeof phone ===
            "string"
            ? phone.trim()
            : "",

        password:
          hashedPassword,

        role: "DOCTOR",

        hospitalId:
          hospitalObjectId,

        departmentId:
          departmentObjectId,

        isActive: true,
      });

    /* -----------------------------------------
       POPULATE
    ----------------------------------------- */

    const populatedDoctor =
      await User.findById(
        doctor._id,
      )
        .select("-password")
        .populate(
          "departmentId",
          "name description hospitalId",
        )
        .populate(
          "hospitalId",
          "name",
        );

    return res.status(201).json({
      success: true,

      message:
        "Doctor created successfully",

      data:
        formatDoctor(
          populatedDoctor,
        ),
    });
  } catch (error) {
    console.error(
      "Create doctor error:",
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
   GET ALL DOCTORS
   GET /api/doctors
========================================================= */

export const getDoctors = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = getAuthUser(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const requestedHospitalId =
      typeof req.query.hospitalId ===
        "string"
        ? req.query.hospitalId
        : undefined;

    const query: Record<
      string,
      unknown
    > = {
      role: "DOCTOR",
    };

    /* -----------------------------------------
       SUPER ADMIN
    ----------------------------------------- */

    if (
      user.role ===
      "SUPER_ADMIN"
    ) {
      if (
        requestedHospitalId
      ) {
        if (
          !isValidObjectId(
            requestedHospitalId,
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid hospital ID",
          });
        }

        query.hospitalId =
          toObjectId(
            requestedHospitalId,
          );
      }
    }

    /* -----------------------------------------
       HOSPITAL USER
    ----------------------------------------- */

    else {
      if (!user.hospitalId) {
        return res.status(400).json({
          success: false,
          message:
            "Hospital is not assigned to this user",
        });
      }

      query.hospitalId =
        user.hospitalId;
    }

    /* -----------------------------------------
       FETCH
    ----------------------------------------- */

    const doctors =
      await User.find(query)
        .select("-password")
        .populate(
          "departmentId",
          "name description hospitalId",
        )
        .populate(
          "hospitalId",
          "name",
        )
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,

      count:
        doctors.length,

      data:
        doctors.map(
          formatDoctor,
        ),
    });
  } catch (error) {
    console.error(
      "Get doctors error:",
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
   GET SINGLE DOCTOR
   GET /api/doctors/:id
========================================================= */

export const getDoctorById =
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      const user =
        getAuthUser(req);

      if (!user) {
        return res.status(401).json({
          success: false,
          message:
            "Unauthorized",
        });
      }

      const id =
        String(
          req.params.id,
        );

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid doctor ID",
        });
      }

      const query: Record<
        string,
        unknown
      > = {
        _id: toObjectId(id),
        role: "DOCTOR",
      };

      if (
        user.role !==
        "SUPER_ADMIN"
      ) {
        if (
          !user.hospitalId
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Hospital is not assigned to this user",
          });
        }

        query.hospitalId =
          user.hospitalId;
      }

      const doctor =
        await User.findOne(
          query,
        )
          .select("-password")
          .populate(
            "departmentId",
            "name description hospitalId",
          )
          .populate(
            "hospitalId",
            "name",
          );

      if (!doctor) {
        return res.status(404).json({
          success: false,
          message:
            "Doctor not found",
        });
      }

      return res.status(200).json({
        success: true,
        data:
          formatDoctor(
            doctor,
          ),
      });
    } catch (error) {
      console.error(
        "Get doctor error:",
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
   UPDATE DOCTOR
   PUT /api/doctors/:id
========================================================= */

export const updateDoctor =
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      const user =
        getAuthUser(req);

      if (!user) {
        return res.status(401).json({
          success: false,
          message:
            "Unauthorized",
        });
      }

      const id =
        String(
          req.params.id,
        );

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid doctor ID",
        });
      }

      const {
        name,
        email,
        phone,
        hospitalId,
        departmentId,
        isActive,
      } = req.body;

      /* -----------------------------------------
         FIND DOCTOR
      ----------------------------------------- */

      const doctorQuery: Record<
        string,
        unknown
      > = {
        _id: toObjectId(id),
        role: "DOCTOR",
      };

      if (
        user.role !==
        "SUPER_ADMIN"
      ) {
        if (
          !user.hospitalId
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Hospital is not assigned to this user",
          });
        }

        doctorQuery.hospitalId =
          user.hospitalId;
      }

      const doctor =
        await User.findOne(
          doctorQuery,
        );

      if (!doctor) {
        return res.status(404).json({
          success: false,
          message:
            "Doctor not found",
        });
      }

      /* -----------------------------------------
         TARGET HOSPITAL
      ----------------------------------------- */

      let targetHospitalId =
        doctor.hospitalId
          ? String(
            doctor.hospitalId,
          )
          : "";

      if (
        user.role ===
        "SUPER_ADMIN" &&
        hospitalId !==
        undefined
      ) {
        if (
          typeof hospitalId !==
          "string"
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid hospital ID",
          });
        }

        targetHospitalId =
          hospitalId;
      }

      if (
        !isValidObjectId(
          targetHospitalId,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid hospital ID",
        });
      }

      const targetHospitalObjectId =
        toObjectId(
          targetHospitalId,
        );

      /* -----------------------------------------
         NAME
      ----------------------------------------- */

      if (
        name !== undefined
      ) {
        if (
          typeof name !==
          "string" ||
          !name.trim()
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Doctor name cannot be empty",
          });
        }

        doctor.name =
          name.trim();
      }

      /* -----------------------------------------
         EMAIL
      ----------------------------------------- */

      if (
        email !== undefined
      ) {
        if (
          typeof email !==
          "string" ||
          !email.trim()
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Doctor email cannot be empty",
          });
        }

        const normalizedEmail =
          email
            .trim()
            .toLowerCase();

        const existingUser =
          await User.findOne({
            email:
              normalizedEmail,
            _id: {
              $ne: doctor._id,
            },
          });

        if (existingUser) {
          return res.status(409).json({
            success: false,
            message:
              "Email already exists",
          });
        }

        doctor.email =
          normalizedEmail;
      }

      /* -----------------------------------------
         PHONE
      ----------------------------------------- */

      if (
        phone !== undefined
      ) {
        doctor.phone =
          typeof phone ===
            "string"
            ? phone.trim()
            : "";
      }

      /* -----------------------------------------
         HOSPITAL
      ----------------------------------------- */

      if (
        user.role ===
        "SUPER_ADMIN" &&
        hospitalId !==
        undefined
      ) {
        doctor.hospitalId =
          targetHospitalObjectId;
      }

      /* -----------------------------------------
         DEPARTMENT
      ----------------------------------------- */

      if (
        departmentId !==
        undefined
      ) {
        if (
          typeof departmentId !==
          "string"
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid department ID",
          });
        }

        if (
          !isValidObjectId(
            departmentId,
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid department ID",
          });
        }

        const department =
          await Department.findOne({
            _id:
              toObjectId(
                departmentId,
              ),
            hospitalId:
              targetHospitalObjectId,
            isActive: true,
          });

        if (!department) {
          return res.status(404).json({
            success: false,
            message:
              "Department not found in the selected hospital",
          });
        }

        doctor.departmentId =
          toObjectId(
            departmentId,
          );
      }

      /* -----------------------------------------
         ACTIVE STATUS
      ----------------------------------------- */

      if (
        isActive !==
        undefined
      ) {
        if (
          typeof isActive !==
          "boolean"
        ) {
          return res.status(400).json({
            success: false,
            message:
              "isActive must be true or false",
          });
        }

        doctor.isActive =
          isActive;
      }

      await doctor.save();

      const updatedDoctor =
        await User.findById(
          doctor._id,
        )
          .select("-password")
          .populate(
            "departmentId",
            "name description hospitalId",
          )
          .populate(
            "hospitalId",
            "name",
          );

      return res.status(200).json({
        success: true,

        message:
          "Doctor updated successfully",

        data:
          formatDoctor(
            updatedDoctor,
          ),
      });
    } catch (error) {
      console.error(
        "Update doctor error:",
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
   UPDATE DOCTOR STATUS
   PATCH /api/doctors/:id/status
========================================================= */

export const updateDoctorStatus =
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      const user =
        getAuthUser(req);

      if (!user) {
        return res.status(401).json({
          success: false,
          message:
            "Unauthorized",
        });
      }

      const id =
        String(
          req.params.id,
        );

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid doctor ID",
        });
      }

      const {
        status,
        isActive,
      } = req.body;

      let activeValue:
        | boolean
        | undefined;

      if (
        typeof isActive ===
        "boolean"
      ) {
        activeValue =
          isActive;
      } else if (
        status === "ACTIVE"
      ) {
        activeValue = true;
      } else if (
        status === "INACTIVE"
      ) {
        activeValue = false;
      }

      if (
        activeValue ===
        undefined
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Valid status is required",
        });
      }

      const query: Record<
        string,
        unknown
      > = {
        _id: toObjectId(id),
        role: "DOCTOR",
      };

      if (
        user.role !==
        "SUPER_ADMIN"
      ) {
        if (
          !user.hospitalId
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Hospital is not assigned to this user",
          });
        }

        query.hospitalId =
          user.hospitalId;
      }

      const doctor =
        await User.findOneAndUpdate(
          query,
          {
            $set: {
              isActive:
                activeValue,
            },
          },
          {
            new: true,
          },
        )
          .select("-password")
          .populate(
            "departmentId",
            "name description hospitalId",
          )
          .populate(
            "hospitalId",
            "name",
          );

      if (!doctor) {
        return res.status(404).json({
          success: false,
          message:
            "Doctor not found",
        });
      }

      return res.status(200).json({
        success: true,

        message:
          "Doctor status updated successfully",

        data:
          formatDoctor(
            doctor,
          ),
      });
    } catch (error) {
      console.error(
        "Update doctor status error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Internal server error",
      });
    }
  };

export const deleteDoctor = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = getAuthUser(req);

    /* -----------------------------------------
       AUTH
    ----------------------------------------- */

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    /* -----------------------------------------
       DOCTOR ID
    ----------------------------------------- */

    const id = String(
      req.params.id,
    );

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid doctor ID",
      });
    }

    /* -----------------------------------------
       BUILD QUERY
    ----------------------------------------- */

    const query: Record<
      string,
      unknown
    > = {
      _id: id,
      role: "DOCTOR",
    };

    /* -----------------------------------------
       HOSPITAL SECURITY
    ----------------------------------------- */

    if (
      user.role !==
      "SUPER_ADMIN"
    ) {
      if (!user.hospitalId) {
        return res.status(400).json({
          success: false,
          message:
            "Hospital is not assigned to this user",
        });
      }

      if (
        !isValidObjectId(
          user.hospitalId,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid hospital ID",
        });
      }

      query.hospitalId =
        user.hospitalId;
    }

    /* -----------------------------------------
       FIND DOCTOR
    ----------------------------------------- */

    const doctor =
      await User.findOne(
        query,
      );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message:
          "Doctor not found",
      });
    }

    /* -----------------------------------------
       DELETE
    ----------------------------------------- */

    await User.deleteOne({
      _id: doctor._id,
    });

    return res.status(200).json({
      success: true,
      message:
        "Doctor deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete doctor error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Internal server error",
    });
  }
};