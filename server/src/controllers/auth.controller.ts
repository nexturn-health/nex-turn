import type {
  Request,
  Response,
} from "express";

import crypto from "crypto";

import bcrypt from "bcryptjs";
import { getIO } from "../config/socket";
import { Hospital } from "../models/Hospital.model";

import {
  User,
  type UserRole,
} from "../models/User.model";
import {
    emitDoctorStatus,
} from "../config/socket";

import { generateToken } from "../utils/jwt";

import {
  sendPasswordResetEmail,
} from "../services/email.service";

// ==============================
// REGISTER HOSPITAL
// ==============================

export const registerHospital = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      hospitalName,
      name,
      email,
      password,
      phone,
      address,
    } = req.body;

    // ------------------------------
    // VALIDATION
    // ------------------------------

    if (
      !hospitalName ||
      !name ||
      !email ||
      !password ||
      !phone
    ) {
      return res.status(400).json({
        success: false,
        message:
          "All required fields must be provided",
      });
    }

    const normalizedEmail =
      email.toLowerCase().trim();

    // ------------------------------
    // CHECK USER
    // ------------------------------

    const existingUser =
      await User.findOne({
        email: normalizedEmail,
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    // ------------------------------
    // CHECK HOSPITAL
    // ------------------------------

    const existingHospital =
      await Hospital.findOne({
        email: normalizedEmail,
      });

    if (existingHospital) {
      return res.status(409).json({
        success: false,
        message:
          "Hospital email already exists",
      });
    }

    // ------------------------------
    // CREATE HOSPITAL
    // ------------------------------

    const hospital =
      await Hospital.create({
        name: hospitalName,

        email: normalizedEmail,

        phone,

        address,
      });

    // ------------------------------
    // HASH PASSWORD
    // ------------------------------

    const hashedPassword =
      await bcrypt.hash(
        password,
        10,
      );

    // ------------------------------
    // CREATE HOSPITAL ADMIN
    // ------------------------------

    const user =
      await User.create({
        name,

        email: normalizedEmail,

        password: hashedPassword,

        role: "HOSPITAL_ADMIN",

        hospitalId: hospital._id,

        isActive: true,
      });

    // ------------------------------
    // JWT
    // ------------------------------

    const token =
      generateToken(
        user._id.toString(),

        user.role,

        hospital._id.toString(),
      );

    return res.status(201).json({
      success: true,

      message:
        "Hospital registered successfully",

      data: {
        hospital: {
          id: hospital._id,

          name: hospital.name,

          email: hospital.email,

          phone: hospital.phone,

          address: hospital.address,
        },

        user: {
          id: user._id,

          name: user.name,

          email: user.email,

          role: user.role,

          hospitalId:
            user.hospitalId,
        },

        token,
      },
    });
  } catch (error) {
    console.error(
      "Register hospital error:",
      error,
    );

    return res.status(500).json({
      success: false,

      message:
        "Internal server error",
    });
  }
};

// LOGIN

