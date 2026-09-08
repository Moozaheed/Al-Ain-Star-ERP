"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { UserDetail } from "@/types/hr";
import { UserDetailView } from "../hr/_components/UserDetailView";

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

export default function ProfilePage() {
  const { data, isLoading, error } = useQuery<{ data: UserDetail }>({
    queryKey: ["my-profile"],
    queryFn: async () => (await api.get("/profile")).data,
  });

  if (isLoading) return <LoadingState />;
  if (error || !data) return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-500">
      <p>Failed to load your profile.</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
        <p className="mt-0.5 text-sm text-gray-500">Your account and employment information — view only</p>
      </div>

      <UserDetailView data={data.data} />
    </div>
  );
}
