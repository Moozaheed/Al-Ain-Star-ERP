import api from "@/lib/api";

export async function downloadFile(path: string, filename: string, mimeType = "application/octet-stream") {
  const res = await api.get(path, { responseType: "blob" });

  const url = window.URL.createObjectURL(new Blob([res.data], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
