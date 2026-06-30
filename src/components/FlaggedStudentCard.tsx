import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { FlaggedStudent } from "@/services/api";

export function FlaggedStudentCard({ student }: { student: FlaggedStudent }) {
  const [expanded, setExpanded] = useState(false);

  const shortId = (student.student_id || "").slice(0, 8).toUpperCase();

  return (
    <div className="bg-white rounded-lg border border-amber-200 overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-3 text-left hover:bg-amber-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 text-xs font-bold">
            {shortId.slice(0, 2)}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">
              Student {shortId}
            </div>
            <div className="text-xs text-gray-500">
              {student.topic} · {student.error_category}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
            {student.wrong_count}× wrong
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="p-3 border-t border-amber-100 space-y-3">
          {student.root_cause && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Why they're stuck
              </div>
              <p className="text-sm text-gray-700">{student.root_cause}</p>
            </div>
          )}

          {student.intervention_script && (
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                💬 What to say to this student
              </div>
              <p className="text-sm text-blue-900 italic">
                "{student.intervention_script}"
              </p>
            </div>
          )}

          {student.suggested_activity && (
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">
                ✏️ 5-minute activity
              </div>
              <p className="text-sm text-green-900">
                {student.suggested_activity}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
