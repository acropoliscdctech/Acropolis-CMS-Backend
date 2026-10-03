import { Router } from "express";
import superAdminAuthRouter from "./superAdminAuth.route";
import { authenticateSuperAdmin } from "../middlewares/superAdmin.middleware";
import {
  getDashboardStats,
  getAllFaculties,
  getFacultyById,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  resetFacultyPassword,
  getAllStudents,
  getStudentById,
  createStudent,
  previewStudentImport,
  commitStudentImport,
  updateStudent,
  deleteStudent,
  advanceStudentSemesters,
  getAllDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getAllPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
  getAllSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} from "../controllers/superAdmin.controller";

const router = Router();

// Super Admin Auth routes (e.g., /api/super-admin/auth/login)
router.use("/auth", superAdminAuthRouter);

// All routes below require Super Admin authentication
router.use(authenticateSuperAdmin);

// Dashboard stats
router.get("/dashboard/stats", getDashboardStats);

// Faculty routes
router.get("/faculties", getAllFaculties);
router.get("/faculties/:id", getFacultyById);
router.post("/faculties", createFaculty);
router.put("/faculties/:id", updateFaculty);
router.post("/faculties/:id/reset-password", resetFacultyPassword);
router.delete("/faculties/:id", deleteFaculty);

// Student routes
router.get("/students", getAllStudents);
router.post("/students/advance-semesters", advanceStudentSemesters);
router.get("/students/:id", getStudentById);
router.post("/students/import/preview", previewStudentImport);
router.post("/students/import/commit", commitStudentImport);
router.post("/students", createStudent);
router.put("/students/:id", updateStudent);
router.delete("/students/:id", deleteStudent);

// Department routes
router.get("/departments", getAllDepartments);
router.post("/departments", createDepartment);
router.put("/departments/:id", updateDepartment);
router.delete("/departments/:id", deleteDepartment);

// Academic Program routes
router.get("/programs", getAllPrograms);
router.post("/programs", createProgram);
router.put("/programs/:id", updateProgram);
router.delete("/programs/:id", deleteProgram);

// Subject routes
router.get("/subjects", getAllSubjects);
router.post("/subjects", createSubject);
router.put("/subjects/:id", updateSubject);
router.delete("/subjects/:id", deleteSubject);


export default router;
