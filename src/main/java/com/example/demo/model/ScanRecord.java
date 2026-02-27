package com.example.demo.model;

import com.fasterxml.jackson.annotation.JsonProperty;
 
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "scans") 
public class ScanRecord {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY) 
    private Long id; 

    @JsonProperty("itemName")
    private String itemName;
    
    @JsonProperty("category")
    private String category;
    
    @JsonProperty("timestamp")
    private String timestamp;

    public ScanRecord() {} // Required by MySQL

    public ScanRecord(String itemName, String category, String timestamp) {
        this.itemName = itemName;
        this.category = category;
        this.timestamp = timestamp;
    }

    public Long getId() { return id; }
    public String getItemName() { return itemName; }
    public String getCategory() { return category; }
    public String getTimestamp() { return timestamp; }
}