package com.voltway.api.dto;

import lombok.*;
import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FavoriteStationDto {
    private Long id;
    private Long ocmStationId;
    private String stationName;
    private BigDecimal latitude;
    private BigDecimal longitude;
}