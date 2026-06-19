/**
 * Google Apps Script for IHSANPARK MASJID HISAB
 * Serves a single endpoint handling CRUD operations across 4 sheets.
 */

const SHEET_NAMES = {
  jumma: "Jumma",
  lillah: "Lillah",
  madresah: "Madrasah",
  taravih: "Taravih"
};

// Helper for CORS-compliant JSON outputs
function outputJSON(object) {
  return ContentService.createTextOutput(JSON.stringify(object))
    .setMimeType(ContentService.MimeType.JSON);
}

// GET REQUEST: Fetches all records from all 4 sheets in one payload
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const result = {
      jumma: [],
      lillah: [],
      madresah: [],
      taravih: []
    };

    // Helper to format date cells
    const formatDate = (dateVal) => {
      if (dateVal instanceof Date) {
        return Utilities.formatDate(dateVal, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
      const str = dateVal.toString().trim();
      if (str.includes("T")) return str.split("T")[0];
      return str;
    };

    // Helper to get fallback date from ID creation timestamp
    const getFallbackDateFromId = (idVal) => {
      if (idVal && idVal.indexOf("ID_") === 0) {
        var parts = idVal.split("_");
        if (parts.length >= 2) {
          var timestamp = parseInt(parts[1], 10);
          if (!isNaN(timestamp)) {
            var date = new Date(timestamp);
            return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd");
          }
        }
      }
      return "";
    };

    // Fetch Simple tabs (Jumma, Lillah, Madrasah)
    ["jumma", "lillah", "madresah"].forEach(category => {
      const sheet = ss.getSheetByName(SHEET_NAMES[category]);
      if (sheet) {
        const data = sheet.getDataRange().getValues();
        if (data.length > 0) {
          // Detect if Row 1 is a header row (contains the text "id")
          const hasHeader = data[0][0] && data[0][0].toString().trim().toLowerCase() === "id";
          const startIndex = hasHeader ? 1 : 0;
          
          for (let i = startIndex; i < data.length; i++) {
            const row = data[i];
            // Process if at least one column has data
            if (row[0] || row[1] || row[2]) {
              const idVal = row[0] ? row[0].toString().trim() : "GEN_" + (i + 1) + "_" + Math.floor(Math.random() * 1000);
              var dateStr = row[1] ? formatDate(row[1]) : "";
              if (!dateStr) {
                dateStr = getFallbackDateFromId(idVal);
              }
              result[category].push({
                id: idVal,
                entry_date: dateStr,
                amount: Number(row[2]) || 0,
                note: row[3] || ""
              });
            }
          }
        }
      }
    });

    // Fetch Taravih tab
    const taravihSheet = ss.getSheetByName(SHEET_NAMES.taravih);
    if (taravihSheet) {
      const data = taravihSheet.getDataRange().getValues();
      if (data.length > 0) {
        const hasHeader = data[0][0] && data[0][0].toString().trim().toLowerCase() === "id";
        const startIndex = hasHeader ? 1 : 0;
        
        for (let i = startIndex; i < data.length; i++) {
          const row = data[i];
          if (row[0] || row[2] || row[6]) {
            const idVal = row[0] ? row[0].toString().trim() : "GEN_T_" + (i + 1) + "_" + Math.floor(Math.random() * 1000);
            var dateStr = row[2] ? formatDate(row[2]) : "";
            if (!dateStr) {
              dateStr = getFallbackDateFromId(idVal);
            }
            result.taravih.push({
              id: idVal,
              year: Number(row[1]) || new Date().getFullYear(),
              donation_date: dateStr,
              entry_type: row[3] || "income",
              house_no: row[4] || "",
              donor_name: row[5] || "",
              amount: Number(row[6]) || 0,
              note: row[7] || ""
            });
          }
        }
      }
    }

    return outputJSON(result);
  } catch (error) {
    return outputJSON({ status: "error", message: error.toString() });
  }
}

