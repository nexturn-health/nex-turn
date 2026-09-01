import type {
  Request,
  Response,
} from "express";

import mongoose from "mongoose";

import { Hospital } from "../models/Hospital.model";
import { User } from "../models/User.model";
import { Patient } from "../models/Patient.model";
import { Department } from "../models/Department.model";
import { Queue } from "../models/Queue.model";

/* =========================================================
   HELPERS
========================================================= */

const getHospitalId = (
  req: Request,
): string => {
  return String(
    req.params.hospitalId,
  );
};

const getTodayQueueDate = (): string => {
  return new Date()
    .toISOString()
    .split("T")[0];
};

const isValidObjectId = (
  id: string,
): boolean => {
  return mongoose.Types.ObjectId.isValid(
    id,
  );
};

/* =========================================================
   FORMAT HOSPITAL
========================================================= */

const formatHospital = (
  hospital: any,
) => {
  if (!hospital) {
    return hospital;
  }

  const address =
    hospital.address || {};

  return {
    ...hospital,

    address:
      address.addressLine || "",

    city:
      address.city || "",

    state:
      address.state || "",

    country:
      address.country || "India",

    pincode:
      address.pincode || "",
  };
};

/* =========================================================
   BUILD ADDRESS
========================================================= */

const buildAddress = (
  body: any,
) => {
  return {
    addressLine:
      typeof body.address ===
      "string"
        ? body.address.trim()
        : body.address?.addressLine ||
          "",

    city:
      typeof body.city ===
      "string"
        ? body.city.trim()
        : body.address?.city ||
          "",

    state:
      typeof body.state ===
      "string"
        ? body.state.trim()
        : body.address?.state ||
          "",

    country:
      typeof body.country ===
      "string"
        ? body.country.trim()
        : body.address?.country ||
          "India",

    pincode:
      typeof body.pincode ===
      "string"
        ? body.pincode.trim()
        : body.address?.pincode ||
          "",
  };
};

/* =========================================================
   GET HOSPITAL STATS
========================================================= */

const getHospitalStats =
  async (
    hospitalId: string,
  ) => {
    const today =
      getTodayQueueDate();

    const [
      doctors,
      receptionists,
      patients,
      departments,
      todayTokens,
    ] = await Promise.all([
      User.countDocuments({
        hospitalId,
        role: "DOCTOR",
      }),

      User.countDocuments({
        hospitalId,
        role: "RECEPTIONIST",
      }),

      Patient.countDocuments({
        hospitalId,
      }),

      Department.countDocuments({
        hospitalId,
      }),

      Queue.countDocuments({
        hospitalId,
        queueDate: today,
      }),
    ]);

    return {
      doctors,
      receptionists,
      patients,
      departments,
      todayTokens,
    };
  };

/* =========================================================
   GET ALL HOSPITALS
   GET /api/hospitals
========================================================= */

