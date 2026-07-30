"use client";

import { useState } from "react";
import clsx from "clsx";
import ScheduledEmailsTable from "@/components/ScheduledEmails";
import SentEmailsTable from "@/components/SentEmails";
import ComposeModal from "@/components/ComposeModal";
import { Plus } from "lucide-react";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"scheduled" | "sent">("scheduled");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = () => setRefreshTrigger((prev) => prev + 1);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex space-x-1 sm:space-x-4">
          <button
            onClick={() => setActiveTab("scheduled")}
            className={clsx(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              activeTab === "scheduled"
                ? "bg-indigo-50 text-indigo-700"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            Scheduled Emails
          </button>
          <button
            onClick={() => setActiveTab("sent")}
            className={clsx(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              activeTab === "sent"
                ? "bg-indigo-50 text-indigo-700"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            Sent Emails
          </button>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setIsComposeOpen(true)}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Compose New Email
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === "scheduled" ? (
          <ScheduledEmailsTable refreshTrigger={refreshTrigger} />
        ) : (
          <SentEmailsTable refreshTrigger={refreshTrigger} />
        )}
      </div>

      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={() => {
          setIsComposeOpen(false);
          triggerRefresh();
        }}
      />
    </div>
  );
}
