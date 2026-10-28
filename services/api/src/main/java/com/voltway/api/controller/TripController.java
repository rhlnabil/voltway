package com.voltway.api.controller;

import com.voltway.api.dto.CreateTripRequest;
import com.voltway.api.dto.TripDto;
import com.voltway.api.service.TripService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trips")
@RequiredArgsConstructor
public class TripController {

    private final TripService service;

    @GetMapping
    public List<TripDto> listByUser(@RequestParam Long userId) {
        return service.findByUser(userId);
    }

    @GetMapping("/{id}")
    public TripDto getById(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<TripDto> create(@Valid @RequestBody CreateTripRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}