export const getHospitals =
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      const hospitals =
        await Hospital.find()
          .sort({
            createdAt: -1,
          })
          .lean();

      if (
        hospitals.length === 0
      ) {
        return res.status(200).json({
          success: true,
          data: [],
        });
      }

      const hospitalIds =
        hospitals.map(
          (hospital) =>
            hospital._id,
        );

      /* -----------------------------------------------
         DOCTORS
      ----------------------------------------------- */

      const doctorCounts =
        await User.aggregate([
          {
            $match: {
              hospitalId: {
                $in: hospitalIds,
              },
              role: "DOCTOR",
            },
          },

          {
            $group: {
              _id: "$hospitalId",

              count: {
                $sum: 1,
              },
            },
          },
        ]);

      /* -----------------------------------------------
         RECEPTIONISTS
      ----------------------------------------------- */

      const receptionistCounts =
        await User.aggregate([
          {
            $match: {
              hospitalId: {
                $in: hospitalIds,
              },
              role: "RECEPTIONIST",
            },
          },

          {
            $group: {
              _id: "$hospitalId",

              count: {
                $sum: 1,
              },
            },
          },
        ]);

      /* -----------------------------------------------
         PATIENTS
      ----------------------------------------------- */

      const patientCounts =
        await Patient.aggregate([
          {
            $match: {
              hospitalId: {
                $in: hospitalIds,
              },
            },
          },

          {
            $group: {
              _id: "$hospitalId",

              count: {
                $sum: 1,
              },
            },
          },
        ]);

      /* -----------------------------------------------
         DEPARTMENTS
      ----------------------------------------------- */

      const departmentCounts =
        await Department.aggregate([
          {
            $match: {
              hospitalId: {
                $in: hospitalIds,
              },
            },
          },

          {
            $group: {
              _id: "$hospitalId",

              count: {
                $sum: 1,
              },
            },
          },
        ]);

      /* -----------------------------------------------
         TODAY TOKENS
      ----------------------------------------------- */

      const today =
        getTodayQueueDate();

      const tokenCounts =
        await Queue.aggregate([
          {
            $match: {
              hospitalId: {
                $in: hospitalIds,
              },

              queueDate: today,
            },
          },

          {
            $group: {
              _id: "$hospitalId",

              count: {
                $sum: 1,
              },
            },
          },
        ]);

      /* -----------------------------------------------
         COUNT HELPER
      ----------------------------------------------- */

      const getCount = (
        collection: Array<{
          _id: any;
          count: number;
        }>,
        hospitalId: any,
      ): number => {
        const item =
          collection.find(
            (entry) =>
              String(
                entry._id,
              ) ===
              String(hospitalId),
          );

        return item?.count ?? 0;
      };

      /* -----------------------------------------------
         FINAL RESULT
      ----------------------------------------------- */

      const result =
        hospitals.map(
          (hospital) => {
            const stats = {
              doctors:
                getCount(
                  doctorCounts,
                  hospital._id,
                ),

              receptionists:
                getCount(
                  receptionistCounts,
                  hospital._id,
                ),

              patients:
                getCount(
                  patientCounts,
                  hospital._id,
                ),

              departments:
                getCount(
                  departmentCounts,
                  hospital._id,
                ),

              todayTokens:
                getCount(
                  tokenCounts,
                  hospital._id,
                ),
            };

            return {
              ...formatHospital(
                hospital,
              ),

              stats,

              totalDoctors:
                stats.doctors,

              totalReceptionists:
                stats.receptionists,

              totalPatients:
                stats.patients,

              totalDepartments:
                stats.departments,

              todayTokens:
                stats.todayTokens,
            };
          },
        );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error(
        "GET HOSPITALS ERROR:",
        error,
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to fetch hospitals",
      });
    }
  };

/* =========================================================
   GET SINGLE HOSPITAL
   GET /api/hospitals/:hospitalId
========================================================= */

export const getHospital =
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      const hospitalId =
        getHospitalId(req);

      if (
        !isValidObjectId(
          hospitalId,
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid hospital ID",
        });
      }

      const hospital =
        await Hospital.findById(
          hospitalId,
        ).lean();

      if (!hospital) {
        return res.status(404).json({
          success: false,

          message:
            "Hospital not found",
        });
      }

      const stats =
        await getHospitalStats(
          hospitalId,
        );

      return res.status(200).json({
        success: true,

        data: {
          ...formatHospital(
            hospital,
          ),

          stats,

          totalDoctors:
            stats.doctors,

          totalReceptionists:
            stats.receptionists,

          totalPatients:
            stats.patients,

          totalDepartments:
            stats.departments,

          todayTokens:
            stats.todayTokens,
        },
      });
    } catch (error) {
      console.error(
        "GET HOSPITAL ERROR:",
        error,
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to fetch hospital",
      });
    }
  };

/* =========================================================
   CREATE HOSPITAL
   POST /api/hospitals
========================================================= */