export const login = async (
  req: Request,
  res: Response,
) => {
  try {

    // ------------------------------
    // GET BODY
    // ------------------------------

    const {
      email,
      password,
    } = req.body;

    // ------------------------------
    // VALIDATION
    // ------------------------------

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // ------------------------------
    // NORMALIZE EMAIL
    // ------------------------------

    const normalizedEmail =
      email.toLowerCase().trim();

    // ------------------------------
    // FIND USER
    // ------------------------------

    const user =
      await User.findOne({
        email: normalizedEmail,
      }).select("+password");

    if (!user) {

      console.log(
        "LOGIN DEBUG: USER NOT FOUND",
        normalizedEmail,
      );

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ------------------------------
    // CHECK ACTIVE
    // ------------------------------

    if (!user.isActive) {

      return res.status(403).json({
        success: false,
        message: "Your account is inactive",
      });
    }

    // ------------------------------
    // CHECK PASSWORD
    // ------------------------------

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password,
      );

    if (!passwordMatch) {

      console.log(
        "LOGIN DEBUG: INVALID PASSWORD",
        normalizedEmail,
      );

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ------------------------------
    // HOSPITAL ID
    // ------------------------------

    const hospitalId =
      user.hospitalId
        ? user.hospitalId.toString()
        : "";

    // ------------------------------
    // DOCTOR ONLINE
    // ------------------------------

    if (user.role === "DOCTOR") {

      user.isOnline = true;
      user.lastSeenAt = new Date();

      await user.save();

      console.log(
        "=================================",
      );

      console.log(
        "DOCTOR ONLINE",
      );

      console.log(
        "Doctor:",
        user.name,
      );

      console.log(
        "Doctor ID:",
        user._id.toString(),
      );

      console.log(
        "Hospital ID:",
        hospitalId,
      );

      console.log(
        "isOnline:",
        user.isOnline,
      );

      console.log(
        "lastSeenAt:",
        user.lastSeenAt,
      );

      console.log(
        "=================================",
      );

      // ------------------------------
      // SOCKET: DOCTOR ONLINE
      // ------------------------------

      if (hospitalId) {

        emitDoctorStatus({
          hospitalId,

          userId:
            user._id.toString(),

          doctorName:
            user.name,

          isOnline:
            true,

          lastSeenAt:
            user.lastSeenAt,
        });

      }
    }

    // ------------------------------
    // GENERATE JWT
    // ------------------------------

    const token =
      generateToken(
        user._id.toString(),
        user.role,
        hospitalId,
      );

    // ------------------------------
    // RESPONSE
    // ------------------------------

    return res.status(200).json({

      success: true,

      message:
        "Login successful",

      data: {

        token,

        user: {

          id:
            user._id,

          name:
            user.name,

          email:
            user.email,

          role:
            user.role,

          hospitalId:
            user.hospitalId,

          isOnline:
            user.role === "DOCTOR"
              ? true
              : user.isOnline,

          lastSeenAt:
            user.lastSeenAt,
        },
      },
    });

  } catch (error) {

    console.error(
      "Login error:",
      error,
    );

    return res.status(500).json({

      success: false,

      message:
        "Internal server error",

    });
  }
};


// ==============================
// FORGOT PASSWORD
// ==============================

export const forgotPassword = async (
  req: Request,
  res: Response,
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,

        message: "Email is required",
      });
    }

    const normalizedEmail =
      email.toLowerCase().trim();

    const user =
      await User.findOne({
        email: normalizedEmail,
      });

    /*
     * Don't reveal whether
     * account exists.
     */

    if (!user) {
      return res.status(200).json({
        success: true,

        message:
          "If an account exists with this email, password reset instructions have been sent.",
      });
    }

    const resetToken =
      crypto.randomBytes(32).toString("hex");

    const hashedResetToken =
      crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    const resetTokenExpires =
      new Date(
        Date.now() +
        15 * 60 * 1000,
      );

    user.resetPasswordToken =
      hashedResetToken;

    user.resetPasswordExpires =
      resetTokenExpires;

    await user.save();

    const clientUrl =
      process.env.CLIENT_URL ||
      "http://localhost:5173";

    const resetUrl =
      `${clientUrl}/reset-password/${resetToken}`;

    const emailSent =
      await sendPasswordResetEmail({
        email: user.email,

        name: user.name,

        resetUrl,
      });

    if (!emailSent) {
      user.resetPasswordToken =
        undefined;

      user.resetPasswordExpires =
        undefined;

      await user.save();

      return res.status(500).json({
        success: false,

        message:
          "Unable to send password reset email. Please try again later.",
      });
    }

    return res.status(200).json({
      success: true,

      message:
        "If an account exists with this email, password reset instructions have been sent.",
    });
  } catch (error) {
    console.error(
      "Forgot password error:",
      error,
    );

    return res.status(500).json({
      success: false,

      message:
        "Internal server error",
    });
  }
};

// ==============================
// RESET PASSWORD
// ==============================

export const resetPassword = async (
  req: Request,
  res: Response,
) => {
  try {
    const token =
      req.params.token;

    if (
      !token ||
      Array.isArray(token)
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Invalid reset token",
      });
    }

    const {
      password,
    } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,

        message:
          "New password is required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,

        message:
          "Password must be at least 6 characters",
      });
    }

    const hashedToken =
      crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    const user =
      await User.findOne({
        resetPasswordToken:
          hashedToken,

        resetPasswordExpires: {
          $gt: new Date(),
        },
      });

    if (!user) {
      return res.status(400).json({
        success: false,

        message:
          "Password reset token is invalid or has expired",
      });
    }

    const hashedPassword =
      await bcrypt.hash(
        password,
        10,
      );

    user.password =
      hashedPassword;

    user.resetPasswordToken =
      undefined;

    user.resetPasswordExpires =
      undefined;

    await user.save();

    return res.status(200).json({
      success: true,

      message:
        "Password reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    console.error(
      "Reset password error:",
      error,
    );

    return res.status(500).json({
      success: false,

      message:
        "Internal server error",
    });
  }
};

export const logout = async (
    req: Request,
    res: Response,
) => {

    try {

        // ========================================
        // GET USER FROM AUTH MIDDLEWARE
        // ========================================

        const userId =
            req.user?.userId;

        if (!userId) {

            return res.status(401).json({
                success: false,
                message: "User not authenticated",
            });

        }

        // ========================================
        // FIND USER
        // ========================================

        const user =
            await User.findById(userId);

        if (!user) {

            return res.status(404).json({
                success: false,
                message: "User not found",
            });

        }

        // ========================================
        // DOCTOR OFFLINE
        // ========================================

        if (user.role === "DOCTOR") {

            user.isOnline = false;
            user.lastSeenAt = new Date();

            await user.save();

            console.log(
                "DOCTOR OFFLINE:",
                user.name,
                user._id.toString(),
            );

            // ========================================
            // NOTIFY DISPLAY
            // ========================================

            if (user.hospitalId) {

                emitDoctorStatus({
                    hospitalId:
                        user.hospitalId.toString(),

                    userId:
                        user._id.toString(),

                    doctorName:
                        user.name,

                    isOnline:
                        false,

                    lastSeenAt:
                        user.lastSeenAt,
                });

            }

        }

        // ========================================
        // RESPONSE
        // ========================================

        return res.status(200).json({

            success: true,

            message:
                "Logout successful",

        });

    } catch (error) {

        console.error(
            "Logout error:",
            error,
        );

        return res.status(500).json({

            success: false,

            message:
                "Internal server error",

        });

    }

};