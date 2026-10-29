package com.voltway.api.service;

import com.voltway.api.dto.CreateTripRequest;
import com.voltway.api.dto.TripDto;
import com.voltway.api.dto.TripStationDto;
import com.voltway.api.entity.*;
import com.voltway.api.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TripService {

    private final TripRepository tripRepository;
    private final TripStationRepository tripStationRepository;
    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;

    public List<TripDto> findByUser(Long userId) {
        return tripRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(t -> toDto(t, false))
                .toList();
    }

    public TripDto findById(Long userId, Long tripId) {
        Trip t = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found: " + tripId));

        if (!t.getUser().getId().equals(userId)) {
            throw new RuntimeException("Access denied: this trip does not belong to you");
        }
        return toDto(t, true);
    }

    @Transactional
    public TripDto create(Long userId, CreateTripRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        Vehicle vehicle = null;
        if (req.getVehicleId() != null) {
            vehicle = vehicleRepository.findById(req.getVehicleId()).orElse(null);
        }

        Trip trip = Trip.builder()
                .user(user)
                .vehicle(vehicle)
                .startLabel(req.getStartLabel())
                .startLat(req.getStartLat())
                .startLon(req.getStartLon())
                .endLabel(req.getEndLabel())
                .endLat(req.getEndLat())
                .endLon(req.getEndLon())
                .distanceKm(req.getDistanceKm())
                .durationS(req.getDurationS())
                .stopsNeeded(req.getStopsNeeded() != null ? req.getStopsNeeded() : 0)
                .build();

        trip = tripRepository.save(trip);

        if (req.getStations() != null && !req.getStations().isEmpty()) {
            Trip finalTrip = trip;
            List<TripStation> stationEntities = req.getStations().stream()
                    .map(dto -> TripStation.builder()
                            .trip(finalTrip)
                            .ocmStationId(dto.getOcmStationId())
                            .stationName(dto.getStationName())
                            .latitude(dto.getLatitude())
                            .longitude(dto.getLongitude())
                            .powerKw(dto.getPowerKw())
                            .distanceFromStartKm(dto.getDistanceFromStartKm())
                            .orderIndex(dto.getOrderIndex())
                            .build())
                    .toList();
            tripStationRepository.saveAll(stationEntities);
        }

        return toDto(trip, true);
    }

    @Transactional
    public void delete(Long userId, Long tripId) {
        Trip t = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found: " + tripId));

        if (!t.getUser().getId().equals(userId)) {
            throw new RuntimeException("Access denied: this trip does not belong to you");
        }
        tripRepository.delete(t);
    }

    private TripDto toDto(Trip t, boolean includeStations) {
        TripDto.TripDtoBuilder b = TripDto.builder()
                .id(t.getId())
                .startLabel(t.getStartLabel())
                .endLabel(t.getEndLabel())
                .startLat(t.getStartLat())
                .startLon(t.getStartLon())
                .endLat(t.getEndLat())
                .endLon(t.getEndLon())
                .distanceKm(t.getDistanceKm())
                .durationS(t.getDurationS())
                .stopsNeeded(t.getStopsNeeded())
                .createdAt(t.getCreatedAt());

        if (includeStations) {
            b.stations(tripStationRepository
                    .findByTripIdOrderByOrderIndexAsc(t.getId()).stream()
                    .map(s -> TripStationDto.builder()
                            .ocmStationId(s.getOcmStationId())
                            .stationName(s.getStationName())
                            .latitude(s.getLatitude())
                            .longitude(s.getLongitude())
                            .powerKw(s.getPowerKw())
                            .distanceFromStartKm(s.getDistanceFromStartKm())
                            .orderIndex(s.getOrderIndex())
                            .build())
                    .toList());
        }
        return b.build();
    }
}