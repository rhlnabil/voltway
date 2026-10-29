package com.voltway.api.controller;

import com.voltway.api.dto.CreateTripRequest;
import com.voltway.api.dto.TripDto;
import com.voltway.api.entity.User;
import com.voltway.api.service.TripService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trips")
@RequiredArgsConstructor
public class TripController {

    private final TripService service;

    @GetMapping
    public List<TripDto> listByUser(@AuthenticationPrincipal User user) {
        return service.findByUser(user.getId());
    }

    @GetMapping("/{id}")
    public TripDto getById(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        return service.findById(user.getId(), id);
    }

    @PostMapping
    public ResponseEntity<TripDto> create(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateTripRequest req) {
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