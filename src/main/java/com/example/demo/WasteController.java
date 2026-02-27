package com.example.demo;

// --- IMPORTS (These were likely missing or wrong) ---
import com.example.demo.model.WasteItem;
import com.example.demo.model.ScanRecord;
import org.springframework.web.bind.annotation.*;
import com.fasterxml.jackson.databind.ObjectMapper; 
import com.fasterxml.jackson.core.type.TypeReference; // Fixes list reading
import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api")
public class WasteController {

    private List<ScanRecord> history = new ArrayList<>();
    // Use an absolute path or simple name. Simple name works best for local testing.
    private final String FILE_PATH = "ewaste_history.json"; 
    private final ObjectMapper mapper = new ObjectMapper();

    // 1. CONSTRUCTOR: Loads data when server starts
    public WasteController() {
        loadHistoryFromFile();
    }

    // 2. SCANNING ENDPOINT
    @GetMapping("/waste")
public WasteItem getInstruction(@RequestParam String item) {
    WasteItem response = findItem(item);
    
    if (response != null && !response.getName().equals("Unknown")) {
        // Create the timestamp string here
        String timestamp = java.time.LocalDateTime.now()
                           .format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
        
        String category = response.getIsHazardous() ? "Hazardous" : "Safe";

        // This matches the NEW ScanRecord(String, String, String) constructor
        ScanRecord record = new ScanRecord(response.getName(), category, timestamp);
        
        history.add(record);
        saveHistoryToFile();
        System.out.println("✅ SAVED: " + response.getName());
    }
    return response;
}

    // 3. HISTORY ENDPOINT
    @GetMapping("/history")
    public List<ScanRecord> getHistory() {
        // Reload from file just in case it was changed manually
        loadHistoryFromFile();
        return history;
    }

    // --- HELPER METHODS FOR FILE SAVING ---

    private void saveHistoryToFile() {
        try {
            mapper.writeValue(new File(FILE_PATH), history);
        } catch (IOException e) {
            System.out.println("❌ Error saving file: " + e.getMessage());
        }
    }

    private void loadHistoryFromFile() {
        try {
            File file = new File(FILE_PATH);
            if (file.exists()) {
                // This 'TypeReference' is the safest way to read a List from JSON
                history = mapper.readValue(file, new TypeReference<List<ScanRecord>>(){});
                System.out.println("📂 LOADED " + history.size() + " RECORDS FROM FILE.");
            } else {
                System.out.println("⚠️ No history file found. Creating a new list.");
            }
        } catch (IOException e) {
            System.out.println("⚠️ Error loading history: " + e.getMessage());
        }
    }

    // --- ITEM DATABASE ---
    private WasteItem findItem(String item) {
        // Normalize string to handle "mobile", "Mobile", "MOBILE"
        String search = item.toLowerCase();

        if (search.contains("mobile") || search.contains("phone")) {
            return new WasteItem("Mobile Phone", true, "🔥 FIRE RISK: Lithium Battery", 
                Arrays.asList("Lithium-Ion Battery", "Glass Screen", "PCB (Gold/Copper)", "Plastic Case"), 
                "1. BACKUP DATA & FACTORY RESET.\n2. DO NOT CRUSH (Fire Hazard).\n3. Take to authorized e-waste center.");
        }
        else if (search.contains("mouse")) {
            return new WasteItem("Computer Mouse", false, "⚠️ Battery Leak Risk", 
                Arrays.asList("ABS Plastic Shell", "Rubber Wheel", "Circuit Board", "Copper Wire"), 
                "1. REMOVE BATTERIES (if wireless).\n2. Cut the USB tail for copper recycling.\n3. Recycle plastic body.");
        }
        else if (search.contains("keyboard")) {
            return new WasteItem("Keyboard", false, "✅ Safe to Recycle", 
                Arrays.asList("Plastic Keycaps", "Metal Backplate", "Membrane Sheet", "USB Cable"), 
                "1. Clean crumbs.\n2. Separate plastic keys if possible.\n3. Bundle cable with rubber band.");
        }
        else {
            return new WasteItem("Unknown", false, "", Arrays.asList(), "");
        }
    }
}