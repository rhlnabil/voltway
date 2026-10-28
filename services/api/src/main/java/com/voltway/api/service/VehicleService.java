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
    public VehicleDto create(CreateVehicleRequest req) {
        User user = userRepository.findById(req.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found: " + req.getUserId()));

        Vehicle v = Vehicle.builder()
                .user(user)
                .modelName(req.getModelName())
                .autonomyKm(req.getAutonomyKm())
                .batteryKwh(req.getBatteryKwh())
                .consumptionKwh100(req.getConsumptionKwh100() != null
                        ? req.getConsumptionKwh100() : new BigDecimal("17.0"))
                .pricePerKwh(req.getPricePerKwh() != null
                        ? req.getPricePerKwh() : new BigDecimal("0.250"))
                .isDefault(req.getIsDefault() != null && req.getIsDefault())
                .build();

        return toDto(vehicleRepository.save(v));
    }

    @Transactional
    public void delete(Long id) {
        if (!vehicleRepository.existsById(id)) {
            throw new RuntimeException("Vehicle not found: " + id);
        }
        vehicleRepository.deleteById(id);
    }

    private VehicleDto toDto(Vehicle v) {
        return VehicleDto.builder()
                .id(v.getId())
                .userId(v.getUser().getId())
                .modelName(v.getModelName())
                .autonomyKm(v.getAutonomyKm())
                .batteryKwh(v.getBatteryKwh())
                .consumptionKwh100(v.getConsumptionKwh100())
                .pricePerKwh(v.getPricePerKwh())
                .isDefault(v.getIsDefault())
                .build();
    }
}