export const createHospital =
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      const {
        name,
        email,
        phone,
        address,
        city,
        state,
        country,
        pincode,
        registrationNumber,
      } = req.body;

      /* -----------------------------------------------
         VALIDATION
      ----------------------------------------------- */

      if (
        typeof name !==
          "string" ||
        !name.trim()
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Hospital name is required",
        });
      }

      /* -----------------------------------------------
         NORMALIZE EMAIL
      ----------------------------------------------- */

      const normalizedEmail =
        typeof email ===
          "string" &&
        email.trim()
          ? email
              .trim()
              .toLowerCase()
          : undefined;

      /* -----------------------------------------------
         NORMALIZE REGISTRATION
      ----------------------------------------------- */

      const normalizedRegistration =
        typeof registrationNumber ===
          "string" &&
        registrationNumber.trim()
          ? registrationNumber
              .trim()
              .toUpperCase()
          : undefined;

      /* -----------------------------------------------
         DUPLICATE EMAIL
      ----------------------------------------------- */

      if (normalizedEmail) {
        const existing =
          await Hospital.findOne({
            email:
              normalizedEmail,
          });

        if (existing) {
          return res.status(409).json({
            success: false,

            message:
              "Hospital with this email already exists",
          });
        }
      }

      /* -----------------------------------------------
         DUPLICATE REGISTRATION
      ----------------------------------------------- */

      if (
        normalizedRegistration
      ) {
        const existing =
          await Hospital.findOne({
            registrationNumber:
              normalizedRegistration,
          });

        if (existing) {
          return res.status(409).json({
            success: false,

            message:
              "Hospital with this registration number already exists",
          });
        }
      }

      /* -----------------------------------------------
         CREATE ADDRESS
      ----------------------------------------------- */

      const hospitalAddress =
        buildAddress({
          address,
          city,
          state,
          country,
          pincode,
        });

      /* -----------------------------------------------
         CREATE HOSPITAL
      ----------------------------------------------- */

      const hospital =
        await Hospital.create({
          name: name.trim(),

          email:
            normalizedEmail,

          phone:
            typeof phone ===
            "string"
              ? phone.trim()
              : undefined,

          address:
            hospitalAddress,

          registrationNumber:
            normalizedRegistration,

          isActive: true,
        });

      return res.status(201).json({
        success: true,

        message:
          "Hospital created successfully",

        data: formatHospital(
          hospital.toObject(),
        ),
      });
    } catch (error: any) {
      console.error(
        "CREATE HOSPITAL ERROR:",
        error,
      );

      if (
        error?.code === 11000
      ) {
        return res.status(409).json({
          success: false,

          message:
            "Hospital with these details already exists",
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Unable to create hospital",
      });
    }
  };

/* =========================================================
   UPDATE HOSPITAL
   PUT /api/hospitals/:hospitalId
========================================================= */

export const updateHospital =
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      const hospitalId =
        getHospitalId(req);

      if (
        !isValidObjectId(
          hospitalId,
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid hospital ID",
        });
      }

      const hospital =
        await Hospital.findById(
          hospitalId,
        );

      if (!hospital) {
        return res.status(404).json({
          success: false,

          message:
            "Hospital not found",
        });
      }

      const {
        name,
        email,
        phone,
        address,
        city,
        state,
        country,
        pincode,
        registrationNumber,
      } = req.body;

      /* -----------------------------------------------
         NAME
      ----------------------------------------------- */

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
              "Hospital name cannot be empty",
          });
        }

        hospital.name =
          name.trim();
      }

      /* -----------------------------------------------
         EMAIL
      ----------------------------------------------- */

      if (
        email !== undefined
      ) {
        const normalizedEmail =
          typeof email ===
            "string" &&
          email.trim()
            ? email
                .trim()
                .toLowerCase()
            : undefined;

        if (normalizedEmail) {
          const duplicate =
            await Hospital.findOne({
              email:
                normalizedEmail,

              _id: {
                $ne: hospitalId,
              },
            });

          if (duplicate) {
            return res.status(409).json({
              success: false,

              message:
                "Another hospital already uses this email",
            });
          }
        }

        hospital.email =
          normalizedEmail;
      }

      /* -----------------------------------------------
         PHONE
      ----------------------------------------------- */

      if (
        phone !== undefined
      ) {
        hospital.phone =
          typeof phone ===
          "string"
            ? phone.trim()
            : undefined;
      }

      /* -----------------------------------------------
         REGISTRATION NUMBER
      ----------------------------------------------- */

      if (
        registrationNumber !==
        undefined
      ) {
        const normalizedRegistration =
          typeof registrationNumber ===
            "string" &&
          registrationNumber.trim()
            ? registrationNumber
                .trim()
                .toUpperCase()
            : undefined;

        if (
          normalizedRegistration
        ) {
          const duplicate =
            await Hospital.findOne({
              registrationNumber:
                normalizedRegistration,

              _id: {
                $ne: hospitalId,
              },
            });

          if (duplicate) {
            return res.status(409).json({
              success: false,

              message:
                "Another hospital already uses this registration number",
            });
          }
        }

        hospital.registrationNumber =
          normalizedRegistration;
      }

      /* -----------------------------------------------
         ADDRESS
      ----------------------------------------------- */

      const addressProvided =
        address !== undefined ||
        city !== undefined ||
        state !== undefined ||
        country !== undefined ||
        pincode !== undefined;

      if (addressProvided) {
        const currentAddress =
          hospital.address || {};

        hospital.address = {
          addressLine:
            typeof address ===
            "string"
              ? address.trim()
              : currentAddress.addressLine ||
                "",

          city:
            typeof city ===
            "string"
              ? city.trim()
              : currentAddress.city ||
                "",

          state:
            typeof state ===
            "string"
              ? state.trim()
              : currentAddress.state ||
                "",

          country:
            typeof country ===
            "string"
              ? country.trim()
              : currentAddress.country ||
                "India",

          pincode:
            typeof pincode ===
            "string"
              ? pincode.trim()
              : currentAddress.pincode ||
                "",
        };
      }

      /* -----------------------------------------------
         SAVE
      ----------------------------------------------- */

      const updatedHospital =
        await hospital.save();

      return res.status(200).json({
        success: true,

        message:
          "Hospital updated successfully",

        data: formatHospital(
          updatedHospital.toObject(),
        ),
      });
    } catch (error: any) {
      console.error(
        "UPDATE HOSPITAL ERROR:",
        error,
      );

      if (
        error?.code === 11000
      ) {
        return res.status(409).json({
          success: false,

          message:
            "Hospital with these details already exists",
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Unable to update hospital",
      });
    }
  };

