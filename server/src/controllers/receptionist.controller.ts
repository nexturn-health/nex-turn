import type { Request, Response } from "express";
import bcrypt from "bcryptjs";

import { User } from "../models/User.model";

// =====================================
// CREATE RECEPTIONIST
// POST /api/receptionists
// =====================================
export const createReceptionist = async (
  req: Request,
  res: Response
) => {
  try {
    const { name, email, password } = req.body;

    // Validate
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    // Check duplicate email
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    // Create receptionist
    const receptionist = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "RECEPTIONIST",
      hospitalId: req.user?.hospitalId,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Receptionist created successfully",
      data: {
        id: receptionist._id,
        name: receptionist.name,
        email: receptionist.email,
        role: receptionist.role,
        hospitalId: receptionist.hospitalId,
        isActive: receptionist.isActive,
      },
    });
  } catch (error) {
    console.error(
      "Create receptionist error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// =====================================
// GET RECEPTIONISTS
// GET /api/receptionists
// =====================================
export const getReceptionists = async (
  req: Request,
  res: Response
) => {
  try {
    const receptionists = await User.find({
      role: "RECEPTIONIST",
      hospitalId: req.user?.hospitalId,
    })
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: receptionists.length,
      data: receptionists,
    });
  } catch (error) {
    console.error(
      "Get receptionists error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// =====================================
// UPDATE RECEPTIONIST
// PUT /api/receptionists/:id
// =====================================
export const updateReceptionist = async (
  req: Request,
  res: Response
) => {
  try {
    const id = String(req.params.id);

    const { name, isActive } = req.body;

    const receptionist = await User.findOne({
      _id: id,
      role: "RECEPTIONIST",
      hospitalId: req.user?.hospitalId,
    });

    if (!receptionist) {
      return res.status(404).json({
        success: false,
        message: "Receptionist not found",
      });
    }

    if (name !== undefined) {
      receptionist.name = name.trim();
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "isActive must be true or false",
        });
      }

      receptionist.isActive = isActive;
    }

    await receptionist.save();

    return res.status(200).json({
      success: true,
      message: "Receptionist updated successfully",
      data: {
        id: receptionist._id,
        name: receptionist.name,
        email: receptionist.email,
        role: receptionist.role,
        hospitalId: receptionist.hospitalId,
        isActive: receptionist.isActive,
      },
    });
  } catch (error) {
    console.error(
      "Update receptionist error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};