package com.voltway.api.controller;

import com.voltway.api.dto.CreateVehicleRequest;
import com.voltway.api.dto.VehicleDto;
import com.voltway.api.entity.User;
import com.voltway.api.service.VehicleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
public class VehicleController {

    private final VehicleService service;

    @GetMapping
    public List<VehicleDto> listByUser(@AuthenticationPrincipal User user) {
        return service.findByUser(user.getId());
    }

    @PostMapping
    public ResponseEntity<VehicleDto> create(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateVehicleRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(user.getId(), req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        service.delete(user.getId(), id);
        return ResponseEntity.noContent().build();
    }
}