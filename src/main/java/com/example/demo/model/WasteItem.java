package com.example.demo.model;

import java.util.List;

public class WasteItem {

    private String name;
    private boolean isHazardous;
    private String dangerDetails;      // Specific danger info
    private List<String> components;   // List of parts
    private String recyclingSteps;     // Step-by-step guide

    public WasteItem(String name, boolean isHazardous, String dangerDetails, List<String> components, String recyclingSteps) {
        this.name = name;
        this.isHazardous = isHazardous;
        this.dangerDetails = dangerDetails;
        this.components = components;
        this.recyclingSteps = recyclingSteps;
    }

    // 👇 ADDING GETTERS REMOVES THE YELLOW LINES 👇

    public String getName() {
        return name;
    }

    public boolean getIsHazardous() {
        return isHazardous;
    }

    public String getDangerDetails() {
        return dangerDetails;
    }

    public List<String> getComponents() {
        return components;
    }

    public String getRecyclingSteps() {
        return recyclingSteps;
    }
}