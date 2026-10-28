package com.voltway.api.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TripDto {
    private Long id;
    private String startLabel;
    private String endLabel;
    private BigDecimal startLat;
    private BigDecimal startLon;
    private BigDecimal endLat;
    private BigDecimal endLon;
    private BigDecimal distanceKm;
    private Integer durationS;
    private Integer stopsNeeded;
    private LocalDateTime createdAt;
    private List<TripStationDto> stations;
}