package com.voltway.api.controller;

import com.voltway.api.dto.CreateFavoriteRequest;
import com.voltway.api.dto.FavoriteStationDto;
import com.voltway.api.entity.User;
import com.voltway.api.service.FavoriteStationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
public class FavoriteStationController {

    private final FavoriteStationService service;

    @GetMapping
    public List<FavoriteStationDto> listByUser(@AuthenticationPrincipal User user) {
        return service.findByUser(user.getId());
    }

    @PostMapping
    public ResponseEntity<FavoriteStationDto> add(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateFavoriteRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.add(user.getId(), req));
    }

    @DeleteMapping
    public ResponseEntity<Void> remove(
            @AuthenticationPrincipal User user,
            @RequestParam Long ocmStationId) {
        service.remove(user.getId(), ocmStationId);
        return ResponseEntity.noContent().build();
    }
}