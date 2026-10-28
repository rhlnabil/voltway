package com.voltway.api.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Map;

@Service
public class CarImageService {

    @Value("${carsxe.api.key:}")
    private String carsxeKey;

    @Value("${carsxe.api.url:https://api.carsxe.com/images}")
    private String carsxeUrl;

    @Value("${carvector.api.key:}")
    private String carvectorKey;

    @Value("${carvector.api.url:https://api.carvector.io/v1/vehicles/search}")
    private String carvectorUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public String findImageUrl(String make, String model, Integer year) {
        if (make == null || make.isBlank() || model == null || model.isBlank()) {
            return null;
        }

        // Si aucune clé n'est configurée, on renvoie null proprement
        boolean noKeys = (carsxeKey == null || carsxeKey.isBlank())
                      && (carvectorKey == null || carvectorKey.isBlank());
        if (noKeys) {
            System.out.println("[CarImage] Aucune clé API configurée — fallback placeholder");
            return null;
        }

        // 1) CarsXE si la clé est présente
        if (carsxeKey != null && !carsxeKey.isBlank()) {
            String carsxeResult = tryCarsXE(make, model, year);
            if (carsxeResult != null) return carsxeResult;
        }

        // 2) CarVector si la clé est présente
        if (carvectorKey != null && !carvectorKey.isBlank()) {
            return tryCarVector(make, model, year);
        }

        return null;
    }

    @SuppressWarnings("unchecked")
    private String tryCarsXE(String make, String model, Integer year) {
        try {
            String url = UriComponentsBuilder.fromUriString(carsxeUrl)
                    .queryParam("key", carsxeKey)
                    .queryParam("make", make)
                    .queryParam("model", model)
                    .queryParam("year", year != null ? year.toString() : "")
                    .queryParam("format", "json")
                    .queryParam("validate", "true")
                    .toUriString();

            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response == null) return null;

            Boolean success = (Boolean) response.get("success");
            if (!Boolean.TRUE.equals(success)) {
                System.err.println("[CarImage] CarsXE success=false: " + response.get("error"));
                return null;
            }

            List<Map<String, Object>> images = (List<Map<String, Object>>) response.get("images");
            if (images == null || images.isEmpty()) return null;

            for (Map<String, Object> img : images) {
                String link = (String) img.get("link");
                if (link != null && !link.isBlank()) {
                    System.out.println("[CarImage] CarsXE ✓ " + link);
                    return link;
                }
            }
        } catch (Exception e) {
            System.err.println("[CarImage] CarsXE error: " + e.getMessage());
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private String tryCarVector(String make, String model, Integer year) {
        try {
            String url = UriComponentsBuilder.fromUriString(carvectorUrl)
                    .queryParam("make", make)
                    .queryParam("model", model)
                    .queryParam("year", year != null ? year.toString() : "")
                    .toUriString();

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(carvectorKey);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            var resp = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);

            Map<String, Object> body = resp.getBody();
            if (body == null) return null;

            Object dataObj = body.get("data");
            if (dataObj instanceof List<?> list && !list.isEmpty()) {
                Map<String, Object> first = (Map<String, Object>) list.get(0);
                String imageUrl = (String) first.get("image_url");
                if (imageUrl != null && !imageUrl.isBlank()) {
                    System.out.println("[CarImage] CarVector ✓ " + imageUrl);
                    return imageUrl;
                }
            }
        } catch (Exception e) {
            System.err.println("[CarImage] CarVector error: " + e.getMessage());
        }
        return null;
    }
}