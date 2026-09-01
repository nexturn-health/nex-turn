// import type {
//     Request,
//     Response,
// } from "express";

// import crypto from "crypto";

// import mongoose from "mongoose";

// import { Patient } from "../models/Patient.model";
// import { Queue } from "../models/Queue.model";
// import { Department } from "../models/Department.model";


// // ========================================
// // NOTIFICATION STATUS
// // ========================================

// export type NotificationStatus =
//     | "SENT"
//     | "FAILED"
//     | "NOT_SENT";


// // ========================================
// // CREATE RECEPTION APPOINTMENT
// // ========================================

// export const createReceptionAppointment =
//     async (
//         req: Request,
//         res: Response,
//     ) => {

//         try {

//             // ========================================
//             // REQUEST DATA
//             // ========================================

//             const {
//                 name,
//                 phone,
//                 age,
//                 gender,
//                 address,
//                 departmentId,
//                 priority = "NORMAL",
//             } = req.body;


//             // ========================================
//             // HOSPITAL ID
//             // ========================================

//             /*
//              * IMPORTANT:
//              *
//              * Your authentication middleware should put
//              * hospitalId on req.user.
//              *
//              * Example:
//              *
//              * req.user.hospitalId
//              *
//              * Adjust this line if your auth structure
//              * is different.
//              */

//             const hospitalId =
//                 (req as any).user?.hospitalId;


//             // ========================================
//             // VALIDATE HOSPITAL
//             // ========================================

//             if (!hospitalId) {

//                 return res.status(401).json({

//                     success: false,

//                     message:
//                         "Hospital information not found",

//                 });

//             }


//             // ========================================
//             // VALIDATE NAME
//             // ========================================

//             if (
//                 typeof name !== "string" ||
//                 !name.trim()
//             ) {

//                 return res.status(400).json({

//                     success: false,

//                     message:
//                         "Patient name is required",

//                 });

//             }


//             // ========================================
//             // VALIDATE PHONE
//             // ========================================

//             if (
//                 typeof phone !== "string" ||
//                 !phone.trim()
//             ) {

//                 return res.status(400).json({

//                     success: false,

//                     message:
//                         "Patient phone number is required",

//                 });

//             }


//             // ========================================
//             // VALIDATE AGE
//             // ========================================

//             if (
//                 age === undefined ||
//                 age === null ||
//                 age === ""
//             ) {

//                 return res.status(400).json({

//                     success: false,

//                     message:
//                         "Patient age is required",

//                 });

//             }


//             const patientAge =
//                 Number(age);


//             if (
//                 Number.isNaN(patientAge) ||
//                 patientAge < 0 ||
//                 patientAge > 150
//             ) {

//                 return res.status(400).json({

//                     success: false,

//                     message:
//                         "Invalid patient age",

//                 });

//             }


//             // ========================================
//             // VALIDATE GENDER
//             // ========================================

//             if (
//                 gender !== "MALE" &&
//                 gender !== "FEMALE" &&
//                 gender !== "OTHER"
//             ) {

//                 return res.status(400).json({

//                     success: false,

//                     message:
//                         "Invalid gender",

//                 });

//             }


//             // ========================================
//             // VALIDATE DEPARTMENT
//             // ========================================

//             if (!departmentId) {

//                 return res.status(400).json({

//                     success: false,

//                     message:
//                         "Department is required",

//                 });

//             }


//             // ========================================
//             // VALIDATE PRIORITY
//             // ========================================

//             if (
//                 priority !== "NORMAL" &&
//                 priority !== "EMERGENCY"
//             ) {

//                 return res.status(400).json({

//                     success: false,

//                     message:
//                         "Invalid priority",

//                 });

//             }


//             // ========================================
//             // FIND DEPARTMENT
//             // ========================================

//             const department =
//                 await Department.findOne({

//                     _id:
//                         departmentId,

//                     hospitalId:
//                         hospitalId,

//                     isActive:
//                         true,

//                 });


//             if (!department) {

//                 return res.status(404).json({

//                     success: false,

//                     message:
//                         "Department not found",

//                 });

//             }


//             // ========================================
//             // FIND EXISTING PATIENT
//             // ========================================

