import type { Alumni } from "@/models";
import type { IExportService } from "../interfaces";

export class ExportService implements IExportService {
  exportCSV(leads: Alumni[]): void {
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
      this.csvEscape(l.name),
      this.csvEscape(l.designation),
      this.csvEscape(l.companyName),
      this.csvEscape(l.profileLink),
      this.csvEscape(l.location),
      this.csvEscape(l.educationInstitute),
      this.csvEscape(l.degree),
      this.csvEscape(l.educationTimeline),
      this.csvEscape(l.profilePicture),
      this.csvEscape(l.connectionDegree),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    this.downloadBlob(blob, `linkedin-alumni-${Date.now()}.csv`);
  }

  async exportExcel(leads: Alumni[]): Promise<void> {
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

  private csvEscape(str: string): string {
    if (!str) return '""';
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
