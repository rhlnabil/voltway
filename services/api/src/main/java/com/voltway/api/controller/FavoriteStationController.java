package com.voltway.api.controller;

import com.voltway.api.dto.CreateFavoriteRequest;
import com.voltway.api.dto.FavoriteStationDto;
import com.voltway.api.service.FavoriteStationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
public class FavoriteStationController {

    private final FavoriteStationService service;

    @GetMapping
    public List<FavoriteStationDto> listByUser(@RequestParam Long userId) {
        return service.findByUser(userId);
    }

    @PostMapping
    public ResponseEntity<FavoriteStationDto> add(@Valid @RequestBody CreateFavoriteRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.add(req));
    }

    @DeleteMapping
    public ResponseEntity<Void> remove(
            @RequestParam Long userId,
            @RequestParam Long ocmStationId) {
        service.remove(userId, ocmStationId);
        return ResponseEntity.noContent().build();
    }
}