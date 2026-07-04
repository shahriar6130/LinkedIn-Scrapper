import type { Alumni } from "./constants";

export function exportCSV(leads: Alumni[]) {
  const headers = [
    "Name",
    "Designation",
    "Company",
    "Profile Link",
    "Location",
    "Institute",
    "Degree",
    "Education Timeline",
    "Profile Picture",
    "Connection Degree",
  ];

  const rows = leads.map((l) => [
    csvEscape(l.name),
    csvEscape(l.designation),
    csvEscape(l.companyName),
    csvEscape(l.profileLink),
    csvEscape(l.location),
    csvEscape(l.educationInstitute),
    csvEscape(l.degree),
    csvEscape(l.educationTimeline),
    csvEscape(l.profilePicture),
    csvEscape(l.connectionDegree),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  // Add BOM for Excel UTF-8 compatibility
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `linkedin-alumni-${Date.now()}.csv`);
}

export async function exportExcel(leads: Alumni[]) {
  const XLSX = await import("xlsx");
  const data = leads.map((l) => ({
    Name: l.name,
    Designation: l.designation,
    Company: l.companyName,
    "Profile Link": l.profileLink,
    Location: l.location,
    Institute: l.educationInstitute,
    Degree: l.degree,
    "Education Timeline": l.educationTimeline,
    "Profile Picture": l.profilePicture,
    "Connection Degree": l.connectionDegree,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Alumni");
  XLSX.writeFile(wb, `linkedin-alumni-${Date.now()}.xlsx`);
}

function csvEscape(str: string): string {
  if (!str) return '""';
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function truncate(str: string, max: number): string {
  if (!str) return "";
  return str.length > max ? str.substring(0, max) + "..." : str;
}

export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
