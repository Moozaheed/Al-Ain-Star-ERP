import api from "@/lib/api";

export async function downloadCsv(path: string, params: Record<string, string | number | undefined>, filename: string) {
  const res = await api.get(path, {
    params: { ...params, format: "csv" },
    responseType: "blob",
  });

  const url = window.URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
