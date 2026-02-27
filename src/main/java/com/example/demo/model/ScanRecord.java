package com.example.demo.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class ScanRecord {
    @JsonProperty("itemName")
    private String itemName;
    
    @JsonProperty("category")
    private String category;
    
    @JsonProperty("timestamp")
    private String timestamp;

    // 1. MUST HAVE: Empty constructor for Jackson to read the file
    public ScanRecord() {}

    // 2. Updated Constructor to match the controller fix above
    public ScanRecord(String itemName, String category, String timestamp) {
        this.itemName = itemName;
        this.category = category;
        this.timestamp = timestamp;
    }

    // Getters (Required so Jackson can see the data)
    public String getItemName() { return itemName; }
    public String getCategory() { return category; }
    public String getTimestamp() { return timestamp; }
}