//             let patient =
//                 await Patient.findOne({

//                     hospitalId:
//                         hospitalId,

//                     phone:
//                         phone.trim(),

//                 });


//             // ========================================
//             // CREATE / UPDATE PATIENT
//             // ========================================

//             if (!patient) {

//                 // ================================
//                 // GENERATE PATIENT CODE
//                 // ================================

//                 const patientCount =
//                     await Patient.countDocuments({

//                         hospitalId,

//                     });


//                 const patientCode =
//                     `P-${String(
//                         patientCount + 1,
//                     ).padStart(5, "0")}`;


//                 // ================================
//                 // CREATE
//                 // ================================

//                 patient =
//                     await Patient.create({

//                         name:
//                             name.trim(),

//                         phone:
//                             phone.trim(),

//                         age:
//                             patientAge,

//                         gender,

//                         address:
//                             typeof address === "string"
//                                 ? address.trim()
//                                 : "",

//                         hospitalId,

//                         patientCode,

//                     });

//             } else {

//                 // ================================
//                 // UPDATE EXISTING
//                 // ================================

//                 patient.name =
//                     name.trim();

//                 patient.age =
//                     patientAge;

//                 patient.gender =
//                     gender;

//                 patient.address =
//                     typeof address === "string"
//                         ? address.trim()
//                         : "";

//                 await patient.save();

//             }


//             // ========================================
//             // TODAY
//             // ========================================

//             const today =
//                 new Date()
//                     .toISOString()
//                     .split("T")[0];


//             // ========================================
//             // FIND LAST TOKEN
//             // ========================================

//             const lastQueue =
//                 await Queue.findOne({

//                     hospitalId:
//                         hospitalId,

//                     departmentId:
//                         department._id,

//                     queueDate:
//                         today,

//                 })
//                     .sort({

//                         tokenNumber:
//                             -1,

//                     })
//                     .lean();


//             // ========================================
//             // TOKEN NUMBER
//             // ========================================

//             const tokenNumber =
//                 lastQueue?.tokenNumber
//                     ? lastQueue.tokenNumber + 1
//                     : 1;


//             // ========================================
//             // TOKEN LABEL
//             // ========================================

//             const tokenLabel =
//                 `${department.tokenPrefix}-${String(
//                     tokenNumber,
//                 ).padStart(3, "0")}`;


//             // ========================================
//             // TRACKING TOKEN
//             // ========================================

//             const trackingToken =
//                 crypto
//                     .randomBytes(32)
//                     .toString("hex");


//             // ========================================
//             // TRACKING EXPIRY
//             // ========================================

//             const trackingExpiresAt =
//                 new Date(
//                     Date.now() +
//                     24 * 60 * 60 * 1000,
//                 );


//             // ========================================
//             // WAITING PATIENTS
//             // ========================================

//             const waitingCount =
//                 await Queue.countDocuments({

//                     hospitalId,

//                     departmentId:
//                         department._id,

//                     queueDate:
//                         today,

//                     status:
//                         "WAITING",

//                 });


//             // ========================================
//             // ESTIMATED WAIT
//             // ========================================

//             const estimatedWaitTime =
//                 waitingCount * 10;


//             // ========================================
//             // ESTIMATED TURN TIME
//             // ========================================

//             const estimatedTurnTime =
//                 new Date(
//                     Date.now() +
//                     estimatedWaitTime *
//                     60 *
//                     1000,
//                 );


//             // ========================================
//             // CREATE QUEUE
//             // ========================================

//             const queue =
//                 await Queue.create({

//                     hospitalId,

//                     patientId:
//                         patient._id,

//                     departmentId:
//                         department._id,

//                     tokenNumber,

//                     tokenLabel,

//                     priority,

//                     status:
//                         "WAITING",

//                     queueDate:
//                         today,

//                     estimatedWaitTime,

//                     estimatedTurnTime,

//                     trackingToken,

//                     trackingExpiresAt,

//                     trackingLinkActive:
//                         true,

//                     tokenNotificationSent:
//                         false,

//                     fifteenMinuteNotificationSent:
//                         false,

//                 });


