package com.example.demo.model;

import java.util.List;

public class WasteItem {
    
    private String name;
    private boolean isHazardous;
    private String dangerDetails;    // New: Specific danger info (e.g., "Toxic Fumes")
    private List<String> components; // New: List of parts (e.g., "Glass", "Gold")
    private String recyclingSteps;   // New: Step-by-step guide

    public WasteItem(String name, boolean isHazardous, String dangerDetails, List<String> components, String recyclingSteps) {
        this.name = name;
        this.isHazardous = isHazardous;
        this.dangerDetails = dangerDetails;
        this.components = components;
        this.recyclingSteps = recyclingSteps;
    }

    // Getters
    public String getName() { return name; }
    public boolean getIsHazardous() { return isHazardous; }
    public String getDangerDetails() { return dangerDetails; }
    public List<String> getComponents() { return components; }
    public String getRecyclingSteps() { return recyclingSteps; }
}