"use client";

import { useState } from "react";
import Papa from "papaparse";
import { scheduleEmails } from "@/lib/api";
import { useSession } from "next-auth/react";
import { X, UploadCloud, Loader2 } from "lucide-react";

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ComposeModal({ isOpen, onClose, onSuccess }: ComposeModalProps) {
  const { data: session } = useSession();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [csvEmails, setCsvEmails] = useState<string[]>([]);
  const [manualEmailsInput, setManualEmailsInput] = useState("");
  const [startTime, setStartTime] = useState("");
  const [delayBetweenEmails, setDelayBetweenEmails] = useState<number>(0);
  const [maxEmailsPerHour, setMaxEmailsPerHour] = useState<number | "">("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const emails: string[] = [];
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        results.data.forEach((row: any) => {
          if (Array.isArray(row)) {
            row.forEach((cell) => {
              if (typeof cell === "string" && emailRegex.test(cell.trim())) {
                emails.push(cell.trim());
              }
            });
          }
        });

        if (emails.length > 0) {
          setCsvEmails(emails);
          setError(null);
        } else {
          setError("No valid emails found in the uploaded file.");
        }
      },
      error: () => {
        setError("Failed to parse CSV file.");
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const manualEmails = manualEmailsInput
      .split(/[\s,]+/)
      .map((e) => e.trim())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    const finalEmails = Array.from(new Set([...csvEmails, ...manualEmails]));

    if (finalEmails.length === 0) {
      setError("Please upload a CSV or enter at least one valid email.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await scheduleEmails({
        subject,
        body,
        recipientEmails: finalEmails,
        startTime: new Date(startTime).toISOString(),
        delayBetweenEmails,
        maxEmailsPerHour: maxEmailsPerHour === "" ? undefined : Number(maxEmailsPerHour),
        senderIdentity: session?.user?.email || "anonymous",
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to schedule emails");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          zIndex: 1,
        }}
      />

      {/* Modal Card */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          width: "100%",
          maxWidth: "640px",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "24px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#111827", margin: 0 }}>
            Compose Campaign
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              color: "#9ca3af",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div
            style={{
              marginBottom: "16px",
              backgroundColor: "#fef2f2",
              borderLeft: "4px solid #f87171",
              padding: "12px 16px",
              borderRadius: "4px",
            }}
          >
            <p style={{ fontSize: "14px", color: "#b91c1c", margin: 0 }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Subject */}
          <div style={{ marginBottom: "16px" }}>
            <label htmlFor="subject" style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#374151", marginBottom: "4px" }}>
              Subject
            </label>
            <input
              type="text"
              id="subject"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject..."
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                color: "#111827",
                backgroundColor: "#ffffff",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Body */}
          <div style={{ marginBottom: "16px" }}>
            <label htmlFor="body" style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#374151", marginBottom: "4px" }}>
              Body
            </label>
            <textarea
              id="body"
              required
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email content..."
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                color: "#111827",
                backgroundColor: "#ffffff",
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* CSV Upload */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#374151", marginBottom: "4px" }}>
              Recipients (CSV Upload)
            </label>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "20px",
                border: "2px dashed #d1d5db",
                borderRadius: "8px",
                cursor: "pointer",
                backgroundColor: "#f9fafb",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <UploadCloud size={32} color="#9ca3af" style={{ margin: "0 auto 8px" }} />
                <label
                  htmlFor="file-upload"
                  style={{
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#4f46e5",
                  }}
                >
                  Upload a CSV file
                  <input
                    id="file-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    style={{ display: "none" }}
                  />
                </label>
                <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>CSV up to 10MB</p>
              </div>
            </div>
            {csvEmails.length > 0 && (
              <p style={{ marginTop: "8px", fontSize: "14px", color: "#16a34a", fontWeight: 500 }}>
                ✓ {csvEmails.length} valid email(s) detected from CSV.
              </p>
            )}
          </div>

          {/* Manual Email Entry */}
          <div style={{ marginBottom: "16px" }}>
            <label htmlFor="manualEmails" style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#374151", marginBottom: "4px" }}>
              Or enter emails manually
            </label>
            <textarea
              id="manualEmails"
              rows={2}
              value={manualEmailsInput}
              onChange={(e) => setManualEmailsInput(e.target.value)}
              placeholder="test1@example.com, test2@example.com"
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                color: "#111827",
                backgroundColor: "#ffffff",
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
            <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
              Separate multiple emails with commas or spaces
            </p>
          </div>

          {/* Start Time & Delay */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label htmlFor="startTime" style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#374151", marginBottom: "4px" }}>
                Start Time
              </label>
              <input
                type="datetime-local"
                id="startTime"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  color: "#111827",
                  backgroundColor: "#ffffff",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label htmlFor="delay" style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#374151", marginBottom: "4px" }}>
                Delay Between Emails (sec)
              </label>
              <input
                type="number"
                id="delay"
                required
                min="0"
                value={delayBetweenEmails}
                onChange={(e) => setDelayBetweenEmails(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  color: "#111827",
                  backgroundColor: "#ffffff",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Max Emails Per Hour */}
          <div style={{ marginBottom: "20px" }}>
            <label htmlFor="maxEmails" style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#374151", marginBottom: "4px" }}>
              Max Emails Per Hour <span style={{ color: "#9ca3af", fontWeight: 400 }}>(Optional)</span>
            </label>
            <input
              type="number"
              id="maxEmails"
              min="1"
              value={maxEmailsPerHour}
              onChange={(e) => setMaxEmailsPerHour(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="e.g., 50"
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                color: "#111827",
                backgroundColor: "#ffffff",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              paddingTop: "16px",
              borderTop: "1px solid #e5e7eb",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#374151",
                backgroundColor: "#ffffff",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (csvEmails.length === 0 && !manualEmailsInput.trim())}
              style={{
                padding: "8px 16px",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#ffffff",
                backgroundColor: loading || (csvEmails.length === 0 && !manualEmailsInput.trim()) ? "#a5b4fc" : "#4f46e5",
                cursor: loading || (csvEmails.length === 0 && !manualEmailsInput.trim()) ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Scheduling..." : "Schedule Campaign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