//             // ========================================
//             // TRACKING URL
//             // ========================================

//             const frontendUrl =
//                 process.env.FRONTEND_URL ||
//                 "http://localhost:5173";


//             const trackingUrl =
//                 `${frontendUrl}/track/${trackingToken}`;


//             // ========================================
//             // NOTIFICATION STATUS
//             // ========================================

//             /*
//              * SMS / WhatsApp are not connected yet.
//              *
//              * DO NOT put these variables outside
//              * the function.
//              */

//             let smsStatus:
//                 NotificationStatus =
//                 "NOT_SENT";

//             let whatsappStatus:
//                 NotificationStatus =
//                 "NOT_SENT";


//             // ========================================
//             // SMS PLACEHOLDER
//             // ========================================

//             try {

//                 /*
//                  * Later:
//                  *
//                  * await sendQueueSMS({
//                  *     phone: patient.phone,
//                  *     patientName: patient.name,
//                  *     tokenLabel,
//                  *     departmentName: department.name,
//                  *     trackingUrl,
//                  * });
//                  *
//                  * smsStatus = "SENT";
//                  */

//             } catch (error) {

//                 console.error(
//                     "SMS ERROR:",
//                     error,
//                 );

//                 smsStatus =
//                     "FAILED";
//             }


//             // ========================================
//             // WHATSAPP PLACEHOLDER
//             // ========================================

//             try {

//                 /*
//                  * Later:
//                  *
//                  * await sendQueueWhatsApp({
//                  *     phone: patient.phone,
//                  *     patientName: patient.name,
//                  *     tokenLabel,
//                  *     trackingUrl,
//                  * });
//                  *
//                  * whatsappStatus = "SENT";
//                  */

//             } catch (error) {

//                 console.error(
//                     "WHATSAPP ERROR:",
//                     error,
//                 );

//                 whatsappStatus =
//                     "FAILED";
//             }


//             // ========================================
//             // SAVE NOTIFICATION STATUS
//             // ========================================

          

//             // ========================================
//             // RESPONSE
//             // ========================================

//             return res.status(201).json({

//                 success: true,

//                 message:
//                     "Appointment created successfully",


//                 // ====================================
//                 // PATIENT
//                 // ====================================

//                 patient: {

//                     _id:
//                         patient._id,

//                     patientCode:
//                         patient.patientCode,

//                     name:
//                         patient.name,

//                     phone:
//                         patient.phone,

//                     age:
//                         patient.age,

//                     gender:
//                         patient.gender,

//                     address:
//                         patient.address,

//                 },


//                 // ====================================
//                 // DEPARTMENT
//                 // ====================================

//                 department: {

//                     _id:
//                         department._id,

//                     name:
//                         department.name,

//                     tokenPrefix:
//                         department.tokenPrefix,

//                 },


//                 // ====================================
//                 // QUEUE
//                 // ====================================

//                 queue: {

//                     _id:
//                         queue._id,

//                     tokenNumber:
//                         queue.tokenNumber,

//                     tokenLabel:
//                         queue.tokenLabel,

//                     priority:
//                         queue.priority,

//                     status:
//                         queue.status,

//                     queueDate:
//                         queue.queueDate,

//                     estimatedWaitTime:
//                         queue.estimatedWaitTime,

//                     estimatedTurnTime:
//                         queue.estimatedTurnTime,

//                     trackingToken:
//                         queue.trackingToken,

//                     trackingExpiresAt:
//                         queue.trackingExpiresAt,

//                     trackingLinkActive:
//                         queue.trackingLinkActive,

//                     trackingUrl,

//                 },


//                 // ====================================
//                 // NOTIFICATION
//                 // ====================================

//                 notification: {

//                     sms:
//                         smsStatus,

//                     whatsapp:
//                         whatsappStatus,

//                     tokenNotificationSent:
//                         queue.tokenNotificationSent,

//                 },

//             });

//         } catch (error) {

//             console.error(
//                 "CREATE RECEPTION APPOINTMENT ERROR:",
//                 error,
//             );


//             return res.status(500).json({

//                 success: false,

//                 message:
//                     "Failed to create appointment",

//             });

//         }

//     };