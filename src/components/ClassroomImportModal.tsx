import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Course, Assignment, useClassroomData } from "@/hooks/useClassroomData";
import * as XLSX from "xlsx";

interface ClassroomImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (courses: Course[], assignments: Assignment[]) => void;
}

const DEFAULT_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--warning))",
  "hsl(var(--success))",
  "hsl(var(--destructive))",
  "hsl(220, 70%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(340, 65%, 55%)",
  "hsl(160, 55%, 45%)",
];

const ClassroomImportModal = ({ open, onClose, onImport }: ClassroomImportModalProps) => {
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setParsing(true);
    setError(null);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);

      // Try to find sheets
      const sheetNames = wb.SheetNames.map(s => s.toLowerCase());
      let rows: Record<string, string>[] = [];

      // If there's a separate "courses" and "assignments" sheet, merge them
      const coursesSheet = wb.SheetNames.find(s => s.toLowerCase().includes("course"));
      const assignmentsSheet = wb.SheetNames.find(s => s.toLowerCase().includes("assignment"));

      if (assignmentsSheet) {
        rows = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[assignmentsSheet]);
      } else {
        // Use first sheet
        rows = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[wb.SheetNames[0]]);
      }

      if (rows.length === 0) {
        setError("ไม่พบข้อมูลในไฟล์ Excel");
        setParsing(false);
        return;
      }

      // Parse courses from data
      const courseMap = new Map<string, Course>();
      let colorIdx = 0;

      // If separate courses sheet exists, read it
      if (coursesSheet) {
        const courseRows = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[coursesSheet]);
        courseRows.forEach(r => {
          const name = r.course_name || r.name || "";
          if (name && !courseMap.has(name)) {
            courseMap.set(name, {
              id: `c_${courseMap.size + 1}`,
              name,
              section: r.section || "",
              teacher: r.teacher || "",
              color: r.color || DEFAULT_COLORS[colorIdx++ % DEFAULT_COLORS.length],
            });
          }
        });
      }

      // Build assignments and extract courses from assignment rows if needed
      const assignments: Assignment[] = rows.map((r, i) => {
        const courseName = r.course_name || r.course || "";
        if (courseName && !courseMap.has(courseName)) {
          courseMap.set(courseName, {
            id: `c_${courseMap.size + 1}`,
            name: courseName,
            section: r.section || "",
            teacher: r.teacher || "",
            color: r.color || DEFAULT_COLORS[colorIdx++ % DEFAULT_COLORS.length],
          });
        }
        const course = courseMap.get(courseName);
        const status = (r.status || "upcoming").toLowerCase() as Assignment["status"];
        const validStatuses = ["upcoming", "due_soon", "overdue", "submitted"];

        return {
          id: `a_${i + 1}`,
          courseId: course?.id || `c_unknown`,
          title: r.title || `Assignment ${i + 1}`,
          dueDate: r.due_date || r.dueDate || new Date().toISOString().split("T")[0],
          dueTime: r.due_time || r.dueTime || "23:59",
          points: parseInt(r.points || "0") || 0,
          status: validStatuses.includes(status) ? status : "upcoming",
          description: r.description || "",
        } as Assignment;
      });

      const courses = Array.from(courseMap.values());
      onImport(courses, assignments);
      toast.success(`นำเข้า ${courses.length} วิชา, ${assignments.length} งานสำเร็จ`);
      onClose();
    } catch (e) {
      console.error(e);
      setError("ไม่สามารถอ่านไฟล์ Excel ได้ กรุณาตรวจสอบรูปแบบไฟล์");
    } finally {
      setParsing(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-md bg-card rounded-2xl border border-border p-5 space-y-4 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              <h3 className="font-display text-lg font-bold text-foreground">Import Classroom</h3>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center active:scale-95">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              อัปโหลดไฟล์ Excel (.xlsx) ที่มี columns ต่อไปนี้:
            </p>
            <div className="bg-secondary rounded-xl p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Columns ที่ต้องมี:</p>
              <p><span className="text-primary font-medium">course_name</span> — ชื่อวิชา</p>
              <p><span className="text-primary font-medium">title</span> — ชื่องาน</p>
              <p><span className="text-primary font-medium">due_date</span> — วันส่ง (YYYY-MM-DD)</p>
              <p className="font-medium text-foreground mt-2">Columns เพิ่มเติม (ไม่บังคับ):</p>
              <p>section, teacher, due_time, points, status, description</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={onFileChange}
            />

            <button
              onClick={() => fileRef.current?.click()}
              disabled={parsing}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {parsing ? "กำลังนำเข้า..." : "เลือกไฟล์ Excel"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ClassroomImportModal;
