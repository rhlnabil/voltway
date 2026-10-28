package com.voltway.api.controller;

import com.voltway.api.dto.CreateVehicleRequest;
import com.voltway.api.dto.VehicleDto;
import com.voltway.api.service.VehicleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
public class VehicleController {

    private final VehicleService service;

    @GetMapping
    public List<VehicleDto> listByUser(@RequestParam Long userId) {
        return service.findByUser(userId);
    }

    @PostMapping
    public ResponseEntity<VehicleDto> create(@Valid @RequestBody CreateVehicleRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}