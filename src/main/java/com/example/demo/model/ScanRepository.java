package com.example.demo.model;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ScanRepository extends JpaRepository<ScanRecord, Long> {
    // Spring Boot writes the SQL queries for you automatically!
}