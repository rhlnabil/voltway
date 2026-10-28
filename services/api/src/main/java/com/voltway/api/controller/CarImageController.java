package com.voltway.api.controller;

import com.voltway.api.service.CarImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/car-images")
@RequiredArgsConstructor
public class CarImageController {

    private final CarImageService carImageService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> findImage(
            @RequestParam String make,
            @RequestParam String model,
            @RequestParam(required = false) Integer year) {

        String imageUrl = carImageService.findImageUrl(make, model, year);

        if (imageUrl == null) {
            return ResponseEntity.ok(Map.of(
                    "found", false,
                    "imageUrl", ""
            ));
        }

        return ResponseEntity.ok(Map.of(
                "found", true,
                "imageUrl", imageUrl
        ));
    }
}