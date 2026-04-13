import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, FileText, Check, AlertCircle, Loader2 } from "lucide-react";
import { parseICS, ParsedEvent } from "@/lib/icsParser";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

const CalendarImportModal = ({ open, onClose }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedEvent[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const { createEvent } = useCalendarEvents();

  const reset = () => {
    setParsed([]);
    setFileName("");
    setStep("upload");
    setImporting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".ics")) {
      toast.error("Please select an .ics file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const events = parseICS(text);
      if (events.length === 0) {
        toast.error("No events found in the file");
        return;
      }
      setParsed(events);
      setFileName(file.name);
      setStep("preview");
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    setImporting(true);
    let success = 0;
    let failed = 0;
    for (const ev of parsed) {
      try {
        await createEvent(ev);
        success++;
      } catch {
        failed++;
      }
    }
    setImporting(false);
    toast.success(`Imported ${success} event${success !== 1 ? "s" : ""}${failed > 0 ? `, ${failed} failed` : ""}`);
    handleClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-x-0 top-0 bottom-16 bg-foreground/30 backdrop-blur-sm z-[60] flex items-end justify-center"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-full overflow-y-auto bg-card rounded-t-2xl border-t border-border p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-base font-bold text-foreground">
                {step === "upload" ? "Import Calendar" : `Preview (${parsed.length} events)`}
              </h3>
              <button onClick={handleClose} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center active:scale-95">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {step === "upload" && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Export your calendar as an .ics file from Google Calendar or Apple Calendar, then upload it here.
                </p>

                {/* How to export hints */}
                <div className="space-y-2">
                  <div className="bg-secondary/50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-foreground mb-1">📱 Apple Calendar</p>
                    <p className="text-xs text-muted-foreground">Share → Export as .ics file</p>
                  </div>
                  <div className="bg-secondary/50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-foreground mb-1">📅 Google Calendar</p>
                    <p className="text-xs text-muted-foreground">Settings → Import & Export → Export</p>
                  </div>
                </div>

                {/* Drop zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/50 transition-colors active:scale-[0.98]"
                >
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground text-center">
                    Tap to select or drag & drop<br />.ics file
                  </p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".ics"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
              </div>
            )}

            {step === "preview" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 bg-secondary/50 rounded-xl px-3 py-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-xs text-foreground truncate flex-1">{fileName}</span>
                  <button onClick={reset} className="text-xs text-primary font-medium">Change</button>
                </div>

                {/* Event list preview */}
                <div className="max-h-60 overflow-y-auto space-y-1.5">
                  {parsed.slice(0, 50).map((ev, i) => (
                    <div key={i} className="flex items-start gap-2 px-3 py-2 bg-secondary/30 rounded-lg">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${ev.priority === "high" ? "bg-destructive" : ev.priority === "medium" ? "bg-warning" : "bg-success"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground truncate">{ev.title}</p>
                        <p className="text-[10px] text-muted-foreground">{ev.event_date} · {ev.start_time}{ev.end_time ? ` – ${ev.end_time}` : ""}</p>
                      </div>
                    </div>
                  ))}
                  {parsed.length > 50 && (
                    <p className="text-xs text-muted-foreground text-center py-1">+{parsed.length - 50} more events</p>
                  )}
                </div>

                {parsed.length > 100 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-warning/10 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
                    <p className="text-xs text-warning">Large import — this may take a moment</p>
                  </div>
                )}

                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
                >
                  {importing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
                  ) : (
                    <><Check className="w-4 h-4" /> Import {parsed.length} Event{parsed.length !== 1 ? "s" : ""}</>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CalendarImportModal;
