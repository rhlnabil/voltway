package com.voltway.api.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateVehicleRequest {

    @NotBlank(message = "modelName is required")
    private String modelName;

    private String brand;
    private String model;
    private Integer year;
    private String imageUrl;

    @NotNull @Min(1)
    private Integer autonomyKm;

    @NotNull @DecimalMin("0.1")
    private BigDecimal batteryKwh;

    private BigDecimal consumptionKwh100;
    private BigDecimal pricePerKwh;
    private Boolean isDefault;
}