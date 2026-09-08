"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { UserDetail } from "@/types/hr";
import { UserDetailView } from "../_components/UserDetailView";

function LoadingState() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
      <div className="h-48 animate-pulse rounded-xl bg-gray-100" />
      <div className="grid grid-cols-2 gap-6">
        <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
      </div>
    </div>
  );
}

export default function UserDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const canManageSalary = useAuthStore((s) => s.hasPermission("hr.update"));

  const { data, isLoading, error } = useQuery<{ data: UserDetail }>({
    queryKey: ["hr-user", id],
    queryFn: async () => (await api.get(`/hr/users/${id}`)).data,
  });

  if (isLoading) return <LoadingState />;
  if (error || !data) return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-500">
      <p>Failed to load user profile.</p>
      <button onClick={() => router.back()} className="mt-3 text-sm text-[#95271D] hover:underline">Go back</button>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">User Profile</h1>
      </div>

      <UserDetailView data={data.data} editable={canManageSalary} />
    </div>
  );
}
