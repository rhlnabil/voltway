package com.voltway.api.service;

import com.voltway.api.dto.CreateVehicleRequest;
import com.voltway.api.dto.VehicleDto;
import com.voltway.api.entity.User;
import com.voltway.api.entity.Vehicle;
import com.voltway.api.repository.UserRepository;
import com.voltway.api.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;

    public List<VehicleDto> findByUser(Long userId) {
        return vehicleRepository.findByUserId(userId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public VehicleDto create(Long userId, CreateVehicleRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        Vehicle v = Vehicle.builder()
                .user(user)
                .modelName(req.getModelName())
                .brand(req.getBrand())
                .model(req.getModel())
                .year(req.getYear())
                .imageUrl(req.getImageUrl())
                .autonomyKm(req.getAutonomyKm())
                .batteryKwh(req.getBatteryKwh())
                .consumptionKwh100(req.getConsumptionKwh100() != null
                        ? req.getConsumptionKwh100() : new BigDecimal("17.0"))
                .pricePerKwh(req.getPricePerKwh() != null
                        ? req.getPricePerKwh() : new BigDecimal("3.0"))
                .isDefault(req.getIsDefault() != null && req.getIsDefault())
                .build();

        return toDto(vehicleRepository.save(v));
    }

    @Transactional
    public void delete(Long userId, Long vehicleId) {
        Vehicle v = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Vehicle not found: " + vehicleId));

        if (!v.getUser().getId().equals(userId)) {
            throw new RuntimeException("Access denied: this vehicle does not belong to you");
        }
        vehicleRepository.delete(v);
    }

    private VehicleDto toDto(Vehicle v) {
        return VehicleDto.builder()
                .id(v.getId())
                .userId(v.getUser().getId())
                .modelName(v.getModelName())
                .brand(v.getBrand())
                .model(v.getModel())
                .year(v.getYear())
                .imageUrl(v.getImageUrl())
                .autonomyKm(v.getAutonomyKm())
                .batteryKwh(v.getBatteryKwh())
                .consumptionKwh100(v.getConsumptionKwh100())
                .pricePerKwh(v.getPricePerKwh())
                .isDefault(v.getIsDefault())
                .build();
    }
}