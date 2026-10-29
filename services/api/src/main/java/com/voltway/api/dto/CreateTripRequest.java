package com.voltway.api.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateTripRequest {

    private Long vehicleId;

    @NotBlank
    private String startLabel;
    @NotNull
    private BigDecimal startLat;
    @NotNull
    private BigDecimal startLon;

    @NotBlank
    private String endLabel;
    @NotNull
    private BigDecimal endLat;
    @NotNull
    private BigDecimal endLon;

    @NotNull
    private BigDecimal distanceKm;
    @NotNull
    private Integer durationS;

    private Integer stopsNeeded;

    private List<TripStationDto> stations;
}