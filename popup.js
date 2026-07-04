document.addEventListener("DOMContentLoaded", async () => {
  const scrapeBtn = document.getElementById("scrape-btn");
  const exportBtn = document.getElementById("export-btn");
  const clearBtn = document.getElementById("clear-btn");
  const resultsSection = document.getElementById("results-section");
  const leadsTbody = document.getElementById("leads-tbody");
  const resultsCount = document.getElementById("results-count");
  const statusBadge = document.getElementById("status-badge");
  const notLinkedin = document.getElementById("not-linkedin");
  const loading = document.getElementById("loading");
  const toast = document.getElementById("toast");

  let currentLeads = [];

  // Load saved leads from storage
  const stored = await chrome.storage.local.get("leads");
  if (stored.leads && stored.leads.length > 0) {
    currentLeads = stored.leads;
    displayLeads(currentLeads);
  }

  // Check if we're on a LinkedIn profile page
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isLinkedInProfile =
    tab && tab.url && /linkedin\.com\/in\//.test(tab.url);

  if (!isLinkedInProfile) {
    notLinkedin.classList.remove("hidden");
    scrapeBtn.disabled = true;
  }

  function showToast(msg, type = "success") {
    toast.textContent = msg;
    toast.className = `toast ${type}`;
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 2000);
  }

  // Add current profile to list
  scrapeBtn.addEventListener("click", async () => {
    scrapeBtn.disabled = true;
    loading.classList.remove("hidden");

    try {
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: "MAIN",
        func: () => {
          // Helper: try multiple selectors, return first match
          function qs(selectors) {
            for (const sel of selectors) {
              const el = document.querySelector(sel);
              if (el) {
                const text = el.textContent.trim().replace(/\s+/g, " ");
                if (text) return text;
              }
            }
            return "";
          }

          // --- Name ---
          // LinkedIn logged-in: h2 with hashed classes; public: h1
          let name = "";

          // Try h1 first (public profile, classic)
          const h1 = document.querySelector("h1");
          if (h1) {
            const h1Text = h1.textContent?.trim().replace(/\s+/g, " ") || "";
            if (h1Text && h1Text.length > 2 && h1Text.length < 60 && !h1Text.includes("notification")) {
              name = h1Text;
            }
          }

          // Try h2 (new redesign - logged-in view)
          if (!name) {
            const h2s = document.querySelectorAll("h2");
            for (const h2 of h2s) {
              const text = h2.textContent?.trim().replace(/\s+/g, " ") || "";
              if (
                text.length > 2 && text.length < 60 &&
                /^[A-Za-z\s'\-\.]+$/.test(text) &&
                text.split(/\s+/).length >= 2 &&
                !text.includes("notification") && !text.includes("About") &&
                !text.includes("Activity") && !text.includes("Experience") && !text.includes("Education")
              ) {
                name = text;
                break;
              }
            }
          }

          if (!name) return null;

          // --- Profile Link ---
          const profileLink = window.location.href.split("?")[0];

          // --- Designation + Company from Experience section ---
          let designation = "";
          let companyName = "";

          const allH2s = document.querySelectorAll('h2');
          for (const h2 of allH2s) {
            if (h2.textContent?.trim() === 'Experience') {
              let section = h2.parentElement?.parentElement;
              if (section) {
                const allDivs = section.querySelectorAll('div');
                for (const item of allDivs) {
                  const ps = item.querySelectorAll('p');
                  if (ps.length >= 2) {
                    const p1 = ps[0].textContent?.trim().replace(/\s+/g, ' ') || '';
                    const p2 = ps.length > 1 ? ps[1].textContent?.trim().replace(/\s+/g, ' ') || '' : '';
                    if (p1 && p1.length > 1 && p1.length < 100 && !p1.includes('·')) designation = p1;
                    if (p2 && p2.length > 1 && p2.length < 100) {
                      const dotMatch = p2.match(/^(.+?)\s*[\u00B7\u2022]\s*(.+)$/);
                      companyName = dotMatch ? dotMatch[1].trim() : p2;
                    }
                    if (designation || companyName) break;
                  }
                }
              }
              break;
            }
          }

          // Fallback: try headline area
          if (!designation) {
            const headline = qs([
              ".text-body-medium",
              ".pv-text-details__text-body-medium",
              "div.text-body-medium.inline",
              "[itemprop='jobTitle']",
              ".pv-top-card--list .text-body-medium",
              "main .text-body-medium",
            ]);
            if (headline) {
              const atMatch = headline.match(/^(.+?)\s+at\s+(.+)$/i);
              if (atMatch) {
                designation = atMatch[1].trim();
                if (!companyName) companyName = atMatch[2].trim();
              } else {
                const sepMatch = headline.match(/^(.+?)\s*[|·]\s*(.+)$/);
                if (sepMatch) {
                  designation = sepMatch[1].trim();
                  if (!companyName) companyName = sepMatch[2].trim();
                } else {
                  designation = headline;
                }
              }
            }
          }

          // --- Location ---
          let location = "";
          const nameEl = Array.from(document.querySelectorAll("h1, h2")).find(
            (el) => el.textContent?.trim().replace(/\s+/g, " ") === name
          );
          if (nameEl) {
            let container = nameEl.parentElement;
            for (let depth = 0; depth < 5 && container; depth++) {
              const ps = container.querySelectorAll(":scope > p");
              for (const p of ps) {
                const t = p.textContent?.trim().replace(/\s+/g, " ") || "";
                if (
                  t && t.length > 3 && t.length < 60 &&
                  (t.includes(", ") || /city|country|region|division/i.test(t)) &&
                  !t.includes("followers") && !t.includes("connections") &&
                  !/^·?\s*(1st|2nd|3rd|[4-9]th)\s*$/i.test(t)
                ) {
                  location = t;
                  break;
                }
              }
              if (location) break;
              container = container.parentElement;
            }
          }
          // Fallback
          if (!location) {
            location = qs([
              ".text-body-small.inline",
              "[itemprop='address']",
              "main .text-body-small",
            ]);
          }

          // --- Profile Picture ---
          let profilePicture = "";

          if (nameEl) {
            let cardContainer = nameEl;
            for (let d = 0; d < 6 && cardContainer; d++) {
              const imgs = cardContainer.querySelectorAll("img[src*='profile-displayphoto']");
              for (const img of imgs) {
                if (
                  img.src && !img.src.includes("emoji") &&
                  (img.naturalWidth || 0) >= 150 && (img.naturalHeight || 0) >= 150
                ) {
                  profilePicture = img.src;
                  break;
                }
              }
              if (profilePicture) break;
              cardContainer = cardContainer.parentElement;
            }
          }

          // Fallback: largest profile-displayphoto on page
          if (!profilePicture) {
            const allImgs = document.querySelectorAll("img[src*='profile-displayphoto']");
            let bestSrc = "";
            let bestArea = 0;
            for (const img of allImgs) {
              if (img.src && !img.src.includes("emoji")) {
                const area = (img.naturalWidth || 0) * (img.naturalHeight || 0);
                if (area > bestArea && area > 10000) {
                  bestArea = area;
                  bestSrc = img.src;
                }
              }
            }
            if (bestSrc) profilePicture = bestSrc;
          }

          // Upgrade image resolution
          if (profilePicture) {
            profilePicture = profilePicture
              .replace(/shrink_\d+_\d+/, "scale_400_400")
              .replace(/scale_\d+_\d+/, "scale_400_400");
          }

          // --- Education ---
          let educationInstitute = "";
          let degree = "";
          let educationTimeline = "";

          // Try to find Education section and extract from P tags
          const eduH2 = Array.from(document.querySelectorAll('h2')).find(h => h.textContent?.trim() === 'Education');
          if (eduH2) {
            let section = eduH2.parentElement?.parentElement;
            if (section) {
              const allDivs = section.querySelectorAll('div');
              for (const item of allDivs) {
                const ps = item.querySelectorAll('p');
                if (ps.length >= 2) {
                  const p1 = ps[0].textContent?.trim().replace(/\s+/g, ' ') || '';
                  const p2 = ps.length > 1 ? ps[1].textContent?.trim().replace(/\s+/g, ' ') || '' : '';
                  const p3 = ps.length >= 3 ? ps[2].textContent?.trim().replace(/\s+/g, ' ') || '' : '';
                  if (p1 && p1.length > 3 && p1.length < 120) educationInstitute = p1;
                  if (p2 && p2.length > 1 && p2.length < 100 && !p2.match(/^\d{4}/)) degree = p2;
                  if (p3 && /\d{4}/.test(p3)) educationTimeline = p3;
                  break;
                }
              }
            }
          }

          // Fallback: classic education selectors
          if (!educationInstitute) {
            const eduSelectors = [
              "#education-section .pv-entity__school",
              "[data-field='schoolName']",
              ".education-section .pv-entity__secondary-title",
              "section[id*='education'] .pv-entity__secondary-title",
              "section[id*='education'] h3",
              "section[id*='education'] .t-14",
            ];
            for (const sel of eduSelectors) {
              const el = document.querySelector(sel);
              if (el) {
                educationInstitute = el.textContent.trim().replace(/\s+/g, " ");
                if (educationInstitute) break;
              }
            }
          }

          // Fallback: scan all text for education keywords
          if (!educationInstitute) {
            const allSections = document.querySelectorAll("section li, section div.t-14");
            for (const el of allSections) {
              const text = el.textContent.trim();
              if (text.match(/university|college|institute|bachelor|master|mba|b\.tech|m\.tech|b\.sc|m\.sc/i)) {
                educationInstitute = text.replace(/\s+/g, " ").substring(0, 120);
                break;
              }
            }
          }

          // --- Connection degree ---
          let connectionDegree = "";
          const badgeEl = document.querySelector(
            ".pv-top-card--list .distance-badge .visually-hidden"
          );
          if (badgeEl) {
            connectionDegree = badgeEl.textContent.trim();
          }
          // Fallback: look for connection degree near name element
          if (!connectionDegree && nameEl) {
            let container = nameEl;
            for (let d = 0; d < 6 && container; d++) {
              const candidates = container.querySelectorAll("span, button");
              for (const cand of candidates) {
                const t = cand.textContent?.trim() || "";
                const match = t.match(/^(?:·\s*)?(1st|2nd|3rd|[4-9]th)$/i);
                if (match) {
                  connectionDegree = match[1];
                  break;
                }
              }
              if (connectionDegree) break;
              container = container.parentElement;
            }
          }

          return {
            name,
            designation,
            companyName,
            profileLink,
            location,
            educationInstitute,
            degree,
            educationTimeline,
            profilePicture,
            connectionDegree,
          };
        },
      });

      loading.classList.add("hidden");
      scrapeBtn.disabled = false;

      if (result && result[0] && result[0].result) {
        const newLead = result[0].result;

        // Check for duplicates
        const exists = currentLeads.some(
          (l) => l.profileLink === newLead.profileLink
        );
        if (!exists) {
          currentLeads.push(newLead);
          await chrome.storage.local.set({ leads: currentLeads });
          displayLeads(currentLeads);
          showToast(`${newLead.name} added!`);
        } else {
          showToast("Already in list", "warn");
        }
      } else {
        showToast("Could not read profile data", "error");
      }
    } catch (err) {
      console.error("Scrape error:", err);
      loading.classList.add("hidden");
      scrapeBtn.disabled = false;
      showToast("Error reading profile", "error");
    }
  });

  // Export CSV
  exportBtn.addEventListener("click", () => {
    if (currentLeads.length === 0) return;
    downloadCSV(currentLeads);
  });

  // Clear list
  clearBtn.addEventListener("click", async () => {
    currentLeads = [];
    await chrome.storage.local.set({ leads: [] });
    resultsSection.classList.add("hidden");
    statusBadge.classList.add("hidden");
    showToast("List cleared");
  });

  function displayLeads(leads) {
    resultsSection.classList.remove("hidden");
    resultsCount.textContent = `${leads.length} lead${leads.length !== 1 ? "s" : ""}`;
    statusBadge.textContent = `${leads.length}`;
    statusBadge.classList.remove("hidden");

    leadsTbody.innerHTML = "";
    leads.forEach((lead) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <div class="lead-name"><a href="${lead.profileLink}" target="_blank">${escapeHtml(lead.name)}</a></div>
          <div class="lead-sub">${escapeHtml(truncate(lead.designation, 35))}</div>
        </td>
        <td>${escapeHtml(truncate(lead.companyName, 20))}</td>
        <td>${escapeHtml(truncate(lead.location, 18))}</td>
      `;
      leadsTbody.appendChild(tr);
    });
  }

  function downloadCSV(leads) {
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
      csvEscape(l.educationInstitute || ""),
      csvEscape(l.degree || ""),
      csvEscape(l.educationTimeline || ""),
      csvEscape(l.profilePicture),
      csvEscape(l.connectionDegree),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    // Add BOM for Excel UTF-8 compatibility
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `linkedin-leads-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function csvEscape(str) {
    if (!str) return '""';
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function truncate(str, max) {
    if (!str) return "";
    return str.length > max ? str.substring(0, max) + "…" : str;
  }
});
