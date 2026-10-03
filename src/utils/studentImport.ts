import { AcademicProgram } from "../models/academicProgram.model";
import { Department } from "../models/department.model";
import { Student } from "../models/student.model";

export interface StudentImportInput {
  rowNumber?: number;
  name?: unknown;
  enrollment?: unknown;
  section?: unknown;
  semester?: unknown;
  year?: unknown;
  program?: unknown;
  department?: unknown;
  status?: unknown;
}

const normalizeLookup = (value: unknown) =>
  String(value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase();

const cleanText = (value: unknown) =>
  String(value ?? "").trim().replace(/\s+/g, " ");

const parsePositiveInteger = (value: unknown) => {
  if (typeof value === "string" && !value.trim()) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const validateStudentImportRows = async (inputRows: StudentImportInput[]) => {
  const rows: StudentImportInput[] = inputRows.map((row) =>
    row && typeof row === "object" ? row : ({} as StudentImportInput),
  );
  if (!Array.isArray(rows) || rows.length === 0) {
    return { results: [], summary: { total: 0, valid: 0, invalid: 0 } };
  }

  const [departments, programs] = await Promise.all([
    Department.find().select("name shortName"),
    AcademicProgram.find().select("name shortName durationInYears"),
  ]);

  const departmentLookup = new Map<string, any[]>();
  departments.forEach((department: any) => {
    [department.name, department.shortName].forEach((value) => {
      const key = normalizeLookup(value);
      const matches = departmentLookup.get(key) || [];
      if (!matches.some((match) => String(match._id) === String(department._id))) {
        departmentLookup.set(key, [...matches, department]);
      }
    });
  });

  const programLookup = new Map<string, any[]>();
  programs.forEach((program: any) => {
    [program.name, program.shortName].forEach((value) => {
      const key = normalizeLookup(value);
      const matches = programLookup.get(key) || [];
      if (!matches.some((match) => String(match._id) === String(program._id))) {
        programLookup.set(key, [...matches, program]);
      }
    });
  });

  const prepared = rows.map((row, index) => {
    const rowNumber = Number.isInteger(row.rowNumber) ? row.rowNumber! : index + 2;
    const errors: string[] = [];
    const name = cleanText(row.name);
    const enrollment = cleanText(row.enrollment).toUpperCase();
    const section = cleanText(row.section);
    const semester = parsePositiveInteger(row.semester);
    const year = parsePositiveInteger(row.year);
    const departmentMatches = departmentLookup.get(normalizeLookup(row.department)) || [];
    const programMatches = programLookup.get(normalizeLookup(row.program)) || [];
    const status = cleanText(row.status).toLowerCase();

    if (!name) errors.push("Student name is required.");
    if (!enrollment) errors.push("Enrollment number is required.");
    if (!section) errors.push("Section is required.");
    if (semester === null) errors.push("Semester must be a positive whole number.");
    if (year === null) errors.push("Year must be a positive whole number.");
    if (semester !== null && year !== null) {
      const expectedYear = Math.ceil(semester / 2);
      if (year !== expectedYear) {
        errors.push(
          `Semester ${semester} belongs to Year ${expectedYear}, but this row says Year ${year}.`,
        );
      }
    }

    if (!departmentMatches.length) {
      errors.push(`Department “${cleanText(row.department) || "(blank)"}” was not found.`);
    } else if (departmentMatches.length > 1) {
      errors.push(`Department “${cleanText(row.department)}” matches more than one record.`);
    }

    if (!programMatches.length) {
      errors.push(`Program “${cleanText(row.program) || "(blank)"}” was not found.`);
    } else if (programMatches.length > 1) {
      errors.push(`Program “${cleanText(row.program)}” matches more than one record.`);
    }

    const department = departmentMatches[0];
    const program = programMatches[0];
    if (program && year !== null && year > program.durationInYears) {
      errors.push(`Year must be between 1 and ${program.durationInYears} for ${program.name}.`);
    }
    if (program && semester !== null && semester > program.durationInYears * 2) {
      errors.push(`Semester must be between 1 and ${program.durationInYears * 2} for ${program.name}.`);
    }
    if (status && status !== "active" && status !== "inactive") {
      errors.push('Status must be “active” or “inactive”.');
    }

    return {
      rowNumber,
      source: {
        name: cleanText(row.name),
        enrollment: cleanText(row.enrollment),
        section: cleanText(row.section),
        semester: row.semester ?? "",
        year: row.year ?? "",
        program: cleanText(row.program),
        department: cleanText(row.department),
        status,
      },
      errors,
      record: {
        name,
        enrollment,
        section,
        semester,
        year,
        department: department?._id,
        program: program?._id,
        status: status || "active",
      },
    };
  });

  const rowByEnrollment = new Map<string, number[]>();
  prepared.forEach(({ record, rowNumber }) => {
    if (!record.enrollment) return;
    rowByEnrollment.set(record.enrollment, [
      ...(rowByEnrollment.get(record.enrollment) || []),
      rowNumber,
    ]);
  });

  rowByEnrollment.forEach((duplicateRows, enrollment) => {
    if (duplicateRows.length < 2) return;
    prepared.forEach((result) => {
      if (result.record.enrollment === enrollment) {
        result.errors.push(`Enrollment duplicates another row in this file (rows ${duplicateRows.join(", ")}).`);
      }
    });
  });

  const enrollments = [...rowByEnrollment.keys()];
  if (enrollments.length) {
    const existingEnrollments = new Set(
      await Student.distinct("enrollment", { enrollment: { $in: enrollments } }),
    );
    prepared.forEach((result) => {
      if (existingEnrollments.has(result.record.enrollment)) {
        result.errors.push("Enrollment already exists in the student database.");
      }
    });
  }

  const results = prepared.map(({ rowNumber, source, errors, record }) => ({
    rowNumber,
    source,
    errors,
    normalized: errors.length === 0 ? record : null,
  }));

  return {
    results,
    summary: {
      total: results.length,
      valid: results.filter((result) => result.errors.length === 0).length,
      invalid: results.filter((result) => result.errors.length > 0).length,
    },
  };
};