// POST REQUEST: Handles mutations (add, edit, delete)
function doPost(e) {
  try {
    const jsonString = e.postData.contents;
    const payload = JSON.parse(jsonString);
    const action = payload.action;       // "add" | "edit" | "delete"
    const category = payload.category;   // "jumma" | "lillah" | "madresah" | "taravih"
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = SHEET_NAMES[category];
    
    if (!sheetName) {
      return outputJSON({ status: "error", message: "Invalid category: " + category });
    }
    
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      return outputJSON({ status: "error", message: "Sheet not found: " + sheetName });
    }
    
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // 1. ADD ACTION
    if (action === "add") {
      const id = "ID_" + new Date().getTime() + "_" + Math.floor(Math.random() * 1000);
      let newRow = [];
      
      if (category === "taravih") {
        const year = Number(payload.year) || new Date().getFullYear();
        const date = payload.donation_date || getTodayDateString();
        const type = payload.entry_type || "income";
        const houseNo = payload.house_no || "";
        const name = payload.donor_name || "";
        const amount = Number(payload.amount) || 0;
        const note = payload.note || "";
        
        newRow = [id, year, date, type, houseNo, name, amount, note];
      } else {
        const date = payload.entry_date || getTodayDateString();
        const amount = Number(payload.amount) || 0;
        const note = payload.note || "";
        
        newRow = [id, date, amount, note];
      }
      
      sheet.appendRow(newRow);
      return outputJSON({ status: "success", id: id });
      
    // 2. EDIT ACTION
    } else if (action === "edit") {
      const idToEdit = payload.id;
      if (!idToEdit) return outputJSON({ status: "error", message: "Missing ID for edit." });
      
      let rowIndex = -1;
      // Search from index 0 in case the sheet has no header row
      for (let i = 0; i < values.length; i++) {
        if (values[i][0].toString().trim() === idToEdit.toString().trim()) {
          rowIndex = i + 1; // 1-indexed spreadsheet row
          break;
        }
      }
      
      // Fallback for edited rows that didn't have an ID initially but got generated temporarily
      if (rowIndex === -1 && idToEdit.toString().startsWith("GEN_")) {
        const parts = idToEdit.split("_");
        const fallbackIndex = Number(parts[1]);
        if (fallbackIndex >= 1 && fallbackIndex <= values.length) {
          rowIndex = fallbackIndex;
          sheet.getRange(rowIndex, 1).setValue("ID_" + new Date().getTime() + "_" + Math.floor(Math.random() * 1000));
        }
      }
      
      if (rowIndex === -1) {
        return outputJSON({ status: "error", message: "Record with ID " + idToEdit + " not found." });
      }
      
      if (category === "taravih") {
        if (payload.year !== undefined) sheet.getRange(rowIndex, 2).setValue(Number(payload.year));
        if (payload.donation_date !== undefined) sheet.getRange(rowIndex, 3).setValue(payload.donation_date);
        if (payload.entry_type !== undefined) sheet.getRange(rowIndex, 4).setValue(payload.entry_type);
        if (payload.house_no !== undefined) sheet.getRange(rowIndex, 5).setValue(payload.house_no);
        if (payload.donor_name !== undefined) sheet.getRange(rowIndex, 6).setValue(payload.donor_name);
        if (payload.amount !== undefined) sheet.getRange(rowIndex, 7).setValue(Number(payload.amount));
        if (payload.note !== undefined) sheet.getRange(rowIndex, 8).setValue(payload.note);
      } else {
        if (payload.entry_date !== undefined) sheet.getRange(rowIndex, 2).setValue(payload.entry_date);
        if (payload.amount !== undefined) sheet.getRange(rowIndex, 3).setValue(Number(payload.amount));
        if (payload.note !== undefined) sheet.getRange(rowIndex, 4).setValue(payload.note);
      }
      
      return outputJSON({ status: "success", id: idToEdit });
      
    // 3. DELETE ACTION
    } else if (action === "delete") {
      const idToDelete = payload.id;
      if (!idToDelete) return outputJSON({ status: "error", message: "Missing ID for delete." });
      
      let rowIndex = -1;
      // Search from index 0 in case the sheet has no header row
      for (let i = 0; i < values.length; i++) {
        if (values[i][0].toString().trim() === idToDelete.toString().trim()) {
          rowIndex = i + 1;
          break;
        }
      }
      
      // Fallback delete for rows that had GEN_ temp IDs
      if (rowIndex === -1 && idToDelete.toString().startsWith("GEN_")) {
        const parts = idToDelete.split("_");
        const fallbackIndex = Number(parts[1]);
        if (fallbackIndex >= 1 && fallbackIndex <= values.length) {
          rowIndex = fallbackIndex;
        }
      }
      
      if (rowIndex === -1) {
        return outputJSON({ status: "error", message: "Record with ID " + idToDelete + " not found." });
      }
      
      sheet.deleteRow(rowIndex);
      return outputJSON({ status: "success", id: idToDelete });
      
    } else {
      return outputJSON({ status: "error", message: "Invalid action: " + action });
    }
  } catch (error) {
    return outputJSON({ status: "error", message: error.toString() });
  }
}

// Get current date as YYYY-MM-DD
function getTodayDateString() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
}
