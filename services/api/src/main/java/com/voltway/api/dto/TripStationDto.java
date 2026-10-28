package com.voltway.api.dto;

import lombok.*;
import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TripStationDto {
    private Long ocmStationId;
    private String stationName;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private BigDecimal powerKw;
    private BigDecimal distanceFromStartKm;
    private Integer orderIndex;
}