/* =========================================================
   ACTIVATE / DEACTIVATE
   PATCH /api/hospitals/:hospitalId/status
========================================================= */

export const updateHospitalStatus =
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      const hospitalId =
        getHospitalId(req);

      const {
        isActive,
      } = req.body;

      if (
        !isValidObjectId(
          hospitalId,
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid hospital ID",
        });
      }

      if (
        typeof isActive !==
        "boolean"
      ) {
        return res.status(400).json({
          success: false,

          message:
            "isActive must be boolean",
        });
      }

      const hospital =
        await Hospital.findByIdAndUpdate(
          hospitalId,
          {
            $set: {
              isActive,
            },
          },
          {
            new: true,
            runValidators: true,
          },
        ).lean();

      if (!hospital) {
        return res.status(404).json({
          success: false,

          message:
            "Hospital not found",
        });
      }

      return res.status(200).json({
        success: true,

        message: isActive
          ? "Hospital activated successfully"
          : "Hospital deactivated successfully",

        data: formatHospital(
          hospital,
        ),
      });
    } catch (error) {
      console.error(
        "UPDATE HOSPITAL STATUS ERROR:",
        error,
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to update hospital status",
      });
    }
  };

/* =========================================================
   HOSPITAL DASHBOARD
   GET /api/hospitals/:hospitalId/dashboard
========================================================= */

export const getHospitalDashboard =
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      const hospitalId =
        getHospitalId(req);

      if (
        !isValidObjectId(
          hospitalId,
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid hospital ID",
        });
      }

      const hospital =
        await Hospital.findById(
          hospitalId,
        ).lean();

      if (!hospital) {
        return res.status(404).json({
          success: false,

          message:
            "Hospital not found",
        });
      }

      const today =
        getTodayQueueDate();

      const [
        doctors,
        receptionists,
        patients,
        departments,
        todayTokens,
        waiting,
        called,
        serving,
        completed,
        skipped,
      ] = await Promise.all([
        User.countDocuments({
          hospitalId,
          role: "DOCTOR",
        }),

        User.countDocuments({
          hospitalId,
          role: "RECEPTIONIST",
        }),

        Patient.countDocuments({
          hospitalId,
        }),

        Department.countDocuments({
          hospitalId,
        }),

        Queue.countDocuments({
          hospitalId,
          queueDate: today,
        }),

        Queue.countDocuments({
          hospitalId,
          queueDate: today,
          status: "WAITING",
        }),

        Queue.countDocuments({
          hospitalId,
          queueDate: today,
          status: "CALLED",
        }),

        Queue.countDocuments({
          hospitalId,
          queueDate: today,
          status: "SERVING",
        }),

        Queue.countDocuments({
          hospitalId,
          queueDate: today,
          status: "COMPLETED",
        }),

        Queue.countDocuments({
          hospitalId,
          queueDate: today,
          status: "SKIPPED",
        }),
      ]);

      return res.status(200).json({
        success: true,

        data: {
          hospital:
            formatHospital(
              hospital,
            ),

          doctors,

          receptionists,

          patients,

          departments,

          todayTokens,

          queue: {
            waiting,
            called,
            serving,
            completed,
            skipped,
          },
        },
      });
    } catch (error) {
      console.error(
        "HOSPITAL DASHBOARD ERROR:",
        error,
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to load hospital dashboard",
      });
    }
  };