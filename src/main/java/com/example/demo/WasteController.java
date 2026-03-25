package com.example.demo;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.model.ScanRecord;
import com.example.demo.model.ScanRepository;
import com.example.demo.model.WasteItem;

@RestController
@RequestMapping("/api")
public class WasteController {

    @Autowired
    private ScanRepository repository; // This connects to your MySQL database

    @GetMapping("/waste")
    public WasteItem getInstruction(@RequestParam String item) {
        WasteItem response = findItem(item);
        
        if (response != null && !response.getName().equals("Unknown")) {
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
            String category = response.getIsHazardous() ? "Hazardous" : "Safe";

            ScanRecord record = new ScanRecord(response.getName(), category, timestamp);
            
            // 🔥 THIS IS THE MAGIC LINE THAT SAVES TO MYSQL 🔥
            repository.save(record); 
            System.out.println("✅ SAVED TO MYSQL: " + response.getName());
        }
        
        return response;
    }

    // This fetches the data from MySQL to show on your Eco-Impact dashboard
    @GetMapping("/history")
    public List<ScanRecord> getHistory() {
        return repository.findAll(); 
    }

    private WasteItem findItem(String item) {
        String search = item.toLowerCase();

        if (search.contains("mobile") || search.contains("phone")) {
            return new WasteItem("Mobile Phone", true, "🔥 FIRE RISK: Lithium Battery", 
                Arrays.asList("Lithium-Ion Battery", "Glass Screen", "PCB (Gold/Copper)", "Plastic Case"), 
                "1. BACKUP DATA & FACTORY RESET.\n2. DO NOT CRUSH.\n3. Take to e-waste center.");
        }
        else if (search.contains("mouse")) {
            return new WasteItem("Computer Mouse", false, "⚠️ Battery Leak Risk", 
                Arrays.asList("ABS Plastic Shell", "Rubber Wheel", "Circuit Board", "Copper Wire"), 
                "1. REMOVE BATTERIES.\n2. Cut USB tail.\n3. Recycle plastic body.");
        }
        else if (search.contains("keyboard")) {
            return new WasteItem("Keyboard", false, "✅ Safe to Recycle", 
                Arrays.asList("Plastic Keycaps", "Metal Backplate", "Membrane Sheet", "USB Cable"), 
                "1. Clean crumbs.\n2. Separate plastic keys.\n3. Bundle cable.");
        }
        // 👇 NEW: Monitor Logic
        else if (search.contains("monitor") || search.contains("screen") || search.contains("display")) {
            return new WasteItem("Monitor (LCD/LED/CRT)", true, "☣️ TOXIC: Mercury, Lead & Arsenic", 
                Arrays.asList("Hard Plastic (ABS)", "Glass / Liquid Crystals", "Mercury/LED Backlighting", "Circuit Boards (Lead Solder)"), 
                "1. DO NOT dismantle or break glass.\n2. Secure the power cable.\n3. Take directly to certified drop-off.");
        }
        // 👇 NEW: Printer Logic
        else if (search.contains("printer") || search.contains("inkjet") || search.contains("laser")) {
            return new WasteItem("Printer (Inkjet/Laser)", true, "☠️ HAZARD: Toner VOCs & Chemical Ink", 
                Arrays.asList("Outer Casing (Fire-retardant plastic)", "Steel Shafts & Copper Motors", "Circuit Boards", "Toner/Ink Cartridges"), 
                "1. Remove all ink/toner cartridges.\n2. Seal cartridges in a plastic bag.\n3. Recycle empty hardware shell.");
        }
        else {
            return new WasteItem("Unknown", false, "", Arrays.asList(), "");
        }
    }
}