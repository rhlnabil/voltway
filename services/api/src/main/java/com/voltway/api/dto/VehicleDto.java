package com.voltway.api.dto;

import lombok.*;
import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VehicleDto {
    private Long id;
    private Long userId;
    private String modelName;
    private String brand;
    private String model;
    private Integer year;
    private String imageUrl;
    private Integer autonomyKm;
    private BigDecimal batteryKwh;
    private BigDecimal consumptionKwh100;
    private BigDecimal pricePerKwh;
    private Boolean isDefault;
}